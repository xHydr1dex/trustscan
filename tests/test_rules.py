import pandas as pd
import pytest
from pipeline.rules import apply_rules


@pytest.fixture
def sample_df():
    return pd.DataFrame([
        {"review_id": "1", "user_id": "u1", "asin": "A1", "review_text": "great product", "rating": 5.0, "verified_purchase": True, "reviewed_at": "2023-01-01 10:00:00"},
        {"review_id": "2", "user_id": "u2", "asin": "A2", "review_text": "great product", "rating": 5.0, "verified_purchase": True, "reviewed_at": "2023-01-01 10:01:00"},
        {"review_id": "3", "user_id": "u3", "asin": "A3", "review_text": "wonderful item I love it", "rating": 5.0, "verified_purchase": False, "reviewed_at": "2023-01-02 10:00:00"},
        {"review_id": "4", "user_id": "u4", "asin": "A4", "review_text": "ok", "rating": 3.0, "verified_purchase": True, "reviewed_at": "2023-01-03 10:00:00"},
        {"review_id": "5", "user_id": "u5", "asin": "A5", "review_text": "great nice awesome excellent product", "rating": 5.0, "verified_purchase": True, "reviewed_at": "2023-01-04 10:00:00"},
        {"review_id": "6", "user_id": "u6", "asin": "A6", "review_text": "decent product for the price", "rating": 4.0, "verified_purchase": True, "reviewed_at": "2023-01-05 08:00:00"},
        {"review_id": "7", "user_id": "u6", "asin": "A7", "review_text": "another fine purchase here", "rating": 5.0, "verified_purchase": True, "reviewed_at": "2023-01-05 09:00:00"},
        {"review_id": "8", "user_id": "u6", "asin": "A8", "review_text": "third buy from this seller", "rating": 5.0, "verified_purchase": True, "reviewed_at": "2023-01-05 10:00:00"},
        {"review_id": "9", "user_id": "u9", "asin": "A9", "review_text": "The build quality is excellent but the battery life is disappointing after two months of use.", "rating": 3.0, "verified_purchase": True, "reviewed_at": "2023-01-06 10:00:00"},
    ])


def test_duplicate_text_flagged(sample_df):
    result = apply_rules(sample_df)
    assert result.loc[result["review_id"] == "1", "rule_flagged"].values[0] == True
    assert result.loc[result["review_id"] == "2", "rule_flagged"].values[0] == True


def test_unverified_5star_flagged(sample_df):
    result = apply_rules(sample_df)
    assert result.loc[result["review_id"] == "3", "rule_flagged"].values[0] == True


def test_short_review_flagged(sample_df):
    result = apply_rules(sample_df)
    assert result.loc[result["review_id"] == "4", "rule_flagged"].values[0] == True


def test_generic_keywords_flagged(sample_df):
    result = apply_rules(sample_df)
    assert result.loc[result["review_id"] == "5", "rule_flagged"].values[0] == True


def test_burst_posting_flagged(sample_df):
    result = apply_rules(sample_df)
    for rid in ["6", "7", "8"]:
        assert result.loc[result["review_id"] == rid, "rule_flagged"].values[0] == True


def test_clean_review_not_flagged(sample_df):
    result = apply_rules(sample_df)
    assert result.loc[result["review_id"] == "9", "rule_flagged"].values[0] == False


def test_rule_flags_column_exists(sample_df):
    result = apply_rules(sample_df)
    assert "rule_flagged" in result.columns
    assert "rule_reasons" in result.columns
