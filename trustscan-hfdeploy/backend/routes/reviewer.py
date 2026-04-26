from fastapi import APIRouter, HTTPException
import duckdb
from pathlib import Path
from pipeline.reviewer_profiler import profile_reviewer

router = APIRouter()
DB_PATH = str(Path(__file__).parent.parent.parent / "data" / "trustscan.duckdb")


@router.get("/{user_id}")
def get_reviewer_profile(user_id: str):
    con = duckdb.connect(DB_PATH, read_only=True)
    reviews = con.execute("""
        SELECT r.review_text, r.rating, r.verified_purchase, r.reviewed_at, r.asin,
               COALESCE(rr.trust_score, 1.0) as trust_score,
               COALESCE(rr.ring_flagged, false) as ring_flagged,
               COALESCE(rr.rule_flagged, false) as rule_flagged,
               COALESCE(rr.reviewer_risk, 'unknown') as reviewer_risk
        FROM reviews r
        LEFT JOIN review_results rr ON r.review_id = rr.review_id
        WHERE r.user_id = ?
        ORDER BY r.reviewed_at DESC LIMIT 30
    """, [user_id]).df()
    con.close()
    if reviews.empty:
        raise HTTPException(status_code=404, detail=f"Reviewer {user_id} not found")
    profile = profile_reviewer(user_id, reviews.to_dict("records"))
    profile["review_count"] = len(reviews)
    profile["reviews"] = reviews[["asin", "rating", "review_text", "verified_purchase", "trust_score"]].fillna("").to_dict("records")
    # Ring flagged always wins — precomputed signal is more reliable than LLM text analysis
    if reviews["ring_flagged"].any():
        profile["risk_level"] = "high"
    elif profile.get("risk_level", "unknown") == "unknown":
        profile["risk_level"] = reviews["reviewer_risk"].iloc[0]
    return profile
