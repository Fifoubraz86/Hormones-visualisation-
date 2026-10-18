/* Loupes rein et eau : néphron et diurétiques (SRAA), deux boucles volémie / osmolalité (ADH),
   peptides natriurétiques (ADH), rein et calcium (phosphocalcique).
   Sources : polycopié CEEDMM (P1 = partie 1, P2 = partie 2, pages du PDF) ; le reste est marqué « (complément) ».
   Les valeurs affichées en direct viennent des modèles d'axes (axes-sim.js). */
(function () {
  'use strict';
  const HV = window.HV;
  const clamp = HV.clamp;
  const f1 = (v) => v.toFixed(1).replace('.', ',');
  const f2 = (v) => v.toFixed(2).replace('.', ',');
  const simOf = (id) => HV.scenes[id] && HV.scenes[id].sim;
  // Un modèle d'axe n'avance que dans la dyn de sa scène ; dans une loupe, la scène parente est masquée :
  // on fait avancer le modèle ici tant que la scène de l'axe est invisible.
  const stepSim = (id, dt) => {
    const sc = HV.scenes[id];
    if (sc && sc.sim && !(sc._op > 0)) sc.sim.step(dt);
  };
  const lab = (id, k) => { const s = simOf(id); return s ? s.lab(k) : NaN; };

  /* ---------- Petits outils de dessin ---------- */
  const chipW = (label) => Math.round(label.length * 9.2 + 24);
  function chip(a, x, y, label, key, c, parent) {
    const w = chipW(label);
    const g = a.el('g', { class: 'zr-chip', transform: `translate(${x} ${y})`, 'data-info': key, style: `--c: var(--${c})` }, parent);
    a.el('rect', { x: 0, y: -15, width: w, height: 30, rx: 15 }, g);
    a.text(w / 2, 6, label, 'zr-chip-t', { anchor: 'middle' }, g);
    return w;
  }
  function pill(a, x, y, label, key, none, parent) {
    const w = chipW(label);
    const g = a.el('g', { class: 'zr-pill' + (none ? ' none' : ''), transform: `translate(${x} ${y})`, 'data-info': key }, parent);
    a.el('rect', { x: 0, y: -16, width: w, height: 32, rx: 8 }, g);
    a.text(w / 2, 6, label, 'zr-chip-t', { anchor: 'middle' }, g);
    return w;
  }
  function badge(a, x, y, n, c, parent) {
    const g = a.el('g', { class: 'zr-badge', transform: `translate(${x} ${y})`, style: `--c: var(--${c})` }, parent);
    a.el('circle', { r: 16 }, g);
    a.text(0, 6, String(n), 'zr-num', { anchor: 'middle' }, g);
    return g;
  }
  function arrowDefs(a, id) {
    const defs = a.el('defs');
    const m = a.el('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    a.el('path', { d: 'M 0,0 L 10,5 L 0,10 Z', class: 'zr-head' }, m);
    return defs;
  }
  // Glyphe local (particule) : pastille colorée avec une étiquette.
  function glyph(a, defs, id, cls, t) {
    const g = a.el('g', { id: 'mol-' + id }, defs);
    a.el('circle', { r: 6.5, class: cls }, g);
    a.text(0, 1.8, t, 'zr-mol-t', { anchor: 'middle' }, g);
  }

  /* ---------- Néphron commun (repère de la scène : x 50–790, y 160–950) ---------- */
  const NP = {
    pct: 'M 458,272 C 420,292 400,252 380,222 C 360,190 318,190 310,226 C 302,262 342,272 332,302 C 322,334 280,322 280,352 L 280,430',
    thin: 'M 280,430 L 280,880 C 280,935 370,935 370,880 L 370,650',
    tal: 'M 370,650 L 370,420 C 370,370 430,332 480,296',
    dct: 'M 480,296 C 520,340 560,362 590,334 C 620,304 650,304 662,332 C 674,362 704,370 740,350',
    cd: 'M 740,190 L 740,935'
  };
  const SEGC = { pct: 'p-orange', thin: 'p-sky', tal: 'p-teal', dct: 'p-violet', cd: 'p-blue' };
  function drawNephron(a, o) {
    const zones = a.el('g', { 'data-info': o.zoneInfo || 'zr-grad' });
    if (o.grad) {
      const defs = a.el('defs');
      const lg = a.el('linearGradient', { id: o.grad, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      [[0, 0.04], [0.33, 0.1], [0.62, 0.22], [1, 0.42]].forEach(([off, op]) => a.el('stop', { offset: off, style: `stop-color: var(--p-amber); stop-opacity: ${op}` }, lg));
      a.el('rect', { x: 50, y: 160, width: 740, height: 790, rx: 18, class: 'zr-zone', fill: `url(#${o.grad})` }, zones);
    } else {
      a.el('rect', { x: 50, y: 160, width: 740, height: 790, rx: 18, class: 'zr-zone', fill: 'color-mix(in srgb, var(--o-kidney) 6%, transparent)' }, zones);
    }
    a.path('M 50,420 L 790,420 M 50,650 L 790,650', 'zr-zone-line', zones);
    // Glomérule : capsule de Bowman et peloton capillaire.
    const glom = a.el('g', { 'data-info': 'zr-glom' });
    a.el('circle', { cx: 500, cy: 245, r: 50, class: 'zr-caps' }, glom);
    a.path('M 476,236 C 470,210 500,206 500,228 C 500,206 530,212 522,236 C 540,248 524,272 506,262 C 506,280 478,276 482,258 C 462,258 462,238 476,236 Z', 'zr-tuft', glom);
    const segs = {};
    ['pct', 'thin', 'tal', 'dct', 'cd'].forEach((k) => {
      const g = a.el('g', { class: 'zr-segg', 'data-info': 'zr-' + k, style: `--c: var(--${SEGC[k]})` });
      a.path(NP[k], 'zr-hit', g);
      segs[k] = a.path(NP[k], 'zr-seg' + (k === 'thin' ? ' thin' : k === 'cd' ? ' cd' : ''), g);
    });
    a.el('circle', { cx: 478, cy: 298, r: 9, class: 'zr-md', 'data-info': 'zr-md' });
    const pt = (k, f) => { const p = segs[k], L = p.getTotalLength(); const q = p.getPointAtLength(L * f); return [q.x, q.y]; };
    return { segs, pt };
  }

  /* ================================================================
     1. Néphron et diurétiques (loupe du SRAA)
     ================================================================ */
  Object.assign(HV.INFO, {
    'zr-glom': { t: 'Glomérule', k: 'Filtration du plasma', d: 'Le plasma est filtré dans la capsule de Bowman : l\'ultrafiltrat contient l\'eau, le sodium, le glucose, le phosphate et le calcium ionisé, qui constitue le calcium ultrafiltrable (P1 p. 36-37) ; les protéines restent dans le sang (complément).' },
    'zr-pct': { t: 'Tube contourné proximal', k: 'Le gros de la réabsorption, iso-osmotique', d: 'Réabsorbe environ 65 % du sodium et de l\'eau filtrés (complément), 65 % du calcium filtré (P1 p. 37) et, normalement, tout le glucose filtré par SGLT2 (P2 p. 31). C\'est aussi le site de la 1α-hydroxylation de la vitamine D sous l\'action de la PTH (P1 p. 37).' },
    'zr-thin': { t: 'Anse de Henlé, branches fines', k: 'Branche descendante perméable à l\'eau (complément)', d: 'La branche descendante laisse sortir l\'eau vers l\'interstitium, de plus en plus concentré vers la papille : le liquide tubulaire se concentre. La branche ascendante fine est imperméable à l\'eau (complément).' },
    'zr-tal': { t: 'Branche ascendante large de Henlé', k: 'Segment de dilution · imperméable à l\'eau (complément)', d: 'Réabsorbe environ 25 % du sodium filtré par NKCC2 (complément) et 25 % du calcium filtré (P1 p. 37), par voie paracellulaire avec le magnésium (complément). Le NaCl réabsorbé sans eau dilue l\'urine et alimente le gradient corticopapillaire.' },
    'zr-dct': { t: 'Tube contourné distal', k: 'NCC · TRPV5', d: 'Réabsorbe environ 5 à 10 % du sodium filtré par le cotransporteur Na⁺-Cl⁻ NCC (complément). Une réabsorption complémentaire de calcium y a lieu sous l\'action de la PTH (P1 p. 37) et de la 1,25-dihydroxyvitamine D (P1 p. 38).' },
    'zr-cd': { t: 'Tube collecteur', k: 'Réglage fin : aldostérone et ADH', d: 'Cellules principales : l\'aldostérone, via le récepteur des minéralocorticoïdes, augmente la réabsorption du sodium par ENaC en échange du potassium et des ions H⁺ sécrétés (P1 p. 75). L\'ADH, via son récepteur V2, fait réabsorber l\'eau par des aquaporines (P1 p. 50).' },
    'zr-md': { t: 'Macula densa', k: 'Appareil juxtaglomérulaire (complément)', d: 'Cellules de la branche ascendante large au contact de leur propre glomérule : elles détectent le NaCl délivré et modulent la sécrétion de rénine (complément). L\'appareil juxtaglomérulaire libère la rénine (P1 p. 72).' },
    'zr-grad': { t: 'Gradient corticopapillaire', k: '≈ 300 mosmol/kg dans le cortex → ≈ 1 200 à la papille (complément)', d: 'L\'anse de Henlé (multiplication à contre-courant) et l\'urée concentrent l\'interstitium médullaire. En présence d\'ADH, le tube collecteur devient perméable à l\'eau et l\'urine s\'équilibre avec ce gradient : elle peut atteindre environ 1 200 mosmol/kg (complément). Les diurétiques de l\'anse effondrent ce gradient.' },
    'zr-sglt2': { t: 'SGLT2', k: 'Cotransporteur sodium – glucose', d: 'Réabsorbe tout le glucose filtré au tube contourné proximal : pas de glycosurie normalement ; au-delà de 1,80 g/L de glycémie, ses capacités sont dépassées (P2 p. 31).' },
    'zr-nhe3': { t: 'NHE3', k: 'Échangeur Na⁺/H⁺ apical (complément)', d: 'Principale entrée du sodium au tube proximal ; le H⁺ sécrété permet la réabsorption du bicarbonate filtré avec l\'anhydrase carbonique.' },
    'zr-ac': { t: 'Anhydrase carbonique', k: 'Réabsorption du bicarbonate (complément)', d: 'Cible de l\'acétazolamide. Son inhibition fait perdre du bicarbonate de sodium : diurèse modeste, acidose métabolique.' },
    'zr-npt2a': { t: 'NPT2a', k: 'Cotransporteur sodium – phosphate (complément)', d: 'Principale voie de réabsorption du phosphate filtré. La PTH augmente l\'excrétion rénale du phosphore (P1 p. 41) en réduisant ces transporteurs ; le FGF23 agit de même (complément).' },
    'zr-capass': { t: 'Calcium : voie paracellulaire passive', k: '65 % du calcium filtré (P1 p. 37)', d: 'Au tube proximal, le calcium suit la réabsorption du sodium et de l\'eau, entre les cellules (complément).' },
    'zr-aqp1': { t: 'Aquaporine 1', k: 'Branche descendante (complément)', d: 'Canal à eau constitutif, non régulé par l\'ADH.' },
    'zr-nkcc2': { t: 'NKCC2', k: 'Cotransporteur Na⁺-K⁺-2Cl⁻ (complément)', d: 'Cible des diurétiques de l\'anse (furosémide, bumétanide).' },
    'zr-romk': { t: 'ROMK', k: 'Canal potassique apical (complément)', d: 'Dans l\'anse, il recycle le K⁺ vers la lumière : la lumière devient positive, ce qui pousse le calcium et le magnésium entre les cellules. Dans le tube collecteur, il sécrète le K⁺ (sous aldostérone).' },
    'zr-casr': { t: 'CaSR de l\'anse', k: 'Récepteur sensible au calcium (P1 p. 37-38)', d: 'Exprimé dans la branche ascendante de Henlé. Quand la calcémie baisse, son inhibition stimule la réabsorption de calcium et diminue la calciurie (P1 p. 38) ; quand elle monte, son activation freine cette réabsorption (complément).' },
    'zr-para': { t: 'Voie paracellulaire Ca²⁺ / Mg²⁺', k: 'Jonctions serrées, claudines (complément)', d: '25 % du calcium filtré sont réabsorbés dans la branche ascendante, régulés par la PTH et le calcium lui-même via le CaSR (P1 p. 37).' },
    'zr-ncc': { t: 'NCC', k: 'Cotransporteur Na⁺-Cl⁻ (complément)', d: 'Cible des diurétiques thiazidiques.' },
    'zr-trpv5': { t: 'TRPV5', k: 'Canal calcique apical du tube distal (complément)', d: 'Porte d\'entrée de la réabsorption active de calcium au tube distal, stimulée par la PTH (P1 p. 37) et le calcitriol (P1 p. 38).' },
    'zr-enac': { t: 'ENaC', k: 'Canal sodique épithélial (P1 p. 75)', d: 'L\'aldostérone augmente la réabsorption du sodium par ENaC dans les cellules principales, en échange du K⁺ et du H⁺ sécrétés dans l\'urine (P1 p. 75). Cible de l\'amiloride (complément).' },
    'zr-aqp2': { t: 'Aquaporine 2', k: 'Sous ADH, via le récepteur V2 (P1 p. 50)', d: 'L\'ADH se lie au récepteur V2 du tubule rénal et entraîne la réabsorption de l\'eau via des aquaporines membranaires (P1 p. 50). Insérées dans la membrane apicale du tube collecteur (complément).' },
    'zr-d-pct': { t: 'Inhibiteurs de SGLT2 et acétazolamide', k: 'Tube proximal (complément)', d: 'Gliflozines : glycosurie et natriurèse modestes. Acétazolamide : inhibe l\'anhydrase carbonique, perte de bicarbonate, acidose métabolique et hypokaliémie. Le sodium non réabsorbé est en grande partie récupéré plus loin : diurèse modeste.' },
    'zr-d-thin': { t: 'Pas de diurétique propre', k: 'Branche descendante (complément)', d: 'Aucun diurétique usuel ne cible spécifiquement la branche descendante.' },
    'zr-d-tal': { t: 'Diurétiques de l\'anse', k: 'Furosémide, bumétanide (complément)', d: 'Bloquent NKCC2 : natriurèse puissante, gradient médullaire effondré. Ils suppriment la différence de potentiel qui pousse le calcium et le magnésium : hypercalciurie, hypomagnésémie. Davantage de sodium arrive au tube collecteur : kaliurèse, hypokaliémie.' },
    'zr-d-dct': { t: 'Diurétiques thiazidiques', k: 'Hydrochlorothiazide, indapamide (complément)', d: 'Bloquent NCC : natriurèse modérée, hypokaliémie. Ils augmentent la réabsorption du calcium : hypocalciurie (utilisés dans les lithiases calciques). Ils altèrent la dilution de l\'urine : risque d\'hyponatrémie.' },
    'zr-d-cd': { t: 'Diurétiques épargneurs de potassium', k: 'Spironolactone, éplérénone, amiloride (complément)', d: 'Les antagonistes du récepteur des minéralocorticoïdes (spironolactone, éplérénone) et l\'amiloride (bloqueur d\'ENaC) réduisent la réabsorption du sodium et la sécrétion du potassium : risque d\'hyperkaliémie.' },
    'zr-d-vap': { t: 'Vaptans', k: 'Antagonistes du récepteur V2 (tolvaptan) (complément)', d: 'Bloquent l\'effet de l\'ADH : élimination d\'eau libre (aquarèse) sans perte de sodium, la natrémie remonte. Utilisés dans certaines hyponatrémies (SIADH).' },
    'zr-live1': { t: 'En direct', k: 'Modèles du SRAA et de l\'ADH', d: 'Changez de scénario dans le panneau (hyperaldostéronisme, insuffisance surrénale) : les flux de Na⁺ et de K⁺ du tube collecteur suivent l\'aldostérone ; le flux d\'eau suit l\'effet de l\'ADH.' }
  });

  const defN = HV.scene(Object.assign({
    id: 'nephron-full', parent: 'raa', loupe: 'Néphron et diurétiques',
    title: 'Néphron et diurétiques', level: 'Organe',
    lead: 'Le néphron réabsorbe l\'essentiel de ce que filtre le glomérule, segment par segment : le tube proximal en masse, l\'anse de Henlé en créant le gradient médullaire, le tube distal et le tube collecteur en réglage fin, sous l\'aldostérone (sodium, potassium) et l\'ADH (eau). Chaque classe de diurétiques bloque un transporteur précis, d\'où des effets différents sur le potassium et le calcium.',
    points: [
      'Calcium : 65 % réabsorbés au tube proximal, 25 % dans la branche ascendante de Henlé (sous le contrôle du CaSR et de la PTH), complément au tube distal sous PTH (P1 p. 37).',
      'Aldostérone → ENaC des cellules principales : Na⁺ réabsorbé contre K⁺ et H⁺ (P1 p. 75). ADH → récepteur V2 → aquaporines (P1 p. 50).',
      'Diurétiques de l\'anse : hypokaliémie et hypercalciurie ; thiazidiques : hypokaliémie et hypocalciurie ; épargneurs : hyperkaliémie ; vaptans : perte d\'eau libre (complément).',
      'Tout diurétique agissant en amont du tube collecteur y apporte plus de sodium : la sécrétion de potassium augmente (complément).'
    ],
    legend: new Set(['nai', 'k', 'ca', 'water', 'glucose', 'aldo', 'adh']),
    build(g, a) {
      a.frame('Néphron et diurétiques', 'Du glomérule au tube collecteur : transporteurs, hormones et sites d\'action');
      defN.sim = simOf('raa');
      const raa = () => simOf('raa').s, adh = () => simOf('adh').s;
      const N = drawNephron(a, { grad: 'zr-grad-n' });
      // Zones et gradient
      a.text(66, 192, 'Cortex', 'lbl-s strong', null, null);
      a.text(66, 214, '≈ 300 mosmol/kg', 'note');
      a.text(66, 452, 'Médullaire externe', 'lbl-s strong');
      a.text(66, 682, 'Médullaire interne', 'lbl-s strong');
      a.text(66, 912, 'Papille', 'lbl-s strong');
      a.text(66, 934, '≈ 1 200 mosmol/kg', 'note');
      a.text(565, 236, 'glomérule', 'note strong', { attrs: { 'data-info': 'zr-glom' } });
      a.text(565, 258, 'filtration', 'note');
      a.path('M 490,296 L 558,284', 'connector');
      a.text(565, 290, 'macula densa', 'note', { attrs: { 'data-info': 'zr-md' } });
      // Numéros des segments sur le tube
      const bpos = [['pct', 0.5], ['thin', 0.45], ['tal', 0.42], ['dct', 0.55], ['cd', 0.47]];
      bpos.forEach(([k, f], i) => { const p = N.pt(k, f); badge(a, p[0], p[1], i + 1, SEGC[k]); });
      // Annotations courtes sur le dessin
      a.text(440, 480, 'NaCl réabsorbé', 'note strong', { attrs: { 'data-info': 'zr-tal' } });
      a.text(440, 504, 'sans eau : l\'urine se dilue', 'note');
      a.text(440, 528, 'et l\'interstitium se concentre', 'note');
      a.text(232, 600, 'H₂O', 'note strong', { anchor: 'end', attrs: { 'data-info': 'zr-aqp1' } });
      a.text(690, 694, 'H₂O : AQP2 (ADH)', 'note strong', { anchor: 'end', attrs: { 'data-info': 'zr-aqp2' } });
      a.text(728, 182, 'ENaC, ROMK', 'note strong', { anchor: 'end', attrs: { 'data-info': 'zr-enac' } });
      a.text(728, 203, '(aldostérone)', 'note', { anchor: 'end' });
      a.text(758, 968, 'urine', 'note strong');
      HV.figBadge(a, 120, 300, ['29']);

      // Flux : liquide tubulaire, réabsorptions, sécrétion de K⁺
      const tub = NP.pct + ' ' + NP.thin.replace('M 280,430', 'L 280,430') + ' ' + NP.tal.replace('M 370,650', 'L 370,650') + ' ' + NP.dct.replace('M 480,296', 'L 480,296');
      a.flow(tub, { mol: 'dot', style: 'fill: var(--p-sky)', rate: () => 1.2, size: 1, speed: 120, track: false, max: 40 });
      a.flow('M 305,250 L 238,262', { mol: 'nai', rate: () => 1.4, size: 1.6, speed: 40, track: false });
      a.flow('M 322,292 L 246,300', { mol: 'glucose', rate: () => 0.9, size: 1.5, speed: 40, track: false });
      a.flow('M 280,385 L 236,385', { mol: 'water', rate: () => 1.2, size: 1.6, speed: 35, track: false });
      [560, 640, 760, 830].forEach((y) => a.flow(`M 280,${y} L 234,${y}`, { mol: 'water', rate: () => 0.8, size: 1.6, speed: 30, track: false }));
      [455, 590, 625].forEach((y) => a.flow(`M 372,${y} L 424,${y}`, { mol: 'nai', rate: () => 0.9, size: 1.5, speed: 30, track: false }));
      a.flow('M 372,560 L 424,566', { mol: 'ca', rate: () => 0.5, size: 1.4, speed: 30, track: false });
      const pd = N.pt('dct', 0.62);
      a.flow(`M ${pd[0]},${pd[1]} L ${pd[0]},${pd[1] + 52}`, { mol: 'nai', rate: () => 0.7, size: 1.5, speed: 30, track: false });
      a.flow(`M ${pd[0] - 34},${pd[1] - 6} L ${pd[0] - 34},${pd[1] + 46}`, { mol: 'ca', rate: () => 0.4 * Math.sqrt(simOf('phospho') ? simOf('phospho').s.pth : 1), size: 1.4, speed: 30, track: false });
      a.flow('M 742,262 L 792,262', { mol: 'nai', rate: () => 1.1 * clamp(raa().aldo, 0.05, 5), pace: () => HV.paceOf(raa().aldo), size: 1.6, speed: 30, track: false, max: 12 });
      a.flow('M 792,300 L 744,300', { mol: 'k', rate: () => 0.9 * clamp(raa().aldo, 0.05, 5), pace: () => HV.paceOf(raa().aldo), size: 1.5, speed: 30, track: false, max: 12 });
      [730, 790, 850, 905].forEach((y) => a.flow(`M 738,${y} L 694,${y}`, { mol: 'water', rate: () => 1.1 * clamp(adh().eff, 0, 1.5), size: 1.6, speed: 30, track: false }));
      a.flow('M 740,920 L 740,985', { mol: 'water', rate: () => 0.5 + 0.8 * clamp(1.2 - adh().eff, 0.1, 1.2), size: 1.5, speed: 40, track: false });

      // Fiches des segments, à droite
      const X = 815, W = 740, H = 144;
      const CARDS = [
        { k: 'pct', t: 'Tube contourné proximal', share: 'Na⁺ ≈ 65 % · Ca²⁺ 65 %', chips: [['SGLT2', 'zr-sglt2'], ['NHE3', 'zr-nhe3'], ['anh. carbonique', 'zr-ac'], ['NPT2a (phosphate)', 'zr-npt2a'], ['Ca²⁺ passif', 'zr-capass']], pills: [['iSGLT2 · acétazolamide', 'zr-d-pct']], fx: 'diurèse modeste', e: 'K⁺ ↓ et acidose métabolique (acétazolamide) · glycosurie (iSGLT2)' },
        { k: 'thin', t: 'Anse de Henlé, branche descendante', share: 'perméable à l\'eau', chips: [['AQP1 (eau)', 'zr-aqp1']], pills: [['pas de diurétique propre', 'zr-d-thin', true]], fx: 'l\'eau sort vers l\'interstitium', e: 'Le liquide tubulaire se concentre jusqu\'à la papille' },
        { k: 'tal', t: 'Branche ascendante large', share: 'Na⁺ ≈ 25 % · Ca²⁺ 25 %', chips: [['NKCC2', 'zr-nkcc2'], ['ROMK', 'zr-romk'], ['CaSR', 'zr-casr'], ['Ca²⁺ / Mg²⁺ paracellulaire', 'zr-para']], pills: [['furosémide (anse)', 'zr-d-tal']], fx: 'natriurèse puissante', e: 'K⁺ ↓ (hypokaliémie) · Ca²⁺ urinaire ↑ (hypercalciurie) · Mg²⁺ ↓' },
        { k: 'dct', t: 'Tube contourné distal', share: 'Na⁺ ≈ 5 à 10 %', chips: [['NCC (Na⁺-Cl⁻)', 'zr-ncc'], ['TRPV5 (Ca²⁺, PTH)', 'zr-trpv5']], pills: [['thiazidiques', 'zr-d-dct']], fx: 'natriurèse modérée', e: 'K⁺ ↓ (hypokaliémie) · Ca²⁺ urinaire ↓ (hypocalciurie) · Na⁺ ↓ possible' },
        { k: 'cd', t: 'Tube collecteur', share: 'Na⁺ ≈ 2 à 5 %', chips: [['ENaC (aldostérone)', 'zr-enac'], ['ROMK (K⁺)', 'zr-romk'], ['AQP2 (ADH, V2)', 'zr-aqp2']], pills: [['spironolactone · amiloride', 'zr-d-cd'], ['vaptans', 'zr-d-vap']], fx: '', e: 'K⁺ ↑ (épargneurs, hyperkaliémie) · vaptans : perte d\'eau libre, Na⁺ ↑' }
      ];
      const cardY = (i) => 165 + i * 152;
      CARDS.forEach((C, i) => {
        const y = cardY(i);
        const cg = a.el('g', { style: `--c: var(--${SEGC[C.k]})` });
        a.el('rect', { x: X, y, width: W, height: H, rx: 16, class: 'zr-card', 'data-info': 'zr-' + C.k }, cg);
        badge(a, X + 26, y + 26, i + 1, SEGC[C.k], cg);
        a.text(X + 52, y + 31, C.t, 'lbl-s strong', { attrs: { 'data-info': 'zr-' + C.k } }, cg);
        a.text(X + W - 18, y + 31, C.share, 'zr-share', { anchor: 'end' }, cg);
        let cx = X + 18;
        C.chips.forEach(([l, key]) => { cx += chip(a, cx, y + 60, l, key, SEGC[C.k], cg) + 10; });
        let px = X + 18;
        C.pills.forEach(([l, key, none]) => { px += pill(a, px, y + 95, l, key, none, cg) + 12; });
        if (C.fx) a.text(px + 2, y + 101, C.fx, 'note', null, cg);
        a.text(X + 18, y + 131, C.e, 'note strong', null, cg);
      });
      const live = a.text(X + 4, 946, '', 'note strong', { attrs: { 'data-info': 'zr-live1' } });
      a.text(X + 4, 972, 'En amont du tube collecteur, tout diurétique augmente la kaliurèse (complément).', 'note');

      let tt = 0;
      a.dyn((dt) => {
        stepSim('raa', dt); stepSim('adh', dt);
        tt -= dt;
        if (tt > 0) return;
        tt = 0.3;
        live.textContent = 'En direct · aldostérone ' + Math.round(lab('raa', 'aldo')) + ' pmol/L · K⁺ ' + f1(lab('raa', 'k')) + ' mmol/L · urines ' + Math.round(lab('adh', 'uosm')) + ' mosmol/kg';
      });

      const sp = (i) => [X - 6, cardY(i) - 6, W + 12, H + 12];
      HV.spotlight(defN, a, [
        { t: 'Le glomérule filtre', d: 'Le plasma est filtré dans la capsule de Bowman : eau, sodium, glucose, phosphate et calcium ionisé (calcium ultrafiltrable, P1 p. 36) passent dans le tube. Tout ce qui n\'est pas réabsorbé ensuite part dans l\'urine.', spot: [[500, 245, 80]] },
        { t: '1. Tube proximal : la masse', d: 'Environ 65 % du sodium et de l\'eau (complément), 65 % du calcium (P1 p. 37), tout le glucose par SGLT2 (P2 p. 31), l\'essentiel du phosphate par NPT2a (complément). Inhibiteurs de SGLT2 et acétazolamide y agissent ; leur effet diurétique reste modeste.', spot: [[350, 270, 130], sp(0)] },
        { t: '2. Branche descendante : l\'eau sort', d: 'Perméable à l\'eau (aquaporine 1) mais pas au NaCl : l\'eau gagne l\'interstitium, de plus en plus concentré vers la papille (complément).', spot: [[280, 690, 110], sp(1)] },
        { t: '3. Branche ascendante large : le moteur du gradient', d: 'NKCC2 réabsorbe le NaCl sans eau (environ 25 % du sodium, complément) ; ROMK recycle le K⁺ et rend la lumière positive, ce qui pousse le Ca²⁺ et le Mg²⁺ entre les cellules (25 % du calcium, P1 p. 37), sous le contrôle du CaSR. Le furosémide bloque NKCC2 : hypokaliémie, hypercalciurie, gradient effondré.', spot: [[450, 540, 165], sp(2)] },
        { t: '4. Tube distal : NCC et calcium sous PTH', d: 'NCC réabsorbe 5 à 10 % du sodium (complément) ; la PTH et le calcitriol stimulent la réabsorption complémentaire de calcium (P1 p. 37-38). Les thiazidiques bloquent NCC : hypokaliémie mais hypocalciurie.', spot: [[600, 330, 100], sp(3)] },
        { t: '5. Tube collecteur : aldostérone et ADH', d: 'L\'aldostérone fait réabsorber le Na⁺ par ENaC contre le K⁺ et le H⁺ (P1 p. 75) ; l\'ADH, via V2, insère les aquaporines et l\'urine s\'équilibre avec l\'interstitium (P1 p. 50). Spironolactone et amiloride épargnent le K⁺ (hyperkaliémie) ; les vaptans bloquent V2 (complément).', spot: [[740, 560, 120], sp(4)] },
        { t: 'Gradient et potassium', d: 'Le gradient corticopapillaire (≈ 300 à ≈ 1 200 mosmol/kg, complément) permet de concentrer l\'urine. Tout diurétique agissant en amont du tube collecteur y délivre plus de sodium et augmente la sécrétion de potassium : seuls les épargneurs y échappent (complément).', spot: [[150, 560, 120], [X - 6, 920, W + 12, 64]] }
      ]);
    }
  }, HV.LOUPE.R(1)));

  /* ================================================================
     2. Volémie et osmolalité : deux boucles (loupe de l'ADH)
     ================================================================ */
  Object.assign(HV.INFO, {
    'zr-w1': { t: 'Osmolalité plasmatique', k: 'Grandeur réglée par la boucle de l\'eau', d: 'Elle dépend surtout du sodium et de ses anions. Une baisse traduit un excès d\'eau, une hausse un manque d\'eau (complément). La rétention d\'eau du SIADH abaisse l\'osmolalité plasmatique (P1 p. 64).', live: () => Math.round(lab('adh', 'posm')) + ' mosmol/kg (modèle)' },
    'zr-w2': { t: 'Osmorécepteurs', k: 'Hypothalamus antérieur (complément)', d: 'Ils détectent de faibles variations de l\'osmolalité et commandent la sécrétion d\'ADH et la soif (complément).' },
    'zr-w3': { t: 'ADH et soif', k: 'Noyaux supra-optiques et paraventriculaires (P1 p. 50)', d: 'L\'ADH transite le long des axones de la tige pituitaire, est stockée dans la posthypophyse et libérée dans le sang (P1 p. 50). La soif apporte l\'eau qui corrige un déficit (complément).', live: () => 'ADH ×' + f1(simOf('adh').s.adh) + ' (modèle)' },
    'zr-w4': { t: 'Rein : eau libre', k: 'Récepteur V2 → aquaporines (P1 p. 50)', d: 'Avec l\'ADH, l\'urine se concentre et l\'eau libre est retenue ; sans ADH (diabète insipide), urines diluées < 200 mosmol/kg et polyurie > 3 L/24 h (P1 p. 64).', live: () => Math.round(lab('adh', 'uosm')) + ' mosmol/kg · ' + f1(lab('adh', 'diur')) + ' L/24 h (modèle)' },
    'zr-w5': { t: 'Natrémie', k: 'Reflet du bilan d\'eau', d: 'Retenir de l\'eau dilue le sodium : dans le SIADH, l\'hyponatrémie est souvent < 120 mmol/L, sans œdème (P1 p. 63-64). Perdre de l\'eau sans boire la fait monter (P1 p. 64).', live: () => 'Na⁺ ' + Math.round(simOf('adh').s.na) + ' mmol/L (modèle)' },
    'zr-s1': { t: 'Volémie efficace', k: 'Grandeur réglée par la boucle du sodium (complément)', d: 'Remplissage du secteur artériel perçu par les capteurs de pression. Le volume extracellulaire dépend du sodium total (complément).', live: () => 'volume ×' + f2(simOf('raa').s.vol) + ' · PAS ' + Math.round(lab('raa', 'pas')) + ' mmHg (modèle)' },
    'zr-s2': { t: 'Capteurs de volume', k: 'Barorécepteurs, appareil juxtaglomérulaire, oreillettes (complément)', d: 'Une hypovolémie, une baisse de la pression artérielle ou de la perfusion rénale stimulent la rénine (P1 p. 74-75). Les oreillettes distendues libèrent l\'ANP (complément).' },
    'zr-s3': { t: 'Effecteurs', k: 'SRAA, système sympathique, ANP', d: 'La rénine déclenche la cascade qui forme l\'angiotensine II, qui stimule l\'aldostérone (P1 p. 72). Le sympathique stimule la rénine et la réabsorption de sodium ; l\'ANP s\'y oppose (complément).', live: () => 'rénine ' + f1(lab('raa', 'renin')) + ' mUI/L · aldostérone ' + Math.round(lab('raa', 'aldo')) + ' pmol/L (modèle)' },
    'zr-s4': { t: 'Rein : natriurèse', k: 'Aldostérone → ENaC (P1 p. 75)', d: 'L\'aldostérone augmente la réabsorption du sodium par ENaC en échange du potassium et des ions H⁺ (P1 p. 75) ; l\'ANP augmente la natriurèse (complément).', live: () => 'K⁺ ' + f1(lab('raa', 'k')) + ' mmol/L (modèle)' },
    'zr-s5': { t: 'Volume extracellulaire', k: 'Reflet du bilan de sodium', d: 'Le sodium retenu entraîne l\'eau pour garder une osmolarité normale : c\'est une expansion volémique (P1 p. 75), et la natrémie bouge peu (à la limite supérieure dans l\'hyperaldostéronisme primaire, P1 p. 76). L\'expansion met au repos la rénine (P1 p. 75).' },
    'zr-cross': { t: 'Quand la volémie prime', k: 'Sécrétion non osmotique d\'ADH (complément)', d: 'Une hypovolémie importante stimule l\'ADH même si l\'osmolalité est basse : l\'eau est retenue et une hyponatrémie peut apparaître (complément). L\'ADH exerce aussi un puissant effet vasopresseur en cas de chute brutale de la pression artérielle (P1 p. 50).' },
    'zr-msg': { t: 'Le message clé', k: 'Natrémie = eau ; volémie = sodium (complément)', d: 'Une natrémie anormale renseigne sur le bilan d\'eau ; l\'état du volume extracellulaire (œdèmes, déshydratation extracellulaire) renseigne sur le bilan de sodium. Le SIADH retient de l\'eau sans œdème (P1 p. 63).' }
  });

  const defV = HV.scene(Object.assign({
    id: 'vol-osm', parent: 'adh', loupe: 'Volémie et osmolalité',
    title: 'Volémie et osmolalité : deux boucles', level: 'Notion',
    lead: 'Deux boucles de régulation travaillent en parallèle. La boucle de l\'eau règle l\'osmolalité par l\'ADH et la soif : elle détermine la natrémie. La boucle du sodium règle la volémie par le SRAA, le système sympathique et les peptides natriurétiques : elle détermine le volume extracellulaire.',
    points: [
      'La natrémie reflète le bilan d\'eau ; la volémie reflète le bilan de sodium (complément).',
      'L\'ADH (noyaux supra-optiques et paraventriculaires) agit sur le récepteur V2 et les aquaporines (P1 p. 50).',
      'L\'aldostérone retient le sodium par ENaC ; l\'eau suit pour garder une osmolarité normale : expansion volémique (P1 p. 75).',
      'Une hypovolémie importante stimule l\'ADH indépendamment de l\'osmolalité (complément).',
      'Valeurs en direct : modèle de l\'ADH (scénarios du panneau) et modèle du SRAA.'
    ],
    legend: new Set(['adh', 'water', 'renin', 'aldo', 'nai']),
    build(g, a) {
      a.frame('Volémie et osmolalité : deux boucles', 'La natrémie reflète l\'eau, la volémie reflète le sodium');
      defV.sim = simOf('adh');
      arrowDefs(a, 'zr-ah-v');
      const Wcol = { cx: 415, c: 'p-sky', title: 'Boucle de l\'eau', sub: 'règle l\'osmolalité → la natrémie', icons: ['vessel', 'hypothalamusIcon', null, 'kidney', null] };
      const Scol = { cx: 1185, c: 'p-teal', title: 'Boucle du sodium', sub: 'règle la volémie → le volume extracellulaire', icons: ['vessel', 'heart', 'adrenalKidney', 'kidney', null] };
      const BW = 520, BH = 100, Y0 = 232, GAP = 26;
      const by = (i) => Y0 + i * (BH + GAP);
      const BOX = {
        w: [['Osmolalité plasmatique', 'grandeur détectée', 'zr-w1'], ['Osmorécepteurs', 'hypothalamus (complément)', 'zr-w2'], ['ADH et soif', 'posthypophyse (P1 p. 50)', 'zr-w3'], ['Rein : V2 → aquaporines', 'eau libre réabsorbée (P1 p. 50)', 'zr-w4'], ['Natrémie', 'l\'eau retenue dilue le sodium', 'zr-w5']],
        s: [['Volémie efficace', 'grandeur détectée (complément)', 'zr-s1'], ['Barorécepteurs, macula densa', 'pression, perfusion rénale (P1 p. 74-75)', 'zr-s2'], ['SRAA · sympathique · ANP', 'rénine → angiotensine II → aldostérone', 'zr-s3'], ['Rein : natriurèse ajustée', 'aldostérone → ENaC (P1 p. 75)', 'zr-s4'], ['Volume extracellulaire', 'le sodium retenu entraîne l\'eau (P1 p. 75)', 'zr-s5']]
      };
      const lives = { w: [], s: [] };
      [['w', Wcol], ['s', Scol]].forEach(([key, C]) => {
        const x0 = C.cx - BW / 2;
        a.text(x0, 192, C.title, 'lbl-h');
        a.text(x0 + 230, 192, C.sub, 'note');
        BOX[key].forEach((b, i) => {
          const y = by(i);
          const bg = a.el('g', { 'data-info': b[2], style: `--c: var(--${C.c})` });
          a.el('rect', { x: x0, y, width: BW, height: BH, rx: 18, class: 'sig-box' }, bg);
          a.text(x0 + 20, y + 32, b[0], 'lbl-s strong', null, bg);
          a.text(x0 + 20, y + 58, b[1], 'note', null, bg);
          lives[key].push(a.text(x0 + 20, y + 86, '', 'zr-live', null, bg));
          if (C.icons[i]) a.organ(C.icons[i], x0 + BW + 48, y + BH / 2, 0.5, { 'data-info': b[2] });
          if (i < 4) a.path(`M ${C.cx},${y + BH + 2} L ${C.cx},${y + BH + GAP - 4}`, 'zr-arrow', null, { style: `--mc: var(--${C.c})`, 'marker-end': 'url(#zr-ah-v)' });
        });
        // Rétrocontrôle : la grandeur corrigée revient au capteur.
        const rx = x0 - 34;
        a.path(`M ${x0 - 4},${by(4) + BH / 2} L ${rx},${by(4) + BH / 2} L ${rx},${by(0) + BH / 2} L ${x0 - 8},${by(0) + BH / 2}`, 'zr-arrow ret', null, { 'marker-end': 'url(#zr-ah-v)' });
        a.sign(rx, (by(0) + by(4) + BH) / 2, 'inhib').set(1);
      });
      // Flux : ADH et eau dans la boucle de l'eau, rénine et Na⁺ dans celle du sodium.
      const adhS = () => simOf('adh').s, raaS = () => simOf('raa').s;
      a.flow(`M ${Wcol.cx + 40},${by(2) + BH} L ${Wcol.cx + 40},${by(3)}`, { mol: 'adh', rate: () => 1.2 * clamp(adhS().adh, 0, 6), pace: () => HV.paceOf(adhS().adh), size: 1.5, speed: 25, track: false, max: 8 });
      a.flow(`M ${Wcol.cx + 40},${by(3) + BH} L ${Wcol.cx + 40},${by(4)}`, { mol: 'water', rate: () => 1.4 * clamp(adhS().eff, 0, 1.5), size: 1.6, speed: 25, track: false, max: 8 });
      a.flow(`M ${Scol.cx + 40},${by(2) + BH} L ${Scol.cx + 40},${by(3)}`, { mol: 'aldo', rate: () => 1.1 * clamp(raaS().aldo, 0, 6), pace: () => HV.paceOf(raaS().aldo), size: 1.3, speed: 25, track: false, max: 8 });
      a.flow(`M ${Scol.cx + 40},${by(3) + BH} L ${Scol.cx + 40},${by(4)}`, { mol: 'nai', rate: () => 1.4 * clamp(raaS().aldo, 0.1, 4), size: 1.7, speed: 25, track: false, max: 8 });
      a.flow(`M ${Scol.cx + 40},${by(1) + BH} L ${Scol.cx + 40},${by(2)}`, { mol: 'renin', rate: () => 1.1 * clamp(raaS().renin, 0, 6), pace: () => HV.paceOf(raaS().renin), size: 1.3, speed: 25, track: false, max: 8 });
      // Lien croisé : l'hypovolémie importante stimule l'ADH (complément).
      a.el('line', { x1: 800, y1: 214, x2: 800, y2: 838, class: 'zr-divider' });
      const crossG = a.el('g', { 'data-info': 'zr-cross' });
      a.path(`M ${Scol.cx - BW / 2 - 6},${by(1) + 70} C 860,${by(1) + 90} 760,${by(2) + 20} ${Wcol.cx + BW / 2 + 8},${by(2) + 40}`, 'zr-arrow', crossG, { style: '--mc: var(--p-amber)', 'stroke-dasharray': '4 7', 'marker-end': 'url(#zr-ah-v)' });
      a.el('rect', { x: 702, y: by(2) - 30, width: 184, height: 52, rx: 10, class: 'zr-label-bg' }, crossG);
      a.text(794, by(2) - 9, 'hypovolémie sévère', 'note strong', { anchor: 'middle' }, crossG);
      a.text(794, by(2) + 13, '→ ADH non osmotique', 'note', { anchor: 'middle' }, crossG);
      // Message clé
      const mg = a.el('g', { 'data-info': 'zr-msg', style: '--c: var(--accent)' });
      a.el('rect', { x: 60, y: 862, width: 1480, height: 96, rx: 20, class: 'sig-box' }, mg);
      a.text(800, 902, 'La natrémie reflète le bilan d\'eau ; la volémie reflète le bilan de sodium.', 'zr-msg', { anchor: 'middle' }, mg);
      a.text(800, 934, 'SIADH : eau retenue, hyponatrémie sans œdème (P1 p. 63) · hyperaldostéronisme : sodium retenu, volume ↑, natrémie peu modifiée (P1 p. 75-76)', 'note', { anchor: 'middle' }, mg);

      let tt = 0;
      a.dyn((dt) => {
        stepSim('adh', dt); stepSim('raa', dt);
        tt -= dt;
        if (tt > 0) return;
        tt = 0.3;
        const s = adhS(), r = raaS();
        const L = lives.w, M = lives.s;
        L[0].textContent = Math.round(lab('adh', 'posm')) + ' mosmol/kg';
        L[1].textContent = s.na > 142 ? 'osmolalité haute : stimulés' : s.na < 138 ? 'osmolalité basse : freinés' : 'au repos (consigne)';
        L[2].textContent = 'ADH ×' + f1(s.adh) + (simOf('adh').p.siadh > 0.02 ? ' · sécrétion inappropriée' : '');
        L[3].textContent = 'urines ' + Math.round(lab('adh', 'uosm')) + ' mosmol/kg · ' + f1(lab('adh', 'diur')) + ' L/24 h';
        L[4].textContent = 'Na⁺ ' + Math.round(s.na) + ' mmol/L';
        M[0].textContent = 'volume ×' + f2(r.vol) + ' · PAS ' + Math.round(lab('raa', 'pas')) + ' mmHg';
        M[1].textContent = r.vol < 0.97 ? 'volume bas : rénine stimulée' : r.vol > 1.03 ? 'volume haut : rénine freinée' : 'perfusion normale';
        M[2].textContent = 'rénine ' + f1(lab('raa', 'renin')) + ' mUI/L · aldostérone ' + Math.round(lab('raa', 'aldo')) + ' pmol/L';
        M[3].textContent = 'K⁺ ' + f1(lab('raa', 'k')) + ' mmol/L';
        M[4].textContent = r.vol > 1.03 ? 'expansion volémique' : r.vol < 0.97 ? 'volume extracellulaire réduit' : 'volume normal';
      });

      HV.spotlight(defV, a, [
        { t: 'Deux grandeurs, deux boucles', d: 'L\'osmolalité (à gauche) et la volémie (à droite) sont détectées par des capteurs différents et corrigées par des hormones différentes (complément).', spot: [[Wcol.cx - BW / 2 - 10, by(0) - 10, BW + 20, BH + 20], [Scol.cx - BW / 2 - 10, by(0) - 10, BW + 20, BH + 20]] },
        { t: 'La boucle de l\'eau', d: 'Osmorécepteurs → ADH (noyaux supra-optiques et paraventriculaires, posthypophyse) et soif → récepteur V2 et aquaporines du rein (P1 p. 50) → eau libre retenue ou éliminée.', spot: [[Wcol.cx - BW / 2 - 10, by(1) - 10, BW + 20, 3 * BH + 2 * GAP + 20]] },
        { t: 'L\'eau fait la natrémie', d: 'L\'eau retenue dilue le sodium : le SIADH donne une hyponatrémie souvent < 120 mmol/L, sans œdème (P1 p. 63-64) ; le diabète insipide, une natrémie un peu haute quand les sorties dépassent les apports (P1 p. 64). Essayez ces scénarios dans le panneau.', spot: [[Wcol.cx - BW / 2 - 10, by(4) - 10, BW + 20, BH + 20]] },
        { t: 'La boucle du sodium', d: 'Une hypovolémie, une baisse de la pression ou de la perfusion rénale stimulent la rénine (P1 p. 74-75) → angiotensine II → aldostérone (P1 p. 72) → ENaC (P1 p. 75). Le sympathique s\'y ajoute, l\'ANP s\'y oppose (complément).', spot: [[Scol.cx - BW / 2 - 10, by(1) - 10, BW + 20, 3 * BH + 2 * GAP + 20]] },
        { t: 'Le sodium fait le volume', d: 'Le sodium réabsorbé entraîne l\'eau pour garder une osmolarité normale : expansion volémique, natrémie peu modifiée (P1 p. 75-76).', spot: [[Scol.cx - BW / 2 - 10, by(4) - 10, BW + 20, BH + 20]] },
        { t: 'Quand la volémie l\'emporte', d: 'Une hypovolémie importante stimule l\'ADH même si l\'osmolalité est basse (complément) : la défense du volume prime sur celle de l\'osmolalité.', spot: [[800, by(2) - 4, 130]] }
      ]);
    }
  }, HV.LOUPE.L(0)));

  /* ================================================================
     3. Peptides natriurétiques (loupe de l'ADH) — hors polycopié : (complément)
     ================================================================ */
  Object.assign(HV.INFO, {
    'zr-atria': { t: 'Oreillettes', k: 'Source de l\'ANP (complément)', d: 'Les myocytes auriculaires stockent l\'ANP dans des granules et le libèrent quand la paroi est étirée (expansion volémique, insuffisance cardiaque).', live: () => 'ANP ×' + f1(anpOf()) + ' (d\'après la volémie du modèle du SRAA)' },
    'zr-ventr': { t: 'Ventricules', k: 'Source principale du BNP (complément)', d: 'Le BNP est produit par les myocytes ventriculaires en réponse à l\'étirement et à la surcharge de pression ou de volume. Son précurseur, le proBNP, est clivé en BNP actif et NT-proBNP inactif.' },
    'zr-anp': { t: 'ANP', k: 'Peptide natriurétique auriculaire (complément)', d: 'Hormone de l\'expansion volémique : il fait éliminer le sodium et l\'eau et s\'oppose au SRAA.' },
    'zr-bnp': { t: 'BNP', k: 'Peptide natriurétique de type B (complément)', d: 'Mêmes effets que l\'ANP ; d\'origine surtout ventriculaire.' },
    'zr-t-kid': { t: 'Rein', k: 'Natriurèse, diurèse, DFG ↑ (complément)', d: 'Les peptides natriurétiques dilatent l\'artériole afférente (et resserrent l\'artériole efférente) : le débit de filtration glomérulaire augmente ; ils freinent la réabsorption du sodium dans le tube collecteur.' },
    'zr-t-ren': { t: 'Rénine', k: 'Freinée (complément)', d: 'Les peptides natriurétiques freinent la sécrétion de rénine de l\'appareil juxtaglomérulaire.' },
    'zr-t-ald': { t: 'Aldostérone', k: 'Freinée (complément)', d: 'Ils freinent la sécrétion d\'aldostérone par la zone glomérulée, directement et par la baisse de la rénine.' },
    'zr-t-adh': { t: 'ADH', k: 'Freinée (complément)', d: 'Ils freinent la sécrétion d\'ADH (et la soif) : davantage d\'eau éliminée.' },
    'zr-t-ves': { t: 'Vaisseaux', k: 'Vasodilatation (complément)', d: 'Relâchement du muscle lisse vasculaire (GMPc) et passage de liquide vers l\'interstitium : la pression artérielle baisse.' },
    'zr-ic': { t: 'BNP et NT-proBNP', k: 'Marqueurs d\'insuffisance cardiaque (complément)', d: 'Leur concentration augmente avec l\'étirement ventriculaire : une valeur normale rend une insuffisance cardiaque peu probable devant une dyspnée. Ils augmentent aussi avec l\'âge et l\'insuffisance rénale, et sont plus bas chez l\'obèse. Les seuils dépendent du contexte : se référer aux recommandations.' },
    'zr-nep': { t: 'Néprilysine', k: 'Endopeptidase neutre (complément)', d: 'Dégrade l\'ANP et le BNP (et d\'autres peptides). Le sacubitril l\'inhibe ; associé au valsartan (ARNI), il est utilisé dans l\'insuffisance cardiaque à fraction d\'éjection réduite. Sous sacubitril, le BNP s\'élève (moins dégradé) alors que le NT-proBNP, qui n\'est pas substrat de la néprilysine, reste interprétable.' },
    'zr-esc': { t: 'Échappement', k: 'Hyperaldostéronisme primaire (complément)', d: 'Quand l\'aldostérone est en excès, l\'expansion volémique stimule l\'ANP et la natriurèse : le sodium cesse de s\'accumuler et il n\'y a pas d\'œdème.' }
  });
  const anpOf = () => { const r = simOf('raa'); return r ? clamp(Math.exp(8 * (r.s.vol - 1)), 0.2, 8) : 1; };

  const defA = HV.scene(Object.assign({
    id: 'anp', parent: 'adh', loupe: 'Peptides natriurétiques',
    title: 'Peptides natriurétiques', level: 'Notion',
    lead: 'Contrepoids du SRAA et de l\'ADH (complément, hors polycopié) : quand les oreillettes sont distendues, elles libèrent l\'ANP ; les ventricules soumis à une surcharge libèrent le BNP. Ces peptides font éliminer le sodium et l\'eau, augmentent la filtration glomérulaire, freinent la rénine, l\'aldostérone et l\'ADH, et dilatent les vaisseaux.',
    points: [
      'Stimulus : l\'étirement des oreillettes (ANP) et des ventricules (BNP) (complément).',
      'Effets : natriurèse, DFG ↑, rénine ↓, aldostérone ↓, ADH ↓, vasodilatation (complément).',
      'BNP et NT-proBNP : marqueurs d\'insuffisance cardiaque ; la néprilysine dégrade les peptides, le sacubitril l\'inhibe (complément).',
      'L\'ANP affiché suit la volémie du modèle du SRAA : essayez l\'hyperaldostéronisme primaire dans la scène du SRAA (complément).'
    ],
    legend: new Set(['renin', 'aldo', 'adh', 'nai', 'water']),
    build(g, a) {
      a.frame('Peptides natriurétiques', 'ANP et BNP : le cœur fait éliminer le sodium (complément)');
      defA.sim = simOf('adh');
      const defs = arrowDefs(a, 'zr-ah-a');
      glyph(a, defs, 'zr-anp', 'zr-mol-anp', 'A');
      glyph(a, defs, 'zr-bnp', 'zr-mol-bnp', 'B');
      // Cœur schématique : deux oreillettes, deux ventricules
      const ra = a.el('g', { 'data-info': 'zr-atria' });
      const atria = [a.el('ellipse', { cx: 240, cy: 380, rx: 92, ry: 68, class: 'zr-atrium' }, ra), a.el('ellipse', { cx: 430, cy: 380, rx: 92, ry: 68, class: 'zr-atrium' }, ra)];
      [240, 430].forEach((cx) => { for (let k = 0; k < 7; k++) a.el('circle', { cx: cx - 51 + k * 17, cy: 372 + (k % 2) * 18, r: 4.5, class: 'zr-gran' }, ra); });
      const vg = a.el('g', { 'data-info': 'zr-ventr' });
      a.path('M 150,462 C 140,580 250,700 335,790 C 420,700 530,580 520,462 C 450,440 220,440 150,462 Z', 'zr-heart', vg);
      a.path('M 335,456 L 335,770', 'zr-septum', vg);
      for (let k = 0; k < 10; k++) a.el('circle', { cx: 230 + (k % 5) * 50, cy: 540 + Math.floor(k / 5) * 60, r: 4.5, class: 'zr-gran v' }, vg);
      a.text(335, 250, 'oreillettes distendues', 'lbl-s strong', { anchor: 'middle', attrs: { 'data-info': 'zr-atria' } });
      a.text(335, 274, 'étirement → ANP', 'note', { anchor: 'middle' });
      a.text(335, 824, 'ventricules : surcharge → BNP', 'lbl-s strong', { anchor: 'middle', attrs: { 'data-info': 'zr-ventr' } });
      a.text(335, 848, 'proBNP → BNP actif + NT-proBNP', 'note', { anchor: 'middle', attrs: { 'data-info': 'zr-ventr' } });
      const liveA = a.text(335, 900, '', 'zr-live', { anchor: 'middle', attrs: { 'data-info': 'zr-atria' } });
      a.text(335, 926, 'ANP d\'après la volémie du modèle du SRAA', 'note', { anchor: 'middle' });
      // Cibles
      const TX = 780, TW = 760, TH = 84;
      const T = [
        ['Rein : natriurèse, diurèse', 'DFG ↑ (artériole afférente dilatée)', 'zr-t-kid', 'stim', 'kidney'],
        ['Rénine ↓', 'appareil juxtaglomérulaire', 'zr-t-ren', 'inhib', null],
        ['Aldostérone ↓', 'zone glomérulée', 'zr-t-ald', 'inhib', 'adrenalKidney'],
        ['ADH ↓ (et soif)', 'posthypophyse', 'zr-t-adh', 'inhib', 'pituitaryIcon'],
        ['Vaisseaux : vasodilatation', 'pression artérielle ↓', 'zr-t-ves', 'stim', 'vessel']
      ];
      const ty = (i) => 170 + i * 102;
      const signs = [];
      T.forEach((t, i) => {
        const y = ty(i);
        const tg = a.el('g', { 'data-info': t[2], style: `--c: var(--${t[3] === 'inhib' ? 'p-grey' : 'p-rose'})` });
        a.el('rect', { x: TX, y, width: TW, height: TH, rx: 16, class: 'sig-box' }, tg);
        a.text(TX + 64, y + 36, t[0], 'lbl-s strong', null, tg);
        a.text(TX + 64, y + 62, t[1], 'note', null, tg);
        if (t[4]) a.organ(t[4], TX + TW - 60, y + TH / 2, 0.42, { 'data-info': t[2] });
        signs.push(a.sign(TX + 30, y + TH / 2, t[3]));
        const d = `M 520,${i < 3 ? 380 : 400} C 640,${i < 3 ? 380 : 400} 650,${y + TH / 2} ${TX - 26},${y + TH / 2}`;
        a.path(d, 'ax-track ' + (t[3] === 'inhib' ? 'inhib' : 'stim'), null, { style: '--mc: var(--p-rose)' });
        a.flow(d, { mol: 'zr-anp', rate: () => 0.7 * anpOf(), pace: () => HV.paceOf(anpOf()), size: 1.5, speed: 90, track: false, max: 10 });
        if (i === 0 || i === 4) a.flow(`M 470,600 C 640,600 650,${y + TH / 2 + 10} ${TX - 26},${y + TH / 2 + 10}`, { mol: 'zr-bnp', rate: () => 0.4, size: 1.5, speed: 90, track: false, max: 6 });
      });
      // Encadrés : marqueurs et néprilysine
      const ic = a.el('g', { 'data-info': 'zr-ic', style: '--c: var(--p-magenta)' });
      a.el('rect', { x: TX, y: 700, width: 370, height: 230, rx: 18, class: 'sig-box' }, ic);
      a.text(TX + 22, 736, 'BNP, NT-proBNP', 'lbl-s strong', null, ic);
      a.text(TX + 22, 764, ['Marqueurs d\'insuffisance', 'cardiaque : ils montent avec', 'l\'étirement ventriculaire.', 'Aussi ↑ avec l\'âge et', 'l\'insuffisance rénale.'], 'note', { lh: 1.3 }, ic);
      const nep = a.el('g', { 'data-info': 'zr-nep', style: '--c: var(--p-violet)' });
      a.el('rect', { x: TX + 390, y: 700, width: 370, height: 230, rx: 18, class: 'sig-box' }, nep);
      a.text(TX + 412, 736, 'Néprilysine', 'lbl-s strong', null, nep);
      a.text(TX + 412, 764, ['Dégrade l\'ANP et le BNP.', 'Sacubitril (+ valsartan) :', 'l\'inhibe, les peptides ↑.', 'Le BNP monte alors ; le', 'NT-proBNP reste fiable.'], 'note', { lh: 1.3 }, nep);
      const esc = a.text(60, 960, '', 'note strong', { attrs: { 'data-info': 'zr-esc' } });

      let tt = 0;
      a.dyn((dt) => {
        stepSim('raa', dt); stepSim('adh', dt);
        const v = anpOf(), k = clamp(Math.sqrt(v), 0.85, 1.25);
        atria[0].setAttribute('transform', `translate(240 380) scale(${k.toFixed(3)}) translate(-240 -380)`);
        atria[1].setAttribute('transform', `translate(430 380) scale(${k.toFixed(3)}) translate(-430 -380)`);
        signs.forEach((s) => s.set(clamp(v, 0.2, 2.5)));
        tt -= dt;
        if (tt > 0) return;
        tt = 0.3;
        const vol = simOf('raa').s.vol;
        liveA.textContent = 'volume ×' + f2(vol) + ' → ANP ×' + f1(v);
        esc.textContent = vol > 1.06 ? 'Expansion volémique : l\'ANP monte et limite la rétention de sodium (échappement, pas d\'œdème)' : '';
      });

      HV.spotlight(defA, a, [
        { t: 'Le cœur, organe endocrine', d: 'Les oreillettes étirées libèrent l\'ANP stocké dans leurs granules ; les ventricules en surcharge produisent le BNP (complément).', spot: [[335, 540, 290]] },
        { t: 'Le rein élimine le sodium', d: 'Dilatation de l\'artériole afférente : DFG ↑ ; moins de réabsorption de sodium dans le tube collecteur : natriurèse et diurèse (complément).', spot: [[TX - 10, ty(0) - 8, TW + 20, TH + 16]] },
        { t: 'Le SRAA et l\'ADH sont freinés', d: 'Rénine ↓, aldostérone ↓ et ADH ↓ : l\'ANP s\'oppose point par point aux hormones qui retiennent le sodium et l\'eau (complément).', spot: [[TX - 10, ty(1) - 8, TW + 20, 3 * 102 - 18 + 16]] },
        { t: 'Les vaisseaux se dilatent', d: 'La pression artérielle baisse ; une partie du liquide passe dans l\'interstitium (complément).', spot: [[TX - 10, ty(4) - 8, TW + 20, TH + 16]] },
        { t: 'BNP et NT-proBNP en clinique', d: 'Marqueurs d\'insuffisance cardiaque ; la néprilysine dégrade les peptides et le sacubitril l\'inhibe : sous sacubitril, préférer le NT-proBNP (complément).', spot: [[TX - 10, 690, TW + 20, 270]] }
      ]);
    }
  }, HV.LOUPE.L(1)));

  /* ================================================================
     4. Rein et calcium (loupe du phosphocalcique)
     ================================================================ */
  // Modèle d'affichage (qualitatif) : fractions du calcium filtré réabsorbées, modulées par le CaSR et la PTH.
  // Valeurs de référence : 65 % proximal, 25 % anse (P1 p. 37) ; tube distal et excrétion (complément).
  function caRenal() {
    const P = simOf('phospho');
    const s = P ? P.s : { ca: 2.4, pth: 1, d: 1 };
    const casr = clamp((s.ca - 2.4) / 0.4, -1, 1);
    const fP = 0.65;
    const fT = 0.25 * clamp(1 - 0.35 * casr, 0.6, 1.35);
    const fD = Math.min(0.08 * clamp(0.4 + 0.6 * Math.sqrt(Math.max(s.pth, 0)) * (0.7 + 0.3 * s.d), 0.3, 1.5), 0.995 - fP - fT);
    const load = s.ca / 2.4;
    const ex = Math.max(0.003, 1 - fP - fT - fD) * load;
    return { s, casr, fP, fT, fD: Math.max(fD, 0), ex, rel: ex / 0.02 };
  }
  Object.assign(HV.INFO, {
    'zr-c-glom': { t: 'Calcium filtré', k: 'Calcium ionisé = ultrafiltrable (P1 p. 36)', d: 'Le calcium ionisé (environ 50 % du calcium total) est filtré par le glomérule (P1 p. 35-37). Plus la calcémie est haute, plus la charge filtrée augmente.' },
    'zr-c-pct': { t: 'Tube proximal : 65 %', k: 'Passif (P1 p. 37)', d: 'Au tube contourné proximal, 65 % du calcium filtré sont réabsorbés (P1 p. 37), passivement, avec le sodium et l\'eau (complément). Une baisse du volume extracellulaire stimule la réabsorption rénale de calcium (P1 p. 38).' },
    'zr-c-tal': { t: 'Anse : 25 %', k: 'Paracellulaire, sous le CaSR (P1 p. 37-38)', d: '25 % du calcium filtré sont réabsorbés dans la branche ascendante de Henlé, régulés par la PTH et le calcium via le CaSR (P1 p. 37). En cas de baisse du calcium, l\'inhibition du CaSR stimule la réabsorption et diminue la calciurie (P1 p. 38).' },
    'zr-c-dct': { t: 'Tube distal : le complément', k: 'Sous PTH et calcitriol (P1 p. 37-38)', d: 'Une réabsorption complémentaire de calcium a lieu au tube contourné distal sous l\'action de la PTH (P1 p. 37) ; la 1,25-dihydroxyvitamine D la stimule aussi (P1 p. 38). Elle passe par le canal TRPV5 (complément).' },
    'zr-c-ex': { t: 'Calciurie', k: 'Ce qui n\'est pas réabsorbé', d: 'Normalement, le rein adapte l\'excrétion urinaire au calcium absorbé par l\'intestin : le bilan est nul (P1 p. 36). Dans l\'hyperparathyroïdie primaire, la PTH stimule la réabsorption, mais la charge filtrée dépasse les capacités : hypercalciurie, risque de lithiase (P1 p. 40-41).', live: () => { const r = caRenal(); return 'calciurie (modèle) ×' + f1(r.rel) + ' de la normale'; } },
    'zr-c-furo': { t: 'Diurétiques de l\'anse', k: 'Calciurie ↑ (complément)', d: 'En bloquant NKCC2, ils suppriment la force qui pousse le calcium entre les cellules : hypercalciurie.' },
    'zr-c-thz': { t: 'Thiazidiques', k: 'Calciurie ↓ (complément)', d: 'Ils augmentent la réabsorption du calcium (tube distal, et proximale par contraction volémique) : hypocalciurie, parfois hypercalcémie modérée.' },
    'zr-c-npt': { t: 'Phosphate : NPT2a', k: 'Freiné par la PTH (P1 p. 41) et le FGF23 (complément)', d: 'L\'excès de PTH augmente l\'excrétion rénale de phosphore : hypophosphorémie et hyperphosphaturie (P1 p. 41). Le FGF23, sécrété par l\'os, a le même effet phosphaturique (complément).', live: () => 'phosphatémie ' + f2(lab('phospho', 'phos')) + ' mmol/L (modèle)' },
    'zr-c-1a': { t: '1α-hydroxylase', k: 'Tube proximal (P1 p. 37)', d: 'Transforme la 25-hydroxyvitamine D en 1,25-dihydroxyvitamine D, la forme active, sous l\'action de la PTH (P1 p. 37-38). Le FGF23 la freine (complément).', live: () => 'calcitriol ×' + f1(simOf('phospho').s.d) + ' (modèle)' },
    'zr-c-live': { t: 'En direct', k: 'Modèle phosphocalcique', d: 'Changez de scénario dans le panneau (hyperparathyroïdie primaire, hypoparathyroïdie, carence en vitamine D, PTHrP). Les barres sont qualitatives : elles montrent le sens des variations, pas des valeurs mesurées.' }
  });

  const defC = HV.scene(Object.assign({
    id: 'ca-nephron', parent: 'phospho', loupe: 'Rein et calcium',
    title: 'Rein et calcium', level: 'Organe',
    lead: 'Le calcium ionisé filtré par le glomérule est réabsorbé à 65 % au tube proximal, à 25 % dans la branche ascendante de Henlé sous le contrôle du CaSR et de la PTH, et le complément au tube distal sous l\'action de la PTH (P1 p. 37). Le même tube proximal règle le phosphate et active la vitamine D.',
    points: [
      'Tube proximal : 65 % du calcium filtré, passivement (P1 p. 37) ; 1α-hydroxylase stimulée par la PTH (P1 p. 37-38).',
      'Anse de Henlé : 25 %, régulés par la PTH et le calcium via le CaSR ; une baisse du calcium inhibe le CaSR, stimule la réabsorption et diminue la calciurie (P1 p. 37-38).',
      'Tube distal : réabsorption complémentaire sous PTH (P1 p. 37) et sous 1,25-dihydroxyvitamine D (P1 p. 38).',
      'Hyperparathyroïdie primaire : hypercalciurie malgré la PTH (charge filtrée trop forte), hyperphosphaturie (P1 p. 40-41).',
      'Diurétiques de l\'anse : calciurie ↑ ; thiazidiques : calciurie ↓ (complément).'
    ],
    legend: new Set(['ca', 'pth', 'calcitriol', 'nai']),
    build(g, a) {
      a.frame('Rein et calcium', 'Où le néphron récupère le calcium filtré, et comment la PTH et le CaSR le règlent');
      defC.sim = simOf('phospho');
      const defs = a.el('defs');
      glyph(a, defs, 'zr-pi', 'zr-mol-pi', 'P');
      const N = drawNephron(a, { zoneInfo: 'zr-c-glom' });
      a.text(66, 192, 'Cortex', 'lbl-s strong');
      a.text(66, 452, 'Médullaire', 'lbl-s strong');
      a.text(565, 236, 'Ca²⁺ ionisé', 'note strong', { attrs: { 'data-info': 'zr-c-glom' } });
      a.text(565, 258, 'filtré (P1 p. 36)', 'note');
      // Pourcentages sur le dessin
      const pc = a.el('g', { 'data-info': 'zr-c-pct' });
      a.text(66, 262, '65 %', 'zr-big', null, pc);
      a.text(66, 288, 'passif (P1 p. 37)', 'note', null, pc);
      const tl = a.el('g', { 'data-info': 'zr-c-tal' });
      a.text(440, 512, '25 %', 'zr-big', null, tl);
      a.text(440, 538, 'paracellulaire', 'note', null, tl);
      a.text(440, 562, 'sous le CaSR et la PTH', 'note', null, tl);
      const casrT = a.text(440, 592, '', 'note strong', null, tl);
      pill(a, 440, 628, 'furosémide : calciurie ↑', 'zr-c-furo');
      const dl = a.el('g', { 'data-info': 'zr-c-dct' });
      a.text(450, 394, 'complément : TRPV5', 'note strong', null, dl);
      a.text(450, 414, 'sous PTH et calcitriol', 'note', null, dl);
      pill(a, 450, 452, 'thiazidiques : calciurie ↓', 'zr-c-thz');
      const exT = a.text(758, 968, 'urine', 'note strong', { attrs: { 'data-info': 'zr-c-ex' } });
      a.text(726, 900, 'calciurie', 'note strong', { anchor: 'end', attrs: { 'data-info': 'zr-c-ex' } });
      const exV = a.text(726, 924, '', 'note', { anchor: 'end', attrs: { 'data-info': 'zr-c-ex' } });
      // Phosphate et 1α-hydroxylase au tube proximal
      chip(a, 66, 336, 'NPT2a : phosphate', 'zr-c-npt', 'p-lime');
      chip(a, 66, 378, '1α-hydroxylase', 'zr-c-1a', 'p-gold');
      // Flux
      const fP = a.flow('M 305,250 L 236,236', { mol: 'ca', rate: () => 1.6 * R.s.ca / 2.4, size: 1.5, speed: 40, track: false });
      a.flow('M 318,300 L 254,312', { mol: 'zr-pi', rate: () => 1.2 * clamp(1.4 - 0.4 * Math.sqrt(R.s.pth), 0.2, 1.4), size: 1.5, speed: 40, track: false });
      [470, 560, 630].forEach((y) => a.flow(`M 372,${y} L 424,${y}`, { mol: 'ca', rate: () => 1.1 * R.fT / 0.25, size: 1.4, speed: 30, track: false }));
      const pd = N.pt('dct', 0.62);
      a.flow(`M ${pd[0]},${pd[1]} L ${pd[0]},${pd[1] + 44}`, { mol: 'ca', rate: () => 1.2 * R.fD / 0.08, size: 1.4, speed: 30, track: false });
      a.flow('M 740,920 L 740,985', { mol: 'ca', rate: () => 0.5 * clamp(R.rel, 0.2, 8), size: 1.4, speed: 40, track: false, max: 14 });
      a.flow('M 740,880 L 740,985', { mol: 'zr-pi', rate: () => 0.6 * clamp(Math.sqrt(R.s.pth + 0.1), 0.2, 3), size: 1.4, speed: 40, track: false, max: 10 });
      void fP;

      // Panneau de droite : valeurs en direct et barres
      const X = 830, W = 720;
      a.text(X, 188, 'En direct : bilan phosphocalcique simulé', 'lbl-h', { attrs: { 'data-info': 'zr-c-live' } });
      HV.figBadge(a, X + W - 20, 180, ['11', '12']);
      const V = [['Calcémie', 'mmol/L'], ['PTH', 'pg/mL'], ['Phosphatémie', 'mmol/L'], ['Calcitriol', 'modèle']];
      const vals = V.map((v, i) => {
        const x = X + i * 182;
        const vg = a.el('g', { 'data-info': 'zr-c-live', style: '--c: var(--p-green)' });
        a.el('rect', { x, y: 210, width: 170, height: 86, rx: 14, class: 'sig-box' }, vg);
        a.text(x + 85, 238, v[0], 'note strong', { anchor: 'middle' }, vg);
        const t = a.text(x + 85, 270, '', 'sig-val', { anchor: 'middle' }, vg);
        a.text(x + 85, 290, v[1], 'note', { anchor: 'middle' }, vg);
        return t;
      });
      a.text(X, 340, 'Calcium filtré : où est-il réabsorbé ?', 'lbl-s strong');
      a.text(X, 364, 'barres qualitatives (modèle) · trait pointillé = situation normale', 'note');
      const BARS = [['Tube proximal', '65 % (P1 p. 37)', 'p-orange', 'zr-c-pct', 0.65], ['Anse de Henlé', '25 % (P1 p. 37)', 'p-teal', 'zr-c-tal', 0.25], ['Tube distal', 'complément (P1 p. 37)', 'p-violet', 'zr-c-dct', 0.08], ['Calciurie', 'le reste (complément)', 'p-red', 'zr-c-ex', 0.02]];
      const BX = X + 200, BWmax = 330;
      const scaleB = (f, i) => (i === 3 ? BWmax * clamp(0.3 + 0.2 * Math.log2(Math.max(f / 0.02, 0.05)), 0.03, 1) : BWmax * 0.6 * clamp(f / BARS[i][4], 0, 1.6));
      const bars = BARS.map((b, i) => {
        const y = 392 + i * 58;
        const bg = a.el('g', { 'data-info': b[3], style: `--c: var(--${b[2]})` });
        a.text(X, y + 20, b[0], 'note strong', null, bg);
        a.text(X, y + 42, b[1], 'note', null, bg);
        a.el('rect', { x: BX, y: y + 6, width: BWmax, height: 24, rx: 12, class: 'zr-bar-bg' }, bg);
        const bar = a.el('rect', { x: BX, y: y + 6, width: 10, height: 24, rx: 12, class: 'zr-bar' }, bg);
        const ref = scaleB(b[4], i);
        a.path(`M ${BX + ref},${y} L ${BX + ref},${y + 36}`, 'zr-ref', bg);
        const tag = a.text(BX + BWmax + 16, y + 24, '', 'note strong', null, bg);
        return { bar, tag, i };
      });
      const state = a.text(X, 642, '', 'lbl-s strong');
      const state2 = a.text(X, 668, '', 'note');
      // Phosphate et 1α-hydroxylase
      const pg = a.el('g', { 'data-info': 'zr-c-npt', style: '--c: var(--p-lime)' });
      a.el('rect', { x: X, y: 700, width: 350, height: 240, rx: 18, class: 'sig-box' }, pg);
      a.text(X + 20, 734, 'Phosphate (NPT2a)', 'lbl-s strong', null, pg);
      a.text(X + 20, 762, ['Freiné par la PTH (P1 p. 41)', 'et le FGF23 (complément) :', 'phosphaturie ↑'], 'note', { lh: 1.3 }, pg);
      const phT = a.text(X + 20, 912, '', 'zr-live', null, pg);
      const hg = a.el('g', { 'data-info': 'zr-c-1a', style: '--c: var(--p-gold)' });
      a.el('rect', { x: X + 370, y: 700, width: 350, height: 240, rx: 18, class: 'sig-box' }, hg);
      a.text(X + 390, 734, '1α-hydroxylase', 'lbl-s strong', null, hg);
      a.text(X + 390, 762, ['25-OH-D → 1,25-(OH)₂-D', 'PTH ↑ (P1 p. 37-38)', 'FGF23 ↓ (complément)'], 'note', { lh: 1.3 }, hg);
      const dT = a.text(X + 390, 912, '', 'zr-live', null, hg);

      let R = caRenal();
      let tt = 0;
      a.dyn((dt) => {
        stepSim('phospho', dt);
        R = caRenal();
        tt -= dt;
        const wB = [R.fP, R.fT, R.fD, R.ex];
        bars.forEach((b) => b.bar.setAttribute('width', Math.max(10, scaleB(wB[b.i], b.i)).toFixed(1)));
        if (tt > 0) return;
        tt = 0.3;
        vals[0].textContent = f2(lab('phospho', 'ca'));
        vals[1].textContent = String(Math.round(lab('phospho', 'pth')));
        vals[2].textContent = f2(lab('phospho', 'phos'));
        vals[3].textContent = '×' + f1(R.s.d);
        const arrow = (r, lo, hi) => (r > hi ? '↑' : r < lo ? '↓' : '=');
        bars[0].tag.textContent = '=';
        bars[1].tag.textContent = arrow(R.fT / 0.25, 0.93, 1.07);
        bars[2].tag.textContent = arrow(R.fD / 0.08, 0.85, 1.15);
        bars[3].tag.textContent = R.rel > 3 ? '↑↑' : arrow(R.rel, 0.6, 1.5);
        casrT.textContent = R.casr > 0.25 ? 'CaSR activé : réabsorption ↓' : R.casr < -0.25 ? 'CaSR inhibé : réabsorption ↑' : 'CaSR au repos';
        exV.textContent = R.rel > 1.5 ? 'augmentée' : R.rel < 0.6 ? 'diminuée' : 'normale';
        const pth = R.s.pth;
        if (R.s.ca > 2.6 && pth > 1.2) { state.textContent = 'Hypercalciurie malgré la PTH'; state2.textContent = 'La charge filtrée dépasse les capacités de réabsorption (P1 p. 40-41).'; }
        else if (R.s.ca > 2.6) { state.textContent = 'Hypercalcémie, PTH freinée'; state2.textContent = 'Le CaSR de l\'anse freine la réabsorption : calciurie ↑ (complément).'; }
        else if (R.s.ca < 2.2) { state.textContent = 'Hypocalcémie'; state2.textContent = 'Le CaSR inhibé stimule la réabsorption et diminue la calciurie (P1 p. 38).'; }
        else if (pth > 1.8) { state.textContent = 'PTH élevée, calcémie maintenue'; state2.textContent = 'Réabsorption distale stimulée, phosphaturie ↑ (P1 p. 37, 41).'; }
        else { state.textContent = 'Équilibre : la calciurie compense l\'absorption'; state2.textContent = 'Le rein adapte son excrétion au flux net absorbé : bilan nul (P1 p. 36).'; }
        phT.textContent = 'phosphaturie ' + arrow(Math.sqrt(pth + 0.1) / Math.sqrt(1.1), 0.8, 1.25) + ' · Pi ' + f2(lab('phospho', 'phos'));
        dT.textContent = 'calcitriol ×' + f1(R.s.d);
        exT.textContent = 'urine';
      });

      HV.spotlight(defC, a, [
        { t: 'Le glomérule filtre le calcium ionisé', d: 'Seul le calcium ionisé, environ la moitié du calcium total, est ultrafiltrable (P1 p. 35-36). La charge filtrée augmente avec la calcémie.', spot: [[500, 245, 80]] },
        { t: 'Tube proximal : 65 %, passivement', d: 'Le calcium y suit le sodium et l\'eau (P1 p. 37 ; mécanisme : complément). Le même segment réabsorbe le phosphate par NPT2a, freiné par la PTH et le FGF23, et porte la 1α-hydroxylase stimulée par la PTH.', spot: [[230, 290, 175]] },
        { t: 'Anse de Henlé : 25 %, sous le CaSR', d: 'Réabsorption paracellulaire régulée par la PTH et le calcium via le CaSR (P1 p. 37). Calcémie basse → CaSR inhibé → réabsorption ↑, calciurie ↓ (P1 p. 38). Les diurétiques de l\'anse augmentent la calciurie (complément).', spot: [[440, 550, 150]] },
        { t: 'Tube distal : le réglage fin', d: 'Réabsorption complémentaire sous l\'action de la PTH (P1 p. 37) et du calcitriol (P1 p. 38), par TRPV5 (complément). Les thiazidiques diminuent la calciurie (complément).', spot: [[590, 400, 140]] },
        { t: 'Calciurie et bilan', d: 'Normalement, le rein élimine ce que l\'intestin absorbe : bilan nul (P1 p. 36). Dans l\'hyperparathyroïdie primaire, la charge filtrée dépasse les capacités de réabsorption : hypercalciurie et risque de lithiase (P1 p. 40-41). Essayez ce scénario.', spot: [[X - 10, 380, W + 20, 300], [740, 930, 60]] },
        { t: 'Phosphate et vitamine D', d: 'L\'excès de PTH augmente l\'excrétion de phosphore : hypophosphorémie (P1 p. 41). La PTH stimule la 1α-hydroxylase (P1 p. 37-38) ; le FGF23 freine NPT2a et la 1α-hydroxylase (complément).', spot: [[X - 10, 690, W + 20, 260]] }
      ]);
    }
  }, HV.LOUPE.R(3)));
})();
