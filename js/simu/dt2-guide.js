/*
 * Guide didactique du modèle DT2 : pour chaque traitement et chaque situation, ce que le modèle fait,
 * avec quels paramètres, ce qui module la réponse, et ce que l'on peut en attendre. Affiché dans le mode
 * DT2 (carte « Guide du modèle ») et repris par tools/guide-dt2.js (docs/guide-modele-dt2.md), qui y
 * ajoute les résultats simulés sur des patients types, les enchaînements et les arbres de décision.
 * Les valeurs numériques sont lues dans le modèle (S.dt2.P) pour rester à jour.
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const S = (HV.simu = HV.simu || {});
  const f = (x, d) => String(+x.toFixed(d == null ? 2 : d)).replace('.', ',');

  // Le cœur du modèle, en une cascade.
  const CORE = [
    'Action de l\'insuline IA = (réserve insulinique B × freins et stimulants de la sécrétion + insuline injectée) × sensibilité à l\'insuline × effet de la metformine.',
    'Glycémie moyenne d\'équilibre = 0,95 + 0,45 × (1/IA − 1)^0,6 g/L ; iSGLT2, acarbose et part non sécrétoire des aGLP1 retirent ensuite une fraction de l\'excès au-dessus de 1 g/L.',
    'HbA1c : formule ADAG à partir de la glycémie moyenne, constante de temps 40 jours (jugée à 3 mois) ; poids : constante de temps 75 jours.',
    'Au départ, la physiologie cachée (poids d\'équilibre, réserve B, puis sensibilité si besoin) est calée pour reproduire exactement l\'HbA1c saisie sous le traitement en cours.',
    'Glucotoxicité : au-dessus de 1,80 g/L, la sécrétion est freinée (× 1/(1 + ' + 'gtox × excès)) ; elle se lève quand l\'équilibre revient, d\'où des baisses plus fortes quand l\'HbA1c de départ est haute (+ 1 point de départ ≈ + 0,4 point de baisse).',
    'Associations : les effets ne s\'additionnent pas simplement (la metformine est atténuée en association orale et sous insuline ; activité et perte de poids partagent leurs gains).'
  ];

  // P : paramètres du modèle (S.dt2.P), G : tableau des aGLP1.
  const TREATMENTS = [
    { id: 'met', name: 'Metformine',
      how: (P) => 'Multiplie l\'action de l\'insuline par (1 + effet) : effet = ' + f(P.met) + ' × (dose/2 g)^0,7 jusqu\'à 2 g, + 12 % seulement de 2 à 3 g ; divisé par (1 + ' + f(P.metIns, 1) + ' × part d\'insuline injectée + ' + f(P.metCo, 1) + ' × effets des autres oraux).',
      mod: 'Réponse individuelle × 0,7 à 1,25 (patient réel) ; dose réellement prise (introduction progressive : + 500 mg/semaine ; arrêt par le patient si troubles digestifs) ; observance.',
      expect: 'Monothérapie 2 g : − 1,1 point (HbA1c 8,4 %) ; en ajout à un oral − 1,0 ; en ajout à l\'insuline − 0,7. 3 g au lieu de 2 g : − 0,1 à − 0,2 de plus. Poids − 1 %.',
      safety: 'Troubles digestifs (environ 15 % malgré une introduction progressive, beaucoup plus à 3 g d\'emblée) ; acidose lactique si poursuivie sous un DFG de 30.',
      refs: 'met-mono, met-addon, met-ins, met-500, met-2000' },
    { id: 'su', name: 'Sulfamide (gliclazide LM)',
      how: (P) => 'Augmente la sécrétion : B × (1 + effet), effet = ' + f(P.su) + ' × (dose/120)^' + f(P.suExp) + ' (plateau dès 30 mg) × réserve (moins efficace si la réserve est basse).',
      mod: 'Réserve insulinique (déclin annuel : échec secondaire) ; MODY HNF1A × 2,5 ; DFG < 45 et âge ≥ 75 : hypoglycémies × 1,8 à 2.',
      expect: 'Monothérapie − 1,6 point ; dose forte ≈ dose faible ; en ajout à l\'insuline − 0,2 à − 0,5. Poids + 2,5 % (moitié sous insuline).',
      safety: 'Hypoglycémies (sévères chez le sujet âgé, l\'insuffisant rénal, les repas irréguliers ; décès possible à la deuxième sévère).',
      refs: 'su-mono, su-dose, su-ins, su-addon' },
    { id: 'dpp4', name: 'iDPP4 (sitagliptine)',
      how: (P) => 'Augmente la sécrétion de façon glucodépendante : B × (1 + ' + f(P.dpp) + ' × dose/100 × facteur ethnique × glucodépendance).',
      mod: 'Origine d\'Asie de l\'Est × 1,8 ; inefficace si la glycémie est basse (pas d\'hypoglycémie) ; réserve.',
      expect: 'En ajout à la metformine − 0,55 point (− 0,9 chez un patient d\'Asie de l\'Est). Poids neutre.',
      safety: 'Pancréatite si antécédent ; association à un aGLP1 sans objet.',
      refs: 'dpp4, dpp4-asie' },
    { id: 'glp', name: 'aGLP1 (sémaglutide, dulaglutide, liraglutide) et tirzépatide',
      how: (P, G) => 'Deux composantes : sécrétoire (B × (1 + ' + f(P.glpSec) + ' × fraction de dose), liée à la réserve) et non sécrétoire (glucagon, vidange gastrique, satiété : retire ' + f(P.glpX) + ' × fraction de dose de l\'excès glycémique, y compris sous insuline). Fraction par palier : sémaglutide ' + G.sema.frac.map((x) => f(x)).join(' / ') + ' (0,25 / 0,5 / 1 mg), dulaglutide ' + G.dula.frac.map((x) => f(x)).join(' / ') + ', liraglutide ' + G.lira.frac.map((x) => f(x)).join(' / ') + ' (× ' + f(G.lira.k) + '), tirzépatide ' + G.tirz.frac.map((x) => f(x)).join(' / ') + ' (× ' + f(G.tirz.k) + ').',
      mod: 'Réponse individuelle glycémique et pondérale × 0,6 à 1,4 (patient réel) ; origine asiatique ; observance ; paliers : sauter un palier ou monter en moins de 4 semaines donne nausées puis vomissements (arrêt par le patient).',
      expect: 'Sémaglutide 1 mg : − 1,5 à − 1,8 point (en monothérapie, en ajout à la metformine ou à l\'insuline basale) ; poids − 5 kg environ sur 6 à 12 mois pour 95 kg (− 4,5 à 6,5 kg dans les essais). Tirzépatide 15 mg : − 2,1 à − 2,3 points, − 10 kg. Liraglutide 1,8 mg : − 1,1 point, − 2,5 kg. La perte de poids est plafonnée par le modèle à ce que montrent les essais chez le diabétique (moindre que dans l\'obésité sans diabète).',
      safety: 'Troubles digestifs ; pancréatite si antécédent ; aggravation d\'une rétinopathie sévère si l\'HbA1c baisse vite ; à éviter chez la personne âgée dépendante.',
      refs: 'sema-1, sema-05, sema7-1w, sema5, sema5-w, lira-18, tirz-15, tirz-5, sema-s2' },
    { id: 'sglt2', name: 'iSGLT2 (empagliflozine, dapagliflozine)',
      how: (P) => 'Retire une fraction de l\'excès glycémique au-dessus de 1 g/L : empagliflozine 25 mg ' + f(P.sglt25) + ', 10 mg et dapagliflozine ' + f(P.sglt10) + ', × (DFG − 20)/40 (nul sous 20, plein dès 60).',
      mod: 'DFG (effet glycémique faible sous 45) ; ne dépend ni de la réserve ni de l\'insuline.',
      expect: 'En ajout − 0,5 à − 0,7 point à DFG normal, − 0,4 à DFG 45. Poids − 2,5 %, PA − 4 mmHg ; ralentit le déclin du DFG (baisse initiale de 3 mL/min).',
      safety: 'Mycoses génitales ; acidocétose euglycémique (insulinopénie, LADA, régime cétogène).',
      refs: 'empa25-g2, empa10-g2, empa25-g3' },
    { id: 'acarb', name: 'Acarbose',
      how: (P) => 'Retire ' + f(P.acarb) + ' × dose/300 de l\'excès glycémique ; atténue les pics post-prandiaux.',
      mod: 'Observance.',
      expect: '− 0,8 point. Poids neutre.',
      safety: 'Troubles digestifs (non simulés).',
      refs: 'acarb' },
    { id: 'ins', name: 'Insuline basale et bolus',
      how: (P) => 'Ajoute de l\'insuline à l\'action endogène : dose / (' + f(P.insK, 1) + ' U/kg) équivaut à une sécrétion normale. La basale abaisse surtout la glycémie à jeun (jusqu\'à − 0,5 g/L) ; les bolus effacent l\'excursion de leur repas puis l\'élévation jusqu\'au repas suivant, le surplus creusant une hypoglycémie.',
      mod: 'Sensibilité à l\'insuline (IMC, poids, activité) ; titration selon le protocole (patient ou IDE) ; type de basale (U300 et dégludec : hypoglycémies × 0,7 ; NPH × 1,4).',
      expect: 'Basale titrée sur une glycémie à jeun ≤ 1,00–1,20 g/L : HbA1c ≈ 6,8–7 % avec 0,4 à 0,5 U/kg chez un DT2 obèse ; au-delà de 0,5 U/kg, la basale corrige à tort la journée (sur-basalisation). Poids + 4 % à pleine dose.',
      safety: 'Hypoglycémies (nocturnes avec la basale, post-prandiales avec les bolus) ; aggravation d\'une rétinopathie si l\'HbA1c baisse vite.',
      refs: 'basal-t2t' },
    { id: 'life', name: 'Mesures hygiéno-diététiques',
      how: (P) => 'Activité : sensibilité + 30 % à 150 min/semaine (effet seuil), + 38 % à 300. Perte de poids : sensibilité × (poids initial / poids)^' + f(P.wExp, 1) + ', et, si le diabète a moins de ' + P.wlDur + ' ans, récupération de la réserve (× 1 + ' + P.wlB + ' × perte relative × (1 − durée/' + P.wlDur + ')). Sodas : + 0,035 g/L de glycémie moyenne par verre quotidien. Gains activité-poids partagés (' + f(P.coLife, 1) + ').',
      mod: 'Motivation (atteinte des objectifs 30, 55 ou 80 %, × 1,25 avec un suivi diététique ; cachée en patient réel) ; perte de poids plafonnée à 12 %.',
      expect: 'Exercice structuré ≥ 150 min/semaine − 0,8 point ; intervention intensive (Look AHEAD) − 0,7 à − 1 point à 1 an ; diète à 10–15 kg de perte dans un diabète récent : rémission possible (DiRECT).',
      safety: 'Aucun.',
      refs: 'ex-150, ex-90, lookahead, direct' }
  ];

  const SITUATIONS = [
    ['Profil insulinorésistant (obèse)', 'Sensibilité 0,55 × (25/IMC)^0,9, déclin de la réserve 3 %/an : insuline à fortes doses, grand bénéfice de la perte de poids et des aGLP1.'],
    ['Profil insulinopénique (mince, HbA1c haute)', 'Sensibilité 0,85, déclin 8 %/an, peptide C bas : sulfamides et iDPP4 peu efficaces, insuline précoce.'],
    ['Sujet âgé (profil modéré)', 'Sensibilité 0,75, déclin 2 %/an ; hypoglycémies × 2 après 75 ans, sévères × 2,5 ; cible et plancher selon le statut gériatrique.'],
    ['LADA', 'Déclin de la réserve 50 %/an : échec rapide des oraux, cétose sans insuline, acidocétose sous iSGLT2.'],
    ['MODY HNF1A', 'Sulfamides × 2,5 dès la dose faible (hypoglycémies).'],
    ['MODY GCK', 'Glycémie de consigne calée sur l\'HbA1c, insensible aux antidiabétiques.'],
    ['Ancienneté du diabète', 'À HbA1c égale, réserve plus basse (sensibilité × 1 + 2,5 %/an, plafonnée à 20 ans) ; pas de récupération de la réserve après perte de poids au-delà de 6 ans.'],
    ['DFG', 'Metformine : acidose lactique sous 30 ; iSGLT2 : effet glycémique × (DFG − 20)/40 ; sulfamides : hypoglycémies × 1,8 sous 45 ; déclin annuel selon l\'albuminurie (0,8 / 2,5 / 5 mL/min), ralenti par iSGLT2 (÷ 2) et aGLP1 (× 0,8).'],
    ['Origine d\'Asie de l\'Est', 'iDPP4 × 1,8 ; part non sécrétoire des aGLP1 × 1,34.'],
    ['Observance et situation psychologique', 'Bonne 1 ; oublis fréquents 0,75 (traitements pris aux trois quarts, carnet plus irrégulier) ; peur de l\'hypoglycémie : observance 0,95 mais 30 % seulement des hausses de doses faites, glycémie moyenne + 0,03 g/L (+ 0,11 pendant deux semaines après un malaise : collations de sécurité) ; détresse psychologique : observance 0,65, atteinte des objectifs hygiéno-diététiques divisée par 2, une hausse sur deux faite, carnet incomplet ; patient réel 0,6 à 1.'],
    ['Travail de nuit ou posté', 'Journée physiologique décalée sur l\'horloge (nuit : + 11 h ; 2 × 8 : matin − 2 h, après-midi + 2 h 30, alternés chaque semaine ; 3 × 8 : matin, après-midi, nuit) ; 2 premiers jours d\'un nouveau poste irréguliers ; hypoglycémies × 1,2 (nuit) à × 1,6 (3 × 8) ; atteinte des objectifs hygiéno-diététiques × 0,8. Le rapport AGP, en heure d\'horloge, s\'étale ; le carnet indique le poste.'],
    ['Rétinopathie sévère ou proliférante', 'Hémorragie si l\'HbA1c baisse de 2 points en 3 mois, 1,5 sous aGLP1 ou insuline, 3,5 après photocoagulation.'],
    ['Antécédent de pancréatite, CMT, mycoses, repas irréguliers, régime cétogène', 'Pancréatite sous incrétines, mycoses sous iSGLT2, hypoglycémies × 2, acidocétose sous iSGLT2.'],
    ['Patient réel', 'Réponses individuelles cachées : metformine et aGLP1 × 0,7–1,25, perte de poids × 0,6–1,4, déclin de la réserve × 0,7–1,4, sensibilité digestive, atteinte des objectifs hygiéno-diététiques ; événements tirés au sort.']
  ];

  S.dt2guide = { CORE, TREATMENTS, SITUATIONS };
})();
