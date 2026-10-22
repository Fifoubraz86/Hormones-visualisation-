/* Niveau 2 : cellule cible, désiodases et action génomique de la T3. */
(function () {
  'use strict';
  const HV = window.HV;
  const S = HV.model.s, P = HV.model.p;
  const cap = (v, m) => Math.min(m, Math.max(0, v));

  HV.scene({
    id: 'cell',
    parent: 'thyro',
    x: 1300,
    y: 150,
    scale: 0.15,
    title: 'Cellule cible · action de la T3',
    level: 'Cellule',
    lead: 'La T3 se lie à son récepteur nucléaire (TRα ou TRβ), associé à RXR sur les éléments de réponse (TRE) de l\'ADN, et module la transcription de nombreux gènes.',
    points: [
      'Les transporteurs MCT8, MCT10 et OATP1C1 font entrer T4 et T3. Une mutation de MCT8 cause le syndrome d\'Allan-Herndon-Dudley (complément).',
      'D1 et D2 activent (T4 → T3). D3 inactive (T4 → T3 reverse, T3 → T2) (complément).',
      'Sans T3, le récepteur recrute des corépresseurs. La T3 les remplace par des coactivateurs (complément).',
      'Effets : thermogenèse, métabolisme basal, fréquence cardiaque, développement cérébral, remodelage osseux (polycopié p. 9-10).'
    ],
    build(g, a) {
      a.frame('Cellule cible · action de la T3', 'Entrée → activation / inactivation → récepteur nucléaire → transcription');

      a.text(80, 200, ['Liquide', 'interstitiel'], 'lbl-s', { lh: 1.25 });
      a.el('rect', { x: 300, y: 170, width: 1240, height: 790, rx: 60, class: 'cell', 'data-info': 'tissue' });
      [[380, 'MCT8'], [600, 'MCT10 · OATP1C1']].forEach(([y, l]) => {
        a.el('rect', { x: 286, y: y - 24, width: 30, height: 48, rx: 9, class: 'transporter', 'data-info': y < 500 ? 'mct8' : 'oatp' });
        a.text(330, y - 34, l, 'note');
      });

      const d2 = a.el('g', { transform: 'translate(560 360)', 'data-info': 'd2' });
      a.el('circle', { r: 32, class: 'enzyme' }, d2);
      a.text(0, 8, 'D2', 'enzyme-t', { anchor: 'middle' }, d2);
      a.text(560, 318, 'D2 (réticulum) : T4 → T3', 'note', { anchor: 'middle' });
      const d3 = a.el('g', { transform: 'translate(560 780)', 'data-info': 'd3' });
      a.el('circle', { r: 32, class: 'enzyme alt' }, d3);
      a.text(0, 8, 'D3', 'enzyme-t', { anchor: 'middle' }, d3);
      a.text(560, 842, 'D3 : T4 → T3 reverse (inactive)', 'note', { anchor: 'middle' });

      // Noyau, ADN, récepteur
      a.el('ellipse', { cx: 980, cy: 560, rx: 270, ry: 220, class: 'nucleus', 'data-info': 'nucleus' });
      a.text(980, 380, 'Noyau', 'lbl-s strong', { anchor: 'middle' });
      a.path('M 750,640 C 820,620 880,660 980,640 S 1140,620 1210,640', 'dna');
      a.path('M 750,656 C 820,636 880,676 980,656 S 1140,636 1210,656', 'dna');
      a.el('rect', { x: 940, y: 632, width: 80, height: 32, rx: 6, class: 'tre', 'data-info': 'tre' });
      a.text(980, 700, 'TRE', 'note strong', { anchor: 'middle' });
      a.el('ellipse', { cx: 948, cy: 600, rx: 40, ry: 32, class: 'tr', 'data-info': 'tr' });
      a.el('ellipse', { cx: 1018, cy: 602, rx: 34, ry: 30, class: 'rxr', 'data-info': 'rxr' });
      a.text(948, 606, 'TR', 'note strong', { anchor: 'middle' });
      a.text(1018, 608, 'RXR', 'note strong', { anchor: 'middle' });
      const bound = a.el('use', { href: '#mol-t3', transform: 'translate(930 560) scale(2)' });
      const coa = a.el('g', { 'data-info': 'coa' });
      a.el('rect', { x: 880, y: 498, width: 96, height: 36, rx: 18, class: 'coact' }, coa);
      a.text(928, 523, 'CoA', 'note strong', { anchor: 'middle' }, coa);
      const cor = a.el('g', { 'data-info': 'cor' });
      a.el('rect', { x: 880, y: 498, width: 96, height: 36, rx: 18, class: 'corep' }, cor);
      a.text(928, 523, 'CoR', 'note strong', { anchor: 'middle' }, cor);
      const occT = a.text(980, 760, 'Occupation des TR : 50 %', 'note', { anchor: 'middle' });

      // Ribosomes et effets
      [[1380, 300], [1380, 820]].forEach(([x, y]) => {
        a.el('ellipse', { cx: x, cy: y, rx: 30, ry: 20, class: 'ribo', 'data-info': 'ribo' });
        a.el('ellipse', { cx: x, cy: y - 18, rx: 20, ry: 14, class: 'ribo' });
      });
      a.text(1380, 254, 'ribosomes', 'note', { anchor: 'middle' });
      const eff = a.el('g', { transform: 'translate(1290 484)' });
      ['Na⁺/K⁺-ATPase', 'UCP : thermogenèse', 'α-MHC, SERCA2', 'Récepteur des LDL', 'Myélinisation'].forEach((l, i) => {
        a.text(0, i * 34, '↑ ' + l, 'note', null, eff);
      });

      // Flux
      a.flow('M 60,370 L 300,378 C 380,382 470,366 524,362', { mol: 't4', rate: () => 1.4 * S.t4, size: 1.8, speed: 130, max: 18 });
      a.flow('M 594,360 C 700,360 820,430 920,560', { mol: 't3', rate: () => cap(1.0 * S.t4 * P.d12, 10), size: 1.8, speed: 110, track: false, max: 14 });
      a.flow('M 60,600 L 300,600 C 450,600 650,590 900,580', { mol: 't3', rate: () => 1.2 * S.t3, size: 1.8, speed: 140, max: 18 });
      a.flow('M 60,830 L 300,812 C 400,800 480,786 526,782', { mol: 't4', rate: () => cap(0.5 * S.t4 * P.d3, 8), size: 1.8, speed: 130, max: 10 });
      a.flow('M 560,812 C 480,860 380,900 300,910 L 60,930', { mol: 'rt3', rate: () => cap(0.5 * S.t4 * P.d3, 8), size: 1.8, speed: 110, track: false, max: 10 });
      const occ = () => S.t3 / (S.t3 + 1);
      a.flow('M 1210,520 C 1260,460 1320,380 1372,322', { mol: 'mrna', rate: () => 3 * occ(), size: 2, speed: 90, max: 16 });
      a.flow('M 1210,640 C 1270,700 1330,770 1372,800', { mol: 'mrna', rate: () => 3 * occ(), size: 2, speed: 90, max: 16 });

      let tt = 0;
      a.dyn((dt) => {
        const o = occ();
        bound.setAttribute('opacity', HV.clamp((o - 0.2) * 2, 0.1, 1).toFixed(2));
        coa.setAttribute('opacity', HV.clamp((o - 0.3) * 3, 0, 1).toFixed(2));
        cor.setAttribute('opacity', HV.clamp((0.5 - o) * 3, 0, 1).toFixed(2));
        tt -= dt;
        if (tt <= 0) {
          tt = 0.4;
          occT.textContent = 'Occupation des TR : ' + Math.round(o * 100) + ' %';
        }
      });
    }
  });
})();
