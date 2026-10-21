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
    ['illAdj', 'Infection fébrile avec adaptation des doses (jours de maladie)'],
    ['hypo', 'Hypoglycémie : bolus du déjeuner trop fort, repas pauvre en glucides'],
    ['hypoSev', 'Hypoglycémie sévère : dose excessive, repas sauté (tierce personne)']
  ];
  function applyEvent(pt, dp, ev) {
    const rx = pt.rx, ins = rx.basal + (rx.pump || 0) + rx.rapid > 0 || rx.su > 0;
    const d = Object.assign({}, dp, { w: dp.w.slice(), skip: dp.skip.slice(), cut: dp.cut.slice(), segCut: dp.segCut.slice(), extra: dp.extra.slice(), u: (dp.u || [0, 0, 0]).slice(), snacks: null });
    let dg = () => 0, egpF = () => 1, ketF = 1, exoF = () => 1, dip = null;
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
    } else if (ev === 'hypo') {
      // Creux vers 0,45 g/L à 14 h 30 : signes adrénergiques, puis neuroglucopéniques brefs ; resucrage (15 g).
      d.w[1] *= 0.6; dip = { tn: 14.5, g: 0.45, fall: 1.2, rise: 0.7 };
    } else if (ev === 'hypoSev') {
      // Creux vers 0,25 g/L à 15 h : coma hypoglycémique, glucagon ou G30 % par un tiers, remontée rapide.
      d.skip[1] = true; d.segCut[1] *= 0.3; dip = { tn: 15, g: 0.25, fall: 1.6, rise: 0.5 };
    }
    return { d, dg, egpF, ketF, exoF, dip };
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
    let gAt = (t) => { const tt = ((t % 24) + 24) % 24; return Math.max(0.2, Y.glucose(dp, tt) + E.dg(tt)); };
    if (E.dip) {
      // Hypoglycémie imposée : la glycémie rejoint le creux (chute en quelques dizaines de minutes), puis remonte
      // (resucrage, glucagon, contre-régulation).
      const q = E.dip, g0 = gAt, base = g0(q.tn);
      gAt = (t) => { const tt = ((t % 24) + 24) % 24, x = tt - q.tn, b = Math.exp(-Math.pow(x / (x < 0 ? q.fall : q.rise), 2)); return Math.max(0.2, g0(tt) - (base - q.g) * b); };
    }
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
      // Contre-régulation de l'hypoglycémie (seuils du module : 0,70 g/L) : l'hypothalamus active le système
      // sympathique, la médullosurrénale libère l'adrénaline (glycogénolyse, lipolyse, signes adrénergiques) et
      // la corticosurrénale le cortisol (néoglucogenèse, plus lent) ; souvent émoussée sous insuline.
      const adr = 1 + 7 * Math.min(1, Math.max(0, (0.7 - G) / 0.4));
      egp *= 1 + 0.06 * (adr - 1);
      // Lipolyse (tissu adipeux, relatif au jeûne normal) : très sensible à l'insuline (freinée dès des taux bas),
      // accrue par le glucagon et l'insulinorésistance du tissu adipeux, par un régime très pauvre en glucides.
      const insAd = (isec * 0.6 + iexo) * Math.min(1.2, si * 1.4);
      const lip = (0.4 + 0.6 * glu) * (1 + 0.8 * Math.max(0, 1 - si)) * (p.lowcarb ? 1.3 : 1) * (1 + 0.08 * (adr - 1)) / (1 + 0.5 * insAd);
      // Cétogenèse hépatique : acides gras disponibles × rapport glucagon / insuline portale ; iSGLT2 : moins
      // d'insuline, plus de glucagon, cétogenèse accrue (acidocétose possible à glycémie peu élevée).
      const kss = 0.06 + 2.0 * Math.max(0, lip - 0.25) * glu / (1 + 0.4 * portal) * (e.sglt > 0 ? 1.8 : 1) * (p.lowcarb ? 1.8 : 1) * E.ketF;
      let up = egp + ra - ren - V * dG;
      if (up < 4) { egp += 4 - up; up = 4; }
      tot.ra += ra * DT; tot.egp += egp * DT; tot.up += up * DT; tot.ren += ren * DT; tot.isec += isec * DT; tot.exo += iexo * DT;
      // Ingestion (bol alimentaire dans l'œsophage) : glucides du repas avalés en 20 minutes.
      let eat = 0; for (let m = 0; m < 3; m++) if (t >= dp.tm[m] && t < dp.tm[m] + 1 / 3) eat += carbs[m] * 3;
      if (dp.snacks) dp.snacks.forEach((sn) => { if (t >= sn.t && t < sn.t + 1 / 6) eat += 30 * 6; });
      pts.push({ t, G, ra, ge, eat, egp, up, ren, isec, iexo, glu, inc: incE + incP, incE, incP, Qs, su, lip, kss, adr });
    }
    // Cétonémie (β-hydroxybutyrate, mmol/L) : suit la cétogenèse avec une constante de temps d'environ 2 h
    // (deux passages pour partir d'un état périodique sur 24 h).
    let ket = pts.reduce((a, q) => a + q.kss, 0) / 288;
    for (let pass = 0; pass < 2; pass++) pts.forEach((q) => { ket += (q.kss - ket) * (1 - Math.exp(-DT / 2)); q.ket = Math.min(8, ket); });
    // Cortisol : réponse plus lente (constante de temps ≈ 1 h), relative au niveau de base.
    let co = 1;
    for (let pass = 0; pass < 2; pass++) pts.forEach((q) => { co += (1 + 0.4 * (q.adr - 1) - co) * (1 - Math.exp(-DT / 1)); q.cort = co; });
    tot.ketMax = Math.max(...pts.map((q) => q.ket)); tot.ketMean = pts.reduce((a, q) => a + q.ket, 0) / 288;
    tot.lip = pts.reduce((a, q) => a + q.lip, 0) / 288;
    tot.gMin = Math.min(...pts.map((q) => q.G)); tot.gMax = Math.max(...pts.map((q) => q.G));
    return { dp, pts, tot, k: { B, si, glpF, isT, shortA, satiety, gluSup, tm, metK, dpp, kge, acarb: !!rx.acarb, su: (e.eSu || 0) > 0, egp0, e, rx, W } };
  }

  /* ---------- Vue ---------- */
  const fmt = (v, d) => (v == null || isNaN(v) ? '—' : v.toFixed(d).replace('.', ','));
  // Schéma des axes (style « Régulation de la glycémie » de l'atlas) : organes en médaillons, liens annotés.
  // Colonnes : digestion (cerveau, estomac, intestin) · pancréas, glycémie, rein, vessie · foie, muscle, tissu adipeux
  // · cétones, insuline injectée ; en haut, la contre-régulation (hypothalamus → surrénales → foie).
  const NODES = {
    brain: { x: 210, y: 150, ic: 'brain', t: 'Hypothalamus', sub: 'faim · satiété · alerte' },
    stomach: { x: 210, y: 440, ic: 'stomach', t: 'Estomac', sub: 'vidange gastrique' },
    gut: { x: 210, y: 740, ic: 'gut', t: 'Intestin', sub: 'absorption · incrétines' },
    adrenal: { x: 640, y: 120, ic: 'adrenal', t: 'Surrénales', sub: 'contre-régulation', s: 0.85 },
    islet: { x: 640, y: 380, ic: 'islet', t: 'Îlots de Langerhans', sub: 'β : insuline · α : glucagon' },
    blood: { x: 640, y: 650, box: [280, 120], t: 'Glycémie' },
    kidney: { x: 640, y: 880, ic: 'kidney', t: 'Rein', sub: 'filtration · SGLT2', s: 0.8, side: 1 },
    bladder: { x: 640, y: 1040, ic: 'bladder', t: 'Vessie', sub: 'urines', s: 0.7, side: 1 },
    liver: { x: 1030, y: 200, ic: 'liver', t: 'Foie', sub: 'glycogène · néoglucogenèse' },
    muscle: { x: 1030, y: 520, ic: 'muscle', t: 'Muscle', sub: 'GLUT4' },
    fat: { x: 1030, y: 830, ic: 'fat', t: 'Tissu adipeux', sub: 'GLUT4 · lipolyse' },
    keto: { x: 1400, y: 200, box: [250, 96], t: 'Corps cétoniques' },
    pen: { x: 1400, y: 520, ic: 'pen', t: 'Insuline injectée', sub: '' }
  };
  // Liens : [départ, arrivée, courbure, étiquette, type] ; type : flux (molécules), stim (+), inhib (−), sig (signal).
  const LINKS = {
    eat: ['@meal', 'stomach', 0, 'repas', 'flow'],
    hunger: ['brain', 'stomach', -110, 'faim', 'sig'],
    ge: ['stomach', 'gut', 60, 'vidange', 'flow'],
    ra: ['gut', 'blood', -40, 'absorption', 'flow'],
    inc: ['gut', 'islet', 70, 'incrétines', 'stim'],
    sens: ['blood', 'islet', 40, '', 'stim'],
    insL: ['islet', 'liver', -50, 'insuline', 'inhib'],
    glu: ['islet', 'liver', 40, 'glucagon', 'stim'],
    insM: ['islet', 'muscle', -20, '', 'stim'],
    insF: ['islet', 'fat', 60, '', 'stim'],
    egp: ['liver', 'blood', -70, 'production hépatique', 'flow', 0.3],
    upM: ['blood', 'muscle', -30, 'captation', 'flow', 0.3],
    upF: ['blood', 'fat', 30, '', 'flow'],
    filt: ['blood', 'kidney', 0, '', 'flow'],
    ren: ['kidney', 'bladder', 0, 'glycosurie', 'flow'],
    ffa: ['fat', 'liver', -170, 'acides gras', 'flow', 0.35],
    ket: ['liver', 'keto', 0, '', 'flow'],
    exoL: ['pen', 'liver', 30, '', 'flow'],
    exoM: ['pen', 'muscle', 0, '', 'flow'],
    symp: ['brain', 'adrenal', -40, 'sympathique', 'sig'],
    adr: ['adrenal', 'liver', -30, 'adrénaline', 'stim'],
    cort: ['adrenal', 'liver', 40, 'cortisol', 'stim']
  };
  const NODE_R = 64;
  // « Comment ça marche ? » : pour chaque traitement, les organes cibles, les flux concernés et le mécanisme.
  const HOW = {
    met: { t: 'Metformine', ic: '💊', tog: 'met', nodes: ['liver', 'gut'], flows: ['egp', 'ra', 'inc'],
      how: 'Freine la production hépatique de glucose (néoglucogenèse : inhibition du complexe I mitochondrial, activation de l\'AMPK), surtout la nuit et à jeun ; augmente l\'utilisation intestinale du glucose et la sécrétion de GLP-1.',
      eff: 'HbA1c − 1 à − 1,5 % · poids neutre · pas d\'hypoglycémie seule.', ei: 'Troubles digestifs (augmenter par paliers, prendre au repas), carence en B12 ; contre-indiquée si DFG < 30 (acidose lactique), suspendre si déshydratation ou injection d\'iode.' },
    su: { t: 'Sulfamide', ic: '💊', tog: 'su', nodes: ['islet'], flows: ['insL', 'insM', 'insF'],
      how: 'Ferme les canaux potassiques ATP-dépendants (SUR1) de la cellule β : dépolarisation, entrée de calcium, sécrétion d\'insuline, même quand la glycémie est basse.',
      eff: 'HbA1c − 1 % · poids + 2 kg · effet qui s\'épuise avec la réserve β.', ei: 'Hypoglycémies (surtout sujet âgé, insuffisance rénale, repas sautés), parfois prolongées : surveillance hospitalière en cas d\'hypoglycémie sévère.' },
    dpp: { t: 'iDPP4 (gliptine)', ic: '💊', tog: 'dpp', nodes: ['gut', 'islet'], flows: ['inc', 'insL', 'glu'],
      how: 'Bloque la DPP-4, enzyme qui dégrade en quelques minutes le GLP-1 et le GIP libérés par l\'intestin : les incrétines endogènes actives augmentent (× 2 à 3), d\'où plus d\'insuline et moins de glucagon, seulement quand la glycémie est haute.',
      eff: 'HbA1c − 0,5 à − 0,8 % · poids neutre · pas d\'hypoglycémie seule.', ei: 'Bien toléré ; rares pancréatites, pemphigoïde bulleuse, douleurs articulaires.' },
    glp: { t: 'aGLP1', ic: '💉', tog: 'glp', nodes: ['brain', 'stomach', 'islet'], flows: ['hunger', 'ge', 'insL', 'glu', 'eat'],
      how: 'Agoniste du récepteur du GLP-1, résistant à la DPP-4 : sécrétion d\'insuline glucodépendante et glucagon freiné (îlots), vidange gastrique ralentie (estomac), satiété (hypothalamus) : repas plus petits, perte de poids.',
      eff: 'HbA1c − 1 à − 1,5 % · poids − 4 à − 6 kg (sémaglutide) · protection cardiovasculaire et rénale · pas d\'hypoglycémie seul.', ei: 'Nausées, vomissements, diarrhée (augmenter par paliers mensuels) ; contre-indiqué si antécédent de pancréatite ou de cancer médullaire de la thyroïde ; rétinopathie à surveiller si baisse rapide de l\'HbA1c.' },
    tirz: { t: 'Tirzépatide (GIP + GLP-1)', ic: '💉', tog: 'tirz', nodes: ['brain', 'stomach', 'islet', 'fat'], flows: ['hunger', 'ge', 'insL', 'glu', 'upF', 'eat'],
      how: 'Double agoniste GIP et GLP-1 : mêmes effets que l\'aGLP1, avec en plus l\'action du GIP sur la cellule β et le tissu adipeux (stockage, sensibilité à l\'insuline).',
      eff: 'HbA1c − 2 % · poids − 10 à − 12 kg (essais SURPASS).', ei: 'Troubles digestifs (paliers de 2,5 mg tous les mois) ; mêmes précautions que les aGLP1.' },
    sglt2: { t: 'iSGLT2 (gliflozine)', ic: '💊', tog: 'sglt2', nodes: ['kidney', 'bladder'], flows: ['filt', 'ren'],
      how: 'Bloque le cotransporteur SGLT2 du tube proximal, qui réabsorbe le glucose filtré : le seuil rénal baisse de 1,80 à environ 0,60–0,80 g/L, le patient « urine du sucre » (60 à 80 g/j, ≈ 250 kcal) et du sel.',
      eff: 'HbA1c − 0,5 à − 0,8 % (moins si DFG bas) · poids − 2 à − 3 kg · protection cardiaque (insuffisance cardiaque) et rénale, même à DFG bas.', ei: 'Mycoses génitales, déshydratation ; acidocétose à glycémie peu élevée (jeûne, chirurgie, insulinopénie) : suspendre les jours de maladie et avant une intervention.' },
    acarb: { t: 'Acarbose', ic: '💊', tog: 'acarb', nodes: ['gut'], flows: ['ge', 'ra'],
      how: 'Inhibe les alpha-glucosidases de la bordure en brosse : les glucides complexes sont digérés plus lentement, l\'absorption est retardée et le pic après le repas abaissé.',
      eff: 'HbA1c − 0,5 % · poids neutre.', ei: 'Flatulences, diarrhée ; en cas d\'hypoglycémie (avec d\'autres traitements), resucrer avec du glucose et non du sucre.' },
    basal: { t: 'Insuline basale', ic: '💉', tog: 'basal', nodes: ['pen', 'liver'], flows: ['exoL', 'egp'],
      how: 'Insuline lente (24 h et plus) injectée le soir ou le matin : freine surtout la production hépatique de glucose la nuit et entre les repas. Titrée sur la glycémie à jeun (par exemple + 2 U tous les 3 jours au-dessus de la cible). Sous pompe : débit de base programmé heure par heure.',
      eff: 'Abaisse la glycémie à jeun, effet dose-dépendant sans plafond.', ei: 'Hypoglycémies (surtout nocturnes), prise de poids ; au-delà de 0,5 U/kg, penser aux repas (sur-basalisation).' },
    bolus: { t: 'Insuline rapide (bolus)', ic: '💉', tog: 'bolus', nodes: ['pen', 'muscle', 'fat'], flows: ['exoM', 'upM', 'upF'],
      how: 'Analogue rapide injecté avant le repas (pic à 1 h, action 4 à 5 h) : fait capter le glucose du repas par le muscle et le tissu adipeux. Adapté sur la glycémie avant le repas suivant, ou sur les glucides (insulinothérapie fonctionnelle).',
      eff: 'Abaisse le pic après le repas.', ei: 'Hypoglycémie si repas plus petit, sauté, ou activité physique après le bolus.' },
    act: { t: 'Activité physique', ic: '🏃', tog: 'act', nodes: ['muscle'], flows: ['upM', 'insM'],
      how: 'La contraction fait migrer GLUT4 à la membrane sans insuline : captation du glucose pendant l\'effort, puis sensibilité à l\'insuline accrue pendant 24 à 48 h.',
      eff: 'HbA1c − 0,6 % avec 150 min par semaine · perte de poids modeste.', ei: 'Sous insuline ou sulfamide : hypoglycémie pendant ou après l\'effort (baisser la dose, collation).' },
    diet: { t: 'Diététique', ic: '🥗', tog: 'diet', nodes: ['brain', 'stomach', 'gut'], flows: ['hunger', 'eat', 'ge', 'ra'],
      how: 'Moins de glucides rapides et de calories : moins de glucose absorbé, perte de poids qui améliore la sensibilité à l\'insuline (foie, muscle) et soulage la cellule β.',
      eff: 'HbA1c − 0,5 à − 1 % ; rémission possible avec une perte de 10 à 15 kg (essai DiRECT).', ei: 'Sous insuline ou sulfamide, réduire les doses si les glucides baissent beaucoup ; un régime cétogène majore le risque d\'acidocétose sous iSGLT2.' }
  };
  const INFO = {
    adrenal: () => 'Surrénales : sous la commande du système sympathique (hypothalamus), la médullosurrénale libère l\'adrénaline quand la glycémie passe sous 0,70 g/L : glycogénolyse hépatique, lipolyse, freinage de la sécrétion d\'insuline, et signes adrénergiques (sueurs, tremblements, palpitations, faim, anxiété). La corticosurrénale libère le cortisol (néoglucogenèse, en quelques heures). Après des hypoglycémies répétées, cette réponse s\'émousse : hypoglycémies non ressenties.',
    brain: (k) => 'Hypothalamus : centre de la faim, et capteur de l\'hypoglycémie qui déclenche la contre-régulation (glucagon, adrénaline, cortisol). Le cerveau dépend du glucose : sous 0,50 g/L, signes neuroglucopéniques (troubles de la concentration, confusion, troubles du comportement, vision floue) ; sous 0,30 g/L dans ce module, hypoglycémie sévère (convulsions, coma). Centre de la faim : Les aGLP1 et le tirzépatide augmentent la satiété : repas plus petits, perte de poids' + (k.satiety > 0.01 ? ' (glucides du jour réduits d\'environ ' + Math.round(k.satiety * 50) + ' % ici)' : '') + '. Le suivi diététique agit aussi ici.',
    stomach: (k) => 'Vidange gastrique : le glucose du repas n\'arrive dans l\'intestin qu\'au rythme où l\'estomac se vide. Les aGLP1 la ralentissent (surtout le liraglutide, de courte durée ; effet qui s\'atténue avec les formes hebdomadaires) : pic post-prandial plus bas' + (k.glpF > 0.01 ? ' (vidange ' + Math.round((1 - k.kge / 1.4) * 100) + ' % plus lente)' : '') + '.',
    gut: (k) => 'Intestin : absorption des glucides. L\'acarbose inhibe les alpha-glucosidases : absorption retardée et un peu réduite (flatulences). Les cellules L (GLP-1) et K (GIP) sécrètent les incrétines au passage du repas ; l\'effet incrétine est diminué dans le DT2' + (k.dpp ? ' ; l\'iDPP4 double les incrétines actives (moins dégradées)' : '') + '.',
    beta: (k) => 'Cellules β : sécrétion d\'insuline glucodépendante, amplifiée par les incrétines. Réserve du patient : ' + Math.round(k.B * 100) + ' % d\'un sujet de référence (déclin avec les années, glucotoxicité). ' + (k.su ? 'Le sulfamide force la sécrétion même quand la glycémie est basse : risque d\'hypoglycémie. ' : '') + (k.glpF > 0.01 ? 'L\'aGLP1' + (k.isT ? ' et le GIP du tirzépatide' : '') + ' amplifient la sécrétion seulement quand la glycémie est haute (pas d\'hypoglycémie seul).' : ''),
    alpha: (k) => 'Cellules α : le glucagon fait produire du glucose au foie. Il est freiné par l\'insuline et par le GLP-1 ; dans le DT2, il reste mal freiné après les repas (hyperglucagonémie relative)' + (k.gluSup > 0.01 ? ' ; ici freiné de ' + Math.round(k.gluSup * 100) + ' % par ' + (k.glpF > 0.01 ? 'l\'aGLP1' : 'l\'iDPP4') : '') + '.',
    islet: (k) => INFO.beta(k) + ' ' + INFO.alpha(k),
    bladder: (k) => 'Vessie : les urines contiennent le glucose non réabsorbé par le rein (glycosurie), avec l\'eau qui l\'accompagne (polyurie osmotique, soif quand la glycémie est très haute). ' + (k.tm < 1.7 ? 'Sous iSGLT2, glycosurie permanente (60 à 80 g/j) : mycoses génitales possibles, hygiène locale.' : ''),
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
    hypo: (k, T) => 'Hypoglycémie (glycémie minimale ' + fmt(T.gMin, 2) + ' g/L) : sous 0,70 g/L, l\'hypothalamus déclenche la contre-régulation (glucagon, adrénaline des surrénales, puis cortisol) et les signes adrénergiques (sueurs, tremblements, palpitations, faim) ; sous 0,50 g/L, signes neuroglucopéniques. Resucrage : 15 g de sucre rapide (3 morceaux, 150 mL de jus), contrôle à 15 min, puis collation si le repas est loin ; chercher la cause (dose, repas, effort, alcool) et réduire la dose responsable.' + (k.rx.basal + (k.rx.pump || 0) + k.rx.rapid > 0 || k.su ? '' : ' Sans insuline ni sulfamide, une hypoglycémie est exceptionnelle : scénario théorique.'),
    hypoSev: (k, T) => 'Hypoglycémie sévère (' + fmt(T.gMin, 2) + ' g/L ; seuil de ce module 0,30 g/L, mais elle se définit par le besoin d\'un tiers et peut survenir dès 0,50–0,55 g/L) : convulsions, coma. Pas de resucrage oral si troubles de conscience : glucagon 1 mg IM/SC ou 3 mg intranasal par l\'entourage, G30 % IV par les secours, puis apport glucidique ; surveillance prolongée sous sulfamide (hypoglycémie récidivante, hospitalisation). Ensuite : arrêt du sulfamide, baisse de l\'insuline, cible d\'HbA1c relevée, éducation de l\'entourage (kit de glucagon), déclaration pour la conduite.',
    ill: (k, T) => 'Infection : hormones de stress, insulinorésistance, production hépatique accrue, cétose. Ne jamais arrêter l\'insuline (souvent l\'augmenter), glycémies et cétonémie rapprochées, hydratation ; suspendre iSGLT2 et metformine en cas de déshydratation (cétonémie ici jusqu\'à ' + fmt(T.ketMax, 1) + ' mmol/L).'
  };

  /* ---------- Molécules (glyphes inspirés de l'atlas, js/molecules-axes.js) ---------- */
  // Encombrement ≈ 14 unités ; couleur portée par la classe (variables du thème).
  const MOLS = [['food', 'aliments'], ['glc', 'glucose'], ['ins', 'insuline'], ['glu', 'glucagon'], ['inc', 'incrétines'], ['ffa', 'acides gras'], ['ket', 'cétone'], ['adr', 'adrénaline'], ['cort', 'cortisol']];
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
    g = el('g', { id: 'phm-food', class: 'phm phm-food' }, defs); // bol alimentaire (puis chyme) : masse arrondie, grains
    el('path', { d: 'M-7,-1 C-7,-6 -1,-7 3,-6 C8,-5 9,0 7,4 C5,7 -2,7 -5,5 C-7,4 -7,2 -7,-1 Z', class: 'phm-bolus' }, g);
    [[-3, -2], [2, -3], [4, 2], [-2, 3]].forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 1, class: 'phm-grain' }, g));
    g = el('g', { id: 'phm-ket', class: 'phm phm-ket' }, defs); // corps cétonique (acétoacétate, β-hydroxybutyrate)
    el('path', { d: 'M-6,2 L-3,-1 L0,2 L3,-1 L6,2', class: 'phm-zig' }, g);
    el('circle', { cx: -3, cy: -3.4, r: 1.4, class: 'phm-O' }, g); el('circle', { cx: 6.8, cy: 4, r: 1.4, class: 'phm-O' }, g);
    g = el('g', { id: 'phm-adr', class: 'phm phm-adr' }, defs); // adrénaline : catéchol (cycle, deux OH) et chaîne aminée
    const hv2 = hexV(4).map((q) => [q[0] - 3, q[1]]);
    el('path', { d: P(hv2), class: 'phm-ring' }, g);
    [4, 5].forEach((i) => { const q = hv2[i]; el('circle', { cx: q[0] * 1.5 + 1, cy: q[1] * 1.5, r: 1.2, class: 'phm-O' }, g); });
    el('path', { d: 'M' + hv2[2][0] + ',' + hv2[2][1] + ' L4,0 L7,3 L9,1', class: 'phm-zig' }, g);
    el('circle', { cx: 9.4, cy: 1, r: 1.3, class: 'phm-N' }, g);
    g = el('g', { id: 'phm-cort', class: 'phm phm-cort' }, defs); // cortisol : noyau stéroïde (quatre cycles accolés)
    const r6 = hexV(3);
    [[-7, 1.5], [-2, -1.5], [3, 1.5]].forEach(([x, y]) => el('path', { d: P(r6.map((q) => [q[0] + x, q[1] + y])), class: 'phm-ring' }, g));
    el('path', { d: 'M6,0 L9,-2.5 L11,0.5 L9,3.5 Z', class: 'phm-ring' }, g);
    el('circle', { cx: -10, cy: 3, r: 1.2, class: 'phm-O' }, g);
  }
  // Molécule portée par chaque flux.
  const FLOW_MOL = { eat: 'food', ge: 'food', ra: 'glc', inc: 'inc', insL: 'ins', insM: 'ins', glu: 'glu', egp: 'glc', upM: 'glc', upF: 'glc', ren: 'glc', exoL: 'ins', exoM: 'ins', ffa: 'ffa', ket: 'ket', adr: 'adr', cort: 'cort', insF: 'ins', filt: 'glc', sens: 'glc' }; // la faim (cerveau → estomac) n'est pas un flux de molécules

  // Lisibilité : on n'affiche en clair que les flux de l'organe sélectionné (ou d'un thème) ; les autres s'estompent.
  const ORG_FLOWS = {
    brain: ['hunger', 'symp', 'eat'], adrenal: ['symp', 'adr', 'cort'], liver: ['ra', 'egp', 'insL', 'glu', 'exoL', 'adr', 'cort', 'ffa', 'ket'], fat: ['upF', 'insF', 'ffa'],
    keto: ['ffa', 'ket'], pen: ['exoL', 'exoM'], blood: ['ra', 'egp', 'upM', 'upF', 'filt', 'sens'], stomach: ['eat', 'ge', 'hunger'],
    islet: ['insL', 'insM', 'insF', 'inc', 'glu', 'sens'], gut: ['ge', 'ra', 'inc'], kidney: ['filt', 'ren'], bladder: ['ren'], muscle: ['upM', 'insM', 'exoM']
  };
  const LAYERS = [
    ['focus', 'Flux de l\'organe sélectionné'],
    ['meal', 'Repas : faim, digestion, absorption, incrétines', ['hunger', 'eat', 'ge', 'ra', 'inc']],
    ['ins', 'Hormones du pancréas et insuline injectée', ['insL', 'insM', 'insF', 'glu', 'inc', 'exoL', 'exoM', 'sens']],
    ['glc', 'Trajet du glucose (entrées et sorties)', ['ra', 'egp', 'upM', 'upF', 'filt', 'ren']],
    ['lip', 'Graisses et cétones', ['ffa', 'ket', 'upF']],
    ['hypo', 'Contre-régulation de l\'hypoglycémie', ['symp', 'adr', 'cort', 'glu', 'egp']],
    ['all', 'Tous les flux (vue complète)']
  ];
  function el(tag, a, par) { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (par) par.appendChild(n); return n; }

  /* ---------- Médaillons des organes (dessins de l'atlas, js/organs.js) ---------- */
  const mirrorX = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, x, y) => -parseFloat(x) + ',' + y);
  function drawIcon(gg, ic) {
    const solid = (d, cls, par) => { el('path', { d, class: 'phb-org ' + cls }, par || gg); el('path', { d, class: 'phb-shine', fill: 'url(#phShine)' }, par || gg); };
    const line = (d, cls) => el('path', { d, class: cls || 'phb-gyrus' }, gg);
    if (ic === 'brain') {
      solid('M -44,6 C -48,-18 -30,-38 -4,-40 C 22,-42 44,-28 46,-6 C 48,6 42,14 32,14 C 28,22 18,24 10,20 C 0,26 -16,26 -22,18 C -34,20 -44,16 -44,6 Z', 'o-brain');
      solid('M 18,16 C 24,10 40,12 42,22 C 42,32 26,36 18,30 C 14,26 14,20 18,16 Z', 'o-cerebellum');
      line('M -30,8 C -14,0 4,2 18,-6 M 4,-38 C -2,-24 8,-14 2,-2 M -30,-24 C -20,-18 -24,-8 -14,-6 M 20,-30 C 28,-22 22,-12 32,-8');
      el('ellipse', { cx: -2, cy: 14, rx: 9, ry: 5, class: 'phb-org o-hypo' }, gg);
    } else if (ic === 'stomach') {
      el('path', { d: 'M -14,-44 C -14,-34 -10,-28 -6,-22', class: 'phb-tube' }, gg);
      solid('M -10,-24 C 4,-34 26,-26 28,-6 C 30,16 12,32 -8,30 C -22,28 -30,20 -32,12 C -18,14 -10,6 -12,-4 C -14,-12 -16,-18 -10,-24 Z', 'o-stomach');
      el('path', { d: 'M -32,12 C -36,22 -34,32 -26,38', class: 'phb-tube' }, gg);
    } else if (ic === 'gut') {
      solid('M -40,-30 C -40,-40 40,-40 40,-30 L 40,30 C 40,40 -40,40 -40,30 Z', 'o-colon');
      solid('M -28,-18 C -10,-30 10,-6 28,-18 C 34,-6 18,4 28,16 C 10,26 -10,4 -28,16 C -34,4 -18,-6 -28,-18 Z', 'o-small');
      line('M -20,-12 C -6,-20 8,-2 22,-12 M -22,10 C -6,0 8,18 22,8', 'phb-fiber');
    } else if (ic === 'islet') {
      solid('M -46,8 C -46,-6 -26,-10 -10,-6 C 10,-2 30,-14 44,-8 C 52,-2 42,10 26,12 C 8,14 -14,22 -32,20 C -42,19 -46,14 -46,8 Z', 'o-pancreas');
      el('circle', { cx: 6, cy: -24, r: 20, class: 'phb-isletc' }, gg);
      [[0, -30, 'b'], [10, -30, 'b'], [4, -20, 'b'], [14, -20, 'a'], [-4, -20, 'a'], [8, -38, 'a'], [-6, -30, 'b'], [16, -28, 'b']].forEach(([x, y, t]) => el('circle', { cx: x, cy: y, r: 3.6, class: 'phb-islet-' + t }, gg));
    } else if (ic === 'liver') {
      solid('M -50,-6 C -48,-26 -18,-34 10,-30 C 30,-28 48,-22 52,-14 C 54,-8 42,-4 28,2 C 12,10 -6,22 -22,26 C -38,30 -50,18 -50,-6 Z', 'o-liver');
      solid('M -16,16 C -14,30 -2,32 0,24 C 0,18 -8,13 -16,16 Z', 'o-gall');
    } else if (ic === 'muscle') {
      el('path', { d: 'M -52,0 L -34,0 M 34,0 L 52,0', class: 'phb-tendon' }, gg);
      solid('M -36,0 C -26,-20 26,-20 36,0 C 26,20 -26,20 -36,0 Z', 'o-muscle');
      line('M -28,-6 C -10,-12 10,-12 28,-6 M -30,0 L 30,0 M -28,6 C -10,12 10,12 28,6', 'phb-fiber');
    } else if (ic === 'fat') {
      [[-20, -12, 15], [8, -18, 14], [26, 4, 14], [-2, 10, 15], [-26, 14, 12]].forEach(([x, y, r]) => { el('circle', { cx: x, cy: y, r, class: 'phb-org o-fat' }, gg); el('circle', { cx: x, cy: y, r, class: 'phb-shine', fill: 'url(#phShine)' }, gg); });
    } else if (ic === 'kidney') {
      solid('M -6,-40 C 18,-46 34,-22 34,0 C 34,26 16,46 -6,40 C -22,36 -14,16 -6,8 C -14,0 -14,-8 -6,-12 C -16,-20 -24,-34 -6,-40 Z', 'o-kidney');
      el('path', { d: 'M -10,2 C -22,4 -30,10 -34,22', class: 'phb-ureter' }, gg);
    } else if (ic === 'adrenal') {
      const k = el('g', { transform: 'translate(0 16) scale(0.78)' }, gg);
      solid('M -6,-40 C 18,-46 34,-22 34,0 C 34,26 16,46 -6,40 C -22,36 -14,16 -6,8 C -14,0 -14,-8 -6,-12 C -16,-20 -24,-34 -6,-40 Z', 'o-kidney', k);
      solid('M -26,-12 C -24,-30 -6,-46 8,-44 C 20,-42 26,-28 22,-14 C 10,-8 -12,-6 -26,-12 Z', 'o-adrenal');
    } else if (ic === 'bladder') {
      el('path', { d: 'M -22,-44 C -20,-30 -16,-24 -12,-18 M 22,-44 C 20,-30 16,-24 12,-18', class: 'phb-ureter' }, gg);
      solid('M -30,-6 C -32,-26 -12,-24 0,-22 C 12,-24 32,-26 30,-6 C 28,16 14,30 0,30 C -14,30 -28,16 -30,-6 Z', 'o-bladder');
      el('path', { d: 'M -4,30 L -4,42 M 4,30 L 4,42', class: 'phb-ureter' }, gg);
    }
  }

  // Stylo d'insuline (injection animée) ou pompe avec sa tubulure, au site d'injection abdominal (74, 30).
  function drawPen(svg, rx, tr) {
    const grp = el('g', { class: 'ph-penG', transform: tr || '' }, svg);
    if (rx.pump > 0) {
      el('path', { d: 'M150,8 C130,30 110,40 76,32', class: 'ph-tubing' }, grp);
      el('rect', { x: 146, y: -14, width: 40, height: 28, rx: 6, class: 'ph-pump' }, grp);
      el('rect', { x: 151, y: -9, width: 22, height: 12, rx: 2, class: 'ph-pump-scr' }, grp);
      const lab = el('text', { x: 166, y: 28, class: 'ph-pen-lab', 'text-anchor': 'middle' }, grp);
      return { grp, pump: true, lab };
    }
    if (!(rx.basal > 0 || rx.rapid > 0)) return null;
    // Stylo orienté vers le site d'injection ; inner se déplace le long de l'axe (piqûre), plunger s'enfonce.
    const axis = el('g', { transform: 'translate(74 30) rotate(-32) scale(1.6)' }, grp);
    const inner = el('g', {}, axis);
    el('line', { x1: 0, y1: 0, x2: 10, y2: 0, class: 'ph-needle' }, inner);
    el('rect', { x: 10, y: -5, width: 12, height: 10, rx: 2, class: 'ph-pen-tip' }, inner);
    el('rect', { x: 22, y: -6, width: 46, height: 12, rx: 4, class: 'ph-pen-body' }, inner);
    el('rect', { x: 34, y: -3.5, width: 14, height: 7, rx: 1.5, class: 'ph-pen-win' }, inner);
    const plunger = el('rect', { x: 68, y: -4, width: 12, height: 8, rx: 2, class: 'ph-pen-plunger' }, inner);
    const lab = el('text', { x: 96, y: 92, class: 'ph-pen-lab' }, grp);
    return { grp, inner, plunger, lab };
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
    const svg = el('svg', { viewBox: '0 0 1600 1110', class: 'ph-svg px-svg', role: 'img', 'aria-label': 'Physiologie du glucose du patient' });
    const chart = el('svg', { viewBox: '0 0 760 230', class: 'ph-chart', role: 'img', 'aria-label': 'Courbes de 24 heures' });
    const info = h('div', { class: 'ph-info', id: 'dtPhInfo' });
    const tLab = h('strong', { class: 'ph-time' });
    const slowLab = h('span', { class: 'ph-slow', id: 'dtPhSlowLab' });
    const slider = h('input', { type: 'range', min: 0, max: 23.9, step: 0.1, value: st.t, class: 'sv-range', id: 'dtPhT', 'aria-label': 'Heure de la journée', oninput: (e) => { st.t = +e.target.value; frame(); } });
    const playBtn = h('button', { type: 'button', class: 'sv-secondary', id: 'dtPhPlay', onclick: () => { st.play = !st.play; playBtn.textContent = st.play ? '⏸ Pause' : '▶ Lecture'; if (st.play) requestAnimationFrame(loop); } }, st.play ? '⏸ Pause' : '▶ Lecture');
    const sum = h('div', { class: 'ph-sum', id: 'dtPhSum' });
    const howBox = h('div', { class: 'px-howbox', id: 'dtPhHow', hidden: true });
    const howBar = h('div', { class: 'px-howbar', role: 'toolbar', 'aria-label': 'Comment fonctionnent les traitements' });
    function showHow() {
      howBar.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.how === st.how));
      howBox.hidden = !st.how; howBox.textContent = '';
      if (!st.how) return;
      const H0 = HOW[st.how], T0 = TOG.find((x) => x[0] === H0.tog), on = T0 && T0[2](pt.rx);
      howBox.append(
        h('div', { class: 'px-howhead' }, [h('strong', null, H0.ic + ' ' + H0.t + ' : comment ça marche ?'), h('button', { type: 'button', class: 'sv-linkbtn', onclick: () => { st.how = null; showHow(); applyFocus(); } }, 'Fermer')]),
        h('p', null, H0.how), h('p', null, [h('b', null, 'Effet : '), H0.eff]), h('p', null, [h('b', null, 'Points de vigilance : '), H0.ei]),
        h('p', { class: 'sv-note' }, 'Organes cibles entourés et flux concernés en clair sur le schéma.'),
        ctx.train || !T0 ? null : h('button', { type: 'button', class: 'sv-primary', id: 'dtPhHowTry', onclick: () => { T0[3](pt.rx, !on); const cb = document.getElementById('dtPh-' + T0[0]); if (cb) cb.checked = !on; compute(); draw(); showHow(); } }, on ? 'Retirer du patient' : 'Essayer sur le patient'));
    }
    Object.entries(HOW).forEach(([key, H0]) => howBar.append(h('button', { type: 'button', class: 'px-howbtn', 'data-how': key, onclick: () => { st.how = st.how === key ? null : key; showHow(); applyFocus(); } }, [h('span', { 'aria-hidden': 'true' }, H0.ic), ' ' + H0.t])));
    const symBox = h('div', { class: 'ph-sym', id: 'dtPhSym', role: 'status' });
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
    const legend = el('svg', { viewBox: '0 0 830 36', class: 'ph-legend', role: 'img', 'aria-label': 'Légende des molécules' });
    let lx = 22; MOLS.forEach(([m, t]) => { const x = lx; lx += 46 + 8.4 * t.length; el('use', { href: '#phm-' + m, transform: 'translate(' + x + ',18) scale(1.7)' }, legend); el('text', { x: x + 19, y: 23, class: 'ph-ax ph-legt' }, legend).textContent = t; });
    legend.setAttribute('viewBox', '0 0 ' + Math.round(lx) + ' 36');
    root.append(
      h('div', { class: 'sv-card-head' }, [h('h3', null, 'Physiologie du patient : ce que font les traitements'), h('div', { class: 'sv-actions' }, [fullBtn, h('button', { type: 'button', class: 'sv-secondary', onclick: () => { setFull(false); onClose(); } }, 'Fermer')])]),
      h('div', { class: 'px-howwrap' }, [h('p', { class: 'px-howlab' }, 'Comment ça marche ?'), howBar, howBox]),
      h('p', { class: 'sv-muted' }, 'Copie du patient (le dossier n\'est pas modifié). La glycémie est celle du patient simulé ; le module la décompose organe par organe. Cliquez sur un organe. Modifiez les traitements, puis faites avancer le temps.'),
      ctx.train ? h('p', { class: 'sv-note ph-trainnote' }, 'Mode entraînement : le module montre la physiologie du traitement en cours ; les essais de traitements, l\'avance dans le temps et les prédictions sont masqués jusqu\'à la fin de l\'entraînement.') : h('div', { class: 'ph-tog' }, TOG.map(([id, lab, isOn, set]) => h('label', { class: 'sv-chipcheck' }, [h('input', { type: 'checkbox', id: 'dtPh-' + id, checked: isOn(pt.rx), onchange: (e) => { set(pt.rx, e.target.checked); if (id === 'glp' && e.target.checked) document.getElementById('dtPh-tirz').checked = false; if (id === 'tirz' && e.target.checked) document.getElementById('dtPh-glp').checked = false; compute(); draw(); } }), ' ' + lab]))),
      h('div', { class: 'ph-evrow' }, [h('label', { for: 'dtPhLay' }, 'Afficher'), h('select', { id: 'dtPhLay', onchange: (e) => { st.layer = e.target.value; applyFocus(); } }, LAYERS.map(([k2, t]) => h('option', { value: k2, selected: (st.layer || 'focus') === k2 }, t)))]),
      h('div', { class: 'ph-evrow' }, [h('label', { for: 'dtPhEv' }, 'Événement de la journée'), h('select', { id: 'dtPhEv', onchange: (e) => { st.ev = e.target.value; if (/^hypo/.test(st.ev) && (st.layer || 'focus') === 'focus') st.sel = 'adrenal'; compute(); draw(); } }, EVENTS.map(([k2, t]) => h('option', { value: k2, selected: (st.ev || 'none') === k2 }, t)))]),
      h('div', { class: 'ph-ctrl' }, [playBtn,
        h('select', { id: 'dtPhSpeed', 'aria-label': 'Vitesse', onchange: (e) => { st.speed = +e.target.value; } }, [[1, '1 h/s'], [2, '2 h/s'], [6, '6 h/s']].map(([v, t]) => h('option', { value: v, selected: st.speed === v }, t))),
        slider, tLab, slowLab,
        h('label', { class: 'sv-chipcheck', title: 'Le temps défile plus lentement pendant les 3 h qui suivent un repas et pendant une hypoglycémie' }, [h('input', { type: 'checkbox', id: 'dtPhSlow', checked: st.slow !== false, onchange: (e) => { st.slow = e.target.checked; frame(); } }), ' Ralentir aux moments clés']),
        h('span', { class: 'ph-sep' }),
        ...(ctx.train ? [] : [
          h('button', { type: 'button', class: 'sv-secondary', id: 'dtPhD1', onclick: () => advance(1) }, '+1 jour'),
          h('button', { type: 'button', class: 'sv-secondary', id: 'dtPhW1', onclick: () => advance(7) }, '+1 semaine'),
          h('button', { type: 'button', class: 'sv-secondary', id: 'dtPhW4', onclick: () => advance(28) }, '+4 semaines'),
          h('button', { type: 'button', class: 'sv-secondary', id: 'dtPhPred', onclick: predict }, '🔮 Prédire à 6 mois'),
          h('button', { type: 'button', class: 'sv-linkbtn', onclick: () => { reset(); compute(); ctx.rerender(); } }, 'Revenir au patient')])
      ]),
      symBox,
      h('div', { class: 'ph-grid' }, [h('div', { class: 'ph-diag' }, [svg, legend]), h('div', { class: 'ph-side' }, [info, sum, h('div', { class: 'ph-predcol' }, [pred, h('div', { class: 'ph-trendbox' }, trend)])])]),
      h('div', { class: 'ph-chartbox' }, chart),
      h('p', { class: 'sv-note' }, 'Mécanismes : modèle « glyc » de l\'atlas enrichi des effets pharmacologiques (complément) ; la captation par le muscle et le tissu adipeux est calculée par bilan de masse. Chaque journée reprend la glycémie moyenne du modèle DT2, calé sur les essais.')
    );

    const g = {};
    function draw() {
      svg.textContent = ''; chart.textContent = '';
      const k = st.res.k;
      const defs = el('defs', {}, svg);
      buildMols(defs);
      ['g', 'i', 'x', 'n', 'u', 'k', 'f', 'a'].forEach((c) => { const m = el('marker', { id: 'phA' + c, viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 20, markerHeight: 20, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs); el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'ph-ah ph-' + c }, m); });
      if (!NODES[st.sel]) st.sel = 'blood';
      const sh = el('radialGradient', { id: 'phShine', cx: '35%', cy: '30%', r: '75%' }, defs);
      [[0, '#fff', 0.45], [0.55, '#fff', 0.08], [1, '#000', 0.18]].forEach(([o, c, op]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }, sh));
      // Liens (sous les médaillons), avec leur signe (+ / −) et leur étiquette.
      const P = (id) => (id === '@meal' ? { x: 30, y: 440, r: 4 } : Object.assign({ r: NODES[id].box ? Math.max(...NODES[id].box) / 2 - 10 : NODE_R * (NODES[id].s || 1) + 4 }, NODES[id]));
      const edge = (n, c) => { const dx = c[0] - n.x, dy = c[1] - n.y, L = Math.hypot(dx, dy) || 1; let r = n.r; if (n.box) r = Math.min(Math.abs(n.box[0] / 2 / (dx / L || 1e-6)), Math.abs(n.box[1] / 2 / (dy / L || 1e-6))) + 6; return [n.x + dx / L * r, n.y + dy / L * r]; };
      const linkG = el('g', { class: 'px-links' }, svg), pillG = el('g', { class: 'px-pills' });
      g.signs = {};
      Object.entries(LINKS).forEach(([id, [a, b, bend, lab, kind, labAt]]) => {
        const A = P(a), B = P(b), cdx = B.x - A.x, cdy = B.y - A.y, cL = Math.hypot(cdx, cdy) || 1, nx = -cdy / cL, ny = cdx / cL;
        const p0 = edge(A, [A.x + cdx / 3 + nx * bend, A.y + cdy / 3 + ny * bend]), p3 = edge(B, [A.x + 2 * cdx / 3 + nx * bend, A.y + 2 * cdy / 3 + ny * bend]);
        const dx = p3[0] - p0[0], dy = p3[1] - p0[1];
        const p1 = [p0[0] + dx / 3 + nx * bend, p0[1] + dy / 3 + ny * bend], p2 = [p0[0] + 2 * dx / 3 + nx * bend, p0[1] + 2 * dy / 3 + ny * bend];
        const d = 'M' + p0.map((v) => v.toFixed(1)).join(',') + ' C' + [p1, p2, p3].map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ');
        const cls = { eat: 'f', ge: 'f', hunger: 'n', inc: 'i', insL: 'i', insM: 'i', insF: 'i', glu: 'n', ren: 'u', filt: 'g', exoL: 'x', exoM: 'x', ffa: 'k', ket: 'k', symp: 'n', adr: 'a', cort: 'a' }[id] || 'g';
        g[id] = el('path', { d, class: 'ph-flow px-flow ph-' + cls + (kind === 'sig' ? ' px-sig' : ''), 'marker-end': kind === 'flow' || kind === 'sig' ? 'url(#phA' + cls + ')' : '' }, linkG);
        const at = (t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };
        if (kind === 'stim' || kind === 'inhib') {
          const q = at(0.9), sg = el('g', { class: 'px-sign ' + kind, transform: 'translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')' }, pillG);
          el('circle', { r: 15 }, sg); el('path', { d: kind === 'inhib' ? 'M-7,0 H7' : 'M-7,0 H7 M0,-7 V7' }, sg);
          g.signs[id] = sg;
        }
        if (lab) {
          const q = at(labAt || 0.5), w = 18 + lab.length * 9.6, pg = el('g', { class: 'px-pill ph-' + cls, transform: 'translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')' }, pillG);
          el('rect', { x: -w / 2, y: -15, width: w, height: 30, rx: 15 }, pg); el('text', { y: 6, 'text-anchor': 'middle' }, pg).textContent = lab;
          g['p_' + id] = pg;
        }
      });
      g.mols = el('g', { class: 'ph-mols' }, svg);
      // Médaillons.
      Object.entries(NODES).forEach(([id, n]) => {
        const grp = el('g', { class: 'px-node' + (st.sel === id ? ' sel' : ''), tabindex: 0, role: 'button', 'aria-label': n.t, 'data-node': id }, svg);
        grp.addEventListener('click', () => { st.sel = id; st.how = null; draw(); });
        grp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); st.sel = id; st.how = null; draw(); } });
        g['n_' + id] = grp;
        if (n.box) {
          const [w, hh] = n.box;
          const box = el('rect', { x: n.x - w / 2, y: n.y - hh / 2, width: w, height: hh, rx: hh / 2, class: 'px-box px-box-' + id }, grp);
          el('text', { x: n.x, y: n.y - hh / 2 + 34, class: 'px-lbl', 'text-anchor': 'middle' }, grp).textContent = n.t;
          g['v_' + id] = el('text', { x: n.x, y: n.y - hh / 2 + 68, class: 'px-v' + (id === 'blood' ? ' px-big' : ''), 'text-anchor': 'middle' }, grp);
          g['s_' + id] = el('text', { x: n.x, y: n.y + hh / 2 + 26, class: 'px-sub', 'text-anchor': 'middle' }, grp);
          if (id === 'blood') {
            // Jauge : 0,4 à 3 g/L, zone cible 0,70–1,80, aiguille de la glycémie à l'heure affichée.
            const gx = n.x - w / 2 + 30, gw = w - 60, gy = n.y + hh / 2 - 26, X = (v) => gx + (Math.min(3, Math.max(0.3, v)) - 0.3) / 2.7 * gw;
            el('rect', { x: gx, y: gy, width: gw, height: 10, rx: 5, class: 'px-gbg' }, grp);
            el('rect', { x: X(0.7), y: gy, width: X(1.8) - X(0.7), height: 10, class: 'px-gok' }, grp);
            g.needle = el('path', { d: 'M0,-2 L8,-14 L-8,-14 Z', class: 'px-needle' }, grp); g.gX = X; g.gy = gy;
            g.bloodC = box;
          }
          return;
        }
        const sc = n.s || 1;
        el('circle', { cx: n.x, cy: n.y, r: NODE_R * sc, class: 'px-halo px-h-' + id }, grp);
        if (n.ic === 'pen') { el('text', { x: n.x, y: n.y + 14, class: 'px-penic', 'text-anchor': 'middle' }, grp).textContent = k.rx.pump > 0 ? '' : '💉'; }
        else drawIcon(el('g', { transform: 'translate(' + n.x + ' ' + n.y + ') scale(' + (1.15 * sc) + ')' }, grp), n.ic);
        const lx = n.side ? n.x + NODE_R * sc + 18 : n.x, ly = n.side ? n.y - 6 : n.y + NODE_R * sc + 30, anc = n.side ? 'start' : 'middle';
        el('text', { x: lx, y: ly, class: 'px-lbl', 'text-anchor': anc }, grp).textContent = n.t;
        g['v_' + id] = el('text', { x: lx, y: ly + 26, class: 'px-v', 'text-anchor': anc }, grp);
        g['s_' + id] = el('text', { x: lx, y: ly + 50, class: 'px-sub', 'text-anchor': anc }, grp);
      });
      svg.appendChild(pillG);
      g.pen = drawPen(svg, k.rx, 'translate(' + (NODES.pen.x - 74 * 1.5 - 70) + ' ' + (NODES.pen.y - 30 * 1.5 + 10) + ') scale(1.5)');
      // Signes cliniques de l'hypoglycémie autour du cerveau (sueurs, confusion, coma) et du muscle (tremblements).
      const sy = el('g', { class: 'ph-symG' }, svg), B0 = NODES.brain, M0 = NODES.muscle;
      g.sweat = el('g', { class: 'ph-sweat' }, sy);
      [[-58, -40], [52, -46], [-70, 6], [66, 2], [-6, -74]].forEach(([dx, dy]) => { const x = B0.x + dx, y = B0.y + dy; el('path', { d: 'M' + x + ',' + (y - 9) + ' C' + (x + 6) + ',' + (y - 1) + ' ' + (x + 6) + ',' + (y + 6) + ' ' + x + ',' + (y + 6) + ' C' + (x - 6) + ',' + (y + 6) + ' ' + (x - 6) + ',' + (y - 1) + ' ' + x + ',' + (y - 9) + ' Z', class: 'ph-drop' }, g.sweat); });
      g.tremor = el('g', { class: 'ph-tremor' }, sy);
      [-1, 1].forEach((sx) => el('path', { d: 'M' + (M0.x + sx * 76) + ',' + (M0.y - 20) + ' l' + sx * 8 + ',8 l' + -sx * 8 + ',8 l' + sx * 8 + ',8 l' + -sx * 8 + ',8', class: 'ph-trem' }, g.tremor));
      g.neuro = el('text', { x: B0.x + 70, y: B0.y - 40, class: 'ph-neuro' }, sy); g.neuro.textContent = '?';
      g.coma = el('text', { x: B0.x - 110, y: B0.y - 50, class: 'ph-coma' }, sy); g.coma.textContent = 'z z';
      // Horloge de la journée (comme l'atlas).
      const cg = el('g', { class: 'px-clock', transform: 'translate(1290 1000)' }, svg);
      el('circle', { r: 44, class: 'px-cface' }, cg);
      el('path', { d: 'M 0,-44 A 44,44 0 0 1 0,44 Z', class: 'px-cday', transform: 'rotate(-90)' }, cg);
      for (let i = 0; i < 24; i += 3) { const an = i / 24 * 2 * Math.PI - Math.PI / 2; el('line', { x1: Math.cos(an) * 36, y1: Math.sin(an) * 36, x2: Math.cos(an) * 42, y2: Math.sin(an) * 42, class: 'px-ctick' }, cg); }
      g.hand = el('line', { x1: 0, y1: 0, x2: 0, y2: -34, class: 'px-chand' }, cg);
      g.ctxt = el('text', { x: 62, y: 9, class: 'px-ct' }, cg);
      // Médicaments : badges sur le médaillon de leur organe cible.
      const rx = k.rx, badges = {};
      const add = (id, txt, cls) => (badges[id] = badges[id] || []).push([txt, cls]);
      if (rx.met > 0) add('liver', 'metformine', 'met');
      if (rx.su > 0) add('islet', 'sulfamide', 'su');
      if (rx.dpp4 > 0) { add('gut', 'iDPP4', 'dpp'); add('islet', 'iDPP4', 'dpp'); }
      if (k.glpF > 0.01) { const n = rx.glp === 'tirz' ? 'tirzépatide' : 'aGLP1'; add('brain', n, 'glp'); add('stomach', n, 'glp'); add('islet', n, 'glp'); if (rx.glp === 'tirz') add('fat', 'GIP', 'glp'); }
      if (rx.sglt2 !== 'none') add('kidney', 'iSGLT2', 'sglt');
      if (rx.acarb > 0) add('gut', 'acarbose', 'acarb');
      if (rx.act >= 150) add('muscle', 'activité', 'life');
      if (rx.diet) add('brain', 'diététique', 'life');
      if (st.res.tot.ketMax > 0.6) add('keto', st.res.tot.ketMax > 1.5 ? 'risque d\'acidocétose' : 'cétose', 'ket');
      if (rx.basal > 0 || rx.pump > 0 || rx.rapid > 0) add('pen', rx.pump > 0 ? 'pompe' : (rx.basal > 0 ? 'basale' : '') + (rx.basal > 0 && rx.rapid > 0 ? ' + ' : '') + (rx.rapid > 0 ? 'bolus' : ''), 'ins');
      Object.entries(badges).forEach(([id, list]) => {
        const n = NODES[id], x0 = n.box ? n.x + n.box[0] / 2 - 20 : n.x + NODE_R * (n.s || 1) * 0.55, y0 = n.box ? n.y - n.box[1] / 2 - 4 : n.y - NODE_R * (n.s || 1) * 0.8;
        list.forEach(([txt, cls], i) => { const w = 9.4 * txt.length + 20, y = y0 - i * 30; el('rect', { x: x0, y: y - 13, width: w, height: 26, rx: 13, class: 'ph-pill px-badge ph-pill-' + cls }, svg); el('text', { x: x0 + w / 2, y: y + 6, class: 'ph-pt px-badge-t', 'text-anchor': 'middle' }, svg).textContent = txt; });
      });
      applyFocus();
      drawChart();
      drawSum();
      frame();
    }

    // Flux en clair (thème ou organe sélectionné), les autres estompés et sans molécules ; repères de l'organe.
    const PATHS0 = () => LINKS;
    function applyFocus() {
      const lay = st.layer || 'focus', L0 = LAYERS.find((x) => x[0] === lay);
      let on = lay === 'all' ? null : new Set(lay === 'focus' ? ORG_FLOWS[st.sel] || [] : L0[2]);
      st.on = on;

      const how = st.how && HOW[st.how];
      if (how) { st.on = on = new Set(how.flows); }
      Object.keys(PATHS0()).forEach((id) => { if (g[id]) g[id].classList.toggle('dim', !!on && !on.has(id)); [g['p_' + id], g.signs && g.signs[id]].forEach((e) => e && e.classList.toggle('dim', !!on && !on.has(id))); });
      svg.querySelectorAll('.px-node').forEach((n) => n.classList.toggle('how', !!how && how.nodes.includes(n.dataset.node)));
    }

    function drawChart() {
      const P = st.res.pts, L = 44, R = 50, T = 14, H = 150, Wc = 760;
      const X = (t) => L + (Wc - L - R) * t / 24;
      const gmin = Math.min(0.4, ...P.map((q) => q.G - 0.05)), gmax = Math.max(2.6, ...P.map((q) => q.G)) + 0.2, Yg = (v) => T + H * (1 - (v - gmin) / (gmax - gmin));
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
      [0.5, 0.3].forEach((v) => { if (P.some((q) => q.G < v + 0.1)) { el('line', { x1: L, x2: Wc - R, y1: Yg(v), y2: Yg(v), class: 'ph-thr' }, chart); el('text', { x: L - 5, y: Yg(v) + 4, class: 'ph-ax', 'text-anchor': 'end' }, chart).textContent = fmt(v, 1); } });
      if (st.ev === 'hypoSev') el('text', { x: X(15.3), y: T + 24, class: 'ph-meal', 'text-anchor': 'middle' }, chart).textContent = '💉';
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
      const sl = slowAt(st.t);
      slowLab.textContent = sl < 1 ? (sl < 0.3 ? '🐢 ralenti (hypoglycémie)' : '🐢 ralenti (repas)') : '';
      slider.value = st.t;
      const txt0 = (id, v) => { if (g[id]) g[id].textContent = v; };
      const Wd = (v, max) => Math.max(2.5, Math.min(22, 2.5 + 19 * v / max));
      const set = (id, v, max) => { const p = g[id]; if (!p) return; p.setAttribute('stroke-width', Wd(v, max).toFixed(1)); p.style.animationDuration = Math.max(0.35, 2.4 / Math.max(0.15, v / max)).toFixed(2) + 's'; p.classList.toggle('idle', v < max * 0.03); st.flux = st.flux || {}; st.flux[id] = v < max * 0.03 ? 0 : Math.min(1.5, v / max); };
      set('eat', q.eat, 150); set('ge', q.ge, 40); set('ra', q.ra, 40); set('inc', q.inc, 1.5); set('insL', q.isec, 6); set('insM', q.isec, 6); set('insF', q.isec, 6); set('glu', q.glu, 2); set('sens', Math.max(0, q.G - 0.6), 2); set('filt', q.G, 3);
      set('egp', q.egp, 25); set('upM', q.up * 0.75, 30); set('upF', q.up * 0.25, 30); set('ren', q.ren, 6); set('exoL', q.iexo, 4); set('exoM', q.iexo, 4); set('ffa', q.lip, 1); set('ket', q.ket, 1.5); set('hunger', 0.25 * (1 - k.satiety) + (q.G < 0.7 ? 0.5 : 0), 1);
      set('symp', q.adr - 1, 4); set('adr', q.adr - 1, 4); set('cort', q.cort - 1, 1.5);
      txt0('v_adrenal', 'adrénaline × ' + fmt(q.adr, 1)); txt0('s_adrenal', 'cortisol × ' + fmt(q.cort, 1));
      // Seuils du module : < 0,70 g/L adrénergique ; < 0,50 neuroglucopénique ; < 0,30 sévère.
      const lv = q.G < 0.3 ? 3 : q.G < 0.5 ? 2 : q.G < 0.7 ? 1 : 0;
      if (g.sweat) { g.sweat.classList.toggle('on', lv >= 1); g.tremor.classList.toggle('on', lv >= 1 && lv < 3); g.neuro.classList.toggle('on', lv === 2); g.coma.classList.toggle('on', lv === 3); }
      svg.classList.toggle('ph-hypo1', lv === 1); svg.classList.toggle('ph-hypo2', lv === 2); svg.classList.toggle('ph-hypo3', lv === 3);
      symBox.className = 'ph-sym lv' + lv; symBox.textContent = '';
      if (lv) symBox.append(h('strong', null, ['', 'Hypoglycémie : signes adrénergiques', 'Hypoglycémie : signes neuroglucopéniques', 'Hypoglycémie sévère'][lv] + ' · ' + fmt(q.G, 2) + ' g/L'), h('span', null, ['', 'sueurs, tremblements, palpitations, faim, anxiété, pâleur (adrénaline) → resucrage 15 g', 'sueurs, tremblements, puis troubles de la concentration, confusion, troubles du comportement, vision floue, parole difficile → resucrage si le patient peut avaler, sinon glucagon', 'convulsions, coma : tierce personne → glucagon 1 mg IM ou 3 mg intranasal, G30 % IV ; jamais de resucrage oral'][lv]));
      else symBox.append(h('span', null, 'Pas d\'hypoglycémie à cette heure (seuils du module : 0,70 · 0,50 · 0,30 g/L).'));
      const txt = (id, v) => { if (g[id]) g[id].textContent = v; };
      txt('v_brain', 'satiété ' + (k.satiety > 0.01 ? '+' + Math.round(k.satiety * 100) + ' %' : 'normale'));
      txt('s_brain', q.G < 0.7 ? 'alerte : hypoglycémie' : fmt(st.res.tot.carbs, 0) + ' g de glucides/j');
      txt('v_stomach', fmt(q.Qs, 0) + ' g à vider');
      txt('v_gut', 'absorption ' + fmt(q.ra, 1) + ' g/h');
      txt('s_gut', 'incrétines ' + fmt(q.incE, 2) + (q.incP > 0.01 ? ' + pharmaco ' + fmt(q.incP, 2) : ''));
      txt('v_islet', 'insuline ' + fmt(q.isec, 1) + ' U/h' + (q.su > 0.05 ? ' (sulfamide)' : ''));
      txt('s_islet', 'glucagon × ' + fmt(q.glu, 2));
      txt('v_liver', fmt(q.egp, 1) + ' g/h');
      txt('s_liver', k.metK > 0.01 ? 'metformine − ' + Math.round(k.metK * 100) + ' %' : 'sans metformine');
      txt('v_muscle', fmt(q.up * 0.75, 1) + ' g/h');
      txt('v_fat', fmt(q.up * 0.25, 1) + ' g/h');
      txt('s_fat', 'lipolyse × ' + fmt(q.lip, 2));
      txt('v_keto', 'β-OHB ' + fmt(q.ket, 2) + ' mmol/L');
      txt('s_keto', q.ket > 1.5 ? 'cétose marquée' : q.ket > 0.6 ? 'cétose' : 'normale (< 0,6)');
      txt('v_kidney', 'seuil rénal ' + fmt(k.tm, 2) + ' g/L');
      txt('s_kidney', k.tm < 1.7 ? 'SGLT2 bloqué' : 'réabsorbé sous le seuil');
      txt('v_bladder', 'glycosurie ' + fmt(q.ren, 2) + ' g/h');
      txt('s_bladder', fmt(st.res.tot.ren, 0) + ' g/24 h');
      txt('v_pen', fmt(q.iexo, 2) + ' U/h');
      txt('s_pen', k.rx.pump > 0 ? 'pompe' : k.rx.basal > 0 || k.rx.rapid > 0 ? 'stylo' : 'aucune');
      if (g.needle) g.needle.setAttribute('transform', 'translate(' + g.gX(q.G).toFixed(1) + ' ' + g.gy + ')');
      if (g.hand) { g.hand.setAttribute('transform', 'rotate(' + (st.t / 24 * 360).toFixed(1) + ')'); g.ctxt.textContent = String(hh).padStart(2, '0') + ' h · ' + fmt(q.G, 2) + ' g/L'; }
      txt('v_muscle', fmt(q.up * 0.75, 1) + ' g/h');
      txt('v_blood', fmt(q.G, 2) + ' g/L'); txt('s_blood', q.G < 0.3 ? 'hypoglycémie sévère' : q.G < 0.5 ? 'neuroglucopénie' : q.G < 0.7 ? 'hypoglycémie' : q.G > 1.8 ? 'au-dessus de 1,80' : 'dans la cible 0,70–1,80');
      if (g.bloodC) g.bloodC.setAttribute('class', 'px-box px-box-blood ' + (q.G < 0.7 ? 'low' : q.G > 1.8 ? 'high' : 'ok'));
      // Injection : bolus 10 min avant chaque repas, basale à 22 h ; la pompe délivre les bolus au repas.
      if (g.pen) {
        const rx = k.rx, dpe = st.res.dp, inj = [];
        (dpe.u || [0, 0, 0]).forEach((u, m) => { if (u > 0 && !dpe.skip[m]) inj.push({ t0: dpe.tm[m] - 0.25, lab: 'bolus ' + fmt(u, u % 1 ? 1 : 0) + ' U' }); });
        if (rx.basal > 0 && !(rx.pump > 0)) inj.push({ t0: 21.8, lab: 'basale ' + rx.basal + ' U' });
        const cur = inj.find((x) => st.t >= x.t0 && st.t < x.t0 + 0.5);
        if (g.pen.pump) { g.pen.grp.classList.toggle('active', !!cur); g.pen.lab.textContent = cur ? cur.lab : 'pompe ' + fmt(rx.pump / 24, 2) + ' U/h'; }
        else {
          const ph = cur ? (st.t - cur.t0) / 0.5 : 0;
          const ins = cur ? (ph < 0.2 ? ph / 0.2 : ph < 0.8 ? 1 : (1 - ph) / 0.2) : 0, push = cur ? Math.min(1, Math.max(0, (ph - 0.25) / 0.45)) : 0;
          g.pen.inner.setAttribute('transform', 'translate(' + (26 - 24 * ins).toFixed(1) + ' 0)');
          g.pen.plunger.setAttribute('x', (68 + 2 - 10 * push).toFixed(1));
          g.pen.grp.classList.toggle('active', !!cur);
          g.pen.lab.textContent = cur ? cur.lab : '';
        }
      }
      if (g.cursor) { const x = g.X(st.t); g.cursor.setAttribute('x1', x); g.cursor.setAttribute('x2', x); }
      if (st.infoSel !== st.sel) { st.infoSel = st.sel; }
      info.textContent = '';
      info.append(h('h4', null, NODES[st.sel].t), h('p', null, INFO[st.sel](k, st.res.tot)));
      if (st.ev && st.ev !== 'none') info.append(h('p', { class: 'ph-evnote' }, EVNOTE[st.ev](k, st.res.tot)));
    }

    // Ralenti aux moments clés : 3 h après chaque repas ou collation (× 0,4), hypoglycémie et ses abords (× 0,25).
    function slowAt(t) {
      if (st.slow === false) return 1;
      const q = st.res.pts[Math.min(287, Math.max(0, Math.round(t / DT)))], dpe = st.res.dp;
      if (q.G < 0.8) return 0.25;
      const meals = dpe.tm.filter((x, m) => !dpe.skip[m]).concat((dpe.snacks || []).map((sn) => sn.t));
      return meals.some((x) => t >= x - 0.25 && t < x + 3) ? 0.4 : 1;
    }
    let lastTs = 0;
    function loop(ts) {
      if (!st.play || !root.isConnected) { lastTs = 0; return; }
      if (lastTs) { st.t += (ts - lastTs) / 1000 * st.speed * slowAt(st.t); if (st.t >= 24) st.t -= 24; frame(); }
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
          const f = (st.on && !st.on.has(id)) ? 0 : (st.flux && st.flux[id]) || 0, n = f > 0 ? Math.max(1, Math.round(1 + 4 * Math.min(1, f))) : 0;
          const arr = parts[id] || (parts[id] = []);
          while (arr.length < n) { const u = el('use', { href: '#phm-' + FLOW_MOL[id], class: 'ph-mol' }, lay); arr.push({ u, x: arr.length ? (arr[arr.length - 1].x + 1 / n) % 1 : Math.random() }); }
          while (arr.length > n) arr.pop().u.remove();
          if (!n) return;
          const L = path.getTotalLength(), sp = 0.12 + 0.28 * Math.min(1.2, f);
          // Chaque molécule avance depuis sa propre position (toujours dans le sens du flux, même si la vitesse change).
          arr.forEach((pa) => {
            if (!reduce) pa.x = (pa.x + dt * sp) % 1;
            const x = pa.x, pt = path.getPointAtLength(x * L);
            const sc = 2.6;
            pa.u.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ',' + pt.y.toFixed(1) + ') scale(' + sc + ')');
            pa.u.setAttribute('opacity', (x < 0.08 ? x / 0.08 : x > 0.92 ? (1 - x) / 0.08 : 1).toFixed(2));
          });
        });
      }
      requestAnimationFrame(mloop);
    }
    draw();
    showHow();
    requestAnimationFrame(mloop);
    if (st.play) requestAnimationFrame(loop);
    return root;
  }

  S.dt2physio = { decompose, card, exoAt, EVENTS };
})();
