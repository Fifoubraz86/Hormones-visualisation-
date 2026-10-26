/*
 * Lévothyroxine : interférences avec la biodisponibilité orale et les besoins (données partagées par l'atlas
 * et le simulateur). Source : Centanni M, Duntas L, Feldt-Rasmussen U et al. ETA guidelines for the use of
 * levothyroxine sodium preparations in monotherapy to optimize the treatment of hypothyroidism.
 * Eur Thyroid J 2025;14(4):e250123 (tableaux 1 à 3 et recommandations 1 à 16), et Nagy EV et al.,
 * Thyroid 2021;31:193 (formulations). Colonnes : [nom, mécanisme, conduite, forme liquide ou capsule molle].
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  HV.LT4_ETA = {
    src: 'ETA 2025 (Centanni et al., Eur Thyroid J 2025;14:e250123)',
    take: [
      ['Moment de la prise', 'Adapté au mode de vie ; jamais moins de 30 min avant aliments ou boissons ; idéalement 60 min avant le petit-déjeuner, ou au coucher, 3 h ou plus après le dîner (rec. 4, forte).'],
      ['Aliments', 'Un déséquilibre chez un patient jusque-là stable peut venir d\'un aliment ou d\'un changement d\'habitudes : refaire le bilan avant d\'augmenter la dose (rec. 5).'],
      ['Dose élevée', 'Au-delà de 1,5–1,7 µg/kg/j (thyroïde en place) ou 1,8–2,0 µg/kg/j (thyroïdectomie), toujours rechercher une mauvaise observance, voire une pseudo-malabsorption (rec. 2a) ; test d\'absorption chez les patients réfractaires, après exclusion des aliments, médicaments et comorbidités (rec. 2b).'],
      ['Médicaments', 'Interrogatoire sur tous les traitements ; arrêter le médicament interférent si possible, sinon espacer les prises ; si l\'interférence durera plus de 2 semaines, ajuster la dose pendant cette période (rec. 8).'],
      ['Comorbidités', 'Bilan des comorbidités interférentes si la dose doit changer durablement (rec. 15).'],
      ['Formes non comprimées', 'Solution buvable ou capsule molle, à dose inchangée, si la TSH reste élevée malgré une bonne utilisation (rec. 16a) ; en première intention en cas de malabsorption (16b) : chirurgie bariatrique, nourrissons et enfants, alimentation par sonde, toute altération du pH gastrique (16c).'],
      ['Changement de marque', 'Garder la même marque ; si changement, TSH et T4L à 6 semaines (rec. 3).']
    ],
    food: [
      ['Fibres alimentaires (son de blé)', 'Liaison à la LT4', 'LT4 au moins 4 h avant', ''],
      ['Soja', 'Liaison à la LT4', 'LT4 au moins 4 h avant ; éviter si possible', ''],
      ['Café (espresso, filtre)', 'Liaison à la LT4', 'LT4 au moins 1 h avant', 'capsule molle'],
      ['Thé', 'Liaison à la LT4 ?', 'LT4 au moins 1 h avant', ''],
      ['Lait', 'Calcium et protéines', 'LT4 plus de 1 à 2 h avant', ''],
      ['Jus de pamplemousse', 'Inhibition des transporteurs intestinaux de T4', 'LT4 au moins 4 h avant', ''],
      ['Papaye', 'Liaison ? alcalinisation du suc gastrique', 'LT4 au moins 4 h avant', ''],
      ['Suppléments protéiques (whey, soja)', 'Vidange gastrique retardée ? transporteurs iléaux ?', 'Plus de 4 h après la LT4 ; éviter si possible', ''],
      ['Sels de calcium (carbonate, citrate, acétate)', 'Liaison du Ca²⁺ à la LT4 à pH acide (estomac)', 'LT4 au moins 4 à 6 h avant', 'liquide ou capsule molle'],
      ['Sels de fer (sulfate, fumarate)', 'Liaison du Fe³⁺ à la LT4 à pH 7,4 (intestin)', 'LT4 au moins 4 h avant le fer', 'liquide'],
      ['Vitamine C', 'Acidifie le suc gastrique (hypochlorhydrie)', 'Favorise l\'absorption', ''],
      ['Acide nicotinique', 'Liaison de la T4 aux protéines plasmatiques ↓', 'En général pas d\'ajustement', '']
    ],
    drugs: [
      ['Antiacides, chélateurs, prokinétiques'],
      ['IPP (oméprazole, ésoméprazole, pantoprazole, lansoprazole)', 'Acidité gastrique ↓', 'LT4 au moins 4 h avant l\'IPP'],
      ['Cimétidine', 'Acidité gastrique ↓', 'Changer pour une autre molécule de la classe'],
      ['Hydroxyde d\'aluminium, de magnésium', 'Liaison de Al³⁺ / Mg²⁺ à la LT4 (intestin)', 'LT4 au moins 4 h avant'],
      ['Sucralfate', 'Liaison à la LT4', 'LT4 au moins 4 h avant'],
      ['Cholestyramine, colésévélam', 'Liaison intestinale ; cycle entéro-hépatique interrompu', 'Éviter l\'association ou espacer au maximum'],
      ['Polystyrène sulfonate de sodium, carbonate de lanthane, sévélamer', 'Liaison à la LT4', 'Éviter l\'association ou espacer au maximum'],
      ['Dompéridone, métoclopramide', 'Légère hausse de la TSH', 'Surveiller la fonction thyroïdienne'],
      ['Antiépileptiques, antipsychotiques, antidépresseurs'],
      ['Carbamazépine, phénytoïne', 'Métabolisme accéléré (± liaison protéique ↓, TSH ↓)', 'Surveiller ; augmenter la dose chez le thyroïdectomisé'],
      ['Fluoxétine, sertraline, tricycliques, phénothiazines, halopéridol', 'Mal connu ; légère hausse de la TSH', 'Surveiller la fonction thyroïdienne'],
      ['Substances hormonales ou anti-hormonales'],
      ['Œstrogènes (pilule, traitement hormonal), tamoxifène', 'Liaison protéique (TBG) ↑', 'Surveiller ; augmenter la dose'],
      ['Raloxifène', 'TBG ↑ ?', 'Éviter l\'association ou LT4 au moins 12 h avant'],
      ['Androgènes', 'Liaison protéique ↓', 'Surveiller ; réduire la dose'],
      ['Corticoïdes, analogues de la somatostatine, bromocriptine, cabergoline', 'TSH ↓ (transitoire)', 'Surveiller la fonction thyroïdienne'],
      ['Hormone de croissance, mifépristone', 'Métabolisme de la T4 ↑ ; malabsorption ?', 'Surveiller ; augmenter la dose (mifépristone)'],
      ['Antibiotiques, chimiothérapies'],
      ['Ciprofloxacine', 'Compétition pour le transporteur OATP1A2', 'Éviter l\'administration simultanée'],
      ['Rifampicine, antirétroviraux', 'Catabolisme de la T4 ↑', 'Surveiller la fonction thyroïdienne'],
      ['Inhibiteurs de tyrosine kinase (sorafénib, imatinib…), mitotane, bexarotène', 'Conversion T4 → T3 ↓, transporteurs, métabolisme ↑', 'Surveiller la fonction thyroïdienne'],
      ['Divers'],
      ['Propranolol, amiodarone', 'Conversion T4 → T3 ↓', 'Surveiller la fonction thyroïdienne'],
      ['Lovastatine', 'Catabolisme de la T4 ↑', 'Changer d\'hypolipémiant'],
      ['Furosémide, héparine, salicylés et AINS', 'Liaison protéique ↓', 'En général pas d\'ajustement'],
      ['Metformine', 'TSH ↓', 'Surveiller la fonction thyroïdienne'],
      ['Picolinate de chrome, orlistat', 'Liaison ? transporteurs, transit ?', 'LT4 au moins 4 h avant'],
      ['Siméthicone', 'Liaison à la LT4 ?', 'Éviter l\'administration simultanée'],
      ['Clofibrate', 'Liaison protéique ↑', 'Surveiller ; augmenter la dose']
    ],
    comorb: [
      ['Sclérodermie systémique', 'Dysmotilité œsophagienne', '', 'liquide'],
      ['Gastrite atrophique chronique', 'pH gastrique ↑ : besoins + 22 à 34 %', '', 'liquide ou capsule molle'],
      ['Gastrite à Helicobacter pylori', 'pH gastrique ↑ (uréase, IL-1β, TNF-α)', 'Éradication', 'liquide ou capsule molle'],
      ['Gastroparésie', 'Vidange gastrique retardée', '', 'capsule molle'],
      ['Chirurgie bariatrique', 'Restrictive : brassage, pH, vidange ; malabsorptive (bypass) : besoins × 3 à 4', '', 'liquide'],
      ['Maladie cœliaque', 'Atrophie villositaire : besoins jusqu\'à + 49 %', 'Régime sans gluten (besoins normalisés)', ''],
      ['Intolérance au lactose', 'Transit ? besoins médians + 31 %', 'Régime sans lactose', 'liquide'],
      ['Giardiase', 'Transit ?', 'Traitement de Giardia lamblia', 'liquide'],
      ['Syndrome du grêle court', 'Surface d\'absorption ↓', 'Téduglutide ?', ''],
      ['Mucoviscidose, insuffisance pancréatique exocrine', 'Stéatorrhée, bile ↓, transit', 'Enzymes pancréatiques', 'liquide'],
      ['Rectocolite hémorragique', 'Transit ?', '', ''],
      ['Cirrhose', 'TBG ↑, production et excrétion biliaires ↓', '', 'liquide'],
      ['Syndrome néphrotique', 'Perte urinaire de T4 liée à l\'albumine', '', '']
    ]
  };
})();
