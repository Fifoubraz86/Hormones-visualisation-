/*
 * Cas guidé : initiation d'une insuline basale chez un DT2 en échec de trithérapie orale, avec carnets à
 * interpréter. Quatre temps :
 * 1. consultation : lecture du carnet sous sulfamide, puis ordonnance d'initiation (dose, insuline,
 *    traitements associés, protocole de titration, surveillance) ;
 * 2. J14, appel de l'IDE : carnet à dose fixe (le patient n'a pas osé adapter), lecture et nouvelle dose ;
 * 3. M3 : HbA1c, carnet (et rapport AGP si capteur), lecture, intensification ;
 * 4. M9 : évolution sous la décision prise, débriefing noté.
 * Le patient est celui du modèle DT2 (js/simu/dt2-model.js), patient théorique reproductible ; carnets et
 * titration : js/simu/glyco.js ; règles : prise de position SFD 2025 (js/simu/sfd.js) et protocole
 * d'adaptation des doses d'insuline du service. Chaque affirmation du carnet est jugée sur les valeurs
 * affichées, pas sur un corrigé figé.
 */
(function () {
  'use strict';
  const S = window.HV.simu;
  const D = S.dt2, Y = S.glyco, SFD = S.sfd;
  const fmt = S.rules.fmt;
  const main = document.getElementById('svMain');
  const statusEl = document.getElementById('svStatus');

  const CFG = { profile: 'sird', sex: 'M', age: 62, weight: 95, height: 175, a1c: 9.4, duration: 14, dfg: 85, alb: 'normo', ethnic: 'eur', sbp: 138, retino: 'none', hfail: false, cvd: false, adh: 'bonne', variab: 'theo', motiv: 'moyenne', act0: 30, soda0: 0, snack0: 'modere', rx0: { met: 2000, su: 120, dpp4: 100 } };
  const SEED = 424242;
  const NAME = 'M. Bernard L.';
  const ICON = { good: '✓', warn: '!', bad: '✗', info: 'i' };
  const PEN = { good: 0, info: 0, warn: 1, bad: 2 };
  let g = null;

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
  const g2 = (v) => fmt(v, 2) + ' g/L';
  function feedbackList(items) {
    return h('ul', { class: 'sv-fb' }, items.map((f) => h('li', { class: 'sv-fb-' + f.tone }, [
      h('span', { class: 'sv-fb-ic', 'aria-hidden': 'true' }, ICON[f.tone]),
      h('span', { class: 'sv-fb-t' }, [f.text, f.src ? h('span', { class: 'sv-src' }, ' · ' + f.src) : null, (f.pen != null ? f.pen : PEN[f.tone]) ? h('span', { class: 'sv-pen' }, ' −' + fmt(f.pen != null ? f.pen : PEN[f.tone], 1).replace(/,0$/, '')) : null])
    ])));
  }

  /* ---------- Simulation ---------- */
  function newPatient() {
    const pt = D.create(Object.assign({}, CFG));
    Object.assign(pt.rx, { rapidM: [0, 0, 0], rapid: 0, basalType: 'g100' });
    return { pt, days: [], titr: { who: 'none', prof: 'std', delai: 3, sfd10: false, obj: JSON.parse(JSON.stringify(Y.PROTO.std)), bolusCtl: 'next' }, state: { above: {} }, lastH: null, lastS: null, asg: 'w4', cgm: false, titrLog: [], glpPlan: null };
  }
  function day(sim, titrate) {
    const pt = sim.pt;
    if (pt.day >= 0) D.advance(pt, 1);
    if (sim.glpPlan) { const p = sim.glpPlan, i = Math.min(p.doses.length - 1, Math.floor((pt.day - p.start) / 28)); pt.rx.glpDose = p.doses[i]; }
    const newHypo = pt.st.hypo - (sim.lastH == null ? pt.st.hypo : sim.lastH), newSev = pt.st.hypoSev - (sim.lastS == null ? pt.st.hypoSev : sim.lastS);
    const dp = Y.makeDay(pt, D, { seed: (SEED + pt.day * 7919) >>> 0, newHypo, newSev });
    pt.st.hypo += dp.native; sim.lastH = pt.st.hypo; sim.lastS = pt.st.hypoSev;
    dp.rdg = Y.readings(dp);
    if (titrate && sim.titr.who !== 'none' && pt.rx.basal + pt.rx.rapid > 0) { const log = Y.titrate(pt.rx, dp.rdg, Object.assign({ cgm: sim.cgm, basalMax: Math.round(0.5 * pt.st.W) }, sim.titr), sim.state, true); if (log.length) sim.titrLog.push({ day: pt.day, log }); }
    sim.days.push(dp);
  }
  function run(sim, n, titrate) { for (let i = 0; i < n; i++) day(sim, titrate); }
  function rows(sim, asg, cgm) {
    return sim.days.slice(-14).map((dp) => {
      const set = asg && asg !== '0' ? Y.ASG[asg].set(dp.d) : cgm ? ['rev', 'avDej', 'avDin', 'coucher'] : [];
      const v = {}; set.forEach((k) => { v[k] = dp.rdg[k]; });
      const rem = dp.rdg.hypos.map((hy) => 'malaise à ' + Math.floor(hy.t) + ' h : ' + fmt(hy.g, 2) + ' g/L, resucrage');
      return { d: dp.d, basal: dp.basal, u: dp.rapid, v, hypos: dp.rdg.hypos, rem };
    });
  }
  const vals = (rs, k) => rs.map((r) => r.v[k]).filter((x) => x != null);
  const med = (a) => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2; };
  const allVals = (rs) => rs.flatMap((r) => Object.values(r.v));
  const nHypo = (rs) => rs.reduce((a, r) => a + r.hypos.length, 0);

  /* ---------- Déroulé ---------- */
  function start() {
    const sim = newPatient();
    // Quatorze jours avant la consultation, sous trithérapie, 4 mesures par semaine.
    for (let k = 14; k > 0; k--) { sim.pt.day = -k; day(sim, false); }
    sim.pt.day = 0;
    g = { sim, step: 1, pen: 0, journal: [], answers: {} };
    render();
  }

  function frame(title, eyebrow, kids) {
    statusEl.hidden = false;
    statusEl.textContent = 'Cas guidé · insuline · ' + (g.sim.pt.day ? 'J' + g.sim.pt.day : 'J0');
    main.textContent = '';
    main.className = 'sv-main sv-home sv-dcase';
    main.append(h('div', { class: 'sv-vhead' }, [h('p', { class: 'sv-eyebrow' }, eyebrow), h('h1', null, title)]), ...kids);
    window.scrollTo(0, 0);
  }

  // Affirmations sur le carnet : l'interne coche celles qu'il juge vraies ; vérité calculée sur le carnet.
  function statementsBlock(id, items) {
    return h('fieldset', { class: 'sv-card sv-stmts' }, [h('legend', null, 'Lecture du carnet : cochez les affirmations exactes'), ...items.map((it, i) => h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: id + i }), ' ' + it.t]))]);
  }
  function gradeStatements(id, items) {
    const fb = [];
    items.forEach((it, i) => {
      const said = document.getElementById(id + i).checked, truth = !!it.f();
      if (said === truth) fb.push({ tone: 'good', text: (truth ? 'Exact : ' : 'Faux, à juste titre non coché : ') + it.t + (it.why ? ' — ' + it.why : ''), src: it.src });
      else fb.push({ tone: 'warn', pen: 0.5, text: (truth ? 'Exact mais non coché : ' : 'Coché à tort : ') + it.t + (it.why ? ' — ' + it.why : ''), src: it.src });
    });
    return fb;
  }

  function carnetCard(sim, asg, cgm, title, note) {
    const rs = rows(sim, asg, cgm);
    return h('div', { class: 'sv-card sv-gly' }, [h('h4', null, title), note ? h('p', { class: 'sv-note' }, note) : null, Y.carnetTable(rs, sim.titr, h), h('p', { class: 'sv-note' }, 'Cases : vert dans l\'objectif, orange au-dessus, bleu en dessous, rouge < 0,70 g/L (objectifs du protocole : réveil et avant les repas ' + fmt(Y.objOf(sim.titr).rev[0], 2) + '–' + fmt(Y.objOf(sim.titr).rev[1], 2) + ' g/L, coucher ' + fmt(Y.objOf(sim.titr).coucher[0], 2) + '–' + fmt(Y.objOf(sim.titr).coucher[1], 2) + ' g/L).')]);
  }

  // Rapport AGP des 14 derniers jours, si le patient a un capteur ; lecture guidée et interprétation repliées.
  function agpCard(sim, title) {
    if (!sim.cgm) return null;
    const days = sim.days.slice(-14).filter((dp) => dp.d >= 1);
    if (days.length < 7) return null;
    const st = Y.agpStats(Y.cgm(days), days.length), tg = Y.cgmTargets(false);
    const read = Y.interpretAGP(st, tg, { basalUkg: sim.pt.rx.basal / sim.pt.st.W });
    return h('div', { class: 'sv-card sv-gly' }, [
      h('h4', null, (title || 'Rapport AGP') + ' · capteur, ' + days.length + ' jours'),
      h('p', { class: 'sv-note' }, 'Cibles SFD 2025 (tableau II), cas général : TIR > 70 %, < 0,70 g/L < 4 %, < 0,54 g/L < 1 %, > 1,80 g/L < 25 %.'),
      Y.agpReport(st, days, tg, h),
      h('details', { class: 'sv-det sv-how' }, [h('summary', null, 'Proposition d\'interprétation (après votre lecture)'), h('dl', { class: 'sv-exam sv-qual' }, read.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)]))])
    ]);
  }

  function render() {
    if (g.step === 1) return step1();
    if (g.step === 2) return step2();
    if (g.step === 3) return step3();
    return debrief();
  }

  /* ----- 1. Consultation : carnet sous sulfamide, initiation ----- */
  function step1() {
    const sim = g.sim, pt = sim.pt;
    const rs = rows(sim, 'w4', false);
    const v = allVals(rs);
    g.st1 = [
      { t: 'Toutes les glycémies notées sont au-dessus de 1,30 g/L.', f: () => v.every((x) => x > 1.3) },
      { t: 'Les glycémies au réveil sont dans l\'objectif (0,80–1,20 g/L).', f: () => vals(rs, 'rev').every((x) => x >= 0.8 && x <= 1.2), why: 'le réveil est le reflet de la production hépatique nocturne de glucose' },
      { t: 'Le carnet montre des hypoglycémies sous gliclazide.', f: () => nHypo(rs) > 0 },
      { t: 'Avec 4 mesures par semaine, ce carnet suffit à titrer une insuline basale.', f: () => false, why: 'la titration exige la glycémie du réveil chaque jour', src: 'SFD 2025, avis 18' },
      { t: 'Ces valeurs sont cohérentes avec une HbA1c de 9,4 %.', f: () => { const m = v.reduce((a, x) => a + x, 0) / v.length; return Math.abs((m * 100 + 46.7) / 28.7 - 9.4) < 1.2; }, why: 'glycémie moyenne ≈ 2,2 g/L pour 9,4 % (formule ADAG)' }
    ];
    const W = pt.st.W;
    const f = (id, label, input) => h('div', { class: 'sv-field' }, [h('label', { for: id }, label), input]);
    const sel = (id, opts, val) => h('select', { id }, opts.map(([k, t]) => h('option', { value: k, selected: String(val) === String(k) }, t)));
    frame('Initier une insuline basale', 'Cas guidé · diabète de type 2 · consultation, J0', [
      h('div', { class: 'sv-card' }, [
        h('h2', null, NAME + ', 62 ans, 95 kg, 1,75 m (IMC 31)'),
        h('p', null, 'Diabète de type 2 connu depuis 14 ans. Retraité de la fonction publique, vit en couple, ne conduit que pour les courses. Pas de maladie cardiovasculaire connue, pas d\'insuffisance cardiaque ; DFG 85 mL/min, pas d\'albuminurie ; fond d\'œil normal il y a 6 mois.'),
        h('p', null, 'Traitement depuis 2 ans : metformine 1 000 mg × 2, gliclazide LM 120 mg, sitagliptine 100 mg. Bonne observance, régime suivi « à peu près ». Poids stable.'),
        h('p', null, [h('strong', null, 'Biologie : '), 'HbA1c 9,4 % (8,9 % il y a 6 mois) ; glycémie à jeun au laboratoire 2,05 g/L ; créatinine normale.']),
        h('p', { class: 'sv-muted' }, 'Il a refusé jusqu\'ici les injections. Après discussion (aGLP1 proposé, refusé pour l\'instant : « une piqûre par semaine ou par jour, c\'est pareil, je veux juste quelque chose qui marche »), il accepte une insuline basale.')
      ]),
      carnetCard(sim, 'w4', false, 'Son carnet des 14 derniers jours', 'Lecteur prescrit sous sulfamide : 4 mesures par semaine environ (200 bandelettes par an).'),
      statementsBlock('s1_', g.st1),
      h('div', { class: 'sv-card sv-ordo' }, [
        h('h3', null, 'Votre ordonnance d\'initiation'),
        h('div', { class: 'sv-form' }, [
          f('c1met', 'Metformine', sel('c1met', [['keep', 'Poursuivre 2 000 mg/j'], ['stop', 'Arrêter']], 'keep')),
          f('c1su', 'Gliclazide LM 120 mg', sel('c1su', [['keep', 'Poursuivre'], ['half', 'Réduire à 60 mg'], ['stop', 'Arrêter']], 'keep')),
          f('c1dpp', 'Sitagliptine 100 mg', sel('c1dpp', [['keep', 'Poursuivre'], ['stop', 'Arrêter']], 'keep')),
          f('c1type', 'Insuline basale', sel('c1type', [['g100', 'Glargine U100'], ['g300', 'Glargine U300'], ['deg', 'Dégludec'], ['nph', 'NPH']], 'g100')),
          f('c1dose', 'Dose de départ (U/j)', h('input', { type: 'number', id: 'c1dose', class: 'sv-num', min: 0, max: 200, step: 1, value: '', inputmode: 'numeric' })),
          f('c1mom', 'Horaire', sel('c1mom', [['soir', 'Le soir (19–20 h)'], ['coucher', 'Au coucher (22–23 h)'], ['matin', 'Le matin (7–8 h)']], 'soir'))
        ]),
        h('h4', null, 'Adaptation des doses'),
        h('div', { class: 'sv-form' }, [
          f('c1who', 'Qui adapte ?', sel('c1who', [['none', 'Personne : on revoit à 3 mois'], ['patient', 'Le patient, avec un protocole écrit'], ['ide', 'Une IDE à domicile']], 'none')),
          f('c1obj', 'Objectif au réveil', sel('c1obj', [['std', '0,80–1,20 g/L (protocole, patient standard)'], ['sfd', '0,80–1,30 g/L (SFD 2025)'], ['fra', '1,00–1,40 g/L (patient fragile)'], ['tight', '0,70–1,00 g/L']], 'std')),
          f('c1del', 'Augmenter après', sel('c1del', [['3', '3 jours de suite au-dessus (+ 2 U)'], ['2', '2 jours de suite au-dessus (+ 2 U)'], ['7', '1 semaine (+ 4 U)']], '3'))
        ]),
        h('h4', null, 'Surveillance'),
        h('div', { class: 'sv-form' }, [f('c1asg', 'Autosurveillance capillaire', sel('c1asg', [['0', 'Aucune'], ['w4', '4 mesures par semaine'], ['1', '1 fois par jour (réveil)'], ['2', '2 fois par jour'], ['4', '4 fois par jour']], 'w4'))]),
        h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'c1cgm' }), ' Capteur de glucose (mesure en continu)']),
        h('p', { class: 'sv-alert', hidden: true }),
        h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: submit1 }, 'Valider l\'ordonnance →'))
      ])
    ]);
  }

  function submit1() {
    const sim = g.sim, pt = sim.pt, W = pt.st.W;
    const val = (id) => document.getElementById(id).value;
    const dose = parseFloat(val('c1dose'));
    const alert = main.querySelector('.sv-alert');
    if (!(dose >= 0)) { alert.textContent = 'Indiquez une dose de départ.'; alert.hidden = false; return; }
    const fb = gradeStatements('s1_', g.st1);
    const hi = Math.max(10, Math.round(0.2 * W)), lo = 6;
    let used = dose;
    if (dose > hi) { fb.push({ tone: 'bad', pen: 3, text: dose + ' U d\'emblée : on ne débute pas ainsi (hypoglycémies, perte de confiance du patient). Initiation à 6–10 U/j ou 0,1–0,2 U/kg/j, soit ' + lo + ' à ' + hi + ' U ; la titration fait le reste. Le senior corrige à 10 U.', src: 'SFD 2025, avis 18' }); used = 10; }
    else if (dose < lo) { fb.push({ tone: 'warn', text: dose + ' U : en dessous des doses d\'initiation usuelles (6–10 U/j ou 0,1–0,2 U/kg/j) ; la titration sera longue.', src: 'SFD 2025, avis 18' }); used = Math.max(dose, 4); }
    else fb.push({ tone: 'good', text: 'Dose de départ ' + dose + ' U (' + fmt(dose / W, 2) + ' U/kg) : dans la fourchette d\'initiation.', src: 'SFD 2025, avis 18' });
    const type = val('c1type');
    fb.push(type === 'nph' ? { tone: 'warn', text: 'NPH : préférer un analogue lent (moins d\'hypoglycémies nocturnes, moins de variabilité).', src: 'SFD 2025, avis 18 bis' } : { tone: 'good', text: { g100: 'Glargine U100 : l\'analogue lent le plus utilisé en première intention.', g300: 'Glargine U300 : bon choix, moins d\'hypoglycémies nocturnes.', deg: 'Dégludec : bon choix, moins d\'hypoglycémies nocturnes.' }[type], src: 'SFD 2025, avis 18 bis' });
    fb.push({ tone: 'info', text: 'Horaire indifférent (matin ou soir), mais toujours le même.', src: 'SFD 2025, avis 18' });
    const met = val('c1met'), su = val('c1su'), dpp = val('c1dpp');
    fb.push(met === 'keep' ? { tone: 'good', text: 'Metformine poursuivie : on la garde sous insuline (moins de prise de poids, moins d\'insuline).', src: 'SFD 2025, avis 18 ter' } : { tone: 'bad', text: 'Metformine arrêtée : elle doit être maintenue lors de l\'instauration de l\'insuline basale (sauf contre-indication).', src: 'SFD 2025, avis 18 ter' });
    fb.push(su === 'stop' ? { tone: 'good', text: 'Gliclazide arrêté : on arrête les sulfamides à l\'instauration de la basale (risque d\'hypoglycémie).', src: 'SFD 2025, avis 18 ter' } : { tone: su === 'half' ? 'warn' : 'bad', text: 'Gliclazide ' + (su === 'half' ? 'réduit' : 'poursuivi') + ' : il faut l\'arrêter quand on instaure une insuline basale (hypoglycémies, titration faussée).', src: 'SFD 2025, avis 18 ter' });
    fb.push({ tone: 'info', text: 'Sitagliptine ' + (dpp === 'keep' ? 'poursuivie' : 'arrêtée') + ' : les deux se discutent ; l\'iDPP4 peut être gardé (pas d\'hypoglycémie), il sera arrêté si un aGLP1 est ajouté.', src: 'SFD 2025, avis 18 ter et 20' });
    const who = val('c1who'), obj = val('c1obj'), del = val('c1del');
    fb.push(who === 'none' ? { tone: 'bad', text: 'Pas de titration avant 3 mois : une basale non titrée reste inefficace. Le patient (ou une IDE) adapte la dose tous les 3 jours sur la glycémie du réveil.', src: 'SFD 2025, avis 18' } : { tone: 'good', text: who === 'ide' ? 'Titration par une IDE : utile au début ou si l\'autonomie est incertaine ; l\'objectif reste d\'autonomiser le patient.' : 'Titration par le patient avec un protocole écrit : c\'est l\'objectif (éducation thérapeutique).', src: 'SFD 2025, avis 18' });
    fb.push(obj === 'std' || obj === 'sfd' ? { tone: 'good', text: 'Objectif au réveil ' + (obj === 'std' ? '0,80–1,20' : '0,80–1,30') + ' g/L : adapté à une cible d\'HbA1c ≤ 7 % chez ce patient de 62 ans non fragile.', src: obj === 'std' ? 'protocole du service' : 'SFD 2025, avis 18' } : obj === 'fra' ? { tone: 'warn', text: 'Objectif assoupli (1,00–1,40) : réservé au patient fragile ; ici la cible d\'HbA1c est ≤ 7 %.', src: 'SFD 2025, avis 3 ; protocole' } : { tone: 'bad', text: 'Objectif 0,70–1,00 g/L : trop strict, expose aux hypoglycémies nocturnes.', src: 'SFD 2025, avis 18' });
    fb.push(del === '7' ? { tone: 'warn', text: 'Adaptation hebdomadaire : possible mais lente ; le protocole augmente après 2 ou 3 jours de suite au-dessus de l\'objectif.', src: 'protocole du service ; SFD 2025, avis 18' } : { tone: 'good', text: 'Augmentation après ' + del + ' jours de suite au-dessus de l\'objectif, de 2 U (1 U sous 10 U).', src: 'protocole du service ; SFD 2025, avis 18' });
    const asg = val('c1asg'), cgm = document.getElementById('c1cgm').checked;
    if (!cgm && (asg === '0' || asg === 'w4')) fb.push({ tone: 'bad', text: 'Surveillance insuffisante : titrer une basale exige la glycémie du réveil chaque jour (et les bandelettes sont remboursées sans limite sous insuline).', src: 'SFD 2025, avis 18 et 23' });
    else if (!cgm) fb.push({ tone: asg === '4' ? 'info' : 'good', text: 'Autosurveillance ' + (asg === '1' ? 'quotidienne au réveil' : asg === '2' ? '2 fois par jour' : '4 fois par jour') + (asg === '4' ? ' : plus que nécessaire pour une basale seule, mais repère la journée.' : ' : suffisante pour titrer la basale.'), src: 'SFD 2025, avis 18' });
    fb.push(cgm ? { tone: 'good', text: 'Capteur prescrit : recommandé sous insuline, et remboursé ici (insuline basale et HbA1c 9,4 % > 8 %).', src: 'SFD 2025, avis 23 ; LPPR' } : { tone: 'warn', text: 'Pas de capteur : il est recommandé sous insuline et remboursé chez ce patient (insuline basale, HbA1c > 8 %).', src: 'SFD 2025, avis 23 ; LPPR' });
    // Application
    Object.assign(pt.rx, { met: met === 'keep' ? 2000 : 0, su: su === 'keep' ? 120 : su === 'half' ? 60 : 0, dpp4: dpp === 'keep' ? 100 : 0, basal: used, basalType: type });
    sim.titr = { who, prof: obj === 'fra' ? 'fra' : 'std', delai: del === '7' ? 7 : +del, sfd10: false, obj: JSON.parse(JSON.stringify(Y.PROTO[obj === 'fra' ? 'fra' : 'std'])), bolusCtl: 'next' };
    if (obj === 'sfd') sim.titr.obj.rev = [0.8, 1.3];
    if (obj === 'tight') sim.titr.obj.rev = [0.7, 1.0];
    if (cgm && asg !== '0') fb.push({ tone: 'info', text: 'Sous capteur, la surveillance se fait sur le capteur : l\'autosurveillance capillaire s\'arrête (bandelettes réservées aux doutes).', src: 'SFD 2025, avis 23' });
    sim.asg = cgm ? '0' : asg === 'w4' || asg === '0' ? '1' : asg; // sans capteur : au moins le réveil
    sim.cgm = cgm;
    g.ans1 = { dose, used, who, su, met, dpp, type, cgm };
    g.journal.push({ title: 'J0 · initiation', rx: used + ' U de ' + { g100: 'glargine U100', g300: 'glargine U300', deg: 'dégludec', nph: 'NPH' }[type], fb });
    // Quinze jours : le patient n'ose pas adapter.
    run(sim, 14, false);
    g.step = 2; g.lastFb = fb;
    render();
  }

  /* ----- 2. J14 : carnet à dose fixe ----- */
  function step2() {
    const sim = g.sim, pt = sim.pt;
    const rs = rows(sim, sim.asg, sim.cgm);
    const O = Y.objOf(sim.titr);
    const rev = vals(rs, 'rev');
    g.st2 = [
      { t: 'La glycémie au réveil est au-dessus de l\'objectif la plupart des jours.', f: () => rev.filter((x) => x > O.rev[1]).length >= rev.length / 2 },
      { t: 'Il y a eu au moins une hypoglycémie.', f: () => nHypo(rs) > 0 },
      { t: 'La dose de basale est la même depuis l\'initiation.', f: () => new Set(rs.map((r) => r.basal)).size === 1 },
      { t: 'La glycémie du coucher sert à adapter l\'insuline basale.', f: () => false, why: 'la basale (du soir ou du coucher) se juge sur la glycémie du réveil', src: 'protocole du service' },
      { t: 'Il faut déjà ajouter une insuline rapide.', f: () => false, why: 'on titre d\'abord la basale jusqu\'à l\'objectif au réveil', src: 'SFD 2025, avis 18 et 19' }
    ];
    frame('J14 : l\'IDE vous appelle', 'Cas guidé · diabète de type 2 · téléconsultation, J14', [
      lastFeedback(),
      h('div', { class: 'sv-card' }, [
        h('p', null, sim.titr.who === 'ide' ? '« Le cabinet infirmier n\'a pu commencer les passages qu\'hier : M. L. a fait ' + g.ans1.used + ' U tous les soirs sans changer la dose. »' : '« M. L. n\'a pas osé toucher à la dose, il avait peur de faire un malaise. Il a fait ' + g.ans1.used + ' U tous les soirs. »'),
        h('p', { class: 'sv-muted' }, 'Pas de malaise signalé ' + (nHypo(rs) ? '(sauf celui noté au carnet)' : '') + '. Il vous transmet son carnet.')
      ]),
      agpCard(sim, 'Rapport AGP depuis l\'initiation'),
      carnetCard(sim, sim.asg, sim.cgm, 'Carnet depuis l\'initiation', sim.cgm ? 'Valeurs relevées sur le capteur.' : 'Autosurveillance : ' + Y.ASG[sim.asg].label + '.'),
      statementsBlock('s2_', g.st2),
      h('div', { class: 'sv-card sv-ordo' }, [
        h('h3', null, 'Votre décision'),
        h('div', { class: 'sv-form' }, [
          h('div', { class: 'sv-field' }, [h('label', { for: 'c2dose' }, 'Dose de basale à faire ce soir (U)'), h('input', { type: 'number', id: 'c2dose', class: 'sv-num', min: 0, max: 200, step: 1, value: '', inputmode: 'numeric' })]),
          h('div', { class: 'sv-field' }, [h('label', { for: 'c2who' }, 'Pour la suite'), h('select', { id: 'c2who' }, [['patient', 'Il titre lui-même : on reprend le protocole écrit ensemble'], ['ide', 'Passage IDE quotidien pour titrer'], ['none', 'Garder la dose et revoir à 3 mois']].map(([k, t]) => h('option', { value: k, selected: k === (sim.titr.who === 'none' ? 'patient' : sim.titr.who) }, t)))])
        ]),
        h('p', { class: 'sv-alert', hidden: true }),
        h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: submit2 }, 'Valider →'))
      ])
    ]);
  }

  function submit2() {
    const sim = g.sim, pt = sim.pt;
    const nd = parseFloat(document.getElementById('c2dose').value), who = document.getElementById('c2who').value;
    const alert = main.querySelector('.sv-alert');
    if (!(nd >= 0)) { alert.textContent = 'Indiquez la dose de ce soir.'; alert.hidden = false; return; }
    const fb = gradeStatements('s2_', g.st2);
    const rs = rows(sim, sim.asg, sim.cgm), O = Y.objOf(sim.titr), cur = pt.rx.basal;
    const rev = med(vals(rs, 'rev'));
    const high = rev > O.rev[1], hyp = nHypo(rs) > 0;
    const step = cur < 10 ? 1 : 2, d = nd - cur;
    if (hyp && d > 0) fb.push({ tone: 'bad', text: 'Hypoglycémie au carnet : on n\'augmente pas tant qu\'elle n\'est pas expliquée ; baisser si elle est nocturne.', src: 'protocole du service' });
    else if (high && d <= 0) fb.push({ tone: 'bad', text: 'Réveil à ' + g2(rev) + ' en médiane, au-dessus de l\'objectif depuis 2 semaines : il faut augmenter (+ ' + step + ' U, puis tous les ' + sim.titr.delai + ' jours).', src: 'protocole du service ; SFD 2025, avis 18' });
    else if (high && d > Math.max(4, 0.2 * cur)) fb.push({ tone: 'warn', text: '+ ' + d + ' U d\'un coup : plus que le protocole (' + step + ' U ; au plus 10 à 20 % de la dose) ; risque d\'hypoglycémie nocturne. Le rattrapage se fait par paliers rapprochés.', src: 'protocole du service' });
    else if (high) fb.push({ tone: 'good', text: '+ ' + d + ' U ce soir (' + cur + ' → ' + nd + ' U), puis le protocole reprend : + ' + step + ' U tous les ' + sim.titr.delai + ' jours tant que le réveil dépasse ' + fmt(O.rev[1], 2) + ' g/L.', src: 'protocole du service' });
    else fb.push({ tone: d === 0 ? 'good' : 'warn', text: 'Réveil dans l\'objectif : ' + (d === 0 ? 'dose gardée.' : 'pas de raison de changer la dose.'), src: 'protocole du service' });
    fb.push(who === 'none' ? { tone: 'bad', text: 'Attendre 3 mois à dose fixe : inertie thérapeutique ; la titration doit continuer.', src: 'SFD 2025, avis 5 et 18' } : { tone: 'good', text: who === 'ide' ? 'Passages IDE pour titrer : bonne solution transitoire chez un patient inquiet.' : 'Reprise de l\'éducation et du protocole écrit : l\'autonomie est l\'objectif.', src: 'SFD 2025, avis 18' });
    pt.rx.basal = Math.max(0, Math.min(nd, cur + 20));
    sim.titr.who = who; sim.state = { above: {} };
    g.journal.push({ title: 'J14 · carnet à dose fixe', rx: cur + ' → ' + nd + ' U', fb });
    run(sim, 76, true);
    g.step = 3; g.lastFb = fb;
    render();
  }

  /* ----- 3. M3 : HbA1c, carnet, intensification ----- */
  function step3() {
    const sim = g.sim, pt = sim.pt;
    const rs = rows(sim, sim.asg === '1' ? '2' : sim.asg, sim.cgm);
    const O = Y.objOf(sim.titr);
    const a1c = pt.st.A, W = pt.st.W, ukg = pt.rx.basal / W;
    g.a1c3 = a1c;
    const T = SFD.target(Object.assign({}, CFG), pt.rx, pt.st.dfg);
    const revM = med(vals(rs, 'rev')), couM = med(vals(rs, 'coucher').concat(vals(rs, 'avDin')));
    g.st3 = [
      { t: 'La glycémie au réveil est dans l\'objectif.', f: () => revM >= O.rev[0] && revM <= O.rev[1] },
      { t: 'L\'HbA1c est au-dessus de la cible (≤ ' + fmt(T.max, 1) + ' %).', f: () => a1c > T.max },
      { t: 'Les glycémies de fin de journée sont nettement plus hautes que celles du réveil.', f: () => couM != null && revM != null && couM - revM > 0.3 },
      { t: 'La dose de basale dépasse 0,5 U/kg/j.', f: () => ukg > 0.5 },
      { t: 'Il faut continuer à augmenter la basale.', f: () => revM > O.rev[1], why: 'la basale se titre sur le réveil ; au-delà, elle corrige à tort la journée', src: 'SFD 2025, avis 19' }
    ];
    const agp = agpCard(sim);
    const titrN = sim.titrLog.length;
    frame('M3 : consultation de suivi', 'Cas guidé · diabète de type 2 · consultation, J90', [
      lastFeedback(),
      h('div', { class: 'sv-card' }, [
        h('p', null, [h('strong', null, 'HbA1c : ' + fmt(a1c, 1) + ' %'), ' (9,4 % à l\'initiation). Poids ' + fmt(W, 1) + ' kg.']),
        h('p', null, 'Basale actuelle : ' + pt.rx.basal + ' U/j (' + fmt(ukg, 2) + ' U/kg), après ' + titrN + ' adaptation' + (titrN > 1 ? 's' : '') + ' selon le protocole. ' + (pt.st.hypo ? 'Malaises depuis le début : ' + pt.st.hypo + '.' : 'Aucun malaise.')),
        h('p', { class: 'sv-muted' }, 'Il accepte maintenant « une injection de plus par semaine si ça évite d\'augmenter encore l\'insuline ».')
      ]),
      agp,
      carnetCard(sim, sim.asg === '1' ? '2' : sim.asg, sim.cgm, 'Carnet des 14 derniers jours', sim.cgm ? 'Valeurs relevées sur le capteur.' : 'Pour cette consultation, il a mesuré aussi un autre moment de la journée.'),
      statementsBlock('s3_', g.st3),
      h('div', { class: 'sv-card sv-ordo' }, [
        h('h3', null, 'Votre décision (plusieurs choix possibles)'),
        ...[['basal', 'Augmenter la basale de 4 U'], ['sema', 'Ajouter le sémaglutide (0,25 mg/sem, paliers mensuels jusqu\'à 1 mg)'], ['tirz', 'Ajouter le tirzépatide (2,5 mg/sem, paliers mensuels jusqu\'à 7,5 mg)'], ['sglt2', 'Ajouter l\'empagliflozine 10 mg'], ['bolus', 'Ajouter 4 U d\'analogue rapide au repas le plus hyperglycémiant'], ['su', 'Reprendre le gliclazide 60 mg'], ['stopdpp', 'Arrêter la sitagliptine'], ['ide', 'Prolonger les passages IDE']].map(([k, t]) => h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'c3' + k }), ' ' + t])),
        h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-primary', onclick: submit3 }, 'Valider et voir l\'évolution à 6 mois →'))
      ])
    ]);
  }

  function submit3() {
    const sim = g.sim, pt = sim.pt;
    const c = (k) => document.getElementById('c3' + k).checked;
    const fb = gradeStatements('s3_', g.st3);
    const rs = rows(sim, sim.asg === '1' ? '2' : sim.asg, sim.cgm), O = Y.objOf(sim.titr);
    const revM = med(vals(rs, 'rev')), W = pt.st.W, T = SFD.target(Object.assign({}, CFG), pt.rx, pt.st.dfg);
    const above = pt.st.A > T.max, revOk = revM <= O.rev[1];
    const glp = c('sema') || c('tirz');
    if (c('basal')) fb.push(revOk ? { tone: 'bad', text: 'Augmenter la basale alors que le réveil est dans l\'objectif : sur-basalisation (hypoglycémies nocturnes, prise de poids) ; c\'est la journée qu\'il faut traiter.', src: 'SFD 2025, avis 19' } : { tone: 'good', text: 'Réveil encore au-dessus de l\'objectif : la titration de la basale continue.', src: 'protocole du service' });
    if (above) {
      if (glp) fb.push({ tone: 'good', text: (c('tirz') ? 'Tirzépatide' : 'Sémaglutide') + ' ajouté à la basale : option préférée (efficacité au moins comparable aux bolus, moins d\'hypoglycémies et de prise de poids), d\'autant plus chez ce patient obèse (IMC 31).', src: 'SFD 2025, avis 14 et 19' });
      else if (c('sglt2')) fb.push({ tone: 'good', text: 'iSGLT2 ajouté : option possible (oral), moins efficace sur l\'HbA1c qu\'un aGLP1.', src: 'SFD 2025, avis 19' });
      else if (c('bolus')) fb.push({ tone: 'warn', text: 'Bolus au repas le plus hyperglycémiant : possible, mais l\'ajout d\'un aGLP1 ou du tirzépatide est préféré dans la majorité des cas.', src: 'SFD 2025, avis 19' });
      else if (!c('basal') || revOk) fb.push({ tone: 'bad', text: 'HbA1c au-dessus de la cible malgré une basale titrée : il faut intensifier (aGLP1 ou tirzépatide de préférence, sinon iSGLT2, ou bolus).', src: 'SFD 2025, avis 5 et 19' });
    } else if (glp || c('sglt2') || c('bolus')) fb.push({ tone: 'warn', text: 'HbA1c déjà dans la cible : l\'intensification n\'est pas nécessaire sur le plan glycémique (un aGLP1 reste discutable pour le poids).', src: 'SFD 2025, avis 14' });
    if (c('su')) fb.push({ tone: 'bad', text: 'Reprendre un sulfamide sous insuline : non ; risque d\'hypoglycémie.', src: 'SFD 2025, avis 18 ter' });
    if (glp && !c('stopdpp') && pt.rx.dpp4 > 0) fb.push({ tone: 'bad', text: 'aGLP1 ou tirzépatide sans arrêter la sitagliptine : association sans objet (mécanismes redondants).', src: 'SFD 2025, avis 20' });
    if (glp && c('stopdpp')) fb.push({ tone: 'good', text: 'Sitagliptine arrêtée en même temps : bien (redondance avec l\'aGLP1).', src: 'SFD 2025, avis 20' });
    if (glp) fb.push({ tone: 'info', text: 'Avec l\'aGLP1, la basale va probablement devoir baisser : le protocole la réduit si le réveil passe sous l\'objectif. Prévenir le patient.', src: 'protocole du service' });
    if (c('bolus') && !sim.cgm) fb.push({ tone: 'info', text: 'Avec un bolus, il faut aussi la glycémie avant le repas suivant (autosurveillance 4 fois par jour).', src: 'protocole du service' });
    // Application
    if (c('basal')) pt.rx.basal += 4;
    if (c('stopdpp')) pt.rx.dpp4 = 0;
    if (c('su')) pt.rx.su = 60;
    if (c('sglt2')) pt.rx.sglt2 = 'empa10';
    if (c('tirz')) { pt.rx.glp = 'tirz'; sim.glpPlan = { start: pt.day, doses: [2.5, 5, 7.5] }; }
    else if (c('sema')) { pt.rx.glp = 'sema'; sim.glpPlan = { start: pt.day, doses: [0.25, 0.5, 1] }; }
    if (c('bolus')) { pt.rx.rapidM = [0, 4, 0]; pt.rx.rapid = 4; if (sim.asg !== '4' && !sim.cgm) sim.asg = '4'; }
    if (c('ide')) sim.titr.who = 'ide';
    g.journal.push({ title: 'M3 · intensification', rx: ['basal', 'sema', 'tirz', 'sglt2', 'bolus', 'su', 'stopdpp', 'ide'].filter(c).map((k) => ({ basal: 'basale + 4 U', sema: 'sémaglutide', tirz: 'tirzépatide', sglt2: 'empagliflozine', bolus: 'bolus au déjeuner', su: 'gliclazide repris', stopdpp: 'sitagliptine arrêtée', ide: 'passages IDE' })[k]).join(', ') || 'aucun changement', fb });
    g.basal3 = pt.rx.basal; g.w3 = W; g.hypo3 = pt.st.hypo;
    run(sim, 182, true);
    g.step = 4; g.lastFb = fb;
    render();
  }

  function lastFeedback() {
    if (!g.lastFb) return null;
    return h('details', { class: 'sv-card sv-det', open: true }, [h('summary', null, 'Correction de l\'étape précédente'), feedbackList(g.lastFb)]);
  }

  /* ----- 4. Débriefing ----- */
  function debrief() {
    const sim = g.sim, pt = sim.pt;
    const all = g.journal.flatMap((j) => j.fb);
    const pen = all.reduce((a, f) => a + (f.pen != null ? f.pen : PEN[f.tone]), 0);
    const note = Math.max(0, Math.round((20 - pen) * 2) / 2);
    const n = (t) => all.filter((f) => f.tone === t).length;
    const T = SFD.target(Object.assign({}, CFG), pt.rx, pt.st.dfg);
    const KEYS = [
      ['Initiation : une injection d\'analogue lent, 6 à 10 U/j ou 0,1 à 0,2 U/kg/j ; garder la metformine, arrêter le sulfamide.', 'SFD 2025, avis 18 et 18 ter'],
      ['Titration par le patient (ou une IDE) : glycémie au réveil chaque jour ; + 2 U (1 U sous 10 U) après 2 à 3 jours de suite au-dessus de l\'objectif ; baisse dès l\'injection suivante en cas d\'hypoglycémie.', 'protocole du service ; SFD 2025, avis 18'],
      ['La basale se juge sur le réveil ; un bolus, sur la glycémie avant le repas suivant.', 'protocole du service'],
      ['Réveil dans l\'objectif mais HbA1c au-dessus de la cible, ou basale > 0,5 U/kg : ne plus monter la basale ; ajouter un aGLP1 ou le tirzépatide (préféré), sinon un oral ou un bolus.', 'SFD 2025, avis 19'],
      ['aGLP1 et iDPP4 ne s\'associent pas.', 'SFD 2025, avis 20'],
      ['Sous insuline : capteur recommandé ; remboursé sous basale seule si HbA1c > 8 %, sans condition à 3 injections/j ou plus.', 'SFD 2025, avis 23 ; LPPR']
    ];
    frame('Initier une insuline basale : débriefing', 'Cas guidé · diabète de type 2 · M9', [
      lastFeedback(),
      h('div', { class: 'sv-card sv-score' }, [
        h('div', { class: 'sv-grade' }, [h('span', { class: 'sv-grade-n' }, fmt(note, note % 1 ? 1 : 0)), h('span', { class: 'sv-grade-d' }, '/20')]),
        h('div', null, [
          h('p', { class: 'sv-q' }, 'À 9 mois : HbA1c ' + fmt(pt.st.A, 1) + ' % (cible ≤ ' + fmt(T.max, 1) + ' %), poids ' + fmt(pt.st.W, 1) + ' kg (' + (pt.st.W - g.w3 >= 0 ? '+' : '') + fmt(pt.st.W - g.w3, 1) + ' kg depuis M3), basale ' + pt.rx.basal + ' U/j (' + g.basal3 + ' U à M3), ' + (pt.st.hypo - g.hypo3) + ' malaise(s) depuis M3.'),
          h('p', { class: 'sv-muted' }, n('good') + ' points corrects, ' + n('warn') + ' discutables, ' + n('bad') + ' erreurs.')
        ])
      ]),
      agpCard(sim, 'Rapport AGP à 9 mois'),
      carnetCard(sim, sim.asg, sim.cgm, 'Carnet des 14 derniers jours (M9)', null),
      h('div', { class: 'sv-card' }, [h('h3', null, 'À retenir'), h('ul', { class: 'sv-keys sv-refs' }, KEYS.map(([t, src]) => h('li', null, [t, h('span', { class: 'sv-src' }, ' · ' + src)])))]),
      h('div', { class: 'sv-card' }, [h('h3', null, 'Vos décisions')].concat(g.journal.map((j) => h('details', { class: 'sv-journal' }, [h('summary', null, j.title + ' · ' + j.rx), feedbackList(j.fb)])))),
      h('div', { class: 'sv-actions' }, [
        h('button', { type: 'button', class: 'sv-primary', onclick: start }, 'Rejouer le cas'),
        h('button', { type: 'button', class: 'sv-secondary', onclick: () => S.casesUI.home() }, 'Autres cas')
      ])
    ]);
  }

  S.dt2case = { start, title: 'Initier une insuline basale', tagline: 'Trithérapie orale en échec, HbA1c 9,4 % : dose de départ, traitements associés, titration, carnets à lire à J14 et à 3 mois, intensification.', patient: NAME + ', 62 ans' };
})();
