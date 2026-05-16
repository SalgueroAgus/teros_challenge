"""Generate embeddings and store chunks in Supabase."""

import os

from openai import OpenAI
from supabase import Client

from app.pipeline.chunker import Chunk

EMBEDDING_MODEL = "text-embedding-3-small"
EMBED_BATCH_SIZE = 100  # OpenAI allows up to 2048 inputs per request


def embed_and_store(
    chunks: list[Chunk],
    document_id: str,
    supabase: Client,
    openai: OpenAI,
) -> None:
    for batch_start in range(0, len(chunks), EMBED_BATCH_SIZE):
        batch = chunks[batch_start : batch_start + EMBED_BATCH_SIZE]
        texts = [c.content for c in batch]

        response = openai.embeddings.create(model=EMBEDDING_MODEL, input=texts)
        vectors = [item.embedding for item in response.data]

        rows = [
            {
                "document_id": document_id,
                "chunk_index": chunk.index,
                "content": chunk.content,
                "embedding": vector,
            }
            for chunk, vector in zip(batch, vectors)
        ]
        supabase.table("document_chunks").insert(rows).execute()
