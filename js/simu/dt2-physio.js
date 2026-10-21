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
  // Événements d'une journée (module de physiologie) : modifient la journée du patient, pas son dossier.
  const EVENTS = [
    ['none', 'Journée habituelle'],
    ['sport', 'Activité physique : 45 min de marche rapide à 17 h'],
    ['sportAdj', 'Activité physique avec adaptation (débit temporaire − 50 % ou collation)'],
    ['skip', 'Déjeuner sauté (sans son bolus)'],
    ['big', 'Dîner copieux (× 1,8)'],
    ['snack', 'Collation sucrée à 16 h (30 g, sans bolus)'],
    ['alcohol', 'Alcool au dîner (3 verres)'],
    ['ill', 'Infection fébrile (maladie intercurrente)'],
    ['illAdj', 'Infection fébrile avec adaptation des doses (jours de maladie)']
  ];
  function applyEvent(pt, dp, ev) {
    const rx = pt.rx, ins = rx.basal + (rx.pump || 0) + rx.rapid > 0 || rx.su > 0;
    const d = Object.assign({}, dp, { w: dp.w.slice(), skip: dp.skip.slice(), cut: dp.cut.slice(), segCut: dp.segCut.slice(), extra: dp.extra.slice(), u: (dp.u || [0, 0, 0]).slice(), snacks: null });
    let dg = () => 0, egpF = () => 1, ketF = 1, exoF = () => 1;
    if (ev === 'sport' || ev === 'sportAdj') {
      // Captation musculaire sans insuline pendant l'effort, sensibilité accrue 6 à 12 h ; chute plus forte (et
      // hypoglycémie possible) sous insuline ou sulfamide, qui ne baissent pas pendant l'effort.
      const A = 0.3 * (ins ? 1.7 : 1), B = 0.1 * (ins ? 1.5 : 1);
      dg = (t) => (t >= 17 && t < 17.75 ? -A * (t - 17) / 0.75 : t >= 17.75 ? -A * Math.exp(-(t - 17.75) / 1.2) - B * Math.exp(-(t - 17.75) / 8) : 0);
      egpF = (t) => (t >= 17 && t < 18 ? 1.25 : 1);
      if (ev === 'sportAdj') {
        // Pompe : débit temporaire − 50 % de 16 h à 18 h (1 h avant et pendant l'effort) ; injections ou sulfamide :
        // collation de 15 g avant l'effort (complément, pratiques usuelles).
        const base = dg;
        if (rx.pump > 0) { exoF = (t) => (t >= 16 && t < 18 ? 0.5 : 1); dg = (t) => base(t) * 0.35; }
        else if (ins) { d.snacks = [{ t: 16.75, w: 0.25 }]; dg = (t) => base(t) * 0.6; }
      }
    } else if (ev === 'skip') {
      d.skip[1] = true; d.u[1] = 0; d.extra[1] = 0; d.segCut[1] *= 0.3; // l'après-midi ne montre plus que le débit de base (test de jeûne)
    } else if (ev === 'big') {
      d.w[2] *= 1.8; if (rx.bolusMode !== 'if') d.cut[2] /= 1.8; else d.u[2] = Math.round(d.u[2] * 1.8 * 2) / 2;
    } else if (ev === 'snack') {
      d.snacks = [{ t: 16, w: 0.5 }];
    } else if (ev === 'alcohol') {
      // L'alcool bloque la néoglucogenèse : production hépatique freinée la nuit, hypoglycémie nocturne sous
      // insuline ou sulfamide.
      const A = ins ? 0.35 : 0.12;
      dg = (t) => (t >= 22 || t < 8 ? -A * Math.sin(Math.PI * (((t - 22 + 24) % 24) / 10)) : 0);
      egpF = (t) => (t >= 22 || t < 8 ? 0.6 : 1);
    } else if (ev === 'ill' || ev === 'illAdj') {
      // Hormones de stress (cortisol, catécholamines, glucagon) : insulinorésistance, production hépatique accrue,
      // cétose ; ne pas arrêter l'insuline, glycémies et cétonémie rapprochées, iSGLT2 et metformine suspendus.
      dg = (t) => 0.35 + 0.1 * Math.sin(Math.PI * t / 24);
      egpF = () => 1.3; ketF = 2.2;
      if (ev === 'illAdj') {
        // Jours de maladie : insuline + 20 % (débit temporaire + 30 % sous pompe), corrections toutes les 4 h,
        // iSGLT2 suspendu ; sans insuline, la glycémie reste haute (insuline transitoire à discuter).
        if (rx.basal + (rx.pump || 0) + rx.rapid > 0) { exoF = () => (rx.pump > 0 ? 1.3 : 1.2); dg = (t) => 0.12 + 0.05 * Math.sin(Math.PI * t / 24); ketF = 1.3; }
        else ketF = 1.8;
      }
    }
    return { d, dg, egpF, ketF, exoF };
  }

  function decompose(pt, D, Y, dp0, ev) {
    const E = applyEvent(pt, dp0, ev || 'none'), dp = E.d;
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
    const gAt = (t) => { const tt = ((t % 24) + 24) % 24; return Math.max(0.4, Y.glucose(dp, tt) + E.dg(tt)); };
    for (let i = 0; i < 288; i++) {
      const t = i * DT;
      for (let m = 0; m < 3; m++) if (t <= dp.tm[m] && t + DT > dp.tm[m]) Qs += carbs[m];
      if (dp.snacks) dp.snacks.forEach((sn) => { if (t <= sn.t && t + DT > sn.t) Qs += 30; });
      const ge = kge * Qs; Qs -= ge * DT; Qi += ge * DT;
      const ra0 = kabs * Qi; Qi -= ra0 * DT; const ra = ra0 * raFrac;
      const G = gAt(t), dG = (gAt(t + 0.5) - gAt(t - 0.5)); // pente lissée sur 1 h (g/L/h)
      const gd = Math.min(1, Math.max(0, (G - 0.8) / 0.5));
      const incE = (ra / 35) * 0.5 * (1 + dpp); // effet incrétine endogène (réduit de moitié dans le DT2)
      const incP = 1.2 * glpF * (isT ? 1.25 : 1) * gd; // agonisme pharmacologique, glucodépendant
      const su = (e.eSu || 0) * B * 5;
      const isec = 8 * B * (0.08 + Math.max(0, G - 0.75)) * (1 + 1.4 * (incE + incP)) + su;
      const iexo = exoAt(rx, t, dp.u || [0, 0, 0], dp.tm) * E.exoF(t);
      const portal = isec * 1.6 + iexo * 0.8;
      const glu = Math.max(0.15, (1 + 2 * Math.max(0, 0.9 - G)) / (1 + 0.45 * portal) * (1 - gluSup) * (1 + 0.5 * Math.min(1, ra / 30)));
      let egp = E.egpF(t) * egp0 * (0.4 + 0.6 * glu) * (1 - metK) / (1 + 0.35 * portal * si);
      const ren = renK * Math.max(0, G - tm);
      // Lipolyse (tissu adipeux, relatif au jeûne normal) : très sensible à l'insuline (freinée dès des taux bas),
      // accrue par le glucagon et l'insulinorésistance du tissu adipeux, par un régime très pauvre en glucides.
      const insAd = (isec * 0.6 + iexo) * Math.min(1.2, si * 1.4);
      const lip = (0.4 + 0.6 * glu) * (1 + 0.8 * Math.max(0, 1 - si)) * (p.lowcarb ? 1.3 : 1) / (1 + 0.5 * insAd);
      // Cétogenèse hépatique : acides gras disponibles × rapport glucagon / insuline portale ; iSGLT2 : moins
      // d'insuline, plus de glucagon, cétogenèse accrue (acidocétose possible à glycémie peu élevée).
      const kss = 0.06 + 2.0 * Math.max(0, lip - 0.25) * glu / (1 + 0.4 * portal) * (e.sglt > 0 ? 1.8 : 1) * (p.lowcarb ? 1.8 : 1) * E.ketF;
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
    tot.gMin = Math.min(...pts.map((q) => q.G)); tot.gMax = Math.max(...pts.map((q) => q.G));
    return { dp, pts, tot, k: { B, si, glpF, isT, shortA, satiety, gluSup, tm, metK, dpp, kge, acarb: !!rx.acarb, su: (e.eSu || 0) > 0, egp0, e, rx, W } };
  }

  /* ---------- Vue ---------- */
  const fmt = (v, d) => (v == null || isNaN(v) ? '—' : v.toFixed(d).replace('.', ','));
  // Étiquettes (cartes latérales) et point anatomique visé, en coordonnées du corps de l'atlas (cou en y ≈ − 285).
  const ORG = {
    brain: { x: -330, y: -392, w: 190, h: 66, t: 'Centre de la faim', a: [0, -372] },
    liver: { x: -330, y: -170, w: 190, h: 66, t: 'Foie', a: [-50, -118] },
    fat: { x: -330, y: -62, w: 190, h: 66, t: 'Tissu adipeux', a: [-72, -32] },
    keto: { x: -330, y: 52, w: 190, h: 66, t: 'Corps cétoniques', a: [-58, -132] },
    pen: { x: -330, y: 166, w: 190, h: 52, t: 'Insuline injectée', a: [74, 30] },
    blood: { x: 330, y: -268, w: 190, h: 66, t: 'Glycémie (sang)', a: [14, -180] },
    stomach: { x: 330, y: -168, w: 190, h: 52, t: 'Estomac', a: [56, -124] },
    beta: { x: 330, y: -98, w: 190, h: 52, t: 'Cellules β (pancréas)', a: [16, -70] },
    alpha: { x: 330, y: -36, w: 190, h: 52, t: 'Cellules α (pancréas)', a: [34, -72] },
    gut: { x: 330, y: 40, w: 190, h: 66, t: 'Intestin', a: [8, -6] },
    kidney: { x: 330, y: 128, w: 190, h: 66, t: 'Rein', a: [64, -62] },
    muscle: { x: 330, y: 212, w: 190, h: 52, t: 'Muscle (cuisse)', a: [56, 160] }
  };
  // Trajets anatomiques des flux (veine porte, artères, veines hépatiques…), du départ vers l'arrivée.
  const PATHS = {
    hunger: 'M0,-352 C30,-300 64,-210 56,-150',
    ge: 'M56,-100 C54,-70 34,-48 14,-30',
    ra: 'M-4,-18 C-22,-58 -44,-88 -46,-118 C-46,-150 -14,-172 4,-180',
    inc: 'M16,-24 C28,-40 28,-54 20,-64',
    insL: 'M2,-72 C-12,-82 -26,-96 -36,-110',
    insM: 'M30,-64 C96,-36 98,64 62,132',
    glu: 'M30,-80 C4,-104 -20,-122 -32,-128',
    egp: 'M-34,-138 C-20,-160 -8,-172 4,-180',
    upM: 'M22,-168 C112,-120 104,52 64,132',
    upF: 'M2,-170 C-58,-132 -82,-86 -74,-46',
    ren: 'M26,-164 C70,-130 78,-92 66,-72',
    exoL: 'M70,24 C20,44 -42,6 -48,-96',
    exoM: 'M78,40 C88,80 72,110 60,138',
    ffa: 'M-74,-48 C-84,-84 -68,-108 -58,-114',
    ket: 'M-52,-136 C-60,-170 -22,-196 -2,-190'
  };
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

  const EVNOTE = {
    sport: (k, T) => 'Activité physique : le muscle capte le glucose sans insuline pendant l\'effort, puis la sensibilité à l\'insuline reste accrue 6 à 12 h. ' + (k.rx.basal + (k.rx.pump || 0) + k.rx.rapid > 0 || k.su ? 'Sous insuline ou sulfamide, la sécrétion ou l\'injection ne baisse pas : réduire le bolus du repas précédent ou le débit de la pompe, collation si besoin.' : 'Sans insuline ni sulfamide, pas d\'hypoglycémie : la sécrétion s\'adapte.') + (T.gMin < 0.7 ? ' Ici : hypoglycémie.' : ''),
    skip: () => 'Déjeuner sauté avec son bolus : l\'après-midi ne reflète plus que l\'insuline de fond. C\'est le principe du test de jeûne pour régler la basale ou les créneaux de la pompe.',
    big: (k) => 'Dîner copieux : ' + (k.rx.bolusMode === 'if' ? 'en insulinothérapie fonctionnelle, le bolus suit les glucides.' : k.rx.rapid > 0 ? 'avec un bolus fixe, l\'excursion post-prandiale n\'est pas couverte.' : 'la sécrétion résiduelle ne suffit pas : pic post-prandial et glycosurie.'),
    snack: () => 'Collation sucrée sans bolus : pic de l\'après-midi, glycémie avant le dîner plus haute (bolus du dîner faussement augmenté si on le juge sur elle).',
    alcohol: (k) => 'Alcool : le foie ne fait plus de néoglucogenèse. ' + (k.rx.basal + (k.rx.pump || 0) + k.rx.rapid > 0 || k.su ? 'Sous insuline ou sulfamide : hypoglycémie nocturne ou matinale possible ; collation glucidique, contrôle au coucher.' : 'Sans insuline ni sulfamide, baisse modérée.'),
    sportAdj: (k, T) => (k.rx.pump > 0 ? 'Débit temporaire − 50 % de 16 h à 18 h (1 h avant et pendant l\'effort) : moins d\'insuline pendant l\'effort, la baisse est amortie. ' : k.rx.basal + k.rx.rapid > 0 || k.su ? 'Collation de 15 g avant l\'effort (sous insuline, on peut aussi réduire de 30 à 50 % le bolus du repas pris 1 à 3 h avant) : la baisse est amortie. ' : 'Sans insuline ni sulfamide, pas d\'adaptation nécessaire. ') + 'Glycémie minimale ' + fmt(T.gMin, 2) + ' g/L.',
    illAdj: (k, T) => (k.rx.basal + (k.rx.pump || 0) + k.rx.rapid > 0 ? 'Jours de maladie : insuline augmentée (+ 20 %, débit temporaire + 30 % sous pompe), corrections toutes les 4 h, boissons, cétonémie si glycémie > 2,50 g/L ; iSGLT2 suspendu, metformine suspendue si déshydratation. ' : 'Sans insuline : glycémie haute pendant l\'infection ; suspendre iSGLT2 et metformine en cas de déshydratation, insuline transitoire si glycémies > 3 g/L ou cétose. ') + 'Cétonémie maximale ' + fmt(T.ketMax, 1) + ' mmol/L.',
    ill: (k, T) => 'Infection : hormones de stress, insulinorésistance, production hépatique accrue, cétose. Ne jamais arrêter l\'insuline (souvent l\'augmenter), glycémies et cétonémie rapprochées, hydratation ; suspendre iSGLT2 et metformine en cas de déshydratation (cétonémie ici jusqu\'à ' + fmt(T.ketMax, 1) + ' mmol/L).'
  };

  /* ---------- Molécules (glyphes inspirés de l'atlas, js/molecules-axes.js) ---------- */
  // Encombrement ≈ 14 unités ; couleur portée par la classe (variables du thème).
  const MOLS = [['glc', 'glucose'], ['ins', 'insuline'], ['glu', 'glucagon'], ['inc', 'GLP-1, GIP'], ['ffa', 'acide gras'], ['ket', 'cétone']];
  function buildMols(defs) {
    const hexV = (r) => [-90, -30, 30, 90, 150, 210].map((a) => [r * Math.cos(a * Math.PI / 180), r * Math.sin(a * Math.PI / 180)]);
    const P = (pts) => 'M' + pts.map((q) => q[0].toFixed(2) + ',' + q[1].toFixed(2)).join(' L') + ' Z';
    let g = el('g', { id: 'phm-glc', class: 'phm phm-glc' }, defs); // β-D-glucopyranose : cycle à 6 sommets, O cyclique, OH
    const hv = hexV(5);
    el('path', { d: P(hv), class: 'phm-ring' }, g);
    el('circle', { cx: hv[0][0], cy: hv[0][1], r: 1.5, class: 'phm-O' }, g);
    [1, 2, 3, 4].forEach((i) => { const q = hv[i], k = 1.55; el('line', { x1: q[0], y1: q[1], x2: q[0] * k, y2: q[1] * k, class: 'phm-bond' }, g); el('circle', { cx: q[0] * 1.75, cy: q[1] * 1.75, r: 1.1, class: 'phm-O' }, g); });
    g = el('g', { id: 'phm-ins', class: 'phm phm-ins' }, defs); // insuline : chaînes A et B, deux ponts disulfure
    el('path', { d: 'M-7,-3.5 L6,-3.5', class: 'phm-chain' }, g); el('path', { d: 'M-8,3.5 L8,3.5', class: 'phm-chain' }, g);
    for (let i = 0; i < 5; i++) el('circle', { cx: -7 + i * 3.2, cy: -3.5, r: 1.3, class: 'phm-res' }, g);
    for (let i = 0; i < 6; i++) el('circle', { cx: -8 + i * 3.2, cy: 3.5, r: 1.3, class: 'phm-res b' }, g);
    el('path', { d: 'M-4,-3.5 L-4,3.5 M3,-3.5 L3,3.5', class: 'phm-ss' }, g);
    g = el('g', { id: 'phm-glu', class: 'phm phm-glu' }, defs); // glucagon : peptide de 29 acides aminés en hélice
    el('path', { d: 'M-8,2 Q-6,-4 -3,1 T2,1 T7,-1', class: 'phm-chain' }, g);
    [[-8, 2], [-5, -1.5], [-2, 1.5], [1, -1], [4, 1.5], [7, -1]].forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 1.4, class: 'phm-res' }, g));
    g = el('g', { id: 'phm-inc', class: 'phm phm-inc' }, defs); // incrétines (GLP-1, GIP) : peptides
    el('path', { d: 'M-7,3 C-5,-4 4,-4 7,3', class: 'phm-chain' }, g);
    [[-7, 3], [-4.5, -1.2], [0, -2.6], [4.5, -1.2], [7, 3]].forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 1.4, class: 'phm-res' }, g));
    g = el('g', { id: 'phm-ffa', class: 'phm phm-ffa' }, defs); // acide gras : chaîne carbonée, carboxyle
    el('path', { d: 'M-9,1 L-6,-1.5 L-3,1 L0,-1.5 L3,1 L6,-1.5', class: 'phm-zig' }, g);
    el('circle', { cx: 7.6, cy: -2.2, r: 1.4, class: 'phm-O' }, g); el('circle', { cx: 7.8, cy: 1.2, r: 1.2, class: 'phm-O' }, g);
    g = el('g', { id: 'phm-ket', class: 'phm phm-ket' }, defs); // corps cétonique (acétoacétate, β-hydroxybutyrate)
    el('path', { d: 'M-6,2 L-3,-1 L0,2 L3,-1 L6,2', class: 'phm-zig' }, g);
    el('circle', { cx: -3, cy: -3.4, r: 1.4, class: 'phm-O' }, g); el('circle', { cx: 6.8, cy: 4, r: 1.4, class: 'phm-O' }, g);
  }
  // Molécule portée par chaque flux.
  const FLOW_MOL = { ge: 'glc', ra: 'glc', inc: 'inc', insL: 'ins', insM: 'ins', glu: 'glu', egp: 'glc', upM: 'glc', upF: 'glc', ren: 'glc', exoL: 'ins', exoM: 'ins', ffa: 'ffa', ket: 'ket' }; // la faim (cerveau → estomac) n'est pas un flux de molécules

  function el(tag, a, par) { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (par) par.appendChild(n); return n; }

  /* ---------- Corps humain (silhouette et organes de l'atlas) ---------- */
  const mirrorX = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, x, y) => -parseFloat(x) + ',' + y);
  const HALF = 'M 0,-328 C 10,-328 17,-323 19,-314 C 21,-302 21,-294 25,-287 C 46,-277 82,-273 104,-263 C 121,-255 128,-239 124,-221 C 119,-205 108,-197 103,-186 C 103,-150 99,-110 89,-71 C 83,-47 83,-25 91,-5 C 103,23 108,51 106,84 C 104,140 96,200 87,250 C 83,276 86,300 84,330 C 82,360 71,384 67,400 C 73,412 82,420 71,426 C 56,431 38,429 30,422 C 28,404 30,388 30,372 C 26,330 22,300 24,262 C 20,210 16,160 10,110 C 6,90 4,78 0,74';
  const ARM = 'M 117,-246 C 145,-246 156,-222 156,-196 C 160,-150 165,-110 168,-74 C 172,-40 179,0 183,40 C 185,58 187,70 189,80 C 199,96 203,118 195,136 C 189,148 175,146 171,132 C 167,118 167,100 169,84 C 163,62 157,40 151,16 C 145,-14 139,-44 137,-74 C 133,-112 125,-150 115,-180 C 111,-200 108,-224 117,-246 Z';
  function drawBody(svg) {
    const defs = svg.querySelector('defs');
    const sh = el('radialGradient', { id: 'phShine', cx: '35%', cy: '30%', r: '75%' }, defs);
    [[0, '#fff', 0.45], [0.55, '#fff', 0.08], [1, '#000', 0.18]].forEach(([o, c, op]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }, sh));
    const bodyG = el('g', { class: 'ph-body' }, svg);
    [ARM, mirrorX(ARM)].forEach((d) => el('path', { d, class: 'phb-fill phb-limb' }, bodyG));
    [-1, 1].forEach((k) => el('ellipse', { cx: k * 45, cy: -382, rx: 7, ry: 13, class: 'phb-fill phb-ear' }, bodyG));
    el('ellipse', { cx: 0, cy: -385, rx: 46, ry: 58, class: 'phb-fill phb-head' }, bodyG);
    [HALF, mirrorX(HALF)].forEach((d) => el('path', { d: d + ' Z', class: 'phb-fill' }, bodyG));
    [HALF, mirrorX(HALF)].forEach((d) => el('path', { d, class: 'phb-outline' }, bodyG));
    ['M -98,-262 C -66,-270 -28,-262 -7,-255', 'M 0,-246 L 0,-62', 'M -94,64 C -72,124 -54,184 -50,240'].forEach((d) => { el('path', { d, class: 'phb-line' }, bodyG); if (d.indexOf('M 0,') !== 0) el('path', { d: mirrorX(d), class: 'phb-line' }, bodyG); });
    const solid = (gg, d, cls) => { el('path', { d, class: 'phb-org ' + cls }, gg); el('path', { d, class: 'phb-shine', fill: 'url(#phShine)' }, gg); };
    const L = (x, y, sc, f, rot) => { const gg = el('g', { transform: 'translate(' + x + ' ' + y + ')' + (rot ? ' rotate(' + rot + ')' : '') + ' scale(' + sc + ')', class: 'phb-o' }, bodyG); f(gg); return gg; };
    // Cerveau (vue latérale) et hypothalamus.
    L(0, -384, 0.95, (gg) => {
      solid(gg, 'M -44,6 C -48,-18 -30,-38 -4,-40 C 22,-42 44,-28 46,-6 C 48,6 42,14 32,14 C 28,22 18,24 10,20 C 0,26 -16,26 -22,18 C -34,20 -44,16 -44,6 Z', 'o-brain');
      solid(gg, 'M 18,16 C 24,10 40,12 42,22 C 42,32 26,36 18,30 C 14,26 14,20 18,16 Z', 'o-cerebellum');
      el('path', { d: 'M -30,8 C -14,0 4,2 18,-6 M 4,-38 C -2,-24 8,-14 2,-2 M -30,-24 C -20,-18 -24,-8 -14,-6 M 20,-30 C 28,-22 22,-12 32,-8', class: 'phb-gyrus' }, gg);
      el('ellipse', { cx: -2, cy: 14, rx: 9, ry: 5, class: 'phb-org o-hypo' }, gg);
    });
    // Poumons (discrets), cœur.
    const lung = 'M -8,-40 C -26,-40 -40,-10 -42,22 C -44,40 -30,46 -14,40 C -4,36 -2,20 -4,0 C -4,-20 0,-40 -8,-40 Z';
    L(-44, -186, 1.15, (gg) => solid(gg, lung, 'o-lung'));
    L(44, -186, 1.15, (gg) => solid(gg, mirrorX(lung), 'o-lung'));
    L(12, -180, 0.85, (gg) => {
      solid(gg, 'M -2,-22 C -4,-36 4,-46 16,-46 C 30,-46 34,-36 32,-28 L 25,-28 C 25,-35 20,-39 15,-39 C 9,-39 7,-32 7,-22 Z', 'o-aorta');
      solid(gg, 'M -30,-10 C -34,10 -18,32 6,42 C 14,46 22,40 28,30 C 38,14 40,-4 32,-16 C 24,-26 6,-26 -4,-20 C -14,-24 -26,-20 -30,-10 Z', 'o-heart');
    });
    // Reins (en arrière), foie, estomac, pancréas, intestin.
    const kid = 'M -6,-14 C 4,-16 10,-6 10,2 C 10,12 4,18 -4,16 C -10,14 -6,6 -2,2 C -6,-2 -12,-10 -6,-14 Z';
    L(-64, -62, 1.6, (gg) => solid(gg, mirrorX(kid), 'o-kidney'));
    L(64, -62, 1.6, (gg) => solid(gg, kid, 'o-kidney'));
    L(-40, -122, 1.3, (gg) => { solid(gg, 'M -50,-6 C -48,-26 -18,-34 10,-30 C 30,-28 48,-22 52,-14 C 54,-8 42,-4 28,2 C 12,10 -6,22 -22,26 C -38,30 -50,18 -50,-6 Z', 'o-liver'); solid(gg, 'M -16,16 C -14,30 -2,32 0,24 C 0,18 -8,13 -16,16 Z', 'o-gall'); });
    L(56, -124, 1.8, (gg) => solid(gg, 'M -10,-14 C 0,-20 14,-14 14,-2 C 14,12 2,18 -10,16 C -4,8 -4,0 -10,-14 Z', 'o-stomach'));
    L(22, -72, 1.55, (gg) => { solid(gg, 'M -22,2 C -22,-6 -10,-6 0,-4 C 12,-2 22,-6 26,-2 C 28,2 20,6 8,6 C -4,6 -14,10 -22,2 Z', 'o-pancreas'); [[-8, 0, 'b'], [4, -1, 'a'], [14, 1, 'b']].forEach(([x, y, t]) => el('circle', { cx: x, cy: y, r: 2.2, class: 'phb-islet-' + t }, gg)); });
    L(4, -2, 0.82, (gg) => { solid(gg, 'M -40,-30 C -40,-40 40,-40 40,-30 L 40,30 C 40,40 -40,40 -40,30 Z', 'o-colon'); solid(gg, 'M -28,-18 C -10,-30 10,-6 28,-18 C 34,-6 18,4 28,16 C 10,26 -10,4 -28,16 C -34,4 -18,-6 -28,-18 Z', 'o-small'); });
    // Tissu adipeux (flanc), muscle de la cuisse, site d'injection.
    L(-72, -30, 0.55, (gg) => [[-20, -12, 15], [8, -18, 14], [26, 4, 14], [-2, 10, 15], [-26, 14, 12]].forEach(([x, y, r]) => { el('circle', { cx: x, cy: y, r, class: 'phb-org o-fat' }, gg); el('circle', { cx: x, cy: y, r, class: 'phb-shine', fill: 'url(#phShine)' }, gg); }));
    L(56, 168, 1, (gg) => { el('path', { d: 'M -52,0 L -34,0 M 34,0 L 52,0', class: 'phb-tendon' }, gg); solid(gg, 'M -36,0 C -26,-20 26,-20 36,0 C 26,20 -26,20 -36,0 Z', 'o-muscle'); el('path', { d: 'M -28,-6 C -10,-12 10,-12 28,-6 M -30,0 L 30,0 M -28,6 C -10,12 10,12 28,6', class: 'phb-fiber' }, gg); }, 90);
    L(-56, 168, 1, (gg) => { el('path', { d: 'M -52,0 L -34,0 M 34,0 L 52,0', class: 'phb-tendon' }, gg); solid(gg, 'M -36,0 C -26,-20 26,-20 36,0 C 26,20 -26,20 -36,0 Z', 'o-muscle'); }, 90);
    L(76, 30, 1, (gg) => { el('rect', { x: -4, y: -16, width: 8, height: 24, rx: 3, class: 'phb-org o-pen' }, gg); el('rect', { x: -2, y: 8, width: 4, height: 6, class: 'phb-org o-pen-n' }, gg); });
  }

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
      st.res = decompose(pt, D, Y, st.dp, st.ev);
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
    // Plein écran (le schéma du corps est trop petit dans la colonne) : API plein écran si possible, sinon calque.
    const setFull = (on) => {
      st.full = on; root.classList.toggle('ph-full', on); document.body.classList.toggle('ph-noscroll', on);
      fullBtn.textContent = on ? '✕ Quitter le plein écran' : '⛶ Plein écran';
      try { if (on && root.requestFullscreen && !document.fullscreenElement) root.requestFullscreen().catch(() => {}); else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) { /* calque seul */ }
    };
    const fullBtn = h('button', { type: 'button', class: 'sv-primary', id: 'dtPhFull', onclick: () => setFull(!st.full) }, st.full ? '✕ Quitter le plein écran' : '⛶ Plein écran');
    const onKey = (e) => { if (e.key === 'Escape' && st.full) setFull(false); if (!root.isConnected) document.removeEventListener('keydown', onKey); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && st.full && root.isConnected) setFull(false); });
    if (st.full) requestAnimationFrame(() => { root.classList.add('ph-full'); document.body.classList.add('ph-noscroll'); });
    const svg = el('svg', { viewBox: '-430 -470 860 720', class: 'ph-svg', role: 'img', 'aria-label': 'Physiologie du glucose du patient' });
    const chart = el('svg', { viewBox: '0 0 760 230', class: 'ph-chart', role: 'img', 'aria-label': 'Courbes de 24 heures' });
    const info = h('div', { class: 'ph-info', id: 'dtPhInfo' });
    const tLab = h('strong', { class: 'ph-time' });
    const slider = h('input', { type: 'range', min: 0, max: 23.9, step: 0.1, value: st.t, class: 'sv-range', id: 'dtPhT', 'aria-label': 'Heure de la journée', oninput: (e) => { st.t = +e.target.value; frame(); } });
    const playBtn = h('button', { type: 'button', class: 'sv-secondary', id: 'dtPhPlay', onclick: () => { st.play = !st.play; playBtn.textContent = st.play ? '⏸ Pause' : '▶ Lecture'; if (st.play) requestAnimationFrame(loop); } }, st.play ? '⏸ Pause' : '▶ Lecture');
    const sum = h('div', { class: 'ph-sum', id: 'dtPhSum' });
    const pred = h('div', { class: 'ph-pred', id: 'dtPhPredBox', hidden: true });
    // Prédiction indicative : le traitement essayé (copie) contre le traitement du dossier, 6 mois, titration comprise.
    function project(rx) {
      const c = JSON.parse(JSON.stringify(Object.assign({}, pt, { log: [] })));
      c.rx = JSON.parse(JSON.stringify(rx)); c.rx.rapidM = (c.rx.rapidM || [0, 0, 0]).slice();
      const tst = { above: {} }, out = [{ d: 0, a: c.st.A, w: c.st.W }], h0 = c.st.hypo;
      for (let d = 1; d <= 182; d++) {
        D.advance(c, 1);
        if (st.titr.who !== 'none' && (c.rx.basal + (c.rx.pump || 0) + c.rx.rapid) > 0) { const dp = Y.makeDay(c, D, { seed: (st.seed + c.day * 7919) >>> 0 }); c.st.hypo += dp.native; Y.titrate(c.rx, Y.readings(dp), Object.assign({ cgm: true, basalMax: c.rx.pump > 0 ? null : Math.round(0.5 * c.st.W) }, st.titr), tst, true); }
        if (d % 7 === 0) out.push({ d, a: c.st.A, w: c.st.W });
      }
      return { pts: out, hypo: c.st.hypo - h0, rx: c.rx };
    }
    function predict() {
      const A = project(pt.rx), same = JSON.stringify(pt.rx) === JSON.stringify(st.rx0), B = same ? null : project(st.rx0);
      pred.hidden = false; pred.textContent = '';
      const at = (P, d) => P.pts.reduce((x, q) => (Math.abs(q.d - d) < Math.abs(x.d - d) ? q : x));
      const line = (lab, P) => h('div', { class: 'ph-row' }, [h('span', null, lab), h('strong', null, 'M3 ' + fmt(at(P, 91).a, 1) + ' % · M6 ' + fmt(at(P, 182).a, 1) + ' % · ' + (at(P, 182).w - P.pts[0].w >= 0 ? '+' : '') + fmt(at(P, 182).w - P.pts[0].w, 1) + ' kg' + (P.hypo ? ' · ' + P.hypo + ' hypo.' : ''))]);
      const sv = el('svg', { viewBox: '0 0 300 90', class: 'ph-trend' });
      const all = [A].concat(B ? [B] : []).flatMap((P) => P.pts.map((q) => q.a)), amin = Math.min(...all) - 0.2, amax = Math.max(...all) + 0.2;
      const xs = (d) => 30 + 262 * d / 182, ys = (a) => 8 + 66 * (1 - (a - amin) / (amax - amin));
      [[A, 'ph-l-a'], [B, 'ph-l-b']].forEach(([P, c]) => { if (P) el('path', { d: P.pts.map((q, i) => (i ? 'L' : 'M') + xs(q.d).toFixed(1) + ',' + ys(q.a).toFixed(1)).join(' '), class: c }, sv); });
      el('text', { x: 2, y: 14, class: 'ph-ax' }, sv).textContent = fmt(amax, 1); el('text', { x: 2, y: 76, class: 'ph-ax' }, sv).textContent = fmt(amin, 1);
      el('text', { x: 292, y: 88, class: 'ph-ax', 'text-anchor': 'end' }, sv).textContent = '6 mois · HbA1c (%)';
      pred.append(h('p', { class: 'sv-eyebrow' }, 'Prédiction indicative à 6 mois'), line('Traitement essayé', A), B ? line('Traitement du dossier', B) : h('p', { class: 'sv-note' }, 'Même traitement que le dossier.'), sv,
        h('p', { class: 'sv-note' }, 'Modèle DT2 calé sur les essais, observance du patient, titration comprise ; à titre indicatif (chaque patient réel s\'en écarte).'));
    }
    const trend = el('svg', { viewBox: '0 0 300 70', class: 'ph-trend' });
    const legend = el('svg', { viewBox: '0 0 760 36', class: 'ph-legend', role: 'img', 'aria-label': 'Légende des molécules' });
    MOLS.forEach(([m, t], i) => { const x = 22 + i * 124; el('use', { href: '#phm-' + m, transform: 'translate(' + x + ',18) scale(1.7)' }, legend); el('text', { x: x + 19, y: 23, class: 'ph-ax ph-legt' }, legend).textContent = t; });
    root.append(
      h('div', { class: 'sv-card-head' }, [h('h3', null, 'Physiologie du patient : ce que font les traitements'), h('div', { class: 'sv-actions' }, [fullBtn, h('button', { type: 'button', class: 'sv-secondary', onclick: () => { setFull(false); onClose(); } }, 'Fermer')])]),
      h('p', { class: 'sv-muted' }, 'Copie du patient (le dossier n\'est pas modifié). La glycémie est celle du patient simulé ; le module la décompose organe par organe. Cliquez sur un organe. Modifiez les traitements, puis faites avancer le temps.'),
      ctx.train ? h('p', { class: 'sv-note ph-trainnote' }, 'Mode entraînement : le module montre la physiologie du traitement en cours ; les essais de traitements, l\'avance dans le temps et les prédictions sont masqués jusqu\'à la fin de l\'entraînement.') : h('div', { class: 'ph-tog' }, TOG.map(([id, lab, isOn, set]) => h('label', { class: 'sv-chipcheck' }, [h('input', { type: 'checkbox', id: 'dtPh-' + id, checked: isOn(pt.rx), onchange: (e) => { set(pt.rx, e.target.checked); if (id === 'glp' && e.target.checked) document.getElementById('dtPh-tirz').checked = false; if (id === 'tirz' && e.target.checked) document.getElementById('dtPh-glp').checked = false; compute(); draw(); } }), ' ' + lab]))),
      h('div', { class: 'ph-evrow' }, [h('label', { for: 'dtPhEv' }, 'Événement de la journée'), h('select', { id: 'dtPhEv', onchange: (e) => { st.ev = e.target.value; compute(); draw(); } }, EVENTS.map(([k2, t]) => h('option', { value: k2, selected: (st.ev || 'none') === k2 }, t)))]),
      h('div', { class: 'ph-ctrl' }, [playBtn,
        h('select', { id: 'dtPhSpeed', 'aria-label': 'Vitesse', onchange: (e) => { st.speed = +e.target.value; } }, [[1, '1 h/s'], [2, '2 h/s'], [6, '6 h/s']].map(([v, t]) => h('option', { value: v, selected: st.speed === v }, t))),
        slider, tLab,
        h('span', { class: 'ph-sep' }),
        ...(ctx.train ? [] : [
          h('button', { type: 'button', class: 'sv-secondary', id: 'dtPhD1', onclick: () => advance(1) }, '+1 jour'),
          h('button', { type: 'button', class: 'sv-secondary', id: 'dtPhW1', onclick: () => advance(7) }, '+1 semaine'),
          h('button', { type: 'button', class: 'sv-secondary', id: 'dtPhW4', onclick: () => advance(28) }, '+4 semaines'),
          h('button', { type: 'button', class: 'sv-secondary', id: 'dtPhPred', onclick: predict }, '🔮 Prédire à 6 mois'),
          h('button', { type: 'button', class: 'sv-linkbtn', onclick: () => { reset(); compute(); ctx.rerender(); } }, 'Revenir au patient')])
      ]),
      h('div', { class: 'ph-grid' }, [h('div', { class: 'ph-diag' }, [svg, legend]), h('div', { class: 'ph-side' }, [sum, pred, h('div', { class: 'ph-trendbox' }, trend), info])]),
      h('div', { class: 'ph-chartbox' }, chart),
      h('p', { class: 'sv-note' }, 'Mécanismes : modèle « glyc » de l\'atlas enrichi des effets pharmacologiques (complément) ; la captation par le muscle et le tissu adipeux est calculée par bilan de masse. Chaque journée reprend la glycémie moyenne du modèle DT2, calé sur les essais.')
    );

    const g = {};
    function draw() {
      svg.textContent = ''; chart.textContent = '';
      const k = st.res.k;
      const defs = el('defs', {}, svg);
      buildMols(defs);
      ['g', 'i', 'x', 'n', 'u', 'k'].forEach((c) => { const m = el('marker', { id: 'phA' + c, viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 11, markerHeight: 11, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs); el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'ph-ah ph-' + c }, m); });
      // Silhouette et organes, dans le style de l'atlas (js/scenes/atlas.js, js/organs.js).
      drawBody(svg);
      Object.entries(PATHS).forEach(([id, d]) => { const cls = { hunger: 'n', inc: 'i', insL: 'i', insM: 'i', glu: 'n', ren: 'u', exoL: 'x', exoM: 'x', ffa: 'k', ket: 'k' }[id] || 'g'; g[id] = el('path', { d, class: 'ph-flow ph-' + cls, 'marker-end': 'url(#phA' + cls + ')' }, svg); });
      g.mols = el('g', { class: 'ph-mols' }, svg);
      // Cartes latérales (valeurs) reliées à leur organe.
      Object.entries(ORG).forEach(([id, o]) => {
        const off = id === 'pen' && !(k.rx.basal > 0 || k.rx.rapid > 0 || k.rx.pump > 0);
        const grp = el('g', { class: 'ph-org' + (st.sel === id ? ' sel' : '') + (off ? ' off' : ''), tabindex: 0, role: 'button', 'aria-label': o.t }, svg);
        grp.addEventListener('click', () => { st.sel = id; draw(); });
        grp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); st.sel = id; draw(); } });
        const ex = o.x < 0 ? o.x + o.w / 2 : o.x - o.w / 2;
        el('path', { d: 'M' + ex + ',' + o.y + ' L' + (o.x < 0 ? ex + 30 : ex - 30) + ',' + o.y + ' L' + o.a[0] + ',' + o.a[1], class: 'ph-leader' }, grp);
        el('circle', { cx: o.a[0], cy: o.a[1], r: 3.5, class: 'ph-dot' }, grp);
        const box = el('rect', { x: o.x - o.w / 2, y: o.y - o.h / 2, width: o.w, height: o.h, rx: 10, class: 'ph-box ph-box-' + id }, grp);
        el('text', { x: o.x, y: o.y - o.h / 2 + 19, class: 'ph-t', 'text-anchor': 'middle' }, grp).textContent = o.t;
        g['v_' + id] = el('text', { x: o.x, y: o.y - o.h / 2 + 38, class: 'ph-v' + (id === 'blood' ? ' ph-big' : ''), 'text-anchor': 'middle' }, grp);
        if (o.h > 60) g['s_' + id] = el('text', { x: o.x, y: o.y - o.h / 2 + 56, class: 'ph-s', 'text-anchor': 'middle' }, grp);
        if (id === 'blood') g.bloodC = box;
      });
      // Pastilles des médicaments sur leur site d'action (dans le corps).
      const pill = (x, y, txt, cls) => { const w = 7.6 * txt.length + 16; el('rect', { x: x - w / 2, y: y - 9, width: w, height: 18, rx: 9, class: 'ph-pill ph-pill-' + cls }, svg); el('text', { x, y: y + 4, class: 'ph-pt', 'text-anchor': 'middle' }, svg).textContent = txt; };
      const rx = k.rx;
      if (rx.met > 0) pill(-60, -160, 'metformine', 'met');
      if (rx.su > 0) pill(10, -50, 'sulfamide', 'su');
      if (rx.dpp4 > 0) pill(-40, 22, 'iDPP4', 'dpp');
      if (k.glpF > 0.01) { const n = rx.glp === 'tirz' ? 'tirzépatide' : 'aGLP1'; pill(0, -446, n, 'glp'); pill(100, -146, n, 'glp'); pill(90, -88, n, 'glp'); if (rx.glp === 'tirz') pill(-92, -6, 'GIP', 'glp'); }
      if (rx.sglt2 !== 'none') pill(104, -60, 'iSGLT2', 'sglt');
      if (rx.acarb > 0) pill(40, 22, 'acarbose', 'acarb');
      if (rx.act >= 150) pill(110, 190, 'activité', 'life');
      if (rx.diet) pill(-70, -420, 'diététique', 'life');
      if (st.res.tot.ketMax > 0.6) pill(-330, 98, st.res.tot.ketMax > 1.5 ? 'risque d\'acidocétose' : 'cétose', 'ket');
      if (rx.basal > 0 || rx.pump > 0 || rx.rapid > 0) pill(74, 60, rx.pump > 0 ? 'pompe' : (rx.basal > 0 ? 'basale' : '') + (rx.basal > 0 && rx.rapid > 0 ? ' + ' : '') + (rx.rapid > 0 ? 'bolus' : ''), 'ins');
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
      const dpe = st.res.dp;
      dpe.tm.forEach((t, m) => { if (!dpe.skip[m]) el('text', { x: X(t), y: T + 10, class: 'ph-meal', 'text-anchor': 'middle' }, chart).textContent = m === 2 && st.ev === 'big' ? '🍽🍽' : '🍽'; });
      if (dpe.snacks) dpe.snacks.forEach((sn) => { el('text', { x: X(sn.t), y: T + 10, class: 'ph-meal', 'text-anchor': 'middle' }, chart).textContent = '🍬'; });
      if (st.ev === 'sport') el('rect', { x: X(17), y: T, width: X(17.75) - X(17), height: H, class: 'ph-evband' }, chart);
      if (st.ev === 'alcohol') el('text', { x: X(19.8), y: T + 24, class: 'ph-meal', 'text-anchor': 'middle' }, chart).textContent = '🍷';
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
        row('Glycémie min – max', fmt(T.gMin, 2) + ' – ' + fmt(T.gMax, 2) + ' g/L' + (T.gMin < 0.7 ? ' ⚠ hypoglycémie' : '')),
        row('Glucides absorbés', fmt(T.ra, 0) + ' g'),
        row('Production hépatique', fmt(T.egp, 0) + ' g'),
        row('Captation (muscle, graisse, cerveau)', fmt(T.up, 0) + ' g'),
        row('Glycosurie', fmt(T.ren, 0) + ' g (' + fmt(T.ren * 4, 0) + ' kcal)'),
        row('Cétonémie (moyenne · max)', fmt(T.ketMean, 2) + ' · ' + fmt(T.ketMax, 2) + ' mmol/L' + (T.ketMax > 1.5 ? ' ⚠' : T.ketMax > 0.6 ? ' ↑' : '')),
        row('Insuline sécrétée / injectée', fmt(T.isec, 0) + ' / ' + fmt(T.exo, 0) + ' U'),
        row('Sensibilité · réserve β', Math.round(k.si * 100) + ' % · ' + Math.round(k.B * 100) + ' %'),
        row('HbA1c · poids', fmt(pt.st.A, 1) + ' % · ' + fmt(pt.st.W, 1) + ' kg'),
        ctx.train ? null : row('HbA1c attendue à l\'équilibre', fmt((D.eqMG(pt, {}) * 100 + 46.7) / 28.7, 1) + ' %')
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
      const set = (id, v, max) => { const p = g[id]; if (!p) return; p.setAttribute('stroke-width', Wd(v, max).toFixed(1)); p.style.animationDuration = Math.max(0.35, 2.4 / Math.max(0.15, v / max)).toFixed(2) + 's'; p.classList.toggle('idle', v < max * 0.03); st.flux = st.flux || {}; st.flux[id] = v < max * 0.03 ? 0 : Math.min(1.5, v / max); };
      set('ge', q.ge, 40); set('ra', q.ra, 40); set('inc', q.inc, 1.5); set('insL', q.isec, 6); set('insM', q.isec, 6); set('glu', q.glu, 2);
      set('egp', q.egp, 25); set('upM', q.up * 0.75, 30); set('upF', q.up * 0.25, 30); set('ren', q.ren, 6); set('exoL', q.iexo, 4); set('exoM', q.iexo, 4); set('ffa', q.lip, 1); set('ket', q.ket, 1.5); set('hunger', 0.25 * (1 - k.satiety), 1);
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
      txt('v_kidney', 'glycosurie ' + fmt(q.ren, 2) + ' g/h');
      txt('s_kidney', 'seuil rénal ' + fmt(k.tm, 2) + ' g/L');
      txt('v_pen', fmt(q.iexo, 2) + ' U/h');
      txt('v_blood', fmt(q.G, 2) + ' g/L'); txt('s_blood', q.G < 0.7 ? 'hypoglycémie' : q.G > 1.8 ? 'au-dessus de 1,80' : 'dans la cible 0,70–1,80');
      if (g.bloodC) g.bloodC.setAttribute('class', 'ph-box ph-box-blood ' + (q.G < 0.7 ? 'low' : q.G > 1.8 ? 'high' : 'ok'));
      if (g.cursor) { const x = g.X(st.t); g.cursor.setAttribute('x1', x); g.cursor.setAttribute('x2', x); }
      if (st.infoSel !== st.sel) { st.infoSel = st.sel; }
      info.textContent = '';
      info.append(h('h4', null, ORG[st.sel].t), h('p', null, INFO[st.sel](k, st.res.tot)));
      if (st.ev && st.ev !== 'none') info.append(h('p', { class: 'ph-evnote' }, EVNOTE[st.ev](k, st.res.tot)));
    }

    let lastTs = 0;
    function loop(ts) {
      if (!st.play || !root.isConnected) { lastTs = 0; return; }
      if (lastTs) { st.t += (ts - lastTs) / 1000 * st.speed; if (st.t >= 24) st.t -= 24; frame(); }
      lastTs = ts;
      requestAnimationFrame(loop);
    }
    // Molécules en mouvement le long des flux : nombre et vitesse proportionnels au flux de l'heure affichée.
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let mT = 0, mLast = 0;
    const parts = {};
    function mloop(ts) {
      if (!root.isConnected) return;
      const dt = mLast ? Math.min(0.1, (ts - mLast) / 1000) : 0; mLast = ts; mT += reduce ? 0 : dt;
      const lay = g.mols;
      if (lay) {
        if (lay !== mloop.lay) { mloop.lay = lay; Object.keys(parts).forEach((k) => delete parts[k]); }
        Object.keys(FLOW_MOL).forEach((id) => {
          const path = g[id]; if (!path) return;
          const f = (st.flux && st.flux[id]) || 0, n = f > 0 ? Math.max(1, Math.round(1 + 4 * Math.min(1, f))) : 0;
          const arr = parts[id] || (parts[id] = []);
          while (arr.length < n) { const u = el('use', { href: '#phm-' + FLOW_MOL[id], class: 'ph-mol' }, lay); arr.push({ u, x: arr.length ? (arr[arr.length - 1].x + 1 / n) % 1 : Math.random() }); }
          while (arr.length > n) arr.pop().u.remove();
          if (!n) return;
          const L = path.getTotalLength(), sp = 0.12 + 0.28 * Math.min(1.2, f);
          // Chaque molécule avance depuis sa propre position (toujours dans le sens du flux, même si la vitesse change).
          arr.forEach((pa) => {
            if (!reduce) pa.x = (pa.x + dt * sp) % 1;
            const x = pa.x, pt = path.getPointAtLength(x * L);
            const sc = id === 'exoL' || id === 'exoM' ? 1.45 : 1.6;
            pa.u.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ',' + pt.y.toFixed(1) + ') scale(' + sc + ')');
            pa.u.setAttribute('opacity', (x < 0.08 ? x / 0.08 : x > 0.92 ? (1 - x) / 0.08 : 1).toFixed(2));
          });
        });
      }
      requestAnimationFrame(mloop);
    }
    draw();
    requestAnimationFrame(mloop);
    if (st.play) requestAnimationFrame(loop);
    return root;
  }

  S.dt2physio = { decompose, card, exoAt, EVENTS };
})();
