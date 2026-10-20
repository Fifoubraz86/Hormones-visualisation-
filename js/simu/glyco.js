/*
 * Glycémie au fil de la journée : profil intrajournalier reconstruit à partir de l'état du modèle DT2
 * (glycémie moyenne, glycémie à jeun, doses d'insuline), carnet d'autosurveillance, capteur de glucose et
 * rapport AGP, titration de l'insuline entre deux consultations.
 *
 * Profil d'une journée (g/L, t en heures) : niveau de fond (glycémie à jeun, phénomène de l'aube la nuit,
 * élévation diurne) + excursions des trois repas − action des bolus d'insuline rapide + bruit lent
 * + hypoglycémies tirées par le modèle. L'amplitude des repas est calée pour que la moyenne sur 24 h
 * égale la glycémie moyenne du modèle : l'HbA1c, le GMI du rapport AGP et le carnet restent cohérents.
 *
 * Titration : protocole d'adaptation des doses d'insuline du service (version 3.0) : objectifs par
 * profil de patient, pas de 1 U sous 10 U et de 2 U au-delà, augmentation après 2 ou 3 jours de suite
 * au-dessus de l'objectif, baisse dès l'injection suivante en cas d'hypoglycémie ou de glycémie sous
 * l'objectif ; option SFD 2025 (avis 18) : pas de 10 % au-delà de 40 U.
 * Lecture de l'AGP : Czupryniak L et al. Diabetes Ther 2022;13:811 ; cibles : SFD 2025, tableau II
 * (d'après Battelino et al. Diabetes Care 2019).
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const S = (HV.simu = HV.simu || {});
  const NS = 'http://www.w3.org/2000/svg';

  // Objectifs du protocole du service (g/L) : [min, max] par moment ; null = non applicable.
  const PROTO = {
    std: { label: 'Patient standard', rev: [0.8, 1.2], avDej: [0.8, 1.2], avDin: [0.8, 1.2], coucher: [1.0, 1.4], pp: [1.2, 1.8] },
    fra: { label: 'Patient fragile', rev: [1.0, 1.4], avDej: [1.0, 1.4], avDin: [1.0, 1.4], coucher: [1.2, 1.6], pp: [1.4, 2.0] },
    dep: { label: 'Patient dépendant', rev: [1.2, 2.0], avDej: [1.2, 2.0], avDin: [1.2, 2.0], coucher: [1.5, 2.0], pp: null }
  };
  const HYPO = 0.7;
  const MOMENTS = [['rev', 'Réveil', 7.25], ['ppPdj', '2 h après le petit-déjeuner', 9.5], ['avDej', 'Avant le déjeuner', 12.25], ['ppDej', '2 h après le déjeuner', 14.5], ['avDin', 'Avant le dîner', 19.25], ['ppDin', '2 h après le dîner', 21.5], ['coucher', 'Coucher', 22.5]];
  // Mesures faites selon la fréquence d'autosurveillance prescrite (le réveil tous les jours).
  const ASG = {
    1: { label: '1 fois par jour (réveil)', set: () => ['rev'] },
    2: { label: '2 fois par jour (réveil + un autre moment, en alternance)', set: (d) => ['rev', ['avDej', 'avDin', 'coucher'][d % 3]] },
    4: { label: '4 fois par jour (réveil, avant midi, avant soir, coucher)', set: () => ['rev', 'avDej', 'avDin', 'coucher'] },
    6: { label: '6 fois par jour (avant et 2 h après les repas)', set: () => ['rev', 'ppPdj', 'avDej', 'ppDej', 'avDin', 'ppDin', 'coucher'] }
  };
  const MEALS = ['Petit-déjeuner', 'Déjeuner', 'Dîner'];
  // Repas suivant dont la glycémie juge chaque bolus (protocole : « sur la glycémie avant le repas suivant »).
  const BOLUS_CTRL = ['avDej', 'avDin', 'coucher'];

  /* ---------- Hasard reproductible ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return function () { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());

  /* ---------- Formes ---------- */
  const kMeal = (tau) => (tau <= 0 ? 0 : (tau * tau) * Math.exp(2 - 2 * tau)); // pic à 1 h, aire e²/4
  const kIns = (tau) => (tau <= 0 ? 0 : Math.pow(tau / 1.5, 2) * Math.exp(2 - 2 * tau / 1.5)); // pic à 1 h 30, aire 1,5 e²/4
  const AREA_MEAL = Math.exp(2) / 4, AREA_INS = 1.5 * Math.exp(2) / 4;
  const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  function dayShape(t) { return t < 3 ? Math.max(0, 1 - (t + 2) / 5) : t < 7.5 ? 0 : t < 12 ? smooth((t - 7.5) / 4.5) : t < 22 ? 1 : 1 - (t - 22) / 5; }
  function dawnDip(t) { return t < 3 ? 1 : t < 7 ? 1 - (t - 3) / 4 : 0; }
  const meanOf = (f) => { let s = 0; for (let i = 0; i < 288; i++) s += f(i / 12); return s / 288; };
  const MEAN_DAY = meanOf(dayShape), MEAN_DAWN = meanOf(dawnDip);
  // Aire de l'élévation diurne après chaque repas, jusqu'au suivant (heures).
  const segArea = (a, b) => { let s2 = 0; for (let t = a; t < b; t += 1 / 12) s2 += dayShape(t % 24) / 12; return s2; };
  const SEG_AREA = [segArea(7.5, 12.5), segArea(12.5, 19.5), segArea(19.5, 27)];

  /* ---------- Une journée ---------- */
  // pt : patient du modèle ; ctx : { seed, irregular, newHypo, newSev } ; renvoie les paramètres de la journée.
  function makeDay(pt, D, ctx) {
    const r = rng(ctx.seed);
    const s = pt.st, rx = pt.rx, p = pt.par;
    const irr = ctx.irregular ? 1 : 0;
    const MG = s.MG;
    const F0 = D.fpgOf(pt);
    const F = Math.max(0.55, F0 * Math.exp(0.07 * gauss(r) * (1 + irr)));
    const dawn = rx.basal > 0 ? 0.04 : Math.min(0.15, 0.05 + 0.04 * Math.max(0, MG - 1.3));
    const glp = D.glpFrac(rx);
    const u = (rx.rapidM || [0, 0, 0]).slice();
    const sumU = u.reduce((a, x) => a + x, 0);
    // Glycémie moyenne sans les bolus : les bolus n'agissent que sur leur repas et l'intervalle qui suit.
    const MG0 = sumU > 0 ? MG + Math.max(0, D.eqMG(pt, { rapid: 0 }) - D.eqMG(pt, {})) : MG;
    const wBase = [0.8, 1.1, 1.0];
    const w = wBase.map((x) => x * Math.exp((0.22 + 0.2 * irr) * gauss(r)));
    const skip = [false, irr && r() < 0.15, false];
    const tm = [7.5, 12.5, 19.5].map((x) => x + (0.25 + 0.5 * irr) * gauss(r));
    // Excursion post-prandiale (pic) : croît avec la glycémie moyenne, réduite par les incrétines.
    const sig = 0.4 * Math.pow(Math.max(0.9, MG0), 1.25) * (1 - 0.4 * Math.min(1, glp)) * (rx.acarb ? 0.85 : 1);
    // Bolus : l'aire d'effet (baisse de la moyenne × 24 h) efface d'abord l'excursion de son repas, puis
    // l'élévation diurne jusqu'au repas suivant ; le reste creuse la glycémie dans les heures qui suivent
    // (bolus trop fort : hypoglycémie post-prandiale ou avant le repas suivant).
    let mealArea0 = 0;
    for (let m = 0; m < 3; m++) mealArea0 += skip[m] ? 0 : sig * w[m] * AREA_MEAL;
    const dday = Math.max(-0.3, ((MG0 - F + dawn * MEAN_DAWN) * 24 - mealArea0) / (MEAN_DAY * 24));
    const areaB = Math.max(0, MG0 - MG) * 24;
    const cut = [0, 0, 0], segCut = [0, 0, 0], extra = [0, 0, 0];
    for (let m = 0; m < 3; m++) {
      let b = sumU > 0 ? areaB * u[m] / sumU : 0;
      const a = skip[m] ? 0 : sig * w[m] * AREA_MEAL;
      const r1 = Math.min(b, 0.55 * a); b -= r1; cut[m] = a > 0 ? r1 / a : 0;
      const segA = Math.max(0, dday) * SEG_AREA[m];
      const r2 = Math.min(b, 0.95 * segA); b -= r2; segCut[m] = segA > 0 ? r2 / segA : 0;
      extra[m] = b / AREA_INS; // amplitude du creux (g/L) au pic d'action
    }
    const noise = [0, 1, 2].map(() => ({ a: (0.025 + 0.03 * r()) * Math.max(0.8, MG / 1.4), f: 1 / (2 + 4 * r()), ph: 2 * Math.PI * r() }));
    // Hypoglycémies du modèle : placées plus bas, au creux du profil.
    const dp = { d: pt.day, F, dawn, dday, sig, w, tm, skip, u, cut, segCut, extra, noise, hypos: [], mg: MG, basal: rx.basal, rapid: u.slice(), meter: [0, 1, 2, 3, 4, 5, 6].map(() => 1 + 0.04 * gauss(r)), sensorSeed: Math.floor(r() * 1e9) };
    // Hypoglycémies : là où la glycémie de la journée est la plus basse. Celles que le modèle a tirées
    // (sulfamide, insuline) s'y placent ; un creux du profil sous 0,60 g/L en est une aussi (ressentie).
    const curve = []; for (let i = 0; i < 96; i++) curve.push(glucose(dp, i / 4));
    const minima = [];
    for (let i = 0; i < 96; i++) { const a2 = curve[(i + 95) % 96], c = curve[(i + 1) % 96]; if (curve[i] <= a2 && curve[i] <= c) minima.push(i); }
    minima.sort((x, y) => curve[x] - curve[y]);
    const used = [];
    const add = (i, sev) => { if (used.some((j) => Math.abs(j - i) < 8)) return false; used.push(i); dp.hypos.push({ t0: i / 4 - 0.4, dur: 0.6 + 0.5 * r(), depth: sev ? 0.36 : Math.min(curve[i], 0.52 + 0.14 * r()), sev }); return true; };
    minima.filter((i) => curve[i] < 0.6).forEach((i) => add(i, false));
    const native = dp.hypos.length;
    const nH = ctx.newHypo || 0;
    for (let k = 0; k < nH; k++) {
      const pool = minima.slice(0, 3);
      const i = pool.length ? pool[Math.floor(r() * pool.length)] : Math.floor(r() * 96);
      if (!add(i, k < (ctx.newSev || 0))) { const hy = dp.hypos.find((x) => Math.abs(x.t0 + 0.4 - i / 4) < 2); if (hy && k < (ctx.newSev || 0)) { hy.depth = 0.36; hy.sev = true; } }
    }
    dp.native = Math.max(0, native - nH);
    return dp;
  }

  function glucose(dp, t) {
    const sg = t >= 7.5 && t < 12.5 ? 0 : t >= 12.5 && t < 19.5 ? 1 : t >= 19.5 || t < 3 ? 2 : -1;
    let g = dp.F - dp.dawn * dawnDip(t) + dp.dday * dayShape(t) * (sg >= 0 ? 1 - dp.segCut[sg] : 1);
    for (let m = 0; m < 3; m++) {
      if (!dp.skip[m]) g += dp.sig * dp.w[m] * (1 - dp.cut[m]) * kMeal(t - dp.tm[m]);
      if (dp.extra[m]) g -= dp.extra[m] * kIns(t - dp.tm[m]);
      // Queue du repas de la veille au-dessus de minuit : négligée (aire < 1 %).
    }
    for (const n of dp.noise) g += n.a * Math.sin(2 * Math.PI * n.f * t + n.ph);
    for (const hy of dp.hypos) {
      const x = (t - hy.t0) / hy.dur;
      if (x > 0 && x < 1) { const b = Math.pow(Math.sin(Math.PI * x), 2); g = g - (g - hy.depth) * b; }
    }
    return Math.max(0.35, Math.min(5.5, g));
  }

  // Glycémies capillaires du jour (toutes les mesures possibles ; le carnet n'affiche que celles faites).
  function readings(dp) {
    const o = {};
    MOMENTS.forEach(([k, , t], i) => { o[k] = glucose(dp, t) * dp.meter[i]; });
    // Hypoglycémie ressentie : resucrage, glycémie notée au moment du malaise.
    o.hypos = dp.hypos.map((hy) => ({ t: hy.t0 + hy.dur / 2, g: hy.depth * dp.meter[0], sev: hy.sev }));
    return o;
  }

  /* ---------- Titration ---------- */
  // state : { above: { basal, m0, m1, m2 } } ; prot : { who, prof, delai, sfd10 } ; rdg : glycémies du jour.
  function titrate(rx, rdg, prot, state, apply) {
    const O = PROTO[prot.prof] || PROTO.std;
    const log = [];
    const step = (dose) => (prot.sfd10 && dose > 40 ? Math.max(2, Math.round(dose * 0.1)) : dose < 10 ? 1 : 2);
    const nightHypo = rdg.hypos.some((h) => h.t < 7.5 || h.t > 22);
    const ctl = (name, dose, val, obj, hypo, set) => {
      if (!dose) return;
      if ((val != null && val < obj[0]) || hypo) {
        state.above[name] = 0;
        if (apply) { const nd = Math.max(0, dose - step(dose)); set(nd); log.push({ name, from: dose, to: nd, why: hypo ? 'hypoglycémie' : 'sous l\'objectif' }); }
      } else if (val != null && val > obj[1]) {
        state.above[name] = (state.above[name] || 0) + 1;
        if (state.above[name] >= prot.delai) { state.above[name] = 0; if (apply) { const nd = dose + step(dose); set(nd); log.push({ name, from: dose, to: nd, why: prot.delai + ' jours au-dessus de l\'objectif' }); } }
      } else state.above[name] = 0;
    };
    ctl('basal', rx.basal, rdg.rev, O.rev, nightHypo, (v) => { rx.basal = v; });
    (rx.rapidM || []).forEach((dose, m) => {
      const k = BOLUS_CTRL[m], obj = O[k] || O.avDej;
      const hypo = rdg.hypos.some((h) => h.t > ([7.5, 12.5, 19.5][m] + 1) && h.t < ([12.5, 19.5, 26][m]));
      ctl('m' + m, dose, rdg[k], obj, hypo, (v) => { rx.rapidM[m] = v; });
    });
    rx.rapid = (rx.rapidM || []).reduce((a, x) => a + x, 0);
    return log;
  }

  /* ---------- Capteur (MCG) ---------- */
  // 14 jours, un point toutes les 15 min ; quelques trous (capteur non scanné, décroché).
  function cgm(days) {
    const pts = [];
    days.forEach((dp) => {
      const r = rng(dp.sensorSeed);
      const gapStart = r() < 0.25 ? Math.floor(r() * 96) : -1, gapLen = 4 + Math.floor(r() * 16);
      let drift = 0;
      for (let i = 0; i < 96; i++) {
        if (gapStart >= 0 && i >= gapStart && i < gapStart + gapLen) { pts.push({ d: dp.d, i, g: null }); continue; }
        drift = 0.9 * drift + 0.1 * gauss(r) * 0.06;
        pts.push({ d: dp.d, i, g: Math.max(0.4, glucose(dp, i / 4) * (1 + drift + 0.02 * gauss(r))) });
      }
    });
    return pts;
  }

  function quant(arr, q) { if (!arr.length) return null; const a = arr.slice().sort((x, y) => x - y); const pos = (a.length - 1) * q, lo = Math.floor(pos); return a[lo] + (a[Math.min(a.length - 1, lo + 1)] - a[lo]) * (pos - lo); }

  function agpStats(pts, nDays) {
    const v = pts.filter((p) => p.g != null).map((p) => p.g);
    const n = v.length || 1;
    const mean = v.reduce((a, x) => a + x, 0) / n;
    const sd = Math.sqrt(v.reduce((a, x) => a + (x - mean) * (x - mean), 0) / n);
    const pc = (f) => (100 * v.filter(f).length) / n;
    const st = {
      days: nDays, capture: (100 * v.length) / (nDays * 96), mean, gmi: 3.31 + 0.02392 * mean * 100, cv: (100 * sd) / mean,
      vlow: pc((g) => g < 0.54), low: pc((g) => g >= 0.54 && g < 0.7), tir: pc((g) => g >= 0.7 && g <= 1.8), high: pc((g) => g > 1.8 && g <= 2.5), vhigh: pc((g) => g > 2.5)
    };
    st.tbr = st.vlow + st.low; st.tar = st.high + st.vhigh; st.pts = pts;
    // Percentiles par tranche de 15 min, lissés sur une heure.
    st.prof = [];
    for (let i = 0; i < 96; i++) {
      const win = pts.filter((p) => p.g != null && Math.min(Math.abs(p.i - i), 96 - Math.abs(p.i - i)) <= 2).map((p) => p.g);
      st.prof.push({ i, p5: quant(win, 0.05), p25: quant(win, 0.25), p50: quant(win, 0.5), p75: quant(win, 0.75), p95: quant(win, 0.95) });
    }
    return st;
  }

  /* ---------- Lecture guidée ---------- */
  // Cibles SFD 2025 (tableau II) : cas général ou sujet âgé / à haut risque d'hypoglycémie.
  function cgmTargets(fragile) {
    return fragile ? { tir: 50, tbr: 1, vlow: 0, tar: 50, vhigh: 10, label: 'personne âgée ou à haut risque d\'hypoglycémie sévère' } : { tir: 70, tbr: 4, vlow: 1, tar: 25, vhigh: 5, label: 'cas général' };
  }

  function interpretAGP(st, tg, ctx) {
    const f = (x, d) => x.toFixed(d == null ? 0 : d).replace('.', ',');
    const out = [];
    const ok = st.days >= 14 && st.capture >= 70;
    out.push(['Qualité des données', ok ? f(st.days) + ' jours, capteur actif ' + f(st.capture) + ' % du temps : analysable (≥ 14 jours, ≥ 70 %).' : 'Données insuffisantes (' + f(st.days) + ' jours, ' + f(st.capture) + ' %) : interprétation prudente.']);
    const hypoFirst = st.tbr > tg.tbr || st.vlow > tg.vlow;
    out.push(['1. Hypoglycémies (priorité)', hypoFirst ? 'Temps < 0,70 g/L ' + f(st.tbr, 1) + ' % (cible < ' + tg.tbr + ' %), < 0,54 g/L ' + f(st.vlow, 1) + ' % (cible < ' + (tg.vlow || '0') + ' %) : à corriger avant toute intensification.' : 'Temps en hypoglycémie dans la cible (' + f(st.tbr, 1) + ' % < 0,70 g/L).']);
    out.push(['2. Temps dans la cible', 'TIR ' + f(st.tir) + ' % (cible > ' + tg.tir + ' %) ; au-dessus de 1,80 g/L ' + f(st.tar) + ' % (cible < ' + tg.tar + ' %), dont > 2,50 g/L ' + f(st.vhigh) + ' % (cible < ' + tg.vhigh + ' %). Chaque gain de 10 points de TIR ≈ − 0,8 % d\'HbA1c.']);
    out.push(['3. Équilibre moyen', 'Glucose moyen ' + f(st.mean, 2) + ' g/L, GMI ' + f(st.gmi, 1) + ' %' + (ctx && ctx.a1c ? ' (HbA1c ' + f(ctx.a1c, 1) + ' % : ' + (Math.abs(ctx.a1c - st.gmi) < 0.5 ? 'concordants' : 'écart > 0,5 point, penser aux causes d\'HbA1c faussée ou à une période non représentative') + ')' : '') + '.']);
    out.push(['4. Variabilité', 'CV ' + f(st.cv) + ' % ' + (st.cv > 36 ? '(> 36 % : variabilité élevée, risque d\'hypoglycémie ; chercher repas irréguliers, doses inadaptées, resucrages excessifs)' : '(≤ 36 % : stable)') + '.']);
    // Motifs sur le profil
    const at = (h0, h1, key) => { const xs = st.prof.filter((p) => p.i >= h0 * 4 && p.i < h1 * 4).map((p) => p[key]); return xs.reduce((a, x) => a + x, 0) / xs.length; };
    const night5 = Math.min(...st.prof.filter((p) => p.i < 28).map((p) => p.p5));
    const fasting = at(6.5, 7.5, 'p50'), bedtime = at(22, 23, 'p50');
    const pp = [[8, 10.5, 'petit-déjeuner'], [13, 15.5, 'déjeuner'], [20, 22, 'dîner']].map(([a, b, n]) => [n, Math.max(...st.prof.filter((p) => p.i >= a * 4 && p.i < b * 4).map((p) => p.p50))]);
    const motifs = [];
    if (night5 < 0.7) motifs.push('5e percentile sous 0,70 g/L la nuit : hypoglycémies nocturnes ; la dose de basale (ou un sulfamide du soir) est trop forte.');
    if (fasting > 1.3) motifs.push('Médiane au réveil ' + f(fasting, 2) + ' g/L : glycémie à jeun au-dessus de la cible, titrer l\'insuline basale (ou l\'introduire).');
    if (bedtime - fasting > 0.5 && ctx && ctx.basalUkg > 0.5) motifs.push('Écart coucher-réveil de ' + f(bedtime - fasting, 2) + ' g/L avec une basale > 0,5 U/kg : sur-basalisation probable, la basale corrige les excès de la journée ; traiter le prandial (aGLP1, bolus) plutôt que monter la basale (SFD 2025, avis 19).');
    pp.forEach(([n, v]) => { if (v > 2.2) motifs.push('Pic médian après le ' + n + ' à ' + f(v, 2) + ' g/L : hyperglycémie post-prandiale.'); });
    if (st.prof.some((p) => p.p75 - p.p25 > 0.9)) motifs.push('Bande interquartile large à certaines heures : variabilité liée aux doses, aux repas ou à l\'activité.');
    out.push(['5. Profil (courbe AGP)', motifs.length ? motifs.join(' ') : 'Médiane plate dans la cible, bandes étroites.']);
    return out;
  }

  function interpretCarnet(rows, prot, ctx) {
    const O = PROTO[prot.prof] || PROTO.std;
    const f = (x) => x.toFixed(2).replace('.', ',');
    const out = [];
    const col = (k) => rows.map((r) => r.v[k]).filter((x) => x != null);
    const nHypo = rows.reduce((a, r) => a + r.hypos.length, 0);
    const nightH = rows.reduce((a, r) => a + r.hypos.filter((h) => h.t < 7.5 || h.t > 22).length, 0);
    if (nHypo) out.push('Hypoglycémies : ' + nHypo + ' sur ' + rows.length + ' jours' + (nightH ? ', dont ' + nightH + ' la nuit (basale trop forte)' : '') + ' ; à corriger en premier (baisser la dose responsable dès l\'injection suivante).');
    [['rev', 'Réveil'], ['avDej', 'Avant le déjeuner'], ['avDin', 'Avant le dîner'], ['coucher', 'Coucher']].forEach(([k, n]) => {
      const v = col(k), obj = O[k];
      if (!v.length || !obj) return;
      const hi = v.filter((x) => x > obj[1]).length, lo = v.filter((x) => x < obj[0]).length;
      out.push(n + ' : médiane ' + f(quant(v, 0.5)) + ' g/L (objectif ' + f(obj[0]) + '–' + f(obj[1]) + ') ; ' + hi + '/' + v.length + ' au-dessus, ' + lo + '/' + v.length + ' en dessous.');
    });
    const rev = col('rev'), cou = col('coucher');
    if (ctx && ctx.basal > 0 && rev.length) {
      const m = quant(rev, 0.5);
      if (m > O.rev[1]) out.push('Réveil au-dessus de l\'objectif : le protocole augmente la basale de ' + (ctx.basal < 10 ? 1 : 2) + ' U tous les ' + prot.delai + ' jours ' + (prot.who === 'none' ? '(titration non prescrite : à mettre en place)' : '(vérifier qu\'elle est faite)') + '.');
      else if (m < O.rev[0]) out.push('Réveil sous l\'objectif : baisser la basale.');
      else out.push('Réveil dans l\'objectif : basale bien titrée.');
      if (cou.length && quant(cou, 0.5) - m > 0.5 && ctx.basalUkg > 0.5) out.push('Coucher bien plus haut que le réveil avec une basale > 0,5 U/kg : sur-basalisation ; avis diabétologique, ajout d\'un aGLP1 de préférence à un schéma basal-bolus (SFD 2025, avis 19).');
      else if (cou.length && quant(cou, 0.5) > (O.coucher || [0, 1.4])[1] && m <= O.rev[1]) out.push('Réveil dans l\'objectif mais journée haute : la basale ne suffit plus ; aGLP1 ou AR GIP/GLP-1 (préféré), sinon bolus au repas le plus hyperglycémiant (SFD 2025, avis 19).');
    }
    if (ctx && ctx.a1c && rev.length) {
      const all = rows.flatMap((r) => Object.values(r.v).filter((x) => typeof x === 'number'));
      const mean = all.reduce((a, x) => a + x, 0) / all.length;
      if (ctx.a1c - (mean * 100 + 46.7) / 28.7 > 1) out.push('HbA1c plus haute que ne le laissent penser les glycémies notées : mesures trop peu nombreuses ou toujours aux mêmes moments, ou carnet embelli ; un capteur aide.');
    }
    return out;
  }

  /* ---------- Rendu ---------- */
  const el = (tag, a, par) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (par) par.appendChild(e); return e; };
  const fr = (x, d) => x.toFixed(d).replace('.', ',');

  // Carnet : une ligne par jour, cases colorées selon l'objectif du protocole.
  function carnetTable(rows, prot, h) {
    const O = PROTO[prot.prof] || PROTO.std;
    const cls = (k, v) => { if (v == null) return 'gc-na'; if (v < HYPO) return 'gc-hypo'; const o = O[k] || (k.startsWith('pp') ? O.pp : null); if (!o) return ''; return v < o[0] ? 'gc-lo' : v > o[1] ? 'gc-hi' : 'gc-ok'; };
    const anyRapid = rows.some((r) => r.u.some((x) => x > 0));
    const anyPP = rows.some((r) => r.v.ppDej != null);
    const cols = [['rev', 'Réveil'], anyPP && ['ppPdj', '2 h ap. pdj'], ['avDej', 'Av. midi'], anyPP && ['ppDej', '2 h ap. déj'], ['avDin', 'Av. soir'], anyPP && ['ppDin', '2 h ap. dîner'], ['coucher', 'Coucher']].filter(Boolean);
    const head = ['Jour', 'Basale (U)'].concat(anyRapid ? ['Rapides (U) m/m/s'] : []).concat(cols.map((c) => c[1])).concat(['Remarques']);
    return h('div', { class: 'sv-scroll' }, h('table', { class: 'sv-carnet' }, [
      h('thead', null, h('tr', null, head.map((t) => h('th', null, t)))),
      h('tbody', null, rows.map((r) => h('tr', null, [h('td', { class: 'gc-day' }, 'J' + r.d), h('td', { class: 'gc-dose' }, r.basal ? String(r.basal) : '—')]
        .concat(anyRapid ? [h('td', { class: 'gc-dose' }, r.u.map((x) => x || '–').join(' / '))] : [])
        .concat(cols.map(([k]) => h('td', { class: 'gc-v ' + cls(k, r.v[k]) }, r.v[k] == null ? '' : fr(r.v[k], 2))))
        .concat([h('td', { class: 'gc-rem' }, r.rem.join(' ; '))]))))
    ]));
  }

  function agpReport(st, days, tg, h) {
    const wrap = h('div', { class: 'agp' });
    // 1. Statistiques et barre des plages
    const f = (x, d) => fr(x, d == null ? 0 : d);
    const stats = [
      ['Période', st.days + ' jours'], ['Capteur actif', f(st.capture) + ' %'], ['Glucose moyen', f(st.mean, 2) + ' g/L'],
      ['GMI', f(st.gmi, 1) + ' %'], ['Variabilité (CV)', f(st.cv, 1) + ' %' + (st.cv > 36 ? ' ▲' : '')]
    ];
    wrap.append(h('div', { class: 'agp-top' }, [
      h('dl', { class: 'agp-stats' }, stats.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)])),
      rangeBar(st, tg, h)
    ]));
    // 2. Profil ambulatoire
    const W = 640, H = 230, L = 40, R = 10, T = 10, B = 24, ymax = 3.5;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'agp-svg', role: 'img', 'aria-label': 'Profil glycémique ambulatoire : médiane, interquartiles et 5e–95e percentiles sur 24 heures' });
    const x = (i) => L + ((W - L - R) * i) / 95, y = (g) => T + (H - T - B) * (1 - Math.min(ymax, g) / ymax);
    el('rect', { x: L, y: y(1.8), width: W - L - R, height: y(0.7) - y(1.8), class: 'agp-target' }, svg);
    [0.54, 0.7, 1.8, 2.5].forEach((g) => { el('line', { x1: L, x2: W - R, y1: y(g), y2: y(g), class: g === 0.7 || g === 1.8 ? 'agp-tl' : 'agp-grid' }, svg); el('text', { x: L - 4, y: y(g) + 3, class: 'agp-tick', 'text-anchor': 'end' }, svg).textContent = fr(g, 2); });
    const band = (lo, hi, c) => { let d = ''; st.prof.forEach((p, i) => { d += (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p[hi]).toFixed(1); }); for (let i = 95; i >= 0; i--) d += 'L' + x(i).toFixed(1) + ',' + y(st.prof[i][lo]).toFixed(1); el('path', { d: d + 'Z', class: c }, svg); };
    band('p5', 'p95', 'agp-b90'); band('p25', 'p75', 'agp-b50');
    let dm = ''; st.prof.forEach((p, i) => { dm += (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p.p50).toFixed(1); }); el('path', { d: dm, class: 'agp-med' }, svg);
    for (let hh = 0; hh <= 24; hh += 3) el('text', { x: L + ((W - L - R) * hh) / 24, y: H - 6, class: 'agp-tick', 'text-anchor': 'middle' }, svg).textContent = hh + ' h';
    wrap.append(h('p', { class: 'agp-cap' }, 'Profil glycémique ambulatoire (14 jours superposés) : médiane, 25e–75e et 5e–95e percentiles ; zone verte 0,70–1,80 g/L.'), svg);
    // 3. Profils quotidiens
    const grid = h('div', { class: 'agp-days' });
    const byDay = {}; days.forEach((dp) => { byDay[dp.d] = []; });
    st.pts.forEach((p) => { if (byDay[p.d]) byDay[p.d].push(p); });
    days.forEach((dp) => {
      const w2 = 120, h2 = 54, sv = el('svg', { viewBox: `0 0 ${w2} ${h2}`, class: 'agp-day', role: 'img', 'aria-label': 'Jour ' + dp.d });
      const yy = (g) => 2 + (h2 - 12) * (1 - Math.min(ymax, g) / ymax);
      el('rect', { x: 0, y: yy(1.8), width: w2, height: yy(0.7) - yy(1.8), class: 'agp-target' }, sv);
      let d = '', pen = false;
      byDay[dp.d].forEach((p) => { if (p.g == null) { pen = false; return; } d += (pen ? 'L' : 'M') + ((w2 * p.i) / 95).toFixed(1) + ',' + yy(p.g).toFixed(1); pen = true; });
      el('path', { d, class: 'agp-dline' }, sv);
      byDay[dp.d].forEach((p) => { if (p.g != null && p.g < 0.7) el('circle', { cx: (w2 * p.i) / 95, cy: yy(p.g), r: 1.8, class: 'agp-dlow' }, sv); });
      el('text', { x: 2, y: h2 - 2, class: 'agp-tick' }, sv).textContent = 'J' + dp.d;
      grid.append(sv);
    });
    wrap.append(h('p', { class: 'agp-cap' }, 'Profils quotidiens'), grid);
    return wrap;
  }

  function rangeBar(st, tg, h) {
    const segs = [['vhigh', '> 2,50', st.vhigh, '< ' + tg.vhigh + ' %'], ['high', '1,81–2,50', st.high, ''], ['tir', '0,70–1,80', st.tir, '> ' + tg.tir + ' %'], ['low', '0,54–0,69', st.low, '< ' + tg.tbr + ' %'], ['vlow', '< 0,54', st.vlow, '< ' + (tg.vlow || 0) + ' %']];
    return h('div', { class: 'agp-range' }, [
      h('div', { class: 'agp-bar', role: 'img', 'aria-label': 'Temps dans chaque plage' }, segs.map(([k, , v]) => h('span', { class: 'agp-s agp-' + k, style: 'flex-grow:' + Math.max(0.4, v) }))),
      h('ul', { class: 'agp-legend' }, segs.map(([k, lab, v, tgt]) => h('li', null, [h('span', { class: 'agp-sw agp-' + k }), lab + ' g/L : ', h('b', null, fr(v, v < 10 ? 1 : 0) + ' %'), tgt ? h('span', { class: 'agp-tg' }, ' (cible ' + tgt + ')') : null])))
    ]);
  }

  S.glyco = { PROTO, ASG, MOMENTS, MEALS, HYPO, makeDay, glucose, readings, titrate, cgm, agpStats, cgmTargets, interpretAGP, interpretCarnet, carnetTable, agpReport, rng };
})();
