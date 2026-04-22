"""
Seed demo data from the labeled CSV (no df_final.csv needed).
Uses 6000 reviews — fast enough to run on Render startup (~8 min).
Run: python -m scripts.seed_demo
"""
import duckdb
import chromadb
import pandas as pd
from pathlib import Path
from sentence_transformers import SentenceTransformer

DATA_DIR = Path(__file__).parent.parent / "data"
DB_PATH = DATA_DIR / "trustscan.duckdb"
CHROMA_PATH = str(DATA_DIR / "chroma_db")
LABELED_CSV = DATA_DIR / "fake_reviews_sample.csv"
DEMO_ROWS = 6000
BATCH_SIZE = 256
EMBED_MODEL = "BAAI/bge-small-en-v1.5"


def seed():
    if DB_PATH.exists():
        con = duckdb.connect(str(DB_PATH), read_only=True)
        n = con.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
        con.close()
        if n > 0:
            print(f"DuckDB already seeded ({n:,} reviews). Skipping.")
            return

    print(f"Seeding demo data from {LABELED_CSV} ({DEMO_ROWS} rows)…")
    df = pd.read_csv(LABELED_CSV, nrows=DEMO_ROWS)
    df = df.dropna(subset=["text_"]).reset_index(drop=True)

    # Synthesize Amazon-like IDs for demo
    import hashlib
    df["review_id"] = df.index.map(lambda i: f"R{i:07d}")
    df["asin"] = df["category"].apply(
        lambda c: "B" + hashlib.md5(c.encode()).hexdigest()[:9].upper()
    )
    df["user_id"] = df.index.map(lambda i: f"U{(i % 300):05d}")
    df["review_text"] = df["text_"]
    df["verified_purchase"] = True
    df["helpful_vote"] = 0

    con = duckdb.connect(str(DB_PATH))
    con.execute("""
        CREATE OR REPLACE TABLE reviews AS
        SELECT review_id, rating, asin, asin AS parent_asin,
               user_id, CURRENT_TIMESTAMP AS reviewed_at,
               helpful_vote, verified_purchase, review_text
        FROM df
    """)
    con.execute("""
        CREATE OR REPLACE TABLE labeled_reviews AS
        SELECT review_id, category,
               rating, label, review_text
        FROM df
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS review_results (
            review_id VARCHAR,
            asin VARCHAR,
            user_id VARCHAR,
            rule_flagged BOOLEAN DEFAULT FALSE,
            similarity_flagged BOOLEAN DEFAULT FALSE,
            ring_flagged BOOLEAN DEFAULT FALSE,
            llm_flagged BOOLEAN DEFAULT FALSE,
            llm_explanation VARCHAR,
            reviewer_risk VARCHAR,
            trust_score FLOAT DEFAULT 1.0,
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    count = con.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
    con.close()
    print(f"DuckDB seeded: {count:,} reviews")

    # Build ChromaDB embeddings
    chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = chroma_client.get_or_create_collection(
        "reviews", metadata={"hnsw:space": "cosine"}
    )
    existing = collection.count()
    if existing >= count:
        print(f"ChromaDB already has {existing} vectors. Skipping.")
        return

    print("Building ChromaDB embeddings…")
    model = SentenceTransformer(EMBED_MODEL)
    texts = df["review_text"].fillna("").astype(str).tolist()
    ids = df["review_id"].astype(str).tolist()

    for i in range(0, len(texts), BATCH_SIZE):
        batch_texts = texts[i : i + BATCH_SIZE]
        batch_ids = ids[i : i + BATCH_SIZE]
        vecs = model.encode(batch_texts, normalize_embeddings=True, show_progress_bar=False)
        collection.add(
            ids=batch_ids,
            embeddings=vecs.tolist(),
            documents=batch_texts,
        )
        if (i // BATCH_SIZE) % 5 == 0:
            print(f"  {min(i + BATCH_SIZE, len(texts))}/{len(texts)} vectors")

    print(f"ChromaDB seeded: {collection.count()} vectors")


if __name__ == "__main__":
    seed()
