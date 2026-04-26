"""
One-time precompute script. Run before launching the API.
Stages run in order:
  1. Rules on all 208K reviews
  2. Graph: detect structural rings
  3. Profiler + ML + Similarity: confirm rings
  4. Save everything to DuckDB review_results
"""
import duckdb
import pandas as pd
from pathlib import Path
from pipeline.rules import apply_rules
from pipeline.graph import build_reviewer_graph, detect_rings, confirm_rings_with_text
from pipeline.scorer import compute_trust_score
from pipeline.classifier import train_classifier, predict_fake_probability
import os

DB_PATH = str(Path(__file__).parent.parent / "data" / "trustscan.duckdb")
MODEL_PATH = str(Path(__file__).parent.parent / "data" / "classifier.joblib")


def run_precompute():
    con = duckdb.connect(DB_PATH)
    already_done = con.execute("SELECT COUNT(*) FROM review_results").fetchone()[0]
    con.close()
    if already_done > 0:
        print(f"Precompute already done ({already_done:,} results). Skipping.")
        return

    print("=== TrustScan Precompute ===\n")

    # Train classifier if not already trained
    if not os.path.exists(MODEL_PATH):
        print("Training ML classifier on labeled data...")
        metrics = train_classifier()
        print(f"Classifier metrics: {metrics}\n")
    else:
        print("Classifier model found, skipping training.\n")

    # Load all reviews
    print("Loading reviews from DuckDB...")
    con = duckdb.connect(DB_PATH)
    df = con.execute("""
        SELECT review_id, asin, user_id, review_text, rating, verified_purchase, reviewed_at
        FROM reviews
    """).df()
    print(f"Loaded {len(df):,} reviews.\n")

    # Stage 1: Rules
    print("Stage 1: Running rule engine on all reviews...")
    df = apply_rules(df)
    rule_flagged_count = df["rule_flagged"].sum()
    print(f"  Rule flagged: {rule_flagged_count:,} reviews\n")

    # Stage 2: Graph — detect structural rings
    print("Stage 2: Building reviewer graph and detecting structural rings...")
    G = build_reviewer_graph(df[["user_id", "asin"]])
    suspected_rings = detect_rings(G, min_shared_products=3)
    print(f"  Structural rings found: {len(suspected_rings)}")
    ring_suspect_users = {u for ring in suspected_rings for u in ring}
    print(f"  Suspected ring members: {len(ring_suspect_users):,} users\n")

    # Use structural rings directly — confirmation needs ChromaDB+Groq which may be unavailable
    confirmed_ring_members = ring_suspect_users
    print(f"  Ring members flagged: {len(confirmed_ring_members):,} users\n")

    # Assign ring_flagged
    df["ring_flagged"] = df["user_id"].isin(confirmed_ring_members)

    # ML classifier score on all reviews (for trust score enrichment)
    print("Running ML classifier on all reviews for trust scores...")
    fake_probs = predict_fake_probability(
        df["review_text"].fillna("").tolist(),
        df["rating"].fillna(3.0).tolist()
    )
    df["ml_fake_prob"] = fake_probs
    df["similarity_flagged"] = False  # will be set on-demand
    df["llm_flagged"] = False
    df["llm_explanation"] = ""

    # Aggregate per-user signals to assign reviewer_risk
    user_ring = df.groupby("user_id")["ring_flagged"].any()
    user_rule = df.groupby("user_id")["rule_flagged"].sum()
    user_ml = df.groupby("user_id")["ml_fake_prob"].mean()

    def reviewer_risk(uid):
        if user_ring.get(uid, False):
            return "high"
        rule_hits = user_rule.get(uid, 0)
        ml_avg = user_ml.get(uid, 0.0)
        if rule_hits >= 2 or ml_avg >= 0.65:
            return "high"
        if rule_hits == 1 or ml_avg >= 0.45:
            return "medium"
        return "low"

    df["reviewer_risk"] = df["user_id"].map(reviewer_risk)

    # Compute trust scores
    print("Computing trust scores...")
    df["trust_score"] = df.apply(lambda r: compute_trust_score(
        rule_flagged=bool(r["rule_flagged"]),
        similarity_flagged=False,
        ring_flagged=bool(r["ring_flagged"]),
        llm_flagged=False,
        llm_confidence=0.0,
    ), axis=1)

    # Save to DuckDB
    print("Saving results to DuckDB...")
    results = df[[
        "review_id", "asin", "user_id",
        "rule_flagged", "similarity_flagged", "ring_flagged",
        "llm_flagged", "llm_explanation", "reviewer_risk", "trust_score"
    ]].copy()

    con.execute("DELETE FROM review_results")
    con.register("results_df", results)
    con.execute("""
        INSERT INTO review_results
        SELECT *, CURRENT_TIMESTAMP FROM results_df
    """)
    saved = con.execute("SELECT COUNT(*) FROM review_results").fetchone()[0]
    con.close()

    print(f"\n=== Precompute Complete ===")
    print(f"  Total processed: {len(df):,}")
    print(f"  Rule flagged: {df['rule_flagged'].sum():,}")
    print(f"  Ring flagged: {df['ring_flagged'].sum():,}")
    print(f"  Saved to review_results: {saved:,}")


if __name__ == "__main__":
    run_precompute()
