from fastapi import APIRouter
from pydantic import BaseModel
from collections import defaultdict
import duckdb
from pathlib import Path

router = APIRouter()

DB_PATH = str(Path(__file__).parent.parent.parent / "data" / "trustscan.duckdb")
MIN_SHARED = 3  # products two reviewers must share to be flagged


class ReviewerData(BaseModel):
    reviewer_id: str
    products: list[str]


@router.post("/ring-check")
async def check_rings(reviewers: list[ReviewerData]):
    if not reviewers:
        return {"ring_members": [], "shared_products": {}, "total_checked": 0}

    reviewer_products = {r.reviewer_id: set(r.products) for r in reviewers}
    ids = list(reviewer_products.keys())

    # In-memory ring detection from submitted profile data
    connections: dict[str, list[dict]] = defaultdict(list)
    ring_members: set[str] = set()

    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            shared = reviewer_products[ids[i]] & reviewer_products[ids[j]]
            if len(shared) >= MIN_SHARED:
                ring_members.add(ids[i])
                ring_members.add(ids[j])
                connections[ids[i]].append({"with": ids[j], "shared_count": len(shared), "shared": list(shared)[:5]})
                connections[ids[j]].append({"with": ids[i], "shared_count": len(shared), "shared": list(shared)[:5]})

    # Also check submitted reviewers against precomputed ring members in DB
    db_ring_members: set[str] = set()
    try:
        con = duckdb.connect(DB_PATH, read_only=True)
        placeholders = ", ".join(["?" for _ in ids])
        rows = con.execute(
            f"SELECT DISTINCT user_id FROM review_results WHERE user_id IN ({placeholders}) AND ring_flagged = true",
            ids,
        ).fetchall()
        db_ring_members = {row[0] for row in rows}
        con.close()
    except Exception:
        pass  # DB unavailable — live-scan only mode

    all_ring_members = list(ring_members | db_ring_members)

    return {
        "ring_members": all_ring_members,
        "connections": dict(connections),
        "db_confirmed": list(db_ring_members),
        "total_checked": len(reviewers),
    }
