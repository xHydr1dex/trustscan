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

    rng = random.Random(42)

    # 4 rings with varying sizes (4-6 members) and varying product counts (4-6 products)
    # Each ring member writes 5-15 reviews on their ring's shared products
    rings = [
        {"size": 5, "products": 5, "reviews_each": [11, 8, 13, 7, 9]},
        {"size": 4, "products": 4, "reviews_each": [6, 14, 9, 7]},
        {"size": 6, "products": 5, "reviews_each": [8, 12, 5, 10, 13, 6]},
        {"size": 4, "products": 6, "reviews_each": [9, 7, 11, 8]},
    ]
    total_ring_users = sum(r["size"] for r in rings)  # 19
    normal_user_count = 120

    # Random non-sequential user IDs for all users
    id_pool = list(range(10000, 99999))
    rng.shuffle(id_pool)
    uid_map = [f"U{id_pool[k]:05d}" for k in range(total_ring_users + normal_user_count)]

    # Build ring review slots: (uid, asin)
    asin_pool = ["B" + hashlib.md5(f"product_{k}".encode()).hexdigest()[:9].upper() for k in range(2000)]
    ring_slots = []
    uid_cursor = 0
    asin_cursor = 0
    for ring in rings:
        ring_asins = asin_pool[asin_cursor: asin_cursor + ring["products"]]
        asin_cursor += ring["products"]
        for member_idx in range(ring["size"]):
            uid = uid_map[uid_cursor]
            uid_cursor += 1
            for rev_num in range(ring["reviews_each"][member_idx]):
                ring_slots.append((uid, ring_asins[rev_num % len(ring_asins)]))

    # Normal users each get 10 exclusive products from the remaining pool
    normal_asin_start = asin_cursor
    normal_review_counts = [0] * normal_user_count

    # Interleave ring slots randomly into the review stream
    ring_idx = 0
    rng.shuffle(ring_slots)
    user_ids = []
    asins = []

    for i in range(len(df)):
        # Inject a ring review roughly every ~13th slot until ring_slots exhausted
        if ring_idx < len(ring_slots) and rng.random() < len(ring_slots) / len(df):
            uid, asin = ring_slots[ring_idx]
            ring_idx += 1
        else:
            user_idx = i % normal_user_count
            uid = uid_map[total_ring_users + user_idx]
            asin = asin_pool[normal_asin_start + user_idx * 10 + (normal_review_counts[user_idx] % 10)]
            normal_review_counts[user_idx] += 1
        user_ids.append(uid)
        asins.append(asin)

    # Append any remaining ring slots at the end
    for uid, asin in ring_slots[ring_idx:]:
        if len(user_ids) < len(df):
            user_ids.append(uid)
            asins.append(asin)

    user_ids = user_ids[:len(df)]
    asins = asins[:len(df)]

    df["user_id"] = user_ids
    df["asin"] = asins
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
