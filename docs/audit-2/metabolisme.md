# Audit médical (2e passage) — calcium, glucose, lipides

Périmètre : SIMS.phospho / SIMS.glyc / SIMS.lipid (js/axes-sim.js), axes correspondants de js/axes-data.js et js/axes-steps.js, js/scenes/islet.js, js/scenes/zoom-glyc.js, js/scenes/zoom-phospho.js, partie calcium et glucose de js/scenes/zoom-rein.js, T.glyc de js/tests.js, docs/tests-dynamiques.md, fiches de js/sheets-molecules.js, js/sheets-organs.js, js/info.js, js/poly-figs.js.

Sources : polycopié CEEDMM 2023, P1 p. 33–46 (parathyroïdes, calcium), P2 p. 17–28 (lipides), p. 29–65 (diabète), p. 66–73 (hypoglycémie). Toutes les pages citées sont des pages PDF.

## Résultats simulés (régime établi, Node, harnais simtest.js et scripts de grille)

| Axe | Scénario | Valeurs | Interprétation |
| --- | --- | --- | --- |
| phospho | eu | Ca 2,40 · PTH 35 · 25-OH-D 40 · CaU 4,5 · Pi 1,10 | normal |
| phospho | hpt | Ca 2,82 · PTH 88 · CaU 13,0 · Pi 0,91 | HPT PTH-dépendante |
| phospho | hypo | Ca 1,91 · PTH 7 · CaU 1,7 · Pi 1,51 | hypoparathyroïdie |
| phospho | vitd | Ca 2,39 · PTH 108 · 25-OH-D 4 · Pi 0,67 | HPT secondaire (conforme à C3) |
| phospho | pthrp | **Ca 2,63** · PTH 2,3 · Pi 0,46 | non parathyroïdienne |
| phospho | hhf | Ca 2,62 · PTH 35 · CaU 2,1 | hypocalciurique |
| glyc | eu | G 0,84–0,92 · **Ins 6–9 µUI/mL** | normal |
| glyc | dt1 | G 2,21–2,45 · Ins 1 · cétonémie 1,1–1,3 | hyperglycémie avec cétose |
| glyc | dt1t | G 0,51–0,53 en permanence · Ins 12–18 | niveau 2 |
| glyc | dt2 | G 1,48–1,63 · Ins 9–11 | hyperglycémie |
| glyc | insulinome | G 0,49–0,55 · Ins 36 | **alterne** « Hypoglycémie » / « Glycémie basse, insuline inappropriée » |
| lipid | eu / hfhe / hfho | LDL 1,20 / 2,40 / 8,00 | conformes |
| lipid | apob / pcsk9g | LDL 2,40 | HF |
| lipid | statin / pcsk9 | LDL 1,26 (−47 %) / 0,53 (−58 % de plus) | au-dessus de l'objectif / à l'objectif |
| lipid | htg | TG 5,0 · LDL 1,20 · HDL 0,55 | hypertriglycéridémie |

Tests dynamiques : HGPO sain 0,84 / 1,22 / 1,04 (normale) ; DT2 1,48 / 2,77 / 2,08 ; **insulinome 0,49 / 0,91 / 0,69 → « tolérance normale au glucose »** ; jeûne de 72 h : sain, minimum 0,74 et insuline 2,8 ; insulinome, minimum 0,36 et insuline 36 → hyperinsulinisme ; DT1 traité (non indiqué) : hyperinsulinisme.

## Erreur médicale

| n° | fichier:ligne | texte ou valeur actuels | problème | source | correction proposée | confiance |
| --- | --- | --- | --- | --- | --- | --- |
| E1 | js/axes-sim.js:752 et js/scenes/islet.js:205 | `show: (p) => p.beta < 0.5, label: 'insulite auto-immune' … title: 'Diabète de type 1'` ; `insul.setAttribute('opacity', p.beta < 0.5 ? 1 : 0)` | Le scénario DT2 (`beta: 0.35`) remplit la condition : l'îlot du DT2 affiche une « insulite auto-immune » étiquetée « Diabète de type 1 ». Le DT2 n'est pas auto-immun. | P2 p. 33 (DT1 auto-immun ; DT2 = insulinorésistance + défaut de sécrétion) | axes-sim.js : `show: (p) => p.beta < 0.1` ; islet.js : `insul.setAttribute('opacity', p.beta < 0.1 ? 1 : 0)` (DT1 = 0,02, DT2 = 0,35) | haute |
| E2 | js/scenes/zoom-glyc.js:473 et 479 | `const fed = clamp((eff - 1.1) / 1.5, 0, 1);` | Dans le modèle, l'insuline du sujet sain ne dépasse pas s.ins = 1,17 : la loupe « Le foie, du repas au jeûne » ne passe **jamais** en phase « Après le repas ». Chez le sujet sain, elle reste toute la journée en « Jeûne », avec un glycogène « réserve épuisée » (simulation : 100 % du temps). On enseigne donc qu'un sujet sain qui mange n'a plus de glycogène. | P2 p. 30 (le foie stocke le glucose en glycogène après les repas) | `const fed = clamp((eff - 0.85) / 0.3, 0, 1);` (simulation du sujet sain : repas 14 %, nuit 69 %, jeûne 17 %, glycogène ≈ 50 %) | haute |
| E3 | js/scenes/zoom-glyc.js:479 | `ph = eff < 0.3 && (s.ket > 1.2 \|\| (s.g > 1.6 && p.fast < 0.02)) ? 4 : …` | Dans le DT2 (eff ≈ 0,2 à cause de la sensibilité de 20 %), chaque pic post-prandial > 1,6 g/L bascule la loupe en « Carence en insuline : la cétogenèse s'emballe (acidocétose) » (12 % du temps), alors que la cétonémie simulée est ≤ 0,22 mmol/L. Ce texte présente un DT2 non cétosique comme en acidocétose. | P2 p. 31, 37–38 (acidocétose = carence en insuline, surtout DT1) | `ph = eff < 0.3 && s.ket > 0.6 ? 4 : …` | haute |
| E4 | js/tests.js:155–159 (HGPO) | insulinome : « À jeun : 0,49 g/L (< 1,10 : normale) … Conclusion : tolérance normale au glucose. » | Une glycémie à jeun < 0,50 g/L est qualifiée de « normale », avec une conclusion rassurante. | P2 p. 32 (normale à jeun 0,80–1,10) ; p. 66 (hypoglycémie < 0,50 g/L hors diabète) | Avant le calcul de `c0`, ajouter : `if (g0 < 0.7) return { tone: 'bad', text: \`À jeun : ${f(g0)} g/L : glycémie basse (hypoglycémie si < 0,50 g/L hors diabète). L'HGPO n'est pas l'examen adapté : rechercher une hypoglycémie organique (triade de Whipple, épreuve de jeûne).\` };` et, dans `t0`, remplacer « < 1,10 : normale » par « 0,80–1,10 : normale » lorsque g0 ≥ 0,80 | haute |

## Imprécision

| n° | fichier:ligne | texte ou valeur actuels | problème | source | correction proposée | confiance |
| --- | --- | --- | --- | --- | --- | --- |
| I1 | js/axes-sim.js:606 (scénario `pthrp`, `p: { pthrp: 4 }`, curseur max 4, l. 598) | calcémie simulée 2,63 mmol/L | L'« hypercalcémie tumorale » humorale est presque au seuil (2,60) et l'interprétation est fragile. Ces hypercalcémies sont habituellement importantes (souvent > 3 mmol/L). Le curseur ne permet pas de dépasser 2,63. | P1 p. 38–39 (classes de sévérité) ; Stewart, NEJM 2005 (complément) | Scénario `p: { pthrp: 12 }` et curseur `max: 16` (simulation : Ca 2,91, PTH 0,1, Pi 0,40, CaU 12) | moyenne |
| I2 | js/axes-sim.js:700–701 (modèle glyc) | insulinémie du sujet sain 6 → 8–9 µUI/mL après les repas ; glycémie maximale 0,92 g/L | La réponse au repas est quasi plate : l'insuline post-prandiale physiologique atteint plusieurs dizaines de µUI/mL. Effets en aval : E2, I3, et une glycémie post-prandiale saine qui n'atteint jamais la plage « 0,70–1,40 sur la journée » annoncée. | P2 p. 30 (l'insuline prédomine après les repas) ; valeurs post-prandiales usuelles (complément) | Recalibrer `insE` (par exemple pente `(s.g - 0.7) * 10` et plafond 12) et vérifier ensuite que la HGPO saine reste < 1,40 à 2 h | moyenne |
| I3 | js/scenes/zoom-glyc.js:301 | `sig = clamp((s.ins * p.sens) / 3, 0, 1);` | Même cause que E2 : chez le sujet sain, `sig` ≤ 0,39, donc l'état « Insuline élevée : GLUT4 à la membrane » n'apparaît jamais après un repas. Seuls l'insulinome et le surdosage l'atteignent. | P2 p. 30 | `sig = clamp((s.ins * p.sens) / 1.3, 0, 1);` (sain : 0,58 à jeun, 0,9 après repas ; DT2 0,22 ; DT1 0,1) | moyenne |
| I4 | js/axes-sim.js:728 + interpret l. 732–733 | insulinome : G 0,49–0,55 | La glycémie simulée oscille juste autour du seuil de 0,50 : le libellé saute de « Hypoglycémie » à « Glycémie basse, insuline inappropriée » à chaque repas. | P2 p. 66, 72 | Scénario `tumor: 5.5` (glycémie franchement < 0,50 en dehors des repas), ou même libellé pour les deux branches lorsque `p.exo === 0 && i > 3` | moyenne |
| I5 | js/axes-sim.js:732 | `if (g < 0.5) return { … i > 3 ? 'Glycémie < 0,50 g/L avec insuline non freinée : hyperinsulinisme (insulinome, insuline exogène).'` | Chez le diabétique sous insuline (`p.exo > 0`), une glycémie < 0,50 saute la classification du diabète (niveau 2) et reçoit le message de l'hypoglycémie organique. | P2 p. 66–68 (seuils différents chez le diabétique, tableau 10) | Placer la branche `p.exo > 0` (niveaux 1 et 2) avant le test `g < 0.5` | moyenne |
| I6 | js/scenes/islet.js:9–10, 109 | `'60 à 70 % de l'îlot · cœur de l'îlot'` ; `α … 15 à 20 %` | Ces proportions et ce cœur β entouré d'une couronne α correspondent à l'îlot du rongeur. Chez l'homme : β ≈ 50–60 %, α ≈ 30–40 %, δ ≈ 10 %, cellules entremêlées. La fiche α le dit elle-même, ce qui crée une incohérence interne. | Cabrera et coll., PNAS 2006 ; Brissova, J Histochem Cytochem 2005 (complément) | `k: '≈ 50 à 60 % de l'îlot humain (60 à 80 % chez le rongeur, en cœur d'îlot) (complément)'` ; α : `'≈ 30 à 40 % chez l'homme, mêlée aux β ; 15 à 20 % et en périphérie chez le rongeur (complément)'` ; légende l. 109 à l'identique | moyenne |
| I7 | js/scenes/islet.js:39, 43, 44 | lead « Environ un million d'îlots … ferment les canaux K-ATP … » ; points 3 et 4 sans mention | Le couplage K-ATP, le nombre d'îlots, les cellules δ, PP et ε, les incrétines et la paracrinie ne figurent pas dans le polycopié (seuls β, α et le « 1 % » s'y trouvent, P2 p. 29). Le lead et ces deux points ne portent pas « (complément) ». | P2 p. 29 | Ajouter « (complément) » à la fin du lead, du point 3 (« …directement le canal K-ATP (complément). ») et du point 4 (« …freine α et β (complément). ») | haute |
| I8 | js/scenes/islet.js:16 | `'Chez l'homme, GLUT1 joue aussi un rôle.'` | Chez l'homme, GLUT1 (et GLUT3) prédominent sur GLUT2 dans la cellule β. | McCulloch et coll., Mol Genet Metab 2011 (complément) | `'Chez l'homme, GLUT1 est même prédominant sur GLUT2 (complément).'` | moyenne |
| I9 | js/scenes/islet.js:212 | `p.beta < 0.3 ? 'Cellules β détruites : plus d'insuline malgré l'hyperglycémie (DT1)'` | Dans le scénario « DT1 traité, surdosage » (glycémie 0,51), le bandeau parle d'hyperglycémie. | — | `p.beta < 0.3 ? (p.exo > 0.05 ? 'Cellules β détruites : seule l'insuline injectée agit, sans s'adapter à la glycémie' : 'Cellules β détruites : plus d'insuline malgré l'hyperglycémie (DT1)')` | haute |
| I10 | js/scenes/zoom-rein.js:473 et 489 | `k: 'Passif (P1 p. 37)'` ; `'65 % du calcium filtré, passivement (P1 p. 37)'` | « Passif » est attribué au polycopié, qui ne donne que le pourcentage (65 %). La l. 615 l'écrit correctement : « mécanisme : complément ». | P1 p. 37 | `k: '65 % (P1 p. 37) ; passif (complément)'` ; `'65 % du calcium filtré (P1 p. 37), passivement (complément)'` | haute |
| I11 | js/scenes/zoom-rein.js:116 | `'Gliflozines : glycosurie et natriurèse modestes.'` | La glycosurie sous iSGLT2 n'est pas modeste (≈ 60–80 g/j) ; seuls l'effet natriurétique et l'effet diurétique le sont. | Ferrannini, Cell Metab 2017 (complément) | `'Gliflozines : glycosurie importante (≈ 60 à 80 g/j), natriurèse et diurèse modestes.'` | moyenne |
| I12 | js/scenes/zoom-rein.js:102 ; js/axes-data.js:388 ; js/axes-steps.js:100 | « Réabsorbe tout le glucose filtré » (SGLT2) | C'est la formulation du polycopié. En réalité, SGLT2 réabsorbe ≈ 90 % (S1–S2) et SGLT1 ≈ 10 % (S3). | P2 p. 31 ; complément | Ajouter dans zr-sglt2 : `' SGLT1, plus loin dans le tube proximal, réabsorbe le reste (≈ 10 % ; complément).'` | basse |
| I13 | js/sheets-molecules.js:303 | `'acidocétose au-delà de 3 mmol/L (complément)'` | La mention « complément » est abusive : la cétonémie > 3 mmol/L figure dans le polycopié. | P2 p. 38 | `'Cétonémie < 0,6 mmol/L (complément) ; acidocétose : cétonémie > 3 mmol/L, pH < 7,30 ou bicarbonates < 15 mmol/L (polycopié)'` | haute |
| I14 | js/sheets-organs.js:104 | `'phosphaturie en complément'` | La mention « complément » est abusive : l'augmentation de l'excrétion rénale de phosphore sous PTH figure dans le polycopié. | P1 p. 41 | `'… phosphaturie (P1 p. 41) …'` | haute |
| I15 | js/axes-steps.js:83 ; js/axes-data.js:327 | étape : « favorise la fixation du calcium sur l'os ; son rôle chez l'adulte est mineur » ; nœud : « freine la résorption osseuse par les ostéoclastes » | Les deux textes décrivent le mécanisme différemment. Le « rôle mineur » est sans mention « complément » (seuls les cellules C, la calcitonine et le CMT sont dans le polycopié, P1 p. 7 et p. 556 du texte). | P1 (cellules C, dépistage du CMT) | `d: 'Les cellules C de la thyroïde sécrètent la calcitonine, qui freine la résorption osseuse par les ostéoclastes ; son rôle chez l'adulte est mineur (complément). Son dosage dépiste le cancer médullaire de la thyroïde.'` | moyenne |
| I16 | js/axes-sim.js:788–789 | hfhe : « Moitié des récepteurs des LDL » ; hfho : « Récepteurs quasi absents : LDL-c très élevé dès l'enfance. » | Le polycopié ne décrit ni le mécanisme ni la forme homozygote de l'HF (il n'en cite que le niveau de risque, P2 p. 26–27). Les deux notes n'ont pas de mention « complément » au bon endroit. | P2 p. 26–27 | hfhe : `'Moitié des récepteurs des LDL (complément) : LDL-c doublé, xanthomes tendineux, arc cornéen précoce.'` ; hfho : `'Récepteurs quasi absents : LDL-c très élevé dès l'enfance (complément).'` | moyenne |
| I17 | js/axes-sim.js:770 | `rec = p.ldlr * p.apob * (1 + 0.9 * p.statin) * (1 + 1.4 * p.pcsk9i) …` | L'effet de la statine et de l'anti-PCSK9 est multiplicatif, quel que soit le nombre de récepteurs restants. HF homozygote + statine + anti-PCSK9 : LDL 8,0 → 1,75 g/L (−78 %). Dans la HFHo à récepteurs nuls, ces traitements agissent peu (anti-PCSK9 ≈ 0 à −30 %). | Raal et coll., Lancet 2015 (TESLA) ; ESC/EAS 2019 (complément) | Atténuer l'effet par le résidu de récepteurs, par exemple `(1 + 0.9 * p.statin * Math.min(1, p.ldlr / 0.5)) * (1 + 1.4 * p.pcsk9i * Math.min(1, p.ldlr / 0.5))` | moyenne |
| I18 | js/axes-sim.js:794 ; 775 | htg : « Excès de VLDL et de chylomicrons » à TG 5 g/L ; HDL fixée à 0,55 | À jeun, à 5 g/L, l'excès est surtout fait de VLDL (les chylomicrons dominent surtout au-delà de 10 g/L, hypertriglycéridémie majeure). L'HDL ne baisse pas avec les TG, alors que l'hypertriglycéridémie s'accompagne d'un HDL bas (« dyslipidémie caractéristique », P2 p. 35). | P2 p. 18, 24, 35 | Note : `'Excès de VLDL (et de chylomicrons dans les formes majeures) ; risque de pancréatite au-delà de 10 g/L.'` ; HDL : `fn: (s, p) => clamp(0.55 - 0.04 * (p.tg - 1), 0.3, 0.6)` | basse |
| I19 | js/axes-data.js:425 (point 3) | « Les statines freinent l'HMG-CoA réductase … (SREBP-2) … Les anti-PCSK9 … (complément). » | Les statines sont absentes du polycopié. Le « (complément) » final peut être lu comme ne couvrant que la deuxième phrase. | P2 p. 20 (le polycopié ne cite que l'HMG-CoA réductase et PCSK9) | `'Les statines freinent l'HMG-CoA réductase : la cellule exprime plus de récepteurs (SREBP-2) et capte plus de LDL (complément). Les anti-PCSK9 empêchent la dégradation des récepteurs (complément).'` | basse |
| I20 | js/axes-data.js:427 ; js/axes-steps.js:104 | « chylomicrons (apoB48) » ; « (apoB48, très riches en triglycérides) » | L'apoB48 ne figure pas dans le polycopié. Les triglycérides à 85–90 % y figurent (P2 p. 18). | P2 p. 18 | `sub: 'chylomicrons (apoB48, complément)'` ; étape : `'(apoB48, complément ; 85 à 90 % de triglycérides, polycopié)'` | basse |
| I21 | js/tests.js:164–176 (épreuve de jeûne) | DT1 traité : « Hypoglycémie … Peptide C élevé : hyperinsulinisme endogène… » | Le protocole dit « non indiquée chez un diabétique traité », mais l'épreuve se lance et conclut comme pour un sujet non diabétique. | P2 p. 66 | Au début de `interpret` : `if (sim.p.exo > 0.05) return { tone: 'warn', text: 'Épreuve non indiquée chez le diabétique traité par insuline : l'hypoglycémie est iatrogène (P2 p. 70).' };` | moyenne |
| I22 | js/sheets-molecules.js:311 | `'Anticorps anti-PCSK9 (évolocumab, alirocumab), inclisiran'` | L'inclisiran est un petit ARN interférent, pas un anticorps. | AMM européenne de l'inclisiran (complément) | `'Anticorps anti-PCSK9 (évolocumab, alirocumab) ; ARN interférent (inclisiran)'` | haute |

## Forme

| n° | fichier:ligne | texte ou valeur actuels | problème | source | correction proposée | confiance |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | js/axes-steps.js:96 | « les cellules α freinent le glucagon » | Les cellules α sécrètent le glucagon : elles ne le freinent pas. | — | « …les cellules β sécrètent l'insuline ; la sécrétion de glucagon par les cellules α diminue. » | haute |
| F2 | js/scenes/islet.js:22 | `t: 'Récepteur du GLP-1 (et du GIP)'` ; « Cibles des analogues du GLP-1 et des inhibiteurs de la DPP-4 » | Ce sont deux récepteurs distincts. Les gliptines ne visent pas le récepteur : elles inhibent l'enzyme DPP-4. | — | `t: 'Récepteurs du GLP-1 et du GIP'` ; « Cibles des analogues du GLP-1 (et du double agoniste GIP/GLP-1) ; les inhibiteurs de la DPP-4 augmentent les incrétines endogènes. » | moyenne |
| F3 | js/axes-steps.js:79 | « En quelques minutes, la PTH sort des granules des cellules principales. » | Information absente du polycopié, sans mention « complément ». | — | ajouter « (complément) » | basse |
| F4 | js/sheets-organs.js:123 | `'Incrétines (GLP-1, GIP), ghréline (estomac)'` | Information absente du polycopié, sans mention « complément ». | — | `'Incrétines (GLP-1, GIP), ghréline (estomac) (complément)'` | basse |
| F5 | js/axes-sim.js:730–737 | glycémie 1,10–1,25 → « Glycémie normale » | Le libellé ignore l'hyperglycémie modérée à jeun, alors que le texte de la branche ≥ 1,26 la mentionne. La glycémie simulée n'est toutefois pas spécifiquement « à jeun ». | P2 p. 32 | Branche `g >= 1.1` : `{ tone: 'warn', label: 'Glycémie limite', text: 'Entre 1,10 et 1,25 g/L à jeun : hyperglycémie modérée à jeun (prédiabète).' }` | basse |
| F6 | js/axes-data.js:424 | « la lipoprotéine lipase transforme les VLDL en IDL puis en LDL » | Le passage des IDL aux LDL fait aussi intervenir la lipase hépatique (le nœud plasma le dit, pas le lead). | P2 p. 18 | « …la lipoprotéine lipase transforme les VLDL en IDL, puis, avec la lipase hépatique, en LDL. » | basse |

Points vérifiés et conformes (non reportés) : normes et formule de la calcémie corrigée (P1 p. 36–37) ; répartition 65 / 25 % / tube distal (p. 37) ; profil biologique de l'HPT (p. 42) ; seuil PTH < 20 (décision C1) ; PTH ≈ 108 dans la carence en vitamine D (C3) ; définitions du diabète et du prédiabète, tableau 8 (P2 p. 31–32) ; seuil SGLT2 à 1,80 g/L (p. 31) ; seuils d'hypoglycémie et niveaux 1 et 2 (p. 66–68) ; contre-régulation (p. 67) ; objectifs de LDL-c et HF à risque élevé (p. 27–28) ; Friedewald, TG > 3,4 g/L et seuil de 1,5 g/L (p. 25) ; toutes les pages citées dans zoom-glyc (p. 29–65), zoom-phospho et ca-nephron ; numéros et pages des figures de poly-figs.js et sheets-organs.js (fig. 10–16, 38–59) ; fiches insuline (4INS porcine, B30), PTH, calcitonine, LDLR, glucose (1 g/L ≈ 5,5 mmol/L).

## Points à trancher par l'auteur

1. **HHF : critère de calciurie.** Le modèle conclut sur une calciurie des 24 h < 2,5 mmol/24 h. docs/tests-dynamiques.md cite le rapport de clairance Ca/créatinine < 0,01 (critère usuel, complément). Faut-il afficher ce rapport dans le bilan (lab dérivé) pour aligner la scène sur la doc ?
2. **HF et objectif de LDL-c.** Le polycopié classe l'HF d'emblée à « risque élevé » (< 0,70 g/L). L'ESC/EAS 2019 la classe « très élevé » (< 0,55 g/L) en présence d'une maladie athéromateuse ou d'un autre facteur de risque majeur. Faut-il ajouter cette nuance (complément) dans l'interprétation ?
3. **Seuil d'insuline de l'épreuve de jeûne** (≥ 3 µUI/mL, Endocrine Society 2009, déjà marqué complément). Faut-il ajouter les autres critères (peptide C ≥ 0,6 ng/mL, proinsuline ≥ 5 pmol/L, β-hydroxybutyrate ≤ 2,7 mmol/L) ? Le seuil de 0,50 g/L reste conservé (décision C2).
4. **Ampleur de la recalibration de la réponse insulinique au repas** (I2). Il s'agit d'un choix pédagogique entre lisibilité de l'animation et réalisme des valeurs (insulinémie post-prandiale de plusieurs dizaines de µUI/mL). Les corrections E2 et I3 fonctionnent sans recalibration ; à revoir si I2 est appliquée.
5. **Glycémie à 2 h de l'insulinome à l'HGPO** (0,69 g/L) : une hypoglycémie réactionnelle tardive est-elle souhaitée dans ce scénario, ou faut-il seulement le garde-fou de E4 ?

## Synthèse

4 erreurs médicales, 22 imprécisions, 6 constats de forme (32 au total).

## Corrections appliquées

Toutes les modifications ont été faites avec Edit, sans commit. `node --check` passe sur les 8 fichiers touchés. simtest, testsim et allscen.js : 0 erreur de page. Seule l'interprétation des scénarios et des tests visés a changé.

| n° | Statut | Détail |
| --- | --- | --- |
| E1 | fait | axes-sim.js (lésion de l'îlot) et islet.js : insulite si `beta < 0.1`. Vérifié par capture Playwright : plus d'insulite sur l'îlot dans le DT2. |
| E2 | fait | zoom-glyc.js : `fed = clamp((eff - 0.85) / 0.3, 0, 1)`. Sujet sain : repas 14 %, nuit 69 %, jeûne 17 %, glycogène ≈ 50 %. |
| E3 | fait | zoom-glyc.js : phase « carence en insuline » si `eff < 0.3 && s.ket > 0.6`. Le DT2 n'y passe plus (0 %) ; le DT1 y reste (100 %). |
| E4 | fait | tests.js : HGPO avec glycémie à jeun < 0,70 g/L → message dédié. Insulinome : « glycémie basse… rechercher une hypoglycémie organique ». |
| I1 | non fait | Le coordinateur demande de garder la PTHrP du scénario à 4 (décisions C1 et C3 récentes). |
| I2 | non fait | Recalibration lourde du modèle glucidique (effets sur HGPO, jeûne et loupes) : laissée à l'auteur (point à trancher n° 4). |
| I3 | fait | zoom-glyc.js : `sig = … / 1.3`. |
| I4 | fait, partiellement | Insulinome : `tumor: 5.5` (curseur max 6). Glycémie 0,45–0,55 : le libellé du bilan est « Hypoglycémie » hors repas ; il redevient « glycémie basse, insuline inappropriée » en post-prandial, ce qui est cohérent avec la définition < 0,50 g/L. |
| I5 | fait | axes-sim.js : la branche du diabétique sous insuline (niveaux 1 et 2) passe avant `g < 0.5`. DT1 traité : « niveau 2 », inchangé. |
| I6 | fait | islet.js : fiches β et α, et légende des proportions (≈ 50–60 % et ≈ 30–40 % chez l'homme). Le dessin (cœur β) n'a pas été modifié. |
| I7 | fait | islet.js : lead et points 3 et 4 marqués « (complément) », avec renvoi à P2 p. 29. |
| I8 | fait | islet.js : fiche GLUT2. |
| I9 | fait | islet.js : bandeau différent quand l'insuline est injectée. |
| I10 | fait | zoom-rein.js : fiche zr-c-pct et point de ca-nephron (« passif » = complément). |
| I11 | fait | zoom-rein.js : « glycosurie importante (≈ 60 à 80 g/j), natriurèse et diurèse modestes ». |
| I12 | non fait | Confiance basse. |
| I13 | fait | sheets-molecules.js : fiche ketone. |
| I14 | fait | sheets-organs.js : « phosphaturie (P1 p. 41) ». |
| I15 | fait | axes-steps.js : étape calcitonine. |
| I16 | fait | axes-sim.js : notes hfhe et hfho. |
| I17 | fait | axes-sim.js : effet de la statine et de l'anti-PCSK9 pondéré par le résidu de récepteurs (`min(1, ldlr/0.5)`). HF hétérozygote inchangée (statine 1,26 ; + anti-PCSK9 0,53). HF homozygote + statine 6,30 ; + anti-PCSK9 4,44 (au lieu de 4,21 et 1,75). |
| I18–I20 | non fait | Confiance basse. |
| I21 | fait | tests.js : épreuve de jeûne non indiquée sous insuline → message dédié. |
| I22 | fait | sheets-molecules.js : inclisiran = ARN interférent. |
| F1 | fait | axes-steps.js : étape « Les îlots détectent le glucose ». |
| F2 | fait | islet.js : fiche glp1r (deux récepteurs ; mode d'action des gliptines). |
| F3–F6 | non fait | Confiance basse. |
