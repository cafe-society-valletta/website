/* Meet Me at Society — the green-screen message board (retro Craigslist × Reddit).
   Renders into whichever monitor is showing (.mm-phone < 900px, else .mm-computer):
     WRITE A POST> █      ← type straight away; Enter → asks NAME> (remembered) → Enter posts it
     ===== M E S S A G E   I N B O X =====
     DATE  TIME  AUTHOR  SUBJECT   (newest first; each row links to #p/<id> — the post page comes later)
   All screen copy is written the way the 8-bit terminal would print it (Chef): CAPS system lines, > prompts, terse.
   The screen appears once the intro clip has finished (document event "mm:ready"); typing during the intro skips it.
   STORAGE: shared, via netlify/functions/meetme (Netlify Blobs). New posts wait for approval (mmadmin.html); until then the
   poster sees their own post marked "[PENDING]" (kept in localStorage "mm-mine"). SEED = example post(s). */
(function(){
  const SEED = [
    { id:"jake-photo-safari", at:"2026-01-16T00:12", author:"Jake Page", subject:"Photo safari at Hastings Garden Sunday B4 LSC who is interested?" },
  ];
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

  screen.innerHTML = `
    <div class="mmb">
      <label class="mmb-prompt"><span class="mmb-ps">WRITE A POST&gt;</span><span class="mmb-typed"></span><span class="mmb-caret" aria-hidden="true"></span>
        <input class="mmb-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <input class="mmb-in" type="text" maxlength="90" autocomplete="off" autocapitalize="sentences" spellcheck="false" aria-label="Write a post — type a subject and press Enter"></label>
      <p class="mmb-hint" aria-live="polite"></p>
      <div class="mmb-inbox">
        <div class="mmb-rule">${"=".repeat(160)}</div>
        <h2 class="mmb-title">M E S S A G E&nbsp;&nbsp;&nbsp;I N B O X</h2>
        <div class="mmb-rule">${"=".repeat(160)}</div>
        <div class="mmb-row mmb-head" aria-hidden="true"><span>DATE</span><span>TIME</span><span>AUTHOR</span><span>SUBJECT</span></div>
        <div class="mmb-rule mmb-thin">${"-".repeat(200)}</div>
        <ol class="mmb-list"></ol>
      </div>
    </div>`;
  const $in = screen.querySelector(".mmb-in"), $typed = screen.querySelector(".mmb-typed"), $ps = screen.querySelector(".mmb-ps"),
        $hint = screen.querySelector(".mmb-hint"), $list = screen.querySelector(".mmb-list"), $hp = screen.querySelector(".mmb-hp");

  function render(){
    $list.innerHTML = posts().map(p => { const [d, t] = fmt(p.at);
      return `<li><a class="mmb-row${p.waiting ? " mmb-wait" : ""}" href="#p/${esc(p.id)}"><span>${d}</span><span>${t}</span><span>&lt;${esc(p.author)}&gt;</span><span>${esc(p.subject)}${p.waiting ? " <em>[PENDING]</em>" : ""}</span></a></li>`; }).join("");
  }
  render(); load(); setInterval(() => { if(!document.hidden) load(); }, 60e3);

  // two-step prompt: subject, then name
  let step = "subject", draft = "";
  const prompt = (label, value, hint) => { $ps.textContent = label; $in.value = value || ""; $typed.textContent = $in.value; $hint.textContent = hint || ""; };
  $in.addEventListener("input", () => { $typed.textContent = $in.value; });
  $in.addEventListener("keydown", e => {
    if(e.key === "Escape"){ step = "subject"; prompt("WRITE A POST>", ""); return; }
    if(e.key !== "Enter") return;
    e.preventDefault();
    const v = $in.value.trim();
    if(!v) return;
    if(step === "subject"){ draft = v; step = "name"; prompt("NAME>", store.get("mm-name", ""), "[ENTER] SEND   [ESC] CANCEL"); return; }
    store.set("mm-name", v);
    const subject = draft;
    $in.disabled = true; $hint.textContent = "TRANSMITTING...";
    fetch(API, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ subject, author:v, website:$hp.value }) })
      .then(r => r.json().then(d => ({ ok:r.ok, d })))
      .then(({ ok, d }) => {
        if(!ok || !d.ok) throw new Error(d && d.error);
        const n = new Date(), two2 = x => String(x).padStart(2, "0");
        const at = `${n.getFullYear()}-${two2(n.getMonth()+1)}-${two2(n.getDate())}T${two2(n.getHours())}:${two2(n.getMinutes())}`;
        const mine = store.get("mm-mine", []); mine.push({ id:d.id, at, author:v, subject }); store.set("mm-mine", mine);
        step = "subject"; draft = ""; prompt("WRITE A POST>", "", "MESSAGE QUEUED. AWAITING SYSOP APPROVAL.");
        render();
      })
      .catch(err => { $hint.textContent = err && err.message === "slow-down" ? "?ERROR: TOO MANY MESSAGES. WAIT 10 MIN." : "NO CARRIER. PRESS [ENTER] TO RETRY."; })
      .finally(() => { $in.disabled = false; $in.focus({ preventScroll:true }); });
  });
  screen.addEventListener("click", e => { if(!e.target.closest("a")) $in.focus({ preventScroll:true }); });
  // type anywhere on the page: the keystroke goes straight to the prompt (nothing gets lost while focus is elsewhere)
  addEventListener("keydown", e => {
    if(document.activeElement === $in || e.metaKey || e.ctrlKey || e.altKey) return;
    if(document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    if(e.key.length !== 1) return;
    e.preventDefault(); $in.focus({ preventScroll:true }); $in.value += e.key; $typed.textContent = $in.value;
  });

  // CRT curve: everything on the screen is bent with the same barrel distortion as the intro clip (ffmpeg lenscorrection
  // k1 .32 / k2 .06 on the scaled frame, centre magnified ~1.22× so the corners land on the corners, as in the clips). An SVG displacement map (assets/img/mm-warp-*.png; R = x shift, G = y shift,
  // 0.5 = none) is applied as a CSS filter to the screen, sized in px to the screen and re-sized with it.
  // WARP_SCALE = the map's full range in screen-box px at the size the map was made for (phone 933 px wide, desktop 868).
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
      .then(data => { img.setAttribute("href", data); size(); screen.style.filter = `url(#${id})`; new ResizeObserver(size).observe(screen); })
      .catch(() => {});
  })();

  // reveal once the intro clip is done
  const ready = () => { screen.classList.add("on"); if(matchMedia("(hover: hover)").matches) $in.focus({ preventScroll:true }); };
  if(document.documentElement.classList.contains("mm-ready")) ready(); else document.addEventListener("mm:ready", ready, { once:true });
})();
