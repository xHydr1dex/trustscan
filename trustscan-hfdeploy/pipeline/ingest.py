import duckdb
import chromadb
import pandas as pd
from pathlib import Path
from sentence_transformers import SentenceTransformer

DB_PATH = Path(__file__).parent.parent / "data" / "trustscan.duckdb"
DATA_DIR = Path(__file__).parent.parent / "data"
CHROMA_PATH = str(DATA_DIR / "chroma_db")
EMBED_MODEL = "BAAI/bge-small-en-v1.5"
BATCH_SIZE = 512


def get_connection():
    return duckdb.connect(str(DB_PATH))


def get_chroma_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    return client.get_or_create_collection(
        name="reviews",
        metadata={"hnsw:space": "cosine"}
    )


def ingest_production_reviews():
    con = get_connection()
    csv_path = str(DATA_DIR / "df_final.csv")
    con.execute("""
        CREATE OR REPLACE TABLE reviews AS
        SELECT
            CAST(column0 AS VARCHAR) AS review_id,
            rating,
            asin,
            parent_asin,
            user_id,
            TRY_CAST(timestamp AS TIMESTAMP) AS reviewed_at,
            helpful_vote,
            verified_purchase,
            description AS review_text
        FROM read_csv_auto(?, ignore_errors=true)
    """, [csv_path])
    count = con.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
    print(f"Ingested {count:,} production reviews into DuckDB")
    con.close()


def ingest_labeled_reviews():
    con = get_connection()
    csv_path = str(DATA_DIR / "fake_reviews_labeled.csv")
    con.execute("""
        CREATE OR REPLACE TABLE labeled_reviews AS
        SELECT
            ROW_NUMBER() OVER () AS review_id,
            category,
            rating,
            label,
            text_ AS review_text
        FROM read_csv_auto(?, ignore_errors=true)
    """, [csv_path])
    count = con.execute("SELECT COUNT(*) FROM labeled_reviews").fetchone()[0]
    print(f"Ingested {count:,} labeled reviews into DuckDB")
    con.close()


def create_results_table():
    con = get_connection()
    con.execute("""
        CREATE TABLE IF NOT EXISTS review_results (
            review_id          VARCHAR PRIMARY KEY,
            asin               VARCHAR,
            user_id            VARCHAR,
            rule_flagged       BOOLEAN DEFAULT FALSE,
            similarity_flagged BOOLEAN DEFAULT FALSE,
            ring_flagged       BOOLEAN DEFAULT FALSE,
            llm_flagged        BOOLEAN DEFAULT FALSE,
            llm_explanation    TEXT,
            reviewer_risk      VARCHAR DEFAULT 'unknown',
            trust_score        FLOAT DEFAULT 1.0,
            processed_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    con.close()
    print("Created review_results table")


def generate_embeddings(batch_size: int = BATCH_SIZE):
    print(f"Loading embedding model: {EMBED_MODEL}")
    model = SentenceTransformer(EMBED_MODEL)

    con = get_connection()
    collection = get_chroma_collection()

    already_done = collection.count()
    print(f"ChromaDB already has {already_done:,} embeddings")

    total = con.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
    offset = already_done

    while offset < total:
        rows = con.execute(f"""
            SELECT review_id, review_text FROM reviews
            WHERE review_text IS NOT NULL
            LIMIT {batch_size} OFFSET {offset}
        """).fetchall()

        if not rows:
            break

        ids = [str(r[0]) for r in rows]
        texts = [str(r[1])[:512] for r in rows]

        embeddings = model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False
        ).tolist()

        collection.add(ids=ids, embeddings=embeddings, documents=texts)
        offset += len(rows)
        print(f"  Embedded {offset:,}/{total:,} reviews", end="\r")

    con.close()
    print(f"\nEmbedding complete. ChromaDB has {collection.count():,} vectors.")


if __name__ == "__main__":
    ingest_production_reviews()
    ingest_labeled_reviews()
    create_results_table()
    generate_embeddings()
    print("Full ingestion complete.")
