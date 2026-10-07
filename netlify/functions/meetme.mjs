/* =========================================================
   /.netlify/functions/meetme — the Meet Me at Society board (meetmeatsociety.html).

   Storage: Netlify Blobs (store "meetme", strong consistency → an approved post shows instantly).
     live         → JSON array of approved posts, newest first: [{ id, at, author, subject, body, photos }]
     pending      → JSON array of posts waiting for approval (same shape + ip hash)
     img/<id>-<n> → photo n of post <id> (binary, metadata { type })
     rate/<h>     → per-visitor counter (max 8 posts + comments per 10 minutes)

     c/<postId>   → JSON array of approved comments on that post: [{ id, post, parent, at, author, body }] (parent = comment id or null)
     cpending     → JSON array of comments waiting for approval (same shape + ip hash)

   Limits (kept in step with assets/js/meetme.js): subject 44 chars (one line on the inbox), name 24, body 5000,
   photos ≤ 4 per post, each ≤ 1 MB after the browser shrinks it (JPEG, long side ≤ 1600 px), so one post stays
   under the ~6 MB function request limit.

   Public:
     GET                                   → { posts: live without body }  (photos = count)
     GET ?post=<id>                        → { post, comments } (live posts only; approved comments, oldest first)
     POST { kind:"comment", post, parent, author, body, website }  → { ok:true, id, pending:true }   (comments are vetted too)
     GET ?photo=<id>-<n>                   → the image          (live posts only, or admin key)
     POST { subject, author, body, photos:[{type,data(base64)}], website }  → { ok:true, id, pending:true }
                                             (website = honeypot, must be empty)
   Admin (header x-mm-key must equal the Netlify env var MEETME_ADMIN_KEY — set by Chef, never in the repo):
     GET  ?admin=1                         → { pending, live, cpending, comments }   (comments = latest approved, newest first)
     POST { action:"approve"|"reject"|"delete", id }   (reject/delete also remove the photos; delete also drops its comments)
     POST { action:"capprove"|"creject"|"cdelete", id }   (comments)
   Poster (no admin key): POST { action:"own-edit", id, key, subject, body } → post goes back to the queue with the changes
                          POST { action:"own-delete", id, key } → post, photos and comments removed
     (key = the ownerKey returned when the post was made, kept in the poster's browser; only its hash is stored)

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
const MAX_LIVE = 500, LIM = { subject: 44, author: 24, body: 5000, photos: 4, photoBytes: 1024 * 1024, comment: 1000 };
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const sha = k => crypto.createHash("sha256").update(String(k) + "|mm-owner").digest("hex");
const maltaNow = () => new Date().toLocaleString("sv-SE", { timeZone: "Europe/Malta" }).slice(0, 16).replace(" ", "T");

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
      if (!p) return out(404, { error: "not-found" });
      const { owner, ...pub } = p;   // never send the owner-key hash
      return out(200, { post: pub, comments: await get("c/" + p.id) });
    }
    if (q.admin) {
      if (!isAdmin()) return out(401, { error: "key" });
      const live = await get("live"), all = [];
      for(const p of live.slice(0, 100)) for(const c of await get("c/" + p.id)) all.push({ ...c, subject: p.subject });
      all.sort((a, b) => b.at.localeCompare(a.at));
      const subj = Object.fromEntries(live.map(p => [p.id, p.subject]));
      return out(200, { pending: await get("pending"), live, cpending: (await get("cpending")).map(c => ({ ...c, subject: subj[c.post] || "?" })), comments: all.slice(0, 100) });
    }
    return out(200, { posts: (await get("live")).map(({ id, at, author, subject, photos }) => ({ id, at, author, subject, photos: photos || 0 })) });
  }
  if (req.method !== "POST") return out(405, { error: "method" });

  let b; try { b = JSON.parse((await req.text()) || "{}"); } catch (e) { return out(400, { error: "json" }); }

  // ---- admin actions ----
  // ---- the poster editing or deleting their own post (key from their browser; edits go back to the sysop queue) ----
  if (b.action === "own-edit" || b.action === "own-delete") {
    const pending = await get("pending"), live = await get("live");
    let where = pending, i = pending.findIndex(p => p.id === b.id);
    if (i < 0) { where = live; i = live.findIndex(p => p.id === b.id); }
    if (i < 0) return out(404, { error: "not-found" });
    const p = where[i], key = String(b.key || "");
    if (!p.owner || !key || !crypto.timingSafeEqual(Buffer.from(sha(key)), Buffer.from(p.owner))) return out(403, { error: "not-owner" });
    if (b.action === "own-delete") {
      where.splice(i, 1);
      for (let n = 0; n < (p.photos || 0); n++) await store.delete(`img/${p.id}-${n}`);
      await store.delete("c/" + p.id);
    } else {
      const subject = clean(b.subject, LIM.subject), body = cleanBody(b.body, LIM.body);
      if (subject.length < 2) return out(400, { error: "empty" });
      where.splice(i, 1);
      pending.push({ ...p, subject, body, edited: maltaNow() });   // back to the sysop; comments and photos stay
    }
    await store.setJSON("pending", pending); await store.setJSON("live", live);
    return out(200, { ok: true });
  }
  if (b.action && b.action[0] === "c") {   // comment moderation
    if (!isAdmin()) return out(401, { error: "key" });
    const cp = await get("cpending"), i = cp.findIndex(c => c.id === b.id);
    if (b.action === "capprove" && i > -1) {
      const c = cp.splice(i, 1)[0]; delete c.ip;
      const list = await get("c/" + c.post); list.push(c); list.sort((x, y) => x.at.localeCompare(y.at));
      await store.setJSON("c/" + c.post, list.slice(-1000));
    } else if (b.action === "creject" && i > -1) cp.splice(i, 1);
    else if (b.action === "cdelete" && b.post) {
      const list = await get("c/" + b.post), j = list.findIndex(c => c.id === b.id);
      if (j < 0) return out(404, { error: "not-found" });
      list[j] = { ...list[j], author: "", body: "", deleted: true };   // keep the slot so replies under it still hang together
      await store.setJSON("c/" + b.post, list);
    } else return out(404, { error: "not-found" });
    await store.setJSON("cpending", cp);
    return out(200, { ok: true });
  }
  if (b.action) {
    if (!isAdmin()) return out(401, { error: "key" });
    const pending = await get("pending"), live = await get("live");
    const i = pending.findIndex(p => p.id === b.id), j = live.findIndex(p => p.id === b.id);
    const dropPhotos = async p => { for (let n = 0; n < (p.photos || 0); n++) await store.delete(`img/${p.id}-${n}`); };
    if (b.action === "approve" && i > -1) {
      const p = pending.splice(i, 1)[0]; delete p.ip;
      live.unshift(p); live.sort((x, y) => y.at.localeCompare(x.at)); live.length = Math.min(live.length, MAX_LIVE);
    } else if (b.action === "reject" && i > -1) await dropPhotos(pending.splice(i, 1)[0]);
    else if (b.action === "delete" && j > -1){ const p = live.splice(j, 1)[0]; await dropPhotos(p); await store.delete("c/" + p.id); }
    else return out(404, { error: "not-found" });
    await store.setJSON("pending", pending); await store.setJSON("live", live);
    return out(200, { ok: true, pending, live });
  }

  // ---- new post or comment from the page ----
  if (b.website) return out(200, { ok: true, id: "x", pending: true });          // bot: pretend it worked
  const rateOK = async () => {
    const ip = (context && context.ip) || hdr("x-nf-client-connection-ip") || "";
    const h = crypto.createHash("sha256").update(ip + "|meetme").digest("hex").slice(0, 16);
    const now = Date.now(), rk = "rate/" + h, r = (await store.get(rk, { type: "json" })) || { t: now, n: 0 };
    if (now - r.t > 10 * 60e3) { r.t = now; r.n = 0; }
    if (r.n >= 8) return null;
    r.n++; await store.setJSON(rk, r); return h;
  };
  if (b.kind === "comment") {
    const author = clean(b.author, LIM.author), body = cleanBody(b.body, LIM.comment), post = String(b.post || "");
    if (!author || body.length < 1) return out(400, { error: "empty" });
    const live = await get("live"); if (!live.some(p => p.id === post)) return out(404, { error: "not-found" });
    const parent = b.parent ? String(b.parent) : null;
    if (parent && !(await get("c/" + post)).some(c => c.id === parent)) return out(400, { error: "parent" });
    const h = await rateOK(); if (!h) return out(429, { error: "slow-down" });
    const cp = await get("cpending"); if (cp.length >= 300) return out(503, { error: "queue-full" });
    const id = "c" + Date.now().toString(36) + crypto.randomBytes(2).toString("hex");
    cp.push({ id, post, parent, at: maltaNow(), author, body, ip: h }); await store.setJSON("cpending", cp);
    return out(200, { ok: true, id, pending: true });
  }
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
  const h = await rateOK(); if (!h) return out(429, { error: "slow-down" });
  const now = Date.now();

  const pending = await get("pending");
  if (pending.length >= 200) return out(503, { error: "queue-full" });
  const id = "p" + now.toString(36) + crypto.randomBytes(2).toString("hex");
  const at = maltaNow();   // Malta time, YYYY-MM-DDTHH:MM
  for (let n = 0; n < bins.length; n++) await store.set(`img/${id}-${n}`, bins[n].buf, { metadata: { type: bins[n].type } });
  const ownerKey = crypto.randomBytes(16).toString("hex");   // given to the poster's browser only; lets them edit/delete their post
  pending.push({ id, at, author, subject, body, photos: bins.length, ip: h, owner: sha(ownerKey) });
  await store.setJSON("pending", pending);
  return out(200, { ok: true, id, pending: true, ownerKey });
};
