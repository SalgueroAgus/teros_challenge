"""Shared fixtures — mock external clients so tests never hit real APIs."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def mock_supabase():
    client = MagicMock()
    # documents table chain: .table().insert().execute() / .select().order().execute()
    table = MagicMock()
    client.table.return_value = table
    table.insert.return_value = table
    table.update.return_value = table
    table.select.return_value = table
    table.order.return_value = table
    table.eq.return_value = table
    table.execute.return_value = MagicMock(data=[])
    # rpc for match_chunks
    client.rpc.return_value = MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
    return client


@pytest.fixture
def mock_openai():
    client = MagicMock()
    embedding = MagicMock()
    embedding.embedding = [0.1] * 1536
    client.embeddings.create.return_value = MagicMock(data=[embedding])
    choice = MagicMock()
    choice.message.content = "Mocked answer from GPT."
    client.chat.completions.create.return_value = MagicMock(choices=[choice])
    return client


@pytest.fixture
def api_client(mock_supabase, mock_openai):
    """FastAPI TestClient with Supabase and OpenAI dependencies overridden."""
    from app.dependencies import get_openai, get_supabase
    from app.main import app

    app.dependency_overrides[get_supabase] = lambda: mock_supabase
    app.dependency_overrides[get_openai] = lambda: mock_openai
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
