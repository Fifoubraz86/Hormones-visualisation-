/*
 * Mode « pas à pas » : pour chaque axe, la boucle de régulation racontée dans l'ordre,
 * du signal hypothalamique (ou du capteur) jusqu'à l'effet sur les cibles et au rétrocontrôle.
 * « on » liste les nœuds (id) et les liens (« source>cible » ou « source>cible>molécule ») allumés
 * à l'étape ; les étapes précédentes restent visibles, atténuées.
 */
(function () {
  'use strict';
  const HV = window.HV;
  const S = {};

  S.cortico = [
    { t: 'L\'hypothalamus sécrète la CRH', d: 'Les neurones du noyau paraventriculaire libèrent la CRH dans le système porte de la tige pituitaire. Le stress et l\'inflammation augmentent cette sécrétion, qui suit un rythme circadien (maximale en fin de nuit).', on: ['hypo'] },
    { t: 'La CRH stimule les cellules corticotropes', d: 'Par le système porte, la CRH atteint l\'antéhypophyse : les cellules corticotropes clivent la POMC et libèrent l\'ACTH (et l\'α-MSH).', on: ['hypo>pit', 'pit'] },
    { t: 'L\'ACTH stimule la corticosurrénale', d: 'L\'ACTH circule jusqu\'à la zone fasciculée : elle active StAR et les enzymes de la stéroïdogenèse. Le cortisol est produit en quelques minutes ; en excès prolongé, l\'ACTH fait grossir les surrénales.', on: ['pit>adr', 'adr'] },
    { t: 'Le cortisol agit sur ses cibles', d: 'Foie : néoglucogenèse (hyperglycémiant). Muscle : catabolisme protidique. Tissu adipeux : lipogenèse viscérale. Il est aussi anti-inflammatoire et participe au tonus vasculaire.', on: ['adr>liver', 'adr>muscle', 'adr>fat', 'liver', 'muscle', 'fat'] },
    { t: 'Rétrocontrôle négatif', d: 'Le cortisol freine la CRH et l\'ACTH. C\'est pourquoi une corticothérapie prolongée met l\'axe au repos (insuffisance corticotrope au sevrage) et pourquoi la dexaméthasone fait normalement chuter le cortisol.', on: ['adr>pit', 'adr>hypo'] },
    { t: 'Ce qui échappe à la boucle', d: 'Les androgènes surrénaliens dépendent de l\'ACTH mais ne la freinent pas. L\'inflammation stimule l\'axe indépendamment du cortisol.', on: ['adr>andro', 'andro', 'inflam', 'inflam>pit'] },
    { t: 'Et en pathologie ?', d: 'Choisissez un scénario dans le panneau (Cushing, Addison, insuffisance corticotrope) et lancez un test dynamique : Synacthène, freinage à la dexaméthasone, hypoglycémie insulinique.', on: ['levels'] }
  ];

  S.somato = [
    { t: 'Double commande hypothalamique', d: 'L\'hypothalamus sécrète la GHRH (stimulante) et la somatostatine (inhibitrice) dans le système porte.', on: ['hypo'] },
    { t: 'Sécrétion pulsatile de GH', d: 'Les cellules somatotropes libèrent la GH par pulses, surtout la nuit, dans les premières heures du sommeil.', on: ['hypo>pit', 'pit'] },
    { t: 'La GH fait produire l\'IGF-1 par le foie', d: 'La GH agit surtout par l\'IGF-1 hépatique, dont le taux est stable : c\'est le meilleur reflet de la sécrétion de GH sur 24 h.', on: ['pit>liver', 'liver'] },
    { t: 'Effets de croissance', d: 'L\'IGF-1 fait croître les cartilages de conjugaison (taille) tant qu\'ils ne sont pas soudés, ainsi que les muscles et les viscères.', on: ['liver>bone', 'liver>muscle', 'bone', 'muscle'] },
    { t: 'Rétrocontrôle négatif', d: 'L\'IGF-1 freine la GH et la GHRH (et stimule la somatostatine).', on: ['liver>pit', 'liver>hypo'] },
    { t: 'Le glucose module la GH', d: 'L\'hypoglycémie stimule la GH (hormone de contre-régulation) ; l\'hyperglycémie la freine. D\'où les deux tests : hypoglycémie insulinique pour un déficit, HGPO pour une acromégalie.', on: ['hypog', 'hypog>pit', 'hgpo', 'hgpo>pit'] }
  ];

  S.lacto = [
    { t: 'Un frein permanent : la dopamine', d: 'Les neurones dopaminergiques de l\'hypothalamus libèrent en continu la dopamine dans le système porte de la tige pituitaire.', on: ['hypo'] },
    { t: 'La dopamine freine les cellules lactotropes', d: 'La prolactine est la seule hormone antéhypophysaire sous contrôle principalement inhibiteur : sans dopamine, elle s\'élève.', on: ['hypo>pit>dopa', 'pit'] },
    { t: 'Les facteurs stimulants', d: 'La TRH et les œstrogènes (grossesse) stimulent la prolactine.', on: ['hypo>pit>trh', 'e2', 'e2>pit'] },
    { t: 'La prolactine agit sur le sein', d: 'Elle prépare et entretient la lactation.', on: ['pit>breast', 'breast'] },
    { t: 'Son excès freine la reproduction', d: 'L\'hyperprolactinémie inhibe la pulsatilité de la GnRH : aménorrhée, baisse de la libido, infertilité. Il n\'y a pas de rétrocontrôle hormonal classique dans cet axe.', on: ['pit>gnrh', 'gnrh'] },
    { t: 'Pourquoi la tige compte', d: 'Une tumeur qui comprime la tige pituitaire coupe le frein dopaminergique : la prolactine monte modérément (< 200 ng/mL), c\'est l\'hyperprolactinémie de déconnexion. Essayez le scénario correspondant.', on: ['hh'] }
  ];

  S.adh = [
    { t: 'L\'osmostat mesure l\'osmolalité', d: 'Des osmorécepteurs hypothalamiques comparent l\'osmolalité plasmatique (≈ 2 × natrémie + 10) à une consigne d\'environ 285 mosmol/kg, comme un thermostat.', on: ['osm', 'osm>hypo', 'hypo'] },
    { t: 'L\'ADH descend dans les axones', d: 'L\'ADH est fabriquée dans les corps cellulaires des noyaux supraoptiques et paraventriculaires, puis transportée le long des axones de la tige jusqu\'à la posthypophyse, où elle est stockée.', on: ['hypo>post', 'post'] },
    { t: 'L\'ADH agit sur le canal collecteur', d: 'Libérée dans le sang quand l\'osmolalité monte, l\'ADH se fixe au récepteur V2 : les aquaporines 2 s\'insèrent dans la membrane et l\'eau libre est réabsorbée. Les urines deviennent rares et concentrées.', on: ['post>kidney', 'kidney', 'kidney>urine', 'urine'] },
    { t: 'L\'eau réabsorbée ramène l\'osmolalité à la consigne', d: 'L\'eau récupérée dilue le plasma : l\'osmolalité redescend, l\'osmostat cesse de stimuler l\'ADH. C\'est le rétrocontrôle négatif de la boucle.', on: ['kidney>osm'] },
    { t: 'La soif complète le système', d: 'Un peu au-dessus du seuil de l\'ADH, la soif pousse à boire : le rein ne fait qu\'économiser l\'eau, seule la boisson remplace celle qui est perdue.', on: ['hypo>thirst', 'thirst', 'thirst>osm'] },
    { t: 'Deux autres commandes', d: 'Une hypovolémie importante stimule l\'ADH même si l\'osmolalité est normale ; aux fortes concentrations, l\'ADH devient vasoconstrictrice (V1a). Le cortisol, lui, freine l\'ADH.', on: ['baro', 'baro>hypo', 'post>vessel', 'vessel', 'cort', 'cort>hypo'] },
    { t: 'L\'ocytocine : mêmes neurones, autre histoire', d: 'L\'ocytocine suit la même voie axonale mais vise l\'utérus (contractions) et le sein (éjection du lait). Ses stimulus sont la succion du mamelon et la distension du col ; au cours du travail, les contractions augmentent la distension : rétrocontrôle positif.', on: ['oxyPanel', 'post>uterus', 'post>breast', 'uterus', 'breast', 'suck', 'suck>hypo', 'cervix', 'cervix>hypo', 'uterus>cervix'] },
    { t: 'À vous de jouer', d: 'Choisissez « Déshydratation : marche dans le désert » ou « Hyperhydratation » dans le panneau, ou lancez les situations « Charge en eau » et « Marche dans le désert » dans les tests dynamiques : regardez l\'aiguille de l\'osmostat et les urines.', on: ['levels'] }
  ];

  S.medullo = [
    { t: 'Le signal est nerveux', d: 'Les nerfs splanchniques (fibres sympathiques préganglionnaires) libèrent l\'acétylcholine sur les cellules chromaffines de la médullosurrénale.', on: ['nerve', 'nerve>med', 'med'] },
    { t: 'La biosynthèse des catécholamines', d: 'Tyrosine → L-DOPA → dopamine → noradrénaline → adrénaline. La dernière étape (PNMT) dépend du cortisol qui baigne la médullaire : c\'est pourquoi la surrénale fabrique surtout de l\'adrénaline.', on: ['chain', 'cortex', 'cortex>med'] },
    { t: 'Cœur et vaisseaux', d: 'Adrénaline et noradrénaline augmentent la fréquence cardiaque, la contractilité et la pression artérielle (vasoconstriction).', on: ['med>heart', 'heart', 'med>vessel', 'vessel'] },
    { t: 'Le foie et la glycémie', d: 'L\'adrénaline est hyperglycémiante (glycogénolyse) : elle participe à la contre-régulation de l\'hypoglycémie.', on: ['med>liver', 'liver'] },
    { t: 'Ce que l\'on dose : les métanéphrines', d: 'La COMT intracellulaire transforme en continu adrénaline, noradrénaline et dopamine en métanéphrine, normétanéphrine et 3-méthoxytyramine, même entre les paroxysmes. Comparez les scénarios de tumeur à adrénaline, à noradrénaline et à dopamine.', on: ['med>assay', 'assay', 'levels'] }
  ];

  S.gonadoF = [
    { t: 'La GnRH est pulsatile', d: 'Les neurones à GnRH, sous l\'influence des kisspeptines, libèrent la GnRH par pulses. La pulsatilité est indispensable : une GnRH continue mettrait l\'hypophyse au repos.', on: ['hypo', 'kiss', 'kiss>hypo'] },
    { t: 'LH et FSH', d: 'Les cellules gonadotropes répondent par la sécrétion de LH et de FSH.', on: ['hypo>pit', 'pit'] },
    { t: 'L\'ovaire : deux cellules, deux hormones', d: 'La LH fait produire des androgènes par la thèque interne ; la FSH fait croître le follicule et aromatiser ces androgènes en estradiol dans la granulosa.', on: ['pit>ovary', 'ovary'] },
    { t: 'Effets de l\'estradiol et de la progestérone', d: 'Endomètre, glaire, seins, os. Après l\'ovulation, le corps jaune sécrète la progestérone qui prépare l\'endomètre à la nidation.', on: ['ovary>uterus', 'uterus', 'ovary>breast', 'breast'] },
    { t: 'Un rétrocontrôle qui change de signe', d: 'L\'estradiol freine la LH et la FSH la plus grande partie du cycle. En milieu de cycle, une élévation franche et prolongée de l\'estradiol devient stimulante : c\'est le pic de LH qui déclenche l\'ovulation. Observez le signe passer de − à + vers J12–J14.', on: ['ovary>pit>e2', 'ovary>hypo'] },
    { t: 'Inhibine B et leptine', d: 'L\'inhibine B freine sélectivement la FSH. La leptine du tissu adipeux a un effet permissif : une maigreur importante éteint la GnRH (aménorrhée hypothalamique).', on: ['ovary>pit>inhib', 'lep', 'lep>hypo'] }
  ];

  S.gonadoM = [
    { t: 'La GnRH est pulsatile', d: 'Environ un pulse toutes les 90 minutes, sous l\'influence des kisspeptines.', on: ['hypo', 'kiss', 'kiss>hypo'] },
    { t: 'LH et FSH', d: 'Chaque pulse de GnRH déclenche un pulse de LH ; la FSH est plus stable.', on: ['hypo>pit', 'pit'] },
    { t: 'Le testicule : Leydig et Sertoli', d: 'La LH stimule la testostérone des cellules de Leydig ; la FSH stimule les cellules de Sertoli, qui soutiennent la spermatogenèse avec la testostérone intratesticulaire.', on: ['pit>testis', 'testis'] },
    { t: 'Effets de la testostérone', d: 'Muscle, os, érythropoïèse, libido, pilosité. Une partie est aromatisée en estradiol ou réduite en DHT (complément).', on: ['testis>muscle', 'muscle', 'testis>bone', 'bone', 'testis>brain', 'brain'] },
    { t: 'Rétrocontrôles', d: 'La testostérone freine la GnRH et la LH ; l\'inhibine B freine la FSH. Une testostérone exogène éteint donc LH, FSH et spermatogenèse.', on: ['testis>pit>testo', 'testis>hypo', 'testis>pit>inhib'] },
    { t: 'Le métabolisme compte', d: 'La leptine a un effet permissif sur la GnRH ; dénutrition, obésité sévère ou hyperprolactinémie peuvent freiner l\'axe.', on: ['lep', 'lep>hypo'] }
  ];

  S.phospho = [
    { t: 'Le capteur : le CaSR', d: 'Les cellules principales des parathyroïdes portent le récepteur sensible au calcium. Quand le calcium ionisé baisse, le CaSR est moins activé.', on: ['ca', 'para', 'ca>para'] },
    { t: 'La PTH est sécrétée', d: 'En quelques minutes, la PTH sort des granules des cellules principales.', on: ['para>kidney', 'para>bone'] },
    { t: 'Rein et os', d: 'Au rein, la PTH fait réabsorber le calcium (anse de Henlé, tube distal), excréter le phosphate et activer la 1α-hydroxylase. À l\'os, elle libère rapidement le calcium.', on: ['kidney', 'bone'] },
    { t: 'Le calcitriol et l\'intestin', d: 'Le calcitriol (1,25-(OH)₂-vitamine D) fait absorber activement le calcium par l\'intestin grêle.', on: ['kidney>gut', 'gut'] },
    { t: 'Retour à la consigne', d: 'Le calcium remonte, active le CaSR et freine la PTH : rétrocontrôle négatif.', on: ['kidney>ca', 'bone>ca', 'gut>ca'] },
    { t: 'La calcitonine, rôle mineur', d: 'Les cellules C de la thyroïde sécrètent la calcitonine, qui favorise la fixation du calcium sur l\'os ; son rôle chez l\'adulte est mineur, mais c\'est le marqueur du cancer médullaire.', on: ['ccell', 'ccell>bone'] }
  ];

  S.raa = [
    { t: 'Le rein détecte la baisse de perfusion', d: 'L\'appareil juxtaglomérulaire sécrète la rénine quand la pression de perfusion, la volémie ou le sodium délivré baissent.', on: ['jga'] },
    { t: 'De l\'angiotensinogène à l\'angiotensine II', d: 'La rénine coupe l\'angiotensinogène hépatique en angiotensine I, que l\'enzyme de conversion (poumon) transforme en angiotensine II.', on: ['jga>liver', 'liver', 'liver>lung', 'lung'] },
    { t: 'L\'aldostérone est sécrétée', d: 'L\'angiotensine II stimule la zone glomérulée ; la kaliémie aussi.', on: ['lung>adr', 'adr', 'k', 'k>adr'] },
    { t: 'Action au tube distal', d: 'L\'aldostérone fait réabsorber le sodium et excréter le potassium et les ions H⁺.', on: ['adr>tub', 'tub', 'tub>k', 'k'] },
    { t: 'Rétrocontrôle par la volémie', d: 'La rétention de sodium restaure la volémie et la pression artérielle, ce qui freine la rénine. Dans l\'hyperaldostéronisme primaire, l\'aldostérone est autonome : la rénine est effondrée.', on: ['tub>ecf', 'ecf', 'ecf>vol', 'vol', 'vol>jga'] }
  ];

  S.glyc = [
    { t: 'La glycémie, variable réglée', d: 'Elle résulte des apports (repas), de la production hépatique (glycogénolyse, néoglucogenèse) et de la consommation par les tissus.', on: ['glc', 'gut', 'gut>glc', 'liver>glc'] },
    { t: 'Les îlots détectent le glucose', d: 'Après un repas, la glycémie monte : les cellules β sécrètent l\'insuline, les cellules α freinent le glucagon.', on: ['islet', 'glc>islet'] },
    { t: 'L\'insuline fait entrer et stocker le glucose', d: 'Muscle et tissu adipeux captent le glucose (GLUT4) ; le foie freine sa production. L\'insuline freine aussi la lipolyse.', on: ['islet>liver>insulin', 'islet>muscle', 'islet>fat', 'liver', 'muscle', 'fat'] },
    { t: 'Au jeûne, le glucagon prend le relais', d: 'Quand la glycémie baisse, le glucagon mobilise le glycogène et la néoglucogenèse ; adrénaline, GH et cortisol complètent la contre-régulation.', on: ['islet>liver>glucagon', 'contre', 'contre>liver'] },
    { t: 'Si l\'insuline manque', d: 'La lipolyse libère des acides gras que le foie transforme en corps cétoniques : c\'est le mécanisme de l\'acidocétose.', on: ['fat>liver', 'liver>keto', 'keto'] },
    { t: 'Le rein, soupape de sécurité', d: 'Le glucose filtré est entièrement réabsorbé par SGLT2 au tube proximal, jusqu\'à une glycémie d\'environ 1,80 g/L : au-delà apparaît la glycosurie.', on: ['glc>kidney', 'kidney'] }
  ];

  S.lipid = [
    { t: 'Les lipides alimentaires', d: 'L\'entérocyte assemble les chylomicrons (apoB48, très riches en triglycérides), qui gagnent la lymphe puis le sang.', on: ['gut', 'gut>plasma', 'plasma'] },
    { t: 'La lipoprotéine lipase', d: 'Dans les capillaires, elle libère les acides gras des triglycérides pour le muscle et le tissu adipeux.', on: ['plasma>tissue', 'tissue'] },
    { t: 'Le foie sécrète les VLDL', d: 'L\'hépatocyte exporte ses triglycérides dans les VLDL (apoB100) ; en perdant leurs triglycérides, elles deviennent IDL puis LDL, riches en esters de cholestérol.', on: ['liver', 'liver>plasma'] },
    { t: 'Le récepteur des LDL', d: '70 % des récepteurs des LDL sont hépatiques. Le cholestérol internalisé freine l\'HMG-CoA réductase.', on: ['plasma>liver', 'liver>hmg', 'hmg'] },
    { t: 'PCSK9 dégrade le récepteur', d: 'Sécrétée par l\'hépatocyte, PCSK9 se fixe au récepteur et l\'envoie au lysosome : moins de récepteurs, LDL plasmatique ↑.', on: ['liver>pcsk9', 'pcsk9', 'pcsk9>liver'] },
    { t: 'Athérome et retour par les HDL', d: 'Les LDL en excès se déposent dans l\'intima ; les HDL ramènent le cholestérol des tissus vers le foie.', on: ['plasma>artery', 'artery', 'plasma>periph', 'periph', 'periph>liver'] }
  ];

  HV.AXES.forEach((ax) => { if (S[ax.id]) ax.steps = S[ax.id]; });
})();
