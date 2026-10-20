/*
 * Référentiel d'effets des traitements du DT2 utilisé pour caler le patient virtuel.
 * Chaque entrée : traitement, situation, effet publié, source (avec lien) et, quand le repère est
 * reproductible par le modèle, l'essai virtuel qui le rejoue (calib : bras traité contre bras témoin
 * sans changement, patient théorique, observance bonne). tools/calib-dt2.js vérifie l'écart.
 * verif : 'primaire' = chiffre lu dans le résumé de l'article ; 'secondaire' = chiffre repris d'une
 * revue ou d'un résumé de congrès, à confirmer sur le texte intégral.
 * Métriques : dA = différence d'HbA1c contre témoin ; raw = variation d'HbA1c depuis l'inclusion ;
 * abs = HbA1c finale ; dW = différence de poids (kg) contre témoin ; slope = surcroît de baisse par point
 * d'HbA1c initiale ; diff = effet de rx moins effet de rx2.
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const S = (HV.simu = HV.simu || {});
  const ON_MET = { met: 2000 };

  S.dt2ref = [
    // ——— Facteur prédictif transversal ———
    { id: 'base-a1c', cls: 'Tous', situation: 'HbA1c initiale', effet: '+ 1 point d\'HbA1c initiale = 0,5 point de baisse supplémentaire à 6 mois (61 essais, ADO).', source: 'Sherifali D et al. Diabetes Care 2010;33:1859', url: 'https://pubmed.ncbi.nlm.nih.gov/20484130/', verif: 'primaire',
      calib: { metric: 'slope', cfg: {}, a1cs: [7.5, 9.5], rx: { met: 2000 }, days: 182, target: -0.5, tol: 0.2 } },

    // ——— Metformine ———
    { id: 'met-mono', cls: 'Metformine', situation: 'Monothérapie contre placebo', effet: '− 1,12 % (35 essais). Doses plus fortes plus efficaces, sans plus de troubles digestifs.', source: 'Hirst JA et al. Diabetes Care 2012;35:446', url: 'https://pubmed.ncbi.nlm.nih.gov/22275444/', verif: 'primaire',
      calib: { cfg: { a1c: 8.4 }, rx: { met: 2000 }, days: 182, target: -1.12, tol: 0.2 } },
    { id: 'met-addon', cls: 'Metformine', situation: 'Ajout à un autre ADO', effet: '− 0,95 %.', source: 'Hirst JA et al. Diabetes Care 2012;35:446', url: 'https://pubmed.ncbi.nlm.nih.gov/22275444/', verif: 'primaire',
      calib: { cfg: { a1c: 8.5, rx0: { su: 120 } }, rx: { met: 2000 }, days: 182, target: -0.95, tol: 0.25 } },
    { id: 'met-ins', cls: 'Metformine', situation: 'Ajout à l\'insuline', effet: '− 0,60 %.', source: 'Hirst JA et al. Diabetes Care 2012;35:446', url: 'https://pubmed.ncbi.nlm.nih.gov/22275444/', verif: 'primaire',
      calib: { cfg: { a1c: 8.5, duration: 12, rx0: { basal: 45 } }, rx: { met: 2000 }, days: 182, target: -0.6, tol: 0.25 } },
    { id: 'met-500', cls: 'Metformine', situation: 'Dose-réponse : 500 mg/j (14 semaines, glycémie à jeun ≥ 1,80 g/L)', effet: '− 0,6 % contre placebo à 500 mg, jusqu\'à − 2,0 % à 2000 mg ; effet dose-dépendant.', source: 'Garber AJ et al. Am J Med 1997;103:491', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Garber+AJ+1997+metformin+dose-response', verif: 'primaire',
      calib: { cfg: { a1c: 9.5 }, rx: { met: 500 }, days: 98, target: -0.6, tol: 0.3 } },
    { id: 'met-2000', cls: 'Metformine', situation: 'Dose-réponse : 2000 mg/j (même essai)', effet: '− 2,0 % contre placebo (le bras placebo s\'aggravait après l\'arrêt des ADO : l\'écart surestime l\'effet propre).', source: 'Garber AJ et al. Am J Med 1997;103:491', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Garber+AJ+1997+metformin+dose-response', verif: 'primaire',
      calib: { cfg: { a1c: 9.5 }, rx: { met: 2000 }, days: 98, target: -1.6, tol: 0.4 } },

    // ——— Sulfamides ———
    { id: 'su-mono', cls: 'Sulfamide', situation: 'Monothérapie contre placebo', effet: '− 1,51 % (31 essais) ; hypoglycémies RR 2,41.', source: 'Hirst JA et al. Diabetologia 2013;56:973', url: 'https://link.springer.com/article/10.1007/s00125-013-2856-6', verif: 'primaire',
      calib: { cfg: { a1c: 8.7 }, rx: { su: 120 }, days: 182, target: -1.51, tol: 0.3 } },
    { id: 'su-dose', cls: 'Sulfamide', situation: 'Dose faible contre dose forte', effet: 'Les doses fortes n\'apportent pas de baisse d\'HbA1c supplémentaire (effet plateau), mais plus d\'hypoglycémies.', source: 'Hirst JA et al. Diabetologia 2013;56:973', url: 'https://link.springer.com/article/10.1007/s00125-013-2856-6', verif: 'primaire',
      calib: { metric: 'diff', cfg: { a1c: 8.7 }, rx: { su: 120 }, rx2: { su: 30 }, days: 182, target: -0.15, tol: 0.2 } },
    { id: 'su-ins', cls: 'Sulfamide', situation: 'Ajout à l\'insuline', effet: '− 0,46 %.', source: 'Hirst JA et al. Diabetologia 2013;56:973', url: 'https://link.springer.com/article/10.1007/s00125-013-2856-6', verif: 'primaire',
      calib: { cfg: { a1c: 8.8, duration: 10, rx0: { basal: 30 } }, rx: { su: 120 }, days: 182, target: -0.46, tol: 0.3 } },
    { id: 'su-addon', cls: 'Sulfamide', situation: 'Ajout à un ADO', effet: '− 1,62 %.', source: 'Hirst JA et al. Diabetologia 2013;56:973', url: 'https://link.springer.com/article/10.1007/s00125-013-2856-6', verif: 'primaire',
      calib: { cfg: { a1c: 8.7, rx0: ON_MET }, rx: { su: 120 }, days: 182, target: -1.4, tol: 0.35 } },

    // ——— iDPP4 ———
    { id: 'dpp4', cls: 'iDPP4', situation: 'Études à < 50 % de patients asiatiques', effet: '− 0,65 % (DMP contre placebo).', source: 'Kim YG et al. Diabetologia 2013;56:696', url: 'https://link.springer.com/article/10.1007/s00125-012-2827-3', verif: 'primaire',
      calib: { cfg: { a1c: 8.0, rx0: ON_MET }, rx: { dpp4: 100 }, days: 182, target: -0.65, tol: 0.2 } },
    { id: 'dpp4-asie', cls: 'iDPP4', situation: 'Études à ≥ 50 % de patients asiatiques', effet: '− 0,92 % ; l\'IMC initial plus bas est corrélé à une meilleure réponse.', source: 'Kim YG et al. Diabetologia 2013;56:696', url: 'https://link.springer.com/article/10.1007/s00125-012-2827-3', verif: 'primaire',
      calib: { cfg: { a1c: 8.0, ethnic: 'asie', weight: 70, height: 165, rx0: ON_MET }, rx: { dpp4: 100 }, days: 182, target: -0.92, tol: 0.2 } },

    // ——— aGLP1 ———
    { id: 'sema-1', cls: 'aGLP1', situation: 'Sémaglutide 1 mg/sem, monothérapie (SUSTAIN 1, HbA1c 8,1 %)', effet: '− 1,6 % contre < 0,1 % sous placebo ; poids − 4,5 kg contre − 1,0 kg.', source: 'Sorli C et al. Lancet Diabetes Endocrinol 2017;5:251', url: 'https://www.medwirenews.com/showcase/a-quick-guide-to-the-sustain-trials/', verif: 'secondaire',
      calib: { cfg: { a1c: 8.1 }, rx: { glp: 'sema', glpDose: 1 }, days: 210, target: -1.5, tol: 0.25 } },
    { id: 'sema-1-w', cls: 'aGLP1', situation: 'Sémaglutide 1 mg/sem : poids', effet: '− 3,5 kg de plus que le placebo à 30 semaines.', source: 'Sorli C et al. Lancet Diabetes Endocrinol 2017;5:251', url: 'https://www.medwirenews.com/showcase/a-quick-guide-to-the-sustain-trials/', verif: 'secondaire',
      calib: { metric: 'dW', cfg: { a1c: 8.1 }, rx: { glp: 'sema', glpDose: 1 }, days: 210, target: -3.5, tol: 1.5 } },
    { id: 'sema-05', cls: 'aGLP1', situation: 'Sémaglutide 0,5 mg/sem (SUSTAIN 1)', effet: '− 1,43 % contre placebo ; poids − 3,7 kg contre − 1,0 kg.', source: 'Sorli C et al. Lancet Diabetes Endocrinol 2017;5:251', url: 'https://cronfa.swansea.ac.uk/Record/cronfa31739', verif: 'primaire',
      calib: { cfg: { a1c: 8.1 }, rx: { glp: 'sema', glpDose: 0.5 }, days: 210, target: -1.43, tol: 0.25 } },
    { id: 'lira-18', cls: 'aGLP1', situation: 'Liraglutide 1,8 mg/j, monothérapie, 52 semaines (LEAD-3, HbA1c 8,3 %)', effet: '− 1,14 % depuis l\'inclusion (glimépiride 8 mg : − 0,51 %).', source: 'Garber A et al. Lancet 2009;373:473', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3084519', verif: 'primaire',
      calib: { metric: 'raw', cfg: { a1c: 8.3, duration: 3 }, rx: { glp: 'lira', glpDose: 1.8 }, days: 364, target: -1.14, tol: 0.3 } },
    { id: 'lira-12', cls: 'aGLP1', situation: 'Liraglutide 1,2 mg/j (LEAD-3)', effet: '− 0,84 % depuis l\'inclusion.', source: 'Garber A et al. Lancet 2009;373:473', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3084519', verif: 'primaire',
      calib: { metric: 'raw', cfg: { a1c: 8.3, duration: 3 }, rx: { glp: 'lira', glpDose: 1.2 }, days: 364, target: -0.84, tol: 0.3 } },
    { id: 'tirz-15', cls: 'AR GIP/GLP-1', situation: 'Tirzépatide 15 mg/sem en ajout à la metformine, 40 semaines (SURPASS-2, HbA1c 8,3 %)', effet: '− 2,30 % depuis l\'inclusion (5 mg − 2,01 ; 10 mg − 2,24 ; sémaglutide 1 mg − 1,86) ; poids − 11,2 kg (sémaglutide − 5,7 kg).', source: 'Frías JP et al. N Engl J Med 2021;385:503', url: 'https://acc.org/latest-in-cardiology/clinical-trials/2021/06/27/19/02/surpass-2', verif: 'secondaire',
      calib: { metric: 'raw', cfg: { a1c: 8.3, weight: 94, height: 170, rx0: ON_MET }, rx: { glp: 'tirz', glpDose: 15 }, days: 280, target: -2.3, tol: 0.3 } },
    { id: 'tirz-5', cls: 'AR GIP/GLP-1', situation: 'Tirzépatide 5 mg/sem (SURPASS-2)', effet: '− 2,01 % depuis l\'inclusion ; poids − 7,6 kg.', source: 'Frías JP et al. N Engl J Med 2021;385:503', url: 'https://acc.org/latest-in-cardiology/clinical-trials/2021/06/27/19/02/surpass-2', verif: 'secondaire',
      calib: { metric: 'raw', cfg: { a1c: 8.3, weight: 94, height: 170, rx0: ON_MET }, rx: { glp: 'tirz', glpDose: 5 }, days: 280, target: -2.01, tol: 0.3 } },
    { id: 'tirz-15-w', cls: 'AR GIP/GLP-1', situation: 'Tirzépatide 15 mg/sem : poids (SURPASS-2)', effet: '− 11,2 kg à 40 semaines.', source: 'Frías JP et al. N Engl J Med 2021;385:503', url: 'https://acc.org/latest-in-cardiology/clinical-trials/2021/06/27/19/02/surpass-2', verif: 'secondaire',
      calib: { metric: 'dW', cfg: { a1c: 8.3, weight: 94, height: 170, rx0: ON_MET }, rx: { glp: 'tirz', glpDose: 15 }, days: 280, target: -10.5, tol: 2.5 } },
    { id: 'sema-s2', cls: 'aGLP1', situation: 'Sémaglutide 1 mg/sem en ajout à la metformine (bras comparateur de SURPASS-2)', effet: '− 1,86 % depuis l\'inclusion ; poids − 5,7 kg. Plus que dans SUSTAIN 1 (− 1,6 % en monothérapie) : le modèle, calé sur SUSTAIN 1, reste en deçà.', source: 'Frías JP et al. N Engl J Med 2021;385:503', url: 'https://acc.org/latest-in-cardiology/clinical-trials/2021/06/27/19/02/surpass-2', verif: 'secondaire',
      calib: { metric: 'raw', cfg: { a1c: 8.3, weight: 94, height: 170, rx0: ON_MET }, rx: { glp: 'sema', glpDose: 1 }, days: 280, target: -1.86, tol: 0.4 } },
    { id: 'glp-nma', cls: 'aGLP1', situation: 'Comparaison de classes (453 essais)', effet: 'Sémaglutide SC : plus forte baisse d\'HbA1c et de poids ; puis sémaglutide oral, exénatide, liraglutide, iSGLT2 pour le poids.', source: 'Tsapas A et al. Ann Intern Med 2020;173:278', url: 'https://doi.org/10.7326/M20-0864', verif: 'primaire' },

    // ——— iSGLT2 ———
    { id: 'empa25-g2', cls: 'iSGLT2', situation: 'Empagliflozine 25 mg, DFG 60–90 (EMPA-REG RENAL), en ajout', effet: '− 0,68 % contre placebo à 24 semaines (10 mg : − 0,52 %).', source: 'Barnett AH et al. Lancet Diabetes Endocrinol 2014;2:369', url: 'https://pubmed.ncbi.nlm.nih.gov/24795251/', verif: 'primaire',
      calib: { cfg: { a1c: 8.1, dfg: 75, rx0: ON_MET }, rx: { sglt2: 'empa25' }, days: 168, target: -0.68, tol: 0.2 } },
    { id: 'empa10-g2', cls: 'iSGLT2', situation: 'Empagliflozine 10 mg, DFG 60–90', effet: '− 0,52 % contre placebo.', source: 'Barnett AH et al. Lancet Diabetes Endocrinol 2014;2:369', url: 'https://pubmed.ncbi.nlm.nih.gov/24795251/', verif: 'primaire',
      calib: { cfg: { a1c: 8.1, dfg: 75, rx0: ON_MET }, rx: { sglt2: 'empa10' }, days: 168, target: -0.52, tol: 0.2 } },
    { id: 'empa25-g3', cls: 'iSGLT2', situation: 'Empagliflozine 25 mg, DFG 30–60', effet: '≈ − 0,4 % : effet glycémique atténué quand le DFG baisse, nul en stade 4 (bénéfice rénal et cardiaque conservé).', source: 'Barnett AH et al. Lancet Diabetes Endocrinol 2014;2:369', url: 'https://pubmed.ncbi.nlm.nih.gov/24795251/', verif: 'secondaire',
      calib: { cfg: { a1c: 8.1, dfg: 45, rx0: ON_MET }, rx: { sglt2: 'empa25' }, days: 168, target: -0.42, tol: 0.2 } },

    // ——— Acarbose ———
    { id: 'acarb', cls: 'Inhibiteur des α-glucosidases', situation: 'Acarbose contre placebo (41 essais)', effet: '− 0,77 % (Cochrane : − 0,8 %) ; ajouté à l\'insuline − 0,62 %.', source: 'Van de Laar FA et al. Cochrane 2005, CD003639', url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD003639.pub2/abstract', verif: 'primaire',
      calib: { cfg: { a1c: 8.5 }, rx: { acarb: 300 }, days: 182, target: -0.77, tol: 0.25 } },

    // ——— Insuline basale ———
    { id: 'basal-t2t', cls: 'Insuline basale', situation: 'Ajout de glargine titrée sur une glycémie à jeun ≤ 1,00 g/L, ADO poursuivis (Treat-to-Target, HbA1c 8,6 %)', effet: 'HbA1c finale 6,96 % à 24 semaines ; 57 % atteignent ≤ 7 %, 33 % sans hypoglycémie nocturne.', source: 'Riddle MC et al. Diabetes Care 2003;26:3080', url: 'https://diabetesonthenet.com/wp-content/uploads/dd3-1-23.pdf', verif: 'secondaire',
      calib: { metric: 'abs', cfg: { a1c: 8.6, duration: 9, rx0: { met: 2000, su: 60 } }, rx: { basal: 10 }, opt: { titrate: 1.0 }, days: 168, target: 6.96, tol: 0.3 } },

    // ——— Mode de vie ———
    { id: 'ex-150', cls: 'Activité physique', situation: 'Exercice structuré ≥ 150 min/sem (47 essais)', effet: '− 0,89 % ; < 150 min/sem : − 0,36 % ; conseils d\'activité seuls sans régime : pas d\'effet.', source: 'Umpierre D et al. JAMA 2011;305:1790', url: 'https://ma1.mdedge.com/content/structured-exercise-training-lowers-hba1c-067', verif: 'primaire',
      calib: { cfg: { a1c: 8.3, motiv: 'forte' }, rx: { act: 180, diet: true }, days: 182, target: -0.89, tol: 0.3 } },
    { id: 'ex-90', cls: 'Activité physique', situation: 'Exercice structuré < 150 min/sem', effet: '− 0,36 %.', source: 'Umpierre D et al. JAMA 2011;305:1790', url: 'https://ma1.mdedge.com/content/structured-exercise-training-lowers-hba1c-067', verif: 'primaire',
      calib: { cfg: { a1c: 8.3, motiv: 'forte' }, rx: { act: 90, diet: true }, days: 182, target: -0.36, tol: 0.2 } },
    { id: 'lookahead', cls: 'Perte de poids', situation: 'Intervention intensive (Look AHEAD) à 1 an, HbA1c 7,3 %, IMC 36', effet: 'Poids − 8,6 % ; HbA1c − 0,64 % contre − 0,14 % alors que les traitements étaient réduits dans le bras intervention et majorés dans le bras témoin (effet propre plus grand que l\'écart, cible du modèle − 0,7 %) ; à 4 ans − 0,36 % contre + 0,09 %.', source: 'Look AHEAD Research Group. Diabetes Care 2007;30:1374 et Arch Intern Med 2010;170:1566', url: 'https://diabetesonthenet.com/diabetes-digest/look-ahead-higher-hba1c/', verif: 'secondaire',
      calib: { cfg: { a1c: 7.3, weight: 101, height: 167, motiv: 'forte' }, rx: { wtGoal: 10, act: 175 }, days: 365, target: -0.7, tol: 0.3 } },
    { id: 'direct', cls: 'Perte de poids', situation: 'Diète hypocalorique, ADO arrêtés, diabète < 6 ans (DiRECT)', effet: 'Perte moyenne 10 kg ; rémission (HbA1c < 6,5 % sans traitement) 46 % contre 4 % (HbA1c médiane voisine de 6,5 % sans traitement) ; d\'autant plus fréquente que la perte dépasse 15 kg.', source: 'Lean MEJ et al. Lancet 2018;391:541', url: 'https://pubmed.ncbi.nlm.nih.gov/29221645/', verif: 'primaire',
      calib: { metric: 'abs', cfg: { a1c: 7.6, duration: 3, weight: 101, height: 169, motiv: 'forte', rx0: ON_MET }, rx: { met: 0, wtGoal: 15, diet: true }, days: 365, target: 6.6, tol: 0.35 } }
  ];
})();
