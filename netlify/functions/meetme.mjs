/* =========================================================
   /.netlify/functions/meetme — the Meet Me at Society board (meetmeatsociety.html).

   Storage: Netlify Blobs (store "meetme", strong consistency → an approved post shows instantly).
     live      → JSON array of approved posts, newest first: [{ id, at, author, subject }]
     pending   → JSON array of posts waiting for approval (same shape + ip hash)
     rate/<h>  → per-visitor post counter (max 5 posts per 10 minutes)

   Public:
     GET                                   → { posts: live }
     POST { subject, author, website }     → { ok:true, id, pending:true }   (website = honeypot, must be empty)
   Admin (header x-mm-key must equal the Netlify env var MEETME_ADMIN_KEY — set by Chef, never in the repo):
     GET  ?admin=1                         → { pending, live }
     POST { action:"approve"|"reject"|"delete", id }

   Dependency: @netlify/blobs (package.json at the repo root; Netlify installs it, no build command needed).
   Written as a modern (v2, ESM) Netlify Function — the old exports.handler format can't use strong consistency.
   ========================================================= */
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

const H = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const out = (status, body) => new Response(JSON.stringify(body), { status, headers: H });
const clean = (s, n) => String(s || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const MAX_LIVE = 500;

export default async (req, context) => {
  const url = new URL(req.url), hdr = n => req.headers.get(n) || "";
  const store = getStore({ name: "meetme", consistency: "strong" });
  const get = async k => (await store.get(k, { type: "json" })) || [];
  const isAdmin = () => {
    const want = process.env.MEETME_ADMIN_KEY || "", got = hdr("x-mm-key");
    return want.length >= 8 && got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
  };
  const q = Object.fromEntries(url.searchParams);

  if (req.method === "GET") {
    if (q.admin) {
      if (!isAdmin()) return out(401, { error: "key" });
      return out(200, { pending: await get("pending"), live: await get("live") });
    }
    return out(200, { posts: (await get("live")).map(({ id, at, author, subject }) => ({ id, at, author, subject })) });
  }
  if (req.method !== "POST") return out(405, { error: "method" });

  let b; try { b = JSON.parse((await req.text()) || "{}"); } catch (e) { return out(400, { error: "json" }); }

  // ---- admin actions ----
  if (b.action) {
    if (!isAdmin()) return out(401, { error: "key" });
    const pending = await get("pending"), live = await get("live");
    const i = pending.findIndex(p => p.id === b.id), j = live.findIndex(p => p.id === b.id);
    if (b.action === "approve" && i > -1) {
      const p = pending.splice(i, 1)[0]; delete p.ip;
      live.unshift(p); live.sort((x, y) => y.at.localeCompare(x.at)); live.length = Math.min(live.length, MAX_LIVE);
    } else if (b.action === "reject" && i > -1) pending.splice(i, 1);
    else if (b.action === "delete" && j > -1) live.splice(j, 1);
    else return out(404, { error: "not-found" });
    await store.setJSON("pending", pending); await store.setJSON("live", live);
    return out(200, { ok: true, pending, live });
  }

  // ---- new post from the page ----
  if (b.website) return out(200, { ok: true, id: "x", pending: true });          // bot: pretend it worked
  const subject = clean(b.subject, 90), author = clean(b.author, 24);
  if (subject.length < 2 || author.length < 1) return out(400, { error: "empty" });
  const ip = (context && context.ip) || hdr("x-nf-client-connection-ip") || "";
  const h = crypto.createHash("sha256").update(ip + "|meetme").digest("hex").slice(0, 16);
  const now = Date.now(), rk = "rate/" + h, r = (await store.get(rk, { type: "json" })) || { t: now, n: 0 };
  if (now - r.t > 10 * 60e3) { r.t = now; r.n = 0; }
  if (r.n >= 5) return out(429, { error: "slow-down" });
  r.n++; await store.setJSON(rk, r);

  const pending = await get("pending");
  if (pending.length >= 200) return out(503, { error: "queue-full" });
  const id = "p" + now.toString(36) + crypto.randomBytes(2).toString("hex");
  const at = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Malta" }).slice(0, 16).replace(" ", "T");   // Malta time, YYYY-MM-DDTHH:MM
  pending.push({ id, at, author, subject, ip: h });
  await store.setJSON("pending", pending);
  return out(200, { ok: true, id, pending: true });
};
