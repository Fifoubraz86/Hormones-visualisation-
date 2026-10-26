/*
 * Fiches d'information affichées au survol (ou au toucher) et légende des molécules.
 * Clé = valeur de l'attribut data-info d'un élément SVG ou HTML.
 * `live` renvoie une ligne calculée à partir du modèle (taux actuel, activité…).
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const M = HV.model;
  const n = (v, d) => v.toFixed(d).replace('.', ',');
  const labLine = (k) => {
    const L = M.LABS.find((x) => x.key === k);
    const v = M.lab(k);
    const st = v > L.hi ? ' ↑' : v < L.lo ? ' ↓' : '';
    return `Valeur simulée : ${k === 'tsh' && v < 0.01 ? '< 0,01' : n(v, k === 'tsh' || k === 'rt3' ? 2 : 1)} ${L.unit}${st}`;
  };
  const pct = (v) => Math.round(v * 100) + ' %';

  const I = {
    /* ---- Molécules ---- */
    trh: { t: 'TRH', k: 'Thyréolibérine · tripeptide', d: 'pGlu-His-Pro-NH₂. Sécrétée par les neurones du noyau paraventriculaire dans le système porte, elle stimule la synthèse et la sécrétion de TSH (et de prolactine).', live: () => 'Sécrétion relative : ' + pct(M.s.trh) },
    tsh: { t: 'TSH', k: 'Thyréostimuline · glycoprotéine ≈ 28 kDa', d: 'Sous-unité α commune à LH, FSH et hCG, sous-unité β spécifique. Agit sur le récepteur de la TSH (couplé à Gs) du thyréocyte. Sécrétion pulsatile, pic nocturne.', live: () => labLine('tsh') },
    t4: { t: 'T4 · L-thyroxine', k: '3,5,3′,5′-tétraiodo-L-thyronine', d: 'Forme de réserve, majoritaire dans le plasma, produite exclusivement par la thyroïde. Peu active, convertie en T3 par D1 et D2. Complément : liée à 99,97 % aux protéines, demi-vie ≈ 7 jours.', live: () => labLine('t4') },
    t3: { t: 'T3 · L-triiodothyronine', k: '3,5,3′-triiodo-L-thyronine', d: 'Forme active. 75 % proviennent de la conversion périphérique de la T4 par les désiodases (25 % sont thyroïdiens). Complément : affinité pour le récepteur nucléaire environ 10 fois supérieure à celle de la T4, demi-vie ≈ 1 jour.', live: () => labLine('t3') },
    rt3: { t: 'T3 reverse', k: '3,3′,5′-triiodothyronine', d: 'Métabolite inactif produit par la D3 à partir de la T4. Augmente au cours des maladies aiguës sévères et du jeûne (complément : non cité dans le polycopié, non dosé en pratique).', live: () => labLine('rt3') },
    iod: { t: 'Iodure (I⁻)', k: 'Oligo-élément indispensable', d: 'Capté par le NIS au pôle basal du thyréocyte. Besoins (complément, OMS) : 150 µg/j chez l\'adulte, 250 µg/j pendant la grossesse et l\'allaitement.', live: () => 'Apport simulé : ' + Math.round(M.p.iodine * 150) + ' µg/j' },
    trab: { t: 'TRAb', k: 'Anticorps anti-récepteur de la TSH (IgG)', d: 'Dans la maladie de Basedow, ils activent le récepteur de la TSH comme le ferait la TSH, sans rétrocontrôle possible. Ils traversent le placenta.', live: () => (M.p.trab > 0.02 ? 'Présents : ' + n(M.p.trab * 4, 1) + ' UI/L' : 'Absents') },
    tg: { t: 'Thyroglobuline', k: 'Glycoprotéine dimérique ≈ 660 kDa', d: 'Synthétisée par le thyréocyte et stockée dans la colloïde. Ses résidus tyrosyl servent de support à l\'iodation. Marqueur de suivi des cancers thyroïdiens différenciés.' },
    tgi: { t: 'Thyroglobuline iodée', k: 'Forme de stockage', d: 'Porte MIT, DIT, T3 et T4 après iodation par la TPO et couplage. Réserve d\'hormones pour plusieurs semaines (complément).' },
    mrna: { t: 'ARN messager', k: 'Transcription induite par la T3', d: 'Transcrits de gènes cibles : Na⁺/K⁺-ATPase, UCP, chaîne lourde α de la myosine, SERCA2, récepteur des LDL…' },
    tbg: { t: 'TBG', k: 'Thyroxine-binding globulin', d: 'Lie environ 70–75 % des hormones thyroïdiennes ; transthyrétine ≈ 10–15 %, albumine ≈ 10–20 % (complément ; le polycopié simplifie en TBG 75 %, TBPA 25 %). Le dosage des fractions libres évite les fluctuations liées à la TBG. Augmentée par les œstrogènes et la grossesse ; diminuée par les androgènes, les glucocorticoïdes et le syndrome néphrotique (complément).' },
    ttr: { t: 'Transthyrétine (TBPA)', k: 'Thyroxine-binding prealbumin · tétramère', d: 'Lie environ 10–15 % de la T4, l\'albumine en portant 10–20 % (complément ; le polycopié attribue 25 % à la TBPA). Complément : transporte aussi la protéine de liaison du rétinol et assure le passage de la T4 dans le liquide cérébrospinal.' },
    alb: { t: 'Albumine', k: 'Faible affinité, forte capacité', d: 'Faible affinité, forte capacité : fraction mineure, non détaillée dans le polycopié.' },
    rbc: { t: 'Hématie', k: 'Globule rouge', d: 'Repère visuel du flux sanguin.' },
    na: { t: 'Sodium (Na⁺)', k: 'Cotransporté par le NIS', d: 'Le NIS fait entrer 2 Na⁺ pour 1 I⁻ grâce au gradient créé par la Na⁺/K⁺-ATPase.' },

    /* ---- Signes ---- */
    'sign-inhib': { t: 'Inhibition', k: 'Rétrocontrôle négatif ou frein', d: 'Frein exercé sur une cellule cible ; dans un rétrocontrôle négatif, l\'hormone périphérique (en aval) freine les étages d\'amont. Dans l\'axe thyréotrope : T4 et T3 freinent TRH et TSH, surtout via la T3 produite sur place par la D2 (TRβ2 ; complément).' },
    'sign-stim': { t: 'Stimulation', k: 'Effet positif', d: 'L\'hormone en amont stimule la cellule cible.' },

    /* ---- Organes ---- */
    brain: { t: 'Encéphale', k: 'Cible majeure de la T3', d: 'La T3 est indispensable à la myélinisation et à la migration neuronale. Une hypothyroïdie congénitale non traitée entraîne une déficience intellectuelle : d\'où le dépistage néonatal systématique (complément).' },
    callosum: { t: 'Corps calleux', k: 'Repère anatomique', d: 'Commissure inter-hémisphérique. Sert de repère pour situer l\'hypothalamus, en dessous et en avant.' },
    cerebellum: { t: 'Cervelet', k: 'Repère anatomique', d: 'Coordination motrice. Repère en coupe sagittale.' },
    brainstem: { t: 'Tronc cérébral', k: 'Repère anatomique', d: 'Relie l\'encéphale à la moelle épinière.' },
    chiasm: { t: 'Chiasma optique', k: 'Juste au-dessus de l\'hypophyse', d: 'Un macroadénome hypophysaire à extension suprasellaire le comprime : hémianopsie bitemporale.' },
    hypothalamus: { t: 'Hypothalamus', k: 'Centre intégrateur neuro-endocrine', d: 'Le noyau paraventriculaire produit la TRH (et la CRH). Il intègre la température, l\'état nutritionnel et le stress.', live: () => 'TRH relative : ' + pct(M.s.trh) },
    stalk: { t: 'Tige pituitaire', k: 'Infundibulum', d: 'Contient le système porte hypothalamo-hypophysaire et les axones vers la posthypophyse. Sa section lève l\'inhibition dopaminergique (hyperprolactinémie).' },
    'pit-ant': { t: 'Antéhypophyse', k: 'Adénohypophyse', d: 'Contient les cellules thyréotropes (≈ 5 % ; complément), mais aussi corticotropes, somatotropes, lactotropes et gonadotropes.', live: () => labLine('tsh') },
    'pit-post': { t: 'Posthypophyse', k: 'Neurohypophyse', d: 'Libère l\'ADH (vasopressine) et l\'ocytocine produites par l\'hypothalamus. Hypersignal T1 spontané en IRM (complément).' },
    'hh-axons': { t: 'Axones magnocellulaires', k: 'Noyaux supraoptiques et paraventriculaires → posthypophyse', d: 'L\'ADH et l\'ocytocine transitent le long des axones de la tige pituitaire et sont stockées dans la posthypophyse, d\'où elles sont libérées dans le sang (polycopié p. 47 et 50).' },
    'hh-portal': { t: 'Système porte hypothalamo-hypophysaire', k: 'Éminence médiane → antéhypophyse', d: 'Véhicule les facteurs hypothalamiques jusqu\'à l\'antéhypophyse (polycopié p. 47).' },
    sella: { t: 'Selle turcique', k: 'Os sphénoïde', d: 'Loge osseuse de l\'hypophyse.' },
    thyroid: { t: 'Thyroïde', k: '15 à 20 g chez l\'adulte (complément)', d: 'Deux lobes reliés par un isthme (parfois la pyramide de Lalouette). Thyréocytes (hormones thyroïdiennes) et cellules C parafolliculaires (calcitonine). Elle grossit sous l\'effet d\'une stimulation prolongée (goitre).', live: () => 'Taille relative : ' + pct(M.p.atro > 0.5 ? 0.62 : Math.sqrt(M.s.goitre)) },
    pyramidal: { t: 'Lobe pyramidal', k: 'Inconstant', d: 'Reliquat du canal thyréoglosse, présent chez environ un tiers des sujets (complément).' },
    parathyroid: { t: 'Parathyroïdes', k: '4 glandes à la face postérieure', d: 'Sécrètent la PTH (métabolisme phosphocalcique). Risque de lésion au cours d\'une thyroïdectomie.' },
    larynx: { t: 'Larynx', k: 'Cartilages thyroïde et cricoïde', d: 'Repères de palpation : la thyroïde se trouve sous le cartilage cricoïde et monte à la déglutition.' },
    trachea: { t: 'Trachée', k: 'Anneaux cartilagineux', d: 'Un goitre volumineux peut la dévier ou la comprimer.' },
    nodule: { t: 'Nodule autonome', k: 'Adénome toxique', d: 'Sécrète indépendamment de la TSH (souvent par mutation activatrice du récepteur de la TSH ; complément). Apparaît « chaud » en scintigraphie, le reste de la glande est éteint.' },
    heart: { t: 'Cœur', k: 'Effets chronotrope et inotrope', d: 'La T3 augmente la fréquence cardiaque et la contractilité (α-MHC, SERCA2, récepteurs β). Hyperthyroïdie : tachycardie, fibrillation atriale.', live: () => 'Fréquence cardiaque simulée : ' + Math.round(HV.clamp(72 * Math.pow(M.s.t3, 0.35), 45, 150)) + ' /min' },
    liver: { t: 'Foie', k: 'Désiodase D1, métabolisme lipidique', d: 'Contribue à la production de T3 circulante et à la clairance de la T3 reverse. La T3 augmente les récepteurs des LDL : l\'hypothyroïdie élève le LDL-cholestérol.' },
    bone: { t: 'Os', k: 'Remodelage', d: 'La T3 accélère le remodelage osseux. Une hyperthyroïdie prolongée favorise l\'ostéoporose (complément) ; chez l\'enfant, l\'hypothyroïdie retarde la croissance et la maturation osseuse.' },
    muscle: { t: 'Muscle squelettique', k: 'Thermogenèse', d: 'La T3 augmente la consommation d\'oxygène et la production de chaleur. Hypothyroïdie : crampes, myalgies, CPK élevées ; hyperthyroïdie : amyotrophie.', live: () => 'Thermogenèse relative : ' + pct(Math.pow(M.s.t3, 0.4)) },
    fat: { t: 'Tissu adipeux', k: 'Lipolyse, métabolisme basal', d: 'La T3 stimule la lipolyse et la thermogenèse (UCP1 dans le tissu adipeux brun).', live: () => 'Métabolisme basal : ' + pct(Math.pow(M.s.t3, 0.4)) },
    lungs: { t: 'Poumons', k: 'Repère', d: 'Repère anatomique.' },
    stomach: { t: 'Estomac', k: 'Repère', d: 'Sécrète la ghréline (orexigène) et la gastrine.' },
    kidney: { t: 'Reins', k: 'Rénine, EPO, calcitriol', d: 'Organe endocrine : rénine (système rénine-angiotensine-aldostérone), érythropoïétine, 1α-hydroxylation de la vitamine D. Cible de l\'ADH et de l\'aldostérone.' },
    adrenal: { t: 'Surrénales', k: 'Cortex et médullaire', d: 'Cortex : aldostérone, cortisol, androgènes. Médullaire : adrénaline et noradrénaline.' },
    breast: { t: 'Seins', k: 'Glande mammaire · cible de l\'axe lactotrope', d: 'La prolactine prépare la lactation, stimulée par les œstrogènes pendant la grossesse (p. 49). L\'hyperprolactinémie donne une galactorrhée (p. 55) ; chez l\'homme, une gynécomastie peut traduire une insuffisance gonadotrope (figure 20, p. 56).' },
    pancreas: { t: 'Pancréas endocrine', k: 'Îlots de Langerhans', d: 'Cellules β (insuline), α (glucagon), δ (somatostatine).' },
    ovary: { t: 'Ovaires', k: 'Axe gonadotrope féminin', d: 'Estradiol, progestérone, inhibine B, AMH (complément). Fonctionnement cyclique sous LH et FSH.' },
    testis: { t: 'Testicules', k: 'Axe gonadotrope masculin', d: 'Cellules de Leydig (testostérone, sous LH) et de Sertoli (spermatogenèse, inhibine B, sous FSH).' },

    /* ---- Structures cellulaires et vaisseaux ---- */
    vessel: { t: 'Circulation sanguine', k: 'Transport hormonal', d: 'Les hormones thyroïdiennes y circulent liées aux protéines (TBG, TTR, albumine). Seule la fraction libre est active.' },
    portal: { t: 'Système porte hypothalamo-hypophysaire', k: 'Deux réseaux capillaires en série', d: 'Conduit la TRH de l\'éminence médiane à l\'antéhypophyse à forte concentration, sans dilution dans la circulation générale.' },
    neuron: { t: 'Neurone à TRH', k: 'Noyau paraventriculaire', d: 'Complément : synthétise le pro-TRH, clivé par les convertases PC1/3 et PC2 ; reçoit les signaux du froid, de la leptine et des glucocorticoïdes.' },
    tanycyte: { t: 'Tanycyte', k: 'Cellule gliale bordant le 3ᵉ ventricule', d: 'Complément : capte la T4 et la convertit en T3 (D2), relais du rétrocontrôle ; dégrade aussi la TRH (pyroglutamyl-peptidase II).' },
    me: { t: 'Éminence médiane', k: 'Hors barrière hématoencéphalique', d: 'Les terminaisons des neurones hypophysiotropes y libèrent leurs hormones dans le plexus porte primaire.' },
    ventricle: { t: '3ᵉ ventricule', k: 'Liquide cérébrospinal', d: 'Bordé par les tanycytes.' },
    thyrotroph: { t: 'Cellule thyréotrope', k: '≈ 5 % des cellules antéhypophysaires (complément)', d: 'Synthétise la TSH sous l\'effet de la TRH ; freinée par la T3 et par la somatostatine (polycopié), ainsi que par la dopamine et les glucocorticoïdes (complément).' },
    trhr: { t: 'Récepteur de la TRH', k: 'RCPG couplé à Gq', d: 'Active la phospholipase C : IP₃, libération de Ca²⁺, protéine kinase C.' },
    d1: { t: 'Désiodase de type 1', k: 'Foie, rein, thyroïde (complément)', d: 'Convertit T4 en T3 et dégrade la T3 reverse. Inhibée par le PTU (complément).' },
    d2: { t: 'Désiodase de type 2', k: 'Hypophyse, tanycytes, muscle, tissu adipeux brun (complément)', d: 'Convertit la T4 en T3 à l\'intérieur de la cellule. Sert de capteur au rétrocontrôle central (complément).', live: () => 'Activité D1/D2 : ' + pct(M.p.d12) },
    d3: { t: 'Désiodase de type 3', k: 'Placenta, cerveau, peau (complément)', d: 'Inactive les hormones : T4 → T3 reverse, T3 → T2. Protège le fœtus d\'un excès d\'hormones maternelles (complément).', live: () => 'Activité D3 : ' + pct(M.p.d3) },
    mct8: { t: 'MCT8 (SLC16A2)', k: 'Transporteur des hormones thyroïdiennes', d: 'Complément : fait entrer T4 et T3 dans les cellules et sortir les hormones du thyréocyte. Les mutations du gène SLC16A2 (lié à l\'X) causent le syndrome d\'Allan-Herndon-Dudley.' },
    oatp: { t: 'MCT10 · OATP1C1', k: 'Autres transporteurs', d: 'Complément : OATP1C1 transporte préférentiellement la T4 à travers la barrière hématoencéphalique ; MCT10 (SLC16A10) transporte surtout la T3.' },
    tshr: { t: 'Récepteur de la TSH', k: 'RCPG couplé à Gs', d: 'Active l\'adénylate cyclase (AMPc) et stimule toutes les étapes de l\'hormonosynthèse ainsi que la croissance. Cible des TRAb.', live: () => 'Stimulation : ' + pct(M.s.stim) },
    camp: { t: 'AMPc', k: 'Second messager', d: 'Relaie l\'effet de la TSH dans le thyréocyte.', live: () => 'Stimulation : ' + pct(M.s.stim) },
    nis: { t: 'NIS (SLC5A5)', k: 'Symporteur sodium-iodure', d: 'Concentre l\'iodure 20 à 40 fois dans le thyréocyte (complément). Inhibé par le perchlorate ; utilisé pour la scintigraphie et le traitement par iode 131.' },
    nak: { t: 'Na⁺/K⁺-ATPase', k: 'Pompe', d: 'Crée le gradient de sodium qui alimente le NIS.' },
    pendrin: { t: 'Pendrine (SLC26A4) · ANO1', k: 'Pôle apical', d: 'Font sortir l\'iodure vers la colloïde. Mutation de la pendrine : syndrome de Pendred (surdité et goitre).' },
    tpo: { t: 'TPO et DUOX2', k: 'Thyroperoxydase, oxydase double', d: 'DUOX2 produit l\'H₂O₂ ; la TPO oxyde l\'iodure, iode les tyrosines (MIT, DIT) et réalise le couplage. Cible des anti-TPO et des antithyroïdiens de synthèse.' },
    colloid: { t: 'Colloïde', k: 'Lumière du follicule', d: 'Stock de thyroglobuline iodée.' },
    er: { t: 'Réticulum endoplasmique', k: 'Synthèse protéique', d: 'Synthèse de la thyroglobuline puis glycosylation dans le Golgi.' },
    golgi: { t: 'Appareil de Golgi', k: 'Glycosylation', d: 'Maturation des glycoprotéines (thyroglobuline, TSH) avant sécrétion.' },
    endo: { t: 'Endocytose', k: 'Micropinocytose', d: 'Le thyréocyte réabsorbe la thyroglobuline iodée stockée dans la colloïde.' },
    lyso: { t: 'Lysosome', k: 'Protéolyse', d: 'Les cathepsines libèrent T4, T3, MIT et DIT de la thyroglobuline.' },
    dehal: { t: 'DEHAL1 (IYD)', k: 'Iodotyrosine déshalogénase', d: 'Récupère l\'iode de MIT et DIT pour le réutiliser. Son déficit entraîne une hypothyroïdie avec goitre.' },
    nucleus: { t: 'Noyau', k: 'ADN', d: 'Lieu de la transcription des gènes cibles.' },
    tr: { t: 'Récepteur nucléaire TR', k: 'TRα1 (cœur, os) · TRβ1 (foie) · TRβ2 (hypophyse, hypothalamus)', d: 'Facteur de transcription activé par la T3. Mutations de TRβ : résistance aux hormones thyroïdiennes.', live: () => 'Occupation simulée : ' + Math.round((100 * M.s.t3) / (M.s.t3 + 1)) + ' %' },
    rxr: { t: 'RXR', k: 'Récepteur des rétinoïdes X', d: 'Partenaire d\'hétérodimérisation du TR sur l\'ADN.' },
    tre: { t: 'TRE', k: 'Élément de réponse aux hormones thyroïdiennes', d: 'Séquence d\'ADN reconnue par le dimère TR/RXR dans la région promotrice des gènes cibles.' },
    coa: { t: 'Coactivateurs', k: 'Ex. : SRC-1', d: 'Recrutés quand la T3 occupe le récepteur : acétylation des histones et activation de la transcription.' },
    cor: { t: 'Corépresseurs', k: 'NCoR, SMRT', d: 'Liés au récepteur sans T3 : répression de la transcription.' },
    ribo: { t: 'Ribosomes', k: 'Traduction', d: 'Synthèse des protéines codées par les ARNm induits.' },
    lympho: { t: 'Lymphocytes B et plasmocytes', k: 'Auto-immunité', d: 'Les plasmocytes, issus des lymphocytes B, produisent les TRAb dans la maladie de Basedow ; les anti-TPO marquent la thyroïdite de Hashimoto.' },
    food: { t: 'Apport iodé', k: 'Sel iodé, produits de la mer, laitages', d: 'La carence iodée reste la première cause de goitre dans le monde.', live: () => 'Apport simulé : ' + Math.round(M.p.iodine * 150) + ' µg/j' },
    levo: { t: 'Lévothyroxine (LT4)', k: 'Traitement substitutif', d: 'T4 de synthèse, à jeun, environ 1,6 µg/kg/j en substitution complète (complément). Adaptation sur la TSH 6 à 8 semaines après chaque changement de dose.', live: () => (M.p.levo > 0.02 ? 'Dose simulée : ' + Math.round((M.p.levo * 112) / 12.5) * 12.5 + ' µg/j' : 'Non prise') },
    plasma: { t: 'Plasma', k: 'Compartiment de transport', d: 'Plus de 99 % des hormones thyroïdiennes y sont liées aux protéines.' },
    'les-graves': { t: 'Maladie de Basedow', k: 'Goitre diffus hypervasculaire', d: 'Glande augmentée de volume de façon homogène, vascularisée (souffle, frémissement). Scintigraphie : fixation diffuse et intense.' },
    'les-hashi': { t: 'Thyroïdite auto-immune', k: 'Infiltrat lymphocytaire', d: 'Destruction auto-immune (anti-TPO). Deux formes distinctes (polycopié p. 21-22) : maladie de Hashimoto, thyroïde augmentée de volume, ferme et hétérogène ; thyroïdite chronique auto-immune atrophique. La scintigraphie est inutile devant une hypothyroïdie.' },
    'les-gmn': { t: 'Goitre multinodulaire', k: 'Carence iodée', d: 'Stimulation chronique : augmentation de volume puis apparition de nodules.' },
    'les-pitmass': { t: 'Macroadénome hypophysaire', k: 'Non sécrétant', d: 'Comprime l\'hypophyse saine : déficits antéhypophysaires (dont thyréotrope) et risque de compression du chiasma.' },
    scinti: { t: 'Scintigraphie thyroïdienne à l\'iode 123', k: 'Imagerie fonctionnelle, en seconde intention', d: 'Devant une hyperthyroïdie avec goitre nodulaire ou lorsque les TRAb sont négatifs : nodule chaud avec extinction du parenchyme (adénome toxique), fixation diffuse intense (Basedow), hypofixation globale (thyroïdite médicamenteuse ou autre ; complément : surcharge iodée, prise de LT4). Inutile devant une hypothyroïdie ou un goitre à TSH non basse.' },
    tumor: { t: 'Tumeur sécrétante', k: 'Sécrétion autonome', d: 'Lésion qui sécrète indépendamment de la boucle de régulation : le rétrocontrôle ne peut plus la freiner (ou seulement en partie).' },
    tissue: { t: 'Cellules des tissus', k: 'Entrée par transporteurs', d: 'Les hormones libres entrent via MCT8, MCT10 et OATP1C1.' }
  };

  HV.INFO = I;

  /* ---------- Infobulle ---------- */
  let tip, tipT, tipK, tipD, tipL, tipS, tipH, liveFn = null, hideTimer = 0;
  HV.initTips = function (container) {
    tip = document.createElement('div');
    tip.className = 'tip';
    tip.hidden = true;
    tip.setAttribute('role', 'tooltip');
    tip.innerHTML = '<p class="tip-t"></p><p class="tip-k"></p><p class="tip-d"></p><p class="tip-l"></p><p class="tip-s"></p><p class="tip-h"></p>';
    container.appendChild(tip);
    [tipT, tipK, tipD, tipL, tipS, tipH] = tip.querySelectorAll('p');
  };
  HV.showTip = function (key, x, y, sticky, hint) {
    const f = I[key];
    if (!f || !tip) return HV.hideTip();
    tipT.textContent = f.t;
    tipK.textContent = f.k || '';
    tipD.textContent = f.d || '';
    tipS.textContent = f.src || '';
    tipS.hidden = !f.src;
    tipH.textContent = hint || '';
    tipH.hidden = !hint;
    liveFn = f.live || null;
    tipL.hidden = !liveFn;
    if (liveFn) tipL.textContent = liveFn();
    tip.hidden = false;
    const r = tip.parentNode.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = x - r.left + 16, top = y - r.top + 16;
    if (left + w > r.width - 8) left = x - r.left - w - 16;
    if (top + h > r.height - 8) top = y - r.top - h - 16;
    tip.style.left = Math.max(8, left) + 'px';
    tip.style.top = Math.max(8, top) + 'px';
    clearTimeout(hideTimer);
    if (sticky) hideTimer = setTimeout(HV.hideTip, 4500);
  };
  HV.hideTip = function () {
    if (tip) tip.hidden = true;
    liveFn = null;
  };
  HV.refreshTip = function () {
    if (liveFn && tip && !tip.hidden) tipL.textContent = liveFn();
  };

  /* ---------- Légende contextuelle ---------- */
  const THYRO_LEGEND = [
    ['Hormones', ['trh', 'tsh', 't4', 't3', 'rt3']],
    ['Synthèse', ['iod', 'tg', 'tgi', 'na', 'mrna']],
    ['Transport et immunité', ['tbg', 'ttr', 'alb', 'trab']]
  ];
  const LABELS = { t4: 'T4 (4 iodes)', t3: 'T3 (3 iodes)', iod: 'Iodure I⁻', tgi: 'Tg iodée', na: 'Na⁺', trab: 'TRAb (IgG)' };
  const BIG = { tbg: 0.75, ttr: 0.8, alb: 0.75, chylo: 0.85, vldl: 1 };
  const NS = 'http://www.w3.org/2000/svg';
  function item(k) {
    const li = document.createElement('li');
    li.dataset.info = k;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-16 -14 32 28');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(NS, 'use');
    use.setAttribute('href', '#mol-' + k);
    use.setAttribute('transform', `scale(${BIG[k] || 1.15})`);
    svg.appendChild(use);
    li.appendChild(svg);
    li.appendChild(document.createTextNode(LABELS[k] || (I[k] ? I[k].t.split(' · ')[0] : k)));
    return li;
  }
  function group(host, title, keys) {
    const h = document.createElement('p');
    h.className = 'legend-g';
    h.textContent = title;
    host.appendChild(h);
    const ul = document.createElement('ul');
    keys.forEach((k) => ul.appendChild(item(k)));
    host.appendChild(ul);
  }
  let legendFor = null;
  HV.setLegend = function (host, sc) {
    const inThyro = HV.ancestors(sc).some((s) => s.id === 'thyro');
    const key = inThyro ? 'thyro' : sc.id;
    if (legendFor === key) return;
    legendFor = key;
    host.textContent = '';
    if (inThyro) THYRO_LEGEND.forEach(([t, ks]) => group(host, t, ks));
    else if (sc.legend && sc.legend.size) group(host, 'Molécules de l\'axe', [...sc.legend].filter((k) => k !== 'dot'));
    else {
      const p = document.createElement('p');
      p.className = 'legend-g';
      p.textContent = 'Zoomez sur un axe pour afficher ses molécules.';
      host.appendChild(p);
    }
    const h = document.createElement('p');
    h.className = 'legend-g';
    h.textContent = 'Régulation';
    host.appendChild(h);
    const ul = document.createElement('ul');
    [['sign-stim', 'stim', 'Stimulation'], ['sign-inhib', 'inhib', 'Inhibition, rétrocontrôle']].forEach(([k, cls, label]) => {
      const li = document.createElement('li');
      li.dataset.info = k;
      li.innerHTML = `<svg viewBox="-16 -14 32 28" aria-hidden="true"><g class="sign ${cls}"><circle r="9" class="sign-core"></circle><path class="sign-glyph" d="${cls === 'inhib' ? 'M-5,0 H5' : 'M-5,0 H5 M0,-5 V5'}"></path></g></svg>${label}`;
      ul.appendChild(li);
    });
    host.appendChild(ul);
  };
})();
