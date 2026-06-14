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

MEDIA / INTERVIEWS
- Maré Viva (Sep 2025): "O percurso improvável de Gustavo Maia levou-o de Ovar até à NASA".
- Praça Pública (Dec 2024): on deepening his research at NASA's Astrobiology Analytical Laboratory.
- Diferencial, IST student journal (Nov 2024): interview.

OUTREACH / EVENTS
- Co-organised the Digital Colloquium of Chemistry Students in Portugal (2021) and the +FUTURO sessions (ANEQ, 2022).
- Helped organise the Junior Chemistry Olympiad semifinals (UBI, 2019) and the 6th Conference on Chemistry and Biochemistry (UBIQUÍMICA, Covilhã, 2019).
- Completed the RED "Basics in Astrobiology" training school (2025). As a teenager, competed at RoboCup (Leipzig 2016) and several Portuguese National Robotics Festivals.

PROFILES / METRICS
- ResearchGate lists 6 research items (3 journal articles plus conference contributions). Google Scholar profile: user TTVIFykAAAAJ.
- Based between Lisbon/Seixal (Portugal) and Paris (France); originally from Ovar, Portugal.
`.trim();

  // ---- Offline answers: each entry = {keywords, answer}. Highest keyword-hit
  //      count wins; if NOTHING matches, we return FALLBACK and say we can't help.
  //      Keywords are matched accent-insensitively (see offlineAnswer). IMPORTANT:
  //      do NOT use bare question words like "who", "where", "what", "how many",
  //      "about", "quem", "onde", "sobre" as keywords — they match unrelated
  //      questions ("who is bugabuga?") and make the bot answer as if about
  //      Gustavo. Use specific, on-topic terms (and full phrases) instead. ----
  const FAQ = [
    // --- About Gustavo (requires his name or a self-referential phrase) ---
    { k: ["gustavo", "maia", "who are you", "who is he", "who's he", "about you", "about him", "about himself", "yourself", "biography", "your background", "his background", "quem e gustavo", "quem es", "sobre o gustavo", "sobre ele", "sobre ti"], a:
      "Gustavo Pinho Maia is a PhD researcher in Chemistry (Astrobiology) at the Centro de Química Estrutural (Instituto Superior Técnico, Universidade de Lisboa), and a Visiting Scientist at the MNHN–IMPMC in Paris. His work sits at the interface of prebiotic chemistry, mechanochemistry and meteoritics — studying how mechanical energy shapes organic molecules relevant to the origin of life." },
    { k: ["his research", "research focus", "research about", "work on", "his work", "what does he do", "investiga", "investigacao", "area de investigacao", "tema de investigacao", "linha de investigacao"], a:
      "His research focuses on mechanochemical and shock-driven synthesis, degradation and evolution of organic molecules relevant to prebiotic chemistry and the origin of life. In practice he reproduces, in the lab, the mechanical energy from impacts, planetesimal accretion and meteoritic atmospheric entry, and studies what it does to organic compounds — helping interpret the organic matter found in meteorites and returned samples." },
    { k: ["mechanochem", "mecanoquim", "grind", "milling", "ball mill", "shock", "impact"], a:
      "Mechanochemistry drives chemical reactions with mechanical force (grinding, milling, impact) instead of heat or solvent. Gustavo uses it to mimic the dry, high-energy events organic molecules experience in space. For example, grinding ribonucleosides with metals and carbonates found in meteorites degrades them into the same nucleobases detected in real samples — suggesting those molecules may be survivors of a mechanical history." },
    { k: ["publication", "paper", "article", "publica", "artigo", "doi"], a:
      "Three peer-reviewed publications: (1) 'Mechanochemical Reactivity of Ribonucleosides…', Applied Sciences (2025), DOI 10.3390/app15031363; (2) 'Shock-Induced Degradation of Guanosine and Uridine…', Molecules (2023), DOI 10.3390/molecules28248006; (3) 'Da Química Bioinorgânica para a Química Prebiótica…', Boletim da SPQ (2023), DOI 10.52590/m3.p708.a30002745. The Publications section stays in sync with ORCID." },
    { k: ["education", "degree", "phd", "msc", "master", "bsc", "studies", "studied", "estudo", "formacao", "doutoramento", "mestrado", "licenciatura"], a:
      "PhD in Chemistry/Astrobiology at IST (2023–2027, ongoing); MSc in Chemistry at IST (2020–2022, 17/20); BSc in Industrial Chemistry at UBI (2017–2020, 16); and a Level-IV Mechatronics Technician diploma from Escola Profissional de Espinho (2013–2016, 18)." },
    { k: ["experience", "his job", "position", "nasa", "mnhn", "impmc", "goddard", "experiencia", "trabalhou", "visiting scientist"], a:
      "He is a Visiting Scientist at MNHN–IMPMC in Paris (since Jan 2025, with Prof. Laurent Remusat), was a Visiting Scientist at the NASA Goddard Astrobiology Analytical Laboratory (Nov–Dec 2024), and an Invited Teaching Assistant in General Chemistry at IST (2024). He has also held several student-association leadership roles." },
    { k: ["present", "talk", "conference", "poster", "beacon", "eana", "abgrade", "apresenta", "conferencia"], a:
      "Recent highlights: oral talks at the IPGP 'Small Bodies Day' (Paris) and AbGradE'25 (Lisbon) in Oct 2025, a talk at BEACON 2025 (Reykjavik), and a poster at EANA 2025 that won the EANA 2025 Poster Award. Earlier talks/posters include EuChemS 2022, NInTec 2024 and CICS-UBI 2020. See the Presentations and 'Where I have been' map sections." },
    { k: ["fund", "grant", "fct", "scholarship", "financ", "bolsa"], a:
      "His PhD is supported by FCT Doctoral Grant 2023.01099.BD (2023–2027). He was also a Research Fellow on an FCT RNA-biosensor project at CQE (2023), and his research unit (CQE) is funded by FCT (UIDB/00100/2020)." },
    { k: ["award", "prize", "distinction", "best teacher", "premio", "distincao"], a:
      "Distinctions include the 'Excellent Teachers 2024/2025' recognition at IST, the EANA 2025 Poster Award, and earlier the Rotary Club de Espinho merit recognition and a RoboCup 'Best Presentation' certificate (2016)." },
    { k: ["tutor", "cientifica", "explicacoes", "lessons", "aulas", "tutoring", "private lessons"], a:
      "Gustavo runs 'Cientifica(mente)', personalised chemistry tutoring (General and Organic Chemistry, plus scientific writing), taught in Portuguese. You can reach him about lessons via gustavopinhomaia@gmail.com — see the Tutoring section." },
    { k: ["contact", "email", "reach him", "reach gustavo", "hire", "collaborat", "contacto", "colabora", "get in touch"], a:
      "You can contact Gustavo at gustavopinho.maia@mnhn.fr (or gustavo.pinho.maia@tecnico.ulisboa.pt). He's also on LinkedIn (in/gustavopinhomaia), ResearchGate, Google Scholar and ORCID (0000-0001-5314-8816) — all linked in the header and footer." },
    { k: ["cv", "resume", "curriculum", "curriculo", "download cv"], a:
      "You can download his full CV from the 'Download CV' button in the header. It covers education, research experience, publications, funding, presentations and skills." },
    { k: ["robot", "mechatron", "robocup"], a:
      "Before chemistry, Gustavo trained as a Level-IV Mechatronics Technician at the Escola Profissional de Espinho (2013–2016) and built an autonomous robot for the RoboCupJunior Rescue Line — an experimental, problem-solving foundation he still draws on at the bench." },
    { k: ["researchgate", "scholar", "h-index", "citations", "number of publications", "how many publications", "how many papers", "quantas publicacoes", "quantos artigos"], a:
      "He has three peer-reviewed journal articles (2023–2025); his ResearchGate profile lists six research items in total, including conference contributions. You can see them on Google Scholar (user TTVIFykAAAAJ), ResearchGate and ORCID, all linked in the header." },
    { k: ["where is he", "where does he", "where is gustavo", "based in", "based between", "location", "lives in", "where do you live", "onde vive", "onde esta", "onde mora", "where is he based"], a:
      "He works between Lisbon/Seixal in Portugal (CQE–IST) and Paris in France (MNHN–IMPMC), and is originally from Ovar, Portugal." },
    { k: ["language", "languages", "portuguese", "english", "speak", "idioma", "lingua", "fala"], a:
      "Portuguese is his native language and he works in English at a C1 level." },
    { k: ["media", "interview", "news", "press", "noticia", "entrevista", "mare viva", "praca publica", "diferencial"], a:
      "He has been featured in Maré Viva (2025, 'O percurso improvável de Gustavo Maia levou-o de Ovar até à NASA'), Praça Pública (2024) and the IST student journal Diferencial (2024) — see the News section." },

    // --- General concepts in Gustavo's scientific fields (definitions) ---
    { k: ["astrobiology", "astrobiolog", "astrobiologia", "exobiology"], a:
      "Astrobiology is the science that studies the origin, evolution and distribution of life in the universe — how life began on Earth and whether it could exist elsewhere. It draws on chemistry, biology, geology and astronomy. Gustavo's PhD sits in this field: he studies the chemistry of organic molecules that are relevant to the origin of life and that are found in meteorites and returned space samples." },
    { k: ["prebiotic chemistry", "prebiotic", "prebiot", "quimica prebiotica", "building blocks of life"], a:
      "Prebiotic chemistry studies the chemical reactions that could have produced the building blocks of life (such as amino acids, sugars and nucleobases) on the early Earth, before biology existed. Gustavo works on how mechanical energy — from impacts and meteoritic entry — can synthesise or degrade these molecules, an alternative to the classic 'warm little pond' scenario." },
    { k: ["origin of life", "abiogenesis", "how life began", "first life", "origem da vida"], a:
      "The origin of life is the question of how living systems first arose from non-living chemistry. A central theme in Gustavo's work is how life's building blocks could have formed and survived in extreme, dry, high-energy environments, and how organics may have been delivered to the early Earth by meteorites — emphasising mechanical/impact-driven chemistry." },
    { k: ["meteorit", "meteor", "asteroid", "comet", "extraterrestrial organic", "returned sample", "carbonaceous chondrite", "space sample"], a:
      "Meteorites — especially carbonaceous chondrites — and samples returned from asteroids carry organic molecules formed in space. Studying them helps reveal what chemistry was available to the early Solar System and Earth. Gustavo investigates how mechanical events (parent-body processing, impacts, atmospheric entry) alter that organic matter, which is key to interpreting it correctly." }
  ];

  const FALLBACK =
    "Sorry, I'm not able to answer that. I can help with questions about Gustavo Pinho Maia — his research, publications, education, experience, presentations, funding, awards, tutoring, or how to get in touch — and with general topics in his fields (astrobiology, prebiotic chemistry, the origin of life, mechanochemistry, meteoritics). For anything else, email gustavopinho.maia@mnhn.fr.";

  const GREETING =
    "Hi! I'm an assistant for Gustavo Pinho Maia's site. Ask me anything about his research, CV, publications, or how to get in touch.";

  // Lower-case AND strip accents so e.g. "quimica" matches "química" and the
  // keyword lists (written without accents) match accented user input too.
  // The regex (combining-diacritical-marks block U+0300–U+036F) is built from a
  // string so no literal combining characters live in the source file.
  var DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(DIACRITICS, "");
  }

  // Offline matcher: score FAQ entries by keyword hits in the normalised
  // question. Keywords are deliberately specific (no bare "who/what/where"),
  // so a question we don't actually cover scores 0 and we return FALLBACK —
  // i.e. we say we can't answer instead of forcing an unrelated CV reply.
  function offlineAnswer(qRaw) {
    const q = norm(qRaw);
    if (!q.trim()) return FALLBACK;
    if (/^(hi|hello|hey|ola|bom dia|boa tarde|boa noite)\b/.test(q)) return GREETING;
    let best = null, bestScore = 0;
    for (const item of FAQ) {
      let score = 0;
      for (const kw of item.k) if (q.indexOf(norm(kw)) !== -1) score++;
      if (score > bestScore) { bestScore = score; best = item; }
    }
    return bestScore > 0 ? best.a : FALLBACK;
  }

  window.ASSISTANT_DATA = { PROFILE, FAQ, FALLBACK, GREETING, offlineAnswer };
})();
