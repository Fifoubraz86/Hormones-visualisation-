/*
 * Mode thérapeutique : un patient simulé, une ordonnance libre, des bilans à la date choisie.
 * Aucune correction : le modèle (js/simu/model.js) répond, l'interne apprend à jauger les posologies.
 *
 * Le patient est calé sur la valeur de départ saisie : la fonction thyroïdienne résiduelle est
 * ajustée pour donner la TSH initiale (hypothyroïdie primaire), le taux de TRAb pour donner la T4L
 * initiale (maladie de Basedow), la réserve hypophysaire pour la T4L initiale (hypothyroïdie centrale).
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
    hashi: { label: 'Hypothyroïdie primaire (maladie de Hashimoto)', start: 'tsh', def: 40, unit: 'mUI/L', startLabel: 'TSH initiale' },
    thyro: { label: 'Thyroïdectomie totale (J0 = lendemain de l\'intervention)', start: null },
    basedow: { label: 'Maladie de Basedow', start: 't4', def: 45, unit: 'pmol/L', startLabel: 'T4L initiale' },
    central: { label: 'Hypothyroïdie centrale (insuffisance thyréotrope)', start: 't4', def: 8, unit: 'pmol/L', startLabel: 'T4L initiale' }
  };
  const INTAKE = {
    jeun: { label: 'À jeun, 30 min avant le petit-déjeuner', f: 1 },
    repas: { label: 'Pendant le petit-déjeuner', f: 0.8 },
    ipp: { label: 'À jeun, sous IPP au long cours', f: 0.85 },
    fer: { label: 'En même temps que du fer ou du calcium', f: 0.6 }
  };
  const LT4_STRENGTHS = [0, 25, 50, 75, 88, 100, 112, 125, 137, 150, 175, 200, 225, 250, 300];
  const ATS_STEP = { cbz: 5, tmz: 2.5, ptu: 25 };
  const PROPRA = [0, 40, 80, 120, 160];
  const TESTS = [['tsh', 'TSH'], ['t4', 'T4L'], ['t3', 'T3L'], ['trab', 'TRAb'], ['nfs', 'NFS']];
  const PRESETS = [
    { label: 'Hashimoto, TSH 40, 75 kg', cfg: { sit: 'hashi', sex: 'F', age: 46, weight: 75, start: 40 } },
    { label: 'Hashimoto, TSH 12, 62 kg', cfg: { sit: 'hashi', sex: 'F', age: 38, weight: 62, start: 12 } },
    { label: 'Coronarien 80 ans, TSH 60', cfg: { sit: 'hashi', sex: 'M', age: 80, weight: 70, start: 60, coronary: true } },
    { label: 'Thyroïdectomie, 90 kg', cfg: { sit: 'thyro', sex: 'M', age: 50, weight: 90 } },
    { label: 'Basedow, T4L 45', cfg: { sit: 'basedow', sex: 'F', age: 32, weight: 60, start: 45 } },
    { label: 'Basedow sévère, T4L 70', cfg: { sit: 'basedow', sex: 'M', age: 55, weight: 80, start: 70 } },
    { label: 'Hypothyroïdie découverte à 6 SA', cfg: { sit: 'hashi', sex: 'F', age: 31, weight: 60, start: 25, preg: 6 } },
    { label: 'Hypothyroïdie centrale, T4L 8', cfg: { sit: 'central', sex: 'M', age: 45, weight: 80, start: 8 } }
  ];

  let cfg = { sit: 'hashi', sex: 'F', age: 46, weight: 75, start: 40, coronary: false, preg: 0, trabEvol: 'hasard', variab: 'moyen' };
  let G = null;

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

  /* ---------- Création du patient calé sur la valeur de départ ---------- */
  function bisect(make, read, target, lo, hi, increasing) {
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      const v = read(make(mid));
      if ((v < target) === increasing) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
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
      if (real) { par.ec50 = 9 * rnd(0.6, 1.6); par.trabTau *= rnd(0.7, 1.4); }
      const trab = bisect((t) => M.create({ par: Object.assign({}, par, { trab: t }) }), (p) => 16 * p.st.T4, c.start, 0.5, 40, true);
      par.trab = trab;
      par.trabRelapse = trab * 0.8;
      Object.assign(hidden, { trab, fav, ec50: par.ec50 || 9, trabTau: par.trabTau });
      pt = M.create({ par });
    } else {
      const pit = bisect((x) => M.create({ par: Object.assign({}, par, { pit: x }) }), (p) => 16 * p.st.T4, c.start, 0.01, 1, true);
      par.pit = pit; hidden.pit = pit;
      pt = M.create({ par });
    }
    if (c.preg > 0) pt.par.need = par.need;
    pt.rx.lt4Abs = 1;
    return { pt, hidden, fav: hidden.fav };
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
    main.append(
      h('section', { class: 'sv-intro' }, [
        h('p', { class: 'sv-eyebrow' }, 'Mode thérapeutique'),
        h('h1', null, 'Prescrivez, attendez, dosez.'),
        h('p', { class: 'sv-lead' }, 'Créez un patient, rédigez l\'ordonnance, choisissez la date du bilan : le modèle vous donne la TSH, la T4L et la clinique à cette date. Ajustez et recommencez, comme en consultation. Aucune correction : à vous de juger.')
      ]),
      h('section', { class: 'sv-card sv-setup' }, [
        h('h3', null, 'Exemples'),
        h('div', { class: 'sv-chips' }, PRESETS.map((p) => h('button', { type: 'button', class: 'sv-chip', onclick: () => { cfg = Object.assign({ coronary: false, preg: 0, trabEvol: 'hasard', variab: cfg.variab }, p.cfg); setup(); } }, p.label))),
        h('h3', null, 'Le patient'),
        h('div', { class: 'sv-form' }, [
          field('Situation', h('select', { id: 'cfSit', onchange: (e) => { cfg.sit = e.target.value; cfg.start = SITUATIONS[cfg.sit].def; setup(); } }, Object.entries(SITUATIONS).map(([k, s]) => h('option', { value: k, selected: k === cfg.sit }, s.label))), 'cfSit'),
          field('Sexe', h('select', { id: 'cfSex', onchange: (e) => { cfg.sex = e.target.value; if (cfg.sex === 'M') cfg.preg = 0; setup(); } }, [h('option', { value: 'F', selected: cfg.sex === 'F' }, 'Femme'), h('option', { value: 'M', selected: cfg.sex === 'M' }, 'Homme')]), 'cfSex'),
          field('Âge (ans)', num('cfAge', cfg.age, 1, 16, 100, (v) => { cfg.age = v; }), 'cfAge'),
          field('Poids (kg)', num('cfW', cfg.weight, 1, 35, 200, (v) => { cfg.weight = v; }), 'cfW'),
          sit.start ? field(sit.startLabel + ' (' + sit.unit + ')', num('cfStart', cfg.start, sit.start === 'tsh' ? 1 : 0.5, sit.start === 'tsh' ? 4.5 : 3, sit.start === 'tsh' ? 150 : 100, (v) => { cfg.start = v; }), 'cfStart') : null,
          cfg.sit === 'basedow' ? field('Évolution des TRAb', h('select', { id: 'cfTrab', onchange: (e) => { cfg.trabEvol = e.target.value; } }, [['hasard', 'Inconnue (tirée au sort)'], ['favorable', 'Favorable : rémission probable'], ['defavorable', 'Défavorable : TRAb persistants']].map(([k, t]) => h('option', { value: k, selected: cfg.trabEvol === k }, t))), 'cfTrab') : null,
          cfg.sex === 'F' && cfg.sit !== 'basedow' ? field('Grossesse', h('select', { id: 'cfPreg', onchange: (e) => { cfg.preg = +e.target.value; } }, [0, 5, 6, 8, 10, 12, 16, 20].map((w) => h('option', { value: w, selected: cfg.preg === w }, w ? 'Enceinte de ' + w + ' SA' : 'Non'))), 'cfPreg') : null,
          field('Variabilité', h('select', { id: 'cfVar', onchange: (e) => { cfg.variab = e.target.value; } }, [['moyen', 'Patient moyen (reproductible)'], ['reel', 'Patient réel (absorption et sensibilité cachées)']].map(([k, t]) => h('option', { value: k, selected: cfg.variab === k }, t))), 'cfVar')
        ]),
        cfg.sit === 'hashi' ? h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'cfCor', checked: cfg.coronary, onchange: (e) => { cfg.coronary = e.target.checked; } }), ' Coronaropathie connue (mention au dossier ; le modèle ne simule pas l\'angor)']) : null,
        h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: begin }, 'Voir le patient →'))
      ]),
      h('p', { class: 'sv-disc' }, 'Modèle pédagogique simplifié, calé sur des ordres de grandeur usuels (demi-vie de la T4 ≈ 7 jours, dose substitutive ≈ 1,6 µg/kg/j, effet des ATS en 3 à 6 semaines) ; il ne remplace ni le jugement clinique ni les recommandations. Normes indicatives.')
    );
    window.scrollTo(0, 0);
  }

  /* ---------- Partie ---------- */
  function begin() {
    if (!(cfg.weight > 30) || !(cfg.age > 10)) return;
    const sit = SITUATIONS[cfg.sit];
    if (sit.start && !(cfg.start > 0)) return;
    const b = buildPatient(cfg);
    G = {
      cfg: Object.assign({}, cfg), pt: b.pt, hidden: b.hidden,
      visits: [], current: null, history: [], undo: [], truth: false,
      draft: { lt4: 0, alt: false, altDays: 1, altDose: 0, intake: 'jeun', ats: 'none', atsDose: 0, propra: 0, hc: false, wait: cfg.sit === 'basedow' ? 4 : 6, unit: 'sem', tests: new Set(cfg.sit === 'basedow' ? ['tsh', 't4', 't3', 'trab'] : cfg.sit === 'central' ? ['t4'] : ['tsh', 't4']) }
    };
    const first = new Set(cfg.sit === 'basedow' ? ['tsh', 't4', 't3', 'trab', 'nfs'] : cfg.sit === 'thyro' ? ['tsh', 't4'] : ['tsh', 't4']);
    doLabs(first, 'Bilan initial');
    if (cfg.sit === 'basedow') G.draft.tests = new Set(['t4', 't3', 'nfs']);
    render();
  }

  function doLabs(tests, note) {
    const pt = G.pt;
    const m = M.measure(pt);
    const labs = {};
    tests.forEach((k) => {
      if (k === 'trab') labs.trab = pt.par.trab > 0 ? m.trab : 0.5;
      else if (k === 'nfs') labs.pnn = m.pnn;
      else labs[k] = m[k];
    });
    const c = M.clinic(pt);
    const entry = { day: pt.day, labs, hr: c.hr, weight: c.weight, symptoms: M.symptoms(pt), rx: rxLabel(pt.rx), note };
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
    return out.length ? out.join(' + ') : 'aucun traitement';
  }

  function snapshot() {
    const pt = G.pt;
    return { st: Object.assign({}, pt.st), day: pt.day, rx: Object.assign({}, pt.rx), flags: Object.assign({}, pt.flags), par: Object.assign({}, pt.par), logLen: pt.log.length, hist: G.history.length, vis: G.visits.length };
  }
  function restore(s) {
    const pt = G.pt;
    pt.st = s.st; pt.day = s.day; pt.rx = s.rx; pt.flags = s.flags; pt.par = s.par;
    pt.log.length = s.logLen; G.history.length = s.hist; G.visits.length = s.vis;
  }

  function submit() {
    const d = G.draft, pt = G.pt;
    const days = Math.round(d.unit === 'sem' ? d.wait * 7 : d.wait);
    if (!(days >= 1 && days <= 730)) { flash('Délai entre 1 jour et 2 ans.'); return; }
    if (!d.tests.size) { flash('Cochez au moins un dosage.'); return; }
    G.undo.push(snapshot());
    const lt4 = avgLt4(d);
    const rx = {
      lt4, lt4Abs: INTAKE[d.intake].f,
      lt4Text: d.alt ? fmt(d.lt4, 0) + ' µg, ' + fmt(d.altDose, 0) + ' µg ' + d.altDays + ' j/7 (moy. ' + fmt(lt4, 1) + ')' : fmt(d.lt4, 0) + ' µg/j',
      ats: d.ats, atsDose: d.ats === 'none' ? 0 : d.atsDose,
      bb: d.propra === 0 ? 'none' : d.propra <= 80 ? 'pro80' : 'pro120', propraMg: d.propra, hc: d.hc
    };
    if (d.intake !== 'jeun' && lt4 > 0) rx.lt4Text += ', ' + INTAKE[d.intake].label.toLowerCase();
    M.setRx(pt, rx);
    G.history.push({ day: pt.day, prescription: true, rx: rxLabel(pt.rx) });
    const r0 = G.hidden.r;
    M.advance(pt, days, () => {
      // Patient réel : la thyroïdite continue de détruire la glande (≈ 10 % de fonction résiduelle en moins par an).
      if (G.cfg.variab === 'reel' && G.cfg.sit === 'hashi') pt.par.r = r0 * Math.exp(-pt.day / 3500);
      return true;
    });
    let note = 'Bilan à ' + (d.unit === 'sem' ? d.wait + ' semaine' + (d.wait > 1 ? 's' : '') : days + ' jour' + (days > 1 ? 's' : ''));
    if (G.cfg.preg > 0) { const sa = G.cfg.preg + pt.day / 7; note += sa >= 40 ? ' · post-partum (accouchement à 40 SA)' : ' · ' + fmt(sa, 0) + ' SA'; }
    doLabs(d.tests, note);
    render();
    const res = main.querySelector('.sv-latest');
    if (res && window.innerWidth < 860) res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function undo() {
    const s = G.undo.pop();
    if (!s) return;
    restore(s);
    render();
  }

  function flash(t) { const el = main.querySelector('.sv-alert'); if (el) { el.textContent = t; el.hidden = false; } }

  /* ---------- Rendu ---------- */
  function render() {
    const pt = G.pt, c = G.cfg;
    statusEl.hidden = false;
    statusEl.textContent = (c.sex === 'F' ? 'Patiente' : 'Patient') + ' · ' + dayLabel(pt.day);
    main.textContent = '';
    main.className = 'sv-main sv-game sv-sandbox';
    const left = h('aside', { class: 'sv-dossier' }, [patientCard(), rxCard()]);
    const right = h('section', { class: 'sv-consult' }, [latestCard(), chartCard(), historyCard(), reperesCard(), revealCard()]);
    main.append(left, right);
    const box = right.querySelector('.sv-chartbox');
    if (box) requestAnimationFrame(() => S.chart.render(box, G, { truth: G.truth }));
  }

  function patientCard() {
    const c = G.cfg, pt = G.pt;
    const sit = SITUATIONS[c.sit];
    return h('div', { class: 'sv-card sv-id' }, [
      h('p', { class: 'sv-eyebrow' }, 'Patient simulé'),
      h('h2', null, (c.sex === 'F' ? 'Femme' : 'Homme') + ', ' + c.age + ' ans, ' + fmt(c.weight, 0) + ' kg'),
      h('p', { class: 'sv-muted' }, sit.label + (sit.start ? ' · ' + sit.startLabel + ' ' + fmt(c.start, 1) + ' ' + sit.unit : '') + (c.coronary ? ' · coronaropathie' : '') + (c.preg ? ' · enceinte de ' + c.preg + ' SA à J0' : '') + (c.variab === 'reel' ? ' · paramètres cachés' : '')),
      h('p', { class: 'sv-rx' }, [h('strong', null, 'Traitement en cours : '), rxLabel(pt.rx)]),
      h('div', { class: 'sv-actions' }, [
        h('button', { type: 'button', class: 'sv-secondary', onclick: undo, disabled: !G.undo.length }, '↶ Annuler la dernière étape'),
        h('button', { type: 'button', class: 'sv-secondary', onclick: setup }, 'Nouveau patient')
      ])
    ]);
  }

  function rxCard() {
    const d = G.draft, c = G.cfg;
    const re = () => render();
    const lt4Opts = (val) => LT4_STRENGTHS.map((x) => h('option', { value: x, selected: val === x }, x ? x + ' µg' : 'Aucune'));
    const avg = avgLt4(d);
    const showAts = c.sit === 'basedow' || d.ats !== 'none';
    const atsUnit = d.ats !== 'none' ? M.ATS[d.ats] : null;
    const eq = d.ats !== 'none' ? d.atsDose * M.ATS[d.ats].eq : 0;
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
      avg > 0 ? h('div', { class: 'sv-field' }, [h('label', { for: 'sbIntake' }, 'Conditions de prise'), h('select', { id: 'sbIntake', onchange: (e) => { d.intake = e.target.value; } }, Object.entries(INTAKE).map(([k, t]) => h('option', { value: k, selected: d.intake === k }, t.label)))]) : null,
      showAts ? h('div', { class: 'sv-field' }, [h('label', { for: 'sbAts' }, 'Antithyroïdien de synthèse'), h('div', { class: 'sv-inline' }, [
        h('select', { id: 'sbAts', onchange: (e) => { d.ats = e.target.value; d.atsDose = d.ats === 'none' ? 0 : { cbz: 30, tmz: 20, ptu: 300 }[d.ats]; re(); } }, Object.entries(M.ATS).map(([k, A]) => h('option', { value: k, selected: d.ats === k }, A.name))),
        atsUnit ? h('span', { class: 'sv-numwrap' }, [h('input', { type: 'number', id: 'sbAtsDose', class: 'sv-num', value: d.atsDose, step: ATS_STEP[d.ats], min: 0, max: d.ats === 'ptu' ? 900 : 80, inputmode: 'decimal', 'aria-label': 'Dose quotidienne', oninput: (e) => { d.atsDose = Math.max(0, parseFloat(String(e.target.value).replace(',', '.')) || 0); } }), ' mg/j']) : null
      ])]) : null,
      showAts && d.ats !== 'cbz' && d.ats !== 'none' ? h('p', { class: 'sv-note' }, 'Équivalence : ≈ ' + fmt(eq, 0) + ' mg/j de carbimazole.') : null,
      c.sit === 'basedow' ? h('div', { class: 'sv-field' }, [h('label', { for: 'sbPro' }, 'Propranolol'), h('select', { id: 'sbPro', onchange: (e) => { d.propra = +e.target.value; } }, PROPRA.map((x) => h('option', { value: x, selected: d.propra === x }, x ? x + ' mg/j' : 'Aucun')))]) : null,
      c.sit === 'central' ? h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'sbHc', checked: d.hc, onchange: (e) => { d.hc = e.target.checked; } }), ' Hydrocortisone 20 mg/j']) : null,
      c.sit !== 'basedow' && !showAts ? h('button', { type: 'button', class: 'sv-link sv-more', onclick: () => { d.ats = 'cbz'; d.atsDose = 0; re(); } }, '+ Antithyroïdien de synthèse') : null,
      h('h3', null, 'Prochain bilan'),
      h('div', { class: 'sv-inline' }, [
        'dans',
        h('input', { type: 'number', id: 'sbWait', class: 'sv-num', value: d.wait, min: 1, max: d.unit === 'sem' ? 104 : 730, step: 1, inputmode: 'numeric', 'aria-label': 'Délai', oninput: (e) => { d.wait = parseFloat(e.target.value) || 0; } }),
        h('select', { id: 'sbUnit', 'aria-label': 'Unité', onchange: (e) => { d.unit = e.target.value; } }, [h('option', { value: 'sem', selected: d.unit === 'sem' }, 'semaines'), h('option', { value: 'j', selected: d.unit === 'j' }, 'jours')])
      ]),
      h('div', { class: 'sv-chips' }, TESTS.filter(([k]) => k !== 'trab' || c.sit === 'basedow').map(([k, t]) => h('label', { class: 'sv-chipcheck' }, [h('input', { type: 'checkbox', id: 'sbT' + k, checked: d.tests.has(k), onchange: (e) => { e.target.checked ? d.tests.add(k) : d.tests.delete(k); } }), ' ' + t]))),
      h('p', { class: 'sv-alert', hidden: true }),
      h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: submit }, 'Prescrire et voir le bilan →'))
    ]);
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
      h('table', { class: 'sv-res sv-big' }, [
        h('thead', null, h('tr', null, [h('th', null, 'Dosage'), h('th', null, 'Résultat'), h('th', null, 'Référence')])),
        h('tbody', null, rows.map(([k, name, unit, ref]) => { const td = labCells(e.labs)[['tsh', 't4', 't3', 'trab', 'pnn'].indexOf(k)]; td.append(' ' + unit); return h('tr', null, [h('td', null, name), td, h('td', { class: 'sv-ref' }, ref)]); }))
      ]),
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
        h('thead', null, h('tr', null, ['Date', 'Traitement en cours', 'TSH', 'T4L', 'T3L', 'TRAb', 'PNN', 'FC'].map((t) => h('th', null, t)))),
        h('tbody', null, rows.map((e) => h('tr', null, [h('td', { class: 'sv-nowrap' }, dayLabel(e.day)), h('td', null, e.rx)].concat(labCells(e.labs), [h('td', null, e.hr)]))))
      ]))
    ]);
  }

  function reperesCard() {
    const pt = G.pt, c = G.cfg;
    const full = 1.6 * c.weight;
    const since = pt.flags.lastChange != null ? pt.day - pt.flags.lastChange : null;
    const items = [];
    if (c.sit !== 'basedow') {
      items.push('Dose substitutive complète théorique : ≈ 1,6 µg/kg/j, soit ' + Math.round(full) + ' µg/j pour ' + fmt(c.weight, 0) + ' kg (moins s\'il reste du tissu thyroïdien fonctionnel).');
      items.push('Demi-vie de la T4 ≈ 7 jours : l\'équilibre est atteint en 5 à 6 semaines, la TSH se stabilise en 6 à 8 semaines.');
      if (c.preg) items.push('Grossesse : les besoins augmentent de 25 à 50 % dès le 1er trimestre, cible TSH < 2,5 mUI/L.');
      if (c.sit === 'central') items.push('Hypothyroïdie centrale : la TSH ne guide pas le traitement, on vise une T4L dans la moitié supérieure de la normale.');
    } else {
      items.push('Carbimazole 20 à 40 mg/j en attaque ; 10 mg de carbimazole ≈ 6 mg de thiamazole ≈ 100 mg de PTU.');
      items.push('L\'ATS bloque la synthèse, pas la libération du stock : la T4L baisse en 3 à 6 semaines.');
      items.push('Après une thyrotoxicose, la TSH reste freinée plusieurs semaines : les premiers mois, la T4L guide la dose.');
    }
    if (since != null) items.push('Dernier changement de traitement il y a ' + since + ' jours : environ ' + Math.round(100 * (1 - Math.exp(-since * Math.LN2 / 7))) + ' % du nouvel équilibre de la T4 atteint.');
    return h('details', { class: 'sv-card sv-det' }, [h('summary', null, 'Repères pharmacologiques'), h('ul', { class: 'sv-keys' }, items.map((t) => h('li', null, t)))]);
  }

  function revealCard() {
    const x = G.hidden, c = G.cfg, pt = G.pt;
    const items = [];
    if (x.r != null) items.push('Fonction thyroïdienne résiduelle au départ : ' + Math.round(x.r * 100) + ' % d\'une thyroïde normale' + (c.variab === 'reel' ? ' (actuellement ' + Math.round(pt.par.r * 100) + ' %)' : '') + '.');
    if (x.abs != null) items.push('Absorption de la lévothyroxine : ' + Math.round(x.abs * 100) + ' % de celle du patient moyen.');
    if (x.trab != null) items.push('TRAb au départ : ' + fmt(x.trab, 1) + ' UI/L ; évolution ' + (x.fav ? 'favorable (rémission probable à l\'arrêt)' : 'défavorable (rechute probable à l\'arrêt)') + ' ; sensibilité à l\'ATS : ' + Math.round((9 / x.ec50) * 100) + ' % de la moyenne.');
    if (x.pit != null) items.push('Réserve thyréotrope : ' + Math.round(x.pit * 100) + ' %.');
    if (c.sit === 'thyro') items.push('Aucun tissu thyroïdien résiduel : toute la T4 vient du comprimé.');
    return h('details', { class: 'sv-card sv-det' }, [h('summary', null, 'Révéler le patient'), h('ul', { class: 'sv-keys' }, items.map((t) => h('li', null, t)))]);
  }

  S.sandbox = { setup };
})();
