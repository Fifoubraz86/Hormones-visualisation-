# Atlas endocrinien

Visualisation zoomable et animée des axes endocriniens humains, dans l'esprit d'une présentation Prezi : on dézoome pour voir l'ensemble des axes, on rezoome jusqu'à la cellule pour voir les hormones circuler.

Le premier module complet est l'**axe thyréotrope** (hypothalamus → hypophyse → thyroïde → périphérie). Les autres axes (corticotrope, somatotrope, lactotrope, gonadotrope, hydrique, pancréas endocrine, phosphocalcique, rénine-angiotensine-aldostérone) ont déjà leur carte dans l'atlas et sont en préparation.

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
js/molecules.js     glyphes des molécules (TRH, TSH, T4, T3, iodure, TRAb…)
js/scenes/*.js      une scène par fichier
js/app.js           caméra, navigation, panneau, boucle d'animation
```

## Ajouter un axe

Créer `js/scenes/<axe>.js` avec `HV.scene({ id, parent, x, y, scale, title, lead, points, build(g, a) {…} })`. Chaque scène est dessinée dans un repère 1600 × 1000 ; `a.flow(chemin, { mol, rate })` anime des molécules le long d'un chemin SVG. Remplacer ensuite la carte « En préparation » correspondante dans `js/scenes/atlas.js`.
