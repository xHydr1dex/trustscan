// Meesho content script — April 2025
(function () {
  const CONTAINER_SELECTORS = [
    "div[class*='ReviewCard']", "div[class*='review-card']",
    "div[class*='UserReview']", "section[class*='review']",
  ];
  const TEXT_SELECTORS   = ["p[class*='review']", "p[class*='Text']", "div[class*='reviewText']"];
  const RATING_SELECTORS = ["div[aria-label*='star']", "span[aria-label*='star']", "div[class*='Rating']"];

  function trySelect(el, selectors) {
    for (const s of selectors) { const f = el.querySelector(s); if (f) return f; }
    return null;
  }

  function extractRating(el) {
    const ratingEl = trySelect(el, RATING_SELECTORS);
    if (!ratingEl) return 3.0;
    const fromAria = parseFloat(ratingEl.getAttribute("aria-label") ?? "");
    return isNaN(fromAria) ? parseFloat(ratingEl.innerText) || 3.0 : fromAria;
  }

  function getReviews() {
    let containers = [];
    for (const sel of CONTAINER_SELECTORS) {
      containers = Array.from(document.querySelectorAll(sel));
      if (containers.length > 1) break;
    }
    if (containers.length === 0) {
      const section = document.querySelector("[class*='Rating'], [class*='Review']");
      const parent = section || document.body;
      containers = Array.from(parent.querySelectorAll("div"))
        .filter(el => {
          const txt = el.innerText?.trim();
          return txt?.length > 40 && txt?.length < 1500 && el.children.length >= 1
            && el.closest("[class*='review'], [class*='Review'], [class*='rating']");
        }).slice(0, 30);
    }

    return containers.map((el, i) => {
      const textEl = trySelect(el, TEXT_SELECTORS) || el;
      const text = textEl?.innerText?.trim();
      if (!text || text.length < 20) return null;
      const rating = extractRating(el);

      const verified_purchase = /verified|confirmed/i.test(el.innerText);
      const has_media = !!el.querySelector("img, video, [class*='image'], [class*='Image']");

      return { review_id: `ms-${i}`, review_text: text.slice(0, 1200), rating, verified_purchase, has_media, el };
    }).filter(Boolean);
  }

  async function waitForReviews(timeout = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const r = getReviews();
      if (r.length > 0) return r;
      await new Promise(res => setTimeout(res, 400));
    }
    return [];
  }

  async function scan() {
    const reviews = await waitForReviews();
    if (!reviews.length) {
      alert("TrustScan: No reviews found. Scroll to the Reviews section first.");
      return [];
    }
    const payload = reviews.map(({ review_id, review_text, rating, verified_purchase, has_media }) => ({
      review_id, review_text, rating, verified_purchase, has_media,
    }));
    const results = await analyzeReviews(payload);
    const map = Object.fromEntries(results.map(r => [r.review_id, r]));
    reviews.forEach(({ review_id, el }) => { if (map[review_id]) injectBadge(el, map[review_id]); });
    return results;
  }

  const isProductPage = /\/(p|product|catalogue)\//.test(location.pathname) ||
    CONTAINER_SELECTORS.some(s => document.querySelectorAll(s).length > 0);
  if (isProductPage) showScanButton(scan);
})();
