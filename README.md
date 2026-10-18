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
```

Documentation : [`docs/axes-polycopie.md`](docs/axes-polycopie.md) (boucles extraites du polycopié), [`docs/tests-dynamiques.md`](docs/tests-dynamiques.md) (tests dynamiques), [`docs/audit.md`](docs/audit.md) (audit médical).

## Ajouter ou détailler un axe

Un axe se décrit dans `js/axes-data.js` : nœuds (organes ou signaux), liens (`stim`, `inhib` ou flux simple, avec la molécule transportée), horloge éventuelle (`day` ou `cycle`) et niveaux affichés. Pour un niveau de détail cellulaire comme l'axe thyréotrope, on ajoute des scènes enfants avec `HV.scene({ id, parent, x, y, scale, build(g, a) {…} })` ; `a.flow(chemin, { mol, rate })` anime des molécules le long d'un chemin SVG.
