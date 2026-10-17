/* Niveau 2 : cellule thyréotrope de l'antéhypophyse. */
(function () {
  'use strict';
  const HV = window.HV;
  const S = HV.model.s;
  const cap = (v, m) => Math.min(m, Math.max(0, v));

  HV.scene({
    id: 'pit',
    parent: 'thyro',
    x: 110,
    y: 360,
    scale: 0.15,
    title: 'Antéhypophyse · cellule thyréotrope',
    level: 'Organe',
    lead: 'La TRH se fixe sur son récepteur couplé à Gq. La cellule thyréotrope synthétise alors la TSH, la glycosyle et la sécrète dans la circulation générale.',
    points: [
      'TSH : glycoprotéine formée d\'une sous-unité α commune (avec LH, FSH et hCG) et d\'une sous-unité β spécifique.',
      'La glycosylation conditionne l\'activité biologique de la TSH.',
      'La T4 entre par MCT8, la D2 la convertit en T3, qui réprime TSHβ et αGSU via TRβ2.',
      'Somatostatine, dopamine et glucocorticoïdes freinent la sécrétion de TSH.'
    ],
    build(g, a) {
      a.frame('Antéhypophyse · cellule thyréotrope', 'TRH → récepteur → synthèse et sécrétion de TSH');

      a.info(a.vessel('M 160,160 L 160,960', 64), 'portal');
      a.text(214, 190, 'Sang porte (TRH)', 'lbl-s');
      a.info(a.vessel('M 1420,160 L 1420,960', 64), 'vessel');
      a.text(1366, 190, 'Circulation générale', 'lbl-s', { anchor: 'end' });

      a.el('ellipse', { cx: 780, cy: 560, rx: 390, ry: 300, class: 'cell', 'data-info': 'thyrotroph' });
      a.el('ellipse', { cx: 690, cy: 590, rx: 130, ry: 105, class: 'nucleus', 'data-info': 'nucleus' });
      a.path('M 620,600 q 8.75,-14 17.5,0 t 17.5,0 t 17.5,0 t 17.5,0 t 17.5,0 t 17.5,0 t 17.5,0 t 17.5,0', 'dna');
      a.text(690, 640, 'TSHβ · αGSU', 'note', { anchor: 'middle' });

      // Récepteur TRH (7 domaines transmembranaires)
      a.path('M 386,500 v 80 M 396,500 v 80 M 406,500 v 80 M 416,500 v 80 M 426,500 v 80', 'receptor', null, { 'data-info': 'trhr' });
      a.text(406, 482, 'TRH-R', 'lbl-s strong', { anchor: 'middle' });
      a.text(406, 610, 'Gq', 'note', { anchor: 'middle' });
      const casc = a.path('M 440,560 C 500,560 540,590 560,600', 'cascade', null, { 'marker-end': 'url(#arr-accent)' });
      a.text(496, 680, ['PLC → IP₃ / Ca²⁺', 'PKC'], 'note', { anchor: 'middle', lh: 1.3 });

      // RE / Golgi
      const gg = a.el('g', { transform: 'translate(880 400)', 'data-info': 'golgi' });
      for (let i = 0; i < 4; i++) a.path(`M -60,${i * 16} C -30,${i * 16 - 12} 30,${i * 16 - 12} 60,${i * 16}`, 'golgi', gg);
      a.text(880, 360, 'RE · Golgi : glycosylation', 'note', { anchor: 'middle' });
      [[1050, 440], [1080, 520], [1040, 600], [1100, 470]].forEach(([x, y]) => a.el('circle', { cx: x, cy: y, r: 13, class: 'granule' }));

      // D2 et MCT8
      const d2 = a.el('g', { transform: 'translate(950 700)', 'data-info': 'd2' });
      a.el('circle', { r: 30, class: 'enzyme' }, d2);
      a.text(0, 8, 'D2', 'enzyme-t', { anchor: 'middle' }, d2);
      a.el('rect', { x: 1130, y: 700, width: 26, height: 44, rx: 8, class: 'transporter', 'data-info': 'mct8' });
      a.text(1143, 786, 'MCT8', 'note', { anchor: 'middle' });

      // Flux
      a.flow('M 160,160 L 160,520 C 220,540 300,540 380,540', { mol: 'trh', rate: () => 2.6 * S.trh, size: 1.6, speed: 120, track: false });
      a.flow('M 740,500 C 830,420 960,400 1040,470 S 1200,550 1390,560 C 1420,600 1420,700 1420,960', { mol: 'tsh', rate: () => cap(2.6 * S.tsh, 24), size: 1.7, speed: 160, track: false, max: 40 });
      a.flow('M 1420,170 L 1420,700 C 1320,720 1220,722 1140,722 L 985,705', { mol: 't4', rate: () => 1.6 * S.t4, size: 1.6, speed: 160, track: false, max: 20 });
      a.flow('M 920,690 C 880,660 850,630 826,604', { mol: 't3', rate: () => 1.4 * S.fb, size: 1.6, speed: 70, max: 16 });

      const inh = a.sign(814, 590, 'inhib');
      a.text(840, 580, 'T3 → TRβ2', 'note');
      const stim = a.sign(588, 612, 'stim');
      a.dyn(() => {
        inh.set(S.fb * S.fb);
        stim.set(S.trh);
        casc.setAttribute('stroke-width', (3 + 3 * HV.clamp(S.trh, 0, 2)).toFixed(1));
      });

      const mg = a.el('g', { transform: 'translate(250 880)' });
      a.text(0, 0, '−', 'mod-inhib', null, mg);
      a.text(26, 0, 'Somatostatine · dopamine · glucocorticoïdes freinent la TSH', 'note', null, mg);
    }
  });
})();
