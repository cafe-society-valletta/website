/* Meet Me at Society — message board (localStorage persisted) */
(function(){
  "use strict";

  const MSG_KEY = "cs_board_messages_v1";
  const SESSION_KEY = "cs_board_session_v1";

  const SEED = [
    { date:"16-01-26", time:"00:12", author:"Jake Page",   subject:"Photo safari at Hastings Garden Sunday B4 LSC who is interested??" },
    { date:"15-01-26", time:"16:36", author:"Ana Erzar",   subject:"Looking for flatmate for flat in Gzira- Available Immediately" },
    { date:"15-01-26", time:"10:35", author:"Alse Sera",   subject:"Open Decks this Sunday at Lost Souls Club" },
    { date:"13-01-26", time:"19:02", author:"Ilgen Akin",  subject:"***URGENT*** Need Fernet Branca urgently anyone have??" },
    { date:"12-01-26", time:"20:45", author:"John Barthet",subject:"STRETTA Frisbee Golf Course at White Rooks Grand Opening Day!" },
    { date:"11-01-26", time:"14:45", author:"Jake Page",   subject:"VINYL SWAP at Oyster Grotto 17/3 | Live music by Sam from 94" },
  ];

  function loadMessages(){
    try {
      const stored = JSON.parse(localStorage.getItem(MSG_KEY));
      if (stored && Array.isArray(stored) && stored.length) return stored;
    } catch(e){}
    localStorage.setItem(MSG_KEY, JSON.stringify(SEED));
    return SEED.slice();
  }
  function saveMessages(msgs){ localStorage.setItem(MSG_KEY, JSON.stringify(msgs)); }

  let messages = loadMessages();
  let lastAddedId = null;

  const list = document.getElementById("board-messages");

  function render(){
    list.innerHTML = messages.map(m => `
      <div class="board-msg${m._id === lastAddedId ? ' new-msg' : ''}">
        <div class="meta">
          <span>${m.date}</span>
          <span>${m.time}</span>
          <span>&lt;${m.author}&gt;</span>
        </div>
        <div class="subject">${m.subject}</div>
      </div>
    `).join("");
    lastAddedId = null;
  }

  /* ---------- session (stub login) ---------- */
  function getSession(){ try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch(e){ return null; } }
  function setSession(user){ localStorage.setItem(SESSION_KEY, JSON.stringify(user)); updateLoginButton(); }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); updateLoginButton(); }

  const loginBtn = document.getElementById("login-btn");
  const postBtn = document.getElementById("post-btn");

  function updateLoginButton(){
    loginBtn.textContent = getSession() ? "Log Out" : "User Login";
  }

  loginBtn.addEventListener("click", () => {
    const user = getSession();
    if (user){ clearSession(); CS.toast("Logged out."); return; }
    CS.openModal(document.getElementById("login-modal"));
  });

  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const msgEl = e.target.querySelector(".form-msg");
    if (!username){
      msgEl.textContent = "Enter a handle to continue.";
      msgEl.className = "form-msg show error";
      return;
    }
    setSession(username);
    msgEl.className = "form-msg";
    e.target.reset();
    CS.closeModal(document.getElementById("login-modal"));
    CS.toast(`Welcome, <${username}>`);
  });

  postBtn.addEventListener("click", () => {
    const user = getSession();
    const authorField = document.getElementById("post-author");
    if (user){ authorField.value = user; authorField.readOnly = true; }
    else { authorField.value = ""; authorField.readOnly = false; }
    CS.openModal(document.getElementById("post-modal"));
  });

  document.getElementById("post-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const author = document.getElementById("post-author").value.trim();
    const subject = document.getElementById("post-subject").value.trim();
    const msgEl = e.target.querySelector(".form-msg");
    if (!author || !subject){
      msgEl.textContent = "Fill in a name and a subject line.";
      msgEl.className = "form-msg show error";
      return;
    }
    const now = new Date();
    const pad = n => String(n).padStart(2,"0");
    const entry = {
      _id: Date.now(),
      date: `${pad(now.getDate())}-${pad(now.getMonth()+1)}-${String(now.getFullYear()).slice(2)}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      author, subject
    };
    messages.unshift(entry);
    saveMessages(messages);
    lastAddedId = entry._id;
    render();
    msgEl.className = "form-msg";
    e.target.reset();
    CS.closeModal(document.getElementById("post-modal"));
    CS.toast("Message posted to the board ✓");
  });

  updateLoginButton();
  render();

})();
