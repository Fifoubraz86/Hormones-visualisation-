/*
 * Modèle physiologique simplifié de l'axe thyréotrope.
 * Toutes les grandeurs internes sont normalisées : 1 = valeur d'un sujet euthyroïdien.
 * Chaque variable relaxe vers sa cible avec sa propre constante de temps (secondes simulées),
 * ce qui permet de voir l'axe se rééquilibrer après un changement de scénario.
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const DEFAULTS = { iodine: 1, thy: 1, pit: 1, hypo: 1, trab: 0, auto: 0, levo: 0, d12: 1, d3: 1, atro: 0, tsho: 0 };
  const p = Object.assign({}, DEFAULTS);
  const s = { trh: 1, tsh: 1, t4: 1, t3: 1, rt3: 1, goitre: 1, fb: 1, stim: 1, t4prod: 1, t3prod: 1, iF: 1 };
  const TAU = { trh: 0.6, tsh: 1.2, t4: 4, t3: 2, rt3: 2.5, goitre: 12 };

  function targets() {
    // Le rétrocontrôle central dépend surtout de la T3 produite localement à partir de la T4 (D2).
    const fb = 0.75 * s.t4 + 0.25 * s.t3;
    const trh = Math.min(6, p.hypo * Math.exp(-1.2 * (fb - 1)));
    // Relation TSH / T4L log-linéaire, plafonnée par la réserve hypophysaire.
    const raw = p.pit * Math.pow(Math.max(s.trh, 0), 0.7) * Math.exp(-5 * (fb - 1));
    const cap = 40 * Math.pow(p.pit, 1.5);
    // Adénome thyréotrope : sécrétion autonome de TSH, non freinée par le rétrocontrôle (polycopié p. 59).
    const tsh = Math.min(200, (1.025 * raw * cap) / (raw + cap + 1e-9) + p.tsho);
    // Une hypophyse lésée sécrète une TSH moins active (glycosylation anormale).
    const bio = 0.45 + 0.55 * Math.min(1, p.pit);
    const iF = (1.6 * p.iodine) / (p.iodine + 0.6);
    const stim = Math.pow(Math.max(0, s.tsh * bio), 0.6) + 1.5 * p.trab;
    const capT = p.thy * Math.sqrt(s.goitre);
    // En carence iodée, la thyroïde privilégie la T3 (3 atomes d'iode au lieu de 4).
    const i4 = iF * (0.55 + 0.45 * Math.min(1, iF));
    const i3 = iF * (1 + 0.6 * (1 - Math.min(1, iF)));
    const t4prod = (capT * stim + p.auto) * i4;
    const t3prod = (capT * stim + 1.6 * p.auto) * i3;
    const t4 = (t4prod + p.levo) / (0.85 + 0.15 * p.d3);
    // 75 % de la T3 circulante vient de la désiodation périphérique de la T4 (polycopié CEEDMM).
    const t3 = (0.25 * t3prod + 0.75 * p.d12 * s.t4) / (0.7 + 0.3 * p.d3);
    const rt3 = (s.t4 * p.d3) / (0.6 + 0.4 * p.d12);
    // Forme atrophique de la thyroïdite auto-immune : la glande ne grossit pas malgré la TSH.
    const goitre = p.atro > 0.5 ? 1 : clamp(1 + 0.25 * Math.max(0, stim - 1) + 0.5 * Math.max(0, 1 - iF) * Math.min(1, p.thy), 1, 2.2);
    return { fb, trh, tsh, t4, t3, rt3, goitre, stim, t4prod, t3prod, iF };
  }

  function step(dt) {
    if (!(dt > 0)) return;
    const n = Math.ceil(dt / 0.02);
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const T = targets();
      for (const k in TAU) s[k] += (T[k] - s[k]) * (1 - Math.exp(-h / TAU[k]));
      s.fb = T.fb; s.stim = T.stim; s.t4prod = T.t4prod; s.t3prod = T.t3prod; s.iF = T.iF;
    }
  }

  // Conversion en unités de laboratoire. Seule la norme de la TSH (0,4–4 mU/L) vient du polycopié ;
  // les autres sont des normes usuelles, dépendantes de la trousse (complément).
  const LABS = [
    { key: 'tsh', name: 'TSH', unit: 'mUI/L', range: '0,4–4 mUI/L', k: 1.5, lo: 0.4, hi: 4.0, log: true, min: 0.005, max: 100, fmt: (v) => (v < 0.01 ? '< 0,01' : v.toFixed(v < 10 ? 2 : 1).replace('.', ',')) },
    { key: 't4', name: 'T4 libre', unit: 'pmol/L', range: '12–22 pmol/L (selon la trousse ; complément)', k: 15, lo: 12, hi: 22, min: 0, max: 50, dec: 1 },
    { key: 't3', name: 'T3 libre', unit: 'pmol/L', range: '3,1–6,8 pmol/L (selon la trousse ; complément)', k: 4.6, lo: 3.1, hi: 6.8, min: 0, max: 16, dec: 1 },
    { key: 'rt3', name: 'T3 reverse', unit: 'nmol/L', range: '0,15–0,38 nmol/L (complément, non dosée en pratique)', k: 0.3, lo: 0.15, hi: 0.38, min: 0, max: 1.6 }
  ];

  const PARAMS = [
    { key: 'iodine', label: 'Apport iodé', min: 0.05, max: 2, step: 0.05, fmt: (v) => Math.round(v * 150) + ' µg/j' },
    { key: 'thy', label: 'Parenchyme thyroïdien fonctionnel', min: 0.03, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + ' %' },
    { key: 'pit', label: 'Réserve thyréotrope (hypophyse)', min: 0.03, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + ' %' },
    { key: 'hypo', label: 'Tonus hypothalamique (TRH)', min: 0.2, max: 1.6, step: 0.05, fmt: (v) => Math.round(v * 100) + ' %' },
    { key: 'trab', label: 'TRAb stimulants', min: 0, max: 3, step: 0.05, fmt: (v) => (v * 4).toFixed(1).replace('.', ',') + ' UI/L' },
    { key: 'auto', label: 'Autonomie nodulaire', min: 0, max: 3, step: 0.05, fmt: (v) => (v === 0 ? 'aucune' : '×' + v.toFixed(2).replace('.', ',')) },
    { key: 'levo', label: 'Lévothyroxine (70 kg)', min: 0, max: 2.5, step: 0.05, fmt: (v) => Math.round((v * 112) / 12.5) * 12.5 + ' µg/j' },
    { key: 'd12', label: 'Désiodases activatrices D1/D2', min: 0.2, max: 1.6, step: 0.05, fmt: (v) => Math.round(v * 100) + ' %' },
    { key: 'd3', label: 'Désiodase inactivatrice D3', min: 0.5, max: 3, step: 0.05, fmt: (v) => Math.round(v * 100) + ' %' },
    { key: 'tsho', label: 'Adénome thyréotrope (TSH autonome)', min: 0, max: 4, step: 0.05, fmt: (v) => (v === 0 ? 'aucun' : '+' + (v * 1.5).toFixed(1).replace('.', ',') + ' mUI/L') }
  ];

  const SCENARIOS = [
    { id: 'eu', name: 'Euthyroïdie', note: 'Sujet sain : l\'axe est à l\'équilibre.', p: {} },
    { id: 'hashi', name: 'Hypothyroïdie primaire (Hashimoto)', note: 'Maladie de Hashimoto : thyroïde augmentée de volume, ferme et hétérogène (polycopié p. 21-22). La glande détruite produit moins de T4 : la TSH monte fortement.', p: { thy: 0.12 } },
    { id: 'atro', name: 'Thyroïdite chronique auto-immune atrophique', note: 'Autre forme de thyroïdite auto-immune, distincte de la maladie de Hashimoto : thyroïde atrophique (polycopié p. 22). Même biologie : TSH élevée, T4L basse.', p: { thy: 0.12, atro: 1 } },
    { id: 'lt4', name: 'Hashimoto traité par lévothyroxine', note: 'La T4 orale remplace la production : TSH et T4L se normalisent.', p: { thy: 0.12, levo: 0.9 } },
    { id: 'lt4x', name: 'Surdosage en lévothyroxine', note: 'Excès de T4 exogène : TSH effondrée, thyrotoxicose iatrogène (sans hyperthyroïdie).', p: { thy: 0.12, levo: 2 } },
    { id: 'graves', name: 'Maladie de Basedow', note: 'Les TRAb stimulent le récepteur de la TSH sans rétrocontrôle possible.', p: { trab: 1.5 } },
    { id: 'nodule', name: 'Adénome toxique', note: 'Un nodule autonome sécrète indépendamment de la TSH, qui s\'effondre.', p: { auto: 1.6 } },
    { id: 'tsho', name: 'Adénome thyréotrope', note: 'Adénome hypophysaire sécrétant de la TSH, non freinée par le rétrocontrôle : TSH normale ou élevée, inadaptée, avec T4L et T3L élevées. Hyperthyroïdie centrale rare, signes souvent plus modérés (polycopié p. 24, 30, 59).', p: { tsho: 2.5 } },
    { id: 'central', name: 'Hypothyroïdie centrale', note: 'Insuffisance hypophysaire : T4L basse avec une TSH normale ou basse, inadaptée.', p: { pit: 0.08 } },
    { id: 'iodine', name: 'Carence iodée', note: 'La TSH stimule la glande qui grossit (goitre) et privilégie la T3 (complément).', p: { iodine: 0.12 } },
    { id: 'nti', name: 'Syndrome de basse T3', note: 'Maladie aiguë ou chronique sévère : syndrome de basse T3L lié au stress somatique, sans dysfonction thyroïdienne (polycopié p. 22). Mécanisme : moins de conversion T4 → T3, plus de T3 reverse (complément).', p: { d12: 0.45, d3: 2.2, hypo: 0.75 } }
  ];

  function setScenario(id) {
    const sc = SCENARIOS.find((x) => x.id === id) || SCENARIOS[0];
    Object.assign(p, DEFAULTS, sc.p);
    return sc;
  }

  function lab(key) {
    const L = LABS.find((x) => x.key === key);
    return L.k * s[key];
  }

  function interpret() {
    const tsh = lab('tsh'), t4 = lab('t4'), t3 = lab('t3'), rt3 = lab('rt3');
    // TSH non freinée (normale ou élevée) avec T4L élevée : TSH inadaptée (polycopié p. 59).
    if (tsh >= 0.4 && t4 > 22) return { tone: 'bad', label: 'TSH non freinée, T4L élevée', text: 'TSH ' + (tsh > 4 ? 'élevée' : 'normale') + ', donc inadaptée, face à une T4L élevée : évoquer un adénome thyréotrope (hyperthyroïdie centrale, polycopié p. 24, 30, 59) et demander une IRM hypophysaire. Diagnostic différentiel : résistance aux hormones thyroïdiennes (complément), après avoir écarté une interférence de dosage ou une prise récente de LT4 (complément).' };
    if (tsh > 4) {
      // Garde-fou : une hypophyse lésée peut sécréter une TSH peu active, modérément élevée (complément).
      if (t4 < 8 && tsh < 10) return { tone: 'warn', label: 'T4L très basse, TSH peu élevée', text: 'Une TSH à peine élevée (< 10 mUI/L) face à une T4L très basse est inadaptée : évoquer aussi une origine centrale, l\'hypophyse lésée sécrétant une TSH moins active (complément). IRM hypophysaire et bilan des autres axes si le contexte s\'y prête.' };
      if (t4 < 12) return { tone: 'bad', label: 'Hypothyroïdie primaire', text: 'TSH élevée et T4L basse : la thyroïde ne suit plus, l\'hypophyse compense.' };
      if (tsh >= 10) return { tone: 'warn', label: 'Hypothyroïdie infraclinique sévère', text: 'TSH ≥ 10 mUI/L avec T4L normale : hypothyroïdie infraclinique sévère (TSH ≥ 10 ; ETA 2013, complément), à confirmer sur un 2ᵉ dosage, le plus souvent traitée. Le polycopié borne l\'infraclinique à une TSH entre 4 et 10 mU/L (p. 23).' };
      return { tone: 'warn', label: 'Hypothyroïdie infraclinique', text: 'TSH modérément élevée (4–10 mUI/L), T4L encore normale : à confirmer sur un 2ᵉ dosage à 6–8 semaines.' };
    }
    if (tsh < 0.4) {
      if (t4 > 22 || t3 > 6.8) {
        const cause = p.trab > 0.05 ? ' TRAb positifs : hyperthyroïdie (maladie de Basedow).' : p.auto > 0.02 ? ' Nodule autonome : hyperthyroïdie (adénome toxique).' : p.levo > 0.02 ? ' Prise excessive de lévothyroxine : thyrotoxicose iatrogène, sans hyperthyroïdie.' : '';
        return { tone: 'bad', label: 'Thyrotoxicose', text: 'TSH effondrée et hormones libres élevées : excès d\'hormones thyroïdiennes non freiné par le rétrocontrôle.' + cause };
      }
      if (t4 < 12) return { tone: 'bad', label: 'Origine centrale', text: 'TSH basse et T4L basse : évoquer une atteinte hypothalamo-hypophysaire.' };
      // Sous LT4 seule : thyrotoxicose infraclinique iatrogène, pas une hyperthyroïdie (polycopié p. 24).
      if (p.levo > 0.02 && p.trab <= 0.05 && p.auto <= 0.02) return { tone: 'warn', label: 'TSH freinée sous lévothyroxine', text: 'TSH basse, hormones libres normales sous LT4 : surdosage modéré (thyrotoxicose infraclinique iatrogène, sans hyperthyroïdie) ; réduire la dose et contrôler la TSH à 6–8 semaines (complément).' };
      return { tone: 'warn', label: 'Hyperthyroïdie infraclinique', text: 'TSH basse, hormones libres encore dans les normes. Si la TSH est entre 0,1 et 0,4 mUI/L : contrôle à 6 semaines (polycopié p. 28).' };
    }
    if (t4 < 12) return { tone: 'bad', label: 'Hypothyroïdie centrale', text: 'T4L basse avec une TSH « normale » : la TSH est inadaptée au niveau de T4L.' };
    if (t3 < 3.1) return { tone: 'warn', label: 'Syndrome de basse T3', text: 'T3L basse, TSH normale' + (rt3 > 0.38 ? ', T3 reverse élevée' : '') + ' : conversion périphérique diminuée.' };
    return { tone: 'good', label: 'Euthyroïdie', text: 'TSH, T4L et T3L dans les valeurs de référence.' };
  }

  // Substrat anatomique affiché dans le panneau et dessiné sur la glande
  function anat() {
    const out = [];
    if (p.auto > 0.02) out.push('nodule thyroïdien autonome (adénome toxique), parenchyme éteint');
    if (p.trab > 0.05) out.push('goitre diffus hypervasculaire (maladie de Basedow)');
    if (p.thy < 0.6) out.push(p.atro > 0.5 ? 'thyroïdite chronique auto-immune atrophique' : (s.goitre > 1.15 ? 'maladie de Hashimoto : thyroïde augmentée de volume, infiltrat lymphocytaire' : 'maladie de Hashimoto, infiltrat lymphocytaire'));
    if (p.iodine < 0.5) out.push('goitre multinodulaire');
    if (p.pit < 0.5) out.push('macroadénome hypophysaire non sécrétant');
    if (p.tsho > 0.05) out.push('adénome hypophysaire thyréotrope (sécrétion autonome de TSH)' + (s.goitre > 1.15 ? ' ; goitre diffus (complément)' : ''));
    return out.join(' · ');
  }

  function reset() {
    setScenario('eu');
    for (const k in s) s[k] = 1;
  }

  HV.model = { id: 'thyro', title: 'Bilan thyroïdien simulé', active: 'eu', p, s, DEFAULTS, LABS, PARAMS, SCENARIOS, step, setScenario, lab, interpret, targets, reset, anat };
})();
