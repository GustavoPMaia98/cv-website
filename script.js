// Guard to prevent publications from loading multiple times
let publicationsLoaded = false;

// Timeline fade-in animation
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

    item.addEventListener('click', e => {
      const t = e.target.tagName.toLowerCase();
      if (t === 'a' || t === 'button' || t === 'input' || t === 'textarea') return;

      const expand = item.querySelector('.timeline-expand');
      if (!expand) return;
      const isOpen = expand.classList.contains('open');

      // Close others
      document.querySelectorAll('.timeline-expand.open').forEach(el => {
        if (el !== expand) el.classList.remove('open');
      });

      // Toggle this one open
      if (!isOpen) expand.classList.add('open');
    });
  });
}

// BibTeX + DOI loader (dynamic publications)
function loadPublications() {
  if (publicationsLoaded) return;
  publicationsLoaded = true;

  fetch("publications.bib")
    .then(r => {
      if (!r.ok) throw new Error('no bib');
      return r.text();
    })
    .then(text => {
      const entries = text.split("@").slice(1);
      const container = document.getElementById("pub-list");
      if (!container) return;

      entries.forEach(entry => {
        const title = (entry.match(/title\s*=\s*[{\"]([^}\"]+)/i) || [])[1];
        if (!title) return;

        const author = (entry.match(/author\s*=\s*[{\"]([^}\"]+)/i) || [])[1];
        const year = (entry.match(/year\s*=\s*[{\"]([^}\"]+)/i) || [])[1];
        const doi = (entry.match(/doi\s*=\s*[{\"]([^}\"]+)/i) || [])[1];
        const abstract = (entry.match(/abstract\s*=\s*[{\"]([^}\"]+)/i) || [])[1] || "";

        const item = document.createElement("div");
        item.className = "timeline-item publication";
        item.innerHTML = `
          <div class="timeline-card">
            <div class="timeline-header">
              <div>
                <strong>${escapeHtml(title)}</strong>
                <div class="meta">${escapeHtml(author || "")}${year ? " · " + escapeHtml(year) : ""}</div>
              </div>
            </div>
            <p><em>Click to view abstract</em></p>
          </div>
          <div class="timeline-expand">
            <div class="expand-body">
              <p>${escapeHtml(abstract)}</p>
              ${doi ? `<p><a href="https://doi.org/${encodeURIComponent(doi)}" target="_blank" rel="noopener noreferrer"><strong>doi.org/${escapeHtml(doi)}</strong></a></p>` : ""}
            </div>
          </div>
        `;
        container.appendChild(item);
        observer.observe(item);
      });

      wireUpTimelineItems();
    })
    .catch(err => {
      console.warn('publications.bib not loaded', err);
    });
}

// Utility: basic HTML escape
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// vCard function
function setupVCard() {
  const vcard = [
    'BEGIN:VCARD', 'VERSION:3.0',
    'FN:Gustavo P. Maia',
    'EMAIL:gustavopinho.maia@mnhn.fr',
    'URL:https://orcid.org/0000-0001-5314-8816',
    'END:VCARD'
  ].join('\r\n');

  const vcardLink = document.getElementById('downloadVcard');
  if (vcardLink) {
    vcardLink.href = 'data:text/vcard;charset=utf-8,' + encodeURIComponent(vcard);
  }
}

// Copy email function
function setupCopyEmail() {
  const copyBtn = document.getElementById('copyEmailBtn');
  if (copyBtn) {
    copyBtn.onclick = async () => {
      const text = document.getElementById('emailValue').textContent.replace('(at)', '@').trim();
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        console.warn('Clipboard write failed', e);
      }
    };
  }
}

// Contact form handler
function handleContact(e) {
  e.preventDefault();
  const s = encodeURIComponent(document.getElementById('subject').value || '');
  const b = encodeURIComponent(document.getElementById('message').value || '');
  location.href = `mailto:gustavopinhomaia@gmail.com?subject=${s}&body=${b}`;
  return false;
}

// Experiments section setup
function setupExperiments() {
  const experimentItems = document.querySelectorAll('.experiment-item');
  experimentItems.forEach(item => {
    if (item.__wired) return;
    item.__wired = true;

    const button = item.querySelector('.expand-button');
    const details = item.querySelector('.details');
    if (button && details) {
      button.addEventListener('click', () => {
        details.classList.toggle('open');
      });
    }
  });
}

// Initialize all scripts after sections are loaded
function initializeScripts() {
  document.querySelectorAll(".timeline-item").forEach(i => observer.observe(i));

  wireUpTimelineItems();

  if (document.getElementById("pub-list")) loadPublications();

  setupVCard();
  setupCopyEmail();
  setupExperiments();

  const contactForm = document.getElementById('contactForm');
  if (contactForm) contactForm.onsubmit = handleContact;
}

document.addEventListener("DOMContentLoaded", () => {
  initializeScripts();
});
