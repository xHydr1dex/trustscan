// Flipkart content script
(function () {
  const CONTAINER_SELECTORS = ["div._27M-vq", "div.EPCmJX", "div.col._2wzgFH", "div.css-g5y9jx"];
  const TEXT_SELECTORS      = ["div.t-ZTKy", "div._6K-7Co", "p.z9E0IG", "div.css-146c3p1"];
  const RATING_SELECTORS    = ["div._3LWZlK", "span._1lRcqv"];

  function trySelect(el, selectors) {
    for (const s of selectors) { const f = el.querySelector(s); if (f) return f; }
    return null;
  }

  // ── Product info from URL (works on both product page and review page) ───
  function getProductInfo() {
    // Review page: /slug/product-reviews/itmXXX?pid=...
    const reviewMatch = location.pathname.match(/^(.*?)\/product-reviews\/(itm[a-z0-9]+)/i);
    if (reviewMatch) {
      const slug   = reviewMatch[1];
      const itemId = reviewMatch[2];
      const pid    = new URLSearchParams(location.search).get("pid") || "";
      return { itemId, pid, slug };
    }
    // Product page: /slug/p/itmXXX?pid=...
    const productMatch = location.pathname.match(/^(.*?)\/p\/(itm[a-z0-9]+)/i);
    if (productMatch) {
      const slug   = productMatch[1];
      const itemId = productMatch[2];
      const pid    = new URLSearchParams(location.search).get("pid") || "";
      return { itemId, pid, slug };
    }
    return null;
  }

  // ── Brand extraction ──────────────────────────────────────
  function getBrand() {
    // "Brand: X" in spec table
    const rows = document.querySelectorAll("tr, ._1UhVsV, .RmoJze, ._3Rrcbo");
    for (const row of rows) {
      const m = row.innerText?.match(/^Brand\s*[:\|]\s*(.+)$/im);
      if (m) return m[1].trim().split("\n")[0];
    }
    // "Sold by" seller link
    const sellerEl = document.querySelector("._1RWhB8 a, #sellerName, [class*='sellerN']");
    if (sellerEl) return sellerEl.innerText.trim();
    return null;
  }

  // ── Reviewer name from a review element ───────────────────
  function getReviewerName(el) {
    // Find the "Verified Purchase" or "Certified Buyer" node, then look for name nearby
    const allNodes = Array.from(el.querySelectorAll("div, span, p"));
    for (const node of allNodes) {
      if (node.children.length > 0) continue;
      const t = node.innerText?.trim();
      if (!/verified purchase|certified buyer/i.test(t)) continue;

      // Name is usually in a sibling or nearby leaf node before this one
      const parent = node.parentElement;
      if (!parent) continue;
      const siblings = Array.from(parent.querySelectorAll("div, span, p"))
        .filter(s => s.children.length === 0);
      for (const sib of siblings) {
        const st = sib.innerText?.trim();
        if (st && st.length > 1 && st.length < 60 &&
            !/verified|purchase|certified|buyer|helpful|review for|sep|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|\d{4}|\d+\s*★/i.test(st) &&
            !/^[\d.,•]+$/.test(st)) {
          return st;
        }
      }
    }

    // Fallback: look for name before ", CityName" pattern in text
    const txt = el.innerText || "";
    const m = txt.match(/\n([A-Za-z][A-Za-z\s]{1,40})\n,\s*[A-Za-z]/);
    if (m) return m[1].trim();

    return null;
  }

  function nameToId(name) {
    return "fk-" + name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  }

  // ── Extract reviewer IDs from all reviews currently in DOM ─
  function extractReviewerIdsFromDom() {
    const ids = [];
    for (const sel of CONTAINER_SELECTORS) {
      const els = document.querySelectorAll(sel);
      if (els.length > 1) {
        els.forEach(el => {
          const name = getReviewerName(el);
          if (name) ids.push(nameToId(name));
        });
        break;
      }
    }
    return ids;
  }

  // ── Main review extraction ────────────────────────────────
  function getReviews() {
    let containers = [];

    // Try old-style class selectors first
    for (const sel of ["div._27M-vq", "div.EPCmJX", "div.col._2wzgFH"]) {
      containers = Array.from(document.querySelectorAll(sel));
      if (containers.length > 1) break;
    }

    // React Native Web style: find css-g5y9jx divs that are individual reviews
    // (contain "Verified Purchase" or a rating, short enough to be one review)
    if (containers.length === 0) {
      containers = Array.from(document.querySelectorAll("div.css-g5y9jx"))
        .filter(el => {
          const txt = el.innerText?.trim();
          return (/verified purchase/i.test(txt) || /certified buyer/i.test(txt)) &&
                 txt.length > 80 && txt.length < 3000;
        });
    }

    // Final fallback: any div containing "Verified Purchase" with review-length text
    if (containers.length === 0) {
      containers = Array.from(document.querySelectorAll("div"))
        .filter(el => {
          const txt = el.innerText?.trim();
          return (/verified purchase/i.test(txt) || /certified buyer/i.test(txt)) &&
                 txt.length > 80 && txt.length < 3000 && el.children.length >= 2;
        });
    }

    // Deduplicate — keep innermost containers (remove any that contain another)
    containers = containers.filter(el =>
      !containers.some(other => other !== el && el.contains(other))
    );

    return containers.map((el, i) => {
      const txt = el.innerText?.trim();
      if (!txt || txt.length < 20) return null;

      // Extract rating — first standalone number like "4.0" or "5"
      const ratingMatch = txt.match(/^(\d(?:\.\d)?)\s*[•\n]/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 3.0;

      // Review text — longest line that isn't metadata
      const lines = txt.split("\n").map(l => l.trim()).filter(l =>
        l.length > 30 &&
        !/^(\d\.?\d?\s*[•]|Review for:|Verified Purchase|Certified Buyer|Helpful for|READ MORE)/i.test(l)
      );
      const reviewText = lines[0] || txt.slice(0, 1200);
      if (!reviewText || reviewText.length < 15) return null;

      const verified_purchase = /verified purchase/i.test(txt) || /certified buyer/i.test(txt);
      const has_media = !!el.querySelector("img[src*='rukminim'], img[src*='fkimg'], video");

      const name = getReviewerName(el);
      const reviewer_id = name ? nameToId(name) : `fk-reviewer-${i}`;

      return { review_id: `fk-${i}`, review_text: reviewText.slice(0, 1200), rating, verified_purchase, has_media, reviewer_id, el };
    }).filter(Boolean);
  }

  // ── Related product PIDs from page ────────────────────────
  function getRelatedItemIds(currentItemId) {
    const ids = new Set();
    const itemRe = /(itm[a-z0-9]+)/i;
    document.querySelectorAll("a[href*='/p/itm']").forEach(a => {
      const m = (a.getAttribute("href") || "").match(itemRe);
      if (m && m[1].toLowerCase() !== currentItemId.toLowerCase()) ids.add(m[1]);
    });
    return [...ids].slice(0, 4);
  }

  // ── Wait for reviews to appear in DOM (JS-rendered) ──────
  async function waitForReviews(timeout = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const r = getReviews();
      if (r.length > 0) return r;
      await new Promise(res => setTimeout(res, 400));
    }
    return [];
  }

  // ── Main scan ─────────────────────────────────────────────
  async function scan() {
    const reviews = await waitForReviews();
    if (!reviews.length) {
      alert("TrustScan: No reviews found. Make sure the review page has fully loaded.");
      return [];
    }

    const info  = getProductInfo();
    const brand = getBrand();

    // Stage 1: add visible reviewers to knapsack
    if (info) {
      await ksAddScan(info.itemId, brand, reviews.map(r => ({ reviewer_id: r.reviewer_id })));
    }

    // Stage 2: AI analysis
    const payload = reviews.map(({ review_id, review_text, rating, verified_purchase, has_media, reviewer_id }) => ({
      review_id, review_text, rating, verified_purchase, has_media, reviewer_id,
    }));
    const results = await analyzeReviews(payload);
    const map = Object.fromEntries(results.map(r => [r.review_id, r]));
    reviews.forEach(({ review_id, reviewer_id, el }) => {
      const result = map[review_id];
      if (!result) return;
      result.reviewer_id = reviewer_id;
      injectBadge(el, result);
      const wrap = el.querySelector(".ts-badge-wrap");
      if (wrap) wrap.dataset.reviewerId = reviewer_id;
    });

    // Stage 3: kick off background crawl (opens review page tabs)
    if (info) {
      const relatedItemIds = getRelatedItemIds(info.itemId);
      const reviewUrlBase  = `${location.origin}${info.slug}/product-reviews/${info.itemId}?pid=${info.pid}&marketplace=FLIPKART&page=`;
      document.getElementById("ts-fab-text").textContent =
        `Crawling all reviews… (0/${1 + relatedItemIds.length} products)`;

      chrome.runtime.sendMessage({
        type: "CRAWL_PRODUCT",
        payload: {
          asin: info.itemId,
          brand,
          relatedAsins: relatedItemIds,
          origin: location.origin,
          reviewUrlBase,
        },
      }, (res) => {
        if (chrome.runtime.lastError) console.warn("[TrustScan]", chrome.runtime.lastError.message);
      });
    }

    return results;
  }

  // Flipkart reviews live on the /product-reviews/ page, not the product page
  const isReviewPage = location.pathname.includes("/product-reviews/");

  if (isReviewPage) {
    // Always show scan button on review pages — reviews are here
    showScanButton(scan);

    // Also signal background if this tab was opened by our crawl
    const info = getProductInfo();
    if (info) {
      const ids = extractReviewerIdsFromDom();
      ksAddScan(info.itemId, null, ids.map(rid => ({ reviewer_id: rid }))).then(() => {
        chrome.runtime.sendMessage({
          type: "REVIEW_PAGE_DONE",
          payload: { asin: info.itemId, count: ids.length },
        }).catch(() => {});
      });
    }
  }
})();
