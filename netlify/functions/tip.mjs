/* =========================================================
   /.netlify/functions/tip — Tip Jar (tip.html) → Stripe Checkout, zero dependencies.

   POST { amount }   (euros, 1–500) → { url }   a Stripe-hosted Checkout page for exactly that amount; the browser
                     goes straight there. Stripe returns the guest to /tip?thanks=1 (or /tip if they cancel).
   503 { error:"not-configured" } until the key is set — tip.js then opens the fixed Stripe payment link instead.

   Netlify env (set by Chef in Netlify — NEVER in the repo, the repo is public):
     STRIPE_SECRET_KEY   a Stripe restricted key (rk_live_…) with only "Checkout Sessions: Write"
   ========================================================= */
const MIN = 100, MAX = 50000;   // cents
const H = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const out = (status, body) => new Response(JSON.stringify(body), { status, headers: H });
const SITES = /^https:\/\/(www\.)?cafesocietyvalletta\.com$|^https:\/\/[a-z0-9-]+\.netlify\.app$|^http:\/\/localhost(:\d+)?$/;

export default async (req) => {
  if (req.method !== "POST") return out(405, { error: "method" });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return out(503, { error: "not-configured" });

  let amount;
  try { amount = Math.round(Number((await req.json()).amount) * 100); } catch { return out(400, { error: "bad-json" }); }
  if (!Number.isFinite(amount) || amount < MIN || amount > MAX) return out(400, { error: "amount" });

  const origin = new URL(req.url).origin, base = SITES.test(origin) ? origin : "https://cafesocietyvalletta.com";
  const f = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(amount),
    "line_items[0][price_data][product_data][name]": "Tip for the Café Society team",
    "payment_intent_data[description]": "Tip — Café Society Valletta",
    "metadata[kind]": "tip",
    success_url: base + "/tip?thanks=1",
    cancel_url: base + "/tip"
  });
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded" },
    body: f
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.url) { console.error("stripe", r.status, d && d.error && d.error.message); return out(502, { error: "stripe" }); }
  return out(200, { url: d.url });
};
