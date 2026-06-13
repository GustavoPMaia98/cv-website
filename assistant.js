/* =====================================================================
   assistant.js — floating AI chat widget for the site.

   Tier 1 (your relay):  if ASSISTANT_ENDPOINT is set, POSTs to your Vercel
                         relay, which calls Claude with the CV profile.
                         This is the only RELIABLE AI tier — deploy api/chat.js
                         and set ASSISTANT_ENDPOINT below for a stable assistant.
   Tier 2 (free online): a keyless public AI (Pollinations) given the same CV
                         profile. Best-effort only — free anonymous access is
                         frequently rate-limited/blocked, so treat any answer
                         from here as a bonus, not a guarantee.
   Tier 3 (offline):     if every network attempt fails, answers locally from
                         the knowledge base. The chat ALWAYS works.

   Previous behaviour fell straight to Tier 3 on every message (because Tier 1
   was unset and Tier 2 was failing), which flipped the widget to the "offline"
   state on every question. This version: guards URL length, retries once,
   never permanently latches offline, keeps the conversation on minimise, and
   degrades quietly instead of looking broken.
   ===================================================================== */
(function () {
  "use strict";

  // 1) RECOMMENDED: set this to your own Vercel relay (Claude) for a reliable
  //    assistant. Leave "" to use the free best-effort online tier below.
  //    e.g. "https://your-app.vercel.app/api/chat"
  const ASSISTANT_ENDPOINT = "";

  // 2) Free, keyless online AI (no account, no API key). Best-effort only.
  //    Set ONLINE_AI = false to skip it and answer straight from the CV.
  const ONLINE_AI = true;
  const ONLINE_AI_GET = "https://text.pollinations.ai/";            // simple GET (no CORS preflight)
  const ONLINE_AI_ENDPOINT = "https://text.pollinations.ai/openai"; // OpenAI-compatible POST fallback
  const ONLINE_AI_MODEL = "openai";   // set to "searchgpt" to enable live web search

  // Keep GET URLs comfortably under common server/proxy limits (~2 KB). If the
  // built URL would exceed this, we skip GET and use the POST path instead of
  // emitting a request that returns 414 and silently drops us offline.
  const MAX_GET_URL = 1900;

  const DATA = window.ASSISTANT_DATA || {
    offlineAnswer: function () { return "Knowledge base failed to load."; },
    GREETING: "Hi! Ask me about Gustavo's work."
  };

  const history = [];          // {role:"user"|"assistant", content:"..."} for the AI tier
  let pending = false;
  let lastTierUsed = "online";  // "online" | "offline" — drives the status dot
  let offlineNoticeShown = false;
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

  const onlineConfigured = !!ASSISTANT_ENDPOINT || ONLINE_AI;
  setMode(onlineConfigured ? "online" : "offline");

  function setMode(m) {
    lastTierUsed = m;
    if (m === "offline") {
      modeEl.textContent = "answering from CV & site";
      dot.classList.add("off");
    } else {
      modeEl.textContent = "research & CV assistant";
      dot.classList.remove("off");
    }
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

  // ---------- Open / close / minimise ----------
  function open(auto) {
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    root.classList.add("open");
    greet();
    if (!auto) setTimeout(() => input.focus(), 60);
  }
  // Minimise: collapse to the bubble but KEEP the conversation (per the docs).
  function minimise() {
    panel.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    root.classList.remove("open");
    fab.focus();
  }
  // Close: collapse AND clear, so reopening starts fresh.
  function close() {
    minimise();
    history.length = 0;
    log.innerHTML = "";
    greeted = false;
    offlineNoticeShown = false;
    suggest.style.display = "";
  }
  fab.addEventListener("click", () => (panel.hidden ? open() : minimise()));
  closeBtn.addEventListener("click", close);
  minBtn.addEventListener("click", minimise);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) minimise(); });

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

    // Tier 1: your relay (reliable, if configured).
    if (ASSISTANT_ENDPOINT && canTryOnline) {
      answer = await askAI(q).catch(() => null);
      if (answer != null) fromOnline = true;
    }
    // Tier 2: free public AI (best-effort). We retry every message — a previous
    // transient failure must NOT permanently drop us to offline.
    if (answer == null && ONLINE_AI && canTryOnline) {
      answer = await askOnlineAI().catch(() => null);
      if (answer != null) fromOnline = true;
    }
    // Tier 3: offline knowledge base (always available).
    if (answer == null) answer = DATA.offlineAnswer(q);

    setMode(fromOnline ? "online" : "offline");

    // Keep the thinking animation visible for a natural beat.
    const elapsed = Date.now() - started;
    if (elapsed < think) await sleep(think - elapsed);

    t.remove();
    add("assistant", answer);
    history.push({ role: "assistant", content: answer });

    // One quiet note the first time we fall back, so visitors understand the
    // answer came from the CV rather than wondering why it looks different.
    if (!fromOnline && !offlineNoticeShown) {
      offlineNoticeShown = true;
      add("assistant", "(Answering directly from Gustavo's CV right now. For anything not covered, email gustavopinho.maia@mnhn.fr.)");
    }

    if (history.length > 16) history.splice(0, history.length - 16); // keep context small
    pending = false;
    input.focus();
  }

  // ---------- Tier 1: your relay (calls your Vercel function) ----------
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

  // ---------- Tier 2: free online tier (grounded in the CV) ----------
  function buildSystem(maxLen) {
    const profile = DATA.PROFILE || "";
    const instructions =
      "You are the assistant on the personal academic website of Gustavo Pinho Maia. " +
      "Help visitors navigate the site and answer questions about Gustavo and his CV — research, " +
      "publications, presentations, funding, education, experience, tutoring, and how to contact or " +
      "collaborate with him — using the PROFILE below as your source of truth. " +
      "You MAY also explain general concepts in his scientific fields (astrobiology, mechanochemistry, " +
      "prebiotic chemistry, the origin of life, meteoritics, and directly related chemistry), since they " +
      "give context to his work. " +
      "Stay strictly on-topic: if the user asks about a different person, an unrelated subject, current " +
      "events, or anything outside Gustavo, this website, or those scientific fields, do NOT answer it — " +
      "reply only: \"Sorry, I can only help with Gustavo Pinho Maia's work, this website, and his research " +
      "fields. For anything else, you can reach him at gustavopinho.maia@mnhn.fr.\" " +
      "(Translate that to Portuguese if the user wrote in Portuguese.) " +
      "Never invent specific facts about Gustavo that are not in the PROFILE. Be concise and warm, and " +
      "reply in the user's language (English or Portuguese).\n\nPROFILE:\n";
    return (instructions + profile).slice(0, maxLen || 3800);
  }

  // Primary: a simple GET (no JSON body → no CORS preflight). We guard the URL
  // length: an over-long URL returns 414 and used to drop us straight offline.
  async function onlineGet() {
    const convo = history.slice(-6)
      .map(m => (m.role === "user" ? "User: " : "Assistant: ") + m.content)
      .join("\n");
    const prompt = convo + "\nAssistant:";
    const referrer = (window.location && location.hostname) || "gpm-site";

    // Start with the full system prompt; if the URL is too long, shrink it.
    let sys = buildSystem(3800);
    let url = makeGetUrl(prompt, referrer, sys);
    if (url.length > MAX_GET_URL) { sys = buildSystem(1500); url = makeGetUrl(prompt, referrer, sys); }
    if (url.length > MAX_GET_URL) throw new Error("get-too-long"); // hand off to POST

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error("get " + res.status);
      const text = ((await res.text()) || "").trim();
      if (!text || /^\{?\s*"?error/i.test(text)) throw new Error("empty/err");
      return text;
    } finally { clearTimeout(timer); }
  }

  function makeGetUrl(prompt, referrer, sys) {
    return ONLINE_AI_GET + encodeURIComponent(prompt) +
      "?model=" + encodeURIComponent(ONLINE_AI_MODEL) +
      "&referrer=" + encodeURIComponent(referrer) +
      "&system=" + encodeURIComponent(sys);
  }

  // Fallback: OpenAI-compatible POST (used if the GET path is blocked/too long).
  async function onlinePost() {
    const sys = buildSystem(3800);
    const messages = [{ role: "system", content: sys }].concat(history.slice(-12));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      const res = await fetch(ONLINE_AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: ONLINE_AI_MODEL, messages: messages, temperature: 0.6, referrer: "gpm-site" }),
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error("post " + res.status);
      const ct = res.headers.get("content-type") || "";
      let text = "";
      if (ct.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (data && data.choices && data.choices[0]) {
          const c = data.choices[0];
          text = (c.message && c.message.content) || c.text || "";
        } else if (typeof data === "string") { text = data; }
        else if (data && typeof data.content === "string") { text = data.content; }
      } else {
        text = await res.text();
      }
      if (!text || !text.trim()) throw new Error("empty");
      return text.trim();
    } finally { clearTimeout(timer); }
  }

  // Try GET, then POST. One quiet retry on the whole sequence to ride out
  // momentary blips before we decide the network is unavailable.
  async function askOnlineAI() {
    for (let attempt = 0; attempt < 2; attempt++) {
      try { return await onlineGet(); }
      catch (e1) {
        try { return await onlinePost(); }
        catch (e2) {
          if (attempt === 0) { await sleep(500); continue; }
          throw e2;
        }
      }
    }
    return null;
  }

  // Open the chat by default when the site loads. Minimising (−) collapses it to
  // the bubble and keeps the conversation; closing (×) clears it.
  open(true);
})();
