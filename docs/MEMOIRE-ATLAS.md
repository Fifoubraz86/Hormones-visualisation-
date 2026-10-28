# Mémoire de l'atlas : construire un axe ou un module

Ce fichier sert de point d'entrée à une session de travail qui reçoit une consigne du type
« lis docs/MEMOIRE-ATLAS.md et construis l'axe X d'après tel document ». Il résume l'architecture,
les conventions et la marche à suivre ; les détails sont dans `docs/guide-scenes.md` (API de dessin)
et dans le code des modules existants.

## 1. Ce qu'est l'atlas

- Page unique (`index.html`), sans compilation : SVG zoomable, scènes imbriquées, particules animées.
- Niveau 0 : l'atlas (`js/scenes/atlas.js`), avec la silhouette et les cartes des axes.
- Niveau 1 : les **axes** (cartes à gauche et à droite, décrits dans `js/axes-data.js`, modèles dans
  `js/axes-sim.js`) et les **modules satellites** posés sous la silhouette (`surrenale`, `pancreas`).
- Niveaux suivants : les **loupes** (scènes enfants posées hors du cadre du parent : `HV.LOUPE.L(k)`,
  `HV.LOUPE.R(k)`, ou des colonnes propres comme `COL(k)` dans `zoom-pancreas.js`).
- Panneau de droite : texte de la scène (`lead`, `points`, `source`), bilan simulé, scénarios,
  paramètres, tests dynamiques, fiches détaillées, figures du polycopié, export vidéo.

## 2. Choisir la forme

| Besoin | Forme | Modèle à copier |
| --- | --- | --- |
| Boucle hormonale classique (glande → hormone → cibles → rétrocontrôle) | axe dans `axes-data.js` + modèle dans `axes-sim.js` | `cortico`, `glyc` |
| Organe complet avec sa propre physiologie et plusieurs maladies | module satellite (`parent: 'atlas'`, scale 0,24, sous la silhouette) + fichier de loupes | `pancreas.js` + `zoom-pancreas.js`, `surrenale.js` |
| Zoom cellulaire ou notion | loupe (`parent: '<axe>'`) | `islet.js`, `zoom-glyc.js` |

Emplacements libres sous la silhouette : rangée des notions transversales à y = 1050 ; modules
satellites à y = 1168 (surrénale x = 360, pancréas x = 840). Un nouveau module se place à côté
(par exemple x = 1320) ou sur une nouvelle rangée (y ≈ 1480) ; vérifier la vue d'ensemble.

## 3. Recette d'un module satellite (exemple : pancréas)

1. **Lire les sources** et noter les pages. Ce qui vient du document est cité « (polycopié p. N) »,
   « (SNFGE p. N) », « (TNCD p. N) » ; tout le reste est marqué « (complément) ».
2. **Modèle** (`HV.makeSim(id, SIM)`) : `defaults` (paramètres), `init` (état), `tau` (constantes de
   temps), `targets(p, s)` (valeurs cibles, grandeurs normalisées 1 = normal), `labs` (bilan, unités,
   normes, `fn` pour les valeurs calculées), `params` (curseurs), `scenarios` (un par maladie, avec une
   `note` sourcée), `interpret` (étiquette et texte selon le bilan, du plus spécifique au plus général).
   Vérifier chaque scénario après `settle()` (script du § 6) : le bilan doit tomber du bon côté des
   seuils du document.
3. **Scène principale** (`HV.scene({ id, parent: 'atlas', x, y, scale: 0.24, loupe, title, level,
   lead, points, source, legend, build })`) : dessin anatomique, flux `a.flow` dont le débit lit le
   modèle, bilan en direct, lésions qui apparaissent avec les scénarios, pas à pas `HV.spotlight`,
   `HV.loupeCaptions(a, id)` pour les légendes des loupes.
4. **Loupes** dans `js/scenes/zoom-<module>.js` ; elles lisent le modèle du module et l'animent
   elles-mêmes quand la scène principale est masquée (`HV.PANC.keepAlive`). Une fonction gabarit
   (`tne(c)`) évite de recopier la mise en page quand plusieurs maladies se ressemblent.
5. **Molécules** : glyphe dans `js/molecules-axes.js` (`peptide`, `ion`, `steroid`…), couleur dans
   `HV.MOLC` (`axes-data.js`), fiche au survol dans `HV.INFO`, fiche détaillée dans `HV.MOL_SHEETS`.
6. **Tests dynamiques** : `HV.TESTS.<idDuModele> = [...]` (voir `tests.js` : `apply`, `measure`,
   `samples`, `interpret`).
7. **Styles** : `css/<module>.css`, classes préfixées (`.pz-…`), couleurs par variables uniquement.
8. **Branchements** (à ne pas oublier) :
   - `index.html` : feuille de style et scripts (après les scènes dont on lit le modèle, avant `app.js`) ;
   - `atlas.js` : point de la glande vers le module ;
   - `app.js` : `TOUR` (parcours ← →) ;
   - `sheets.js` : `MAIN_ORGANS` et `CHAPTER_KW` (filtrage des fiches d'organe) ;
   - `sheets-organs.js` (ou depuis le module) : fiche de l'organe ;
   - liens depuis les scènes qui en parlent : nœuds `zoom:` dans `axes-data.js`, `a.zoomable(el, id)`,
     texte `loupe-cap` avec `data-zoom` (exemples : axe glycémie, îlot, loupe NEM) ;
   - `README.md`, `docs/a-verifier.md` (liste des compléments avec leurs références).

## 4. Règles de contenu

- Français, typographie française (espaces avant « : ; ? ! », virgule décimale, guillemets « »).
- Exactitude médicale d'abord ; une idée par scène ; texte ≥ 15 px dans le repère 1600 × 1000 ;
  rien ne déborde ni ne se chevauche (le cadre de la légende, en haut à droite, peut recouvrir).
- Les valeurs du modèle sont illustratives : le dire, et garder les seuils diagnostiques du document.

## 5. Où trouver les documents

- Fichiers joints à la conversation : `/root/.claude/uploads/<session>/…` (PDF lisibles avec
  `pdftotext -layout`).
- Le réseau du conteneur bloque la plupart des sites (snfge.org, sfendocrino.org…). Les documents de
  l'auteur sont accessibles par le connecteur **Google Drive** (`search_files` puis
  `read_file_content`) ; le connecteur Dropbox de la session ne donne accès qu'à Dropbox Sign, et un
  chemin `C:\Users\…` désigne l'ordinateur de l'auteur, hors du conteneur.
- Déjà repérés dans Drive : « Item 308 - Tumeurs neuroendocrines du pancréas - SFE.pdf »,
  « tncd_chap-11-NNE_2026-09-07.pdf », « recommandations SFE GTE NEM1.pdf ».
- Illustrations : kits Servier Medical Art (PPTX, CC BY 4.0) dans le Drive, dossier « ServierMedicalArt-all-kits » ;
  extraction en SVG et inventaire dans `docs/inventaire-servier.md` ; icônes Bioicons dans
  `docs/inventaire-illustrations.md`. Un organe s'affiche avec `art(g, 'servier/<fichier>', x, y, l, h)`
  dans `js/organs.js` (fichiers dans `assets/organs/`).
- Polycopié CEEDMM : figures dans `assets/poly/` (`js/poly-figs.js`) ; texte des pages si fourni.

## 6. Vérifier avant de livrer

```sh
for f in js/*.js js/scenes/*.js; do node --check "$f" || break; done
python3 -m http.server 8765 &          # depuis la racine du dépôt
node docs/tools/captures.js pancreas tne-gastrinome:gastrinome   # captures dans docs/tools/captures/
```

`captures.js` ouvre la page avec Playwright, enlève l'avertissement, vole vers chaque scène (avec
`scène:scénario` pour cocher un scénario), attend, fait une capture et affiche les erreurs de la page.
Relire chaque capture (chevauchements, textes coupés). Pour un modèle, faire aussi tourner chaque
scénario avec `sim.setScenario(id); sim.settle(); sim.lab(key)` et chaque test dynamique
(`HV.Tests.start(def, sim)` puis `HV.app.advance(0.1)` en boucle), et parcourir tous les pas à pas
(`HV.scenes[id].stepTo(i)`).

## 7. Git

- Travailler sur la branche indiquée par la session ; commits en français, au présent, décrivant le
  contenu (« Pancréas : … ») ; pousser régulièrement (le conteneur peut redémarrer).

## 8. Historique des modules

| Module | Fichiers | Sources |
| --- | --- | --- |
| Axe thyréotrope détaillé | `thyroid-axis.js`, `hypothalamus.js`, `pituitary.js`, `follicle.js`, `transport.js`, `target-cell.js`, `model.js` | polycopié CEEDMM |
| Autres axes | `axes-data.js`, `axes-sim.js`, loupes `zoom-*.js` | polycopié CEEDMM |
| Physiologie surrénalienne | `surrenale.js` | polycopié, partie 1, p. 61-89, figure 26 |
| Pancréas exocrine, endocrine et TNE | `pancreas.js`, `zoom-pancreas.js`, `css/pancreas.css` | SNFGE chap. 7 (2014) ; SFE item 308 (2022) ; TNCD chap. 11 (2026) |
