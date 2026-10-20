# Référentiel d'effets des traitements du diabète de type 2

Effets publiés de chaque traitement et de chaque situation, utilisés pour caler le patient virtuel (`js/simu/dt2-model.js`). La source unique est `js/simu/dt2-ref.js` ; l'interface l'affiche dans l'encart « Référentiel d'effets (littérature) » du mode DT2, avec la valeur que donne le modèle quand il rejoue l'essai.

**Comment le modèle rejoue un essai.** Patient théorique (DT2 insulinorésistant, 95 kg, 172 cm, diabète de 5 ans, DFG 90, observance bonne, sauf mention dans `calib.cfg`). Deux bras sont simulés : traitement ajouté à J0, et témoin sans changement ; l'effet est la différence d'HbA1c (ou de poids) à la date de l'essai. Insuline basale : titration de 2 U tous les 3 jours vers une glycémie à jeun ≤ 1,00 g/L.

**Vérification.** `node tools/calib-dt2.js` compare chaque repère à sa tolérance (sortie non nulle en cas d'écart) ; `node tools/calib-dt2.js --md` régénère le tableau ci-dessous.

² chiffre lu dans une revue ou un résumé secondaire, à confirmer sur le texte intégral.

| Traitement | Situation | Effet publié | Source | Repère | Modèle |
| --- | --- | --- | --- | --- | --- |
| Tous | HbA1c initiale | + 1 point d'HbA1c initiale = 0,5 point de baisse supplémentaire à 6 mois (61 essais, ADO). | [Sherifali D et al. Diabetes Care 2010;33:1859](https://pubmed.ncbi.nlm.nih.gov/20484130/) | -0,50 %/pt ± 0,2 | -0,39 %/pt |
| Metformine | Monothérapie contre placebo | − 1,12 % (35 essais). Doses plus fortes plus efficaces, sans plus de troubles digestifs. | [Hirst JA et al. Diabetes Care 2012;35:446](https://pubmed.ncbi.nlm.nih.gov/22275444/) | -1,12 % ± 0,2 | -1,16 % |
| Metformine | Ajout à un autre ADO | − 0,95 %. | [Hirst JA et al. Diabetes Care 2012;35:446](https://pubmed.ncbi.nlm.nih.gov/22275444/) | -0,95 % ± 0,25 | -1,03 % |
| Metformine | Ajout à l'insuline | − 0,60 %. | [Hirst JA et al. Diabetes Care 2012;35:446](https://pubmed.ncbi.nlm.nih.gov/22275444/) | -0,60 % ± 0,25 | -0,74 % |
| Metformine | Dose-réponse : 500 mg/j (14 semaines, glycémie à jeun ≥ 1,80 g/L) | − 0,6 % contre placebo à 500 mg, jusqu'à − 2,0 % à 2000 mg ; effet dose-dépendant. | [Garber AJ et al. Am J Med 1997;103:491](https://pubmed.ncbi.nlm.nih.gov/?term=Garber+AJ+1997+metformin+dose-response) | -0,60 % ± 0,3 | -0,74 % |
| Metformine | Dose-réponse : 2000 mg/j (même essai) | − 2,0 % contre placebo (le bras placebo s'aggravait après l'arrêt des ADO : l'écart surestime l'effet propre). | [Garber AJ et al. Am J Med 1997;103:491](https://pubmed.ncbi.nlm.nih.gov/?term=Garber+AJ+1997+metformin+dose-response) | -1,60 % ± 0,4 | -1,48 % |
| Sulfamide | Monothérapie contre placebo | − 1,51 % (31 essais) ; hypoglycémies RR 2,41. | [Hirst JA et al. Diabetologia 2013;56:973](https://link.springer.com/article/10.1007/s00125-013-2856-6) | -1,51 % ± 0,3 | -1,60 % |
| Sulfamide | Dose faible contre dose forte | Les doses fortes n'apportent pas de baisse d'HbA1c supplémentaire (effet plateau), mais plus d'hypoglycémies. | [Hirst JA et al. Diabetologia 2013;56:973](https://link.springer.com/article/10.1007/s00125-013-2856-6) | -0,15 % ± 0,2 | -0,14 % |
| Sulfamide | Ajout à l'insuline | − 0,46 %. | [Hirst JA et al. Diabetologia 2013;56:973](https://link.springer.com/article/10.1007/s00125-013-2856-6) | -0,46 % ± 0,3 | -0,20 % |
| Sulfamide | Ajout à un ADO | − 1,62 %. | [Hirst JA et al. Diabetologia 2013;56:973](https://link.springer.com/article/10.1007/s00125-013-2856-6) | -1,40 % ± 0,35 | -1,31 % |
| iDPP4 | Études à < 50 % de patients asiatiques | − 0,65 % (DMP contre placebo). | [Kim YG et al. Diabetologia 2013;56:696](https://link.springer.com/article/10.1007/s00125-012-2827-3) | -0,65 % ± 0,2 | -0,53 % |
| iDPP4 | Études à ≥ 50 % de patients asiatiques | − 0,92 % ; l'IMC initial plus bas est corrélé à une meilleure réponse. | [Kim YG et al. Diabetologia 2013;56:696](https://link.springer.com/article/10.1007/s00125-012-2827-3) | -0,92 % ± 0,2 | -0,83 % |
| aGLP1 | Sémaglutide 1 mg/sem, monothérapie (SUSTAIN 1, HbA1c 8,1 %) | − 1,6 % contre < 0,1 % sous placebo ; poids − 4,5 kg contre − 1,0 kg. | [Sorli C et al. Lancet Diabetes Endocrinol 2017;5:251](https://www.medwirenews.com/showcase/a-quick-guide-to-the-sustain-trials/) ² | -1,50 % ± 0,25 | -1,49 % |
| aGLP1 | Sémaglutide 1 mg/sem : poids | − 3,5 kg de plus que le placebo à 30 semaines. | [Sorli C et al. Lancet Diabetes Endocrinol 2017;5:251](https://www.medwirenews.com/showcase/a-quick-guide-to-the-sustain-trials/) ² | -3,50 kg ± 1,5 | -3,26 kg |
| aGLP1 | Sémaglutide 0,5 mg/sem (SUSTAIN 1) | − 1,43 % contre placebo ; poids − 3,7 kg contre − 1,0 kg. | [Sorli C et al. Lancet Diabetes Endocrinol 2017;5:251](https://cronfa.swansea.ac.uk/Record/cronfa31739) | -1,43 % ± 0,25 | -1,38 % |
| aGLP1 | Liraglutide 1,8 mg/j, monothérapie, 52 semaines (LEAD-3, HbA1c 8,3 %) | − 1,14 % depuis l'inclusion (glimépiride 8 mg : − 0,51 %). | [Garber A et al. Lancet 2009;373:473](https://pmc.ncbi.nlm.nih.gov/articles/PMC3084519) | -1,14 % ± 0,3 | -1,10 % |
| aGLP1 | Liraglutide 1,2 mg/j (LEAD-3) | − 0,84 % depuis l'inclusion. | [Garber A et al. Lancet 2009;373:473](https://pmc.ncbi.nlm.nih.gov/articles/PMC3084519) | -0,84 % ± 0,3 | -0,90 % |
| AR GIP/GLP-1 | Tirzépatide 15 mg/sem en ajout à la metformine, 40 semaines (SURPASS-2, HbA1c 8,3 %) | − 2,30 % depuis l'inclusion (5 mg − 2,01 ; 10 mg − 2,24 ; sémaglutide 1 mg − 1,86) ; poids − 11,2 kg (sémaglutide − 5,7 kg). | [Frías JP et al. N Engl J Med 2021;385:503](https://acc.org/latest-in-cardiology/clinical-trials/2021/06/27/19/02/surpass-2) ² | -2,30 % ± 0,3 | -2,11 % |
| AR GIP/GLP-1 | Tirzépatide 5 mg/sem (SURPASS-2) | − 2,01 % depuis l'inclusion ; poids − 7,6 kg. | [Frías JP et al. N Engl J Med 2021;385:503](https://acc.org/latest-in-cardiology/clinical-trials/2021/06/27/19/02/surpass-2) ² | -2,01 % ± 0,3 | -1,87 % |
| AR GIP/GLP-1 | Tirzépatide 15 mg/sem : poids (SURPASS-2) | − 11,2 kg à 40 semaines. | [Frías JP et al. N Engl J Med 2021;385:503](https://acc.org/latest-in-cardiology/clinical-trials/2021/06/27/19/02/surpass-2) ² | -10,50 kg ± 2,5 | -10,12 kg |
| aGLP1 | Sémaglutide 1 mg/sem en ajout à la metformine (bras comparateur de SURPASS-2) | − 1,86 % depuis l'inclusion ; poids − 5,7 kg. Plus que dans SUSTAIN 1 (− 1,6 % en monothérapie) : le modèle, calé sur SUSTAIN 1, reste en deçà. | [Frías JP et al. N Engl J Med 2021;385:503](https://acc.org/latest-in-cardiology/clinical-trials/2021/06/27/19/02/surpass-2) ² | -1,86 % ± 0,4 | -1,47 % |
| aGLP1 | Comparaison de classes (453 essais) | Sémaglutide SC : plus forte baisse d'HbA1c et de poids ; puis sémaglutide oral, exénatide, liraglutide, iSGLT2 pour le poids. | [Tsapas A et al. Ann Intern Med 2020;173:278](https://doi.org/10.7326/M20-0864) | — | — |
| iSGLT2 | Empagliflozine 25 mg, DFG 60–90 (EMPA-REG RENAL), en ajout | − 0,68 % contre placebo à 24 semaines (10 mg : − 0,52 %). | [Barnett AH et al. Lancet Diabetes Endocrinol 2014;2:369](https://pubmed.ncbi.nlm.nih.gov/24795251/) | -0,68 % ± 0,2 | -0,70 % |
| iSGLT2 | Empagliflozine 10 mg, DFG 60–90 | − 0,52 % contre placebo. | [Barnett AH et al. Lancet Diabetes Endocrinol 2014;2:369](https://pubmed.ncbi.nlm.nih.gov/24795251/) | -0,52 % ± 0,2 | -0,57 % |
| iSGLT2 | Empagliflozine 25 mg, DFG 30–60 | ≈ − 0,4 % : effet glycémique atténué quand le DFG baisse, nul en stade 4 (bénéfice rénal et cardiaque conservé). | [Barnett AH et al. Lancet Diabetes Endocrinol 2014;2:369](https://pubmed.ncbi.nlm.nih.gov/24795251/) ² | -0,42 % ± 0,2 | -0,51 % |
| Inhibiteur des α-glucosidases | Acarbose contre placebo (41 essais) | − 0,77 % (Cochrane : − 0,8 %) ; ajouté à l'insuline − 0,62 %. | [Van de Laar FA et al. Cochrane 2005, CD003639](https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD003639.pub2/abstract) | -0,77 % ± 0,25 | -0,83 % |
| Insuline basale | Ajout de glargine titrée sur une glycémie à jeun ≤ 1,00 g/L, ADO poursuivis (Treat-to-Target, HbA1c 8,6 %) | HbA1c finale 6,96 % à 24 semaines ; 57 % atteignent ≤ 7 %, 33 % sans hypoglycémie nocturne. | [Riddle MC et al. Diabetes Care 2003;26:3080](https://diabetesonthenet.com/wp-content/uploads/dd3-1-23.pdf) ² | 6,96 % ± 0,3 | 6,76 % |
| Activité physique | Exercice structuré ≥ 150 min/sem (47 essais) | − 0,89 % ; < 150 min/sem : − 0,36 % ; conseils d'activité seuls sans régime : pas d'effet. | [Umpierre D et al. JAMA 2011;305:1790](https://ma1.mdedge.com/content/structured-exercise-training-lowers-hba1c-067) | -0,89 % ± 0,3 | -0,82 % |
| Activité physique | Exercice structuré < 150 min/sem | − 0,36 %. | [Umpierre D et al. JAMA 2011;305:1790](https://ma1.mdedge.com/content/structured-exercise-training-lowers-hba1c-067) | -0,36 % ± 0,2 | -0,48 % |
| Perte de poids | Intervention intensive (Look AHEAD) à 1 an, HbA1c 7,3 %, IMC 36 | Poids − 8,6 % ; HbA1c − 0,64 % contre − 0,14 % alors que les traitements étaient réduits dans le bras intervention et majorés dans le bras témoin (effet propre plus grand que l'écart, cible du modèle − 0,7 %) ; à 4 ans − 0,36 % contre + 0,09 %. | [Look AHEAD Research Group. Diabetes Care 2007;30:1374 et Arch Intern Med 2010;170:1566](https://diabetesonthenet.com/diabetes-digest/look-ahead-higher-hba1c/) ² | -0,70 % ± 0,3 | -0,94 % |
| Perte de poids | Diète hypocalorique, ADO arrêtés, diabète < 6 ans (DiRECT) | Perte moyenne 10 kg ; rémission (HbA1c < 6,5 % sans traitement) 46 % contre 4 % (HbA1c médiane voisine de 6,5 % sans traitement) ; d'autant plus fréquente que la perte dépasse 15 kg. | [Lean MEJ et al. Lancet 2018;391:541](https://pubmed.ncbi.nlm.nih.gov/29221645/) | 6,60 % ± 0,35 | 6,84 % |

## Paramètres calés

| Paramètre (`P` dans `dt2-model.js`) | Valeur | Repères |
| --- | --- | --- |
| Effet maximal de la metformine (2 g) ; au-delà, + 12 % seulement à 3 g (SFD 2025, avis 8) | 0,5 | met-mono, met-500, met-2000 |
| Atténuation de la metformine sous insuline titrée ; en association orale | 1,0 ; 0,4 | met-ins, met-addon |
| Sulfamide : effet et exposant de dose (plateau dès la dose faible) | 0,85 ; 0,15 | su-mono, su-dose |
| iDPP4 ; facteur incrétines Asie de l'Est | 0,31 ; × 1,8 | dpp4, dpp4-asie |
| aGLP1 : fraction de l'effet par palier | sémaglutide 0,2/0,8/0,9/1 ; dulaglutide 0,65/0,77/0,82/0,88 ; liraglutide 0,3/0,6/0,8 (× 0,62) | sema-05, sema-1, lira-12, lira-18 |
| Perte de poids sous aGLP1 à dose pleine | 3,5 % (tirzépatide × 3,2) | sema-1-w, tirz-15-w |
| Tirzépatide : fraction par palier (2,5 → 15 mg) | 0,3/0,72/0,8/0,86/0,9/0,93 (× 1,45) | tirz-5, tirz-15 |
| iSGLT2 : part de l'excès glycémique retirée ; atténuation rénale | empagliflozine 25 mg 0,19, 10 mg et dapagliflozine 0,14 ; nulle à DFG 20, pleine à 60 | empa25-g2, empa10-g2, empa25-g3 |
| Acarbose 300 mg | 0,2 | acarb |
| Insuline équivalant à la sécrétion normale | 1,2 U/kg/j | basal-t2t |
| Glycémie à jeun sous insuline basale | − 0,5 g/L au maximum par rapport à la glycémie moyenne × 0,9 | basal-t2t |
| Sensibilité à l'insuline et poids | ∝ (poids initial / poids)^1,5 | lookahead |
| Récupération de la fonction β après perte de poids | × (1 + 14 × perte relative × (1 − durée/6 ans)) | direct |
| Activité physique | sensibilité + 30 % à 150 min/sem (effet seuil), + 38 % à 300 | ex-150, ex-90 |
| Activité et perte de poids : gains moins qu'additifs | 0,6 | lookahead |
| Glucotoxicité | 0,4 | base-a1c |

## Limites

- Les essais diffèrent par leur population, leur durée et leurs traitements de fond ; le patient théorique n'en reproduit qu'une moyenne. Les tolérances (± 0,2 à 0,35 point) traduisent ces différences.
- SURPASS-2 donne au sémaglutide 1 mg un effet plus grand (− 1,86 %) que SUSTAIN 1 : le modèle, calé sur SUSTAIN 1, reste en deçà (− 1,47 %, tolérance élargie à 0,4).
- Repères en tension : Look AHEAD et DiRECT tirent le poids de la perte pondérale en sens inverse (le modèle surestime un peu Look AHEAD et sous-estime un peu DiRECT) ; le sulfamide ajouté à l'insuline reste en deçà de la méta-analyse (− 0,2 contre − 0,46).
- Non modélisés finement : différences entre molécules d'une même classe hors doses listées, effets cardiovasculaires et rénaux propres (iSGLT2, aGLP1), durabilité à long terme (ADOPT), hypoglycémies au-delà d'un ordre de grandeur (sulfamides : RR 2,41, Hirst 2013).
