/* =========================================================
   CAFE SOCIETY — Characters parade frame clock
   The parade and each figure's pose are separate CSS animations. Left to
   run on their own, the browser can land the line's step and the pose
   change a few milliseconds apart, which reads as two jumps. This script
   pauses them all and advances every one of them together, once per
   frame, from a single clock — so each figure makes exactly one jump
   (move + pose + lean) per frame. Without JS the CSS still runs as-is.
   ========================================================= */
(function(){
  "use strict";
  const root = document.querySelector(".home-chars");
  if (!root || !root.getAnimations) return;

  const FPS = 1.5;
  const FRAME = 1000 / FPS;              // must match --beat in style.css
  let hovering = false;
  let frame = 0;
  let last = -1;
  let clock = 0;                          // ms of parade time elapsed
  let prev = performance.now();

  root.addEventListener("mouseenter", () => { hovering = true; });
  root.addEventListener("mouseleave", () => { hovering = false; });

  function tick(now){
    if (!hovering && !document.hidden) clock += now - prev;
    prev = now;
    frame = Math.floor(clock / FRAME);
    if (frame !== last){
      last = frame;
      // Sample every animation at the middle of the current frame, in one go.
      const t = frame * FRAME + FRAME / 2;
      root.getAnimations({ subtree: true }).forEach(a => {
        if (a.playState !== "paused") a.pause();
        a.currentTime = t;
      });
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
