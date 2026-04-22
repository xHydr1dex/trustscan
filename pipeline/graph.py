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
    llm_results: dict[str, dict] = None,
) -> list[list[str]]:
    """
    Filter rings to only those corroborated by textual evidence.
    A ring is confirmed if at least half its members have either:
    - a near-duplicate review (is_ring_similar) OR
    - high LLM confidence (>= RING_LLM_CONFIDENCE_THRESHOLD)

    llm_results: optional dict of {review_id: {"confidence": float, "llm_flagged": bool}}
    """
    from pipeline.similarity import is_ring_similar

    confirmed = []
    for ring in rings:
        ring_df = df[df["user_id"].isin(ring)]
        corroborated = 0

        for _, row in ring_df.iterrows():
            text = str(row.get("review_text", ""))
            rid = str(row.get("review_id", ""))

            # Check LLM confidence first (cheaper if already computed)
            if llm_results and rid in llm_results:
                if llm_results[rid].get("confidence", 0) >= RING_LLM_CONFIDENCE_THRESHOLD:
                    corroborated += 1
                    continue

            # Fall back to tight similarity check
            try:
                if is_ring_similar(text, exclude_id=rid):
                    corroborated += 1
            except Exception:
                pass

        # Confirm if at least half the ring members are corroborated
        if corroborated >= max(1, len(ring) // 2):
            confirmed.append(ring)

    return confirmed
