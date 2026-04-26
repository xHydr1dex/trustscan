import pandas as pd
import pytest
from pipeline.graph import build_reviewer_graph, detect_rings


@pytest.fixture
def ring_df():
    return pd.DataFrame([
        {"user_id": "u1", "asin": "P1"},
        {"user_id": "u2", "asin": "P1"},
        {"user_id": "u3", "asin": "P1"},
        {"user_id": "u1", "asin": "P2"},
        {"user_id": "u2", "asin": "P2"},
        {"user_id": "u3", "asin": "P2"},
        {"user_id": "u1", "asin": "P3"},
        {"user_id": "u2", "asin": "P3"},
        {"user_id": "u3", "asin": "P3"},
        {"user_id": "u9", "asin": "P9"},
    ])


def test_ring_detected(ring_df):
    G = build_reviewer_graph(ring_df)
    rings = detect_rings(G, min_shared_products=2)
    ring_members = {u for ring in rings for u in ring}
    assert "u1" in ring_members
    assert "u2" in ring_members
    assert "u3" in ring_members


def test_isolated_user_not_in_ring(ring_df):
    G = build_reviewer_graph(ring_df)
    rings = detect_rings(G, min_shared_products=2)
    ring_members = {u for ring in rings for u in ring}
    assert "u9" not in ring_members


def test_graph_has_correct_nodes(ring_df):
    G = build_reviewer_graph(ring_df)
    assert "u1" in G.nodes
    assert "P1" in G.nodes


def test_no_rings_when_no_overlap():
    df = pd.DataFrame([
        {"user_id": "u1", "asin": "P1"},
        {"user_id": "u2", "asin": "P2"},
        {"user_id": "u3", "asin": "P3"},
    ])
    G = build_reviewer_graph(df)
    rings = detect_rings(G, min_shared_products=2)
    assert rings == []
