/* =====================================================================
   api/chat.js  —  Vercel serverless function (the AI relay).
   Holds NO key in code: reads process.env.ANTHROPIC_API_KEY at runtime,
   which you set as a Secret/Environment Variable in the Vercel dashboard.
   Safe to commit to a PUBLIC repo.

   It receives the chat history from the widget, prepends a system prompt
   built from the CV profile, calls Claude, and returns { reply }.
   ===================================================================== */

// --- Profile the model is allowed to talk about (kept in sync with assistant-data.js) ---
const PROFILE = `
Gustavo Pinho Maia — PhD researcher in Chemistry (Astrobiology).
Affiliations: Centro de Química Estrutural (CQE), Instituto Superior Técnico (IST), Universidade de Lisboa, Portugal; Visiting Scientist at the Muséum national d'Histoire naturelle (MNHN) — IMPMC, Paris, France; former Visiting Scientist at the NASA Goddard Astrobiology Analytical Laboratory (USA).
Research: mechanochemical and shock-driven synthesis, degradation and evolution of organic molecules relevant to prebiotic chemistry and the origin of life; interpretation of extraterrestrial organic matter in meteorites and returned samples. Studies how mechanical energy (parent-body formation, impacts, meteoritic atmospheric entry) drives organic chemistry.
ORCID 0000-0001-5314-8816. Contact: gustavopinho.maia@mnhn.fr / gustavo.pinho.maia@tecnico.ulisboa.pt. Profiles: LinkedIn in/gustavopinhomaia, ResearchGate profile/Gustavo_Maia2, Google Scholar user TTVIFykAAAAJ.

EDUCATION: PhD Chemistry/Astrobiology, IST (2023–2027, ongoing), thesis "Mechanochemical energy and prebiotic synthesis"; MSc Chemistry, IST (2020–2022, 17/20); BSc Industrial Chemistry, UBI (2017–2020); Mechatronics Technician L-IV, Escola Profissional de Espinho (2013–2016).
EXPERIENCE: Visiting Scientist MNHN–IMPMC Paris (2025–, with Prof. Laurent Remusat); Visiting Scientist NASA Goddard (Nov–Dec 2024, HPLC–MS of organics); Invited Teaching Assistant, General Chemistry, IST (2024); leadership roles in ANEQ and UBIQUÍMICA student associations.
PUBLICATIONS: (1) "Mechanochemical Reactivity of Ribonucleosides…", Applied Sciences 2025, DOI 10.3390/app15031363; (2) "Shock-Induced Degradation of Guanosine and Uridine…", Molecules 2023, DOI 10.3390/molecules28248006; (3) "Da Química Bioinorgânica para a Química Prebiótica…", Boletim SPQ 2023, DOI 10.52590/m3.p708.a30002745.
PRESENTATIONS: orals at IPGP "Small Bodies Day" (Paris, Oct 2025), AbGradE'25 (Lisbon, Oct 2025), BEACON 2025 (Reykjavik); poster at EANA 2025 (Lisbon) — won the EANA 2025 Poster Award; also EuChemS 2022, NInTec 2024, CICS-UBI 2020.
FUNDING: FCT Doctoral Grant 2023.01099.BD (2023–2027); Research Fellow on an FCT RNA-biosensor project at CQE (2023); CQE unit funding (FCT UIDB/00100/2020).
DISTINCTIONS: "Excellent Teachers 2024/2025" (IST); EANA 2025 Poster Award.
TUTORING: runs "Cientifica(mente)", personalised chemistry tutoring (PT). Tutoring contact: gustavopinhomaia@gmail.com.
`.trim();

const SYSTEM = `You are the assistant on Gustavo Pinho Maia's personal academic website. Answer questions about Gustavo — his research, CV, publications, education, experience, presentations, funding, awards, tutoring, and how to contact him — using ONLY the profile below. Be concise, warm and professional. If something isn't in the profile, say you don't have that detail and point to his contact email or linked profiles. You may answer general scientific questions about his research topics (mechanochemistry, prebiotic chemistry, astrobiology, the origin of life) to give context, but do not invent facts about Gustavo. If asked something unrelated to Gustavo or his field, gently steer back. Default to the language the user writes in (English or Portuguese).

PROFILE:
${PROFILE}`;

// --- Optional: lock the relay to your own site(s). Add your domain(s) here. ---
const ALLOWED_ORIGINS = [
  // "https://your-domain.com",
  // "https://gustavopinhomaia.github.io"
];

// Tiny in-memory rate limit (per warm instance) — light abuse protection.
const HITS = new Map();
const WINDOW_MS = 60000, MAX_PER_WINDOW = 20;
function limited(ip) {
  const now = Date.now();
  const rec = HITS.get(ip) || { n: 0, t: now };
  if (now - rec.t > WINDOW_MS) { rec.n = 0; rec.t = now; }
  rec.n++; HITS.set(ip, rec);
  return rec.n > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
  if (limited(ip)) return res.status(429).json({ error: "Too many requests, please slow down." });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Server not configured." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    let messages = Array.isArray(body.messages) ? body.messages : [];
    // sanitise: only role/content, cap length, last 12 turns
    messages = messages
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return res.status(400).json({ error: "No question provided." });
    }

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest", // fast & inexpensive; swap to a larger model if you prefer
        max_tokens: 600,
        system: SYSTEM,
        messages
      })
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return res.status(502).json({ error: "Upstream error", detail: detail.slice(0, 300) });
    }
    const data = await r.json();
    const reply = (data.content || []).map(b => (b && b.type === "text" ? b.text : "")).join("").trim();
    return res.status(200).json({ reply: reply || "Sorry, I couldn't generate a reply." });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
