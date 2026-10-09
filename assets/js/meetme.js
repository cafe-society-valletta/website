/* Meet Me at Society — the green-screen post board (retro Craigslist × Reddit).
   Renders into whichever monitor is showing (.mm-phone < 900px, else .mm-computer). Two screens:
     HOME     [ WRITE A POST ]_   ← button (or just start typing) → the compose screen
              ===== M E S S A G E   I N B O X =====   DATE TIME AUTHOR SUBJECT, newest first; rows link to #p/<id>
     COMPOSE  (#new)  NAME> (remembered)  CATEGORY> (required, 17 categories)  SUBJECT> (44 chars = one feed line)  POST> (up to 5000)
              PHOTOS> up to 4, shrunk in the browser to JPEG ≤ 1600 px / ≤ 1 MB each     [SEND] [CANCEL]
   All screen copy is written the way the 8-bit terminal would print it (Chef): CAPS system lines, > prompts, terse.
   Only exception: the attached photos themselves (shown as normal photos).
   The screen appears once the intro clip has finished (document event "mm:ready"); typing during the intro skips it.
   STORAGE: netlify/functions/meetme.mjs (Netlify Blobs). New posts wait for approval (mmadmin.html); until then the
   poster sees their own post marked "[PENDING]" (localStorage "mm-mine"). SEED = local example posts (none now).
   Limits must match the function: LIM below. */
(function(){
  const SEED = [];   // the example post now lives on the server board (deletable from the SYSOP console)
  const LIM = { author:24, subject:44, body:5000, photos:4, photoBytes:1000 * 1024, comment:1000 };
  const box = document.querySelector(matchMedia("(max-width: 899.98px)").matches ? ".mm-phone" : ".mm-computer");
  const screen = box && box.querySelector(".mm-screen"), glass = screen && screen.parentNode;   // glass = the filtered box
  if(!screen) return;

  // Safari/WebKit (every iPhone browser): a finger-scrollable box gets its own layer that the CRT filter can't follow,
  // which is what threw the bent text out of place and cropped it. So there the screen is overflow:hidden (no layer)
  // and these handlers scroll it by hand (drag with a little coast, plus the mouse wheel).
  if(/AppleWebKit/.test(navigator.userAgent) && !/Chrome\/|Chromium|Edg\/|Firefox|OPR\//.test(navigator.userAgent) || /[?&]wkscroll\b/.test(location.search)){
    document.documentElement.classList.add("mm-wk");
    let y0 = 0, top0 = 0, last = 0, lastT = 0, v = 0, coast = 0, moved = false;
    const on = () => !screen.classList.contains("full");
    screen.addEventListener("touchstart", e => { if(!on() || e.touches.length > 1) return; cancelAnimationFrame(coast);
      y0 = last = e.touches[0].clientY; top0 = screen.scrollTop; lastT = performance.now(); v = 0; moved = false; }, { passive:true });
    screen.addEventListener("touchmove", e => { if(!on() || e.touches.length > 1) return; const y = e.touches[0].clientY, t = performance.now();
      if(!moved && Math.abs(y - y0) < 6) return; moved = true;
      v = (last - y) / Math.max(1, t - lastT); last = y; lastT = t;
      const max = screen.scrollHeight - screen.clientHeight, next = top0 + (y0 - y);
      if(max > 0 && (next > 0 || screen.scrollTop > 0) && (next < max || screen.scrollTop < max)) e.preventDefault();   // at an end, let the page move
      screen.scrollTop = next; }, { passive:false });
    screen.addEventListener("touchend", () => { if(!on() || !moved) return; let prev = performance.now();
      const step = t => { const dt = t - prev; prev = t; v *= Math.pow(.995, dt); if(Math.abs(v) < .02) return;
        const before = screen.scrollTop; screen.scrollTop += v * dt; if(screen.scrollTop === before) return; coast = requestAnimationFrame(step); };
      coast = requestAnimationFrame(step); }, { passive:true });
    screen.addEventListener("wheel", e => { if(!on()) return; const before = screen.scrollTop; screen.scrollTop += e.deltaY;
      if(screen.scrollTop !== before) e.preventDefault(); }, { passive:false });
  }

  const store = { get(k, d){ try{ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
                  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const two = n => String(n).padStart(2, "0");
  const fmt = iso => { const d = new Date(iso); return [`${two(d.getDate())}-${two(d.getMonth()+1)}-${String(d.getFullYear()).slice(-2)}`, `${two(d.getHours())}:${two(d.getMinutes())}`]; };
  const API = "/.netlify/functions/meetme";
  // CATEGORIES (keys must match CATS in netlify/functions/meetme.mjs): [key, full name, short inbox tag]
  const CATS = [
    ["general", "GENERAL INQUIRY OR ANNOUNCEMENT", "GENERAL"], ["meetup", "MEETUP / ACTIVITY BUDDY", "MEETUP"],
    ["staff", "LOOKING FOR STAFF", "STAFF WANTED"], ["job", "LOOKING FOR A JOB", "JOB WANTED"],
    ["flat", "LOOKING FOR A FLAT", "FLAT WANTED"], ["rent", "FLAT FOR RENT", "FOR RENT"], ["flatmate", "LOOKING FOR A FLATMATE", "FLATMATE"],
    ["art", "ARTWORK/HOMEMADE PRODUCT FOR SALE", "ART/HOMEMADE"], ["sale", "ITEM FOR SALE OR SWAP", "SALE/SWAP"], ["free", "FREE / GIVEAWAY", "FREE"],
    ["service", "SERVICE FOR HIRE", "FOR HIRE"], ["classes", "CLASSES & LANGUAGE EXCHANGE", "CLASSES"], ["collab", "COLLABORATORS WANTED", "COLLAB"],
    ["club", "CLUB OR ORGANIZATION", "CLUB/ORG"], ["cause", "VOLUNTEERS & CAUSES", "CAUSES"], ["lost", "LOST & FOUND", "LOST+FOUND"],
    ["missed", "MISSED CONNECTIONS", "MISSED CONN."] ];
  const cat = k => CATS.find(c => c[0] === k) || CATS[0];
  // 8-bit drop-down: [ LABEL v ] opens a numbered list printed right under it (no OS pop-up; arrows/enter/esc work)
  const picker = (name, all, val) => `<div class="mmb-pick" data-name="${name}">
      <button type="button" class="mmb-btn mmb-pick-btn" aria-haspopup="listbox" aria-expanded="false">[ <span class="mmb-pick-l">${val ? cat(val)[1] : all ? "ALL CATEGORIES" : "SELECT A CATEGORY"}</span> v ]</button>
      <ol class="mmb-pick-list" role="listbox" hidden>${(all ? [["", "ALL CATEGORIES"], ...CATS] : CATS).map(([k, n], i) =>
        `<li><button type="button" class="mmb-btn mmb-opt" role="option" data-v="${k}">${two(all ? i : i + 1)}. ${n}</button></li>`).join("")}</ol>
      <input type="hidden" name="${name}" value="${val || ""}"></div>`;
  let filter = ""; try{ filter = sessionStorage.getItem("mm-filter") || ""; }catch(e){}
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
      <img class="mmb-logo" src="assets/img/mm-logo.webp" alt="Meet Me at Society">
      <section class="mmb-home">
        <p class="mmb-write-row"><a class="mmb-write" href="#new" role="button">[ WRITE A POST ]</a><img class="mmb-mark" src="assets/img/mm-logo.webp" alt="Meet Me at Society"><button type="button" class="mmb-btn mmb-fs">[FULLSCREEN]</button></p>
        <p class="mmb-hint mmb-home-hint" aria-live="polite"></p>
        <div class="mmb-inbox">
          ${rule("=", 160)}<h2 class="mmb-title">P O S T&nbsp;&nbsp;&nbsp;F E E D</h2>${rule("=", 160)}
          <div class="mmb-field mmb-filter"><span class="mmb-k">SHOW&gt;</span>${picker("filter", true, filter)}</div>
          <div class="mmb-row mmb-head" aria-hidden="true"><span>DATE</span><span>TIME</span><span>AUTHOR</span><span>SUBJECT</span></div>
          ${rule("-", 200)}
          <ol class="mmb-list"></ol>
        </div>
      </section>
      <form class="mmb-compose" hidden novalidate>
        <p class="mmb-winnav"><button type="button" class="mmb-btn mmb-fs mmb-fs-x">[FULLSCREEN]</button></p>
        ${rule("=", 160)}<h2 class="mmb-title">N E W&nbsp;&nbsp;&nbsp;P O S T</h2>${rule("=", 160)}
        <label class="mmb-field"><span class="mmb-k">NAME&gt;</span><input name="author" maxlength="${LIM.author}" autocomplete="nickname" spellcheck="false"></label>
        <div class="mmb-field"><span class="mmb-k">CATEGORY&gt;</span>${picker("category")}</div>
        <label class="mmb-field"><span class="mmb-k">SUBJECT&gt;</span><input name="subject" maxlength="${LIM.subject}" autocomplete="off" autocapitalize="sentences"><small class="mmb-n" data-for="subject"></small></label>
        <label class="mmb-field mmb-tall"><span class="mmb-k">POST&gt;</span><textarea name="body" maxlength="${LIM.body}" rows="7" autocapitalize="sentences"></textarea><small class="mmb-n" data-for="body"></small></label>
        <div class="mmb-field"><span class="mmb-k">PHOTOS&gt;</span><button type="button" class="mmb-btn mmb-add">[+ ATTACH]</button><small class="mmb-n mmb-pn"></small></div>
        <input class="mmb-file" type="file" accept="image/*" multiple hidden>
        <ul class="mmb-thumbs"></ul>
        <input class="mmb-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        ${rule("-", 200)}
        <p class="mmb-hint mmb-send-hint" aria-live="polite"></p>
        <p class="mmb-actions"><button type="submit" class="mmb-btn">[ SEND ]</button><button type="button" class="mmb-btn mmb-cancel">[ CANCEL ]</button></p>
      </form>
      <section class="mmb-post" hidden role="dialog" aria-modal="true" aria-label="Post">
        <div class="mmb-win">
          <div class="mmb-win-bar"><span class="mmb-win-t">POST</span><span class="mmb-win-btns"><button type="button" class="mmb-btn mmb-fs mmb-fs-x">[FULLSCREEN]</button><button type="button" class="mmb-btn mmb-close" aria-label="Close post">[X]</button></span></div>
          <div class="mmb-post-in"></div>
        </div>
      </section>
    </div>`;
  const $ = s => screen.querySelector(s);
  const $home = $(".mmb-home"), $form = $(".mmb-compose"), $list = $(".mmb-list"), $homeHint = $(".mmb-home-hint"), $hint = $(".mmb-send-hint");
  const $author = $form.elements.author, $subject = $form.elements.subject, $body = $form.elements.body, $file = $(".mmb-file"), $thumbs = $(".mmb-thumbs");

  function render(){
    const shown = posts().filter(p => !filter || (p.category || "general") === filter);
    $list.innerHTML = shown.map(p => { const [d, t] = fmt(p.at);
      return `<li><a class="mmb-row${p.waiting ? " mmb-wait" : ""}" href="#p/${esc(p.id)}"><span>${d}</span><span>${t}</span><span>&lt;${esc(p.author)}&gt;</span><span>${esc(p.subject)}${p.waiting ? " <em>[PENDING]</em>" : ""}</span></a></li>`; }).join("")
      || `<li class="mmb-empty">NO POSTS IN ${filter ? cat(filter)[1] : "THE FEED"} YET.</li>`;
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
    const pid = (location.hash.match(/^#p\/(.+)$/) || [])[1]; openPost(pid ? decodeURIComponent(pid) : null);
    if(c){ if(!$author.value) $author.value = store.get("mm-name", ""); counts(); $hint.textContent = "";
      if(matchMedia("(hover: hover)").matches) ($author.value ? $subject : $author).focus({ preventScroll:true }); }
  }
  addEventListener("hashchange", view);
  const toHome = () => { if(isCompose()) history.pushState(null, "", location.pathname + location.search); view(); };
  $(".mmb-cancel").addEventListener("click", () => { if(history.state && history.state.mmNew) history.back(); else toHome(); });
  const openCompose = () => { if(!isCompose()){ history.pushState({ mmNew:true }, "", "#new"); view(); } };
  $(".mmb-write").addEventListener("click", e => { e.preventDefault(); openCompose(); });
  $form.addEventListener("keydown", e => { if(e.key === "Escape" && !e.target.closest(".mmb-pick")) $(".mmb-cancel").click(); });

  // start typing on the home screen = start a post (the key lands in the first empty field)
  addEventListener("keydown", e => {
    if(isCompose() || !$post.hidden || document.querySelector(".mm-lightbox") || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    if(document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    if(document.activeElement && document.activeElement.closest && document.activeElement.closest(".mmb-pick")) return;   // keys on the category list stay there
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
    box.appendChild(ptr);   // inside the monitor, above the glass and below the screen shadow; moves to <body> in fullscreen
    let kind = "", frame = 0, last = null;
    const lin = b => b / 255;   // map byte → 0..1 (0.5 = no shift)
    const bend = (x, y, w, h) => {   // un-bent screen point → where the filter draws it
      const m = warpMap; if(!m || screen.classList.contains("full")) return [x, y];
      const S = m.range * w, d = (qx, qy) => { const mx = Math.min(m.w - 1, Math.max(0, Math.round(qx / w * m.w - .5))),
        my = Math.min(m.h - 1, Math.max(0, Math.round(qy / h * m.h - .5))), k = (my * m.w + mx) * 4;
        return [S * (lin(m.px[k]) - .5), S * (lin(m.px[k + 1]) - .5)]; };
      let qx = x, qy = y; for(let n = 0; n < 5; n++){ const [dx, dy] = d(qx, qy); qx = x - dx; qy = y - dy; }
      return [qx, qy]; };
    // desktop glass outline (fraction of the glass box; quadratic fits of the monitor photo's glass edge)
    const EDGE = box.classList.contains("mm-computer") ? { top:[.09268, -.0883, -.00293], bottom:[-.12059, .13698, .9662], left:[.05491, -.05618, .00466], right:[-.04281, .04188, .99292] } : null;
    const q2 = (c, t) => (c[0] * t + c[1]) * t + c[2];
    // Crossing the glass edge: within BAND px of the edge both cursors fade — the 8-bit one inside, a drawn copy of the normal
    // arrow outside — to nothing exactly on the edge (the real system cursor is hidden across the band, and comes back once
    // the drawn arrow is fully opaque, BAND px out).
    const BAND = 125, html = document.documentElement;
    const sys = document.createElement("i"); sys.className = "mm-sysptr"; sys.setAttribute("aria-hidden", "true"); sys.hidden = true; document.body.appendChild(sys);
    const edgeDist = (px, py, w, h) => {   // signed distance (px) to the glass edge: + inside, − outside
      if(!EDGE) return (px >= 0 && py >= 0 && px <= w && py <= h) ? Math.min(px, py, w - px, h - py) : -1e9;
      const nx = px / w, ny = py / h;
      const vx = [q2(EDGE.left, ny) * w - px, px - q2(EDGE.right, ny) * w], vy = [q2(EDGE.top, nx) * h - py, py - q2(EDGE.bottom, nx) * h];
      const ox = Math.max(0, ...vx), oy = Math.max(0, ...vy);
      return ox || oy ? -Math.hypot(ox, oy) : Math.min(-vx[0], -vx[1], -vy[0], -vy[1]); };
    const place = () => { frame = 0; if(!last) return; const r = screen.getBoundingClientRect(), full = screen.classList.contains("full");
      const d = full ? 1e9 : edgeDist(last.x - r.left, last.y - r.top, r.width, r.height);
      html.classList.toggle("mm-cur-hide", d > -BAND);
      sys.hidden = !(d < 0 && d > -BAND); if(!sys.hidden){ sys.style.opacity = Math.min(1, -d / BAND); sys.style.transform = `translate3d(${last.x}px, ${last.y}px, 0)`; }
      ptr.hidden = d <= 0; if(ptr.hidden) return;
      ptr.style.opacity = Math.min(1, d / BAND);
      const [qx, qy] = bend(last.x - r.left, last.y - r.top, r.width, r.height);
      const k = last.t && last.t.closest && last.t.closest("input:not([type=file]), textarea") ? "beam" : "arrow";
      if(k !== kind){ kind = k; ptr.style.backgroundImage = `url("${k === "beam" ? beam : arrow}")`; ptr.style.aspectRatio = k === "beam" ? "7 / 13" : "11 / 17"; ptr.classList.toggle("beam", k === "beam"); }
      const wpx = full ? (k === "beam" ? 10 : 16) : Math.max(k === "beam" ? 10 : 16, r.width * (k === "beam" ? .0125 : .02));
      const ox = k === "beam" ? wpx / 2 : 0, oy = k === "beam" ? wpx * 13 / 14 : 0;   // arrow: tip on the spot; I-beam: centred
      const host = full ? document.body : box; if(ptr.parentNode !== host) host.appendChild(ptr);
      ptr.classList.toggle("fixed", full); const b = full ? { left:0, top:0 } : box.getBoundingClientRect();
      ptr.style.width = wpx + "px"; ptr.style.transform = `translate3d(${r.left - b.left + qx - ox}px, ${r.top - b.top + qy - oy}px, 0)`; };
    addEventListener("pointermove", e => { if(e.pointerType !== "mouse") return;
      last = { x:e.clientX, y:e.clientY, t:e.target }; if(!frame) frame = requestAnimationFrame(place); }, { passive:true });
    document.documentElement.addEventListener("pointerleave", () => { ptr.hidden = true; sys.hidden = true; last = null; html.classList.remove("mm-cur-hide"); });
  }

  // ---- taps on a touch screen land where the content really is: the CRT bend moves what you SEE away from where the
  // browser thinks it is (up to ~20px near the edges), so a tap on a drawn button could miss it. A tap at a seen point v
  // shows the content from v + d(v) (exactly what the filter samples), so the tap is re-aimed there. (Mouse users get the
  // 8-bit pointer, which is already drawn over what a click hits.)
  let lastPtr = "mouse";
  glass.addEventListener("pointerdown", e => { lastPtr = e.pointerType; }, true);
  glass.addEventListener("click", e => {
    const m = warpMap; if(!e.isTrusted || !m || lastPtr === "mouse" || screen.classList.contains("full")) return;
    const r = glass.getBoundingClientRect(), w = r.width, h = r.height, x = e.clientX - r.left, y = e.clientY - r.top;
    const mx = Math.min(m.w - 1, Math.max(0, Math.round(x / w * m.w - .5))), my = Math.min(m.h - 1, Math.max(0, Math.round(y / h * m.h - .5))), k = (my * m.w + mx) * 4;
    const S = m.range * w, ux = e.clientX + S * (m.px[k] / 255 - .5), uy = e.clientY + S * (m.px[k + 1] / 255 - .5);
    const hit = document.elementFromPoint(ux, uy), tgt = hit && hit.closest("a, button, input, textarea, select, label, [role=button]");
    const was = e.target.closest && e.target.closest("a, button, input, textarea, select, label, [role=button]");
    if(!tgt || tgt === was || !glass.contains(tgt)) return;
    e.preventDefault(); e.stopPropagation();
    if(/^(INPUT|TEXTAREA|SELECT)$/.test(tgt.tagName) && tgt.type !== "file") tgt.focus(); else tgt.click();
  }, true);

  // ---- [FULLSCREEN]: the screen zooms out of the monitor into a flat, full-window terminal (no casing, menu or footer,
  // no CRT warp) — the SYSOP-console look. [<- GO BACK] (or Esc on the home screen) zooms it back into the monitor.
  // The screen element is moved to <body> while full (the monitors are transformed, which would trap position:fixed).
  let home = null;
  // The monitor itself zooms in behind it: the glass centre is pulled to the middle of the window and scaled until the
  // casing leaves the frame, the pixels go out of focus (blur), and a green-black veil fades in to the flat fullscreen
  // background. GO BACK plays it in reverse. (The screen rides on <body> for the whole move so it isn't zoomed/blurred.)
  const DUR = 650, veil = document.createElement("div"); veil.className = "mm-veil"; document.body.appendChild(veil);
  let busy = false;
  const zoomKeys = () => {   // box keyframes: [flat, zoomed in on the glass]
    const g = glass.getBoundingClientRect(), br = box.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    const k = Math.max(vw / g.width, vh / g.height) * 1.3, ox = g.left + g.width / 2, oy = g.top + g.height / 2;
    const origin = `${ox - br.left}px ${oy - br.top}px`;
    const t = new DOMMatrix(getComputedStyle(box).transform);   // the box's own CSS translate also gets scaled by k: take it back out
    const dx = vw / 2 - ox - (k - 1) * t.e, dy = vh / 2 - oy - (k - 1) * t.f;
    return [{ transformOrigin:origin, scale:"1", translate:"0px 0px", filter:"blur(0px)" },
            { transformOrigin:origin, scale:String(k), translate:`${dx}px ${dy}px`, filter:"blur(14px)" }];
  };
  function setFull(on){
    if(busy || on === screen.classList.contains("full")) return;
    busy = true; const done = () => { busy = false; };
    if(on){
      const a = screen.getBoundingClientRect(), keys = zoomKeys();
      home = [screen.parentNode, screen.nextSibling]; document.body.appendChild(screen);
      screen.classList.add("full"); document.documentElement.classList.add("mm-full");
      screen.querySelectorAll(".mmb-fs").forEach(b => b.hidden = true); $(".mmb-back").hidden = false;
      const b = screen.getBoundingClientRect();
      if(screen.animate){
        box.animate(keys, { duration:DUR, easing:"cubic-bezier(.45,0,.55,1)", fill:"forwards" });
        veil.animate([{ opacity:0 }, { opacity:0, offset:.45 }, { opacity:1 }], { duration:DUR, fill:"forwards" });
        screen.animate([
          { transformOrigin:"0 0", transform:`translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})` },
          { transformOrigin:"0 0", transform:"none" }], { duration:DUR, easing:"steps(10, end)" }).onfinish = done;   // stepped = slow old machine
      } else done();
      $(".mmb-back").focus({ preventScroll:true });
    } else {
      const a = screen.getBoundingClientRect();
      box.getAnimations().forEach(x => x.cancel());   // measure the monitor un-zoomed…
      const keys = zoomKeys(), g = glass.getBoundingClientRect();
      if(box.animate) box.animate([keys[1], keys[0]], { duration:DUR, easing:"cubic-bezier(.45,0,.55,1)" });   // …then play the zoom backwards
      screen.classList.remove("full"); screen.classList.add("leaving"); document.documentElement.classList.remove("mm-full");
      Object.assign(screen.style, { left:g.left + "px", top:g.top + "px", width:g.width + "px", height:g.height + "px" });
      screen.querySelectorAll(".mmb-fs").forEach(b => b.hidden = false); $(".mmb-back").hidden = true;
      const b = screen.getBoundingClientRect();
      const land = () => { screen.classList.remove("leaving"); ["left", "top", "width", "height"].forEach(k => screen.style[k] = "");
        home[0].insertBefore(screen, home[1]); veil.getAnimations().forEach(x => x.cancel()); done(); const f = [...screen.querySelectorAll(".mmb-fs")].find(b => b.offsetParent); if(f) f.focus({ preventScroll:true }); };
      if(screen.animate){
        veil.getAnimations().forEach(x => x.cancel());
        veil.animate([{ opacity:1 }, { opacity:0, offset:.55 }, { opacity:0 }], { duration:DUR, fill:"forwards" });
        screen.animate([
          { transformOrigin:"0 0", transform:`translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})` },
          { transformOrigin:"0 0", transform:"none" }], { duration:DUR, easing:"steps(10, end)" }).onfinish = land;
      } else land();
    }
  }
  // [FULLSCREEN] on the home row, the NEW POST / EDIT screen and the post window (top right); <- GO BACK top left (Chef, Oct 2026)
  screen.querySelectorAll(".mmb-fs").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); setFull(true); }));
  $(".mmb-back").addEventListener("click", () => setFull(false));
  addEventListener("keydown", e => { if(e.key === "Escape" && !isCompose()) setFull(false); });

  // ---- POST WINDOW (#p/<id>): a terminal "window" over the inbox, laid out like an email — FROM / SENT / SUBJ, the
  // message, then the attached photos one after another. Photos keep their real colours (Chef's one exception) and a click
  // opens the LIGHTBOX: a second window on top, outside the bent glass, with the photo as big as the browser allows, at the
  // stored upload resolution. Esc / [X] closes the top window first.
  const $post = $(".mmb-post"), $postIn = $(".mmb-post-in"), $postT = $(".mmb-win-t");
  let postReq = 0, postShots = [], curPost = null;
  const photoURL = (id, n) => `${API}?photo=${encodeURIComponent(id)}-${n}`;
  function fitPost(){ const mmb = $(".mmb"); mmb.style.minHeight = $post.hidden ? "" : ($post.offsetTop + $post.offsetHeight + 24) + "px"; }
  function drawPost(p, note, comments){
    const [d, t] = fmt(p.at), n = p.photos || 0; curPost = p;
    postShots = Array.from({ length:n }, (_, i) => photoURL(p.id, i));
    $postT.textContent = `POST  ${d}  ${t}`;
    $postIn.innerHTML = `
      <p class="mmb-hdr"><span>FROM:</span> &lt;${esc(p.author)}&gt;</p>
      <p class="mmb-hdr"><span>SENT:</span> ${d} ${t}</p>
      <p class="mmb-hdr"><span>SUBJ:</span> ${esc(p.subject)}</p>
      <p class="mmb-hdr"><span>CAT:</span> ${cat(p.category)[1]}</p>
      ${rule("-", 200)}
      ${note ? `<p class="mmb-note">${note}</p>` : ""}
      ${store.get("mm-keys", {})[p.id] ? `<p class="mmb-own"><button type="button" class="mmb-btn mmb-edit">[ EDIT POST ]</button><button type="button" class="mmb-btn mmb-del">[ DELETE ]</button></p>` : ""}
      <div class="mmb-text">${p.body ? esc(p.body) : (note ? "" : "(NO POST TEXT)")}</div>
      ${n && note ? `${rule("-", 200)}<p class="mmb-hdr"><span>ATTACHED:</span> ${n} PHOTO${n > 1 ? "S" : ""} (SHOWN ONCE APPROVED)</p>` : ""}
      ${n && !note ? `${rule("-", 200)}<p class="mmb-hdr"><span>ATTACHED:</span> ${n} PHOTO${n > 1 ? "S" : ""}</p>
        <div class="mmb-photos">${postShots.map((u, i) => `<button type="button" class="mmb-photo" data-i="${i}" aria-label="Open photo ${i + 1} of ${n}"><img src="${u}" alt="Photo ${i + 1} of ${n}" loading="lazy"><span>[ PHOTO ${i + 1}/${n} &middot; CLICK TO ENLARGE ]</span></button>`).join("")}</div>` : ""}
      ${rule("=", 200)}
      <h3 class="mmb-ch">C O M M E N T S</h3>
      ${comments ? `<div class="mmb-thread"></div>
      <form class="mmb-cform" novalidate>
        <p class="mmb-rto" hidden></p>
        <label class="mmb-field mmb-tall"><span class="mmb-k">COMMENT&gt;</span><textarea name="body" maxlength="${LIM.comment}" rows="3" autocapitalize="sentences"></textarea></label>
        <label class="mmb-field"><span class="mmb-k">NAME&gt;</span><input name="author" maxlength="${LIM.author}" autocomplete="nickname" spellcheck="false"></label>
        <input class="mmb-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="mmb-hint mmb-chint" aria-live="polite"></p>
        <p class="mmb-actions"><button type="submit" class="mmb-btn">[ SEND COMMENT ]</button></p>
      </form>` : `<p class="mmb-note">${note ? "COMMENTS OPEN ONCE THIS POST IS APPROVED." : "COMMENTS ARE OFF ON THIS EXAMPLE POST."}</p>`}
      ${rule("-", 200)}
      <p class="mmb-actions"><button type="button" class="mmb-btn mmb-close2">[ BACK TO FEED ]</button></p>`;
    $postIn.querySelectorAll("img").forEach(im => im.addEventListener("load", fitPost));
    if(comments){ postComments = comments; postId = p.id; drawThread(); const f = $postIn.querySelector(".mmb-cform"); f.elements.author.value = store.get("mm-name", ""); }
    fitPost();
  }
  // COMMENTS: a reddit-style thread under the post. Anyone can comment on the post or reply to a comment; every comment
  // waits for the sysop like posts do (the commenter sees their own as [PENDING]). Replies indent under their parent.
  let postComments = [], postId = null, replyTo = null;
  function drawThread(){
    const th = $postIn.querySelector(".mmb-thread"); if(!th) return;
    const ids = new Set(postComments.map(c => c.id));
    const mine = store.get("mm-mine-c", []).filter(c => c.post === postId && !ids.has(c.id)).map(c => ({ ...c, waiting:true }));
    const all = [...postComments, ...mine], kids = {};
    all.forEach(c => { const k = c.parent && all.some(x => x.id === c.parent) ? c.parent : "_"; (kids[k] = kids[k] || []).push(c); });
    const one = (c, d) => { const [dd, tt] = fmt(c.at);
      return `<div class="mmb-c${c.waiting ? " mmb-wait" : ""}" style="--d:${Math.min(d, 6)}">
        <p class="mmb-c-h">${c.deleted ? "[DELETED]" : `&lt;${esc(c.author)}&gt;`} <span>${dd} ${tt}</span>${c.waiting ? " <em>[PENDING]</em>" : ""}</p>
        ${c.deleted ? "" : `<div class="mmb-c-b">${esc(c.body)}</div>`}
        ${c.waiting || c.deleted ? "" : `<button type="button" class="mmb-btn mmb-reply" data-id="${esc(c.id)}" data-a="${esc(c.author)}">[REPLY]</button>`}
        ${(kids[c.id] || []).map(k => one(k, d + 1)).join("")}</div>`; };
    const top = kids._ || [];
    th.innerHTML = top.length ? top.map(c => one(c, 0)).join("") : `<p class="mmb-note">NO COMMENTS YET. BE THE FIRST.</p>`;
    const h = $postIn.querySelector(".mmb-ch"); if(h) h.textContent = `C O M M E N T S   (${all.length})`;
    fitPost();
  }
  function setReply(id, who){
    const f = $postIn.querySelector(".mmb-cform"), rto = f.querySelector(".mmb-rto"); replyTo = id || null;
    if(replyTo){ rto.hidden = false; rto.innerHTML = `REPLYING TO &lt;${esc(who)}&gt; <button type="button" class="mmb-btn mmb-rcancel">[CANCEL]</button>`;
      const host = $postIn.querySelector(`.mmb-reply[data-id="${CSS.escape(replyTo)}"]`); if(host) host.after(f); }
    else { rto.hidden = true; $postIn.querySelector(".mmb-thread").after(f); }
    f.elements.body.focus({ preventScroll:true }); fitPost();
  }
  $postIn.addEventListener("click", e => {
    const r = e.target.closest(".mmb-reply"); if(r) return setReply(r.dataset.id, r.dataset.a);
    if(e.target.closest(".mmb-rcancel")) setReply(null);
  });
  $postIn.addEventListener("submit", e => {
    const ef = e.target.closest(".mmb-eform");
    if(ef){ e.preventDefault(); const subject = ef.elements.subject.value.trim(), body = ef.elements.body.value.trim(), category = ef.elements.category.value || "general", h = ef.querySelector(".mmb-ehint");
      if(subject.length < 2){ h.textContent = "?ERROR: SUBJECT REQUIRED."; return; }
      h.textContent = "TRANSMITTING..."; ef.querySelectorAll("button").forEach(b => b.disabled = true);
      ownCall("own-edit", { subject, body, category }).then(() => ownDone("EDIT SENT. AWAITING SYSOP APPROVAL.", { subject, body, category }))
        .catch(() => { h.textContent = "NO CARRIER. PRESS [ SAVE ] TO RETRY."; ef.querySelectorAll("button").forEach(b => b.disabled = false); });
      return; }
    const f = e.target.closest(".mmb-cform"); if(!f) return; e.preventDefault();
    const hint = f.querySelector(".mmb-chint"), author = f.elements.author.value.trim(), body = f.elements.body.value.trim();
    if(!body){ hint.textContent = "?ERROR: COMMENT IS EMPTY."; f.elements.body.focus(); return; }
    if(!author){ hint.textContent = "?ERROR: NAME REQUIRED."; f.elements.author.focus(); return; }
    store.set("mm-name", author);
    const btn = f.querySelector("button[type=submit]"); btn.disabled = true; hint.textContent = "TRANSMITTING...";
    fetch(API, { method:"POST", headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ kind:"comment", post:postId, parent:replyTo, author, body, website:f.elements.website.value }) })
      .then(r => r.json().then(d => ({ ok:r.ok, status:r.status, d })))
      .then(({ ok, status, d }) => {
        if(!ok) throw status;
        const at = new Date(), iso = `${at.getFullYear()}-${two(at.getMonth()+1)}-${two(at.getDate())}T${two(at.getHours())}:${two(at.getMinutes())}`;
        const mine = store.get("mm-mine-c", []).filter(c => Date.now() - Date.parse(c.at) < 7 * 864e5);
        mine.push({ id:d.id, post:postId, parent:replyTo, at:iso, author, body }); store.set("mm-mine-c", mine);
        f.elements.body.value = ""; setReply(null); drawThread();
        f.querySelector(".mmb-chint").textContent = "COMMENT QUEUED. AWAITING SYSOP APPROVAL."; })
      .catch(st => { hint.textContent = st === 429 ? "?ERROR: TOO MANY COMMENTS. WAIT 10 MIN." : "NO CARRIER. PRESS [ SEND COMMENT ] TO RETRY."; })
      .finally(() => { btn.disabled = false; fitPost(); });
  });
  function openPost(id){
    if(!id){ if(!$post.hidden){ $post.hidden = true; closeLightbox(); fitPost(); } return; }
    $post.hidden = false; screen.scrollTop = 0;
    const known = posts().find(p => p.id === id);
    if(known && (known.waiting || !live.some(p => p.id === id))){   // seed or own post still waiting for the sysop
      drawPost(known, known.waiting ? "THIS POST IS WAITING FOR SYSOP APPROVAL." : ""); return; }
    $postT.textContent = "POST"; $postIn.innerHTML = `<p class="mmb-note">LOADING POST...</p>`; fitPost();
    const my = ++postReq;
    fetch(`${API}?post=${encodeURIComponent(id)}`, { cache:"no-store" }).then(r => r.ok ? r.json() : null)
      .then(d => { if(my !== postReq) return;
        if(d && d.post) drawPost(d.post, "", d.comments || []); else { $postIn.innerHTML = `<p class="mmb-note">?ERROR: POST NOT FOUND.</p>`; fitPost(); } })
      .catch(() => { if(my === postReq){ $postIn.innerHTML = `<p class="mmb-note">NO CARRIER. CLOSE AND TRY AGAIN.</p>`; fitPost(); } });
  }
  const closePost = () => { if(history.state && history.state.mmPost) history.back();
    else { history.pushState(null, "", location.pathname + location.search); view(); } };
  $list.addEventListener("click", e => { const a = e.target.closest("a.mmb-row"); if(!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault(); history.pushState({ mmPost:true }, "", a.getAttribute("href")); view(); });
  // OWNER CONTROLS: only the browser that made the post holds its key (localStorage "mm-keys"), so only the poster sees
  // [ EDIT POST ] / [ DELETE ]. Edits go back to the sysop queue; delete is immediate (photos and comments go too).
  const ownKey = id => store.get("mm-keys", {})[id];
  const ownCall = (action, extra) => fetch(API, { method:"POST", headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ action, id:curPost.id, key:ownKey(curPost.id), ...extra }) }).then(r => { if(!r.ok) throw r.status; return r.json(); });
  function ownDone(msg, keep){
    const mine = store.get("mm-mine", []).filter(m => m.id !== curPost.id);
    if(keep) mine.push({ ...keep, id:curPost.id, at:curPost.at, author:curPost.author, photos:curPost.photos || 0 });
    store.set("mm-mine", mine); live = live.filter(x => x.id !== curPost.id);
    if(!keep){ const k = store.get("mm-keys", {}); delete k[curPost.id]; store.set("mm-keys", k); }
    render(); load(); $homeHint.textContent = msg; closePost();
  }
  $post.addEventListener("click", e => {
    if(e.target.closest(".mmb-edit")){
      const box = $postIn.querySelector(".mmb-text"), own = $postIn.querySelector(".mmb-own"); own.hidden = true;
      box.outerHTML = `<form class="mmb-eform" novalidate>
        <div class="mmb-field"><span class="mmb-k">CATEGORY&gt;</span>${picker("category", false, curPost.category || "general")}</div>
        <label class="mmb-field"><span class="mmb-k">SUBJECT&gt;</span><input name="subject" maxlength="${LIM.subject}" value="${esc(curPost.subject)}"></label>
        <label class="mmb-field mmb-tall"><span class="mmb-k">POST&gt;</span><textarea name="body" maxlength="${LIM.body}" rows="7">${esc(curPost.body || "")}</textarea></label>
        <p class="mmb-hint mmb-ehint">SAVING SENDS YOUR POST BACK TO THE SYSOP FOR APPROVAL.</p>
        <p class="mmb-actions"><button type="submit" class="mmb-btn">[ SAVE ]</button><button type="button" class="mmb-btn mmb-ecancel">[ CANCEL ]</button></p></form>`;
      $postIn.querySelector(".mmb-eform textarea").focus({ preventScroll:true }); return fitPost();
    }
    if(e.target.closest(".mmb-ecancel")) return openPost(curPost.id);
    const del = e.target.closest(".mmb-del");
    if(del){
      if(!del.dataset.sure){ del.dataset.sure = "1"; del.textContent = "[ REALLY DELETE? Y ]";
        setTimeout(() => { if(del.isConnected){ delete del.dataset.sure; del.textContent = "[ DELETE ]"; } }, 4000); return; }
      del.disabled = true; del.textContent = "DELETING...";
      return ownCall("own-delete").then(() => ownDone("POST DELETED.")).catch(() => { del.disabled = false; del.textContent = "?ERROR. [ DELETE ]"; });
    }
    if(e.target.closest(".mmb-close, .mmb-close2")) return closePost();
    const ph = e.target.closest(".mmb-photo"); if(ph) openLightbox(+ph.dataset.i);
  });

  let lb = null, lbAt = 0;
  function lbShow(){ const n = postShots.length;
    lb.querySelector(".mm-lb-t").textContent = `ATTACHMENT ${lbAt + 1}/${n}`;
    lb.querySelector(".mm-lb-img").src = postShots[lbAt];
    lb.querySelectorAll(".mm-lb-nav").forEach(b => b.hidden = n < 2); }
  function openLightbox(i){
    closeLightbox(); lbAt = i;
    lb = document.createElement("div"); lb.className = "mm-lightbox"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true");
    lb.innerHTML = `<div class="mm-lb-win"><div class="mm-lb-bar"><span class="mm-lb-t"></span>
      <span><button type="button" class="mm-lb-btn mm-lb-nav" data-d="-1" aria-label="Previous photo">[&lt;]</button><button type="button" class="mm-lb-btn mm-lb-nav" data-d="1" aria-label="Next photo">[&gt;]</button><button type="button" class="mm-lb-btn mm-lb-x" aria-label="Close photo">[X]</button></span></div>
      <img class="mm-lb-img" alt=""></div>`;
    document.body.appendChild(lb); lbShow();
    lb.addEventListener("click", e => {
      const nav = e.target.closest(".mm-lb-nav"); if(nav){ lbAt = (lbAt + +nav.dataset.d + postShots.length) % postShots.length; return lbShow(); }
      if(e.target.closest(".mm-lb-x") || e.target === lb) closeLightbox(); });
    lb.querySelector(".mm-lb-x").focus({ preventScroll:true });
  }
  function closeLightbox(){ if(lb){ lb.remove(); lb = null; } }
  addEventListener("keydown", e => {
    if(lb){ if(e.key === "Escape"){ e.stopImmediatePropagation(); closeLightbox(); }
      else if(e.key === "ArrowRight" || e.key === "ArrowLeft"){ lbAt = (lbAt + (e.key === "ArrowRight" ? 1 : -1) + postShots.length) % postShots.length; lbShow(); }
      return; }
    if(!$post.hidden && e.key === "Escape"){ e.stopImmediatePropagation(); closePost(); }
  }, true);

  // ---- send ----
  $form.addEventListener("submit", e => {
    e.preventDefault();
    const author = $author.value.trim(), subject = $subject.value.trim(), body = $body.value.trim(), category = $form.elements.category.value;
    if(!author){ $hint.textContent = "?ERROR: NAME REQUIRED."; $author.focus(); return; }
    if(!category){ $hint.textContent = "?ERROR: CATEGORY REQUIRED."; $form.querySelector(".mmb-pick-btn").focus(); return; }
    if(subject.length < 2){ $hint.textContent = "?ERROR: SUBJECT REQUIRED."; $subject.focus(); return; }
    store.set("mm-name", author);
    const btns = $form.querySelectorAll("button"); btns.forEach(b => b.disabled = true);
    $hint.textContent = shots.length ? `TRANSMITTING ${shots.length} IMAGE(S)...` : "TRANSMITTING...";
    fetch(API, { method:"POST", headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ author, subject, body, category, photos:shots.map(({ type, data }) => ({ type, data })), website:$form.elements.website.value }) })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok:r.ok, d })))
      .then(({ ok, d }) => {
        if(!ok || !d.ok) throw new Error((d && d.error) || "net");
        const n = new Date(), at = `${n.getFullYear()}-${two(n.getMonth()+1)}-${two(n.getDate())}T${two(n.getHours())}:${two(n.getMinutes())}`;
        const mine = store.get("mm-mine", []); mine.push({ id:d.id, at, author, subject, body, category, photos:shots.length }); store.set("mm-mine", mine);
        if(d.ownerKey){ const keys = store.get("mm-keys", {}); keys[d.id] = d.ownerKey; store.set("mm-keys", keys); }   // lets this browser edit/delete it
        $subject.value = ""; $body.value = ""; setPick($form.querySelector(".mmb-pick"), ""); shots.forEach(s => URL.revokeObjectURL(s.url)); shots = []; drawThumbs();
        $homeHint.textContent = "POST QUEUED. AWAITING SYSOP APPROVAL.";
        render(); toHome();
      })
      .catch(err => { const m = err && err.message;
        $hint.textContent = m === "slow-down" ? "?ERROR: TOO MANY POSTS. WAIT 10 MIN."
          : m === "category" ? "?ERROR: CATEGORY REQUIRED."
          : m === "photo-size" ? "?ERROR: IMAGE TOO LARGE." : m === "photo-type" ? "?ERROR: UNSUPPORTED IMAGE."
          : "NO CARRIER. PRESS [ SEND ] TO RETRY."; })
      .finally(() => { btns.forEach(b => b.disabled = false); counts(); });
  });

  // ---- category pickers (compose, edit, inbox filter) ----
  function setPick(pk, v){
    const all = pk.dataset.name === "filter";
    pk.querySelector("input").value = v;
    pk.querySelector(".mmb-pick-l").textContent = v ? cat(v)[1] : all ? "ALL CATEGORIES" : "SELECT A CATEGORY";
    if(all){ filter = v; try{ sessionStorage.setItem("mm-filter", v); }catch(e){} render(); }
  }
  function openPick(pk, on){
    screen.querySelectorAll(".mmb-pick").forEach(o => { if(o !== pk || !on){ o.querySelector(".mmb-pick-list").hidden = true; o.querySelector(".mmb-pick-btn").setAttribute("aria-expanded", "false"); } });
    if(!on) return;
    pk.querySelector(".mmb-pick-list").hidden = false; pk.querySelector(".mmb-pick-btn").setAttribute("aria-expanded", "true");
    const cur = pk.querySelector(`.mmb-opt[data-v="${pk.querySelector("input").value}"]`) || pk.querySelector(".mmb-opt");
    cur.focus({ preventScroll:true }); fitPost();
  }
  screen.addEventListener("click", e => {
    const b = e.target.closest(".mmb-pick-btn"), o = e.target.closest(".mmb-opt");
    if(b){ const pk = b.closest(".mmb-pick"); openPick(pk, pk.querySelector(".mmb-pick-list").hidden); return; }
    if(o){ const pk = o.closest(".mmb-pick"); setPick(pk, o.dataset.v); openPick(pk, false); pk.querySelector(".mmb-pick-btn").focus({ preventScroll:true }); fitPost(); return; }
    if(!e.target.closest(".mmb-pick")) openPick(null, false);
  });
  screen.addEventListener("keydown", e => {
    const o = e.target.closest && e.target.closest(".mmb-opt"); if(!o) return;
    const opts = [...o.closest(".mmb-pick-list").querySelectorAll(".mmb-opt")], i = opts.indexOf(o);
    if(e.key === "ArrowDown" || e.key === "ArrowUp"){ e.preventDefault(); opts[(i + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length].focus({ preventScroll:true }); }
    else if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); const pk = o.closest(".mmb-pick"); openPick(pk, false); pk.querySelector(".mmb-pick-btn").focus({ preventScroll:true }); }
  });

  // CRT curve: everything on the screen is bent with the same barrel distortion as the intro clip (ffmpeg lenscorrection
  // k1 .32 / k2 .06 on the scaled frame, centre magnified ~1.22× so the corners land on the corners, as in the clips), then softened to 50% of that bend (Chef,
  // Oct 2026: the mid-sides bulged too far) — f = 1 + 0.5·(0.8188 + 0.1621 r² + 0.0193 r⁴ − 1), r² by half-diagonal; corners unchanged. An SVG displacement map (assets/img/mm-warp-*.png; R = x shift, G = y shift,
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
    const twin = svg.querySelector("filter").cloneNode(true); twin.id = id + "-b"; svg.appendChild(twin);   // identical copy: Safari redraw switches between the two
    document.body.appendChild(svg);
    const fs = [...svg.querySelectorAll("filter")], img = svg.querySelector("feImage");
    let bendK = 1, kick = () => {};   // bendK = how much of the curve is applied (1 = full, 0 = flat); kick = WebKit full redraw
    const size = () => { const w = glass.clientWidth, h = glass.clientHeight; if(!w || !h) return;
      for(const f of fs){ for(const el of [f, f.querySelector("feImage")]) for(const [k, v] of Object.entries({ x:0, y:0, width:w, height:h })) el.setAttribute(k, v);
        f.querySelector("feDisplacementMap").setAttribute("scale", (RANGE * w * bendK).toFixed(1)); } };
    // the page preloads the map (<link rel=preload>), so this is normally instant
    fetch(url).then(r => r.blob()).then(b => new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); }))
      .then(data => { fs.forEach(f => f.querySelector("feImage").setAttribute("href", data)); size(); warp = `url(#${id})`; glass.style.filter = warp; new ResizeObserver(size).observe(glass);
        const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
          const g = c.getContext("2d"); g.drawImage(im, 0, 0); warpMap = { w:c.width, h:c.height, px:g.getImageData(0, 0, c.width, c.height).data, range:RANGE * bendK }; };
        im.src = data;
        // Safari/WebKit only re-filters the small patch that changed (one typed letter, one printed line, a hover), but
        // the bend moves pixels further than that patch, so bits of text went missing. After any change on the screen,
        // nudge the filter so WebKit redraws the whole glass (once per frame at most).
        if(/AppleWebKit/.test(navigator.userAgent) && !/Chrome\/|Chromium|Edg\/|Firefox|OPR\//.test(navigator.userAgent)){
          // WebKit measures the filter from the nearest compositing layer; on some screens (NEW POST on iPhone) the glass
          // stopped being one and the bend shifted by the glass's offset in the monitor. Force it to be its own layer.
          glass.style.transform = "translate3d(0,0,0)"; glass.style.willChange = "transform";
          let queued = 0, flip = false;
          const redraw = () => { if(queued) return; queued = requestAnimationFrame(() => { queued = 0; flip = !flip;   // switching to the twin filter repaints the whole layer
            glass.style.filter = flip ? `url(#${id}-b)` : warp; }); };   // (adding a CSS filter function moved Safari's origin again)
          kick = redraw;
          new MutationObserver(redraw).observe(glass, { subtree:true, childList:true, characterData:true, attributes:true });
          for(const ev of ["scroll", "animationend", "animationstart", "transitionend", "transitionrun", "pointerover", "pointerout", "focusin", "focusout", "input"])
            glass.addEventListener(ev, redraw, { capture:true, passive:true });
          redraw();
        } })
      .catch(() => {});
    // Typing on a phone/tablet: iOS and Android draw their own caret, selection highlight and drag handles at the FLAT
    // position of the text, which the bend moves away from what you see. So while a text box is focused on a touch
    // screen the curve relaxes to flat (still inside the monitor), and bends back when you leave the box (Chef, Oct 2026).
    // warpMap.range follows, so tap re-aiming and the pointer bend stay in step with what is drawn.
    const touch = matchMedia("(hover: none), (pointer: coarse)");
    const isField = el => !!(el && el.matches && el.matches("input:not([type=file]):not([type=checkbox]):not([type=radio]), textarea"));
    let anim = 0;
    const setBend = to => { if(bendK === to) return; cancelAnimationFrame(anim); const from = bendK, t0 = performance.now(), D = 380;
      const step = t => { const p = Math.min(1, (t - t0) / D), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        bendK = from + (to - from) * e; size(); if(warpMap) warpMap.range = RANGE * bendK; kick();
        if(p < 1) anim = requestAnimationFrame(step); };
      anim = requestAnimationFrame(step); };
    document.addEventListener("focusin", e => { if(touch.matches && isField(e.target) && screen.contains(e.target)) setBend(0); });
    document.addEventListener("focusout", e => { if(!touch.matches || !isField(e.target)) return;
      setTimeout(() => { const a = document.activeElement; if(!(isField(a) && screen.contains(a))) setBend(1); }, 80); });
  })();

  // BOOT (html.mm-boot, set by the page): type "C:\>stayhuman.exe" in the board font, wipe the screen,
  // then fire "mm:booted" so the page plays the logo clip. Cut short when the board is revealed (a key press skips).
  let boot = null;
  if(document.documentElement.classList.contains("mm-boot") && !document.documentElement.classList.contains("mm-ready")){
    boot = document.createElement("div"); boot.className = "mmb mmb-boot"; boot.setAttribute("aria-hidden", "true");
    boot.innerHTML = `<p><span class="mmb-bt">C:\\&gt;</span>_</p>`;   // text-style "_" cursor trails the typing (Chef)
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
  // LOGO HANDOFF: the intro clip ends on the big MEET ME AT Society logo; just before the clip blanks it, a copy of the logo
  // takes its place on the screen and slides up and shrinks, in steps, into its spot in the inbox header (.mmb-mark), then
  // the inbox prints. VIS = where the clip draws the logo (fraction of the glass, measured from the clips).
  let fly = null;
  (function handoff(){
    const v = box.querySelector(".mm-v-intro"), idle = box.querySelector(".mm-v-idle"), html = document.documentElement;
    if(!v || matchMedia("(prefers-reduced-motion: reduce)").matches || html.classList.contains("mm-ready")) return;
    const VIS = box.classList.contains("mm-computer") ? { x0:.2408, x1:.7488, y0:.2325, y1:.7006 } : { x0:.1171, x1:.8671, y0:.076, y1:.3034 };
    const AT = 3.86;   // clip time (s) just before the logo goes off
    const go = () => {
      const mark = $(".mmb-mark"), m = warpMap;
      if(!mark || !m || isCompose()) return;   // no map yet / on the post screen: the page's normal ending takes over
      const r = screen.getBoundingClientRect(), w = r.width, h = r.height, S = m.range * w;
      const unbend = (fx, fy) => { const x = fx * w, y = fy * h, mx = Math.min(m.w - 1, Math.max(0, Math.round(fx * m.w - .5))),
        my = Math.min(m.h - 1, Math.max(0, Math.round(fy * m.h - .5))), k = (my * m.w + mx) * 4;
        return [x + S * (m.px[k] / 255 - .5), y + S * (m.px[k + 1] / 255 - .5)]; };   // seen spot → layout spot (what the filter samples)
      const cx = (VIS.x0 + VIS.x1) / 2, cy = (VIS.y0 + VIS.y1) / 2;
      const a = { l:unbend(VIS.x0, cy)[0], r:unbend(VIS.x1, cy)[0], t:unbend(cx, VIS.y0)[1], b:unbend(cx, VIS.y1)[1] };
      screen.scrollTop = 0;
      const mr = mark.getBoundingClientRect(), z = { l:mr.left - r.left, t:mr.top - r.top, w:mr.width, h:mr.height };
      fly = new Image(); fly.src = mark.src; fly.alt = ""; fly.className = "mmb-fly";
      const put = (l, t, fw, fh) => Object.assign(fly.style, { left:l + "px", top:t + "px", width:fw + "px", height:fh + "px" });
      put(a.l, a.t, a.r - a.l, a.b - a.t); screen.appendChild(fly);
      v.pause(); v.classList.add("done"); if(idle) idle.play().catch(() => {});
      const N = 14, ease = x => 1 - Math.pow(1 - x, 3);   // 14 visible steps over ~1.1s: smooth enough to read, jerky enough to feel old
      let i = 0;
      const step = () => { if(!fly) return; i++; const e = ease(i / N);
        put(a.l + (z.l - a.l) * e, a.t + (z.t - a.t) * e, (a.r - a.l) + (z.w - (a.r - a.l)) * e, (a.b - a.t) + (z.h - (a.b - a.t)) * e);
        if(i < N) setTimeout(step, 80);
        else setTimeout(() => { html.classList.add("mm-ready"); document.dispatchEvent(new Event("mm:ready")); }, 120); };
      setTimeout(step, 250);   // a beat on the full-size logo first
    };
    const watch = () => { if(html.classList.contains("mm-ready")) return; if(v.currentTime >= AT) go(); else requestAnimationFrame(watch); };
    v.addEventListener("playing", () => requestAnimationFrame(watch), { once:true });
  })();

  const ready = () => { if(fly){ const f = fly; fly = null; requestAnimationFrame(() => f.remove()); }
    if(boot){ boot.remove(); boot = null; } screen.classList.add("on", "printing"); view(); setTimeout(() => screen.classList.remove("printing"), 1200); };
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

/* Meet Me page only: the site menu bar stays hidden until it's wanted — the mouse comes near the top, the top edge is
   tapped, a finger swipes down from the top, or keyboard focus reaches it. It slides away again when no longer needed. */
(function(){
  const bar = document.querySelector(".mm-bar"); if(!bar) return;
  const root = document.documentElement, ZONE = 44;   // px below the bar's bottom edge that count as "the top"
  let hideT = 0, touchY = null;
  const edge = () => { const r = bar.getBoundingClientRect(), on = root.classList.contains("mm-bar-on");
    return Math.max(ZONE, r.bottom + (on ? 0 : 1.3 * r.height) + ZONE); };   // where the bar's bottom is when shown (+ margin)
  const show = ms => { clearTimeout(hideT); hideT = 0; root.classList.add("mm-bar-on"); if(ms) hideT = setTimeout(hide, ms); };
  const hide = () => { hideT = 0; if(bar.contains(document.activeElement)) return; root.classList.remove("mm-bar-on"); };
  // mouse / trackpad: near the top shows it; moving away (or leaving the window) hides it after a beat
  addEventListener("pointermove", e => { if(e.pointerType !== "mouse") return;
    if(e.clientY < edge()) show(); else if(root.classList.contains("mm-bar-on") && !hideT) hideT = setTimeout(hide, 500); }, { passive:true });
  root.addEventListener("mouseleave", () => { if(!hideT) hideT = setTimeout(hide, 500); });
  // touch: tap the top strip, or start a swipe at the top and pull down; it hides after a few seconds or a tap elsewhere
  addEventListener("touchstart", e => { const y = e.touches[0].clientY; touchY = y < edge() ? y : null;
    if(root.classList.contains("mm-bar-on") && !bar.contains(e.target)) hide(); }, { passive:true });
  addEventListener("touchmove", e => { if(touchY !== null && e.touches[0].clientY - touchY > 24){ touchY = null; show(4000); } }, { passive:true });
  addEventListener("touchend", e => { if(touchY !== null && e.changedTouches[0].clientY < edge()) show(4000); touchY = null; }, { passive:true });
  // clicking the top strip (any pointer) and keyboard focus also bring it in
  addEventListener("click", e => { if(e.clientY < edge() && !bar.contains(e.target)) show(e.pointerType === "mouse" ? 0 : 4000); });
  bar.addEventListener("focusin", () => show());
  bar.addEventListener("focusout", () => setTimeout(() => { if(!bar.contains(document.activeElement)) hide(); }, 50));
})();

/* Meet Me sticky note: hover (CSS) or keyboard focus shows it; a click / tap pins it open or closed; on touch screens a swipe
   in from the right edge (or across the note) pulls it out, a swipe back to the right tucks it away; a tap elsewhere closes it. */
(function(){
  const note = document.querySelector(".mm-note"); if(!note) return;
  try{ if(sessionStorage.getItem("mm-note-off")) document.documentElement.classList.add("mm-note-off"); }catch(e){}
  note.querySelector(".mm-note-x").addEventListener("click", e => {   // [x]: gone for this visit
    e.stopPropagation(); document.documentElement.classList.add("mm-note-off");
    try{ sessionStorage.setItem("mm-note-off", "1"); }catch(err){}
  });
  const set = on => { note.classList.toggle("open", on); note.setAttribute("aria-expanded", String(on)); };
  note.addEventListener("click", e => { e.stopPropagation(); set(!note.classList.contains("open")); });
  note.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); set(!note.classList.contains("open")); } else if(e.key === "Escape") set(false); });
  document.addEventListener("click", e => { if(!note.contains(e.target)) set(false); });
  let x0 = null, y0 = 0;
  addEventListener("touchstart", e => { const t = e.touches[0];
    x0 = (t.clientX > innerWidth - 36 || note.contains(e.target)) ? t.clientX : null; y0 = t.clientY; }, { passive:true });
  addEventListener("touchmove", e => { if(x0 === null) return; const t = e.touches[0], dx = t.clientX - x0;
    if(Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(t.clientY - y0)) return;
    set(dx < 0); x0 = null; }, { passive:true });
})();

