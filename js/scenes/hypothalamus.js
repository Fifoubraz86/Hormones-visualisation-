/* Niveau 2 : neurone à TRH du noyau paraventriculaire, tanycytes et éminence médiane. */
(function () {
  'use strict';
  const HV = window.HV;
  const S = HV.model.s;

  HV.scene({
    id: 'hypo',
    parent: 'thyro',
    x: 110,
    y: 160,
    scale: 0.15,
    title: 'Hypothalamus · neurone à TRH',
    level: 'Organe',
    lead: 'Les neurones du noyau paraventriculaire (NPV) synthétisent la TRH. Elle est libérée au niveau de l\'éminence médiane dans le système porte, qui la conduit à l\'antéhypophyse.',
    points: [
      'TRH : tripeptide pGlu-His-Pro-NH₂ issu du clivage du pro-TRH par les convertases PC1/3 et PC2.',
      'Les tanycytes captent la T4 et la convertissent en T3 (D2). La T3 réprime le gène de la TRH via TRβ2.',
      'Le froid stimule la TRH. Le jeûne (baisse de la leptine), les glucocorticoïdes et l\'inflammation la freinent.',
      'Les tanycytes dégradent aussi la TRH grâce à la pyroglutamyl-peptidase II.'
    ],
    build(g, a) {
      a.frame('Hypothalamus · neurone à TRH', 'Noyau paraventriculaire → éminence médiane → système porte');

      // 3e ventricule
      a.el('rect', { x: 60, y: 170, width: 70, height: 760, rx: 35, class: 'csf', 'data-info': 'ventricle' });
      a.text(95, 560, '3ᵉ ventricule', 'note', { anchor: 'middle', attrs: { transform: 'rotate(-90 95 560)' } });

      // Capillaire porte
      a.info(a.vessel('M 1180,180 L 1180,960', 64), 'portal');
      a.text(1232, 214, ['Plexus porte primaire', 'vers l\'antéhypophyse ↓'], 'lbl-s', { lh: 1.3 });

      // Tanycyte
      a.path('M 132,770 C 400,740 800,820 1140,852', 'tanycyte', null, { 'data-info': 'tanycyte' });
      a.text(330, 722, 'Tanycyte', 'lbl-s strong');
      const d2 = a.el('g', { transform: 'translate(720 806)', 'data-info': 'd2' });
      a.el('circle', { r: 30, class: 'enzyme' }, d2);
      a.text(0, 8, 'D2', 'enzyme-t', { anchor: 'middle' }, d2);
      a.text(720, 878, 'T4 → T3', 'note', { anchor: 'middle' });

      // Neurone
      const nrn = a.el('g', { 'data-info': 'neuron' });
      a.path('M 520,420 C 700,480 850,560 1000,640', 'axon', nrn);
      a.el('circle', { cx: 430, cy: 380, r: 112, class: 'cell' }, nrn);
      a.el('circle', { cx: 1030, cy: 656, r: 30, class: 'cell', 'data-info': 'me' });
      a.el('circle', { cx: 410, cy: 392, r: 50, class: 'nucleus', 'data-info': 'nucleus' });
      a.path('M 380,392 q 7.5,-12 15,0 t 15,0 t 15,0 t 15,0', 'dna');
      a.text(410, 420, 'gène TRH', 'note', { anchor: 'middle' });
      a.path('M 470,320 q 18,-6 30,4 M 466,334 q 22,-6 36,6 M 468,348 q 18,-4 30,6', 'golgi');
      a.text(430, 528, 'Neurone à TRH (NPV)', 'lbl-s strong', { anchor: 'middle' });
      a.text(430, 552, 'pro-TRH → TRH (PC1/3, PC2)', 'note', { anchor: 'middle' });
      a.text(1030, 720, 'Éminence médiane', 'lbl-s strong', { anchor: 'middle' });
      a.text(780, 470, 'TRH = pGlu-His-Pro-NH₂', 'note', { anchor: 'middle', attrs: { transform: 'rotate(22 780 470)' } });

      // Flux
      a.flow('M 490,340 C 540,400 700,480 850,560 S 990,640 1022,652', { mol: 'trh', rate: () => 2.6 * S.trh, size: 1.5, speed: 120, track: false, max: 40 });
      a.flow('M 1046,664 C 1100,680 1170,690 1180,760 L 1180,960', { mol: 'trh', rate: () => 2.6 * S.trh, size: 1.5, speed: 110, track: false, max: 40 });
      a.flow('M 1180,900 C 1100,880 900,830 750,810', { mol: 't4', rate: () => 1.6 * S.t4, size: 1.6, speed: 110, max: 20 });
      a.flow('M 700,790 C 640,700 520,540 440,424', { mol: 't3', rate: () => 1.4 * S.fb, size: 1.6, speed: 110, max: 20 });

      const inh = a.sign(458, 344, 'inhib');
      a.text(524, 266, 'T3 → TRβ2 : répression du gène TRH', 'note');
      a.dyn(() => inh.set(S.fb * S.fb));

      // Modulateurs
      const mg = a.el('g', { transform: 'translate(1290 420)' });
      a.el('rect', { width: 270, height: 260, rx: 18, class: 'side-box' }, mg);
      a.text(20, 38, 'Modulateurs', 'lbl-s strong', null, mg);
      [['stim', 'Froid'], ['stim', 'Noradrénaline'], ['inhib', 'Jeûne (leptine ↓)'], ['inhib', 'Glucocorticoïdes'], ['inhib', 'Cytokines, maladie aiguë']].forEach(([k, l], i) => {
        const y = 80 + i * 38;
        a.text(22, y, k === 'stim' ? '+' : '−', 'mod-' + k, null, mg);
        a.text(48, y, l, 'note', null, mg);
      });
    }
  });
})();
