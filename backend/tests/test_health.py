from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_liveness(client: TestClient):
    response = client.get("/api/v1/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@patch("app.api.v1.endpoints.health.check_supabase_health", new_callable=AsyncMock, return_value=True)
def test_readiness_healthy(mock_db, client: TestClient):
    response = client.get("/api/v1/readyz")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["services"]["supabase"]["status"] == "ok"
