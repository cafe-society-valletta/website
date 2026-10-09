/* Lost Souls Club — arrival + scroll motion "Drift" (Chef picked option A, Oct 2026).
   On arrival the sketches fade in out of a slight zoom and the headline lines rise in one after another;
   on scroll the background drifts at half speed, the headline lines float apart a little and each paragraph
   rises in as it comes on screen. html.lsfx is added by the inline script in lostsouls.html's <head> (so nothing
   flashes before this runs). Honours prefers-reduced-motion (nothing moves). */
(function(){
  "use strict";
  const page = document.querySelector(".lostsouls"), root = document.documentElement;
  if (!page || !root.classList.contains("lsfx")) return;
  const art = page.querySelector(".ls-art"), head = page.querySelector(".ls-head");
  const lines = [...head.querySelectorAll("img")], paras = [...page.querySelectorAll(".ls-copy > *")];

  // paragraphs rise in as they enter the screen
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
    { rootMargin: "0px 0px -8% 0px" });
  paras.forEach(p => io.observe(p));

  // scroll-linked layers: background at half speed, headline lines at slightly different speeds
  const BG = .5, LINES = [.18, .1, .04];
  let ticking = false;
  function frame(){
    ticking = false;
    const y = scrollY;
    art.style.backgroundPositionY = (y * BG).toFixed(1) + "px";
    if (y < head.offsetTop + head.offsetHeight + innerHeight) lines.forEach((l, i) => l.style.translate = "0 " + (y * LINES[i]).toFixed(1) + "px");
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener("scroll", req, { passive: true }); addEventListener("resize", req);
  frame();
  requestAnimationFrame(() => root.classList.add("lsfx-go"));   // start the arrival
})();
