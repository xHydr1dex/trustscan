def compute_trust_score(
    rule_flagged: bool,
    similarity_flagged: bool,
    ring_flagged: bool,
    llm_flagged: bool,
    llm_confidence: float = 0.0,
    verified_purchase: bool = False,
    has_media: bool = False,
    ml_fake_prob: float = 0.0,
) -> float:
    flag_count = sum([rule_flagged, similarity_flagged, ring_flagged, llm_flagged])

    if flag_count == 0:
        # No explicit flags — use ML score as a soft penalty
        score = 1.0 - (ml_fake_prob * 0.45)
    else:
        base_scores = {1: 0.60, 2: 0.35, 3: 0.15, 4: 0.05}
        score = base_scores.get(flag_count, 0.05)
        if llm_flagged and llm_confidence > 0.8:
            score = max(score - 0.1, 0.0)

    # Genuine signals boost the score
    if verified_purchase:
        score = min(score + 0.18, 1.0)
    if has_media:
        score = min(score + 0.10, 1.0)

    # Hard cap: any rule or significant ML suspicion limits max trust
    if rule_flagged or similarity_flagged or ring_flagged:
        score = min(score, 0.72)
    elif ml_fake_prob > 0.5:
        score = min(score, 0.78)

    return round(score, 2)
