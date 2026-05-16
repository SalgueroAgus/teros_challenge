"""Orchestrate the full ingest pipeline: parse → chunk → embed → store."""

import os

from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client

from app.pipeline.parser import parse
from app.pipeline.chunker import chunk
from app.pipeline.embedder import embed_and_store

load_dotenv()


def get_clients() -> tuple[Client, OpenAI]:
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SECRET_KEY"],
    )
    openai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return supabase, openai


def ingest(filename: str, content: bytes, document_id: str) -> None:
    supabase, openai = get_clients()

    text = parse(filename, content)
    chunks = chunk(text)
    embed_and_store(chunks, document_id, supabase, openai)

    supabase.table("documents").update({"status": "done"}).eq(
        "id", document_id
    ).execute()
