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
      'La relation TSH / T4L est log-linéaire (complément) : une petite baisse de T4L entraîne une forte hausse de TSH.',
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
      /* --- Substrat anatomique selon le scénario --- */
      // Basedow : hypervascularisation diffuse
      const vasc = a.el('g', { class: 'les-vasc', 'data-info': 'les-graves' }, lobes);
      [[-60, -40], [-80, 10], [-62, 50], [60, -40], [80, 10], [62, 50], [-40, 10], [40, 10]].forEach(([x, y], i) =>
        a.path(`M ${x - 14},${y} q 7,${i % 2 ? -8 : 8} 14,0 t 14,0`, 'les-vessel', vasc));
      // Hashimoto : infiltrat lymphocytaire et parenchyme hétérogène
      const lymph = a.el('g', { class: 'les-lymph', 'data-info': 'les-hashi' }, lobes);
      [[-70, -30], [-56, -10], [-82, 20], [-60, 40], [-74, 62], [70, -30], [56, -10], [82, 20], [60, 40], [74, 62], [-48, 66], [48, 66], [-88, -6], [88, -6]].forEach(([x, y]) => a.el('circle', { cx: x, cy: y, r: 5, class: 'les-lympho' }, lymph));
      // Carence iodée : goitre multinodulaire
      const gmn = a.el('g', { class: 'les-gmn', 'data-info': 'les-gmn' }, lobes);
      [[-66, -36, 13], [-76, 36, 16], [70, -10, 14], [60, 50, 11]].forEach(([x, y, r]) => {
        a.el('circle', { cx: x, cy: y, r, class: 'les-nod-soft' }, gmn);
        a.el('circle', { cx: x, cy: y, r, fill: 'url(#shine)' }, gmn);
      });
      // Adénome toxique : nodule unique encapsulé, hyperfonctionnel
      const nodule = a.el('g', { class: 'les-adenoma', 'data-info': 'nodule' }, lobes);
      a.el('circle', { cx: 62, cy: 14, r: 26, class: 'les-cap' }, nodule);
      a.el('circle', { cx: 62, cy: 14, r: 22, class: 'nodule' }, nodule);
      a.el('circle', { cx: 62, cy: 14, r: 22, fill: 'url(#shine)' }, nodule);
      const lesLbl = a.text(0, 140, '', 'les-lbl', { anchor: 'middle' }, thyG);
      // Hypothyroïdie centrale : macroadénome hypophysaire non sécrétant
      const pitMass = a.el('g', { class: 'les-adenoma', 'data-info': 'les-pitmass', transform: 'translate(-20 150)' }, br);
      a.el('path', { d: 'M -46,6 C -50,-30 -10,-52 22,-40 C 52,-28 56,10 38,32 C 18,52 -36,46 -46,6 Z', class: 'les-mass' }, pitMass);
      a.el('path', { d: 'M -46,6 C -50,-30 -10,-52 22,-40 C 52,-28 56,10 38,32 C 18,52 -36,46 -46,6 Z', fill: 'url(#shine)' }, pitMass);
      a.dyn(() => {
        const k = (0.55 + 0.45 * Math.min(1, P.thy)) * Math.sqrt(S.goitre);
        lobes.setAttribute('transform', `scale(${k.toFixed(3)})`);
        const on = (el, c) => el.setAttribute('opacity', c ? 1 : 0);
        on(nodule, P.auto > 0.02);
        on(vasc, P.trab > 0.05);
        on(lymph, P.thy < 0.6);
        on(gmn, P.iodine < 0.5);
        on(pitMass, P.pit < 0.5);
        // Parenchyme « éteint » quand la TSH est effondrée (adénome toxique, surdosage en LT4)
        lobes.classList.toggle('quiet', S.tsh < 0.15 && P.trab < 0.05);
        lesLbl.textContent = P.auto > 0.02 ? 'nodule autonome, reste du parenchyme éteint' : P.trab > 0.05 ? 'goitre diffus hypervasculaire' : P.thy < 0.6 ? 'infiltrat lymphocytaire' : P.iodine < 0.5 ? 'goitre multinodulaire' : '';
      });

      /* --- Scintigraphie à l'iode 123 (vignette) --- */
      const sc = a.el('g', { class: 'scinti', transform: 'translate(110 790)', 'data-info': 'scinti' });
      a.el('rect', { width: 230, height: 180, rx: 14, class: 'scinti-bg' }, sc);
      a.text(14, 26, 'Scintigraphie ¹²³I', 'scinti-t', null, sc);
      // Vraies images du polycopié (figures 9A et 9B) quand elles existent ; sinon « image manquante ».
      const img = a.el('image', { x: 12, y: 36, width: 206, height: 112, preserveAspectRatio: 'xMidYMid meet' }, sc);
      const miss = a.text(115, 98, 'image manquante', 'scinti-c', { anchor: 'middle' }, sc);
      const scTxt = a.text(115, 168, '', 'scinti-c', { anchor: 'middle' }, sc);
      let shown = '';
      a.dyn(() => {
        // Indiquée seulement devant une TSH basse : inutile devant une hypothyroïdie ou un goitre à TSH non basse.
        const ind = HV.model.lab('tsh') < 0.4;
        sc.setAttribute('opacity', ind ? 1 : 0.4);
        const fig = !ind ? '' : P.auto > 0.02 ? '9A' : P.trab > 0.05 ? '9B' : '';
        if (fig !== shown) {
          shown = fig;
          if (fig) img.setAttribute('href', HV.polyFig(fig).src);
          else img.removeAttribute('href');
          img.setAttribute('visibility', fig ? 'visible' : 'hidden');
          sc.setAttribute('data-figs', fig || null);
          if (!fig) sc.removeAttribute('data-figs');
        }
        miss.setAttribute('visibility', ind && !fig ? 'visible' : 'hidden');
        scTxt.textContent = !ind ? 'non indiquée : TSH non basse' : P.auto > 0.02 ? 'nodule chaud (fig. 9A du polycopié)' : P.trab > 0.05 ? 'fixation diffuse (fig. 9B du polycopié)' : 'TSH basse : autre cause';
      });

      /* --- Circulation --- */
      a.info(a.vessel('M 520,860 H 1572', 48), 'vessel');
      a.text(540, 922, 'Circulation sanguine →', 'lbl-s');
      a.info(a.vessel('M 696,444 C 770,480 800,540 772,596', 14), 'vessel');
      a.info(a.vessel('M 700,712 C 700,800 716,860 800,860', 18), 'vessel');

      /* --- Flux hormonaux --- */
      a.flow('M 698,272 C 702,312 712,340 712,374', { mol: 'trh', pace: () => HV.paceOf(S.trh), rate: () => 2 * S.trh, size: 0.9, speed: 38, track: false });
      a.flow('M 696,444 C 770,480 800,540 772,596', { mol: 'tsh', pace: () => HV.paceOf(S.tsh), rate: () => cap(2.4 * S.tsh, 22), size: 1.05, speed: 55, track: false, max: 30 });
      a.flow('M 700,712 C 700,800 716,860 800,860', { mol: 't4', pace: () => HV.paceOf(S.t4prod), rate: () => cap(3 * S.t4prod, 24), size: 1.2, speed: 70, track: false });
      a.flow('M 700,712 C 700,800 716,860 800,860', { mol: 't3', pace: () => HV.paceOf(S.t3prod), rate: () => cap(1.1 * S.t3prod, 14), size: 1.2, speed: 70, track: false });
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

      /* --- Iconographie du polycopié --- */
      HV.figBadge(a, 800, 560, ['1', '4', '5', '6', '7A', '7B', '7C', '7D', '9A', '9B']);
      HV.figBadge(a, 770, 200, ['2', '17']);
      HV.figBadge(a, 610, 560, ['8']);

      HV.loupeCaptions(a, 'thyro');

      /* --- Pas à pas --- */
      HV.spotlight(HV.scenes.thyro, a, [
        { t: 'L\'hypothalamus sécrète la TRH', d: 'Les neurones du noyau paraventriculaire fabriquent la TRH, un tripeptide, et la libèrent dans les capillaires de l\'éminence médiane. Zoomez sur l\'hypothalamus pour voir le neurone à TRH.', spot: [[700, 252, 92]] },
        { t: 'Le système porte conduit la TRH à l\'antéhypophyse', d: 'Les veines portes de la tige pituitaire amènent la TRH aux cellules thyréotropes, qui sécrètent la TSH. La somatostatine freine la TSH.', spot: [[690, 352, 112]] },
        { t: 'La TSH stimule la thyroïde', d: 'La TSH gagne la circulation générale et se fixe sur son récepteur à la surface des thyréocytes : captation de l\'iode, synthèse et sécrétion des hormones, croissance de la glande.', spot: [[742, 520, 86], [700, 650, 122]] },
        { t: 'La thyroïde fabrique surtout de la T4', d: 'L\'iode alimentaire est capté puis incorporé à la thyroglobuline : la glande sécrète surtout de la T4 (forme de réserve) et un peu de T3. Zoomez sur le follicule pour suivre la synthèse.', spot: [[700, 650, 130], [455, 785, 72]] },
        { t: 'Le transport dans le sang', d: 'T4 et T3 circulent liées à des protéines (TBG surtout) ; seule la fraction libre, infime, est active et dosée (T4L, T3L).', spot: [[520, 812, 1052, 100]] },
        { t: 'Dans les tissus, la T4 devient T3', d: 'Les désiodases convertissent la T4 en T3, forme active : 75 % de la T3 vient de cette conversion. La T3 agit sur le cœur, le cerveau, l\'os, le muscle, le métabolisme de base.', spot: [[1030, 400, 540, 350]] },
        { t: 'Rétrocontrôle négatif', d: 'T4 et T3 freinent la TSH (surtout) et la TRH. La relation est log-linéaire : une petite baisse de T4L fait monter fortement la TSH, d\'où l\'intérêt de la TSH en première intention.', spot: [[760, 240, 240, 610], [700, 252, 60], [790, 428, 46]] },
        { t: 'Ce qui vient de l\'extérieur', d: 'L\'apport iodé, les anticorps anti-récepteur de la TSH (Basedow) et la lévothyroxine entrent dans la boucle. Essayez les scénarios du panneau pour voir l\'axe se rééquilibrer.', spot: [[465, 540, 72], [455, 785, 72], [600, 948, 80]] }
      ]);
    }
  });
})();
