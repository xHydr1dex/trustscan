const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getStats() {
  const res = await fetch(`${BASE_URL}/stats`);
  return res.json();
}

export async function getProductReviews(asin: string, limit = 50, deep = false) {
  const res = await fetch(`${BASE_URL}/product/${asin}?limit=${limit}&deep=${deep}`);
  if (!res.ok) throw new Error("Product not found");
  return res.json();
}

export async function getProductSummary(asin: string) {
  const res = await fetch(`${BASE_URL}/product/${asin}/summary`);
  if (!res.ok) throw new Error("Product not found");
  return res.json();
}

export async function getReviewerProfile(userId: string) {
  const res = await fetch(`${BASE_URL}/reviewer/${userId}`);
  if (!res.ok) throw new Error("Reviewer not found");
  return res.json();
}

export async function getRings(confirm = false) {
  const res = await fetch(`${BASE_URL}/rings/?confirm=${confirm}`);
  return res.json();
}

export async function getProducts(category?: string) {
  const url = category ? `${BASE_URL}/products/?category=${encodeURIComponent(category)}` : `${BASE_URL}/products/`;
  const res = await fetch(url);
  return res.json();
}

export async function getCategories() {
  const res = await fetch(`${BASE_URL}/products/categories`);
  return res.json();
}

export async function sendChatMessage(question: string) {
  const res = await fetch(`${BASE_URL}/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return res.json();
}
