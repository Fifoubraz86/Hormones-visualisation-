/* Loupes de l'axe lactotrope (hypothalamus – hypophyse) :
   noyaux hypothalamiques, loge hypophysaire, mosaïque des cellules antéhypophysaires, adénome et ordre de perte des fonctions.
   Sources : polycopié de sémiologie endocrinienne CEEDMM (partie 1, p. 47 à 52, 63 à 67) ; le reste est marqué « (complément) ». */
(function () {
  'use strict';
  const HV = window.HV;
  const clamp = HV.clamp;
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const fr = (v) => String(v).replace('.', ',');

  /* ---------- Petits outils communs ---------- */
  // Bouton SVG : n'agit que dans la scène courante (ailleurs, le clic sert à zoomer).
  function button(a, def, x, y, w, label, fn, info, parent) {
    const g = a.el('g', { class: 'zh-btn', transform: `translate(${x} ${y})`, 'data-info': info || null }, parent);
    a.el('rect', { width: w, height: 44, rx: 22 }, g);
    const t = a.text(w / 2, 28, label, 'zh-btn-t', { anchor: 'middle' }, g);
    g.addEventListener('pointerdown', (e) => {
      if (HV.app && HV.app.current !== def) return;
      e.stopPropagation();
      fn();
    });
    g.label = t;
    return g;
  }
  // Pastille de texte colorée ; kind : '' (vers le système porte), 'post' (vers la posthypophyse), 'loc' (action locale).
  function chip(a, x, y, label, color, kind, parent, info) {
    const w = Math.round(label.length * 9.2 + 22);
    const g = a.el('g', { 'data-info': info || null }, parent);
    a.el('rect', { x, y, width: w, height: 28, rx: 14, class: 'zh-chip ' + (kind || ''), style: `--c: var(--${color})` }, g);
    a.text(x + w / 2, y + 20, label, 'zh-chip-t', { anchor: 'middle' }, g);
    return w;
  }
  const lead = (a, pts, parent) => a.path('M ' + pts.map((p) => p.join(',')).join(' L '), 'zh-lead', parent);
  // Pas à pas avec action propre à chaque étape (st : fonction appelée à l'entrée de l'étape, -1 à la sortie).
  function stepActions(def, steps, onExit) {
    const base = def.stepTo;
    def.stepTo = function (i) {
      base(i);
      if (i >= 0 && steps[i].act) steps[i].act();
      if (i < 0 && onExit) onExit();
    };
  }

  /* ======================================================================
     1. Noyaux hypothalamiques (coupe frontale)
     ====================================================================== */
  const HC = { crh: 'p-orange', trh: 'p-teal', adh: 'p-blue', oxy: 'p-rose', ghrh: 'p-sky', dopa: 'p-amber', kiss: 'p-magenta', pomc: 'p-lime', npy: 'p-brown', sst: 'p-grey', gnrh: 'p-violet', scn: 'p-gold' };
  Object.assign(HV.INFO, {
    'zh-v3': { t: 'Troisième ventricule', k: 'Repère médian de l\'hypothalamus (complément)', d: 'Fente médiane remplie de liquide cérébrospinal. Les noyaux hypothalamiques sont disposés de part et d\'autre ; son plancher se prolonge par l\'éminence médiane et la tige pituitaire.' },
    'zh-pvn': { t: 'Noyau paraventriculaire', k: 'ADH et ocytocine (polycopié p. 47 et 50) · CRH et TRH (complément)', d: 'Ses neurones magnocellulaires synthétisent l\'ADH et l\'ocytocine, transportées le long des axones de la tige jusqu\'à la posthypophyse (polycopié). Ses neurones parvocellulaires libèrent la CRH et la TRH dans l\'éminence médiane, vers le système porte (complément).' },
    'zh-son': { t: 'Noyau supraoptique', k: 'ADH et ocytocine (polycopié p. 47 et 50)', d: 'Neurones magnocellulaires situés au-dessus du chiasma et des tractus optiques. Leurs axones descendent dans la tige pituitaire ; leurs terminaisons constituent la posthypophyse, où l\'ADH et l\'ocytocine sont stockées puis libérées dans la circulation.' },
    'zh-arc': { t: 'Noyau arqué (infundibulaire)', k: 'GHRH, dopamine, kisspeptine, POMC / NPY (complément)', d: 'Au plancher du 3e ventricule, au contact de l\'éminence médiane. Ses neurones à GHRH et à dopamine (tubéro-infundibulaires) rejoignent le système porte ; ses neurones à kisspeptine stimulent les neurones à GnRH ; ses neurones à POMC et à NPY règlent la prise alimentaire (complément).' },
    'zh-peri': { t: 'Noyau périventriculaire', k: 'Somatostatine (complément)', d: 'Fine couche de neurones bordant la paroi du 3e ventricule. Sa somatostatine gagne le système porte et freine la sécrétion de GH (et de TSH, complément). Le freinage de la GH par la somatostatine figure dans le polycopié (p. 49).' },
    'zh-gnrh': { t: 'Neurones à GnRH', k: 'Dispersés, surtout dans l\'aire préoptique et l\'hypothalamus médiobasal (complément)', d: 'Ils ne forment pas un noyau compact. La GnRH, sécrétée de façon pulsatile dans le système porte, stimule les cellules gonadotropes ; les kisspeptines font partie des signaux qui les contrôlent (polycopié, partie 2 p. 3).' },
    'zh-scn': { t: 'Noyaux suprachiasmatiques', k: 'Horloge circadienne (complément)', d: 'Juste au-dessus du chiasma, ils reçoivent l\'information lumineuse de la rétine et donnent le rythme jour – nuit à de nombreuses sécrétions (cortisol, mélatonine…).' },
    'zh-me': { t: 'Éminence médiane', k: 'Interface entre neurones et système porte (complément)', d: 'Les terminaisons des neurones hypophysiotropes y libèrent leurs facteurs dans le plexus capillaire primaire du système porte hypothalamo-hypophysaire, qui les conduit à l\'antéhypophyse (polycopié p. 47).' },
    'zh-stalk': { t: 'Tige pituitaire', k: 'Système porte et axones magnocellulaires', d: 'Elle contient les vaisseaux portes (facteurs hypothalamiques vers l\'antéhypophyse) et les axones des noyaux supraoptiques et paraventriculaires (ADH, ocytocine vers la posthypophyse). Sa section entraîne des déficits somatotrope, gonadotrope, thyréotrope et corticotrope et une hyperprolactinémie de déconnexion (polycopié p. 47).' },
    'zh-portal': { t: 'Système porte hypothalamo-hypophysaire', k: 'Polycopié p. 47', d: 'Il véhicule les facteurs hypothalamiques stimulants (CRH, TRH, GHRH, GnRH) et la dopamine, inhibitrice de la prolactine, jusqu\'à l\'antéhypophyse.' },
    'zh-magno': { t: 'Axones magnocellulaires', k: 'Voie de l\'ADH et de l\'ocytocine', d: 'L\'ADH transite le long des axones de la tige pituitaire et est stockée dans la posthypophyse, d\'où elle est libérée dans la circulation sanguine (polycopié p. 50).' },
    'zh-tract': { t: 'Chiasma et tractus optiques', k: 'Voies visuelles', d: 'Le chiasma est situé au-dessus de la selle turcique : une tumeur à extension supra-sellaire le comprime (hémianopsie bitemporale, polycopié p. 51).' },
    'zh-composite': { t: 'Schéma composite', k: 'Complément', d: 'Les noyaux ne sont pas tous dans le même plan frontal : supraoptiques et suprachiasmatiques sont plus antérieurs (niveau du chiasma), le noyau arqué et l\'éminence médiane plus postérieurs (niveau tubérien). Ils sont regroupés ici pour la lecture.' }
  });

  const nuc = HV.scene(Object.assign({
    id: 'hh-nuclei',
    parent: 'lacto',
    loupe: 'Noyaux hypothalamiques',
    title: 'Noyaux hypothalamiques',
    level: 'Tissu',
    lead: 'Autour du 3e ventricule, des groupes de neurones spécialisés produisent les hormones hypothalamiques. Les neurones parvocellulaires libèrent leurs facteurs dans l\'éminence médiane, d\'où le système porte les conduit à l\'antéhypophyse ; les neurones magnocellulaires des noyaux supraoptiques et paraventriculaires envoient l\'ADH et l\'ocytocine par leurs axones jusqu\'à la posthypophyse.',
    points: [
      'ADH et ocytocine : synthèse dans les noyaux supraoptiques et paraventriculaires, transport axonal dans la tige, stockage et libération posthypophysaires (polycopié p. 47 et 50).',
      'Les facteurs hypothalamiques gagnent l\'antéhypophyse par le système porte ; seule la prolactine est sous influence inhibitrice, celle de la dopamine (polycopié p. 47).',
      'Localisation des noyaux : paraventriculaire (CRH, TRH), arqué (GHRH, dopamine, kisspeptine, POMC / NPY), périventriculaire (somatostatine), suprachiasmatique (horloge) (complément).',
      'La section de la tige donne un déficit GH, LH/FSH, TSH, ACTH et une hyperprolactinémie de déconnexion (polycopié p. 47).',
      'Schéma composite : plusieurs plans frontaux réunis (complément).'
    ],
    legend: new Set(['crh', 'trh', 'adh', 'oxy', 'ghrh', 'dopa', 'kiss', 'sst', 'gnrh']),
    build(g, a) {
      a.frame('Noyaux hypothalamiques', 'Coupe frontale autour du 3e ventricule · schéma composite');
      const cx = 600;
      const mir = (x) => 2 * cx - x;
      // Tissu hypothalamique et ventricule
      a.path('M 270,205 L 930,205 C 945,320 950,450 930,530 C 905,600 800,640 690,650 C 660,652 640,660 630,668 L 570,668 C 560,660 540,652 510,650 C 400,640 295,600 270,530 C 250,450 255,320 270,205 Z', 'zh-tissue', null, { 'data-info': 'zh-composite' });
      a.path('M 584,172 L 616,172 L 616,600 C 616,622 608,640 600,652 C 592,640 584,622 584,600 Z', 'zh-v3', null, { 'data-info': 'zh-v3' });
      a.text(626, 192, '3e ventricule', 'note', null);
      // Tige et éminence médiane
      a.path('M 568,676 C 574,760 580,860 580,965 L 620,965 C 620,860 626,760 632,676 Z', 'zh-stalk', null, { 'data-info': 'zh-stalk' });
      const portalD = 'M 588,684 C 589,770 590,870 590,962';
      a.path(portalD, 'zh-portal', null, { 'data-info': 'zh-portal' });
      a.path('M 610,690 L 610,962', 'zh-axon', null, { 'data-info': 'zh-magno' });
      a.el('ellipse', { cx, cy: 668, rx: 52, ry: 18, class: 'zh-me', 'data-info': 'zh-me' });
      // Tractus optiques
      [345, mir(345)].forEach((x) => a.el('ellipse', { cx: x, cy: 638, rx: 62, ry: 22, class: 'zh-tract', 'data-info': 'zh-tract' }));

      // Noyaux : contour coloré + neurones colorés par hormone
      const dots = (parent, ecx, ecy, rx, ry, pick, r) => {
        for (let y = ecy - ry; y <= ecy + ry; y += 15) {
          for (let x = ecx - rx; x <= ecx + rx; x += 15) {
            const xx = x + (rnd() - 0.5) * 6, yy = y + (rnd() - 0.5) * 6;
            if (((xx - ecx) / (rx - 6)) ** 2 + ((yy - ecy) / (ry - 6)) ** 2 > 1) continue;
            const h = pick(xx, yy);
            a.el('circle', { cx: xx, cy: yy, r: h.r || r || 5, class: 'zh-dot', style: `--c: var(--${HC[h.k]})` }, parent);
          }
        }
      };
      const nucleus = (info, color, ecx, ecy, rx, ry, pick, r) => {
        const ng = a.el('g', { 'data-info': info });
        a.el('ellipse', { cx: ecx, cy: ecy, rx, ry, class: 'zh-nuc', style: `--c: var(--${color})` }, ng);
        dots(ng, ecx, ecy, rx, ry, pick, r);
        return ng;
      };
      // Paraventriculaires : parvocellulaires en dedans (CRH, TRH), magnocellulaires en dehors (ADH, ocytocine).
      [505, mir(505)].forEach((x) => nucleus('zh-pvn', 'p-orange', x, 300, 58, 55, (xx) => {
        const medial = Math.abs(xx - cx) < Math.abs(x - cx);
        return medial ? { k: rnd() < 0.5 ? 'crh' : 'trh', r: 4.5 } : { k: rnd() < 0.5 ? 'adh' : 'oxy', r: 6.5 };
      }));
      // Périventriculaires (somatostatine)
      [[566, 584], [616, 634]].forEach(([x0, x1]) => {
        const pg = a.el('g', { 'data-info': 'zh-peri' });
        a.el('rect', { x: x0, y: 240, width: x1 - x0, height: 300, rx: 9, class: 'zh-nuc', style: '--c: var(--p-grey)' }, pg);
        for (let y = 256; y < 530; y += 22) a.el('circle', { cx: (x0 + x1) / 2, cy: y, r: 4.5, class: 'zh-dot', style: '--c: var(--p-grey)' }, pg);
      });
      // Arqués
      const arcK = ['ghrh', 'dopa', 'kiss', 'pomc', 'npy'];
      [538, mir(538)].forEach((x) => nucleus('zh-arc', 'p-sky', x, 592, 40, 30, () => ({ k: arcK[Math.floor(rnd() * 5)], r: 4.5 })));
      // Supraoptiques (au-dessus des tractus optiques)
      [345, mir(345)].forEach((x) => nucleus('zh-son', 'p-blue', x, 600, 52, 22, () => ({ k: rnd() < 0.5 ? 'adh' : 'oxy', r: 6 })));
      // Neurone à GnRH (dispersés ; un seul figuré)
      const gn = a.el('g', { 'data-info': 'zh-gnrh' });
      const gnAx = 'M 770,482 C 760,560 680,620 622,662';
      a.path(gnAx, 'zh-axon', gn, { style: 'stroke: var(--p-violet)' });
      a.el('circle', { cx: 770, cy: 470, r: 13, class: 'zh-dot', style: '--c: var(--p-violet)' }, gn);

      // Axones magnocellulaires vers la tige
      const magno = [
        ['M 345,598 C 420,640 560,650 604,700 L 606,962', 'adh'],
        [`M ${mir(345)},598 C ${mir(420)},640 ${mir(560)},650 ${mir(604)},700 L ${mir(606)},962`, 'oxy'],
        ['M 470,330 C 470,470 560,600 604,690 L 606,962', 'adh'],
        [`M ${mir(470)},330 C ${mir(470)},470 ${mir(560)},600 ${mir(604)},690 L ${mir(606)},962`, 'oxy']
      ];
      magno.forEach(([d, m], i) => {
        a.path(d, 'zh-axon', null, { 'data-info': 'zh-magno' });
        a.flow(d, { mol: m, rate: () => 0.55, size: 1.1, speed: 70, track: false, max: 14 });
        a.flow(d, { mol: m === 'adh' ? 'oxy' : 'adh', rate: () => 0.25, size: 1.1, speed: 70, track: false, max: 8 });
      });
      // Voies parvocellulaires vers l'éminence médiane
      const parvo = [
        ['M 535,330 C 560,430 575,560 590,660', 'crh'],
        [`M ${mir(535)},330 C ${mir(560)},430 ${mir(575)},560 ${mir(590)},660`, 'trh'],
        ['M 575,300 C 576,420 580,560 595,660', 'sst'],
        [`M ${mir(575)},300 C ${mir(576)},420 ${mir(580)},560 ${mir(595)},660`, 'sst'],
        ['M 545,600 C 560,630 578,650 592,664', 'ghrh'],
        [`M ${mir(545)},600 C ${mir(560)},630 ${mir(578)},650 ${mir(592)},664`, 'dopa'],
        [gnAx, 'gnrh']
      ];
      parvo.forEach(([d, m]) => a.flow(d, { mol: m, rate: () => 0.6, size: 1, speed: 60, track: false, max: 10 }));
      a.flow('M 668,588 C 690,575 712,566 732,562', { mol: 'kiss', rate: () => 0.8, size: 1, speed: 35, track: false, max: 6 });
      // Système porte dans la tige
      ['crh', 'trh', 'ghrh', 'sst', 'dopa', 'gnrh'].forEach((m) => a.flow(portalD, { mol: m, rate: () => 0.35, size: 1.1, speed: 70, track: false, max: 8 }));

      // Étiquettes à gauche
      a.text(60, 290, 'Paraventriculaire', 'lbl-s strong', { attrs: { 'data-info': 'zh-pvn' } });
      a.text(60, 314, 'parvo- et magnocellulaire', 'note');
      lead(a, [[250, 292], [447, 300]]);
      a.text(60, 425, 'Périventriculaire', 'lbl-s strong', { attrs: { 'data-info': 'zh-peri' } });
      lead(a, [[225, 420], [566, 430]]);
      a.text(60, 505, 'Arqué', 'lbl-s strong', { attrs: { 'data-info': 'zh-arc' } });
      a.text(60, 529, '(infundibulaire)', 'note');
      lead(a, [[200, 510], [502, 586]]);
      a.text(60, 700, 'Supraoptique', 'lbl-s strong', { attrs: { 'data-info': 'zh-son' } });
      lead(a, [[185, 694], [312, 614]]);
      // Étiquettes à droite
      a.text(800, 238, 'CRH · TRH · ADH · OT', 'note', { anchor: 'middle' });
      a.text(792, 476, 'neurone à GnRH', 'lbl-s strong', { attrs: { 'data-info': 'zh-gnrh' } });
      a.text(792, 500, '(complément)', 'note');
      a.text(855, 690, 'tractus optique', 'lbl-s strong', { anchor: 'middle', attrs: { 'data-info': 'zh-tract' } });
      a.text(690, 735, 'Éminence médiane', 'lbl-s strong', { attrs: { 'data-info': 'zh-me' } });
      lead(a, [[686, 728], [640, 680]]);
      a.text(650, 820, 'Tige pituitaire', 'lbl-s strong', { attrs: { 'data-info': 'zh-stalk' } });
      a.text(565, 930, 'système porte → antéhypophyse', 'note', { anchor: 'end', attrs: { 'data-info': 'zh-portal' } });
      a.text(640, 930, 'axones → posthypophyse', 'note', { attrs: { 'data-info': 'zh-magno' } });
      a.text(688, 546, 'kisspeptine', 'note zh-halo', { attrs: { 'data-info': 'zh-gnrh' } });

      /* Encadré : plan plus antérieur (chiasma) */
      const IX = 1080;
      a.el('rect', { x: IX, y: 160, width: 470, height: 305, rx: 18, class: 'side-box' });
      a.text(IX + 20, 192, 'Plus en avant : niveau du chiasma', 'lbl-s strong');
      const icx = 1315;
      a.path(`M 1130,225 L 1500,225 C 1510,300 1500,350 1470,380 C 1420,392 1210,392 1160,380 C 1130,350 1120,300 1130,225 Z`, 'zh-tissue', null, { 'data-info': 'zh-composite' });
      a.path(`M ${icx - 7},215 L ${icx + 7},215 L ${icx + 7},340 C ${icx + 7},352 ${icx},362 ${icx},362 C ${icx},362 ${icx - 7},352 ${icx - 7},340 Z`, 'zh-v3', null, { 'data-info': 'zh-v3' });
      a.el('ellipse', { cx: icx, cy: 398, rx: 165, ry: 20, class: 'zh-tract', 'data-info': 'zh-tract' });
      const scn = a.el('g', { 'data-info': 'zh-scn' });
      [icx - 26, icx + 26].forEach((x) => a.el('ellipse', { cx: x, cy: 362, rx: 17, ry: 14, class: 'zh-nuc', style: '--c: var(--p-gold)' }, scn));
      [icx - 26, icx + 26].forEach((x) => a.el('circle', { cx: x, cy: 362, r: 6, class: 'zh-dot', style: '--c: var(--p-gold)' }, scn));
      [icx - 128, icx + 128].forEach((x) => nucleus('zh-son', 'p-blue', x, 362, 34, 14, () => ({ k: rnd() < 0.5 ? 'adh' : 'oxy', r: 5 })));
      a.text(icx, 446, 'chiasma optique', 'note', { anchor: 'middle' });
      a.text(IX + 20, 262, 'suprachiasmatique', 'lbl-s strong', { attrs: { 'data-info': 'zh-scn' } });
      a.text(IX + 20, 284, '(horloge, complément)', 'note');
      lead(a, [[IX + 110, 292], [icx - 30, 348]]);
      a.text(1490, 262, 'supraoptique', 'lbl-s strong', { anchor: 'end', attrs: { 'data-info': 'zh-son' } });
      lead(a, [[1440, 270], [icx + 128, 350]]);
      a.dyn(() => scn.setAttribute('opacity', (0.55 + 0.45 * Math.sin(performance.now() / 700)).toFixed(2)));

      /* Clé : hormones de chaque noyau */
      a.text(IX, 508, 'Ce que sécrète chaque noyau', 'lbl-h');
      const rows = [
        ['Paraventriculaire', 'zh-pvn', [['CRH', 'crh'], ['TRH', 'trh'], ['ADH', 'adh', 'post'], ['ocytocine', 'oxy', 'post']]],
        ['Supraoptique', 'zh-son', [['ADH', 'adh', 'post'], ['ocytocine', 'oxy', 'post']]],
        ['Arqué', 'zh-arc', [['GHRH', 'ghrh'], ['dopamine', 'dopa'], ['kisspeptine', 'kiss', 'loc'], ['POMC / NPY', 'pomc', 'loc']]],
        ['Périventriculaire', 'zh-peri', [['somatostatine', 'sst']]],
        ['Aire préoptique (complément)', 'zh-gnrh', [['GnRH', 'gnrh']]],
        ['Suprachiasmatique', 'zh-scn', [['horloge circadienne', 'scn', 'loc']]]
      ];
      rows.forEach(([name, info, chips], i) => {
        const y = 548 + i * 62;
        const rg = a.el('g', { 'data-info': info });
        a.text(IX, y, name, 'lbl-s strong', null, rg);
        let x = IX;
        chips.forEach(([lab, k, kind]) => { x += chip(a, x, y + 9, lab, HC[k], kind, rg) + 8; });
      });
      const ly = 935;
      let lx = IX;
      lx += chip(a, lx, ly - 20, 'système porte', 'p-grey', '') + 8;
      lx += chip(a, lx, ly - 20, 'posthypophyse', 'p-grey', 'post') + 8;
      chip(a, lx, ly - 20, 'action locale', 'p-grey', 'loc');
      a.text(IX, ly + 34, 'Localisations : complément ; ADH et ocytocine : polycopié p. 47', 'note');

      HV.spotlight(nuc, a, [
        { t: 'Une coupe frontale', d: 'Le 3e ventricule occupe la ligne médiane ; les noyaux hypothalamiques sont disposés symétriquement de part et d\'autre. Son plancher se prolonge par l\'éminence médiane et la tige pituitaire. Le schéma réunit plusieurs plans de coupe (complément).', spot: [[260, 165, 690, 520]] },
        { t: 'ADH et ocytocine : la voie magnocellulaire', d: 'Les neurones des noyaux supraoptiques et paraventriculaires synthétisent l\'ADH et l\'ocytocine. Ces hormones transitent le long des axones de la tige pituitaire et sont stockées dans la posthypophyse, d\'où elles sont libérées dans le sang (polycopié p. 47 et 50).', spot: [[345, 600, 90], [855, 600, 90], [505, 300, 80], [695, 300, 80], [560, 690, 100, 280]] },
        { t: 'Les facteurs hypophysiotropes', d: 'D\'autres neurones (parvocellulaires) libèrent leurs facteurs dans l\'éminence médiane : CRH et TRH (paraventriculaire), somatostatine (périventriculaire), GHRH et dopamine (arqué) (localisations : complément).', spot: [[600, 420, 150], [600, 620, 110]] },
        { t: 'Le système porte', d: 'Le plexus capillaire de l\'éminence médiane se draine dans les vaisseaux portes de la tige, qui conduisent ces facteurs à l\'antéhypophyse. Tous sont stimulants, sauf la dopamine qui freine la prolactine (polycopié p. 47).', spot: [[540, 650, 120, 330]] },
        { t: 'Le noyau arqué', d: 'Ses neurones à kisspeptine font partie des signaux qui commandent les neurones à GnRH (polycopié, partie 2 p. 3) ; ses neurones à POMC et à NPY interviennent dans la régulation de l\'appétit (complément).', spot: [[560, 590, 70], [720, 520, 110]] },
        { t: 'L\'horloge suprachiasmatique', d: 'Plus en avant, juste au-dessus du chiasma, les noyaux suprachiasmatiques reçoivent la lumière via la rétine et rythment les sécrétions sur 24 heures (complément).', spot: [[IX, 160, 470, 305]] },
        { t: 'Que se passe-t-il si la tige est sectionnée ?', d: 'Les facteurs ne gagnent plus l\'antéhypophyse : déficits somatotrope, gonadotrope, thyréotrope et corticotrope. À l\'inverse, la prolactine n\'est plus freinée par la dopamine : hyperprolactinémie de déconnexion (polycopié p. 47).', spot: [[540, 660, 120, 310]] }
      ]);
    }
  }, HV.LOUPE.L(0)));

  /* ======================================================================
     2. Loge hypophysaire (coupe frontale de la selle turcique)
     ====================================================================== */
  Object.assign(HV.INFO, {
    'zh-gland': { t: 'Hypophyse', k: 'Dans la selle turcique de l\'os sphénoïde (polycopié p. 47)', d: 'Sa taille n\'excède pas 1 cm de diamètre. Elle est reliée à l\'hypothalamus par la tige pituitaire.' },
    'zh-cav': { t: 'Sinus caverneux', k: 'De part et d\'autre de la selle', d: 'Contient la carotide interne et des nerfs crâniens. Les nerfs oculomoteurs III, IV et VI y cheminent : leur compression par un adénome envahissant donne des troubles de l\'oculomotricité (polycopié p. 51). Disposition : III, IV, V1, V2 dans la paroi latérale, VI libre près de la carotide (complément).' },
    'zh-ica': { t: 'Artère carotide interne', k: 'Dans le sinus caverneux (complément)', d: 'Un adénome qui envahit le sinus caverneux peut l\'engainer (complément).' },
    'zh-n3': { t: 'Nerf oculomoteur (III)', k: 'Paroi latérale du sinus caverneux (complément)', d: 'Sa compression donne une diplopie, un ptosis (polycopié p. 51, notamment dans l\'apoplexie).' },
    'zh-n4': { t: 'Nerf trochléaire (IV)', k: 'Paroi latérale du sinus caverneux (complément)', d: 'Nerf oculomoteur : sa compression participe aux troubles de l\'oculomotricité (polycopié p. 51).' },
    'zh-n6': { t: 'Nerf abducens (VI)', k: 'Libre dans le sinus, près de la carotide (complément)', d: 'Nerf oculomoteur : sa compression donne une diplopie (polycopié p. 51).' },
    'zh-n5': { t: 'Nerfs ophtalmique (V1) et maxillaire (V2)', k: 'Paroi latérale du sinus caverneux (complément)', d: 'Branches sensitives du trijumeau.' },
    'zh-chiasm': { t: 'Chiasma optique', k: 'Au-dessus de la selle', d: 'Une extension supra-sellaire le comprime : amputation du champ visuel, classiquement quadranopsie ou hémianopsie bitemporale (polycopié p. 51, figure 18).' },
    'zh-dia': { t: 'Diaphragme sellaire', k: 'Toit dure-mérien de la loge (complément)', d: 'Percé par la tige pituitaire ; un macroadénome le refoule vers le haut.' },
    'zh-sph': { t: 'Sinus sphénoïdal', k: 'Sous la selle', d: 'Une extension infra-sellaire expose au risque de rhinorrhée (fuite de LCR par les fosses nasales) en cas de chirurgie ou de fonte de l\'adénome sous traitement médical (polycopié p. 67).' },
    'zh-tumor': { t: 'Adénome hypophysaire', k: 'Micro < 10 mm · macro ≥ 10 mm · géant > 40 mm (polycopié p. 65–66)', d: 'Tumeur bénigne dans 99 % des cas (polycopié p. 50). L\'IRM précise sa taille, l\'envahissement latéral des sinus caverneux, l\'extension supra-sellaire et l\'extension infra-sellaire (polycopié p. 65–67).' },
    'zh-vf': { t: 'Champ visuel', k: 'Figure 18 du polycopié', d: 'Représenté tel que vu par le patient : la moitié temporale de chaque œil est du côté extérieur. Une compression du chiasma ampute les deux champs temporaux.' },
    'zh-apo': { t: 'Apoplexie hypophysaire', k: 'Nécrose hémorragique d\'un adénome (polycopié p. 51)', d: 'Céphalées aiguës « en coup de poignard dans un ciel serein », parfois hypertension intracrânienne, syndrome méningé, amputation du champ visuel, trouble oculomoteur et/ou ptosis. C\'est uniquement dans ce contexte qu\'un adénome peut s\'associer à un diabète insipide.' }
  });

  const SEL = {
    normal: { p: { x: 600, y: 570, u: 0, d: 0, l: 0, r: 0, o: 0, h: 0 }, vf: 0, txt: ['hypophyse normale (< 1 cm)', 'normale', 'normale', 'normale', 'pas de déficit', 'pas de diabète insipide', ''] },
    micro: { p: { x: 640, y: 565, u: 26, d: 26, l: 26, r: 26, o: 1, h: 0 }, vf: 0, txt: ['microadénome < 10 mm, intrasellaire', 'normale', 'normale', 'pas d\'effet de masse', 'pas d\'effet de masse', 'pas de diabète insipide', ''] },
    macro: { p: { x: 600, y: 545, u: 155, d: 65, l: 122, r: 122, o: 1, h: 0 }, vf: 1, txt: ['macroadénome ≥ 10 mm, extension supra-sellaire', 'quadranopsie bitemporale (chiasma)', 'normale', 'déconnexion possible : < 200 ng/mL', 'insuffisance antéhypophysaire possible', 'pas de diabète insipide', 'céphalées'] },
    ext: { p: { x: 600, y: 565, u: 245, d: 285, l: 250, r: 250, o: 1, h: 0 }, vf: 2, txt: ['adénome géant (> 40 mm), envahissant', 'hémianopsie bitemporale', 'diplopie : III, IV, VI (sinus caverneux)', 'déconnexion possible : < 200 ng/mL', 'insuffisance antéhypophysaire possible', 'pas de diabète insipide', 'sinus sphénoïdal : risque de rhinorrhée'] },
    apo: { p: { x: 600, y: 545, u: 190, d: 65, l: 130, r: 130, o: 1, h: 1 }, vf: 2, txt: ['apoplexie : nécrose hémorragique', 'amputation du champ visuel', 'trouble oculomoteur, ptosis possibles', '—', 'insuffisance antéhypophysaire (complément)', 'diabète insipide possible', 'céphalée brutale, syndrome méningé'] }
  };
  const sella = HV.scene(Object.assign({
    id: 'sella',
    parent: 'lacto',
    loupe: 'Loge hypophysaire',
    title: 'Loge hypophysaire',
    level: 'Organe',
    lead: 'L\'hypophyse occupe la selle turcique de l\'os sphénoïde. Au-dessus, le chiasma optique ; de chaque côté, les sinus caverneux et leurs nerfs oculomoteurs ; en dessous, le sinus sphénoïdal. Un adénome qui grossit comprime ces voisins : c\'est le syndrome tumoral hypophysaire.',
    points: [
      'Chiasma : amputation du champ visuel, classiquement quadranopsie ou hémianopsie bitemporale (polycopié p. 51, figure 18).',
      'Sinus caverneux : troubles de l\'oculomotricité par atteinte des nerfs III, IV et VI (polycopié p. 51).',
      'Taille en IRM : microadénome < 10 mm, macroadénome ≥ 10 mm, adénome géant > 40 mm (polycopié p. 65–66, figures 22A à 22C).',
      'Extension infra-sellaire dans le sinus sphénoïdal : risque de rhinorrhée de LCR (polycopié p. 67).',
      'Apoplexie (nécrose hémorragique) : seule situation où un adénome peut donner un diabète insipide (polycopié p. 51 et 64–65).',
      'Disposition des nerfs dans le sinus caverneux : complément.'
    ],
    legend: new Set([]),
    build(g, a) {
      a.frame('Loge hypophysaire', 'Coupe frontale de la selle turcique · effet de masse d\'un adénome');
      const cx = 600, mir = (x) => 2 * cx - x;
      // Cerveau, 3e ventricule, tige
      a.path('M 300,165 L 900,165 L 900,300 C 820,312 700,300 660,330 L 540,330 C 500,300 380,312 300,300 Z', 'zh-tissue');
      a.path('M 590,165 L 610,165 L 610,300 C 610,316 600,330 600,330 C 600,330 590,316 590,300 Z', 'zh-v3', null, { 'data-info': 'zh-v3' });
      a.path('M 588,330 C 590,400 594,450 596,508 L 614,508 C 612,450 610,400 612,330 Z', 'zh-stalk', null, { 'data-info': 'zh-stalk' });
      // Os sphénoïde et sinus sphénoïdal
      a.path('M 350,700 C 380,662 440,652 470,600 C 492,642 708,642 730,600 C 760,652 820,662 850,700 L 850,950 L 350,950 Z', 'zh-bone', null, { 'data-info': 'zh-sph' });
      a.path('M 420,705 C 420,680 450,672 600,672 C 750,672 780,680 780,705 L 780,880 C 780,905 760,915 600,915 C 440,915 420,905 420,880 Z', 'zh-air', null, { 'data-info': 'zh-sph' });
      a.path('M 600,672 L 594,760 L 606,830 L 600,915', 'zh-septum');
      // Hypophyse
      a.el('ellipse', { cx, cy: 562, rx: 126, ry: 56, class: 'zh-gland', 'data-info': 'zh-gland' });
      a.el('ellipse', { cx, cy: 566, rx: 40, ry: 30, class: 'zh-gland-p', 'data-info': 'pit-post', opacity: 0.6 });
      // Sinus caverneux
      const cavD = (m) => `M ${m(470)},515 C ${m(430)},500 ${m(360)},510 ${m(340)},540 C ${m(325)},580 ${m(330)},650 ${m(360)},690 C ${m(400)},700 ${m(450)},670 ${m(470)},610 Z`;
      const id = (x) => x;
      a.path(cavD(id), 'zh-cav', null, { 'data-info': 'zh-cav' });
      a.path(cavD(mir), 'zh-cav', null, { 'data-info': 'zh-cav' });
      // Adénome (dessiné avant les vaisseaux et nerfs : ils restent visibles quand il les engaine)
      const tum = a.path('', 'zh-tumor', null, { 'data-info': 'zh-tumor' });
      const hemo = a.path('', 'zh-hemo', null, { 'data-info': 'zh-apo' });
      const tumLbl = a.text(cx, 0, 'adénome', 'les-lbl', { anchor: 'middle', attrs: { 'data-info': 'zh-tumor' } });
      // Contenu des sinus caverneux
      [id, mir].forEach((m) => {
        a.el('circle', { cx: m(420), cy: 590, r: 26, class: 'zh-ica', 'data-info': 'zh-ica' });
        a.el('circle', { cx: m(378), cy: 622, r: 8, class: 'zh-nerve', 'data-info': 'zh-n6' });
        [[352, 548, 9, 'zh-n3'], [344, 574, 7, 'zh-n4'], [338, 610, 9, 'zh-n5'], [348, 652, 10, 'zh-n5']].forEach(([x, y, r, k]) =>
          a.el('circle', { cx: m(x), cy: y, r, class: 'zh-nerve', 'data-info': k }));
      });
      // Diaphragme sellaire et chiasma (déformables)
      const dia = a.path('', 'zh-dura', null, { 'data-info': 'zh-dia' });
      const chi = a.path('', 'zh-chiasm', null, { 'data-info': 'zh-chiasm' });

      // Étiquettes à gauche (sinus gauche : nerfs de la paroi latérale)
      a.text(60, 230, 'hypothalamus', 'lbl-s strong');
      lead(a, [[190, 224], [330, 240]]);
      a.text(60, 455, 'tige pituitaire', 'lbl-s strong', { attrs: { 'data-info': 'zh-stalk' } });
      lead(a, [[200, 450], [590, 470]]);
      [['III · oculomoteur', 505, [352, 548], 'zh-n3'], ['IV · trochléaire', 545, [344, 574], 'zh-n4'], ['V1 · ophtalmique', 600, [338, 610], 'zh-n5'], ['V2 · maxillaire', 668, [348, 652], 'zh-n5']].forEach(([t, y, p, k]) => {
        a.text(60, y, t, 'lbl-s strong', { attrs: { 'data-info': k } });
        lead(a, [[222, y - 6], [p[0] - 10, p[1]]]);
      });
      // Étiquettes à droite
      const RX = 905;
      [['chiasma optique', 392, [752, 400], 'zh-chiasm'], ['diaphragme sellaire', 462, [722, 505], 'zh-dia'], ['hypophyse', 520, [705, 545], 'zh-gland'],
        ['carotide interne', 584, [mir(420) + 24, 590], 'zh-ica'], ['VI · abducens', 640, [mir(378) + 8, 624], 'zh-n6'], ['sinus caverneux', 700, [mir(360) + 4, 682], 'zh-cav'], ['sinus sphénoïdal', 800, [782, 800], 'zh-sph']].forEach(([t, y, p, k]) => {
        a.text(RX, y, t, 'lbl-s strong', { attrs: { 'data-info': k } });
        lead(a, [[RX - 6, y - 6], p]);
      });
      a.text(612, 196, '3e ventricule', 'note');

      /* Colonne de droite : boutons, champ visuel, retentissement */
      const CX = 1120;
      a.text(CX, 178, 'Taille de l\'adénome', 'lbl-h');
      HV.figBadge(a, 1520, 168, ['22A', '22B', '22C']);
      const btns = {};
      const setState = (k) => { state = k; Object.keys(btns).forEach((b) => btns[b].classList.toggle('on', b === k)); render(); };
      [['normal', 'Normale', CX, 196, 130], ['micro', 'Micro', CX + 145, 196, 130], ['macro', 'Macro', CX + 290, 196, 130],
        ['ext', 'Envahissant', CX, 250, 205], ['apo', 'Apoplexie', CX + 220, 250, 200]].forEach(([k, t, x, y, w]) => {
        btns[k] = button(a, sella, x, y, w, t, () => setState(k), k === 'apo' ? 'zh-apo' : 'zh-tumor');
      });
      a.text(CX, 322, 'micro < 10 mm · macro ≥ 10 mm · géant > 40 mm', 'note');
      a.text(CX, 368, 'Champ visuel', 'lbl-s strong', { attrs: { 'data-info': 'zh-vf' } });
      HV.figBadge(a, 1310, 360, ['18']);
      // Deux champs : quadrants temporaux supérieur et inférieur
      const vfq = [];
      [[1225, 'œil gauche', -1], [1445, 'œil droit', 1]].forEach(([x, t, side]) => {
        const vg = a.el('g', { 'data-info': 'zh-vf' });
        a.el('circle', { cx: x, cy: 450, r: 62, class: 'zh-vf-bg' }, vg);
        const ex = x + side * 62;
        const sup = a.path(`M ${x},450 L ${x},388 A 62 62 0 0 ${side > 0 ? 1 : 0} ${ex},450 Z`, 'zh-vf-q', vg);
        const inf = a.path(`M ${x},450 L ${ex},450 A 62 62 0 0 ${side > 0 ? 1 : 0} ${x},512 Z`, 'zh-vf-q', vg);
        a.path(`M ${x - 62},450 H ${x + 62} M ${x},388 V 512`, 'zh-vf-ax', vg);
        a.text(x, 540, t, 'note', { anchor: 'middle' }, vg);
        a.text(x + side * 80, 456, 'T', 'note', { anchor: 'middle' }, vg);
        vfq.push([sup, inf]);
      });
      // Retentissement
      const keys = ['Taille', 'Vision', 'Oculomotricité', 'Prolactine', 'Antéhypophyse', 'Posthypophyse', 'Autres signes'];
      const vals = keys.map((k, i) => {
        const y = 588 + i * 54;
        a.text(CX, y, k, 'lbl-s strong');
        return a.text(CX, y + 23, '', 'zh-val');
      });

      // Rendu progressif (interpolation des paramètres de la tumeur)
      let state = 'macro';
      const cur = Object.assign({}, SEL.normal.p);
      const blob = (p, k) => {
        const K = 0.56, x = p.x, y = p.y, u = p.u * k, d = p.d * k, l = p.l * k, r = p.r * k;
        return `M ${x - l},${y} C ${x - l},${y - u * K} ${x - l * K},${y - u} ${x},${y - u} C ${x + r * K},${y - u} ${x + r},${y - u * K} ${x + r},${y} C ${x + r},${y + d * K} ${x + r * K},${y + d} ${x},${y + d} C ${x - l * K},${y + d} ${x - l},${y + d * K} ${x - l},${y} Z`;
      };
      function render() {
        const s = SEL[state];
        s.txt.forEach((t, i) => {
          vals[i].textContent = t || '—';
          vals[i].setAttribute('class', 'zh-val' + (/possible|diplopie|anopsie|amputation|rhinorrhée|brutale|insuffisance|déconnexion/.test(t) && !/^pas /.test(t) ? (state === 'apo' ? ' bad' : ' warn') : ''));
        });
        vfq.forEach(([sup, inf]) => { sup.style.opacity = s.vf >= 1 ? 0.75 : 0; inf.style.opacity = s.vf >= 2 ? 0.75 : 0; });
      }
      a.dyn((dt) => {
        const tgt = SEL[state].p, k = 1 - Math.exp(-dt * 2.5);
        Object.keys(cur).forEach((q) => { cur[q] += (tgt[q] - cur[q]) * (dt > 0 ? k : 1); });
        tum.setAttribute('d', blob(cur, 1));
        tum.setAttribute('opacity', cur.o.toFixed(2));
        hemo.setAttribute('d', blob(cur, 0.6));
        hemo.style.opacity = (0.7 * cur.h).toFixed(2);
        tumLbl.setAttribute('y', (cur.y + 6).toFixed(0));
        tumLbl.setAttribute('opacity', cur.o > 0.5 && cur.u > 60 ? 1 : 0);
        const top = cur.y - cur.u * (cur.o > 0.05 ? 1 : 0);
        const lift = clamp(420 - top, 0, 80);
        const y0 = 400 - lift * 0.3;
        chi.setAttribute('d', `M 450,${y0.toFixed(1)} Q 600,${(y0 - 2 * lift).toFixed(1)} 750,${y0.toFixed(1)}`);
        chi.setAttribute('stroke-width', (34 - lift * 0.15).toFixed(1));
        const apex = Math.min(508, top - 4);
        dia.setAttribute('d', `M 468,508 Q 600,${(2 * apex - 508).toFixed(1)} 732,508`);
      });
      setState('macro');

      HV.spotlight(sella, a, [
        { t: 'La loge hypophysaire', d: 'L\'hypophyse (moins de 1 cm) occupe la selle turcique de l\'os sphénoïde ; la tige pituitaire la relie à l\'hypothalamus (polycopié p. 47). Au-dessus : le diaphragme sellaire puis le chiasma optique ; en dessous : le sinus sphénoïdal.', spot: [[440, 340, 320, 330]], act: () => setState('normal') },
        { t: 'Les sinus caverneux', d: 'De chaque côté, ils contiennent la carotide interne et les nerfs oculomoteurs III, IV et VI (polycopié p. 51). Disposition : III, IV, V1, V2 dans la paroi latérale, VI libre près de la carotide (complément).', spot: [[400, 600, 110], [800, 600, 110]], act: () => setState('normal') },
        { t: 'Microadénome', d: 'Moins de 10 mm : il reste dans la selle, sans effet de masse sur les structures voisines (polycopié p. 65).', spot: [[600, 565, 140]], act: () => setState('micro') },
        { t: 'Macroadénome : le chiasma', d: '10 mm ou plus : l\'extension supra-sellaire refoule le diaphragme et comprime le chiasma. Amputation du champ visuel : classiquement quadranopsie ou hémianopsie bitemporale (polycopié p. 51, figure 18). Dans une tumeur non lactotrope, la compression de la tige donne une prolactine modérément élevée (< 200 ng/mL, déconnexion ; polycopié p. 52).', spot: [[600, 450, 170], [1110, 340, 440, 220]], act: () => setState('macro') },
        { t: 'Adénome envahissant', d: 'Envahissement latéral des sinus caverneux (diplopie par atteinte des III, IV, VI) et extension infra-sellaire dans le sinus sphénoïdal, avec risque de rhinorrhée de LCR (polycopié p. 51 et 67). Au-delà de 40 mm : adénome géant (p. 66).', spot: [[600, 600, 300]], act: () => setState('ext') },
        { t: 'Apoplexie hypophysaire', d: 'Nécrose hémorragique de l\'adénome : céphalée brutale « en coup de poignard », parfois syndrome méningé, troubles visuels, trouble oculomoteur ou ptosis. C\'est le seul contexte où un adénome peut donner un diabète insipide (polycopié p. 51).', spot: [[600, 520, 210], [1110, 560, 440, 420]], act: () => setState('apo') }
      ]);
      stepActions(sella, sella.steps, () => setState('macro'));
      sella.zhSet = setState;
    }
  }, HV.LOUPE.L(1)));

  /* ======================================================================
     3. Antéhypophyse : 5 types cellulaires
     ====================================================================== */
  const TYPES = [
    { k: 'somato', name: 'Somatotropes', pct: '≈ 50 %', n: 50, c: 'p-sky', mol: 'gh', horm: 'GH (hormone de croissance)', reg: '⊕ GHRH · ⊖ somatostatine', tgt: '→ foie (IGF-1) et tissus', pref: 0.15,
      d: 'Sécrètent la GH, de façon pulsatile, surtout la nuit. Stimulées par la GHRH, freinées par la somatostatine ; la GH fait produire l\'IGF-1 par le foie, qui en excès freine GH et GHRH (polycopié p. 49).' },
    { k: 'lacto', name: 'Lactotropes', pct: '15–20 %', n: 18, c: 'p-magenta', mol: 'prl', horm: 'Prolactine', reg: '⊖ dopamine (tonus) · ⊕ TRH, œstrogènes', tgt: '→ glande mammaire (lactation)', pref: 0.3,
      d: 'Seule sécrétion antéhypophysaire freinée en permanence, par la dopamine hypothalamique. Stimulée par la TRH et les œstrogènes, notamment pendant la grossesse (polycopié p. 49).' },
    { k: 'cortico', name: 'Corticotropes', pct: '15–20 %', n: 17, c: 'p-orange', mol: 'acth', horm: 'ACTH (issue de la POMC)', reg: '⊕ CRH', tgt: '→ corticosurrénale : cortisol, androgènes', pref: 0.85,
      d: 'Stimulées par la CRH ; l\'ACTH active la sécrétion de cortisol et d\'androgènes surrénaliens ; le cortisol en excès freine CRH et ACTH (polycopié p. 48). L\'ACTH est issue de la POMC (p. 60).' },
    { k: 'gonado', name: 'Gonadotropes', pct: '≈ 10 %', n: 10, c: 'p-violet', mol: 'lh', horm: 'LH et FSH', reg: '⊕ GnRH (pulsatile)', tgt: '→ testicules, ovaires', pref: 0.5,
      d: 'La GnRH, sécrétée de façon pulsatile, stimule la sécrétion de LH et de FSH, qui agissent sur les gonades (polycopié p. 49).' },
    { k: 'thyreo', name: 'Thyréotropes', pct: '≈ 5 %', n: 5, c: 'p-teal', mol: 'tsh', horm: 'TSH', reg: '⊕ TRH', tgt: '→ thyroïde : T4, T3', pref: 0.9,
      d: 'Stimulées par la TRH ; la TSH stimule la synthèse et la sécrétion de T4 et T3 ; la T3 en excès freine TRH et TSH (polycopié p. 49).' }
  ];
  TYPES.forEach((t) => { HV.INFO['zh-' + t.k] = { t: 'Cellules ' + t.name.toLowerCase(), k: t.horm + ' · ' + t.pct + ' des cellules (complément)', d: t.d }; });
  Object.assign(HV.INFO, {
    'zh-mosaic': { t: 'Antéhypophyse (adénohypophyse)', k: '6 hormones principales (polycopié p. 47)', d: 'GH, prolactine, LH et FSH, TSH et ACTH. Toutes sont sous influence stimulante de facteurs hypothalamiques véhiculés par le système porte, sauf la prolactine, freinée par la dopamine. Répartition : somatotropes et lactotropes surtout latérales, corticotropes et thyréotropes plutôt médianes (complément).' },
    'zh-capil': { t: 'Capillaires sinusoïdes', k: 'Système porte → circulation générale (complément)', d: 'Le sang porte apporte les facteurs hypothalamiques au contact des cellules ; les hormones sécrétées par exocytose (polycopié p. 47) gagnent la circulation générale.' },
    'zh-prop': { t: 'Proportions des types cellulaires', k: 'Complément (manuels d\'histologie et d\'endocrinologie)', d: 'Somatotropes ≈ 50 %, lactotropes et corticotropes 15 à 20 % chacun, gonadotropes ≈ 10 %, thyréotropes ≈ 5 %. Ordres de grandeur : ils varient selon les sources, le sexe et l\'état physiologique (grossesse).' }
  });

  const mos = HV.scene(Object.assign({
    id: 'pit-mosaic',
    parent: 'lacto',
    loupe: 'Antéhypophyse : 5 types cellulaires',
    title: 'Antéhypophyse : 5 types cellulaires',
    level: 'Tissu',
    lead: 'L\'antéhypophyse sécrète six hormones principales (GH, prolactine, LH, FSH, TSH, ACTH) produites par cinq types de cellules. Chaque type obéit à son facteur hypothalamique et commande sa glande cible ; seule la prolactine est d\'abord freinée, par la dopamine.',
    points: [
      'Six hormones antéhypophysaires principales ; toutes sous contrôle stimulant hypothalamique, sauf la prolactine, freinée par la dopamine (polycopié p. 47).',
      'Somatotropes ≈ 50 %, lactotropes 15–20 %, corticotropes 15–20 %, gonadotropes ≈ 10 %, thyréotropes ≈ 5 % (complément).',
      'Facteurs et cibles des cinq axes : polycopié p. 48–49.',
      'Survolez une ligne ou une cellule pour isoler un type.'
    ],
    legend: new Set(['gh', 'prl', 'acth', 'lh', 'fsh', 'tsh', 'ghrh', 'sst', 'dopa', 'trh', 'crh', 'gnrh']),
    build(g, a) {
      a.frame('Antéhypophyse : 5 types cellulaires', 'Mosaïque cellulaire · hormone, facteur hypothalamique et cible de chaque type');
      const C = [500, 555], RX = 370, RY = 310;
      a.el('ellipse', { cx: C[0], cy: C[1], rx: RX + 14, ry: RY + 14, class: 'zh-adeno', 'data-info': 'zh-mosaic' });
      const mosaic = a.el('g', { class: 'zh-mosaic' });
      const cells = [];
      const sp = 38;
      for (let y = C[1] - RY; y <= C[1] + RY; y += sp * 0.87) {
        const row = Math.round((y - C[1]) / (sp * 0.87));
        for (let x = C[0] - RX + (row % 2 ? sp / 2 : 0); x <= C[0] + RX; x += sp) {
          if (((x - C[0]) / (RX - 16)) ** 2 + ((y - C[1]) / (RY - 16)) ** 2 > 1) continue;
          cells.push({ x: x + (rnd() - 0.5) * 5, y: y + (rnd() - 0.5) * 5, lat: Math.abs(x - C[0]) / RX });
        }
      }
      // Attribution : proportions exactes, avec un gradient médian / latéral (complément).
      const tokens = [];
      TYPES.forEach((t) => {
        const n = Math.round((t.n / 100) * cells.length);
        for (let i = 0; i < n; i++) tokens.push({ t, key: (1 - t.pref) + (rnd() - 0.5) * 0.9 });
      });
      while (tokens.length < cells.length) tokens.push({ t: TYPES[0], key: 1 + rnd() });
      tokens.length = cells.length;
      tokens.sort((p, q) => p.key - q.key);
      cells.forEach((c) => { c.key = c.lat + (rnd() - 0.5) * 0.5; });
      const order = cells.slice().sort((p, q) => p.key - q.key);
      const groups = {};
      TYPES.forEach((t) => { groups[t.k] = a.el('g', { class: 'zh-ctype ' + t.k, 'data-info': 'zh-' + t.k, style: `--c: var(--${t.c})` }, mosaic); });
      order.forEach((c, i) => {
        const t = tokens[i].t, cg = groups[t.k];
        a.el('circle', { cx: c.x, cy: c.y, r: 16.5, class: 'zh-cell' }, cg);
        a.el('circle', { cx: c.x, cy: c.y, r: 5, class: 'zh-cell-n' }, cg);
      });
      // Capillaires sinusoïdes et flux
      const cap1 = 'M 150,420 C 300,380 420,480 560,450 C 700,420 790,470 870,440';
      const cap2 = 'M 145,700 C 300,740 420,640 560,670 C 700,700 790,640 870,680';
      [cap1, cap2].forEach((d) => a.path(d, 'zh-capil', null, { 'data-info': 'zh-capil' }));
      const inA = 'M 120,420 C 220,395 330,430 450,465', inB = 'M 115,700 C 220,735 330,665 450,665';
      const outA = 'M 560,450 C 700,420 790,470 900,440', outB = 'M 560,670 C 700,700 790,640 900,680';
      [['ghrh', inA], ['crh', inA], ['dopa', inA], ['trh', inB], ['gnrh', inB], ['sst', inB]].forEach(([m, d]) => a.flow(d, { mol: m, rate: () => 0.45, size: 1.2, speed: 55, track: false, max: 8 }));
      [['gh', outA], ['prl', outA], ['acth', outA], ['lh', outB], ['fsh', outB], ['tsh', outB]].forEach(([m, d]) => a.flow(d, { mol: m, rate: () => 0.45, size: 1.3, speed: 55, track: false, max: 8 }));
      a.text(60, 236, ['sang porte :', 'facteurs', 'hypothalamiques'], 'note', { lh: 1.2, attrs: { 'data-info': 'zh-capil' } });
      a.text(905, 500, ['vers la', 'circulation', 'générale'], 'note', { lh: 1.2, attrs: { 'data-info': 'zh-capil' } });
      // Barre des proportions
      const bx = 130, bw = 740, by = 905;
      let x = bx;
      TYPES.forEach((t) => {
        const w = (t.n / 100) * bw;
        a.el('rect', { x, y: by, width: w - 2, height: 22, rx: 4, class: 'zh-cell zh-ctype ' + t.k, style: `--c: var(--${t.c})`, 'data-info': 'zh-' + t.k }, mosaic);
        x += w;
      });
      a.text(bx, by + 52, 'Proportions approximatives (complément)', 'note', { attrs: { 'data-info': 'zh-prop' } });

      // Fiches par type
      const CX = 1030, CW = 520;
      const rowsEl = {};
      const hl = (k) => {
        if (k) mosaic.setAttribute('data-hl', k); else mosaic.removeAttribute('data-hl');
        Object.keys(rowsEl).forEach((r) => rowsEl[r].classList.toggle('on', r === k));
      };
      TYPES.forEach((t, i) => {
        const y = 165 + i * 160;
        const rg = a.el('g', { class: 'zh-row', 'data-info': 'zh-' + t.k, style: `--c: var(--${t.c})` });
        rowsEl[t.k] = rg;
        a.el('rect', { x: CX, y, width: CW, height: 146, rx: 18, class: 'zh-row-bg' }, rg);
        a.el('circle', { cx: CX + 30, cy: y + 34, r: 13, class: 'zh-cell' }, rg);
        a.text(CX + 54, y + 42, t.name, 'lbl', null, rg);
        a.text(CX + CW - 20, y + 42, t.pct, 'sig-val', { anchor: 'end' }, rg);
        a.el('use', { href: '#mol-' + t.mol, transform: `translate(${CX + 34} ${y + 76}) scale(1.4)` }, rg);
        a.text(CX + 62, y + 82, t.horm, 'lbl-s strong', null, rg);
        a.text(CX + 22, y + 109, t.reg, 'note', null, rg);
        a.text(CX + 22, y + 133, t.tgt, 'note', null, rg);
        rg.addEventListener('pointerenter', () => hl(t.k));
        rg.addEventListener('pointerleave', () => hl(null));
        groups[t.k].addEventListener('pointerenter', () => hl(t.k));
        groups[t.k].addEventListener('pointerleave', () => hl(null));
      });

      const sp1 = [[C[0] - RX - 20, C[1] - RY - 20, 2 * RX + 40, 2 * RY + 40]];
      HV.spotlight(mos, a, [
        { t: 'Une mosaïque de cinq types', d: 'L\'antéhypophyse sécrète six hormones principales (GH, prolactine, LH, FSH, TSH, ACTH) (polycopié p. 47). Le sang porte apporte les facteurs hypothalamiques ; les hormones repartent dans la circulation générale.', spot: sp1, act: () => hl(null) }
      ].concat(TYPES.map((t, i) => ({ t: t.name + ' (' + t.pct + ', complément)', d: t.d, spot: sp1.concat([[CX, 165 + i * 160, CW, 146]]), act: () => hl(t.k) }))));
      stepActions(mos, mos.steps, () => hl(null));
    }
  }, HV.LOUPE.L(2)));

  /* ======================================================================
     4. Adénome non sécrétant : ordre de perte des fonctions
     ====================================================================== */
  const AX = [
    { k: 'gh', name: 'Somatotrope (GH)', c: 'p-sky', w: [0.05, 0.4], type: 'somato' },
    { k: 'lh', name: 'Gonadotrope (LH / FSH)', c: 'p-violet', w: [0.25, 0.6], type: 'gonado' },
    { k: 'tsh', name: 'Thyréotrope (TSH)', c: 'p-teal', w: [0.45, 0.8], type: 'thyreo' },
    { k: 'acth', name: 'Corticotrope (ACTH)', c: 'p-orange', w: [0.65, 1.0], type: 'cortico' }
  ];
  Object.assign(HV.INFO, {
    'zh-order': { t: 'Ordre classique de perte', k: 'GH → LH/FSH → TSH → ACTH (complément)', d: 'Devant une compression progressive, les axes somatotrope puis gonadotrope sont classiquement touchés les premiers, l\'axe corticotrope le dernier. Cet ordre est une tendance, pas une règle ; le schéma est qualitatif et ne représente pas des seuils de taille. Diagnostic biologique : hormones périphériques basses avec hormones hypophysaires anormalement normales, plus rarement basses (polycopié p. 60).' },
    'zh-prl': { t: 'Prolactine de déconnexion', k: '< 200 ng/mL (polycopié p. 52)', d: 'En cas de tumeur supracentimétrique non lactotrope avec prolactine modérément élevée (< 200 ng/mL), évoquer une hyperprolactinémie de déconnexion : la compression de la tige lève le tonus inhibiteur dopaminergique. Au-delà de 200 ng/mL, évoquer un macroadénome à prolactine.' },
    'zh-adh': { t: 'Posthypophyse (ADH)', k: 'Pas de diabète insipide (polycopié p. 64–65)', d: 'Un adénome hypophysaire n\'est jamais associé à un diabète insipide, sauf en cas d\'apoplexie ou après une chirurgie hypophysaire. Masse hypothalamo-hypophysaire + diabète insipide : évoquer hypophysite, craniopharyngiome, gliome du chiasma, méningiome, pathologie infiltrative, métastase…' },
    'zh-size': { t: 'Diamètre de l\'adénome', k: 'Micro < 10 mm · macro ≥ 10 mm · géant > 40 mm (polycopié p. 65–66)', d: 'Faites glisser le curseur, ou laissez l\'animation tourner. Le dessin n\'est pas à l\'échelle.' },
    'zh-ad-apo': HV.INFO['zh-apo'],
    'zh-ad-chir': { t: 'Chirurgie hypophysaire', k: 'Polycopié p. 65', d: 'Après une chirurgie hypophysaire, un diabète insipide peut apparaître ; c\'est, avec l\'apoplexie, la seule situation où il accompagne un adénome.' }
  });

  const ad = HV.scene(Object.assign({
    id: 'adenoma-growth',
    parent: 'lacto',
    loupe: 'Adénome : ordre de perte des fonctions',
    title: 'Adénome : ordre de perte des fonctions',
    level: 'Notion',
    lead: 'Un macroadénome non sécrétant qui grossit comprime l\'hypophyse saine et la tige. Les fonctions antéhypophysaires se perdent classiquement dans l\'ordre GH, puis LH/FSH, puis TSH, puis ACTH (complément). La prolactine, elle, monte modérément par déconnexion (< 200 ng/mL), et il n\'y a pas de diabète insipide, sauf apoplexie ou chirurgie.',
    points: [
      'Ordre classique de perte : GH → LH/FSH → TSH → ACTH (complément) ; l\'insuffisance corticotrope, la plus dangereuse, est souvent la dernière.',
      'Hyperprolactinémie de déconnexion : tumeur supracentimétrique et prolactine < 200 ng/mL (polycopié p. 52).',
      'Insuffisance lactotrope : rare, seulement en cas de destruction complète de l\'adénohypophyse (polycopié p. 63).',
      'Pas de diabète insipide avec un adénome, sauf apoplexie ou chirurgie hypophysaire (polycopié p. 64–65).',
      'Schéma qualitatif : les jauges ne représentent pas des seuils de taille mesurés.'
    ],
    legend: new Set(['gh', 'lh', 'fsh', 'tsh', 'acth', 'prl', 'adh', 'dopa']),
    build(g, a) {
      a.frame('Adénome : ordre de perte des fonctions', 'Macroadénome non sécrétant · coupe sagittale schématique (avant à gauche)');
      // Repères
      a.path('M 120,170 L 900,170 L 900,290 C 800,300 640,300 575,330 L 520,330 C 440,300 220,300 120,290 Z', 'zh-tissue');
      a.text(150, 232, 'hypothalamus', 'lbl-s strong');
      a.path('M 300,800 C 300,780 330,770 540,770 C 750,770 790,780 790,800 L 790,850 C 790,860 760,866 540,866 C 330,866 300,860 300,850 Z', 'zh-air', null, { 'data-info': 'zh-sph' });
      a.text(545, 828, 'sinus sphénoïdal', 'note', { anchor: 'middle' });
      a.path('M 290,520 L 300,560 C 300,800 760,800 760,560 L 790,470', 'o-sella', null, { 'data-info': 'zh-gland' });
      const chi = a.el('ellipse', { cx: 380, cy: 465, rx: 62, ry: 20, class: 'zh-tract', 'data-info': 'zh-chiasm' });
      const chiL = a.text(150, 440, 'chiasma', 'lbl-s strong zh-halo', { attrs: { 'data-info': 'zh-chiasm' } });
      const stalk = a.path('', 'zh-axon', null, { style: 'stroke-width: 18; stroke-dasharray: none; stroke: var(--o-pit-post); opacity: 1', 'data-info': 'zh-stalk' });
      const stalkLbl = a.text(0, 0, 'tige', 'lbl-s strong', { attrs: { 'data-info': 'zh-stalk' } });
      // Hypophyse : lobe antérieur (cellules colorées) et postérieur
      a.el('ellipse', { cx: 640, cy: 660, rx: 82, ry: 76, class: 'zh-gland-p', 'data-info': 'pit-post' });
      a.text(800, 655, 'posthypophyse', 'lbl-s strong', { attrs: { 'data-info': 'zh-adh' } });
      lead(a, [[794, 650], [712, 650]]);
      a.el('ellipse', { cx: 445, cy: 665, rx: 140, ry: 92, class: 'zh-adeno', 'data-info': 'zh-mosaic' });
      const antL = a.text(150, 600, 'antéhypophyse', 'lbl-s strong zh-halo', { attrs: { 'data-info': 'zh-mosaic' } });
      const antLd = lead(a, [[290, 606], [318, 630]]);
      const cg = {};
      TYPES.forEach((t) => { cg[t.k] = a.el('g', { class: 'zh-ctype', style: `--c: var(--${t.c})`, 'data-info': 'zh-' + t.k }); });
      const pool = [];
      TYPES.forEach((t) => { for (let i = 0; i < t.n * 1.1; i++) pool.push(t.k); });
      for (let i = 0; i < 400 && pool.length; i++) {
        const x = 310 + rnd() * 270, y = 578 + rnd() * 175;
        if (((x - 445) / 128) ** 2 + ((y - 665) / 80) ** 2 > 1) continue;
        const k = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
        a.el('circle', { cx: x, cy: y, r: 9, class: 'zh-cell' }, cg[k]);
      }
      // Tumeur
      const tum = a.el('circle', { class: 'zh-tumor', 'data-info': 'zh-tumor' });
      const hemo = a.el('circle', { class: 'zh-hemo', 'data-info': 'zh-apo' });
      const tumLbl = a.text(0, 0, 'adénome', 'les-lbl', { anchor: 'middle', attrs: { 'data-info': 'zh-tumor' } });
      [antL, antLd, chiL].forEach((e) => ad.content.appendChild(e));

      // Ordre de perte
      a.text(120, 905, 'Perte :', 'lbl-s strong', { attrs: { 'data-info': 'zh-order' } });
      const ord = [];
      let ox = 200;
      AX.forEach((ax, i) => {
        const og = a.el('g', { 'data-info': 'zh-order' });
        const lab = ax.k === 'lh' ? 'LH / FSH' : ax.k.toUpperCase();
        const w = chip(a, ox, 885, lab, ax.c, '', og);
        const strike = a.path(`M ${ox + 4},${899} L ${ox + w - 4},${899}`, 'zh-strike', og);
        ord.push({ og, strike });
        ox += w + 10;
        if (i < 3) { a.text(ox + 2, 905, '→', 'lbl-s', null); ox += 30; }
      });
      a.text(ox + 6, 905, '(complément)', 'note');

      // Curseur de taille
      const T0 = 420, T1 = 900, TY = 955;
      a.path(`M ${T0},${TY} L ${T1},${TY}`, 'zh-track', null, { 'data-info': 'zh-size' });
      const mmX = (mm) => T0 + (mm / 45) * (T1 - T0);
      [10, 40].forEach((mm) => { a.path(`M ${mmX(mm)},${TY - 14} L ${mmX(mm)},${TY + 14}`, 'zh-mark'); });
      a.text(mmX(10), TY - 20, '10 mm', 'note', { anchor: 'middle' });
      a.text(mmX(40), TY - 20, '40 mm', 'note', { anchor: 'middle' });
      const sizeLbl = a.text(120, TY + 7, '', 'lbl-s strong', { attrs: { 'data-info': 'zh-size' } });
      const knob = a.el('circle', { cy: TY, r: 15, class: 'zh-knob', 'data-info': 'zh-size' });
      let dragging = false;
      const toMM = (e) => {
        const m = ad.content.getScreenCTM();
        if (!m) return null;
        const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
        return clamp(((pt.x - T0) / (T1 - T0)) * 45, 0, 45);
      };
      knob.addEventListener('pointerdown', (e) => {
        if (HV.app && HV.app.current !== ad) return;
        e.stopPropagation();
        dragging = true; playing = false; updBtns();
        knob.setPointerCapture(e.pointerId);
      });
      knob.addEventListener('pointermove', (e) => { if (dragging) { const v = toMM(e); if (v != null) size = v; } });
      knob.addEventListener('pointerup', (e) => { dragging = false; e.stopPropagation(); });

      // Boutons
      const RX = 1030;
      let playing = true, apo = false, chir = false, size = 3, hold = 0;
      const bPlay = button(a, ad, RX, 166, 160, '', () => { playing = !playing; updBtns(); }, 'zh-size');
      const bApo = button(a, ad, RX + 172, 166, 170, 'Apoplexie', () => { apo = !apo; updBtns(); }, 'zh-ad-apo');
      const bChir = button(a, ad, RX + 354, 166, 166, 'Chirurgie', () => { chir = !chir; updBtns(); }, 'zh-ad-chir');
      function updBtns() {
        bPlay.label.textContent = playing ? '❚❚ Pause' : '▶ Animer';
        bPlay.classList.toggle('on', playing);
        bApo.classList.toggle('on', apo);
        bChir.classList.toggle('on', chir);
      }
      updBtns();

      // Jauges
      const gauges = [];
      const G = (i) => 262 + i * 88;
      AX.concat([{ k: 'prl', name: 'Lactotrope (prolactine)', c: 'p-magenta' }, { k: 'adh', name: 'Posthypophyse (ADH)', c: 'p-blue' }]).forEach((ax, i) => {
        const y = G(i);
        const gg = a.el('g', { 'data-info': ax.k === 'prl' ? 'zh-prl' : ax.k === 'adh' ? 'zh-adh' : 'zh-order' });
        a.text(RX, y, ax.name, 'lbl-s strong', null, gg);
        const st = a.text(RX + 520, y, '', 'zh-val', { anchor: 'end' }, gg);
        a.el('rect', { x: RX, y: y + 14, width: 520, height: 20, rx: 10, class: 'zh-gauge-bg' }, gg);
        const bar = a.el('rect', { x: RX, y: y + 14, width: 520, height: 20, rx: 10, class: 'zh-gauge', style: `--c: var(--${ax.c})` }, gg);
        if (ax.k === 'prl') {
          a.path(`M ${RX + 416},${y + 8} L ${RX + 416},${y + 40}`, 'zh-mark', gg);
          a.text(RX + 416, y + 60, '200 ng/mL', 'note', { anchor: 'middle' }, gg);
          a.text(RX + 60, y + 60, 'normale', 'note', { anchor: 'middle' }, gg);
        }
        gauges.push({ ax, bar, st });
      });
      a.text(RX, 778, 'Jauges qualitatives : barre pleine = fonction conservée', 'note');
      // Message
      a.el('rect', { x: RX, y: 812, width: 520, height: 150, rx: 16, class: 'side-box' });
      const msg = a.text(RX + 20, 846, ['', '', '', ''], 'note', { lh: 1.4 });
      const msgL = Array.from(msg.querySelectorAll('tspan'));

      let txt = 0;
      a.dyn((dt) => {
        if (playing && !dragging && dt > 0) {
          if (size < 42) size += dt * 2.4;
          else if ((hold += dt) > 3) { hold = 0; size = 3; }
        }
        const s = size;
        const c = clamp((s - 10) / 30, 0, 1); // indice de compression pédagogique
        // Tumeur : grossit depuis le plancher sellaire
        const r = 14 + s * 4.6, tx = 440, ty = 752 - r * 0.92;
        tum.setAttribute('cx', tx); tum.setAttribute('cy', ty.toFixed(1)); tum.setAttribute('r', r.toFixed(1));
        hemo.setAttribute('cx', tx); hemo.setAttribute('cy', ty.toFixed(1)); hemo.setAttribute('r', (r * 0.6).toFixed(1));
        hemo.style.opacity = apo ? 0.75 : 0;
        tumLbl.setAttribute('x', tx); tumLbl.setAttribute('y', (ty + 6).toFixed(0));
        tumLbl.setAttribute('opacity', r > 60 ? 1 : 0);
        // Chiasma refoulé, tige déviée
        const top = ty - r;
        const lift = clamp(488 - top, 0, 90);
        chi.setAttribute('cy', (465 - lift).toFixed(1));
        chi.setAttribute('ry', (20 - lift * 0.08).toFixed(1));
        const sx = 548, sy = 470, dist = Math.hypot(sx - tx, sy - ty);
        const push = clamp(r + 14 - dist, 0, 140);
        const mx = sx + push * 0.9;
        stalk.setAttribute('d', `M 545,332 C ${mx - 10},400 ${mx + 6},${490 + push * 0.2} ${600 + push * 0.4},570`);
        stalkLbl.setAttribute('x', (mx + 26).toFixed(0)); stalkLbl.setAttribute('y', 430);
        // Fonctions
        const lv = {};
        AX.forEach((ax) => { lv[ax.k] = (1 - smooth(ax.w[0], ax.w[1], c)) * (apo ? 0.15 : 1); });
        const disc = smooth(0.15, 0.55, c); // compression de la tige
        lv.prl = apo ? 0.12 : 0.12 + 0.48 * disc; // qualitatif, reste sous la barre des 200 ng/mL
        lv.adh = apo || chir ? 0.4 : 1;
        AX.forEach((ax) => { cg[ax.type].style.opacity = (0.2 + 0.8 * lv[ax.k]).toFixed(2); });
        cg.lacto.style.opacity = apo ? 0.3 : 1;
        gauges.forEach(({ ax, bar }) => bar.setAttribute('width', Math.max(20, 520 * lv[ax.k]).toFixed(0)));
        ord.forEach((o, i) => { const v = lv[AX[i].k]; o.og.style.opacity = v < 0.5 ? 0.45 : 1; o.strike.style.opacity = v < 0.5 ? 1 : 0; });
        knob.setAttribute('cx', mmX(clamp(s, 0, 45)).toFixed(1));
        txt -= dt;
        if (txt <= 0) {
          txt = 0.25;
          const cat = s < 10 ? 'microadénome' : s > 40 ? 'adénome géant' : 'macroadénome';
          sizeLbl.textContent = Math.round(s) + ' mm · ' + cat;
          gauges.forEach(({ ax, st }) => {
            const v = lv[ax.k];
            let t, cl = '';
            if (ax.k === 'prl' && apo) { t = 'variable (complément)'; }
            else if (ax.k === 'prl') { t = disc > 0.2 ? '↑ modérée (déconnexion)' : 'normale'; cl = disc > 0.2 ? 'warn' : ''; }
            else if (ax.k === 'adh') { t = apo || chir ? 'diabète insipide possible' : 'normale : pas de DI'; cl = apo || chir ? 'bad' : ''; }
            else { t = v > 0.85 ? 'conservée' : v > 0.35 ? 'déficit partiel' : 'déficit'; cl = v > 0.85 ? '' : v > 0.35 ? 'warn' : 'bad'; }
            st.textContent = t; st.setAttribute('class', 'zh-val ' + cl);
          });
          const lines = apo
            ? ['Apoplexie : nécrose hémorragique de l\'adénome.', 'Céphalée brutale, troubles visuels, oculomoteurs ;', 'déficits aigus, dont corticotrope (urgence, complément).', 'Seul contexte (avec la chirurgie) d\'un diabète insipide.']
            : chir
              ? ['Après chirurgie hypophysaire : diabète insipide', 'possible (polycopié p. 65).', '', '']
              : s < 10
                ? ['Microadénome < 10 mm : pas d\'effet de masse,', 'fonctions conservées.', '', '']
                : ['Masse + diabète insipide : penser à un autre', 'diagnostic (craniopharyngiome, hypophysite,', 'méningiome, métastase…) (polycopié p. 65).', lift > 10 ? 'Chiasma comprimé : champ visuel amputé (p. 51).' : ''];
          lines.forEach((l, i) => { msgL[i].textContent = l; });
        }
      });

      const go = (mm, opts) => () => { playing = false; size = mm; apo = !!(opts && opts.apo); chir = !!(opts && opts.chir); updBtns(); };
      const SPG = (i) => [RX - 10, G(i) - 30, 540, 76];
      HV.spotlight(ad, a, [
        { t: 'Hypophyse normale', d: 'Le lobe antérieur réunit les cinq types de cellules ; la tige relie l\'hypophyse à l\'hypothalamus ; le chiasma est au-dessus. Toutes les fonctions sont conservées.', spot: [[300, 330, 520, 450]], act: go(0) },
        { t: 'Microadénome', d: 'Moins de 10 mm (polycopié p. 65) : pas d\'effet de masse, les fonctions sont conservées.', spot: [[450, 680, 140]], act: go(6) },
        { t: 'La GH d\'abord…', d: 'Quand le macroadénome comprime l\'hypophyse saine, l\'axe somatotrope est classiquement le premier touché (complément).', spot: [[450, 620, 200], SPG(0)], act: go(19) },
        { t: '… puis LH/FSH', d: 'L\'axe gonadotrope suit (complément) : troubles des règles, baisse de la libido.', spot: [SPG(1)], act: go(25) },
        { t: '… puis la TSH', d: 'L\'insuffisance thyréotrope vient ensuite (complément).', spot: [SPG(2)], act: go(31) },
        { t: '… et l\'ACTH en dernier', d: 'L\'axe corticotrope est classiquement le plus résistant (complément) ; son déficit est le plus dangereux (insuffisance surrénale secondaire).', spot: [SPG(3)], act: go(42) },
        { t: 'La prolactine monte', d: 'La compression de la tige lève le tonus dopaminergique : hyperprolactinémie de déconnexion, modérée (< 200 ng/mL) (polycopié p. 52).', spot: [[480, 330, 220, 260], SPG(4)], act: go(30) },
        { t: 'Pas de diabète insipide…', d: 'Un adénome hypophysaire n\'est jamais associé à un diabète insipide, sauf en cas d\'apoplexie ou après chirurgie hypophysaire (polycopié p. 64–65). Essayez les boutons « Apoplexie » et « Chirurgie ».', spot: [SPG(5), [RX - 10, 160, 540, 56]], act: go(30, { apo: true }) }
      ]);
      stepActions(ad, ad.steps, () => { playing = true; apo = false; chir = false; updBtns(); });
      ad.zhSet = (k) => { if (k === 'apo') go(30, { apo: true })(); else go(+k)(); };
    }
  }, HV.LOUPE.L(3)));
})();
