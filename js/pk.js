/*
 * Pharmacocinétique générique du socle (sans dessin, utilisable dans la page et dans Node) :
 * modèle à un compartiment avec absorption d'ordre 1 (formule de Bateman) ou bolus intraveineux,
 * prises répétées par superposition, dose de charge, demi-vie, facteur d'accumulation, délai d'équilibre ;
 * modèle à deux compartiments (central et périphérique) par intégration numérique.
 * Unités libres mais cohérentes (par exemple heures, mg, litres). Principes : complément (pharmacologie
 * générale) ; les paramètres de chaque médicament sont sourcés là où ils sont utilisés.
 */
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const HV = (root.HV = root.HV || {});
  const LN2 = Math.LN2;

  const ke = (t12) => LN2 / t12;
  const t12 = (k) => LN2 / k;
  // Concentration après une dose orale (Bateman) ; ka = ke traité par la limite (t·e^{-kt}).
  function oral(t, o) {
    if (t < 0) return 0;
    const { dose = 1, F = 1, ka, ke: k, V = 1 } = o;
    if (!ka || ka === Infinity) return (F * dose / V) * Math.exp(-k * t);
    if (Math.abs(ka - k) < 1e-9) return (F * dose / V) * k * t * Math.exp(-k * t);
    return (F * dose * ka / (V * (ka - k))) * (Math.exp(-k * t) - Math.exp(-ka * t));
  }
  // Facteur d'accumulation à l'équilibre pour un intervalle tau.
  const accumulation = (k, tau) => 1 / (1 - Math.exp(-k * tau));
  // Délai pour atteindre une fraction de l'équilibre (0,9 → 3,3 demi-vies ; 0,97 → 5 demi-vies).
  const timeToSS = (half, frac) => half * Math.log2(1 / (1 - frac));
  // Temps du pic après une dose orale.
  const tmax = (ka, k) => (Math.abs(ka - k) < 1e-9 ? 1 / k : Math.log(ka / k) / (ka - k));

  /* Schéma de prises répété : schedule = [[heure dans la période, dose], …], période (24 h par défaut),
     loading = dose supplémentaire donnée avec la première prise. Renvoie C(t) et la concentration moyenne
     à l'équilibre (Cavg = F × dose par période / (V × ke × période)) pour normaliser. */
  function regimen(o) {
    const { schedule, period = 24, F = 1, V = 1, ka, ke: k, loading = 0, horizon } = o;
    const doses = [];
    for (let p = 0; p * period < horizon; p++) schedule.forEach(([h, d]) => { const t = p * period + h; if (t <= horizon) doses.push([t, d]); });
    if (loading && doses.length) doses[0] = [doses[0][0], doses[0][1] + loading];
    const perPeriod = schedule.reduce((s, x) => s + x[1], 0);
    const cavg = (F * perPeriod) / (V * k * period);
    const C = (t) => doses.reduce((s, [td, d]) => (td <= t ? s + oral(t - td, { dose: d, F, ka, ke: k, V }) : s), 0);
    return { C, cavg, doses };
  }

  /* Deux compartiments (central 1, périphérique 2), absorption d'ordre 1 depuis le tube digestif :
     intégration d'Euler à pas fin ; renvoie les quantités échantillonnées. */
  function twoComp(o) {
    const { k12, k21, ke: k, ka = 0, gut0 = 0, central0 = 0, dt = 0.01, horizon, every = 1 } = o;
    let G = gut0, A1 = central0, A2 = 0;
    const out = [];
    for (let i = 0, t = 0; t <= horizon + 1e-9; i++, t = i * dt) {
      if (i % Math.round(every / dt) === 0) out.push([t, G, A1, A2]);
      const abs = ka * G, d12 = k12 * A1, d21 = k21 * A2, el = k * A1;
      G -= abs * dt;
      A1 += (abs - d12 + d21 - el) * dt;
      A2 += (d12 - d21) * dt;
    }
    return out;
  }

  HV.pk = { ke, t12, oral, accumulation, timeToSS, tmax, regimen, twoComp };
})();
