/* Niveau 0 : l'atlas. Silhouette, glandes et cartes des axes (chaque carte est une scène). */
(function () {
  'use strict';
  const HV = window.HV;

  HV.scene({
    id: 'atlas',
    title: 'Atlas des axes endocriniens',
    level: 'Vue d\'ensemble',
    lead: 'Les grands axes hormonaux de l\'organisme, chez la femme et chez l\'homme. Chaque carte est une scène qu\'on peut agrandir. L\'axe thyréotrope est détaillé jusqu\'à la cellule ; les autres axes et boucles de régulation sont tirés du polycopié de sémiologie du CEEDMM.',
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
      const C = HV.CARD, cw = HV.W * C.s, ch = HV.H * C.s;
      lead(C.x('L') + cw, C.y(0) + ch / 2, 786, 264, 'L', 't4', true);
      HV.AXES.forEach((ax) => {
        const x = C.x(ax.card.side), y = C.y(ax.card.row);
        lead(ax.card.side === 'L' ? x + cw : x, y + ch / 2, ax.target[0], ax.target[1], ax.card.side, ax.color, true);
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
      gland(786, 258, 3, 'tg', 'phospho', null, null, 'parathyroid');
      gland(814, 258, 3, 'tg', 'phospho', null, null, 'parathyroid');
      gland(764, 352, 4, 'trab', 'lacto');
      gland(836, 352, 4, 'trab', 'lacto');
      gland(761, 452, 5, 't3', 'cortico', null, null, 'adrenal');
      gland(839, 452, 5, 't3', 'cortico', 'Surrénales', 'start', 'adrenal');
      gland(760, 474, 5, 'tbg', 'raa', null, null, 'kidney');
      gland(840, 474, 5, 'rbc', 'raa', 'Reins', 'start', 'kidney');
      gland(812, 484, 5, 'iod', 'glyc', null, null, 'pancreas');
      gland(768, 592, 5, 'trh', 'gonadoF', null, null, 'ovary');
      gland(832, 592, 5, 'trh', 'gonadoF', 'Ovaires', 'start', 'ovary');
      gland(800, 674, 5, 'trh', 'gonadoM', 'Testicules', 'start', 'testis');
      a.text(800, 1000 - 14, 'Silhouette schématique · positions approximatives', 'atlas-foot', { anchor: 'middle' });

    },
    update(dt, t) {}
  });

})();
