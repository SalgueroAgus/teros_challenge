"""Split text into ~500-token chunks with 50-token overlap."""

from dataclasses import dataclass

import tiktoken

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
ENCODING = "cl100k_base"  # matches text-embedding-3-small


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
