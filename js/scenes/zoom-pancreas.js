/* Loupes du module pancréas : pancréas exocrine, pancréatites, hormones digestives, classification des TNE
   et un modèle physiopathologique par TNE fonctionnelle (gastrinome, insulinome, glucagonome, VIPome,
   somatostatinome). Toutes lisent le modèle commun « pancreas » (pancreas.js).
   Sources : SNFGE, Les fondamentaux de la pathologie digestive, chap. 7 (2014, « SNFGE p. ») ; CEEDMM/SFE,
   item 308 (2022, « SFE ») ; TNCD chap. 11 (07/09/2026, « TNCD p. »). Le reste est marqué « (complément) ». */
(function () {
  'use strict';
  const HV = window.HV;
  const clamp = HV.clamp;
  const PANC = HV.PANC, sim = PANC.sim, S = sim.s;
  const f1 = (v) => v.toFixed(1).replace('.', ',');
  const f2 = (v) => v.toFixed(2).replace('.', ',');
  const n0 = (v) => Math.round(v).toLocaleString('fr-FR');
  const SRC_TNE = 'Sources : TNCD, chapitre 11 « Néoplasies neuroendocrines digestives » (07/09/2026, pages citées « TNCD p. ») ; CEEDMM / SFE, item 308 « Tumeurs neuroendocrines du pancréas » (2022) ; SNFGE, Les fondamentaux de la pathologie digestive, chap. 7. Le reste est marqué « complément ».';
  const SRC_EXO = 'Source : Les fondamentaux de la pathologie digestive (CDU-HGE, SNFGE), chapitre 7 « Pancréas », octobre 2014 (pages citées « SNFGE p. »). Le reste est marqué « complément ».';

  /* ---------- Outils communs ---------- */
  const COL = (k) => ({ parent: 'pancreas', x: 1680, y: k * 205, scale: 0.15 });
  const COL2 = (k) => ({ parent: 'pancreas', x: 1960, y: k * 205, scale: 0.15 });
  const wrap = (str, n) => {
    const out = [];
    let cur = '';
    str.split(' ').forEach((w) => { if (cur && (cur + ' ' + w).length > n) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; });
    if (cur) out.push(cur);
    return out;
  };
  // Encadré titré avec une liste de lignes (chaque entrée est repliée à `n` caractères). Renvoie la hauteur.
  function card(a, x, y, w, title, items, o) {
    o = o || {};
    const g = a.el('g', { 'data-info': o.info || null, style: o.color ? `--c: var(--${o.color})` : null }, o.parent);
    const n = Math.min(o.n || 999, Math.floor((w - 36) / 8.3));
    const lines = [];
    items.forEach((it) => wrap(it, n - 2).forEach((ln, i) => lines.push((i ? '   ' : '• ') + ln)));
    const h = o.h || 52 + lines.length * 21 + 10;
    a.el('rect', { x, y, width: w, height: h, rx: 14, class: 'pz-box' }, g);
    a.text(x + 16, y + 30, title, 'pz-h', null, g);
    if (lines.length) a.text(x + 16, y + 58, lines, 'pz-li', { lh: 1.36 }, g);
    return h;
  }
  // Bouton de scénario (pointerdown : le clic ne doit ni déplacer la caméra ni zoomer).
  function scenBtn(a, x, y, w, label, id, parent) {
    const g = a.el('g', { class: 'pz-btn', transform: `translate(${x} ${y})` }, parent);
    a.el('rect', { width: w, height: 38, rx: 19 }, g);
    a.text(w / 2, 25, label, 'pz-btn-t', { anchor: 'middle' }, g);
    g.addEventListener('pointerdown', (e) => { e.stopPropagation(); PANC.play(id); });
    a.dyn(() => { const on = sim.active === id; if (g._on !== on) { g._on = on; g.classList.toggle('on', on); } });
    return g;
  }
  // Pastille de navigation vers une autre scène.
  function zoomPill(a, x, y, w, label, id) {
    const g = a.el('g', { transform: `translate(${x} ${y})` });
    a.el('rect', { width: w, height: 34, rx: 17, class: 'pz-pill' }, g);
    a.text(w / 2, 23, label, 'pz-pill-t', { anchor: 'middle' }, g);
    a.zoomable(g, id);
    return g;
  }
  // Valeur de bilan en direct.
  function labLine(a, x, y, key, label, parent) {
    const L = sim.LABS.find((q) => q.key === key);
    a.text(x, y, label, 'pz-s', null, parent);
    const t = a.text(x, y + 22, '', 'pz-v', null, parent);
    a.dyn(() => {
      const v = sim.lab(key);
      const txt = (L.dec === 2 ? f2(v) : L.dec === 1 ? f1(v) : n0(v)) + ' ' + L.unit + (v > L.hi ? ' ↑' : v < L.lo ? ' ↓' : '');
      if (t._t !== txt) { t._t = txt; t.textContent = txt; t.classList.toggle('hi', v > L.hi); t.classList.toggle('lo', v < L.lo); }
    });
    return t;
  }
  // Mini-carte : estomac, duodénum, pancréas (tracés de la scène principale, réduits).
  function siteMap(a, x, y, s, marks, extra) {
    const g = a.el('g', { transform: `translate(${x} ${y}) scale(${s})`, 'data-info': 'pz-panc' });
    a.path('M 800,170 C 830,160 900,170 930,215 C 965,270 960,360 905,420 C 850,478 740,495 660,485 C 620,480 595,470 585,455 L 590,425 C 640,440 700,438 760,410 C 810,385 820,330 812,280 C 806,240 790,210 785,180 Z', 'pz-stomach', g);
    const duoD = 'M 588,445 C 540,442 480,440 452,470 C 432,495 430,560 432,640 C 434,700 440,740 480,752 C 560,770 690,770 760,745 C 790,732 800,700 795,670';
    a.path(duoD, 'pz-gut', g);
    a.path(duoD, 'pz-gut-l', g);
    const pz = a.path('M 478,575 C 480,540 525,532 565,548 C 650,568 780,532 900,512 C 985,498 1055,470 1092,488 C 1112,500 1098,530 1062,542 C 985,566 905,580 805,596 C 705,612 630,616 608,642 C 592,690 566,718 528,714 C 490,710 474,680 476,640 Z', 'pz-panc', g);
    // Dessins Servier (kit Digestive system) sur l'estomac et le pancréas
    HV.dressArt(g.firstChild, 'servier/dig-stomach', 10);
    HV.dressArt(pz, 'servier/dig-pancreas-duct', 18);
    a.path('M 1070,505 C 950,528 800,560 650,588 C 560,604 500,600 452,612', 'pz-duct', g);
    a.path('M 380,420 C 410,470 432,530 452,612', 'pz-bile', g);
    if (extra) extra(g);
    (marks || []).forEach(([mx, my, r]) => {
      a.el('circle', { cx: mx, cy: my, r: (r || 18) + 12, class: 'pz-mark-halo' }, g);
      a.el('circle', { cx: mx, cy: my, r: r || 18, class: 'pz-mark' }, g);
    });
    return g;
  }

  /* =====================================================================
     Modèle d'une TNE fonctionnelle
     ===================================================================== */
  function tne(c) {
    Object.assign(HV.INFO, c.info || {});
    const def = HV.scene(Object.assign({
      id: c.id, loupe: c.loupe, title: c.title, level: 'Physiopathologie', lead: c.lead, points: c.points, source: SRC_TNE,
      legend: new Set(c.legend),
      build(g, a) {
        def.sim = sim;
        a.frame(c.title, c.sub);
        a.dyn(PANC.keepAlive);
        /* Colonne gauche : siège et carte d'identité */
        a.text(60, 186, 'Siège', 'lbl-s strong');
        siteMap(a, -160, 100, 0.52, c.site, c.siteExtra);
        a.text(60, 505, c.siteLabel, 'pz-s', { lh: 1.3 });
        card(a, 60, 580, 410, 'Carte d\'identité', c.facts, { color: 'p-grey' });
        /* Centre : cellule tumorale → hormone → cibles */
        const TX = 585, TY = 560;
        const tg = a.el('g', { 'data-info': c.id + '-cell' });
        a.el('circle', { cx: TX, cy: TY, r: 78, class: 'pz-tumcell' }, tg);
        a.el('circle', { cx: TX - 8, cy: TY + 6, r: 24, class: 'pz-nuc' }, tg);
        for (let i = 0; i < 16; i++) {
          const an = i * 2.4, rr = 40 + (i % 3) * 10;
          a.el('circle', { cx: TX + Math.cos(an) * rr, cy: TY + Math.sin(an) * rr, r: 5, class: 'pz-tumcell-n' }, tg);
        }
        a.text(TX - 45, TY - 100, c.cell, 'pz-t', { anchor: 'middle' }, tg);
        a.text(TX - 30, TY + 112, c.cellSub, 'pz-s', { anchor: 'middle', lh: 1.25 }, tg);
        const n = c.targets.length, top = 170, bot = 960, gap = 14, h = (bot - top - gap * (n - 1)) / n;
        c.targets.forEach((t, i) => {
          const y = top + i * (h + gap), x = 770, w = 330;
          Object.assign(HV.INFO, { [c.id + '-t' + i]: { t: t.t, k: t.k || '', d: t.d } });
          const bg = a.el('g', { 'data-info': c.id + '-t' + i, style: `--c: var(--${t.color || 'p-red'})` });
          const box = a.el('rect', { x, y, width: w, height: h, rx: 14, class: 'pz-box' }, bg);
          a.text(x + 16, y + 28, t.t, 'pz-t', null, bg);
          // Illustration Servier de l'organe cible, en haut à droite de la carte (le texte se resserre).
          if (t.img) { const sz = Math.min(68, h - 30); HV.organArt(bg, t.img, x + w - sz - 8, y + 34, sz, sz); }
          const room = Math.max(1, Math.floor((h - 78) / 19));
          const eL = wrap(t.e, t.img ? 31 : 40), dL = wrap(t.d, t.img ? 35 : 41);
          const cut = (L, k) => (L.length > k ? L.slice(0, k - 1).concat([L[k - 1] + '…']) : L);
          a.text(x + 16, y + 52, cut(eL, room), 'pz-tab', { lh: 1.25 }, bg);
          if (room > eL.length + 1) a.text(x + 16, y + 52 + (eL.length + 0.4) * 19, cut(dL, room - eL.length - 1), 'pz-s', { lh: 1.25 }, bg);
          const v = a.text(x + w - 14, y + h - 14, '', 'pz-v', { anchor: 'end' }, bg);
          const d = `M ${TX + 80},${TY + (y + h / 2 - TY) * 0.3} C ${TX + 130},${y + h / 2} ${x - 60},${y + h / 2} ${x - 6},${y + h / 2}`;
          a.path(d, 'ax-track ' + (t.kind || 'stim'), null, { style: `--mc: var(--${c.color})` });
          a.flow(d, { mol: c.mol, rate: () => 0.5 * clamp(c.rate(), 0.2, 12), track: false, speed: 80, size: 1.2, max: 22 });
          a.dyn(() => {
            const r = t.live ? t.live() : null;
            if (!r) return;
            if (v._t !== r[0]) { v._t = r[0]; v.textContent = r[0]; }
            const hot = !!r[1];
            if (box._h !== hot) { box._h = hot; box.classList.toggle('hot', hot); v.classList.toggle('hi', hot); }
          });
        });
        /* Colonne droite : diagnostic, traitement, bilan, scénarios */
        const h1 = card(a, 1125, 170, 435, 'Diagnostic', c.diag, { color: 'p-blue', n: 55 });
        const y2 = 170 + h1 + 14;
        const h2 = card(a, 1125, y2, 435, 'Traitement', c.ttt, { color: 'p-green', n: 55 });
        const y3 = y2 + h2 + 14;
        const bil = a.el('g');
        a.el('rect', { x: 1125, y: y3, width: 435, height: 960 - y3, rx: 14, class: 'sr-note-bg' }, bil);
        a.text(1141, y3 + 28, 'Bilan simulé', 'pz-h', null, bil);
        c.labs.forEach(([k, lbl], i) => labLine(a, 1141 + (i % 2) * 210, y3 + 58 + Math.floor(i / 2) * 52, k, lbl, bil));
        const by = y3 + 58 + Math.ceil(c.labs.length / 2) * 52 + 4;
        c.scen.forEach(([lbl, id], i) => scenBtn(a, 1141 + (i % 2) * 206, by + Math.floor(i / 2) * 46, 196, lbl, id));
        if (c.draw) c.draw(a);
        if (c.steps) HV.spotlight(def, a, c.steps);
      }
    }, c.pos));
    return def;
  }

  /* ---------- Gastrinome ---------- */
  tne({
    id: 'tne-gastrinome', pos: COL2(0), loupe: 'Gastrinome', title: 'Gastrinome · syndrome de Zollinger-Ellison', color: 'p-red2', mol: 'gastrin',
    sub: 'Gastrine autonome → hypersécrétion acide → ulcères et diarrhée',
    lead: 'Le gastrinome, TNE généralement duodénale, parfois pancréatique, sécrète la gastrine sans tenir compte de l\'acidité. Les cellules pariétales, stimulées en permanence, produisent un excès d\'acide : ulcères multiples, œsophagite sévère, diarrhée (TNCD p. 5-6). Les IPP, à ne jamais arrêter, préviennent des complications potentiellement mortelles.',
    points: ['Ulcères œso-gastro-duodénaux récidivants, diarrhée résolutive sous IPP (SFE).', 'Gastrinémie à jeun > 3 N, ou > 10 N sous IPP (dont l\'arrêt est contre-indiqué), avec pH gastrique ≤ 2 (TNCD p. 6).', 'Test à la sécrétine, si disponible : augmentation de la gastrine ≥ 120 pg/mL (TNCD p. 6).', 'Haut risque de malignité (60 à 80 %) ; NEM 1 dans environ 25 % des cas (TNCD p. 5 et 14).', 'Traitement : IPP 40 à 60 mg deux fois par jour d\'équivalent oméprazole, au long cours (TNCD p. 18).'],
    legend: ['gastrin', 'hplus', 'secretin'],
    rate: () => S.gastrin,
    cell: 'Cellules G tumorales', cellSub: ['gastrine sans rétrocontrôle', 'par l\'acidité'],
    site: [[452, 520, 16], [445, 600, 12], [620, 600, 14]],
    siteExtra: (g) => HV.el('path', { d: 'M 380,420 L 470,760 L 620,600 Z', class: 'connector', 'stroke-width': 4 }, g),
    siteLabel: ['Duodénum (bulbe, D2) surtout, parfois pancréas ;', 'pointillés : « triangle des gastrinomes »', '(complément).'],
    facts: ['TNE généralement duodénale, voire pancréatique, ou ganglionnaire sans primitif identifié (TNCD p. 5).', 'Haut risque de malignité : 60 à 80 % (TNCD p. 5).', 'NEM 1 : environ 25 % des gastrinomes ; gastrinomes duodénaux souvent petits et multiples (TNCD p. 14).', 'Gastrine trophique : gros plis gastriques, TNE fundiques de type 2 (TNCD p. 6 et 9).'],
    targets: [
      { img: 'servier/dig-parietal-cell', t: 'Cellules pariétales', e: 'Sécrétion acide maximale et permanente ; pH gastrique ≤ 2', d: 'La gastrine stimule les cellules pariétales directement et via l\'histamine des cellules ECL (complément). Le débit acide basal est élevé (SFE).', color: 'p-red', live: () => { const v = sim.lab('ph'); return ['pH ' + f1(v), v <= 2]; } },
      { img: 'servier/dig-stomach-wall', t: 'Muqueuse fundique', e: 'Hyperplasie : gros plis gastriques ; TNE fundiques de type 2 (ECLomes)', d: 'Effet trophique de la gastrine sur la muqueuse fundique et les cellules ECL (TNCD p. 9). Toute hypergastrinémie élève aussi la chromogranine A (TNCD p. 12).', color: 'p-rose', live: () => { const v = sim.lab('cga'); return ['CgA × ' + f1(v), v > 1.3]; } },
      { img: 'servier/dig-ulcer', t: 'Œsophage, estomac, duodénum', e: 'Ulcères multiples, œsophagite sévère ; hémorragie, perforation', d: 'Complications peptiques potentiellement graves voire mortelles, à prévenir par IPP dès que le diagnostic est évoqué (TNCD p. 5-6).', color: 'p-red2', live: () => [S.acid > 2.5 ? 'ulcères' : 'muqueuse saine', S.acid > 2.5] },
      { img: 'servier/dig-small-intestine', t: 'Intestin grêle', e: 'Diarrhée sécrétoire et volumique ; lipase inactivée par l\'acide', d: 'Le volume de sécrétion acide déborde la réabsorption ; le pH duodénal bas inactive la lipase (complément). Déshydratation, hypokaliémie possibles (TNCD p. 5).', color: 'p-amber', live: () => { const v = sim.lab('stool'); return [f1(v) + ' L/24 h', v > 0.3]; } }
    ],
    diag: ['Gastrinémie à jeun > 3 N avec pH gastrique ≤ 2 ; sous IPP, > 10 N suffit : ne pas les arrêter (TNCD p. 6).', 'Test à la sécrétine en centre expert : gastrine ≥ 120 pg/mL au-dessus de la base (TNCD p. 6 et 14).', 'Endoscopie : œsophagite, ulcères, gastrinomes duodénaux (bulbe, D2), gros plis (TNCD p. 9).', 'Localisation : scanner, IRM, échoendoscopie, TEP au 68Ga-DOTATOC ; calcémie, PTH (NEM 1).'],
    ttt: ['IPP 40 à 60 mg × 2/j d\'équivalent oméprazole, adaptés aux symptômes, sans dose maximale, jamais interrompus (TNCD p. 18).', 'Chirurgie en RCP RENATEN : duodénotomie avec curage ou duodénopancréatectomie (TNCD p. 22) ; bénéfice débattu dans la NEM 1.', 'Options : anti-H2, analogues de la somatostatine, traitements antitumoraux (TNCD p. 18).'],
    labs: [['gastrin', 'Gastrine'], ['ph', 'pH gastrique'], ['stool', 'Selles'], ['cga', 'Chromogranine A']],
    scen: [['Gastrinome', 'gastrinome'], ['Sous IPP', 'gastrinomeT'], ['Piège : IPP seuls', 'ipp'], ['Sujet sain', 'eu']],
    info: { 'tne-gastrinome-cell': { t: 'Gastrinome', k: 'Cellules G tumorales', d: 'La gastrine tumorale n\'est plus freinée par l\'acidité ni par la somatostatine ; la sécrétine la stimule paradoxalement (test à la sécrétine).' } },
    steps: [
      { t: 'Une gastrine sans frein', d: 'Normalement, l\'acidité de l\'antre freine les cellules G. Le gastrinome, souvent duodénal, ignore ce rétrocontrôle.', spot: [[600, 560, 130], [250, 380, 200]] },
      { t: 'L\'estomac sécrète au maximum', d: 'Les cellules pariétales sont stimulées en permanence : pH ≤ 2, gros plis, TNE fundiques possibles (TNCD p. 6 et 9).', spot: [[935, 260, 190]] },
      { t: 'Ulcères et diarrhée', d: 'Ulcères multiples ou récidivants, œsophagite, hémorragie ou perforation ; diarrhée résolutive sous IPP (SFE).', spot: [[935, 660, 230]] },
      { t: 'Diagnostic et traitement', d: 'Gastrine > 3 N avec pH ≤ 2. Les IPP, à forte dose, ne doivent jamais être arrêtés. Testez le piège : un sujet sain sous IPP a aussi une gastrine élevée.', spot: [[1342, 500, 300]] }
    ]
  });

  /* ---------- Insulinome ---------- */
  tne({
    id: 'tne-insulinome', pos: COL2(1), loupe: 'Insulinome', title: 'Insulinome · hypoglycémie organique', color: 'p-blue2', mol: 'insulin',
    sub: 'Insuline autonome → production hépatique freinée → hypoglycémies de jeûne',
    lead: 'L\'insulinome est la TNE pancréatique fonctionnelle la plus fréquente, le plus souvent petite et de très faible risque évolutif. L\'insuline (ou la proinsuline) n\'est plus freinée quand la glycémie baisse : le foie ne produit plus assez de glucose et les hypoglycémies surviennent au jeûne (TNCD p. 5-6). Le modèle détaillé de la cellule β et l\'épreuve de jeûne sont aussi dans l\'axe glycémique.',
    points: ['Symptômes adrénergiques (faim, sueurs, tremblements, palpitations) et neuroglucopéniques (confusion, troubles visuels, convulsions, coma) ; aggravés par le jeûne, prise de poids (TNCD p. 6).', 'Glycémie < 0,45 g/L avec insuline ≥ 3 mU/L, proinsuline ≥ 5 pmol/L, peptide C élevé ; sulfamides et glinides négatifs (TNCD p. 6 et 13).', 'Formes métastatiques < 5 % (TNCD p. 5) ; NEM 1 dans 5 à 10 % des cas (TNCD p. 14).', 'Traitement : fractionnement des repas, diazoxide, chirurgie limitée (énucléation) ; radiofréquence sous échoendoscopie en centre expert (TNCD p. 19).'],
    legend: ['insulin', 'glucose', 'glucagon'],
    rate: () => S.ins,
    cell: 'Cellules β tumorales', cellSub: ['insuline non freinée', 'par l\'hypoglycémie'],
    site: [[700, 600, 16]],
    siteLabel: ['Pancréas, réparti dans toute la glande ;', 'petite tumeur le plus souvent (complément).'],
    facts: ['TNE pancréatique fonctionnelle la plus fréquente (TNCD p. 5).', 'Le plus souvent petite, de très faible risque évolutif : < 5 % de formes métastatiques (TNCD p. 5).', 'NEM 1 : 5 à 10 % des insulinomes ; dans la NEM 1, la TEP au 68Ga-exendine aide à repérer l\'insulinome parmi plusieurs TNE (TNCD p. 8 et 14).', 'Hypoglycémie à prévenir dès que le diagnostic est évoqué.'],
    targets: [
      { img: 'servier/dig-liver', t: 'Foie', e: 'Glycogénolyse et néoglucogenèse freinées : la glycémie chute au jeûne', d: 'L\'insuline inhibe la production hépatique de glucose (SNFGE p. 11) ; le glucagon de contre-régulation ne suffit plus.', color: 'p-lime', live: () => { const v = sim.lab('g'); return [f2(v) + ' g/L', v < 0.45]; } },
      { img: 'muscle', t: 'Muscle, tissu adipeux', e: 'Captation du glucose accrue ; lipolyse et cétogenèse freinées (pas de cétose)', d: 'L\'insuline augmente l\'utilisation périphérique du glucose (SNFGE p. 11). La prise de poids vient des resucrages répétés (TNCD p. 6).', color: 'p-blue2', live: () => { const v = sim.lab('ins'); return [f1(v) + ' mU/L', v >= 3 && sim.lab('g') < 0.5]; } },
      { img: 'brain', t: 'Cerveau', e: 'Neuroglucopénie : céphalées, confusion, flou visuel, amnésie, convulsions, coma', d: 'Le cerveau dépend du glucose. Les malaises cèdent au resucrage (triade de Whipple) (TNCD p. 6 et 13).', color: 'p-violet', live: () => { const g = sim.lab('g'); return [g < 0.45 ? 'neuroglucopénie' : g < 0.6 ? 'à risque' : 'normal', g < 0.45]; } },
      { img: 'heart', t: 'Système adrénergique', e: 'Contre-régulation : faim impérieuse, sueurs, pâleur, tremblements, palpitations', d: 'Catécholamines et glucagon répondent à l\'hypoglycémie (TNCD p. 6) ; ces signes d\'alerte peuvent s\'émousser si les hypoglycémies se répètent (complément).', color: 'p-red', live: () => { const v = sim.lab('glucagon'); return ['glucagon ' + n0(v), sim.lab('g') < 0.5]; } }
    ],
    diag: ['Au malaise ou à l\'épreuve de jeûne (hospitalisation) : glycémie veineuse < 0,45 g/L, insuline ≥ 3 mU/L, proinsuline ≥ 5 pmol/L, peptide C élevé (TNCD p. 6 et 13).', 'Sulfamides et glinides négatifs dans le sang ou les urines (TNCD p. 13).', 'Localisation : scanner, IRM, échoendoscopie ; TEP au 68Ga-exendine (récepteurs du GLP-1) si non localisé (TNCD p. 8).'],
    ttt: ['Fractionnement des repas, collations ; éducation au resucrage et à la conduite (TNCD p. 18-19).', 'Diazoxide, efficace dans environ 50 % des cas, souvent en attente du geste (TNCD p. 19).', 'Chirurgie limitée (énucléation) ; radiofréquence sous échoendoscopie si < 20 mm, en centre expert (TNCD p. 19).', 'Formes réfractaires : analogues (effets paradoxaux possibles par freinage du glucagon), évérolimus (TNCD p. 19).'],
    labs: [['g', 'Glycémie'], ['ins', 'Insuline'], ['pepc', 'Peptide C'], ['glucagon', 'Glucagon']],
    scen: [['Insulinome', 'insulinome'], ['Sujet sain', 'eu']],
    info: { 'tne-insulinome-cell': { t: 'Insulinome', k: 'Cellules β tumorales', d: 'Sécrétion autonome d\'insuline et de proinsuline, qui persiste quand la glycémie baisse. Clic sur « Îlot et cellule β » pour le couplage glucose – insuline.' } },
    draw(a) {
      zoomPill(a, 470, 920, 140, 'Îlot, cellule β', 'islet');
      zoomPill(a, 620, 920, 130, 'Axe glycémie', 'glyc');
    },
    steps: [
      { t: 'L\'insuline ne s\'arrête plus', d: 'Normalement, l\'insuline s\'effondre quand la glycémie baisse. La cellule β tumorale continue de sécréter.', spot: [[600, 560, 130]] },
      { t: 'Le foie ne fournit plus le glucose', d: 'Glycogénolyse et néoglucogenèse sont freinées : au jeûne, la glycémie descend sous 0,45 g/L.', spot: [[935, 270, 190]] },
      { t: 'Neuroglucopénie et alerte adrénergique', d: 'Confusion, troubles visuels, convulsions, coma ; faim, sueurs, palpitations. Le resucrage corrige les symptômes.', spot: [[935, 680, 240]] },
      { t: 'Prouver l\'hyperinsulinisme', d: 'Lancez l\'épreuve de jeûne dans le panneau : glycémie < 0,45 g/L avec insuline ≥ 3 mU/L et peptide C élevé.', spot: [[1342, 500, 300]] }
    ]
  });

  /* ---------- Glucagonome ---------- */
  tne({
    id: 'tne-glucagonome', pos: COL2(2), loupe: 'Glucagonome', title: 'Glucagonome', color: 'p-orange', mol: 'glucagon',
    sub: 'Glucagon autonome → diabète et hypercatabolisme → érythème nécrolytique migrateur',
    lead: 'Le glucagonome est une TNE pancréatique à haut risque de malignité. L\'excès de glucagon emballe la production hépatique de glucose et le catabolisme protéique : diabète, dénutrition, acides aminés effondrés, érythème nécrolytique migrateur, anémie, thromboses veineuses (TNCD p. 5-6).',
    points: ['Diabète déséquilibré, perte de poids ; érythème nécrolytique migrateur, glossite, stomatite, perlèche ; diarrhée, phlébites, anémie, troubles visuels et psychiatriques (TNCD p. 6).', 'Glucagon plasmatique > 2 N avec hyperglycémie (TNCD p. 6).', 'NEM 1 dans 5 à 10 % des cas (TNCD p. 14).', 'Traitement : contrôle de la glycémie, correction des carences (acides aminés, acides gras essentiels), analogues de la somatostatine en première intention (TNCD p. 20).'],
    legend: ['glucagon', 'glucose', 'insulin'],
    rate: () => S.glucagon,
    cell: 'Cellules α tumorales', cellSub: ['glucagon en excès'],
    site: [[1080, 500, 22]],
    siteLabel: ['Pancréas, corps et queue surtout', '(complément).'],
    facts: ['TNE pancréatique à haut risque de malignité (TNCD p. 5).', 'Souvent métastatique au foie au diagnostic (complément) ; la figure 4 de l\'item SFE montre des métastases hépatiques fixant les récepteurs de la somatostatine.', 'NEM 1 : 5 à 10 % (TNCD p. 14).'],
    targets: [
      { img: 'servier/dig-liver', t: 'Foie : glucose', e: 'Glycogénolyse et néoglucogenèse accrues : diabète déséquilibré', d: 'Le glucagon stimule la production hépatique de glucose (SNFGE p. 11). L\'insuline compense en partie.', color: 'p-lime', live: () => { const v = sim.lab('g'); return [f2(v) + ' g/L', v >= 1.26]; } },
      { img: 'muscle', t: 'Foie, muscle : protéines', e: 'Captation et catabolisme des acides aminés : dénutrition, perte de poids', d: 'Les acides aminés servent de substrat à la néoglucogenèse : hypoaminoacidémie, amyotrophie (TNCD p. 5 ; mécanisme : complément).', color: 'p-orange', live: () => [Math.round(S.aa * 100) + ' % des AA', S.aa < 0.6] },
      { t: 'Peau, muqueuses', e: 'Érythème nécrolytique migrateur ; glossite, stomatite, perlèche', d: 'Lésions érythémateuses, bulleuses puis croûteuses des plis et du visage, liées à l\'hypoaminoacidémie et aux carences (zinc, acides gras ; complément).', color: 'p-red', live: () => [S.aa < 0.5 ? 'érythème' : 'peau saine', S.aa < 0.5] },
      { t: 'Sang, veines', e: 'Thromboses veineuses, embolie pulmonaire ; anémie', d: 'Thromboses et anémie font partie du syndrome (TNCD p. 5-6) ; une anticoagulation préventive est souvent discutée (complément).', color: 'p-violet', live: () => [sim.lab('glucagon') > 300 ? 'risque ↑' : '—', sim.lab('glucagon') > 300] }
    ],
    diag: ['Glucagon plasmatique > 2 N avec hyperglycémie (TNCD p. 6).', 'Biopsie cutanée d\'un érythème nécrolytique migrateur (complément).', 'Scanner, IRM hépatique, TEP au 68Ga-DOTATOC ; bilan nutritionnel (complément).'],
    ttt: ['Contrôle de l\'hyperglycémie ; correction de la dénutrition et des carences, perfusions d\'acides aminés et d\'acides gras essentiels si besoin (TNCD p. 20).', 'Analogues de la somatostatine en première intention : amélioration dans plus de 60 % des cas (TNCD p. 20).', 'Chirurgie si résécable ; formes réfractaires : traitements locorégionaux hépatiques, chimiothérapie, RIV (TNCD p. 20).'],
    labs: [['glucagon', 'Glucagon'], ['g', 'Glycémie'], ['ins', 'Insuline']],
    scen: [['Glucagonome', 'glucagonome'], ['Sous analogue', 'glucagonomeT'], ['Sujet sain', 'eu']],
    info: { 'tne-glucagonome-cell': { t: 'Glucagonome', k: 'Cellules α tumorales', d: 'Sécrétion autonome de glucagon, non freinée par l\'hyperglycémie ni par l\'insuline.' } },
    steps: [
      { t: 'Un glucagon sans frein', d: 'L\'hyperglycémie et l\'insuline freinent normalement les cellules α. La tumeur, souvent volumineuse, échappe à ce contrôle.', spot: [[600, 560, 130]] },
      { t: 'Diabète', d: 'Le foie produit trop de glucose : diabète déséquilibré, malgré l\'insuline qui augmente.', spot: [[935, 270, 190]] },
      { t: 'Hypercatabolisme', d: 'Les acides aminés sont consommés par la néoglucogenèse : dénutrition, perte de poids, érythème nécrolytique migrateur.', spot: [[935, 560, 260]] },
      { t: 'Thromboses et traitement', d: 'Thromboses veineuses, anémie. Analogues de la somatostatine, nutrition et glycémie (TNCD p. 20).', spot: [[935, 860, 150], [1342, 500, 300]] }
    ]
  });

  /* ---------- VIPome ---------- */
  tne({
    id: 'tne-vipome', pos: COL2(3), loupe: 'VIPome', title: 'VIPome · syndrome de Verner-Morrison', color: 'p-magenta', mol: 'vip',
    sub: 'VIP autonome → sécrétion intestinale d\'eau et d\'électrolytes → diarrhée profuse',
    lead: 'Le VIPome, rare, est une TNE le plus souvent pancréatique et à haut risque de malignité. Le VIP active l\'AMPc des entérocytes : l\'intestin sécrète du chlore, du sodium, du potassium, des bicarbonates et de l\'eau. La diarrhée sécrétoire profuse, qui persiste au jeûne, entraîne déshydratation, hypokaliémie et acidose métabolique menaçantes (TNCD p. 5-6).',
    points: ['Diarrhée sécrétoire profuse, déshydratation, douleurs abdominales, perte de poids, flushs (TNCD p. 6).', 'Hypokaliémie, acidose métabolique, hypercalcémie ; VIP > 2 N (TNCD p. 6).', 'NEM 1 dans 5 à 10 % des cas (TNCD p. 14).', 'Traitement : hydratation intensive et correction hydroélectrolytique ; analogues de la somatostatine en première intention (≈ 67 % de réponses) ; sunitinib si réfractaire (TNCD p. 19-20).'],
    legend: ['vip', 'water', 'k', 'hco3'],
    rate: () => S.vip,
    cell: 'Cellules tumorales à VIP', cellSub: ['VIP en excès'],
    site: [[900, 545, 20]],
    siteLabel: ['Pancréas le plus souvent (TNCD p. 5) ;', 'corps et queue (complément).'],
    facts: ['Rare ; TNE le plus souvent pancréatique, à haut risque de malignité (TNCD p. 5).', 'NEM 1 : 5 à 10 % (TNCD p. 14).', 'Diarrhée chez un patient porteur de TNE ou de NEM 1 : doser gastrine, VIP, somatostatine, calcitonine et glucagon (TNCD p. 13).'],
    targets: [
      { img: 'servier/dig-villi', t: 'Entérocytes (grêle, côlon)', e: 'AMPc → sécrétion de Cl⁻ et d\'eau : diarrhée sécrétoire profuse, persistant au jeûne', d: 'Le VIP stimule la sécrétion intestinale d\'eau et d\'électrolytes (récepteurs VPAC, AMPc, canal CFTR ; complément). Le volume dépasse les capacités de réabsorption du côlon.', color: 'p-magenta', live: () => { const v = sim.lab('stool'); return [f1(v) + ' L/24 h', v > 1]; } },
      { t: 'Bilan hydroélectrolytique', e: 'Pertes fécales de K⁺ et de HCO₃⁻ : hypokaliémie, acidose métabolique, déshydratation', d: 'Troubles hydroélectrolytiques sévères et menaçants (TNCD p. 5), à corriger avant tout geste.', color: 'p-violet', live: () => { const k = sim.lab('k'), b = sim.lab('hco3'); return ['K⁺ ' + f1(k) + ' · HCO₃⁻ ' + n0(b), k < 3.5]; } },
      { img: 'servier/dig-stomach', t: 'Estomac', e: 'Sécrétion acide freinée : hypochlorhydrie (complément)', d: 'Le VIP freine la sécrétion acide gastrique (complément ; l\'achlorhydrie fait partie de l\'acronyme anglais WDHA).', color: 'p-red', live: () => { const v = sim.lab('ph'); return ['pH ' + f1(v), v > 3.5]; } },
      { t: 'Vaisseaux, métabolisme', e: 'Vasodilatation : flushs ; hyperglycémie, hypercalcémie', d: 'Flushs et hypercalcémie sont cités par le TNCD (p. 6) ; le VIP est vasodilatateur et glycogénolytique (complément).', color: 'p-rose', live: () => { const v = sim.lab('g'); return [f2(v) + ' g/L', v > 1.1]; } }
    ],
    diag: ['VIP plasmatique > 2 N, prélevé au cours de la diarrhée (TNCD p. 6).', 'Diarrhée sécrétoire : persiste au jeûne, faible trou osmotique fécal (complément).', 'Hypokaliémie, acidose métabolique ; scanner, IRM, TEP au 68Ga-DOTATOC.'],
    ttt: ['Hydratation intensive adaptée aux pertes, correction de la kaliémie et de l\'acidose (TNCD p. 19).', 'Analogues de la somatostatine en première intention : amélioration rapide dans ≈ 67 % des cas (TNCD p. 19).', 'Chirurgie si résécable ; formes réfractaires : sunitinib, traitements locorégionaux, chimiothérapie, RIV (TNCD p. 20).'],
    labs: [['vip', 'VIP'], ['stool', 'Selles'], ['k', 'Kaliémie'], ['hco3', 'Bicarbonates']],
    scen: [['VIPome', 'vipome'], ['Sous analogue', 'vipomeT'], ['Sujet sain', 'eu']],
    info: { 'tne-vipome-cell': { t: 'VIPome', k: 'Cellules tumorales sécrétant le VIP', d: 'Le VIP est normalement un neuromédiateur des plexus digestifs ; sa sécrétion tumorale inonde la circulation.' } },
    steps: [
      { t: 'Le VIP envahit la circulation', d: 'Neuromédiateur local des plexus, le VIP devient une hormone circulante produite par la tumeur.', spot: [[600, 560, 130]] },
      { t: 'L\'intestin sécrète', d: 'Les entérocytes sécrètent chlore et eau : diarrhée profuse, qui persiste au jeûne.', spot: [[935, 270, 190]] },
      { t: 'Hypokaliémie, acidose, déshydratation', d: 'Les pertes fécales de potassium et de bicarbonates menacent la vie : urgence hydroélectrolytique.', spot: [[935, 470, 190]] },
      { t: 'Analogues de la somatostatine', d: 'Comparez « VIPome » et « Sous analogue » : la sécrétion et la diarrhée diminuent (TNCD p. 19).', spot: [[1342, 600, 300]] }
    ]
  });

  /* ---------- Somatostatinome ---------- */
  tne({
    id: 'tne-somatostatinome', pos: COL2(4), loupe: 'Somatostatinome', title: 'Somatostatinome', color: 'p-grey', mol: 'sst', kind: 'inhib',
    sub: 'Somatostatine en excès → toutes les sécrétions digestives freinées',
    lead: 'Le terme de somatostatinome désigne surtout une TNE duodénale ou péri-ampullaire qui exprime la somatostatine, à risque relativement élevé de métastases ganglionnaires. Une vraie hypersécrétion de somatostatine est très rare : elle freine l\'insuline, la CCK, la vésicule et le pancréas exocrine, d\'où hyperglycémie, lithiase vésiculaire et diarrhée avec stéatorrhée (TNCD p. 6 et 22).',
    points: ['Syndrome rarissime : diarrhée avec stéatorrhée, hyperglycémie, lithiase vésiculaire (TNCD p. 6).', 'Le plus souvent TNE duodénale ou péri-ampullaire exprimant la somatostatine en immunohistochimie (TNCD p. 6).', 'NF1 : TNE chez environ 5 % des patients, pancréatiques ou duodéno-ampullaires, en général non fonctionnelles mais exprimant la somatostatine (TNCD p. 15).', 'Facteur de risque de métastases ganglionnaires parmi les TNE duodénales (TNCD p. 22).'],
    legend: ['sst', 'insulin', 'cck', 'enzyme'],
    rate: () => S.sstp,
    cell: 'Cellules δ tumorales', cellSub: ['somatostatine en excès'],
    site: [[450, 625, 16], [520, 690, 14]],
    siteLabel: ['Duodénum, région péri-ampullaire,', 'tête du pancréas (TNCD p. 6).'],
    facts: ['Hypersécrétion de somatostatine très rare (TNCD p. 6).', 'TNE duodénale ou péri-ampullaire ; associée à la NF1 (TNCD p. 15).', 'Risque relativement élevé de métastases ganglionnaires (TNCD p. 6 et 22).', 'Cholécystectomie recommandée lors de toute chirurgie si des analogues de la somatostatine sont envisagés (TNCD p. 23).'],
    targets: [
      { img: 'servier/endo-islet', t: 'Cellules β', e: 'Insuline freinée : hyperglycémie, diabète', d: 'La somatostatine freine localement l\'insuline et le glucagon ; en excès, l\'insuline manque (TNCD p. 6 ; mécanisme : complément).', color: 'p-blue2', kind: 'inhib', live: () => { const v = sim.lab('g'); return [f2(v) + ' g/L', v >= 1.26]; } },
      { img: 'servier/dig-gallstones', t: 'Cellules I, vésicule biliaire', e: 'CCK et contraction vésiculaire freinées : stase, lithiase', d: 'La vésicule ne se vide plus : boue puis calculs (TNCD p. 6). Les analogues de la somatostatine ont le même effet (TNCD p. 23).', color: 'p-gold', kind: 'inhib', live: () => [S.gb < 0.5 ? 'stase' : 'vidange normale', S.gb < 0.5] },
      { img: 'servier/dig-pancreas-duct', t: 'Pancréas exocrine', e: 'Enzymes et bicarbonates freinés : stéatorrhée, diarrhée', d: 'Moins de lipase et de bile : les graisses ne sont plus digérées (TNCD p. 6 ; SNFGE p. 16).', color: 'p-amber', kind: 'inhib', live: () => { const v = sim.lab('steat'); return [n0(v) + ' g/24 h', v > 6]; } },
      { img: 'servier/dig-stomach', t: 'Estomac', e: 'Gastrine et acide freinés : hypochlorhydrie', d: 'Complément : la somatostatine freine la gastrine et la sécrétion acide.', color: 'p-red', kind: 'inhib', live: () => { const v = sim.lab('ph'); return ['pH ' + f1(v), v > 3.5]; } }
    ],
    diag: ['Somatostatine plasmatique, demandée sur point d\'appel (diarrhée chez un patient ayant une TNE ; TNCD p. 13).', 'Échoendoscopie des TNE duodénales ou ampullaires pour la taille, l\'invasion pariétale et les ganglions (TNCD p. 9).', 'Scanner, IRM, TEP au 68Ga-DOTATOC ; rechercher une NF1 (TNCD p. 15).'],
    ttt: ['Chirurgie en RCP RENATEN ; risque ganglionnaire à prendre en compte (TNCD p. 22).', 'Traitements symptomatiques : insuline, extraits pancréatiques, cholécystectomie (complément).'],
    labs: [['sstp', 'Somatostatine'], ['g', 'Glycémie'], ['steat', 'Graisses fécales']],
    scen: [['Somatostatinome', 'somato'], ['Sujet sain', 'eu']],
    info: { 'tne-somatostatinome-cell': { t: 'Somatostatinome', k: 'Cellules δ tumorales', d: 'La somatostatine, hormone inhibitrice universelle du tube digestif, freine en excès toutes les sécrétions.' } },
    steps: [
      { t: 'Un frein général', d: 'La somatostatine des cellules δ freine normalement de façon locale. En excès, elle freine tout le tube digestif.', spot: [[600, 560, 130]] },
      { t: 'Hyperglycémie', d: 'L\'insuline baisse plus que le glucagon : hyperglycémie.', spot: [[935, 270, 190]] },
      { t: 'Lithiase et stéatorrhée', d: 'CCK, vésicule et pancréas exocrine sont freinés : lithiase vésiculaire, diarrhée avec stéatorrhée.', spot: [[935, 560, 260]] },
      { t: 'Une rareté', d: 'La plupart des « somatostatinomes » sont des TNE duodénales ou péri-ampullaires sans syndrome (TNCD p. 6).', spot: [[265, 650, 230]] }
    ]
  });

  /* =====================================================================
     Classification et prise en charge des TNE pancréatiques
     ===================================================================== */
  Object.assign(HV.INFO, {
    'pzc-who': { t: 'Classification OMS', k: 'Différenciation et grade (TNCD p. 10-11 ; SFE)', d: 'TNE bien différenciées G1 (Ki-67 < 3 %), G2 (3 à 20 %), G3 (> 20 %) ; CNE peu différenciés (> 20 %) ; MiNEN. Le grade retient le plus élevé des deux indices (Ki-67, mitoses par 2 mm²). Stade et grade sont les principaux facteurs pronostiques.' },
    'pzc-func': { t: 'TNE fonctionnelles', k: '20 % des TNE duodéno-pancréatiques (SFE)', d: 'Révélées par un syndrome sécrétoire, dont le traitement est prioritaire en raison de complications parfois mortelles (TNCD p. 6). Les dosages hormonaux ne sont faits que sur point d\'appel clinique.' },
    'pzc-nf': { t: 'TNE non fonctionnelles', k: '80 % des cas (SFE)', d: 'Découvertes fortuitement (endoscopie, scanner, IRM) ou par un effet de masse. Les incidentalomes < 20 mm, G1, sans signe péjoratif peuvent être surveillés (TNCD p. 23-24, étude ASPEN).' },
    'pzc-cga': { t: 'Chromogranine A', k: 'Marqueur général, non hormonal (TNCD p. 12)', d: 'Sensible surtout dans les formes métastatiques (70 à 100 %). Faux positifs : toute hypergastrinémie (IPP, atrophie fundique, H. pylori), insuffisances rénale et cardiaque sévères. Sous IPP, arrêt 7 à 14 jours avant le dosage, sauf syndrome de Zollinger-Ellison. Non recommandée en systématique.' },
    'pzc-img': { t: 'Imagerie', k: 'Conventionnelle et fonctionnelle (SFE ; TNCD p. 7-9)', d: 'Scanner injecté (temps artériel et portal) en première intention : tumeur intensément vascularisée. IRM hépatique avec diffusion, échoendoscopie ± ponction. TEP au 68Ga-DOTATOC (récepteurs de la somatostatine) ; TEP au 18FDG pour les formes agressives : DOTATOC + / FDG − = bon pronostic, l\'inverse = mauvais pronostic.' },
    'pzc-gen': { t: 'Prédispositions génétiques', k: '< 5 % des TNE duodéno-pancréatiques (TNCD p. 14-15)', d: 'NEM 1 (MEN1) : TNE duodéno-pancréatiques chez ≈ 90 %, souvent multiples, fonctionnelles dans 40 % (gastrinomes surtout) ; NEM 4 (CDKN1B) ; VHL (15 à 20 %, non fonctionnelles) ; NF1 (≈ 5 %, somatostatine) ; sclérose tubéreuse.' },
    'pzc-ttt': { t: 'Principes de traitement', k: 'RCP RENATEN (TNCD)', d: 'Contrôler d\'abord le syndrome sécrétoire. Chirurgie des formes résécables ; surveillance des petits incidentalomes. Formes métastatiques : analogues de la somatostatine, évérolimus, sunitinib, chimiothérapie, radiothérapie interne vectorisée au 177Lu-DOTATATE si les récepteurs sont fortement exprimés.' }
  });
  const tneDef = HV.scene(Object.assign({
    id: 'panc-tne', loupe: 'Classification des TNE', title: 'Tumeurs neuroendocrines du pancréas', level: 'Notion',
    lead: 'Les tumeurs neuroendocrines duodéno-pancréatiques (TNE-DP) sont des tumeurs rares, développées aux dépens des cellules endocrines du pancréas et du duodénum. Le diagnostic est histologique, confirmé par l\'immunohistochimie (synaptophysine, chromogranine A). Le stade et le grade OMS (Ki-67) sont les deux principaux facteurs pronostiques (SFE).',
    points: ['80 % non fonctionnelles, 20 % révélées par un syndrome sécrétoire (SFE).', 'OMS : TNE G1 (Ki-67 < 3 %), G2 (3–20 %), G3 (> 20 %) bien différenciées ; CNE peu différenciés (> 20 %), de pronostic très sombre ; MiNEN (SFE ; TNCD p. 11).', 'Scanner en première intention ; TEP au 68Ga-DOTATOC ; TEP au 18FDG pour le pronostic (SFE ; TNCD p. 7-8).', 'Chromogranine A : faux positifs sous IPP et dans toute hypergastrinémie (TNCD p. 12).', 'NEM 1 : gastrinome (≈ 25 %), insulinome, glucagonome, VIPome (5 à 10 %) (TNCD p. 14).'],
    source: SRC_TNE,
    legend: new Set(['gastrin', 'insulin', 'glucagon', 'vip', 'sst']),
    build(g, a) {
      tneDef.sim = sim;
      {
        a.frame('Tumeurs neuroendocrines du pancréas', 'Classification OMS, présentations, bilan, prédispositions, traitements');
        a.dyn(PANC.keepAlive);
        /* Tableau OMS */
        const tg = a.el('g', { 'data-info': 'pzc-who' });
        a.el('rect', { x: 60, y: 170, width: 520, height: 330, rx: 14, class: 'pz-box', style: '--c: var(--p-violet)' }, tg);
        a.text(76, 200, 'Classification OMS (2019, inchangée en 2026)', 'pz-h', null, tg);
        const rows = [['', 'Différenciation', 'Ki-67', 'Mitoses*'], ['TNE G1', 'bien différenciée', '< 3 %', '< 2'], ['TNE G2', 'bien différenciée', '3–20 %', '2–20'], ['TNE G3', 'bien différenciée', '> 20 %', '> 20'], ['CNE', 'peu différencié', '> 20 %', '> 20'], ['MiNEN', 'mixte NE / non NE', 'tous grades', '']];
        rows.forEach((r, i) => {
          const y = 240 + i * 38;
          [76, 176, 366, 466].forEach((x, j) => a.text(x, y, r[j], i === 0 || j === 0 ? 'pz-tab-h' : 'pz-tab', null, tg));
          if (i) a.path(`M 76,${y - 26} L 566,${y - 26}`, 'pz-tab-l', tg);
        });
        a.text(76, 478, '* par 2 mm² ; on retient le plus haut des deux grades (TNCD p. 11).', 'pz-s', null, tg);
        /* Présentation */
        const fg = a.el('g', { 'data-info': 'pzc-nf' });
        a.el('rect', { x: 60, y: 515, width: 250, height: 120, rx: 14, class: 'pz-box', style: '--c: var(--p-grey)' }, fg);
        a.text(185, 568, '80 %', 'zgl-big', { anchor: 'middle' }, fg);
        a.text(185, 600, ['non fonctionnelles', '(découverte fortuite)'], 'pz-s', { anchor: 'middle', lh: 1.2 }, fg);
        const fg2 = a.el('g', { 'data-info': 'pzc-func' });
        a.el('rect', { x: 330, y: 515, width: 250, height: 120, rx: 14, class: 'pz-box', style: '--c: var(--p-red)' }, fg2);
        a.text(455, 568, '20 %', 'zgl-big', { anchor: 'middle' }, fg2);
        a.text(455, 600, ['fonctionnelles', '(syndrome sécrétoire)'], 'pz-s', { anchor: 'middle', lh: 1.2 }, fg2);
        card(a, 60, 650, 520, 'Bilan', ['Scanner injecté (temps artériel et portal) en première intention, IRM hépatique avec diffusion, échoendoscopie ± ponction.', 'TEP au 68Ga-DOTATOC ; TEP au 18FDG : fixation DOTATOC sans FDG = bon pronostic, l\'inverse = mauvais.', 'Chromogranine A : faux positifs (IPP, atrophie fundique, insuffisance rénale) ; dosages hormonaux sur point d\'appel.'], { info: 'pzc-img', color: 'p-blue', n: 70 });
        /* Tableau des TNE fonctionnelles */
        a.text(610, 196, 'TNE fonctionnelles (TNCD p. 6 ; SFE)', 'pz-h');
        const T = [
          ['Insulinome', 'insuline', 'hypoglycémies de jeûne, malaises', 'glycémie < 0,45 g/L, insuline ≥ 3 mU/L', '< 5 % métastatiques', 'tne-insulinome', 'p-blue2'],
          ['Gastrinome', 'gastrine', 'ulcères récidivants, diarrhée', 'gastrine > 3 N, pH ≤ 2', '60–80 % malins', 'tne-gastrinome', 'p-red2'],
          ['Glucagonome', 'glucagon', 'diabète, érythème nécrolytique migrateur', 'glucagon > 2 N', 'haut risque', 'tne-glucagonome', 'p-orange'],
          ['VIPome', 'VIP', 'diarrhée profuse, hypokaliémie', 'VIP > 2 N', 'haut risque', 'tne-vipome', 'p-magenta'],
          ['Somatostatinome', 'somatostatine', 'stéatorrhée, hyperglycémie, lithiase', 'somatostatine', 'ganglions fréquents', 'tne-somatostatinome', 'p-grey'],
          ['Paranéoplasiques', 'ACTH, PTHrP, GHRH', 'Cushing, hypercalcémie, acromégalie', 'selon l\'hormone', '—', null, 'p-gold']
        ];
        T.forEach((r, i) => {
          const y = 216 + i * 84;
          const rg = a.el('g', { style: `--c: var(--${r[6]})` });
          a.el('rect', { x: 610, y, width: 560, height: 76, rx: 12, class: 'pz-box' }, rg);
          a.text(626, y + 24, r[0], 'pz-t', null, rg);
          a.text(626, y + 46, r[1], 'pz-s', null, rg);
          a.text(626, y + 67, r[4], 'pz-s', null, rg);
          a.text(790, y + 24, wrap(r[2], 44), 'pz-tab', { lh: 1.2 }, rg);
          a.text(790, y + 67, r[3], 'pz-s', null, rg);
          if (r[5]) a.zoomable(rg, r[5]);
        });
        a.text(610, 736, 'Clic sur une ligne : modèle physiopathologique de la tumeur.', 'pz-s');
        card(a, 610, 752, 560, 'Prédispositions (< 5 % ; TNCD p. 14-15)', ['NEM 1 : TNE-DP chez ≈ 90 % ; probabilité de NEM 1 ≈ 25 % devant un gastrinome, 5 à 10 % devant insulinome, VIPome, glucagonome.', 'VHL (15 à 20 %, non fonctionnelles), NF1 (≈ 5 %), NEM 4, sclérose tubéreuse.'], { info: 'pzc-gen', color: 'p-teal', n: 76 });
        card(a, 1190, 170, 370, 'Traitement (RCP RENATEN)', ['Contrôler d\'abord le syndrome sécrétoire (TNCD p. 6).', 'Chirurgie des formes résécables ; incidentalome < 20 mm, G1, sans signe péjoratif : surveillance possible (TNCD p. 23).', 'Formes métastatiques : analogues de la somatostatine, évérolimus, sunitinib, chimiothérapie, RIV au 177Lu-DOTATATE si récepteurs fortement exprimés (TNCD p. 26-27).'], { info: 'pzc-ttt', color: 'p-green', n: 48 });
        card(a, 1190, 560, 370, 'Chromogranine A', ['Marqueur général, non hormonal : sensible surtout dans les formes métastatiques.', 'Faux positifs : IPP, atrophie fundique, H. pylori, insuffisances rénale et cardiaque sévères.', 'Sous IPP : arrêt 7 à 14 jours avant le dosage, jamais dans un Zollinger-Ellison (TNCD p. 12).'], { info: 'pzc-cga', color: 'p-amber', n: 48 });
        const cgT = a.text(1206, 940, '', 'pz-v');
        a.dyn(() => { const v = sim.lab('cga'), t = 'Modèle : CgA × ' + f1(v) + (sim.p.ipp > 0 ? ' (sous IPP)' : ''); if (cgT._t !== t) { cgT._t = t; cgT.textContent = t; } });
        zoomPill(a, 1190, 880, 180, 'NEM (notions)', 'nem');
        zoomPill(a, 1380, 880, 180, 'Piège : IPP seuls', 'tne-gastrinome');
      }
      HV.spotlight(tneDef, a, [
        { t: 'Bien ou peu différenciée ?', d: 'Les TNE bien différenciées (G1 à G3), les plus nombreuses, ont une survie prolongée ; les carcinomes neuroendocrines, peu différenciés, un pronostic très sombre (SFE).', spot: [[60, 170, 520, 330]] },
        { t: 'Fonctionnelle ou non ?', d: '80 % sont non fonctionnelles ; 20 % se révèlent par une hormone en excès (SFE).', spot: [[60, 515, 520, 120]] },
        { t: 'Une hormone, un syndrome', d: 'Chaque TNE fonctionnelle a son tableau et son marqueur (TNCD p. 6). Cliquez une ligne pour son modèle.', spot: [[610, 216, 560, 500]] },
        { t: 'Bilan et pièges', d: 'Scanner, IRM, échoendoscopie, TEP au 68Ga-DOTATOC et au 18FDG. La chromogranine A est faussée par les IPP.', spot: [[60, 650, 520, 300], [1190, 560, 370, 300]] },
        { t: 'Penser génétique', d: 'NEM 1 devant un gastrinome (≈ 25 %) ou des TNE multiples ; VHL, NF1, NEM 4, sclérose tubéreuse.', spot: [[610, 752, 560, 200]] }
      ]);
    }
  }, COL(3)));

  /* =====================================================================
     Pancréas exocrine : acinus, canal, activation des enzymes
     ===================================================================== */
  Object.assign(HV.INFO, {
    'pze-acin': { t: 'Cellule acineuse', k: 'Synthèse protéique la plus élevée de l\'organisme (SNFGE p. 8)', d: 'Les enzymes s\'accumulent dans les granules de zymogène, isolés des lysosomes, puis sont libérées par exocytose dans la lumière de l\'acinus.' },
    'pze-cckr': { t: 'Récepteur CCK-A et récepteur M3', k: 'Couplés aux protéines G → PLC (SNFGE p. 10)', d: 'La PLC clive le PIP2 en IP3 (libération du Ca²⁺ du réticulum) et DAG (PKC) ; les phosphorylations aboutissent à la fusion des granules avec la membrane. L\'acétylcholine vagale (M3) renforce l\'effet de la CCK.' },
    'pze-zym': { t: 'Granules de zymogène', k: 'Proenzymes inactives', d: 'Trypsinogène, chymotrypsinogène, proélastase, procarboxypeptidase, prophospholipase, procolipase ; la lipase et l\'amylase sont sécrétées actives (SNFGE p. 8).' },
    'pze-lyso': { t: 'Lysosome (cathepsine B)', k: 'Tenu à l\'écart des zymogènes', d: 'La fusion des granules de zymogène et des lysosomes active le trypsinogène dans la cellule : premier événement de la pancréatite alcoolique (SNFGE p. 10).' },
    'pze-duct': { t: 'Cellule canalaire', k: 'Eau, chlore et bicarbonates (SNFGE p. 6-7)', d: 'Dans les canaux proches des acini, l\'échangeur anionique échange le Cl⁻ luminal contre le HCO₃⁻. Plus loin, le Cl⁻ luminal baisse : des kinases rendent le CFTR perméable aux bicarbonates et bloquent l\'échangeur. L\'eau suit par les aquaporines et la voie intercellulaire.' },
    'pze-secr': { t: 'Récepteur de la sécrétine', k: 'Gs → AMPc → PKA (SNFGE p. 10)', d: 'La PKA phosphoryle et ouvre le canal CFTR : sécrétion d\'eau et de bicarbonates.' },
    'pze-cftr': { t: 'CFTR', k: 'Canal chlore et bicarbonates', d: 'Défaillant dans la mucoviscidose : suc pancréatique pauvre en eau et en bicarbonates, obstruction canalaire (SNFGE figure 7.11).' },
    'pze-ae': { t: 'Échangeur anionique Cl⁻/HCO₃⁻', k: 'Canaux proximaux', d: 'Échange le chlore de la lumière contre un bicarbonate ; bloqué dans les canaux distaux (SNFGE p. 7).' },
    'pze-aqp': { t: 'Aquaporines', k: 'Membranes basolatérale et apicale', d: 'Le passage d\'eau accompagne la sécrétion de bicarbonates (SNFGE p. 7).' },
    'pze-entk': { t: 'Entérokinase', k: 'Bordure en brosse duodénale', d: 'Active le trypsinogène en trypsine dans la lumière duodénale ; la trypsine active ensuite les autres proenzymes (activation en cascade, SNFGE p. 9).' },
    'pze-prot': { t: 'Mécanismes de protection', k: 'Contre l\'autodigestion (SNFGE p. 8-9)', d: 'Proenzymes inactives ; granules de zymogène séparés des lysosomes ; flux permanent du suc ; inhibiteur de Kazal de type 1 (SPINK1) ; autorégulation de la trypsine. Une pancréatite survient quand ils sont dépassés.' }
  });
  const exoDef = HV.scene(Object.assign({
    id: 'panc-exo', loupe: 'Pancréas exocrine', title: 'Pancréas exocrine', level: 'Cellule',
    lead: 'Le suc pancréatique (≈ 1,5 L/j, pH 8,2–8,4) associe deux sécrétions : les enzymes des cellules acineuses, sous l\'effet de la CCK et de l\'acétylcholine, et l\'eau et les bicarbonates des cellules canalaires, sous l\'effet de la sécrétine. Les proenzymes ne s\'activent que dans le duodénum (SNFGE p. 7-10).',
    points: ['Acini : 85 % de la masse pancréatique ; granules de zymogène, exocytose (SNFGE p. 6 et 8).', 'CCK → récepteur CCK-A → PLC → IP3 (Ca²⁺) et DAG (PKC) → exocytose ; l\'acétylcholine (M3) renforce (SNFGE p. 10).', 'Sécrétine → AMPc → PKA → CFTR : eau et bicarbonates (SNFGE p. 10).', 'Entérokinase → trypsine → activation en cascade des autres proenzymes (SNFGE p. 9).', 'Protection : proenzymes, granules, flux, SPINK1, autorégulation de la trypsine (SNFGE p. 8-9).'],
    source: SRC_EXO,
    legend: new Set(['cck', 'secretin', 'enzyme', 'hco3', 'water', 'ca']),
    build(g, a) {
      exoDef.sim = sim;
      a.frame('Pancréas exocrine', 'Cellule acineuse (enzymes) · cellule canalaire (bicarbonates) · activation dans le duodénum');
      a.dyn(PANC.keepAlive);
      /* --- Cellule acineuse --- */
      const ac = a.el('g', { 'data-info': 'pze-acin' });
      a.path('M 80,300 C 80,220 160,190 260,195 C 360,200 430,240 440,320 L 440,760 C 420,830 340,860 260,860 C 160,860 80,820 80,740 Z', 'pz-acin', ac);
      a.text(260, 182, 'Cellule acineuse', 'pz-t', { anchor: 'middle' });
      a.el('ellipse', { cx: 210, cy: 720, rx: 55, ry: 42, class: 'pz-nuc' }, ac);
      a.text(210, 726, 'noyau', 'pz-s', { anchor: 'middle' }, ac);
      a.path('M 120,620 C 180,600 240,640 300,610 C 340,590 380,620 410,600 M 120,650 C 180,630 240,670 300,640', 'pz-arr', ac);
      a.text(300, 690, 'réticulum', 'pz-s', null, ac);
      const zg = a.el('g', { 'data-info': 'pze-zym' });
      [[150, 330], [190, 360], [240, 330], [290, 360], [340, 330], [380, 360], [200, 410], [260, 400], [320, 410], [370, 440], [160, 450]].forEach(([x, y]) => a.el('circle', { cx: x, cy: y, r: 15, class: 'pz-zym' }, zg));
      a.text(260, 285, 'granules de zymogène', 'pz-s', { anchor: 'middle' }, zg);
      const ly = a.el('g', { 'data-info': 'pze-lyso' });
      a.el('circle', { cx: 140, cy: 540, r: 22, class: 'pz-lyso' }, ly);
      a.text(170, 545, 'lysosome', 'pz-s', null, ly);
      // Récepteurs basaux (CCK-A, M3) : signal Ca²⁺
      const rc = a.el('g', { 'data-info': 'pze-cckr' });
      [[80, 520], [80, 600]].forEach(([x, y]) => a.el('rect', { x: x - 10, y: y - 22, width: 20, height: 44, rx: 8, class: 'pz-chan', style: '--c: var(--p-gold)' }, rc));
      a.text(66, 490, 'CCK-A', 'pz-s', { anchor: 'end' }, rc);
      a.text(66, 650, 'M3 (ACh)', 'pz-s', { anchor: 'end' }, rc);
      a.flow('M 40,470 C 60,490 64,505 68,515', { mol: 'cck', rate: () => 0.8 * clamp(S.cck, 0.2, 5), track: false, speed: 50 });
      a.flow('M 100,560 C 160,520 200,480 250,450', { mol: 'ca', rate: () => 0.7 * clamp(S.cck, 0.2, 5), track: false, speed: 45, size: 0.8 });
      // Exocytose vers la lumière acineuse
      a.el('rect', { x: 440, y: 260, width: 70, height: 560, rx: 30, class: 'pz-lumen' });
      a.text(475, 245, 'lumière', 'pz-s', { anchor: 'middle' });
      a.flow('M 400,360 C 430,360 450,380 475,400 C 480,600 480,700 480,830', { mol: 'enzyme', rate: () => 1.2 * clamp(S.enz, 0.02, 5), track: false, speed: 55 });
      /* --- Cellule canalaire --- */
      const dc = a.el('g', { 'data-info': 'pze-duct' });
      a.el('rect', { x: 560, y: 230, width: 360, height: 300, rx: 40, class: 'pz-acin' }, dc);
      a.text(740, 218, 'Cellule canalaire', 'pz-t', { anchor: 'middle' });
      a.el('ellipse', { cx: 700, cy: 400, rx: 44, ry: 34, class: 'pz-nuc' }, dc);
      const ch = (x, y, info, color, label) => {
        const cg = a.el('g', { 'data-info': info, style: `--c: var(--${color})` });
        a.el('rect', { x: x - 12, y: y - 22, width: 24, height: 44, rx: 9, class: 'pz-chan' }, cg);
        a.text(x - 22, y + 6, label, 'pz-s', { anchor: 'end' }, cg);
        return cg;
      };
      // Côté basolatéral (sang) à droite, côté luminal à gauche
      ch(920, 300, 'pze-secr', 'p-teal', '');
      a.text(935, 280, ['récepteur', 'sécrétine'], 'pz-s', { lh: 1.2, attrs: { 'data-info': 'pze-secr' } });
      ch(920, 460, 'pze-aqp', 'p-sky', '');
      a.text(935, 465, 'AQP', 'pz-s', { attrs: { 'data-info': 'pze-aqp' } });
      ch(560, 300, 'pze-cftr', 'p-sky', '');
      ch(560, 400, 'pze-ae', 'p-amber', '');
      ch(560, 480, 'pze-aqp', 'p-sky', '');
      [[300, 'CFTR', 'pze-cftr'], [400, 'Cl⁻/HCO₃⁻', 'pze-ae'], [480, 'AQP', 'pze-aqp']].forEach(([y, t, i]) => a.text(582, y + 6, t, 'pz-s', { attrs: { 'data-info': i } }));
      a.flow('M 990,240 C 975,260 950,290 932,300', { mol: 'secretin', rate: () => 0.8 * clamp(S.sec, 0.2, 5), track: false, speed: 50 });
      a.text(780, 290, 'AMPc → PKA', 'pz-s', { anchor: 'middle' });
      a.path('M 880,300 L 660,300', 'pz-arr', null, { 'marker-end': 'url(#arr-accent)' });
      a.flow('M 548,300 C 530,310 515,330 505,350 C 490,500 490,650 490,830', { mol: 'hco3', rate: () => 1.4 * clamp(S.bic, 0.02, 5), track: false, speed: 65 });
      a.flow('M 548,480 C 530,500 515,520 505,540 C 495,650 495,750 495,830', { mol: 'water', rate: () => 1.2 * clamp(S.bic, 0.02, 5), track: false, speed: 70, size: 0.9 });
      card(a, 560, 560, 360, 'Sécrétion électrolytique', ['Canaux proches des acini : Cl⁻ échangé contre HCO₃⁻.', 'Canaux distaux : CFTR perméable aux HCO₃⁻, échangeur bloqué.', 'Eau et sodium suivent (SNFGE p. 7).', 'Mucoviscidose : CFTR défaillant.'], { info: 'pze-duct', color: 'p-sky' });
      /* --- Activation dans le duodénum --- */
      const casc = a.el('g', { 'data-info': 'pze-entk' });
      a.el('rect', { x: 1010, y: 560, width: 550, height: 400, rx: 14, class: 'pz-box', style: '--c: var(--p-amber)' }, casc);
      a.text(1026, 590, 'Activation en cascade dans le duodénum', 'pz-h', null, casc);
      a.text(1026, 625, ['Entérokinase (duodénum) :', 'trypsinogène → TRYPSINE'], 'pz-t', { lh: 1.25 }, casc);
      [['Chymotrypsinogène', 'chymotrypsine'], ['Proélastase', 'élastase'], ['Procarboxypeptidase', 'carboxypeptidase'], ['Prophospholipase', 'phospholipase'], ['Procolipase', 'colipase'], ['Kallikréinogène', 'kallikréine']].forEach(([p, e], i) => {
        const y = 690 + i * 30;
        a.text(1046, y, p + ' → ' + e, 'pz-tab', null, casc);
      });
      a.text(1026, 893, ['Lipase et amylase sont sécrétées actives ; la trypsine', 'active aussi le trypsinogène (amplification) (SNFGE p. 9).'], 'pz-s', { lh: 1.3 }, casc);
      card(a, 1010, 170, 550, 'Protection contre l\'autodigestion', ['Proenzymes inactives (trypsinogène, procolipase…).', 'Granules de zymogène séparés des lysosomes (cathepsine B).', 'Flux permanent du suc par gradient de pression.', 'Inhibiteur de Kazal de type 1 (SPINK1) ; autorégulation de la trypsine (SNFGE p. 8-9).'], { info: 'pze-prot', color: 'p-green' });
      /* --- Bilan et scénarios --- */
      const bil = a.el('g');
      a.el('rect', { x: 1010, y: 395, width: 550, height: 150, rx: 14, class: 'sr-note-bg' }, bil);
      const vals = [['Enzymes', () => '× ' + f1(S.enz), () => S.enz < 0.2], ['Bicarbonates', () => '× ' + f1(S.bic), () => S.bic < 0.2], ['pH duodénal', () => f1(S.duo), () => S.duo < 5], ['Graisses fécales', () => n0(sim.lab('steat')) + ' g/24 h', () => sim.lab('steat') > 6]];
      vals.forEach(([n, fn, hot], i) => {
        const x = 1026 + i * 132;
        a.text(x, 420, n, 'pz-s', null, bil);
        const t = a.text(x, 444, '', 'pz-v', null, bil);
        a.dyn(() => { const s = fn(); if (t._t !== s) { t._t = s; t.textContent = s; } t.classList.toggle('hi', hot()); });
      });
      [['À jeun', 'eu'], ['Repas', 'repas'], ['IPE', 'ipe'], ['IPE + extraits', 'ipeT']].forEach(([l, id], i) => scenBtn(a, 1026 + i * 130, 485, 122, l, id));
      zoomPill(a, 60, 900, 200, 'Pancréatites', 'panc-patho');
      zoomPill(a, 270, 900, 200, 'Hormones digestives', 'panc-gi');
      HV.spotlight(exoDef, a, [
        { t: 'La CCK libère les enzymes', d: 'La CCK (et l\'acétylcholine vagale) agit sur des récepteurs couplés aux protéines G : PLC, IP3 et Ca²⁺, DAG et PKC, puis exocytose des granules de zymogène (SNFGE p. 10).', spot: [[260, 480, 260]] },
        { t: 'La sécrétine libère les bicarbonates', d: 'L\'AMPc active la PKA qui ouvre le CFTR. Le chlore luminal est échangé contre des bicarbonates ; l\'eau suit par les aquaporines (SNFGE p. 7 et 10).', spot: [[740, 380, 230]] },
        { t: 'Activation dans le duodénum', d: 'L\'entérokinase active le trypsinogène ; la trypsine active toutes les autres proenzymes (SNFGE p. 9).', spot: [[1010, 560, 550, 400]] },
        { t: 'Ne pas s\'autodigérer', d: 'Proenzymes, granules séparés des lysosomes, flux du suc, SPINK1, autorégulation de la trypsine : quand ces protections cèdent, c\'est la pancréatite.', spot: [[1010, 170, 550, 210], [140, 540, 60]] },
        { t: 'Insuffisance exocrine', d: 'Choisissez « Insuffisance exocrine » puis « IPE + extraits » : la stéatorrhée apparaît quand plus de 80 % de la fonction est perdue et se corrige avec les extraits (SNFGE p. 13 et 17).', spot: [[1010, 395, 550, 150]] }
      ]);
    }
  }, COL(0)));

  /* =====================================================================
     Pancréatites et insuffisance exocrine
     ===================================================================== */
  Object.assign(HV.INFO, {
    'pzp-alc': { t: 'Pancréatite alcoolique', k: 'Colocalisation zymogènes – lysosomes (SNFGE p. 10)', d: 'Premier événement : fusion des granules de zymogène et des lysosomes ; la cathepsine B active le trypsinogène dans la cellule. Même mécanisme dans l\'hypercalcémie et certains médicaments.' },
    'pzp-bil': { t: 'Pancréatite biliaire', k: 'Calcul bloqué dans l\'ampoule de Vater (SNFGE p. 10)', d: 'L\'obstruction transitoire du canal pancréatique principal active les enzymes dans la glande. Lithiase et alcool causent chacun 40 % des pancréatites aiguës (SNFGE p. 14).' },
    'pzp-her': { t: 'Pancréatite héréditaire', k: 'Perte de l\'autorégulation de la trypsine (SNFGE p. 10)', d: 'La trypsine n\'est plus freinée : le système enzymatique s\'emballe.' },
    'pzp-pa': { t: 'Pancréatite aiguë', k: 'Autodigestion → inflammation (SNFGE p. 10 et 17)', d: 'Les enzymes actives digèrent la glande ; les leucocytes recrutés libèrent des cytokines qui peuvent provoquer des défaillances viscérales. Forme œdémateuse, guérissant sans séquelle si la cause est supprimée ; forme nécrosante (20 %) avec risque d\'infection de la nécrose.' },
    'pzp-pc': { t: 'Pancréatite chronique', k: 'Fibrose, sténoses, calcifications (SNFGE p. 10)', d: 'La répétition des pancréatites active la réparation : fibrose qui désorganise la glande, canaux sténosés irrégulièrement, calculs intracanalaires (pancréatite chronique calcifiée). Évolution vers l\'insuffisance exocrine puis le diabète ; compression possible du cholédoque.' },
    'pzp-ipe': { t: 'Insuffisance pancréatique exocrine', k: 'Stéatorrhée (SNFGE p. 13 et 16)', d: 'Selles abondantes, claires, nauséabondes, flottantes, collantes. Une stéatorrhée clinique traduit la perte de plus de 80 % de la fonction exocrine. Débit fécal de graisses > 6 g/24 h (apport de 100 g/j) ; élastase fécale < 100 µg/g.' },
    'pzp-pain': { t: 'Douleur pancréatique', k: 'Sémiologie (SNFGE p. 11-12)', d: 'Épigastrique ou de l\'hypochondre gauche, transfixiante vers le dos, intense, aggravée par l\'alimentation et l\'alcool, calmée par la position en chien de fusil, continue pendant plusieurs dizaines de minutes ; nausées, vomissements.' }
  });
  const patDef = HV.scene(Object.assign({
    id: 'panc-patho', loupe: 'Pancréatites', title: 'Pancréatites et insuffisance exocrine', level: 'Physiopathologie',
    lead: 'Une pancréatite survient quand les mécanismes de protection sont dépassés : les enzymes s\'activent dans la glande et l\'autodigèrent. La répétition des poussées laisse une fibrose calcifiante qui détruit la glande : insuffisance exocrine (stéatorrhée), puis diabète (SNFGE p. 10-17).',
    points: ['Activation intrapancréatique : colocalisation zymogènes – lysosomes (alcool, hypercalcémie, médicaments), obstruction ampullaire (calcul), perte d\'autorégulation de la trypsine (héréditaire) (SNFGE p. 10).', 'Lithiase biliaire et alcool : 40 % des pancréatites aiguës chacun (SNFGE p. 14).', 'Forme nécrosante (20 %) : réanimation, défaillances viscérales, infection de la nécrose (SNFGE p. 17).', 'Stéatorrhée clinique : perte de plus de 80 % de la fonction exocrine ; graisses fécales > 6 g/24 h, élastase < 100 µg/g (SNFGE p. 13 et 16).', 'Traitement de la pancréatite chronique : arrêt de l\'alcool et du tabac, antalgiques, extraits pancréatiques, traitement des complications (SNFGE p. 17).'],
    source: SRC_EXO,
    legend: new Set(['enzyme']),
    build(g, a) {
      patDef.sim = sim;
      a.frame('Pancréatites et insuffisance exocrine', 'De l\'activation intrapancréatique des enzymes à la fibrose et à la stéatorrhée');
      a.dyn(PANC.keepAlive);
      // Trois causes → activation intrapancréatique → autodigestion
      const causes = [['pzp-alc', 'Alcool, hypercalcémie, médicaments', 'zymogènes + lysosomes → cathepsine B', 'p-violet'], ['pzp-bil', 'Calcul biliaire', 'obstruction de l\'ampoule de Vater', 'p-green'], ['pzp-her', 'Pancréatite héréditaire', 'trypsine sans autorégulation', 'p-orange']];
      let sel = -1;
      const cg = causes.map(([info, t, s, col], i) => {
        const y = 180 + i * 120;
        const gg = a.el('g', { 'data-info': info, style: `--c: var(--${col})`, class: 'pz-step' });
        a.el('rect', { x: 60, y, width: 400, height: 100, rx: 14, class: 'pz-box' }, gg);
        a.text(78, y + 34, t, 'pz-t', null, gg);
        a.text(78, y + 62, s, 'pz-s', null, gg);
        a.path(`M 460,${y + 50} C 520,${y + 50} 540,330 590,330`, 'pz-arr', null, { 'marker-end': 'url(#arr-accent)' });
        gg.addEventListener('pointerdown', (e) => { e.stopPropagation(); sel = sel === i ? -1 : i; cg.forEach((q, j) => q.setAttribute('opacity', sel < 0 || sel === j ? 1 : 0.35)); });
        return gg;
      });
      a.text(60, 560, 'Clic sur une cause : la mettre en avant.', 'pz-s');
      const act = a.el('g', { 'data-info': 'pzp-pa' });
      a.el('rect', { x: 600, y: 270, width: 380, height: 120, rx: 14, class: 'pz-box', style: '--c: var(--bad)' }, act);
      a.text(616, 304, 'Activation intrapancréatique', 'pz-t', null, act);
      a.text(616, 332, ['trypsinogène → trypsine dans la glande', '→ autodigestion'], 'pz-s', { lh: 1.3 }, act);
      a.flow('M 620,370 C 700,390 860,390 960,370', { mol: 'enzyme', rate: () => 1.5, track: false, speed: 60 });
      card(a, 600, 410, 380, 'Pancréatite aiguë', ['Inflammation, leucocytes, cytokines → défaillances viscérales possibles.', 'Œdémateuse : guérit si la cause est supprimée.', 'Nécrosante (20 %) : réanimation ; infection de la nécrose, prévenue en partie par la nutrition entérale précoce (SNFGE p. 17).'], { info: 'pzp-pa', color: 'p-red', n: 48 });
      card(a, 1000, 170, 560, 'Pancréatite chronique', ['Répétition des poussées (alcool surtout) → fibrose qui désorganise la glande.', 'Canaux sténosés irrégulièrement, calcifications intracanalaires (pancréatite chronique calcifiée).', 'Douleurs chroniques par poussées ou continues ; compression du cholédoque (cholestase, ictère).', 'Traitement : arrêt total et définitif de l\'alcool et du tabac, antalgiques, extraits pancréatiques, traitement des complications (SNFGE p. 10, 13 et 17).'], { info: 'pzp-pc', color: 'p-brown', n: 74 });
      // Évolution : fonction exocrine qui baisse → stéatorrhée au-delà de 80 % de perte
      const ev = a.el('g', { 'data-info': 'pzp-ipe' });
      a.el('rect', { x: 1000, y: 470, width: 560, height: 260, rx: 14, class: 'sr-note-bg' }, ev);
      a.text(1016, 500, 'Insuffisance exocrine (modèle)', 'pz-h', null, ev);
      const BW = 520, bx = 1020, by = 560;
      a.el('rect', { x: bx, y: by, width: BW, height: 18, rx: 9, class: 'lvl-bg' }, ev);
      const bar = a.el('rect', { x: bx, y: by, width: BW, height: 18, rx: 9, class: 'lvl-bar', style: '--mc: var(--o-pancreas)' }, ev);
      a.path(`M ${bx + BW * 0.2},${by - 10} L ${bx + BW * 0.2},${by + 30}`, 'pz-arr bad', ev);
      a.text(bx + BW * 0.2, by + 50, ['seuil : 80 % de la', 'fonction perdue'], 'pz-s', { anchor: 'middle', lh: 1.2 }, ev);
      a.text(bx, by - 12, 'Fonction exocrine', 'pz-s', null, ev);
      const fv = a.text(bx + BW, by - 12, '', 'pz-v', { anchor: 'end' }, ev);
      labLine(a, 1020, 650, 'steat', 'Graisses fécales', ev);
      labLine(a, 1240, 650, 'elast', 'Élastase fécale', ev);
      a.dyn(() => { const f = clamp(sim.p.exo, 0, 1); bar.setAttribute('width', (BW * f).toFixed(1)); const t = Math.round(f * 100) + ' %'; if (fv._t !== t) { fv._t = t; fv.textContent = t; } });
      [['Pancréas normal', 'repas'], ['IPE', 'ipe'], ['IPE + extraits', 'ipeT']].forEach(([l, id], i) => scenBtn(a, 1000 + i * 188, 745, 178, l, id));
      card(a, 1000, 800, 560, 'Stéatorrhée', ['Selles abondantes, claires, nauséabondes, flottantes, collantes ; gaz (SNFGE p. 13).', 'Tests : graisses fécales > 6 g/24 h sous 100 g/j de lipides ; élastase < 100 µg/g = IPE, > 200 = normale (SNFGE p. 16).'], { info: 'pzp-ipe', color: 'p-amber', n: 74 });
      card(a, 60, 600, 520, 'Douleur pancréatique', ['Épigastrique (« solaire ») ou hypochondre gauche, irradiant dans le dos, parfois en ceinture.', 'Intense, aggravée par les repas et l\'alcool, calmée par le chien de fusil ; nausées, vomissements, pas de fièvre.', 'Diagnostics différentiels : colique hépatique, ulcère, reflux, causes vasculaires (SNFGE p. 11-13).'], { info: 'pzp-pain', color: 'p-gold', n: 66 });
      zoomPill(a, 60, 900, 200, 'Pancréas exocrine', 'panc-exo');
      HV.spotlight(patDef, a, [
        { t: 'Trois façons d\'activer les enzymes', d: 'Colocalisation zymogènes – lysosomes (alcool), obstruction de l\'ampoule (calcul), trypsine sans frein (forme héréditaire) (SNFGE p. 10).', spot: [[60, 180, 400, 340]] },
        { t: 'Autodigestion et inflammation', d: 'Les enzymes actives digèrent la glande ; les cytokines peuvent entraîner des défaillances viscérales. Forme nécrosante dans 20 % des cas.', spot: [[600, 270, 380, 450]] },
        { t: 'De la répétition à la fibrose', d: 'Les poussées répétées laissent une fibrose, des sténoses et des calcifications : pancréatite chronique calcifiée.', spot: [[1000, 170, 560, 290]] },
        { t: 'Le seuil de 80 %', d: 'La stéatorrhée n\'apparaît qu\'après la perte de plus de 80 % de la fonction. Comparez IPE et IPE + extraits.', spot: [[1000, 470, 560, 320]] }
      ]);
    }
  }, COL(1)));

  /* =====================================================================
     Hormones digestives : siège, stimulus, actions sur le tube digestif
     ===================================================================== */
  const H = [
    ['gastrin', 'Gastrine', 'G · antre, duodénum', 'protéines, distension ; freinée par l\'acide', 'sécrétion acide, trophicité fundique', 'p-red2', 'pzg-a', 'tne-gastrinome'],
    ['ghr', 'Ghréline', 'X/A · fundus', 'jeûne', 'faim, vidange gastrique', 'p-amber', 'pzg-f', null],
    ['hist', 'Histamine', 'ECL · fundus', 'gastrine', 'sécrétion acide (H2)', 'p-rose', 'pzg-f', null],
    ['sst', 'Somatostatine', 'D · estomac, duodénum, îlots', 'acide, repas', 'freine gastrine, acide, pancréas, vésicule, insuline', 'p-grey', 'pzg-a', 'tne-somatostatinome'],
    ['secretin', 'Sécrétine', 'S · duodénum', 'acidité du chyme', 'eau et bicarbonates pancréatiques (SNFGE)', 'p-teal', 'pzg-d', 'panc-exo'],
    ['cck', 'CCK', 'I · duodénum, jéjunum', 'acides gras, acides aminés', 'enzymes, contraction vésiculaire (SNFGE)', 'p-gold', 'pzg-d', 'panc-exo'],
    ['gip', 'GIP', 'K · duodénum, jéjunum', 'glucose, lipides', 'incrétine : insuline glucose-dépendante', 'p-violet', 'pzg-d', 'incretines'],
    ['mot', 'Motiline', 'M · duodénum', 'jeûne (cycles)', 'complexe moteur migrant interdigestif', 'p-brown', 'pzg-d', null],
    ['glp1', 'GLP-1, PYY', 'L · iléon, côlon', 'nutriments', 'incrétine, satiété, frein de la vidange', 'p-green', 'pzg-i', 'incretines'],
    ['ser', 'Sérotonine', 'EC · tout le tube', 'distension', 'motricité, sécrétion ; syndrome carcinoïde', 'p-orange2', 'pzg-i', null],
    ['vip', 'VIP', 'neurones des plexus', 'réflexes locaux', 'sécrétion d\'eau, relâchement, vasodilatation', 'p-magenta', 'pzg-i', 'tne-vipome'],
    ['islets', 'Insuline, glucagon, PP', 'îlots · β, α, PP', 'glycémie, repas', 'glycémie ; PP freine le pancréas exocrine', 'p-blue2', 'pzg-p', 'islet']
  ];
  Object.assign(HV.INFO, {
    'pzg-f': { t: 'Fundus gastrique', k: 'Cellules pariétales, ECL, X/A', d: 'Acide, histamine, ghréline (complément).' },
    'pzg-a': { t: 'Antre gastrique', k: 'Cellules G et D', d: 'Gastrine et somatostatine : la boucle acide – gastrine (complément).' },
    'pzg-d': { t: 'Duodénum, jéjunum', k: 'Cellules S, I, K, M', d: 'Sécrétine et CCK commandent le pancréas exocrine (SNFGE p. 10) ; GIP, motiline (complément).' },
    'pzg-i': { t: 'Iléon, côlon', k: 'Cellules L, EC ; plexus', d: 'GLP-1, PYY, sérotonine, VIP (complément).' },
    'pzg-p': { t: 'Pancréas endocrine', k: 'Îlots (1 à 2 % de la masse, SNFGE p. 7)', d: 'Insuline, glucagon, somatostatine, polypeptide pancréatique.' }
  });
  H.forEach((r) => { HV.INFO['pzg-h-' + r[0]] = { t: r[1], k: 'Cellules ' + r[2], d: 'Stimulus : ' + r[3] + '. Actions : ' + r[4] + '.' + (['secretin', 'cck'].includes(r[0]) ? '' : ' (complément)') + (r[7] ? ' Clic : loupe correspondante.' : '') }; });
  const giDef = HV.scene(Object.assign({
    id: 'panc-gi', loupe: 'Hormones digestives', title: 'Hormones digestives et pancréatiques', level: 'Notion',
    lead: 'Le tube digestif est le plus grand organe endocrine : des cellules entéroendocrines dispersées de l\'estomac au côlon répondent au contenu de la lumière et commandent la sécrétion acide, le pancréas, la vésicule, la motricité et la glycémie. Les tumeurs neuroendocrines reproduisent l\'action de ces hormones, sans frein. Seules la sécrétine et la CCK sont détaillées dans le chapitre SNFGE ; le reste est un complément de physiologie.',
    points: ['Sécrétine (cellules S) → bicarbonates ; CCK (cellules I) → enzymes et vésicule (SNFGE p. 10).', 'Gastrine → acide ; somatostatine → frein général (complément).', 'GIP et GLP-1 : incrétines ; PYY, ghréline : satiété et faim (complément).', 'VIP : sécrétion intestinale ; sérotonine : motricité (syndrome carcinoïde des TNE du grêle, TNCD p. 5).'],
    source: SRC_EXO + ' Hormones autres que la sécrétine et la CCK : complément.',
    legend: new Set(['gastrin', 'sst', 'secretin', 'cck', 'vip', 'insulin', 'glucagon', 'ppol']),
    build(g, a) {
      a.frame('Hormones digestives et pancréatiques', 'Cellule, siège, stimulus et actions sur le tube digestif');
      // Tube digestif schématique (colonne de gauche)
      const seg = (y, h, label, info, cls) => {
        const sg = a.el('g', { 'data-info': info });
        a.el('rect', { x: 90, y, width: 190, height: h, rx: 40, class: cls }, sg);
        a.text(185, y + h / 2 + 6, label, 'pz-t', { anchor: 'middle' }, sg);
        return sg;
      };
      seg(170, 120, 'Fundus', 'pzg-f', 'pz-stomach');
      seg(300, 110, 'Antre', 'pzg-a', 'pz-stomach');
      seg(420, 170, 'Duodénum, jéjunum', 'pzg-d', 'pz-panc');
      seg(600, 170, 'Iléon, côlon', 'pzg-i', 'pz-panc');
      seg(780, 120, 'Pancréas (îlots)', 'pzg-p', 'pz-panc');
      const Y = { 'pzg-f': [190, 270], 'pzg-a': [320, 390], 'pzg-d': [440, 570], 'pzg-i': [620, 750], 'pzg-p': [800, 880] }, used = {};
      // Tableau
      const x0 = 360, rh = 62;
      ['Hormone', 'Cellule · siège', 'Stimulus', 'Actions sur le tube digestif'].forEach((t, j) => a.text([x0 + 16, x0 + 230, x0 + 490, x0 + 790][j], 186, t, 'pz-tab-h'));
      H.forEach((r, i) => {
        const y = 200 + i * rh;
        const rg = a.el('g', { 'data-info': 'pzg-h-' + r[0], style: `--c: var(--${r[5]})` });
        a.el('rect', { x: x0, y, width: 1200, height: rh - 8, rx: 12, class: 'pz-box' }, rg);
        a.text(x0 + 16, y + 34, r[1], 'pz-t', null, rg);
        a.text(x0 + 230, y + 34, r[2], 'pz-tab', null, rg);
        const w3 = wrap(r[3], 34), w4 = wrap(r[4], 50);
        a.text(x0 + 490, y + (w3.length > 1 ? 22 : 34), w3, 'pz-s', { lh: 1.2 }, rg);
        a.text(x0 + 790, y + (w4.length > 1 ? 22 : 34), w4, 'pz-tab', { lh: 1.2 }, rg);
        if (r[7]) a.zoomable(rg, r[7]);
        // Pastille sur le tube digestif, reliée à la ligne
        const k = used[r[6]] = (used[r[6]] || 0) + 1;
        const [y0] = Y[r[6]], py = y0 + (k - 1) * 26;
        a.el('circle', { cx: 300, cy: py, r: 9, class: 'pz-cell', style: `--c: var(--${r[5]})`, 'data-info': 'pzg-h-' + r[0] });
        a.path(`M 309,${py} C 330,${py} 335,${y + 28} ${x0},${y + 28}`, 'connector', null, { style: `stroke: var(--${r[5]})` });
      });
      a.text(x0, 972, 'Clic sur une ligne : loupe ou modèle de TNE correspondant (sécrétine, CCK : SNFGE p. 10 ; le reste : complément).', 'pz-s');
      HV.spotlight(giDef, a, [
        { t: 'L\'estomac', d: 'Gastrine (antre) → acide ; histamine (ECL) ; ghréline (faim) ; somatostatine (frein).', spot: [[185, 290, 130], [x0, 200, 1200, 4 * rh]] },
        { t: 'Le duodénum commande le pancréas', d: 'Sécrétine → bicarbonates, CCK → enzymes et vésicule (SNFGE p. 10). GIP : incrétine ; motiline : motricité de jeûne.', spot: [[185, 505, 120], [x0, 200 + 4 * rh, 1200, 4 * rh]] },
        { t: 'L\'intestin distal et les plexus', d: 'GLP-1 et PYY freinent la vidange et donnent la satiété ; sérotonine et VIP règlent motricité et sécrétion.', spot: [[185, 685, 120], [x0, 200 + 8 * rh, 1200, 3 * rh]] },
        { t: 'Et les TNE ?', d: 'Chaque TNE fonctionnelle amplifie une ligne de ce tableau : gastrine, insuline, glucagon, VIP, somatostatine. Cliquez la ligne pour son modèle.', spot: [[x0, 200, 1200, 12 * rh]] }
      ]);
    }
  }, COL(2)));
})();
