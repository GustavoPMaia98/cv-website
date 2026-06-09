/* =====================================================================
   assistant-data.js
   Single source of truth about Gustavo Pinho Maia, used by BOTH:
     • the real-AI tier  (sent to Claude as context by the Vercel relay)
     • the offline tier   (keyword-matched answers when the API is unavailable)
   Edit this file to update what the assistant knows. No secrets here.
   ===================================================================== */
(function () {
  // ---- Compact profile string given to the AI as system context ----
  const PROFILE = `
Gustavo Pinho Maia — PhD researcher in Chemistry (Astrobiology).
Affiliations: Centro de Química Estrutural (CQE), Instituto Superior Técnico (IST), Universidade de Lisboa, Portugal; Visiting Scientist at the Muséum national d'Histoire naturelle (MNHN) — IMPMC, Paris, France. Has also been a Visiting Scientist at the NASA Goddard Astrobiology Analytical Laboratory (USA).
Research focus: mechanochemical and shock-driven synthesis, degradation and evolution of organic molecules relevant to prebiotic chemistry and the origin of life; interpretation of extraterrestrial organic matter in meteorites and returned samples. He studies how mechanical energy (parent-body formation, impacts, meteoritic atmospheric entry) drives the chemistry of organic compounds.
Born 1998-09-22. Languages: Portuguese (native), English (C1). ORCID 0000-0001-5314-8816. Ciência ID 8212-CEE3-E928.
Contact: gustavopinho.maia@mnhn.fr and gustavo.pinho.maia@tecnico.ulisboa.pt.
Profiles: ORCID, LinkedIn (in/gustavopinhomaia), ResearchGate (profile/Gustavo_Maia2), Google Scholar (user TTVIFykAAAAJ), CiênciaVitae.

EDUCATION
- PhD in Chemistry (Astrobiology), Universidade de Lisboa / IST, 2023–2027 (ongoing). Thesis: "Mechanochemical energy and prebiotic synthesis".
- MSc in Chemistry, IST, 2020–2022 (final grade 17/20; thesis 19/20). Thesis: "Ribonucleoside stability and prebiotic synthesis".
- BSc in Industrial Chemistry, Universidade da Beira Interior (UBI), 2017–2020 (grade 16). Topic: optimisation of quinoline N-oxide synthesis.
- Mechatronics Technician, Level IV, Escola Profissional de Espinho (ESPE), 2013–2016 (grade 18). Built an autonomous robot for RoboCupJunior Rescue Line.

EXPERIENCE
- Visiting Scientist, MNHN–IMPMC, Paris (Jan 2025–present), with Prof. Laurent Remusat: mechanochemical synthesis, sample analysis, astrobiology methods.
- Visiting Scientist, NASA Goddard Space Flight Center, USA (Nov–Dec 2024): mechanochemical effects on extraction/recovery of organics from extraterrestrial materials; HPLC–MS method development.
- Invited Teaching Assistant, IST (Sep–Oct 2024): General Chemistry laboratories for 1st-year Aerospace Engineering.
- Roles in student associations: President of the Fiscal Council of ANEQ (2021–2022); Vice-President of ANEQ (2020–2021); Vice-President and Scientific Committee member of UBIQUÍMICA; Delegate of Industrial Chemistry students at UBI.
- Earlier: research intern at UBI (2020); factory worker at Nestlé Portugal (2019); professional internship at Ramada Aços (2014).

PUBLICATIONS (peer-reviewed)
1. Maia G.P., Gonçalves C., Carvalho A.J., André V., Galvão A., Ribeiro A.P.C., Pinheiro P.F., da Silva J.A.L. "Mechanochemical Reactivity of Ribonucleosides Mediated by Inorganic Species: Implications for Extraterrestrial Organic Matter Interpretation." Applied Sciences, 2025. DOI 10.3390/app15031363.
2. Maia G.P., da Silva J.A.L., André V., Galvão A.M. "Shock-Induced Degradation of Guanosine and Uridine Promoted by Nickel and Carbonate: Potential Applications." Molecules, 2023. DOI 10.3390/molecules28248006.
3. Franco A., Maia G.P., da Silva J.A.L. "Da Química Bioinorgânica para a Química Prebiótica: Levar Mais Longe o Legado do Prof. Fraústo da Silva." Boletim da Sociedade Portuguesa de Química, 2023. DOI 10.52590/m3.p708.a30002745.

SELECTED PRESENTATIONS
- "Mechanochemistry and the fate of extraterrestrial organic matter" — oral, IPGP "Small Bodies Day" Symposium, Paris, Oct 2025.
- "The effect of mechanochemistry on the formation of extraterrestrial organic matter" — oral, AbGradE'25 Symposium, Lisbon, Oct 2025.
- Poster at EANA 2025 (Lisbon) — won the EANA 2025 Poster Award.
- "Effect of Mechanochemical Events Into Extraterrestrial Organic Matter..." — oral, BEACON 2025, Reykjavik, Jul 2025.
- Talks/posters also at IMPMC PhD Day (Paris 2025), NInTec Science Days (Lisbon 2024), IST PhD Open Days (2024), EuChemS Chemistry Congress (Lisbon 2022), CQE Days (2022), XV CICS-UBI Symposium (Covilhã 2020).

FUNDING
- FCT Doctoral Grant 2023.01099.BD — "Mechanochemical energy and prebiotic synthesis" (2023–2027). DOI 10.54499/2023.01099.BD.
- Research Fellow — "A Gold Nanosensor for Single Molecule Detection of RNA Biomarkers" (FCT, CQE, 2023).
- Research Unit funding — Centro de Química Estrutural (FCT UIDB/00100/2020).

DISTINCTIONS
- "Excellent Teachers 2024/2025", IST (Universidade de Lisboa).
- EANA 2025 Poster Award.
- Rotary Club de Espinho Merit Recognition (2016); RoboCup "Best Presentation" certificate (2016).

OUTREACH / MEDIA
- Co-organised the Digital Colloquium of Chemistry Students in Portugal (2021).
- Featured in Maré Viva (2025): "O percurso improvável de Gustavo Maia levou-o de Ovar até à NASA".

TUTORING
- Runs "Cientifica(mente)", personalised chemistry tutoring (General Chemistry, Organic Chemistry, scientific writing), in Portuguese. Contact via gustavopinhomaia@gmail.com.
`.trim();

  // ---- Offline answers: each entry = {keywords, answer}. First best match wins. ----
  const FAQ = [
    { k: ["who", "about", "yourself", "bio", "quem", "sobre"], a:
      "Gustavo Pinho Maia is a PhD researcher in Chemistry (Astrobiology) at the Centro de Química Estrutural (Instituto Superior Técnico, Universidade de Lisboa), and a Visiting Scientist at the MNHN–IMPMC in Paris. His work sits at the interface of prebiotic chemistry, mechanochemistry and meteoritics — studying how mechanical energy shapes organic molecules relevant to the origin of life." },
    { k: ["research", "work on", "study", "focus", "investiga", "área", "tema"], a:
      "His research focuses on mechanochemical and shock-driven synthesis, degradation and evolution of organic molecules relevant to prebiotic chemistry and the origin of life. In practice he reproduces, in the lab, the mechanical energy from impacts, planetesimal accretion and meteoritic atmospheric entry, and studies what it does to organic compounds — helping interpret the organic matter found in meteorites and returned samples." },
    { k: ["mechanochem", "mecanoquím", "grind", "milling", "ball mill", "shock", "impact"], a:
      "Mechanochemistry drives chemical reactions with mechanical force (grinding, milling, impact) instead of heat or solvent. Gustavo uses it to mimic the dry, high-energy events organic molecules experience in space. For example, grinding ribonucleosides with metals and carbonates found in meteorites degrades them into the same nucleobases detected in real samples — suggesting those molecules may be survivors of a mechanical history." },
    { k: ["publication", "paper", "article", "publica", "artigo"], a:
      "Three peer-reviewed publications: (1) 'Mechanochemical Reactivity of Ribonucleosides…', Applied Sciences (2025), DOI 10.3390/app15031363; (2) 'Shock-Induced Degradation of Guanosine and Uridine…', Molecules (2023), DOI 10.3390/molecules28248006; (3) 'Da Química Bioinorgânica para a Química Prebiótica…', Boletim da SPQ (2023), DOI 10.52590/m3.p708.a30002745. The Publications section stays in sync with ORCID." },
    { k: ["education", "degree", "phd", "msc", "master", "bsc", "studies", "estudo", "formação", "doutoramento", "mestrado"], a:
      "PhD in Chemistry/Astrobiology at IST (2023–2027, ongoing); MSc in Chemistry at IST (2020–2022, 17/20); BSc in Industrial Chemistry at UBI (2017–2020, 16); and a Level-IV Mechatronics Technician diploma from Escola Profissional de Espinho (2013–2016, 18)." },
    { k: ["experience", "job", "position", "nasa", "mnhn", "impmc", "goddard", "experiência", "trabalho"], a:
      "He is a Visiting Scientist at MNHN–IMPMC in Paris (since Jan 2025, with Prof. Laurent Remusat), was a Visiting Scientist at the NASA Goddard Astrobiology Analytical Laboratory (Nov–Dec 2024), and an Invited Teaching Assistant in General Chemistry at IST (2024). He has also held several student-association leadership roles." },
    { k: ["present", "talk", "conference", "poster", "beacon", "eana", "abgrade", "apresenta", "conferência"], a:
      "Recent highlights: oral talks at the IPGP 'Small Bodies Day' (Paris) and AbGradE'25 (Lisbon) in Oct 2025, a talk at BEACON 2025 (Reykjavik), and a poster at EANA 2025 that won the EANA 2025 Poster Award. Earlier talks/posters include EuChemS 2022, NInTec 2024 and CICS-UBI 2020. See the Presentations and 'Where I have been' map sections." },
    { k: ["fund", "grant", "fct", "scholarship", "financ", "bolsa"], a:
      "His PhD is supported by FCT Doctoral Grant 2023.01099.BD (2023–2027). He was also a Research Fellow on an FCT RNA-biosensor project at CQE (2023), and his research unit (CQE) is funded by FCT (UIDB/00100/2020)." },
    { k: ["award", "prize", "distinction", "best teacher", "prémio", "distinção"], a:
      "Distinctions include the 'Excellent Teachers 2024/2025' recognition at IST, the EANA 2025 Poster Award, and earlier the Rotary Club de Espinho merit recognition and a RoboCup 'Best Presentation' certificate (2016)." },
    { k: ["tutor", "cientifica", "explica", "lessons", "aulas", "química"], a:
      "Gustavo runs 'Cientifica(mente)', personalised chemistry tutoring (General and Organic Chemistry, plus scientific writing), taught in Portuguese. You can reach him about lessons via gustavopinhomaia@gmail.com — see the Tutoring section." },
    { k: ["contact", "email", "reach", "hire", "collaborat", "contact", "contacto", "colabora"], a:
      "You can contact Gustavo at gustavopinho.maia@mnhn.fr (or gustavo.pinho.maia@tecnico.ulisboa.pt). He's also on LinkedIn (in/gustavopinhomaia), ResearchGate, Google Scholar and ORCID (0000-0001-5314-8816) — all linked in the header and footer." },
    { k: ["cv", "resume", "curriculum", "download"], a:
      "You can download his full CV from the 'Download CV' button in the header. It covers education, research experience, publications, funding, presentations and skills." },
    { k: ["robot", "mechatron", "espinho", "robocup"], a:
      "Before chemistry, Gustavo trained as a Level-IV Mechatronics Technician at the Escola Profissional de Espinho (2013–2016) and built an autonomous robot for the RoboCupJunior Rescue Line — an experimental, problem-solving foundation he still draws on at the bench." },
    { k: ["origin of life", "prebiotic", "prebiót", "abiogenesis", "vida"], a:
      "A central question in his work is how the building blocks of life could have formed and survived in extreme, non-aqueous, high-energy environments — an alternative to the classic 'warm little pond', emphasising mechanical/impact-driven chemistry and the exogenous delivery of organics to the early Earth." }
  ];

  const FALLBACK =
    "I can answer questions about Gustavo's research, publications, education, experience, presentations, funding, awards, tutoring, or how to contact him. Try asking about his mechanochemistry research, his time at NASA Goddard, or his publications — or use the section links above.";

  const GREETING =
    "Hi! I'm an assistant for Gustavo Pinho Maia's site. Ask me anything about his research, CV, publications, or how to get in touch.";

  // Offline matcher: score FAQ entries by keyword hits in the question
  function offlineAnswer(qRaw) {
    const q = (qRaw || "").toLowerCase();
    if (!q.trim()) return FALLBACK;
    if (/^(hi|hello|hey|olá|ola|bom dia|boa tarde)\b/.test(q)) return GREETING;
    let best = null, bestScore = 0;
    for (const item of FAQ) {
      let score = 0;
      for (const kw of item.k) if (q.indexOf(kw) !== -1) score++;
      if (score > bestScore) { bestScore = score; best = item; }
    }
    return best ? best.a : FALLBACK;
  }

  window.ASSISTANT_DATA = { PROFILE, FAQ, FALLBACK, GREETING, offlineAnswer };
})();
