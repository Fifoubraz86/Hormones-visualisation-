# Audit médical — axe thyréotrope et thyroïde (2e audit)

Périmètre relu : js/model.js ; js/scenes/thyroid-axis.js, hypothalamus.js, pituitary.js, follicle.js, transport.js, target-cell.js, zoom-thyro.js (6 loupes) ; entrées thyroïdiennes de js/info.js, js/sheets-molecules.js (trh, tsh, t4, t3, rt3, iod, tg, trab, tbg, ttr, alb), js/sheets-organs.js (thyroïde) ; js/poly-figs.js (figures 1 à 10, 17) ; js/tests.js et js/axes-steps.js (aucun test ni pas à pas thyroïdien : rien à vérifier).
Source : polycopié CEEDMM, partie 1, pages PDF 6-32 (thyroïde), 33-34 (parathyroïdes), 47-49 et 59-62 (hypophyse).
Les décisions déjà prises (T1 à T6, M3, O2) ne sont pas re-signalées, sauf quand leur application est incomplète.

## Simulation des scénarios (Playwright, `HV.model`, 600 pas de 0,5 s ; mêmes valeurs en Node)

| Scénario | TSH (mUI/L) | T4L (pmol/L) | T3L (pmol/L) | rT3 (nmol/L) | goitre | Interprétation | Cohérence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| eu | 1,50 | 15,0 | 4,6 | 0,30 | 1,00 | Euthyroïdie | OK |
| hashi | 13,6 | 8,8 | 2,7 | 0,18 | 1,69 | Hypothyroïdie primaire | OK (P1 p.22-23). Info-bulle « Volume relatif : 78 % » alors que la glande est dessinée ×1,30 (constat I1) |
| atro | 17,6 | 7,9 | 2,4 | 0,16 | 1,00 (dessin 0,62) | Hypothyroïdie primaire | OK |
| lt4 | 1,72 | 15,5 | 3,7 | 0,31 | 1,02 | Euthyroïdie | OK. Libellé « goitre de Hashimoto » sur une glande de taille normale (F1) |
| lt4x | < 0,01 | 30,1 | 6,9 | 0,60 | 1,00 | Thyrotoxicose, iatrogène, sans hyperthyroïdie | OK (P1 p.24). Vignette scintigraphique « autre cause / image manquante » (I2) |
| graves | < 0,01 | 38,7 | 11,9 | 0,78 | 1,31 | Thyrotoxicose, Basedow | OK. Scintigraphie montrée comme indiquée alors que les TRAb sont positifs (I2) |
| nodule | 0,02 | 25,2 | 8,8 | 0,50 | 1,00 | Thyrotoxicose, adénome toxique | OK |
| central | 0,90 | 7,2 | 2,2 | 0,15 | 1,00 | Hypothyroïdie centrale | OK (P1 p.24, p.62) |
| iodine | 7,9 | 9,7 | 3,8 | 0,20 | 1,79 | Hypothyroïdie primaire | décision T1 (non re-signalé) |
| nti | 2,06 | 15,8 | 2,2 | 0,89 | 1,05 | Syndrome de basse T3 | OK (P1 p.22) |

Exploration des curseurs (grille de 3^9 combinaisons, Node) : aucun réglage ne donne TSH > 4 avec T4L > 22 ou T3L > 6,8. La branche manquante notée en P3 ne peut donc pas être atteinte aujourd'hui. En revanche, la LT4 seule à 150–162,5 µg/j (thy 0,12, levo 1,3–1,4) donne une TSH de 0,32 à 0,20 mUI/L avec une T4L normale, et le simulateur l'interprète « Hyperthyroïdie infraclinique » (E1).

## Erreur médicale

| n° | fichier:ligne | texte ou valeur actuels | problème | source | correction proposée | confiance |
| --- | --- | --- | --- | --- | --- | --- |
| E1 | js/model.js:115 | `{ tone: 'warn', label: 'Hyperthyroïdie infraclinique', text: 'TSH basse, hormones libres encore dans les normes.' }` | La branche ne tient pas compte de la cause. Avec la LT4 seule (curseur à 150 µg/j, Hashimoto), le bilan TSH 0,32 / T4L 20,2 est interprété « Hyperthyroïdie infraclinique ». C'est contraire à la distinction thyrotoxicose / hyperthyroïdie que le constat 1 du premier audit a appliquée à la forme avérée. La conduite à suivre est aussi différente : on réduit la dose, on ne cherche pas une maladie thyroïdienne. | P1 p.24 (« toutes les thyrotoxicoses … ne sont pas liées à une hyperthyroïdie ») ; P1 p.28 (TSH 0,1–0,4 à contrôler à 6 semaines) | `return p.levo > 0.02 && p.trab <= 0.05 && p.auto <= 0.02 ? { tone: 'warn', label: 'TSH freinée sous lévothyroxine', text: 'TSH basse, hormones libres normales sous LT4 : surdosage modéré (thyrotoxicose infraclinique iatrogène, sans hyperthyroïdie) ; réduire la dose et contrôler la TSH à 6–8 semaines (complément).' } : { tone: 'warn', label: 'Hyperthyroïdie infraclinique', text: 'TSH basse, hormones libres encore dans les normes. Si TSH entre 0,1 et 0,4 mUI/L : contrôle à 6 semaines (polycopié p. 28).' };` | haute |

## Imprécision

| n° | fichier:ligne | texte ou valeur actuels | problème | source | correction proposée | confiance |
| --- | --- | --- | --- | --- | --- | --- |
| I1 | js/info.js:52 (thyroid.live) | `'Volume relatif : ' + pct((0.55 + 0.45 * Math.min(1, M.p.thy)) * Math.sqrt(M.s.goitre))` | La décision T6 n'est pas reportée dans l'info-bulle. Le dessin applique `k = atro ? 0,62 : √goitre` (thyroid-axis.js:79), soit ×1,30 dans Hashimoto, mais l'info-bulle affiche 78 %, donc une glande plus petite. Écarts aussi pour lt4 (61 % affichés, glande dessinée normale) et lt4x (60 %). | P1 p.21-22 ; décision T6 | `live: () => 'Taille relative : ' + pct(M.p.atro > 0.5 ? 0.62 : Math.sqrt(M.s.goitre))` | haute |
| I2 | js/scenes/thyroid-axis.js:103-115 | `scTxt … P.trab > 0.05 ? 'fixation diffuse (fig. 9B du polycopié)' : 'TSH basse : autre cause'` | (a) Basedow : la vignette est affichée comme indiquée (opacité 1) alors que les TRAb sont positifs. Or le polycopié réserve la scintigraphie à la seconde intention, quand les TRAb sont négatifs ou qu'il existe un goitre nodulaire. (b) Surdosage en LT4 : « TSH basse : autre cause » + « image manquante », alors que la fiche scinti (info.js:112) annonce une hypofixation globale (prise de LT4, complément). | P1 p.28 et p.30 | (a) `P.trab > 0.05 ? 'fixation diffuse (fig. 9B) ; inutile si TRAb positifs (p. 30)'` avec `sc.setAttribute('opacity', ind && !(P.trab > 0.05) ? 1 : 0.4)` ; (b) `P.levo > 0.02 ? 'hypofixation globale (apport de LT4 ; complément)' : 'TSH basse : autre cause'` | moyenne |
| I3 | js/scenes/pituitary.js:92-97 | lead « récepteur couplé à Gq … la glycosyle » ; points « La glycosylation conditionne l'activité biologique… », « La T4 entre par MCT8, la D2 la convertit en T3, qui réprime TSHβ et αGSU via TRβ2. », « Somatostatine, dopamine et glucocorticoïdes freinent… » | Ces données, absentes du polycopié, ne portent pas la mention « (complément) ». Le texte est aussi incohérent avec info.js:78, qui sépare correctement somatostatine (polycopié) et dopamine / glucocorticoïdes (complément). | P1 p.7 (seule la somatostatine), p.23 (« anomalie quantitative et qualitative de la sécrétion de TSH ») | Point 4 : « La somatostatine freine la TSH (polycopié p. 7) ; la dopamine et les glucocorticoïdes aussi (complément). » Points 2-3 : ajouter « (complément) ». Lead : « …récepteur couplé à Gq (complément)… » | haute |
| I4 | js/scenes/follicle.js:18-19 | « La TSH, via son récepteur couplé à Gs et l'AMPc, stimule chaque étape… » ; « Le NIS est inhibé par le perchlorate. La TPO est inhibée par les antithyroïdiens de synthèse (carbimazole, PTU). » | Gs, AMPc, perchlorate et ATS ne viennent pas du polycopié et ne sont pas marqués. Seule l'action de la TSH sur toutes les étapes et sur la croissance y figure. | P1 p.7 | « La TSH stimule chaque étape ainsi que la croissance de la glande (polycopié p. 7), via son récepteur couplé à Gs et l'AMPc (complément). » ; « … (carbimazole, PTU) (complément). » | haute |
| I5 | js/scenes/target-cell.js:237-242 | points « MCT8, MCT10 et OATP1C1 … Allan-Herndon-Dudley », « D1 et D2 activent… D3 inactive… », « corépresseurs… coactivateurs » | Ces points ne sont pas marqués « (complément) ». Le lead et le point « Effets » sont, eux, en partie dans le polycopié (TRα/TRβ, effets tissulaires). | P1 p.9 | Ajouter « (complément) » aux points 1 à 3. Point 4 : « Effets : thermogenèse, métabolisme basal, fréquence cardiaque, développement cérébral, remodelage osseux (polycopié p. 9-10). » | haute |
| I6 | js/scenes/thyroid-axis.js:228, 234 | pas 1 : « Les neurones du noyau paraventriculaire fabriquent la TRH, un tripeptide » ; pas 7 : « La relation est log-linéaire : … » | Le noyau paraventriculaire et le tripeptide ne sont pas dans le polycopié. La relation log-linéaire est marquée complément au point clé (l.19), mais pas dans le pas 7. | P1 p.7, p.49 | Pas 1 : « …la TRH, un tripeptide (complément)… » ; pas 7 : « La relation est log-linéaire (complément) : … d'où le diagnostic sur la seule TSH (polycopié p. 22, 28). » | moyenne |
| I7 | js/info.js:29, 42, 57, 60 | tgi « Réserve d'hormones pour plusieurs semaines » ; brain « d'où le dépistage néonatal systématique » ; nodule « souvent par mutation activatrice du récepteur de la TSH » ; bone « Une hyperthyroïdie prolongée favorise l'ostéoporose » | Ces affirmations restent non marquées « (complément) » (le constat 95 du premier audit n'a pas couvert ces quatre fiches). | P1 p.6-10, p.27 | Ajouter « (complément) » à la fin de chacune de ces phrases. | haute |
| I8 | js/sheets-molecules.js:71 (iod) | `'Carence : goitre ; excès : effet Wolff-Chaikoff, hyperthyroïdie induite'` | L'hypothyroïdie par surcharge iodée est omise, alors que le polycopié la cite parmi les causes d'hypothyroïdie primaire. Par ailleurs, l'effet Wolff-Chaikoff est un blocage transitoire de l'organification : écrit à côté de « hyperthyroïdie induite », il peut faire croire qu'il en est la cause. | P1 p.19 (surcharge iodée) ; P1 p.27 (produits de contraste iodés) | `'Carence : goitre (polycopié p. 10) ; excès : effet Wolff-Chaikoff (blocage transitoire de l\'organification), hypothyroïdie par surcharge iodée (p. 19) ou hyperthyroïdie induite par l\'iode (produits de contraste iodés, amiodarone, p. 27)'` | haute |
| I9 | js/sheets-organs.js:18 | `'Parathyroïdes à la face postérieure ; nerfs laryngés récurrents, carotides et jugulaires en dehors (complément)'` | Les nerfs récurrents ne sont pas « en dehors » du lobe : ils remontent dans l'angle trachéo-œsophagien, en arrière et en dedans. La loupe Anatomie chirurgicale le dit d'ailleurs correctement (zoom-thyro.js:69, 385). | Anatomie classique (Rouvière) ; cohérence interne | `'Parathyroïdes à la face postérieure ; nerfs laryngés récurrents en arrière et en dedans (angle trachéo-œsophagien) ; carotides et jugulaires en dehors (complément)'` | haute |
| I10 | js/sheets-organs.js:21 | `'… un goitre déborde le cou ou plonge dans le médiastin'` | La définition est floue alors que le polycopié donne des critères précis. | P1 p.11 (définition OMS), p.13 (volumes échographiques) | `'Palpation : volume, consistance, nodules, souffle (Basedow). Goitre : surface de chaque lobe > dernière phalange du pouce (OMS) ; à l\'échographie, volume > 16 mL (adolescent), > 18 mL (femme), > 20 mL (homme) ; parfois plongeant (p. 11-13)'` | haute |
| I11 | js/scenes/zoom-thyro.js:72 (zt-para) et :137 (point) | « Chacune a une artère unique et terminale, branche de l'artère thyroïdienne inférieure (p. 34) » | C'est vrai pour P3. Pour P4, le polycopié dit : artère thyroïdienne inférieure dans 88 % des cas, supérieure dans 10 %. La fiche zt-ita (l.65) donne d'ailleurs ce chiffre. | P1 p.34 | « …artère unique et terminale : thyroïdienne inférieure pour P3, et pour P4 dans 88 % des cas (supérieure dans 10 %) (p. 34). » | haute |
| I12 | js/scenes/zoom-thyro.js:99 (zt-fetal) et :780 | « Elle devient fonctionnelle vers la fin du 1er trimestre ; avant, le fœtus dépend de la T4 maternelle » ; « Jusqu'à la fin du 1er trimestre, le fœtus dépend de la T4 maternelle ; sa thyroïde devient ensuite fonctionnelle » | Le texte laisse croire que la dépendance maternelle s'arrête à la fin du 1er trimestre. En réalité, la thyroïde fœtale commence à capter l'iode vers 10–12 SA, mais sa production ne devient importante que vers 18–20 SA, et la T4 maternelle contribue jusqu'au terme. | ATA 2017 (Alexander EK et al., Thyroid 2017) ; Endotext « Thyroid in pregnancy » | « Elle commence à capter l'iode et à synthétiser des hormones vers 10–12 SA, mais sa production ne devient importante que vers 18–20 SA : jusque-là, le fœtus dépend surtout de la T4 maternelle (complément). » | moyenne |
| I13 | js/scenes/zoom-thyro.js:985 | `'Exophtalmie : le contenu de l\'orbite augmente (p. 31)'` (dès que les TRAb sont > 0) | L'animation rend l'orbitopathie automatique et proportionnelle aux TRAb. Le polycopié la décrit dans la moitié des cas seulement, mineure chez 60 à 70 % des patients, et pouvant précéder l'hyperthyroïdie. | P1 p.31 | `'Orbitopathie (moitié des cas, p. 31) : le contenu de l\'orbite augmente'` | moyenne |
| I14 | js/scenes/zoom-thyro.js:69 (zt-rln) | « …et pénètre dans le larynx sous le cartilage cricoïde » | Inexact : le récurrent entre dans le larynx sous le bord inférieur du constricteur inférieur du pharynx, en arrière de l'articulation crico-thyroïdienne. | Anatomie classique (Rouvière ; Gray's) | « …et pénètre dans le larynx en arrière de l'articulation crico-thyroïdienne, sous le bord inférieur du constricteur inférieur du pharynx. » | moyenne |
| I15 | js/model.js:86 (note nti) | `'Maladie aiguë sévère : moins de conversion T4 → T3, plus de T3 reverse (complément).'` | Le syndrome de basse T3L des maladies sévères est dans le polycopié. Le « (complément) » ne devrait porter que sur le mécanisme, comme dans la loupe Désiodases (zoom-thyro.js:433). | P1 p.22 | `'Maladie aiguë ou chronique sévère : syndrome de basse T3L lié au stress somatique, sans dysfonction thyroïdienne (polycopié p. 22). Mécanisme : moins de conversion T4 → T3, plus de T3 reverse (complément).'` | haute |

## Forme

| n° | fichier:ligne | texte ou valeur actuels | problème | source | correction proposée | confiance |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | js/scenes/thyroid-axis.js:89 ; js/model.js:128 | `'goitre de Hashimoto, infiltrat lymphocytaire'` ; `'maladie de Hashimoto : thyroïde augmentée de volume, infiltrat lymphocytaire'` | Dans les scénarios lt4 et lt4x, ce libellé s'affiche alors que la glande est dessinée de taille normale (goitre 1,00–1,02). | cohérence interne | Conditionner le texte à `S.goitre > 1.15` ; sinon : `'maladie de Hashimoto, infiltrat lymphocytaire'`. | haute |
| F2 | js/scenes/zoom-thyro.js:65 et :419 | « Tronc thyrocervical » / « tronc thyrocervical » | La décision O2 (« terminologie harmonisée ») a été appliquée à sheets-organs.js:17 (« thyro-cervical »), mais pas à la loupe. | décision O2 | « tronc thyro-cervical » (deux occurrences) | haute |
| F3 | js/poly-figs.js:17-24, :25 | figures 6 et 7A-7D : `['thyro']` ; 8 et 9B : `['thyro']` ; 10 : `['phospho']` | Les loupes Nodule (tirads, pastille l.593), Auto-immunité (thyro-ai, pastilles l.899 et 960) et Embryologie (thyro-embryo, pastille l.201) affichent ces figures. Mais le panneau « Iconographie du polycopié » (app.js:323, `polyFigsFor(sc.id)`) ne les liste pas, faute de rattachement. | cohérence interne | 6 et 7A-7D : `['thyro', 'tirads']` ; 8 : `['thyro', 'thyro-ai']` ; 9B : `['thyro', 'thyro-ai']` ; 10 : `['phospho', 'thyro-embryo']` | haute |
| F4 | js/info.js:82 vs js/scenes/zoom-thyro.js:80 | d3.k « Placenta, cerveau, peau » ; zt-d3.k « Placenta, cerveau » | Les deux fiches de la même enzyme ne listent pas les mêmes tissus. | cohérence interne | zt-d3.k : « Placenta, cerveau, peau (complément) » | basse |

## Points à trancher par l'auteur

1. **TSH > 10 mUI/L avec T4L normale** (model.js:106 : « Au-delà du seuil de l'hypothyroïdie infraclinique »). Le polycopié borne l'infraclinique à TSH 4–10 (p. 23). L'ETA (2013) et l'ATA classent au contraire toute TSH élevée avec T4L normale comme infraclinique, la forme ≥ 10 étant la plus sévère et généralement traitée. Faut-il garder la formulation du polycopié ou écrire « hypothyroïdie infraclinique sévère (TSH ≥ 10 ; ETA 2013, complément) » ?
2. **Origine des cellules C** (zoom-thyro.js:60, 61, 263). L'atlas dit « crête neurale (complément) ». Des travaux de traçage génétique (Johansson et al., Development 2015) montrent une origine endodermique chez la souris. Faut-il nuancer : « classiquement la crête neurale ; une origine endodermique est aujourd'hui démontrée chez l'animal » ?
3. **Branche absente « TSH non freinée + T4L élevée »** (interpret). Avec TSH > 4 et T4L > 22, l'interprétation tomberait dans « hypothyroïdie infraclinique ». Aucun réglage n'y mène aujourd'hui. L'adénome thyréotrope (P1 p.24, 30, 59) reste sans scénario, comme le premier audit l'avait déjà relevé (thyroïdites, GMN toxique, hypothyroïdie hypothalamique, anti-TPO/TRAb dans le bilan) : faut-il ajouter ce scénario et la branche correspondante ?
4. **P3 « dans le médiastin supérieur (40 % des cas) »** (zoom-thyro.js:57, 227, 262 ; sheets-organs.js:29). Le chiffre est bien celui du polycopié (p. 34), mais il paraît élevé au regard des séries chirurgicales, où l'ectopie thymique ou médiastinale de P3 est bien moins fréquente. Faut-il le conserver tel quel (citation du polycopié) ou ajouter une nuance ?
5. **Modulateurs de la TRH** (hypothalamus.js:19, 69). « Le froid stimule la TRH » est surtout démontré chez l'animal et le nouveau-né, avec un effet minime chez l'adulte. Faut-il le préciser ?

## Synthèse

1 erreur médicale, 15 imprécisions, 4 constats de forme ; 5 points à trancher. Les 10 scénarios simulés donnent des bilans cohérents avec leurs notes et avec le polycopié (hors carence iodée, décision T1). Les pages citées dans les loupes ont été vérifiées et sont exactes.

## Corrections appliquées

| Constat | Statut | Détail |
| --- | --- | --- |
| E1 | fait | model.js : nouvelle branche « TSH freinée sous lévothyroxine » (LT4 seule) ; la branche « Hyperthyroïdie infraclinique » renvoie au contrôle à 6 semaines (p. 28). Vérifié : LT4 150 µg/j → nouvelle étiquette. |
| I1 | fait | info.js thyroid.live : « Taille relative » calculée comme le dessin (0,62 si forme atrophique, sinon √goitre) ; Hashimoto 130 %, lt4 101 %. |
| I2 | fait | thyroid-axis.js : vignette grisée dans le Basedow (« diffuse (9B) : inutile si TRAb + »), « hypofixation (LT4 ; complément) » en cas de surdosage. Textes raccourcis pour tenir dans la vignette (capture vérifiée). |
| I3 | fait | pituitary.js : lead et points marqués « (complément) » ; somatostatine sourcée p. 7. |
| I4 | fait | follicle.js : points 1-2. |
| I5 | fait | target-cell.js : points 1-4. |
| I6 | fait | thyroid-axis.js : pas 1 et 7. |
| I7 | fait | info.js : tgi, brain, nodule, bone. |
| I8 | fait | sheets-molecules.js : fiche iode. |
| I9 | fait | sheets-organs.js : rapports des récurrents. |
| I10 | fait | sheets-organs.js : définition du goitre (p. 11-13). |
| I11 | fait | zoom-thyro.js : zt-para et point de la loupe Anatomie chirurgicale. |
| I12 | fait | zoom-thyro.js : zt-fetal et message du 1er trimestre. |
| I13 | fait | zoom-thyro.js : « Orbitopathie (moitié des cas, p. 31) ». |
| I14 | fait | zoom-thyro.js : zt-rln. |
| I15 | fait | model.js : note du scénario nti. |
| F1 | fait | thyroid-axis.js et model.js (anat) : « augmentée de volume » seulement si goitre > 1,15. |
| F2 | fait | zoom-thyro.js : « thyro-cervical » (2 occurrences). |
| F3 | fait | poly-figs.js : figures 6, 7A-7D → tirads ; 8 et 9B → thyro-ai ; 10 → thyro-embryo. |
| F4 | non fait | confiance basse (cohérence mineure de la liste des tissus de D3). |
| Points à trancher | non faits | laissés à l'auteur. |

Contrôles : `node --check` OK sur les 10 fichiers touchés ; allscen.js : interprétations des 10 scénarios thyroïdiens inchangées, 0 erreur de page ; captures Playwright de la vignette (Basedow, surdosage en LT4) vérifiées.
