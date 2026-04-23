from fastapi import APIRouter
import duckdb
from pathlib import Path

router = APIRouter()
DB_PATH = str(Path(__file__).parent.parent.parent / "data" / "trustscan.duckdb")


@router.get("/stats")
def get_overview_stats():
    con = duckdb.connect(DB_PATH, read_only=True)

    total = con.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
    flagged = con.execute(
        "SELECT COUNT(*) FROM review_results WHERE trust_score < 0.7"
    ).fetchone()[0]
    ring_users = con.execute(
        "SELECT COUNT(DISTINCT user_id) FROM review_results WHERE ring_flagged = true"
    ).fetchone()[0]
    products_affected = con.execute(
        "SELECT COUNT(DISTINCT asin) FROM review_results WHERE trust_score < 0.7"
    ).fetchone()[0]

    # Trend: compare first half vs second half of date range
    dates = con.execute(
        "SELECT MIN(reviewed_at), MAX(reviewed_at) FROM reviews"
    ).fetchone()
    pct_suspicious = pct_ring = pct_products = 0.0
    if dates[0] and dates[1]:
        span = (dates[1] - dates[0]).total_seconds()
        mid = dates[0].timestamp() + span / 2
        from datetime import datetime
        mid_dt = datetime.fromtimestamp(mid)

        f1 = con.execute("""
            SELECT COUNT(*) FROM reviews r
            JOIN review_results rr ON r.review_id = rr.review_id
            WHERE rr.trust_score < 0.7 AND r.reviewed_at < ?
        """, [mid_dt]).fetchone()[0]
        f2 = flagged - f1
        pct_suspicious = round(((f2 - f1) / max(f1, 1)) * 100, 1)

        r1 = con.execute("""
            SELECT COUNT(DISTINCT r.user_id) FROM reviews r
            JOIN review_results rr ON r.review_id = rr.review_id
            WHERE rr.ring_flagged = true AND r.reviewed_at < ?
        """, [mid_dt]).fetchone()[0]
        r2 = ring_users - r1
        pct_ring = round(((r2 - r1) / max(r1, 1)) * 100, 1)

        p1 = con.execute("""
            SELECT COUNT(DISTINCT r.asin) FROM reviews r
            JOIN review_results rr ON r.review_id = rr.review_id
            WHERE rr.trust_score < 0.7 AND r.reviewed_at < ?
        """, [mid_dt]).fetchone()[0]
        p2 = products_affected - p1
        pct_products = round(((p2 - p1) / max(p1, 1)) * 100, 1)

    con.close()
    return {
        "total_reviews": total,
        "suspicious_reviews": flagged,
        "reviewers_flagged": ring_users,
        "products_affected": products_affected,
        "pct_suspicious": pct_suspicious,
        "pct_ring": pct_ring,
        "pct_products": pct_products,
    }


@router.get("/timeline")
def get_timeline():
    con = duckdb.connect(DB_PATH, read_only=True)
    rows = con.execute("""
        SELECT
            STRFTIME(DATE_TRUNC('week', r.reviewed_at)::DATE, '%Y-%m-%d') AS week,
            COUNT(*) AS flagged
        FROM reviews r
        JOIN review_results rr ON r.review_id = rr.review_id
        WHERE rr.trust_score < 0.7
        GROUP BY week
        ORDER BY week
    """).df()
    con.close()
    return rows.to_dict("records")


@router.get("/top-risks")
def get_top_risks():
    con = duckdb.connect(DB_PATH, read_only=True)

    products = con.execute("""
        SELECT r.asin,
               COUNT(*) AS flagged_count,
               ROUND(AVG(rr.trust_score), 2) AS avg_trust
        FROM reviews r
        JOIN review_results rr ON r.review_id = rr.review_id
        WHERE rr.trust_score < 0.7
        GROUP BY r.asin
        ORDER BY flagged_count DESC
        LIMIT 5
    """).df()

    rule_count = con.execute(
        "SELECT COUNT(*) FROM review_results WHERE rule_flagged = true"
    ).fetchone()[0]
    sim_count = con.execute(
        "SELECT COUNT(*) FROM review_results WHERE similarity_flagged = true"
    ).fetchone()[0]
    ring_count = con.execute(
        "SELECT COUNT(*) FROM review_results WHERE ring_flagged = true"
    ).fetchone()[0]
    llm_count = con.execute(
        "SELECT COUNT(*) FROM review_results WHERE llm_flagged = true"
    ).fetchone()[0]

    con.close()
    return {
        "top_products": products.to_dict("records"),
        "signal_breakdown": {
            "Rule Engine": rule_count,
            "Similarity": sim_count,
            "Ring Detection": ring_count,
            "LLM Judge": llm_count,
        },
    }


@router.get("/alerts")
def get_alerts(limit: int = 8):
    con = duckdb.connect(DB_PATH, read_only=True)
    rows = con.execute("""
        SELECT
            r.review_id, r.user_id, r.asin, r.rating,
            SUBSTR(r.review_text, 1, 90) AS preview,
            rr.trust_score,
            rr.ring_flagged, rr.rule_flagged, rr.llm_flagged,
            rr.reviewer_risk
        FROM reviews r
        JOIN review_results rr ON r.review_id = rr.review_id
        WHERE rr.trust_score < 0.5
        ORDER BY rr.trust_score ASC
        LIMIT ?
    """, [limit]).df()
    con.close()
    return rows.fillna("").to_dict("records")
