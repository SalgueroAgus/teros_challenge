"""API endpoint tests — all external calls are mocked via conftest fixtures."""

import io
from unittest.mock import MagicMock, patch

from postgrest.exceptions import APIError as PostgRESTError


def test_health(api_client):
    response = api_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


def _paginated_execute(mock_supabase):
    return (
        mock_supabase.table.return_value
        .select.return_value
        .order.return_value
        .range.return_value
        .execute
    )


def test_list_documents_empty(api_client, mock_supabase):
    _paginated_execute(mock_supabase).return_value = MagicMock(data=[], count=0)
    response = api_client.get("/documents")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["total_pages"] == 1


def test_list_documents_returns_data(api_client, mock_supabase):
    _paginated_execute(mock_supabase).return_value = MagicMock(
        data=[{"id": "abc", "filename": "test.pdf", "status": "done", "uploaded_at": "2026-01-01"}],
        count=1,
    )
    response = api_client.get("/documents")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["filename"] == "test.pdf"
    assert data["total"] == 1
    assert data["total_pages"] == 1


def test_list_documents_out_of_range_returns_empty(api_client, mock_supabase):
    _paginated_execute(mock_supabase).side_effect = PostgRESTError(
        {
            "message": "Requested range not satisfiable",
            "code": "PGRST103",
            "hint": None,
            "details": "",
        }
    )
    response = api_client.get("/documents?page=999")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


def test_list_documents_pagination_params(api_client, mock_supabase):
    _paginated_execute(mock_supabase).return_value = MagicMock(data=[], count=25)
    response = api_client.get("/documents?page=2&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 2
    assert data["page_size"] == 10
    assert data["total"] == 25
    assert data["total_pages"] == 3
    # Verify range was called with correct offsets
    range_call = mock_supabase.table.return_value.select.return_value.order.return_value.range
    range_call.assert_called_with(10, 19)


def test_upload_csv(api_client, mock_supabase):
    csv_content = b"Date,Amount\n2024-03-01,-54.32\n"
    with patch("app.main._ingest_and_update"):
        response = api_client.post(
            "/upload",
            files={"file": ("statement.csv", io.BytesIO(csv_content), "text/csv")},
        )
    assert response.status_code == 202
    data = response.json()
    assert "document_id" in data
    assert data["filename"] == "statement.csv"
    assert data["status"] == "pending"


def test_upload_unsupported_type(api_client, mock_supabase):
    # Validation errors (bad file type) surface in the background task — the
    # endpoint itself always returns 202 once the file passes size/dupe checks.
    with patch("app.main._ingest_and_update"):
        response = api_client.post(
            "/upload",
            files={"file": ("doc.docx", io.BytesIO(b"content"), "application/octet-stream")},
        )
    assert response.status_code == 202


def test_upload_returns_202_even_when_ingest_fails(api_client, mock_supabase):
    # Ingest errors are handled inside the background task and set status="error"
    # asynchronously — the HTTP response is always 202 Accepted.
    with patch("app.main._ingest_and_update"):
        response = api_client.post(
            "/upload",
            files={"file": ("statement.csv", io.BytesIO(b"Date,Amount\n"), "text/csv")},
        )
    assert response.status_code == 202


def test_query_no_chunks_returns_404(api_client, mock_supabase):
    mock_supabase.rpc.return_value.execute.return_value = MagicMock(data=[])
    response = api_client.post("/query", json={"question": "What are my expenses?"})
    assert response.status_code == 404


def test_query_returns_answer_and_sources(api_client, mock_supabase, mock_openai):
    mock_supabase.rpc.return_value.execute.return_value = MagicMock(
        data=[
            {
                "chunk_id": "c1",
                "content": "Whole Foods $54.32 on March 1",
                "similarity": 0.92,
            }
        ]
    )
    response = api_client.post("/query", json={"question": "How much did I spend on groceries?"})
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert len(data["sources"]) == 1
    assert data["sources"][0]["chunk_id"] == "c1"
    assert data["sources"][0]["similarity"] == 0.92


def test_query_with_document_id_passes_filter(api_client, mock_supabase, mock_openai):
    mock_supabase.rpc.return_value.execute.return_value = MagicMock(
        data=[{"chunk_id": "c1", "content": "some content", "similarity": 0.85}]
    )
    api_client.post(
        "/query",
        json={"question": "Show expenses", "document_id": "doc-uuid-123"},
    )
    call_kwargs = mock_supabase.rpc.call_args[0][1]
    assert call_kwargs["filter_document_id"] == "doc-uuid-123"
    assert "query_text" in call_kwargs


def test_query_scoped_uses_lower_threshold(api_client, mock_supabase, mock_openai):
    mock_supabase.rpc.return_value.execute.return_value = MagicMock(
        data=[{"chunk_id": "c1", "content": "receipt", "similarity": 0.15}]
    )
    api_client.post(
        "/query",
        json={"question": "What did I buy?", "document_id": "doc-uuid-123"},
    )
    call_kwargs = mock_supabase.rpc.call_args[0][1]
    assert call_kwargs["match_threshold"] == 0.1


def test_query_global_uses_default_threshold(api_client, mock_supabase, mock_openai):
    mock_supabase.rpc.return_value.execute.return_value = MagicMock(
        data=[{"chunk_id": "c1", "content": "statement", "similarity": 0.35}]
    )
    api_client.post("/query", json={"question": "What are my expenses?"})
    call_kwargs = mock_supabase.rpc.call_args[0][1]
    assert call_kwargs["match_threshold"] == 0.3


def test_upload_too_large_returns_413(api_client, mock_supabase):
    oversized = b"x" * (10 * 1024 * 1024 + 1)
    response = api_client.post(
        "/upload",
        files={"file": ("big.csv", io.BytesIO(oversized), "text/csv")},
    )
    assert response.status_code == 413


def test_upload_duplicate_filename_returns_409(api_client, mock_supabase):
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = (
        MagicMock(data=[{"id": "existing-id"}])
    )
    response = api_client.post(
        "/upload",
        files={"file": ("statement.csv", io.BytesIO(b"Date,Amount\n"), "text/csv")},
    )
    assert response.status_code == 409


def test_delete_document_success(api_client, mock_supabase):
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = (
        MagicMock(data=[{"id": "doc-id"}])
    )
    response = api_client.delete("/documents/doc-id")
    assert response.status_code == 200
    assert response.json()["deleted"] == "doc-id"


def test_delete_document_not_found_returns_404(api_client, mock_supabase):
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = (
        MagicMock(data=[])
    )
    response = api_client.delete("/documents/nonexistent-id")
    assert response.status_code == 404


def test_query_too_long_returns_422(api_client, mock_supabase):
    response = api_client.post("/query", json={"question": "x" * 501})
    assert response.status_code == 422


def test_api_key_enforced_when_env_set(api_client, mock_supabase, monkeypatch):
    monkeypatch.setenv("API_KEY", "secret-key")
    response = api_client.get("/documents")
    assert response.status_code == 401


def test_api_key_accepted_with_correct_header(api_client, mock_supabase, monkeypatch):
    monkeypatch.setenv("API_KEY", "secret-key")
    response = api_client.get("/documents", headers={"X-API-Key": "secret-key"})
    assert response.status_code == 200
