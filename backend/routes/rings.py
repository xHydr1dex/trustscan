from fastapi import APIRouter
import duckdb
from pathlib import Path
from pipeline.graph import build_reviewer_graph, detect_rings

router = APIRouter()
DB_PATH = str(Path(__file__).parent.parent.parent / "data" / "trustscan.duckdb")


@router.get("/")
def get_rings(min_shared: int = 3, limit: int = 50):
    con = duckdb.connect(DB_PATH, read_only=True)
    df = con.execute("SELECT user_id, asin FROM reviews").df()
    con.close()
    G = build_reviewer_graph(df)
    rings = detect_rings(G, min_shared_products=min_shared)
    return {
        "total_rings": len(rings),
        "rings": [{"id": i, "members": ring, "size": len(ring)} for i, ring in enumerate(rings[:limit])]
    }
