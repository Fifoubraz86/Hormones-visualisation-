/* Glyphes des molécules, définis une fois dans <defs> et réutilisés par <use>. Rayon de base ≈ 10. */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});

  HV.buildDefs = function (svg) {
    const el = HV.el;
    const defs = el('defs', {}, svg);
    const mol = (id) => el('g', { id: 'mol-' + id }, defs);
    const dots = (g, pts, cls, r) => pts.forEach(([x, y]) => el('circle', { cx: x, cy: y, r: r || 2.8, class: cls }, g));

    let g = mol('trh'); // tripeptide pGlu-His-Pro-NH2
    el('path', { d: 'M-7,2 L0,-3 L7,2', class: 'm-bond' }, g);
    dots(g, [[-7, 2], [0, -3], [7, 2]], 'm-trh', 3.8);

    g = mol('tsh'); // glycoprotéine α + β
    el('ellipse', { cx: -3.5, cy: 0, rx: 6, ry: 8.5, class: 'm-tsh-a' }, g);
    el('ellipse', { cx: 3.5, cy: 0.5, rx: 6, ry: 9.5, class: 'm-tsh-b' }, g);
    dots(g, [[-3, -9], [5, 9.8]], 'm-glycan', 1.8);

    g = mol('t4');
    el('rect', { x: -8, y: -3.5, width: 16, height: 7, rx: 3.5, class: 'm-t4' }, g);
    dots(g, [[-6, -5.5], [-6, 5.5], [6, -5.5], [6, 5.5]], 'm-iod');

    g = mol('t3');
    el('rect', { x: -8, y: -3.5, width: 16, height: 7, rx: 3.5, class: 'm-t3' }, g);
    dots(g, [[-6, -5.5], [-6, 5.5], [6, -5.5]], 'm-iod');

    g = mol('rt3');
    el('rect', { x: -8, y: -3.5, width: 16, height: 7, rx: 3.5, class: 'm-rt3' }, g);
    dots(g, [[-6, -5.5], [6, -5.5], [6, 5.5]], 'm-iod');

    g = mol('iod');
    el('circle', { r: 4.6, class: 'm-iod' }, g);
    el('path', { d: 'M-2.2,0 H2.2', class: 'm-minus' }, g);

    g = mol('trab'); // anticorps en Y
    el('path', { d: 'M0,9 L0,0 L-7,-8 M0,0 L7,-8', class: 'm-trab' }, g);

    g = mol('tg'); // thyroglobuline
    el('path', { d: 'M-11,-2 C-11,-10 -2,-12 4,-9 C11,-6 12,3 7,8 C2,12 -8,11 -10,5 Z', class: 'm-tg' }, g);
    dots(g, [[-4, -3], [3, -2], [0, 4]], 'm-tyr', 1.8);

    g = mol('tgi'); // thyroglobuline iodée
    el('path', { d: 'M-11,-2 C-11,-10 -2,-12 4,-9 C11,-6 12,3 7,8 C2,12 -8,11 -10,5 Z', class: 'm-tg' }, g);
    dots(g, [[-5, -4], [-1, -5], [4, -3], [5, 2], [0, 4], [-5, 3]], 'm-iod', 1.9);

    g = mol('mrna');
    el('path', { d: 'M-10,0 q2.5,-4 5,0 t5,0 t5,0 t5,0', class: 'm-mrna' }, g);

    g = mol('tbg');
    el('path', { d: 'M-16,-4 C-16,-13 -4,-15 4,-12 C14,-9 17,2 12,9 C6,15 -10,14 -14,7 Z', class: 'm-tbg' }, g);
    g = mol('ttr');
    dots(g, [[-5, -5], [5, -5], [-5, 5], [5, 5]], 'm-ttr', 5.6);
    g = mol('alb');
    el('path', { d: 'M-18,0 C-18,-10 -6,-12 0,-6 C6,-12 18,-10 18,0 C18,9 6,12 0,8 C-6,12 -18,9 -18,0 Z', class: 'm-alb' }, g);

    g = mol('rbc');
    el('ellipse', { rx: 24, ry: 22, class: 'm-rbc' }, g);
    el('ellipse', { rx: 11, ry: 9, class: 'm-rbc-in' }, g);

    g = mol('dot');
    el('circle', { r: 5 }, g);

    g = mol('na');
    el('circle', { r: 3.4, class: 'm-na' }, g);

    const arrow = (id, cls) => {
      const m = el('marker', { id, viewBox: '0 0 10 10', refX: 7, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0,0 L10,5 L0,10 Z', class: cls }, m);
    };
    arrow('arr', 'arrowhead');
    arrow('arr-accent', 'arrowhead accent');
    arrow('arr-inhib', 'arrowhead inhib');

    const glow = el('filter', { id: 'soft', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: 6 }, glow);
    return defs;
  };
})();
