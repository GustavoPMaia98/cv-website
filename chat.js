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
MEDIA: Maré Viva (2025, "O percurso improvável de Gustavo Maia levou-o de Ovar até à NASA"), Praça Pública (2024), Diferencial / IST student journal (2024).
OUTREACH: co-organised the Digital Colloquium of Chemistry Students in Portugal (2021), +FUTURO sessions (ANEQ), Junior Chemistry Olympiad (UBI 2019), 6th Conference on Chemistry and Biochemistry (UBIQUÍMICA, 2019); completed the RED "Basics in Astrobiology" school (2025); competed at RoboCup (2016).
PROFILES/METRICS: ResearchGate lists 6 research items (3 journal articles + conference contributions); Google Scholar user TTVIFykAAAAJ. Based between Lisbon/Seixal (PT) and Paris (FR); originally from Ovar, Portugal.
`.trim();

const SYSTEM = `You are the friendly AI assistant on Gustavo Pinho Maia's personal academic website. Talk naturally and conversationally — warm, clear, and genuinely helpful, like a knowledgeable colleague introducing Gustavo's work. Vary your phrasing, keep answers fluid and well-structured, and match the language the user writes in (English or Portuguese).

Your knowledge is the PROFILE below: a compilation of Gustavo's public information drawn from his CV, CiênciaVitae, ORCID, ResearchGate, Google Scholar and LinkedIn. Treat it as your source of truth. You cannot browse the web live, so rely on this compiled information rather than claiming to look things up in real time.

Rules:
- Answer questions about Gustavo (research, CV, publications, education, experience, presentations, funding, awards, tutoring, contact) using the PROFILE. You may add light, accurate context about his scientific fields (mechanochemistry, prebiotic chemistry, astrobiology, origin of life) to make answers richer, but never invent specific facts about Gustavo.
- If a detail genuinely isn't in the PROFILE, or the question is unrelated to Gustavo or his field, reply exactly: "Sorry, I'm not able to answer that." — then, in one short sentence, offer what you can help with or point to his contact email (gustavopinho.maia@mnhn.fr) or linked profiles.
- Be concise by default; expand when the user asks for detail.

PROFILE:
${PROFILE}`;

// Model for the AI tier. claude-sonnet-4-6 gives fluid answers.
// Alternatives: "claude-3-5-sonnet-latest" (broad availability) or "claude-haiku-4-5" (cheapest).
const MODEL = "claude-sonnet-4-6";

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
        model: MODEL,
        max_tokens: 700,
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
