"""
Seed demo data from the labeled CSV (no df_final.csv needed).
Uses 6000 reviews — fast enough to run on startup (~5 seconds).
Run: python -m scripts.seed_demo
"""
import duckdb
import pandas as pd
import hashlib
import random
import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
DB_PATH = DATA_DIR / "trustscan.duckdb"
LABELED_CSV = DATA_DIR / "fake_reviews_sample.csv"
DEMO_ROWS = 6000


def seed():
    DATA_DIR.mkdir(exist_ok=True)

    if DB_PATH.exists():
        try:
            con = duckdb.connect(str(DB_PATH), read_only=True)
            n = con.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
            con.close()
            if n > 0:
                print(f"DuckDB already seeded ({n:,} reviews). Skipping.")
                return
        except Exception:
            pass

    print(f"Seeding {DEMO_ROWS} demo reviews from labeled CSV…")
    df = pd.read_csv(LABELED_CSV, nrows=DEMO_ROWS)
    df = df.dropna(subset=["text_"]).reset_index(drop=True)

    random.seed(42)
    base_date = datetime.datetime(2022, 1, 1)

    df["review_id"] = df.index.map(lambda i: f"R{i:07d}")
    df["asin"] = df["category"].apply(
        lambda c: "B" + hashlib.md5(c.encode()).hexdigest()[:9].upper()
    )
    df["user_id"] = df.index.map(lambda i: f"U{(i % 300):05d}")
    df["review_text"] = df["text_"]
    # fake reviews (CG label) are unverified, genuine (OR label) are verified
    df["verified_purchase"] = df["label"].apply(lambda l: l == "OR")
    df["helpful_vote"] = [random.randint(0, 10) for _ in range(len(df))]
    df["reviewed_at"] = [
        base_date + datetime.timedelta(
            days=random.randint(0, 730),
            hours=random.randint(0, 23)
        )
        for _ in range(len(df))
    ]

    con = duckdb.connect(str(DB_PATH))
    con.execute("""
        CREATE OR REPLACE TABLE reviews AS
        SELECT review_id, rating, asin, asin AS parent_asin,
               user_id, reviewed_at,
               helpful_vote, verified_purchase, review_text
        FROM df
    """)
    con.execute("""
        CREATE OR REPLACE TABLE labeled_reviews AS
        SELECT review_id, category, rating, label, review_text
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


if __name__ == "__main__":
    seed()
