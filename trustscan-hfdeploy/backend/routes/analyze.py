import asyncio
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import pandas as pd
from pipeline.rules import apply_rules
from pipeline.classifier import predict_fake_probability
from pipeline.scorer import compute_trust_score
from pipeline.llm_judge import judge_review

router = APIRouter()

LLM_BATCH_LIMIT = 25


class ReviewInput(BaseModel):
    review_id: str
    review_text: str
    rating: float = 3.0
    reviewer_id: Optional[str] = None
    verified_purchase: bool = False
    has_media: bool = False


async def _judge_async(review_id, review_text, rating, verified_purchase, rule_reasons):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, judge_review, review_text, rating, verified_purchase, rule_reasons
    )
    return review_id, result


@router.post("/analyze")
async def analyze_batch(reviews: list[ReviewInput]):
    if not reviews:
        return []

    df = pd.DataFrame([r.model_dump() for r in reviews])
    df["user_id"] = df["reviewer_id"].fillna("unknown")
    df["asin"] = "live_scan"
    df["reviewed_at"] = pd.Timestamp.now()

    # Stage 1: Rules
    df = apply_rules(df)

    # Stage 2: ML fake probability
    fake_probs = predict_fake_probability(
        df["review_text"].fillna("").tolist(),
        df["rating"].fillna(3.0).tolist(),
    )
    df["ml_fake_prob"] = fake_probs

    # Stage 3: Similarity — near-duplicate within this batch
    df["_prefix"] = df["review_text"].fillna("").str[:60].str.lower().str.strip()
    dup_mask = df.duplicated(subset=["_prefix"], keep=False) & (df["_prefix"].str.len() >= 20)
    df["similarity_flagged"] = dup_mask
    df.drop(columns=["_prefix"], inplace=True)

    # Stage 4: Real LLM judge — prioritise top suspects by ML score
    df = df.reset_index(drop=True)
    llm_indices = (
        df["ml_fake_prob"].nlargest(LLM_BATCH_LIMIT).index.tolist()
        if len(df) > LLM_BATCH_LIMIT else df.index.tolist()
    )

    def rule_reasons_str(row):
        parts = []
        if row.get("rule_flagged"):    parts.append("rule-engine flagged")
        if row.get("similarity_flagged"): parts.append("near-duplicate text")
        return ", ".join(parts) if parts else ""

    tasks = [
        _judge_async(
            df.loc[i, "review_id"],
            df.loc[i, "review_text"] or "",
            float(df.loc[i, "rating"]),
            bool(df.loc[i, "verified_purchase"]),
            rule_reasons_str(df.loc[i]),
        )
        for i in llm_indices
    ]
    llm_results = await asyncio.gather(*tasks)
    llm_map = {rid: res for rid, res in llm_results}

    df["llm_flagged"]     = False
    df["llm_explanation"] = ""
    df["llm_confidence"]  = 0.0
    for i in llm_indices:
        rid = df.loc[i, "review_id"]
        res = llm_map.get(rid, {})
        df.loc[i, "llm_flagged"]     = bool(res.get("llm_flagged", False))
        df.loc[i, "llm_explanation"] = str(res.get("explanation", ""))
        df.loc[i, "llm_confidence"]  = float(res.get("confidence", 0.0))

    # Stage 5: Trust score — now uses verified_purchase + has_media
    df["trust_score"] = df.apply(lambda r: compute_trust_score(
        rule_flagged=bool(r["rule_flagged"]),
        similarity_flagged=bool(r["similarity_flagged"]),
        ring_flagged=False,
        llm_flagged=bool(r["llm_flagged"]),
        llm_confidence=float(r["llm_confidence"]),
        verified_purchase=bool(r["verified_purchase"]),
        has_media=bool(r["has_media"]),
        ml_fake_prob=float(r["ml_fake_prob"]),
    ), axis=1)

    return df[[
        "review_id", "trust_score", "rule_flagged", "rule_reasons",
        "similarity_flagged", "llm_flagged", "llm_explanation",
        "llm_confidence", "ml_fake_prob", "verified_purchase", "has_media",
    ]].to_dict(orient="records")
