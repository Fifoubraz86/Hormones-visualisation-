/*
 * Physiologie du patient DT2 (module « atlas » du simulateur) : ce que font les traitements, organe par organe,
 * heure par heure, et comment le patient évolue de jour en jour.
 *
 * La glycémie affichée est celle du patient simulé (profil de 24 h de js/simu/glyco.js : la même que le carnet et
 * l'AGP). Ce module la décompose en flux, avec les mécanismes du modèle « glyc » de l'atlas (js/axes-sim.js),
 * enrichis des mécanismes pharmacologiques (complément) :
 * - estomac et intestin : vidange gastrique (ralentie par les aGLP1, surtout de courte durée d'action), absorption
 *   des glucides (retardée et réduite par l'acarbose) ;
 * - cellules L et K : GLP-1 et GIP endogènes suivant l'absorption ; effet incrétine réduit dans le DT2 ; iDPP4 :
 *   incrétines actives × 2 ; aGLP1 et tirzépatide : agonisme pharmacologique continu ;
 * - pancréas β : sécrétion glucodépendante (réserve, glucotoxicité) amplifiée par les incrétines ; sulfamides :
 *   sécrétion indépendante du glucose ; pancréas α : glucagon freiné par l'insuline et le GLP-1, mal freiné après
 *   les repas dans le DT2 ;
 * - foie : production hépatique de glucose freinée par l'insuline (portale) et la metformine, stimulée par le
 *   glucagon, excessive dans le DT2 ;
 * - rein : glycosurie au-delà du seuil (≈ 1,80 g/L), abaissé vers 0,80 g/L par les iSGLT2 (selon le DFG) ;
 * - muscle et tissu adipeux : captation du glucose, obtenue par bilan de masse (ce qui entre − ce qui sort −
 *   variation du stock sanguin) ; la sensibilité à l'insuline vient du modèle DT2 (poids, activité, glucotoxicité) ;
 * - centre de la faim : satiété accrue par les aGLP1 et le tirzépatide ;
 * - insuline injectée : basale (glargine, dégludec : plate ; NPH : pic nocturne), bolus d'analogue rapide (pic
 *   à 1 h, 4–5 h), pompe (débit par tranches).
 * Deux temporalités : la journée (animation heure par heure) et les jours ou semaines (le patient évolue sous le
 * traitement choisi, titration comprise), sur une copie du patient : le dossier n'est pas modifié.
 */
(function () {
  'use strict';
  const S = window.HV.simu;
  const NS = 'http://www.w3.org/2000/svg';
  const DT = 1 / 12;
  const CARB0 = 60;
  const kRap = (tau) => (tau <= 0 ? 0 : (tau / 1.21) * Math.exp(-tau / 1.1)); // aire ≈ 1, pic à 1,1 h

  function exoAt(rx, t, u, tm) {
    let x = 0;
    if (rx.pump > 0) { const sg = rx.pumpSeg; x += sg ? sg[Math.floor(t) % 24] : rx.pump / 24; }
    else if (rx.basal > 0) {
      if (rx.basalType === 'nph') { const tau = (t - 22 + 24) % 24; x += rx.basal * Math.max(0.15, Math.exp(-Math.pow((tau - 6) / 4, 2))) / 13.5; }
      else x += rx.basal / 24;
    }
    for (let m = 0; m < 3; m++) if (u[m] > 0) x += u[m] * kRap(t - tm[m] + 0.1) / 1.1;
    return x;
  }

  // Décomposition d'une journée dp (makeDay) du patient pt.
  function decompose(pt, D, Y, dp) {
    const rx = pt.rx, s = pt.st, p = pt.par;
    const e = D.effects(pt, s.MG);
    const glpF = Math.min(1.2, D.glpFrac(rx)), isT = rx.glp === 'tirz', shortA = rx.glp === 'lira';
    const gt = s.GT || 0;
    const B = Math.max(0.02, D.beta(pt) / (1 + D.P.gtox * gt));
    const si = D.siOf(pt) / (1 + D.P.gir * gt * gt);
    const W = s.W, V = 0.18 * W;
    const kge = 1.4 * (1 - (shortA ? 0.45 : 0.25) * Math.min(1, glpF)), kabs = 1.2 * (rx.acarb ? 0.55 : 1), raFrac = rx.acarb ? 0.88 : 1;
    const satiety = Math.min(0.45, 0.25 * Math.min(1, glpF) + (isT ? 0.1 : 0)) + (rx.diet ? 0.08 : 0);
    const dpp = e.eDpp > 0 ? 1 : 0;
    const gluSup = Math.min(0.6, 0.35 * Math.min(1, glpF) + 0.15 * dpp);
    // iSGLT2 : seuil rénal abaissé d'environ 1,80 à 0,60 g/L (60 à 80 g de glucose urinaire par jour).
    const tm = e.sglt > 0 ? 0.6 + 0.4 * (1 - Math.min(1, e.sglt / 0.14)) : 1.8;
    const renK = 3.5 * Math.max(0.15, Math.min(1.2, s.dfg / 90));
    const egp0 = 0.1 * W * (1 + 0.6 * Math.max(0, s.MG - 1));
    const metK = 0.55 * (e.eMet || 0);
    const carbs = [0, 1, 2].map((m) => (dp.skip[m] ? 0 : CARB0 * dp.w[m] * (1 - 0.5 * satiety)));
    let Qs = 0, Qi = 0;
    const pts = [];
    const tot = { ra: 0, egp: 0, up: 0, ren: 0, isec: 0, exo: 0, carbs: carbs.reduce((a, x) => a + x, 0) };
    const gAt = (t) => Y.glucose(dp, ((t % 24) + 24) % 24);
    for (let i = 0; i < 288; i++) {
      const t = i * DT;
      for (let m = 0; m < 3; m++) if (t <= dp.tm[m] && t + DT > dp.tm[m]) Qs += carbs[m];
      const ge = kge * Qs; Qs -= ge * DT; Qi += ge * DT;
      const ra0 = kabs * Qi; Qi -= ra0 * DT; const ra = ra0 * raFrac;
      const G = gAt(t), dG = (gAt(t + 0.5) - gAt(t - 0.5)); // pente lissée sur 1 h (g/L/h)
      const gd = Math.min(1, Math.max(0, (G - 0.8) / 0.5));
      const incE = (ra / 35) * 0.5 * (1 + dpp); // effet incrétine endogène (réduit de moitié dans le DT2)
      const incP = 1.2 * glpF * (isT ? 1.25 : 1) * gd; // agonisme pharmacologique, glucodépendant
      const su = (e.eSu || 0) * B * 5;
      const isec = 8 * B * (0.08 + Math.max(0, G - 0.75)) * (1 + 1.4 * (incE + incP)) + su;
      const iexo = exoAt(rx, t, dp.u || [0, 0, 0], dp.tm);
      const portal = isec * 1.6 + iexo * 0.8;
      const glu = Math.max(0.15, (1 + 2 * Math.max(0, 0.9 - G)) / (1 + 0.45 * portal) * (1 - gluSup) * (1 + 0.5 * Math.min(1, ra / 30)));
      let egp = egp0 * (0.4 + 0.6 * glu) * (1 - metK) / (1 + 0.35 * portal * si);
      const ren = renK * Math.max(0, G - tm);
      // Lipolyse (tissu adipeux, relatif au jeûne normal) : très sensible à l'insuline (freinée dès des taux bas),
      // accrue par le glucagon et l'insulinorésistance du tissu adipeux, par un régime très pauvre en glucides.
      const insAd = (isec * 0.6 + iexo) * Math.min(1.2, si * 1.4);
      const lip = (0.4 + 0.6 * glu) * (1 + 0.8 * Math.max(0, 1 - si)) * (p.lowcarb ? 1.3 : 1) / (1 + 0.5 * insAd);
      // Cétogenèse hépatique : acides gras disponibles × rapport glucagon / insuline portale ; iSGLT2 : moins
      // d'insuline, plus de glucagon, cétogenèse accrue (acidocétose possible à glycémie peu élevée).
      const kss = 0.06 + 2.0 * Math.max(0, lip - 0.25) * glu / (1 + 0.4 * portal) * (e.sglt > 0 ? 1.8 : 1) * (p.lowcarb ? 1.8 : 1);
      let up = egp + ra - ren - V * dG;
      if (up < 4) { egp += 4 - up; up = 4; }
      tot.ra += ra * DT; tot.egp += egp * DT; tot.up += up * DT; tot.ren += ren * DT; tot.isec += isec * DT; tot.exo += iexo * DT;
      pts.push({ t, G, ra, ge, egp, up, ren, isec, iexo, glu, inc: incE + incP, incE, incP, Qs, su, lip, kss });
    }
    // Cétonémie (β-hydroxybutyrate, mmol/L) : suit la cétogenèse avec une constante de temps d'environ 2 h
    // (deux passages pour partir d'un état périodique sur 24 h).
    let ket = pts.reduce((a, q) => a + q.kss, 0) / 288;
    for (let pass = 0; pass < 2; pass++) pts.forEach((q) => { ket += (q.kss - ket) * (1 - Math.exp(-DT / 2)); q.ket = Math.min(8, ket); });
    tot.ketMax = Math.max(...pts.map((q) => q.ket)); tot.ketMean = pts.reduce((a, q) => a + q.ket, 0) / 288;
    tot.lip = pts.reduce((a, q) => a + q.lip, 0) / 288;
    return { pts, tot, k: { B, si, glpF, isT, shortA, satiety, gluSup, tm, metK, dpp, kge, acarb: !!rx.acarb, su: (e.eSu || 0) > 0, egp0, e, rx, W } };
  }

  /* ---------- Vue ---------- */
  const fmt = (v, d) => (v == null || isNaN(v) ? '—' : v.toFixed(d).replace('.', ','));
  const ORG = {
    brain: { x: 105, y: 58, w: 190, h: 66, t: 'Centre de la faim' },
    stomach: { x: 105, y: 178, w: 190, h: 52, t: 'Estomac' },
    gut: { x: 105, y: 292, w: 190, h: 66, t: 'Intestin' },
    beta: { x: 365, y: 300, w: 170, h: 52, t: 'Cellules β' },
    alpha: { x: 365, y: 372, w: 170, h: 52, t: 'Cellules α' },
    blood: { x: 395, y: 160, w: 100, h: 100, t: 'Glycémie', r: 50 },
    liver: { x: 640, y: 64, w: 200, h: 66, t: 'Foie' },
    muscle: { x: 655, y: 222, w: 190, h: 52, t: 'Muscle' },
    fat: { x: 655, y: 306, w: 190, h: 66, t: 'Tissu adipeux' },
    kidney: { x: 640, y: 440, w: 200, h: 52, t: 'Rein' },
    pen: { x: 365, y: 450, w: 170, h: 46, t: 'Insuline injectée' },
    keto: { x: 105, y: 430, w: 190, h: 66, t: 'Corps cétoniques' }
  };
  // Point du bord d'un organe en direction d'un point (x, y).
  function edge(o, x, y) {
    const dx = x - o.x, dy = y - o.y;
    if (o.r) { const d = Math.hypot(dx, dy) || 1; return [o.x + dx / d * (o.r + 4), o.y + dy / d * (o.r + 4)]; }
    const sx = Math.abs(dx) / (o.w / 2 + 4), sy = Math.abs(dy) / (o.h / 2 + 4), k = 1 / Math.max(sx, sy, 1e-6);
    return [o.x + dx * k, o.y + dy * k];
  }
  function link(a, b, bend) {
    const A = ORG[a], B = ORG[b];
    const [x1, y1] = edge(A, B.x, B.y), [x2, y2] = edge(B, A.x, A.y);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
    const cx = mx - dy / d * (bend || 0), cy = my + dx / d * (bend || 0);
    return 'M' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' Q' + cx.toFixed(1) + ',' + cy.toFixed(1) + ' ' + x2.toFixed(1) + ',' + y2.toFixed(1);
  }
  const INFO = {
    brain: (k) => 'Centre de la faim (hypothalamus). Les aGLP1 et le tirzépatide augmentent la satiété : repas plus petits, perte de poids' + (k.satiety > 0.01 ? ' (glucides du jour réduits d\'environ ' + Math.round(k.satiety * 50) + ' % ici)' : '') + '. Le suivi diététique agit aussi ici.',
    stomach: (k) => 'Vidange gastrique : le glucose du repas n\'arrive dans l\'intestin qu\'au rythme où l\'estomac se vide. Les aGLP1 la ralentissent (surtout le liraglutide, de courte durée ; effet qui s\'atténue avec les formes hebdomadaires) : pic post-prandial plus bas' + (k.glpF > 0.01 ? ' (vidange ' + Math.round((1 - k.kge / 1.4) * 100) + ' % plus lente)' : '') + '.',
    gut: (k) => 'Intestin : absorption des glucides. L\'acarbose inhibe les alpha-glucosidases : absorption retardée et un peu réduite (flatulences). Les cellules L (GLP-1) et K (GIP) sécrètent les incrétines au passage du repas ; l\'effet incrétine est diminué dans le DT2' + (k.dpp ? ' ; l\'iDPP4 double les incrétines actives (moins dégradées)' : '') + '.',
    beta: (k) => 'Cellules β : sécrétion d\'insuline glucodépendante, amplifiée par les incrétines. Réserve du patient : ' + Math.round(k.B * 100) + ' % d\'un sujet de référence (déclin avec les années, glucotoxicité). ' + (k.su ? 'Le sulfamide force la sécrétion même quand la glycémie est basse : risque d\'hypoglycémie. ' : '') + (k.glpF > 0.01 ? 'L\'aGLP1' + (k.isT ? ' et le GIP du tirzépatide' : '') + ' amplifient la sécrétion seulement quand la glycémie est haute (pas d\'hypoglycémie seul).' : ''),
    alpha: (k) => 'Cellules α : le glucagon fait produire du glucose au foie. Il est freiné par l\'insuline et par le GLP-1 ; dans le DT2, il reste mal freiné après les repas (hyperglucagonémie relative)' + (k.gluSup > 0.01 ? ' ; ici freiné de ' + Math.round(k.gluSup * 100) + ' % par ' + (k.glpF > 0.01 ? 'l\'aGLP1' : 'l\'iDPP4') : '') + '.',
    blood: () => 'Glycémie : stock de glucose du sang, entre ce qui entre (absorption, foie) et ce qui sort (muscle, tissu adipeux, cerveau, rein). C\'est la courbe du carnet et du capteur du patient.',
    liver: (k) => 'Foie : production de glucose (glycogénolyse, néoglucogenèse), excessive dans le DT2 surtout la nuit (glycémie à jeun haute). Freinée par l\'insuline (portale) ' + (k.metK > 0.01 ? 'et par la metformine (− ' + Math.round(k.metK * 100) + ' %)' : '') + ', stimulée par le glucagon. L\'insuline basale agit surtout ici.',
    muscle: (k) => 'Muscle : principal site de captation du glucose après un repas, sous l\'effet de l\'insuline. Sensibilité à l\'insuline : ' + Math.round(k.si * 100) + ' % (référence 100 %), améliorée par l\'activité physique et la perte de poids, abaissée par la glucotoxicité. Le cerveau consomme environ 100 g/j sans insuline.',
    keto: (k, T) => 'Corps cétoniques (β-hydroxybutyrate) : le foie les fabrique à partir des acides gras libérés par la lipolyse quand l\'insuline manque et que le glucagon domine (jeûne, carence insulinique). Normale < 0,6 mmol/L ; cétose 0,6–3 ; acidocétose au-delà de 3 avec acidose. ' + (k.e.sglt > 0 ? 'Sous iSGLT2, moins d\'insuline et plus de glucagon : cétogenèse accrue, acidocétose possible à glycémie peu élevée (« euglycémique ») chez l\'insulinopénique (LADA, DT2 ancien), en cas de jeûne, de régime cétogène, d\'intervention ou de réduction trop forte de l\'insuline. ' : '') + 'Ici : moyenne ' + fmt(T.ketMean, 2) + ', maximum ' + fmt(T.ketMax, 2) + ' mmol/L.',
    fat: () => 'Tissu adipeux : captation et stockage (lipogenèse) sous insuline ; la lipolyse (libération d\'acides gras) est freinée par de faibles taux d\'insuline, accrue par le glucagon et l\'insulinorésistance ; l\'adiposité viscérale entretient l\'insulinorésistance. Le tirzépatide (GIP) et la perte de poids améliorent sa fonction.',
    kidney: (k) => 'Rein : le glucose filtré est réabsorbé (SGLT2) jusqu\'à un seuil d\'environ 1,80 g/L ; au-delà, glycosurie. ' + (k.tm < 1.7 ? 'L\'iSGLT2 abaisse le seuil vers ' + fmt(k.tm, 2) + ' g/L : le patient « urine du sucre » (≈ 4 kcal/g), même à glycémie normale, moins si le DFG baisse.' : 'Sans iSGLT2, glycosurie seulement quand la glycémie dépasse le seuil.'),
    pen: (k) => (k.rx.pump > 0 ? 'Pompe : débit continu d\'analogue rapide et bolus aux repas.' : k.rx.basal > 0 || k.rx.rapid > 0 ? 'Insuline injectée : la basale freine surtout le foie (nuit, jeûne), les bolus couvrent les repas (pic à 1 h, 4 à 5 h d\'action). Elle ne s\'adapte pas à la glycémie : hypoglycémie si la dose dépasse les besoins.' : 'Pas d\'insuline injectée.')
  };

  function el(tag, a, par) { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (par) par.appendChild(n); return n; }

  function card(ctx) {
    const { G, h, D, Y, onClose } = ctx;
    const st = G.physio || (G.physio = { t: 8, speed: 2, play: false, sel: 'blood', hist: [] });
    // Copie du patient : le dossier n'est jamais modifié.
    const reset = () => {
      st.pt = JSON.parse(JSON.stringify(Object.assign({}, G.pt, { log: [] })));
      st.pt.rx.rapidM = (st.pt.rx.rapidM || [0, 0, 0]).slice();
      st.rx0 = JSON.parse(JSON.stringify(st.pt.rx));
      st.titr = JSON.parse(JSON.stringify(G.titr)); st.tstate = { above: {} };
      st.day0 = G.pt.day; st.hist = [{ d: 0, mg: st.pt.st.MG, a: st.pt.st.A, w: st.pt.st.W }];
      st.seed = (G.seed ^ 0x5bd1e995) >>> 0; st.dp = null;
    };
    if (!st.pt || st.srcDay !== G.pt.day || st.srcHist !== G.history.length) { reset(); st.srcDay = G.pt.day; st.srcHist = G.history.length; }
    const pt = st.pt;
    const compute = () => {
      st.dp = Y.makeDay(pt, D, { seed: (st.seed + pt.day * 7919) >>> 0, work: G.cfg.work });
      st.res = decompose(pt, D, Y, st.dp);
    };
    if (!st.dp) compute();
    const advance = (n) => {
      for (let i = 0; i < n; i++) {
        D.advance(pt, 1);
        const dp = Y.makeDay(pt, D, { seed: (st.seed + pt.day * 7919) >>> 0, work: G.cfg.work });
        if (st.titr.who !== 'none' && (pt.rx.basal + (pt.rx.pump || 0) + pt.rx.rapid) > 0) Y.titrate(pt.rx, Y.readings(dp), Object.assign({ cgm: true, basalMax: pt.rx.pump > 0 ? null : Math.round(0.5 * pt.st.W) }, st.titr), st.tstate, true);
        st.hist.push({ d: pt.day - st.day0, mg: pt.st.MG, a: pt.st.A, w: pt.st.W });
      }
      compute(); draw();
    };
    // Traitements de la copie (que se passe-t-il si…).
    const TOG = [
      ['met', 'Metformine 2 g', (rx) => rx.met > 0, (rx, on) => { rx.met = on ? 2000 : 0; }],
      ['su', 'Sulfamide', (rx) => rx.su > 0, (rx, on) => { rx.su = on ? 120 : 0; }],
      ['dpp', 'iDPP4', (rx) => rx.dpp4 > 0, (rx, on) => { rx.dpp4 = on ? 100 : 0; }],
      ['glp', 'aGLP1 (sémaglutide 1 mg)', (rx) => rx.glp !== 'none' && rx.glp !== 'tirz', (rx, on) => { rx.glp = on ? 'sema' : 'none'; rx.glpDose = on ? 1 : 0; }],
      ['tirz', 'Tirzépatide 15 mg', (rx) => rx.glp === 'tirz', (rx, on) => { rx.glp = on ? 'tirz' : 'none'; rx.glpDose = on ? 15 : 0; }],
      ['sglt2', 'iSGLT2', (rx) => rx.sglt2 !== 'none', (rx, on) => { rx.sglt2 = on ? 'empa10' : 'none'; }],
      ['acarb', 'Acarbose', (rx) => rx.acarb > 0, (rx, on) => { rx.acarb = on ? 300 : 0; }],
      ['basal', 'Insuline basale', (rx) => rx.basal > 0 || rx.pump > 0, (rx, on) => { if (rx.pump > 0) return; rx.basal = on ? Math.max(10, st.rx0.basal || Math.round(0.2 * pt.st.W)) : 0; }],
      ['bolus', 'Bolus aux repas', (rx) => rx.rapid > 0, (rx, on) => { const m = on ? (st.rx0.rapid > 0 ? st.rx0.rapidM.slice() : [4, 4, 4]) : [0, 0, 0]; rx.rapidM = m; rx.rapid = m[0] + m[1] + m[2]; }],
      ['act', 'Activité 150 min/sem', (rx) => rx.act >= 150, (rx, on) => { rx.act = on ? 150 : 0; }],
      ['diet', 'Suivi diététique', (rx) => !!rx.diet, (rx, on) => { rx.diet = on; rx.wtGoal = on ? 5 : 0; }]
    ];
    const root = h('div', { class: 'sv-card sv-physio', id: 'dtPhysio' });
    const svg = el('svg', { viewBox: '0 0 760 490', class: 'ph-svg', role: 'img', 'aria-label': 'Physiologie du glucose du patient' });
    const chart = el('svg', { viewBox: '0 0 760 230', class: 'ph-chart', role: 'img', 'aria-label': 'Courbes de 24 heures' });
    const info = h('div', { class: 'ph-info', id: 'dtPhInfo' });
    const tLab = h('strong', { class: 'ph-time' });
    const slider = h('input', { type: 'range', min: 0, max: 23.9, step: 0.1, value: st.t, class: 'sv-range', id: 'dtPhT', 'aria-label': 'Heure de la journée', oninput: (e) => { st.t = +e.target.value; frame(); } });
    const playBtn = h('button', { type: 'button', class: 'sv-secondary', id: 'dtPhPlay', onclick: () => { st.play = !st.play; playBtn.textContent = st.play ? '⏸ Pause' : '▶ Lecture'; if (st.play) requestAnimationFrame(loop); } }, st.play ? '⏸ Pause' : '▶ Lecture');
    const sum = h('div', { class: 'ph-sum', id: 'dtPhSum' });
    const trend = el('svg', { viewBox: '0 0 300 70', class: 'ph-trend' });
    root.append(
      h('div', { class: 'sv-card-head' }, [h('h3', null, 'Physiologie du patient : ce que font les traitements'), h('button', { type: 'button', class: 'sv-secondary', onclick: onClose }, 'Fermer')]),
      h('p', { class: 'sv-muted' }, 'Copie du patient (le dossier n\'est pas modifié). La glycémie est celle du patient simulé ; le module la décompose organe par organe. Cliquez sur un organe. Modifiez les traitements, puis faites avancer le temps.'),
      h('div', { class: 'ph-tog' }, TOG.map(([id, lab, isOn, set]) => h('label', { class: 'sv-chipcheck' }, [h('input', { type: 'checkbox', id: 'dtPh-' + id, checked: isOn(pt.rx), onchange: (e) => { set(pt.rx, e.target.checked); if (id === 'glp' && e.target.checked) document.getElementById('dtPh-tirz').checked = false; if (id === 'tirz' && e.target.checked) document.getElementById('dtPh-glp').checked = false; compute(); draw(); } }), ' ' + lab]))),
      h('div', { class: 'ph-ctrl' }, [playBtn,
        h('select', { id: 'dtPhSpeed', 'aria-label': 'Vitesse', onchange: (e) => { st.speed = +e.target.value; } }, [[1, '1 h/s'], [2, '2 h/s'], [6, '6 h/s']].map(([v, t]) => h('option', { value: v, selected: st.speed === v }, t))),
        slider, tLab,
        h('span', { class: 'ph-sep' }),
        h('button', { type: 'button', class: 'sv-secondary', id: 'dtPhD1', onclick: () => advance(1) }, '+1 jour'),
        h('button', { type: 'button', class: 'sv-secondary', id: 'dtPhW1', onclick: () => advance(7) }, '+1 semaine'),
        h('button', { type: 'button', class: 'sv-secondary', id: 'dtPhW4', onclick: () => advance(28) }, '+4 semaines'),
        h('button', { type: 'button', class: 'sv-linkbtn', onclick: () => { reset(); compute(); ctx.rerender(); } }, 'Revenir au patient')
      ]),
      h('div', { class: 'ph-grid' }, [h('div', { class: 'ph-diag' }, svg), h('div', { class: 'ph-side' }, [sum, h('div', { class: 'ph-trendbox' }, trend), info])]),
      h('div', { class: 'ph-chartbox' }, chart),
      h('p', { class: 'sv-note' }, 'Mécanismes : modèle « glyc » de l\'atlas enrichi des effets pharmacologiques (complément) ; la captation par le muscle et le tissu adipeux est calculée par bilan de masse. Chaque journée reprend la glycémie moyenne du modèle DT2, calé sur les essais.')
    );

    const g = {};
    function draw() {
      svg.textContent = ''; chart.textContent = '';
      const k = st.res.k;
      const defs = el('defs', {}, svg);
      ['g', 'i', 'x', 'n', 'u', 'k'].forEach((c) => { const m = el('marker', { id: 'phA' + c, viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 11, markerHeight: 11, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs); el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'ph-ah ph-' + c }, m); });
      const arrow = (id, a, b, cls, bend) => { g[id] = el('path', { d: link(a, b, bend), class: 'ph-flow ph-' + cls, 'marker-end': 'url(#phA' + cls + ')' }, svg); };
      arrow('hunger', 'brain', 'stomach', 'n', 0);
      arrow('ge', 'stomach', 'gut', 'g', 0);
      arrow('ra', 'gut', 'blood', 'g', -40);
      arrow('inc', 'gut', 'beta', 'i', 10);
      arrow('insL', 'beta', 'liver', 'i', -30);
      arrow('insM', 'beta', 'muscle', 'i', 10);
      arrow('glu', 'alpha', 'liver', 'n', -70);
      arrow('egp', 'liver', 'blood', 'g', 10);
      arrow('upM', 'blood', 'muscle', 'g', -10);
      arrow('upF', 'blood', 'fat', 'g', 20);
      arrow('ren', 'blood', 'kidney', 'u', 60);
      arrow('exoL', 'pen', 'liver', 'x', 120);
      arrow('exoM', 'pen', 'fat', 'x', 30);
      arrow('ffa', 'fat', 'liver', 'k', -70);
      arrow('ket', 'liver', 'keto', 'k', -150);
      Object.entries(ORG).forEach(([id, o]) => {
        const off = id === 'pen' && !(k.rx.basal > 0 || k.rx.rapid > 0 || k.rx.pump > 0);
        const grp = el('g', { class: 'ph-org' + (st.sel === id ? ' sel' : '') + (off ? ' off' : ''), tabindex: 0, role: 'button', 'aria-label': o.t }, svg);
        grp.addEventListener('click', () => { st.sel = id; draw(); });
        grp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); st.sel = id; draw(); } });
        if (id === 'blood') {
          g.bloodC = el('circle', { cx: o.x, cy: o.y, r: o.r, class: 'ph-blood' }, grp);
          el('text', { x: o.x, y: o.y - 8, class: 'ph-t', 'text-anchor': 'middle' }, grp).textContent = 'Glycémie';
          g.bloodV = el('text', { x: o.x, y: o.y + 16, class: 'ph-v ph-big', 'text-anchor': 'middle' }, grp);
          return;
        }
        el('rect', { x: o.x - o.w / 2, y: o.y - o.h / 2, width: o.w, height: o.h, rx: 10, class: 'ph-box ph-box-' + id }, grp);
        el('text', { x: o.x, y: o.y - o.h / 2 + 19, class: 'ph-t', 'text-anchor': 'middle' }, grp).textContent = o.t;
        g['v_' + id] = el('text', { x: o.x, y: o.y - o.h / 2 + 38, class: 'ph-v', 'text-anchor': 'middle' }, grp);
        if (o.h > 60) g['s_' + id] = el('text', { x: o.x, y: o.y - o.h / 2 + 56, class: 'ph-s', 'text-anchor': 'middle' }, grp);
      });
      // Pastilles des médicaments sur leur site d'action.
      const pill = (x, y, txt, cls) => { const w = 7.6 * txt.length + 16; el('rect', { x: x - w / 2, y: y - 9, width: w, height: 18, rx: 9, class: 'ph-pill ph-pill-' + cls }, svg); el('text', { x, y: y + 4, class: 'ph-pt', 'text-anchor': 'middle' }, svg).textContent = txt; };
      const rx = k.rx;
      if (rx.met > 0) pill(640, 22, 'metformine', 'met');
      if (rx.su > 0) pill(300, 268, 'sulfamide', 'su');
      if (rx.dpp4 > 0) pill(105, 335, 'iDPP4', 'dpp');
      if (k.glpF > 0.01) { const n = rx.glp === 'tirz' ? 'tirzépatide' : 'aGLP1'; pill(105, 18, n, 'glp'); pill(230, 178, n, 'glp'); pill(450, 268, n, 'glp'); pill(450, 340, n, 'glp'); if (rx.glp === 'tirz') pill(730, 330, 'GIP', 'glp'); }
      if (rx.sglt2 !== 'none') pill(640, 478, 'iSGLT2', 'sglt');
      if (rx.acarb > 0) pill(230, 292, 'acarbose', 'acarb');
      if (rx.act >= 150) pill(730, 190, 'activité', 'life');
      if (rx.diet) pill(230, 58, 'diététique', 'life');
      if (st.res.tot.ketMax > 0.6) pill(105, 388, st.res.tot.ketMax > 1.5 ? 'risque d\'acidocétose' : 'cétose', 'ket');
      if (rx.basal > 0 || rx.pump > 0 || rx.rapid > 0) pill(365, 482, rx.pump > 0 ? 'pompe' : (rx.basal > 0 ? 'basale' : '') + (rx.basal > 0 && rx.rapid > 0 ? ' + ' : '') + (rx.rapid > 0 ? 'bolus' : ''), 'ins');
      drawChart();
      drawSum();
      frame();
    }

    function drawChart() {
      const P = st.res.pts, L = 44, R = 50, T = 14, H = 150, Wc = 760;
      const X = (t) => L + (Wc - L - R) * t / 24;
      const gmax = Math.max(2.6, ...P.map((q) => q.G)) + 0.2, Yg = (v) => T + H * (1 - (v - 0.4) / (gmax - 0.4));
      const imax = Math.max(4, ...P.map((q) => q.isec + q.iexo)) * 1.1, Yi = (v) => T + H * (1 - v / imax);
      el('rect', { x: L, y: Yg(1.8), width: Wc - L - R, height: Yg(0.7) - Yg(1.8), class: 'ph-band' }, chart);
      for (let hh = 0; hh <= 24; hh += 3) { el('line', { x1: X(hh), x2: X(hh), y1: T, y2: T + H, class: 'ph-gl' }, chart); el('text', { x: X(hh), y: T + H + 14, class: 'ph-ax', 'text-anchor': 'middle' }, chart).textContent = hh + ' h'; }
      [0.7, 1, 1.8, 2.5].filter((v) => v < gmax).forEach((v) => { el('text', { x: L - 5, y: Yg(v) + 4, class: 'ph-ax', 'text-anchor': 'end' }, chart).textContent = fmt(v, v % 1 ? 1 : 0); });
      el('text', { x: Wc - R + 4, y: T + 8, class: 'ph-ax' }, chart).textContent = fmt(imax, 0) + ' U/h';
      const area = (f, cls) => el('path', { d: 'M' + X(0) + ',' + Yi(0) + ' ' + P.map((q) => 'L' + X(q.t).toFixed(1) + ',' + Yi(f(q)).toFixed(1)).join(' ') + ' L' + X(24) + ',' + Yi(0) + ' z', class: cls }, chart);
      area((q) => q.isec + q.iexo, 'ph-a-exo');
      area((q) => q.isec, 'ph-a-endo');
      el('path', { d: P.map((q, i) => (i ? 'L' : 'M') + X(q.t).toFixed(1) + ',' + (T + H - 22 * Math.min(2.5, q.glu)).toFixed(1)).join(' '), class: 'ph-l-glu' }, chart);
      el('path', { d: P.map((q, i) => (i ? 'L' : 'M') + X(q.t).toFixed(1) + ',' + Yg(q.G).toFixed(1)).join(' '), class: 'ph-l-g' }, chart);
      el('path', { d: P.map((q, i) => (i ? 'L' : 'M') + X(q.t).toFixed(1) + ',' + (T + H - H * Math.min(3, q.ket) / 3).toFixed(1)).join(' '), class: 'ph-l-ket' }, chart);
      el('text', { x: Wc - 2, y: T + 22, class: 'ph-ax ph-ax-ket', 'text-anchor': 'end' }, chart).textContent = 'cét. 0–3';
      P.forEach((q, i) => { if (i % 3 === 0 && q.ren > 0.05) el('rect', { x: X(q.t), y: T + H + 18, width: 3, height: Math.min(12, q.ren * 2), class: 'ph-b-ren' }, chart); });
      st.dp.tm.forEach((t, m) => { if (!st.dp.skip[m]) el('text', { x: X(t), y: T + 10, class: 'ph-meal', 'text-anchor': 'middle' }, chart).textContent = '🍽'; });
      g.cursor = el('line', { x1: X(st.t), x2: X(st.t), y1: T, y2: T + H + 30, class: 'ph-cur' }, chart);
      g.X = X;
      [['ph-l-g', 'glycémie'], ['ph-a-endo', 'insuline sécrétée'], ['ph-a-exo', 'injectée'], ['ph-l-glu', 'glucagon'], ['ph-b-ren', 'glycosurie'], ['ph-l-ket', 'cétones']].forEach(([c, t], i) => { const x0 = L + [0, 90, 225, 315, 405, 505][i]; el('rect', { x: x0, y: 214, width: 12, height: 8, class: c + ' ph-lg' }, chart); el('text', { x: x0 + 16, y: 222, class: 'ph-ax' }, chart).textContent = t; });
    }

    function drawSum() {
      const T = st.res.tot, k = st.res.k, last = st.hist[st.hist.length - 1];
      sum.textContent = '';
      const row = (a, b) => h('div', { class: 'ph-row' }, [h('span', null, a), h('strong', null, b)]);
      sum.append(
        h('p', { class: 'sv-eyebrow' }, (last.d ? 'Copie à J+' + last.d : 'Aujourd\'hui') + ' · bilan des 24 h'),
        row('Glucides absorbés', fmt(T.ra, 0) + ' g'),
        row('Production hépatique', fmt(T.egp, 0) + ' g'),
        row('Captation (muscle, graisse, cerveau)', fmt(T.up, 0) + ' g'),
        row('Glycosurie', fmt(T.ren, 0) + ' g (' + fmt(T.ren * 4, 0) + ' kcal)'),
        row('Cétonémie (moyenne · max)', fmt(T.ketMean, 2) + ' · ' + fmt(T.ketMax, 2) + ' mmol/L' + (T.ketMax > 1.5 ? ' ⚠' : T.ketMax > 0.6 ? ' ↑' : '')),
        row('Insuline sécrétée / injectée', fmt(T.isec, 0) + ' / ' + fmt(T.exo, 0) + ' U'),
        row('Sensibilité · réserve β', Math.round(k.si * 100) + ' % · ' + Math.round(k.B * 100) + ' %'),
        row('HbA1c · poids', fmt(pt.st.A, 1) + ' % · ' + fmt(pt.st.W, 1) + ' kg'),
        row('HbA1c attendue à l\'équilibre', fmt((D.eqMG(pt, {}) * 100 + 46.7) / 28.7, 1) + ' %')
      );
      trend.textContent = '';
      const H2 = st.hist, n = H2.length;
      if (n > 1) {
        const amin = Math.min(...H2.map((q) => q.a)) - 0.2, amax = Math.max(...H2.map((q) => q.a)) + 0.2, dmax = Math.max(7, H2[n - 1].d);
        const xs = (d) => 30 + 262 * d / dmax, ys = (a) => 8 + 50 * (1 - (a - amin) / (amax - amin));
        el('path', { d: H2.map((q, i) => (i ? 'L' : 'M') + xs(q.d).toFixed(1) + ',' + ys(q.a).toFixed(1)).join(' '), class: 'ph-l-a' }, trend);
        el('text', { x: 2, y: 14, class: 'ph-ax' }, trend).textContent = fmt(amax, 1);
        el('text', { x: 2, y: 60, class: 'ph-ax' }, trend).textContent = fmt(amin, 1);
        el('text', { x: 292, y: 68, class: 'ph-ax', 'text-anchor': 'end' }, trend).textContent = 'J+' + H2[n - 1].d + ' · HbA1c (%)';
      } else el('text', { x: 150, y: 38, class: 'ph-ax', 'text-anchor': 'middle' }, trend).textContent = 'Faites avancer le temps : évolution de l\'HbA1c';
    }

    function frame() {
      const P = st.res.pts, k = st.res.k;
      const q = P[Math.min(287, Math.max(0, Math.round(st.t / DT)))];
      const hh = Math.floor(st.t), mm = Math.round((st.t - hh) * 60);
      tLab.textContent = hh + ' h ' + String(mm === 60 ? 0 : mm).padStart(2, '0');
      slider.value = st.t;
      const Wd = (v, max) => Math.max(1, Math.min(14, 1 + 13 * v / max));
      const set = (id, v, max) => { const p = g[id]; if (!p) return; p.setAttribute('stroke-width', Wd(v, max).toFixed(1)); p.style.animationDuration = Math.max(0.35, 2.4 / Math.max(0.15, v / max)).toFixed(2) + 's'; p.classList.toggle('idle', v < max * 0.03); };
      set('ge', q.ge, 40); set('ra', q.ra, 40); set('inc', q.inc, 1.5); set('insL', q.isec, 6); set('insM', q.isec, 6); set('glu', q.glu, 2);
      set('egp', q.egp, 25); set('upM', q.up * 0.75, 30); set('upF', q.up * 0.25, 30); set('ren', q.ren, 6); set('exoL', q.iexo, 4); set('exoM', q.iexo, 4); set('ffa', q.lip, 1); set('ket', q.ket, 1.5); set('hunger', 1 - k.satiety, 1);
      const txt = (id, v) => { if (g[id]) g[id].textContent = v; };
      txt('v_brain', 'satiété ' + (k.satiety > 0.01 ? '+' + Math.round(k.satiety * 100) + ' %' : 'normale'));
      txt('s_brain', fmt(st.res.tot.carbs, 0) + ' g de glucides/j');
      txt('v_stomach', fmt(q.Qs, 0) + ' g à vider');
      txt('v_gut', 'absorption ' + fmt(q.ra, 1) + ' g/h');
      txt('s_gut', 'incrétines ' + fmt(q.incE, 2) + (q.incP > 0.01 ? ' + pharmaco ' + fmt(q.incP, 2) : ''));
      txt('v_beta', fmt(q.isec, 1) + ' U/h' + (q.su > 0.05 ? ' (sulfamide)' : ''));
      txt('v_alpha', 'glucagon × ' + fmt(q.glu, 2));
      txt('v_liver', fmt(q.egp, 1) + ' g/h');
      txt('s_liver', k.metK > 0.01 ? 'metformine − ' + Math.round(k.metK * 100) + ' %' : 'sans metformine');
      txt('v_muscle', fmt(q.up * 0.75, 1) + ' g/h');
      txt('v_fat', fmt(q.up * 0.25, 1) + ' g/h');
      txt('s_fat', 'lipolyse × ' + fmt(q.lip, 2));
      txt('v_keto', 'β-OHB ' + fmt(q.ket, 2) + ' mmol/L');
      txt('s_keto', q.ket > 1.5 ? 'cétose marquée' : q.ket > 0.6 ? 'cétose' : 'normale (< 0,6)');
      txt('v_kidney', fmt(q.ren, 2) + ' g/h · seuil ' + fmt(k.tm, 2));
      txt('v_pen', fmt(q.iexo, 2) + ' U/h');
      if (g.bloodV) { g.bloodV.textContent = fmt(q.G, 2) + ' g/L'; g.bloodC.setAttribute('class', 'ph-blood ' + (q.G < 0.7 ? 'low' : q.G > 1.8 ? 'high' : 'ok')); }
      if (g.cursor) { const x = g.X(st.t); g.cursor.setAttribute('x1', x); g.cursor.setAttribute('x2', x); }
      if (st.infoSel !== st.sel) { st.infoSel = st.sel; }
      info.textContent = '';
      info.append(h('h4', null, ORG[st.sel].t), h('p', null, INFO[st.sel](k, st.res.tot)));
    }

    let lastTs = 0;
    function loop(ts) {
      if (!st.play || !root.isConnected) { lastTs = 0; return; }
      if (lastTs) { st.t += (ts - lastTs) / 1000 * st.speed; if (st.t >= 24) st.t -= 24; frame(); }
      lastTs = ts;
      requestAnimationFrame(loop);
    }
    draw();
    if (st.play) requestAnimationFrame(loop);
    return root;
  }

  S.dt2physio = { decompose, card, exoAt };
})();
