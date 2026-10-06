/* =========================================================
   /.netlify/functions/barneybook — comments + suggested edits for the Barney Book.

   GET  → { comments: [{ id, recipe, name, message, at }] }  (Type = Comment, Status = Shown)
   POST { recipeId, recipe, type: "comment"|"edit", name, message, website(honeypot) }
        → adds a row to the Coda table "Barney Book Feedback" (Master Bar Book doc).
          Suggested edits never change the listing: they land as Status "Open", and the
          daily report tasks list every Open edit until a manager sets it to
          Approved / Done / Rejected in Coda.

   Needs ONE Netlify environment variable: CODA_API_TOKEN (a Coda API token with
   read + write access to the Master Bar Book doc). It is never sent to the browser.
   Zero dependencies — no build step needed.
   ========================================================= */
"use strict";

const DOC = "QhSIU7bsZa";                 // Master Bar Book
const TABLE = "grid-hY8Nzr9h1b";          // Barney Book Feedback
const COL = {
  recipe: "c-5_tHGNP69T", recipeId: "c-zcFM5eMSnK", type: "c-t9iHSUnPoM", name: "c-exta7ql3zq",
  message: "c-qDUVVk0GnZ", submitted: "c-xWXb37_-N0", status: "c-Jy74u2qhkA",
};
const API = `https://coda.io/apis/v1/docs/${DOC}/tables/${TABLE}/rows`;
const HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

let cache = null, cacheAt = 0;            // shown comments, cached briefly per warm instance
const recent = new Map();                 // ip → [timestamps], a light brake on spam

const reply = (status, body) => ({ statusCode: status, headers: HEADERS, body: JSON.stringify(body) });
const clean = (s, max) => String(s || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

async function coda(url, opts = {}){
  const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${process.env.CODA_API_TOKEN}`, "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`Coda ${res.status}`);
  return res.status === 204 ? null : res.json();
}

async function shownComments(){
  if (cache && Date.now() - cacheAt < 30000) return cache;
  const out = [];
  let url = `${API}?valueFormat=simple&limit=500`;
  while (url){
    const data = await coda(url);
    for (const r of data.items || []){
      const v = r.values || {};
      if (v[COL.type] !== "Comment" || v[COL.status] !== "Shown") continue;
      out.push({ id: r.id, recipe: v[COL.recipeId], name: v[COL.name], message: v[COL.message], at: v[COL.submitted] || r.createdAt });
    }
    url = data.nextPageLink || null;
  }
  out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  cache = out; cacheAt = Date.now();
  return out;
}

exports.handler = async (event) => {
  if (!process.env.CODA_API_TOKEN) return reply(503, { error: "not-configured" });
  try {
    if (event.httpMethod === "GET") return reply(200, { comments: await shownComments() });
    if (event.httpMethod !== "POST") return reply(405, { error: "method" });

    let b; try { b = JSON.parse(event.body || "{}"); } catch { return reply(400, { error: "bad-json" }); }
    if (b.website) return reply(200, { ok: true });               // honeypot: bots fill every field
    const recipeId = clean(b.recipeId, 80), recipe = clean(b.recipe, 120);
    const type = b.type === "edit" ? "Suggested edit" : b.type === "comment" ? "Comment" : null;
    const name = clean(b.name, 60), message = clean(b.message, 2000);
    if (!/^[a-z0-9-]{1,80}$/.test(recipeId) || !recipe || !type || name.length < 2 || message.length < 2)
      return reply(400, { error: "missing" });

    const ip = (event.headers && (event.headers["x-nf-client-connection-ip"] || event.headers["client-ip"])) || "?";
    const now = Date.now(), hits = (recent.get(ip) || []).filter(t => now - t < 600000);
    if (hits.length >= 8) return reply(429, { error: "slow-down" });
    recent.set(ip, [...hits, now]);

    const at = new Date().toISOString();
    const status = type === "Comment" ? "Shown" : "Open";
    await coda(API, { method: "POST", body: JSON.stringify({ rows: [{ cells: [
      { column: COL.recipe, value: recipe }, { column: COL.recipeId, value: recipeId },
      { column: COL.type, value: type }, { column: COL.name, value: name },
      { column: COL.message, value: message }, { column: COL.submitted, value: at },
      { column: COL.status, value: status },
    ] }] }) });
    cache = null;
    return reply(200, { ok: true, comment: type === "Comment" ? { recipe: recipeId, name, message, at } : null });
  } catch (e){
    return reply(502, { error: "upstream" });
  }
};
