/* SOCIETY TV (tv.html, /tv) — live sets recorded at Café Society, on Chef's vintage TV.
   - The 8 channel buttons are genre filters: press any number of them; none pressed = every set.
   - The green ◀ ▶ on the picture (or the ← → keys) change set: ▶ = a random set that matches (shuffled, no repeats until
     every match has played), ◀ = back to the one before. A burst of static between sets.
   - GUIDE (or G) opens an index of ALL the sets, grouped by GENRE, DJ or YouTube CHANNEL (tabs); pick one to tune in.
     Channel names are read from YouTube (oEmbed, no key) unless music-data.js gives one.
   - The screen (or the red POWER button, or Space) plays / pauses. When a set ends, the next channel comes on.
   Sets + genre names: assets/js/music-data.js. The YouTube player loads only if a set has a video id. */
(() => {
  const D = window.SOCIETY_TV || { genres:[], sets:[] };
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const screen = $(".stv-screen"), osd = $(".stv-osd"), chEl = $(".stv-ch"), info = $(".stv-info");
  const guide = $(".stv-guide"), gList = $(".stv-guide-l"), gTabs = $$(".stv-guide-t [data-by]");
  if (!screen) return;

  // genre buttons over Chef's own labels on the TV photo. The labels are part of the photo (Chef swaps in an identical TV with
  // new labels); D.genres holds the same names, read off it. Photo pixels per row: label box [x, y, w, h], push key [x, y, w, h].
  // Pressed (Chef, Oct 2026): the label inverts (white tape, black letters) and the key sits pushed in.
  const LABELS = [[3064,1066],[3066,1159],[3070,1253],[3066,1339],[3065,1425],[3070,1521],[3060,1606],[3060,1704]];
  const KEYS = [[2901,1080,26],[2901,1167,27],[2901,1256,27],[2899,1346,25],[2898,1431,31],[2898,1523,28],[2895,1609,29],[2897,1701,26]];
  const sel = new Set();
  const groups = $$(".stv-genres");
  const box = (el, x, y, w, h, ox, oy) => Object.assign(el.style, { left:`calc(var(--ux) * ${x - ox})`, top:`calc(var(--uy) * ${y - oy})`, width:`calc(var(--ux) * ${w})`, height:`calc(var(--uy) * ${h})` });
  groups.forEach((grp, gi) => D.genres.slice(0, 8).forEach((name, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "stv-g"; b.dataset.g = i + 1; b.setAttribute("aria-pressed", "false");
    if (gi === 0 && LABELS[i]){   // on the TV itself: an invisible row over the key and Chef's label
      const [lx, ly] = LABELS[i], [kx, ky, kh] = KEYS[i];
      const top = Math.min(ly, ky) - 14, bot = Math.max(ly + 51, ky + kh) + 14;
      b.setAttribute("aria-label", name);
      b.innerHTML = `<i class="kw" aria-hidden="true"><i class="k"></i></i><i class="lit" aria-hidden="true"></i>`;
      box(b, 2735, top, 560, bot - top, 0, 0);
      box(b.querySelector(".kw"), kx - 3, ky - 3, 82, kh + 6, 2735, top);
      const k = b.querySelector(".k");   // the key itself, cut from the photo, so it can sink into its slot
      k.style.backgroundPosition = `calc(var(--ux) * ${-(kx - 3)}) calc(var(--uy) * ${-(ky - 3)})`;
      const lit = b.querySelector(".lit"); box(lit, lx, ly, 189, 51, 2735, top);
      lit.style.backgroundPosition = `calc(var(--ux) * ${-lx}) calc(var(--uy) * ${-ly})`;
    } else {                   // the tapes version (spare; phones now use the TV's own buttons)
      b.innerHTML = `<span class="stv-tape"></span>`;
      b.querySelector(".stv-tape").textContent = name;
    }
    b.addEventListener("click", () => toggle(i + 1));
    grp.appendChild(b);
  }));

  // list = the sets in the chosen genres; cur = the one on now (index in D.sets, or -1). Next = random: a shuffled deck of
  // the matching sets, dealt one by one; hist = what was on before, for ◀.
  let list = D.sets.slice(), cur = -1, deck = [], hist = [], player = null, ready = false, playing = false, osdT = 0, burstT = 0, by = "genre";
  const pad = n => String(n).padStart(2, "0");
  const fmtDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); return m ? `${m[3]}.${m[2]}.${m[1].slice(2)}` : (d || ""); };
  const gNames = s => (s.g || []).map(n => D.genres[n - 1]).filter(Boolean).join(" / ");

  function filter(first){
    list = sel.size ? D.sets.filter(s => (s.g || []).some(n => sel.has(n))) : D.sets.slice();
    deck = [];
    $$(".stv-g").forEach(b => b.setAttribute("aria-pressed", sel.has(+b.dataset.g) ? "true" : "false"));
    if (!first && list.includes(D.sets[cur])){ drawGuide(); return; }   // what's on still fits: keep watching
    next();
  }
  function deal(){   // a fresh shuffle of the matching sets, never starting with the one on now
    deck = list.map(s => D.sets.indexOf(s));
    for (let i = deck.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    if (deck.length > 1 && deck[deck.length - 1] === cur) deck.unshift(deck.pop());
  }
  function next(){
    if (!list.length) return tune(-1);
    if (!deck.length) deal();
    if (cur >= 0) hist.push(cur);
    tune(deck.pop());
  }
  function prev(){
    while (hist.length){ const i = hist.pop(); if (i !== cur){ deck.push(cur); return tune(i); } }
    next();   // nothing earlier: just another random one
  }
  function toggle(n){ sel.has(n) ? sel.delete(n) : sel.add(n); filter(); }

  function showOsd(ms = 4000){ osd.classList.add("on"); clearTimeout(osdT); osdT = setTimeout(() => osd.classList.remove("on"), ms); }
  function burst(){ screen.classList.add("burst"); clearTimeout(burstT); burstT = setTimeout(() => screen.classList.remove("burst"), 420); }

  function tune(i){   // i = index in D.sets (-1 = nothing)
    burst();
    if (i < 0 || !D.sets[i]){
      cur = -1; chEl.textContent = "CH --"; info.textContent = "NOTHING ON IN THIS MIX\nTRY ANOTHER GENRE";
      screen.classList.add("nosig"); if (ready) player.stopVideo(); showOsd(6000); drawGuide(); return;
    }
    cur = i; deck = deck.filter(n => n !== i);
    const s = D.sets[cur];
    chEl.textContent = "CH " + pad(cur + 1);
    info.textContent = `${s.dj || ""}${s.title ? " — " + s.title : ""}\n${fmtDate(s.date)}${gNames(s) ? "  " + gNames(s) : ""}`;
    showOsd();
    screen.classList.toggle("nosig", !s.id);
    if (s.id){
      if (ready) playing ? player.loadVideoById(s.id) : player.cueVideoById(s.id);
      else loadYT();
    } else if (ready) player.stopVideo();
    drawGuide();
  }

  // GUIDE: every set (not just the chosen genres), grouped by genre (a set sits under each of its genres), DJ or channel.
  const chan = {};   // YouTube video id -> channel name (oEmbed)
  const chanOf = s => s.channel || chan[s.id] || (s.id ? "…" : "NO VIDEO YET");
  function groupsBy(){
    const m = new Map(), add = (k, i) => { if (!m.has(k)) m.set(k, []); m.get(k).push(i); };
    D.sets.forEach((s, i) => {
      if (by === "genre"){ const g = (s.g || []).filter(n => D.genres[n - 1]); g.length ? g.forEach(n => add(D.genres[n - 1], i)) : add("NO GENRE", i); }
      else if (by === "dj") add((s.dj || "UNKNOWN DJ").toUpperCase(), i);
      else add(chanOf(s).toUpperCase(), i);
    });
    const keys = [...m.keys()];
    if (by === "genre") keys.sort((a, b) => (D.genres.indexOf(a) + 99) % 99 - (D.genres.indexOf(b) + 99) % 99); else keys.sort();
    const newest = (a, b) => String(D.sets[b].date || "").localeCompare(String(D.sets[a].date || ""));
    return keys.map(k => [k, m.get(k).sort(newest)]);
  }
  function drawGuide(){
    gList.innerHTML = "";
    gTabs.forEach(t => t.setAttribute("aria-selected", t.dataset.by === by ? "true" : "false"));
    for (const [name, idx] of groupsBy()){
      const h = document.createElement("p"); h.className = "grp"; h.textContent = name; gList.appendChild(h);
      const ol = document.createElement("ol");
      idx.forEach(i => {
        const s = D.sets[i], li = document.createElement("li"); if (i === cur) li.className = "cur";
        const b = document.createElement("button"); b.type = "button";
        b.innerHTML = `<span></span><span class="d"></span>`;
        b.children[0].textContent = by === "dj" ? (s.title || "SET") : `${s.dj || ""}${s.title ? " — " + s.title : ""}`;
        b.children[1].textContent = fmtDate(s.date);
        b.addEventListener("click", e => { e.stopPropagation(); if (i !== cur){ if (cur >= 0) hist.push(cur); tune(i); } setGuide(false); if (ready && s.id){ playing = true; player.playVideo(); } });
        li.appendChild(b); ol.appendChild(li);
      });
      gList.appendChild(ol);
    }
    if (!D.sets.length){ const p = document.createElement("p"); p.textContent = "NO SETS YET"; gList.appendChild(p); }
  }
  gTabs.forEach(t => t.addEventListener("click", e => { e.stopPropagation(); by = t.dataset.by; drawGuide(); gList.scrollTop = 0; }));
  // channel names: YouTube's oEmbed (public, no key, CORS-open); the guide redraws as they arrive
  D.sets.forEach(s => {
    if (!s.id || s.channel || chan[s.id] !== undefined) return; chan[s.id] = "";
    fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent("https://www.youtube.com/watch?v=" + s.id))
      .then(r => r.ok ? r.json() : null).then(j => { chan[s.id] = (j && j.author_name) || "YOUTUBE"; if (by === "channel") drawGuide(); })
      .catch(() => { chan[s.id] = "YOUTUBE"; });
  });
  function setGuide(on){
    guide.hidden = !on; screen.classList.toggle("guide-on", on); $$(".stv-guide-b").forEach(b => b.setAttribute("aria-pressed", on ? "true" : "false"));
    if (on){ const c = $(".cur button", gList); if (c) c.scrollIntoView({ block:"nearest" }); }
  }

  // YouTube IFrame API, loaded on first need. The player has no YouTube controls; the TV is the remote.
  let ytLoading = false;
  function loadYT(){
    if (ytLoading) return; ytLoading = true;
    const first = D.sets[cur];
    window.onYouTubeIframeAPIReady = () => {
      player = new YT.Player("stv-player", {
        videoId: first && first.id || undefined,
        playerVars: { controls:0, disablekb:1, fs:0, iv_load_policy:3, modestbranding:1, playsinline:1, rel:0 },
        events: {
          onReady: () => { ready = true; const s = D.sets[cur]; if (s && s.id && (!first || s.id !== first.id)) player.cueVideoById(s.id); },
          onStateChange: e => {
            if (e.data === 1) playing = true;
            if (e.data === 2) playing = false;
            if (e.data === 0){ playing = true; next(); }   // set over: another random one
          }
        }
      });
    };
    const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s);
  }
  function playPause(){
    if (!ready || !D.sets[cur] || !D.sets[cur].id){ burst(); showOsd(); return; }
    if (playing){ player.pauseVideo(); playing = false; } else { player.playVideo(); playing = true; }
  }

  $(".stv-next").addEventListener("click", e => { e.stopPropagation(); next(); });
  $(".stv-prev").addEventListener("click", e => { e.stopPropagation(); prev(); });
  $$(".stv-guide-b").forEach(b => b.addEventListener("click", () => setGuide(guide.hidden)));
  $(".stv-guide-x").addEventListener("click", e => { e.stopPropagation(); setGuide(false); });
  $(".stv-power").addEventListener("click", playPause);
  screen.addEventListener("click", e => { if (!guide.contains(e.target) && !e.target.closest(".stv-arrow")) playPause(); });
  addEventListener("keydown", e => {
    if (e.target.closest && e.target.closest("input, textarea")) return;
    if (e.key === "ArrowRight"){ e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft"){ e.preventDefault(); prev(); }
    else if (e.key === "g" || e.key === "G") setGuide(guide.hidden);
    else if (e.key === "Escape") setGuide(false);
    else if (e.key === " " && !(e.target.closest && e.target.closest("button"))){ e.preventDefault(); playPause(); }
    else if (/^[1-8]$/.test(e.key)) toggle(+e.key);
  });

  // CRT curve + shadow, the same as Meet Me at Society (Chef): everything on the screen — the set, the static, the OSD and
  // the guide — is bent by Meet Me's desktop displacement map (assets/img/mm-warp-desk.png; R = x shift, G = y shift,
  // 0.5 = none) at the same strength (81 / 868 of the screen width), and Meet Me's glass shadow sits on top.
  (function curve(){
    const glass = $(".stv-glass"); if (!glass) return;
    const RANGE = 81 / 868, NS = "http://www.w3.org/2000/svg", id = "stv-crt";
    const svg = document.createElementNS(NS, "svg"); svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true"); svg.style.position = "absolute";
    svg.innerHTML = `<filter id="${id}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feImage preserveAspectRatio="none" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="0.35"/></filter>`;
    const twin = svg.querySelector("filter").cloneNode(true); twin.id = id + "-b"; svg.appendChild(twin);
    document.body.appendChild(svg);
    const fs = [...svg.querySelectorAll("filter")];
    const size = () => { const w = glass.clientWidth, h = glass.clientHeight; if (!w || !h) return;
      for (const f of fs){ for (const el of [f, f.querySelector("feImage")]) for (const [k, v] of Object.entries({ x:0, y:0, width:w, height:h })) el.setAttribute(k, v);
        f.querySelector("feDisplacementMap").setAttribute("scale", (RANGE * w).toFixed(1)); } };
    fetch("assets/img/mm-warp-desk.png").then(r => r.blob()).then(b => new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); }))
      .then(data => {
        fs.forEach(f => f.querySelector("feImage").setAttribute("href", data)); size();
        const warp = `url(#${id})`; glass.style.filter = warp; new ResizeObserver(size).observe(glass);
        // Safari only re-filters the patch that changed; nudge a full redraw after any change (as on Meet Me)
        if (/AppleWebKit/.test(navigator.userAgent) && !/Chrome\/|Chromium|Edg\/|Firefox|OPR\//.test(navigator.userAgent)){
          glass.style.transform = "translate3d(0,0,0)"; glass.style.willChange = "transform";
          let queued = 0, flip = false;
          const redraw = () => { if (queued) return; queued = requestAnimationFrame(() => { queued = 0; flip = !flip; glass.style.filter = flip ? `url(#${id}-b)` : warp; }); };
          new MutationObserver(redraw).observe(glass, { subtree:true, childList:true, characterData:true, attributes:true });
          redraw();
        }
      }).catch(() => {});
  })();

  // phones: swipe left → the TV slides to show its right side (genres, GUIDE); swipe right → back to the screen.
  // A tap on the peeking buttons at the right edge also slides it over.
  const stv = $(".stv"), portrait = matchMedia("(max-aspect-ratio: 1/1)");
  const side = on => { stv.classList.toggle("side", on); if (on) stv.classList.add("swiped"); };
  let sx = 0, sy = 0, st = 0;
  stv.addEventListener("touchstart", e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }, { passive:true });
  stv.addEventListener("touchend", e => {
    if (!portrait.matches) return;
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3 && Date.now() - st < 800) side(dx < 0);
  }, { passive:true });
  $(".stv-tv").addEventListener("click", e => {
    if (!portrait.matches || stv.classList.contains("side")) return;
    const r = $(".stv-tv").getBoundingClientRect(), u = r.width / 3618;
    if (e.clientX > r.left + u * 2700) side(true);   // tapped the peeking button panel
  });
  portrait.addEventListener("change", () => side(false));

  filter(true);
})();
