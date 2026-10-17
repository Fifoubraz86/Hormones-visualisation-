/* Niveau 0 : l'atlas. Silhouette, glandes et cartes des axes (chaque carte est une scène). */
(function () {
  'use strict';
  const HV = window.HV;

  // Axes en préparation : une scène d'aperçu chacun, avec la chaîne hormonale schématique.
  const AXES = [
    { id: 'cortico', side: 'L', row: 1, color: 't3', name: 'Axe corticotrope', glands: 'Hypothalamus · antéhypophyse · corticosurrénale', fb: true,
      chain: [['CRH', 'Hypothalamus'], ['ACTH', 'Antéhypophyse'], ['Cortisol', 'Corticosurrénale']], target: [758, 440],
      lead: 'Réponse au stress et rythme circadien : la CRH stimule l\'ACTH, qui stimule la sécrétion de cortisol. Le cortisol freine l\'hypothalamus et l\'hypophyse.' },
    { id: 'somato', side: 'L', row: 2, color: 'tsh', name: 'Axe somatotrope', glands: 'Hypothalamus · antéhypophyse · foie', fb: true,
      chain: [['GHRH / SRIF', 'Hypothalamus'], ['GH', 'Antéhypophyse'], ['IGF-1', 'Foie']], target: [790, 196],
      lead: 'Croissance et métabolisme : la GHRH stimule et la somatostatine freine la GH, qui induit la production hépatique d\'IGF-1.' },
    { id: 'lacto', side: 'L', row: 3, color: 'trab', name: 'Axe lactotrope', glands: 'Hypothalamus · antéhypophyse · glande mammaire', fb: false,
      chain: [['Dopamine (−)', 'Hypothalamus'], ['Prolactine', 'Antéhypophyse'], ['Lactation', 'Glande mammaire']], target: [764, 352],
      lead: 'La prolactine est sous contrôle inhibiteur dominant de la dopamine hypothalamique.' },
    { id: 'adh', side: 'L', row: 4, color: 'tbg', name: 'Équilibre hydrique', glands: 'Hypothalamus · posthypophyse · rein', fb: true,
      chain: [['Osmolalité ↑', 'Osmorécepteurs'], ['ADH', 'Posthypophyse'], ['Aquaporine 2', 'Tube collecteur']], target: [760, 472],
      lead: 'L\'hormone antidiurétique (vasopressine) ajuste la réabsorption d\'eau libre par le rein.' },
    { id: 'gonado', side: 'R', row: 0, color: 'trh', name: 'Axe gonadotrope', glands: 'Hypothalamus · antéhypophyse · ovaires / testicules', fb: true,
      chain: [['GnRH pulsatile', 'Hypothalamus'], ['LH · FSH', 'Antéhypophyse'], [['Œstradiol · progestérone', 'testostérone · inhibine'], 'Ovaires · testicules']], target: [832, 590],
      lead: 'La GnRH pulsatile commande LH et FSH, qui règlent la stéroïdogenèse et la gamétogenèse chez la femme et chez l\'homme.' },
    { id: 'pancreas', side: 'R', row: 1, color: 'iod', name: 'Pancréas endocrine', glands: 'Îlots de Langerhans · foie · muscle · tissu adipeux', fb: true,
      chain: [['Glycémie', 'Sang'], ['Insuline · glucagon', 'Îlots de Langerhans'], ['Captation, stockage', 'Foie · muscle · adipocyte']], target: [812, 484],
      lead: 'L\'insuline et le glucagon maintiennent la glycémie dans une plage étroite.' },
    { id: 'phospho', side: 'R', row: 2, color: 'tg', name: 'Métabolisme phosphocalcique', glands: 'Parathyroïdes · rein · os · intestin', fb: true,
      chain: [['Ca²⁺ ↓', 'Sang'], ['PTH', 'Parathyroïdes'], ['Calcitriol', 'Rein'], ['Ca²⁺, phosphate', 'Os · intestin']], target: [814, 262],
      lead: 'PTH, calcitriol et FGF23 régulent la calcémie et la phosphatémie.' },
    { id: 'raa', side: 'R', row: 3, color: 'rbc', name: 'Rénine-angiotensine-aldostérone', glands: 'Rein · foie · poumon · corticosurrénale', fb: true,
      chain: [['Rénine', 'Rein'], ['Angiotensine II', 'Poumon (ECA)'], ['Aldostérone', 'Corticosurrénale']], target: [842, 472],
      lead: 'Le système rénine-angiotensine-aldostérone règle la volémie, la natrémie, la kaliémie et la pression artérielle.' }
  ];

  const CARD_S = 0.16;
  const colX = (side) => (side === 'L' ? 70 : 1274);
  const rowY = (row) => 110 + row * 175;

  HV.scene({
    id: 'atlas',
    title: 'Atlas des axes endocriniens',
    level: 'Vue d\'ensemble',
    lead: 'Les grands axes hormonaux de l\'organisme, chez la femme et chez l\'homme. Chaque carte est une scène qu\'on peut agrandir. Le module thyroïdien est complet, les autres sont en préparation.',
    points: [
      'Cliquez sur une carte ou sur une glande pour zoomer.',
      'Molette ou pincement pour zoomer librement, glisser pour se déplacer.',
      'Échap ou « Dézoomer » pour remonter d\'un niveau.'
    ],
    build(g, a) {
      a.el('rect', { x: -4000, y: -4000, width: 9600, height: 9000, class: 'world-bg' });
      a.text(800, 64, 'Atlas des axes endocriniens', 'atlas-title', { anchor: 'middle' });
      a.text(800, 96, 'Cliquez sur un axe pour entrer dans la scène', 'atlas-sub', { anchor: 'middle' });

      // Lignes de rappel carte → glande
      const leaders = a.el('g', { class: 'leaders' });
      const lead = (sx, sy, ex, ey, side, color, active) => {
        const k = side === 'L' ? 1 : -1;
        a.path(`M ${sx},${sy} C ${sx + k * 200},${sy} ${ex - k * 140},${ey} ${ex},${ey}`, 'leader' + (active ? ' active' : ''), leaders, { style: `--c: var(--${color})` });
      };
      lead(326, 190, 786, 268, 'L', 't4', true);
      AXES.forEach((ax) => {
        const x = colX(ax.side), y = rowY(ax.row);
        const sx = ax.side === 'L' ? x + 256 : x;
        lead(sx, y + 80, ax.target[0], ax.target[1], ax.side, ax.color, false);
      });

      // Silhouette
      const body = a.el('g', { class: 'body', transform: 'translate(800 548)' });
      a.path('M -26,-302 C -28,-285 -40,-272 -70,-266 C -110,-258 -135,-245 -142,-210 L -168,-40 C -174,0 -176,40 -172,70 C -170,90 -150,92 -146,72 L -128,-40 L -118,-150 C -112,-110 -100,-60 -96,-30 C -100,10 -112,40 -112,70 C -112,140 -96,250 -84,400 C -82,420 -40,422 -40,405 L -14,120 C -8,100 8,100 14,120 L 40,405 C 40,422 82,420 84,400 C 96,250 112,140 112,70 C 112,40 100,10 96,-30 C 100,-60 112,-110 118,-150 L 128,-40 L 146,72 C 150,92 170,90 172,70 C 176,40 174,0 168,-40 L 142,-210 C 135,-245 110,-258 70,-266 C 40,-272 28,-285 26,-302 Z', 'body-shape', body);
      a.el('ellipse', { cx: 0, cy: -372, rx: 56, ry: 70, class: 'body-shape' }, body);
      HV.organs.bodyOrgans(a.el('g', { class: 'body-organs' }, body));

      const gland = (x, y, r, color, id, label, anchor, info) => {
        const gg = a.el('g', { class: 'gland', style: `--c: var(--${color})`, 'data-info': info || null });
        a.el('circle', { cx: x, cy: y, r: r * 2.4, class: 'gland-halo' }, gg);
        a.el('circle', { cx: x, cy: y, r, class: 'gland-dot' }, gg);
        if (label) a.text(x + (anchor === 'end' ? -r - 10 : r + 10), y + 6, label, 'gland-lbl', { anchor: anchor || 'start' }, gg);
        if (id) a.zoomable(gg, id);
        return gg;
      };
      gland(800, 196, 8, 'trh', 'thyro', 'Hypothalamus · hypophyse', 'start', 'hypothalamus');
      gland(800, 264, 9, 't4', 'foll', 'Thyroïde', 'start', 'thyroid');
      gland(786, 258, 3, 'tg', null, null, null, 'parathyroid');
      gland(814, 258, 3, 'tg', null, null, null, 'parathyroid');
      gland(764, 352, 4, 'trab', null);
      gland(836, 352, 4, 'trab', null);
      gland(761, 452, 5, 't3', null, null, null, 'adrenal');
      gland(839, 452, 5, 't3', null, 'Surrénales', 'start', 'adrenal');
      gland(760, 474, 5, 'tbg', null, null, null, 'kidney');
      gland(840, 474, 5, 'rbc', null, 'Reins', 'start', 'kidney');
      gland(812, 484, 5, 'iod', null, null, null, 'pancreas');
      gland(768, 592, 5, 'trh', null, null, null, 'ovary');
      gland(832, 592, 5, 'trh', null, 'Ovaires', 'start', 'ovary');
      gland(800, 674, 5, 'trh', null, 'Testicules', 'start', 'testis');
      a.text(800, 1000 - 14, 'Silhouette schématique · positions approximatives', 'atlas-foot', { anchor: 'middle' });

    },
    update(dt, t) {}
  });

  // Une scène d'aperçu par axe en préparation.
  AXES.forEach((ax) => {
    HV.scene({
      id: ax.id,
      parent: 'atlas',
      x: colX(ax.side),
      y: rowY(ax.row),
      scale: CARD_S,
      title: ax.name,
      level: 'Axe · en préparation',
      placeholder: true,
      lead: ax.lead,
      points: ['Ce module est en préparation.', 'Organes impliqués : ' + ax.glands + '.'],
      build(g, a) {
        a.frame(ax.name, ax.glands);
        const st = { style: `--c: var(--${ax.color})` };
        const badge = a.el('g', Object.assign({ class: 'soon', transform: 'translate(1340 60)' }, st));
        a.el('rect', { width: 210, height: 46, rx: 23, class: 'soon-bg' }, badge);
        a.text(105, 31, 'En préparation', 'soon-t', { anchor: 'middle' }, badge);

        const n = ax.chain.length;
        const bw = n > 3 ? 300 : 340, bh = 190;
        const gap = (1480 - n * bw) / (n - 1);
        const cy = 470;
        const boxes = ax.chain.map(([name, where], i) => {
          const x = 60 + i * (bw + gap);
          const bg = a.el('g', Object.assign({ class: 'chain-box' }, st));
          a.el('rect', { x, y: cy - bh / 2, width: bw, height: bh, rx: 22, class: 'chain-rect' }, bg);
          const lines = Array.isArray(name) ? name : [name];
          a.text(x + bw / 2, cy - (lines.length > 1 ? 22 : 4), lines, 'chain-name' + (lines.length > 1 ? ' small' : ''), { anchor: 'middle', lh: 1.2 }, bg);
          a.text(x + bw / 2, cy + 58, where, 'chain-where', { anchor: 'middle' }, bg);
          return { x, w: bw };
        });
        for (let i = 0; i < n - 1; i++) {
          const x0 = boxes[i].x + bw + 14, x1 = boxes[i + 1].x - 14;
          a.flow(`M ${x0},${cy} L ${x1},${cy}`, { mol: 'dot', style: `fill: var(--${ax.color})`, rate: () => 1.6, speed: 90, size: 1.3, trackClass: 'track chain-arrow' });
        }
        if (ax.fb) {
          const x0 = boxes[n - 1].x + bw / 2, x1 = boxes[0].x + bw / 2, y0 = cy + bh / 2 + 10;
          a.flow(`M ${x0},${y0} C ${x0},${y0 + 230} ${x1},${y0 + 230} ${x1},${y0}`, { mol: 'dot', style: 'fill: var(--inhib)', rate: () => 0.8, speed: 110, size: 1, trackClass: 'track fb' });
          a.text((x0 + x1) / 2, y0 + 205, 'rétrocontrôle', 'fb-lbl', { anchor: 'middle' });
          a.sign(x1, y0 + 26, 'inhib').set(1);
        }
      }
    });
  });

  HV.AXES = AXES;
})();
