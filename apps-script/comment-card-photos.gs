/**
 * Café Society — Comment Card Photos (Google Apps Script web app)
 *
 * The website's comment card (cafesocietyvalletta.com/tip) lets guests attach up to 4 photos.
 * netlify/functions/comment.mjs sends them here; this script saves them into the Drive folder
 * "Comment Card Photos" (one subfolder per trading day) and answers with their links, which
 * the function writes into the card's row in Coda.
 *
 * NO SECRETS IN THIS FILE. The shared secret lives in Script Properties (CC_SECRET) here and in
 * Netlify env (CC_PHOTO_SECRET) — the same random string in both places, set by Chef.
 *
 * Setup (once, by Chef, signed in as the Google account that owns the folder):
 *   1. script.google.com → New project → paste this file → Save.
 *   2. Project Settings → Script Properties → add CC_SECRET = <a long random string you make up>.
 *   3. Deploy → New deployment → type "Web app" → Execute as: Me → Who has access: Anyone → Deploy,
 *      and allow the Drive permission Google asks for.
 *   4. Copy the web app URL (ends in /exec). In Netlify → Site configuration → Environment variables add
 *      CC_PHOTO_URL = that URL and CC_PHOTO_SECRET = the same string as step 2. Redeploy the site.
 */
const FOLDER_ID = "1fq0Buyr-Fgx_TtYzDs8-ZDFMAaaA9tLm";   // Drive: "Comment Card Photos"
const MAX_PHOTOS = 4, MAX_BYTES = 2 * 1024 * 1024;

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty("CC_SECRET");
    if (!secret || body.secret !== secret) return out_({ error: "forbidden" });

    const day = /^\d{4}-\d{2}-\d{2}$/.test(body.serviceDate) ? body.serviceDate : "undated";
    const root = DriveApp.getFolderById(FOLDER_ID);
    const it = root.getFoldersByName(day);
    const folder = it.hasNext() ? it.next() : root.createFolder(day);

    const stamp = Utilities.formatDate(new Date(), "Europe/Malta", "HHmmss");
    const who = String(body.name || "guest").replace(/[^\w\- ]+/g, "").trim().slice(0, 30) || "guest";
    const links = [];
    (body.photos || []).slice(0, MAX_PHOTOS).forEach(function (p, i) {
      const type = /^image\/(jpeg|png|webp|heic|heif)$/.test(p.type) ? p.type : "image/jpeg";
      const bytes = Utilities.base64Decode(String(p.data || ""));
      if (!bytes.length || bytes.length > MAX_BYTES) return;
      const ext = type.split("/")[1].replace("jpeg", "jpg");
      const tag = body.photoUse === "OK for content" ? "CONTENT-OK" : "PRIVATE";
      const file = folder.createFile(Utilities.newBlob(bytes, type, day + " " + stamp + " " + who + " " + (i + 1) + " " + tag + "." + ext));
      const use = body.photoUse === "OK for content" ? "OK for content" : "Just for our eyes";
      file.setDescription("Comment card photo · " + day + " · " + use + (body.message ? " · " + String(body.message).slice(0, 200) : ""));
      links.push(file.getUrl());
    });
    return out_({ ok: true, links: links });
  } catch (err) {
    return out_({ error: "failed" });
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
