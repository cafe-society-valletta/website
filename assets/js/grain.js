/* Film grain over every page (Chef, Oct 2026). Source: the AdobeStock film-grain clip, cut down to 8 frames
   (1 s at 12 fps) as 256px tiles: black with light specks, blended with `screen`, so dark areas get grain and
   light/white areas stay clean. Strength = .cs-grain opacity in style.css. Static frame for reduced motion;
   paused while the tab is hidden. */
(function(){
  const N = 8, FPS = 12, base = "assets/img/grain/g";
  const el = document.createElement("div");
  el.className = "cs-grain"; el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  const urls = Array.from({ length:N }, (_, i) => `url(${base}${i + 1}.webp)`);
  urls.forEach(u => { const im = new Image(); im.src = u.slice(4, -1); });   // preload
  el.style.backgroundImage = urls[0];
  if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let i = 0, last = 0, raf = 0;
  const tick = t => { if(t - last >= 1000 / FPS){ last = t; i = (i + 1) % N; el.style.backgroundImage = urls[i]; } raf = requestAnimationFrame(tick); };
  const run = () => { cancelAnimationFrame(raf); if(!document.hidden) raf = requestAnimationFrame(tick); };
  document.addEventListener("visibilitychange", run);
  run();
})();
