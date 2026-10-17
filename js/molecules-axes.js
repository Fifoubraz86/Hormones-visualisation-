/*
 * Glyphes des hormones des autres axes, par famille chimique :
 * stéroïdes (noyau à 4 cycles), peptides, protéines, glycoprotéines, catécholamines, ions, lipoprotéines.
 * La couleur passe par la variable --mc portée par le groupe racine de chaque glyphe.
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const R3 = Math.sqrt(3);

  HV.buildAxisDefs = function (defs) {
    const el = HV.el;
    const root = (id, color, scale) => {
      const g = el('g', { id: 'mol-' + id, style: `--mc: var(--${color})` }, defs);
      return scale ? el('g', { transform: `scale(${scale})` }, g) : g;
    };
    const atom = (g, x, y, r, cls) => el('circle', { cx: x, cy: y, r, class: cls }, g);
    const bond = (g, x1, y1, x2, y2, cls) => el('line', { x1, y1, x2, y2, class: cls || 'm-bond' }, g);
    const polyD = (pts) => 'M' + pts.map((p) => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' L') + ' Z';
    const hexV = (cx, cy, r) => [-90, -30, 30, 90, 150, 210].map((a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)]);

    /* ---------- Stéroïdes : cycles A, B, C (hexagones) et D (pentagone) ---------- */
    function steroid(id, color, v) {
      const g = root(id, color, 0.82);
      const r = 3.2, s = r * R3;
      const A = [-s, 1.5 * r], B = [0, 1.5 * r], C = [s / 2, 0], Dc = [s / 2 + s / 2 + 2.2, 0];
      const ringsHex = v.seco ? [C] : [A, B, C];
      ringsHex.forEach((c, i) => el('path', { d: polyD(hexV(c[0], c[1], r)), class: 'm-ring mc' + (v.aromA && c === A ? ' arom' : '') }, g));
      if (v.aromA) el('circle', { cx: A[0], cy: A[1], r: r * 0.55, class: 'm-arom' }, g);
      // Cycle D fusionné sur l'arête droite de C
      const Rp = r / (2 * Math.sin(Math.PI / 5));
      const pc = [C[0] + s / 2 + r / (2 * Math.tan(Math.PI / 5)), C[1]];
      const pent = [144, 216, 288, 0, 72].map((a) => [pc[0] + Rp * Math.cos((a * Math.PI) / 180), pc[1] + Rp * Math.sin((a * Math.PI) / 180)]);
      el('path', { d: polyD(pent), class: 'm-ring mc' }, g);
      const tip = pent[3];
      if (v.seco) {
        // Calcitriol : cycle B ouvert, triène vers un cycle A isolé
        const a2 = [C[0] - s - 3, C[1] + 6];
        el('path', { d: `M ${C[0] - s / 2},${C[1] + r / 2} L ${C[0] - s / 2 - 2.5},${C[1] + 2.5} L ${a2[0] + s / 2 + 1},${a2[1] - 2}`, class: 'm-bond mcs' }, g);
        el('path', { d: polyD(hexV(a2[0], a2[1], r)), class: 'm-ring mc' }, g);
        atom(g, a2[0] - s / 2 - 1.4, a2[1] + 1, 1.2, 'm-O');
        atom(g, a2[0], a2[1] + r + 1.6, 1.2, 'm-O');
      }
      const left = A;
      if (!v.seco) {
        const c3 = [left[0] - s / 2, left[1] + r / 2];
        bond(g, c3[0], c3[1], c3[0] - 1.8, c3[1] + 1);
        atom(g, c3[0] - 2.4, c3[1] + 1.3, 1.25, 'm-O'); // 3-céto ou 3-OH
      }
      if (v.o11) {
        const c11 = hexV(C[0], C[1], r)[5];
        bond(g, c11[0], c11[1], c11[0] - 1.6, c11[1] - 1.6);
        atom(g, c11[0] - 2.1, c11[1] - 2.1, 1.15, 'm-O');
      }
      if (v.cho) {
        const c18 = hexV(C[0], C[1], r)[1];
        bond(g, c18[0], c18[1], c18[0] + 0.5, c18[1] - 2.6);
        atom(g, c18[0] + 0.6, c18[1] - 3.3, 1.15, 'm-O');
      }
      if (v.chain) {
        el('path', { d: `M ${tip[0]},${tip[1]} L ${tip[0] + 2.4},${tip[1] - 1.6} L ${tip[0] + 4.8},${tip[1]}`, class: 'm-bond mcs' }, g);
        atom(g, tip[0] + 2.4, tip[1] - 4, 1.15, 'm-O');
        bond(g, tip[0] + 2.4, tip[1] - 1.6, tip[0] + 2.4, tip[1] - 3.3);
        if (v.chain === 'oh') atom(g, tip[0] + 5.8, tip[1] + 0.6, 1.15, 'm-O');
        if (v.o17) atom(g, tip[0] - 0.4, tip[1] + 2.6, 1.1, 'm-O');
      } else if (v.o17) {
        bond(g, tip[0], tip[1], tip[0] + 1.9, tip[1]);
        atom(g, tip[0] + 2.6, tip[1], 1.25, 'm-O');
      }
      if (v.seco) {
        el('path', { d: `M ${tip[0]},${tip[1]} L ${tip[0] + 2.4},${tip[1] - 1.6} L ${tip[0] + 4.8},${tip[1]} L ${tip[0] + 7.2},${tip[1] - 1.6}`, class: 'm-bond mcs' }, g);
        atom(g, tip[0] + 7.8, tip[1] - 2.2, 1.15, 'm-O');
      }
    }
    steroid('cortisol', 'p-gold', { o11: true, chain: 'oh', o17: true });
    steroid('aldo', 'p-teal', { o11: true, cho: true, chain: 'oh' });
    steroid('testo', 'p-blue', { o17: true });
    steroid('e2', 'p-rose', { aromA: true, o17: true });
    steroid('prog', 'p-violet', { chain: 'me' });
    steroid('dhea', 'p-sky', { o17: true });
    steroid('calcitriol', 'p-amber', { seco: true });

    /* ---------- Peptides : chaîne de résidus, pont disulfure éventuel ---------- */
    function peptide(id, color, n, opts) {
      opts = opts || {};
      const g = root(id, color, opts.scale || 0.9);
      const pts = [];
      if (opts.ring) {
        // cycle de `ring` résidus + queue
        const rr = opts.ring * 0.75;
        for (let i = 0; i < opts.ring; i++) {
          const a = (2 * Math.PI * i) / opts.ring - Math.PI / 2;
          pts.push([-4 + rr * Math.cos(a), rr * Math.sin(a)]);
        }
        for (let i = 0; i < n - opts.ring; i++) pts.push([-4 + rr + 2.8 * (i + 1), rr * 0.4 + (i % 2 ? -1.2 : 1.2)]);
      } else if (opts.helix) {
        const w = 22;
        el('path', { d: `M ${-w / 2},0 ` + Array.from({ length: 6 }, (_, i) => `q 1.8,${i % 2 ? 5 : -5} 3.66,0`).join(' '), class: 'm-helix' }, g);
        atom(g, -w / 2 - 1.5, 0, 1.6, 'm-N');
        atom(g, w / 2 + 1.5, 0, 1.6, 'm-O');
        return;
      } else {
        const step = Math.min(3, 24 / n);
        for (let i = 0; i < n; i++) pts.push([(i - (n - 1) / 2) * step, i % 2 ? -1.4 : 1.4]);
      }
      el('path', { d: 'M' + pts.map((p) => p.join(',')).join(' L'), class: 'm-bond mcs' }, g);
      pts.forEach((p) => atom(g, p[0], p[1], 1.55, 'm-res'));
      if (opts.ss) {
        const [i, j] = opts.ss;
        el('path', { d: `M ${pts[i][0]},${pts[i][1]} L ${pts[j][0]},${pts[j][1]}`, class: 'm-ss' }, g);
      }
    }
    peptide('crh', 'p-orange', 41, { helix: true });
    peptide('ghrh', 'p-sky', 44, { helix: true });
    peptide('acth', 'p-orange2', 39, { helix: true });
    peptide('pth', 'p-green', 84, { helix: true, scale: 1.1 });
    peptide('gnrh', 'p-violet', 10);
    peptide('kiss', 'p-magenta', 10);
    peptide('angio', 'p-red', 8);
    peptide('sst', 'p-grey', 14, { ring: 12, ss: [2, 9] });
    peptide('adh', 'p-sky', 9, { ring: 6, ss: [0, 5] });
    peptide('oxy', 'p-rose', 9, { ring: 6, ss: [0, 5] });
    peptide('glucagon', 'p-orange', 29, { helix: true });

    /* ---------- Protéines ---------- */
    function bundle(id, color) { // faisceau de 4 hélices (GH, prolactine)
      const g = root(id, color);
      [[-6, -2, -12], [-2, 2, 8], [2, -2, -8], [6, 2, 12]].forEach(([x, y, rot]) => el('rect', { x: x - 2.2, y: y - 8, width: 4.4, height: 16, rx: 2.2, transform: `rotate(${rot} ${x} ${y})`, class: 'm-prot' }, g));
      el('path', { d: 'M -6,-10 C -4,-13 -2,-12 -2,-6 M 2,10 C 3,13 5,12 6,9', class: 'm-loop' }, g);
    }
    bundle('gh', 'p-sky');
    bundle('prl', 'p-magenta');
    let g = root('igf1', 'p-blue');
    el('path', { d: 'M -10,2 C -10,-8 -2,-10 2,-6 C 6,-2 2,2 6,4 C 10,6 8,12 2,11 C -4,10 -10,9 -10,2 Z', class: 'm-prot' }, g);
    el('path', { d: 'M -4,-6 L 0,6', class: 'm-ss' }, g);
    // Insuline : chaînes A (21) et B (30) reliées par deux ponts disulfure
    g = root('insulin', 'p-blue2');
    el('path', { d: 'M -10,-5 L 8,-5', class: 'm-chain' }, g);
    el('path', { d: 'M -12,4 L 12,4', class: 'm-chain b' }, g);
    for (let i = 0; i < 6; i++) atom(g, -10 + i * 3.6, -5, 1.5, 'm-res');
    for (let i = 0; i < 8; i++) atom(g, -12 + i * 3.4, 4, 1.5, 'm-res b');
    el('path', { d: 'M -6,-5 L -5,4 M 4,-5 L 5,4', class: 'm-ss' }, g);
    // Gonadotrophines : hétérodimères α/β glycosylés comme la TSH
    const glyco = (id, color) => {
      const gg = root(id, color, 0.95);
      el('path', { d: 'M -10,6 C -12,-2 -10,-10 -7,-9 C -4,-8 -6,0 -4,1 C -3,-7 0,-13 3,-10 C 5,-7 0,1 2,2 C 4,-4 8,-7 10,-4 C 11,0 5,5 3,8 C -1,11 -8,11 -10,6 Z', class: 'm-alpha' }, gg);
      el('path', { d: 'M -9,9 C -3,13 7,12 11,6 C 14,1 12,-7 7,-11', class: 'm-beta' }, gg);
      [[-13, 10], [-15, 9], [9, -14], [12, -14]].forEach(([x, y]) => atom(gg, x, y, 1.2, 'm-glycan'));
    };
    glyco('lh', 'p-violet');
    glyco('fsh', 'p-rose');
    g = root('inhib', 'p-brown'); // inhibine : dimère α-β
    el('ellipse', { cx: -4.5, cy: 0, rx: 5.5, ry: 7.5, class: 'm-prot' }, g);
    el('ellipse', { cx: 4.5, cy: 0, rx: 5.5, ry: 7.5, class: 'm-prot b' }, g);
    el('path', { d: 'M -1,-3 L 1,3', class: 'm-ss' }, g);
    g = root('renin', 'p-red'); // enzyme bilobée avec fente catalytique
    el('path', { d: 'M -12,0 C -12,-10 -2,-11 -1,-3 C 0,-11 12,-10 12,0 C 12,9 2,11 0,5 C -2,11 -12,9 -12,0 Z', class: 'm-prot' }, g);
    el('path', { d: 'M 0,-3 L 0,5', class: 'm-loop' }, g);

    /* ---------- Catécholamines : cycle catéchol + chaîne éthylamine ---------- */
    function catechol(id, color, betaOH, nMe) {
      const gg = root(id, color, 0.8);
      const ring = hexV(-4, 0, 4);
      el('path', { d: polyD(ring), class: 'm-ring mc' }, gg);
      el('circle', { cx: -4, cy: 0, r: 2.2, class: 'm-arom' }, gg);
      [[ring[4], -1], [ring[5], -1]].forEach(([p]) => {
        bond(gg, p[0], p[1], p[0] - 2, p[1] + (p[1] > 0 ? 1 : -1));
        atom(gg, p[0] - 2.6, p[1] + (p[1] > 0 ? 1.4 : -1.4), 1.25, 'm-O');
      });
      const st = ring[1];
      el('path', { d: `M ${st[0]},${st[1]} L ${st[0] + 3},${st[1] + 1.6} L ${st[0] + 6},${st[1]} L ${st[0] + 8.6},${st[1] + 1.6}`, class: 'm-bond mcs' }, gg);
      if (betaOH) { bond(gg, st[0] + 3, st[1] + 1.6, st[0] + 3, st[1] + 4); atom(gg, st[0] + 3, st[1] + 4.7, 1.15, 'm-O'); }
      atom(gg, st[0] + 9.2, st[1] + 1.9, 1.35, 'm-N');
      if (nMe) { bond(gg, st[0] + 9.6, st[1] + 2.4, st[0] + 11.6, st[1] + 0.6); atom(gg, st[0] + 12, st[1] + 0.3, 1, 'm-C'); }
    }
    catechol('dopa', 'p-grey', false, false);
    catechol('nora', 'p-red2', true, false);
    catechol('adre', 'p-red', true, true);

    /* ---------- Petites molécules et ions ---------- */
    g = root('glucose', 'p-lime', 0.85); // pyranose
    const gr = hexV(0, 0, 4.5);
    el('path', { d: polyD(gr), class: 'm-ring mc' }, g);
    atom(g, gr[0][0], gr[0][1], 1.3, 'm-O');
    [1, 2, 3, 4].forEach((i) => { const p = gr[i + 1]; bond(g, p[0], p[1], p[0] * 1.45, p[1] * 1.45); atom(g, p[0] * 1.6, p[1] * 1.6, 1.05, 'm-O'); });
    const ion = (id, color, label, r) => {
      const gg = root(id, color);
      el('circle', { r, class: 'm-ion' }, gg);
      el('circle', { r, fill: 'url(#shine)' }, gg);
      HV.text(gg, 0, 1.9, label, 'm-ion-t', { anchor: 'middle' });
    };
    ion('ca', 'p-green', '2+', 4.8);
    ion('k', 'p-violet', '+', 4.4);
    ion('nai', 'p-amber', '+', 3.6);
    g = root('water', 'p-sky'); // H2O
    atom(g, 0, 0, 3, 'm-O');
    atom(g, -3.2, 2.4, 1.8, 'm-H');
    atom(g, 3.2, 2.4, 1.8, 'm-H');
    g = root('ffa', 'p-amber'); // acide gras
    el('path', { d: 'M -11,0 L -8,-2 L -5,0 L -2,-2 L 1,0 L 4,-2 L 7,0 L 10,-2', class: 'm-bond mcs' }, g);
    atom(g, 11.2, -2.4, 1.3, 'm-O');
    g = root('ketone', 'p-red2', 0.9); // corps cétonique (acétoacétate)
    el('path', { d: 'M -8,2 L -4,-1 L 0,2 L 4,-1 L 8,2', class: 'm-bond mcs' }, g);
    atom(g, -4, -3.4, 1.3, 'm-O');
    atom(g, 8.8, 4, 1.3, 'm-O');

    /* ---------- Lipoprotéines : cœur lipidique, coque de phospholipides, apolipoprotéine ---------- */
    const lipo = (id, color, r, apo) => {
      const gg = root(id, color);
      el('circle', { r, class: 'm-lipo' }, gg);
      el('circle', { r: r * 0.62, class: 'm-lipo-core' }, gg);
      el('circle', { r, fill: 'url(#shine)' }, gg);
      if (apo) el('path', { d: `M ${-r * 0.9},${-r * 0.4} C ${-r * 0.3},${-r * 1.2} ${r * 0.6},${-r * 1.1} ${r * 0.95},${-r * 0.2}`, class: 'm-apo' }, gg);
    };
    lipo('chylo', 'p-amber', 11, true);
    lipo('vldl', 'p-gold', 8.5, true);
    lipo('ldl', 'p-orange', 6.5, true);
    lipo('hdl', 'p-teal', 4.6, true);
    g = root('chol', 'p-gold', 0.75); // cholestérol libre (noyau stérol)
    const rr = 3.2, ss = rr * R3;
    [[-ss, 1.5 * rr], [0, 1.5 * rr], [ss / 2, 0]].forEach((c) => el('path', { d: polyD(hexV(c[0], c[1], rr)), class: 'm-ring mc' }, g));
    atom(g, -ss - ss / 2 - 1.4, 1.5 * rr + 2.4, 1.2, 'm-O');
    g = root('pcsk9', 'p-magenta'); // PCSK9 : protéase à trois domaines
    [[-6, 0, 5], [2, -3, 5], [6, 4, 4]].forEach(([x, y, r]) => atom(g, x, y, r, 'm-prot'));
    g = root('ldlr', 'p-teal'); // récepteur des LDL (membranaire)
    el('path', { d: 'M 0,12 L 0,-2 M 0,-2 C -6,-4 -8,-10 -4,-12 M 0,-2 C 6,-4 8,-10 4,-12', class: 'm-recep' }, g);
  };
})();
