# TrustScan Browser Extension — Install Guide

## Load in Chrome / Edge / Brave

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `trustscan-extension/` folder
5. The TrustScan shield icon appears in your toolbar

## Usage

1. Visit any product page on **Amazon**, **Flipkart**, **Meesho**, or **Myntra**
2. Scroll to the reviews section
3. Click the **purple "Scan Reviews" button** floating at the bottom-right
4. Trust score badges appear next to each review instantly
   - 🟢 Green = Looks genuine
   - 🟠 Orange = Suspicious
   - 🔴 Red = Likely fake

## Icons

Add PNG icons to the `icons/` folder:
- `icon16.png` (16×16)
- `icon48.png` (48×48)
- `icon128.png` (128×128)

Without icons the extension still works — Chrome shows a default puzzle piece.

## Updating Selectors

Flipkart/Meesho/Myntra use obfuscated or frequently-changed CSS classes.
If badges stop appearing on a platform, open DevTools on a reviews page,
inspect a review block, and update the `CONTAINER_SELECTORS` array at the
top of the relevant content script.
