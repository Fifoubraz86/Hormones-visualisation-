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
      lead(C.x('L') + cw, C.y(0) + ch / 2, 786, 238, 'L', 't4', true);
      HV.AXES.forEach((ax) => {
        const x = C.x(ax.card.side), y = C.y(ax.card.row);
        lead(ax.card.side === 'L' ? x + cw : x, y + ch / 2, ax.target[0], ax.target[1], ax.card.side, ax.color, true);
      });

      // Silhouette humaine de face : dessin Servier (kit Veins, diapositive 3, peau seule), ≈ 7,5 têtes.
      // Repère du corps : sommet du crâne y = -446, plante des pieds y = 434, axe x = 0.
      const body = a.el('g', { class: 'body', transform: 'translate(800 548)' });
      const skin = a.el('g', { class: 'body-skin' }, body);
      HV.organArt(skin, 'servier/veins-body-skin', -165, -446, 338, 880);
      HV.organs.bodyOrgans(a.el('g', { class: 'body-organs' }, body));

      const gland = (x, y, r, color, id, label, anchor, info) => {
        const gg = a.el('g', { class: 'gland', style: `--c: var(--${color})`, 'data-info': info || null });
        a.el('circle', { cx: x, cy: y, r: r * 2.4, class: 'gland-halo' }, gg);
        a.el('circle', { cx: x, cy: y, r, class: 'gland-dot' }, gg);
        if (label) a.text(x + (anchor === 'end' ? -r - 10 : r + 10), y + 6, label, 'gland-lbl', { anchor: anchor || 'start' }, gg);
        if (id) a.zoomable(gg, id);
        return gg;
      };
      gland(800, 166, 8, 'trh', 'thyro', 'Hypothalamus · hypophyse', 'start', 'hypothalamus');
      gland(800, 238, 9, 't4', 'foll', 'Thyroïde', 'start', 'thyroid');
      gland(786, 232, 3, 'tg', 'phospho', null, null, 'parathyroid');
      gland(814, 232, 3, 'tg', 'phospho', null, null, 'parathyroid');
      gland(756, 340, 4, 'trab', 'lacto');
      gland(844, 340, 4, 'trab', 'lacto');
      gland(762, 424, 5, 't3', 'cortico', null, null, 'adrenal');
      gland(838, 424, 5, 't3', 'cortico', 'Surrénales', 'start', 'adrenal');
      gland(762, 452, 5, 'tbg', 'raa', null, null, 'kidney');
      gland(838, 452, 5, 'rbc', 'raa', 'Reins', 'start', 'kidney');
      gland(808, 441, 5, 'iod', 'pancreas', null, null, 'pancreas');
      gland(770, 522, 5, 'trh', 'gonadoF', null, null, 'ovary');
      gland(830, 522, 5, 'trh', 'gonadoF', 'Ovaires', 'start', 'ovary');
      gland(800, 576, 5, 'trh', 'gonadoM', 'Testicules', 'start', 'testis');
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
