/*
 * Glyphes des molécules, dessinés d'après leur structure réelle et réutilisés par <use>.
 * Encombrement de base ≈ 20 unités ; les flux les agrandissent avec `size`.
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});

  // Hexagone (cycle benzénique) à sommets gauche/droite.
  const hexPts = (cx, cy, r) => {
    const p = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return p;
  };
  const pentPts = (cx, cy, r, rot) => {
    const p = [];
    for (let i = 0; i < 5; i++) {
      const a = (rot || -Math.PI / 2) + ((2 * Math.PI) / 5) * i;
      p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return p;
  };
  const poly = (pts) => 'M' + pts.map((q) => q[0].toFixed(2) + ',' + q[1].toFixed(2)).join(' L') + ' Z';

  HV.buildDefs = function (svg) {
    const el = HV.el;
    const defs = el('defs', {}, svg);
    const mol = (id, scale) => {
      const outer = el('g', { id: 'mol-' + id }, defs);
      return scale ? el('g', { transform: `scale(${scale})` }, outer) : outer;
    };
    const atom = (g, x, y, r, cls) => el('circle', { cx: x, cy: y, r, class: cls }, g);
    const bond = (g, x1, y1, x2, y2, cls) => el('line', { x1, y1, x2, y2, class: cls || 'm-bond' }, g);

    /* Reflet commun qui donne du volume aux organes et aux sphères */
    const shine = el('radialGradient', { id: 'shine', cx: '35%', cy: '30%', r: '75%' }, defs);
    el('stop', { offset: '0', 'stop-color': '#ffffff', 'stop-opacity': '0.45' }, shine);
    el('stop', { offset: '0.55', 'stop-color': '#ffffff', 'stop-opacity': '0.08' }, shine);
    el('stop', { offset: '1', 'stop-color': '#000000', 'stop-opacity': '0.18' }, shine);

    /* Iodothyronines : deux cycles benzéniques reliés par un pont éther, chaîne alanine, atomes d'iode.
       T4 = 3,5,3',5' ; T3 = 3,5,3' ; T3 reverse = 3,3',5'. */
    const thyronine = (id, ringCls, iodines) => {
      const g = mol(id, 0.72);
      const outer = hexPts(-7, 0, 3.8), inner = hexPts(5, 0, 3.8);
      el('path', { d: poly(outer), class: 'm-ring ' + ringCls }, g);
      el('path', { d: poly(inner), class: 'm-ring ' + ringCls }, g);
      bond(g, -3.2, 0, -1.4, 0);
      bond(g, -0.6, 0, 1.2, 0);
      atom(g, -1, 0, 1.25, 'm-O');
      bond(g, -10.8, 0, -12.8, 0);
      atom(g, -13.4, 0, 1.25, 'm-O'); // OH phénolique
      el('path', { d: 'M 8.8,0 L 11,-1.8 L 13.4,0', class: 'm-bond' }, g); // chaîne alanine
      bond(g, 11, -1.8, 11, -4);
      atom(g, 11, -4.6, 1.2, 'm-N');
      bond(g, 13.4, 0, 15.2, -1.2);
      atom(g, 15.8, -1.6, 1.1, 'm-O');
      atom(g, 14, 1.8, 1.1, 'm-O');
      const sites = { "3'": [-8.9, -3.3, -10.3, -5.8], "5'": [-8.9, 3.3, -10.3, 5.8], 3: [3.1, -3.3, 1.7, -5.8], 5: [3.1, 3.3, 1.7, 5.8] };
      iodines.forEach((k) => {
        const s = sites[k];
        bond(g, s[0], s[1], s[2], s[3]);
        atom(g, s[2], s[3], 2.4, 'm-I');
      });
    };
    thyronine('t4', 'm-t4', ['3', '5', "3'", "5'"]);
    thyronine('t3', 'm-t3', ['3', '5', "3'"]);
    thyronine('rt3', 'm-rt3', ['3', "3'", "5'"]);

    /* TRH : pyroGlu-His-Pro-NH2, trois cycles à 5 atomes */
    let g = mol('trh', 0.85);
    el('path', { d: 'M -8,1 L -3,3 L 2,0 L 7,2 L 12,1', class: 'm-bond trh' }, g);
    el('path', { d: poly(pentPts(-9, -1.5, 3.2)), class: 'm-ring m-trh' }, g);
    bond(g, 2, 0, 2, -3.5, 'm-bond trh');
    el('path', { d: poly(pentPts(2, -6.8, 3.2)), class: 'm-ring m-trh' }, g);
    el('path', { d: poly(pentPts(7.5, 5, 3.2, Math.PI / 2)), class: 'm-ring m-trh' }, g);
    atom(g, 12.8, 1, 1.3, 'm-N');
    atom(g, -12.2, -2.6, 1.1, 'm-O');

    /* TSH : hétérodimère glycoprotéique α (nœud cystine, trois boucles) + β en « ceinture », glycanes branchés */
    g = mol('tsh', 0.95);
    el('path', { d: 'M -10,6 C -12,-2 -10,-10 -7,-9 C -4,-8 -6,0 -4,1 C -3,-7 0,-13 3,-10 C 5,-7 0,1 2,2 C 4,-4 8,-7 10,-4 C 11,0 5,5 3,8 C -1,11 -8,11 -10,6 Z', class: 'm-tsh-a' }, g);
    el('path', { d: 'M -9,9 C -3,13 7,12 11,6 C 14,1 12,-7 7,-11', class: 'm-tsh-b' }, g);
    el('path', { d: 'M -10,7 L -13,10 M -13,10 L -15,9 M -13,10 L -13,13', class: 'm-glycan-l' }, g);
    [[-15, 9], [-13, 13], [-13, 10]].forEach(([x, y]) => atom(g, x, y, 1.2, 'm-glycan'));
    el('path', { d: 'M 7,-11 L 9,-14 M 9,-14 L 12,-14 M 9,-14 L 8,-16.5', class: 'm-glycan-l' }, g);
    [[9, -14], [12, -14], [8, -16.5]].forEach(([x, y]) => atom(g, x, y, 1.2, 'm-glycan'));

    /* Iodure I⁻ : gros anion */
    g = mol('iod');
    el('circle', { r: 4.8, class: 'm-I' }, g);
    el('circle', { r: 4.8, fill: 'url(#shine)' }, g);
    el('path', { d: 'M-2.2,0 H2.2', class: 'm-minus' }, g);

    /* TRAb : IgG (Fc + deux Fab, chaînes lourdes et légères) */
    g = mol('trab', 0.9);
    el('ellipse', { cx: -1.6, cy: 6.5, rx: 1.8, ry: 5, class: 'm-trab' }, g);
    el('ellipse', { cx: 1.6, cy: 6.5, rx: 1.8, ry: 5, class: 'm-trab' }, g);
    el('ellipse', { cx: -5, cy: -4, rx: 1.9, ry: 5.2, transform: 'rotate(40 -5 -4)', class: 'm-trab' }, g);
    el('ellipse', { cx: -7.6, cy: -2.2, rx: 1.6, ry: 4.6, transform: 'rotate(40 -7.6 -2.2)', class: 'm-trab light' }, g);
    el('ellipse', { cx: 5, cy: -4, rx: 1.9, ry: 5.2, transform: 'rotate(-40 5 -4)', class: 'm-trab' }, g);
    el('ellipse', { cx: 7.6, cy: -2.2, rx: 1.6, ry: 4.6, transform: 'rotate(-40 7.6 -2.2)', class: 'm-trab light' }, g);

    /* Thyroglobuline : grand dimère, résidus tyrosyl */
    const tg = (id, iodinated) => {
      const gg = mol(id);
      el('path', { d: 'M -12,-1 C -13,-9 -5,-12 -1,-8 C 1,-4 0,4 -2,8 C -5,12 -12,8 -12,-1 Z', class: 'm-tg' }, gg);
      el('path', { d: 'M 0,-7 C 4,-12 13,-10 12,-2 C 12,6 6,11 1,8 C -1,4 -1,-3 0,-7 Z', class: 'm-tg b' }, gg);
      const pts = [[-7, -4], [-8, 3], [-4, 6], [5, -5], [8, 1], [4, 5]];
      pts.forEach(([x, y]) => atom(gg, x, y, iodinated ? 1.7 : 1.3, iodinated ? 'm-I' : 'm-tyr'));
    };
    tg('tg', false);
    tg('tgi', true);

    /* ARNm : brin avec bases */
    g = mol('mrna');
    el('path', { d: 'M-11,0 q2.75,-4 5.5,0 t5.5,0 t5.5,0 t5.5,0', class: 'm-mrna' }, g);
    [[-8.3, -2], [-2.8, 2], [2.8, -2], [8.3, 2]].forEach(([x, y], i) => bond(g, x, y, x, y + (y < 0 ? -3 : 3), 'm-base b' + i));

    /* Protéines de transport */
    g = mol('tbg'); // serpine globulaire avec poche de liaison
    el('path', { d: 'M -16,-4 C -16,-13 -4,-15 4,-12 C 14,-9 17,2 12,9 C 6,15 -10,14 -14,7 C -10,4 -6,2 -8,-2 Z', class: 'm-tbg' }, g);
    el('path', { d: 'M -10,-8 L 6,-10 M -11,-3 L 9,-5 M -6,7 L 10,4', class: 'm-sheet' }, g);
    g = mol('ttr'); // homotétramère avec canal central
    [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]].forEach(([x, y]) => atom(g, x, y, 6, 'm-ttr'));
    atom(g, 0, 0, 2.2, 'm-channel');
    g = mol('alb'); // albumine : forme en cœur
    el('path', { d: 'M 0,13 C -10,8 -19,2 -18,-6 C -17,-13 -8,-14 -3,-8 L 0,-5 L 3,-8 C 8,-14 17,-13 18,-6 C 19,2 10,8 0,13 Z', class: 'm-alb' }, g);

    g = mol('rbc'); // hématie biconcave
    el('ellipse', { rx: 24, ry: 22, class: 'm-rbc' }, g);
    el('ellipse', { rx: 11, ry: 9, class: 'm-rbc-in' }, g);
    el('ellipse', { rx: 24, ry: 22, fill: 'url(#shine)' }, g);

    g = mol('na');
    el('circle', { r: 3.4, class: 'm-na' }, g);
    el('path', { d: 'M-1.6,0 H1.6 M0,-1.6 V1.6', class: 'm-minus' }, g);

    g = mol('dot');
    el('circle', { r: 5 }, g);

    const arrow = (id, cls) => {
      const m = el('marker', { id, viewBox: '0 0 10 10', refX: 7, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0,0 L10,5 L0,10 Z', class: cls }, m);
    };
    arrow('arr', 'arrowhead');
    arrow('arr-accent', 'arrowhead accent');
    arrow('arr-inhib', 'arrowhead inhib');
    return defs;
  };
})();
