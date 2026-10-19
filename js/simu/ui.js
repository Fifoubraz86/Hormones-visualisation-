/*
 * Patient virtuel : déroulé des consultations, ordonnance, correction et débriefing.
 * Première consultation : accueil et interrogatoire → examen → bilan → diagnostic → prescription.
 * Suivi : nouvelles du patient et résultats → prescription. Le temps avance jusqu'au contrôle choisi ;
 * un événement intercurrent peut imposer une consultation non programmée.
 */
(function () {
  'use strict';
  const S = window.HV.simu;
  const M = S.model, RU = S.rules;
  const fmt = RU.fmt;
  const main = document.getElementById('svMain');
  const statusEl = document.getElementById('svStatus');
  const homeBtn = document.getElementById('svHome');
  let g = null;

  /* ---------- DOM ---------- */
  function h(tag, attrs, kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    (Array.isArray(kids) ? kids : kids != null ? [kids] : []).forEach((c) => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return e;
  }
  const ICON = { good: '✓', warn: '!', bad: '✗', info: 'i' };
  const TONE = { good: 'Correct', warn: 'Discutable', bad: 'Erreur', info: 'Pour info' };
  function feedbackList(items) {
    return h('ul', { class: 'sv-fb' }, items.map((f) => h('li', { class: 'sv-fb-' + f.tone }, [
      h('span', { class: 'sv-fb-ic', 'aria-label': TONE[f.tone], title: TONE[f.tone] }, ICON[f.tone]),
      h('span', { class: 'sv-fb-t' }, [f.text, f.src ? h('span', { class: 'sv-src' }, ' · ' + f.src) : null, RU.penalty(f) > 0 ? h('span', { class: 'sv-pen' }, ' −' + fmt(RU.penalty(f), RU.penalty(f) % 1 ? 1 : 0)) : null])
    ])));
  }
  const weekLabel = (day) => 'S' + fmt(day / 7, day % 7 ? 1 : 0) + ' · J' + day;

  /* ---------- Accueil : choix du patient ---------- */
  function home() {
    g = null;
    statusEl.hidden = true; homeBtn.hidden = true;
    main.textContent = '';
    main.className = 'sv-main sv-home';
    main.append(
      h('section', { class: 'sv-intro' }, [
        h('p', { class: 'sv-eyebrow' }, 'Simulateur didactique'),
        h('h1', null, 'Un patient vient vous voir. À vous de le traiter.'),
        h('p', { class: 'sv-lead' }, 'Interrogez, examinez, prescrivez le bilan, posez le diagnostic, puis initiez et adaptez le traitement au fil des consultations. Le patient évolue selon vos décisions ; chacune est corrigée.'),
        h('div', { class: 'sv-axes', role: 'group', 'aria-label': 'Axe' }, [
          h('span', { class: 'sv-axis on' }, 'Axe thyréotrope'),
          h('span', { class: 'sv-axis', title: 'À venir' }, 'Axe corticotrope · bientôt'),
          h('span', { class: 'sv-axis', title: 'À venir' }, 'Glycémie · bientôt')
        ])
      ]),
      h('section', { class: 'sv-cases' }, S.CASES.map((cs) => h('button', { type: 'button', class: 'sv-case', onclick: () => start(cs) }, [
        h('span', { class: 'sv-case-top' }, [h('span', { class: 'sv-tag' }, cs.kind === 'basedow' ? 'Hyperthyroïdie' : 'Hypothyroïdie'), h('span', { class: 'sv-level' }, cs.level)]),
        h('span', { class: 'sv-case-t' }, cs.title),
        h('span', { class: 'sv-case-p' }, cs.patient.name + ', ' + cs.patient.age + ' ans'),
        h('span', { class: 'sv-case-d' }, cs.tagline)
      ]))),
      h('p', { class: 'sv-disc' }, 'Modèle pédagogique simplifié : cinétiques et valeurs sont illustratives. Sémiologie d\'après le Polycopié de sémiologie endocrinienne du CEEDMM ; conduite thérapeutique marquée « complément » (consensus SFE 2016 sur la maladie de Basedow, recommandations usuelles sur la lévothyroxine, RCP). Ne remplace pas un avis médical.')
    );
    window.scrollTo(0, 0);
  }

  /* ---------- Partie ---------- */
  function start(cs) {
    const pt = M.create({ par: cs.par, rx0: cs.rx0 });
    g = {
      case: cs, pt, mode: cs.kind === 'basedow' || cs.kind === 'subclin' ? cs.kind : 'lt4',
      visits: [], current: null, advice: new Set(), asked: new Set(), fired: new Set(),
      pen: 0, stableCount: 0, planned: null
    };
    if (cs.rx0 && cs.rx0.lt4) pt.flags.lt4Started = true;
    newVisit('initial');
  }

  function addItems(items) {
    items.forEach((f) => { g.pen += RU.penalty(f); });
    g.current.feedback.push(...items);
  }

  function newVisit(type, evt) {
    const v = { n: g.visits.length + 1, day: g.pt.day, type, event: evt || null, stage: 0, labs: {}, results: [], feedback: [], asked: new Set(), tests: new Set(), dx: null, done: false };
    g.current = v;
    v.exam = g.case.exam(g);
    v.clinic = M.clinic(g.pt);
    v.symptoms = M.symptoms(g.pt);
    if (type === 'initial' && g.case.courrier && g.case.courrier.labs) Object.assign(v.labs, g.case.courrier.labs);
    if (type === 'follow' && g.planned) runTests(v, g.planned.tests);
    if (type === 'event' && evt && evt.results) runTests(v, new Set(evt.results));
    if (g.pt.flags.raiDone && 16 * g.pt.st.T4 < 12) g.mode = 'lt4';
    render();
  }

  /* ---------- Examens ---------- */
  function runTests(v, tests) {
    const cs = g.case, pt = g.pt;
    const m = M.measure(pt);
    const st = cs.static || {};
    const val = (k, def) => { const x = st[k]; return typeof x === 'function' ? x(g) : x != null ? x : def; };
    const rows = [];
    const order = Object.keys(RU.TESTS);
    order.filter((k) => tests.has(k)).forEach((k) => {
      const T = RU.TESTS[k];
      let value, ref = '', flag = '';
      if (k === 'tsh') { value = (m.tsh < 0.01 ? '< 0,01' : fmt(m.tsh, m.tsh < 1 ? 2 : m.tsh < 10 ? 2 : 1)) + ' mUI/L'; ref = '0,4–4'; flag = m.tsh < 0.4 ? 'bas' : m.tsh > 4 ? 'haut' : ''; v.labs.tsh = m.tsh; }
      else if (k === 't4') { value = fmt(m.t4, 1) + ' pmol/L'; ref = '12–22'; flag = m.t4 < 12 ? 'bas' : m.t4 > 22 ? 'haut' : ''; v.labs.t4 = m.t4; }
      else if (k === 't3') { value = fmt(m.t3, 1) + ' pmol/L'; ref = '3,1–6,8'; flag = m.t3 < 3.1 ? 'bas' : m.t3 > 6.8 ? 'haut' : ''; v.labs.t3 = m.t3; }
      else if (k === 'trab') {
        if (pt.par.trab > 0) { value = fmt(m.trab, 1) + ' UI/L'; flag = m.trab > 1.8 ? 'positif' : ''; v.labs.trab = m.trab; }
        else value = '< 0,8 UI/L (négatifs)';
        ref = '< 1,8 (selon la trousse)';
      } else if (k === 'nfs') {
        const extra = st.nfs ? st.nfs + ' ; ' : '';
        value = (m.pnn < 1.5 ? '' : extra) + 'PNN ' + fmt(m.pnn, 2) + ' G/L'; ref = 'PNN 1,5–7'; flag = m.pnn < 0.5 ? 'agranulocytose' : m.pnn < 1.5 ? 'bas' : ''; v.labs.pnn = m.pnn;
      } else if (k === 'tpo') { value = val('tpo', 'négatifs'); if (/positif|élevés/.test(value)) g.tpoKnown = true; }
      else if (k === 'cortisol') { value = val('cortisol', '430 nmol/L à 8 h (normal)'); g.cortisolKnown = true; }
      else if (k === 'hcg') value = val('hcg', cs.patient.sex === 'M' ? 'non pertinentes' : 'négatifs');
      else if (k === 'irm') value = val('irm', 'hypophyse normale');
      else if (k === 'hepat') value = val('hepat', 'normal');
      else if (k === 'ca') value = val('ca', '2,36 mmol/L (normale)');
      else value = val(k, 'sans particularité');
      rows.push({ k, label: T.label, value, ref, flag });
    });
    v.results = rows;
  }

  function resultsTable(rows) {
    if (!rows.length) return h('p', { class: 'sv-muted' }, 'Aucun examen.');
    return h('table', { class: 'sv-res' }, [
      h('thead', null, h('tr', null, [h('th', null, 'Examen'), h('th', null, 'Résultat'), h('th', null, 'Référence')])),
      h('tbody', null, rows.map((r) => h('tr', { class: r.flag ? 'flag' : '' }, [h('td', null, r.label), h('td', null, [r.value, r.flag ? h('span', { class: 'sv-flag' }, ' ' + r.flag) : null]), h('td', { class: 'sv-ref' }, r.ref)])))
    ]);
  }

  /* ---------- Rendu ---------- */
  function render() {
    const cs = g.case, pt = g.pt;
    statusEl.hidden = false; homeBtn.hidden = false;
    statusEl.textContent = cs.patient.name + ' · ' + weekLabel(pt.day) + ' · pénalités : ' + fmt(g.pen, g.pen % 1 ? 1 : 0);
    main.textContent = '';
    main.className = 'sv-main sv-game';
    const dossier = h('aside', { class: 'sv-dossier' }, dossierView());
    const consult = h('section', { class: 'sv-consult', 'aria-live': 'polite' }, consultView());
    main.append(dossier, consult);
    const box = dossier.querySelector('.sv-chartbox');
    if (box) requestAnimationFrame(() => S.chart.render(box, g, { truth: !!g.ended }));
  }

  function rxText(rx) {
    const out = [];
    if (rx.ats && rx.ats !== 'none' && rx.atsDose > 0) out.push(M.ATS[rx.ats].short + ' ' + fmt(rx.atsDose, rx.atsDose % 1 ? 1 : 0) + ' ' + M.ATS[rx.ats].unit);
    if (rx.lt4 > 0) out.push('lévothyroxine ' + fmt(rx.lt4, rx.lt4 % 1 ? 1 : 0) + ' µg/j');
    if (rx.bb && rx.bb !== 'none') out.push(M.BB[rx.bb].name.toLowerCase());
    if (rx.hc) out.push('hydrocortisone 20 mg/j');
    return out.length ? out.join(' + ') : 'aucun traitement';
  }

  function dossierView() {
    const cs = g.case, pt = g.pt, p = cs.patient;
    const hist = g.visits.map((v) => h('li', null, [
      h('span', { class: 'sv-h-d' }, weekLabel(v.day)),
      h('span', null, [
        (v.type === 'event' ? '⚠ ' : '') + (v.labs.t4 != null ? 'T4L ' + fmt(v.labs.t4, 1) + ' · ' : '') + (v.labs.tsh != null ? 'TSH ' + (v.labs.tsh < 0.01 ? '< 0,01' : fmt(v.labs.tsh, v.labs.tsh < 1 ? 2 : 1)) + ' · ' : ''),
        h('em', null, v.rxText || '')
      ])
    ]));
    return [
      h('div', { class: 'sv-card sv-id' }, [
        h('p', { class: 'sv-eyebrow' }, 'Dossier'),
        h('h2', null, p.name),
        h('p', { class: 'sv-muted' }, p.age + ' ans · ' + p.job + ' · ' + fmt(M.clinic(pt).weight, 1) + ' kg'),
        h('ul', { class: 'sv-atcd' }, cs.atcd.map((a) => h('li', null, a))),
        h('p', { class: 'sv-rx' }, [h('strong', null, 'Traitement en cours : '), rxText(pt.rx)])
      ]),
      h('div', { class: 'sv-card' }, [
        h('p', { class: 'sv-eyebrow' }, g.ended ? 'Évolution (courbe réelle en pointillés)' : 'Évolution mesurée'),
        h('div', { class: 'sv-chartbox' }),
        h('p', { class: 'sv-note' }, 'Bandes : valeurs de référence indicatives. Seuls les dosages prescrits apparaissent.')
      ]),
      hist.length ? h('div', { class: 'sv-card' }, [h('p', { class: 'sv-eyebrow' }, 'Consultations'), h('ol', { class: 'sv-hist' }, hist)]) : null
    ];
  }

  function card(title, kids, opts) {
    return h('div', { class: 'sv-card sv-step' + (opts && opts.active ? ' active' : '') }, [h('h3', null, title)].concat(kids));
  }

  function next(v) { v.stage += 1; render(); const steps = main.querySelectorAll('.sv-step'); const last = steps[steps.length - 1]; if (last) last.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  function consultView() {
    const v = g.current;
    if (g.ended) return debrief();
    const head = h('div', { class: 'sv-vhead' }, [
      h('p', { class: 'sv-eyebrow' }, v.type === 'initial' ? 'Première consultation' : v.type === 'event' ? (v.event.title || 'Événement') : 'Consultation de suivi n° ' + v.n),
      h('h1', null, weekLabel(v.day))
    ]);
    const steps = v.type === 'initial' ? initialSteps(v) : v.type === 'event' ? eventSteps(v) : followSteps(v);
    const out = [head];
    for (let i = 0; i <= Math.min(v.stage, steps.length - 1); i++) out.push(steps[i](i === v.stage));
    return out;
  }

  /* ---------- Première consultation ---------- */
  function initialSteps(v) {
    const cs = g.case;
    const steps = [];
    steps.push((active) => card('Motif de consultation', [
      h('p', null, cs.motif),
      cs.courrier ? h('p', { class: 'sv-letter' }, cs.courrier.text) : null,
      h('h4', null, 'Interrogatoire'),
      h('p', { class: 'sv-muted' }, 'Posez les questions qui vous semblent utiles.'),
      h('div', { class: 'sv-qs' }, cs.questions.map((q) => v.asked.has(q.id)
        ? h('div', { class: 'sv-qa' }, [h('p', { class: 'sv-q' }, q.q), h('p', { class: 'sv-a' }, '« ' + q.a + ' »')])
        : h('button', { type: 'button', class: 'sv-qbtn', disabled: !active, onclick: () => { v.asked.add(q.id); g.asked.add(q.id); render(); } }, q.q))),
      active ? h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: () => {
        const fb = cs.questions.filter((q) => q.key).map((q) => (v.asked.has(q.id) ? { tone: 'good', text: 'Question clé posée : ' + q.q.charAt(0).toLowerCase() + q.q.slice(1) + ' ' + q.why, src: '' } : { tone: 'warn', text: 'Question clé oubliée : ' + q.q.charAt(0).toLowerCase() + q.q.slice(1) + ' ' + q.why, src: '', pen: 0.5 }));
        v.qFeedback = fb; addItems(fb); next(v);
      } }, 'Examiner le patient →')) : feedbackList(v.qFeedback || [])
    ], { active }));
    steps.push((active) => card('Examen clinique', [
      h('dl', { class: 'sv-exam' }, v.exam.flatMap(([k, val]) => [h('dt', null, k), h('dd', null, val)])),
      active ? h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: () => next(v) }, cs.tests0 && Object.keys(cs.tests0).length && !cs.noTestsStep ? 'Prescrire le bilan →' : cs.dx ? 'Poser le diagnostic →' : 'Prescrire →')) : null
    ], { active }));
    if (cs.tests0 && Object.keys(cs.tests0).length && !cs.noTestsStep) steps.push((active) => testsStep(v, active));
    if (cs.dx) steps.push((active) => dxStep(v, active));
    steps.push((active) => rxStep(v, active));
    return steps;
  }

  function testPicker(sel, active, name) {
    const groups = {};
    Object.entries(RU.TESTS).forEach(([k, T]) => { (groups[T.group] = groups[T.group] || []).push([k, T]); });
    return h('div', { class: 'sv-tests' }, Object.entries(groups).map(([gname, list]) => h('fieldset', null, [
      h('legend', null, gname),
      ...list.map(([k, T]) => h('label', { class: 'sv-check' }, [
        h('input', { type: 'checkbox', name, value: k, checked: sel.has(k), disabled: !active, onchange: (e) => { e.target.checked ? sel.add(k) : sel.delete(k); } }), ' ' + T.label
      ]))
    ])));
  }

  function testsStep(v, active) {
    return card('Bilan', [
      active ? h('p', { class: 'sv-muted' }, 'Cochez les examens à réaliser maintenant.') : null,
      active ? testPicker(v.tests, true, 'tests0') : resultsTable(v.results),
      active ? h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: () => {
        runTests(v, v.tests);
        v.tFeedback = RU.evaluateTests(g, v.tests); addItems(v.tFeedback); next(v);
      } }, 'Valider le bilan →')) : feedbackList(v.tFeedback || [])
    ], { active });
  }

  function dxStep(v, active) {
    const dx = g.case.dx;
    return card('Diagnostic', [
      h('div', { class: 'sv-radios', role: 'radiogroup' }, dx.options.map((o) => h('label', { class: 'sv-radio' + (!active && o.id === dx.correct ? ' right' : '') + (!active && v.dx === o.id && o.id !== dx.correct ? ' wrong' : '') }, [
        h('input', { type: 'radio', name: 'dx', value: o.id, checked: v.dx === o.id, disabled: !active, onchange: () => { v.dx = o.id; } }), ' ' + o.label
      ]))),
      active ? h('p', { class: 'sv-alert', hidden: true }) : null,
      active ? h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: () => {
        if (!v.dx) { alertMsg('Choisissez un diagnostic.'); return; }
        const ok = v.dx === dx.correct;
        v.dFeedback = [{ tone: ok ? 'good' : 'bad', text: (ok ? 'Exact. ' : 'Non. ') + dx.why, src: dx.src, pen: ok ? 0 : 3 }];
        addItems(v.dFeedback); next(v);
      } }, 'Valider le diagnostic →')) : feedbackList(v.dFeedback || [])
    ], { active });
  }

  function alertMsg(t) { const el = main.querySelector('.sv-step.active .sv-alert'); if (el) { el.textContent = t; el.hidden = false; } }

  /* ---------- Suivi ---------- */
  function followSteps(v) {
    const cs = g.case, pt = g.pt;
    const last = g.visits[g.visits.length - 1];
    const fem = cs.patient.sex === 'F';
    const P = fem ? 'Elle' : 'Il';
    const sy = v.symptoms.map((x) => x.replace('nerveux(se)', fem ? 'nerveuse' : 'nerveux').replace('fatigué(e)', fem ? 'fatiguée' : 'fatigué'));
    const qs = [{ id: 'tol', q: 'Tolérance du traitement ?', a: () => (M.atsEq(pt.rx) > 0 ? 'Pas de fièvre, pas de mal de gorge, pas d\'éruption ni de démangeaisons.' : pt.rx.lt4 > 0 ? 'Rien de particulier, ' + P.toLowerCase() + ' prend son comprimé tous les jours.' : 'Pas de traitement en cours.') }].concat(cs.followQuestions || []);
    return [
      (active) => card('Nouvelles du patient', [
        h('p', null, (last ? 'Dernière consultation il y a ' + fmt((v.day - last.day) / 7, 0) + ' semaines. ' : '') + (sy.length ? P + ' signale : ' + sy.join(', ') + '.' : P + ' se sent bien.')),
        h('dl', { class: 'sv-exam' }, (() => { const c = v.clinic; return [h('dt', null, 'Fréquence cardiaque'), h('dd', null, c.hr + '/min'), h('dt', null, 'Poids'), h('dd', null, fmt(c.weight, 1) + ' kg')]; })()),
        h('h4', null, 'Résultats du bilan prescrit'),
        resultsTable(v.results),
        h('div', { class: 'sv-qs' }, qs.map((q) => v.asked.has(q.id)
          ? h('div', { class: 'sv-qa' }, [h('p', { class: 'sv-q' }, q.q), h('p', { class: 'sv-a' }, '« ' + (typeof q.a === 'function' ? q.a(g) : q.a) + ' »')])
          : h('button', { type: 'button', class: 'sv-qbtn', disabled: !active, onclick: () => { v.asked.add(q.id); g.asked.add(q.id); render(); } }, q.q))),
        active ? h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: () => next(v) }, 'Adapter le traitement →')) : null
      ], { active }),
      (active) => rxStep(v, active)
    ];
  }

  function eventSteps(v) {
    const e = v.event;
    const steps = [(active) => card(e.title || 'Événement', [
      h('p', { class: 'sv-event' }, typeof e.text === 'function' ? e.text(g) : e.text),
      v.results.length ? resultsTable(v.results) : null,
      e.choices && !v.choice ? h('div', { class: 'sv-choices' }, e.choices.map((c, i) => h('button', { type: 'button', class: 'sv-qbtn', onclick: () => {
        v.choice = i;
        const f = { tone: c.tone, text: c.text, src: 'complément', pen: c.pen };
        v.eFeedback = [f]; addItems(v.eFeedback);
        c.effect(g);
        if (g.forceStopATS) { M.setRx(g.pt, { ats: 'none', atsDose: 0 }); g.forceStopATS = false; }
        if (g.eventLabs) { Object.assign(v.labs, g.eventLabs); g.eventLabs = null; }
        v.note = g.eventNote; g.eventNote = null;
        render();
      } }, c.label))) : null,
      v.choice != null ? h('p', { class: 'sv-q' }, 'Votre décision : ' + e.choices[v.choice].label) : null,
      v.eFeedback ? feedbackList(v.eFeedback) : null,
      v.note ? h('p', { class: 'sv-letter' }, v.note) : null,
      active && (!e.choices || v.choice != null) ? h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: () => next(v) }, 'Prescrire →')) : null
    ], { active })];
    steps.push((active) => rxStep(v, active));
    return steps;
  }

  /* ---------- Ordonnance ---------- */
  function rxStep(v, active) {
    const pt = g.pt;
    if (!v.draft) {
      const r = pt.rx;
      v.draft = { ats: r.ats, atsDose: r.atsDose, lt4: r.lt4, bb: r.bb, hc: !!r.hc, advice: new Set(), orient: 'none', weeks: g.mode === 'basedow' ? 4 : 6, tests: new Set() };
      if (v.draft.ats === 'none') v.draft.atsDose = 0;
    }
    const d = v.draft;
    if (!active) {
      return card('Ordonnance et correction', [
        h('p', { class: 'sv-rxsum' }, [h('strong', null, 'Prescrit : '), rxText(d) + (d.orient !== 'none' ? ' · ' + RU.ORIENT[d.orient].toLowerCase() : '') + ' · contrôle à ' + d.weeks + ' semaines (' + ([...d.tests].map((k) => RU.TESTS[k].label).join(', ') || 'aucun examen') + ')']),
        feedbackList(v.rFeedback || [])
      ]);
    }
    const basedow = g.mode === 'basedow';
    const atsSel = h('select', { id: 'rxAts', onchange: (e) => { d.ats = e.target.value; d.atsDose = d.ats === 'none' ? 0 : M.ATS[d.ats].doses[3]; render(); } },
      Object.entries(M.ATS).map(([k, A]) => h('option', { value: k, selected: d.ats === k }, A.name)));
    const doseSel = d.ats !== 'none' ? h('select', { id: 'rxAtsDose', onchange: (e) => { d.atsDose = +e.target.value; } },
      M.ATS[d.ats].doses.map((x) => h('option', { value: x, selected: d.atsDose === x }, fmt(x, x % 1 ? 1 : 0) + ' ' + M.ATS[d.ats].unit))) : null;
    const lt4Sel = h('select', { id: 'rxLt4', onchange: (e) => { d.lt4 = +e.target.value; } }, M.LT4_DOSES.map((x) => h('option', { value: x, selected: d.lt4 === x }, x ? fmt(x, x % 1 ? 1 : 0) + ' µg/j' : 'Aucune')));
    const bbSel = h('select', { id: 'rxBb', onchange: (e) => { d.bb = e.target.value; } }, Object.entries(M.BB).map(([k, B]) => h('option', { value: k, selected: d.bb === k }, B.name)));
    const orientSel = h('select', { id: 'rxOrient', onchange: (e) => { d.orient = e.target.value; } }, Object.entries(RU.ORIENT).map(([k, t]) => h('option', { value: k, selected: d.orient === k }, t)));
    const weeksSel = h('select', { id: 'rxWeeks', onchange: (e) => { d.weeks = +e.target.value; } }, RU.WEEKS.map((w) => h('option', { value: w, selected: d.weeks === w }, w + (w > 1 ? ' semaines' : ' semaine') + (w === 26 ? ' (6 mois)' : w === 52 ? ' (1 an)' : ''))));
    return card('Ordonnance', [
      h('div', { class: 'sv-form' }, [
        h('div', { class: 'sv-field' }, [h('label', { for: 'rxAts' }, 'Antithyroïdien de synthèse'), h('div', { class: 'sv-inline' }, [atsSel, doseSel])]),
        h('div', { class: 'sv-field' }, [h('label', { for: 'rxLt4' }, 'Lévothyroxine'), lt4Sel]),
        basedow ? h('div', { class: 'sv-field' }, [h('label', { for: 'rxBb' }, 'Bêtabloquant'), bbSel]) : null,
        h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', checked: d.hc, onchange: (e) => { d.hc = e.target.checked; } }), ' Hydrocortisone 20 mg/j (15 mg le matin, 5 mg à midi)']),
        basedow ? h('div', { class: 'sv-field' }, [h('label', { for: 'rxOrient' }, 'Décision'), orientSel]) : null
      ]),
      h('h4', null, 'Conseils donnés aujourd\'hui'),
      h('div', { class: 'sv-advice' }, Object.entries(RU.ADVICE).map(([k, t]) => h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', checked: d.advice.has(k), onchange: (e) => { e.target.checked ? d.advice.add(k) : d.advice.delete(k); } }), ' ' + t]))),
      h('h4', null, 'Prochain contrôle'),
      h('div', { class: 'sv-field' }, [h('label', { for: 'rxWeeks' }, 'Dans'), weeksSel]),
      h('p', { class: 'sv-muted' }, 'Bilan à faire juste avant :'),
      testPicker(d.tests, true, 'testsNext'),
      h('p', { class: 'sv-alert', hidden: true }),
      h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: () => submitRx(v) }, 'Valider l\'ordonnance'))
    ], { active });
  }

  function submitRx(v) {
    const d = v.draft, pt = g.pt, cs = g.case;
    if (d.ats !== 'none' && !(d.atsDose > 0)) d.atsDose = M.ATS[d.ats].doses[3];
    const fb = RU.evaluate(g, d);
    v.rFeedback = fb; addItems(fb);
    // Indicateur d'équilibre (hypothyroïdie) avant d'appliquer la décision
    if (g.mode !== 'basedow') {
      const tg = RU.target(g);
      const central = cs.kind === 'central';
      const ref = central ? v.labs.t4 : v.labs.tsh;
      const inT = ref != null && (central ? ref >= 14 && ref <= 22 : ref >= tg.lo && ref <= tg.hi);
      const same = d.lt4 === pt.rx.lt4 && M.atsEq(d) === M.atsEq(pt.rx);
      g.stableCount = inT && same ? g.stableCount + 1 : 0;
    }
    const t4 = 16 * pt.st.T4, t3 = 5 * pt.st.T3;
    if (pt.flags.stopped && (t4 > 22 || t3 > 6.8) && (d.orient === 'surgery' || d.orient === 'rai' || d.ats !== 'none')) g.relapseHandled = true;
    if (d.orient === 'stop') { d.ats = 'none'; d.atsDose = 0; pt.flags.stopped = true; g.stopDay = pt.day; }
    if (d.orient === 'surgery' && !pt.flags.surgeryDay) pt.flags.surgeryDay = pt.day + 21;
    if (d.orient === 'rai' && !pt.flags.raiDay) pt.flags.raiDay = pt.day + 7;
    if (d.ats !== 'none' && pt.flags.stopped && !g.relapseHandled) pt.flags.stopped = false;
    M.setRx(pt, { ats: d.ats, atsDose: d.ats === 'none' ? 0 : d.atsDose, lt4: d.lt4, bb: d.bb, hc: d.hc });
    g.planned = { tests: new Set(d.tests), weeks: d.weeks };
    v.rxText = rxText(pt.rx);
    v.done = true;
    g.visits.push(v);
    const end = endReason();
    v.stage += 1;
    render();
    const steps = main.querySelectorAll('.sv-step');
    const last = steps[steps.length - 1];
    last.append(h('div', { class: 'sv-actions' }, end
      ? h('button', { type: 'button', class: 'sv-primary', onclick: () => { g.ended = end; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, 'Fin du cas : voir le débriefing →')
      : h('button', { type: 'button', class: 'sv-primary', onclick: advance }, 'Revoir le patient dans ' + d.weeks + ' semaine' + (d.weeks > 1 ? 's' : '') + ' →')));
    last.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Temps ---------- */
  function advance() {
    const pt = g.pt, cs = g.case;
    let evt = null;
    M.advance(pt, g.planned.weeks * 7, () => {
      const f = pt.flags;
      if (f.surgeryDay && !f.surgeryDone && pt.day >= f.surgeryDay) {
        f.surgeryDone = true; pt.par.r = 0; pt.st.G = 0;
        M.setRx(pt, { ats: 'none', atsDose: 0, bb: 'none' });
        g.mode = 'lt4'; g.stableCount = 0;
        evt = { id: 'surgery', title: 'Thyroïdectomie totale', text: 'J' + pt.day + ' : thyroïdectomie totale réalisée après préparation (complément : iode à forte dose, corticoïdes, bêtabloquant). Pas de dysphonie. Le chirurgien vous demande la suite du traitement.', choices: null, results: ['ca'] };
        return false;
      }
      if (f.raiDay && pt.day >= f.raiDay) {
        if (!f.raiDone) { f.raiDone = true; f.r0 = pt.par.r; pt.st.TRAb *= 1.2; M.setRx(pt, { ats: 'none', atsDose: 0 }); }
        pt.par.r = Math.max(0.06, f.r0 * Math.exp(-(pt.day - f.raiDay) / 30));
      }
      for (const e of cs.events || []) {
        if (g.fired.has(e.id) || !e.when(g)) continue;
        g.fired.add(e.id);
        if (e.silent) { e.effect(g); continue; }
        evt = e; return false;
      }
      return true;
    });
    newVisit(evt ? 'event' : 'follow', evt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function endReason() {
    const cs = g.case, pt = g.pt;
    if (cs.endAt) { const r = cs.endAt(g); if (r) return r; }
    if (g.visits.length >= 36 || pt.day > 1150) return 'Durée maximale de la simulation atteinte.';
    const t4 = 16 * pt.st.T4, t3 = 5 * pt.st.T3;
    if (pt.flags.surgeryDone && g.stableCount >= 1) return 'Thyroïdectomie totale ; substitution par lévothyroxine équilibrée.';
    if (pt.flags.raiDone && g.mode === 'lt4' && g.stableCount >= 1) return 'Hypothyroïdie après iode 131, substitution équilibrée.';
    if (g.mode === 'basedow' || cs.kind === 'basedow') {
      if (pt.flags.stopped && g.stopDay != null && pt.day - g.stopDay >= 84 && t4 >= 12 && t4 <= 22 && t3 <= 6.8) return 'Rémission : euthyroïdie trois mois après l\'arrêt des ATS.';
      if (g.relapseHandled) return 'Rechute après l\'arrêt des ATS, prise en charge.';
      return null;
    }
    if (g.mode === 'lt4' && g.stableCount >= 2 && pt.day >= (cs.minDay || 0) && !cs.pregWeek) return 'Équilibre obtenu : deux contrôles successifs dans la cible.';
    return null;
  }

  /* ---------- Débriefing ---------- */
  function debrief() {
    const cs = g.case, pt = g.pt;
    const note = Math.max(0, Math.round((20 - g.pen) * 2) / 2);
    // Temps passé dans la cible (à partir de la 6e semaine)
    const log = pt.log.filter((p) => p.day >= 42);
    let inT = 0, hyper = 0, hypo = 0;
    const central = cs.kind === 'central';
    log.forEach((p) => {
      if (central) { if (p.t4 < 12) hypo++; else if (p.t4 > 22) hyper++; else inT++; return; }
      if (p.t4 > 22 || p.t3 > 6.8 || p.tsh < 0.1) hyper++;
      else if (p.tsh > 4.5 || p.t4 < 12) hypo++;
      else inT++;
    });
    const pc = (n) => (log.length ? Math.round((100 * n) / log.length) : 0) + ' %';
    const all = [g.visits.flatMap((v) => v.feedback)].flat();
    const n = (t) => all.filter((f) => f.tone === t).length;
    return [
      h('div', { class: 'sv-vhead' }, [h('p', { class: 'sv-eyebrow' }, 'Débriefing'), h('h1', null, cs.title)]),
      h('div', { class: 'sv-card sv-score' }, [
        h('div', { class: 'sv-grade' }, [h('span', { class: 'sv-grade-n' }, fmt(note, note % 1 ? 1 : 0)), h('span', { class: 'sv-grade-d' }, '/20')]),
        h('div', null, [
          h('p', { class: 'sv-q' }, g.ended),
          h('p', { class: 'sv-muted' }, 'Durée suivie : ' + fmt(pt.day / 7, 0) + ' semaines, ' + g.visits.length + ' consultation(s). ' + n('good') + ' décisions correctes, ' + n('warn') + ' discutables, ' + n('bad') + ' erreurs.'),
          log.length && cs.kind !== 'subclin' ? h('p', { class: 'sv-muted' }, 'Après la 6e semaine : ' + pc(inT) + ' du temps dans la cible, ' + pc(hyper) + ' en excès d\'hormones (ou TSH freinée), ' + pc(hypo) + ' en défaut.') : null
        ])
      ]),
      h('div', { class: 'sv-card' }, [h('h3', null, 'À retenir'), h('ul', { class: 'sv-keys' }, cs.keyPoints.map((k) => h('li', null, [k.t, h('span', { class: 'sv-src' }, ' · ' + k.src)])))]),
      h('div', { class: 'sv-card' }, [h('h3', null, 'Vos décisions, consultation par consultation')].concat(g.visits.map((v) => h('details', { class: 'sv-journal' }, [
        h('summary', null, weekLabel(v.day) + ' · ' + (v.type === 'initial' ? 'première consultation' : v.type === 'event' ? (v.event.title || 'événement').toLowerCase() : 'suivi') + ' · ' + (v.rxText || '')),
        v.results.length ? resultsTable(v.results) : null,
        feedbackList(v.feedback)
      ])))),
      h('div', { class: 'sv-actions' }, [
        h('button', { type: 'button', class: 'sv-primary', onclick: () => start(cs) }, 'Rejouer ce patient'),
        h('button', { type: 'button', class: 'sv-secondary', onclick: home }, 'Choisir un autre patient')
      ])
    ];
  }

  // Quitter une partie en cours : second clic pour confirmer (les boîtes de dialogue du navigateur peuvent être bloquées).
  let quitArmed = 0;
  homeBtn.addEventListener('click', () => {
    if (!g || g.ended || Date.now() - quitArmed < 4000) { quitArmed = 0; homeBtn.textContent = '← Autres patients'; home(); return; }
    quitArmed = Date.now();
    homeBtn.textContent = 'Partie perdue : cliquez encore pour quitter';
    setTimeout(() => { if (quitArmed && Date.now() - quitArmed >= 4000) { quitArmed = 0; homeBtn.textContent = '← Autres patients'; } }, 4100);
  });
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { const box = document.querySelector('.sv-chartbox'); if (box && g) S.chart.render(box, g, { truth: !!g.ended }); }, 150); });
  S.casesUI = { home };
})();
