# TrustScan

AI-powered fake review detection platform for Amazon product reviews. Runs a 6-stage pipeline — rule engine, ML classifier, semantic similarity, reviewer profiling, graph-based ring detection, and LLM judge — to assign a trust score to every review.

**Live demo:** [trustscan-mu.vercel.app](https://trustscan-mu.vercel.app)  
**API:** [xhydr1dex-trustscan-api.hf.space](https://xhydr1dex-trustscan-api.hf.space)

---

## What it does

Fake reviews cost consumers and honest sellers billions annually. TrustScan detects them through multiple complementary signals:

| Stage | Method | What it catches |
|-------|--------|----------------|
| 1 | Rule engine | Burst posting, unverified 5-star floods, duplicate text |
| 2 | ML classifier | TF-IDF + logistic regression trained on labeled fake/genuine reviews |
| 3 | Semantic similarity | BGE-small embeddings + ChromaDB to find near-duplicate reviews |
| 4 | Reviewer profiler | Groq Llama 3.3 70B analyses reviewer behaviour patterns |
| 5 | Ring detection | NetworkX graph — finds coordinated groups reviewing the same products |
| 6 | LLM judge | Groq Llama 3.3 70B gives a final verdict with explanation |

Each review gets a **trust score** (0–1). Scores below 0.7 are flagged.

---

## Dashboards

| View | Who | What |
|------|-----|------|
| **Platform Ops** | Admin | Global stats, ring network graph, flagged review counts |
| **Seller** | Merchant | Per-product trust score, flagged review breakdown |
| **Shopper** | Consumer | Check any product's review authenticity before buying |
| **Reviewer Profile** | Investigator | Look up any reviewer — risk level, reviewed products, signals |
| **Analyst** | Researcher | Natural language → SQL queries over the full dataset |

---

## Tech stack

**Backend**
- FastAPI — REST API
- DuckDB — embedded analytics database (6K demo reviews)
- ChromaDB — vector store for semantic similarity
- scikit-learn — TF-IDF + logistic regression classifier
- NetworkX — reviewer graph construction and ring detection
- Groq (Llama 3.3 70B) — LLM judge and reviewer profiler
- sentence-transformers (BGE-small-en) — review embeddings

**Frontend**
- Next.js 15 (App Router)
- Tailwind CSS
- Recharts / D3 — trust score visualisation and ring network graph

**Infrastructure**
- Hugging Face Spaces (Docker) — backend
- Vercel — frontend

---

## Project structure

```
trustscan/
├── backend/
│   ├── main.py              # FastAPI app + CORS
│   └── routes/
│       ├── product.py       # /product/{asin}
│       ├── reviewer.py      # /reviewer/{user_id}
│       ├── rings.py         # /rings/
│       └── chat.py          # /chat/ (NL→SQL)
├── pipeline/
│   ├── rules.py             # Rule engine
│   ├── classifier.py        # ML classifier (train + predict)
│   ├── similarity.py        # Embedding-based duplicate detection
│   ├── reviewer_profiler.py # Groq-powered reviewer analysis
│   ├── graph.py             # Ring detection via NetworkX
│   ├── llm_judge.py         # Groq LLM final verdict
│   ├── scorer.py            # Trust score formula
│   └── precompute.py        # One-time pipeline run on all reviews
├── scripts/
│   └── seed_demo.py         # Seeds 6K demo reviews into DuckDB
├── frontend/                # Next.js app
├── data/
│   └── fake_reviews_sample.csv   # 6K labeled reviews (CG=fake, OR=genuine)
├── Dockerfile
└── requirements-deploy.txt
```

---

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Liveness check |
| `GET` | `/stats` | Platform-wide totals and flag counts |
| `GET` | `/product/{asin}` | Reviews with trust scores (`?deep=true` runs LLM) |
| `GET` | `/product/{asin}/summary` | Aggregate trust metrics for a product |
| `GET` | `/reviewer/{user_id}` | Reviewer risk profile + reviewed products |
| `GET` | `/rings/` | Detected reviewer rings |
| `POST` | `/chat/` | `{"question": "..."}` → SQL + results |

---

## Running locally

```bash
# 1. Clone and install
git clone https://github.com/xHydr1dex/trustscan.git
cd trustscan
pip install -r requirements.txt

# 2. Set environment variables
echo "GROQ_API_KEY=your_key_here" > .env

# 3. Seed demo data and precompute
python -m scripts.seed_demo
python -m pipeline.precompute

# 4. Start the API
uvicorn backend.main:app --reload --port 8000

# 5. Start the frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`, API on `http://localhost:8000`.

---

## Dataset

Uses the [Fake Reviews Dataset](https://www.kaggle.com/datasets/mexwell/fake-reviews-dataset) — 208K Amazon reviews labeled as genuine (`OR`) or computer-generated fake (`CG`). The demo seeds 6K reviews with synthetic reviewer ring patterns for demonstration.

---

## How trust scores work

```
trust_score = 1.0
  - 0.30  if rule_flagged
  - 0.25  if similarity_flagged
  - 0.30  if ring_flagged
  - 0.20  if llm_flagged  (weighted by LLM confidence)
  floored at 0.05
```

Reviews scoring below **0.70** are considered suspicious.
