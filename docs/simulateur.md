# Patient virtuel : règles et sources

Le simulateur a deux modes : thérapeutique libre (par défaut) et cas commentés. Le mode « cas commentés » (`simulateur.html`) suit la convention de l'atlas : la sémiologie vient du *Polycopié de sémiologie endocrinienne* du CEEDMM et porte la mention « polycopié » ; la conduite thérapeutique, absente d'un polycopié de sémiologie, porte la mention « complément ». Elle reprend le consensus de la Société française d'endocrinologie sur la maladie de Basedow (2016), les recommandations usuelles sur la lévothyroxine et les RCP. **Ces règles sont à faire relire par un endocrinologue avant usage en enseignement.**

## Mode thérapeutique (`js/simu/sandbox.js`)

Pas de correction : un patient, une ordonnance libre, des bilans à la date choisie.

- **Calage du patient** sur la valeur de départ saisie, par dichotomie sur le modèle à l'équilibre : fonction thyroïdienne résiduelle pour la TSH initiale (Hashimoto), taux de TRAb pour la T4L initiale (Basedow), réserve hypophysaire pour la T4L initiale (centrale). Thyroïdectomie : patient euthyroïdien à J0, plus aucun tissu ni stock thyroïdien.
- **Lévothyroxine** : dose moyenne hebdomadaire (schéma alterné possible), rapportée à la dose substitutive complète de 1,6 µg/kg/j. Conditions de prise : à jeun 100 %, au petit-déjeuner 80 %, sous IPP 85 %, avec fer ou calcium 60 % (ordres de grandeur, complément).
- **Grossesse** : besoins multipliés progressivement jusqu'à 1,4 entre 4 et 16 SA, retour à 1 à l'accouchement (40 SA).
- **Basedow** : évolution des TRAb favorable (demi-vie ≈ 100 jours, rémission à l'arrêt) ou défavorable (TRAb persistants, rechute à l'arrêt), choisie ou tirée au sort.
- **Patient réel** : absorption de la LT4 (80–115 %), sensibilité aux ATS (× 0,6 à 1,6) et cinétique des TRAb tirées au sort et cachées ; dans la thyroïdite, la fonction résiduelle continue de baisser (≈ 10 % par an).
- Bruit analytique de ± 4 % sur chaque dosage. « Annuler la dernière étape » restaure l'état exact avant la prescription.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `js/simu/model.js` | Modèle du patient, intégré jour par jour : stock intrathyroïdien, T4, T3, TSH (avec mémoire du freinage), TRAb, poids, polynucléaires. Équivalences : 10 mg de carbimazole ≈ 6 mg de thiamazole ≈ 100 mg de PTU. |
| `js/simu/rules.js` | Moteur de correction : examens, molécule, dose, bêtabloquant, conseils, délai du contrôle, contenu du bilan suivant. Une remarque « discutable » coûte 1 point, une « erreur » 2 (certaines fautes graves davantage). |
| `js/simu/cases.js` | Les huit cas : patient, interrogatoire, examen, grille des examens initiaux, diagnostic, événements intercurrents, messages clés. |
| `js/simu/chart.js` | Petits multiples : T4L, TSH (log), ATS, lévothyroxine. Courbe réelle révélée au débriefing. |
| `js/simu/ui.js` | Cas commentés : déroulé des consultations et débriefing. |
| `js/simu/sandbox.js` | Mode thérapeutique libre. |
| `js/simu/main.js` | Choix du mode (onglets). |

## Règles appliquées (complément)

**Maladie de Basedow**
- NFS et bilan hépatique de référence avant l'ATS ; information sur l'agranulocytose (fièvre ou angine → NFS en urgence et arrêt) ; contraception chez la femme en âge de procréer ; arrêt du tabac et avis ophtalmologique en cas d'orbitopathie (tabac : polycopié p. 31).
- Attaque : carbimazole 20–30 mg/j (30–40 mg/j si T4L > 2 fois la normale) ; < 15 mg/j insuffisant, > 60 mg/j excessif. PTU hors grossesse : réservé (hépatotoxicité).
- Bêtabloquant si FC ≥ 90/min ; propranolol contre-indiqué chez l'asthmatique ; à arrêter une fois l'euthyroïdie obtenue.
- Premier contrôle à 3–4 semaines, puis toutes les 4–6 semaines pendant l'adaptation, toutes les 6–12 semaines en entretien. T4L (± T3L) indispensable les premiers mois : la TSH reste freinée ; augmenter la dose sur une TSH basse avec T4L et T3L normales est une erreur.
- T4L normale → réduction par paliers (un tiers à la moitié) jusqu'à 5–10 mg/j ; hypothyroïdie iatrogène (T4L basse ou TSH > 4) → réduction nette ou ajout de lévothyroxine (« bloquer-substituer »).
- Cure de 12 à 18 mois ; arrêt avant 12 mois = erreur ; TRAb à doser avant l'arrêt (positifs : risque de rechute élevé).
- Agranulocytose : contre-indication définitive à tous les ATS ; traitement radical. Orbitopathie active chez un fumeur : thyroïdectomie plutôt qu'iode 131.
- Grossesse : PTU au 1er trimestre (carbimazole et thiamazole : embryopathie), plus faible dose efficace, T4L dans le haut de la normale, contrôle toutes les 2–4 semaines, TRAb au 2e–3e trimestre. Iode 131 contre-indiqué.

**Lévothyroxine**
- Adulte sans cardiopathie : dose substitutive ≈ 1,6 µg/kg/j d'emblée ou rapidement (0,6 à 1,15 fois cette dose acceptée). Sujet âgé coronarien : 12,5–25 µg/j, paliers de 12,5–25 µg ; un palier > 25 µg déclenche un angor dans le cas dédié.
- Prise à jeun, à distance du fer, du calcium et des IPP.
- TSH 6–8 semaines après chaque changement (polycopié : toute TSH anormale se contrôle à 6–8 semaines) ; puis tous les 6–12 mois une fois l'équilibre confirmé. Cibles : 0,4–4 mUI/L ; 0,5–6 chez le coronarien âgé ; < 2,5 pendant la grossesse.
- T3L inutile (polycopié p. 22), anti-TPO à ne pas redoser (p. 23), scintigraphie inutile.
- Grossesse : +25 à 30 % dès la confirmation, TSH toutes les 4 semaines jusqu'à mi-grossesse, retour à la dose antérieure après l'accouchement.
- Hypothyroïdie centrale : axe corticotrope évalué avant la lévothyroxine, hydrocortisone d'abord en cas d'insuffisance corticotrope (sinon insuffisance surrénale aiguë dans le cas dédié), suivi sur la T4L (cible 14–22 pmol/L), TSH non interprétable.
- Hypothyroïdie infraclinique (TSH < 10, T4L normale, peu de symptômes) : contrôle à 6–8 semaines avec T4L et anti-TPO (polycopié), pas de traitement systématique, TSH tous les 6–12 mois.

## Limites du modèle

Cinétiques et valeurs illustratives, normes indicatives (T4L 12–22 pmol/L, T3L 3,1–6,8 pmol/L, TRAb < 1,8 UI/L selon la trousse). Pas de variabilité interindividuelle au-delà des paramètres de chaque cas ; bruit analytique de ± 4 %. La rechute après arrêt est modélisée (paramètre `relapse`) mais aucun cas ne l'utilise encore.
