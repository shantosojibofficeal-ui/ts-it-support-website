# TS IT Support — Website Demo

Static demo of the storefront, customer mailbox, and admin dashboard.

## Structure
```
index.html          -> storefront (shop, cart, checkout)
mailbox.html         -> customer "My Account → Mailbox" (order tracking)
admin.html            -> admin dashboard (approve/reject orders, catalog)
products.js           -> product catalog data
app.js                 -> storefront cart/checkout logic
firebase-config.js -> your Firebase web app config (safe to be public)
style.css              -> shared styles
```

## Deploy to Netlify
1. Push this folder to a GitHub repo (root of the repo, or set it as the "publish directory" in Netlify).
2. In Netlify: **Add new site → Import an existing project → connect the repo**.
3. Build command: leave blank (static site). Publish directory: `/` (or wherever this folder sits in the repo).
4. Deploy — Netlify gives you a live URL (you can add a custom domain later).

## About the Firebase key
The `apiKey` in `firebase-config.js` is your **public web app config**, not a secret —
it's meant to ship in front-end code and is safe in a public GitHub repo. Real protection
comes from **Firestore/Storage security rules** and **Firebase App Check**, not from hiding
this key. Right now the file only initializes Firebase Analytics; nothing else is wired up yet.

## What's still a demo, not production
- Cart/orders are stored in the browser's `localStorage` — fine for a prototype, but orders
  won't be shared across devices or survive a cleared browser. To make this real, move orders
  into Firestore (or another database) and add Firebase Authentication for login.
- Payment methods (bKash/Nagad/bank/card) are selectable but not actually processed — you'd
  need each provider's real payment API, and an admin flow to mark "Paid" reads a **real**
  transaction reference, not a demo one.
- The WhatsApp AI assistant button is a placeholder — wire it to the WhatsApp Business API
  plus an LLM backend to make it live.
- Hidden zip-file delivery (digital product downloads) needs real file storage (e.g. Firebase
  Storage with signed, per-order download URLs) — currently it's a mock "Download" button.

## Suggested next step if you want this fully working
Add Firebase Authentication (customer login) + Firestore (orders/products) + Storage
(digital files) so the storefront, mailbox, and admin panel all read/write the same live data
instead of each browser's local storage. I can build that out next if you'd like.
