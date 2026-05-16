"""
Integration test: upload sample bank statement → chunk → embed → query.
Run from backend/: uv run python -m tests.test_pipeline
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env")

from app.pipeline.parser import parse
from app.pipeline.chunker import chunk
from app.pipeline.embedder import embed_and_store

SAMPLE = Path(__file__).parent / "sample_statement.csv"
TEST_QUESTION = "How much did I spend on groceries in March?"


def main() -> None:
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SECRET_KEY"],
    )
    openai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    # 1 — insert document record
    print("→ Inserting document record...")
    result = (
        supabase.table("documents")
        .insert({"filename": SAMPLE.name, "status": "processing"})
        .execute()
    )
    document_id = result.data[0]["id"]
    print(f"  document_id: {document_id}")

    # 2 — parse
    print("→ Parsing...")
    content = SAMPLE.read_bytes()
    text = parse(SAMPLE.name, content)
    print(f"  {len(text)} characters extracted")

    # 3 — chunk
    print("→ Chunking...")
    chunks = chunk(text)
    print(f"  {len(chunks)} chunks created")

    # 4 — embed + store
    print("→ Embedding and storing chunks...")
    embed_and_store(chunks, document_id, supabase, openai)
    supabase.table("documents").update({"status": "done"}).eq("id", document_id).execute()
    print("  Done — document marked as done")

    # 5 — similarity search
    print(f'\n→ Querying: "{TEST_QUESTION}"')
    q_embedding = (
        openai.embeddings.create(model="text-embedding-3-small", input=TEST_QUESTION)
        .data[0]
        .embedding
    )
    matches = supabase.rpc(
        "match_chunks",
        {
            "query_embedding": q_embedding,
            "match_threshold": 0.3,
            "match_count": 3,
            "filter_document_id": document_id,
        },
    ).execute()

    print(f"\n  Top {len(matches.data)} chunks returned:\n")
    for i, row in enumerate(matches.data, 1):
        print(f"  [{i}] similarity={row['similarity']:.4f}")
        print(f"      {row['content'][:200].strip()}")
        print()

    if matches.data:
        print("✓ Integration test passed — relevant chunks returned from Supabase.")
    else:
        print("✗ No chunks returned — check match_threshold or embeddings.")
        sys.exit(1)


if __name__ == "__main__":
    main()
