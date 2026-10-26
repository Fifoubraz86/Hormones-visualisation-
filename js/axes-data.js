/*
 * Axes et boucles de régulation tirés du Polycopié de sémiologie endocrinienne du CEEDMM
 * (2e édition, 2023, parties 1 et 2). Les rares compléments de physiologie classique absents
 * du polycopié sont signalés « (complément) » dans les fiches.
 */
(function () {
  'use strict';
  const HV = window.HV;
  const R = HV.rhythm;
  const n2 = (v) => v.toFixed(2).replace('.', ',');

  /* Couleur de chaque molécule (jetons de la palette) */
  HV.MOLC = {
    crh: 'p-orange', acth: 'p-orange2', cortisol: 'p-gold', dhea: 'p-sky', ghrh: 'p-sky', sst: 'p-grey', gh: 'p-sky', igf1: 'p-blue',
    dopa: 'p-grey', prl: 'p-magenta', trh: 'trh', adh: 'p-sky', oxy: 'p-rose', water: 'p-sky', gnrh: 'p-violet', kiss: 'p-magenta',
    lh: 'p-violet', fsh: 'p-rose', testo: 'p-blue', e2: 'p-rose', prog: 'p-violet', inhib: 'p-brown', pth: 'p-green', calcitriol: 'p-amber',
    ca: 'p-green', renin: 'p-red', angio: 'p-red', aldo: 'p-teal', k: 'p-violet', nai: 'p-amber', adre: 'p-red', nora: 'p-red2',
    insulin: 'p-blue2', glucagon: 'p-orange', glucose: 'p-lime', ffa: 'p-amber', ketone: 'p-red2', chylo: 'p-amber', vldl: 'p-gold',
    ldl: 'p-orange', hdl: 'p-teal', chol: 'p-gold', pcsk9: 'p-magenta', ldlr: 'p-teal', t4: 't4', t3: 't3', dot: 'accent',
    angio1: 'p-red', calcitonin: 'tg',
    gastrin: 'p-red2', cck: 'p-gold', secretin: 'p-teal', vip: 'p-magenta', ppol: 'p-violet', hplus: 'p-red', hco3: 'p-sky', enzyme: 'p-amber'
  };

  /* Fiches des hormones (d'après le polycopié) */
  Object.assign(HV.INFO, {
    crh: { t: 'CRH', k: 'Corticolibérine · peptide de 41 acides aminés (complément)', d: 'Sécrétée par l\'hypothalamus, elle stimule les cellules corticotropes à sécréter l\'ACTH. Freinée par le cortisol.' },
    acth: { t: 'ACTH', k: 'Corticotrophine · 39 acides aminés (complément), issue de la POMC', d: 'Stimule la sécrétion de cortisol et d\'androgènes surrénaliens : augmente StAR, puis les enzymes P450 ; en excès chronique, hyperplasie surrénalienne. Rythme circadien, pic le matin. Sa sécrétion augmente avec certaines molécules de l\'inflammation. L\'α-MSH, issue du même précurseur, explique la mélanodermie de l\'insuffisance surrénale périphérique.' },
    cortisol: { t: 'Cortisol', k: 'Principal glucocorticoïde · zone fasciculée', d: 'Néoglucogenèse (hyperglycémiant), catabolisme protidique, lipogenèse viscérale et facio-tronculaire, inhibition de l\'ADH, effet anti-inflammatoire, tonus vasculaire, effet minéralocorticoïde à forte dose. Rétrocontrôle négatif sur la CRH et l\'ACTH. Pic en début de matinée, nadir le soir.' },
    fig26: { t: 'Figure 26 · Stéroïdogenèse surrénalienne', k: 'Polycopié, partie 1, p. 71', d: 'Du cholestérol à l\'aldostérone (zone glomérulée), au cortisol (zone fasciculée) et aux androgènes (zone réticulée). Un bloc en 21-hydroxylase arrête la voie du cortisol et de l\'aldostérone : la 17-OHP s\'accumule et part vers les androgènes. Clic : agrandir la figure ; la loupe « Stéroïdogenèse » anime les blocs.' },
    dhea: { t: 'DHEA, DHEA-S', k: 'Androgènes surrénaliens · zone réticulée', d: 'Avec l\'androstènedione. Production dépendante de l\'ACTH (p. 73) ; pas de rétrocontrôle sur l\'axe, contrairement au cortisol (p. 48).' },
    ghrh: { t: 'GHRH', k: 'Somatolibérine', d: 'Stimule les cellules somatotropes à sécréter la GH.' },
    sst: { t: 'Somatostatine', k: 'Peptide cyclique inhibiteur', d: 'Freine la sécrétion de GH, et aussi celle de TSH. Les analogues de la somatostatine traitent l\'acromégalie.' },
    gh: { t: 'GH', k: 'Hormone de croissance · faisceau de 4 hélices', d: 'Sécrétion pulsatile, surtout la nuit. Stimule la production hépatique d\'IGF-1. Hyperglycémiante : sécrétée lors de l\'hypoglycémie. Normalement freinée par l\'HGPO (seuil d\'absence de freination : GH ≥ 0,4 ng/mL).' },
    igf1: { t: 'IGF-1', k: 'Insulin-like growth factor 1', d: 'Produite par le foie sous l\'effet de la GH. En excès, rétrocontrôle négatif sur la GH et la GHRH. Une IGF-1 élevée confirme l\'acromégalie.' },
    dopa: { t: 'Dopamine', k: 'Catécholamine hypothalamique', d: 'Tonus inhibiteur permanent sur la prolactine. Sa levée (compression ou section de la tige) donne une hyperprolactinémie de déconnexion. Précurseur de la noradrénaline dans la médullosurrénale.' },
    prl: { t: 'Prolactine', k: 'Sous tonus inhibiteur dopaminergique permanent', d: 'Stimulée par la TRH et les œstrogènes (grossesse). En excès, elle inhibe la pulsatilité de la GnRH : insuffisance gonadotrope fonctionnelle. > 200 ng/mL : évoque un macroadénome à prolactine.' },
    adh: { t: 'ADH · vasopressine', k: 'Nonapeptide (complément), noyaux supraoptiques et paraventriculaires', d: 'Transportée le long des axones de la tige et stockée dans la posthypophyse. Se lie au récepteur V2 du tubule rénal : réabsorption d\'eau par les aquaporines. Puissant vasopresseur en cas de chute brutale de la pression artérielle. Freinée par le cortisol.' },
    oxy: { t: 'Ocytocine', k: 'Nonapeptide (complément), posthypophysaire', d: 'Synthétisée dans les mêmes noyaux hypothalamiques que l\'ADH et libérée par la posthypophyse. Contraction utérine et éjection du lait (complément).' },
    water: { t: 'Eau libre', k: 'Réabsorbée sous ADH', d: 'Diabète insipide : polyurie > 3 L/24 h, urines diluées (osmolalité < 200 mosmol/kg). SIADH : rétention d\'eau et hyponatrémie, souvent < 120 mmol/L.' },
    gnrh: { t: 'GnRH', k: 'Gonadolibérine · décapeptide pulsatile', d: 'La pulsatilité est indispensable à la sécrétion de LH et de FSH. Réactivation progressive à la puberté (fréquence et amplitude des pics de LH). Modulée par la kisspeptine, le GABA, le glutamate ; effet permissif de la leptine.' },
    kiss: { t: 'Kisspeptines', k: 'Neurones afférents', d: 'Stimulent les neurones à GnRH. Le GABA et le glutamate sont des influences distinctes, portées par d\'autres neurones (polycopié, partie 2, p. 3).' },
    lh: { t: 'LH · structure illustrée par l\'hCG (PDB 1HRP)', k: 'Hormone lutéinisante · glycoprotéine α/β · la β tracée est celle de l\'hCG (145 acides aminés, contre 121 pour la LH)', d: 'Homme : stimule les cellules de Leydig (testostérone). Femme : stimule la synthèse d\'androgènes par la thèque interne ; le pic de LH déclenche l\'ovulation à J14.' },
    fsh: { t: 'FSH', k: 'Folliculostimuline · glycoprotéine α/β', d: 'Homme : stimule les cellules de Sertoli et la spermatogenèse. Femme : sélection et croissance folliculaire, aromatisation des androgènes en estradiol par la granulosa.' },
    testo: { t: 'Testostérone', k: 'Stéroïde · cellules de Leydig', d: 'Spermatogenèse, virilisation, libido, effet anabolisant musculaire, préservation de la masse osseuse, répartition androïde des graisses, pilosité et sébum, érythropoïèse. Rétrocontrôle négatif hypothalamo-hypophysaire.' },
    e2: { t: 'Estradiol (E2)', k: 'Stéroïde · granulosa, puis corps jaune', d: 'Endomètre, glaire perméable aux spermatozoïdes, effet trophique sur vagin et seins, HDL ↑, masse osseuse, répartition gynoïde. Effet diphasique sur l\'hypophyse : stimule LH et FSH en milieu de cycle (ovulation), les inhibe le reste du temps.' },
    prog: { t: 'Progestérone', k: 'Stéroïde · corps jaune (phase lutéale)', d: 'Transforme l\'endomètre pour la nidation, diminue la contractilité du myomètre, rend la glaire infranchissable, effet trophique sur vagin et seins.' },
    inhib: { t: 'Inhibine B', k: 'Sertoli (homme) · cellules folliculaires (femme)', d: 'Rétrocontrôle négatif sur la FSH, essentiellement au niveau hypophysaire.' },
    pth: { t: 'PTH', k: 'Parathormone · 84 acides aminés', d: 'Rein : réabsorption du calcium (anse de Henlé, tube contourné distal) et 1α-hydroxylation de la 25-OH-vitamine D en calcitriol. Os : active les ostéocytes, libération rapide de calcium, stimule la résorption. Sa sécrétion est freinée par le calcium via le CaSR.' },
    calcitriol: { t: '1,25-(OH)₂-vitamine D', k: 'Calcitriol · sécostéroïde actif', d: 'Stimule l\'absorption digestive active du calcium (voie transcellulaire) et la réabsorption rénale au tube contourné distal.' },
    ca: { t: 'Calcium ionisé', k: 'Ca²⁺ · 1,15–1,30 mmol/L', d: 'Calcémie totale 2,20–2,60 mmol/L : 50 % ionisés, 50 % liés à l\'albumine selon le polycopié (en réalité ≈ 40 % liés aux protéines et ≈ 10 % complexés, complément). Calcémie corrigée = Ca mesurée + 0,025 × (40 − albumine en g/L). 99 % du calcium est osseux (complément). Active le CaSR de la parathyroïde et de l\'anse de Henlé.' },
    renin: { t: 'Rénine', k: 'Enzyme de l\'appareil juxtaglomérulaire', d: 'Déclenche la cascade aboutissant à l\'angiotensine II.' },
    angio1: { t: 'Angiotensine I', k: 'Décapeptide (complément)', d: 'Formée dans le plasma par la rénine, qui clive l\'angiotensinogène d\'origine hépatique ; convertie en angiotensine II par l\'enzyme de conversion, surtout pulmonaire (complément).' },
    calcitonin: { t: 'Calcitonine', k: 'Peptide de 32 acides aminés · cellules C', d: 'Sécrétée par les cellules C parafolliculaires de la thyroïde (polycopié). Complément : freine la résorption osseuse par les ostéoclastes (effet hypocalcémiant, mineur chez l\'homme). Marqueur du cancer médullaire de la thyroïde.' },
    angio: { t: 'Angiotensine II', k: 'Octapeptide', d: 'Se lie à ses récepteurs dans la zone glomérulée et stimule la libération d\'aldostérone. Vasoconstricteur (complément).' },
    aldo: { t: 'Aldostérone', k: 'Minéralocorticoïde · zone glomérulée (aldostérone synthase)', d: 'Au tube contourné distal et au canal collecteur : réabsorption du sodium, excrétion du potassium et des ions H⁺. Régulée par le SRAA et la kaliémie.' },
    k: { t: 'Potassium', k: 'K⁺', d: 'Une kaliémie élevée stimule la sécrétion d\'aldostérone ; l\'aldostérone augmente l\'excrétion urinaire de K⁺.' },
    nai: { t: 'Sodium', k: 'Na⁺', d: 'Réabsorbé sous l\'effet de l\'aldostérone : rétention hydrosodée et régulation de la pression artérielle.' },
    adre: { t: 'Adrénaline', k: 'Essentiellement d\'origine médullosurrénalienne', d: 'Formée à partir de la noradrénaline par la PNMT. Réaction de combat ou de fuite : fréquence cardiaque et pression artérielle ↑, vasoconstriction. Hyperglycémiante (contre-régulation de l\'hypoglycémie).' },
    nora: { t: 'Noradrénaline', k: 'Surtout issue des terminaisons sympathiques', d: 'Dérivée de la dopamine. Agit sur les récepteurs adrénergiques. 10 à 20 % de la sécrétion médullosurrénalienne (l\'adrénaline en fait 80 à 95 %).' },
    insulin: { t: 'Insuline', k: 'Cellules β · chaînes A et B reliées par des ponts disulfure', d: 'Hypoglycémiante : captation du glucose par le muscle et le tissu adipeux (GLUT4), freine la production hépatique de glucose. Hormone de stockage : freine la lipolyse et la protéolyse. Prédomine en journée et après les repas.' },
    glucagon: { t: 'Glucagon', k: 'Cellules α', d: 'Hyperglycémiant : mobilise les réserves (glycogénolyse, néoglucogenèse hépatiques). Prédomine la nuit et au jeûne. Sécrété lors d\'une hypoglycémie (réponse perdue dans le diabète de type 1).' },
    glucose: { t: 'Glucose', k: 'Principal substrat énergétique', d: 'Glycémie à jeun normale 0,80–1,10 g/L ; diabète ≥ 1,26 g/L à deux reprises. Réabsorbé en totalité par SGLT2 au tube proximal ; glycosurie au-delà de 1,80 g/L. Hypoglycémie : < 0,50 g/L hors diabète, < 0,70 g/L chez le diabétique.' },
    ffa: { t: 'Acides gras libres', k: 'Lipolyse', d: 'Libérés par le tissu adipeux quand l\'insuline est basse (jeûne prolongé) ; convertis en acétyl-CoA par le foie.' },
    ketone: { t: 'Corps cétoniques', k: 'Cétogenèse hépatique', d: 'Limitée en présence d\'insuline (cétose de jeûne). En carence en insuline, la cétogenèse s\'emballe : acidocétose.' },
    chylo: { t: 'Chylomicrons', k: '85 à 90 % de triglycérides', d: 'Synthétisés par l\'entérocyte à partir des lipides alimentaires, sécrétés dans la lymphe. Hydrolysés par la lipoprotéine lipase ; les remnants sont captés par le foie.' },
    vldl: { t: 'VLDL', k: 'Riches en triglycérides', d: 'Sécrétées par l\'hépatocyte, transformées en IDL par la lipoprotéine lipase, puis en LDL (lipase hépatique).' },
    ldl: { t: 'LDL', k: 'Transporteur majoritaire du cholestérol · apoB100', d: 'Captées via le récepteur des LDL (70 % hépatique). Le cholestérol internalisé freine l\'HMG-CoA réductase et l\'expression du récepteur.' },
    hdl: { t: 'HDL', k: 'Retour du cholestérol vers le foie', d: 'Synthétisées par le foie, elles captent le cholestérol des tissus. Anti-athérogènes : anti-inflammatoires, antioxydantes, vasodilatatrices.' },
    chol: { t: 'Cholestérol', k: 'Précurseur des stéroïdes', d: 'Apporté par les LDL ou synthétisé dans le réticulum. Son transport mitochondrial par StAR est l\'étape limitante de la stéroïdogenèse.' },
    pcsk9: { t: 'PCSK9', k: 'Proprotéine convertase', d: 'Favorise la dégradation lysosomale du récepteur des LDL plutôt que son recyclage : moins de récepteurs, LDL plasmatique ↑.' },
    ldlr: { t: 'Récepteur des LDL', k: 'Recyclé ou dégradé', d: 'Reconnaît l\'apoB100. Après internalisation, il est recyclé vers la membrane ou dégradé dans les lysosomes.' }
  });

  const AX = [];

  /* ===================== Axe corticotrope ===================== */
  AX.push({
    id: 'cortico', card: { side: 'L', row: 1 }, color: 'p-gold', target: [761, 452],
    name: 'Axe corticotrope', sub: 'Hypothalamus · antéhypophyse · corticosurrénale', clock: 'day',
    hh: { x: 280, y: 341, s: 1.8, flip: true, inset: { cx: 300, cy: 480, r: 235 } },
    clockInfo: 'Le cortisol est le plus élevé en début de matinée et le plus bas le soir, du fait du rythme circadien de l\'ACTH.',
    lead: 'La CRH hypothalamique stimule la sécrétion d\'ACTH, qui stimule la production de cortisol (et d\'androgènes) par la corticosurrénale. Le cortisol, et non les androgènes, freine en retour la CRH et l\'ACTH.',
    points: ['Rythme circadien : pic de cortisol le matin, nadir le soir (horloge à côté du titre).', 'L\'inflammation augmente la sécrétion d\'ACTH.', 'Exploration : cortisol à 8 h, test au Synacthène, freinage minute à la dexaméthasone, cortisol libre urinaire ou salivaire à minuit.', 'L\'excès chronique d\'ACTH entraîne une hyperplasie surrénalienne.'],
    nodes: [
      { id: 'hypo', at: 'hypo', leader: true, lx: 290, ly: -14, label: 'Hypothalamus', sub: 'noyau paraventriculaire : CRH', color: 'p-orange', info: 'Les neurones hypothalamiques libèrent la CRH dans le système porte.' },
      { id: 'pit', at: 'ant', leader: true, lx: 250, ly: 14, label: 'Antéhypophyse', sub: 'cellules corticotropes', color: 'p-orange2', info: 'Les cellules corticotropes sécrètent l\'ACTH (et l\'α-MSH, issue de la POMC).' },
      { id: 'adr', zoom: 'surrenale', x: 930, y: 380, organ: 'adrenalKidney', label: 'Corticosurrénale', sub: ['zone fasciculée : cortisol', 'zone réticulée : androgènes'], color: 'p-gold', info: 'Zone fasciculée : 75 à 80 % du volume du cortex, cortisol. Zone réticulée : DHEA, DHEA-S, androstènedione.' },
      { id: 'liver', x: 1330, y: 240, organ: 'liver', s: 0.9, label: 'Foie', sub: 'néoglucogenèse', color: 'p-gold' },
      { id: 'muscle', x: 1330, y: 440, organ: 'muscle', s: 0.9, label: 'Muscle', sub: 'catabolisme protidique', color: 'p-gold' },
      { id: 'fat', x: 1330, y: 640, organ: 'fat', s: 0.9, label: 'Tissu adipeux', sub: 'lipogenèse viscérale', color: 'p-gold' },
      { id: 'inflam', x: 200, y: 795, label: 'Inflammation', color: 'bad', info: 'Certaines molécules de la réponse inflammatoire augmentent la sécrétion d\'ACTH : l\'axe interagit avec le système immunitaire.' },
      { id: 'andro', x: 930, y: 760, label: 'Androgènes surrénaliens', w: 280, sub: ['SDHEA, androstènedione', 'pas de rétrocontrôle'], color: 'p-sky', info: 'Les androgènes surrénaliens (DHEA, SDHEA, androstènedione) dépendent de l\'ACTH (polycopié p. 73) mais ne freinent pas l\'axe (p. 48). Ils baissent dans toutes les insuffisances surrénales et dans l\'adénome cortisolique ; ils augmentent dans le bloc en 21-hydroxylase.' }
    ],
    links: [
      { from: 'hypo', to: 'pit', kind: 'stim', mol: 'crh', mod: R.circadian, labelOff: 150 },
      { from: 'pit', to: 'adr', kind: 'stim', mol: 'acth', mod: R.circadian },
      { from: 'adr', to: 'liver', mol: 'cortisol', mod: R.circadian, rate: 1 },
      { from: 'adr', to: 'muscle', mol: 'cortisol', mod: R.circadian, rate: 1, label: '' },
      { from: 'adr', to: 'fat', mol: 'cortisol', mod: R.circadian, rate: 1, label: '' },
      { from: 'adr', to: 'pit', kind: 'inhib', mol: 'cortisol', bend: -110, mod: R.circadian, rate: 0.9, label: 'cortisol −', labelAt: 0.32 },
      { from: 'adr', to: 'hypo', kind: 'inhib', mol: 'cortisol', bend: -230, mod: R.circadian, rate: 0.9, label: '' },
      { from: 'inflam', to: 'pit', kind: 'stim', color: 'bad', info: 'cortico.inflam', label: 'cytokines' },
      { from: 'adr', to: 'andro', mol: 'dhea', rate: 1 }
    ],
    draw(a) {
      // Figure 26 du polycopié : la vraie planche, cliquable (agrandissement), avec un accès à la loupe détaillée.
      const g = a.el('g', { class: 'scinti fig-vign', transform: 'translate(1160 760)', 'data-figs': '26', 'data-info': 'fig26' });
      a.el('rect', { width: 340, height: 222, rx: 14, class: 'scinti-bg' }, g);
      a.text(14, 24, 'Stéroïdogenèse · figure 26', 'scinti-t', null, g);
      a.el('image', { x: 10, y: 32, width: 320, height: 182, href: HV.polyFig('26').src, preserveAspectRatio: 'xMidYMid meet' }, g);
    },
    levels: { x: 60, y: 912, w: 340, items: [{ label: 'ACTH', mol: 'acth', fn: R.circadian, max: 1.1 }, { label: 'Cortisol', mol: 'cortisol', fn: (T) => R.circadian({ h: T.h - 1 }), max: 1.1 }] }
  });

  /* ===================== Axe somatotrope ===================== */
  AX.push({
    id: 'somato', card: { side: 'L', row: 2 }, color: 'p-sky', target: [790, 198],
    name: 'Axe somatotrope', sub: 'Hypothalamus · antéhypophyse · foie', clock: 'day', startHour: 20,
    hh: { x: 280, y: 341, s: 1.8, flip: true, inset: { cx: 300, cy: 480, r: 235 } },
    clockInfo: 'La GH est sécrétée de façon pulsatile, particulièrement la nuit.',
    lead: 'La GHRH stimule et la somatostatine freine la sécrétion de GH. La GH, pulsatile et surtout nocturne, stimule la production hépatique d\'IGF-1, qui freine en retour la GH et la GHRH.',
    points: ['Les analogues de la somatostatine traitent l\'acromégalie.', 'Diagnostic de l\'acromégalie : IGF-1 élevée et absence de freination de la GH sous HGPO (GH ≥ 0,4 ng/mL).', 'La GH est l\'une des hormones de contre-régulation de l\'hypoglycémie.', 'Avant la soudure des cartilages, l\'excès de GH donne un gigantisme.'],
    nodes: [
      { id: 'hypo', at: 'hypo', leader: true, lx: 290, ly: -14, label: 'Hypothalamus', sub: 'GHRH (+) · somatostatine (−)', color: 'p-sky' },
      { id: 'pit', at: 'ant', leader: true, lx: 250, ly: 14, label: 'Antéhypophyse', sub: 'cellules somatotropes', color: 'p-sky' },
      { id: 'liver', x: 980, y: 380, organ: 'liver', label: 'Foie', sub: 'IGF-1', color: 'p-blue' },
      { id: 'bone', x: 1360, y: 260, organ: 'bone', s: 0.9, label: 'Cartilages de croissance', sub: 'croissance staturale', color: 'p-blue' },
      { id: 'muscle', x: 1360, y: 500, organ: 'muscle', s: 0.9, label: 'Muscles, viscères', sub: 'croissance tissulaire', color: 'p-blue' },
      { id: 'hypog', x: 230, y: 770, label: 'Hypoglycémie', color: 'p-lime', info: 'L\'hypoglycémie stimule la GH, en même temps que le glucagon et les catécholamines.' },
      { id: 'hgpo', x: 600, y: 770, label: 'Hyperglycémie (HGPO)', w: 270, color: 'p-lime', info: 'La charge en glucose freine normalement la GH : test dynamique de freination de l\'acromégalie.' }
    ],
    links: [
      { from: 'hypo', to: 'pit', kind: 'stim', mol: 'ghrh', bend: -50, mod: R.ghNight, labelOff: -150 },
      { from: 'hypo', to: 'pit', kind: 'inhib', mol: 'sst', bend: 50, rate: 0.8, labelOff: 150 },
      { from: 'pit', to: 'liver', kind: 'stim', mol: 'gh', mod: R.ghNight, rate: 2.2 },
      { from: 'liver', to: 'bone', mol: 'igf1' },
      { from: 'liver', to: 'muscle', mol: 'igf1', label: '' },
      { from: 'liver', to: 'pit', kind: 'inhib', mol: 'igf1', bend: -120, rate: 0.9, label: 'IGF-1 −', labelAt: 0.32 },
      { from: 'liver', to: 'hypo', kind: 'inhib', mol: 'igf1', bend: -240, rate: 0.9, label: '' },
      { from: 'hypog', to: 'pit', kind: 'stim', color: 'p-lime', label: '' },
      { from: 'hgpo', to: 'pit', kind: 'inhib', color: 'p-lime', label: '' }
    ],
    levels: { x: 1180, y: 830, w: 340, items: [{ label: 'GH', mol: 'gh', fn: R.ghNight, max: 1.6 }, { label: 'IGF-1', mol: 'igf1', fn: () => 1, max: 1.6 }] }
  });

  /* ===================== Axe lactotrope ===================== */
  AX.push({
    id: 'lacto', card: { side: 'L', row: 3 }, color: 'p-magenta', target: [764, 352],
    name: 'Axe lactotrope', sub: 'Hypothalamus · antéhypophyse · glande mammaire',
    hh: { x: 280, y: 341, s: 1.8, flip: true, inset: { cx: 300, cy: 480, r: 235 } },
    lead: 'La prolactine est la seule hormone antéhypophysaire freinée en permanence : la dopamine hypothalamique exerce un tonus inhibiteur. TRH et œstrogènes la stimulent. Il n\'y a pas de boucle de rétrocontrôle hormonal comme dans les quatre autres axes.',
    points: ['Une section ou une compression de la tige lève le frein dopaminergique : hyperprolactinémie de déconnexion (prolactine en général < 200 ng/mL).', 'Prolactine > 200 ng/mL : évoque un macroadénome à prolactine.', 'L\'hyperprolactinémie inhibe la pulsatilité de la GnRH : aménorrhée, insuffisance gonadotrope fonctionnelle.', 'Écarter les causes connues : grossesse, allaitement, médicaments (psychotropes), toxiques, hypothyroïdie profonde, insuffisance rénale terminale, interférence de dosage, macroprolactinémie (polycopié p. 56).'],
    nodes: [
      { id: 'hypo', at: 'hypo', leader: true, lx: 290, ly: -14, label: 'Hypothalamus', sub: 'dopamine (−) · TRH (+)', color: 'p-grey', info: 'Les neurones dopaminergiques tubéro-infundibulaires (noyau arqué) libèrent la dopamine dans le système porte de la tige (complément).' },
      { id: 'pit', at: 'ant', leader: true, lx: 250, ly: 14, label: 'Antéhypophyse', sub: 'cellules lactotropes', color: 'p-magenta' },
      { id: 'breast', x: 1020, y: 380, organ: 'breast', label: 'Glande mammaire', sub: 'lactation', color: 'p-magenta' },
      { id: 'e2', x: 620, y: 800, label: 'Œstrogènes', sub: 'grossesse', color: 'p-rose' },
      { id: 'gnrh', x: 1020, y: 770, label: 'Neurones à GnRH', w: 250, sub: 'pulsatilité freinée', color: 'p-violet', zoom: 'gonadoF', info: 'L\'excès de prolactine inhibe la pulsatilité de la GnRH hypothalamique.' }
    ],
    links: [
      { from: 'hypo', to: 'pit', kind: 'inhib', mol: 'dopa', bend: -50, rate: 2.2, label: 'dopamine (tonus −)', labelOff: -150 },
      { from: 'hypo', to: 'pit', kind: 'stim', mol: 'trh', bend: 60, rate: 0.8, labelOff: 150 },
      { from: 'e2', to: 'pit', kind: 'stim', mol: 'e2', rate: 0.8 },
      { from: 'pit', to: 'breast', kind: 'stim', mol: 'prl', rate: 1.4 },
      { from: 'pit', to: 'gnrh', kind: 'inhib', mol: 'prl', rate: 0.6, label: '' }
    ]
  });

  /* ===================== Posthypophyse : ADH et ocytocine ===================== */
  AX.push({
    id: 'adh', card: { side: 'L', row: 4 }, color: 'p-sky', target: [760, 474],
    name: 'Posthypophyse · ADH et ocytocine', sub: 'Hypothalamus · posthypophyse · rein · utérus, sein',
    hh: { x: 250, y: 330, s: 1.0, portal: false },
    levels: { x: 1350, y: 740, w: 190 },
    panels: [{ id: 'oxyPanel', x: 440, y: 655, w: 870, h: 315, color: 'p-rose', title: 'Ocytocine', sub: 'mêmes noyaux, même voie axonale, autres cibles et autres stimulus' }],
    lead: 'Deux nonapeptides sont fabriqués par les neurones des noyaux supraoptiques et paraventriculaires, transportés le long de leurs axones dans la tige et stockés dans la posthypophyse. L\'ADH règle l\'eau : un « osmostat » hypothalamique compare l\'osmolalité plasmatique à sa consigne ; l\'ADH fait réabsorber l\'eau libre par le canal collecteur (récepteur V2, aquaporines 2), ce qui dilue le plasma et ramène l\'osmolalité à la consigne. L\'ocytocine, elle, agit sur l\'utérus et le sein.',
    points: ['Osmolalité plasmatique ≈ 2 × natrémie + 10 ≈ 285–295 mosmol/kg ; seuil de l\'ADH vers 280–285, de la soif vers 290–295 (complément).', 'Une hypovolémie importante (> 10 %, complément) stimule aussi l\'ADH ; elle exerce alors un puissant effet vasopresseur (polycopié p. 50), par le récepteur V1a (complément).', 'Diabète insipide : polyurie > 3 L/24 h, polydipsie, nycturie, urines diluées (osmolalité < 200 mosmol/kg).', 'SIADH : rétention d\'eau sans œdème, hyponatrémie souvent < 120 mmol/L, osmolalité plasmatique basse.', 'Le cortisol inhibe la sécrétion d\'ADH.', 'Ocytocine : réflexe de succion (éjection du lait), distension du col au travail (rétrocontrôle positif, complément).'],
    nodes: [
      { id: 'hypo', at: 'hypo', lx: -180, ly: 122, label: 'Noyaux SO et PV', sub: ['osmorécepteurs', 'ADH · ocytocine'], color: 'p-sky', info: 'Les neurones magnocellulaires des noyaux supraoptiques (SO) et paraventriculaires (PV) synthétisent l\'ADH et l\'ocytocine. Des osmorécepteurs voisins (organes circumventriculaires) détectent l\'osmolalité plasmatique (complément).' },
      { id: 'post', at: 'post', lx: 60, ly: 10, label: 'Posthypophyse', sub: 'stockage, libération', color: 'p-sky', info: 'Terminaisons axonales : l\'ADH et l\'ocytocine y sont stockées puis libérées dans le sang.' },
      { id: 'osm', x: 730, y: 250, w: 380, h: 150, label: 'Osmolalité plasmatique', color: 'p-sky', gauge: { min: 265, max: 315, lo: 285, hi: 295, set: 287, ticks: [270, 280, 290, 300, 310], val: (s) => 2 * s.na + 10 }, info: 'Le « thermostat » de l\'eau : l\'hypothalamus compare l\'osmolalité plasmatique (≈ 2 × Na + 10) à sa consigne. Au-dessus : ADH et soif ; au-dessous : ADH effondrée, urines diluées.' },
      { id: 'thirst', x: 700, y: 450, label: 'Soif', w: 200, sub: 'apport d\'eau', color: 'p-sky', info: 'La soif apparaît pour une osmolalité un peu plus haute que le seuil de l\'ADH (complément). Elle protège de l\'hypernatrémie tant que le patient peut boire.' },
      { id: 'kidney', zoom: 'vol-osm', x: 1090, y: 320, organ: 'nephron', s: 1.4, label: 'Rein : canal collecteur', sub: ['récepteur V2 → aquaporines 2', 'réabsorption d\'eau libre'], color: 'p-sky', info: 'Le polycopié parle du « tubule rénal ». Précisément (complément), l\'ADH se fixe au récepteur V2 des cellules du canal collecteur : les aquaporines 2 s\'insèrent dans la membrane apicale et l\'eau libre est réabsorbée.' },
      { id: 'urine', x: 1420, y: 300, label: 'Urines', w: 270, color: 'p-gold', info: 'Volume et concentration des urines : leur osmolalité reflète l\'action de l\'ADH sur le rein.' },
      { id: 'vessel', x: 1420, y: 510, organ: 'vessel', s: 0.7, label: 'Artérioles', sub: 'V1a : vasoconstriction', color: 'p-red', info: 'En cas de chute brutale de la pression artérielle, l\'ADH exerce un puissant effet vasopresseur (polycopié p. 50) ; il passe par le récepteur V1a (complément).' },
      { id: 'baro', x: 150, y: 660, label: 'Hypovolémie, PA ↓', w: 250, sub: 'barorécepteurs', color: 'p-red', info: 'Une baisse importante de la volémie ou de la pression artérielle stimule l\'ADH, même si l\'osmolalité est normale (complément).' },
      { id: 'cort', x: 150, y: 860, label: 'Cortisol', w: 180, color: 'p-gold', zoom: 'cortico', info: 'Le cortisol inhibe la sécrétion d\'hormone antidiurétique : l\'insuffisance corticotrope peut s\'accompagner d\'une hyponatrémie.' },
      { id: 'suck', x: 600, y: 770, label: 'Succion du mamelon', w: 250, color: 'p-rose', info: 'Le réflexe neuroendocrine de la tétée déclenche la libération d\'ocytocine (complément).' },
      { id: 'cervix', x: 600, y: 905, label: 'Distension du col', w: 250, sub: '', color: 'p-rose', info: 'Réflexe de Ferguson : la distension du col et du vagin au cours du travail stimule l\'ocytocine, qui renforce les contractions (rétrocontrôle positif, complément).' },
      { id: 'uterus', x: 900, y: 810, organ: 'uterus', s: 0.8, label: 'Utérus', sub: 'contractions du travail', color: 'p-rose' },
      { id: 'breast', x: 1170, y: 810, organ: 'breast', s: 0.78, label: 'Glande mammaire', sub: 'éjection du lait', color: 'p-rose' }
    ],
    links: [
      { from: 'osm', to: 'hypo', kind: 'stim', color: 'p-sky', bend: 40, label: 'osmorécepteurs', info: 'adh.osm' },
      { from: 'hypo', to: 'post', mol: 'adh', label: '', rate: 1.6 },
      { from: 'post', to: 'kidney', kind: 'stim', mol: 'adh', bend: -40, rate: 1.6, label: 'ADH' },
      { from: 'kidney', to: 'osm', mol: 'water', rate: 2, bend: 60, label: 'eau réabsorbée', labelAt: 0.3 },
      { from: 'kidney', to: 'urine', mol: 'water', rate: 1, label: '' },
      { from: 'hypo', to: 'thirst', kind: 'stim', color: 'p-sky', bend: -20, label: '' },
      { from: 'thirst', to: 'osm', mol: 'water', rate: 1, label: 'eau bue' },
      { from: 'post', to: 'vessel', kind: 'stim', mol: 'adh', bend: 60, rate: 0.5, label: '' },
      { from: 'baro', to: 'hypo', kind: 'stim', color: 'p-red', bend: -40, label: '' },
      { from: 'cort', to: 'hypo', kind: 'inhib', mol: 'cortisol', bend: -80, rate: 0.5, label: '' },
      { from: 'post', to: 'uterus', kind: 'stim', mol: 'oxy', bend: 30, rate: 0.9, label: 'ocytocine', labelAt: 0.75 },
      { from: 'post', to: 'breast', kind: 'stim', mol: 'oxy', bend: 60, rate: 0.7, label: '' },
      { from: 'suck', to: 'hypo', kind: 'stim', color: 'p-rose', bend: -60, label: '' },
      { from: 'cervix', to: 'hypo', kind: 'stim', color: 'p-rose', bend: -110, label: '' },
      { from: 'uterus', to: 'cervix', kind: 'stim', color: 'p-rose', bend: -30, label: 'rétrocontrôle +' }
    ]
  });

  /* ===================== Médullosurrénale ===================== */
  AX.push({
    id: 'medullo', card: { side: 'L', row: 5 }, color: 'p-red', target: [765, 456],
    name: 'Médullosurrénale', sub: 'Système sympathique · cellules chromaffines · catécholamines',
    lead: 'Les nerfs splanchniques du système sympathique stimulent les cellules chromaffines, qui libèrent l\'adrénaline (80 à 95 %) et la noradrénaline (10 à 20 %) stockées dans leurs granules. Les glucocorticoïdes du cortex stimulent leur synthèse. Dans la cellule (et dans la tumeur), la COMT transforme en continu les catécholamines en métanéphrines : c\'est ce que l\'on dose.',
    points: ['Réaction de combat ou de fuite : fréquence cardiaque ↑, pression artérielle ↑, vasoconstriction.', 'Les catécholamines participent à la contre-régulation de l\'hypoglycémie ; leurs signes adrénergiques alertent le patient (polycopié, partie 2, p. 67).', 'Les glucocorticoïdes augmentent la tyrosine hydroxylase et la PNMT (polycopié p. 74) : seule la médullosurrénale, baignée de cortisol, fabrique beaucoup d\'adrénaline (complément).', 'Profil sécrétoire (complément) : adrénergique (métanéphrine ↑, paroxysmes, tachycardie, hyperglycémie), noradrénergique (normétanéphrine ↑, HTA plus permanente ; paragangliomes extra-surrénaliens), dopaminergique (3-méthoxytyramine ↑, souvent peu d\'HTA ; paragangliomes, gène SDHB).'],
    nodes: [
      { id: 'nerve', x: 230, y: 380, organ: 'nerve', label: 'Nerfs splanchniques', sub: 'système sympathique', color: 'p-red' },
      { id: 'med', x: 600, y: 380, organ: 'adrenalKidney', label: 'Médullosurrénale', sub: 'cellules chromaffines', color: 'p-red' },
      { id: 'heart', x: 960, y: 230, organ: 'heart', s: 0.9, label: 'Cœur', sub: 'FC ↑, contractilité ↑', color: 'p-red' },
      { id: 'vessel', x: 960, y: 470, organ: 'vessel', label: 'Vaisseaux', sub: 'vasoconstriction, PA ↑', color: 'p-red' },
      { id: 'liver', x: 960, y: 700, organ: 'liver', s: 0.9, label: 'Foie', sub: 'glycémie ↑', color: 'p-lime' },
      { id: 'cortex', x: 600, y: 760, label: 'Cortisol (cortex)', w: 240, color: 'p-gold', zoom: 'cortico', info: 'Les glucocorticoïdes produits par le cortex surrénalien stimulent la synthèse des catécholamines.' },
      { id: 'assay', x: 230, y: 760, label: 'Métanéphrines', w: 270, sub: ['COMT dans la cellule (et la tumeur)', 'dosage plasmatique ou urinaire'], color: 'p-brown', info: 'Métanéphrine (issue de l\'adrénaline), normétanéphrine (de la noradrénaline), 3-méthoxytyramine (de la dopamine) : produites en continu, même entre les paroxysmes, d\'où leur intérêt diagnostique.' }
    ],
    links: [
      { from: 'nerve', to: 'med', kind: 'stim', color: 'p-red', label: 'influx sympathique', info: 'medullo.nerve' },
      { from: 'med', to: 'heart', kind: 'stim', mol: 'adre', rate: 1.6 },
      { from: 'med', to: 'vessel', kind: 'stim', mol: 'nora', rate: 1 },
      { from: 'med', to: 'liver', kind: 'stim', mol: 'adre', rate: 0.9, label: '' },
      { from: 'cortex', to: 'med', kind: 'stim', mol: 'cortisol', rate: 0.8, label: '' },
      { from: 'med', to: 'assay', mol: 'adre', rate: 0.5, bend: 30, label: '' },
      { from: 'med', to: 'assay', mol: 'nora', rate: 0.5, label: 'MN · NMN · 3-MT' },
      { from: 'med', to: 'assay', mol: 'dopa', rate: 0.4, bend: -30, label: '' }
    ],
    chain: { x: 1250, y: 240, dy: 120, w: 300, title: 'Biosynthèse (cellule chromaffine)', steps: [
      { label: 'Tyrosine', enz: 'tyrosine hydroxylase' }, { label: 'L-DOPA', enz: 'décarboxylase' }, { label: 'Dopamine', mol: 'dopa', enz: 'dopamine β-hydroxylase' }, { label: 'Noradrénaline', mol: 'nora', enz: 'PNMT (cytosol)' }, { label: 'Adrénaline', mol: 'adre' }
    ] }
  });

  /* ===================== Axe gonadotrope féminin ===================== */
  const e2Kind = (T) => (R.e2Positive(T) ? 'stim' : 'inhib');
  AX.push({
    id: 'gonadoF', card: { side: 'R', row: 0 }, color: 'p-rose', target: [832, 592],
    name: 'Axe gonadotrope féminin', sub: 'GnRH pulsatile · LH, FSH · ovaire · cycle de 28 jours', clock: 'cycle',
    hh: { x: 280, y: 341, s: 1.8, flip: true, inset: { cx: 300, cy: 480, r: 235 } },
    lead: 'La GnRH pulsatile commande la LH et la FSH. La LH stimule la thèque interne (androgènes), la FSH la granulosa, qui les aromatise en estradiol. Le rétrocontrôle de l\'estradiol est négatif, sauf en milieu de cycle où il devient positif et déclenche le pic de LH et l\'ovulation.',
    points: ['J1–J14 : phase folliculaire, sélection d\'un follicule sous FSH.', 'J14 : pic de LH, rupture du follicule, expulsion de l\'ovocyte II.', 'J14–J28 : phase lutéale, le corps jaune sécrète progestérone et estradiol.', 'L\'inhibine B freine la FSH (action hypophysaire). La leptine a un effet permissif sur la GnRH.', 'Observez le signe du rétrocontrôle de l\'estradiol passer de − à + autour de J12–J14.'],
    nodes: [
      { id: 'hypo', at: 'hypo', leader: true, lx: -190, ly: -150, label: 'Neurones à GnRH', sub: 'sécrétion pulsatile', color: 'p-violet' },
      { id: 'pit', at: 'ant', leader: true, lx: 250, ly: 14, label: 'Antéhypophyse', sub: 'cellules gonadotropes', color: 'p-violet' },
      { id: 'ovary', zoom: 'folliculo', x: 920, y: 380, organ: 'ovary', s: 1.25, label: 'Ovaire', sub: ['thèque : androgènes (LH)', 'granulosa : E2 (FSH)', 'corps jaune : progestérone'], color: 'p-rose' },
      { id: 'uterus', zoom: 'endometre', x: 1330, y: 300, organ: 'uterus', label: 'Utérus', sub: 'endomètre, glaire', color: 'p-rose' },
      { id: 'breast', x: 1330, y: 600, organ: 'breast', s: 0.85, label: 'Seins, os, peau', sub: 'effets trophiques, HDL ↑', color: 'p-rose' },
      { id: 'kiss', at: 'arc', dot: 9, hit: 16, leader: true, lx: 270, ly: -150, anchor: 'end', label: 'Neurones à kisspeptine', sub: 'noyau arqué', color: 'p-magenta', info: 'Les neurones à kisspeptine de l\'hypothalamus (noyau arqué, complément) stimulent les neurones à GnRH (polycopié, partie 2, p. 3).' },
      { id: 'aff', x: 620, y: 718, label: 'Neurones à GABA, à glutamate', w: 300, sub: 'autres afférences', color: 'p-violet', info: 'Influences distinctes des kisspeptines sur les neurones à GnRH (polycopié, partie 2, p. 3) : le glutamate stimule, le GABA module (complément).' },
      { id: 'lep', x: 600, y: 872, organ: 'fat', s: 0.7, label: 'Tissu adipeux blanc', sub: 'leptine (permissif)', color: 'p-amber', info: 'Effet permissif indirect de la leptine, sécrétée par le tissu adipeux blanc, sur les neurones à GnRH (polycopié, partie 2, p. 4).' }
    ],
    links: [
      { from: 'hypo', to: 'pit', kind: 'stim', mol: 'gnrh', mod: R.gnrhPulse, rate: 2, labelOff: 150 },
      { from: 'pit', to: 'ovary', kind: 'stim', mol: 'lh', bend: -40, mod: R.lh, labelAt: 0.72 },
      { from: 'pit', to: 'ovary', kind: 'stim', mol: 'fsh', bend: 40, mod: R.fsh, labelAt: 0.72 },
      { from: 'ovary', to: 'uterus', mol: 'e2', mod: R.e2, label: 'E2' },
      { from: 'ovary', to: 'uterus', mol: 'prog', bend: 50, mod: R.prog, label: 'progestérone' },
      { from: 'ovary', to: 'breast', mol: 'e2', mod: R.e2, label: '' },
      { from: 'ovary', to: 'pit', kind: e2Kind, mol: 'e2', bend: -110, mod: R.e2, rate: 0.9, label: 'E2 (− / + mi-cycle)', labelAt: 0.25 },
      { from: 'ovary', to: 'hypo', kind: e2Kind, mol: 'e2', bend: -230, mod: R.e2, rate: 0.9, label: '' },
      { from: 'ovary', to: 'pit', kind: 'inhib', mol: 'inhib', bend: 120, rate: 0.6, label: 'inhibine B → FSH', labelAt: 0.25 },
      { from: 'kiss', to: 'hypo', kind: 'stim', mol: 'kiss', rate: 0.6, label: '', bend: 12 },
      { from: 'aff', to: 'hypo', kind: 'stim', color: 'p-violet', label: 'GABA, glutamate' },
      { from: 'lep', to: 'hypo', kind: 'stim', color: 'p-amber', label: 'leptine (permissif)', info: 'gonadoF.lep', effect: 'permissif (indirect)' }
    ],
    levels: { x: 60, y: 860, w: 300, items: [{ label: 'LH', mol: 'lh', fn: R.lh, max: 2.8 }, { label: 'FSH', mol: 'fsh', fn: R.fsh, max: 2.8 }, { label: 'Estradiol', mol: 'e2', fn: R.e2, max: 1.6 }, { label: 'Progestérone', mol: 'prog', fn: R.prog, max: 1.6 }] }
  });

  /* ===================== Axe gonadotrope masculin ===================== */
  AX.push({
    id: 'gonadoM', card: { side: 'R', row: 1 }, color: 'p-blue', target: [806, 638],
    name: 'Axe gonadotrope masculin', sub: 'GnRH pulsatile · LH, FSH · testicule', clock: 'day',
    hh: { x: 280, y: 341, s: 1.8, flip: true, inset: { cx: 300, cy: 480, r: 235 } },
    clockInfo: 'Pulses de GnRH environ toutes les 90 minutes (complément), suivis de pulses de LH.',
    lead: 'La GnRH pulsatile entraîne une libération pulsatile de LH et de FSH. La LH stimule les cellules de Leydig (testostérone), la FSH les cellules de Sertoli (spermatogenèse, inhibine B). La testostérone freine l\'axe ; l\'inhibine B freine la FSH.',
    points: ['Testicule : 15 à 20 mL ; tubes séminifères (cellules germinales et de Sertoli) et tissu interstitiel (cellules de Leydig).', 'Testostérone et cellules de Sertoli sont indispensables à la spermatogenèse.', 'La fonction endocrine décline lentement avec l\'âge, la production de gamètes persiste.', 'Une hyperprolactinémie peut freiner l\'axe.'],
    nodes: [
      { id: 'hypo', at: 'hypo', leader: true, lx: -190, ly: -150, label: 'Neurones à GnRH', sub: ['pulses ≈ 90 min', '(complément)'], color: 'p-violet' },
      { id: 'pit', at: 'ant', leader: true, lx: 250, ly: 14, label: 'Antéhypophyse', sub: 'cellules gonadotropes', color: 'p-violet' },
      { id: 'testis', zoom: 'testis-sec', x: 920, y: 380, organ: 'testis', s: 1.25, label: 'Testicule', sub: ['Leydig : testostérone (LH)', 'Sertoli : spermatogenèse (FSH)'], color: 'p-blue' },
      { id: 'muscle', x: 1330, y: 220, organ: 'muscle', s: 0.85, label: 'Muscle', sub: 'effet anabolisant', color: 'p-blue' },
      { id: 'bone', x: 1330, y: 420, organ: 'bone', s: 0.8, label: 'Os, moelle', sub: 'masse osseuse, érythropoïèse', color: 'p-blue' },
      { id: 'brain', x: 1330, y: 620, organ: 'brainLateral', s: 0.85, label: 'Cerveau, peau', sub: 'libido · pilosité, sébum', color: 'p-blue' },
      { id: 'kiss', at: 'arc', dot: 9, hit: 16, leader: true, lx: 270, ly: -150, anchor: 'end', label: 'Neurones à kisspeptine', sub: 'noyau arqué', color: 'p-magenta', info: 'Les neurones à kisspeptine de l\'hypothalamus (noyau arqué, complément) stimulent les neurones à GnRH (polycopié, partie 2, p. 3).' },
      { id: 'aff', x: 620, y: 718, label: 'Neurones à GABA, à glutamate', w: 300, sub: 'autres afférences', color: 'p-violet', info: 'Influences distinctes des kisspeptines sur les neurones à GnRH (polycopié, partie 2, p. 3) : le glutamate stimule, le GABA module (complément).' },
      { id: 'lep', x: 600, y: 872, organ: 'fat', s: 0.7, label: 'Tissu adipeux blanc', sub: 'leptine (permissif)', color: 'p-amber', info: 'Effet permissif indirect de la leptine, sécrétée par le tissu adipeux blanc, sur les neurones à GnRH (polycopié, partie 2, p. 4).' }
    ],
    links: [
      { from: 'hypo', to: 'pit', kind: 'stim', mol: 'gnrh', mod: R.gnrhPulse, rate: 2, labelOff: 150 },
      { from: 'pit', to: 'testis', kind: 'stim', mol: 'lh', bend: -40, mod: R.gnrhPulse, labelAt: 0.72 },
      { from: 'pit', to: 'testis', kind: 'stim', mol: 'fsh', bend: 40, labelAt: 0.72 },
      { from: 'testis', to: 'muscle', mol: 'testo' },
      { from: 'testis', to: 'bone', mol: 'testo', label: '' },
      { from: 'testis', to: 'brain', mol: 'testo', label: '' },
      { from: 'testis', to: 'pit', kind: 'inhib', mol: 'testo', bend: -110, rate: 0.9, label: 'testostérone −', labelAt: 0.25 },
      { from: 'testis', to: 'hypo', kind: 'inhib', mol: 'testo', bend: -230, rate: 0.9, label: '' },
      { from: 'testis', to: 'pit', kind: 'inhib', mol: 'inhib', bend: 120, rate: 0.6, label: 'inhibine B → FSH', labelAt: 0.25 },
      { from: 'kiss', to: 'hypo', kind: 'stim', mol: 'kiss', rate: 0.6, label: '', bend: 12 },
      { from: 'aff', to: 'hypo', kind: 'stim', color: 'p-violet', label: 'GABA, glutamate' },
      { from: 'lep', to: 'hypo', kind: 'stim', color: 'p-amber', label: 'leptine (permissif)', info: 'gonadoM.lep', effect: 'permissif (indirect)' }
    ],
    levels: { x: 1180, y: 830, w: 340, items: [{ label: 'GnRH / LH', mol: 'lh', fn: R.gnrhPulse, max: 1.8 }, { label: 'Testostérone', mol: 'testo', fn: () => 1, max: 1.6 }] }
  });

  /* ===================== Métabolisme phosphocalcique ===================== */
  const calc = (T) => 2.4 + 0.12 * Math.sin((2 * Math.PI * T.h) / 6);
  const pthLvl = (T) => HV.clamp(1 + (2.4 - calc(T)) * 6, 0.2, 2);
  AX.push({
    id: 'phospho', card: { side: 'R', row: 2 }, color: 'p-green', target: [814, 258],
    name: 'Métabolisme phosphocalcique', sub: 'Calcium · CaSR · PTH · calcitriol', clock: 'day',
    clockInfo: 'La calcémie oscille légèrement : quand elle baisse, le CaSR est moins activé et la PTH augmente.',
    lead: 'Le calcium ionisé active le récepteur sensible au calcium (CaSR) des parathyroïdes : quand la calcémie baisse, le CaSR est moins activé et la PTH est sécrétée. La PTH fait réabsorber le calcium par le rein, le libère de l\'os et stimule la production de calcitriol, qui augmente l\'absorption intestinale.',
    points: ['Calcémie totale 2,20–2,60 mmol/L, ionisée 1,15–1,30 mmol/L.', 'Calcémie corrigée (mmol/L) = Ca mesurée + 0,025 × (40 − albuminémie en g/L).', 'Bilan nul : sur 800 à 1000 mg d\'apports, 30 à 35 % sont absorbés ; le rein excrète le flux net.', 'Rein : 65 % réabsorbés au tube proximal, 25 % dans l\'anse de Henlé (PTH, CaSR), complément au tube distal (PTH).', 'Une hypovolémie ou une alcalose augmentent la réabsorption rénale du calcium.'],
    nodes: [
      { id: 'ca', x: 240, y: 400, label: 'Calcémie', sub: 'calcium ionisé', color: 'p-green', live: (T) => n2(calc(T)) + ' mmol/L', info: 'Calcium total : 2,20–2,60 mmol/L ; ionisé : 1,15–1,30 mmol/L.' },
      { id: 'para', x: 600, y: 400, organ: 'parathyroidBack', label: 'Parathyroïdes', sub: 'CaSR · cellules principales', color: 'p-green', info: '4 glandes dans 80 % des cas, à la face postérieure des pôles thyroïdiens ; ≈ 40 mg chacune.' },
      { id: 'kidney', zoom: 'ca-nephron', x: 980, y: 250, organ: 'kidney', label: 'Rein', sub: ['réabsorption du Ca', '1α-hydroxylation'], color: 'p-green' },
      { id: 'bone', zoom: 'remodelage', x: 980, y: 620, organ: 'bone', label: 'Os', sub: 'ostéocytes : libération rapide', color: 'p-green', info: '99 % du calcium de l\'organisme. Le remodelage équilibre résorption et minéralisation.' },
      { id: 'gut', x: 1360, y: 400, organ: 'intestine', label: 'Intestin grêle', sub: 'absorption active du Ca', color: 'p-amber' },
      { id: 'ccell', x: 300, y: 830, label: 'Cellules C (thyroïde)', w: 260, color: 'tg', zoom: 'foll', info: 'Les cellules parafolliculaires sécrètent la calcitonine (polycopié), qui freine la résorption osseuse par les ostéoclastes (effet hypocalcémiant, mineur chez l\'homme ; complément).' }
    ],
    links: [
      { from: 'ca', to: 'para', kind: 'inhib', mol: 'ca', rate: 1.2, label: 'Ca²⁺ → CaSR' },
      { from: 'para', to: 'kidney', kind: 'stim', mol: 'pth', mod: pthLvl },
      { from: 'para', to: 'bone', kind: 'stim', mol: 'pth', mod: pthLvl, label: '' },
      { from: 'kidney', to: 'gut', kind: 'stim', mol: 'calcitriol', mod: pthLvl },
      { from: 'kidney', to: 'ca', mol: 'ca', bend: -150, label: 'réabsorption', labelAt: 0.3, rate: 1 },
      { from: 'bone', to: 'ca', mol: 'ca', bend: 150, label: 'libération', labelAt: 0.6, mod: pthLvl, rate: 1 },
      { from: 'gut', to: 'ca', mol: 'ca', bend: -480, label: 'absorption', rate: 0.9 },
      { from: 'ccell', to: 'bone', kind: 'inhib', mol: 'calcitonin', rate: 0.6, label: 'calcitonine (− résorption)' }
    ],
    levels: { x: 1180, y: 830, w: 340, items: [{ label: 'Calcémie', mol: 'ca', fn: (T) => (calc(T) - 2.2) * 5, max: 2 }, { label: 'PTH', mol: 'pth', fn: pthLvl, max: 2 }] }
  });

  /* ===================== Système rénine-angiotensine-aldostérone ===================== */
  AX.push({
    id: 'raa', card: { side: 'R', row: 3 }, color: 'p-teal', target: [840, 474],
    name: 'Rénine-angiotensine-aldostérone', sub: 'Appareil juxtaglomérulaire · angiotensine II · zone glomérulée',
    lead: 'L\'appareil juxtaglomérulaire libère la rénine, qui déclenche une cascade aboutissant à l\'angiotensine II. Celle-ci stimule l\'aldostérone de la zone glomérulée. L\'aldostérone fait réabsorber le sodium et excréter le potassium et les ions H⁺ au tube distal et au canal collecteur. La kaliémie stimule aussi l\'aldostérone.',
    points: ['Aldostérone : rôle important dans la régulation de la pression artérielle par la rétention sodée.', 'Toutes les hormones corticostéroïdes dérivent du cholestérol ; son transport mitochondrial par StAR est l\'étape limitante.', 'L\'hypovolémie, la baisse de la pression artérielle ou de la perfusion rénale stimulent la rénine ; l\'expansion volémique la met au repos.'],
    nodes: [
      { id: 'jga', bare: true, x: 626, y: 470, lx: -70, ly: 6, anchor: 'end', label: 'Appareil juxtaglomérulaire', sub: 'rénine', color: 'p-red', sheet: 'kidney', info: 'Les cellules juxtaglomérulaires de l\'artériole afférente libèrent la rénine quand la perfusion rénale ou la volémie baissent.' },
      { id: 'adr', zoom: 'surrenale', bare: true, x: 650, y: 330, lx: -80, ly: -40, anchor: 'end', label: 'Corticosurrénale : zone glomérulée', sub: 'aldostérone synthase', color: 'p-teal', sheet: 'adrenal', info: 'La surrénale coiffe le pôle supérieur du rein. Sa zone glomérulée, la plus externe, fabrique l\'aldostérone.' },
      { id: 'tub', zoom: 'nephron-full', bare: true, x: 760, y: 500, lx: 60, ly: 40, label: 'Tube distal, canal collecteur', sub: ['Na⁺ et eau réabsorbés', 'K⁺ et H⁺ excrétés'], color: 'p-teal', sheet: 'kidney' },
      { id: 'liver', x: 230, y: 830, organ: 'liver', s: 0.85, label: 'Foie', sub: 'angiotensinogène (complément)', color: 'p-red' },
      { id: 'lung', x: 230, y: 590, organ: 'lungs', s: 0.85, label: 'Poumon', sub: 'enzyme de conversion (complément)', color: 'p-red' },
      { id: 'ecf', x: 1200, y: 330, organ: 'vessel', s: 1.1, label: 'Rétention hydrosodée', sub: 'Na⁺ puis eau retenus : volume extracellulaire ↑', color: 'p-teal', info: 'Le sodium réabsorbé entraîne l\'eau : le volume extracellulaire et la volémie augmentent, la pression artérielle monte.' },
      { id: 'k', x: 760, y: 820, label: 'Kaliémie', color: 'p-violet', info: 'La concentration de potassium régule directement la sécrétion d\'aldostérone ; l\'aldostérone fait excréter le potassium (rétrocontrôle).' },
      { id: 'vol', x: 1360, y: 620, label: 'Volémie, PA', w: 260, color: 'p-teal', info: 'La rétention de sodium restaure la volémie et la pression artérielle, ce qui met au repos la production de rénine.' }
    ],
    draw(a) {
      // Rein et surrénale réunis : la surrénale coiffe le pôle supérieur du rein.
      const g = a.el('g', { transform: 'translate(690 420) scale(3.1)', class: 'raa-organ', 'data-sheet': 'adrenal' });
      HV.organs.adrenalKidney(g);
    },
    links: [
      { from: 'jga', to: 'liver', mol: 'renin', label: 'rénine', rate: 1.2, bend: -60 },
      { from: 'liver', to: 'lung', mol: 'angio1', label: 'angiotensine I', rate: 1.2, bend: 60, labelOff: -30 },
      { from: 'lung', to: 'adr', kind: 'stim', mol: 'angio', rate: 1.4, label: 'angiotensine II', labelAt: 0.28, labelOff: 26 },
      { from: 'adr', to: 'tub', kind: 'stim', mol: 'aldo', rate: 1.4, bend: -60, label: 'aldostérone' },
      { from: 'k', to: 'adr', kind: 'stim', mol: 'k', rate: 1, bend: -120, label: 'K⁺ ↑ stimule' },
      { from: 'tub', to: 'k', mol: 'k', rate: 0.8, bend: -40, label: 'K⁺ excrété' },
      { from: 'tub', to: 'ecf', mol: 'nai', rate: 1.6, label: 'Na⁺', bend: -30 },
      { from: 'tub', to: 'ecf', mol: 'water', rate: 1.2, label: '', bend: 30 },
      { from: 'ecf', to: 'vol', kind: 'stim', color: 'p-teal', label: '' },
      { from: 'vol', to: 'jga', kind: 'inhib', color: 'p-teal', bend: 360, label: 'freine la rénine', info: 'raa.vol' }
    ]
  });

  /* ===================== Glycémie ===================== */
  const gly = R.glycemia;
  const ins = (T) => HV.clamp((gly(T) - 0.75) * 2.5, 0.08, 2);
  const glu = (T) => HV.clamp((1.15 - gly(T)) * 3 + (T.h < 6 || T.h > 23 ? 0.4 : 0), 0.08, 2);
  const meal = (T) => HV.clamp(R.meals.reduce((a, m) => a + Math.exp(-Math.pow(((T.h - m + 24) % 24 - 0.5) / 0.5, 2)), 0) * 2, 0, 2);
  AX.push({
    id: 'glyc', card: { side: 'R', row: 4 }, color: 'p-lime', target: [812, 484],
    name: 'Régulation de la glycémie', sub: 'Îlots de Langerhans · foie · muscle · tissu adipeux · rein', clock: 'day', startHour: 6,
    clockInfo: 'Repas à 7 h 30, 12 h 30 et 19 h 30. L\'insuline prédomine en journée, le glucagon la nuit.',
    clockLabel: (T) => n2(gly(T)) + ' g/L',
    lead: 'L\'insuline (cellules β) fait baisser la glycémie : captation du glucose par le muscle et le tissu adipeux (GLUT4) et frein de la production hépatique. Le glucagon (cellules α) mobilise les réserves du foie. Au jeûne prolongé, la lipolyse fournit des acides gras et une cétogenèse limitée.',
    points: ['Glycémie à jeun normale 0,80–1,10 g/L ; diabète ≥ 1,26 g/L à deux reprises, ou ≥ 2,00 g/L avec symptômes ou à 2 h d\'une HGPO.', 'SGLT2 réabsorbe tout le glucose filtré ; glycosurie au-delà de 1,80 g/L.', 'Contre-régulation de l\'hypoglycémie : baisse de l\'insuline, glucagon, catécholamines, GH, puis cortisol (plus tardif), et prise de glucides.', 'Hypoglycémie : < 0,50 g/L hors diabète, < 0,70 g/L chez le diabétique (niveau 2 : < 0,54 g/L).'],
    draw(a) {
      a.path('M 660,450 C 820,540 1000,540 1196,620', 'connector');
      a.childCaption('islet', 'Îlot et cellule β ⊕');
    },
    nodes: [
      { id: 'glc', x: 240, y: 400, label: 'Glycémie', color: 'p-lime', live: (T) => n2(gly(T)) + ' g/L', info: 'Résulte de l\'absorption alimentaire, de la production hépatique (glycogénolyse, néoglucogenèse) et de la consommation par les tissus.' },
      { id: 'islet', x: 600, y: 400, organ: 'islet', s: 1.2, label: 'Îlots de Langerhans', sub: 'β : insuline · α : glucagon', color: 'p-blue2', zoom: 'islet', info: 'Le pancréas endocrine représente 1 % du tissu pancréatique.' },
      { id: 'liver', zoom: 'liver-fast', x: 980, y: 230, organ: 'liver', label: 'Foie', sub: 'glycogène, néoglucogenèse', color: 'p-lime' },
      { id: 'muscle', zoom: 'insulin-rec', x: 980, y: 470, organ: 'muscle', label: 'Muscle', sub: 'GLUT4', color: 'p-lime' },
      { id: 'fat', x: 980, y: 700, organ: 'fat', label: 'Tissu adipeux', sub: 'GLUT4 · lipolyse', color: 'p-amber' },
      { id: 'gut', x: 240, y: 760, organ: 'intestine', s: 0.9, label: 'Intestin', sub: 'repas', color: 'p-lime' },
      { id: 'kidney', x: 600, y: 780, organ: 'kidney', s: 0.85, label: 'Rein', sub: 'SGLT2 · seuil 1,80 g/L', color: 'p-lime' },
      { id: 'keto', x: 1360, y: 230, label: 'Corps cétoniques', w: 230, color: 'p-red2', info: 'Cétogenèse hépatique : limitée par l\'insuline (cétose de jeûne), emballée en cas de carence (acidocétose).' },
      { id: 'contre', x: 1360, y: 480, label: 'Contre-régulation', w: 240, sub: ['glucagon · catécholamines', 'GH · cortisol (tardif)'], color: 'p-red', zoom: 'medullo', info: 'Mise en jeu quand la glycémie baisse ; altérée dans le diabète, avec risque d\'hypoglycémie non ressentie.' }
    ],
    links: [
      { from: 'glc', to: 'islet', kind: 'stim', mol: 'glucose', mod: gly, rate: 1.2, label: '' },
      { from: 'islet', to: 'liver', kind: 'inhib', mol: 'insulin', bend: -30, mod: ins, label: 'insuline' },
      { from: 'islet', to: 'liver', kind: 'stim', mol: 'glucagon', bend: 40, mod: glu, label: 'glucagon', labelOff: 4 },
      { from: 'islet', to: 'muscle', kind: 'stim', mol: 'insulin', mod: ins, label: '' },
      { from: 'islet', to: 'fat', kind: 'stim', mol: 'insulin', mod: ins, label: '' },
      { from: 'liver', to: 'glc', mol: 'glucose', bend: -130, mod: glu, label: 'production hépatique', labelAt: 0.4 },
      { from: 'gut', to: 'glc', mol: 'glucose', mod: meal, rate: 1.4, label: 'absorption' },
      { from: 'fat', to: 'liver', mol: 'ffa', bend: 150, mod: (T) => glu(T) * 0.6, label: 'acides gras (jeûne)' },
      { from: 'liver', to: 'keto', mol: 'ketone', mod: (T) => glu(T) * 0.3, label: '' },
      { from: 'contre', to: 'liver', kind: 'stim', mol: 'adre', rate: 0.5, mod: glu, label: '' },
      { from: 'glc', to: 'kidney', mol: 'glucose', rate: 0.5, bend: 30, label: 'filtré, réabsorbé' }
    ],
    levels: { x: 1180, y: 790, w: 340, items: [{ label: 'Glycémie', mol: 'glucose', fn: (T) => gly(T) - 0.5, max: 1.4 }, { label: 'Insuline', mol: 'insulin', fn: ins, max: 2 }, { label: 'Glucagon', mol: 'glucagon', fn: glu, max: 2 }] }
  });

  /* ===================== Lipoprotéines ===================== */
  AX.push({
    id: 'lipid', card: { side: 'R', row: 5 }, color: 'p-orange', target: [774, 436],
    name: 'Métabolisme des lipoprotéines', sub: 'Chylomicrons · VLDL · IDL · LDL · HDL · récepteur des LDL',
    lead: 'Le foie est au centre du métabolisme des LDL : l\'hépatocyte sécrète les VLDL, porte 70 % des récepteurs des LDL et sécrète la PCSK9, qui agit surtout sur ses propres récepteurs (complément). Dans le plasma, la lipoprotéine lipase transforme les VLDL en IDL puis en LDL. Le cholestérol internalisé freine l\'HMG-CoA réductase. Les HDL ramènent au foie le cholestérol des tissus.',
    points: ['70 % des récepteurs des LDL sont hépatiques, 30 % sur les autres cellules.', 'PCSK9, sécrétée par l\'hépatocyte, se fixe au récepteur des LDL et l\'oriente vers le lysosome au lieu du recyclage : moins de récepteurs, LDL plasmatique ↑.', 'Les statines freinent l\'HMG-CoA réductase : la cellule exprime plus de récepteurs (SREBP-2) et capte plus de LDL. Les anti-PCSK9 empêchent la dégradation des récepteurs (complément).', 'Objectif de LDL-c selon le risque cardiovasculaire : < 0,55, < 0,70, < 1,00 ou < 1,90 g/L ; l\'hypercholestérolémie familiale est d\'emblée à risque élevé.', 'Un LDL-c élevé se dépose dans la paroi artérielle (athérome) ; les HDL sont anti-athérogènes.'],
    nodes: [
      { id: 'gut', x: 200, y: 280, organ: 'intestine', label: 'Intestin', sub: 'chylomicrons (apoB48)', color: 'p-amber' },
      { id: 'plasma', x: 620, y: 280, organ: 'vessel', s: 1.3, label: 'Plasma', sub: ['lipoprotéine lipase', 'VLDL → IDL → LDL'], color: 'p-amber', info: 'La lipoprotéine lipase hydrolyse les triglycérides des chylomicrons et des VLDL ; les VLDL deviennent IDL puis LDL (lipase hépatique).' },
      { id: 'tissue', x: 1060, y: 190, organ: 'muscle', s: 0.85, label: 'Muscle, tissu adipeux', sub: 'acides gras', color: 'p-amber' },
      { id: 'artery', x: 1060, y: 410, organ: 'vessel', s: 0.9, label: 'Paroi artérielle', sub: 'dépôt de LDL : athérome', color: 'bad', info: 'Les LDL en excès pénètrent dans l\'intima et s\'y oxydent : début de la plaque d\'athérome.' },
      { id: 'liver', x: 640, y: 830, organ: 'liver', s: 1.2, label: 'Foie', sub: 'sécrète VLDL, HDL naissantes', color: 'p-gold' },
      { id: 'ldlr', x: 860, y: 625, label: 'Récepteur des LDL', w: 250, color: 'p-teal', info: 'Le récepteur reconnaît l\'apoB100 des LDL. Après internalisation, il est recyclé vers la membrane ou dégradé dans le lysosome (polycopié, partie 2, p. 19–20).' },
      { id: 'hmg', x: 1080, y: 900, label: 'HMG-CoA réductase', w: 250, sub: 'synthèse du cholestérol', color: 'p-gold', info: 'Enzyme limitante de la synthèse du cholestérol dans l\'hépatocyte, freinée par le cholestérol issu des LDL internalisées ; cible des statines.' },
      { id: 'pcsk9', x: 1130, y: 700, label: 'PCSK9', w: 180, sub: 'fabriquée par l\'hépatocyte', color: 'p-magenta', info: 'Synthétisée et sécrétée par l\'hépatocyte, elle se lie au récepteur des LDL et l\'oriente vers le lysosome plutôt que vers le recyclage (polycopié, partie 2, p. 20).' },
      { id: 'periph', x: 200, y: 700, organ: 'cellIcon', label: 'Cellules périphériques', sub: '30 % des récepteurs des LDL', color: 'p-teal' }
    ],
    panels: [{ id: 'hepato', x: 420, y: 570, w: 830, h: 400, color: 'p-gold', title: 'Hépatocyte' }],
    links: [
      { from: 'gut', to: 'plasma', mol: 'chylo', rate: 1.2 },
      { from: 'plasma', to: 'tissue', mol: 'ffa', rate: 1.2, label: 'acides gras' },
      { from: 'liver', to: 'plasma', mol: 'vldl', bend: -60, rate: 1.2, label: 'VLDL' },
      { from: 'plasma', to: 'ldlr', mol: 'ldl', bend: -40, rate: 1.4, label: 'LDL (apoB100)' },
      { from: 'ldlr', to: 'liver', mol: 'ldl', rate: 1.2, label: 'internalisées' },
      { from: 'plasma', to: 'artery', mol: 'ldl', rate: 0.5, label: 'LDL en excès' },
      { from: 'plasma', to: 'periph', mol: 'ldl', rate: 0.6, label: '' },
      { from: 'periph', to: 'liver', mol: 'hdl', rate: 1, label: 'HDL : retour du cholestérol' },
      { from: 'liver', to: 'hmg', kind: 'inhib', mol: 'chol', rate: 1, label: 'cholestérol' },
      { from: 'liver', to: 'pcsk9', mol: 'pcsk9', rate: 0.6, label: 'synthèse' },
      { from: 'pcsk9', to: 'ldlr', kind: 'inhib', mol: 'pcsk9', bend: -30, rate: 0.6, label: 'dégrade le récepteur' }
    ],
    levels: { x: 60, y: 880, w: 300, items: [] }
  });

  // Mention de la source affichée sous chaque axe (le polycopié de 2023 en est la 2e édition).
  AX.forEach((ax) => { if (!ax.source) ax.source = 'Source : Polycopié de sémiologie endocrinienne, CEEDMM, 2e édition (2023).'; });
  HV.AXES = AX;
  AX.forEach(HV.axisScene);
})();
