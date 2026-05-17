"""API endpoint tests — all external calls are mocked via conftest fixtures."""

import io
from unittest.mock import MagicMock, patch


def test_health(api_client):
    response = api_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_list_documents_empty(api_client, mock_supabase):
    docs_execute = mock_supabase.table.return_value.select.return_value.order.return_value.execute
    docs_execute.return_value = MagicMock(data=[])
    response = api_client.get("/documents")
    assert response.status_code == 200
    assert response.json() == []


def test_list_documents_returns_data(api_client, mock_supabase):
    docs_execute = mock_supabase.table.return_value.select.return_value.order.return_value.execute
    docs_execute.return_value = MagicMock(
        data=[{"id": "abc", "filename": "test.pdf", "status": "done", "uploaded_at": "2026-01-01"}]
    )
    response = api_client.get("/documents")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["filename"] == "test.pdf"


def test_upload_csv(api_client, mock_supabase):
    csv_content = b"Date,Amount\n2024-03-01,-54.32\n"
    with patch("app.main.ingest") as mock_ingest:
        mock_ingest.return_value = None
        response = api_client.post(
            "/upload",
            files={"file": ("statement.csv", io.BytesIO(csv_content), "text/csv")},
        )
    assert response.status_code == 202
    data = response.json()
    assert "document_id" in data
    assert data["filename"] == "statement.csv"
    assert data["status"] == "done"


def test_upload_unsupported_type(api_client, mock_supabase):
    with patch("app.main.ingest") as mock_ingest:
        mock_ingest.side_effect = ValueError("Unsupported file type: .docx")
        response = api_client.post(
            "/upload",
            files={"file": ("doc.docx", io.BytesIO(b"content"), "application/octet-stream")},
        )
    assert response.status_code == 400


def test_upload_server_error_returns_500(api_client, mock_supabase):
    with patch("app.main.ingest") as mock_ingest:
        mock_ingest.side_effect = RuntimeError("Unexpected database failure")
        response = api_client.post(
            "/upload",
            files={"file": ("statement.csv", io.BytesIO(b"Date,Amount\n"), "text/csv")},
        )
    assert response.status_code == 500


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
