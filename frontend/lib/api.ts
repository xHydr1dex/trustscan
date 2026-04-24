const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://xhydr1dex-trustscan-api.hf.space";

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

export async function getStats() {
  return fetchJson(`${BASE_URL}/stats`);
}

export async function getProductReviews(asin: string, limit = 50, deep = false) {
  return fetchJson(`${BASE_URL}/product/${asin}?limit=${limit}&deep=${deep}`);
}

export async function getProductSummary(asin: string) {
  return fetchJson(`${BASE_URL}/product/${asin}/summary`);
}

export async function listReviewers(params: { risk?: string; ring?: boolean; sort?: string } = {}) {
  const q = new URLSearchParams();
  if (params.risk) q.set("risk", params.risk);
  if (params.ring !== undefined) q.set("ring", String(params.ring));
  if (params.sort) q.set("sort", params.sort);
  return fetchJson(`${BASE_URL}/reviewers/?${q}`);
}

export async function getReviewerProfile(userId: string) {
  return fetchJson(`${BASE_URL}/reviewer/${userId}`);
}

export async function getRings(confirm = false) {
  return fetchJson(`${BASE_URL}/rings/?confirm=${confirm}`);
}

export async function getProducts(category?: string) {
  const url = category
    ? `${BASE_URL}/products/?category=${encodeURIComponent(category)}`
    : `${BASE_URL}/products/`;
  return fetchJson(url);
}

export async function getCategories() {
  return fetchJson(`${BASE_URL}/products/categories`);
}

export async function getOverviewStats() {
  return fetchJson(`${BASE_URL}/overview/stats`);
}

export async function getOverviewTimeline() {
  return fetchJson(`${BASE_URL}/overview/timeline`);
}

export async function getOverviewTopRisks() {
  return fetchJson(`${BASE_URL}/overview/top-risks`);
}

export async function getOverviewAlerts(limit = 8) {
  return fetchJson(`${BASE_URL}/overview/alerts?limit=${limit}`);
}

export async function sendChatMessage(question: string) {
  return fetchJson(`${BASE_URL}/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
}
