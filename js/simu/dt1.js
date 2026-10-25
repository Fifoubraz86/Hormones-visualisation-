/*
 * Diabète de type 1 : simulateur didactique (onglet « Diabète de type 1 », #dt1).
 *
 * Modèle au pas de 5 minutes, volontairement transparent : le patient a des besoins réels cachés
 * (débit de base heure par heure avec phénomène de l'aube, ratio glucides/insuline par repas, sensibilité),
 * et la glycémie évolue selon
 *   dG/dt = FC · absorption des glucides + FSI · sensibilité · (besoin de base − insuline active) + contre-régulation − glycosurie
 * où FSI est le facteur de sensibilité à l'insuline (g/L par unité) et FC = FSI / ratio (g/L par gramme).
 * Si l'insuline délivrée égale le besoin, la glycémie reste plate ; l'écart entre réglages et besoins réels se lit
 * directement sur la courbe. Insuline rapide : courbe d'action exponentielle (pic 75 min, durée 5 h, modèle
 * d'OpenAPS) ; glargine U100, U300, dégludec, NPH ; pompe (débit par créneau, débit temporaire) ; boucle
 * semi-fermée (débit automatique et micro-bolus de correction, suspension avant hypoglycémie, repas à annoncer).
 * Corps cétoniques en carence insulinique (panne de pompe, oubli de basale, maladie). Indicateurs du consensus
 * international sur le temps dans la cible (Battelino, Diabetes Care 2019) : TIR 0,70–1,80 g/L > 70 %,
 * TBR < 0,70 < 4 % (< 0,54 : < 1 %), CV ≤ 36 %, GMI.
 */
(function () {
  'use strict';
  const S = window.HV.simu;
  const main = document.getElementById('svMain');
  const statusEl = document.getElementById('svStatus');
  const NS = 'http://www.w3.org/2000/svg';
  const DT = 5; // minutes
  const fmt = (v, d) => (v == null || isNaN(v) ? '—' : Number(v).toFixed(d).replace('.', ','));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const gauss = (r) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  function h(tag, attrs, kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
    (Array.isArray(kids) ? kids : kids != null ? [kids] : []).forEach((c) => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return e;
  }
  function el(tag, a, par) { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (par) par.appendChild(n); return n; }

  /* ---------- Insuline ---------- */
  // Courbe d'action exponentielle (OpenAPS) : fraction de la dose agissant par minute, t en minutes.
  function expCurve(peak, dia) {
    const tau = peak * (1 - peak / dia) / (1 - 2 * peak / dia), a = 2 * tau / dia, Sx = 1 / (1 - a + (1 + a) * Math.exp(-dia / tau));
    return {
      act: (t) => (t <= 0 || t >= dia ? 0 : (Sx / (tau * tau)) * t * (1 - t / dia) * Math.exp(-t / tau)),
      iob: (t) => (t <= 0 ? 1 : t >= dia ? 0 : 1 - Sx * (1 - a) * ((t * t / (tau * dia * (1 - a)) - t / tau - 1) * Math.exp(-t / tau) + 1))
    };
  }
  const RAPID = expCurve(75, 300);
  // Basales injectées : activité (U/h) à t heures de l'injection, pour une dose d'1 U.
  // Basales injectées : profil d'action (pour 1 U, intégrale = 1 sur la durée d'action), t en heures après l'injection.
  // Glargine U100 : creux avant l'injection suivante, maximum vers 12 h ; U300 et dégludec : plus plates et plus longues.
  const mkBasal = (name, dur, shape, once) => { let sum = 0; for (let x = 0.05; x < dur; x += 0.1) sum += shape(x) * 0.1; return { name, dur, once, act: (t) => (t <= 0 || t >= dur ? 0 : shape(t) / sum) }; };
  const BASALS = {
    g100: mkBasal('Glargine U100 (Lantus®, Abasaglar®)', 24, (x) => Math.min(1, x / 1.5) * (0.72 + 0.56 * Math.sin(Math.PI * x / 24)), true),
    g300: mkBasal('Glargine U300 (Toujeo®)', 32, (x) => Math.min(1, x / 3) * (0.9 + 0.2 * Math.sin(Math.PI * x / 32)) * (x > 26 ? (32 - x) / 6 : 1), true),
    deg: mkBasal('Dégludec (Tresiba®)', 42, (x) => Math.min(1, x / 4) * (x > 36 ? (42 - x) / 6 : 1), true),
    nph: mkBasal('NPH matin et soir (Insulatard®, Umuline NPH®)', 14, (x) => (x / 5) * Math.exp(1 - x / 5), false)
  };

  /* ---------- Patients ---------- */
  // Besoins réels (cachés) : débit de base par heure (U/h), ratios (g de glucides par unité), FSI (g/L par U).
  const prof = (night, dawn, day, evening) => Array.from({ length: 24 }, (_, hh) => (hh < 3 ? night : hh < 8 ? dawn : hh < 18 ? day : evening));
  const PRESETS = [
    { id: 'mdi', icon: '🖊️', name: 'Léa', who: 'Léa, 24 ans, étudiante, DT1 depuis 10 ans', mode: 'mdi', W: 60, a1c: 8.1,
      story: 'Basal-bolus : glargine U100 le soir, ratio identique à tous les repas. Elle se plaint de « malaises la nuit » et de glycémies hautes au réveil et après le petit-déjeuner.',
      truth: { basal: prof(0.7, 1.05, 0.85, 0.8), icr: [7, 11, 9], isf: 0.45, sensVar: 0.12 },
      set: { basalType: 'g100', basalDose: 27, basalTime: 22, icr: [10, 10, 10], isf: 0.6, target: 1.2, prebolus: 0 } },
    { id: 'pump', icon: '📟', name: 'Thomas', who: 'Thomas, 35 ans, cycliste, pompe depuis 3 ans', mode: 'pump', W: 74, a1c: 7.6,
      story: 'Pompe : débit de base plat, réglé il y a longtemps. Il roule à 18 h trois fois par semaine et fait des hypoglycémies pendant et après l\'effort.',
      truth: { basal: prof(0.75, 1.1, 0.7, 0.75), icr: [8, 10, 10], isf: 0.5, sensVar: 0.1 },
      set: { seg: [1, 1, 1, 1, 1], icr: [10, 10, 10], isf: 0.5, target: 1.1, prebolus: 10, dia: 4 },
      ev: 'sport' },
    { id: 'loop', icon: '🔁', name: 'Inès', who: 'Inès, 17 ans, lycéenne, boucle semi-fermée', mode: 'loop', W: 55, a1c: 8.4,
      story: 'Boucle semi-fermée (capteur, pompe, algorithme). Elle oublie souvent d\'annoncer ses repas et grignote au lycée : « La boucle n\'a qu\'à gérer. »',
      truth: { basal: prof(0.8, 1.15, 1, 0.95), icr: [6, 8, 8], isf: 0.4, sensVar: 0.15 },
      set: { seg: [0.8, 0.9, 0.9, 0.9, 0.9], icr: [10, 12, 12], isf: 0.5, target: 1.1, prebolus: 0, dia: 3, loopTarget: 1.2 },
      ev: 'skipBolus' }
  ];
  const SEGS = [[0, 3, '0 h – 3 h'], [3, 8, '3 h – 8 h'], [8, 12, '8 h – 12 h'], [12, 18, '12 h – 18 h'], [18, 24, '18 h – 24 h']];
  const segRate = (seg, hh) => seg[SEGS.findIndex(([a, b]) => hh >= a && hh < b)];
  const MEALS = [['Petit-déjeuner', 7.5], ['Déjeuner', 12.5], ['Dîner', 19.5]];
  const EVENTS = [
    ['none', 'Journée habituelle'],
    ['sport', 'Vélo 1 h à 18 h (intensité modérée)'],
    ['sportAdj', 'Vélo 1 h à 18 h, avec adaptation (débit temporaire − 50 % ou bolus du déjeuner − 30 % et collation 20 g)'],
    ['skipBolus', 'Bolus du déjeuner oublié'],
    ['late', 'Bolus du dîner fait 30 min après le repas'],
    ['pizza', 'Pizza au dîner (riche en graisses, absorption lente)'],
    ['snack', 'Goûter 40 g non annoncé à 16 h'],
    ['alcohol', 'Soirée arrosée (alcool à 21 h, sans collation)'],
    ['ill', 'Gastro-entérite fébrile (insulinorésistance, repas réduits)'],
    ['occlusion', 'Pompe : cathéter bouché de 1 h à 8 h (sans alarme)'],
    ['forgetBasal', 'Stylos : basale oubliée (la veille au soir, ou le matin si injection matinale)']
  ];

  /* ---------- Simulation ---------- */
  // st : réglages (prescription) ; pt : patient (besoins réels) ; plan : repas ; ev : événement du jour.
  function simulate(pt, st, mode, opt) {
    const nDays = opt.days || 1, r = rng(opt.seed || 1), N = 288;
    const T = pt.truth, out = [];
    let G = opt.g0 || 1.3, ket = 0.1, cgmErr = 0;
    const bol = []; // {t (min absolue), u, auto}
    const pend = []; // bolus de repas à faire (correction calculée au moment du bolus)
    const carbs = []; // {t, g, tmax}
    const basalInj = []; // {t, u}
    const hist = []; // valeurs du capteur
    const stats = { hypo: 0, sev: 0, dka: false, treat: 0 };
    let lowSince = -1, lastTreat = -999;
    // Stylos : la basale de la veille agit déjà au début de la simulation.
    if (mode === 'mdi') { const B = BASALS[st.basalType]; if (B.once) for (let k = 1; k <= 2; k++) basalInj.push({ t: (st.basalTime - 24 * k) * 60, u: st.basalDose, type: st.basalType }); else basalInj.push({ t: -4 * 60, u: st.basalDose / 2, type: 'nph' }, { t: -16 * 60, u: st.basalDose / 2, type: 'nph' }); }
    else for (let x = -300; x < 0; x += DT) bol.push({ t: x, u: segRate(st.seg, (x / 60 + 24) % 24) * DT / 60, basal: true }); // pompe déjà en marche
    for (let d = -1; d < nDays; d++) {
      const evOf = (k) => (k < 0 ? 'none' : (opt.evDays ? opt.evDays(k) : opt.ev) || 'none');
      const ev = evOf(d);
      // Basale oubliée : l'injection du soir de la veille (ou du matin même) manque.
      const forgot = st.basalTime >= 14 ? evOf(d + 1) === 'forgetBasal' : ev === 'forgetBasal';
      const sens = clamp(1 + T.sensVar * gauss(r) * (opt.vary ? 1.4 : 0), 0.6, 1.5);
      const day0 = (d + 1) * 1440;
      // Repas du jour (glucides réels, glucides comptés), bolus.
      MEALS.forEach(([, tm], m) => {
        let g = opt.carbs[m] * (opt.vary ? clamp(1 + 0.25 * gauss(r), 0.4, 1.8) : 1), tmax = opt.vary ? clamp(55 + 15 * gauss(r), 30, 100) : 55;
        let tt = day0 + tm * 60 + (opt.vary ? Math.round(gauss(r) * 20) : 0);
        if (ev === 'ill' && d >= 0) g *= 0.5;
        if (ev === 'pizza' && m === 2) { g *= 1.2; tmax = 120; }
        carbs.push({ t: tt, g, tmax });
        const counted = g * (opt.vary ? clamp(1 + 0.2 * gauss(r), 0.5, 1.5) : 1) * (ev === 'pizza' && m === 2 ? 0.85 : 1);
        if (ev === 'skipBolus' && m === 1) return;
        let u = counted / st.icr[m];
        if (ev === 'sportAdj' && m === 1 && mode === 'mdi') u *= 0.7;
        const delay = ev === 'late' && m === 2 ? 30 : -(st.prebolus || 0);
        pend.push({ t: tt + delay, u });
      });
      if (ev === 'snack') carbs.push({ t: day0 + 16 * 60, g: 40, tmax: 40 });
      // Vie réelle : un grignotage non annoncé un jour sur trois, horaire variable.
      if (opt.vary && d >= 0 && r() < 0.33) carbs.push({ t: day0 + (15 + 6 * r()) * 60, g: 15 + 25 * r(), tmax: 40 });
      if (ev === 'sportAdj' && mode === 'mdi') carbs.push({ t: day0 + 17.75 * 60, g: 20, tmax: 30 });
      if (mode === 'mdi') {
        const B = BASALS[st.basalType];
        if (B.once) { if (!forgot) basalInj.push({ t: day0 + st.basalTime * 60, u: st.basalDose, type: st.basalType }); }
        else { basalInj.push({ t: day0 + 8 * 60, u: st.basalDose / 2, type: 'nph' }); if (evOf(d + 1) !== 'forgetBasal') basalInj.push({ t: day0 + 20 * 60, u: st.basalDose / 2, type: 'nph' }); }
      }
      for (let i = 0; i < N; i++) {
        const t = day0 + i * DT, hh = (i * DT) / 60;
        // Insuline active (U/h) : bolus et basale.
        let act = 0, iob = 0;
        let iobB = 0;
        // Bolus de repas : glucides comptés / ratio + correction (écart à la cible / sensibilité − insuline active des bolus).
        for (const pb of pend) if (!pb.done && t >= pb.t) {
          pb.done = true;
          let io = 0; for (const b of bol) { const x = t - b.t; if (!b.basal && x > 0 && x < 300) io += b.u * RAPID.iob(x); }
          const cg0 = hist.length ? hist[hist.length - 1] : G, corr = Math.max(0, (cg0 - (mode === 'loop' ? st.loopTarget || 1.1 : st.target || 1.2)) / st.isf - io);
          bol.push({ t, u: pb.u + corr, meal: true, corr });
        }
        for (const b of bol) { const x = t - b.t; if (x > 0 && x < 300) { act += b.u * RAPID.act(x) * 60; const io = b.u * RAPID.iob(x); iob += io; if (!b.basal) iobB += io; } }
        let basalRate = 0, auto = 0;
        if (mode === 'mdi') { for (const b of basalInj) { const x = (t - b.t) / 60; act += b.u * BASALS[b.type].act(x); } }
        else {
          basalRate = segRate(st.seg, hh);
          if (ev === 'sportAdj' && hh >= 17 && hh < 19) basalRate *= 0.5;
          if (mode === 'loop' && d >= -1) {
            // Algorithme : glycémie prévue à 30 min (tendance du capteur, insuline active), débit automatique,
            // micro-bolus de correction, suspension si hypoglycémie prévue.
            const n = hist.length, g0 = n ? hist[n - 1] : G, slope = n > 3 ? (hist[n - 1] - hist[n - 4]) / 15 : 0;
            const pred = g0 + slope * 30 - Math.max(0, iobB) * st.isf * 0.25;
            const tgt = st.loopTarget || 1.1;
            if (pred < 0.8) basalRate = 0;
            else basalRate = clamp(basalRate + (pred - tgt) / st.isf / 3, 0, basalRate * 2.5 + 0.3);
            const need = (pred - tgt) / st.isf - iobB;
            if (pred > 1.6 && need > 0.3 && i % 3 === 0 && !(ev === 'occlusion' && hh >= 1 && hh < 8)) { auto = Math.min(need * 0.3, 1); bol.push({ t, u: auto, auto: true }); }
          }
          if (ev === 'occlusion' && hh >= 1 && hh < 8) basalRate = 0;
          // le débit de base est une suite de micro-bolus : action retardée (même courbe), approximée par un bolus toutes les 5 min
          bol.push({ t, u: basalRate * DT / 60, basal: true });
        }
        // Absorption des glucides (g/h).
        let ra = 0;
        for (const c of carbs) { const x = t - c.t; if (x > 0 && x < 8 * c.tmax) ra += c.g * x / (c.tmax * c.tmax) * Math.exp(-x / c.tmax) * 60; }
        // Besoin de base réel, effort, alcool, maladie.
        let need = T.basal[Math.floor(hh)], sens2 = sens, extra = 0;
        if ((ev === 'sport' || ev === 'sportAdj') && hh >= 18 && hh < 19) extra -= 0.55; // captation musculaire sans insuline
        if ((ev === 'sport' || ev === 'sportAdj') && hh >= 19) sens2 *= 1.35; // sensibilité accrue la nuit suivante
        if (ev === 'alcohol' && (hh >= 22 || hh < 8)) need *= 0.65;
        if (ev === 'ill') { need *= 1.5; sens2 *= 0.75; }
        // Glucides corrigés par le patient en hypoglycémie (resucrage 15 g, à 15 min d'intervalle).
        const cg = hist.length ? hist[hist.length - 1] : G;
        if (opt.treat !== false && cg < 0.65 && t - lastTreat >= 15) { carbs.push({ t, g: 15, tmax: 15 }); lastTreat = t; if (d >= 0) stats.treat++; }
        const ISF = T.isf, FC = ISF / T.icr[hh < 11 ? 0 : hh < 16 ? 1 : 2]; // ratio réel selon le moment de la journée
        const cr = G < 0.6 ? 0.12 * (0.6 - G) / 0.2 : 0; // contre-régulation (émoussée dans le DT1)
        const ren = G > 1.8 ? 0.06 * (G - 1.8) : 0;
        const dG = FC * ra + ISF * sens2 * (need - act) + cr - ren + extra;
        G = clamp(G + dG * DT / 60, 0.25, 5.5);
        // Corps cétoniques : carence en insuline (activité < 40 % du besoin), maladie.
        const def = Math.max(0, 1 - act / (0.4 * need + 1e-6));
        ket = clamp(ket + (DT / 60) * (0.8 * def * (ev === 'ill' ? 1.6 : 1) - 0.35 * Math.max(0, ket - 0.1)), 0.05, 8);
        cgmErr = 0.9 * cgmErr + 0.04 * gauss(r);
        const cgm = clamp(G * (1 + cgmErr * 0.6) + (opt.vary ? 0 : 0), 0.4, 4);
        hist.push(cgm);
        if (d >= 0) {
          out.push({ d, t: hh, G, cgm, ra, act, iob, basal: mode === 'mdi' ? null : basalRate, ket, auto });
          if (G < 0.54 && lowSince < 0) { lowSince = t; stats.hypo++; }
          if (G < 0.4 && lowSince >= 0 && !stats.sevMark) { stats.sev++; stats.sevMark = true; }
          if (G > 0.7) { lowSince = -1; stats.sevMark = false; }
          if (ket > 3 && G > 2.5) stats.dka = true;
        }
      }
    }
    // Bolus et repas de la période affichée (pour les graphiques).
    const start = 1440;
    return { pts: out, stats, bol: bol.filter((b) => b.t >= start && !b.basal).map((b) => Object.assign({}, b, { t: (b.t - start) / 60 })), carbs: carbs.filter((c) => c.t >= start).map((c) => ({ t: (c.t - start) / 60, g: c.g })), basalInj: basalInj.filter((b) => b.t >= start).map((b) => ({ t: (b.t - start) / 60, u: b.u })) };
  }

  function metrics(pts) {
    const v = pts.map((q) => q.cgm), n = v.length || 1, mean = v.reduce((a, x) => a + x, 0) / n;
    const sd = Math.sqrt(v.reduce((a, x) => a + (x - mean) * (x - mean), 0) / n);
    const frac = (f) => v.filter(f).length / n * 100;
    return { mean, cv: sd / mean * 100, gmi: 3.31 + 0.02392 * mean * 100, tir: frac((x) => x >= 0.7 && x <= 1.8), tbr: frac((x) => x < 0.7), tbr2: frac((x) => x < 0.54), tar: frac((x) => x > 1.8), tar2: frac((x) => x > 2.5) };
  }

  /* ---------- Analyse (lecture guidée de la courbe) ---------- */
  function analyse(pts, st, mode, pt) {
    const out = [], at = (a, b) => pts.filter((q) => (q.t >= a && q.t < b) || (a > b && (q.t >= a || q.t < b)));
    const avg = (arr) => arr.reduce((s, q) => s + q.cgm, 0) / (arr.length || 1);
    const night = at(0, 3), dawn = at(4.5, 7.3), noct = at(1, 6.5);
    const minN = Math.min(...noct.map((q) => q.cgm));
    if (minN < 0.7) out.push(['bad', 'Hypoglycémie nocturne (minimum ' + fmt(minN, 2) + ' g/L).', mode === 'mdi' ? 'Basale trop forte la nuit (ou bolus du dîner trop fort si elle survient avant 1 h) : baisser la basale de 10 à 20 % ; la glargine U300 ou la dégludec donnent moins d\'hypoglycémies nocturnes que la glargine U100 injectée le soir.' : 'Débit de base de la nuit trop élevé : baisser le créneau concerné de 10 à 20 %.']);
    else if (avg(dawn) - avg(night) > 0.35) out.push(['warn', 'Remontée de fin de nuit (phénomène de l\'aube : + ' + fmt(avg(dawn) - avg(night), 2) + ' g/L entre 0–3 h et 5–7 h).', mode === 'mdi' ? 'Avec une seule basale, difficile à couvrir sans hypoglycémie en début de nuit : basale plus plate (U300, dégludec), ou injection le matin ; la pompe permet un créneau plus fort de 3 h à 8 h.' : 'Augmenter le débit du créneau 3 h – 8 h (10 à 20 %), vérifier par une nuit sans collation ni correction tardive.']);
    MEALS.forEach(([lab, tm], m) => {
      const pre = avg(at(tm - 0.5, tm)), peak = Math.max(...at(tm + 0.5, tm + 2.5).map((q) => q.cgm)), post = avg(at(tm + 3.5, tm + 4.5));
      const lo = Math.min(...at(tm + 1.5, tm + 4.5).map((q) => q.cgm));
      if (lo < 0.7) out.push(['bad', lab + ' : hypoglycémie dans les 4 h (' + fmt(lo, 2) + ' g/L).', 'Ratio trop fort (ou glucides surestimés, effort après le repas) : passer de ' + fmt(10 / st.icr[m], 1) + ' à ' + fmt(10 / st.icr[m] * 0.85, 1) + ' U pour 10 g.']);
      else if (post - pre > 0.4 && peak > 2) out.push(['warn', lab + ' : glycémie 4 h après plus haute qu\'avant (+ ' + fmt(post - pre, 2) + ' g/L, pic ' + fmt(peak, 2) + ').', 'Ratio insuffisant : passer de ' + fmt(10 / st.icr[m], 1) + ' à ' + fmt(10 / st.icr[m] * 1.15, 1) + ' U pour 10 g (vérifier le comptage des glucides).']);
      else if (peak > 2.5 && post - pre < 0.2) out.push(['tip', lab + ' : pic élevé (' + fmt(peak, 2) + ' g/L) mais retour à la valeur de départ.', 'Ratio correct ; le pic se réduit en injectant 15 à 20 min avant le repas (pré-bolus), ou en limitant les glucides à index glycémique élevé.']);
    });
    if (!out.length) out.push(['good', 'Rien à signaler sur cette journée.', 'Les réglages couvrent les besoins : vérifiez sur 14 jours (variabilité des repas, du comptage, de la sensibilité).']);
    return out;
  }

  /* ---------- Vue ---------- */
  let ST = null;
  function setup() {
    statusEl.hidden = true;
    main.textContent = '';
    main.className = 'sv-main sv-home dt1';
    main.append(
      h('section', { class: 'sv-intro' }, [
        h('p', { class: 'sv-eyebrow' }, 'Diabète de type 1 · insulinothérapie'),
        h('h1', null, 'Réglez l\'insuline comme le pancréas le ferait.'),
        h('p', { class: 'sv-lead' }, 'Un patient aux besoins cachés (débit de base heure par heure, ratios, sensibilité), vos réglages, sa journée : repas, effort, alcool, maladie, panne de cathéter. Lisez la courbe du capteur, corrigez, simulez 14 jours.')
      ]),
      h('section', { class: 'sv-card' }, [
        h('h3', null, 'Choisissez un patient'),
        h('div', { class: 'sv-storygrid dt1-pick' }, PRESETS.map((p) => h('button', { type: 'button', class: 'sv-story', id: 'dt1-' + p.id, onclick: () => start(p) }, [
          h('span', { class: 'sv-game-ic', 'aria-hidden': 'true' }, p.icon), h('strong', null, { mdi: 'DT1 sous basal-bolus', pump: 'DT1 sous pompe', loop: 'DT1 sous boucle semi-fermée' }[p.mode]), h('span', null, p.who), h('span', null, p.story)]))),
        h('p', { class: 'sv-note' }, 'Modèle pédagogique (complément) : besoins réels du patient, courbe d\'action de l\'analogue rapide (pic 75 min, 5 h), basales U100, U300, dégludec, NPH ; cibles du consensus international sur le temps dans la cible (TIR > 70 %, TBR < 4 %).')
      ])
    );
  }

  function start(p) {
    ST = { p, pt: { truth: JSON.parse(JSON.stringify(p.truth)), W: p.W }, mode: p.mode, set: JSON.parse(JSON.stringify(p.set)), carbs: [50, 70, 70], ev: p.ev || 'none', t: 12, reveal: false, tries: [], humor: 'noir' };
    if (ST.mode === 'mdi') Object.assign(ST.set, { seg: ST.set.seg || [0.8, 1, 0.9, 0.9, 0.9], dia: 4 });
    else Object.assign(ST.set, { basalType: 'g100', basalDose: Math.round(ST.set.seg.reduce((a, x, i) => a + x * (SEGS[i][1] - SEGS[i][0]), 0) * 1.2), basalTime: 22 });
    run(); render();
  }
  function run() {
    const o = { carbs: ST.carbs, ev: ST.ev, seed: 7 };
    ST.day = simulate(ST.pt, ST.set, ST.mode, o);
    ST.dayM = metrics(ST.day.pts);
  }
  function run14() {
    // 14 jours : repas, horaires, comptage et sensibilité variables ; l'événement choisi survient 2 jours sur 7.
    const o = { carbs: ST.carbs, days: 14, vary: true, seed: 11, evDays: (d) => (ST.ev !== 'none' && (d % 7 === 2 || d % 7 === 5) ? ST.ev : 'none') };
    const r = simulate(ST.pt, ST.set, ST.mode, o);
    ST.m14 = metrics(r.pts); ST.r14 = r;
    ST.tries.push({ n: ST.tries.length + 1, tir: ST.m14.tir, tbr: ST.m14.tbr, set: JSON.stringify(ST.set) });
  }

  function render() {
    const p = ST.p, s = ST.set, mode = ST.mode;
    statusEl.hidden = false; statusEl.textContent = 'DT1 · ' + p.name;
    main.textContent = '';
    main.className = 'sv-main sv-game sv-sandbox dt1';
    const num = (id, val, step, min, max, on, w) => h('input', { type: 'number', id, class: 'sv-num sv-num-s', value: val, step, min, max, inputmode: 'decimal', style: w ? 'width:' + w : null, onchange: (e) => { const v = parseFloat(String(e.target.value).replace(',', '.')); if (!isNaN(v)) { on(v); run(); render(); } } });
    const field = (lab, input) => h('div', { class: 'sv-field' }, [h('label', null, lab), input]);
    const modeTabs = h('div', { class: 'sv-seg' }, [['mdi', 'Basal-bolus (stylos)'], ['pump', 'Pompe'], ['loop', 'Boucle semi-fermée']].map(([k, t]) => h('button', { type: 'button', class: 'sv-segb' + (mode === k ? ' on' : ''), id: 'dt1Mode-' + k, onclick: () => { ST.mode = k; if (k !== 'mdi' && !(ST.set.dia)) ST.set.dia = 4; if (k === 'loop' && !ST.set.loopTarget) ST.set.loopTarget = 1.1; run(); render(); } }, t)));
    const insBlock = mode === 'mdi'
      ? [field('Insuline basale', h('select', { id: 'dt1BasType', onchange: (e) => { s.basalType = e.target.value; run(); render(); } }, Object.entries(BASALS).map(([k, v]) => h('option', { value: k, selected: s.basalType === k }, v.name)))),
        h('div', { class: 'sv-form dt1-bas' }, [field('Dose (U/j)', num('dt1BasDose', s.basalDose, 1, 0, 200, (v) => { s.basalDose = v; })), BASALS[s.basalType].once ? field('Heure', h('select', { id: 'dt1BasTime', onchange: (e) => { s.basalTime = +e.target.value; run(); render(); } }, [[8, '8 h'], [12, '12 h'], [20, '20 h'], [22, '22 h']].map(([v, t]) => h('option', { value: v, selected: s.basalTime === v }, t)))) : h('span', { class: 'sv-muted' }, 'moitié à 8 h, moitié à 20 h')])]
      : [h('p', { class: 'sv-stage-h' }, mode === 'loop' ? 'Débit de base de référence (U/h ; l\'algorithme l\'ajuste)' : 'Débit de base (U/h)'),
        h('div', { class: 'dt1-segs' }, SEGS.map(([, , lab], i) => h('label', { class: 'dt1-seg' }, [h('span', null, lab), num('dt1Seg' + i, s.seg[i], 0.05, 0, 5, (v) => { s.seg[i] = v; })]))),
        h('p', { class: 'sv-note' }, 'Total de base : ' + fmt(s.seg.reduce((a, x, i) => a + x * (SEGS[i][1] - SEGS[i][0]), 0), 1) + ' U/j.')];
    const left = h('aside', { class: 'sv-dossier' }, [
      h('div', { class: 'sv-card sv-id' }, [h('p', { class: 'sv-eyebrow' }, 'Patient simulé'), h('h2', null, p.who), h('p', { class: 'sv-muted' }, p.story), h('p', null, 'Poids ' + p.W + ' kg · HbA1c ' + fmt(p.a1c, 1) + ' %'),
        h('div', { class: 'sv-actions' }, [h('button', { type: 'button', class: 'sv-secondary', onclick: setup }, 'Autre patient'), h('button', { type: 'button', class: 'sv-linkbtn', id: 'dt1Reveal', onclick: () => { ST.reveal = !ST.reveal; render(); } }, ST.reveal ? 'Masquer les besoins réels' : 'Révéler les besoins réels')]),
        ST.reveal ? truthBlock() : null]),
      h('div', { class: 'sv-card' }, [
        h('p', { class: 'sv-eyebrow' }, 'Réglages'),
        modeTabs,
        ...insBlock,
        h('p', { class: 'sv-stage-h' }, 'Ratios (unités pour 10 g de glucides)'),
        h('div', { class: 'dt1-segs' }, MEALS.map(([lab], m) => h('label', { class: 'dt1-seg' }, [h('span', null, lab), num('dt1Icr' + m, Math.round(100 / s.icr[m]) / 10, 0.1, 0.2, 5, (v) => { s.icr[m] = 10 / v; })]))),
        h('div', { class: 'sv-inline' }, [field('Sensibilité (g/L par U)', num('dt1Isf', s.isf, 0.05, 0.1, 2, (v) => { s.isf = v; })), field('Pré-bolus (min avant le repas)', num('dt1Pre', s.prebolus || 0, 5, 0, 45, (v) => { s.prebolus = v; }))]),
        mode === 'loop' ? field('Cible de la boucle (g/L)', h('select', { id: 'dt1LoopT', onchange: (e) => { s.loopTarget = +e.target.value; run(); render(); } }, [1, 1.1, 1.2, 1.5].map((v) => h('option', { value: v, selected: s.loopTarget === v }, fmt(v, 2) + (v === 1.5 ? ' (mode activité)' : ''))))) : null,
        h('p', { class: 'sv-note' }, 'Repères : ratio ≈ 500 / dose totale (g par unité), sensibilité ≈ 1,8 à 2 / dose totale (g/L par unité, « règle des 1800 »), basale ≈ 40–50 % de la dose totale ; sous pompe, débit de base ≈ 80 % de la basale des stylos.')
      ])
    ]);
    const d = ST.day, M = ST.dayM;
    const right = h('section', { class: 'sv-consult' }, [
      h('div', { class: 'sv-card' }, [
        h('div', { class: 'sv-form' }, [
          ...MEALS.map(([lab], m) => field(lab + ' (g de glucides)', num('dt1C' + m, ST.carbs[m], 5, 0, 200, (v) => { ST.carbs[m] = v; }))),
          field('Événement', h('select', { id: 'dt1Ev', onchange: (e) => { ST.ev = e.target.value; run(); render(); } }, EVENTS.filter(([k]) => !(k === 'occlusion' && mode === 'mdi') && !(k === 'forgetBasal' && mode !== 'mdi')).map(([k, t]) => h('option', { value: k, selected: ST.ev === k }, t))))
        ]),
        h('div', { class: 'ph-chartbox' }, dayChart(d)),
        h('div', { class: 'dt1-kpis' }, kpis(M, d.stats)),
        eventNote(d)
      ]),
      h('div', { class: 'sv-card' }, [h('p', { class: 'sv-eyebrow' }, 'Lecture de la journée'), h('ul', { class: 'dt1-an' }, analyse(d.pts, s, mode, ST.pt).map(([k, a, b]) => h('li', { class: 'dt1-' + k }, [h('b', null, a), ' ', b])))]),
      h('div', { class: 'sv-card' }, [
        h('div', { class: 'sv-card-head' }, [h('p', { class: 'sv-eyebrow' }, 'Sur 14 jours (rapport AGP)'), h('button', { type: 'button', class: 'sv-primary', id: 'dt1Run14', onclick: () => { run14(); render(); } }, 'Simuler 14 jours')]),
        ST.m14 ? agpBlock() : h('p', { class: 'sv-muted' }, 'Repas, horaires, comptage des glucides et sensibilité varient d\'un jour à l\'autre ; l\'événement choisi survient deux jours par semaine. Défi : TIR > 70 % et TBR < 4 %.')
      ])
    ]);
    main.append(left, right);
  }

  function truthBlock() {
    const T = ST.pt.truth, tot = T.basal.reduce((a, x) => a + x, 0);
    return h('div', { class: 'dt1-truth' }, [
      h('p', null, h('b', null, 'Besoins réels du patient')),
      h('p', null, 'Débit de base : ' + SEGS.map(([a, b, lab]) => lab + ' ' + fmt(T.basal.slice(a, b).reduce((x, y) => x + y, 0) / (b - a), 2)).join(' · ') + ' U/h (' + fmt(tot, 1) + ' U/j ; en stylo, basale ≈ ' + Math.round(tot) + ' U).'),
      h('p', null, 'Ratios : ' + MEALS.map(([lab], m) => lab.toLowerCase() + ' ' + fmt(10 / T.icr[m], 1)).join(' · ') + ' U pour 10 g · sensibilité ' + fmt(T.isf, 2) + ' g/L par U.')
    ]);
  }
  function kpis(M, stv) {
    const k = (lab, v, ok, sub) => h('div', { class: 'dt1-kpi ' + (ok ? 'ok' : 'ko') }, [h('span', null, lab), h('strong', null, v), sub ? h('em', null, sub) : null]);
    return [k('Temps dans la cible', fmt(M.tir, 0) + ' %', M.tir >= 70, '0,70–1,80 g/L · > 70 %'), k('Sous 0,70', fmt(M.tbr, 1) + ' %', M.tbr < 4, '< 4 % (< 0,54 : ' + fmt(M.tbr2, 1) + ' %)'), k('Au-dessus de 1,80', fmt(M.tar, 0) + ' %', M.tar < 25, '< 25 % (> 2,50 : ' + fmt(M.tar2, 0) + ' %)'), k('Moyenne · CV', fmt(M.mean, 2) + ' g/L · ' + fmt(M.cv, 0) + ' %', M.cv <= 36, 'CV ≤ 36 %'), k('GMI', fmt(M.gmi, 1) + ' %', M.gmi < 7, 'HbA1c estimée')].concat(stv.sev || stv.dka ? [k('Événements', (stv.sev ? stv.sev + ' hypo. sévère ' : '') + (stv.dka ? 'acidocétose' : ''), false)] : []);
  }
  function eventNote(d) {
    const ev = ST.ev, H = ST.humor, maxK = Math.max(...d.pts.map((q) => q.ket));
    const N = {
      sport: 'Effort : le muscle capte le glucose sans insuline, puis la sensibilité reste accrue 12 à 24 h (hypoglycémie nocturne possible). Adapter : débit temporaire − 50 % 1 à 2 h avant et pendant (pompe), bolus du repas précédent − 30 à 50 % et collation (stylos).',
      sportAdj: 'Avec adaptation : la chute pendant l\'effort est amortie ; surveiller la nuit suivante (baisser aussi la basale ou le débit de la nuit de 10 à 20 %).',
      skipBolus: 'Bolus oublié : la glycémie monte pendant 4 à 6 h. ' + (ST.mode === 'loop' ? 'La boucle corrige en partie (débit maximal, micro-bolus), mais trop tard pour éviter le pic : il faut annoncer les repas.' : 'Correction dès que constaté (dose = écart à la cible / sensibilité).'),
      late: 'Bolus après le repas : pic plus haut et plus tardif, puis risque de baisse tardive.',
      pizza: 'Repas gras : absorption lente, hyperglycémie tardive (3 à 6 h) ; sous pompe, bolus « mixte » ou « prolongé ».',
      snack: 'Goûter non annoncé : hyperglycémie de fin d\'après-midi ' + (ST.mode === 'loop' ? '(la boucle la rattrape en partie).' : '(bolus à faire, même pour 40 g).'),
      alcohol: 'Alcool : le foie ne fait plus de néoglucogenèse, hypoglycémie nocturne ou matinale ; collation glucidique au coucher, basale ou débit de nuit réduit.',
      ill: 'Maladie : insulinorésistance, besoins augmentés malgré les repas réduits ; ne jamais arrêter l\'insuline, cétonémie si glycémie > 2,50 g/L, bolus de correction toutes les 3 à 4 h.',
      occlusion: 'Cathéter bouché : sous pompe, pas d\'insuline lente en réserve, la cétose s\'installe en quelques heures (cétonémie maximale ' + fmt(maxK, 1) + ' mmol/L). Glycémie > 2,50 g/L inexpliquée : cétonémie, injection au stylo, changer le cathéter.',
      forgetBasal: 'Basale oubliée : hyperglycémie et cétose en fin de nuit et le lendemain (cétonémie maximale ' + fmt(maxK, 1) + ' mmol/L) ; si oubli constaté le matin, faire une partie de la dose.'
    }[ev];
    const joke = H === 'noir' && d.stats.dka ? 'Acidocétose : le cathéter s\'est bouché, l\'équipe des urgences s\'est réveillée.' : H === 'noir' && d.stats.sev ? 'Hypoglycémie sévère : le glucagon nasal était dans le sac. Le sac était dans la voiture.' : null;
    return N || joke ? h('div', { class: 'dt1-evnote' }, [N ? h('p', null, N) : null, joke ? h('p', { class: 'dt1-joke' }, '😬 ' + joke) : null]) : null;
  }

  function dayChart(d) {
    const svg = el('svg', { viewBox: '0 0 760 300', class: 'ph-chart dt1-chart', role: 'img', 'aria-label': 'Glycémie et insuline sur 24 heures' });
    const L = 44, R = 46, T = 14, H = 180, Wc = 760, X = (t) => L + (Wc - L - R) * t / 24;
    const gmax = Math.max(3, ...d.pts.map((q) => q.cgm)) + 0.1, Yg = (v) => T + H * (1 - (v - 0.3) / (gmax - 0.3));
    el('rect', { x: L, y: Yg(1.8), width: Wc - L - R, height: Yg(0.7) - Yg(1.8), class: 'ph-band' }, svg);
    for (let hh = 0; hh <= 24; hh += 3) { el('line', { x1: X(hh), x2: X(hh), y1: T, y2: T + H, class: 'ph-gl' }, svg); el('text', { x: X(hh), y: T + H + 14, class: 'ph-ax', 'text-anchor': 'middle' }, svg).textContent = hh + ' h'; }
    [0.54, 0.7, 1.8, 2.5].forEach((v) => { el('line', { x1: L, x2: Wc - R, y1: Yg(v), y2: Yg(v), class: v < 0.7 ? 'ph-thr' : 'ph-gl' }, svg); el('text', { x: L - 5, y: Yg(v) + 4, class: 'ph-ax', 'text-anchor': 'end' }, svg).textContent = fmt(v, 2); });
    // Insuline : débit de base (pompe) ou activité de la basale, bolus en barres, micro-bolus de la boucle.
    const Yi = (u) => T + H + 78 - u * 9;
    if (ST.mode !== 'mdi') el('path', { d: d.pts.map((q, i) => (i ? 'L' : 'M') + X(q.t).toFixed(1) + ',' + Yi(Math.min(5, q.basal)).toFixed(1)).join(' '), class: 'dt1-basal' }, svg);
    d.bol.forEach((b) => { if (b.u > 0.05) el('rect', { x: X(b.t) - (b.auto ? 1 : 2.5), y: Yi(Math.min(6, b.u)), width: b.auto ? 2 : 5, height: Yi(0) - Yi(Math.min(6, b.u)), class: b.auto ? 'dt1-auto' : 'dt1-bol' }, svg); });
    d.basalInj.forEach((b) => { el('text', { x: X(b.t), y: Yi(0) - 4, class: 'ph-meal', 'text-anchor': 'middle' }, svg).textContent = '💉'; });
    d.carbs.forEach((c) => { if (c.g >= 10) el('text', { x: X(c.t), y: T + 12, class: 'ph-meal', 'text-anchor': 'middle' }, svg).textContent = c.g <= 16 ? '🍬' : '🍽'; });
    el('path', { d: d.pts.map((q, i) => (i ? 'L' : 'M') + X(q.t).toFixed(1) + ',' + Yg(q.cgm).toFixed(1)).join(' '), class: 'ph-l-g' }, svg);
    const kmax = Math.max(...d.pts.map((q) => q.ket));
    if (kmax > 0.6) el('path', { d: d.pts.map((q, i) => (i ? 'L' : 'M') + X(q.t).toFixed(1) + ',' + (T + H - H * Math.min(4, q.ket) / 4).toFixed(1)).join(' '), class: 'ph-l-ket' }, svg);
    el('text', { x: Wc - 2, y: T + 10, class: 'ph-ax', 'text-anchor': 'end' }, svg).textContent = 'g/L';
    el('text', { x: L, y: T + H + 92, class: 'ph-ax' }, svg).textContent = (ST.mode === 'mdi' ? '💉 basale · ' : '— débit de base · ') + '▮ bolus' + (ST.mode === 'loop' ? ' · ▮ micro-bolus automatiques' : '') + (kmax > 0.6 ? ' · cétonémie (rouge, 0–4 mmol/L)' : '') + ' · 🍬 resucrage 15 g';
    return svg;
  }

  function agpBlock() {
    const r = ST.r14, M = ST.m14;
    const svg = el('svg', { viewBox: '0 0 760 230', class: 'ph-chart', role: 'img', 'aria-label': 'Profil glycémique ambulatoire sur 14 jours' });
    const L = 44, R = 20, T = 10, H = 190, Wc = 760, X = (t) => L + (Wc - L - R) * t / 24, Yg = (v) => T + H * (1 - (Math.min(4, v) - 0.3) / 3.4);
    el('rect', { x: L, y: Yg(1.8), width: Wc - L - R, height: Yg(0.7) - Yg(1.8), class: 'ph-band' }, svg);
    const q = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
    const bins = Array.from({ length: 48 }, (_, i) => r.pts.filter((x) => Math.floor(x.t * 2) === i).map((x) => x.cgm));
    const P = (p) => bins.map((b, i) => [X(i / 2 + 0.25), Yg(q(b, p))]);
    const band = (lo, hi, cls) => { const a = P(lo), b = P(hi).reverse(); el('path', { d: 'M' + a.concat(b).map((x) => x[0].toFixed(1) + ',' + x[1].toFixed(1)).join(' L') + ' Z', class: cls }, svg); };
    band(0.05, 0.95, 'dt1-p90'); band(0.25, 0.75, 'dt1-p50');
    el('path', { d: 'M' + P(0.5).map((x) => x[0].toFixed(1) + ',' + x[1].toFixed(1)).join(' L'), class: 'ph-l-g' }, svg);
    for (let hh = 0; hh <= 24; hh += 3) el('text', { x: X(hh), y: T + H + 14, class: 'ph-ax', 'text-anchor': 'middle' }, svg).textContent = hh + ' h';
    [0.7, 1.8, 2.5].forEach((v) => { el('text', { x: L - 5, y: Yg(v) + 4, class: 'ph-ax', 'text-anchor': 'end' }, svg).textContent = fmt(v, 2); });
    const win = M.tir >= 70 && M.tbr < 4;
    return h('div', null, [h('div', { class: 'ph-chartbox' }, svg), h('div', { class: 'dt1-kpis' }, kpis(M, r.stats)),
      h('p', { class: win ? 'dt1-win' : 'sv-muted' }, win ? '🏆 Défi réussi : TIR ' + fmt(M.tir, 0) + ' %, TBR ' + fmt(M.tbr, 1) + ' % (essai n° ' + ST.tries.length + ').' : 'Médiane (ligne), 25–75 % et 5–95 % (bandes). ' + r.stats.treat + ' resucrages, ' + r.stats.hypo + ' hypoglycémies < 0,54 g/L, ' + r.stats.sev + ' sévère(s) en 14 jours.'),
      ST.tries.length > 1 ? h('p', { class: 'sv-note' }, 'Essais : ' + ST.tries.map((t) => 'n° ' + t.n + ' TIR ' + fmt(t.tir, 0) + ' % / TBR ' + fmt(t.tbr, 1) + ' %').join(' · ')) : null]);
  }

  S.dt1 = { setup, simulate, metrics, PRESETS };
})();
