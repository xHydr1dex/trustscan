const SUPPORTED = ["amazon.in", "amazon.com", "flipkart.com", "meesho.com", "myntra.com"];
const DASHBOARD = "https://xhydr1dex.vercel.app"; // update if Vercel URL changes
const body = document.getElementById("body");

function currentPlatform(url) {
  if (!url) return null;
  return SUPPORTED.find(p => url.includes(p)) ?? null;
}

function renderIdle(platform) {
  body.innerHTML = `
    <div class="state-idle">
      <p class="idle-msg">Click <strong>Scan Reviews</strong> on the page, or use the button below.</p>
      <div class="platforms">
        ${SUPPORTED.map(p => `<span class="platform-tag">${p}</span>`).join("")}
      </div>
      <button class="btn-scan" id="btn-trigger">Scan This Page</button>
    </div>
  `;
  document.getElementById("btn-trigger").onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_SCAN" }, () => window.close());
    });
  };
}

function renderResults(data) {
  const { results, url } = data;
  const total = results.length;
  const bad   = results.filter(r => (r.trust_score ?? 1) < 0.5).length;
  const warn  = results.filter(r => { const s = r.trust_score ?? 1; return s >= 0.5 && s < 0.7; }).length;
  const good  = total - bad - warn;

  const level  = bad > 0 ? "bad" : warn > 0 ? "warn" : "good";
  const msg    = bad > 0
    ? `⚠ ${bad} likely fake review${bad > 1 ? "s" : ""} detected`
    : warn > 0
      ? `${warn} suspicious review${warn > 1 ? "s" : ""} — check carefully`
      : `✓ Reviews appear genuine`;

  body.innerHTML = `
    <div class="summary-row">
      <div class="stat-box red">
        <div class="num">${bad}</div>
        <div class="lbl">Fake</div>
      </div>
      <div class="stat-box amber">
        <div class="num">${warn}</div>
        <div class="lbl">Suspicious</div>
      </div>
      <div class="stat-box green">
        <div class="num">${good}</div>
        <div class="lbl">Genuine</div>
      </div>
    </div>
    <div class="verdict ${level}">${msg}</div>
    <div class="rescan-row">
      <button class="btn-rescan" id="btn-rescan">↺ Rescan</button>
      <a class="btn-dashboard" href="${DASHBOARD}" target="_blank">Dashboard ↗</a>
    </div>
  `;

  document.getElementById("btn-rescan").onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_SCAN" }, () => window.close());
    });
  };
}

function renderUnsupported() {
  body.innerHTML = `
    <div class="not-supported">
      Navigate to a product page on<br>
      Amazon · Flipkart · Meesho · Myntra<br><br>
      then click this icon again.
    </div>
  `;
}

// Bootstrap
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  const platform = currentPlatform(tab?.url ?? "");
  if (!platform) { renderUnsupported(); return; }

  chrome.storage.local.get(["lastScan", "ts_knapsack"], ({ lastScan, ts_knapsack }) => {
    const reviewers = Object.keys(ts_knapsack?.reviewer_products || {}).length;
    const products  = Object.keys(ts_knapsack?.product_brand || {}).length;

    if (lastScan?.tabId === tab.id && lastScan?.results?.length) {
      renderResults(lastScan);
    } else {
      renderIdle(platform);
    }

    // Show knapsack stats at bottom if we have any data
    const stat = document.createElement("div");
    stat.style.cssText = "padding:8px 18px 10px;font-size:10px;color:rgba(255,255,255,0.3);border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;";
    stat.innerHTML = reviewers > 0
      ? `<span>Tracking ${reviewers} reviewers · ${products} products</span><button id="ks-clear" style="font-size:9px;color:rgba(255,255,255,0.2);background:none;border:none;cursor:pointer;padding:0;">clear</button>`
      : `<span>No data yet — scan a product to start</span>`;
    document.body.appendChild(stat);

    document.getElementById("ks-clear")?.addEventListener("click", () => {
      chrome.storage.local.remove("ts_knapsack", () => stat.querySelector("span").textContent = "Cleared.");
    });
  });
});
