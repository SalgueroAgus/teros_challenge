"""Orchestrate the full ingest pipeline: parse → chunk → embed → store.

CSVs bypass the generic text chunker and use chunk_csv() instead, which
preserves column headers in every chunk for accurate retrieval.
"""

from pathlib import Path

from openai import OpenAI

from app.pipeline.chunker import chunk, chunk_csv
from app.pipeline.embedder import embed_and_store
from app.pipeline.parser import parse
from supabase import Client


def ingest(
    filename: str,
    content: bytes,
    document_id: str,
    supabase: Client,
    openai: OpenAI,
) -> None:
    if Path(filename).suffix.lower() == ".csv":
        chunks = chunk_csv(content)
    else:
        text = parse(filename, content, openai)
        chunks = chunk(text)

    embed_and_store(chunks, document_id, supabase, openai)

    supabase.table("documents").update({"status": "done"}).eq("id", document_id).execute()
