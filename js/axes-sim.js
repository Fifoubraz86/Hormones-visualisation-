/*
 * Modèles physiologiques simplifiés des axes (hors axe thyréotrope, voir model.js)
 * et scénarios cliniques correspondants, d'après la sémiologie du polycopié CEEDMM.
 * Grandeurs internes normalisées (1 = sujet sain) sauf mention ; chaque variable relaxe vers sa cible.
 */
(function () {
  'use strict';
  const HV = window.HV;
  const R = HV.rhythm;
  const clamp = HV.clamp;
  const ex = Math.exp, ln = Math.log, pw = Math.pow;
  const G = (x, m, w) => ex(-pw((x - m) / w, 2));
  const f1 = (v) => v.toFixed(1).replace('.', ',');
  const f2 = (v) => v.toFixed(2).replace('.', ',');
  const pct = (v) => Math.round(v * 100) + ' %';
  const x100 = (v) => '×' + f1(v);

  /* Fabrique un « fournisseur » compatible avec le panneau (même interface que HV.model). */
  HV.makeSim = function (id, d) {
    const p = Object.assign({}, d.defaults);
    const s = Object.assign({}, d.init);
    const P = {
      id, title: d.title, active: d.scenarios[0].id, p, s, T: { h: 8, d: 1 },
      LABS: d.labs, PARAMS: d.params, SCENARIOS: d.scenarios,
      lab(k) {
        const L = d.labs.find((x) => x.key === k);
        return L.fn ? L.fn(s, p, P.T) : L.k * s[L.v || k];
      },
      setScenario(sid) {
        const sc = d.scenarios.find((x) => x.id === sid) || d.scenarios[0];
        Object.keys(p).forEach((k) => delete p[k]);
        Object.assign(p, d.defaults, sc.p);
      },
      reset() {
        P.setScenario(d.scenarios[0].id);
        Object.assign(s, d.init);
        P.settle();
      },
      interpret() {
        if (HV.Tests && HV.Tests.running()) return { tone: 'warn', label: 'Test en cours', text: 'Valeurs mesurées sous stimulation ou freinage : l\'interprétation se lit dans le résultat du test ci-dessous.' };
        return d.interpret(s, p, (k) => P.lab(k), P.T);
      },
      step(dt, T) {
        if (T) P.T = T;
        if (!(dt > 0)) return;
        const n = Math.ceil(dt / 0.02), h = dt / n;
        for (let i = 0; i < n; i++) {
          const tg = d.targets(p, s, P.T);
          for (const k in tg) s[k] += (tg[k] - s[k]) * (1 - ex(-h / ((d.tau && d.tau[k]) || 1.2)));
        }
      },
      settle() {
        for (let i = 0; i < 400; i++) P.step(0.1);
      },
      anat() {
        const h = d.hooks || {};
        return (h.lesions || []).filter((L) => L.show(p, s)).map((L) => L.title).filter((t, i, a) => a.indexOf(t) === i).join(' · ');
      }
    };
    P.settle();
    return P;
  };

  const LSN = (L) => L; // lisibilité
  const SIMS = {};

  /* ===================== Axe corticotrope ===================== */
  SIMS.cortico = {
    title: 'Bilan corticotrope simulé',
    defaults: { hypo: 1, pit: 1, adr: 1, autoPit: 0, autoAdr: 0, ecto: 0, exo: 0, syn: 0, dxm: 0, ith: 0, cyp21: 1 },
    init: { crh: 1, acth: 1, cort: 1, reg: 1, troph: 1, ohp: 1, andro: 1 },
    tau: { troph: 6 },
    targets(p, s) {
      const fb = s.cort + p.exo + p.dxm; // la dexaméthasone freine l'axe mais n'est pas dosée comme cortisol
      const crh = clamp(p.hypo * ex(-1.5 * (fb - 1)) * (1 + 7 * p.ith), 0, 10); // l'hypoglycémie est un stress qui active la CRH
      const reg = clamp(p.pit * pw(s.crh, 0.8) * ex(-2 * (fb - 1)), 0, 12);
      // Adénome corticotrope : sécrétion partiellement freinable ; ACTH ectopique : non freinable.
      const acth = reg + p.autoPit * (0.15 + 0.85 * ex(-0.8 * (fb - 1))) + p.ecto;
      // Trophicité du cortex : s'atrophie lentement sans ACTH (insuffisance corticotrope, corticothérapie).
      // Elle évolue sur des jours : elle reste figée pendant un test dynamique (60 min à 48 h).
      const testing = p.syn > 0 || p.dxm > 0 || p.ith > 0;
      const troph = testing ? s.troph : clamp(pw(Math.max(acth, 0.01), 0.8), 0.15, 1.6);
      // Réponse surrénalienne saturable ; le Synacthène (ACTH 1-24) s'ajoute à l'ACTH endogène.
      const drive = Math.max(acth, 0) + p.syn;
      // Bloc en 21-hydroxylase (HCS, figure 26) : le cortisol baisse, l'ACTH monte et la 17-OHP accumulée
      // est détournée vers les androgènes surrénaliens.
      const f21 = pw(p.cyp21, 0.7), sat = drive / (drive + 1.8);
      const cort = clamp((p.adr * s.troph * 2.8 * drive) / (drive + 1.8) * f21 + 0.03 * p.adr + p.autoAdr, 0, 12);
      // Valeurs relatives (1 = normale) : les androgènes surrénaliens dépendent de l'ACTH (SDHEA bas dans l'adénome
      // cortisolique et dans toutes les insuffisances surrénales, polycopié p. 80 et 85).
      const zone = p.adr * s.troph * sat / 0.357;
      const ohp = clamp(zone * (1 + 12 * (1 - f21)), 0, 60);
      const andro = clamp(zone * (1 + 3 * (1 - f21)), 0, 20);
      return { crh, acth, cort, reg, troph, ohp, andro };
    },
    labs: [
      { key: 'acth', name: 'ACTH à 8 h', unit: 'pg/mL', range: '20–52 pg/mL (4,5–12 pmol/L)', k: 25, lo: 20, hi: 52, min: 0, max: 250, dec: 0 },
      { key: 'cort', name: 'Cortisol à 8 h', unit: 'nmol/L', range: '275–550 nmol/L (10–20 µg/dL)', k: 400, lo: 275, hi: 550, min: 0, max: 2000, dec: 0 },
      { key: 'mid', name: 'Cortisol plasmatique à minuit', unit: 'nmol/L', range: '< 50 nmol/L (complément)', lo: 0, hi: 50, min: 0, max: 1200, dec: 0,
        // Le rythme circadien ne concerne que la part régulée par l'axe ; la part autonome reste constante.
        fn: (s, p) => {
          const acth = Math.max(s.acth, 1e-6), regShare = clamp(s.reg / acth, 0, 1);
          const cortAuto = p.autoAdr, cortAxis = Math.max(0, s.cort - cortAuto);
          return 400 * (cortAuto + cortAxis * (0.09 * regShare + (1 - regShare)));
        } },
      { key: 'andro', name: 'Androgènes surrénaliens (SDHEA)', unit: '× N', k: 1, range: 'valeur relative ; normes selon l\'âge et le sexe', lo: 0.5, hi: 2, min: 0, max: 10, dec: 1 },
      { key: 'ohp', name: '17-hydroxyprogestérone', unit: '× N', k: 1, range: 'valeur relative (dosage de base ou après Synacthène)', lo: 0, hi: 3, min: 0, max: 40, dec: 1 }
    ],
    params: [
      { key: 'cyp21', label: '21-hydroxylase (CYP21A2)', min: 0.02, max: 1, step: 0.01, fmt: pct },
      { key: 'adr', label: 'Réserve surrénalienne', min: 0.02, max: 1.5, step: 0.01, fmt: pct },
      { key: 'pit', label: 'Réserve corticotrope', min: 0.02, max: 1.5, step: 0.01, fmt: pct },
      { key: 'autoPit', label: 'Adénome corticotrope', min: 0, max: 4, step: 0.1, fmt: x100 },
      { key: 'autoAdr', label: 'Adénome surrénalien cortisolique', min: 0, max: 4, step: 0.1, fmt: x100 },
      { key: 'ecto', label: 'Sécrétion ectopique d\'ACTH', min: 0, max: 8, step: 0.1, fmt: x100 },
      { key: 'exo', label: 'Corticothérapie (équivalent cortisol)', min: 0, max: 3, step: 0.05, fmt: x100 }
    ],
    scenarios: [
      { id: 'eu', name: 'Axe normal', note: 'Cortisol élevé le matin, bas le soir.', p: {} },
      { id: 'cushing', name: 'Maladie de Cushing', note: 'Adénome corticotrope : ACTH normale ou élevée, cortisol élevé, rythme aboli.', p: { autoPit: 2.3 } },
      { id: 'adeno', name: 'Adénome surrénalien cortisolique', note: 'Cushing ACTH-indépendant : ACTH effondrée, cortisol élevé non freinable.', p: { autoAdr: 1.6 } },
      { id: 'ecto', name: 'Sécrétion ectopique d\'ACTH', note: 'Tumeur (bronches, pancréas…) : ACTH et cortisol très élevés.', p: { ecto: 5 } },
      { id: 'addison', name: 'Insuffisance surrénale périphérique', note: 'Cortisol bas, ACTH très élevée (mélanodermie par excès de POMC/α-MSH).', p: { adr: 0.06 } },
      { id: 'corticotrope', name: 'Insuffisance corticotrope', note: 'Atteinte hypophysaire : cortisol bas avec ACTH basse ou normale.', p: { pit: 0.03 } },
      { id: 'hcs', name: 'Bloc en 21-hydroxylase, forme classique', note: 'HCS (CYP21A2, 95 % des cas) : cortisol bas, ACTH élevée, 17-OHP très élevée, androgènes surrénaliens en excès ; perte de sel possible (aldostérone non simulée ici). Dépistage néonatal à J3 (17-OHP).', p: { cyp21: 0.03 } },
      { id: 'hcsnc', name: 'Bloc en 21-hydroxylase, forme non classique', note: 'L\'ACTH compense : cortisol conservé, 17-OHP et androgènes modérément élevés ; 17-OHP de base ou après test au Synacthène.', p: { cyp21: 0.4 } },
      { id: 'cortico', name: 'Corticothérapie prolongée', note: 'Les corticoïdes freinent l\'axe : ACTH et cortisol endogène bas, risque d\'insuffisance surrénale à l\'arrêt (complément).', p: { exo: 1.6 } }
    ],
    interpret(s, p, L) {
      const a = L('acth'), c = L('cort'), m = L('mid'), oh = L('ohp');
      // Hyperplasie congénitale des surrénales (polycopié p. 80–82, figure 26).
      if (oh > 3 && p.cyp21 < 0.9) {
        if (c < 275) return { tone: 'bad', label: 'Bloc en 21-hydroxylase, forme classique', text: 'Cortisol bas, ACTH élevée, 17-OHP très élevée et androgènes surrénaliens en excès : hyperplasie congénitale des surrénales. Fille : virilisation des organes génitaux externes ; perte de sel (hyponatrémie, hyperkaliémie, déshydratation) si l\'aldostérone est aussi touchée. Dépistage néonatal : 17-OHP à J3.' };
        return { tone: 'warn', label: 'Bloc en 21-hydroxylase, forme non classique', text: 'Cortisol maintenu au prix d\'une ACTH élevée ; 17-OHP et androgènes surrénaliens augmentés : pubarche précoce, âge osseux avancé, hyperandrogénie de l\'adolescente (acné, hirsutisme, troubles des règles). Diagnostic : 17-OHP de base ou après test au Synacthène.' };
      }
      // Cortisol à 8 h (polycopié) : < 5 µg/dL (≈ 138 nmol/L) très évocateur d'insuffisance surrénale,
      // > 18 µg/dL (500 nmol/L) l'exclut ; entre les deux, zone grise : test au Synacthène.
      if (m > 50) {
        if (a < 10) return { tone: 'bad', label: 'Cushing ACTH-indépendant', text: 'Hypercortisolisme (cycle nycthéméral aboli) avec ACTH effondrée : origine surrénalienne. SDHEA bas dans l\'adénome cortisolique (androgènes sous contrôle de l\'ACTH) ; androgènes ou estrogènes sécrétés par un corticosurrénalome.' };
        const both = 'origine hypophysaire (maladie de Cushing : IRM hypophysaire) ou sécrétion ectopique (recherche d\'une tumeur bronchique ou pancréatique).';
        if (a > 150) return { tone: 'bad', label: 'Cushing ACTH-dépendant, ACTH très élevée', text: 'Hypercortisolisme avec ACTH très élevée, plutôt en faveur d\'une sécrétion ectopique (seuil indicatif, complément) : ' + both };
        return { tone: 'bad', label: 'Cushing ACTH-dépendant', text: 'Hypercortisolisme avec ACTH normale ou élevée et cycle nycthéméral aboli : ' + both };
      }
      if (c > 550) return { tone: 'warn', label: 'Cortisol à 8 h élevé isolé', text: 'Ne suffit pas au diagnostic de syndrome de Cushing : cortisol libre urinaire des 24 h, freinage minute à la dexaméthasone, cortisol salivaire à minuit (deux tests anormaux sur trois).' };
      if (p.exo > 0.05 && c < 500) return { tone: 'warn', label: 'Axe freiné par les corticoïdes', text: 'ACTH et cortisol endogène bas : décroissance progressive et prudente à l\'arrêt (complément).' };
      if (c < 138) {
        if (a > 52) return { tone: 'bad', label: 'Insuffisance surrénale périphérique', text: 'Cortisol à 8 h < 138 nmol/L (5 µg/dL) et ACTH élevée : atteinte surrénalienne (mélanodermie). Toutes les hormones corticosurrénaliennes manquent : minéralocorticoïdes, glucocorticoïdes et androgènes surrénaliens (SDHEA bas).' };
        return { tone: 'bad', label: 'Insuffisance corticotrope', text: 'Cortisol à 8 h < 138 nmol/L (5 µg/dL) avec ACTH basse ou inadaptée : origine hypothalamo-hypophysaire. Cortisol et androgènes surrénaliens bas, minéralocorticoïdes conservés (rénine et aldostérone normales).' };
      }
      if (a > 52 && c < 500) return { tone: 'warn', label: 'ACTH élevée, cortisol non effondré', text: 'ACTH au-dessus de la normale avec un cortisol à 8 h < 500 nmol/L (18 µg/dL) : insuffisance surrénale périphérique débutante possible, test au Synacthène.' };
      if (c < 275) return { tone: 'warn', label: 'Cortisol à 8 h en zone grise', text: 'Entre 138 et 500 nmol/L (5–18 µg/dL), le cortisol à 8 h ne permet ni d\'affirmer ni d\'exclure une insuffisance surrénale : test au Synacthène.' };
      if (c < 500) return { tone: 'good', label: 'Axe corticotrope normal', text: 'ACTH et cortisol dans les normes, rythme circadien conservé. Un cortisol à 8 h < 500 nmol/L (18 µg/dL) n\'exclut pas formellement une insuffisance surrénale : test au Synacthène en cas de suspicion clinique.' };
      return { tone: 'good', label: 'Axe corticotrope normal', text: 'Cortisol à 8 h ≥ 500 nmol/L (18 µg/dL) : insuffisance surrénale exclue ; rythme circadien conservé.' };
    },
    hooks: {
      links: { 'hypo>pit>crh': 'crh', 'pit>adr>acth': 'acth', 'adr>liver>cortisol': 'cort', 'adr>muscle>cortisol': 'cort', 'adr>fat>cortisol': 'cort', 'adr>pit>cortisol': 'cort', 'adr>hypo>cortisol': 'cort', 'adr>andro>dhea': 'andro', 'adr>ohp>prog': 'ohp', 'ohp>andro>dhea': 'ohp' },
      cap: { adr: 'adr', pit: 'pit' },
      // Hyperplasie surrénalienne sous excès d'ACTH, atrophie quand l'ACTH est effondrée.
      scale: { adr: (p, s) => clamp(0.72 + 0.28 * pw(Math.max(s.acth, 0.01), 0.35), 0.7, 1.45) },
      lesions: [
        { node: 'pit', kind: 'nodule', dx: 30, dy: -26, show: (p) => p.autoPit > 0.02, label: 'microadénome', title: 'Adénome corticotrope', text: 'Maladie de Cushing : le plus souvent un microadénome, parfois invisible en IRM (complément). Hyperplasie surrénalienne bilatérale secondaire.' },
        { node: 'pit', kind: 'mass', dy: -6, tone: 'grey', show: (p) => p.pit < 0.5, label: 'lésion hypophysaire', ly: 50, title: 'Lésion hypothalamo-hypophysaire', text: 'Insuffisance corticotrope : adénome, chirurgie, radiothérapie, apoplexie, hypophysite…' },
        { node: 'adr', kind: 'nodule', tone: 'yellow', dx: -34, dy: -30, show: (p) => p.autoAdr > 0.02, ly: -26, label: 'adénome cortisolique', title: 'Adénome surrénalien cortisolique', text: 'Tumeur de la zone fasciculée. L\'ACTH effondrée entraîne l\'atrophie de la surrénale controlatérale et du cortex sain.' },
        { node: 'adr', kind: 'infiltrate', dy: -10, show: (p) => p.adr < 0.5, label: 'destruction surrénalienne', title: 'Insuffisance surrénale périphérique', text: 'Destruction des deux surrénales : auto-immune dans 80 à 90 % des cas, la tuberculose étant la cause historique ; plus rarement hémorragie surrénalienne bilatérale ou métastases.' },
        { node: 'adr', kind: 'label', show: (p, s) => s.acth < 0.3, label: 'cortex atrophique', ly: -96, title: 'Atrophie corticosurrénalienne', text: 'Sans ACTH, la zone fasciculée s\'atrophie : risque d\'insuffisance surrénale à l\'arrêt d\'une corticothérapie ou après exérèse d\'un adénome.' },
        { node: 'adr', kind: 'label', show: (p) => p.cyp21 < 0.7, label: 'bloc en 21-hydroxylase', ly: -96, title: 'Hyperplasie congénitale des surrénales', text: 'Déficit en 21-hydroxylase (CYP21A2, chromosome 6p21.3), autosomique récessif : 95 % des HCS. Voir la figure 26 et la loupe « Stéroïdogenèse ».' },
        { node: 'adr', kind: 'label', show: (p, s) => s.acth > 2.5 && p.cyp21 >= 0.7, label: 'hyperplasie bilatérale', ly: -70, title: 'Hyperplasie surrénalienne', text: 'L\'excès chronique d\'ACTH induit une hyperplasie et une hypertrophie des surrénales.' }
      ],
      extraNodes: [
        { id: 'ecto', x: 570, y: 760, label: 'Tumeur ectopique', sub: 'ACTH non freinable', color: 'bad', show: (p) => p.ecto > 0.02, info: 'Sécrétion ectopique (paranéoplasique) d\'ACTH, par exemple par une tumeur bronchique ou pancréatique.' },
        { id: 'exo', x: 230, y: 600, label: 'Corticoïdes exogènes', w: 250, color: 'p-gold', show: (p) => p.exo > 0.02, info: 'Les glucocorticoïdes de synthèse exercent le même rétrocontrôle négatif que le cortisol.' },
        { id: 'syn', x: 930, y: 600, label: 'Synacthène 250 µg', w: 240, color: 'p-orange2', show: (p) => p.syn > 0.02, info: 'Tétracosactide (ACTH 1-24) : stimulation maximale de la corticosurrénale.' },
        { id: 'dxm', x: 400, y: 600, label: 'Dexaméthasone', w: 220, color: 'p-gold', show: (p) => p.dxm > 0.02, info: 'Glucocorticoïde puissant non dosé par le dosage du cortisol : freine CRH et ACTH.' },
        { id: 'ohp', x: 620, y: 890, label: '17-OHP accumulée', w: 230, color: 'bad', show: (p) => p.cyp21 < 0.9, info: 'En amont du bloc, la 17-hydroxyprogestérone s\'accumule et se détourne vers les androgènes surrénaliens (figure 26).' },
        { id: 'ins', x: 640, y: 600, label: 'Insuline IV', w: 190, color: 'p-blue2', show: (p) => p.ith > 0.02, info: 'L\'hypoglycémie induite (< 0,40 g/L) est un stress qui stimule les axes corticotrope et somatotrope.' }
      ],
      extraLinks: [
        { from: 'ecto', to: 'adr', kind: 'stim', mol: 'acth', v: 'ectoRate', label: '' },
        { from: 'exo', to: 'pit', kind: 'inhib', color: 'p-gold', label: '' },
        { from: 'exo', to: 'hypo', kind: 'inhib', color: 'p-gold', label: '' },
        { from: 'syn', to: 'adr', kind: 'stim', mol: 'acth', v: 'synRate', label: 'ACTH 1-24' },
        { from: 'dxm', to: 'pit', kind: 'inhib', color: 'p-gold', label: '' },
        { from: 'dxm', to: 'hypo', kind: 'inhib', color: 'p-gold', label: '' },
        { from: 'ins', to: 'hypo', kind: 'stim', color: 'p-blue2', label: 'hypoglycémie' },
        { from: 'adr', to: 'ohp', mol: 'prog', label: '' },
        { from: 'ohp', to: 'andro', kind: 'stim', mol: 'dhea', label: 'détournée' }
      ],
      rates: { ectoRate: (s, p) => p.ecto / 2, synRate: (s, p) => Math.min(4, p.syn / 5) },
      levels: [{ label: 'ACTH', mol: 'acth', v: 'acth', max: 4 }, { label: 'Cortisol', mol: 'cortisol', v: 'cort', max: 4 }, { label: 'Androgènes', mol: 'dhea', v: 'andro', max: 4 }]
    }
  };

  /* ===================== Axe somatotrope ===================== */
  SIMS.somato = {
    title: 'Bilan somatotrope simulé',
    defaults: { hypo: 1, pit: 1, autoPit: 0, liver: 1, load: 0, ith: 0 },
    init: { ghrh: 1, gh: 1, igf: 1, reg: 1 },
    tau: { ghrh: 0.5, reg: 0.5, gh: 0.4, igf: 8 },
    targets(p, s) {
      const ghrh = clamp(p.hypo * ex(-1 * (s.igf - 1)), 0, 6);
      // L'hyperglycémie freine la GH normale ; l'hypoglycémie la stimule (décharge proportionnelle à la réserve).
      const reg = clamp(p.pit * pw(s.ghrh, 0.8) * ex(-1.5 * (s.igf - 1)) * ex(-3 * p.load) + 9 * p.ith * p.pit * p.hypo, 0, 20);
      const gh = reg + p.autoPit;
      const igf = clamp(p.liver * pw(gh, 0.6), 0, 6);
      return { ghrh, gh, igf, reg };
    },
    labs: [
      { key: 'igf', name: 'IGF-1', unit: 'µg/L', range: '100–300 µg/L (adulte, selon l\'âge ; complément)', k: 200, lo: 100, hi: 300, min: 0, max: 1000, dec: 0 },
      { key: 'nadir', name: 'GH nadir sous HGPO', unit: 'ng/mL', range: '< 0,4 ng/mL', lo: 0, hi: 0.4, min: 0, max: 10, dec: 2,
        // Même modèle que l'épreuve : charge en glucose maximale (load = 1), la part autonome n'est pas freinée.
        fn: (s, p) => s.reg * ex(-3) + p.autoPit },
      { key: 'gh', name: 'GH moyenne', unit: 'ng/mL', range: 'pulsatile', k: 1, lo: 0.1, hi: 3, min: 0, max: 15, dec: 1 }
    ],
    params: [
      { key: 'pit', label: 'Réserve somatotrope', min: 0.02, max: 1.5, step: 0.01, fmt: pct },
      { key: 'autoPit', label: 'Adénome somatotrope', min: 0, max: 6, step: 0.1, fmt: x100 },
      { key: 'liver', label: 'Production hépatique d\'IGF-1', min: 0.1, max: 1.5, step: 0.01, fmt: pct }
    ],
    scenarios: [
      { id: 'eu', name: 'Axe normal', note: 'GH pulsatile nocturne, IGF-1 normale, GH freinée par l\'HGPO.', p: {} },
      { id: 'acro', name: 'Acromégalie', note: 'Adénome somatotrope : IGF-1 élevée, GH non freinée sous HGPO (≥ 0,4 ng/mL).', p: { autoPit: 2.5 } },
      { id: 'def', name: 'Déficit somatotrope', note: 'IGF-1 basse ; GH basale peu informative (pulsatile) : confirmer par l\'hypoglycémie insulinique.', p: { pit: 0.06 } },
      { id: 'defp', name: 'Déficit somatotrope partiel', note: 'Réserve diminuée : IGF-1 souvent normale ; pic de GH entre 3 et 6 ng/mL à l\'hypoglycémie insulinique.', p: { pit: 0.42 } },
      { id: 'res', name: 'Dénutrition, insuffisance hépatique', note: 'Résistance à la GH (complément) : IGF-1 basse malgré une GH élevée.', p: { liver: 0.2 } }
    ],
    interpret(s, p, L) {
      const i = L('igf'), n = L('nadir');
      if (i > 300 && n >= 0.4) return { tone: 'bad', label: 'Acromégalie', text: 'IGF-1 élevée et absence de freination de la GH sous HGPO.' };
      if (i < 100 && L('gh') < 0.5) return { tone: 'bad', label: 'Déficit somatotrope', text: 'IGF-1 basse et GH basale basse (peu informative, car pulsatile) : confirmer par un test de stimulation (hypoglycémie insulinique).' };
      if (i < 100 && L('gh') > 3) return { tone: 'warn', label: 'IGF-1 basse, GH élevée', text: 'Profil de résistance à la GH (dénutrition, insuffisance hépatique ; complément).' };
      if (i < 100) return { tone: 'warn', label: 'IGF-1 basse', text: 'IGF-1 basse avec une GH non effondrée : dénutrition, insuffisance hépatique, ou déficit somatotrope à confirmer par un test de stimulation.' };
      if (i > 300) return { tone: 'warn', label: 'IGF-1 élevée', text: 'IGF-1 élevée avec une GH freinée sous HGPO : à contrôler (puberté, grossesse ; complément).' };
      return { tone: 'good', label: 'IGF-1 normale', text: 'Pas d\'argument pour une acromégalie. Une IGF-1 normale n\'exclut pas un déficit somatotrope (elle est normale dans plus de la moitié des déficits avérés) : en cas de suspicion clinique, hypoglycémie insulinique.' };
    },
    hooks: {
      links: { 'hypo>pit>ghrh': 'ghrh', 'pit>liver>gh': 'gh', 'liver>bone>igf1': 'igf', 'liver>muscle>igf1': 'igf', 'liver>pit>igf1': 'igf', 'liver>hypo>igf1': 'igf' },
      cap: { pit: 'pit', liver: 'liver' },
      extraNodes: [
        { id: 'load', x: 980, y: 770, label: 'Glucose 75 g (HGPO)', w: 260, color: 'p-lime', show: (p) => p.load > 0.02, info: 'La charge orale en glucose freine normalement la GH.' },
        { id: 'ins', x: 230, y: 600, label: 'Insuline IV', w: 190, color: 'p-blue2', show: (p) => p.ith > 0.02, info: 'L\'hypoglycémie induite stimule la GHRH et la GH : test de référence du déficit somatotrope.' }
      ],
      extraLinks: [{ from: 'load', to: 'pit', kind: 'inhib', mol: 'glucose', v: 'loadRate', label: '' }, { from: 'ins', to: 'hypo', kind: 'stim', color: 'p-blue2', label: '' }],
      rates: { loadRate: (s, p) => 2 * p.load },
      lesions: [
        { node: 'pit', kind: 'mass', tone: 'sky', dy: -4, show: (p) => p.autoPit > 0.02, size: (p) => clamp(0.6 + 0.12 * p.autoPit, 0.6, 1.3), label: 'adénome somatotrope', ly: 52, title: 'Adénome somatotrope', text: 'Souvent un macroadénome au diagnostic (extension vers le sinus caverneux ou le chiasma).' },
        { node: 'pit', kind: 'mass', tone: 'grey', dy: -4, show: (p) => p.pit < 0.5, label: 'lésion hypophysaire', ly: 52, title: 'Insuffisance somatotrope', text: 'Atteinte hypophysaire (tumeur, chirurgie, radiothérapie). Le test de référence est l\'hypoglycémie insulinique.' },
        { node: 'liver', kind: 'label', show: (p) => p.liver < 0.6, label: 'production d\'IGF-1 diminuée', ly: -72, title: 'Résistance à la GH', text: 'Dénutrition ou insuffisance hépatique : l\'IGF-1 baisse malgré une GH élevée (complément).' }
      ],
      levels: [{ label: 'GH', mol: 'gh', v: 'gh', max: 4 }, { label: 'IGF-1', mol: 'igf1', v: 'igf', max: 3 }]
    }
  };

  /* ===================== Axe lactotrope ===================== */
  SIMS.lacto = {
    title: 'Bilan lactotrope simulé',
    defaults: { dopa: 1, stalk: 1, drug: 0, autoPit: 0, preg: 0 },
    init: { prl: 1, inh: 1 },
    targets(p, s) {
      const inh = clamp(p.dopa * p.stalk * (1 - 0.85 * p.drug), 0, 1.5);
      const prl = (1 + 5 * p.preg) * (1 + 5 * Math.max(0, 1 - inh)) + p.autoPit;
      return { prl, inh };
    },
    labs: [
      { key: 'prl', name: 'Prolactine', unit: 'ng/mL', range: '< 25 ng/mL (complément)', k: 12, lo: 3, hi: 25, min: 1, max: 1000, log: true, dec: 0 },
      { key: 'lh', name: 'LH', unit: 'UI/L', range: '2–10 UI/L (complément)', lo: 2, hi: 10, min: 0, max: 12, dec: 1,
        fn: (s) => 5 / (1 + Math.max(0, s.prl - 2) * 0.35) }
    ],
    params: [
      { key: 'autoPit', label: 'Adénome à prolactine', min: 0, max: 40, step: 0.5, fmt: x100 },
      { key: 'stalk', label: 'Intégrité de la tige pituitaire', min: 0.05, max: 1, step: 0.01, fmt: pct },
      { key: 'drug', label: 'Antidopaminergique (neuroleptique)', min: 0, max: 1, step: 0.05, fmt: pct },
      { key: 'preg', label: 'Œstrogènes (grossesse)', min: 0, max: 1, step: 0.05, fmt: pct }
    ],
    scenarios: [
      { id: 'eu', name: 'Axe normal', note: 'Prolactine freinée par la dopamine.', p: {} },
      { id: 'micro', name: 'Microadénome à prolactine', note: 'Prolactine modérément élevée ; aménorrhée, galactorrhée.', p: { autoPit: 6 } },
      { id: 'macro', name: 'Macroadénome à prolactine', note: 'Prolactine > 200 ng/mL.', p: { autoPit: 25 } },
      { id: 'decon', name: 'Hyperprolactinémie de déconnexion', note: 'Tumeur comprimant la tige : levée du tonus dopaminergique, prolactine < 200 ng/mL.', p: { stalk: 0.2 } },
      { id: 'nl', name: 'Neuroleptique', note: 'Cause iatrogène à écarter avant tout bilan.', p: { drug: 1 } },
      { id: 'preg', name: 'Grossesse', note: 'Élévation physiologique sous l\'effet des œstrogènes.', p: { preg: 1 } }
    ],
    interpret(s, p, L) {
      const v = L('prl');
      if (v > 200) return { tone: 'bad', label: 'Prolactine > 200 ng/mL', text: 'Évoque un macroadénome à prolactine.' };
      if (v > 25) return { tone: 'warn', label: 'Hyperprolactinémie', text: 'Écarter grossesse, médicaments et macroprolactinémie ; < 200 ng/mL avec tumeur volumineuse : déconnexion. La LH est freinée (pulsatilité de la GnRH inhibée).' };
      return { tone: 'good', label: 'Prolactine normale', text: 'Tonus dopaminergique conservé.' };
    },
    hooks: {
      links: { 'pit>breast>prl': 'prl', 'pit>gnrh>prl': 'prl', 'hypo>pit>dopa': 'inh' },
      scale: { pit: (p) => 1 + 0.25 * p.preg },
      lesions: [
        { node: 'pit', kind: 'nodule', tone: 'magenta', dx: 30, dy: -26, show: (p) => p.autoPit > 0.02 && p.autoPit < 15, label: 'microadénome', title: 'Microadénome à prolactine', text: 'Adénome < 10 mm : prolactine modérément élevée.' },
        { node: 'pit', kind: 'mass', tone: 'magenta', dy: -20, show: (p) => p.autoPit >= 15, size: () => 1.3, label: 'macroadénome → chiasma', ly: 64, title: 'Macroadénome à prolactine', text: 'Adénome ≥ 10 mm ; une prolactine > 200 ng/mL évoque un macroadénome à prolactine. Extension suprasellaire avec risque de compression du chiasma optique.' },
        { node: 'pit', kind: 'mass', tone: 'grey', dx: -40, dy: -92, show: (p) => p.stalk < 0.6, size: () => 0.8, label: 'tumeur comprimant la tige', lx: -30, ly: 44, title: 'Compression de la tige pituitaire', text: 'Une tumeur hypothalamo-hypophysaire non lactotrope bloque le passage de la dopamine : hyperprolactinémie de déconnexion (< 200 ng/mL).' },
        { node: 'pit', kind: 'label', show: (p) => p.preg > 0.3, label: 'hyperplasie lactotrope', ly: -74, title: 'Hypophyse de la grossesse', text: 'Les œstrogènes induisent une hyperplasie des cellules lactotropes (complément).' }
      ],
      levels: [{ label: 'Prolactine', mol: 'prl', v: 'prl', max: 10 }]
    }
  };

  /* ===================== Posthypophyse ===================== */
  // Bilan d'eau W (litres d'eau libre en excès ; négatif = déficit) : les boissons l'augmentent, la sueur
  // le diminue ; le rein élimine l'excès d'autant plus vite que l'ADH est basse, la soif corrige le déficit.
  // En hyponatrémie, le pouvoir de concentration maximal baisse (lavage médullaire) : SIADH ≈ 500–600 mosmol/kg.
  const uosmOf = (eff, na) => clamp((50 + 700 * pw(eff, 1.5)) * clamp(1 - 0.05 * Math.max(0, 135 - (na || 140)), 0.4, 1), 40, 1200);
  SIMS.adh = {
    title: 'Bilan hydrique simulé',
    defaults: { hypo: 1, kidney: 1, siadh: 0, restrict: 0, ddavp: 0, drink: 0, sweat: 0 },
    init: { na: 140, adh: 1, eff: 1, W: 0 },
    tau: { na: 1.5, W: 1, adh: 0.5, eff: 0.5 },
    targets(p, s) {
      const adh = p.hypo * clamp(ex((s.na - 140) / (s.na < 140 ? 1.2 : 3)) * (1 + 1.2 * p.sweat), 0, 12) + p.siadh; // osmolalité (effondrée sous la consigne) et volémie
      const a2 = adh + 5 * p.ddavp; // desmopressine : agoniste V2
      const eff = clamp((p.kidney * a2) / (a2 + 0.5) * 1.5, 0, 1.5);
      // Excès d'eau éliminé quand l'ADH s'effondre ; déficit corrigé par la soif si le patient peut boire.
      const canDrink = Math.max(0, 1 - p.restrict - p.sweat);
      const dW = 2.4 * p.drink - 0.45 * p.sweat - (s.W > 0 ? s.W * 0.8 * clamp(1.15 - eff, 0.03, 1.15) : 0) + (s.W < 0 ? -s.W * 0.8 * canDrink : 0);
      const W = clamp(s.W + dW, -4, 6);
      // Rétention d'eau libre → baisse de la natrémie ; perte d'eau compensée par la soif, sauf en restriction hydrique.
      const na = 140 + 3 * p.restrict + (eff >= 1 ? -40 * (eff - 1) * canDrink : (7 + 10 * p.restrict) * (1 - eff)) - 2.6 * s.W;
      return { adh, eff, na, W };
    },
    labs: [
      { key: 'na', name: 'Natrémie', unit: 'mmol/L', k: 1, lo: 135, hi: 145, min: 110, max: 160, dec: 0 },
      { key: 'posm', name: 'Osmolalité plasmatique', unit: 'mosmol/kg', range: '285–295 mosmol/kg', lo: 280, hi: 295, min: 240, max: 330, dec: 0, fn: (s) => 2 * s.na + 10 },
      { key: 'uosm', name: 'Osmolalité urinaire', unit: 'mosmol/kg', range: '100–1200 selon l\'apport', lo: 100, hi: 1200, min: 0, max: 1300, dec: 0, fn: (s) => uosmOf(s.eff, s.na) },
      { key: 'diur', name: 'Diurèse', unit: 'L/24 h', range: '< 3 L/24 h', lo: 0.5, hi: 3, min: 0, max: 14, dec: 1, fn: (s) => clamp(900 / uosmOf(s.eff, s.na), 0.4, 14) }
    ],
    params: [
      { key: 'hypo', label: 'Sécrétion d\'ADH', min: 0.01, max: 1.5, step: 0.01, fmt: pct },
      { key: 'kidney', label: 'Sensibilité rénale (V2)', min: 0.02, max: 1.2, step: 0.01, fmt: pct },
      { key: 'siadh', label: 'Sécrétion inappropriée d\'ADH', min: 0, max: 6, step: 0.1, fmt: x100 },
      { key: 'drink', label: 'Boissons en excès', min: 0, max: 1, step: 0.05, fmt: pct },
      { key: 'sweat', label: 'Pertes sudorales sans boire', min: 0, max: 1, step: 0.05, fmt: pct }
    ],
    scenarios: [
      { id: 'eu', name: 'Équilibre hydrique normal', note: 'Natrémie stable, urines concentrées selon les besoins.', p: {} },
      { id: 'deshy', name: 'Déshydratation : marche dans le désert', note: 'Plusieurs heures de sueur sans boire : l\'osmolalité monte, l\'ADH et la soif s\'élèvent, les urines deviennent rares et très concentrées.', p: { sweat: 1 } },
      { id: 'hyper', name: 'Hyperhydratation : 1,5 L d\'eau bus', note: 'Apport d\'eau abondant : l\'osmolalité baisse, l\'ADH s\'effondre, le rein élimine l\'excès par des urines abondantes et diluées.', p: { drink: 1 } },
      { id: 'dic', name: 'Diabète insipide central', note: 'Défaut d\'ADH : polyurie > 3 L, urines diluées < 200 mosmol/kg, natrémie un peu haute.', p: { hypo: 0.01 } },
      { id: 'din', name: 'Diabète insipide néphrogénique', note: 'Résistance rénale à l\'ADH (complément) : même tableau, ADH élevée.', p: { kidney: 0.05 } },
      { id: 'siadh', name: 'SIADH', note: 'Rétention d\'eau sans œdème, hyponatrémie souvent < 120 mmol/L, urines inappropriément concentrées.', p: { siadh: 5 } }
    ],
    interpret(s, p, L) {
      const na = L('na'), u = L('uosm'), d = L('diur');
      if (na < 135 && u > 100) return { tone: 'bad', label: 'Hyponatrémie, urines concentrées', text: 'Profil de SIADH (osmolalité urinaire > 100 mosmol/kg, complément ; natriurèse conservée) en l\'absence d\'insuffisance cardiaque, rénale ou hépatique : restriction hydrique.' };
      if (L('posm') > 295 && u > 600) return { tone: 'warn', label: 'Déshydratation, ADH stimulée', text: 'Hypernatrémie avec urines rares et concentrées : le rein économise l\'eau au maximum ; seule la boisson corrige le déficit.' };
      if (d > 2.5 && u < 300 && na < 141) return { tone: 'warn', label: 'Diurèse aqueuse', text: 'Urines abondantes et diluées avec une natrémie normale basse : réponse adaptée à un apport d\'eau (à distinguer d\'une potomanie si elle est permanente).' };
      if (d > 3 && u < 200) return { tone: 'bad', label: 'Polyurie hypotonique', text: 'Diabète insipide : confirmer par une épreuve de restriction hydrique, après IRM.' };
      return { tone: 'good', label: 'Équilibre hydrique normal', text: 'Natrémie normale, diurèse normale.' };
    },
    hooks: {
      links: { 'hypo>post>adh': 'adh', 'post>kidney>adh': 'adh', 'post>vessel>adh': 'adh', 'kidney>osm>water': 'eff', 'kidney>urine>water': 'urineRate', 'thirst>osm>water': 'thirstRate' },
      rates: { siadhRate: (s, p) => p.siadh / 2, ddavpRate: (s, p) => 2 * p.ddavp, urineRate: (s) => 900 / uosmOf(s.eff, s.na) / 1.5, thirstRate: (s, p) => Math.max(0, 1 - p.restrict - p.sweat) * clamp(0.6 + (s.na - 140) / 2, 0.15, 3) + 3 * p.drink },
      liveNode: {
        osm: (s) => Math.round(2 * s.na + 10) + ' mosmol/kg · Na ' + Math.round(s.na),
        urine: (s) => f1(clamp(900 / uosmOf(s.eff, s.na), 0.4, 14)) + ' L/24 h · ' + Math.round(uosmOf(s.eff, s.na)) + ' mosmol/kg'
      },
      lesions: [
        { node: 'post', kind: 'mass', tone: 'grey', dx: -40, dy: -110, size: () => 0.75, show: (p) => p.hypo < 0.5, label: 'lésion de la tige', lx: 120, ly: 0, title: 'Lésion hypothalamo-tigellaire', text: 'Le polycopié cite : hypophysite, craniopharyngiome, gliome du chiasma, méningiome, pathologie infiltrative, métastase. Un adénome hypophysaire n\'en donne pas, sauf apoplexie ou chirurgie.' },
        { node: 'kidney', kind: 'cross', dx: 60, dy: 0, show: (p) => p.kidney < 0.5, label: 'récepteur V2 inactif', title: 'Diabète insipide néphrogénique', text: 'Le rein ne répond pas à l\'ADH (complément : origine génétique, lithium, hypercalcémie, hypokaliémie).' }
      ],
      extraNodes: [
        { id: 'restr', x: 700, y: 570, label: 'Restriction hydrique', w: 250, color: 'p-sky', show: (p) => p.restrict > 0.02, info: 'Arrêt des boissons en milieu hospitalier : l\'osmolalité monte et l\'ADH doit concentrer les urines.' },
        { id: 'ddavp', x: 1090, y: 560, label: 'Desmopressine', w: 220, color: 'p-sky', show: (p) => p.ddavp > 0.02, info: 'Agoniste V2 : concentre les urines si le rein répond (diabète insipide central), pas dans le diabète insipide néphrogénique.' },
        { id: 'ectoadh', x: 960, y: 600, label: 'Tumeur ou médicament', w: 270, color: 'bad', show: (p) => p.siadh > 0.02, info: 'SIADH : de nombreux médicaments, ou une tumeur responsable d\'un syndrome paranéoplasique.' },
        { id: 'sun', x: 1000, y: 140, label: 'Chaleur, sueur, pas d\'eau', w: 300, color: 'p-amber', show: (p) => p.sweat > 0.02, info: 'Marche prolongée au soleil sans boire : perte d\'eau par la sueur et la respiration, que la soif ne peut compenser.' },
        { id: 'glass', x: 1000, y: 140, label: 'Boissons', w: 170, color: 'p-sky', show: (p) => p.drink > 0.02, info: 'Apport rapide d\'eau libre (par exemple 1,5 L en 30 minutes).' }
      ],
      extraLinks: [{ from: 'ectoadh', to: 'kidney', kind: 'stim', mol: 'adh', v: 'siadhRate', label: '' }, { from: 'restr', to: 'osm', kind: 'stim', color: 'p-sky', label: '' }, { from: 'ddavp', to: 'kidney', kind: 'stim', mol: 'adh', v: 'ddavpRate', label: '' }, { from: 'sun', to: 'osm', kind: 'stim', color: 'p-amber', label: 'perte d\'eau' }, { from: 'glass', to: 'osm', kind: 'inhib', mol: 'water', v: 'thirstRate', label: '' }],
      levels: [{ label: 'ADH', mol: 'adh', v: 'adh', max: 6 }, { label: 'Ocytocine', mol: 'oxy', fn: () => 0.6, max: 2 }]
    }
  };

  /* ===================== Médullosurrénale ===================== */
  // A, N, D : adrénaline, noradrénaline, dopamine (1 = sécrétion basale). Les métanéphrines viennent de
  // la COMT intracellulaire : elles reflètent la masse sécrétante et sont produites même entre les paroxysmes.
  SIMS.medullo = {
    title: 'Bilan catécholaminergique simulé',
    defaults: { sym: 1, pheoA: 0, pheoN: 0, pheoD: 0 },
    init: { A: 1, N: 1, D: 1 },
    tau: { A: 0.4, N: 0.8, D: 0.8 },
    targets(p, s, T) {
      const parox = 0.35 + 1.65 * G(T.h % 6, 1.2, 0.35); // paroxysmes
      return { A: p.sym + 3 * p.pheoA * parox, N: p.sym + 2.4 * p.pheoN * (0.7 + 0.3 * parox), D: 1 + 3 * p.pheoD };
    },
    labs: [
      { key: 'mn', name: 'Métanéphrine', unit: '× limite sup.', range: '< 1 × LSN', lo: 0, hi: 1, min: 0, max: 15, dec: 1, fn: (s, p) => 0.45 * p.sym + 2.4 * p.pheoA },
      { key: 'nmn', name: 'Normétanéphrine', unit: '× limite sup.', range: '< 1 × LSN', lo: 0, hi: 1, min: 0, max: 15, dec: 1, fn: (s, p) => 0.45 * p.sym + 2.4 * p.pheoN },
      { key: 'mt', name: '3-méthoxytyramine', unit: '× limite sup.', range: '< 1 × LSN', lo: 0, hi: 1, min: 0, max: 15, dec: 1, fn: (s, p) => 0.5 + 2.4 * p.pheoD },
      { key: 'fc', name: 'Fréquence cardiaque', unit: '/min', range: '60–100 /min', lo: 60, hi: 100, min: 40, max: 180, dec: 0, fn: (s) => clamp(70 + 22 * ln(Math.max(s.A, 0.2)) + 6 * ln(Math.max(s.N, 0.2)), 45, 170) },
      { key: 'pas', name: 'PA systolique', unit: 'mmHg', range: '100–140 mmHg', lo: 100, hi: 140, min: 80, max: 260, dec: 0, fn: (s) => clamp(120 + 10 * ln(Math.max(s.A, 0.2)) + 22 * ln(Math.max(s.N, 0.2)), 85, 250) },
      { key: 'gly', name: 'Glycémie', unit: 'g/L', range: '0,70–1,10 g/L', lo: 0.7, hi: 1.1, min: 0.5, max: 3, dec: 2, fn: (s) => clamp(0.92 + 0.22 * ln(Math.max(s.A, 0.2)), 0.6, 2.5) }
    ],
    params: [
      { key: 'sym', label: 'Activation sympathique (stress)', min: 0.3, max: 4, step: 0.1, fmt: x100 },
      { key: 'pheoA', label: 'Tumeur à adrénaline', min: 0, max: 6, step: 0.1, fmt: x100 },
      { key: 'pheoN', label: 'Tumeur à noradrénaline', min: 0, max: 6, step: 0.1, fmt: x100 },
      { key: 'pheoD', label: 'Tumeur à dopamine', min: 0, max: 6, step: 0.1, fmt: x100 }
    ],
    scenarios: [
      { id: 'eu', name: 'Repos', note: 'Faible sécrétion basale.', p: {} },
      { id: 'stress', name: 'Stress aigu', note: 'Réaction de combat ou de fuite : FC et PA ↑, glycémie ↑ ; métanéphrines au plus discrètement augmentées.', p: { sym: 3 } },
      { id: 'pheoA', name: 'Phéochromocytome à adrénaline', note: 'Triade de Ménard (céphalées, sueurs, palpitations), HTA généralement permanente avec parfois des crises paroxystiques ; profil adrénergique (complément) : tachycardie, hyperglycémie, métanéphrine très élevée.', p: { pheoA: 2.6 } },
      { id: 'pheoN', name: 'Phéochromocytome à noradrénaline', note: 'Profil noradrénergique : HTA plus permanente, moins de tachycardie ; normétanéphrine très élevée. Profil aussi des paragangliomes (complément).', p: { pheoN: 2.6 } },
      { id: 'pheoD', name: 'Tumeur à dopamine', note: 'Rare, surtout paragangliome (souvent SDHB, risque de malignité) : peu ou pas d\'HTA ; 3-méthoxytyramine élevée (complément).', p: { pheoD: 2.6 } }
    ],
    interpret(s, p, L) {
      const mn = L('mn'), nmn = L('nmn'), mt = L('mt'), top = Math.max(mn, nmn, mt);
      if (top >= 3) {
        const kind = mt === top ? 'dopaminergique (3-méthoxytyramine) : penser à un paragangliome, rechercher une mutation SDHB' : mn === top ? 'adrénergique (métanéphrine) : origine surrénalienne quasi certaine' : 'noradrénergique (normétanéphrine) : surrénale ou paragangliome';
        return { tone: 'bad', label: 'Métanéphrines ≥ 3 × LSN', text: `Évoquer un phéochromocytome ou un paragangliome : HTA généralement permanente, parfois paroxystique ; céphalées, sueurs, palpitations. Profil ${kind} (seuil de 3 × LSN indicatif ; complément). Imagerie ensuite (scanner, IRM, imagerie fonctionnelle ; complément).` };
      }
      if (top > 1) return { tone: 'warn', label: 'Élévation modérée des métanéphrines', text: 'Élévation discrète (< 3 × LSN) : faux positif fréquent (stress, médicaments, prélèvement non couché). Contrôler au repos avant de conclure.' };
      if (L('fc') > 100) return { tone: 'warn', label: 'Activation adrénergique', text: 'Tachycardie et HTA réactionnelles au stress, sans excès de métanéphrines.' };
      return { tone: 'good', label: 'Normal', text: 'Pas d\'excès de catécholamines.' };
    },
    hooks: {
      links: { 'med>heart>adre': 'A', 'med>vessel>nora': 'N', 'med>liver>adre': 'A', 'med>assay>adre': 'mnRate', 'med>assay>nora': 'nmnRate', 'med>assay>dopa': 'mtRate' },
      rates: { mnRate: (s, p) => 0.45 * p.sym + 2.4 * p.pheoA, nmnRate: (s, p) => 0.45 * p.sym + 2.4 * p.pheoN, mtRate: (s, p) => 0.5 + 2.4 * p.pheoD },
      lesions: [
        { node: 'med', kind: 'mass', tone: 'brown', dx: -6, dy: -28, show: (p) => p.pheoA + p.pheoN > 0.02, size: (p) => clamp(0.6 + 0.08 * (p.pheoA + p.pheoN), 0.6, 1.2), label: 'phéochromocytome', ly: -42, title: 'Phéochromocytome', text: 'Tumeur des cellules chromaffines de la médullosurrénale. Le profil sécrétoire (adrénaline, noradrénaline, dopamine) oriente la clinique et le bilan.' },
        { node: 'nerve', kind: 'mass', tone: 'brown', dx: 30, dy: 40, show: (p) => p.pheoD > 0.02, size: () => 0.8, label: 'paragangliome', ly: 50, title: 'Paragangliome', text: 'Tumeur chromaffine extra-surrénalienne (chaîne sympathique abdominale, thorax, tête et cou). Les formes dopaminergiques sont souvent liées à SDHB (complément).' }
      ],
      levels: [{ label: 'Adrénaline', mol: 'adre', v: 'A', max: 8 }, { label: 'Noradrénaline', mol: 'nora', v: 'N', max: 8 }, { label: 'Dopamine', mol: 'dopa', v: 'D', max: 8 }]
    }
  };

  /* ===================== Axe gonadotrope féminin ===================== */
  SIMS.gonadoF = {
    title: 'Bilan gonadotrope simulé (femme)',
    defaults: { hypo: 1, ovary: 1, prl: 0, sopk: 0 },
    init: { lh: 1, fsh: 1, e2: 1, prog: 0.1, cyc: 1 },
    tau: { lh: 0.3, fsh: 0.4, e2: 0.5, prog: 0.6, cyc: 1 },
    targets(p, s, T) {
      const drive = p.hypo / (1 + 2 * p.prl);
      // SOPK : oligo-anovulation chronique (polycopié, partie 2, p. 15).
      const cyc = drive > 0.5 && p.ovary > 0.3 && p.sopk < 0.5;
      const res = 1 / (0.15 + 0.85 * Math.min(1, p.ovary)); // levée du rétrocontrôle quand l'ovaire s'épuise
      return {
        fsh: drive * (cyc ? R.fsh(T) : 0.6) * res,
        lh: drive * (cyc ? R.lh(T) : 0.45 * (1 + 0.8 * p.sopk)) / (0.2 + 0.8 * Math.min(1, p.ovary)), // LH tonique plutôt haute dans le SOPK (complément)
        e2: 0.04 + p.ovary * (cyc ? R.e2(T) : 0.1 + 0.2 * Math.min(1, drive)),
        prog: cyc ? R.prog(T) : 0.03,
        cyc: cyc ? 1 : 0 // cycle ovulatoire en cours : pic de LH et phase lutéale
      };
    },
    labs: [
      { key: 'fsh', name: 'FSH', unit: 'UI/L', range: '3–20 UI/L selon la phase (complément)', k: 10, lo: 3, hi: 20, min: 0, max: 100, dec: 1 },
      { key: 'lh', name: 'LH', unit: 'UI/L', range: '2–12 UI/L hors pic ovulatoire, pic jusqu\'à 70–80 (complément)', k: 14, lo: 2, hi: 12, min: 0, max: 80, dec: 1 },
      { key: 'e2', name: 'Estradiol', unit: 'pg/mL', range: '25–400 pg/mL selon la phase (complément)', k: 140, lo: 25, hi: 400, min: 0, max: 400, dec: 0 },
      { key: 'prog', name: 'Progestérone', unit: 'ng/mL', range: '> 5 ng/mL en phase lutéale (complément)', k: 10, lo: 0, hi: 25, min: 0, max: 20, dec: 1 },
      { key: 'testo', name: 'Testostérone totale', unit: '× N', range: 'valeur relative (complément : normes selon la technique)', lo: 0, hi: 1.5, min: 0, max: 6, dec: 1, fn: (s, p) => (0.3 + 0.7 * Math.min(1, p.ovary)) * (1 + 1.6 * p.sopk) },
      { key: 'prl', name: 'Prolactine', unit: 'ng/mL', range: '< 25 ng/mL (complément)', lo: 3, hi: 25, min: 1, max: 1000, log: true, dec: 0, fn: (s, p) => 12 * (1 + 4 * p.prl) }
    ],
    params: [
      { key: 'ovary', label: 'Réserve ovarienne', min: 0, max: 1, step: 0.01, fmt: pct },
      { key: 'hypo', label: 'Activité des neurones à GnRH', min: 0.02, max: 1.2, step: 0.01, fmt: pct },
      { key: 'sopk', label: 'Syndrome des ovaires polykystiques', min: 0, max: 1, step: 0.05, fmt: pct },
      { key: 'prl', label: 'Hyperprolactinémie', min: 0, max: 3, step: 0.05, fmt: x100 }
    ],
    scenarios: [
      { id: 'eu', name: 'Cycle normal', note: 'Phase folliculaire, pic de LH à J14, phase lutéale.', p: {} },
      { id: 'meno', name: 'Ménopause, insuffisance ovarienne', note: 'Plus de rétrocontrôle : FSH et LH élevées, estradiol bas, aménorrhée.', p: { ovary: 0 } },
      { id: 'hh', name: 'Déficit gonadotrope (anorexie mentale)', note: 'Baisse de la GnRH (anorexie mentale : baisse de la leptine ; complément) : LH, FSH et estradiol bas, aménorrhée.', p: { hypo: 0.12 } },
      { id: 'prl', name: 'Hyperprolactinémie', note: 'La prolactine inhibe la pulsatilité de la GnRH : aménorrhée.', p: { prl: 1.5 } },
      { id: 'sopk', name: 'Syndrome des ovaires polykystiques (SOPK)', note: 'Cause la plus fréquente d\'hirsutisme : hyperandrogénie (hirsutisme, acné, hyperséborrhée) et oligo-anovulation chronique, souvent obésité et hyperinsulinisme par insulinorésistance (acanthosis nigricans).', p: { sopk: 1 } }
    ],
    interpret(s, p, L, T) {
      const f = L('fsh'), e = L('e2'), prl = L('prl');
      // SOPK : 2 critères de Rotterdam sur 3, après exclusion des autres diagnostics (polycopié, partie 2, p. 15).
      if (p.sopk >= 0.5 && prl <= 25 && p.ovary > 0.3) return { tone: 'bad', label: 'Anovulation avec hyperandrogénie : SOPK ?', text: 'Critères de Rotterdam (2 sur 3) : troubles du cycle (spanioménorrhée, aménorrhée, infertilité) ; hyperandrogénie clinique ou biologique ; ovaires > 10 mL avec plus de 20 follicules par ovaire à l\'échographie. Diagnostic d\'exclusion : éliminer un bloc en 21-hydroxylase non classique (17-OHP), un syndrome de Cushing, une tumeur virilisante, une hyperprolactinémie. Rechercher l\'insulinorésistance (obésité, acanthosis nigricans).' };
      // « Ovulatoire » seulement si le cycle simulé comporte un pic de LH et une phase lutéale (progestérone > 5 ng/mL vers J21).
      if (s.cyc > 0.5) {
        if (T && T.d < 6 && f > 12) return { tone: 'warn', label: 'Cycle ovulatoire, FSH élevée', text: 'Pic de LH et phase lutéale conservés, mais FSH élevée en début de phase folliculaire : baisse de la réserve ovarienne (seuil indicatif ; complément).' };
        return { tone: 'good', label: 'Cycle ovulatoire', text: 'Pic de LH à mi-cycle puis progestérone > 5 ng/mL en phase lutéale : rétrocontrôles négatif puis positif de l\'estradiol conservés.' };
      }
      // Pas de pic de LH ni de phase lutéale : anovulation.
      if (f > 25 && e < 25) return { tone: 'bad', label: 'Hypogonadisme hypergonadotrope', text: 'Anovulation, FSH et LH élevées, estradiol bas : insuffisance ovarienne (ménopause, ou insuffisance ovarienne précoce avant 40 ans).' };
      if (f > 10) return { tone: 'bad', label: 'Anovulation, FSH élevée', text: 'Pas de pic de LH ni de phase lutéale, FSH élevée pour la phase (> 10 UI/L, seuil indicatif ; complément) avec estradiol bas : insuffisance ovarienne débutante ou précoce.' };
      if (prl > 25) return { tone: 'bad', label: 'Anovulation par hyperprolactinémie', text: 'Gonadotrophines basses ou inadaptées, estradiol bas ou normal bas : l\'hyperprolactinémie inhibe la pulsatilité de la GnRH (insuffisance gonadotrope fonctionnelle). Rechercher la cause (médicament, adénome à prolactine) et la corriger.' };
      return { tone: 'bad', label: 'Hypogonadisme hypogonadotrope', text: 'Anovulation avec FSH et LH basses ou inadaptées, estradiol bas ou normal bas : atteinte hypothalamo-hypophysaire (doser la prolactine).' };
    },
    hooks: {
      links: { 'hypo>pit>gnrh': null, 'pit>ovary>lh': 'lh', 'pit>ovary>fsh': 'fsh', 'ovary>uterus>e2': 'e2', 'ovary>uterus>prog': 'prog', 'ovary>breast>e2': 'e2', 'ovary>pit>e2': 'e2', 'ovary>hypo>e2': 'e2' },
      dropMod: true,
      cap: { ovary: 'ovary', hypo: 'hypo' },
      scale: { ovary: (p) => 0.7 + 0.3 * Math.min(1, p.ovary), uterus: (p, s) => 0.8 + 0.2 * Math.min(1, s.e2) },
      lesions: [
        { node: 'ovary', kind: 'label', show: (p) => p.ovary < 0.3, label: 'ovaire sans follicules', ly: -84, title: 'Épuisement folliculaire', text: 'Ménopause ou insuffisance ovarienne précoce (avant 40 ans) : plus de follicules, donc plus d\'estradiol ni d\'inhibine.' },
        { node: 'hypo', kind: 'label', show: (p) => p.hypo < 0.5, label: 'GnRH freinée', ly: -76, title: 'Aménorrhée hypothalamique', text: 'Baisse de la pulsatilité de la GnRH : insuffisance gonadotrope fonctionnelle. Causes (complément) : anorexie mentale, activité physique intense, stress (baisse de la leptine).' },
        { node: 'ovary', kind: 'label', show: (p) => p.sopk >= 0.5, label: 'ovaires multifolliculaires', ly: -96, title: 'Aspect échographique du SOPK', text: 'Ovaires augmentés de volume (> 10 mL) avec plus de 20 follicules pré-antraux par ovaire (critère de Rotterdam ; polycopié, partie 2, p. 15). La thèque produit les androgènes sous LH.' },
        { node: 'pit', kind: 'nodule', tone: 'magenta', dx: 30, dy: -26, show: (p) => p.prl > 0.3, label: 'prolactinome', title: 'Adénome à prolactine', text: 'La prolactine en excès inhibe la pulsatilité de la GnRH.' }
      ],
      extraNodes: [
        { id: 'skin', x: 920, y: 740, label: 'Peau, follicule pileux', w: 260, sub: 'hirsutisme, acné, hyperséborrhée', color: 'bad', show: (p) => p.sopk > 0.02, info: 'Hirsutisme : pilosité excessive dans les zones normalement glabres chez la femme ; score de Ferriman-Gallwey > 8 (polycopié, partie 2, p. 14).' },
        { id: 'ir', x: 1260, y: 820, label: 'Hyperinsulinisme', w: 220, sub: 'insulinorésistance, obésité', color: 'p-blue2', show: (p) => p.sopk > 0.02, info: 'Souvent associé au SOPK : hyperinsulinisme secondaire à une insulinorésistance, acanthosis nigricans (polycopié, partie 2, p. 15). L\'insuline stimule la production d\'androgènes par la thèque (complément).' }
      ],
      extraLinks: [
        { from: 'ovary', to: 'skin', mol: 'testo', v: 'sopkRate', label: 'androgènes' },
        { from: 'ir', to: 'ovary', kind: 'stim', mol: 'insulin', v: 'sopkRate', label: 'insuline' }
      ],
      rates: { sopkRate: (s, p) => 0.4 + 1.2 * p.sopk },
      levels: [{ label: 'LH', mol: 'lh', v: 'lh', max: 3 }, { label: 'FSH', mol: 'fsh', v: 'fsh', max: 3 }, { label: 'Estradiol', mol: 'e2', v: 'e2', max: 1.6 }, { label: 'Progestérone', mol: 'prog', v: 'prog', max: 1.6 }]
    }
  };

  /* ===================== Axe gonadotrope masculin ===================== */
  SIMS.gonadoM = {
    title: 'Bilan gonadotrope simulé (homme)',
    defaults: { hypo: 1, leydig: 1, sertoli: 1, exoT: 0 },
    init: { lh: 1, fsh: 1, t: 1, inh: 1 },
    targets(p, s) {
      const fbT = s.t + p.exoT;
      const lh = clamp(p.hypo * ex(-1.5 * (fbT - 1)), 0, 12);
      // La levée des rétrocontrôles est plafonnée : sans GnRH, la FSH reste basse (déficit gonadotrope).
      const fsh = clamp(p.hypo * Math.min(3, ex(-3 * (fbT - 1))) * Math.min(2, ex(-1.2 * (s.inh - 1))), 0, 14);
      const t = clamp(p.leydig * pw(lh, 0.7), 0, 5); // testostérone endogène (intratesticulaire, dépend de la LH)
      // L'inhibine B dépend de la FSH et de la testostérone intratesticulaire, pas de la testostérone exogène (complément).
      const inh = clamp(p.sertoli * fsh * pw(Math.min(t, 1.5), 0.3), 0, 3);
      return { lh, fsh, t, inh };
    },
    labs: [
      { key: 'tt', name: 'Testostérone (matinale, à jeun)', unit: 'nmol/L', range: '10–30 nmol/L, ≈ 3–8,7 ng/mL (complément)', lo: 10, hi: 30, min: 0, max: 60, dec: 1, fn: (s, p) => 18 * (s.t + p.exoT) },
      { key: 'lh', name: 'LH', unit: 'UI/L', range: '1,5–9 UI/L (complément)', k: 4.5, lo: 1.5, hi: 9, min: 0, max: 40, dec: 1 },
      { key: 'fsh', name: 'FSH', unit: 'UI/L', range: '1,5–12 UI/L (complément)', k: 5, lo: 1.5, hi: 12, min: 0, max: 60, dec: 1 },
      { key: 'inh', name: 'Inhibine B', unit: 'pg/mL', range: '> 80 pg/mL (complément)', k: 180, lo: 80, hi: 400, min: 0, max: 400, dec: 0 }
    ],
    params: [
      { key: 'leydig', label: 'Cellules de Leydig', min: 0.02, max: 1.2, step: 0.01, fmt: pct },
      { key: 'sertoli', label: 'Cellules de Sertoli', min: 0.02, max: 1.2, step: 0.01, fmt: pct },
      { key: 'hypo', label: 'Activité des neurones à GnRH', min: 0.02, max: 1.2, step: 0.01, fmt: pct },
      { key: 'exoT', label: 'Testostérone exogène', min: 0, max: 3, step: 0.05, fmt: x100 }
    ],
    scenarios: [
      { id: 'eu', name: 'Axe normal', note: 'Testostérone normale, spermatogenèse conservée.', p: {} },
      { id: 'prim', name: 'Hypogonadisme primaire (Klinefelter)', note: 'Atteinte testiculaire : LH et surtout FSH élevées, testostérone et inhibine B basses.', p: { leydig: 0.18, sertoli: 0.04 } },
      { id: 'hh', name: 'Hypogonadisme hypogonadotrope (Kallmann)', note: 'Défaut de GnRH : LH, FSH et testostérone basses.', p: { hypo: 0.05 } },
      { id: 'exo', name: 'Testostérone exogène', note: 'LH, FSH et inhibine B effondrées : production testiculaire et spermatogenèse arrêtées (complément).', p: { exoT: 1.6 } }
    ],
    interpret(s, p, L) {
      const t = L('tt'), lh = L('lh'), fsh = L('fsh'), inh = L('inh');
      if (p.exoT > 0.05) return { tone: 'warn', label: 'Axe freiné par les androgènes', text: 'LH, FSH et inhibine B effondrées malgré une testostérone normale ou haute : la testostérone intratesticulaire chute et la spermatogenèse s\'arrête (complément).' };
      if (t < 10 && (lh > 9 || fsh > 12)) return { tone: 'bad', label: 'Hypogonadisme hypergonadotrope', text: 'Testostérone basse avec gonadotrophines élevées : atteinte testiculaire.' };
      if (t < 10) return { tone: 'bad', label: 'Hypogonadisme hypogonadotrope', text: 'Testostérone basse avec gonadotrophines basses ou inadaptées : atteinte hypothalamo-hypophysaire.' };
      if (inh < 80) return { tone: 'warn', label: 'Atteinte tubulaire isolée', text: 'Inhibine B basse avec une testostérone normale (FSH ' + (fsh > 12 ? 'élevée' : 'normale haute') + ') : atteinte de la spermatogenèse (cellules de Sertoli) ; spermogramme.' };
      return { tone: 'good', label: 'Axe gonadotrope normal', text: 'Testostérone et gonadotrophines dans les normes.' };
    },
    hooks: {
      links: { 'pit>testis>lh': 'lh', 'pit>testis>fsh': 'fsh', 'testis>muscle>testo': 't', 'testis>bone>testo': 't', 'testis>brain>testo': 't', 'testis>pit>testo': 't', 'testis>hypo>testo': 't', 'testis>pit>inhib': 'inh' },
      cap: { testis: 'leydig', hypo: 'hypo' },
      scale: { testis: (p, s) => clamp(0.55 + 0.45 * Math.min(1, p.sertoli) * (p.exoT > 0.05 ? 0.75 : 1) * (p.hypo < 0.5 ? 0.75 : 1), 0.45, 1) },
      lesions: [
        { node: 'testis', kind: 'label', show: (p) => p.sertoli < 0.5, label: 'petits testicules fermes', ly: -84, title: 'Syndrome de Klinefelter', text: 'Caryotype 47,XXY : atrophie testiculaire (volume < 4 mL), azoospermie ; hyalinisation des tubes séminifères (complément).' },
        { node: 'testis', kind: 'label', show: (p) => p.exoT > 0.05, label: 'atrophie testiculaire', ly: -84, title: 'Atrophie sous androgènes', text: 'Sans LH ni FSH, les testicules s\'atrophient et la spermatogenèse s\'arrête.' },
        { node: 'hypo', kind: 'label', show: (p) => p.hypo < 0.5, label: 'défaut de GnRH (± anosmie)', ly: -76, title: 'Syndrome de Kallmann', text: 'Défaut de migration des neurones à GnRH, souvent associé à une anosmie (complément).' }
      ],
      extraNodes: [{ id: 'exo', x: 920, y: 760, label: 'Testostérone exogène', w: 260, color: 'p-blue', show: (p) => p.exoT > 0.02, info: 'Les androgènes exogènes freinent LH et FSH.' }],
      extraLinks: [{ from: 'exo', to: 'pit', kind: 'inhib', mol: 'testo', v: 'exoRate', label: '' }],
      rates: { exoRate: (s, p) => p.exoT },
      levels: [{ label: 'LH', mol: 'lh', v: 'lh', max: 4 }, { label: 'Testostérone', mol: 'testo', v: 't', max: 2 }]
    }
  };

  /* ===================== Phosphocalcique ===================== */
  SIMS.phospho = {
    title: 'Bilan phosphocalcique simulé',
    defaults: { para: 1, autoPara: 0, vitD: 1, pthrp: 0, casr: 1 },
    init: { ca: 2.4, pth: 1, d: 1 },
    tau: { ca: 2 },
    targets(p, s) {
      // CaSR peu sensible (hypercalcémie hypocalciurique familiale) : la consigne de calcémie est déplacée vers le haut.
      const shift = 0.32 * (1 - p.casr);
      const pth = clamp(p.para * Math.min(4 + 40 * (p.para - 0.05), ex(-12 * (s.ca - 2.4 - shift))), 0, 20) + p.autoPara;
      const d = clamp(pw(pth, 0.6) * p.vitD, 0, 5);
      const ca = 2.4 + shift + 0.4 * ln((0.6 * (pth + 1.5 * p.pthrp) + 0.4) * (0.5 + 0.5 * d));
      return { pth, d, ca: clamp(ca, 1.5, 3.6) };
    },
    labs: [
      { key: 'ca', name: 'Calcémie totale', unit: 'mmol/L', k: 1, lo: 2.2, hi: 2.6, min: 1.6, max: 3.4, dec: 2 },
      { key: 'pth', name: 'PTH', unit: 'pg/mL', range: '15–65 pg/mL (complément)', k: 35, lo: 15, hi: 65, min: 0, max: 300, dec: 0 },
      { key: 'vd', name: '25-OH vitamine D', unit: 'ng/mL', range: '30–60 ng/mL (complément)', lo: 30, hi: 60, min: 0, max: 80, dec: 0, fn: (s, p) => 40 * p.vitD },
      // La PTHrP est phosphaturique comme la PTH (complément) : phosphatémie basse dans l'hypercalcémie humorale.
      // Calciurie : charge filtrée (calcémie) moins la réabsorption stimulée par la PTH (ou la PTHrP) ; le CaSR rénal peu sensible
      // de l'hypercalcémie hypocalciurique familiale fait réabsorber davantage (complément).
      { key: 'cau', name: 'Calciurie', unit: 'mmol/24 h', range: '2,5–7,5 mmol/24 h (complément)', lo: 2.5, hi: 7.5, min: 0, max: 16, dec: 1, fn: (s, p) => clamp((4.5 * ex(3 * (s.ca - 2.4)) * pw(p.casr, 1.2)) / (1 + 0.25 * ln(Math.max(s.pth + 1.5 * p.pthrp, 0.2))), 0.3, 15) },
      { key: 'phos', name: 'Phosphatémie', unit: 'mmol/L', range: '0,8–1,45 mmol/L (complément)', lo: 0.8, hi: 1.45, min: 0.3, max: 2.4, dec: 2, fn: (s, p) => clamp(1.1 - 0.3 * ln(Math.max(s.pth + 1.5 * p.pthrp, 0.05)) + 0.12 * (s.d - 1), 0.4, 2.3) }
    ],
    params: [
      { key: 'autoPara', label: 'Adénome parathyroïdien', min: 0, max: 6, step: 0.1, fmt: x100 },
      { key: 'para', label: 'Tissu parathyroïdien fonctionnel', min: 0.03, max: 1.5, step: 0.01, fmt: pct },
      { key: 'vitD', label: 'Statut en vitamine D', min: 0.05, max: 1.5, step: 0.01, fmt: pct },
      { key: 'pthrp', label: 'PTHrP tumorale', min: 0, max: 4, step: 0.1, fmt: x100 },
      { key: 'casr', label: 'Sensibilité du CaSR', min: 0.2, max: 1.2, step: 0.01, fmt: pct }
    ],
    scenarios: [
      { id: 'eu', name: 'Équilibre normal', note: 'Calcémie stable grâce au CaSR et à la PTH.', p: {} },
      { id: 'hpt', name: 'Hyperparathyroïdie primaire', note: 'Adénome : hypercalcémie avec PTH élevée ou inadaptée, phosphatémie basse ou normale basse.', p: { autoPara: 2.5 } },
      { id: 'hypo', name: 'Hypoparathyroïdie (post-chirurgicale)', note: 'Hypocalcémie avec PTH basse ou inadaptée, phosphatémie haute.', p: { para: 0.05 } },
      { id: 'vitd', name: 'Carence en vitamine D', note: 'Hyperparathyroïdie secondaire (complément) : calcémie basse ou normale, PTH élevée.', p: { vitD: 0.1 } },
      { id: 'pthrp', name: 'Hypercalcémie tumorale', note: 'PTHrP (complément) : elle agit comme la PTH sur l\'os et sur le rein (réabsorption du calcium, fuite de phosphate) ; hypercalcémie avec PTH effondrée, phosphatémie basse.', p: { pthrp: 3.5 } },
      { id: 'hhf', name: 'Hypercalcémie hypocalciurique familiale', note: 'Complément (absente du polycopié) : CaSR peu sensible (mutation inactivatrice) ; hypercalcémie modérée, PTH normale ou un peu élevée, calciurie basse. Bénigne : à distinguer de l\'hyperparathyroïdie primaire, car elle ne s\'opère pas.', p: { casr: 0.3 } }
    ],
    interpret(s, p, L) {
      const ca = L('ca'), pth = L('pth');
      if (ca > 2.6 && L('cau') < 2.5) return { tone: 'warn', label: 'Hypercalcémie avec calciurie basse', text: 'PTH normale ou peu élevée et calciurie basse : évoquer une hypercalcémie hypocalciurique familiale (complément), bénigne, qui ne s\'opère pas.' };
      if (ca > 2.6 && pth >= 30) return { tone: 'bad', label: 'Hypercalcémie PTH-dépendante', text: 'PTH élevée ou inadaptée face à l\'hypercalcémie : hyperparathyroïdie primaire. Calciurie élevée : la charge filtrée de calcium dépasse les capacités de réabsorption (polycopié p. 40–41).' };
      if (ca > 2.6) return { tone: 'bad', label: 'Hypercalcémie non parathyroïdienne', text: 'PTH freinée : rechercher une cause tumorale (PTHrP, métastases osseuses) ou une intoxication en vitamine D (complément).' };
      if (ca < 2.2 && pth < 30) return { tone: 'bad', label: 'Hypoparathyroïdie', text: 'Hypocalcémie avec PTH basse ou inadaptée.' };
      if (pth > 65) return { tone: 'warn', label: 'Hyperparathyroïdie secondaire', text: 'PTH élevée qui maintient la calcémie : carence en vitamine D ou insuffisance rénale (complément).' };
      return { tone: 'good', label: 'Équilibre phosphocalcique normal', text: 'Calcémie et PTH dans les normes.' };
    },
    hooks: {
      links: { 'para>kidney>pth': 'pth', 'para>bone>pth': 'pth', 'kidney>gut>calcitriol': 'd', 'bone>ca>ca': 'pth' },
      dropMod: true,
      cap: { para: 'para' },
      lesions: [
        { node: 'para', kind: 'nodule', tone: 'brown', dx: 38, dy: 30, size: (p) => clamp(0.8 + 0.12 * p.autoPara, 0.8, 1.5), show: (p) => p.autoPara > 0.02, label: 'adénome parathyroïdien', ly: 34, title: 'Adénome parathyroïdien', text: 'Tumeur unique, ovalaire, encapsulée, brun orangé ; les autres glandes sont freinées (complément).' },
        { node: 'para', kind: 'cross', show: (p) => p.para < 0.5, label: 'glandes lésées (chirurgie)', ly: 34, title: 'Hypoparathyroïdie', text: 'Le plus souvent après chirurgie cervicale (thyroïdectomie) : glandes retirées ou dévascularisées.' },
        { node: 'para', kind: 'label', show: (p, s) => p.vitD < 0.5 && s.pth > 1.5, label: 'hyperplasie des 4 glandes', ly: -76, title: 'Hyperparathyroïdie secondaire', text: 'La carence en vitamine D stimule les quatre glandes, qui grossissent (complément).' }
      ],
      extraNodes: [{ id: 'tumor', x: 1360, y: 760, label: 'Tumeur (PTHrP)', w: 220, color: 'bad', show: (p) => p.pthrp > 0.02, info: 'La PTHrP se fixe sur le récepteur de la PTH : elle agit sur l\'os (résorption) et sur le rein (réabsorption du calcium, fuite de phosphate). Elle stimule peu la production de calcitriol (complément).' }],
      extraLinks: [{ from: 'tumor', to: 'bone', kind: 'stim', color: 'bad', label: 'PTHrP' }, { from: 'tumor', to: 'kidney', kind: 'stim', color: 'bad', bend: 80, label: 'PTHrP' }],
      liveNode: { ca: (s) => f2(s.ca) + ' mmol/L' },
      levels: [{ label: 'Calcémie', mol: 'ca', fn: (s) => (s.ca - 2.0) * 2.5, max: 2 }, { label: 'PTH', mol: 'pth', v: 'pth', max: 4 }]
    }
  };

  /* ===================== SRAA ===================== */
  SIMS.raa = {
    title: 'Bilan rénine-aldostérone simulé',
    defaults: { conn: 0, sten: 0, adr: 1, salt: 0 },
    init: { renin: 1, aldo: 1, k: 4.2, vol: 1 },
    tau: { k: 2, vol: 2 },
    targets(p, s) {
      const renin = clamp((1 + 3 * p.sten) * ex(-8 * (s.vol - 1) - 2.2 * p.salt), 0.02, 20); // la charge sodée freine la rénine (macula densa, volémie)
      const aldo = clamp(p.adr * pw(renin, 0.8) * ex(1.2 * (s.k - 4.2)), 0, 20) + p.conn;
      const vol = 1 + 0.1 * ln(Math.max(aldo, 0.05)) + 0.04 * p.salt; // charge sodée : expansion volémique
      const k = clamp(4.2 - 0.55 * ln(Math.max(aldo, 0.05)), 2.2, 7);
      return { renin, aldo, vol, k };
    },
    labs: [
      { key: 'renin', name: 'Rénine active', unit: 'mUI/L', range: '5–40 mUI/L', k: 15, lo: 5, hi: 40, min: 0.2, max: 400, log: true, dec: 1 },
      { key: 'aldo', name: 'Aldostérone', unit: 'pmol/L', range: '100–550 pmol/L', k: 300, lo: 100, hi: 550, min: 10, max: 4000, log: true, dec: 0 },
      { key: 'k', name: 'Kaliémie', unit: 'mmol/L', k: 1, lo: 3.5, hi: 5, min: 2, max: 7, dec: 1 },
      { key: 'na', name: 'Natrémie', unit: 'mmol/L', range: '135–145 mmol/L', lo: 135, hi: 145, min: 120, max: 150, dec: 0, fn: (s) => clamp(140 + 3 * ln(Math.max(s.aldo, 0.05)), 122, 148) },
      { key: 'pas', name: 'PA systolique', unit: 'mmHg', range: '100–140 mmHg', lo: 100, hi: 140, min: 70, max: 220, dec: 0, fn: (s, p) => clamp(120 + 250 * (s.vol - 1) + 18 * p.sten, 75, 210) }
    ],
    params: [
      { key: 'conn', label: 'Sécrétion autonome d\'aldostérone', min: 0, max: 8, step: 0.1, fmt: x100 },
      { key: 'sten', label: 'Hypoperfusion rénale (sténose)', min: 0, max: 3, step: 0.05, fmt: x100 },
      { key: 'adr', label: 'Zone glomérulée fonctionnelle', min: 0.02, max: 1.5, step: 0.01, fmt: pct }
    ],
    scenarios: [
      { id: 'eu', name: 'Système normal', note: 'Rénine et aldostérone adaptées à la volémie.', p: {} },
      { id: 'hap', name: 'Hyperaldostéronisme primaire', note: 'Aldostérone autonome : rénine freinée, HTA, hypokaliémie (2/3 des cas).', p: { conn: 3.5 } },
      { id: 'sec', name: 'Hyperaldostéronisme secondaire', note: 'Hypoperfusion rénale : rénine et aldostérone élevées, HTA, tendance à l\'hypokaliémie.', p: { sten: 2 } },
      { id: 'ais', name: 'Insuffisance surrénale périphérique', note: 'Déficit en aldostérone : rénine élevée, hypotension, tendance à l\'hyponatrémie et à l\'hyperkaliémie (l\'ionogramme peut être normal).', p: { adr: 0.05 } }
    ],
    interpret(s, p, L) {
      const r = L('renin'), a = L('aldo');
      if (a > 550 && r < 10) return { tone: 'bad', label: 'Hyperaldostéronisme primaire', text: 'Aldostérone élevée et rénine basse (rapport aldostérone/rénine élevé) : rechercher un adénome de Conn ou une hyperplasie bilatérale.' };
      if (a > 550 && r > 40) return { tone: 'bad', label: 'Hyperaldostéronisme secondaire', text: 'Rénine et aldostérone élevées : hypoperfusion rénale.' };
      if (a < 100 && r > 30) return { tone: 'bad', label: 'Déficit minéralocorticoïde', text: 'Aldostérone basse et rénine élevée : insuffisance surrénale périphérique.' };
      return { tone: 'good', label: 'SRAA normal', text: 'Rénine et aldostérone adaptées.' };
    },
    hooks: {
      links: { 'jga>liver>renin': 'renin', 'liver>lung>angio1': 'renin', 'lung>adr>angio': 'renin', 'adr>tub>aldo': 'aldo', 'tub>ecf>nai': 'aldo', 'tub>ecf>water': 'aldo', 'tub>k>k': 'aldo' },
      scale: { ecf: (p, s) => clamp(0.85 + 1.2 * (s.vol - 1), 0.7, 1.4) },
      liveNode: {
        k: (s) => f1(s.k) + ' mmol/L' + (s.k < 3.5 ? ' ↓' : s.k > 5 ? ' ↑' : ''),
        vol: (s) => 'PAS ' + Math.round(clamp(120 + 250 * (s.vol - 1), 75, 210)) + ' mmHg' + (s.vol > 1.06 ? ' ↑' : s.vol < 0.95 ? ' ↓' : '')
      },
      extraNodes: [{ id: 'salt', x: 1060, y: 760, label: 'Sérum salé', w: 180, color: 'p-amber', show: (p) => p.salt > 0.02, info: 'L\'expansion volémique freine la rénine, donc normalement l\'aldostérone.' }],
      extraLinks: [{ from: 'salt', to: 'vol', kind: 'stim', mol: 'nai', label: '' }],
      lesions: [
        { node: 'adr', kind: 'nodule', tone: 'yellow', dx: -34, dy: -30, show: (p) => p.conn > 0.02, ly: -26, label: 'adénome de Conn', title: 'Adénome de Conn', text: 'Sécrétion unilatérale d\'aldostérone (1/3 des cas) ; sinon hyperplasie bilatérale (2/3). Le cathétérisme des veines surrénales distingue les deux.' },
        { node: 'jga', kind: 'stenosis', dx: 30, dy: -46, show: (p) => p.sten > 0.05, label: 'sténose de l\'artère rénale', ly: -24, title: 'Hypoperfusion rénale', text: 'La baisse de perfusion stimule la rénine : hyperaldostéronisme secondaire.' },
        { node: 'adr', kind: 'infiltrate', dy: -10, show: (p) => p.adr < 0.5, label: 'destruction surrénalienne', title: 'Insuffisance surrénale périphérique', text: 'Déficit en aldostérone et en cortisol.' }
      ],
      levels: [{ label: 'Rénine', mol: 'renin', v: 'renin', max: 4 }, { label: 'Aldostérone', mol: 'aldo', v: 'aldo', max: 4 }]
    }
  };

  /* ===================== Glycémie ===================== */
  const meal = (T) => R.meals.reduce((a, m) => a + G(((T.h - m + 24) % 24), 0.8, 0.6), 0);
  SIMS.glyc = {
    title: 'Bilan glucidique simulé',
    defaults: { beta: 1, sens: 1, tumor: 0, exo: 0, glucResp: 1, fast: 0, ogtt: 0, long: 0 },
    init: { g: 0.9, ins: 1, insE: 1, glu: 1, ket: 0.1 },
    tau: { g: 0.8, ins: 0.4, insE: 0.4, glu: 0.5, ket: 2 },
    targets(p, s, T) {
      const food = meal(T) * (1 - p.fast) + 4 * p.ogtt; // repas, jeûne, charge orale de 75 g
      const insE = p.beta * clamp((s.g - 0.65) * 4, 0, 8) + p.tumor; // insuline pancréatique (îlots, insulinome)
      const ins = insE + p.exo * (0.6 + 0.6 * meal(T)); // + insuline injectée
      const eff = ins * p.sens;
      const glu = p.glucResp * clamp(1 + 4 * Math.max(0, 0.85 - s.g) - 0.3 * Math.min(eff, 2), 0.1, 6);
      // Production hépatique : freinée par l'insuline, emballée quand elle manque.
      // Jeûne prolongé (long : 0 → 1 sur 72 h) : le glycogène s'épuise, la production hépatique baisse un peu.
      const prod = ((0.55 + 0.45 * glu) * (1 + 5 * Math.max(0, 0.3 - eff)) * (1 - 0.45 * p.long)) / (1 + 0.8 * eff);
      const g = clamp(0.12 + 0.35 * food / (0.4 + 0.6 * Math.min(eff, 3)) + 1.25 * prod, 0.25, 6);
      const ket = clamp(0.05 + 10 * Math.max(0, 0.25 - eff), 0, 8);
      return { ins, insE, glu, g, ket };
    },
    labs: [
      { key: 'g', name: 'Glycémie', unit: 'g/L', range: 'à jeun 0,80–1,10 g/L ; 0,70–1,40 sur la journée (complément)', k: 1, lo: 0.7, hi: 1.4, min: 0.2, max: 4, dec: 2 },
      { key: 'ins', name: 'Insulinémie', unit: 'µUI/mL', range: '2–25 µUI/mL (complément)', k: 8, lo: 2, hi: 25, min: 0, max: 120, dec: 1 },
      { key: 'ket', name: 'Cétonémie', unit: 'mmol/L', range: '< 0,6 mmol/L (complément)', k: 1, lo: 0, hi: 0.6, min: 0, max: 6, dec: 1 }
    ],
    params: [
      { key: 'beta', label: 'Masse de cellules β', min: 0, max: 1.5, step: 0.01, fmt: pct },
      { key: 'sens', label: 'Sensibilité à l\'insuline', min: 0.1, max: 1.5, step: 0.01, fmt: pct },
      { key: 'tumor', label: 'Insulinome', min: 0, max: 4, step: 0.1, fmt: x100 },
      { key: 'exo', label: 'Insuline injectée', min: 0, max: 3, step: 0.05, fmt: x100 },
      { key: 'glucResp', label: 'Réponse du glucagon', min: 0, max: 1.2, step: 0.01, fmt: pct }
    ],
    scenarios: [
      { id: 'eu', name: 'Sujet sain', note: 'Insuline après les repas, glucagon la nuit.', p: {} },
      { id: 'dt1', name: 'Diabète de type 1', note: 'Destruction auto-immune des cellules β : carence totale en insuline, cétose.', p: { beta: 0.02 } },
      { id: 'dt1t', name: 'DT1 traité, surdosage en insuline', note: 'Insuline exogène sans baisse possible et réponse du glucagon perdue : hypoglycémies.', p: { beta: 0.02, exo: 2.4, glucResp: 0.15 } },
      { id: 'dt2', name: 'Diabète de type 2', note: 'Insulinorésistance et défaut de sécrétion d\'insuline : glycémie à jeun ≥ 1,26 g/L.', p: { sens: 0.2, beta: 0.35 } },
      { id: 'insulinome', name: 'Insulinome', note: 'Sécrétion autonome d\'insuline : hypoglycémies de jeûne avec insuline inappropriée.', p: { tumor: 4.5 } }
    ],
    interpret(s, p, L) {
      const g = L('g'), k = L('ket'), i = L('ins');
      if (g < 0.5) return { tone: 'bad', label: 'Hypoglycémie', text: i > 3 ? 'Glycémie < 0,50 g/L avec insuline non freinée : hyperinsulinisme (insulinome, insuline exogène).' : 'Glycémie basse : resucrage immédiat.' };
      if (g < 0.7 && p.exo === 0 && i > 3) return { tone: 'warn', label: 'Glycémie basse, insuline inappropriée', text: 'Hors diabète, l\'hypoglycémie se définit par une glycémie < 0,50 g/L (triade de Whipple) ; une insuline non freinée devant une glycémie basse fait évoquer un insulinome (épreuve de jeûne).' };
      if (g < 0.7 && p.exo > 0) return { tone: 'bad', label: 'Hypoglycémie du diabétique, niveau ' + (g < 0.54 ? 2 : 1), text: g < 0.54 ? 'Glycémie < 0,54 g/L sous insuline : hypoglycémie de niveau 2.' : 'Glycémie entre 0,54 et 0,70 g/L sous insuline : hypoglycémie de niveau 1.' };
      if (k > 0.6 && g > 2) return { tone: 'bad', label: 'Hyperglycémie avec cétose', text: 'Carence en insuline : la lipolyse et la cétogenèse s\'emballent (risque d\'acidocétose).' };
      if (g >= 1.26) return { tone: 'warn', label: 'Hyperglycémie', text: 'Glycémie élevée : diabète si ≥ 1,26 g/L à jeun à deux reprises ou ≥ 2,00 g/L avec symptômes. Entre 1,10 et 1,25 g/L à jeun : hyperglycémie modérée à jeun.' };
      return { tone: 'good', label: 'Glycémie normale', text: 'Équilibre insuline / glucagon conservé.' };
    },
    hooks: {
      links: { 'islet>liver>insulin': 'insE', 'islet>muscle>insulin': 'insE', 'islet>fat>insulin': 'insE', 'pen>liver>insulin': 'exoRate', 'pen>muscle>insulin': 'exoRate', 'pen>fat>insulin': 'exoRate', 'islet>liver>glucagon': 'glu', 'liver>keto>ketone': 'ket', 'fat>liver>ffa': 'ket' },
      dropMod: ['islet>liver>insulin', 'islet>muscle>insulin', 'islet>fat>insulin', 'islet>liver>glucagon', 'liver>keto>ketone', 'fat>liver>ffa'],
      cap: { islet: 'beta' },
      extraNodes: [
        { id: 'pen', x: 1360, y: 700, label: 'Insuline injectée', w: 240, sub: 'sous-cutanée', color: 'p-blue2', show: (p) => p.exo > 0.02, info: 'Insuline exogène (stylo, pompe) : elle ne vient pas du pancréas et ne s\'adapte pas à la glycémie. Les cellules β détruites (DT1) ne sécrètent plus rien.' },
        { id: 'fast', x: 420, y: 600, label: 'Jeûne', w: 150, color: 'p-grey', show: (p) => p.fast > 0.02 && p.ogtt < 0.02, info: 'Plus d\'apport alimentaire : la glycémie dépend de la production hépatique, l\'insuline doit s\'effondrer.' },
        { id: 'ogtt', x: 430, y: 600, label: 'Glucose 75 g', w: 180, color: 'p-lime', show: (p) => p.ogtt > 0.02, info: 'Charge orale de l\'HGPO.' }
      ],
      extraLinks: [{ from: 'pen', to: 'muscle', kind: 'stim', mol: 'insulin', label: 'insuline injectée', bend: -40 }, { from: 'pen', to: 'fat', kind: 'stim', mol: 'insulin', label: '', bend: -20 }, { from: 'pen', to: 'liver', kind: 'stim', mol: 'insulin', label: '', bend: -80 }, { from: 'fast', to: 'gut', kind: 'inhib', color: 'p-grey', label: '' }, { from: 'ogtt', to: 'glc', kind: 'stim', mol: 'glucose', v: 'ogttRate', label: '' }],
      rates: { ogttRate: (s, p) => 3 * p.ogtt, exoRate: (s, p) => p.exo * 0.8 },
      scale: { fat: (p) => (p.sens < 0.6 ? 1.3 : 1) },
      lesions: [
        { node: 'islet', kind: 'infiltrate', dx: 6, dy: -24, show: (p) => p.beta < 0.5, label: 'insulite auto-immune', ly: -40, title: 'Diabète de type 1', text: 'Destruction auto-immune des cellules β (infiltrat lymphocytaire des îlots).' },
        { node: 'islet', kind: 'nodule', tone: 'blue', dx: -36, dy: 10, show: (p) => p.tumor > 0.02, label: 'insulinome', title: 'Insulinome', text: 'Tumeur endocrine pancréatique sécrétant l\'insuline de façon autonome.' },
        { node: 'fat', kind: 'label', show: (p) => p.sens < 0.6, label: 'adiposité viscérale', ly: -84, title: 'Insulinorésistance', text: 'Diabète de type 2 : insulinorésistance (foie, muscle, tissu adipeux) et défaut de sécrétion.' }
      ],
      liveNode: { glc: (s) => f2(s.g) + ' g/L' },
      clockLabel: (s) => f2(s.g) + ' g/L',
      levels: [{ label: 'Glycémie', mol: 'glucose', fn: (s) => s.g - 0.3, max: 2 }, { label: 'Insuline', mol: 'insulin', v: 'ins', max: 4 }, { label: 'Glucagon', mol: 'glucagon', v: 'glu', max: 3 }]
    }
  };

  /* ===================== Lipoprotéines ===================== */
  SIMS.lipid = {
    title: 'Bilan lipidique simulé',
    defaults: { ldlr: 1, apob: 1, pcsk9g: 0, statin: 0, pcsk9i: 0, tg: 1 },
    init: { ldl: 1, rec: 1 },
    tau: { ldl: 2.5 },
    targets(p, s) {
      // Récepteurs fonctionnels : mutation du récepteur (ldlr), de l'apoB (apob : LDL mal reconnues) ou gain de fonction de PCSK9 (pcsk9g).
      const rec = p.ldlr * p.apob * (1 + 0.9 * p.statin) * (1 + 1.4 * p.pcsk9i) / (1 + p.pcsk9g * (1 - 0.8 * p.pcsk9i));
      return { rec, ldl: clamp(1 / Math.max(rec, 0.05), 0.15, 12) };
    },
    labs: [
      { key: 'ldl', name: 'LDL-cholestérol', unit: 'g/L', range: 'objectif selon le risque CV : < 0,55 à < 1,90 g/L', k: 1.2, lo: 0, hi: 1.9, min: 0, max: 8, dec: 2 },
      { key: 'hdl', name: 'HDL-cholestérol', unit: 'g/L', range: '> 0,40 g/L', lo: 0.4, hi: 1.2, min: 0, max: 1.2, dec: 2, fn: () => 0.55 },
      { key: 'tgl', name: 'Triglycérides', unit: 'g/L', range: '< 1,50 g/L', lo: 0, hi: 1.5, min: 0, max: 10, dec: 2, fn: (s, p) => 1 * p.tg }
    ],
    params: [
      { key: 'ldlr', label: 'Récepteurs des LDL fonctionnels', min: 0.02, max: 1.2, step: 0.01, fmt: pct },
      { key: 'apob', label: 'ApoB100 reconnue (complément)', min: 0.1, max: 1, step: 0.01, fmt: pct },
      { key: 'pcsk9g', label: 'PCSK9 gain de fonction (complément)', min: 0, max: 1.5, step: 0.05, fmt: x100 },
      { key: 'statin', label: 'Statine', min: 0, max: 1, step: 0.05, fmt: pct },
      { key: 'pcsk9i', label: 'Anti-PCSK9', min: 0, max: 1, step: 0.05, fmt: pct },
      { key: 'tg', label: 'Production de VLDL (triglycérides)', min: 0.3, max: 8, step: 0.1, fmt: x100 }
    ],
    scenarios: [
      { id: 'eu', name: 'Profil normal', note: 'LDL captées par leurs récepteurs.', p: {} },
      { id: 'hfhe', name: 'Hypercholestérolémie familiale hétérozygote', note: 'Moitié des récepteurs des LDL : LDL-c doublé (complément), xanthomes tendineux, arc cornéen précoce.', p: { ldlr: 0.5 } },
      { id: 'hfho', name: 'Hypercholestérolémie familiale homozygote', note: 'Récepteurs quasi absents : LDL-c très élevé dès l\'enfance.', p: { ldlr: 0.15 } },
      { id: 'apob', name: 'HF par mutation de l\'apoB (complément)', note: 'Récepteurs normaux mais LDL mal reconnues (apoB100 mutée) : LDL-c élevé (complément ; le polycopié ne détaille pas les gènes).', p: { apob: 0.5 } },
      { id: 'pcsk9g', name: 'HF par gain de fonction de PCSK9 (complément)', note: 'PCSK9 trop active : récepteurs dégradés en excès, peu de LDL internalisées (complément ; le polycopié ne détaille pas les gènes).', p: { pcsk9g: 1 } },
      { id: 'statin', name: 'HF hétérozygote sous statine', note: 'La statine (complément) freine l\'HMG-CoA réductase : plus de récepteurs des LDL. Risque d\'emblée élevé : objectif LDL-c < 0,70 g/L.', p: { ldlr: 0.5, statin: 1 } },
      { id: 'pcsk9', name: 'HF hétérozygote, statine + anti-PCSK9', note: 'Les récepteurs ne sont plus dégradés : baisse supplémentaire du LDL-c (complément).', p: { ldlr: 0.5, statin: 1, pcsk9i: 1 } },
      { id: 'htg', name: 'Hypertriglycéridémie', note: 'Excès de VLDL et de chylomicrons ; risque de pancréatite au-delà de 10 g/L.', p: { tg: 5 } }
    ],
    interpret(s, p, L) {
      const ldl = L('ldl'), tg = L('tgl');
      // Objectifs de LDL-c selon le risque cardiovasculaire (polycopié) : < 0,55 / 0,70 / 1,00 / 1,90 g/L.
      // L'hypercholestérolémie familiale est d'emblée à risque élevé : objectif < 0,70 g/L.
      const fh = p.ldlr < 0.7 || p.apob < 0.7 || p.pcsk9g > 0.4;
      if (fh && ldl > 0.7) {
        const tx = p.statin > 0.02 || p.pcsk9i > 0.02 ? 'intensifier le traitement (ézétimibe, anti-PCSK9 ; complément).' : 'traitement hypolipémiant (statine ; complément).';
        return { tone: 'bad', label: ldl > 1.9 ? 'Hypercholestérolémie familiale' : 'LDL-c au-dessus de l\'objectif', text: 'Hypercholestérolémie familiale : risque cardiovasculaire d\'emblée élevé, objectif LDL-c < 0,70 g/L ; ' + tx };
      }
      if (fh) return { tone: 'good', label: 'LDL-c à l\'objectif', text: 'Hypercholestérolémie familiale traitée : LDL-c < 0,70 g/L, objectif du risque élevé atteint.' };
      if (ldl > 1.9) return { tone: 'bad', label: 'Hypercholestérolémie', text: 'LDL-c > 1,90 g/L, au-dessus de l\'objectif même à risque faible : rechercher une hypercholestérolémie familiale (xanthomes, arc cornéen, antécédents).' };
      if (tg > 1.5) return { tone: 'warn', label: 'Hypertriglycéridémie', text: 'Triglycérides > 1,50 g/L ; au-delà de 10 g/L, risque de pancréatite aiguë.' + (tg > 3.4 ? ' Au-delà de 3,4 g/L, la formule de Friedewald n\'est pas applicable : LDL-c à mesurer directement.' : '') };
      return { tone: 'good', label: 'Bilan lipidique normal', text: 'LDL-c < 1,90 g/L et triglycérides < 1,50 g/L : à confronter à l\'objectif fixé par le risque cardiovasculaire (< 0,55 à < 1,90 g/L).' };
    },
    hooks: {
      links: { 'plasma>ldlr>ldl': 'recRate', 'ldlr>liver>ldl': 'recRate', 'plasma>artery>ldl': 'ldl', 'plasma>periph>ldl': 'ldl', 'liver>hmg>chol': 'rec', 'liver>plasma>vldl': 'tgRate', 'liver>pcsk9>pcsk9': 'pcsk9Rate', 'pcsk9>ldlr>pcsk9': 'pcsk9Rate' },
      // Peu de récepteurs : les LDL ne passent presque plus dans l'hépatocyte et s'accumulent dans le plasma.
      rates: { tgRate: (s, p) => p.tg, recRate: (s) => Math.pow(Math.min(s.rec, 2.5), 1.6), pcsk9Rate: (s, p) => (1 - 0.9 * p.pcsk9i) * (1 + 2 * p.pcsk9g) },
      scale: { plasma: (p, s) => clamp(0.85 + 0.12 * s.ldl, 0.85, 1.5) },
      extraNodes: [
        { id: 'statin', x: 1380, y: 570, label: 'Statine', w: 170, color: 'p-blue', show: (p) => p.statin > 0.02, info: 'Inhibe l\'HMG-CoA réductase : le cholestérol intracellulaire baisse, l\'hépatocyte exprime plus de récepteurs des LDL (complément).' },
        { id: 'antip', x: 1380, y: 870, label: 'Anti-PCSK9', w: 180, color: 'p-blue', show: (p) => p.pcsk9i > 0.02, info: 'Anticorps monoclonal (ou ARN interférent) : les récepteurs des LDL ne sont plus dégradés (complément).' }
      ],
      extraLinks: [{ from: 'statin', to: 'hmg', kind: 'inhib', color: 'p-blue', label: '' }, { from: 'antip', to: 'pcsk9', kind: 'inhib', color: 'p-blue', label: '' }],
      lesions: [
        { node: 'ldlr', kind: 'label', show: (p) => p.ldlr < 0.7 || p.apob < 0.7 || p.pcsk9g > 0.4, label: 'peu de LDL internalisées', ly: -96, title: 'Hypercholestérolémie familiale', text: 'Mutation (complément : le plus souvent du gène du récepteur des LDL, plus rarement de l\'apoB ou gain de fonction de PCSK9) : moins de récepteurs hépatiques, LDL-c élevé ; xanthomes tendineux, arc cornéen.' },
        { node: 'artery', kind: 'nodule', tone: 'yellow', dx: 0, dy: -4, show: (p, s) => s.ldl > 1.6, label: 'plaque d\'athérome', ly: -26, title: 'Athérome', text: 'Accumulation de LDL oxydées dans l\'intima (complément).' }
      ],
      levels: [{ label: 'LDL-c', mol: 'ldl', v: 'ldl', max: 5 }, { label: 'Récepteurs', mol: 'ldlr', v: 'rec', max: 3 }]
    }
  };

  /* ---- Rattache chaque modèle à son axe ---- */
  HV.AXES.forEach((ax) => {
    const d = SIMS[ax.id];
    if (!d) return;
    const sim = HV.makeSim(ax.id, d);
    ax.sim = sim;
    ax.hooks = d.hooks || {};
    const sc = HV.scenes[ax.id];
    if (sc) sc.sim = sim;
  });
})();
