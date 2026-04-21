import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

MODEL = "llama-3.3-70b-versatile"
CONFIDENCE_THRESHOLD = 0.6

_client = None


def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _client


def judge_review(
    review_text: str,
    rating: float,
    verified_purchase: bool,
    rule_reasons: str = "",
) -> dict:
    prompt = f"""You are an expert fake review detector for e-commerce products. Analyze the following review and determine if it is fake (computer-generated or incentivized) or genuine.

Review text: "{review_text}"
Star rating: {rating}/5
Verified purchase: {verified_purchase}
Prior rule flags: {rule_reasons if rule_reasons else "none"}

Think step by step:
1. Is the language generic, repetitive, or unnatural?
2. Does it contain specific product details or just vague praise/complaints?
3. Does the rating match the sentiment of the text?
4. Are there signs of AI generation (repetition, overly fluent, no specifics)?

Respond in this exact format:
VERDICT: FAKE or GENUINE
CONFIDENCE: 0.0 to 1.0
EXPLANATION: one clear sentence explaining the most important reason
"""
    try:
        response = get_client().chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=200,
        )
        text = response.choices[0].message.content.strip()
        return _parse_response(text)
    except Exception as e:
        return {"verdict": "unknown", "confidence": 0.0, "explanation": f"LLM error: {str(e)}", "llm_flagged": False}


def _parse_response(text: str) -> dict:
    lines = {line.split(":")[0].strip(): ":".join(line.split(":")[1:]).strip()
             for line in text.splitlines() if ":" in line}
    verdict = lines.get("VERDICT", "unknown").upper()
    try:
        confidence = float(lines.get("CONFIDENCE", "0.0"))
    except ValueError:
        confidence = 0.0
    explanation = lines.get("EXPLANATION", "")
    return {
        "verdict": verdict,
        "confidence": confidence,
        "explanation": explanation,
        "llm_flagged": verdict == "FAKE" and confidence >= CONFIDENCE_THRESHOLD,
    }
