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
  const screen = box && box.querySelector(".mm-screen");
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

  // ---- 8-bit mouse pointer: over the screen the system cursor is hidden and a green pixel arrow is drawn INSIDE the
  // screen, at the un-bent pointer position — so the CRT filter bends it exactly like the text and media (it sits over
  // whatever a click will hit). An I-beam over text fields. Mouse/trackpad devices only.
  if(matchMedia("(hover: hover) and (pointer: fine)").matches){
    const ARROW = ["X","XX","XoX","XooX","XoooX","XooooX","XoooooX","XooooooX","XoooooooX","XooooooooX","XoooooXXXXX","XooXooX","XoX.XooX","XX..XooX","X....XooX",".....XooX","......XX"];
    const BEAM = ["XXX.XXX","...X...","...X...","...X...","...X...","...X...","...X...","...X...","...X...","...X...","...X...","...X...","XXX.XXX"];
    const svg = (rows, w) => { let r = ""; rows.forEach((row, y) => [...row].forEach((c, x) => {
        if(c !== ".") r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c === "X" && w ? "#0a3a12" : "#7dff7d"}"/>`; }));
      return "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.max(...rows.map(r => r.length))} ${rows.length}" shape-rendering="crispEdges">${r}</svg>`); };
    const arrow = svg(ARROW, true), beam = svg(BEAM, false);   // arrow: green fill, dark pixel outline
    const ptr = document.createElement("i"); ptr.className = "mmb-ptr"; ptr.setAttribute("aria-hidden", "true"); ptr.hidden = true;
    const draw = (img, ar) => { ptr.style.backgroundImage = `url("${img}")`; ptr.style.aspectRatio = ar; };
    let last = null, kind = "";
    const place = () => { if(!last) return; const r = screen.getBoundingClientRect();
      ptr.style.left = (last.x - r.left + screen.scrollLeft) + "px"; ptr.style.top = (last.y - r.top + screen.scrollTop) + "px";
      const k = last.t && last.t.closest && last.t.closest("input:not([type=file]), textarea") ? "beam" : "arrow";
      if(k !== kind){ kind = k; k === "beam" ? draw(beam, "7 / 13") : draw(arrow, "11 / 17"); ptr.classList.toggle("beam", k === "beam"); } };
    screen.classList.add("mm-ptr-on");
    screen.addEventListener("pointermove", e => { if(e.pointerType !== "mouse") return; if(!ptr.isConnected) screen.appendChild(ptr);
      last = { x:e.clientX, y:e.clientY, t:e.target }; ptr.hidden = false; place(); });
    screen.addEventListener("pointerleave", () => { ptr.hidden = true; last = null; });
    screen.addEventListener("scroll", place, { passive:true });
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
    screen.style.filter = on ? "none" : warp;
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
  // 0.5 = none) is applied as a CSS filter to the screen, sized in px to the screen and re-sized with it.
  // WARP_SCALE = the map's full range in screen-box px at the size the map was made for (phone 933 px wide, desktop 868).
  let warp = "";   // the CRT filter (set once its map has loaded); dropped in fullscreen
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
    const size = () => { const w = screen.clientWidth, h = screen.clientHeight; if(!w || !h) return;
      for(const [el, a] of [[f, { x:0, y:0, width:w, height:h }], [img, { x:0, y:0, width:w, height:h }]]) for(const k in a) el.setAttribute(k, a[k]);
      dm.setAttribute("scale", (RANGE * w).toFixed(1)); };
    fetch(url).then(r => r.blob()).then(b => new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); }))
      .then(data => { img.setAttribute("href", data); size(); warp = `url(#${id})`; if(!screen.classList.contains("full")) screen.style.filter = warp; new ResizeObserver(size).observe(screen); })
      .catch(() => {});
  })();

  // BOOT (html.mm-boot, set by the page): type "C:\>stayhuman.exe" in the board font, wipe the screen,
  // then fire "mm:booted" so the page plays the logo clip. Cut short when the board is revealed (a key press skips).
  let boot = null;
  if(document.documentElement.classList.contains("mm-boot") && !document.documentElement.classList.contains("mm-ready")){
    boot = document.createElement("div"); boot.className = "mmb mmb-boot"; boot.setAttribute("aria-hidden", "true");
    boot.innerHTML = `<p><span class="mmb-bt">C:\\&gt;</span><span class="mmb-caret"></span></p>`;
    screen.appendChild(boot);
    const bt = boot.querySelector(".mmb-bt"), word = "stayhuman.exe", wait = ms => new Promise(ok => setTimeout(ok, ms));
    (async () => {
      await wait(500); boot.classList.add("on");
      await wait(450);
      for(const ch of word){ if(!boot) return; bt.textContent += ch; await wait(45 + Math.random() * 50); }   // uneven keystrokes = old-machine lag
      await wait(600); if(!boot) return;
      boot.classList.add("wipe"); await wait(260);
      if(boot){ boot.remove(); boot = null; document.dispatchEvent(new Event("mm:booted")); }
    })();
  }
  // reveal once the intro clip is done
  const ready = () => { if(boot){ boot.remove(); boot = null; } screen.classList.add("on", "printing"); view(); setTimeout(() => screen.classList.remove("printing"), 1200); };
  if(document.documentElement.classList.contains("mm-ready")) ready(); else document.addEventListener("mm:ready", ready, { once:true });
})();
