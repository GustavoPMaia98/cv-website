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

  // Guards so init() can be safely re-run after dynamic sections load.
  let starfieldWired = false;
  let navToggleWired = false;
  let scrollspyWired = false;
  let rippleWired = false;
  let lightboxWired = false;
  let progressWired = false;
  let langWired = false;
  let mapWired = false;
  let mapLangUpdate = null;   // set once the map legend exists; called by applyLang
  let currentLang = (function(){ try { return localStorage.getItem("lang") || "en"; } catch(e){ return "en"; } })();

  // ============================================================
  //  ANIMATED STARFIELD (canvas, GPU-light, drifts left -> right)
  // ============================================================
  function initStarfield() {
    if (starfieldWired) return;
    const canvas = document.getElementById("starfield");
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    starfieldWired = true;

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

    function palette() {
      const light = document.documentElement.getAttribute("data-theme") === "light";
      return light ? { star: "#475569", trail: "51,65,85" } : { star: "#dbeafe", trail: "255,255,255" };
    }

    function drawStars(animate, dt) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = palette().star;
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
        const trail = palette().trail;
        const grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.len, sh.y - sh.len * 0.55);
        grad.addColorStop(0, "rgba(" + trail + ",0.9)");
        grad.addColorStop(1, "rgba(" + trail + ",0)");
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

    if (toggle && links && !navToggleWired) {
      navToggleWired = true;
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

    // Scrollspy: only set up once, and only when the target sections exist
    // (they are injected asynchronously, so this may run on a later call).
    if (scrollspyWired) return;
    const navMap = {};
    document.querySelectorAll('.nav-links a[href^="#"]').forEach(a => {
      navMap[a.getAttribute("href").slice(1)] = a;
    });
    const sections = Object.keys(navMap).map(id => document.getElementById(id)).filter(Boolean);
    if (!sections.length) return;
    scrollspyWired = true;

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
  //  AUTO-CLOSE OPENED ACCORDIONS WHEN SCROLLED OUT OF VIEW
  //  In Education & Experience, once an item is opened, if its revealed
  //  panel scrolls fully out of the viewport it collapses automatically.
  // ============================================================
  const AUTO_CLOSE_SECTIONS = "#education, #experience";
  const exitObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting && e.target.classList.contains("open")) {
        const it = e.target.closest(".timeline-item");
        if (it) closeTimelineItem(it);
      }
    });
  }, { threshold: 0 });

  function openTimelineItem(item) {
    if (!item) return;
    const expand = item.querySelector(".timeline-expand");
    const card = item.querySelector(".timeline-card");
    if (!expand || !card) return;
    expand.classList.add("open");
    item.classList.add("open");
    card.setAttribute("aria-expanded", "true");
    // Begin watching only after the open transition, so the panel has real
    // height (observing a 0-height element would fire an immediate close).
    if (item.closest(AUTO_CLOSE_SECTIONS)) {
      setTimeout(() => {
        if (expand.classList.contains("open")) exitObserver.observe(expand);
      }, 420);
    }
  }

  function closeTimelineItem(item) {
    if (!item) return;
    const expand = item.querySelector(".timeline-expand");
    const card = item.querySelector(".timeline-card");
    if (expand) { expand.classList.remove("open"); exitObserver.unobserve(expand); }
    item.classList.remove("open");
    if (card) card.setAttribute("aria-expanded", "false");
  }

  // ============================================================
  //  ACCORDIONS (accessible: keyboard + ARIA + chevron)
  // ============================================================
  let expandCounter = 0;
  function wireAccordions() {
    document.querySelectorAll(".timeline-item").forEach(item => {
      if (item.__wired) return;
      if (item.closest(".is-maintenance")) return;   // leave maintenance posts inert
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
        // close any other open items (and stop watching them)
        document.querySelectorAll(".timeline-item.open").forEach(it => {
          if (it !== item) closeTimelineItem(it);
        });
        if (isOpen) closeTimelineItem(item);
        else openTimelineItem(item);
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
    const status = document.getElementById("pub-status");
    const setStatus = (msg) => { if (status) status.textContent = msg; };
    const clearStatus = () => { if (status) status.remove(); };

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
      catch (err2) {
        console.warn("Could not load publications automatically:", err2);
        setStatus("Live sync unavailable right now — the publications listed above are current.");
        return;
      }
    }

    works.sort((a, b) => (b.year || 0) - (a.year || 0));

    let added = 0;
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
      added++;
    }

    clearStatus();
    observeReveals(container);
    wireAccordions();
    buildPublicationFilter();
    updateMetrics();
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
  //  BUTTON RIPPLE (progressive enhancement, pointer feedback)
  // ============================================================
  function setupButtonRipple() {
    if (rippleWired || prefersReduced) return;
    rippleWired = true;
    document.addEventListener("click", e => {
      const btn = e.target.closest(".btn, .cta-pill, .scroll-top-btn");
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const dia = Math.max(rect.width, rect.height);
      const span = document.createElement("span");
      span.className = "btn-ripple";
      span.style.width = span.style.height = dia + "px";
      span.style.left = (e.clientX - rect.left - dia / 2) + "px";
      span.style.top = (e.clientY - rect.top - dia / 2) + "px";
      btn.appendChild(span);
      span.addEventListener("animationend", () => span.remove());
    });
  }

  // ============================================================
  //  LIGHTBOX — click any photo to view the full, uncropped image
  // ============================================================
  function setupLightbox() {
    if (lightboxWired) return;
    lightboxWired = true;

    let overlay, imgEl, capEl, closeBtn, lastFocus;

    function build() {
      overlay = document.createElement("div");
      overlay.className = "lightbox";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-hidden", "true");
      overlay.setAttribute("aria-label", "Image viewer");
      overlay.innerHTML =
        '<button type="button" class="lightbox-close" aria-label="Close image">&times;</button>' +
        '<figure class="lightbox-fig"><img alt=""><figcaption></figcaption></figure>';
      document.body.appendChild(overlay);
      imgEl = overlay.querySelector("img");
      capEl = overlay.querySelector("figcaption");
      closeBtn = overlay.querySelector(".lightbox-close");

      overlay.addEventListener("click", e => {
        if (e.target === overlay || e.target.closest(".lightbox-close")) close();
      });
    }

    function open(src, alt) {
      if (!overlay) build();
      lastFocus = document.activeElement;
      imgEl.src = src;
      imgEl.alt = alt || "";
      const caption = (alt || "").trim();
      capEl.textContent = caption;
      capEl.style.display = caption ? "" : "none";
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      if (!overlay) return;
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    // Capture phase so it fires even though accordions stop click propagation.
    document.addEventListener("click", e => {
      const img = e.target.closest(".expand-gallery img, .avatar-img");
      if (!img || !img.getAttribute("src")) return;
      e.preventDefault();
      e.stopPropagation();
      open(img.currentSrc || img.src, img.alt);
    }, true);

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && overlay && overlay.classList.contains("open")) close();
    });
  }

  // ============================================================
  //  INIT
  // ============================================================
  // ============================================================
  //  v2 FEATURES
  // ============================================================
  const I18N = {
    nav_news:{en:"News",pt:"Novidades"}, nav_education:{en:"Education",pt:"Educação"},
    nav_experience:{en:"Experience",pt:"Experiência"}, nav_presentations:{en:"Presentations",pt:"Apresentações"},
    nav_funding:{en:"Funding",pt:"Financiamento"}, nav_publications:{en:"Publications",pt:"Publicações"},
    nav_tree:{en:"Tree",pt:"Árvore"}, nav_map:{en:"Map",pt:"Mapa"}, nav_tutoring:{en:"Tutoring",pt:"Explicações"},
    role:{en:"PhD Researcher in Chemistry · Astrobiology",pt:"Investigador de Doutoramento em Química · Astrobiologia"},
    bio:{en:"Research on mechanochemical and shock-driven synthesis of organic molecules relevant to prebiotic chemistry and the origin of life.",
         pt:"Investigação em síntese mecanoquímica e por impacto de moléculas orgânicas relevantes para a química prebiótica e a origem da vida."},
    tag1:{en:"Mechanochemistry",pt:"Mecanoquímica"}, tag2:{en:"Prebiotic Chemistry",pt:"Química Prebiótica"},
    tag3:{en:"Astrobiology",pt:"Astrobiologia"}, tag4:{en:"Origin of Life",pt:"Origem da Vida"},
    m_pubs:{en:"Publications",pt:"Publicações"}, m_talks:{en:"Talks & posters",pt:"Comunicações"},
    m_areas:{en:"Research areas",pt:"Áreas de investigação"}, m_hindex:{en:"h-index",pt:"índice h"}, cv:{en:"Download CV",pt:"Descarregar CV"}
  };
  const HEADINGS = {
    "Education":"Educação", "Experience":"Experiência", "Presentations":"Apresentações",
    "Funding":"Financiamento", "Publications":"Publicações", "Academic Tree":"Árvore Académica",
    "News":"Novidades", "Where I have been":"Por onde andei"
  };

  // Section heading icons (Lucide)
  function injectHeadingIcons() {
    const ICONS = { news:"newspaper", education:"graduation-cap", experience:"briefcase",
      presentations:"presentation", funding:"banknote", publications:"book-open",
      tree:"git-fork", map:"map-pin", tutoring:"flask-conical" };
    document.querySelectorAll(".section > h2").forEach(h => {
      if (h.querySelector(".h2-label")) return;
      const sec = h.closest("section"); const id = sec ? sec.id : "";
      const txt = h.textContent.trim();
      h.textContent = "";
      if (ICONS[id]) {
        const i = document.createElement("i");
        i.className = "h2-ico"; i.setAttribute("data-lucide", ICONS[id]);
        h.appendChild(i);
      }
      const span = document.createElement("span");
      span.className = "h2-label"; span.textContent = txt;
      h.appendChild(span);
    });
    if (window.lucide) try { lucide.createIcons(); } catch(e){}
  }

  // Language
  function applyLang() {
    const lang = currentLang;
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const t = I18N[el.getAttribute("data-i18n")];
      if (t && t[lang]) el.textContent = t[lang];
    });
    document.querySelectorAll(".h2-label").forEach(s => {
      if (!s.dataset.en) s.dataset.en = s.textContent.trim();
      s.textContent = (lang === "pt" && HEADINGS[s.dataset.en]) ? HEADINGS[s.dataset.en] : s.dataset.en;
    });
    document.querySelectorAll("[data-pt]").forEach(el => {
      if (el.dataset.enHtml === undefined) el.dataset.enHtml = el.innerHTML;
      el.innerHTML = (lang === "pt") ? el.dataset.pt : el.dataset.enHtml;
    });
    const lb = document.getElementById("langToggle");
    if (lb) lb.textContent = lang === "en" ? "PT" : "EN";
    document.documentElement.setAttribute("lang", lang);
    if (typeof mapLangUpdate === "function") mapLangUpdate(lang);
  }
  function setupLangToggle() {
    const btn = document.getElementById("langToggle");
    if (btn && !langWired) {
      langWired = true;
      btn.addEventListener("click", () => {
        currentLang = currentLang === "en" ? "pt" : "en";
        try { localStorage.setItem("lang", currentLang); } catch(e){}
        applyLang();
      });
    }
    applyLang();
  }

  // Theme
  function setupThemeToggle() {
    const btn = document.getElementById("themeToggle");
    if (!btn || btn.__wired) return;
    btn.__wired = true;
    const setIcon = () => {
      const dark = document.documentElement.getAttribute("data-theme") !== "light";
      btn.innerHTML = '<i data-lucide="' + (dark ? "sun" : "moon") + '"></i>';
      if (window.lucide) try { lucide.createIcons(); } catch(e){}
    };
    setIcon();
    btn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch(e){}
      setIcon();
    });
  }

  // Scroll progress
  function setupScrollProgress() {
    if (progressWired) return;
    const bar = document.getElementById("scrollProgress");
    if (!bar) return;
    progressWired = true;
    const upd = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      bar.style.width = max > 0 ? (h.scrollTop / max * 100) + "%" : "0%";
    };
    window.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    upd();
  }

  // Publication year filter + metrics
  function buildPublicationFilter() {
    const wrap = document.getElementById("pub-filter");
    if (!wrap) return;
    const pubs = Array.prototype.slice.call(document.querySelectorAll("#publications .timeline-item.publication"));
    if (!pubs.length) return;
    const years = new Set();
    pubs.forEach(p => {
      const meta = p.querySelector(".meta");
      const y = ((meta && meta.textContent) || "").match(/\b(?:19|20)\d{2}\b/);
      if (y) { p.dataset.year = y[0]; years.add(y[0]); }
    });
    const sorted = Array.prototype.slice.call(years).sort((a, b) => b - a);
    wrap.innerHTML = "";
    const mk = (label, val) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label; b.dataset.val = val;
      b.addEventListener("click", () => {
        wrap.querySelectorAll("button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        pubs.forEach(p => p.classList.toggle("pub-hidden", val !== "all" && p.dataset.year !== val));
      });
      return b;
    };
    const all = mk(currentLang === "pt" ? "Todos" : "All", "all");
    all.classList.add("active");
    wrap.appendChild(all);
    sorted.forEach(y => wrap.appendChild(mk(y, y)));
  }

  // Presentation type filter (All / Oral / Poster) — mirrors the publication filter,
  // reusing the .pub-filter styling and the .pub-hidden show/hide mechanism.
  function buildPresentationFilter() {
    const wrap = document.getElementById("preso-filter");
    if (!wrap) return;
    const items = Array.prototype.slice.call(
      document.querySelectorAll("#presentations .timeline-item[data-type]")
    );
    if (!items.length) return;

    const types = [];
    items.forEach(it => { const t = it.dataset.type; if (t && types.indexOf(t) === -1) types.push(t); });

    const LABELS = {
      all:    { en: "All",    pt: "Todos" },
      oral:   { en: "Oral",   pt: "Oral" },
      poster: { en: "Poster", pt: "Póster" }
    };
    const label = key => (LABELS[key] && (LABELS[key][currentLang] || LABELS[key].en)) || key;

    wrap.innerHTML = "";
    const mk = key => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label(key); b.dataset.val = key;
      b.addEventListener("click", () => {
        wrap.querySelectorAll("button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        items.forEach(it => it.classList.toggle("pub-hidden", key !== "all" && it.dataset.type !== key));
      });
      return b;
    };
    const all = mk("all"); all.classList.add("active"); wrap.appendChild(all);
    types.forEach(t => wrap.appendChild(mk(t)));
  }

  // A publication entry counts as a PREPRINT — and is excluded from the headline
  // "Publications" number, though it still appears in the list — when it is
  // explicitly marked (class "preprint" or data-type="preprint") OR its venue /
  // DOI matches a known preprint server.
  function isPreprintItem(it) {
    if (it.classList.contains("preprint")) return true;
    if ((it.dataset.type || "").toLowerCase() === "preprint") return true;
    const meta = (it.querySelector(".meta") || {}).textContent || "";
    const title = (it.querySelector("strong") || {}).textContent || "";
    const doiA = it.querySelector('a[href*="doi.org/"]');
    const doi = doiA ? (doiA.getAttribute("href") || "") : "";
    const hay = (meta + " " + title + " " + doi).toLowerCase();
    if (/pre-?print|posted-content|arxiv|chemrxiv|biorxiv|medrxiv|ssrn|research\s*square|preprints?\.org|authorea|eartharxiv|essoar|\bosf\b/.test(hay)) return true;
    // Known preprint DOI registrant prefixes (ChemRxiv, Research Square, bioRxiv/
    // medRxiv, EarthArXiv, OSF, Authorea, Preprints.org)
    if (/10\.(26434|21203|1101|31223|31219|22541|20944)\//.test(doi)) return true;
    return false;
  }

  function updateMetrics() {
    const el = document.querySelector('[data-metric="pubs"]');
    if (!el) return;
    let n = 0;
    document.querySelectorAll("#publications .timeline-item.publication").forEach(it => {
      if (!isPreprintItem(it)) n++;   // preprints shown in the list but not counted
    });
    if (n) el.textContent = n;
  }

  // Presentation map (Leaflet)
  function initPresoMap() {
    if (mapWired) return;
    const el = document.getElementById("presoMap");
    if (!el || !window.L) return;
    mapWired = true;

    const EDU  = "#34d399";  // studies / education
    const LAB  = "#22d3ee";  // laboratories / research
    const PRES = "#fbbf24";  // oral / poster presentations

    const education = [
      { n:"Instituto Superior Técnico, Lisbon", c:[38.7369,-9.1366], d:"MSc in Chemistry (2020–2022) · PhD in Chemistry / Astrobiology (2023–present)" },
      { n:"Universidade da Beira Interior, Covilhã", c:[40.2784,-7.5046], d:"BSc in Industrial Chemistry (2017–2020)" },
      { n:"Escola Profissional de Espinho (ESPE)", c:[41.0073,-8.6415], d:"Mechatronics Technician, Level IV (2013–2016)" }
    ];
    const labs = [
      { n:"CQE — Instituto Superior Técnico, Lisbon", c:[38.7369,-9.1366], d:"PhD researcher · Invited teaching assistant" },
      { n:"IMPMC — MNHN, Paris", c:[48.8443,2.3562], d:"Visiting Scientist (2025–present)" },
      { n:"NASA Goddard Space Flight Center, Greenbelt MD", c:[38.9961,-76.8483], d:"Visiting Scientist (2024)" },
      { n:"Universidade da Beira Interior, Covilhã", c:[40.2784,-7.5046], d:"Research intern (2020)" }
    ];
    const pres = [
      { n:"Lisbon, Portugal", c:[38.7369,-9.1366], d:"EANA 2025 (poster · award) · AbGradE’25 · NInTec 2024 · EuChemS ECC8 2022 · IST PhD Open Days 2024 · CQE Days 2022" },
      { n:"Paris, France", c:[48.8443,2.3562], d:"IPGP “Small Bodies Day” 2025 · IMPMC PhD Students’ Day 2025" },
      { n:"Reykjavik, Iceland", c:[64.1466,-21.9426], d:"BEACON 2025 (oral)" },
      { n:"Covilhã, Portugal", c:[40.2784,-7.5046], d:"XV CICS-UBI Symposium 2020 (poster)" }
    ];

    const map = L.map(el, { scrollWheelZoom: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    const all = [];
    const tip = (n, label, color, d) =>
      '<strong>' + n + '</strong><br><span style="color:' + color + ';font-weight:600">' + label + '</span><br>' + d;
    const place = (arr, opts, label, color) => arr.forEach(p => {
      L.circleMarker(p.c, opts).addTo(map)
        .bindTooltip(tip(p.n, label, color, p.d), { direction:"top", offset:[0,-4], opacity:0.97 });
      all.push(p.c);
    });

    // Largest first (drawn underneath) so overlapping cities show as nested coloured rings
    place(education, { radius:15, color:EDU,  weight:3,   fillColor:EDU,  fillOpacity:.12 }, "Studies", EDU);
    place(pres,      { radius:11, color:PRES, weight:3,   fillColor:PRES, fillOpacity:.14 }, "Presentations", PRES);
    place(labs,      { radius:6.5,color:"#0b1020", weight:1.5, fillColor:LAB, fillOpacity:.96 }, "Laboratory / research", LAB);

    const defaultBounds = L.latLngBounds(all).pad(0.15);
    const fit = () => map.fitBounds(defaultBounds);
    fit();

    // Legend (text follows the current language; updated live on language toggle)
    const legendText = lang => lang === "pt"
      ? ['Estudos (ESPE · UBI · Técnico)', 'Laboratórios e investigação', 'Comunicações orais e painéis']
      : ['Studies (ESPE · UBI · Técnico)', 'Laboratories &amp; research', 'Oral &amp; poster presentations'];
    const legendHTML = lang => {
      const t = legendText(lang);
      return '<span class="dot" style="background:' + EDU  + '"></span>' + t[0] + '<br>' +
             '<span class="dot" style="background:' + LAB  + '"></span>' + t[1] + '<br>' +
             '<span class="dot" style="background:' + PRES + '"></span>' + t[2];
    };
    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "map-legend");
      div.innerHTML = legendHTML(currentLang);
      mapLangUpdate = lang => { div.innerHTML = legendHTML(lang); };
      return div;
    };
    legend.addTo(map);

    // Reset-to-default-view control
    const reset = L.control({ position: "topright" });
    reset.onAdd = function () {
      const b = L.DomUtil.create("button", "map-reset");
      b.type = "button"; b.title = "Reset view"; b.setAttribute("aria-label", "Reset view");
      b.innerHTML = "⌖";
      L.DomEvent.disableClickPropagation(b);
      L.DomEvent.on(b, "click", function (e) { L.DomEvent.preventDefault(e); fit(); });
      return b;
    };
    reset.addTo(map);

    setTimeout(() => map.invalidateSize(), 200);
  }

  // Performance: lazy-load below-the-fold images
  function setupLazyImages() {
    document.querySelectorAll("img:not([loading]):not(.avatar-img)").forEach(img => {
      img.loading = "lazy";
      img.decoding = "async";
    });
  }

  function init() {
    initStarfield();
    initNav();
    observeReveals(document);
    wireAccordions();
    setupScrollTopButton();
    setupButtonRipple();
    setupLightbox();
    injectHeadingIcons();
    setupLazyImages();
    setupThemeToggle();
    setupLangToggle();
    setupScrollProgress();
    buildPublicationFilter();
    buildPresentationFilter();
    updateMetrics();
    initPresoMap();
    if (document.getElementById("pub-list")) loadPublications();
  }

  // Exposed so the section loader can re-run init() after injecting content.
  window.SiteApp = { init: init, openItem: openTimelineItem };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
