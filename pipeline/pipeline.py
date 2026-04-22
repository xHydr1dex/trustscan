"""
pipeline.py — Orchestrates all 5 TrustScan detection stages and benchmarks on labeled data.
"""

import duckdb
import pandas as pd
from pathlib import Path

from pipeline.rules import apply_rules
from pipeline.similarity import flag_similar_in_batch
from pipeline.graph import get_ring_members
from pipeline.llm_judge import judge_review
from pipeline.reviewer_profiler import profile_reviewer
from pipeline.scorer import compute_trust_score

DB_PATH = str(Path(__file__).parent.parent / "data" / "trustscan.duckdb")


def run_pipeline(limit=None) -> pd.DataFrame:
    """
    Run all 5 detection stages on reviews from DuckDB.

    Stages:
      1. Rule-based flagging (apply_rules)
      2. Similarity flagging (flag_similar_in_batch)
      3. Ring detection (get_ring_members)
      4. LLM judge — only for borderline reviews (exactly 1 stage flagged)
      5. Reviewer profiler — only for users with 5+ reviews in the batch

    Saves results to the review_results table and returns the results DataFrame.
    """
    con = duckdb.connect(DB_PATH)

    query = "SELECT review_id, asin, user_id, review_text, rating, verified_purchase, reviewed_at FROM reviews"
    if limit is not None:
        query += f" LIMIT {int(limit)}"

    df = con.execute(query).df()
    print(f"[pipeline] Loaded {len(df)} reviews.")

    # ---------------------------------------------------------------------------
    # Stage 1: Rule-based flags
    # ---------------------------------------------------------------------------
    print("[pipeline] Stage 1: Rules...")
    df = apply_rules(df)

    # ---------------------------------------------------------------------------
    # Stage 2: Similarity flags
    # ---------------------------------------------------------------------------
    print("[pipeline] Stage 2: Similarity...")
    try:
        sim_flags = flag_similar_in_batch(
            df["review_id"].tolist(),
            df["review_text"].fillna("").tolist(),
        )
        df["similarity_flagged"] = df["review_id"].map(sim_flags).fillna(False).astype(bool)
    except Exception as e:
        print(f"[pipeline]   Similarity stage failed ({e}), defaulting all to False.")
        df["similarity_flagged"] = False

    # ---------------------------------------------------------------------------
    # Stage 3: Ring detection
    # ---------------------------------------------------------------------------
    print("[pipeline] Stage 3: Ring detection...")
    ring_members = get_ring_members(df)
    df["ring_flagged"] = df["user_id"].isin(ring_members)

    # ---------------------------------------------------------------------------
    # Stage 4: LLM judge (borderline = exactly 1 stage flagged)
    # ---------------------------------------------------------------------------
    print("[pipeline] Stage 4: LLM judge (borderline reviews only)...")
    df["_stage_count"] = (
        df["rule_flagged"].astype(int)
        + df["similarity_flagged"].astype(int)
        + df["ring_flagged"].astype(int)
    )
    borderline_mask = df["_stage_count"] == 1

    df["llm_flagged"] = False
    df["llm_confidence"] = 0.0
    df["llm_explanation"] = ""

    borderline_indices = df.index[borderline_mask].tolist()
    print(f"[pipeline]   Running LLM on {len(borderline_indices)} borderline reviews...")
    for idx in borderline_indices:
        row = df.loc[idx]
        result = judge_review(
            review_text=str(row["review_text"]),
            rating=float(row["rating"]),
            verified_purchase=bool(row["verified_purchase"]),
            rule_reasons=str(row["rule_reasons"]),
        )
        df.at[idx, "llm_flagged"] = result["llm_flagged"]
        df.at[idx, "llm_confidence"] = result["confidence"]
        df.at[idx, "llm_explanation"] = result["explanation"]

    df.drop(columns=["_stage_count"], inplace=True)

    # ---------------------------------------------------------------------------
    # Stage 5: Reviewer profiler (users with 5+ reviews in batch)
    # ---------------------------------------------------------------------------
    print("[pipeline] Stage 5: Reviewer profiler...")
    user_review_counts = df.groupby("user_id").size()
    active_users = user_review_counts[user_review_counts >= 5].index.tolist()
    print(f"[pipeline]   Profiling {len(active_users)} users with 5+ reviews...")

    reviewer_risk_map: dict[str, str] = {}
    for uid in active_users:
        user_df = df[df["user_id"] == uid]
        reviews_list = user_df[["rating", "verified_purchase", "review_text"]].to_dict("records")
        profile = profile_reviewer(uid, reviews_list)
        reviewer_risk_map[uid] = profile.get("risk_level", "unknown")

    df["reviewer_risk"] = df["user_id"].map(reviewer_risk_map).fillna("unknown")

    # ---------------------------------------------------------------------------
    # Compute trust score
    # ---------------------------------------------------------------------------
    print("[pipeline] Computing trust scores...")
    df["trust_score"] = df.apply(
        lambda r: compute_trust_score(
            rule_flagged=bool(r["rule_flagged"]),
            similarity_flagged=bool(r["similarity_flagged"]),
            ring_flagged=bool(r["ring_flagged"]),
            llm_flagged=bool(r["llm_flagged"]),
            llm_confidence=float(r["llm_confidence"]),
        ),
        axis=1,
    )

    # ---------------------------------------------------------------------------
    # Save to review_results
    # ---------------------------------------------------------------------------
    print("[pipeline] Saving results to DuckDB...")
    df_to_save = df[[
        "review_id",
        "asin",
        "user_id",
        "rule_flagged",
        "similarity_flagged",
        "ring_flagged",
        "llm_flagged",
        "llm_explanation",
        "reviewer_risk",
        "trust_score",
    ]].copy()

    # Ensure bool columns are stored as bool (not numpy.bool_)
    for col in ["rule_flagged", "similarity_flagged", "ring_flagged", "llm_flagged"]:
        df_to_save[col] = df_to_save[col].astype(bool)

    con.register("results", df_to_save)
    con.execute("INSERT INTO review_results SELECT *, CURRENT_TIMESTAMP FROM results")
    con.close()

    print(f"[pipeline] Done. {len(df_to_save)} results saved.")
    return df


def benchmark_on_labeled() -> dict:
    """
    Benchmark Stage 1 (rules) against labeled_reviews.

    Positive class = CG (fake).
    Returns and prints precision, recall, F1.
    """
    con = duckdb.connect(DB_PATH)
    df = con.execute(
        "SELECT review_id, review_text, rating, label FROM labeled_reviews"
    ).df()
    con.close()

    print(f"[benchmark] Loaded {len(df)} labeled reviews.")

    # labeled_reviews doesn't have all required rule columns — fill in defaults
    if "verified_purchase" not in df.columns:
        df["verified_purchase"] = False
    if "user_id" not in df.columns:
        df["user_id"] = "unknown"
    if "reviewed_at" not in df.columns:
        df["reviewed_at"] = None

    df = apply_rules(df)

    # Positive class: CG = fake
    y_true = (df["label"] == "CG").astype(int)
    y_pred = df["rule_flagged"].astype(int)

    tp = int(((y_pred == 1) & (y_true == 1)).sum())
    fp = int(((y_pred == 1) & (y_true == 0)).sum())
    fn = int(((y_pred == 0) & (y_true == 1)).sum())

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )

    metrics = {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "total_labeled": len(df),
        "total_cg": int(y_true.sum()),
        "total_flagged": int(y_pred.sum()),
    }

    print("\n=== Benchmark Results (Stage 1: Rules) ===")
    print(f"  Total labeled reviews : {metrics['total_labeled']}")
    print(f"  Fake (CG) reviews     : {metrics['total_cg']}")
    print(f"  Flagged by rules      : {metrics['total_flagged']}")
    print(f"  True Positives        : {tp}")
    print(f"  False Positives       : {fp}")
    print(f"  False Negatives       : {fn}")
    print(f"  Precision             : {metrics['precision']:.4f}")
    print(f"  Recall                : {metrics['recall']:.4f}")
    print(f"  F1 Score              : {metrics['f1']:.4f}")
    print("==========================================\n")

    return metrics
