"""
One-time precompute script. Run before launching the API.
Stages:
  1. Rules  2. Ring detection  3. ML classifier
  4. Similarity flagging (near-duplicate heuristic)
  5. LLM-proxy flagging (top 8% by ML score)
  6. Percentile-based reviewer risk
  7. Trust scoring + save to DuckDB
"""
import duckdb
import pandas as pd
import numpy as np
from pathlib import Path
from pipeline.rules import apply_rules
from pipeline.graph import build_reviewer_graph, detect_rings
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

    if not os.path.exists(MODEL_PATH):
        print("Training ML classifier...")
        metrics = train_classifier()
        print(f"  Metrics: {metrics}\n")
    else:
        print("Classifier found, skipping training.\n")

    print("Loading reviews from DuckDB...")
    con = duckdb.connect(DB_PATH)
    df = con.execute("""
        SELECT review_id, asin, user_id, review_text, rating, verified_purchase, reviewed_at
        FROM reviews
    """).df()
    print(f"Loaded {len(df):,} reviews.\n")

    # Stage 1: Rules
    print("Stage 1: Rule engine...")
    df = apply_rules(df)
    print(f"  Rule flagged: {df['rule_flagged'].sum():,}\n")

    # Stage 2: Ring detection
    print("Stage 2: Ring detection...")
    G = build_reviewer_graph(df[["user_id", "asin"]])
    suspected_rings = detect_rings(G, min_shared_products=3)
    ring_members = {u for ring in suspected_rings for u in ring}
    df["ring_flagged"] = df["user_id"].isin(ring_members)
    print(f"  Rings: {len(suspected_rings)}, members: {len(ring_members):,}\n")

    # Stage 3: ML fake probability
    print("Stage 3: ML classifier...")
    fake_probs = predict_fake_probability(
        df["review_text"].fillna("").tolist(),
        df["rating"].fillna(3.0).tolist()
    )
    df["ml_fake_prob"] = fake_probs
    print(f"  Mean fake prob: {np.mean(fake_probs):.3f}\n")

    # Stage 4: Similarity — near-duplicate reviews on the same product
    print("Stage 4: Similarity flagging...")
    df["_prefix"] = df["review_text"].fillna("").str[:60].str.lower().str.strip()
    dup_mask = df.duplicated(subset=["asin", "_prefix"], keep=False) & (df["_prefix"].str.len() >= 20)
    df["similarity_flagged"] = dup_mask
    df.drop(columns=["_prefix"], inplace=True)
    print(f"  Similarity flagged: {dup_mask.sum():,}\n")

    # Stage 5: LLM-proxy — fixed probability threshold so count varies naturally with data
    df["llm_flagged"] = df["ml_fake_prob"] >= 0.82
    df["llm_explanation"] = ""
    print(f"Stage 5: LLM-proxy flagged: {df['llm_flagged'].sum():,}\n")

    # Stage 6: Reviewer risk — percentile-based (not hardcoded) for realistic spread
    user_ring = df.groupby("user_id")["ring_flagged"].any()
    user_rule = df.groupby("user_id")["rule_flagged"].sum()
    user_ml   = df.groupby("user_id")["ml_fake_prob"].mean()

    non_ring_ids = [uid for uid in user_ml.index if not user_ring.get(uid, False)]
    nr_scores = user_ml[non_ring_ids] if non_ring_ids else pd.Series(dtype=float)
    p_high = float(nr_scores.quantile(0.80)) if len(nr_scores) else 0.8
    p_med  = float(nr_scores.quantile(0.45)) if len(nr_scores) else 0.5

    def reviewer_risk(uid):
        if user_ring.get(uid, False):
            return "high"
        ml_avg    = float(user_ml.get(uid, 0.0))
        rule_hits = int(user_rule.get(uid, 0))
        if ml_avg >= p_high or rule_hits >= 3:
            return "high"
        if ml_avg >= p_med or rule_hits >= 1:
            return "medium"
        return "low"

    df["reviewer_risk"] = df["user_id"].map(reviewer_risk)
    risk_dist = df.groupby("user_id")["reviewer_risk"].first().value_counts().to_dict()
    print(f"Stage 6: Risk distribution: {risk_dist}\n")

    # Stage 7: Trust scores
    print("Stage 7: Trust scoring...")
    df["trust_score"] = df.apply(lambda r: compute_trust_score(
        rule_flagged=bool(r["rule_flagged"]),
        similarity_flagged=bool(r["similarity_flagged"]),
        ring_flagged=bool(r["ring_flagged"]),
        llm_flagged=bool(r["llm_flagged"]),
        llm_confidence=float(r["ml_fake_prob"]) if bool(r["llm_flagged"]) else 0.0,
        ml_fake_prob=float(r["ml_fake_prob"]),
    ), axis=1)

    print("Saving to DuckDB...")
    results = df[[
        "review_id", "asin", "user_id",
        "rule_flagged", "similarity_flagged", "ring_flagged",
        "llm_flagged", "llm_explanation", "reviewer_risk", "trust_score"
    ]].copy()

    con = duckdb.connect(DB_PATH)
    con.execute("DELETE FROM review_results")
    con.register("results_df", results)
    con.execute("INSERT INTO review_results SELECT *, CURRENT_TIMESTAMP FROM results_df")
    saved = con.execute("SELECT COUNT(*) FROM review_results").fetchone()[0]
    con.close()

    print(f"\n=== Done ===")
    print(f"  Rule flagged:       {df['rule_flagged'].sum():,}")
    print(f"  Similarity flagged: {df['similarity_flagged'].sum():,}")
    print(f"  Ring flagged:       {df['ring_flagged'].sum():,}")
    print(f"  LLM flagged:        {df['llm_flagged'].sum():,}")
    print(f"  Saved:              {saved:,}")


if __name__ == "__main__":
    run_precompute()
