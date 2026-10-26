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

      // Silhouette humaine de face (proportions ≈ 7,5 têtes), bras légèrement écartés.
      const body = a.el('g', { class: 'body', transform: 'translate(800 548)' });
      const mirrorX = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, x, y) => -parseFloat(x) + ',' + y);
      const half = 'M 0,-328 C 10,-328 17,-323 19,-314 C 21,-302 21,-294 25,-287 C 46,-277 82,-273 104,-263 C 121,-255 128,-239 124,-221 C 119,-205 108,-197 103,-186 C 103,-150 99,-110 89,-71 C 83,-47 83,-25 91,-5 C 103,23 108,51 106,84 C 104,140 96,200 87,250 C 83,276 86,300 84,330 C 82,360 71,384 67,400 C 73,412 82,420 71,426 C 56,431 38,429 30,422 C 28,404 30,388 30,372 C 26,330 22,300 24,262 C 20,210 16,160 10,110 C 6,90 4,78 0,74';
      const arm = 'M 117,-246 C 145,-246 156,-222 156,-196 C 160,-150 165,-110 168,-74 C 172,-40 179,0 183,40 C 185,58 187,70 189,80 C 199,96 203,118 195,136 C 189,148 175,146 171,132 C 167,118 167,100 169,84 C 163,62 157,40 151,16 C 145,-14 139,-44 137,-74 C 133,-112 125,-150 115,-180 C 111,-200 108,-224 117,-246 Z';
      const skin = a.el('g', { class: 'body-skin' }, body);
      [arm, mirrorX(arm)].forEach((d) => a.path(d, 'body-fill body-limb', skin));
      [-1, 1].forEach((k) => a.el('ellipse', { cx: k * 45, cy: -382, rx: 7, ry: 13, class: 'body-fill' }, skin));
      a.el('ellipse', { cx: 0, cy: -385, rx: 46, ry: 58, class: 'body-fill' }, skin);
      [half, mirrorX(half)].forEach((d) => a.path(d + ' Z', 'body-fill', skin));
      // Modelé : ombre latérale (volume cylindrique du tronc et des membres).
      const grad = a.el('linearGradient', { id: 'bodyShade', gradientUnits: 'userSpaceOnUse', x1: -130, y1: 0, x2: 130, y2: 0 }, a.el('defs'));
      [[0, 0.32], [0.22, 0], [0.78, 0], [1, 0.32]].forEach(([o, op]) => a.el('stop', { offset: o, 'stop-color': 'var(--body-line)', 'stop-opacity': op }, grad));
      [half, mirrorX(half)].forEach((d) => a.path(d + ' Z', 'body-shade', skin));
      a.el('ellipse', { cx: 0, cy: -385, rx: 46, ry: 58, class: 'body-shade' }, skin);
      [half, mirrorX(half)].forEach((d) => a.path(d, 'body-outline', skin));
      // Repères anatomiques discrets : clavicules, pectoraux, ligne blanche, ombilic, crêtes iliaques, rotules, chevilles.
      const marks = ['M -98,-262 C -66,-270 -28,-262 -7,-255', 'M -86,-198 C -62,-176 -28,-174 -6,-190', 'M 0,-246 L 0,-62', 'M -82,-4 C -62,30 -32,56 -8,68', 'M -60,-130 C -40,-124 -20,-124 -4,-128', 'M -58,-92 C -40,-86 -20,-86 -4,-90', 'M -46,-310 C -30,-300 -16,-298 -8,-300', 'M -124,-226 C -110,-206 -108,-190 -112,-172', 'M -94,64 C -72,124 -54,184 -50,240', 'M -70,300 C -62,330 -60,352 -62,374', 'M -140,-150 C -146,-120 -150,-100 -150,-84'];
      const lines = a.el('g', { class: 'body-lines' }, body);
      marks.forEach((d) => { a.path(d, 'body-line', lines); if (d.indexOf('M 0,') !== 0) a.path(mirrorX(d), 'body-line', lines); });
      a.el('ellipse', { cx: 0, cy: -38, rx: 4, ry: 5, class: 'body-line' }, lines);
      [-1, 1].forEach((k) => {
        a.el('ellipse', { cx: k * 55, cy: 262, rx: 13, ry: 16, class: 'body-line' }, lines);
        a.path(`M ${k * 133},-74 C ${k * 140},-70 ${k * 150},-70 ${k * 158},-76`, 'body-line', lines);
      });
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
      gland(812, 484, 5, 'iod', 'pancreas', null, null, 'pancreas');
      gland(768, 592, 5, 'trh', 'gonadoF', null, null, 'ovary');
      gland(832, 592, 5, 'trh', 'gonadoF', 'Ovaires', 'start', 'ovary');
      gland(800, 638, 5, 'trh', 'gonadoM', 'Testicules', 'start', 'testis');
      a.text(800, 1000 - 14, 'Silhouette schématique · positions approximatives', 'atlas-foot', { anchor: 'middle' });
      a.text(800, 1032, 'Notions transversales', 'atlas-sub', { anchor: 'middle' });
      HV.loupeCaptions(a, 'atlas');

      // Grands titres posés sur chaque carte, lisibles en vue d'ensemble ; ils s'effacent quand on zoome.
      const over = a.el('g', { class: 'atlas-titles', 'aria-hidden': 'true' });
      g.parentNode.appendChild(over); // au-dessus des cartes (scènes enfants)
      const wrap = (t, n) => t.replace(/-/g, '- ').split(' ').reduce((L, w) => {
        const j = L.length && L[L.length - 1].endsWith('-') ? '' : ' ';
        if (L.length && (L[L.length - 1] + j + w).length <= n) L[L.length - 1] += j + w; else L.push(w);
        return L;
      }, []);
      HV.scenes.atlas.children.forEach((sc) => {
        const w = HV.W * sc.scale, h = HV.H * sc.scale;
        const ax = HV.AXES.find((x) => x.id === sc.id);
        const lines = wrap(sc.title, w > 200 ? 17 : 14).slice(0, 3);
        const fs = w > 200 ? 23 : 17, bh = lines.length * fs * 1.15 + 14;
        const tg = a.el('g', { transform: `translate(${sc.x + w / 2} ${sc.y + bh / 2 + 6})`, style: `--c: var(--${ax ? ax.color : 'accent'})` }, over);
        a.el('rect', { x: -w / 2 + 6, y: -bh / 2, width: w - 12, height: bh, rx: 10, class: 'atlas-tt-bg' }, tg);
        a.text(0, -bh / 2 + 7 + fs * 0.9, lines, 'atlas-tt', { anchor: 'middle', lh: 1.15, attrs: { style: `font-size:${fs}px` } }, tg);
      });
      HV.atlasTitles = over; // opacité réglée à chaque image par app.js selon le zoom

    },
    update(dt, t) {}
  });

})();
