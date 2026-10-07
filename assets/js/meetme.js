/* Meet Me at Society — the green-screen message board (retro Craigslist × Reddit).
   Renders into whichever monitor is showing (.mm-phone < 900px, else .mm-computer). Two screens:
     HOME     [ WRITE A POST ]_   ← button (or just start typing) → the compose screen
              ===== M E S S A G E   I N B O X =====   DATE TIME AUTHOR SUBJECT, newest first; rows link to #p/<id>
     COMPOSE  (#new)  NAME> (remembered)  SUBJECT> (44 chars = one inbox line)  MESSAGE> (up to 5000)
              PHOTOS> up to 4, shrunk in the browser to JPEG ≤ 1600 px / ≤ 1 MB each     [SEND] [CANCEL]
   All screen copy is written the way the 8-bit terminal would print it (Chef): CAPS system lines, > prompts, terse.
   Only exception: the attached photos themselves (shown as normal photos).
   The screen appears once the intro clip has finished (document event "mm:ready"); typing during the intro skips it.
   STORAGE: netlify/functions/meetme.mjs (Netlify Blobs). New posts wait for approval (mmadmin.html); until then the
   poster sees their own post marked "[PENDING]" (localStorage "mm-mine"). SEED = example post(s).
   Limits must match the function: LIM below. */
(function(){
  const SEED = [
    { id:"jake-photo-safari", at:"2026-01-16T00:12", author:"Jake Page", subject:"Photo safari Hastings Garden Sunday B4 LSC?" },
  ];
  const LIM = { author:24, subject:44, body:5000, photos:4, photoBytes:1000 * 1024 };
  const box = document.querySelector(matchMedia("(max-width: 899.98px)").matches ? ".mm-phone" : ".mm-computer");
  const screen = box && box.querySelector(".mm-screen"), glass = screen && screen.parentNode;   // glass = the filtered box
  if(!screen) return;

  const store = { get(k, d){ try{ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
                  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const two = n => String(n).padStart(2, "0");
  const fmt = iso => { const d = new Date(iso); return [`${two(d.getDate())}-${two(d.getMonth()+1)}-${String(d.getFullYear()).slice(-2)}`, `${two(d.getHours())}:${two(d.getMinutes())}`]; };
  const API = "/.netlify/functions/meetme";
  let live = [];
  const posts = () => {
    const ids = new Set(live.map(p => p.id));
    const mine = store.get("mm-mine", []).filter(p => !ids.has(p.id)).map(p => ({ ...p, waiting:true }));
    store.set("mm-mine", mine.map(({ waiting, ...p }) => p).filter(p => Date.now() - Date.parse(p.at) < 7 * 864e5));   // forget after a week
    return [...live, ...mine, ...SEED.filter(p => !ids.has(p.id))].sort((a, b) => b.at.localeCompare(a.at));
  };
  const load = () => fetch(API, { cache:"no-store" }).then(r => r.ok ? r.json() : null).then(d => { if(d && d.posts){ live = d.posts; render(); } }).catch(() => {});
  const rule = (c, n) => `<div class="mmb-rule${c === "-" ? " mmb-thin" : ""}">${c.repeat(n)}</div>`;

  screen.innerHTML = `
    <div class="mmb">
      <button type="button" class="mmb-btn mmb-back" hidden>&lt;- GO BACK</button>
      <section class="mmb-home">
        <p class="mmb-write-row"><a class="mmb-write" href="#new" role="button">[ WRITE A POST ]</a><button type="button" class="mmb-btn mmb-fs">[FULLSCREEN]</button></p>
        <p class="mmb-hint mmb-home-hint" aria-live="polite"></p>
        <div class="mmb-inbox">
          ${rule("=", 160)}<h2 class="mmb-title">M E S S A G E&nbsp;&nbsp;&nbsp;I N B O X</h2>${rule("=", 160)}
          <div class="mmb-row mmb-head" aria-hidden="true"><span>DATE</span><span>TIME</span><span>AUTHOR</span><span>SUBJECT</span></div>
          ${rule("-", 200)}
          <ol class="mmb-list"></ol>
        </div>
      </section>
      <form class="mmb-compose" hidden novalidate>
        ${rule("=", 160)}<h2 class="mmb-title">N E W&nbsp;&nbsp;&nbsp;P O S T</h2>${rule("=", 160)}
        <label class="mmb-field"><span class="mmb-k">NAME&gt;</span><input name="author" maxlength="${LIM.author}" autocomplete="nickname" spellcheck="false"></label>
        <label class="mmb-field"><span class="mmb-k">SUBJECT&gt;</span><input name="subject" maxlength="${LIM.subject}" autocomplete="off" autocapitalize="sentences"><small class="mmb-n" data-for="subject"></small></label>
        <label class="mmb-field mmb-tall"><span class="mmb-k">MESSAGE&gt;</span><textarea name="body" maxlength="${LIM.body}" rows="7" autocapitalize="sentences"></textarea><small class="mmb-n" data-for="body"></small></label>
        <div class="mmb-field"><span class="mmb-k">PHOTOS&gt;</span><button type="button" class="mmb-btn mmb-add">[+ ATTACH]</button><small class="mmb-n mmb-pn"></small></div>
        <input class="mmb-file" type="file" accept="image/*" multiple hidden>
        <ul class="mmb-thumbs"></ul>
        <input class="mmb-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        ${rule("-", 200)}
        <p class="mmb-hint mmb-send-hint" aria-live="polite"></p>
        <p class="mmb-actions"><button type="submit" class="mmb-btn">[ SEND ]</button><button type="button" class="mmb-btn mmb-cancel">[ CANCEL ]</button></p>
      </form>
    </div>`;
  const $ = s => screen.querySelector(s);
  const $home = $(".mmb-home"), $form = $(".mmb-compose"), $list = $(".mmb-list"), $homeHint = $(".mmb-home-hint"), $hint = $(".mmb-send-hint");
  const $author = $form.elements.author, $subject = $form.elements.subject, $body = $form.elements.body, $file = $(".mmb-file"), $thumbs = $(".mmb-thumbs");

  function render(){
    $list.innerHTML = posts().map(p => { const [d, t] = fmt(p.at);
      return `<li><a class="mmb-row${p.waiting ? " mmb-wait" : ""}" href="#p/${esc(p.id)}"><span>${d}</span><span>${t}</span><span>&lt;${esc(p.author)}&gt;</span><span>${esc(p.subject)}${p.waiting ? " <em>[PENDING]</em>" : ""}</span></a></li>`; }).join("");
  }
  render(); load(); setInterval(() => { if(!document.hidden) load(); }, 60e3);

  // ---- counters ----
  const counts = () => {
    screen.querySelectorAll(".mmb-n[data-for]").forEach(n => { const f = $form.elements[n.dataset.for]; n.textContent = `${f.value.length}/${f.maxLength}`; });
    $(".mmb-pn").textContent = `${shots.length}/${LIM.photos}`;
    $(".mmb-add").disabled = shots.length >= LIM.photos;
  };
  $form.addEventListener("input", counts);

  // ---- photos: shrink in the browser (JPEG, long side 1600 → 1400 → 1200 px until ≤ 1 MB) ----
  let shots = [];   // { type, data(base64), url }
  const shrink = file => new Promise((ok, no) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = async () => {
      for(const [side, q] of [[1600, .82], [1400, .74], [1200, .66], [1000, .6]]){
        const k = Math.min(1, side / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
        c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        const blob = await new Promise(r => c.toBlob(r, "image/jpeg", q));
        if(blob && blob.size <= LIM.photoBytes){
          URL.revokeObjectURL(url);
          const data = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); });
          return ok({ type:"image/jpeg", data, url:URL.createObjectURL(blob) });
        }
      }
      URL.revokeObjectURL(url); no(new Error("big"));
    };
    im.onerror = () => { URL.revokeObjectURL(url); no(new Error("type")); };
    im.src = url;
  });
  const drawThumbs = () => {
    $thumbs.innerHTML = shots.map((s, i) => `<li><img src="${s.url}" alt="Attached photo ${i+1}"><button type="button" class="mmb-btn mmb-x" data-i="${i}" aria-label="Remove photo ${i+1}">[X]</button></li>`).join("");
    counts();
  };
  $(".mmb-add").addEventListener("click", () => $file.click());
  $file.addEventListener("change", async () => {
    const files = [...$file.files].slice(0, LIM.photos - shots.length); $file.value = "";
    if(!files.length) return;
    $hint.textContent = "PROCESSING IMAGE...";
    for(const f of files){ try{ shots.push(await shrink(f)); drawThumbs(); }catch(e){ $hint.textContent = "?ERROR: CAN'T READ THAT IMAGE."; return; } }
    $hint.textContent = "";
  });
  $thumbs.addEventListener("click", e => { const b = e.target.closest(".mmb-x"); if(!b) return;
    const [gone] = shots.splice(+b.dataset.i, 1); URL.revokeObjectURL(gone.url); drawThumbs(); });

  // ---- screens (#new = compose) ----
  const isCompose = () => location.hash === "#new";
  function view(){
    const c = isCompose(); $home.hidden = c; $form.hidden = !c; screen.scrollTop = 0;
    if(c){ if(!$author.value) $author.value = store.get("mm-name", ""); counts(); $hint.textContent = "";
      if(matchMedia("(hover: hover)").matches) ($author.value ? $subject : $author).focus({ preventScroll:true }); }
  }
  addEventListener("hashchange", view);
  const toHome = () => { if(isCompose()) history.pushState(null, "", location.pathname + location.search); view(); };
  $(".mmb-cancel").addEventListener("click", () => { if(history.state && history.state.mmNew) history.back(); else toHome(); });
  const openCompose = () => { if(!isCompose()){ history.pushState({ mmNew:true }, "", "#new"); view(); } };
  $(".mmb-write").addEventListener("click", e => { e.preventDefault(); openCompose(); });
  $form.addEventListener("keydown", e => { if(e.key === "Escape") $(".mmb-cancel").click(); });

  // start typing on the home screen = start a post (the key lands in the first empty field)
  addEventListener("keydown", e => {
    if(isCompose() || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    if(document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    e.preventDefault(); openCompose();
    const f = $author.value ? $subject : $author; f.focus({ preventScroll:true }); f.value += e.key; counts();
  });

  // ---- 8-bit mouse pointer: over the screen the system cursor is hidden and a green pixel arrow (I-beam over text fields)
  // follows the mouse along the CRT curve. It lives OUTSIDE the bent screen (position:fixed on <body>), so moving it never
  // re-renders the expensive SVG filter; instead its spot is bent in JS with the same displacement map: we find the screen
  // point q whose bent image shows the un-bent point p under the mouse (q + d(q) = p), i.e. it sits over what a click hits.
  // Mouse/trackpad devices only.
  if(matchMedia("(hover: hover) and (pointer: fine)").matches){
    const ARROW = ["X","XX","XoX","XooX","XoooX","XooooX","XoooooX","XooooooX","XoooooooX","XooooooooX","XoooooXXXXX","XooXooX","XoX.XooX","XX..XooX","X....XooX",".....XooX","......XX"];
    const BEAM = ["XXX.XXX","...X...","...X...","...X...","...X...","...X...","...X...","...X...","...X...","...X...","...X...","...X...","XXX.XXX"];
    const svg = (rows, w) => { let r = ""; rows.forEach((row, y) => [...row].forEach((c, x) => {
        if(c !== ".") r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c === "X" && w ? "#0a3a12" : "#7dff7d"}"/>`; }));
      return "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.max(...rows.map(r => r.length))} ${rows.length}" shape-rendering="crispEdges">${r}</svg>`); };
    const arrow = svg(ARROW, true), beam = svg(BEAM, false);   // arrow: green fill, dark pixel outline
    const ptr = document.createElement("i"); ptr.className = "mmb-ptr"; ptr.setAttribute("aria-hidden", "true"); ptr.hidden = true;
    document.body.appendChild(ptr);
    let kind = "", frame = 0, last = null;
    const lin = b => b / 255;   // map byte → 0..1 (0.5 = no shift)
    const bend = (x, y, w, h) => {   // un-bent screen point → where the filter draws it
      const m = warpMap; if(!m || screen.classList.contains("full")) return [x, y];
      const S = m.range * w, d = (qx, qy) => { const mx = Math.min(m.w - 1, Math.max(0, Math.round(qx / w * m.w - .5))),
        my = Math.min(m.h - 1, Math.max(0, Math.round(qy / h * m.h - .5))), k = (my * m.w + mx) * 4;
        return [S * (lin(m.px[k]) - .5), S * (lin(m.px[k + 1]) - .5)]; };
      let qx = x, qy = y; for(let n = 0; n < 5; n++){ const [dx, dy] = d(qx, qy); qx = x - dx; qy = y - dy; }
      return [qx, qy]; };
    const place = () => { frame = 0; if(!last) return; const r = screen.getBoundingClientRect();
      const [qx, qy] = bend(last.x - r.left, last.y - r.top, r.width, r.height);
      const k = last.t && last.t.closest && last.t.closest("input:not([type=file]), textarea") ? "beam" : "arrow";
      if(k !== kind){ kind = k; ptr.style.backgroundImage = `url("${k === "beam" ? beam : arrow}")`; ptr.style.aspectRatio = k === "beam" ? "7 / 13" : "11 / 17"; ptr.classList.toggle("beam", k === "beam"); }
      const full = screen.classList.contains("full"), wpx = full ? (k === "beam" ? 10 : 16) : Math.max(k === "beam" ? 10 : 16, r.width * (k === "beam" ? .0125 : .02));
      const ox = k === "beam" ? wpx / 2 : 0, oy = k === "beam" ? wpx * 13 / 14 : 0;   // arrow: tip on the spot; I-beam: centred
      ptr.style.width = wpx + "px"; ptr.style.transform = `translate3d(${r.left + qx - ox}px, ${r.top + qy - oy}px, 0)`; };
    screen.classList.add("mm-ptr-on");
    screen.addEventListener("pointermove", e => { if(e.pointerType !== "mouse") return;
      last = { x:e.clientX, y:e.clientY, t:e.target }; ptr.hidden = false; if(!frame) frame = requestAnimationFrame(place); });
    screen.addEventListener("pointerleave", () => { ptr.hidden = true; last = null; });
  }

  // ---- [FULLSCREEN]: the screen zooms out of the monitor into a flat, full-window terminal (no casing, menu or footer,
  // no CRT warp) — the SYSOP-console look. [<- GO BACK] (or Esc on the home screen) zooms it back into the monitor.
  // The screen element is moved to <body> while full (the monitors are transformed, which would trap position:fixed).
  let home = null;
  function setFull(on){
    if(on === screen.classList.contains("full")) return;
    const a = screen.getBoundingClientRect();
    if(on){ home = [screen.parentNode, screen.nextSibling]; document.body.appendChild(screen); }
    else home[0].insertBefore(screen, home[1]);
    screen.classList.toggle("full", on); document.documentElement.classList.toggle("mm-full", on);
    $(".mmb-fs").hidden = on; $(".mmb-back").hidden = !on;
    const b = screen.getBoundingClientRect();
    if(screen.animate) screen.animate([
      { transformOrigin:"0 0", transform:`translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})` },
      { transformOrigin:"0 0", transform:"none" }], { duration:420, easing:"steps(9, end)" });   // stepped = slow old machine
    (on ? $(".mmb-back") : $(".mmb-fs")).focus({ preventScroll:true });
  }
  $(".mmb-fs").addEventListener("click", () => setFull(true));
  $(".mmb-back").addEventListener("click", () => setFull(false));
  addEventListener("keydown", e => { if(e.key === "Escape" && !isCompose()) setFull(false); });

  // ---- send ----
  $form.addEventListener("submit", e => {
    e.preventDefault();
    const author = $author.value.trim(), subject = $subject.value.trim(), body = $body.value.trim();
    if(!author){ $hint.textContent = "?ERROR: NAME REQUIRED."; $author.focus(); return; }
    if(subject.length < 2){ $hint.textContent = "?ERROR: SUBJECT REQUIRED."; $subject.focus(); return; }
    store.set("mm-name", author);
    const btns = $form.querySelectorAll("button"); btns.forEach(b => b.disabled = true);
    $hint.textContent = shots.length ? `TRANSMITTING ${shots.length} IMAGE(S)...` : "TRANSMITTING...";
    fetch(API, { method:"POST", headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ author, subject, body, photos:shots.map(({ type, data }) => ({ type, data })), website:$form.elements.website.value }) })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok:r.ok, d })))
      .then(({ ok, d }) => {
        if(!ok || !d.ok) throw new Error((d && d.error) || "net");
        const n = new Date(), at = `${n.getFullYear()}-${two(n.getMonth()+1)}-${two(n.getDate())}T${two(n.getHours())}:${two(n.getMinutes())}`;
        const mine = store.get("mm-mine", []); mine.push({ id:d.id, at, author, subject }); store.set("mm-mine", mine);
        $subject.value = ""; $body.value = ""; shots.forEach(s => URL.revokeObjectURL(s.url)); shots = []; drawThumbs();
        $homeHint.textContent = "MESSAGE QUEUED. AWAITING SYSOP APPROVAL.";
        render(); toHome();
      })
      .catch(err => { const m = err && err.message;
        $hint.textContent = m === "slow-down" ? "?ERROR: TOO MANY MESSAGES. WAIT 10 MIN."
          : m === "photo-size" ? "?ERROR: IMAGE TOO LARGE." : m === "photo-type" ? "?ERROR: UNSUPPORTED IMAGE."
          : "NO CARRIER. PRESS [ SEND ] TO RETRY."; })
      .finally(() => { btns.forEach(b => b.disabled = false); counts(); });
  });

  // CRT curve: everything on the screen is bent with the same barrel distortion as the intro clip (ffmpeg lenscorrection
  // k1 .32 / k2 .06 on the scaled frame, centre magnified ~1.22× so the corners land on the corners, as in the clips). An SVG displacement map (assets/img/mm-warp-*.png; R = x shift, G = y shift,
  // 0.5 = none)) is applied as a CSS filter to the screen, sized in px to the screen and re-sized with it.
  // WARP_SCALE = the map's full range in screen-box px at the size the map was made for (phone 933 px wide, desktop 868).
  let warp = "";   // the CRT filter (set once its map has loaded); dropped in fullscreen
  var warpMap = null;   // the map's pixels, for bending the pointer in JS: { w, h, px, range }
  (function curve(){
    const desk = box.classList.contains("mm-computer"), url = desk ? "assets/img/mm-warp-desk.png" : "assets/img/mm-warp-phone.png";
    const RANGE = desk ? 81 / 868 : 151 / 933;   // displacement range as a fraction of the screen width
    const NS = "http://www.w3.org/2000/svg", id = "mm-crt";
    const svg = document.createElementNS(NS, "svg"); svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true"); svg.style.position = "absolute";
    svg.innerHTML = `<filter id="${id}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feImage preserveAspectRatio="none" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="0.35"/></filter>`;
    document.body.appendChild(svg);
    const f = svg.querySelector("filter"), img = svg.querySelector("feImage"), dm = svg.querySelector("feDisplacementMap");
    const size = () => { const w = glass.clientWidth, h = glass.clientHeight; if(!w || !h) return;
      for(const [el, a] of [[f, { x:0, y:0, width:w, height:h }], [img, { x:0, y:0, width:w, height:h }]]) for(const k in a) el.setAttribute(k, a[k]);
      dm.setAttribute("scale", (RANGE * w).toFixed(1)); };
    // the page preloads the map (<link rel=preload>), so this is normally instant
    fetch(url).then(r => r.blob()).then(b => new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); }))
      .then(data => { img.setAttribute("href", data); size(); warp = `url(#${id})`; glass.style.filter = warp; new ResizeObserver(size).observe(glass);
        const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
          const g = c.getContext("2d"); g.drawImage(im, 0, 0); warpMap = { w:c.width, h:c.height, px:g.getImageData(0, 0, c.width, c.height).data, range:RANGE }; };
        im.src = data; })
      .catch(() => {});
  })();

  // BOOT (html.mm-boot, set by the page): type "C:\>stayhuman.exe" in the board font, wipe the screen,
  // then fire "mm:booted" so the page plays the logo clip. Cut short when the board is revealed (a key press skips).
  let boot = null;
  if(document.documentElement.classList.contains("mm-boot") && !document.documentElement.classList.contains("mm-ready")){
    boot = document.createElement("div"); boot.className = "mmb mmb-boot"; boot.setAttribute("aria-hidden", "true");
    boot.innerHTML = `<p><span class="mmb-bt">C:\\&gt;</span></p>`;   // no cursor (Chef)
    screen.appendChild(boot);
    const bt = boot.querySelector(".mmb-bt"), word = "stayhuman.exe", wait = ms => new Promise(ok => setTimeout(ok, ms));
    (async () => {
      await wait(500); for(let n = 0; n < 40 && !warp; n++) await wait(100);   // nothing shows until the CRT curve is on (max 4s)
      await new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok)));
      if(!boot) return; boot.classList.add("on");
      await wait(450);
      for(const ch of word){ if(!boot) return; bt.textContent += ch; await wait(75 + Math.random() * 60); }   // uneven keystrokes = old-machine lag
      await wait(600); if(!boot) return;
      boot.classList.add("wipe"); await wait(260);
      if(boot){ boot.remove(); boot = null; document.dispatchEvent(new Event("mm:booted")); }
    })();
  }
  // reveal once the intro clip is done
  const ready = () => { if(boot){ boot.remove(); boot = null; } screen.classList.add("on", "printing"); view(); setTimeout(() => screen.classList.remove("printing"), 1200); };
  if(document.documentElement.classList.contains("mm-ready")) ready(); else document.addEventListener("mm:ready", ready, { once:true });

  // CALIBRATION (?calib): a grid of green crosses drawn on the bent screen, plus (unbent, on top) where Chrome's maths says
  // each cross should land (cyan ring) and where it sits unbent (red dot). A phone screenshot shows how Safari's bend differs.
  if(/[?&]calib\b/.test(location.search)){
    if(boot){ boot.remove(); boot = null; }
    document.querySelectorAll(".mm-v").forEach(v => { v.pause(); v.removeAttribute("src"); });
    const cols = [.1, .3, .5, .7, .9], rows = [.08, .22, .36, .5, .64, .78, .92], pts = [];
    rows.forEach(fy => cols.forEach(fx => pts.push([fx, fy])));
    screen.querySelectorAll(":scope > *").forEach(e => e.style.display = "none");
    screen.insertAdjacentHTML("beforeend", pts.map(([fx, fy]) => `<b class="mmc" style="left:${fx * 100}%;top:${fy * 100}%"></b>`).join(""));
    screen.insertAdjacentHTML("beforeend", `<div style="height:300%"></div>`);   // overflowing, like the real board (scrolling screens behave differently in Safari)
    screen.scrollTop = 0;
    const st = document.createElement("style");
    st.textContent = `.mmc{position:absolute;width:24px;height:24px;margin:-12px 0 0 -12px;background:linear-gradient(#7dff7d,#7dff7d) 50% 0/2px 100% no-repeat,linear-gradient(#7dff7d,#7dff7d) 0 50%/100% 2px no-repeat}
      .mmc-o{position:fixed;z-index:99;pointer-events:none;border-radius:50%}.mmc-r{width:6px;height:6px;margin:-3px 0 0 -3px;background:#f33}
      .mmc-e{width:14px;height:14px;margin:-7px 0 0 -7px;border:2px solid #0ff;box-sizing:border-box}
      .mmc-i{position:fixed;left:8px;right:8px;bottom:8px;z-index:99;font:12px/1.3 monospace;color:#fff;background:rgba(0,0,0,.75);padding:6px}`;
    document.head.appendChild(st);
    const lin = b => b / 255;
    const draw = () => { document.querySelectorAll(".mmc-o,.mmc-i").forEach(e => e.remove());
      const r = screen.getBoundingClientRect(), m = warpMap, w = r.width, h = r.height;
      pts.forEach(([fx, fy]) => { const x = fx * w, y = fy * h; let qx = x, qy = y;
        if(m){ const S = m.range * w; for(let n = 0; n < 6; n++){ const mx = Math.min(m.w - 1, Math.max(0, Math.round(qx / w * m.w - .5))), my = Math.min(m.h - 1, Math.max(0, Math.round(qy / h * m.h - .5))), k = (my * m.w + mx) * 4;
          qx = x - S * (lin(m.px[k]) - .5); qy = y - S * (lin(m.px[k + 1]) - .5); } }
        for(const [c, px, py] of [["mmc-r", x, y], ["mmc-e", qx, qy]]){ const o = document.createElement("i"); o.className = "mmc-o " + c; o.style.left = (r.left + px) + "px"; o.style.top = (r.top + py) + "px"; document.body.appendChild(o); } });
      const i = document.createElement("div"); i.className = "mmc-i";
      i.textContent = `CALIB  dpr ${devicePixelRatio}  vw ${innerWidth}x${innerHeight}  screen ${w.toFixed(1)}x${h.toFixed(1)} @ ${r.left.toFixed(1)},${r.top.toFixed(1)}  map ${m ? "ok" : "none"}  ${navigator.userAgent.replace(/^.*?\) /, "")}`;
      document.body.appendChild(i); };
    const wait = () => warpMap ? draw() : setTimeout(wait, 100); wait(); addEventListener("resize", () => setTimeout(draw, 100));
  }
})();
