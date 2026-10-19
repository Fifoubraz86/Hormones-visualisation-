/*
 * Moteur de correction : commente chaque décision de l'étudiant.
 * Chaque remarque : { tone: 'good' | 'warn' | 'bad' | 'info', text, src, pen? }.
 * Pénalités par défaut : warn = 1 point, bad = 2 points (sur 20) ; pen les remplace.
 *
 * Sources : « polycopié » = Polycopié de sémiologie endocrinienne du CEEDMM (chapitre thyroïde) ;
 * « item 241/242/243 · SFE p. X » = référentiel EDN SFE/CEEDMM de l'item (rangs A et B), page du
 * chapitre ; « complément » = ce qui ne figure dans aucune des deux sources.
 */
(function () {
  'use strict';
  const S = window.HV.simu;
  const M = S.model;
  const POLY = 'polycopié';
  const CPL = 'complément';
  const I242 = (p) => 'item 242 · SFE p. ' + p;
  const I243 = (p) => 'item 243 · SFE p. ' + p;
  const fmt = (v, d = 0) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
  const it = (tone, text, src, pen) => ({ tone, text, src, pen });

  // Examens disponibles. kind : bio, img, ecg.
  const TESTS = {
    tsh: { label: 'TSH', group: 'Thyroïde' },
    t4: { label: 'T4 libre', group: 'Thyroïde' },
    t3: { label: 'T3 libre', group: 'Thyroïde' },
    trab: { label: 'TRAb (anti-récepteur de la TSH)', group: 'Thyroïde' },
    tpo: { label: 'Anticorps anti-TPO', group: 'Thyroïde' },
    nfs: { label: 'NFS (polynucléaires neutrophiles)', group: 'Tolérance' },
    hepat: { label: 'Bilan hépatique', group: 'Tolérance' },
    ca: { label: 'Calcémie', group: 'Tolérance' },
    hcg: { label: 'β-hCG plasmatiques', group: 'Contexte' },
    cortisol: { label: 'Cortisol à 8 h', group: 'Contexte' },
    ecg: { label: 'ECG', group: 'Contexte' },
    echo: { label: 'Échographie thyroïdienne', group: 'Imagerie' },
    scinti: { label: 'Scintigraphie thyroïdienne', group: 'Imagerie' },
    irm: { label: 'IRM hypophysaire', group: 'Imagerie' }
  };

  const ADVICE = {
    agranulo: 'Informer : fièvre ou angine → NFS en urgence et arrêt de l\'ATS',
    nfs10: 'NFS tous les 10 jours pendant les 2 premiers mois',
    contra: 'Contraception efficace pendant le traitement',
    tabac: 'Arrêt du tabac',
    ophtalmo: 'Avis ophtalmologique',
    jeun: 'Lévothyroxine à jeun, 30 min avant le petit-déjeuner, à distance du fer, du calcium et des IPP',
    thorax: 'Consulter en urgence en cas de douleur thoracique',
    grossesse: 'Prévenir dès un début de grossesse',
    stress: 'Hydrocortisone : doubler en cas de fièvre, carte d\'insuffisant surrénalien'
  };

  const ORIENT = {
    none: 'Poursuite du suivi',
    stop: 'Arrêt du traitement antithyroïdien (fin de cure)',
    surgery: 'Thyroïdectomie totale',
    rai: 'Iode radioactif (iode 131)'
  };

  const WEEKS = [1, 2, 3, 4, 6, 8, 12, 26, 52];

  /* ---------- Outils ---------- */
  function hasTest(set, k) { return set && (set.has ? set.has(k) : set.includes(k)); }
  function direction(prev, next) {
    if (prev <= 0 && next > 0) return 'start';
    if (prev > 0 && next <= 0) return 'stop';
    if (prev <= 0 && next <= 0) return 'none';
    const r = next / prev;
    return r > 1.12 ? 'up' : r < 0.88 ? 'down' : 'same';
  }
  const DIR = { start: 'débutée', stop: 'arrêtée', up: 'augmentée', down: 'diminuée', same: 'inchangée', none: 'aucune' };
  const TODO = { start: 'débuter', stop: 'arrêter', up: 'augmenter', down: 'diminuer', same: 'maintenir', none: 'ne rien prescrire' };

  const lcFirst = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  function adviceCheck(g, d, key, why, tone = 'warn', src = CPL) {
    if (g.advice.has(key)) return null;
    g.adviceWarned = g.adviceWarned || new Set();
    if (g.adviceWarned.has(key) && !d.advice.has(key)) return null;
    if (!d.advice.has(key)) g.adviceWarned.add(key);
    if (d.advice.has(key)) { g.advice.add(key); return it('good', 'Conseil donné : ' + lcFirst(ADVICE[key]) + '.', src); }
    return it(tone, 'Conseil oublié : ' + lcFirst(ADVICE[key]) + '. ' + why, src);
  }

  function timing(fb, weeks, good, okLo, okHi, why, src = CPL) {
    const ideal = good[0] === good[1] ? good[0] + ' semaine' + (good[0] > 1 ? 's' : '') : good[0] + ' à ' + good[1] + ' semaines';
    const w = weeks + ' semaine' + (weeks > 1 ? 's' : '');
    if (weeks >= good[0] && weeks <= good[1]) fb.push(it('good', 'Contrôle à ' + w + ' : délai adapté. ' + why, src));
    else if (weeks >= okLo && weeks <= okHi) fb.push(it('warn', 'Contrôle à ' + w + ' : délai discutable (idéal : ' + ideal + '). ' + why, src));
    else fb.push(it('bad', 'Contrôle à ' + w + ' : délai inadapté (idéal : ' + ideal + '). ' + why, src));
  }

  /* ---------- Maladie de Basedow ---------- */
  function basedow(g, d) {
    const fb = [];
    const pt = g.pt, cs = g.case, fl = cs.flags;
    const lab = g.current.labs || {};
    const t4 = 16 * pt.st.T4, t3 = 5 * pt.st.T3;
    const prevEq = M.atsEq(pt.rx), nextEq = d.ats !== 'none' ? d.atsDose * M.ATS[d.ats].eq : 0;
    const dir = direction(prevEq, nextEq);
    const atsDays = pt.flags.atsStart != null ? pt.day - pt.flags.atsStart : 0;
    const preg = cs.pregWeek ? cs.pregWeek(pt.day) : null;
    const hr = M.clinic(pt).hr;

    if (g.noATS && nextEq > 0) {
      fb.push(it('bad', 'ATS prescrit à nouveau après une agranulocytose : contre-indication définitive à tous les antithyroïdiens de synthèse.', I242('16'), 5));
    }

    // Choix de la molécule
    if (nextEq > 0) {
      if (preg != null && preg < 16) {
        if (d.ats === 'ptu') fb.push(it('good', 'PTU au 1er trimestre : il est préféré pendant la grossesse, le carbimazole étant tératogène entre 6 et 10 SA.', I242('20')));
        else fb.push(it('bad', M.ATS[d.ats].short + ' au 1er trimestre de grossesse : le carbimazole est tératogène entre 6 et 10 SA ; le PTU est préféré.', I242('20'), 4));
      } else if (d.ats === 'ptu' && preg == null) {
        fb.push(it('warn', 'PTU hors grossesse : on utilise le carbimazole ou le thiamazole (méthimazole) ; le PTU est préféré pendant la grossesse. Les thiouraciles donnent des hépatites cytolytiques.', I242('16-18')));
      } else if (d.ats === 'ptu' && preg >= 16) {
        fb.push(it('info', 'Après le 1er trimestre, le relais par carbimazole est possible pour limiter l\'hépatotoxicité du PTU.', CPL));
      }
    }

    // Décision radicale ou fin de cure
    if (d.orient === 'stop') {
      const w = atsDays / 7;
      if (w < 52) fb.push(it('bad', 'Arrêt des ATS après ' + fmt(w) + ' semaines : trop tôt. Une cure dure 12 à 18 mois (2 à 4 ans chez l\'enfant).', I242('17'), 3));
      else {
        const trabMeasured = g.visits.some((v) => v.labs && v.labs.trab != null && pt.day - v.day < 120) || lab.trab != null;
        if (!trabMeasured) fb.push(it('warn', 'Fin de cure sans dosage récent des TRAb : un titre élevé en fin de traitement prédit la rechute.', I242('8-9')));
        else if (pt.st.TRAb > 1.8) fb.push(it('warn', 'TRAb encore élevés en fin de cure : rechute probable. Options : chirurgie, iode 131 ou ATS à faible dose au long cours.', I242('8-9, 17')));
        else fb.push(it('good', 'Arrêt après ' + fmt(w / 4.35) + ' mois avec des TRAb négatifs : bonnes chances de rémission. Surveillance prolongée : la rechute concerne 40 à 50 % des patients.', I242('17')));
        if (t4 < 12 || t4 > 22) fb.push(it('warn', 'Arrêt alors que la T4L n\'est pas normale : obtenir d\'abord l\'euthyroïdie.', CPL));
      }
      return finishBasedow(g, d, fb, true);
    }
    if (d.orient === 'surgery') {
      fb.push(it(fl.orbito ? 'good' : 'info', 'Thyroïdectomie totale : à réaliser après obtention de l\'euthyroïdie, pour éviter la crise aiguë thyrotoxique ; complications 1 à 4 %. Lévothyroxine à vie ensuite.' + (fl.orbito ? ' Indiquée en cas d\'orbitopathie modérée à sévère ; l\'iode 131 peut l\'aggraver.' : ''), I242('17-18')));
      if (t4 > 22 && prevEq === 0 && !g.noATS) fb.push(it('bad', 'Chirurgie programmée sans euthyroïdie préalable par ATS : risque de crise aiguë thyrotoxique.', I242('6, 17'), 3));
      return finishBasedow(g, d, fb, true);
    }
    if (d.orient === 'rai') {
      if (fl.orbito) fb.push(it('bad', 'Iode 131 malgré une orbitopathie : risque d\'aggravation de l\'orbitopathie et d\'élévation des TRAb. La chirurgie est indiquée.', I242('17-18'), 3));
      else if (preg != null) fb.push(it('bad', 'Iode 131 contre-indiqué pendant la grossesse (β-hCG avant le traitement).', I242('17'), 5));
      else fb.push(it('good', 'Iode 131 : action en 1 à 3 mois, hypothyroïdie définitive fréquente ensuite.' + (fl.fertile ? ' Contraception 6 mois ; à éviter si une grossesse est envisagée dans les 2 ans.' : ''), I242('17-18')));
      return finishBasedow(g, d, fb, true);
    }

    // Initiation
    if (prevEq === 0 && !g.noATS && !pt.flags.stopped) {
      if (nextEq === 0) fb.push(it('bad', 'Pas d\'antithyroïdien de synthèse devant une hyperthyroïdie basedowienne : l\'ATS est le traitement de première intention.', CPL, 4));
      else {
        // Doses d'attaque du référentiel : carbimazole 20–40, thiamazole 15–30, PTU 200–400 mg/j.
        const RANGE = { cbz: [20, 40], tmz: [15, 30], ptu: [200, 400] }[d.ats];
        const lo = preg != null ? RANGE[0] / 2 : RANGE[0], hi = RANGE[1];
        const doseTxt = M.ATS[d.ats].short + ' ' + fmt(d.atsDose, d.atsDose % 1 ? 1 : 0) + ' mg/j';
        if (d.atsDose >= lo && d.atsDose <= hi) fb.push(it('good', doseTxt + ' : dans les doses d\'attaque (' + RANGE[0] + ' à ' + RANGE[1] + ' mg/j). Délai d\'action : 10 à 15 jours.', I242('15')));
        else if (d.atsDose < lo * 0.75) fb.push(it('bad', doseTxt + ' : dose insuffisante (attaque : ' + RANGE[0] + ' à ' + RANGE[1] + ' mg/j).', I242('15')));
        else if (d.atsDose > hi * 1.5) fb.push(it('bad', doseTxt + ' : au-delà des doses d\'attaque (' + RANGE[0] + ' à ' + RANGE[1] + ' mg/j) ; les effets indésirables augmentent.', I242('15-16')));
        else fb.push(it('warn', doseTxt + ' : en dehors des doses d\'attaque usuelles (' + RANGE[0] + ' à ' + RANGE[1] + ' mg/j).', I242('15')));
        if (preg != null) fb.push(it('info', 'Grossesse : ATS à la dose minimale, T4L visée à la limite supérieure de la normale ; les ATS exposent à un goitre ou une hypothyroïdie fœtale.', I242('14, 20')));
      }
      if (d.lt4 > 0) fb.push(it('warn', 'Lévothyroxine d\'emblée : on obtient d\'abord l\'euthyroïdie par ATS ; le schéma « block and replace » (équivalent à la titration) ajoute ensuite la lévothyroxine.', I242('15, 17')));
      if (fl.asthma && d.bb.startsWith('pro')) fb.push(it('bad', 'Propranolol chez un asthmatique : bêtabloquant non cardiosélectif, contre-indiqué.', CPL, 3));
      else if (hr >= 90 && d.bb === 'none') fb.push(it('warn', 'Pas de bêtabloquant malgré une tachycardie à ' + hr + '/min : le propranolol (non cardiosélectif) fait partie des moyens symptomatiques, avec le repos.', I242('15')));
      else if (hr >= 90 && d.bb !== 'none') fb.push(it('good', 'Propranolol : contrôle de la tachycardie en attendant l\'effet des ATS (10 à 15 jours).', I242('15')));
      const a1 = adviceCheck(g, d, 'agranulo', 'L\'agranulocytose (0,2 à 0,5 %) est l\'effet indésirable grave des ATS ; fièvre ou angine imposent une NFS en urgence.', 'bad', I242('16')); if (a1) fb.push(a1);
      const a2 = adviceCheck(g, d, 'nfs10', 'Surveillance des ATS : NFS de référence, puis tous les 10 jours pendant 2 mois.', 'warn', I242('16')); if (a2) fb.push(a2);
      if (fl.fertile && preg == null) { const a = adviceCheck(g, d, 'contra', 'La contraception fait partie des moyens thérapeutiques (carbimazole tératogène).', 'warn', I242('15, 20')); if (a) fb.push(a); }
      if (fl.smoker) { const a = adviceCheck(g, d, 'tabac', 'Le tabac est le principal facteur de risque d\'orbitopathie (polycopié p. 31).', 'warn', POLY); if (a) fb.push(a); }
      if (fl.orbito) { const a = adviceCheck(g, d, 'ophtalmo', 'Orbitopathie : avis ophtalmologique (en urgence, sous 48 h, si neuropathie optique ou inocclusion palpébrale).', 'warn', I242('8')); if (a) fb.push(a); }
      return finishBasedow(g, d, fb, false, 'init');
    }

    // Suivi sous ATS
    if (prevEq > 0) {
      const t4m = lab.t4, t3m = lab.t3;
      if (t4m == null && g.current.type !== 'event') fb.push(it('bad', 'Pas de T4L à cette consultation : la dose a été adaptée à l\'aveugle (T4L réelle : ' + fmt(t4, 1) + ' pmol/L).', CPL));
      const tshLow = pt.st.TSH < 0.4;
      let expect;
      if (t4 > 22 || t3 > 6.8) expect = atsDays < 35 && t4 < 35 ? ['same', 'up'] : ['up'];
      else if (t4 >= 12) {
        if (preg != null && t4 < 16) expect = ['down', 'stop'];
        else if (prevEq <= 10 && t4 >= 14) expect = ['same', 'down'];
        else expect = t4 < 15 ? ['down'] : ['down', 'same'];
      } else expect = ['down', 'stop'];
      const tshHigh = pt.st.TSH > 4 && t4 <= 22 && t3 <= 6.8;
      if (tshHigh) expect = ['down', 'stop'];
      const bloc = d.lt4 > 0 && nextEq > 0;
      if (bloc && t4 < 16 && expect.includes('down')) expect = expect.concat(['same', 'up']);
      const ok = expect.includes(dir);
      const state = t4 > 22 || t3 > 6.8 ? 'hyperthyroïdie persistante' : t4 < 12 ? 'hypothyroïdie iatrogène' : tshHigh ? 'TSH élevée (surdosage en ATS)' : t4 < 15 ? 'T4L dans le bas de la normale' : 'T4L normale';
      if (ok && dir === 'same' && (t4 > 22 || t3 > 6.8)) fb.push(it('good', 'Dose maintenue : ' + state + ' mais la T4L baisse ; l\'ATS bloque la TPO, le stock d\'hormones met plusieurs semaines à s\'épuiser.', I242('15')));
      else if (ok && dir === 'up') fb.push(it('good', 'Dose augmentée devant une ' + state + ' qui ne cède pas.', CPL));
      else if (ok && (dir === 'down' || dir === 'stop') && t4 >= 12) fb.push(it('good', 'Dose diminuée : ' + state + '. Schéma par paliers dégressifs jusqu\'à la dose minimale efficace (souvent 5 à 10 mg/j de carbimazole).', CPL));
      else if (ok && t4 < 12) fb.push(it('good', 'Dose ' + (dir === 'stop' ? 'suspendue' : 'nettement diminuée') + ' : l\'ATS a dépassé son but (hypothyroïdie iatrogène).' + (bloc ? ' L\'ajout de lévothyroxine (« bloquer-substituer ») est aussi possible.' : ''), CPL));
      else if (ok && bloc) fb.push(it('good', 'Schéma « bloquer-substituer » : l\'ATS bloque, la lévothyroxine substitue.', CPL));
      else if (ok) fb.push(it('good', 'Dose ' + DIR[dir] + ' : cohérent avec la ' + state + '.', CPL));
      else if ((dir === 'up') && tshLow && t4 <= 22 && t3 <= 6.8) fb.push(it('bad', 'Dose augmentée sur une TSH basse alors que la T4L et la T3L sont normales : la TSH reste basse longtemps sous ATS. On adapte d\'abord sur la T4L.', I242('16'), 3));
      else if (t4 < 12) fb.push(it('bad', 'Dose ' + DIR[dir] + ' alors que l\'ATS a induit une hypothyroïdie (T4L ' + fmt(t4, 1) + ' pmol/L) : il fallait diminuer nettement la dose (ou ajouter de la lévothyroxine).', CPL, 3));
      else if (t4 > 22 || t3 > 6.8) fb.push(it('bad', 'Dose ' + DIR[dir] + ' alors que l\'hyperthyroïdie persiste (T4L ' + fmt(t4, 1) + ' pmol/L).', CPL));
      else if (dir === 'stop') fb.push(it('bad', 'ATS arrêté sans décision de fin de cure : la cure dure 12 à 18 mois.', I242('17'), 3));
      else if (dir === 'same' && t4 < 15) fb.push(it('warn', 'Dose maintenue avec une T4L dans le bas de la normale : sans réduction, l\'hypothyroïdie iatrogène menace.', CPL));
      else fb.push(it('warn', 'Dose ' + DIR[dir] + ' : il fallait ' + expect.map((e) => TODO[e]).join(' ou ') + ' devant une ' + state + '.', CPL));
      if (dir === 'down' && nextEq > 0 && nextEq / prevEq < 0.3 && t4 >= 12) fb.push(it('warn', 'Baisse très brutale : on réduit plutôt par paliers (d\'un tiers à la moitié de la dose).', CPL));
      if (d.bb !== 'none' && t3 <= 6.8 && hr < 80) fb.push(it('warn', 'Bêtabloquant à arrêter : l\'euthyroïdie est obtenue (FC ' + hr + '/min).', CPL));
      if (fl.asthma && d.bb.startsWith('pro')) fb.push(it('bad', 'Propranolol chez un asthmatique : contre-indiqué.', CPL, 3));
      return finishBasedow(g, d, fb, false, 'follow');
    }

    // Après l'arrêt : surveillance, rechute éventuelle
    if (pt.flags.stopped && nextEq === 0) {
      if (t4 > 22 || t3 > 6.8) fb.push(it('bad', 'Rechute non traitée (T4L ' + fmt(t4, 1) + ' pmol/L) : reprise d\'un ATS ou traitement radical à discuter.', CPL, 3));
      else fb.push(it('good', 'Rémission : surveillance de la TSH et de la T4L.', CPL));
    } else if (pt.flags.stopped && nextEq > 0) {
      if (t4 > 22 || t3 > 6.8) fb.push(it('good', 'Rechute traitée par reprise d\'un ATS. Après une rechute : chirurgie, iode 131 ou ATS à faible dose au long cours.', I242('17')));
      else fb.push(it('warn', 'Reprise d\'un ATS sans rechute biologique.', CPL));
    } else if (g.noATS) {
      if (d.bb === 'none' && hr >= 90) fb.push(it('warn', 'Bêtabloquant à maintenir en attendant le traitement radical.', CPL));
      fb.push(it('warn', 'Après une agranulocytose (contre-indication de tous les ATS), un traitement radical s\'impose : thyroïdectomie totale ou iode 131.', I242('16-17')));
    }
    return finishBasedow(g, d, fb, false, 'after');
  }

  function finishBasedow(g, d, fb, radical, phase) {
    const pt = g.pt;
    const atsDays = pt.flags.atsStart != null ? pt.day - pt.flags.atsStart : 0;
    const nextEq = d.ats !== 'none' ? d.atsDose * M.ATS[d.ats].eq : 0;
    const preg = g.case.pregWeek ? g.case.pregWeek(pt.day) : null;
    // Délai du prochain contrôle
    if (d.orient === 'surgery' || d.orient === 'rai') timing(fb, d.weeks, [3, 6], 2, 8, 'Contrôle de la préparation ou de l\'effet du traitement radical.');
    else if (d.orient === 'stop' || pt.flags.stopped) timing(fb, d.weeks, [4, 8], 3, 12, 'Après l\'arrêt, la rechute survient surtout dans les premiers mois.');
    else if (preg != null) timing(fb, d.weeks, [2, 4], 2, 6, 'Grossesse : surveillance maternelle et fœtale rapprochée.', I242('20'));
    else if (phase === 'init') timing(fb, d.weeks, [3, 4], 2, 6, 'Surveillance des ATS : T4L à 3–4 semaines.', I242('16'));
    else if (nextEq > 0 && atsDays > 120 && pt.flags.lastChange != null && pt.day - pt.flags.lastChange > 70) timing(fb, d.weeks, [8, 12], 6, 12, 'Euthyroïdie stable : TSH tous les 3 mois.', I242('16'));
    else if (nextEq > 0) timing(fb, d.weeks, [4, 6], 3, 8, 'Pendant l\'adaptation des doses : contrôle toutes les 4 à 6 semaines.');
    // Examens prévus
    const T = d.tests;
    const early = atsDays < 120 || phase === 'init';
    if (nextEq > 0 || d.orient === 'stop' || pt.flags.stopped || radical) {
      if (!hasTest(T, 't4')) fb.push(it('bad', 'Prochain bilan sans T4L : c\'est elle qui guide l\'adaptation des ATS.', CPL));
      if (early && hasTest(T, 'tsh') && !hasTest(T, 't4')) fb.push(it('bad', 'TSH seule : sous ATS, la TSH reste basse longtemps ; le premier contrôle repose sur la T4L.', I242('16')));
      if (early && hasTest(T, 't4') && !hasTest(T, 't3')) fb.push(it('info', 'T3L : utile si la T4L est normale (hyperthyroïdie à T3).', I242('5')));
      if (!early && !hasTest(T, 'tsh')) fb.push(it('warn', 'Après la phase initiale, la surveillance se fait sur la TSH (tous les 3 mois).', I242('16')));
    }
    if (nextEq > 0 && atsDays < 60 && !hasTest(T, 'nfs') && !g.advice.has('nfs10')) fb.push(it('warn', 'Pas de NFS prévue : elle se fait tous les 10 jours pendant les 2 premiers mois de traitement.', I242('16')));
    if (hasTest(T, 'scinti') || hasTest(T, 'echo')) fb.push(it('warn', 'Imagerie inutile pour le suivi d\'une maladie de Basedow traitée.', CPL));
    if (hasTest(T, 'trab') && atsDays < 300 && !preg) fb.push(it('info', 'TRAb : le titre n\'a pas à être suivi en cours de cure ; c\'est le titre en fin de traitement qui prédit la rechute.', I242('8-9')));
    if (preg != null && preg >= 18 && !g.trabPreg && hasTest(T, 'trab')) { g.trabPreg = true; fb.push(it('good', 'TRAb pendant la grossesse : ils traversent le placenta (hyperthyroïdie fœtale ou néonatale) ; à doser même après un traitement radical.', I242('14'))); }
    if (pt.flags.surgeryDone || d.orient === 'surgery') {
      if (d.orient === 'surgery' && !hasTest(T, 'ca')) fb.push(it('warn', 'Calcémie à prévoir après la chirurgie : risque d\'hypoparathyroïdie après thyroïdectomie totale.', 'item 241 · SFE-C p. 4-5'));
    }
    return fb;
  }

  /* ---------- Lévothyroxine ---------- */
  // Cibles de TSH (item 243, SFE p. 11-12) : 0,5–2,5 mUI/L ; sujet très âgé ou coronarien : jusqu'à 4–10 ;
  // grossesse : 0,5–2,5. lo/hi = zone acceptée, ideal = objectif.
  function target(g) {
    const cs = g.case, pt = g.pt;
    const preg = cs.pregWeek ? cs.pregWeek(pt.day) : null;
    if (preg != null && preg >= 0 && preg <= 40) return { lo: 0.5, hi: 2.5, ideal: 2.5, label: 'TSH 0,5–2,5 mUI/L (grossesse)' };
    if (cs.flags.elderly) return { lo: 0.5, hi: 10, ideal: 2.5, label: 'TSH 0,5–2,5 mUI/L, tolérée jusqu\'à 4–10 chez le sujet très âgé ou coronarien' };
    return { lo: 0.4, hi: 4, ideal: 2.5, label: 'TSH 0,5–2,5 mUI/L' };
  }

  function lt4(g, d) {
    const fb = [];
    const pt = g.pt, cs = g.case, fl = cs.flags;
    const lab = g.current.labs || {};
    const prev = pt.rx.lt4, next = d.lt4;
    const dir = prev > 0 && next > 0 ? (next - prev >= 6 ? 'up' : prev - next >= 6 ? 'down' : 'same') : direction(prev, next);
    const isEvent = g.current.type === 'event';
    const w = pt.par.weight;
    const tg = target(g);
    const tsh = pt.st.TSH;
    const central = cs.kind === 'central';
    const preg = cs.pregWeek ? cs.pregWeek(pt.day) : null;
    // Sujet âgé ou coronarien : montée par paliers de 12,5–25 µg toutes les 1–2 semaines jusqu'à la dose cible
    // (≈ 1 µg/kg/j), puis TSH à 6–8 semaines (item 243, SFE p. 11-12).
    const titrating = fl.elderly && prev > 0 && prev < 0.9 * w && tsh > 4;
    if (d.ats !== 'none') fb.push(it('bad', 'Antithyroïdien de synthèse chez un patient hypothyroïdien : contresens.', CPL, 4));

    if (central) {
      if (next > 0 && !g.cortisolKnown) fb.push(it('bad', 'Lévothyroxine sans évaluation de l\'axe corticotrope : en cas d\'insuffisance corticotrope associée, la lévothyroxine peut déclencher une insuffisance surrénale aiguë.', CPL, 3));
      if (next > 0 && cs.adrenalInsuff && !d.hc) fb.push(it('bad', 'Cortisol bas et lévothyroxine sans hydrocortisone : risque d\'insuffisance surrénale aiguë. L\'hydrocortisone précède (ou accompagne) la lévothyroxine.', CPL, 4));
      if (d.hc && cs.adrenalInsuff) {
        if (!g.hcGiven) fb.push(it('good', 'Hydrocortisone d\'abord : on corrige l\'insuffisance corticotrope avant ou avec la lévothyroxine.', CPL));
        g.hcGiven = true;
        const a = adviceCheck(g, d, 'stress', 'Éducation indispensable de l\'insuffisant surrénalien (doses de stress).', 'warn'); if (a) fb.push(a);
      }
    }

    if (prev === 0 && !(pt.flags.lt4Started)) {
      // Initiation
      if (next === 0 && cs.kind !== 'subclin') fb.push(it('bad', 'Pas de lévothyroxine devant une hypothyroïdie avérée.', I243('11'), 3));
      else if (next > 0) {
        const perKg = next / w;
        const doseTxt = 'Lévothyroxine ' + fmt(next, next % 1 ? 1 : 0) + ' µg/j (' + fmt(perKg, 2) + ' µg/kg/j)';
        if (fl.elderly) {
          if (next <= 25) fb.push(it('good', doseTxt + ' : début à 12,5–25 µg/j chez le sujet âgé ou coronarien.', I243('11-12')));
          else if (next <= 50) fb.push(it('warn', doseTxt + ' : trop fort pour débuter chez un coronarien âgé (12,5 à 25 µg/j).', I243('11-12')));
          else fb.push(it('bad', doseTxt + ' d\'emblée chez un coronarien âgé : la coronaropathie peut être démasquée par le traitement. Débuter à 12,5–25 µg/j.', I243('5, 11-12'), 3));
        } else {
          if (perKg >= 1 && perKg <= 1.6) fb.push(it('good', doseTxt + ' : dans la dose substitutive de 1 à 1,5 µg/kg/j.', I243('11')));
          else if (perKg >= 0.6 && perKg < 1) fb.push(it('warn', doseTxt + ' : en dessous de la dose substitutive (1 à 1,5 µg/kg/j, soit ' + Math.round(w) + ' à ' + Math.round(1.5 * w) + ' µg/j ici) ; la TSH ne se normalisera probablement pas.', I243('11')));
          else if (perKg < 0.6) fb.push(it('warn', doseTxt + ' : dose de forme fruste (25–75 µg/j) ; une hypothyroïdie patente demande 1 à 1,5 µg/kg/j.', I243('11')));
          else if (perKg <= 1.8) fb.push(it('warn', doseTxt + ' : un peu au-dessus de la dose substitutive (1 à 1,5 µg/kg/j) ; attention au surdosage (os, cœur).', I243('11-12')));
          else fb.push(it('bad', doseTxt + ' : au-delà de la dose substitutive (1 à 1,5 µg/kg/j) ; le surdosage menace l\'os et le cœur.', I243('11-12')));
        }
        const a = adviceCheck(g, d, 'jeun', 'Fer, calcium, IPP, magnésium diminuent l\'absorption de la lévothyroxine.', 'warn', I243('12-13')); if (a) fb.push(a);
        if (fl.elderly || fl.coronary) { const b = adviceCheck(g, d, 'thorax', 'Chez le coronarien, le traitement peut démasquer la coronaropathie : consulter en cas de douleur thoracique.', 'warn', I243('11-12')); if (b) fb.push(b); }
        if (fl.fertile) { const c = adviceCheck(g, d, 'grossesse', 'Les besoins augmentent de 25 à 50 % dès le diagnostic de grossesse.', 'info', I243('12')); if (c) fb.push(c); }
      }
      if (next > 0) pt.flags.lt4Started = true;
    } else {
      // Adaptation
      const ref = central ? lab.t4 : lab.tsh;
      if (ref == null && g.visits.length > 0 && !isEvent && !titrating) {
        fb.push(it('bad', central ? 'Pas de T4L : dans une insuffisance thyréotrope, le suivi se fait sur la T4L, jamais sur la TSH.' : 'Pas de TSH à cette consultation : dans l\'hypothyroïdie primaire, le suivi se fait sur la TSH seule.', I243('11')));
      }
      const changedRecently = pt.flags.lastChange != null && pt.day - pt.flags.lastChange < (central ? 14 : 35);
      let expect, state;
      if (central) {
        const t4 = 16 * pt.st.T4;
        state = 'T4L ' + fmt(t4, 1) + ' pmol/L';
        expect = t4 < 16 ? ['up'] : t4 > 22 ? ['down'] : ['same'];
      } else {
        state = 'TSH ' + (tsh < 0.01 ? '< 0,01' : fmt(tsh, tsh < 1 ? 2 : 1)) + ' mUI/L';
        expect = tsh > tg.hi ? ['up'] : tsh > tg.ideal ? ['same', 'up'] : tsh < tg.lo ? ['down'] : tsh < 0.5 ? ['same', 'down'] : ['same'];
      }
      if (ref == null && isEvent) expect = null;
      if (titrating && !isEvent) {
        expect = null;
        const step = next - prev;
        if (step >= 12 && step <= 25) fb.push(it('good', 'Palier de ' + step + ' µg : montée progressive par paliers de 12,5 à 25 µg chez le sujet âgé coronarien.', I243('11-12')));
        else if (step > 25) fb.push(it('bad', 'Palier de ' + step + ' µg : trop large chez un coronarien âgé (12,5 à 25 µg).', I243('11-12'), 3));
        else if (step > 0) fb.push(it('warn', 'Palier de ' + step + ' µg : très prudent ; les paliers sont de 12,5 à 25 µg.', I243('11-12')));
        else fb.push(it('warn', 'Dose inchangée alors que la dose cible (≈ 1 µg/kg/j) n\'est pas atteinte : poursuivre la montée par paliers de 12,5 à 25 µg.', I243('11-12')));
      }
      if (preg != null && preg >= 0 && preg <= 40 && !g.pregBoost) {
        g.pregBoost = true;
        const r = next / prev;
        if (r >= 1.24 && r <= 1.5) fb.push(it('good', 'Dose augmentée de ' + Math.round((r - 1) * 100) + ' % dès le diagnostic de grossesse : hausse attendue de 25 à 50 %.', I243('12')));
        else if (r > 1.5) fb.push(it('warn', 'Hausse de ' + Math.round((r - 1) * 100) + ' % : au-delà des 25 à 50 % recommandés.', I243('12')));
        else if (r > 1.05) fb.push(it('warn', 'Hausse de ' + Math.round((r - 1) * 100) + ' % : insuffisante (25 à 50 % dès le diagnostic de grossesse).', I243('12')));
        else fb.push(it('bad', 'Dose inchangée en début de grossesse : il faut l\'augmenter de 25 à 50 % dès le diagnostic ; au 1er trimestre, le fœtus dépend des hormones maternelles (troubles neuro-intellectuels).', I243('6, 12'), 3));
        expect = null;
      }
      if (cs.postpartum && cs.postpartum(pt.day) && !g.ppDone) {
        g.ppDone = true; g.ppVisitDay = pt.day;
        const pre = cs.preDose;
        if (Math.abs(next - pre) <= 13) fb.push(it('good', 'Après l\'accouchement, retour à la dose d\'avant la grossesse (' + pre + ' µg/j) ; TSH à 6 semaines.', CPL));
        else fb.push(it('bad', 'Après l\'accouchement, il faut revenir à la dose antérieure (' + pre + ' µg/j) : les besoins chutent, risque de surdosage.', CPL, 2));
        expect = null;
      }
      if (expect && cs.interaction && g.interactionActive && !g.interactionFixed && tsh > tg.hi) {
        if (d.advice.has('jeun')) {
          g.interactionFixed = true; pt.par.abs = 1;
          fb.push(it('good', 'Cause de la hausse de la TSH corrigée : le fer, pris en même temps, diminuait l\'absorption de la lévothyroxine. On peut garder la dose et recontrôler.', I243('12-13')));
          expect = ['same', 'up'];
          if (dir === 'up') fb.push(it('warn', 'Corriger la prise ET augmenter la dose expose au surdosage : une fois l\'absorption restaurée, l\'ancienne dose suffit probablement.', CPL));
        } else if (!g.asked.has('observance')) fb.push(it('warn', 'TSH qui monte chez une patiente équilibrée : chercher une cause de besoins augmentés (malabsorption par fer, calcium, IPP, magnésium ; maladie cœliaque, gastrite atrophique ; œstrogènes) avant d\'augmenter la dose.', I243('12-13')));
        else fb.push(it('warn', 'Vous avez trouvé la cause (fer pris avec la lévothyroxine) sans corriger les conditions de prise.', I243('12-13')));
      }
      if (expect) {
        const cible = central ? 'T4L entre le milieu et le tiers supérieur de la normale' : tg.label;
        if (expect.includes(dir)) {
          if (dir === 'same' && !central && tsh > tg.hi) fb.push(it('good', state + ' : dose maintenue après correction de la cause ; recontrôle à 6–8 semaines.', CPL));
          else if (dir === 'same' && !central && tsh > tg.ideal) fb.push(it('good', state + ' : dose maintenue ; l\'objectif reste ' + cible + (fl.elderly ? '.' : ', une augmentation de 12,5 à 25 µg était aussi possible.'), I243('11-12')));
          else if (dir === 'same') fb.push(it('good', state + ' : dans la cible (' + cible + '), dose maintenue.', I243('11-12')));
          else fb.push(it('good', state + ' : dose ' + DIR[dir] + ' (cible : ' + cible + ').', I243('11-12')));
          const step = Math.abs(next - prev);
          if (dir !== 'same' && step > (fl.elderly ? 25 : 50)) fb.push(it(fl.elderly ? 'bad' : 'warn', 'Palier de ' + step + ' µg : trop large. On ajuste par paliers de 12,5 à 25 µg.', I243('11-12')));
        } else if (changedRecently && dir !== 'same') {
          fb.push(it('warn', 'Dose modifiée alors que l\'équilibre du changement précédent n\'est pas atteint (' + (central ? 'T4L à contrôler 15 à 21 jours après' : 'TSH à contrôler 6 à 8 semaines après') + ').', I243('11')));
        } else {
          fb.push(it(expect[0] === 'same' ? 'warn' : 'bad', state + ' : dose ' + DIR[dir] + ', il fallait ' + TODO[expect[0]] + '. Cible : ' + cible + (central ? ' (jamais sur la TSH).' : '.'), I243('11-12')));
        }
      }
    }
    // Délai
    const changed = next !== prev;
    const still = fl.elderly && next < 0.9 * w && tsh > 4 && next > 0;
    if (preg != null && preg >= 0 && preg < 40) timing(fb, d.weeks, [4, 4], 3, 6, 'Grossesse : TSH mensuelle.', I243('12'));
    else if (g.ppVisitDay === pt.day) timing(fb, d.weeks, [6, 8], 4, 12, 'TSH 6 semaines après l\'accouchement.');
    else if (central && (changed || prev === 0)) timing(fb, d.weeks, [2, 3], 2, 6, 'Insuffisance thyréotrope : T4L 15 à 21 jours après chaque changement, à jeun avant la prise.', I243('11-12'));
    else if (still) timing(fb, d.weeks, [1, 2], 1, 3, 'Sujet âgé coronarien : paliers toutes les 1 à 2 semaines jusqu\'à la dose cible, puis TSH à 6–8 semaines.', I243('11-12'));
    else if (changed || prev === 0) timing(fb, d.weeks, [6, 8], 4, 12, 'TSH 6 à 8 semaines après la dose cible (polycopié : toute TSH anormale se contrôle à 6–8 semaines).', I243('11'));
    else timing(fb, d.weeks, g.stableCount >= 1 ? [26, 52] : [6, 26], 4, 52, g.stableCount >= 1 ? 'Équilibre confirmé : contrôle à 6 mois, puis annuel.' : 'Dose inchangée : contrôle pour confirmer l\'équilibre, puis à 6 mois et chaque année.', I243('11'));
    // Examens prévus
    const T = d.tests;
    if (central) {
      if (!hasTest(T, 't4')) fb.push(it('bad', 'Prochain bilan sans T4L : l\'insuffisance thyréotrope se suit sur la T4L, jamais sur la TSH.', I243('11-12')));
      if (hasTest(T, 'tsh') && !hasTest(T, 't4')) fb.push(it('bad', 'TSH seule dans une insuffisance thyréotrope : non interprétable.', I243('11-12')));
      else if (hasTest(T, 'tsh')) fb.push(it('info', 'La TSH n\'a pas sa place dans le suivi d\'une insuffisance thyréotrope.', I243('11-12')));
    } else if (!still) {
      if (!hasTest(T, 'tsh')) fb.push(it('bad', 'Prochain bilan sans TSH : l\'hypothyroïdie primaire se suit sur la TSH seule.', I243('11')));
      if (hasTest(T, 't4') && !preg) fb.push(it('info', 'T4L non nécessaire : le suivi d\'une hypothyroïdie primaire repose sur la TSH seule.', I243('11')));
    }
    if (hasTest(T, 't3')) fb.push(it('warn', 'T3L inutile dans l\'hypothyroïdie (polycopié p. 22).', POLY));
    if (hasTest(T, 'tpo') && g.tpoKnown) fb.push(it('warn', 'Anti-TPO déjà connus : inutile de les redoser (polycopié p. 23).', POLY));
    if (hasTest(T, 'scinti')) fb.push(it('warn', 'Scintigraphie inutile devant une hypothyroïdie.', I243('7-8')));
    if (hasTest(T, 'echo')) fb.push(it('info', 'Échographie : elle ne guide pas la dose.', CPL));
    if (hasTest(T, 'trab') || hasTest(T, 'nfs')) fb.push(it('warn', 'Examens sans intérêt pour le suivi de la lévothyroxine.', CPL));
    if (hasTest(T, 'ca') && pt.flags.surgeryDone && !g.caDone) { g.caDone = true; fb.push(it('good', 'Calcémie après thyroïdectomie : dépistage de l\'hypoparathyroïdie.', 'item 241 · SFE-C p. 4-5')); }
    if (hasTest(T, 'ecg') && fl.coronary) fb.push(it('info', 'ECG : hebdomadaire si la coronaropathie est grave.', I243('12')));
    return fb;
  }

  /* ---------- Hypothyroïdie fruste (infraclinique) ---------- */
  // Item 243, SFE p. 3 et 12 : un seul dosage modérément élevé ne suffit pas ; TSH > 10 et/ou anti-TPO :
  // traiter (25–75 µg/j) ; TSH < 10 sans anti-TPO : TSH à 6 mois puis annuelle.
  function subclin(g, d) {
    const fb = [];
    const pt = g.pt;
    const tsh = pt.st.TSH;
    const first = g.visits.length === 0;
    const T = d.tests;
    if (d.ats !== 'none') fb.push(it('bad', 'ATS : contresens, la TSH est élevée.', CPL, 4));
    if (first) {
      if (d.lt4 > 0) fb.push(it('warn', 'Lévothyroxine sur un seul dosage : une TSH modérément élevée ne suffit pas pour traiter ; on confirme d\'abord.', I243('3')));
      else fb.push(it('good', 'Pas de traitement d\'emblée : un seul dosage modérément élevé ne suffit pas ; contrôle à 6–8 semaines (polycopié).', I243('3')));
      timing(fb, d.weeks, [6, 8], 4, 12, 'Une TSH anormale se contrôle à 6–8 semaines.', POLY);
      if (!hasTest(T, 'tsh')) fb.push(it('bad', 'Contrôle sans TSH.', POLY));
      if (!hasTest(T, 't4')) fb.push(it('warn', 'T4L à associer : normale, elle définit la forme fruste ; basse, la forme patente.', I243('2-3')));
      if (!hasTest(T, 'tpo') && !g.tpoDone) fb.push(it('warn', 'Anti-TPO à doser : leur présence fait traiter une forme fruste.', I243('12')));
      else if (hasTest(T, 'tpo')) fb.push(it('good', 'Anti-TPO : leur présence ferait traiter, leur absence autorise la surveillance.', I243('12')));
    } else {
      const pos = !!g.tpoKnown;
      if (tsh > 10 || pos) {
        if (d.lt4 >= 25 && d.lt4 <= 75) fb.push(it('good', 'Lévothyroxine ' + d.lt4 + ' µg/j : forme fruste avec ' + (tsh > 10 ? 'TSH > 10' : 'anti-TPO positifs') + ', à traiter (25–75 µg/j).', I243('11-12')));
        else if (d.lt4 > 75) fb.push(it('warn', 'Lévothyroxine ' + d.lt4 + ' µg/j : forte pour une forme fruste (25–75 µg/j).', I243('11')));
        else fb.push(it('warn', 'Pas de traitement alors que ' + (tsh > 10 ? 'la TSH dépasse 10' : 'les anti-TPO sont positifs') + ' : le référentiel propose de traiter.', I243('12')));
      } else {
        if (d.lt4 > 0) fb.push(it('warn', 'Lévothyroxine pour une TSH < 10 sans anti-TPO : pas d\'indication ; surveillance de la TSH.', I243('12')));
        else fb.push(it('good', 'Pas de traitement : TSH < 10 mUI/L sans anti-TPO. TSH à 6 mois, puis annuelle.', I243('12')));
      }
      if (d.lt4 > 0) timing(fb, d.weeks, [6, 8], 4, 12, 'TSH 6 à 8 semaines après la mise en route.', I243('11'));
      else timing(fb, d.weeks, [26, 26], 12, 52, 'Forme fruste sans anti-TPO : TSH à 6 mois, puis annuelle.', I243('12'));
      if (!hasTest(T, 'tsh')) fb.push(it('bad', 'Surveillance sans TSH.', I243('12')));
      if (hasTest(T, 'tpo') && g.tpoDone) fb.push(it('warn', 'Anti-TPO déjà dosés : inutile de les redoser (polycopié p. 23).', POLY));
    }
    if (hasTest(T, 't3')) fb.push(it('warn', 'T3L inutile dans l\'hypothyroïdie (polycopié p. 22).', POLY));
    if (hasTest(T, 'scinti')) fb.push(it('warn', 'Scintigraphie inutile devant une TSH élevée.', I243('7-8')));
    return fb;
  }

  function evaluate(g, d) {
    const k = g.mode;
    if (k === 'basedow') return basedow(g, d);
    if (k === 'subclin') return subclin(g, d);
    return lt4(g, d);
  }

  // Examens demandés à la première consultation, d'après la grille du cas.
  function evaluateTests(g, sel) {
    const fb = [];
    const grid = g.case.tests0;
    for (const k in grid) {
      const e = grid[k];
      const on = sel.has(k);
      if (e.cls === 'essential') fb.push(on ? it('good', TESTS[k].label + ' : ' + e.why, e.src || CPL) : it('bad', TESTS[k].label + ' manquant(e) : ' + e.why, e.src || CPL));
      else if (e.cls === 'useful') fb.push(on ? it('good', TESTS[k].label + ' : ' + e.why, e.src || CPL) : it('info', TESTS[k].label + ' aurait été utile : ' + e.why, e.src || CPL));
      else if (e.cls === 'useless' && on) fb.push(it('warn', TESTS[k].label + ' : ' + e.why, e.src || CPL));
    }
    sel.forEach((k) => { if (!grid[k]) fb.push(it('info', TESTS[k].label + ' : sans intérêt ici.', CPL, 0.5)); });
    return fb;
  }

  function penalty(item) { return item.pen != null ? item.pen : item.tone === 'bad' ? 2 : item.tone === 'warn' ? 1 : 0; }

  S.rules = { TESTS, ADVICE, ORIENT, WEEKS, evaluate, evaluateTests, penalty, target, fmt, I242, I243 };
})();
