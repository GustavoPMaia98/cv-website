(function () {
  "use strict";

  // ============================================================
  //  CONFIG
  // ============================================================
  const ORCID_ID = "0000-0001-5314-8816";
  const ORCID_WORKS_URL = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
  const CROSSREF_URL = "https://api.crossref.org/works/";
  const CONTACT_MAILTO = "gustavopinho.maia@mnhn.fr"; // Crossref polite pool only

  // Peer-reviewed papers only — presentations, preprints, datasets, etc. excluded.
  // Add "review" / "book-chapter" here to include those too.
  const ORCID_ALLOWED_TYPES = ["journal-article"];
  const CROSSREF_ALLOWED_TYPES = ["journal-article"];

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ============================================================
  //  ANIMATED STARFIELD (canvas, GPU-light, drifts left -> right)
  // ============================================================
  function initStarfield() {
    const canvas = document.getElementById("starfield");
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = 0, h = 0, dpr = 1, stars = [], shooting = [], raf = null, last = 0;

    const rand = (a, b) => a + Math.random() * (b - a);

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      // Density scaled to area, capped (lower on phones for performance).
      let count = Math.round((w * h) / 9000);
      count = Math.max(40, Math.min(count, w < 600 ? 90 : 220));
      const layers = [
        { speed: 3,  size: [0.4, 0.9], alpha: [0.25, 0.5] },
        { speed: 7,  size: [0.6, 1.3], alpha: [0.40, 0.75] },
        { speed: 13, size: [0.9, 1.8], alpha: [0.60, 1.0] }
      ];
      stars = [];
      for (let i = 0; i < count; i++) {
        const l = layers[i % layers.length];
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: rand(l.size[0], l.size[1]),
          a: rand(l.alpha[0], l.alpha[1]),
          tw: Math.random() * Math.PI * 2,
          tws: rand(0.6, 1.8),
          sp: l.speed * rand(0.8, 1.2)
        });
      }
    }

    function drawStars(animate, dt) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#dbeafe";
      for (const s of stars) {
        if (animate) {
          s.x += s.sp * dt;
          if (s.x > w + 2) s.x = -2; // continuous left -> right drift
          s.tw += s.tws * dt;
        }
        const tw = animate ? (0.75 + 0.25 * Math.sin(s.tw)) : 1;
        ctx.globalAlpha = s.a * tw;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawShooting(dt) {
      if (Math.random() < 0.0016 && shooting.length < 2) {
        shooting.push({ x: rand(0, w * 0.5), y: rand(0, h * 0.4), len: rand(80, 160), sp: rand(420, 640), life: 0 });
      }
      for (let i = shooting.length - 1; i >= 0; i--) {
        const sh = shooting[i];
        sh.life += dt;
        sh.x += sh.sp * dt * 0.9;
        sh.y += sh.sp * dt * 0.5;
        const grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.len, sh.y - sh.len * 0.55);
        grad.addColorStop(0, "rgba(255,255,255,0.9)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = Math.max(0, 1 - sh.life / 1.1);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x - sh.len, sh.y - sh.len * 0.55);
        ctx.stroke();
        if (sh.life > 1.1 || sh.x > w + 200) shooting.splice(i, 1);
      }
      ctx.globalAlpha = 1;
    }

    function frame(t) {
      const dt = Math.min((t - last) / 1000, 0.05) || 0;
      last = t;
      drawStars(true, dt);
      drawShooting(dt);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (!raf && !prefersReduced) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }
    function stop() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    }

    let resizeT;
    window.addEventListener("resize", () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => { size(); if (prefersReduced) drawStars(false, 0); }, 150);
    }, { passive: true });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop(); else start();
    });

    size();
    if (prefersReduced) drawStars(false, 0); else start();
  }

  // ============================================================
  //  REVEAL ON SCROLL
  // ============================================================
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  function observeReveals(root) {
    (root || document).querySelectorAll(".timeline-item, .reveal").forEach(el => {
      if (!el.__revObserved) { el.__revObserved = true; revealObserver.observe(el); }
    });
  }

  // ============================================================
  //  NAV: mobile toggle + scrollspy
  // ============================================================
  function initNav() {
    const toggle = document.getElementById("navToggle");
    const links = document.getElementById("navLinks");

    if (toggle && links) {
      toggle.addEventListener("click", () => {
        const open = links.classList.toggle("open");
        toggle.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      });
      links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
        links.classList.remove("open");
        toggle.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }));
    }

    const navMap = {};
    document.querySelectorAll('.nav-links a[href^="#"]').forEach(a => {
      navMap[a.getAttribute("href").slice(1)] = a;
    });
    const sections = Object.keys(navMap).map(id => document.getElementById(id)).filter(Boolean);
    if (!sections.length) return;

    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          Object.values(navMap).forEach(a => a.classList.remove("active"));
          const a = navMap[e.target.id];
          if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(s => spy.observe(s));
  }

  // ============================================================
  //  ACCORDIONS (accessible: keyboard + ARIA + chevron)
  // ============================================================
  let expandCounter = 0;
  function wireAccordions() {
    document.querySelectorAll(".timeline-item").forEach(item => {
      if (item.__wired) return;
      item.__wired = true;

      const expand = item.querySelector(".timeline-expand");
      const card = item.querySelector(".timeline-card");
      if (!expand || !card) return;

      item.classList.add("has-expand");
      if (!expand.id) expand.id = "exp-" + (++expandCounter);
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-expanded", "false");
      card.setAttribute("aria-controls", expand.id);

      const toggle = () => {
        const isOpen = expand.classList.contains("open");
        // close others
        document.querySelectorAll(".timeline-expand.open").forEach(el => {
          if (el !== expand) {
            el.classList.remove("open");
            const it = el.closest(".timeline-item");
            if (it) {
              it.classList.remove("open");
              const c = it.querySelector(".timeline-card");
              if (c) c.setAttribute("aria-expanded", "false");
            }
          }
        });
        expand.classList.toggle("open", !isOpen);
        item.classList.toggle("open", !isOpen);
        card.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      };

      card.addEventListener("click", e => {
        const t = e.target.tagName.toLowerCase();
        if (["a", "button", "input", "textarea"].includes(t)) return;
        toggle();
      });
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
      expand.addEventListener("click", e => e.stopPropagation());
    });
  }

  // ============================================================
  //  SCROLL-TO-TOP BUTTON ("Slides up")
  // ============================================================
  function setupScrollTopButton() {
    if (document.getElementById("scrollTopBtn")) return;
    const btn = document.createElement("button");
    btn.id = "scrollTopBtn";
    btn.type = "button";
    btn.className = "scroll-top-btn";
    btn.setAttribute("aria-label", "Scroll back to top");
    btn.innerHTML = '<span>Slides up</span><span aria-hidden="true">&uarr;</span>';
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" }));
    document.body.appendChild(btn);

    const toggle = () => {
      if (window.scrollY > 300) btn.classList.add("show");
      else btn.classList.remove("show");
    };
    window.addEventListener("scroll", toggle, { passive: true });
    toggle();
  }

  // ============================================================
  //  PUBLICATIONS — auto-sync from ORCID (journal articles only)
  // ============================================================
  let publicationsLoaded = false;

  async function loadPublications() {
    if (publicationsLoaded) return;
    publicationsLoaded = true;

    const container = document.getElementById("pub-list");
    if (!container) return;

    const seenDois = new Set();
    document.querySelectorAll('.timeline-item.publication a[href*="doi.org/"]').forEach(a => {
      const m = a.getAttribute("href").match(/doi\.org\/(.+)$/i);
      if (m) seenDois.add(decodeURIComponent(m[1]).trim().toLowerCase());
    });

    let works = [];
    try {
      works = await fetchOrcidWorks();
    } catch (err) {
      console.warn("ORCID fetch failed, trying Crossref fallback:", err);
      try { works = await fetchCrossrefByOrcid(); }
      catch (err2) { console.warn("Could not load publications automatically:", err2); return; }
    }

    works.sort((a, b) => (b.year || 0) - (a.year || 0));

    for (const wk of works) {
      const key = wk.doi ? wk.doi.toLowerCase() : null;
      if (key && seenDois.has(key)) continue;

      const meta = wk.doi ? await fetchCrossref(wk.doi) : null;
      const pub = {
        title:    (meta && meta.title)    || wk.title    || "Untitled",
        authors:  (meta && meta.authors)  || wk.authors  || "",
        year:     (meta && meta.year)     || wk.year     || "",
        journal:  (meta && meta.journal)  || wk.journal  || "",
        abstract: (meta && meta.abstract) || "",
        doi:      wk.doi || (meta && meta.doi) || ""
      };
      if (key) seenDois.add(key);
      renderPublication(container, pub);
    }

    observeReveals(container);
    wireAccordions();
  }

  async function fetchOrcidWorks() {
    const res = await fetch(ORCID_WORKS_URL, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("ORCID request failed: " + res.status);
    const data = await res.json();

    const works = [];
    (data.group || []).forEach(group => {
      const summaries = group["work-summary"] || [];
      if (!summaries.length) return;
      const s = summaries[0];

      const type = (s.type || "").toLowerCase();
      if (!ORCID_ALLOWED_TYPES.includes(type)) return; // peer-reviewed papers only

      const ids =
        (group["external-ids"] && group["external-ids"]["external-id"]) ||
        (s["external-ids"] && s["external-ids"]["external-id"]) || [];
      let doi = null;
      ids.forEach(id => {
        if (!doi && (id["external-id-type"] || "").toLowerCase() === "doi") {
          doi = (id["external-id-value"] || "").trim();
        }
      });

      const title = s.title && s.title.title && s.title.title.value;
      const journal = s["journal-title"] && s["journal-title"].value;
      const yearVal = s["publication-date"] && s["publication-date"].year && s["publication-date"].year.value;

      works.push({ doi, title, journal, authors: "", year: yearVal ? parseInt(yearVal, 10) : 0 });
    });
    return works;
  }

  async function fetchCrossrefByOrcid() {
    const url = `${CROSSREF_URL.replace(/\/$/, "")}?filter=orcid:${ORCID_ID}&rows=200&mailto=${encodeURIComponent(CONTACT_MAILTO)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Crossref ORCID request failed: " + res.status);
    const json = await res.json();
    const items = (json.message && json.message.items) || [];
    return items.map(parseCrossrefItem).filter(w => CROSSREF_ALLOWED_TYPES.includes(w.type));
  }

  async function fetchCrossref(doi) {
    if (!doi) return null;
    try {
      const url = CROSSREF_URL + encodeURIComponent(doi) + "?mailto=" + encodeURIComponent(CONTACT_MAILTO);
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return null;
      const json = await res.json();
      return parseCrossrefItem(json.message || {});
    } catch (e) { return null; }
  }

  function parseCrossrefItem(m) {
    const title = Array.isArray(m.title) ? m.title[0] : (m.title || "");
    const journal = Array.isArray(m["container-title"]) ? m["container-title"][0] : (m["container-title"] || "");
    const dateParts =
      (m.issued && m.issued["date-parts"] && m.issued["date-parts"][0]) ||
      (m["published-print"] && m["published-print"]["date-parts"] && m["published-print"]["date-parts"][0]) ||
      (m["published-online"] && m["published-online"]["date-parts"] && m["published-online"]["date-parts"][0]) || [];
    const year = dateParts[0] || "";
    const authors = (m.author || [])
      .map(a => [a.given, a.family].filter(Boolean).join(" "))
      .filter(Boolean).join(", ");
    const abstract = m.abstract ? stripJats(m.abstract) : "";
    return { title, journal, year, authors, abstract, doi: m.DOI || "", type: (m.type || "").toLowerCase() };
  }

  function stripJats(s) {
    return String(s)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^\s*abstract[:\s]*/i, "")
      .trim();
  }

  function renderPublication(container, pub) {
    const metaParts = [pub.authors, pub.year, pub.journal].filter(Boolean).join(" · ");
    const doiUrl = pub.doi ? "https://doi.org/" + encodeURI(pub.doi) : "";
    const item = document.createElement("div");
    item.className = "timeline-item publication";
    item.innerHTML =
      '<div class="timeline-card">' +
        '<div class="timeline-header"><div>' +
          '<strong>' + escapeHtml(pub.title) + '</strong>' +
          '<div class="meta">' + escapeHtml(metaParts) + '</div>' +
        '</div></div>' +
        '<p><em>Click to view abstract</em></p>' +
      '</div>' +
      '<div class="timeline-expand"><div class="expand-body">' +
        (pub.abstract
          ? '<p>' + escapeHtml(pub.abstract) + '</p>'
          : '<p><em>Abstract not available — open the paper via the DOI link below.</em></p>') +
        (doiUrl
          ? '<p><a href="' + doiUrl + '" target="_blank" rel="noopener noreferrer"><strong>DOI: ' + escapeHtml(pub.doi) + '</strong></a></p>'
          : '') +
      '</div></div>';
    container.appendChild(item);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ============================================================
  //  INIT
  // ============================================================
  function init() {
    initStarfield();
    initNav();
    observeReveals(document);
    wireAccordions();
    setupScrollTopButton();
    if (document.getElementById("pub-list")) loadPublications();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
