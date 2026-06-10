/* =====================================================================
   search.js — lightweight, dependency-free site search.
   Indexes the text already rendered on the page (sections + individual
   cards/items), matches the query, and lets the user jump straight to the
   relevant place. Rebuilds the index each time it opens, so dynamically
   loaded content (e.g. ORCID publications) is always included.
   ===================================================================== */
(function () {
  "use strict";

  const overlay = document.getElementById("searchOverlay");
  const input = document.getElementById("searchInput");
  const results = document.getElementById("searchResults");
  const hint = document.getElementById("searchHint");
  const toggle = document.getElementById("searchToggle");
  const closeBtn = document.getElementById("searchClose");
  if (!overlay || !input || !results || !toggle) return;

  // Friendly labels for the section badges
  const LABELS = {
    about: "About", news: "News", education: "Education", experience: "Experience",
    presentations: "Presentations", funding: "Funding", publications: "Publications",
    tree: "Academic tree", map: "Map", tutoring: "Tutoring"
  };
  const labelFor = id => LABELS[id] || (id ? id.charAt(0).toUpperCase() + id.slice(1) : "Section");

  let index = [];   // { id, label, title, text, el }
  let current = []; // current result entries (for keyboard nav)
  let active = -1;

  const norm = s => (s || "").replace(/\s+/g, " ").trim();
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

  function buildIndex() {
    index = [];
    const main = document.getElementById("mainContent");
    if (!main) return;
    const sections = main.querySelectorAll("section[id]");
    sections.forEach(sec => {
      const id = sec.id;
      const label = labelFor(id);
      const headingEl = sec.querySelector("h1, h2");
      const heading = headingEl ? norm(headingEl.textContent) : label;

      // One entry for the section itself (so a section is always findable)
      index.push({ id, label, title: heading, text: norm(sec.textContent).toLowerCase(), el: sec });

      // Granular entries for individual items inside the section
      const items = sec.querySelectorAll(".timeline-item, .news-list li, .at-node");
      items.forEach(item => {
        const titleEl = item.querySelector("strong, h3, .at-name, .blog-title");
        const title = norm(titleEl ? titleEl.textContent : item.textContent);
        const text = norm(item.textContent);
        if (text.length < 3) return;
        index.push({ id, label, title: clip(title, 90), text: text.toLowerCase(), el: item, raw: text });
      });
    });
  }

  function score(entry, terms) {
    let s = 0;
    const title = entry.title.toLowerCase();
    for (const t of terms) {
      if (!t) continue;
      if (title.indexOf(t) !== -1) s += 5;
      let from = 0, hit;
      while ((hit = entry.text.indexOf(t, from)) !== -1) { s += 1; from = hit + t.length; if (s > 60) break; }
    }
    return s;
  }

  function snippet(entry, terms) {
    const src = entry.raw || entry.text;
    const low = src.toLowerCase();
    let pos = -1;
    for (const t of terms) { const i = low.indexOf(t); if (i !== -1 && (pos === -1 || i < pos)) pos = i; }
    if (pos === -1) return clip(src, 110);
    const start = Math.max(0, pos - 40);
    return (start > 0 ? "…" : "") + clip(src.slice(start), 130);
  }

  function run(q) {
    const query = q.trim().toLowerCase();
    results.innerHTML = "";
    active = -1;
    if (query.length < 2) {
      current = [];
      hint.textContent = "Type to search across the site — research, publications, experience, and more.";
      hint.style.display = "";
      return;
    }
    const terms = query.split(/\s+/).filter(Boolean);
    const seen = new Set();
    current = index
      .map(e => ({ e, s: score(e, terms) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .filter(x => { const k = x.e.label + "|" + x.e.title; if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 10)
      .map(x => x.e);

    if (!current.length) {
      hint.textContent = "No matches found. Try another word.";
      hint.style.display = "";
      return;
    }
    hint.style.display = "none";
    current.forEach((e, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-result";
      btn.dataset.idx = i;
      btn.innerHTML =
        '<span class="sr-badge">' + e.label + '</span>' +
        '<span class="sr-body"><span class="sr-title"></span><span class="sr-snip"></span></span>';
      btn.querySelector(".sr-title").textContent = e.title;
      btn.querySelector(".sr-snip").textContent = snippet(e, terms);
      btn.addEventListener("click", () => go(e));
      li.appendChild(btn);
      results.appendChild(li);
    });
  }

  function go(entry) {
    close();
    const el = entry.el;
    // If the result is (or sits inside) a collapsible timeline item, open it so the
    // hidden abstract, equipment and photos are revealed when we land on it.
    const item = el.classList && el.classList.contains("timeline-item")
      ? el
      : (el.closest ? el.closest(".timeline-item") : null);
    const target = item || el;
    if (item) {
      if (window.SiteApp && typeof window.SiteApp.openItem === "function") {
        window.SiteApp.openItem(item);
      } else {
        const expand = item.querySelector(".timeline-expand");
        const card = item.querySelector(".timeline-card");
        if (expand && card) {
          expand.classList.add("open");
          item.classList.add("open");
          card.setAttribute("aria-expanded", "true");
        }
      }
    }
    setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("search-hit");
      setTimeout(() => target.classList.remove("search-hit"), 1800);
    }, 80);
  }

  function open() {
    buildIndex();
    overlay.hidden = false;
    document.body.classList.add("search-open");
    input.value = "";
    run("");
    setTimeout(() => input.focus(), 40);
  }
  function close() {
    overlay.hidden = true;
    document.body.classList.remove("search-open");
    results.innerHTML = "";
    toggle.focus();
  }

  function setActive(n) {
    const btns = results.querySelectorAll(".search-result");
    if (!btns.length) return;
    active = (n + btns.length) % btns.length;
    btns.forEach((b, i) => b.classList.toggle("active", i === active));
    btns[active].scrollIntoView({ block: "nearest" });
  }

  // Events
  toggle.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  input.addEventListener("input", () => run(input.value));
  overlay.addEventListener("mousedown", e => { if (e.target === overlay) close(); });

  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (current.length) go(current[active === -1 ? 0 : active]);
    }
  });

  // Global shortcuts: "/" or Ctrl/Cmd+K to open, Esc to close
  document.addEventListener("keydown", e => {
    if (!overlay.hidden && e.key === "Escape") { e.preventDefault(); close(); return; }
    const typing = /^(input|textarea|select)$/i.test((e.target.tagName || "")) || e.target.isContentEditable;
    if (overlay.hidden && !typing && e.key === "/") { e.preventDefault(); open(); }
    if (overlay.hidden && (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); open(); }
  });
})();
