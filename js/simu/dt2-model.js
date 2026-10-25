/*
 * Patient virtuel diabétique de type 2 : modèle simplifié, intégré jour par jour.
 *
 * Action de l'insuline IA = (sécrétion endogène B × effets des insulinosécréteurs et des incrétines
 * + insuline injectée) × sensibilité Si × effet de la metformine. Normale : IA = 1, glycémie moyenne
 * ≈ 0,95 g/L. Glycémie moyenne d'équilibre = 0,95 + 0,45 × (1/IA − 1)^0,6 ; les iSGLT2 retirent une
 * part de l'excès de glucose proportionnelle au DFG ; l'HbA1c suit la glycémie moyenne (formule ADAG)
 * avec une constante de temps d'environ 40 jours : elle ne se juge qu'à 3 mois.
 *
 * Facteurs prédictifs de réponse modélisés (complément, d'après la littérature) :
 * - HbA1c initiale : la baisse absolue est d'autant plus grande que l'HbA1c de départ est haute ;
 * - réserve insulinique (B, peptide C) : conditionne sulfamides, iDPP4 et aGLP1 ; elle décline avec la
 *   durée du diabète (échec secondaire), vite dans le LADA ;
 * - insulinorésistance (IMC) : besoins en insuline élevés, bénéfice de la perte de poids ;
 * - DFG : l'effet glycémique des iSGLT2 s'efface sous 45 mL/min ;
 * - origine d'Asie de l'Est : meilleure réponse aux incrétines ;
 * - MODY HNF1A : hypersensibilité aux sulfamides ; MODY GCK : glycémie de consigne, pas de traitement ;
 * - glucotoxicité : une hyperglycémie forte freine la sécrétion, réversible quand l'équilibre revient ;
 * - observance, intolérance digestive, perte de poids obtenue.
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const S = (HV.simu = HV.simu || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Paramètres calés sur le référentiel js/simu/dt2-ref.js (identifiants entre crochets) ; vérification :
  // node tools/calib-dt2.js.
  const P = {
    met: 0.5,       // effet maximal de la metformine à 2 g [met-mono, met-500, met-2000]
    metIns: 1.4,    // atténuation de la metformine sous insuline titrée [met-ins]
    metCo: 0.4,     // effets moins qu'additifs en association orale [met-addon]
    su: 0.85,       // effet des sulfamides, quasi plateau dès la dose faible [su-mono, su-dose]
    suExp: 0.15,
    suIns: 1.5,     // sulfamide atténué sous insuline [su-ins]
    dpp: 0.31,      // [dpp4]
    sglt25: 0.19, sglt10: 0.14, // [empa25-g2, empa10-g2] ; atténuation rénale [empa25-g3]
    acarb: 0.2,     // [acarb]
    insK: 1.2,      // U/kg/j d'insuline injectée équivalant à la sécrétion normale [basal-t2t]
    bCap: 0.45,     // saturation de l'effet de la basale (≈ 0,5 U/kg) : sur-basalisation [basal-t2t]
    wExp: 1.5,        // sensibilité à l'insuline ∝ (poids initial / poids)^wExp [lookahead]
    wlB: 16, wlDur: 6, // récupération de la fonction β après perte de poids si diabète récent [direct]
    coLife: 0.6,
    gtox: 0.3,      // glucotoxicité : levée d'autant plus marquée que l'HbA1c initiale est haute [base-a1c]
    gir: 0.5,       // glucotoxicité sur la sensibilité à l'insuline (Garvey 1985 ; Kramer 2013, HOMA-IR − 43 %, complément)
    gtTau: 7,       // constante de temps (j) de la glucotoxicité : levée en 2 à 3 semaines de normoglycémie
    loopK: 0.1,     // boucle fermée : part d'insuline ajoutée en corrections automatiques [2IQP]
    gtHi: 2.2,      // levée nulle au-dessus de cette glycémie moyenne, pleine vitesse sous 1,4 g/L [base-a1c]
    glpSec: 0.1,    // part sécrétoire des aGLP1 (glucodépendante, liée à la réserve) [sema-1, lira-18]
    glpX: 0.5,      // part non sécrétoire [sema5]
    glpW: 0.055     // perte de poids sous aGLP1 à dose pleine (fraction du poids) [sema-1-w]
  };

  const PROFILES = {
    sird: { label: 'DT2 insulinorésistant (obésité abdominale)', si: 0.55, rate: 0.03, bmiDep: true },
    sidd: { label: 'DT2 insulinopénique (sujet mince, HbA1c élevée)', si: 0.85, rate: 0.08, bmiDep: true },
    mard: { label: 'DT2 modéré du sujet âgé', si: 0.75, rate: 0.02, bmiDep: true },
    lada: { label: 'LADA (diabète auto-immun lent, anti-GAD positifs)', si: 0.9, rate: 0.5, gad: true },
    hnf1a: { label: 'MODY 3 (HNF1A)', si: 0.95, rate: 0.02, suBoost: 2.5 },
    gck: { label: 'MODY 2 (glucokinase)', si: 1, rate: 0, gck: true }
  };
  const ETHNIC = { eur: { label: 'Europe', incr: 1 }, asie: { label: 'Asie de l\'Est', incr: 1.8 }, afr: { label: 'Afrique subsaharienne', incr: 1 }, magh: { label: 'Maghreb', incr: 1 } };
  // Insulinosécréteurs : la dose (rx.su) est exprimée en équivalent gliclazide LM (120 mg = dose maximale) ;
  // efficacité comparable (− 1 % d'HbA1c environ). Glibenclamide : hypoglycémies plus fréquentes et prolongées
  // (métabolites actifs à élimination rénale), à éviter chez le sujet âgé ou si DFG < 60. Répaglinide : action
  // courte, pris avant chaque repas, élimination hépatique, utilisable en insuffisance rénale (complément ; item 247).
  const SUT = {
    glic: { name: 'Gliclazide LM (sulfamide)', short: 'gliclazide LM', unit: 'mg/j', doses: [30, 60, 90, 120], k: 1, hypo: 1 },
    glib: { name: 'Glibenclamide (Hémi-Daonil® 2,5 mg, Daonil® 5 mg)', short: 'glibenclamide', unit: 'mg/j', doses: [2.5, 5, 7.5, 10, 15], k: 8, hypo: 1.8 },
    repa: { name: 'Répaglinide (glinide, avant chaque repas)', short: 'répaglinide', unit: 'mg/j', doses: [1.5, 3, 6, 12], k: 10, hypo: 0.7, meal: true }
  };
  const suType = (rx) => SUT[rx.suType] || SUT.glic;
  // aGLP1 : fraction de l'effet maximal par palier (complément).
  const GLP1 = {
    none: { name: 'Aucun', doses: [] },
    // SUSTAIN 1 : 0,5 mg ≈ 90 % de l'effet de 1 mg [sema-05] ; dulaglutide 4,5 mg ≈ sémaglutide 1 mg
    // (comparaison indirecte), 0,75 mg ≈ 1,5 mg (AWARD-3) ; LEAD-3 : 1,2 mg ≈ 75 % de 1,8 mg [lira-12].
    // Sémaglutide 2 mg (SUSTAIN FORTE) non commercialisé en France (SFD 2025, avis 6 bis) : non proposé.
    sema: { name: 'Sémaglutide (Ozempic®), hebdomadaire', unit: 'mg/sem', doses: [0.25, 0.5, 1], frac: [0.2, 0.8, 0.9], step: 28, k: 1 },
    dula: { name: 'Dulaglutide (Trulicity®), hebdomadaire', unit: 'mg/sem', doses: [0.75, 1.5, 3, 4.5], frac: [0.65, 0.77, 0.82, 0.88], step: 28, k: 1 },
    lira: { name: 'Liraglutide (Victoza®), quotidien', unit: 'mg/j', doses: [0.6, 1.2, 1.8], frac: [0.3, 0.6, 0.8], step: 7, k: 0.54 },
    // AR GIP/GLP-1 (SURPASS-2 : 5/10/15 mg − 2,01/− 2,24/− 2,30 % contre − 1,86 % sous sémaglutide 1 mg) [tirz-15].
    tirz: { name: 'Tirzépatide (Mounjaro®), hebdomadaire — AR GIP/GLP-1', unit: 'mg/sem', doses: [2.5, 5, 7.5, 10, 12.5, 15], frac: [0.3, 0.72, 0.8, 0.86, 0.9, 0.93], step: 28, k: 1.45, wk: 1.9 }
  };
  const SGLT2 = { none: 'Aucun', dapa10: 'Dapagliflozine 10 mg', empa10: 'Empagliflozine 10 mg', empa25: 'Empagliflozine 25 mg' };
  const ALB = { normo: { label: 'Normale', rate: 0.8 }, micro: { label: 'Microalbuminurie (30–300 mg/24 h)', rate: 2.5 }, macro: { label: 'Protéinurie (> 300 mg/24 h)', rate: 5 } };
  const RETINO = { none: 'Pas de rétinopathie', min: 'RDNP minime ou modérée', severe: 'RDNP sévère (préproliférante)', prolif: 'Rétinopathie proliférante' };

  // Mesures hygiéno-diététiques : objectif d'activité (min/sem, 0 = inchangée), arrêt des boissons sucrées,
  // objectif de perte de poids (%), suivi diététique. Atteinte des objectifs = motivation du patient.
  const RX0 = { met: 0, su: 0, suType: 'glic', dpp4: 0, glp: 'none', glpDose: 0, sglt2: 'none', acarb: 0, basal: 0, basalType: 'g100', rapid: 0, rapidM: [0, 0, 0], act: 0, sodaStop: false, wtGoal: 0, diet: false };
  const MOTIV = { faible: 0.3, moyenne: 0.55, forte: 0.8 };
  const SNACK = { aucun: 0, modere: 0.015, important: 0.03 };
  // Effet de l'activité physique sur la sensibilité à l'insuline : effet seuil vers 150 min/sem
  // (Umpierre 2011 : − 0,89 % au-delà, − 0,36 % en deçà) [ex-150, ex-90].
  const fAct = (a) => 1 + 0.3 * Math.pow(Math.min(1, a / 150), 1.5) + 0.08 * Math.min(1, Math.max(0, a - 150) / 150);
  // Atteinte réelle des objectifs hygiéno-diététiques (meilleure avec un suivi diététique).
  function lifeAch(pt) { const p = pt.par; return Math.min(1, p.lifeAch * (pt.rx.diet ? 1.25 : 1) * (p.distress ? 0.5 : 1) * (p.work && p.work !== 'jour' ? 0.8 : 1)); }
  function actNow(pt) { const p = pt.par, a = pt.rx.act; return a > p.act0 ? p.act0 + (a - p.act0) * lifeAch(pt) : p.act0; }
  function sodaNow(pt) { return pt.rx.sodaStop ? pt.par.soda0 * (1 - lifeAch(pt)) : pt.par.soda0; }
  // Metformine : dose effectivement atteinte (introduction progressive : + 500 mg par semaine).
  function metDose(pt) {
    const r = pt.metRamp;
    if (!r) return pt.rx.met;
    const days = Math.ceil(Math.abs(r.to - r.from) / 500) * 7;
    return r.from + (r.to - r.from) * Math.min(1, (pt.day - r.start) / Math.max(1, days));
  }

  // Metformine : effet croissant jusqu'à 2 g ; 3 g n'apporte que peu de bénéfice supplémentaire
  // (SFD 2025, avis 8) [met-500, met-2000].
  const metCurve = (m) => Math.pow(Math.min(m, 2000) / 2000, 0.9) + 0.12 * Math.min(1, Math.max(0, m - 2000) / 1000);
  const mgOf = (IA) => (IA >= 1 ? Math.max(0.55, 0.95 - 0.3 * (IA - 1)) : 0.95 + 0.45 * Math.pow(1 / Math.max(IA, 0.02) - 1, 0.6));
  const a1cOf = (mg) => (mg * 100 + 46.7) / 28.7;

  function glpFrac(rx) {
    const G = GLP1[rx.glp];
    if (!G || !G.doses.length) return 0;
    const i = G.doses.indexOf(rx.glpDose);
    const f = i >= 0 ? G.frac[i] : 0;
    return f * G.k;
  }

  // Effets des traitements à un instant donné (doses effectivement prises).
  function effects(pt, MG) {
    const p = pt.par, s = pt.st, rx = pt.rx, take = pt.take;
    const a = p.adh;
    const met = take.met ? metDose(pt) * a : 0, su = take.su ? rx.su * a : 0;
    const gd = clamp((MG - 0.8) / 0.6, 0.15, 1); // effet glucodépendant des incrétines
    // Réserve insulinique faible (peptide C bas) : insulinosécréteurs et incrétines peu efficaces.
    const br = p.suBoost > 1 ? 1 : clamp(beta(pt) / 0.15, 0.5, 1);
    // Insuline injectée. La basale freine surtout la production hépatique de glucose : au-delà des besoins,
    // son effet sature (sur-basalisation, SFD 2025 avis 19) ; les bolus couvrent les repas.
    const iexB = rx.basal * a / (P.insK * pt.par.weight0), iexR = (rx.rapid + (rx.pump || 0)) * a / (P.insK * pt.par.weight0); // pompe : débit de base non saturé
    // Boucle fermée : corrections automatiques quand la glycémie monte (2IQP, NEJM 2025 : HbA1c − 0,9 contre − 0,3).
    const iexL = rx.device === 'loop' && rx.pump > 0 ? P.loopK * (iexB + iexR) * clamp((MG - 1.1) / 0.8, 0, 1) : 0;
    const iex = P.bCap * (1 - Math.exp(-iexB / P.bCap)) + iexR + iexL, iexRaw = iexB + iexR;
    const eSu = su > 0 ? P.su * Math.pow(Math.min(su, 120) / 120, P.suExp) * (p.suBoost || 1) * br / (1 + P.suIns * Math.min(1.5, iexB + iexR)) : 0;
    const eDpp = (rx.dpp4 > 0 ? P.dpp * Math.min(1, rx.dpp4 * a / 100) * p.incr : 0) * gd * br;
    const eGlp = (take.glp ? P.glpSec * glpFrac(rx) * a * p.incr * p.glpResp : 0) * gd * br;
    // Part de l'effet des aGLP1 indépendante de la sécrétion résiduelle (glucagon, vidange gastrique, satiété) :
    // elle persiste sous insuline (SUSTAIN 5) [sema5].
    const eGlpX = take.glp ? Math.min(0.8, P.glpX * glpFrac(rx) * a * p.glpResp * Math.sqrt(p.incr) * gd) : 0;
    return {
      eSu, eDpp, eGlp, eGlpX,
      eMet: P.met * metCurve(met) * p.metResp / (1 + P.metIns * Math.min(1.5, iexRaw) + P.metCo * (eSu + eDpp + eGlp)),
      sglt: rx.sglt2 !== 'none' ? (rx.sglt2 === 'empa25' ? P.sglt25 : P.sglt10) * clamp((s.dfg - 20) / 40, 0, 1) * a : 0,
      acarb: rx.acarb > 0 ? P.acarb * Math.min(1, rx.acarb / 300) * a : 0,
      iex, iexRaw
    };
  }

  // Réserve insulinique : déclin avec le temps ; une perte de poids importante dans un diabète récent
  // la restaure en partie (DiRECT : rémission d'autant plus fréquente que la perte est grande) [direct].
  function beta(pt) {
    const p = pt.par, loss = pt.st ? Math.max(0, (p.weight0 - pt.st.W) / p.weight0) : 0;
    const rec = 1 + P.wlB * loss * Math.max(0, 1 - (p.dur || 0) / P.wlDur);
    return p.B0 * Math.exp(-p.rate * pt.day / 365) * rec;
  }

  // Sensibilité à l'insuline (hors glucotoxicité) : profil, poids, activité.
  function siOf(pt) {
    const p = pt.par, s = pt.st;
    const gW = Math.pow(p.weight0 / s.W, P.wExp) - 1, gA = fAct(actNow(pt)) / fAct(p.act0) - 1;
    return p.Si0 * (1 + gW + gA - P.coLife * Math.max(0, Math.min(gW, gA)));
  }

  function targetMG(pt, MG) {
    const p = pt.par, s = pt.st;
    if (p.gck) return (p.gckSet || 1.3) - 0.05 * Math.min(1, effects(pt, MG).iex * 3);
    const e = effects(pt, MG);
    // Perte de poids et activité : gains de sensibilité moins qu'additifs (Umpierre : conseils d'activité
    // + régime ≈ − 0,6 %, proche de Look AHEAD) [lookahead].
    const si = siOf(pt);
    // Glucotoxicité : charge GT (g/L au-dessus de 1,8) qui suit la glycémie avec retard (s.GT, constante de
    // temps gtTau) ; elle freine la sécrétion et, au-delà d'environ 10 % d'HbA1c (effet quadratique), la sensibilité
    // à l'insuline. Sans état (calage), instantanée.
    const gt = s.GT != null ? s.GT : Math.max(0, MG - 1.8);
    const gtox = 1 / (1 + P.gtox * gt);
    const Bf = beta(pt) * gtox * (1 + e.eSu + e.eDpp + e.eGlp);
    const IA = (Bf + e.iex) * si / (1 + P.gir * gt * gt) * (1 + e.eMet);
    let m = mgOf(IA);
    if (m > 1) m = 1 + (m - 1) * (1 - e.sglt) * (1 - e.acarb) * (1 - e.eGlpX);
    // Boissons sucrées : charge glucidique directe (≈ 0,035 g/L de glycémie moyenne par verre quotidien, complément).
    // Sans sulfamide ni insuline, la contre-régulation empêche la glycémie de descendre sous la normale :
    // plancher vers 1,02 g/L (HbA1c ≈ 5,2 %), comme chez le non-diabétique.
    if (!(e.eSu > 0) && !(e.iex > 0)) m = Math.max(m, 1.02);
    // Peur de l'hypoglycémie : collations « de sécurité », glycémies maintenues hautes, davantage après un malaise.
    if (p.fear) m += 0.03 + (s.fearUntil > pt.day ? 0.08 : 0);
    return m + 0.035 * sodaNow(pt) + (p.mgOff || 0);
  }

  function create(c) {
    const real = c.variab === 'reel';
    const prof = PROFILES[c.profile];
    const bmi = c.weight / Math.pow(c.height / 100, 2);
    const par = {
      weight0: c.weight, height: c.height, age: c.age, sex: c.sex, rate: prof.rate * (real ? rnd(0.7, 1.4) : 1),
      suBoost: prof.suBoost || 1, gck: !!prof.gck, gad: !!prof.gad, incr: ETHNIC[c.ethnic].incr,
      metResp: real ? rnd(0.7, 1.25) : 1, glpResp: real ? rnd(0.7, 1.25) : 1, wResp: real ? rnd(0.6, 1.4) : 1,
      adh: { bonne: 1, moyenne: 0.75, peur: 0.95, detresse: 0.65 }[c.adh] || (real ? rnd(0.6, 1) : 1),
      // Peur de l'hypoglycémie (collations de sécurité, doses non montées), détresse psychologique, travail posté.
      fear: c.adh === 'peur', distress: c.adh === 'detresse', work: c.work || 'jour',
      // Variabilité glycémique propre au patient, et excursions post-prandiales plus amples si la sécrétion est faible.
      gv: real ? rnd(0.75, 1.35) : 1, gvSecr: { sidd: 1.45, lada: 1.5, gck: 0.5 }[c.profile] || 1,
      adhLife: real ? rnd(0.2, 1) : 0.6, giSens: real ? rnd(0, 1) : 0.5,
      albRate: ALB[c.alb].rate, retino: c.retino, hfail: c.hfail, cvd: c.cvd, panc: c.panc, mtc: c.mtc,
      mycoHist: c.myco, irregular: c.irregular, lowcarb: c.lowcarb, sbp0: c.sbp,
      dur: c.duration || 0, act0: c.act0 || 0, soda0: c.soda0 || 0, snack0: c.snack0 || 'aucun',
      lifeAch: real ? clamp(MOTIV[c.motiv || 'moyenne'] + rnd(-0.25, 0.2), 0.05, 1) : MOTIV[c.motiv || 'moyenne']
    };
    par.Si0 = prof.bmiDep ? prof.si * clamp(Math.pow(25 / bmi, 0.9), 0.35, 1.15) : prof.si;
    // À HbA1c égale, un diabète plus ancien a moins de réserve insulinique (complément).
    if (!prof.gck) par.Si0 *= 1 + 0.025 * Math.min(c.duration || 0, 20);
    const st = { MG: 1, A: c.a1c, W: c.weight, dfg: c.dfg, sbp: c.sbp, hypo: 0, hypoSev: 0, hypoAcc: 0, sevAcc: 0 };
    const pt = { par, st, day: 0, rx: Object.assign({}, RX0, c.rx0 || {}), take: { met: true, su: true, glp: true }, log: [], flags: {}, metRamp: null };
    // Calage sur l'HbA1c saisie, sous le traitement en cours : c'est une donnée du patient, le modèle
    // ajuste sa physiologie cachée pour la reproduire (et non l'inverse). D'abord la réserve insulinique ;
    // si même une réserve minimale donne une HbA1c trop basse (fortes doses d'insuline), c'est que le
    // patient est plus insulinorésistant que son profil : on cale alors la sensibilité à l'insuline.
    // Le poids saisi est le poids actuel, sous ce traitement : il est calé avant, pour un état d'équilibre.
    const targetMg = (c.a1c * 28.7 - 46.7) / 100;
    const eq = (m0) => { let m = m0; for (let k = 0; k < 40; k++) m = targetMG(pt, m); return m; };
    const fitWeight = () => { if (c.rx0) { st.MG = targetMg; par.weight0 = c.weight; par.weight0 = c.weight * c.weight / weightTarget(pt); } };
    const bisect = (set, lo, hi, increasing) => {
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; set(mid); const m = eq(targetMg); if ((m > targetMg) === increasing) hi = mid; else lo = mid; }
      set((lo + hi) / 2);
    };
    if (par.gck) { par.B0 = 0.9; par.gckSet = Math.max(1.05, Math.min(1.6, targetMg)); } // MODY 2 : glycémie de consigne
    else {
      fitWeight();
      const Si = par.Si0;
      par.B0 = 0.01;
      if (eq(targetMg) < targetMg - 0.01) {
        par.B0 = 0.03; // réserve résiduelle
        bisect((k) => { par.Si0 = Si * k; }, 0.03, 1, false);
        par.siFit = par.Si0 / Si;
      } else bisect((b) => { par.B0 = b; }, 0.01, 2, false);
      fitWeight();
    }
    // Verrou : si aucun réglage physiologique ne reproduit l'HbA1c saisie (traitements dont l'effet plafonne, comme
    // aGLP1 + iSGLT2 à HbA1c très haute), un écart résiduel inexpliqué est ajouté : l'HbA1c de départ est toujours
    // celle saisie.
    for (let k = 0; k < 6; k++) { const m = eq(targetMg); if (Math.abs(m - targetMg) < 0.002) break; par.mgOff = (par.mgOff || 0) + (targetMg - m); }
    st.MG = eq(targetMg); st.A = c.a1c; st.GT = Math.max(0, st.MG - 1.8);
    record(pt);
    return pt;
  }

  function weightTarget(pt) {
    const p = pt.par, s = pt.st, rx = pt.rx, e = effects(pt, s.MG);
    let d = 0;
    const ach = lifeAch(pt);
    let life = (rx.wtGoal / 100) * ach + SNACK[p.snack0] * (rx.diet ? ach : 0) + (rx.sodaStop ? 0.006 * p.soda0 * ach : 0) + (rx.act > p.act0 ? 0.01 * Math.min(1, (actNow(pt) - p.act0) / 150) : 0);
    d -= Math.min(life, 0.12); // perte de poids hygiéno-diététique plafonnée à 12 % (complément : Look AHEAD ≈ 9 % à 1 an)
    if (rx.met && pt.take.met) d -= 0.01;
    if (rx.su && pt.take.su) d += 0.025 * Math.min(1, rx.su / 120) * (e.iex > 0 ? 0.5 : 1); // moindre sous insuline
    d += 0.04 * Math.min(1, e.iexRaw);
    if (rx.glp !== 'none' && pt.take.glp) d -= (0.005 + P.glpW * glpFrac(rx) * (GLP1[rx.glp].wk ? GLP1[rx.glp].wk / GLP1[rx.glp].k : 1)) * p.wResp * p.adh;
    if (rx.sglt2 !== 'none') d -= 0.025;
    if (s.MG > 2.6) d -= 0.03 * (s.MG - 2.6); // catabolisme de l'hyperglycémie majeure
    return p.weight0 * (1 + d);
  }

  function stepDay(pt, rng) {
    const p = pt.par, s = pt.st;
    const tgt = targetMG(pt, s.MG);
    s.MG += (tgt - s.MG) * (1 - Math.exp(-1 / 5));
    gtStep(s);
    s.A += (a1cOf(s.MG) - s.A) * (1 - Math.exp(-1 / 40));
    s.W += (weightTarget(pt) - s.W) * (1 - Math.exp(-1 / 75));
    s.dfg -= (p.albRate * (pt.rx.sglt2 !== 'none' ? 0.5 : 1) * (pt.rx.glp !== 'none' ? 0.8 : 1)) / 365;
    s.sbp += (p.sbp0 - (pt.rx.sglt2 !== 'none' ? 4 : 0) - (pt.rx.glp !== 'none' ? 3 : 0) - 1 * (p.weight0 - s.W) - s.sbp) * (1 - Math.exp(-1 / 20));
    // Hypoglycémies : insulinosécréteurs et insuline, d'autant plus que la glycémie moyenne est basse.
    const e = effects(pt, s.MG);
    // Analogues d'action très prolongée (glargine U300, dégludec) : moins d'hypoglycémies nocturnes ; NPH : plus (SFD 2025, avis 18 bis).
    const insF = pt.rx.device === 'loop' ? 0.5 : pt.rx.pump > 0 ? 0.8 : { g300: 0.7, deg: 0.7, nph: 1.4 }[pt.rx.basalType] || 1;
    const sut = pt.rx.suType || 'glic', suR = suType(pt.rx).hypo * (sut === 'repa' ? 1 : (s.dfg < 45 ? 1.8 : 1) * (sut === 'glib' && s.dfg < 60 ? 1.5 : 1));
    const expo = 0.05 * e.eSu * (p.suBoost > 1 ? 2 : 1) * suR + 0.17 * e.iexRaw * (pt.rx.pump > 0 || pt.rx.rapid === 0 ? insF : 1);
    // Travail posté : horaires de repas et de sommeil décalés ; alternance : risque d'hypoglycémie × 1,6.
    const risk = (p.age >= 75 ? 2 : 1) * (p.irregular ? 2 : 1) * ({ nuit: 1.2, '2x8': 1.4, '3x8': 1.6 }[p.work] || 1);
    const lam = expo * risk * Math.exp(-(s.MG - 1.15) / 0.17);
    const sevFrac = 0.04 * (p.age >= 75 ? 2.5 : 1) * (s.dfg < 45 ? 2 : 1) * (pt.rx.su > 0 && pt.rx.suType === 'glib' ? 1.6 : 1);
    if (rng) { if (rng() < lam) s.hypo++; if (rng() < lam * sevFrac) s.hypoSev++; }
    else { s.hypoAcc += lam; s.sevAcc += lam * sevFrac; while (s.hypoAcc >= 1) { s.hypo++; s.hypoAcc -= 1; } if (s.sevAcc >= 1) { s.hypoSev++; s.sevAcc -= 1; } }
    pt.day += 1;
  }

  // Glucotoxicité : s'installe quand la glycémie moyenne dépasse 1,8 g/L ; ne se lève qu'avec une glycémie
  // proche de la normale (pleine vitesse sous 1,4 g/L, nulle au-dessus de 1,8) : 2 à 3 semaines de normoglycémie
  // (Weng 2008 ; Kramer 2013). D'où le cercle vicieux de l'HbA1c très haute : tant que la glycémie reste
  // au-dessus de 1,8 g/L, les besoins en insuline restent élevés.
  function gtStep(s) {
    if (s.GT == null) return;
    const tgt = Math.max(0, s.MG - 1.8), k = 1 - Math.exp(-1 / P.gtTau);
    if (tgt >= s.GT) s.GT += (tgt - s.GT) * k;
    else s.GT -= (s.GT - tgt) * k * clamp((P.gtHi - s.MG) / (P.gtHi - 1.4), 0, 1);
  }

  // Journée d'hospitalisation : la glycémie moyenne du jour vient de la simulation horaire (dt2-hosp.js).
  function hospDay(pt, mg) {
    const s = pt.st;
    s.MG = mg;
    s.A += (a1cOf(mg) - s.A) * (1 - Math.exp(-1 / 40));
    gtStep(s);
    s.W += (weightTarget(pt) - s.W) * (1 - Math.exp(-1 / 75));
    pt.day += 1;
    record(pt);
  }

  function record(pt) {
    const s = pt.st;
    pt.log.push({ day: pt.day, a1c: s.A, mg: s.MG, fpg: fpgOf(pt), w: s.W, dfg: s.dfg, met: pt.rx.met, su: pt.rx.su, ins: pt.rx.basal + (pt.rx.pump || 0) + pt.rx.rapid, glp: glpFrac(pt.rx) });
  }

  function advance(pt, days, onDay, rng) {
    for (let d = 0; d < days; d++) {
      stepDay(pt, rng);
      record(pt);
      if (onDay && onDay(pt) === false) return d + 1;
    }
    return days;
  }

  // Mesures (bruit analytique ± 3 %).
  function noise() { return 1 + (Math.random() - 0.5) * 0.06; }
  // Glycémie à jeun : l'insuline basale abaisse surtout la glycémie à jeun ; titrée à 1,00–1,15 g/L,
  // elle laisse une HbA1c proche de 7 % (Treat-to-Target) [basal-t2t].
  function fpgOf(pt) {
    const s = pt.st, p = pt.par;
    const basalShare = (pt.rx.basal + (pt.rx.pump || 0)) * p.adh / (P.insK * p.weight0);
    // Les bolus d'insuline rapide ne couvrent pas la nuit : la glycémie à jeun se calcule sans eux.
    // La nuit, seule la fin d'action du bolus du dîner joue : l'écart est plafonné à 0,25 g/L (sinon, sous gros
    // bolus, le réveil resterait haut quoi que fasse la basale).
    const mg = pt.rx.rapid > 0 ? s.MG + Math.min(0.25, Math.max(0, eqMG(pt, { rapid: 0, rapidM: [0, 0, 0] }) - eqMG(pt, {}))) : s.MG;
    // Au-delà de 0,6 U/kg, la basale continue d'abaisser la glycémie à jeun (sur-basalisation : réveil bas,
    // journée haute) alors que son effet sur la glycémie moyenne sature.
    return Math.max(0.5, mg * 0.9 + 0.04 - 0.5 * Math.min(1, 2 * basalShare) - 0.6 * Math.max(0, basalShare - 0.5));
  }
  function measure(pt) {
    const s = pt.st, rx = pt.rx, p = pt.par;
    const e = effects(pt, s.MG);
    const fpg = fpgOf(pt);
    const ppg = s.MG * 1.28 - 0.25 * Math.min(1, rx.rapid * p.adh / (0.3 * p.weight0)) - 0.12 * glpFrac(rx);
    const B = beta(pt);
    return {
      a1c: s.A * (1 + (Math.random() - 0.5) * 0.03), fpg: fpg * noise(), ppg: Math.max(fpg, ppg) * noise(), mg: s.MG,
      dfg: s.dfg * noise(), w: s.W, bmi: s.W / Math.pow(p.height / 100, 2),
      cpep: p.gck ? 2.2 : clamp(3.2 * B / Math.sqrt(p.Si0) * (1 / (1 + P.gtox * (s.GT != null ? s.GT : Math.max(0, s.MG - 1.8)))), 0.05, 6) * noise(),
      sbp: s.sbp, eff: e
    };
  }

  // Rejoue un essai du référentiel (js/simu/dt2-ref.js) : bras traité contre bras témoin sans
  // changement, patient théorique, observance bonne. Renvoie la valeur de la métrique demandée.
  const TRIAL_PT = { profile: 'sird', sex: 'M', age: 57, weight: 95, height: 172, a1c: 8.5, duration: 5, ethnic: 'eur', adh: 'bonne', alb: 'normo', retino: 'none', dfg: 90, sbp: 135, variab: 'theo', motiv: 'moyenne' };
  function trialArm(cfg, rx, days, opt) {
    const pt = create(Object.assign({}, TRIAL_PT, cfg));
    const w0 = pt.st.W, a0 = pt.st.A;
    Object.assign(pt.rx, rx || {});
    for (let d = 0; d < days; d++) {
      if (opt && opt.titrate && d > 0 && d % 3 === 0) {
        const f = fpgOf(pt);
        if (f > opt.titrate) pt.rx.basal += 2; else if (f < 0.8) pt.rx.basal = Math.max(0, pt.rx.basal - 2);
      }
      advance(pt, 1);
    }
    return { a1c: pt.st.A, dA: pt.st.A - a0, dW: pt.st.W - w0, basal: pt.rx.basal };
  }
  function trialEffect(t, cfg, rx) {
    const ctl = trialArm(cfg || t.cfg, {}, t.days), trt = trialArm(cfg || t.cfg, rx || t.rx, t.days, t.opt);
    return { dA: trt.a1c - ctl.a1c, raw: trt.dA, abs: trt.a1c, dW: trt.dW - ctl.dW, basal: trt.basal };
  }
  function replay(t) {
    if (t.metric === 'slope') {
      const [lo, hi] = t.a1cs.map((a) => trialEffect(t, Object.assign({}, t.cfg, { a1c: a })));
      return Object.assign({}, hi, { v: (hi.dA - lo.dA) / (t.a1cs[1] - t.a1cs[0]) });
    }
    if (t.metric === 'diff') { const a = trialEffect(t), b = trialEffect(t, null, t.rx2); return Object.assign({}, a, { v: a.dA - b.dA }); }
    const e = trialEffect(t);
    return Object.assign(e, { v: e[t.metric || 'dA'] });
  }

  // Glycémie moyenne d'équilibre si l'on modifiait l'ordonnance (sert à répartir l'effet des bolus
  // dans la journée, js/simu/glyco.js).
  function eqMG(pt, patch) {
    const save = pt.rx;
    pt.rx = Object.assign({}, save, patch);
    let m = pt.st.MG;
    for (let k = 0; k < 40; k++) m = targetMG(pt, m);
    pt.rx = save;
    return m;
  }

  S.dt2 = { SUT, suType, P, fpgOf, eqMG, hospDay, siOf, replay, PROFILES, ETHNIC, GLP1, SGLT2, ALB, RETINO, RX0, MOTIV, SNACK, metDose, lifeAch, actNow, sodaNow, create, advance, measure, effects, glpFrac, beta, a1cOf, clamp };
})();
