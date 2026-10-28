# Inventaire des kits Servier Medical Art (SMART)

Kits PowerPoint de Servier Medical Art (https://smart.servier.com/), licence **CC BY 4.0**
(« All SMART images are licensed under Creative Commons Attribution 4.0 », mention portée par chaque diapositive).
Attribution à reprendre : « Servier Medical Art (smart.servier.com), CC BY 4.0 ».

Les kits sont dans le Google Drive de l'auteur, dossier **ServierMedicalArt-all-kits**
(identifiant `1frGdrKVdhdIHcUAklgQTxUYuzW3BR_OY`). Ils ne sont pas dans le dépôt (plusieurs dizaines de Mo).
Une planche-contact par kit est dans `docs/servier/` (numéro = rang de la diapositive dans le diaporama).
L'inventaire des icônes Bioicons, déjà découpées en SVG, est dans `docs/inventaire-illustrations.md`.

## Extraire un dessin en SVG

```sh
# 1. repérer la diapositive et le nom du groupe (« Group 197 ») :
python3 tools/servier_index.py dossier_des_kits/ index.json
# 2. décrire les dessins voulus (nom | diapositive | groupes) dans un fichier spec, par exemple :
#    endo-thyroid-front | 5 | Group 197
python3 tools/pptx2svg.py SMART-Endocrinology.pptx sortie/ spec.txt
# 3. réduire la taille (×4 à ×5 plus léger) :
npx svgo@3.3.2 --multipass -p 1 -f sortie/ -o sortie/
```

Outils nécessaires : LibreOffice (`soffice`), `pdftocairo` (poppler), Node pour svgo. Le numéro de
`slide` de l'index correspond au fichier `ppt/slides/slideN.xml` ; c'est lui qu'attend `pptx2svg.py`.
Le dessin garde les couleurs et dégradés Servier ; le fond blanc de la diapositive est retiré.

## Déjà extrait : kit Endocrinologie → `assets/organs/servier/`

| Fichier | Contenu | Utilisé |
| --- | --- | --- |
| endo-thyroid-front | thyroïde, face antérieure | `thyroidSmall` (vignettes) |
| endo-thyroid-back | thyroïde, face postérieure avec les 4 parathyroïdes | `parathyroidBack` |
| endo-kidney-adrenal | rein et surrénale | `adrenalKidney` (axes corticotrope, médullosurrénalien) |
| endo-testis | testicule et épididyme en coupe | `testis` |
| endo-uterus | utérus, trompes, ovaires | `uterus` |
| endo-breast-section | sein en coupe sagittale | `breast` |
| endo-pituitary, endo-pituitary-vessels | hypophyse ; système porte | réserve (l'icône propre distingue anté- et posthypophyse) |
| endo-adrenal-section, endo-adrenal-vessels | surrénale en coupe ; vascularisation corticale | réserve (loupes surrénale) |
| endo-breast | silhouette du sein | réserve |
| endo-thymus | thymus | réserve |
| endo-testis-section | testicule et enveloppes | réserve |
| endo-pancreas, endo-islet | pancréas ; îlot de Langerhans entre les acini | réserve (module pancréas, loupe îlot) |
| endo-neck-normal, -hyper, -hypo | cou et thyroïde : normale, goitre, atrophie | réserve (axe thyréotrope) |
| endo-thyroid-small, endo-goiter-small | petites thyroïdes normale et goitreuse | réserve |
| endo-neck-cancer, endo-thyroid-cancer | cancer thyroïdien | réserve (NEM 2, nodule) |

Non copiés (trop lourds, > 300 Ko après svgo) : la zonation corticosurrénalienne en histologie
(diapositive 8, six groupes) et sa version vascularisée (diapositive 7). À extraire en PNG si besoin.

## Contenu des 16 kits présents

| Kit | Diapositives utiles (rang : titre) | Intérêt pour l'atlas |
| --- | --- | --- |
| [Endocrinology](servier/SMART-Endocrinology.jpg) | 3 hypophyse · 4 sein · 5 thyroïde · 6-8 surrénale (coupe, vaisseaux, zones) · 9 thymus · 10 utérus · 11 testicule · 12 pancréas, îlot · 13 maladies thyroïdiennes · 14 cancer thyroïdien | extrait (ci-dessus) |
| [Blood-immunology](servier/SMART-Blood-immunology.jpg) | 3 érythropoïèse · 4-6 hématies, drépanocytes · 7-14 myélopoïèse, polynucléaires, plaquettes, monocytes · 15-16 lymphocytes · 17 hématopoïèse · 19-20 cellules spumeuses · 21-24 VLDL, LDL, HDL, triglycérides · 25-27 anticorps, immunoglobulines · 28-29 fibrine, coagulation · 30 cicatrisation | atlas hématologie, immunologie ; athérome (cardio) ; auto-immunité thyroïdienne (anticorps) |
| [Lipids](servier/SMART-Lipids.jpg) | 3-4 lipoprotéines · 5-7 HDL, LDL, VLDL · 8 triglycérides · 9 adipocytes · 10 tissu adipeux | axe lipides et tissu adipeux de l'atlas ; atlas cardio (dyslipidémies) |
| [Respiratory-system](servier/SMART-Respiratory-system.jpg) | 4 fosses nasales · 5 poumons · 6-7 trachée, bronches · 8-9 lobes · 10-11 voies aériennes · 12 circulation pulmonaire · 13 respiration · 14 échanges gazeux · 15 pneumothorax · 16-17 embolie pulmonaire · 18 œdème pulmonaire · 19-21 BPCO, emphysème, cancer · 22 toux | atlas pneumo ; cardio (embolie, œdème pulmonaire) ; Cushing ectopique (cancer bronchique) |
| [Tissues](servier/SMART-Tissues.jpg) | 3-10 épithéliums (cubique, cylindrique, caliciformes, malpighien, pseudostratifié) · 11-14 jonctions (gap, serrées, desmosomes) · 15-17 fibroblastes, fibrocytes, collagène | loupes cellulaires (thyrocyte, acinus, entérocyte) ; histologie générale |
| [Oncology](servier/SMART-Oncology.jpg) | 3 cellules · 4 carcinome · 5 angiogenèse · 6 dissémination · 7 cancers · 8 sein · 9 côlon · 10 poumon · 11 thyroïde · 12 mélanome | TNE (métastases hépatiques), cancers hormonodépendants, atlas oncologie |
| [Genetics](servier/SMART-Genetics.jpg) | 3 caryotype · 4-5 chromosomes et allèles · 6 méiose · 7 mitose | NEM, Turner, Klinefelter, différenciation sexuelle |
| [Ophthalmology](servier/SMART-Ophthalmology.jpg) | 3-5 œil · 6-7 rétine · 8 voies lacrymales · 9 voies optiques · 10-12 vision · 13 cataracte · 14 DMLA · 15 rétinopathie diabétique · 16 glaucome · 17 conjonctivite | adénome hypophysaire (chiasma, champ visuel), rétinopathie diabétique, orbitopathie de Basedow |
| [ENT](servier/SMART-ENT.jpg) | 4 fosses nasales · 6 bulbe olfactif · 7 sinus · 8 cavité buccale · 9-10 cordes vocales, larynx · 11 oreille · 12 organe de Corti · 13 sinusite | Kallmann (bulbe olfactif), voie transsphénoïdale (sinus), récurrent (larynx) |
| [Lymphatic-system](servier/SMART-Lymphatic-system.jpg) | 3-5 système lymphatique · 6-7 capillaires · 8 ganglions · 9 vaisseau · 10 lymphatiques de l'estomac | curage ganglionnaire (thyroïde, TNE) ; absorption des lipides |
| [Parasitology](servier/SMART-Parasitology.jpg) | 3-24 protozoaires, helminthes, ectoparasites, vecteurs, hôtes | atlas infectiologie |
| [Microbiology-cell-culture](servier/SMART-Microbiology-cell-culture.jpg) | 3-22 boîtes de Petri, tubes, flacons, plaques, antibiogramme, cellules souches | schémas de méthode, laboratoire |
| [Lab-apparatus](servier/SMART-Lab-apparatus.jpg) | 3 microscope · 6 lecteur de plaques · 7 centrifugeuse · 8 analyseur d'HbA1c · 10 spectrophotométrie · 12-13 électrophorèse · 14 opérateur | dosages (immunodosage, HbA1c) |
| [Scientific-graphs](servier/SMART-Scientific-graphs.jpg) | 3-4 cinétique orale et IV · 5 décroissance pluriexponentielle · 6 dose-effet · 7 concentration avec ou sans traitement · 8 courbe de Gauss | pharmacocinétique (hydrocortisone, lévothyroxine, insuline) |
| [General-items](servier/SMART-General-items.jpg) | bulles, flèches, doigts, balances, cadenas, robinet, feux, horloges | pictogrammes (rythme circadien, balance hormonale) |
| [World-maps](servier/SMART-World-maps.jpg) | monde, Europe, France, Île-de-France, continents | épidémiologie (carence iodée) |

## Kits ajoutés ensuite (25 de plus, 41 en tout)

| Kit | Diapositives utiles | Intérêt pour l'atlas |
| --- | --- | --- |
| [Nervous-system](servier/SMART-Nervous-system.jpg) | 5-9 coupes sagittales (hypothalamus, hypophyse) · 12 noyau suprachiasmatique et zoom hypothalamo-hypophysaire · 17 polygone de Willis · 31-32 sympathique, parasympathique | **utilisé** : coupe sagittale des axes hypophysaires ; rythmes circadiens, médullosurrénale |
| [Urinary-system](servier/SMART-Urinary-system.jpg) | 4-6 rein, coupe, vascularisation · 7-9 néphron · 10 corpuscule rénal · 11 artériole afférente · 17 HTA rénovasculaire | **utilisé** : néphron (axe ADH) ; RAA (appareil juxtaglomérulaire), phosphocalcique |
| [Reproduction](servier/SMART-Reproduction.jpg) | 3 appareils génitaux · 4 utérus · 5 ovaire et ovocyte · 6-7 cycle ovarien · 8 cycle utérin · 9 testicule · 10 spermatogenèse | **utilisé** : ovaire ; folliculogenèse, endomètre, tube séminifère |
| [Diabetes](servier/SMART-Diabetes.jpg) | 3 pancréas, îlot · 4-5 glycémie capillaire · 7 rétinopathie · 8 néphropathie · 9-12 pied diabétique · 13 neuropathies | axe glycémie, complications du diabète |
| [Bone-structure](servier/SMART-Bone-structure.jpg) | 3 ostéon · 5-9 ostéoclastes, ostéoblastes, ostéocytes · 14-16 cycle du remodelage · 19-20 hydroxyapatite · 21 ostéoporose | phosphocalcique (remodelage osseux, PTH) |
| [Heart-physiology](servier/SMART-Heart-physiology.jpg) | 3-8 cœur · 9 coronaires · 11 conduction · 12 cycle cardiaque · 17 cardiomyocytes · 21 ECG | **atlas cardio** ; hormones thyroïdiennes, peptides natriurétiques |
| [Heart-pathophysiology](servier/SMART-Heart-pathophysiology.jpg) | insuffisance cardiaque, valvulopathies, endocardite, infarctus, remodelage, hypertrophie | **atlas cardio** |
| [Arteries-physiology](servier/SMART-Arteries-physiology.jpg) | circulation artérielle, aorte, tuniques, endothélium, vasoconstriction, capillaires, pression artérielle | RAA, catécholamines ; atlas cardio |
| [Arteries-pathophysiology](servier/SMART-Arteries-pathophysiology.jpg) | hypertrophie artérielle, anévrismes, œdème, pression artérielle, pouls | HTA endocrine ; atlas cardio |
| [Receptors-channels](servier/SMART-Receptors-channels.jpg) | 3-5 récepteurs · 6-14 canaux · 15-17 transporteurs, pompe Na/K · 18 récepteur sensible au calcium · 19 ions | loupes cellulaires (CaSR, canaux K-ATP, NIS) |
| [Cell-membrane](servier/SMART-Cell-membrane.jpg) | cellules vides, vacuoles, membrane, endocytose, exocytose | loupes cellulaires (sécrétion) |
| [Intracellular-components](servier/SMART-Intracellular-components.jpg) | Golgi, RE, mitochondries, noyau, protéines, cellule animale | stéroïdogenèse (mitochondrie, RE), synthèse des peptides |
| [Nucleic-acids](servier/SMART-Nucleic-acids.jpg) | ADN, ARN, transcription, traduction | récepteurs nucléaires (T3, stéroïdes) |
| [Neural-cells](servier/SMART-Neural-cells.jpg) | neurones, glie, synapses, jonction neuromusculaire | neurones hypothalamiques, médullosurrénale |
| [Muscles](servier/SMART-Muscles.jpg) | musculature, sarcomère, contraction | cibles (GH, cortisol, hormones thyroïdiennes) |
| [Embryology](servier/SMART-Embryology.jpg) | grossesse, embryon, fœtus, circulation fœtale, croissance osseuse | thyroïde et grossesse, GH (cartilage de croissance) |
| [Paraclinical-exams](servier/SMART-Paraclinical-exams.jpg) | ECG, échographie, radiographie, densitométrie, scanner, IRM, scintigraphie | imagerie (scintigraphie, densitométrie) |
| [Dietetics](servier/SMART-Dietetics.jpg), [Risk-Factors](servier/SMART-Risk-Factors.jpg) | aliments ; tabac, obésité, rachitisme, mode de vie | iode, calcium, obésité |
| [Drugs](servier/SMART-Drugs.jpg), [Medical-equipment](servier/SMART-Medical-equipment.jpg), [Medical-acts](servier/SMART-Medical-acts.jpg), [Chemistry](servier/SMART-Chemistry.jpg), [Emergency-equipment](servier/SMART-Emergency-equipment.jpg), [Bone-fractures](servier/SMART-Bone-fractures.jpg) | formes galéniques, matériel, gestes, verrerie, fractures | traitements, ostéoporose |

## Kits découpés (part 1, part 2)

| Kit | Contenu | Intérêt pour l'atlas |
| --- | --- | --- |
| [Veins part 1](servier/SMART-Veins-part-1.jpg) | 3-4 circulation veineuse (corps entier) · 5-8 réseaux profond, superficiel, tête et cou · 9-16 veines, tuniques, capillaires | **utilisé** : silhouette de la page générale (diapositive 3, peau seule, `veins-body-skin.svg`) |
| [Digestive-system part 1](servier/SMART-Digestive-system-part-1.jpg) | 3-5 appareil digestif complet et éclaté · 7-12 bouche, dents · 13-16 estomac, paroi gastrique, péristaltisme · 17-19 foie, lobule, sécrétion biliaire · 20 pancréas | module pancréas (estomac, cellules pariétales, foie) |
| [Digestive-system part 2](servier/SMART-Digestive-system-part-2.jpg) | 1-2 pancréas · 3 rate · 4-7 intestin grêle, villosités · 8-10 côlon, rectum · 11-19 ulcère, RGO, cirrhose, Crohn, polypes, cancer colique, lithiase | gastrinome (ulcères), VIPome (diarrhée), incrétines |
| [Arteries-atherothrombosis part 1](servier/SMART-Arteries-atherothrombosis-part-1.jpg), [part 2](servier/SMART-Arteries-atherothrombosis-part-2.jpg) | athérome, remodelage, athérothrombose, dissection, angioplastie, stent | axe lipides ; **atlas cardio** |

## Kits trop lourds pour le connecteur Drive

Le téléchargement par le connecteur Google Drive échoue au-delà d'environ 7 Mo : **Digestive-system**,
**People**, **Veins**, **Bones**, **Dermatology**, **Animals**, **Arteries-atherothrombosis**, **Infectiology**
n'ont pas pu être récupérés tels quels ; Digestive-system, Veins et Arteries-atherothrombosis ont été découpés en deux parties (ci-dessus). Restent : People, Bones, Dermatology, Animals, Infectiology et Veins part 2 (14 Mo). Pour les traiter, les déposer dans le dépôt (par exemple dans un dossier
`servier-kits/`, éventuellement compressés en .zip) ou les découper en plusieurs fichiers.
