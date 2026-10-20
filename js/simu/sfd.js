/*
 * Prise de position SFD 2025 sur les stratégies d'utilisation des traitements de l'hyperglycémie dans le
 * DT2 (Darmon P et al. Med Mal Metab 2025;19:630-662) appliquée au patient virtuel : cible d'HbA1c
 * individualisée (tableau I), cibles du capteur (tableau II), lecture de l'ordonnance au regard des avis,
 * règle d'initiation de l'insuline basale (avis 18), règles d'arrêt (avis 5).
 * Chaque message cite son avis. Le mode thérapeutique reste libre : seule l'initiation de l'insuline hors
 * recommandations est refusée.
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const S = (HV.simu = HV.simu || {});
  const fmt = (x, d) => x.toFixed(d).replace('.', ',');

  // Molécules ayant fait la preuve d'un bénéfice cardiovasculaire (avis 11) ou rénal (avis 12 ter).
  const CV_GLP = (rx) => (rx.glp === 'lira' && rx.glpDose >= 1.8) || (rx.glp === 'dula' && rx.glpDose >= 1.5) || (rx.glp === 'sema' && rx.glpDose >= 1) || (rx.glp === 'tirz' && rx.glpDose >= 15);
  const ISGLT2 = (rx) => rx.sglt2 && rx.sglt2 !== 'none';
  const GLP = (rx) => rx.glp && rx.glp !== 'none';
  const INS = (rx) => (rx.basal || 0) + (rx.rapid || 0) > 0;

  function bmiOf(c, W) { return (W || c.weight) / Math.pow(c.height / 100, 2); }
  function ckd(c, dfg) { return dfg < 60 || c.alb !== 'normo'; }
  function geria(c) { return c.age >= 75 ? c.geria || 'bonne' : null; }

  // Tableau I : cible d'HbA1c (max) et plancher éventuel sous SU, glinide ou insuline.
  function target(c, rx, dfg) {
    const hypoDrug = (rx.su || 0) > 0 || INS(rx);
    const g = geria(c);
    const why = [];
    let max = 7, floor = null, low = null;
    if (g === 'dependant') { max = 9; floor = hypoDrug && INS(rx) ? 7.5 : null; why.push('personne âgée dépendante et/ou à la santé très altérée : < 9 %' + (floor ? ', en restant au-dessus de 7,5 % sous insuline' : '') + ' ; glycémies préprandiales 1–2 g/L'); }
    else if (g === 'fragile') { max = 8; floor = hypoDrug ? 7 : null; why.push('personne âgée fragile : ≤ 8 %' + (floor ? ', en restant au-dessus de 7 % sous SU, glinide ou insuline' : '')); }
    else if (g === 'bonne') { max = 7; why.push('personne âgée en bonne santé : ≤ 7 %, en évitant au maximum les hypoglycémies sous SU, glinide ou insuline'); }
    else if (c.severe || dfg < 30 || (c.duration > 10 && c.hardTarget)) {
      max = 8; floor = hypoDrug ? 7 : null;
      why.push((c.severe ? 'espérance de vie < 5 ans ou comorbidité sévère' : dfg < 30 ? 'IRC sévère ou terminale (DFG < 30)' : 'diabète de plus de 10 ans, cible de 7 % difficile') + ' : ≤ 8 %' + (floor ? ', en restant au-dessus de 7 % sous SU, glinide ou insuline' : ''));
    } else {
      max = 7; low = hypoDrug ? null : 6.5;
      why.push('moins de 75 ans, espérance de vie > 5 ans, sans comorbidité sévère ni IRC sévère : ≤ 7 %' + (low ? ', voire ≤ 6,5 % si atteignable par le mode de vie et des traitements n\'exposant pas à l\'hypoglycémie' : ''));
    }
    return { max, floor, low, why, src: 'SFD 2025, avis 3 et 21, tableau I' };
  }

  // Tableau II : cibles du capteur.
  function cgmFragile(c) { const g = geria(c); return !!g || c.severe || c.irregular; }

  // Avis 18 : initiation de l'insuline basale. Renvoie un message bloquant ou null.
  function insulinInit(prevRx, rx, W) {
    const out = [];
    if (!(prevRx.basal > 0) && rx.basal > 0) {
      const hi = Math.max(10, Math.round(0.2 * W));
      if (rx.basal > hi) out.push('Insuline basale : on ne débute pas à ' + rx.basal + ' U. Initiation par une injection quotidienne à petite dose, 6 à 10 U/j ou 0,1 à 0,2 U/kg/j (soit ' + Math.max(6, Math.round(0.1 * W)) + ' à ' + hi + ' U pour ' + Math.round(W) + ' kg), puis titration tous les trois jours sur la glycémie au réveil (SFD 2025, avis 18).');
    }
    (rx.rapidM || []).forEach((u, m) => {
      const was = (prevRx.rapidM || [0, 0, 0])[m] || 0;
      const hi = Math.max(4, Math.round(0.1 * W), Math.round(0.1 * (rx.basal || 0)));
      if (!was && u > hi) out.push('Bolus du ' + ['petit-déjeuner', 'déjeuner', 'dîner'][m] + ' : on débute un analogue rapide à 4 U, 0,1 U/kg ou 10 % de la basale (au plus ' + hi + ' U ici), sur le repas le plus hyperglycémiant, puis on titre (complément : ADA Standards of Care ; schéma basal-bolus après avis diabétologique, SFD 2025, avis 19).');
    });
    return out;
  }

  // Dispositifs de surveillance (remboursement) : capteur et bandelettes. Renvoie les messages bloquants.
  // Capteur (FreeStyle Libre 2, extension LPPR 2023) : insulinothérapie intensifiée (≥ 3 injections/j ou
  // pompe), ou insulinothérapie non intensifiée avec HbA1c ≥ 8 %. Autosurveillance capillaire : réservée
  // aux patients sous traitement hypoglycémiant (sulfamide, glinide, insuline) ; hors insuline, 200
  // bandelettes et lancettes par an (HAS).
  function monitoring(rx, asg, cgm, a1c) {
    const out = [];
    const nInj = (rx.basal > 0 ? 1 : 0) + (rx.rapidM || []).filter((x) => x > 0).length;
    if (cgm) {
      if (!INS(rx)) out.push('Capteur de glucose : pris en charge seulement sous insuline (HAS, LPPR). Sans insuline, il n\'est pas remboursé.');
      else if (nInj < 3 && !(a1c >= 8)) out.push('Capteur de glucose sous insulinothérapie non intensifiée (' + nInj + ' injection' + (nInj > 1 ? 's' : '') + '/j) : remboursé seulement si l\'HbA1c est ≥ 8 % (dernière HbA1c ' + (a1c != null ? fmt(a1c, 1) + ' %' : 'inconnue') + ') ; sous insulinothérapie intensifiée (≥ 3 injections/j), sans condition d\'HbA1c.');
    }
    if (asg && asg !== '0') {
      if (!INS(rx) && !(rx.su > 0)) out.push('Autosurveillance glycémique capillaire : sans traitement hypoglycémiant (sulfamide, glinide, insuline), elle n\'est pas recommandée en routine et le lecteur et les bandelettes ne sont pas pris en charge (HAS).');
      else if (!INS(rx) && asg !== 'w4') out.push('Sans insuline (sulfamide seul), l\'autosurveillance est limitée à 200 bandelettes et lancettes par an, soit environ 4 mesures par semaine (HAS).');
    }
    return out;
  }

  // Lecture de l'ordonnance : liste de { lvl: 'stop' | 'warn' | 'tip' | 'ok', t, src }.
  // st : { c (patient), rx, prevRx, dfg, a1c, W, hypos, starts: {drug: {day, a1c, w}}, day, ppr, glyNote }
  function advise(st) {
    const c = st.c, rx = st.rx, dfg = st.dfg, a1c = st.a1c, W = st.W;
    const T = target(c, rx, dfg);
    const out = [];
    const add = (lvl, t, src) => out.push({ lvl, t, src });
    const bmi = bmiOf(c, W), g = geria(c), cv = c.cvd || c.hcvr;
    const above = a1c != null && a1c > T.max;

    // Protection d'organe, quel que soit l'HbA1c (avis 11, 12 ter, 13).
    if (c.hfail && !ISGLT2(rx)) add('warn', 'Insuffisance cardiaque : iSGLT2 (dapagliflozine ou empagliflozine 10 mg) d\'emblée, quel que soit l\'HbA1c.', 'avis 13');
    if (ckd(c, dfg) && !ISGLT2(rx) && dfg >= 20) add('warn', 'Maladie rénale chronique (DFG < 60 et/ou albuminurie) : iSGLT2 d\'emblée, quel que soit l\'HbA1c ; si contre-indication, sémaglutide 1 mg/sem.', 'avis 12 ter');
    if (cv && !ISGLT2(rx) && !CV_GLP(rx)) add('warn', (c.cvd ? 'Maladie athéromateuse avérée' : 'Risque cardiovasculaire élevé ou très élevé') + ' : iSGLT2 ou aGLP1 ayant fait la preuve d\'un bénéfice CV (liraglutide 1,8 mg/j, dulaglutide ≥ 1,5 mg/sem, sémaglutide 1 mg/sem, tirzépatide 15 mg/sem, empagliflozine, dapagliflozine), quel que soit l\'HbA1c ; aGLP1 plutôt après un AVC ou en cas d\'AOMI.', 'avis 11');
    if (cv && GLP(rx) && !CV_GLP(rx)) add('tip', 'Bénéfice CV démontré aux doses des grands essais : ' + ({ lira: 'liraglutide 1,8 mg/j', dula: 'dulaglutide ≥ 1,5 mg/sem', sema: 'sémaglutide 1 mg/sem', tirz: 'tirzépatide 15 mg/sem' }[rx.glp]) + '.', 'avis 11');
    if ((bmi >= 30 || c.masld) && !GLP(rx) && !(g === 'dependant')) add('tip', (bmi >= 30 ? 'Obésité (IMC ' + fmt(bmi, 1) + ')' : 'MASLD/MASH') + ' : envisager un aGLP1 ou le tirzépatide, quel que soit l\'HbA1c ; à défaut, un iSGLT2.', bmi >= 30 ? 'avis 14' : 'avis 15');

    // Mode de vie en première intention chez tous (HAS 2024, SFD 2025 avis 4 et 8).
    if (!(rx.act > 0) && !rx.diet && !(rx.wtGoal > 0) && !rx.sodaStop) add('tip', 'Mesures hygiéno-diététiques (activité physique, prise en charge nutritionnelle) en première intention chez tous les patients, avant et avec tout médicament.', 'HAS 2024 ; SFD 2025, avis 4 et 8');
    // Metformine (avis 8, 9, 12 bis, 20).
    if (!(rx.met > 0) && dfg >= 30 && !c.metIntol) add('tip', 'Metformine en première intention (sauf contre-indication ou intolérance digestive avérée), à doses progressives jusqu\'à la dose maximale tolérée, en 2 ou 3 prises au cours ou à la fin des repas.', 'avis 8 et 9');
    if (rx.met > 0 && dfg < 30) add('stop', 'Metformine contre-indiquée sous 30 mL/min/1,73 m² : à arrêter.', 'avis 12 bis');
    else if (rx.met > 1000 && dfg < 45) add('warn', 'DFG ' + Math.round(dfg) + ' : metformine 1 g/j au plus entre 30 et 44.', 'avis 12 bis');
    else if (rx.met > 2000 && dfg < 60) add('warn', 'DFG ' + Math.round(dfg) + ' : metformine 2 g/j au plus entre 45 et 59.', 'avis 12 bis');
    if (rx.met > 2000) add('tip', '3 g/j de metformine n\'apportent que peu de bénéfice par rapport à 2 g/j, pour plus de troubles digestifs.', 'avis 8');
    if (rx.met > 0 && c.hfail && c.hfUnstable) add('warn', 'Metformine à éviter dans l\'insuffisance cardiaque instable.', 'avis 13');

    // iDPP4 (avis 10, 12 bis, 20, 21 bis).
    if (rx.dpp4 > 50 && dfg < 45) add('warn', 'Sitagliptine : 50 mg/j au plus sous 45 mL/min (25 mg/j sous 30).', 'avis 12 bis');
    if (rx.dpp4 > 0 && GLP(rx)) add('warn', 'iDPP4 + aGLP1 : association sans objet (mécanismes redondants) ; arrêter l\'iDPP4.', 'avis 20');

    // Sulfamides (avis 10, 12 bis, 16, 18 ter, 21 bis).
    if (rx.su > 0) {
      if (dfg < 30) add('stop', 'Sulfamides contre-indiqués en IRC sévère ou terminale.', 'avis 12 bis');
      if (g === 'dependant') add('stop', 'Ne jamais utiliser de sulfamide chez la personne âgée dépendante.', 'avis 21 bis');
      else if (g === 'fragile') add('warn', 'Éviter les sulfamides chez la personne âgée fragile.', 'avis 21 bis');
      const risk = [c.driver && 'conduite ou métier à risque', c.irregular && 'prise alimentaire irrégulière', dfg < 60 && 'insuffisance rénale', st.hypos > 0 && 'hypoglycémies déjà survenues'].filter(Boolean);
      if (risk.length && g !== 'dependant') add('warn', 'Sulfamide chez un patient à risque d\'hypoglycémie (' + risk.join(', ') + ') : à éviter ; ce n\'est pas un choix privilégié en bithérapie.', 'avis 10 et 16');
      if (INS(rx)) add('warn', 'Insuline basale en place : arrêter le sulfamide (risque d\'hypoglycémie).', 'avis 18 ter');
    }

    // iSGLT2 (avis 12 bis).
    if (ISGLT2(rx)) {
      if (dfg < 20) add('warn', 'DFG < 20 : on n\'initie pas d\'iSGLT2 (empagliflozine 10 mg possible dès 20, dapagliflozine dès 25) ; un iSGLT2 déjà en place se poursuit jusqu\'à la dialyse.', 'avis 12 bis');
      else if (dfg < 45) add('tip', 'DFG < 45 : effet glycémique de l\'iSGLT2 réduit (très faible sous 30), mais bénéfice rénal et cardiaque conservé ; contrôler le DFG à un mois.', 'avis 12 bis');
    }

    // aGLP1 et tirzépatide (avis 6 bis, 12 bis, 21 bis).
    if (GLP(rx)) {
      if (g === 'dependant') add('warn', 'Personne âgée dépendante : éviter les aGLP1 (dénutrition, sarcopénie) ; iDPP4 et metformine, sinon insuline basale.', 'avis 21 bis');
      if (rx.glp === 'tirz' && c.age >= 75) add('tip', 'Tirzépatide après 75 ans : expérience encore très limitée.', 'avis 21 bis');
      if (dfg < 15) add('warn', 'IRC terminale : aGLP1 non recommandés (expérience très limitée).', 'avis 12 bis');
      if (c.panc) add('warn', 'Antécédent de pancréatite : aGLP1 et tirzépatide à éviter.', 'avis 6 bis');
      if (c.retino === 'severe' || c.retino === 'prolif') add('warn', 'Rétinopathie ' + (c.retino === 'prolif' ? 'proliférante' : 'sévère') + ' : risque d\'aggravation si l\'HbA1c baisse vite (complication non spécifique de la classe) ; avis ophtalmologique et traitement de la rétinopathie avant, baisse progressive.', 'avis 6 bis et 8 bis');
    }

    // Choix de la bithérapie (avis 10) et intensification (avis 16, 16 bis, 17).
    const n = (rx.met > 0) + (rx.su > 0) + (rx.dpp4 > 0) + (ISGLT2(rx) ? 1 : 0) + (GLP(rx) ? 1 : 0) + (rx.acarb > 0);
    if (above && !INS(rx)) {
      if (n === 1 && rx.met > 0) add('tip', 'HbA1c au-dessus de la cible sous metformine : ajouter, par ordre de préférence, un iSGLT2, un aGLP1 ou le tirzépatide, puis un iDPP4, puis un sulfamide' + (a1c - T.max > 1 ? ' ; à plus d\'un point de la cible, l\'aGLP1 ou le tirzépatide sont les plus efficaces' : '') + (c.ethnic === 'asie' ? ' ; chez les personnes d\'origine asiatique, les aGLP1 sont particulièrement efficaces' : '') + '.', 'avis 10');
      else if (n === 2 && !GLP(rx)) add('tip', 'Échec d\'une bithérapie orale : passer à metformine + aGLP1 ou tirzépatide (plus efficaces), ou trithérapie orale (iSGLT2, puis iDPP4, puis sulfamide), l\'insuline basale étant moins appropriée à ce stade.', 'avis 16');
      else if (n >= 2 && GLP(rx) && rx.glp !== 'tirz') add('tip', 'Échec sous metformine + aGLP1 à dose maximale tolérée : passer au tirzépatide, ajouter un iSGLT2, ou instaurer une insuline basale en gardant metformine et aGLP1.', 'avis 16 bis');
      else if (n >= 3 && !GLP(rx)) add('tip', 'Échec d\'une trithérapie orale : metformine + aGLP1 ou tirzépatide (± iSGLT2) de préférence, ou insuline basale en gardant la metformine. La quadrithérapie orale n\'est validée par aucune étude.', 'avis 17');
    }
    if (a1c != null && a1c >= 10) add('tip', 'HbA1c ≥ 10 % : avis diabétologique souhaitable ; bi- ou trithérapie d\'emblée ; insuline si syndrome polyuro-polydipsique ou amaigrissement ; fond d\'œil rapide et baisse graduée en cas de rétinopathie.', 'avis 8 bis');

    // Insuline (avis 18, 18 bis, 18 ter, 19, 23).
    if (INS(rx)) {
      if (!(rx.met > 0) && dfg >= 30) add('tip', 'Sous insuline, garder la metformine (sauf contre-indication).', 'avis 18 ter');
      if (!st.cgm) add('tip', 'Mesure en continu du glucose recommandée chez le patient sous insuline.', 'avis 23');
      if (rx.basal > 0 && rx.basalType === 'nph') add('tip', 'Préférer un analogue lent à la NPH (moins d\'hypoglycémies, moins de variabilité).', 'avis 18 bis');
      if (rx.basal > 0 && rx.basalType === 'g100' && (g || c.irregular || c.driver || dfg < 60 || st.hypos > 0)) add('tip', 'Risque d\'hypoglycémie nocturne : glargine U300 ou dégludec à privilégier.', 'avis 18 bis');
      if (rx.basal > 0 && st.titr && st.titr.who === 'none') add('warn', 'Insuline basale sans protocole de titration : prévoir l\'adaptation des doses (tous les 3 jours sur la glycémie au réveil, cible 0,80–1,30 g/L pour une HbA1c < 7 %).', 'avis 18');
      if (rx.basal > 0 && rx.basal / W <= 0.5 && above && st.fpg != null && st.fpg <= 1.3) add('tip', 'HbA1c au-dessus de la cible malgré une glycémie au réveil dans la cible (' + fmt(st.fpg, 2) + ' g/L) : la basale est titrée, c\'est la journée qui pèche. Avis diabétologique souhaitable ; garder la metformine et ajouter un aGLP1 ou le tirzépatide (préféré), un antidiabétique oral (iSGLT2, puis iDPP4, puis SU), ou un bolus au repas le plus hyperglycémiant.', 'avis 19');
      if (rx.basal / W > 0.5 && above) add('warn', 'Basale > 0,5 U/kg/j (' + fmt(rx.basal / W, 2) + ') et HbA1c au-dessus de la cible : avis diabétologique ; ne pas monter davantage la basale ; ajouter un aGLP1 ou le tirzépatide (préféré à l\'insulinothérapie intensifiée), un antidiabétique oral, ou des bolus.', 'avis 19');
      if (rx.rapid > 0 && !GLP(rx)) add('tip', 'Avant les bolus, l\'ajout d\'un aGLP1 ou du tirzépatide à la basale est préféré dans la majorité des cas (efficacité comparable, moins d\'hypoglycémies et de prise de poids).', 'avis 19');
    }

    // Personne âgée (avis 21 bis).
    if (g === 'fragile' && !(rx.dpp4 > 0) && !INS(rx) && above) add('tip', 'Personne âgée fragile : metformine + iDPP4 à privilégier, puis insuline basale (analogue lent).', 'avis 21 bis');

    // Règles d'arrêt (avis 5) : baisse < 0,5 % à 3–6 mois, HbA1c au-dessus de l'objectif.
    if (a1c != null && st.starts) {
      const organ = { sglt2: c.hfail || ckd(c, dfg) || cv, glp: cv || ckd(c, dfg) };
      Object.entries(st.starts).forEach(([k, s0]) => {
        const dt = st.day - s0.day;
        if (dt < 84 || dt > 200 || a1c <= T.max) return;
        const drop = s0.a1c - a1c;
        if (drop >= 0.5) return;
        const name = { dpp4: 'iDPP4', sglt2: 'iSGLT2', glp: 'aGLP1/AR GIP-GLP-1', su: 'sulfamide' }[k];
        if (!name) return;
        const lostW = s0.w ? (s0.w - W) / s0.w : 0;
        if (organ[k]) add('tip', name + ' : baisse d\'HbA1c < 0,5 % en ' + Math.round(dt / 7) + ' semaines, mais à poursuivre pour la protection cardiovasculaire et/ou rénale ; intensifier par ailleurs.', 'avis 5');
        else if (k === 'glp' && (bmi >= 30 || c.masld) && lostW > 0.05) add('tip', name + ' : peu d\'effet sur l\'HbA1c mais perte de poids > 5 % : à poursuivre.', 'avis 5');
        else add('warn', name + ' : baisse d\'HbA1c de ' + fmt(Math.max(0, drop), 1) + ' % seulement en ' + Math.round(dt / 7) + ' semaines (moins de 0,5 %), HbA1c au-dessus de l\'objectif : à arrêter si titration et observance ont été vérifiées.', 'avis 5');
      });
    }
    if (rx.su > 0 && st.sevHypo) add('stop', 'Hypoglycémie sévère sous sulfamide : arrêt.', 'avis 5');

    // Rétinopathie (avis 8 bis).
    if ((c.retino === 'severe' || c.retino === 'prolif') && !st.ppr) add('warn', 'Rétinopathie ' + (c.retino === 'prolif' ? 'proliférante' : 'sévère') + ' : avis ophtalmologique rapide (photocoagulation panrétinienne) ; objectifs gradués de baisse de la glycémie en attendant.', 'avis 8 bis');

    // Objectif fixé par le prescripteur (HAS 2024, SFD 2025 : objectif individualisé, décidé avec le patient).
    if (st.goal != null) {
      if (st.goal < T.max - 0.25 && (rx.su > 0 || INS(rx))) add('warn', 'Objectif fixé à ' + fmt(st.goal, 1) + ' %, plus strict que la cible SFD (≤ ' + fmt(T.max, 1) + ' %) sous traitement hypoglycémiant : risque d\'hypoglycémie' + (T.floor ? ' ; ne pas descendre sous ' + fmt(T.floor, 1) + ' %' : '') + '.', 'avis 3');
      else if (st.goal > T.max + 0.25) add('warn', 'Objectif fixé à ' + fmt(st.goal, 1) + ' %, moins exigeant que la cible SFD (≤ ' + fmt(T.max, 1) + ' %) : inertie thérapeutique ?', 'avis 3');
      if (T.floor && st.goal < T.floor) add('warn', 'Objectif sous le plancher de ' + fmt(T.floor, 1) + ' % recommandé pour ce patient sous SU, glinide ou insuline.', 'avis 3 et 21');
    }
    if (!(rx.su > 0) && !INS(rx) && st.asg && st.asg !== '0') add('tip', 'Autosurveillance sans traitement hypoglycémiant : non recommandée en routine (HAS) ; la SFD l\'admet temporairement à visée éducative au diagnostic d\'un déséquilibre important.', 'avis 8 bis et 23');
    if (!out.length) add('ok', 'Pas d\'écart relevé avec la prise de position.', '');
    return { target: T, items: out };
  }

  // Repères de la prise de position, pour la carte « Référentiel ».
  const REF = [
    ['Cibles d\'HbA1c (tableau I)', '< 75 ans sans comorbidité sévère : ≤ 7 % (≤ 6,5 % si atteignable sans hypoglycémie). Espérance de vie < 5 ans, comorbidité sévère, DFG < 30, ou diabète > 10 ans difficile : ≤ 8 % (> 7 % sous SU, glinide, insuline). > 75 ans : bonne santé ≤ 7 %, fragile ≤ 8 % (> 7 %), dépendant < 9 % (> 7,5 % sous insuline). Grossesse ≤ 6,5 %.', 'avis 3, 21, 22'],
    ['Capteur (tableau II)', 'TIR 0,70–1,80 g/L > 70 % ; < 0,70 g/L < 4 % ; < 0,54 g/L < 1 % ; > 1,80 g/L < 25 % ; > 2,50 g/L < 5 %. Sujet âgé ou à haut risque d\'hypoglycémie : TIR > 50 %, < 0,70 g/L < 1 %, < 0,54 g/L 0 %, > 1,80 < 50 %, > 2,50 < 10 %.', 'avis 3'],
    ['Réévaluation, règles d\'arrêt', 'HbA1c 3 à 6 mois après tout changement. iDPP4, iSGLT2, aGLP1, tirzépatide, SU : arrêt si baisse < 0,5 % avec HbA1c au-dessus de l\'objectif (titration et observance vérifiées), sauf protection d\'organe (iSGLT2, aGLP1) ou perte de poids > 5 % chez l\'obèse.', 'avis 5'],
    ['Au diagnostic', 'Mode de vie, évalué à 3–6 mois, puis metformine progressive (2–3 g/j ; 3 g apporte peu). HbA1c ≥ 8,5 % : bithérapie d\'emblée. ≥ 10 % : avis diabétologique, bi- ou trithérapie ; insuline si catabolisme ; corps cétoniques ou hyperosmolarité : insuline, hospitalisation.', 'avis 8, 8 bis'],
    ['Après la metformine (risque CV faible ou modéré, IMC < 30)', 'Par ordre de préférence : iSGLT2, aGLP1 ou tirzépatide ; puis iDPP4 ; puis SU ou glinide. aGLP1/tirzépatide si HbA1c > cible + 1 point ; iDPP4 : meilleure tolérance ; Asie : aGLP1 très efficaces.', 'avis 10'],
    ['Organe à protéger (quel que soit l\'HbA1c)', 'Maladie athéromateuse ou risque CV élevé : iSGLT2 ou aGLP1 à bénéfice démontré. Insuffisance cardiaque : iSGLT2. Maladie rénale chronique : iSGLT2 (sinon sémaglutide 1 mg). Obésité ou MASLD : aGLP1 ou tirzépatide.', 'avis 11 à 15'],
    ['Fonction rénale', 'Metformine ≤ 2 g (DFG 45–59), ≤ 1 g (30–44), arrêt < 30. Sitagliptine 50 mg < 45, 25 mg < 30. SU contre-indiqués < 30. iSGLT2 : effet glycémique réduit < 45 ; initiation dès 25 (dapagliflozine) ou 20 (empagliflozine 10 mg).', 'avis 12 bis'],
    ['Insuline basale', 'Une injection d\'un analogue lent, 6 à 10 U/j ou 0,1 à 0,2 U/kg/j ; glycémie au réveil 0,80–1,30 g/L ; adaptation tous les 3 jours de ± 2 U (± 10 % au-delà de 40 U). Garder la metformine, arrêter les SU. Capteur recommandé. Glargine U300 ou dégludec si risque d\'hypoglycémie nocturne.', 'avis 18, 18 bis, 18 ter'],
    ['Échec de la basale', 'HbA1c au-dessus de la cible malgré une glycémie à jeun dans la cible, ou basale > 0,5 U/kg : avis diabétologique ; ajouter un aGLP1 ou le tirzépatide (préféré), un oral (iSGLT2, iDPP4, SU) ou des bolus (basal-plus, basal-bolus) ; prémélanges moins flexibles.', 'avis 19'],
    ['HAS 2024 (stratégie thérapeutique du patient vivant avec un DT2)', 'Mode de vie (activité physique, nutrition) en première intention chez tous ; metformine en première intention médicamenteuse ; iSGLT2 ou aGLP1 selon le profil, indépendamment de la metformine et de l\'HbA1c (maladie cardiovasculaire avérée : iSGLT2 ou aGLP1 ; insuffisance cardiaque ou maladie rénale : iSGLT2 ; obésité IMC > 30 : aGLP1) ; cible d\'HbA1c de 7 % pour la majorité, individualisée et décidée avec le patient.', 'HAS 2024'],
    ['Surveillance : bandelettes et capteur', 'Autosurveillance capillaire réservée aux traitements hypoglycémiants (sulfamide, glinide, insuline) ; hors insuline, 200 bandelettes et lancettes par an. Capteur de glucose pris en charge sous insulinothérapie intensifiée (≥ 3 injections/j), ou non intensifiée avec HbA1c ≥ 8 % (LPPR, 2023) ; recommandé sous insuline par la SFD.', 'HAS ; LPPR ; avis 23'],
    ['Personne âgée', 'Fragile : metformine + iDPP4, puis analogue lent ; éviter SU et glinides. Dépendante : pas de SU, de glinide ni d\'aGLP1 ; iDPP4, insuline basale ; HbA1c > 7,5 % sous insuline.', 'avis 21 bis']
  ];

  S.sfd = { target, cgmFragile, insulinInit, monitoring, advise, REF, CV_GLP };
})();
