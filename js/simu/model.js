/*
 * Patient virtuel : modèle pharmacologique simplifié de la thyroïde, intégré jour par jour.
 * Grandeurs normalisées (1 = sujet euthyroïdien), converties en unités de laboratoire à la lecture.
 *
 * - Thyroïde : un stock intrathyroïdien G (≈ 40 jours de sécrétion) est rempli par la synthèse
 *   (bloquée par les ATS) et vidé par la sécrétion, stimulée par la TSH et les TRAb. D'où le délai de
 *   3 à 6 semaines avant que la T4L ne baisse sous ATS (complément).
 * - T4 plasmatique : demi-vie ≈ 7 jours (plus courte en thyrotoxicose) ; état d'équilibre en 5 à 6
 *   semaines après un changement de dose de lévothyroxine (complément).
 * - TSH : relation log-linéaire avec la T4L, plus une « mémoire » de freinage : après une
 *   thyrotoxicose, la TSH reste basse plusieurs semaines alors que la T4L est normalisée (complément).
 * - TRAb : décroissent sous ATS (vite chez les patients qui entreront en rémission), remontent à
 *   l'arrêt chez ceux qui rechutent (complément).
 * - Autonomie nodulaire (par.auto : adénome toxique, GMNT) : synthèse indépendante de la TSH, bloquée
 *   par les ATS mais sans rémission (item 242, SFE p. 17-18).
 * - Thyroïdite (par.lysis : De Quervain, post-partum) : libération du stock par lyse (thyrotoxicose que
 *   les ATS ne corrigent pas), synthèse détruite puis récupérée en 2 à 3 mois, ou pas (item 242-243).
 * - hCG (par.hcg) : stimulation du récepteur de la TSH au 1er trimestre, pic vers 10 SA (item 242, SFE p. 13).
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const S = (HV.simu = HV.simu || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const LN2 = Math.LN2;
  const KR = 1 / 40;

  // Équivalence en carbimazole : 10 mg de carbimazole ≈ 6 mg de thiamazole ≈ 100 mg de PTU (complément).
  const ATS = {
    none: { name: 'Aucun', eq: 0 },
    cbz: { name: 'Carbimazole (Néomercazole®)', short: 'carbimazole', eq: 1, unit: 'mg/j', doses: [5, 10, 15, 20, 25, 30, 40, 50, 60] },
    tmz: { name: 'Thiamazole (Thyrozol®)', short: 'thiamazole', eq: 1 / 0.6, unit: 'mg/j', doses: [2.5, 5, 7.5, 10, 15, 20, 25, 30, 40] },
    ptu: { name: 'Propylthiouracile (PTU)', short: 'PTU', eq: 0.1, unit: 'mg/j', doses: [50, 100, 150, 200, 250, 300, 400, 600] }
  };
  const LT4_DOSES = [0, 12.5, 25, 37.5, 50, 62.5, 75, 88, 100, 112, 125, 137, 150, 175, 200, 250];
  const BB = {
    none: { name: 'Aucun', hr: 0 },
    pro80: { name: 'Propranolol 40 mg × 2/j', hr: 0.17 },
    pro120: { name: 'Propranolol 40 mg × 3/j', hr: 0.24 },
    ate50: { name: 'Aténolol 50 mg/j (cardiosélectif)', hr: 0.2 }
  };

  function atsEq(rx) { return rx.ats && rx.ats !== 'none' ? rx.atsDose * ATS[rx.ats].eq : 0; }

  // Paramètres par défaut d'un patient ; chaque cas en surcharge une partie.
  const BASE = {
    weight: 70, r: 1, auto: 0, lysis: null, hcg: null, trab: 0, kTr: 0.32, trabFloor: 0.3, trabTau: 120, relapse: false, trabRelapse: 0,
    ec50: 9, pit: 1, abs: 1, pnn: 3.5, need: null, hr0: 72
  };

  function create(def) {
    const par = Object.assign({}, BASE, def.par);
    const st = { G: 40 * par.r, T4: 1, T3: 1, TSH: 1.5, R: 1, TRAb: par.trab, W: par.weight, pnn: par.pnn, offDay: null };
    const pt = { par, st, day: 0, rx: Object.assign({ ats: 'none', atsDose: 0, lt4: 0, bb: 'none', hc: false }, def.rx0 || {}), log: [], flags: {} };
    // Mise à l'équilibre de la maladie avant la première consultation (TRAb figés).
    for (let i = 0; i < 500; i++) stepDay(pt, true);
    pt.day = 0; pt.log = [];
    record(pt);
    return pt;
  }

  // Pendant la mise à l'équilibre (frozen), les fonctions du temps sont évaluées à J0.
  function need(pt, day) { return pt.par.need ? pt.par.need(day) : 1; }

  function stepDay(pt, frozen) {
    const p = pt.par, s = pt.st, rx = pt.rx;
    const eq = atsEq(rx);
    const B = eq > 0 ? Math.min(0.97, eq / (eq + p.ec50)) : 0;
    const ptu = rx.ats === 'ptu' ? Math.min(1, rx.atsDose / 300) : 0;
    const day = frozen ? 0 : pt.day;
    const lt4In = (rx.lt4 * p.abs * (rx.lt4Abs ?? 1)) / (1.6 * p.weight) / need(pt, day);
    const hcg = p.hcg ? p.hcg(day) : 0;
    let rEff = p.r, kLys = 0;
    if (p.lysis) {
      const t = day - p.lysis.day0;
      if (t >= 0) { kLys = p.lysis.k; rEff = p.r * p.lysis.final * (1 - Math.exp(-t / p.lysis.rec)); }
    }
    const H = 4;
    for (let k = 0; k < H; k++) {
      const h = 1 / H;
      const bio = 0.45 + 0.55 * Math.min(1, p.pit);
      const tshF = Math.min(4, Math.pow(Math.max(0, s.TSH * bio) / 1.5, 0.3));
      const stim = tshF + p.kTr * s.TRAb + hcg;
      const syn = (rEff * stim + p.auto) * (1 - B);
      // Lyse : les follicules détruits libèrent leur contenu (réservoir s.L), indépendamment de la TSH.
      const relL = kLys * (s.L || 0);
      if (relL) s.L -= relL * h;
      const rel = KR * (stim + p.auto) * s.G + relL;
      s.G = Math.max(0, s.G + (syn - rel) * h);
      const kel = (LN2 / 7) * Math.pow(Math.max(0.3, s.T3), 0.35);
      s.T4 += (rel + lt4In - s.T4) * (1 - Math.exp(-kel * h));
      const conv = 1 - 0.15 * ptu;
      const t3t = 0.75 * conv * s.T4 + 0.25 * rel * (1 + 0.12 * Math.max(0, stim - 1));
      s.T3 += (t3t - s.T3) * (1 - Math.exp(-h / 1));
      const fb = 0.7 * s.T4 + 0.3 * s.T3;
      const raw = 1.5 * p.pit * Math.pow(Math.max(fb, 0.05), -6.6);
      const cap = 120 * p.pit * p.pit;
      const tshEq = (raw * cap) / (raw + cap);
      const rT = fb > 1.35 ? 0.03 : 1;
      const rTau = fb > 1.35 ? 12 : fb < 0.85 ? 20 : 45;
      s.R += (rT - s.R) * (1 - Math.exp(-h / rTau));
      // La cellule thyréotrope s'adapte lentement : la TSH met 6 à 8 semaines à se stabiliser (complément).
      const tshT = tshEq * s.R * s.R;
      s.TSH += (tshT - s.TSH) * (1 - Math.exp(-h / (tshT < s.TSH ? 3 : 7)));
      if (!frozen) {
        let tT, tau;
        if (eq > 0 || pt.flags.surgery) { tT = p.trabFloor; tau = p.trabTau / LN2; }
        else if (p.relapse && s.offDay != null) { tT = p.trabRelapse; tau = 60; }
        else { tT = p.trabFloor; tau = (3 * p.trabTau) / LN2; }
        if (p.trab > 0) s.TRAb += (tT - s.TRAb) * (1 - Math.exp(-h / tau));
        s.W += (p.weight - 5 * (s.T3 - 1) - s.W) * (1 - Math.exp(-h / 45));
        s.pnn += (p.pnn - s.pnn) * (1 - Math.exp(-h / 8));
      }
    }
    pt.day += 1;
  }

  function record(pt) {
    const s = pt.st;
    pt.log.push({ day: pt.day, t4: 16 * s.T4, t3: 5 * s.T3, tsh: s.TSH, trab: s.TRAb, ats: atsEq(pt.rx), lt4: pt.rx.lt4 });
  }

  function advance(pt, days, onDay) {
    for (let d = 0; d < days; d++) {
      stepDay(pt, false);
      record(pt);
      if (onDay && onDay(pt) === false) return d + 1;
    }
    return days;
  }

  // Changement de traitement ; mémorise le jour de chaque modification de dose.
  function setRx(pt, rx) {
    const prevEq = atsEq(pt.rx), prevLt4 = pt.rx.lt4;
    Object.assign(pt.rx, rx);
    const eq = atsEq(pt.rx);
    if (prevEq > 0 && eq === 0) pt.st.offDay = pt.day;
    if (eq > 0) { pt.st.offDay = null; if (prevEq === 0) pt.flags.atsStart = pt.flags.atsStart ?? pt.day; }
    if (pt.rx.lt4 !== prevLt4) pt.flags.prevLt4 = prevLt4;
    if (eq !== prevEq || pt.rx.lt4 !== prevLt4) pt.flags.lastChange = pt.day;
  }

  // Valeurs mesurées (petit bruit analytique, ± 4 %).
  function noise() { return 1 + (Math.random() - 0.5) * 0.08; }
  function measure(pt) {
    const s = pt.st;
    return { tsh: Math.max(0.005, s.TSH * noise()), t4: 16 * s.T4 * noise(), t3: 5 * s.T3 * noise(), trab: Math.max(0.3, s.TRAb * noise()), pnn: s.pnn };
  }

  function clinic(pt) {
    const s = pt.st, p = pt.par;
    const t3 = s.T3;
    let hr = p.hr0 + (t3 > 1 ? 22 : 28) * (t3 - 1);
    hr *= 1 - BB[pt.rx.bb].hr;
    return { hr: Math.round(clamp(hr, 46, 160)), weight: Math.round(s.W * 10) / 10 };
  }

  // Ce que dit le patient, d'après son état (sémiologie : polycopié, chapitre thyroïde).
  function symptoms(pt) {
    const s = pt.st;
    const out = [];
    if (s.T3 > 1.9) out.push('palpitations', 'tremblement des mains', 'thermophobie et sueurs', 'amaigrissement malgré un appétit conservé', 'nervosité, sommeil difficile');
    else if (s.T3 > 1.4) out.push('palpitations à l\'effort', 'mains moites, un peu tremblantes', 'encore nerveux(se)');
    else if (s.T3 > 1.2) out.push('quelques palpitations, nettement mieux qu\'avant');
    if (s.T4 < 0.6) out.push('grande fatigue, ralentissement', 'frilosité', 'constipation', 'peau sèche, crampes', 'prise de poids');
    else if (s.T4 < 0.75 || (s.TSH > 10 && s.T4 < 0.85)) out.push('fatigue', 'frilosité', 'quelques kilos pris');
    else if (s.TSH > 6 && s.T4 < 0.95) out.push('un peu fatigué(e) en fin de journée');
    return out;
  }

  S.model = { ATS, BB, LT4_DOSES, atsEq, create, advance, setRx, measure, clinic, symptoms, clamp, record };
})();
