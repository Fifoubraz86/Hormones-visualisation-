# Illustrations d'organes

Toutes les illustrations de ce dossier, sauf les dessins originaux listés en fin de page, sont de
**Servier Medical Art** (https://smart.servier.com/). Attribution : « Servier Medical Art (smart.servier.com) ».

## Via Bioicons (CC BY 3.0)

Fichiers SVG repris sans modification de la collection [Bioicons](https://bioicons.com) (dépôt duerrsimon/bioicons,
dossier `static/icons/cc-by-3.0/Human_physiology/Servier/`), licence **CC BY 3.0 Unported**
(https://creativecommons.org/licenses/by/3.0/).

| Fichier de l'atlas | Fichier d'origine |
| --- | --- |
| brain.svg | brain-2.svg |
| heart.svg | heart-front.svg |
| intestine.svg | small-intestine-2.svg |
| kidney.svg | kidney-1.svg |
| liver.svg | liver-3d.svg |
| lungs.svg | lung.svg |
| muscle.svg | muscle-1.svg |
| pancreas.svg | pancreas.svg |
| stomach.svg | stomach.svg |

## Kits SMART (CC BY 4.0) : dossier `servier/`

Dessins des kits PowerPoint *SMART* (Endocrinology, Nervous system, Urinary system, Reproduction) de Servier Medical Art, licence **CC BY 4.0**
(https://creativecommons.org/licenses/by/4.0/). Modifications : chaque dessin est isolé de sa diapositive,
converti en SVG (`tools/pptx2svg.py`), le fond blanc retiré et le fichier allégé avec svgo ; formes et
couleurs inchangées ; `endo-larynx-trachea.svg` est le dessin « cancer thyroïdien » (Endocrinology, diapositive 14) dont la thyroïde et la tumeur ont été retirées. Liste et diapositives d'origine : `docs/inventaire-servier.md`.

## Dessins originaux de l'atlas

Générés par `tools/organs_svg.py` dans le même esprit (dégradé, ombre interne, texture) : `pituitary.svg`
(icône à antéhypophyse et posthypophyse distinctes) et `ovary.svg` (plus utilisé : remplacé par l'ovaire du kit Reproduction). Le script sait
aussi produire thyroïde, parathyroïdes, surrénale, testicule, utérus et sein, remplacés par les dessins Servier.
Pour les modifier : éditer le script puis `python3 tools/organs_svg.py <dossier>`.

Tous sont utilisés dans `js/organs.js` (fonction `art`) ; la scène du pancréas reprend aussi le foie, l'estomac et le pancréas.
