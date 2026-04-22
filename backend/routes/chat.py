from fastapi import APIRouter
from pydantic import BaseModel
import duckdb
import os
from groq import Groq
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()
router = APIRouter()
DB_PATH = str(Path(__file__).parent.parent.parent / "data" / "trustscan.duckdb")
MODEL = "llama-3.3-70b-versatile"

SCHEMA = """
Tables:
- reviews(review_id VARCHAR, asin VARCHAR, user_id VARCHAR, review_text TEXT, rating FLOAT, verified_purchase BOOLEAN, reviewed_at TIMESTAMP)
- review_results(review_id VARCHAR, asin VARCHAR, user_id VARCHAR, rule_flagged BOOLEAN, similarity_flagged BOOLEAN, ring_flagged BOOLEAN, llm_flagged BOOLEAN, llm_explanation TEXT, reviewer_risk VARCHAR, trust_score FLOAT, processed_at TIMESTAMP)
- labeled_reviews(review_id INTEGER, category VARCHAR, rating FLOAT, label VARCHAR, review_text TEXT)
"""


class ChatRequest(BaseModel):
    question: str


@router.post("/")
def analyst_chat(req: ChatRequest):
    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    sql_prompt = f"""You are a DuckDB SQL expert. Convert the analyst's question into a valid DuckDB SQL query.

Database schema:
{SCHEMA}

Question: {req.question}

Return ONLY the SQL query, no explanation, no markdown fences.
"""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": sql_prompt}],
        temperature=0.1,
        max_tokens=300,
    )
    sql = response.choices[0].message.content.strip().strip("```sql").strip("```").strip()

    try:
        con = duckdb.connect(DB_PATH, read_only=True)
        result = con.execute(sql).df()
        con.close()
        return {
            "question": req.question,
            "sql": sql,
            "results": result.head(50).to_dict("records"),
            "row_count": len(result),
        }
    except Exception as e:
        return {"question": req.question, "sql": sql, "error": str(e), "results": []}
