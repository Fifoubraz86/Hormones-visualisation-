# Patient virtuel : règles et sources

Le simulateur a trois onglets : thyroïde (mode thérapeutique libre, par défaut), diabète de type 2 (mode thérapeutique libre) et cas commentés de thyroïde.

## Sources

| Mention | Source |
| --- | --- |
| « polycopié p. X » | *Polycopié de sémiologie endocrinienne* du CEEDMM, chapitre thyroïde |
| « item 241/242/243 · SFE p. X » | Référentiel EDN SFE/CEEDMM de l'item (export 2021–2022), page du chapitre ; « SFE-N », « SFE-C » : chapitres nodules et cancers de l'item 241 |
| « item 243 · LiSA p. X » | Fiche LiSA de l'item (export du 05/11/2025) |
| « complément » | Ce qui ne figure dans aucune de ces sources |

Les rangs affichés (A, B) sont ceux des grilles d'objectifs des items 241, 242 et 243, tels que résumés dans la mémoire du dossier « Rédaction d'examen ». Un objectif sans rang n'est pas classé dans la grille (par exemple la dose de lévothyroxine pendant la grossesse ou le seuil de traitement d'une forme fruste, qui figurent dans le texte SFE mais pas dans la grille). Le digest ne contient aucun objectif de rang C. **Les règles restent à faire relire par un endocrinologue avant usage en enseignement.**

### Principales corrections apportées d'après les items 242 et 243

- Lévothyroxine : **1 à 1,5 µg/kg/j** (25–75 µg/j si forme fruste) au lieu de 1,6 µg/kg/j ; objectif de TSH **0,5–2,5 mUI/L** ; contrôle 6 à 8 semaines après la dose cible, puis à 6 mois, puis annuel.
- Sujet âgé ou coronarien : paliers de 12,5–25 µg **toutes les 1 à 2 semaines** jusqu'à la dose cible (et non toutes les 6 à 8 semaines) ; TSH tolérée à 4–10 si coronaropathie non contrôlée ; ECG hebdomadaire si coronaropathie grave.
- Insuffisance thyréotrope : T4L **15 à 21 jours** après chaque changement, à jeun avant la prise ; cible entre le milieu et le tiers supérieur de la normale.
- Forme fruste : **TSH > 10 et/ou anti-TPO → traiter** ; TSH < 10 sans anti-TPO → TSH à 6 mois puis annuelle. Le cas « TSH à 7,2 » a désormais des anti-TPO négatifs.
- Grossesse : + 25 à 50 % dès le diagnostic, TSH mensuelle, cible 0,5–2,5 ; traiter dès TSH ≥ 3.
- ATS : doses d'attaque par molécule (carbimazole 20–40, thiamazole 15–30, PTU 200–400 mg/j) ; **NFS de référence puis tous les 10 jours pendant 2 mois** (nouveau conseil à cocher) ; T4L à 3–4 semaines puis TSH tous les 3 mois ; PNN < 0,8 G/L : arrêt, < 0,5 G/L : hospitalisation ; PTU préféré pendant la grossesse (carbimazole tératogène entre 6 et 10 SA).
- Traitement radical : thyroïdectomie après euthyroïdie (sinon crise aiguë thyrotoxique) ; iode 131 contre-indiqué pendant la grossesse, contraception 6 mois, aggrave l'orbitopathie.

## Mode thérapeutique (`js/simu/sandbox.js`)

Pas de correction : un patient, une ordonnance libre, des bilans à la date choisie.

- **Situations** : hypothyroïdie primaire (Hashimoto, y compris forme fruste), thyroïdectomie totale, insuffisance thyréotrope, maladie de Basedow, nodule toxique ou goitre multinodulaire toxique, thyroïdite subaiguë de De Quervain ou du post-partum, thyrotoxicose gestationnelle transitoire.
- **Calage du patient** sur la valeur de départ saisie, par dichotomie sur le modèle à l'équilibre : fonction thyroïdienne résiduelle pour la TSH initiale (Hashimoto), taux de TRAb (Basedow), autonomie nodulaire (nodule toxique), réservoir de lyse (thyroïdite, patient vu 7 jours après le début), amplitude de la stimulation par l'hCG (gestationnelle, pic à 10 SA), réserve hypophysaire (insuffisance thyréotrope). Thyroïdectomie : patient euthyroïdien à J0, plus aucun tissu ni stock thyroïdien.
- **Gestes radicaux** (Basedow, nodule toxique) : thyroïdectomie totale, lobectomie (adénome toxique), iode 131 (effet en 1 à 3 mois ; hypothyroïdie définitive fréquente dans le Basedow, rare après un adénome toxique ; élévation des TRAb ; refusé pendant la grossesse). Une thyroïdectomie en pleine hyperthyroïdie (T4L > 30 pmol/L) déclenche une crise aiguë thyrotoxique.
- **Examens qualitatifs** : anti-TPO, CRP, échographie et scintigraphie, dont le résultat dépend de la situation et de l'état du patient (hyperfixation diffuse, nodule hyperfixant extinctif, « damier », scintigraphie blanche, contre-indication pendant la grossesse…).
- **Thyroïdite** : la lyse vide un réservoir propre (hormones des follicules détruits) ; les ATS, qui bloquent la synthèse, n'agissent pas ; la synthèse détruite récupère en 2 à 3 mois (De Quervain) ou en 3 mois et plus (post-partum, avec hypothyroïdie persistante dans 30 % des tirages). AINS ou corticoïdes : soulagent la douleur et accélèrent la baisse de la CRP.
- **Lévothyroxine** : dose moyenne hebdomadaire (schéma alterné possible), rapportée à la dose substitutive complète de 1,6 µg/kg/j. Conditions de prise : à jeun 100 %, au petit-déjeuner 80 %, sous IPP 85 %, avec fer ou calcium 60 % (ordres de grandeur, complément).
- **Grossesse** : besoins multipliés progressivement jusqu'à 1,4 entre 4 et 16 SA, retour à 1 à l'accouchement (40 SA).
- **Basedow** : évolution des TRAb favorable (demi-vie ≈ 100 jours, rémission à l'arrêt) ou défavorable (TRAb persistants, rechute à l'arrêt), choisie ou tirée au sort.
- **Patient réel** : absorption de la LT4 (80–115 %), sensibilité aux ATS (× 0,6 à 1,6) et cinétique des TRAb tirées au sort et cachées ; dans la thyroïdite, la fonction résiduelle continue de baisser (≈ 10 % par an).
- Bruit analytique de ± 4 % sur chaque dosage. « Annuler la dernière étape » restaure l'état exact avant la prescription.

## Événements indésirables (`js/simu/adverse.js`, mode thérapeutique)

Ils surviennent sans correction : le temps s'arrête au jour de l'événement (consultation non programmée, bilan prévu annulé), avec les examens faits en urgence. L'interne décide de la suite.

**Coronaropathie sous lévothyroxine** (hypothyroïdie primaire, thyroïdectomie, insuffisance thyréotrope ; case « coronaropathie connue », ou coronaropathie latente à partir de 75 ans). Le risque dépend de la vitesse de remontée de la T3 sur 7 jours (normalisée) :

| Schéma (coronarien de 80 ans, 70 kg, TSH 60) | Hausse de T3 par semaine | Événement |
| --- | --- | --- |
| 12,5–25 µg puis + 12,5–25 µg toutes les 1–2 semaines | 0,03–0,07 | aucun |
| 50 µg d'emblée | ≈ 0,085 | aucun (limite) |
| palier de 50 µg, ou 75 µg d'emblée | 0,10–0,14 | angor d'effort (seuil 0,09) |
| 100 µg d'emblée | ≈ 0,19 | syndrome coronarien aigu (seuil 0,16) ; la cardiologie suspend la lévothyroxine |

Surdosage (T3 > 1,35 fois la normale) chez un coronarien connu : angor. Sans coronaropathie connue, après 75 ans : seuils × 1,6. Patient réel : seuils × 0,75 à 1,3, cachés. Ces seuils sont un choix de modélisation (complément) ; le principe vient de l'item 243 (SFE p. 5, 11-12 : la coronaropathie peut être démasquée par le traitement).

**Antithyroïdiens de synthèse** (Basedow, nodule toxique ; réglage à la création du patient) : fréquences du référentiel (éruption 6 %, arthralgies 2 %, neutropénie modérée 3 %, agranulocytose 0,35 % ×1,5 si ≥ 30 mg/j de carbimazole, hépatite 0,3 % sous imidazolés et 0,5 % sous PTU), mode entraînement (un effet tiré au sort parmi agranulocytose, hépatite, urticaire, neutropénie) ou effet imposé.

| Effet | Délai (complément) | Présentation | Si l'ATS est poursuivi | À l'arrêt |
| --- | --- | --- | --- | --- |
| Agranulocytose | J21–J70 | fièvre, angine ; PNN ≈ 0,3 G/L | choc septique à J+3, réanimation, arrêt imposé | PNN normalisés en 2–3 semaines ; toute reprise d'un ATS, même d'une autre molécule, la reproduit en 5 jours |
| Hépatite | J14–J56 | cholestatique sous imidazolés (ictère, PAL, bilirubine) ; cytolytique sous PTU (ALAT ≈ 10–20 N) | aggravation à J+14, hospitalisation, arrêt imposé | normalisation en 4 à 8 semaines |
| Urticaire | J7–J21 | éruption prurigineuse sans fièvre | persiste | disparaît 7 jours après l'arrêt ou le changement de molécule |
| Neutropénie modérée | J14–J42 | PNN ≈ 1,2 G/L à la NFS, asymptomatique | persiste | se corrige |
| Arthralgies | J14–J42 | signalées au bilan suivant | persistent | disparaissent |

La thyrotoxicose elle-même abaisse un peu les polynucléaires et élève les transaminases (item 242, SFE p. 5-6) : d'où l'intérêt de la NFS et du bilan hépatique de référence. Nouveaux examens : bilan hépatique, ECG.

## Diabète de type 2 (`js/simu/dt2-model.js`, `js/simu/dt2.js`)

Même principe que la thyroïde : on crée le patient, on prescrit librement, on choisit la date du bilan ; aucune correction. Onglet « Diabète de type 2 » ou `simulateur.html#dt2`.

**Modèle.** Action de l'insuline IA = (réserve insulinique B × effets des sulfamides et des incrétines + insuline injectée) × sensibilité Si × effet de la metformine ; glycémie moyenne = 0,95 + 0,45 × (1/IA − 1)^0,6 g/L ; iSGLT2 et acarbose retirent une part de l'excès de glucose (iSGLT2 selon le DFG) ; HbA1c par la formule ADAG, constante de temps 40 jours. B est calée sur l'HbA1c initiale et décline chaque année (échec secondaire) ; une perte de poids importante la restaure en partie si le diabète est récent (DiRECT). Si dépend du profil, de l'IMC, du poids et de l'activité ; une hyperglycémie forte freine la sécrétion (glucotoxicité réversible). **Les paramètres sont calés sur un référentiel d'effets publiés** (méta-analyses et essais : Hirst, Sherifali, Garber, Kim, SUSTAIN 1, LEAD-3, EMPA-REG RENAL, Cochrane, Treat-to-Target, Umpierre, Look AHEAD, DiRECT) : voir [`referentiel-effets.md`](referentiel-effets.md) et `node tools/calib-dt2.js`. Repères (contre témoin, HbA1c 8–8,7 %) : metformine 2 g ≈ − 1,1 (ajout à l'insuline − 0,7), gliclazide LM ≈ − 1,6 quelle que soit la dose, sitagliptine ≈ − 0,5 (− 0,8 en Asie de l'Est), sémaglutide 1 mg ≈ − 1,4 et − 3,3 kg, empagliflozine 25 mg ≈ − 0,7 (− 0,5 à DFG 45, nul sous 20), acarbose ≈ − 0,8, insuline basale titrée sur une glycémie à jeun ≤ 1,00 g/L ≈ HbA1c 6,8 % avec 0,45 U/kg.

**Calage sur l'HbA1c saisie.** L'HbA1c saisie, sous le traitement en cours, est une donnée du patient : le modèle ajuste sa physiologie cachée pour la reproduire exactement, à l'équilibre (pas de dérive sans changement de traitement). Il cale d'abord le poids d'équilibre sous ce traitement, puis la réserve insulinique ; si même une réserve minimale donnerait une HbA1c plus basse (fortes doses d'insuline, par exemple 8,6 % sous 0,7 U/kg), c'est la sensibilité à l'insuline qui est abaissée (insulinorésistance majeure, affichée dans « Révéler le patient »). La réponse aux changements de traitement dépend ensuite de cette physiologie et, en mode patient réel, de réponses individuelles cachées (metformine, aGLP1, perte de poids, déclin de la réserve, observance).

**Facteurs prédictifs de réponse saisis à la création** (complément, littérature) : profil (DT2 insulinorésistant, insulinopénique, du sujet âgé, LADA, MODY HNF1A, MODY GCK), IMC, HbA1c initiale, ancienneté du diabète (moins de réserve insulinique à HbA1c égale), DFG et albuminurie, origine (Asie de l'Est : incrétines × 1,8, Kim 2013), observance, rétinopathie, insuffisance cardiaque, maladie cardiovasculaire, antécédent de pancréatite ou de CMT familial, mycoses récidivantes, repas irréguliers, régime cétogène. Patient réel : réponses individuelles cachées (metformine, aGLP1, perte de poids, sensibilité digestive, observance, déclin β).

**Événements** (seuils et délais : complément ; principes : item 247, LiSA p. 7-8, 10-12) :

| Situation | Conséquence simulée |
| --- | --- |
| Sulfamide ou insuline avec glycémie basse ; âge ≥ 75 ans, DFG < 45, repas irréguliers | hypoglycémies notées au carnet ; hypoglycémie sévère (consultation non programmée ; glucagon contre-indiqué sous sulfamide) |
| Metformine augmentée trop vite (ex. 2 g d'emblée) | diarrhée, puis arrêt par le patient à J+18 si la dose n'est pas réduite |
| Metformine avec DFG < 30 pendant plus d'un mois | acidose lactique, réanimation |
| aGLP1 : palier sauté ou montée plus rapide que 4 semaines (1 semaine pour le liraglutide) | nausées ; deux paliers d'avance : vomissements, insuffisance rénale fonctionnelle, arrêt de l'injection |
| iSGLT2 | baisse initiale du DFG de 3 mL/min ; mycose génitale (antécédent) ; acidocétose euglycémique si insulinopénie (réserve < 20 %, LADA) ou régime cétogène, relais par insuline basale |
| Incrétine et antécédent de pancréatite | pancréatite aiguë (lipase 12 N) |
| Rétinopathie sévère ou proliférante et HbA1c baissant de ≥ 1,5 point en moins de 3 mois | hémorragie intravitréenne |
| Réserve insulinique < 10 % sans insuline | cétose (LADA) |
| Âge ≥ 75 ans et glycémie moyenne > 3,8 g/L | coma hyperosmolaire |

**Patient déjà traité.** Section « Traitement en cours » à la création (et exemples : metformine seule, bithérapie, trithérapie orale, metformine + aGLP1 + iSGLT2, insuline basale + metformine) : l'HbA1c saisie est celle obtenue sous ce traitement, la réserve insulinique est calée en conséquence, le poids saisi est le poids actuel, et l'aGLP1 est considéré comme déjà titré.

**Metformine.** Effet × 1,75 sur l'action de l'insuline à 2 g/j (≈ −1,3 point depuis 8,5 %), × 1,9 à 3 g/j (≈ −1,5) ; indépendant du poids. Case « introduction progressive » (cochée par défaut) : + 500 mg par semaine jusqu'à la dose prescrite, sans intolérance (sauf 8 % de malchance en mode patient réel). Dose pleine d'emblée : diarrhée puis arrêt par le patient à J18, signalé par un bandeau et un dessin.

**Règles hygiéno-diététiques.** Mode de vie de départ : activité (min/sem), boissons sucrées (verres de 25 cL/j), grignotage, motivation (atteinte des objectifs : 30, 55 ou 80 % ; × 1,25 avec un suivi diététique ; cachée et variable en mode patient réel). Prescription : objectif d'activité, arrêt des boissons sucrées, objectif de perte de poids (%), suivi diététique. Effets (calés sur Umpierre 2011, Look AHEAD, DiRECT ; voir le référentiel) : sensibilité à l'insuline + 30 % à 150 min/sem d'activité (effet seuil), + 38 % à 300 ; sensibilité ∝ (poids initial / poids)^1,5, gains de l'activité et du poids moins qu'additifs ; récupération de la réserve insulinique après perte de poids si le diabète a moins de 6 ans ; chaque verre de soda quotidien ajoute ≈ 0,035 g/L de glycémie moyenne (complément) ; perte de poids hygiéno-diététique plafonnée à 12 %. Ordres de grandeur à 6 mois (DT2 obèse de 1 an, HbA1c 8,5, sédentaire, 4 sodas/j, grignotage) : − 7 % de poids avec une motivation moyenne ≈ − 0,9 point ; toutes les mesures avec suivi diététique ≈ − 2,1 (motivation moyenne) à − 2,7 points (forte, proche de la rémission). La carte « Marge de progression » compare la situation aux repères de l'item 253 (≥ 150 min/sem d'activité, perte de 5 à 10 % en 6 à 12 mois, 1 à 2 kg/mois) et simule l'HbA1c à 6 mois sans changement, avec la motivation du patient, et avec 100 % des objectifs tenus.

**Prise de position SFD 2025** (`js/simu/sfd.js` ; Darmon P et al. Med Mal Metab 2025;19:630-662). La cible d'HbA1c affichée dans les bilans, le graphique et le trophée est celle du tableau I, individualisée selon l'âge, le statut gériatrique au-delà de 75 ans (bonne santé, fragile, dépendant), l'espérance de vie ou une comorbidité sévère, le DFG et le traitement (plancher sous SU, glinide ou insuline). L'encart « Lecture SFD 2025 de l'ordonnance en cours » confronte l'ordonnance aux avis, sans rien bloquer : protection d'organe quel que soit l'HbA1c (avis 11 à 15), metformine en première intention et doses selon le DFG (avis 8, 9, 12 bis), ordre de préférence des bithérapies et des intensifications (avis 10, 16, 16 bis, 17), sulfamides à éviter chez le patient à risque d'hypoglycémie et arrêtés sous insuline (avis 16, 18 ter, 21 bis), iDPP4 + aGLP1 redondants (avis 20), échec de la basale et sur-basalisation au-delà de 0,5 U/kg (avis 19), personne âgée (avis 21 bis), règles d'arrêt à 3–6 mois si la baisse d'HbA1c est inférieure à 0,5 % (avis 5), rétinopathie (avis 6 bis, 8 bis). Le tirzépatide (AR GIP/GLP-1) est prescriptible, calé sur SURPASS-2.

**Insulinothérapie.** Basale (glargine U100 ou U300, dégludec, NPH ; analogues d'action très prolongée : hypoglycémies × 0,7, NPH × 1,4) et analogue rapide par repas. **L'initiation hors recommandations est refusée** : basale de départ au plus 10 U ou 0,2 U/kg/j (6 à 10 U/j ou 0,1 à 0,2 U/kg/j, SFD 2025, avis 18) ; bolus de départ au plus 4 U, 0,1 U/kg ou 10 % de la basale (complément, ADA). Entre deux consultations, la titration suit le protocole d'adaptation des doses d'insuline du service (version 3.0), appliquée par le patient (85 % des décisions suivies en mode patient réel), par une IDE, ou pas du tout : objectifs par profil (standard : réveil et avant les repas 0,80–1,20 g/L, coucher 1,00–1,40 ; fragile 1,00–1,40 ; dépendant 1,20–2,00), pas de 1 U sous 10 U et de 2 U au-delà (option SFD : 10 % au-delà de 40 U), hausse après 2 ou 3 jours de suite au-dessus de l'objectif, baisse dès l'injection suivante en cas d'hypoglycémie ou de glycémie sous l'objectif ; la basale se juge sur le réveil, chaque bolus sur la glycémie avant le repas suivant. Les doses atteintes deviennent le point de départ de l'ordonnance suivante. Sécurités : après une baisse, double baisse en cas d'hypoglycémie et pas de hausse de cette dose pendant 7 jours ; dose maximale sans avis médical de + 50 % de la dose prescrite (au moins + 6 U), au-delà le patient appelle (complément). La basale freine surtout la production hépatique : au-delà d'environ 0,5 U/kg son effet sur la glycémie moyenne sature alors qu'elle continue d'abaisser la glycémie à jeun (sur-basalisation) ; l'action d'un bolus dure 4 à 5 h et abaisse la glycémie avant le repas suivant.

**Export du suivi.** Bouton « Exporter le suivi » (carte du patient) : fichier JSON avec le patient, sa physiologie cachée, les réglages, chaque consultation (bilans, carnet, statistiques AGP, titration), la titration jour par jour et la courbe quotidienne du modèle ; à défaut de téléchargement, texte à copier.

**Objectifs et surveillance.** L'objectif d'HbA1c peut être fixé avec le patient (6,5 à 9 %) ; sinon la cible SFD calculée s'applique ; un objectif plus strict que la cible sous traitement hypoglycémiant, sous le plancher, ou plus lâche, est signalé. Les objectifs glycémiques de la titration (réveil, avant les repas, coucher, 2 h après les repas) sont pré-remplis selon le type de patient du protocole et modifiables ; les bolus s'adaptent sur la glycémie avant le repas suivant ou sur la glycémie post-prandiale (autosurveillance 6 fois par jour ou capteur exigés). Prescriptions refusées : autosurveillance capillaire sans traitement hypoglycémiant (sulfamide, glinide, insuline) ; plus de 200 bandelettes par an (≈ 4 mesures par semaine) hors insuline (règle HAS donnée par l'auteur ; la source officielle à jour n'a pas été retrouvée en ligne) ; capteur sans insuline, ou sous insuline en moins de 3 injections par jour (basale seule comprise) avec une HbA1c ≤ 8 % (extension LPPR 2023 du FreeStyle Libre 2 ; à 3 injections par jour ou plus, sans condition ; l'indication est acquise dès qu'elle a existé (une HbA1c > 8 % sous insuline, ou 3 injections par jour), même si le capteur n'avait pas été prescrit ce jour-là, et ne se perd pas quand l'HbA1c repasse sous 8 %). Sous capteur, la surveillance bascule sur le capteur (carnet relevé sur le capteur, rapport AGP) et l'autosurveillance capillaire s'arrête ; titration de l'insuline sans autosurveillance ni capteur. Repères HAS 2024 (stratégie thérapeutique du DT2) ajoutés au référentiel.

**Carnet et rapport AGP** (`js/simu/glyco.js`). Chaque jour, un profil glycémique de 24 h est reconstruit à partir du modèle : niveau de fond (glycémie à jeun, phénomène de l'aube, élévation diurne), excursions des trois repas (réduites par les incrétines et l'acarbose), effet local de chaque bolus (d'abord l'excursion de son repas, puis l'intervalle jusqu'au repas suivant, le surplus creusant une hypoglycémie), bruit lent et variabilité d'un jour à l'autre (plus forte si repas irréguliers ou observance moyenne). La moyenne sur 24 h égale la glycémie moyenne du modèle, si bien que l'HbA1c, le GMI et le carnet restent cohérents. Les hypoglycémies tirées par le modèle se placent au creux du profil ; un creux spontané sous 0,60 g/L en est une aussi. Examens : « Carnet glycémique » (14 derniers jours, mesures selon la fréquence d'autosurveillance prescrite : 1, 2, 4 ou 6 par jour, cases colorées selon les objectifs du protocole, malaises notés) et « Rapport AGP », joint automatiquement à chaque bilan dès qu'un capteur est prescrit (sur les jours depuis la pose) (point toutes les 15 min, trous de capteur ; statistiques, barre des plages, courbe des percentiles 5–25–50–75–95, profils quotidiens ; cibles du tableau II de la SFD, cas général ou sujet âgé/à haut risque). Chacun s'accompagne d'une méthode de lecture (Czupryniak L et al. Diabetes Ther 2022;13:811 pour l'AGP) et d'une proposition d'interprétation repliée, à ouvrir après avoir lu soi-même.

**Rétinopathie.** Rétinopathie sévère ou proliférante : hémorragie intravitréenne si l'HbA1c baisse de 2 points en 3 mois, de 1,5 point sous aGLP1, tirzépatide ou insuline (aggravation précoce, SUSTAIN-6 ; complication non spécifique de la classe, SFD 2025, avis 6 bis), de 3,5 points après photocoagulation panrétinienne (case « adresser en ophtalmologie ») ; en mode patient réel, une rétinopathie proliférante non traitée peut aussi saigner d'elle-même.

**Humour noir.** Chaque événement s'accompagne d'un dessin légendé (coma hypoglycémique, toilettes de la metformine, seau de l'aGLP1, haleine de pomme de l'acidocétose, raisin sec du coma hyperosmolaire, citron de l'acidose lactique, pancréas en feu, œil injecté, cœur brisé, fantôme de l'agranulocytose, trophée si la cible est atteinte sans hypoglycémie). Décès possibles : deuxième hypoglycémie sévère en moins de 4 mois sans allègement du traitement chez un patient de 70 ans ou plus ou avec un DFG < 45 ; acidose lactique après 75 ans ou récidivante ; coma hyperosmolaire après 85 ans ou glycémie > 4,5 g/L ; thyroïde : deuxième choc septique sur agranulocytose, reprise de la lévothyroxine par un palier de plus de 25 µg après un syndrome coronarien aigu. Le décès affiche un cimetière avec épitaphe ; « Ressusciter » annule la dernière ordonnance.

Examens : HbA1c, glycémie à jeun, carnet d'autosurveillance (glycémies et hypoglycémies depuis le dernier bilan), créatinine (DFG), albuminurie, peptide C, anti-GAD, cétonémie, lipase, fond d'œil. Encarts « Facteurs prédictifs de réponse », « Référentiel (item 247) » avec les rangs de la grille, et « Référentiel d'effets (littérature) » : effet publié, source, et valeur produite par le modèle sur le même essai.

## Arbre des décisions et guide du modèle

- **Arbre des décisions pour ce patient** (`js/simu/dt2-tree.js`, carte du mode DT2) : chaque option possible au moment présent est classée de la meilleure à la pire selon la SFD 2025 (rang 1 recommandé à 5 erreur, avec l'avis cité), puis simulée 6 mois sur le patient affiché ; pour les trois meilleures branches encore au-dessus de la cible, l'étape suivante la mieux classée est simulée jusqu'à 12 mois.
- **Guide du modèle** (`js/simu/dt2-guide.js`, carte du mode DT2, et [`guide-modele-dt2.md`](guide-modele-dt2.md) généré par `node tools/guide-dt2.js`) : pour chaque traitement, ce que fait le modèle et avec quels paramètres, ce qui module la réponse, ce que l'on obtient, la tolérance ; pour chaque situation, son effet ; arbres de six patients types ; enchaînements de traitements simulés.
- Sans sulfamide ni insuline, la glycémie moyenne ne descend pas sous 1,02 g/L (HbA1c ≈ 5,2 %).

## Cas guidé : initier une insuline basale (`js/simu/dt2-case.js`)

Onglet « Cas commentés », ou `simulateur.html#cas-insuline`. M. L., 62 ans, IMC 31, DT2 depuis 14 ans, metformine + gliclazide + sitagliptine, HbA1c 9,4 % (patient théorique du modèle DT2, reproductible). Quatre temps : (1) lecture de son carnet sous sulfamide (4 mesures par semaine) puis ordonnance d'initiation : dose de départ, insuline, metformine, sulfamide, iDPP4, qui titre, objectif au réveil, délai d'augmentation, autosurveillance, capteur ; (2) J14 : il n'a pas osé adapter la dose, carnet à lire et dose du soir à décider ; (3) M3 : HbA1c, carnet (et AGP si capteur), lecture puis intensification ; (4) M9 : évolution sous la décision et débriefing noté sur 20. Les affirmations à cocher sur les carnets sont jugées sur les valeurs affichées (pas de corrigé figé) ; les décisions sont corrigées selon la SFD 2025 (avis 14, 18, 18 bis, 18 ter, 19, 20, 23), la LPPR (capteur) et le protocole du service. Une erreur coûte 2 points (dose de départ excessive : 3, le senior la ramène à 10 U), une décision discutable 1 point, une affirmation mal jugée 0,5 point.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `js/simu/model.js` | Modèle du patient, intégré jour par jour : stock intrathyroïdien, T4, T3, TSH (avec mémoire du freinage), TRAb, poids, polynucléaires. Équivalences : 10 mg de carbimazole ≈ 6 mg de thiamazole ≈ 100 mg de PTU. |
| `js/simu/rules.js` | Moteur de correction : examens, molécule, dose, bêtabloquant, conseils, délai du contrôle, contenu du bilan suivant. Une remarque « discutable » coûte 1 point, une « erreur » 2 (certaines fautes graves davantage). |
| `js/simu/cases.js` | Les huit cas : patient, interrogatoire, examen, grille des examens initiaux, diagnostic, événements intercurrents, messages clés. |
| `js/simu/chart.js` | Petits multiples : T4L, TSH (log), ATS, lévothyroxine. Courbe réelle révélée au débriefing. |
| `js/simu/ui.js` | Cas commentés : déroulé des consultations et débriefing. |
| `js/simu/sandbox.js` | Mode thérapeutique libre. |
| `js/simu/dt2-model.js` | Modèle du diabète de type 2 (paramètres calés `P`, rejeu des essais `replay`). |
| `js/simu/sfd.js` | Prise de position SFD 2025 : cible individualisée, lecture de l'ordonnance, initiation de l'insuline, repères. |
| `js/simu/glyco.js` | Profil glycémique de 24 h, carnet, capteur et rapport AGP, titration de l'insuline selon le protocole du service, lectures guidées. |
| `js/simu/dt2-tree.js` | Arbre des décisions : options classées selon la SFD 2025 et simulées. |
| `js/simu/dt2-guide.js` | Guide didactique du modèle (traitements, situations). |
| `tools/guide-dt2.js` | Génère `docs/guide-modele-dt2.md`. |
| `js/simu/dt2-case.js` | Cas guidé d'initiation de l'insuline basale, carnets à interpréter. |
| `js/simu/dt2-ref.js` | Référentiel d'effets publiés (traitement, situation, effet, source, essai virtuel de calibration). |
| `tools/calib-dt2.js` | Banc de calibration : `node tools/calib-dt2.js` (contrôle), `--md` (tableau du référentiel). |
| `js/simu/dt2.js` | Mode thérapeutique du diabète de type 2 (patient, ordonnance, événements, graphique, référentiel). |
| `js/simu/toons.js` | Dessins des événements (SVG). |
| `js/simu/adverse.js` | Événements indésirables du mode thérapeutique : coronaropathie sous lévothyroxine, effets des ATS. |
| `js/simu/main.js` | Choix du mode (onglets). |

## Règles appliquées par le moteur de correction (cas commentés)

Chaque remarque affichée cite sa source ; le détail est dans `js/simu/rules.js`.

**Maladie de Basedow** (item 242)
- Avant l'ATS : NFS et bilan hépatique de référence ; information sur l'agranulocytose (fièvre ou angine → NFS en urgence) ; NFS tous les 10 jours pendant 2 mois ; contraception ; arrêt du tabac et avis ophtalmologique si orbitopathie (sous 48 h si signes de gravité).
- Attaque : carbimazole 20–40, thiamazole 15–30, PTU 200–400 mg/j (grossesse : dose minimale). PTU hors grossesse : non (thiouraciles hépatotoxiques). Propranolol si FC ≥ 90/min, contre-indiqué chez l'asthmatique (complément).
- T4L à 3–4 semaines (TSH seule = erreur au début), puis toutes les 4–6 semaines pendant l'adaptation (complément), TSH tous les 3 mois en entretien. Augmenter la dose sur une TSH basse avec T4L et T3L normales = erreur.
- T4L normale → réduction par paliers jusqu'à 5–10 mg/j (complément) ; hypothyroïdie iatrogène (T4L basse ou TSH > 4) → réduction ou « block and replace ».
- Cure de 12 à 18 mois ; TRAb en fin de cure ; rechute → chirurgie, iode 131 ou ATS faible dose au long cours.
- Agranulocytose : contre-indication définitive à tous les ATS. Thyroïdectomie après euthyroïdie ; iode 131 contre-indiqué pendant la grossesse et à éviter en cas d'orbitopathie.
- Grossesse : PTU (carbimazole tératogène entre 6 et 10 SA), T4L à la limite supérieure de la normale, contrôle toutes les 2–4 semaines, TRAb à doser.

**Lévothyroxine** (item 243)
- 1 à 1,5 µg/kg/j (1 à 1,6 accepté ; 1,6 à 1,8 discutable) ; forme fruste 25–75 µg/j ; sujet âgé ou coronarien : 12,5–25 µg/j puis paliers de 12,5–25 µg toutes les 1 à 2 semaines jusqu'à ≈ 1 µg/kg/j, puis TSH à 6–8 semaines.
- Suivi sur la TSH seule (T3L inutile, polycopié p. 22 ; anti-TPO à ne pas redoser, p. 23 ; pas de scintigraphie) : 6–8 semaines après la dose cible, puis 6 mois, puis annuel. Objectif 0,5–2,5 mUI/L (0,4–4 accepté) ; jusqu'à 10 chez le sujet très âgé ou coronarien.
- Besoins augmentés : chercher une malabsorption (fer, calcium, IPP…) avant d'augmenter la dose.
- Grossesse : + 25 à 50 % dès le diagnostic, TSH mensuelle, cible 0,5–2,5 ; retour à la dose antérieure après l'accouchement (complément).
- Insuffisance thyréotrope : axe corticotrope évalué avant la lévothyroxine (complément) ; suivi sur la T4L à 15–21 jours, cible 16–22 pmol/L ; jamais sur la TSH.
- Forme fruste : confirmer (un seul dosage ne suffit pas) ; traiter si TSH > 10 et/ou anti-TPO ; sinon TSH à 6 mois puis annuelle.

## Limites du modèle

Cinétiques et valeurs illustratives, normes indicatives (T4L 12–22 pmol/L, T3L 3,1–6,8 pmol/L, TRAb < 1,8 UI/L selon la trousse). Pas de variabilité interindividuelle au-delà des paramètres de chaque cas ; bruit analytique de ± 4 %. La rechute après arrêt est modélisée (paramètre `relapse`) et utilisée en mode thérapeutique (évolution défavorable des TRAb). Le modèle ne simule pas l'orbitopathie ; l'angor et les effets des ATS sont des événements déclenchés par des seuils et des tirages (voir plus haut), pas une physiologie fine.
