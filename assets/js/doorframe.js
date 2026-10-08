/* DIGITAL DOORFRAME (events page) — Society's doorframe, where anyone can tape up a poster.
   A loop of A3 posters drifts up the left edge; only their edges peek out until you hover,
   click/tap the edge or swipe in from the left. Then the strip slides fully in, hugging the
   left border, and the calendar shifts right. Scroll / swipe on the strip to speed it along.
   Clicking a poster zooms it in askew with rough edges + tape (same look as the calendar posters). */
(function(){
  const df = document.querySelector(".doorframe"); if (!df) return;
  const track = df.querySelector(".df-track");
  const root = document.documentElement;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const canHover = matchMedia("(hover:hover)");

  // posters come from /.netlify/functions/doorframe (approved in the SYSOP CONSOLE); fillers until the first one goes up
  const API = "/.netlify/functions/doorframe";
  const P = "assets/img/";
  const FILLER = [   // placeholders until real posters are approved (Chef, Oct 2026)
    { src:P + "p-cs-logo.png", alt:"Café Society Valletta", logo:true },
    { src:P + "p-lsc-stacked.png", alt:"Lost Souls Club", logo:true },
    { src:P + "p-poster-mastertape.jpg", alt:"MasterTape poster" },
    { src:P + "p-df-dusk-busk.jpg", alt:"Dusk Busk poster" }
  ];
  function seeded(str){
    let h = 2166136261;
    for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  let keys = {}; try{ keys = JSON.parse(localStorage.getItem("df-keys") || "{}") || {}; }catch(e){}
  const saveKeys = () => { try{ localStorage.setItem("df-keys", JSON.stringify(keys)); }catch(e){} };
  // one set repeated until it's taller than the screen, then two copies of that → seamless loop
  const make = (p, i, copy) => {
    const r = seeded((p.id || p.src) + i);
    const b = document.createElement("button");
    b.type = "button"; b.className = "df-poster";
    b.style.setProperty("--rot", ((r() * 2 - 1) * 2.2).toFixed(2) + "deg");
    b.style.setProperty("--nx", ((r() * 2 - 1) * 4).toFixed(1) + "px");
    b.style.setProperty("--ta", ((r() * 2 - 1) * 9).toFixed(1) + "deg");
    b.dataset.seed = (p.id || p.src) + i; if (p.id) b.dataset.id = p.id;
    if (copy) b.tabIndex = -1;
    b.setAttribute("aria-label", p.alt);
    b.innerHTML = `<span class="inner"><img alt="" draggable="false"${p.logo ? ' class="logo"' : ""}></span><i class="df-tape"></i>`;
    b.querySelector("img").src = p.src; b.querySelector(".inner").classList.add("edge-" + "abc"[Math.floor(r() * 3)]);
    b._p = p;
    return b;
  };
  let list = [];
  function build(posters){
    list = posters; track.innerHTML = "";
    if (!posters.length) return;
    const one = document.createDocumentFragment(), set = [];
    let reps = 0;
    do { posters.forEach((p, i) => set.push([p, i + reps * posters.length])); reps++; }
    while (reps < 12 && set.length * 260 < innerHeight + 400);
    [0, 1].forEach(copy => set.forEach(([p, i]) => one.appendChild(make(p, i, copy))));
    track.appendChild(one);
  }
  fetch(API, { cache:"no-store" }).then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
    const live = d && Array.isArray(d.posters) ? d.posters : [];
    build(live.length ? live.map(p => ({ id:p.id, src:API + "?img=" + encodeURIComponent(p.id), alt:"Event poster", link:p.link || "" })) : FILLER);
  });

  // ---- open / close (hover, tap the edge, swipe in from the left) ----
  const isOpen = () => root.classList.contains("df-open");
  const setOpen = on => { root.classList.toggle("df-open", on); df.setAttribute("aria-expanded", String(on)); };
  if (canHover.matches){
    df.addEventListener("mouseenter", () => setOpen(true));
    df.addEventListener("mouseleave", () => { if (!zoomed && !upOpen) setOpen(false); });
  }
  let x0 = null, y0 = 0;
  addEventListener("touchstart", e => {
    const t = e.touches[0]; y0 = t.clientY;
    x0 = (t.clientX < 28 || (isOpen() && df.contains(e.target))) ? t.clientX : null;
  }, { passive:true });
  addEventListener("touchmove", e => {
    if (x0 === null) return;
    const t = e.touches[0], dx = t.clientX - x0;
    if (Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(t.clientY - y0)) return;
    setOpen(dx > 0); x0 = null;
  }, { passive:true });
  document.addEventListener("click", e => { if (isOpen() && !zoomed && !upOpen && !df.contains(e.target)) setOpen(false); });

  // ---- the drift: posters creep upward; wheel / drag adds speed that eases back off ----
  const BASE = 65;                 // px per second
  let upOpen = false;
  let pos = 0, vel = 0, last = performance.now(), hold = false, drag = null;
  const loopH = () => track.scrollHeight / 2;
  function tick(now){
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!zoomed && !drag && !upOpen){
      pos += ((still.matches || hold ? 0 : BASE) + vel) * dt;
      vel *= Math.pow(.06, dt);                     // flick decays over ~1s
      if (Math.abs(vel) < 1) vel = 0;
    }
    const H = loopH(); if (H > 0){ pos = ((pos % H) + H) % H; }
    track.style.transform = `translate3d(0, ${-pos}px, 0)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  df.addEventListener("wheel", e => {
    if (!isOpen()) setOpen(true);
    e.preventDefault();
    const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    vel = Math.max(-3000, Math.min(3000, vel + d * 6));
  }, { passive:false });
  // touch / pen drag along the strip (once it's open); flick carries on
  df.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse" || !isOpen()) return;
    drag = { y:e.clientY, p:pos, t:performance.now(), v:0, moved:false, id:e.pointerId };
  });
  df.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y, now = performance.now();
    if (Math.abs(dy) > 6) drag.moved = true;
    const np = drag.p - dy; drag.v = (np - pos) / Math.max(.001, (now - drag.t) / 1000); drag.t = now; pos = np;
  });
  const endDrag = () => { if (!drag) return; if (drag.moved){ vel = Math.max(-3000, Math.min(3000, drag.v - BASE)); df._dragged = true; setTimeout(() => df._dragged = false, 50); } drag = null; };
  df.addEventListener("pointerup", endDrag); df.addEventListener("pointercancel", endDrag);
  df.style.touchAction = "none";

  // ---- zoom a poster: askew, rough edge, taped (no description box) ----
  const zoom = document.createElement("div");
  zoom.className = "df-zoom"; zoom.setAttribute("aria-hidden", "true");
  document.body.appendChild(zoom);
  let zoomed = null, flight = null;
  const EASE = "cubic-bezier(.2,.8,.2,1)";
  function rest(slap){
    const cs = getComputedStyle(slap), w = slap.offsetWidth, h = slap.offsetHeight, cx = w * .5, cy = h * .4;
    return `translate(${cs.getPropertyValue("--dx")}, ${cs.getPropertyValue("--dy")}) translate(${cx}px, ${cy}px) rotate(${cs.getPropertyValue("--rot")}) translate(${-cx}px, ${-cy}px)`;
  }
  function from(slap, el){
    const S = slap.getBoundingClientRect(), T = el.getBoundingClientRect(), s = T.width / S.width;
    return `translate(${T.left - S.left}px, ${T.top - S.top}px) scale(${s})`;
  }
  function open(btn){
    const p = btn._p, r = seeded("zoom" + btn.dataset.seed);
    zoom.innerHTML = `<div class="slap"><div class="inner"><img class="poster" alt=""></div>
      <i class="tape tl"></i><i class="tape tr"></i><i class="tape bl"></i><i class="tape br"></i></div><div class="df-meta"></div>`;
    meta(p);
    const slap = zoom.querySelector(".slap"), img = zoom.querySelector(".poster");
    img.src = p.src; img.alt = p.alt; if (p.logo) img.classList.add("logo");
    zoom.querySelector(".inner").classList.add("edge-" + "abc"[Math.floor(r() * 3)]);
    const sign = r() < .5 ? -1 : 1;
    slap.style.setProperty("--rot", (sign * (1.5 + r() * 4.5)).toFixed(2) + "deg");
    slap.style.setProperty("--dx", ((r() * 2 - 1) * 3).toFixed(1) + "px");
    slap.style.setProperty("--dy", ((r() * 2 - 1) * 3).toFixed(1) + "px");
    const base = { tl:-1, tr:1, bl:1, br:-1 };
    zoom.querySelectorAll(".tape").forEach(t => {
      t.style.setProperty("--ta", (base[t.classList[1]] * (36 + r() * 14) + (r() * 2 - 1) * 4).toFixed(1) + "deg");
      t.style.setProperty("--tx", ((r() * 2 - 1) * 5).toFixed(1) + "px");
      t.style.setProperty("--ty", ((r() * 2 - 1) * 5).toFixed(1) + "px");
    });
    zoomed = btn; root.classList.add("df-zoomed"); zoom.setAttribute("aria-hidden", "false");
    const tapeOn = () => slap.classList.add("taped");
    if (still.matches){ tapeOn(); return; }
    slap.style.transform = "none";
    const a = from(slap, btn.querySelector("img")), b = rest(slap);
    slap.style.transform = "";
    btn.classList.add("away");
    if (flight) flight.cancel();
    flight = slap.animate([
      { transform:a, transformOrigin:"0 0", filter:"drop-shadow(0 2px 3px rgba(0,0,0,.4))" },
      { transform:b, transformOrigin:"0 0", filter:"drop-shadow(0 10px 20px rgba(0,0,0,.55)) drop-shadow(0 1px 2px rgba(0,0,0,.5))" }
    ], { duration:560, easing:EASE });
    const t = setTimeout(tapeOn, 300);
    flight.onfinish = () => { flight = null; clearTimeout(t); tapeOn(); };
  }
  function close(){
    if (!zoomed) return;
    const btn = zoomed, slap = zoom.querySelector(".slap");
    const done = () => { btn.classList.remove("away"); zoom.innerHTML = ""; zoom.setAttribute("aria-hidden", "true"); zoomed = null;
      if (canHover.matches && !df.matches(":hover")) setOpen(false); };
    root.classList.remove("df-zoomed");
    if (still.matches || !slap){ done(); return; }
    slap.classList.remove("taped");
    const a = rest(slap); slap.style.transform = "none"; const b = from(slap, btn.querySelector("img")); slap.style.transform = "";
    if (flight) flight.cancel();
    flight = slap.animate([{ transform:a, transformOrigin:"0 0" }, { transform:b, transformOrigin:"0 0", filter:"drop-shadow(0 2px 3px rgba(0,0,0,.4))" }],
      { duration:380, easing:EASE, fill:"forwards" });
    flight.onfinish = () => { flight = null; done(); };
  }
  track.addEventListener("click", e => {
    const btn = e.target.closest(".df-poster"); if (!btn || df._dragged) return;
    e.stopPropagation();
    if (!isOpen()){ setOpen(true); return; }      // first tap on the edge just pulls the frame out
    open(btn);
  });
  df.addEventListener("click", () => { if (!isOpen()) setOpen(true); });
  const logo = document.querySelector(".df-logo");
  if (logo) logo.addEventListener("click", e => { e.stopPropagation(); setOpen(true); });
  zoom.addEventListener("click", e => { if (!e.target.closest(".df-meta a, .df-meta button")) close(); });
  addEventListener("keydown", e => { if (e.key === "Escape"){ if (upOpen) closeUp(); else if (zoomed) close(); else setOpen(false); } });

  // under a zoomed poster: its public link (if any) and, for the browser that taped it up, a way to take it down
  function meta(p){
    const m = zoom.querySelector(".df-meta");
    if (p.link){
      let label = p.link; try{ const u = new URL(p.link); label = (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "")); }catch(e){}
      const a = document.createElement("a"); a.className = "df-link"; a.href = p.link; a.target = "_blank"; a.rel = "noopener nofollow ugc";
      a.innerHTML = '<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M4 1.5h6.5V8M10.5 1.5 1.5 10.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span></span>';
      a.querySelector("span").textContent = label.length > 44 ? label.slice(0, 42) + "…" : label;
      m.appendChild(a);
    }
    if (p.id && keys[p.id]){
      const b = document.createElement("button"); b.type = "button"; b.className = "df-down"; b.textContent = "Take my poster down";
      b.addEventListener("click", () => {
        if (!b.dataset.sure){ b.dataset.sure = "1"; b.textContent = "Tap again to take it down"; setTimeout(() => { if (b.isConnected){ delete b.dataset.sure; b.textContent = "Take my poster down"; } }, 4000); return; }
        b.disabled = true; b.textContent = "Taking it down…";
        fetch(API, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ action:"own-delete", id:p.id, key:keys[p.id] }) })
          .then(r => { if (!r.ok && r.status !== 404) throw 0;
            delete keys[p.id]; saveKeys();
            const rest = list.filter(q => q.id !== p.id);
            zoom.innerHTML = ""; zoom.setAttribute("aria-hidden", "true"); root.classList.remove("df-zoomed"); zoomed = null;
            build(rest.length ? rest : FILLER); })
          .catch(() => { b.disabled = false; delete b.dataset.sure; b.textContent = "Didn't work — try again"; });
      });
      m.appendChild(b);
    }
    if (!m.childElementCount) m.remove();
  }

  // ---- TAPE UP A POSTER: the uploader (button on the frame) ----
  const add = document.createElement("button");
  add.type = "button"; add.className = "df-add"; add.innerHTML = '<span>+ Tape up<br>a poster</span><i class="df-tape"></i>';
  df.appendChild(add);
  const LOCK = '<svg viewBox="0 0 12 14" width="10" height="12" aria-hidden="true"><rect x="1" y="6" width="10" height="7.2" rx="1.2" fill="currentColor"/><path d="M3.3 6V4.2a2.7 2.7 0 0 1 5.4 0V6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
  const up = document.createElement("div");
  up.className = "df-up"; up.hidden = true;
  up.setAttribute("role", "dialog"); up.setAttribute("aria-modal", "true"); up.setAttribute("aria-labelledby", "df-up-h");
  up.innerHTML = `<form class="df-sheet" novalidate>
    <div class="inner edge-b">
      <button class="df-x" type="button" aria-label="Close"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1 L13 13 M13 1 L1 13" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
      <div class="df-form">
        <div class="df-head">
          <img class="df-up-logo" src="assets/img/p-doorframe-wordmark.webp" alt="Digital Doorframe" width="374" height="261">
          <h2 id="df-up-h">Tape up<br>your poster</h2>
          <p class="df-tag" aria-hidden="true">tape up your<br class="d"> event<br class="m"> poster here</p>
        </div>
        <p class="df-lede">Something on around town the Society crowd should know about? Stick it on our doorframe. It goes up once we've had a look.</p>
        <div class="df-crop" tabindex="0" aria-label="Your poster, A3 portrait. Drag to move it, scroll or pinch to zoom.">
          <img alt="" draggable="false" hidden>
          <label class="df-pick"><input type="file" accept="image/*"><b>+</b><span>Choose your artwork</span><small>A3 portrait. Any image works:<br>you frame it to fit.</small></label>
          <span class="df-hint" aria-hidden="true">Drag to move · pinch or scroll to zoom</span>
        </div>
        <div class="df-cropbar" hidden>
          <input type="range" class="df-zr" min="1" max="4" step="0.01" value="1" aria-label="Zoom">
          <button type="button" class="df-change">Change image</button>
        </div>
        <div class="df-fields">
          <label class="df-f"><span>Your name</span><input name="name" maxlength="40" autocomplete="name" required></label>
          <label class="df-f"><span>Contact <em>email or phone</em></span><input name="contact" maxlength="80" autocomplete="email" required></label>
          <p class="df-private">${LOCK}<span><b>Private.</b> Only Society sees your name and contact, in case we need to reach you about your poster. Never shown on the site, never used for solicitation.</span></p>
          <label class="df-f"><span>Link <em>optional · shown with your poster</em></span><input name="link" maxlength="300" inputmode="url" autocomplete="url" placeholder="tickets, website or @instagram"></label>
          <input class="df-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <p class="df-msg" role="status" aria-live="polite"></p>
          <button class="df-go" type="submit">Tape it up</button>
          <p class="df-fine">Posters are checked before they go up, and we reserve the right to remove any poster that we deem is inappropriate or offensive. You can take yours down yourself from this browser.</p>
        </div>
      </div>
      <div class="df-done" hidden>
        <h2>Taped up!</h2>
        <p>Thanks. Your poster goes on the doorframe as soon as Society has had a look.</p>
        <button type="button" class="df-go df-ok">Back to the calendar</button>
      </div>
    </div>
    <svg class="df-arrow d" viewBox="0 0 680 420" aria-hidden="true"><path d="M391.143 73.148C366.123 47.225 281.438 36.856 252.569 64.075 241.021 75.741 240.058 93.887 244.87 112.033" transform="translate(-9.96 59.9) rotate(-11.3)" stroke-width="3.2"/><path d="M234.099 101.981L245.099 113.981 256.099 102.981" transform="translate(-7.61 49.58) rotate(-8.9)" stroke-width="3.2"/></svg>
    <svg class="df-arrow m" viewBox="0 0 366 340" aria-hidden="true"><path d="M214.995 223.794C248.995 214.76 302.995 200.564 332.995 225.084 354.995 244.443 345.995 287.031 311.995 315.424" stroke-width="3.2"/><path d="M324 320 L 309 318 L 313 303" stroke-width="3.2"/></svg>
    <i class="tape tl"></i><i class="tape tr"></i><i class="tape bl"></i><i class="tape br"></i>
  </form>`;
  document.body.appendChild(up);
  const form = up.querySelector("form"), crop = up.querySelector(".df-crop"), cimg = crop.querySelector("img"), file = up.querySelector("input[type=file]");
  const zr = up.querySelector(".df-zr"), bar = up.querySelector(".df-cropbar"), msg = up.querySelector(".df-msg"), go = up.querySelector(".df-form .df-go");
  { const r = seeded("df-up"), base = { tl:-1, tr:1, bl:1, br:-1 };
    up.querySelectorAll(".tape").forEach(t => { t.style.setProperty("--ta", (base[t.classList[1]] * (38 + r() * 10)).toFixed(1) + "deg");
      t.style.setProperty("--tx", ((r() * 2 - 1) * 5).toFixed(1) + "px"); t.style.setProperty("--ty", ((r() * 2 - 1) * 5).toFixed(1) + "px"); }); }
  let lastFocus = null;
  function openUp(){
    upOpen = true; lastFocus = document.activeElement; up.hidden = false; root.classList.add("df-uploading");
    form.classList.remove("taped"); void form.offsetWidth; requestAnimationFrame(() => form.classList.add("taped"));
    up.scrollTop = 0; setTimeout(() => (fit.img ? up.querySelector("[name=name]") : crop).focus({ preventScroll:true }), 60);
  }
  function closeUp(){
    upOpen = false; up.hidden = true; root.classList.remove("df-uploading");
    if (!up.querySelector(".df-done").hidden) reset();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
    if (canHover.matches && !df.matches(":hover")) setOpen(false);
  }
  add.addEventListener("click", e => { e.stopPropagation(); if (!isOpen()){ setOpen(true); return; } openUp(); });
  up.addEventListener("click", e => { if (e.target === up) closeUp(); });
  up.querySelector(".df-x").addEventListener("click", closeUp);
  up.querySelector(".df-ok").addEventListener("click", closeUp);

  // cropper: image covers the A3 frame; drag to move, wheel / pinch / slider to zoom (1–4× the cover size)
  const fit = { img:null, w:0, h:0, W:0, H:0, cover:1, z:1, x:0, y:0, url:"" };
  const clampXY = () => { const s = fit.cover * fit.z;
    fit.x = Math.min(0, Math.max(fit.W - fit.w * s, fit.x)); fit.y = Math.min(0, Math.max(fit.H - fit.h * s, fit.y)); };
  const paint = () => { clampXY(); cimg.style.transform = `translate(${fit.x}px, ${fit.y}px) scale(${fit.cover * fit.z})`; zr.value = fit.z; };
  const zoomAt = (z, cx, cy) => { z = Math.max(1, Math.min(4, z)); const s0 = fit.cover * fit.z, s1 = fit.cover * z;
    fit.x = cx - (cx - fit.x) * s1 / s0; fit.y = cy - (cy - fit.y) * s1 / s0; fit.z = z; paint(); };
  function measure(keep){
    const r = crop.getBoundingClientRect(); if (!fit.img || !r.width) return;
    const fx = keep && fit.W ? (fit.W / 2 - fit.x) / (fit.w * fit.cover * fit.z) : .5, fy = keep && fit.H ? (fit.H / 2 - fit.y) / (fit.h * fit.cover * fit.z) : .5;
    fit.W = r.width; fit.H = r.height; fit.cover = Math.max(fit.W / fit.w, fit.H / fit.h);
    const s = fit.cover * fit.z; fit.x = fit.W / 2 - fx * fit.w * s; fit.y = fit.H / 2 - fy * fit.h * s; paint();
  }
  addEventListener("resize", () => { if (upOpen) measure(true); });
  file.addEventListener("change", () => {
    const f = file.files && file.files[0]; if (!f) return;
    msg.textContent = "";
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      if (fit.url) URL.revokeObjectURL(fit.url);
      Object.assign(fit, { img:im, w:im.naturalWidth, h:im.naturalHeight, z:1, url, W:0, H:0 });
      cimg.src = url; cimg.style.width = fit.w + "px"; cimg.style.height = fit.h + "px"; cimg.hidden = false;
      crop.classList.add("has"); bar.hidden = false; measure(false); crop.focus({ preventScroll:true });
    };
    im.onerror = () => { URL.revokeObjectURL(url); msg.textContent = "Couldn't open that file. Try a JPG or PNG."; };
    im.src = url; file.value = "";
  });
  up.querySelector(".df-change").addEventListener("click", () => file.click());
  zr.addEventListener("input", () => zoomAt(+zr.value, fit.W / 2, fit.H / 2));
  crop.addEventListener("wheel", e => { if (!fit.img) return; e.preventDefault(); const r = crop.getBoundingClientRect();
    zoomAt(fit.z * Math.exp(-(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * .0018), e.clientX - r.left, e.clientY - r.top); }, { passive:false });
  const pts = new Map(); let g = null;
  crop.addEventListener("pointerdown", e => { if (!fit.img) return; crop.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x:e.clientX, y:e.clientY }); g = null; e.preventDefault(); });
  crop.addEventListener("pointermove", e => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x:e.clientX, y:e.clientY });
    if (pts.size === 1){ fit.x += e.clientX - prev.x; fit.y += e.clientY - prev.y; paint(); return; }
    const [a, b] = [...pts.values()], r = crop.getBoundingClientRect(), d = Math.hypot(a.x - b.x, a.y - b.y);
    const cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top;
    if (g){ fit.x += cx - g.cx; fit.y += cy - g.cy; zoomAt(fit.z * d / g.d, cx, cy); }
    g = { d, cx, cy };
  });
  const lift = e => { pts.delete(e.pointerId); g = null; };
  crop.addEventListener("pointerup", lift); crop.addEventListener("pointercancel", lift);
  crop.addEventListener("keydown", e => {
    if (!fit.img){ if (e.key === "Enter" || e.key === " "){ e.preventDefault(); file.click(); } return; }
    const k = { ArrowLeft:[12,0], ArrowRight:[-12,0], ArrowUp:[0,12], ArrowDown:[0,-12] }[e.key];
    if (k){ e.preventDefault(); fit.x += k[0]; fit.y += k[1]; paint(); }
    else if (e.key === "+" || e.key === "="){ e.preventDefault(); zoomAt(fit.z * 1.1, fit.W / 2, fit.H / 2); }
    else if (e.key === "-"){ e.preventDefault(); zoomAt(fit.z / 1.1, fit.W / 2, fit.H / 2); }
  });
  // the framed A3 → 1131 × 1600 JPEG
  function render(){
    const c = document.createElement("canvas"); c.width = 1131; c.height = 1600;
    const k = c.width / fit.W, s = fit.cover * fit.z, x = c.getContext("2d");
    x.fillStyle = "#0d0d0d"; x.fillRect(0, 0, c.width, c.height);
    x.imageSmoothingQuality = "high";
    x.drawImage(fit.img, fit.x * k, fit.y * k, fit.w * s * k, fit.h * s * k);
    const at = q => new Promise(res => c.toBlob(res, "image/jpeg", q));
    return at(.86).then(b => b && b.size > 1.9e6 ? at(.72) : b);
  }
  const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); });
  const ERR = { "slow-down":"That's a lot of posters at once. Try again in a few minutes.", "queue-full":"The doorframe's queue is full right now. Try again later.",
    "link":"That link doesn't look right. Try a full web address or an @instagram handle.", "image-size":"That image is too big to send. Try a smaller one.", "empty":"Please add your name and a way to reach you." };
  form.addEventListener("submit", e => {
    e.preventDefault(); if (go.disabled) return;
    const v = n => form.elements[n].value.trim();
    if (!fit.img){ msg.textContent = "Choose your artwork first."; crop.focus(); return; }
    if (!v("name")){ msg.textContent = "Add your name."; form.elements.name.focus(); return; }
    if (v("contact").length < 3){ msg.textContent = "Add an email or phone number so we can reach you."; form.elements.contact.focus(); return; }
    go.disabled = true; go.textContent = "Taping it up…"; msg.textContent = "";
    render().then(b64).then(data => fetch(API, { method:"POST", headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ name:v("name"), contact:v("contact"), link:v("link"), website:form.elements.website.value, image:{ type:"image/jpeg", data } }) }))
      .then(r => r.json().catch(() => ({})).then(d => {
        if (!r.ok || !d.ok) throw d.error || "x";
        if (d.ownerKey){ keys[d.id] = d.ownerKey; saveKeys(); }
        up.querySelector(".df-form").hidden = true; up.querySelector(".df-done").hidden = false; up.querySelector(".df-ok").focus();
      }))
      .catch(err => { msg.textContent = ERR[err] || "Something went wrong sending it. Try again."; })
      .then(() => { go.disabled = false; go.textContent = "Tape it up"; });
  });
  function reset(){
    form.reset(); fit.img = null; if (fit.url){ URL.revokeObjectURL(fit.url); fit.url = ""; }
    cimg.hidden = true; cimg.removeAttribute("src"); crop.classList.remove("has"); bar.hidden = true; msg.textContent = "";
    up.querySelector(".df-form").hidden = false; up.querySelector(".df-done").hidden = true;
  }
  // direct link straight to the uploader: cafesocietyvalletta.com/doorframe (→ events.html?tapeup) or events.html#tapeup
  if (/[?&]tapeup\b/.test(location.search) || location.hash === "#tapeup"){
    setOpen(true); openUp();
    history.replaceState(null, "", location.pathname);   // closing it leaves a clean events URL
  }
})();
