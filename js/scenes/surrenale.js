/*
 * Physiologie surrénalienne : stéroïdogenèse du cholestérol au cortisol, à l'aldostérone et aux androgènes
 * (figure 26 du polycopié), molécules en formule semi-développée, modèle simplifié des trois zones.
 * Scène transversale entre l'axe corticotrope (ACTH → zones fasciculée et réticulée) et le SRAA
 * (angiotensine II et kaliémie → zone glomérulée).
 */
(function () {
  'use strict';
  const HV = window.HV;
  const clamp = HV.clamp;
  const ex = Math.exp, ln = Math.log, pw = Math.pow;
  const f1 = (v) => v.toFixed(1).replace('.', ',');
  const pct = (v) => Math.round(v * 100) + ' %';

  /* ===================== Modèle ===================== */
  // Chaque conversion enzymatique est un réservoir : niveau = apport / (activité + c), c figurant les voies
  // de dérivation et la clairance. Un bloc fait donc monter le précurseur en amont et chuter le produit en aval,
  // tandis que l'ACTH, levée du rétrocontrôle, pousse toute la chaîne de la zone fasciculée.
  const C = 0.08;
  function core(p, acth, ang, troph, K) {
    const sat = (x) => (x / (x + 1)) * 2; // 1 pour une ACTH normale ; compensation plafonnée
    const F = p.adr * troph * sat(acth + 30 * p.syn); // zones fasciculée et réticulée (ACTH)
    const gIn = Math.max(0.02, ang * (1 + 0.6 * (K - 4.2)));
    const G = p.adr * (gIn / (gIn + 1)) * 2; // zone glomérulée (angiotensine II, kaliémie)
    const e21 = pw(p.cyp21, 1.3), e11 = pw(p.cyp11b1, 1.3);
    // Zone fasciculée : la prégnénolone part vers la progestérone, la 17-OH-prégnénolone et la DHEA.
    const progF = (0.15 * F) / (e21 + C);
    const docF = (progF * e21) / (e11 + C);
    const ohpreg = 0.85 * F;
    const ohp = (0.6 * F) / (e21 + C);
    const s11 = (ohp * e21) / (e11 + C);
    const cort = s11 * e11;
    const bF = docF * e11;
    // Zone réticulée : DHEA, sulfatée en DHEA-S ; la 17-OHP accumulée est détournée vers la Δ4-androstènedione.
    const dhea = 0.25 * F;
    const adione = 0.2 * F + ohp * 0.3;
    // Zone glomérulée : progestérone → DOC (CYP21) → corticostérone → aldostérone (CYP11B2, intacte ici).
    const progG = (0.1 * G) / (e21 + C);
    const docG = (progG * e21) / (1 + C);
    const bG = docG / (1 + C);
    const aldo = bG;
    return {
      preg: F + 0.1 * G, ohpreg, dhea, dheas: dhea, prog: progF + progG, ohp, adione, testo: adione,
      doc: docF + docG, s11, b: bF + bG, cort, aldo,
      // Flux le long des flèches du schéma
      J: { st: F + 0.1 * G, h17: 0.6 * F + 0.25 * F, ly: dhea, sult: dhea, hsd1: 0.15 * F + 0.1 * G, hsd2: 0.6 * F, ly2: ohp * 0.3, hsd17: adione,
        c21g: progF * e21 + progG * e21, c21f: ohp * e21, c11g: bF + bG, c11f: cort, as: aldo, h17b: 0.6 * F }
    };
  }
  const DEF = { adr: 1, pit: 1, cyp21: 1, cyp11b1: 1, syn: 0 };
  const N = core(DEF, 1, 1, 1, 4.2);
  const norm = (raw) => {
    const o = {};
    for (const k in raw) if (k !== 'J') o[k] = raw[k] / N[k];
    o.J = {};
    for (const k in raw.J) o.J[k] = raw.J[k] / N.J[k];
    return o;
  };

  const SIM = {
    title: 'Bilan surrénalien simulé',
    defaults: DEF,
    init: { acth: 1, ang: 1, troph: 1, mc: 1, k: 4.2, preg: 1, ohpreg: 1, dhea: 1, dheas: 1, prog: 1, ohp: 1, adione: 1, testo: 1, doc: 1, s11: 1, b: 1, cort: 1, aldo: 1 },
    tau: { troph: 5, acth: 0.6, ang: 0.8, k: 1, mc: 0.6 },
    targets(p, s) {
      const r = norm(core(p, s.acth, s.ang, s.troph, s.k));
      SIM.J = r.J;
      // Rétrocontrôle du cortisol sur la CRH et l'ACTH ; activité minéralocorticoïde (aldostérone, et DOC
      // en excès) qui freine la rénine et règle la kaliémie.
      const acth = clamp(p.pit * ex(-1.6 * (s.cort - 1)), 0, 14);
      const mc = 0.8 * s.aldo + 0.2 * s.doc;
      const ang = clamp(ex(-1.8 * (mc - 1)), 0.03, 12);
      const k = clamp(4.2 - 1.1 * ln(Math.max(mc, 0.05)), 2.6, 6.8);
      // Excès chronique d'ACTH : hyperplasie et hypertrophie surrénaliennes (polycopié p. 72).
      const troph = p.syn > 0 ? s.troph : clamp(pw(Math.max(acth, 0.01), 0.8), 0.15, 2);
      delete r.J;
      return Object.assign(r, { acth, ang, mc, k, troph });
    },
    labs: [
      { key: 'cort', name: 'Cortisol à 8 h', unit: 'nmol/L', range: '275–550 nmol/L', k: 400, lo: 275, hi: 550, min: 0, max: 2000, dec: 0 },
      { key: 'acth', name: 'ACTH à 8 h', unit: 'pg/mL', range: '20–52 pg/mL', k: 25, lo: 20, hi: 52, min: 0, max: 400, dec: 0 },
      { key: 'aldo', name: 'Aldostérone', unit: 'pmol/L', range: '100–550 pmol/L (complément)', k: 300, lo: 100, hi: 550, min: 10, max: 4000, log: true, dec: 0 },
      { key: 'renin', name: 'Rénine active', unit: 'mUI/L', range: '5–40 mUI/L (complément)', lo: 5, hi: 40, min: 0.2, max: 400, log: true, dec: 1, fn: (s) => 15 * s.ang },
      { key: 'kal', name: 'Kaliémie', unit: 'mmol/L', range: '3,5–5,0 mmol/L', lo: 3.5, hi: 5, min: 2.5, max: 7, dec: 1, fn: (s) => s.k },
      { key: 'na', name: 'Natrémie', unit: 'mmol/L', range: '135–145 mmol/L', lo: 135, hi: 145, min: 115, max: 155, dec: 0, fn: (s) => clamp(140 + 3.5 * ln(clamp(s.mc, 0.05, 2)) + 2 * ln(Math.max(s.cort, 0.05)), 118, 150) },
      { key: 'pas', name: 'PA systolique', unit: 'mmHg', range: '100–140 mmHg (indicatif)', lo: 100, hi: 140, min: 70, max: 220, dec: 0, fn: (s) => clamp(120 + 32 * ln(clamp(s.mc, 0.1, 6)), 80, 180) },
      { key: 'ohp', name: '17-hydroxyprogestérone', unit: '× N', range: 'valeur relative', k: 1, lo: 0, hi: 3, min: 0, max: 60, dec: 1 },
      { key: 's11', name: '11-désoxycortisol (composé S)', unit: '× N', range: 'valeur relative (complément)', k: 1, lo: 0, hi: 3, min: 0, max: 60, dec: 1 },
      { key: 'doc', name: '11-désoxycorticostérone (DOC)', unit: '× N', range: 'valeur relative (complément)', k: 1, lo: 0, hi: 3, min: 0, max: 60, dec: 1 },
      { key: 'dheas', name: 'SDHEA', unit: '× N', range: 'valeur relative ; normes selon l\'âge et le sexe', k: 1, lo: 0.5, hi: 2, min: 0, max: 10, dec: 1 },
      { key: 'adione', name: 'Δ4-androstènedione', unit: '× N', range: 'valeur relative', k: 1, lo: 0.5, hi: 2, min: 0, max: 20, dec: 1 }
    ],
    params: [
      { key: 'pit', label: 'Réserve corticotrope (CRH, ACTH)', min: 0.02, max: 1.5, step: 0.01, fmt: pct },
      { key: 'adr', label: 'Réserve corticosurrénalienne', min: 0.02, max: 1.5, step: 0.01, fmt: pct },
      { key: 'cyp21', label: '21-hydroxylase (CYP21A2)', min: 0.02, max: 1, step: 0.01, fmt: pct },
      { key: 'cyp11b1', label: '11β-hydroxylase (CYP11B1)', min: 0.02, max: 1, step: 0.01, fmt: pct },
      { key: 'syn', label: 'Test au Synacthène (ACTH 1-24)', min: 0, max: 1, step: 1, fmt: (v) => (v > 0 ? 'en cours' : 'non') }
    ],
    scenarios: [
      { id: 'eu', name: 'Surrénale normale', note: 'L\'ACTH commande les zones fasciculée et réticulée, l\'angiotensine II et la kaliémie la zone glomérulée.', p: {} },
      { id: 'cortico', name: 'Insuffisance corticotrope', note: 'Atteinte hypothalamo-hypophysaire : ACTH basse, cortisol et androgènes surrénaliens bas ; aldostérone et rénine normales, la zone glomérulée dépendant du SRAA (polycopié p. 85 et 88).', p: { pit: 0.05 } },
      { id: 'periph', name: 'Insuffisance surrénale périphérique', note: 'Destruction des deux surrénales : tous les stéroïdes baissent (minéralocorticoïdes, glucocorticoïdes, androgènes) ; ACTH et rénine élevées, hyperkaliémie, hyponatrémie (polycopié p. 85).', p: { adr: 0.06 } },
      { id: 'b21', name: 'Bloc en 21-hydroxylase, forme classique', note: 'CYP21A2, 95 % des HCS : cortisol et aldostérone effondrés, 17-OHP et progestérone accumulées et détournées vers les androgènes ; ACTH et rénine élevées, perte de sel (polycopié p. 80-81).', p: { cyp21: 0.03 } },
      { id: 'b21nc', name: 'Bloc en 21-hydroxylase, forme non classique', note: 'Cortisol conservé avec une ACTH normale ou discrètement augmentée ; 17-OHP et androstènedione modérément élevées ; diagnostic par la 17-OHP de base ou après Synacthène (polycopié p. 82).', p: { cyp21: 0.35 } },
      { id: 'b21syn', name: 'Forme non classique sous Synacthène', note: 'Après ACTH 1-24, la 17-OHP s\'élève franchement : c\'est le test diagnostique de la forme non classique (polycopié p. 82).', p: { cyp21: 0.35, syn: 1 } },
      { id: 'b11', name: 'Bloc en 11β-hydroxylase (complément)', note: 'Environ 5 % des HCS (CYP11B1, complément) : cortisol bas, ACTH élevée ; 11-désoxycortisol et DOC accumulés. La DOC est minéralocorticoïde : HTA, hypokaliémie, rénine et aldostérone basses ; virilisation.', p: { cyp11b1: 0.03 } }
    ],
    interpret(s, p, L) {
      const c = L('cort'), a = L('acth'), oh = L('ohp'), sx = L('s11'), ren = L('renin');
      if (p.cyp11b1 < 0.9 && sx > 3) return { tone: 'bad', label: 'Bloc en 11β-hydroxylase', text: 'Complément : cortisol bas et ACTH élevée ; 11-désoxycortisol et DOC accumulés. La DOC, minéralocorticoïde, retient le sodium : HTA et hypokaliémie avec rénine et aldostérone basses. Androgènes surrénaliens en excès : virilisation.' };
      if (p.cyp21 < 0.9 && oh > 3) {
        if (c < 275) return { tone: 'bad', label: 'Bloc en 21-hydroxylase, forme classique', text: 'Cortisol bas, ACTH élevée, 17-OHP très élevée, androgènes en excès ; aldostérone basse avec rénine élevée, hyperkaliémie et hyponatrémie : forme avec perte de sel. Fille : virilisation des organes génitaux externes. Dépistage néonatal : 17-OHP à J3 (polycopié p. 80-81).' };
        return { tone: 'warn', label: 'Bloc en 21-hydroxylase, forme non classique', text: 'Cortisol conservé, ACTH normale ou discrètement augmentée ; 17-OHP et androgènes augmentés' + (p.syn > 0 ? ', 17-OHP explosive sous Synacthène' : '') + ' : pubarche précoce, avance d\'âge osseux, hyperandrogénie de l\'adolescente (polycopié p. 81-82).' };
      }
      if (c < 138 && a > 52) return { tone: 'bad', label: 'Insuffisance surrénale périphérique', text: 'Cortisol bas, ACTH élevée (mélanodermie), aldostérone basse et rénine élevée, SDHEA bas : toutes les hormones corticosurrénaliennes manquent (polycopié p. 85). Hyperkaliémie, hyponatrémie, hypotension.' };
      if (c < 138) return { tone: 'bad', label: 'Insuffisance corticotrope', text: 'Cortisol bas avec ACTH basse ou inadaptée ; aldostérone et rénine normales, kaliémie normale : la zone glomérulée dépend du SRAA. Androgènes surrénaliens bas (polycopié p. 85 et 88).' };
      if (ren > 40 || ren < 5) return { tone: 'warn', label: 'Rénine anormale', text: 'Le système rénine-angiotensine compense un défaut ou un excès d\'activité minéralocorticoïde.' };
      return { tone: 'good', label: 'Fonction surrénalienne normale', text: 'Cortisol, aldostérone et androgènes surrénaliens dans les normes ; précurseurs non accumulés.' };
    }
  };
  const sim = HV.makeSim('surrenale', SIM);

  /* ===================== Formules des stéroïdes ===================== */
  // Noyau stérane en unités de liaison (L) : cycles A, B, C hexagonaux, D pentagonal ; y vers le bas.
  const A = { 1: [0, -1], 2: [-0.866, -0.5], 3: [-0.866, 0.5], 4: [0, 1], 5: [0.866, 0.5], 10: [0.866, -0.5],
    6: [1.732, 1], 7: [2.598, 0.5], 8: [2.598, -0.5], 9: [1.732, -1], 11: [1.732, -2], 12: [2.598, -2.5], 13: [3.464, -2], 14: [3.464, -1],
    15: [4.415, -0.691], 16: [5.003, -1.5], 17: [4.415, -2.309] };
  const MOL = {
    chol: { d: 5, c3: 'OH', side: 'chol', f: 'C₂₇H₄₆O' },
    preg: { d: 5, c3: 'OH', side: 'c20', f: 'C₂₁H₃₂O₂' },
    ohpreg: { d: 5, c3: 'OH', side: 'c20', oh17: 1, f: 'C₂₁H₃₂O₃' },
    dhea: { d: 5, c3: 'OH', side: 'keto', f: 'C₁₉H₂₈O₂' },
    dheas: { d: 5, c3: 'OS', side: 'keto', f: 'C₁₉H₂₈O₅S' },
    prog: { d: 4, c3: 'O', side: 'c20', f: 'C₂₁H₃₀O₂' },
    ohp: { d: 4, c3: 'O', side: 'c20', oh17: 1, f: 'C₂₁H₃₀O₃' },
    adione: { d: 4, c3: 'O', side: 'keto', f: 'C₁₉H₂₆O₂' },
    testo: { d: 4, c3: 'O', side: 'beta', f: 'C₁₉H₂₈O₂' },
    doc: { d: 4, c3: 'O', side: 'c20', oh21: 1, f: 'C₂₁H₃₀O₃' },
    s11: { d: 4, c3: 'O', side: 'c20', oh17: 1, oh21: 1, f: 'C₂₁H₃₀O₄' },
    b: { d: 4, c3: 'O', side: 'c20', oh21: 1, c11: 1, f: 'C₂₁H₃₀O₄' },
    cort: { d: 4, c3: 'O', side: 'c20', oh17: 1, oh21: 1, c11: 1, f: 'C₂₁H₃₀O₅' },
    aldo: { d: 4, c3: 'O', side: 'c20', oh21: 1, c11: 1, c18: 1, f: 'C₂₁H₂₈O₅' }
  };
  function drawSteroid(a, parent, m, L) {
    const P = (q) => (Array.isArray(q) ? q : A[q]).map((v) => (v * L).toFixed(1)).join(',');
    const bonds = [], dbl = [], dash = [], labels = [];
    const ring = (ids) => ids.forEach((id, i) => bonds.push([id, ids[(i + 1) % ids.length]]));
    ring([1, 2, 3, 4, 5, 10]); ring([5, 6, 7, 8, 9, 10]); ring([8, 14, 13, 12, 11, 9]);
    ring([13, 17, 16, 15, 14]);
    // Double liaison intracyclique, tracée vers le centre du cycle
    const inner = (p1, p2, c) => {
      const q1 = A[p1], q2 = A[p2];
      const s = 0.17, t = 0.16;
      const m1 = [q1[0] + (c[0] - q1[0]) * s, q1[1] + (c[1] - q1[1]) * s], m2 = [q2[0] + (c[0] - q2[0]) * s, q2[1] + (c[1] - q2[1]) * s];
      dbl.push([[m1[0] + (m2[0] - m1[0]) * t, m1[1] + (m2[1] - m1[1]) * t], [m2[0] + (m1[0] - m2[0]) * t, m2[1] + (m1[1] - m2[1]) * t]]);
    };
    if (m.d === 5) inner(5, 6, [1.732, 0]); else inner(4, 5, [0, 0]);
    // Double liaison exocyclique C=O
    const exo = (from, to) => {
      const q = Array.isArray(from) ? from : A[from];
      const dx = to[0] - q[0], dy = to[1] - q[1], n = Math.hypot(dx, dy), ox = (-dy / n) * 0.09, oy = (dx / n) * 0.09;
      bonds.push([[q[0] + ox, q[1] + oy], [to[0] + ox, to[1] + oy]]);
      bonds.push([[q[0] - ox, q[1] - oy], [to[0] - ox, to[1] - oy]]);
    };
    // Méthyles angulaires C19 et C18
    bonds.push([10, [0.866, -1.4]]);
    // Aldostérone : aldéhyde porté par C18 (méthyle de C13), étiquette au bout de la liaison, au-dessus du cycle C
    if (m.c18) { bonds.push([13, [3.0, -2.75]]); labels.push([2.98, -2.95, 'OHC', 'end']); } else bonds.push([13, [3.464, -2.9]]);
    // Carbone 3
    if (m.c3 === 'O') { exo(3, [-1.6, 0.95]); labels.push([-1.83, 1.24, 'O', 'middle']); }
    else { bonds.push([3, [-1.6, 0.95]]); labels.push([-1.62, 1.28, m.c3 === 'OS' ? '⁻O₃SO' : 'HO', 'end']); }
    if (m.c11) { bonds.push([11, [0.98, -2.45]]); labels.push([0.92, -2.25, 'HO', 'end']); }
    const c20 = [4.415, -3.2];
    if (m.side === 'c20' || m.side === 'chol') bonds.push([17, c20]);
    if (m.side === 'c20') {
      exo(c20, [5.2, -3.65]); labels.push([5.45, -3.55, 'O', 'middle']);
      const c21 = [3.63, -3.65];
      bonds.push([c20, c21]);
      if (m.oh21) { bonds.push([c21, [3.63, -4.45]]); labels.push([3.63, -4.62, 'OH', 'middle']); }
    }
    if (m.side === 'chol') {
      const ch = [c20, [5.2, -3.65], [6, -3.2], [6.8, -3.65], [7.6, -3.2], [8.4, -3.65]];
      for (let i = 0; i < ch.length - 1; i++) bonds.push([ch[i], ch[i + 1]]);
      bonds.push([c20, [3.63, -3.65]]); bonds.push([[7.6, -3.2], [7.6, -2.3]]);
    }
    if (m.side === 'keto') { exo(17, [5.0, -3.05]); labels.push([5.22, -3.08, 'O', 'middle']); }
    if (m.side === 'beta') { bonds.push([17, c20]); labels.push([4.415, -3.4, 'OH', 'middle']); }
    if (m.oh17) { dash.push([17, [5.3, -2.55]]); labels.push([5.38, -2.38, 'OH', 'start']); }
    const g = a.el('g', { class: 'sr-mol' }, parent);
    a.path(bonds.map(([p, q]) => `M ${P(p)} L ${P(q)}`).join(' '), 'sr-bond', g);
    a.path(dbl.map(([p, q]) => `M ${P(p)} L ${P(q)}`).join(' '), 'sr-bond', g);
    if (dash.length) a.path(dash.map(([p, q]) => `M ${P(p)} L ${P(q)}`).join(' '), 'sr-bond sr-hash', g);
    labels.forEach(([x, y, t, anc]) => a.text(x * L, y * L + L * 0.26, t, 'sr-atom' + (t.indexOf('S') >= 0 ? ' sr-s' : ''), { anchor: anc, attrs: { style: `font-size:${(L * 0.78).toFixed(1)}px` } }, g));
    return g;
  }

  /* ===================== Fiches au survol ===================== */
  Object.assign(HV.INFO, {
    'sr-chol': { t: 'Cholestérol', k: 'Précurseur commun · C₂₇H₄₆O', d: 'Toutes les hormones corticostéroïdes dérivent du cholestérol. Son transport dans la mitochondrie par la protéine StAR est l\'étape limitante, stimulée par l\'ACTH ; la P450scc (cholestérol desmolase) clive sa chaîne latérale en prégnénolone (polycopié p. 70).' },
    'sr-preg': { t: 'Prégnénolone', k: 'Premier stéroïde · C₂₁H₃₂O₂', d: 'Produite dans les trois zones par clivage de la chaîne latérale du cholestérol (P450scc) ; chaque zone la modifie ensuite avec ses enzymes propres (polycopié p. 70, figure 26).' },
    'sr-ohpreg': { t: '17-OH-prégnénolone', k: 'Voie Δ5 · C₂₁H₃₂O₃', d: '17α-hydroxylation par le CYP17, présent dans les zones fasciculée et réticulée mais pas dans la glomérulée (complément).' },
    'sr-dhea': { t: 'DHEA', k: 'Déhydroépiandrostérone · C₁₉H₂₈O₂', d: 'Androgène surrénalien de la zone réticulée, sous la dépendance de l\'ACTH (polycopié p. 73). Obtenue par l\'activité 17,20-lyase du CYP17.' },
    'sr-dheas': { t: 'SDHEA (DHEA-S)', k: 'Sulfate de DHEA · C₁₉H₂₈O₅S', d: 'Forme sulfatée et circulante de la DHEA (sulfotransférase SULT2A1, complément). Bas dans l\'adénome cortisolique et dans les insuffisances surrénales, élevé dans le corticosurrénalome (polycopié p. 80 et 85).' },
    'sr-prog': { t: 'Progestérone', k: 'Voie Δ4 · C₂₁H₃₀O₂', d: 'Formée par la 3β-hydroxystéroïde déshydrogénase. Substrat de la 21-hydroxylase vers la DOC ; s\'accumule dans le bloc en 21-hydroxylase.' },
    'sr-ohp': { t: '17-hydroxyprogestérone (17-OHP)', k: 'Marqueur du bloc en 21-hydroxylase · C₂₁H₃₀O₃', d: 'Substrat de la 21-hydroxylase vers le 11-désoxycortisol. S\'accumule massivement en cas de déficit ; dosée au 3e jour de vie (test de Guthrie) et, dans les formes non classiques, de base ou après test au Synacthène (polycopié p. 81-82).' },
    'sr-adione': { t: 'Δ4-androstènedione', k: 'Précurseur de la testostérone · C₁₉H₂₆O₂', d: 'Produite par la zone réticulée (polycopié p. 73). Augmentée dans les blocs en 21- et 11β-hydroxylase, par détournement des précurseurs accumulés.' },
    'sr-testo': { t: 'Testostérone', k: 'C₁₉H₂₈O₂', d: 'Formée surtout dans les gonades et en périphérie à partir de la Δ4-androstènedione (17β-HSD, complément). Chez la femme, l\'excès d\'androgènes surrénaliens donne une hyperandrogénie.' },
    'sr-doc': { t: '11-désoxycorticostérone (DOC)', k: 'Minéralocorticoïde · C₂₁H₃₀O₃', d: 'Produit de la 21-hydroxylase sur la progestérone. Minéralocorticoïde actif (complément) : son excès dans le bloc en 11β-hydroxylase retient le sodium, donne une HTA avec hypokaliémie et freine la rénine.' },
    'sr-s11': { t: '11-désoxycortisol (composé S)', k: 'Précurseur immédiat du cortisol · C₂₁H₃₀O₄', d: 'Produit de la 21-hydroxylase sur la 17-OHP ; converti en cortisol par la 11β-hydroxylase. S\'accumule dans le bloc en 11β-hydroxylase (complément).' },
    'sr-b': { t: 'Corticostérone', k: 'C₂₁H₃₀O₄', d: 'Intermédiaire de la voie de l\'aldostérone dans la zone glomérulée (11β-hydroxylation de la DOC).' },
    'sr-cort': { t: 'Cortisol', k: 'Principal glucocorticoïde · C₂₁H₃₀O₅', d: 'Produit par la zone fasciculée sous ACTH ; freine la CRH et l\'ACTH (rétrocontrôle négatif). Pic en début de matinée (polycopié p. 72-73).' },
    'sr-aldo': { t: 'Aldostérone', k: 'Minéralocorticoïde · C₂₁H₂₈O₅', d: 'Produite par la zone glomérulée grâce à l\'aldostérone synthase (CYP11B2) ; agit sur le tube distal et le canal collecteur : réabsorption du sodium, excrétion du potassium (polycopié p. 70). Réglée par le SRAA et la kaliémie.' },
    'sr-zg': { t: 'Zone glomérulée', k: 'Couche la plus externe', d: 'Principal site de production de l\'aldostérone (aldostérone synthase). Commandée par l\'angiotensine II et la kaliémie, peu par l\'ACTH : elle est préservée dans l\'insuffisance corticotrope (polycopié p. 70, 72 et 85).' },
    'sr-zf': { t: 'Zone fasciculée', k: '75 à 80 % du cortex', d: 'Produit le cortisol sous le contrôle de l\'ACTH, avec un rythme circadien (polycopié p. 72-73).' },
    'sr-zr': { t: 'Zone réticulée', k: 'Couche la plus interne', d: 'Produit les androgènes surrénaliens : DHEA, DHEA-S, androstènedione ; dépendante de l\'axe hypothalamo-hypophyso-surrénalien (polycopié p. 73).' },
    'sr-acth': { t: 'ACTH', k: 'Axe corticotrope', d: 'Stimule StAR et les enzymes des zones fasciculée et réticulée. Quand le cortisol baisse (bloc, insuffisance surrénale), le rétrocontrôle est levé et l\'ACTH monte. Clic : axe corticotrope.' },
    'sr-ang': { t: 'Angiotensine II et kaliémie', k: 'Système rénine-angiotensine-aldostérone', d: 'Commandent la zone glomérulée. Une activité minéralocorticoïde insuffisante élève la rénine ; un excès (DOC du bloc en 11β-hydroxylase) la freine. Clic : SRAA.' },
    'sr-e-star': { t: 'StAR, puis CYP11A1 (P450scc)', k: 'Étape limitante', d: 'Transport du cholestérol vers la membrane mitochondriale interne, puis clivage de sa chaîne latérale (cholestérol desmolase).' },
    'sr-e-3b': { t: '3β-HSD', k: '3β-hydroxystéroïde déshydrogénase', d: 'Passe des stéroïdes Δ5 (prégnénolone, 17-OH-prégnénolone, DHEA) aux stéroïdes Δ4-3-céto (progestérone, 17-OHP, androstènedione).' },
    'sr-e-17': { t: 'CYP17 · 17α-hydroxylase', k: 'Zones fasciculée et réticulée', d: 'Absente de la zone glomérulée (complément) : c\'est pourquoi celle-ci ne fabrique ni cortisol ni androgènes.' },
    'sr-e-ly': { t: 'CYP17 · 17,20-lyase', k: 'Zone réticulée', d: 'Coupe la chaîne latérale en C17 : stéroïdes en C19, les androgènes (DHEA, androstènedione).' },
    'sr-e-21': { t: 'CYP21A2 · 21-hydroxylase', k: 'Gène sur le chromosome 6p21.3', d: 'Indispensable à la production du cortisol et de l\'aldostérone. Son déficit, autosomique récessif, cause 95 % des hyperplasies congénitales des surrénales (polycopié p. 80).' },
    'sr-e-11': { t: 'CYP11B1 · 11β-hydroxylase', k: 'Zone fasciculée', d: 'Dernière étape du cortisol (11-désoxycortisol → cortisol) et 11β-hydroxylation de la DOC. Son déficit (environ 5 % des HCS) est un complément au polycopié.' },
    'sr-e-as': { t: 'CYP11B2 · aldostérone synthase', k: 'Zone glomérulée', d: 'Hydroxylations en 11β et 18, puis oxydation en 18 : corticostérone → 18-OH-corticostérone → aldostérone (polycopié p. 70 et figure 26).' },
    'sr-e-sult': { t: 'SULT2A1', k: 'Sulfotransférase', d: 'Sulfate la DHEA en DHEA-S, forme circulante abondante (complément).' },
    'sr-e-17b': { t: '17β-HSD', k: 'Gonades et périphérie', d: 'Réduit la Δ4-androstènedione en testostérone (complément).' }
  });

  /* ===================== Scène ===================== */
  const COL = { g: 345, f: 765, r: 1185 }, ROW = { 1: 192, 2: 330, 3: 470, 4: 610, 5: 750, 6: 890 };
  const BW = 330, BH = 104;
  const NODES = [
    ['preg', 'Prégnénolone', 'g', 2], ['prog', 'Progestérone', 'g', 3], ['doc', '11-désoxycorticostérone', 'g', 4], ['b', 'Corticostérone', 'g', 5], ['aldo', 'Aldostérone', 'g', 6],
    ['ohpreg', '17-OH-prégnénolone', 'f', 2], ['ohp', '17-OH-progestérone', 'f', 3], ['s11', '11-désoxycortisol', 'f', 4], ['cort', 'Cortisol', 'f', 5],
    ['dhea', 'DHEA', 'r', 2], ['adione', 'Δ4-androstènedione', 'r', 3], ['testo', 'Testostérone', 'r', 4], ['dheas', 'SDHEA (DHEA-S)', 'r', 5]
  ];

  const def = HV.scene({
    id: 'surrenale', parent: 'atlas', x: 360, y: 1168, scale: 0.24, loupe: 'Physiologie surrénalienne (axe corticotrope · SRAA)',
    title: 'Physiologie surrénalienne', level: 'Organe',
    lead: 'Du cholestérol aux trois familles de stéroïdes : aldostérone (zone glomérulée, sous angiotensine II et kaliémie), cortisol (zone fasciculée, sous ACTH) et androgènes surrénaliens (zone réticulée, sous ACTH). Choisissez un scénario pour voir les précurseurs s\'accumuler en amont d\'un bloc et les produits chuter en aval.',
    points: [
      'Le transport mitochondrial du cholestérol par StAR est l\'étape limitante ; la P450scc forme la prégnénolone (polycopié p. 70).',
      'Insuffisance corticotrope : cortisol et androgènes bas, aldostérone conservée (SRAA).',
      'Insuffisance surrénale périphérique : déficit de toutes les hormones corticosurrénaliennes, ACTH et rénine élevées.',
      'Bloc en 21-hydroxylase : 17-OHP très élevée, androgènes en excès, cortisol et aldostérone bas (95 % des HCS).',
      'Bloc en 11β-hydroxylase (complément) : 11-désoxycortisol et DOC élevés, HTA avec hypokaliémie.',
      'Valeurs des précurseurs exprimées par rapport à la normale (× N), à titre pédagogique.'
    ],
    source: 'Source : Polycopié de sémiologie endocrinienne, CEEDMM, 2e édition (2023), partie 1, p. 61, 70-73, 80-85 et 88-89, figure 26 ; compléments signalés.',
    legend: new Set(['chol', 'acth', 'angio', 'k', 'cortisol', 'aldo', 'dhea']),
    build(g, a) {
      def.sim = sim;
      a.frame('Physiologie surrénalienne', 'Stéroïdogenèse du cholestérol au cortisol, à l\'aldostérone et aux androgènes · figure 26');
      HV.figBadge(a, 1540, 186, ['26']);

      // Bandes des trois zones
      [['g', 'Zone glomérulée', 'minéralocorticoïdes', 'p-teal'], ['f', 'Zone fasciculée', 'glucocorticoïdes', 'p-gold'], ['r', 'Zone réticulée', 'androgènes', 'p-sky']].forEach(([z, t, sub, col]) => {
        const zg = a.el('g', { 'data-info': 'sr-z' + z, style: `--c: var(--${col})` });
        a.el('rect', { x: COL[z] - BW / 2 - 18, y: 252, width: BW + 36, height: 712, rx: 22, class: 'sr-zone' }, zg);
        a.text(COL[z] - BW / 2 - 4, 274, t, 'sr-zone-t', null, zg);
        a.text(COL[z] + BW / 2 + 4, 274, sub, 'sr-zone-s', { anchor: 'end' }, zg);
      });

      const vals = {};
      const nodeAt = (id) => { const n = NODES.find((x) => x[0] === id); return [COL[n[2]], ROW[n[3]]]; };
      const box = (id, name, x, y, w, h, opts) => {
        const ng = a.el('g', { class: 'sr-node', 'data-info': 'sr-' + id, transform: `translate(${x} ${y})` });
        a.el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 14, class: 'sr-box' }, ng);
        const m = MOL[id];
        const L = id === 'chol' ? 11.5 : 13.2;
        const mg = drawSteroid(a, ng, m, L);
        mg.setAttribute('transform', `translate(${(-w / 2 + (id === 'chol' ? 44 : id === 'dheas' ? 64 : 50)).toFixed(0)} ${(h / 2 - 22).toFixed(0)})`);
        const tx = -w / 2 + (id === 'chol' ? 150 : 152);
        a.text(tx, -h / 2 + 26, name, 'sr-name' + (name.length > 17 ? ' sr-name-s' : ''), null, ng);
        a.text(tx, -h / 2 + 46, m.f, 'sr-formula', null, ng);
        if (!opts || !opts.noValue) {
          const vg = a.el('g', { transform: `translate(${tx} ${h / 2 - 22})` }, ng);
          a.el('rect', { x: 0, y: -8, width: w / 2 - 70, height: 12, rx: 6, class: 'sr-bar-bg' }, vg);
          const bar = a.el('rect', { x: 0, y: -8, width: 4, height: 12, rx: 6, class: 'sr-bar' }, vg);
          const tv = a.text(w / 2 - 62, 3, '', 'sr-val', null, vg);
          vals[id] = { bar, tv, ng, wmax: w / 2 - 70 };
        }
        return ng;
      };

      // Entrées : SRAA (zone glomérulée), cholestérol, ACTH (zones fasciculée et réticulée)
      const inp = (x, info, title, sub, col, zoom) => {
        const ig = a.el('g', { class: 'sr-input', 'data-info': info, style: `--c: var(--${col})`, transform: `translate(${x} ${ROW[1]})` });
        a.el('rect', { x: -135, y: -40, width: 270, height: 80, rx: 40, class: 'sr-in-box' }, ig);
        a.text(0, -6, title, 'sr-in-t', { anchor: 'middle' }, ig);
        const tv = a.text(0, 20, sub, 'sr-in-v', { anchor: 'middle' }, ig);
        a.zoomable(ig, zoom);
        return tv;
      };
      const angTxt = inp(COL.g - 30, 'sr-ang', 'Angiotensine II, K⁺ (SRAA)', '', 'p-teal', 'raa');
      const acthTxt = inp(COL.r, 'sr-acth', 'ACTH (axe corticotrope)', '', 'p-orange', 'cortico');
      box('chol', 'Cholestérol', COL.f, ROW[1], BW, 92, { noValue: true });
      a.sign(COL.g - 30, ROW[1] + 58, 'stim').set(1);
      const acthSign = a.sign(COL.r, ROW[1] + 58, 'stim');

      NODES.forEach(([id, name, z, r]) => box(id, name, COL[z], ROW[r], BW, BH));

      // Flèches enzymatiques
      const arrows = {};
      const dots = { g: 'var(--p-teal)', f: 'var(--p-gold)', r: 'var(--p-sky)' };
      const arrow = (key, d, enz, info, lx, ly, zone, anchor) => {
        const ag = a.el('g', { class: 'sr-arrow', 'data-info': info });
        const tr = a.path(d, 'sr-track', ag, { 'marker-end': 'url(#arr-accent)' });
        const cross = a.el('g', { class: 'sr-block', opacity: 0 }, ag);
        a.text(lx, ly, enz, 'sr-enz', { anchor: anchor || 'start' }, ag);
        a.flow(d, { mol: 'dot', style: `fill: ${dots[zone]}`, rate: () => 1.6 * Math.min(4, (SIM.J && SIM.J[key]) || 1), speed: 70, size: 1.3, track: false, max: 24 });
        arrows[key] = { ag, tr, cross };
        return arrows[key];
      };
      const vDown = (from, to) => { const [x, y1] = nodeAt(from), y2 = nodeAt(to)[1]; return `M ${x},${y1 + BH / 2 + 2} L ${x},${y2 - BH / 2 - 4}`; };
      const hRight = (from, to) => { const [x1, y] = nodeAt(from), x2 = nodeAt(to)[0]; return `M ${x1 + BW / 2 + 2},${y} L ${x2 - BW / 2 - 4},${y}`; };
      const yMid = (r) => (ROW[r] + ROW[r + 1]) / 2 + 5;
      arrow('st', `M ${COL.f - BW / 2 - 2},${ROW[1] + 14} C ${COL.g + 150},${ROW[1] + 24} ${COL.g + 125},${ROW[1] + 60} ${COL.g + 115},${ROW[2] - BH / 2 - 4}`, 'StAR · CYP11A1', 'sr-e-star', COL.g + 150, ROW[1] + 50, 'g');
      arrow('hsd1', vDown('preg', 'prog'), '3β-HSD', 'sr-e-3b', COL.g + 14, yMid(2), 'g');
      arrow('c21g', vDown('prog', 'doc'), 'CYP21 · 21-hydroxylase', 'sr-e-21', COL.g + 14, yMid(3), 'g');
      arrow('c11g', vDown('doc', 'b'), 'CYP11B2 / B1 · 11β', 'sr-e-as', COL.g + 14, yMid(4), 'g');
      arrow('as', vDown('b', 'aldo'), 'CYP11B2 · aldostérone synthase', 'sr-e-as', COL.g + 14, yMid(5), 'g');
      arrow('h17', hRight('preg', 'ohpreg'), 'CYP17', 'sr-e-17', (COL.g + COL.f) / 2, ROW[2] - 10, 'f', 'middle');
      arrow('h17b', hRight('prog', 'ohp'), 'CYP17', 'sr-e-17', (COL.g + COL.f) / 2, ROW[3] - 10, 'f', 'middle');
      arrow('hsd2', vDown('ohpreg', 'ohp'), '3β-HSD', 'sr-e-3b', COL.f + 14, yMid(2), 'f');
      arrow('c21f', vDown('ohp', 's11'), 'CYP21 · 21-hydroxylase', 'sr-e-21', COL.f + 14, yMid(3), 'f');
      arrow('c11f', vDown('s11', 'cort'), 'CYP11B1 · 11β-hydroxylase', 'sr-e-11', COL.f + 14, yMid(4), 'f');
      arrow('ly', hRight('ohpreg', 'dhea'), 'lyase', 'sr-e-ly', (COL.f + COL.r) / 2, ROW[2] - 10, 'r', 'middle');
      arrow('ly2', hRight('ohp', 'adione'), 'lyase', 'sr-e-ly', (COL.f + COL.r) / 2, ROW[3] - 10, 'r', 'middle');
      arrow('hsd17', vDown('adione', 'testo'), '17β-HSD', 'sr-e-17b', COL.r + 14, yMid(3), 'r');
      arrow('sult', `M ${COL.r + BW / 2 + 2},${ROW[2] + 20} C ${COL.r + BW / 2 + 44},${ROW[2] + 120} ${COL.r + BW / 2 + 44},${ROW[5] - 120} ${COL.r + BW / 2 + 4},${ROW[5] - 10}`, '', 'sr-e-sult', 0, 0, 'r');
      a.text(0, 0, 'SULT2A1', 'sr-enz', { anchor: 'middle', attrs: { transform: `translate(${COL.r + BW / 2 + 22} ${(ROW[3] + ROW[4]) / 2}) rotate(90)`, 'data-info': 'sr-e-sult' } });
      a.path(`M ${COL.r},${ROW[2] + BH / 2 + 2} L ${COL.r},${ROW[3] - BH / 2 - 4}`, 'sr-track', null, { 'marker-end': 'url(#arr-accent)', 'data-info': 'sr-e-3b' });
      a.text(COL.r + 14, yMid(2), '3β-HSD', 'sr-enz', { attrs: { 'data-info': 'sr-e-3b' } });
      // Croix des blocs enzymatiques
      const crossAt = (key) => {
        const A2 = arrows[key], bb = A2.tr.getBBox();
        const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
        a.el('circle', { cx, cy, r: 15, class: 'sr-block-bg' }, A2.cross);
        a.path(`M ${cx - 8},${cy - 8} L ${cx + 8},${cy + 8} M ${cx + 8},${cy - 8} L ${cx - 8},${cy + 8}`, 'sr-block-x', A2.cross);
      };
      ['c21g', 'c21f', 'c11f'].forEach(crossAt);

      // Sorties et rétrocontrôles
      a.text(COL.f, ROW[5] + BH / 2 + 26, '⊖ freine la CRH et l\'ACTH', 'sr-out', { anchor: 'middle', attrs: { 'data-info': 'sr-cort' } });
      a.text(COL.g, ROW[6] + BH / 2 + 22, '→ rein : Na⁺ retenu, K⁺ excrété', 'sr-out', { anchor: 'middle', attrs: { 'data-info': 'sr-aldo' } });
      const note = a.el('g', { class: 'sr-note-g', transform: `translate(${COL.f - BW / 2} ${ROW[6] - 44})` });
      a.el('rect', { width: COL.r - COL.f + BW, height: 96, rx: 14, class: 'sr-note-bg' }, note);
      const noteTxt = a.text(16, 28, ['Choisissez un scénario dans le panneau :', 'les précurseurs s\'accumulent en amont d\'un bloc.'], 'sr-note', { lh: 1.3 }, note);

      // Bilan en direct (colonne de droite)
      const bil = a.el('g', { class: 'sr-bilan', transform: 'translate(1408 300)' });
      a.el('rect', { x: -12, y: -38, width: 180, height: 420, rx: 16, class: 'sr-note-bg' }, bil);
      a.text(0, -10, 'Bilan', 'sr-zone-t', null, bil);
      const BL = [['cort', 'Cortisol'], ['aldo', 'Aldostérone'], ['acth', 'ACTH'], ['renin', 'Rénine'], ['kal', 'K⁺'], ['na', 'Na⁺'], ['pas', 'PA syst.']];
      const bilTxt = BL.map(([k, n], i) => {
        a.text(0, 24 + i * 52, n, 'sr-b-n', null, bil);
        return [k, a.text(0, 46 + i * 52, '', 'sr-b-v', null, bil)];
      });
      // Figure 26 du polycopié (vignette cliquable)
      const fg = a.el('g', { class: 'scinti fig-vign', transform: 'translate(1396 740)', 'data-figs': '26', 'data-info': 'fig26' });
      a.el('rect', { width: 180, height: 150, rx: 12, class: 'scinti-bg' }, fg);
      a.text(10, 20, 'Figure 26', 'scinti-t', null, fg);
      a.el('image', { x: 6, y: 28, width: 168, height: 116, href: HV.polyFig('26').src, preserveAspectRatio: 'xMidYMid meet' }, fg);

      const arrowTxt = (r) => (r > 1.5 ? ' ↑' : r < 0.67 ? ' ↓' : '');
      const T = { h: 8, d: 1 };
      a.dyn((dt) => {
        sim.step(dt, T);
        const S = sim.s, Pp = sim.p;
        Object.keys(vals).forEach((id) => {
          const v = S[id], V = vals[id];
          const w = clamp((ln(Math.max(v, 0.02)) + 4) / 8, 0.02, 1) * V.wmax; // échelle logarithmique, 1 au milieu
          V.bar.setAttribute('width', w.toFixed(1));
          V.tv.textContent = '× ' + (v >= 10 ? Math.round(v) : f1(v)) + arrowTxt(v);
          V.ng.classList.toggle('up', v > 1.5);
          V.ng.classList.toggle('down', v < 0.67);
        });
        angTxt.textContent = 'Ang II × ' + f1(S.ang) + ' · K⁺ ' + f1(S.k);
        acthTxt.textContent = 'ACTH ' + Math.round(sim.lab('acth')) + ' pg/mL' + (Pp.syn > 0 ? ' + Synacthène' : '');
        acthSign.set(clamp(S.acth + 3 * Pp.syn, 0, 3));
        arrows.c21g.cross.setAttribute('opacity', Pp.cyp21 < 0.7 ? 1 : 0);
        arrows.c21f.cross.setAttribute('opacity', Pp.cyp21 < 0.7 ? 1 : 0);
        arrows.c11f.cross.setAttribute('opacity', Pp.cyp11b1 < 0.7 ? 1 : 0);
        arrows.ly2.ag.classList.toggle('hot', (SIM.J && SIM.J.ly2) > 2);
        bilTxt.forEach(([k, t]) => {
          const L = sim.LABS.find((x) => x.key === k), v = sim.lab(k);
          t.textContent = (L.dec ? f1(v) : Math.round(v)) + ' ' + L.unit.replace('mmol/L', '') + (v > L.hi ? ' ↑' : v < L.lo ? ' ↓' : '');
          t.classList.toggle('hi', v > L.hi);
          t.classList.toggle('lo', v < L.lo);
        });
        const it = sim.interpret();
        const line = it.label;
        if (noteTxt._l !== line) { noteTxt._l = line; noteTxt.firstChild.textContent = line; noteTxt.lastChild.textContent = Pp.cyp21 < 0.7 ? 'Précurseurs accumulés : progestérone, 17-OHP → androgènes.' : Pp.cyp11b1 < 0.7 ? 'Précurseurs accumulés : 11-désoxycortisol, DOC (minéralocorticoïde).' : Pp.adr < 0.5 ? 'Les trois zones sont détruites.' : Pp.pit < 0.5 ? 'Sans ACTH, fasciculée et réticulée s\'éteignent ; la glomérulée reste.' : 'Rétrocontrôle : le cortisol freine l\'ACTH.'; }
      });

      HV.spotlight(def, a, [
        { t: 'Le cholestérol entre dans la mitochondrie', d: 'StAR transporte le cholestérol vers la membrane mitochondriale interne : c\'est l\'étape limitante, stimulée par l\'ACTH. La P450scc (CYP11A1) clive sa chaîne latérale et forme la prégnénolone (polycopié p. 70).', spot: [[COL.f, ROW[1], 190], [COL.g, ROW[2], 170]] },
        { t: 'Zone glomérulée : l\'aldostérone', d: 'Sans CYP17 (complément), la zone glomérulée ne fabrique que des minéralocorticoïdes : progestérone, DOC, corticostérone, puis aldostérone par l\'aldostérone synthase. Elle obéit à l\'angiotensine II et à la kaliémie (SRAA).', spot: [[COL.g, 560, 360]] },
        { t: 'Zone fasciculée : le cortisol', d: 'Sous ACTH, la 17α-hydroxylation (CYP17) oriente vers le cortisol : 17-OHP, 11-désoxycortisol (21-hydroxylase), cortisol (11β-hydroxylase). Le cortisol freine en retour la CRH et l\'ACTH.', spot: [[COL.f, 540, 330]] },
        { t: 'Zone réticulée : les androgènes', d: 'La 17,20-lyase du CYP17 forme la DHEA, sulfatée en SDHEA, et la Δ4-androstènedione, précurseur de la testostérone. Ces androgènes dépendent de l\'ACTH (polycopié p. 73).', spot: [[COL.r, 540, 330]] },
        { t: 'Bloc en 21-hydroxylase', d: 'Choisissez le scénario : la progestérone et la 17-OHP s\'accumulent et partent vers les androgènes ; cortisol et aldostérone chutent, l\'ACTH et la rénine montent (95 % des HCS).', spot: [[COL.f, ROW[3], 200], [COL.g, ROW[4], 170], [COL.r, ROW[3], 170]] },
        { t: 'Bloc en 11β-hydroxylase', d: 'Complément : le 11-désoxycortisol et la DOC s\'accumulent ; la DOC, minéralocorticoïde, donne une HTA avec hypokaliémie et freine la rénine.', spot: [[COL.f, ROW[4], 200], [COL.g, ROW[4], 170]] }
      ]);
    }
  });
})();
