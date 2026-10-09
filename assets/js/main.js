/* =========================================================
   swipeNav (Chef, Oct 2026) — every full-screen photo viewer with ← → arrows (About galleries, Photo Lab rolls,
   Barney Book photos, Meet Me attachments) can also be swiped: the photo follows a finger on phones, or a
   two-finger sideways swipe on a laptop trackpad, and lets go to the next/previous photo (or springs back).
   swipeNav(overlay, getCard, go, canGo)
     overlay  element that receives the gestures       getCard()  the element that moves with the gesture
     go(d, true)  step d = ±1 (the photo has already slid off; skip the exit animation, must reset card
                  style.translate/opacity) — may return a promise      canGo()  false when there's only one photo
   The arrows keep working as before. Shop product photos already scroll natively (scroll-snap).
   ========================================================= */
window.swipeNav = function(overlay, getCard, go, canGo){
  "use strict";
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let dx = 0, busy = false, x0 = 0, y0 = 0, t0 = 0, mode = null, quietUntil = 0, wheelT = null, eatClick = 0;
  const far = () => Math.min(innerWidth * .9, 640), thr = () => Math.max(60, innerWidth * .12);
  const show = x => { const c = getCard(); if (!c) return;
    c.style.translate = x ? x.toFixed(1) + "px 0" : ""; c.style.opacity = x ? (1 - Math.min(.65, Math.abs(x) / far())).toFixed(3) : ""; };
  function release(vel){
    const c = getCard(), x = dx; dx = 0; if (!c) return;
    if (Math.abs(x) > thr() || (Math.abs(vel) > .45 && Math.abs(x) > 24)){
      const d = x < 0 ? 1 : -1; busy = true; eatClick = Date.now() + 450;
      const out = still.matches ? Promise.resolve() :
        c.animate([{ translate: x + "px 0", opacity: c.style.opacity || 1 }, { translate: (-d * far()) + "px 0", opacity: 0 }], { duration: 150, easing: "ease-in" }).finished.catch(() => {});
      out.then(() => { c.style.translate = "-9999px 0"; c.style.opacity = "0"; return go(d, true); })
         .then(() => { busy = false; }, () => { busy = false; show(0); });
    } else {
      if (x && !still.matches) c.animate([{ translate: x + "px 0", opacity: c.style.opacity || 1 }, { translate: "0px 0", opacity: 1 }], { duration: 240, easing: "cubic-bezier(.2,.8,.2,1)" });
      show(0); if (Math.abs(x) > 8) eatClick = Date.now() + 450;
    }
  }
  // touch (phones, tablets): follow the finger once the gesture is clearly sideways
  overlay.addEventListener("touchstart", e => {
    if (busy || e.touches.length !== 1 || (canGo && !canGo())) { mode = "no"; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = performance.now(); mode = null; dx = 0;
  }, { passive: true });
  overlay.addEventListener("touchmove", e => {
    if (mode === "no" || e.touches.length !== 1) { if (mode === "h") { mode = "no"; release(0); } return; }
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!mode && Math.hypot(mx, my) > 8) mode = Math.abs(mx) > Math.abs(my) ? "h" : "v";
    if (mode === "h") { e.preventDefault(); dx = mx; show(dx); }
  }, { passive: false });
  overlay.addEventListener("touchend", e => {
    if (mode !== "h") { mode = null; return; }
    mode = null; const v = dx / Math.max(1, performance.now() - t0); release(v);
  });
  overlay.addEventListener("touchcancel", () => { if (mode === "h") { mode = null; release(0); } });
  // trackpad: horizontal wheel. Follows the fingers, commits past the threshold, then ignores the glide (momentum)
  overlay.addEventListener("wheel", e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || e.ctrlKey) return;
    e.preventDefault();                                    // no browser back/forward swipe while in the viewer
    const now = Date.now();
    if (busy || now < quietUntil || (canGo && !canGo())) { quietUntil = Math.max(quietUntil, now + 160); return; }
    dx -= e.deltaX * (e.deltaMode === 1 ? 16 : 1); show(dx); clearTimeout(wheelT);
    if (Math.abs(dx) > thr() * 1.3) { quietUntil = now + 260; release(0); }
    else wheelT = setTimeout(() => release(0), 140);
  }, { passive: false });
  // a swipe that ends over the backdrop must not count as a click (which would close the viewer)
  overlay.addEventListener("click", e => { if (Date.now() < eatClick) { e.stopPropagation(); e.preventDefault(); } }, true);
};

/* =========================================================
   CAFE SOCIETY — shared behaviour (modal + toast helpers)
   ========================================================= */

(function(){
  "use strict";

  window.CS = window.CS || {};

  function openModal(overlay){
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden","false");
    const first = overlay.querySelector("input,textarea,select,button");
    if (first) setTimeout(() => first.focus(), 60);
  }
  function closeModal(overlay){
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden","true");
  }
  CS.openModal = openModal;
  CS.closeModal = closeModal;

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(overlay); });
    overlay.querySelectorAll("[data-close-modal]").forEach(btn => btn.addEventListener("click", () => closeModal(overlay)));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape"){
      document.querySelectorAll(".modal-overlay.open").forEach(closeModal);
    }
  });

  let toastTimer;
  function toast(msg){
    let el = document.querySelector(".toast");
    if (!el){
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }
  CS.toast = toast;

})();

/* =========================================================
   Menu bar (pages 2–6): always visible and sticky. Transparent bars
   pick up a dark backing once the page has scrolled.
   ========================================================= */
(function(){
  "use strict";
  const bar = document.querySelector("[data-bar]");
  if (!bar) return;
  const update = () => bar.classList.toggle("scrolled", window.scrollY > 30);
  window.addEventListener("scroll", update, { passive:true });
  update();
})();

/* =========================================================
   About: banners open their section; the ↑ at the end closes it.
   ========================================================= */
(function(){
  "use strict";
  document.querySelectorAll(".about-sec").forEach(sec => {
    const banner = sec.querySelector(".banner");
    const close = sec.querySelector("[data-close]");
    if (!banner) return;
    banner.addEventListener("click", () => {
      sec.classList.add("open");
      banner.setAttribute("aria-expanded", "true");
    });
    if (close) close.addEventListener("click", () => {
      sec.classList.remove("open");
      banner.setAttribute("aria-expanded", "false");
      sec.scrollIntoView({ behavior:"smooth", block:"center" });
      banner.focus({ preventScroll:true });
    });
  });
  // open a section straight from a link like about.html#sec-2
  const m = location.hash.match(/^#sec-(\d)$/);
  if (m) { const s = document.getElementById("sec-" + m[1]); if (s) s.classList.add("open"); }
})();

/* =========================================================
   About → Galleries: gallery viewer (see style.css "gallery viewer").
   Photos come from window.GALLERY_SETS (assets/js/gallery-photos.js); a gallery
   with no photos yet shows grey placeholder frames.
   ========================================================= */
(function(){
  "use strict";
  const tiles = document.querySelectorAll(".gal-grid .gal, .rolls .roll[data-gallery]");   // About galleries + Photo Lab rolls
  if (!tiles.length) return;
  const SETS = window.GALLERY_SETS || {};
  const IMG = "assets/img/gallery/";
  function photosFor(name){
    const g = SETS[name]; if (!g) return [];
    return Array.from({ length: g.count }, (_, i) => `${IMG}${g.dir}/${g.dir}-${String(i + 1).padStart(2, "0")}-t.jpg`);
  }
  const PLACEHOLDERS = 15;                     // fills 5 rows on phone (3-wide) / 3 rows on desktop (5-wide)
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  const EASE = "cubic-bezier(.2,.8,.2,1)";
  const page = document.querySelector(".page");
  let view, grid, openTile = null, anims = [];

  function seeded(str){
    let h = 2166136261;
    for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function build(){
    view = document.createElement("div");
    view.className = "gal-view"; view.setAttribute("role", "dialog"); view.setAttribute("aria-modal", "true");
    view.innerHTML = '<div class="gv-wrap"><div class="gv-head"><span class="kicker">Gallery</span><h2></h2><span class="gv-date"></span>' +
      '<button class="x" type="button" aria-label="Close gallery"><svg width="16" height="16" viewBox="0 0 14 14"><path d="M1 1 L13 13 M13 1 L1 13" fill="none" stroke="#FFFFFF" stroke-width="1.6"/></svg></button></div>' +
      '<div class="gv-grid"></div></div>';
    document.body.appendChild(view);
    grid = view.querySelector(".gv-grid");
    view.querySelector(".x").addEventListener("click", close);
    view.addEventListener("click", e => { if (e.target === view || e.target.classList.contains("gv-wrap")) close(); });
    document.addEventListener("keydown", e => {
      if (photo.open){
        if (e.key === "Escape") closePhoto();
        else if (e.key === "ArrowRight") stepPhoto(1);
        else if (e.key === "ArrowLeft") stepPhoto(-1);
        return;
      }
      if (e.key === "Escape" && openTile) close();
    });
    grid.addEventListener("click", e => {
      const f = e.target.closest(".gv-frame.has-photo");
      if (f && !view.classList.contains("flying")) openPhoto([...grid.children].indexOf(f));
    });
    grid.addEventListener("keydown", e => {
      const f = e.target.closest(".gv-frame.has-photo");
      if (f && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); openPhoto([...grid.children].indexOf(f)); }
    });
  }
  // transform that puts a frame exactly over the thumbnail it came out of
  // a tiny print sitting on a point (Photo Lab: the roll's canister)
  function fromPoint(el, x, y, s){
    const r = el.getBoundingClientRect();
    return `translate(${x - (r.left + r.width / 2)}px, ${y - (r.top + r.height / 2)}px) scale(${s})`;
  }
  function fromThumb(el, T){
    const r = el.getBoundingClientRect(), s = T.width / r.width;
    return `translate(${T.left + T.width / 2 - (r.left + r.width / 2)}px, ${T.top + T.height / 2 - (r.top + r.height / 2)}px) scale(${s})`;
  }
  function open(tile){
    if (!view) build();
    const name = tile.dataset.gallery || tile.querySelector("h3").getAttribute("aria-label");
    const photos = photosFor(name);
    curSet = SETS[name] || null;
    current = photos;
    const n = photos.length || PLACEHOLDERS, r = seeded(name);
    view.querySelector("h2").textContent = tile.dataset.title || name;
    view.querySelector(".kicker").textContent = tile.dataset.kicker || "Gallery";
    const credit = tile.dataset.credit ? `Photos by ${tile.dataset.credit}` : "";
    const line = [tile.dataset.date, credit].filter(Boolean).join("  ·  ");
    const dt = view.querySelector(".gv-date"); dt.textContent = line; dt.hidden = !line;
    curCredit = tile.dataset.credit || "";
    grid.innerHTML = "";
    for (let i = 0; i < n; i++){
      const f = document.createElement("div");
      f.className = "gv-frame";                                  // straight edges
      f.style.setProperty("--r", ((r() * 2 - 1) * 1.6).toFixed(2) + "deg");   // prints sit very slightly askew
      if (photos[i]){ f.classList.add("has-photo"); f.style.backgroundImage = `url('${photos[i]}')`; f.setAttribute("role", "button"); f.tabIndex = 0; f.setAttribute("aria-label", `Photo ${i + 1} of ${photos.length}`); }
      grid.appendChild(f);
    }
    openTile = tile;
    const T = tile.getBoundingClientRect();
    view.scrollTop = 0;
    if (!still.matches) view.classList.add("flying");        // header hidden from the very first frame
    view.classList.add("open"); document.body.classList.add("gv-open");
    requestAnimationFrame(() => document.body.classList.add("gv-dim"));
    if (still.matches){ tile.classList.add("away"); view.querySelector(".x").focus({ preventScroll:true }); return; }
    view.classList.add("flying");
    tile.classList.add("away");
    const frames = [...grid.children];
    // tossed out like a handful of prints: each frame leaves the thumbnail at a random moment, spinning,
    // overshoots to a random scattered spot, then drops into its place in the grid
    const order = frames.map((_, i) => i).sort(() => r() - .5);
    const isRoll = tile.classList.contains("roll");
    const CX = T.left + T.width * .11, CY = T.top + T.height / 2;       // film canister on the roll icon
    anims = frames.map((f, i) => {
      const rest = getComputedStyle(f).transform, end = rest === "none" ? "none" : rest;
      const spin = (r() * 2 - 1) * 28, ox = (r() * 2 - 1) * 70, oy = (r() * 2 - 1) * 70;
      if (isRoll){
        // Photo Lab: prints start tiny at the canister and grow as they scatter out — quicker than the About toss
        return f.animate([
          { transform: fromPoint(f, CX, CY, .05) + ` rotate(${spin}deg)`, offset: 0 },
          { transform: `translate(${ox}px, ${oy}px) rotate(${-spin * .35}deg) scale(.82)`, offset: .58 },
          { transform: end, offset: 1 }
        ], { duration: 380 + r() * 120, delay: order.indexOf(i) * Math.min(12, 900 / frames.length), easing: "cubic-bezier(.3,.7,.3,1)", fill: "backwards" });
      }
      return f.animate([
        { transform: fromThumb(f, T) + ` rotate(${spin}deg)`, offset: 0 },
        { transform: `translate(${ox}px, ${oy}px) rotate(${-spin * .35}deg) scale(1.04)`, offset: .62 },
        { transform: end, offset: 1 }
      ], { duration: 520 + r() * 160, delay: order.indexOf(i) * 18, easing: "cubic-bezier(.25,.75,.35,1)", fill: "backwards" });
    });
    // reveal the header once most of the prints have landed
    const landAt = Math.max(...anims.map(a => a.effect.getTiming().delay + a.effect.getTiming().duration * .8));
    setTimeout(() => { view.classList.remove("flying"); view.querySelector(".x").focus({ preventScroll:true }); }, landAt);
  }
  function close(){
    if (!openTile) return;
    if (photo.open) closePhoto(true);
    const tile = openTile; openTile = null;
    anims.forEach(a => a.cancel()); anims = [];
    const done = () => {
      view.classList.remove("open", "flying"); document.body.classList.remove("gv-open");
      tile.classList.remove("away"); grid.innerHTML = "";
      tile.focus({ preventScroll:true });
    };
    document.body.classList.remove("gv-dim");
    if (still.matches){ done(); return; }
    view.classList.add("flying");
    const T = tile.getBoundingClientRect();
    const frames = [...grid.children];
    const vis = frames.filter(f => { const b = f.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight; });
    frames.forEach(f => { if (!vis.includes(f)) f.style.visibility = "hidden"; });
    const last = vis.map((f, i) => f.animate([
      { transform: getComputedStyle(f).transform },
      { transform: (tile.classList.contains("roll") ? fromPoint(f, T.left + T.width * .11, T.top + T.height / 2, .05) : fromThumb(f, T)) + ` rotate(${(Math.random() * 2 - 1) * 24}deg)` }
    ], { duration: 320 + Math.random() * 120, delay: Math.random() * 120, easing: "cubic-bezier(.5,0,.75,.4)", fill: "forwards" }));
    (last.length ? last[last.length - 1] && Promise.all(last.map(a => a.finished)) : Promise.resolve()).then(done, done);
  }
  /* ---- single photo: zooms out of its print to full size, slightly askew (like the event posters) ---- */
  let current = [], curSet = null, curCredit = "";
  const photo = { open:false, i:0, el:null, card:null, img:null, count:null };
  const full = u => u.replace(/-t\.jpg$/, ".jpg");
  function buildPhoto(){
    const el = document.createElement("div");
    el.className = "gv-photo"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
    el.innerHTML = '<div class="gp-card"><img alt=""></div>' +
      '<button class="gp-x" type="button" aria-label="Close photo"><svg width="16" height="16" viewBox="0 0 14 14"><path d="M1 1 L13 13 M13 1 L1 13" fill="none" stroke="#FFFFFF" stroke-width="1.6"/></svg></button>' +
      '<button class="gp-prev" type="button" aria-label="Previous photo"><svg width="14" height="24" viewBox="0 0 14 24"><path d="M12 2 L2 12 L12 22" fill="none" stroke="#FFFFFF" stroke-width="1.6"/></svg></button>' +
      '<button class="gp-next" type="button" aria-label="Next photo"><svg width="14" height="24" viewBox="0 0 14 24"><path d="M2 2 L12 12 L2 22" fill="none" stroke="#FFFFFF" stroke-width="1.6"/></svg></button>' +
      '<span class="gp-count"></span><span class="gp-credit" hidden></span>' +
      '<a class="gp-dl" download hidden><svg width="12" height="14" viewBox="0 0 12 14"><path d="M6 1 V10 M2 6 L6 10 L10 6 M1 13 H11" fill="none" stroke="#FFFFFF" stroke-width="1.5"/></svg><span>Download full res</span></a>';
    document.body.appendChild(el);
    Object.assign(photo, { el, card: el.querySelector(".gp-card"), img: el.querySelector("img"), count: el.querySelector(".gp-count"), credit: el.querySelector(".gp-credit"), dl: el.querySelector(".gp-dl") });
    photo.dl.addEventListener("click", e => e.stopPropagation());
    el.querySelector(".gp-x").addEventListener("click", () => closePhoto());
    el.querySelector(".gp-prev").addEventListener("click", e => { e.stopPropagation(); stepPhoto(-1); });
    el.querySelector(".gp-next").addEventListener("click", e => { e.stopPropagation(); stepPhoto(1); });
    el.addEventListener("click", e => { if (e.target === el) closePhoto(); });
    window.swipeNav(el, () => photo.card, (d, dragged) => stepPhoto(d, dragged), () => current.length > 1);   // swipe / trackpad
  }
  // where the photo rests: as big as fits, keeping its shape
  function restBox(w, h){
    const phone = innerWidth < 900;
    const maxW = innerWidth - (phone ? 32 : 200), maxH = innerHeight - (phone ? 150 : 150);
    const k = Math.min(maxW / w, maxH / h);
    const W = Math.round(w * k), H = Math.round(h * k);
    return { left: (innerWidth - W) / 2, top: (innerHeight - H) / 2 - (phone ? 10 : 0), width: W, height: H };
  }
  const tilt = () => { const r = Math.random(); return (Math.random() < .5 ? -1 : 1) * (1.2 + r * 2.6); };   // 1.2–3.8°, askew like the posters
  function size(src){ return new Promise(res => { const im = new Image(); im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([4, 3]); im.src = src; }); }
  function setCount(){
    photo.count.textContent = `${photo.i + 1} / ${current.length}`;
    photo.credit.textContent = curCredit ? `Photo: ${curCredit}` : ""; photo.credit.hidden = !curCredit;
    // full-resolution download (Photo Lab rolls): originals live at GALLERY_SETS[name].dl + <dir>-NN.jpg
    const g = curSet, n = String(photo.i + 1).padStart(2, "0");
    if (g && g.dl){ photo.dl.href = `${g.dl}${g.dir}-${n}.jpg`; photo.dl.setAttribute("download", `cafe-society-${g.dir}-${n}.jpg`); photo.dl.hidden = false; }
    else { photo.dl.hidden = true; photo.dl.removeAttribute("href"); }
  }
  function hiRes(i){                                          // thumb first (already loaded), full photo swaps in
    const t = current[i], f = full(t);
    photo.img.src = t;
    const im = new Image(); im.onload = () => { if (photo.i === i && photo.open) photo.img.src = f; }; im.src = f;
  }
  async function openPhoto(i){
    if (photo.open || !current[i]) return;
    if (!photo.el) buildPhoto();
    const frame = grid.children[i];
    const [w, h] = await size(current[i]);
    photo.open = true; photo.i = i; setCount(); hiRes(i);
    const R = restBox(w, h), F = frame.getBoundingClientRect(), rot = tilt();
    const fr = parseFloat(frame.style.getPropertyValue("--r")) || 0;
    Object.assign(photo.card.style, { left: R.left + "px", top: R.top + "px", width: R.width + "px", height: R.height + "px", transform: `rotate(${rot}deg)` });
    photo.el.classList.add("open", "flying"); view.classList.add("photo-dim");
    frame.style.visibility = "hidden";
    if (!still.matches){
      await photo.card.animate([
        { left: F.left + "px", top: F.top + "px", width: F.width + "px", height: F.height + "px", transform: `rotate(${fr}deg)` },
        { left: R.left + "px", top: R.top + "px", width: R.width + "px", height: R.height + "px", transform: `rotate(${rot}deg)` }
      ], { duration: 460, easing: EASE }).finished.catch(() => {});
    }
    photo.el.classList.remove("flying");
    photo.el.querySelector(".gp-x").focus({ preventScroll:true });
  }
  async function stepPhoto(d, dragged){
    if (!photo.open || current.length < 2) return;
    const i = (photo.i + d + current.length) % current.length;
    grid.children[photo.i].style.visibility = "";
    grid.children[i].style.visibility = "hidden";
    const [w, h] = await size(current[i]);
    photo.i = i; setCount();
    const R = restBox(w, h), rot = tilt(), card = photo.card;
    if (!still.matches && !dragged) await card.animate([{ transform: card.style.transform, opacity: 1 }, { transform: `translateX(${-d * 60}px) ${card.style.transform}`, opacity: 0 }], { duration: 140, easing: "ease-in" }).finished.catch(() => {});
    hiRes(i);
    Object.assign(card.style, { left: R.left + "px", top: R.top + "px", width: R.width + "px", height: R.height + "px", transform: `rotate(${rot}deg)`, translate: "", opacity: "" });
    if (!still.matches) card.animate([{ transform: `translateX(${d * 60}px) rotate(${rot - d * 6}deg) scale(1.04)`, opacity: 0 }, { transform: `rotate(${rot}deg)`, opacity: 1 }], { duration: 280, easing: EASE });
  }
  function closePhoto(instant){
    if (!photo.open) return;
    photo.open = false;
    const frame = grid.children[photo.i];
    const done = () => { photo.el.classList.remove("open", "flying"); if (frame) frame.style.visibility = ""; };
    view.classList.remove("photo-dim");
    if (instant || still.matches || !frame){ done(); return; }
    photo.el.classList.add("flying");
    const F = frame.getBoundingClientRect(), c = photo.card.style;
    const fr = parseFloat(frame.style.getPropertyValue("--r")) || 0;
    photo.card.animate([
      { left: c.left, top: c.top, width: c.width, height: c.height, transform: c.transform },
      { left: F.left + "px", top: F.top + "px", width: F.width + "px", height: F.height + "px", transform: `rotate(${fr}deg)` }
    ], { duration: 360, easing: EASE, fill: "forwards" }).finished.then(a => { done(); a && a.cancel && a.cancel(); photo.card.getAnimations().forEach(x => x.cancel()); }, done);
    frame.focus({ preventScroll:true });
  }
  tiles.forEach(t => {
    t.setAttribute("role", "button"); t.tabIndex = 0;
    t.addEventListener("click", () => open(t));
    t.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); open(t); } });
  });
  // deep link: /photolab#qlv-pride (or about.html#the-drinks) opens that gallery on arrival — used by
  // "Photos →" buttons on past events in the Events Calendar
  const slug = x => x.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const want = decodeURIComponent(location.hash.slice(1));
  if (want){
    const hit = [...tiles].find(t => (t.dataset.slug || slug(t.dataset.gallery || t.querySelector("h3")?.getAttribute("aria-label") || "")) === want);
    if (hit){
      const sec = hit.closest(".about-sec"); if (sec) sec.classList.add("open");
      setTimeout(() => { hit.scrollIntoView({ block:"center" }); setTimeout(() => open(hit), 350); }, 250);
    }
  }
})();

/* About → Galleries: cover tiles — the photo Chef picked (GALLERY_SETS[name].cover); none yet = grey tile */
(function(){
  "use strict";
  const SETS = window.GALLERY_SETS || {};
  document.querySelectorAll(".gal-grid .gal").forEach(tile => {
    const g = SETS[tile.querySelector("h3").getAttribute("aria-label")];
    if (!g || !g.cover) return;
    const box = tile.querySelector(".gal-img");
    const big = box.clientWidth * (window.devicePixelRatio || 1) > 560;
    const file = g.coverCrop ? `${g.dir}-cover.jpg`                      // hand-cropped square (e.g. zoomed in on the drink)
      : `${g.dir}-${String(g.cover).padStart(2, "0")}${big ? "" : "-t"}.jpg`;
    box.style.backgroundImage = `url('assets/img/gallery/${g.dir}/${file}')`;
  });
})();

/* Links marked data-desktop-newtab (e.g. 77 Cellar's Instagram on About) open in a new tab on desktop (≥900px);
   on phones they open in place, so the Instagram app can take over. */
(() => {
  const desk = matchMedia("(min-width: 900px)");
  document.querySelectorAll("a[data-desktop-newtab]").forEach(a => {
    const set = () => { if (desk.matches) a.target = "_blank"; else a.removeAttribute("target"); };
    set(); desk.addEventListener ? desk.addEventListener("change", set) : desk.addListener(set);
  });
})();

/* Menu bar: tapping the Meet Me logo flashes it green for a moment before the page changes (desktop hover does it in CSS) */
(function(){
  document.querySelectorAll(".site-bar .logo-mm:not(.tab)").forEach(a => a.addEventListener("click", e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button || a.classList.contains("flash")) return;
    e.preventDefault(); a.classList.add("flash"); document.documentElement.classList.add("tab-leaving");
    setTimeout(() => { location.href = a.href; }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 340);
  }));
  addEventListener("pageshow", () => { document.querySelectorAll(".logo-mm.flash").forEach(a => a.classList.remove("flash")); document.documentElement.classList.remove("tab-leaving"); });   // back button
  // any other menu-bar link: the current tab starts sliding up while the next page loads (no delay), then the new tab drops down
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll(".site-bar a:not(.logo-mm)").forEach(a => a.addEventListener("click", e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button || a.target || a.classList.contains("tab") || still.matches) return;
    if (!document.querySelector(".site-bar .tab")) return;   // no tab on this page to lift
    document.documentElement.classList.add("tab-leaving");   // starts lifting; the browser goes on to the next page at once
  }));
})();

/* Menu hover glow: one shared SVG filter (#home-grain) used by the home menu and every menu bar (style.css) —
   a blurred copy of the item, speckled by fractal noise, sits under the crisp item = a faint grainy glow */
(function(){
  if (document.getElementById("home-grain")) return;
  const d = document.createElement("div");
  d.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="home-grain" x="-30%" y="-80%" width="160%" height="260%" color-interpolation-filters="sRGB"> <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b1"/><feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b2"/> <feMerge result="halo"><feMergeNode in="b2"/><feMergeNode in="b1"/></feMerge> <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="7" result="n"/> <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -.35" result="m"/> <feComposite in="halo" in2="m" operator="in" result="grainy"/> <feComponentTransfer in="grainy" result="glow"><feFuncA type="linear" slope=".85"/></feComponentTransfer> <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter></svg>`;
  document.body.appendChild(d.firstChild);
})();



/* =========================================================
   Page motion (Chef, Oct 2026) — see style.css "PAGE MOTION". Off with prefers-reduced-motion.
   · Events / Photo Lab / Collection: background parallax (scroll-driven where supported, else on scroll)
   · About: thumbnails (section banners + press tiles) drift in from the bottom left and come into focus one after
     another, 110ms apart, starting just after the page opens; title illustration exits (pure CSS)
   ========================================================= */
(function(){
  "use strict";
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.documentElement, SDA = !!(window.CSS && CSS.supports("animation-timeline: scroll()"));
  root.classList.add("mo"); if (SDA) root.classList.add("mo-sda");

  const par = document.querySelector(".page.events, .page.gallery, .page.shop");
  if (par) {
    const K = .35;
    const set = () => root.style.setProperty("--par-end", (Math.max(0, root.scrollHeight - innerHeight) * K).toFixed(1) + "px");
    set(); addEventListener("resize", set); addEventListener("load", set);
    if (window.ResizeObserver) new ResizeObserver(set).observe(par);
    if (!SDA) {
      let t = false; const f = () => { t = false; root.style.setProperty("--par", (scrollY * K).toFixed(1) + "px"); };
      addEventListener("scroll", () => { if (!t) { t = true; requestAnimationFrame(f); } }, { passive: true }); f();
    }
  }

  const about = document.querySelector(".page.about");
  if (about) {
    const queue = []; let timer = null;
    const step = () => { const b = queue.shift(); if (!b) { timer = null; return; } b.classList.add("in"); timer = setTimeout(step, 110); };
    let first = true;   // the opening sequence waits a beat after the page appears
    const io = new IntersectionObserver(es => {
      es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        .forEach(e => { io.unobserve(e.target); queue.push(e.target); });
      if (!timer) { if (first) { first = false; timer = setTimeout(step, 120); } else step(); }
    }, { rootMargin: "0px 0px -6% 0px" });
    about.querySelectorAll(".banner, .press-tile").forEach(b => io.observe(b));
    // a section is open → reading mode: no scroll motion at all (Chef: "read like a book or magazine")
    const upd = () => root.classList.toggle("about-reading", !!about.querySelector(".about-sec.open:not(.sec-4)"));
    new MutationObserver(upd).observe(about, { subtree: true, attributes: true, attributeFilter: ["class"] }); upd();
  }
})();
