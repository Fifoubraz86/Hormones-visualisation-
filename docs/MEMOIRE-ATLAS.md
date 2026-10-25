# Mémoire de l'atlas : refaire un atlas de la même famille

Ce document résume tout ce qu'il faut savoir pour repartir de ce dépôt et construire un autre atlas (autre spécialité, autre polycopié) avec la même structure, la même finition et la même méthode de vérification. Il s'adresse à la fois à l'auteur et à l'assistant (Claude) qui l'aidera : on peut le donner tel quel en début de session (« lis docs/MEMOIRE-ATLAS.md et applique-le »).

Atlas d'origine : *Atlas endocrinien — les hormones en mouvement*, conçu et réalisé par Philippe Thuillier, d'après le *Polycopié de sémiologie endocrinienne* du CEEDMM (2e édition, 2023).

---

## 1. Ce qu'est l'atlas

- Une page web unique, zoomable « à la Prezi » : une **vue d'ensemble** (silhouette, cartes des axes), des **scènes d'axe**, et des **loupes** (zooms cellulaires ou notions) posées à côté de chaque scène.
- Chaque axe est **animé** : les hormones circulent sous forme de particules dont la densité et la vitesse suivent le taux sécrété.
- Chaque axe a un **modèle physiologique simplifié**, un **bilan biologique simulé**, des **scénarios cliniques**, une **interprétation** automatique, des **tests dynamiques** animés et un **pas à pas** didactique.
- Les **molécules** sont dessinées d'après leur structure (glyphes), les **organes** de façon anatomique, avec **fiches** au survol et au clic.
- L'**iconographie réelle** du polycopié est intégrée (vignettes, pastilles sur les organes, figure en grand).
- Public visé : étudiants et internes. Outil **pédagogique**, avec avertissement d'ouverture « usage non médical ».

Aucune dépendance, aucune compilation : HTML, CSS et JavaScript « vanilla » sous l'espace de noms `window.HV`.

---

## 2. Démarrer un nouvel atlas à partir de ce dépôt

1. **Copier le dépôt** (nouveau dépôt GitHub ou nouvelle branche), renommer le titre dans `index.html` (`<title>`, `.brand-name`, `.brand-sub`, texte de l'avertissement `#warnBox`) et l'auteur.
2. **Garder le socle** (réutilisable tel quel) :
   - `js/engine.js` (scènes, caméra, flux de particules), `js/app.js` (navigation, panneau, pas à pas, tests, pause, vitesse), `js/axis-builder.js` (constructeur déclaratif des axes), `js/sheets.js` (fiches), `js/video-export.js` (export MP4), `js/warning.js`, `css/style.css` (thème clair/sombre), `css/video-export.css` ;
   - `tools/bundle.py` (page unique pour la publication), `tools/verif/` (harnais de vérification), `tools/enregistrer-video.js`.
3. **Remplacer le contenu** (spécifique à la spécialité) :
   - `js/axes-data.js` (axes déclaratifs : nœuds, liens, textes), `js/axes-sim.js` (modèles, labs, scénarios, interprétations), `js/axes-steps.js` (pas à pas), `js/tests.js` (tests dynamiques) ;
   - `js/molecules.js`, `js/molecules-axes.js`, `js/protein-glyphs.js` (glyphes), `js/organs.js` (organes), `js/info.js` (info-bulles), `js/sheets-molecules.js`, `js/sheets-organs.js` (fiches), `js/poly-figs.js` + `assets/poly/` (figures du référentiel) ;
   - `js/scenes/*.js` (scènes dessinées à la main et loupes) et leurs `css/zoom-*.css` ;
   - `js/scenes/atlas.js` (vue d'ensemble : silhouette et position des glandes/organes).
4. **Préparer le référentiel** (voir § 8.1) : texte du polycopié découpé par page, figures extraites.
5. Construire axe par axe en suivant les recettes du § 4, vérifier (§ 8), publier (§ 9).

---

## 3. Architecture technique

### 3.1 Ordre de chargement (`index.html`)
`engine.js` → `model.js` (modèle dédié de l'axe « vedette », ici la thyroïde) → `molecules*.js` → `organs.js` → `info.js` → `sheets-molecules.js` → `sheets-organs.js` → `imaging.js` → `poly-figs.js` → `sheets.js` → `axis-builder.js` → `axes-data.js` → `axes-sim.js` → `axes-steps.js` → `tests.js` → `protein-*.js` → `scenes/atlas.js` → autres scènes et loupes → `app.js` → `video-export.js` → `warning.js`. Les CSS : `style.css` puis `zoom-*.css`, `surrenale.css`, `video-export.css`.

### 3.2 Moteur (`engine.js`)
- Chaque scène est un repère **1600 × 1000** (`HV.W`, `HV.H`) placé dans sa scène parente par `x`, `y`, `scale`. `HV.mount` crée pour chaque scène `sc.g` > `sc.content` (le dessin) + `sc.childLayer` (les enfants) + `sc.pLayer` (particules).
- **Caméra** : `viewBox` du SVG ; `HV.app.flyTo(scène, instant)`.
- **Niveau de détail** (`app.js`, fonction `tick`) : le décor d'un parent s'efface quand on zoome dans un enfant (`sc._op`) ; une scène **hors champ** passe en `display: none` ; vue de loin (scène < 20 % de l'écran), ses **particules sont masquées et figées**. C'est ce qui garde l'atlas fluide (≈ 14 000 éléments SVG).
- **Flux** : `a.flow(d, { mol, rate, speed, size, pace, style })` fait circuler des `<use href="#mol-…">` le long d'un chemin. `HV.flowPace` (curseur « Vitesse des hormones ») et `HV.paceOf(niveau)` (accélère les hormones en excès).
- API de dessin d'une scène (`a`) : `el`, `text` (texte multiligne), `path`, `frame(titre, sous-titre)`, `flow`, `dyn(fn(dt))` (appelé à chaque image), `sign(x, y, 'stim'|'inhib')`, `zoomable(el, idScène)`, `organ(nom, x, y, s)`, `childCaption`.

### 3.3 Axes déclaratifs (`axes-data.js` + `axis-builder.js`)
Un axe = un objet poussé dans `AX` :
- `id`, `card: { side: 'L'|'R', row }` (place de la carte dans la vue d'ensemble), `color`, `target: [x, y]` (glande sur la silhouette), `name`, `sub`, `lead`, `points`, `source` ;
- horloge facultative `clock: 'day'|'cycle'`, `startHour`, `clockInfo`, `clockLabel` ;
- `hh: { x, y, s, flip, inset }` : coupe sagittale cerveau-hypothalamus-hypophyse partagée (`O.hhSagittal`), avec médaillon agrandi ; les nœuds peuvent s'y accrocher par `at: 'hypo'|'me'|'ant'|'post'|'arc'` avec `leader`, `lx`, `ly`, `anchor`, `dot`, `hit` ;
- `nodes` : `{ id, x, y, organ, s, label, sub, color, info, zoom, sheet, bare, gauge, live, w }` (`organ` = icône de `organs.js`, `zoom` = scène ouverte au clic, `bare` = libellé posé sur un dessin fait par `draw`) ;
- `links` : `{ from, to, kind: 'flow'|'stim'|'inhib', mol, bend, mod(T), rate, label, labelAt, labelOff, info }` ; le libellé par défaut est le nom de la molécule ; les **pastilles de nom passent toujours devant les organes** ;
- `panels` (encadrés de sous-système), `draw(a, nodes)` (dessin libre, ex. rein + surrénale), `levels` (barres de niveaux), `chain` (chaîne de biosynthèse).

### 3.4 Modèles (`axes-sim.js`)
`SIMS.<axe> = { title, defaults, init, tau, targets(p, s, T), labs, params, scenarios, interpret(s, p, L, T), hooks }`, transformé par `HV.makeSim` en « fournisseur » du panneau (`setScenario`, `settle`, `step`, `lab`, `interpret`).
- Grandeurs internes **normalisées (1 = sujet sain)** ; chaque variable relaxe vers sa cible (`tau`). Rétrocontrôles exprimés par des exponentielles ou des saturations (`x / (x + K)`).
- `labs` : `{ key, name, unit, range, k (facteur d'échelle), lo, hi, min, max, dec, log, fn(s, p) }`. Les **normes hors référentiel** portent « (complément) » ; une mention générale rappelle sous chaque bilan qu'elles sont **indicatives**.
- `interpret` renvoie `{ tone: 'good'|'warn'|'bad', label, text }` en citant la page du polycopié.
- `hooks` relient le modèle au dessin : `links` (`'de>vers>mol': 'variable'`), `rates`, `cap`, `scale` (taille d'un organe), `liveNode` (valeur affichée dans un nœud), `lesions` (nodule, masse, infiltrat, croix, étiquette, avec fiche), `extraNodes` / `extraLinks` (ex. tumeur ectopique, traitement, insuline injectée), `levels`, `dropMod`.

### 3.5 Pas à pas (`axes-steps.js`, `HV.spotlight`)
- Axes déclaratifs : `S.<axe> = [{ t, d, on: ['nœud', 'de>vers', …] }]` (l'étape s'allume, les précédentes pâlissent, la suite s'estompe).
- Scènes dessinées : `HV.spotlight(def, a, [{ t, d, spot: [[x, y, r] | [x, y, w, h]] }])` (projecteur).

### 3.6 Tests dynamiques (`tests.js`)
`HV.TESTS.<axe> = [{ id, name, poly, what, proto, unit, label, thr | thrFn, thrDir, thrLabel, span, xUnit, duration, samples, apply(p, x), measure(sim), track, interpret(values, sim, st) }]`. `apply` modifie les paramètres pendant l'épreuve (x de 0 à 1) ; `st.base` = paramètres du scénario ; garder dans `st` les valeurs de départ (`na0`, `igf0`) ou extrêmes (`naMax`) utiles à l'interprétation. **Les textes doivent dépendre du scénario** (un même texte pour tous est une source d'erreurs).

### 3.7 Scènes dessinées et loupes (`js/scenes/`)
- `HV.scene({ id, parent, x, y, scale, loupe, title, level, lead, points, legend, source, build(g, a) })`. Les loupes sont posées **hors du cadre** de leur parent : `HV.LOUPE.L(k)` (à droite) ou `HV.LOUPE.R(k)` (à gauche) ; légende sous la vignette (`loupe`).
- Une scène qui a son propre modèle : `def.sim = HV.makeSim('id', SIM)` dans `build`, et `sim.step(dt)` dans un `a.dyn`. Exemple complet : `js/scenes/surrenale.js` (stéroïdogenèse, formules semi-développées générées, trois zones, blocs enzymatiques, bilan en direct).
- Guide détaillé d'écriture d'une loupe : `docs/guide-scenes.md`.

### 3.8 Molécules, organes, fiches
- Glyphes dans `<defs>` (`#mol-<id>`), couleur par `HV.MOLC`, nom par `HV.INFO[id].t` (« Nom · précision » : seul ce qui précède « · » sert d'étiquette).
- Formules semi-développées : générateur de noyau stérane dans `surrenale.js` (`drawSteroid`) ; **toujours vérifier la formule brute recalculée** contre PubChem.
- Fiches : `HV.MOL_SHEETS` (cls, rows, links PubChem/PDB) et `HV.ORGAN_SHEETS` (rows, figs) ; filtrées selon le **chapitre en cours** (`CHAPTER_KW`, `MAIN_ORGANS` dans `sheets.js` : l'organe principal du chapitre s'affiche en entier, ailleurs le reste est replié).
- Figures du référentiel : `HV.POLY_FIGS` (`[n°, légende, partie, page, scènes, crédit]`), `HV.FIG_SPOTS` (pastilles sur les nœuds), `HV.figBadge`, `HV.openFigure`.

### 3.9 Vue d'ensemble (`scenes/atlas.js`)
Silhouette, glandes cliquables (`gland(x, y, r, couleur, scène, libellé)`), lignes de rappel vers les cartes, **grands titres** posés sur chaque carte (visibles de loin, effacés au zoom), rangée « Notions transversales », grande carte transversale (ex. physiologie surrénalienne, entre deux axes).

---

## 4. Recettes

- **Nouvel axe** : `AX.push({...})` dans `axes-data.js` → `SIMS.<id>` dans `axes-sim.js` → pas à pas dans `axes-steps.js` → tests éventuels dans `tests.js` → pastilles de figures dans `poly-figs.js` → info-bulles et fiches. Vérifier avec `tools/verif/allscen.js`, `stepcheck.js`, `overlap.js` et une capture `v2.js`.
- **Nouveau scénario** : une ligne `{ id, name, note, p: { … } }` ; la note décrit ce que le modèle doit montrer, puis on **vérifie que le modèle le montre vraiment** (sinon corriger le modèle ou le texte).
- **Nouvelle pathologie avec traitement** : `extraNodes` + `extraLinks` affichés par `show(p)` ; le traitement ne doit jamais sembler produit par un organe (leçon de l'« insuline injectée »).
- **Nouvelle loupe** : copier une loupe existante, `HV.LOUPE.L(k)`, `zoom: 'id'` sur l'organe correspondant de l'axe (le clic sur l'organe ouvre la loupe ; Maj + clic ouvre la fiche).
- **Scène transversale entre deux axes** : `parent: 'atlas'`, grande carte sous la rangée transversale, entrées cliquables vers les deux axes, `zoom` depuis l'organe de chacun des deux axes.
- **Image d'imagerie** : seulement de **vraies images** (figures du référentiel ou fournies par l'auteur) ; sinon « image manquante, à fournir ». Jamais d'image schématique inventée présentée comme un examen.

---

## 5. Règles éditoriales (non négociables)

1. **Rien n'est inventé.** Tout ce qui vient du référentiel est affirmé avec sa **page PDF** ; tout le reste est marqué « **(complément) »**, idéalement avec la recommandation (SFE, Endocrine Society, ESC, ATA…). Un chiffre douteux est retiré. En cas de besoin d'un document fiable, le demander à l'auteur.
2. Les **coquilles du référentiel** sont corrigées et signalées (ex. 18 µg/dL = 500 nmol/L et non 550 ; 5 µg/dL ≈ 138 nmol/L et non 80).
3. **Valeurs relatives** (« × N ») quand le référentiel ne donne pas de normes (précurseurs surrénaliens, testostérone du SOPK) ; **normes indicatives**, variables selon le laboratoire.
4. **Cohérence texte ↔ simulation** : une note ou une interprétation ne doit jamais annoncer ce que le modèle ne montre pas (« ACTH élevée » avec une ACTH normale, « < 120 mmol/L » avec 125…).
5. **Français soigné** : typographie française (espace avant « : ; ? ! », guillemets « », virgule décimale), phrases courtes, vocabulaire du référentiel.
6. **Avertissement d'ouverture** à chaque chargement : outil didactique, modélisations indicatives, pas de vraies données de patients, aucun usage médical ; source, normes indicatives, auteur.
7. **Auteur** cité dans le bandeau et l'avertissement.

---

## 6. Design et lisibilité

- Couleurs uniquement par **variables CSS** (`--p-*` pour les molécules et liens, `--o-*` pour les organes, `--bg`, `--fg`, `--panel`, `--line`, `--accent`, `--good`, `--warn`, `--bad`) ; thème clair et sombre.
- Texte ≥ 15 px dans le repère 1600 × 1000 ; rien ne déborde du cadre ni ne se chevauche (`tools/verif/overlap.js`) ; l'horloge se place après les titres longs.
- **Le nom de l'hormone passe devant l'organe**, jamais derrière.
- Anatomie crédible : organes réellement voisins dessinés voisins (rein et surrénale), neurones à kisspeptine dans le noyau arqué, testicules sous le pubis, etc. Les neurones d'entrée d'un axe (GnRH, kisspeptine) sont légendés **en haut**, hors des flux.
- Une idée par scène ; explications au survol ; animation sobre (sens et débit).

---

## 7. Préférences de l'auteur, apprises au fil du projet

- Il valide par **quiz d'arbitrage** (Oui, change / Non, garde / Sans importance, avec note) plutôt que par de longs rapports. Il répond vite ; appliquer ensuite et consigner les décisions dans `docs/audit.md`.
- Il veut voir les **pathologies** : précurseurs qui s'accumulent en amont d'un bloc, produits qui chutent en aval, organes qui grossissent ou s'atrophient, vitesse des hormones qui varie.
- Il aime les **tests dynamiques animés** et les **scénarios distincts** quand deux mécanismes diffèrent (SIADH paranéoplasique ou médicamenteux, Hashimoto ou thyroïdite atrophique).
- Il demande l'**iconographie réelle** du référentiel aux bons endroits, et « image manquante » sinon.
- Il présente en **PowerPoint** : export vidéo MP4 intégré (et un éditeur d'options).
- Il partage l'atlas avec ses **internes** en lien public : performance et lisibilité de loin comptent.

---

## 8. Vérifier : la méthode d'audit

### 8.1 Préparer le référentiel
- Texte : `pdftotext -layout` page par page, concaténé avec des marqueurs `===== PARTIE x — PAGE PDF n =====` (fichiers `p1-pages.txt`, `p2-pages.txt`, gardés **hors du dépôt**, dans le dossier de travail de la session).
- Figures : extraites des PDF (`pdfimages` ou rendu de page puis recadrage), réduites à 1 100 px, nommées `assets/poly/fig<n>.jpg`, décrites dans `poly-figs.js` avec la page et le crédit. Vérifier chaque numéro, légende et page.

### 8.2 Contrôles automatiques (`tools/verif/`, à lancer depuis la racine du dépôt)
| Script | Rôle |
| --- | --- |
| `node tools/verif/simtest.js` | tous les scénarios des modèles de `axes-sim.js`, dans Node |
| `node tools/verif/allscen.js` | tous les modèles de la page (y compris thyroïde et scènes à modèle propre), labs et interprétation, erreurs de page |
| `node tools/verif/testsim_settled.js '[["adh","dic","restriction"]]'` | un test dynamique sur un scénario stabilisé |
| `node tools/verif/stepcheck.js file://$PWD/index.html` | chaque étape de chaque pas à pas allume quelque chose |
| `node tools/verif/overlap.js` | textes qui se chevauchent, scène par scène |
| `node tools/verif/v2.js file://$PWD/index.html exports/captures/x '[["cortico","hcs",null]]'` | captures (scène, scénario, étape) |
| `node tools/verif/clip.js <scène> <scénario> x y w h sortie.png` | capture haute définition d'une zone (formules) |
| `node tools/verif/perf.js` | images par seconde et nombre d'éléments |

Plus : recalcul des formules brutes depuis les structures dessinées, recherche des fautes de typographie, `node --check` sur chaque fichier.

### 8.3 Relecture médicale par domaine
- Six relecteurs en parallèle (un par domaine), **lecture seule**, avec une consigne commune (`docs/audit-consignes.md`) : confronter chaque texte, valeur et résultat simulé au référentiel (page) et aux recommandations ; rapport en tableaux Erreur médicale / Imprécision / Forme avec fichier:ligne, citation, source, correction prête, confiance ; section « Points à trancher par l'auteur ».
- Puis chaque relecteur applique **ses** corrections sûres (consigne `docs/audit-consignes.md`, partie 2) : outil d'édition ciblé uniquement (fichiers partagés), `node --check`, re-simulation, captures, pas de commit.
- Le coordinateur relit, commite et pousse, puis transforme les points à trancher en **quiz** (artifact claude.ai avec base de réponses), applique les décisions et les consigne dans `docs/audit.md`.
- Premier audit : 119 constats, dont 12 erreurs médicales. Deuxième audit : une dizaine d'erreurs, surtout dans les **tests dynamiques** et dans l'**accord texte ↔ simulation** : ce sont les zones à surveiller en priorité.

---

## 9. Publier et partager

- `python3 tools/bundle.py <sortie>.html` assemble la page (CSS et JS en ligne) ; les figures `assets/poly/*.jpg` sont publiées à côté (même chemin relatif).
- Publication en artifact claude.ai : capacité **`downloads`** déclarée (export vidéo) ; partage par le menu « Partager » (lien public possible ; tester en navigation privée).
- Export vidéo : bouton « Exporter en vidéo » (WebCodecs H.264 + mp4-muxer 5.1.3, rendu image par image) ; hors ligne : `tools/enregistrer-video.js` (Playwright + ffmpeg).
- Local : `python3 -m http.server` (en `file://`, Chrome bloque la lecture des feuilles de style pour l'export vidéo).

---

## 10. Pièges déjà rencontrés

- Un `display: none` ou une opacité 0 d'un parent fige les `a.dyn` de ses enfants : tout effet qui doit agir hors de la scène se règle dans `app.js` (ex. grands titres de la vue d'ensemble).
- Les dessins de `draw` passent au-dessus des liens : les pastilles de nom sont remontées après coup.
- Le bilan d'eau : sans boisson, la natrémie ne peut pas redescendre ; une restriction doit couper toutes les entrées d'eau.
- Un réservoir enzymatique « niveau = apport / (activité + c) » compense trop si `c` est petit : régler l'exposant de l'activité et le plafond de l'ACTH pour qu'un bloc complet fasse vraiment baisser le produit.
- Les loupes d'agents différents réutilisent parfois la même clé d'info-bulle (doublon dans `HV.INFO`) : préfixer chaque clé par la loupe.
- L'avertissement d'ouverture intercepte les clics dans les tests Playwright : cliquer `#warnOk` d'abord.
- Les sous-agents peuvent s'arrêter sur une limite d'usage : leur travail est conservé ; les relancer par message au lieu d'en créer de nouveaux.

---

## 11. Consignes types à réutiliser

- « Lis docs/MEMOIRE-ATLAS.md et docs/guide-scenes.md. Construis l'axe X d'après le référentiel (pages …) : nœuds, liens, modèle, labs, scénarios A, B, C, interprétation, pas à pas, tests Y. Rien d'inventé ; complément signalé. Vérifie avec tools/verif. »
- « Fais un audit complet suivant le § 8 de docs/MEMOIRE-ATLAS.md, puis un quiz des points à trancher. »
- « Construis une loupe Z (parent X, HV.LOUPE.L(k)) en suivant docs/guide-scenes.md ; captures en thème clair et sombre ; liste de ce qui est hors référentiel avec références à vérifier. »
