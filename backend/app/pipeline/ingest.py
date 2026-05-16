"""Orchestrate the full ingest pipeline: parse → chunk → embed → store."""

from app.dependencies import get_openai, get_supabase
from app.pipeline.parser import parse
from app.pipeline.chunker import chunk
from app.pipeline.embedder import embed_and_store


def ingest(filename: str, content: bytes, document_id: str) -> None:
    supabase = get_supabase()
    openai = get_openai()

    text = parse(filename, content)
    chunks = chunk(text)
    embed_and_store(chunks, document_id, supabase, openai)

    supabase.table("documents").update({"status": "done"}).eq("id", document_id).execute()
