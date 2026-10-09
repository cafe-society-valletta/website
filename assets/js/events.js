/* =========================================================
   EVENTS CALENDAR — month grids (Monday first) from October 2026 (past events stay,
   faded) to a few months ahead; each event is a thumbnail on its day. Tapping a thumbnail
   opens a detail row under that week (one open at a time).

   Events load LIVE from the "Events" Google Calendar via netlify/functions/events.js;
   the EVENTS list below is only a fallback snapshot (used if the feed is unavailable).
   To add a fallback event, add an entry to EVENTS below:
     { date:"2026-10-24", title:"77 Cellar", time:"22:00 – late",
       text:"Line-up, genre, entry…", poster:"assets/img/….jpg", link:"https://…" }
   Weekly events go in WEEKLY (day: 0 = Sunday … 6 = Saturday).
   ========================================================= */
(function(){
  "use strict";

  // Synced from the "Events" Google Calendar (…f47a7@group.calendar.google.com) on 2026-10-02.
  // Events with no poster of their own show the Café Society logo.
  const LOGO = { poster:"assets/img/p-cs-logo.png", posterFit:"contain" };
  // Lost Souls Club nights with no poster of their own show the stacked LSC logo instead (Chef)
  const LSC = { poster:"assets/img/p-lsc-stacked.png", posterFit:"contain", posterSize:"auto 80%", logoAlt:"Lost Souls Club" };
  const isLSC = e => /^lost souls club/i.test(e.title || "");
  // MasterTape (every Tuesday): Chef's poster is the default for any MasterTape night without one of its own
  const MASTERTAPE_POSTER = "assets/img/p-poster-mastertape.jpg";
  const isMasterTape = e => /^master\s*tape/i.test(e.title || "");
  let EVENTS = [
    { date:"2026-09-30", title:"Dusk Busk: Denzel Sharkey", time:"20:00 – 23:00", location:"Cafe Society Valletta",
      text:"Live music on the steps of St. John's Street", poster:"assets/img/p-poster-dusk-busk.jpg",
      socials:[ { platform:"instagram", url:"https://www.instagram.com/denzelsharkey/", label:"@denzelsharkey" },
                { platform:"youtube",   url:"https://www.youtube.com/@DenzelSharkey",   label:"@DenzelSharkey" } ] },
    { date:"2026-10-02", title:"Marz",                      time:"21:00 – 01:00", ...LOGO },
    { date:"2026-10-03", title:"Note Bianca w/ Molario",    time:"21:00 – 01:00", ...LOGO },
    { date:"2026-10-09", title:"Andrea Giordani",           time:"21:00 – 01:00", ...LOGO },
    { date:"2026-10-10", title:"Uzay",                      time:"21:00 – 01:00", ...LOGO },
    { date:"2026-10-11", title:"Lost Souls Club: G2G",      time:"14:00 – 01:00", location:"Cafe Society Valletta",
      text:"OPEN DECKS 2 pm - 10 pm\nThen Pæbo and Tédé behind the decks from 10 pm\n20% off for hospo workers!",
      poster:"https://drive.google.com/thumbnail?id=1WczboRDbkdqqZXByFVllWucJh4z5ZNyw&sz=w1000" },
    { date:"2026-10-16", title:"Society Session w/ Brian James", time:"21:00 – 01:00", ...LOGO },
    { date:"2026-10-17", title:"P Risco",                   time:"21:00 – 01:00", ...LOGO },
    { date:"2026-10-23", title:"ENG",                       time:"21:00 – 01:00", ...LOGO },
    { date:"2026-10-24", title:"Hori",                      time:"21:00 – 01:00", ...LOGO },
    { date:"2026-10-31", title:"Society Session w/ Brian James", time:"21:00 – 01:00", ...LOGO }
  ];

  const WEEKLY = [
    { day:0, title:"Lost Souls Club", time:"Every Sunday",
      text:"Our flagship Sunday night — fully staff-run and operated, with the profits split between the staff who volunteered. Hospitality and nightlife workers get 20% off, ask at the bar for a Lost Souls Club sticker to claim your hospo discount!",
      ...LSC, link:"lostsouls.html" },
    { day:2, title:"MasterTape", time:"20:00 – 23:00", poster:MASTERTAPE_POSTER,
      text:"MasterTape time! Every Tuesday 2 djs sets, one of them being recorded and posted on LostxTape Youtube channel",
      links:[ { url:"https://docs.google.com/forms/d/e/1FAIpQLSeMjhNfxcUjhrnV9O_MBIKoKDs-nND2Ltehu7tSoJ01ER1yUA/viewform", label:"Wanna play? Submit here", form:true } ],
      socials:[ { platform:"youtube", url:"https://youtube.com/@lostxtapesss", label:"@lostxtapesss" } ] }
  ];

  const MONTHS_AHEAD = 3;
  const FIRST_MONTH = new Date(2026, 9, 1);   // October 2026 — nothing earlier is shown
  const cal = document.getElementById("calendar");
  if (!cal) return;

  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const pad = n => String(n).padStart(2,"0");
  const key = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = new Date(); today.setHours(0,0,0,0);

  // Maltese public holidays — worked out for any year (the 14 national holidays; Good Friday from Easter).
  // Holidays that fall on a weekend stay on their date in Malta. CLOSED: the bar is shut (no weekly nights).
  const CLOSED = ["12-25", "01-01"];
  const holCache = {};
  function maltaHolidays(y){
    if (holCache[y]) return holCache[y];
    // Western Easter (anonymous Gregorian algorithm) → Good Friday
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
          g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
          l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
          mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    const gf = new Date(y, mo - 1, da - 2);
    const list = [
      ["01-01", "New Year's Day", "New Year"], ["02-10", "Feast of St Paul's Shipwreck", "St Paul"],
      ["03-19", "Feast of St Joseph", "St Joseph"], [`${pad(gf.getMonth()+1)}-${pad(gf.getDate())}`, "Good Friday", "Good Friday"],
      ["03-31", "Freedom Day", "Freedom Day"], ["05-01", "Workers' Day", "Workers' Day"], ["06-07", "Sette Giugno", "Sette Giugno"],
      ["06-29", "Feast of St Peter & St Paul (Mnarja)", "Mnarja"], ["08-15", "Feast of the Assumption (Santa Marija)", "Santa Marija"],
      ["09-08", "Victory Day", "Victory Day"], ["09-21", "Independence Day", "Independence"],
      ["12-08", "Feast of the Immaculate Conception", "Immaculate"], ["12-13", "Republic Day", "Republic Day"], ["12-25", "Christmas Day", "Christmas"]
    ];
    const map = {};
    list.forEach(([md, name, short]) => { map[`${y}-${md}`] = { name, short }; });
    return holCache[y] = map;
  }
  const EVES = { "12-24": "Christmas Eve", "12-31": "New Year's Eve" };   // labelled, not public holidays
  const holidayOn = d => maltaHolidays(d.getFullYear())[key(d)] || (EVES[key(d).slice(5)] ? { name: EVES[key(d).slice(5)], short: EVES[key(d).slice(5)], eve: true } : null);
  const closedOn = d => CLOSED.includes(key(d).slice(5));

  function eventsOn(d){
    const list = EVENTS.filter(e => e.date === key(d));
    if (!closedOn(d)) WEEKLY.forEach(w => { if (w.day === d.getDay()) list.push(w); });   // no regular nights when we're closed
    return list;
  }

  function el(tag, cls, html){ const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  // desktop hover: a small box over the thumbnail with the event's name, date and time
  const hoverable = window.matchMedia("(hover: hover) and (min-width: 900px)");
  let tip = null;
  function tipShow(t, ev, d){
    if (!hoverable.matches) return;
    if (!tip){ tip = el("div", "ev-tip"); tip.setAttribute("role", "tooltip"); document.body.appendChild(tip); }
    tip.innerHTML = "";
    tip.appendChild(el("div", "tt", "")).textContent = ev.title;
    tip.appendChild(el("div", "td", "")).textContent = `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0,3)}` + (ev.time ? ` · ${ev.time}` : "");
    const r = t.getBoundingClientRect();
    tip.style.left = "0px"; tip.style.top = "0px"; tip.classList.add("on");
    const w = tip.offsetWidth, h = tip.offsetHeight;
    const x = Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
    const y = r.top - h - 10 >= 8 ? r.top - h - 10 : r.bottom + 10;     // above the thumbnail, or below if there's no room
    tip.style.left = x + scrollX + "px"; tip.style.top = y + scrollY + "px";
  }
  function tipHide(){ if (tip) tip.classList.remove("on"); }
  addEventListener("scroll", tipHide, { passive:true });
  document.addEventListener("click", tipHide, true);

  let openPanel = null, openCell = null;
  function closePanel(){
    if (openPanel) openPanel.remove();
    if (openCell) openCell.classList.remove("sel");
    openPanel = openCell = null;
  }

  // Artist links (Instagram, SoundCloud, Spotify…) — parsed from the calendar description by the
  // Netlify function; shown as a row of small icons + handles, grouped by artist when named.
  const ICONS = {
    instagram:'<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/>',
    soundcloud:'<path d="M10 17.5h8a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 10 8.2z" fill="currentColor"/><path d="M3 13.5v4M5.2 12v5.5M7.6 10.5v7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    spotify:'<circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7 9.6c3.6-1 7.3-.6 10.2 1M7.6 12.7c3-.8 6-.4 8.4.9M8.3 15.6c2.4-.6 4.7-.3 6.6.7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    youtube:'<rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>',
    bandcamp:'<path d="M2.5 17.5 8.6 6.5h12.9l-6.1 11z" fill="currentColor"/>',
    ra:'<rect x="2.5" y="4.5" width="19" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><text x="12" y="15.6" text-anchor="middle" font-size="8.5" font-weight="700" fill="currentColor" font-family="Jost, sans-serif">RA</text>',
    tiktok:'<path d="M14 3.5v11a3.8 3.8 0 1 1-3.8-3.8M14 3.5c.4 2.6 2.3 4.4 5 4.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
  };
  const PF_NAMES = { instagram:"Instagram", soundcloud:"SoundCloud", spotify:"Spotify", youtube:"YouTube", bandcamp:"Bandcamp", ra:"Resident Advisor", tiktok:"TikTok" };
  function socialsFor(ev){
    if (!ev.socials || !ev.socials.length) return null;
    const box = el("div","socials");
    const groups = [];
    ev.socials.forEach(s => {
      let g = groups.find(x => x.artist === (s.artist || ""));
      if (!g){ g = { artist: s.artist || "", items: [] }; groups.push(g); }
      g.items.push(s);
    });
    groups.forEach(g => {
      const grp = el("div","grp");
      if (g.artist && groups.length > 1){ const n = el("span","artist"); n.textContent = g.artist; grp.appendChild(n); }
      const row = el("div","links");
      g.items.forEach(s => {
        if (!ICONS[s.platform]) return;
        const a = el("a","soc"); a.href = s.url; a.target = "_blank"; a.rel = "noopener";
        a.setAttribute("aria-label", `${g.artist || ev.title} on ${PF_NAMES[s.platform]}`);
        a.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">${ICONS[s.platform]}</svg><span></span>`;
        a.querySelector("span").textContent = s.label || PF_NAMES[s.platform];
        row.appendChild(a);
      });
      grp.appendChild(row); box.appendChild(grp);
    });
    return box;
  }
  // every non-artist link in the description becomes a button: "Photos →" (a Photo Lab gallery),
  // "Watch →" (a YouTube / Vimeo recording), "Tickets →"… — "Label: <url>" in the description sets the text
  // forms = true → only sign-up form buttons (shown above the artist links); otherwise every other link
  function moreLinks(ev, forms){
    const list = (ev.links || (ev.link ? [{ url: ev.link, label: ev.linkLabel }] : [])).filter(l => !!l.form === !!forms);
    if (!list.length) return null;
    const box = el("div", forms ? "form-links" : "more-links");
    list.forEach(l => {
      let href = l.url;
      try { const u = new URL(l.url, location.href); if (/cafesocietyvalletta\.(com|netlify\.app)$/i.test(u.hostname) || u.origin === location.origin) href = u.pathname.replace(/^\//, "") + u.search + u.hash; } catch (e) {}
      const a = forms ? el("a","form-btn", "") : el("a","more", `${l.label || "More info"} →`); a.href = href;
      if (forms) a.textContent = l.label || "Sign up";
      if (/^https?:/.test(href)){ a.target = "_blank"; a.rel = "noopener"; }
      box.appendChild(a);
    });
    return box;
  }

  // Desktop: clicking an event slides the calendar left and opens the poster panel beside it.
  const detail = document.getElementById("ev-detail");
  const layout = document.getElementById("ev-layout");
  const wide = window.matchMedia("(min-width: 900px)");
  // tiny deterministic PRNG (string → sequence of 0..1)
  function seeded(str){
    let h = 2166136261;
    for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  const EASE = "cubic-bezier(.2,.8,.2,1)";
  let flight = null;
  const thumbOf = cell => cell && cell.querySelector(".thumb");
  // the resting transform of the sheet, written with transform-origin 0 0 so it can be tweened
  function restTransform(slap, w, h){
    const cs = getComputedStyle(slap), cx = w * .5, cy = h * .4;
    return `translate(${cs.getPropertyValue("--dx")}, ${cs.getPropertyValue("--dy")}) translate(${cx}px, ${cy}px) rotate(${cs.getPropertyValue("--rot")}) translate(${-cx}px, ${-cy}px)`;
  }
  // transform that puts the sheet's poster exactly over the calendar thumbnail
  function thumbTransform(slap, thumb){
    const S = slap.getBoundingClientRect(), T = thumb.getBoundingClientRect();   // S measured with transform:none
    const s = T.width / S.width;
    return `translate(${T.left - S.left}px, ${T.top + T.height / 2 - S.height * s / 2 - S.top}px) scale(${s})`;
  }
  let closing = false;
  function hideDetail(instant){
    if (!layout || !layout.classList.contains("open")){ return; }
    if (closing) return;                      // already flying back (the × click also reaches the click-outside handler)
    const cell = openCell, thumb = thumbOf(cell), slap = detail.querySelector(".slap");
    const finish = () => {
      layout.classList.remove("open", "dim", "flying");
      document.body.classList.remove("ev-open", "ev-dim");
      // every thumbnail comes back and every day is deselected — a second close call (e.g. the click on × also counting
      // as a click outside) used to arrive with no cell and leave the poster's thumbnail hidden until a refresh
      layout.querySelectorAll(".thumb.away").forEach(t => t.classList.remove("away"));
      layout.querySelectorAll(".day.sel").forEach(c => c.classList.remove("sel"));
    };
    if (openCell === cell) openCell = null;
    if (flight) flight.cancel();
    if (instant === true || still.matches || !slap || !thumb){ finish(); return; }
    // fly the poster back into its thumbnail while the calendar comes forward again
    layout.classList.add("flying"); layout.classList.remove("dim"); document.body.classList.remove("ev-dim");
    const S = slap.getBoundingClientRect();
    slap.style.transform = "none";
    const from = restTransform(slap, slap.offsetWidth, slap.offsetHeight), to = thumbTransform(slap, thumb);
    slap.style.transform = "";
    flight = slap.animate([{ transform: from, transformOrigin: "0 0", opacity: 1 }, { transform: to, transformOrigin: "0 0", opacity: 1 }],
      { duration: 380, easing: "cubic-bezier(.5,0,.75,.4)", fill: "forwards" });
    closing = true;
    const f = flight, done = () => { if (!closing) return; closing = false; if (flight === f) flight = null; finish(); };
    f.onfinish = () => { done(); calFlip(false); };
    f.oncancel = done;
    setTimeout(done, 700);   // safety: animations don't run in a background tab, the thumbnail must still come back
  }
  // calendar slides (desktop) from where it was to where the new layout puts it
  function calFlip(open, before){
    const c = layout.querySelector(".cal"); if (!c || still.matches) return;
    if (before){
      const after = c.getBoundingClientRect(), dx = before.left - after.left;
      if (Math.abs(dx) > 1) c.animate([{ transform: `translateX(${dx}px)` }, { transform: "none" }], { duration: 550, easing: EASE });
    }
  }
  function showDetail(ev, d, cell){
    if (openCell) openCell.classList.remove("sel");
    openCell = cell || null; if (cell) cell.classList.add("sel");
    detail.innerHTML = `<div class="slap"><div class="inner"><img class="poster" alt=""></div>
      <i class="tape tl"></i><i class="tape tr"></i><i class="tape bl"></i><i class="tape br"></i></div>
      <div class="details"><span class="kicker">Event details:</span><button class="x" type="button" aria-label="Close"><svg width="12" height="12" viewBox="0 0 14 14"><path d="M1 1 L13 13 M13 1 L1 13" fill="none" stroke="#FFFFFF" stroke-width="1.6"/></svg></button><div class="when"><span class="date"></span><span class="time"></span></div><h3></h3><a class="loc" target="_blank" rel="noopener"></a><p></p></div>`;
    // each event gets its own slightly-askew spot, tilt and torn edge (stable: hashed from title + date)
    const r = seeded(ev.title + key(d)), slap = detail.querySelector(".slap");
    const sign = r() < .5 ? -1 : 1, narrow = !wide.matches;
    slap.style.setProperty("--rot", (sign * (1.5 + r() * 4.5)).toFixed(2) + "deg");   // tilt is the main variation: 1.5–6°
    slap.style.setProperty("--dx", ((r() * 2 - 1) * (narrow ? 2 : 3)).toFixed(1) + "px");   // stays near the centre of its space
    slap.style.setProperty("--dy", ((r() * 2 - 1) * (narrow ? 2 : 3)).toFixed(1) + "px");
        detail.querySelector(".inner").classList.add("edge-" + "abc"[Math.floor(r() * 3)]);
    // four strips of tape, each at its own angle / offset, all pressed on the moment the poster lands
    const base = { tl:-1, tr:1, bl:1, br:-1 };
    detail.querySelectorAll(".tape").forEach((t, i) => {
      const c = t.classList[1];
      t.style.setProperty("--ta", (base[c] * (36 + r() * 14) + (r() * 2 - 1) * 4).toFixed(1) + "deg");
      t.style.setProperty("--tx", ((r() * 2 - 1) * 5).toFixed(1) + "px");
      t.style.setProperty("--ty", ((r() * 2 - 1) * 5).toFixed(1) + "px");
    });
    const img = detail.querySelector(".poster");
    const useLogo = () => {
      const own = ev.posterFit === "contain" && ev.poster;            // a logo of its own (e.g. Lost Souls Club), else the bar's
      img.src = own ? ev.poster : "assets/img/p-cs-logo.png"; img.alt = own && ev.logoAlt || "Café Society Valletta"; img.classList.add("logo");
    };
    if (ev.poster && ev.posterFit !== "contain"){ img.src = ev.poster; img.alt = `${ev.title} poster`; img.onerror = () => { img.onerror = null; useLogo(); }; }
    else useLogo();
    detail.querySelector(".when .date").textContent = `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0,3)}`;
    const tEl = detail.querySelector(".when .time"); if (ev.time) tEl.textContent = ev.time; else tEl.remove();
    // location (from the calendar event's Location field; defaults to the bar) → opens in Google Maps
    const place = ev.location || "Café Society Valletta, 13 St John's Street";
    const loc = detail.querySelector(".loc");
    loc.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(/valletta|malta/i.test(place) ? place : place + ", Valletta, Malta");
    loc.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M12 21s-6.5-6.1-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.9-6.5 11-6.5 11z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.3" fill="currentColor"/></svg><span></span>';
    loc.querySelector("span").textContent = place;
    detail.querySelector("h3").textContent = ev.title;
    const p = detail.querySelector("p"); if (ev.text) p.textContent = ev.text; else p.remove();
    const dBox = detail.querySelector(".details"), dSoc = socialsFor(ev);
    const dForm = moreLinks(ev, true); if (dForm) dBox.appendChild(dForm);
    if (dSoc) dBox.appendChild(dSoc);
    const dMore = moreLinks(ev); if (dMore) dBox.appendChild(dMore);
    if (d < today){ detail.querySelector(".kicker").textContent = "Past event:"; }
    detail.querySelector(".x").addEventListener("click", () => hideDetail());
    const thumb = thumbOf(cell);
    const wasOpen = layout.classList.contains("open");
    const calBefore = layout.querySelector(".cal").getBoundingClientRect();
    closing = false;                          // a fly-back still running must not tidy up over this new poster
    if (flight){ flight.cancel(); flight = null; }
    layout.querySelectorAll(".thumb.away").forEach(t => t.classList.remove("away"));
    // snap to the final layout (no transitions) so the end positions can be measured
    const animate = !still.matches && !!thumb;
    layout.classList.add("snap", "open"); if (animate) layout.classList.add("flying"); document.body.classList.add("ev-snap");
    if (!wide.matches) document.body.classList.add("ev-open");
    void layout.offsetWidth;
    layout.classList.remove("snap"); document.body.classList.remove("ev-snap");
    requestAnimationFrame(() => { layout.classList.add("dim"); document.body.classList.add("ev-dim"); });
    if (!wide.matches){ detail.scrollTop = 0; detail.querySelector(".x").focus({ preventScroll:true }); }
    const tapeOn = () => slap.classList.add("taped");
    if (!animate){ tapeOn(); return; }
    if (!wasOpen) calFlip(true, calBefore);
    // FLIP: the thumbnail zooms out into the full poster
    slap.style.transform = "none";
    const from = thumbTransform(slap, thumb), to = restTransform(slap, slap.offsetWidth, slap.offsetHeight);
    slap.style.transform = "";
    thumb.classList.add("away");
    flight = slap.animate([
      { transform: from, transformOrigin: "0 0", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.4))" },
      { transform: to,   transformOrigin: "0 0", filter: "drop-shadow(0 10px 20px rgba(0,0,0,.55)) drop-shadow(0 1px 2px rgba(0,0,0,.5))" }
    ], { duration: 560, easing: EASE });
    // the ease-out tail is invisible: the poster is at ~97% size by 60% of the flight — tape and details land then
    const landed = () => { layout.classList.remove("flying"); tapeOn(); };
    const landTimer = setTimeout(landed, 300);
    flight.onfinish = () => { flight = null; clearTimeout(landTimer); landed(); };
    flight.oncancel = () => { flight = null; clearTimeout(landTimer); layout.classList.remove("flying"); };
  }
  // a click/tap anywhere closes the open poster (Chef) — except links (location, artist icons, More info, menu)
  // and other events' thumbnails, which switch to that event instead
  if (detail){
    document.addEventListener("click", e => {
      if (!layout || !layout.classList.contains("open")) return;
      if (e.target.closest("a, .thumb")) return;
      hideDetail();
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && layout && layout.classList.contains("open")) hideDetail(); });
    wide.addEventListener("change", () => document.body.classList.toggle("ev-open", !wide.matches && layout.classList.contains("open")));
  }

  function panelFor(ev, d, cell, weekRow){
    if (detail){ showDetail(ev, d, cell); return; }
    closePanel();
    const p = el("div","ev-panel");
    const when = `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0,3)}${ev.time ? " · " + ev.time : ""}`;
    p.innerHTML = `
      <div class="top"><span class="when"></span>
        <button class="x" type="button" aria-label="Close"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1 L13 13 M13 1 L1 13" fill="none" stroke="#FFFFFF" stroke-width="1.5"/></svg></button></div>
      <div class="row"><div class="poster"></div>
        <div class="info"><h3></h3><p></p></div></div>`;
    p.querySelector(".when").textContent = when;
    p.querySelector("h3").textContent = ev.title;
    p.querySelector("p").textContent = ev.text || "";
    const poster = p.querySelector(".poster");
    if (ev.poster){ poster.style.backgroundImage = `url('${ev.poster}')`; if (ev.posterFit === "contain"){ poster.style.backgroundSize = ev.posterSize || "88% auto"; poster.style.backgroundColor = "#0A0A0A"; poster.style.border = "1px solid rgba(255,255,255,.3)"; } }
    const pSoc = socialsFor(ev);
    const pForm = moreLinks(ev, true); if (pForm) p.querySelector(".info").appendChild(pForm);
    if (pSoc) p.querySelector(".info").appendChild(pSoc);
    const pMore = moreLinks(ev); if (pMore) p.querySelector(".info").appendChild(pMore);
    p.querySelector(".x").addEventListener("click", closePanel);
    weekRow.after(p);
    cell.classList.add("sel");
    openPanel = p; openCell = cell;
  }

  let months = [];
  function render(){
  closePanel(); hideDetail(true); cal.innerHTML = ""; months = [];
  // months run from the first month the calendar covers (October 2026 — past events stay up, no
  // lifespan cutoff yet) to at least MONTHS_AHEAD months from now, or the month of the last listed
  // event (max 6 ahead); the page scrolls to the current month on arrival
  const thisIdx = (today.getFullYear() - FIRST_MONTH.getFullYear()) * 12 + today.getMonth() - FIRST_MONTH.getMonth();
  const lastEv = EVENTS.reduce((m, e) => e.date > m ? e.date : m, "");
  const lastIdx = lastEv ? (+lastEv.slice(0,4) - FIRST_MONTH.getFullYear()) * 12 + (+lastEv.slice(5,7) - 1 - FIRST_MONTH.getMonth()) : 0;
  const count = Math.max(thisIdx + MONTHS_AHEAD, Math.min(thisIdx + 6, lastIdx + 1));
  const offset = 0;
  for (let i = offset; i < count; i++){
    const first = new Date(FIRST_MONTH.getFullYear(), FIRST_MONTH.getMonth() + i, 1);
    const box = el("section","month");
    box.setAttribute("aria-label", `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`);
    const head = el("div","m-head");
    const prev = el("button", null, "←"); prev.type = "button"; prev.setAttribute("aria-label","Previous month");
    const next = el("button", null, "→"); next.type = "button"; next.setAttribute("aria-label","Next month");
    const h2 = el("h2", null); h2.textContent = `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`;
    head.append(prev, h2, next);
    box.appendChild(head);
    const days = el("div","m-days");
    ["MON","TUE","WED","THU","FRI","SAT","SUN"].forEach(n => days.appendChild(el("span", null, n)));
    box.appendChild(days);

    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7)); // back to Monday
    const d = new Date(start);
    do {
      const row = el("div","week");
      for (let c = 0; c < 7; c++){
        const cell = el("div","day");
        const date = new Date(d);
        cell.dataset.date = key(date);
        if (date.getMonth() !== first.getMonth()) cell.classList.add("out");
        if (+date === +today) cell.classList.add("today");
        const top = el("div","top"); top.appendChild(el("span","n", String(date.getDate()))); cell.appendChild(top);
        if (date.getMonth() === first.getMonth()){
          const hol = holidayOn(date), shut = closedOn(date);
          if (shut){
            cell.classList.add("closed"); cell.title = (hol ? hol.name + " — " : "") + "Closed";
            cell.appendChild(el("span","shut","Closed"));
          }
          if (hol){
            if (!shut) cell.classList.add("hol");
            if (!shut) cell.title = hol.name + (hol.eve ? "" : " (public holiday)");
            const lab = el("span","hol-name"); lab.innerHTML = `<span class="full"></span><span class="short"></span>`;
            lab.querySelector(".full").textContent = hol.name.replace(/^Feast of (the )?/, "").replace(/ \(.*\)$/, "");
            lab.querySelector(".short").textContent = hol.short;
            top.appendChild(lab);
          }
          const past = date < today;
          const evs = past ? EVENTS.filter(e => e.date === key(date)) : eventsOn(date);   // past: one-off events only (no weekly)
          if (evs.length){
            const ev = evs[0];
            const t = el("button", past ? "thumb past" : "thumb"); t.type = "button";
            { let h = 0; for (const ch of key(date)) h = (h * 31 + ch.charCodeAt(0)) | 0;   // ever so slightly askew, same tilt every visit
              t.style.setProperty("--tilt", (((h >>> 0) % 1000) / 1000 * 9 - 4.5).toFixed(2) + "deg"); }
            t.setAttribute("aria-label", `${ev.title}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`);
            if (ev.poster) t.style.backgroundImage = `url('${ev.poster}')`;
            if (ev.posterFit === "contain"){ t.style.backgroundSize = ev.posterSize || "90% auto"; t.style.backgroundColor = "#0A0A0A"; }
            t.addEventListener("click", () => {
              if (openCell === cell){ if (detail) hideDetail(); else closePanel(); }
              else panelFor(ev, date, cell, row);
            });
            t.addEventListener("mouseenter", () => tipShow(t, ev, date));
            t.addEventListener("mouseleave", tipHide);
            cell.appendChild(t);
          }
        }
        row.appendChild(cell);
        d.setDate(d.getDate() + 1);
      }
      box.appendChild(row);
    } while (d.getMonth() === first.getMonth());
    months.push({ box, prev, next, first });
    cal.appendChild(box);
  }
  months.forEach((m, i) => {
    m.prev.disabled = i === 0;
    m.next.disabled = i === months.length - 1;
    m.prev.addEventListener("click", () => showMonth(i - 1));
    m.next.addEventListener("click", () => showMonth(i + 1));
  });
  // desktop shows one month at a time (CSS hides the rest); keep the month being viewed across re-renders
  let idx = curFirst ? months.findIndex(m => +m.first === +curFirst) : -1;
  if (idx < 0) idx = months.findIndex(m => m.first.getFullYear() === today.getFullYear() && m.first.getMonth() === today.getMonth());
  showMonth(idx < 0 ? 0 : idx);
  }
  let curFirst = null;
  function showMonth(i){
    if (!months[i]) return;
    months.forEach((m, j) => m.box.classList.toggle("cur", j === i));
    curFirst = months[i].first;
    fitHolidays();
  }
  // arrive on the current month (earlier months sit above it) — re-applied after the live feed
  // re-renders, unless the visitor has already started scrolling
  let moved = false;
  ["wheel","touchmove","keydown","mousedown"].forEach(t => addEventListener(t, () => { moved = true; }, { once:true, passive:true }));
  function toThisMonth(){
    if (moved || location.hash || wide.matches) return;   // desktop: one month on show, nothing to scroll to
    const m = months.find(x => x.first.getFullYear() === today.getFullYear() && x.first.getMonth() === today.getMonth());
    if (m && months.indexOf(m) > 0) requestAnimationFrame(() => m.box.scrollIntoView({ block:"start" }));
  }
  // shrink each holiday name until the whole name fits beside the date, above the thumbnail
  function fitHolidays(){
    // every label gets the same size: the largest that lets the longest name fit beside its date and above a
    // full-size thumbnail (room is reserved for one even on days without an event)
    const labs = [...cal.querySelectorAll(".day .hol-name")].filter(l => l.offsetParent);   // desktop shows one month at a time
    if (!labs.length) return;
    const anyThumb = cal.querySelector(".thumb"), thH = anyThumb ? anyThumb.offsetHeight : (wide.matches ? 92 : 42);
    labs.forEach(l => l.style.fontSize = "");
    let fs = parseFloat(getComputedStyle(labs[0]).fontSize);
    const fits = lab => {
      const cell = lab.closest(".day"), cs = getComputedStyle(cell);
      const room = cell.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - thH - 2;
      return lab.scrollWidth <= lab.clientWidth + .5 && lab.scrollHeight <= room;
    };
    while (fs > 3.5 && !labs.every(fits)){ fs -= .25; labs.forEach(l => l.style.fontSize = fs + "px"); }
  }

  render(); toThisMonth(); fitHolidays();
  if (document.fonts) document.fonts.ready.then(fitHolidays);
  addEventListener("resize", () => { clearTimeout(fitHolidays.t); fitHolidays.t = setTimeout(fitHolidays, 150); });
  wide.addEventListener && wide.addEventListener("change", () => { closePanel(); hideDetail(true); });

  // Live events straight from the Google Calendar (netlify/functions/events.js).
  // If the feed can't be reached (local preview, calendar not public), the list above stays.
  if (location.protocol.startsWith("http")){
    fetch("/.netlify/functions/events", { cache:"no-store" })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (!data || !Array.isArray(data.events)) return;
        EVENTS = data.events.map(e => e.poster ? e : Object.assign({}, isLSC(e) ? LSC : isMasterTape(e) ? { poster:MASTERTAPE_POSTER } : LOGO, e));
        render(); toThisMonth(); fitHolidays();
      })
      .catch(() => {});
  }
})();
