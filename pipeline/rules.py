import pandas as pd

GENERIC_KEYWORDS = {"great", "nice", "awesome", "excellent", "good", "perfect", "love", "amazing", "best", "wonderful"}
GENERIC_THRESHOLD = 4
SHORT_THRESHOLD = 20
BURST_REVIEWS_PER_DAY = 3


def apply_rules(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["rule_flagged"] = False
    df["rule_reasons"] = ""

    # Rule 1: duplicate review text
    dup_mask = df.duplicated(subset=["review_text"], keep=False)
    df.loc[dup_mask, "rule_flagged"] = True
    df.loc[dup_mask, "rule_reasons"] += "duplicate_text;"

    # Rule 2: unverified purchase + 5-star rating
    unverified_mask = (~df["verified_purchase"]) & (df["rating"] >= 5.0)
    df.loc[unverified_mask, "rule_flagged"] = True
    df.loc[unverified_mask, "rule_reasons"] += "unverified_5star;"

    # Rule 3: very short review
    short_mask = df["review_text"].fillna("").str.len() < SHORT_THRESHOLD
    df.loc[short_mask, "rule_flagged"] = True
    df.loc[short_mask, "rule_reasons"] += "short_review;"

    # Rule 4: high generic keyword density
    def _generic_count(text: str) -> int:
        words = set(str(text).lower().split())
        return len(words & GENERIC_KEYWORDS)

    generic_mask = df["review_text"].fillna("").apply(_generic_count) >= GENERIC_THRESHOLD
    df.loc[generic_mask, "rule_flagged"] = True
    df.loc[generic_mask, "rule_reasons"] += "generic_keywords;"

    # Rule 5: burst posting — same user, 3+ reviews in one calendar day
    df["_date"] = pd.to_datetime(df["reviewed_at"]).dt.date
    burst_users = (
        df.groupby(["user_id", "_date"])
        .size()
        .reset_index(name="_count")
        .query("_count >= @BURST_REVIEWS_PER_DAY")
        [["user_id", "_date"]]
    )
    if not burst_users.empty:
        burst_keys = set(zip(burst_users["user_id"], burst_users["_date"]))
        burst_mask = df.apply(lambda r: (r["user_id"], r["_date"]) in burst_keys, axis=1)
        df.loc[burst_mask, "rule_flagged"] = True
        df.loc[burst_mask, "rule_reasons"] += "burst_posting;"

    df.drop(columns=["_date"], inplace=True)
    df["rule_reasons"] = df["rule_reasons"].str.rstrip(";")
    return df
