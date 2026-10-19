/*
 * Cas cliniques du patient virtuel (axe thyréotrope).
 * Chaque cas décrit le patient, ce qu'il répond à l'interrogatoire, l'examen, la grille des examens de
 * la première consultation, le diagnostic attendu, les événements intercurrents et les messages clés.
 * Sémiologie : polycopié du CEEDMM ; conduite thérapeutique : complément (voir js/simu/rules.js).
 */
(function () {
  'use strict';
  const S = window.HV.simu;
  const POLY = 'polycopié';
  const CPL = 'complément';
  const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

  // Examen clinique commun, calculé sur l'état du patient.
  function examHyper(extra) {
    return (g) => {
      const c = S.model.clinic(g.pt), s = g.pt.st;
      const out = [['Fréquence cardiaque', c.hr + '/min, régulière'], ['Poids', S.rules.fmt(c.weight, 1) + ' kg']];
      if (s.T3 > 1.4) out.push(['Mains', 'tremblement fin et rapide des extrémités, mains chaudes et moites']);
      return out.concat(extra || []);
    };
  }
  function examHypo(extra) {
    return (g) => {
      const c = S.model.clinic(g.pt), s = g.pt.st;
      const out = [['Fréquence cardiaque', c.hr + '/min'], ['Poids', S.rules.fmt(c.weight, 1) + ' kg']];
      if (s.T4 < 0.7) out.push(['Peau', 'sèche, pâle, un peu infiltrée ; cheveux secs'], ['Réflexes', 'achilléens lents (décontraction ralentie)']);
      return out.concat(extra || []);
    };
  }

  const CASES = [
    /* ------------------------------------------------------------------ */
    {
      id: 'basedow', kind: 'basedow', level: 'Débutant',
      title: 'Palpitations et amaigrissement',
      tagline: 'Maladie de Basedow typique : initier un ATS, puis adapter la dose par paliers jusqu\'à la fin de cure.',
      patient: { name: 'Mme Léa M.', sex: 'F', age: 34, job: 'professeure des écoles' },
      motif: 'Depuis deux mois, Mme M. se sent « à bout de nerfs » : palpitations, mains qui tremblent, elle a perdu 5 kg sans régime et ne supporte plus la chaleur. Son médecin traitant a dosé la TSH.',
      courrier: { text: 'Courrier du médecin traitant : « TSH < 0,01 mUI/L. Merci de votre avis. »', labs: { tsh: 0.005 } },
      atcd: ['Pas d\'antécédent notable', 'Contraception œstroprogestative', 'Non-fumeuse'],
      flags: { fertile: true },
      par: { trab: 9, trabTau: 90, weight: 62, hr0: 74 },
      questions: [
        { id: 'grossesse', q: 'Projet de grossesse ? Contraception ?', a: 'Pilule œstroprogestative, prise régulièrement ; pas de projet de grossesse dans l\'immédiat.', key: true, why: 'Le choix de l\'ATS et la contraception en dépendent.' },
        { id: 'yeux', q: 'Gêne oculaire ?', a: 'Les yeux piquent un peu le soir, l\'entourage la trouve « le regard fixe ». Pas de vision double.', key: true, why: 'Recherche d\'une orbitopathie (polycopié p. 31-32).' },
        { id: 'tabac', q: 'Tabac ?', a: 'Jamais fumé.', key: true, why: 'Le tabac est le principal facteur de risque d\'orbitopathie (polycopié p. 31).' },
        { id: 'iode', q: 'Prise d\'iode, amiodarone, examen avec produit de contraste récent ?', a: 'Non.', why: 'Causes iatrogènes de thyrotoxicose (polycopié p. 27).' },
        { id: 'asthme', q: 'Asthme ? (avant un bêtabloquant)', a: 'Non, aucun antécédent respiratoire.', key: true, why: 'Contre-indication au propranolol.' },
        { id: 'famille', q: 'Antécédents familiaux thyroïdiens ?', a: 'Sa mère est traitée pour une « thyroïde paresseuse ».', why: 'Terrain auto-immun.' },
        { id: 'cou', q: 'Douleur cervicale, fièvre récente ?', a: 'Non.', why: 'Une thyroïdite subaiguë donne un goitre douloureux (polycopié p. 27).' }
      ],
      exam: examHyper([['Pression artérielle', '138/62 mmHg (pression différentielle élargie)'], ['Thyroïde', 'goitre diffus, homogène, élastique, indolore, avec un souffle à l\'auscultation'], ['Yeux', 'rétraction palpébrale supérieure, pas d\'exophtalmie franche ni de diplopie']]),
      tests0: {
        t4: { cls: 'essential', why: 'précise l\'intensité de la thyrotoxicose et servira de référence.' },
        t3: { cls: 'useful', why: 'utile si TSH effondrée (polycopié p. 28) : forme à T3 prédominante, référence pour le suivi.', src: POLY },
        trab: { cls: 'essential', why: 'leur positivité confirme la maladie de Basedow (polycopié p. 28).', src: POLY },
        nfs: { cls: 'essential', why: 'NFS de référence avant tout ATS (agranulocytose ; une neutropénie modérée peut précéder le traitement).' },
        hepat: { cls: 'essential', why: 'bilan hépatique de référence avant ATS (hépatotoxicité).' },
        hcg: { cls: 'useful', why: 'β-hCG avant un ATS chez une femme en âge de procréer.' },
        ecg: { cls: 'useful', why: 'tachycardie : rechercher une fibrillation atriale.' },
        scinti: { cls: 'useless', why: 'inutile quand les TRAb sont positifs et le goitre diffus : on la réserve aux TRAb négatifs ou au goitre nodulaire (polycopié p. 28-29).', src: POLY },
        echo: { cls: 'useless', why: 'non indispensable devant un goitre diffus homogène sans nodule palpé.' },
        tpo: { cls: 'useless', why: 'n\'apportent rien au diagnostic de maladie de Basedow.' }
      },
      static: { tpo: 'positifs (210 UI/mL ; N < 34) — fréquents aussi dans la maladie de Basedow', hepat: 'normal', hcg: 'négatifs', ecg: (g) => 'tachycardie sinusale à ' + S.model.clinic(g.pt).hr + '/min', echo: 'goitre diffus hypoéchogène, hypervasculaire au doppler, sans nodule', scinti: 'fixation diffuse, homogène et intense (figure 9B du polycopié)', ca: '2,38 mmol/L' },
      dx: {
        options: [
          { id: 'graves', label: 'Maladie de Basedow' },
          { id: 'nodule', label: 'Adénome toxique' },
          { id: 'quervain', label: 'Thyroïdite subaiguë de De Quervain' },
          { id: 'iatro', label: 'Thyrotoxicose iatrogène' },
          { id: 'central', label: 'Hyperthyroïdie d\'origine centrale' }
        ],
        correct: 'graves',
        why: 'TSH effondrée, T4L et T3L élevées, TRAb positifs, goitre diffus vasculaire avec souffle et signes oculaires : maladie de Basedow (polycopié p. 26, 28, 31).', src: POLY
      },
      keyPoints: [
        { t: 'Le diagnostic repose sur la TSH effondrée, les hormones libres élevées et les TRAb positifs ; la scintigraphie n\'est utile que si les TRAb sont négatifs ou le goitre nodulaire.', src: POLY },
        { t: 'Avant l\'ATS : NFS et bilan hépatique de référence, information sur l\'agranulocytose (fièvre, angine → NFS en urgence et arrêt).', src: CPL },
        { t: 'Attaque : carbimazole 20 à 40 mg/j ; premier contrôle de la T4L (± T3L) à 3–4 semaines. La TSH reste freinée des semaines : ne pas s\'y fier au début.', src: CPL },
        { t: 'Dès l\'euthyroïdie, on diminue par paliers jusqu\'à 5–10 mg/j (ou on ajoute la lévothyroxine : « bloquer-substituer »). Sinon, hypothyroïdie iatrogène.', src: CPL },
        { t: 'Cure de 12 à 18 mois ; des TRAb négatifs à la fin annoncent une rémission probable.', src: CPL }
      ]
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'agranulo', kind: 'basedow', level: 'Avancé',
      title: 'Basedow, tabac et orbitopathie',
      tagline: 'Un homme fumeur avec une orbitopathie : savoir réagir à une complication grave des ATS et choisir le traitement radical.',
      patient: { name: 'M. Didier R.', sex: 'M', age: 52, job: 'chauffeur routier' },
      motif: 'M. R. consulte pour des yeux rouges et gonflés depuis trois mois, avec une vision double en regardant vers le haut. Il a maigri de 6 kg, transpire beaucoup et dort mal.',
      courrier: { text: 'Courrier de l\'ophtalmologiste : « Orbitopathie bilatérale active, probablement basedowienne. TSH < 0,01 mUI/L. »', labs: { tsh: 0.005 } },
      atcd: ['Tabagisme actif, 30 paquets-années', 'Hypertension artérielle traitée par amlodipine', 'Pas d\'asthme'],
      flags: { smoker: true, orbito: true },
      par: { trab: 11, trabTau: 200, trabFloor: 2.5, weight: 80, hr0: 76, ec50: 10 },
      questions: [
        { id: 'tabac', q: 'Tabac ?', a: 'Un paquet par jour depuis 30 ans. « J\'ai essayé d\'arrêter, sans succès. »', key: true, why: 'Principal facteur de risque d\'orbitopathie (polycopié p. 31).' },
        { id: 'yeux', q: 'Vision des couleurs, baisse d\'acuité ?', a: 'Non, il voit bien, mais double vers le haut. Larmoiement, sensation de sable.', key: true, why: 'Une baisse d\'acuité ou de la vision des couleurs ferait craindre une neuropathie optique (polycopié p. 32).' },
        { id: 'asthme', q: 'Asthme, BPCO ?', a: 'Non, pas d\'asthme ; un peu essoufflé à l\'effort.', key: true, why: 'Avant un bêtabloquant.' },
        { id: 'coeur', q: 'Palpitations irrégulières, douleur thoracique ?', a: 'Palpitations régulières, pas de douleur.', why: 'Cardiothyréose chez l\'homme de plus de 50 ans.' },
        { id: 'iode', q: 'Amiodarone, produit de contraste iodé récent ?', a: 'Non.', why: 'Thyrotoxicose iatrogène (polycopié p. 27).' }
      ],
      exam: examHyper([['Pression artérielle', '152/70 mmHg'], ['Thyroïde', 'goitre diffus, souffle systolique'], ['Yeux', 'exophtalmie bilatérale, œdème palpébral, rougeur conjonctivale, limitation de l\'élévation du regard']]),
      tests0: {
        t4: { cls: 'essential', why: 'intensité de la thyrotoxicose.' },
        t3: { cls: 'useful', why: 'référence pour le suivi (polycopié p. 28).', src: POLY },
        trab: { cls: 'essential', why: 'confirment la maladie de Basedow (polycopié p. 28).', src: POLY },
        nfs: { cls: 'essential', why: 'NFS de référence avant ATS.' },
        hepat: { cls: 'essential', why: 'bilan hépatique de référence avant ATS.' },
        ecg: { cls: 'essential', why: 'homme de plus de 50 ans tachycarde : fibrillation atriale ?' },
        scinti: { cls: 'useless', why: 'inutile quand les TRAb sont positifs (polycopié p. 28-29).', src: POLY },
        irm: { cls: 'useless', why: 'l\'imagerie orbitaire (et non hypophysaire) relève de l\'ophtalmologiste.' }
      },
      static: { hepat: 'normal', ecg: (g) => 'tachycardie sinusale à ' + S.model.clinic(g.pt).hr + '/min, pas de fibrillation atriale', echo: 'goitre diffus hypervasculaire', scinti: 'fixation diffuse et intense', tpo: 'négatifs', ca: (g) => (g.pt.flags.surgeryDone ? '2,12 mmol/L (limite basse ; contrôle à prévoir)' : '2,41 mmol/L') },
      dx: {
        options: [
          { id: 'graves', label: 'Maladie de Basedow avec orbitopathie' },
          { id: 'gmnt', label: 'Goitre multinodulaire toxique' },
          { id: 'iatro', label: 'Thyrotoxicose iatrogène' },
          { id: 'orbite', label: 'Orbitopathie isolée sans dysthyroïdie' }
        ],
        correct: 'graves',
        why: 'Thyrotoxicose avec TRAb positifs, goitre vasculaire et orbitopathie active : maladie de Basedow. L\'orbitopathie résulte de l\'auto-immunité, pas de l\'hyperthyroïdie (polycopié p. 31).', src: POLY
      },
      events: [
        {
          id: 'agranulo',
          when: (g) => S.model.atsEq(g.pt.rx) > 0 && g.pt.day - g.pt.flags.atsStart >= 33,
          title: 'Appel en urgence',
          text: (g) => 'J' + g.pt.day + ' : M. R. appelle le cabinet. Depuis hier, fièvre à 39,4 °C, mal de gorge intense, difficulté à avaler.',
          choices: [
            { label: 'Arrêt immédiat de l\'ATS, NFS en urgence', tone: 'good', text: 'Bon réflexe : sous ATS, fièvre ou angine = NFS en urgence et arrêt du traitement.', effect: (g) => { g.pt.st.pnn = 0.18; g.forceStopATS = true; g.noATS = true; g.eventLabs = { pnn: 0.18 }; g.eventNote = 'NFS : polynucléaires neutrophiles 0,18 G/L : agranulocytose. Hospitalisation, antibiothérapie à large spectre, contre-indication définitive à tous les ATS (réaction croisée).'; } },
            { label: 'Antibiotique, poursuite du carbimazole', tone: 'bad', pen: 5, text: 'Faute grave : sous ATS, une angine fébrile impose la NFS en urgence et l\'arrêt de l\'ATS. L\'agranulocytose expose au choc septique.', effect: (g) => { g.pt.st.pnn = 0.1; g.forceStopATS = true; g.noATS = true; g.eventLabs = { pnn: 0.1 }; g.eventNote = 'Admission en réanimation 48 h plus tard pour sepsis : PNN 0,10 G/L. Agranulocytose ; ATS définitivement contre-indiqués.'; } },
            { label: 'Paracétamol, revoir dans une semaine', tone: 'bad', pen: 5, text: 'Faute grave : l\'agranulocytose se recherche en urgence.', effect: (g) => { g.pt.st.pnn = 0.1; g.forceStopATS = true; g.noATS = true; g.eventLabs = { pnn: 0.1 }; g.eventNote = 'Hospitalisé en urgence pour sepsis : PNN 0,10 G/L. Agranulocytose ; ATS définitivement contre-indiqués.'; } }
          ]
        }
      ],
      keyPoints: [
        { t: 'Orbitopathie : liée à l\'auto-immunité (récepteurs de la TSH orbitaires), aggravée par le tabac ; signes de gravité : baisse d\'acuité, de la vision des couleurs (neuropathie optique).', src: POLY },
        { t: 'Sous ATS, fièvre ou angine = NFS en urgence et arrêt. L\'agranulocytose (PNN < 0,5 G/L) contre-indique définitivement tous les ATS.', src: CPL },
        { t: 'Traitement radical : thyroïdectomie totale, préférée à l\'iode 131 en cas d\'orbitopathie active (l\'iode peut l\'aggraver, surtout chez le fumeur).', src: CPL },
        { t: 'Après thyroïdectomie totale : lévothyroxine à dose substitutive (≈ 1,6 µg/kg/j), calcémie (hypoparathyroïdie), TSH à 6–8 semaines.', src: CPL }
      ]
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'basedow-grossesse', kind: 'basedow', level: 'Avancé',
      title: 'Hyperthyroïdie à 7 semaines de grossesse',
      tagline: 'Distinguer Basedow et thyrotoxicose gestationnelle, choisir la bonne molécule au 1er trimestre, viser le haut de la normale.',
      patient: { name: 'Mme Sarah B.', sex: 'F', age: 29, job: 'infirmière' },
      motif: 'Enceinte de 7 semaines d\'aménorrhée (première grossesse), Mme B. a des palpitations et a perdu 3 kg. Elle n\'a pas de vomissements importants. Sa sage-femme a dosé la TSH.',
      courrier: { text: 'Bilan de la sage-femme : « TSH < 0,01 mUI/L à 6 SA. »', labs: { tsh: 0.005 } },
      atcd: ['Aucun', 'Grossesse spontanée, désirée', 'Non-fumeuse'],
      flags: { fertile: true },
      pregWeek: (day) => 7 + day / 7,
      par: { trab: 6.5, trabTau: 70, weight: 60, hr0: 80 },
      questions: [
        { id: 'vomit', q: 'Nausées, vomissements ?', a: 'Quelques nausées le matin, pas de vomissements.', key: true, why: 'Des vomissements incoercibles orienteraient vers une thyrotoxicose gestationnelle transitoire (polycopié p. 27).' },
        { id: 'avant', q: 'Symptômes avant la grossesse ?', a: 'Oui, elle se sentait déjà nerveuse et transpirait beaucoup depuis 4 mois.', key: true, why: 'Des signes antérieurs à la grossesse plaident pour une maladie de Basedow.' },
        { id: 'yeux', q: 'Signes oculaires ?', a: 'Elle trouve ses yeux plus « ouverts » qu\'avant.', why: 'Orbitopathie : spécifique de la maladie de Basedow (polycopié p. 31).' },
        { id: 'asthme', q: 'Asthme ?', a: 'Non.', why: 'Avant un bêtabloquant.' }
      ],
      exam: examHyper([['Pression artérielle', '122/64 mmHg'], ['Thyroïde', 'goitre diffus avec souffle'], ['Yeux', 'rétraction palpébrale discrète']]),
      tests0: {
        t4: { cls: 'essential', why: 'intensité de la thyrotoxicose.' },
        t3: { cls: 'useful', why: 'complète la T4L (polycopié p. 28).', src: POLY },
        trab: { cls: 'essential', why: 'positifs : maladie de Basedow, et non thyrotoxicose gestationnelle transitoire liée à l\'hCG (polycopié p. 27-28). Ils passent le placenta.', src: POLY },
        nfs: { cls: 'essential', why: 'NFS de référence avant ATS.' },
        hepat: { cls: 'essential', why: 'bilan hépatique de référence, d\'autant que le PTU est hépatotoxique.' },
        scinti: { cls: 'useless', why: 'contre-indiquée pendant la grossesse.', },
        echo: { cls: 'useless', why: 'n\'aide pas à la décision ici.' }
      },
      static: { hepat: 'normal', hcg: 'positifs, grossesse évolutive', ecg: (g) => 'tachycardie sinusale à ' + S.model.clinic(g.pt).hr + '/min', echo: 'goitre diffus hypervasculaire', scinti: 'non réalisée : contre-indiquée pendant la grossesse', tpo: 'positifs', ca: '2,30 mmol/L' },
      dx: {
        options: [
          { id: 'graves', label: 'Maladie de Basedow' },
          { id: 'gest', label: 'Thyrotoxicose gestationnelle transitoire (hCG)' },
          { id: 'mole', label: 'Môle hydatiforme' },
          { id: 'physio', label: 'Variation physiologique de la grossesse' }
        ],
        correct: 'graves',
        why: 'Signes antérieurs à la grossesse, goitre vasculaire, signes oculaires et TRAb positifs : maladie de Basedow. La thyrotoxicose gestationnelle transitoire se voit au 1er trimestre avec des vomissements incoercibles, TRAb négatifs (polycopié p. 27).', src: POLY
      },
      keyPoints: [
        { t: 'Hyperthyroïdie au 1er trimestre : les TRAb distinguent la maladie de Basedow de la thyrotoxicose gestationnelle transitoire (hCG, vomissements).', src: POLY },
        { t: 'Hyperthyroïdie maternelle : fausse couche, pré-éclampsie, retard de croissance, prématurité.', src: POLY },
        { t: 'PTU au 1er trimestre (le carbimazole est tératogène), à la plus faible dose efficace, T4L visée dans le haut de la normale : les ATS traversent le placenta.', src: CPL },
        { t: 'Contrôle toutes les 2 à 4 semaines ; la maladie s\'atténue souvent au 2e et 3e trimestre (doses réduites, parfois arrêtées). TRAb au 2e–3e trimestre : risque fœtal et néonatal.', src: CPL }
      ],
      endAt: (g) => g.case.pregWeek(g.pt.day) >= 34 ? 'Grossesse arrivée à 34 SA : le suivi se poursuit avec l\'équipe obstétricale et la surveillance du nouveau-né.' : null
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'hashimoto', kind: 'lt4', level: 'Débutant',
      title: 'Fatigue et frilosité',
      tagline: 'Hypothyroïdie primaire de l\'adulte : dose substitutive, contrôle à 6–8 semaines, et une TSH qui remonte sans raison apparente…',
      patient: { name: 'Mme Nadia R.', sex: 'F', age: 46, job: 'comptable' },
      motif: 'Mme R. est épuisée depuis six mois : elle a froid en permanence, a pris 4 kg, est constipée et a la peau sèche. Son médecin a fait un bilan.',
      courrier: { text: 'Bilan du médecin traitant : « TSH 64 mUI/L, T4L 7,8 pmol/L. »', labs: { tsh: 64, t4: 7.8 } },
      atcd: ['Vitiligo', 'Ménométrorragies (bilan gynécologique en cours)', 'Pas de cardiopathie'],
      flags: { fertile: false },
      interaction: true,
      minDay: 220,
      par: { r: 0.14, weight: 68, hr0: 72 },
      questions: [
        { id: 'coeur', q: 'Douleur thoracique, antécédents cardiaques ?', a: 'Aucun. Elle marche une heure par jour sans gêne.', key: true, why: 'Sans cardiopathie, la dose substitutive peut être donnée d\'emblée.' },
        { id: 'medic', q: 'Médicaments ?', a: 'Aucun pour l\'instant. Son gynécologue envisage un traitement martial.', key: true, why: 'Le fer, le calcium, les IPP diminuent l\'absorption de la lévothyroxine.' },
        { id: 'iode', q: 'Amiodarone, lithium, examen iodé récent ?', a: 'Non.', why: 'Causes médicamenteuses d\'hypothyroïdie (polycopié p. 23).' },
        { id: 'grossesse', q: 'Projet de grossesse ?', a: 'Non ; ligature des trompes il y a 5 ans.', why: 'La cible et la dose changent pendant la grossesse.' },
        { id: 'famille', q: 'Maladies auto-immunes familiales ?', a: 'Une sœur diabétique de type 1.', why: 'Terrain auto-immun.' }
      ],
      followQuestions: [
        { id: 'observance', q: 'Comment prenez-vous le traitement ? Nouveaux médicaments ?', a: (g) => (g.interactionActive ? 'Depuis quelques mois, son gynécologue lui a prescrit du fer : elle le prend chaque matin en même temps que sa lévothyroxine, au petit-déjeuner.' : 'Tous les matins à jeun, 30 minutes avant le petit-déjeuner. Pas de nouveau médicament.') }
      ],
      exam: examHypo([['Pression artérielle', '128/84 mmHg'], ['Thyroïde', 'goitre modéré, ferme, hétérogène, indolore']]),
      tests0: {
        tpo: { cls: 'essential', why: 'élevés, ils font retenir la maladie de Hashimoto, sans répéter le dosage (polycopié p. 23).', src: POLY },
        t3: { cls: 'useless', why: 'inutile dans l\'hypothyroïdie (polycopié p. 22).', src: POLY },
        scinti: { cls: 'useless', why: 'inutile devant une hypothyroïdie (polycopié).', src: POLY },
        echo: { cls: 'useless', why: 'pas systématique : seulement si la palpation trouve un nodule.' },
        trab: { cls: 'useless', why: 'sans intérêt devant une hypothyroïdie primaire.' },
        ecg: { cls: 'useful', why: 'bradycardie, troubles de repolarisation ; référence avant traitement.' },
        tsh: { cls: 'useful', why: 'déjà dosée : un 2e dosage confirme avant traitement.' }
      },
      static: { tpo: 'très élevés (1 250 UI/mL ; N < 34)', hepat: 'normal', ecg: (g) => 'bradycardie sinusale à ' + S.model.clinic(g.pt).hr + '/min, microvoltage', echo: 'thyroïde hypoéchogène, hétérogène, sans nodule', scinti: 'hypofixation hétérogène (examen inutile)', nfs: 'Hb 10,9 g/dL (anémie ferriprive), PNN 3,4 G/L' },
      dx: {
        options: [
          { id: 'hashi', label: 'Hypothyroïdie primaire : maladie de Hashimoto' },
          { id: 'central', label: 'Hypothyroïdie centrale' },
          { id: 'sub', label: 'Hypothyroïdie infraclinique' },
          { id: 'nti', label: 'Syndrome de basse T3' }
        ],
        correct: 'hashi',
        why: 'TSH très élevée, T4L basse, goitre ferme et hétérogène, anti-TPO élevés : maladie de Hashimoto (polycopié p. 19, 21-23).', src: POLY
      },
      events: [
        { id: 'fer', silent: true, when: (g) => g.pt.day >= 120 && g.pt.rx.lt4 > 0, effect: (g) => { g.pt.par.abs = 0.6; g.interactionActive = true; } }
      ],
      keyPoints: [
        { t: 'Hypothyroïdie primaire : TSH élevée, T4L basse ; les anti-TPO élevés font retenir la maladie de Hashimoto. T3L et scintigraphie inutiles.', src: POLY },
        { t: 'Sans cardiopathie, dose substitutive ≈ 1,6 µg/kg/j d\'emblée ou rapidement atteinte, à jeun, à distance du fer, du calcium et des IPP.', src: CPL },
        { t: 'TSH 6 à 8 semaines après chaque changement de dose (demi-vie de la T4 ≈ 7 jours) ; paliers de 12,5 à 25 µg.', src: CPL },
        { t: 'TSH qui remonte chez un patient équilibré : observance, horaire de prise, interactions (fer, calcium, IPP), grossesse, avant d\'augmenter la dose.', src: CPL }
      ]
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'age', kind: 'lt4', level: 'Intermédiaire',
      title: 'Hypothyroïdie chez un coronarien de 78 ans',
      tagline: 'Commencer bas, monter lentement : la lévothyroxine peut démasquer un angor.',
      patient: { name: 'M. Georges L.', sex: 'M', age: 78, job: 'agriculteur retraité' },
      motif: 'M. L. est ralenti depuis un an selon sa fille : il somnole, a froid, a pris du poids. Il a eu un infarctus il y a 6 ans (stent). Un bilan a été fait par son médecin.',
      courrier: { text: 'Bilan du médecin traitant : « TSH 41 mUI/L, T4L 6,9 pmol/L. Anti-TPO positifs. »', labs: { tsh: 41, t4: 6.9 } },
      atcd: ['Infarctus du myocarde (stent il y a 6 ans)', 'Angor d\'effort stable', 'Traitement : aspirine, bisoprolol, atorvastatine'],
      flags: { elderly: true, coronary: true },
      minDay: 160,
      par: { r: 0.1, weight: 72, hr0: 64 },
      questions: [
        { id: 'coeur', q: 'Douleurs thoraciques actuellement ?', a: 'Une gêne thoracique à la montée rapide d\'un escalier, connue, inchangée.', key: true, why: 'Coronaropathie : débuter à très faible dose.' },
        { id: 'medic', q: 'Médicaments ?', a: 'Aspirine, bisoprolol, atorvastatine. Pas d\'amiodarone.', key: true, why: 'Amiodarone : cause d\'hypothyroïdie (polycopié p. 23).' },
        { id: 'cognition', q: 'Mémoire, autonomie ?', a: 'Il vit seul, autonome, mais « oublie plus ».', why: 'Le ralentissement psychique de l\'hypothyroïdie peut mimer un déclin cognitif.' }
      ],
      exam: examHypo([['Pression artérielle', '146/88 mmHg'], ['Thyroïde', 'non palpable'], ['Cœur', 'bruits assourdis, pas de souffle']]),
      tests0: {
        tpo: { cls: 'useless', why: 'déjà positifs : inutile de les redoser (polycopié p. 23).', src: POLY },
        ecg: { cls: 'essential', why: 'coronarien : ECG de référence avant de débuter la lévothyroxine.' },
        t3: { cls: 'useless', why: 'inutile dans l\'hypothyroïdie (polycopié p. 22).', src: POLY },
        scinti: { cls: 'useless', why: 'inutile devant une hypothyroïdie (polycopié).', src: POLY },
        tsh: { cls: 'useful', why: 'un 2e dosage confirme avant traitement.' },
        t4: { cls: 'useful', why: 'confirme l\'hypothyroïdie avérée.' }
      },
      static: { tpo: 'positifs (déjà connus)', hepat: 'normal', ecg: (g) => 'rythme sinusal à ' + S.model.clinic(g.pt).hr + '/min, séquelle de nécrose inférieure, pas de modification récente', scinti: 'hypofixation (examen inutile)', echo: 'thyroïde atrophique, hétérogène' },
      dx: {
        options: [
          { id: 'atro', label: 'Hypothyroïdie primaire auto-immune' },
          { id: 'central', label: 'Hypothyroïdie centrale' },
          { id: 'demence', label: 'Syndrome démentiel, bilan thyroïdien sans valeur' },
          { id: 'amio', label: 'Hypothyroïdie à l\'amiodarone' }
        ],
        correct: 'atro',
        why: 'TSH élevée, T4L basse, anti-TPO positifs, thyroïde non palpable : hypothyroïdie primaire auto-immune, ici probablement une thyroïdite atrophique (polycopié p. 19, 22).', src: POLY
      },
      events: [
        {
          id: 'angor',
          when: (g) => { const f = g.pt.flags; return !g.anginaDone && g.pt.rx.lt4 > 0 && f.lastChange != null && g.pt.day - f.lastChange >= 10 && g.pt.rx.lt4 - (f.prevLt4 || 0) > 25; },
          title: 'Consultation non programmée',
          text: (g) => 'J' + g.pt.day + ' : M. L. revient, inquiet : depuis quelques jours, la douleur thoracique survient pour des efforts moindres (en marchant sur le plat). Elle cède au repos.',
          choices: [
            { label: 'Revenir au palier inférieur, avis cardiologique rapide', tone: 'good', text: 'Angor aggravé par l\'augmentation trop rapide de la lévothyroxine : on réduit, on fait évaluer la coronaropathie, puis on remonte très progressivement.', effect: (g) => { g.anginaDone = true; g.pt.rx.lt4 = Math.max(12.5, Math.min(25, g.pt.flags.prevLt4 || 25)); g.pt.flags.lastChange = g.pt.day; g.eventNote = 'Lévothyroxine ramenée à ' + g.pt.rx.lt4 + ' µg/j. Le cardiologue adapte le traitement anti-angineux.'; } },
            { label: 'Rassurer et poursuivre la même dose', tone: 'bad', pen: 4, text: 'Un angor qui s\'aggrave sous lévothyroxine impose de réduire la dose et d\'évaluer le cœur : risque de syndrome coronarien aigu.', effect: (g) => { g.anginaDone = true; g.pt.rx.lt4 = 25; g.pt.flags.lastChange = g.pt.day; g.eventNote = 'Deux jours plus tard, syndrome coronarien aigu : coronarographie, nouveau stent. La lévothyroxine est reprise à 25 µg/j par le cardiologue.'; } },
            { label: 'Arrêter définitivement la lévothyroxine', tone: 'warn', text: 'L\'hypothyroïdie doit quand même être traitée : on réduit la dose et on remonte plus lentement, sous couvert cardiologique.', effect: (g) => { g.anginaDone = true; g.pt.rx.lt4 = 0; g.pt.flags.lastChange = g.pt.day; g.eventNote = 'Lévothyroxine arrêtée : l\'hypothyroïdie va réapparaître.'; } }
          ]
        }
      ],
      keyPoints: [
        { t: 'Sujet âgé ou coronarien : lévothyroxine 12,5 à 25 µg/j, puis paliers de 12,5 à 25 µg toutes les 6 à 8 semaines.', src: CPL },
        { t: 'Toute aggravation d\'un angor sous lévothyroxine : réduire la dose, avis cardiologique.', src: CPL },
        { t: 'Cible de TSH plus tolérante chez le sujet très âgé ; éviter surtout le surdosage (fibrillation atriale, ostéoporose).', src: CPL },
        { t: 'Anti-TPO déjà positifs : ne pas les redoser (polycopié p. 23).', src: POLY }
      ]
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'infraclinique', kind: 'subclin', level: 'Débutant',
      title: 'TSH à 7,2 de découverte fortuite',
      tagline: 'Hypothyroïdie infraclinique : confirmer, chercher les anti-TPO, ne pas traiter par réflexe.',
      patient: { name: 'Mme Thérèse V.', sex: 'F', age: 58, job: 'pharmacienne' },
      motif: 'Mme V. vient pour un résultat : TSH à 7,2 mUI/L sur un bilan de routine. Elle se sent bien, juste « un peu fatiguée comme tout le monde ».',
      courrier: { text: 'Bilan de routine : « TSH 7,2 mUI/L. »', labs: { tsh: 7.2 } },
      atcd: ['Ménopausée depuis 6 ans', 'Pas de traitement', 'Pas de cardiopathie'],
      flags: {},
      par: { r: 0.5, weight: 64 },
      questions: [
        { id: 'sympt', q: 'Frilosité, constipation, prise de poids ?', a: 'Non, rien de particulier.', key: true, why: 'Peu ou pas de symptômes : argument contre un traitement.' },
        { id: 'iode', q: 'Examen iodé récent, amiodarone, lithium ?', a: 'Non.', key: true, why: 'Causes d\'hypothyroïdie transitoire ou médicamenteuse (polycopié p. 23).' },
        { id: 'maladie', q: 'Maladie aiguë récente ?', a: 'Non.', why: 'La TSH peut remonter transitoirement à la phase de récupération d\'une maladie aiguë.' }
      ],
      exam: examHypo([['Pression artérielle', '124/78 mmHg'], ['Thyroïde', 'non palpable']]),
      tests0: {},
      static: { tpo: 'positifs (180 UI/mL ; N < 34)', hepat: 'normal', ecg: 'rythme sinusal à 68/min', echo: 'thyroïde de taille normale, discrètement hypoéchogène', scinti: 'inutile' },
      dx: {
        options: [
          { id: 'sub', label: 'Hypothyroïdie infraclinique à confirmer' },
          { id: 'hashi', label: 'Hypothyroïdie avérée à traiter' },
          { id: 'central', label: 'Hypothyroïdie centrale' },
          { id: 'eu', label: 'Bilan normal' }
        ],
        correct: 'sub',
        why: 'TSH modérément élevée (4–10 mUI/L) chez une patiente peu symptomatique : hypothyroïdie infraclinique possible, à confirmer sur un 2e dosage à 6–8 semaines avec T4L et anti-TPO (polycopié).', src: POLY
      },
      noTestsStep: true,
      keyPoints: [
        { t: 'Une TSH modérément élevée (4–10 mUI/L) se contrôle à 6–8 semaines avant toute décision.', src: POLY },
        { t: 'T4L normale = hypothyroïdie infraclinique ; anti-TPO positifs = origine auto-immune, risque d\'évolution vers l\'hypothyroïdie avérée.', src: POLY },
        { t: 'Pas de traitement systématique si TSH < 10 mUI/L, peu de symptômes et pas de projet de grossesse ; TSH tous les 6 à 12 mois.', src: CPL }
      ],
      endAt: (g) => (g.visits.length >= 2 ? 'Surveillance mise en place.' : null)
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'grossesse-lt4', kind: 'lt4', level: 'Intermédiaire',
      title: 'Sous lévothyroxine, test de grossesse positif',
      tagline: 'Augmenter la dose dès le début de la grossesse, viser une TSH < 2,5, revenir à la dose antérieure après l\'accouchement.',
      patient: { name: 'Mme Karima H.', sex: 'F', age: 31, job: 'ingénieure' },
      motif: 'Mme H., traitée depuis 3 ans pour une maladie de Hashimoto par lévothyroxine 75 µg/j (dernière TSH à 1,8 mUI/L), appelle : son test de grossesse est positif, elle est à 5 semaines d\'aménorrhée.',
      atcd: ['Maladie de Hashimoto (anti-TPO positifs) depuis 3 ans', 'Lévothyroxine 75 µg/j', 'Première grossesse'],
      flags: { fertile: true },
      preDose: 75,
      rx0: { lt4: 75 },
      pregWeek: (day) => 5 + day / 7,
      postpartum: (day) => 5 + day / 7 >= 40,
      skipInit: true,
      par: { r: 0.12, weight: 60, need: (day) => { const w = 5 + day / 7; return w >= 40 ? 1 : 1 + 0.4 * smooth((w - 4) / 12); } },
      questions: [
        { id: 'prise', q: 'Comment prenez-vous la lévothyroxine ?', a: 'Le matin à jeun. Elle prend aussi de l\'acide folique depuis 2 mois.', key: true, why: 'Vérifier les conditions de prise avant d\'adapter.' },
        { id: 'nausees', q: 'Nausées, vomissements ?', a: 'Quelques nausées, elle garde ses comprimés.', why: 'Des vomissements peuvent gêner l\'absorption.' }
      ],
      exam: examHypo([['Pression artérielle', '112/68 mmHg'], ['Thyroïde', 'goitre discret, ferme']]),
      static: { tpo: 'positifs (connus)', hcg: 'positifs, grossesse évolutive', hepat: 'normal', ecg: 'normal' },
      events: [
        { id: 'accouchement', when: (g) => g.case.pregWeek(g.pt.day) >= 40, title: 'Accouchement', text: (g) => 'J' + g.pt.day + ' : Mme H. a accouché à terme d\'un garçon en bonne santé. Elle vous appelle de la maternité : quelle dose de lévothyroxine maintenant ?', choices: null }
      ],
      keyPoints: [
        { t: 'Dès la grossesse confirmée : augmenter la lévothyroxine de 25 à 30 % (par exemple 2 comprimés de plus par semaine, ou + 25 µg/j).', src: CPL },
        { t: 'TSH toutes les 4 semaines jusqu\'à mi-grossesse ; cible < 2,5 mUI/L au 1er trimestre.', src: CPL },
        { t: 'Grossesse : situation à risque d\'apports iodés insuffisants (polycopié p. 10).', src: POLY },
        { t: 'Après l\'accouchement : retour à la dose antérieure, TSH à 6 semaines.', src: CPL }
      ],
      endAt: (g) => (g.ppDone && g.visits.length && g.pt.day - 245 >= 35 ? 'Post-partum : la patiente a retrouvé sa dose habituelle.' : null)
    },
    /* ------------------------------------------------------------------ */
    {
      id: 'central', kind: 'central', level: 'Avancé',
      title: 'T4L basse, TSH normale',
      tagline: 'Hypothyroïdie centrale : penser à l\'axe corticotrope avant la lévothyroxine, adapter sur la T4L et non sur la TSH.',
      patient: { name: 'M. Paul F.', sex: 'M', age: 45, job: 'agent immobilier' },
      motif: 'M. F. se plaint de fatigue, de frilosité et d\'une baisse de la libido. Il a des céphalées depuis un an et trouve qu\'il « se cogne dans les portes ». Son médecin a dosé TSH et T4L.',
      courrier: { text: 'Bilan du médecin traitant : « TSH 1,2 mUI/L, T4L 8,1 pmol/L. TSH normale : euthyroïdie ? »', labs: { tsh: 1.2, t4: 8.1 } },
      atcd: ['Aucun antécédent', 'Pas de traitement'],
      flags: {},
      adrenalInsuff: true,
      minDay: 100,
      par: { pit: 0.07, weight: 80, hr0: 70 },
      questions: [
        { id: 'vision', q: 'Troubles visuels ?', a: 'Il heurte les objets sur les côtés ; il n\'a pas consulté.', key: true, why: 'Hémianopsie bitemporale : compression du chiasma par un macroadénome.' },
        { id: 'malaise', q: 'Malaises, nausées, perte d\'appétit ?', a: 'Oui, des nausées et des malaises en se levant, il a perdu 3 kg.', key: true, why: 'Signes d\'insuffisance corticotrope associée.' },
        { id: 'libido', q: 'Libido, érections ?', a: 'Baisse nette depuis un an.', why: 'Insuffisance gonadotrope associée.' },
        { id: 'medic', q: 'Médicaments, corticoïdes ?', a: 'Aucun.', why: 'Une corticothérapie freine l\'axe corticotrope.' }
      ],
      exam: examHypo([['Pression artérielle', '102/64 mmHg couché, 88/56 debout'], ['Peau', 'pâle, dépilation'], ['Thyroïde', 'non palpable'], ['Champ visuel au doigt', 'amputation temporale bilatérale']]),
      tests0: {
        t4: { cls: 'essential', why: 'T4L basse : seul marqueur fiable d\'une hypothyroïdie centrale.' },
        cortisol: { cls: 'essential', why: 'évaluer l\'axe corticotrope AVANT la lévothyroxine : sinon risque d\'insuffisance surrénale aiguë.' },
        irm: { cls: 'essential', why: 'TSH inadaptée à une T4L basse et troubles visuels : lésion hypothalamo-hypophysaire.' },
        tsh: { cls: 'useful', why: 'confirme qu\'elle est inadaptée (normale face à une T4L basse).' },
        t3: { cls: 'useless', why: 'n\'apporte rien.' },
        tpo: { cls: 'useless', why: 'orientent vers une cause périphérique, hors sujet ici.' },
        scinti: { cls: 'useless', why: 'inutile.' },
        echo: { cls: 'useless', why: 'la glande n\'est pas en cause.' }
      },
      static: { cortisol: '85 nmol/L à 8 h (bas) : insuffisance corticotrope', irm: 'macroadénome hypophysaire de 28 mm, contact avec le chiasma optique', tpo: 'négatifs', hepat: 'normal', ecg: 'rythme sinusal, microvoltage', nfs: 'Hb 11,8 g/dL', echo: 'thyroïde normale', scinti: 'inutile' },
      dx: {
        options: [
          { id: 'central', label: 'Hypothyroïdie centrale (insuffisance antéhypophysaire)' },
          { id: 'eu', label: 'Euthyroïdie (TSH normale)' },
          { id: 'hashi', label: 'Hypothyroïdie primaire débutante' },
          { id: 'nti', label: 'Syndrome de basse T3' }
        ],
        correct: 'central',
        why: 'T4L basse avec une TSH normale : la TSH est inadaptée, l\'hypothyroïdie est centrale (polycopié p. 23-24). Céphalées, hémianopsie et autres déficits orientent vers un macroadénome.', src: POLY
      },
      events: [
        {
          id: 'isa',
          when: (g) => !g.isaDone && g.pt.rx.lt4 > 0 && !g.pt.rx.hc && g.pt.day >= 4,
          title: 'Urgence',
          text: (g) => 'J' + g.pt.day + ' : M. F. est amené aux urgences : vomissements, douleurs abdominales, confusion, PA 78/45 mmHg. Natrémie 124 mmol/L.',
          choices: [
            { label: 'Hydrocortisone injectable en urgence, remplissage, hospitalisation', tone: 'good', text: 'Insuffisance surrénale aiguë déclenchée par la lévothyroxine (elle accélère le catabolisme du cortisol) : hydrocortisone en urgence.', effect: (g) => { g.isaDone = true; g.pt.rx.hc = true; g.hcGiven = true; g.eventNote = 'Évolution favorable sous hydrocortisone. Relais oral par hydrocortisone 20 mg/j.'; } },
            { label: 'Augmenter la lévothyroxine', tone: 'bad', pen: 5, text: 'Contresens : c\'est le cortisol qui manque ; la lévothyroxine a précipité la crise.', effect: (g) => { g.isaDone = true; g.pt.rx.hc = true; g.hcGiven = true; g.eventNote = 'Le réanimateur administre l\'hydrocortisone. Relais oral par hydrocortisone 20 mg/j.'; } }
          ]
        }
      ],
      keyPoints: [
        { t: 'T4L basse et TSH normale ou basse : hypothyroïdie centrale ; la TSH est inadaptée (polycopié).', src: POLY },
        { t: 'Avant la lévothyroxine, évaluer l\'axe corticotrope : l\'hydrocortisone précède la lévothyroxine en cas d\'insuffisance corticotrope.', src: CPL },
        { t: 'Suivi sur la T4L, visée dans la moitié supérieure de la normale ; la TSH n\'est pas interprétable.', src: CPL },
        { t: 'Bilan de l\'hypophyse : IRM, autres axes, champ visuel.', src: POLY }
      ]
    }
  ];

  S.CASES = CASES;
})();
