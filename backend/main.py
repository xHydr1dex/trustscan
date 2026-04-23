from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import product, reviewer, rings, chat, products
import duckdb
from pathlib import Path

DB_PATH = str(Path(__file__).parent.parent / "data" / "trustscan.duckdb")

app = FastAPI(title="TrustScan API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(product.router, prefix="/product", tags=["product"])
app.include_router(products.router, prefix="/products", tags=["products"])
app.include_router(reviewer.router, prefix="/reviewer", tags=["reviewer"])
app.include_router(rings.router, prefix="/rings", tags=["rings"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])


@app.get("/stats")
def get_stats():
    con = duckdb.connect(DB_PATH, read_only=True)
    total = con.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
    flagged = con.execute("SELECT COUNT(*) FROM review_results WHERE trust_score < 0.7").fetchone()[0]
    rings_count = con.execute("SELECT COUNT(*) FROM review_results WHERE ring_flagged = true").fetchone()[0]
    processed = con.execute("SELECT COUNT(*) FROM review_results").fetchone()[0]
    con.close()
    return {
        "total_reviews": total,
        "processed_reviews": processed,
        "flagged_reviews": flagged,
        "ring_members_detected": rings_count,
    }


@app.get("/health")
def health():
    return {"status": "ok"}
