/* Lost Souls Club — arrival + scroll motion "Drift" (Chef picked option A, Oct 2026; scroll reworked same day).
   Arrival: the sketches fade in out of a slight zoom and the headline pieces rise in one after another.
   Scroll:
     · background drifts at half speed
     · text box (.l1) drifts up slower than the page, shrinking toward its top edge, fading and blurring
     · tagline (.l3) grows at a steady rate in step with the box contracting, its centre kept halfway between the
       logo and the body text; it fades from the moment it starts growing and is gone when the text meets the logo
     · Lost Souls Club logo (.l2) scrolls up until it reaches the top of the window, then stops just under the menu
       bar for the rest of the page — CSS position:sticky (style.css)
     · body text scrolls as one block; as it slides up under the logo and menu bar it fades to faint (15%, from 30px below the logo) and goes
       out of focus behind a frosted veil (.ls-veil, blur only) that appears once the logo sticks
   Smoothness: where the browser has scroll-driven animations (Chrome/Edge, Safari 26+) every scroll effect is a CSS
   animation tied to the scroll position (style.css "lsfx-sda"), so it moves in the same frame as the page — this script
   only measures. Elsewhere it falls back to updating on scroll events.
   html.lsfx is added by the inline script in lostsouls.html's <head>. Honours prefers-reduced-motion. */
(function(){
  "use strict";
  const page = document.querySelector(".lostsouls"), root = document.documentElement;
  if (!page || !root.classList.contains("lsfx")) return;
  const art = page.querySelector(".ls-art"), head = page.querySelector(".ls-head");
  const box = head.querySelector(".l1"), logo = head.querySelector(".l2"), tag = head.querySelector(".l3");
  const copy = page.querySelector(".ls-copy");
  const veil = document.createElement("div"); veil.className = "ls-veil"; veil.setAttribute("aria-hidden", "true"); copy.after(veil);
  const SDA = window.CSS && CSS.supports("animation-timeline: scroll()");
  if (SDA) root.classList.add("lsfx-sda");

  const BG = .5, LAG = .4, SHRINK = .35;
  let reach = 1, S = 0, u0 = 0, gap = 1, qs = 0, qe = 1, toff = 0;
  const px = v => v.toFixed(1) + "px";
  function measure(){   // offsetTop is relative to the page and ignores the arrival transforms
    const max = Math.max(1, root.scrollHeight - innerHeight);
    reach = Math.max(80, (copy.offsetTop - (box.offsetTop + box.offsetHeight * (1 - SHRINK))) / LAG);   // scroll px until the box is gone
    const cs = getComputedStyle(logo);
    const logoTop = box.offsetTop + box.offsetHeight + parseFloat(cs.marginTop);   // where the logo sits before it sticks
    S = Math.max(0, logoTop - parseFloat(cs.top));                                  // scroll px at which it sticks
    u0 = logoTop + logo.offsetHeight - copy.offsetTop;                              // logo bottom vs body-text top (negative = above)
    art.style.setProperty("--bg-end", px(max * BG));
    box.style.setProperty("--reach", px(reach)); box.style.setProperty("--drift", px(reach * LAG));
    // tagline: the logo→text gap (−u0) closes over the scroll S → S+gap; the tagline rides its middle (half speed)
    // and grows on the box's timing (0 → reach)
    gap = Math.max(1, -u0); qs = 0; qe = S + gap;                                     // fades from the first scroll until it meets the text
    tag.style.setProperty("--reach", px(reach)); tag.style.setProperty("--ms", px(S)); tag.style.setProperty("--meet", px(S + gap));
    const tagTop = logoTop + logo.offsetHeight + parseFloat(getComputedStyle(tag).marginTop);
    toff = (logoTop + logo.offsetHeight + copy.offsetTop) / 2 - (tagTop + tag.offsetHeight / 2);   // nudge it exactly to the middle
    tag.style.setProperty("--qs", px(qs)); tag.style.setProperty("--qe", px(qe)); tag.style.setProperty("--toff", px(toff)); tag.style.setProperty("--tdrift", px(toff + gap / 2));
    copy.style.setProperty("--u0", px(u0)); copy.style.setProperty("--ms", px(S)); copy.style.setProperty("--span", px(Math.max(1, max - S)));
    veil.style.setProperty("--vs", px(Math.max(0, S - 60))); veil.style.setProperty("--ms", px(Math.max(1, S)));
  }
  let ticking = false;
  function frame(){   // fallback for browsers without scroll-driven animations
    ticking = false;
    const y = scrollY;
    art.style.backgroundPositionY = px(y * BG);
    const p = Math.min(1, y / reach).toFixed(3);
    box.style.translate = "0 " + px(Math.min(y, reach) * LAG); box.style.setProperty("--p", p);
    tag.style.translate = "0 " + px(toff + Math.min(gap, Math.max(0, y - S)) / 2);
    tag.style.setProperty("--p", p);
    tag.style.setProperty("--q", Math.min(1, Math.max(0, (y - qs) / (qe - qs))).toFixed(3));
    copy.style.setProperty("--m0", px(u0 + Math.max(0, y - S)));
    veil.style.opacity = Math.min(1, Math.max(0, (y - (S - 60)) / 60)).toFixed(2);
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  const remeasure = () => { measure(); if (!SDA) req(); };
  if (!SDA) addEventListener("scroll", req, { passive: true });
  addEventListener("resize", remeasure); addEventListener("load", remeasure);
  if (window.ResizeObserver) new ResizeObserver(remeasure).observe(page);
  remeasure(); if (!SDA) frame();
  const go = () => root.classList.add("lsfx-go");   // start the arrival
  requestAnimationFrame(go); setTimeout(go, 60);    // (rAF alone waits forever in a background tab)
})();
