# Atlas endocrinien

Visualisation zoomable et animée des axes endocriniens humains, dans l'esprit d'une présentation Prezi : on dézoome pour voir l'ensemble des axes, on rezoome jusqu'à la cellule pour voir les hormones circuler.

L'**axe thyréotrope** est détaillé jusqu'à la cellule (hypothalamus, hypophyse, follicule, transport plasmatique, cellule cible). Les autres axes et boucles de régulation sont tirés du *Polycopié de sémiologie endocrinienne* du CEEDMM (2023) et représentés en schémas animés : corticotrope, somatotrope, lactotrope, gonadotrope féminin (cycle de 28 jours, rétrocontrôle de l'estradiol qui devient positif en milieu de cycle) et masculin, posthypophyse (ADH), médullosurrénale, métabolisme phosphocalcique, système rénine-angiotensine-aldostérone, régulation de la glycémie et métabolisme des lipoprotéines. Le détail des boucles extraites est dans [`docs/axes-polycopie.md`](docs/axes-polycopie.md).

Chaque axe dispose d'un modèle physiologique simplifié, d'un bilan biologique simulé et de scénarios cliniques tirés de la sémiologie du polycopié : Cushing (hypophysaire, surrénalien, ectopique), insuffisances surrénale et corticotrope, corticothérapie, acromégalie, déficit somatotrope, prolactinomes et déconnexion, diabète insipide, SIADH, phéochromocytome, ménopause, hypogonadismes, hyperparathyroïdie primaire et secondaire, hypoparathyroïdie, hyperaldostéronismes primaire et secondaire, DT1, DT2, insulinome, hypercholestérolémie familiale et ses traitements…

Les organes sont dessinés de façon anatomique, les molécules d'après leur structure (iodothyronines, stéroïdes à quatre cycles, peptides, glycoprotéines, catécholamines, lipoprotéines…). Une légende contextuelle et des fiches au survol (ou au toucher) donnent les informations de chaque élément.

## Lancer

Aucune dépendance ni compilation : ouvrez `index.html` dans un navigateur, ou servez le dossier :

```sh
python3 -m http.server 8000
# puis http://localhost:8000
```

Le site fonctionne aussi tel quel sur GitHub Pages.

## Patient virtuel (simulateur thérapeutique)

`simulateur.html` (lien « Patient virtuel » en haut de l'atlas) met l'étudiant face à un patient qui consulte pour une dysthyroïdie. Il interroge, examine, prescrit le bilan, pose le diagnostic, puis initie et adapte le traitement de consultation en consultation : antithyroïdien de synthèse (carbimazole, thiamazole, PTU), bêtabloquant, lévothyroxine, hydrocortisone, conseils, délai et contenu du prochain bilan. Le temps avance jusqu'au contrôle choisi ; le patient évolue selon un modèle pharmacologique simplifié (stock thyroïdien vidé en quelques semaines sous ATS, demi-vie de la T4 de 7 jours, TSH qui reste freinée après une thyrotoxicose, TRAb qui décroissent sous traitement). Chaque décision est corrigée, avec sa source, et un débriefing donne une note sur 20, la courbe réelle et les messages clés.

Huit cas pour l'axe thyréotrope : maladie de Basedow typique (titration jusqu'à la fin de cure), Basedow avec orbitopathie chez un fumeur (agranulocytose puis thyroïdectomie), Basedow au 1er trimestre de grossesse, maladie de Hashimoto (avec une interaction médicamenteuse), hypothyroïdie du coronarien âgé, hypothyroïdie infraclinique, femme traitée qui débute une grossesse, hypothyroïdie centrale. Le détail des règles et des sources est dans [`docs/simulateur.md`](docs/simulateur.md). Code : `js/simu/` et `css/simulateur.css`.

## Navigation

| Action | Effet |
| --- | --- |
| Clic sur une carte, un organe ou une loupe | zoom animé vers la scène |
| Molette / pincement | zoom libre |
| Glisser | déplacement |
| Échap, Retour arrière ou « Dézoomer » | remonter d'un niveau |
| ← / → | parcours guidé en 18 étapes (atlas → axe thyréotrope → hypothalamus → hypophyse → follicule → transport → cellule cible → axes corticotrope, somatotrope, gonadotropes féminin et masculin, lactotrope, ADH, médullosurrénale, phosphocalcique, SRAA, glycémie, lipides) |
| Espace | pause / lecture |

Chaque scène a une ancre (`#thyro`, `#foll`, `#cell`…) pour y accéder directement.

## Comprendre pas à pas

Chaque axe a un bouton « Comprendre pas à pas » dans le panneau. La boucle est racontée étape par étape, du premier signal (TRH, CRH, osmostat…) jusqu'à l'action hormonale et au rétrocontrôle. L'étape en cours s'allume, les étapes déjà vues restent visibles en plus pâle et la suite est estompée. On avance avec les boutons ou les flèches ← →. Les étapes sont décrites dans `js/axes-steps.js` ; l'axe thyréotrope, dessiné à la main, utilise des projecteurs (`HV.spotlight`).

Les axes hypophysaires partagent une coupe sagittale cerveau – hypothalamus – tige – hypophyse. Elle montre le système porte (antéhypophyse) et les axones magnocellulaires (posthypophyse).

## Vitesse des hormones

La densité et la vitesse des particules suivent le taux sécrété : une hormone en excès défile vite et serrée, une hormone effondrée se raréfie et ralentit. Le panneau propose un curseur « Vitesse des hormones » (0,25× à 3×), une case « Accentuer » qui renforce le lien entre vitesse et taux, et une vitesse du temps simulé à partir de 0,25×.

## Exporter une vidéo

Le bouton « Exporter en vidéo » du panneau ouvre l'éditeur vidéo : module (la scène courante par défaut), scénario clinique de l'axe, durée (5 à 60 s), cadrage 16:9 en 1920 × 1080 ou 1280 × 720, 25 ou 30 images par seconde, pas à pas (aucun, ou toutes les étapes avec N secondes par étape et le titre de l'étape incrusté), vitesse des hormones et accentuation, thème clair ou sombre, titre incrusté facultatif. Le fichier MP4 (H.264) s'insère tel quel dans PowerPoint.

Tout se passe dans le navigateur, sans serveur ni capture d'écran. La boucle temps réel est suspendue ; chaque image avance la simulation d'un pas fixe (`HV.app.pause()`, `HV.app.advance(dt)`, `HV.app.resume()`), puis la scène est sérialisée en SVG autonome (CSS de la page, glyphes moléculaires utilisés, figures du polycopié et polices Google incorporées en data URI) et dessinée dans un canvas. L'encodage passe par WebCodecs (H.264) et la bibliothèque [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) 5.1.3, chargée depuis jsDelivr à l'ouverture de l'éditeur. L'atlas retrouve ensuite son état : scène, cadrage, scénario, paramètres, vitesse et pas à pas. Le code est dans `js/video-export.js` et `css/video-export.css`.

- **Navigateurs** : Chrome, Edge et Safari récents produisent un MP4. Sans encodeur H.264 (Chromium libre, certains Firefox), l'éditeur produit un WebM par MediaRecorder, en temps réel, à convertir avant PowerPoint.
- **Vitesse** : le rendu est plus lent que le temps réel, de l'ordre de 4 à 6 s de calcul par seconde de vidéo en 1920 × 1080, moins en 1280 × 720.
- **Page publiée** : le téléchargement passe par la capacité `downloads` de la page (qui demande confirmation) ; ouverte en local, par un lien de téléchargement classique.
- **Fichier local** : ouvert en `file://`, Chrome interdit de lire les feuilles de style et les figures ; servez le dossier (`python3 -m http.server`) ou utilisez la page assemblée par `tools/bundle.py`. Sans accès à Google Fonts, le texte utilise les polices de repli du système.

## Iconographie du polycopié

Les 71 figures du polycopié du CEEDMM (2e édition 2023, parties 1 et 2) sont dans `assets/poly/`, extraites des PDF et réduites à 1 100 px. Elles sont reproduites avec l'accord du Collège et décrites dans `js/poly-figs.js` (légende, partie, page, scènes, crédit). On les retrouve à trois endroits : en vignettes dans le panneau de chaque scène, dans les fiches organes, et en pastilles posées sur les organes des schémas. Un clic ouvre la figure en grand avec sa source.

## Îlot de Langerhans

L'îlot est un zoom de la régulation glycémique. On y voit l'architecture de l'îlot (cellules β, α, δ, PP, ε, capillaires, acini exocrines) et la cellule β : GLUT2, glucokinase, ATP, canal K-ATP, potentiel de membrane, canal calcique, granules, incrétines. Tout est animé par le modèle glycémique (scénarios DT1, DT2, insulinome, HGPO) et dispose d'un pas à pas en 8 étapes.

## Les scènes de l'axe thyréotrope

1. **Axe** : TRH, TSH, T4/T3, apport iodé, TRAb, lévothyroxine, rétrocontrôle négatif et effets périphériques (fréquence cardiaque, métabolisme basal, thermogenèse).
2. **Hypothalamus** : neurone à TRH du noyau paraventriculaire, tanycytes (D2), éminence médiane, système porte.
3. **Antéhypophyse** : cellule thyréotrope, récepteur de la TRH (Gq), synthèse et sécrétion de TSH, rétrocontrôle par T3 via TRβ2.
4. **Follicule thyroïdien** : les 10 étapes de l'hormonosynthèse (TSH-R, NIS, pendrine, thyroglobuline, TPO/DUOX2, couplage, endocytose, protéolyse, MCT8, DEHAL1).
5. **Transport plasmatique** : TBG, transthyrétine, albumine, fraction libre et entrée cellulaire.
6. **Cellule cible** : MCT8/MCT10/OATP1C1, désiodases D2 et D3, récepteur nucléaire TR/RXR sur TRE, transcription.

## Fiches détaillées

Un clic sur une molécule (particule, étiquette, légende) ou sur un organe de la scène courante ouvre sa fiche ; sur un élément qui sert aussi à zoomer, Maj + clic. Le panneau liste aussi toutes les fiches de la scène.

- **Molécules** : classe, structure, formule et masse (PubChem ou PDB), synthèse, transport, demi-vie, récepteur, effets, dosage, pharmacologie, liens PubChem / RCSB.
- **Organes** : anatomie, histologie, rôle endocrine, planches d'imagerie schématiques en version normale et pathologique (échographie et scintigraphie thyroïdiennes, histologie, IRM hypophysaire, scanner surrénalien, échographie et MIBI des parathyroïdes, îlot de Langerhans, échographies ovarienne et testiculaire), figures correspondantes du polycopié CEEDMM (numéro, partie, page) et liens Radiopaedia / Wikimedia Commons.

## Vérification des molécules

Les petites molécules ont été contrôlées dans PubChem (formule, nom IUPAC, position des substituants) ; les protéines sont dessinées à partir de leurs coordonnées dans la PDB (carbones α projetés, ponts disulfure, glycanes, T4 liée), grâce au script [`docs/tools/traces.py`](docs/tools/traces.py). La source de chaque structure (CID PubChem ou identifiant PDB) s'affiche dans sa fiche au survol.

## Le modèle

`js/model.js` contient un modèle physiologique simplifié (grandeurs normalisées, relaxation du premier ordre) qui pilote la densité des particules et le bilan biologique simulé (TSH, T4L, T3L, T3 reverse). Neuf scénarios sont fournis : euthyroïdie, Hashimoto, Hashimoto traité, surdosage en LT4, Basedow, adénome toxique, hypothyroïdie centrale, carence iodée et syndrome de basse T3. Les paramètres sont aussi réglables à la main.

Il s'agit d'un outil pédagogique : valeurs illustratives, temps accéléré, ne remplace pas un avis médical.

## Structure

```
index.html
css/style.css
js/engine.js        moteur de scènes imbriquées, particules, interpolation de zoom
js/model.js         modèle de l'axe thyréotrope et scénarios
js/molecules.js     glyphes des molécules de l'axe thyréotrope
js/molecules-axes.js glyphes des autres hormones (stéroïdes, peptides, catécholamines…)
js/organs.js        dessins anatomiques
js/info.js          fiches au survol et légende
js/axis-builder.js  construction d'une scène d'axe à partir de sa description
js/axes-data.js     axes et boucles tirés du polycopié
js/axes-sim.js      modèles, bilans et scénarios cliniques des axes
js/tests.js         tests dynamiques animés (Synacthène, freinages, HGPO, charge sodée, restriction hydrique…)
js/sheets.js        panneau des fiches détaillées (molécules et organes)
js/sheets-molecules.js fiches biochimiques des molécules
js/sheets-organs.js fiches anatomiques des organes et figures du polycopié
js/imaging.js       planches d'imagerie schématiques (normales et pathologiques)
js/protein-traces.js tracés protéiques extraits de la PDB (généré)
js/protein-glyphs.js glyphes protéiques à partir des tracés
js/scenes/*.js      atlas et scènes détaillées de l'axe thyréotrope
js/app.js           caméra, navigation, panneau, boucle d'animation
js/video-export.js  éditeur vidéo : rendu image par image, encodage MP4
```

Documentation : [`docs/axes-polycopie.md`](docs/axes-polycopie.md) (boucles extraites du polycopié), [`docs/tests-dynamiques.md`](docs/tests-dynamiques.md) (tests dynamiques), [`docs/audit.md`](docs/audit.md) (audit médical).

## Ajouter ou détailler un axe

Un axe se décrit dans `js/axes-data.js` : nœuds (organes ou signaux), liens (`stim`, `inhib` ou flux simple, avec la molécule transportée), horloge éventuelle (`day` ou `cycle`) et niveaux affichés. Pour un niveau de détail cellulaire comme l'axe thyréotrope, on ajoute des scènes enfants avec `HV.scene({ id, parent, x, y, scale, build(g, a) {…} })` ; `a.flow(chemin, { mol, rate })` anime des molécules le long d'un chemin SVG.
