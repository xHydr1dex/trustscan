from fastapi import APIRouter, HTTPException, Query
import duckdb
import pandas as pd
from pathlib import Path
from pipeline.rules import apply_rules
from pipeline.similarity import flag_similar_in_batch
from pipeline.llm_judge import judge_review
from pipeline.scorer import compute_trust_score

router = APIRouter()
DB_PATH = str(Path(__file__).parent.parent.parent / "data" / "trustscan.duckdb")


@router.get("/{asin}")
def get_product_reviews(asin: str, limit: int = 50, offset: int = 0, deep: bool = False):
    con = duckdb.connect(DB_PATH, read_only=True)
    rows = con.execute("""
        SELECT r.review_id, r.user_id, r.review_text, r.rating, r.verified_purchase, r.reviewed_at,
               COALESCE(rr.rule_flagged, false) as rule_flagged,
               COALESCE(rr.similarity_flagged, false) as similarity_flagged,
               COALESCE(rr.ring_flagged, false) as ring_flagged,
               COALESCE(rr.llm_flagged, false) as llm_flagged,
               NULL as llm_explanation, NULL as reviewer_risk,
               COALESCE(rr.trust_score, 1.0) as trust_score
        FROM reviews r
        LEFT JOIN review_results rr ON r.review_id = rr.review_id
        WHERE r.asin = ?
        ORDER BY trust_score ASC
        LIMIT ? OFFSET ?
    """, [asin, limit, offset]).df()
    con.close()

    if rows.empty:
        raise HTTPException(status_code=404, detail=f"Product {asin} not found")

    if deep:
        # Run similarity + LLM on-demand for this batch
        sim_flags = flag_similar_in_batch(
            rows["review_id"].tolist(),
            rows["review_text"].fillna("").tolist()
        )
        for idx, row in rows.iterrows():
            sim = sim_flags.get(row["review_id"], False)
            rows.at[idx, "similarity_flagged"] = sim
            if sim and not row["llm_flagged"]:
                result = judge_review(
                    review_text=row["review_text"],
                    rating=row["rating"],
                    verified_purchase=row["verified_purchase"],
                    rule_reasons=str(row.get("rule_reasons", "")),
                )
                rows.at[idx, "llm_flagged"] = result["llm_flagged"]
                rows.at[idx, "llm_explanation"] = result["explanation"]
            rows.at[idx, "trust_score"] = compute_trust_score(
                rule_flagged=bool(rows.at[idx, "rule_flagged"]),
                similarity_flagged=bool(rows.at[idx, "similarity_flagged"]),
                ring_flagged=bool(rows.at[idx, "ring_flagged"]),
                llm_flagged=bool(rows.at[idx, "llm_flagged"]),
            )

    return rows.fillna("").to_dict("records")


@router.get("/{asin}/summary")
def get_product_summary(asin: str):
    con = duckdb.connect(DB_PATH, read_only=True)
    row = con.execute("""
        SELECT
            COUNT(*) AS total_reviews,
            AVG(r.rating) AS avg_rating,
            SUM(CASE WHEN rr.trust_score < 0.7 THEN 1 ELSE 0 END) AS flagged_count,
            AVG(rr.trust_score) AS avg_trust_score
        FROM reviews r
        LEFT JOIN review_results rr ON r.review_id = rr.review_id
        WHERE r.asin = ?
    """, [asin]).fetchone()
    con.close()
    if not row or row[0] == 0:
        raise HTTPException(status_code=404, detail=f"Product {asin} not found")
    return {
        "asin": asin,
        "total_reviews": row[0],
        "avg_rating": round(row[1], 2) if row[1] else None,
        "flagged_count": row[2] or 0,
        "avg_trust_score": round(row[3], 2) if row[3] else None,
    }
