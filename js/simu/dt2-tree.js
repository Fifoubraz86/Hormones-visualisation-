/*
 * Arbre des décisions pour le patient en cours : chaque option thérapeutique possible à ce stade est
 * classée selon la prise de position SFD 2025 (de la meilleure à la pire), puis simulée 6 mois par le
 * modèle (HbA1c, poids, hypoglycémies). Pour les meilleures branches qui n'atteignent pas la cible, l'étape
 * suivante la mieux classée est simulée à son tour (chaîne de traitements).
 * Rang : 1 recommandé · 2 acceptable · 3 possible mais moins bon · 4 à éviter · 5 erreur.
 * Les simulations utilisent le patient tel qu'il est (physiologie cachée comprise), observance bonne,
 * aGLP1 et tirzépatide montés par paliers mensuels, insuline basale titrée sur la glycémie à jeun.
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const S = (HV.simu = HV.simu || {});
  const RANK = { 1: 'recommandé', 2: 'acceptable', 3: 'possible, moins bon', 4: 'à éviter', 5: 'erreur' };

  function ctxOf(pt, c, a1c) {
    const SFD = S.sfd, rx = pt.rx, dfg = pt.st.dfg;
    const T = SFD.target(c, rx, dfg);
    const ger = c.age >= 75 ? c.geria || 'bonne' : null;
    const onIns = rx.basal + rx.rapid > 0;
    const n = (rx.met > 0) + (rx.su > 0) + (rx.dpp4 > 0) + (rx.sglt2 !== 'none') + (rx.glp !== 'none') + (rx.acarb > 0);
    return { c, rx, dfg, a1c, T, ger, onIns, n, bmi: pt.st.W / Math.pow(c.height / 100, 2), cv: c.cvd || c.hcvr, hf: c.hfail, ckd: dfg < 60 || c.alb !== 'normo', fpg: S.dt2.fpgOf(pt), W: pt.st.W };
  }

  // Catalogue d'options : disponible ? classement SFD (rang, raison, avis) ; modification de l'ordonnance.
  const OPTIONS = [
    { id: 'none', name: 'Ne rien changer', ok: () => true,
      rate: (x) => (x.a1c > x.T.max + 0.2 ? [5, 'HbA1c au-dessus de la cible : inertie thérapeutique', 'avis 5'] : [1, 'objectif atteint : poursuivre, réévaluer à 3–6 mois', 'avis 5']), apply: () => {} },
    { id: 'rhd', name: 'Renforcer les mesures hygiéno-diététiques seules', ok: (x) => !x.rx.diet || !(x.rx.act >= 150),
      rate: (x) => (x.a1c <= x.T.max + 0.5 && x.n === 0 && !x.onIns ? [1, 'au diagnostic, mode de vie d\'abord, évalué à 3–6 mois', 'avis 8 ; HAS'] : x.a1c > x.T.max + 1 ? [4, 'seules, insuffisantes si l\'HbA1c est à plus d\'un point de la cible (à associer)', 'avis 4 et 8'] : [3, 'à associer à tout traitement, rarement suffisantes seules', 'avis 4']),
      apply: (rx) => { rx.act = Math.max(rx.act || 0, 150); rx.diet = true; rx.wtGoal = Math.max(rx.wtGoal || 0, 7); rx.sodaStop = true; } },
    { id: 'met', name: 'Metformine progressive jusqu\'à 2 g/j', ok: (x) => x.rx.met < 2000 && x.dfg >= 45,
      rate: (x) => (x.rx.met === 0 && (x.hf || x.ckd || x.cv) && x.rx.sglt2 === 'none' && x.rx.glp === 'none' ? [2, 'seule, elle ne protège ni le cœur ni le rein : l\'associer d\'emblée à un iSGLT2 ou un aGLP1', 'avis 8 et 11 à 13'] : [1, 'première intention médicamenteuse, doses progressives', 'avis 8 et 9']), apply: (rx) => { rx.met = 2000; } },
    { id: 'metSglt2', name: 'Metformine progressive + iSGLT2 d\'emblée', ok: (x) => x.rx.met === 0 && x.dfg >= 30 && x.rx.sglt2 === 'none',
      rate: (x) => (x.hf || x.ckd || x.cv ? [1, 'organe à protéger : bithérapie d\'emblée, quel que soit l\'HbA1c', 'avis 8 et 11 à 13'] : x.a1c >= 8.5 ? [1, 'HbA1c ≥ 8,5 % : bithérapie d\'emblée possible', 'avis 8 bis'] : [3, 'bithérapie d\'emblée sans indication particulière', 'avis 8']),
      apply: (rx) => { rx.met = 2000; rx.sglt2 = 'empa10'; } },
    { id: 'metGlp', name: 'Metformine progressive + sémaglutide d\'emblée', ok: (x) => x.rx.met === 0 && x.dfg >= 30 && x.rx.glp === 'none' && !x.c.panc && x.ger !== 'dependant',
      rate: (x) => ((x.hf || x.ckd) ? [2, 'l\'iSGLT2 d\'abord en cas d\'insuffisance cardiaque ou de maladie rénale', 'avis 12 ter et 13'] : x.cv || x.bmi >= 30 || x.c.masld ? [1, (x.cv ? 'bénéfice CV' : 'obésité ou MASLD') + ' : bithérapie d\'emblée, quel que soit l\'HbA1c', 'avis 8, 11, 14, 15'] : x.a1c >= 8.5 ? [1, 'HbA1c ≥ 8,5 % : bithérapie d\'emblée possible', 'avis 8 bis'] : [3, 'bithérapie d\'emblée sans indication particulière', 'avis 8']),
      apply: (rx, sim) => { rx.met = 2000; rx.glp = 'sema'; sim.plan = [0.25, 0.5, 1]; } },
    { id: 'met3', name: 'Monter la metformine à 3 g/j', ok: (x) => x.rx.met === 2000 && x.dfg >= 60,
      rate: () => [4, 'n\'apporte que peu par rapport à 2 g/j, plus de troubles digestifs', 'avis 8'], apply: (rx) => { rx.met = 3000; } },
    { id: 'sglt2', name: 'Ajouter un iSGLT2 (empagliflozine 10 mg)', ok: (x) => x.rx.sglt2 === 'none',
      rate: (x) => (x.dfg < 20 ? [5, 'DFG < 20 : pas d\'initiation', 'avis 12 bis'] : x.hf || x.ckd ? [1, 'protection cardiaque et rénale, quel que soit l\'HbA1c' + (x.dfg < 45 ? ' (effet glycémique réduit)' : ''), 'avis 12 ter et 13'] : x.cv ? [1, 'bénéfice cardiovasculaire démontré', 'avis 11'] : x.ger === 'dependant' ? [3, 'à discuter au cas par cas chez la personne dépendante', 'avis 21 bis'] : x.rx.met > 0 && x.n <= 2 ? [1, 'premier choix en ajout à la metformine (avec aGLP1 et tirzépatide)', 'avis 10'] : [2, 'option orale, effet modéré sur l\'HbA1c', 'avis 16 et 19']),
      apply: (rx) => { rx.sglt2 = 'empa10'; } },
    { id: 'sema', name: 'Ajouter le sémaglutide (paliers jusqu\'à 1 mg/sem)', ok: (x) => x.rx.glp === 'none',
      rate: (x) => (x.c.panc ? [5, 'antécédent de pancréatite', 'avis 6 bis'] : x.ger === 'dependant' ? [5, 'personne âgée dépendante : à éviter', 'avis 21 bis'] : (x.hf || x.ckd) && x.rx.sglt2 === 'none' ? [2, 'insuffisance cardiaque ou maladie rénale : l\'iSGLT2 d\'abord, l\'aGLP1 ensuite ou en cas d\'intolérance', 'avis 12 ter et 13'] : x.cv || x.bmi >= 30 || x.c.masld || (x.onIns && x.a1c > x.T.max) || x.a1c > x.T.max + 1 ? [1, [x.cv && 'bénéfice CV', x.bmi >= 30 && 'obésité', x.onIns && 'préféré aux bolus sous basale', x.a1c > x.T.max + 1 && 'HbA1c > cible + 1 point'].filter(Boolean).join(', '), 'avis 10, 11, 14, 19'] : x.ger === 'fragile' ? [3, 'personne fragile : risque de dénutrition', 'avis 21 bis'] : [1, 'premier choix en ajout à la metformine (avec iSGLT2 et tirzépatide)', 'avis 10']),
      apply: (rx, sim) => { rx.glp = 'sema'; rx.dpp4 = 0; sim.plan = [0.25, 0.5, 1]; } },
    { id: 'tirz', name: 'Ajouter ou passer au tirzépatide (paliers jusqu\'à 10 mg/sem)', ok: (x) => x.rx.glp !== 'tirz',
      rate: (x) => (x.c.panc ? [5, 'antécédent de pancréatite', 'avis 6 bis'] : x.ger === 'dependant' ? [5, 'personne âgée dépendante : à éviter', 'avis 21 bis'] : x.c.age >= 75 ? [3, 'expérience très limitée après 75 ans', 'avis 21 bis'] : (x.hf || x.ckd) && x.rx.sglt2 === 'none' ? [2, 'insuffisance cardiaque ou maladie rénale : l\'iSGLT2 d\'abord', 'avis 12 ter et 13'] : x.rx.glp !== 'none' && x.a1c > x.T.max ? [1, 'échec sous aGLP1 : passer au tirzépatide, plus efficace', 'avis 16 bis'] : x.bmi >= 30 || x.a1c > x.T.max + 1 || x.onIns ? [1, 'le plus efficace sur l\'HbA1c et le poids (non remboursé en 2025)', 'avis 6 bis, 10, 14'] : [2, 'efficace ; prix et absence de remboursement à discuter', 'avis 10']),
      apply: (rx, sim) => { rx.glp = 'tirz'; rx.dpp4 = 0; sim.plan = [2.5, 5, 7.5, 10]; } },
    { id: 'dpp4', name: 'Ajouter un iDPP4 (sitagliptine)', ok: (x) => !(x.rx.dpp4 > 0),
      rate: (x) => (x.rx.glp !== 'none' ? [5, 'association iDPP4 + aGLP1 sans objet', 'avis 20'] : x.ger === 'fragile' || x.ger === 'dependant' ? [1, 'personne âgée fragile ou dépendante : metformine + iDPP4 à privilégier', 'avis 21 bis'] : (x.cv || x.hf || x.ckd) && x.rx.sglt2 === 'none' ? [3, 'moins bon qu\'un iSGLT2 ou un aGLP1 à bénéfice démontré', 'avis 11 à 13'] : [2, 'deuxième rang après iSGLT2 et aGLP1 ; meilleure tolérance', 'avis 10']),
      apply: (rx, sim, x) => { rx.dpp4 = x.dfg < 30 ? 25 : x.dfg < 45 ? 50 : 100; } },
    { id: 'su', name: 'Ajouter un sulfamide (gliclazide LM 60 mg)', ok: (x) => !(x.rx.su > 0),
      rate: (x) => (x.dfg < 30 ? [5, 'contre-indiqué en IRC sévère', 'avis 12 bis'] : x.ger === 'dependant' ? [5, 'jamais chez la personne dépendante', 'avis 21 bis'] : x.onIns ? [5, 'pas de sulfamide sous insuline', 'avis 18 ter'] : x.ger === 'fragile' || x.c.driver || x.c.irregular || x.dfg < 60 ? [4, 'patient à risque d\'hypoglycémie', 'avis 16'] : [3, 'troisième rang : hypoglycémies, prise de poids', 'avis 10']),
      apply: (rx) => { rx.su = 60; } },
    { id: 'basal', name: 'Instaurer une insuline basale (10 U, titrée)', ok: (x) => !(x.rx.basal > 0),
      rate: (x) => (x.a1c >= 10 || x.cat ? [1, 'déséquilibre majeur : insuline', 'avis 8 bis'] : x.ger === 'dependant' || x.ger === 'fragile' ? [2, 'analogue lent en une injection si les orales ne suffisent pas', 'avis 21 bis'] : x.n >= 3 || x.rx.glp !== 'none' ? [2, 'après échec de la trithérapie ou de l\'aGLP1, en gardant la metformine', 'avis 16 bis et 17'] : [3, 'moins appropriée à ce stade qu\'un aGLP1 ou une trithérapie orale', 'avis 16']),
      apply: (rx, sim) => { rx.basal = 10; rx.su = 0; sim.titr = true; } },
    { id: 'basalUp', name: 'Augmenter la basale de 20 %', ok: (x) => x.rx.basal > 0,
      rate: (x) => (x.fpg <= 1.3 ? [5, 'glycémie à jeun déjà dans la cible : sur-basalisation', 'avis 19'] : x.rx.basal / x.W > 0.5 ? [4, 'basale > 0,5 U/kg : avis diabétologique, traiter plutôt la journée', 'avis 19'] : [1, 'glycémie à jeun au-dessus de la cible : poursuivre la titration', 'avis 18']),
      apply: (rx) => { rx.basal = Math.round(rx.basal * 1.2); } },
    { id: 'bolus', name: 'Ajouter un bolus au repas principal (4 U, titré)', ok: (x) => x.rx.basal > 0 && !(x.rx.rapid > 0),
      rate: (x) => (x.rx.glp === 'none' ? [2, 'possible, mais l\'aGLP1 ou le tirzépatide est préféré', 'avis 19'] : [1, 'après basale + aGLP1, si la journée reste haute', 'avis 19']),
      apply: (rx, sim) => { rx.rapidM = [0, 4, 0]; rx.rapid = 4; sim.titr = true; } },
    { id: 'bb', name: 'Passer en basal-bolus en ambulatoire (bolus 4 U à chaque repas, titrés)', ok: (x) => !(x.rx.rapid > 0) && (x.rx.basal > 0 || x.a1c >= 10),
      rate: (x) => (x.a1c >= 10 ? [2, 'intensification ambulatoire : efficace mais lente tant que la glucotoxicité persiste', 'avis 8 bis et 19'] : x.rx.glp === 'none' ? [3, 'l\'aGLP1 ou un seul bolus d\'abord', 'avis 19'] : [2, 'après basale + aGLP1 si la journée reste haute', 'avis 19']),
      apply: (rx, sim) => { if (!(rx.basal > 0)) rx.basal = 10; rx.su = 0; rx.rapidM = [4, 4, 4]; rx.rapid = 12; sim.titr = true; } },
    // Hospitalisation : pompe transitoire (protocole du service, js/simu/dt2-hosp.js), puis relais basal-bolus titré.
    { id: 'hosp', name: 'Hospitaliser : pompe à insuline 7 jours, puis relais basal-bolus titré', ok: (x) => x.a1c >= 9.5,
      rate: (x) => (x.a1c >= 10 && (x.onIns || x.n >= 2) ? [1, 'déséquilibre majeur malgré le traitement : la pompe lève la glucotoxicité en quelques jours (avis d\'expert dans le DT2 ancien)', 'avis 8 bis ; Weng 2008, Kramer 2013'] : x.a1c >= 10 || x.cat ? [2, 'déséquilibre majeur : intensification rapide, rémission possible au diagnostic', 'avis 8 bis ; Weng 2008, Kramer 2013'] : [3, 'possible, mais l\'intensification ambulatoire suffit souvent sous 10 %', 'avis 8 bis']),
      apply: (rx, sim) => { sim.hosp = true; sim.titr = true; } }
  ];

  // Simulation d'une option pendant `days` jours sur une copie du patient.
  function simulate(pt, opt, x, days) {
    const D = S.dt2;
    const cp = JSON.parse(JSON.stringify(Object.assign({}, pt, { log: [] })));
    cp.rx.rapidM = (cp.rx.rapidM || [0, 0, 0]).slice();
    cp.take = { met: true, su: true, glp: true };
    cp.metRamp = null;
    // Doses d'insuline fixes, sauf option qui instaure une insuline (titrée) ; baisse de sécurité si la glycémie à jeun < 0,80 g/L.
    const sim = { plan: null, titr: false };
    const w0 = cp.st.W, h0 = cp.st.hypo, s0 = cp.st.hypoSev;
    opt.apply(cp.rx, sim, x);
    let above = 0, d0 = 0;
    if (sim.hosp && S.dt2hosp) {
      const r = S.dt2hosp.run(cp, D, S.glyco, { days: 7 }, 4242);
      cp.rx.basal = r.relay.basal; cp.rx.rapidM = r.relay.rapidM.slice(); cp.rx.rapid = cp.rx.rapidM.reduce((a, u) => a + u, 0); cp.rx.su = 0;
      d0 = 7;
    }
    for (let d = d0; d < days; d++) {
      if (sim.plan) cp.rx.glpDose = sim.plan[Math.min(sim.plan.length - 1, Math.floor(d / 28))];
      cp.par.adh = 1;
      D.advance(cp, 1);
      // Titration simplifiée : basale sur la glycémie à jeun (0,80–1,20 g/L), bolus sur la glycémie moyenne.
      if (cp.rx.basal > 0 && d % 3 === 2) {
        const f = D.fpgOf(cp);
        if (!sim.titr) { if (f < 0.8) cp.rx.basal = Math.max(0, cp.rx.basal - 2); continue; }
        if (f > 1.2) { cp.rx.basal += cp.rx.basal < 10 ? 1 : 2; above++; } else if (f < 0.8) cp.rx.basal = Math.max(0, cp.rx.basal - 2);
        if (cp.rx.rapid > 0 && f <= 1.2) { const k = cp.st.MG > 1.5 ? 1 : cp.st.MG < 1.15 ? -1 : 0; cp.rx.rapidM = cp.rx.rapidM.map((u) => (u > 0 ? Math.max(1, u + k) : u)); cp.rx.rapid = cp.rx.rapidM.reduce((a, u) => a + u, 0); }
      }
    }
    return { pt: cp, a1c: cp.st.A, dW: cp.st.W - w0, hypo: cp.st.hypo - h0, sev: cp.st.hypoSev - s0, basal: cp.rx.basal, rapid: cp.rx.rapid };
  }

  function rank(pt, c, a1c) {
    const x = ctxOf(pt, c, a1c);
    x.cat = pt.st.MG > 3;
    const noMet = x.rx.met === 0 && x.dfg >= 30 && !c.metIntol;
    return OPTIONS.filter((o) => o.ok(x)).map((o) => {
      let [r, why, src] = o.rate(x);
      // Sans metformine (ni contre-indication ni intolérance), une monothérapie par une autre classe n'est pas le
      // premier choix : la metformine d'abord, ou en association d'emblée (avis 8, 9 et 20).
      if (noMet && ['sema', 'tirz', 'sglt2', 'dpp4', 'su', 'basal'].includes(o.id) && !(o.id === 'basal' && (x.a1c >= 10 || x.cat))) { r = Math.max(r, 3); why = 'sans metformine, alors qu\'elle est possible : l\'associer plutôt (monothérapie réservée à l\'intolérance ou à la contre-indication) ; ' + why; src = 'avis 8 et 20 ; ' + src; }
      return { o, r, why, src, x };
    });
  }

  // Arbre : niveau 1 (toutes les options, 6 mois), niveau 2 (meilleure suite pour les 3 meilleures branches).
  function build(pt, c, opts) {
    const days = (opts && opts.days) || 182;
    const a1c = pt.st.A;
    const lvl1 = rank(pt, c, a1c).map((b) => Object.assign(b, { res: simulate(pt, b.o, b.x, days) }));
    // À rang égal : écart à la cible (au-dessus, ou trop bas sous traitement hypoglycémiant), hypoglycémies, poids.
    const sc = (b) => { const lim = b.x.T.floor || (b.x.T.max - 1.5); return (b.res.a1c > b.x.T.max ? b.res.a1c - b.x.T.max : b.res.a1c < lim ? 0.5 * (lim - b.res.a1c) : 0) + 0.05 * b.res.hypo + 0.5 * b.res.sev + 0.01 * b.res.dW; };
    lvl1.sort((p, q) => p.r - q.r || sc(p) - sc(q));
    lvl1.slice(0, 3).forEach((b) => {
      if (b.o.id === 'none' || b.res.a1c <= b.x.T.max) return;
      const next = rank(b.res.pt, c, b.res.a1c).filter((n) => n.o.id !== 'none').sort((p, q) => p.r - q.r)[0];
      if (next) b.next = Object.assign(next, { res: simulate(b.res.pt, next.o, next.x, days) });
    });
    return { a1c, T: S.sfd.target(c, pt.rx, pt.st.dfg), branches: lvl1, days };
  }

  const byId = (id) => OPTIONS.find((o) => o.id === id);
  S.dt2tree = { build, rank, simulate, byId, ctxOf, RANK, OPTIONS };
})();
