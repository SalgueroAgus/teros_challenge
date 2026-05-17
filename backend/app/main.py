import uuid

from fastapi import Depends, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from openai import OpenAI
from pydantic import BaseModel

from app.dependencies import get_openai, get_supabase
from app.pipeline.ingest import ingest
from supabase import Client

app = FastAPI(title="FinSight API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # locked down to Replit origin after deploy
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lambda entry point
handler = Mangum(app)

EMBEDDING_MODEL = "text-embedding-3-small"
CHAT_MODEL = "gpt-4o-mini"
MATCH_THRESHOLD = 0.3
MATCH_COUNT = 5
SYSTEM_PROMPT = (
    "You are FinSight, a personal finance assistant. "
    "Answer the user's question using only the financial document excerpts provided. "
    "Be concise and specific. If the excerpts don't contain enough information, say so."
)
EXPAND_PROMPT = (
    "You are a search query expander for a personal finance assistant. "
    "Rewrite the user's question as a short list of keywords and synonyms that would appear "
    "in financial documents (receipts, bank statements, invoices). "
    "Output only the expanded query — no explanation, no punctuation, no bullet points."
)


# ── Models ────────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str
    document_id: str | None = None


class Source(BaseModel):
    chunk_id: str
    content: str
    similarity: float


class QueryResponse(BaseModel):
    answer: str
    sources: list[Source]


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


@app.post("/upload", status_code=202)
async def upload(
    file: UploadFile,
    supabase: Client = Depends(get_supabase),
):
    content = await file.read()
    document_id = str(uuid.uuid4())

    supabase.table("documents").insert(
        {"id": document_id, "filename": file.filename, "status": "processing"}
    ).execute()

    try:
        ingest(file.filename, content, document_id)
    except ValueError as exc:
        supabase.table("documents").update({"status": "error"}).eq("id", document_id).execute()
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        supabase.table("documents").update({"status": "error"}).eq("id", document_id).execute()
        raise HTTPException(status_code=500, detail=str(exc))

    return {"document_id": document_id, "filename": file.filename, "status": "done"}


@app.get("/documents")
def list_documents(supabase: Client = Depends(get_supabase)):
    result = supabase.table("documents").select("*").order("uploaded_at", desc=True).execute()
    return result.data


def _expand_query(question: str, openai: OpenAI) -> str:
    response = openai.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": EXPAND_PROMPT},
            {"role": "user", "content": question},
        ],
        max_tokens=60,
        temperature=0,
    )
    return response.choices[0].message.content.strip()


@app.post("/query", response_model=QueryResponse)
def query(
    body: QueryRequest,
    supabase: Client = Depends(get_supabase),
    openai: OpenAI = Depends(get_openai),
):
    expanded = _expand_query(body.question, openai)

    q_embedding = (
        openai.embeddings.create(model=EMBEDDING_MODEL, input=expanded)
        .data[0]
        .embedding
    )

    # Relax threshold when scoped to a document — cross-doc noise isn't a risk
    threshold = 0.1 if body.document_id else MATCH_THRESHOLD

    matches = supabase.rpc(
        "match_chunks",
        {
            "query_embedding": q_embedding,
            "query_text": expanded,
            "match_threshold": threshold,
            "match_count": MATCH_COUNT,
            "filter_document_id": body.document_id,
        },
    ).execute()

    if not matches.data:
        raise HTTPException(
            status_code=404,
            detail="No relevant document chunks found. Upload a document first.",
        )

    context = "\n\n---\n\n".join(row["content"] for row in matches.data)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Document excerpts:\n\n{context}\n\nQuestion: {body.question}",
        },
    ]
    completion = openai.chat.completions.create(model=CHAT_MODEL, messages=messages)
    answer = completion.choices[0].message.content

    sources = [
        Source(chunk_id=row["chunk_id"], content=row["content"], similarity=row["similarity"])
        for row in matches.data
    ]

    return QueryResponse(answer=answer, sources=sources)
