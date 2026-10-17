# Atlas endocrinien

Visualisation zoomable et animée des axes endocriniens humains, dans l'esprit d'une présentation Prezi : on dézoome pour voir l'ensemble des axes, on rezoome jusqu'à la cellule pour voir les hormones circuler.

L'**axe thyréotrope** est détaillé jusqu'à la cellule (hypothalamus, hypophyse, follicule, transport plasmatique, cellule cible). Les autres axes et boucles de régulation sont tirés du *Polycopié de sémiologie endocrinienne* du CEEDMM (2023) et représentés en schémas animés : corticotrope, somatotrope, lactotrope, gonadotrope féminin (cycle de 28 jours, rétrocontrôle de l'estradiol qui devient positif en milieu de cycle) et masculin, posthypophyse (ADH), médullosurrénale, métabolisme phosphocalcique, système rénine-angiotensine-aldostérone, régulation de la glycémie et métabolisme des lipoprotéines. Le détail des boucles extraites est dans [`docs/axes-polycopie.md`](docs/axes-polycopie.md).

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
| Échap ou « Dézoomer » | remonter d'un niveau |
| ← / → | parcours guidé (atlas → axe → hypothalamus → hypophyse → follicule → transport → cellule cible) |
| Espace | pause / lecture |

Chaque scène a une ancre (`#thyro`, `#foll`, `#cell`…) pour y accéder directement.

## Les scènes de l'axe thyréotrope

1. **Axe** : TRH, TSH, T4/T3, apport iodé, TRAb, lévothyroxine, rétrocontrôle négatif et effets périphériques (fréquence cardiaque, métabolisme basal, thermogenèse).
2. **Hypothalamus** : neurone à TRH du noyau paraventriculaire, tanycytes (D2), éminence médiane, système porte.
3. **Antéhypophyse** : cellule thyréotrope, récepteur de la TRH (Gq), synthèse et sécrétion de TSH, rétrocontrôle par T3 via TRβ2.
4. **Follicule thyroïdien** : les 10 étapes de l'hormonosynthèse (TSH-R, NIS, pendrine, thyroglobuline, TPO/DUOX2, couplage, endocytose, protéolyse, MCT8, DEHAL1).
5. **Transport plasmatique** : TBG, transthyrétine, albumine, fraction libre et entrée cellulaire.
6. **Cellule cible** : MCT8/MCT10/OATP1C1, désiodases D2 et D3, récepteur nucléaire TR/RXR sur TRE, transcription.

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
js/scenes/*.js      atlas et scènes détaillées de l'axe thyréotrope
js/app.js           caméra, navigation, panneau, boucle d'animation
```

## Ajouter ou détailler un axe

Un axe se décrit dans `js/axes-data.js` : nœuds (organes ou signaux), liens (`stim`, `inhib` ou flux simple, avec la molécule transportée), horloge éventuelle (`day` ou `cycle`) et niveaux affichés. Pour un niveau de détail cellulaire comme l'axe thyréotrope, on ajoute des scènes enfants avec `HV.scene({ id, parent, x, y, scale, build(g, a) {…} })` ; `a.flow(chemin, { mol, rate })` anime des molécules le long d'un chemin SVG.
