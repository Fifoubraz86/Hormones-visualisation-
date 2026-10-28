/*
 * Physiologie de la lévothyroxine (LT4) : devenir d'une prise orale, minute par minute, de la bouche aux fèces,
 * et conséquence à l'équilibre (6 à 8 semaines) sur la TSH et la T4 libre.
 *
 * Compartiments : comprimé non dissous dans l'estomac → LT4 dissoute (la dissolution exige un pH acide) →
 * vidange gastrique → LT4 dans l'intestin grêle → absorption (jéjunum, iléon ; surface, transporteurs) ou perte
 * dans les fèces (transit, complexes avec les chélateurs). La solution buvable est déjà dissoute ; la capsule
 * molle libère la LT4 sans étape de dissolution dépendante du pH (Nagy, Thyroid 2021). Une fois absorbée, la T4
 * est liée à la TBG, éliminée par désiodation et conjugaison hépatique ; la TSH hypophysaire répond à la T4 libre.
 * Chaque élément des tableaux 1 à 3 de l'ETA 2025 (Centanni et al., Eur Thyroid J 2025;14:e250123) agit sur
 * l'un de ces paramètres. Constantes calées pour une biodisponibilité d'environ 75 % à jeun (complément) ; les
 * effets quantitatifs sont pédagogiques, l'ordre de grandeur suit l'ETA quand il est donné (maladie cœliaque
 * + 49 % de besoins, gastrite atrophique + 22 à 34 %, intolérance au lactose + 31 %, bypass × 3 à 4).
 */
(function () {
  'use strict';
  const S = window.HV.simu;
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = (v, d) => (v == null || isNaN(v) ? '—' : Number(v).toFixed(d).replace('.', ','));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---------- Catalogue des interférences (ETA 2025, tableaux 1 à 3) ----------
     Champs : g (groupe), t (libellé), at (pris à heure choisie : délai par rapport à la LT4), bS / bI (pouvoir chélateur
     dans l'estomac / l'intestin), pers (persistance dans l'intestin, h), ph (facteur de dissolution, < 1 si pH ↑),
     em (vidange gastrique ×), surf (surface d'absorption ×), tr (transit ×), tp (transporteurs ×), tbg, cl (clairance ×),
     need (besoins ×), tsh (sécrétion de TSH ×), conv (conversion T4 → T3 ×), liq (fraction de l'effet qui persiste sous
     forme liquide ou capsule molle), site (organe du schéma), eta (conduite de l'ETA). */
  const ITEMS = [
    // Aliments, boissons, compléments (tableau 1)
    { id: 'meal', g: 'food', t: 'Petit-déjeuner', at: true, bS: 0.7, em: 0.45, pers: 2, site: 'stomach', eta: 'LT4 au moins 30 min, idéalement 60 min avant (rec. 4).' },
    { id: 'coffee', g: 'food', t: 'Café (espresso, filtre)', at: true, bS: 1.8, pers: 1, liq: 0.2, site: 'stomach', eta: 'LT4 au moins 1 h avant ; capsule molle possible.' },
    { id: 'tea', g: 'food', t: 'Thé', at: true, bS: 0.7, pers: 1, site: 'stomach', eta: 'LT4 au moins 1 h avant.' },
    { id: 'milk', g: 'food', t: 'Lait', at: true, bS: 1, pers: 2, site: 'stomach', eta: 'LT4 plus de 1 à 2 h avant.' },
    { id: 'fiber', g: 'food', t: 'Fibres alimentaires (son de blé)', at: true, bI: 1.3, pers: 4, site: 'gut', eta: 'LT4 au moins 4 h avant.' },
    { id: 'soy', g: 'food', t: 'Soja', at: true, bI: 1.1, pers: 4, site: 'gut', eta: 'LT4 au moins 4 h avant ; éviter si possible.' },
    { id: 'grape', g: 'food', t: 'Jus de pamplemousse', at: true, tpT: 0.75, pers: 4, site: 'gut', eta: 'LT4 au moins 4 h avant (transporteurs intestinaux).' },
    { id: 'papaya', g: 'food', t: 'Papaye', at: true, bS: 0.6, phT: 0.8, pers: 4, site: 'stomach', eta: 'LT4 au moins 4 h avant.' },
    { id: 'whey', g: 'food', t: 'Suppléments protéiques (whey, soja)', at: true, em: 0.6, tpT: 0.85, pers: 4, site: 'gut', eta: 'Plus de 4 h après la LT4 ; éviter si possible.' },
    { id: 'calcium', g: 'food', t: 'Sels de calcium (carbonate, citrate)', at: true, bS: 1.4, pers: 5, liq: 0.3, site: 'stomach', eta: 'LT4 au moins 4 à 6 h avant ; forme liquide ou capsule molle possible.' },
    { id: 'iron', g: 'food', t: 'Sels de fer (sulfate, fumarate)', at: true, bI: 1.1, pers: 4, liq: 0.5, site: 'gut', eta: 'LT4 au moins 4 h avant le fer ; forme liquide possible.' },
    { id: 'vitc', g: 'food', t: 'Vitamine C', at: true, phFix: 0.5, site: 'stomach', eta: 'Acidifie le suc gastrique : améliore l\'absorption en cas d\'hypochlorhydrie.' },
    { id: 'niacin', g: 'food', t: 'Acide nicotinique', tbg: 0.95, site: 'blood', eta: 'Liaison protéique ↓ : en général pas d\'ajustement.' },
    // Médicaments (tableau 2)
    { id: 'ipp', g: 'drug', t: 'IPP (oméprazole, ésoméprazole, pantoprazole…)', ph: 0.45, liq: 0.25, site: 'stomach', eta: 'LT4 au moins 4 h avant ; reconsidérer l\'indication ; forme liquide ou capsule molle.' },
    { id: 'cimet', g: 'drug', t: 'Cimétidine', ph: 0.6, liq: 0.3, site: 'stomach', eta: 'Changer pour une autre molécule de la classe.' },
    { id: 'antacid', g: 'drug', t: 'Hydroxydes d\'aluminium, de magnésium', at: true, bI: 2, pers: 4, site: 'gut', eta: 'LT4 au moins 4 h avant.' },
    { id: 'sucral', g: 'drug', t: 'Sucralfate', at: true, bI: 2, pers: 4, site: 'gut', eta: 'LT4 au moins 4 h avant.' },
    { id: 'resin', g: 'drug', t: 'Cholestyramine, colésévélam', at: true, bI: 3, pers: 6, cl: 1.12, site: 'gut', eta: 'Éviter l\'association ou espacer au maximum (cycle entéro-hépatique interrompu).' },
    { id: 'binder', g: 'drug', t: 'Sévélamer, carbonate de lanthane, polystyrène sulfonate', at: true, bI: 2.2, pers: 6, site: 'gut', eta: 'Éviter l\'association ou espacer au maximum.' },
    { id: 'prokin', g: 'drug', t: 'Dompéridone, métoclopramide', em: 1.4, tsh: 1.15, site: 'pit', eta: 'Légère hausse de la TSH : surveiller.' },
    { id: 'carba', g: 'drug', t: 'Carbamazépine, phénytoïne', cl: 1.3, site: 'liver', eta: 'Métabolisme accéléré : augmenter la dose chez le thyroïdectomisé.' },
    { id: 'ssri', g: 'drug', t: 'Fluoxétine, sertraline, tricycliques, neuroleptiques', tsh: 1.1, site: 'pit', eta: 'Légère hausse de la TSH : surveiller.' },
    { id: 'estro', g: 'drug', t: 'Œstrogènes oraux (pilule, THS), tamoxifène', tbg: 1.3, site: 'blood', eta: 'TBG ↑ : augmenter la dose, TSH à 6 semaines.' },
    { id: 'ralox', g: 'drug', t: 'Raloxifène', at: true, bI: 1, pers: 12, site: 'gut', eta: 'Éviter l\'association ou LT4 au moins 12 h avant.' },
    { id: 'andro', g: 'drug', t: 'Androgènes', tbg: 0.8, site: 'blood', eta: 'TBG ↓ : réduire la dose.' },
    { id: 'cortico', g: 'drug', t: 'Corticoïdes, analogues de la somatostatine, agonistes dopaminergiques', tsh: 0.7, site: 'pit', eta: 'TSH ↓ (transitoire) : la TSH sous-estime le besoin ; surveiller la T4L.' },
    { id: 'gh', g: 'drug', t: 'Hormone de croissance', cl: 1.15, site: 'liver', eta: 'Métabolisme de la T4 ↑ : surveiller.' },
    { id: 'mife', g: 'drug', t: 'Mifépristone', surf: 0.9, cl: 1.1, site: 'gut', eta: 'Augmenter la dose.' },
    { id: 'cipro', g: 'drug', t: 'Ciprofloxacine', at: true, tpT: 0.8, pers: 3, site: 'gut', eta: 'Éviter l\'administration simultanée (OATP1A2).' },
    { id: 'rifa', g: 'drug', t: 'Rifampicine, antirétroviraux', cl: 1.25, site: 'liver', eta: 'Catabolisme ↑ : surveiller, augmenter la dose.' },
    { id: 'tki', g: 'drug', t: 'Inhibiteurs de tyrosine kinase, mitotane, bexarotène', cl: 1.35, conv: 0.85, site: 'liver', eta: 'Métabolisme ↑, conversion T4 → T3 ↓ : surveiller (bexarotène : TSH ↓).' },
    { id: 'amio', g: 'drug', t: 'Propranolol, amiodarone', conv: 0.8, site: 'tissue', eta: 'Conversion T4 → T3 ↓ : surveiller.' },
    { id: 'statin', g: 'drug', t: 'Lovastatine', cl: 1.1, site: 'liver', eta: 'Changer d\'hypolipémiant.' },
    { id: 'metf', g: 'drug', t: 'Metformine', tsh: 0.85, site: 'pit', eta: 'TSH ↓ : surveiller.' },
    { id: 'orli', g: 'drug', t: 'Orlistat, picolinate de chrome', at: true, bI: 1, pers: 4, site: 'gut', eta: 'LT4 au moins 4 h avant.' },
    { id: 'simet', g: 'drug', t: 'Siméthicone', at: true, bI: 0.8, pers: 2, site: 'gut', eta: 'Éviter l\'administration simultanée.' },
    { id: 'clofib', g: 'drug', t: 'Clofibrate', tbg: 1.1, site: 'blood', eta: 'Liaison protéique ↑ : augmenter la dose.' },
    { id: 'nsaid', g: 'drug', t: 'Furosémide, héparine, salicylés, AINS', site: 'blood', eta: 'Liaison protéique ↓ (T4L faussement haute) : en général pas d\'ajustement.' },
    // Comorbidités (tableau 3) et situations
    { id: 'sclero', g: 'dis', t: 'Sclérodermie systémique', em: 0.5, liq: 0.3, site: 'stomach', eta: 'Dysmotilité œsophagienne : forme liquide.' },
    { id: 'atroph', g: 'dis', t: 'Gastrite atrophique chronique', ph: 0.5, liq: 0.25, site: 'stomach', eta: 'pH > 2, besoins + 22 à 34 % : forme liquide ou capsule molle.' },
    { id: 'hp', g: 'dis', t: 'Gastrite à Helicobacter pylori', ph: 0.6, liq: 0.25, site: 'stomach', eta: 'Éradication ; forme liquide ou capsule molle.' },
    { id: 'paresis', g: 'dis', t: 'Gastroparésie', em: 0.35, liq: 0.5, site: 'stomach', eta: 'Vidange retardée : capsule molle.' },
    { id: 'sleeve', g: 'dis', t: 'Chirurgie bariatrique restrictive (sleeve)', em: 2.5, ph: 0.75, liq: 0.4, site: 'stomach', eta: 'Brassage, pH, vidange modifiés : forme liquide.' },
    { id: 'bypass', g: 'dis', t: 'Bypass gastrique (malabsorptif)', em: 3, surf: 0.3, tr: 2.5, liq: 0.75, site: 'gut', eta: 'Besoins × 3 à 4 dans les montages malabsorptifs : forme liquide.' },
    { id: 'celiac', g: 'dis', t: 'Maladie cœliaque', surf: 0.5, tr: 1.3, site: 'gut', eta: 'Atrophie villositaire (besoins jusqu\'à + 49 %) : régime sans gluten.' },
    { id: 'lactose', g: 'dis', t: 'Intolérance au lactose', tr: 1.8, liq: 0.7, site: 'gut', eta: 'Besoins + 31 % : régime sans lactose, forme liquide.' },
    { id: 'giardia', g: 'dis', t: 'Giardiase', surf: 0.8, tr: 1.5, site: 'gut', eta: 'Traitement de Giardia lamblia ; forme liquide.' },
    { id: 'shortgut', g: 'dis', t: 'Syndrome du grêle court', surf: 0.35, tr: 2.5, site: 'gut', eta: 'Surface d\'absorption ↓ (téduglutide ?).' },
    { id: 'cf', g: 'dis', t: 'Mucoviscidose, insuffisance pancréatique exocrine', surf: 0.8, tr: 1.4, site: 'gut', eta: 'Enzymes pancréatiques ; forme liquide.' },
    { id: 'uc', g: 'dis', t: 'Rectocolite hémorragique', tr: 1.3, site: 'gut', eta: 'Transit modifié.' },
    { id: 'cirrh', g: 'dis', t: 'Cirrhose', tbg: 1.2, cl: 0.95, site: 'liver', eta: 'TBG ↑, bile ↓ : forme liquide.' },
    { id: 'nephro', g: 'dis', t: 'Syndrome néphrotique', cl: 1.2, site: 'blood', eta: 'Perte urinaire de T4 liée à l\'albumine.' },
    { id: 'enteral', g: 'sit', t: 'Alimentation entérale continue (sonde)', bS: 0.6, bI: 0.6, cont: true, liq: 0.5, site: 'gut', eta: 'Préparation liquide ; suspendre la nutrition 1 h avant et après (rec. 16c).' },
    { id: 'preg1', g: 'sit', t: 'Grossesse, 1er trimestre', need: 1.3, site: 'blood', eta: '+ 25 à 30 % dès le diagnostic ; TSH, T4L chaque trimestre (rec. 9a).' },
    { id: 'preg2', g: 'sit', t: 'Grossesse, 2e et 3e trimestres', need: 1.45, site: 'blood', eta: 'TSH, T4L et T4 totale au moins chaque trimestre (rec. 9a).' },
    { id: 'pma', g: 'sit', t: 'Stimulation ovarienne (PMA)', tbg: 1.35, site: 'blood', eta: 'Augmenter la dose avant, TSH < 2,5 (rec. 9b).' },
    { id: 'storage', g: 'sit', t: 'Comprimés mal conservés (chaleur, humidité, hors blister)', pot: 0.85, site: 'mouth', eta: 'Déshydratation du sel pentahydraté : conditions de conservation (rec. 1).' },
    { id: 'brand', g: 'sit', t: 'Changement de marque ou de générique', pot: 0.92, site: 'mouth', eta: 'Garder la même marque ; sinon TSH et T4L à 6 semaines (rec. 3).' }
  ];
  const BY = Object.fromEntries(ITEMS.map((x) => [x.id, x]));
  const GROUPS = [['food', 'Aliments, boissons, compléments (tableau 1)'], ['drug', 'Médicaments (tableau 2)'], ['dis', 'Comorbidités (tableau 3)'], ['sit', 'Situations particulières']];
  const DELAYS = [[0, 'en même temps'], [0.5, '30 min après'], [1, '1 h après'], [2, '2 h après'], [4, '4 h après'], [6, '6 h après'], [12, '12 h après']];
  const TIMES = { jeun60: ['À jeun, 60 min avant le petit-déjeuner', 7, 1], jeun30: ['À jeun, 30 min avant le petit-déjeuner', 7, 0.5], repas: ['Pendant le petit-déjeuner', 7, 0], coucher: ['Au coucher (3 h après le dîner)', 22, null] };
  const FORMS = { cp: 'Comprimé', liq: 'Solution buvable', caps: 'Capsule molle' };

  /* ---------- Simulation d'une prise (pas de 1 min, 10 h) ---------- */
  // sc : { form, time, items: { id: { on, delay } }, potency } ; renvoie la courbe et la fraction absorbée.
  function simulate(sc) {
    const form = sc.form || 'cp', on = Object.entries(sc.items || {}).filter(([k, v]) => v && v.on && BY[k]).map(([k, v]) => Object.assign({ delay: v.delay || 0 }, BY[k]));
    const T = TIMES[sc.time || 'jeun60'];
    const liqK = (it) => (form === 'cp' ? 1 : it.liq != null ? it.liq : 1);
    // Paramètres chroniques
    let ph = 1, em = 1, surf = 1, tr = 1, tp = 1, phFix = 0;
    on.forEach((it) => {
      if (it.ph) ph *= 1 - (1 - it.ph) * liqK(it);
      if (it.em) em *= it.em > 1 ? it.em : 1 - (1 - it.em) * liqK(it);
      if (it.surf) surf *= 1 - (1 - it.surf) * liqK(it);
      if (it.tr) tr *= 1 + (it.tr - 1) * liqK(it);
      if (it.phFix) phFix = Math.max(phFix, it.phFix);
    });
    if (phFix && ph < 1) ph += (1 - ph) * phFix;
    // Prises datées : petit-déjeuner selon le moment, autres éléments selon leur délai.
    const timed = on.filter((it) => it.at).map((it) => ({ it, t: it.id === 'meal' ? null : it.delay * 60 }));
    const mealT = T[2] == null ? null : T[2] * 60; // minutes après la LT4 (coucher : pas de repas dans les 10 h)
    if (mealT != null && !timed.some((x) => x.it.id === 'meal')) timed.push({ it: BY.meal, t: mealT });
    timed.forEach((x) => { if (x.t == null) x.t = mealT == null ? 600 : mealT; });
    const pres = (x, t, where) => {
      const dt = t - x.t; if (dt < 0) return 0;
      return where === 'S' ? Math.exp(-dt / (x.it.id === 'meal' ? 90 : 45)) : (dt < 20 ? dt / 20 : 1) * Math.exp(-Math.max(0, dt - 20) / (60 * (x.it.pers || 2)));
    };
    const cont = on.filter((it) => it.cont);
    const D = 1 * (on.reduce((a, it) => a * (it.pot || 1), 1));
    let tab = form === 'liq' ? 0 : D, gs = form === 'liq' ? D : 0, tabI = 0, I = 0, A = 0, Fb = 0, Ft = 0;
    const pts = [];
    for (let m = 0; m <= 600; m++) {
      let bS = 0, bI = 0, tpT = 1, mealIn = false;
      timed.forEach((x) => {
        const k = liqK(x.it), pS = pres(x, m, 'S'), pI = pres(x, m, 'I');
        if (x.it.bS) bS += x.it.bS * pS * k;
        if (x.it.bI) bI += x.it.bI * pI * k;
        if (x.it.tpT) tpT *= 1 - (1 - x.it.tpT) * pI;
        if (x.it.id === 'meal' && pS > 0.3) mealIn = true;
      });
      cont.forEach((it) => { bS += it.bS * liqK(it); bI += it.bI * liqK(it); mealIn = true; });
      // Dissolution : comprimé (pH-dépendante), capsule (enveloppe, peu sensible au pH).
      const kd = form === 'caps' ? 0.09 * Math.pow(ph, 0.15) : 0.06 * ph * ph * ph;
      const ke = 0.035 * em * (mealIn ? 0.45 : 1);
      const dTab = tab * kd, eTab = tab * ke * 0.6, dS = gs * ke, bindS = gs * 0.02 * bS;
      const dTI = tabI * (form === 'caps' ? 0.02 : 0.004);
      const abs = I * 0.016 * surf * tp * tpT, lossT = I * 0.0035 * tr, bindI = I * 0.012 * bI;
      tab -= dTab + eTab; tabI += eTab - dTI - tabI * 0.0035 * tr; Ft += tabI * 0.0035 * tr;
      gs += dTab - dS - bindS; I += dS + dTI - abs - lossT - bindI;
      A += abs; Fb += bindS + bindI; Ft += lossT;
      if (m % 5 === 0) pts.push({ m, tab, gs, tabI, I, A, Fb, Ft, bS, bI, ph, flows: { diss: dTab, empt: dS + eTab, abs, bind: bindS + bindI, loss: lossT } });
    }
    return { pts, F: A, Fb, Ft, ph, em, surf, tr, tp, D, timeLabel: T[0], doseH: T[1], mealT };
  }

  // Facteurs systémiques : besoins (TBG, clairance, grossesse), TSH, conversion.
  function systemic(sc) {
    let tbg = 1, cl = 1, need = 1, tsh = 1, conv = 1;
    Object.entries(sc.items || {}).forEach(([k, v]) => { const it = BY[k]; if (!v || !v.on || !it) return; if (it.tbg) tbg *= it.tbg; if (it.cl) cl *= it.cl; if (it.need) need *= it.need; if (it.tsh) tsh *= it.tsh; if (it.conv) conv *= it.conv; });
    // Une TBG plus haute capte la T4 (à l'équilibre, besoins ≈ proportionnels à la TBG, atténués) ; la clairance agit pleinement.
    return { tbg, cl, need: need * cl * (1 + 0.8 * (tbg - 1)), tsh, conv };
  }

  const REF = { form: 'cp', time: 'jeun60', items: {} };
  let F0 = null;
  function refF() { if (F0 == null) F0 = simulate(REF).F; return F0; }

  // État d'équilibre avec le modèle thyroïdien du simulateur (js/simu/model.js).
  function steady(sc, pat) {
    const M = S.model, r = simulate(sc), sy = systemic(sc);
    const rel = r.F / refF(), adh = (pat.adh == null ? 100 : pat.adh) / 100;
    const par = { weight: pat.weight, r: pat.r || 0, hr0: 72 };
    const make = (dose, abs) => { const pt = M.create({ par: Object.assign({}, par, { need: () => sy.need }), rx0: { lt4: dose, lt4Abs: abs } }); return pt; };
    const pt = make(pat.dose, rel * adh);
    const tshRaw = pt.st.TSH, t4 = 16 * pt.st.T4 / Math.pow(sy.conv, 0.4), tsh = tshRaw * sy.tsh;
    let lo = 10, hi = 900;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (make(mid, rel * adh).st.TSH > 1.5) lo = mid; else hi = mid; }
    const ptN = make(pat.dose, 1);
    return { r, sy, rel, adh, tsh, tshRaw, t4, t3: 5 * pt.st.T3 * sy.conv, doseNeed: (lo + hi) / 2, tshNormal: ptN.st.TSH, F0: refF() };
  }

  // Contribution de chaque élément : biodisponibilité et besoins sans lui.
  function contributions(sc, pat) {
    const base = simulate(sc).F, sy = systemic(sc);
    return Object.entries(sc.items || {}).filter(([k, v]) => v && v.on && BY[k]).map(([k]) => {
      const sc2 = Object.assign({}, sc, { items: Object.assign({}, sc.items, { [k]: { on: false } }) });
      const F2 = simulate(sc2).F, n2 = systemic(sc2).need;
      return { id: k, t: BY[k].t, dAbs: (F2 - base) / refF(), dNeed: sy.need / n2 - 1, tsh: BY[k].tsh, conv: BY[k].conv, eta: BY[k].eta };
    }).sort((a, b) => Math.abs(b.dAbs) + Math.abs(b.dNeed) - Math.abs(a.dAbs) - Math.abs(a.dNeed));
  }

  /* ---------- Vue ---------- */
  function el(tag, a, par) { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (par) par.appendChild(n); return n; }
  const NODES = {
    mouth: { x: 170, y: 140, t: 'Prise', ic: 'pill' }, stomach: { x: 170, y: 420, t: 'Estomac', ic: 'stomach' }, gut: { x: 520, y: 640, t: 'Intestin grêle', ic: 'gut' },
    feces: { x: 170, y: 760, t: 'Fèces', ic: 'feces' }, blood: { x: 880, y: 420, t: 'Sang (TBG)', ic: 'blood' }, liver: { x: 880, y: 720, t: 'Foie', ic: 'liver' },
    tissue: { x: 1230, y: 640, t: 'Tissus (T3)', ic: 'tissue' }, pit: { x: 1230, y: 160, t: 'Hypophyse (TSH)', ic: 'pit' }
  };
  const LINKS = { diss: ['mouth', 'stomach', 0, 'dissolution'], empt: ['stomach', 'gut', -60, 'vidange'], abs: ['gut', 'blood', -50, 'absorption'], bind: ['stomach', 'feces', 70, 'complexes'], loss: ['gut', 'feces', 50, 'non absorbée'], clear: ['blood', 'liver', 0, 'catabolisme'], conv: ['blood', 'tissue', 40, 'T4 → T3'], fb: ['blood', 'pit', -40, 'T4 libre'], tsh: ['pit', 'tissue', 60, ''] };
  // Organes : dessins de l'atlas (js/organs.js, illustrations Servier) ; prise et fèces restent dessinées ici.
  function drawIcon(g, ic) {
    if (S.organIcon(g, ic)) return;
    const p = (d, cls) => el('path', { d, class: 'lp-org ' + cls }, g);
    if (ic === 'pill') { el('rect', { x: -26, y: -11, width: 52, height: 22, rx: 11, class: 'lp-org lp-pill' }, g); el('path', { d: 'M0,-11 V11', class: 'lp-line' }, g); }
    else if (ic === 'feces') p('M -24,14 C -30,2 -16,-6 -6,-4 C -6,-16 8,-20 14,-10 C 26,-12 30,4 22,12 C 12,20 -14,22 -24,14 Z', 'lp-feces');
  }

  function card(ctx) {
    const { h } = ctx;
    const st = ctx.state || {};
    const sc = st.sc = st.sc || { form: 'cp', time: 'jeun60', items: {} };
    const pat = st.pat = st.pat || { weight: 70, r: 0, dose: 125, adh: 100, central: false };
    if (ctx.preset && !st.presetDone) { Object.assign(sc, JSON.parse(JSON.stringify(ctx.preset.sc))); Object.assign(pat, ctx.preset.pat); st.presetDone = true; }
    st.t = st.t == null ? 0 : st.t;
    const root = h('div', { class: 'sv-card lp-card', id: 'lpCard' });
    const svg = el('svg', { viewBox: '0 0 1400 930', class: 'ph-svg px-svg lp-svg', role: 'img', 'aria-label': 'Devenir d\'une prise de lévothyroxine' });
    const chart = el('svg', { viewBox: '0 0 760 220', class: 'ph-chart', role: 'img', 'aria-label': 'Absorption cumulée' });
    const res = h('div', { class: 'lp-res', id: 'lpRes' }), contrib = h('div', { class: 'lp-contrib' });
    const slider = h('input', { type: 'range', min: 0, max: 600, step: 5, value: st.t, class: 'sv-range', id: 'lpT', 'aria-label': 'Minutes après la prise', oninput: (e) => { st.t = +e.target.value; frame(); } });
    const tLab = h('strong', { class: 'ph-time' });
    let play = false;
    const playBtn = h('button', { type: 'button', class: 'sv-secondary', id: 'lpPlay', onclick: () => { play = !play; playBtn.textContent = play ? '⏸ Pause' : '▶ Lecture'; if (play) { if (st.t >= 600) st.t = 0; requestAnimationFrame(loop); } } }, '▶ Lecture');
    const field = (lab, input) => h('div', { class: 'sv-field' }, [h('label', null, lab), input]);
    const sel = (id, val, opts, on) => h('select', { id, onchange: (e) => { on(e.target.value); update(); } }, opts.map(([k, t]) => h('option', { value: k, selected: String(val) === String(k) }, t)));
    const STR = [25, 50, 75, 88, 100, 112, 125, 137, 150, 175, 200, 225, 250, 300];
    const groups = GROUPS.map(([g, title]) => {
      const list = ITEMS.filter((x) => x.g === g && x.id !== 'meal');
      const n = list.filter((x) => sc.items[x.id] && sc.items[x.id].on).length;
      return h('details', { class: 'lp-group', open: n > 0 || null }, [h('summary', null, title + (n ? ' · ' + n + ' actif' + (n > 1 ? 's' : '') : '')),
        h('div', { class: 'lp-items' }, list.map((it) => {
          const v = sc.items[it.id] || (sc.items[it.id] = { on: false, delay: 0 });
          return h('div', { class: 'lp-item' + (v.on ? ' on' : '') }, [
            h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'lp-' + it.id, checked: v.on, onchange: (e) => { v.on = e.target.checked; rebuild(); } }), ' ' + it.t]),
            it.at && v.on ? h('select', { id: 'lpD-' + it.id, 'aria-label': 'Délai après la LT4', onchange: (e) => { v.delay = +e.target.value; update(); } }, DELAYS.map(([d, t]) => h('option', { value: d, selected: v.delay === d }, t))) : null
          ]);
        }))]);
    });
    const ctrl = h('div', { class: 'lp-ctrl' }, [
      h('div', { class: 'sv-form' }, [
        field('Dose', sel('lpDose', pat.dose, STR.map((x) => [x, x + ' µg/j']), (v) => { pat.dose = +v; })),
        field('Forme', sel('lpForm', sc.form, Object.entries(FORMS), (v) => { sc.form = v; })),
        field('Moment de la prise', sel('lpTime', sc.time, Object.entries(TIMES).map(([k, v]) => [k, v[0]]), (v) => { sc.time = v; })),
        field('Poids', sel('lpW', pat.weight, [45, 55, 60, 70, 80, 90, 100, 120, 140].map((x) => [x, x + ' kg']), (v) => { pat.weight = +v; })),
        field('Thyroïde', sel('lpR', pat.r, [[0, 'Thyroïdectomie totale'], [0.1, 'Hashimoto (réserve ≈ 10 %)'], [0.25, 'Hashimoto (réserve ≈ 25 %)']], (v) => { pat.r = +v; })),
        field('Observance', sel('lpAdh', pat.adh, [100, 90, 75, 60, 40].map((x) => [x, x + ' % des prises']), (v) => { pat.adh = +v; }))
      ]),
      h('label', { class: 'sv-check' }, [h('input', { type: 'checkbox', id: 'lpCentral', checked: pat.central, onchange: (e) => { pat.central = e.target.checked; update(); } }), ' Hypothyroïdie centrale (suivi sur la T4L, pas sur la TSH : rec. 10)']),
      ...groups
    ]);
    root.append(
      h('div', { class: 'sv-card-head' }, [h('h3', null, '🔬 Physiologie de la lévothyroxine : absorption et besoins'), ctx.onClose ? h('button', { type: 'button', class: 'sv-secondary', onclick: ctx.onClose }, 'Fermer') : null]),
      h('p', { class: 'sv-muted' }, 'Composez la situation (tableaux 1 à 3 de l\'ETA 2025) : la prise est suivie minute par minute, de la dissolution dans l\'estomac à l\'absorption intestinale, puis le modèle thyroïdien donne la TSH et la T4L à l\'équilibre (6 à 8 semaines).'),
      h('div', { class: 'lp-grid' }, [ctrl, h('div', { class: 'lp-main' }, [res, h('div', { class: 'ph-ctrl' }, [playBtn, slider, tLab]), h('div', { class: 'ph-diag' }, [svg, S.organCredit(h)]), h('div', { class: 'ph-chartbox' }, chart), contrib])]),
      h('p', { class: 'sv-note' }, 'Modèle pédagogique (complément) : constantes calées pour une biodisponibilité d\'environ 75 % à jeun ; effets des interférences ordonnés selon l\'ETA 2025 (Centanni et al., Eur Thyroid J 2025;14:e250123) et Nagy (Thyroid 2021) pour les formulations.')
    );
    const g = {};
    function rebuild() { const rep = h('div', null, card(Object.assign({}, ctx, { state: st }))); root.replaceWith(rep.firstChild); }
    function update() { compute(); draw(); }
    function compute() { st.S = steady(sc, pat); st.C = contributions(sc, pat); }
    function draw() {
      svg.textContent = ''; chart.textContent = '';
      const S0 = st.S, r = S0.r;
      const defs = el('defs', {}, svg);
      S.organDefs(defs);
      ['a', 'l', 'k'].forEach((c) => { const m = el('marker', { id: 'lpA' + c, viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 18, markerHeight: 18, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs); el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'lp-ah lp-' + c }, m); });
      const P = (id) => NODES[id];
      const pillG = el('g', { class: 'px-pills' });
      Object.entries(LINKS).forEach(([id, [a, b, bend, lab]]) => {
        const A = P(a), B = P(b), dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, R = 72;
        const p0 = [A.x + dx / L * R, A.y + dy / L * R], p3 = [B.x - dx / L * R, B.y - dy / L * R];
        const c1 = [p0[0] + dx / 3 + nx * bend, p0[1] + dy / 3 + ny * bend], c2 = [p0[0] + 2 * dx / 3 + nx * bend, p0[1] + 2 * dy / 3 + ny * bend];
        const cls = id === 'bind' || id === 'loss' ? 'l' : id === 'tsh' || id === 'fb' ? 'k' : 'a';
        g[id] = el('path', { d: 'M' + p0.join(',') + ' C' + c1.join(',') + ' ' + c2.join(',') + ' ' + p3.join(','), class: 'lp-flow lp-' + cls, 'marker-end': 'url(#lpA' + cls + ')' }, svg);
        if (lab) { const u = 0.5, q = [(1 - u) ** 3 * p0[0] + 3 * (1 - u) ** 2 * u * c1[0] + 3 * (1 - u) * u * u * c2[0] + u ** 3 * p3[0], (1 - u) ** 3 * p0[1] + 3 * (1 - u) ** 2 * u * c1[1] + 3 * (1 - u) * u * u * c2[1] + u ** 3 * p3[1]], w = 18 + lab.length * 9.4; const pg = el('g', { class: 'px-pill lp-pill', transform: 'translate(' + q[0].toFixed(0) + ' ' + q[1].toFixed(0) + ')' }, pillG); el('rect', { x: -w / 2, y: -14, width: w, height: 28, rx: 14 }, pg); el('text', { y: 6, 'text-anchor': 'middle' }, pg).textContent = lab; }
      });
      g.mols = el('g', {}, svg);
      Object.entries(NODES).forEach(([id, n]) => {
        const grp = el('g', { class: 'px-node lp-node', 'data-node': id }, svg);
        el('circle', { cx: n.x, cy: n.y, r: 64, class: 'px-halo lp-h-' + id }, grp);
        drawIcon(el('g', { transform: 'translate(' + n.x + ' ' + n.y + ') scale(1.2)' }, grp), id === 'mouth' ? (sc.form === 'liq' ? 'pill' : 'pill') : n.ic);
        el('text', { x: n.x, y: n.y + 94, class: 'px-lbl', 'text-anchor': 'middle' }, grp).textContent = n.t;
        g['v_' + id] = el('text', { x: n.x, y: n.y + 120, class: 'px-v', 'text-anchor': 'middle' }, grp);
        g['s_' + id] = el('text', { x: n.x, y: n.y + 144, class: 'px-sub', 'text-anchor': 'middle' }, grp);
      });
      svg.appendChild(pillG); // les noms des flux passent devant les organes
      // Badges : chaque élément actif sur son organe.
      const by = {};
      Object.entries(sc.items).forEach(([k, v]) => { if (v.on && BY[k]) (by[BY[k].site] = by[BY[k].site] || []).push(BY[k].t.split(' (')[0].split(',')[0]); });
      if (sc.form !== 'cp') (by.mouth = by.mouth || []).unshift(FORMS[sc.form].toLowerCase());
      Object.entries(by).forEach(([site, list]) => { const n = NODES[site]; list.slice(0, 4).forEach((txt, i) => { const w = 8.6 * txt.length + 18, x = n.x + 52, y = n.y - 70 - i * 28; el('rect', { x, y: y - 12, width: w, height: 24, rx: 12, class: 'ph-pill lp-badge' }, svg); el('text', { x: x + w / 2, y: y + 5, class: 'ph-pt lp-badge-t', 'text-anchor': 'middle' }, svg).textContent = txt; }); if (list.length > 4) el('text', { x: n.x + 52, y: n.y - 70 - 4 * 28 + 5, class: 'px-sub' }, svg).textContent = '+ ' + (list.length - 4); });
      // pH gastrique (jauge)
      const phv = 1.5 + 4 * (1 - r.ph);
      el('text', { x: NODES.stomach.x - 130, y: NODES.stomach.y - 10, class: 'px-sub' }, svg).textContent = 'pH ≈ ' + fmt(phv, 1);
      drawChart(); drawRes(); frame();
    }
    function drawChart() {
      const r = st.S.r, ref = simulate(REF), L = 44, R = 20, T = 12, H = 170, W = 760, X = (m) => L + (W - L - R) * m / 600, Y = (v) => T + H * (1 - v);
      for (let m = 0; m <= 600; m += 60) { el('line', { x1: X(m), x2: X(m), y1: T, y2: T + H, class: 'ph-gl' }, chart); el('text', { x: X(m), y: T + H + 14, class: 'ph-ax', 'text-anchor': 'middle' }, chart).textContent = (m / 60) + ' h'; }
      [0, 0.25, 0.5, 0.75, 1].forEach((v) => el('text', { x: L - 5, y: Y(v) + 4, class: 'ph-ax', 'text-anchor': 'end' }, chart).textContent = Math.round(v * 100) + ' %');
      const line = (pts, f, cls) => el('path', { d: pts.map((q, i) => (i ? 'L' : 'M') + X(q.m).toFixed(1) + ',' + Y(f(q)).toFixed(1)).join(' '), class: cls }, chart);
      line(ref.pts, (q) => q.A, 'lp-ref');
      line(r.pts, (q) => q.gs + q.tab, 'lp-stom');
      line(r.pts, (q) => q.I + q.tabI, 'lp-int');
      line(r.pts, (q) => q.Fb + q.Ft, 'lp-lost');
      line(r.pts, (q) => q.A, 'ph-l-g');
      if (r.mealT != null && r.mealT <= 600) el('text', { x: X(r.mealT), y: T + 12, class: 'ph-meal', 'text-anchor': 'middle' }, chart).textContent = '🍽';
      Object.entries(sc.items).forEach(([k, v]) => { const it = BY[k]; if (v.on && it && it.at && it.id !== 'meal' && v.delay * 60 <= 600) el('text', { x: X(v.delay * 60) + 6, y: T + 26, class: 'ph-ax' }, chart).textContent = '◆ ' + it.t.split(' (')[0].split(',')[0].toLowerCase(); });
      g.cur = el('line', { x1: X(st.t), x2: X(st.t), y1: T, y2: T + H, class: 'ph-cur' }, chart); g.X = X;
      [['ph-l-g', 'absorbée'], ['lp-ref', 'référence à jeun'], ['lp-stom', 'estomac'], ['lp-int', 'intestin'], ['lp-lost', 'perdue (fèces)']].forEach(([c, t], i) => { const x0 = L + i * 140; el('rect', { x: x0, y: 206, width: 12, height: 6, class: c + ' lp-lg' }, chart); el('text', { x: x0 + 16, y: 213, class: 'ph-ax' }, chart).textContent = t; });
    }
    function drawRes() {
      const S0 = st.S, r = S0.r, kg = pat.dose / pat.weight;
      const tshT = pat.central ? 'non interprétable (centrale)' : fmt(S0.tsh, S0.tsh < 1 ? 2 : 1) + ' mUI/L';
      const ok = pat.central ? S0.t4 >= 15 && S0.t4 <= 20 : S0.tsh >= 0.4 && S0.tsh <= 4;
      res.textContent = '';
      const k = (lab, v, good, sub) => h('div', { class: 'dt1-kpi ' + (good ? 'ok' : 'ko') }, [h('span', null, lab), h('strong', null, v), sub ? h('em', null, sub) : null]);
      res.append(h('div', { class: 'dt1-kpis' }, [
        k('Biodisponibilité', fmt(r.F * 100, 0) + ' %', S0.rel > 0.9, 'référence ' + fmt(S0.F0 * 100, 0) + ' % (à jeun, comprimé)'),
        k('Besoins', '× ' + fmt(S0.sy.need, 2), Math.abs(S0.sy.need - 1) < 0.08, 'TBG × ' + fmt(S0.sy.tbg, 2) + ', clairance × ' + fmt(S0.sy.cl, 2)),
        k('TSH à l\'équilibre', tshT, ok, S0.sy.tsh !== 1 ? 'sécrétion de TSH × ' + fmt(S0.sy.tsh, 2) + ' (lecture faussée)' : 'cible 0,5–2,5'),
        k('T4 libre', fmt(S0.t4, 1) + ' pmol/L', S0.t4 >= 12 && S0.t4 <= 22, S0.sy.conv < 1 ? 'conversion en T3 ↓ (T3L ' + fmt(S0.t3, 1) + ')' : '12–22'),
        k('Dose pour une TSH ≈ 1,5', Math.round(S0.doseNeed) + ' µg/j', Math.abs(S0.doseNeed - pat.dose) < 15, fmt(S0.doseNeed / pat.weight, 2) + ' µg/kg/j (prescrit ' + fmt(kg, 2) + ')')
      ]));
      if (S0.doseNeed / pat.weight > (pat.r > 0 ? 1.7 : 2)) res.append(h('p', { class: 'dt1-evnote' }, 'Dose nécessaire > ' + (pat.r > 0 ? '1,5–1,7' : '1,8–2,0') + ' µg/kg/j : rechercher une mauvaise observance, des interférences ou une pseudo-malabsorption ; test d\'absorption si réfractaire (rec. 2a-2b).'));
      contrib.textContent = '';
      if (st.C.length) contrib.append(h('p', { class: 'sv-eyebrow' }, 'Ce que coûte chaque élément'), h('ul', { class: 'dt1-an' }, st.C.map((c) => h('li', { class: c.dAbs > 0.05 || c.dNeed > 0.05 ? 'dt1-bad' : c.dAbs > 0.01 || Math.abs(c.dNeed) > 0.01 || c.tsh || c.conv ? 'dt1-warn' : 'dt1-good' }, [h('b', null, c.t), ' : ', c.dAbs > 0.005 ? '− ' + fmt(c.dAbs * 100, 0) + ' points d\'absorption ; ' : '', Math.abs(c.dNeed) > 0.005 ? 'besoins ' + (c.dNeed > 0 ? '+ ' : '− ') + fmt(Math.abs(c.dNeed) * 100, 0) + ' % ; ' : '', c.tsh ? 'TSH × ' + fmt(c.tsh, 2) + ' ; ' : '', c.conv ? 'conversion T4 → T3 × ' + fmt(c.conv, 2) + ' ; ' : '', h('span', { class: 'sv-muted' }, 'ETA : ' + c.eta)]))));
    }
    function frame() {
      const r = st.S.r, i = Math.min(r.pts.length - 1, Math.round(st.t / 5)), q = r.pts[i];
      tLab.textContent = (st.t >= 60 ? Math.floor(st.t / 60) + ' h ' : '') + String(st.t % 60).padStart(2, '0') + ' min après la prise';
      const W = (v, max) => Math.max(2.5, Math.min(22, 2.5 + 19 * v / max));
      const set = (id, v, max) => { if (!g[id]) return; g[id].setAttribute('stroke-width', W(v, max).toFixed(1)); g[id].classList.toggle('idle', v < max * 0.03); st.flux = st.flux || {}; st.flux[id] = v < max * 0.03 ? 0 : Math.min(1.3, v / max); };
      const S0 = st.S;
      set('diss', q.flows.diss, 0.04); set('empt', q.flows.empt, 0.03); set('abs', q.flows.abs, 0.012); set('bind', q.flows.bind, 0.006); set('loss', q.flows.loss, 0.004);
      set('clear', S0.sy.cl, 1.5); set('conv', S0.sy.conv, 1.5); set('fb', 1, 1.5); set('tsh', Math.min(3, S0.tsh / 2), 2);
      const pc = (v) => fmt(v * 100, 0) + ' %';
      const t = (id, v, s) => { if (g['v_' + id]) g['v_' + id].textContent = v; if (g['s_' + id]) g['s_' + id].textContent = s || ''; };
      t('mouth', FORMS[sc.form] + ' ' + pat.dose + ' µg', TIMES[sc.time][0].split(',')[0].toLowerCase());
      t('stomach', 'non dissous ' + pc(q.tab) + ' · dissous ' + pc(q.gs), 'dissolution × ' + fmt(r.ph, 2) + ' · vidange × ' + fmt(r.em, 2));
      t('gut', 'LT4 libre ' + pc(q.I + q.tabI), 'surface × ' + fmt(r.surf, 2) + ' · transit × ' + fmt(r.tr, 2));
      t('feces', 'perdue ' + pc(q.Fb + q.Ft), 'complexes ' + pc(q.Fb) + ' · transit ' + pc(q.Ft));
      t('blood', 'absorbée ' + pc(q.A), 'TBG × ' + fmt(S0.sy.tbg, 2) + ' · T4L ' + fmt(S0.t4, 1) + ' pmol/L');
      t('liver', 'clairance × ' + fmt(S0.sy.cl, 2), 'désiodation, conjugaison, bile');
      t('tissue', 'T3L ' + fmt(S0.t3, 1) + ' pmol/L', S0.sy.conv < 1 ? 'conversion × ' + fmt(S0.sy.conv, 2) : 'désiodases D1, D2');
      t('pit', pat.central ? 'TSH non interprétable' : 'TSH ' + fmt(S0.tsh, S0.tsh < 1 ? 2 : 1) + ' mUI/L', 'à l\'équilibre (6–8 sem.)');
      if (g.cur) { const x = g.X(st.t); g.cur.setAttribute('x1', x); g.cur.setAttribute('x2', x); }
      slider.value = st.t;
    }
    let last = 0;
    function loop(ts) { if (!play || !root.isConnected) { last = 0; return; } if (last) { st.t = Math.min(600, st.t + (ts - last) / 1000 * 60); frame(); if (st.t >= 600) { play = false; playBtn.textContent = '▶ Lecture'; } } last = ts; requestAnimationFrame(loop); }
    // Molécules (LT4) le long des flux.
    const parts = {};
    let mLast = 0;
    function mloop(ts) {
      if (!root.isConnected) return;
      const dt = mLast ? Math.min(0.1, (ts - mLast) / 1000) : 0; mLast = ts;
      if (g.mols && g.mols.isConnected) {
        if (mloop.lay !== g.mols) { mloop.lay = g.mols; Object.keys(parts).forEach((k) => delete parts[k]); }
        Object.keys(LINKS).forEach((id) => {
          const path = g[id]; if (!path) return;
          const f = (st.flux && st.flux[id]) || 0, n = f > 0 ? Math.round(1 + 4 * Math.min(1, f)) : 0, arr = parts[id] || (parts[id] = []);
          while (arr.length < n) { const c = el('circle', { r: id === 'bind' ? 7 : 5, class: 'lp-mol lp-m-' + id }, g.mols); arr.push({ c, x: Math.random() }); }
          while (arr.length > n) arr.pop().c.remove();
          const L = path.getTotalLength();
          arr.forEach((pa) => { pa.x = (pa.x + dt * (0.15 + 0.3 * f)) % 1; const p = path.getPointAtLength(pa.x * L); pa.c.setAttribute('cx', p.x.toFixed(1)); pa.c.setAttribute('cy', p.y.toFixed(1)); });
        });
      }
      requestAnimationFrame(mloop);
    }
    compute(); draw(); requestAnimationFrame(mloop);
    return root;
  }

  S.lt4physio = { ITEMS, BY, simulate, systemic, steady, contributions, card, TIMES, FORMS };
})();
