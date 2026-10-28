# Audit médical, 2e passe : SURRÉNALES

Périmètre : axe corticotrope (`SIMS.cortico`, nœuds, pas à pas), médullosurrénale (`SIMS.medullo`), SRAA (`SIMS.raa`), scène `js/scenes/surrenale.js` (formules, enzymes, modèle, 7 scénarios), loupes `js/scenes/zoom-adrenal.js`, tests dynamiques de `js/tests.js` (Synacthène, freinages minute et fort, hypoglycémie insulinique, charge sodée), entrées de `info.js`, `sheets-molecules.js`, `sheets-organs.js` et `poly-figs.js`.

Méthode :
- Modèles des axes lancés dans Node (`simtest.js`) ; tests dynamiques lancés avec `testsim.js` sur chaque scénario utile.
- Scène `surrenale` lancée avec Playwright : `setScenario`, puis 2 000 pas, `lab`, `interpret`. Captures à deviceScaleFactor 3, avec des recadrages pour lire les formules. Scripts et captures : tools/verif/sr2/
- Pages citées : pages du PDF, partie 1 (P1), comme dans docs/audit.md.

## 0. Vérifications sans anomalie (résumé)

**Formules semi-développées (drawSteroid, table MOL), contrôlées sur la capture HD.**
- Noyau stérane : cycles A, B, C et D bien numérotés. Méthyles C18 et C19 angulaires.
- Δ5 tracée entre C5 et C6 (cholestérol, prégnénolone, 17-OH-prégnénolone, DHEA, DHEA-S).
- Δ4 tracée entre C4 et C5, avec 3-céto (progestérone, 17-OHP, androstènedione, testostérone, DOC, composé S, corticostérone, cortisol, aldostérone).
- 3β-OH (stéroïdes Δ5), 3-sulfate de la DHEA-S, 17-céto (DHEA, DHEA-S, androstènedione), 17β-OH (testostérone).
- 17α-OH en liaison hachurée (17-OH-prégnénolone, 17-OHP, composé S, cortisol). 20-céto et 21-OH (DOC, S, B, F, aldostérone). 11β-OH (B, F, aldostérone).
- Aldéhyde en C18 de l'aldostérone, tracé sous sa forme aldéhyde (la fiche signale la forme hémiacétal).
- Chaîne latérale du cholestérol : 8 carbones (C20 à C27) avec le branchement isopropyle terminal. Tout est juste.

**Formules brutes, identiques à PubChem.**
- C₂₇H₄₆O, C₂₁H₃₂O₂, C₂₁H₃₂O₃, C₁₉H₂₈O₂ (DHEA et testostérone), C₁₉H₂₈O₅S (forme acide de la DHEA-S), C₂₁H₃₀O₂, C₂₁H₃₀O₃ (17-OHP et DOC), C₁₉H₂₆O₂, C₂₁H₃₀O₄ (S et B), C₂₁H₃₀O₅, C₂₁H₂₈O₅.
- Masses des fiches justes : cortisol 362,5, aldostérone 360,4, DHEA 288,4, progestérone 314,5, cholestérol 386,7, adrénaline C₉H₁₃NO₃ 183,2, noradrénaline 169,2, dopamine 153,2, angiotensine II C₅₀H₇₁N₁₃O₁₂ 1 046,2.

**Enzymes et zones, conformes à la figure 26 (P1 p. 71).**
- StAR puis CYP11A1, 3β-HSD, CYP17 (17α-hydroxylase puis 17,20-lyase, avec une lyase faible sur la 17-OHP), CYP21A2 sur la progestérone et sur la 17-OHP.
- CYP11B1/B2 sur la DOC, CYP11B1 sur le composé S, CYP11B2 jusqu'à l'aldostérone, 17β-HSD, SULT2A1.
- Pas de CYP17 dans la zone glomérulée (complément bien signalé).

**Poly et valeurs.**
- Cortisol : seuils de 138 et 500 nmol/L, avec la conversion juste (×27,6).
- ACTH : 20–52 pg/mL (P1 p. 88).
- Synacthène 250 µg IV ou IM, à T0, 30 et 60 min (P1 p. 61 et 89).
- Hypoglycémie insulinique : glycémie < 0,40 g/L et cortisol > 500 nmol/L (P1 p. 61).
- HCS : CYP21A2, 6p21.3, 95 % des cas (P1 p. 80). Dépistage à J3 (P1 p. 81).
- Zone fasciculée : 75–80 % du cortex (P1 p. 72).
- Incidentalome : taille, densité en UH, wash-out, antécédent de cancer (P1 p. 82-84).
- Cathétérisme des veines surrénales (P1 p. 78). Veines surrénales (P1 p. 69).
- Médullosurrénale : 80–95 % d'adrénaline, 10–20 % de noradrénaline (P1 p. 74).

**Résultats simulés justes.**
- Axe corticotrope : Cushing (ACTH 37, rythme aboli), adénome (ACTH 3), Addison (cortisol 94, ACTH 290), insuffisance corticotrope (cortisol 92, ACTH 9), HCS classique, corticothérapie.
- Freinage minute : sujet sain à 13 nmol/L, Cushing non freiné. Freinage fort : Cushing −63 %, sécrétion ectopique sans baisse, adénome écarté.
- SRAA : hyperaldostéronisme secondaire, insuffisance surrénale, charge sodée (sujet sain freiné, HAP non freiné à 1 058 pmol/L).
- Scène `surrenale` : insuffisance corticotrope (aldostérone et rénine normales), insuffisance périphérique (tous les stéroïdes à 0,12 × N, ACTH 102, rénine 74, K⁺ 6,6, Na⁺ 128), bloc 21-OH classique (cortisol 96, aldostérone 67, 17-OHP 23 × N, progestérone 22 × N, rénine 61, K⁺ 5,8), bloc 11β (S 23 × N, DOC 14 × N, rénine 0,6, aldostérone 12, K⁺ 3,1, PAS 153).

## 1. Erreurs médicales

| n° | fichier:ligne | texte ou valeur actuels | problème | source | correction proposée | confiance |
|---|---|---|---|---|---|---|
| E1 | js/tests.js:29 (avec js/axes-sim.js:80-81 et le scénario `corticotrope` en js/axes-sim.js:124) | Scénario « Insuffisance corticotrope » (cortisol à 8 h 92 nmol/L, ACTH 9 pg/mL) + Synacthène → valeurs 111 / 511 / 512 nmol/L → « réponse normale. Une insuffisance surrénale est éliminée » | Dans une insuffisance corticotrope installée, le test conclut à tort qu'il n'y a pas d'insuffisance. Le scénario n'est pas « récent » : le cortisol de base, < 138 nmol/L, suffit déjà au diagnostic, et l'interprétation de base dit « Insuffisance corticotrope ». La trophicité du modèle (`troph = acth^0,8`, plancher 0,15) laisse une réponse à 512 nmol/L, alors que le principe du test est l'atrophie après une privation prolongée d'ACTH. | P1 p. 61 (« une déprivation prolongée […] résulte en une atrophie du parenchyme qui […] n'est pas (plus) capable de satisfaire une réponse hormonale intègre ») ; P1 p. 85 (atrophie des zones fasciculée et réticulée) | Modèle : rendre la trophicité plus sensible à l'ACTH, par exemple `clamp(pw(Math.max(acth, 0.01), 1.3), 0.08, 1.6)`, et vérifier que le scénario `corticotrope` culmine sous 500 nmol/L (autour de 250–350). À défaut, garde-fou dans `interpret` : `if (peak >= 500 && v[0] < 138) return { tone: 'warn', text: 'Cortisol de base < 138 nmol/L (5 µg/dL) mais réponse ≥ 500 nmol/L : insuffisance corticotrope récente possible (surrénales pas encore atrophiées) ; le test au Synacthène ne l\'exclut pas. Hypoglycémie insulinique ou réévaluation.' }` | haute |

## 2. Imprécisions

| n° | fichier:ligne | texte ou valeur actuels | problème | source | correction proposée | confiance |
|---|---|---|---|---|---|---|
| I1 | js/axes-sim.js:131 ; js/scenes/surrenale.js:113 | « Cortisol maintenu au prix d'une ACTH élevée » (forme non classique) | Les modèles donnent une ACTH normale : 35 pg/mL (axe) et 28 pg/mL (scène), pour une norme de 20–52. Sous Synacthène (scénario `b21syn`), l'ACTH endogène vaut 8 pg/mL alors que le même texte s'affiche. Dans la forme non classique, l'ACTH et le cortisol de base sont habituellement normaux. | P1 p. 81-82 (formes modérées, diagnostic par la 17-OHP) ; Speiser PW et al., Endocrine Society 2018 (CAH) | « Cortisol conservé, ACTH normale ou discrètement augmentée ; 17-OHP et androgènes augmentés » (garder la suite du texte) | haute |
| I2 | js/scenes/surrenale.js:104 | « L'ACTH compense : cortisol conservé, 17-OHP et androgènes modérément élevés » | Mêmes valeurs simulées. De plus, l'androstènedione (1,6 × N) et le SDHEA (1,1 × N) restent dans la plage « normale » du bilan (0,5–2 × N) : les androgènes ne sont pas « élevés » à l'écran. Dans l'axe (`hcsnc`), androgènes à 4 × N : les deux scènes divergent. | P1 p. 82 | Modèle : augmenter le détournement de la 17-OHP vers l'androstènedione (par exemple `adione = 0.2 * F + ohp * 0.3`) pour que la forme non classique dépasse 2 × N. Sinon, texte : « cortisol conservé, 17-OHP élevée, androgènes normaux ou modérément élevés » | haute |
| I3 | js/scenes/surrenale.js:110 et 106 | « Androgènes surrénaliens en excès : virilisation » (bloc 11β) | Valeurs simulées : androstènedione 1,93 × N, SDHEA 1,93 × N, testostérone 1,93 × N, toutes sous la borne haute de 2 × N, donc sans flèche « ↑ » dans le bilan. Le texte annonce un excès que la scène ne montre pas. | Complément (White PC, Endocr Rev 1994 ; Speiser 2018) | Modèle : dans `core`, faire passer une part du 11-désoxycortisol ou de la 17-OHP accumulés vers l'androstènedione (par exemple `adione = 0.2 * F + (ohp + 0.3 * s11) * C`), pour une androstènedione d'au moins 3 × N dans `b11` | moyenne |
| I4 | js/axes-sim.js:662 ; js/axes-steps.js:91 | « Aldostérone autonome : rénine freinée » ; pas à pas : « la rénine est effondrée » | Rénine simulée à 5,3 mUI/L, à l'intérieur de la norme affichée (5–40) : le bilan ne la marque pas comme basse. Le polycopié pose le diagnostic sur une rénine basse. | P1 p. 75 (« mise au repos de la production de rénine ») et p. 77 (« une rénine basse ») | Modèle : renforcer le freinage volémique (`ex(-12 * (s.vol - 1) …)`) ou augmenter `conn`, pour une rénine autour de 2–3 mUI/L dans `hap` ; et remplacer « effondrée » par « freinée (basse) » | haute |
| I5 | js/axes-sim.js:407 (avec :387 et :395) | « HTA généralement permanente avec parfois des crises paroxystiques » (phéochromocytome à adrénaline) | PAS simulée entre 133 et 147 mmHg : normale entre les paroxysmes, au-dessus de 140 seulement pendant le pic. Le modèle illustre une HTA paroxystique pure. | P1 p. 78 (« L'HTA […] est généralement permanente ») | Relever la composante de fond (`A: p.sym + 3 * p.pheoA * parox` avec `parox = 0.6 + 1.4 * G(…)`), ou ajouter une composante noradrénergique, pour une PAS de base ≥ 145 mmHg | moyenne |
| I6 | js/axes-sim.js:122 | « Tumeur (bronches, pancréas…) : ACTH et cortisol très élevés. » | ACTH simulée à 125 pg/mL. Le seuil d'interprétation « ACTH très élevée » est à 150 (axes-sim.js:142) : le scénario s'affiche comme un simple « Cushing ACTH-dépendant ». La note et l'interprétation se contredisent. | Cohérence interne ; seuil indicatif (complément) | Porter `ecto` à 7 dans le scénario (ACTH > 150), ou abaisser le seuil à 100 pg/mL, en gardant la mention « (seuil indicatif, complément) » | haute |
| I7 | js/scenes/surrenale.js:101 et 116 ; :212 | « (polycopié p. 82 et 85) » (insuffisance corticotrope) ; « (polycopié p. 70 et 82) » (zone glomérulée préservée) | La page 82 traite de la forme non classique de l'HCS et de l'incidentalome. La préservation de l'aldostérone et la rénine normale figurent p. 85 et p. 88. | P1 p. 85, p. 88 | « (polycopié p. 85 et 88) » ; pour sr-zg : « (polycopié p. 70, 72 et 85) » | haute |
| I8 | js/scenes/surrenale.js:213 ; :210 | sr-zf « (polycopié p. 71) » ; sr-cort « Pic en début de matinée (polycopié p. 71) » | La page 71 ne contient que les figures 26 et 27. La zone fasciculée et ses 75–80 % sont p. 72, le rythme circadien p. 73. | P1 p. 72, 73 | sr-zf : « (polycopié p. 72) » ; sr-cort : « (polycopié p. 72-73) » | haute |
| I9 | js/scenes/surrenale.js:223 | « corticostérone → 18-OH-corticostérone → aldostérone (polycopié p. 70 ; détail : complément) » | La figure 26 (p. 71) montre la 18-OH-corticostérone et l'aldostérone synthase (CYP11B2) aux deux étapes : la mention « complément » est abusive. | P1 p. 71, figure 26 | « (polycopié p. 70 et figure 26) » | haute |
| I10 | js/tests.js:31 et 29 | Scénario `hcs` + Synacthène : « réponse insuffisante. Avec une ACTH élevée : insuffisance surrénale périphérique. » Scénario `hcsnc` : « réponse normale. Une insuffisance surrénale est éliminée » | Le test au Synacthène ne relève que le cortisol, alors que dans l'HCS non classique il sert surtout à doser la 17-OHP après stimulation. L'élève reçoit « normal » sans voir la 17-OHP stimulée. Dans la forme classique, la conclusion ne mentionne pas le bloc enzymatique. | P1 p. 82 (« 17-hydroxyprogestérone (de base ou après test de stimulation par l'ACTH) ») | Ajouter à `interpret` : `if (sim.p.cyp21 < 0.9) txt += ' 17-OHP après stimulation : ' + sim.lab('ohp').toFixed(1) + ' × N : élévation en faveur d\'un bloc en 21-hydroxylase (polycopié p. 82).'` ; pour la forme classique, « insuffisance surrénale périphérique (ici par bloc en 21-hydroxylase) » | moyenne |
| I11 | js/axes-sim.js:415 | « Imagerie ensuite (scanner, IRM, imagerie fonctionnelle ; complément) » | L'imagerie (scanner ou IRM, puis imagerie fonctionnelle) figure dans le polycopié : la mention « complément » est abusive. À l'inverse, « origine surrénalienne quasi certaine » (profil adrénergique) et « rechercher une mutation SDHB » sont des compléments, couverts seulement par une parenthèse ambiguë. | P1 p. 79 | « … Profil ${kind} (complément ; seuil de 3 × LSN indicatif). Imagerie ensuite : scanner ou IRM, puis imagerie fonctionnelle (polycopié p. 79). » | haute |
| I12 | js/axes-sim.js:417 | « faux positif fréquent (stress, médicaments, prélèvement non couché) » | Le polycopié cite le stress (affection grave aiguë), les médicaments et l'alimentation. « Prélèvement non couché » est un complément non signalé. | P1 p. 79 ; Lenders JWM et al., Endocrine Society 2014 (position couchée) | « faux positifs (stress, affection aiguë grave, médicaments, alimentation ; polycopié p. 79 ; prélèvement en position assise : complément) » | moyenne |
| I13 | js/tests.js:123 | « Perfusion de 2 L de sérum salé isotonique en 4 h, patient allongé ; […] Les seuils sont des compléments » (`poly: true`) | Le polycopié ne cite que le principe du test. Le protocole (2 L en 4 h, position) est lui aussi un complément. Les recommandations actuelles admettent, voire préfèrent, la position assise. | P1 p. 77 ; Funder JW et al., Endocrine Society 2016 | « Perfusion de 2 L de sérum salé isotonique en 4 h, en position couchée ou assise (protocole et seuils : complément, Endocrine Society 2016) ; aldostérone avant et après. » | moyenne |
| I14 | js/scenes/surrenale.js:202 | « Bas dans l'adénome cortisolique et dans les insuffisances surrénales, élevé dans le corticosurrénalome (polycopié p. 80) » | La page 80 couvre l'adénome et le corticosurrénalome, pas les insuffisances surrénales (p. 85). | P1 p. 80, 85 | « (polycopié p. 80 et 85) » | haute |
| I15 | js/scenes/surrenale.js:249 | « partie 1, p. 70-73 et 80-85, figure 26 » | La biologie des insuffisances surrénales (ACTH, rénine, aldostérone, seuils du cortisol) est p. 88, le test au Synacthène p. 61 et 89. | P1 p. 61, 88-89 | « partie 1, p. 61, 70-73, 80-85 et 88-89, figure 26 ; compléments signalés. » | haute |
| I16 | js/poly-figs.js:99 | `liver: ['30']` (axe corticotrope) | La figure 30 (mélanodermie de l'insuffisance surrénale) est rattachée au nœud « Foie ». | P1 p. 87 | La rattacher à la corticosurrénale : `adr: ['24', '25', '26', '30']`, et retirer `liver: ['30']` | haute |
| I17 | js/scenes/surrenale.js:399 | « Sans CYP17, la zone glomérulée ne fabrique que des minéralocorticoïdes » | L'absence de CYP17 dans la glomérulée est un complément (signalé dans sr-e-17, mais pas dans ce pas à pas). | Complément (Miller & Auchus, Endocr Rev 2011) | « Sans CYP17 (complément), la zone glomérulée… » | moyenne |
| I18 | js/axes-data.js:216 (points de `medullo`) | « seule la médullosurrénale, baignée de cortisol, fabrique beaucoup d'adrénaline » ; « participent à la contre-régulation de l'hypoglycémie » | Le polycopié dit seulement que les glucocorticoïdes augmentent la tyrosine hydroxylase et la PNMT. La circulation portale corticomédullaire et la contre-régulation glycémique sont des compléments non signalés. | P1 p. 74 | Ajouter « (complément) » après « fabrique beaucoup d'adrénaline » et après « contre-régulation de l'hypoglycémie » | moyenne |

## 3. Forme

| n° | fichier:ligne | texte ou valeur actuels | problème | source | correction proposée | confiance |
|---|---|---|---|---|---|---|
| F1 | js/scenes/surrenale.js:167 | `labels.push([3.33, -2.78, 'OHC', 'end'])` | Sur la capture HD, « OHC » se superpose au sommet C12 et à la liaison C11–C12. On lit « HO OHC » côte à côte, et l'aldéhyde semble porté par C12 au lieu de C18 (sur C13). | Capture sr2/aldo.png ; structure de l'aldostérone (PubChem CID 5839) | Prolonger la liaison C18 vers le haut et poser l'étiquette au bout : `bonds.push([13, [3.464, -3.0]]); labels.push([3.464, -3.25, 'CHO', 'middle'])` (déplacer le 21-OH si besoin) | moyenne |
| F2 | js/scenes/surrenale.js:170 et 272 | « ⁻O₃SO » (DHEA-S) | Étiquette coupée par le bord gauche de la case : le signe « ⁻ » sort du cadre. | Capture sr2/dheas.png | Décaler la molécule de la DHEA-S vers la droite (`translate(-w/2 + 64 …)` pour `dheas`), ou écrire « NaO₃SO » ou « HO₃SO » plus court | haute |
| F3 | js/scenes/surrenale.js:171, 186 | 11β-OH et 17β-OH en traits simples ; 17α-OH en hachures | Convention stéréochimique incomplète : un groupe α est hachuré alors qu'aucun groupe β n'est en coin plein. | Convention IUPAC des stéroïdes | Tracer 11β-OH et 17β-OH en coin plein (triangle), ou ajouter « α hachuré, β en trait » dans la fiche | basse |
| F4 | Scène `surrenale` vs axe `cortico` | Insuffisance périphérique : ACTH 102 (scène) / 290 pg/mL (axe) ; bloc 21-OH classique : ACTH 84 / 203, 17-OHP 23 / 44 × N ; insuffisance corticotrope : cortisol 40 / 92 nmol/L | Deux modèles décrivent les mêmes scénarios avec des chiffres différents. Pas d'enjeu médical (valeurs relatives assumées), mais l'élève qui passe d'une scène à l'autre voit des écarts. | Cohérence interne | Harmoniser les paramètres des scénarios (par exemple `adr: 0.06` donnant la même ACTH), ou le signaler dans `points` | basse |
| F5 | js/axes-sim.js:651 | `{ key: 'k', name: 'Kaliémie', unit: 'mmol/L', k: 1, lo: 3.5, hi: 5, … }` | Seule ligne du bilan SRAA sans `range` : la norme n'apparaît pas. | Cohérence interne | Ajouter `range: '3,5–5,0 mmol/L'` | haute |
| F6 | js/scenes/surrenale.js:113 | « 17-OHP explosive sous Synacthène » | Rapport simulé : 6,8 × N (forme non classique sous ACTH 1-24) contre 1,9 × N chez le sujet sain sous ACTH. L'élévation est nette, « explosive » exagère. | Cohérence interne | « 17-OHP nettement augmentée sous Synacthène » | basse |

## Points à trancher par l'auteur

1. **Trophicité et Synacthène (E1).** Faut-il que le scénario « Insuffisance corticotrope » montre une réponse insuffisante au Synacthène (atrophie, principe du test selon P1 p. 61) ? Ou préfère-t-on une forme « récente » où le test est faussement normal, mais alors avec un scénario dédié et un message explicite ?
2. **Amplitude des androgènes dans les blocs.** Dans les blocs 21-OH non classique et 11β, les androgènes simulés restent sous 2 × N (I2, I3). Faut-il les relever, ou élargir la norme relative affichée ?
3. **ACTH dans l'HCS classique.** 84 pg/mL dans la scène `surrenale`, 203 pg/mL dans l'axe. Les recommandations (Speiser 2018) décrivent une ACTH franchement élevée ; une valeur au-dessus de 150 est-elle souhaitée ?
4. **Test au Synacthène et 17-OHP.** Faut-il ajouter un test « Synacthène avec 17-OHP » distinct (P1 p. 82) dans les tests de l'axe corticotrope, plutôt que de compléter le texte du test actuel (I10) ?
5. **Lyase sur la 17-OHP.** La figure 26 la dessine, et la scène montre un flux faible (« lyase »). Chez l'humain, cette voie Δ4 est quasi nulle ; l'excès d'androgènes du bloc 21-OH passe aussi par la DHEA, les 11-oxyandrogènes et la voie « backdoor » (complément, Turcu & Auchus 2015). Faut-il le mentionner en complément dans `sr-e-ly` ?

## Synthèse

1 erreur médicale, 18 imprécisions, 6 constats de forme. Formules semi-développées, formules brutes et enzymes sont justes et conformes à la figure 26.

## Corrections appliquées

Vérifications après les corrections : `node --check` passe sur les 5 fichiers touchés. Scénarios et tests relancés avec simtest.js, testsim.js, allscen.js (0 erreur de page) et le harnais de la scène (sr2/srnode.js). Captures Playwright regardées (sr2/after*.png). Aucun scénario n'a changé d'interprétation sans que ce soit voulu.

| n° | État | Détail |
|---|---|---|
| E1 | fait (modèle) | js/axes-sim.js : trophicité `clamp(pw(acth, 1.3), 0.08, 1.6)` (polycopié p. 61 et 85). Synacthène dans l'insuffisance corticotrope : 512 → 409 nmol/L, « réponse insuffisante ». Sujet sain 859, forme non classique 661, Addison 86, corticothérapie 329 : conclusions inchangées. Les autres scénarios gardent leur interprétation (insuffisance corticotrope : cortisol de base 75 nmol/L). |
| I1 | fait (texte) | « Cortisol conservé, ACTH normale ou discrètement augmentée », dans axes-sim.js (interprétation et note de `hcsnc`) et dans surrenale.js:113. |
| I2 | fait (modèle et texte) | surrenale.js : détournement de la 17-OHP vers l'androstènedione `ohp * 0.3` (flux de la flèche `ly2` aligné). Forme non classique : androstènedione 2,3 × N ↑. Note réécrite (ACTH normale ou discrètement augmentée). |
| I3 | fait (modèle) | surrenale.js : trophicité plafonnée à 2 au lieu de 1,25 (hyperplasie sous excès chronique d'ACTH, polycopié p. 72). Bloc 11β : androgènes à 2,9 × N ↑, K⁺ 2,6, PAS 166. Effets voulus : bloc 21-OH classique avec 17-OHP 35 × N, androstènedione 17,5 × N, cortisol 147 nmol/L (toujours « classique ») ; insuffisance périphérique avec cortisol 75. |
| I4 | fait (modèle et texte) | Gain du freinage volémique de la rénine passé de 8 à 10 : rénine 4,1 mUI/L ↓ dans l'HAP. Hyperaldostéronisme secondaire (aldostérone 565) et charge sodée inchangés. Pas à pas : « freinée, basse (polycopié p. 75 et 77) ». |
| I5 | fait (modèle) | Sécrétion mixte du phéochromocytome à adrénaline (noradrénaline 0,4 × pheoA, normétanéphrine et flux associés). PAS 157–176 mmHg, profil toujours adrénergique (métanéphrine 6,7, normétanéphrine 2,9). Note complétée. |
| I6 | fait (modèle) | Scénario `ecto` : `ecto: 7`, ACTH 175 pg/mL → « Cushing ACTH-dépendant, ACTH très élevée » ; freinage fort toujours sans baisse. |
| I7, I8, I9, I14, I15, I17 | fait | Pages corrigées (p. 85 et 88 ; 70, 72 et 85 ; 72-73 ; figure 26 ; 80 et 85 ; source p. 61, 70-73, 80-85, 88-89) ; « (complément) » ajouté pour l'absence de CYP17. |
| I10 | fait | tests.js : en cas de bloc en 21-hydroxylase, le Synacthène affiche la 17-OHP stimulée (polycopié p. 82), avec un ton d'alerte dans la forme non classique (17-OHP 20,6 × N) et « ici par bloc en 21-hydroxylase » dans la forme classique. |
| I11, I12 | fait | Imagerie attribuée au polycopié p. 79 ; faux positifs selon p. 79, la position du prélèvement restant en complément. |
| I13 | fait | Protocole de la charge sodée : principe (p. 77) ; protocole et seuils en complément (Endocrine Society 2016), position couchée ou assise. |
| I16 | fait par un autre agent | La figure 30 n'est plus rattachée au foie (déplacée vers l'antéhypophyse dans poly-figs.js:99) ; je n'y ai pas touché. |
| I18 | fait | Contre-régulation de l'hypoglycémie sourcée (polycopié, partie 2, p. 67) ; TH et PNMT (p. 74) ; « seule la médullosurrénale… » marqué (complément). |
| F1 | fait | Aldéhyde de l'aldostérone : liaison C13–C18 inclinée, « OHC » au bout de la liaison, au-dessus du cycle C. Plus de chevauchement avec C12 (contrôlé sur la capture). |
| F2 | fait | Molécule de la DHEA-S décalée de 14 px : « ⁻O₃SO » entièrement visible. |
| F5 | fait | `range: '3,5–5,0 mmol/L'` ajouté à la kaliémie du SRAA. |
| F3, F4, F6 | non fait | Confiance basse ou choix de présentation (coins stéréochimiques, harmonisation des deux modèles, « explosive »). |

Limite connue (préexistante, devenue plus visible) : dans la scène `surrenale`, la trophicité reste figée pendant le Synacthène. Le scénario `b21syn`, choisi juste après `b11` ou `b21`, hérite de leur hyperplasie (troph jusqu'à 2) et surestime le cortisol. Après `b21nc` ou `eu`, les valeurs sont celles de l'audit. À trancher : remettre à zéro la trophicité au changement de scénario.

## Décisions appliquées

Vérifications : `node --check` passe sur js/axes-sim.js, js/tests.js et js/scenes/surrenale.js. `tools/verif/allscen.js` : 0 erreur de page. `tools/verif/testsim_settled.js` relancé sur tous les tests de l'axe corticotrope (y compris le nouveau) et sur la charge sodée. Captures (`tools/verif/v2.js`) de l'axe corticotrope (scénario récent) et de la scène `surrenale` (bloc 21-OH).

| Point | Décision | Ce qui a été fait |
|---|---|---|
| S1 | oui | **Modèle** (js/axes-sim.js) : nouveau paramètre `recent` (trophicité maintenue à 1, cortex non encore atrophié) et nouveau scénario « Insuffisance corticotrope récente » (`pit: 0.03, recent: 1`, polycopié p. 61 et 85). Résultats : cortisol à 8 h 142 nmol/L (zone grise), ACTH 6 pg/mL, Synacthène 874 nmol/L. L'étiquette « cortex atrophique » est masquée dans ce scénario. **Test au Synacthène** (js/tests.js) : branche dédiée « réponse faussement rassurante […] insuffisance corticotrope récente possible […] hypoglycémie insulinique ou nouveau test à distance » ; elle s'affiche si le scénario est récent ou si le cortisol de base est < 275 nmol/L avec une ACTH < 20 pg/mL. L'hypoglycémie insulinique reste anormale (220 nmol/L). Le scénario « Insuffisance corticotrope » ancien est conservé (réponse insuffisante, 278 nmol/L). |
| S2 | oui | **Scène `surrenale`** : gain du rétrocontrôle du cortisol sur l'ACTH porté de 1,6 à 3,6. ACTH dans l'HCS classique : 187 pg/mL (axe : 203) ; dans le bloc 11β : 187 ; dans l'insuffisance périphérique : 350 (axe : 290). **Effet de bord corrigé** : l'insuffisance corticotrope de la scène passe à `pit: 0.03`, comme dans l'axe (cortisol 111 nmol/L, ACTH 10). Forme non classique : ACTH 28. Les interprétations des 7 scénarios sont inchangées. |
| S3 | oui | **Nouveau test « Synacthène : 17-OHP »** dans l'axe corticotrope (polycopié p. 82). 17-OHP à T0 et à 60 min, en valeur relative, seuil pédagogique de 5 × N ; repère clinique : 17-OHP stimulée > 10 ng/mL ≈ 30 nmol/L (complément, Endocrine Society 2018). Résultats : sujet sain 1,0 → 2,1 × N (normal) ; forme non classique 11,2 → 20,6 × N (bloc non classique) ; forme classique 43,9 × N d'emblée avec cortisol bas (test non nécessaire, dépistage à J3, p. 81) ; Addison et insuffisance corticotrope : 17-OHP non stimulable (non contributif). docs/tests-dynamiques.md mis à jour. |
| S4 | non | Rien fait. |
