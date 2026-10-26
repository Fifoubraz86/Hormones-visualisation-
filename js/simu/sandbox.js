/*
 * Mode thérapeutique : un patient simulé, une ordonnance libre, des bilans à la date choisie.
 * Aucune correction : le modèle (js/simu/model.js) répond, l'interne apprend à jauger les posologies.
 *
 * Le patient est calé sur la valeur de départ saisie : la fonction thyroïdienne résiduelle est
 * ajustée pour donner la TSH initiale (hypothyroïdie primaire), le taux de TRAb pour la T4L initiale
 * (Basedow), l'autonomie nodulaire (nodule toxique, GMNT), l'intensité de la lyse (thyroïdite), la
 * stimulation par l'hCG (thyrotoxicose gestationnelle), la réserve hypophysaire (insuffisance thyréotrope).
 *
 * L'encart « Référentiel » reprend les items EDN 241, 242 et 243 (référentiel SFE/CEEDMM, fiches LiSA)
 * avec le rang de chaque objectif quand la grille le précise.
 */
(function () {
  'use strict';
  const S = window.HV.simu;
  const M = S.model;
  const fmt = S.rules.fmt;
  const main = document.getElementById('svMain');
  const statusEl = document.getElementById('svStatus');
  const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const rnd = (a, b) => a + Math.random() * (b - a);

  const SITUATIONS = {
    hashi: { label: 'Hypothyroïdie primaire (maladie de Hashimoto)', start: 'tsh', def: 40, unit: 'mUI/L', startLabel: 'TSH initiale', hyper: false },
    thyro: { label: 'Thyroïdectomie totale (J0 = lendemain de l\'intervention)', start: null, hyper: false },
    central: { label: 'Insuffisance thyréotrope (hypothyroïdie centrale)', start: 't4', def: 8, unit: 'pmol/L', startLabel: 'T4L initiale', hyper: false },
    basedow: { label: 'Maladie de Basedow', start: 't4', def: 45, unit: 'pmol/L', startLabel: 'T4L initiale', hyper: true },
    nodule: { label: 'Nodule toxique ou goitre multinodulaire toxique', start: 't4', def: 30, unit: 'pmol/L', startLabel: 'T4L initiale', hyper: true },
    thyroidite: { label: 'Thyroïdite subaiguë (De Quervain) ou du post-partum', start: 't4', def: 38, unit: 'pmol/L', startLabel: 'T4L à la 1re consultation', hyper: true },
    gesta: { label: 'Thyrotoxicose gestationnelle transitoire (8 SA)', start: 't4', def: 26, unit: 'pmol/L', startLabel: 'T4L initiale', hyper: true }
  };
  const INTAKE = {
    jeun: { label: 'À jeun, 30 min avant le petit-déjeuner', f: 1 },
    repas: { label: 'Pendant le petit-déjeuner', f: 0.8 },
    ipp: { label: 'À jeun, sous IPP au long cours', f: 0.85 },
    fer: { label: 'En même temps que du fer ou du calcium', f: 0.6 }
  };
  const LT4_STRENGTHS = [0, 12.5, 25, 37.5, 50, 75, 88, 100, 112, 125, 137, 150, 175, 200, 225, 250, 300];
  const ATS_STEP = { cbz: 5, tmz: 2.5, ptu: 25 };
  const PROPRA = [0, 40, 80, 120, 160];
  const GESTES = { none: 'Aucun', thyroidectomie: 'Thyroïdectomie totale', lobectomie: 'Lobectomie (nodule toxique)', iode: 'Iode 131' };
  const NUM_TESTS = [['tsh', 'TSH'], ['t4', 'T4L'], ['t3', 'T3L'], ['trab', 'TRAb'], ['nfs', 'NFS']];
  const QUAL_TESTS = [['tpo', 'Anti-TPO'], ['crp', 'CRP'], ['hepat', 'Bilan hépatique'], ['ecg', 'ECG'], ['echo', 'Échographie'], ['scinti', 'Scintigraphie']];
  const QUAL_LABEL = { tpo: 'Anti-TPO', crp: 'CRP', hepat: 'Bilan hépatique', ecg: 'ECG', echo: 'Échographie thyroïdienne', scinti: 'Scintigraphie thyroïdienne' };
  const AE = S.adverse;
  const LH = S.lt4hard;
  if (LH) LH.TESTS.forEach(([k, t]) => { QUAL_LABEL[k] = t; });
  const PRESETS = [
    { label: 'Hashimoto, TSH 40, 75 kg', cfg: { sit: 'hashi', sex: 'F', age: 46, weight: 75, start: 40 } },
    { label: 'Hypothyroïdie fruste, TSH 7', cfg: { sit: 'hashi', sex: 'F', age: 58, weight: 64, start: 7 } },
    { label: 'Coronarien 80 ans, TSH 60', cfg: { sit: 'hashi', sex: 'M', age: 80, weight: 70, start: 60, coronary: true } },
    { label: 'Hypothyroïdie découverte à 6 SA', cfg: { sit: 'hashi', sex: 'F', age: 31, weight: 60, start: 25, preg: 6 } },
    { label: 'Thyroïdectomie, 90 kg', cfg: { sit: 'thyro', sex: 'M', age: 50, weight: 90 } },
    { label: 'Insuffisance thyréotrope, T4L 8', cfg: { sit: 'central', sex: 'M', age: 45, weight: 80, start: 8 } },
    { label: 'Basedow, T4L 45', cfg: { sit: 'basedow', sex: 'F', age: 32, weight: 60, start: 45 } },
    { label: 'Basedow sévère, T4L 70', cfg: { sit: 'basedow', sex: 'M', age: 55, weight: 80, start: 70 } },
    { label: 'Basedow : effet indésirable surprise', cfg: { sit: 'basedow', sex: 'F', age: 36, weight: 58, start: 42, ae: 'entrainement' } },
    { label: 'Basedow : agranulocytose', cfg: { sit: 'basedow', sex: 'M', age: 48, weight: 76, start: 50, ae: 'agranulo' } },
    { label: 'Adénome toxique, 72 ans', cfg: { sit: 'nodule', sex: 'F', age: 72, weight: 62, start: 30, nodType: 'adenome' } },
    { label: 'GMNT après scanner injecté', cfg: { sit: 'nodule', sex: 'M', age: 78, weight: 74, start: 34, nodType: 'gmnt' } },
    { label: 'De Quervain, T4L 40', cfg: { sit: 'thyroidite', sex: 'F', age: 42, weight: 65, start: 40, thyrType: 'quervain' } },
    { label: 'Thyroïdite du post-partum', cfg: { sit: 'thyroidite', sex: 'F', age: 30, weight: 66, start: 28, thyrType: 'postpartum' } },
    { label: 'Thyrotoxicose gestationnelle', cfg: { sit: 'gesta', sex: 'F', age: 27, weight: 58, start: 26 } }
  ];
  const BASE_CFG = { coronary: false, preg: 0, trabEvol: 'hasard', nodType: 'adenome', thyrType: 'quervain', ppEvol: 'hasard', ae: 'realiste' };

  let cfg = Object.assign({ sit: 'hashi', sex: 'F', age: 46, weight: 75, start: 40, variab: 'moyen' }, BASE_CFG);
  let G = null;
  const physioFree = {};

  function h(tag, attrs, kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    (Array.isArray(kids) ? kids : kids != null ? [kids] : []).forEach((c) => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return e;
  }
  const dayLabel = (d) => 'J' + d + ' · S' + fmt(d / 7, d % 7 ? 1 : 0);
  const tshTxt = (v) => (v < 0.01 ? '< 0,01' : fmt(v, v < 1 ? 2 : v < 10 ? 2 : 1));
  const rangBadge = (r) => (r ? h('span', { class: 'sv-rang sv-rang-' + r }, 'Rang ' + r) : null);

  /* ---------- Création du patient calé sur la valeur de départ ---------- */
  function bisect(make, read, target, lo, hi, increasing) {
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      const v = read(make(mid));
      if ((v < target) === increasing) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // Thyroïdite : patient sain, lyse déclenchée 7 jours avant la consultation, puis remise à J0.
  function thyroiditis(par, res, rec, final) {
    const pt = M.create({ par });
    pt.par.lysis = { day0: 0, k: 0.06, rec, final };
    pt.st.L = res;
    M.advance(pt, 7);
    pt.par.lysis.day0 = -7;
    pt.day = 0; pt.log = []; M.record(pt);
    return pt;
  }

  function buildPatient(c) {
    const real = c.variab === 'reel';
    const par = { weight: c.weight, hr0: c.age > 70 ? 66 : 74 };
    const hidden = {};
    if (real) { par.abs = rnd(0.8, 1.15); hidden.abs = par.abs; }
    if (c.preg > 0) {
      const sa0 = c.preg;
      par.need = (day) => { const w = sa0 + day / 7; return w >= 40 ? 1 : 1 + 0.4 * smooth((w - 4) / 12); };
    }
    if (real && (c.sit === 'basedow' || c.sit === 'nodule')) par.ec50 = 9 * rnd(0.6, 1.6);
    hidden.ec50 = par.ec50 || 9;
    let pt;
    if (c.sit === 'hashi') {
      const r = bisect((r) => M.create({ par: Object.assign({}, par, { r, need: null }) }), (p) => p.st.TSH, c.start, 0.005, 1, false);
      par.r = r; hidden.r = r;
      pt = M.create({ par });
    } else if (c.sit === 'thyro') {
      pt = M.create({ par: Object.assign({}, par, { r: 1 }) });
      pt.par.r = 0; pt.st.G = 0; pt.flags.surgeryDone = true;
    } else if (c.sit === 'basedow') {
      const fav = c.trabEvol === 'favorable' || (c.trabEvol === 'hasard' && Math.random() < 0.5);
      Object.assign(par, fav ? { trabTau: 100, trabFloor: 0.3, relapse: false } : { trabTau: 320, trabFloor: 3.5, relapse: true });
      if (real) par.trabTau *= rnd(0.7, 1.4);
      const trab = bisect((t) => M.create({ par: Object.assign({}, par, { trab: t }) }), (p) => 16 * p.st.T4, c.start, 0.5, 40, true);
      par.trab = trab;
      par.trabRelapse = trab * 0.8;
      Object.assign(hidden, { trab, fav, trabTau: par.trabTau });
      pt = M.create({ par });
    } else if (c.sit === 'nodule') {
      const auto = bisect((a) => M.create({ par: Object.assign({}, par, { auto: a }) }), (p) => 16 * p.st.T4, c.start, 0, 6, true);
      par.auto = auto; hidden.auto = auto;
      pt = M.create({ par });
    } else if (c.sit === 'thyroidite') {
      const pp = c.thyrType === 'postpartum';
      const persist = pp && (c.ppEvol === 'hypo' || (c.ppEvol === 'hasard' && Math.random() < 0.3));
      const rec = pp ? 90 : 45, final = persist ? 0.3 : 1;
      const res = bisect((x) => thyroiditis(par, x, rec, final), (p) => 16 * p.st.T4, c.start, 0, 400, true);
      Object.assign(hidden, { lysisK: res, persist });
      pt = thyroiditis(par, res, rec, final);
    } else if (c.sit === 'gesta') {
      const curve = (A) => (day) => { const sa = 8 + day / 7; return A * Math.exp(-(((sa - 10) / 3) ** 2)); };
      const A = bisect((A) => M.create({ par: Object.assign({}, par, { hcg: curve(A) }) }), (p) => 16 * p.st.T4, c.start, 0, 6, true);
      par.hcg = curve(A); hidden.hcg = A;
      pt = M.create({ par });
    } else {
      const pit = bisect((x) => M.create({ par: Object.assign({}, par, { pit: x }) }), (p) => 16 * p.st.T4, c.start, 0.01, 1, true);
      par.pit = pit; hidden.pit = pit;
      pt = M.create({ par });
    }
    if (c.preg > 0) pt.par.need = par.need;
    pt.rx.lt4Abs = 1;
    return { pt, hidden };
  }

  /* ---------- Écran de configuration ---------- */
  function setup() {
    G = null;
    statusEl.hidden = true;
    main.textContent = '';
    main.className = 'sv-main sv-home';
    const sit = SITUATIONS[cfg.sit];
    const field = (label, input, id) => h('div', { class: 'sv-field' }, [h('label', { for: id }, label), input]);
    const num = (id, val, step, min, max, on) => h('input', { type: 'number', id, value: val, step, min, max, inputmode: 'decimal', class: 'sv-num', oninput: (e) => on(parseFloat(String(e.target.value).replace(',', '.'))) });
    const sel = (id, val, opts, on) => h('select', { id, onchange: (e) => on(e.target.value) }, opts.map(([k, t]) => h('option', { value: k, selected: String(val) === String(k) }, t)));
    const pregOK = cfg.sex === 'F' && (cfg.sit === 'hashi' || cfg.sit === 'thyro' || cfg.sit === 'central');
    const modeBar = h('section', { class: 'sv-card sv-gamecfg', id: 'sbModeBar' }, [
      h('div', { class: 'sv-games' }, [['libre', '🩺', 'Patient libre', 'Créez un patient, prescrivez, dosez.'], ['difficile', '🧩', 'Hypothyroïdie difficile à substituer', 'Neuf histoires : médicament, aliment, maladie ou observance qui fait remonter la TSH (ETA 2025).'], ['physio', '🔬', 'Physiologie de la LT4', 'Composez librement toutes les situations de l\'ETA et voyez l\'absorption, minute par minute.']].map(([k, ic, t, sub]) => h('button', { type: 'button', class: 'sv-gamebtn' + ((cfg.mode || 'libre') === k ? ' on' : ''), id: 'sbMode-' + k, onclick: () => { cfg.mode = k; setup(); } }, [h('span', { class: 'sv-game-ic', 'aria-hidden': 'true' }, ic), h('strong', null, t), h('span', null, sub)])))
    ]);
    if (cfg.mode === 'physio' && S.lt4physio) {
      main.append(
        h('section', { class: 'sv-intro' }, [h('p', { class: 'sv-eyebrow' }, 'Physiologie de la lévothyroxine'), h('h1', null, 'Du comprimé à la TSH.'), h('p', { class: 'sv-lead' }, 'Dissolution dans l\'estomac, vidange, absorption intestinale, liaison à la TBG, catabolisme, rétrocontrôle : cochez les aliments, médicaments, maladies et situations des tableaux de l\'ETA 2025, choisissez le délai de chaque prise, la forme et le moment de la lévothyroxine.')]),
        modeBar,
        S.lt4physio.card({ h, state: physioFree })
      );
      window.scrollTo(0, 0);
      return;
    }
    if (cfg.mode === 'difficile' && LH) {
      main.append(
        h('section', { class: 'sv-intro' }, [h('p', { class: 'sv-eyebrow' }, 'Hypothyroïdie difficile à substituer'), h('h1', null, 'La TSH remonte. Pourquoi ?'), h('p', { class: 'sv-lead' }, 'Un patient jusque-là équilibré, ou qui « résiste » à la lévothyroxine. Interrogez-le, demandez les examens utiles, agissez sur la cause : moment de la prise, espacement, médicament en cause, forme liquide ou capsule molle, traitement d\'une maladie digestive, observance. Monter la dose à l\'aveugle marche parfois… jusqu\'au surdosage.')]),
        modeBar,
        h('section', { class: 'sv-card' }, [h('h3', null, 'Choisissez une histoire'), h('div', { class: 'sv-storygrid' }, LH.STORIES.map((st) => h('button', { type: 'button', class: 'sv-story', id: 'sbStory-' + st.id, onclick: () => beginHard(st) }, [h('span', { class: 'sv-game-ic', 'aria-hidden': 'true' }, st.icon), h('strong', null, st.title), h('span', null, st.who), h('span', null, st.pre)])))]),
        h('p', { class: 'sv-disc' }, 'Repères : recommandations de l\'European Thyroid Association 2025 sur la lévothyroxine (Centanni et al., Eur Thyroid J 2025;14:e250123), item EDN 243. Ordres de grandeur des interférences : tableaux de l\'ETA ; modèle pédagogique simplifié.')
      );
      window.scrollTo(0, 0);
      return;
    }
    main.append(
      modeBar,
      h('section', { class: 'sv-intro' }, [
        h('p', { class: 'sv-eyebrow' }, 'Mode thérapeutique'),
        h('h1', null, 'Prescrivez, attendez, dosez.'),
        h('p', { class: 'sv-lead' }, 'Créez un patient, rédigez l\'ordonnance, choisissez la date du bilan : le modèle vous donne la TSH, la T4L et la clinique à cette date. Ajustez et recommencez, comme en consultation. Aucune correction : à vous de juger. L\'encart « Référentiel » rappelle les objectifs des items 241 à 243, avec leur rang.')
      ]),
      h('section', { class: 'sv-card sv-setup' }, [
        h('h3', null, 'Exemples'),
        h('div', { class: 'sv-chips' }, PRESETS.map((p) => h('button', { type: 'button', class: 'sv-chip', onclick: () => { cfg = Object.assign({ variab: cfg.variab }, BASE_CFG, p.cfg); setup(); } }, p.label))),
        h('h3', null, 'Le patient'),
        h('div', { class: 'sv-form' }, [
          field('Situation', sel('cfSit', cfg.sit, Object.entries(SITUATIONS).map(([k, s]) => [k, s.label]), (v) => { cfg.sit = v; cfg.start = SITUATIONS[v].def; if (v === 'gesta') cfg.sex = 'F'; if (v === 'thyroidite' && cfg.thyrType === 'postpartum') cfg.sex = 'F'; setup(); }), 'cfSit'),
          field('Sexe', sel('cfSex', cfg.sex, cfg.sit === 'gesta' || (cfg.sit === 'thyroidite' && cfg.thyrType === 'postpartum') ? [['F', 'Femme']] : [['F', 'Femme'], ['M', 'Homme']], (v) => { cfg.sex = v; if (v === 'M') cfg.preg = 0; setup(); }), 'cfSex'),
          field('Âge (ans)', num('cfAge', cfg.age, 1, 16, 100, (v) => { cfg.age = v; }), 'cfAge'),
          field('Poids (kg)', num('cfW', cfg.weight, 1, 35, 200, (v) => { cfg.weight = v; }), 'cfW'),
          sit.start ? field(sit.startLabel + ' (' + sit.unit + ')', num('cfStart', cfg.start, sit.start === 'tsh' ? 0.5 : 0.5, sit.start === 'tsh' ? 4.5 : 3, sit.start === 'tsh' ? 150 : 100, (v) => { cfg.start = v; }), 'cfStart') : null,
          cfg.sit === 'basedow' ? field('Évolution des TRAb', sel('cfTrab', cfg.trabEvol, [['hasard', 'Inconnue (tirée au sort)'], ['favorable', 'Favorable : rémission probable'], ['defavorable', 'Défavorable : TRAb persistants']], (v) => { cfg.trabEvol = v; }), 'cfTrab') : null,
          cfg.sit === 'nodule' ? field('Forme', sel('cfNod', cfg.nodType, [['adenome', 'Adénome toxique (nodule unique)'], ['gmnt', 'Goitre multinodulaire toxique']], (v) => { cfg.nodType = v; }), 'cfNod') : null,
          cfg.sit === 'thyroidite' ? field('Forme', sel('cfThyr', cfg.thyrType, [['quervain', 'Subaiguë de De Quervain'], ['postpartum', 'Du post-partum']], (v) => { cfg.thyrType = v; if (v === 'postpartum') cfg.sex = 'F'; setup(); }), 'cfThyr') : null,
          cfg.sit === 'thyroidite' && cfg.thyrType === 'postpartum' ? field('Évolution', sel('cfPp', cfg.ppEvol, [['hasard', 'Inconnue (tirée au sort)'], ['recup', 'Récupération'], ['hypo', 'Hypothyroïdie persistante']], (v) => { cfg.ppEvol = v; }), 'cfPp') : null,
          pregOK ? field('Grossesse', sel('cfPreg', cfg.preg, [0, 5, 6, 8, 10, 12, 16, 20].map((w) => [w, w ? 'Enceinte de ' + w + ' SA' : 'Non']), (v) => { cfg.preg = +v; }), 'cfPreg') : null,
          field('Variabilité', sel('cfVar', cfg.variab, [['moyen', 'Patient moyen (reproductible)'], ['reel', 'Patient réel (paramètres cachés)']], (v) => { cfg.variab = v; }), 'cfVar')
        ]),
        cfg.sit === 'basedow' || cfg.sit === 'nodule' ? h('div', { class: 'sv-form' }, field('Effets indésirables des ATS', sel('cfAe', cfg.ae, AE.MODES, (v) => { cfg.ae = v; }), 'cfAe')) : null,
        cfg.sit === 'hashi' || cfg.sit === 'thyro' || cfg.sit === 'central' ? h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'cfCor', checked: cfg.coronary, onchange: (e) => { cfg.coronary = e.target.checked; } }), ' Coronaropathie connue : une remontée trop rapide de la lévothyroxine déclenche un angor, voire un syndrome coronarien aigu (à partir de 75 ans, coronaropathie latente possible même sans antécédent)']) : null,
        h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: begin }, 'Voir le patient →'))
      ]),
      h('p', { class: 'sv-disc' }, 'Modèle pédagogique simplifié, calé sur des ordres de grandeur usuels (demi-vie de la T4 ≈ 7 jours, effet des ATS en 10 à 15 jours, T4L normalisée en 3 à 6 semaines) ; il ne remplace ni le jugement clinique ni les recommandations. Normes indicatives. Repères : items EDN 241 à 243, référentiel SFE/CEEDMM et fiches LiSA.')
    );
    window.scrollTo(0, 0);
  }

  /* ---------- Partie ---------- */
  function begin() {
    if (!(cfg.weight > 30) || !(cfg.age > 10)) return;
    const sit = SITUATIONS[cfg.sit];
    if (sit.start && !(cfg.start > 0)) return;
    const b = buildPatient(cfg);
    const hyper = sit.hyper;
    G = {
      cfg: Object.assign({}, cfg), pt: b.pt, hidden: b.hidden,
      visits: [], current: null, history: [], undo: [], truth: false,
      draft: { lt4: 0, alt: false, altDays: 1, altDose: 0, intake: 'jeun', ats: 'none', atsDose: 0, propra: 0, hc: false, ains: false, geste: 'none', wait: hyper ? 4 : cfg.sit === 'central' ? 3 : 6, unit: 'sem', tests: new Set(hyper ? ['t4', 't3'] : cfg.sit === 'central' ? ['t4'] : ['tsh']) }
    };
    AE.init(G);
    const first = new Set(hyper ? ['tsh', 't4', 't3'] : ['tsh', 't4']);
    doLabs(first, 'Bilan initial');
    render();
  }

  // Hypothyroïdie difficile à substituer : patient équilibré, puis interférence depuis « ago » jours (js/simu/lt4-hard.js).
  function beginHard(story) {
    const c = Object.assign({}, cfg, BASE_CFG, { sit: story.cfg.r > 0 ? 'hashi' : 'thyro', sex: story.cfg.sex, age: story.cfg.age, weight: story.cfg.weight, variab: 'moyen', mode: 'difficile' });
    const par = { weight: c.weight, hr0: c.age > 70 ? 66 : 74, r: story.cfg.r };
    // Dose d'équilibre (TSH ≈ 1,5) avec une absorption normale, arrondie au comprimé de 12,5 µg.
    const dEq = bisect((dz) => M.create({ par, rx0: { lt4: dz, lt4Abs: 1 } }), (p) => p.st.TSH, 1.5, 10, 500, false);
    // Équilibré avant l'interférence (dose adaptée à sa prise d'alors), ou dose déjà montée par les confrères.
    const snap = (v) => LT4_STRENGTHS.reduce((a, x) => (Math.abs(x - v) < Math.abs(a - v) ? x : a));
    const xPre = { time: story.preTime || story.habit, form: 'cp', space: false, stop: false, cause: 'none', weekly: false, causeDay: null };
    const pre = LH.absOf(story, xPre, -story.ago - 1);
    const D0 = snap(Math.min(300, story.ago > 0 ? dEq / pre : dEq * (story.eff || 0.8) / LH.absOf(story, Object.assign({}, xPre), 0)));
    const x0 = Object.assign({}, xPre, { time: story.habit });
    const pt = M.create({ par, rx0: { lt4: D0, lt4Abs: pre } });
    pt.rx.lt4Text = fmt(D0, D0 % 1 ? 1 : 0) + ' µg/j';
    G = {
      cfg: c, pt, hidden: { r: story.cfg.r }, visits: [], current: null, history: [], undo: [], truth: false,
      hard: { s: story, cur: x0, D0, asked: false, doseUp: false, exams: new Set(), won: false },
      draft: { lt4: D0, alt: false, altDays: 1, altDose: 0, intake: 'jeun', ats: 'none', atsDose: 0, propra: 0, hc: false, ains: false, geste: 'none', wait: 8, unit: 'sem', tests: new Set(['tsh']), time: x0.time, form: 'cp', space: false, stop: false, cause: 'none', weekly: false }
    };
    pt.par.need = (day) => LH.needOf(story, G.hard.cur, day);
    if (story.ago > 0) { pt.day = -story.ago; pt.log = []; M.advance(pt, story.ago, () => { pt.rx.lt4Abs = LH.absOf(story, G.hard.cur, pt.day); return true; }); }
    pt.day = 0; pt.log = []; M.record(pt);
    c.start = pt.st.TSH;
    AE.init(G);
    doLabs(new Set(['tsh', 't4']), 'Consultation');
    render();
  }
  // Situation de l'histoire et choix en cours, traduits pour le module de physiologie (js/simu/lt4-physio.js).
  function hardPreset() {
    const H = G.hard, s = H.s, x = H.cur, sc = LH.presetOf(s, x, G.pt.day);
    const c = s.comorb;
    if (c && c.cure && x.cause === c.cure && x.causeDay != null && G.pt.day - x.causeDay > 2 * c.tau) sc.items = {};
    return { sc, pat: { weight: G.cfg.weight, r: G.hidden.r > 0.15 ? 0.25 : G.hidden.r > 0 ? 0.1 : 0, dose: [25, 50, 75, 88, 100, 112, 125, 137, 150, 175, 200, 225, 250, 300].reduce((a, v) => (Math.abs(v - G.pt.rx.lt4) < Math.abs(a - G.pt.rx.lt4) ? v : a)), adh: s.pseudo && !x.weekly ? Math.round(s.pseudo * 100) : 100 } };
  }
  function hardLabel(x) {
    const t = [LH.TIMES[x.time][0].toLowerCase()];
    if (x.form !== 'cp') t.push(LH.FORMS[x.form].toLowerCase());
    if (x.space) t.push('interférents espacés de 4 h');
    if (x.stop) t.push((G.hard.s.drug || G.hard.s.need || {}).name + ' arrêté');
    if (x.cause !== 'none') t.push(LH.CAUSES[x.cause].toLowerCase());
    if (x.weekly) t.push('prise hebdomadaire supervisée');
    return t.join(', ');
  }

  // Résultats qualitatifs selon la situation et l'état du patient.
  function qualitative(k) {
    if (G.hard && QUAL_LABEL[k] && LH.TESTS.some(([x]) => x === k)) return LH.qual(G.hard.s, k);
    const c = G.cfg, pt = G.pt, f = pt.flags;
    const tLys = pt.par.lysis ? pt.day - pt.par.lysis.day0 : null;
    if (k === 'tpo') {
      if (c.sit === 'hashi') return 'positifs (850 UI/mL ; N < 34)';
      if (c.sit === 'basedow') return 'positifs (190 UI/mL ; fréquents dans le Basedow)';
      if (c.sit === 'thyroidite' && c.thyrType === 'postpartum') return 'positifs (420 UI/mL)';
      return 'négatifs (< 34 UI/mL)';
    }
    if (k === 'crp') {
      if (c.sit === 'thyroidite' && c.thyrType === 'quervain' && tLys != null) return fmt(5 + 110 * Math.exp(-tLys / (G.ainsSince != null ? 8 : 16)), 0) + ' mg/L (N < 5)';
      return '< 5 mg/L';
    }
    if (k === 'hepat') return AE.hepat(G);
    if (k === 'ecg') return AE.ecg(G);
    if (k === 'echo') {
      if (f.surgeryDone) return 'loge de thyroïdectomie, pas de reliquat';
      return { hashi: 'glande hypoéchogène et hétérogène', central: 'thyroïde normale', basedow: 'glande hypoéchogène, hypervascularisée au Doppler', gesta: 'thyroïde normale, non hypervascularisée', thyroidite: c.thyrType === 'quervain' ? 'plages hypoéchogènes mal limitées, glande douloureuse au passage de la sonde' : 'glande hypoéchogène, peu vascularisée' }[c.sit] || (c.nodType === 'gmnt' ? 'goitre multinodulaire, nodules de 8 à 30 mm' : f.lobectomy ? 'lobe restant sans nodule' : 'nodule unique, solide, de 28 mm');
    }
    if (k === 'scinti') {
      if (c.preg > 0 || c.sit === 'gesta') return 'non réalisée : contre-indiquée pendant la grossesse (écho-Doppler en alternative)';
      if (!SITUATIONS[c.sit].hyper) return 'non réalisée : pas d\'indication devant une hypothyroïdie';
      if (f.surgeryDone) return 'absence de fixation (thyroïdectomie)';
      if (c.sit === 'basedow') return 'hyperfixation diffuse et homogène';
      if (c.sit === 'thyroidite') return tLys < 35 ? 'scintigraphie blanche : absence de fixation' : 'fixation faible, en cours de récupération';
      if (c.sit === 'nodule') return f.lobectomy ? 'fixation homogène du lobe restant' : c.nodType === 'gmnt' ? 'fixation hétérogène « en damier »' : 'nodule hyperfixant, parenchyme éteint';
    }
    return '';
  }

  function extraSymptoms() {
    const c = G.cfg, pt = G.pt;
    const out = [];
    if (c.sit === 'thyroidite' && c.thyrType === 'quervain' && pt.par.lysis) {
      const t = pt.day - pt.par.lysis.day0;
      if (t < 28) out.push(G.ainsSince != null ? 'douleur cervicale nettement soulagée' : 'douleur cervicale antérieure irradiant aux oreilles, fébricule');
    }
    if (c.sit === 'gesta' && 8 + pt.day / 7 < 14) out.push('nausées matinales');
    return out;
  }

  function doLabs(tests, note) {
    const pt = G.pt;
    const m = M.measure(pt);
    const labs = {}, qual = [];
    tests.forEach((k) => {
      if (k === 'trab') labs.trab = pt.par.trab > 0 ? m.trab : 0.5;
      else if (k === 'nfs') labs.pnn = AE.pnn(G, m.pnn);
      else if (QUAL_LABEL[k]) qual.push([QUAL_LABEL[k], qualitative(k)]);
      else labs[k] = m[k];
    });
    const c = M.clinic(pt);
    const entry = { day: pt.day, labs, qual, hr: c.hr, weight: c.weight, symptoms: extraSymptoms().concat(AE.symptoms(G), M.symptoms(pt)), rx: rxLabel(pt.rx), note, event: G.event || null, toon: G.eventToon || null, epitaphe: G.epitaphe || null };
    G.event = null; G.eventToon = null; G.epitaphe = null;
    G.history.push(entry);
    G.visits.push({ day: pt.day, labs });
  }

  function avgLt4(d) { return d.alt ? (d.lt4 * (7 - d.altDays) + d.altDose * d.altDays) / 7 : d.lt4; }
  function rxLabel(rx) {
    const out = [];
    if (rx.lt4 > 0) out.push('LT4 ' + (rx.lt4Text || fmt(rx.lt4, 0) + ' µg/j'));
    if (rx.ats !== 'none' && rx.atsDose > 0) out.push(M.ATS[rx.ats].short + ' ' + fmt(rx.atsDose, rx.atsDose % 1 ? 1 : 0) + ' mg/j');
    if (rx.propraMg) out.push('propranolol ' + rx.propraMg + ' mg/j');
    if (rx.hc) out.push('hydrocortisone');
    if (rx.ains) out.push('AINS ou corticoïdes');
    return out.length ? out.join(' + ') : 'aucun traitement';
  }

  function snapshot() {
    const pt = G.pt;
    return { st: Object.assign({}, pt.st), day: pt.day, rx: Object.assign({}, pt.rx), flags: Object.assign({}, pt.flags), par: Object.assign({}, pt.par), logLen: pt.log.length, hist: G.history.length, vis: G.visits.length, ainsSince: G.ainsSince, rai: G.rai ? Object.assign({}, G.rai) : null, ae: JSON.stringify(G.ae) };
  }
  function restore(s) {
    const pt = G.pt;
    pt.st = s.st; pt.day = s.day; pt.rx = s.rx; pt.flags = s.flags; pt.par = s.par;
    pt.log.length = s.logLen; G.history.length = s.hist; G.visits.length = s.vis; G.ainsSince = s.ainsSince; G.rai = s.rai; G.ae = JSON.parse(s.ae);
  }

  // Gestes radicaux, réalisés le jour de la prescription (item 242, SFE p. 17-18 ; item 241, SFE-N p. 9).
  function doGeste(g) {
    const pt = G.pt, c = G.cfg;
    const t4 = 16 * pt.st.T4;
    if (g === 'thyroidectomie') {
      if (t4 > 30) G.eventToon = 'crise';
      if (t4 > 30) G.event = 'Thyroïdectomie réalisée en pleine hyperthyroïdie : crise aiguë thyrotoxique postopératoire (fièvre, déshydratation, tachycardie, agitation), prise en charge en réanimation. L\'euthyroïdie préalable par ATS l\'aurait évitée.';
      pt.par.r = 0; pt.par.auto = 0; pt.par.lysis = null; pt.par.hcg = null; pt.st.G = 0;
      pt.flags.surgeryDone = true; pt.flags.surgery = true; G.rai = null;
    } else if (g === 'lobectomie') {
      pt.par.auto = 0; pt.st.G *= 0.5; pt.flags.lobectomy = true;
    } else if (g === 'iode') {
      G.rai = { day: pt.day, r0: pt.par.r, a0: pt.par.auto, floor: c.variab === 'reel' ? rnd(0.04, 0.3) : 0.12 };
      if (pt.par.trab > 0) pt.st.TRAb *= 1.3;
    }
  }

  function submit() {
    const d = G.draft, pt = G.pt, c = G.cfg;
    const days = Math.round(d.unit === 'sem' ? d.wait * 7 : d.wait);
    if (!(days >= 1 && days <= 730)) { flash('Délai entre 1 jour et 2 ans.'); return; }
    if (!d.tests.size) { flash('Cochez au moins un examen.'); return; }
    if (d.geste === 'iode' && (c.preg > 0 || c.sit === 'gesta')) { flash('Iode 131 contre-indiqué pendant la grossesse : le service de médecine nucléaire refuse.'); return; }
    G.undo.push(snapshot());
    const lt4 = avgLt4(d);
    const rx = {
      lt4, lt4Abs: INTAKE[d.intake].f,
      lt4Text: d.alt ? fmt(d.lt4, d.lt4 % 1 ? 1 : 0) + ' µg, ' + fmt(d.altDose, d.altDose % 1 ? 1 : 0) + ' µg ' + d.altDays + ' j/7 (moy. ' + fmt(lt4, 1) + ')' : fmt(lt4, lt4 % 1 ? 1 : 0) + ' µg/j',
      ats: d.ats, atsDose: d.ats === 'none' ? 0 : d.atsDose,
      bb: d.propra === 0 ? 'none' : d.propra <= 80 ? 'pro80' : 'pro120', propraMg: d.propra, hc: d.hc, ains: d.ains
    };
    if (d.intake !== 'jeun' && lt4 > 0 && !G.hard) rx.lt4Text += ', ' + INTAKE[d.intake].label.toLowerCase();
    if (G.hard) {
      const H = G.hard, prevX = H.cur;
      H.cur = { time: d.time, form: d.form, space: d.space, stop: d.stop, cause: d.cause, weekly: d.weekly, causeDay: d.cause !== 'none' ? (prevX.cause === d.cause ? prevX.causeDay : pt.day) : null };
      if (lt4 > H.D0 + 1) H.doseUp = true;
      d.tests.forEach((k) => { if (LH.TESTS.some(([x]) => x === k)) H.exams.add(k); });
      rx.lt4Abs = LH.absOf(H.s, H.cur, pt.day);
      if (lt4 > 0) rx.lt4Text += (d.weekly ? ' (soit ' + fmt(lt4 * 7, 0) + ' µg une fois par semaine)' : '') + ', ' + hardLabel(H.cur);
    }
    if (d.ains && G.ainsSince == null) G.ainsSince = pt.day;
    if (!d.ains) G.ainsSince = null;
    const prevEq = M.atsEq(pt.rx);
    M.setRx(pt, rx);
    AE.onPrescribe(G, prevEq);
    let geste = '';
    if (d.geste !== 'none') { doGeste(d.geste); geste = GESTES[d.geste].toLowerCase() + ' à J' + pt.day; d.geste = 'none'; }
    G.history.push({ day: pt.day, prescription: true, rx: rxLabel(pt.rx) });
    const r0 = G.hidden.r;
    let interrupt = null;
    M.advance(pt, days, () => {
      // Patient réel : la thyroïdite de Hashimoto continue de détruire la glande (≈ 10 % par an, complément).
      if (c.variab === 'reel' && c.sit === 'hashi' && !pt.flags.surgeryDone && !G.hard) pt.par.r = r0 * Math.exp(-pt.day / 3500);
      if (G.hard) pt.rx.lt4Abs = LH.absOf(G.hard.s, G.hard.cur, pt.day);
      // Iode 131 : effet en 1 à 3 mois ; hypothyroïdie définitive fréquente (Basedow), plus rare après un adénome toxique.
      if (G.rai) {
        const t = pt.day - G.rai.day, e = Math.exp(-t / 30);
        if (G.rai.a0 > 0) { pt.par.auto = G.rai.a0 * e; pt.par.r = G.rai.r0 * (0.85 + 0.15 * e); }
        else pt.par.r = G.rai.r0 * (G.rai.floor + (1 - G.rai.floor) * e);
      }
      // Effets indésirables et coronaropathie : un événement interrompt le temps (consultation non programmée).
      const ev = AE.daily(G);
      if (ev) { interrupt = ev; return false; }
      return true;
    });
    let note = 'Bilan à ' + (d.unit === 'sem' ? d.wait + ' semaine' + (d.wait > 1 ? 's' : '') : days + ' jour' + (days > 1 ? 's' : ''));
    let tests = d.tests;
    if (interrupt) {
      note = interrupt.death ? 'Décès' : 'Consultation non programmée (bilan prévu annulé)';
      G.eventToon = interrupt.toon || null;
      if (interrupt.death) { G.dead = interrupt; G.epitaphe = interrupt.epitaphe; }
      G.event = (G.event ? G.event + ' ' : '') + interrupt.text;
      tests = new Set((interrupt.tests || []).concat(SITUATIONS[c.sit].hyper ? ['t4'] : ['tsh']));
      if (interrupt.stopAts) { d.ats = 'none'; d.atsDose = 0; }
      if (interrupt.stopLt4) { d.lt4 = 0; d.alt = false; }
    }
    if (geste) note += ' · ' + geste;
    if (c.preg > 0) { const sa = c.preg + pt.day / 7; note += sa >= 40 ? ' · post-partum (accouchement à 40 SA)' : ' · ' + fmt(sa, 0) + ' SA'; }
    if (c.sit === 'gesta') note += ' · ' + fmt(8 + pt.day / 7, 0) + ' SA';
    doLabs(tests, note);
    if (G.hard && !G.hard.won) {
      const t = G.history.filter((e) => !e.prescription && e.labs.tsh != null).map((e) => e.labs.tsh);
      // Après le traitement d'une cause digestive, les besoins baissent pendant des mois : on attend la fin de l'effet.
      const cm = G.hard.s.comorb, cur = G.hard.cur, settling = cm && cm.cure && cur.cause === cm.cure && cur.causeDay != null && pt.day - cur.causeDay < 2.5 * cm.tau;
      if (t.length >= 3 && t.slice(-2).every((v) => v >= 0.4 && v <= 4) && !settling) G.hard.won = true;
    }
    render();
    const res = main.querySelector('.sv-latest');
    if (res && window.innerWidth < 860) res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function undo() {
    const s = G.undo.pop();
    if (!s) return;
    restore(s);
    G.dead = null;
    render();
  }

  const TOON_CAPTION = {
    agranulo: 'Où sont passés les polynucléaires ?',
    hepat: 'Le teint s\'est un peu jauni.',
    rash: 'Ça gratte. Beaucoup.',
    sca: 'Il fallait monter par paliers.',
    angor: 'L\'escalier est devenu l\'Everest.',
    crise: 'Opéré en pleine thyrotoxicose : la réanimation a chaud.',
    death: 'Fin de la consultation.'
  };
  function deathCard() {
    return h('div', { class: 'sv-card sv-dead' }, [
      h('h3', null, 'Le patient est décédé'),
      h('p', null, G.dead.text),
      h('p', { class: 'sv-muted' }, 'Pas de panique, c\'est un simulateur. Revenez avant la dernière ordonnance et changez d\'avis.'),
      h('div', { class: 'sv-actions' }, [
        h('button', { type: 'button', class: 'sv-primary', onclick: undo }, '↶ Ressusciter (annuler la dernière ordonnance)'),
        h('button', { type: 'button', class: 'sv-secondary', onclick: setup }, 'Nouveau patient')
      ])
    ]);
  }

  function flash(t) { const el = main.querySelector('.sv-alert'); if (el) { el.textContent = t; el.hidden = false; } }

  /* ---------- Rendu ---------- */
  function render() {
    const pt = G.pt, c = G.cfg;
    statusEl.hidden = false;
    statusEl.textContent = (c.sex === 'F' ? 'Patiente' : 'Patient') + ' · ' + dayLabel(pt.day);
    main.textContent = '';
    main.className = 'sv-main sv-game sv-sandbox';
    const left = h('aside', { class: 'sv-dossier' }, [patientCard(), G.dead ? deathCard() : rxCard()]);
    const right = h('section', { class: 'sv-consult' }, (G.hard ? [hardCard()] : []).concat([latestCard(), chartCard(), historyCard(), refCard(), revealCard()]));
    main.append(left, right);
    const box = right.querySelector('.sv-chartbox');
    if (box) requestAnimationFrame(() => S.chart.render(box, G, { truth: G.truth }));
  }

  function hardCard() {
    const H = G.hard, s = H.s;
    const parts = [h('p', { class: 'sv-eyebrow' }, s.icon + ' Hypothyroïdie difficile à substituer'), h('h3', null, s.title + ' · ' + s.who), h('p', { class: 'sv-storytext' }, s.pre),
      h('p', { class: 'sv-storygoal' }, [h('b', null, '🎯 Objectif : '), 'TSH entre 0,4 et 4 mUI/L (idéalement 0,5–2,5) à deux bilans successifs, en traitant la cause plutôt qu\'en montant la dose à l\'aveugle.'])];
    parts.push(h('div', { class: 'sv-actions' }, [H.asked ? null : h('button', { type: 'button', class: 'sv-primary', id: 'sbAsk', onclick: () => { H.asked = true; render(); } }, '🗣 Interroger le patient'),
      S.lt4physio ? h('button', { type: 'button', class: 'sv-secondary', id: 'sbPhysio', onclick: () => { H.physio = H.physio ? null : {}; render(); } }, H.physio ? 'Fermer la physiologie' : '🔬 Physiologie de l\'absorption') : null]));
    if (H.asked) parts.push(h('div', { class: 'sv-ask' }, [h('p', null, [h('b', null, 'Interrogatoire : '), s.clue]), h('p', null, h('b', null, 'Traitements et prise :')), h('ul', null, s.meds.map((m) => h('li', null, m)))]));
    if (H.won) {
      const r = LH.debrief(G);
      parts.push(h('div', { class: 'sv-storycard done' }, [h('h3', null, '✅ TSH normalisée en ' + r.months + ' mois (' + r.n + ' bilans)'),
        h('ul', { class: 'sv-storyeval' }, r.ok.map(([ok, lab, why]) => h('li', { class: ok ? 'ok' : 'ko' }, [h('b', null, (ok ? '✔ ' : '✘ ') + lab), ok ? null : ' — ' + why]))),
        h('p', null, [h('b', null, 'À retenir : '), s.key]),
        h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-secondary', onclick: () => { cfg.mode = 'difficile'; setup(); } }, 'Autre histoire'))]));
    }
    if (H.physio && S.lt4physio) parts.push(S.lt4physio.card({ h, state: H.physio, preset: hardPreset(), onClose: () => { H.physio = null; render(); } }));
    return h('div', { class: 'sv-card sv-storycard', id: 'sbHard' }, parts);
  }

  function patientCard() {
    const c = G.cfg, pt = G.pt;
    const sit = SITUATIONS[c.sit];
    const forme = c.sit === 'nodule' ? (c.nodType === 'gmnt' ? ' · goitre multinodulaire' : ' · nodule unique') : c.sit === 'thyroidite' ? (c.thyrType === 'quervain' ? ' · De Quervain' : ' · post-partum') : '';
    return h('div', { class: 'sv-card sv-id' }, [
      h('p', { class: 'sv-eyebrow' }, 'Patient simulé'),
      h('h2', null, (c.sex === 'F' ? 'Femme' : 'Homme') + ', ' + c.age + ' ans, ' + fmt(c.weight, 0) + ' kg'),
      h('p', { class: 'sv-muted' }, sit.label + forme + (sit.start ? ' · ' + sit.startLabel + ' ' + fmt(c.start, 1) + ' ' + sit.unit : '') + (c.coronary ? ' · coronaropathie' : '') + (c.preg ? ' · enceinte de ' + c.preg + ' SA à J0' : '') + (pt.flags.surgeryDone && c.sit !== 'thyro' ? ' · thyroïdectomisé' + (c.sex === 'F' ? 'e' : '') : '') + (c.variab === 'reel' ? ' · paramètres cachés' : '')),
      h('p', { class: 'sv-rx' }, [h('strong', null, 'Traitement en cours : '), rxLabel(pt.rx)]),
      h('div', { class: 'sv-actions' }, [
        h('button', { type: 'button', class: 'sv-secondary', onclick: undo, disabled: !G.undo.length }, '↶ Annuler la dernière étape'),
        h('button', { type: 'button', class: 'sv-secondary', onclick: setup }, 'Nouveau patient')
      ])
    ]);
  }

  function rxCard() {
    const d = G.draft, c = G.cfg, pt = G.pt;
    const hyper = SITUATIONS[c.sit].hyper;
    const re = () => render();
    const lt4Opts = (val) => LT4_STRENGTHS.map((x) => h('option', { value: x, selected: val === x }, x ? fmt(x, x % 1 ? 1 : 0) + ' µg' : 'Aucune'));
    const avg = avgLt4(d);
    const showAts = hyper || d.ats !== 'none';
    const atsUnit = d.ats !== 'none' ? M.ATS[d.ats] : null;
    const eq = d.ats !== 'none' ? d.atsDose * M.ATS[d.ats].eq : 0;
    const gestes = Object.entries(GESTES).filter(([k]) => {
      if (k === 'none') return true;
      if (pt.flags.surgeryDone) return false;
      if (k === 'lobectomie') return c.sit === 'nodule' && c.nodType === 'adenome' && !pt.flags.lobectomy;
      if (k === 'iode') return (c.sit === 'basedow' || c.sit === 'nodule') && !G.rai;
      return c.sit === 'basedow' || c.sit === 'nodule';
    });
    return h('div', { class: 'sv-card sv-ordo' }, [
      h('h3', null, 'Ordonnance'),
      h('div', { class: 'sv-field' }, [h('label', { for: 'sbLt4' }, 'Lévothyroxine, 1 prise le matin'),
        h('select', { id: 'sbLt4', onchange: (e) => { d.lt4 = +e.target.value; re(); } }, lt4Opts(d.lt4))]),
      h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'sbAlt', checked: d.alt, onchange: (e) => { d.alt = e.target.checked; if (d.alt && !d.altDose) d.altDose = d.lt4; re(); } }), ' Schéma alterné sur la semaine']),
      d.alt ? h('div', { class: 'sv-inline sv-alt' }, [
        'sauf',
        h('select', { id: 'sbAltDays', 'aria-label': 'Nombre de jours', onchange: (e) => { d.altDays = +e.target.value; re(); } }, [1, 2, 3, 4].map((n) => h('option', { value: n, selected: d.altDays === n }, n + ' j/7'))),
        'à',
        h('select', { id: 'sbAltDose', 'aria-label': 'Dose ces jours-là', onchange: (e) => { d.altDose = +e.target.value; re(); } }, lt4Opts(d.altDose))
      ]) : null,
      avg > 0 ? h('p', { class: 'sv-note' }, 'Dose moyenne : ' + fmt(avg, avg % 1 ? 1 : 0) + ' µg/j, soit ' + fmt(avg / c.weight, 2) + ' µg/kg/j.') : null,
      G.hard ? hardRx(d) : null,
      avg > 0 && !G.hard ? h('div', { class: 'sv-field' }, [h('label', { for: 'sbIntake' }, 'Conditions de prise'), h('select', { id: 'sbIntake', onchange: (e) => { d.intake = e.target.value; } }, Object.entries(INTAKE).map(([k, t]) => h('option', { value: k, selected: d.intake === k }, t.label)))]) : null,
      showAts ? h('div', { class: 'sv-field' }, [h('label', { for: 'sbAts' }, 'Antithyroïdien de synthèse'), h('div', { class: 'sv-inline' }, [
        h('select', { id: 'sbAts', onchange: (e) => { d.ats = e.target.value; d.atsDose = d.ats === 'none' ? 0 : { cbz: 30, tmz: 20, ptu: 300 }[d.ats]; re(); } }, Object.entries(M.ATS).map(([k, A]) => h('option', { value: k, selected: d.ats === k }, A.name))),
        atsUnit ? h('span', { class: 'sv-numwrap' }, [h('input', { type: 'number', id: 'sbAtsDose', class: 'sv-num', value: d.atsDose, step: ATS_STEP[d.ats], min: 0, max: d.ats === 'ptu' ? 900 : 80, inputmode: 'decimal', 'aria-label': 'Dose quotidienne', oninput: (e) => { d.atsDose = Math.max(0, parseFloat(String(e.target.value).replace(',', '.')) || 0); } }), ' mg/j']) : null
      ])]) : null,
      showAts && d.ats !== 'cbz' && d.ats !== 'none' ? h('p', { class: 'sv-note' }, 'Équivalence : ≈ ' + fmt(eq, 0) + ' mg/j de carbimazole.') : null,
      hyper ? h('div', { class: 'sv-field' }, [h('label', { for: 'sbPro' }, 'Propranolol'), h('select', { id: 'sbPro', onchange: (e) => { d.propra = +e.target.value; } }, PROPRA.map((x) => h('option', { value: x, selected: d.propra === x }, x ? x + ' mg/j' : 'Aucun')))]) : null,
      c.sit === 'thyroidite' ? h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'sbAins', checked: d.ains, onchange: (e) => { d.ains = e.target.checked; } }), ' Antalgiques, AINS ou corticoïdes']) : null,
      c.sit === 'central' ? h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'sbHc', checked: d.hc, onchange: (e) => { d.hc = e.target.checked; } }), ' Hydrocortisone 20 mg/j']) : null,
      !hyper && !showAts && !G.hard ? h('button', { type: 'button', class: 'sv-link sv-more', onclick: () => { d.ats = 'cbz'; d.atsDose = 0; re(); } }, '+ Antithyroïdien de synthèse') : null,
      gestes.length > 1 ? h('div', { class: 'sv-field' }, [h('label', { for: 'sbGeste' }, 'Geste radical (réalisé aujourd\'hui)'), h('select', { id: 'sbGeste', onchange: (e) => { d.geste = e.target.value; } }, gestes.map(([k, t]) => h('option', { value: k, selected: d.geste === k }, t)))]) : null,
      h('h3', null, 'Prochain bilan'),
      h('div', { class: 'sv-inline' }, [
        'dans',
        h('input', { type: 'number', id: 'sbWait', class: 'sv-num', value: d.wait, min: 1, max: d.unit === 'sem' ? 104 : 730, step: 1, inputmode: 'numeric', 'aria-label': 'Délai', oninput: (e) => { d.wait = parseFloat(e.target.value) || 0; } }),
        h('select', { id: 'sbUnit', 'aria-label': 'Unité', onchange: (e) => { d.unit = e.target.value; } }, [h('option', { value: 'sem', selected: d.unit === 'sem' }, 'semaines'), h('option', { value: 'j', selected: d.unit === 'j' }, 'jours')])
      ]),
      h('div', { class: 'sv-chips', role: 'group', 'aria-label': 'Dosages' }, NUM_TESTS.filter(([k]) => k !== 'trab' || hyper).map(([k, t]) => chipCheck(d, k, t))),
      h('div', { class: 'sv-chips', role: 'group', 'aria-label': 'Autres examens' }, QUAL_TESTS.filter(([k]) => k !== 'crp' || hyper).concat(G.hard ? LH.TESTS : []).map(([k, t]) => chipCheck(d, k, t))),
      h('p', { class: 'sv-alert', hidden: true }),
      h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: submit }, 'Prescrire et voir le bilan →'))
    ]);
  }
  function hardRx(d) {
    const s = G.hard.s, stopper = (s.drug && s.drug.stoppable) || (s.need && s.need.stoppable);
    const sel = (id, lab, val, obj, on) => h('div', { class: 'sv-field' }, [h('label', { for: id }, lab), h('select', { id, onchange: (e) => on(e.target.value) }, Object.entries(obj).map(([k, v]) => h('option', { value: k, selected: val === k }, Array.isArray(v) ? v[0] : v)))]);
    const chk = (id, lab, key) => h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id, checked: !!d[key], onchange: (e) => { d[key] = e.target.checked; } }), ' ' + lab]);
    return h('div', { class: 'sv-hardrx' }, [
      h('h4', null, 'Prise et interférences'),
      sel('sbTime', 'Moment de la prise', d.time, LH.TIMES, (v) => { d.time = v; }),
      sel('sbForm', 'Forme', d.form, LH.FORMS, (v) => { d.form = v; }),
      chk('sbSpace', 'Espacer d\'au moins 4 h les médicaments et aliments interférents (fer, calcium, antiacides, IPP, café, soja…)', 'space'),
      stopper ? chk('sbStop', (s.drug || s.need).stopLab || 'Arrêter ou remplacer le médicament en cause', 'stop') : null,
      sel('sbCause', 'Traiter une cause digestive', d.cause, LH.CAUSES, (v) => { d.cause = v; }),
      chk('sbWeekly', 'Prise hebdomadaire supervisée (7 fois la dose quotidienne, une fois par semaine, devant une infirmière)', 'weekly')
    ]);
  }
  function chipCheck(d, k, t) {
    return h('label', { class: 'sv-chipcheck' }, [h('input', { type: 'checkbox', id: 'sbT' + k, checked: d.tests.has(k), onchange: (e) => { e.target.checked ? d.tests.add(k) : d.tests.delete(k); } }), ' ' + t]);
  }

  function labCells(labs) {
    const cell = (k) => {
      const v = labs[k];
      if (v == null) return h('td', { class: 'sv-na' }, '—');
      const flag = k === 'tsh' ? (v < 0.4 ? 'lo' : v > 4 ? 'hi' : '') : k === 't4' ? (v < 12 ? 'lo' : v > 22 ? 'hi' : '') : k === 't3' ? (v < 3.1 ? 'lo' : v > 6.8 ? 'hi' : '') : k === 'trab' ? (v > 1.8 ? 'hi' : '') : (v < 1.5 ? 'lo' : '');
      const txt = k === 'tsh' ? tshTxt(v) : k === 'trab' ? (v < 0.8 ? '< 0,8' : fmt(v, 1)) : fmt(v, k === 'pnn' ? 2 : 1);
      return h('td', { class: 'sv-v ' + flag }, [txt, flag ? h('span', { class: 'sv-arrow', 'aria-label': flag === 'hi' ? 'élevé' : 'bas' }, flag === 'hi' ? ' ↑' : ' ↓') : null]);
    };
    return ['tsh', 't4', 't3', 'trab', 'pnn'].map(cell);
  }

  function latestCard() {
    const e = [...G.history].reverse().find((x) => !x.prescription);
    const c = G.cfg;
    const fem = c.sex === 'F';
    const sy = e.symptoms.map((x) => x.replace('nerveux(se)', fem ? 'nerveuse' : 'nerveux').replace('fatigué(e)', fem ? 'fatiguée' : 'fatigué'));
    const rows = [['tsh', 'TSH', 'mUI/L', '0,4–4'], ['t4', 'T4 libre', 'pmol/L', '12–22'], ['t3', 'T3 libre', 'pmol/L', '3,1–6,8'], ['trab', 'TRAb', 'UI/L', '< 1,8'], ['pnn', 'Neutrophiles', 'G/L', '1,5–7']].filter(([k]) => e.labs[k] != null);
    return h('div', { class: 'sv-card sv-latest' }, [
      h('div', { class: 'sv-latest-head' }, [h('p', { class: 'sv-eyebrow' }, e.note || 'Bilan'), h('h1', null, dayLabel(e.day))]),
      e.event ? h('p', { class: 'sv-event' }, e.event) : null,
      e.toon ? S.toon(e.toon, { epitaphe: e.epitaphe, titre: TOON_CAPTION[e.toon] }) : null,
      rows.length ? h('table', { class: 'sv-res sv-big' }, [
        h('thead', null, h('tr', null, [h('th', null, 'Dosage'), h('th', null, 'Résultat'), h('th', null, 'Référence')])),
        h('tbody', null, rows.map(([k, name, unit, ref]) => { const td = labCells(e.labs)[['tsh', 't4', 't3', 'trab', 'pnn'].indexOf(k)]; td.append(' ' + unit); return h('tr', null, [h('td', null, name), td, h('td', { class: 'sv-ref' }, ref)]); }))
      ]) : null,
      e.qual.length ? h('dl', { class: 'sv-exam sv-qual' }, e.qual.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)])) : null,
      h('p', { class: 'sv-clin' }, 'FC ' + e.hr + '/min · poids ' + fmt(e.weight, 1) + ' kg · ' + (sy.length ? (fem ? 'elle' : 'il') + ' signale : ' + sy.join(', ') : 'pas de plainte particulière') + '.'),
      h('p', { class: 'sv-note' }, 'Traitement pris jusqu\'à ce bilan : ' + e.rx + '.')
    ]);
  }

  function chartCard() {
    return h('div', { class: 'sv-card' }, [
      h('div', { class: 'sv-card-head' }, [
        h('h3', null, 'Évolution'),
        h('label', { class: 'sv-check sv-small' }, [h('input', { type: 'checkbox', id: 'sbTruth', checked: G.truth, onchange: (e) => { G.truth = e.target.checked; render(); } }), ' Afficher la courbe réelle (entre les bilans)'])
      ]),
      h('div', { class: 'sv-chartbox' }),
      h('p', { class: 'sv-note' }, 'Points : dosages réalisés. Bandes : normes indicatives.')
    ]);
  }

  function historyCard() {
    const rows = G.history.filter((x) => !x.prescription);
    return h('div', { class: 'sv-card' }, [
      h('h3', null, 'Bilans successifs'),
      h('div', { class: 'sv-scroll' }, h('table', { class: 'sv-res sv-hist-t' }, [
        h('thead', null, h('tr', null, ['Date', 'Traitement en cours', 'TSH', 'T4L', 'T3L', 'TRAb', 'PNN', 'FC', 'Autres examens'].map((t) => h('th', null, t)))),
        h('tbody', null, rows.map((e) => h('tr', null, [h('td', { class: 'sv-nowrap' }, dayLabel(e.day)), h('td', null, e.rx)].concat(labCells(e.labs), [h('td', null, e.hr), h('td', { class: 'sv-wrap' }, e.qual.map(([k, v]) => k + ' : ' + v).join(' ; ') || '—')]))))
      ]))
    ]);
  }

  /* ---------- Référentiel : items EDN 241 à 243 ---------- */
  const I = (n, p) => 'item ' + n + ' · SFE p. ' + p;
  const REF_HYPER = [
    { t: 'Thyrotoxicose : TSH en 1re intention, puis T4L si elle est basse ; T3L seulement si la T4L est normale. TSH effondrée sauf adénome thyréotrope et résistance aux hormones thyroïdiennes.', src: I(242, '5-6'), rang: 'A' },
    { t: 'Étiologies les plus fréquentes : maladie de Basedow > goitre multinodulaire toxique > adénome toxique.', src: I(242, '6'), rang: 'A' },
    { t: 'Biologie non spécifique : baisse du cholestérol et des triglycérides, hyperglycémie, enzymes hépatiques ↑, leuconeutropénie. Bilan de référence avant ATS.', src: I(242, '5-6'), rang: 'B' },
    { t: 'Moyens : repos, propranolol (non cardiosélectif), contraception ; ATS : carbimazole 20–40, thiamazole 15–30, PTU 200–400 mg/j, délai d\'action 10–15 jours.', src: I(242, '15'), rang: 'B' },
    { t: 'Effets indésirables des ATS : fréquents (5–15 %) : éruption, arthralgies, neutropénie transitoire, alopécie, perturbations hépatiques mineures ; graves : agranulocytose (0,2–0,5 %, contre-indique tous les ATS), hypoplasie médullaire, hépatite (cytolytique avec les thiouraciles, cholestatique avec les imidazolés), vascularite à ANCA, pancréatite.', src: I(242, '15-16'), rang: 'B' },
    { t: 'Surveillance des ATS : T4L à 3–4 semaines (la TSH reste basse longtemps), puis TSH tous les 3 mois ; NFS de référence puis tous les 10 jours pendant 2 mois ; NFS en urgence si fièvre ou angine. PNN < 0,8 G/L : arrêt ; < 0,5 G/L : hospitalisation, arrêt définitif.', src: I(242, '16'), rang: 'B' },
    { t: 'Urgences : crise aiguë thyrotoxique (surtout après thyroïdectomie non préparée), cardiothyréose du sujet âgé, orbitopathie maligne, forme cachectisante.', src: I(242, '6, 15, 19'), rang: 'A' }
  ];
  const REF = {
    basedow: [
      { t: 'Diagnostic : orbitopathie = diagnostic certain ; sinon TRAb élevés. Scintigraphie (hyperfixation diffuse homogène) seulement si TRAb bas ou indisponibles.', src: I(242, '8-9'), rang: 'A' },
      { t: 'Goitre diffus, homogène, élastique, vasculaire (souffle, thrill) ; orbitopathie ≈ 50 %, fumeurs ++, indépendante du degré de thyrotoxicose.', src: I(242, '6-8'), rang: 'A' },
      { t: 'Gravité de l\'orbitopathie : inocclusion palpébrale (ulcération cornéenne), paralysie musculaire complète, neuropathie optique compressive → avis ophtalmologique en urgence sous 48 h.', src: I(242, '8'), rang: 'B' },
      { t: 'Euthyroïdie par ATS, puis 12 à 18 mois de traitement ; titration ou « block and replace » ; TRAb : le titre initial n\'a pas de valeur pronostique, un titre élevé en fin de cure prédit la rechute (40–50 %).', src: I(242, '8-9, 15, 17'), rang: 'B' },
      { t: 'Rechute : chirurgie (goitre volumineux, grossesse proche, orbitopathie modérée à sévère), iode 131 (formes récidivantes non compliquées) ou ATS faible dose au long cours. Thyroïdectomie après euthyroïdie (crise aiguë). Iode 131 : contre-indiqué pendant la grossesse, contraception 6 mois, aggrave l\'orbitopathie.', src: I(242, '17-18'), rang: 'B' }
    ],
    nodule: [
      { t: 'Nodules hypersécrétants : 1re cause chez le sujet âgé, thyrotoxicose pure sans atteinte oculaire, souvent révélée par une complication cardiaque.', src: I(242, '10-11'), rang: 'A' },
      { t: 'Adénome toxique : scintigraphie indispensable (nodule hyperfixant, parenchyme éteint), quasi jamais malin, pas de cytoponction. GMNT : scintigraphie « en damier », souvent déclenché par l\'iode (produit de contraste).', src: I(242, '10-11') + ' ; ' + 'item 241 · SFE-N p. 7', rang: 'A' },
      { t: 'Pas de rémission sous ATS : chirurgie (lobectomie pour un adénome toxique, thyroïdectomie pour un GMNT) ou iode 131 (sujet âgé ou fragile ; hypothyroïdie moins fréquente que dans le Basedow).', src: I(242, '17-18') + ' ; ' + 'item 241 · SFE-N p. 9', rang: 'B' },
      { t: 'Lévothyroxine contre-indiquée au stade nodulaire (risque d\'hyperthyroïdie sur goitre déjà autonome) : savoir ne pas prescrire d\'opothérapie.', src: 'item 241 · LiSA p. 4', rang: 'B' }
    ],
    thyroidite: [
      { t: 'De Quervain : origine virale, contexte grippal, goitre dur et douloureux, fièvre, CRP très élevée ; hyperthyroïdie, puis hypothyroïdie, puis récupération en 2–3 mois ; scintigraphie blanche, échographie hypoéchogène ; antalgiques, AINS ou corticoïdes.', src: I(242, '12-13, 18') + ' ; ' + 'item 241 · LiSA p. 2', rang: 'A' },
      { t: 'Thyroïdite du post-partum (5 à 10 %) : thyrotoxicose transitoire vers 2 mois, scintigraphie blanche, anti-TPO positifs, TRAb négatifs ; puis hypothyroïdie à 3–6 mois, souvent transitoire (< 1 an).', src: I(242, '9-10') + ' ; ' + I(243, '8-9'), rang: 'B' },
      { t: 'La thyrotoxicose vient de la lyse du stock hormonal, pas d\'une synthèse accrue : les ATS, qui bloquent la synthèse, n\'y changent rien.', src: 'complément', rang: '' }
    ],
    gesta: [
      { t: 'Thyrotoxicose gestationnelle transitoire : 2 % des grossesses, hCG (pic vers 10 SA), 1er trimestre, ± hyperemesis ; TRAb négatifs ; régresse spontanément, traitement symptomatique.', src: I(242, '13, 20'), rang: '' },
      { t: 'Scintigraphie contre-indiquée pendant la grossesse ; l\'écho-Doppler est l\'alternative.', src: I(242, '8-9'), rang: 'B' },
      { t: 'Maladie de Basedow pendant la grossesse : PTU préféré (carbimazole tératogène entre 6 et 10 SA), dose minimale, T4L à la limite supérieure de la normale.', src: I(242, '20'), rang: 'B' }
    ],
    hypo: [
      { t: 'Hypothyroïdie primaire : TSH ↑ ; T4L normale = forme fruste (TSH 4–10), T4L basse = forme patente (TSH > 10). Un seul dosage modérément élevé ne suffit pas pour traiter.', src: I(243, '2-3'), rang: 'A' },
      { t: 'Lévothyroxine 1 à 1,5 µg/kg/j (25–75 µg/j si forme fruste). Suivi sur la TSH seule : contrôle 6 à 8 semaines après la dose cible, puis à 6 mois, puis annuel ; objectif 0,5–2,5 mUI/L.', src: I(243, '11-12'), rang: 'A' },
      { t: 'Sujet âgé ou coronarien : 12,5–25 µg/j, paliers de 12,5–25 µg toutes les 1 à 2 semaines ; consulter si douleur thoracique ; TSH tolérée à 4–10 si coronaropathie non contrôlée.', src: I(243, '11-12'), rang: 'A' },
      { t: 'Forme fruste : TSH > 10 et/ou anti-TPO → traiter ; TSH < 10 sans anti-TPO → TSH à 6 mois puis annuelle.', src: I(243, '12'), rang: '' },
      { t: 'Besoins augmentés : malabsorption (fer, calcium, IPP, magnésium, maladie cœliaque, gastrite atrophique, chirurgie bariatrique), œstrogènes.', src: I(243, '12-13'), rang: '' },
      { t: 'Hashimoto : anti-TPO (sinon anti-Tg), goitre ferme irrégulier, échographie hypoéchogène hétérogène, pas de scintigraphie ; lymphome si croissance rapide.', src: I(243, '7-8'), rang: 'B' }
    ],
    preg: [
      { t: 'Grossesse : traiter dès TSH ≥ 3, cible 0,5–2,5 ; hypothyroïdienne connue : + 25 à 50 % dès le diagnostic, TSH mensuelle. TSH physiologiquement basse au 1er trimestre (hCG).', src: I(243, '6, 12'), rang: '' }
    ],
    thyro: [
      { t: 'Après thyroïdectomie totale : lévothyroxine à vie ; complications : hématome suffocant (< 48 h), hypoparathyroïdie (calcémie), paralysie récurrentielle.', src: 'item 241 · SFE-C p. 4-5', rang: '' }
    ],
    central: [
      { t: 'Insuffisance thyréotrope : T4L basse, TSH normale ou basse, inadaptée, voire légèrement élevée (< 10–12, TSH inactive). Une TSH normale n\'élimine pas le diagnostic ; IRM systématique.', src: I(243, '2-3, 10-11'), rang: 'A' },
      { t: 'Suivi sur la T4L, 15 à 21 jours après chaque changement, à jeun avant la prise ; cible entre le milieu et le tiers supérieur de la normale ; jamais sur la TSH.', src: I(243, '11-12'), rang: 'A' }
    ]
  };

  function refCard() {
    const c = G.cfg, pt = G.pt;
    const hyper = SITUATIONS[c.sit].hyper;
    let items = [];
    if (hyper) items = REF_HYPER.concat(REF[c.sit] || []);
    else {
      if (c.sit === 'central') items = REF.central.concat(REF.hypo.slice(1, 2));
      else items = REF.hypo.slice();
      if (c.sit === 'thyro') items = REF.thyro.concat(items.slice(1, 3), items.slice(4, 5));
      if (c.preg) items = items.concat(REF.preg);
    }
    if (pt.flags.surgeryDone && c.sit !== 'thyro') items = REF.thyro.concat(REF.hypo.slice(1, 2), items);
    if (G.hard && window.HV.LT4_ETA) items = window.HV.LT4_ETA.take.map(([k, v]) => ({ t: k + ' : ' + v, src: 'ETA 2025', rang: '' })).concat(items);
    const since = pt.flags.lastChange != null ? pt.day - pt.flags.lastChange : null;
    return h('details', { class: 'sv-card sv-det' }, [
      h('summary', null, 'Référentiel (items 241 à 243)'),
      h('ul', { class: 'sv-keys sv-refs' }, items.map((k) => h('li', null, [rangBadge(k.rang), ' ' + k.t, h('span', { class: 'sv-src' }, ' · ' + k.src)]))),
      h('p', { class: 'sv-note' }, (since != null ? 'Dernier changement de traitement il y a ' + since + ' jours : environ ' + Math.round(100 * (1 - Math.exp(-since * Math.LN2 / 7))) + ' % du nouvel équilibre de la T4 atteint (demi-vie ≈ 7 jours, complément). ' : '') + 'Rang indiqué quand la grille de l\'item le précise ; sans mention, l\'objectif n\'est pas classé dans la grille.')
    ]);
  }

  function revealCard() {
    const x = G.hidden, c = G.cfg, pt = G.pt;
    const items = [];
    if (x.r != null) items.push('Fonction thyroïdienne résiduelle au départ : ' + Math.round(x.r * 100) + ' % d\'une thyroïde normale' + (c.variab === 'reel' ? ' (actuellement ' + Math.round(pt.par.r * 100) + ' %)' : '') + '.');
    if (x.abs != null) items.push('Absorption de la lévothyroxine : ' + Math.round(x.abs * 100) + ' % de celle du patient moyen.');
    if (x.trab != null) items.push('TRAb au départ : ' + fmt(x.trab, 1) + ' UI/L ; évolution ' + (x.fav ? 'favorable (rémission probable à l\'arrêt)' : 'défavorable (rechute probable à l\'arrêt)') + '.');
    if (c.sit === 'basedow' || c.sit === 'nodule') items.push('Sensibilité aux ATS : ' + Math.round((9 / x.ec50) * 100) + ' % de la moyenne.');
    if (x.auto != null) items.push('Autonomie nodulaire : production ' + fmt(x.auto, 1) + ' fois celle d\'une thyroïde normale, indépendante de la TSH ; aucune rémission à attendre sous ATS.');
    if (x.lysisK != null) items.push('Thyroïdite : lyse du stock hormonal au début ; ' + (x.persist ? 'hypothyroïdie persistante (30 % de la fonction récupérée).' : 'récupération complète attendue.'));
    if (x.hcg != null) items.push('Stimulation par l\'hCG : pic vers 10 SA, disparition au 2e trimestre ; TRAb négatifs.');
    if (x.pit != null) items.push('Réserve thyréotrope : ' + Math.round(x.pit * 100) + ' %.');
    if (c.sit === 'thyro') items.push('Aucun tissu thyroïdien résiduel : toute la T4 vient du comprimé.');
    if (G.hard) { const s = G.hard.s; items.push('Cause : ' + ((s.drug || s.comorb || s.need) ? (s.drug || s.comorb || s.need).name : s.id === 'cafe' ? 'café pris avec le comprimé' : 'inobservance (pseudo-malabsorption)') + '. Absorption actuelle : ' + Math.round(LH.absOf(s, G.hard.cur, pt.day) * 100) + ' % ; besoins × ' + fmt(LH.needOf(s, G.hard.cur, pt.day), 2) + '.'); items.push(s.key); }
    AE.reveal(G).forEach((t) => items.push(t));
    if (G.rai) items.push('Iode 131 à J' + G.rai.day + (G.rai.a0 > 0 ? ' : le nodule s\'éteint, le parenchyme reprend.' : ' : fonction résiduelle finale ≈ ' + Math.round(G.rai.floor * 100) + ' %.'));
    return h('details', { class: 'sv-card sv-det' }, [h('summary', null, 'Révéler le patient'), h('ul', { class: 'sv-keys' }, items.map((t) => h('li', null, t)))]);
  }

  S.sandbox = { setup };
})();
