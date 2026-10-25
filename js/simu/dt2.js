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
  // Insulinosécréteur : molécule et dose (dose stockée en équivalent gliclazide LM, cf. D.SUT).
  const suLabel = (rx) => { const T = D.suType(rx), v = rx.su / T.k; return T.short + ' ' + String(Math.round(v * 10) / 10).replace('.', ',') + ' mg/j' + (T.meal ? ' (en 3 prises, avant les repas)' : ''); };
  function suPick(id, rx, onChange) {
    const T = D.suType(rx), opts = [[0, 'Aucun']].concat(T.doses.map((x) => [x * T.k, String(x).replace('.', ',') + ' ' + T.unit + (T.meal ? ' (' + String(x / 3).replace('.', ',') + ' mg × 3)' : '')]));
    const cur = opts.reduce((a, o) => (Math.abs(o[0] - (rx.su || 0)) < Math.abs(a[0] - (rx.su || 0)) ? o : a))[0];
    return h('div', { class: 'sv-inline' }, [
      h('select', { id: id + 'T', 'aria-label': 'Molécule', onchange: (e) => { const was = rx.su || 0; onChange(e.target.value, was ? Math.min(120, was) : 0); } }, Object.entries(D.SUT).map(([k, v]) => h('option', { value: k, selected: (rx.suType || 'glic') === k }, v.name))),
      h('select', { id, 'aria-label': 'Dose', onchange: (e) => onChange(rx.suType || 'glic', +e.target.value) }, opts.map(([v, t]) => h('option', { value: v, selected: v === cur }, t)))]);
  }
  const DPP4 = [0, 25, 50, 100];
  const ACARB = [0, 150, 300];
  const Y = S.glyco, SFD = S.sfd, H = S.dt2hosp;
  // Type de la prochaine rencontre.
  const MODES = [['consult', '🩺', 'Consultation'], ['tele', '📱', 'Téléconsultation'], ['hosp', '🏥', 'Hospitalisation']];
  // Basale totale : injection ou débit de base de la pompe.
  const bas = (rx) => (rx.basal || 0) + (rx.pump || 0);
  const DEVICES = [['inj', 'Stylos (multi-injections)'], ['pump', 'Pompe à insuline'], ['loop', 'Boucle fermée hybride (pompe + capteur)']];
  const MODE_OF = Object.fromEntries(MODES.map(([k, i, t]) => [k, { icon: i, label: t }]));
  const TESTS = [['a1c', 'HbA1c'], ['fpg', 'Glycémie à jeun'], ['carnet', 'Carnet glycémique'], ['agp', 'Rapport AGP (capteur)'], ['creat', 'Créatinine (DFG)'], ['alb', 'Albuminurie'], ['cpep', 'Peptide C'], ['gad', 'Anti-GAD'], ['cetone', 'Cétonémie'], ['lipase', 'Lipase'], ['fo', 'Fond d\'œil']];
  // Situations de départ : les étapes des arbres de la prise de position SFD 2025 (doses selon le poids).
  const STAGES = [
    { g: 'Au diagnostic', id: 'diag', label: 'Diabète découvert, sans traitement', a1c: 8.5, dur: 0, rx: () => null },
    { g: 'Monothérapie', id: 'mono', label: 'Metformine', a1c: 7.8, dur: 4, rx: () => ({ met: 2000 }) },
    { g: 'Bithérapie', id: 'bi_sglt2', label: 'Metformine + iSGLT2', a1c: 7.9, dur: 6, rx: () => ({ met: 2000, sglt2: 'empa10' }) },
    { g: 'Bithérapie', id: 'bi_glp', label: 'Metformine + aGLP1', a1c: 7.8, dur: 6, rx: () => ({ met: 2000, glp: 'sema', glpDose: 1 }) },
    { g: 'Bithérapie', id: 'bi_dpp4', label: 'Metformine + iDPP4', a1c: 8.0, dur: 6, rx: () => ({ met: 2000, dpp4: 100 }) },
    { g: 'Bithérapie', id: 'bi_su', label: 'Metformine + sulfamide', a1c: 8.2, dur: 8, rx: () => ({ met: 2000, su: 60 }) },
    { g: 'Trithérapie', id: 'tri_glp', label: 'Metformine + aGLP1 + iSGLT2', a1c: 8.1, dur: 10, rx: () => ({ met: 2000, glp: 'sema', glpDose: 1, sglt2: 'empa10' }) },
    { g: 'Trithérapie', id: 'tri_oral', label: 'Metformine + iSGLT2 + iDPP4', a1c: 8.4, dur: 10, rx: () => ({ met: 2000, sglt2: 'empa10', dpp4: 100 }) },
    { g: 'Trithérapie', id: 'tri_su', label: 'Metformine + iDPP4 + sulfamide', a1c: 9.2, dur: 12, rx: () => ({ met: 2000, dpp4: 100, su: 120 }) },
    { g: 'Insuline', id: 'basal', label: 'Insuline basale + metformine', a1c: 8.6, dur: 14, rx: (W) => ({ met: 2000, basal: Math.round(0.35 * W) }) },
    { g: 'Insuline', id: 'basal_glp', label: 'Insuline basale + metformine + aGLP1', a1c: 8.3, dur: 15, rx: (W) => ({ met: 2000, basal: Math.round(0.4 * W), glp: 'sema', glpDose: 1 }) },
    { g: 'Insuline', id: 'basal_over', label: 'Basale à 0,7 U/kg (sur-basalisation)', a1c: 8.6, dur: 16, rx: (W) => ({ met: 2000, basal: Math.round(0.7 * W) }) },
    { g: 'Insuline', id: 'basal_plus', label: 'Basal-plus (basale + 1 bolus au déjeuner)', a1c: 8.4, dur: 17, rx: (W) => ({ met: 2000, basal: Math.round(0.45 * W), rapidM: [0, Math.round(0.08 * W), 0], rapid: Math.round(0.08 * W) }) },
    { g: 'Insuline', id: 'basal_bolus', label: 'Basal-bolus (basale + 3 bolus)', a1c: 8.5, dur: 18, rx: (W) => { const m = [Math.round(0.08 * W), Math.round(0.12 * W), Math.round(0.1 * W)]; return { met: 2000, basal: Math.round(0.4 * W), rapidM: m, rapid: m[0] + m[1] + m[2] }; } }
  ];
  // Diabètes atypiques : patients types.
  const PRESETS = [
    { label: 'LADA, 42 ans', cfg: { profile: 'lada', sex: 'F', age: 42, weight: 62, height: 165, a1c: 8.4, duration: 1 } },
    { label: 'Origine asiatique, IMC 24', cfg: { profile: 'mard', sex: 'F', age: 60, weight: 60, height: 158, a1c: 8, duration: 3, ethnic: 'asie' } },
    { label: 'MODY 3 (HNF1A), 24 ans', cfg: { profile: 'hnf1a', sex: 'F', age: 24, weight: 58, height: 166, a1c: 8.5, duration: 1 } },
    { label: 'MODY 2 (GCK), 30 ans', cfg: { profile: 'gck', sex: 'M', age: 30, weight: 72, height: 180, a1c: 6.4, duration: 5 } },
    { label: 'DT2 insulinopénique, mince, HbA1c 10', cfg: { profile: 'sidd', sex: 'M', age: 52, weight: 64, height: 175, a1c: 10, duration: 6 } }
  ];
  const WORK = { jour: 'De jour, horaires réguliers', nuit: 'De nuit, en poste fixe', '2x8': 'En 2 × 8 alternés (matin / après-midi, par semaine)', '3x8': 'En 3 × 8 alternés (matin / après-midi / nuit, par semaine)' };
  const ADH = { bonne: 'Bonne', moyenne: 'Oublis fréquents', peur: 'Peur de l\'hypoglycémie', detresse: 'Détresse psychologique, syndrome dépressif', cachee: 'Inconnue (cachée)' };
  const BASE = { profile: 'sird', sex: 'M', age: 56, weight: 98, height: 172, a1c: 8.5, duration: 1, dfg: 85, alb: 'normo', ethnic: 'eur', sbp: 142, retino: 'none', hfail: false, cvd: false, hcvr: false, masld: false, severe: false, driver: false, geria: 'bonne', panc: false, mtc: false, myco: false, irregular: false, lowcarb: false, adh: 'bonne', work: 'jour', stage: 'diag', mode: 'decouverte', variab: 'moyen', rx0: null, act0: 30, soda0: 1, snack0: 'modere', motiv: 'moyenne' };
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

  const INS0 = (r) => !!r && ((r.basal || 0) + (r.rapidM || [0, 0, 0]).reduce((a, x) => a + x, 0) + (r.rapid || 0)) > 0;

  // Mode entraînement : aides masquées jusqu'à la fin ; correction de chaque décision au bilan suivant.
  const TRAIN = () => G && G.cfg.mode === 'entrainement' && !G.trainDone;

  /* ---------- Configuration ---------- */
  function setup(keep) {
    const y0 = window.scrollY;
    G = null;
    statusEl.hidden = true;
    main.textContent = '';
    main.className = 'sv-main sv-home';
    const field = (label, input, id) => h('div', { class: 'sv-field' }, [h('label', { for: id }, label), input]);
    const num = (id, val, step, min, max, on) => h('input', { type: 'number', id, value: val, step, min, max, inputmode: 'decimal', class: 'sv-num', oninput: (e) => on(parseFloat(String(e.target.value).replace(',', '.'))) });
    const sel = (id, val, opts, on) => h('select', { id, onchange: (e) => on(e.target.value) }, opts.map(([k, t]) => h('option', { value: k, selected: String(val) === String(k) }, t)));
    const chk = (id, key, label) => h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id, checked: cfg[key], onchange: (e) => { cfg[key] = e.target.checked; } }), ' ' + label]);
    const bmi = cfg.weight / Math.pow(cfg.height / 100, 2);
    // Curseur : valeur affichée à côté du libellé, mise à jour en direct ; rerender au relâchement si besoin.
    const slider = (id, label, key, min, max, step, unit, d, after) => {
      const out = h('output', { for: id, class: 'sv-range-v' }, fmt(cfg[key], d) + (unit ? ' ' + unit : ''));
      return h('div', { class: 'sv-field sv-slider' }, [h('label', { for: id }, [label + ' : ', out]),
        h('input', { type: 'range', id, class: 'sv-range', min, max, step, value: cfg[key], oninput: (e) => { cfg[key] = parseFloat(e.target.value); out.textContent = fmt(cfg[key], d) + (unit ? ' ' + unit : ''); const b2 = document.getElementById('dtBmi'); if (b2) b2.textContent = 'IMC : ' + fmt(cfg.weight / Math.pow(cfg.height / 100, 2), 1) + ' kg/m².'; }, onchange: after ? () => after() : null })]);
    };
    // Une HbA1c réglée à la main est verrouillée : changer de situation de départ ne l'écrase plus.
    const pickStage = (st) => { cfg.stage = st.id; if (!cfg.a1cLocked) cfg.a1c = st.a1c; cfg.duration = st.dur; cfg.rx0 = st.rx(cfg.weight); if (!INS0(cfg.rx0)) cfg.cgm0 = false; setup(true); };
    const groups = [...new Set(STAGES.map((x) => x.g))];
    main.append(
      h('section', { class: 'sv-intro' }, [
        h('p', { class: 'sv-eyebrow' }, 'Diabète de type 2 · mode thérapeutique'),
        h('h1', null, 'Choisissez, dosez, attendez l\'HbA1c.'),
        h('p', { class: 'sv-lead' }, 'Créez un patient avec ses facteurs prédictifs de réponse (réserve insulinique, insulinorésistance, fonction rénale, origine, sous-type, observance, comorbidités), prescrivez librement, choisissez la date du bilan : HbA1c, glycémies, poids, hypoglycémies et événements indésirables découlent de vos choix. Aucune correction.')
      ]),
      h('section', { class: 'sv-card sv-setup' }, [
        h('h3', null, 'Situation de départ (arbres de la SFD 2025)'),
        h('div', { class: 'sv-stages' }, groups.map((gname) => h('div', { class: 'sv-stage-g' }, [h('p', { class: 'sv-stage-h' }, gname), h('div', { class: 'sv-chips' }, STAGES.filter((x) => x.g === gname).map((st) => h('button', { type: 'button', class: 'sv-chip' + (cfg.stage === st.id ? ' on' : ''), 'aria-pressed': String(cfg.stage === st.id), onclick: () => pickStage(st) }, st.label)))]))),
        h('p', { class: 'sv-note' }, 'Fixe le traitement en cours (doses selon le poids), une HbA1c et une ancienneté typiques, modifiables ci-dessous. Les comorbidités (insuffisance cardiaque, maladie rénale, âge…) se règlent plus bas.'),
        h('h3', null, 'Diabètes atypiques'),
        h('div', { class: 'sv-chips' }, PRESETS.map((p) => h('button', { type: 'button', class: 'sv-chip', onclick: () => { const keep = cfg.a1cLocked ? { a1c: cfg.a1c, a1cLocked: true } : {}; cfg = Object.assign({}, BASE, { variab: cfg.variab }, p.cfg, { stage: null }, keep); setup(true); } }, p.label))),
        h('h3', null, 'Le patient'),
        h('div', { class: 'sv-form' }, [
          field('Profil', sel('dtProf', cfg.profile, Object.entries(D.PROFILES).map(([k, v]) => [k, v.label]), (v) => { cfg.profile = v; setup(); }), 'dtProf'),
          field('Sexe', sel('dtSex', cfg.sex, [['F', 'Femme'], ['M', 'Homme']], (v) => { cfg.sex = v; }), 'dtSex'),
          slider('dtAge', 'Âge', 'age', 18, 95, 1, 'ans', 0, () => setup(true)),
          slider('dtW', 'Poids', 'weight', 40, 200, 1, 'kg', 0, () => { const st = STAGES.find((x) => x.id === cfg.stage); if (st && st.rx(cfg.weight) && (st.rx(cfg.weight).basal || 0) > 0) { cfg.rx0 = st.rx(cfg.weight); setup(true); } }),
          slider('dtH', 'Taille', 'height', 140, 205, 1, 'cm', 0),
          slider('dtA1c', 'HbA1c actuelle' + (cfg.a1cLocked ? ' 🔒' : ''), 'a1c', 6, 14, 0.1, '%', 1, () => { if (!cfg.a1cLocked) { cfg.a1cLocked = true; setup(true); } }),
          cfg.a1cLocked ? h('p', { class: 'sv-note', id: 'dtA1cLock' }, ['HbA1c verrouillée : c\'est celle du bilan initial, quoi que vous changiez. ', h('button', { type: 'button', class: 'sv-linkbtn', onclick: () => { cfg.a1cLocked = false; setup(true); } }, 'Déverrouiller')]) : null,
          slider('dtDur', 'Ancienneté du diabète', 'duration', 0, 40, 1, 'ans', 0),
          slider('dtDfg', 'DFG', 'dfg', 10, 130, 1, 'mL/min/1,73 m²', 0),
          slider('dtSbp', 'PA systolique', 'sbp', 90, 200, 1, 'mmHg', 0),
          field('Albuminurie', sel('dtAlb', cfg.alb, Object.entries(D.ALB).map(([k, v]) => [k, v.label]), (v) => { cfg.alb = v; }), 'dtAlb'),
          field('Origine', sel('dtEth', cfg.ethnic, Object.entries(D.ETHNIC).map(([k, v]) => [k, v.label]), (v) => { cfg.ethnic = v; }), 'dtEth'),
          field('Rétinopathie', sel('dtRet', cfg.retino, Object.entries(D.RETINO), (v) => { cfg.retino = v; }), 'dtRet'),
          cfg.age >= 75 ? field('Statut gériatrique (≥ 75 ans)', sel('dtGer', cfg.geria, [['bonne', 'En bonne santé, autonome'], ['fragile', 'Fragile'], ['dependant', 'Dépendant(e), santé très altérée']], (v) => { cfg.geria = v; }), 'dtGer') : null,
          field('Rythme de travail', sel('dtWork', cfg.work, Object.entries(WORK), (v) => { cfg.work = v; }), 'dtWork'),
          field('Observance et situation psychologique', sel('dtAdh', cfg.adh, Object.entries(ADH), (v) => { cfg.adh = v; }), 'dtAdh'),
          field('Mode', sel('dtMode', cfg.mode || 'decouverte', [['decouverte', 'Découverte (aides visibles)'], ['entrainement', 'Entraînement (internes : aides masquées, correction après chaque décision)']], (v) => { cfg.mode = v; }), 'dtMode'),
          field('Variabilité', sel('dtVar', cfg.variab, [['moyen', 'Patient moyen (reproductible)'], ['reel', 'Patient réel (réponses cachées)']], (v) => { cfg.variab = v; }), 'dtVar')
        ]),
        h('p', { class: 'sv-note', id: 'dtBmi' }, 'IMC : ' + fmt(bmi, 1) + ' kg/m².'),
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
            field('Insulinosécréteur', suPick('dtR0su', r, (t, v) => { setR('suType', t); setR('su', v); setup(true); }), 'dtR0su'),
            field('Sitagliptine', sel('dtR0dpp', r.dpp4 || 0, DPP4.map((x) => [x, x ? x + ' mg/j' : 'Aucune']), (v) => setR('dpp4', +v)), 'dtR0dpp'),
            field('Agoniste du GLP-1', h('div', { class: 'sv-inline' }, [
              sel('dtR0glp', r.glp || 'none', Object.entries(D.GLP1).map(([k, v]) => [k, v.name]), (v) => { setR('glp', v); setR('glpDose', v === 'none' ? 0 : D.GLP1[v].doses[D.GLP1[v].doses.length - 2]); setup(); }),
              Gp.doses.length ? sel('dtR0glpDose', r.glpDose, Gp.doses.map((x) => [x, String(x).replace('.', ',') + ' ' + Gp.unit]), (v) => setR('glpDose', +v)) : null
            ]), 'dtR0glp'),
            field('iSGLT2', sel('dtR0sglt', r.sglt2 || 'none', Object.entries(D.SGLT2), (v) => setR('sglt2', v)), 'dtR0sglt'),
            field('Insuline basale (U/j)', num('dtR0bas', r.basal || 0, 1, 0, 300, (v) => setR('basal', Math.max(0, Math.round(v) || 0))), 'dtR0bas'),
            field('Bolus (petit-déj. / déj. / dîner, U)', h('div', { class: 'sv-inline' }, [0, 1, 2].map((m) => num('dtR0bol' + m, (r.rapidM || [0, 0, 0])[m], 1, 0, 100, (v) => { const rm = (cfg.rx0 && cfg.rx0.rapidM ? cfg.rx0.rapidM : [0, 0, 0]).slice(); rm[m] = Math.max(0, Math.round(v) || 0); setR('rapidM', rm); setR('rapid', rm[0] + rm[1] + rm[2]); }))), 'dtR0bol0')
          ];
        })()),
        h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'dtCgm0', checked: !!cfg.cgm0 && INS0(cfg.rx0), disabled: !INS0(cfg.rx0), onchange: (e) => { cfg.cgm0 = e.target.checked; } }), ' Capteur de glucose déjà posé' + (INS0(cfg.rx0) ? ' (rapport AGP dès le bilan initial)' : ' (seulement sous insuline : non remboursé sinon)')]),
        h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: begin }, 'Voir le patient →'))
      ]),
      h('p', { class: 'sv-disc' }, 'Modèle pédagogique simplifié : effets et délais illustratifs (HbA1c jugée à 3 mois, demi-vie de l\'HbA1c ≈ 1 mois) ; ne remplace ni le jugement clinique ni les recommandations. Repères : prise de position SFD 2025 sur les traitements de l\'hyperglycémie, item EDN 247 (fiche LiSA), protocole d\'adaptation des doses d\'insuline du service ; effets des traitements : référentiel de la littérature.')
    );
    window.scrollTo(0, keep ? y0 : 0);
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
      draft: Object.assign({}, r0, { metProg: true, wait: 12, unit: 'sem', tests: new Set(['a1c', 'fpg']), ppr: false, device: 'inj', mode: 'consult', hosp: Object.assign({}, H.DEFAULTS) })
    };
    G.titr.obj = JSON.parse(JSON.stringify(Y.PROTO[G.titr.prof])); G.titr.bolusCtl = 'next';
    // Capteur déjà en place : surveillance par le capteur dès le départ, indication acquise, AGP au bilan initial.
    if (c.cgm0 && onIns) { G.cgm = true; G.asg = '0'; G.cgmStart = -15; G.cgmAcquired = true; }
    G.draft.titr = JSON.parse(JSON.stringify(G.titr)); G.draft.cgm = G.cgm; G.draft.asg = G.asg; G.draft.goal = null;
    // Quatorze jours de glycémies avant la première consultation (carnet, capteur).
    for (let k = 14; k > 0; k--) { pt.day = -k; recordDay(); }
    pt.day = 0;
    doLabs(new Set(['a1c', 'fpg', 'creat'].concat(G.cgm ? ['agp'] : [])), 'Bilan initial');
    render();
  }

  // Titration des aGLP1 et du tirzépatide entre les consultations : un palier par intervalle (4 semaines ;
  // 1 semaine pour le liraglutide) jusqu'à la dose cible ; nausées possibles à chaque palier (≈ 15 %, patient réel).
  function glpStep() {
    const P = G.glpUp, pt = G.pt, rx = pt.rx, ev = G.ev;
    if (!P || rx.glp !== P.glp || !pt.take.glp) return;
    const Gp = D.GLP1[rx.glp], i = Gp.doses.indexOf(rx.glpDose), it = Gp.doses.indexOf(P.target);
    if (i < 0 || i >= it || pt.day - ev.lastGlpChange < Gp.step) return;
    const from = rx.glpDose;
    rx.glpDose = Gp.doses[i + 1]; ev.lastGlpChange = pt.day;
    if (G.cfg.variab === 'reel' && Math.random() < 0.15) ev.glpGI = { day: pt.day + 3, severe: false, fired: false };
    (G.glpLog = G.glpLog || []).push({ day: pt.day, from, to: rx.glpDose });
    if (rx.glpDose === P.target) G.glpUp = null;
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
    const dp = Y.makeDay(pt, D, { seed: (G.seed + pt.day * 7919) >>> 0, irregular: G.cfg.irregular || G.cfg.adh === 'moyenne' || G.cfg.adh === 'detresse', work: G.cfg.work, newHypo, newSev });
    // Peur de l'hypoglycémie : après un malaise, collations de sécurité pendant deux semaines.
    if (pt.par.fear && (newHypo > 0 || dp.native > 0)) pt.st.fearUntil = pt.day + 14;
    pt.st.hypo += dp.native;
    G.lastH = pt.st.hypo; G.lastS = pt.st.hypoSev;
    const rdg = Y.readings(dp);
    dp.rdg = rdg;
    if (titrate && G.titr.who !== 'none' && (bas(pt.rx) > 0 || pt.rx.rapid > 0)) {
      const follow = G.cfg.variab !== 'reel' || G.titr.who === 'ide' || Math.random() < 0.85;
      const before = { b: bas(pt.rx), m: pt.rx.rapidM.slice(), seg: pt.rx.pumpSeg ? pt.rx.pumpSeg.slice() : null, ratio: pt.rx.ratio };
      // Peur de l'hypoglycémie ou détresse : le patient ne fait qu'une partie des hausses prévues (pas l'IDE).
      const rr = Y.rng((G.seed ^ (pt.day * 2654435761)) >>> 0);
      const prot = Object.assign({ cgm: G.cgm, basalMax: pt.rx.pump > 0 ? null : Math.round(0.5 * pt.st.W) }, G.titr.who === 'ide' ? G.titr : Object.assign({}, G.titr, pt.par.fear ? { upProb: 0.3, upWhy: 'peur de l\'hypoglycémie', rnd: rr } : pt.par.distress ? { upProb: 0.5, upWhy: 'découragement', rnd: rr } : {}));
      const log = Y.titrate(pt.rx, rdg, prot, G.titrState, follow);
      if (log.length) G.titrLog.push({ day: pt.day, log, before });
    }
    dp.basalAfter = bas(pt.rx);
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
      const tc = (hy) => (hy.tc != null ? hy.tc : hy.t);
      const rem = dp.rdg.hypos.map((hy) => 'malaise à ' + Math.floor(tc(hy)) + ' h ' + String(Math.round((tc(hy) % 1) * 60)).padStart(2, '0') + ' : ' + fmt(hy.g, 2) + ' g/L' + (hy.sev ? ' (tierce personne)' : ', resucrage'));
      if (G.pt.par.fear && dp.d > 0 && G.pt.st.fearUntil >= dp.d) rem.push('collation « de sécurité » au coucher');
      // Détresse psychologique : carnet incomplet (une journée sur trois sans mesure).
      if (G.pt.par.distress && Y.rng((G.seed + dp.d * 97) >>> 0)() < 0.35) { Object.keys(v).forEach((k) => { delete v[k]; }); rem.push('pas de mesure'); }
      return { d: dp.d, shift: dp.shift, basal: dp.basal, u: dp.rapid, v, hypos: dp.rdg.hypos, rem };
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
      const again = ev.lastSev != null && d - ev.lastSev < 120 && (rx.su || bas(rx) || rx.rapid);
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
      const insulinopenia = D.beta(pt) < 0.2 && (bas(rx) + rx.rapid) < 0.15 * p.weight0;
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
      const strong = rx.glp !== 'none' || bas(rx) + rx.rapid > 0;
      const thr = ev.ppr != null ? 3.5 : strong ? 1.5 : 2;
      const nat = p.retino === 'prolif' && ev.ppr == null && G.cfg.variab === 'reel' && Math.random() < 0.0003;
      if ((d >= 42 && drop >= thr) || nat) {
        ev.retinoDone = true;
        const why = nat ? 'rétinopathie proliférante non traitée par laser' : 'aggravée par la baisse rapide de l\'HbA1c (' + fmt(top[1], 1) + ' → ' + fmt(s.A, 1) + ' % en ' + Math.max(1, Math.round((d - top[0]) / 7)) + ' semaines' + (rx.glp === 'sema' || rx.glp === 'tirz' ? ', sous ' + D.GLP1[rx.glp].name.split(' (')[0].toLowerCase() : rx.basal + rx.rapid > 0 ? ', sous insuline' : '') + ')' + (ev.ppr == null ? ', sans photocoagulation préalable' : '');
        return { toon: nat ? 'retino' : 'retino', text: 'J' + d + ' : baisse brutale de l\'acuité visuelle de l\'œil droit : hémorragie intravitréenne sur rétinopathie ' + (p.retino === 'prolif' ? 'proliférante' : 'préproliférante') + ', ' + why + '. Vitrectomie à discuter, panphotocoagulation en urgence.', tests: ['fo'], caption: nat ? 'retinoNat' : 'retino' };
      }
    }
    // Cétose (LADA, insulinopénie) sans insuline
    if (D.beta(pt) < 0.1 && (bas(rx) + rx.rapid) < 0.1 * p.weight0 && s.MG > 2.5 && d - ev.ketosis > 90) {
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
    if (k === 'cetone') {
      if (ev.keto && G.lastEvent === 'keto') return '4,8 mmol/L (acidocétose)';
      if (D.beta(pt) < 0.1 && pt.st.MG > 2.5) return '2,6 mmol/L (cétose de carence insulinique)';
      // Sinon, cétonémie du matin estimée par le module de physiologie (lipolyse, rapport glucagon/insuline, iSGLT2).
      const dp = G.glyDays[G.glyDays.length - 1];
      if (dp && S.dt2physio) { const r = S.dt2physio.decompose(pt, D, Y, dp), v = r.pts[Math.round(7 / (1 / 12))].ket; return (v < 0.3 ? '< 0,3' : fmt(v, 1)) + ' mmol/L' + (v > 1.5 ? ' (cétose marquée : risque d\'acidocétose)' : v > 0.6 ? ' (cétose)' : ''); }
      return '< 0,3 mmol/L';
    }
    if (k === 'lipase') return ev.panc ? '12 N' : 'normale';
    if (k === 'fo') return ev.retinoDone ? 'hémorragie intravitréenne, néovaisseaux : panphotocoagulation à programmer' : D.RETINO[p.retino];
    return '';
  }

  function doLabs(tests, note, event, extra) {
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
    const gl = (G.glpLog || []).filter((x) => x.day >= (G.visitStart == null ? 0 : G.visitStart));
    const glpTxt = gl.length ? 'Paliers de ' + D.GLP1[pt.rx.glp].name.split(' (')[0].toLowerCase() + ' : ' + [gl[0].from].concat(gl.map((x) => x.to)).map((x) => String(x).replace('.', ',')).join(' → ') + ' ' + D.GLP1[pt.rx.glp].unit + ' (J' + gl.map((x) => x.day).join(', J') + ').' : '';
    if (tl.length) {
      const first = tl[0].before, rx = pt.rx, parts = [];
      if (first.b !== bas(rx)) parts.push((rx.pump > 0 ? 'débit de base ' : 'basale ') + fmt(first.b, first.b % 1 ? 1 : 0) + ' → ' + fmt(bas(rx), bas(rx) % 1 ? 1 : 0) + ' U' + (rx.device === 'loop' ? ' (automatique)' : ''));
      if (rx.pumpSeg && first.seg && first.seg.length === 24) { const ch = rx.pumpSeg.map((v, i) => [i, first.seg[i], v]).filter(([, a, b]) => a !== b); if (ch.length) parts.push(ch.length + ' créneau' + (ch.length > 1 ? 'x' : '') + ' horaire' + (ch.length > 1 ? 's' : '') + ' modifié' + (ch.length > 1 ? 's' : '') + ' par le patient (' + ch.slice(0, 6).map(([i, a, b]) => Y.hourLab(i) + ' ' + fmt(a, 2) + ' → ' + fmt(b, 2)).join(' ; ') + (ch.length > 6 ? ' ; …' : '') + ' U/h)'); }
      if (rx.bolusMode === 'if') { if (first.ratio !== rx.ratio) parts.push('ratio 1 U pour ' + fmt(first.ratio, 1) + ' → ' + fmt(rx.ratio, 1) + ' g de glucides'); }
      else rx.rapidM.forEach((u, i) => { if (first.m[i] !== u) parts.push('bolus du ' + ['petit-déjeuner', 'déjeuner', 'dîner'][i] + ' ' + first.m[i] + ' → ' + u + ' U'); });
      // Ratio : un ratio plus grand donne moins d'insuline (baisse).
      const more = (l) => (l.name === 'ratio' ? l.to < l.from : l.to > l.from), less = (l) => (l.name === 'ratio' ? l.to > l.from : l.to < l.from);
      const down = tl.reduce((a, x) => a + x.log.filter(less).length, 0), up = tl.reduce((a, x) => a + x.log.filter(more).length, 0);
      const capped = tl.flatMap((x) => x.log.filter((l) => l.cap)).map((l) => l.seg != null ? 'débit du créneau ' + Y.hourLab(l.seg) + ' (' + fmt(l.from, 2) + ' U/h)' : ({ basal: 'basale', m0: 'bolus du petit-déjeuner', m1: 'bolus du déjeuner', m2: 'bolus du dîner' })[l.name] + ' (' + l.from + ' U' + (/avis 19/.test(l.why) ? ', ≥ 0,5 U/kg : sur-basalisation ?' : '') + ')');
      const skipped = tl.reduce((n, x) => n + x.log.filter((l) => l.skip).length, 0);
      titr = (G.titr.who === 'ide' ? 'L\'IDE' : G.cfg.sex === 'F' ? 'La patiente' : 'Le patient') + ' a appliqué le protocole : ' + (parts.join(', ') || 'doses revenues à leur point de départ') + ' (' + up + ' hausse' + (up > 1 ? 's' : '') + ', ' + down + ' baisse' + (down > 1 ? 's' : '') + ').' + (capped.length ? ' Dose maximale du protocole atteinte, ' + (G.titr.who === 'ide' ? 'l\'IDE a' : G.cfg.sex === 'F' ? 'elle a' : 'il a') + ' appelé : ' + capped.join(', ') + '.' : '') + (skipped ? ' ' + skipped + ' hausse' + (skipped > 1 ? 's' : '') + ' prévue' + (skipped > 1 ? 's' : '') + ' non faite' + (skipped > 1 ? 's' : '') + ' (' + (pt.par.fear ? 'peur de l\'hypoglycémie' : 'découragement') + ').' : '');
    }
    const sy = symptoms(m);
    const nHypo = pt.st.hypo - G.lastHypo;
    if (glpTxt) titr = (titr ? titr + ' ' : '') + glpTxt;
    let toon = G.ev.eventToon || G.ev.toonNext || (nHypo >= 3 ? 'hypo' : null);
    const T = goalT();
    const target = T.max;
    if (!toon && labs.a1c != null && labs.a1c < target && nHypo === 0 && !G.ev.trophy && G.history.length && G.history[0].labs.a1c >= target) { toon = 'trophy'; G.ev.trophy = true; }
    if (labs.a1c != null && labs.a1c > 8 && bas(pt.rx) + pt.rx.rapid > 0) G.cgmAcquired = true;
    if (pt.rx.pump > 0) G.cgmAcquired = true;
    if ((pt.rx.basal > 0 ? 1 : 0) + (pt.rx.rapidM || []).filter((x) => x > 0).length >= 3) G.cgmAcquired = true;
    G.history.push(Object.assign({ day: pt.day, labs, q, w: m.w, bmi: m.bmi, sbp: Math.round(m.sbp), symptoms: sy, rx: rxLabel(pt.rx), note, event: event || null, toon, caption: G.ev.caption || toon, banner: G.ev.banner || null, epitaphe: G.ev.epitaphe || null, carnet, agp, titr, T, a1cTrue: pt.st.A, ukg: bas(pt.rx) / pt.st.W, mode: 'consult' }, extra || {}));
    G.ev.eventToon = null; G.ev.toonNext = null; G.ev.banner = null; G.ev.epitaphe = null; G.ev.caption = null;
    G.visits.push({ day: pt.day, labs });
    { const eh = G.history[G.history.length - 1]; eh.hypoN = pt.st.hypo - G.lastHypo; eh.sevN = pt.st.hypoSev - (G.lastSevL || 0); G.lastSevL = pt.st.hypoSev; }
    G.lastHypo = pt.st.hypo;
    G.ev.notes = [];
  }

  function symptoms(m) {
    const pt = G.pt, out = G.ev.notes.slice();
    const n = pt.st.hypo - G.lastHypo;
    if (n > 0) out.push(n + ' malaise' + (n > 1 ? 's' : '') + ' avec sueurs et tremblements, corrigé' + (n > 1 ? 's' : '') + ' par du sucre');
    if (pt.st.MG > 2.5) out.push('soif, urines abondantes, fatigue');
    if (G.cfg.adh === 'moyenne' || (pt.par.adh < 0.75)) out.push('reconnaît oublier souvent ses médicaments');
    if (pt.par.fear) out.push('dit avoir très peur de faire un malaise' + (bas(pt.rx) + pt.rx.rapid > 0 ? ', n\'ose pas monter les doses d\'insuline' : '') + ', se resucre « au cas où »');
    if (pt.par.distress) out.push('moral bas, se dit « dépassé(e) par le diabète », carnet tenu irrégulièrement');
    if (G.cfg.work !== 'jour') out.push('travaille ' + { nuit: 'de nuit', '2x8': 'en 2 × 8', '3x8': 'en 3 × 8' }[G.cfg.work] + ' : repas et sommeil décalés' + (G.cfg.work === 'nuit' ? '' : ', changements de poste difficiles'));
    if (pt.rx.met && !pt.take.met && !out.some((x) => x.includes('metformine'))) out.push('ne prend plus la metformine (troubles digestifs)');
    if (pt.rx.glp !== 'none' && !pt.take.glp) out.push('ne fait plus l\'injection d\'aGLP1 (vomissements)');
    return out;
  }

  function rxLabel(rx) {
    const o = [];
    const life = [rx.act ? 'activité ' + rx.act + ' min/sem' : '', rx.sodaStop ? 'arrêt des sodas' : '', rx.wtGoal ? 'objectif −' + rx.wtGoal + ' % de poids' : '', rx.diet ? 'suivi diététique' : ''].filter(Boolean);
    if (life.length) o.push('RHD (' + life.join(', ') + ')');
    if (rx.met) o.push('metformine ' + rx.met + ' mg/j');
    if (rx.su) o.push(suLabel(rx));
    if (rx.dpp4) o.push('sitagliptine ' + rx.dpp4 + ' mg/j');
    if (rx.glp !== 'none') o.push(D.GLP1[rx.glp].name.split(' (')[0].toLowerCase() + ' ' + String(rx.glpDose).replace('.', ',') + ' ' + D.GLP1[rx.glp].unit);
    if (rx.sglt2 !== 'none') o.push(D.SGLT2[rx.sglt2].toLowerCase());
    if (rx.acarb) o.push('acarbose ' + rx.acarb + ' mg/j');
    if (rx.basal) o.push('insuline basale (' + ({ g100: 'glargine U100', g300: 'glargine U300', deg: 'dégludec', nph: 'NPH' }[rx.basalType] || 'glargine') + ') ' + rx.basal + ' U/j');
    if (rx.pump) o.push((rx.device === 'loop' ? 'boucle fermée hybride, débit de base automatique (' : 'pompe à insuline, débit de base ') + fmt(rx.pump, rx.pump % 1 ? 1 : 0) + ' U/24 h' + (rx.pumpSeg && rx.device !== 'loop' ? ' (profil horaire de ' + fmt(Math.min(...rx.pumpSeg), 2) + ' à ' + fmt(Math.max(...rx.pumpSeg), 2) + ' U/h, nuit 00 h – 07 h ' + fmt(rx.pumpSeg.slice(0, 7).reduce((a, x) => a + x, 0) / 7, 2) + ' U/h en moyenne)' : '') + (rx.device === 'loop' ? ')' : ''));
    if (rx.pump && rx.bolusMode === 'if') { o.push('insulinothérapie fonctionnelle (1 U pour ' + fmt(rx.ratio, 1) + ' g de glucides ; correction 1 U pour ' + fmt(rx.isf, 2) + ' g/L au-dessus de 1,20)'); return o.join(' + '); }
    if (rx.rapid) o.push((rx.pump ? 'bolus ' : 'analogue rapide ') + (rx.rapidM || [0, rx.rapid, 0]).map((x) => x || 0).join('/') + ' U (petit-déj./déj./dîner)');
    return o.length ? o.join(' + ') : 'aucun traitement';
  }

  function snapshot() {
    const pt = G.pt;
    return JSON.stringify({ metRamp: pt.metRamp, st: pt.st, day: pt.day, rx: pt.rx, take: pt.take, par: Object.assign({}, pt.par), logLen: pt.log.length, hist: G.history.length, vis: G.visits.length, ev: G.ev, lastHypo: G.lastHypo,
      gly: G.glyDays, titrState: G.titrState, titrLog: G.titrLog.length, starts: G.starts, titr: G.titr, cgm: G.cgm, cgmStart: G.cgmStart, cgmAcq: !!G.cgmAcquired, asg: G.asg, goal: G.goal, lastH: G.lastH, lastS: G.lastS, glpLog: (G.glpLog || []).length, glpUp: G.glpUp || null });
  }
  function restore(js) {
    const s = JSON.parse(js), pt = G.pt;
    pt.st = s.st; pt.day = s.day; pt.rx = s.rx; pt.take = s.take; pt.metRamp = s.metRamp; Object.assign(pt.par, s.par);
    pt.log.length = s.logLen; G.history.length = s.hist; G.visits.length = s.vis; G.ev = s.ev; G.lastHypo = s.lastHypo;
    G.glyDays = s.gly; G.titrState = s.titrState; G.titrLog.length = s.titrLog; G.starts = s.starts; G.titr = s.titr; G.cgm = s.cgm; G.cgmStart = s.cgmStart; G.cgmAcquired = s.cgmAcq; G.asg = s.asg; G.goal = s.goal; G.lastH = s.lastH; G.lastS = s.lastS; if (G.glpLog) G.glpLog.length = s.glpLog || 0; G.glpUp = s.glpUp;
    Object.assign(G.draft, pt.rx, { basal: bas(pt.rx), device: pt.rx.device || 'inj', seg: pt.rx.pumpSeg ? pt.rx.pumpSeg.slice() : null, rapidM: pt.rx.rapidM.slice(), titr: JSON.parse(JSON.stringify(G.titr)), cgm: G.cgm, asg: G.asg, goal: G.goal });
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
    // Au sortir d'une hospitalisation, l'insuline a déjà été instaurée (pompe) : pas de règle d'initiation.
    const lastE = G.history[G.history.length - 1];
    const fromHosp = lastE && lastE.hosp ? { basal: lastE.hosp.relay.basal || 1, rapidM: lastE.hosp.relay.rapidM.map((u) => u || 1) } : null;
    const prevIns = fromHosp || Object.assign({}, pt.rx, { basal: bas(pt.rx) });
    const block = SFD.insulinInit(prevIns, d, pt.st.W).concat(SFD.monitoring(d, d.asg, d.cgm, lastA1c(), G.cgmAcquired));
    const onInsD = d.basal + d.rapid > 0;
    if (d.device !== 'inj' && !(d.basal > 0 && d.rapid > 0)) block.push('Pompe : un débit de base et des bolus aux repas sont nécessaires (la pompe ne délivre que de l\'analogue rapide).');
    if (d.device === 'loop' && !d.cgm) block.push('Boucle fermée : le capteur de glucose est obligatoire (il pilote le débit de base).');
    if (d.device === 'pump' && !d.cgm && !['4', '6'].includes(d.asg)) block.push('Pompe sans capteur : autosurveillance capillaire au moins 4 fois par jour.');
    if (onInsD && d.titr.who !== 'none' && d.asg === '0' && !d.cgm) block.push('Titration de l\'insuline sans autosurveillance ni capteur : impossible ; il faut au moins la glycémie du réveil chaque jour.');
    if (onInsD && d.titr.who !== 'none' && d.rapid > 0 && d.titr.bolusCtl === 'pp' && d.asg !== '6' && !d.cgm) block.push('Bolus adaptés sur la glycémie post-prandiale : prescrire l\'autosurveillance 6 fois par jour (avant et 2 h après les repas) ou un capteur.');
    if (block.length) { say(block); return; }
    // Entraînement : arbre des décisions au moment de la décision (avant l'ordonnance), pour la correction.
    const treeAt = G.cfg.mode === 'entrainement' && S.dt2tree ? S.dt2tree.build(pt, G.cfg) : null;
    G.undo.push(snapshot());
    const prev = Object.assign({}, pt.rx, { rapidM: pt.rx.rapidM.slice() });
    const metBefore = D.metDose(pt);
    Object.assign(pt.rx, { met: d.met, su: d.su, suType: d.suType || 'glic', dpp4: d.dpp4, glp: d.glp, glpDose: d.glp === 'none' ? 0 : d.glpDose, sglt2: d.sglt2, acarb: d.acarb, basal: d.device === 'inj' ? d.basal : 0, pump: d.device === 'inj' ? 0 : d.basal, device: d.device, basalType: d.basalType, rapidM: d.rapidM.slice(), rapid: d.rapid, act: d.act, sodaStop: d.sodaStop, wtGoal: d.wtGoal, diet: d.diet });
    // Pompe : profil horaire (4 tranches) et insulinothérapie fonctionnelle (ratio, sensibilité).
    pt.rx.pumpSeg = d.device !== 'inj' && d.seg ? d.seg.slice() : null;
    if (pt.rx.pumpSeg) pt.rx.pump = Math.round(Y.segTotal(pt.rx.pumpSeg) * 10) / 10;
    pt.rx.bolusMode = d.device !== 'inj' && d.bolusMode === 'if' ? 'if' : 'fixe';
    if (pt.rx.bolusMode === 'if') { pt.rx.ratio = d.ratio; pt.rx.isf = d.isf; pt.rx.rapidM = Y.CARBS.map((c, m) => Math.round(c * [0.8, 1.1, 1][m] / d.ratio)); pt.rx.rapid = pt.rx.rapidM.reduce((a, x) => a + x, 0); }
    else { pt.rx.ratio = 0; pt.rx.isf = 0; }
    d.titr.segCap = pt.rx.pumpSeg ? pt.rx.pumpSeg.map((x) => x * 1.5) : null;
    const debrief = treeAt ? makeDebrief(treeAt, prev, pt.rx, lastA1c()) : null;
    if (d.cgm && !G.cgm) G.cgmStart = pt.day; // le capteur n'enregistre qu'à partir de sa pose
    // Dose maximale sans avis médical : + 50 % de la dose prescrite (au moins + 6 U), comme dans les protocoles écrits.
    d.titr.caps = { basal: d.basal > 0 ? Math.max(d.basal + 6, Math.round(d.basal * 1.5)) : null };
    d.rapidM.forEach((u, m) => { d.titr.caps['m' + m] = u > 0 ? Math.max(u + 6, Math.round(u * 1.5)) : null; });
    G.titrState.capped = {};
    G.glpUp = d.glp !== 'none' && d.glpUp && D.GLP1[d.glp].doses.indexOf(d.glpTarget) > D.GLP1[d.glp].doses.indexOf(d.glpDose) ? { glp: d.glp, target: d.glpTarget } : null;
    G.titr = JSON.parse(JSON.stringify(d.titr)); G.cgm = d.cgm; G.asg = d.asg; G.goal = d.goal;
    if (d.cgm) G.cgmAcquired = true;
    if (d.ppr && G.ev.ppr == null) G.ev.ppr = pt.day;
    // Début des traitements, pour les règles d'arrêt (SFD 2025, avis 5).
    const on = { su: (r) => r.su > 0, dpp4: (r) => r.dpp4 > 0, sglt2: (r) => r.sglt2 !== 'none', glp: (r) => r.glp !== 'none' };
    Object.entries(on).forEach(([k, f]) => { if (f(pt.rx) && !f(prev)) G.starts[k] = { day: pt.day, a1c: lastA1c(), w: pt.st.W }; else if (!f(pt.rx)) delete G.starts[k]; });
    if (!(bas(prev) > 0) && bas(pt.rx) > 0) G.titrState = { above: {} };
    pt.par.dfg0Eff = Math.max(pt.par.dfg0Eff || 0, pt.st.dfg);
    onPrescribe(prev, metBefore, d.metProg);
    G.history.push({ day: pt.day, prescription: true, rx: rxLabel(pt.rx) });
    G.visitStart = pt.day;
    let interrupt = null;
    const rng = G.cfg.variab === 'reel' ? Math.random : null;
    D.advance(pt, days, () => { recordDay(true); glpStep(); const e = daily(); if (e) { interrupt = e; return false; } return true; }, rng);
    // Doses atteintes par la titration : point de départ de la prochaine ordonnance.
    d.basal = bas(pt.rx); d.rapidM = pt.rx.rapidM.slice(); d.rapid = pt.rx.rapid; d.seg = pt.rx.pumpSeg ? pt.rx.pumpSeg.slice() : null; if (pt.rx.ratio) d.ratio = pt.rx.ratio; d.glpDose = pt.rx.glp === d.glp ? pt.rx.glpDose : d.glpDose;
    let note = (d.mode === 'tele' ? 'Téléconsultation à ' : 'Consultation à ') + (d.unit === 'sem' ? d.wait + ' semaine' + (d.wait > 1 ? 's' : '') : days + ' jour' + (days > 1 ? 's' : ''));
    let tests = d.tests;
    if (interrupt) {
      note = interrupt.death ? 'Décès' : 'Consultation non programmée (bilan prévu annulé)';
      tests = new Set((interrupt.tests || []).concat(['fpg'], G.asg !== '0' || G.cgm ? ['carnet'] : []));
      G.ev.eventToon = interrupt.toon || null;
      G.ev.caption = interrupt.caption || null;
      if (interrupt.death) { G.dead = interrupt; G.ev.epitaphe = interrupt.epitaphe; }
      G.lastEvent = interrupt.text.includes('acidocétose') ? 'keto' : null;
      if (interrupt.stop === 'met') d.met = 0;
      if (interrupt.stop === 'sglt2') { d.sglt2 = 'none'; d.basal = bas(pt.rx); }
      if (interrupt.stop === 'incr') { d.glp = 'none'; d.glpDose = 0; d.dpp4 = 0; }
    }
    // Sous capteur, le rapport AGP des 14 derniers jours est joint à chaque bilan.
    if (G.cgm) tests = new Set([...tests, 'agp']);
    G.view = null;
    doLabs(tests, note, interrupt && interrupt.text, { mode: interrupt ? 'consult' : d.mode === 'tele' ? 'tele' : 'consult', debrief });
    render();
    const res = main.querySelector('.sv-latest');
    if (res && window.innerWidth < 860) res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function undo() { const s = G.undo.pop(); if (!s) return; restore(s); G.dead = null; G.view = null; render(); }

  /* ---------- Rendu ---------- */
  function render() {
    const pt = G.pt;
    statusEl.hidden = false;
    statusEl.textContent = 'DT2 · ' + dayLabel(pt.day);
    main.textContent = '';
    main.className = 'sv-main sv-game sv-sandbox';
    const left = h('aside', { class: 'sv-dossier' }, [patientCard(), G.dead ? deathCard() : rxCard()]);
    const right = h('section', { class: 'sv-consult' }, TRAIN() ? [journeyCard(), physioEntry(), latestCard(), chartCard(), historyCard(), refCard()] : [journeyCard(), physioEntry(), latestCard(), sfdCard(), chartCard(), marginCard(), historyCard(), treeCard(), guideCard(), factorsCard(), refCard(), effectsCard(), revealCard()]);
    main.append(left, right);
    const box = right.querySelector('.sv-chartbox');
    if (box) requestAnimationFrame(() => chart(box));
  }

  function patientCard() {
    const c = G.cfg, pt = G.pt;
    const bmi = c.weight / Math.pow(c.height / 100, 2);
    const co = [c.hfail && 'insuffisance cardiaque', c.cvd && 'maladie CV avérée', c.panc && 'ATCD de pancréatite', c.mtc && 'ATCD familial de CMT', c.myco && 'mycoses récidivantes', c.irregular && 'repas irréguliers', c.lowcarb && 'régime cétogène', c.retino !== 'none' && D.RETINO[c.retino].toLowerCase() + (G.ev.ppr != null ? ' (photocoagulée à J' + G.ev.ppr + ')' : ''), c.hcvr && 'risque CV élevé', c.masld && 'MASLD', c.severe && 'espérance de vie < 5 ans ou comorbidité sévère', c.driver && 'conduite professionnelle', c.age >= 75 && { bonne: 'âgé(e) en bonne santé', fragile: 'âgé(e) fragile', dependant: 'âgé(e) dépendant(e)' }[c.geria], c.work !== 'jour' && 'travail ' + { nuit: 'de nuit', '2x8': 'en 2 × 8', '3x8': 'en 3 × 8' }[c.work], c.adh === 'peur' && 'peur de l\'hypoglycémie', c.adh === 'detresse' && 'détresse psychologique', c.adh === 'moyenne' && 'oublis fréquents'].filter(Boolean);
    return h('div', { class: 'sv-card sv-id' }, [
      h('p', { class: 'sv-eyebrow' }, 'Patient simulé'),
      h('h2', null, (c.sex === 'F' ? 'Femme' : 'Homme') + ', ' + c.age + ' ans, ' + fmt(c.weight, 0) + ' kg, IMC ' + fmt(bmi, 1)),
      h('p', { class: 'sv-muted' }, 'Mode de vie : activité ' + c.act0 + ' min/sem, ' + (c.soda0 ? c.soda0 + ' verre(s) de soda/j' : 'pas de soda') + ', grignotage ' + { aucun: 'absent', modere: 'modéré', important: 'important' }[c.snack0] + ', motivation ' + c.motiv + '.'),
      h('p', { class: 'sv-muted' }, D.PROFILES[c.profile].label + ' · diabète connu depuis ' + c.duration + ' an' + (c.duration > 1 ? 's' : '') + ' · DFG ' + c.dfg + ' · albuminurie : ' + D.ALB[c.alb].label.split(' (')[0].toLowerCase() + ' · origine : ' + D.ETHNIC[c.ethnic].label + (co.length ? ' · ' + co.join(', ') : '') + (c.variab === 'reel' ? ' · réponses cachées' : '')),
      h('p', { class: 'sv-rx' }, [h('strong', null, 'Traitement en cours : '), rxLabel(pt.rx)]),
      h('div', { class: 'sv-actions' }, [
        h('button', { type: 'button', class: 'sv-secondary', onclick: undo, disabled: !G.undo.length }, '↶ Annuler la dernière étape'),
        h('button', { type: 'button', class: 'sv-secondary', onclick: setup }, 'Nouveau patient'),
        G.cfg.mode === 'entrainement' && !G.trainDone ? h('button', { type: 'button', class: 'sv-primary', id: 'dtTrainEnd', onclick: () => { G.trainDone = true; render(); } }, 'Terminer l\'entraînement : voir toutes les aides') : null,
        h('button', { type: 'button', class: 'sv-secondary', id: 'dtExport', onclick: exportReport }, '⇩ Exporter le suivi')
      ]),
      h('div', { id: 'dtExportBox', hidden: true })
    ]);
  }

  // Export du rapport de suivi (JSON) : patient, physiologie cachée, ordonnances, bilans, carnets, AGP,
  // titration et courbe quotidienne du modèle ; pour l'analyse hors du simulateur.
  function exportData() {
    const pt = G.pt, p = pt.par, r2 = (x) => (typeof x === 'number' ? Math.round(x * 100) / 100 : x);
    const visits = G.history.map((e) => e.prescription ? { jour: e.day, ordonnance: e.rx } : {
      jour: e.day, note: e.note, evenement: e.event, labo: Object.fromEntries(Object.entries(e.labs).map(([k, v]) => [k, r2(v)])), autres: e.q, poids: r2(e.w), pa: e.sbp,
      plaintes: e.symptoms, traitement: e.rx, titration: e.titr, cible: e.T && { max: e.T.max, plancher: e.T.floor, fixeeParLePrescripteur: !!e.T.chosen },
      carnet: e.carnet && e.carnet.map((x) => ({ jour: x.d, basale: x.basal, bolus: x.u, glycemies: Object.fromEntries(Object.entries(x.v).map(([k, v]) => [k, r2(v)])), remarques: x.rem })),
      type: e.mode || 'consult', hospitalisation: e.hosp && { reglages: e.hosp.o, jours: e.hosp.days, hypoglycemies: e.hosp.hypos, relais: e.hosp.relay, controles: e.hosp.checks },
      agp: e.agp && { jours: e.agp.st.days, capturepc: r2(e.agp.st.capture), moyenne: r2(e.agp.st.mean), gmi: r2(e.agp.st.gmi), cv: r2(e.agp.st.cv), tirPc: r2(e.agp.st.tir), sous070Pc: r2(e.agp.st.low + e.agp.st.vlow), sous054Pc: r2(e.agp.st.vlow), sup180Pc: r2(e.agp.st.high + e.agp.st.vhigh), sup250Pc: r2(e.agp.st.vhigh), medianeParHeure: e.agp.st.prof.filter((q) => q.i % 4 === 0).map((q) => r2(q.p50)) }
    });
    return {
      export: 'Patient virtuel DT2 · rapport de suivi', version: 1, date: new Date().toISOString(), jourActuel: pt.day,
      patient: G.cfg,
      physiologieCachee: { reserveB0: r2(p.B0), reserveActuelle: r2(D.beta(pt)), sensibilite: r2(p.Si0), sensibiliteRecalee: p.siFit ? r2(p.siFit) : null, declinAnnuel: r2(p.rate), observance: r2(p.adh), reponseMetformine: r2(p.metResp), reponseAGLP1: r2(p.glpResp), reponsePoids: r2(p.wResp), atteinteRHD: r2(p.lifeAch), poidsEquilibre: r2(p.weight0) },
      reglages: { titration: G.titr, autosurveillance: G.asg, capteur: G.cgm, capteurDepuis: G.cgmStart, indicationCapteurAcquise: !!G.cgmAcquired, objectifHbA1c: G.goal },
      ordonnanceActuelle: Object.assign({}, pt.rx), libelle: rxLabel(pt.rx),
      etat: { hba1c: r2(pt.st.A), glycemieMoyenne: r2(pt.st.MG), poids: r2(pt.st.W), dfg: r2(pt.st.dfg), hypoglycemies: pt.st.hypo, hypoglycemiesSeveres: pt.st.hypoSev },
      consultations: visits,
      titrationJourParJour: G.titrLog.map((x) => ({ jour: x.day, changements: x.log.map((l) => ({ dose: l.name, de: l.from, a: l.to, pourquoi: l.why })) })),
      courbeQuotidienne: pt.log.map((q) => ({ j: q.day, a1c: r2(q.a1c), gm: r2(q.mg), gaj: r2(q.fpg), poids: r2(q.w), dfg: r2(q.dfg), met: q.met, su: q.su, insuline: q.ins, glp: r2(q.glp) })),
      evenements: G.ev
    };
  }
  function exportReport() {
    const box = document.getElementById('dtExportBox');
    const txt = JSON.stringify(exportData(), null, 1);
    const name = 'suivi-dt2-J' + G.pt.day + '.json';
    let ok = false;
    try {
      const url = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
      const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000); ok = true;
    } catch (err) { ok = false; }
    const ta = h('textarea', { class: 'sv-export', readonly: true, rows: 8, 'aria-label': 'Rapport de suivi (JSON)' }, txt);
    const msg = h('p', { class: 'sv-note' }, (ok ? 'Fichier « ' + name + ' » proposé au téléchargement. ' : '') + 'Si le téléchargement est bloqué, copiez le texte ci-dessous et collez-le dans la conversation.');
    box.textContent = '';
    box.append(msg, ta, h('div', { class: 'sv-actions' }, [
      h('button', { type: 'button', class: 'sv-secondary', onclick: () => { ta.select(); let c = false; try { c = document.execCommand('copy'); } catch (err) { c = false; } if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { msg.textContent = 'Copié dans le presse-papiers.'; }, () => {}); if (c) msg.textContent = 'Copié dans le presse-papiers.'; } }, 'Copier'),
      h('button', { type: 'button', class: 'sv-secondary', onclick: () => { box.hidden = true; } }, 'Fermer')
    ]));
    box.hidden = false;
  }

  function rxCard() {
    const d = G.draft;
    const re = () => render();
    const sel = (id, label, val, opts, on, rerender) => h('div', { class: 'sv-field' }, [h('label', { for: id }, label), h('select', { id, onchange: (e) => { on(e.target.value); if (rerender) re(); } }, opts.map(([k, t]) => h('option', { value: k, selected: String(val) === String(k) }, t)))]);
    const num = (id, label, val, on) => h('div', { class: 'sv-field' }, [h('label', { for: id }, label), h('span', { class: 'sv-numwrap' }, [h('input', { type: 'number', id, class: 'sv-num', value: val, min: 0, max: 300, step: 1, inputmode: 'numeric', oninput: (e) => on(Math.max(0, Math.round(parseFloat(e.target.value) || 0))) }), ' U/j'])]);
    const Gp = D.GLP1[d.glp];
    const tabs = h('div', { class: 'sv-modes' }, [h('p', { class: 'sv-eyebrow' }, 'Prochaine étape'), h('div', { class: 'sv-tabs', role: 'tablist' }, MODES.map(([k, ic, t]) => h('button', { type: 'button', role: 'tab', id: 'dtMode-' + k, 'aria-selected': String(d.mode === k), class: 'sv-tab' + (d.mode === k ? ' on' : ''), onclick: () => { d.mode = k; re(); } }, [h('span', { class: 'sv-tab-ic', 'aria-hidden': 'true' }, ic), h('span', null, t)])))]);
    if (d.mode === 'hosp') return h('div', { class: 'sv-card sv-ordo' }, [tabs, hospForm(d, re)]);
    return h('div', { class: 'sv-card sv-ordo' }, [
      tabs,
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
        h('div', { class: 'sv-field' }, [h('label', { for: 'dtSu' }, 'Insulinosécréteur (sulfamide, glinide)'), suPick('dtSu', d, (t, v) => { const ch = t !== (d.suType || 'glic'); d.suType = t; d.su = v; if (ch) re(); })]),
        sel('dtDpp', 'Sitagliptine (iDPP4)', d.dpp4, DPP4.map((x) => [x, x ? x + ' mg/j' : 'Aucune']), (v) => { d.dpp4 = +v; }),
        h('div', { class: 'sv-field' }, [h('label', { for: 'dtGlp' }, 'Agoniste du GLP-1'), h('div', { class: 'sv-inline' }, [
          h('select', { id: 'dtGlp', onchange: (e) => { d.glp = e.target.value; d.glpDose = d.glp === 'none' ? 0 : D.GLP1[d.glp].doses[0]; if (d.glp !== 'none') { d.glpUp = true; d.glpTarget = D.GLP1[d.glp].doses[D.GLP1[d.glp].doses.length - 1]; } re(); } }, Object.entries(D.GLP1).map(([k, v]) => h('option', { value: k, selected: d.glp === k }, v.name))),
          Gp.doses.length ? h('select', { id: 'dtGlpDose', 'aria-label': 'Dose', onchange: (e) => { d.glpDose = +e.target.value; re(); } }, Gp.doses.map((x) => h('option', { value: x, selected: d.glpDose === x }, String(x).replace('.', ',') + ' ' + Gp.unit))) : null
        ]),
          Gp.doses.length && Gp.doses.indexOf(d.glpDose) < Gp.doses.length - 1 ? h('div', { class: 'sv-inline sv-small' }, [h('label', { class: 'sv-check sv-small' }, [h('input', { type: 'checkbox', id: 'dtGlpUp', checked: !!d.glpUp, onchange: (e) => { d.glpUp = e.target.checked; if (d.glpUp && !(Gp.doses.indexOf(d.glpTarget) > Gp.doses.indexOf(d.glpDose))) d.glpTarget = Gp.doses[Gp.doses.length - 1]; } }), ' Monter d\'un palier ' + (Gp.step >= 28 ? 'toutes les 4 semaines' : 'chaque semaine') + ' jusqu\'à']),
            h('select', { id: 'dtGlpTarget', 'aria-label': 'Dose cible', onchange: (e) => { d.glpTarget = +e.target.value; d.glpUp = true; } }, Gp.doses.filter((x) => x > d.glpDose).map((x) => h('option', { value: x, selected: (d.glpTarget || Gp.doses[Gp.doses.length - 1]) === x }, String(x).replace('.', ',') + ' ' + Gp.unit)))]) : null
        ]),
        sel('dtSglt', 'iSGLT2', d.sglt2, Object.entries(D.SGLT2), (v) => { d.sglt2 = v; }),
        sel('dtAcarb', 'Acarbose', d.acarb, ACARB.map((x) => [x, x ? x + ' mg/j' : 'Aucune']), (v) => { d.acarb = +v; }),
      ]),
      insulinBlock(d, re),
      h('h4', null, 'Objectif d\'HbA1c'),
      (() => { const T = SFD.target(G.cfg, G.pt.rx, G.pt.st.dfg); return h('div', { class: 'sv-form' }, [h('div', { class: 'sv-field' }, [h('label', { for: 'dtGoal' }, 'Fixé avec le patient'), h('select', { id: 'dtGoal', onchange: (e) => { d.goal = e.target.value === '' ? null : +e.target.value; } }, [['', 'Cible SFD 2025 calculée (≤ ' + fmt(T.max, 1) + ' %)']].concat([6.5, 7, 7.5, 8, 8.5, 9].map((x) => [x, '≤ ' + fmt(x, 1) + ' %'])).map(([k, v]) => h('option', { value: k, selected: String(d.goal == null ? '' : d.goal) === String(k) }, v)))])]); })(),
      h('h3', null, d.mode === 'tele' ? 'Prochaine téléconsultation' : 'Prochaine consultation'),
      h('div', { class: 'sv-inline' }, ['dans',
        h('input', { type: 'number', id: 'dtWait', class: 'sv-num', value: d.wait, min: 1, max: d.unit === 'sem' ? 156 : 1095, step: 1, inputmode: 'numeric', 'aria-label': 'Délai', oninput: (e) => { d.wait = parseFloat(e.target.value) || 0; } }),
        h('select', { id: 'dtUnit', 'aria-label': 'Unité', onchange: (e) => { d.unit = e.target.value; } }, [h('option', { value: 'sem', selected: d.unit === 'sem' }, 'semaines'), h('option', { value: 'j', selected: d.unit === 'j' }, 'jours')])
      ]),
      h('div', { class: 'sv-chips' }, TESTS.map(([k, t]) => h('label', { class: 'sv-chipcheck' }, [h('input', { type: 'checkbox', id: 'dtT' + k, checked: d.tests.has(k), onchange: (e) => { e.target.checked ? d.tests.add(k) : d.tests.delete(k); } }), ' ' + t]))),
      h('p', { class: 'sv-alert', hidden: true }),
      h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: submit }, d.mode === 'tele' ? 'Prescrire et voir la téléconsultation →' : 'Prescrire et voir le bilan →'))
    ]);
  }

  // Insulinothérapie : basale, bolus par repas, protocole d'adaptation des doses, surveillance.
  function insulinBlock(d, re) {
    const pt = G.pt, W = pt.st.W;
    const sel = (id, label, val, opts, on) => h('div', { class: 'sv-field' }, [h('label', { for: id }, label), h('select', { id, onchange: (e) => { on(e.target.value); } }, opts.map(([k, t]) => h('option', { value: k, selected: String(val) === String(k) }, t)))]);
    const unit = (id, val, on, label) => h('span', { class: 'sv-numwrap' }, [h('input', { type: 'number', id, class: 'sv-num sv-num-s', value: val, min: 0, max: 300, step: 1, inputmode: 'numeric', 'aria-label': label, oninput: (e) => { on(Math.max(0, Math.round(parseFloat(e.target.value) || 0))); } }), ' U']);
    const tot = () => d.basal + d.rapidM.reduce((a, x) => a + x, 0);
    const dev = d.device || 'inj';
    const note = h('p', { class: 'sv-note', id: 'dtInsNote' });
    const upd = () => { note.textContent = tot() ? 'Insuline : ' + fmt(tot() / W, 2) + ' U/kg/j (' + (dev === 'inj' ? 'basale ' : 'débit de base ') + fmt(d.basal / W, 2) + ').' : ''; };
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
      h('div', { class: 'sv-form' }, [sel('dtDevice', 'Mode d\'administration', dev, DEVICES, (v) => { if (v !== 'inj' && dev === 'inj' && d.basal > 0) d.basal = Math.round(d.basal * 0.8); d.device = v; if (v === 'loop') { d.cgm = true; d.asg = '0'; } re(); })]),
      dev !== 'inj' ? h('p', { class: 'sv-note', id: 'dtPumpNote' }, dev === 'loop' ? 'Boucle fermée hybride : le capteur pilote le débit de base (ajusté chaque jour, suspendu avant une hypoglycémie) et ajoute des corrections automatiques ; le patient garde ses bolus aux repas, adaptés selon le protocole. DT2 : 2IQP (NEJM 2025), HbA1c − 0,9 contre − 0,3 à 13 semaines, TIR 48 → 64 % ; mise en place par un centre initiateur ; prise en charge en France dans le DT2 à vérifier.' : 'Pompe : débit de base continu d\'analogue rapide (pas de saturation ni de sur-basalisation, résorption plus reproductible) et bolus aux repas. Passage des stylos : débit de base ≈ 80 % de la basale. DT2 en échec du basal-bolus : OpT2mise (Lancet 2014), HbA1c − 1,1 contre − 0,4 à 6 mois, avec 20 % d\'insuline en moins ; mise en place par un centre initiateur.') : null,
      bas(pt.rx) > 0 || dev !== 'inj' ? null : h('p', { class: 'sv-muted' }, 'Initiation : une injection d\'analogue lent, 6 à 10 U/j ou 0,1 à 0,2 U/kg/j, soit ' + lo + ' à ' + hi + ' U ici, puis titration (SFD 2025, avis 18). Une dose de départ plus forte est refusée.'),
      h('div', { class: 'sv-form' }, [
        h('div', { class: 'sv-field' }, [h('label', { for: 'dtBasal' }, dev === 'inj' ? 'Insuline basale (1 injection/j)' : dev === 'loop' ? 'Débit de base de départ (U/24 h, puis automatique)' : 'Débit de base de la pompe (U/24 h)'), h('div', { class: 'sv-inline' }, [unit('dtBasal', d.basal, (v) => { d.basal = v; upd(); }, 'Dose de basale'),
          dev !== 'inj' ? null : h('select', { id: 'dtBasalType', 'aria-label': 'Insuline basale', onchange: (e) => { d.basalType = e.target.value; } }, [['g100', 'Glargine U100'], ['g300', 'Glargine U300'], ['deg', 'Dégludec'], ['nph', 'NPH']].map(([k, v]) => h('option', { value: k, selected: d.basalType === k }, v)))])]),
        h('div', { class: 'sv-field' }, [h('label', null, 'Analogue rapide aux repas (petit-déj. / déj. / dîner)'), h('div', { class: 'sv-inline' }, [0, 1, 2].map((m) => unit('dtBolus' + m, d.rapidM[m], (v) => { d.rapidM[m] = v; upd(); }, 'Bolus ' + Y.MEALS[m])))])
      ]),
      dev !== 'inj' ? pumpBlock(d, re) : null,
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
      h('p', { class: 'sv-note' }, 'Protocole du service : pas de 1 U sous 10 U, de 2 U au-delà ; baisse dès l\'injection suivante si glycémie < ' + fmt(O.rev[0], 2) + ' g/L, double baisse si hypoglycémie, puis pas de hausse pendant 7 jours ; basale jugée sur le réveil, bolus sur la glycémie avant le repas suivant ; dose maximale sans avis médical : + 50 % de la dose prescrite (au moins + 6 U).'),
      h('h4', null, 'Surveillance glycémique'),
      h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'dtCgm', checked: d.cgm, onchange: (e) => { d.cgm = e.target.checked; d.asg = d.cgm ? '0' : (d.basal + d.rapidM.reduce((a, x) => a + x, 0) > 0 ? (d.rapidM.some((x) => x > 0) ? '4' : '1') : d.su > 0 ? 'w4' : '0'); re(); } }), ' Capteur de glucose (mesure en continu, rapport AGP)' + (G.cgmAcquired ? ' · indication acquise' : '')]),
      d.cgm ? h('p', { class: 'sv-note', id: 'dtSurvCgm' }, 'Surveillance par le capteur : l\'autosurveillance capillaire est arrêtée (bandelettes réservées aux doutes : symptômes discordants, capteur défaillant). Le rapport AGP des 14 derniers jours est joint à chaque bilan.')
        : h('div', { class: 'sv-form' }, [sel('dtAsg', 'Autosurveillance capillaire', d.asg, [['0', 'Aucune']].concat(Object.entries(Y.ASG).map(([k, v]) => [k, v.label])), (v) => { d.asg = v; })]),
      h('p', { class: 'sv-note' }, 'Lecteur et bandelettes : seulement sous traitement hypoglycémiant ; hors insuline, 200 bandelettes par an (HAS). Capteur : sous insuline à 3 injections/j ou plus sans condition, ou en moins de 3 injections (basale seule comprise) avec HbA1c > 8 % (LPPR) ; une fois posée, l\'indication reste acquise même si l\'HbA1c repasse sous 8 %.'),
      retNeed ? h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'dtPpr', checked: d.ppr, onchange: (e) => { d.ppr = e.target.checked; } }), ' Adresser en urgence en ophtalmologie : photocoagulation panrétinienne']) : null
    ]);
  }

  // Pompe au long cours (protocole type, complément) : profil horaire en 4 tranches, insulinothérapie fonctionnelle.
  function pumpBlock(d, re) {
    const tdd = Math.max(10, d.basal + d.rapidM.reduce((a, x) => a + x, 0));
    const rIn = (id, val, on, step, label) => h('input', { type: 'number', id, class: 'sv-num sv-num-s', value: val, min: 0, max: 50, step, inputmode: 'decimal', 'aria-label': label, oninput: (e) => { const v = parseFloat(String(e.target.value).replace(',', '.')); if (v >= 0) on(v); } });
    const spread = () => { d.seg = Y.flatProfile(d.basal); re(); };
    return h('div', { class: 'sv-pump' }, [
      h('h4', null, 'Réglages de la pompe (protocole type)'),
      d.device === 'loop' ? null : h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'dtSegOn', checked: !!d.seg, onchange: (e) => { if (e.target.checked) spread(); else { d.seg = null; re(); } } }), ' Débit de base programmé heure par heure (24 créneaux)']),
      d.seg && d.device !== 'loop' ? h('div', { class: 'sv-prof' }, [
        h('p', { class: 'sv-note' }, 'Débit programmé heure par heure (U/h), de 00 h à 24 h. Total ' + fmt(Y.segTotal(d.seg), 1) + ' U/24 h.'),
        h('div', { class: 'sv-prof-grid' }, d.seg.map((v, i) => h('label', { class: 'sv-prof-c' }, [h('span', null, Y.hourLab(i)), rIn('dtSegH' + i, v, (x) => { d.seg[i] = x; d.basal = Math.round(Y.segTotal(d.seg)); }, 0.05, 'Débit ' + Y.hourLab(i))]))),
        h('div', { class: 'sv-actions' }, [h('button', { type: 'button', class: 'sv-secondary', onclick: () => { d.seg = d.seg.map((x) => Math.round(x * 1.1 * 20) / 20); d.basal = Math.round(Y.segTotal(d.seg)); re(); } }, 'Tout + 10 %'), h('button', { type: 'button', class: 'sv-secondary', onclick: () => { d.seg = d.seg.map((x) => Math.max(0.05, Math.round(x * 0.9 * 20) / 20)); d.basal = Math.round(Y.segTotal(d.seg)); re(); } }, 'Tout − 10 %'), h('button', { type: 'button', class: 'sv-secondary', onclick: spread }, 'Profil type (aube + 20 %)')]),
        h('p', { class: 'sv-note' }, 'En ville, le patient adapte lui-même chaque créneau sur la glycémie du capteur 2 h plus tard, à distance des repas (nuit jusqu\'au petit-déjeuner, fin d\'après-midi ; journée lors d\'un repas sauté) : + 0,05 U/h (0,10 au-delà de 1 U/h) après 3 jours au-dessus de l\'objectif, baisse dès le lendemain d\'un passage sous l\'objectif (double si hypoglycémie) ; plafond + 50 % par créneau (complément, protocole type).')
      ]) : null,
      h('div', { class: 'sv-form' }, [h('div', { class: 'sv-field' }, [h('label', { for: 'dtBolMode' }, 'Bolus'), h('select', { id: 'dtBolMode', onchange: (e) => { d.bolusMode = e.target.value; if (d.bolusMode === 'if' && !d.ratio) { d.ratio = Math.round(500 / tdd * 2) / 2; d.isf = Math.round(18 / tdd * 100) / 100; } re(); } }, [['fixe', 'Doses fixes par repas'], ['if', 'Insulinothérapie fonctionnelle (ratio + correction)']].map(([k, t]) => h('option', { value: k, selected: (d.bolusMode || 'fixe') === k }, t)))])]),
      d.bolusMode === 'if' ? h('div', { class: 'sv-form' }, [
        h('div', { class: 'sv-field' }, [h('label', { for: 'dtRatio' }, 'Ratio : 1 U pour … g de glucides'), rIn('dtRatio', d.ratio, (v) => { d.ratio = v; }, 0.5, 'Ratio glucides')]),
        h('div', { class: 'sv-field' }, [h('label', { for: 'dtIsf' }, 'Sensibilité : 1 U baisse de … g/L'), rIn('dtIsf', d.isf, (v) => { d.isf = v; }, 0.01, 'Sensibilité')]),
        h('p', { class: 'sv-note' }, 'Départ : règle des 500 (ratio ≈ ' + fmt(500 / tdd, 1) + ' g/U) et des 1 800 (sensibilité ≈ ' + fmt(18 / tdd, 2) + ' g/L par U) pour ' + Math.round(tdd) + ' U/j. Repas de référence ≈ 50 / 65 / 60 g ; correction si la glycémie avant le repas dépasse 1,20 g/L. Le ratio se titre sur la glycémie 2 h après les repas (± 10 %).')
      ]) : null
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

  /* ---------- Hospitalisation ---------- */
  function hospForm(d, re) {
    const o = d.hosp, pt = G.pt, W = pt.st.W;
    const sel = (id, label, val, opts, on) => h('div', { class: 'sv-field' }, [h('label', { for: id }, label), h('select', { id, onchange: (e) => { on(e.target.value); } }, opts.map(([k, t]) => h('option', { value: k, selected: String(val) === String(k) }, t)))]);
    const a1c = lastA1c();
    const el = H.eligible(a1c, pt.rx, pt.st.MG);
    if (!el.ok) return h('div', { class: 'sv-hospform' }, [
      h('h3', null, 'Hospitalisation en diabétologie'),
      S.toon('chef', { titre: 'Le chef de service a lu votre demande d\'hospitalisation.' }),
      h('p', { class: 'sv-hospwhy', id: 'dtHospNo' }, 'Hospitalisation refusée : ' + el.why + '. À ce niveau, l\'intensification se fait en ambulatoire (aGLP1 ou tirzépatide, titration de la basale, bolus, éducation, capteur), en consultation ou en téléconsultation. Règle simulée du service : hospitalisation si HbA1c ≥ 10 %, hyperglycémie majeure symptomatique, ou échec du basal-bolus ambulatoire avec HbA1c ≥ 9 %.')
    ]);
    return h('div', { class: 'sv-hospform' }, [
      h('h3', null, 'Hospitalisation en diabétologie'),
      h('p', { class: 'sv-hospok' }, '✓ Admission acceptée : ' + el.why + '.'),
      h('p', { class: 'sv-muted' }, 'Insulinothérapie intensive transitoire par pompe (protocole du service) : débit de base contrôlé toutes les 4 h, augmenté de 20 à 30 % hors de la cible (− 20 % sous la cible, − 30 % et resucrage si hypoglycémie) ; bolus de départ par repas adaptés chaque jour selon le protocole d\'adaptation des doses. À la sortie, relais sous-cutané prérempli dans l\'ordonnance.'),
      a1c >= 10 ? h('p', { class: 'sv-hospwhy' }, 'HbA1c ' + fmt(a1c, 1) + ' % : glucotoxicité probable (sécrétion et sensibilité à l\'insuline freinées). La pompe ramène la glycémie en 4 à 6 jours et lève la glucotoxicité en 2 à 3 semaines, ce que la titration ambulatoire fait en plusieurs mois (Weng 2008 ; Kramer 2013 ; avis d\'expert dans le DT2 ancien).') : h('p', { class: 'sv-muted' }, 'HbA1c ' + fmt(a1c, 1) + ' % : l\'hospitalisation se discute surtout au-delà de 10 %, en cas de catabolisme, ou après un échec de l\'intensification ambulatoire.'),
      h('div', { class: 'sv-form' }, [
        sel('dtHDays', 'Durée du séjour', o.days, [5, 7, 10, 14].map((x) => [x, x + ' jours']), (v) => { o.days = +v; }),
        sel('dtHRate', 'Débit de base initial', o.rate0, [0.5, 0.8, 1, 1.2, 1.5].map((x) => [x, fmt(x, 1) + ' U/h (' + fmt(x * 24, 0) + ' U/24 h)']), (v) => { o.rate0 = +v; }),
        sel('dtHIncr', 'Hausse si au-dessus de la cible (toutes les 4 h)', o.incr, [[0.2, '+ 20 %'], [0.25, '+ 25 %'], [0.3, '+ 30 %']], (v) => { o.incr = +v; }),
        sel('dtHTarget', 'Cible glycémique', o.target, Object.entries(H.TARGETS).map(([k, [a, b]]) => [k, fmt(a, 2) + '–' + fmt(b, 2) + ' g/L' + (k === 'b' ? ' (service)' : '')]), (v) => { o.target = v; }),
        sel('dtHBol', 'Bolus de départ', o.bolusKg, [[0.05, '0,05 U/kg/repas (' + Math.round(0.05 * W) + ' U)'], [0.1, '0,1 U/kg/repas (' + Math.round(0.1 * W) + ' U)'], [0.15, '0,15 U/kg/repas (' + Math.round(0.15 * W) + ' U)']], (v) => { o.bolusKg = +v; })
      ]),
      h('div', { class: 'sv-form' }, [sel('dtHExit', 'Relais à la sortie', o.exit || 'auto', H.EXITS, (v) => { o.exit = v; })]),
      h('p', { class: 'sv-note' }, 'Relais : ADO conservés (metformine, iSGLT2, iDPP4 ; sulfamide arrêté). « Selon le séjour » : sans insuline si les besoins sont faibles (< 0,45 U/kg/j, diabète ≤ 3 ans ; < 1,2 U/kg/j au diagnostic, l\'insuline intensive visant la levée de la glucotoxicité puis l\'arrêt) ; sinon aGLP1 + basale si IMC ≥ 27, ou basale seule. Basale de sortie = 80 % du débit de base des dernières 24 h (Umpierrez, Diabetes Care 2014), 70 % avec un aGLP1. Le basal-bolus n\'est qu\'un choix explicite.'),
      pt.rx.su ? h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'dtHSu', checked: o.stopSu, onchange: (e) => { o.stopSu = e.target.checked; } }), ' Arrêt du sulfamide à l\'entrée']) : null,
      h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'dtHCgm', checked: o.cgm, onchange: (e) => { o.cgm = e.target.checked; } }), ' Pose d\'un capteur de glucose, gardé à la sortie (≥ 3 injections/j : remboursé)']),
      h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', id: 'dtHosp', onclick: hospitalise }, 'Hospitaliser →'))
    ]);
  }

  function hospitalise() {
    const d = G.draft, pt = G.pt, o = Object.assign({}, d.hosp);
    G.undo.push(snapshot());
    const start = pt.day;
    G.history.push({ day: pt.day, prescription: true, rx: 'hospitalisation : pompe à insuline (' + fmt(o.rate0, 1) + ' U/h au départ)' });
    G.visitStart = pt.day;
    const r = H.run(pt, D, Y, o, G.seed);
    const hosp = { start, o: r.o, lo: r.lo, hi: r.hi, hypos: r.hypos, relay: r.relay, W: r.W,
      hours: r.hours.filter((x) => Math.abs(x.t % 0.5) < 1e-9).map((x) => ({ d: x.d, t: x.t, g: Math.round(x.g * 100) / 100, r: x.rate })),
      checks: r.checks.map((c) => ({ d: c.d, t: c.t, label: c.label, g: Math.round(c.g * 100) / 100, rate: c.rate, newRate: c.newRate, act: c.act })),
      days: r.days.map((x) => ({ d: x.d, mg: x.mg, min: x.min, max: x.max, basal24: x.basal24, bol: x.bol, hypo: x.hypo, bolLog: x.bolLog })) };
    // Relais prérempli selon le plan de sortie (H.exitPlan) : ADO conservés, sulfamide arrêté, aGLP1 si prévu,
    // basale à 80 % du débit de base, bolus seulement en basal-bolus ou sous pompe.
    const plan = H.exitPlan(pt, r, o.exit, G.cfg);
    hosp.plan = plan;
    if (o.stopSu) { pt.rx.su = 0; d.su = 0; }
    d.su = 0;
    if (!(d.met > 0) && pt.st.dfg >= 30 && !G.cfg.metIntol) { d.met = 1000; d.metProg = true; }
    if (plan.glp && d.glp === 'none') { d.glp = 'sema'; d.glpDose = D.GLP1.sema.doses[0]; }
    d.device = plan.device; d.basal = plan.device === 'inj' ? plan.basal : plan.pump; d.rapidM = plan.rapidM.slice(); d.rapid = d.rapidM.reduce((a, x) => a + x, 0);
    if (d.basalType === 'nph') d.basalType = 'g100';
    if (plan.ins) { if (d.titr.who === 'none') d.titr.who = 'patient'; if (o.cgm || plan.device === 'loop') { d.cgm = true; d.asg = '0'; G.cgmAcquired = true; } else if (d.asg === '0') d.asg = d.rapid > 0 ? '4' : '1'; }
    else { d.titr.who = 'none'; d.cgm = false; d.asg = '0'; }
    d.mode = 'consult'; d.wait = 4; d.unit = 'sem';
    G.glyDays = []; G.titrState = { above: {} }; G.cgmStart = pt.day;
    G.lastHypo = pt.st.hypo; // hypoglycémies du séjour : dans le compte rendu, pas dans les plaintes
    G.view = null;
    doLabs(new Set(['a1c', 'fpg', 'creat']), 'Hospitalisation en diabétologie · ' + o.days + ' jours', null, { mode: 'hosp', hosp, hospStart: start });
    render();
  }

  // Compte rendu d'hospitalisation : courbe glycémique du séjour, débit de base, bolus, tableau par jour.
  function hospBlock(e) {
    const x = e.hosp, W = x.W;
    const first = x.days.findIndex((q) => q.mg < 1.4);
    const last = x.days[x.days.length - 1];
    const tot = Math.round(last.basal24 + last.bol.reduce((a, b) => a + b, 0));
    return h('div', { class: 'sv-hosp' }, [
      h('div', { class: 'sv-kpis' }, [
        kpi('Séjour', x.o.days + ' j', 'J' + x.start + ' → J' + e.day),
        kpi('Glycémie < 1,40 g/L', first >= 0 ? 'J' + (first + 1) : '—', 'moyenne du jour'),
        kpi('Insuline à la sortie', tot + ' U/j', fmt(tot / W, 2) + ' U/kg/j'),
        kpi('Hypoglycémies', String(x.hypos), x.hypos ? 'resucrées, débit baissé' : 'aucune', x.hypos > 2)
      ]),
      hospChart(x),
      h('div', { class: 'sv-scroll' }, h('table', { class: 'sv-res sv-hosp-t' }, [
        h('thead', null, h('tr', null, ['Jour', 'Débit de base', 'Bolus (P/D/D)', 'Glycémie moyenne', 'Min – max', 'Adaptation des bolus'].map((t) => h('th', null, t)))),
        h('tbody', null, x.days.map((q) => h('tr', { class: q.hypo ? 'sv-row-low' : '' }, [h('td', null, 'J' + (q.d + 1)), h('td', { class: 'sv-v' }, fmt(q.basal24, 0) + ' U/24 h'), h('td', { class: 'sv-v' }, q.bol.join(' / ')), h('td', { class: 'sv-v' }, g2(q.mg)), h('td', { class: 'sv-v' }, fmt(q.min, 2) + ' – ' + fmt(q.max, 2)), h('td', null, (q.hypo ? '⚠ hypoglycémie · ' : '') + (q.bolLog && q.bolLog.length ? q.bolLog.join(', ') : '—'))])))
      ])),
      h('div', { class: 'sv-relay' }, [
        h('h4', null, 'Relais de sortie (prérempli dans l\'ordonnance)'),
        h('p', null, relayText(x)),
        x.plan && x.plan.why ? h('p', { class: 'sv-muted' }, 'Choix automatique : ' + x.plan.why + '.') : null,
        h('p', { class: 'sv-muted' }, 'Insuline des dernières 24 h sous pompe : ' + Math.round(x.plan ? x.plan.tdd : 0) + ' U (' + fmt(x.plan ? x.plan.ukg : 0, 2) + ' U/kg/j). La glucotoxicité finit de se lever dans les 2 à 3 semaines qui suivent : les besoins baissent, attention aux hypoglycémies ; revoir à 2–4 semaines (téléconsultation avec le rapport du capteur si possible).')
      ])
    ]);
  }

  function relayText(x) {
    const p = x.plan;
    if (!p) return 'Basale ' + x.relay.basal + ' U/j · bolus ' + x.relay.rapidM.join(' / ') + ' U.';
    const ado = 'ADO conservés (sulfamide arrêté)';
    return {
      oral: ado + ', sans insuline : surveillance de l\'HbA1c ; insuline courte puis metformine et/ou iDPP4 (essai chinois, ACP Journal Club 2024), rémission possible au diagnostic (Weng 2008).',
      glp: ado + ' + aGLP1 (sémaglutide par paliers), sans insuline : exénatide après insuline intensive, rémission 68 % contre 37 % à 1 an (Shi, Sci Rep 2017).',
      basal: ado + ' + basale ' + p.basal + ' U/j (80 % du débit de base), titrée par le patient ; bolus seulement si la journée reste haute (Umpierrez 2014).',
      basalGlp: ado + ' + aGLP1 (sémaglutide par paliers) + basale ' + p.basal + ' U/j (70 % du débit de base, réduite car l\'aGLP1 diminue les besoins), à baisser quand l\'aGLP1 monte (SFD 2025, avis 16 bis et 19).',
      bb: 'Basal-bolus : basale ' + p.basal + ' U/j, bolus ' + p.rapidM.join(' / ') + ' U (80 % des doses de la pompe ; Umpierrez 2014 : 44 % d\'hypoglycémies avec ce schéma contre 25 à 30 % avec la basale).',
      pump: 'Pompe gardée : débit de base ' + p.pump + ' U/24 h, bolus ' + p.rapidM.join(' / ') + ' U, protocole d\'adaptation.',
      loop: 'Boucle fermée hybride : débit de base ' + p.pump + ' U/24 h au départ puis automatique, bolus ' + p.rapidM.join(' / ') + ' U.'
    }[p.kind] + (x.o.cgm && p.ins ? ' Capteur de glucose gardé.' : '');
  }

  function kpi(label, value, sub, warn) {
    return h('div', { class: 'sv-kpi' + (warn ? ' warn' : '') }, [h('span', { class: 'sv-kpi-l' }, label), h('strong', { class: 'sv-kpi-v' }, value), h('span', { class: 'sv-kpi-s' }, sub)]);
  }

  function hospChart(x) {
    const el = (tag, a, par) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (par) par.appendChild(n); return n; };
    const days = x.days.length, Wd = 720, L = 44, R = 10, top = 14, gh = 170, rt = 212, rh = 64;
    const X = (d, t) => L + (Wd - L - R) * (d * 24 + t) / (days * 24);
    const gmax = Math.max(3, ...x.hours.map((q) => q.g)), Yg = (g) => top + gh * (1 - (g - 0.4) / (gmax - 0.4));
    const rmax = Math.max(2, ...x.hours.map((q) => q.r)) * 1.1, Yr = (r) => rt + rh * (1 - r / rmax);
    const svg = el('svg', { viewBox: '0 0 ' + Wd + ' ' + (rt + rh + 26), class: 'sv-hosp-svg', role: 'img', 'aria-label': 'Glycémies et débit de la pompe pendant le séjour' });
    el('rect', { x: L, y: Yg(x.hi), width: Wd - L - R, height: Yg(x.lo) - Yg(x.hi), class: 'hz-band' }, svg);
    el('line', { x1: L, x2: Wd - R, y1: Yg(0.7), y2: Yg(0.7), class: 'hz-low' }, svg);
    [0.7, 1, 1.8, 2.5].filter((g) => g < gmax).forEach((g) => { const t = el('text', { x: L - 6, y: Yg(g) + 4, class: 'hz-ax', 'text-anchor': 'end' }, svg); t.textContent = fmt(g, g % 1 ? 1 : 0); });
    for (let d = 0; d <= days; d++) {
      el('line', { x1: X(d, 0), x2: X(d, 0), y1: top, y2: rt + rh, class: 'hz-day' }, svg);
      if (d < days) { const t = el('text', { x: X(d, 12), y: rt + rh + 18, class: 'hz-ax', 'text-anchor': 'middle' }, svg); t.textContent = 'J' + (d + 1); }
    }
    el('path', { d: x.hours.map((q, i) => (i ? 'L' : 'M') + X(q.d, q.t).toFixed(1) + ' ' + Yg(q.g).toFixed(1)).join(' '), class: 'hz-g' }, svg);
    x.checks.forEach((c) => { const cl = c.g < 0.7 ? 'low' : c.g < x.lo ? 'under' : c.g > x.hi + (c.t === 15.5 || c.t === 23 ? 0.4 : 0) ? 'high' : 'ok'; const ci = el('circle', { cx: X(c.d, c.t), cy: Yg(c.g), r: 3.4, class: 'hz-ck ' + cl }, svg); const ti = el('title', {}, ci); ti.textContent = 'J' + (c.d + 1) + ' ' + c.label + ' : ' + fmt(c.g, 2) + ' g/L' + (c.act ? ' · ' + c.act : ''); });
    let dr = ''; x.hours.forEach((q, i) => { dr += (i ? 'L' + X(q.d, q.t).toFixed(1) + ' ' + Yr(x.hours[i - 1].r).toFixed(1) + ' L' : 'M') + X(q.d, q.t).toFixed(1) + ' ' + Yr(q.r).toFixed(1) + ' '; });
    el('path', { d: dr, class: 'hz-rate' }, svg);
    x.days.forEach((q) => q.bol.forEach((u, m) => { const t0 = [7.5, 12.5, 19.5][m], bh = Math.min(rh, u * 1.6); el('rect', { x: X(q.d, t0) - 2, y: rt + rh - bh, width: 4, height: bh, class: 'hz-bol' }, svg); }));
    const lab = (t, y, c) => { const n = el('text', { x: L + 4, y, class: 'hz-lab ' + c }, svg); n.textContent = t; };
    lab('Glycémie (g/L) · cible ' + fmt(x.lo, 2) + '–' + fmt(x.hi, 2), top + 11, '');
    lab('Débit de base (U/h, max ' + fmt(rmax / 1.1, 1) + ') · barres : bolus', rt + 10, '');
    return h('div', { class: 'sv-hosp-chart' }, svg);
  }

  // Physiologie du patient (module atlas, js/simu/dt2-physio.js) : bandeau d'ouverture ou module ouvert.
  function physioEntry() {
    if (G.physioOpen && S.dt2physio) return S.dt2physio.card({ G, h, D, Y, train: TRAIN(), rerender: render, onClose: () => { G.physioOpen = false; if (G.physio) G.physio.play = false; render(); } });
    return h('div', { class: 'sv-card sv-physio-entry' }, [
      h('div', null, [h('p', { class: 'sv-eyebrow' }, 'Atlas · physiologie'), h('p', { class: 'sv-physio-lead' }, 'Voir ce que font les traitements chez ce patient : insuline, glucagon, foie, muscle, vidange gastrique, incrétines, glycosurie, centre de la faim, heure par heure et de semaine en semaine.')]),
      h('button', { type: 'button', class: 'sv-primary', id: 'dtPhysioOpen', onclick: () => { G.physioOpen = true; render(); } }, '🫀 Ouvrir la physiologie')
    ]);
  }

  // Correction d'une décision (mode entraînement) : rang du choix dans l'arbre SFD du jour, lecture SFD de
  // l'ordonnance, meilleures options et leur résultat prévu.
  // Adaptations posologiques attendues au moment de la décision (contre-indications, effets indésirables,
  // surtraitement) : chacune est vérifiée sur la nouvelle ordonnance (mode entraînement).
  function adaptNeeds(prev, rx) {
    const pt = G.pt, ev = G.ev, c = G.cfg;
    const e = [...G.history].reverse().find((x) => !x.prescription) || { labs: {} };
    const dfg = e.labs.dfg != null ? e.labs.dfg : pt.st.dfg, a1c = lastA1c(), T = goalT();
    const hy = e.hypoN || 0, sev = e.sevN || 0, ins = (r) => bas(r) + (r.rapid || 0);
    const N = [];
    const need = (kind, what, why, ok, src) => N.push({ kind, what, why, done: !!ok, src });
    // Metformine : DFG, intolérance digestive.
    if (prev.met > 0 && dfg < 30) need('stop', 'arrêter la metformine', 'DFG ' + Math.round(dfg) + ' < 30 : contre-indication (acidose lactique)', !(rx.met > 0), 'avis 12 bis');
    else if (prev.met > 1000 && dfg < 45) need('reduce', 'metformine ≤ 1000 mg/j', 'DFG ' + Math.round(dfg) + ' entre 30 et 44', rx.met <= 1000, 'avis 12 bis');
    else if (prev.met > 2000 && dfg < 60) need('reduce', 'metformine ≤ 2000 mg/j', 'DFG ' + Math.round(dfg) + ' entre 45 et 59', rx.met <= 2000, 'avis 12 bis');
    if (prev.met > 0 && !pt.take.met && !(dfg < 30)) need('reduce', 'metformine : reprise à plus faible dose et progressive (ou arrêt)', 'intolérance digestive : le patient l\'a arrêtée', rx.met < prev.met || (rx.met > 0 && G.draft.metProg), 'avis 6');
    // iDPP4 : dose selon le DFG ; pancréatite.
    if (prev.dpp4 > 50 && dfg < 45 && dfg >= 30) need('reduce', 'sitagliptine 50 mg/j', 'DFG ' + Math.round(dfg) + ' entre 30 et 44', rx.dpp4 <= 50, 'RCP');
    if (prev.dpp4 > 25 && dfg < 30) need('reduce', 'sitagliptine 25 mg/j', 'DFG ' + Math.round(dfg) + ' < 30', rx.dpp4 <= 25, 'RCP');
    if (ev.panc && (prev.dpp4 > 0 || prev.glp !== 'none' || rx.dpp4 > 0 || rx.glp !== 'none')) need('stop', 'arrêter définitivement les incrétines (iDPP4, aGLP1)', 'pancréatite aiguë', !(rx.dpp4 > 0) && rx.glp === 'none', 'RCP');
    // aGLP1 : vomissements.
    if (prev.glp !== 'none' && !pt.take.glp) need('reduce', 'aGLP1 : redescendre d\'un palier (ou arrêter)', 'vomissements : le patient ne fait plus l\'injection', rx.glp === 'none' || D.GLP1[rx.glp].doses.indexOf(rx.glpDose) < D.GLP1[prev.glp].doses.indexOf(prev.glpDose) || rx.glp !== prev.glp, 'avis 6 bis');
    // Sulfamide : hypoglycémies, insuline, sujet âgé, insuffisance rénale sévère.
    if (prev.su > 0) {
      const ger = c.age >= 75 && c.geria && c.geria !== 'bonne';
      if (sev > 0 || ger || (dfg < 30 && prev.suType !== 'repa') || ins(rx) > 0) need('stop', 'arrêter le sulfamide', sev > 0 ? 'hypoglycémie sévère' : ger ? 'personne âgée ' + c.geria : dfg < 30 ? 'DFG < 30' : 'pas de sulfamide sous insuline', !(rx.su > 0), sev > 0 ? 'avis 10' : ger ? 'avis 21 bis' : ins(rx) > 0 ? 'avis 18 ter' : 'avis 12 bis');
      else if (hy > 0) need('reduce', 'baisser ou arrêter le sulfamide', hy + ' hypoglycémie' + (hy > 1 ? 's' : '') + ' depuis le dernier bilan', rx.su < prev.su, 'avis 10');
    }
    // Insuline : hypoglycémies (sans sulfamide en cause), surtraitement.
    if (ins(prev) > 0 && !(prev.su > 0) && (sev > 0 || hy >= 3)) need('reduce', 'baisser l\'insuline (≈ 10 à 20 %) et en chercher la cause', sev > 0 ? 'hypoglycémie sévère' : hy + ' hypoglycémies depuis le dernier bilan', ins(rx) <= ins(prev) * 0.92, 'avis 18');
    if (T.floor && a1c < T.floor && (prev.su > 0 || ins(prev) > 0)) need('reduce', 'désescalader (sulfamide ou insuline)', 'HbA1c ' + fmt(a1c, 1) + ' % sous le plancher de ' + fmt(T.floor, 1) + ' % (surtraitement, risque d\'hypoglycémie)', rx.su < prev.su || ins(rx) < ins(prev), 'avis 21 bis');
    // Baisses ou arrêts sans motif apparent.
    const motive = N.length > 0 || a1c < T.max - 1;
    const drops = [];
    if (prev.met > 0 && rx.met < prev.met && !N.some((n) => /metformine/.test(n.what))) drops.push('metformine');
    if (prev.glp !== 'none' && rx.glp === 'none' && !N.some((n) => /aGLP1|incrétines/.test(n.what))) drops.push('aGLP1');
    if (prev.sglt2 !== 'none' && rx.sglt2 === 'none' && !ev.keto) drops.push('iSGLT2');
    if (prev.dpp4 > 0 && !(rx.dpp4 > 0) && rx.glp === 'none' && !N.some((n) => /sitagliptine|incrétines/.test(n.what))) drops.push('iDPP4');
    return { needs: N, drops: motive ? [] : drops };
  }

  function makeDebrief(T, prev, rx, a1c) {
    const ids = [];
    const on = (r, k) => (k === 'glp' ? r.glp !== 'none' : k === 'sglt2' ? r.sglt2 !== 'none' : (r[k] || 0) > 0);
    if (!on(prev, 'sglt2') && on(rx, 'sglt2')) ids.push(prev.met === 0 && rx.met > 0 ? 'metSglt2' : 'sglt2');
    if (rx.glp === 'tirz' && prev.glp !== 'tirz') ids.push('tirz');
    else if (!on(prev, 'glp') && on(rx, 'glp')) ids.push(prev.met === 0 && rx.met > 0 ? 'metGlp' : 'sema');
    if (!on(prev, 'dpp4') && on(rx, 'dpp4')) ids.push('dpp4');
    if (!on(prev, 'su') && on(rx, 'su')) ids.push('su');
    if (rx.met > prev.met) ids.push(prev.met >= 2000 ? 'met3' : 'met');
    if (!(bas(prev) > 0) && bas(rx) > 0) ids.push('basal'); else if (bas(rx) > bas(prev)) ids.push('basalUp');
    const nb = (r) => (r.rapidM || []).filter((u) => u > 0).length;
    if (nb(rx) > nb(prev)) ids.push(nb(rx) >= 3 && nb(prev) === 0 ? 'bb' : 'bolus');
    const rhd = ['act', 'sodaStop', 'wtGoal', 'diet'].some((k) => rx[k] && rx[k] !== prev[k]);
    if (!ids.length && rhd) ids.push('rhd');
    const same = rxLabel(prev) === rxLabel(rx);
    if (same) ids.push('none');
    const match = T.branches.filter((b) => ids.includes(b.o.id)).sort((a2, b2) => a2.r - b2.r)[0] || null;
    const A = SFD.advise({ c: G.cfg, rx, dfg: G.pt.st.dfg, a1c, W: G.pt.st.W, hypos: G.pt.st.hypo, sevHypo: G.pt.st.hypoSev > 0, starts: G.starts, day: G.pt.day, ppr: G.ev.ppr != null, cgm: G.draft.cgm, titr: G.draft.titr, goal: G.goal, asg: G.draft.asg, fpg: null });
    const stops = A.items.filter((x) => x.lvl === 'stop'), warns = A.items.filter((x) => x.lvl === 'warn');
    const r = match ? match.r : null;
    const AD = adaptNeeds(prev, rx);
    const missStop = AD.needs.filter((n) => !n.done && n.kind === 'stop'), missRed = AD.needs.filter((n) => !n.done && n.kind === 'reduce');
    const adaptOnly = !match || match.o.id === 'none';
    let v = stops.length || missStop.length ? ['bad', 'Erreur'] : r === 1 ? ['good', 'Conforme (rang 1, recommandé)'] : r === 2 ? ['ok', 'Acceptable (rang 2)'] : r != null ? ['warn', 'À revoir (rang ' + r + ' : ' + S.dt2tree.RANK[r] + ')'] : warns.length ? ['warn', 'À revoir'] : ['ok', 'Hors des options de l\'arbre'];
    if (v[0] !== 'bad' && missRed.length && (v[0] === 'good' || v[0] === 'ok')) v = ['warn', 'À revoir (adaptation posologique manquante)'];
    if (v[0] !== 'bad' && adaptOnly && AD.needs.length && !missRed.length) v = warns.length ? ['ok', 'Adaptation posologique conforme, mais des points SFD restent à traiter'] : ['good', 'Adaptation posologique conforme'];
    if (v[0] === 'good' && AD.drops.length) v = ['warn', 'À revoir (arrêt ou baisse sans motif)'];
    const pick = (b) => ({ name: b.o.name, r: b.r, why: b.why, src: b.src, a1c: b.res.a1c, dW: b.res.dW, hypo: b.res.hypo });
    return { day: G.pt.day, a1c, cls: v[0], label: v[1], rank: r, prev: rxLabel(prev), choice: rxLabel(rx), chosen: match ? pick(match) : null, best: T.branches.slice(0, 3).map(pick), stops: stops.map((x) => x.t), warns: warns.map((x) => x.t), target: T.T.max, needs: AD.needs, drops: AD.drops };
  }

  function debriefBlock(b, e) {
    const g1 = (v) => fmt(v, 1);
    const res = (x) => 'HbA1c ' + g1(x.a1c) + ' % à 6 mois, poids ' + (x.dW >= 0 ? '+' : '') + g1(x.dW) + ' kg' + (x.hypo ? ', ' + x.hypo + ' hypoglycémie' + (x.hypo > 1 ? 's' : '') : '');
    return h('details', { class: 'sv-debrief sv-debrief-' + b.cls, open: true }, [
      h('summary', null, 'Correction de votre décision du J' + b.day + ' : ' + b.label),
      h('p', null, [h('strong', null, 'Votre ordonnance : '), b.choice + (b.prev === b.choice ? ' (inchangée)' : '') + '.']),
      b.chosen ? h('p', null, [h('strong', null, 'Dans l\'arbre SFD de ce jour : '), b.chosen.name + ' — rang ' + b.chosen.r + ', ' + b.chosen.why + ' (prévu : ' + res(b.chosen) + ').']) : null,
      h('p', null, h('strong', null, 'Les meilleures options ce jour-là (HbA1c ' + g1(b.a1c) + ' %, cible ≤ ' + g1(b.target) + ' %) :')),
      h('ol', { class: 'sv-debrief-l' }, b.best.map((x) => h('li', null, x.name + ' — rang ' + x.r + ' (' + S.dt2tree.RANK[x.r] + ') : ' + x.why + ' ; prévu : ' + res(x) + '.'))),
      b.needs && b.needs.length ? h('p', null, h('strong', null, 'Adaptation posologique (contre-indications, effets indésirables, surtraitement) :')) : null,
      b.needs && b.needs.length ? h('ul', { class: 'sv-sfd-l' }, b.needs.map((n) => h('li', { class: n.done ? 'sv-sfd-ok' : n.kind === 'stop' ? 'sv-sfd-stop' : 'sv-sfd-warn' }, (n.done ? '✓ fait : ' : n.kind === 'stop' ? '⛔ manquant : ' : '⚠ manquant : ') + n.what + ' — ' + n.why + ' (' + (n.src.startsWith('avis') ? 'SFD 2025, ' : '') + n.src + ').'))) : null,
      b.drops && b.drops.length ? h('p', { class: 'sv-sfd-warn' }, '⚠ Arrêt ou baisse sans motif apparent : ' + b.drops.join(', ') + ' (traitement efficace et toléré, HbA1c pas très en dessous de la cible).') : null,
      b.stops.length || b.warns.length ? h('p', null, h('strong', null, 'Lecture SFD de votre ordonnance :')) : h('p', { class: 'sv-muted' }, 'Lecture SFD : pas d\'erreur ni de point d\'alerte sur cette ordonnance.'),
      b.stops.length || b.warns.length ? h('ul', { class: 'sv-sfd-l' }, b.stops.map((t) => h('li', { class: 'sv-sfd-stop' }, '⛔ ' + t)).concat(b.warns.map((t) => h('li', { class: 'sv-sfd-warn' }, '⚠ ' + t)))) : null,
      e.labs.a1c != null ? h('p', null, [h('strong', null, 'Résultat obtenu : '), 'HbA1c ' + g1(b.a1c) + ' → ' + g1(e.labs.a1c) + ' %.']) : null
    ]);
  }

  // Parcours : toutes les rencontres, cliquables.
  function journeyCard() {
    const list = G.history.filter((x) => !x.prescription);
    const cur = G.view != null && list[G.view] ? G.view : list.length - 1;
    const T = goalT();
    const db = list.filter((e) => e.debrief).map((e) => e.debrief.cls);
    const score = G.cfg.mode === 'entrainement' && db.length ? h('p', { class: 'sv-score', id: 'dtScore' }, 'Entraînement · ' + db.length + ' décision' + (db.length > 1 ? 's' : '') + ' : ' + db.filter((c) => c === 'good').length + ' conforme(s), ' + db.filter((c) => c === 'ok').length + ' acceptable(s), ' + db.filter((c) => c === 'warn').length + ' à revoir, ' + db.filter((c) => c === 'bad').length + ' erreur(s)' + (G.trainDone ? ' · aides affichées' : '')) : null;
    return h('div', { class: 'sv-card sv-journey' }, [
      h('p', { class: 'sv-eyebrow' }, 'Parcours du patient' + (G.cfg.mode === 'entrainement' ? ' · mode entraînement' : '')),
      score,
      h('div', { class: 'sv-jtrack' }, list.map((e, i) => {
        const M = MODE_OF[e.mode] || MODE_OF.consult, a = e.labs.a1c;
        return h('button', { type: 'button', class: 'sv-jitem sv-mode-' + (e.mode || 'consult') + (i === cur ? ' on' : '') + (e.event ? ' ev' : ''), 'aria-pressed': String(i === cur), title: (e.note || '') + (e.event ? ' · ' + e.event : ''), onclick: () => { G.view = i === list.length - 1 ? null : i; render(); } }, [
          h('span', { class: 'sv-jic', 'aria-hidden': 'true' }, e.event ? '⚠' : M.icon),
          h('span', { class: 'sv-jday' }, 'J' + e.day),
          h('span', { class: 'sv-ja1c' + (a != null && a > T.max ? ' hi' : '') }, a != null ? fmt(a, 1) + ' %' : '—')
        ]);
      }))
    ]);
  }

  function latestCard() {
    const list = G.history.filter((x) => !x.prescription);
    const e = G.view != null && list[G.view] ? list[G.view] : list[list.length - 1];
    const old = e !== list[list.length - 1];
    const M = MODE_OF[e.mode] || MODE_OF.consult;
    const rows = [];
    const T = e.T;
    if (e.labs.a1c != null) rows.push(['HbA1c', fmt(e.labs.a1c, 1) + ' %', (T.chosen ? 'objectif fixé ≤ ' : 'cible ≤ ') + fmt(T.max, 1) + ' %' + (T.floor ? ', > ' + fmt(T.floor, 1) + ' %' : '') + (T.chosen ? '' : ' (SFD 2025)'), e.labs.a1c > T.max || (T.floor && e.labs.a1c < T.floor)]);
    if (e.labs.fpg != null) rows.push(['Glycémie à jeun', g2(e.labs.fpg), '0,70–1,10 g/L', e.labs.fpg > 1.26 || e.labs.fpg < 0.7]);
    if (e.labs.dfg != null) rows.push(['DFG (CKD-EPI)', fmt(e.labs.dfg, 0) + ' mL/min/1,73 m²', '> 60', e.labs.dfg < 60]);
    return h('div', { class: 'sv-card sv-latest' }, [
      h('div', { class: 'sv-latest-head' }, [h('span', { class: 'sv-mode-ic sv-mode-' + (e.mode || 'consult'), 'aria-hidden': 'true' }, M.icon), h('div', null, [h('p', { class: 'sv-eyebrow' }, e.note || 'Bilan'), h('h1', null, e.hosp ? 'J' + e.hospStart + ' → ' + dayLabel(e.day) : dayLabel(e.day))])]),
      old ? h('p', { class: 'sv-oldview' }, ['Rencontre antérieure. ', h('button', { type: 'button', class: 'sv-linkbtn', onclick: () => { G.view = null; render(); } }, 'Revenir à la dernière')]) : null,
      e.hosp ? hospBlock(e) : null,
      e.debrief && G.cfg.mode === 'entrainement' ? debriefBlock(e.debrief, e) : null,
      e.event ? h('p', { class: 'sv-event' }, e.event) : null,
      e.banner ? h('p', { class: 'sv-banner' }, '⚠ ' + e.banner) : null,
      e.toon ? S.toon(e.toon, { epitaphe: e.epitaphe, titre: TOON_CAPTION[e.caption || e.toon] }) : null,
      rows.length ? h('table', { class: 'sv-res sv-big' }, [h('thead', null, h('tr', null, [h('th', null, 'Examen'), h('th', null, 'Résultat'), h('th', null, 'Référence')])), h('tbody', null, rows.map(([a, b, c2, flag]) => h('tr', null, [h('td', null, a), h('td', { class: 'sv-v' + (flag ? ' hi' : '') }, b), h('td', { class: 'sv-ref' }, c2)])))]) : null,
      e.q.length ? h('dl', { class: 'sv-exam sv-qual' }, e.q.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)])) : null,
      h('p', { class: 'sv-clin' }, (e.mode === 'tele' ? 'Téléconsultation (vidéo) : poids déclaré ' + fmt(Math.round(e.w), 0) + ' kg, pas d\'examen clinique, PA non mesurée · ' : 'Poids ' + fmt(e.w, 1) + ' kg (IMC ' + fmt(e.bmi, 1) + ') · PA ' + e.sbp + ' mmHg · ') + (e.symptoms.length ? e.symptoms.join(' ; ') : 'pas de plainte particulière') + '.'),
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
    const read = Y.interpretCarnet(e.carnet, prot, { basal: bas(G.pt.rx), basalUkg: e.ukg, a1c: e.labs.a1c });
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
      h('div', { class: 'sv-card-head' }, [h('h3', null, 'Évolution'), TRAIN() ? null : h('label', { class: 'sv-check sv-small' }, [h('input', { type: 'checkbox', id: 'dtTruth', checked: G.truth, onchange: (e) => { G.truth = e.target.checked; render(); } }), ' Afficher la courbe réelle (entre les bilans)'])]),
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

  // Arbre des décisions : options classées selon la SFD 2025 et simulées 6 mois (js/simu/dt2-tree.js).
  function treeCard() {
    const body = h('div', { class: 'sv-tree' }, h('p', { class: 'sv-note' }, 'Calcul en cours…'));
    let done = false;
    const det = h('details', { class: 'sv-card sv-det', ontoggle: () => {
      if (!det.open || done) return;
      done = true;
      setTimeout(() => {
        const T = S.dt2tree.build(G.pt, G.cfg);
        const g1 = (v) => fmt(v, 1);
        const res = (r) => h('span', { class: 'sv-tr-res' }, [h('b', null, 'HbA1c ' + g1(r.a1c) + ' %'), ' · poids ' + (r.dW >= 0 ? '+' : '') + g1(r.dW) + ' kg' + (r.hypo ? ' · ' + r.hypo + ' hypoglycémie' + (r.hypo > 1 ? 's' : '') + (r.sev ? ' dont ' + r.sev + ' sévère' + (r.sev > 1 ? 's' : '') : '') : '') + (r.basal ? ' · basale ' + r.basal + ' U' : '') + (r.rapid ? ' + bolus ' + r.rapid + ' U' : '')]);
        body.textContent = '';
        body.append(
          h('p', { class: 'sv-tr-root' }, ['Aujourd\'hui : HbA1c ' + g1(T.a1c) + ' %, cible ≤ ' + g1(T.T.max) + ' %' + (T.T.floor ? ' (pas sous ' + g1(T.T.floor) + ' %)' : '') + ' · traitement : ' + rxLabel(G.pt.rx) + '.']),
          h('ol', { class: 'sv-tr' }, T.branches.map((b) => h('li', { class: 'sv-tr-b sv-tr-r' + b.r }, [
            h('div', { class: 'sv-tr-head' }, [h('span', { class: 'sv-tr-rank' }, b.r + ' · ' + S.dt2tree.RANK[b.r]), h('span', { class: 'sv-tr-name' }, b.o.name)]),
            h('p', { class: 'sv-tr-why' }, [b.why + ' ', h('span', { class: 'sv-src' }, '(' + (b.src.startsWith('HAS') ? '' : 'SFD 2025, ') + b.src + ')')]),
            h('p', null, ['À 6 mois : ', res(b.res)]),
            b.next ? h('div', { class: 'sv-tr-next sv-tr-r' + b.next.r }, [h('p', null, [h('span', { class: 'sv-tr-rank' }, 'puis'), ' ' + b.next.o.name + ' — ' + b.next.why]), h('p', null, ['À 12 mois : ', res(b.next.res)])]) : null
          ])))
        );
      }, 20);
    } }, [
      h('summary', null, 'Arbre des décisions pour ce patient'),
      h('p', { class: 'sv-note' }, 'Chaque option possible aujourd\'hui, de la meilleure à la pire selon la SFD 2025, avec ce que le modèle prévoit à 6 mois pour ce patient (observance bonne, aGLP1 par paliers mensuels, insuline instaurée titrée sur la glycémie à jeun) ; pour les trois meilleures branches encore au-dessus de la cible, l\'étape suivante la mieux classée, à 12 mois. Couleurs : vert recommandé, bleu acceptable, gris possible, orange à éviter, rouge erreur.'),
      body
    ]);
    return det;
  }

  // Guide du modèle : ce que fait chaque traitement et chaque situation (js/simu/dt2-guide.js).
  function guideCard() {
    const GU = S.dt2guide;
    return h('details', { class: 'sv-card sv-det' }, [
      h('summary', null, 'Guide du modèle : traitements et situations'),
      h('h4', null, 'Le cœur du modèle'),
      h('ul', { class: 'sv-keys' }, GU.CORE.map((t) => h('li', null, t))),
      ...GU.TREATMENTS.map((t) => h('details', { class: 'sv-det sv-how' }, [h('summary', null, t.name), h('dl', { class: 'sv-exam sv-qual' }, [
        ['Dans le modèle', t.how(D.P, D.GLP1)], ['Ce qui module la réponse', t.mod], ['Ce que l\'on obtient', t.expect], ['Tolérance, événements', t.safety], ['Repères de calage', t.refs]
      ].flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)]))])),
      h('h4', null, 'Situations'),
      h('dl', { class: 'sv-exam sv-qual' }, GU.SITUATIONS.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)])),
      h('p', { class: 'sv-note' }, 'Patient moyen, observance bonne ; en mode patient réel, chaque patient s\'en écarte. Version détaillée, arbres de six patients types et enchaînements simulés : docs/guide-modele-dt2.md.')
    ]);
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

  /* ---------- Schéma dynamique seul (onglet Physiologie, #physio) ---------- */
  // Patient type choisi parmi les situations de départ et les diabètes atypiques ; pas de dossier, pas de consultation.
  let PH = null, phPick = 'basal_bolus';
  function physio() {
    G = null;
    statusEl.hidden = true;
    main.textContent = '';
    main.className = 'sv-main sv-home ph-standalone';
    const opts = STAGES.map((x) => ({ id: x.id, label: x.label, cfg: { stage: x.id, a1c: x.a1c, duration: x.dur }, rx: x.rx })).concat(PRESETS.map((p, i) => ({ id: 'pre' + i, label: p.label, cfg: p.cfg, rx: () => null })));
    const o = opts.find((x) => x.id === phPick) || opts[0];
    if (!PH || PH.pick !== o.id) {
      const c = Object.assign({}, BASE, o.cfg);
      c.rx0 = o.rx(c.weight);
      const pt = D.create(c);
      const r0 = Object.assign({}, D.RX0, o.rx(c.weight) || {});
      r0.rapidM = (r0.rapidM || [0, 0, 0]).slice(); r0.rapid = r0.rapidM.reduce((a, x) => a + x, 0);
      Object.assign(pt.rx, r0);
      const onIns = r0.basal > 0 || r0.rapid > 0;
      PH = { pick: o.id, cfg: c, pt, history: [], seed: 20240611, titr: { who: onIns ? 'patient' : 'none', prof: 'std', delai: 3, sfd10: false } };
      PH.titr.obj = JSON.parse(JSON.stringify(Y.PROTO.std)); PH.titr.bolusCtl = 'next';
    }
    const groups = [...new Set(STAGES.map((x) => x.g))];
    const chip = (x) => h('button', { type: 'button', class: 'sv-chip' + (x.id === PH.pick ? ' on' : ''), 'aria-pressed': String(x.id === PH.pick), onclick: () => { phPick = x.id; physio(); } }, x.label);
    main.append(
      h('section', { class: 'sv-intro' }, [
        h('p', { class: 'sv-eyebrow' }, 'Physiologie du glucose · schéma dynamique'),
        h('h1', null, 'Voir ce que font les traitements, organe par organe.'),
        h('p', { class: 'sv-lead' }, 'Choisissez un patient type, cochez ou décochez les traitements, simulez un événement (activité, repas, alcool, infection, hypoglycémie) et faites défiler la journée. Pour suivre un patient sur des mois, utilisez l\'onglet Diabète de type 2.')
      ]),
      h('section', { class: 'sv-card' }, [
        h('h3', null, 'Patient type'),
        h('div', { class: 'sv-stages' }, groups.map((gname) => h('div', { class: 'sv-stage-g' }, [h('p', { class: 'sv-stage-h' }, gname), h('div', { class: 'sv-chips' }, opts.filter((x) => (STAGES.find((y) => y.id === x.id) || {}).g === gname).map(chip))]))
          .concat([h('div', { class: 'sv-stage-g' }, [h('p', { class: 'sv-stage-h' }, 'Diabètes atypiques'), h('div', { class: 'sv-chips' }, opts.filter((x) => x.id.startsWith('pre')).map(chip))])])),
        h('p', { class: 'sv-note' }, 'Homme de 56 ans, 98 kg (IMC 33), sauf diabètes atypiques ; HbA1c et ancienneté typiques de la situation.')
      ]),
      S.dt2physio.card({ G: PH, h, D, Y, train: false, rerender: physio, onClose: () => { PH = null; physio(); } })
    );
  }

  S.dt2ui = { setup, physio };
})();
