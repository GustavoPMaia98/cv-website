let publicationsLoaded = false;

// Timeline fade-in animation
const observer = new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add("visible");
      observer.unobserve(e.target);
    }
  });
},{threshold:0.2});

// Wire up timeline items for accordion behavior
function wireUpTimelineItems(){
  document.querySelectorAll('.timeline-item').forEach(item=>{
    if(item.__wired) return;
    item.__wired = true;

    item.addEventListener('click', e=>{
      // allow clicks on links or form controls inside items to behave normally
      const t = e.target.tagName.toLowerCase();
      if(t === 'a' || t === 'button' || t === 'input' || t === 'textarea') return;

      const expand = item.querySelector('.timeline-expand');
      if(!expand) return;
      const isOpen = expand.classList.contains('open');

      // Close others
      document.querySelectorAll('.timeline-expand.open').forEach(el=>{
        if(el !== expand) el.classList.remove('open');
      });

      // Toggle this one open
      if(!isOpen) expand.classList.add('open');
    });
  });
}

// BibTeX + DOI loader (dynamic publications)
function loadPublications() {
  if (publicationsLoaded) return;
  publicationsLoaded = true;

  fetch("publications.bib")
  .then(r => {
    if(!r.ok) throw new Error('no bib');
    return r.text();
  })
  .then(text => {
    const entries = text.split("@").slice(1);
    const container = document.getElementById("pub-list");
    if (!container) return;

    entries.forEach(e => {
      ...
    });

    wireUpTimelineItems();
  })
  .catch(err=>{
    console.warn('publications.bib not loaded', err);
  });
}


// Utility: basic HTML escape
function escapeHtml(str){
  if(!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// vCard function
function setupVCard() {
  const vcard=[
    'BEGIN:VCARD','VERSION:3.0',
    'FN:Gustavo P. Maia',
    'EMAIL:gustavopinho.maia@mnhn.fr',
    'URL:https://orcid.org/0000-0001-5314-8816',
    'END:VCARD'
  ].join('\r\n');
  const vcardLink = document.getElementById('downloadVcard');
  if (vcardLink) {
    vcardLink.href = 'data:text/vcard;charset=utf-8,'+encodeURIComponent(vcard);
  }
}

// Copy email function
function setupCopyEmail() {
  const copyBtn = document.getElementById('copyEmailBtn');
  if (copyBtn) {
    copyBtn.onclick = async() => {
      const text = document.getElementById('emailValue').textContent.replace('(at)','@').trim();
      try{
        await navigator.clipboard.writeText(text);
      }catch(e){
        console.warn('Clipboard write failed', e);
      }
    };
  }
}

// Contact form handler
function handleContact(e){
  e.preventDefault();
  const s = encodeURIComponent(document.getElementById('subject').value || '');
  const b = encodeURIComponent(document.getElementById('message').value || '');
  location.href = `mailto:gustavopinhomaia@gmail.com?subject=${s}&body=${b}`;
  return false;
}

// Initialize all scripts after DOM is loaded
function initializeScripts() {
  // Observe any existing timeline-items
  document.querySelectorAll(".timeline-item").forEach(i=>observer.observe(i));
  
  // Wire up timeline items
  wireUpTimelineItems();
  
  // Load publications if pub-list exists
  if (document.getElementById("pub-list")) {
    loadPublications();
  }
  
  // Setup vCard
  setupVCard();
  
  // Setup copy email button
  setupCopyEmail();
  
  // Attach contact form handler
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.onsubmit = handleContact;
  }
}
