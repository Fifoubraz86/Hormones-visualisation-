/*
 * Événements indésirables du mode thérapeutique (aucune correction : ils arrivent, l'interne réagit).
 *
 * 1. Coronaropathie sous lévothyroxine : le risque d'angor dépend de la vitesse de remontée de la T3
 *    (besoins myocardiques en oxygène). Chez un coronarien, 25 µg puis + 12,5–25 µg toutes les 1–2
 *    semaines font monter la T3 d'environ 0,06 (normalisée) par semaine, sans événement ; 75 µg d'emblée
 *    ou un palier de 50 µg (≈ 0,10–0,14/sem) déclenchent un angor d'effort ; 100 µg d'emblée
 *    (≈ 0,19/sem) un syndrome coronarien aigu. Sujet de 75 ans ou plus sans coronaropathie connue :
 *    seuils 1,6 fois plus hauts (coronaropathie latente). Item 243, SFE p. 5, 11-12 : la coronaropathie
 *    peut être démasquée par le traitement. Les seuils sont un choix de modélisation (complément).
 *
 * 2. Antithyroïdiens de synthèse (item 242, SFE p. 15-16) : effets fréquents (5–15 % : éruption,
 *    arthralgies, neutropénie transitoire, perturbations hépatiques mineures) ; graves : agranulocytose
 *    (0,2–0,5 %, contre-indique tous les ATS), hépatite (cytolytique avec les thiouraciles, cholestatique
 *    avec les imidazolés). Fréquence des hépatites, délais d'apparition et évolution : complément.
 */
(function () {
  'use strict';
  const S = window.HV.simu;
  const M = S.model;
  const fmt = S.rules.fmt;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const HYPO = new Set(['hashi', 'thyro', 'central']);

  const MODES = [
    ['realiste', 'Fréquences du référentiel (rares)'],
    ['entrainement', 'Entraînement : un effet indésirable surviendra'],
    ['agranulo', 'Imposé : agranulocytose'],
    ['hepat', 'Imposé : hépatite'],
    ['rash', 'Imposé : urticaire'],
    ['neutro', 'Imposé : neutropénie modérée'],
    ['aucun', 'Aucun']
  ];
  const WINDOW = { rash: [7, 21], arthr: [14, 42], neutro: [14, 42], agranulo: [21, 70], hepat: [14, 56] };
  const NAME = { rash: 'urticaire', arthr: 'arthralgies', neutro: 'neutropénie modérée', agranulo: 'agranulocytose', hepat: 'hépatite' };

  function init(G) {
    const c = G.cfg;
    const k = c.variab === 'reel' ? rnd(0.75, 1.3) : 1;
    const latent = !c.coronary && c.age >= 75;
    G.ae = {
      mode: c.ae || 'realiste', plan: [], drawn: false, culprit: null,
      rash: null, arthr: false, neutro: false, agranulo: null, everAgranulo: false, liver: null,
      cardio: { on: HYPO.has(c.sit) && (c.coronary || latent), thrA: 0.09 * k * (latent ? 1.6 : 1), thrS: 0.16 * k * (latent ? 1.6 : 1), last: -999, lastType: null, latent }
    };
  }

  // Tirage au premier jour d'exposition aux ATS.
  function draw(G) {
    const ae = G.ae, pt = G.pt;
    ae.drawn = true;
    const at = (type) => ({ type, day: pt.day + Math.round(rnd(WINDOW[type][0], WINDOW[type][1])), fired: false });
    const eq = M.atsEq(pt.rx);
    if (ae.mode === 'realiste') {
      if (Math.random() < 0.06) ae.plan.push(at('rash'));
      if (Math.random() < 0.02) ae.plan.push(at('arthr'));
      if (Math.random() < 0.03) ae.plan.push(at('neutro'));
      if (Math.random() < 0.0035 * (eq >= 30 ? 1.5 : 1)) ae.plan.push(at('agranulo'));
      if (Math.random() < (pt.rx.ats === 'ptu' ? 0.005 : 0.003)) ae.plan.push(at('hepat'));
    } else if (ae.mode === 'entrainement') {
      const x = Math.random();
      ae.plan.push(at(x < 0.3 ? 'agranulo' : x < 0.6 ? 'hepat' : x < 0.85 ? 'rash' : 'neutro'));
    } else if (WINDOW[ae.mode]) ae.plan.push(at(ae.mode));
  }

  function onPrescribe(G, prevEq) {
    const ae = G.ae, pt = G.pt;
    const eq = M.atsEq(pt.rx);
    if (eq > 0 && !ae.drawn) draw(G);
    // Après une agranulocytose, toute nouvelle exposition à un ATS la reproduit (contre-indication de tous les ATS).
    if (eq > 0 && prevEq === 0 && ae.everAgranulo && !ae.agranulo) ae.plan.push({ type: 'agranulo', day: pt.day + 5, fired: false, recur: true });
    if (ae.rash && pt.rx.ats !== ae.rash.mol && ae.rash.until == null) ae.rash.until = pt.day + 7;
    if (ae.rash && pt.rx.ats === ae.rash.mol) ae.rash.until = null;
  }

  // Appelé chaque jour simulé. Retourne un événement qui interrompt le temps, ou null.
  function daily(G) {
    const ae = G.ae, pt = G.pt, d = pt.day;
    const exposed = M.atsEq(pt.rx) > 0;
    // Évolution des effets en cours
    if (ae.rash && ae.rash.until != null && d >= ae.rash.until) ae.rash = null;
    if (ae.neutro && !exposed) { ae.neutro = false; }
    if (ae.arthr && !exposed) ae.arthr = false;
    if (ae.agranulo && !exposed && ae.agranulo.stop == null) { ae.agranulo.stop = d; pt.par.pnn = 3.5; }
    if (ae.agranulo && ae.agranulo.stop != null && d - ae.agranulo.stop > 21) ae.agranulo = null;
    if (ae.liver && !exposed && ae.liver.stop == null) ae.liver.stop = d;
    if (ae.liver && exposed && ae.liver.stop != null) { ae.liver.stop = null; ae.liver.start = d - 14; }
    if (ae.liver && ae.liver.stop != null && d - ae.liver.stop > 70) ae.liver = null;
    // Complications d'un effet ignoré
    if (ae.agranulo && exposed && !ae.agranulo.sepsis && d - ae.agranulo.day >= 3) {
      ae.agranulo.sepsis = true;
      M.setRx(pt, { ats: 'none', atsDose: 0 });
      return { text: 'J' + d + ' : l\'ATS a été poursuivi malgré l\'agranulocytose : choc septique, admission en réanimation. L\'équipe arrête l\'ATS (antibiothérapie à large spectre).', tests: ['nfs'], stopAts: true };
    }
    if (ae.liver && exposed && !ae.liver.severe && d - ae.liver.day >= 14) {
      ae.liver.severe = true;
      M.setRx(pt, { ats: 'none', atsDose: 0 });
      return { text: 'J' + d + ' : l\'ATS a été poursuivi malgré l\'hépatite : aggravation (' + (ae.liver.type === 'cyto' ? 'hépatite sévère, TP 42 %' : 'ictère franc, prurit invalidant') + '), hospitalisation en hépatologie ; l\'ATS est arrêté.', tests: ['hepat'], stopAts: true };
    }
    // Effets programmés
    for (const e of ae.plan) {
      if (e.fired || d < e.day) continue;
      if (!exposed) { if (!e.recur) e.day = d + 1; continue; }
      e.fired = true;
      const mol = pt.rx.ats, molName = M.ATS[mol].short;
      if (e.type === 'rash') {
        ae.rash = { mol, until: null };
        return { text: 'J' + d + ' : appel ' + (G.cfg.sex === 'F' ? 'de la patiente' : 'du patient') + ' : éruption urticarienne prurigineuse du tronc et des membres depuis deux jours, sans fièvre, sans atteinte muqueuse, sous ' + molName + '.', tests: [] };
      }
      if (e.type === 'arthr') { ae.arthr = true; continue; }
      if (e.type === 'neutro') { ae.neutro = true; continue; }
      if (e.type === 'agranulo') {
        ae.agranulo = { day: d, stop: null, sepsis: false };
        ae.everAgranulo = true;
        pt.par.pnn = 0.15; pt.st.pnn = 0.3;
        return { text: 'J' + d + ' : fièvre à 39,5 °C et angine érythémato-pultacée depuis la veille, sous ' + molName + '. NFS en urgence.', tests: ['nfs'] };
      }
      if (e.type === 'hepat') {
        const type = mol === 'ptu' ? 'cyto' : 'chol';
        ae.liver = { type, day: d, start: d - 7, stop: null, severe: false };
        return { text: 'J' + d + ' : ' + (type === 'chol' ? 'ictère cutanéo-muqueux, prurit, urines foncées' : 'asthénie intense, nausées, douleur de l\'hypochondre droit') + ', sous ' + molName + '. Bilan hépatique en urgence.', tests: ['hepat'] };
      }
    }
    // Coronaropathie sous lévothyroxine
    const cd = ae.cardio;
    if (cd.on && pt.log.length > 8 && d - cd.last > 21) {
      const L = pt.log;
      const rise = (L[L.length - 1].t3 - L[L.length - 8].t3) / 5;
      const t3 = pt.st.T3;
      const who = G.cfg.sex === 'F' ? 'la patiente' : 'le patient';
      if (rise >= cd.thrS) {
        cd.last = d; cd.lastType = 'sca';
        M.setRx(pt, { lt4: 0, lt4Text: '' });
        return { text: 'J' + d + ' : douleur thoracique de repos, prolongée : syndrome coronarien aigu, hospitalisation en cardiologie et coronarographie. L\'équipe de cardiologie suspend la lévothyroxine, à reprendre à faible dose. La lévothyroxine a démasqué la coronaropathie' + (cd.latent ? ' (non connue jusque-là)' : '') + '.', tests: ['ecg'], stopLt4: true };
      }
      if (rise >= cd.thrA || (t3 > 1.35 && !cd.latent)) {
        cd.last = d; cd.lastType = 'angor';
        return { text: 'J' + d + ' : ' + who + ' décrit une douleur thoracique constrictive à l\'effort, cédant au repos en quelques minutes, apparue depuis ' + (t3 > 1.35 ? 'le surdosage en lévothyroxine' : 'l\'augmentation de la lévothyroxine') + (cd.latent ? ' ; aucun antécédent coronarien connu' : '') + '.', tests: ['ecg'] };
      }
    }
    return null;
  }

  // Polynucléaires mesurés : neutropénie de la thyrotoxicose et des ATS.
  function pnn(G, raw) {
    const pt = G.pt;
    let v = raw * (1 - 0.25 * Math.min(1, Math.max(0, (pt.st.T3 - 1) / 2)));
    if (G.ae.neutro) v *= 0.38;
    return v;
  }

  function liverSev(G) {
    const L = G.ae.liver, d = G.pt.day;
    if (!L) return 0;
    let s = Math.min(1, 0.4 + (d - L.start) / 30);
    if (L.severe) s = 1;
    if (L.stop != null) s *= Math.exp(-(d - L.stop) / 14);
    return s;
  }

  function hepat(G) {
    const pt = G.pt, L = G.ae.liver;
    const base = 1 + 0.6 * Math.min(1, Math.max(0, (pt.st.T3 - 1) / 2));
    const s = liverSev(G);
    const cyto = L && L.type === 'cyto', chol = L && L.type === 'chol';
    const alat = base + (cyto ? 18 : chol ? 2 : 0) * s;
    const pal = 1 + (chol ? 3.5 : cyto ? 0.5 : 0) * s;
    const bili = 9 + (chol ? 140 : cyto ? 70 : 0) * s;
    return 'ALAT ' + fmt(alat, 1) + ' N · PAL ' + fmt(pal, 1) + ' N · GGT ' + fmt(pal * 1.2, 1) + ' N · bilirubine ' + fmt(bili, 0) + ' µmol/L';
  }

  function ecg(G) {
    const pt = G.pt, cd = G.ae.cardio;
    const hr = M.clinic(pt).hr;
    if (cd.lastType && pt.day - cd.last <= 10) return cd.lastType === 'sca' ? 'sus-décalage du segment ST en inférieur (SCA ST+)' : 'rythme sinusal à ' + hr + '/min, sous-décalage de ST en latéral pendant la douleur';
    if (pt.st.T4 < 0.6) return 'bradycardie sinusale à ' + hr + '/min, microvoltage';
    if (pt.st.T3 > 1.5) return 'tachycardie sinusale à ' + hr + '/min';
    return 'rythme sinusal à ' + hr + '/min' + (G.cfg.coronary ? ', séquelle de nécrose inférieure' : '');
  }

  function symptoms(G) {
    const ae = G.ae, out = [];
    if (ae.rash) out.push(ae.rash.until != null ? 'éruption en voie de disparition' : 'urticaire prurigineuse');
    if (ae.arthr) out.push('arthralgies des poignets et des genoux');
    if (ae.agranulo && ae.agranulo.stop == null) out.push('fièvre, angine');
    if (ae.liver && liverSev(G) > 0.3) out.push(ae.liver.type === 'chol' ? 'ictère, prurit' : 'asthénie, nausées');
    const cd = ae.cardio;
    if (cd.lastType && G.pt.day - cd.last <= 21) out.push(cd.lastType === 'sca' ? 'sorti de cardiologie après un syndrome coronarien aigu' : 'douleurs thoraciques d\'effort');
    return out;
  }

  function reveal(G) {
    const ae = G.ae, out = [];
    if (ae.cardio.on) out.push('Coronaropathie ' + (ae.cardio.latent ? 'latente (âge ≥ 75 ans)' : 'connue') + ' : angor si la T3 monte de plus de ' + fmt(ae.cardio.thrA, 2) + ' par semaine, syndrome coronarien aigu au-delà de ' + fmt(ae.cardio.thrS, 2) + ' (valeurs normalisées).');
    if (ae.drawn) out.push('Effets indésirables des ATS (' + MODES.find((m) => m[0] === ae.mode)[1].toLowerCase() + ') : ' + (ae.plan.length ? ae.plan.map((e) => NAME[e.type] + (e.recur ? ' (récidive)' : '') + (e.fired ? ' à J' + e.day : ' prévue vers J' + e.day)).join(', ') : 'aucun tiré') + '.');
    return out;
  }

  S.adverse = { MODES, init, onPrescribe, daily, pnn, hepat, ecg, symptoms, reveal };
})();
