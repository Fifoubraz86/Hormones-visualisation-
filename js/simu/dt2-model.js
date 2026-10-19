/*
 * Patient virtuel diabétique de type 2 : modèle simplifié, intégré jour par jour.
 *
 * Action de l'insuline IA = (sécrétion endogène B × effets des insulinosécréteurs et des incrétines
 * + insuline injectée) × sensibilité Si × effet de la metformine. Normale : IA = 1, glycémie moyenne
 * ≈ 0,95 g/L. Glycémie moyenne d'équilibre = 0,95 + 0,45 × (1/IA − 1)^0,6 ; les iSGLT2 retirent une
 * part de l'excès de glucose proportionnelle au DFG ; l'HbA1c suit la glycémie moyenne (formule ADAG)
 * avec une constante de temps d'environ 30 jours : elle ne se juge qu'à 3 mois.
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

  const PROFILES = {
    sird: { label: 'DT2 insulinorésistant (obésité abdominale)', si: 0.55, rate: 0.03, bmiDep: true },
    sidd: { label: 'DT2 insulinopénique (sujet mince, HbA1c élevée)', si: 0.85, rate: 0.08, bmiDep: true },
    mard: { label: 'DT2 modéré du sujet âgé', si: 0.75, rate: 0.02, bmiDep: true },
    lada: { label: 'LADA (diabète auto-immun lent, anti-GAD positifs)', si: 0.9, rate: 0.5, gad: true },
    hnf1a: { label: 'MODY 3 (HNF1A)', si: 0.95, rate: 0.02, suBoost: 5 },
    gck: { label: 'MODY 2 (glucokinase)', si: 1, rate: 0, gck: true }
  };
  const ETHNIC = { eur: { label: 'Europe', incr: 1 }, asie: { label: 'Asie de l\'Est', incr: 1.4 }, afr: { label: 'Afrique subsaharienne', incr: 1 }, magh: { label: 'Maghreb', incr: 1 } };
  // aGLP1 : fraction de l'effet maximal par palier (complément).
  const GLP1 = {
    none: { name: 'Aucun', doses: [] },
    sema: { name: 'Sémaglutide (Ozempic®), hebdomadaire', unit: 'mg/sem', doses: [0.25, 0.5, 1, 2], frac: [0.15, 0.5, 0.85, 1], step: 28 },
    dula: { name: 'Dulaglutide (Trulicity®), hebdomadaire', unit: 'mg/sem', doses: [0.75, 1.5, 3, 4.5], frac: [0.45, 0.65, 0.8, 0.9], step: 28 },
    lira: { name: 'Liraglutide (Victoza®), quotidien', unit: 'mg/j', doses: [0.6, 1.2, 1.8], frac: [0.25, 0.6, 0.75], step: 7 }
  };
  const SGLT2 = { none: 'Aucun', dapa10: 'Dapagliflozine 10 mg', empa10: 'Empagliflozine 10 mg', empa25: 'Empagliflozine 25 mg' };
  const ALB = { normo: { label: 'Normale', rate: 0.8 }, micro: { label: 'Microalbuminurie (30–300 mg/24 h)', rate: 2.5 }, macro: { label: 'Protéinurie (> 300 mg/24 h)', rate: 5 } };
  const RETINO = { none: 'Pas de rétinopathie', min: 'RDNP minime ou modérée', severe: 'RDNP sévère (préproliférante)', prolif: 'Rétinopathie proliférante' };

  const RX0 = { met: 0, su: 0, dpp4: 0, glp: 'none', glpDose: 0, sglt2: 'none', acarb: 0, basal: 0, rapid: 0, mhd: false };

  const mgOf = (IA) => (IA >= 1 ? Math.max(0.55, 0.95 - 0.3 * (IA - 1)) : 0.95 + 0.45 * Math.pow(1 / Math.max(IA, 0.02) - 1, 0.6));
  const a1cOf = (mg) => (mg * 100 + 46.7) / 28.7;

  function glpFrac(rx) {
    const G = GLP1[rx.glp];
    if (!G || !G.doses.length) return 0;
    const i = G.doses.indexOf(rx.glpDose);
    const f = i >= 0 ? G.frac[i] : 0;
    return f * (rx.glp === 'sema' ? 1 : rx.glp === 'dula' ? 0.85 : 0.8);
  }

  // Effets des traitements à un instant donné (doses effectivement prises).
  function effects(pt, MG) {
    const p = pt.par, s = pt.st, rx = pt.rx, take = pt.take;
    const a = p.adh;
    const met = take.met ? rx.met * a : 0, su = take.su ? rx.su * a : 0;
    const gd = clamp((MG - 0.8) / 0.6, 0.15, 1); // effet glucodépendant des incrétines
    // Réserve insulinique faible (peptide C bas) : insulinosécréteurs et incrétines peu efficaces.
    const br = p.suBoost > 1 ? 1 : clamp(beta(pt) / 0.3, 0.3, 1);
    return {
      eMet: 0.55 * Math.pow(Math.min(met, 3000) / 2000, 0.7) * p.metResp,
      eSu: 0.7 * Math.pow(Math.min(su, 120) / 120, 0.6) * (p.suBoost || 1) * br,
      eDpp: (rx.dpp4 > 0 ? 0.28 * Math.min(1, rx.dpp4 * a / 100) * p.incr : 0) * gd * br,
      eGlp: (take.glp ? 0.95 * glpFrac(rx) * a * p.incr * p.glpResp : 0) * gd * br,
      sglt: rx.sglt2 !== 'none' ? (rx.sglt2 === 'empa25' ? 0.27 : 0.25) * clamp((s.dfg - 25) / 45, 0, 1) * a : 0,
      acarb: rx.acarb > 0 ? 0.12 * Math.min(1, rx.acarb / 300) * a : 0,
      iex: (rx.basal + rx.rapid) * a / (0.5 * pt.par.weight0)
    };
  }

  function beta(pt) { return pt.par.B0 * Math.exp(-pt.par.rate * pt.day / 365); }

  function targetMG(pt, MG) {
    const p = pt.par, s = pt.st;
    if (p.gck) return 1.3 - 0.05 * Math.min(1, effects(pt, MG).iex * 3);
    const e = effects(pt, MG);
    const si = p.Si0 * Math.pow(p.weight0 / s.W, 2.5) * (pt.rx.mhd && p.adhLife > 0.5 ? 1.06 : 1);
    const gtox = 1 / (1 + 0.18 * Math.max(0, MG - 1.8));
    const Bf = beta(pt) * gtox * (1 + e.eSu + e.eDpp + e.eGlp);
    const IA = (Bf + e.iex) * si * (1 + e.eMet);
    let m = mgOf(IA);
    if (m > 1) m = 1 + (m - 1) * (1 - e.sglt) * (1 - e.acarb);
    return m;
  }

  function create(c) {
    const real = c.variab === 'reel';
    const prof = PROFILES[c.profile];
    const bmi = c.weight / Math.pow(c.height / 100, 2);
    const par = {
      weight0: c.weight, height: c.height, age: c.age, sex: c.sex, rate: prof.rate * (real ? rnd(0.7, 1.4) : 1),
      suBoost: prof.suBoost || 1, gck: !!prof.gck, gad: !!prof.gad, incr: ETHNIC[c.ethnic].incr,
      metResp: real ? rnd(0.7, 1.25) : 1, glpResp: real ? rnd(0.7, 1.25) : 1, wResp: real ? rnd(0.6, 1.4) : 1,
      adh: c.adh === 'bonne' ? 1 : c.adh === 'moyenne' ? 0.75 : real ? rnd(0.6, 1) : 1,
      adhLife: real ? rnd(0.2, 1) : 0.6, giSens: real ? rnd(0, 1) : 0.5,
      albRate: ALB[c.alb].rate, retino: c.retino, hfail: c.hfail, cvd: c.cvd, panc: c.panc, mtc: c.mtc,
      mycoHist: c.myco, irregular: c.irregular, lowcarb: c.lowcarb, sbp0: c.sbp
    };
    par.Si0 = prof.bmiDep ? prof.si * clamp(Math.pow(25 / bmi, 0.9), 0.35, 1.15) : prof.si;
    // À HbA1c égale, un diabète plus ancien a moins de réserve insulinique (complément).
    if (!prof.gck) par.Si0 *= 1 + 0.025 * Math.min(c.duration || 0, 20);
    const st = { MG: 1, A: c.a1c, W: c.weight, dfg: c.dfg, sbp: c.sbp, hypo: 0, hypoSev: 0, hypoAcc: 0, sevAcc: 0 };
    const pt = { par, st, day: 0, rx: Object.assign({}, RX0), take: { met: true, su: true, glp: true }, log: [], flags: {} };
    // Réserve insulinique calée sur l'HbA1c initiale, sans traitement.
    if (par.gck) par.B0 = 0.9;
    else {
      const targetMg = (c.a1c * 28.7 - 46.7) / 100;
      let lo = 0.01, hi = 2;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2; par.B0 = mid;
        let m = targetMg; for (let k = 0; k < 30; k++) m = targetMG(pt, m);
        if (m > targetMg) lo = mid; else hi = mid;
      }
      par.B0 = (lo + hi) / 2;
    }
    let m = 1.5; for (let k = 0; k < 60; k++) m = targetMG(pt, m);
    st.MG = m; st.A = a1cOf(m);
    record(pt);
    return pt;
  }

  function weightTarget(pt) {
    const p = pt.par, s = pt.st, rx = pt.rx, e = effects(pt, s.MG);
    let d = 0;
    if (rx.mhd) d -= 0.05 * p.adhLife;
    if (rx.met && pt.take.met) d -= 0.01;
    if (rx.su && pt.take.su) d += 0.025 * Math.min(1, rx.su / 120);
    d += 0.04 * Math.min(1, e.iex);
    if (rx.glp !== 'none' && pt.take.glp) d -= (0.03 + 0.06 * glpFrac(rx)) * p.wResp * p.adh;
    if (rx.sglt2 !== 'none') d -= 0.025;
    if (s.MG > 2.6) d -= 0.03 * (s.MG - 2.6); // catabolisme de l'hyperglycémie majeure
    return p.weight0 * (1 + d);
  }

  function stepDay(pt, rng) {
    const p = pt.par, s = pt.st;
    const tgt = targetMG(pt, s.MG);
    s.MG += (tgt - s.MG) * (1 - Math.exp(-1 / 5));
    s.A += (a1cOf(s.MG) - s.A) * (1 - Math.exp(-1 / 40));
    s.W += (weightTarget(pt) - s.W) * (1 - Math.exp(-1 / 75));
    s.dfg -= (p.albRate * (pt.rx.sglt2 !== 'none' ? 0.5 : 1) * (pt.rx.glp !== 'none' ? 0.8 : 1)) / 365;
    s.sbp += (p.sbp0 - (pt.rx.sglt2 !== 'none' ? 4 : 0) - (pt.rx.glp !== 'none' ? 3 : 0) - 1 * (p.weight0 - s.W) - s.sbp) * (1 - Math.exp(-1 / 20));
    // Hypoglycémies : insulinosécréteurs et insuline, d'autant plus que la glycémie moyenne est basse.
    const e = effects(pt, s.MG);
    const expo = 0.05 * e.eSu * (p.suBoost > 1 ? 2 : 1) * (s.dfg < 45 ? 1.8 : 1) + 0.07 * e.iex;
    const risk = (p.age >= 75 ? 2 : 1) * (p.irregular ? 2 : 1);
    const lam = expo * risk * Math.exp(-(s.MG - 1.15) / 0.17);
    const sevFrac = 0.04 * (p.age >= 75 ? 2.5 : 1) * (s.dfg < 45 ? 2 : 1);
    if (rng) { if (rng() < lam) s.hypo++; if (rng() < lam * sevFrac) s.hypoSev++; }
    else { s.hypoAcc += lam; s.sevAcc += lam * sevFrac; while (s.hypoAcc >= 1) { s.hypo++; s.hypoAcc -= 1; } if (s.sevAcc >= 1) { s.hypoSev++; s.sevAcc -= 1; } }
    pt.day += 1;
  }

  function record(pt) {
    const s = pt.st;
    pt.log.push({ day: pt.day, a1c: s.A, mg: s.MG, w: s.W, dfg: s.dfg, met: pt.rx.met, su: pt.rx.su, ins: pt.rx.basal + pt.rx.rapid, glp: glpFrac(pt.rx) });
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
  function measure(pt) {
    const s = pt.st, rx = pt.rx, p = pt.par;
    const e = effects(pt, s.MG);
    const basalShare = rx.basal * p.adh / (0.5 * p.weight0);
    const fpg = Math.max(0.5, s.MG * 0.9 - 0.12 * Math.min(1, basalShare) + 0.04);
    const ppg = s.MG * 1.28 - 0.25 * Math.min(1, rx.rapid * p.adh / (0.3 * p.weight0)) - 0.12 * glpFrac(rx);
    const B = beta(pt);
    return {
      a1c: s.A * (1 + (Math.random() - 0.5) * 0.03), fpg: fpg * noise(), ppg: Math.max(fpg, ppg) * noise(), mg: s.MG,
      dfg: s.dfg * noise(), w: s.W, bmi: s.W / Math.pow(p.height / 100, 2),
      cpep: p.gck ? 2.2 : clamp(3.2 * B / Math.sqrt(p.Si0) * (1 / (1 + 0.18 * Math.max(0, s.MG - 1.8))), 0.05, 6) * noise(),
      sbp: s.sbp, eff: e
    };
  }

  S.dt2 = { PROFILES, ETHNIC, GLP1, SGLT2, ALB, RETINO, RX0, create, advance, measure, effects, glpFrac, beta, a1cOf, clamp };
})();
