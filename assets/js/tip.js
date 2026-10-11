/* Tip Jar (tip.html, Chef Oct 2026): the guest types a euro amount, TIP asks netlify/functions/tip.mjs for a Stripe
   Checkout page set to that amount and goes there. Stripe sends them back to /tip?thanks=1.
   Until Chef adds the Stripe key in Netlify the function answers 503 — then TIP opens the existing Stripe payment
   link instead (the guest types the amount again there), so the page never dead-ends. */
(function(){
  "use strict";
  const FALLBACK = "https://buy.stripe.com/6oU5kE3PF3lef8t0TE9sk0t";
  const MIN = 1, MAX = 500;
  const form = document.getElementById("tip-form"), input = document.getElementById("tip-amount"),
        sayEl = form.querySelector(".tip-say"), btn = form.querySelector(".tip-go"), thanks = document.getElementById("tip-thanks");

  if (/[?&]thanks\b/.test(location.search)) { form.hidden = true; thanks.hidden = false; return; }

  const clr = form.querySelector(".tip-clr"), drop = document.querySelector(".tip-drop");
  // keep it to a money amount: digits and one decimal separator, 2 decimals
  input.addEventListener("input", () => {
    let v = input.value.replace(/[^\d.,]/g, "").replace(",", ".");
    const i = v.indexOf("."); if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "").slice(0, 2);
    input.value = v; say(""); fit();
  });
  // the input is as wide as what's in it; the little × (clear) shows only while there is something to clear
  function fit(){ input.style.width = Math.max(1, (input.value || input.placeholder).length) * .6 + .1 + "em"; clr.hidden = !input.value; }
  fit();
  clr.addEventListener("click", () => { input.value = ""; fit(); say(""); input.focus(); });
  if (matchMedia("(hover: hover)").matches) input.focus({ preventScroll: true });

  // coin sound (Mixkit "gold coin prize", free licence) — loaded up front so it plays the instant TIP is pressed
  const coin = new Audio("assets/audio/tip-coin.mp3"); coin.preload = "auto";

  // ---- "into the can": the widget shrinks, turns a little clockwise and drops into the can in the photo, vanishing
  //      behind the front of its rim. Rim = an ellipse measured on the photo (p-bg-tip-mobile2.jpg, 933×1400 px):
  //      opening centre (452, 905), radii 193 × 75 → front edge at y 980. Mapped to the page the same way style.css lays
  //      the photo out (phone: 764 px tall, centred; desktop: the -desktop4.jpg canvas, cover, photo 1350 px tall at y 150). ----
  const RIM = { cx: 452, cy: 905, rx: 193, ry: 75 };
  function rimOnPage(){
    const page = document.querySelector(".tip-page"), vw = page.clientWidth;
    let k, left, top;
    if (matchMedia("(min-width: 900px)").matches) {
      // matches style.css: canvas 115.78% of the screen height, raised 11.67%, cover-centred (Chef's Paper crop)
      const vh = window.innerHeight, ch = vh * 1.1578, ct = -vh * 0.1167;
      const s = Math.max(vw / 2400, ch / 1500), f = 1350 / 1400;
      k = s * f; left = (vw - 2400 * s) / 2 + 750 * s; top = ct + (ch - 1500 * s) / 2 + 150 * s;
    } else {
      k = 764 / 1400; left = -24 + (vw + 48 - 933 * k) / 2; top = 0;
    }
    // + wherever the tilt parallax has nudged the photo (phone)
    const cs = getComputedStyle(page), mx = parseFloat(cs.getPropertyValue("--mx")) || 0, my = parseFloat(cs.getPropertyValue("--my")) || 0;
    return { x: left + RIM.cx * k + mx, y: top + RIM.cy * k + my, rx: RIM.rx * k, ry: RIM.ry * k };
  }
  async function dropIntoCan(){
    const r = rimOnPage(), page = document.querySelector(".tip-page"), vw = page.clientWidth;
    const b = form.getBoundingClientRect(), pb = page.getBoundingClientRect();
    const cx = b.left - pb.left + b.width / 2, cy = b.top - pb.top + b.height / 2;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches)
      return form.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }).finished;
    // 1) lift a touch, then shrink and turn clockwise while gliding to just above the can's opening
    const dx = r.x - cx, up = r.y - 34 - cy;
    await form.animate([
      { transform: "none" },
      { transform: "translate(0, -8px) scale(.95) rotate(2deg)", offset: .25 },
      { transform: `translate(${dx}px, ${up}px) scale(.3) rotate(10deg)` }
    ], { duration: 560, easing: "cubic-bezier(.4,0,.3,1)", fill: "forwards" }).finished;
    // 2) drop in: from here on everything below the front of the rim is hidden, so it slips behind it
    // (the clip is in .tip-drop's own coordinates, which the tilt parallax may have shifted by --fx/--fy)
    const cs = getComputedStyle(page), fx = parseFloat(cs.getPropertyValue("--fx")) || 0, fy = parseFloat(cs.getPropertyValue("--fy")) || 0;
    const ox = r.x - fx, oy = r.y - fy;
    const pts = [`-50px -50px`, `${vw + 50}px -50px`, `${vw + 50}px ${oy}px`];
    for (let a = 0; a <= 180; a += 10) { const t = a * Math.PI / 180; pts.push(`${ox + r.rx * Math.cos(t)}px ${oy + r.ry * Math.sin(t)}px`); }
    pts.push(`-50px ${oy}px`);
    drop.style.clipPath = `polygon(${pts.join(",")})`;
    form.getAnimations().forEach(a => a.commitStyles && a.commitStyles());
    return form.animate([
      { transform: `translate(${dx}px, ${up}px) scale(.3) rotate(10deg)` },
      { transform: `translate(${dx}px, ${r.y + r.ry + 40 - cy}px) scale(.18) rotate(16deg)` }
    ], { duration: 380, easing: "cubic-bezier(.55,0,1,.45)", fill: "forwards" }).finished;
  }
  function undoDrop(){ form.getAnimations().forEach(a => a.cancel()); form.style.transform = ""; drop.style.clipPath = ""; }

  const say = (t, err) => { sayEl.textContent = t; sayEl.classList.toggle("err", !!err); };
  form.addEventListener("submit", e => {
    e.preventDefault();
    const amount = Math.round(parseFloat(input.value || input.placeholder) * 100) / 100;
    if (!(amount >= MIN)) { say(`Please enter at least €${MIN}.`, true); input.focus(); return; }
    if (amount > MAX) { say(`The most we can take here is €${MAX}.`, true); input.focus(); return; }
    btn.disabled = true; say("");
    input.blur();
    try { coin.currentTime = 0; coin.play().catch(() => {}); } catch (e) {}
    const anim = dropIntoCan().catch(() => {});
    const go = fetch("/.netlify/functions/tip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }) })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (ok && d.url) return d.url;
        if (d && d.error === "not-configured") return FALLBACK;
        throw 0;
      });
    // leave for Stripe once the tip is in the can (and the sound has had a moment)
    Promise.all([go, anim, new Promise(r => setTimeout(r, 1300))])
      .then(([url]) => { location.href = url; })
      .catch(() => { undoDrop(); btn.disabled = false; say("Something went wrong — please try again.", true); });
  });
  addEventListener("pageshow", e => { if (e.persisted) { undoDrop(); btn.disabled = false; say(""); } });   // back from Stripe
})();

/* Phone tilt parallax (Chef, Oct 2026): like the Menu page — only on touch phones that give tilt WITHOUT a permission
   prompt (so never iPhone), and not on desktop. The photo moves against the tilt, the widget + comment card a little
   with it, so they float over the table. Eased every frame; stops while the tip drops into the can. */
(function(){
  "use strict";
  const page = document.querySelector(".tip-page"), card = document.querySelector(".cc-tab");
  if (!page || matchMedia("(min-width: 900px)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (matchMedia("(hover: hover) and (pointer: fine)").matches || !window.DeviceOrientationEvent) return;
  if (typeof DeviceOrientationEvent.requestPermission === "function") return;   // would need a permission prompt → no tilt
  const R = 16, F = 7;   // max shift (px): background, foreground
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0, g0 = null, b0 = null;
  const set = (el, a, b, vx, vy) => { el.style.setProperty(a, vx.toFixed(2) + "px"); el.style.setProperty(b, vy.toFixed(2) + "px"); };
  const tick = () => {
    x += (tx - x) * .08; y += (ty - y) * .08;
    const frozen = document.querySelector(".tip-drop") && document.querySelector(".tip-drop").style.clipPath;
    set(page, "--mx", "--my", -x * R, -y * R);
    if (!frozen) { set(page, "--fx", "--fy", x * F, y * F); }
    raf = Math.abs(tx - x) + Math.abs(ty - y) > .002 ? requestAnimationFrame(tick) : 0;
  };
  addEventListener("deviceorientation", e => {
    if (e.gamma == null) return;
    if (g0 === null) { g0 = e.gamma; b0 = e.beta; }   // how they're holding it = centre
    tx = Math.max(-1, Math.min(1, (e.gamma - g0) / 20)); ty = Math.max(-1, Math.min(1, (e.beta - b0) / 20));
    if (!raf) raf = requestAnimationFrame(tick);
  });
})();

/* Comment card: the paper tab at the bottom corner opens a card over the page (Esc / × / tap outside closes it).
   SEND CARD posts to netlify/functions/comment.mjs → Coda "Comment Cards". Works on the thank-you screen too. */
(function(){
  "use strict";
  const tab = document.querySelector(".cc-tab"), card = document.getElementById("cc"), dim = document.querySelector(".cc-dim");
  if (!tab || !card) return;
  const hint = card.querySelector(".cc-hint"), send = card.querySelector(".cc-send"), msg = card.elements.message;
  const addBtn = card.querySelector(".cc-add"), fileIn = card.querySelector(".cc-file"), thumbs = card.querySelector(".cc-thumbs");
  const picHint = card.querySelector(".cc-pic-hint"), picSend = card.querySelector(".cc-pic-send"), picDone = card.querySelector(".cc-pic-done");
  const say2 = (t, err) => { picHint.textContent = t; picHint.classList.toggle("err", !!err); };
  const MAXP = 4, PHOTO_BYTES = 800 * 1024;
  let back = null, shots = [];   // { type, data(base64), url }

  // ---- photos ("send us a pic"): shrink in the browser to a JPEG ≤ 800 KB, long side ≤ 1400 px (same decoding
  //      fallbacks as the Meet Me board: <img>, then createImageBitmap, then the raw bytes re-wrapped) ----
  const viaImg = blob => new Promise((ok, no) => {
    const url = URL.createObjectURL(blob), im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); ok({ src: im, w: im.naturalWidth, h: im.naturalHeight }); };
    im.onerror = () => { URL.revokeObjectURL(url); no(new Error("decode")); };
    im.src = url;
  });
  const viaBitmap = async blob => {
    if (!window.createImageBitmap) throw new Error("decode");
    const probe = await createImageBitmap(blob, { imageOrientation: "from-image", resizeWidth: 64, resizeQuality: "low" });
    const ratio = probe.height / probe.width; probe.close && probe.close();
    const w = ratio > 1 ? Math.round(1400 / ratio) : 1400;
    const bm = await createImageBitmap(blob, { imageOrientation: "from-image", resizeWidth: w, resizeHeight: Math.round(w * ratio), resizeQuality: "high" });
    return { src: bm, w: bm.width, h: bm.height };
  };
  const decode = async file => {
    try { return await viaImg(file); } catch (e) {}
    try { return await viaBitmap(file); } catch (e) {}
    let buf; try { buf = await file.arrayBuffer(); } catch (e) { throw new Error("unreadable"); }
    const b = new Uint8Array(buf.slice(0, 16));
    if (/^ftyp(heic|heix|hevc|mif1|msf1|heim|heis)/.test(String.fromCharCode(...b.slice(4, 12)))) throw new Error("heic");
    const blob = new Blob([buf], { type: b[0] === 0xFF && b[1] === 0xD8 ? "image/jpeg" : (file.type || "image/jpeg") });
    try { return await viaImg(blob); } catch (e) {}
    try { return await viaBitmap(blob); } catch (e) {}
    throw new Error("decode");
  };
  const shrink = async file => {
    const im = await decode(file);
    for (const [side, q] of [[1400, .8], [1200, .72], [1000, .66], [800, .6]]) {
      const k = Math.min(1, side / Math.max(im.w, im.h)), c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(im.w * k)); c.height = Math.max(1, Math.round(im.h * k));
      c.getContext("2d").drawImage(im.src, 0, 0, c.width, c.height);
      const blob = await new Promise(r => c.toBlob(r, "image/jpeg", q));
      if (blob && blob.size <= PHOTO_BYTES) {
        im.src.close && im.src.close();
        const data = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); });
        return { type: "image/jpeg", data, url: URL.createObjectURL(blob) };
      }
    }
    throw new Error("big");
  };
  const PHOTO_ERR = { heic: "That photo is in HEIC format. Please save it as a JPEG and try again.",
    unreadable: "That photo isn't on this device yet. Please download it first.", big: "That photo is too big.", decode: "We couldn't read that image." };
  const drawThumbs = () => {
    thumbs.innerHTML = shots.map((s, i) => `<li><img src="${s.url}" alt="Photo ${i + 1}"><button type="button" data-i="${i}" aria-label="Remove photo ${i + 1}">×</button></li>`).join("");
    addBtn.hidden = shots.length >= MAXP;
    picSend.hidden = !shots.length;   // SEND PICS appears once there's a photo
    if (shots.length) picDone.hidden = true;
  };
  addBtn.addEventListener("click", () => fileIn.click());
  thumbs.addEventListener("click", e => { const b = e.target.closest("button[data-i]"); if (!b) return;
    const [gone] = shots.splice(+b.dataset.i, 1); URL.revokeObjectURL(gone.url); drawThumbs(); });
  fileIn.addEventListener("change", async () => {
    const files = [...fileIn.files].slice(0, MAXP - shots.length); fileIn.value = "";
    if (!files.length) return;
    say2("Adding photo…"); addBtn.disabled = true;
    let err = "";
    for (const f of files) { try { shots.push(await shrink(f)); drawThumbs(); } catch (e) { err = PHOTO_ERR[e.message] || PHOTO_ERR.decode; } }
    addBtn.disabled = false; say2(err, !!err);
  });
  const open = () => { back = document.activeElement; card.hidden = dim.hidden = false; document.body.classList.add("cc-on");
    requestAnimationFrame(() => card.classList.add("in")); setTimeout(() => msg.focus({ preventScroll: true }), 250); };
  const close = () => { card.classList.remove("in"); document.body.classList.remove("cc-on");
    setTimeout(() => { card.hidden = dim.hidden = true; if (card.classList.contains("sent")) reset(); }, 300); if (back) back.focus({ preventScroll: true }); };
  const clearPics = () => { shots.forEach(s => URL.revokeObjectURL(s.url)); shots = []; drawThumbs(); say2(""); picSend.disabled = false; };
  const reset = () => { clearPics(); picDone.hidden = true; card.querySelector(".cc-ask").hidden = true; card.reset(); card.classList.remove("sent"); card.querySelector(".cc-done").hidden = true; send.disabled = false; send.textContent = "Send card"; hint.textContent = ""; };
  tab.addEventListener("click", open);
  card.querySelector(".cc-x").addEventListener("click", close);
  dim.addEventListener("click", close);
  addEventListener("keydown", e => { if (e.key !== "Escape" || card.hidden) return;
    const a = card.querySelector(".cc-ask"); if (!a.hidden) { a.hidden = true; return; } close(); });
  card.addEventListener("submit", e => {
    e.preventDefault();
    if (card.classList.contains("sent")) { close(); return; }
    const f = card.elements, message = msg.value.trim();
    if (message.length < 2) { hint.textContent = "Please write a few words first."; hint.classList.add("err"); msg.focus(); return; }
    if (f.email.value && !f.email.checkValidity()) { hint.textContent = "That email doesn't look right."; hint.classList.add("err"); f.email.focus(); return; }
    hint.classList.remove("err"); hint.textContent = "Sending…"; send.disabled = true;
    fetch("/.netlify/functions/comment", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, rating: +(f.rating.value || 0), name: f.name.value, email: f.email.value, website: f.website.value,
      }) })
      .then(r => { if (!r.ok) throw r.status; })
      .then(() => { card.classList.add("sent"); card.querySelector(".cc-done").hidden = false; hint.textContent = ""; send.disabled = false; send.textContent = "Close"; })
      .catch(st => { send.disabled = false; hint.classList.add("err");
        hint.textContent = st === 429 ? "That's a lot of cards. Please try again in a few minutes." : "Something went wrong. Please try again."; });
  });

  // SEND PICS — photos on their own (Chef), with the card's name/email if they filled them in. Pressing it pops up a
  // multiple choice: OK to use them for content, or just for our eyes; picking one sends.
  const ask = card.querySelector(".cc-ask");
  picSend.addEventListener("click", () => {
    if (!shots.length) return;
    const f = card.elements;
    if (f.email.value && !f.email.checkValidity()) { say2("The email on the card doesn't look right.", true); return; }
    say2(""); ask.hidden = false; ask.querySelector("button").focus();
  });
  ask.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b && e.target !== ask) return;
    ask.hidden = true;
    if (!b || !b.dataset.use) { picSend.focus(); return; }          // "not yet" / tap outside
    const f = card.elements;
    say2("Sending your pics…"); picSend.disabled = true;
    fetch("/.netlify/functions/comment", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "", rating: 0, name: f.name.value, email: f.email.value, website: f.website.value,
        photos: shots.map(s => ({ type: s.type, data: s.data })), photoUse: b.dataset.use }) })
      .then(r => { if (!r.ok) throw r.status; })
      .then(() => { clearPics(); picDone.hidden = false; })
      .catch(st => { picSend.disabled = false;
        say2(st === 429 ? "That's a lot at once. Please try again in a few minutes." : st === 413 ? "Those photos are too big to send together. Try fewer." : "Something went wrong. Please try again.", true); });
  });
})();
