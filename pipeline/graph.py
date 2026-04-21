import pandas as pd
import networkx as nx
from itertools import combinations


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


def get_ring_members(df: pd.DataFrame, min_shared_products: int = 3) -> set[str]:
    G = build_reviewer_graph(df)
    rings = detect_rings(G, min_shared_products)
    return {user for ring in rings for user in ring}
