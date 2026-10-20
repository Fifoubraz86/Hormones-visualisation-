/*
 * Mode thérapeutique « diabète de type 2 » : un patient simulé, une ordonnance libre, des bilans à la
 * date choisie. Aucune correction : le modèle (js/simu/dt2-model.js) répond.
 *
 * Événements, conséquences des décisions (seuils et délais : complément) :
 * - hypoglycémies (sulfamides, insuline), sévères surtout chez le sujet âgé et l'insuffisant rénal ;
 * - intolérance digestive de la metformine (dose pleine d'emblée) et des aGLP1 (paliers trop rapides),
 *   avec arrêt du traitement par le patient ;
 * - iSGLT2 : mycose génitale, acidocétose euglycémique (insulinopénie, LADA, régime pauvre en glucides) ;
 * - metformine sous DFG < 30 : acidose lactique ; pancréatite (antécédent) sous incrétines ;
 * - aggravation d'une rétinopathie sévère si l'HbA1c baisse trop vite ; cétose du LADA sans insuline ;
 *   coma hyperosmolaire du sujet âgé très déséquilibré.
 * Référentiel : item EDN 247 (fiche LiSA, rangs de la grille SFE/CEEDMM), item 253, et prise de position SFD 2025
 * (js/simu/sfd.js) : cible individualisée, lecture de l'ordonnance, initiation de l'insuline. Carnet glycémique,
 * capteur et rapport AGP, titration de l'insuline entre les consultations : js/simu/glyco.js.
 */
(function () {
  'use strict';
  const S = window.HV.simu;
  const D = S.dt2;
  const fmt = S.rules.fmt;
  const main = document.getElementById('svMain');
  const statusEl = document.getElementById('svStatus');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const NS = 'http://www.w3.org/2000/svg';

  const MET = [0, 500, 850, 1000, 1500, 1700, 2000, 2550, 3000];
  const SU = [0, 30, 60, 90, 120];
  const DPP4 = [0, 25, 50, 100];
  const ACARB = [0, 150, 300];
  const Y = S.glyco, SFD = S.sfd;
  const TESTS = [['a1c', 'HbA1c'], ['fpg', 'Glycémie à jeun'], ['carnet', 'Carnet glycémique'], ['agp', 'Rapport AGP (capteur)'], ['creat', 'Créatinine (DFG)'], ['alb', 'Albuminurie'], ['cpep', 'Peptide C'], ['gad', 'Anti-GAD'], ['cetone', 'Cétonémie'], ['lipase', 'Lipase'], ['fo', 'Fond d\'œil']];
  const PRESETS = [
    { label: 'Metformine seule, HbA1c 7,8', cfg: { profile: 'sird', sex: 'F', age: 58, weight: 88, height: 163, a1c: 7.8, duration: 4, rx0: { met: 2000 } } },
    { label: 'Metformine + gliclazide, HbA1c 8,4', cfg: { profile: 'sird', sex: 'M', age: 63, weight: 92, height: 174, a1c: 8.4, duration: 8, rx0: { met: 2000, su: 60 } } },
    { label: 'Trithérapie orale, HbA1c 9,2', cfg: { profile: 'sird', sex: 'M', age: 61, weight: 101, height: 176, a1c: 9.2, duration: 12, rx0: { met: 2000, su: 120, dpp4: 100 } } },
    { label: 'Metformine + sémaglutide + empagliflozine, HbA1c 8,1', cfg: { profile: 'sird', sex: 'F', age: 59, weight: 96, height: 165, a1c: 8.1, duration: 10, rx0: { met: 2000, glp: 'sema', glpDose: 1, sglt2: 'empa10' } } },
    { label: 'Insuline basale + metformine, HbA1c 8,8', cfg: { profile: 'sird', sex: 'M', age: 66, weight: 104, height: 178, a1c: 8.8, duration: 15, rx0: { met: 2000, basal: 24 } } },
    { label: 'Insuline à initier : trithérapie en échec, HbA1c 9,4', cfg: { profile: 'sird', sex: 'M', age: 62, weight: 95, height: 175, a1c: 9.4, duration: 14, rx0: { met: 2000, su: 120, dpp4: 100 } } },
    { label: 'Basale à 0,7 U/kg, HbA1c 8,6', cfg: { profile: 'sird', sex: 'F', age: 64, weight: 100, height: 165, a1c: 8.6, duration: 16, rx0: { met: 2000, basal: 70 } } },
    { label: 'Sujet âgé fragile, 79 ans, sous gliclazide', cfg: { profile: 'mard', sex: 'F', age: 79, weight: 66, height: 160, a1c: 7.4, duration: 18, dfg: 52, geria: 'fragile', rx0: { met: 1000, su: 60 } } },
    { label: 'Sédentaire, 1 L de soda par jour', cfg: { profile: 'sird', sex: 'M', age: 44, weight: 112, height: 178, a1c: 8.2, duration: 1, act0: 0, soda0: 4, snack0: 'important', motiv: 'forte' } },
    { label: 'DT2 obèse, HbA1c 8,5', cfg: { profile: 'sird', sex: 'M', age: 56, weight: 98, height: 172, a1c: 8.5, duration: 1 } },
    { label: 'DT2 mince, HbA1c 10', cfg: { profile: 'sidd', sex: 'M', age: 52, weight: 64, height: 175, a1c: 10, duration: 6 } },
    { label: 'Sujet âgé, 82 ans, DFG 38', cfg: { profile: 'mard', sex: 'F', age: 82, weight: 62, height: 158, a1c: 8, duration: 15, dfg: 38, irregular: true, geria: 'fragile' } },
    { label: 'DT2 et insuffisance cardiaque', cfg: { profile: 'sird', sex: 'M', age: 67, weight: 90, height: 175, a1c: 8.2, duration: 10, hfail: true, cvd: true, dfg: 55, alb: 'micro' } },
    { label: 'Rétinopathie proliférante, HbA1c 11', cfg: { profile: 'sird', sex: 'F', age: 49, weight: 85, height: 162, a1c: 11, duration: 12, retino: 'prolif' } },
    { label: 'Origine asiatique, IMC 24', cfg: { profile: 'mard', sex: 'F', age: 60, weight: 60, height: 158, a1c: 8, duration: 3, ethnic: 'asie' } },
    { label: 'LADA, 42 ans', cfg: { profile: 'lada', sex: 'F', age: 42, weight: 62, height: 165, a1c: 8.4, duration: 1 } },
    { label: 'MODY 3 (HNF1A), 24 ans', cfg: { profile: 'hnf1a', sex: 'F', age: 24, weight: 58, height: 166, a1c: 8.5, duration: 1 } },
    { label: 'MODY 2 (GCK), 30 ans', cfg: { profile: 'gck', sex: 'M', age: 30, weight: 72, height: 180, a1c: 6.4, duration: 5 } },
    { label: 'Observance moyenne', cfg: { profile: 'sird', sex: 'M', age: 48, weight: 104, height: 178, a1c: 9, duration: 4, adh: 'moyenne' } }
  ];
  const BASE = { profile: 'sird', sex: 'M', age: 56, weight: 98, height: 172, a1c: 8.5, duration: 1, dfg: 85, alb: 'normo', ethnic: 'eur', sbp: 142, retino: 'none', hfail: false, cvd: false, hcvr: false, masld: false, severe: false, driver: false, geria: 'bonne', panc: false, mtc: false, myco: false, irregular: false, lowcarb: false, adh: 'bonne', variab: 'moyen', rx0: null, act0: 30, soda0: 1, snack0: 'modere', motiv: 'moyenne' };
  let cfg = Object.assign({}, BASE);
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
  const dayLabel = (d) => 'J' + d + ' · S' + fmt(d / 7, d % 7 ? 1 : 0) + (d >= 60 ? ' · M' + fmt(d / 30.4, 0) : '');
  const g2 = (v) => fmt(v, 2) + ' g/L';
  const TOON_CAPTION = {
    hypoSevere: 'Le sucre, c\'était pas que pour le café.',
    hypo: 'Trois malaises ce mois-ci. Le sulfamide, lui, va très bien.',
    death: 'Fin de la consultation.',
    diarrhee: '3 g d\'emblée : le transit vous remercie.',
    vomit: 'Les paliers, ce n\'était pas décoratif.',
    acd: 'Glycémie presque normale, pH à 7,18 : l\'iSGLT2 a de l\'humour.',
    hyperosm: 'Avant la réhydratation.',
    lactic: 'Metformine et DFG < 30 : la citronnade.',
    panc: 'Le pancréas, lui, n\'avait pas oublié.',
    retino: 'Trop vite, trop bien : l\'œil n\'a pas suivi.',
    retinoNat: 'Le laser, c\'était pour avant.',
    trophy: 'Bravo. Notez la date.'
  };
  const rangBadge = (r) => (r ? h('span', { class: 'sv-rang sv-rang-' + r }, 'Rang ' + r) : null);

  /* ---------- Configuration ---------- */
  function setup() {
    G = null;
    statusEl.hidden = true;
    main.textContent = '';
    main.className = 'sv-main sv-home';
    const field = (label, input, id) => h('div', { class: 'sv-field' }, [h('label', { for: id }, label), input]);
    const num = (id, val, step, min, max, on) => h('input', { type: 'number', id, value: val, step, min, max, inputmode: 'decimal', class: 'sv-num', oninput: (e) => on(parseFloat(String(e.target.value).replace(',', '.'))) });
    const sel = (id, val, opts, on) => h('select', { id, onchange: (e) => on(e.target.value) }, opts.map(([k, t]) => h('option', { value: k, selected: String(val) === String(k) }, t)));
    const chk = (id, key, label) => h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id, checked: cfg[key], onchange: (e) => { cfg[key] = e.target.checked; } }), ' ' + label]);
    const bmi = cfg.weight / Math.pow(cfg.height / 100, 2);
    main.append(
      h('section', { class: 'sv-intro' }, [
        h('p', { class: 'sv-eyebrow' }, 'Diabète de type 2 · mode thérapeutique'),
        h('h1', null, 'Choisissez, dosez, attendez l\'HbA1c.'),
        h('p', { class: 'sv-lead' }, 'Créez un patient avec ses facteurs prédictifs de réponse (réserve insulinique, insulinorésistance, fonction rénale, origine, sous-type, observance, comorbidités), prescrivez librement, choisissez la date du bilan : HbA1c, glycémies, poids, hypoglycémies et événements indésirables découlent de vos choix. Aucune correction.')
      ]),
      h('section', { class: 'sv-card sv-setup' }, [
        h('h3', null, 'Exemples'),
        h('div', { class: 'sv-chips' }, PRESETS.map((p) => h('button', { type: 'button', class: 'sv-chip', onclick: () => { cfg = Object.assign({}, BASE, { variab: cfg.variab }, p.cfg); setup(); } }, p.label))),
        h('h3', null, 'Le patient'),
        h('div', { class: 'sv-form' }, [
          field('Profil', sel('dtProf', cfg.profile, Object.entries(D.PROFILES).map(([k, v]) => [k, v.label]), (v) => { cfg.profile = v; setup(); }), 'dtProf'),
          field('Sexe', sel('dtSex', cfg.sex, [['F', 'Femme'], ['M', 'Homme']], (v) => { cfg.sex = v; }), 'dtSex'),
          field('Âge (ans)', h('input', { type: 'number', id: 'dtAge', value: cfg.age, step: 1, min: 15, max: 100, inputmode: 'decimal', class: 'sv-num', oninput: (e) => { cfg.age = parseFloat(e.target.value); }, onchange: () => setup() }), 'dtAge'),
          field('Poids (kg)', num('dtW', cfg.weight, 1, 35, 250, (v) => { cfg.weight = v; }), 'dtW'),
          field('Taille (cm)', num('dtH', cfg.height, 1, 130, 210, (v) => { cfg.height = v; }), 'dtH'),
          field('HbA1c initiale (%)', num('dtA1c', cfg.a1c, 0.1, 6, 15, (v) => { cfg.a1c = v; }), 'dtA1c'),
          field('Ancienneté du diabète (ans)', num('dtDur', cfg.duration, 1, 0, 40, (v) => { cfg.duration = v; }), 'dtDur'),
          field('DFG (mL/min/1,73 m²)', num('dtDfg', cfg.dfg, 1, 10, 130, (v) => { cfg.dfg = v; }), 'dtDfg'),
          field('Albuminurie', sel('dtAlb', cfg.alb, Object.entries(D.ALB).map(([k, v]) => [k, v.label]), (v) => { cfg.alb = v; }), 'dtAlb'),
          field('PA systolique (mmHg)', num('dtSbp', cfg.sbp, 1, 90, 200, (v) => { cfg.sbp = v; }), 'dtSbp'),
          field('Origine', sel('dtEth', cfg.ethnic, Object.entries(D.ETHNIC).map(([k, v]) => [k, v.label]), (v) => { cfg.ethnic = v; }), 'dtEth'),
          field('Rétinopathie', sel('dtRet', cfg.retino, Object.entries(D.RETINO), (v) => { cfg.retino = v; }), 'dtRet'),
          cfg.age >= 75 ? field('Statut gériatrique (≥ 75 ans)', sel('dtGer', cfg.geria, [['bonne', 'En bonne santé, autonome'], ['fragile', 'Fragile'], ['dependant', 'Dépendant(e), santé très altérée']], (v) => { cfg.geria = v; }), 'dtGer') : null,
          field('Observance', sel('dtAdh', cfg.adh, [['bonne', 'Bonne'], ['moyenne', 'Moyenne (oublis fréquents)'], ['cachee', 'Inconnue (cachée)']], (v) => { cfg.adh = v; }), 'dtAdh'),
          field('Variabilité', sel('dtVar', cfg.variab, [['moyen', 'Patient moyen (reproductible)'], ['reel', 'Patient réel (réponses cachées)']], (v) => { cfg.variab = v; }), 'dtVar')
        ]),
        h('p', { class: 'sv-note' }, 'IMC : ' + fmt(bmi, 1) + ' kg/m².'),
        h('div', { class: 'sv-advice' }, [
          chk('dtHf', 'hfail', 'Insuffisance cardiaque'),
          chk('dtCvd', 'cvd', 'Maladie cardiovasculaire avérée (coronaropathie, AVC, AOMI)'),
          chk('dtHcvr', 'hcvr', 'Risque cardiovasculaire élevé ou très élevé, sans maladie avérée'),
          chk('dtMasld', 'masld', 'Stéatose hépatique métabolique (MASLD/MASH)'),
          chk('dtSev', 'severe', 'Espérance de vie < 5 ans ou comorbidité sévère'),
          chk('dtDrv', 'driver', 'Conduite professionnelle ou métier à risque'),
          chk('dtPanc', 'panc', 'Antécédent de pancréatite'),
          chk('dtMtc', 'mtc', 'Antécédent familial de cancer médullaire de la thyroïde ou de NEM2'),
          chk('dtMyco', 'myco', 'Mycoses génitales récidivantes'),
          chk('dtIrr', 'irregular', 'Repas irréguliers, vit seul(e)'),
          chk('dtLow', 'lowcarb', 'Régime très pauvre en glucides (type cétogène)')
        ]),
        h('h3', null, 'Mode de vie actuel'),
        h('div', { class: 'sv-form' }, [
          field('Activité physique (min/semaine)', sel('dtAct0', cfg.act0, [0, 30, 60, 90, 150, 300].map((x) => [x, x ? x + ' min' : 'aucune']), (v) => { cfg.act0 = +v; }), 'dtAct0'),
          field('Boissons sucrées (verres de 25 cL/jour)', sel('dtSoda0', cfg.soda0, [0, 1, 2, 4, 6].map((x) => [x, x ? x + (x === 4 ? ' (1 L)' : '') : 'aucune']), (v) => { cfg.soda0 = +v; }), 'dtSoda0'),
          field('Grignotage, apports excessifs', sel('dtSnack0', cfg.snack0, [['aucun', 'Aucun'], ['modere', 'Modérés'], ['important', 'Importants']], (v) => { cfg.snack0 = v; }), 'dtSnack0'),
          field('Motivation pour changer', sel('dtMotiv', cfg.motiv, [['faible', 'Faible'], ['moyenne', 'Moyenne'], ['forte', 'Forte']], (v) => { cfg.motiv = v; }), 'dtMotiv')
        ]),
        h('h3', null, 'Traitement en cours'),
        h('p', { class: 'sv-muted' }, 'Laissez vide pour un diabète découvert ; sinon, l\'HbA1c saisie est celle obtenue sous ce traitement, pris depuis des mois.'),
        h('div', { class: 'sv-form' }, (() => {
          const r = cfg.rx0 || {};
          const setR = (k, v) => { cfg.rx0 = Object.assign({}, cfg.rx0 || {}, { [k]: v }); };
          const Gp = D.GLP1[r.glp || 'none'];
          return [
            field('Metformine', sel('dtR0met', r.met || 0, MET.map((x) => [x, x ? x + ' mg/j' : 'Aucune']), (v) => setR('met', +v)), 'dtR0met'),
            field('Gliclazide LM', sel('dtR0su', r.su || 0, SU.map((x) => [x, x ? x + ' mg/j' : 'Aucun']), (v) => setR('su', +v)), 'dtR0su'),
            field('Sitagliptine', sel('dtR0dpp', r.dpp4 || 0, DPP4.map((x) => [x, x ? x + ' mg/j' : 'Aucune']), (v) => setR('dpp4', +v)), 'dtR0dpp'),
            field('Agoniste du GLP-1', h('div', { class: 'sv-inline' }, [
              sel('dtR0glp', r.glp || 'none', Object.entries(D.GLP1).map(([k, v]) => [k, v.name]), (v) => { setR('glp', v); setR('glpDose', v === 'none' ? 0 : D.GLP1[v].doses[D.GLP1[v].doses.length - 2]); setup(); }),
              Gp.doses.length ? sel('dtR0glpDose', r.glpDose, Gp.doses.map((x) => [x, String(x).replace('.', ',') + ' ' + Gp.unit]), (v) => setR('glpDose', +v)) : null
            ]), 'dtR0glp'),
            field('iSGLT2', sel('dtR0sglt', r.sglt2 || 'none', Object.entries(D.SGLT2), (v) => setR('sglt2', v)), 'dtR0sglt'),
            field('Insuline basale (U/j)', num('dtR0bas', r.basal || 0, 1, 0, 300, (v) => setR('basal', Math.max(0, Math.round(v) || 0))), 'dtR0bas')
          ];
        })()),
        h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: begin }, 'Voir le patient →'))
      ]),
      h('p', { class: 'sv-disc' }, 'Modèle pédagogique simplifié : effets et délais illustratifs (HbA1c jugée à 3 mois, demi-vie de l\'HbA1c ≈ 1 mois) ; ne remplace ni le jugement clinique ni les recommandations. Repères : prise de position SFD 2025 sur les traitements de l\'hyperglycémie, item EDN 247 (fiche LiSA), protocole d\'adaptation des doses d\'insuline du service ; effets des traitements : référentiel de la littérature.')
    );
    window.scrollTo(0, 0);
  }

  /* ---------- Partie ---------- */
  function begin() {
    const c = Object.assign({}, cfg);
    if (c.profile === 'gck') c.a1c = Math.min(c.a1c, 7);
    const pt = D.create(Object.assign({}, c, { adh: c.adh === 'cachee' ? (c.variab === 'reel' ? 'cachee' : 'bonne') : c.adh }));
    const r0 = Object.assign({}, D.RX0, c.rx0 || {});
    r0.rapidM = (r0.rapidM || [0, 0, 0]).slice(); r0.rapid = r0.rapidM.reduce((a, x) => a + x, 0);
    Object.assign(pt.rx, { rapidM: r0.rapidM.slice(), rapid: r0.rapid, basalType: r0.basalType });
    const onIns = r0.basal > 0 || r0.rapid > 0;
    G = {
      cfg: c, pt, history: [], visits: [], undo: [], truth: false, lastHypo: 0, lastSev: 0,
      seed: Math.floor(Math.random() * 1e9), glyDays: [], titrState: { above: {} }, titrLog: [], starts: {},
      titr: { who: onIns ? 'patient' : 'none', prof: c.age >= 75 && c.geria !== 'bonne' ? (c.geria === 'dependant' ? 'dep' : 'fra') : 'std', delai: 3, sfd10: false },
      cgm: false, asg: onIns ? '2' : r0.su > 0 ? 'w4' : '0', goal: null,
      ev: { metGI: null, glpGI: null, myco: null, sglt2Start: null, keto: false, panc: false, retinoDone: false, lactic: false, ketosis: -999, hyperosm: false, a1cHist: [], lastGlpChange: -999, sevSeen: 0, notes: [], ppr: null },
      draft: Object.assign({}, r0, { metProg: true, wait: 12, unit: 'sem', tests: new Set(['a1c', 'fpg']), ppr: false })
    };
    G.titr.obj = JSON.parse(JSON.stringify(Y.PROTO[G.titr.prof])); G.titr.bolusCtl = 'next';
    G.draft.titr = JSON.parse(JSON.stringify(G.titr)); G.draft.cgm = G.cgm; G.draft.asg = G.asg; G.draft.goal = null;
    // Quatorze jours de glycémies avant la première consultation (carnet, capteur).
    for (let k = 14; k > 0; k--) { pt.day = -k; recordDay(); }
    pt.day = 0;
    doLabs(new Set(['a1c', 'fpg', 'creat']), 'Bilan initial');
    render();
  }

  /* ---------- Événements ---------- */
  function onPrescribe(prev, metBefore, prog) {
    const pt = G.pt, rx = pt.rx, ev = G.ev, p = pt.par, real = G.cfg.variab === 'reel';
    // Metformine : introduction progressive (+ 500 mg par semaine) ou dose pleine d'emblée.
    const jump = rx.met - prev.met;
    if (rx.met < prev.met || rx.met <= 1000) { if (ev.metGI) { ev.metGI = null; } pt.take.met = true; }
    if (rx.met !== prev.met) pt.metRamp = prog && jump > 0 ? { from: pt.take.met ? metBefore : 0, to: rx.met, start: pt.day } : null;
    // Environ 15 % d'intolérants malgré une introduction progressive (SFD 2025, avis 6).
    if (jump > 0 && prog) { pt.take.met = true; if (real && Math.random() < 0.3 * p.giSens) ev.metGI = { day: pt.day + 10, stopDay: pt.day + 40, fired: false }; }
    else if (jump > 0) {
      const prob = p.giSens * jump / 2000;
      const hit = real ? Math.random() < prob : p.giSens + jump / 3000 >= 1;
      if (hit) ev.metGI = { day: pt.day + 4, stopDay: pt.day + 18, fired: false };
      if (prev.met === 0) pt.take.met = true;
    }
    // aGLP1 : nausées, vomissements si on saute des paliers ou si on monte trop vite.
    const Gp = D.GLP1[rx.glp], Gq = D.GLP1[prev.glp];
    if (rx.glp !== 'none') {
      const iNew = Gp.doses.indexOf(rx.glpDose), iOld = prev.glp === rx.glp ? Gq.doses.indexOf(prev.glpDose) : -1;
      const steps = iNew - iOld;
      const tooFast = iOld >= 0 && steps > 0 && pt.day - ev.lastGlpChange < Gp.step;
      if (steps > 0 || prev.glp !== rx.glp) ev.lastGlpChange = pt.day;
      const severity = steps - 1 + (tooFast ? 1 : 0);
      if (severity >= 1 || (real && steps > 0 && Math.random() < 0.15)) ev.glpGI = { day: pt.day + 3, severe: severity >= 2, fired: false };
      if (steps < 0 || prev.glp !== rx.glp) pt.take.glp = true;
      if (iNew < iOld) ev.glpGI = null;
    } else { pt.take.glp = true; ev.glpGI = null; }
    // iSGLT2
    if (rx.sglt2 !== 'none' && prev.sglt2 === 'none') {
      ev.sglt2Start = pt.day;
      pt.st.dfg -= 3; // baisse initiale attendue du DFG
      const pm = (G.cfg.sex === 'F' ? 0.1 : 0.04) * (p.mycoHist ? 3 : 1);
      if (real ? Math.random() < pm : p.mycoHist) ev.myco = { day: pt.day + 21, fired: false };
    }
    if (rx.sglt2 === 'none') ev.sglt2Start = null;
  }

  /* ---------- Glycémies du jour, titration ---------- */
  // Une journée de glycémies (carnet, capteur) ; avec titrate, le patient ou l'IDE adapte les doses
  // d'insuline selon le protocole prescrit.
  function recordDay(titrate) {
    const pt = G.pt;
    const newHypo = pt.st.hypo - (G.lastH == null ? pt.st.hypo : G.lastH), newSev = pt.st.hypoSev - (G.lastS == null ? pt.st.hypoSev : G.lastS);
    const dp = Y.makeDay(pt, D, { seed: (G.seed + pt.day * 7919) >>> 0, irregular: G.cfg.irregular || G.cfg.adh === 'moyenne', newHypo, newSev });
    pt.st.hypo += dp.native;
    G.lastH = pt.st.hypo; G.lastS = pt.st.hypoSev;
    const rdg = Y.readings(dp);
    dp.rdg = rdg;
    if (titrate && G.titr.who !== 'none' && (pt.rx.basal > 0 || pt.rx.rapid > 0)) {
      const follow = G.cfg.variab !== 'reel' || G.titr.who === 'ide' || Math.random() < 0.85;
      const before = { b: pt.rx.basal, m: pt.rx.rapidM.slice() };
      const log = Y.titrate(pt.rx, rdg, G.titr, G.titrState, follow);
      if (log.length) G.titrLog.push({ day: pt.day, log, before });
    }
    dp.basalAfter = pt.rx.basal;
    G.glyDays.push(dp);
    if (G.glyDays.length > 28) G.glyDays.shift();
    return dp;
  }

  // Lignes du carnet : mesures faites selon la fréquence d'autosurveillance prescrite.
  function carnetRows() {
    const days = G.glyDays.slice(-14), asg = G.asg;
    return days.map((dp) => {
      const set = G.cgm ? (dp.rapid.some((x) => x > 0) ? Y.MOMENTS.map((m) => m[0]) : ['rev', 'avDej', 'avDin', 'coucher']) : asg !== '0' ? Y.ASG[asg].set(dp.d) : [];
      const v = {};
      set.forEach((k) => { v[k] = dp.rdg[k]; });
      const rem = dp.rdg.hypos.map((hy) => 'malaise à ' + Math.floor(hy.t) + ' h ' + String(Math.round((hy.t % 1) * 60)).padStart(2, '0') + ' : ' + fmt(hy.g, 2) + ' g/L' + (hy.sev ? ' (tierce personne)' : ', resucrage'));
      return { d: dp.d, basal: dp.basal, u: dp.rapid, v, hypos: dp.rdg.hypos, rem };
    });
  }

  // Épitaphes d'humour noir.
  function epitaph(cause) {
    const pt = G.pt, c = G.cfg;
    const nm = (c.sex === 'F' ? 'Ci-gît Mme ' : 'Ci-gît M. ') + ['Glycémie', 'Sucre', 'Insuline', 'Glucose'][Math.floor(pt.day / 7) % 4];
    const age = c.age + Math.floor(pt.day / 365) + ' ans';
    const a1c = 'HbA1c : ' + fmt(pt.st.A, 1) + ' %';
    const L = {
      hypo: [nm + ', ' + age, a1c + ', impeccable', 'Mort guéri de son diabète', '(hypoglycémie sévère)'],
      lactic: [nm + ', ' + age, 'DFG < 30, metformine 2 g', 'Il ne manquait que le citron', '(acidose lactique)'],
      hyperosm: [nm + ', ' + age, 'Glycémie : 9 g/L', 'Desséché comme un raisin', '(coma hyperosmolaire)']
    };
    return L[cause];
  }

  function daily() {
    const pt = G.pt, rx = pt.rx, ev = G.ev, p = pt.par, s = pt.st, d = pt.day;
    const who = G.cfg.sex === 'F' ? 'La patiente' : 'Le patient';
    if (d % 7 === 0) ev.a1cHist.push([d, s.A]);
    // Hypoglycémie sévère
    if (s.hypoSev > ev.sevSeen) {
      ev.sevSeen = s.hypoSev;
      const fragile = p.age >= 70 || s.dfg < 45;
      const again = ev.lastSev != null && d - ev.lastSev < 120 && (rx.su || rx.basal || rx.rapid);
      ev.lastSev = d;
      if (again && fragile) return { death: true, toon: 'death', text: 'J' + d + ' : deuxième hypoglycémie sévère en moins de 4 mois, cette fois la nuit, seul' + (G.cfg.sex === 'F' ? 'e' : '') + '. Retrouvé' + (G.cfg.sex === 'F' ? 'e' : '') + ' au matin. Le traitement hypoglycémiant n\'avait pas été allégé.', epitaphe: epitaph('hypo') };
      return { toon: 'hypoSevere', text: 'J' + d + ' : hypoglycémie sévère (glycémie capillaire 0,38 g/L), troubles de conscience, prise en charge par ' + (rx.su ? 'le SAMU : glucosé 30 % IV (glucagon contre-indiqué sous sulfamide)' : 'l\'entourage : glucagon') + '.', tests: ['carnet'] };
    }
    // Metformine : intolérance digestive
    if (ev.metGI && !ev.metGI.fired && d >= ev.metGI.day) { ev.metGI.fired = true; G.ev.notes.push('diarrhée, ballonnements depuis l\'augmentation de la metformine'); }
    if (ev.metGI && ev.metGI.fired && d >= ev.metGI.stopDay && pt.take.met) { pt.take.met = false; G.ev.notes.push(who.toLowerCase() + ' a arrêté la metformine à J' + d + ' à cause des troubles digestifs'); G.ev.banner = who + ' a arrêté la metformine à J' + d + ' (diarrhée) : elle n\'agit plus depuis.'; G.ev.toonNext = 'diarrhee'; }
    // Metformine et DFG < 30
    if (rx.met > 0 && pt.take.met && s.dfg < 30 && !ev.lactic) {
      ev.lacticCount = (ev.lacticCount || 0) + 1;
      if (ev.lacticCount > 30) {
        const second = ev.lacticDone;
        ev.lactic = true; rx.met = 0; ev.lacticDone = true;
        if (second || p.age >= 75) return { death: true, toon: 'death', text: 'J' + d + ' : acidose lactique sévère sous metformine malgré un DFG < 30 mL/min ; décès en réanimation.', epitaphe: epitaph('lactic') };
        return { toon: 'lactic', text: 'J' + d + ' : épisode de gastro-entérite, puis polypnée et somnolence : acidose lactique (lactates 9 mmol/L, pH 7,12) sous metformine malgré un DFG < 30 mL/min. Réanimation, metformine arrêtée.', tests: ['creat'], stop: 'met' };
      }
    }
    // aGLP1 : troubles digestifs
    if (ev.glpGI && !ev.glpGI.fired && d >= ev.glpGI.day) {
      ev.glpGI.fired = true;
      if (ev.glpGI.severe) {
        pt.take.glp = false; s.dfg *= 0.75;
        return { toon: 'vomit', text: 'J' + d + ' : vomissements incoercibles depuis l\'augmentation de l\'aGLP1, déshydratation, créatinine augmentée (insuffisance rénale fonctionnelle). ' + who + ' a arrêté l\'injection.', tests: ['creat'] };
      }
      G.ev.notes.push('nausées, satiété précoce depuis la hausse de l\'aGLP1');
    }
    if (!pt.take.glp && s.dfg < pt.par.dfg0Eff) s.dfg += 0.5;
    // iSGLT2 : mycose, acidocétose euglycémique
    if (ev.myco && !ev.myco.fired && d >= ev.myco.day && rx.sglt2 !== 'none') { ev.myco.fired = true; G.ev.notes.push('mycose génitale (prurit, leucorrhées)'); }
    if (rx.sglt2 !== 'none' && ev.sglt2Start != null && !ev.keto && d - ev.sglt2Start >= 10) {
      const insulinopenia = D.beta(pt) < 0.2 && (rx.basal + rx.rapid) < 0.15 * p.weight0;
      if (insulinopenia || p.lowcarb) {
        ev.keto = true; rx.sglt2 = 'none';
        if (D.beta(pt) < 0.2) rx.basal = Math.max(rx.basal, Math.round(0.2 * p.weight0));
        return { toon: 'acd', text: 'J' + d + ' : nausées, vomissements, douleurs abdominales, polypnée de Kussmaul. Glycémie 1,90 g/L seulement, mais cétonémie 4,8 mmol/L, pH 7,18, HCO₃⁻ 12 mmol/L : acidocétose euglycémique sous iSGLT2' + (p.lowcarb ? ' (régime cétogène)' : ' (insulinopénie)') + '. Hospitalisation, iSGLT2 arrêté' + (D.beta(pt) < 0.2 ? ', relais par insuline basale ' + rx.basal + ' U/j' : '') + '.', tests: ['cetone'], stop: 'sglt2' };
      }
    }
    // Pancréatite (antécédent) sous incrétines
    if ((rx.glp !== 'none' || rx.dpp4 > 0) && p.panc && !ev.panc) {
      ev.pancCount = (ev.pancCount || 0) + 1;
      if (ev.pancCount > 45) {
        ev.panc = true; rx.glp = 'none'; rx.glpDose = 0; rx.dpp4 = 0;
        return { toon: 'panc', text: 'J' + d + ' : douleur épigastrique transfixiante, vomissements ; lipase à 12 N : pancréatite aiguë chez un patient aux antécédents de pancréatite, sous incrétine. Hospitalisation ; incrétine arrêtée.', tests: ['lipase'], stop: 'incr' };
      }
    }
    // Rétinopathie sévère ou proliférante : aggravation précoce si l'HbA1c baisse vite (≥ 2 points en
    // 3 mois ; ≥ 1,5 point sous aGLP1, tirzépatide ou insuline, comme dans SUSTAIN-6 où elle touchait
    // surtout les rétinopathies connues avec une forte baisse précoce ; ≥ 3,5 points après photocoagulation). Sans laser, la rétinopathie proliférante saigne aussi d'elle-même (patient réel).
    // SFD 2025, avis 6 bis et 8 bis : fond d'œil rapide, objectifs gradués, complication non spécifique.
    if ((p.retino === 'severe' || p.retino === 'prolif') && !ev.retinoDone) {
      const win = ev.a1cHist.filter((x) => d - x[0] <= 91);
      const top = win.reduce((m, x) => (x[1] > m[1] ? x : m), [d, s.A]);
      const drop = top[1] - s.A;
      const strong = rx.glp !== 'none' || rx.basal + rx.rapid > 0;
      const thr = ev.ppr != null ? 3.5 : strong ? 1.5 : 2;
      const nat = p.retino === 'prolif' && ev.ppr == null && G.cfg.variab === 'reel' && Math.random() < 0.0003;
      if ((d >= 42 && drop >= thr) || nat) {
        ev.retinoDone = true;
        const why = nat ? 'rétinopathie proliférante non traitée par laser' : 'aggravée par la baisse rapide de l\'HbA1c (' + fmt(top[1], 1) + ' → ' + fmt(s.A, 1) + ' % en ' + Math.max(1, Math.round((d - top[0]) / 7)) + ' semaines' + (rx.glp === 'sema' || rx.glp === 'tirz' ? ', sous ' + D.GLP1[rx.glp].name.split(' (')[0].toLowerCase() : rx.basal + rx.rapid > 0 ? ', sous insuline' : '') + ')' + (ev.ppr == null ? ', sans photocoagulation préalable' : '');
        return { toon: nat ? 'retino' : 'retino', text: 'J' + d + ' : baisse brutale de l\'acuité visuelle de l\'œil droit : hémorragie intravitréenne sur rétinopathie ' + (p.retino === 'prolif' ? 'proliférante' : 'préproliférante') + ', ' + why + '. Vitrectomie à discuter, panphotocoagulation en urgence.', tests: ['fo'], caption: nat ? 'retinoNat' : 'retino' };
      }
    }
    // Cétose (LADA, insulinopénie) sans insuline
    if (D.beta(pt) < 0.1 && (rx.basal + rx.rapid) < 0.1 * p.weight0 && s.MG > 2.5 && d - ev.ketosis > 90) {
      ev.ketosis = d;
      return { toon: 'acd', text: 'J' + d + ' : amaigrissement de 4 kg, syndrome polyuro-polydipsique, asthénie ; cétonémie 2,6 mmol/L : cétose par carence insulinique.', tests: ['cetone', 'fpg'] };
    }
    // Coma hyperosmolaire
    if (p.age >= 75 && s.MG > 3.8 && !ev.hyperosm) {
      ev.hyperosm = true;
      if (p.age >= 85 || s.MG > 4.5) return { death: true, toon: 'death', text: 'J' + d + ' : coma hyperosmolaire (glycémie 9 g/L, osmolalité 370 mOsm/kg) découvert trop tard par l\'infirmière ; décès malgré la réhydratation.', epitaphe: epitaph('hyperosm') };
      return { toon: 'hyperosm', text: 'J' + d + ' : confusion, déshydratation majeure ; glycémie 7,2 g/L, osmolalité 345 mOsm/kg, pas de cétose : coma hyperosmolaire. Hospitalisation.', tests: ['fpg', 'creat'] };
    }
    return null;
  }

  /* ---------- Bilans ---------- */
  function qual(k, m) {
    const pt = G.pt, p = pt.par, ev = G.ev;
    if (k === 'alb') return D.ALB[G.cfg.alb].label.split(' (')[0].toLowerCase() + (pt.rx.sglt2 !== 'none' ? ', en baisse' : '');
    if (k === 'cpep') return fmt(m.cpep, 1) + ' ng/mL (N 0,9–4)';
    if (k === 'gad') return p.gad ? 'positifs (85 UI/mL)' : 'négatifs';
    if (k === 'cetone') return ev.keto && G.lastEvent === 'keto' ? '4,8 mmol/L' : (D.beta(pt) < 0.1 && pt.st.MG > 2.5 ? '2,6 mmol/L' : '< 0,3 mmol/L');
    if (k === 'lipase') return ev.panc ? '12 N' : 'normale';
    if (k === 'fo') return ev.retinoDone ? 'hémorragie intravitréenne, néovaisseaux : panphotocoagulation à programmer' : D.RETINO[p.retino];
    return '';
  }

  function doLabs(tests, note, event) {
    const pt = G.pt;
    const m = D.measure(pt);
    const labs = {}, q = [];
    let carnet = null, agp = null;
    tests.forEach((k) => {
      if (k === 'a1c') labs.a1c = G.history.length ? m.a1c : pt.st.A; // bilan initial : la valeur saisie
      else if (k === 'fpg') labs.fpg = G.glyDays.length ? G.glyDays[G.glyDays.length - 1].rdg.rev : m.fpg;
      else if (k === 'creat') labs.dfg = m.dfg;
      else if (k === 'carnet') { if (G.asg !== '0' || G.cgm) carnet = carnetRows(); else q.push(['Carnet glycémique', 'pas d\'autosurveillance glycémique prescrite']); }
      else if (k === 'agp') {
        if (G.cgm && G.glyDays.some((dp) => dp.d > (G.cgmStart == null ? -99 : G.cgmStart))) { const days = G.glyDays.slice(-14).filter((dp) => dp.d > (G.cgmStart == null ? -99 : G.cgmStart)); agp = { st: Y.agpStats(Y.cgm(days), days.length), days }; }
        else q.push(['Rapport AGP', 'pas de capteur de glucose prescrit']);
      }
      else q.push([TESTS.find((t) => t[0] === k)[1], qual(k, m)]);
    });
    // Titration faite entre les deux consultations.
    const tl = G.titrLog.filter((x) => x.day >= (G.visitStart == null ? 0 : G.visitStart));
    let titr = null;
    if (tl.length) {
      const first = tl[0].before, rx = pt.rx, parts = [];
      if (first.b !== rx.basal) parts.push('basale ' + first.b + ' → ' + rx.basal + ' U');
      rx.rapidM.forEach((u, i) => { if (first.m[i] !== u) parts.push('bolus du ' + ['petit-déjeuner', 'déjeuner', 'dîner'][i] + ' ' + first.m[i] + ' → ' + u + ' U'); });
      const down = tl.reduce((a, x) => a + x.log.filter((l) => l.to < l.from).length, 0), up = tl.reduce((a, x) => a + x.log.filter((l) => l.to > l.from).length, 0);
      titr = (G.titr.who === 'ide' ? 'L\'IDE' : G.cfg.sex === 'F' ? 'La patiente' : 'Le patient') + ' a appliqué le protocole : ' + (parts.join(', ') || 'doses revenues à leur point de départ') + ' (' + up + ' hausse' + (up > 1 ? 's' : '') + ', ' + down + ' baisse' + (down > 1 ? 's' : '') + ').';
    }
    const sy = symptoms(m);
    const nHypo = pt.st.hypo - G.lastHypo;
    let toon = G.ev.eventToon || G.ev.toonNext || (nHypo >= 3 ? 'hypo' : null);
    const T = goalT();
    const target = T.max;
    if (!toon && labs.a1c != null && labs.a1c < target && nHypo === 0 && !G.ev.trophy && G.history.length && G.history[0].labs.a1c >= target) { toon = 'trophy'; G.ev.trophy = true; }
    if (labs.a1c != null && labs.a1c > 8 && pt.rx.basal + pt.rx.rapid > 0) G.cgmAcquired = true;
    if ((pt.rx.basal > 0 ? 1 : 0) + (pt.rx.rapidM || []).filter((x) => x > 0).length >= 3) G.cgmAcquired = true;
    G.history.push({ day: pt.day, labs, q, w: m.w, bmi: m.bmi, sbp: Math.round(m.sbp), symptoms: sy, rx: rxLabel(pt.rx), note, event: event || null, toon, caption: G.ev.caption || toon, banner: G.ev.banner || null, epitaphe: G.ev.epitaphe || null, carnet, agp, titr, T, a1cTrue: pt.st.A, ukg: pt.rx.basal / pt.st.W });
    G.ev.eventToon = null; G.ev.toonNext = null; G.ev.banner = null; G.ev.epitaphe = null; G.ev.caption = null;
    G.visits.push({ day: pt.day, labs });
    G.lastHypo = pt.st.hypo;
    G.ev.notes = [];
  }

  function symptoms(m) {
    const pt = G.pt, out = G.ev.notes.slice();
    const n = pt.st.hypo - G.lastHypo;
    if (n > 0) out.push(n + ' malaise' + (n > 1 ? 's' : '') + ' avec sueurs et tremblements, corrigé' + (n > 1 ? 's' : '') + ' par du sucre');
    if (pt.st.MG > 2.5) out.push('soif, urines abondantes, fatigue');
    if (G.cfg.adh === 'moyenne' || (pt.par.adh < 0.75)) out.push('reconnaît oublier souvent ses médicaments');
    if (pt.rx.met && !pt.take.met && !out.some((x) => x.includes('metformine'))) out.push('ne prend plus la metformine (troubles digestifs)');
    if (pt.rx.glp !== 'none' && !pt.take.glp) out.push('ne fait plus l\'injection d\'aGLP1 (vomissements)');
    return out;
  }

  function rxLabel(rx) {
    const o = [];
    const life = [rx.act ? 'activité ' + rx.act + ' min/sem' : '', rx.sodaStop ? 'arrêt des sodas' : '', rx.wtGoal ? 'objectif −' + rx.wtGoal + ' % de poids' : '', rx.diet ? 'suivi diététique' : ''].filter(Boolean);
    if (life.length) o.push('RHD (' + life.join(', ') + ')');
    if (rx.met) o.push('metformine ' + rx.met + ' mg/j');
    if (rx.su) o.push('gliclazide LM ' + rx.su + ' mg/j');
    if (rx.dpp4) o.push('sitagliptine ' + rx.dpp4 + ' mg/j');
    if (rx.glp !== 'none') o.push(D.GLP1[rx.glp].name.split(' (')[0].toLowerCase() + ' ' + fmt(rx.glpDose, rx.glpDose % 1 ? 2 : 0).replace(/,?0+$/, '') + ' ' + D.GLP1[rx.glp].unit);
    if (rx.sglt2 !== 'none') o.push(D.SGLT2[rx.sglt2].toLowerCase());
    if (rx.acarb) o.push('acarbose ' + rx.acarb + ' mg/j');
    if (rx.basal) o.push('insuline basale (' + ({ g100: 'glargine U100', g300: 'glargine U300', deg: 'dégludec', nph: 'NPH' }[rx.basalType] || 'glargine') + ') ' + rx.basal + ' U/j');
    if (rx.rapid) o.push('analogue rapide ' + (rx.rapidM || [0, rx.rapid, 0]).map((x) => x || 0).join('/') + ' U (petit-déj./déj./dîner)');
    return o.length ? o.join(' + ') : 'aucun traitement';
  }

  function snapshot() {
    const pt = G.pt;
    return JSON.stringify({ metRamp: pt.metRamp, st: pt.st, day: pt.day, rx: pt.rx, take: pt.take, par: Object.assign({}, pt.par), logLen: pt.log.length, hist: G.history.length, vis: G.visits.length, ev: G.ev, lastHypo: G.lastHypo,
      gly: G.glyDays, titrState: G.titrState, titrLog: G.titrLog.length, starts: G.starts, titr: G.titr, cgm: G.cgm, cgmStart: G.cgmStart, cgmAcq: !!G.cgmAcquired, asg: G.asg, goal: G.goal, lastH: G.lastH, lastS: G.lastS });
  }
  function restore(js) {
    const s = JSON.parse(js), pt = G.pt;
    pt.st = s.st; pt.day = s.day; pt.rx = s.rx; pt.take = s.take; pt.metRamp = s.metRamp; Object.assign(pt.par, s.par);
    pt.log.length = s.logLen; G.history.length = s.hist; G.visits.length = s.vis; G.ev = s.ev; G.lastHypo = s.lastHypo;
    G.glyDays = s.gly; G.titrState = s.titrState; G.titrLog.length = s.titrLog; G.starts = s.starts; G.titr = s.titr; G.cgm = s.cgm; G.cgmStart = s.cgmStart; G.cgmAcquired = s.cgmAcq; G.asg = s.asg; G.goal = s.goal; G.lastH = s.lastH; G.lastS = s.lastS;
    Object.assign(G.draft, pt.rx, { rapidM: pt.rx.rapidM.slice(), titr: JSON.parse(JSON.stringify(G.titr)), cgm: G.cgm, asg: G.asg, goal: G.goal });
  }

  // Cible d'HbA1c : celle fixée par le prescripteur, sinon la cible SFD 2025 calculée.
  function goalT() {
    const T = SFD.target(G.cfg, G.pt.rx, G.pt.st.dfg);
    return G.goal != null ? Object.assign({}, T, { max: G.goal, chosen: true }) : T;
  }

  function lastA1c() { const v = [...G.visits].reverse().find((x) => x.labs.a1c != null); return v ? v.labs.a1c : G.pt.st.A; }

  function submit() {
    const d = G.draft, pt = G.pt;
    const days = Math.round(d.unit === 'sem' ? d.wait * 7 : d.wait);
    const alert = main.querySelector('.sv-alert');
    const say = (t) => { alert.textContent = ''; (Array.isArray(t) ? t : [t]).forEach((x) => alert.append(h('span', { class: 'sv-alert-l' }, x))); alert.hidden = false; };
    if (!(days >= 1 && days <= 1095)) { say('Délai entre 1 jour et 3 ans.'); return; }
    if (!d.tests.size) { say('Cochez au moins un examen.'); return; }
    d.rapid = d.rapidM.reduce((a, x) => a + x, 0);
    // Initiation de l'insuline : règle de bonne pratique, refus si non respectée (SFD 2025, avis 18).
    if (d.cgm) d.asg = '0'; // sous capteur, la surveillance se fait sur le capteur
    // Indication au capteur : acquise dès qu'elle a existé (insuline avec HbA1c > 8 %, ou ≥ 3 injections/j),
    // même si le capteur n'avait pas été prescrit ce jour-là ; elle ne se perd pas quand l'HbA1c baisse.
    if (d.basal + d.rapid > 0 && lastA1c() > 8) G.cgmAcquired = true;
    const block = SFD.insulinInit(pt.rx, d, pt.st.W).concat(SFD.monitoring(d, d.asg, d.cgm, lastA1c(), G.cgmAcquired));
    const onInsD = d.basal + d.rapid > 0;
    if (onInsD && d.titr.who !== 'none' && d.asg === '0' && !d.cgm) block.push('Titration de l\'insuline sans autosurveillance ni capteur : impossible ; il faut au moins la glycémie du réveil chaque jour.');
    if (onInsD && d.titr.who !== 'none' && d.rapid > 0 && d.titr.bolusCtl === 'pp' && d.asg !== '6' && !d.cgm) block.push('Bolus adaptés sur la glycémie post-prandiale : prescrire l\'autosurveillance 6 fois par jour (avant et 2 h après les repas) ou un capteur.');
    if (block.length) { say(block); return; }
    G.undo.push(snapshot());
    const prev = Object.assign({}, pt.rx, { rapidM: pt.rx.rapidM.slice() });
    const metBefore = D.metDose(pt);
    Object.assign(pt.rx, { met: d.met, su: d.su, dpp4: d.dpp4, glp: d.glp, glpDose: d.glp === 'none' ? 0 : d.glpDose, sglt2: d.sglt2, acarb: d.acarb, basal: d.basal, basalType: d.basalType, rapidM: d.rapidM.slice(), rapid: d.rapid, act: d.act, sodaStop: d.sodaStop, wtGoal: d.wtGoal, diet: d.diet });
    if (d.cgm && !G.cgm) G.cgmStart = pt.day; // le capteur n'enregistre qu'à partir de sa pose
    G.titr = JSON.parse(JSON.stringify(d.titr)); G.cgm = d.cgm; G.asg = d.asg; G.goal = d.goal;
    if (d.cgm) G.cgmAcquired = true;
    if (d.ppr && G.ev.ppr == null) G.ev.ppr = pt.day;
    // Début des traitements, pour les règles d'arrêt (SFD 2025, avis 5).
    const on = { su: (r) => r.su > 0, dpp4: (r) => r.dpp4 > 0, sglt2: (r) => r.sglt2 !== 'none', glp: (r) => r.glp !== 'none' };
    Object.entries(on).forEach(([k, f]) => { if (f(pt.rx) && !f(prev)) G.starts[k] = { day: pt.day, a1c: lastA1c(), w: pt.st.W }; else if (!f(pt.rx)) delete G.starts[k]; });
    if (!(prev.basal > 0) && pt.rx.basal > 0) G.titrState = { above: {} };
    pt.par.dfg0Eff = Math.max(pt.par.dfg0Eff || 0, pt.st.dfg);
    onPrescribe(prev, metBefore, d.metProg);
    G.history.push({ day: pt.day, prescription: true, rx: rxLabel(pt.rx) });
    G.visitStart = pt.day;
    let interrupt = null;
    const rng = G.cfg.variab === 'reel' ? Math.random : null;
    D.advance(pt, days, () => { recordDay(true); const e = daily(); if (e) { interrupt = e; return false; } return true; }, rng);
    // Doses atteintes par la titration : point de départ de la prochaine ordonnance.
    d.basal = pt.rx.basal; d.rapidM = pt.rx.rapidM.slice(); d.rapid = pt.rx.rapid;
    let note = 'Bilan à ' + (d.unit === 'sem' ? d.wait + ' semaine' + (d.wait > 1 ? 's' : '') : days + ' jour' + (days > 1 ? 's' : ''));
    let tests = d.tests;
    if (interrupt) {
      note = interrupt.death ? 'Décès' : 'Consultation non programmée (bilan prévu annulé)';
      tests = new Set((interrupt.tests || []).concat(['fpg'], G.asg !== '0' || G.cgm ? ['carnet'] : []));
      G.ev.eventToon = interrupt.toon || null;
      G.ev.caption = interrupt.caption || null;
      if (interrupt.death) { G.dead = interrupt; G.ev.epitaphe = interrupt.epitaphe; }
      G.lastEvent = interrupt.text.includes('acidocétose') ? 'keto' : null;
      if (interrupt.stop === 'met') d.met = 0;
      if (interrupt.stop === 'sglt2') { d.sglt2 = 'none'; d.basal = pt.rx.basal; }
      if (interrupt.stop === 'incr') { d.glp = 'none'; d.glpDose = 0; d.dpp4 = 0; }
    }
    // Sous capteur, le rapport AGP des 14 derniers jours est joint à chaque bilan.
    if (G.cgm) tests = new Set([...tests, 'agp']);
    doLabs(tests, note, interrupt && interrupt.text);
    render();
    const res = main.querySelector('.sv-latest');
    if (res && window.innerWidth < 860) res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function undo() { const s = G.undo.pop(); if (!s) return; restore(s); G.dead = null; render(); }

  /* ---------- Rendu ---------- */
  function render() {
    const pt = G.pt;
    statusEl.hidden = false;
    statusEl.textContent = 'DT2 · ' + dayLabel(pt.day);
    main.textContent = '';
    main.className = 'sv-main sv-game sv-sandbox';
    const left = h('aside', { class: 'sv-dossier' }, [patientCard(), G.dead ? deathCard() : rxCard()]);
    const right = h('section', { class: 'sv-consult' }, [latestCard(), sfdCard(), chartCard(), marginCard(), historyCard(), factorsCard(), refCard(), effectsCard(), revealCard()]);
    main.append(left, right);
    const box = right.querySelector('.sv-chartbox');
    if (box) requestAnimationFrame(() => chart(box));
  }

  function patientCard() {
    const c = G.cfg, pt = G.pt;
    const bmi = c.weight / Math.pow(c.height / 100, 2);
    const co = [c.hfail && 'insuffisance cardiaque', c.cvd && 'maladie CV avérée', c.panc && 'ATCD de pancréatite', c.mtc && 'ATCD familial de CMT', c.myco && 'mycoses récidivantes', c.irregular && 'repas irréguliers', c.lowcarb && 'régime cétogène', c.retino !== 'none' && D.RETINO[c.retino].toLowerCase() + (G.ev.ppr != null ? ' (photocoagulée à J' + G.ev.ppr + ')' : ''), c.hcvr && 'risque CV élevé', c.masld && 'MASLD', c.severe && 'espérance de vie < 5 ans ou comorbidité sévère', c.driver && 'conduite professionnelle', c.age >= 75 && { bonne: 'âgé(e) en bonne santé', fragile: 'âgé(e) fragile', dependant: 'âgé(e) dépendant(e)' }[c.geria]].filter(Boolean);
    return h('div', { class: 'sv-card sv-id' }, [
      h('p', { class: 'sv-eyebrow' }, 'Patient simulé'),
      h('h2', null, (c.sex === 'F' ? 'Femme' : 'Homme') + ', ' + c.age + ' ans, ' + fmt(c.weight, 0) + ' kg, IMC ' + fmt(bmi, 1)),
      h('p', { class: 'sv-muted' }, 'Mode de vie : activité ' + c.act0 + ' min/sem, ' + (c.soda0 ? c.soda0 + ' verre(s) de soda/j' : 'pas de soda') + ', grignotage ' + { aucun: 'absent', modere: 'modéré', important: 'important' }[c.snack0] + ', motivation ' + c.motiv + '.'),
      h('p', { class: 'sv-muted' }, D.PROFILES[c.profile].label + ' · diabète connu depuis ' + c.duration + ' an' + (c.duration > 1 ? 's' : '') + ' · DFG ' + c.dfg + ' · albuminurie : ' + D.ALB[c.alb].label.split(' (')[0].toLowerCase() + ' · origine : ' + D.ETHNIC[c.ethnic].label + (co.length ? ' · ' + co.join(', ') : '') + (c.variab === 'reel' ? ' · réponses cachées' : '')),
      h('p', { class: 'sv-rx' }, [h('strong', null, 'Traitement en cours : '), rxLabel(pt.rx)]),
      h('div', { class: 'sv-actions' }, [
        h('button', { type: 'button', class: 'sv-secondary', onclick: undo, disabled: !G.undo.length }, '↶ Annuler la dernière étape'),
        h('button', { type: 'button', class: 'sv-secondary', onclick: setup }, 'Nouveau patient')
      ])
    ]);
  }

  function rxCard() {
    const d = G.draft;
    const re = () => render();
    const sel = (id, label, val, opts, on, rerender) => h('div', { class: 'sv-field' }, [h('label', { for: id }, label), h('select', { id, onchange: (e) => { on(e.target.value); if (rerender) re(); } }, opts.map(([k, t]) => h('option', { value: k, selected: String(val) === String(k) }, t)))]);
    const num = (id, label, val, on) => h('div', { class: 'sv-field' }, [h('label', { for: id }, label), h('span', { class: 'sv-numwrap' }, [h('input', { type: 'number', id, class: 'sv-num', value: val, min: 0, max: 300, step: 1, inputmode: 'numeric', oninput: (e) => on(Math.max(0, Math.round(parseFloat(e.target.value) || 0))) }), ' U/j'])]);
    const Gp = D.GLP1[d.glp];
    return h('div', { class: 'sv-card sv-ordo' }, [
      h('h3', null, 'Ordonnance'),
      h('h4', null, 'Règles hygiéno-diététiques'),
      h('div', { class: 'sv-form' }, [
        sel('dtAct', 'Objectif d\'activité physique', d.act, [[0, 'Inchangée (' + G.cfg.act0 + ' min/sem)']].concat([60, 90, 150, 200, 300].filter((x) => x > G.cfg.act0).map((x) => [x, x + ' min/semaine'])), (v) => { d.act = +v; }),
        sel('dtWt', 'Objectif de perte de poids', d.wtGoal, [0, 3, 5, 7, 10, 15].map((x) => [x, x ? '−' + x + ' % (' + fmt(G.pt.st.W * x / 100, 0) + ' kg)' : 'Aucun']), (v) => { d.wtGoal = +v; })
      ]),
      G.cfg.soda0 ? h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'dtSoda', checked: d.sodaStop, onchange: (e) => { d.sodaStop = e.target.checked; } }), ' Arrêt des boissons sucrées (' + G.cfg.soda0 + ' verre' + (G.cfg.soda0 > 1 ? 's' : '') + '/j actuellement)']) : null,
      h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'dtDiet', checked: d.diet, onchange: (e) => { d.diet = e.target.checked; } }), ' Suivi diététique (consultations, journal alimentaire)']),
      h('h4', null, 'Médicaments'),
      h('div', { class: 'sv-form' }, [
        h('div', { class: 'sv-field' }, [sel('dtMet', 'Metformine', d.met, MET.map((x) => [x, x ? x + ' mg/j' : 'Aucune']), (v) => { d.met = +v; }), h('label', { class: 'sv-check sv-small' }, [h('input', { type: 'checkbox', id: 'dtMetProg', checked: d.metProg, onchange: (e) => { d.metProg = e.target.checked; } }), ' Introduction progressive (+ 500 mg par semaine)'])]),
        sel('dtSu', 'Gliclazide LM (sulfamide)', d.su, SU.map((x) => [x, x ? x + ' mg/j' : 'Aucun']), (v) => { d.su = +v; }),
        sel('dtDpp', 'Sitagliptine (iDPP4)', d.dpp4, DPP4.map((x) => [x, x ? x + ' mg/j' : 'Aucune']), (v) => { d.dpp4 = +v; }),
        h('div', { class: 'sv-field' }, [h('label', { for: 'dtGlp' }, 'Agoniste du GLP-1'), h('div', { class: 'sv-inline' }, [
          h('select', { id: 'dtGlp', onchange: (e) => { d.glp = e.target.value; d.glpDose = d.glp === 'none' ? 0 : D.GLP1[d.glp].doses[0]; re(); } }, Object.entries(D.GLP1).map(([k, v]) => h('option', { value: k, selected: d.glp === k }, v.name))),
          Gp.doses.length ? h('select', { id: 'dtGlpDose', 'aria-label': 'Dose', onchange: (e) => { d.glpDose = +e.target.value; } }, Gp.doses.map((x) => h('option', { value: x, selected: d.glpDose === x }, String(x).replace('.', ',') + ' ' + Gp.unit))) : null
        ])]),
        sel('dtSglt', 'iSGLT2', d.sglt2, Object.entries(D.SGLT2), (v) => { d.sglt2 = v; }),
        sel('dtAcarb', 'Acarbose', d.acarb, ACARB.map((x) => [x, x ? x + ' mg/j' : 'Aucune']), (v) => { d.acarb = +v; }),
      ]),
      insulinBlock(d, re),
      h('h4', null, 'Objectif d\'HbA1c'),
      (() => { const T = SFD.target(G.cfg, G.pt.rx, G.pt.st.dfg); return h('div', { class: 'sv-form' }, [h('div', { class: 'sv-field' }, [h('label', { for: 'dtGoal' }, 'Fixé avec le patient'), h('select', { id: 'dtGoal', onchange: (e) => { d.goal = e.target.value === '' ? null : +e.target.value; } }, [['', 'Cible SFD 2025 calculée (≤ ' + fmt(T.max, 1) + ' %)']].concat([6.5, 7, 7.5, 8, 8.5, 9].map((x) => [x, '≤ ' + fmt(x, 1) + ' %'])).map(([k, v]) => h('option', { value: k, selected: String(d.goal == null ? '' : d.goal) === String(k) }, v)))])]); })(),
      h('h3', null, 'Prochain bilan'),
      h('div', { class: 'sv-inline' }, ['dans',
        h('input', { type: 'number', id: 'dtWait', class: 'sv-num', value: d.wait, min: 1, max: d.unit === 'sem' ? 156 : 1095, step: 1, inputmode: 'numeric', 'aria-label': 'Délai', oninput: (e) => { d.wait = parseFloat(e.target.value) || 0; } }),
        h('select', { id: 'dtUnit', 'aria-label': 'Unité', onchange: (e) => { d.unit = e.target.value; } }, [h('option', { value: 'sem', selected: d.unit === 'sem' }, 'semaines'), h('option', { value: 'j', selected: d.unit === 'j' }, 'jours')])
      ]),
      h('div', { class: 'sv-chips' }, TESTS.map(([k, t]) => h('label', { class: 'sv-chipcheck' }, [h('input', { type: 'checkbox', id: 'dtT' + k, checked: d.tests.has(k), onchange: (e) => { e.target.checked ? d.tests.add(k) : d.tests.delete(k); } }), ' ' + t]))),
      h('p', { class: 'sv-alert', hidden: true }),
      h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: submit }, 'Prescrire et voir le bilan →'))
    ]);
  }

  // Insulinothérapie : basale, bolus par repas, protocole d'adaptation des doses, surveillance.
  function insulinBlock(d, re) {
    const pt = G.pt, W = pt.st.W;
    const sel = (id, label, val, opts, on) => h('div', { class: 'sv-field' }, [h('label', { for: id }, label), h('select', { id, onchange: (e) => { on(e.target.value); } }, opts.map(([k, t]) => h('option', { value: k, selected: String(val) === String(k) }, t)))]);
    const unit = (id, val, on, label) => h('span', { class: 'sv-numwrap' }, [h('input', { type: 'number', id, class: 'sv-num sv-num-s', value: val, min: 0, max: 300, step: 1, inputmode: 'numeric', 'aria-label': label, oninput: (e) => { on(Math.max(0, Math.round(parseFloat(e.target.value) || 0))); } }), ' U']);
    const tot = () => d.basal + d.rapidM.reduce((a, x) => a + x, 0);
    const note = h('p', { class: 'sv-note', id: 'dtInsNote' });
    const upd = () => { note.textContent = tot() ? 'Insuline : ' + fmt(tot() / W, 2) + ' U/kg/j (basale ' + fmt(d.basal / W, 2) + ').' : ''; };
    upd();
    const lo = Math.max(6, Math.round(0.1 * W)), hi = Math.max(10, Math.round(0.2 * W));
    const t = d.titr;
    const O = Y.objOf(t);
    // Objectif glycémique modifiable (min–max, g/L), comme dans le protocole d'adaptation des doses.
    const rng = (k, label) => {
      const o = O[k] || (O[k] = [1.2, 1.8]);
      const inp = (i) => h('input', { type: 'number', id: 'dtObj' + k + i, class: 'sv-num sv-num-s', value: o[i], min: 0.5, max: 3, step: 0.05, inputmode: 'decimal', 'aria-label': label + (i ? ' maximum' : ' minimum'), oninput: (e) => { const v = parseFloat(String(e.target.value).replace(',', '.')); if (v > 0) { o[i] = v; if (k === 'avDej') O.avDin[i] = v; } } });
      return h('div', { class: 'sv-field' }, [h('label', null, label + ' (g/L)'), h('div', { class: 'sv-inline' }, [inp(0), '–', inp(1)])]);
    };
    const retNeed = (G.cfg.retino === 'severe' || G.cfg.retino === 'prolif') && G.ev.ppr == null;
    return h('div', { class: 'sv-ins' }, [
      h('h4', null, 'Insulinothérapie'),
      pt.rx.basal > 0 ? null : h('p', { class: 'sv-muted' }, 'Initiation : une injection d\'analogue lent, 6 à 10 U/j ou 0,1 à 0,2 U/kg/j, soit ' + lo + ' à ' + hi + ' U ici, puis titration (SFD 2025, avis 18). Une dose de départ plus forte est refusée.'),
      h('div', { class: 'sv-form' }, [
        h('div', { class: 'sv-field' }, [h('label', { for: 'dtBasal' }, 'Insuline basale (1 injection/j)'), h('div', { class: 'sv-inline' }, [unit('dtBasal', d.basal, (v) => { d.basal = v; upd(); }, 'Dose de basale'),
          h('select', { id: 'dtBasalType', 'aria-label': 'Insuline basale', onchange: (e) => { d.basalType = e.target.value; } }, [['g100', 'Glargine U100'], ['g300', 'Glargine U300'], ['deg', 'Dégludec'], ['nph', 'NPH']].map(([k, v]) => h('option', { value: k, selected: d.basalType === k }, v)))])]),
        h('div', { class: 'sv-field' }, [h('label', null, 'Analogue rapide aux repas (petit-déj. / déj. / dîner)'), h('div', { class: 'sv-inline' }, [0, 1, 2].map((m) => unit('dtBolus' + m, d.rapidM[m], (v) => { d.rapidM[m] = v; upd(); }, 'Bolus ' + Y.MEALS[m])))])
      ]),
      note,
      h('h4', null, 'Adaptation des doses entre les consultations'),
      h('div', { class: 'sv-form' }, [
        sel('dtTitrWho', 'Qui adapte ?', t.who, [['none', 'Personne (doses fixes)'], ['patient', 'Le patient (protocole écrit, éducation)'], ['ide', 'Un(e) IDE à domicile']], (v) => { t.who = v; }),
        sel('dtTitrProf', 'Type de patient (remplit les objectifs)', t.prof, Object.entries(Y.PROTO).map(([k, v]) => [k, v.label]), (v) => { t.prof = v; t.obj = JSON.parse(JSON.stringify(Y.PROTO[v])); if (!t.obj.pp) t.obj.pp = [1.4, 2.2]; re(); }),
        sel('dtTitrDel', 'Augmenter après', t.delai, [[2, '2 jours de suite au-dessus de l\'objectif'], [3, '3 jours de suite (SFD : tous les 3 jours)']], (v) => { t.delai = +v; }),
        sel('dtBolusCtl', 'Adapter les bolus sur', t.bolusCtl, [['next', 'la glycémie avant le repas suivant'], ['pp', 'la glycémie 2 h après le repas']], (v) => { t.bolusCtl = v; })
      ]),
      h('div', { class: 'sv-form' }, [rng('rev', 'Objectif au réveil'), rng('avDej', 'Avant les repas'), rng('coucher', 'Au coucher'), rng('pp', '2 h après les repas')]),
      h('label', { class: 'sv-check sv-small' }, [h('input', { type: 'checkbox', id: 'dtTitr10', checked: t.sfd10, onchange: (e) => { t.sfd10 = e.target.checked; } }), ' Au-delà de 40 U, pas de 10 % (SFD 2025) au lieu de 2 U']),
      h('p', { class: 'sv-note' }, 'Protocole du service : pas de 1 U sous 10 U, de 2 U au-delà ; baisse dès l\'injection suivante si hypoglycémie ou glycémie < ' + fmt(O.rev[0], 2) + ' g/L ; basale jugée sur le réveil, bolus sur la glycémie avant le repas suivant.'),
      h('h4', null, 'Surveillance glycémique'),
      h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'dtCgm', checked: d.cgm, onchange: (e) => { d.cgm = e.target.checked; d.asg = d.cgm ? '0' : (d.basal + d.rapidM.reduce((a, x) => a + x, 0) > 0 ? (d.rapidM.some((x) => x > 0) ? '4' : '1') : d.su > 0 ? 'w4' : '0'); re(); } }), ' Capteur de glucose (mesure en continu, rapport AGP)' + (G.cgmAcquired ? ' · indication acquise' : '')]),
      d.cgm ? h('p', { class: 'sv-note', id: 'dtSurvCgm' }, 'Surveillance par le capteur : l\'autosurveillance capillaire est arrêtée (bandelettes réservées aux doutes : symptômes discordants, capteur défaillant). Le rapport AGP des 14 derniers jours est joint à chaque bilan.')
        : h('div', { class: 'sv-form' }, [sel('dtAsg', 'Autosurveillance capillaire', d.asg, [['0', 'Aucune']].concat(Object.entries(Y.ASG).map(([k, v]) => [k, v.label])), (v) => { d.asg = v; })]),
      h('p', { class: 'sv-note' }, 'Lecteur et bandelettes : seulement sous traitement hypoglycémiant ; hors insuline, 200 bandelettes par an (HAS). Capteur : sous insuline à 3 injections/j ou plus sans condition, ou en moins de 3 injections (basale seule comprise) avec HbA1c > 8 % (LPPR) ; une fois posée, l\'indication reste acquise même si l\'HbA1c repasse sous 8 %.'),
      retNeed ? h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'dtPpr', checked: d.ppr, onchange: (e) => { d.ppr = e.target.checked; } }), ' Adresser en urgence en ophtalmologie : photocoagulation panrétinienne']) : null
    ]);
  }

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

  // Marge de progression hygiéno-diététique : situation actuelle, repères, et ce que donnerait le respect des objectifs.
  function marginCard() {
    const pt = G.pt, c = G.cfg, p = pt.par;
    const W = pt.st.W, bmi = W / Math.pow(c.height / 100, 2);
    const goals = { act: Math.max(150, p.act0), sodaStop: true, wtGoal: 7, diet: true };
    const sim = (rx, ach) => { const cp = JSON.parse(JSON.stringify(pt)); Object.assign(cp.rx, rx); if (ach != null) cp.par.lifeAch = ach; D.advance(cp, 182); return cp.st; };
    const now = sim({}, null), full = sim(goals, 1), mot = sim(goals, null);
    const rows = [
      ['Activité physique', p.act0 + ' min/semaine · repère : ≥ 150 min/semaine d\'intensité modérée (item 253) · marge : ' + (p.act0 >= 150 ? 'atteint' : '+ ' + (150 - p.act0) + ' min')],
      ['Poids', fmt(W, 1) + ' kg, IMC ' + fmt(bmi, 1) + ' · repère : perdre 5 à 10 % en 6 à 12 mois, 1 à 2 kg par mois (item 253) · soit ' + fmt(W * 0.05, 0) + ' à ' + fmt(W * 0.1, 0) + ' kg'],
      ['Boissons sucrées', p.soda0 ? p.soda0 + ' verre' + (p.soda0 > 1 ? 's' : '') + ' par jour (≈ ' + p.soda0 * 25 + ' g de sucre) · repère : aucune (complément)' : 'aucune'],
      ['Grignotage', { aucun: 'aucun', modere: 'modéré', important: 'important' }[p.snack0] + ' · un suivi diététique (journal alimentaire, repas structurés) aide à le réduire'],
      ['Motivation déclarée', c.motiv + (c.variab === 'reel' ? ' (atteinte réelle des objectifs inconnue)' : '')]
    ];
    return h('div', { class: 'sv-card sv-margin' }, [
      h('h3', null, 'Marge de progression hygiéno-diététique'),
      h('dl', { class: 'sv-exam sv-qual' }, rows.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)])),
      h('p', { class: 'sv-q' }, 'À traitement médicamenteux inchangé, dans 6 mois :'),
      h('ul', { class: 'sv-keys' }, [
        h('li', null, 'sans changement de mode de vie : HbA1c ≈ ' + fmt(now.A, 1) + ' %, poids ' + fmt(now.W, 0) + ' kg ;'),
        c.variab === 'reel' ? null : h('li', null, 'objectifs proposés (activité ' + goals.act + ' min/sem, arrêt des sodas, −7 % de poids, suivi diététique) avec sa motivation (' + c.motiv + ') : HbA1c ≈ ' + fmt(mot.A, 1) + ' %, poids ' + fmt(mot.W, 0) + ' kg ;'),
        h('li', null, 'mêmes objectifs tenus à 100 % : HbA1c ≈ ' + fmt(full.A, 1) + ' % (' + fmt(full.A - now.A, 1) + ' point), poids ' + fmt(full.W, 0) + ' kg.')
      ]),
      h('p', { class: 'sv-note' }, 'Estimations du modèle (complément) : perte de poids et activité améliorent la sensibilité à l\'insuline ; une perte de 5 à 10 % fait gagner environ 0,5 à 1 point d\'HbA1c.')
    ]);
  }

  function latestCard() {
    const e = [...G.history].reverse().find((x) => !x.prescription);
    const rows = [];
    const T = e.T;
    if (e.labs.a1c != null) rows.push(['HbA1c', fmt(e.labs.a1c, 1) + ' %', (T.chosen ? 'objectif fixé ≤ ' : 'cible ≤ ') + fmt(T.max, 1) + ' %' + (T.floor ? ', > ' + fmt(T.floor, 1) + ' %' : '') + (T.chosen ? '' : ' (SFD 2025)'), e.labs.a1c > T.max || (T.floor && e.labs.a1c < T.floor)]);
    if (e.labs.fpg != null) rows.push(['Glycémie à jeun', g2(e.labs.fpg), '0,70–1,10 g/L', e.labs.fpg > 1.26 || e.labs.fpg < 0.7]);
    if (e.labs.dfg != null) rows.push(['DFG (CKD-EPI)', fmt(e.labs.dfg, 0) + ' mL/min/1,73 m²', '> 60', e.labs.dfg < 60]);
    return h('div', { class: 'sv-card sv-latest' }, [
      h('div', { class: 'sv-latest-head' }, [h('p', { class: 'sv-eyebrow' }, e.note || 'Bilan'), h('h1', null, dayLabel(e.day))]),
      e.event ? h('p', { class: 'sv-event' }, e.event) : null,
      e.banner ? h('p', { class: 'sv-banner' }, '⚠ ' + e.banner) : null,
      e.toon ? S.toon(e.toon, { epitaphe: e.epitaphe, titre: TOON_CAPTION[e.caption || e.toon] }) : null,
      rows.length ? h('table', { class: 'sv-res sv-big' }, [h('thead', null, h('tr', null, [h('th', null, 'Examen'), h('th', null, 'Résultat'), h('th', null, 'Référence')])), h('tbody', null, rows.map(([a, b, c2, flag]) => h('tr', null, [h('td', null, a), h('td', { class: 'sv-v' + (flag ? ' hi' : '') }, b), h('td', { class: 'sv-ref' }, c2)])))]) : null,
      e.q.length ? h('dl', { class: 'sv-exam sv-qual' }, e.q.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)])) : null,
      h('p', { class: 'sv-clin' }, 'Poids ' + fmt(e.w, 1) + ' kg (IMC ' + fmt(e.bmi, 1) + ') · PA ' + e.sbp + ' mmHg · ' + (e.symptoms.length ? e.symptoms.join(' ; ') : 'pas de plainte particulière') + '.'),
      e.titr ? h('p', { class: 'sv-titr' }, '↻ ' + e.titr) : null,
      e.agp ? agpBlock(e) : null,
      e.carnet ? carnetBlock(e) : null,
      h('p', { class: 'sv-note' }, 'Traitement prescrit jusqu\'à ce bilan : ' + e.rx + '.')
    ]);
  }

  // Carnet glycémique et sa lecture guidée (protocole du service, SFD 2025).
  function carnetBlock(e) {
    const prot = G.titr;
    const O = Y.objOf(prot);
    const read = Y.interpretCarnet(e.carnet, prot, { basal: G.pt.rx.basal, basalUkg: e.ukg, a1c: e.labs.a1c });
    return h('div', { class: 'sv-gly' }, [
      h('h4', null, 'Carnet glycémique · ' + e.carnet.length + ' derniers jours'),
      h('p', { class: 'sv-note' }, (G.cgm ? 'Valeurs relevées sur le capteur aux heures du carnet (pas d\'autosurveillance capillaire)' : 'Autosurveillance : ' + Y.ASG[G.asg].label) + '. Couleurs selon les objectifs fixés : réveil ' + fmt(O.rev[0], 2) + '–' + fmt(O.rev[1], 2) + ', avant les repas ' + fmt(O.avDej[0], 2) + '–' + fmt(O.avDej[1], 2) + ', coucher ' + fmt(O.coucher[0], 2) + '–' + fmt(O.coucher[1], 2) + (O.pp ? ', 2 h après les repas ' + fmt(O.pp[0], 2) + '–' + fmt(O.pp[1], 2) : '') + ' g/L ; rouge : < 0,70 g/L.'),
      Y.carnetTable(e.carnet, prot, h),
      h('details', { class: 'sv-det sv-how' }, [h('summary', null, 'Comment lire un carnet'), h('ol', { class: 'sv-keys' }, [
        h('li', null, 'Les hypoglycémies d\'abord : à quelle heure, après quelle dose ? Hypoglycémie nocturne ou réveil sous l\'objectif : baisser la basale ; avant le repas suivant ou 2 à 4 h après un repas : baisser le bolus de ce repas (dès l\'injection suivante).'),
        h('li', null, 'Le réveil juge l\'insuline basale (du soir ou du coucher) : au-dessus de l\'objectif ' + prot.delai + ' jours de suite → + 1 U (dose < 10 U) ou + 2 U (≥ 10 U).'),
        h('li', null, 'Le bolus d\'un repas se juge sur la glycémie avant le repas suivant (petit-déjeuner → avant midi, déjeuner → avant le soir, dîner → coucher).'),
        h('li', null, 'Réveil dans l\'objectif mais journée haute, ou basale > 0,5 U/kg avec un coucher bien plus haut que le réveil : la basale ne suffit plus ou corrige à tort la journée ; aGLP1 ou tirzépatide de préférence, sinon bolus (SFD 2025, avis 19).'),
        h('li', null, 'Confronter à l\'HbA1c : un carnet trop beau pour l\'HbA1c signe des mesures rares ou choisies.')
      ])]),
      h('details', { class: 'sv-det sv-how' }, [h('summary', null, 'Proposition d\'interprétation'), h('ul', { class: 'sv-keys' }, read.map((t) => h('li', null, t)))])
    ]);
  }

  function agpBlock(e) {
    const tg = Y.cgmTargets(SFD.cgmFragile(G.cfg));
    const read = Y.interpretAGP(e.agp.st, tg, { a1c: e.labs.a1c, basalUkg: e.ukg });
    return h('div', { class: 'sv-gly' }, [
      h('h4', null, 'Rapport AGP · capteur de glucose, ' + e.agp.st.days + ' jours'),
      h('p', { class: 'sv-note' }, 'Cibles SFD 2025 (tableau II), ' + tg.label + '.'),
      Y.agpReport(e.agp.st, e.agp.days, tg, h),
      h('details', { class: 'sv-det sv-how' }, [h('summary', null, 'Comment lire un rapport AGP'), h('ol', { class: 'sv-keys' }, [
        h('li', null, 'Qualité des données : au moins 14 jours et 70 % de temps de capteur actif.'),
        h('li', null, 'Les hypoglycémies d\'abord (temps < 0,70 et < 0,54 g/L) : on les corrige avant d\'intensifier.'),
        h('li', null, 'Le temps dans la cible (TIR 0,70–1,80 g/L) et au-dessus : + 10 points de TIR ≈ − 0,8 % d\'HbA1c.'),
        h('li', null, 'GMI (glucose moyen converti en HbA1c) à confronter à l\'HbA1c ; variabilité (CV) ≤ 36 %.'),
        h('li', null, 'La courbe : médiane plate dans la zone verte, bandes étroites ; repérer les heures à problème (nuit, réveil, après quel repas), puis les profils quotidiens pour les causes (repas, activité, oublis).')
      ]), h('p', { class: 'sv-note' }, 'Czupryniak L et al. Diabetes Ther 2022;13:811 ; cibles : Battelino T et al. Diabetes Care 2019, reprises par la SFD 2025.')]),
      h('details', { class: 'sv-det sv-how' }, [h('summary', null, 'Proposition d\'interprétation'), h('dl', { class: 'sv-exam sv-qual' }, read.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)]))])
    ]);
  }

  // Lecture de l'ordonnance en cours au regard de la prise de position SFD 2025 (sans blocage, sauf
  // l'initiation de l'insuline, contrôlée à la prescription).
  function sfdCard() {
    const pt = G.pt, e = [...G.history].reverse().find((x) => !x.prescription);
    const nSev = pt.st.hypoSev;
    const A = SFD.advise({ c: G.cfg, rx: pt.rx, dfg: pt.st.dfg, a1c: e.labs.a1c != null ? e.labs.a1c : lastA1c(), W: pt.st.W, hypos: pt.st.hypo, sevHypo: nSev > 0, starts: G.starts, day: pt.day, ppr: G.ev.ppr != null, cgm: G.cgm, titr: G.titr, goal: G.goal, asg: G.asg, fpg: G.glyDays.length ? G.glyDays.slice(-7).reduce((x, dp) => x + dp.rdg.rev, 0) / Math.min(7, G.glyDays.length) : null });
    const n = A.items.filter((x) => x.lvl === 'stop' || x.lvl === 'warn').length;
    const icon = { stop: '⛔', warn: '⚠', tip: '→', ok: '✓' };
    return h('details', { class: 'sv-card sv-det sv-sfd' }, [
      h('summary', null, 'Lecture SFD 2025 de l\'ordonnance en cours' + (n ? ' · ' + n + ' point' + (n > 1 ? 's' : '') + ' à revoir' : '')),
      h('p', { class: 'sv-q' }, 'Cible d\'HbA1c : ≤ ' + fmt(A.target.max, 1) + ' %' + (A.target.floor ? ', en restant au-dessus de ' + fmt(A.target.floor, 1) + ' %' : '') + (A.target.low ? ' (voire ≤ 6,5 %)' : '') + '.'),
      h('p', { class: 'sv-note' }, A.target.why.join(' ; ') + ' (' + A.target.src + ').'),
      h('ul', { class: 'sv-sfd-l' }, A.items.map((x) => h('li', { class: 'sv-sfd-' + x.lvl }, [h('span', { class: 'sv-sfd-i', 'aria-hidden': 'true' }, icon[x.lvl]), ' ' + x.t + ' ', x.src ? h('span', { class: 'sv-src' }, '(' + (x.src.startsWith('HAS') ? '' : 'SFD 2025, ') + x.src + ')') : null]))),
      h('p', { class: 'sv-note' }, 'Darmon P et al. Prise de position de la SFD sur les stratégies d\'utilisation des traitements de l\'hyperglycémie dans le DT2 – 2025. Med Mal Metab 2025;19:630-662. Ouvrez cette lecture après avoir décidé : elle ne bloque rien, sauf l\'initiation de l\'insuline hors recommandations.')
    ]);
  }

  function chartCard() {
    return h('div', { class: 'sv-card' }, [
      h('div', { class: 'sv-card-head' }, [h('h3', null, 'Évolution'), h('label', { class: 'sv-check sv-small' }, [h('input', { type: 'checkbox', id: 'dtTruth', checked: G.truth, onchange: (e) => { G.truth = e.target.checked; render(); } }), ' Afficher la courbe réelle (entre les bilans)'])]),
      h('div', { class: 'sv-chartbox' }),
      h('p', { class: 'sv-note' }, 'Points : examens réalisés. Bande verte : cible d\'HbA1c individualisée (SFD 2025) ; glycémie à jeun 0,70–1,10 g/L.')
    ]);
  }

  // Petits multiples alignés sur le temps : HbA1c, glycémie à jeun, poids, puis les traitements (barres).
  function chart(box) {
    const el = (tag, a, par) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (par) par.appendChild(e); return e; };
    box.textContent = '';
    const pt = G.pt, log = pt.log;
    const W = Math.max(300, box.clientWidth || 600), L = 82, R = 14;
    const last = Math.max(90, pt.day + 14);
    const x = (d) => L + ((W - L - R) * d) / last;
    const drugs = [['met', 'Metformine', (p) => p.met > 0], ['su', 'Sulfamide', (p) => p.su > 0], ['glp', 'aGLP1', (p) => p.glp > 0], ['ins', 'Insuline', (p) => p.ins > 0]].filter(([, , f]) => log.some(f));
    const lanes = [
      { k: 'a1c', t: 'HbA1c (%)', min: 5, max: Math.max(10, ...log.map((p) => p.a1c)) + 0.5, band: [goalT().floor || 4, goalT().max], color: 'var(--t3)', truth: (p) => p.a1c },
      { k: 'fpg', t: 'Glycémie à jeun (g/L)', min: 0.4, max: Math.max(2.5, ...log.map((p) => p.mg)) + 0.2, band: [0.7, 1.1], color: 'var(--t4)', truth: (p) => p.fpg },
      { k: 'w', t: 'Poids (kg)', min: Math.min(...log.map((p) => p.w)) - 3, max: Math.max(...log.map((p) => p.w)) + 3, color: 'var(--tsh)', truth: (p) => p.w, all: true }
    ];
    const LH = 78, GAP = 30, top0 = 8;
    const H = top0 + lanes.length * (16 + LH + GAP) + (drugs.length ? 16 + drugs.length * 16 + GAP : 0) + 10;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'sv-chart', role: 'img', 'aria-label': 'Évolution de l\'HbA1c, de la glycémie à jeun, du poids et des traitements' }, box);
    let y = top0;
    const tip = document.getElementById('svTip');
    lanes.forEach((ln) => {
      const top = y + 16, bot = top + LH;
      const yv = (v) => bot - ((Math.max(ln.min, Math.min(ln.max, v)) - ln.min) / (ln.max - ln.min)) * LH;
      el('text', { x: L, y: y + 10, class: 'sv-ch-title' }, svg).textContent = ln.t;
      if (ln.band) el('rect', { x: L, y: yv(ln.band[1]), width: W - L - R, height: Math.max(0, yv(Math.max(ln.min, ln.band[0])) - yv(ln.band[1])), class: 'sv-ch-band' }, svg);
      [ln.min, (ln.min + ln.max) / 2, ln.max].forEach((t) => { el('line', { x1: L, x2: W - R, y1: yv(t), y2: yv(t), class: 'sv-ch-grid' }, svg); el('text', { x: L - 6, y: yv(t) + 4, class: 'sv-ch-tick', 'text-anchor': 'end' }, svg).textContent = fmt(t, ln.k === 'w' ? 0 : 1); });
      if (G.truth || ln.all) { let dd = ''; log.forEach((p, i) => { dd += (i ? 'L' : 'M') + x(p.day).toFixed(1) + ',' + yv(ln.truth(p)).toFixed(1); }); el('path', { d: dd, class: ln.all ? 'sv-ch-step' : 'sv-ch-true', style: 'stroke:' + ln.color }, svg); }
      if (!ln.all) G.visits.forEach((v) => {
        const val = v.labs[ln.k]; if (val == null) return;
        el('circle', { cx: x(v.day), cy: yv(val), r: 5, class: 'sv-ch-dot', style: 'fill:' + ln.color }, svg);
        const lab = dayLabel(v.day) + ' · ' + (ln.k === 'a1c' ? 'HbA1c ' + fmt(val, 1) + ' %' : 'GAJ ' + fmt(val, 2) + ' g/L');
        const hit = el('circle', { cx: x(v.day), cy: yv(val), r: 13, class: 'sv-ch-hit', tabindex: 0, 'aria-label': lab }, svg);
        const show = () => { tip.textContent = lab; tip.hidden = false; const r = hit.getBoundingClientRect(); tip.style.left = r.left + r.width / 2 + 'px'; tip.style.top = r.top + window.scrollY + 5 + 'px'; };
        hit.addEventListener('pointerenter', show); hit.addEventListener('focus', show); hit.addEventListener('pointerleave', () => (tip.hidden = true)); hit.addEventListener('blur', () => (tip.hidden = true));
      });
      y = bot + GAP;
    });
    if (drugs.length) {
      el('text', { x: L, y: y + 10, class: 'sv-ch-title' }, svg).textContent = 'Traitements';
      drugs.forEach(([k, name, f], i) => {
        const yy = y + 16 + i * 16;
        el('text', { x: L - 6, y: yy + 9, class: 'sv-ch-tick', 'text-anchor': 'end' }, svg).textContent = name;
        let start = null;
        log.forEach((p, j) => { const on = f(p); if (on && start == null) start = p.day; if ((!on || j === log.length - 1) && start != null) { el('rect', { x: x(start), y: yy, width: Math.max(2, x(p.day) - x(start)), height: 11, rx: 3, class: 'sv-ch-bar' }, svg); start = null; } });
      });
      y += 16 + drugs.length * 16 + GAP;
    }
    const step = last > 700 ? 182 : last > 300 ? 91 : 30;
    for (let d = 0; d <= last; d += step) el('text', { x: x(d), y: H - 2, class: 'sv-ch-tick', 'text-anchor': 'middle' }, svg).textContent = 'M' + Math.round(d / 30.4);
    el('line', { x1: x(pt.day), x2: x(pt.day), y1: top0 + 14, y2: H - 14, class: 'sv-ch-now' }, svg);
  }

  function historyCard() {
    const rows = G.history.filter((x) => !x.prescription);
    const c = (v, f) => (v == null ? '—' : f(v));
    return h('div', { class: 'sv-card' }, [
      h('h3', null, 'Bilans successifs'),
      h('div', { class: 'sv-scroll' }, h('table', { class: 'sv-res sv-hist-t' }, [
        h('thead', null, h('tr', null, ['Date', 'Traitement', 'HbA1c', 'GAJ', 'DFG', 'Poids', 'Autres'].map((t) => h('th', null, t)))),
        h('tbody', null, rows.map((e) => h('tr', null, [h('td', { class: 'sv-nowrap' }, dayLabel(e.day)), h('td', null, e.rx), h('td', { class: 'sv-v' }, c(e.labs.a1c, (v) => fmt(v, 1) + ' %')), h('td', { class: 'sv-v' }, c(e.labs.fpg, (v) => fmt(v, 2))), h('td', { class: 'sv-v' }, c(e.labs.dfg, (v) => fmt(v, 0))), h('td', { class: 'sv-v' }, fmt(e.w, 1)), h('td', { class: 'sv-wrap' }, (e.event ? '⚠ ' : '') + (e.q.map(([k, v]) => k + ' : ' + v).join(' ; ') || '—'))])))
      ]))
    ]);
  }

  // Facteurs prédictifs de réponse (complément, littérature) : rappel général, sans jugement sur la prescription.
  function factorsCard() {
    const F = [
      ['HbA1c initiale', 'Plus elle est haute, plus la baisse absolue est grande, quelle que soit la classe.'],
      ['Réserve insulinique (peptide C, durée, IMC bas, anti-GAD)', 'Conditionne sulfamides, iDPP4 et aGLP1 ; peptide C bas ou anti-GAD positifs : réponse faible, insuline précoce (LADA). Le déclin des cellules β explique l\'échec secondaire des sulfamides.'],
      ['Insulinorésistance (IMC, tour de taille)', 'Besoins en insuline élevés ; bénéfice de la perte de poids (aGLP1, mesures hygiéno-diététiques, iSGLT2).'],
      ['DFG', 'Metformine : dose réduite entre 30 et 60, contre-indiquée sous 30 (item 247). iSGLT2 : effet glycémique faible sous 45, bénéfice rénal et cardiaque conservé jusqu\'à 25. Sulfamides : hypoglycémies plus fréquentes.'],
      ['Origine d\'Asie de l\'Est', 'Meilleure réponse aux incrétines (iDPP4, aGLP1).'],
      ['Sous-type monogénique', 'MODY HNF1A : très sensible aux sulfamides à faible dose ; MODY GCK : glycémie de consigne, pas de traitement.'],
      ['Âge, insuffisance rénale, repas irréguliers', 'Risque d\'hypoglycémie sous sulfamide ou insuline.'],
      ['Tolérance et observance', 'Metformine et aGLP1 : monter les doses progressivement ; oublis : HbA1c qui ne baisse pas malgré l\'escalade.'],
      ['Comorbidités', 'Insuffisance cardiaque, maladie rénale : iSGLT2 ; maladie cardiovasculaire avérée : aGLP1 (bénéfice CV) ; rétinopathie sévère : baisse prudente de l\'HbA1c ; antécédent de pancréatite ou de CMT : prudence avec les incrétines.'],
      ['Insulinopénie, régime cétogène, jeûne, chirurgie', 'Risque d\'acidocétose euglycémique sous iSGLT2.']
    ];
    return h('details', { class: 'sv-card sv-det' }, [h('summary', null, 'Facteurs prédictifs de réponse'), h('dl', { class: 'sv-exam sv-qual' }, F.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)])), h('p', { class: 'sv-note' }, 'Complément (littérature), sauf mention de l\'item 247.')]);
  }

  function refCard() {
    const R = [
      { t: 'DT2 : prise en charge multifactorielle (glycémie, tabac, lipides, PA) ; cible d\'HbA1c individualisée (durée, espérance de vie, comorbidités, risque d\'hypoglycémie, motivation).', src: 'item 247 · LiSA p. 10', rang: 'A' },
      { t: 'Metformine : baisse la production hépatique de glucose ; troubles digestifs ; contre-indiquée si DFG < 30 et dans les situations à risque d\'acidose lactique.', src: 'item 247 · LiSA p. 10', rang: 'A' },
      { t: 'Sulfamides, glinides : insulinosécréteurs ; hypoglycémies, prise de poids ; glinides possibles même en insuffisance rénale terminale.', src: 'item 247 · LiSA p. 10', rang: 'A' },
      { t: 'iDPP4 : neutres sur le poids, pas d\'hypoglycémie ; pemphigoïde bulleuse ; dose adaptée à la fonction rénale.', src: 'item 247 · LiSA p. 10', rang: 'A' },
      { t: 'aGLP1 injectables : satiété, ralentissement de la vidange gastrique, perte de poids ; effets digestifs ; bénéfice cardiovasculaire.', src: 'item 247 · LiSA p. 10-11', rang: 'A' },
      { t: 'iSGLT2 : glucosurie, natriurèse ; bénéfice dans l\'insuffisance cardiaque et la maladie rénale chronique ; perte de poids, baisse de la PA ; infections génitales, déshydratation, acidocétose ; jusqu\'à un DFG de 25.', src: 'item 247 · LiSA p. 11', rang: 'A' },
      { t: 'Hypoglycémie : < 0,70 g/L ; menaçante < 0,54 g/L ; sévère = nécessite un tiers. Conscient : 15 g de sucre ; inconscient : rien per os, glucagon IM/SC (contre-indiqué sous sulfamide), G30 % IV.', src: 'item 247 · LiSA p. 7-8, 11', rang: 'A' },
      { t: 'Acidocétose : cétonémie > 3 mmol/L, glycémie > 2,50 g/L, HCO₃⁻ < 18 et/ou pH < 7,30 ; coma hyperosmolaire : glycémie > 6 g/L, osmolalité > 320 mOsm/kg, pH > 7,30.', src: 'item 247 · LiSA p. 6-7', rang: 'A' },
      { t: 'Néphroprotection : microalbuminurie → HbA1c < 7 %, PA < 140/85, IEC ou ARA2 ; DFG < 30 : HbA1c < 8 %, insuline, répaglinide, iDPP4 adaptés, certains aGLP1 ; metformine adaptée entre 30 et 60 ; éviter AINS et produits de contraste iodés.', src: 'item 247 · LiSA p. 12', rang: 'B' },
      { t: 'Rétinopathie : HbA1c < 7 %, avec baisse prudente dès la forme préproliférante ; panphotocoagulation dès la RDNP sévère.', src: 'item 247 · LiSA p. 12', rang: 'B' },
      { t: 'Avis diabétologique si HbA1c > 10 %, schéma intensif, complication, plaie du pied.', src: 'item 247 · LiSA p. 14', rang: 'B' },
      { t: 'Obésité : perte progressive de 5 à 10 % du poids sur 6 à 12 mois ; pas de régime restrictif standard ; activité physique ≥ 2 h 30/semaine.', src: 'item 253 · LiSA p. 5-6 ; SFE p. 16-19', rang: 'A' }
    ];
    return h('details', { class: 'sv-card sv-det' }, [h('summary', null, 'Référentiel (SFD 2025, item 247)'),
      h('h4', null, 'Prise de position SFD 2025'),
      h('dl', { class: 'sv-exam sv-qual' }, SFD.REF.flatMap(([k, v, src]) => [h('dt', null, k), h('dd', null, [v + ' ', h('span', { class: 'sv-src' }, '(' + src + ')')])])),
      h('h4', null, 'Item EDN 247'),
      h('ul', { class: 'sv-keys sv-refs' }, R.map((k) => h('li', null, [rangBadge(k.rang), ' ' + k.t, h('span', { class: 'sv-src' }, ' · ' + k.src)]))), h('p', { class: 'sv-note' }, 'Darmon P et al. Med Mal Metab 2025;19:630-662 ; fiche LiSA de l\'item 247, rangs de la grille d\'objectifs.')]);
  }

  // Référentiel d'effets publiés, rejoués à la demande par le modèle (js/simu/dt2-ref.js).
  function effectsCard() {
    const REF = S.dt2ref || [];
    const unit = { dW: ' kg', slope: ' %/pt', abs: ' %' };
    const fmtV = (t, v) => (v > 0 && t.metric !== 'abs' ? '+' : '') + fmt(v, 2) + (unit[t.metric] || ' %');
    const cells = [];
    const rows = REF.map((r) => {
      const c = h('td', { class: 'sv-mv' }, r.calib ? '…' : '—');
      if (r.calib) cells.push([r, c]);
      return h('tr', null, [
        h('td', null, [h('b', null, r.cls), ' · ' + r.situation]),
        h('td', null, [r.effet + ' ', h('a', { href: r.url, target: '_blank', rel: 'noopener', class: 'sv-src' }, r.source), r.verif === 'secondaire' ? h('span', { class: 'sv-src' }, ' (chiffre de seconde main)') : null]),
        c
      ]);
    });
    let done = false;
    const det = h('details', { class: 'sv-card sv-det', ontoggle: () => {
      if (!det.open || done) return;
      done = true;
      cells.forEach(([r, c]) => { const v = D.replay(r.calib).v, ok = Math.abs(v - r.calib.target) <= r.calib.tol; c.textContent = fmtV(r.calib, v); c.title = 'repère ' + fmtV(r.calib, r.calib.target) + ' ± ' + r.calib.tol; c.className = 'sv-mv' + (ok ? '' : ' hi'); });
    } }, [
      h('summary', null, 'Référentiel d\'effets (littérature)'),
      h('p', { class: 'sv-note' }, 'Effets publiés de chaque traitement et de chaque situation, et ce que le modèle produit quand il rejoue l\'essai (patient théorique, observance bonne, différence avec un bras témoin sans changement sauf mention). Ces repères ont servi à caler le modèle (node tools/calib-dt2.js).'),
      h('div', { class: 'sv-scroll' }, h('table', { class: 'sv-res sv-reftab' }, [h('thead', null, h('tr', null, [h('th', null, 'Traitement · situation'), h('th', null, 'Effet publié'), h('th', null, 'Modèle')])), h('tbody', null, rows)]))
    ]);
    return det;
  }

  function revealCard() {
    const pt = G.pt, p = pt.par;
    const items = [
      'Réserve insulinique : ' + Math.round(D.beta(pt) * 100) + ' % (au départ ' + Math.round(p.B0 * 100) + ' %), déclin de ' + Math.round(p.rate * 100) + ' % par an.',
      'Sensibilité à l\'insuline : ' + Math.round(p.Si0 * 100) + ' % de la normale (au poids initial).',
      'Observance : ' + Math.round(p.adh * 100) + ' % ; adhésion aux mesures hygiéno-diététiques : ' + Math.round(p.adhLife * 100) + ' %.',
      'Réponse individuelle : metformine × ' + fmt(p.metResp, 2) + ', aGLP1 × ' + fmt(p.glpResp, 2) + ' (incrétines × ' + fmt(p.incr, 1) + ' selon l\'origine)' + (p.suBoost > 1 ? ', sulfamides × ' + p.suBoost + ' (MODY HNF1A)' : '') + '.',
      'Sensibilité digestive à la metformine : ' + Math.round(p.giSens * 100) + ' %.'
    ];
    if (p.siFit) items.push('Insulinorésistance plus forte que ne le laisse prévoir son profil (sensibilité × ' + fmt(p.siFit, 2) + ') : c\'est ce qu\'il faut pour expliquer une HbA1c de ' + fmt(G.cfg.a1c, 1) + ' % sous ' + ((G.cfg.rx0 && G.cfg.rx0.basal) || 0) + ' U d\'insuline.');
    if (p.gck) items.push('MODY GCK : glycémie de consigne autour de 1,30 g/L, insensible aux antidiabétiques oraux.');
    return h('details', { class: 'sv-card sv-det' }, [h('summary', null, 'Révéler le patient'), h('ul', { class: 'sv-keys' }, items.map((t) => h('li', null, t)))]);
  }

  S.dt2ui = { setup };
})();
