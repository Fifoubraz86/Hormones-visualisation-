# Patient virtuel : règles et sources

Le simulateur a deux modes : thérapeutique libre (par défaut) et cas commentés.

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

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `js/simu/model.js` | Modèle du patient, intégré jour par jour : stock intrathyroïdien, T4, T3, TSH (avec mémoire du freinage), TRAb, poids, polynucléaires. Équivalences : 10 mg de carbimazole ≈ 6 mg de thiamazole ≈ 100 mg de PTU. |
| `js/simu/rules.js` | Moteur de correction : examens, molécule, dose, bêtabloquant, conseils, délai du contrôle, contenu du bilan suivant. Une remarque « discutable » coûte 1 point, une « erreur » 2 (certaines fautes graves davantage). |
| `js/simu/cases.js` | Les huit cas : patient, interrogatoire, examen, grille des examens initiaux, diagnostic, événements intercurrents, messages clés. |
| `js/simu/chart.js` | Petits multiples : T4L, TSH (log), ATS, lévothyroxine. Courbe réelle révélée au débriefing. |
| `js/simu/ui.js` | Cas commentés : déroulé des consultations et débriefing. |
| `js/simu/sandbox.js` | Mode thérapeutique libre. |
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
