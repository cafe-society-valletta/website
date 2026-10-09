/* Lost Souls Club — arrival + scroll motion "Drift" (Chef picked option A, Oct 2026; scroll reworked same day).
   Arrival: the sketches fade in out of a slight zoom and the headline pieces rise in one after another.
   Scroll (driven by --p 0→1 on the headline pieces, see style.css):
     · background drifts at half speed
     · text box (.l1) drifts up slower than the page, shrinking toward its top edge, fading and blurring
     · tagline (.l3) does the opposite: grows, fades and blurs, on the same timing
     · Lost Souls Club logo (.l2) scrolls up until it reaches the top of the window, then stops there, just under
       the menu bar, for the rest of the page
     · body text scrolls normally as one block, and fades to transparent line by line as it slides up under the logo
   html.lsfx is added by the inline script in lostsouls.html's <head>. Honours prefers-reduced-motion. */
(function(){
  "use strict";
  const page = document.querySelector(".lostsouls"), root = document.documentElement;
  if (!page || !root.classList.contains("lsfx")) return;
  const art = page.querySelector(".ls-art"), head = page.querySelector(".ls-head"), bar = document.querySelector(".site-bar");
  const box = head.querySelector(".l1"), logo = head.querySelector(".l2"), tag = head.querySelector(".l3");
  const copy = page.querySelector(".ls-copy");

  const BG = .5, LAG = .4, SHRINK = .35, GAP = 10, FADE = 60;   // FADE = px of body text over which it fades in below the logo
  let reach = 1, logoTop = 0;
  const pageTop = el => el.getBoundingClientRect().top + scrollY;
  function measure(){
    box.style.translate = logo.style.translate = "0 0";
    const h = pageTop(head);   // (offsetTop ignores the arrival transforms still running on the pieces)
    reach = Math.max(80, (pageTop(copy) - (h + box.offsetTop + box.offsetHeight * (1 - SHRINK))) / LAG);   // scroll px until the box is gone
    logoTop = h + logo.offsetTop;
  }
  let ticking = false;
  function frame(){
    ticking = false;
    const y = scrollY;
    art.style.backgroundPositionY = (y * BG).toFixed(1) + "px";
    const p = Math.min(1, y / reach).toFixed(3);
    box.style.translate = "0 " + (Math.min(y, reach) * LAG).toFixed(1) + "px";
    box.style.setProperty("--p", p); tag.style.setProperty("--p", p);
    // logo: stops GAP px under the menu bar
    const stop = (bar ? bar.getBoundingClientRect().bottom : 0) + GAP, held = Math.max(0, y - (logoTop - stop));
    logo.style.translate = "0 " + held.toFixed(1) + "px";
    // body text: transparent where it is under the logo, fading back in over FADE px below it
    const under = logo.getBoundingClientRect().bottom - copy.getBoundingClientRect().top;
    copy.style.setProperty("--m0", under.toFixed(0) + "px"); copy.style.setProperty("--m1", (under + FADE).toFixed(0) + "px");
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener("scroll", req, { passive: true }); addEventListener("resize", () => { measure(); req(); });
  measure(); frame();
  const go = () => root.classList.add("lsfx-go");   // start the arrival
  requestAnimationFrame(go); setTimeout(go, 60);    // (rAF alone waits forever in a background tab)
})();
