/*
 * Mode « Hypothyroïdie difficile à substituer » du simulateur thyroïde (js/simu/sandbox.js).
 * Chaque histoire : un patient équilibré sous lévothyroxine, puis un médicament, une habitude ou une maladie
 * qui réduit l'absorption ou augmente les besoins ; l'interne interroge, demande les examens utiles et agit :
 * moment de la prise, espacement, arrêt du médicament en cause, forme liquide ou capsule molle, traitement de la
 * cause, prise hebdomadaire supervisée, ajustement de la dose. Repères : ETA 2025 (Centanni et al.,
 * Eur Thyroid J 2025;14:e250123), item 243. Ordres de grandeur des pertes : tableaux de l'ETA (maladie cœliaque
 * jusqu'à + 49 % de besoins, gastrite atrophique + 22 à 34 %, intolérance au lactose + 31 %, bypass × 3 à 4) ;
 * le reste est un complément pédagogique.
 */
(function () {
  'use strict';
  const S = window.HV.simu;

  // Moment de la prise : fraction absorbée (complément ; café : Wiesner 2020, ETA tableau 1).
  const TIMES = {
    jeun60: ['À jeun, 60 min avant le petit-déjeuner', 1],
    jeun30: ['À jeun, 30 min avant le petit-déjeuner', 0.93],
    coucher: ['Au coucher, 3 h après le dîner', 0.98],
    repas: ['Pendant le petit-déjeuner', 0.75],
    cafe: ['Avec le café du matin (espresso)', 0.72]
  };
  const FORMS = { cp: 'Comprimé', liq: 'Solution buvable (gouttes)', caps: 'Capsule molle' };
  const CAUSES = { none: 'Aucun', ssg: 'Régime sans gluten strict', hp: 'Éradication d\'Helicobacter pylori', lactose: 'Régime pauvre en lactose' };

  const STORIES = [
    { id: 'ipp', icon: '💊', title: 'L\'IPP du gastro-entérologue', who: 'Mme Garnier, 58 ans, 70 kg', cfg: { sex: 'F', age: 58, weight: 70, r: 0.05 },
      pre: 'Hashimoto équilibré depuis 8 ans (TSH 1,8 l\'an dernier). Elle « n\'a rien changé ». Fatigue, frilosité depuis l\'hiver.',
      clue: 'Reflux il y a 6 mois : le gastro-entérologue a prescrit ésoméprazole 40 mg le matin, « au long cours ». Les brûlures ont disparu depuis longtemps. Elle prend tout ensemble au réveil.',
      meds: ['Lévothyroxine (comprimé, à jeun, 30 min avant le petit-déjeuner)', 'Ésoméprazole 40 mg/j depuis 6 mois'],
      drug: { name: 'ésoméprazole', loss: 0.24, spaceResid: 0.75, liquidFix: 0.3, stoppable: true, stopLab: 'Arrêter l\'IPP (indication terminée) ou le réduire' },
      ago: 180, habit: 'jeun30',
      tests: { hp: 'test respiratoire à l\'urée négatif', b12: 'vitamine B12 normale, anticorps anti-cellules pariétales négatifs', ttg: 'anticorps anti-transglutaminase négatifs (IgA totales normales)', fer: 'ferritine 85 µg/L' },
      key: 'IPP : l\'acidité gastrique est nécessaire à la dissolution du comprimé. Conduite ETA : reconsidérer l\'indication de l\'IPP (déprescription) ; sinon LT4 au moins 4 h avant, forme liquide ou capsule molle, ou dose ajustée tant que l\'IPP est pris (rec. 8, 16c).',
      best: (x) => x.stop || x.form !== 'cp' },
    { id: 'calcium', icon: '🦴', title: 'Le calcium du rhumatologue', who: 'M. Roux, 67 ans, 82 kg', cfg: { sex: 'M', age: 67, weight: 82, r: 0 },
      pre: 'Thyroïdectomie totale pour cancer papillaire il y a 6 ans, lévothyroxine stable. TSH à 9 au bilan systématique.',
      clue: 'Ostéoporose découverte cette année : carbonate de calcium 1 g et vitamine D, « avec le petit-déjeuner, comme le reste ». Il prend la lévothyroxine en même temps, pour ne pas oublier.',
      meds: ['Lévothyroxine (avec le petit-déjeuner, en même temps que le calcium)', 'Carbonate de calcium 1 g + vitamine D3 depuis 5 mois', 'Alendronate 70 mg/semaine'],
      drug: { name: 'carbonate de calcium', loss: 0.2, spaceResid: 0.08, liquidFix: 0.35, stoppable: false },
      ago: 150, habit: 'repas', preTime: 'jeun30',
      tests: { fer: 'ferritine 140 µg/L', ttg: 'anticorps anti-transglutaminase négatifs', b12: 'vitamine B12 normale', hp: 'test respiratoire négatif' },
      key: 'Sels de calcium : liaison à la LT4 dans l\'estomac. Conduite ETA : LT4 au moins 4 à 6 h avant (calcium le midi ou le soir), ou forme liquide ou capsule molle ; à jeun, à distance du petit-déjeuner (rec. 4, tableau 1). Le calcium reste indiqué.',
      best: (x) => x.space && x.time !== 'repas' },
    { id: 'cafe', icon: '☕', title: 'L\'espresso du matin', who: 'M. Bernard, 45 ans, 80 kg', cfg: { sex: 'M', age: 45, weight: 80, r: 0.1 },
      pre: 'Hashimoto, TSH entre 5 et 8 depuis deux ans malgré des hausses de dose successives. « Je prends mon comprimé tous les matins, sans faute. »',
      clue: 'Il avale le comprimé avec son espresso, debout, à 6 h 30, avant de partir au travail : « Sans café, je ne démarre pas. » Pas de médicament, pas de trouble digestif.',
      meds: ['Lévothyroxine (avec le café du matin)'],
      ago: 0, habit: 'cafe', doseMul: 1.05,
      tests: { ttg: 'anticorps anti-transglutaminase négatifs', fer: 'ferritine 160 µg/L', b12: 'vitamine B12 normale', hp: 'test respiratoire négatif' },
      key: 'Café : liaison à la LT4, absorption réduite d\'environ un quart. Conduite ETA : LT4 au moins 1 h avant le café (60 min avant le petit-déjeuner), ou au coucher ; la capsule molle n\'est pas gênée par le café (rec. 4, tableau 1).',
      best: (x) => x.time === 'jeun60' || x.time === 'coucher' || x.form === 'caps' },
    { id: 'coeliaque', icon: '🌾', title: 'Le ventre de Julie', who: 'Julie, 34 ans, 55 kg', cfg: { sex: 'F', age: 34, weight: 55, r: 0.08 },
      pre: 'Hashimoto. La dose a été augmentée trois fois en un an ; elle prend maintenant plus de 2 µg/kg/j et la TSH reste haute.',
      clue: 'Ballonnements, selles molles depuis des années, « c\'est le côlon irritable ». Elle est fatiguée, a des aphtes. Sa sœur a un diabète de type 1. Elle prend son comprimé correctement, à jeun.',
      meds: ['Lévothyroxine (à jeun, 30 min avant le petit-déjeuner)'],
      comorb: { name: 'maladie cœliaque', loss: 0.4, liquidFix: 0.85, cure: 'ssg', tau: 75 },
      ago: 0, habit: 'jeun30', doseMul: 1.3,
      tests: { ttg: 'anticorps anti-transglutaminase IgA 180 U/mL (N < 10), IgA totales normales : biopsies duodénales = atrophie villositaire totale', fer: 'ferritine 6 µg/L, anémie microcytaire', b12: 'folates bas, vitamine B12 normale', hp: 'test respiratoire négatif' },
      key: 'Maladie cœliaque (plus fréquente en cas d\'auto-immunité thyroïdienne) : atrophie villositaire, besoins jusqu\'à + 49 %. Conduite ETA : régime sans gluten, qui normalise les besoins ; il faut alors redescendre la dose, sinon surdosage (rec. 15, tableau 3).',
      best: (x) => x.cause === 'ssg' },
    { id: 'hp', icon: '🦠', title: 'Les crampes d\'estomac', who: 'Mme Morel, 62 ans, 68 kg', cfg: { sex: 'F', age: 62, weight: 68, r: 0.1 },
      pre: 'Hashimoto. Besoins en hausse depuis deux ans, près de 2 µg/kg/j, TSH encore haute.',
      clue: 'Épigastralgies, satiété précoce. Elle a été traitée par IPP « par périodes ». Pas de médicament en cours. Origine : née au Portugal, a vécu au Maroc.',
      meds: ['Lévothyroxine (à jeun, 30 min avant le petit-déjeuner)'],
      comorb: { name: 'gastrite à Helicobacter pylori', loss: 0.3, liquidFix: 0.3, cure: 'hp', tau: 40 },
      ago: 0, habit: 'jeun30', doseMul: 1.15,
      tests: { hp: 'test respiratoire à l\'urée positif ; gastroscopie : gastrite chronique active à H. pylori', b12: 'vitamine B12 normale, anticorps anti-cellules pariétales négatifs', ttg: 'anticorps anti-transglutaminase négatifs', fer: 'ferritine 18 µg/L' },
      key: 'Gastrite à H. pylori : alcalinisation du suc gastrique, dissolution du comprimé réduite. Conduite ETA : éradication (les besoins baissent ensuite : contrôler la TSH et réduire la dose) ; forme liquide ou capsule molle en attendant (rec. 15-16c, tableau 3).',
      best: (x) => x.cause === 'hp' || x.form !== 'cp' },
    { id: 'bypass', icon: '🩹', title: 'Après le bypass', who: 'M. Petit, 48 ans, 96 kg', cfg: { sex: 'M', age: 48, weight: 96, r: 0 },
      pre: 'Thyroïdectomie totale (goitre) il y a 10 ans, stable. Bypass gastrique il y a un an (138 → 96 kg) ; depuis, TSH entre 10 et 15 malgré des doses croissantes.',
      clue: 'Il prend son comprimé à jeun, correctement. Petits repas fractionnés, compléments vitaminiques le soir. Diarrhées fréquentes.',
      meds: ['Lévothyroxine (à jeun, 30 min avant le petit-déjeuner)', 'Multivitamines, fer et calcium le soir'],
      comorb: { name: 'bypass gastrique (montage malabsorptif)', loss: 0.42, liquidFix: 0.3, cure: null },
      ago: 0, habit: 'jeun30', doseMul: 1.25,
      tests: { fer: 'ferritine 12 µg/L', b12: 'vitamine B12 basse (substitution à renforcer)', ttg: 'anticorps anti-transglutaminase négatifs', hp: 'non réalisable (estomac exclu)' },
      key: 'Chirurgie bariatrique : brassage, pH et vidange modifiés ; dans les montages malabsorptifs, les besoins peuvent tripler. Conduite ETA : forme liquide en première intention (rec. 16b-c), adapter la dose au poids qui baisse, TSH rapprochée.',
      best: (x) => x.form === 'liq' || x.form === 'caps' },
    { id: 'pilule', icon: '🌸', title: 'La nouvelle pilule', who: 'Camille, 26 ans, 60 kg', cfg: { sex: 'F', age: 26, weight: 60, r: 0 },
      pre: 'Thyroïdectomie totale pour maladie de Basedow il y a 3 ans, lévothyroxine stable. TSH à 6,5 ce trimestre, asthénie.',
      clue: 'Elle a commencé une pilule œstroprogestative il y a 4 mois. Prise correcte de la lévothyroxine, à jeun, sans autre médicament.',
      meds: ['Lévothyroxine (à jeun)', 'Éthinylestradiol + lévonorgestrel depuis 4 mois'],
      need: { name: 'œstrogènes (TBG augmentée)', N: 1.25, stoppable: false },
      ago: 120, habit: 'jeun30',
      tests: { ttg: 'anticorps anti-transglutaminase négatifs', fer: 'ferritine 60 µg/L', b12: 'vitamine B12 normale', hp: 'test respiratoire négatif', absorp: 'test d\'absorption normal (T4L 15 → 38 pmol/L à 2 h)' },
      key: 'Œstrogènes oraux : la TBG augmente, une partie de la T4 est captée, les besoins augmentent (comme en début de grossesse). Ce n\'est pas un problème d\'absorption : ni l\'espacement ni la forme liquide n\'y changent rien. Conduite ETA : augmenter la dose, TSH à 6 semaines ; la réduire si la pilule est arrêtée (tableau 2). Grossesse : + 25 à 30 % dès le diagnostic.',
      best: (x) => x.doseUp },
    { id: 'carba', icon: '🧠', title: 'L\'antiépileptique', who: 'M. Faure, 55 ans, 75 kg', cfg: { sex: 'M', age: 55, weight: 75, r: 0 },
      pre: 'Thyroïdectomie totale (cancer) il y a 4 ans, stable. Crise d\'épilepsie il y a 3 mois (méningiome opéré). TSH à 11.',
      clue: 'Le neurologue a débuté la carbamazépine il y a 3 mois et ne souhaite pas la changer. Prise correcte de la lévothyroxine.',
      meds: ['Lévothyroxine (à jeun)', 'Carbamazépine LP 400 mg × 2 depuis 3 mois'],
      need: { name: 'carbamazépine (métabolisme de la T4 accéléré)', N: 1.3, stoppable: false },
      ago: 90, habit: 'jeun30',
      tests: { ttg: 'anticorps anti-transglutaminase négatifs', fer: 'ferritine 110 µg/L', b12: 'vitamine B12 normale', hp: 'test respiratoire négatif', absorp: 'test d\'absorption normal (T4L 13 → 35 pmol/L à 2 h)' },
      key: 'Carbamazépine, phénytoïne, rifampicine : induction enzymatique, la T4 est éliminée plus vite. L\'espacement et la forme liquide n\'y changent rien. Conduite ETA : augmenter la dose, surtout chez le thyroïdectomisé, TSH à 6 semaines ; la réduire si l\'inducteur est arrêté (tableau 2).',
      best: (x) => x.doseUp },
    { id: 'pseudo', icon: '🎭', title: 'Le pilulier plein', who: 'Kevin, 31 ans, 90 kg', cfg: { sex: 'M', age: 31, weight: 90, r: 0.05 },
      pre: 'Hashimoto. Lévothyroxine montée à plus de 2 µg/kg/j, TSH très élevée. « Je le prends tous les jours, je vous jure. »',
      clue: 'Aucun médicament, aucun trouble digestif. Il vit seul depuis une rupture, a perdu son travail. Sa mère, venue avec lui, glisse que « les boîtes s\'accumulent dans le placard ».',
      meds: ['Lévothyroxine (selon lui, tous les matins à jeun)'],
      pseudo: 0.4,
      ago: 0, habit: 'jeun30', doseMul: 1.5,
      tests: { ttg: 'anticorps anti-transglutaminase négatifs', fer: 'ferritine 120 µg/L', b12: 'vitamine B12 normale', hp: 'test respiratoire négatif', absorp: 'test d\'absorption : 1 000 µg de LT4 pris devant l\'infirmière ; T4L 6 → 34 pmol/L à 2 h et 39 à 4 h : absorption normale → pseudo-malabsorption' },
      key: 'Pseudo-malabsorption : la non-prise est la cause la plus fréquente de « résistance » à la lévothyroxine. Conduite ETA : au-delà de 1,5–1,7 µg/kg/j, rechercher l\'inobservance (rec. 2a) ; test d\'absorption chez les patients réfractaires (rec. 2b) ; prise hebdomadaire supervisée (7 fois la dose quotidienne, une fois par semaine) et prise en charge psychologique, puis dose ramenée à environ 1,6 µg/kg/j.',
      best: (x) => x.weekly }
  ];

  // Fraction absorbée du jour, selon l'histoire et les choix en cours (x).
  function absOf(story, x, day) {
    let f = TIMES[x.time || story.habit][1];
    if (x.form !== 'cp') f = Math.max(f, x.form === 'caps' ? 0.97 : 0.93); // forme non comprimée : moins sensible au moment et au café
    const d = story.drug;
    if (d && day >= -story.ago) {
      let loss = d.loss;
      if (x.stop && d.stoppable) loss = 0;
      else { if (x.space) loss *= d.spaceResid; if (x.form !== 'cp') loss *= d.liquidFix; }
      f *= 1 - loss;
    }
    const c = story.comorb;
    if (c) {
      let loss = c.loss;
      if (c.cure && x.cause === c.cure && x.causeDay != null) loss *= Math.exp(-Math.max(0, day - x.causeDay) / c.tau);
      if (x.form !== 'cp') loss *= c.liquidFix;
      f *= 1 - loss;
    }
    if (story.pseudo) f *= x.weekly ? 0.96 : story.pseudo;
    return f;
  }
  function needOf(story, x, day) {
    const n = story.need;
    return n && day >= -story.ago && !(x.stop && n.stoppable) ? n.N : 1;
  }

  const TESTS = [['ttg', 'Anti-transglutaminase'], ['fer', 'Ferritine'], ['b12', 'B12, anti-cellules pariétales'], ['hp', 'Recherche d\'H. pylori'], ['absorp', 'Test d\'absorption LT4']];
  function qual(story, k) { return story.tests[k] || 'normal'; }

  // Débriefing : la cause, les choix, la conduite recommandée.
  function debrief(G) {
    const H = G.hard, s = H.s, x = H.cur, tshs = G.history.filter((e) => !e.prescription && e.labs.tsh != null).map((e) => e.labs.tsh);
    const over = tshs.some((v) => v < 0.1);
    const months = Math.round(G.pt.day / 30.4);
    const ok = [
      [H.asked, 'Interrogatoire (médicaments, prise, habitudes)', 'L\'ETA recommande un interrogatoire approfondi sur les médicaments et les habitudes avant d\'augmenter la dose (rec. 5 et 8).'],
      [!!s.best(Object.assign({}, x, { doseUp: H.doseUp })), 'Conduite adaptée à la cause', s.key],
      [!over, 'Pas de surdosage en chemin', 'TSH < 0,1 : la correction de la cause (régime, éradication, observance) diminue les besoins, il faut redescendre la dose.'],
      [H.exams.size <= 3, 'Examens ciblés', 'Le bilan des comorbidités se fait en fonction de l\'interrogatoire (rec. 15).']
    ];
    return { ok, months, n: tshs.length, over };
  }

  S.lt4hard = { STORIES, TIMES, FORMS, CAUSES, TESTS, absOf, needOf, qual, debrief };
})();
