/* Menu — the printed A5 booklet as a flip book. Uses StPageFlip (assets/js/vendor/page-flip.browser.js,
   MIT) for natural page turns: the paper curls from the corner with moving light and shadow, and pages
   can be dragged by hand. The covers are stiff ("hard"), the inside pages soft. Opens closed on the
   cover (centred), shows A4-wide spreads, closes on the back cover. No shadow sits in the gutter at rest.
   Pages: assets/img/menu/menu-NN.jpg (1240w) + menu-NN-s.jpg (700w), from the menu PDF; data-pages = count. */
(() => {
  const root = document.getElementById("booklet");
  if (!root || !window.St) return;
  const stage = root.querySelector(".bk-stage"), book = root.querySelector(".bk-book"), count = root.querySelector(".bk-count");
  const prevB = root.querySelector(".bk-prev"), nextB = root.querySelector(".bk-next");
  const N = parseInt(root.dataset.pages, 10) || 20;
  const pad = n => String(n).padStart(2, "0");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const pages = [];
  for (let n = 1; n <= N; n++){
    const pg = document.createElement("div");
    pg.className = "bk-page";
    if (n === 1 || n === N) pg.dataset.density = "hard";          // covers turn stiff, like card
    const img = new Image();
    img.alt = n === 1 ? "Menu — cover" : n === N ? "Menu — back cover" : `Menu — page ${n}`;
    img.sizes = "(min-width: 900px) 42vw, 50vw";
    img.draggable = false;
    img.dataset.n = pad(n);
    img.onerror = () => { img.remove(); pg.classList.add("ph"); pg.dataset.n = n; };
    pg.appendChild(img);
    book.appendChild(pg);
    pages.push(pg);
  }

  // only fetch the pages around the current spread (the full booklet is ~10 MB)
  function load(i){
    book.querySelectorAll("img[data-n]").forEach(img => {
      const n = +img.dataset.n;
      if (n < i - 4 || n > i + 7 || img.srcset) return;
      img.srcset = `assets/img/menu/menu-${img.dataset.n}-s.jpg 700w, assets/img/menu/menu-${img.dataset.n}.jpg 1240w`;
      img.src = `assets/img/menu/menu-${img.dataset.n}.jpg`;
    });
  }
  load(0);

  // pinch-to-zoom (phones): the book sits in a clipping frame; two fingers zoom it (up to 4×) around the pinch,
  // one finger pans while zoomed, double-tap zooms in / out. While zoomed, touches don't turn pages.
  const clip = document.createElement("div"), zoomer = document.createElement("div");
  clip.className = "bk-clip"; zoomer.className = "bk-zoom";
  book.parentNode.insertBefore(clip, book); clip.appendChild(zoomer); zoomer.appendChild(book);

  const pf = new St.PageFlip(book, {
    width: 620, height: 877,                 // one A5 page (ratio 0.707); the book is two of these
    size: "stretch", minWidth: 120, maxWidth: 1240, minHeight: 170, maxHeight: 1754,
    showCover: true, usePortrait: false,     // always spreads, also on phones (Chef)
    flippingTime: reduce ? 1 : 480,           // quick, crisp turns
    maxShadowOpacity: .25, drawShadow: true, showPageCorners: true,
    mobileScrollSupport: true, swipeDistance: 30, startZIndex: 2
  });
  pf.loadFromHTML(pages);

  function show(i){
    load(i);
    const last = N - 1;
    stage.classList.toggle("closed-front", i === 0);
    stage.classList.toggle("closed-back", i >= last);
    if (i === 0) count.textContent = "COVER";
    else if (i >= last) count.textContent = "BACK";
    else { const l = i % 2 ? i : i - 1; count.textContent = `${l + 1}–${l + 2} / ${N}`; }
    prevB.disabled = i === 0; nextB.disabled = i >= last;
  }
  pf.on("flip", e => show(e.data));
  pf.on("changeState", e => { if (e.data === "flipping" || e.data === "user_fold") load(pf.getCurrentPageIndex()); });
  show(0);

  // arrival: the closed booklet slides in, settles, then opens itself to the first spread
  if (reduce) pf.turnToPage(1), show(1);
  else {
    // slide straight to the open-book position (cover in the right half) so nothing re-centres or bounces back
    stage.classList.add("arriving");
    book.classList.add("bk-enter");
    pf.on("flip", () => stage.classList.remove("arriving"));     // only once it has actually opened (a hidden tab can delay the turn)
    setTimeout(() => { if (pf.getCurrentPageIndex() === 0) pf.flipNext(); }, 480);   // opens while still sliding in — just a glimpse of the cover
    setTimeout(() => book.classList.remove("bk-enter"), 950);
  }

  let z = 1, tx = 0, ty = 0, g = null, lastTap = 0;
  const apply = (anim) => {
    zoomer.style.transition = anim ? "transform .25s ease" : "none";
    zoomer.style.transform = z === 1 ? "" : `translate(${tx}px, ${ty}px) scale(${z})`;
    clip.classList.toggle("zoomed", z > 1);
  };
  const clamp = () => {
    const W = clip.clientWidth, H = clip.clientHeight;
    tx = Math.min(0, Math.max(W - W * z, tx)); ty = Math.min(0, Math.max(H - H * z, ty));
  };
  const zoomTo = (s, cx, cy, anim) => {          // keep the point under (cx, cy) in place
    const px = (cx - tx) / z, py = (cy - ty) / z;
    z = Math.max(1, Math.min(4, s)); tx = cx - px * z; ty = cy - py * z;
    if (z < 1.03){ z = 1; tx = ty = 0; }
    clamp(); apply(anim);
  };
  const local = (x, y) => { const r = clip.getBoundingClientRect(); return [x - r.left, y - r.top]; };
  const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  clip.addEventListener("touchstart", e => {
    const T = e.touches;
    if (T.length === 2){
      const [cx, cy] = local((T[0].clientX + T[1].clientX) / 2, (T[0].clientY + T[1].clientY) / 2);
      g = { type:"pinch", d:dist(T[0], T[1]), z, cx, cy, tx, ty };
    } else if (T.length === 1 && z > 1){
      g = { type:"pan", x:T[0].clientX, y:T[0].clientY, tx, ty };
    } else return;                                // not zoomed, one finger: let the page turn
    e.stopPropagation(); e.preventDefault();
  }, { capture:true, passive:false });
  clip.addEventListener("touchmove", e => {
    if (!g) return;
    const T = e.touches;
    if (g.type === "pinch" && T.length >= 2){
      const [cx, cy] = local((T[0].clientX + T[1].clientX) / 2, (T[0].clientY + T[1].clientY) / 2);
      const s = Math.max(1, Math.min(4, g.z * dist(T[0], T[1]) / g.d));
      const px = (g.cx - g.tx) / g.z, py = (g.cy - g.ty) / g.z;
      z = s; tx = cx - px * z; ty = cy - py * z; clamp(); apply(false);
    } else if (g.type === "pan" && T.length === 1){
      if (Math.abs(T[0].clientX - g.x) + Math.abs(T[0].clientY - g.y) > 8) g.moved = true;
      tx = g.tx + T[0].clientX - g.x; ty = g.ty + T[0].clientY - g.y; clamp(); apply(false);
    }
    e.stopPropagation(); e.preventDefault();
  }, { capture:true, passive:false });
  clip.addEventListener("touchend", e => {
    if (g){
      e.stopPropagation();
      const tap = g.type === "pan" && !g.moved;              // a still touch while zoomed counts as a tap
      if (e.touches.length === 0){ if (z < 1.03){ z = 1; tx = ty = 0; apply(true); } g = null; }
      else if (e.touches.length === 1 && z > 1) g = { type:"pan", x:e.touches[0].clientX, y:e.touches[0].clientY, tx, ty };
      if (!tap) return;
    }
    // double-tap: zoom to 2.5× at the tap, or back out
    const now = Date.now(), t0 = e.changedTouches[0];
    if (now - lastTap < 300){
      const [cx, cy] = local(t0.clientX, t0.clientY);
      if (z > 1){ z = 1; tx = ty = 0; apply(true); } else zoomTo(2.5, cx, cy, true);
      e.stopPropagation(); e.preventDefault(); lastTap = 0;
    } else lastTap = now;
  }, { capture:true, passive:false });
  const unzoom = () => { if (z > 1){ z = 1; tx = ty = 0; apply(true); } };
  pf.on("flip", unzoom);

  nextB.addEventListener("click", () => pf.flipNext());
  prevB.addEventListener("click", () => pf.flipPrev());
  addEventListener("keydown", e => {
    if (e.key === "ArrowRight") pf.flipNext();
    if (e.key === "ArrowLeft") pf.flipPrev();
  });
})();
