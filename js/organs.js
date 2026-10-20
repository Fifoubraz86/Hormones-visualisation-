/*
 * Dessins anatomiques réutilisables. Chaque fonction dessine l'organe centré sur (0, 0)
 * dans le groupe fourni ; l'appelant place et met à l'échelle le groupe.
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const el = (...a) => HV.el(...a);

  // Forme pleine + reflet pour donner du volume.
  function solid(g, d, cls, extra) {
    const p = el('path', Object.assign({ d, class: 'org ' + cls }, extra || {}), g);
    el('path', { d, class: 'org-shine', fill: 'url(#shine)' }, g);
    return p;
  }
  const line = (g, d, cls) => el('path', { d, class: cls || 'org-detail' }, g);
  const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, x, y) => -parseFloat(x) + ',' + y);

  const O = {};

  /* Thyroïde vue de face, avec larynx, trachée, isthme, lobe pyramidal et parathyroïdes.
     Repère : centre de l'isthme en (0, 0), lobes ≈ 200 de large. */
  O.thyroidNeck = function (g, info) {
    const cart = el('g', { 'data-info': 'larynx' }, g);
    solid(cart, 'M -36,-130 L 36,-130 L 31,-104 C 22,-84 9,-74 0,-72 C -9,-74 -22,-84 -31,-104 Z', 'o-cart');
    line(cart, 'M -10,-130 L 0,-118 L 10,-130', 'org-detail');
    solid(cart, 'M -26,-66 C -12,-60 12,-60 26,-66 L 26,-54 C 12,-48 -12,-48 -26,-54 Z', 'o-cart');
    const tr = el('g', { 'data-info': 'trachea' }, g);
    el('rect', { x: -24, y: -50, width: 48, height: 210, rx: 14, class: 'org o-trachea' }, tr);
    for (let y = -42; y < 156; y += 17) line(tr, `M -22,${y} C -8,${y + 6} 8,${y + 6} 22,${y}`, 'o-ring');
    const lobes = el('g', { class: 'thy-lobes' }, g);
    const right = 'M -22,-12 C -26,-42 -40,-72 -60,-78 C -82,-82 -98,-48 -100,-8 C -104,42 -88,84 -60,90 C -36,94 -20,70 -16,50 Z';
    solid(lobes, right, 'o-thyroid', { 'data-info': 'thyroid' });
    solid(lobes, mirror(right), 'o-thyroid', { 'data-info': 'thyroid' });
    solid(lobes, 'M -22,14 C -10,22 10,22 22,14 L 22,50 C 10,58 -10,58 -22,50 Z', 'o-thyroid', { 'data-info': 'thyroid' });
    solid(lobes, 'M 6,16 C 6,-6 10,-28 14,-50 C 19,-46 18,-8 14,18 Z', 'o-thyroid', { 'data-info': 'pyramidal' });
    [[-70, -40], [-82, 0], [-74, 44], [-56, 70], [-56, -10]].forEach(([x, y]) => {
      line(lobes, `M ${x - 8},${y} q 8,-8 16,0`, 'o-lobule');
      line(lobes, `M ${-x - 8},${y} q 8,-8 16,0`, 'o-lobule');
    });
    const para = el('g', { 'data-info': 'parathyroid' }, g);
    [[-92, -46], [-90, 64], [92, -46], [90, 64]].forEach(([x, y]) => el('ellipse', { cx: x, cy: y, rx: 8, ry: 6, class: 'org o-parathyroid' }, para));
    return lobes;
  };

  /* Thyroïde seule, en papillon (vignettes) */
  O.thyroidSmall = function (g) {
    const r = 'M -4,-1 C -5,-6 -8,-11 -11,-12 C -15,-12 -17,-6 -17,0 C -17,8 -14,13 -10,13 C -6,13 -4,9 -3,6 Z';
    solid(g, r, 'o-thyroid');
    solid(g, mirror(r), 'o-thyroid');
    el('rect', { x: -4, y: 1, width: 8, height: 6, rx: 2, class: 'org o-thyroid' }, g);
  };

  /* Encéphale en coupe sagittale (face à gauche), avec hypothalamus, chiasma, tige et hypophyse dans la selle turcique.
     Repère : hypothalamus en (0, 0). Retourne { hypo, ant, post }. */
  O.brainSagittal = function (g) {
    solid(g, 'M -140,6 C -160,-30 -152,-86 -110,-114 C -70,-142 0,-152 60,-140 C 120,-128 168,-92 178,-42 C 184,-16 172,2 152,6 C 120,10 90,6 70,8 C 40,12 0,14 -32,12 C -80,12 -124,20 -140,6 Z', 'o-brain', { 'data-info': 'brain' });
    line(g, 'M -120,-40 C -100,-70 -80,-60 -70,-90 M -60,-110 C -40,-90 -20,-120 0,-100 C 20,-80 40,-120 60,-104 M 80,-110 C 90,-80 120,-100 130,-70 M 140,-50 C 120,-40 150,-20 130,-10 M -110,-10 C -90,-30 -70,-14 -60,-34', 'o-gyrus');
    solid(g, 'M -60,-42 C -40,-70 60,-76 90,-50 C 96,-42 88,-34 80,-38 C 50,-58 -30,-54 -48,-34 C -54,-30 -64,-34 -60,-42 Z', 'o-callosum', { 'data-info': 'callosum' });
    const cb = el('g', { 'data-info': 'cerebellum' }, g);
    solid(cb, 'M 118,6 C 120,-16 150,-24 172,-12 C 188,0 184,30 162,38 C 140,44 120,32 118,6 Z', 'o-cerebellum');
    line(cb, 'M 128,0 C 140,-10 160,-10 174,-2 M 126,12 C 140,4 162,4 180,12 M 130,24 C 144,18 162,20 174,28', 'o-gyrus');
    solid(g, 'M 76,6 C 82,34 86,64 90,94 L 112,94 C 108,62 106,34 106,6 Z', 'o-brainstem', { 'data-info': 'brainstem' });
    const hypo = solid(g, 'M -40,0 C -40,-14 -16,-22 6,-20 C 30,-18 44,-8 42,4 C 40,16 14,20 -6,18 C -26,16 -40,12 -40,0 Z', 'o-hypo');
    el('ellipse', { cx: -54, cy: 16, rx: 16, ry: 7, class: 'org o-chiasm', 'data-info': 'chiasm' }, g);
    solid(g, 'M -6,16 C -10,50 4,80 8,118 L 22,118 C 18,80 14,48 12,16 Z', 'o-stalk', { 'data-info': 'stalk' });
    el('path', { d: 'M -64,146 C -66,214 80,214 80,146', class: 'o-sella' }, g);
    el('path', { d: 'M -70,146 C -74,138 -60,132 -56,140 M 74,140 C 78,130 92,136 86,146', class: 'o-sella thin' }, g);
    const ant = solid(g, 'M -54,152 C -54,124 -14,118 8,130 C 20,140 18,178 -4,188 C -28,196 -54,180 -54,152 Z', 'o-pit-ant');
    const post = solid(g, 'M 10,134 C 26,120 58,126 60,150 C 62,174 36,186 20,176 C 26,162 24,146 10,134 Z', 'o-pit-post', { 'data-info': 'pit-post' });
    return { hypo, ant, post };
  };

  /* Coupe sagittale cerveau – hypothalamus – tige – hypophyse, pour les axes hypophysaires.
     Ajoute au cerveau sagittal les noyaux, les axones vers la posthypophyse et le système porte vers
     l'antéhypophyse. opts.portal / opts.axons : afficher l'une ou l'autre voie (par défaut les deux).
     Repères (repère local) : hypothalamus (0, 0), éminence médiane (4, 20), antéhypophyse (-22, 156),
     posthypophyse (38, 152). */
  O.HH = { hypo: [0, -2], me: [4, 20], ant: [-22, 156], post: [38, 152], arc: [-16, 11] };
  O.hhSagittal = function (g, opts) {
    opts = opts || {};
    const parts = O.brainSagittal(g);
    const show = (k) => opts[k] !== false;
    if (show('axons')) {
      const ax = el('g', { class: 'hh-axons', 'data-info': 'hh-axons' }, g);
      el('ellipse', { cx: 14, cy: -8, rx: 9, ry: 6, class: 'hh-nuc' }, ax);
      el('ellipse', { cx: -26, cy: 8, rx: 9, ry: 5, class: 'hh-nuc' }, ax);
      el('path', { d: 'M 14,-8 C 22,30 20,70 26,110 C 30,130 34,140 38,150', class: 'hh-axon' }, ax);
      el('path', { d: 'M -26,8 C -4,20 14,50 18,96 C 22,124 30,140 34,150', class: 'hh-axon' }, ax);
    }
    if (show('portal')) {
      const po = el('g', { class: 'hh-portal', 'data-info': 'hh-portal' }, g);
      el('path', { d: 'M -12,22 C -14,14 -4,12 0,18 C 4,12 14,14 12,22 C 8,28 -8,28 -12,22 Z', class: 'hh-plexus' }, po);
      el('path', { d: 'M -2,26 C -6,60 -12,100 -20,138', class: 'hh-vein' }, po);
      el('path', { d: 'M 4,26 C 2,60 -4,100 -12,136', class: 'hh-vein' }, po);
      el('path', { d: 'M -40,146 C -34,138 -26,150 -18,142 C -10,150 -4,140 2,150 M -42,162 C -34,154 -26,166 -18,158 C -10,166 -4,156 4,166', class: 'hh-plexus2' }, po);
      el('ellipse', { cx: -54, cy: 16, rx: 16, ry: 7, class: 'org o-chiasm', 'data-info': 'chiasm' }, g);
    }
    return parts;
  };

  /* Néphron simplifié : glomérule, tube proximal, anse de Henlé, tube distal, canal collecteur.
     Repère : glomérule (-70, -60), canal collecteur vertical en x = 70. */
  O.nephron = function (g0) {
    const g = el('g', { transform: 'scale(0.5)' }, g0);
    el('path', { d: 'M -120,-110 L 120,-110 L 120,120 L -120,120 Z', class: 'neph-cortex' }, g);
    el('path', { d: 'M -120,10 L 120,10', class: 'neph-limit' }, g);
    el('circle', { cx: -70, cy: -64, r: 20, class: 'neph-glom' }, g);
    el('path', { d: 'M -52,-56 C -30,-50 -40,-30 -20,-24 C 0,-18 -20,0 -8,20 L -8,100 C -8,116 14,116 14,100 L 14,20 C 14,-10 30,-20 44,-40 C 54,-56 62,-70 70,-70', class: 'neph-tube' }, g);
    el('path', { d: 'M 70,-100 L 70,112', class: 'neph-cd', 'data-info': 'cd' }, g);
  };

  /* Cerveau, vue latérale */
  O.brainLateral = function (g) {
    solid(g, 'M -44,6 C -48,-18 -30,-38 -4,-40 C 22,-42 44,-28 46,-6 C 48,6 42,14 32,14 C 28,22 18,24 10,20 C 0,26 -16,26 -22,18 C -34,20 -44,16 -44,6 Z', 'o-brain');
    solid(g, 'M 18,16 C 24,10 40,12 42,22 C 42,32 26,36 18,30 C 14,26 14,20 18,16 Z', 'o-cerebellum');
    solid(g, 'M 8,20 L 12,44 L 20,44 L 18,22 Z', 'o-brainstem');
    line(g, 'M -30,8 C -14,0 4,2 18,-6 M 4,-38 C -2,-24 8,-14 2,-2 M -30,-24 C -20,-18 -24,-8 -14,-6 M 20,-30 C 28,-22 22,-12 32,-8 M -36,-6 C -28,-10 -26,-2 -20,-4', 'o-gyrus');
  };

  /* Cœur anatomique (vue antérieure) */
  O.heart = function (g) {
    solid(g, 'M -2,-22 C -4,-36 4,-46 16,-46 C 30,-46 34,-36 32,-28 L 25,-28 C 25,-35 20,-39 15,-39 C 9,-39 7,-32 7,-22 Z', 'o-aorta');
    line(g, 'M 10,-44 L 8,-54 M 16,-46 L 16,-56 M 22,-45 L 25,-55', 'o-vessel-l');
    el('rect', { x: -22, y: -44, width: 10, height: 26, rx: 4, class: 'org o-vein' }, g);
    solid(g, 'M -30,-10 C -34,10 -18,32 6,42 C 14,46 22,40 28,30 C 38,14 40,-4 32,-16 C 24,-26 6,-26 -4,-20 C -14,-24 -26,-20 -30,-10 Z', 'o-heart');
    solid(g, 'M 6,-20 C 8,-32 18,-34 24,-26 L 18,-14 C 14,-18 10,-18 6,-20 Z', 'o-pulm');
    line(g, 'M -6,-14 C 0,2 6,20 4,38 M 6,-16 C 18,-6 26,8 26,26', 'o-coronary');
  };

  /* Foie (vue antérieure) avec vésicule biliaire */
  O.liver = function (g) {
    solid(g, 'M -50,-6 C -48,-26 -18,-34 10,-30 C 30,-28 48,-22 52,-14 C 54,-8 42,-4 28,2 C 12,10 -6,22 -22,26 C -38,30 -50,18 -50,-6 Z', 'o-liver');
    line(g, 'M 2,-30 C 0,-18 -2,-6 -6,8', 'o-detail-strong');
    solid(g, 'M -16,16 C -14,30 -2,32 0,24 C 0,18 -8,13 -16,16 Z', 'o-gall');
  };

  /* Fémur */
  O.bone = function (g) {
    solid(g, 'M -14,-38 C -22,-46 -12,-58 -2,-52 C 4,-48 4,-40 0,-36 L 8,-30 C 12,-36 20,-36 20,-28 C 20,-20 14,-18 10,-16 L 6,30 C 14,32 18,40 12,46 C 8,50 2,46 0,42 C -4,48 -12,48 -14,42 C -18,34 -12,30 -6,30 L -2,-18 C -8,-22 -12,-30 -14,-38 Z', 'o-bone');
    line(g, 'M 2,-12 L -1,26', 'o-detail');
  };

  /* Muscle squelettique fusiforme avec tendons */
  O.muscle = function (g) {
    line(g, 'M -52,0 L -34,0 M 34,0 L 52,0', 'o-tendon');
    solid(g, 'M -36,0 C -26,-20 26,-20 36,0 C 26,20 -26,20 -36,0 Z', 'o-muscle');
    line(g, 'M -28,-6 C -10,-12 10,-12 28,-6 M -30,0 L 30,0 M -28,6 C -10,12 10,12 28,6', 'o-fiber');
  };

  /* Tissu adipeux : adipocytes uniloculaires, noyau refoulé en périphérie */
  O.fat = function (g) {
    [[-20, -12, 15], [8, -18, 14], [26, 4, 14], [-2, 10, 15], [-26, 14, 12]].forEach(([x, y, r]) => {
      el('circle', { cx: x, cy: y, r, class: 'org o-fat' }, g);
      el('circle', { cx: x, cy: y, r, fill: 'url(#shine)', class: 'org-shine' }, g);
      el('ellipse', { cx: x + r * 0.7, cy: y + r * 0.45, rx: 3, ry: 1.6, transform: `rotate(-30 ${x + r * 0.7} ${y + r * 0.45})`, class: 'o-fat-n' }, g);
    });
  };

  /* Silhouette interne pour l'atlas (repère du corps, cou en y ≈ -285) */
  O.bodyOrgans = function (g) {
    const L = (name, x, y, s, draw, info) => {
      const gg = el('g', { transform: `translate(${x} ${y}) scale(${s})`, class: 'body-organ', 'data-info': info || name }, g);
      draw(gg);
      return gg;
    };
    L('brain', 0, -384, 0.95, O.brainLateral);
    const lung = 'M -8,-40 C -26,-40 -40,-10 -42,22 C -44,40 -30,46 -14,40 C -4,36 -2,20 -4,0 C -4,-20 0,-40 -8,-40 Z';
    L('lungs', -40, -180, 1, (gg) => solid(gg, lung, 'o-lung'));
    L('lungs', 40, -180, 1, (gg) => solid(gg, mirror(lung), 'o-lung'));
    L('heart', 10, -170, 0.75, O.heart);
    L('thyroid', 0, -284, 0.85, O.thyroidSmall);
    L('liver', -26, -112, 0.95, O.liver);
    L('stomach', 34, -112, 1, (gg) => solid(gg, 'M -10,-14 C 0,-20 14,-14 14,-2 C 14,12 2,18 -10,16 C -4,8 -4,0 -10,-14 Z', 'o-stomach'));
    const kidney = 'M -6,-14 C 4,-16 10,-6 10,2 C 10,12 4,18 -4,16 C -10,14 -6,6 -2,2 C -6,-2 -12,-10 -6,-14 Z';
    const adr = 'M -8,4 C -8,-4 -2,-10 4,-8 C 8,-6 8,2 6,4 Z';
    [-1, 1].forEach((k) => {
      L('kidney', k * 40, -74, 1, (gg) => solid(gg, k < 0 ? mirror(kidney) : kidney, 'o-kidney'));
      L('adrenal', k * 39, -96, 1, (gg) => solid(gg, k < 0 ? mirror(adr) : adr, 'o-adrenal'));
    });
    L('pancreas', 10, -64, 1, (gg) => solid(gg, 'M -22,2 C -22,-6 -10,-6 0,-4 C 12,-2 22,-6 26,-2 C 28,2 20,6 8,6 C -4,6 -14,10 -22,2 Z', 'o-pancreas'));
    L('uterus', 0, 50, 1, (gg) => {
      solid(gg, 'M -9,-12 C -9,-18 9,-18 9,-12 C 9,0 4,10 0,14 C -4,10 -9,0 -9,-12 Z', 'o-gonad');
      line(gg, 'M -9,-12 C -18,-16 -26,-12 -30,-8 M 9,-12 C 18,-16 26,-12 30,-8', 'o-tube');
      el('ellipse', { cx: -32, cy: -6, rx: 6, ry: 4, class: 'org o-gonad', 'data-info': 'ovary' }, gg);
      el('ellipse', { cx: 32, cy: -6, rx: 6, ry: 4, class: 'org o-gonad', 'data-info': 'ovary' }, gg);
    }, 'ovary');
    L('testis', 0, 90, 1, (gg) => { // juste sous le pubis
      el('ellipse', { cx: -7, cy: 0, rx: 6, ry: 8, class: 'org o-gonad' }, gg);
      el('ellipse', { cx: 7, cy: 0, rx: 6, ry: 8, class: 'org o-gonad' }, gg);
    });
  };


  /* ---------- Icônes compactes (≈ 100 × 100) pour les schémas d'axes ---------- */
  O.hypothalamusIcon = function (g) {
    O.brainLateral(g);
    el('ellipse', { cx: -2, cy: 14, rx: 9, ry: 5, class: 'org o-hypo' }, g);
  };
  O.pituitaryIcon = function (g) {
    solid(g, 'M -4,-46 C -6,-30 -2,-18 2,-10 L 10,-10 C 8,-20 6,-32 6,-46 Z', 'o-stalk');
    el('path', { d: 'M -40,-2 C -42,44 40,44 40,-2', class: 'o-sella' }, g);
    solid(g, 'M -34,2 C -34,-18 -6,-22 8,-14 C 16,-6 14,20 -2,26 C -18,32 -34,22 -34,2 Z', 'o-pit-ant');
    solid(g, 'M 10,-12 C 22,-22 38,-16 38,0 C 38,16 22,24 12,18 C 16,8 16,-4 10,-12 Z', 'o-pit-post');
  };
  O.kidney = function (g) {
    solid(g, 'M -6,-40 C 18,-46 34,-22 34,0 C 34,26 16,46 -6,40 C -22,36 -14,16 -6,8 C -14,0 -14,-8 -6,-12 C -16,-20 -24,-34 -6,-40 Z', 'o-kidney');
    line(g, 'M -8,-10 C 4,-14 12,-4 14,0 C 12,6 4,14 -8,10', 'o-detail-strong');
    line(g, 'M -10,2 C -22,4 -30,10 -34,22', 'o-ureter');
  };
  O.adrenalKidney = function (g) {
    const k = el('g', { transform: 'translate(0 16) scale(0.78)' }, g);
    O.kidney(k);
    solid(g, 'M -26,-12 C -24,-30 -6,-46 8,-44 C 20,-42 26,-28 22,-14 C 10,-8 -12,-6 -26,-12 Z', 'o-adrenal');
    line(g, 'M -16,-14 C -10,-28 2,-36 12,-32 C 16,-26 14,-18 10,-14', 'o-medulla');
  };
  O.testis = function (g) {
    solid(g, 'M -18,-26 C -4,-34 18,-26 22,-4 C 26,18 12,34 -4,34 C -20,34 -30,16 -28,-2 C -27,-14 -24,-22 -18,-26 Z', 'o-gonad');
    solid(g, 'M 16,-30 C 30,-26 34,-6 30,10 C 28,22 22,30 16,32 C 22,18 24,-8 16,-30 Z', 'o-epid');
    [[-12, -6], [-2, 8], [-14, 14], [4, -14]].forEach(([x, y]) => line(g, `M ${x - 6},${y} q 3,-5 6,0 q 3,5 6,0`, 'o-tubule'));
  };
  O.ovary = function (g) {
    solid(g, 'M -34,0 C -34,-20 -14,-28 4,-26 C 24,-24 36,-12 36,2 C 36,18 18,28 0,28 C -20,28 -34,16 -34,0 Z', 'o-ovary');
    [[-16, -6, 6], [4, -10, 4], [16, 8, 9], [-8, 12, 4]].forEach(([x, y, r]) => {
      el('circle', { cx: x, cy: y, r, class: 'o-follicle' }, g);
      el('circle', { cx: x + r * 0.3, cy: y - r * 0.2, r: Math.max(1.2, r * 0.3), class: 'o-oocyte' }, g);
    });
  };
  O.uterus = function (g) {
    solid(g, 'M -22,-26 C -22,-38 22,-38 22,-26 C 22,0 10,22 6,34 L -6,34 C -10,22 -22,0 -22,-26 Z', 'o-uterus');
    line(g, 'M -14,-24 C -14,-6 -6,10 0,22 C 6,10 14,-6 14,-24 C 6,-20 -6,-20 -14,-24', 'o-endomet');
    line(g, 'M -22,-28 C -32,-34 -40,-30 -46,-22 M 22,-28 C 32,-34 40,-30 46,-22', 'o-tube');
    el('ellipse', { cx: -46, cy: -16, rx: 7, ry: 5, class: 'org o-ovary' }, g);
    el('ellipse', { cx: 46, cy: -16, rx: 7, ry: 5, class: 'org o-ovary' }, g);
  };
  O.breast = function (g) {
    solid(g, 'M -36,-30 C -40,6 -24,34 4,34 C 28,34 40,14 36,-6 C 34,-20 20,-30 4,-34 C -12,-36 -26,-34 -36,-30 Z', 'o-breast');
    [[-10, -12], [4, -18], [14, -4], [-14, 6], [2, 4]].forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 5, class: 'o-lobule-b' }, g));
    line(g, 'M -10,-12 C -2,0 8,10 18,18 M 4,-18 C 8,0 14,10 18,18 M 14,-4 L 18,18 M -14,6 C 0,12 10,16 18,18 M 2,4 L 18,18', 'o-duct');
    el('circle', { cx: 20, cy: 20, r: 4, class: 'org o-nipple' }, g);
  };
  O.intestine = function (g) {
    solid(g, 'M -40,-30 C -40,-40 40,-40 40,-30 L 40,30 C 40,40 -40,40 -40,30 Z', 'o-colon');
    solid(g, 'M -28,-18 C -10,-30 10,-6 28,-18 C 34,-6 18,4 28,16 C 10,26 -10,4 -28,16 C -34,4 -18,-6 -28,-18 Z', 'o-small');
    line(g, 'M -20,-12 C -6,-20 8,-2 22,-12 M -22,10 C -6,0 8,18 22,8', 'o-detail');
  };
  O.parathyroidBack = function (g) {
    const r = 'M -6,-2 C -8,-24 -18,-40 -30,-40 C -44,-40 -50,-16 -50,4 C -50,28 -42,42 -28,42 C -16,42 -8,30 -6,20 Z';
    solid(g, r, 'o-thyroid');
    solid(g, mirror(r), 'o-thyroid');
    el('rect', { x: -8, y: 0, width: 16, height: 16, rx: 4, class: 'org o-thyroid' }, g);
    [[-40, -22], [-38, 28], [40, -22], [38, 28]].forEach(([x, y]) => {
      el('ellipse', { cx: x, cy: y, rx: 8, ry: 6, class: 'org o-parathyroid big' }, g);
      el('ellipse', { cx: x, cy: y, rx: 8, ry: 6, fill: 'url(#shine)' }, g);
    });
  };
  O.islet = function (g) {
    solid(g, 'M -46,8 C -46,-6 -26,-10 -10,-6 C 10,-2 30,-14 44,-8 C 52,-2 42,10 26,12 C 8,14 -14,22 -32,20 C -42,19 -46,14 -46,8 Z', 'o-pancreas');
    el('circle', { cx: 6, cy: -24, r: 20, class: 'o-islet' }, g);
    line(g, 'M -2,-6 L -2,-6', 'o-detail');
    [[0, -30, 'b'], [10, -30, 'b'], [4, -20, 'b'], [14, -20, 'a'], [-4, -20, 'a'], [8, -38, 'a'], [-6, -30, 'b'], [16, -28, 'd']].forEach(([x, y, k]) => el('circle', { cx: x, cy: y, r: 3.6, class: 'o-islet-' + k }, g));
    line(g, 'M 6,-4 L 2,4', 'o-detail-strong');
  };
  O.lungs = function (g) {
    const lung = 'M -8,-40 C -26,-40 -40,-10 -42,22 C -44,40 -30,46 -14,40 C -4,36 -2,20 -4,0 C -4,-20 0,-40 -8,-40 Z';
    const a = el('g', { transform: 'translate(-6 0)' }, g);
    solid(a, lung, 'o-lung solid');
    const b = el('g', { transform: 'translate(6 0)' }, g);
    solid(b, mirror(lung), 'o-lung solid');
    line(g, 'M 0,-46 L 0,-24 M 0,-24 C -4,-18 -8,-14 -12,-10 M 0,-24 C 4,-18 8,-14 12,-10', 'o-bronch');
  };
  O.vessel = function (g) {
    el('path', { d: 'M -46,0 C -20,-10 20,10 46,0', class: 'o-vessel-wall' }, g);
    el('path', { d: 'M -46,0 C -20,-10 20,10 46,0', class: 'o-vessel-lumen' }, g);
    [[-24, -2], [4, 1], [28, 2]].forEach(([x, y]) => el('ellipse', { cx: x, cy: y, rx: 7, ry: 5, class: 'o-rbc' }, g));
  };
  O.nerve = function (g) {
    el('circle', { cx: -28, cy: -18, r: 14, class: 'org o-neuron' }, g);
    el('circle', { cx: -28, cy: -18, r: 5, class: 'o-neuron-n' }, g);
    line(g, 'M -16,-12 C 4,0 18,8 34,18', 'o-axon');
    [[34, 18], [28, 26], [40, 10]].forEach(([x, y]) => el('circle', { cx: x, cy: y, r: 4, class: 'org o-neuron' }, g));
  };
  O.cellIcon = function (g) {
    solid(g, 'M -38,0 C -38,-26 -16,-34 4,-32 C 26,-30 40,-14 38,6 C 36,26 16,36 -4,34 C -24,32 -38,20 -38,0 Z', 'o-cell');
    el('circle', { cx: -2, cy: 0, r: 12, class: 'org o-cell-n' }, g);
  };

  HV.organs = O;
})();
