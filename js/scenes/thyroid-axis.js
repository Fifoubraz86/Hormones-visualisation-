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
    x: 70,
    y: 110,
    scale: 0.16,
    title: 'Axe thyréotrope',
    level: 'Axe',
    lead: 'La TRH hypothalamique stimule la sécrétion de TSH, qui stimule la thyroïde. La T4 (et un peu de T3) circule, puis la T4 est convertie en T3 active dans les tissus. T4 et T3 freinent en retour l\'hypophyse et l\'hypothalamus.',
    points: [
      'La relation TSH / T4L est log-linéaire : une petite baisse de T4L entraîne une forte hausse de TSH.',
      'La thyroïde sécrète surtout de la T4 (80 à 90 %). Environ 80 % de la T3 circulante provient de la désiodation périphérique.',
      'Le rétrocontrôle passe par la conversion locale de T4 en T3 par la désiodase de type 2 (D2).',
      'Changez de scénario dans le panneau pour voir l\'axe se rééquilibrer en direct.'
    ],
    build(g, a) {
      a.frame('Axe thyréotrope', 'Hypothalamus · hypophyse · thyroïde · tissus périphériques');

      /* --- Connecteurs vers les loupes (scènes enfants) --- */
      a.path('M 350,235 C 470,235 540,255 634,255', 'connector');
      a.path('M 350,435 C 470,435 540,412 630,410', 'connector');
      a.path('M 350,635 C 460,635 520,640 588,640', 'connector');
      a.text(372, 222, 'Hypothalamus', 'lbl');
      a.text(372, 422, 'Antéhypophyse', 'lbl');
      a.text(372, 622, 'Thyroïde', 'lbl');
      a.childCaption('hypo', 'Neurone à TRH ⊕');
      a.childCaption('pit', 'Cellule thyréotrope ⊕');
      a.childCaption('foll', 'Follicule thyroïdien ⊕');
      a.childCaption('transp', 'Transport plasmatique ⊕');
      a.childCaption('cell', 'Cellule cible ⊕');

      /* --- Cerveau, hypothalamus, tige, hypophyse --- */
      a.path('M 560,268 C 540,196 600,148 700,146 C 800,148 860,196 840,268 C 800,280 750,279 700,276 C 650,279 600,280 560,268 Z', 'brain');
      a.path('M 590,215 C 620,180 660,195 685,160 M 715,160 C 740,195 780,180 810,215 M 610,250 C 640,232 680,246 700,222 C 720,246 760,232 790,250', 'gyri');
      const hyp = a.el('ellipse', { cx: 700, cy: 255, rx: 64, ry: 28, class: 'organ hl', style: '--c: var(--trh)' });
      a.zoomable(hyp, 'hypo');
      a.path('M 688,282 C 684,315 690,340 682,370 L 718,370 C 710,340 716,315 712,282 Z', 'stalk');
      a.el('ellipse', { cx: 628, cy: 402, rx: 28, ry: 28, class: 'organ post' });
      const pit = a.el('ellipse', { cx: 705, cy: 408, rx: 74, ry: 46, class: 'organ hl', style: '--c: var(--tsh)' });
      a.zoomable(pit, 'pit');
      a.text(628, 470, 'post.', 'note', { anchor: 'middle' });

      /* --- Thyroïde (taille variable : goitre / atrophie) --- */
      const thyG = a.el('g', { class: 'thy-g' });
      a.el('rect', { x: 672, y: 560, width: 56, height: 250, rx: 22, class: 'trachea' }, thyG);
      for (let y = 580; y < 800; y += 22) a.path(`M 677,${y} H 723`, 'trachea-ring', thyG);
      const lobes = a.el('g', { class: 'lobes' }, thyG);
      a.zoomable(lobes, 'foll');
      a.path('M 688,612 C 664,566 606,560 590,612 C 574,672 590,730 640,736 C 676,740 690,706 690,676 Z', 'thyroid', lobes);
      a.path('M 712,612 C 736,566 794,560 810,612 C 826,672 810,730 760,736 C 724,740 710,706 710,676 Z', 'thyroid', lobes);
      a.el('rect', { x: 684, y: 640, width: 32, height: 34, rx: 8, class: 'thyroid' }, lobes);
      const nodule = a.el('circle', { cx: 768, cy: 656, r: 22, class: 'nodule' }, lobes);
      a.dyn(() => {
        const k = (0.55 + 0.45 * Math.min(1, P.thy)) * Math.sqrt(S.goitre);
        lobes.setAttribute('transform', `translate(700 650) scale(${k.toFixed(3)}) translate(-700 -650)`);
        nodule.setAttribute('opacity', P.auto > 0.02 ? 1 : 0);
      });

      /* --- Circulation --- */
      a.vessel('M 520,860 H 1572', 48);
      a.text(540, 922, 'Circulation sanguine →', 'lbl-s');
      a.vessel('M 700,452 C 728,500 676,540 700,600', 16);
      a.vessel('M 700,736 C 700,800 716,860 800,860', 18);

      /* --- Flux hormonaux --- */
      a.flow('M 700,282 C 690,312 712,338 700,372', { mol: 'trh', rate: () => 2 * S.trh, size: 0.95, speed: 38, track: false });
      a.flow('M 700,452 C 728,500 676,540 700,600', { mol: 'tsh', rate: () => cap(2.4 * S.tsh, 22), size: 1.1, speed: 55, track: false, max: 30 });
      a.flow('M 700,736 C 700,800 716,860 800,860', { mol: 't4', rate: () => cap(3 * S.t4prod, 24), size: 1.2, speed: 70, track: false });
      a.flow('M 700,736 C 700,800 716,860 800,860', { mol: 't3', rate: () => cap(1.1 * S.t3prod, 14), size: 1.2, speed: 70, track: false });
      a.flow('M 530,860 L 1572,860', { mol: 't4', rate: () => cap(3 * S.t4, 26), size: 1.05, speed: 150, jitter: 14, track: false, max: 60 });
      a.flow('M 530,860 L 1572,860', { mol: 't3', rate: () => cap(1.2 * S.t3, 14), size: 1.05, speed: 150, jitter: 14, track: false, max: 40 });

      /* --- Rétrocontrôle négatif --- */
      a.flow('M 905,836 C 905,620 880,430 798,410', { mol: 't4', rate: () => cap(1.2 * S.t4, 10), size: 1, speed: 120, trackClass: 'track fb' });
      a.flow('M 950,836 C 960,520 905,270 788,256', { mol: 't4', rate: () => cap(1.2 * S.t4, 10), size: 1, speed: 120, trackClass: 'track fb' });
      a.flow('M 950,836 C 960,520 905,270 788,256', { mol: 't3', rate: () => cap(0.5 * S.t3, 6), size: 1, speed: 120, track: false });
      const sP = a.sign(796, 410, 'inhib');
      const sH = a.sign(786, 256, 'inhib');
      a.text(988, 640, 'rétrocontrôle négatif', 'fb-lbl', { anchor: 'middle', attrs: { transform: 'rotate(-90 988 640)' } });
      const pP = a.sign(734, 350, 'stim');
      const pT = a.sign(730, 588, 'stim');
      a.dyn(() => {
        sP.set(S.fb * S.fb);
        sH.set(S.fb * S.fb);
        pP.set(S.trh);
        pT.set(S.stim);
      });

      /* --- Entrées : iode, TRAb, lévothyroxine --- */
      const iodG = a.el('g', { class: 'input' });
      a.el('circle', { cx: 455, cy: 772, r: 26, class: 'food' }, iodG);
      a.text(455, 780, 'I⁻', 'food-t', { anchor: 'middle' }, iodG);
      a.text(455, 826, 'Apport iodé', 'lbl-s', { anchor: 'middle' }, iodG);
      a.flow('M 482,760 C 530,720 570,700 606,672', { mol: 'iod', rate: () => 3 * P.iodine, size: 1.2, speed: 60 });

      const immG = a.el('g', { class: 'input immune' });
      a.el('circle', { cx: 470, cy: 520, r: 24, class: 'lympho' }, immG);
      a.el('circle', { cx: 466, cy: 516, r: 15, class: 'lympho-n' }, immG);
      a.text(470, 566, 'Lymphocytes B · TRAb', 'lbl-s', { anchor: 'middle' }, immG);
      a.flow('M 496,530 C 548,540 584,574 604,606', { mol: 'trab', rate: () => 4 * P.trab, size: 1.3, speed: 60 });

      const levG = a.el('g', { class: 'input' });
      a.el('rect', { x: 560, y: 940, width: 44, height: 20, rx: 10, class: 'lt4-pill' }, levG);
      a.path('M 582,940 V 960', 'pill-line', levG);
      a.text(616, 956, 'Lévothyroxine', 'lbl-s', null, levG);
      a.flow('M 582,938 C 584,910 600,894 616,878', { mol: 't4', rate: () => 3 * P.levo, size: 1.2, speed: 40 });
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

      const organ = (cx, cy, name, effect, draw) => {
        const og = a.el('g', { class: 'periph', transform: `translate(${cx} ${cy})` });
        const halo = a.el('circle', { r: 54, class: 'periph-halo' }, og);
        const ic = a.el('g', { class: 'periph-ic' }, og);
        draw(ic);
        a.text(0, 76, name, 'lbl-s strong', { anchor: 'middle' }, og);
        const eff = a.text(0, 98, effect, 'note', { anchor: 'middle' }, og);
        return { og, ic, halo, eff };
      };
      const brain = organ(1110, 500, 'Cerveau', 'Développement', (ic) => {
        a.path('M -40,8 C -46,-22 -22,-40 0,-34 C 22,-40 46,-22 40,8 C 38,28 14,34 0,26 C -14,34 -38,28 -40,8 Z', 'org-shape', ic);
        a.path('M 0,-32 V 24 M -26,-14 C -16,-6 -24,6 -12,12 M 26,-14 C 16,-6 24,6 12,12', 'org-line', ic);
      });
      const heart = organ(1280, 500, 'Cœur', 'FC ≈ 72 /min', (ic) => {
        a.path('M 0,34 C -30,12 -44,-6 -40,-20 C -36,-36 -14,-38 0,-22 C 14,-38 36,-36 40,-20 C 44,-6 30,12 0,34 Z', 'org-shape heart', ic);
      });
      organ(1450, 500, 'Foie', 'D1 · LDL ↓', (ic) => {
        a.path('M -44,-14 C -30,-32 22,-34 44,-22 C 48,-10 30,14 8,24 C -10,32 -40,20 -44,-14 Z', 'org-shape', ic);
      });
      organ(1110, 680, 'Os', 'Remodelage', (ic) => {
        const b = a.el('g', { transform: 'rotate(-35)' }, ic);
        a.el('rect', { x: -7, y: -30, width: 14, height: 60, class: 'org-shape' }, b);
        [[-8, -32], [8, -32], [-8, 32], [8, 32]].forEach(([x, y]) => a.el('circle', { cx: x, cy: y, r: 10, class: 'org-shape' }, b));
      });
      const muscle = organ(1280, 680, 'Muscle', 'Thermogenèse', (ic) => {
        a.el('ellipse', { rx: 44, ry: 18, class: 'org-shape' }, ic);
        a.path('M -34,-6 H 34 M -38,4 H 38', 'org-line', ic);
        a.path('M -18,-30 q 5,-8 0,-16 q -5,-8 0,-16 M 0,-30 q 5,-8 0,-16 q -5,-8 0,-16 M 18,-30 q 5,-8 0,-16 q -5,-8 0,-16', 'heat', ic);
      });
      const fat = organ(1450, 680, 'Tissu adipeux', 'MB ≈ 100 %', (ic) => {
        [[-18, -10], [8, -16], [24, 6], [-4, 12], [-26, 14]].forEach(([x, y]) => a.el('circle', { cx: x, cy: y, r: 14, class: 'org-shape' }, ic));
      });
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
