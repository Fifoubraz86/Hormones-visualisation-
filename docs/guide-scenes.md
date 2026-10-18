# Écrire une scène « loupe »

Une loupe est une scène de zoom rattachée à un axe. Elle est posée hors du cadre de sa scène parente et on y entre depuis la liste « Zoomer sur » du panneau, depuis sa légende ou depuis un organe du schéma. La scène de référence est `js/scenes/islet.js` (îlot de Langerhans et cellule β) : lisez-la avant de commencer.

## Squelette

```js
(function () {
  'use strict';
  const HV = window.HV;
  Object.assign(HV.INFO, { 'mon-element': { t: 'Titre', k: 'Sous-titre court', d: 'Explication affichée au survol.' } });
  const def = HV.scene(Object.assign({
    id: 'steroido', parent: 'cortico', loupe: 'Stéroïdogenèse',   // légende sous la vignette
    title: 'Stéroïdogenèse surrénalienne', level: 'Cellule',          // « Organe », « Tissu », « Cellule », « Notion »
    lead: 'Deux ou trois phrases d\'introduction.',
    points: ['Point clé 1', 'Point clé 2'],
    legend: new Set(['cortisol', 'aldo', 'chol']),                     // glyphes moléculaires de la légende
    build(g, a) {
      a.frame('Titre', 'Sous-titre');
      // … dessin dans un repère 1600 × 1000 (le cadre a des coins arrondis ; titre en haut à gauche jusqu'à y ≈ 140)
      HV.spotlight(def, a, [ { t: 'Étape 1', d: 'Texte', spot: [[x, y, r]] }, … ]); // pas à pas facultatif
    }
  }, HV.LOUPE.L(0)));   // position attribuée : HV.LOUPE.L(k) ou HV.LOUPE.R(k)
})();
```

## API de dessin (`a`)

- `a.el(tag, attrs, parent?)` crée un élément SVG ; `a.path(d, cls, parent?, extra?)` crée un tracé ; `a.text(x, y, 'texte' | ['ligne 1', 'ligne 2'], cls, { anchor: 'middle', lh: 1.2, attrs: {} }, parent?)` écrit du texte.
- `a.flow(d, { mol: 'cortisol', rate: () => 1.5, size: 1.2, speed: 80, track: false, pace: () => 1 })` fait circuler des particules (`<use href="#mol-…">`) le long du tracé `d`.
- `a.sign(x, y, 'stim' | 'inhib', parent?)` dessine le signe ⊕ ou ⊖ ; appelez `.set(1)` dessus.
- `a.dyn((dt) => { … })` est appelé à chaque image (animations, valeurs en direct).
- `a.zoomable(el, 'idScene')` rend un élément cliquable vers une scène.
- `HV.organs.<nom>(g)` dessine un organe centré en (0, 0), d'environ ±60 : thyroidSmall, brainSagittal, hhSagittal, brainLateral, heart, liver, bone, muscle, fat, hypothalamusIcon, pituitaryIcon, kidney, adrenalKidney, testis, ovary, uterus, breast, intestine, parathyroidBack, islet, lungs, vessel, nerve, cellIcon, nephron.
- `HV.figBadge(a, x, y, ['24', '25'])` pose une pastille qui ouvre les figures du polycopié (voir `js/poly-figs.js`).
- Le modèle d'un axe se lit à l'exécution : `HV.scenes.glyc.sim.s` (variables) et `.p` (paramètres). Pour que le panneau affiche le bilan et les scénarios de l'axe, écrivez `def.sim = HV.scenes.<axe>.sim` dans `build`.

## Glyphes moléculaires (`mol`)

t4 t3 rt3 trh iod tsh trab tg tgi tbg ttr alb mrna rbc na dot cortisol aldo testo e2 prog dhea calcitriol chol crh ghrh acth gnrh kiss angio angio1 calcitonin sst adh oxy inhib dopa nora adre glucose glucagon insulin ca k nai water ffa ketone chylo vldl ldl hdl lh fsh gh prl igf1 pth renin pcsk9 ldlr.

Pour une molécule absente, dessinez une pastille de texte, ou un petit glyphe dans la scène (`<defs>` local, identifiant unique préfixé par le nom de la scène).

## Classes CSS disponibles

- **Textes :** `lbl`, `lbl-s`, `lbl-h` (intertitre), `note`, `strong`, `les-lbl`, `chan-t`, `sig-val`.
- **Boîtes :** `side-box` (encadré neutre), `sig-box` (pastille arrondie, couleur `style="--c: var(--p-…)"`), `enz` (enzyme), `chan` et `chan-pore` (canal, transporteur), `bcell` (membrane cellulaire), `mito`, `gran`.
- **Liens :** `ax-track stim` et `ax-track inhib` (avec `style="--mc: var(--p-…)"`), `connector` (pointillés).
- **Couleurs :** `--p-orange --p-orange2 --p-gold --p-amber --p-sky --p-blue --p-blue2 --p-teal --p-green --p-lime --p-rose --p-magenta --p-violet --p-red --p-red2 --p-brown --p-grey`. Organes : `--o-thyroid --o-brain --o-hypo --o-pit-ant --o-pit-post --o-kidney --o-adrenal --o-liver --o-bone --o-aorta --o-vein --o-gonad --o-pancreas`. Fond, texte : `--bg --panel --panel-2 --fg --muted --faint --line --line-2 --accent --good --warn --bad`.
- Vos classes propres vont dans `css/zoom-<groupe>.css`, préfixées par le groupe (par exemple `.zg-…`). Le thème clair et le thème sombre sont gérés par les variables : n'utilisez pas de couleur codée en dur pour le texte ou les fonds.

## Règles de contenu

- **Texte en français**, typographie française : virgule décimale, espaces insécables avant « : ; ? ! », guillemets « ».
- **Exactitude médicale avant tout.** Ce qui figure dans le polycopié (`scratchpad/poly/p1-pages.txt`, `p2-pages.txt`) peut être cité tel quel. Tout le reste est marqué « (complément) » dans le texte ou la fiche.
- **Une idée par scène.** Le schéma doit se lire sans le panneau : étiquettes courtes sur le dessin, explications au survol (`data-info` → `HV.INFO`).
- **Animation sobre.** Les flux de particules montrent un sens et un débit. Utilisez `a.dyn` pour les valeurs qui changent (curseurs, scénarios).
- **Pas à pas.** Ajoutez un `HV.spotlight` (4 à 8 étapes) quand la scène raconte une séquence.
- **Lisibilité.** Le texte fait au moins 15 px dans le repère 1600 × 1000 ; rien ne déborde du cadre ni ne se chevauche.

## Vérifier

- `node --check js/scenes/zoom-<groupe>.js`.
- Ouvrir `index.html` avec Playwright (`require('/opt/node-tools/node_modules/playwright')`, `chromium.launch()`). Écouter `pageerror`, puis appeler `HV.app.flyTo(HV.scenes['<id>'], true)`, attendre 1,5 s et faire une capture. Relire chaque capture et corriger les chevauchements.
