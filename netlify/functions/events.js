/* =========================================================
   /.netlify/functions/events — live feed for the Events Calendar.

   Reads the public iCal feed of the "Events" Google Calendar and returns
   upcoming events as JSON for assets/js/events.js. No API key is used; the
   calendar only needs to be shared publicly in Google Calendar
   (Settings → Access permissions → "Make available to public" →
   "See all event details"). Zero dependencies — no build step needed.
   ========================================================= */
"use strict";

const CAL_ID = "110b92e33944a25f0690ba21c0fef7a40ab58f2b8ef1502bfcf60310618f47a7@group.calendar.google.com";
const FEED = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CAL_ID)}/public/basic.ics`;
const TZ = "Europe/Malta";
// Past events stay on the calendar from the first month the site shows (October 2026) — no lifespan
// cutoff yet (Chef, 2026-10-01). Upcoming events: the next DAYS_AHEAD days.
const FIRST_DAY = Date.UTC(2026, 9, 1), DAYS_AHEAD = 150;

// ---------- iCal parsing ----------
function unfold(text){ return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, ""); }
function unescape(v){ return v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1"); }

function parseICS(text){
  const events = [];
  let cur = null;
  for (const line of unfold(text).split("\n")){
    if (line === "BEGIN:VEVENT"){ cur = { exdates: [] }; continue; }
    if (line === "END:VEVENT"){ if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(":"); if (i < 0) continue;
    const head = line.slice(0, i), value = line.slice(i + 1);
    const [name, ...params] = head.split(";");
    const p = Object.fromEntries(params.map(s => s.split("=")));
    switch (name){
      case "SUMMARY": cur.title = unescape(value).trim(); break;
      case "DESCRIPTION": cur.text = unescape(value).trim(); break;
      case "LOCATION": cur.location = unescape(value).trim(); break;
      case "DTSTART": cur.start = { value, tzid: p.TZID, date: p.VALUE === "DATE" }; break;
      case "DTEND": cur.end = { value, tzid: p.TZID, date: p.VALUE === "DATE" }; break;
      case "RRULE": cur.rrule = Object.fromEntries(value.split(";").map(s => s.split("="))); break;
      case "EXDATE": value.split(",").forEach(v => cur.exdates.push(v.slice(0, 8))); break;
      case "RECURRENCE-ID": cur.recurrenceId = value.slice(0, 8); break;
      case "STATUS": cur.status = value; break;
      case "UID": cur.uid = value; break;
      case "ATTACH": (cur.attach = cur.attach || []).push({ url: value, type: p.FMTTYPE || "", name: p.FILENAME || "" }); break;
    }
  }
  return events;
}

// Local (Malta) wall-clock parts for an iCal date-time.
const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
function local(dt){
  if (!dt) return null;
  const v = dt.value;
  const y = +v.slice(0, 4), mo = +v.slice(4, 6), d = +v.slice(6, 8);
  if (dt.date) return { y, mo, d, h: null, mi: null };
  const h = +v.slice(9, 11), mi = +v.slice(11, 13);
  if (v.endsWith("Z")){
    const parts = Object.fromEntries(fmt.formatToParts(new Date(Date.UTC(y, mo - 1, d, h, mi))).map(x => [x.type, x.value]));
    return { y: +parts.year, mo: +parts.month, d: +parts.day, h: +parts.hour, mi: +parts.minute };
  }
  return { y, mo, d, h, mi };   // TZID times (the calendar is set to Malta) are already local
}
const pad = n => String(n).padStart(2, "0");
const ymd = t => `${t.y}-${pad(t.mo)}-${pad(t.d)}`;
const hm = t => (t && t.h != null) ? `${pad(t.h)}:${pad(t.mi)}` : "";

// ---------- description → text, poster, "More info" link and artist socials ----------
// Paste links on their own lines in the event description. Instagram / SoundCloud / Spotify /
// YouTube / Bandcamp / Resident Advisor / TikTok profile links become artist icon links; "Name: <url>"
// groups a link under that artist; an image URL becomes the poster. Every other URL becomes a
// button — "Label: <url>" sets its text (Tickets:, Photos:, Recording:…); unlabelled, a video
// (YouTube watch / youtu.be / live / shorts, Vimeo) reads "Watch", a Photo Lab gallery link reads
// "Photos", anything else "More info".
const PLATFORMS = [
  { id:"instagram",  re:/(^|\.)instagram\.com$/i },
  { id:"soundcloud", re:/(^|\.)soundcloud\.com$/i },
  { id:"spotify",    re:/(^|\.)spotify\.com$/i },
  { id:"youtube",    re:/(^|\.)(youtube\.com|youtu\.be)$/i },
  { id:"bandcamp",   re:/(^|\.)bandcamp\.com$/i },
  { id:"ra",         re:/(^|\.)ra\.co$|(^|\.)residentadvisor\.net$/i },
  { id:"tiktok",     re:/(^|\.)tiktok\.com$/i }
];
const NAMES = { instagram:"Instagram", soundcloud:"SoundCloud", spotify:"Spotify", youtube:"YouTube", bandcamp:"Bandcamp", ra:"Resident Advisor", tiktok:"TikTok" };

function htmlToText(v){
  return v
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>/gi, "$1")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function social(url){
  let u; try { u = new URL(url); } catch { return null; }
  const pf = PLATFORMS.find(x => x.re.test(u.hostname));
  if (!pf) return null;
  const seg = u.pathname.split("/").filter(Boolean);
  let handle = "";
  if (pf.id === "instagram" || pf.id === "soundcloud") handle = seg[0] ? "@" + seg[0] : "";
  else if (pf.id === "youtube") handle = (seg[0] || "").startsWith("@") ? seg[0] : "";
  else if (pf.id === "tiktok") handle = (seg[0] || "").startsWith("@") ? seg[0] : "";
  else if (pf.id === "bandcamp") handle = u.hostname.split(".")[0] !== "bandcamp" ? u.hostname.split(".")[0] : "";
  else if (pf.id === "ra") handle = seg[0] === "dj" && seg[1] ? seg[1] : "";
  // drop share/tracking parameters (igsh=, si=, utm_…)
  if (pf.id !== "youtube") u.search = "";
  u.hash = "";
  return { platform: pf.id, url: u.toString(), label: handle || NAMES[pf.id] };
}

const isVideo = u => /(^|\.)youtu\.be$/i.test(u.hostname) || (/(^|\.)youtube\.com$/i.test(u.hostname) && /^\/(watch|live\/|shorts\/|embed\/)/.test(u.pathname)) || /(^|\.)vimeo\.com$/i.test(u.hostname);
const isGallery = u => /(^|\.)cafesocietyvalletta\.(com|netlify\.app)$/i.test(u.hostname) && /gallery/.test(u.pathname);
function parseDescription(raw){
  const out = {}, socials = [], rest = [], links = [];
  for (let line of htmlToText(raw).split("\n")){
    line = line.trim();
    const urls = line.match(/https?:\/\/[^\s<>"]+/gi) || [];
    let left = line.replace(/https?:\/\/[^\s<>"]+/gi, "").trim();
    const m = left.match(/^(.+?)\s*[:\-–—]\s*$/);            // "Denzel Sharkey: <url>"
    for (const url of urls){
      if (/\.(?:jpe?g|png|webp|gif)(?:\?\S*)?$/i.test(url) && !out.poster){ out.poster = url; continue; }
      let u = null; try { u = new URL(url); } catch {}
      const s = u && !isVideo(u) ? social(url) : null;
      if (s){ if (m) s.artist = m[1].trim(); socials.push(s); continue; }
      const link = { url };
      if (left && left.length <= 30 && urls.length === 1){ link.label = left.replace(/[:\-–—]\s*$/, "").trim(); left = ""; }
      else if (u && isVideo(u)) link.label = "Watch";
      else if (u && isGallery(u)) link.label = "Photos";
      links.push(link);
    }
    if (urls.length && m) left = "";
    rest.push(left);
  }
  const text = rest.filter(Boolean).join("\n").trim();
  if (text) out.text = text;
  if (socials.length) out.socials = socials;
  if (links.length){ out.links = links; out.link = links[0].url; if (links[0].label) out.linkLabel = links[0].label; }   // link/linkLabel kept for older pages
  return out;
}

// Expand simple DAILY / WEEKLY / MONTHLY repeats (enough for bar listings).
function occurrences(ev, from, to){
  const s = local(ev.start); if (!s) return [];
  const first = new Date(Date.UTC(s.y, s.mo - 1, s.d));
  if (!ev.rrule) return [first];
  const r = ev.rrule, out = [];
  const until = r.UNTIL ? new Date(Date.UTC(+r.UNTIL.slice(0, 4), +r.UNTIL.slice(4, 6) - 1, +r.UNTIL.slice(6, 8))) : null;
  const count = r.COUNT ? +r.COUNT : Infinity, step = r.INTERVAL ? +r.INTERVAL : 1;
  const byday = r.BYDAY ? r.BYDAY.split(",").map(x => ["SU","MO","TU","WE","TH","FR","SA"].indexOf(x.slice(-2))) : null;
  let n = 0;
  for (let d = new Date(first); d <= to && n < count && out.length < 400; d.setUTCDate(d.getUTCDate() + 1)){
    if (until && d > until) break;
    const days = Math.round((d - first) / 864e5);
    let hit = false;
    if (r.FREQ === "DAILY") hit = days % step === 0;
    else if (r.FREQ === "WEEKLY"){
      const wk = Math.floor(days / 7);
      hit = wk % step === 0 && (byday ? byday.includes(d.getUTCDay()) : d.getUTCDay() === first.getUTCDay());
    } else if (r.FREQ === "MONTHLY") hit = d.getUTCDate() === first.getUTCDate();
    else if (r.FREQ === "YEARLY") hit = d.getUTCDate() === first.getUTCDate() && d.getUTCMonth() === first.getUTCMonth();
    if (!hit) continue;
    n++;
    out.push(new Date(d));
  }
  return out;
}

exports.handler = async () => {
  try {
    const res = await fetch(FEED, { headers: { "User-Agent": "cafesocietyvalletta.com" } });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    const raw = parseICS(await res.text());

    const now = new Date();
    const from = new Date(FIRST_DAY);
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + DAYS_AHEAD));

    // one-off edits of a repeating event replace that day's occurrence
    const overrides = new Set(raw.filter(e => e.recurrenceId).map(e => `${e.uid}|${e.recurrenceId}`));

    const events = [];
    for (const ev of raw){
      if (ev.status === "CANCELLED" || !ev.title) continue;
      const s = local(ev.start), e = local(ev.end);
      const time = s && s.h != null ? `${hm(s)}${e && e.h != null ? " – " + hm(e) : ""}` : "";
      for (const d of occurrences(ev, from, to)){
        if (d < from || d > to) continue;
        const key = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
        if (ev.exdates.includes(key)) continue;
        if (!ev.recurrenceId && ev.rrule && overrides.has(`${ev.uid}|${key}`)) continue;
        const item = { date: `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6)}`, title: ev.title, time };
        if (ev.location) item.location = ev.location;
        if (ev.text) Object.assign(item, parseDescription(ev.text));
        // an image attached to the event (e.g. a poster in Google Drive) becomes the poster.
        // Drive files must be shared "Anyone with the link" for visitors to see them.
        if (!item.poster && ev.attach){
          const a = ev.attach.find(x => /^image\//i.test(x.type) || /\.(png|jpe?g|webp|gif)$/i.test(x.name));
          if (a){
            const id = (a.url.match(/[?&]id=([\w-]+)/) || a.url.match(/\/d\/([\w-]+)/) || [])[1];
            item.poster = id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : a.url;
          }
        }
        events.push(item);
      }
    }
    events.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" },
      body: JSON.stringify({ updated: now.toISOString(), events })
    };
  } catch (err) {
    return { statusCode: 502, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: String(err.message || err) }) };
  }
};
