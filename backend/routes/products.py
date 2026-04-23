from fastapi import APIRouter
import duckdb
from pathlib import Path

router = APIRouter()
DB_PATH = str(Path(__file__).parent.parent.parent / "data" / "trustscan.duckdb")


@router.get("/")
def list_products(category: str = None):
    con = duckdb.connect(DB_PATH, read_only=True)
    where = "WHERE p.category = ?" if category else ""
    params = [category] if category else []
    rows = con.execute(f"""
        SELECT
            p.asin,
            p.category,
            COUNT(r.review_id) AS review_count,
            ROUND(AVG(r.rating), 1) AS avg_rating,
            ROUND(AVG(rr.trust_score), 2) AS avg_trust_score,
            SUM(CASE WHEN rr.trust_score < 0.7 THEN 1 ELSE 0 END) AS flagged_count
        FROM products p
        LEFT JOIN reviews r ON p.asin = r.asin
        LEFT JOIN review_results rr ON r.review_id = rr.review_id
        {where}
        GROUP BY p.asin, p.category
        HAVING COUNT(r.review_id) > 0
        ORDER BY flagged_count DESC, review_count DESC
    """, params).df()
    con.close()
    return rows.fillna(0).to_dict("records")


@router.get("/categories")
def list_categories():
    con = duckdb.connect(DB_PATH, read_only=True)
    rows = con.execute("""
        SELECT p.category, COUNT(DISTINCT p.asin) AS product_count
        FROM products p
        GROUP BY p.category
        ORDER BY product_count DESC
    """).df()
    con.close()
    return rows.to_dict("records")
