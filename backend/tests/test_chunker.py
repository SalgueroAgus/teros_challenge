import tiktoken

from app.pipeline.chunker import CHUNK_OVERLAP, CHUNK_SIZE, chunk


def _token_count(text: str) -> int:
    enc = tiktoken.get_encoding("cl100k_base")
    return len(enc.encode(text))


def test_empty_text_returns_no_chunks():
    assert chunk("") == []


def test_short_text_returns_single_chunk():
    result = chunk("Hello world")
    assert len(result) == 1
    assert result[0].index == 0
    assert "Hello" in result[0].content


def test_long_text_produces_multiple_chunks():
    # Build text that is clearly over 2 chunk sizes
    word = "finance " * 600  # ~600 tokens
    result = chunk(word)
    assert len(result) >= 2


def test_chunk_indices_are_sequential():
    word = "expense " * 600
    result = chunk(word)
    for i, c in enumerate(result):
        assert c.index == i


def test_each_chunk_is_within_size_limit():
    word = "transaction " * 800
    result = chunk(word)
    for c in result:
        assert _token_count(c.content) <= CHUNK_SIZE


def test_overlap_means_chunks_share_tokens():
    # With overlap, consecutive chunks should share some content
    word = "statement " * 600
    result = chunk(word)
    assert len(result) >= 2
    # The end of chunk 0 and start of chunk 1 should share tokens
    enc = tiktoken.get_encoding("cl100k_base")
    tokens_0 = enc.encode(result[0].content)
    tokens_1 = enc.encode(result[1].content)
    shared = set(tokens_0[-CHUNK_OVERLAP:]) & set(tokens_1[:CHUNK_OVERLAP])
    assert len(shared) > 0
