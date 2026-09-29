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
   Menu bar (pages 2–6): hidden above the top edge with only the
   current page's tab peeking down; slides in on demand.
   ========================================================= */
(function(){
  "use strict";
  const bar = document.querySelector("[data-bar]");
  if (!bar) return;
  const tab = bar.querySelector(".tab");
  let hideTimer, lastY = window.scrollY, touchY = null;

  const show = () => { clearTimeout(hideTimer); bar.classList.add("show"); };
  const hide = (delay = 0) => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (!bar.matches(":hover, :focus-within")) bar.classList.remove("show"); }, delay);
  };
  const shown = () => bar.classList.contains("show");

  // desktop: cursor reaches the top of the window
  document.addEventListener("mousemove", (e) => {
    const h = bar.getBoundingClientRect().height || 35;
    if (e.clientY <= Math.max(40, h * 1.2)) show();
    else if (shown()) hide(350);
  }, { passive:true });
  document.documentElement.addEventListener("mouseleave", () => hide(350));

  // tapping the peeking tab reveals the bar instead of reloading the page
  if (tab) tab.addEventListener("click", (e) => { if (!shown()) { e.preventDefault(); show(); } });

  // touch: pull down from the top, or scroll back up
  document.addEventListener("touchstart", (e) => { touchY = e.touches[0].clientY; }, { passive:true });
  document.addEventListener("touchmove", (e) => {
    if (touchY === null) return;
    const dy = e.touches[0].clientY - touchY;
    if (dy > 40 && window.scrollY <= 0) show();
  }, { passive:true });
  document.addEventListener("touchend", () => { touchY = null; }, { passive:true });

  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    bar.classList.toggle("scrolled", y > 30);
    if (y < lastY - 6) show();
    else if (y > lastY + 6 && !bar.matches(":hover")) hide();
    lastY = y;
  }, { passive:true });

  // tapping anywhere else closes it
  document.addEventListener("click", (e) => { if (shown() && !bar.contains(e.target)) hide(); });
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
