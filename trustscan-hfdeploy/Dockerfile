FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc g++ && rm -rf /var/lib/apt/lists/*

COPY requirements-deploy.txt .
RUN pip install --no-cache-dir -r requirements-deploy.txt

# bust cache: 2024-04-24
COPY . .

EXPOSE 7860

CMD ["sh", "-c", "rm -f /app/data/trustscan.duckdb && python -m scripts.seed_demo && python -m pipeline.precompute && uvicorn backend.main:app --host 0.0.0.0 --port 7860"]
