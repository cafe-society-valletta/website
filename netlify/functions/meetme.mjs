/* =========================================================
   /.netlify/functions/meetme — the Meet Me at Society board (meetmeatsociety.html).

   Storage: Netlify Blobs (store "meetme", strong consistency → an approved post shows instantly).
     live         → JSON array of approved posts, newest first: [{ id, at, author, subject, body, photos }]
     pending      → JSON array of posts waiting for approval (same shape + ip hash)
     img/<id>-<n> → photo n of post <id> (binary, metadata { type })
     rate/<h>     → per-visitor post counter (max 5 posts per 10 minutes)

   Limits (kept in step with assets/js/meetme.js): subject 44 chars (one line on the inbox), name 24, body 5000,
   photos ≤ 4 per post, each ≤ 1 MB after the browser shrinks it (JPEG, long side ≤ 1600 px), so one post stays
   under the ~6 MB function request limit.

   Public:
     GET                                   → { posts: live without body }  (photos = count)
     GET ?post=<id>                        → { post }           (live posts only)
     GET ?photo=<id>-<n>                   → the image          (live posts only, or admin key)
     POST { subject, author, body, photos:[{type,data(base64)}], website }  → { ok:true, id, pending:true }
                                             (website = honeypot, must be empty)
   Admin (header x-mm-key must equal the Netlify env var MEETME_ADMIN_KEY — set by Chef, never in the repo):
     GET  ?admin=1                         → { pending, live }
     POST { action:"approve"|"reject"|"delete", id }   (reject/delete also remove the photos)

   Dependency: @netlify/blobs (package.json at the repo root; Netlify installs it, no build command needed).
   Written as a modern (v2, ESM) Netlify Function — the old exports.handler format can't use strong consistency.
   ========================================================= */
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

const H = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const out = (status, body) => new Response(JSON.stringify(body), { status, headers: H });
const clean = (s, n) => String(s || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const cleanBody = (s, n) => String(s || "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ")
  .replace(/\n{4,}/g, "\n\n\n").trim().slice(0, n);
const MAX_LIVE = 500, LIM = { subject: 44, author: 24, body: 5000, photos: 4, photoBytes: 1024 * 1024 };
const TYPES = ["image/jpeg", "image/png", "image/webp"];

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
    if (q.photo) {
      const m = /^(p[a-z0-9]+)-(\d)$/.exec(q.photo); if (!m) return out(404, { error: "not-found" });
      const isLive = (await get("live")).some(p => p.id === m[1]);
      if (!isLive && !isAdmin()) return out(404, { error: "not-found" });
      const r = await store.getWithMetadata("img/" + q.photo, { type: "arrayBuffer" });
      if (!r) return out(404, { error: "not-found" });
      return new Response(r.data, { status: 200, headers: { "Content-Type": (r.metadata && r.metadata.type) || "image/jpeg",
        "Cache-Control": isLive ? "public, max-age=86400" : "no-store" } });
    }
    if (q.post) {
      const p = (await get("live")).find(p => p.id === q.post);
      return p ? out(200, { post: p }) : out(404, { error: "not-found" });
    }
    if (q.admin) {
      if (!isAdmin()) return out(401, { error: "key" });
      return out(200, { pending: await get("pending"), live: await get("live") });
    }
    return out(200, { posts: (await get("live")).map(({ id, at, author, subject, photos }) => ({ id, at, author, subject, photos: photos || 0 })) });
  }
  if (req.method !== "POST") return out(405, { error: "method" });

  let b; try { b = JSON.parse((await req.text()) || "{}"); } catch (e) { return out(400, { error: "json" }); }

  // ---- admin actions ----
  if (b.action) {
    if (!isAdmin()) return out(401, { error: "key" });
    const pending = await get("pending"), live = await get("live");
    const i = pending.findIndex(p => p.id === b.id), j = live.findIndex(p => p.id === b.id);
    const dropPhotos = async p => { for (let n = 0; n < (p.photos || 0); n++) await store.delete(`img/${p.id}-${n}`); };
    if (b.action === "approve" && i > -1) {
      const p = pending.splice(i, 1)[0]; delete p.ip;
      live.unshift(p); live.sort((x, y) => y.at.localeCompare(x.at)); live.length = Math.min(live.length, MAX_LIVE);
    } else if (b.action === "reject" && i > -1) await dropPhotos(pending.splice(i, 1)[0]);
    else if (b.action === "delete" && j > -1) await dropPhotos(live.splice(j, 1)[0]);
    else return out(404, { error: "not-found" });
    await store.setJSON("pending", pending); await store.setJSON("live", live);
    return out(200, { ok: true, pending, live });
  }

  // ---- new post from the page ----
  if (b.website) return out(200, { ok: true, id: "x", pending: true });          // bot: pretend it worked
  const subject = clean(b.subject, LIM.subject), author = clean(b.author, LIM.author), body = cleanBody(b.body, LIM.body);
  if (subject.length < 2 || author.length < 1) return out(400, { error: "empty" });
  const photos = Array.isArray(b.photos) ? b.photos.slice(0, LIM.photos) : [];
  const bins = [];
  for (const ph of photos) {
    if (!ph || !TYPES.includes(ph.type) || typeof ph.data !== "string") return out(400, { error: "photo-type" });
    const buf = Buffer.from(ph.data, "base64");
    if (!buf.length || buf.length > LIM.photoBytes) return out(413, { error: "photo-size" });
    bins.push({ buf, type: ph.type });
  }
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
  for (let n = 0; n < bins.length; n++) await store.set(`img/${id}-${n}`, bins[n].buf, { metadata: { type: bins[n].type } });
  pending.push({ id, at, author, subject, body, photos: bins.length, ip: h });
  await store.setJSON("pending", pending);
  return out(200, { ok: true, id, pending: true });
};
