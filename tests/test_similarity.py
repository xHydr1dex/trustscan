import pytest
from unittest.mock import patch, MagicMock
from pipeline.similarity import find_similar_reviews, SIMILARITY_THRESHOLD


def test_similar_reviews_returned():
    mock_result = {
        "ids": [["r2", "r3"]],
        "distances": [[0.05, 0.08]]
    }
    with patch("pipeline.similarity.get_chroma_collection") as mock_col:
        mock_col.return_value.query.return_value = mock_result
        with patch("pipeline.similarity.get_embed_model") as mock_model:
            mock_model.return_value.encode.return_value = [[0.1] * 1024]
            results = find_similar_reviews("great product love it", exclude_id="r1")
    assert "r2" in results
    assert "r3" in results


def test_no_similar_reviews_when_distant():
    mock_result = {
        "ids": [["r2"]],
        "distances": [[0.5]]
    }
    with patch("pipeline.similarity.get_chroma_collection") as mock_col:
        mock_col.return_value.query.return_value = mock_result
        with patch("pipeline.similarity.get_embed_model") as mock_model:
            mock_model.return_value.encode.return_value = [[0.1] * 1024]
            results = find_similar_reviews("The battery life is surprisingly good", exclude_id="r1")
    assert len(results) == 0


def test_threshold_value():
    assert SIMILARITY_THRESHOLD == 0.15
