---
title: TrustScan API
emoji: 🛡️
colorFrom: indigo
colorTo: violet
sdk: docker
pinned: false
---

# TrustScan API

AI-powered fake review detection backend. Processes 208K+ Amazon reviews through a 6-stage pipeline: rules → reviewer profiling → ML classifier → semantic similarity → ring detection → LLM judge.

## Endpoints

- `GET /health` — liveness check
- `GET /stats` — platform-wide stats
- `GET /product/{asin}` — reviews with trust scores (`?deep=true` for LLM)
- `GET /product/{asin}/summary` — aggregate trust metrics
- `GET /reviewer/{user_id}` — reviewer risk profile
- `GET /rings/` — detected reviewer rings (`?confirm=true` for corroboration)
- `POST /chat/` — natural language SQL analyst

## Stack

FastAPI · DuckDB · ChromaDB · BGE-small · Groq Llama 3.3 70B · NetworkX · scikit-learn
