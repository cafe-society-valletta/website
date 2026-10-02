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

  const pf = new St.PageFlip(book, {
    width: 620, height: 877,                 // one A5 page (ratio 0.707); the book is two of these
    size: "stretch", minWidth: 120, maxWidth: 1240, minHeight: 170, maxHeight: 1754,
    showCover: true, usePortrait: false,     // always spreads, also on phones (Chef)
    flippingTime: reduce ? 1 : 1000,
    maxShadowOpacity: .45, drawShadow: true, showPageCorners: true,
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
    setTimeout(() => stage.classList.remove("arriving"), 1700);
    setTimeout(() => { if (pf.getCurrentPageIndex() === 0) pf.flipNext(); }, 480);   // opens while still sliding in — just a glimpse of the cover
    setTimeout(() => book.classList.remove("bk-enter"), 950);
  }

  nextB.addEventListener("click", () => pf.flipNext());
  prevB.addEventListener("click", () => pf.flipPrev());
  addEventListener("keydown", e => {
    if (e.key === "ArrowRight") pf.flipNext();
    if (e.key === "ArrowLeft") pf.flipPrev();
  });
})();
