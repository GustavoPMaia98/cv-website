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

// Dynamic publications loader
function loadPublications() {
  if (publicationsLoaded) return;
  publicationsLoaded = true;

  fetch("publications.bib")
    .then(r => r.ok ? r.text() : Promise.reject('no bib'))
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
    .catch(err => console.warn('publications.bib not loaded', err));
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

  // Setup contact buttons for email (replace YOUR_PUBLIC_CONTACT_EMAIL with deployment-safe address)
  setupContactButton('contactBtn', 'YOUR_PUBLIC_CONTACT_EMAIL');
  setupContactButton('contactReserve', 'YOUR_PUBLIC_CONTACT_EMAIL');
}

/* ============================================================
   ANIMATED METEOROID BACKGROUND CANVAS
   Self-contained: initializes on its own, independent of the
   section loader. Honors prefers-reduced-motion and pauses
   when the tab is hidden.

   >>> Tweak the SPAWN_* values below to change how often
       meteoroids appear (lower numbers = more frequent). <<<
   ============================================================ */
(function initMeteoroids() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- TUNABLES ----------
  const SPAWN_MIN_MS = 450;   // shortest gap between meteoroids (ms)
  const SPAWN_MAX_MS = 1100;  // longest gap between meteoroids (ms)
  const MAX_METEORS  = 16;    // hard cap on simultaneous meteoroids
  const SPEED_MIN = 6,  SPEED_MAX = 12;     // px per frame
  const LEN_MIN   = 120, LEN_MAX  = 280;    // tail length (px)
  const SIZE_MIN  = 1,  SIZE_MAX  = 2.4;    // head/line thickness
  // -------------------------------

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  let meteors = [];
  let lastSpawn = 0;
  let nextGap = SPAWN_MIN_MS;
  let rafId = null;
  let running = false;

  const rand = (min, max) => min + Math.random() * (max - min);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn() {
    // Travel down-and-to-the-right at a shallow diagonal.
    const angle = rand(Math.PI * 0.10, Math.PI * 0.26); // ~18°–47° below horizontal
    const speed = rand(SPEED_MIN, SPEED_MAX);
    // Mostly cool cyan/blue (site accent) with the occasional warm streak.
    const hue = Math.random() < 0.8 ? rand(190, 215) : rand(38, 52);
    meteors.push({
      x: rand(-W * 0.15, W * 0.9),
      y: rand(-H * 0.25, H * 0.15),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: rand(LEN_MIN, LEN_MAX),
      size: rand(SIZE_MIN, SIZE_MAX),
      hue,
      life: 0,
      maxLife: Math.round(rand(70, 130))
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.life++;

      const mag = Math.hypot(m.vx, m.vy) || 1;
      const tailX = m.x - (m.vx / mag) * m.len;
      const tailY = m.y - (m.vy / mag) * m.len;

      // Fade in then out across the meteoroid's life (0 -> 1 -> 0).
      const alpha = Math.sin(Math.min(m.life / m.maxLife, 1) * Math.PI);

      const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      grad.addColorStop(0, `hsla(${m.hue}, 100%, 86%, ${alpha})`);
      grad.addColorStop(1, `hsla(${m.hue}, 100%, 70%, 0)`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = m.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      // Bright head with a soft glow.
      ctx.save();
      ctx.shadowColor = `hsla(${m.hue}, 100%, 90%, ${alpha})`;
      ctx.shadowBlur = 8;
      ctx.fillStyle = `hsla(${m.hue}, 100%, 96%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const offscreen = m.x - m.len > W + 60 || m.y - m.len > H + 60;
      if (m.life >= m.maxLife || offscreen) meteors.splice(i, 1);
    }
  }

  function loop(now) {
    if (!running) return;
    if (!lastSpawn) lastSpawn = now;
    if (now - lastSpawn >= nextGap && meteors.length < MAX_METEORS) {
      spawn();
      lastSpawn = now;
      nextGap = rand(SPAWN_MIN_MS, SPAWN_MAX_MS);
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    lastSpawn = 0;
    rafId = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  if (!reduceMotion) start();
})();
