# TrustScan — Fake Review Detector

TrustScan is an AI-powered fake review detection system built for Indian e-commerce platforms. It combines rule-based heuristics, ML classification, semantic similarity, LLM analysis, and graph-based ring detection to score each review's trustworthiness — and catches coordinated reviewer rings across products.

> **Disclaimer:** TrustScan scores are probabilistic estimates, not verdicts. A low score means the review exhibits patterns commonly associated with fake reviews based on our models and heuristics. It does not definitively prove a review is fake. A high score does not guarantee a review is genuine. Use these signals alongside your own judgment.

---

## What's in this repo

```
trustscan/
├── trustscan-extension/          # Chrome extension (MV3)
│   ├── manifest.json
│   ├── background.js             # Service worker
│   ├── content/
│   │   ├── amazon.js             # Amazon scraper + ring detection
│   │   ├── flipkart.js           # Flipkart review page scraper
│   │   ├── myntra.js             # Myntra scraper
│   │   ├── meesho.js             # Meesho scraper (partial)
│   │   ├── knapsack.js           # Local reviewer graph (ring detection)
│   │   ├── shared.js             # analyzeReviews(), badge injection
│   │   └── badge.css             # Badge styles
│   └── popup/
│       ├── popup.html
│       └── popup.js
│
├── trustscan-hfdeploy/           # Production backend (HuggingFace Spaces)
│   ├── backend/
│   │   ├── main.py               # FastAPI app entry
│   │   └── routes/
│   │       ├── analyze.py        # POST /analyze — live review scoring
│   │       ├── ring_check.py     # POST /ring-check — ring membership
│   │       ├── overview.py       # GET /stats
│   │       ├── product.py        # GET /product/{asin}
│   │       ├── reviewer.py       # GET /reviewer/{user_id}
│   │       └── rings.py          # GET /rings/
│   ├── pipeline/
│   │   ├── scorer.py             # Trust score computation
│   │   ├── rules.py              # Rule engine
│   │   ├── similarity.py         # Semantic duplicate detection
│   │   ├── llm_judge.py          # Groq LLaMA 3 judge
│   │   ├── classifier.py         # Random Forest classifier
│   │   ├── graph.py              # NetworkX ring detection
│   │   └── precompute.py         # Offline batch pipeline
│   ├── frontend/                 # Next.js dashboard (Vercel)
│   └── Dockerfile
│
└── README.md
```

---

## How scores work

Each review passes through a 6-stage pipeline:

| Stage | Signal | What it detects |
|---|---|---|
| 1 | **Rule engine** | Unverified 5-star, suspiciously short text, all-caps, excessive punctuation |
| 2 | **ML classifier** | Random Forest trained on labeled fake review datasets — outputs fake probability 0–1 |
| 3 | **Semantic similarity** | Near-duplicate reviews across the same product using BGE embeddings |
| 4 | **LLM judge** | Groq-powered LLaMA 3.3 70B analysis of review authenticity and language patterns |
| 5 | **Reviewer profiler** | Historical reviewer behavior — burst posting, single-product accounts, rating bias |
| 6 | **Ring detection** | Graph analysis to find coordinated reviewer networks across products |

**Verified purchase** and **media (photos/video)** boost the trust score.

**Trust score** = weighted combination of all signals → 0–100

| Score | Label | Badge |
|---|---|---|
| 0–49 | Likely Fake | Red |
| 50–69 | Suspicious | Amber |
| 70–100 | Looks Genuine | Green |

---

## Chrome Extension

### Supported platforms

| Platform | Status |
|---|---|
| Amazon (.in / .com) | Fully supported |
| Myntra | Fully supported |
| Flipkart | Supported — open the review listing page |
| Meesho | Partial |

### Installation

1. Clone this repo or download the `trustscan-extension/` folder
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `trustscan-extension/` folder
6. The TrustScan shield icon appears in your toolbar

### How to use

**Amazon**
1. Navigate to any product page with customer reviews
2. Click **🛡 Scan Reviews** (bottom right)
3. Wait for AI analysis — each review gets a badge with its trust score
4. Badge shows: score/100, ML fake probability, flags (rule / duplicate / AI / ✓ verified / 📷 media)
5. If ring members are found, badges update with a **⚠ ring** tag and ring stats

**Myntra**
1. Open any product page and scroll to the reviews section
2. Click **🛡 Scan Reviews**

**Flipkart**
1. Open a product page → click **All Reviews**
2. On the review listing page (`/product-reviews/…`), click **🛡 Scan Reviews**

### Ring detection

The extension maintains a local knapsack (stored in your browser's `chrome.storage.local`) that maps reviewers to products they've reviewed. As you scan multiple products from the same brand across sessions, the knapsack accumulates:

- A reviewer who appears across 3+ products from the same brand → flagged as **carpet bomber**
- Two reviewers who share 2+ brand products → flagged as **ring pair**

The more products you scan from the same brand, the more accurate ring detection becomes. Ring tags appear directly on the badges after each scan.

---

## Dashboard

Live at: **https://xhydr1dex.vercel.app**

Aggregated analysis from the pre-loaded dataset (208K+ Amazon reviews):

- Fake review trends over time
- Platform and category breakdown
- Reviewer risk profiles
- Ring network visualisation
- Review explorer with trust score filters

---

## Backend API

Live at: **https://xhydr1dex-trustscan-api.hf.space**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `GET` | `/stats` | Platform-wide aggregate stats |
| `GET` | `/product/{asin}` | Reviews with trust scores (`?deep=true` for LLM) |
| `GET` | `/product/{asin}/summary` | Aggregate trust metrics for a product |
| `GET` | `/reviewer/{user_id}` | Reviewer risk profile |
| `GET` | `/rings/` | Detected reviewer rings (`?confirm=true` for LLM corroboration) |
| `POST` | `/analyze` | Analyze a list of reviews, returns trust scores and flags |
| `POST` | `/ring-check` | Check a set of reviewer IDs for ring membership |
| `POST` | `/chat/` | Natural language SQL analyst |

---

## Tech stack

| Layer | Technologies |
|---|---|
| Extension | Vanilla JS, Chrome MV3 |
| Backend | FastAPI, scikit-learn, NetworkX, ChromaDB, DuckDB |
| Embeddings | BGE-small-en (sentence-transformers) |
| LLM | Groq — LLaMA 3.3 70B |
| Dashboard | Next.js 15, Tailwind CSS, Recharts |
| Hosting | HuggingFace Spaces (API), Vercel (dashboard) |

---

## Local setup

### Backend

```bash
cd trustscan-hfdeploy
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Requires a `.env` file with:
```
GROQ_API_KEY=your_key_here
```

### Frontend

```bash
cd trustscan-hfdeploy/frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` to point at your backend.

---

## Dataset

Pre-loaded dataset: 208K+ Amazon product reviews (multi-category) with fake/genuine labels.  
Large data files (`.db`, `.pkl`, `.csv`) are excluded from this repo via `.gitignore`.
