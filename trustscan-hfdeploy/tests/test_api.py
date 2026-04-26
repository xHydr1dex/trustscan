import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import pandas as pd
from backend.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_stats_returns_expected_keys():
    mock_con = MagicMock()
    mock_con.__enter__ = lambda s: s
    mock_con.__exit__ = MagicMock(return_value=False)
    mock_con.execute.return_value.fetchone.side_effect = [(1000,), (150,), (20,), (100,)]
    with patch("backend.main.duckdb.connect", return_value=mock_con):
        response = client.get("/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_reviews" in data
    assert "flagged_reviews" in data
    assert "ring_members_detected" in data


def test_product_not_found():
    mock_con = MagicMock()
    mock_con.execute.return_value.df.return_value = pd.DataFrame()
    with patch("backend.routes.product.duckdb.connect", return_value=mock_con):
        response = client.get("/product/NONEXISTENT_ASIN_XYZ")
    assert response.status_code == 404


def test_product_summary_returns_fields():
    mock_con = MagicMock()
    mock_con.execute.return_value.fetchone.return_value = (50, 4.2, 10, 0.75)
    with patch("backend.routes.product.duckdb.connect", return_value=mock_con):
        response = client.get("/product/B07GNNGXNK/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["asin"] == "B07GNNGXNK"
    assert "total_reviews" in data
    assert "avg_trust_score" in data
