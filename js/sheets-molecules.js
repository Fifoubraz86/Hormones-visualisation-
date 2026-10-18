/*
 * Fiches biochimiques des molécules (ouvertes au clic).
 * Masses et formules : PubChem (petites molécules) ou entité polymère de la PDB (chaînes polypeptidiques,
 * sans glycanes). Les autres données sont des valeurs de référence usuelles, arrondies (« ≈ »).
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const pc = (cid) => ({ label: 'PubChem CID ' + cid, url: 'https://pubchem.ncbi.nlm.nih.gov/compound/' + cid });
  const pdb = (id) => ({ label: 'RCSB PDB ' + id, url: 'https://www.rcsb.org/structure/' + id });
  const pdb101 = (q) => ({ label: 'PDB-101 : ' + q, url: 'https://pdb101.rcsb.org/search?q=' + encodeURIComponent(q) });

  HV.MOL_SHEETS = {
    /* ---------------- Axe thyréotrope ---------------- */
    trh: { cls: 'Neuropeptide (tripeptide)', rows: [
      ['Structure', 'pGlu-His-Pro-NH₂ : acide pyroglutamique N-terminal, prolinamide C-terminale (protégée des exopeptidases)'],
      ['Formule, masse', 'C₁₆H₂₂N₆O₄ · 362,4 g/mol'],
      ['Synthèse', 'Neurones du noyau paraventriculaire ; précurseur pro-TRH (6 copies de la séquence Gln-His-Pro-Gly), clivé par PC1/3 et PC2'],
      ['Transport', 'Système porte hypothalamo-hypophysaire, forme libre'],
      ['Demi-vie', 'Quelques minutes (dégradée par la pyroglutamyl-peptidase II)'],
      ['Récepteur', 'TRH-R, couplé à Gq → PLC, IP₃, Ca²⁺, PKC'],
      ['Effets', 'Synthèse et sécrétion de TSH ; stimule aussi la prolactine'],
      ['Dosage', 'Non dosée en pratique ; protiréline autrefois utilisée pour le test au TRH']
    ], links: [pc(638678)] },
    tsh: { cls: 'Glycoprotéine hétérodimérique', rows: [
      ['Structure', 'Sous-unité α (92 acides aminés, commune à LH, FSH, hCG) + sous-unité β spécifique (112 acides aminés) ; nœuds cystine ; glycosylations N-liées'],
      ['Masse', '≈ 28 kDa glycosylée (chaînes polypeptidiques ≈ 10,2 + 12,9 kDa, PDB 7T9I)'],
      ['Synthèse', 'Cellules thyréotropes de l\'antéhypophyse (≈ 5 %)'],
      ['Sécrétion', 'Pulsatile, avec un pic nocturne'],
      ['Demi-vie', '≈ 1 h'],
      ['Récepteur', 'TSH-R, RCPG à grand domaine extracellulaire riche en leucines ; Gs → AMPc (et Gq à forte concentration)'],
      ['Effets', 'Toutes les étapes de l\'hormonosynthèse thyroïdienne, croissance de la glande'],
      ['Dosage', '0,4–4 mUI/L ; premier examen de la fonction thyroïdienne']
    ], links: [pdb('7T9I'), pdb101('thyroid stimulating hormone')] },
    t4: { cls: 'Iodothyronine (dérivé de la tyrosine)', rows: [
      ['Structure', '3,5,3′,5′-tétraiodothyronine : deux cycles reliés par un pont éther, 4 atomes d\'iode'],
      ['Formule, masse', 'C₁₅H₁₁I₄NO₄ · 776,9 g/mol (65 % d\'iode en masse)'],
      ['Lipophilie', 'XLogP 2,4 ; entre dans les cellules par des transporteurs (MCT8, MCT10, OATP1C1)'],
      ['Synthèse', 'Exclusivement thyroïdienne, par couplage de deux DIT sur la thyroglobuline'],
      ['Transport', 'Liée à plus de 99,9 % : TBG ≈ 70–75 %, TBPA ≈ 10–15 %, albumine ≈ 10–20 % (complément ; le polycopié simplifie en 75 / 25 %) ; fraction libre ≈ 0,03 %'],
      ['Demi-vie', '≈ 7 jours'],
      ['Récepteur', 'Prohormone : faible affinité pour TR, convertie en T3 par D1 et D2'],
      ['Dosage', 'T4 libre 12–22 pmol/L'],
      ['Pharmacologie', 'Lévothyroxine, ≈ 1,6 µg/kg/j en substitution complète']
    ], links: [pc(5819)] },
    t3: { cls: 'Iodothyronine (hormone active)', rows: [
      ['Structure', '3,5,3′-triiodothyronine'],
      ['Formule, masse', 'C₁₅H₁₂I₃NO₄ · 651,0 g/mol'],
      ['Origine', '75 % par désiodation périphérique de la T4 (D1, D2), 25 % thyroïdienne'],
      ['Transport', 'Fraction libre ≈ 0,3 %'],
      ['Demi-vie', '≈ 1 jour'],
      ['Récepteur', 'Récepteurs nucléaires TRα1, TRβ1, TRβ2 : hétérodimère avec RXR sur les TRE ; affinité ≈ 10 fois supérieure à celle de la T4'],
      ['Effets', 'Thermogenèse, métabolisme basal, chronotropie et inotropie, développement cérébral, remodelage osseux'],
      ['Dosage', 'T3 libre 3,1–6,8 pmol/L'],
      ['Pharmacologie', 'Liothyronine']
    ], links: [pc(5920)] },
    rt3: { cls: 'Iodothyronine inactive', rows: [
      ['Structure', '3,3′,5′-triiodothyronine (iode retiré du cycle interne)'],
      ['Formule, masse', 'C₁₅H₁₂I₃NO₄ · 651,0 g/mol (isomère de la T3)'],
      ['Origine', 'Désiodation de la T4 par D3 (cycle interne)'],
      ['Élimination', 'Dégradée par D1'],
      ['Intérêt', 'Augmentée lors des maladies aiguës sévères et du jeûne (syndrome de basse T3)']
    ], links: [pc(644280)] },
    iod: { cls: 'Oligo-élément (anion)', rows: [
      ['Formule, masse', 'I⁻ · 126,9 g/mol'],
      ['Besoins', '150 µg/j (adulte) ; 250 µg/j pendant la grossesse et l\'allaitement'],
      ['Entrée', 'NIS au pôle basal du thyréocyte (2 Na⁺ / 1 I⁻), concentration ≈ 20 à 40 fois'],
      ['Sortie apicale', 'Pendrine, ANO1'],
      ['Organification', 'Oxydation par la TPO avec l\'H₂O₂ de DUOX2'],
      ['Recyclage', 'DEHAL1 libère l\'iode de MIT et DIT'],
      ['Pathologie', 'Carence : goitre ; excès : effet Wolff-Chaikoff, hyperthyroïdie induite']
    ], links: [pc(30165)] },
    tg: { cls: 'Glycoprotéine dimérique (support de l\'hormonosynthèse)', rows: [
      ['Structure', 'Homodimère ; chaque monomère ≈ 2 750 acides aminés (2 551 résolus en cryo-microscopie, PDB 6SCJ), ≈ 305 kDa de chaîne polypeptidique ; nombreux glycanes'],
      ['Masse', '≈ 660 kDa pour le dimère glycosylé'],
      ['Synthèse', 'RE puis Golgi du thyréocyte, exocytose dans la colloïde'],
      ['Rôle', 'Ses résidus tyrosyl sont iodés (MIT, DIT) puis couplés (T3, T4) ; réserve d\'hormones'],
      ['Libération', 'Endocytose puis protéolyse lysosomale'],
      ['Dosage', 'Marqueur du suivi des cancers thyroïdiens différenciés après thyroïdectomie (interpréter avec les anticorps anti-Tg)']
    ], links: [pdb('6SCJ')] },
    trab: { cls: 'Immunoglobuline G (auto-anticorps)', rows: [
      ['Structure', '2 chaînes lourdes (≈ 50 kDa) + 2 chaînes légères (≈ 23 kDa), forme en Y ; ≈ 150 kDa'],
      ['Cible', 'Récepteur de la TSH'],
      ['Types', 'Stimulants (maladie de Basedow), bloquants (rares hypothyroïdies)'],
      ['Demi-vie', '≈ 3 semaines (IgG)'],
      ['Particularité', 'Traversent le placenta : risque de dysthyroïdie fœtale et néonatale'],
      ['Dosage', 'TRAb : diagnostic de la maladie de Basedow']
    ], links: [{ label: 'RCSB PDB 1IGT (IgG2a murine entière, modèle d\'architecture)', url: 'https://www.rcsb.org/structure/1IGT' }] },
    tbg: { cls: 'Glycoprotéine de transport (serpine)', rows: [
      ['Structure', 'Serpine non inhibitrice, une poche de liaison pour T4 ou T3 (PDB 2CEO)'],
      ['Masse', '≈ 54 kDa glycosylée (chaîne ≈ 42,5 kDa)'],
      ['Synthèse', 'Foie'],
      ['Rôle', 'Transporte 75 % des hormones thyroïdiennes (polycopié)'],
      ['Variations', 'Augmentée par les œstrogènes et la grossesse ; diminuée par les androgènes, les glucocorticoïdes, le syndrome néphrotique, l\'insuffisance hépatique']
    ], links: [pdb('2CEO')] },
    ttr: { cls: 'Protéine de transport (homotétramère)', rows: [
      ['Structure', '4 sous-unités de 127 acides aminés (≈ 13,8 kDa chacune), canal central qui accueille la T4 (PDB 2ROX)'],
      ['Synthèse', 'Foie, plexus choroïdes'],
      ['Rôle', 'Transporte ≈ 10–15 % de la T4 (25 % selon le polycopié ; complément) et la RBP (rétinol)'],
      ['Pathologie', 'Amylose à transthyrétine (complément)']
    ], links: [pdb('2ROX')] },
    alb: { cls: 'Protéine plasmatique', rows: [
      ['Structure', '585 acides aminés, ≈ 66,5 kDa, trois domaines (PDB 1AO6)'],
      ['Synthèse', 'Foie'],
      ['Rôle', 'Liaison de faible affinité et de forte capacité (hormones, calcium, acides gras, médicaments)'],
      ['Intérêt', 'Fixe environ la moitié du calcium plasmatique (50 % selon le polycopié) : calcémie corrigée = Ca + 0,025 × (40 − albumine)']
    ], links: [pdb('1AO6')] },

    /* ---------------- Stéroïdes ---------------- */
    cortisol: { cls: 'Glucocorticoïde (stéroïde en C21)', rows: [
      ['Formule, masse', 'C₂₁H₃₀O₅ · 362,5 g/mol ; XLogP 1,6'],
      ['Structure', '3-céto-Δ4, 11β-OH, 17α-OH, chaîne 20-céto 21-OH'],
      ['Synthèse', 'Zone fasciculée ; cholestérol → (StAR, P450scc) prégnénolone → … → 11-désoxycortisol → cortisol (11β-hydroxylase, CYP11B1)'],
      ['Transport', 'Lié à la CBG (transcortine) et à l\'albumine ; ≈ 5 % libre'],
      ['Demi-vie', '≈ 60 à 90 min'],
      ['Récepteur', 'Récepteur nucléaire des glucocorticoïdes (GR) ; aussi le récepteur minéralocorticoïde, protégé dans le rein par la 11β-HSD2'],
      ['Rythme', 'Pic en début de matinée, nadir le soir'],
      ['Dosage', 'Cortisol à 8 h (habituellement 10–20 µg/dL, 275–550 nmol/L ; < 5 µg/dL, ≈ 138 nmol/L : évocateur d\'insuffisance surrénale ; > 18 µg/dL, ≈ 500 nmol/L : l\'exclut) ; cortisol libre urinaire ; cortisol salivaire à minuit'],
      ['Pharmacologie', 'Hydrocortisone ; corticoïdes de synthèse (prednisone, dexaméthasone)']
    ], links: [pc(5754)] },
    aldo: { cls: 'Minéralocorticoïde (stéroïde en C21)', rows: [
      ['Formule, masse', 'C₂₁H₂₈O₅ · 360,4 g/mol'],
      ['Structure', 'Aldéhyde en C18 (forme hémiacétal en solution), 11β-OH, 21-OH'],
      ['Synthèse', 'Zone glomérulée, aldostérone synthase (CYP11B2)'],
      ['Régulation', 'Angiotensine II, kaliémie ; ACTH de façon accessoire'],
      ['Demi-vie', '≈ 20 min'],
      ['Récepteur', 'Récepteur minéralocorticoïde (MR) des cellules principales : ENaC, Na⁺/K⁺-ATPase'],
      ['Dosage', 'Aldostérone et rénine, dans des conditions standardisées'],
      ['Pharmacologie', 'Antagonistes du MR : spironolactone, éplérénone ; fludrocortisone (agoniste)']
    ], links: [pc(5839)] },
    testo: { cls: 'Androgène (stéroïde en C19)', rows: [
      ['Formule, masse', 'C₁₉H₂₈O₂ · 288,4 g/mol'],
      ['Synthèse', 'Cellules de Leydig sous LH (95 % chez l\'homme) ; surrénale et ovaire chez la femme'],
      ['Transport', 'SHBG (≈ 45 %), albumine ; ≈ 2 % libre'],
      ['Métabolisme', '5α-réductase → DHT (plus puissante) ; aromatase → estradiol'],
      ['Récepteur', 'Récepteur nucléaire des androgènes (AR)'],
      ['Dosage', 'Testostérone totale le matin (≈ 10–30 nmol/L chez l\'homme jeune)']
    ], links: [pc(6013)] },
    e2: { cls: 'Œstrogène (stéroïde en C18)', rows: [
      ['Formule, masse', 'C₁₈H₂₄O₂ · 272,4 g/mol'],
      ['Structure', 'Cycle A aromatique (pas de méthyle C19), 3-OH phénolique, 17β-OH'],
      ['Synthèse', 'Granulosa : aromatisation (CYP19) des androgènes de la thèque (FSH) ; corps jaune ; aromatisation périphérique (tissu adipeux)'],
      ['Transport', 'SHBG, albumine'],
      ['Récepteurs', 'ERα, ERβ (nucléaires)'],
      ['Rétrocontrôle', 'Négatif, sauf en milieu de cycle où il devient positif (pic de LH)'],
      ['Dosage', 'Variable selon la phase du cycle']
    ], links: [pc(5757)] },
    prog: { cls: 'Progestatif (stéroïde en C21)', rows: [
      ['Formule, masse', 'C₂₁H₃₀O₂ · 314,5 g/mol'],
      ['Synthèse', 'Corps jaune (phase lutéale), placenta ; intermédiaire de toute la stéroïdogenèse'],
      ['Récepteur', 'PR-A, PR-B (nucléaires)'],
      ['Effets', 'Endomètre sécrétoire, glaire épaisse, relâchement du myomètre, effet thermogène'],
      ['Dosage', 'Progestérone en phase lutéale : témoin de l\'ovulation']
    ], links: [pc(5994)] },
    dhea: { cls: 'Androgène surrénalien (stéroïde en C19)', rows: [
      ['Formule, masse', 'C₁₉H₂₈O₂ · 288,4 g/mol'],
      ['Structure', '3β-OH, Δ5, 17-céto'],
      ['Synthèse', 'Zone réticulée (17,20-lyase du CYP17A1) ; sulfatée en DHEA-S'],
      ['Régulation', 'ACTH, sans rétrocontrôle sur l\'axe'],
      ['Dosage', 'DHEA-S : marqueur de l\'origine surrénalienne d\'une hyperandrogénie']
    ], links: [pc(5881)] },
    calcitriol: { cls: 'Sécostéroïde (vitamine D active)', rows: [
      ['Formule, masse', 'C₂₇H₄₄O₃ · 416,6 g/mol'],
      ['Structure', 'Cycle B ouvert ; 1α-OH, 3β-OH, 25-OH'],
      ['Synthèse', 'Peau (UVB) ou alimentation → foie (25-hydroxylation) → rein (1α-hydroxylase, stimulée par la PTH, freinée par FGF23)'],
      ['Transport', 'DBP (protéine de liaison de la vitamine D)'],
      ['Demi-vie', 'Quelques heures (25-OH-vitamine D : ≈ 3 semaines)'],
      ['Récepteur', 'VDR, nucléaire, hétérodimère avec RXR'],
      ['Effets', 'Absorption intestinale active du calcium, réabsorption rénale distale'],
      ['Dosage', 'On dose la 25-OH-vitamine D pour le statut vitaminique']
    ], links: [pc(5280453)] },

    /* ---------------- Peptides et protéines hypothalamo-hypophysaires ---------------- */
    crh: { cls: 'Neuropeptide', rows: [['Structure', '41 acides aminés, hélice α'], ['Synthèse', 'Noyau paraventriculaire'], ['Récepteur', 'CRHR1, couplé à Gs'], ['Effets', 'Sécrétion d\'ACTH (potentialisée par l\'ADH)'], ['Rétrocontrôle', 'Freinée par le cortisol']], links: [] },
    acth: { cls: 'Peptide issu de la POMC', rows: [
      ['Structure', '39 acides aminés ; les 24 premiers portent l\'activité (tétracosactide = Synacthène)'],
      ['Synthèse', 'Clivage de la POMC dans les cellules corticotropes ; donne aussi α-MSH et β-endorphine'],
      ['Demi-vie', '≈ 10 min'],
      ['Récepteur', 'MC2R (+ MRAP), Gs → AMPc'],
      ['Effets', 'StAR, enzymes P450, trophicité surrénalienne ; mélanodermie quand elle est très élevée'],
      ['Dosage', 'ACTH à 8 h, sur tube réfrigéré : 20–52 pg/mL (4,5–12 pmol/L)']
    ], links: [] },
    ghrh: { cls: 'Neuropeptide', rows: [['Structure', '44 acides aminés'], ['Synthèse', 'Noyau arqué'], ['Récepteur', 'GHRH-R, Gs'], ['Effets', 'Sécrétion de GH']], links: [] },
    sst: { cls: 'Peptide cyclique', rows: [['Formule, masse', 'C₇₆H₁₀₄N₁₈O₁₉S₂ · 1 637,9 g/mol (somatostatine-14)'], ['Structure', '14 acides aminés, pont disulfure Cys3–Cys14'], ['Synthèse', 'Hypothalamus (noyau périventriculaire), cellules δ des îlots, tube digestif'], ['Demi-vie', '1 à 3 min'], ['Récepteurs', 'SST1 à SST5, Gi'], ['Effets', 'Freine GH, TSH, insuline, glucagon'], ['Pharmacologie', 'Octréotide, lanréotide, pasiréotide']], links: [pc(16129706)] },
    gh: { cls: 'Protéine (faisceau de 4 hélices)', rows: [
      ['Structure', '191 acides aminés, 2 ponts disulfure, ≈ 22 kDa (PDB 3HHR)'],
      ['Synthèse', 'Cellules somatotropes (≈ 50 % de l\'antéhypophyse)'],
      ['Sécrétion', 'Pulsatile, surtout pendant le sommeil lent profond'],
      ['Transport', 'GHBP (fragment du récepteur), ≈ 50 %'],
      ['Demi-vie', '≈ 20 min'],
      ['Récepteur', 'GHR, cytokine de classe I : dimère préformé, activé par la liaison d\'une molécule de GH (sites 1 et 2) qui change sa conformation → JAK2/STAT5 (Brooks, Science 2014)'],
      ['Effets', 'IGF-1 hépatique, croissance, lipolyse ; hyperglycémiante'],
      ['Dosage', 'GH ponctuelle peu informative ; nadir sous HGPO ; tests de stimulation'],
      ['Pharmacologie', 'Somatropine ; pegvisomant (antagoniste du récepteur)']
    ], links: [pdb('3HHR'), pdb101('growth hormone')] },
    igf1: { cls: 'Protéine (famille de l\'insuline)', rows: [
      ['Structure', '70 acides aminés, 3 ponts disulfure, ≈ 7,6 kDa (PDB 1GZR)'],
      ['Synthèse', 'Foie (sous GH), production locale tissulaire'],
      ['Transport', 'Complexe ternaire IGFBP-3 + ALS (> 75 %)'],
      ['Demi-vie', '≈ 12 à 15 h dans le complexe ternaire'],
      ['Récepteur', 'IGF1R, tyrosine kinase'],
      ['Dosage', 'Interprété selon l\'âge et le sexe ; élevée dans l\'acromégalie']
    ], links: [pdb('1GZR')] },
    dopa: { cls: 'Catécholamine', rows: [
      ['Formule, masse', 'C₈H₁₁NO₂ · 153,2 g/mol'],
      ['Synthèse', 'Tyrosine → L-DOPA (tyrosine hydroxylase) → dopamine (décarboxylase)'],
      ['Origine endocrine', 'Neurones tubéro-infundibulaires (noyau arqué)'],
      ['Récepteur', 'D2 des cellules lactotropes, Gi'],
      ['Effets', 'Tonus inhibiteur permanent sur la prolactine'],
      ['Pharmacologie', 'Agonistes (cabergoline, bromocriptine) ; antagonistes (neuroleptiques, métoclopramide) → hyperprolactinémie']
    ], links: [pc(681)] },
    prl: { cls: 'Protéine (faisceau de 4 hélices)', rows: [
      ['Structure', '199 acides aminés, 3 ponts disulfure, ≈ 23 kDa (PDB 1RW5)'],
      ['Formes', 'Monomérique ; big-big prolactine (macroprolactine, complexe avec IgG) peu active'],
      ['Synthèse', 'Cellules lactotropes'],
      ['Demi-vie', '≈ 20 à 30 min'],
      ['Récepteur', 'PRLR, cytokine de classe I, JAK2/STAT5'],
      ['Effets', 'Lactation ; en excès, inhibe la GnRH'],
      ['Dosage', '< 25 ng/mL ; > 200 ng/mL évoque un macroadénome à prolactine']
    ], links: [pdb('1RW5')] },
    adh: { cls: 'Nonapeptide', rows: [
      ['Formule, masse', 'C₄₆H₆₅N₁₅O₁₂S₂ · 1 084,2 g/mol (arginine-vasopressine)'],
      ['Structure', 'Cycle de 6 résidus fermé par un pont disulfure + queue de 3 ; C-terminal amidé'],
      ['Synthèse', 'Noyaux supraoptiques et paraventriculaires ; transport axonal avec la neurophysine II ; libérée par la posthypophyse'],
      ['Demi-vie', '≈ 10 à 20 min'],
      ['Récepteurs', 'V2 (rein, Gs → aquaporine 2), V1a (vaisseaux), V1b (hypophyse)'],
      ['Dosage', 'Instable : on dose la copeptine (même précurseur)'],
      ['Pharmacologie', 'Desmopressine (agoniste V2) ; tolvaptan (antagoniste V2)']
    ], links: [pc(8230)] },
    oxy: { cls: 'Nonapeptide', rows: [['Formule, masse', 'C₄₃H₆₆N₁₂O₁₂S₂ · 1 007,2 g/mol'], ['Structure', 'Proche de l\'ADH (2 acides aminés diffèrent)'], ['Synthèse', 'Noyaux paraventriculaires et supraoptiques ; libérée par la posthypophyse'], ['Effets', 'Contraction utérine, éjection du lait']], links: [pc(439302)] },
    gnrh: { cls: 'Décapeptide', rows: [
      ['Formule, masse', 'C₅₅H₇₅N₁₇O₁₃ · 1 182,3 g/mol (gonadoréline)'],
      ['Structure', 'pGlu-His-Trp-Ser-Tyr-Gly-Leu-Arg-Pro-Gly-NH₂'],
      ['Sécrétion', 'Pulsatile (≈ toutes les 60 à 120 min) ; l\'administration continue désensibilise'],
      ['Demi-vie', '2 à 4 min'],
      ['Récepteur', 'GnRH-R, Gq'],
      ['Pharmacologie', 'Agonistes (désensibilisation : cancer de prostate, puberté précoce) ; antagonistes']
    ], links: [pc(638793)] },
    kiss: { cls: 'Neuropeptide', rows: [['Formes', 'Kisspeptines 54, 14, 13, 10 (même extrémité C-terminale active)'], ['Synthèse', 'Noyau arqué, aire préoptique'], ['Récepteur', 'KISS1R (GPR54), Gq'], ['Effets', 'Puissants activateurs des neurones à GnRH ; indispensables à la puberté']], links: [] },
    lh: { cls: 'Glycoprotéine hétérodimérique', rows: [
      ['Structure', 'Sous-unité α commune (92 acides aminés) + β spécifique (121 acides aminés)'],
      ['Homologie', 'La hCG partage la sous-unité α et le récepteur (β de 145 acides aminés, PDB 1HRP)'],
      ['Synthèse', 'Cellules gonadotropes, pulsatile'],
      ['Demi-vie', '≈ 20 à 30 min'],
      ['Récepteur', 'LHCGR (RCPG), Gs'],
      ['Effets', 'Leydig : testostérone ; thèque : androgènes ; pic → ovulation, corps jaune']
    ], links: [pdb('1HRP')] },
    fsh: { cls: 'Glycoprotéine hétérodimérique', rows: [
      ['Structure', 'Sous-unité α commune (92 acides aminés) + β de 111 acides aminés (PDB 4AY9)'],
      ['Demi-vie', 'Quelques heures (plus glycosylée que la LH)'],
      ['Récepteur', 'FSHR (RCPG), Gs'],
      ['Effets', 'Sertoli : spermatogenèse, inhibine B ; granulosa : croissance folliculaire, aromatase'],
      ['Régulation', 'Freinée sélectivement par l\'inhibine B']
    ], links: [pdb('4AY9')] },
    inhib: { cls: 'Glycoprotéine dimérique (famille TGF-β)', rows: [['Structure', 'Sous-unité α + sous-unité βA (inhibine A) ou βB (inhibine B), reliées par un pont disulfure'], ['Synthèse', 'Sertoli (homme), granulosa (femme)'], ['Effets', 'Freine la FSH au niveau hypophysaire'], ['Dosage', 'Inhibine B : marqueur de la spermatogenèse et de la réserve ovarienne']], links: [] },

    /* ---------------- Phosphocalcique ---------------- */
    pth: { cls: 'Peptide', rows: [
      ['Structure', '84 acides aminés ; activité dans le fragment 1-34 (tériparatide, PDB 1ET1)'],
      ['Synthèse', 'Cellules principales des parathyroïdes ; pré-pro-PTH'],
      ['Demi-vie', '2 à 4 min'],
      ['Récepteur', 'PTH1R (os, rein), Gs et Gq'],
      ['Régulation', 'Freinée par le calcium via le CaSR, par le calcitriol ; stimulée par le phosphate'],
      ['Dosage', '≈ 15–65 pg/mL, à interpréter avec la calcémie'],
      ['Pharmacologie', 'Tériparatide ; calcimimétiques (cinacalcet)']
    ], links: [pdb('1ET1')] },
    ca: { cls: 'Cation divalent', rows: [
      ['Formule, masse', 'Ca²⁺ · 40,08 g/mol'],
      ['Répartition', '99 % dans l\'os ; plasma : 50 % ionisé, 50 % lié à l\'albumine (polycopié) ; en réalité ≈ 50 % ionisé, ≈ 40 % lié aux protéines, ≈ 10 % complexé (complément)'],
      ['Valeurs', 'Calcémie totale 2,20–2,60 mmol/L ; ionisée 1,15–1,30 mmol/L'],
      ['Capteur', 'CaSR (parathyroïde, anse de Henlé)'],
      ['Conversion', '1 mmol/L = 40 mg/L']
    ], links: [pc(271)] },
    calcitonin: { cls: 'Peptide', rows: [['Structure', '32 acides aminés, pont disulfure Cys1–Cys7 (complément)'], ['Synthèse', 'Cellules C (parafolliculaires) de la thyroïde'], ['Effets', 'Freine la résorption osseuse par les ostéoclastes : effet hypocalcémiant, mineur chez l\'homme (complément)'], ['Dosage', 'Marqueur du cancer médullaire de la thyroïde']], links: [] },
    angio1: { cls: 'Décapeptide (complément)', rows: [['Structure', 'Asp-Arg-Val-Tyr-Ile-His-Pro-Phe-His-Leu'], ['Formation', 'Clivage de l\'angiotensinogène (foie) par la rénine, dans le plasma'], ['Devenir', 'Converti en angiotensine II par l\'enzyme de conversion, surtout pulmonaire'], ['Activité', 'Peu active par elle-même']], links: [] },

    /* ---------------- SRAA ---------------- */
    renin: { cls: 'Enzyme (aspartyl-protéase)', rows: [['Structure', '≈ 340 acides aminés, deux lobes, site actif à deux aspartates (PDB 2REN)'], ['Synthèse', 'Cellules juxtaglomérulaires'], ['Substrat', 'Angiotensinogène → angiotensine I'], ['Stimuli', 'Baisse de la perfusion rénale, de la charge sodée à la macula densa, stimulation β1'], ['Dosage', 'Rénine active (concentration) ou activité rénine plasmatique'], ['Pharmacologie', 'Aliskiren (inhibiteur direct)']], links: [pdb('2REN')] },
    angio: { cls: 'Octapeptide', rows: [['Formule, masse', 'C₅₀H₇₁N₁₃O₁₂ · 1 046,2 g/mol'], ['Structure', 'Asp-Arg-Val-Tyr-Ile-His-Pro-Phe'], ['Formation', 'Angiotensine I (10 acides aminés) → angiotensine II par l\'enzyme de conversion'], ['Demi-vie', '< 1 min (≈ 15 à 60 s)'], ['Récepteur', 'AT1 (Gq) : vasoconstriction, aldostérone, soif, ADH'], ['Pharmacologie', 'IEC ; ARA2 (sartans)']], links: [pc(172198)] },
    k: { cls: 'Cation', rows: [['Formule, masse', 'K⁺ · 39,1 g/mol'], ['Valeurs', 'Kaliémie 3,5–5,0 mmol/L'], ['Lien endocrine', 'Stimule l\'aldostérone ; l\'aldostérone augmente son excrétion urinaire']], links: [pc(813)] },
    nai: { cls: 'Cation', rows: [['Formule, masse', 'Na⁺ · 23,0 g/mol'], ['Valeurs', 'Natrémie 135–145 mmol/L'], ['Lien endocrine', 'Réabsorbé sous aldostérone (ENaC) ; la natrémie reflète surtout le bilan de l\'eau (ADH)']], links: [pc(923)] },
    na: { cls: 'Cation', rows: [['Formule, masse', 'Na⁺ · 23,0 g/mol'], ['Rôle', 'Cotransporté avec l\'iodure par le NIS (2 Na⁺ / 1 I⁻)']], links: [pc(923)] },
    water: { cls: 'Solvant', rows: [['Formule, masse', 'H₂O · 18,0 g/mol'], ['Lien endocrine', 'Réabsorption de l\'eau libre par l\'aquaporine 2 sous ADH']], links: [pc(962)] },

    /* ---------------- Médullosurrénale ---------------- */
    adre: { cls: 'Catécholamine', rows: [['Formule, masse', 'C₉H₁₃NO₃ · 183,2 g/mol'], ['Synthèse', 'Noradrénaline → adrénaline par la PNMT (induite par le cortisol)'], ['Origine', 'Essentiellement médullosurrénalienne (80 à 95 % de la sécrétion médullaire)'], ['Demi-vie', '2 à 3 min'], ['Récepteurs', 'α et β adrénergiques'], ['Métabolites', 'Métanéphrine (COMT), acide vanylmandélique'], ['Dosage', 'Métanéphrines plasmatiques ou urinaires']], links: [pc(5816)] },
    nora: { cls: 'Catécholamine', rows: [['Formule, masse', 'C₈H₁₁NO₃ · 169,2 g/mol'], ['Synthèse', 'Dopamine → noradrénaline (dopamine β-hydroxylase, dans les granules)'], ['Origine', 'Terminaisons sympathiques surtout ; 10 à 20 % de la sécrétion médullosurrénalienne'], ['Récepteurs', 'α surtout, β1'], ['Métabolite', 'Normétanéphrine']], links: [pc(439260)] },

    /* ---------------- Métabolisme glucidique ---------------- */
    insulin: { cls: 'Hormone peptidique (deux chaînes)', rows: [
      ['Structure', 'Chaîne A (21 acides aminés) + chaîne B (30) ; 2 ponts disulfure interchaînes + 1 intrachaîne A (PDB 4INS, insuline porcine qui diffère de l\'humaine en B30)'],
      ['Masse', '≈ 5,8 kDa'],
      ['Synthèse', 'Cellules β : pré-pro-insuline → pro-insuline → insuline + peptide C (équimolaire)'],
      ['Stockage', 'Hexamères avec le zinc dans les granules'],
      ['Demi-vie', '4 à 6 min'],
      ['Récepteur', 'Récepteur tyrosine kinase → IRS, PI3K/Akt (GLUT4)'],
      ['Dosage', 'Insulinémie, peptide C (reflète la sécrétion endogène)'],
      ['Pharmacologie', 'Insulines rapides, lentes ; analogues']
    ], links: [pdb('4INS'), pdb101('insulin')] },
    glucagon: { cls: 'Peptide', rows: [['Structure', '29 acides aminés, hélice (PDB 1GCN)'], ['Masse', '3,5 kDa'], ['Synthèse', 'Cellules α ; proglucagon (qui donne le GLP-1 dans l\'intestin)'], ['Demi-vie', '≈ 5 min'], ['Récepteur', 'GCGR, Gs (foie)'], ['Effets', 'Glycogénolyse, néoglucogenèse, cétogenèse'], ['Pharmacologie', 'Glucagon en urgence pour l\'hypoglycémie sévère']], links: [pdb('1GCN')] },
    glucose: { cls: 'Ose (hexose)', rows: [['Formule, masse', 'C₆H₁₂O₆ · 180,2 g/mol'], ['Forme', 'Pyranose (cycle à 6 dont 1 oxygène), majoritairement β'], ['Valeurs', 'À jeun 0,80–1,10 g/L ; diabète ≥ 1,26 g/L ; hypoglycémie < 0,50 g/L (< 0,70 chez le diabétique)'], ['Conversion', '1 g/L ≈ 5,5 mmol/L'], ['Transporteurs', 'GLUT1-4 (GLUT4 insulinodépendant), SGLT1-2']], links: [pc(5793)] },
    ffa: { cls: 'Acide gras', rows: [['Exemple', 'Acide palmitique C₁₆H₃₂O₂ · 256,4 g/mol'], ['Origine', 'Lipolyse du tissu adipeux (freinée par l\'insuline)'], ['Devenir', 'β-oxydation, cétogenèse hépatique']], links: [pc(985)] },
    ketone: { cls: 'Corps cétonique', rows: [['Exemple', 'Acétoacétate (acide acétoacétique C₄H₆O₃ · 102,1 g/mol) ; β-hydroxybutyrate'], ['Origine', 'Foie, à partir de l\'acétyl-CoA'], ['Valeurs', 'Cétonémie < 0,6 mmol/L ; acidocétose au-delà de 3 mmol/L (complément)']], links: [pc(96)] },

    /* ---------------- Lipides ---------------- */
    chol: { cls: 'Stérol', rows: [['Formule, masse', 'C₂₇H₄₆O · 386,7 g/mol ; XLogP 8,7'], ['Rôle', 'Membranes ; précurseur des stéroïdes, de la vitamine D et des acides biliaires'], ['Synthèse', 'Voie de l\'HMG-CoA réductase (cible des statines)']], links: [pc(5997)] },
    chylo: { cls: 'Lipoprotéine', rows: [['Taille', '75 à 1 200 nm'], ['Composition', '85–90 % de triglycérides alimentaires ; apoB48'], ['Origine', 'Entérocyte → lymphe'], ['Devenir', 'Lipoprotéine lipase → remnants captés par le foie']], links: [] },
    vldl: { cls: 'Lipoprotéine', rows: [['Composition', 'Riches en triglycérides endogènes ; apoB100'], ['Origine', 'Foie'], ['Devenir', 'VLDL → IDL → LDL']], links: [] },
    ldl: { cls: 'Lipoprotéine', rows: [['Taille', '≈ 22 nm'], ['Composition', 'Cœur d\'esters de cholestérol ; une apoB100'], ['Rôle', 'Transporteur majoritaire du cholestérol'], ['Captation', 'Récepteur des LDL (70 % hépatiques)'], ['Dosage', 'LDL-c calculé (Friedewald) ou mesuré']], links: [] },
    hdl: { cls: 'Lipoprotéine', rows: [['Taille', '≈ 8 à 12 nm'], ['Composition', 'ApoA-I'], ['Rôle', 'Retour du cholestérol vers le foie ; anti-athérogènes'], ['Dosage', 'HDL-c > 0,40 g/L']], links: [] },
    pcsk9: { cls: 'Protéase (proprotéine convertase)', rows: [['Structure', 'Prodomaine + domaine catalytique + domaine C-terminal (PDB 2P4E)'], ['Rôle', 'Fixe le récepteur des LDL et l\'oriente vers le lysosome'], ['Génétique', 'Mutations gain de fonction : hypercholestérolémie familiale ; perte de fonction : LDL bas'], ['Pharmacologie', 'Anticorps anti-PCSK9 (évolocumab, alirocumab), inclisiran']], links: [pdb('2P4E')] },
    ldlr: { cls: 'Récepteur membranaire', rows: [['Structure', 'Domaine de liaison (7 répétitions LA), domaine homologue de l\'EGF, β-propeller (PDB 1N7D)'], ['Ligands', 'ApoB100 (LDL), apoE'], ['Cycle', 'Endocytose, libération du LDL à pH acide, recyclage ou dégradation (PCSK9)'], ['Régulation', 'SREBP-2 : augmente quand le cholestérol cellulaire baisse (statines)']], links: [pdb('1N7D')] },
    mrna: { cls: 'Acide nucléique', rows: [['Rôle', 'Transcrit des gènes cibles de la T3 (Na⁺/K⁺-ATPase, UCP1, α-MHC, SERCA2, récepteur des LDL…)']], links: [] }
  };
  HV.MOL_SHEETS.tgi = HV.MOL_SHEETS.tg;
})();
