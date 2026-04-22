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
        SELECT review_text, rating, verified_purchase, reviewed_at, asin
        FROM reviews WHERE user_id = ?
        ORDER BY reviewed_at DESC LIMIT 30
    """, [user_id]).df()
    con.close()
    if reviews.empty:
        raise HTTPException(status_code=404, detail=f"Reviewer {user_id} not found")
    profile = profile_reviewer(user_id, reviews.to_dict("records"))
    profile["review_count"] = len(reviews)
    return profile
