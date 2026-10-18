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
    // Substituant oxygéné : cétone (=O, double liaison) ou hydroxyle (-OH, H figuré).
    function oxy(g, p, ang, kind) {
      const t = (ang * Math.PI) / 180, ux = Math.cos(t), uy = Math.sin(t);
      const e = [p[0] + ux * 2, p[1] + uy * 2];
      if (kind === 'k') {
        const nx = -uy * 0.5, ny = ux * 0.5;
        bond(g, p[0] + nx, p[1] + ny, e[0] + nx, e[1] + ny);
        bond(g, p[0] - nx, p[1] - ny, e[0] - nx, e[1] - ny);
      } else bond(g, p[0], p[1], e[0], e[1]);
      atom(g, e[0] + ux * 0.6, e[1] + uy * 0.6, 1.2, 'm-O');
      if (kind === 'h') atom(g, e[0] + ux * 1.9, e[1] + uy * 1.9, 0.6, 'm-H');
    }
    const methyl = (g, p, ang) => {
      const t = (ang * Math.PI) / 180;
      bond(g, p[0], p[1], p[0] + Math.cos(t) * 2, p[1] + Math.sin(t) * 2);
    };
    // Double liaison dans un cycle : trait intérieur parallèle à l'arête (a, b) du cycle de centre c.
    const ringDb = (g, c, a, b) => {
      const k = 0.72;
      const q = (pt) => [c[0] + (pt[0] - c[0]) * k, c[1] + (pt[1] - c[1]) * k];
      const qa = q(a), qb = q(b);
      bond(g, qa[0] + (qb[0] - qa[0]) * 0.15, qa[1] + (qb[1] - qa[1]) * 0.15, qb[0] - (qb[0] - qa[0]) * 0.15, qb[1] - (qb[1] - qa[1]) * 0.15, 'm-db');
    };

    /* ---------- Stéroïdes : noyau cyclopenta[a]phénanthrène, cycles A, B, C et D ----------
       Numérotation : C3 (cycle A), C10/C19 (jonction A/B), C11 (cycle C), C13/C18 (jonction C/D), C17 (cycle D). */
    function steroid(id, color, v) {
      const g = root(id, color, 0.8);
      const r = 3.2, s = r * R3;
      const A = [-s, 1.5 * r], B = [0, 1.5 * r], C = [s / 2, 0];
      const hA = hexV(A[0], A[1], r), hB = hexV(B[0], B[1], r), hC = hexV(C[0], C[1], r);
      const Rp = r / (2 * Math.sin(Math.PI / 5));
      const pc = [C[0] + s / 2 + r / (2 * Math.tan(Math.PI / 5)), C[1]];
      const pent = [144, 216, 288, 0, 72].map((a) => [pc[0] + Rp * Math.cos((a * Math.PI) / 180), pc[1] + Rp * Math.sin((a * Math.PI) / 180)]);
      const c17 = pent[3];
      (v.seco ? [hC] : [hA, hB, hC]).forEach((h) => el('path', { d: polyD(h), class: 'm-ring mc' }, g));
      el('path', { d: polyD(pent), class: 'm-ring mc' }, g);
      if (v.aromA) el('circle', { cx: A[0], cy: A[1], r: r * 0.55, class: 'm-arom' }, g);
      if (v.d4) ringDb(g, A, hA[3], hA[2]);   // Δ4 : C4=C5
      if (v.d5) ringDb(g, B, hB[4], hB[3]);   // Δ5 : C5=C6
      if (!v.seco) {
        oxy(g, hA[4], 160, v.c3);             // C3 : 3-céto ou 3-OH
        if (!v.aromA) methyl(g, hA[1], -90);  // C19
      }
      if (v.cho) oxy(g, hC[1], -80, 'k');     // C18 aldéhyde (aldostérone)
      else methyl(g, hC[1], -90);             // C18
      if (v.o11) oxy(g, hC[5], -140, v.o11);  // 11β-OH
      if (v.chain) {
        // Chaîne latérale en C17 : C20 (cétone) et C21 (CH3 ou CH2OH)
        const c20 = [c17[0] + 2.4, c17[1] - 1.4], c21 = [c17[0] + 4.8, c17[1]];
        el('path', { d: `M ${c17[0]},${c17[1]} L ${c20[0]},${c20[1]} L ${c21[0]},${c21[1]}`, class: 'm-bond mcs' }, g);
        oxy(g, c20, -90, 'k');
        if (v.chain === 'oh') oxy(g, c21, 20, 'h');
        if (v.o17) oxy(g, c17, 100, v.o17);  // 17α-OH
      } else if (v.o17) oxy(g, c17, 0, v.o17);
      if (v.iso) {
        // Cholestérol : chaîne isooctyle en C17 (C20 méthylé, C25 ramifié)
        const z = [0, 1, 2, 3, 4].map((k) => [c17[0] + 2.4 * k, c17[1] - (k % 2 ? 1.4 : 0)]);
        el('path', { d: 'M ' + z.map((q) => q[0] + ',' + q[1]).join(' L '), class: 'm-bond mcs' }, g);
        bond(g, z[1][0], z[1][1], z[1][0], z[1][1] - 2.2);
        bond(g, z[4][0], z[4][1], z[4][0] + 2, z[4][1] + 1.2);
      }
      if (v.seco) {
        // Calcitriol : cycle B ouvert (sécostéroïde), triène, cycle A isolé avec 1α-OH et 3β-OH, chaîne avec 25-OH
        const a2 = [C[0] - s - 3, C[1] + 6];
        const h2 = hexV(a2[0], a2[1], r);
        el('path', { d: `M ${hC[4][0]},${hC[4][1]} L ${hC[4][0] - 2.5},${hC[4][1] + 1.2} L ${h2[1][0]},${h2[1][1]}`, class: 'm-bond mcs' }, g);
        el('path', { d: polyD(h2), class: 'm-ring mc' }, g);
        bond(g, h2[2][0], h2[2][1], h2[2][0] + 1.6, h2[2][1] + 1.6, 'm-db');
        oxy(g, h2[4], 170, 'h');
        oxy(g, h2[3], 100, 'h');
        el('path', { d: `M ${c17[0]},${c17[1]} L ${c17[0] + 2.4},${c17[1] - 1.6} L ${c17[0] + 4.8},${c17[1]} L ${c17[0] + 7.2},${c17[1] - 1.6}`, class: 'm-bond mcs' }, g);
        oxy(g, [c17[0] + 7.2, c17[1] - 1.6], -40, 'h');
      }
    }
    steroid('cortisol', 'p-gold', { c3: 'k', d4: true, o11: 'h', chain: 'oh', o17: 'h' });
    steroid('aldo', 'p-teal', { c3: 'k', d4: true, o11: 'h', cho: true, chain: 'oh' });
    steroid('testo', 'p-blue', { c3: 'k', d4: true, o17: 'h' });
    steroid('e2', 'p-rose', { c3: 'h', aromA: true, o17: 'h' });
    steroid('prog', 'p-violet', { c3: 'k', d4: true, chain: 'me' });
    steroid('dhea', 'p-sky', { c3: 'h', d5: true, o17: 'k' });
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
    peptide('angio1', 'p-red', 10); // angiotensine I (décapeptide)
    peptide('calcitonin', 'tg', 32, { helix: true });
    peptide('sst', 'p-grey', 14, { ring: 12, ss: [0, 11] }); // pont Cys3–Cys14 fermant le cycle
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
    g = root('glucose', 'p-lime', 0.85); // β-D-glucopyranose : O cyclique, 4 OH, CH2OH
    const gr = hexV(0, 0, 4.5);
    el('path', { d: polyD(gr), class: 'm-ring mc' }, g);
    atom(g, gr[0][0], gr[0][1], 1.3, 'm-O');
    [1, 2, 3, 4].forEach((i) => { const p = gr[i]; const a = Math.atan2(p[1], p[0]) * 180 / Math.PI; oxy(g, p, a, 'h'); });
    const c6 = gr[5];
    bond(g, c6[0], c6[1], c6[0] - 1.8, c6[1] - 2.4);
    oxy(g, [c6[0] - 1.8, c6[1] - 2.4], -110, 'h');
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

    /* ---------- Lipoprotéines : taille, cœur et apolipoprotéines propres à chaque classe ----------
       Coque de phospholipides (perles), cœur de triglycérides (jaune) et/ou d'esters de cholestérol (orange),
       apolipoprotéines : B48 (chylomicrons), B100 (VLDL, LDL), A-I (HDL), C et E (petits disques). */
    const shell = (gg, r, n) => {
      for (let i = 0; i < n; i++) {
        const t = (i / n) * 2 * Math.PI;
        el('circle', { cx: (r * Math.cos(t)).toFixed(2), cy: (r * Math.sin(t)).toFixed(2), r: 0.75, class: 'm-pl' }, gg);
      }
    };
    const drops = (gg, pts, cls) => pts.forEach(([x, y, r]) => el('circle', { cx: x, cy: y, r, class: cls }, gg));
    const arc = (gg, r, a0, a1, cls) => {
      const p = (a) => [r * Math.cos((a * Math.PI) / 180), r * Math.sin((a * Math.PI) / 180)];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      el('path', { d: `M ${x0.toFixed(2)},${y0.toFixed(2)} A ${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`, class: cls }, gg);
    };
    const smallApo = (gg, r, angs, cls) => angs.forEach((a) => el('circle', { cx: (r * Math.cos((a * Math.PI) / 180)).toFixed(2), cy: (r * Math.sin((a * Math.PI) / 180)).toFixed(2), r: 1.3, class: cls }, gg));
    // Chylomicron : très gros, presque uniquement des triglycérides ; apoB48 courte, apoC et apoE.
    let gg = root('chylo', 'p-amber');
    el('circle', { r: 12.5, class: 'm-lp-shell' }, gg);
    drops(gg, [[-4, -3, 4.2], [4, -4, 3.6], [-3, 5, 3.8], [5, 4, 3.4], [0, 0, 2.4]], 'm-tg');
    shell(gg, 12.5, 26);
    arc(gg, 13.2, 200, 245, 'm-apoB');
    smallApo(gg, 13.2, [300, 340, 30, 80, 130], 'm-apoC');
    // VLDL : grosse, riche en triglycérides, un peu d'esters de cholestérol ; apoB100, apoC, apoE.
    gg = root('vldl', 'p-gold');
    el('circle', { r: 9.5, class: 'm-lp-shell' }, gg);
    drops(gg, [[-3, -2.5, 3.3], [3, -2.5, 3], [-1.5, 3.5, 3], [3.6, 3, 1.6]], 'm-tg');
    drops(gg, [[0.5, 0.5, 1.6], [-4.6, 2, 1.2]], 'm-ce');
    shell(gg, 9.5, 20);
    arc(gg, 10.2, 150, 290, 'm-apoB');
    smallApo(gg, 10.2, [330, 20, 75], 'm-apoC');
    // LDL : petite, cœur dense d'esters de cholestérol, une seule apoB100 qui ceinture la particule.
    gg = root('ldl', 'p-orange');
    el('circle', { r: 6.6, class: 'm-lp-shell' }, gg);
    el('circle', { r: 4.6, class: 'm-ce' }, gg);
    shell(gg, 6.6, 14);
    arc(gg, 7.3, -160, 150, 'm-apoB');
    // HDL : la plus petite, pauvre en lipides, riche en protéines : plusieurs apoA-I en hélices.
    gg = root('hdl', 'p-teal');
    el('circle', { r: 4.4, class: 'm-lp-shell' }, gg);
    el('circle', { r: 2.2, class: 'm-ce' }, gg);
    arc(gg, 4.9, -80, 40, 'm-apoA');
    arc(gg, 4.9, 60, 180, 'm-apoA');
    arc(gg, 4.9, 200, 260, 'm-apoA');
    steroid('chol', 'p-gold', { c3: 'h', d5: true, iso: true }); // cholestérol : Δ5, 3β-OH, chaîne isooctyle
    g = root('pcsk9', 'p-magenta'); // PCSK9 : protéase à trois domaines
    [[-6, 0, 5], [2, -3, 5], [6, 4, 4]].forEach(([x, y, r]) => atom(g, x, y, r, 'm-prot'));
    g = root('ldlr', 'p-teal'); // récepteur des LDL (membranaire)
    el('path', { d: 'M 0,12 L 0,-2 M 0,-2 C -6,-4 -8,-10 -4,-12 M 0,-2 C 6,-4 8,-10 4,-12', class: 'm-recep' }, g);
  };
})();
