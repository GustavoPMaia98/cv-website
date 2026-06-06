// ===================================================================
//  CONFIG
// ===================================================================
const ORCID_ID = "0000-0001-5314-8816";
const ORCID_WORKS_URL = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
const CROSSREF_URL = "https://api.crossref.org/works/";
// Used only for the Crossref "polite pool" (better/faster responses). Not secret.
const CONTACT_MAILTO = "gustavopinho.maia@mnhn.fr";

// Guard to prevent publications from loading multiple times
let publicationsLoaded = false;

// IntersectionObserver for fade-in
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("visible");
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.2 });

// Wire up timeline items for accordion behavior
function wireUpTimelineItems() {
  document.querySelectorAll('.timeline-item').forEach(item => {
    if (item.__wired) return;
    item.__wired = true;

    const expand = item.querySelector('.timeline-expand');
    if (!expand) return;

    // Toggle this item on click
    item.addEventListener('click', e => {
      const t = e.target.tagName.toLowerCase();
      if (['a', 'button', 'input', 'textarea'].includes(t)) return;

      const isOpen = expand.classList.contains('open');

      // Close all other open items
      document.querySelectorAll('.timeline-expand.open').forEach(el => {
        if (el !== expand) el.classList.remove('open');
      });

      // Toggle this one
      expand.classList.toggle('open', !isOpen);
    });

    // Prevent clicks inside expanded content from bubbling
    expand.addEventListener('click', e => e.stopPropagation());
  });
}

// ===================================================================
//  PUBLICATIONS — automatic loading from ORCID
//  ----------------------------------------------------------------
//  - ORCID is the source of truth for *which* papers exist.
//  - Crossref enriches each DOI with authors, journal, year and the
//    abstract (ORCID itself rarely stores abstracts).
//  - Any DOI already shown statically in publications.html is skipped,
//    so there are never duplicates and the static entries keep working
//    as a fallback if the network/APIs are unavailable.
// ===================================================================
async function loadPublications() {
  if (publicationsLoaded) return;
  publicationsLoaded = true;

  const container = document.getElementById("pub-list");
  if (!container) return;

  // Collect DOIs already present on the page (static entries) to avoid duplicates.
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
    try {
      works = await fetchCrossrefByOrcid();
    } catch (err2) {
      console.warn("Could not load publications automatically:", err2);
      return; // static entries remain visible
    }
  }

  // Newest first
  works.sort((a, b) => (b.year || 0) - (a.year || 0));

  for (const w of works) {
    const doiKey = w.doi ? w.doi.toLowerCase() : null;
    if (doiKey && seenDois.has(doiKey)) continue; // skip duplicates

    // Enrich with Crossref (authors + abstract + clean metadata)
    const meta = w.doi ? await fetchCrossref(w.doi) : null;

    const pub = {
      title:    (meta && meta.title)    || w.title    || "Untitled",
      authors:  (meta && meta.authors)  || w.authors  || "",
      year:     (meta && meta.year)     || w.year     || "",
      journal:  (meta && meta.journal)  || w.journal  || "",
      abstract: (meta && meta.abstract) || "",
      doi:      w.doi || (meta && meta.doi) || ""
    };

    if (doiKey) seenDois.add(doiKey);
    renderPublication(container, pub);
  }

  wireUpTimelineItems();
}

// Fetch the list of works from ORCID's public API (token-less, CORS-enabled).
async function fetchOrcidWorks() {
  const res = await fetch(ORCID_WORKS_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("ORCID request failed: " + res.status);
  const data = await res.json();

  const works = [];
  (data.group || []).forEach(group => {
    const summaries = group["work-summary"] || [];
    if (!summaries.length) return;
    const s = summaries[0];

    // DOI can live on the group's external-ids or on the summary's external-ids
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

    works.push({
      doi,
      title,
      journal,
      authors: "",
      year: yearVal ? parseInt(yearVal, 10) : 0
    });
  });
  return works;
}

// Fallback: ask Crossref for everything tagged with this ORCID iD.
async function fetchCrossrefByOrcid() {
  const url = `${CROSSREF_URL.replace(/\/$/, "")}?filter=orcid:${ORCID_ID}&rows=200&mailto=${encodeURIComponent(CONTACT_MAILTO)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Crossref ORCID request failed: " + res.status);
  const json = await res.json();
  const items = (json.message && json.message.items) || [];
  return items.map(parseCrossrefItem);
}

// Fetch rich metadata for one DOI from Crossref.
async function fetchCrossref(doi) {
  if (!doi) return null;
  try {
    const url = CROSSREF_URL + encodeURIComponent(doi) + "?mailto=" + encodeURIComponent(CONTACT_MAILTO);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = await res.json();
    return parseCrossrefItem(json.message || {});
  } catch (e) {
    return null;
  }
}

// Normalise a Crossref "message"/item into our publication shape.
function parseCrossrefItem(m) {
  const title = Array.isArray(m.title) ? m.title[0] : (m.title || "");
  const journal = Array.isArray(m["container-title"]) ? m["container-title"][0] : (m["container-title"] || "");

  const dateParts =
    (m.issued && m.issued["date-parts"] && m.issued["date-parts"][0]) ||
    (m["published-print"] && m["published-print"]["date-parts"] && m["published-print"]["date-parts"][0]) ||
    (m["published-online"] && m["published-online"]["date-parts"] && m["published-online"]["date-parts"][0]) ||
    [];
  const year = dateParts[0] || "";

  const authors = (m.author || [])
    .map(a => [a.given, a.family].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(", ");

  const abstract = m.abstract ? stripJats(m.abstract) : "";

  return { title, journal, year, authors, abstract, doi: m.DOI || "" };
}

// Crossref abstracts arrive as JATS XML — strip tags and the leading "Abstract" label.
function stripJats(s) {
  return String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\s*abstract[:\s]*/i, "")
    .trim();
}

// Build a publication card in the same style as the static ones.
function renderPublication(container, pub) {
  const metaParts = [pub.authors, pub.year, pub.journal].filter(Boolean).join(" · ");
  const doiUrl = pub.doi ? "https://doi.org/" + encodeURI(pub.doi) : "";

  const item = document.createElement("div");
  item.className = "timeline-item publication observed";
  item.innerHTML = `
    <div class="timeline-card">
      <div class="timeline-header">
        <div>
          <strong>${escapeHtml(pub.title)}</strong>
          <div class="meta">${escapeHtml(metaParts)}</div>
        </div>
      </div>
      <p><em>Click to view abstract</em></p>
    </div>
    <div class="timeline-expand">
      <div class="expand-body">
        ${pub.abstract
          ? `<p>${escapeHtml(pub.abstract)}</p>`
          : `<p><em>Abstract not available — see the publication via the DOI link below.</em></p>`}
        ${doiUrl
          ? `<p><a href="${doiUrl}" target="_blank" rel="noopener noreferrer"><strong>DOI: ${escapeHtml(pub.doi)}</strong></a></p>`
          : ""}
      </div>
    </div>
  `;
  container.appendChild(item);
  observer.observe(item);
}

// HTML escape utility
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ===================================================================
//  SCROLL-TO-TOP BUTTON ("Slides up")
// ===================================================================
function setupScrollTopButton() {
  if (document.getElementById("scrollTopBtn")) return;

  const btn = document.createElement("button");
  btn.id = "scrollTopBtn";
  btn.type = "button";
  btn.className = "scroll-top-btn";
  btn.setAttribute("aria-label", "Scroll back to top");
  btn.innerHTML = `<span>Slides up</span><span aria-hidden="true">&uarr;</span>`;

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.body.appendChild(btn);

  const toggle = () => {
    if (window.scrollY > 300) btn.classList.add("show");
    else btn.classList.remove("show");
  };

  window.addEventListener("scroll", toggle, { passive: true });
  toggle(); // set initial state
}

// vCard setup
function setupVCard() {
  const vcard = [
    'BEGIN:VCARD', 'VERSION:3.0',
    'FN:Gustavo P. Maia',
    'EMAIL:gustavopinho.maia@mnhn.fr',
    'URL:https://orcid.org/0000-0001-5314-8816',
    'END:VCARD'
  ].join('\r\n');

  const vcardLink = document.getElementById('downloadVcard');
  if (vcardLink) vcardLink.href = 'data:text/vcard;charset=utf-8,' + encodeURIComponent(vcard);
}

// Copy email function
function setupCopyEmail() {
  const copyBtn = document.getElementById('copyEmailBtn');
  if (copyBtn) {
    copyBtn.onclick = async () => {
      const text = document.getElementById('emailValue').textContent.replace('(at)', '@').trim();
      try { await navigator.clipboard.writeText(text); }
      catch (e) { console.warn('Clipboard write failed', e); }
    };
  }
}

// Contact button (opens email client)
function setupContactButton(buttonId, email) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.location = `mailto:${email}?subject=Contact from Website`;
  });
}

// Experiments section setup
function setupExperiments() {
  document.querySelectorAll('.experiment-item').forEach(item => {
    if (item.__wired) return;
    item.__wired = true;

    const button = item.querySelector('.expand-button');
    const details = item.querySelector('.details');
    if (button && details) button.addEventListener('click', () => details.classList.toggle('open'));
  });
}

// Initialize all scripts after sections are loaded
function initializeScripts() {
  document.querySelectorAll(".timeline-item:not(.observed)").forEach(i => {
    i.classList.add("observed");
    observer.observe(i);
  });

  wireUpTimelineItems();

  if (document.getElementById("pub-list")) loadPublications();

  setupVCard();
  setupCopyEmail();
  setupExperiments();
  setupScrollTopButton();

  // Setup contact buttons for email (replace YOUR_PUBLIC_CONTACT_EMAIL with deployment-safe address)
  setupContactButton('contactBtn', 'YOUR_PUBLIC_CONTACT_EMAIL');
  setupContactButton('contactReserve', 'YOUR_PUBLIC_CONTACT_EMAIL');
}
