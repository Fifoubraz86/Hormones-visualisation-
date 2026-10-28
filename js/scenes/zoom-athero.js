/* Loupe de l'axe des lipoprotéines : l'athérosclérose, de la LDL à la plaque puis au thrombus.
   Le LDL-c vient du modèle « lipid » (axes-sim.js) ; la croissance de la plaque est un modèle illustratif.
   Mécanismes hors polycopié marqués « (complément) » : consensus de la Société européenne d'athérosclérose
   (Ference et al., Eur Heart J 2017) et manuels de physiopathologie. Illustrations : Servier Medical Art. */
(function () {
  'use strict';
  const HV = window.HV;
  const clamp = HV.clamp;
  const sim = () => HV.scenes.lipid.sim;
  const f2 = (v) => v.toFixed(2).replace('.', ',');
  const bump = (x, c, w) => { const u = (x - c) / w; return Math.abs(u) >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * u); };

  // Le modèle de l'axe n'avance que si la scène parente est visible : la loupe le fait avancer sinon.
  let lastStep = 0;
  function keepAlive(dt) {
    if (!(dt > 0) || HV.scenes.lipid._op !== 0) return;
    const now = performance.now();
    if (now - lastStep < 4) return;
    lastStep = now;
    const M = sim();
    M.step(dt, M.T);
  }

  Object.assign(HV.INFO, {
    'zat-lumen': { t: 'Lumière artérielle', k: 'Sang', d: 'Les LDL, les monocytes et les plaquettes circulent au contact de l\'endothélium.' },
    'zat-endo': { t: 'Endothélium', k: 'Barrière et régulateur de la paroi (complément)', d: 'Une seule couche de cellules. Quand il est agressé (LDL élevées, tabac, HTA, hyperglycémie), il devient plus perméable et exprime des molécules d\'adhésion (VCAM-1) qui retiennent les monocytes : c\'est la dysfonction endothéliale, première étape de l\'athérosclérose.' },
    'zat-intima': { t: 'Intima', k: 'Siège de la plaque', d: 'Entre l\'endothélium et la limitante élastique interne. Les LDL y sont retenues par les protéoglycanes, s\'y oxydent et attirent les cellules inflammatoires (complément).' },
    'zat-media': { t: 'Média', k: 'Cellules musculaires lisses', d: 'Couche musculaire de l\'artère. Dans la plaque, des cellules musculaires lisses migrent vers l\'intima, prolifèrent et fabriquent le collagène de la chape fibreuse (complément).' },
    'zat-adv': { t: 'Adventice', k: 'Tunique externe', d: 'Tissu conjonctif, petits vaisseaux nourriciers (vasa vasorum) et nerfs.' },
    'zat-ldl': { t: 'LDL dans l\'intima', k: 'Rétention et oxydation (complément)', d: 'Plus le LDL-c est élevé et longtemps, plus il entre de LDL dans la paroi : les LDL causent l\'athérosclérose, de façon dépendante de la dose et de la durée d\'exposition (consensus EAS 2017, complément). Retenues, elles s\'oxydent (LDL oxydées).' },
    'zat-mono': { t: 'Monocytes → macrophages', k: 'Inflammation (complément)', d: 'Les monocytes adhèrent à l\'endothélium activé, passent dans l\'intima et deviennent des macrophages, qui captent les LDL oxydées par leurs récepteurs « éboueurs » (scavenger), non freinés par le cholestérol.' },
    'zat-foam': { t: 'Cellules spumeuses', k: 'Strie lipidique (complément)', d: 'Macrophages gorgés de gouttelettes de cholestérol. Leur accumulation forme la strie lipidique, lésion la plus précoce, visible dès l\'enfance ou l\'adolescence.' },
    'zat-core': { t: 'Noyau lipidique (nécrotique)', k: 'Cœur de la plaque (complément)', d: 'Les cellules spumeuses meurent et libèrent leurs lipides : un noyau mou, très thrombogène, se forme au centre de la plaque.' },
    'zat-cap': { t: 'Chape fibreuse', k: 'Cellules musculaires lisses et collagène (complément)', d: 'Couvre le noyau lipidique. Une chape épaisse stabilise la plaque ; une chape fine, inflammatoire, sur un gros noyau lipidique, définit la plaque vulnérable, à risque de rupture.' },
    'zat-smc': { t: 'Migration des cellules musculaires lisses', k: 'De la média vers l\'intima (complément)', d: 'Attirées par les facteurs de croissance de la plaque, elles fabriquent la chape fibreuse.' },
    'zat-thrombus': { t: 'Rupture et thrombose', k: 'Athérothrombose (complément)', d: 'La chape se rompt (ou l\'endothélium s\'érode) : le noyau lipidique est exposé au sang, les plaquettes adhèrent et s\'agrègent, la coagulation forme un caillot de fibrine. Le thrombus peut boucher l\'artère (infarctus du myocarde, AVC ischémique, ischémie aiguë de membre) ou emboliser en aval.' },
    'zat-remod': { t: 'Remodelage positif', k: 'Glagov (complément)', d: 'Au début, l\'artère s\'élargit vers l\'extérieur : la lumière est préservée malgré la plaque. Une plaque non sténosante peut donc se rompre : la sténose n\'est pas le seul danger.' },
    'zat-stages': { t: 'Du vaisseau sain à la sténose', k: 'Coupes transversales (Servier Medical Art)', d: 'Obstruction de la lumière de 0, 30, 65 et 90 %. Une sténose serrée réduit le débit à l\'effort (angor, claudication) ; la rupture d\'une plaque, même peu sténosante, cause les accidents aigus (complément).' },
    'zat-rf': { t: 'Facteurs de risque', k: 'Modèle illustratif', d: 'Le LDL-c vient du modèle de l\'axe (scénarios du panneau : hypercholestérolémie familiale, statine…). Tabac, HTA et diabète accélèrent la croissance de la plaque. Chez le diabétique, la macroangiopathie est plus précoce, diffuse, distale et sévère (polycopié, partie 2 p. 41).' },
    'zat-hdl': { t: 'HDL', k: 'Anti-athérogènes', d: 'Les HDL ramènent au foie le cholestérol des tissus, dont celui des macrophages de la paroi (transport inverse du cholestérol).' }
  });

  const def = HV.scene(Object.assign({
    id: 'athero', parent: 'lipid', loupe: 'Athérosclérose',
    title: 'Athérosclérose', level: 'Tissu',
    lead: 'Les LDL en excès entrent dans l\'intima, s\'y oxydent et attirent les monocytes, qui deviennent des cellules spumeuses : c\'est la strie lipidique. Un noyau lipidique se forme, recouvert par une chape fibreuse : la plaque grossit et rétrécit la lumière. Sa rupture déclenche un thrombus, cause des infarctus et des AVC. (Mécanismes en complément du polycopié.)',
    points: [
      'Les LDL causent l\'athérosclérose : l\'effet dépend du niveau de LDL-c et de la durée d\'exposition (complément ; consensus EAS, Eur Heart J 2017).',
      'Dysfonction endothéliale, rétention et oxydation des LDL, monocytes → macrophages → cellules spumeuses (complément).',
      'Noyau lipidique et chape fibreuse : une chape fine sur un gros noyau lipidique fait la plaque vulnérable (complément).',
      'Rupture ou érosion → plaquettes et fibrine → thrombus : syndrome coronarien aigu, AVC, ischémie de membre (complément).',
      'Diabète : macroangiopathie plus précoce, diffuse, distale et sévère (polycopié, partie 2 p. 41).',
      'Le LDL-c suit les scénarios du panneau (hypercholestérolémie familiale, statine, anti-PCSK9) ; tabac, HTA et diabète se cochent sur le schéma.'
    ],
    legend: new Set(['ldl', 'hdl']),
    source: 'Polycopié de sémiologie endocrinienne, CEEDMM, 2e édition (2023), partie 2 ; mécanismes : complément (consensus EAS, Ference et al., Eur Heart J 2017). Illustrations : Servier Medical Art, CC BY 4.0.',
    build(g, a) {
      a.frame('Athérosclérose', 'De la LDL à la plaque, puis au thrombus (mécanismes : complément)');
      def.sim = HV.scenes.lipid.sim;
      // Glyphes locaux : monocyte, plaquette, LDL oxydée
      if (!document.getElementById('mol-zat-mono')) {
        const defs = a.el('defs');
        const mono = a.el('g', { id: 'mol-zat-mono', class: 'zat-g mono' }, defs);
        a.el('circle', { r: 9 }, mono);
        a.path('M -4,-3 C 0,-6 5,-3 3,1 C 1,4 -4,3 -4,-3 Z', 'zat-g-n', mono);
        const plt = a.el('g', { id: 'mol-zat-plt', class: 'zat-g plt' }, defs);
        a.el('ellipse', { rx: 6, ry: 3.5 }, plt);
        const ox = a.el('g', { id: 'mol-zat-ox', class: 'zat-g ox' }, defs);
        a.el('circle', { r: 6 }, ox);
        a.el('circle', { cx: 2, cy: -2, r: 2 }, ox);
      }
      const X0 = 60, X1 = 1000, YE = 430, YI = 530, YM = 650, YA = 720, PC = 550, PW = 260;

      /* ---- Paroi artérielle en coupe longitudinale ---- */
      a.el('rect', { x: X0, y: 180, width: X1 - X0, height: YE - 180, rx: 24, class: 'zat-lumen', 'data-info': 'zat-lumen' });
      a.el('rect', { x: X0, y: YM, width: X1 - X0, height: YA - YM, class: 'zat-adv', 'data-info': 'zat-adv' });
      a.el('rect', { x: X0, y: YI, width: X1 - X0, height: YM - YI, class: 'zat-media', 'data-info': 'zat-media' });
      for (let x = X0 + 30; x < X1 - 20; x += 70) for (let r = 0; r < 2; r++) a.el('ellipse', { cx: x + (r ? 35 : 0), cy: YI + 32 + r * 52, rx: 30, ry: 8, class: 'zat-smc-cell', 'data-info': 'zat-media' });
      const intima = a.path('', 'zat-intima', null, { 'data-info': 'zat-intima' });
      a.path(`M ${X0},${YI} ` + Array.from({ length: 48 }, (_, i) => `Q ${X0 + i * 19.6 + 9.8},${YI + (i % 2 ? 5 : -5)} ${X0 + (i + 1) * 19.6},${YI}`).join(' '), 'zat-iel');
      const core = a.path('', 'zat-core', null, { 'data-info': 'zat-core' });
      const cap = a.path('', 'zat-cap', null, { 'data-info': 'zat-cap' });
      const endo = a.path('', 'zat-endo', null, { 'data-info': 'zat-endo' });
      // Cellules spumeuses (apparaissent avec la plaque)
      const FOAM = [[500, 470], [600, 474], [550, 500], [450, 492], [650, 496], [520, 445], [585, 440], [420, 470], [690, 470], [555, 455]];
      const foams = FOAM.map(([x, y]) => {
        const f = a.el('g', { class: 'zat-foam', 'data-info': 'zat-foam', transform: `translate(${x} ${y})` });
        a.el('circle', { r: 17 }, f);
        [[-6, -5, 4], [5, -6, 3.5], [-2, 5, 4.5], [7, 4, 3]].forEach(([dx, dy, r]) => a.el('circle', { cx: dx, cy: dy, r, class: 'zat-drop' }, f));
        return f;
      });
      // Thrombus (rupture)
      const thr = a.el('g', { class: 'zat-thr', 'data-info': 'zat-thrombus', visibility: 'hidden' });
      const thrPath = a.path('', 'zat-thr-clot', thr);
      const crack = a.path('', 'zat-crack', thr);
      for (let i = 0; i < 9; i++) a.el('use', { href: '#mol-zat-plt', class: 'zat-thr-plt', transform: `translate(${PC - 70 + i * 17} ${300 + (i % 3) * 18}) rotate(${i * 37})` }, thr);
      [[480, 300, 640, 340], [500, 340, 630, 290], [520, 280, 600, 350]].forEach(([x1, y1, x2, y2]) => a.el('line', { x1, y1, x2, y2, class: 'zat-fibrin' }, thr));

      // Flux : LDL et monocytes dans la lumière, entrée dans l'intima, HDL qui ressortent, cellules musculaires lisses
      const st = { P: 0, rupture: false, age: 20, demo: null, tabac: false, hta: false, diab: false };
      const ldlG = () => sim().s.ldl * 1.2; // g/L (même facteur que le bilan de l'axe)
      const injury = () => 0.5 + 0.5 * (st.tabac ? 1 : 0) + 0.4 * (st.hta ? 1 : 0) + 0.5 * (st.diab ? 1 : 0);
      a.flow(`M ${X0 + 10},250 L ${X1 - 10},250`, { mol: 'ldl', rate: () => 2.2 * ldlG(), size: 1.1, speed: 110, track: false, max: 26, info: 'zat-ldl' });
      a.flow(`M ${X0 + 10},330 L ${X1 - 10},330`, { mol: 'zat-mono', rate: () => 0.8, size: 1.1, speed: 80, track: false, max: 8, info: 'zat-mono' });
      a.flow(`M ${X0 + 10},380 L ${X1 - 10},380`, { mol: 'zat-plt', rate: () => 1.2, size: 1, speed: 120, track: false, max: 12 });
      [440, 560, 660].forEach((x, i) => {
        a.flow(`M ${x - 40},250 C ${x - 20},300 ${x},380 ${x + 6},${YE + 30}`, { mol: 'ldl', rate: () => 0.5 * ldlG() * injury(), size: 1, speed: 50, track: false, max: 6, info: 'zat-ldl' });
        a.flow(`M ${x + 6},${YE + 30} L ${x + 30},${YE + 70}`, { mol: 'zat-ox', rate: () => 0.4 * ldlG() * injury(), size: 1, speed: 25, track: false, max: 4, info: 'zat-ldl' });
      });
      [500, 620].forEach((x) => a.flow(`M ${x - 60},330 C ${x - 30},360 ${x - 10},400 ${x},${YE + 40}`, { mol: 'zat-mono', rate: () => (st.P > 0.08 ? 0.35 * injury() : 0), size: 1.1, speed: 40, track: false, max: 4, info: 'zat-mono' }));
      a.flow(`M 720,${YE + 60} C 760,${YE + 10} 800,330 860,240`, { mol: 'hdl', rate: () => 0.5, size: 1, speed: 50, track: false, max: 5, info: 'zat-hdl' });
      [470, 630].forEach((x) => a.flow(`M ${x},${YI + 60} L ${x + 10},${YE + 40}`, { mol: 'dot', style: 'fill: var(--p-red2)', rate: () => (st.P > 0.4 ? 0.8 : 0), size: 1.4, speed: 22, track: false, max: 4, info: 'zat-smc' }));

      // Étiquettes de la paroi
      a.text(X0 + 20, 214, 'lumière (sang)', 'note strong', { attrs: { 'data-info': 'zat-lumen' } });
      a.text(X0 + 20, YE + 34, 'intima', 'note strong', { attrs: { 'data-info': 'zat-intima' } });
      a.text(X0 + 20, YI + 70, 'média', 'note strong', { attrs: { 'data-info': 'zat-media' } });
      a.text(X0 + 20, YM + 44, 'adventice', 'note strong', { attrs: { 'data-info': 'zat-adv' } });
      a.text(X1 - 20, YE - 12, 'endothélium', 'note strong', { anchor: 'end', attrs: { 'data-info': 'zat-endo' } });
      const stageT = a.text(X0 + 20, 770, '', 'lbl-s strong');
      const stageD = a.text(X0 + 20, 798, '', 'note');

      /* ---- Coupes transversales (Servier) ---- */
      const SX = 1040;
      a.el('rect', { x: SX - 14, y: 160, width: 538, height: 470, rx: 22, class: 'side-box', 'data-info': 'zat-stages' });
      a.text(SX + 8, 198, 'Stades de la plaque', 'lbl-h', { attrs: { 'data-info': 'zat-stages' } });
      const STG = [['ath-cut-0', '0 %'], ['ath-cut-30', '30 %'], ['ath-cut-65', '65 %'], ['ath-cut-90', '90 %']];
      const stg = STG.map(([n, l], i) => {
        const x = SX + 12 + i * 126, y = 230;
        const gS = a.el('g', { class: 'zat-stage', 'data-info': 'zat-stages' });
        a.el('rect', { x: x - 6, y: y - 6, width: 120, height: 150, rx: 14, class: 'zat-stage-bg' }, gS);
        HV.organArt(gS, 'servier/' + n, x, y, 108, 108);
        a.text(x + 54, y + 132, l, 'note strong', { anchor: 'middle' }, gS);
        return gS;
      });
      a.text(SX + 8, 412, 'obstruction de la lumière', 'note', { attrs: { 'data-info': 'zat-stages' } });
      const thrImg = a.el('g', { 'data-info': 'zat-thrombus' });
      HV.organArt(thrImg, 'servier/ath-thrombosis', SX + 6, 432, 250, 107);
      a.text(SX + 131, 566, 'rupture : thrombus', 'note', { anchor: 'middle', attrs: { 'data-info': 'zat-thrombus' } });
      const remImg = a.el('g', { 'data-info': 'zat-remod' });
      HV.organArt(remImg, 'servier/ath-remod-pos', SX + 290, 436, 200, 102);
      a.text(SX + 390, 566, 'remodelage positif', 'note', { anchor: 'middle', attrs: { 'data-info': 'zat-remod' } });
      a.text(SX + 8, 600, 'Illustrations : Servier Medical Art, CC BY 4.0', 'note', { attrs: { 'data-info': 'zat-stages' } });

      /* ---- Facteurs de risque et temps ---- */
      const FX = 1040, FY = 650;
      a.el('rect', { x: FX - 14, y: FY, width: 538, height: 290, rx: 22, class: 'side-box', 'data-info': 'zat-rf' });
      a.text(FX + 8, FY + 38, 'Facteurs de risque', 'lbl-h', { attrs: { 'data-info': 'zat-rf' } });
      const ldlT = a.text(FX + 8, FY + 72, '', 'note strong', { attrs: { 'data-info': 'zat-rf' } });
      const tog = (k, label, x, y) => {
        const b = a.el('g', { class: 'zat-tog', transform: `translate(${x} ${y})`, 'data-info': 'zat-rf' });
        a.el('rect', { width: 160, height: 40, rx: 20 }, b);
        a.text(80, 26, label, 'zat-tog-t', { anchor: 'middle' }, b);
        b.addEventListener('pointerdown', (e) => { e.stopPropagation(); st[k] = !st[k]; });
        return [k, b];
      };
      const togs = [tog('tabac', 'Tabac', FX + 8, FY + 92), tog('hta', 'HTA', FX + 180, FY + 92), tog('diab', 'Diabète', FX + 352, FY + 92)];
      const ageT = a.text(FX + 8, FY + 172, '', 'note strong');
      a.el('rect', { x: FX + 8, y: FY + 184, width: 500, height: 14, rx: 7, class: 'lvl-bg' });
      const pBar = a.el('rect', { x: FX + 8, y: FY + 184, width: 8, height: 14, rx: 7, class: 'lvl-bar', style: '--mc: var(--p-amber)' });
      a.text(FX + 8, FY + 226, ['Croissance de la plaque : modèle illustratif, 1 an toutes les', '0,6 s de 20 à 80 ans (LDL-c × durée, accélérée par les facteurs).'], 'note', { lh: 1.3 });

      /* ---- Animation ---- */
      const STAGES = [
        [0.08, 'Artère saine', 'Endothélium intact, intima fine.'],
        [0.3, 'Strie lipidique', 'LDL oxydées et cellules spumeuses dans l\'intima.'],
        [0.55, 'Plaque fibro-lipidique', 'Noyau lipidique couvert d\'une chape fibreuse ; remodelage positif.'],
        [0.8, 'Plaque sténosante', 'La lumière se rétrécit : ischémie d\'effort possible.'],
        [9, 'Sténose serrée', 'Lumière très réduite ; risque de rupture et de thrombose.']
      ];
      let txt = 0;
      a.dyn((dt) => {
        keepAlive(dt);
        if (dt > 0 && st.demo == null) {
          st.age += dt / 0.6;
          if (st.age > 80) { st.age = 20; st.P = 0; }
          const exc = Math.max(0, ldlG() - 0.5); // pas de progression sous ≈ 0,5 g/L (illustratif)
          st.P = clamp(st.P + (dt / 0.6) * 0.012 * exc * injury() * (1 - 0.5 * st.P), 0, 1);
        } else if (st.demo != null) st.P += (st.demo - st.P) * (dt > 0 ? 1 - Math.exp(-dt * 2) : 1);
        const P = st.P;
        // Géométrie : la plaque bombe dans la lumière ; le noyau lipidique et la chape grandissent avec elle.
        const H = 175 * P, pts = [];
        for (let x = X0; x <= X1; x += 10) pts.push([x, YE - H * bump(x, PC, PW)]);
        const top = pts.map((q, i) => (i ? 'L ' : 'M ') + q[0] + ',' + q[1].toFixed(1)).join(' ');
        endo.setAttribute('d', top);
        intima.setAttribute('d', top + ` L ${X1},${YI} L ${X0},${YI} Z`);
        const cw = PW * 0.55 * clamp((P - 0.25) / 0.5, 0, 1), ch = (H + 50) * 0.55 * clamp((P - 0.25) / 0.5, 0, 1);
        const cy = YE + 40 - H * 0.45;
        core.setAttribute('d', cw > 2 ? `M ${PC - cw},${cy} C ${PC - cw},${cy - ch} ${PC + cw},${cy - ch} ${PC + cw},${cy} C ${PC + cw},${cy + ch * 0.7} ${PC - cw},${cy + ch * 0.7} ${PC - cw},${cy} Z` : '');
        const capOn = P > 0.4;
        cap.setAttribute('d', capOn ? pts.filter((q) => Math.abs(q[0] - PC) < PW * 0.75).map((q, i) => (i ? 'L ' : 'M ') + q[0] + ',' + (q[1] + 9).toFixed(1)).join(' ') : '');
        const nF = Math.round(clamp((P - 0.05) / 0.45, 0, 1) * FOAM.length);
        foams.forEach((f, i) => {
          const [x, y] = FOAM[i];
          f.setAttribute('visibility', i < nF ? 'visible' : 'hidden');
          f.setAttribute('transform', `translate(${x} ${(y - H * bump(x, PC, PW) * 0.55).toFixed(1)})`);
        });
        // Rupture : fissure de la chape et caillot dans la lumière
        thr.setAttribute('visibility', st.rupture && P > 0.3 ? 'visible' : 'hidden');
        if (st.rupture) {
          const yT = YE - H;
          thrPath.setAttribute('d', `M ${PC - 90},${yT + 8} C ${PC - 80},${yT - 90} ${PC + 70},${yT - 110} ${PC + 110},${yT + 10} Z`);
          crack.setAttribute('d', `M ${PC - 10},${yT + 2} L ${PC + 4},${yT + 22} L ${PC - 6},${yT + 36}`);
        }
        txt -= dt;
        if (txt <= 0) {
          txt = 0.25;
          const k = STAGES.findIndex((s) => P < s[0]);
          const [, t, d] = STAGES[k];
          stageT.textContent = st.rupture && P > 0.3 ? 'Rupture de plaque et thrombose' : t;
          stageD.textContent = st.rupture && P > 0.3 ? 'Le noyau lipidique exposé au sang déclenche un caillot : accident aigu.' : d;
          const si = P < 0.15 ? 0 : P < 0.45 ? 1 : P < 0.75 ? 2 : 3;
          stg.forEach((s, i) => s.classList.toggle('on', i === si));
          thrImg.setAttribute('opacity', st.rupture ? 1 : 0.35);
          remImg.setAttribute('opacity', P > 0.4 && P < 0.8 ? 1 : 0.35);
          ldlT.textContent = 'LDL-c du modèle de l\'axe : ' + f2(ldlG()) + ' g/L (scénarios du panneau)';
          togs.forEach(([k2, b]) => b.classList.toggle('on', st[k2]));
          ageT.textContent = st.demo != null ? 'Démonstration du pas à pas' : 'Âge : ' + Math.floor(st.age) + ' ans · charge en plaque ' + Math.round(P * 100) + ' %';
          pBar.setAttribute('width', (8 + 492 * P).toFixed(1));
        }
      });

      /* ---- Pas à pas ---- */
      const show = (P, rupture) => () => { st.demo = P; st.rupture = !!rupture; txt = 0; };
      def.stepEnd = () => { st.demo = null; st.rupture = false; st.P = 0; st.age = 20; txt = 0; };
      HV.spotlight(def, a, [
        { t: 'Une artère saine', d: 'Démonstration : artère saine. De la lumière vers l\'extérieur : l\'endothélium (une seule couche de cellules), l\'intima, la limitante élastique interne, la média musculaire et l\'adventice. L\'athérosclérose se joue dans l\'intima (complément).', spot: [[X0, 180, X1 - X0, 560]], go: show(0) },
        { t: 'Les LDL entrent dans la paroi', d: 'Quand l\'endothélium est agressé (LDL élevées, tabac, HTA, hyperglycémie), il devient plus perméable : les LDL passent dans l\'intima, y sont retenues et s\'oxydent. Plus le LDL-c est élevé et longtemps, plus il en entre (complément ; consensus EAS 2017).', spot: [[380, 230, 340, 300]], go: show(0.12) },
        { t: 'Les monocytes deviennent macrophages', d: 'L\'endothélium activé exprime des molécules d\'adhésion : les monocytes s\'y accrochent, passent dans l\'intima et deviennent des macrophages qui captent les LDL oxydées par des récepteurs « éboueurs », non freinés par le cholestérol (complément).', spot: [[400, 300, 300, 230]], go: show(0.22) },
        { t: 'Cellules spumeuses : la strie lipidique', d: 'Gorgés de cholestérol, les macrophages deviennent des cellules spumeuses. Leur amas forme la strie lipidique, la lésion la plus précoce, présente dès l\'adolescence et encore réversible (complément).', spot: [[380, 400, 360, 140], [1040, 220, 250, 170]], go: show(0.32) },
        { t: 'Noyau lipidique et chape fibreuse', d: 'Les cellules spumeuses meurent et forment un noyau lipidique ; des cellules musculaires lisses venues de la média fabriquent une chape fibreuse qui le recouvre. Au début, l\'artère s\'élargit vers l\'extérieur (remodelage positif) : la lumière est préservée (complément).', spot: [[300, 300, 500, 330], [1320, 425, 230, 160]], go: show(0.6) },
        { t: 'La plaque rétrécit la lumière', d: 'Quand le remodelage est dépassé, la plaque réduit la lumière : 30, 65 puis 90 % d\'obstruction. Une sténose serrée limite le débit à l\'effort : angor, claudication intermittente (complément).', spot: [[300, 200, 500, 360], [1040, 220, 510, 200]], go: show(0.95) },
        { t: 'Rupture et thrombose', d: 'Une plaque vulnérable (chape fine, gros noyau lipidique, inflammation) peut se rompre, même peu sténosante : le noyau exposé au sang active les plaquettes et la coagulation. Le thrombus bouche l\'artère ou embolise : infarctus du myocarde, AVC ischémique, ischémie aiguë de membre (complément).', spot: [[400, 220, 300, 260], [1036, 425, 270, 160]], go: show(0.6, true) },
        { t: 'Les facteurs de risque', d: 'LDL-c (lisez sa valeur : elle suit les scénarios du panneau, hypercholestérolémie familiale, statine…), tabac, HTA et diabète accélèrent la plaque. Chez le diabétique, la macroangiopathie est plus précoce, diffuse, distale et sévère (polycopié, partie 2 p. 41). Quittez le pas à pas, cochez les facteurs et regardez l\'âge défiler.', spot: [[1026, 650, 538, 290]], go: show(0.45) },
        { t: 'En résumé', d: 'LDL en excès → entrée et oxydation dans l\'intima → monocytes, macrophages, cellules spumeuses → noyau lipidique et chape fibreuse → sténose, ou rupture et thrombus. Baisser le LDL-c, arrêter le tabac, traiter l\'HTA et le diabète ralentissent ce processus (complément).', spot: [[60, 150, 1490, 800]], go: show(0.6) }
      ]);
    }
  }, HV.LOUPE.R(0)));
})();
