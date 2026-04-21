from functools import lru_cache
from pathlib import Path
import chromadb
from sentence_transformers import SentenceTransformer

CHROMA_PATH = str(Path(__file__).parent.parent / "data" / "chroma_db")
EMBED_MODEL = "BAAI/bge-small-en-v1.5"
SIMILARITY_THRESHOLD = 0.15
TOP_K = 10


@lru_cache(maxsize=1)
def get_embed_model():
    return SentenceTransformer(EMBED_MODEL)


@lru_cache(maxsize=1)
def get_chroma_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    return client.get_collection("reviews")


def find_similar_reviews(review_text: str, exclude_id: str = None) -> list[str]:
    model = get_embed_model()
    raw = model.encode(
        [review_text[:512]],
        normalize_embeddings=True
    )
    embedding = raw.tolist() if hasattr(raw, "tolist") else raw

    results = get_chroma_collection().query(
        query_embeddings=embedding,
        n_results=TOP_K + 1
    )

    similar_ids = []
    for rid, dist in zip(results["ids"][0], results["distances"][0]):
        if rid == exclude_id:
            continue
        if dist <= SIMILARITY_THRESHOLD:
            similar_ids.append(rid)

    return similar_ids


def flag_similar_in_batch(review_ids: list[str], review_texts: list[str]) -> dict[str, bool]:
    flagged = {}
    for rid, text in zip(review_ids, review_texts):
        similar = find_similar_reviews(text, exclude_id=rid)
        flagged[rid] = len(similar) > 0
    return flagged
