console.log("[TrustScan] Background service worker started");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SCAN_RESULTS") {
    chrome.storage.local.set({ lastScan: { ...msg.payload, tabId: sender.tab?.id } });
    sendResponse({ ok: true });
  }
  return true;
});
