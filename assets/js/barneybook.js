/* Barney Book — live recipe search (data: assets/js/barneybook-data.js → window.BARNEY).
   List shows names only; a tap expands the recipe (name · yield/glass · ingredients · method),
   with a further "More" for notes and linked prep recipes. Deep link: barneybook.html#<slug>. */
(function(){
  const R = window.BARNEY || [];
  const TYPE = { sig:"Signature", classic:"Classic", prep:"Prep", food:"Food" };
  const norm = s => (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim();
  const slug = s => norm(s).replace(/ /g,"-");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  // Variant prices: p:"9/9/11" on "Aperol / Campari / Limoncello Spritz" puts each price beside its variant
  // ("Aperol €9 / Campari €9 / Limoncello €11 Spritz") instead of one price on the right.
  const nameHTML = r => {
    if(!r.pv) return esc(r.n);
    const parts = r.n.split(" / "), last = parts.pop(), w = last.split(" "), lead = parts[0].split(" ").length;
    parts.push(w.slice(0, lead).join(" ")); const tail = w.slice(lead).join(" ");
    return parts.map((v,i) => `<i class="bb-v">${esc(v)} <b class="bb-pv">€${esc(r.pv[i])}</b>${i < parts.length-1 ? " /" : ""}</i>`).join(" ") + (tail ? " " + esc(tail) : "");
  };

  R.forEach((r,k) => {
    r.k = k; r.id = slug(r.n);
    if(r.p && r.p.includes("/") && r.p.split("/").length === r.n.split(" / ").length) r.pv = r.p.split("/");
    r.ing = (r.i||[]).map(s => s[0]==="#" ? {h:s.slice(1)} : (([q,it]) => ({q:q||"", it:it===undefined ? q : it}))(s.split("|")));
    r.nn = norm(r.n);
    r.hay = norm([r.n, ...(r.a||[]), ...r.ing.map(x=>x.it||x.h)].join(" "));
  });

  // Prep recipes referenced by ingredient names (longest name first so "brown sugar syrup" beats "sugar syrup").
  const preps = R.filter(r => r.t==="prep").flatMap(p => [p.n, ...(p.a||[])].map(name => ({p, key:norm(name.replace(/\(.*?\)/g,""))})))
                 .sort((a,b) => b.key.length - a.key.length);
  const prepFor = item => { const t=" "+norm(item)+" "; const m=preps.find(x => x.key.length>3 && t.includes(" "+x.key+" ")); return m && m.p; };
  R.forEach(r => { r.uses=[]; r.usedIn=[]; });
  R.forEach(r => r.ing.forEach(x => { if(!x.it) return; const p=prepFor(x.it); if(p && p!==r){ x.p=p; if(!r.uses.includes(p)) r.uses.push(p); if(!p.usedIn.includes(r)) p.usedIn.push(r); } }));

  const $q = document.getElementById("bb-q"), $list = document.getElementById("bb-list"), $none = document.getElementById("bb-none");
  const btns = [...document.querySelectorAll(".bb-filters button")];
  let type = "", open = null;

  // Scoring: name starts with query > a name word starts with it > name contains it > ingredient/alias match.
  function score(r, q){
    if(!q) return 1;
    const words = q.split(" ");
    if(!words.every(w => r.hay.includes(w))) return 0;
    if(r.nn.startsWith(q)) return 4;
    if(words.every(w => (" "+r.nn).includes(" "+w))) return 3;
    if(words.every(w => r.nn.includes(w))) return 2;
    return 1;
  }

  function card(r){
    const meta = [r.y && ["Yield", r.y], r.g && ["Glass", r.g]].filter(Boolean)
      .map(([l,v]) => `<p class="bb-meta"><span>${l}</span>${esc(v)}</p>`).join("");
    const ingList = r.ing.length ? `<ul class="bb-ing">${r.ing.map(x => x.h ? `<li class="h">${esc(x.h)}</li>`
      : `<li><b>${esc(x.q)}</b><span>${x.p ? `<a href="#${x.p.id}" data-go="${x.p.k}">${esc(x.it)}</a>` : esc(x.it)}</span></li>`).join("")}</ul>` : "";
    const steps = (r.m||[]).length ? `<ol class="bb-method">${r.m.map(s => `<li>${esc(s)}</li>`).join("")}</ol>` : "";
    const more = [];
    if(r.x) more.push(`<p class="bb-lab">Notes</p>${r.x.map(s => `<p>${esc(s)}</p>`).join("")}`);
    if(r.uses.length) more.push(`<p class="bb-lab">Prep used</p>${r.uses.map(p => `<a class="bb-link" href="#${p.id}" data-go="${p.k}">${esc(p.n)} →</a>`).join("")}`);
    if(r.usedIn.length) more.push(`<p class="bb-lab">Used in</p>${r.usedIn.map(p => `<a class="bb-link" href="#${p.id}" data-go="${p.k}">${esc(p.n)} →</a>`).join("")}`);
    const moreHtml = more.length ? `<button type="button" class="bb-more" aria-expanded="false"><span>More</span><i>+</i></button><div class="bb-extra" hidden>${more.join("")}</div>` : "";
    return `<div class="bb-card"><div class="bb-top">${photo(r)}<div class="bb-top-l">${meta}${ingList}</div></div>${steps}${moreHtml}${talk(r)}</div>`;
  }

  /* ---------- photos: square thumbnail beside the ingredients, arrows when there's more than one ----------
     Approved media come from the Barney Book Apps Script (Drive: Barney Book/<type>/<recipe>/, files directly in the
     recipe folder = approved). Uploads land in <recipe>/To review until a manager moves them up. */
  const MEDIA_API = "https://script.google.com/macros/s/AKfycbwXYEd2F0vTS7hwkgG3c47HEAb1hfnO7ShrwxJFcxt7zb-T-C6xTKnXsMQKVrt61vhc/exec";   // Apps Script "Barney Book Photos" (cafesocietyvalletta). Public read-only list + upload-to-review.
  let media = {}, shot = 0, upMsg = "";
  const mediaFor = r => (media[r.id] || r.media || []).map(m => typeof m === "string" ? { src:m, video:/\.(mp4|webm|mov)$/i.test(m) } : m);
  function photo(r){
    const list = mediaFor(r), msg = upMsg ? `<p class="bb-upmsg" role="status">${esc(upMsg)}</p>` : "";
    if(!list.length && (r.t === "prep" || r.t === "food")) return "";   // prep + food: thumbnail only once a photo exists
    if(!list.length) return `<div class="bb-ph"><div class="bb-sq bb-sq-empty"><span>No photo yet</span><button type="button" class="bb-up">Upload photo</button></div>${msg}</div>`;
    const i = ((shot % list.length) + list.length) % list.length, m = list[i];
    const pic = m.video ? `<a class="bb-vid" href="${esc(m.href || m.src)}" target="_blank" rel="noopener"><img src="${esc(m.thumb || "")}" alt="" loading="lazy"><i>▶</i></a>`
                        : `<a class="bb-big" href="${esc(m.big || m.src)}" target="_blank" rel="noopener"><img src="${esc(m.src)}" alt="${esc(r.n)}" loading="lazy"></a>`;
    const nav = list.length > 1 ? `<button type="button" class="bb-arw" data-shot="-1" aria-label="Previous photo">‹</button><button type="button" class="bb-arw" data-shot="1" aria-label="Next photo">›</button><span class="bb-count">${i+1}/${list.length}</span>` : "";
    return `<div class="bb-ph"><div class="bb-sq">${pic}${nav}</div>${msg}</div>`;
  }
  // the photo is rendered twice: beside the name on phones (.bb-ph-m), beside the ingredients on desktop (.bb-top) — CSS shows one
  function rerenderPhoto(){ if(!open) return; $list.querySelectorAll(".bb-item.open .bb-ph").forEach(el => el.outerHTML = photo(open)); }
  // Speed: the last list is kept in localStorage so photos show instantly on repeat visits (Google's script can take a few
  // seconds to wake up); the fresh list replaces it when it arrives. Thumbnails are preloaded in the background so a card
  // opens with its photo already there.
  const MKEY = "bb-media", preloaded = new Set();
  function useMedia(d){
    if(!d || !d.media) return false;
    media = {};
    for(const [k, files] of Object.entries(d.media)) media[k] = files.map(f => f.video
      ? { video:true, href:`https://drive.google.com/file/d/${f.id}/preview`, thumb:`https://drive.google.com/thumbnail?id=${f.id}&sz=w800` }
      : { src:`https://drive.google.com/thumbnail?id=${f.id}&sz=w800`, big:`https://drive.google.com/thumbnail?id=${f.id}&sz=w2400` });
    rerenderPhoto(); preload();
    return true;
  }
  function preload(){
    const urls = Object.values(media).flat().map(m => m.video ? m.thumb : m.src).filter(u => u && !preloaded.has(u));
    const next = () => { const u = urls.shift(); if(!u) return; preloaded.add(u);
      const im = new Image(); im.decoding = "async"; im.onload = im.onerror = next; im.src = u; };
    const go = () => { for(let i = 0; i < 3; i++) next(); };   // 3 at a time, after the page has settled
    ("requestIdleCallback" in window) ? requestIdleCallback(go, { timeout:2000 }) : setTimeout(go, 600);
  }
  try { useMedia(JSON.parse(localStorage.getItem(MKEY) || "null")); } catch(e) {}
  if(MEDIA_API) fetch(MEDIA_API).then(r => r.ok ? r.json() : null).then(d => {
    if(useMedia(d)) try { localStorage.setItem(MKEY, JSON.stringify({ media:d.media })); } catch(e) {}
  }).catch(() => {});

  // Upload: pick a photo/video → photos shrink to 2000px JPEG in the browser → POST to the Apps Script (text/plain, no preflight).
  const picker = Object.assign(document.createElement("input"), { type:"file", accept:"image/*,video/*", hidden:true });
  document.body.appendChild(picker);
  const toJpeg = f => new Promise((ok, bad) => { const img = new Image(); img.onload = () => {
      const k = Math.min(1, 2000 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src); ok(c.toDataURL("image/jpeg", .85).split(",")[1]); };
    img.onerror = bad; img.src = URL.createObjectURL(f); });
  const toB64 = f => new Promise((ok, bad) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(",")[1]); fr.onerror = bad; fr.readAsDataURL(f); });
  function startUpload(){
    if(!MEDIA_API){ upMsg = "Photo uploads open soon."; rerenderPhoto(); return; }
    picker.value = ""; picker.click();
  }
  picker.addEventListener("change", async () => {
    const f = picker.files[0], r = open; if(!f || !r) return;
    const video = f.type.startsWith("video/");
    if(video && f.size > 40e6){ upMsg = "That video is too big (40 MB max)."; rerenderPhoto(); return; }
    upMsg = "Uploading…"; rerenderPhoto();
    try{
      const data = video ? await toB64(f) : await toJpeg(f);
      const res = await fetch(MEDIA_API, { method:"POST", headers:{ "Content-Type":"text/plain;charset=utf-8" },
        body: JSON.stringify({ recipeId:r.id, recipe:r.n, type:TYPE[r.t], name:store.get("bb-name"), filename:f.name, mime: video ? f.type : "image/jpeg", data }) });
      const d = await res.json().catch(() => ({}));
      if(!res.ok || !d.ok) throw new Error(d.error || res.status);
      upMsg = "Thanks! Your photo is waiting for approval.";
    }catch(e){ upMsg = "Couldn't upload. Please try again."; }
    if(open === r) rerenderPhoto();
  });

  /* ---------- comments + suggested edits (stored in Coda via /.netlify/functions/barneybook) ---------- */
  const API = "/.netlify/functions/barneybook";
  let comments = [], talkState = null;     // talkState = which panel is open on the open card: "c" | "e" | null
  const store = { get(k){ try{ return localStorage.getItem(k) || ""; }catch(e){ return ""; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} } };
  const fmtDate = s => { const d = new Date(s); return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }); };
  const forRecipe = r => comments.filter(c => c.recipe === r.id);
  const form = (kind) => `<form class="bb-form" data-kind="${kind}" novalidate>
      ${kind==="e" ? `<p class="bb-note">This won't change the recipe. It goes to the managers and stays on the daily report until they decide whether to make the change.</p>` : ""}
      <input class="bb-in" name="name" placeholder="Your name" autocomplete="name" maxlength="60" value="${esc(store.get("bb-name"))}" required>
      <textarea class="bb-in" name="message" rows="${kind==="e" ? 4 : 3}" maxlength="2000" placeholder="${kind==="e" ? "What should change, and why?" : "Add a comment"}" required></textarea>
      <input class="bb-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="bb-send"><span class="bb-msg" role="status"></span><button type="submit">${kind==="e" ? "Send suggestion" : "Post comment"}</button></div>
    </form>`;
  function talk(r){
    const list = forRecipe(r);
    const items = list.map(c => `<li><p class="bb-who">${esc(c.name)} <span>${fmtDate(c.at)}</span></p><p>${esc(c.message)}</p></li>`).join("");
    return `<div class="bb-talk">
      <div class="bb-talk-btns">
        <button type="button" class="bb-tb" data-talk="c" aria-expanded="${talkState==="c"}">Comments${list.length ? ` (${list.length})` : ""}</button>
        <button type="button" class="bb-tb" data-talk="e" aria-expanded="${talkState==="e"}">Suggest an edit</button>
        <button type="button" class="bb-tb bb-up">+ Upload a photo</button>
      </div>
      ${talkState==="c" ? `<div class="bb-panel">${items ? `<ul class="bb-comments">${items}</ul>` : `<p class="bb-note">No comments yet.</p>`}${form("c")}</div>` : ""}
      ${talkState==="e" ? `<div class="bb-panel">${form("e")}</div>` : ""}
    </div>`;
  }
  function rerenderTalk(){ const el = $list.querySelector(".bb-item.open .bb-talk"); if(el && open) el.outerHTML = talk(open); }
  fetch(API).then(r => r.ok ? r.json() : null).then(d => { if(d && d.comments){ comments = d.comments; rerenderTalk(); } }).catch(() => {});

  async function submit(f){
    const kind = f.dataset.kind, msg = f.querySelector(".bb-msg"), btn = f.querySelector("button[type=submit]");
    const name = f.name.value.trim(), message = f.message.value.trim();
    if(name.length < 2){ msg.textContent = "Please add your name."; f.name.focus(); return; }
    if(message.length < 2){ msg.textContent = kind==="e" ? "Please describe the change." : "Please write a comment."; f.message.focus(); return; }
    store.set("bb-name", name);
    btn.disabled = true; msg.textContent = "Sending…";
    try{
      const res = await fetch(API, { method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ recipeId: open.id, recipe: open.n, type: kind==="e" ? "edit" : "comment", name, message, website: f.website.value }) });
      const d = await res.json().catch(() => ({}));
      if(!res.ok) throw new Error(d.error || res.status);
      if(kind==="c"){ if(d.comment) comments.push(d.comment); rerenderTalk(); }
      else { f.outerHTML = `<p class="bb-note bb-done">Thanks, ${esc(name)}. Your suggestion has gone to the managers.</p>`; }
    }catch(e){
      btn.disabled = false;
      msg.textContent = String(e.message) === "slow-down" ? "Too many messages, try again in a few minutes." : "Couldn't send. Please try again.";
    }
  }

  function render(){
    const q = norm($q.value);
    const hits = R.filter(r => !type || r.t===type).map(r => [r, score(r,q)]).filter(([,s]) => s)
      .sort((a,b) => b[1]-a[1] || a[0].n.localeCompare(b[0].n)).map(([r]) => r);
    $list.innerHTML = hits.map(r => `<li class="bb-item${open===r ? " open" : ""}" data-k="${r.k}" data-t="${r.t}">
      <button type="button" class="bb-name" aria-expanded="${open===r}"><span>${nameHTML(r)}</span>${r.p && !r.pv ? `<b class="bb-p">€${esc(r.p)}</b>` : ""}<small>${TYPE[r.t]}</small></button>
      ${open===r ? `<div class="bb-ph-m">${photo(r)}</div>` + card(r) : ""}</li>`).join("");
    $none.hidden = hits.length > 0;
    fitName();
  }

  // long one-word names (Kismesissitude, Terremotomoto…) can't wrap: shrink the open title until it fits beside the photo
  function fitName(){ const sp = $list.querySelector(".bb-item.open .bb-name span"); if(!sp) return;
    sp.style.fontSize = ""; let px = parseFloat(getComputedStyle(sp).fontSize);
    while(sp.scrollWidth > sp.clientWidth + 1 && px > 15){ px -= 1; sp.style.fontSize = px + "px"; } }
  addEventListener("resize", fitName);

  function show(r, scroll){
    if(r !== open){ talkState = null; shot = 0; upMsg = ""; }
    open = r;
    if(r && !$list.querySelector(`[data-k="${r.k}"]`)){ $q.value = ""; setType(""); }
    render();
    if(r){
      history.replaceState(null, "", "#"+r.id);
      const el = $list.querySelector(".bb-item.open");
      if(scroll && el){ const bar=document.querySelector(".site-bar"); window.scrollTo({top: el.getBoundingClientRect().top + scrollY - (bar ? bar.offsetHeight : 0) - 8, behavior:"smooth"}); }
    } else history.replaceState(null, "", location.pathname + location.search);
  }

  function setType(t){ type = t; btns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.t===t))); }

  /* typing animation: the search box glides up under the menu bar, rows that stay slide to their new place (FLIP),
     rows that appear zoom in, and the best match gets a quick zoom pulse. Off for prefers-reduced-motion. */
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  let glideRaf = 0;
  function glideTo(target, ms){            // target: () => y, re-read every frame since the header may still be settling
    cancelAnimationFrame(glideRaf);
    const y0 = scrollY, t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 4), y = target();
      if(y > y0 - 2) scrollTo(0, y0 + (y - y0) * e); if(k < 1) glideRaf = requestAnimationFrame(step); };
    glideRaf = requestAnimationFrame(step);
  }
  function typed(){
    if(calm.matches){ open = null; render(); return; }
    const vh = innerHeight, before = new Map();
    $list.querySelectorAll(".bb-item").forEach(li => { const t = li.getBoundingClientRect().top; if(t < vh && t > -80) before.set(li.dataset.k, t); });
    // keep the page tall while searching so a short result list doesn't yank the box back down
    $list.style.minHeight = $q.value.trim() ? Math.round(vh * .8) + "px" : "";
    open = null; render();
    let n = 0;
    $list.querySelectorAll(".bb-item").forEach((li, i) => {
      const top = li.getBoundingClientRect().top; if(top > vh) return;
      if(before.has(li.dataset.k)){
        const dy = before.get(li.dataset.k) - top; if(!dy) return;
        li.animate([{ transform:`translateY(${dy}px)` }, { transform:"none" }], { duration:420, easing:"cubic-bezier(.1,.75,.12,1)" });
      } else li.animate([{ opacity:0, transform:"scale(.94) translateY(8px)" }, { opacity:1, transform:"none" }], { duration:380, delay:Math.min(n++, 8) * 22, easing:"cubic-bezier(.1,.75,.12,1)", fill:"backwards" });
      if(i === 0 && $q.value.trim()) li.animate([{ transform:"scale(1.025)" }, { transform:"scale(1)" }], { duration:500, easing:"cubic-bezier(.1,.75,.12,1)", composite:"add" });
    });
    const bar = document.querySelector(".site-bar"), box = $q.closest(".bb-box");
    const target = () => box.getBoundingClientRect().top + scrollY - (bar ? bar.offsetHeight : 0) - 10;
    if($q.value.trim() && scrollY < target() - 4) glideTo(target, 700);
  }
  $q.addEventListener("input", typed);

  /* arrival = Paper layout (big logo + tagline). Focusing the search or scrolling the list makes the page "compact":
     tagline fades, logo halves, legend folds, the search box rides up. The search ✕ or a tap on the logo brings the full layout back. */
  const $bb = document.querySelector(".bb");
  let holdFull = false;
  const compact = () => { if(holdFull) return; if($bb && !$bb.classList.contains("bb-compact")) $bb.classList.add("bb-compact"); };
  $q.addEventListener("focus", compact);
  addEventListener("scroll", () => { if(scrollY > 8) compact(); }, { passive:true });
  // Back to the full arrival layout (big logo, tagline, category legend): the search box's ✕ or a tap on the logo.
  function expand(){
    cancelAnimationFrame(glideRaf);
    holdFull = true; $q.blur();
    if($q.value){ $q.value = ""; }
    $list.style.minHeight = ""; open = null; render();
    history.replaceState(null, "", location.pathname + location.search);
    if($bb) $bb.classList.remove("bb-compact");
    scrollTo({ top:0, behavior: calm.matches ? "auto" : "smooth" });
    // ignore the scroll events of this glide; compact again on the next real scroll or search tap
    const t0 = performance.now(), wait = () => { if(scrollY <= 8 || performance.now() - t0 > 1500) setTimeout(() => holdFull = false, 120); else requestAnimationFrame(wait); };
    requestAnimationFrame(wait);
  }
  $q.addEventListener("search", () => { if(!$q.value) expand(); });            // ✕ clear button (Chrome/Safari)
  $q.addEventListener("input", e => { if(!$q.value && !e.inputType) expand(); }); // ✕ on browsers that only fire input
  const $logo = document.querySelector(".bb-head picture");
  if($logo){ $logo.setAttribute("role", "button"); $logo.tabIndex = 0; $logo.setAttribute("aria-label", "Back to the top of the Barney Book");
    $logo.addEventListener("click", expand);
    $logo.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); expand(); } }); }
  $q.addEventListener("keydown", e => {
    if(e.key==="Enter"){ const first=$list.querySelector(".bb-item"); if(first){ show(R[first.dataset.k], true); $q.blur(); } }
    if(e.key==="Escape"){ $q.value=""; open=null; render(); }
  });
  btns.forEach(b => b.addEventListener("click", () => { setType(b.dataset.t); open=null; render(); }));

  $list.addEventListener("click", e => {
    const go = e.target.closest("[data-go]");
    if(go){ e.preventDefault(); show(R[go.dataset.go], true); return; }
    const more = e.target.closest(".bb-more");
    if(more){ const x=more.nextElementSibling, on=x.hidden; x.hidden=!on; more.setAttribute("aria-expanded", String(on)); more.querySelector("i").textContent = on ? "−" : "+"; return; }
    const arw = e.target.closest("[data-shot]");
    if(arw){ shot += +arw.dataset.shot; rerenderPhoto(); return; }
    if(e.target.closest(".bb-up")){ startUpload(); return; }
    const tb = e.target.closest("[data-talk]");
    if(tb){ talkState = talkState===tb.dataset.talk ? null : tb.dataset.talk; rerenderTalk();
      const t = $list.querySelector(".bb-item.open .bb-panel .bb-in[name=" + (store.get("bb-name") ? "message" : "name") + "]"); if(t) t.focus({preventScroll:false}); return; }
    const name = e.target.closest(".bb-name");
    if(name){ const r=R[name.parentElement.dataset.k]; show(open===r ? null : r, false); }
  });

  $list.addEventListener("submit", e => { const f = e.target.closest(".bb-form"); if(f){ e.preventDefault(); submit(f); } });

  const fromHash = () => { const r = R.find(x => x.id === decodeURIComponent(location.hash.slice(1))); if(r) show(r, true); };
  $q.value = "";   // don't keep a query the browser restored on reload
  render(); fromHash();
  window.addEventListener("hashchange", fromHash);
})();
