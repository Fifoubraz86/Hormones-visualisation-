/* Loupes transversales, rangée sous la silhouette de l'atlas : signalisation, interactions entre axes,
   rythmes sur 24 h, NEM, pièges de dosage, cibles des traitements.
   Sources : polycopié de sémiologie endocrinienne du CEEDMM (pages PDF citées « p. »). Tout le reste est marqué « (complément). » */
(function () {
  'use strict';
  const HV = window.HV;
  const clamp = HV.clamp;
  // Rangée centrée sous la silhouette (repère de l'atlas) : vignettes 144 × 90.
  const ROW = (k) => ({ parent: 'atlas', x: 330 + k * 165, y: 1050, scale: 0.09 });
  const SRC = 'Source : Polycopié de sémiologie endocrinienne, CEEDMM, 2e édition (2023) (pages PDF citées « p. », partie 1 sauf mention « partie 2 »). Le reste est marqué « complément ».';

  /* ---------- Outils communs ---------- */
  const box = (a, x, y, w, h, color, parent, attrs) => a.el('rect', Object.assign({ x, y, width: w, height: h, rx: 14, class: 'ztr-box', style: `--c: var(--${color})` }, attrs || {}), parent);
  const setCls = (el, cls, on) => { if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on); };
  // Après HV.spotlight : exécute `fn(i)` à chaque changement d'étape.
  const onStep = (def, fn) => {
    const base = def.stepTo;
    def.stepTo = (i) => { base(i); fn(i); };
  };

  /* =====================================================================
     1. Récepteurs et signalisation
     ===================================================================== */
  Object.assign(HV.INFO, {
    'ztr-sig-nuc': { t: 'Récepteurs nucléaires', k: 'Stéroïdes, T3, calcitriol (complément)', d: 'Hormones liposolubles : elles traversent la membrane et se lient à un récepteur intracellulaire. Le complexe se fixe sur l\'ADN (éléments de réponse) et modifie la transcription de gènes cibles. L\'effet est lent (heures) mais durable.' },
    'ztr-sig-gs': { t: 'RCPG couplés à Gs', k: 'ACTH, TSH, LH, FSH, glucagon, PTH, ADH (récepteur V2) (complément)', d: 'Récepteur à sept domaines transmembranaires. La protéine Gs active l\'adénylate cyclase : l\'AMPc monte et active la protéine kinase A, qui phosphoryle des enzymes, des canaux et le facteur de transcription CREB. Effet en secondes à minutes.' },
    'ztr-sig-gq': { t: 'RCPG couplés à Gq', k: 'TRH, GnRH, angiotensine II, ADH (récepteur V1) (complément)', d: 'La protéine Gq active la phospholipase C β, qui coupe le PIP2 en IP3 et DAG. L\'IP3 libère le Ca²⁺ du réticulum endoplasmique ; le DAG active la protéine kinase C. Effet rapide : sécrétion, contraction (vasoconstriction pour V1 et angiotensine II).' },
    'ztr-sig-jak': { t: 'Récepteurs à activité JAK – STAT', k: 'GH, prolactine, leptine (famille des récepteurs des cytokines) (complément)', d: 'Le récepteur n\'a pas d\'activité enzymatique propre : la fixation de l\'hormone rapproche deux chaînes et active les kinases JAK associées, qui phosphorylent les STAT. Les STAT dimérisés gagnent le noyau et activent des gènes (par exemple l\'IGF-1 dans le foie sous l\'effet de la GH).' },
    'ztr-sig-tk': { t: 'Récepteurs à activité tyrosine kinase', k: 'Insuline, IGF-1 (complément)', d: 'La fixation de l\'hormone active le domaine tyrosine kinase du récepteur (autophosphorylation), qui phosphoryle les substrats IRS. Deux voies : PI3K – Akt (métabolique : translocation de GLUT4, glycogenèse) et MAPK (croissance, mitogenèse). GLUT4 insulino-dépendant : p. 29-30, partie 2.', src: 'Polycopié partie 2, p. 29-30 (GLUT4) · reste : complément' }
  });
  const sigDef = HV.scene(Object.assign({
    id: 'signal', loupe: 'Signalisation',
    title: 'Récepteurs et signalisation', level: 'Notion',
    lead: 'Une hormone n\'agit que sur les cellules qui portent son récepteur. Les hormones liposolubles (stéroïdes, hormones thyroïdiennes, calcitriol) agissent dans le noyau ; les hormones peptidiques et les catécholamines se lient à des récepteurs membranaires qui relaient le signal par une cascade intracellulaire. Ce schéma est un complément de physiologie générale au polycopié.',
    points: [
      'Récepteurs nucléaires : transcription de gènes, effet lent et durable (complément).',
      'RCPG – Gs : AMPc → PKA (ACTH, TSH, LH, FSH, glucagon, PTH, ADH-V2) (complément).',
      'RCPG – Gq : IP3 → Ca²⁺ et DAG → PKC (TRH, GnRH, angiotensine II, ADH-V1) (complément).',
      'JAK – STAT : GH, prolactine, leptine ; tyrosine kinase : insuline, IGF-1 (complément).',
      'Le récepteur V2 de l\'ADH, dans le tubule rénal, fait réabsorber l\'eau par les aquaporines (p. 50).'
    ],
    source: SRC,
    legend: new Set(['cortisol', 'acth', 'trh', 'gh', 'insulin']),
    build(g, a) {
      a.frame('Récepteurs et signalisation', 'Cinq façons de transmettre le message hormonal à la cellule');
      const COLS = [
        { k: 'nuc', name: 'Récepteur nucléaire', h: ['stéroïdes, T3,', 'calcitriol'], mol: 'cortisol', c: 'p-violet',
          steps: ['Récepteur intracellulaire', 'Dimère → noyau', 'Fixation à l\'ADN', 'Transcription ↑ ou ↓', 'Protéines nouvelles'], nuc: [2, 3], eff: ['Effet lent', 'heures à jours'] },
        { k: 'gs', name: 'RCPG – Gs', h: ['ACTH, TSH, LH, FSH, glucagon,', 'PTH, ADH (V2)'], mol: 'acth', c: 'p-sky',
          steps: ['Protéine Gαs', 'Adénylate cyclase', 'ATP → AMPc ↑', 'Protéine kinase A', 'Phosphorylations, CREB'], eff: ['Effet rapide', 'secondes à minutes'] },
        { k: 'gq', name: 'RCPG – Gq', h: ['TRH, GnRH, angiotensine II,', 'ADH (V1)'], mol: 'trh', c: 'p-lime',
          steps: ['Protéine Gαq', 'Phospholipase C β', 'PIP2 → IP3 + DAG', 'Ca²⁺ ↑ (RE) · PKC', 'Sécrétion, contraction'], eff: ['Effet rapide', 'secondes à minutes'] },
        { k: 'jak', name: 'JAK – STAT', h: ['GH, prolactine,', 'leptine'], mol: 'gh', c: 'p-teal',
          steps: ['Dimère de récepteurs', 'JAK activées', 'STAT phosphorylés', 'Dimère STAT → noyau', 'Gènes cibles (IGF-1…)'], nuc: [4, 4], eff: ['Effet plus lent', 'transcription'] },
        { k: 'tk', name: 'Tyrosine kinase', h: ['insuline,', 'IGF-1'], mol: 'insulin', c: 'p-orange',
          steps: ['Autophosphorylation', 'Substrats IRS', 'PI3K → Akt', 'GLUT4 → membrane', 'MAPK : croissance'], eff: ['Rapide (glucose)', 'et lent (croissance)'] }
      ];
      const SY = [452, 527, 602, 677, 762];
      const boxes = [];
      COLS.forEach((col, i) => {
        const x0 = 60 + i * 300, cx = x0 + 140;
        const G = a.el('g', { 'data-info': 'ztr-sig-' + col.k });
        a.text(cx, 182, col.name, 'lbl', { anchor: 'middle' }, G);
        a.text(cx, 212, col.h, 'note', { anchor: 'middle', lh: 1.25 }, G);
        a.el('rect', { x: x0, y: 390, width: 280, height: 432, rx: 40, class: 'ztr-cell', style: `--c: var(--${col.c})` }, G);
        a.text(x0 + 268, 380, 'membrane', 'ztr-s', { anchor: 'end' }, G);
        if (col.nuc) {
          const y0 = SY[col.nuc[0]] - 34, y1 = SY[col.nuc[1]] + 34;
          a.el('rect', { x: x0 + 12, y: y0, width: 256, height: y1 - y0, rx: (y1 - y0) / 2, class: 'ztr-nuc' }, G);
          a.text(x0 + 262, y0 - 4, 'noyau', 'ztr-s', { anchor: 'end' }, G);
        }
        // Récepteur dans la membrane (sauf récepteur nucléaire)
        if (col.k !== 'nuc') {
          const r = a.el('g', { transform: `translate(${cx} 390)` }, G);
          if (col.k === 'jak' || col.k === 'tk') {
            [-14, 14].forEach((dx) => a.el('rect', { x: dx - 8, y: -30, width: 16, height: 60, rx: 7, class: 'chan', style: `fill: var(--${col.c})` }, r));
          } else {
            for (let k = 0; k < 7; k++) a.el('rect', { x: -31 + k * 9, y: -24, width: 7, height: 48, rx: 3, class: 'chan', style: `fill: var(--${col.c})` }, r);
          }
        }
        // Flèches entre les étapes
        for (let k = 0; k < SY.length - 1; k++) a.path(`M ${cx},${SY[k] + 22} L ${cx},${SY[k + 1] - 24}`, 'ztr-arrow', G);
        const bs = col.steps.map((s, k) => {
          const bw = 236, bx = cx - bw / 2;
          const b = box(a, bx, SY[k] - 22, bw, 44, col.c, G);
          a.text(cx, SY[k] + 6, s, 'ztr-t', { anchor: 'middle' }, G);
          return b;
        });
        boxes.push(bs);
        a.text(cx, 870, col.eff[0], 'lbl-s strong', { anchor: 'middle' }, G);
        a.text(cx, 896, col.eff[1], 'note', { anchor: 'middle' }, G);
        // Hormone qui arrive, puis signal qui descend la cascade
        a.flow(`M ${cx},250 L ${cx},${col.k === 'nuc' ? 425 : 360}`, { mol: col.mol, rate: () => 0.7, size: 1.3, speed: 60, track: false, max: 4 });
      });
      a.text(800, 950, 'Tout ce schéma relève de la physiologie générale (complément) · récepteur V2 de l\'ADH : polycopié p. 50', 'note', { anchor: 'middle' });
      // La « vague » d'activation parcourt chaque cascade ; la voie nucléaire est plus lente.
      let t = 0;
      a.dyn((dt) => {
        t += dt;
        boxes.forEach((bs, i) => {
          const period = i === 0 || i === 3 ? 7 : 3.5;
          const ph = ((t + i * 0.6) % period) / period;
          const on = Math.floor(ph * 6.5);
          bs.forEach((b, k) => setCls(b, 'on', k === on || k === on - 1));
        });
      });
      const col = (i) => [[50 + i * 300, 150, 300, 770]];
      HV.spotlight(sigDef, a, [
        { t: 'Hormone liposoluble ou hydrosoluble', d: 'Les stéroïdes, la T3 et le calcitriol traversent la membrane : leur récepteur est intracellulaire. Les hormones peptidiques ne la traversent pas : leur récepteur est membranaire et le message est relayé par un second messager (complément).', spot: [[50, 230, 1500, 190]] },
        { t: 'Récepteurs nucléaires', d: 'Le complexe hormone – récepteur se fixe sur l\'ADN et modifie la transcription. Effet lent (heures à jours) et durable : cortisol, aldostérone, stéroïdes sexuels, T3, calcitriol (complément).', spot: col(0) },
        { t: 'RCPG – Gs : l\'AMPc', d: 'Gs active l\'adénylate cyclase ; l\'AMPc active la PKA. Voie de l\'ACTH, de la TSH, de LH et FSH, du glucagon, de la PTH et de l\'ADH sur le récepteur V2 rénal (complément ; V2 : p. 50).', spot: col(1) },
        { t: 'RCPG – Gq : le calcium', d: 'Gq active la phospholipase C : l\'IP3 libère le calcium, le DAG active la PKC. Voie de la TRH, de la GnRH, de l\'angiotensine II et de l\'ADH sur le récepteur V1 vasculaire (complément).', spot: col(2) },
        { t: 'JAK – STAT', d: 'La GH, la prolactine et la leptine activent des kinases JAK associées au récepteur, qui phosphorylent les STAT ; ceux-ci régulent des gènes dans le noyau, comme l\'IGF-1 hépatique pour la GH (complément).', spot: col(3) },
        { t: 'Tyrosine kinase', d: 'Les récepteurs de l\'insuline et de l\'IGF-1 sont des tyrosine kinases. La voie PI3K – Akt fait migrer GLUT4 vers la membrane (muscle, tissu adipeux) ; la voie MAPK favorise la croissance (complément ; GLUT4 : p. 29-30, partie 2).', spot: col(4) },
        { t: 'Vitesse d\'action', d: 'Les voies membranaires (Gs, Gq) agissent en secondes à minutes ; les voies qui passent par la transcription (récepteurs nucléaires, STAT) en heures (complément).', spot: [[50, 845, 1500, 70]] }
      ]);
    }
  }, ROW(0)));

  /* =====================================================================
     2. Interactions entre axes
     ===================================================================== */
  const ARCS = [
    { id: 'a1', from: 'cort', to: 'tsh', kind: 'inhib', lbl: 'TSH ↓ *', c: true, t: 'Le cortisol freine l\'axe thyréotrope', k: 'Stress, Cushing, corticothérapie (complément)', d: 'Un excès de glucocorticoïdes freine la sécrétion de TSH : la TSH peut être basse sans maladie thyroïdienne.' },
    { id: 'a2', from: 'cort', to: 'gnrh', kind: 'inhib', lbl: 'hypogonadisme', c: false, t: 'Le cortisol freine l\'axe gonadotrope', k: 'Polycopié p. 58', d: 'Le syndrome de Cushing comporte des signes d\'insuffisance gonadotrope (troubles des règles, baisse de la libido). Mécanisme : freinage de la GnRH et des gonadotrophines par l\'hypercortisolisme (complément).', src: 'Polycopié p. 58' },
    { id: 'a3', from: 'cort', to: 'gh', kind: 'inhib', lbl: 'GH ↓ *', c: true, t: 'Le cortisol freine l\'axe somatotrope', k: 'Complément', d: 'L\'hypercortisolisme freine la GH : chez l\'enfant, le Cushing ralentit la croissance staturale alors que le poids augmente.' },
    { id: 'a4', from: 'prl', to: 'gnrh', kind: 'inhib', lbl: 'pulsatilité ↓', c: false, t: 'L\'hyperprolactinémie freine la GnRH', k: 'Polycopié p. 62', d: 'Dans les deux sexes, une hyperprolactinémie peut être source d\'une insuffisance gonadotrope fonctionnelle par inhibition de la pulsatilité de la GnRH. Il faut la rechercher et la corriger avant d\'affirmer un déficit gonadotrope lésionnel.', src: 'Polycopié p. 62' },
    { id: 'a5', from: 'levo', to: 'isur', kind: 'cause', lbl: 'clairance du cortisol ↑ *', c: true, t: 'La lévothyroxine peut démasquer une insuffisance surrénale', k: 'Complément', d: 'Les hormones thyroïdiennes accélèrent le catabolisme du cortisol. Chez un patient dont l\'insuffisance corticotrope ou surrénale n\'est pas traitée, débuter la lévothyroxine peut déclencher une insuffisance surrénale aiguë : on substitue d\'abord le cortisol (hydrocortisone), puis la thyroïde.' },
    { id: 'a6', from: 'hypot', to: 'prl', kind: 'cause', lbl: 'TRH ↑ → prolactine ↑', c: false, t: 'L\'hypothyroïdie élève la prolactine', k: 'Polycopié p. 49, 56, 21', d: 'La TRH stimule la sécrétion de prolactine (p. 49). L\'hypothyroïdie profonde est une cause d\'hyperprolactinémie à écarter (p. 56) ; une galactorrhée est possible dans les hypothyroïdies sévères (p. 21).', src: 'Polycopié p. 21, 49, 56' },
    { id: 'a7', from: 'denut', to: 'gnrh', kind: 'inhib', lbl: 'aménorrhée hypothalamique *', c: true, t: 'Dénutrition et aménorrhée hypothalamique', k: 'Complément', d: 'Le déficit énergétique (anorexie mentale, dénutrition, sport intensif) ralentit la pulsatilité de la GnRH : LH, FSH et œstradiol sont bas, avec une aménorrhée. Le polycopié cite la dénutrition extrême parmi les causes fonctionnelles d\'hypothyroïdie centrale (p. 19).', src: 'Polycopié p. 19 (dénutrition extrême) · reste : complément' },
    { id: 'a8', from: 'denut', to: 't3', kind: 'cause', lbl: 'T3 basse', c: false, t: 'Syndrome de basse T3', k: 'Polycopié p. 22', d: 'Chez les patients atteints d\'une maladie aiguë ou chronique sévère, un syndrome de basse T3L est souvent observé, en lien avec un stress somatique et sans lien avec un dysfonctionnement thyroïdien (p. 22). La dénutrition en est une cause classique (complément) : il ne faut pas traiter par hormones thyroïdiennes.', src: 'Polycopié p. 22' },
    { id: 'a9', from: 'ic', to: 'hyna', kind: 'cause', lbl: 'ADH inappropriée', c: false, t: 'Insuffisance corticotrope et hyponatrémie', k: 'Polycopié p. 60-61', d: 'L\'hyponatrémie, modeste, traduit l\'opsiurie (retard à l\'élimination de l\'eau), elle-même témoin d\'une sécrétion inappropriée d\'ADH : c\'est une hyponatrémie de dilution.', src: 'Polycopié p. 60-61' }
  ];
  ARCS.forEach((r) => { HV.INFO['ztr-arc-' + r.id] = { t: r.t, k: r.k, d: r.d, src: r.src }; });
  Object.assign(HV.INFO, {
    'ztr-n-cort': { t: 'Excès de cortisol', k: 'Stress, syndrome de Cushing, corticothérapie', d: 'Le cortisol freine la CRH et l\'ACTH (p. 72-73), mais aussi d\'autres axes hypophysaires.' },
    'ztr-n-levo': { t: 'Lévothyroxine', k: 'Traitement substitutif de l\'hypothyroïdie', d: 'Introduction progressive chez les patients très âgés ou coronariens (p. 21). Vérifier l\'axe corticotrope avant de la débuter en cas d\'insuffisance antéhypophysaire (complément).', src: 'Polycopié p. 21' },
    'ztr-n-isur': { t: 'Insuffisance surrénale démasquée', k: 'Risque d\'insuffisance surrénale aiguë (complément)', d: 'Le cortisol disponible devient insuffisant quand sa dégradation s\'accélère.' },
    'ztr-n-tsh': { t: 'Axe thyréotrope', k: 'TRH → TSH → T4, T3', d: 'Freiné par l\'excès de cortisol (complément) et par la dénutrition extrême (p. 19).' },
    'ztr-n-gnrh': { t: 'Axe gonadotrope', k: 'GnRH pulsatile → LH, FSH', d: 'Sensible à de nombreux signaux : prolactine, cortisol, état nutritionnel.' },
    'ztr-n-gh': { t: 'Axe somatotrope', k: 'GHRH → GH → IGF-1', d: 'Freiné par l\'hypercortisolisme (complément).' },
    'ztr-n-hypot': { t: 'Hypothyroïdie primaire', k: 'T4 ↓ → TRH et TSH ↑', d: 'La levée du rétrocontrôle augmente la TRH, qui stimule aussi les cellules lactotropes.' },
    'ztr-n-prl': { t: 'Hyperprolactinémie', k: 'Causes à écarter : grossesse, médicaments, hypothyroïdie, insuffisance rénale, macroprolactine (p. 55-56)', d: 'Freine la pulsatilité de la GnRH (p. 62).' },
    'ztr-n-denut': { t: 'Dénutrition', k: 'Anorexie mentale, déficit énergétique', d: 'Adaptation à l\'épargne énergétique : axes gonadotrope et thyréotrope ralentis (complément ; dénutrition extrême : p. 19).' },
    'ztr-n-t3': { t: 'T3 basse', k: 'Syndrome de basse T3 (p. 22)', d: 'Sans dysfonctionnement thyroïdien ; le dosage de T3L n\'est d\'ailleurs pas utile dans le bilan d\'une hypothyroïdie (p. 22).' },
    'ztr-n-ic': { t: 'Insuffisance corticotrope', k: 'ACTH et cortisol ↓', d: 'Hypoglycémie possible, hyponatrémie de dilution (p. 60-61).' },
    'ztr-n-hyna': { t: 'Hyponatrémie de dilution', k: 'Sécrétion inappropriée d\'ADH (p. 61)', d: 'Elle se corrige avec la substitution par hydrocortisone (complément).' }
  });
  const intDef = HV.scene(Object.assign({
    id: 'interactions', loupe: 'Interactions',
    title: 'Interactions entre axes', level: 'Notion',
    lead: 'Les axes endocriniens ne sont pas indépendants : l\'excès d\'une hormone peut freiner un autre axe, et un traitement peut en démasquer le déficit. Survolez chaque lien pour son explication ; l\'astérisque signale un complément au polycopié.',
    points: [
      'Hyperprolactinémie → pulsatilité de la GnRH ↓ → insuffisance gonadotrope fonctionnelle (p. 62).',
      'Cushing → signes d\'insuffisance gonadotrope (p. 58) ; freinage de la TSH et de la GH (complément).',
      'Hypothyroïdie : TRH ↑ → prolactine ↑ (p. 49, 56).',
      'Lévothyroxine avant l\'hydrocortisone : risque d\'insuffisance surrénale aiguë (complément).',
      'Insuffisance corticotrope → ADH inappropriée → hyponatrémie de dilution (p. 60-61).',
      'Maladie sévère, dénutrition → basse T3 (p. 22) ; aménorrhée hypothalamique (complément).'
    ],
    source: SRC,
    legend: new Set(),
    build(g, a) {
      a.frame('Interactions entre axes', 'Quand un axe en freine ou en démasque un autre');
      const N = {
        cort: [250, 300, 'Excès de cortisol', 'stress, Cushing', 'p-orange'],
        levo: [250, 560, 'Lévothyroxine', 'début du traitement', 'p-gold'],
        isur: [250, 800, 'Insuffisance surrénale', 'non substituée', 'p-orange'],
        tsh: [800, 230, 'Axe thyréotrope', 'TSH', 'p-sky'],
        gnrh: [800, 450, 'Axe gonadotrope', 'GnRH → LH, FSH', 'p-rose'],
        gh: [800, 670, 'Axe somatotrope', 'GH', 'p-teal'],
        hypot: [1340, 230, 'Hypothyroïdie primaire', 'TRH ↑', 'p-sky'],
        prl: [1340, 450, 'Hyperprolactinémie', 'prolactine ↑', 'p-magenta'],
        denut: [1340, 670, 'Dénutrition', 'anorexie mentale', 'p-brown'],
        t3: [1340, 880, 'T3 basse', 'syndrome de basse T3', 'p-sky'],
        ic: [560, 880, 'Insuffisance corticotrope', 'cortisol ↓', 'p-orange'],
        hyna: [1000, 880, 'Hyponatrémie', 'de dilution', 'p-blue']
      };
      const PATH = {
        a1: 'M 390,284 C 520,250 560,230 660,230',
        a2: 'M 390,314 C 520,340 560,450 660,450',
        a3: 'M 340,337 C 420,500 520,670 660,670',
        a4: 'M 1200,450 L 940,450',
        a5: 'M 250,597 L 250,763',
        a6: 'M 1340,267 L 1340,413',
        a7: 'M 1200,676 C 1060,676 950,620 900,489',
        a8: 'M 1340,707 L 1340,843',
        a9: 'M 700,880 L 860,880'
      };
      const arcsG = a.el('g');
      const nodesG = a.el('g');
      Object.keys(N).forEach((id) => {
        const [x, y, t1, t2, c] = N[id];
        const G = a.el('g', { class: 'ztr-node', 'data-info': 'ztr-n-' + id }, nodesG);
        box(a, x - 140, y - 37, 280, 74, c, G);
        a.text(x, y - 5, t1, 'ztr-t', { anchor: 'middle' }, G);
        a.text(x, y + 20, t2, 'ztr-s', { anchor: 'middle' }, G);
      });
      const arcEls = {};
      ARCS.forEach((r) => {
        const d = PATH[r.id];
        const G = a.el('g', { 'data-info': 'ztr-arc-' + r.id }, arcsG);
        const p = a.path(d, 'ztr-arc ' + r.kind, G);
        a.path(d, 'ztr-hit', G);
        const L = p.getTotalLength();
        const end = p.getPointAtLength(L), pre = p.getPointAtLength(L - 12);
        const ang = Math.atan2(end.y - pre.y, end.x - pre.x) * 180 / Math.PI;
        if (r.kind === 'inhib') {
          const s = p.getPointAtLength(L - 24);
          a.sign(s.x, s.y, 'inhib', G).set(0.6);
        } else {
          a.path('M -16,-9 L 0,0 L -16,9 Z', 'ztr-head', G, { transform: `translate(${end.x} ${end.y}) rotate(${ang})` });
        }
        const m = p.getPointAtLength(L / 2), m2 = p.getPointAtLength(L / 2 + 2);
        const vert = Math.abs(m2.x - m.x) < Math.abs(m2.y - m.y);
        const lp = { a1: [0, -16], a2: [24, -14], a3: [26, 6], a4: [0, -16], a5: [16, 6], a6: [16, 6], a7: [40, -28], a8: [16, 6], a9: [0, -16] }[r.id];
        a.text(m.x + lp[0], m.y + lp[1], r.lbl, 'ztr-lbl', { anchor: vert ? 'start' : 'middle' }, G);
        a.flow(d, { mol: 'dot', style: `fill: var(${r.kind === 'inhib' ? '--inhib' : '--p-sky'})`, rate: () => 0.9, size: 0.9, speed: 70, track: false, max: 8 });
        arcEls[r.id] = p;
      });
      const cap = a.text(1540, 970, '', 'note strong', { anchor: 'end' });
      // Légende
      const lg = a.el('g', { transform: 'translate(60 965)' });
      a.sign(10, -6, 'inhib', lg).set(0.4);
      a.text(36, 0, 'freine', 'note', null, lg);
      a.path('M 110,-6 L 150,-6', 'ztr-arc cause', lg);
      a.path('M -12,-7 L 0,0 L -12,7 Z', 'ztr-head', lg, { transform: 'translate(156 -6)' });
      a.text(166, 0, 'entraîne', 'note', null, lg);
      a.text(260, 0, '* complément (hors polycopié)', 'note', null, lg);
      // Mise en avant cyclique d'un lien, avec son titre.
      let t = 0, cur = -1, hold = null;
      const show = (i) => {
        if (i === cur) return;
        cur = i;
        ARCS.forEach((r, k) => setCls(arcEls[r.id], 'hot', k === i));
        cap.textContent = i >= 0 ? ARCS[i].t + (ARCS[i].c ? ' (complément)' : ' (' + ARCS[i].k.replace('Polycopié ', '') + ')') : '';
      };
      a.dyn((dt) => {
        t += dt;
        show(hold != null ? hold : Math.floor(t / 3.5) % ARCS.length);
      });
      HV.spotlight(intDef, a, [
        { t: 'L\'excès de cortisol freine les autres axes', d: 'Stress, syndrome de Cushing ou corticothérapie : le cortisol freine l\'axe thyréotrope et l\'axe somatotrope (complément) ; le Cushing comporte des signes d\'insuffisance gonadotrope (p. 58).', spot: [[100, 180, 860, 540]], arc: 1 },
        { t: 'L\'hyperprolactinémie freine la GnRH', d: 'Elle inhibe la pulsatilité de la GnRH : insuffisance gonadotrope fonctionnelle, à corriger avant de conclure à un déficit lésionnel (p. 62).', spot: [[640, 380, 860, 140]], arc: 3 },
        { t: 'L\'hypothyroïdie élève la prolactine', d: 'La TRH, augmentée par la levée du rétrocontrôle, stimule aussi les cellules lactotropes (p. 49) : l\'hypothyroïdie profonde est une cause d\'hyperprolactinémie (p. 56).', spot: [[1180, 180, 320, 320]], arc: 5 },
        { t: 'La lévothyroxine peut démasquer une insuffisance surrénale', d: 'Elle accélère le catabolisme du cortisol. En cas d\'insuffisance antéhypophysaire, on substitue l\'axe corticotrope avant l\'axe thyréotrope (complément).', spot: [[90, 510, 320, 340]], arc: 4 },
        { t: 'Dénutrition : axes en épargne', d: 'Aménorrhée hypothalamique par ralentissement de la GnRH (complément) ; syndrome de basse T3 sans maladie thyroïdienne (p. 22) ; dénutrition extrême et hypothyroïdie centrale (p. 19).', spot: [[920, 420, 580, 500]], arc: 6 },
        { t: 'Insuffisance corticotrope et hyponatrémie', d: 'Le déficit en cortisol entraîne une sécrétion inappropriée d\'ADH : hyponatrémie de dilution, qui se corrige avec l\'hydrocortisone (p. 60-61 ; correction : complément).', spot: [[400, 820, 760, 130]], arc: 8 }
      ]);
      onStep(intDef, (i) => { hold = i < 0 ? null : intDef.steps[i].arc; });
    }
  }, ROW(1)));

  /* =====================================================================
     3. Rythmes sur 24 heures
     ===================================================================== */
  // Profils schématiques (unités arbitraires, 0 à 1), points [heure, valeur], interpolation en cosinus.
  const prof = (pts) => (h) => {
    h = ((h % 24) + 24) % 24;
    for (let i = 0; i < pts.length - 1; i++) {
      const [h0, v0] = pts[i], [h1, v1] = pts[i + 1];
      if (h >= h0 && h <= h1) { const u = (1 - Math.cos(Math.PI * (h - h0) / (h1 - h0))) / 2; return v0 + (v1 - v0) * u; }
    }
    return pts[0][1];
  };
  const gauss = (h, c, w) => { let d = Math.abs(h - c); d = Math.min(d, 24 - d); return Math.exp(-(d * d) / (2 * w * w)); };
  const MEALS = [8, 12.5, 19.5];
  const LANES = [
    { k: 'cortisol', n: 'Cortisol', c: 'p-orange', f: prof([[0, 0.08], [2, 0.12], [4, 0.4], [6, 0.85], [7.5, 1], [9, 0.85], [12, 0.55], [13, 0.6], [16, 0.38], [20, 0.18], [23, 0.08], [24, 0.08]]), info: { t: 'Cortisol', k: 'Pic en début de matinée, nadir le soir (p. 73) ; cortisol salivaire à minuit (p. 59)', d: 'Rythme circadien de l\'ACTH : concentrations les plus élevées en début de matinée et les plus faibles le soir (p. 73). D\'où le dosage à 8 h pour l\'insuffisance surrénale (p. 88) et le cortisol salivaire à minuit pour le Cushing (p. 59).', src: 'Polycopié p. 59, 73, 88' } },
    { k: 'gh', n: 'GH', c: 'p-teal', f: (h) => 0.06 + 0.94 * gauss(h, 0, 0.55) + 0.45 * gauss(h, 2.6, 0.5) + 0.2 * gauss(h, 4.6, 0.45) + 0.12 * gauss(h, 10.5, 0.4) + 0.12 * gauss(h, 16, 0.4), info: { t: 'Hormone de croissance', k: 'Pulsatile, surtout la nuit (p. 49)', d: 'La GH est sécrétée de façon pulsatile, particulièrement la nuit (p. 49) ; le plus grand pic suit l\'endormissement, en sommeil lent profond (complément). Un dosage isolé de GH n\'a donc pas de valeur ; le déficit se confirme par des tests dynamiques (p. 63).', src: 'Polycopié p. 49, 63' } },
    { k: 'mel', n: 'Mélatonine', c: 'p-violet', f: prof([[0, 0.78], [3, 1], [6, 0.5], [8, 0.04], [20, 0.04], [21.5, 0.28], [23, 0.62], [24, 0.78]]), info: { t: 'Mélatonine', k: 'Sécrétée la nuit par l\'épiphyse (complément)', d: 'Freinée par la lumière, elle s\'élève le soir, culmine au milieu de la nuit et s\'effondre au réveil. C\'est un marqueur de l\'horloge circadienne.' } },
    { k: 'tsh', n: 'TSH', c: 'tsh', f: prof([[0, 0.9], [2, 1], [4, 0.8], [7, 0.45], [12, 0.35], [17, 0.35], [20, 0.5], [22, 0.75], [24, 0.9]]), info: { t: 'TSH', k: 'Pic nocturne (complément)', d: 'La TSH s\'élève en soirée et atteint son maximum en début de nuit. Les variations restent modestes et n\'empêchent pas d\'interpréter une TSH dosée dans la journée.' } },
    { k: 'prl', n: 'Prolactine', c: 'p-rose', f: prof([[0, 0.5], [3, 0.85], [5, 1], [7, 0.5], [9, 0.25], [12, 0.3], [15, 0.22], [22, 0.2], [23, 0.3], [24, 0.5]]), info: { t: 'Prolactine', k: 'S\'élève pendant le sommeil (complément)', d: 'La prolactine augmente après l\'endormissement. Le dosage diagnostique se fait au repos (p. 55) ; le stress l\'élève aussi (complément).', src: 'Polycopié p. 55 (dosage au repos)' } },
    { k: 'testo', n: 'Testostérone', c: 'p-blue', f: prof([[0, 0.72], [4, 0.85], [7, 1], [9, 0.95], [14, 0.8], [19, 0.7], [22, 0.68], [24, 0.72]]), info: { t: 'Testostérone', k: 'Plus élevée le matin (complément)', d: 'Chez l\'homme jeune, la testostérone est maximale le matin ; on la dose donc le matin pour ne pas conclure à tort à un déficit. Le diagnostic d\'hypogonadisme repose sur la testostéronémie totale et les gonadotrophines (p. 62).', src: 'Polycopié p. 62 (dosage) · horaire : complément' } },
    { k: 'glu', n: 'Glycémie', n2: 'Insuline', c: 'p-gold', c2: 'p-sky', f: (h) => 0.3 + MEALS.reduce((s, m) => s + 0.42 * gauss(h, m + 0.7, 0.55), 0), f2: (h) => 0.06 + MEALS.reduce((s, m) => s + 0.85 * gauss(h, m + 0.85, 0.6), 0), info: { t: 'Glycémie et insuline', k: 'Rythmées par les repas (complément)', d: 'Après chaque repas, la glycémie monte puis revient à sa valeur de jeûne ; l\'insuline suit, avec un léger décalage. La nuit, la glycémie est maintenue par la production hépatique de glucose.' } }
  ];
  LANES.forEach((L) => { HV.INFO['ztr-rh-' + L.k] = L.info; });
  Object.assign(HV.INFO, {
    'ztr-rh-night': { t: 'Sommeil', k: 'De 23 h à 7 h dans ce schéma', d: 'La plupart des rythmes sont à la fois circadiens (horloge interne) et liés au sommeil (GH, prolactine). Courbes schématiques, unités arbitraires (complément).' },
    'ztr-rh-impl': { t: 'Implications pratiques', k: 'L\'heure du prélèvement fait partie de l\'interprétation', d: 'Une valeur n\'a de sens qu\'au regard de l\'heure : un cortisol « normal » le soir peut être pathologique, un cortisol bas l\'après-midi ne prouve pas l\'insuffisance surrénale.' }
  });
  const rhDef = HV.scene(Object.assign({
    id: 'rythmes', loupe: 'Rythmes 24 h',
    title: 'Rythmes sur 24 heures', level: 'Notion',
    lead: 'Beaucoup d\'hormones varient au cours de la journée : rythme circadien (cortisol), lien au sommeil (GH, prolactine), à la nuit (mélatonine) ou aux repas (insuline). L\'heure du prélèvement conditionne l\'interprétation. Courbes schématiques, en unités arbitraires.',
    points: [
      'Cortisol : maximal en début de matinée, minimal le soir (p. 73) ; dosage à 8 h (p. 88).',
      'Cortisol salivaire à minuit et freinage minute (1 mg de dexaméthasone à 23 h, cortisol à 8 h) pour le Cushing (p. 59).',
      'GH pulsatile, surtout la nuit (p. 49) : un dosage isolé ne suffit pas (p. 63).',
      'Aldostérone et rénine : le matin, 2 h après le lever, assis depuis 5 à 15 min (p. 77).',
      'Mélatonine, TSH nocturne, prolactine du sommeil, testostérone matinale : compléments.'
    ],
    source: SRC,
    legend: new Set(['cortisol', 'gh', 'tsh', 'prl', 'testo', 'glucose', 'insulin']),
    build(g, a) {
      a.frame('Rythmes sur 24 heures', 'Courbes schématiques · unités arbitraires · sommeil de 23 h à 7 h');
      const X0 = 250, X1 = 1050, Y0 = 175, LH = 96, LIN = 80;
      const xs = (h) => X0 + (h / 24) * (X1 - X0);
      const Yb = Y0 + LANES.length * LH;
      // Nuit
      const night = a.el('g', { 'data-info': 'ztr-rh-night' });
      a.el('rect', { x: xs(0), y: Y0 - 8, width: xs(7) - xs(0), height: Yb - Y0 + 8, class: 'ztr-night' }, night);
      a.el('rect', { x: xs(23), y: Y0 - 8, width: xs(24) - xs(23), height: Yb - Y0 + 8, class: 'ztr-night' }, night);
      a.text(xs(3.5), Yb + 50, 'sommeil', 'note', { anchor: 'middle' }, night);
      // Axe des heures
      for (let h = 0; h <= 24; h += 2) {
        a.path(`M ${xs(h)},${Y0 - 8} L ${xs(h)},${Yb}`, h % 4 ? 'ztr-grid faint' : 'ztr-grid');
        if (h % 4 === 0) a.text(xs(h), Yb + 24, h + ' h', 'note', { anchor: 'middle' });
      }
      MEALS.forEach((m) => {
        a.path(`M ${xs(m)},${Yb - LH + 6} L ${xs(m)},${Yb}`, 'ztr-meal');
        a.text(xs(m), Yb + 50, 'repas', 'note', { anchor: 'middle' });
      });
      const dots = [];
      const curve = (f, top, cls, c, parent) => {
        let d = '';
        for (let i = 0; i <= 240; i++) {
          const h = i / 10, v = clamp(f(h), 0, 1.1);
          d += (i ? ' L ' : 'M ') + xs(h).toFixed(1) + ',' + (top + LIN - v * (LIN - 6)).toFixed(1);
        }
        a.path(d + ` L ${X1},${top + LIN} L ${X0},${top + LIN} Z`, 'ztr-area', parent, { style: `--c: var(--${c})` });
        a.path(d, 'ztr-curve', parent, { style: `--c: var(--${c})` });
        const dot = a.el('circle', { r: 8, class: 'ztr-dot', style: `--c: var(--${c})` }, parent);
        dots.push({ dot, f, top });
      };
      LANES.forEach((L, i) => {
        const top = Y0 + i * LH;
        const G = a.el('g', { 'data-info': 'ztr-rh-' + L.k });
        a.el('rect', { x: 50, y: top - 4, width: X1 - 50 + 20, height: LIN + 8, class: 'ztr-hitbox' }, G);
        a.path(`M ${X0},${top + LIN} L ${X1},${top + LIN}`, 'ztr-base', G);
        a.el('circle', { cx: 66, cy: top + (L.n2 ? 26 : 40), r: 7, class: 'ztr-dot', style: `--c: var(--${L.c})` }, G);
        a.text(82, top + (L.n2 ? 32 : 46), L.n, 'lbl-s strong', null, G);
        if (L.n2) {
          a.el('circle', { cx: 66, cy: top + 56, r: 7, class: 'ztr-dot', style: `--c: var(--${L.c2})` }, G);
          a.text(82, top + 62, L.n2, 'lbl-s strong', null, G);
          curve(L.f2, top, '', L.c2, G);
        }
        curve(L.f, top, '', L.c, G);
      });
      // Curseur horaire
      const cur = a.el('g');
      const cl = a.path(`M 0,${Y0 - 8} L 0,${Yb}`, 'ztr-cursor', cur);
      const ct = a.text(0, Y0 - 16, '', 'lbl-s strong', { anchor: 'middle' }, cur);
      void cl;
      // Implications pratiques
      const P = a.el('g', { 'data-info': 'ztr-rh-impl' });
      a.el('rect', { x: 1100, y: 160, width: 450, height: 790, rx: 18, class: 'side-box' }, P);
      a.text(1124, 198, 'Implications pratiques', 'lbl-h', null, P);
      const IMPL = [
        ['Cortisol à 8 h, au pic', ['insuffisance surrénale : < 5 µg/dL évocateur,', '> 18 µg/dL l\'exclut (p. 88)']],
        ['Cortisol salivaire à minuit, au nadir', ['dépistage du Cushing (p. 59)']],
        ['Freinage minute', ['1 mg de dexaméthasone à 23 h,', 'cortisol plasmatique à 8 h (p. 59)']],
        ['Aldostérone et rénine', ['le matin, 2 h après le lever,', 'assis depuis 5 à 15 min (p. 77)']],
        ['GH : un dosage isolé ne suffit pas', ['sécrétion pulsatile, surtout nocturne (p. 49) ;', 'tests dynamiques pour le déficit (p. 63)']],
        ['Prolactine : au repos', ['(p. 55)']],
        ['Testostérone : le matin', ['pic matinal (complément)']]
      ];
      let y = 238;
      IMPL.forEach(([h, ls]) => {
        a.text(1124, y, h, 'ztr-t', null, P);
        a.text(1124, y + 24, ls, 'ztr-s', { lh: 1.3 }, P);
        y += 24 + ls.length * 21 + 26;
      });
      let t = 6, hold = null;
      a.dyn((dt) => {
        if (hold != null) t = hold; else t = (t + dt * 1.2) % 24;
        const x = xs(t);
        cur.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
        const hh = Math.floor(t), mm = Math.floor((t - hh) * 60 / 15) * 15;
        ct.textContent = String(hh).padStart(2, '0') + ' h ' + String(mm).padStart(2, '0');
        dots.forEach((d) => {
          const v = clamp(d.f(t), 0, 1.1);
          d.dot.setAttribute('cx', x.toFixed(1));
          d.dot.setAttribute('cy', (d.top + LIN - v * (LIN - 6)).toFixed(1));
        });
      });
      const lane = (i, n) => [[40, Y0 + i * LH - 12, X1 - 20, LH * (n || 1)]];
      HV.spotlight(rhDef, a, [
        { t: 'Cortisol : pic du matin', d: 'Le cortisol est maximal en début de matinée, en raison du rythme circadien de l\'ACTH (p. 73). Le dosage pour une insuffisance surrénale se fait à 8 h : < 5 µg/dL (≈ 138 nmol/L) est fortement évocateur, > 18 µg/dL (≈ 500 nmol/L) exclut le diagnostic (p. 88 ; le polycopié indique 80 nmol/L pour 5 µg/dL, coquille).', spot: [...lane(0), [1100, 215, 450, 80]], h: 8 },
        { t: 'Cortisol : nadir de minuit', d: 'Le soir, le cortisol est au plus bas. Dans le syndrome de Cushing, ce nadir disparaît : d\'où le cortisol salivaire à minuit et le freinage minute (1 mg de dexaméthasone à 23 h, cortisol à 8 h) (p. 59).', spot: [...lane(0), [1100, 295, 450, 170]], h: 0 },
        { t: 'La nuit : GH, mélatonine, TSH, prolactine', d: 'La GH est pulsatile, surtout la nuit (p. 49), avec un grand pic après l\'endormissement (complément). La mélatonine, la TSH et la prolactine s\'élèvent aussi la nuit (complément).', spot: lane(1, 4), h: 0.5 },
        { t: 'Testostérone : le matin', d: 'La testostérone est plus élevée le matin : on la dose le matin (complément).', spot: [...lane(5), [1100, 830, 450, 70]], h: 8 },
        { t: 'Les repas rythment glycémie et insuline', d: 'Chaque repas fait monter la glycémie puis l\'insuline, qui la ramène à sa valeur de jeûne (complément).', spot: lane(6), h: 13.3 },
        { t: 'Lire une valeur avec son heure', d: 'L\'heure du prélèvement fait partie de l\'interprétation : cortisol, aldostérone et rénine (p. 77), testostérone. La GH pulsatile ne s\'interprète pas sur un dosage isolé (p. 63).', spot: [[1090, 150, 470, 810]], h: null }
      ]);
      onStep(rhDef, (i) => { hold = i < 0 ? null : rhDef.steps[i].h; });
    }
  }, ROW(2)));

  /* =====================================================================
     4. Néoplasies endocriniennes multiples
     ===================================================================== */
  // Silhouette de l'atlas (moitié droite, bras) : mêmes tracés, réutilisés ici.
  const HALF = 'M 0,-328 C 10,-328 17,-323 19,-314 C 21,-302 21,-294 25,-287 C 46,-277 82,-273 104,-263 C 121,-255 128,-239 124,-221 C 119,-205 108,-197 103,-186 C 103,-150 99,-110 89,-71 C 83,-47 83,-25 91,-5 C 103,23 108,51 106,84 C 104,140 96,200 87,250 C 83,276 86,300 84,330 C 82,360 71,384 67,400 C 73,412 82,420 71,426 C 56,431 38,429 30,422 C 28,404 30,388 30,372 C 26,330 22,300 24,262 C 20,210 16,160 10,110 C 6,90 4,78 0,74';
  const ARM = 'M 117,-246 C 145,-246 156,-222 156,-196 C 160,-150 165,-110 168,-74 C 172,-40 179,0 183,40 C 185,58 187,70 189,80 C 199,96 203,118 195,136 C 189,148 175,146 171,132 C 167,118 167,100 169,84 C 163,62 157,40 151,16 C 145,-14 139,-44 137,-74 C 133,-112 125,-150 115,-180 C 111,-200 108,-224 117,-246 Z';
  const mirrorX = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, x, y) => -parseFloat(x) + ',' + y);
  const drawBody = (a, parent, organs) => {
    const skin = a.el('g', { class: 'body-skin' }, parent);
    [ARM, mirrorX(ARM)].forEach((d) => a.path(d, 'body-fill body-limb', skin));
    [-1, 1].forEach((k) => a.el('ellipse', { cx: k * 45, cy: -382, rx: 7, ry: 13, class: 'body-fill' }, skin));
    a.el('ellipse', { cx: 0, cy: -385, rx: 46, ry: 58, class: 'body-fill' }, skin);
    [HALF, mirrorX(HALF)].forEach((d) => a.path(d + ' Z', 'body-fill', skin));
    [HALF, mirrorX(HALF)].forEach((d) => a.path(d, 'body-outline', skin));
    if (organs) HV.organs.bodyOrgans(a.el('g', { class: 'body-organs ztr-organs' }, parent));
  };

  Object.assign(HV.INFO, {
    'ztr-nem1': { t: 'NEM 1', k: 'Gène MEN1 (ménine, suppresseur de tumeur) · transmission autosomique dominante (complément)', d: 'Association d\'hyperparathyroïdie primaire (la plus fréquente, souvent plusieurs glandes), de tumeurs neuroendocrines duodéno-pancréatiques et d\'adénomes hypophysaires.' },
    'ztr-nem1-hpt': { t: 'Hyperparathyroïdie primaire (NEM 1)', k: 'Manifestation la plus fréquente (complément)', d: 'Atteinte de plusieurs parathyroïdes (hyperplasie ou adénomes multiples), souvent plus précoce que l\'hyperparathyroïdie sporadique.' },
    'ztr-nem1-pit': { t: 'Adénome hypophysaire (NEM 1)', k: 'Surtout prolactinome (complément)', d: 'Les autres adénomes (somatotropes, corticotropes, non sécrétants) sont possibles.' },
    'ztr-nem1-tne': { t: 'Tumeurs neuroendocrines duodéno-pancréatiques', k: 'NEM 1 (complément ; TNCD 2026, p. 14)', d: 'Incidence cumulée ≈ 90 %, souvent multiples, fonctionnelles dans 40 % des cas : gastrinome (souvent duodénal), plus rarement insulinome ; tumeurs non sécrétantes. Elles conditionnent une grande part du pronostic. Clic : classification et modèles des TNE pancréatiques.' },
    'ztr-nem2': { t: 'NEM 2', k: 'Gène RET (proto-oncogène, mutation activatrice) · autosomique dominante (complément)', d: 'NEM 2A : cancer médullaire de la thyroïde, phéochromocytome, hyperparathyroïdie. NEM 2B : cancer médullaire, phéochromocytome, névromes muqueux, morphotype marfanoïde, sans hyperparathyroïdie.' },
    'ztr-nem2-cmt': { t: 'Cancer médullaire de la thyroïde', k: 'NEM 2A et 2B : quasi constant (complément)', d: 'Tumeur des cellules C, marquée par la calcitonine. Le polycopié recommande le dosage systématique de la calcitonine dans un contexte héréditaire connu de CMT (p. 18).', src: 'Polycopié p. 18' },
    'ztr-nem2-pheo': { t: 'Phéochromocytome', k: 'NEM 2A et 2B, souvent bilatéral (complément)', d: 'À rechercher devant un syndrome de prédisposition génétique (p. 79), et à éliminer avant toute chirurgie, en particulier la thyroïdectomie (complément).', src: 'Polycopié p. 79' },
    'ztr-nem2-hpt': { t: 'Hyperparathyroïdie primaire', k: 'NEM 2A seulement (complément)', d: 'Moins fréquente et souvent moins sévère que dans la NEM 1.' },
    'ztr-nem2-nev': { t: 'Névromes muqueux, ganglioneuromatose', k: 'NEM 2B (complément)', d: 'Petits nodules des lèvres, de la langue et des paupières ; ganglioneuromatose du tube digestif (troubles du transit). Ils permettent un diagnostic clinique précoce.' },
    'ztr-nem2-marf': { t: 'Morphotype marfanoïde', k: 'NEM 2B (complément)', d: 'Grande taille, membres longs et grêles, hyperlaxité.' },
    'ztr-vhl': { t: 'Maladie de von Hippel-Lindau', k: 'Gène VHL (complément)', d: 'Phéochromocytomes et paragangliomes, hémangioblastomes du système nerveux central et de la rétine, cancer du rein à cellules claires, tumeurs neuroendocrines et kystes du pancréas.' },
    'ztr-nf1': { t: 'Neurofibromatose de type 1', k: 'Gène NF1 (complément)', d: 'Taches café au lait, neurofibromes, nodules de Lisch ; le phéochromocytome y est rare mais à rechercher devant une HTA.' },
    'ztr-sdh': { t: 'Gènes SDHx', k: 'Succinate déshydrogénase (complément)', d: 'Paragangliomes (tête et cou, thorax, abdomen) et phéochromocytomes, parfois multiples ou malins.' },
    'ztr-nem-prat': { t: 'En pratique', k: 'Complément', d: 'Enquête génétique et dépistage des apparentés ; thyroïdectomie préventive des porteurs d\'une mutation RET, à un âge qui dépend de la mutation ; toujours éliminer un phéochromocytome avant une chirurgie.' }
  });
  const nemDef = HV.scene(Object.assign({
    id: 'nem', loupe: 'NEM',
    title: 'Néoplasies endocriniennes multiples', level: 'Notion',
    lead: 'Les néoplasies endocriniennes multiples (NEM) sont des prédispositions héréditaires à des tumeurs de plusieurs glandes. La NEM 1 (gène MEN1) associe parathyroïdes, hypophyse et pancréas endocrine ; la NEM 2 (gène RET) associe cancer médullaire de la thyroïde et phéochromocytome. Ces syndromes sont un complément au polycopié, qui évoque le contexte héréditaire du cancer médullaire (p. 18) et du phéochromocytome (p. 79).',
    points: [
      'NEM 1 (MEN1) : hyperparathyroïdie primaire, adénome hypophysaire, tumeurs duodéno-pancréatiques (complément).',
      'NEM 2A (RET) : cancer médullaire de la thyroïde, phéochromocytome, hyperparathyroïdie (complément).',
      'NEM 2B (RET) : cancer médullaire, phéochromocytome, névromes muqueux, morphotype marfanoïde (complément).',
      'Calcitonine systématique dans un contexte héréditaire de CMT (p. 18) ; phéochromocytome à rechercher en cas de prédisposition génétique (p. 79).',
      'Autres prédispositions : von Hippel-Lindau, NF1, gènes SDHx (complément).'
    ],
    source: SRC,
    legend: new Set(),
    build(g, a) {
      a.frame('Néoplasies endocriniennes multiples', 'NEM 1 à gauche, NEM 2 à droite · syndromes héréditaires (complément)');
      // Silhouette (buste), estompée vers le bas.
      const defs = a.el('defs');
      const grad = a.el('linearGradient', { id: 'ztr-nem-fade', gradientUnits: 'userSpaceOnUse', x1: 0, y1: -440, x2: 0, y2: 110 }, defs);
      [[0, 1], [0.84, 1], [1, 0]].forEach(([o, op]) => a.el('stop', { offset: o, 'stop-color': '#fff', 'stop-opacity': op }, grad));
      const mask = a.el('mask', { id: 'ztr-nem-mask', maskUnits: 'userSpaceOnUse', x: -300, y: -460, width: 600, height: 580 }, defs);
      a.el('rect', { x: -300, y: -460, width: 600, height: 580, fill: 'url(#ztr-nem-fade)' }, mask);
      const S = 1.25, TX = 800, TY = 736;
      const body = a.el('g', { transform: `translate(${TX} ${TY}) scale(${S})`, mask: 'url(#ztr-nem-mask)' });
      drawBody(a, body, true);
      const P = (bx, by) => [TX + S * bx, TY + S * by];
      const M = {
        hyp: P(0, -372), lips: P(0, -344), thy: P(0, -284), ptL: P(-17, -292), ptR: P(17, -292), ptL2: P(-17, -276), ptR2: P(17, -276),
        adrL: P(-39, -96), adrR: P(39, -96), panc: P(4, -64), gut: P(0, -22), arm: P(160, -120)
      };
      const leadG = a.el('g');
      const markG = a.el('g');
      const groups = { n1: [], a: [], b: [], ab: [] };
      const mark = (pt, color, info, grp, r) => {
        const m = a.el('g', { 'data-info': info, class: 'ztr-fade' }, markG);
        a.el('circle', { cx: pt[0], cy: pt[1], r: (r || 11) + 7, class: 'ztr-halo', style: `--c: var(--${color})` }, m);
        a.el('circle', { cx: pt[0], cy: pt[1], r: r || 11, class: 'ztr-mark', style: `--c: var(--${color})` }, m);
        grp.forEach((k) => groups[k].push(m));
        return m;
      };
      const card = (x, y, w, h, color, t1, t2, info, grp, targets) => {
        const G = a.el('g', { 'data-info': info, class: 'ztr-fade' });
        box(a, x, y, w, h, color, G);
        a.text(x + 18, y + 30, t1, 'ztr-t', null, G);
        a.text(x + 18, y + 54, t2, 'ztr-s', { lh: 1.3 }, G);
        grp.forEach((k) => groups[k].push(G));
        (targets || []).forEach((tp) => {
          const left = x < 800, sx = left ? x + w : x, sy = y + h / 2;
          const e = a.path(`M ${sx},${sy} C ${sx + (left ? 90 : -90)},${sy} ${tp[0] + (left ? -60 : 60)},${tp[1]} ${tp[0]},${tp[1]}`, 'ztr-lead ztr-fade', leadG, { style: `--c: var(--${color})` });
          grp.forEach((k) => groups[k].push(e));
        });
        return G;
      };
      // --- NEM 1
      a.text(60, 184, 'NEM 1', 'lbl-h', { attrs: { 'data-info': 'ztr-nem1' } });
      a.text(150, 184, 'gène MEN1 · autosomique dominante', 'note', { attrs: { 'data-info': 'ztr-nem1' } });
      card(60, 205, 420, 84, 'p-teal', 'Hyperparathyroïdie primaire', 'plusieurs glandes · la plus fréquente', 'ztr-nem1-hpt', ['n1'], [M.ptL]);
      card(60, 300, 420, 84, 'p-teal', 'Adénome hypophysaire', 'surtout prolactinome', 'ztr-nem1-pit', ['n1'], [M.hyp]);
      a.zoomable(card(60, 395, 420, 84, 'p-teal', 'Tumeurs neuroendocrines ⊕', 'pancréas, duodénum (gastrinome, insulinome)', 'ztr-nem1-tne', ['n1'], [M.panc]), 'panc-tne');
      mark(M.ptL, 'p-teal', 'ztr-nem1-hpt', ['n1'], 7); mark(M.ptL2, 'p-teal', 'ztr-nem1-hpt', ['n1'], 7);
      mark(M.hyp, 'p-teal', 'ztr-nem1-pit', ['n1']);
      mark(M.panc, 'p-teal', 'ztr-nem1-tne', ['n1']);
      // --- Autres prédispositions
      a.text(60, 548, 'Autres prédispositions (complément)', 'lbl-s strong');
      card(60, 566, 420, 84, 'p-grey', 'Von Hippel-Lindau (VHL)', 'phéochromocytome, hémangioblastomes, rein', 'ztr-vhl', [], [M.adrL]);
      card(60, 661, 420, 84, 'p-grey', 'Neurofibromatose de type 1', 'taches café au lait, phéochromocytome (rare)', 'ztr-nf1', [], [M.adrL]);
      card(60, 756, 420, 84, 'p-grey', 'Gènes SDHx', 'paragangliomes, phéochromocytomes', 'ztr-sdh', [], [M.adrL]);
      a.text(60, 878, ['Polycopié p. 79 : rechercher un phéochromocytome', 'devant un syndrome de prédisposition génétique.'], 'note', { lh: 1.3 });
      // --- NEM 2
      a.text(1120, 184, 'NEM 2', 'lbl-h', { attrs: { 'data-info': 'ztr-nem2' } });
      a.text(1210, 184, 'gène RET (activé) · autosomique dominante', 'note', { attrs: { 'data-info': 'ztr-nem2' } });
      const lg = a.el('g', { transform: 'translate(1120 214)' });
      [['p-orange', '2A et 2B', 0], ['p-gold', '2A seule', 150], ['p-rose', '2B seule', 290]].forEach(([c, t, dx]) => {
        a.el('circle', { cx: dx + 8, cy: -6, r: 8, class: 'ztr-mark', style: `--c: var(--${c})` }, lg);
        a.text(dx + 24, 0, t, 'note', null, lg);
      });
      card(1120, 236, 420, 84, 'p-orange', 'Cancer médullaire de la thyroïde', 'quasi constant · calcitonine (p. 18)', 'ztr-nem2-cmt', ['a', 'b', 'ab'], [M.thy]);
      card(1120, 331, 420, 84, 'p-orange', 'Phéochromocytome', 'souvent bilatéral (complément) · p. 79', 'ztr-nem2-pheo', ['a', 'b', 'ab'], [M.adrR]);
      card(1120, 426, 420, 84, 'p-gold', 'Hyperparathyroïdie primaire', 'NEM 2A seulement', 'ztr-nem2-hpt', ['a'], [M.ptR]);
      card(1120, 521, 420, 84, 'p-rose', 'Névromes muqueux', 'lèvres, langue · ganglioneuromatose digestive', 'ztr-nem2-nev', ['b'], [M.lips, M.gut]);
      card(1120, 616, 420, 84, 'p-rose', 'Morphotype marfanoïde', 'grande taille, membres longs et grêles', 'ztr-nem2-marf', ['b'], [M.arm]);
      mark(M.thy, 'p-orange', 'ztr-nem2-cmt', ['a', 'b', 'ab']);
      mark(M.adrR, 'p-orange', 'ztr-nem2-pheo', ['a', 'b', 'ab']); mark(M.adrL, 'p-orange', 'ztr-nem2-pheo', ['a', 'b', 'ab'], 8);
      mark(M.ptR, 'p-gold', 'ztr-nem2-hpt', ['a'], 7); mark(M.ptR2, 'p-gold', 'ztr-nem2-hpt', ['a'], 7);
      mark(M.lips, 'p-rose', 'ztr-nem2-nev', ['b'], 9);
      mark(M.gut, 'p-rose', 'ztr-nem2-nev', ['b'], 9);
      mark(M.arm, 'p-rose', 'ztr-nem2-marf', ['b'], 9);
      const pr = a.el('g', { 'data-info': 'ztr-nem-prat' });
      a.el('rect', { x: 1120, y: 728, width: 420, height: 150, rx: 16, class: 'side-box' }, pr);
      a.text(1140, 760, 'En pratique (complément)', 'ztr-t', null, pr);
      a.text(1140, 788, ['enquête génétique des apparentés ;', 'thyroïdectomie préventive si RET muté ;', 'éliminer un phéochromocytome', 'avant toute chirurgie'], 'ztr-s', { lh: 1.3 }, pr);
      // Syndrome mis en avant
      const nm = a.text(800, 940, '', 'lbl-h', { anchor: 'middle' });
      const ns = a.text(800, 968, '', 'note', { anchor: 'middle' });
      const PH = [
        { k: 'n1', t: 'NEM 1', s: 'parathyroïdes · hypophyse · pancréas, duodénum' },
        { k: 'a', t: 'NEM 2A', s: 'cancer médullaire · phéochromocytome · hyperparathyroïdie' },
        { k: 'b', t: 'NEM 2B', s: 'cancer médullaire · phéochromocytome · névromes · marfanoïde' }
      ];
      const all = new Set([].concat(groups.n1, groups.a, groups.b));
      let t = 0, cur = -1, hold = null;
      const show = (i) => {
        if (i === cur) return;
        cur = i;
        const on = i >= 0 && i < 3 ? new Set(groups[PH[i].k]) : all;
        all.forEach((e) => setCls(e, 'ztr-dim', !on.has(e)));
        nm.textContent = i >= 0 && i < 3 ? PH[i].t : '';
        ns.textContent = i >= 0 && i < 3 ? PH[i].s : '';
      };
      a.dyn((dt) => { t += dt; show(hold != null ? hold : Math.floor(t / 4) % 3); });
      HV.spotlight(nemDef, a, [
        { t: 'NEM 1 : les « trois P »', d: 'Gène MEN1 (ménine), transmission autosomique dominante. Parathyroïdes (hyperparathyroïdie primaire multiglandulaire, la plus fréquente), hypophyse (surtout prolactinome) et pancréas – duodénum (tumeurs neuroendocrines) (complément).', spot: [[50, 160, 440, 330], [800, 460, 220]], ph: 0 },
        { t: 'NEM 2A', d: 'Mutation activatrice de RET. Cancer médullaire de la thyroïde quasi constant, phéochromocytome souvent bilatéral, hyperparathyroïdie primaire (complément). Le polycopié recommande la calcitonine dans un contexte héréditaire de CMT (p. 18).', spot: [[1110, 160, 440, 360], [800, 470, 200]], ph: 1 },
        { t: 'NEM 2B', d: 'Cancer médullaire précoce et phéochromocytome, sans hyperparathyroïdie ; névromes muqueux des lèvres et de la langue, ganglioneuromatose digestive, morphotype marfanoïde (complément).', spot: [[1110, 510, 440, 200], [800, 330, 70], [800, 711, 50], [1000, 586, 50]], ph: 2 },
        { t: 'Autres prédispositions', d: 'Von Hippel-Lindau, neurofibromatose de type 1 et gènes SDHx exposent aux phéochromocytomes et paragangliomes (complément). Le polycopié demande de rechercher un phéochromocytome devant un syndrome de prédisposition génétique (p. 79).', spot: [[50, 525, 440, 400]], ph: 3 },
        { t: 'En pratique', d: 'Dépistage génétique des apparentés, thyroïdectomie préventive des porteurs d\'une mutation RET (âge selon la mutation), et toujours éliminer un phéochromocytome avant une chirurgie (complément).', spot: [[1110, 718, 440, 170]], ph: 3 }
      ]);
      onStep(nemDef, (i) => { hold = i < 0 ? null : nemDef.steps[i].ph; if (hold != null) cur = -2; });
    }
  }, ROW(3)));

  /* =====================================================================
     5. Pièges de dosage
     ===================================================================== */
  Object.assign(HV.INFO, {
    'ztr-ds-sand': { t: 'Immunodosage « sandwich » (immunométrique)', k: 'Grosses molécules : TSH, prolactine, LH, FSH, PTH, ACTH… (complément)', d: 'Un anticorps de capture fixé au support et un anticorps de détection marqué prennent l\'hormone en sandwich. Le signal augmente avec la concentration.' },
    'ztr-ds-comp': { t: 'Immunodosage par compétition', k: 'Petites molécules : T4L, T3L, stéroïdes… (complément)', d: 'L\'hormone du patient et une hormone marquée se disputent un nombre limité d\'anticorps. Plus il y a d\'hormone du patient, moins le marqueur se fixe : le signal diminue quand la concentration augmente.' },
    'ztr-ds-bio': { t: 'Interférence de la biotine', k: 'Complément', d: 'Beaucoup d\'automates captent les complexes grâce au couple streptavidine – biotine. La biotine du patient (fortes doses) sature la streptavidine : le signal baisse. En sandwich, le résultat est faussement bas (TSH) ; en compétition, faussement haut (T4L, T3L, et aussi les anticorps anti-récepteur de la TSH). Le tableau peut mimer une maladie de Basedow.' },
    'ztr-ds-macro': { t: 'Macroprolactinémie', k: 'Polycopié p. 56', d: 'Cause analytique d\'hyperprolactinémie : formes de prolactine de haut poids moléculaire (big ou big big prolactine), peu actives. À évoquer devant une prolactine élevée sans signe clinique ; elle se recherche par précipitation au polyéthylène glycol (PEG) (complément).', src: 'Polycopié p. 56 · PEG : complément' },
    'ztr-ds-hook': { t: 'Effet crochet', k: 'Complément', d: 'Dans un dosage sandwich en un temps, un très grand excès d\'antigène sature à la fois les anticorps de capture et de détection : peu de sandwichs se forment et le résultat est faussement modéré. Devant un macroadénome avec une prolactine modérée, il faut redoser après dilution avant de conclure à une hyperprolactinémie de déconnexion (déconnexion : p. 56).', src: 'Polycopié p. 56 (déconnexion) · effet crochet : complément' },
    'ztr-ds-het': { t: 'Anticorps hétérophiles', k: 'Polycopié p. 56 (interférence de dosage)', d: 'Des anticorps du patient dirigés contre les immunoglobulines animales du réactif peuvent relier capture et détection sans hormone : résultat faussement élevé, plus rarement abaissé (complément). Le polycopié demande un contrôle dans un autre laboratoire, avec une autre technique (p. 56).', src: 'Polycopié p. 56' },
    'ztr-ds-tbg': { t: 'Protéines de transport : TBG, CBG', k: 'Polycopié p. 8 (TBG)', d: 'Le dosage des hormones libres évite les fluctuations liées à la TBG (p. 8). Les œstrogènes et la grossesse augmentent la TBG et la CBG : T4 totale et cortisol total augmentent, les fractions libres restent normales (complément).', src: 'Polycopié p. 8 · CBG : complément' },
    'ztr-ds-hour': { t: 'Horaire et conditions du prélèvement', k: 'Polycopié p. 55, 59, 77, 88', d: 'Cortisol à 8 h (p. 88), cortisol salivaire à minuit (p. 59), aldostérone et rénine le matin 2 h après le lever, assis depuis 5 à 15 min (p. 77), prolactine au repos (p. 55) ; testostérone le matin (complément).', src: 'Polycopié p. 55, 59, 77, 88' }
  });
  const dsDef = HV.scene(Object.assign({
    id: 'dosages', loupe: 'Dosages',
    title: 'Pièges de dosage', level: 'Notion',
    lead: 'Un résultat hormonal discordant avec la clinique doit faire suspecter un piège : forme circulante inactive, interférence analytique, variation des protéines de transport, mauvais horaire. Le polycopié demande alors de contrôler le dosage dans un autre laboratoire, avec une autre technique (p. 56). Le principe des deux familles d\'immunodosage est un complément.',
    points: [
      'Sandwich : le signal augmente avec la concentration ; compétition : il diminue (complément).',
      'Macroprolactinémie : big big prolactine, peu active (p. 56) ; recherche au PEG (complément).',
      'Effet crochet : diluer devant un macroadénome à prolactine modérée (complément ; déconnexion : p. 56).',
      'Biotine : T4L et T3L faussement hautes, TSH faussement basse (complément).',
      'Hormones libres plutôt que totales quand la TBG varie (p. 8).',
      'Horaire : cortisol 8 h (p. 88), salivaire minuit (p. 59), aldostérone – rénine le matin (p. 77).'
    ],
    source: SRC,
    legend: new Set(),
    build(g, a) {
      a.frame('Pièges de dosage', 'Principe des immunodosages et six causes de résultat trompeur');
      // ----- Principe : sandwich (haut) et compétition (bas)
      const Y = (x, y, c, parent, up) => a.path(up ? `M ${x},${y} L ${x},${y - 34} M ${x},${y - 34} L ${x - 16},${y - 58} M ${x},${y - 34} L ${x + 16},${y - 58}` : `M ${x},${y} L ${x},${y + 30} M ${x},${y + 30} L ${x - 16},${y + 54} M ${x},${y + 30} L ${x + 16},${y + 54}`, 'ztr-ab', parent, { style: `--c: var(--${c})` });
      const panel = (y0, title, info) => {
        const G = a.el('g', { 'data-info': info });
        a.el('rect', { x: 60, y: y0, width: 580, height: 360, rx: 18, class: 'side-box' }, G);
        a.text(84, y0 + 36, title, 'lbl-h', null, G);
        a.el('rect', { x: 84, y: y0 + 262, width: 330, height: 14, rx: 4, class: 'ztr-solid' }, G);
        a.text(249, y0 + 300, 'support · anticorps de capture', 'ztr-s', { anchor: 'middle' }, G);
        // mini-graphe signal = f(concentration)
        a.path(`M 450,${y0 + 90} L 450,${y0 + 270} L 615,${y0 + 270}`, 'ztr-axis', G);
        a.text(450, y0 + 78, 'signal', 'ztr-s', { anchor: 'middle' }, G);
        a.text(612, y0 + 296, 'concentration', 'ztr-s', { anchor: 'end' }, G);
        return G;
      };
      const XS = [130, 200, 270, 340];
      // Sandwich
      const P1 = panel(160, 'Sandwich', 'ztr-ds-sand');
      const sand = XS.map((x) => {
        Y(x, 422, 'p-blue', P1, true);
        const an = a.el('circle', { cx: x, cy: 352, r: 14, class: 'ztr-ag' }, P1);
        const det = a.el('g', null, P1);
        Y(x, 282, 'p-green', det, false);
        a.path(`M ${x - 9},${282} l 9,-16 l 9,16 z`, 'ztr-star', det);
        return { an, det };
      });
      const c1 = a.path('M 455,425 C 520,380 560,300 610,262', 'ztr-curve', P1, { style: '--c: var(--p-green)' });
      const dot1 = a.el('circle', { r: 8, class: 'ztr-dot', style: '--c: var(--p-green)' }, P1);
      a.text(84, 492, 'signal ∝ concentration', 'ztr-t', null, P1);
      // Compétition
      const P2 = panel(540, 'Compétition', 'ztr-ds-comp');
      const comp = XS.map((x) => {
        Y(x, 802, 'p-blue', P2, true);
        const pat = a.el('circle', { cx: x, cy: 732, r: 14, class: 'ztr-ag' }, P2);
        const lab = a.el('g', null, P2);
        a.el('circle', { cx: x, cy: 732, r: 14, class: 'ztr-ag lab' }, lab);
        a.path(`M ${x - 9},${712} l 9,-16 l 9,16 z`, 'ztr-star', lab);
        return { pat, lab };
      });
      const c2 = a.path('M 455,650 C 500,740 560,790 610,800', 'ztr-curve', P2, { style: '--c: var(--p-green)' });
      const dot2 = a.el('circle', { r: 8, class: 'ztr-dot', style: '--c: var(--p-green)' }, P2);
      a.text(84, 872, 'signal inversement lié', 'ztr-t', null, P2);
      // Légende des glyphes
      const lg = a.el('g', { transform: 'translate(70 950)' });
      a.el('circle', { cx: 10, cy: -6, r: 10, class: 'ztr-ag' }, lg); a.text(28, 0, 'hormone', 'ztr-s', null, lg);
      a.path('M 122,0 l 8,-16 l 8,16 z', 'ztr-star', lg); a.text(148, 0, 'marqueur', 'ztr-s', null, lg);
      a.el('circle', { cx: 252, cy: -6, r: 10, class: 'ztr-ag lab' }, lg); a.text(270, 0, 'hormone marquée', 'ztr-s', null, lg);
      // ----- Six vignettes
      const V = [
        ['ztr-ds-macro', 'p-magenta', 'Macroprolactine', ['Prolactine élevée, sans signe clinique', 'formes de haut poids moléculaire', '(big big prolactine), peu actives', 'recherche : précipitation au PEG'], 'p. 56 · PEG : complément'],
        ['ztr-ds-hook', 'p-rose', 'Effet crochet', ['Macroprolactinome : prolactine', 'faussement modérée (excès d\'antigène', 'qui sature les deux anticorps)', '→ redoser après dilution'], 'complément · déconnexion : p. 56'],
        ['ztr-ds-bio', 'p-orange', 'Biotine (fortes doses)', ['Bloque la capture streptavidine – biotine', 'compétition : T4L, T3L faussement hautes', 'sandwich : TSH faussement basse', '→ faux tableau d\'hyperthyroïdie'], 'complément'],
        ['ztr-ds-het', 'p-violet', 'Anticorps hétérophiles', ['Anticorps anti-animaux du patient', 'qui relient capture et détection', '→ résultat faussement élevé', 'contrôle : autre technique, autre labo'], 'p. 56 · mécanisme : complément'],
        ['ztr-ds-tbg', 'p-teal', 'TBG, CBG', ['Œstrogènes, grossesse : TBG, CBG ↑', 'T4 totale, cortisol total ↑', 'fractions libres normales', '→ doser la T4 libre'], 'p. 8 · CBG, œstrogènes : complément'],
        ['ztr-ds-hour', 'p-gold', 'Horaire du prélèvement', ['Cortisol à 8 h ; salivaire à minuit', 'aldostérone, rénine : le matin,', 'assis depuis 5 à 15 min', 'testostérone le matin (complément)'], 'p. 59, 77, 88']
      ];
      V.forEach(([info, c, t1, ls, src], i) => {
        const x = 680 + (i % 2) * 440, y = 160 + Math.floor(i / 2) * 265;
        const G = a.el('g', { 'data-info': info });
        a.el('rect', { x, y, width: 420, height: 245, rx: 18, class: 'side-box' }, G);
        a.el('rect', { x, y: y + 18, width: 8, height: 209, rx: 4, class: 'ztr-stripe', style: `--c: var(--${c})` }, G);
        a.text(x + 28, y + 40, t1, 'lbl-s strong', null, G);
        a.text(x + 28, y + 76, ls, 'note', { lh: 1.3 }, G);
        a.text(x + 28, y + 222, src, 'ztr-s ztr-src', null, G);
      });
      // ----- Animation : concentration qui varie ; mode biotine par intermittence
      const bioT = a.text(84, 516, '', 'ztr-s', null, P1);
      const bioT2 = a.text(84, 896, '', 'ztr-s', null, P2);
      let t = 0, bioHold = null;
      const ptOn = (d, u) => { const p = d.getPointAtLength(u * d.getTotalLength()); return p; };
      a.dyn((dt) => {
        t += dt;
        const conc = 0.5 - 0.5 * Math.cos(t * 0.8);
        const bio = bioHold != null ? bioHold : (t % 16) > 11;
        const n = Math.round(conc * 4);
        sand.forEach((s, k) => {
          const on = k < n;
          s.an.style.opacity = on ? 1 : 0.12;
          s.det.style.opacity = on && !bio ? 1 : on ? 0.25 : 0.12;
        });
        comp.forEach((s, k) => {
          const pat = k < n;
          s.pat.style.opacity = pat ? 1 : 0;
          s.lab.style.opacity = pat ? 0 : bio ? 0.25 : 1;
        });
        const p1 = ptOn(c1, clamp(conc, 0.02, 1)), p2 = ptOn(c2, clamp(conc, 0.02, 1));
        dot1.setAttribute('cx', p1.x.toFixed(1)); dot1.setAttribute('cy', (bio ? 425 : p1.y).toFixed(1));
        dot2.setAttribute('cx', p2.x.toFixed(1)); dot2.setAttribute('cy', (bio ? 800 : p2.y).toFixed(1));
        bioT.textContent = bio ? 'biotine : signal ↓ → TSH faussement basse' : '';
        bioT2.textContent = bio ? 'biotine : signal ↓ → T4L faussement haute' : '';
      });
      HV.spotlight(dsDef, a, [
        { t: 'Sandwich : signal proportionnel', d: 'Deux anticorps prennent l\'hormone en sandwich ; le signal augmente avec la concentration. Utilisé pour les grosses molécules (TSH, prolactine, gonadotrophines, PTH) (complément).', spot: [[50, 150, 600, 380]], bio: false },
        { t: 'Compétition : signal inversé', d: 'L\'hormone du patient déplace une hormone marquée ; le signal diminue quand la concentration augmente. Utilisé pour les petites molécules (T4L, T3L, stéroïdes) (complément).', spot: [[50, 530, 600, 380]], bio: false },
        { t: 'La biotine fausse les deux, en sens opposés', d: 'En bloquant la capture streptavidine – biotine, elle abaisse le signal : TSH faussement basse (sandwich), T4L et T3L faussement hautes (compétition), d\'où un faux tableau d\'hyperthyroïdie (complément).', spot: [[50, 150, 600, 760], [1110, 150, 440, 265]], bio: true },
        { t: 'Prolactine : macroprolactine et effet crochet', d: 'Une prolactine élevée sans signe clinique évoque une macroprolactinémie (p. 56). À l\'inverse, un macroprolactinome peut donner une prolactine faussement modérée par effet crochet : redoser après dilution (complément).', spot: [[670, 150, 880, 265]], bio: false },
        { t: 'Anticorps hétérophiles et protéines de transport', d: 'Un résultat discordant avec la clinique se contrôle dans un autre laboratoire, avec une autre technique (p. 56). Quand la TBG varie, on dose la T4 libre (p. 8).', spot: [[670, 415, 880, 265]], bio: false },
        { t: 'L\'heure compte', d: 'Cortisol à 8 h (p. 88), salivaire à minuit (p. 59), aldostérone et rénine le matin, 2 h après le lever, assis depuis 5 à 15 min (p. 77) ; testostérone le matin (complément).', spot: [[1110, 680, 440, 265]], bio: false }
      ]);
      onStep(dsDef, (i) => { bioHold = i < 0 ? null : dsDef.steps[i].bio; });
    }
  }, ROW(4)));

  /* =====================================================================
     6. Où agissent les traitements
     ===================================================================== */
  const DRUGS = [
    // [clé, nom, cible courte, côté, cible, mécanisme, effet indésirable, source]
    ['cab', 'Cabergoline', 'agoniste D2 · cellule lactotrope', 'L', 'hyp', 'Agoniste dopaminergique D2 : reproduit le tonus inhibiteur de la dopamine sur les cellules lactotropes (tonus : p. 49). Traitement médical des prolactinomes.', 'nausées, hypotension orthostatique', 'Tonus dopaminergique : p. 49'],
    ['sst', 'Analogues de la somatostatine', 'cellule somatotrope', 'L', 'hyp', 'Miment la somatostatine, qui inhibe la GH : traitement médical de l\'acromégalie (p. 49).', 'troubles digestifs, lithiase biliaire', 'Polycopié p. 49'],
    ['ats', 'Antithyroïdiens de synthèse', 'inhibent la TPO', 'L', 'thy', 'Inhibent la thyroperoxydase (TPO), enzyme de l\'organification de l\'iode et du couplage des iodotyrosines (TPO : p. 8).', 'agranulocytose (rare, grave)', 'TPO : p. 8'],
    ['levo', 'Lévothyroxine', 'T4 de substitution', 'L', 'thy', 'Apporte la T4, convertie en T3 dans les tissus. Introduction progressive chez les sujets très âgés ou coronariens (p. 21).', 'surdosage : thyrotoxicose, angor démasqué (p. 21)', 'Polycopié p. 21'],
    ['peg', 'Pegvisomant', 'bloque le récepteur de la GH', 'L', 'liv', 'Antagoniste du récepteur de la GH : l\'IGF-1, produite surtout par le foie sous l\'effet de la GH (p. 49), diminue. La GH, elle, n\'est pas freinée.', 'cytolyse hépatique', 'IGF-1 hépatique : p. 49'],
    ['met', 'Metformine', 'production hépatique de glucose ↓', 'L', 'liv', 'Diminue surtout la néoglucogenèse hépatique et améliore la sensibilité à l\'insuline ; pas d\'hypoglycémie en monothérapie.', 'troubles digestifs ; acidose lactique (rare)', null],
    ['sta', 'Statines', 'inhibent l\'HMG-CoA réductase', 'L', 'liv', 'Inhibent l\'HMG-CoA réductase (voie de synthèse du cholestérol, p. 20) : la cellule hépatique exprime plus de récepteurs des LDL et capte davantage de LDL.', 'myalgies, cytolyse', 'HMG-CoA réductase : p. 20 (partie 2)'],
    ['pcsk', 'Anti-PCSK9', 'récepteurs des LDL recyclés', 'L', 'liv', 'Anticorps qui neutralisent PCSK9, protéine qui favorise la dégradation lysosomale du récepteur des LDL (p. 20) : plus de récepteurs recyclés vers la membrane, LDL ↓.', 'réactions au point d\'injection', 'PCSK9 : p. 20 (partie 2)'],
    ['sglt', 'Inhibiteurs de SGLT2', 'tubule proximal · glycosurie', 'L', 'kidL', 'Bloquent le cotransporteur sodium – glucose SGLT2 du tube contourné proximal, qui réabsorbe normalement tout le glucose filtré (p. 31) : glycosurie provoquée.', 'infections génitales ; acidocétose (rare)', 'SGLT2 : p. 31 (partie 2)'],
    ['bis', 'Bisphosphonates, dénosumab', 'freinent l\'ostéoclaste', 'L', 'bone', 'Les bisphosphonates se fixent sur l\'os et inhibent les ostéoclastes ; le dénosumab est un anticorps anti-RANKL qui empêche leur formation et leur activation.', 'ostéonécrose de la mâchoire (rare) ; dénosumab : hypocalcémie, rebond à l\'arrêt', null],
    ['calc', 'Calcimimétiques', 'activent le CaSR → PTH ↓', 'R', 'pth', 'Augmentent la sensibilité du récepteur sensible au calcium (CaSR) de la parathyroïde, qui régule la sécrétion de PTH (p. 37) : la PTH baisse.', 'hypocalcémie, nausées', 'CaSR : p. 37'],
    ['mety', 'Métyrapone, osilodrostat', 'inhibent la 11β-hydroxylase', 'R', 'adr', 'Bloquent la dernière étape de la synthèse du cortisol (11-désoxycortisol → cortisol) : traitement médical de l\'hypercortisolisme.', 'insuffisance surrénale ; accumulation de précurseurs : hypokaliémie, HTA, hyperandrogénie', null],
    ['hc', 'Hydrocortisone, fludrocortisone', 'substitution GR et MR', 'R', 'adr', 'L\'hydrocortisone remplace le cortisol (récepteur des glucocorticoïdes) ; la fludrocortisone remplace l\'aldostérone (récepteur minéralocorticoïde) dans l\'insuffisance surrénale primaire. Fludrocortisone utilisée aussi en test de confirmation de l\'hyperaldostéronisme (p. 77).', 'surdosage : signes de Cushing ; fludrocortisone : HTA, œdèmes, hypokaliémie', 'Fludrocortisone : p. 77'],
    ['spi', 'Spironolactone', 'antagoniste du MR', 'R', 'kidR', 'Antagoniste du récepteur minéralocorticoïde dans le tubule distal et le canal collecteur : traitement de l\'hyperaldostéronisme primaire.', 'hyperkaliémie, gynécomastie', null],
    ['ddavp', 'Desmopressine', 'agoniste V2 · tube collecteur', 'R', 'kidR', 'Analogue de l\'ADH sélectif du récepteur V2, qui fait réabsorber l\'eau par les aquaporines (V2 : p. 50) : traitement du diabète insipide central.', 'hyponatrémie (intoxication à l\'eau)', 'V2 : p. 50'],
    ['sulf', 'Sulfamides hypoglycémiants', 'ferment le canal K-ATP de la cellule β', 'R', 'panc', 'Ferment le canal K-ATP de la cellule β : la sécrétion d\'insuline devient indépendante de la glycémie.', 'hypoglycémie (p. 70, partie 2), prise de poids', 'Hypoglycémie : p. 70 (partie 2)'],
    ['glp', 'Analogues du GLP-1', 'insuline glucose-dépendante, satiété', 'R', 'panc', 'Activent le récepteur du GLP-1 : sécrétion d\'insuline seulement si la glycémie est élevée, glucagon ↓, vidange gastrique ralentie, satiété.', 'nausées, vomissements', null],
    ['eze', 'Ézétimibe', 'bloque NPC1L1 (intestin)', 'R', 'gut', 'Inhibe le transporteur NPC1L1 de la bordure en brosse : moins de cholestérol absorbé, plus de récepteurs des LDL hépatiques.', 'bien toléré (troubles digestifs)', null],
    ['ins', 'Insulines', 'muscle, tissu adipeux, foie', 'R', 'mus', 'Remplacent l\'insuline : captation du glucose par le muscle et le tissu adipeux via GLUT4 (p. 29-30, partie 2), freinage de la production hépatique de glucose.', 'hypoglycémie (p. 70, partie 2), prise de poids', 'GLUT4 : p. 29-30 · hypoglycémie : p. 70 (partie 2)'],
    ['teri', 'Tériparatide', 'fragment de PTH · ostéoblaste', 'R', 'boneR', 'Fragment 1-34 de la PTH en injection quotidienne : l\'exposition intermittente stimule surtout les ostéoblastes (ostéoformation).', 'hypercalcémie, nausées', null]
  ];
  DRUGS.forEach((d) => {
    HV.INFO['ztr-rx-' + d[0]] = { t: d[1], k: d[2], d: d[5] + ' Effet indésirable principal : ' + d[6] + '.', src: (d[7] ? 'Polycopié — ' + d[7] + ' · ' : '') + 'mécanisme et effets indésirables : complément' };
  });
  const rxDef = HV.scene(Object.assign({
    id: 'medicaments', loupe: 'Traitements',
    title: 'Où agissent les traitements', level: 'Notion',
    lead: 'Chaque classe thérapeutique est placée sur l\'organe où elle agit. Survolez une étiquette pour son mécanisme et son effet indésirable principal. Le polycopié étant un cours de sémiologie, les mécanismes et effets indésirables sont des compléments ; les cibles décrites dans le polycopié (TPO, CaSR, récepteur V2, SGLT2, HMG-CoA réductase, PCSK9) sont citées avec leur page.',
    points: [
      'Hypophyse : cabergoline (D2), analogues de la somatostatine (p. 49).',
      'Thyroïde : antithyroïdiens (TPO, p. 8), lévothyroxine (introduction progressive, p. 21).',
      'Surrénale et rein : métyrapone, osilodrostat ; hydrocortisone, fludrocortisone ; spironolactone ; desmopressine (V2, p. 50) ; iSGLT2 (p. 31, partie 2).',
      'Glucose : metformine (foie), sulfamides (K-ATP ; hypoglycémies, p. 70, partie 2), GLP-1, insulines.',
      'Lipides : statines (HMG-CoA réductase), anti-PCSK9 (p. 20, partie 2), ézétimibe (NPC1L1).',
      'Os et calcium : bisphosphonates, dénosumab, tériparatide, calcimimétiques (CaSR, p. 37).'
    ],
    source: SRC,
    legend: new Set(),
    build(g, a) {
      a.frame('Où agissent les traitements', 'Classes thérapeutiques placées sur leur cible · survolez pour le mécanisme');
      const S = 0.86, TX = 800, TY = 585;
      const body = a.el('g', { transform: `translate(${TX} ${TY}) scale(${S})` });
      drawBody(a, body, true);
      const P = (bx, by) => [TX + S * bx, TY + S * by];
      const T = {
        hyp: P(0, -362), thy: P(-6, -284), pth: P(16, -276), liv: P(-30, -112), panc: P(14, -64), adr: P(39, -97),
        kidL: P(-42, -72), kidR: P(42, -70), gut: P(0, -16), bone: P(-55, 150), boneR: P(55, 175), mus: P(62, 110)
      };
      const markG = a.el('g');
      Object.keys(T).forEach((k) => a.el('circle', { cx: T[k][0], cy: T[k][1], r: 6, class: 'ztr-tgt' }, markG));
      const COLOR = { hyp: 'p-blue', thy: 'p-red2', pth: 'p-gold', liv: 'p-brown', panc: 'p-amber', adr: 'p-orange', kidL: 'p-teal', kidR: 'p-teal', gut: 'p-green', bone: 'p-grey', boneR: 'p-grey', mus: 'p-rose' };
      const leadG = a.el('g');
      const rows = { L: 0, R: 0 };
      const items = [];
      DRUGS.forEach((d) => {
        const side = d[3], i = rows[side]++;
        const y = 168 + i * 79, w = 390, h = 66, x = side === 'L' ? 60 : 1150;
        const tp = T[d[4]], c = COLOR[d[4]];
        const G = a.el('g', { 'data-info': 'ztr-rx-' + d[0] });
        box(a, x, y, w, h, c, G);
        a.text(x + 16, y + 27, d[1], 'ztr-t', null, G);
        a.text(x + 16, y + 52, d[2], 'ztr-s', null, G);
        const sx = side === 'L' ? x + w : x, sy = y + h / 2;
        const k = side === 'L' ? 1 : -1;
        const dd = `M ${sx},${sy} C ${sx + k * 120},${sy} ${tp[0] - k * 110},${tp[1]} ${tp[0]},${tp[1]}`;
        const ln = a.path(dd, 'ztr-lead', leadG, { style: `--c: var(--${c})`, 'data-info': 'ztr-rx-' + d[0] });
        a.flow(dd, { mol: 'dot', style: `fill: var(--${c})`, rate: () => 0.35, size: 0.8, speed: 90, track: false, max: 4 });
        items.push({ G, ln, d });
      });
      a.text(800, 978, 'Mécanismes et effets indésirables : complément · cibles citées dans le polycopié : pages indiquées au survol', 'ztr-s', { anchor: 'middle' });
      const sel = (keys) => items.filter((it) => keys.indexOf(it.d[0]) >= 0);
      const spot = (keys, extra) => sel(keys).map((it) => { const b = it.G.getBBox(); return [b.x - 8, b.y - 6, b.width + 16, b.height + 12]; }).concat(extra || []);
      let hold = null;
      a.dyn(() => {
        items.forEach((it) => { const on = !hold || hold.indexOf(it.d[0]) >= 0; setCls(it.G, 'ztr-dim', !on); setCls(it.ln, 'ztr-dim', !on); });
      });
      const ST = [
        { t: 'Hypophyse', d: 'La cabergoline, agoniste D2, reproduit le tonus inhibiteur de la dopamine sur les cellules lactotropes ; les analogues de la somatostatine freinent la GH (p. 49). Le pegvisomant, lui, bloque le récepteur de la GH (complément).', keys: ['cab', 'sst', 'peg'], ex: [[T.hyp[0], T.hyp[1], 40]] },
        { t: 'Thyroïde', d: 'Les antithyroïdiens inhibent la TPO (p. 8) ; la lévothyroxine substitue la T4, introduite progressivement chez le sujet âgé ou coronarien (p. 21).', keys: ['ats', 'levo'], ex: [[T.thy[0], T.thy[1], 40]] },
        { t: 'Surrénales et reins', d: 'Métyrapone et osilodrostat bloquent la 11β-hydroxylase ; hydrocortisone et fludrocortisone substituent ; spironolactone bloque le MR ; desmopressine active le V2 (p. 50) ; les iSGLT2 bloquent SGLT2 (p. 31, partie 2).', keys: ['mety', 'hc', 'spi', 'ddavp', 'sglt'], ex: [[T.adr[0] - 20, T.adr[1] + 10, 55]] },
        { t: 'Glucose', d: 'Metformine sur le foie, sulfamides sur le canal K-ATP (risque d\'hypoglycémie, p. 70, partie 2), analogues du GLP-1, insulines sur le muscle et le tissu adipeux (GLUT4, p. 29-30, partie 2).', keys: ['met', 'sulf', 'glp', 'ins'], ex: [[T.panc[0], T.panc[1], 40]] },
        { t: 'Lipides', d: 'Statines (HMG-CoA réductase) et anti-PCSK9 augmentent les récepteurs des LDL du foie (p. 20, partie 2) ; l\'ézétimibe réduit l\'absorption intestinale du cholestérol (complément).', keys: ['sta', 'pcsk', 'eze'], ex: [[T.liv[0], T.liv[1], 40]] },
        { t: 'Os et calcium', d: 'Bisphosphonates et dénosumab freinent l\'ostéoclaste, le tériparatide stimule l\'ostéoblaste, les calcimimétiques activent le CaSR parathyroïdien (p. 37).', keys: ['bis', 'teri', 'calc'], ex: [[T.bone[0], T.bone[1], 40]] }
      ];
      HV.spotlight(rxDef, a, ST.map((s) => ({ t: s.t, d: s.d, spot: spot(s.keys, s.ex), keys: s.keys })));
      onStep(rxDef, (i) => { hold = i < 0 ? null : rxDef.steps[i].keys; });
    }
  }, ROW(5)));
})();
