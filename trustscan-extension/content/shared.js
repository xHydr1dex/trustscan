// shared.js — loaded before every platform script
const TS_API = "https://xhydr1dex-trustscan-api.hf.space";

// Listen for messages from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "TRIGGER_SCAN") {
    const fab = document.getElementById("ts-fab");
    if (fab && !fab.disabled) fab.click();
  }
});

async function analyzeReviews(reviews) {
  const res = await fetch(`${TS_API}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reviews),
  });
  if (!res.ok) throw new Error(`TrustScan API error ${res.status}`);
  return res.json();
}

function trustLabel(score) {
  if (score < 0.5) return "Likely Fake";
  if (score < 0.7) return "Suspicious";
  return "Looks Genuine";
}
function trustLevel(score) {
  if (score < 0.5) return "bad";
  if (score < 0.7) return "warn";
  return "good";
}

function injectBadge(containerEl, result) {
  const existing = containerEl.querySelector(".ts-badge-wrap");
  if (existing) existing.remove();

  const score = Math.round((result.trust_score ?? 1) * 100);
  const ml    = Math.round((result.ml_fake_prob ?? 0) * 100);
  const level = trustLevel(result.trust_score ?? 1);

  const flags = [];
  if (result.rule_flagged)       flags.push({ label: "rule",       cls: "ts-flag-bad"  });
  if (result.similarity_flagged) flags.push({ label: "duplicate",  cls: "ts-flag-bad"  });
  if (result.llm_flagged)        flags.push({ label: "AI",         cls: "ts-flag-bad"  });
  if (result.verified_purchase)  flags.push({ label: "✓ verified", cls: "ts-flag-good" });
  if (result.has_media)          flags.push({ label: "📷 media",   cls: "ts-flag-good" });

  const wrap = document.createElement("div");
  wrap.className = "ts-badge-wrap";
  // Store reviewer id for ring updates
  if (result.reviewer_id) wrap.dataset.reviewerId = result.reviewer_id;

  const badge = document.createElement("div");
  badge.className = `ts-badge ts-${level}`;
  badge.innerHTML = `
    <span class="ts-shield">🛡</span>
    <span class="ts-score">${score}<span class="ts-max">/100</span></span>
    <span class="ts-lbl">${trustLabel(result.trust_score ?? 1)}</span>
    <span class="ts-ml">ML ${ml}%</span>
    ${flags.map(f => `<span class="ts-flag ${f.cls}">${f.label}</span>`).join("")}
  `;
  wrap.appendChild(badge);

  if (result.llm_explanation) {
    const exp = document.createElement("div");
    exp.className = "ts-explanation";
    exp.textContent = `AI: ${result.llm_explanation}`;
    wrap.appendChild(exp);
  }

  containerEl.insertBefore(wrap, containerEl.firstChild);
}

// Called when ring results arrive — update existing badges in place
function updateBadgesWithRings(ringMemberSet, connections) {
  // Find badges by reviewer_id stored in data attribute
  document.querySelectorAll(".ts-badge-wrap[data-reviewer-id]").forEach(wrap => {
    const rid = wrap.dataset.reviewerId;
    if (!ringMemberSet.has(rid)) return;

    const badge = wrap.querySelector(".ts-badge");
    if (!badge) return;

    // Remove existing ring flag if any
    badge.querySelectorAll(".ts-flag-ring").forEach(el => el.remove());

    const conn = connections[rid];
    const connCount = conn ? conn.length : 0;
    const ringFlag = document.createElement("span");
    ringFlag.className = "ts-flag ts-flag-ring";
    ringFlag.textContent = connCount > 0 ? `⚠ ring (${connCount})` : "⚠ ring";
    badge.appendChild(ringFlag);

    // Upgrade level to bad if not already
    badge.classList.remove("ts-good", "ts-warn");
    badge.classList.add("ts-bad");

    // Show shared product count in explanation
    if (conn && conn.length > 0) {
      let exp = wrap.querySelector(".ts-ring-exp");
      if (!exp) { exp = document.createElement("div"); exp.className = "ts-explanation ts-ring-exp"; wrap.appendChild(exp); }
      const sharedWith = conn.map(c => `${c.with.slice(0,8)}… (${c.shared_count} products)`).join(", ");
      exp.textContent = `Ring: shares products with ${sharedWith}`;
    }
  });
}

function updateFabWithRingResult(ringCount) {
  const fab = document.getElementById("ts-fab");
  const label = document.getElementById("ts-fab-text");
  if (!fab || !label) return;
  if (ringCount > 0) {
    fab.classList.remove("ts-good", "ts-warn");
    fab.classList.add("ts-bad");
    label.textContent = `⚠ ${ringCount} ring member${ringCount > 1 ? "s" : ""} found`;
  } else {
    const existing = label.textContent;
    if (!existing.includes("fake") && !existing.includes("suspicious")) {
      label.textContent = existing + " · no rings";
    }
  }
}

function showScanButton(onScan) {
  if (document.getElementById("ts-fab")) return;

  const fab = document.createElement("button");
  fab.id = "ts-fab";
  fab.innerHTML = `<span class="ts-fab-icon">🛡</span><span id="ts-fab-text">Scan Reviews</span>`;

  fab.onclick = async () => {
    fab.classList.remove("ts-good", "ts-warn", "ts-bad");
    fab.classList.add("ts-loading");
    document.getElementById("ts-fab-text").textContent = "Running AI analysis…";
    fab.disabled = true;
    try {
      const results = await onScan();
      const bad  = (results || []).filter(r => (r.trust_score ?? 1) < 0.5).length;
      const warn = (results || []).filter(r => { const s = r.trust_score ?? 1; return s >= 0.5 && s < 0.7; }).length;
      fab.classList.remove("ts-loading");
      fab.disabled = false;

      if (bad > 0) {
        fab.classList.add("ts-bad");
        document.getElementById("ts-fab-text").textContent = `⚠ ${bad} fake review${bad > 1 ? "s" : ""} found`;
      } else if (warn > 0) {
        fab.classList.add("ts-warn");
        document.getElementById("ts-fab-text").textContent = `${warn} suspicious review${warn > 1 ? "s" : ""}`;
      } else {
        fab.classList.add("ts-good");
        document.getElementById("ts-fab-text").textContent = `✓ Reviews look genuine`;
      }

      chrome.runtime.sendMessage({
        type: "SCAN_RESULTS",
        payload: { results, url: location.href, ts: Date.now() },
      });
    } catch (err) {
      console.error("[TrustScan] Scan error:", err);
      fab.classList.remove("ts-loading");
      fab.classList.add("ts-bad");
      document.getElementById("ts-fab-text").textContent = "API offline — retry";
      fab.disabled = false;
    }
  };

  document.body.appendChild(fab);
}
