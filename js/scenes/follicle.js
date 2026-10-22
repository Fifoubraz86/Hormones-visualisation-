/* Niveau 2 : le thyréocyte et la synthèse des hormones thyroïdiennes. */
(function () {
  'use strict';
  const HV = window.HV;
  const S = HV.model.s, P = HV.model.p;
  const cap = (v, m) => Math.min(m, Math.max(0, v));

  HV.scene({
    id: 'foll',
    parent: 'thyro',
    x: 110,
    y: 560,
    scale: 0.15,
    title: 'Follicule thyroïdien · thyréocyte',
    level: 'Organe',
    lead: 'Le thyréocyte capte l\'iodure, l\'incorpore à la thyroglobuline dans la colloïde, puis libère T4 et T3 après protéolyse. Les étapes sont numérotées dans l\'ordre de la synthèse.',
    points: [
      'La TSH stimule chaque étape ainsi que la croissance de la glande (polycopié p. 7), via son récepteur couplé à Gs et l\'AMPc (complément).',
      'Le NIS est inhibé par le perchlorate. La TPO est inhibée par les antithyroïdiens de synthèse (carbimazole, PTU) (complément).',
      'Dans la maladie de Basedow, les TRAb activent le récepteur de la TSH. Dans la thyroïdite de Hashimoto, la glande est détruite (anti-TPO).',
      'En carence iodée, la thyroïde augmente de volume (goitre) et privilégie la T3, moins coûteuse en iode (complément).'
    ],
    build(g, a) {
      a.frame('Follicule thyroïdien · thyréocyte', 'Captation de l\'iode → organification → couplage → sécrétion');

      // Vignette : follicule entier
      const mini = a.el('g', { transform: 'translate(1480 86)' });
      a.el('circle', { r: 54, class: 'mini-cells' }, mini);
      a.el('circle', { r: 30, class: 'colloid' }, mini);
      a.el('path', { d: 'M 0,-54 L 0,-30 M 0,30 L 0,54 M -54,0 L -30,0 M 30,0 L 54,0 M -38,-38 L -21,-21 M 21,21 L 38,38 M 38,-38 L 21,-21 M -21,21 L -38,38', class: 'mini-sep' }, mini);
      a.el('path', { d: 'M 21,21 L 38,38 A 54,54 0 0 1 0,54 L 0,30 A 30,30 0 0 0 21,21 Z', class: 'mini-hl' }, mini);
      a.text(1400, 92, 'zoom →', 'note', { anchor: 'end' });

      // Colloïde, cellule, capillaire
      a.el('rect', { x: 230, y: 150, width: 1330, height: 190, rx: 20, class: 'colloid', 'data-info': 'colloid' });
      a.text(1540, 186, 'Colloïde (lumière du follicule)', 'lbl-s', { anchor: 'end' });
      a.el('rect', { x: 230, y: 332, width: 1330, height: 466, rx: 26, class: 'cell' });
      a.el('rect', { x: 60, y: 332, width: 150, height: 466, rx: 26, class: 'cell ghost' });
      let mv = 'M 250,332';
      for (let x = 250; x < 1540; x += 30) mv += ` q 7,-16 15,0 q 7,-16 15,0`;
      a.path(mv, 'microvilli');
      a.text(1546, 370, 'pôle apical', 'note', { anchor: 'end' });
      a.text(1546, 780, 'pôle basal', 'note', { anchor: 'end' });
      a.info(a.vessel('M 40,885 L 1580,885', 72), 'vessel');
      a.text(60, 955, 'Capillaire', 'lbl-s');

      a.el('ellipse', { cx: 1450, cy: 500, rx: 86, ry: 64, class: 'nucleus', 'data-info': 'nucleus' });
      a.text(1450, 506, 'Noyau', 'note', { anchor: 'middle' });

      // 1. Récepteur de la TSH
      a.path('M 302,760 v 46 M 312,760 v 46 M 322,760 v 46 M 332,760 v 46 M 342,760 v 46', 'receptor', null, { 'data-info': 'tshr' });
      a.step(322, 726, 1);
      a.text(360, 700, ['TSH-R → Gs', '→ AMPc'], 'note', { lh: 1.25 });
      const camp = a.el('circle', { cx: 340, cy: 620, r: 34, class: 'camp', 'data-info': 'camp' });
      a.text(340, 627, 'AMPc', 'note strong', { anchor: 'middle' });

      // 2. NIS + Na/K-ATPase
      a.el('rect', { x: 476, y: 770, width: 30, height: 48, rx: 10, class: 'transporter', 'data-info': 'nis' });
      a.step(491, 736, 2);
      a.text(526, 742, ['NIS', '2 Na⁺ / 1 I⁻'], 'note', { lh: 1.25 });
      a.el('rect', { x: 1086, y: 772, width: 26, height: 44, rx: 8, class: 'transporter alt', 'data-info': 'nak' });
      a.text(1099, 756, 'Na⁺/K⁺-ATPase', 'note', { anchor: 'middle' });

      // 3. Pendrine
      a.el('rect', { x: 528, y: 314, width: 28, height: 40, rx: 9, class: 'transporter', 'data-info': 'pendrin' });
      a.step(490, 380, 3);
      a.text(470, 420, 'Pendrine · ANO1', 'note', { anchor: 'middle' });

      // 4. Thyroglobuline : RE → Golgi → exocytose
      for (let i = 0; i < 4; i++) a.path(`M 670,${640 + i * 18} C 700,${628 + i * 18} 750,${652 + i * 18} 780,${640 + i * 18}`, 'er', null, { 'data-info': 'er' });
      const gg = a.el('g', { transform: 'translate(750 500)', 'data-info': 'golgi' });
      for (let i = 0; i < 3; i++) a.path(`M -44,${i * 14} C -20,${i * 14 - 10} 20,${i * 14 - 10} 44,${i * 14}`, 'golgi', gg);
      a.text(740, 730, 'RE : thyroglobuline', 'note', { anchor: 'middle' });
      a.text(820, 500, 'Golgi', 'note');
      a.step(700, 380, 4);

      // 5. TPO + DUOX2
      a.el('rect', { x: 860, y: 316, width: 30, height: 34, rx: 8, class: 'enzyme-box', 'data-info': 'tpo' });
      a.el('rect', { x: 900, y: 316, width: 30, height: 34, rx: 8, class: 'enzyme-box alt', 'data-info': 'tpo' });
      a.step(895, 386, 5);
      a.text(895, 430, ['TPO + H₂O₂ (DUOX2)', 'iodation : MIT, DIT'], 'note', { anchor: 'middle', lh: 1.25 });

      // 6. Couplage dans la colloïde
      a.step(300, 214, 6);
      a.text(330, 220, 'Couplage : DIT + DIT → T4 · MIT + DIT → T3', 'note');

      // 7. Endocytose, 8. lysosome
      a.el('circle', { cx: 1100, cy: 380, r: 22, class: 'vesicle', 'data-info': 'endo' });
      a.step(1150, 388, 7);
      a.text(1180, 394, 'Endocytose', 'note');
      a.el('circle', { cx: 1120, cy: 560, r: 44, class: 'lyso', 'data-info': 'lyso' });
      a.step(1060, 610, 8);
      a.text(1180, 556, ['Lysosome :', 'protéolyse de la Tg'], 'note', { lh: 1.25 });

      // 9. Sécrétion MCT8 ; 10. DEHAL1
      a.el('rect', { x: 1216, y: 770, width: 28, height: 48, rx: 9, class: 'transporter', 'data-info': 'mct8' });
      a.step(1270, 736, 9);
      a.text(1290, 742, ['MCT8 : sécrétion', 'de T4 et T3'], 'note', { lh: 1.25 });
      const deh = a.el('g', { transform: 'translate(930 600)', 'data-info': 'dehal' });
      a.el('circle', { r: 28, class: 'enzyme' }, deh);
      a.text(0, 6, 'DEHAL1', 'enzyme-t small', { anchor: 'middle' }, deh);
      a.step(930, 548, 10);
      a.text(930, 660, 'recyclage de l\'iode', 'note', { anchor: 'middle' });

      const stimN = () => HV.clamp(S.stim, 0, 6);
      a.flow('M 40,875 L 270,875 C 300,866 318,840 322,808', { mol: 'tsh', rate: () => cap(2 * S.tsh, 14), size: 1.6, speed: 150, track: false });
      a.flow('M 40,900 L 250,900 C 296,894 318,850 330,808', { mol: 'trab', rate: () => 3 * P.trab, size: 1.6, speed: 150, track: false });
      a.flow('M 40,870 L 450,870 C 480,860 490,840 491,818 C 492,700 520,520 542,350 C 560,290 700,250 860,262', { mol: 'iod', rate: () => cap(3.2 * P.iodine * Math.sqrt(stimN()), 16), size: 1.6, speed: 160, track: false, max: 40 });
      a.flow('M 720,680 C 720,600 760,540 748,470 C 740,420 736,370 740,340 C 760,280 820,262 880,256', { mol: 'tg', rate: () => 1.6 * Math.sqrt(stimN()), size: 1.7, speed: 90, track: false });
      a.flow('M 900,250 C 980,200 1050,220 1080,262 C 1094,290 1098,320 1100,370 C 1102,440 1112,500 1120,548', { mol: 'tgi', rate: () => 1.6 * Math.sqrt(stimN()) * Math.min(1.2, S.iF), size: 1.7, speed: 90, track: false });
      a.flow('M 1130,580 C 1160,650 1224,720 1230,790 C 1236,850 1270,885 1330,885 L 1580,885', { mol: 't4', rate: () => cap(2.4 * S.t4prod, 18), size: 1.6, speed: 150, track: false });
      a.flow('M 1130,580 C 1160,650 1224,720 1230,790 C 1236,850 1270,885 1330,885 L 1580,885', { mol: 't3', rate: () => cap(0.9 * S.t3prod, 10), size: 1.6, speed: 150, track: false });
      a.flow('M 1090,570 C 1020,600 960,600 930,600 C 820,560 640,430 552,352', { mol: 'iod', rate: () => 1.2 * Math.sqrt(stimN()) * Math.min(1, S.iF), size: 1.4, speed: 110, trackClass: 'track faint' });
      a.flow('M 40,862 L 400,862 C 450,850 470,840 480,818', { mol: 'na', rate: () => 3 * Math.sqrt(stimN()), size: 1.6, speed: 160, track: false });

      a.dyn(() => {
        const k = HV.clamp(S.stim / 2, 0, 1.5);
        camp.setAttribute('opacity', (0.25 + 0.5 * k).toFixed(2));
        camp.setAttribute('r', (26 + 14 * k).toFixed(1));
      });
    }
  });
})();
