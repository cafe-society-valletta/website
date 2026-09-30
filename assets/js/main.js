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
   Frames are placeholders until each gallery's photos are added — put
   image URLs in GALLERY_PHOTOS["THE DRINKS"] = [...] to fill them.
   ========================================================= */
(function(){
  "use strict";
  const tiles = document.querySelectorAll(".gal-grid .gal");
  if (!tiles.length) return;
  const GALLERY_PHOTOS = window.GALLERY_PHOTOS || {};
  const PLACEHOLDERS = 15;                     // fills 5 rows on phone (3-wide) / 3 rows on desktop (5-wide)
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  const EASE = "cubic-bezier(.2,.8,.2,1)";
  const page = document.querySelector(".page.about");
  let view, grid, openTile = null, anims = [];

  function seeded(str){
    let h = 2166136261;
    for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function build(){
    view = document.createElement("div");
    view.className = "gal-view"; view.setAttribute("role", "dialog"); view.setAttribute("aria-modal", "true");
    view.innerHTML = '<div class="gv-wrap"><div class="gv-head"><span class="kicker">Gallery</span><h2></h2>' +
      '<button class="x" type="button" aria-label="Close gallery"><svg width="16" height="16" viewBox="0 0 14 14"><path d="M1 1 L13 13 M13 1 L1 13" fill="none" stroke="#FFFFFF" stroke-width="1.6"/></svg></button></div>' +
      '<div class="gv-grid"></div></div>';
    document.body.appendChild(view);
    grid = view.querySelector(".gv-grid");
    view.querySelector(".x").addEventListener("click", close);
    view.addEventListener("click", e => { if (e.target === view || e.target.classList.contains("gv-wrap")) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && openTile) close(); });
  }
  // transform that puts a frame exactly over the thumbnail it came out of
  function fromThumb(el, T){
    const r = el.getBoundingClientRect(), s = T.width / r.width;
    return `translate(${T.left + T.width / 2 - (r.left + r.width / 2)}px, ${T.top + T.height / 2 - (r.top + r.height / 2)}px) scale(${s})`;
  }
  function open(tile){
    if (!view) build();
    const name = tile.querySelector("h3").getAttribute("aria-label");
    const photos = GALLERY_PHOTOS[name] || [];
    const n = photos.length || PLACEHOLDERS, r = seeded(name);
    view.querySelector("h2").textContent = name;
    grid.innerHTML = "";
    for (let i = 0; i < n; i++){
      const f = document.createElement("div");
      f.className = "gv-frame edge-" + "abc"[Math.floor(r() * 3)];
      f.style.setProperty("--r", ((r() * 2 - 1) * 1.6).toFixed(2) + "deg");   // prints sit very slightly askew
      if (photos[i]){ f.style.background = `#D2D2D2 url('${photos[i]}') center/cover no-repeat`; }
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
    anims = frames.map((f, i) => {
      const rest = getComputedStyle(f).transform, end = rest === "none" ? "none" : rest;
      const spin = (r() * 2 - 1) * 28, ox = (r() * 2 - 1) * 70, oy = (r() * 2 - 1) * 70;
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
      { transform: fromThumb(f, T) + ` rotate(${(Math.random() * 2 - 1) * 24}deg)` }
    ], { duration: 320 + Math.random() * 120, delay: Math.random() * 120, easing: "cubic-bezier(.5,0,.75,.4)", fill: "forwards" }));
    (last.length ? last[last.length - 1] && Promise.all(last.map(a => a.finished)) : Promise.resolve()).then(done, done);
  }
  tiles.forEach(t => {
    t.setAttribute("role", "button"); t.tabIndex = 0;
    t.addEventListener("click", () => open(t));
    t.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); open(t); } });
  });
})();
