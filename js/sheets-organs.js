/*
 * Fiches anatomiques des organes : anatomie, histologie, rôle endocrine, imagerie (planches de imaging.js),
 * iconographie du polycopié CEEDMM (numéro de figure, partie et page du PDF) et liens externes.
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const fig = (part, page, n, t) => ({ part, page, n, t });
  const rp = (q) => ({ label: 'Radiopaedia : ' + q, url: 'https://radiopaedia.org/search?q=' + encodeURIComponent(q) });
  const wc = (q) => ({ label: 'Wikimedia Commons : ' + q, url: 'https://commons.wikimedia.org/w/index.php?search=' + encodeURIComponent(q) });

  HV.ORGAN_SHEETS = {
    thyroid: { title: 'Thyroïde', cls: 'Glande endocrine', organ: 'thyroidSmall', rows: [
      ['Situation', 'Base du cou, en avant de la trachée, sous le cartilage cricoïde ; monte à la déglutition'],
      ['Forme', 'Deux lobes latéraux réunis par un isthme, parfois une pyramide de Lalouette (vestige embryonnaire)'],
      ['Poids', '15 à 20 g chez l\'adulte (complément)'],
      ['Vascularisation', 'Artères thyroïdiennes supérieures (carotide externe) et inférieures (tronc thyréo-cervical) (complément)'],
      ['Rapports', 'Parathyroïdes à la face postérieure ; nerfs laryngés récurrents, carotides et jugulaires en dehors (complément)'],
      ['Histologie', 'Follicules (thyréocytes autour de la colloïde) ; cellules C parafolliculaires (calcitonine)'],
      ['Hormones', 'T4 (réserve, exclusivement thyroïdienne), T3 (25 % de la T3 circulante), calcitonine'],
      ['Sémiologie', 'Palpation : volume, consistance, nodules, souffle (Basedow) ; un goitre déborde le cou ou plonge dans le médiastin']
    ], imaging: ['thyroid-echo', 'thyroid-scinti', 'thyroid-histo'],
    figs: [fig(1, 6, '1', 'Histologie normale de la thyroïde'), fig(1, 8, '3', 'Synthèse des hormones thyroïdiennes'), fig(1, 12, '4', 'Goitre thyroïdien'), fig(1, 13, '5', 'Scanner cervico-thoracique d\'un goitre'), fig(1, 15, '6', 'Échographie thyroïdienne normale'), fig(1, 16, '7A', 'Aspects échographiques de nodules thyroïdiens'), fig(1, 17, '7B–7C', 'Aspects échographiques de nodules thyroïdiens'), fig(1, 18, '7D', 'Aspects échographiques de nodules thyroïdiens'), fig(1, 27, '8', 'Orbitopathie basedowienne'), fig(1, 29, '9A', 'Scintigraphie : nodule toxique'), fig(1, 29, '9B', 'Scintigraphie : maladie de Basedow')],
    links: [rp('thyroid ultrasound'), rp('toxic adenoma thyroid'), wc('thyroid histology')] },

    parathyroid: { title: 'Parathyroïdes', cls: 'Glandes endocrines', organ: 'parathyroidBack', rows: [
      ['Nombre', '4 dans 80 % des cas (2 supérieures, 2 inférieures)'],
      ['Taille, poids', '4 à 6 mm de long, ≈ 40 mg chacune ; couleur brun chamois'],
      ['Situation', 'Face postérieure des pôles thyroïdiens ; P3 (inférieures) parfois dans le médiastin supérieur (40 %), P4 (supérieures) près du cricoïde'],
      ['Embryologie', 'P3 : 3ᵉ poche branchiale (avec le thymus) ; P4 : 4ᵉ poche'],
      ['Vascularisation', 'Artère unique et terminale, le plus souvent thyroïdienne inférieure'],
      ['Histologie', 'Cellules principales (riches en adipocytes), rares cellules oxyphiles'],
      ['Hormone', 'PTH, régulée par le calcium via le CaSR'],
      ['Pathologie', 'Adénome unique (encapsulé, brun orangé), hyperplasie des 4 glandes, cancer (rare, dur, adhérent)']
    ], imaging: ['para-echo', 'para-mibi'],
    figs: [fig(1, 33, '10', 'Embryologie des parathyroïdes'), fig(1, 36, '11', 'Bilan du calcium'), fig(1, 37, '12', 'Principaux mécanismes de régulation de la calcémie'), fig(1, 41, '13', 'Physiopathologie de l\'hyperparathyroïdie primaire'), fig(1, 44, '14', 'Signe de Chvostek'), fig(1, 44, '15', 'Signe de Trousseau'), fig(1, 45, '16', 'Allongement du QT dans l\'hypocalcémie')],
    links: [rp('parathyroid adenoma'), rp('sestamibi')] },

    pituitary: { title: 'Hypophyse', cls: 'Glande endocrine', organ: 'pituitaryIcon', rows: [
      ['Situation', 'Selle turcique de l\'os sphénoïde ; reliée à l\'hypothalamus par la tige pituitaire'],
      ['Taille', '< 1 cm de diamètre'],
      ['Rapports', 'Chiasma optique au-dessus, sinus caverneux latéralement (carotide interne, nerfs III, IV, V1, V2, VI ; détail des nerfs en complément), sinus sphénoïdal en dessous'],
      ['Antéhypophyse', 'Adénohypophyse : GH, prolactine, LH, FSH, TSH, ACTH ; reçoit les facteurs hypothalamiques par le système porte'],
      ['Posthypophyse', 'Neurohypophyse : terminaisons axonales libérant ADH et ocytocine ; hypersignal T1 spontané en IRM (complément)'],
      ['Section de la tige', 'Déficits somatotrope, gonadotrope, thyréotrope, corticotrope et hyperprolactinémie de déconnexion'],
      ['Adénomes', 'Micro- (< 10 mm), macro- (≥ 10 mm), géants (≥ 40 mm) ; extension suprasellaire (chiasma), latérale (sinus caverneux), inférieure (sinus sphénoïdal)']
    ], imaging: ['pit-mri'],
    figs: [fig(1, 48, '17', 'Les cinq axes hypothalamo-antéhypophysaires'), fig(1, 51, '18', 'Champ visuel : hémianopsie par macroadénome'), fig(1, 53, '19A', 'Acromégalie'), fig(1, 54, '19B', 'Acromégalo-gigantisme'), fig(1, 56, '20', 'Gynécomastie et insuffisance gonadotrope'), fig(1, 57, '21', 'Syndrome de Cushing par adénome corticotrope'), fig(1, 65, '22A', 'Classification des adénomes hypophysaires en IRM'), fig(1, 66, '22B–22C', 'Classification des adénomes hypophysaires en IRM'), fig(1, 67, '23', 'Hypophysite')],
    links: [rp('pituitary microadenoma'), rp('pituitary macroadenoma'), rp('posterior pituitary bright spot')] },

    hypothalamus: { title: 'Hypothalamus', cls: 'Centre neuro-endocrine', organ: 'hypothalamusIcon', rows: [
      ['Situation', 'Plancher et parois du 3ᵉ ventricule, sous le thalamus, au-dessus de l\'hypophyse'],
      ['Noyaux', 'Paraventriculaire (TRH, CRH, ADH, ocytocine), supraoptique (ADH, ocytocine) ; arqué (GHRH, dopamine, kisspeptine), aire préoptique (GnRH) : complément'],
      ['Éminence médiane', 'Hors barrière hématoencéphalique : libération des facteurs dans le plexus porte'],
      ['Intégration', 'Température, faim et satiété (leptine), stress, rythmes circadiens, osmolalité'],
      ['Pathologie', 'Craniopharyngiome, hypophysite, gliome, pathologies infiltratives ; aménorrhée hypothalamique']
    ], imaging: ['pit-mri'],
    figs: [fig(1, 48, '17', 'Les cinq axes hypothalamo-antéhypophysaires'), fig(2, 3, '33', 'Contrôle neuro-endocrine de l\'axe gonadotrope')],
    links: [rp('hypothalamus')] },

    adrenal: { title: 'Glandes surrénales', cls: 'Glandes endocrines', organ: 'adrenalKidney', rows: [
      ['Situation', 'Rétropéritoine, au pôle supérieur des reins ; droite pyramidale, gauche semi-lunaire'],
      ['Taille, poids', '≈ 5 × 2–3 × 1 cm ; 7 à 10 g pour les deux (≈ 4 g chacune) ; couleur jaunâtre'],
      ['Vascularisation', 'Trois artères par glande ; veine surrénale droite → veine cave inférieure, gauche → veine rénale gauche (ou veine phrénique inférieure gauche)'],
      ['Cortex', 'Zone glomérulée (aldostérone), fasciculée (cortisol, 75–80 % du cortex), réticulée (androgènes)'],
      ['Médullaire', 'Cellules chromaffines (adrénaline 80–95 %, noradrénaline 10–20 %), innervées par les nerfs splanchniques'],
      ['Stéroïdogenèse', 'Cholestérol → (StAR, P450scc) prégnénolone → enzymes propres à chaque zone']
    ], imaging: ['adrenal-ct', 'adrenal-histo'],
    figs: [fig(1, 68, '24', 'Rapports anatomiques des surrénales'), fig(1, 69, '25', 'Histologie de la surrénale'), fig(1, 71, '26', 'Stéroïdogenèse'), fig(1, 71, '27', 'Système rénine-angiotensine-aldostérone'), fig(1, 73, '28', 'Biosynthèse des catécholamines'), fig(1, 75, '29', 'Action de l\'aldostérone sur le tubule distal'), fig(1, 87, '30', 'Mélanodermie de l\'insuffisance surrénale')],
    links: [rp('adrenal adenoma'), rp('pheochromocytoma'), wc('adrenal gland histology')] },

    pancreas: { title: 'Pancréas endocrine', cls: 'Îlots de Langerhans', organ: 'islet', rows: [
      ['Proportion', '≈ 1 % du tissu pancréatique'],
      ['Cellules', 'β (insuline, majoritaires), α (glucagon) ; δ (somatostatine) et PP (complément)'],
      ['Organisation', 'Îlots dispersés dans le parenchyme exocrine, très vascularisés'],
      ['Régulation', 'Glucose (β), hypoglycémie (α) ; incrétines (GLP-1, GIP) et système nerveux autonome (complément)'],
      ['Pathologie', 'DT1 : destruction auto-immune des cellules β ; DT2 : défaut de sécrétion et insulinorésistance ; insulinome']
    ], imaging: ['islet-histo'],
    figs: [fig(2, 30, '45', 'Physiologie du métabolisme glucidique'), fig(2, 44, '47', 'Physiopathologie de la rétinopathie diabétique'), fig(2, 46, '48', 'Albuminurie et filtration glomérulaire au cours du diabète'), fig(2, 51, '50', 'Test au monofilament'), fig(2, 55, '51', 'Mal perforant plantaire'), fig(2, 58, '53', 'Pied de Charcot aigu')],
    links: [rp('insulinoma'), wc('islet of Langerhans')] },

    ovary: { title: 'Ovaires', cls: 'Gonades féminines', organ: 'ovary', rows: [
      ['Situation', 'Organe pair ovoïde, intrapéritonéal, attaché à l\'utérus par le ligament propre de l\'ovaire'],
      ['Histologie', 'Follicules à différents stades en phase folliculaire ; corps jaune en phase lutéale'],
      ['Fonction endocrine', 'Thèque : androgènes (LH) ; granulosa : estradiol par aromatisation (FSH), inhibine ; corps jaune : progestérone et estradiol'],
      ['Fonction exocrine', 'Ovocytes (folliculogenèse)'],
      ['Évolution', 'Fonctions endocrine et exocrine qui cessent à la ménopause']
    ], imaging: ['ovary-echo'],
    figs: [fig(2, 2, '32', 'Histologie ovarienne'), fig(2, 6, '35', 'Cycle ovarien et cycle menstruel'), fig(2, 10, '37', 'Chronologie des signes pubertaires chez la fille')],
    links: [rp('polycystic ovary'), wc('ovary histology')] },

    testis: { title: 'Testicules', cls: 'Gonades masculines', organ: 'testis', rows: [
      ['Situation', 'Organe pair ovoïde dans le scrotum'],
      ['Volume', '15 à 20 mL (orchidomètre de Prader)'],
      ['Tubes séminifères', 'Cellules germinales et cellules de Sertoli (FSH, inhibine B)'],
      ['Tissu interstitiel', 'Cellules de Leydig : testostérone sous LH'],
      ['Évolution', 'Fonction endocrine qui décline lentement avec l\'âge ; spermatogenèse conservée']
    ], imaging: ['testis-echo'],
    figs: [fig(2, 2, '31', 'Histologie testiculaire'), fig(2, 4, '34', 'Fonctions endocrine et exocrine du testicule'), fig(2, 9, '36', 'Orchidomètre de Prader')],
    links: [rp('Klinefelter syndrome'), wc('testis histology')] },

    kidney: { title: 'Rein', cls: 'Organe cible et endocrine', organ: 'kidney', rows: [
      ['Fonctions endocrines', 'Rénine (appareil juxtaglomérulaire), 1α-hydroxylation de la vitamine D, érythropoïétine'],
      ['Cible', 'ADH (V2, tubule rénal), aldostérone (tube distal, canal collecteur), PTH (tube proximal : 1α-hydroxylation de la 25-OH-vitamine D, phosphaturie en complément ; anse de Henlé et tube distal : réabsorption du calcium)'],
      ['Calcium', '65 % réabsorbés au tube proximal, 25 % dans l\'anse de Henlé, complément au tube distal'],
      ['Glucose', 'Réabsorbé par SGLT2 au tube proximal ; glycosurie au-delà de ≈ 1,80 g/L']
    ], imaging: [], figs: [fig(1, 37, '12', 'Principaux mécanismes de régulation de la calcémie'), fig(1, 75, '29', 'Action de l\'aldostérone'), fig(2, 46, '48', 'Néphropathie diabétique')], links: [] },

    liver: { title: 'Foie', cls: 'Organe métabolique', organ: 'liver', rows: [
      ['Endocrinologie', 'IGF-1 (sous GH), 25-hydroxylation de la vitamine D, angiotensinogène, TBG, CBG, SHBG'],
      ['Hormones thyroïdiennes', 'Désiodase D1 (complément) ; récepteur des LDL induit par la T3'],
      ['Glucose', 'Stockage (glycogène), glycogénolyse et néoglucogenèse ; cétogenèse au jeûne'],
      ['Lipides', 'VLDL, HDL naissantes, captation des LDL (70 % des récepteurs), acides biliaires']
    ], imaging: [], figs: [fig(2, 19, '39', 'Métabolisme des lipides'), fig(2, 21, '40', 'Arc cornéen'), fig(2, 22, '41–43', 'Xanthélasma, xanthomes tendineux'), fig(2, 23, '44', 'Xanthome tubéreux')], links: [] },

    bone: { title: 'Os', cls: 'Organe cible', organ: 'bone', rows: [['Réservoir', '99 % du calcium de l\'organisme'], ['Hormones', 'PTH (ostéocytes, résorption), calcitriol, calcitonine, T3 (remodelage), œstrogènes et testostérone (masse osseuse), GH et IGF-1 (croissance)']], imaging: [], figs: [fig(1, 36, '11', 'Bilan du calcium')], links: [] },
    muscle: { title: 'Muscle squelettique', cls: 'Organe cible', organ: 'muscle', rows: [['Hormones', 'Insuline (GLUT4), T3 (thermogenèse), cortisol (catabolisme), testostérone et GH (anabolisme)'], ['Sémiologie', 'Amyotrophie proximale (Cushing, hyperthyroïdie), crampes (hypothyroïdie, hypocalcémie)']], imaging: [], figs: [], links: [] },
    fat: { title: 'Tissu adipeux', cls: 'Organe cible et endocrine', organ: 'fat', rows: [['Hormones produites', 'Leptine (effet permissif sur la GnRH), aromatisation des androgènes'], ['Cible', 'Insuline (stockage, frein de la lipolyse), cortisol (répartition facio-tronculaire), catécholamines, T3']], imaging: [], figs: [], links: [] },
    heart: { title: 'Cœur', cls: 'Organe cible', organ: 'heart', rows: [['Hormones thyroïdiennes', 'Effets chronotrope, inotrope, dromotrope ; fibrillation atriale dans l\'hyperthyroïdie'], ['Catécholamines', 'Tachycardie, hypertension'], ['Calcium', 'QT allongé dans l\'hypocalcémie']], imaging: [], figs: [fig(1, 45, '16', 'QT long de l\'hypocalcémie')], links: [] },
    brain: { title: 'Encéphale', cls: 'Organe cible', organ: 'brainLateral', rows: [['Hormones thyroïdiennes', 'Développement et maturation du système nerveux, myélinisation'], ['Glucose', 'Principal consommateur : neuroglucopénie en cas d\'hypoglycémie'], ['Sodium', 'Œdème cérébral et confusion dans les hyponatrémies sévères']], imaging: [], figs: [], links: [] },
    breast: { title: 'Glande mammaire', cls: 'Organe cible', organ: 'breast', rows: [['Hormones', 'Œstrogènes (canaux) et progestérone (acini) (complément), prolactine (lactation), ocytocine (éjection, complément)'], ['Sémiologie', 'Galactorrhée (hyperprolactinémie), gynécomastie chez l\'homme']], imaging: [], figs: [fig(1, 56, '20', 'Gynécomastie bilatérale')], links: [] },
    uterus: { title: 'Utérus', cls: 'Organe cible', organ: 'uterus', rows: [['Endomètre', 'Prolifératif sous estradiol, sécrétoire sous progestérone'], ['Myomètre', 'Contractilité augmentée par l\'estradiol et l\'ocytocine, diminuée par la progestérone']], imaging: [], figs: [fig(2, 6, '35', 'Cycle menstruel')], links: [] },
    intestine: { title: 'Intestin', cls: 'Organe cible et endocrine', organ: 'intestine', rows: [['Calcium', 'Absorption active (calcitriol) et passive ; 30 à 35 % des apports absorbés'], ['Glucose et lipides', 'Absorption ; chylomicrons'], ['Hormones produites', 'Incrétines (GLP-1, GIP), ghréline (estomac)']], imaging: [], figs: [fig(1, 36, '11', 'Bilan du calcium')], links: [] },
    lungs: { title: 'Poumons', cls: 'Organe', organ: 'lungs', rows: [['Endocrinologie', 'Enzyme de conversion de l\'angiotensine (endothélium pulmonaire) ; tumeurs neuroendocrines bronchiques (ACTH ectopique, SIADH)']], imaging: [], figs: [], links: [] }
  };

  // Clés d'organes (data-info) → fiche
  HV.ORGAN_ALIAS = {
    'pit-ant': 'pituitary', 'pit-post': 'pituitary', stalk: 'pituitary', sella: 'pituitary', chiasm: 'pituitary', 'les-pitmass': 'pituitary', thyrotroph: 'pituitary',
    larynx: 'thyroid', trachea: 'thyroid', pyramidal: 'thyroid', nodule: 'thyroid', scinti: 'thyroid', 'les-graves': 'thyroid', 'les-hashi': 'thyroid', 'les-gmn': 'thyroid', colloid: 'thyroid',
    callosum: 'brain', cerebellum: 'brain', brainstem: 'brain', neuron: 'hypothalamus', tanycyte: 'hypothalamus', me: 'hypothalamus', ventricle: 'hypothalamus',
    stomach: 'intestine', testis: 'testis', ovary: 'ovary'
  };
  // Type d'icône d'organe (schémas d'axes) → fiche
  HV.ORGAN_BY_ICON = {
    pituitaryIcon: 'pituitary', hypothalamusIcon: 'hypothalamus', adrenalKidney: 'adrenal', parathyroidBack: 'parathyroid', islet: 'pancreas',
    ovary: 'ovary', testis: 'testis', kidney: 'kidney', liver: 'liver', bone: 'bone', muscle: 'muscle', fat: 'fat', heart: 'heart',
    brainLateral: 'brain', breast: 'breast', uterus: 'uterus', intestine: 'intestine', lungs: 'lungs'
  };
})();
