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
  // Illustration vectorielle (Servier Medical Art, CC BY 3.0 via Bioicons ou CC BY 4.0 via les kits SMART ; voir assets/organs/CREDITS.md),
  // inscrite dans la boîte (x, y, w, h) du repère de l'organe ; `rot` la fait pivoter autour du centre.
  function art(g, name, x, y, w, h, rot) {
    const im = el('image', { href: 'assets/organs/' + name + '.svg', x, y, width: w, height: h, preserveAspectRatio: 'xMidYMid meet', class: 'org-art' }, g);
    if (rot) im.setAttribute('transform', `rotate(${rot} ${x + w / 2} ${y + h / 2})`);
    return im;
  }
  HV.organArt = art;
  const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, x, y) => -parseFloat(x) + ',' + y);

  const O = {};

  /* Thyroïde vue de face, avec larynx, trachée, isthme, lobe pyramidal et parathyroïdes.
     Repère : centre de l'isthme en (0, 0), lobes ≈ 200 de large. */
  O.thyroidNeck = function (g, info) {
    // Larynx et trachée : dessin Servier (le repère suit l'ancien dessin : isthme en (0, 0)).
    const air = el('g', { 'data-info': 'larynx' }, g);
    art(air, 'servier/endo-larynx-trachea', -94, -150, 188, 250);
    const lobes = el('g', { class: 'thy-lobes' }, g);
    const right = 'M -22,-12 C -26,-42 -40,-72 -60,-78 C -82,-82 -98,-48 -100,-8 C -104,42 -88,84 -60,90 C -36,94 -20,70 -16,50 Z';
    solid(lobes, right, 'o-thyroid', { 'data-info': 'thyroid' });
    solid(lobes, mirror(right), 'o-thyroid', { 'data-info': 'thyroid' });
    solid(lobes, 'M -22,14 C -10,22 10,22 22,14 L 22,50 C 10,58 -10,58 -22,50 Z', 'o-thyroid', { 'data-info': 'thyroid' });
    solid(lobes, 'M 6,16 C 6,-6 10,-28 14,-50 C 19,-46 18,-8 14,18 Z', 'o-thyroid', { 'data-info': 'pyramidal' });
    // Les tracés ci-dessus servent de zones de survol ; l'image est le dessin Servier.
    lobes.querySelectorAll('.o-thyroid, .org-shine').forEach((p) => p.classList.add('art-hit'));
    art(lobes, 'servier/endo-thyroid-front', -104, -92, 208, 201).classList.add('thy-art');
    const para = el('g', { 'data-info': 'parathyroid' }, g);
    [[-92, -46], [-90, 64], [92, -46], [90, 64]].forEach(([x, y]) => el('ellipse', { cx: x, cy: y, rx: 8, ry: 6, class: 'org o-parathyroid' }, para));
    return lobes;
  };

  /* Thyroïde seule, en papillon (vignettes) */
  O.thyroidSmall = function (g) {
    art(g, 'servier/endo-thyroid-front', -22, -22, 44, 42);
  };

  /* Encéphale en coupe sagittale (face à gauche), avec hypothalamus, chiasma, tige et hypophyse dans la selle turcique.
     Repère : hypothalamus en (0, 0). Retourne { hypo, ant, post }. */
  O.brainSagittal = function (g) {
    // Encéphale : dessin Servier (coupe sagittale, hypothalamus placé en (0, 0)) ; les tracés propres
    // restent en dessous comme zones de survol. Hypothalamus, tige, selle et hypophyse (agrandie) restent dessinés.
    const brainArt = art(g, 'servier/nerv-brain-sagittal', -131, -171, 340, 329);
    solid(g, 'M -140,6 C -160,-30 -152,-86 -110,-114 C -70,-142 0,-152 60,-140 C 120,-128 168,-92 178,-42 C 184,-16 172,2 152,6 C 120,10 90,6 70,8 C 40,12 0,14 -32,12 C -80,12 -124,20 -140,6 Z', 'o-brain', { 'data-info': 'brain' });
    line(g, 'M -120,-40 C -100,-70 -80,-60 -70,-90 M -60,-110 C -40,-90 -20,-120 0,-100 C 20,-80 40,-120 60,-104 M 80,-110 C 90,-80 120,-100 130,-70 M 140,-50 C 120,-40 150,-20 130,-10 M -110,-10 C -90,-30 -70,-14 -60,-34', 'o-gyrus');
    solid(g, 'M -60,-42 C -40,-70 60,-76 90,-50 C 96,-42 88,-34 80,-38 C 50,-58 -30,-54 -48,-34 C -54,-30 -64,-34 -60,-42 Z', 'o-callosum', { 'data-info': 'callosum' });
    const cb = el('g', { 'data-info': 'cerebellum' }, g);
    solid(cb, 'M 118,6 C 120,-16 150,-24 172,-12 C 188,0 184,30 162,38 C 140,44 120,32 118,6 Z', 'o-cerebellum');
    line(cb, 'M 128,0 C 140,-10 160,-10 174,-2 M 126,12 C 140,4 162,4 180,12 M 130,24 C 144,18 162,20 174,28', 'o-gyrus');
    solid(g, 'M 76,6 C 82,34 86,64 90,94 L 112,94 C 108,62 106,34 106,6 Z', 'o-brainstem', { 'data-info': 'brainstem' });
    g.querySelectorAll('.o-brain, .o-gyrus, .o-callosum, .o-cerebellum, .o-brainstem, .org-shine').forEach((p) => p.classList.add('art-hit'));
    g.appendChild(brainArt);
    const hypo = solid(g, 'M -40,0 C -40,-14 -16,-22 6,-20 C 30,-18 44,-8 42,4 C 40,16 14,20 -6,18 C -26,16 -40,12 -40,0 Z', 'o-hypo');
    el('ellipse', { cx: -54, cy: 16, rx: 16, ry: 7, class: 'org o-chiasm art-hit', 'data-info': 'chiasm' }, g);
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
      el('ellipse', { cx: -54, cy: 16, rx: 16, ry: 7, class: 'org o-chiasm art-hit', 'data-info': 'chiasm' }, g);
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
    // Dessin Servier par-dessus ; les tracés ci-dessus restent comme zones de survol.
    g.querySelectorAll('path, circle').forEach((p) => p.classList.add('art-hit'));
    art(g, 'servier/uri-nephron', -100, -124, 200, 260);
  };

  /* Cerveau, vue latérale */
  O.brainLateral = function (g) {
    art(g, 'brain', -48, -46, 96, 94);
  };

  /* Cœur anatomique (vue antérieure) */
  O.heart = function (g) {
    art(g, 'heart', -38, -58, 76, 104);
  };

  /* Foie (vue antérieure) avec vésicule biliaire */
  O.liver = function (g) {
    art(g, 'liver', -54, -36, 108, 72);
    solid(g, 'M -16,16 C -14,30 -2,32 0,24 C 0,18 -8,13 -16,16 Z', 'o-gall');
  };

  /* Fémur */
  O.bone = function (g) {
    solid(g, 'M -14,-38 C -22,-46 -12,-58 -2,-52 C 4,-48 4,-40 0,-36 L 8,-30 C 12,-36 20,-36 20,-28 C 20,-20 14,-18 10,-16 L 6,30 C 14,32 18,40 12,46 C 8,50 2,46 0,42 C -4,48 -12,48 -14,42 C -18,34 -12,30 -6,30 L -2,-18 C -8,-22 -12,-30 -14,-38 Z', 'o-bone');
    line(g, 'M 2,-12 L -1,26', 'o-detail');
  };

  /* Muscle squelettique fusiforme avec tendons */
  O.muscle = function (g) {
    art(g, 'muscle', -16, -54, 32, 108, 90);
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
    L('lungs', 0, -172, 1, (gg) => art(gg, 'lungs', -50, -46, 100, 94));
    L('heart', 10, -170, 0.75, O.heart);
    L('thyroid', 0, -284, 0.85, O.thyroidSmall);
    L('liver', -26, -112, 0.95, O.liver);
    L('stomach', 34, -114, 1, (gg) => art(gg, 'stomach', -18, -20, 36, 38));
    // Reins et surrénales (dessin Servier, retourné pour le côté droit du sujet)
    [-1, 1].forEach((k) => {
      L('kidney', k * 40, -80, 1, (gg) => art(el('g', { transform: `scale(${-k} 1)` }, gg), 'servier/endo-kidney-adrenal', -12, -22, 24, 40), k < 0 ? 'kidney' : 'adrenal');
    });
    L('pancreas', 10, -64, 1, (gg) => art(gg, 'pancreas', -28, -10, 56, 22));
    L('uterus', 0, 48, 1, (gg) => art(gg, 'servier/endo-uterus', -36, -22, 72, 54), 'ovary');
    L('testis', 0, 92, 1, (gg) => [-1, 1].forEach((k) => art(el('g', { transform: `scale(${k} 1)` }, gg), 'servier/endo-testis', -2, -14, 12, 28)));
  };


  /* ---------- Icônes compactes (≈ 100 × 100) pour les schémas d'axes ---------- */
  O.hypothalamusIcon = function (g) {
    O.brainLateral(g);
    el('ellipse', { cx: -2, cy: 14, rx: 9, ry: 5, class: 'org o-hypo' }, g);
  };
  O.pituitaryIcon = function (g) {
    art(g, 'pituitary', -42, -48, 84, 80);
  };
  O.kidney = function (g) {
    art(g, 'kidney', -30, -46, 60, 92);
  };
  O.adrenalKidney = function (g) {
    art(g, 'servier/endo-kidney-adrenal', -32, -50, 64, 104);
  };
  O.testis = function (g) {
    art(g, 'servier/endo-testis', -24, -46, 48, 92);
  };
  O.ovary = function (g) {
    art(g, 'servier/repro-ovary-cycle', -50, -30, 100, 58);
  };
  O.uterus = function (g) {
    art(g, 'servier/endo-uterus', -56, -40, 112, 82);
  };
  O.breast = function (g) {
    art(g, 'servier/endo-breast-section', -30, -46, 60, 92);
  };
  O.intestine = function (g) {
    art(g, 'intestine', -42, -40, 84, 80);
  };
  O.parathyroidBack = function (g) {
    art(g, 'servier/endo-thyroid-back', -50, -46, 100, 92);
  };
  O.islet = function (g) {
    art(g, 'pancreas', -52, -12, 104, 44);
    el('circle', { cx: 6, cy: -24, r: 20, class: 'o-islet' }, g);
    line(g, 'M -2,-6 L -2,-6', 'o-detail');
    [[0, -30, 'b'], [10, -30, 'b'], [4, -20, 'b'], [14, -20, 'a'], [-4, -20, 'a'], [8, -38, 'a'], [-6, -30, 'b'], [16, -28, 'd']].forEach(([x, y, k]) => el('circle', { cx: x, cy: y, r: 3.6, class: 'o-islet-' + k }, g));
    line(g, 'M 6,-4 L 2,4', 'o-detail-strong');
  };
  O.lungs = function (g) {
    art(g, 'lungs', -52, -50, 104, 98);
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
