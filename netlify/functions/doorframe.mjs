/* =========================================================
   /.netlify/functions/doorframe — the digital doorframe on the events page (assets/js/doorframe.js):
   anyone can tape up an A3 poster; it goes up once the sysop approves it (SYSOP CONSOLE, mmadmin.html).

   Storage: Netlify Blobs (store "doorframe", strong consistency).
     live      → JSON array of posters on the frame, newest first: [{ id, at, name, contact, link, owner }]
     pending   → JSON array of posters waiting for approval (same shape + ip hash)
     img/<id>  → the poster (JPEG, cropped in the browser to A3 297:420, 1131 × 1600 px, ≤ 2 MB)
     rate/<h>  → per-visitor counter (max 4 uploads per 10 minutes)

   Name + contact are PRIVATE: only the sysop sees them (to reach the poster's owner). The optional link is public
   and shows with the poster when it is zoomed in.

   Public:
     GET                       → { posters: [{ id, at, link }] }   (live only)
     GET ?img=<id>             → the image (live posters only, or admin key)
     POST { name, contact, link, image:{ type, data(base64) }, website }  → { ok:true, id, pending:true, ownerKey }
                                 (website = honeypot, must be empty)
   Owner (no admin key): POST { action:"own-delete", id, key } → poster removed (pending or live)
     (key = the ownerKey returned at upload, kept in that browser's localStorage "df-keys"; only its hash is stored)
   Admin (header x-mm-key must equal the Netlify env var MEETME_ADMIN_KEY — the same SYSOP key as Meet Me):
     GET  ?admin=1                                 → { pending, live }  (with name + contact)
     POST { action:"approve"|"reject"|"delete", id }   (reject/delete also remove the image)
   ========================================================= */
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

const H = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const out = (status, body) => new Response(JSON.stringify(body), { status, headers: H });
const clean = (s, n) => String(s || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const LIM = { name: 40, contact: 80, link: 300, bytes: 2 * 1024 * 1024, live: 120, pending: 100 };
const sha = k => crypto.createHash("sha256").update(String(k) + "|df-owner").digest("hex");
const maltaNow = () => new Date().toLocaleString("sv-SE", { timeZone: "Europe/Malta" }).slice(0, 16).replace(" ", "T");
// optional public link: a full http(s) URL, a bare domain, or an Instagram @handle
function cleanLink(s){
  s = clean(s, LIM.link); if (!s) return "";
  if (/^@[\w.]{1,30}$/.test(s)) return "https://instagram.com/" + s.slice(1);
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try { const u = new URL(s); return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? u.href : null; } catch (e) { return null; }
}

export default async (req, context) => {
  const url = new URL(req.url), hdr = n => req.headers.get(n) || "";
  const store = getStore({ name: "doorframe", consistency: "strong" });
  const get = async k => (await store.get(k, { type: "json" })) || [];
  const isAdmin = () => {
    const want = process.env.MEETME_ADMIN_KEY || "", got = hdr("x-mm-key");
    return want.length >= 8 && got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
  };
  const q = Object.fromEntries(url.searchParams);
  const strip = ({ owner, ip, ...p }) => p;

  if (req.method === "GET") {
    if (q.img) {
      if (!/^d[a-z0-9]+$/.test(q.img)) return out(404, { error: "not-found" });
      const isLive = (await get("live")).some(p => p.id === q.img);
      if (!isLive && !isAdmin()) return out(404, { error: "not-found" });
      const r = await store.getWithMetadata("img/" + q.img, { type: "arrayBuffer" });
      if (!r) return out(404, { error: "not-found" });
      return new Response(r.data, { status: 200, headers: { "Content-Type": (r.metadata && r.metadata.type) || "image/jpeg",
        "Cache-Control": isLive ? "public, max-age=604800" : "no-store" } });
    }
    if (q.admin) {
      if (!isAdmin()) return out(401, { error: "key" });
      return out(200, { pending: (await get("pending")).map(strip), live: (await get("live")).map(strip) });
    }
    return out(200, { posters: (await get("live")).map(({ id, at, link }) => ({ id, at, link: link || "" })) });
  }
  if (req.method !== "POST") return out(405, { error: "method" });

  let b; try { b = JSON.parse((await req.text()) || "{}"); } catch (e) { return out(400, { error: "json" }); }

  // ---- the uploader taking their own poster down (key from their browser) ----
  if (b.action === "own-delete") {
    const pending = await get("pending"), live = await get("live");
    let where = pending, i = pending.findIndex(p => p.id === b.id);
    if (i < 0) { where = live; i = live.findIndex(p => p.id === b.id); }
    if (i < 0) return out(404, { error: "not-found" });
    const key = String(b.key || ""), p = where[i];
    if (!p.owner || !key || !crypto.timingSafeEqual(Buffer.from(sha(key)), Buffer.from(p.owner))) return out(403, { error: "not-owner" });
    where.splice(i, 1); await store.delete("img/" + p.id);
    await store.setJSON("pending", pending); await store.setJSON("live", live);
    return out(200, { ok: true });
  }
  // ---- sysop ----
  if (b.action) {
    if (!isAdmin()) return out(401, { error: "key" });
    const pending = await get("pending"), live = await get("live");
    const i = pending.findIndex(p => p.id === b.id), j = live.findIndex(p => p.id === b.id);
    if (b.action === "approve" && i > -1) {
      const p = pending.splice(i, 1)[0]; delete p.ip; p.up = maltaNow();
      live.unshift(p);
      while (live.length > LIM.live) await store.delete("img/" + live.pop().id);   // oldest fall off a full frame
    } else if (b.action === "reject" && i > -1) await store.delete("img/" + pending.splice(i, 1)[0].id);
    else if (b.action === "delete" && j > -1) await store.delete("img/" + live.splice(j, 1)[0].id);
    else return out(404, { error: "not-found" });
    await store.setJSON("pending", pending); await store.setJSON("live", live);
    return out(200, { ok: true });
  }

  // ---- new poster ----
  if (b.website) return out(200, { ok: true, id: "x", pending: true });          // bot: pretend it worked
  const name = clean(b.name, LIM.name), contact = clean(b.contact, LIM.contact), link = cleanLink(b.link);
  if (!name || contact.length < 3) return out(400, { error: "empty" });
  if (link === null) return out(400, { error: "link" });
  const im = b.image;
  if (!im || !["image/jpeg", "image/webp"].includes(im.type) || typeof im.data !== "string") return out(400, { error: "image-type" });
  const buf = Buffer.from(im.data, "base64");
  if (!buf.length || buf.length > LIM.bytes) return out(413, { error: "image-size" });

  const ip = (context && context.ip) || hdr("x-nf-client-connection-ip") || "";
  const h = crypto.createHash("sha256").update(ip + "|doorframe").digest("hex").slice(0, 16);
  const now = Date.now(), rk = "rate/" + h, r = (await store.get(rk, { type: "json" })) || { t: now, n: 0 };
  if (now - r.t > 10 * 60e3) { r.t = now; r.n = 0; }
  if (r.n >= 4) return out(429, { error: "slow-down" });
  r.n++; await store.setJSON(rk, r);

  const pending = await get("pending");
  if (pending.length >= LIM.pending) return out(503, { error: "queue-full" });
  const id = "d" + now.toString(36) + crypto.randomBytes(2).toString("hex");
  await store.set("img/" + id, buf, { metadata: { type: im.type } });
  const ownerKey = crypto.randomBytes(16).toString("hex");
  pending.push({ id, at: maltaNow(), name, contact, link, ip: h, owner: sha(ownerKey) });
  await store.setJSON("pending", pending);
  return out(200, { ok: true, id, pending: true, ownerKey });
};
