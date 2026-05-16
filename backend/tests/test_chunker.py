import tiktoken

from app.pipeline.chunker import CHUNK_OVERLAP, CHUNK_SIZE, CSV_ROWS_PER_CHUNK, chunk, chunk_csv


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


# ── chunk_csv ─────────────────────────────────────────────────────────────────

def _make_csv(rows: int) -> bytes:
    header = "Date,Amount,Description,Category\n"
    data = "\n".join(
        f"2024-01-{i+1:02d},-{i*10}.00,MERCHANT {i},Groceries"
        for i in range(rows)
    )
    return (header + data).encode()


def test_csv_empty_returns_no_chunks():
    assert chunk_csv(b"Date,Amount\n") == []


def test_csv_single_chunk_for_few_rows():
    result = chunk_csv(_make_csv(5))
    assert len(result) == 1


def test_csv_batches_into_multiple_chunks():
    result = chunk_csv(_make_csv(CSV_ROWS_PER_CHUNK + 1))
    assert len(result) == 2


def test_csv_indices_are_sequential():
    result = chunk_csv(_make_csv(CSV_ROWS_PER_CHUNK * 3))
    for i, c in enumerate(result):
        assert c.index == i


def test_csv_chunk_contains_column_names():
    result = chunk_csv(_make_csv(3))
    assert len(result) == 1
    # Every key from the header must appear in the serialized chunk
    for col in ("Date", "Amount", "Description", "Category"):
        assert col in result[0].content


def test_csv_no_row_split_across_chunks():
    rows = CSV_ROWS_PER_CHUNK + 5
    result = chunk_csv(_make_csv(rows))
    assert len(result) == 2
    # First chunk has exactly CSV_ROWS_PER_CHUNK rows
    assert result[0].content.count("Date:") == CSV_ROWS_PER_CHUNK
    # Second chunk has the remainder
    assert result[1].content.count("Date:") == 5
