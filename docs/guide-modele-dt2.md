# Guide du modèle DT2 : variables, effets, enchaînements, arbres de décision

Généré par `node tools/guide-dt2.js` à partir du modèle (`js/simu/dt2-model.js`), du guide (`js/simu/dt2-guide.js`) et de l'arbre des décisions (`js/simu/dt2-tree.js`). Les chiffres « obtenus » sont ceux du patient moyen (mode reproductible, observance bonne) : en mode patient réel, chaque patient s'en écarte (réponses individuelles cachées). Les effets publiés qui ont servi au calage sont dans [`referentiel-effets.md`](referentiel-effets.md).

## 1. Le cœur du modèle

- Action de l'insuline IA = (réserve insulinique B × freins et stimulants de la sécrétion + insuline injectée) × sensibilité à l'insuline × effet de la metformine.
- Glycémie moyenne d'équilibre = 0,95 + 0,45 × (1/IA − 1)^0,6 g/L ; iSGLT2, acarbose et part non sécrétoire des aGLP1 retirent ensuite une fraction de l'excès au-dessus de 1 g/L.
- HbA1c : formule ADAG à partir de la glycémie moyenne, constante de temps 40 jours (jugée à 3 mois) ; poids : constante de temps 75 jours.
- Au départ, la physiologie cachée (poids d'équilibre, réserve B, puis sensibilité si besoin) est calée pour reproduire exactement l'HbA1c saisie sous le traitement en cours.
- Glucotoxicité : au-dessus de 1,80 g/L, la sécrétion est freinée (× 1/(1 + gtox × excès)) ; elle se lève quand l'équilibre revient, d'où des baisses plus fortes quand l'HbA1c de départ est haute (+ 1 point de départ ≈ + 0,4 point de baisse).
- Associations : les effets ne s'additionnent pas simplement (la metformine est atténuée en association orale et sous insuline ; activité et perte de poids partagent leurs gains).

## 2. Traitement par traitement

### Metformine

- **Dans le modèle** : Multiplie l'action de l'insuline par (1 + effet) : effet = 0,5 × (dose/2 g)^0,7 jusqu'à 2 g, + 12 % seulement de 2 à 3 g ; divisé par (1 + 1,4 × part d'insuline injectée + 0,4 × effets des autres oraux).
- **Ce qui module la réponse** : Réponse individuelle × 0,7 à 1,25 (patient réel) ; dose réellement prise (introduction progressive : + 500 mg/semaine ; arrêt par le patient si troubles digestifs) ; observance.
- **Ce que l'on obtient** : Monothérapie 2 g : − 1,1 point (HbA1c 8,4 %) ; en ajout à un oral − 1,0 ; en ajout à l'insuline − 0,7. 3 g au lieu de 2 g : − 0,1 à − 0,2 de plus. Poids − 1 %.
- **Tolérance, événements simulés** : Troubles digestifs (environ 15 % malgré une introduction progressive, beaucoup plus à 3 g d'emblée) ; acidose lactique si poursuivie sous un DFG de 30.
- **Repères de calage** : met-mono, met-addon, met-ins, met-500, met-2000

### Sulfamide (gliclazide LM)

- **Dans le modèle** : Augmente la sécrétion : B × (1 + effet), effet = 0,85 × (dose/120)^0,15 (plateau dès 30 mg) × réserve (moins efficace si la réserve est basse).
- **Ce qui module la réponse** : Réserve insulinique (déclin annuel : échec secondaire) ; MODY HNF1A × 2,5 ; DFG < 45 et âge ≥ 75 : hypoglycémies × 1,8 à 2.
- **Ce que l'on obtient** : Monothérapie − 1,6 point ; dose forte ≈ dose faible ; en ajout à l'insuline − 0,2 à − 0,5. Poids + 2,5 % (moitié sous insuline).
- **Tolérance, événements simulés** : Hypoglycémies (sévères chez le sujet âgé, l'insuffisant rénal, les repas irréguliers ; décès possible à la deuxième sévère).
- **Repères de calage** : su-mono, su-dose, su-ins, su-addon

### iDPP4 (sitagliptine)

- **Dans le modèle** : Augmente la sécrétion de façon glucodépendante : B × (1 + 0,31 × dose/100 × facteur ethnique × glucodépendance).
- **Ce qui module la réponse** : Origine d'Asie de l'Est × 1,8 ; inefficace si la glycémie est basse (pas d'hypoglycémie) ; réserve.
- **Ce que l'on obtient** : En ajout à la metformine − 0,55 point (− 0,9 chez un patient d'Asie de l'Est). Poids neutre.
- **Tolérance, événements simulés** : Pancréatite si antécédent ; association à un aGLP1 sans objet.
- **Repères de calage** : dpp4, dpp4-asie

### aGLP1 (sémaglutide, dulaglutide, liraglutide) et tirzépatide

- **Dans le modèle** : Deux composantes : sécrétoire (B × (1 + 0,1 × fraction de dose), liée à la réserve) et non sécrétoire (glucagon, vidange gastrique, satiété : retire 0,5 × fraction de dose de l'excès glycémique, y compris sous insuline). Fraction par palier : sémaglutide 0,2 / 0,8 / 0,9 (0,25 / 0,5 / 1 mg), dulaglutide 0,65 / 0,77 / 0,82 / 0,88, liraglutide 0,3 / 0,6 / 0,8 (× 0,54), tirzépatide 0,3 / 0,72 / 0,8 / 0,86 / 0,9 / 0,93 (× 1,45).
- **Ce qui module la réponse** : Réponse individuelle glycémique et pondérale × 0,6 à 1,4 (patient réel) ; origine asiatique ; observance ; paliers : sauter un palier ou monter en moins de 4 semaines donne nausées puis vomissements (arrêt par le patient).
- **Ce que l'on obtient** : Sémaglutide 1 mg : − 1,5 à − 1,8 point (en monothérapie, en ajout à la metformine ou à l'insuline basale) ; poids − 5 kg environ sur 6 à 12 mois pour 95 kg (− 4,5 à 6,5 kg dans les essais). Tirzépatide 15 mg : − 2,1 à − 2,3 points, − 10 kg. Liraglutide 1,8 mg : − 1,1 point, − 2,5 kg. La perte de poids est plafonnée par le modèle à ce que montrent les essais chez le diabétique (moindre que dans l'obésité sans diabète).
- **Tolérance, événements simulés** : Troubles digestifs ; pancréatite si antécédent ; aggravation d'une rétinopathie sévère si l'HbA1c baisse vite ; à éviter chez la personne âgée dépendante.
- **Repères de calage** : sema-1, sema-05, sema7-1w, sema5, sema5-w, lira-18, tirz-15, tirz-5, sema-s2

### iSGLT2 (empagliflozine, dapagliflozine)

- **Dans le modèle** : Retire une fraction de l'excès glycémique au-dessus de 1 g/L : empagliflozine 25 mg 0,19, 10 mg et dapagliflozine 0,14, × (DFG − 20)/40 (nul sous 20, plein dès 60).
- **Ce qui module la réponse** : DFG (effet glycémique faible sous 45) ; ne dépend ni de la réserve ni de l'insuline.
- **Ce que l'on obtient** : En ajout − 0,5 à − 0,7 point à DFG normal, − 0,4 à DFG 45. Poids − 2,5 %, PA − 4 mmHg ; ralentit le déclin du DFG (baisse initiale de 3 mL/min).
- **Tolérance, événements simulés** : Mycoses génitales ; acidocétose euglycémique (insulinopénie, LADA, régime cétogène).
- **Repères de calage** : empa25-g2, empa10-g2, empa25-g3

### Acarbose

- **Dans le modèle** : Retire 0,2 × dose/300 de l'excès glycémique ; atténue les pics post-prandiaux.
- **Ce qui module la réponse** : Observance.
- **Ce que l'on obtient** : − 0,8 point. Poids neutre.
- **Tolérance, événements simulés** : Troubles digestifs (non simulés).
- **Repères de calage** : acarb

### Insuline basale et bolus

- **Dans le modèle** : Ajoute de l'insuline à l'action endogène : dose / (1,2 U/kg) équivaut à une sécrétion normale. La basale abaisse surtout la glycémie à jeun (jusqu'à − 0,5 g/L) ; les bolus effacent l'excursion de leur repas puis l'élévation jusqu'au repas suivant, le surplus creusant une hypoglycémie.
- **Ce qui module la réponse** : Sensibilité à l'insuline (IMC, poids, activité) ; titration selon le protocole (patient ou IDE) ; type de basale (U300 et dégludec : hypoglycémies × 0,7 ; NPH × 1,4).
- **Ce que l'on obtient** : Basale titrée sur une glycémie à jeun ≤ 1,00–1,20 g/L : HbA1c ≈ 6,8–7 % avec 0,4 à 0,5 U/kg chez un DT2 obèse ; au-delà de 0,5 U/kg, la basale corrige à tort la journée (sur-basalisation). Poids + 4 % à pleine dose.
- **Tolérance, événements simulés** : Hypoglycémies (nocturnes avec la basale, post-prandiales avec les bolus) ; aggravation d'une rétinopathie si l'HbA1c baisse vite.
- **Repères de calage** : basal-t2t

### Mesures hygiéno-diététiques

- **Dans le modèle** : Activité : sensibilité + 30 % à 150 min/semaine (effet seuil), + 38 % à 300. Perte de poids : sensibilité × (poids initial / poids)^1,5, et, si le diabète a moins de 6 ans, récupération de la réserve (× 1 + 16 × perte relative × (1 − durée/6)). Sodas : + 0,035 g/L de glycémie moyenne par verre quotidien. Gains activité-poids partagés (0,6).
- **Ce qui module la réponse** : Motivation (atteinte des objectifs 30, 55 ou 80 %, × 1,25 avec un suivi diététique ; cachée en patient réel) ; perte de poids plafonnée à 12 %.
- **Ce que l'on obtient** : Exercice structuré ≥ 150 min/semaine − 0,8 point ; intervention intensive (Look AHEAD) − 0,7 à − 1 point à 1 an ; diète à 10–15 kg de perte dans un diabète récent : rémission possible (DiRECT).
- **Tolérance, événements simulés** : Aucun.
- **Repères de calage** : ex-150, ex-90, lookahead, direct

## 3. Situation par situation

| Situation | Effet dans le modèle |
| --- | --- |
| Profil insulinorésistant (obèse) | Sensibilité 0,55 × (25/IMC)^0,9, déclin de la réserve 3 %/an : insuline à fortes doses, grand bénéfice de la perte de poids et des aGLP1. |
| Profil insulinopénique (mince, HbA1c haute) | Sensibilité 0,85, déclin 8 %/an, peptide C bas : sulfamides et iDPP4 peu efficaces, insuline précoce. |
| Sujet âgé (profil modéré) | Sensibilité 0,75, déclin 2 %/an ; hypoglycémies × 2 après 75 ans, sévères × 2,5 ; cible et plancher selon le statut gériatrique. |
| LADA | Déclin de la réserve 50 %/an : échec rapide des oraux, cétose sans insuline, acidocétose sous iSGLT2. |
| MODY HNF1A | Sulfamides × 2,5 dès la dose faible (hypoglycémies). |
| MODY GCK | Glycémie de consigne calée sur l'HbA1c, insensible aux antidiabétiques. |
| Ancienneté du diabète | À HbA1c égale, réserve plus basse (sensibilité × 1 + 2,5 %/an, plafonnée à 20 ans) ; pas de récupération de la réserve après perte de poids au-delà de 6 ans. |
| DFG | Metformine : acidose lactique sous 30 ; iSGLT2 : effet glycémique × (DFG − 20)/40 ; sulfamides : hypoglycémies × 1,8 sous 45 ; déclin annuel selon l'albuminurie (0,8 / 2,5 / 5 mL/min), ralenti par iSGLT2 (÷ 2) et aGLP1 (× 0,8). |
| Origine d'Asie de l'Est | iDPP4 × 1,8 ; part non sécrétoire des aGLP1 × 1,34. |
| Observance et situation psychologique | Bonne 1 ; oublis fréquents 0,75 (traitements pris aux trois quarts, carnet plus irrégulier) ; peur de l'hypoglycémie : observance 0,95 mais 30 % seulement des hausses de doses faites, glycémie moyenne + 0,03 g/L (+ 0,11 pendant deux semaines après un malaise : collations de sécurité) ; détresse psychologique : observance 0,65, atteinte des objectifs hygiéno-diététiques divisée par 2, une hausse sur deux faite, carnet incomplet ; patient réel 0,6 à 1. |
| Travail de nuit ou posté | Journée physiologique décalée sur l'horloge (nuit : + 11 h ; 2 × 8 : matin − 2 h, après-midi + 2 h 30, alternés chaque semaine ; 3 × 8 : matin, après-midi, nuit) ; 2 premiers jours d'un nouveau poste irréguliers ; hypoglycémies × 1,2 (nuit) à × 1,6 (3 × 8) ; atteinte des objectifs hygiéno-diététiques × 0,8. Le rapport AGP, en heure d'horloge, s'étale ; le carnet indique le poste. |
| Rétinopathie sévère ou proliférante | Hémorragie si l'HbA1c baisse de 2 points en 3 mois, 1,5 sous aGLP1 ou insuline, 3,5 après photocoagulation. |
| Antécédent de pancréatite, CMT, mycoses, repas irréguliers, régime cétogène | Pancréatite sous incrétines, mycoses sous iSGLT2, hypoglycémies × 2, acidocétose sous iSGLT2. |
| Patient réel | Réponses individuelles cachées : metformine et aGLP1 × 0,7–1,25, perte de poids × 0,6–1,4, déclin de la réserve × 0,7–1,4, sensibilité digestive, atteinte des objectifs hygiéno-diététiques ; événements tirés au sort. |

## 4. Arbres de décision pour six patients types

Chaque option possible, classée de la meilleure à la pire selon la SFD 2025 (rang 1 recommandé · 2 acceptable · 3 possible, moins bon · 4 à éviter · 5 erreur), avec le résultat simulé à 6 mois ; pour les trois meilleures branches encore au-dessus de la cible, l'étape suivante la mieux classée, à 12 mois. Le même arbre est calculé en direct pour le patient affiché dans le simulateur (carte « Arbre des décisions pour ce patient »).

### Diabète découvert, obèse (56 ans, IMC 33, HbA1c 8,5 %, sans traitement)

Cible SFD : HbA1c ≤ 7,0 %.

| Rang | Option | Pourquoi (SFD 2025) | HbA1c à 6 mois | Poids | Hypoglycémies | Puis (à 12 mois) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 · recommandé | Metformine progressive + sémaglutide d'emblée | obésité ou MASLD : bithérapie d'emblée, quel que soit l'HbA1c (avis 8, 11, 14, 15) | 5,8 % | −5,6 kg | 0 | — |
| 1 · recommandé | Metformine progressive jusqu'à 2 g/j | première intention médicamenteuse, doses progressives (avis 8 et 9) | 7,2 % | −0,9 kg | 0 | Ajouter un iSGLT2 (empagliflozine 10 mg) → 6,4 %, −3,2 kg |
| 3 · possible, moins bon | Ajouter ou passer au tirzépatide (paliers jusqu'à 10 mg/sem) | sans metformine, alors qu'elle est possible : l'associer plutôt (monothérapie réservée à l'intolérance ou à la contre-indication) ; le plus efficace sur l'HbA1c et le poids (non remboursé en 2025) (avis 8 et 20 ; avis 6 bis, 10, 14) | 5,9 % | −8,1 kg | 0 | — |
| 3 · possible, moins bon | Ajouter le sémaglutide (paliers jusqu'à 1 mg/sem) | sans metformine, alors qu'elle est possible : l'associer plutôt (monothérapie réservée à l'intolérance ou à la contre-indication) ; obésité, HbA1c > cible + 1 point (avis 8 et 20 ; avis 10, 11, 14, 19) | 6,3 % | −4,7 kg | 0 | — |
| 3 · possible, moins bon | Metformine progressive + iSGLT2 d'emblée | bithérapie d'emblée sans indication particulière (avis 8) | 6,4 % | −3,1 kg | 0 | — |
| 3 · possible, moins bon | Ajouter un sulfamide (gliclazide LM 60 mg) | sans metformine, alors qu'elle est possible : l'associer plutôt (monothérapie réservée à l'intolérance ou à la contre-indication) ; troisième rang : hypoglycémies, prise de poids (avis 8 et 20 ; avis 10) | 7,1 % | +1,1 kg | 0 | — |
| 3 · possible, moins bon | Ajouter un iSGLT2 (empagliflozine 10 mg) | sans metformine, alors qu'elle est possible : l'associer plutôt (monothérapie réservée à l'intolérance ou à la contre-indication) ; option orale, effet modéré sur l'HbA1c (avis 8 et 20 ; avis 16 et 19) | 7,3 % | −2,2 kg | 0 | — |
| 3 · possible, moins bon | Instaurer une insuline basale (10 U, titrée) | sans metformine, alors qu'elle est possible : l'associer plutôt (monothérapie réservée à l'intolérance ou à la contre-indication) ; moins appropriée à ce stade qu'un aGLP1 ou une trithérapie orale (avis 8 et 20 ; avis 16) | 7,5 % | +1,3 kg | 0 | — |
| 3 · possible, moins bon | Ajouter un iDPP4 (sitagliptine) | sans metformine, alors qu'elle est possible : l'associer plutôt (monothérapie réservée à l'intolérance ou à la contre-indication) ; deuxième rang après iSGLT2 et aGLP1 ; meilleure tolérance (avis 8 et 20 ; avis 10) | 7,7 % | +0,0 kg | 0 | — |
| 4 · à éviter | Renforcer les mesures hygiéno-diététiques seules | seules, insuffisantes si l'HbA1c est à plus d'un point de la cible (à associer) (avis 4 et 8) | 6,5 % | −6,1 kg | 0 | — |
| 5 · erreur | Ne rien changer | HbA1c au-dessus de la cible : inertie thérapeutique (avis 5) | 8,5 % | +0,0 kg | 0 | — |

### Sous metformine, obèse (58 ans, IMC 33, HbA1c 7,9 %)

Cible SFD : HbA1c ≤ 7,0 %.

| Rang | Option | Pourquoi (SFD 2025) | HbA1c à 6 mois | Poids | Hypoglycémies | Puis (à 12 mois) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 · recommandé | Ajouter ou passer au tirzépatide (paliers jusqu'à 10 mg/sem) | le plus efficace sur l'HbA1c et le poids (non remboursé en 2025) (avis 6 bis, 10, 14) | 6,2 % | −7,4 kg | 0 | — |
| 1 · recommandé | Ajouter le sémaglutide (paliers jusqu'à 1 mg/sem) | obésité (avis 10, 11, 14, 19) | 6,5 % | −4,3 kg | 0 | — |
| 1 · recommandé | Ajouter un iSGLT2 (empagliflozine 10 mg) | premier choix en ajout à la metformine (avec aGLP1 et tirzépatide) (avis 10) | 7,4 % | −2,0 kg | 0 | Ajouter le sémaglutide (paliers jusqu'à 1 mg/sem) → 6,3 %, −6,5 kg |
| 2 · acceptable | Ajouter un iDPP4 (sitagliptine) | deuxième rang après iSGLT2 et aGLP1 ; meilleure tolérance (avis 10) | 7,4 % | +0,0 kg | 0 | — |
| 3 · possible, moins bon | Ajouter un sulfamide (gliclazide LM 60 mg) | troisième rang : hypoglycémies, prise de poids (avis 10) | 7,0 % | +1,0 kg | 0 | — |
| 3 · possible, moins bon | Renforcer les mesures hygiéno-diététiques seules | à associer à tout traitement, rarement suffisantes seules (avis 4) | 7,2 % | −5,5 kg | 0 | — |
| 3 · possible, moins bon | Instaurer une insuline basale (10 U, titrée) | moins appropriée à ce stade qu'un aGLP1 ou une trithérapie orale (avis 16) | 7,2 % | +0,9 kg | 0 | — |
| 4 · à éviter | Monter la metformine à 3 g/j | n'apporte que peu par rapport à 2 g/j, plus de troubles digestifs (avis 8) | 7,8 % | +0,0 kg | 0 | — |
| 5 · erreur | Ne rien changer | HbA1c au-dessus de la cible : inertie thérapeutique (avis 5) | 7,9 % | +0,0 kg | 0 | — |

### Insuffisance cardiaque et maladie rénale (67 ans, DFG 55, microalbuminurie, metformine, HbA1c 8,2 %)

Cible SFD : HbA1c ≤ 7,0 %.

| Rang | Option | Pourquoi (SFD 2025) | HbA1c à 6 mois | Poids | Hypoglycémies | Puis (à 12 mois) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 · recommandé | Ajouter un iSGLT2 (empagliflozine 10 mg) | protection cardiaque et rénale, quel que soit l'HbA1c (avis 12 ter et 13) | 7,7 % | −2,1 kg | 0 | Ajouter le sémaglutide (paliers jusqu'à 1 mg/sem) → 6,5 %, −6,6 kg |
| 2 · acceptable | Ajouter ou passer au tirzépatide (paliers jusqu'à 10 mg/sem) | insuffisance cardiaque ou maladie rénale : l'iSGLT2 d'abord (avis 12 ter et 13) | 6,3 % | −7,5 kg | 0 | — |
| 2 · acceptable | Ajouter le sémaglutide (paliers jusqu'à 1 mg/sem) | insuffisance cardiaque ou maladie rénale : l'iSGLT2 d'abord, l'aGLP1 ensuite ou en cas d'intolérance (avis 12 ter et 13) | 6,7 % | −4,3 kg | 0 | — |
| 3 · possible, moins bon | Instaurer une insuline basale (10 U, titrée) | moins appropriée à ce stade qu'un aGLP1 ou une trithérapie orale (avis 16) | 7,2 % | +0,9 kg | 0 | — |
| 3 · possible, moins bon | Ajouter un iDPP4 (sitagliptine) | moins bon qu'un iSGLT2 ou un aGLP1 à bénéfice démontré (avis 11 à 13) | 7,6 % | +0,0 kg | 0 | — |
| 4 · à éviter | Ajouter un sulfamide (gliclazide LM 60 mg) | patient à risque d'hypoglycémie (avis 16) | 7,1 % | +1,0 kg | 0 | — |
| 4 · à éviter | Renforcer les mesures hygiéno-diététiques seules | seules, insuffisantes si l'HbA1c est à plus d'un point de la cible (à associer) (avis 4 et 8) | 7,7 % | −5,6 kg | 0 | — |
| 5 · erreur | Ne rien changer | HbA1c au-dessus de la cible : inertie thérapeutique (avis 5) | 8,2 % | +0,0 kg | 0 | — |

### Trithérapie orale en échec (62 ans, IMC 31, HbA1c 9,4 %)

Cible SFD : HbA1c ≤ 7,0 %.

| Rang | Option | Pourquoi (SFD 2025) | HbA1c à 6 mois | Poids | Hypoglycémies | Puis (à 12 mois) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 · recommandé | Ajouter ou passer au tirzépatide (paliers jusqu'à 10 mg/sem) | le plus efficace sur l'HbA1c et le poids (non remboursé en 2025) (avis 6 bis, 10, 14) | 6,6 % | −7,7 kg | 0 | — |
| 1 · recommandé | Ajouter le sémaglutide (paliers jusqu'à 1 mg/sem) | obésité, HbA1c > cible + 1 point (avis 10, 11, 14, 19) | 7,3 % | −4,5 kg | 0 | Ajouter ou passer au tirzépatide (paliers jusqu'à 10 mg/sem) → 6,6 %, −8,1 kg |
| 2 · acceptable | Instaurer une insuline basale (10 U, titrée) | après échec de la trithérapie ou de l'aGLP1, en gardant la metformine (avis 16 bis et 17) | 7,5 % | −0,8 kg | 0 | Ajouter un iSGLT2 (empagliflozine 10 mg) → 7,1 %, −3,0 kg |
| 2 · acceptable | Ajouter un iSGLT2 (empagliflozine 10 mg) | option orale, effet modéré sur l'HbA1c (avis 16 et 19) | 8,4 % | −2,1 kg | 0 | — |
| 4 · à éviter | Renforcer les mesures hygiéno-diététiques seules | seules, insuffisantes si l'HbA1c est à plus d'un point de la cible (à associer) (avis 4 et 8) | 8,4 % | −5,8 kg | 0 | — |
| 4 · à éviter | Monter la metformine à 3 g/j | n'apporte que peu par rapport à 2 g/j, plus de troubles digestifs (avis 8) | 9,4 % | +0,0 kg | 0 | — |
| 5 · erreur | Ne rien changer | HbA1c au-dessus de la cible : inertie thérapeutique (avis 5) | 9,5 % | +0,0 kg | 0 | — |

### Basale à 0,7 U/kg + metformine (64 ans, IMC 37, HbA1c 8,6 %)

Cible SFD : HbA1c ≤ 7,0 %.

| Rang | Option | Pourquoi (SFD 2025) | HbA1c à 6 mois | Poids | Hypoglycémies | Puis (à 12 mois) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 · recommandé | Ajouter le sémaglutide (paliers jusqu'à 1 mg/sem) | obésité, préféré aux bolus sous basale, HbA1c > cible + 1 point (avis 10, 11, 14, 19) | 7,0 % | −4,7 kg | 1 | — |
| 1 · recommandé | Ajouter ou passer au tirzépatide (paliers jusqu'à 10 mg/sem) | le plus efficace sur l'HbA1c et le poids (non remboursé en 2025) (avis 6 bis, 10, 14) | 6,5 % | −8,5 kg | 2 | — |
| 1 · recommandé | Ajouter un iSGLT2 (empagliflozine 10 mg) | premier choix en ajout à la metformine (avec aGLP1 et tirzépatide) (avis 10) | 8,0 % | −2,2 kg | 0 | Ajouter le sémaglutide (paliers jusqu'à 1 mg/sem) → 6,7 %, −7,2 kg |
| 2 · acceptable | Ajouter un bolus au repas principal (4 U, titré) | possible, mais l'aGLP1 ou le tirzépatide est préféré (avis 19) | 7,1 % | +1,3 kg | 1 | — |
| 2 · acceptable | Ajouter un iDPP4 (sitagliptine) | deuxième rang après iSGLT2 et aGLP1 ; meilleure tolérance (avis 10) | 8,6 % | +0,0 kg | 0 | — |
| 3 · possible, moins bon | Passer en basal-bolus en ambulatoire (bolus 4 U à chaque repas, titrés) | l'aGLP1 ou un seul bolus d'abord (avis 19) | 6,8 % | +1,5 kg | 3 | — |
| 4 · à éviter | Renforcer les mesures hygiéno-diététiques seules | seules, insuffisantes si l'HbA1c est à plus d'un point de la cible (à associer) (avis 4 et 8) | 8,0 % | −6,1 kg | 0 | — |
| 4 · à éviter | Monter la metformine à 3 g/j | n'apporte que peu par rapport à 2 g/j, plus de troubles digestifs (avis 8) | 8,5 % | +0,0 kg | 0 | — |
| 5 · erreur | Augmenter la basale de 20 % | glycémie à jeun déjà dans la cible : sur-basalisation (avis 19) | 8,4 % | +0,5 kg | 0 | — |
| 5 · erreur | Ne rien changer | HbA1c au-dessus de la cible : inertie thérapeutique (avis 5) | 8,6 % | +0,0 kg | 0 | — |
| 5 · erreur | Ajouter un sulfamide (gliclazide LM 60 mg) | pas de sulfamide sous insuline (avis 18 ter) | 8,6 % | +0,6 kg | 0 | — |

### Personne âgée fragile (82 ans, DFG 38, metformine 1 g, HbA1c 8 %)

Cible SFD : HbA1c ≤ 8,0 %.

| Rang | Option | Pourquoi (SFD 2025) | HbA1c à 6 mois | Poids | Hypoglycémies | Puis (à 12 mois) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 · recommandé | Ajouter un iSGLT2 (empagliflozine 10 mg) | protection cardiaque et rénale, quel que soit l'HbA1c (effet glycémique réduit) (avis 12 ter et 13) | 7,8 % | −1,4 kg | 0 | — |
| 1 · recommandé | Ajouter un iDPP4 (sitagliptine) | personne âgée fragile ou dépendante : metformine + iDPP4 à privilégier (avis 21 bis) | 7,7 % | +0,0 kg | 0 | — |
| 1 · recommandé | Ne rien changer | objectif atteint : poursuivre, réévaluer à 3–6 mois (avis 5) | 8,0 % | +0,0 kg | 0 | — |
| 2 · acceptable | Ajouter le sémaglutide (paliers jusqu'à 1 mg/sem) | insuffisance cardiaque ou maladie rénale : l'iSGLT2 d'abord, l'aGLP1 ensuite ou en cas d'intolérance (avis 12 ter et 13) | 6,6 % | −3,0 kg | 0 | — |
| 2 · acceptable | Instaurer une insuline basale (10 U, titrée) | analogue lent en une injection si les orales ne suffisent pas (avis 21 bis) | 6,7 % | +0,5 kg | 4 | — |
| 3 · possible, moins bon | Renforcer les mesures hygiéno-diététiques seules | à associer à tout traitement, rarement suffisantes seules (avis 4) | 7,5 % | −3,9 kg | 0 | — |
| 3 · possible, moins bon | Ajouter ou passer au tirzépatide (paliers jusqu'à 10 mg/sem) | expérience très limitée après 75 ans (avis 21 bis) | 6,3 % | −5,2 kg | 0 | — |
| 4 · à éviter | Ajouter un sulfamide (gliclazide LM 60 mg) | patient à risque d'hypoglycémie (avis 16) | 6,9 % | +0,7 kg | 5 (1 sévère) | — |

## 5. Enchaînements de traitements

Patient type : diabète découvert, obèse (56 ans, IMC 33, HbA1c 8,5 %). Chaque étape dure 6 mois ; l'étape suivante s'ajoute à la précédente.

| Enchaînement | Étapes (HbA1c, poids cumulé, hypoglycémies) | À la fin |
| --- | --- | --- |
| Metformine → iSGLT2 → sémaglutide | Metformine progressive jusqu'à 2 g/j : 7,2 %, −0,9 kg → + iSGLT2 : 6,4 %, −3,2 kg → + sémaglutide : 5,5 %, −8,1 kg | HbA1c 5,5 %, −8,1 kg, 0 hypoglycémie |
| Metformine → sémaglutide → iSGLT2 | Metformine progressive jusqu'à 2 g/j : 7,2 %, −0,9 kg → + sémaglutide : 5,8 %, −5,7 kg → + iSGLT2 : 5,4 %, −8,5 kg | HbA1c 5,4 %, −8,5 kg, 0 hypoglycémie |
| Metformine + sémaglutide d'emblée → iSGLT2 | Metformine progressive + sémaglutide d'emblée : 5,8 %, −5,6 kg → + iSGLT2 : 5,4 %, −8,5 kg | HbA1c 5,4 %, −8,5 kg, 0 hypoglycémie |
| Metformine → tirzépatide | Metformine progressive jusqu'à 2 g/j : 7,2 %, −0,9 kg → + ou passer au tirzépatide : 5,4 %, −9,1 kg | HbA1c 5,4 %, −9,1 kg, 0 hypoglycémie |
| Metformine → iDPP4 → sulfamide → insuline basale | Metformine progressive jusqu'à 2 g/j : 7,2 %, −0,9 kg → + iDPP4 : 6,7 %, −1,0 kg → + sulfamide : 6,3 %, +0,1 kg, 2 hypo → Instaurer une insuline basale : 6,7 %, −0,3 kg, 1 hypo | HbA1c 6,7 %, −0,3 kg, 3 hypoglycémies |
| Metformine → sulfamide → insuline basale → bolus | Metformine progressive jusqu'à 2 g/j : 7,2 %, −0,9 kg → + sulfamide : 6,5 %, +0,1 kg, 1 hypo → Instaurer une insuline basale : 7,0 %, −0,0 kg, 1 hypo → + bolus au repas principal : 6,9 %, +0,3 kg, 1 hypo | HbA1c 6,9 %, +0,3 kg, 3 hypoglycémies |
| Metformine → insuline basale → sémaglutide | Metformine progressive jusqu'à 2 g/j : 7,2 %, −0,9 kg → Instaurer une insuline basale : 6,9 %, −0,2 kg → + sémaglutide : 5,8 %, −4,8 kg, 4 hypo | HbA1c 5,8 %, −4,8 kg, 4 hypoglycémies |
| Mode de vie seul → metformine → sémaglutide | Renforcer les mesures hygiéno-diététiques seules : 6,5 %, −6,1 kg → Metformine progressive jusqu'à 2 g/j : 5,4 %, −7,5 kg → + sémaglutide : 5,2 %, −12,3 kg | HbA1c 5,2 %, −12,3 kg, 0 hypoglycémie |
| Ne rien faire pendant 1 an | Ne rien changer : 8,5 %, +0,0 kg → Ne rien changer : 8,6 %, +0,0 kg | HbA1c 8,6 %, +0,0 kg, 0 hypoglycémie |

## 6. Limites

- Le modèle reproduit des effets moyens publiés ; il ne prédit pas un patient réel. Les différences entre molécules d'une même classe se limitent aux doses listées.
- La perte de poids sous aGLP1 est calée sur les essais chez le diabétique de type 2 (SUSTAIN 1, 5 et 7, SURPASS-2) : elle est moindre que dans les essais d'obésité sans diabète.
- Les arbres utilisent une titration simplifiée de l'insuline (glycémie à jeun) ; dans le simulateur, la titration suit le protocole du service.
