# Inventaire : ce que l'on peut modéliser, et avec quelles ressources libres

Document de travail pour le **socle commun** et les futurs modules de spécialité. Il recense :
1. les **ressources gratuites et officielles** (illustrations, voies physiologiques, modèles de simulation, ontologies) avec leur licence ;
2. par appareil, les **organes, cellules, concepts et processus physiologiques ou physiopathologiques** que l'on pourrait animer, avec la forme de modèle adaptée et les ressources à utiliser ;
3. des **priorités**.

Recherche faite le 28 octobre 2026. Les licences notées « à vérifier » n'ont pas pu être confirmées sur la page officielle : les relire avant tout emprunt. Comme pour l'atlas, **rien n'est repris tel quel sans source** : un modèle publié fournit la structure et des ordres de grandeur, le contenu médical reste celui du référentiel de chaque module (avec page) ou est marqué « (complément) ».

## Licences : ce qui est compatible avec l'atlas

| Licence | Compatible | Conditions |
| --- | --- | --- |
| CC0, domaine public | oui | aucune (citer reste courtois) |
| CC BY 3.0 / 4.0 | oui | citer l'auteur, la licence, signaler les modifications (déjà fait dans `assets/organs/CREDITS.md`) |
| MIT, BSD, Apache 2.0 (code) | oui | garder la mention de copyright et la licence |
| CC BY-SA | avec prudence | l'œuvre dérivée doit être sous la même licence : à garder dans des fichiers séparés, ou à éviter |
| GPL (code) | avec prudence | intégrer du code GPL impose la GPL au programme ; s'en inspirer (équations publiées) ne l'impose pas |
| CC BY-NC, « usage académique seulement », freeware | non pour le dépôt | utilisable comme référence de lecture, pas copié |
| KEGG, Visible Body, Complete Anatomy, UpToDate | non | commerciaux ou réutilisation restreinte |

## 1. Ressources

### 1.1 Illustrations

| Ressource | Contenu | Licence | État dans l'atlas |
| --- | --- | --- | --- |
| [Servier Medical Art (SMART)](https://smart.servier.com/) | 41 kits PowerPoint vectoriels : organes, cellules, tissus, pathologies (diabète, athérothrombose, cœur, rein, os, œil…) | CC BY 4.0 | **utilisé** ; kits dans le Drive, inventaire `docs/inventaire-servier.md`, extraction `tools/pptx2svg.py` |
| [Bioicons](https://bioicons.com/) ([dépôt GitHub](https://github.com/duerrsimon/bioicons)) | icônes SVG de biologie, dont Servier, DBCLS, cellules, laboratoire | par icône : CC0, CC BY, MIT, BSD (exclure CC BY-SA) | **utilisé** ; inventaire `docs/inventaire-illustrations.md` |
| [NIH BioArt Source](https://bioart.niaid.nih.gov/) | ≈ 2 000 illustrations (cellules, virus, organes, matériel) | domaine public pour l'essentiel, quelques CC BY 4.0 ([conditions](https://bioart.niaid.nih.gov/terms)) | à exploiter : cellules immunitaires, virus, matériel |
| [Reactome, bibliothèque d'icônes](https://reactome.org/icon-lib) | icônes de protéines, récepteurs, compartiments, types cellulaires | CC BY 4.0 ([licence](https://reactome.org/license)) | à exploiter : récepteurs, transporteurs des loupes cellulaires |
| [SciDraw](https://scidraw.io/) | dessins scientifiques (neurosciences, animaux, matériel) | CC BY 4.0 en général, à vérifier dessin par dessin | réserve |
| [Health Icons](https://healthicons.org/) | pictogrammes de santé (organes stylisés, médicaments, examens) | icônes CC0, code MIT | à exploiter pour l'interface (boutons, fiches) |
| [OpenStax, *Anatomy & Physiology 2e*](https://openstax.org/books/anatomy-and-physiology-2e/pages/preface) | manuel complet et ses figures | CC BY 4.0 (sauf figures créditées à des tiers) | référence de lecture ; figures réutilisables en citant |
| Wikimedia Commons (dont planches de *Gray's Anatomy*, 1918) | photographies, planches anciennes | domaine public pour Gray ; licence variable sinon | au cas par cas |
| [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy), BodyParts3D | atlas 3D (Blender) | CC BY-SA 4.0 et CC BY-SA 2.1 Japon | à éviter dans le dépôt (partage à l'identique) |

### 1.2 Voies et processus (ce qu'il faut dessiner, dans quel ordre)

| Ressource | Contenu | Licence | Usage |
| --- | --- | --- | --- |
| [Reactome](https://reactome.org/) | voies humaines expertisées : signalisation de l'insuline, des récepteurs nucléaires, stéroïdogenèse, hémostase, immunité, métabolisme des lipoprotéines | illustrations CC BY 4.0, données CC0 ([licence](https://reactome.org/license)) | trame des loupes cellulaires et moléculaires |
| [WikiPathways](https://www.wikipathways.org/) | voies communautaires (dont adipogenèse, SRAA, glycolyse, cycle de l'urée) | CC0 ([conditions](https://wikipathways.org/terms.html)) | idem, réutilisable sans contrainte |
| [Gene Ontology](https://geneontology.org/) | vocabulaire des processus biologiques | CC BY 4.0 ([politique](https://geneontology.org/docs/go-citation-policy/)) | nommer et classer les processus |
| [Uberon](https://obophenotype.github.io/uberon/) | ontologie anatomique (organes, tissus) | CC BY 3.0 | liste de référence des organes |
| Cell Ontology | types cellulaires | à vérifier | liste de référence des cellules |
| Human Phenotype Ontology | signes et symptômes | conditions propres, à vérifier ([licence](https://hpo.jax.org/app/license)) | relier symptômes et mécanismes |

### 1.3 Modèles de simulation (équations)

| Ressource | Contenu | Licence | Intérêt |
| --- | --- | --- | --- |
| [BioModels (EBI)](https://www.ebi.ac.uk/biomodels/) | milliers de modèles publiés en SBML, partie « curée » reproduisant les figures des articles | CC0 | source n° 1 : glucose-insuline, axe thyréotrope, cycle cellulaire, calcium, coagulation |
| [Physiome Model Repository](https://models.physiomeproject.org/) (CellML) | modèles d'électrophysiologie, de circulation (dont plusieurs versions du modèle de Guyton), de transport rénal | licence par modèle, à vérifier | cœur (potentiel d'action), circulation, néphron |
| [Pulse Physiology Engine](https://pulse.kitware.com/) (Kitware, issu de BioGears) | moteur de physiologie entière : circulation, respiration, rein, pharmacologie | Apache 2.0 ([NOTICE](https://gitlab.kitware.com/physiology/engine/-/raw/stable/NOTICE)) | référence d'architecture pour un module cardio ou réanimation |
| [Physiolibrary](https://build.openmodelica.org/Documentation/Physiolibrary.UsersGuide.html) (Modelica) | briques de physiologie (hydraulique, chimie, osmose, thermique), issues de HumMod | BSD 3-Clause (hors dossier *Resources*) | équations de compartiments réutilisables |
| [Bodylight.js](https://www.jmir.org/2019/7/e14160) | simulateurs web (néphron, circulation, boucle pression-volume) | GPL 3.0 | s'en inspirer (format d'interface), ne pas copier le code |
| HumMod | modèle intégré (≈ 5 000 variables) : cœur, rein, hormones, métabolisme | décrit comme libre, licence à vérifier | référence de lecture |
| CircAdapt (Maastricht) | circulation et adaptation cardiaque, simulateur d'enseignement | gratuiciel, licence à vérifier | référence de lecture (cardio) |
| [SPINA Thyr, SimThyr](https://spina.sourceforge.net/) | homéostasie thyroïdienne, indices SPINA-GT et SPINA-GD | BSD | modèle thyroïdien plus quantitatif (déjà cité dans `docs/pistes.md`) |
| [simglucose](https://github.com/jxx123/simglucose) | réimplantation Python du simulateur UVA/Padova 2008 (30 patients virtuels DT1) | MIT selon les métadonnées, usage recherche annoncé, à vérifier | validation du simulateur DT1 |
| Modèles publiés « de manuel » | modèle minimal de Bergman, modèles de Hovorka (DT1) et de Dalla Man (repas), modèle de Windkessel, Hodgkin-Huxley, cascade de la coagulation | équations publiées, libres d'être réécrites | à réécrire dans le moteur de l'atlas (`HV.makeSim`) |
| [PhET](https://phet.colorado.edu/) (Colorado) | simulations pédagogiques (neurone, canaux membranaires, gènes) | CC BY 4.0 | modèles de présentation à imiter |

## 2. Inventaire par appareil

Légende de la colonne « Atlas » : **fait** (scène ou loupe existante), **partiel**, **à faire**.
Colonne « Modèle » : *compartiments* (réservoirs qui se remplissent et se vident, ce qu'utilise l'atlas), *rétrocontrôle* (boucle hormonale), *circuit* (pressions et débits), *cinétique* (réactions en cascade), *spatial* (diffusion, croissance), *statistique* (risque).

### 2.1 Endocrinologie et métabolisme (module de l'auteur)

| Élément | Type | Atlas | Modèle | Ressources |
| --- | --- | --- | --- | --- |
| Axes hypothalamo-hypophysaires (thyréotrope, corticotrope, somatotrope, gonadotropes, lactotrope, posthypophyse) | organes, rétrocontrôle | fait | rétrocontrôle | polycopié CEEDMM ; SPINA Thyr |
| Stéroïdogenèse, médullosurrénale, SRAA | cellule, voie | fait | cinétique | Reactome, WikiPathways |
| Glycémie, îlot, insuline, incrétines, foie, appétit | organes, cellules | fait | compartiments | BioModels (Bergman, Dalla Man) |
| Complications du diabète : **microangiopathie** (rétine, rein, nerf) | processus physiopathologique | partiel (loupe descriptive) | *statistique* (risque cumulé selon HbA1c et durée) + *cinétique* (glycation, AGE) | kit Servier Diabetes ; Reactome et WikiPathways (signalisation des produits de glycation avancée et de leur récepteur RAGE) |
| Acidocétose, état hyperosmolaire | processus | partiel (foie) | compartiments (cétones, osmolalité, eau) | polycopié ; Physiolibrary (osmose) |
| Hypoglycémie et contre-régulation | processus | partiel | rétrocontrôle | polycopié |
| Lipoprotéines, LDL, PCSK9 | voie | fait | compartiments | Reactome, kit Servier Lipids |
| Phosphocalcique, vitamine D, FGF23, remodelage osseux | organes, cellules | fait | rétrocontrôle | kit Servier Bone-structure |
| Tissu adipeux, leptine, insulinorésistance | organe, processus | partiel | compartiments | WikiPathways (adipogenèse) |
| Thermogenèse, métabolisme de base | concept | à faire | compartiments (bilan énergétique) | OpenStax ch. 24 |
| Grossesse : placenta, hCG, diabète gestationnel | organe, processus | partiel | rétrocontrôle | kit Servier Embryology |
| Croissance (cartilage de conjugaison, GH/IGF-1) | tissu | partiel | compartiments | kit Servier Embryology, Bone-structure |

### 2.2 Cardiovasculaire (futur module cardiologie)

| Élément | Type | Atlas | Modèle | Ressources |
| --- | --- | --- | --- | --- |
| Cœur : cycle cardiaque, boucle pression-volume, loi de Frank-Starling | organe, concept | à faire | *circuit* (élastance variable) | kit Servier Heart-physiology ; Pulse ; Bodylight (référence) |
| Cardiomyocyte : potentiel d'action, couplage excitation-contraction, calcium | cellule | à faire | cinétique (Hodgkin-Huxley simplifié) | Physiome (CellML) ; kit Servier Heart-physiology (diap. 17) |
| Conduction et ECG | concept | à faire | circuit + géométrie | kit Servier Heart-physiology (diap. 11, 21) |
| Circulation systémique, pression artérielle, baroréflexe | processus | à faire | circuit (Windkessel) + rétrocontrôle | Pulse ; Guyton (Physiome) |
| **Athérosclérose** : dysfonction endothéliale, LDL oxydées, cellules spumeuses, plaque, rupture, thrombose | processus physiopathologique | à faire (lien avec l'axe lipides) | cinétique + *spatial* (croissance de la plaque) | kit Servier Arteries-atherothrombosis (parties 1 et 2) ; Blood-immunology (cellules spumeuses) ; Reactome |
| Insuffisance cardiaque, remodelage, peptides natriurétiques | processus | à faire | circuit + rétrocontrôle (SRAA, sympathique) | kit Servier Heart-pathophysiology |
| HTA (dont endocrine : hyperaldostéronisme, phéochromocytome, Cushing) | processus | partiel (causes endocrines) | circuit + compartiments (sodium, volume) | kit Servier Arteries-pathophysiology |
| Microcirculation, œdème (loi de Starling capillaire) | concept | à faire | compartiments | kit Servier Veins, Arteries-physiology |
| Hémostase et coagulation | cascade | à faire | cinétique | Reactome « Hemostasis » ; BioModels ; kit Servier Blood-immunology (diap. 28-29) |

### 2.3 Rein, eau et électrolytes (futur module néphrologie)

| Élément | Type | Atlas | Modèle | Ressources |
| --- | --- | --- | --- | --- |
| Néphron : filtration, réabsorption segment par segment | organe, cellule | partiel (ADH, aldostérone) | compartiments en série | kit Servier Urinary-system ; Physiome (transport rénal) |
| Débit de filtration glomérulaire, autorégulation, rétrocontrôle tubulo-glomérulaire | processus | à faire | circuit + rétrocontrôle | idem |
| Bilan de l'eau et du sodium, natrémie | concept | fait (ADH, SIADH) | compartiments | polycopié |
| Potassium, équilibre acide-base | concept | partiel | compartiments + équilibres chimiques | Physiolibrary (chimie) |
| Maladie rénale chronique, néphropathie diabétique | processus | partiel | statistique + compartiments | kit Servier Diabetes (diap. 8) |

### 2.4 Respiration (futur module pneumologie)

| Élément | Type | Atlas | Modèle | Ressources |
| --- | --- | --- | --- | --- |
| Ventilation, mécanique (compliance, résistances) | organe, concept | à faire | circuit | kit Servier Respiratory-system ; Pulse |
| Échanges gazeux, courbe de dissociation de l'hémoglobine | concept | à faire | compartiments + équilibres | kit Servier Respiratory (diap. 14) |
| Contrôle de la ventilation (chémorécepteurs) | rétrocontrôle | à faire | rétrocontrôle | OpenStax ch. 22 |
| BPCO, emphysème, embolie pulmonaire, œdème pulmonaire | processus | à faire | circuit | kit Servier Respiratory (diap. 16-21) |

### 2.5 Digestif, foie, nutrition

| Élément | Type | Atlas | Modèle | Ressources |
| --- | --- | --- | --- | --- |
| Estomac, pancréas exocrine, hormones digestives | organes, cellules | fait (module pancréas) | compartiments | kits Servier Digestive-system |
| Absorption intestinale (villosités, transporteurs) | cellule | partiel | compartiments | kit Servier Digestive part 2 (diap. 4-7) |
| Foie : lobule, bile, métabolisme des médicaments | organe | partiel (foie du repas au jeûne) | compartiments | kit Servier Digestive part 1 (diap. 17-19) |
| Stéatose (MASLD), cirrhose, hypertension portale | processus | à faire | compartiments + circuit | kit Servier Digestive part 2 |

### 2.6 Neurologie

| Élément | Type | Atlas | Modèle | Ressources |
| --- | --- | --- | --- | --- |
| Neurone, potentiel d'action, synapse | cellule | à faire | cinétique (Hodgkin-Huxley) | kit Servier Neural-cells ; PhET (référence) ; ModelDB (licence par modèle, à vérifier) |
| Système nerveux autonome | organe | partiel (médullosurrénale) | rétrocontrôle | kit Servier Nervous-system (diap. 31-32) |
| Rythmes circadiens, noyau suprachiasmatique | processus | fait (notion transversale) | oscillateur | kit Servier Nervous-system (diap. 12) |
| Barrière hémato-encéphalique, liquide cérébrospinal | concept | à faire | compartiments | kit Servier Nervous-system |

### 2.7 Sang, immunité, inflammation

| Élément | Type | Atlas | Modèle | Ressources |
| --- | --- | --- | --- | --- |
| Hématopoïèse, érythropoïèse (EPO), fer | cellules, rétrocontrôle | à faire | compartiments + rétrocontrôle | kit Servier Blood-immunology (diap. 3-17) |
| Immunité innée et adaptative, anticorps | cellules, processus | partiel (auto-immunité thyroïdienne) | cinétique (populations cellulaires) | kit Servier Blood-immunology ; NIH BioArt ; Reactome |
| Inflammation aiguë et chronique (cytokines) | processus | à faire | cinétique | Reactome |
| Auto-immunité (Hashimoto, Basedow, DT1) | processus physiopathologique | partiel | cinétique (perte de cellules) | Reactome |

### 2.8 Os, muscle, mouvement

| Élément | Type | Atlas | Modèle | Ressources |
| --- | --- | --- | --- | --- |
| Remodelage osseux, ostéoporose | processus | fait (phosphocalcique) | compartiments | kit Servier Bone-structure (diap. 14-21) |
| Muscle : sarcomère, contraction, métabolisme énergétique à l'effort | cellule, processus | à faire | cinétique | kit Servier Muscles |

### 2.9 Reproduction et développement

| Élément | Type | Atlas | Modèle | Ressources |
| --- | --- | --- | --- | --- |
| Cycle ovarien et utérin, folliculogenèse | processus | fait | rétrocontrôle | kit Servier Reproduction |
| Spermatogenèse, cellules de Sertoli et de Leydig | cellules | partiel | rétrocontrôle | kit Servier Reproduction (diap. 9-10) |
| Différenciation sexuelle | processus | partiel | arbre de décision | kit Servier Genetics, Embryology |

### 2.10 Concepts transversaux (utiles à tous les modules)

| Élément | Atlas | Modèle | Ressources |
| --- | --- | --- | --- |
| Pharmacocinétique (absorption, distribution, demi-vie, état d'équilibre) | partiel (lévothyroxine, insulines dans le simulateur) | compartiments | kit Servier Scientific-graphs ; Pulse (PK/PD) |
| Récepteurs : membranaires (RCPG, tyrosine kinase), nucléaires, canaux | partiel (loupes cellulaires) | cinétique (occupation, Hill) | kit Servier Receptors-channels ; Reactome |
| Transport membranaire (diffusion, transporteurs, pompes, osmose) | partiel | compartiments | kits Servier Cell-membrane, Receptors-channels |
| Rétrocontrôle négatif et positif, homéostasie | fait (principe de l'atlas) | rétrocontrôle | OpenStax ch. 1 |
| Cycle cellulaire, cancérogenèse, angiogenèse, métastases | à faire | cinétique + spatial | kit Servier Oncology ; BioModels |
| Interprétation des dosages (sensibilité, spécificité, faux positifs) | fait (pièges de dosage) | statistique | — |

## 3. Priorités suggérées

1. **Athérosclérose** (loupe partagée entre l'axe lipides et un futur module cardio) : endothélium, LDL oxydées, macrophages et cellules spumeuses, plaque, rupture, thrombus ; kits Servier Arteries-atherothrombosis et Blood-immunology déjà dans le Drive.
2. **Microangiopathie diabétique** en modèle : glycation (HbA1c), voies délétères, et courbe de risque selon la durée et l'HbA1c, branchée sur le simulateur DT2 (les complications deviendraient une conséquence de l'équilibre simulé).
3. **Pharmacocinétique** générique (un à deux compartiments) dans le socle : déjà nécessaire pour la lévothyroxine, l'hydrocortisone, les insulines, et réutilisable par tous les modules.
4. **Circulation et boucle pression-volume** (base du module cardio) : modèle de Windkessel et d'élastance, inspiré de Pulse.
5. **Néphron complet** (base du module néphro, et complète ADH, aldostérone, iSGLT2).
6. **Hémostase** (cascade de la coagulation, anticoagulants).

Chaque nouvel élément suit la méthode de `docs/MEMOIRE-ATLAS.md` : référentiel avec pages, modèle normalisé (1 = sujet sain), scénarios vérifiés, pas à pas didactique, captures en thème clair et sombre.
