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
