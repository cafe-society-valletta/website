/* =========================================================
   /.netlify/functions/comment — Comment cards from the Tip Jar page (tip.html, Chef Oct 2026).

   POST { message, rating (0–5, 0 = none), name, email, website (honeypot), photos? [{ type, data (base64) }] ≤ 4 } → { ok:true }
        → adds a row to the Coda table "Comment Cards" in the "Society Nightly Reports" doc, next to the nightly
          shift reports, so the next morning's daily report picks it up (Service Date = the trading day: a card sent
          before 06:00 Malta belongs to the night before). Private to management — never shown on the site.
   503 { error:"not-configured" } without the token.

   Photos ("send us a pic"): sent on to Chef's Apps Script web app (apps-script/comment-card-photos.gs), which saves them
   in Drive → "Comment Card Photos" → <service date>/ and answers with their links; the links go in the row's Photos column.
   If the photo service isn't set up or fails, the card is still saved and Photos says what happened.

   Netlify env (set by Chef, never in the repo): CODA_API_TOKEN — must have write access to the
   "Society Nightly Reports" doc as well as the Master Bar Book; CC_PHOTO_URL + CC_PHOTO_SECRET — the Apps Script
   web app URL and its shared secret. Zero dependencies.
   ========================================================= */
const DOC = "knXFjeUQG_";                 // Society Nightly Reports
const TABLE = "grid-Ha8sNfwbb_";          // Comment Cards
const COL = { received: "c-pLAVNQUm8x", serviceDate: "c-GRJBQqX0ss", rating: "c-NfoHZWS8-h", message: "c-UxvEYjPJb5",
              name: "c-SGn535xERu", email: "c-rDeSq6mmpl", photos: "c-F5OxwoNFEh",
              photoUse: "c-mWX0KuS7d9" };   // Photo Use: "OK for content" | "Just for our eyes" (the guest's choice)
const MAX_PHOTOS = 4, MAX_B64 = 1_100_000;  // each photo arrives shrunk by the browser (≤ 1400 px JPEG, ~≤ 800 KB)
const H = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const out = (status, body) => new Response(JSON.stringify(body), { status, headers: H });
const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const recent = new Map();                 // ip → timestamps: a light brake on spam (per warm instance)

// the trading day in Malta: before 06:00 local it is still last night's service
function serviceDate(now){
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Malta", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now).map(x => [x.type, x.value]));
  const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
  if (+p.hour < 6) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default async (req, context) => {
  if (req.method !== "POST") return out(405, { error: "method" });
  if (!process.env.CODA_API_TOKEN) return out(503, { error: "not-configured" });
  let b; try { b = await req.json(); } catch { return out(400, { error: "bad-json" }); }
  if (clean(b.website, 200)) return out(200, { ok: true });               // honeypot: pretend it worked

  const message = clean(b.message, 2000), name = clean(b.name, 80), email = clean(b.email, 120);
  const rating = Math.max(0, Math.min(5, Math.round(Number(b.rating) || 0)));
  if (message.length < 2 && !(Array.isArray(b.photos) && b.photos.length)) return out(400, { error: "message" });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return out(400, { error: "email" });

  const ip = (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "?", t = Date.now();
  const mine = (recent.get(ip) || []).filter(x => t - x < 10 * 60e3);
  if (mine.length >= 5) return out(429, { error: "slow-down" });
  recent.set(ip, [...mine, t]);

  const photos = (Array.isArray(b.photos) ? b.photos : []).slice(0, MAX_PHOTOS)
    .filter(p => p && typeof p.data === "string" && p.data.length > 100 && p.data.length <= MAX_B64 && /^[A-Za-z0-9+/=]+$/.test(p.data))
    .map(p => ({ type: /^image\/(jpeg|png|webp)$/.test(p.type) ? p.type : "image/jpeg", data: p.data }));

  const photoUse = b.photoUse === "OK for content" ? "OK for content" : "Just for our eyes";   // anything else = private
  const now = new Date(), day = serviceDate(now);
  let photoNote = "";
  if (photos.length) {
    if (!process.env.CC_PHOTO_URL || !process.env.CC_PHOTO_SECRET) photoNote = `(${photos.length} photo${photos.length > 1 ? "s" : ""} sent, but the photo service isn't set up yet)`;
    else {
      try {
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
        const r = await fetch(process.env.CC_PHOTO_URL, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ secret: process.env.CC_PHOTO_SECRET, serviceDate: day, name, message: message.slice(0, 200), photoUse, photos }) });
        clearTimeout(t);
        const txt = await r.text(); let d = {};
        try { d = JSON.parse(txt); } catch {}
        // not JSON = Google answered with a web page (usually: web app access isn't "Anyone", or it needs re-authorising)
        const why = d.error || (/^\s*</.test(txt) ? `web page "${(txt.match(/<title>([^<]*)/i) || [, "untitled"])[1].trim().slice(0, 60)}" (check the Apps Script deployment: Execute as Me, access Anyone)` : r.status);
        photoNote = d.links && d.links.length ? d.links.join("\n") : `(${photos.length} photo(s) sent but not saved: ${why})`;
        if (!(d.links && d.links.length)) console.error("cc-photos", r.status, r.headers.get("content-type"), txt.slice(0, 300));
      } catch (e) {
        photoNote = `(${photos.length} photo(s) sent; upload didn't confirm in time — check Drive › Comment Card Photos › ${day})`;
      }
    }
  }

  const cells = [
    { column: COL.received, value: now.toISOString() },
    { column: COL.serviceDate, value: day },
    { column: COL.message, value: message }
  ];
  if (rating) cells.push({ column: COL.rating, value: rating });
  if (name) cells.push({ column: COL.name, value: name });
  if (email) cells.push({ column: COL.email, value: email });
  if (photoNote) { cells.push({ column: COL.photos, value: photoNote }); cells.push({ column: COL.photoUse, value: photoUse }); }

  const r = await fetch(`https://coda.io/apis/v1/docs/${DOC}/tables/${TABLE}/rows`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CODA_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ rows: [{ cells }] })
  });
  if (!r.ok) { console.error("coda", r.status, await r.text().catch(() => "")); return out(502, { error: "coda" }); }
  return out(200, { ok: true });
};
