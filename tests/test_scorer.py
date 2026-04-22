from pipeline.scorer import compute_trust_score


def test_all_flags_gives_low_score():
    score = compute_trust_score(
        rule_flagged=True,
        similarity_flagged=True,
        ring_flagged=True,
        llm_flagged=True,
        llm_confidence=0.95,
    )
    assert score <= 0.2


def test_no_flags_gives_high_score():
    score = compute_trust_score(
        rule_flagged=False,
        similarity_flagged=False,
        ring_flagged=False,
        llm_flagged=False,
        llm_confidence=0.0,
    )
    assert score >= 0.9


def test_single_flag_gives_medium_score():
    score = compute_trust_score(
        rule_flagged=True,
        similarity_flagged=False,
        ring_flagged=False,
        llm_flagged=False,
        llm_confidence=0.0,
    )
    assert 0.4 <= score <= 0.7


def test_two_flags_gives_low_medium_score():
    score = compute_trust_score(
        rule_flagged=True,
        similarity_flagged=True,
        ring_flagged=False,
        llm_flagged=False,
        llm_confidence=0.0,
    )
    assert score <= 0.4


def test_score_bounded_0_to_1():
    for combo in [(True, True, True, True, 1.0), (False, False, False, False, 0.0)]:
        score = compute_trust_score(*combo)
        assert 0.0 <= score <= 1.0
