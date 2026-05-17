import logging
import os
import uuid

from fastapi import Depends, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from openai import OpenAI
from pydantic import BaseModel, Field

from app.dependencies import get_openai, get_supabase, verify_api_key
from app.pipeline.ingest import ingest
from supabase import Client

logger = logging.getLogger(__name__)

app = FastAPI(title="FinSight API", version="0.1.0")

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

_raw_origins = os.environ.get("ALLOWED_ORIGINS", "*")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
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
    question: str = Field(..., min_length=1, max_length=500)
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


@app.post("/upload", status_code=202, dependencies=[Depends(verify_api_key)])
async def upload(
    file: UploadFile,
    supabase: Client = Depends(get_supabase),
):
    content = await file.read()

    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 10 MB limit.")

    existing = supabase.table("documents").select("id").eq("filename", file.filename).execute()
    if existing.data:
        raise HTTPException(
            status_code=409,
            detail=f"A document named '{file.filename}' already exists.",
        )

    document_id = str(uuid.uuid4())

    supabase.table("documents").insert(
        {"id": document_id, "filename": file.filename, "status": "processing"}
    ).execute()

    try:
        ingest(file.filename, content, document_id)
    except ValueError as exc:
        supabase.table("documents").update({"status": "error"}).eq("id", document_id).execute()
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        logger.exception("Ingest failed for document %s", document_id)
        supabase.table("documents").update({"status": "error"}).eq("id", document_id).execute()
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while processing the file.",
        )

    return {"document_id": document_id, "filename": file.filename, "status": "done"}


@app.delete("/documents/{document_id}", status_code=200, dependencies=[Depends(verify_api_key)])
def delete_document(document_id: str, supabase: Client = Depends(get_supabase)):
    result = supabase.table("documents").select("id").eq("id", document_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found.")
    supabase.table("document_chunks").delete().eq("document_id", document_id).execute()
    supabase.table("documents").delete().eq("id", document_id).execute()
    return {"deleted": document_id}


@app.get("/documents", dependencies=[Depends(verify_api_key)])
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


@app.post("/query", response_model=QueryResponse, dependencies=[Depends(verify_api_key)])
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
