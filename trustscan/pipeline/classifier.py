import duckdb
import joblib
import numpy as np
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split
import pandas as pd

DB_PATH = str(Path(__file__).parent.parent / "data" / "trustscan.duckdb")
MODEL_PATH = str(Path(__file__).parent.parent / "data" / "classifier.joblib")
FAKE_PROBABILITY_THRESHOLD = 0.6


def train_classifier() -> dict:
    """Train on labeled_reviews, save model, return metrics."""
    con = duckdb.connect(DB_PATH, read_only=True)
    df = con.execute("SELECT review_text, rating, label FROM labeled_reviews").df()
    con.close()

    df["text"] = df["review_text"].fillna("").astype(str)
    df["rating"] = df["rating"].fillna(3.0).astype(float)
    df["text_len"] = df["text"].str.len()
    df["label_bin"] = (df["label"] == "CG").astype(int)

    X_text = df["text"]
    X_meta = df[["rating", "text_len"]].values
    y = df["label_bin"].values

    X_train_text, X_test_text, X_train_meta, X_test_meta, y_train, y_test = train_test_split(
        X_text, X_meta, y, test_size=0.2, random_state=42, stratify=y
    )

    # TF-IDF on text + meta features combined
    from scipy.sparse import hstack, csr_matrix

    tfidf = TfidfVectorizer(max_features=10000, ngram_range=(1, 2), sublinear_tf=True)
    X_train_tfidf = tfidf.fit_transform(X_train_text)
    X_test_tfidf = tfidf.transform(X_test_text)

    scaler = StandardScaler()
    X_train_meta_scaled = scaler.fit_transform(X_train_meta)
    X_test_meta_scaled = scaler.transform(X_test_meta)

    X_train_combined = hstack([X_train_tfidf, csr_matrix(X_train_meta_scaled)])
    X_test_combined = hstack([X_test_tfidf, csr_matrix(X_test_meta_scaled)])

    clf = LogisticRegression(max_iter=1000, C=1.0, random_state=42)
    clf.fit(X_train_combined, y_train)

    y_pred = clf.predict(X_test_combined)
    metrics = {
        "precision": round(precision_score(y_test, y_pred), 3),
        "recall": round(recall_score(y_test, y_pred), 3),
        "f1": round(f1_score(y_test, y_pred), 3),
    }

    joblib.dump({"tfidf": tfidf, "scaler": scaler, "clf": clf}, MODEL_PATH)
    print(f"Classifier trained. Metrics: {metrics}")
    print(f"Model saved to {MODEL_PATH}")
    return metrics


def load_classifier():
    return joblib.load(MODEL_PATH)


def predict_fake_probability(review_texts: list[str], ratings: list[float]) -> list[float]:
    """Return fake probability (0-1) for each review."""
    from scipy.sparse import hstack, csr_matrix
    model = load_classifier()
    tfidf = model["tfidf"]
    scaler = model["scaler"]
    clf = model["clf"]

    texts = [str(t) for t in review_texts]
    meta = np.array([[r, len(t)] for r, t in zip(ratings, texts)], dtype=float)

    X_tfidf = tfidf.transform(texts)
    X_meta_scaled = scaler.transform(meta)
    X_combined = hstack([X_tfidf, csr_matrix(X_meta_scaled)])

    return clf.predict_proba(X_combined)[:, 1].tolist()


if __name__ == "__main__":
    train_classifier()
