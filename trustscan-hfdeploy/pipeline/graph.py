import pandas as pd
import networkx as nx
from itertools import combinations

MIN_SHARED_PRODUCTS = 3
RING_LLM_CONFIDENCE_THRESHOLD = 0.85  # higher than individual fake threshold (0.6)


def build_reviewer_graph(df: pd.DataFrame) -> nx.Graph:
    G = nx.Graph()
    for _, row in df.iterrows():
        user = row["user_id"]
        product = row["asin"]
        G.add_node(user, node_type="reviewer")
        G.add_node(product, node_type="product")
        G.add_edge(user, product)
    return G


def detect_rings(G: nx.Graph, min_shared_products: int = 3) -> list[list[str]]:
    reviewers = [n for n, d in G.nodes(data=True) if d.get("node_type") == "reviewer"]
    rings = []
    visited = set()

    for u1, u2 in combinations(reviewers, 2):
        shared = list(nx.common_neighbors(G, u1, u2))
        if len(shared) >= min_shared_products:
            key = frozenset([u1, u2])
            if key not in visited:
                visited.add(key)
                ring = [u1, u2]
                for u3 in reviewers:
                    if u3 in (u1, u2):
                        continue
                    shared_with_u3 = list(nx.common_neighbors(G, u1, u3))
                    if len(shared_with_u3) >= min_shared_products:
                        ring.append(u3)
                rings.append(sorted(set(ring)))

    unique = []
    seen = set()
    for ring in rings:
        key = frozenset(ring)
        if key not in seen:
            seen.add(key)
            unique.append(ring)

    return unique


def get_ring_members(df: pd.DataFrame, min_shared_products: int = MIN_SHARED_PRODUCTS) -> set[str]:
    G = build_reviewer_graph(df)
    rings = detect_rings(G, min_shared_products)
    return {user for ring in rings for user in ring}


def confirm_rings_with_text(
    rings: list[list[str]],
    df: pd.DataFrame,
    fake_proba_threshold: float = 0.6,
    ring_similarity_threshold: float = None,
) -> list[list[str]]:
    """
    Confirm rings using 3-signal corroboration:
    1. Reviewer profiler risk level (high = strong signal)
    2. ML classifier fake probability >= fake_proba_threshold
    3. Tight similarity (cosine distance <= RING_SIMILARITY_THRESHOLD)

    A ring is confirmed if >= 50% of members pass at least 2 of the 3 signals.
    """
    from pipeline.similarity import is_ring_similar, RING_SIMILARITY_THRESHOLD
    from pipeline.reviewer_profiler import profile_reviewer
    from pipeline.classifier import predict_fake_probability

    if ring_similarity_threshold is None:
        ring_similarity_threshold = RING_SIMILARITY_THRESHOLD

    confirmed = []

    for ring in rings:
        ring_df = df[df["user_id"].isin(ring)].copy()
        corroborated_members = 0

        # Signal 2: ML classifier on all ring member reviews
        texts = ring_df["review_text"].fillna("").astype(str).tolist()
        ratings = ring_df["rating"].fillna(3.0).tolist()
        try:
            fake_probs = predict_fake_probability(texts, ratings)
        except Exception:
            fake_probs = [0.0] * len(texts)

        ring_df = ring_df.copy()
        ring_df["fake_prob"] = fake_probs

        for user_id in ring:
            user_reviews = ring_df[ring_df["user_id"] == user_id]
            if user_reviews.empty:
                continue

            signals_fired = 0

            # Signal 1: Reviewer profiler
            try:
                profile = profile_reviewer(user_id, user_reviews.to_dict("records"))
                if profile.get("risk_level") == "high":
                    signals_fired += 1
            except Exception:
                pass

            # Signal 2: ML classifier (any review >= threshold)
            user_fake_probs = user_reviews["fake_prob"].tolist()
            if any(p >= fake_proba_threshold for p in user_fake_probs):
                signals_fired += 1

            # Signal 3: Tight similarity
            for _, row in user_reviews.iterrows():
                try:
                    if is_ring_similar(str(row.get("review_text", "")), exclude_id=str(row.get("review_id", ""))):
                        signals_fired += 1
                        break
                except Exception:
                    pass

            if signals_fired >= 2:
                corroborated_members += 1

        if corroborated_members >= max(1, len(ring) // 2):
            confirmed.append(ring)

    return confirmed
