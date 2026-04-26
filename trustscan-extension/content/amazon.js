// Amazon (amazon.in / amazon.com) content script
(function () {
  const origin = location.origin;

  function getAsin() {
    const m = location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    return m ? m[1] : null;
  }

  function getBrand() {
    const el =
      document.querySelector('#bylineInfo, a#bylineInfo') ||
      document.querySelector('[data-hook="byline-info"]') ||
      document.querySelector('.po-brand .po-break-word');
    if (!el) return null;
    return el.innerText.trim().replace(/^visit the\s+/i, "").replace(/\s+store$/i, "").trim();
  }

  function getReviews() {
    const containers = Array.from(document.querySelectorAll('[data-hook="review"]'));
    return containers.map((el, i) => {
      const textEl =
        el.querySelector('[data-hook="review-body"] span:not(.cr-original-review-content)') ||
        el.querySelector('[data-hook="review-body"] span');
      const ratingEl =
        el.querySelector('[data-hook="review-star-rating"] .a-icon-alt') ||
        el.querySelector('[data-hook="cmps-review-star-rating"] .a-icon-alt');

      const text = textEl?.innerText?.trim();
      if (!text || text.length < 10) return null;

      const rating = parseFloat(ratingEl?.innerText ?? "") || 3.0;

      const verifiedEl = el.querySelector('[data-hook="avp-badge"], .a-size-mini.a-color-state');
      const verified_purchase = !!verifiedEl && /verified/i.test(verifiedEl.innerText);

      const has_media =
        !!el.querySelector('[data-hook="review-image-tile"], [data-hook="review-video-thumbnail-container"], video') ||
        !!el.querySelector('img[src*="review"], img[src*="media"]');

      const profileAnchor = el.querySelector('a.a-profile[href*="/gp/profile"], a[href*="/gp/profile"]');
      const profilePath   = profileAnchor?.getAttribute("href") || "";
      const reviewer_id =
        profilePath.match(/amzn1\.account\.[A-Za-z0-9]+/)?.[0] ||
        profilePath.match(/\/gp\/(?:profile|pdp\/profile)\/([A-Z0-9]{10,30})/)?.[1] ||
        `amz-reviewer-${i}`;

      return { review_id: el.id || `amz-${i}`, review_text: text.slice(0, 1200), rating, verified_purchase, has_media, reviewer_id, el };
    }).filter(Boolean);
  }

  async function scan() {
    const reviews = getReviews();
    if (!reviews.length) {
      alert("TrustScan: No reviews found on this page.");
      return [];
    }

    const asin  = getAsin();
    const brand = getBrand();

    // Add visible reviewers to knapsack
    if (asin) {
      await ksAddScan(asin, brand, reviews.map(r => ({ reviewer_id: r.reviewer_id })));
    }

    // AI analysis
    const payload = reviews.map(({ review_id, review_text, rating, verified_purchase, has_media, reviewer_id }) => ({
      review_id, review_text, rating, verified_purchase, has_media, reviewer_id,
    }));
    const results = await analyzeReviews(payload);
    console.log("[TrustScan] API results sample:", results[0]);
    const resultMap = Object.fromEntries(results.map(r => [r.review_id, r]));

    reviews.forEach(({ review_id, reviewer_id, el }) => {
      const result = resultMap[review_id];
      if (!result) return;
      result.reviewer_id = reviewer_id;
      injectBadge(el, result);
      const wrap = el.querySelector(".ts-badge-wrap");
      if (wrap && reviewer_id) wrap.dataset.reviewerId = reviewer_id;
    });

    // Ring detection on accumulated knapsack data
    if (asin) {
      const ks = await ksGet();
      const allReviewerIds = ks.product_reviewers[asin] || [];
      const { ringMembers, evidence } = await ksDetectRings(asin, brand, allReviewerIds);
      const fabText = document.getElementById("ts-fab-text");
      const fab     = document.getElementById("ts-fab");

      if (ringMembers.size > 0) {
        const connections = {};
        for (const [rid, ev] of Object.entries(evidence)) {
          connections[rid] = [{
            with: ev.sharedWith?.[0] || "unknown",
            shared_count: ev.products.length,
            shared: ev.products.slice(0, 3),
          }];
        }
        updateBadgesWithRings(ringMembers, connections);
        updateFabWithRingResult(ringMembers.size);
      } else {
        const stats = await ksStats();
        if (fab) fab.title = `TrustScan · Tracking ${stats.reviewers_tracked} reviewers across ${stats.products_tracked} brand products`;
        if (fabText && !fabText.textContent.includes("fake") && !fabText.textContent.includes("suspicious") && !fabText.textContent.includes("genuine")) {
          fabText.textContent = `✓ Done · ${stats.reviewers_tracked} reviewers tracked`;
        }
      }
    }

    return results;
  }

  if (document.querySelectorAll('[data-hook="review"]').length > 0) {
    showScanButton(scan);
  }
})();
