/*
 * Mode histoire du diabète de type 2 : quatre vies de patients, chapitre par chapitre, sur des décennies.
 * Chaque chapitre : un âge, un récit, des changements (comorbidités, fonction rénale, statut gériatrique,
 * réserve insulinique), un objectif et des critères d'évaluation de l'ordonnance en fin de chapitre
 * (repères : SFD 2025, item 247, fiche LiSA). Le moteur (dt2.js) fait passer le temps entre deux chapitres,
 * traitement en cours, titration comprise.
 */
(function () {
  'use strict';
  const S = window.HV.simu;
  const ins = (rx) => (rx.basal || 0) + (rx.pump || 0) + (rx.rapid || 0);
  const glp = (rx) => rx.glp && rx.glp !== 'none';
  const sglt = (rx) => rx.sglt2 && rx.sglt2 !== 'none';
  const life = (rx) => rx.act >= 150 || rx.diet || rx.sodaStop || rx.wtGoal > 0;
  const noHypo = (x) => x.sev === 0 && x.hypo <= 2;

  // Critère : [vérification, libellé, explication (affichée en cas d'écart), référence].
  const STORIES = [
    {
      id: 'jm', name: 'Jean-Michel', who: 'Jean-Michel, 45 ans, commercial', icon: '👔',
      pitch: 'De la découverte fortuite à l\'entrée en EHPAD, à 90 ans : 45 ans de diabète, un infarctus, une chute, la dépendance.',
      cfg: { sex: 'M', age: 45, weight: 96, height: 176, a1c: 7.9, duration: 0, dfg: 95, profile: 'sird', sbp: 145, act0: 0, soda0: 2, snack0: 'important', motiv: 'moyenne', stage: 'diag', rx0: null },
      chapters: [
        { age: 45, title: 'La découverte', text: 'Médecine du travail : glycémie à jeun 1,52 g/L à deux reprises, HbA1c 7,9 %. Jean-Michel déjeune au restaurant tous les midis, boit deux sodas par jour et ne fait aucun sport. « Le diabète ? Mon père en avait, il a fini amputé. »',
          goal: 'Annoncer le diagnostic, fixer la cible, mettre en place les règles hygiéno-diététiques et le traitement de première intention.',
          checks: [[(x) => x.rx.met > 0, 'Metformine en première intention', 'Monothérapie de première ligne : metformine, augmentée par paliers (troubles digestifs).', 'item 247 · avis 6'],
            [(x) => life(x.rx), 'Règles hygiéno-diététiques', 'Activité physique ≥ 150 min/sem, arrêt des sodas, suivi diététique : à prescrire dès le diagnostic.', 'item 247'],
            [(x) => !(x.rx.su > 0) && ins(x.rx) === 0, 'Pas d\'insulinosécréteur ni d\'insuline d\'emblée', 'HbA1c 7,9 % sans signe de carence : pas d\'indication au sulfamide ni à l\'insuline.', 'avis 6']] },
        { age: 52, title: 'L\'échappement', text: 'Sept ans plus tard. Jean-Michel a repris 6 kg, l\'HbA1c remonte. PA 150/90, LDL 1,9 g/L, tabac sevré depuis peu : risque cardiovasculaire élevé.',
          apply: (P) => { P.set('hcvr', true); P.weight(6); },
          goal: 'Intensifier en choisissant la seconde molécule selon le profil (IMC > 30, risque cardiovasculaire élevé).',
          checks: [[(x) => x.rx.met > 0, 'Metformine poursuivie', 'La metformine est poursuivie en association (sauf contre-indication).', 'avis 7'],
            [(x) => glp(x.rx) || sglt(x.rx), 'aGLP1 ou iSGLT2 en bithérapie', 'Risque CV élevé, obésité : aGLP1 ou iSGLT2 privilégiés en deuxième ligne.', 'avis 9 et 11'],
            [(x) => !(x.rx.su > 0), 'Pas de sulfamide', 'Le sulfamide n\'est pas un choix privilégié (hypoglycémies, prise de poids).', 'avis 10']] },
        { age: 58, title: 'L\'infarctus', text: 'Douleur thoracique au volant : infarctus antérieur, stent. Échographie : FEVG 45 %, dyspnée d\'effort. Le cardiologue vous demande votre avis sur le traitement du diabète.',
          apply: (P) => { P.set('cvd', true); P.set('hfail', true); },
          goal: 'Adapter le traitement à la maladie cardiovasculaire avérée et à l\'insuffisance cardiaque.',
          checks: [[(x) => sglt(x.rx), 'iSGLT2 (insuffisance cardiaque)', 'Insuffisance cardiaque : iSGLT2 indiqué quel que soit l\'équilibre glycémique.', 'avis 13'],
            [(x) => glp(x.rx) || sglt(x.rx), 'Molécule à bénéfice cardiovasculaire démontré', 'Maladie athéromateuse avérée : aGLP1 ou iSGLT2 à bénéfice démontré, indépendamment de l\'HbA1c.', 'avis 11'],
            [(x) => !(x.rx.su > 0), 'Pas de sulfamide', 'Hypoglycémies délétères chez le coronarien.', 'avis 10']] },
        { age: 66, title: 'La retraite', text: 'Jean-Michel est veuf depuis l\'an dernier. Il jardine, mange seul, souvent des plats préparés. HbA1c à 9,2 % malgré une trithérapie bien prise ; il a maigri de 3 kg sans le vouloir.',
          apply: (P) => { P.beta(0.45); P.weight(-3); },
          goal: 'Passer à l\'insuline basale au bon moment, avec une titration et une surveillance adaptées.',
          checks: [[(x) => (x.rx.basal || 0) + (x.rx.pump || 0) > 0, 'Insuline basale', 'Échec d\'une trithérapie et amaigrissement : insuline basale (0,1 à 0,2 U/kg), titrée sur la glycémie à jeun.', 'avis 18'],
            [(x) => x.titr && x.titr.who !== 'none', 'Titration organisée', 'Sans titration, la dose de départ ne sert presque à rien.', 'avis 18'],
            [(x) => glp(x.rx) || sglt(x.rx), 'aGLP1 ou iSGLT2 conservés', 'Les traitements à bénéfice cardiovasculaire sont poursuivis sous insuline.', 'avis 18 ter'],
            [(x) => !(x.rx.su > 0), 'Sulfamide arrêté sous insuline', 'Sulfamide + insuline : hypoglycémies.', 'avis 18 ter']] },
        { age: 76, title: 'La chute', text: 'Chute dans l\'escalier à 4 h du matin, glycémie 0,52 g/L au SAMU. DFG 42. Il oublie parfois ses repas, vit seul. Évaluation gériatrique : personne âgée fragile.',
          apply: (P) => { P.set('geria', 'fragile'); P.dfg(42); P.set('irregular', true); P.hypos(2); },
          goal: 'Désescalader : relâcher la cible (HbA1c ≤ 8 %), supprimer les hypoglycémies, adapter les doses au DFG.',
          checks: [[(x) => x.rx.met <= 1000, 'Metformine ≤ 1 g/j (DFG 30–44)', 'DFG entre 30 et 44 : 1 g/j de metformine au plus.', 'avis 12 bis'],
            [(x) => !(x.rx.su > 0), 'Pas d\'insulinosécréteur', 'Personne âgée fragile : éviter les sulfamides.', 'avis 21 bis'],
            [(x) => (x.rx.basal || 0) + (x.rx.pump || 0) <= x.rx0Basal || x.rx0Basal === 0, 'Insuline basale non augmentée', 'Hypoglycémie nocturne : baisser la basale (10 à 20 %) et en chercher la cause.', 'avis 18'],
            [(x) => noHypo(x), 'Pas de nouvelle hypoglycémie sévère', 'L\'objectif prioritaire est la sécurité.', 'avis 21 bis']] },
        { age: 84, title: 'La dépendance', text: 'Troubles cognitifs, aide à domicile, infirmière deux fois par jour. DFG 28. Il a perdu 8 kg en un an, mange peu.',
          apply: (P) => { P.set('geria', 'dependant'); P.dfg(28); P.weight(-8); },
          goal: 'Simplifier : pas de metformine sous 30 mL/min, pas de sulfamide, schéma d\'insuline compatible avec le passage infirmier.',
          checks: [[(x) => !(x.rx.met > 0), 'Metformine arrêtée (DFG < 30)', 'Contre-indiquée sous 30 mL/min : risque d\'acidose lactique.', 'avis 12 bis'],
            [(x) => !(x.rx.su > 0), 'Pas de sulfamide', 'Jamais de sulfamide chez la personne âgée dépendante.', 'avis 21 bis'],
            [(x) => !(x.rx.rapid > 0), 'Pas de basal-bolus', 'Schéma simple, une injection par l\'infirmière ; pas de bolus chez un patient qui mange peu.', 'avis 21 bis'],
            [(x) => !glp(x.rx), 'aGLP1 arrêté (amaigrissement)', 'Dénutrition : l\'effet anorexigène de l\'aGLP1 devient délétère.', 'avis 21 bis']] },
        { age: 90, title: 'L\'EHPAD', text: 'Entrée en EHPAD. Il mange la moitié de ses plateaux. L\'équipe demande « des objectifs raisonnables ».',
          apply: (P) => { P.weight(-3); },
          goal: 'Objectifs : pas d\'hypoglycémie, pas d\'hyperglycémie symptomatique (glycémies 1 à 2 g/L ; HbA1c < 9 %).',
          checks: [[(x) => noHypo(x), 'Pas d\'hypoglycémie', 'Chez la personne âgée dépendante, l\'hypoglycémie tue plus que l\'hyperglycémie modérée.', 'avis 21 bis'],
            [(x) => !(x.rx.su > 0) && !(x.rx.met > 0) && !(x.rx.rapid > 0), 'Ordonnance allégée', 'Au plus une basale le matin (ou un iDPP4 à dose rénale), rien d\'autre.', 'avis 21 bis'],
            [(x) => x.a1c == null || x.a1c < 9, 'HbA1c < 9 %', 'Éviter les hyperglycémies symptomatiques (polyurie, déshydratation, coma hyperosmolaire).', 'avis 21 bis']] }
      ],
      end: { good: 'Jean-Michel est mort à 93 ans, d\'une pneumopathie, sans avoir été amputé. Son fils dit que « le diabète, finalement, ça se soigne ».', mid: 'Jean-Michel a vécu jusqu\'à 90 ans, entre quelques hospitalisations évitables.', bad: 'Jean-Michel a enchaîné les complications. Il était pourtant arrivé avec une HbA1c à 7,9 %.' }
    },
    {
      id: 'fatima', name: 'Fatima', who: 'Fatima, 50 ans, mère de quatre enfants', icon: '🌙',
      pitch: 'Le ramadan, la rétinopathie, les reins, puis l\'insuline : 25 ans de vie à accorder avec ses choix.',
      cfg: { sex: 'F', age: 50, weight: 84, height: 160, a1c: 8.4, duration: 0, dfg: 92, profile: 'sird', ethnic: 'magh', sbp: 138, act0: 30, soda0: 1, snack0: 'modere', motiv: 'forte', stage: 'diag', rx0: null },
      chapters: [
        { age: 50, title: 'Avant le ramadan', text: 'Diabète découvert (HbA1c 8,4 %) trois mois avant le ramadan, que Fatima tient à faire. « Je jeûne depuis l\'âge de 12 ans, docteur. »',
          goal: 'Traiter sans exposer au risque d\'hypoglycémie pendant le jeûne ; éducation (horaires des prises, surveillance).',
          checks: [[(x) => x.rx.met > 0, 'Metformine', 'Metformine : sans risque d\'hypoglycémie, prise au repas de rupture du jeûne et au shour.', 'item 247 · IDF-DAR'],
            [(x) => !(x.rx.su > 0) || x.rx.suType === 'repa', 'Pas de sulfamide pendant le jeûne', 'Sulfamides : hypoglycémies pendant le jeûne (le répaglinide, pris au repas, est moins à risque).', 'IDF-DAR 2021'],
            [(x) => life(x.rx), 'Règles hygiéno-diététiques', 'Activité, alimentation : à négocier avec les habitudes familiales.', 'item 247']] },
        { age: 57, title: 'Les yeux', text: 'Sept ans sans consultation. HbA1c 9,8 %. Fond d\'œil : rétinopathie non proliférante sévère. Fatima veut « tout faire d\'un coup » pour rattraper.',
          apply: (P) => { P.set('retino', 'severe'); P.beta(0.7); },
          goal: 'Intensifier sans faire chuter l\'HbA1c trop vite (aggravation de la rétinopathie) : fond d\'œil, laser si besoin, baisse progressive.',
          checks: [[(x) => x.fo || x.ppr, 'Fond d\'œil / ophtalmologue avant d\'intensifier', 'Rétinopathie sévère : avis ophtalmologique (photocoagulation) avant une baisse rapide.', 'avis 8 bis'],
            [(x) => glp(x.rx) || sglt(x.rx) || ins(x.rx) > 0 || x.rx.dpp4 > 0, 'Intensification', 'HbA1c 9,8 % : une bithérapie au moins.', 'avis 7'],
            [(x) => !x.retinoEvent, 'Pas d\'aggravation de la rétinopathie', 'Baisse de l\'HbA1c ≥ 1,5–2 points en 3 mois sur rétinopathie sévère : hémorragie possible.', 'avis 8 bis']] },
        { age: 64, title: 'Les reins', text: 'DFG 48 mL/min, albuminurie 450 mg/g. PA 150/85 sous IEC.',
          apply: (P) => { P.dfg(48); P.set('alb', 'macro'); },
          goal: 'Néphroprotection et adaptation des doses à la fonction rénale.',
          checks: [[(x) => sglt(x.rx), 'iSGLT2 (néphroprotection)', 'Maladie rénale chronique avec albuminurie : iSGLT2 indiqué (bénéfice rénal jusqu\'à un DFG de 20–25).', 'avis 12'],
            [(x) => x.rx.met <= 2000, 'Metformine ≤ 2 g/j (DFG 45–59)', 'DFG entre 45 et 59 : 2 g/j au plus.', 'avis 12 bis'],
            [(x) => !(x.rx.su > 0) || x.rx.suType !== 'glib', 'Pas de glibenclamide', 'Glibenclamide à éviter si DFG < 60.', 'RCP']] },
        { age: 72, title: 'Le ramadan sous insuline', text: 'Sous insuline basale depuis deux ans (HbA1c 8,2 %). Fatima veut encore jeûner. Sa fille est inquiète.',
          apply: (P) => { P.beta(0.6); P.ensureBasal(0.3); },
          goal: 'Si le jeûne est maintenu : basale réduite de 20 à 30 %, injection au repas de rupture, autosurveillance, règles de rupture du jeûne.',
          checks: [[(x) => (x.rx.basal || 0) + (x.rx.pump || 0) <= x.rx0Basal * 0.85, 'Basale réduite (– 15 à 30 %)', 'Pendant le jeûne : réduire la basale de 20 à 30 % pour éviter les hypoglycémies diurnes.', 'IDF-DAR 2021'],
            [(x) => !(x.rx.su > 0), 'Pas de sulfamide', 'Sulfamide + insuline + jeûne : hypoglycémies.', 'avis 18 ter'],
            [(x) => x.cgm || (x.asg && x.asg !== '0'), 'Surveillance glycémique', 'Autosurveillance ou capteur pendant le jeûne ; rompre le jeûne si < 0,70 ou > 3 g/L.', 'IDF-DAR 2021']] }
      ],
      end: { good: 'Fatima a jeûné jusqu\'à 74 ans, sans hypoglycémie, et voit encore assez pour lire le Coran à ses petits-enfants.', mid: 'Fatima a gardé sa vue, mais ses reins ont continué à décliner.', bad: 'Fatima a perdu la vue de l\'œil droit et commence la dialyse.' }
    },
    {
      id: 'kevin', name: 'Kevin', who: 'Kevin, 34 ans, chauffeur poids lourd de nuit', icon: '🚚',
      pitch: 'IMC 39, horaires décalés, permis en jeu : l\'obésité au premier plan, puis l\'insulinopénie.',
      cfg: { sex: 'M', age: 34, weight: 128, height: 180, a1c: 9.8, duration: 0, dfg: 110, profile: 'sird', sbp: 142, act0: 0, soda0: 6, snack0: 'important', motiv: 'faible', adh: 'moyenne', work: 'nuit', driver: true, stage: 'diag', rx0: null },
      chapters: [
        { age: 34, title: 'Le permis en jeu', text: 'Polyurie, soif, HbA1c 9,8 %, pas de cétose. IMC 39,5. Kevin conduit de nuit un 38 tonnes : « Si je perds mon permis, je perds tout. » Six cannettes de soda par nuit.',
          goal: 'Traiter sans hypoglycémie (conduite professionnelle), cibler le poids, réduire les boissons sucrées.',
          checks: [[(x) => x.rx.met > 0, 'Metformine', 'Première ligne, sans hypoglycémie.', 'item 247'],
            [(x) => !(x.rx.su > 0), 'Pas de sulfamide', 'Conducteur professionnel : les insulinosécréteurs exposent à l\'hypoglycémie au volant.', 'avis 16'],
            [(x) => x.rx.sodaStop, 'Arrêt des boissons sucrées', 'Six cannettes, c\'est 200 g de sucre par jour.', 'item 247'],
            [(x) => glp(x.rx), 'aGLP1 ou tirzépatide (IMC ≥ 35)', 'Obésité sévère : aGLP1 (ou tirzépatide) dès la bithérapie, voire d\'emblée.', 'avis 9']] },
        { age: 38, title: 'Le yoyo', text: 'Kevin a perdu 14 kg, puis en a repris 9 après un changement de tournée. Apnée du sommeil appareillée. Il parle de chirurgie bariatrique.',
          apply: (P) => { P.weight(-5); },
          goal: 'Maintenir la perte de poids (aGLP1 au palier efficace, voire tirzépatide) ; la chirurgie se discute en RCP (IMC ≥ 35 avec comorbidité).',
          checks: [[(x) => glp(x.rx), 'Incrétine conservée ou majorée', 'L\'arrêt de l\'aGLP1 fait reprendre le poids.', 'avis 9'],
            [(x) => !(x.rx.su > 0) && !(ins(x.rx) > 0), 'Toujours pas d\'hypoglycémiant', 'Le permis passe par l\'absence d\'hypoglycémie.', 'avis 16'],
            [(x) => x.rx.act >= 150 || x.rx.diet, 'Activité ou suivi diététique', 'Le poids se maintient avec l\'activité et l\'accompagnement.', 'item 253']] },
        { age: 46, title: 'L\'insulinopénie', text: 'HbA1c 10,6 %, amaigrissement de 7 kg en deux mois, polyurie nocturne, cétonurie à une croix. Peptide C bas.',
          apply: (P) => { P.beta(0.25); P.weight(-7); },
          goal: 'Reconnaître la carence insulinique : insuline basale, capteur, information sur la conduite.',
          checks: [[(x) => ins(x.rx) > 0, 'Insuline', 'Syndrome cardinal et cétose : insuline sans attendre.', 'avis 18'],
            [(x) => x.cgm, 'Capteur de glucose', 'Insuline et conduite professionnelle : capteur, contrôle avant de prendre le volant.', 'avis 18 · arrêté permis'],
            [(x) => !(x.rx.su > 0), 'Pas de sulfamide', 'Réserve β épuisée : inefficace et hypoglycémiant sous insuline.', 'avis 18 ter']] }
      ],
      end: { good: 'Kevin a gardé son permis jusqu\'à la retraite et emmène ses enfants au foot le dimanche.', mid: 'Kevin a dû changer de poste, mais va mieux.', bad: 'Kevin a perdu son permis après un malaise au volant.' }
    },
    {
      id: 'simone', name: 'Simone', who: 'Simone, 74 ans, veuve, vit seule', icon: '🧶',
      pitch: 'Daonil depuis dix ans, malaises à 16 h, chutes : la désescalade, la fracture, puis les soins de confort.',
      cfg: { sex: 'F', age: 74, weight: 58, height: 155, a1c: 6.4, duration: 15, dfg: 52, profile: 'mard', sbp: 132, act0: 30, soda0: 0, snack0: 'aucun', motiv: 'moyenne', irregular: true, geria: 'fragile', stage: null, rx0: { met: 1700, su: 80, suType: 'glib' } },
      chapters: [
        { age: 74, title: 'Les malaises de l\'après-midi', text: 'Simone prend metformine 850 mg × 2 et Daonil® 5 mg × 2, prescrits par son ancien médecin. Elle fait des « malaises » vers 16 h (sueurs, tremblements) et a chuté deux fois. HbA1c 6,4 %. « Mon ancien docteur disait que j\'étais une élève modèle. »',
          goal: 'Reconnaître le surtraitement : arrêter le glibenclamide, relâcher la cible (personne âgée fragile : HbA1c ≤ 8 %).',
          checks: [[(x) => !(x.rx.su > 0) || x.rx.suType === 'repa', 'Glibenclamide arrêté', 'Glibenclamide chez une personne âgée à DFG 52 avec hypoglycémies : à arrêter.', 'avis 21 bis · RCP'],
            [(x) => x.rx.met <= 2000, 'Metformine adaptée (DFG 45–59)', '2 g/j au plus.', 'avis 12 bis'],
            [(x) => noHypo(x), 'Plus de malaise', 'HbA1c 6,4 % sous sulfamide chez une personne âgée fragile : c\'est un surtraitement.', 'avis 21 bis']] },
        { age: 79, title: 'La fracture', text: 'Fracture du col du fémur, trois semaines d\'hospitalisation, perte d\'autonomie : Simone est désormais dépendante. DFG 38. Elle mange irrégulièrement.',
          apply: (P) => { P.set('geria', 'dependant'); P.dfg(38); P.weight(-4); },
          goal: 'Adapter à la dépendance et au DFG : pas de sulfamide, metformine ≤ 1 g/j, prudence avec les traitements déshydratants.',
          checks: [[(x) => x.rx.met <= 1000, 'Metformine ≤ 1 g/j', 'DFG 30–44 : 1 g/j au plus.', 'avis 12 bis'],
            [(x) => !(x.rx.su > 0), 'Pas d\'insulinosécréteur', 'Jamais de sulfamide chez la personne âgée dépendante.', 'avis 21 bis'],
            [(x) => !sglt(x.rx), 'Pas d\'iSGLT2 (déshydratation)', 'Personne âgée dépendante qui boit peu : risque de déshydratation sous iSGLT2.', 'avis 21 bis']] },
        { age: 86, title: 'Le confort', text: 'Simone est en soins palliatifs à domicile, mange quelques cuillères, dort beaucoup. Sa fille demande s\'il faut « continuer les piqûres au doigt ».',
          apply: (P) => { P.weight(-5); P.dfg(26); },
          goal: 'Déprescrire : objectif de confort (glycémies < 2,5–3 g/L, pas d\'hypoglycémie), arrêter la surveillance inutile.',
          checks: [[(x) => !(x.rx.met > 0) && !(x.rx.su > 0) && !glp(x.rx) && !sglt(x.rx), 'Antidiabétiques oraux et injectables arrêtés', 'En fin de vie, seuls restent les traitements de confort ; une petite basale seulement si hyperglycémie symptomatique.', 'avis 21 bis'],
            [(x) => !x.asg || x.asg === '0' || x.asg === 'w4', 'Surveillance allégée', 'Les glycémies capillaires répétées n\'apportent plus rien.', 'avis 21 bis']] }
      ],
      end: { good: 'Simone n\'a plus jamais fait de malaise. Elle tricotait encore à 85 ans.', mid: 'Simone a passé ses dernières années à la maison, avec quelques hospitalisations.', bad: 'Simone a refait des hypoglycémies et des chutes jusqu\'au bout.' }
    }
  ];

  function picker(o) {
    const { h, cfg, start } = o;
    return h('section', { class: 'sv-card sv-stories', id: 'dtStories' }, [
      h('h3', null, 'Choisissez une histoire'),
      h('div', { class: 'sv-storygrid' }, STORIES.map((st) => h('button', { type: 'button', class: 'sv-story', id: 'dtStory-' + st.id, onclick: () => start(st) }, [
        h('span', { class: 'sv-game-ic', 'aria-hidden': 'true' }, st.icon), h('strong', null, st.who), h('span', null, st.pitch),
        h('span', { class: 'sv-story-ch' }, st.chapters.length + ' chapitres · de ' + st.chapters[0].age + ' à ' + st.chapters[st.chapters.length - 1].age + ' ans')]))),
      h('p', { class: 'sv-note' }, 'À chaque chapitre : un récit, un objectif, autant de consultations que vous voulez ; « Chapitre suivant » évalue votre ordonnance, puis le temps passe (traitement et titration en cours). Niveau et humour réglés ci-dessus' + (cfg.level === 'externe' ? ' (niveau externe : options limitées à l\'item 247).' : '.'))
    ]);
  }

  S.dt2story = { STORIES, picker };
})();
