// knapsack.js — persistent reviewer graph, grows with every scan
// Loaded alongside shared.js in every content script

const KS_KEY = "ts_knapsack";
const KS_MAX_REVIEWERS = 5000; // evict oldest when full
const MIN_SHARED_PRODUCTS = 2;  // within same brand to flag ring

// ── Read / Write ───────────────────────────────────────────────
async function ksGet() {
  const s = await chrome.storage.local.get(KS_KEY);
  return s[KS_KEY] || { reviewer_products: {}, product_brand: {}, product_reviewers: {} };
}
async function ksSave(ks) {
  await chrome.storage.local.set({ [KS_KEY]: ks });
}

// ── Add a scan's data to the knapsack ─────────────────────────
// reviewers: [{reviewer_id, review_id}]
// asin: current product
// brand: brand/seller string extracted from page
async function ksAddScan(asin, brand, reviewers) {
  const ks = await ksGet();

  // Store brand for this product
  if (brand) ks.product_brand[asin] = brand;

  // Merge reviewers (don't overwrite — crawl may add more than visible page)
  const existing = new Set(ks.product_reviewers[asin] || []);
  reviewers.forEach(r => existing.add(r.reviewer_id));
  ks.product_reviewers[asin] = [...existing];

  // For each reviewer, add this product to their history
  for (const { reviewer_id } of reviewers) {
    if (!ks.reviewer_products[reviewer_id]) {
      ks.reviewer_products[reviewer_id] = [];
    }
    if (!ks.reviewer_products[reviewer_id].includes(asin)) {
      ks.reviewer_products[reviewer_id].push(asin);
    }
  }

  // Evict oldest reviewers if over limit
  const ids = Object.keys(ks.reviewer_products);
  if (ids.length > KS_MAX_REVIEWERS) {
    const toEvict = ids.slice(0, ids.length - KS_MAX_REVIEWERS);
    toEvict.forEach(id => delete ks.reviewer_products[id]);
  }

  await ksSave(ks);
  return ks;
}

// ── Detect rings among reviewers on the current page ──────────
// Returns: { ringMembers: Set<reviewer_id>, evidence: Map<reviewer_id, {sharedWith, products}> }
async function ksDetectRings(currentAsin, brand, reviewerIds) {
  const ks = await ksGet();
  const ringMembers = new Set();
  const evidence = {};

  // Get all products from this brand we've seen before
  const brandProducts = brand
    ? Object.entries(ks.product_brand)
        .filter(([, b]) => b === brand)
        .map(([asin]) => asin)
    : [];

  // For each pair of reviewers on this page, check brand product overlap
  for (let i = 0; i < reviewerIds.length; i++) {
    for (let j = i + 1; j < reviewerIds.length; j++) {
      const a = reviewerIds[i];
      const b = reviewerIds[j];

      const productsA = new Set(ks.reviewer_products[a] || []);
      const productsB = new Set(ks.reviewer_products[b] || []);

      // Shared products that belong to same brand
      const sharedBrand = [...productsA].filter(p =>
        productsB.has(p) && p !== currentAsin &&
        (brandProducts.includes(p) || !brand)
      );

      if (sharedBrand.length >= MIN_SHARED_PRODUCTS) {
        ringMembers.add(a);
        ringMembers.add(b);

        if (!evidence[a]) evidence[a] = { sharedWith: [], products: [] };
        if (!evidence[b]) evidence[b] = { sharedWith: [], products: [] };

        evidence[a].sharedWith.push(b);
        evidence[a].products.push(...sharedBrand.filter(p => !evidence[a].products.includes(p)));
        evidence[b].sharedWith.push(a);
        evidence[b].products.push(...sharedBrand.filter(p => !evidence[b].products.includes(p)));
      }
    }
  }

  // Also flag solo reviewers who've reviewed many brand products (carpet bombers)
  for (const rid of reviewerIds) {
    const reviewed = (ks.reviewer_products[rid] || []).filter(p =>
      brandProducts.includes(p) && p !== currentAsin
    );
    if (reviewed.length >= 3) {
      ringMembers.add(rid);
      if (!evidence[rid]) evidence[rid] = { sharedWith: [], products: reviewed };
      else evidence[rid].products.push(...reviewed.filter(p => !evidence[rid].products.includes(p)));
    }
  }

  return { ringMembers, evidence };
}

// ── Expose stats (used by popup) ──────────────────────────────
async function ksStats() {
  const ks = await ksGet();
  return {
    reviewers_tracked: Object.keys(ks.reviewer_products).length,
    products_tracked: Object.keys(ks.product_brand).length,
  };
}
