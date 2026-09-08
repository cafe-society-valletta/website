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
