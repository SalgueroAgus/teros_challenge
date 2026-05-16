"""Chunking strategies for different document types.

- chunk(): token-based sliding window for unstructured text (PDFs, images)
- chunk_csv(): row-aware batching for structured data (CSVs)
"""

import csv
import io
from dataclasses import dataclass

import tiktoken

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
ENCODING = "cl100k_base"  # matches text-embedding-3-small
CSV_ROWS_PER_CHUNK = 25


@dataclass
class Chunk:
    index: int
    content: str


def chunk(text: str) -> list[Chunk]:
    enc = tiktoken.get_encoding(ENCODING)
    tokens = enc.encode(text)
    chunks: list[Chunk] = []
    start = 0
    index = 0
    while start < len(tokens):
        end = start + CHUNK_SIZE
        window = tokens[start:end]
        chunks.append(Chunk(index=index, content=enc.decode(window)))
        index += 1
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def chunk_csv(content: bytes) -> list[Chunk]:
    """Row-aware chunker for CSVs.

    Each chunk contains up to CSV_ROWS_PER_CHUNK rows serialized as
    'Column: value' pairs so the embedding model always has column
    context — no row is ever split across chunk boundaries.
    """
    text = content.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    if not rows:
        return []

    chunks: list[Chunk] = []
    for batch_start in range(0, len(rows), CSV_ROWS_PER_CHUNK):
        batch = rows[batch_start : batch_start + CSV_ROWS_PER_CHUNK]
        lines = [
            ", ".join(f"{col}: {val}" for col, val in row.items() if val.strip())
            for row in batch
        ]
        chunks.append(Chunk(index=len(chunks), content="\n".join(lines)))

    return chunks
