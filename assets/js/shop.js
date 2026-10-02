/* The Society Collection — categories open inline: the tapped category opens in place and a carousel strip of products (photo, name, price) runs out to the right
   edge of the screen. A product opens full screen: swipeable full-bleed photos, info below on
   phone / beside on desktop. Deep links: shop.html#apparel, shop.html#p/society-tee.
   Data: assets/js/shop-data.js (placeholders until Shopify is connected — Shopify will only do
   the bag/checkout and stock). */
(() => {
  const list = document.querySelector(".shop-cats");
  if (!list || !window.SHOP_CATEGORIES) return;
  const CATS = window.SHOP_CATEGORIES, PRODUCTS = window.SHOP_PRODUCTS || [];
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };
  const euro = n => "€" + (Number.isInteger(n) ? n : n.toFixed(2));
  const ARROW = '<svg class="arr" width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><path d="M0 6H16M11 1L16 6L11 11" fill="none" stroke="#FFFFFF" stroke-width="1.6"/></svg>';
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ZOOM = 520, EASE = "cubic-bezier(.22,.8,.24,1)";

  // placeholder tile: a soft cyanotype-blue block with a faint label until real photos arrive
  function photo(p, i, big){
    const box = el("div", big ? "pd-ph" : "ph");
    const src = p.images && p.images[i];
    if (src){ const img = el("img"); img.src = src; img.alt = p.title + (i ? ` — photo ${i+1}` : ""); img.loading = "lazy"; box.appendChild(img); }
    else { box.classList.add("blank"); box.appendChild(el("span", null, big ? `${p.title} · photo ${i+1}` : "")); }
    if (window.SHOP_COMING_SOON) box.appendChild(el("b", "soon-band", "COMING SOON"));
    return box;
  }

  // ---- categories -------------------------------------------------------------
  list.innerHTML = "";
  const secs = {};
  CATS.forEach(c => {
    const sec = el("li", "cat"); sec.id = c.id;
    const row = el("button", "cat-row"); row.type = "button"; row.setAttribute("aria-expanded", "false");
    row.innerHTML = `<span>${c.title.replace(/&/g,"&amp;")}</span>${ARROW}`;
    const body = el("div", "cat-body"), inner = el("div", "cat-inner"), strip = el("div", "strip");
    PRODUCTS.filter(p => p.cat === c.id).forEach(p => {
      const a = el("a", "item"); a.href = `#p/${p.handle}`;
      a.appendChild(photo(p, 0));
      a.appendChild(el("span", "name", p.title));
      a.appendChild(el("span", "price", euro(p.price)));
      strip.appendChild(a);
    });
    if (!strip.children.length) strip.appendChild(el("p", "soon", "Coming soon."));
    inner.appendChild(strip); body.appendChild(inner);
    sec.append(row, body); list.appendChild(sec);
    row.addEventListener("click", () => setCat(sec.classList.contains("open") ? null : c.id, true));
    secs[c.id] = sec;
  });
  const order = CATS.map(c => secs[c.id]);

  // each product photo rests very slightly askew, like the gallery prints
  const tilt = () => ((Math.random() * 2 - 1) * 1.6).toFixed(2);
  list.querySelectorAll(".item .ph").forEach(ph => ph.style.setProperty("--r", tilt() + "deg"));
  // opening: the photos are tossed out from the category title — each spins out to a scattered spot,
  // then drops into its place in the row (askew); names/prices fade in behind them
  function scatter(strip, from){
    const ox0 = from.left + 24, oy0 = from.top + from.height / 2, sec = strip.closest(".cat");
    sec.classList.add("tossing");                              // let the prints fly outside the strip while they land
    let end = 0;
    [...strip.querySelectorAll(".item")].forEach((it, i) => {
      const ph = it.querySelector(".ph"), b = ph.getBoundingClientRect();
      if (b.left > innerWidth + 40) return;                    // off screen: just sits in place
      const rest = parseFloat(ph.style.getPropertyValue("--r")) || 0;
      const spin = (Math.random() * 2 - 1) * 22, ox = (Math.random() * 2 - 1) * 26, oy = (Math.random() * 2 - 1) * 22;
      const dx = ox0 - (b.left + b.width / 2), dy = oy0 - (b.top + b.height / 2);
      const delay = i * 55 + Math.random() * 30, dur = 520 + Math.random() * 140;
      end = Math.max(end, delay + dur);
      ph.animate([
        { transform:`translate(${dx}px, ${dy}px) scale(.18) rotate(${spin}deg)`, opacity:0, offset:0 },
        { opacity:1, offset:.2 },
        { transform:`translate(${ox}px, ${oy}px) scale(1.04) rotate(${-spin * .35}deg)`, offset:.62 },
        { transform:`rotate(${rest}deg)`, opacity:1, offset:1 }
      ], { duration: dur, delay, easing:"cubic-bezier(.25,.75,.35,1)", fill:"backwards" });
      it.querySelectorAll(".name, .price").forEach(tx => tx.animate([{ opacity:0 }, { opacity:1 }], { duration:300, delay: delay + 380, fill:"backwards" }));
    });
    clearTimeout(sec._toss); sec._toss = setTimeout(() => sec.classList.remove("tossing"), end + 30);
  }
  let openCat = null;
  function setCat(id, user){
    if (id === openCat) return;
    // FLIP "zoom": the open/close changes the title's size + position and the thumbnails' size in one
    // step (no per-frame layout work), then each title and strip glides from where it was with a
    // GPU transform — smooth on phones. The section's height still opens via the grid-row transition.
    const moving = order.filter(s => s.id === id || s.id === openCat);
    const first = moving.map(s => {
      const span = s.querySelector(".cat-row span"), strip = s.querySelector(".strip"), item = strip.querySelector(".item");
      return { span, strip, item, sr: span.getBoundingClientRect(), tr: strip.getBoundingClientRect(), iw: item ? item.getBoundingClientRect().width : 0 };
    });
    order.forEach(s => { const on = s.id === id; s.classList.toggle("open", on); s.querySelector(".cat-row").setAttribute("aria-expanded", on); });
    if (user && !reduce) first.forEach(f => {
      const sr = f.span.getBoundingClientRect(), tr = f.strip.getBoundingClientRect();
      const k = f.sr.height / sr.height;                       // text scale (old size / new size)
      f.span.animate([{ transform:`translate(${f.sr.left - sr.left}px, ${f.sr.top - sr.top}px) scale(${k})` }, { transform:"none" }],
        { duration:ZOOM, easing:EASE });
      const iw = f.item ? f.item.getBoundingClientRect().width : 0;
      const opening = f.strip.closest(".cat").classList.contains("open");
      if (opening){ scatter(f.strip, f.span.getBoundingClientRect()); return; }
      if (iw && f.iw){
        f.strip.animate([{ transform:`translateX(${f.tr.left - tr.left}px) scale(${f.iw / iw})`, opacity: opening ? 0 : 1 },
                         { transform:"none", opacity: opening ? 1 : 0 }], { duration:ZOOM, easing:EASE });
      }
    });
    openCat = id;
    if (user) history.replaceState(null, "", id ? "#" + id : location.pathname);
    if (id){   // categories keep their places; just make sure the opened one is on screen
      const s = secs[id]; s.querySelector(".strip").scrollLeft = 0;
      setTimeout(() => {
        const r = s.getBoundingClientRect();
        if (r.top < 70 || r.bottom > innerHeight) scrollTo({ top: Math.max(0, scrollY + r.top - 70), behavior: reduce ? "auto" : "smooth" });
      }, user ? ZOOM : 0);
    }
  }

  // ---- product view -----------------------------------------------------------
  const pd = el("div", "pd"); pd.setAttribute("role", "dialog"); pd.setAttribute("aria-modal", "true"); pd.hidden = true;
  document.body.appendChild(pd);
  let lastFocus = null, cameFromList = false, pending = false;

  function openProduct(p){
    const n = Math.max(1, (p.images && p.images.length) || p.photos || 1);
    pd.innerHTML = "";
    pd.setAttribute("aria-label", p.title);
    const x = el("button", "pd-x"); x.type = "button"; x.setAttribute("aria-label", "Close");
    x.innerHTML = '<svg width="16" height="16" viewBox="0 0 14 14" aria-hidden="true"><path d="M1 1L13 13M13 1L1 13" fill="none" stroke="#fff" stroke-width="1.6"/></svg>';
    const media = el("div", "pd-media"), track = el("div", "pd-track");
    for (let i = 0; i < n; i++) track.appendChild(photo(p, i, true));
    media.appendChild(track);
    const dots = el("div", "pd-dots");
    if (n > 1){
      for (let i = 0; i < n; i++){ const d = el("button", i ? "" : "on"); d.type = "button"; d.setAttribute("aria-label", `Photo ${i+1}`);
        d.addEventListener("click", () => track.scrollTo({ left: i * track.clientWidth, behavior:"smooth" })); dots.appendChild(d); }
      const prev = el("button", "pd-nav prev", "←"), next = el("button", "pd-nav next", "→");
      [prev, next].forEach((b, k) => { b.type = "button"; b.setAttribute("aria-label", k ? "Next photo" : "Previous photo");
        b.addEventListener("click", () => track.scrollBy({ left: (k ? 1 : -1) * track.clientWidth, behavior:"smooth" })); media.appendChild(b); });
      track.addEventListener("scroll", () => {
        const i = Math.round(track.scrollLeft / track.clientWidth);
        [...dots.children].forEach((d, j) => d.classList.toggle("on", i === j));
      }, { passive:true });
      media.appendChild(dots);
    }
    const info = el("div", "pd-info");
    const cat = CATS.find(c => c.id === p.cat);
    info.appendChild(el("p", "pd-kicker", cat ? cat.title : ""));
    info.appendChild(el("h2", "pd-title", p.title));
    info.appendChild(el("p", "pd-price", euro(p.price)));
    let size = null;
    if (p.sizes && p.sizes.length){
      const opts = el("div", "pd-opts"); opts.setAttribute("role", "radiogroup"); opts.setAttribute("aria-label", "Size");
      p.sizes.forEach(s => { const b = el("button", null, s); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", "false");
        b.addEventListener("click", () => { size = s; [...opts.children].forEach(o => o.setAttribute("aria-checked", o === b)); add.disabled = false; add.textContent = "ADD TO BAG"; });
        opts.appendChild(b); });
      info.appendChild(opts);
    }
    const add = el("button", "pd-add", p.sizes && p.sizes.length ? "CHOOSE A SIZE" : "ADD TO BAG"); add.type = "button";
    if (p.sizes && p.sizes.length) add.disabled = true;
    const note = el("p", "pd-note");
    add.addEventListener("click", () => { note.textContent = "The online shop opens soon — this button will go to the bag."; });  // Shopify cart hooks in here
    info.append(add, note);
    info.appendChild(el("p", "pd-desc", p.desc || ""));
    pd.append(media, info, x);
    x.addEventListener("click", closeProduct);
    lastFocus = document.activeElement;
    pd.hidden = false; document.body.classList.add("pd-on");
    requestAnimationFrame(() => pd.classList.add("in"));
    x.focus({ preventScroll:true });
  }
  function closeProduct(){
    if (pd.hidden) return;
    if (cameFromList){ cameFromList = false; history.back(); return; }   // hashchange hides it
    history.replaceState(null, "", openCat ? "#" + openCat : location.pathname); hideProduct();
  }
  function hideProduct(){
    pd.classList.remove("in"); document.body.classList.remove("pd-on");
    setTimeout(() => { if (!pd.classList.contains("in")) pd.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
  }
  list.addEventListener("click", e => { if (e.target.closest(".item")) pending = true; });
  addEventListener("keydown", e => {
    if (pd.hidden) return;
    if (e.key === "Escape") closeProduct();
    const t = pd.querySelector(".pd-track");
    if (t && (e.key === "ArrowRight" || e.key === "ArrowLeft")) t.scrollBy({ left:(e.key === "ArrowRight" ? 1 : -1) * t.clientWidth, behavior:"smooth" });
  });

  // ---- routing ----------------------------------------------------------------
  function route(){
    const h = decodeURIComponent(location.hash.slice(1));
    if (h.startsWith("p/")){
      const p = PRODUCTS.find(x => x.handle === h.slice(2));
      if (p){ cameFromList = pending; pending = false; if (openCat !== p.cat) setCat(p.cat); openProduct(p); return; }
    }
    pending = false; cameFromList = false;
    if (!pd.hidden) hideProduct();
    if (secs[h]) setCat(h);
  }
  addEventListener("hashchange", route);
  route();
})();
