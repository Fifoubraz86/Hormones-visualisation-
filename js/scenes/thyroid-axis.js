/* Niveau 1 : l'axe hypothalamo-hypophyso-thyroïdien et la périphérie. */
(function () {
  'use strict';
  const HV = window.HV;
  const M = HV.model;
  const S = M.s, P = M.p;
  const cap = (v, m) => Math.min(m, Math.max(0, v));

  HV.scene({
    id: 'thyro',
    parent: 'atlas',
    x: HV.CARD.x('L'),
    y: HV.CARD.y(0),
    scale: HV.CARD.s,
    title: 'Axe thyréotrope',
    level: 'Axe',
    lead: 'La TRH hypothalamique stimule la sécrétion de TSH, qui stimule la thyroïde. La T4 (et un peu de T3) circule, puis la T4 est convertie en T3 active dans les tissus. T4 et T3 freinent en retour l\'hypophyse et l\'hypothalamus.',
    points: [
      'La relation TSH / T4L est log-linéaire : une petite baisse de T4L entraîne une forte hausse de TSH.',
      'La T4, forme de réserve, est exclusivement thyroïdienne. 75 % de la T3, forme active, proviennent de la conversion périphérique de la T4 par les désiodases.',
      'La TSH est sous double contrôle hypothalamique : stimulant (TRH) et inhibiteur (somatostatine). T4 et T3 exercent un rétrocontrôle négatif, préférentiellement hypophysaire.',
      'Changez de scénario dans le panneau pour voir l\'axe se rééquilibrer en direct.'
    ],
    build(g, a) {
      a.frame('Axe thyréotrope', 'Hypothalamus · hypophyse · thyroïde · périphérie');

      /* --- Connecteurs vers les loupes (scènes enfants) --- */
      a.path('M 350,235 C 470,235 560,256 660,256', 'connector');
      a.path('M 350,435 C 470,435 560,414 646,412', 'connector');
      a.path('M 350,635 C 460,635 520,640 600,640', 'connector');
      a.text(372, 222, 'Hypothalamus', 'lbl');
      a.text(372, 422, 'Antéhypophyse', 'lbl');
      a.text(372, 622, 'Thyroïde', 'lbl');
      a.childCaption('hypo', 'Neurone à TRH ⊕');
      a.childCaption('pit', 'Cellule thyréotrope ⊕');
      a.childCaption('foll', 'Follicule thyroïdien ⊕');
      a.childCaption('transp', 'Transport plasmatique ⊕');
      a.childCaption('cell', 'Cellule cible ⊕');

      /* --- Encéphale en coupe sagittale : hypothalamus, tige, hypophyse --- */
      const br = a.el('g', { transform: 'translate(700 256)' });
      const parts = HV.organs.brainSagittal(br);
      a.info(parts.hypo, 'hypothalamus');
      a.zoomable(parts.hypo, 'hypo');
      a.info(parts.ant, 'pit-ant');
      a.zoomable(parts.ant, 'pit');
      a.text(560, 470, 'selle turcique', 'note', { anchor: 'middle', attrs: { 'data-info': 'sella' } });

      /* --- Thyroïde (taille variable : goitre / atrophie) --- */
      const thyG = a.el('g', { transform: 'translate(700 650)' });
      const lobes = HV.organs.thyroidNeck(thyG);
      a.zoomable(lobes, 'foll');
      const nodule = a.el('circle', { cx: 62, cy: 8, r: 20, class: 'nodule', 'data-info': 'nodule' }, lobes);
      a.dyn(() => {
        const k = (0.55 + 0.45 * Math.min(1, P.thy)) * Math.sqrt(S.goitre);
        lobes.setAttribute('transform', `scale(${k.toFixed(3)})`);
        nodule.setAttribute('opacity', P.auto > 0.02 ? 1 : 0);
      });

      /* --- Circulation --- */
      a.info(a.vessel('M 520,860 H 1572', 48), 'vessel');
      a.text(540, 922, 'Circulation sanguine →', 'lbl-s');
      a.info(a.vessel('M 696,444 C 770,480 800,540 772,596', 14), 'vessel');
      a.info(a.vessel('M 700,712 C 700,800 716,860 800,860', 18), 'vessel');

      /* --- Flux hormonaux --- */
      a.flow('M 698,272 C 702,312 712,340 712,374', { mol: 'trh', rate: () => 2 * S.trh, size: 0.9, speed: 38, track: false });
      a.flow('M 696,444 C 770,480 800,540 772,596', { mol: 'tsh', rate: () => cap(2.4 * S.tsh, 22), size: 1.05, speed: 55, track: false, max: 30 });
      a.flow('M 700,712 C 700,800 716,860 800,860', { mol: 't4', rate: () => cap(3 * S.t4prod, 24), size: 1.2, speed: 70, track: false });
      a.flow('M 700,712 C 700,800 716,860 800,860', { mol: 't3', rate: () => cap(1.1 * S.t3prod, 14), size: 1.2, speed: 70, track: false });
      a.flow('M 530,860 L 1572,860', { mol: 't4', rate: () => cap(3 * S.t4, 26), size: 1.05, speed: 150, jitter: 14, track: false, max: 60 });
      a.flow('M 530,860 L 1572,860', { mol: 't3', rate: () => cap(1.2 * S.t3, 14), size: 1.05, speed: 150, jitter: 14, track: false, max: 40 });

      /* --- Rétrocontrôle négatif --- */
      a.flow('M 905,836 C 905,620 880,450 800,428', { mol: 't4', rate: () => cap(1.2 * S.t4, 10), size: 1, speed: 120, trackClass: 'track fb' });
      a.flow('M 950,836 C 960,520 905,290 750,262', { mol: 't4', rate: () => cap(1.2 * S.t4, 10), size: 1, speed: 120, trackClass: 'track fb' });
      a.flow('M 950,836 C 960,520 905,290 750,262', { mol: 't3', rate: () => cap(0.5 * S.t3, 6), size: 1, speed: 120, track: false });
      const sP = a.sign(790, 428, 'inhib');
      const sH = a.sign(752, 262, 'inhib');
      a.text(988, 640, 'rétrocontrôle négatif', 'fb-lbl', { anchor: 'middle', attrs: { transform: 'rotate(-90 988 640)' } });
      const pP = a.sign(668, 382, 'stim');
      const pT = a.sign(806, 594, 'stim');
      a.dyn(() => {
        sP.set(S.fb * S.fb);
        sH.set(S.fb * S.fb);
        pP.set(S.trh);
        pT.set(S.stim);
      });

      /* --- Entrées : iode, TRAb, lévothyroxine --- */
      const iodG = a.el('g', { class: 'input', 'data-info': 'food' });
      a.el('circle', { cx: 455, cy: 772, r: 26, class: 'food' }, iodG);
      a.text(455, 780, 'I⁻', 'food-t', { anchor: 'middle' }, iodG);
      a.text(455, 826, 'Apport iodé', 'lbl-s', { anchor: 'middle' }, iodG);
      a.flow('M 482,760 C 530,720 570,700 606,672', { mol: 'iod', rate: () => 3 * P.iodine, size: 1.2, speed: 60 });

      const immG = a.el('g', { class: 'input immune', 'data-info': 'lympho' });
      a.el('circle', { cx: 470, cy: 520, r: 24, class: 'lympho' }, immG);
      a.el('circle', { cx: 466, cy: 516, r: 15, class: 'lympho-n' }, immG);
      a.text(470, 566, 'Lymphocytes B · TRAb', 'lbl-s', { anchor: 'middle' }, immG);
      a.flow('M 496,530 C 548,540 584,574 612,604', { mol: 'trab', rate: () => 4 * P.trab, size: 1.3, speed: 60 });

      const levG = a.el('g', { class: 'input', 'data-info': 'levo' });
      a.el('rect', { x: 560, y: 940, width: 44, height: 20, rx: 10, class: 'lt4-pill' }, levG);
      a.path('M 582,940 V 960', 'pill-line', levG);
      a.text(616, 956, 'Lévothyroxine', 'lbl-s', null, levG);
      a.flow('M 582,938 C 584,910 600,894 616,878', { mol: 't4', info: 'levo', rate: () => 3 * P.levo, size: 1.2, speed: 40 });
      a.dyn(() => {
        immG.setAttribute('opacity', P.trab > 0.02 ? 1 : 0.28);
        levG.setAttribute('opacity', P.levo > 0.02 ? 1 : 0.28);
      });

      /* --- Tissus périphériques --- */
      a.text(1030, 420, 'Tissus périphériques', 'lbl-h');
      a.flow('M 1195,836 L 1195,440', { mol: 't4', rate: () => cap(1.2 * S.t4, 10), size: 1, speed: 90 });
      a.flow('M 1195,836 L 1195,440', { mol: 't3', rate: () => cap(0.7 * S.t3, 8), size: 1, speed: 90, track: false });
      a.flow('M 1365,836 L 1365,440', { mol: 't4', rate: () => cap(1.2 * S.t4, 10), size: 1, speed: 90 });
      a.flow('M 1365,836 L 1365,440', { mol: 't3', rate: () => cap(0.7 * S.t3, 8), size: 1, speed: 90, track: false });

      const organ = (cx, cy, name, key, effect, extra) => {
        const og = a.el('g', { class: 'periph', transform: `translate(${cx} ${cy})`, 'data-info': key });
        const halo = a.el('circle', { r: 54, class: 'periph-halo' }, og);
        const ic = a.el('g', { class: 'periph-ic' }, og);
        HV.organs[key](ic);
        if (extra) extra(ic);
        a.text(0, 76, name, 'lbl-s strong', { anchor: 'middle' }, og);
        const eff = a.text(0, 98, effect, 'note', { anchor: 'middle' }, og);
        return { og, ic, halo, eff };
      };
      const brain = organ(1110, 500, 'Cerveau', 'brainLateral', 'Développement');
      brain.og.setAttribute('data-info', 'brain');
      const heart = organ(1280, 500, 'Cœur', 'heart', 'FC ≈ 72 /min');
      organ(1450, 500, 'Foie', 'liver', 'D1 · LDL ↓');
      const bone = organ(1110, 680, 'Os', 'bone', 'Remodelage');
      bone.ic.setAttribute('transform', 'rotate(-30)');
      const muscle = organ(1280, 680, 'Muscle', 'muscle', 'Thermogenèse', (ic) => {
        a.path('M -18,-26 q 5,-8 0,-16 q -5,-8 0,-16 M 0,-26 q 5,-8 0,-16 q -5,-8 0,-16 M 18,-26 q 5,-8 0,-16 q -5,-8 0,-16', 'heat', ic);
      });
      const fat = organ(1450, 680, 'Tissu adipeux', 'fat', 'MB ≈ 100 %');
      const heat = muscle.ic.querySelector('.heat');
      let phase = 0;
      let txtTimer = 0;
      a.dyn((dt) => {
        const t3 = S.t3;
        const hr = HV.clamp(72 * Math.pow(t3, 0.35), 45, 150);
        phase += (dt * hr) / 60;
        const ph = phase % 1;
        const beat = Math.exp(-Math.pow(ph * 7, 2)) + 0.5 * Math.exp(-Math.pow((ph - 0.22) * 9, 2));
        heart.ic.setAttribute('transform', `scale(${(1 + 0.12 * beat).toFixed(3)})`);
        const act = HV.clamp(t3, 0, 3);
        heat.setAttribute('opacity', HV.clamp((act - 0.5) / 1.5, 0.05, 1).toFixed(2));
        [brain, heart, muscle, fat].forEach((o) => o.halo.setAttribute('opacity', (0.08 + 0.25 * HV.clamp(act / 2, 0, 1)).toFixed(2)));
        txtTimer -= dt;
        if (txtTimer <= 0) {
          txtTimer = 0.4;
          heart.eff.textContent = 'FC ≈ ' + Math.round(hr) + ' /min';
          fat.eff.textContent = 'MB ≈ ' + Math.round(100 * Math.pow(t3, 0.4)) + ' %';
        }
      });
    }
  });
})();
