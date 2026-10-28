# Illustrations d'organes

Fichiers SVG repris sans modification de la collection [Bioicons](https://bioicons.com) (dépôt duerrsimon/bioicons,
dossier `static/icons/cc-by-3.0/Human_physiology/Servier/`). Auteur : **Servier Medical Art**
(https://smart.servier.com/), licence **CC BY 3.0 Unported** (https://creativecommons.org/licenses/by/3.0/).

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

## Dessins originaux de l'atlas

Absents de Bioicons, dessinés pour l'atlas dans le même esprit (dégradé, ombre interne, texture), générés par `tools/organs_svg.py` :
`thyroid.svg`, `parathyroid.svg`, `pituitary.svg`, `adrenal.svg`, `testis.svg`, `ovary.svg`, `uterus.svg`, `breast.svg`.
Pour les modifier : éditer le script puis `python3 tools/organs_svg.py assets/organs`.

Tous sont utilisés dans `js/organs.js` (fonction `art`) ; la scène du pancréas reprend aussi le foie, l'estomac et le pancréas.
