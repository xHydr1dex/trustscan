def compute_trust_score(
    rule_flagged: bool,
    similarity_flagged: bool,
    ring_flagged: bool,
    llm_flagged: bool,
    llm_confidence: float = 0.0,
) -> float:
    flag_count = sum([rule_flagged, similarity_flagged, ring_flagged, llm_flagged])

    if flag_count == 0:
        return 1.0

    base_scores = {1: 0.6, 2: 0.35, 3: 0.15, 4: 0.05}
    score = base_scores.get(flag_count, 0.05)

    if llm_flagged and llm_confidence > 0.8:
        score = max(score - 0.1, 0.0)

    return round(score, 2)
