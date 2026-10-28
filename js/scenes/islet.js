/* Zoom de l'axe glycémique : l'îlot de Langerhans (architecture) et la cellule β (couplage glucose – insuline).
   Animé par le modèle de la régulation glycémique (axes-sim.js) : glycémie, insuline, glucagon, masse β, insulinome. */
(function () {
  'use strict';
  const HV = window.HV;
  const clamp = HV.clamp;

  Object.assign(HV.INFO, {
    'cell-beta': { t: 'Cellule β', k: '≈ 50 à 60 % de l\'îlot humain (60 à 80 % chez le rongeur, en cœur d\'îlot) (complément)', d: 'Sécrète l\'insuline (et le peptide C, l\'amyline). Détruite par l\'auto-immunité dans le diabète de type 1.' },
    'cell-alpha': { t: 'Cellule α', k: '≈ 30 à 40 % chez l\'homme, mêlée aux β ; 15 à 20 % et en périphérie chez le rongeur (complément)', d: 'Sécrète le glucagon, hyperglycémiant. Freinée par l\'insuline, le zinc et le GABA libérés par les cellules β voisines.' },
    'cell-delta': { t: 'Cellule δ', k: '5 à 10 % (complément)', d: 'Sécrète la somatostatine, qui freine localement l\'insuline et le glucagon (action paracrine).' },
    'cell-pp': { t: 'Cellule PP', k: '< 5 %, surtout dans la tête du pancréas (complément)', d: 'Sécrète le polypeptide pancréatique (satiété, sécrétion exocrine).' },
    'cell-eps': { t: 'Cellule ε', k: '< 1 % (complément)', d: 'Sécrète la ghréline, en petite quantité chez l\'adulte.' },
    acini: { t: 'Pancréas exocrine', k: 'Acini : 85 % de la masse pancréatique (SNFGE, chap. 7 p. 6)', d: 'Les acini sécrètent les enzymes digestives dans les canaux pancréatiques. Les îlots, dispersés entre eux, ne représentent qu\'environ 1 % du tissu (polycopié ; 1 à 2 % selon le SNFGE). Clic : le pancréas exocrine.' },
    'islet-cap': { t: 'Capillaires fenêtrés de l\'îlot', k: 'Drainage portal vers le foie', d: 'L\'îlot est très vascularisé. L\'insuline et le glucagon gagnent la veine porte : le foie reçoit les concentrations les plus fortes (complément).' },
    glut2: { t: 'GLUT2', k: 'Transporteur du glucose à faible affinité (complément)', d: 'Laisse entrer le glucose proportionnellement à la glycémie : la concentration intracellulaire suit la concentration plasmatique. Chez l\'homme, GLUT1 est même prédominant sur GLUT2 (complément).' },
    gk: { t: 'Glucokinase', k: 'Le « capteur de glucose » de la cellule β (complément)', d: 'Phosphoryle le glucose en glucose-6-phosphate. Non freinée par son produit, son activité suit la glycémie dans la zone physiologique. Ses mutations donnent un diabète MODY 2.' },
    mito: { t: 'Mitochondrie', k: 'Glycolyse puis cycle de Krebs', d: 'Le métabolisme du glucose augmente le rapport ATP/ADP du cytoplasme.' },
    katp: { t: 'Canal K-ATP (Kir6.2 / SUR1)', k: 'Fermé par l\'ATP · cible des sulfamides et glinides (complément)', d: 'Au repos, il laisse sortir le K⁺ et maintient la membrane à environ −70 mV. Quand l\'ATP monte, il se ferme : la membrane se dépolarise. Les sulfamides le ferment directement (risque d\'hypoglycémie) ; ses mutations activatrices donnent un diabète néonatal.' },
    cav: { t: 'Canaux calciques voltage-dépendants', k: 'Ouverts par la dépolarisation (complément)', d: 'Le calcium qui entre déclenche la fusion des granules d\'insuline avec la membrane.' },
    granules: { t: 'Granules d\'insuline', k: 'Insuline cristallisée avec le zinc, peptide C (complément)', d: 'Une petite réserve de granules amarrés à la membrane est libérée tout de suite (1re phase, en quelques minutes) ; les granules de réserve sont mobilisés ensuite (2e phase, prolongée). La 1re phase disparaît tôt dans le diabète de type 2.' },
    glp1r: { t: 'Récepteurs du GLP-1 et du GIP', k: 'Incrétines · AMPc ↑ (complément)', d: 'Les incrétines sécrétées par l\'intestin après un repas amplifient la sécrétion d\'insuline, seulement si la glycémie est élevée. Cibles des analogues du GLP-1 (et du double agoniste GIP/GLP-1) ; les inhibiteurs de la DPP-4 augmentent les incrétines endogènes.' },
    paracrine: { t: 'Dialogue paracrine', k: 'Entre cellules voisines de l\'îlot (complément)', d: 'L\'insuline, le zinc et le GABA des cellules β freinent les cellules α ; la somatostatine des cellules δ freine α et β.' },
    vm: { t: 'Potentiel de membrane', k: 'Repos ≈ −70 mV (complément)', d: 'La fermeture des canaux K-ATP dépolarise la membrane, qui génère alors des potentiels d\'action calciques.' }
  });

  // Générateur pseudo-aléatoire déterministe (même dessin à chaque chargement).
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const def = HV.scene({
    id: 'islet',
    parent: 'glyc',
    x: 1200,
    y: 560,
    scale: 0.16,
    title: 'Îlot de Langerhans',
    level: 'Tissu et cellule',
    lead: 'Environ un million d\'îlots, dispersés dans le pancréas exocrine, forment le pancréas endocrine. Chaque îlot réunit des cellules β (insuline), α (glucagon), δ (somatostatine), PP et ε. Dans la cellule β, le glucose est son propre signal : son métabolisme fait monter l\'ATP, qui ferme les canaux K-ATP ; la membrane se dépolarise, le calcium entre et les granules d\'insuline sont libérés (complément ; le polycopié décrit les cellules β et α et le 1 % du pancréas endocrine, partie 2 p. 29).',
    points: [
      'Couplage glucose – insuline : GLUT2 → glucokinase → ATP/ADP ↑ → fermeture des canaux K-ATP → dépolarisation → entrée de Ca²⁺ → exocytose (complément).',
      'Sécrétion biphasique : pic précoce (granules amarrés) puis plateau (mobilisation des réserves) ; la 1re phase est perdue tôt dans le DT2 (complément).',
      'Les incrétines (GLP-1, GIP) amplifient la sécrétion seulement en hyperglycémie : peu d\'hypoglycémies avec les analogues du GLP-1, contrairement aux sulfamides qui ferment directement le canal K-ATP (complément).',
      'Paracrinie : l\'insuline freine les cellules α voisines, la somatostatine freine α et β (complément).',
      'Changez de scénario (DT1, DT2, insulinome) ou lancez l\'HGPO dans le panneau.'
    ],
    legend: new Set(['glucose', 'insulin', 'glucagon', 'sst', 'k', 'ca']),
    build(g, a) {
      a.frame('Îlot de Langerhans', 'Pancréas endocrine · couplage glucose – insuline dans la cellule β');
      const sim = () => HV.scenes.glyc.sim;
      def.sim = HV.scenes.glyc.sim;
      const S = () => sim().s, P = () => sim().p;

      /* ================= À gauche : l'îlot dans le pancréas exocrine ================= */
      const C = [400, 575], R = 230;
      const acG = a.zoomable(a.el('g', { class: 'acini', 'data-info': 'acini' }), 'panc-exo');
      for (let k = 0; k < 34; k++) {
        const an = (k / 34) * Math.PI * 2 + rnd() * 0.12, rr = R + 70 + rnd() * 45;
        const cx = C[0] + Math.cos(an) * rr, cy = C[1] + Math.sin(an) * rr * 0.92;
        if (cy < 200 || cy > 960 || cx < 70) continue;
        a.el('circle', { cx, cy, r: 36 + rnd() * 8, class: 'acinus' }, acG);
        for (let j = 0; j < 6; j++) {
          const b = (j / 6) * Math.PI * 2;
          a.el('circle', { cx: cx + Math.cos(b) * 22, cy: cy + Math.sin(b) * 22, r: 5, class: 'acinus-n' }, acG);
        }
      }
      a.el('ellipse', { cx: C[0], cy: C[1], rx: R + 12, ry: R * 0.94 + 12, class: 'islet-caps', 'data-info': 'islet' });
      // Capillaires qui traversent l'îlot puis rejoignent la circulation portale.
      const caps = ['M 150,470 C 260,430 330,520 420,500 C 520,480 560,410 680,420 C 740,425 790,440 830,440',
        'M 160,690 C 270,720 340,620 440,650 C 540,680 590,740 690,720 C 750,708 800,690 830,690'];
      caps.forEach((d) => a.path(d, 'islet-cap', null, { 'data-info': 'islet-cap' }));
      // Cellules : cœur riche en β, couronne mixte (α, δ, PP), quelques ε.
      const cellsG = { b: a.el('g', { class: 'icells beta', 'data-info': 'cell-beta' }), a: a.el('g', { class: 'icells alpha', 'data-info': 'cell-alpha' }), d: a.el('g', { class: 'icells delta', 'data-info': 'cell-delta' }), p: a.el('g', { class: 'icells pp', 'data-info': 'cell-pp' }), e: a.el('g', { class: 'icells eps', 'data-info': 'cell-eps' }) };
      const sp = 36;
      for (let y = C[1] - R; y <= C[1] + R; y += sp * 0.87) {
        const row = Math.round((y - C[1]) / (sp * 0.87));
        for (let x = C[0] - R + (row % 2 ? sp / 2 : 0); x <= C[0] + R; x += sp) {
          const d = Math.hypot(x - C[0], (y - C[1]) / 0.94);
          if (d > R - 14) continue;
          const u = rnd(), out = d > R * 0.62;
          const t = out ? (u < 0.55 ? 'a' : u < 0.7 ? 'd' : u < 0.8 ? 'p' : 'b') : (u < 0.8 ? 'b' : u < 0.9 ? 'd' : u < 0.985 ? 'a' : 'e');
          const cg = cellsG[t];
          a.el('circle', { cx: x + (rnd() - 0.5) * 6, cy: y + (rnd() - 0.5) * 6, r: 16, class: 'icell' }, cg);
          a.el('circle', { cx: x, cy: y, r: 5.5, class: 'icell-n' }, cg);
        }
      }
      // Insulite (DT1) et insulinome
      const insul = a.el('g', { class: 'lesion', 'data-info': 'glyc.les0' });
      for (let k = 0; k < 26; k++) a.el('circle', { cx: C[0] + (rnd() - 0.5) * 300, cy: C[1] + (rnd() - 0.5) * 280, r: 7, class: 'les-lympho' }, insul);
      const tumor = a.el('g', { class: 'lesion', 'data-info': 'glyc.les1', transform: `translate(${C[0] + 120} ${C[1] - 150})` });
      a.el('circle', { r: 64, class: 'les-cap' }, tumor);
      a.el('circle', { r: 58, class: 'les-nod blue' }, tumor);
      a.text(0, 92, 'insulinome', 'les-lbl', { anchor: 'middle' }, tumor);
      a.zoomable(tumor, 'tne-insulinome');

      // Sécrétions dans les capillaires (insuline, glucagon) et paracrinie.
      a.flow(caps[0], { mol: 'insulin', rate: () => 1.6 * S().insE, pace: () => HV.paceOf(S().insE), size: 1.4, speed: 110, track: false, max: 30 });
      a.flow(caps[1], { mol: 'glucagon', rate: () => 1.4 * S().glu, pace: () => HV.paceOf(S().glu), size: 1.4, speed: 110, track: false, max: 24 });
      a.flow(caps[1], { mol: 'insulin', rate: () => 1 * S().insE, pace: () => HV.paceOf(S().insE), size: 1.4, speed: 110, track: false, max: 20 });
      a.flow('M 60,560 C 110,560 130,540 160,520', { mol: 'glucose', rate: () => 2 * S().g, size: 1.3, speed: 60, track: false });
      a.text(70, 620, 'sang artériel', 'note');
      a.text(790, 400, 'veine porte', 'note', { anchor: 'middle' });
      a.text(790, 424, '→ foie', 'note', { anchor: 'middle' });
      const par = a.el('g', { class: 'paracrine' });
      a.path('M 420,560 C 450,520 500,500 540,470', 'ax-track inhib', par, { 'data-info': 'paracrine' });
      a.sign(540, 470, 'inhib', par).set(1);
      a.flow('M 300,640 C 320,600 360,590 400,575', { mol: 'sst', rate: () => 0.8, size: 1.1, speed: 40, track: false });
      // Proportions
      const lg = a.el('g', { transform: 'translate(70 210)' });
      [['beta', 'β : insuline · ≈ 50–60 %'], ['alpha', 'α : glucagon · ≈ 30–40 %'], ['delta', 'δ : somatostatine · 5–10 %'], ['pp', 'PP : polypeptide pancréatique'], ['eps', 'ε : ghréline · < 1 %']].forEach(([k, t], i) => {
        const row = a.el('g', { class: 'icells ' + k, 'data-info': 'cell-' + (k === 'beta' ? 'beta' : k === 'alpha' ? 'alpha' : k === 'delta' ? 'delta' : k) }, lg);
        a.el('circle', { cx: 0, cy: i * 26, r: 9, class: 'icell' }, row);
        a.text(18, i * 26 + 6, t, 'note', null, row);
      });
      a.text(70, 196, 'Proportions (complément)', 'lbl-s strong');

      /* ================= À droite : la cellule β ================= */
      const X0 = 880, Y0 = 220, W = 660, H = 700;
      a.text(X0 + 30, Y0 - 18, 'Cellule β : du glucose à l\'insuline', 'lbl-h');
      const cell = a.el('rect', { x: X0, y: Y0, width: W, height: H, rx: 90, class: 'bcell', 'data-info': 'cell-beta' });
      a.el('ellipse', { cx: X0 + 470, cy: Y0 + 520, rx: 70, ry: 56, class: 'bcell-n' });
      // 1. GLUT2 et glucokinase
      const glut = a.el('g', { 'data-info': 'glut2', transform: `translate(${X0} ${Y0 + 130})` });
      a.el('rect', { x: -14, y: -26, width: 28, height: 52, rx: 8, class: 'chan' }, glut);
      a.el('rect', { x: -4, y: -26, width: 8, height: 52, class: 'chan-pore' }, glut);
      a.text(0, -40, 'GLUT2', 'chan-t', { anchor: 'middle' }, glut);
      a.flow(`M ${X0 - 90},${Y0 + 130} L ${X0 + 140},${Y0 + 130}`, { mol: 'glucose', rate: () => 2.2 * S().g, pace: () => HV.paceOf(S().g), size: 1.4, speed: 70, track: false });
      const gk = a.el('g', { 'data-info': 'gk' });
      a.el('rect', { x: X0 + 140, y: Y0 + 106, width: 170, height: 48, rx: 24, class: 'enz' }, gk);
      a.text(X0 + 225, Y0 + 137, 'glucokinase', 'note strong', { anchor: 'middle' }, gk);
      a.text(X0 + 225, Y0 + 178, 'glucose-6-P → glycolyse', 'note', { anchor: 'middle' });
      // 2. Mitochondrie : ATP/ADP
      const mito = a.el('g', { 'data-info': 'mito', transform: `translate(${X0 + 230} ${Y0 + 290})` });
      a.el('ellipse', { rx: 95, ry: 46, class: 'mito' }, mito);
      a.path('M -70,0 C -50,-30 -30,30 -10,0 C 10,-30 30,30 50,0 C 60,-15 70,-10 76,0', 'mito-cr', mito);
      a.flow(`M ${X0 + 225},${Y0 + 160} L ${X0 + 225},${Y0 + 240}`, { mol: 'dot', style: 'fill: var(--p-lime)', rate: () => 2 * S().g, size: 1, speed: 50, track: false });
      const atpT = a.text(X0 + 230, Y0 + 372, '', 'lbl-s strong', { anchor: 'middle' });
      const atpBar = a.el('rect', { x: X0 + 150, y: Y0 + 384, width: 10, height: 12, rx: 6, class: 'lvl-bar', style: '--mc: var(--p-gold)' });
      a.el('rect', { x: X0 + 150, y: Y0 + 384, width: 160, height: 12, rx: 6, class: 'lvl-bg', 'fill-opacity': 0.4 });
      // 3. Canal K-ATP (membrane du haut)
      const kx = X0 + 540, ky = Y0;
      const katp = a.el('g', { 'data-info': 'katp', transform: `translate(${kx} ${ky})` });
      const kL = a.el('rect', { x: -30, y: -28, width: 26, height: 56, rx: 8, class: 'chan' }, katp);
      const kR = a.el('rect', { x: 4, y: -28, width: 26, height: 56, rx: 8, class: 'chan' }, katp);
      a.text(0, -42, 'canal K-ATP', 'chan-t', { anchor: 'middle' }, katp);
      a.text(0, 64, 'sulfamides : fermeture directe', 'note', { anchor: 'middle' }, katp);
      a.path(`M ${X0 + 300},${Y0 + 260} C ${X0 + 360},${Y0 + 200} ${kx - 30},${ky + 90} ${kx - 8},${ky + 36}`, 'ax-track inhib', null, { 'data-info': 'katp' });
      a.sign(kx - 8, ky + 40, 'inhib').set(1);
      const kFlow = a.flow(`M ${kx},${ky + 30} L ${kx},${ky - 90}`, { mol: 'k', rate: () => 3 * kOpen, size: 1.3, speed: 60, track: false });
      // 4. Potentiel de membrane
      const vmG = a.el('g', { 'data-info': 'vm', transform: `translate(${X0 + 470} ${Y0 + 160})` });
      a.el('rect', { x: 0, y: 0, width: 150, height: 74, rx: 14, class: 'side-box' }, vmG);
      a.text(75, 26, 'potentiel', 'note', { anchor: 'middle' }, vmG);
      const vmT = a.text(75, 56, '', 'sig-val', { anchor: 'middle' }, vmG);
      // 5. Canal calcique (membrane de droite)
      const cx2 = X0 + W, cy2 = Y0 + 330;
      const cav = a.el('g', { 'data-info': 'cav', transform: `translate(${cx2} ${cy2})` });
      a.el('rect', { x: -28, y: -14, width: 56, height: 28, rx: 8, class: 'chan' }, cav);
      const cavPore = a.el('rect', { x: -28, y: -4, width: 56, height: 8, class: 'chan-pore' }, cav);
      a.text(-40, -24, 'canal Ca²⁺', 'chan-t', { anchor: 'end' }, cav);
      a.text(-40, 0, 'voltage-dépendant', 'note', { anchor: 'end' }, cav);
      a.flow(`M ${cx2 + 90},${cy2} L ${cx2 - 160},${cy2 + 120}`, { mol: 'ca', rate: () => 4 * caOpen, size: 1.4, speed: 70, track: false });
      // 6. Granules et exocytose
      const gran = a.el('g', { 'data-info': 'granules' });
      for (let k = 0; k < 46; k++) {
        const gx = X0 + 110 + rnd() * 300, gy = Y0 + 470 + rnd() * 190;
        a.el('circle', { cx: gx, cy: gy, r: 9, class: 'gran' }, gran);
        a.el('circle', { cx: gx, cy: gy, r: 4, class: 'gran-c' }, gran);
      }
      for (let k = 0; k < 9; k++) {
        const gx = X0 + 140 + k * 34;
        a.el('circle', { cx: gx, cy: Y0 + H - 22, r: 9, class: 'gran docked' }, gran);
      }
      a.text(X0 + 260, Y0 + 446, 'granules d\'insuline', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'granules' } });
      a.text(X0 + 260, Y0 + H + 40, '1re phase : granules amarrés · 2e phase : réserves mobilisées', 'note', { anchor: 'middle' });
      a.path(`M ${X0 + 60},${Y0 + H + 70} L ${X0 + W - 60},${Y0 + H + 70}`, 'islet-cap', null, { 'data-info': 'islet-cap' });
      [0, 1, 2, 3].forEach((k) => a.flow(`M ${X0 + 160 + k * 70},${Y0 + H - 30} L ${X0 + 180 + k * 70},${Y0 + H + 66}`, { mol: 'insulin', rate: () => 0.9 * S().insE, pace: () => HV.paceOf(S().insE), size: 1.3, speed: 45, track: false, max: 8 }));
      // 7. Incrétines
      const glp = a.el('g', { 'data-info': 'glp1r', transform: `translate(${X0} ${Y0 + 560})` });
      a.el('path', { d: 'M -8,-30 L -8,30 M 8,-30 L 8,30', class: 'm-recep' }, glp);
      a.el('rect', { x: -16, y: -34, width: 32, height: 68, rx: 10, class: 'chan' }, glp);
      a.text(-24, -46, 'GLP-1, GIP', 'chan-t', { anchor: 'end' }, glp);
      a.text(-24, -22, '(intestin, repas)', 'note', { anchor: 'end' }, glp);
      a.text(30, 6, 'AMPc ↑ : amplifie', 'note', null, glp);
      a.text(30, 28, 'si glycémie haute', 'note', null, glp);
      // Bandeau d'état
      const state = a.text(X0 + W / 2, Y0 + H + 110, '', 'lbl-s strong', { anchor: 'middle' });

      let kOpen = 1, caOpen = 0, txt = 0;
      a.dyn((dt) => {
        // La scène de l'axe est masquée quand on est dans l'îlot : on fait avancer le modèle ici.
        if (dt > 0 && !(HV.scenes.glyc._op > 0)) { const M = sim(); M.T.h = (M.T.h + dt * 0.5) % 24; M.step(dt, M.T); }
        const s = S(), p = P();
        const atp = clamp((s.g - 0.5) / 1.1, 0, 1);
        kOpen = clamp(1 - Math.pow(atp, 1.3) * 1.25, 0, 1);
        if (p.tumor > 0.02) kOpen = Math.min(kOpen, 0.15); // insulinome : sécrétion autonome
        caOpen = clamp((0.7 - kOpen) / 0.7, 0, 1);
        const gap = 2 + 10 * kOpen;
        kL.setAttribute('x', -26 - gap); kR.setAttribute('x', gap);
        cavPore.setAttribute('opacity', (0.15 + 0.85 * caOpen).toFixed(2));
        atpBar.setAttribute('width', (10 + 150 * atp).toFixed(0));
        const beta = clamp(p.beta, 0, 1.2);
        cellsG.b.setAttribute('opacity', (0.15 + 0.85 * Math.min(1, beta)).toFixed(2));
        cell.setAttribute('opacity', (0.35 + 0.65 * Math.min(1, beta)).toFixed(2));
        gran.setAttribute('opacity', (0.1 + 0.9 * Math.min(1, beta + p.tumor)).toFixed(2));
        insul.setAttribute('opacity', p.beta < 0.1 ? 1 : 0); // insulite : DT1 seulement (pas le DT2)
        tumor.setAttribute('opacity', p.tumor > 0.02 ? 1 : 0);
        txt -= dt;
        if (txt <= 0) {
          txt = 0.3;
          atpT.textContent = 'ATP/ADP ' + (atp > 0.55 ? '↑↑' : atp > 0.25 ? '↑' : 'bas');
          vmT.textContent = Math.round(-70 + 30 * caOpen) + ' mV';
          state.textContent = p.beta < 0.3 ? (p.exo > 0.05 ? 'Cellules β détruites : seule l\'insuline injectée agit, sans s\'adapter à la glycémie' : 'Cellules β détruites : plus d\'insuline malgré l\'hyperglycémie (DT1)')
            : p.tumor > 0.02 ? 'Insulinome : sécrétion autonome, même quand la glycémie est basse'
              : 'Glycémie ' + s.g.toFixed(2).replace('.', ',') + ' g/L → ' + (caOpen > 0.5 ? 'canaux K-ATP fermés, insuline sécrétée' : caOpen > 0.15 ? 'sécrétion modérée' : 'canaux K-ATP ouverts, sécrétion basale');
        }
      });

      /* --- Pas à pas --- */
      HV.spotlight(def, a, [
        { t: 'Un îlot dans le pancréas exocrine', d: 'Les îlots ne pèsent qu\'environ 1 % du pancréas. Chaque îlot réunit surtout des cellules β (insuline), des cellules α (glucagon) et des cellules δ (somatostatine), autour de capillaires fenêtrés qui se drainent vers la veine porte.', spot: [[400, 575, 300]] },
        { t: 'Le glucose entre dans la cellule β', d: 'GLUT2 laisse entrer le glucose proportionnellement à la glycémie. La glucokinase, le « capteur », le phosphoryle à une vitesse qui suit la glycémie.', spot: [[X0 - 100, Y0 + 70, 430, 140]] },
        { t: 'L\'ATP monte', d: 'Glycolyse et mitochondrie augmentent le rapport ATP/ADP dans le cytoplasme.', spot: [[X0 + 230, Y0 + 320, 130]] },
        { t: 'Les canaux K-ATP se ferment', d: 'L\'ATP ferme les canaux K-ATP : le potassium ne sort plus, la membrane se dépolarise (de −70 vers −40 mV). Les sulfamides ferment ces canaux directement, même si la glycémie est basse : c\'est le mécanisme de leurs hypoglycémies.', spot: [[kx, ky + 10, 120], [X0 + 545, Y0 + 197, 100]] },
        { t: 'Le calcium entre', d: 'La dépolarisation ouvre les canaux calciques voltage-dépendants : le Ca²⁺ entre dans la cellule.', spot: [[cx2 - 40, cy2 + 40, 140]] },
        { t: 'Les granules d\'insuline fusionnent', d: 'Le calcium déclenche l\'exocytose : d\'abord les granules amarrés à la membrane (1re phase), puis les réserves (2e phase). L\'insuline gagne les capillaires puis la veine porte.', spot: [[X0 + 60, Y0 + 440, 440, 360]] },
        { t: 'Les incrétines amplifient', d: 'Après un repas, le GLP-1 et le GIP de l\'intestin augmentent l\'AMPc et amplifient la sécrétion, mais seulement si la glycémie est élevée. Cible des analogues du GLP-1 et des inhibiteurs de la DPP-4.', spot: [[X0 - 60, Y0 + 560, 110]] },
        { t: 'Les voisines se parlent', d: 'L\'insuline, le zinc et le GABA freinent les cellules α ; la somatostatine des cellules δ freine α et β. Dans le DT1, la perte des cellules β lève ce frein : le glucagon reste inadapté.', spot: [[470, 560, 170], [250, 660, 90]] }
      ]);
    }
  });
})();
