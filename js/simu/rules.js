/*
 * Moteur de correction : commente chaque décision de l'étudiant.
 * Chaque remarque : { tone: 'good' | 'warn' | 'bad' | 'info', text, src, pen? }.
 * Pénalités par défaut : warn = 1 point, bad = 2 points (sur 20) ; pen les remplace.
 *
 * Sources : la sémiologie et les règles de dosage citées « polycopié » viennent du Polycopié de
 * sémiologie endocrinienne du CEEDMM (chapitre thyroïde). Les règles de traitement sont marquées
 * « complément » : consensus de la Société française d'endocrinologie sur la maladie de Basedow
 * (2016), recommandations usuelles sur la lévothyroxine, RCP des médicaments.
 */
(function () {
  'use strict';
  const S = window.HV.simu;
  const M = S.model;
  const POLY = 'polycopié';
  const CPL = 'complément';
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

  function timing(fb, weeks, good, okLo, okHi, why) {
    if (weeks >= good[0] && weeks <= good[1]) fb.push(it('good', 'Contrôle à ' + weeks + ' semaines : délai adapté. ' + why, CPL));
    else if (weeks >= okLo && weeks <= okHi) fb.push(it('warn', 'Contrôle à ' + weeks + ' semaines : délai discutable (idéal : ' + good[0] + ' à ' + good[1] + ' semaines). ' + why, CPL));
    else fb.push(it('bad', 'Contrôle à ' + weeks + ' semaines : délai inadapté (idéal : ' + good[0] + ' à ' + good[1] + ' semaines). ' + why, CPL));
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
      fb.push(it('bad', 'ATS prescrit à nouveau après une agranulocytose : contre-indication définitive à tous les antithyroïdiens de synthèse (réaction croisée).', CPL, 5));
    }

    // Choix de la molécule
    if (nextEq > 0) {
      if (preg != null && preg < 16) {
        if (d.ats === 'ptu') fb.push(it('good', 'PTU au 1er trimestre : le carbimazole et le thiamazole exposent à une embryopathie (aplasie du cuir chevelu, atrésie des choanes ou de l\'œsophage).', CPL));
        else fb.push(it('bad', M.ATS[d.ats].short + ' au 1er trimestre de grossesse : risque d\'embryopathie. Le PTU est la molécule du 1er trimestre.', CPL, 4));
      } else if (d.ats === 'ptu' && preg == null) {
        fb.push(it('warn', 'PTU hors grossesse : son hépatotoxicité (hépatites sévères) le réserve au 1er trimestre de grossesse et aux intolérances au carbimazole.', CPL));
      } else if (d.ats === 'ptu' && preg >= 16) {
        fb.push(it('info', 'Après le 1er trimestre, le relais par carbimazole est possible pour limiter l\'hépatotoxicité du PTU.', CPL));
      }
    }

    // Décision radicale ou fin de cure
    if (d.orient === 'stop') {
      const w = atsDays / 7;
      if (w < 52) fb.push(it('bad', 'Arrêt des ATS après ' + fmt(w) + ' semaines : trop tôt. Une cure dure 12 à 18 mois ; un arrêt précoce expose à la rechute.', CPL, 3));
      else {
        const trabMeasured = g.visits.some((v) => v.labs && v.labs.trab != null && pt.day - v.day < 120) || lab.trab != null;
        if (!trabMeasured) fb.push(it('warn', 'Fin de cure sans dosage récent des TRAb : leur persistance prédit la rechute et aide à décider entre arrêt et traitement radical.', CPL));
        else if (pt.st.TRAb > 1.8) fb.push(it('warn', 'TRAb encore positifs : le risque de rechute à l\'arrêt est élevé. Discuter la poursuite d\'un ATS à faible dose ou un traitement radical.', CPL));
        else fb.push(it('good', 'Arrêt après ' + fmt(w / 4.35) + ' mois avec des TRAb négatifs : bonnes chances de rémission. Surveillance de la T4L et de la TSH, d\'abord rapprochée, car une rechute reste possible.', CPL));
        if (t4 < 12 || t4 > 22) fb.push(it('warn', 'Arrêt alors que la T4L n\'est pas normale : obtenir d\'abord l\'euthyroïdie.', CPL));
      }
      return finishBasedow(g, d, fb, true);
    }
    if (d.orient === 'surgery') {
      fb.push(it(fl.orbito ? 'good' : 'info', 'Thyroïdectomie totale : traitement radical, à réaliser en euthyroïdie. Lévothyroxine à vie ensuite ; risques : hypoparathyroïdie, lésion récurrentielle.' + (fl.orbito ? ' Choix privilégié en cas d\'orbitopathie active, que l\'iode 131 peut aggraver.' : ''), CPL));
      return finishBasedow(g, d, fb, true);
    }
    if (d.orient === 'rai') {
      if (fl.orbito) fb.push(it('bad', 'Iode 131 malgré une orbitopathie active chez un fumeur : risque d\'aggravation de l\'orbitopathie. La chirurgie est préférable.', CPL, 3));
      else if (preg != null) fb.push(it('bad', 'Iode 131 contre-indiqué pendant la grossesse.', CPL, 5));
      else fb.push(it('good', 'Iode 131 : traitement radical, hypothyroïdie fréquente ensuite (surveillance de la TSH et de la T4L, lévothyroxine).', CPL));
      return finishBasedow(g, d, fb, true);
    }

    // Initiation
    if (prevEq === 0 && !g.noATS && !pt.flags.stopped) {
      if (nextEq === 0) fb.push(it('bad', 'Pas d\'antithyroïdien de synthèse devant une hyperthyroïdie basedowienne : l\'ATS est le traitement de première intention.', CPL, 4));
      else {
        const severe = t4 > 44;
        const lo = preg != null ? 10 : severe ? 30 : 20, hi = preg != null ? 30 : severe ? 40 : 30;
        const doseTxt = M.ATS[d.ats].short + ' ' + fmt(d.atsDose, d.atsDose % 1 ? 1 : 0) + ' mg/j (≈ ' + fmt(nextEq) + ' mg de carbimazole)';
        if (nextEq >= lo && nextEq <= hi) fb.push(it('good', doseTxt + ' : dose d\'attaque adaptée à ' + (severe ? 'une hyperthyroïdie sévère (T4L > 2 fois la normale).' : 'une hyperthyroïdie modérée.'), CPL));
        else if (nextEq < 15) fb.push(it('bad', doseTxt + ' : dose insuffisante pour contrôler l\'hyperthyroïdie (attaque : 20 à 40 mg/j de carbimazole).', CPL));
        else if (nextEq > 60) fb.push(it('bad', doseTxt + ' : dose excessive ; le risque d\'agranulocytose augmente avec la dose.', CPL));
        else fb.push(it('warn', doseTxt + ' : dose possible mais pas idéale (' + lo + ' à ' + hi + ' mg/j ici).', CPL));
        if (preg != null) fb.push(it('info', 'Grossesse : viser une T4L dans le haut de la normale avec la plus faible dose efficace ; les ATS traversent le placenta (risque d\'hypothyroïdie fœtale).', CPL));
      }
      if (d.lt4 > 0) fb.push(it('warn', 'Lévothyroxine d\'emblée : dans le schéma « bloquer-substituer », elle s\'ajoute une fois l\'euthyroïdie obtenue, pas au départ.', CPL));
      if (fl.asthma && d.bb.startsWith('pro')) fb.push(it('bad', 'Propranolol chez un asthmatique : bêtabloquant non cardiosélectif contre-indiqué.', CPL, 3));
      else if (hr >= 90 && d.bb === 'none') fb.push(it('warn', 'Pas de bêtabloquant malgré une tachycardie à ' + hr + '/min : le propranolol soulage palpitations et tremblement en attendant l\'effet de l\'ATS.', CPL));
      else if (hr >= 90 && d.bb !== 'none') fb.push(it('good', 'Bêtabloquant : contrôle rapide de la tachycardie et du tremblement, l\'ATS n\'agissant qu\'en quelques semaines.', CPL));
      const a1 = adviceCheck(g, d, 'agranulo', 'L\'agranulocytose (surtout les 3 premiers mois) est la complication grave des ATS.', 'bad'); if (a1) fb.push(a1);
      if (fl.fertile && preg == null) { const a = adviceCheck(g, d, 'contra', 'Le carbimazole est tératogène.'); if (a) fb.push(a); }
      if (fl.smoker) { const a = adviceCheck(g, d, 'tabac', 'Le tabac est le principal facteur de risque d\'orbitopathie (polycopié p. 31).', 'warn', POLY); if (a) fb.push(a); }
      if (fl.orbito) { const a = adviceCheck(g, d, 'ophtalmo', 'Une orbitopathie se dépiste et se suit avec l\'ophtalmologiste (polycopié p. 31-32).', 'warn', POLY); if (a) fb.push(a); }
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
      if (ok && dir === 'same' && (t4 > 22 || t3 > 6.8)) fb.push(it('good', 'Dose maintenue : ' + state + ' mais la T4L baisse ; l\'ATS vide le stock thyroïdien en 3 à 6 semaines.', CPL));
      else if (ok && dir === 'up') fb.push(it('good', 'Dose augmentée devant une ' + state + ' qui ne cède pas.', CPL));
      else if (ok && (dir === 'down' || dir === 'stop') && t4 >= 12) fb.push(it('good', 'Dose diminuée : ' + state + '. Schéma par paliers dégressifs jusqu\'à la dose minimale efficace (souvent 5 à 10 mg/j de carbimazole).', CPL));
      else if (ok && t4 < 12) fb.push(it('good', 'Dose ' + (dir === 'stop' ? 'suspendue' : 'nettement diminuée') + ' : l\'ATS a dépassé son but (hypothyroïdie iatrogène).' + (bloc ? ' L\'ajout de lévothyroxine (« bloquer-substituer ») est aussi possible.' : ''), CPL));
      else if (ok && bloc) fb.push(it('good', 'Schéma « bloquer-substituer » : l\'ATS bloque, la lévothyroxine substitue.', CPL));
      else if (ok) fb.push(it('good', 'Dose ' + DIR[dir] + ' : cohérent avec la ' + state + '.', CPL));
      else if ((dir === 'up') && tshLow && t4 <= 22 && t3 <= 6.8) fb.push(it('bad', 'Dose augmentée sur une TSH basse alors que la T4L et la T3L sont normales : la TSH reste freinée plusieurs semaines après la normalisation. Les premiers mois, on adapte sur la T4L (et la T3L).', CPL, 3));
      else if (t4 < 12) fb.push(it('bad', 'Dose ' + DIR[dir] + ' alors que l\'ATS a induit une hypothyroïdie (T4L ' + fmt(t4, 1) + ' pmol/L) : il fallait diminuer nettement la dose (ou ajouter de la lévothyroxine).', CPL, 3));
      else if (t4 > 22 || t3 > 6.8) fb.push(it('bad', 'Dose ' + DIR[dir] + ' alors que l\'hyperthyroïdie persiste (T4L ' + fmt(t4, 1) + ' pmol/L).', CPL));
      else if (dir === 'stop') fb.push(it('bad', 'ATS arrêté sans décision de fin de cure : la rechute est quasi certaine avant 12 à 18 mois.', CPL, 3));
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
      if (t4 > 22 || t3 > 6.8) fb.push(it('good', 'Rechute traitée par reprise d\'un ATS. Après une rechute, discuter un traitement radical (chirurgie ou iode 131).', CPL));
      else fb.push(it('warn', 'Reprise d\'un ATS sans rechute biologique.', CPL));
    } else if (g.noATS) {
      if (d.bb === 'none' && hr >= 90) fb.push(it('warn', 'Bêtabloquant à maintenir en attendant le traitement radical.', CPL));
      fb.push(it('warn', 'Après une agranulocytose, un traitement radical s\'impose : thyroïdectomie totale (ou iode 131).', CPL));
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
    else if (preg != null) timing(fb, d.weeks, [2, 4], 2, 6, 'Grossesse : contrôle toutes les 2 à 4 semaines pour éviter l\'hypothyroïdie fœtale.');
    else if (phase === 'init') timing(fb, d.weeks, [3, 4], 2, 6, 'Le premier contrôle se fait 3 à 4 semaines après le début de l\'ATS.');
    else if (nextEq > 0 && atsDays > 120 && pt.flags.lastChange != null && pt.day - pt.flags.lastChange > 70) timing(fb, d.weeks, [6, 12], 4, 12, 'Dose d\'entretien stable : contrôle tous les 2 à 3 mois.');
    else if (nextEq > 0) timing(fb, d.weeks, [4, 6], 3, 8, 'Pendant l\'adaptation des doses : contrôle toutes les 4 à 6 semaines.');
    // Examens prévus
    const T = d.tests;
    const early = atsDays < 120 || phase === 'init';
    if (nextEq > 0 || d.orient === 'stop' || pt.flags.stopped || radical) {
      if (!hasTest(T, 't4')) fb.push(it('bad', 'Prochain bilan sans T4L : c\'est elle qui guide l\'adaptation des ATS.', CPL));
      if (early && hasTest(T, 'tsh') && !hasTest(T, 't4')) fb.push(it('bad', 'TSH seule : elle reste freinée plusieurs semaines voire mois après la normalisation de la T4L.', CPL));
      if (early && hasTest(T, 't4') && !hasTest(T, 't3')) fb.push(it('info', 'La T3L complète utilement la T4L : certaines formes restent à T3 prédominante.', CPL));
      if (!early && !hasTest(T, 'tsh')) fb.push(it('warn', 'Une fois l\'euthyroïdie stable, la TSH redevient fiable : l\'associer à la T4L.', CPL));
    }
    if (nextEq > 0 && atsDays < 60 && !hasTest(T, 'nfs')) fb.push(it('warn', 'Pas de NFS prévue alors que l\'agranulocytose survient surtout les 2 à 3 premiers mois (surveillance selon le RCP).', CPL));
    if (hasTest(T, 'scinti') || hasTest(T, 'echo')) fb.push(it('warn', 'Imagerie inutile pour le suivi d\'une maladie de Basedow traitée.', CPL));
    if (hasTest(T, 'trab') && atsDays < 300 && !preg) fb.push(it('info', 'TRAb : inutiles en cours de cure ; on les dose avant l\'arrêt, en fin de traitement.', CPL));
    if (preg != null && preg >= 18 && !g.trabPreg && hasTest(T, 'trab')) { g.trabPreg = true; fb.push(it('good', 'TRAb au 2e ou 3e trimestre : s\'ils restent élevés, risque d\'hyperthyroïdie fœtale et néonatale (surveillance échographique du fœtus).', CPL)); }
    if (pt.flags.surgeryDone || d.orient === 'surgery') {
      if (d.orient === 'surgery' && !hasTest(T, 'ca')) fb.push(it('warn', 'Calcémie à prévoir après la chirurgie : l\'hypoparathyroïdie est la complication la plus fréquente de la thyroïdectomie totale.', CPL));
    }
    return fb;
  }

  /* ---------- Lévothyroxine ---------- */
  function target(g) {
    const cs = g.case, pt = g.pt;
    const preg = cs.pregWeek ? cs.pregWeek(pt.day) : null;
    if (preg != null && preg >= 0 && preg <= 40) return { lo: 0.1, hi: 2.5, label: 'TSH < 2,5 mUI/L (grossesse)' };
    if (cs.flags.elderly) return { lo: 0.5, hi: 6, label: 'TSH 0,5–6 mUI/L (sujet âgé coronarien : on tolère une TSH un peu haute)' };
    return { lo: 0.4, hi: 4, label: 'TSH 0,4–4 mUI/L (idéalement 0,5–2,5)' };
  }

  function lt4(g, d) {
    const fb = [];
    const pt = g.pt, cs = g.case, fl = cs.flags;
    const lab = g.current.labs || {};
    const prev = pt.rx.lt4, next = d.lt4;
    const dir = prev > 0 && next > 0 ? (next - prev >= 6 ? 'up' : prev - next >= 6 ? 'down' : 'same') : direction(prev, next);
    const isEvent = g.current.type === 'event';
    const full = 1.6 * pt.par.weight;
    const tg = target(g);
    const tsh = pt.st.TSH;
    const central = cs.kind === 'central';
    const preg = cs.pregWeek ? cs.pregWeek(pt.day) : null;
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
      if (next === 0 && cs.kind !== 'subclin') fb.push(it('bad', 'Pas de lévothyroxine devant une hypothyroïdie avérée.', CPL, 3));
      else if (next > 0) {
        if (fl.elderly) {
          if (next <= 25) fb.push(it('good', 'Lévothyroxine ' + fmt(next, next % 1 ? 1 : 0) + ' µg/j : début à faible dose chez le sujet âgé coronarien, pour ne pas démasquer une ischémie myocardique.', CPL));
          else if (next <= 50) fb.push(it('warn', 'Lévothyroxine ' + next + ' µg/j : un peu forte pour débuter chez un coronarien âgé (12,5 à 25 µg/j).', CPL));
          else fb.push(it('bad', 'Lévothyroxine ' + next + ' µg/j d\'emblée chez un coronarien âgé : risque d\'angor, voire d\'infarctus. Débuter à 12,5–25 µg/j.', CPL, 3));
        } else {
          const r = next / full;
          if (r >= 0.6 && r <= 1.15) fb.push(it('good', 'Lévothyroxine ' + next + ' µg/j (' + fmt(next / pt.par.weight, 1) + ' µg/kg/j) : chez l\'adulte jeune sans cardiopathie, la dose substitutive (≈ 1,6 µg/kg/j) peut être atteinte d\'emblée ou rapidement.', CPL));
          else if (r < 0.6) fb.push(it('warn', 'Lévothyroxine ' + next + ' µg/j : dose prudente ; sans cardiopathie, on peut viser d\'emblée ≈ 1,6 µg/kg/j (' + Math.round(full) + ' µg/j ici).', CPL));
          else fb.push(it('bad', 'Lévothyroxine ' + next + ' µg/j : au-delà de la dose substitutive complète (≈ ' + Math.round(full) + ' µg/j) : surdosage, thyrotoxicose iatrogène.', CPL));
        }
        const a = adviceCheck(g, d, 'jeun', 'L\'absorption de la lévothyroxine est diminuée par l\'alimentation, le fer, le calcium, les IPP.'); if (a) fb.push(a);
        if (fl.elderly || fl.coronary) { const b = adviceCheck(g, d, 'thorax', 'Chez le coronarien, l\'augmentation des besoins en oxygène peut démasquer un angor.'); if (b) fb.push(b); }
        if (fl.fertile) { const c = adviceCheck(g, d, 'grossesse', 'Les besoins augmentent dès le début de la grossesse.', 'info'); if (c) fb.push(c); }
      }
      if (next > 0) pt.flags.lt4Started = true;
    } else {
      // Adaptation
      const ref = central ? lab.t4 : lab.tsh;
      if (ref == null && g.visits.length > 0 && !isEvent) {
        fb.push(it('bad', central ? 'Pas de T4L : dans une hypothyroïdie centrale, c\'est la T4L qui guide la dose.' : 'Pas de TSH à cette consultation : la dose a été adaptée à l\'aveugle.', central ? CPL : POLY));
      }
      const changedRecently = pt.flags.lastChange != null && pt.day - pt.flags.lastChange < 35;
      let expect, state;
      if (central) {
        const t4 = 16 * pt.st.T4;
        state = 'T4L ' + fmt(t4, 1) + ' pmol/L';
        expect = t4 < 14 ? ['up'] : t4 > 22 ? ['down'] : ['same'];
      } else {
        state = 'TSH ' + (tsh < 0.01 ? '< 0,01' : fmt(tsh, tsh < 1 ? 2 : 1)) + ' mUI/L';
        expect = tsh > tg.hi ? ['up'] : tsh < tg.lo ? ['down'] : ['same'];
      }
      if (ref == null && isEvent) expect = null;
      if (preg != null && preg >= 0 && preg <= 40 && !g.pregBoost) {
        g.pregBoost = true;
        const r = next / prev;
        if (r >= 1.2 && r <= 1.5) fb.push(it('good', 'Dose augmentée de ' + Math.round((r - 1) * 100) + ' % dès la grossesse confirmée : les besoins augmentent de 25 à 50 % dès le 1er trimestre (TBG ↑, placenta, volume de distribution).', CPL));
        else if (r > 1.5) fb.push(it('warn', 'Hausse de ' + Math.round((r - 1) * 100) + ' % : un peu forte ; on augmente plutôt de 25 à 30 % d\'emblée, puis on adapte sur la TSH.', CPL));
        else if (r > 1.05) fb.push(it('warn', 'Hausse de ' + Math.round((r - 1) * 100) + ' % : insuffisante pour couvrir l\'augmentation des besoins (25 à 50 %).', CPL));
        else fb.push(it('bad', 'Dose inchangée en début de grossesse : il faut l\'augmenter de 25 à 30 % sans attendre (l\'hypothyroïdie maternelle menace le développement neurologique fœtal).', CPL, 3));
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
          fb.push(it('good', 'Cause de la hausse de la TSH corrigée : le fer, pris en même temps, diminuait l\'absorption de la lévothyroxine. Prise à jeun, fer au moins 2 heures plus tard ; on peut garder la dose et recontrôler.', CPL));
          expect = ['same', 'up'];
          if (dir === 'up') fb.push(it('warn', 'Corriger la prise ET augmenter la dose expose au surdosage : une fois l\'absorption restaurée, l\'ancienne dose suffit probablement.', CPL));
        } else if (!g.asked.has('observance')) fb.push(it('warn', 'TSH qui monte chez une patiente jusque-là équilibrée : chercher d\'abord une cause (observance, horaire de prise, fer, calcium, IPP) avant d\'augmenter la dose.', CPL));
        else fb.push(it('warn', 'Vous avez trouvé la cause (fer pris avec la lévothyroxine) sans corriger les conditions de prise.', CPL));
      }
      if (expect) {
        if (expect.includes(dir)) {
          if (dir === 'same' && !central && tsh > tg.hi) fb.push(it('good', state + ' : dose maintenue après correction de la cause ; recontrôle à 6–8 semaines.', CPL));
          else if (dir === 'same') fb.push(it('good', state + ' dans la cible (' + (central ? 'T4L dans la moitié supérieure de la normale' : tg.label) + ') : dose maintenue.', CPL));
          else fb.push(it('good', state + ' : dose ' + DIR[dir] + ' (' + (central ? 'cible : T4L dans la moitié supérieure de la normale' : 'cible : ' + tg.label) + ').', CPL));
          const step = Math.abs(next - prev);
          if (dir !== 'same' && step > (fl.elderly ? 25 : 50)) fb.push(it(fl.elderly ? 'bad' : 'warn', 'Palier de ' + step + ' µg : trop large. On ajuste par paliers de 12,5 à 25 µg' + (fl.elderly ? ' chez le sujet âgé coronarien.' : '.'), CPL));
        } else if (changedRecently && dir !== 'same') {
          fb.push(it('warn', 'Dose modifiée alors que le dernier changement date de moins de 5 semaines : l\'équilibre n\'est pas atteint (demi-vie de la T4 ≈ 7 jours).', CPL));
        } else {
          fb.push(it(expect[0] === 'same' ? 'warn' : 'bad', state + ' : dose ' + DIR[dir] + ', il fallait ' + TODO[expect[0]] + '. Cible : ' + (central ? 'T4L dans la moitié supérieure de la normale (la TSH n\'est pas interprétable).' : tg.label + '.'), CPL));
        }
      }
    }
    // Délai
    const changed = next !== prev;
    if (preg != null && preg >= 0 && preg < 40) timing(fb, d.weeks, preg < 24 ? [4, 4] : [4, 8], 3, preg < 24 ? 6 : 10, 'Grossesse : TSH toutes les 4 semaines jusqu\'à mi-grossesse, puis au moins une fois par trimestre.');
    else if (g.ppVisitDay === pt.day) timing(fb, d.weeks, [6, 8], 4, 12, 'TSH 6 semaines après l\'accouchement.');
    else if (changed || prev === 0) timing(fb, d.weeks, [6, 8], 4, 12, 'L\'équilibre est atteint 6 à 8 semaines après chaque changement de dose (polycopié : toute TSH anormale se contrôle à 6–8 semaines).');
    else timing(fb, d.weeks, g.stableCount >= 1 ? [26, 52] : [6, 12], 4, 52, g.stableCount >= 1 ? 'Équilibre confirmé : TSH tous les 6 à 12 mois.' : 'Dose inchangée : contrôle pour confirmer l\'équilibre.');
    // Examens prévus
    const T = d.tests;
    if (central) {
      if (!hasTest(T, 't4')) fb.push(it('bad', 'Prochain bilan sans T4L : seule la T4L permet d\'adapter le traitement d\'une hypothyroïdie centrale.', CPL));
      if (hasTest(T, 'tsh') && !hasTest(T, 't4')) fb.push(it('bad', 'TSH seule dans une hypothyroïdie centrale : non interprétable.', CPL));
      else if (hasTest(T, 'tsh')) fb.push(it('info', 'La TSH n\'apporte rien au suivi d\'une hypothyroïdie centrale (elle s\'effondre sous traitement).', CPL));
    } else {
      if (!hasTest(T, 'tsh')) fb.push(it('bad', 'Prochain bilan sans TSH : c\'est le paramètre de suivi de la lévothyroxine dans l\'hypothyroïdie primaire.', CPL));
      if (hasTest(T, 't3')) fb.push(it('warn', 'T3L inutile dans l\'hypothyroïdie (polycopié p. 22).', POLY));
      if (hasTest(T, 'tpo') && g.tpoKnown) fb.push(it('warn', 'Anti-TPO déjà connus : inutile de les redoser (polycopié p. 23).', POLY));
    }
    if (hasTest(T, 'scinti')) fb.push(it('warn', 'Scintigraphie inutile devant une hypothyroïdie (polycopié).', POLY));
    if (hasTest(T, 'echo')) fb.push(it('info', 'Échographie : seulement en cas d\'anomalie palpatoire (nodule) ; elle ne guide pas la dose.', CPL));
    if (hasTest(T, 'trab') || hasTest(T, 'nfs')) fb.push(it('warn', 'Examens sans intérêt pour le suivi de la lévothyroxine.', CPL));
    if (hasTest(T, 'ca') && pt.flags.surgeryDone && !g.caDone) { g.caDone = true; fb.push(it('good', 'Calcémie après thyroïdectomie : dépistage de l\'hypoparathyroïdie.', CPL)); }
    return fb;
  }

  /* ---------- Hypothyroïdie infraclinique ---------- */
  function subclin(g, d) {
    const fb = [];
    const pt = g.pt;
    const tsh = pt.st.TSH;
    const first = g.visits.length === 0;
    if (d.ats !== 'none') fb.push(it('bad', 'ATS : contresens, la TSH est élevée.', CPL, 4));
    if (d.lt4 > 0) fb.push(it('warn', 'Lévothyroxine pour une TSH < 10 mUI/L, T4L normale, chez une patiente peu symptomatique : pas d\'indication systématique. On confirme et on surveille.', CPL));
    else fb.push(it('good', first ? 'Pas de traitement d\'emblée : une TSH modérément élevée (4–10 mUI/L) se contrôle à 6–8 semaines (polycopié).' : 'Pas de traitement : TSH < 10 mUI/L, T4L normale, peu de symptômes, pas de projet de grossesse. Surveillance.', first ? POLY : CPL));
    const T = d.tests;
    if (first) {
      timing(fb, d.weeks, [6, 8], 4, 12, 'Une TSH anormale se contrôle à 6–8 semaines (polycopié).');
      if (!hasTest(T, 'tsh')) fb.push(it('bad', 'Contrôle sans TSH.', POLY));
      if (!hasTest(T, 't4')) fb.push(it('warn', 'T4L à associer au contrôle : elle distingue l\'hypothyroïdie infraclinique (T4L normale) de l\'hypothyroïdie avérée.', POLY));
      if (!hasTest(T, 'tpo') && !g.tpoKnown) fb.push(it('warn', 'Anti-TPO à doser : ils signent l\'origine auto-immune et le risque d\'évolution vers l\'hypothyroïdie (polycopié p. 23).', POLY));
      else if (hasTest(T, 'tpo') && !g.tpoKnown) fb.push(it('good', 'Anti-TPO : étiologie auto-immune et risque d\'évolution (polycopié p. 23).', POLY));
    } else {
      timing(fb, d.weeks, [26, 52], 12, 52, 'Hypothyroïdie infraclinique avec anti-TPO : TSH tous les 6 à 12 mois.');
      if (!hasTest(T, 'tsh')) fb.push(it('bad', 'Surveillance sans TSH.', POLY));
      if (hasTest(T, 'tpo') && g.tpoKnown) fb.push(it('warn', 'Anti-TPO déjà positifs : inutile de les redoser (polycopié p. 23).', POLY));
    }
    if (hasTest(T, 't3')) fb.push(it('warn', 'T3L inutile dans l\'hypothyroïdie (polycopié p. 22).', POLY));
    if (hasTest(T, 'scinti')) fb.push(it('warn', 'Scintigraphie inutile devant une TSH élevée (polycopié).', POLY));
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

  S.rules = { TESTS, ADVICE, ORIENT, WEEKS, evaluate, evaluateTests, penalty, target, fmt };
})();
