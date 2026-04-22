import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

MODEL = "llama-3.3-70b-versatile"

_client = None


def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _client


def profile_reviewer(user_id: str, reviews: list[dict]) -> dict:
    if len(reviews) < 2:
        return {
            "user_id": user_id,
            "risk_level": "unknown",
            "summary": "Insufficient review history to profile.",
            "patterns": [],
        }

    reviews_text = "\n".join([
        f"- [{r['rating']}★, verified={r['verified_purchase']}] {str(r['review_text'])[:150]}"
        for r in reviews[:20]
    ])

    prompt = f"""You are analyzing a reviewer's history to detect fake review behavior patterns.

Reviewer ID: {user_id}
Total reviews: {len(reviews)}

Review history (most recent 20):
{reviews_text}

Analyze for these patterns:
1. Rating distribution — are all or nearly all reviews 5-star?
2. Language variety — do reviews sound copy-pasted or use same phrases?
3. Specificity — do reviews mention specific product details or just generic praise?
4. Verified purchase ratio — what fraction are verified purchases?

Respond in this exact format:
RISK_LEVEL: low, medium, or high
SUMMARY: one sentence summarizing the reviewer's behavior
PATTERNS: comma-separated list of detected patterns (e.g. all_5star, generic_language, low_verified_ratio) or "none"
"""
    try:
        response = get_client().chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=200,
        )
        text = response.choices[0].message.content.strip()
        return _parse_profile(user_id, text)
    except Exception as e:
        return {
            "user_id": user_id,
            "risk_level": "unknown",
            "summary": f"Profiling error: {str(e)}",
            "patterns": [],
        }


def _parse_profile(user_id: str, text: str) -> dict:
    lines = {line.split(":")[0].strip(): ":".join(line.split(":")[1:]).strip()
             for line in text.splitlines() if ":" in line}
    risk = lines.get("RISK_LEVEL", "unknown").lower()
    summary = lines.get("SUMMARY", "")
    patterns_raw = lines.get("PATTERNS", "none")
    patterns = [] if patterns_raw == "none" else [p.strip() for p in patterns_raw.split(",")]
    return {
        "user_id": user_id,
        "risk_level": risk,
        "summary": summary,
        "patterns": patterns,
    }
