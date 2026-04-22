from fastapi import APIRouter
import duckdb
from pathlib import Path
from pipeline.graph import build_reviewer_graph, detect_rings, confirm_rings_with_text

router = APIRouter()
DB_PATH = str(Path(__file__).parent.parent.parent / "data" / "trustscan.duckdb")


@router.get("/")
def get_rings(min_shared: int = 3, limit: int = 50, confirm: bool = False):
    con = duckdb.connect(DB_PATH, read_only=True)
    df = con.execute("SELECT user_id, asin, review_id, review_text FROM reviews").df()
    con.close()
    G = build_reviewer_graph(df)
    rings = detect_rings(G, min_shared_products=min_shared)

    if confirm:
        # Filter rings using tighter similarity threshold (≤0.08) + LLM confidence ≥0.85
        rings = confirm_rings_with_text(rings, df)

    return {
        "total_rings": len(rings),
        "confirmed": confirm,
        "rings": [{"id": i, "members": ring, "size": len(ring)} for i, ring in enumerate(rings[:limit])]
    }
