// Myntra content script — April 2025
(function () {
  const CONTAINER_SELECTORS = [
    "div.user-review-reviewTextWrapper", "div.detailed-reviews-userReviewWrapper",
    "div[class*='userReview']", "div[class*='review-wrapper']", "div.user-review-main",
  ];
  const TEXT_SELECTORS   = ["div.user-review-reviewTextWrapper p", "p.user-review-reviewText", "div[class*='reviewText']"];
  const RATING_SELECTORS = ["div.user-review-ratingBadge", "span[class*='ratingBadge']", "div[class*='ratingBadge']"];

  function trySelect(el, selectors) {
    for (const s of selectors) { const f = el.querySelector(s); if (f) return f; }
    return null;
  }

  function getReviews() {
    let containers = [];
    for (const sel of CONTAINER_SELECTORS) {
      containers = Array.from(document.querySelectorAll(sel));
      if (containers.length > 1) break;
    }
    if (containers.length === 0) {
      const section = document.querySelector("[class*='detailed-reviews'], [id*='review']");
      if (section) {
        containers = Array.from(section.querySelectorAll("div"))
          .filter(el => { const t = el.innerText?.trim(); return t?.length > 30 && t?.length < 1500; })
          .slice(0, 30);
      }
    }

    return containers.map((el, i) => {
      const textEl   = trySelect(el, TEXT_SELECTORS) || el;
      const ratingEl = trySelect(el, RATING_SELECTORS);
      const text = textEl?.innerText?.trim();
      if (!text || text.length < 15) return null;
      const rating = parseFloat(ratingEl?.innerText) || 3.0;

      // Myntra shows "Verified Purchase" label on certified buys
      const verified_purchase = !!el.querySelector("[class*='verified'], [class*='Verified']") ||
        /verified purchase/i.test(el.innerText);
      const has_media = !!el.querySelector("img[src*='assets'], img[src*='myntra'], video, [class*='reviewImg'], [class*='reviewImage']");

      return { review_id: `myn-${i}`, review_text: text.slice(0, 1200), rating, verified_purchase, has_media, el };
    }).filter(Boolean);
  }

  async function scan() {
    const reviews = getReviews();
    if (!reviews.length) {
      alert("TrustScan: No reviews found. Navigate to the Ratings & Reviews section.");
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

  const isProductPage = location.pathname.includes("/buy/") ||
    CONTAINER_SELECTORS.some(s => document.querySelectorAll(s).length > 0);
  if (isProductPage) showScanButton(scan);
})();
