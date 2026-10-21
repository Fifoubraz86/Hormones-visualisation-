/*
 * Hospitalisation en diabétologie : insulinothérapie intensive transitoire par pompe (protocole du service).
 *
 * Débit de base de départ 1 U/h, glycémie capillaire toutes les 4 h ; hors de la cible, débit + 20 à 30 %
 * (ou − 20 % sous la cible, − 30 % et resucrage en cas d'hypoglycémie). Bolus de 0,1 U/kg par repas dès le
 * premier jour, adaptés chaque jour selon le protocole d'adaptation des doses (glycémie avant le repas suivant).
 * Simulation horaire : la glycémie de fond rejoint l'équilibre fixé par l'insuline du
 * moment (en 3 h environ) ; la glucotoxicité (sécrétion et sensibilité à l'insuline) se lève en 2 à 3 semaines de normoglycémie
 * (Weng, Lancet 2008 : normoglycémie en 4 jours sous pompe ; Kramer, Lancet Diabetes Endocrinol 2013).
 */
(function () {
  'use strict';
  const S = (window.HV = window.HV || {}).simu = (window.HV.simu || {});

  // Contrôles toutes les 4 h (heure physiologique) ; le repas dont dépend chaque contrôle avant repas.
  const CHECKS = [[3, '3 h'], [7, 'réveil'], [11.75, 'avant déjeuner'], [15.5, '15 h 30'], [19.25, 'avant dîner'], [23, '23 h']];
  const TARGETS = { a: [0.8, 1.4], b: [1.0, 1.6], c: [1.0, 1.8] };
  const DEFAULTS = { days: 7, rate0: 1, incr: 0.25, target: 'b', bolusKg: 0.1, stopSu: true, cgm: true, exit: 'inj' };

  // pt, D (modèle), Y (glyco) ; o : réglages ; renvoie le journal du séjour (heure par heure).
  function run(pt, D, Y, o0, seed) {
    const o = Object.assign({}, DEFAULTS, o0);
    const [lo, hi] = TARGETS[o.target] || TARGETS.b;
    const W = pt.st.W, rx = pt.rx;
    const save = { basal: rx.basal, rapidM: rx.rapidM.slice(), rapid: rx.rapid, su: rx.su, adh: pt.par.adh, gv: pt.par.gv, take: Object.assign({}, pt.take) };
    // À l'hôpital, l'insuline est administrée par l'équipe : observance complète ; sulfamide arrêté (au choix).
    // Repas fixes, insuline administrée par l'équipe : variabilité d'un jour à l'autre réduite de moitié.
    pt.par.adh = 1; pt.take.met = true; pt.par.gv = (save.gv || 1) * 0.5;
    rx.basal = 0; if (o.stopSu) rx.su = 0;
    let rate = o.rate0;
    const bol = [0, 1, 2].map(() => Math.max(2, Math.round(o.bolusKg * W)));
    rx.rapidM = bol.slice(); rx.rapid = bol[0] + bol[1] + bol[2];
    const step = (d) => (d < 10 ? 1 : 2);
    let gm = pt.st.MG;
    const hours = [], checks = [], days = [];
    let hypos = 0;
    for (let d = 0; d < o.days; d++) {
      // Profil de la journée (repas, aube, variabilité) calculé sur la glycémie de fond du matin.
      rx.pump = Math.round(rate * 24 * 10) / 10;
      pt.st.MG = gm;
      const dp = Y.makeDay(pt, D, { seed: (seed + (pt.day + d) * 7919) >>> 0 });
      dp.hypos = [];
      const g0 = gm;
      const dayRd = {}, dayRates = [];
      let sum = 0, n = 0, lowDay = false;
      for (let t = 0; t < 24; t += 0.25) {
        if (Math.abs(t % 1) < 1e-9) {
          rx.pump = rate * 24;
          const eq = D.eqMG(pt, {});
          gm += (eq - gm) * (1 - Math.exp(-1 / 3)); // pompe : nouvel équilibre en quelques heures
        }
        const g = Math.max(0.4, Y.glucose(dp, t) * gm / g0);
        hours.push({ d, t, g, rate });
        sum += g; n++;
        const ck = CHECKS.find((c) => Math.abs(c[0] - t) < 0.13);
        if (ck) {
          const gc = g * (1 + 0.04 * (Math.sin((d + 1) * (t + 3)) ));
          // Contrôles à distance des repas (15 h 30, 23 h) : cible haute relevée de 0,40 g/L.
          const post = ck[0] === 15.5 || ck[0] === 23;
          let act = '', nr = rate;
          if (gc < 0.7) { act = 'hypoglycémie : resucrage, débit − 30 %'; nr = rate * 0.7; hypos++; lowDay = true; }
          else if (gc < lo) { act = 'sous la cible : débit − 20 %'; nr = rate * 0.8; }
          else if (gc > hi + (post ? 0.4 : 0)) { act = 'au-dessus de la cible : débit + ' + Math.round(o.incr * 100) + ' %'; nr = rate * (1 + o.incr); }
          nr = Math.max(0.2, Math.min(8, Math.round(nr * 20) / 20));
          checks.push({ d, t: ck[0], label: ck[1], g: gc, rate, newRate: nr, act });
          dayRd[ck[1]] = gc;
          rate = nr; dayRates.push(rate);
        }
      }
      const mg = sum / n;
      const basal24 = dayRates.reduce((a, x) => a + x * 4, 0);
      days.push({ d, mg, basal24, bol: rx.rapidM.slice(), min: Math.min(...hours.filter((x) => x.d === d).map((x) => x.g)), max: Math.max(...hours.filter((x) => x.d === d).map((x) => x.g)), hypo: lowDay, rd: dayRd });
      // Adaptation quotidienne des bolus (protocole) : glycémie avant le repas suivant.
      const ctl = [dayRd['avant déjeuner'], dayRd['avant dîner'], dayRd['23 h']];
      const lows = checks.filter((c) => c.d === d && c.g < 0.7);
      const log = [];
      rx.rapidM = rx.rapidM.map((u, m) => {
        const win = [[7.5, 12.5], [12.5, 19.5], [19.5, 24]][m];
        const hy = lows.some((c) => c.t > win[0] && c.t < win[1]);
        let nu = u;
        if (hy) nu = Math.max(0, u - 2 * step(u));
        else if (ctl[m] != null && ctl[m] < lo) nu = Math.max(0, u - step(u));
        else if (ctl[m] != null && ctl[m] > hi) nu = u + step(u);
        if (nu !== u) log.push(['petit-déjeuner', 'déjeuner', 'dîner'][m] + ' ' + u + ' → ' + nu + ' U');
        return nu;
      });
      rx.rapid = rx.rapidM.reduce((a, x) => a + x, 0);
      days[days.length - 1].bolLog = log;
      D.hospDay(pt, mg);
      gm = mg;
    }
    // Sortie : débit des dernières 24 h ; relais proposé (basale = 80 % du débit de base, bolus inchangés).
    const last = days[days.length - 1];
    const relay = { basal: Math.round(last.basal24 * 0.8 / 2) * 2, rapidM: rx.rapidM.slice() };
    rx.pump = 0; rx.basal = save.basal; rx.rapidM = save.rapidM; rx.rapid = save.rapid; rx.su = o.stopSu ? 0 : save.su;
    pt.par.adh = save.adh; pt.par.gv = save.gv; Object.assign(pt.take, save.take); pt.st.hypo += hypos;
    return { o, lo, hi, hours, checks, days, hypos, relay, last, rate, W };
  }

  S.dt2hosp = { run, DEFAULTS, TARGETS, CHECKS };
})();
