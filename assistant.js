/* =====================================================================
   assistant.js — floating AI chat widget for the site.
   Tier 1 (your relay):  if ASSISTANT_ENDPOINT is set, POSTs to your Vercel
                         relay, which calls Claude with the CV profile.
   Tier 2 (free online): a keyless, no-signup public AI endpoint
                         (Pollinations) given the same CV profile as context.
                         Works with no backend and no API key.
   Tier 3 (offline):     if the network fails, answers locally from the
                         knowledge base. The chat always works.
   ===================================================================== */
(function () {
  "use strict";

  // 1) OPTIONAL: set this to your own Vercel relay (Claude) if you deploy one.
  //    Leave "" to use the free online tier below instead.
  const ASSISTANT_ENDPOINT = "";

  // 2) Free, keyless online AI (no account, no API key). Set ONLINE_AI = false
  //    to disable it and run offline-only from the knowledge base.
  const ONLINE_AI = true;
  const ONLINE_AI_ENDPOINT = "https://text.pollinations.ai/openai";
  const ONLINE_AI_MODEL = "openai";

  const DATA = window.ASSISTANT_DATA || {
    offlineAnswer: function () { return "Knowledge base failed to load."; },
    GREETING: "Hi! Ask me about Gustavo's work."
  };

  const history = [];          // {role:"user"|"assistant", content:"..."} for the AI tier
  let usedOffline = false;     // becomes true once we fall back, so we stop retrying the API
  let pending = false;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ---------- Build DOM ----------
  const root = document.createElement("div");
  root.className = "ai-widget";
  root.innerHTML = `
    <button class="ai-fab" id="aiFab" type="button" aria-label="Open chat assistant" aria-expanded="false" aria-controls="aiPanel">
      <svg class="ai-fab-ico" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.9-5.4A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z"/>
      </svg>
    </button>

    <section class="ai-panel" id="aiPanel" role="dialog" aria-modal="false" aria-label="Chat assistant" hidden>
      <header class="ai-head">
        <div class="ai-head-title">
          <span class="ai-status-dot" id="aiDot" aria-hidden="true"></span>
          <div>
            <strong>Ask about Gustavo's work</strong>
            <span class="ai-mode" id="aiMode">research &amp; CV assistant</span>
          </div>
        </div>
        <button class="ai-min" id="aiMin" type="button" aria-label="Minimise chat" title="Minimise">&minus;</button>
        <button class="ai-x" id="aiClose" type="button" aria-label="Close chat" title="Close">&times;</button>
      </header>

      <div class="ai-log" id="aiLog" aria-live="polite"></div>

      <div class="ai-suggest" id="aiSuggest">
        <button type="button" data-q="What is Gustavo's research about?">His research</button>
        <button type="button" data-q="List his publications.">Publications</button>
        <button type="button" data-q="What did he do at NASA?">NASA work</button>
        <button type="button" data-q="How can I contact him?">Contact</button>
      </div>

      <form class="ai-input" id="aiForm">
        <input id="aiText" type="text" autocomplete="off" placeholder="Ask a question…" aria-label="Type your question">
        <button type="submit" id="aiSend" aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
      </form>
      <p class="ai-disclaimer">AI assistant — may be imperfect. Verify important details via the linked profiles.</p>
    </section>
  `;
  document.body.appendChild(root);

  const fab = root.querySelector("#aiFab");
  const panel = root.querySelector("#aiPanel");
  const closeBtn = root.querySelector("#aiClose");
  const minBtn = root.querySelector("#aiMin");
  const log = root.querySelector("#aiLog");
  const form = root.querySelector("#aiForm");
  const input = root.querySelector("#aiText");
  const modeEl = root.querySelector("#aiMode");
  const dot = root.querySelector("#aiDot");
  const suggest = root.querySelector("#aiSuggest");

  const onlineAvailable = !!ASSISTANT_ENDPOINT || ONLINE_AI;
  setMode(onlineAvailable ? "online" : "offline");

  function setMode(m) {
    if (m === "offline") { modeEl.textContent = "offline · from CV & site"; dot.classList.add("off"); }
    else { modeEl.textContent = "research & CV assistant"; dot.classList.remove("off"); }
  }

  // ---------- Messages ----------
  function add(role, text) {
    const row = document.createElement("div");
    row.className = "ai-msg ai-" + role;
    const bubble = document.createElement("div");
    bubble.className = "ai-bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return bubble;
  }
  function typing() {
    const row = document.createElement("div");
    row.className = "ai-msg ai-assistant ai-typing";
    row.innerHTML = '<div class="ai-bubble"><span class="ai-dots"><i></i><i></i><i></i></span></div>';
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }

  let greeted = false;
  function greet() {
    if (greeted) return;
    greeted = true;
    add("assistant", DATA.GREETING);
  }

  // ---------- Open / close ----------
  function open(auto) {
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    root.classList.add("open");
    greet();
    if (!auto) setTimeout(() => input.focus(), 60);
  }
  function close() {
    panel.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    root.classList.remove("open");
    // Clear the conversation so reopening always starts fresh.
    history.length = 0;
    log.innerHTML = "";
    greeted = false;
    suggest.style.display = "";
    fab.focus();
  }
  fab.addEventListener("click", () => (panel.hidden ? open() : close()));
  closeBtn.addEventListener("click", close);
  minBtn.addEventListener("click", close);   // minimise = collapse to bubble, conversation kept
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) close(); });

  // ---------- Send ----------
  suggest.addEventListener("click", e => {
    const b = e.target.closest("button[data-q]");
    if (b) { input.value = b.getAttribute("data-q"); send(); }
  });
  form.addEventListener("submit", e => { e.preventDefault(); send(); });

  async function send() {
    const q = input.value.trim();
    if (!q || pending) return;
    input.value = "";
    suggest.style.display = "none";
    add("user", q);
    history.push({ role: "user", content: q });

    pending = true;
    const t = typing();
    const started = Date.now();
    const think = 1500 + Math.random() * 1000; // 1.5–2.5s of visible "thinking"

    let answer = null, fromOnline = false;
    const canTryOnline = navigator.onLine !== false;

    if (ASSISTANT_ENDPOINT && canTryOnline) {
      answer = await askAI(q).catch(() => null);
      if (answer != null) fromOnline = true;
    }
    if (answer == null && ONLINE_AI && canTryOnline) {
      answer = await askOnlineAI().catch(() => null);
      if (answer != null) fromOnline = true;
    }
    if (answer == null) answer = DATA.offlineAnswer(q);
    setMode(fromOnline ? "online" : "offline");

    // Keep the thinking animation visible for a natural beat, even if the answer was instant
    const elapsed = Date.now() - started;
    if (elapsed < think) await sleep(think - elapsed);

    t.remove();
    add("assistant", answer);
    history.push({ role: "assistant", content: answer });
    if (history.length > 16) history.splice(0, history.length - 16); // keep context small
    pending = false;
    input.focus();
  }

  // ---------- Real AI tier (calls your Vercel relay) ----------
  async function askAI(q) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(ASSISTANT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-12) }),
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error("relay " + res.status);
      const data = await res.json();
      const text = (data && (data.reply || data.text || data.content)) || "";
      if (!text.trim()) throw new Error("empty");
      return text.trim();
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------- Free online tier (keyless public AI, grounded in the CV) ----------
  function buildSystem() {
    const profile = DATA.PROFILE || "";
    return (
      "You are the friendly AI assistant on Gustavo Pinho Maia's academic website. " +
      "Use ONLY the profile below as your source of truth and never invent specific facts about Gustavo. " +
      "You may add light, accurate context about his fields (mechanochemistry, prebiotic chemistry, astrobiology, origin of life). " +
      "If a detail isn't in the profile, or the question is unrelated to Gustavo or his field, say you can't help with that and point to his contact email (gustavopinho.maia@mnhn.fr). " +
      "Be concise and warm, and reply in the same language the user writes in (English or Portuguese).\n\nPROFILE:\n" +
      profile
    );
  }

  async function askOnlineAI() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const messages = [{ role: "system", content: buildSystem() }].concat(history.slice(-12));
      const res = await fetch(ONLINE_AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ONLINE_AI_MODEL,
          messages: messages,
          temperature: 0.6,
          referrer: "gpm-site"
        }),
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error("online " + res.status);
      const ct = res.headers.get("content-type") || "";
      let text = "";
      if (ct.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (data && data.choices && data.choices[0]) {
          const c = data.choices[0];
          text = (c.message && c.message.content) || c.text || "";
        } else if (typeof data === "string") {
          text = data;
        } else if (data && typeof data.content === "string") {
          text = data.content;
        }
      } else {
        text = await res.text();
      }
      if (!text || !text.trim()) throw new Error("empty");
      return text.trim();
    } finally {
      clearTimeout(timer);
    }
  }

  // Open the chat by default when the site loads. Minimising (−) collapses it to
  // the bubble and clears the conversation; reopening starts fresh.
  open(true);
})();
