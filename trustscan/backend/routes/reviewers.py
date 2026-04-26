from fastapi import APIRouter
import duckdb
from pathlib import Path

router = APIRouter()
DB_PATH = str(Path(__file__).parent.parent.parent / "data" / "trustscan.duckdb")


@router.get("/")
def list_reviewers(
    risk: str = None,         # high | medium | low
    ring: bool = None,        # true = ring members only
    sort: str = "trust_asc",  # trust_asc | trust_desc | reviews_desc
    limit: int = 100,
):
    con = duckdb.connect(DB_PATH, read_only=True)

    filters = []
    params = []
    if risk:
        filters.append("rr.reviewer_risk = ?")
        params.append(risk)
    if ring is True:
        filters.append("rr.ring_flagged = true")
    elif ring is False:
        filters.append("rr.ring_flagged = false")

    where = ("WHERE " + " AND ".join(filters)) if filters else ""

    order = {
        "trust_asc":      "avg_trust_score ASC",
        "trust_desc":     "avg_trust_score DESC",
        "reviews_desc":   "review_count DESC",
    }.get(sort, "avg_trust_score ASC")

    rows = con.execute(f"""
        SELECT
            r.user_id,
            COUNT(r.review_id)                                      AS review_count,
            ROUND(AVG(rr.trust_score), 2)                          AS avg_trust_score,
            BOOL_OR(rr.ring_flagged)                               AS ring_member,
            ANY_VALUE(rr.reviewer_risk)                            AS risk_level,
            SUM(CASE WHEN rr.rule_flagged   THEN 1 ELSE 0 END)    AS rule_flags,
            SUM(CASE WHEN rr.llm_flagged    THEN 1 ELSE 0 END)    AS llm_flags
        FROM reviews r
        LEFT JOIN review_results rr ON r.review_id = rr.review_id
        {where}
        GROUP BY r.user_id
        HAVING COUNT(r.review_id) >= 3
        ORDER BY {order}
        LIMIT ?
    """, params + [limit]).df()
    con.close()
    return rows.fillna(0).to_dict("records")
