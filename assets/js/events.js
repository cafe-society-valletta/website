/* =========================================================
   EVENT CALENDAR — month grids (Monday first) from today's month
   onwards; each event is a thumbnail on its day. Tapping a thumbnail
   opens a detail row under that week (one open at a time).

   To add an event, add an entry to EVENTS below:
     { date:"2026-10-24", title:"77 Cellar", time:"22:00 – late",
       text:"Line-up, genre, entry…", poster:"assets/img/….jpg", link:"https://…" }
   Weekly events go in WEEKLY (day: 0 = Sunday … 6 = Saturday).
   ========================================================= */
(function(){
  "use strict";

  const EVENTS = [];

  const WEEKLY = [
    { day:0, title:"Lost Souls Club", time:"Every Sunday",
      text:"Our flagship Sunday night — fully staff-run and operated, with the profits split between the staff who volunteered. Hospitality and nightlife people, expat and local, all welcome.",
      poster:"assets/img/p-ls-script.png", posterFit:"contain", link:"lostsouls.html" }
  ];

  const MONTHS_AHEAD = 3;
  const cal = document.getElementById("calendar");
  if (!cal) return;

  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const pad = n => String(n).padStart(2,"0");
  const key = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = new Date(); today.setHours(0,0,0,0);

  function eventsOn(d){
    const list = EVENTS.filter(e => e.date === key(d));
    WEEKLY.forEach(w => { if (w.day === d.getDay()) list.push(w); });
    return list;
  }

  function el(tag, cls, html){ const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  let openPanel = null, openCell = null;
  function closePanel(){
    if (openPanel) openPanel.remove();
    if (openCell) openCell.classList.remove("sel");
    openPanel = openCell = null;
  }

  function panelFor(ev, d, cell, weekRow){
    closePanel();
    const p = el("div","ev-panel");
    const when = `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0,3)}${ev.time ? " · " + ev.time : ""}`;
    p.innerHTML = `
      <div class="top"><span class="when"></span>
        <button class="x" type="button" aria-label="Close"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1 L13 13 M13 1 L1 13" fill="none" stroke="#FFFFFF" stroke-width="1.5"/></svg></button></div>
      <div class="row"><div class="poster"></div>
        <div class="info"><h3></h3><p></p></div></div>`;
    p.querySelector(".when").textContent = when;
    p.querySelector("h3").textContent = ev.title;
    p.querySelector("p").textContent = ev.text || "";
    const poster = p.querySelector(".poster");
    if (ev.poster){ poster.style.backgroundImage = `url('${ev.poster}')`; if (ev.posterFit === "contain"){ poster.style.backgroundSize = "88% auto"; poster.style.backgroundColor = "#0A0A0A"; poster.style.border = "1px solid rgba(255,255,255,.3)"; } }
    if (ev.link){
      const a = el("a","more","More info →"); a.href = ev.link;
      if (/^https?:/.test(ev.link)){ a.target = "_blank"; a.rel = "noopener"; }
      p.querySelector(".info").appendChild(a);
    }
    p.querySelector(".x").addEventListener("click", closePanel);
    weekRow.after(p);
    cell.classList.add("sel");
    openPanel = p; openCell = cell;
  }

  const months = [];
  // in the last week of a month, start the calendar at next month
  const daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
  const offset = daysLeft < 7 ? 1 : 0;
  for (let i = offset; i < MONTHS_AHEAD + offset; i++){
    const first = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const box = el("section","month");
    box.setAttribute("aria-label", `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`);
    const head = el("div","m-head");
    const prev = el("button", null, "←"); prev.type = "button"; prev.setAttribute("aria-label","Previous month");
    const next = el("button", null, "→"); next.type = "button"; next.setAttribute("aria-label","Next month");
    const h2 = el("h2", null); h2.textContent = `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`;
    head.append(prev, h2, next);
    box.appendChild(head);
    const days = el("div","m-days");
    ["MON","TUE","WED","THU","FRI","SAT","SUN"].forEach(n => days.appendChild(el("span", null, n)));
    box.appendChild(days);

    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7)); // back to Monday
    const d = new Date(start);
    do {
      const row = el("div","week");
      for (let c = 0; c < 7; c++){
        const cell = el("div","day");
        const date = new Date(d);
        if (date.getMonth() !== first.getMonth()) cell.classList.add("out");
        if (+date === +today) cell.classList.add("today");
        cell.appendChild(el("span","n", String(date.getDate())));
        if (date.getMonth() === first.getMonth() && date >= today){
          const evs = eventsOn(date);
          if (evs.length){
            const ev = evs[0];
            const t = el("button","thumb"); t.type = "button";
            t.setAttribute("aria-label", `${ev.title}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`);
            if (ev.poster) t.style.backgroundImage = `url('${ev.poster}')`;
            if (ev.posterFit === "contain"){ t.style.backgroundSize = "90% auto"; t.style.backgroundColor = "#0A0A0A"; }
            t.addEventListener("click", () => {
              if (openCell === cell) closePanel(); else panelFor(ev, date, cell, row);
            });
            cell.appendChild(t);
          }
        }
        row.appendChild(cell);
        d.setDate(d.getDate() + 1);
      }
      box.appendChild(row);
    } while (d.getMonth() === first.getMonth());
    months.push({ box, prev, next });
    cal.appendChild(box);
  }
  months.forEach((m, i) => {
    m.prev.disabled = i === 0;
    m.next.disabled = i === months.length - 1;
    m.prev.addEventListener("click", () => months[i-1] && months[i-1].box.scrollIntoView({ behavior:"smooth", block:"start" }));
    m.next.addEventListener("click", () => months[i+1] && months[i+1].box.scrollIntoView({ behavior:"smooth", block:"start" }));
  });
})();
