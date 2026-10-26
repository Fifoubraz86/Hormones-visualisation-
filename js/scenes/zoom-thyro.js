/* Loupes de l'axe thyréotrope : embryologie, anatomie chirurgicale, désiodases, nodule (EU-TIRADS, Bethesda),
   grossesse, auto-immunité. Polycopié CEEDMM (partie 1) cité par page du PDF ; le reste est marqué « (complément) ». */
(function () {
  'use strict';
  const HV = window.HV;
  const clamp = HV.clamp;
  const M = HV.model;
  const S = M.s, P = M.p;
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const fmt = (v, d) => v.toFixed(d).replace('.', ',');

  // Générateur pseudo-aléatoire déterministe
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  /* Bouton cliquable dans une scène : n'agit que si la scène est la scène courante (sinon le clic fait entrer). */
  function button(a, def, parent, x, y, w, label, onTap, info) {
    const g = a.el('g', { class: 'zt-btn', transform: `translate(${x} ${y})`, 'data-info': info || null }, parent);
    a.el('rect', { x: 0, y: 0, width: w, height: 38, rx: 19 }, g);
    a.text(w / 2, 25, label, null, { anchor: 'middle' }, g);
    g.addEventListener('pointerdown', (e) => {
      if (!HV.app || HV.app.current !== def) return;
      e.stopPropagation();
      onTap();
    });
    return g;
  }
  /* Groupe de boutons exclusifs : items = [[valeur, libellé, largeur, info?]] */
  function choice(a, def, parent, x, y, items, value, onChange) {
    const btns = [];
    let cx = x;
    items.forEach(([v, l, w, info]) => {
      const b = button(a, def, parent, cx, y, w, l, () => { set(v); onChange(v); }, info);
      btns.push([v, b]);
      cx += w + 8;
    });
    function set(v) { btns.forEach(([k, b]) => b.classList.toggle('on', k === v)); }
    set(value);
    return { set, btns };
  }
  function card(a, parent, x, y, w, h, info) {
    const g = a.el('g', { class: info ? 'zt-hover' : null, 'data-info': info || null }, parent);
    const r = a.el('rect', { x, y, width: w, height: h, rx: 14, class: 'zt-card' }, g);
    return { g, r };
  }

  Object.assign(HV.INFO, {
    /* --- Embryologie --- */
    'zt-fc': { t: 'Foramen caecum', k: 'Sommet du V lingual (complément)', d: 'Point de départ de l\'ébauche thyroïdienne médiane, à la jonction des deux tiers antérieurs et du tiers postérieur de la langue. Il en reste une petite dépression sur le dos de la langue (complément).' },
    'zt-duct': { t: 'Canal thyréoglosse', k: 'Trajet de descente de la thyroïde (complément)', d: 'L\'ébauche thyroïdienne descend en avant du pharynx, passe au contact de l\'os hyoïde et rejoint sa place devant la trachée. Le canal disparaît normalement ensuite (complément).' },
    'zt-bud': { t: 'Ébauche thyroïdienne médiane', k: 'Origine endodermique, plancher du pharynx (complément)', d: 'Elle donne les thyréocytes (cellules folliculaires). Elle descend dans le cou pendant les premières semaines du développement (complément).' },
    'zt-lingual': { t: 'Thyroïde linguale', k: 'Ectopie par arrêt de la descente (complément)', d: 'Tissu thyroïdien resté à la base de la langue, au niveau du foramen caecum. Il peut être le seul tissu thyroïdien du patient (souvent hypofonctionnel) : à savoir avant toute exérèse (complément).' },
    'zt-cyst': { t: 'Kyste du tractus thyréoglosse', k: 'Reliquat du canal (complément)', d: 'Masse cervicale médiane, le plus souvent au contact de l\'os hyoïde, qui ascensionne à la déglutition et à la protraction de la langue. Peut s\'infecter (complément).' },
    'zt-pyr': { t: 'Pyramide de Lalouette', k: 'Lobe pyramidal · polycopié p. 6', d: 'L\'isthme comporte parfois un vestige embryonnaire, la pyramide de l\'alouette (polycopié p. 6) : reliquat de la partie basse du canal thyréoglosse (complément).' },
    'zt-hyoid': { t: 'Os hyoïde', k: 'Repère du trajet du canal (complément)', d: 'Le canal thyréoglosse passe à son contact : l\'exérèse d\'un kyste du tractus emporte la partie moyenne de l\'os hyoïde (complément).' },
    'zt-pouch': { t: 'Poches pharyngées (endobranchiales)', k: 'Endoderme · polycopié p. 33', d: 'Les parathyroïdes sont d\'origine endodermique : la 3e poche donne les parathyroïdes inférieures (P3) et le thymus, la 4e poche les parathyroïdes supérieures (P4) (polycopié p. 33, figure 10).' },
    'zt-p3': { t: 'Parathyroïde inférieure (P3)', k: '3e poche · polycopié p. 33-34', d: 'Elle naît avec le thymus de la 3e poche et descend avec lui : elle termine plus bas que P4. Elle est à la face postérieure du pôle inférieur du lobe, en dehors du récurrent, mais peut être dans le médiastin supérieur (40 % des cas selon le polycopié, p. 34 ; fréquence variable selon les séries, complément).' },
    'zt-p4': { t: 'Parathyroïde supérieure (P4)', k: '4e poche · polycopié p. 33-34', d: 'Derrière le pôle supérieur du lobe thyroïdien, à hauteur du cartilage cricoïde ; elle peut se placer en arrière du récurrent, au contact de l\'œsophage (p. 34).' },
    'zt-thymus': { t: 'Thymus', k: '3e poche · polycopié p. 33', d: 'Issu de la 3e poche avec P3, il descend dans le médiastin et entraîne P3 vers le bas (migration lors de la flexion cervicale, figure 10).' },
    'zt-ub': { t: 'Corps ultimobranchial', k: 'Issu de la 4e poche (complément)', d: 'Il fusionne avec la face postérieure des lobes thyroïdiens et y apporte les cellules C (parafolliculaires), qui dérivent de la crête neurale (complément).' },
    'zt-ccell': { t: 'Cellules C (parafolliculaires)', k: 'Calcitonine · polycopié p. 6-7', d: 'Minoritaires, situées entre les follicules ; elles sécrètent la calcitonine (p. 7). Origine : corps ultimobranchial (complément). Elles donnent le cancer médullaire de la thyroïde, dont la calcitonine est le marqueur (p. 18).' },
    /* --- Anatomie chirurgicale --- */
    'zt-lobes': { t: 'Lobes et isthme', k: 'Polycopié p. 6', d: 'Deux lobes latéraux réunis par un isthme, à la base du cou. L\'isthme est en avant des premiers anneaux trachéaux (complément).' },
    'zt-sta': { t: 'Artère thyroïdienne supérieure', k: 'Branche de la carotide externe (complément)', d: 'Elle aborde le pôle supérieur du lobe. Sa ligature se fait au ras de la glande pour épargner la branche externe du nerf laryngé supérieur, qui chemine à son contact (complément).' },
    'zt-ita': { t: 'Artère thyroïdienne inférieure', k: 'Tronc thyro-cervical de la sous-clavière (complément)', d: 'Elle passe derrière la carotide commune puis aborde la face postérieure du lobe, où elle croise le nerf récurrent. Elle vascularise P3 et, dans 88 % des cas, P4 (polycopié p. 34).' },
    'zt-carotid': { t: 'Artère carotide commune', k: 'Repère latéral (complément)', d: 'Se divise en carotides interne et externe à hauteur du bord supérieur du cartilage thyroïde (complément).' },
    'zt-arch': { t: 'Crosse de l\'aorte et sous-clavières', k: 'Boucles des récurrents (complément)', d: 'Le récurrent gauche passe sous la crosse aortique, le récurrent droit sous l\'artère sous-clavière droite, puis tous deux remontent vers le larynx (complément).' },
    'zt-vagus': { t: 'Nerf vague (X)', k: 'Origine des nerfs laryngés (complément)', d: 'Il descend dans la gaine carotidienne et donne le nerf laryngé supérieur (haut) et le nerf laryngé inférieur, dit récurrent (bas, après une boucle sous une artère) (complément).' },
    'zt-rln': { t: 'Nerf laryngé inférieur (récurrent)', k: 'Motricité des cordes vocales (complément)', d: 'Il remonte dans l\'angle trachéo-œsophagien, croise l\'artère thyroïdienne inférieure, passe à la face postérieure du lobe et pénètre dans le larynx en arrière de l\'articulation crico-thyroïdienne, sous le bord inférieur du constricteur inférieur du pharynx. Le droit est plus oblique, le gauche plus vertical (complément).' },
    'zt-sln': { t: 'Nerf laryngé supérieur', k: 'Branches interne et externe (complément)', d: 'La branche interne, sensitive, traverse la membrane thyro-hyoïdienne. La branche externe, motrice, innerve le muscle cricothyroïdien (tension des cordes vocales, voix aiguë) et longe l\'artère thyroïdienne supérieure (complément).' },
    'zt-ct': { t: 'Muscle cricothyroïdien', k: 'Innervé par la branche externe du nerf laryngé supérieur (complément)', d: 'Il tend les cordes vocales : sa paralysie donne une voix fatigable, sans aigus (complément).' },
    'zt-para': { t: 'Parathyroïdes', k: 'Polycopié p. 34', d: '4 glandes dans 80 % des cas, brun chamois, 4 à 6 mm, accolées à la face postérieure des pôles thyroïdiens, extracapsulaires donc clivables. Chacune a une artère unique et terminale : thyroïdienne inférieure pour P3, et pour P4 dans 88 % des cas (supérieure dans 10 %) (p. 34).' },
    'zt-cx-rln': { t: 'Lésion d\'un nerf récurrent', k: 'Complication de la thyroïdectomie (complément)', d: 'Paralysie d\'une corde vocale : dysphonie (voix bitonale). Contrôle de la mobilité laryngée avant et après la chirurgie (complément). La dysphonie est aussi un signe de compression ou de malignité d\'un goitre (polycopié p. 11).' },
    'zt-cx-bil': { t: 'Atteinte récurrentielle bilatérale', k: 'Rare, grave (complément)', d: 'Les deux cordes vocales restent proches de la ligne médiane : dyspnée laryngée, urgence respiratoire (complément).' },
    'zt-cx-sln': { t: 'Lésion de la branche externe du laryngé supérieur', k: 'Complément', d: 'Paralysie du muscle cricothyroïdien : voix fatigable, perte des aigus (gênante chez les chanteurs) (complément).' },
    'zt-cx-pth': { t: 'Hypoparathyroïdie post-chirurgicale', k: 'Polycopié p. 46', d: 'Cause la plus fréquente d\'hypoparathyroïdie : définitive par retrait ou lésion des parathyroïdes lors d\'une chirurgie cervicale (thyroïdienne), ou transitoire après altération de leur vascularisation (p. 46). Elle donne une hypocalcémie : paresthésies, tétanie (p. 43).' },
    /* --- Désiodases --- */
    'zt-d1': { t: 'Désiodase de type 1 (D1)', k: 'Foie, rein, thyroïde (complément)', d: 'Membranaire. Elle convertit la T4 en T3 qui rejoint le plasma et dégrade la T3 reverse. Inhibée par le propylthiouracile, l\'amiodarone, les glucocorticoïdes et le propranolol à forte dose (complément).' },
    'zt-d2': { t: 'Désiodase de type 2 (D2)', k: 'Cerveau, hypophyse, muscle, graisse brune (complément)', d: 'Dans la cellule : elle fournit de la T3 sur place. Dans l\'hypophyse, cette T3 locale porte le rétrocontrôle de la TSH. Son activité augmente quand la T4 baisse (complément).' },
    'zt-d3': { t: 'Désiodase de type 3 (D3)', k: 'Placenta, cerveau (complément)', d: 'Inactivante : T4 → T3 reverse et T3 → T2. Au placenta, elle limite le passage des hormones maternelles vers le fœtus. Elle augmente au cours des maladies graves (complément).' },
    'zt-t4hub': { t: 'T4 (thyroxine)', k: 'Forme de réserve · polycopié p. 7-8', d: 'Hormone majoritaire dans le plasma, exclusivement produite par la thyroïde (p. 8). Elle est le substrat des trois désiodases.' },
    'zt-t3card': { t: 'T3 (triiodothyronine)', k: 'Forme active · polycopié p. 7-8', d: '75 % de la T3 viennent de la conversion périphérique de la T4 par les désiodases ; 25 % seulement sont produits par la thyroïde (p. 8). Elle se fixe aux récepteurs nucléaires TRα et TRβ (p. 9).' },
    'zt-rt3card': { t: 'T3 reverse (rT3)', k: 'Inactive (complément)', d: 'Produite par D3 à partir de la T4, dégradée par D1. Elle s\'élève quand D3 augmente et D1 baisse (maladie grave, amiodarone). Non dosée en pratique courante (complément).' },
    'zt-t2card': { t: 'T2 (diiodothyronine)', k: 'Inactive (complément)', d: 'Produit de dégradation de la T3 par D3 (complément).' },
    'zt-sit': { t: 'Situations qui modifient les désiodases', k: 'Complément, sauf mention', d: 'Cliquez pour voir l\'effet sur les flux. Le bilan simulé suit le panneau (scénario « Syndrome de basse T3 »).' },
    /* --- Nodule --- */
    'zt-us': { t: 'Échographie thyroïdienne', k: 'Examen clé devant un nodule · polycopié p. 15', d: 'Réalisée par un opérateur entraîné : localisation, taille, caractéristiques des nodules et risque de malignité selon le score EU-TIRADS ; examen des aires ganglionnaires centrales et jugulo-carotidiennes (p. 15). Coupe transversale schématique.' },
    'zt-score': { t: 'Score EU-TIRADS', k: 'Polycopié p. 16 (critères) ; seuils de cytoponction : complément', d: 'EU-TIRADS 2 : anéchogène (kyste), bénin. 3 : iso- ou hyperéchogène, risque faible. 4 : modérément hypoéchogène, risque intermédiaire. 5 : au moins un critère de forte suspicion (p. 16). Seuils de cytoponction : > 20 mm (3), > 15 mm (4), > 10 mm (5) (complément, EU-TIRADS 2017).' },
    'zt-spong': { t: 'Nodule spongiforme', k: 'EU-TIRADS 2 (complément)', d: 'Nodule entièrement fait de petites logettes kystiques : classé bénin comme le kyste pur (complément, non cité dans le polycopié).' },
    'zt-beth': { t: 'Système de Bethesda', k: 'Cytologie après cytoponction (complément)', d: 'Six catégories, de I (non diagnostique) à VI (malin), chacune associée à une conduite à tenir. Les risques de malignité chiffrés varient selon les éditions : se reporter au texte de référence (complément).' },
    'zt-calcit': { t: 'Calcitonine', k: 'Polycopié p. 18', d: 'Dosée en cas de contexte héréditaire de cancer médullaire, de suspicion de malignité à la cytoponction et, de principe, avant toute chirurgie pour goitre ou nodule. La thyroglobuline n\'a pas d\'intérêt devant un nodule (p. 18).' },
    /* --- Grossesse --- */
    'zt-hcg': { t: 'hCG', k: 'Pic en fin de 1er trimestre (complément)', d: 'Sa structure proche de celle de la TSH (même sous-unité α) lui permet de stimuler faiblement le récepteur de la TSH : T4L un peu plus haute et TSH plus basse en fin de 1er trimestre, de façon physiologique (complément).' },
    'zt-tbg': { t: 'TBG', k: 'Augmentée par les œstrogènes (complément)', d: 'La TBG transporte 75 % de la T4 et de la T3 (polycopié p. 8). En grossesse, les œstrogènes l\'augmentent (environ ×2) : la T4 totale monte sans hyperthyroïdie. D\'où l\'intérêt des dosages libres (complément).' },
    'zt-t4tot': { t: 'T4 totale', k: 'Suit la TBG (complément)', d: 'Elle augmente d\'environ 50 % dès la première moitié de la grossesse : elle n\'est pas interprétable seule (complément).' },
    'zt-tshp': { t: 'TSH pendant la grossesse', k: 'Physiologiquement plus basse au 1er trimestre (complément)', d: 'Freinée par l\'effet thyréostimulant de l\'hCG ; on interprète avec des normes adaptées au trimestre, propres au laboratoire (complément).' },
    'zt-t4lp': { t: 'T4 libre pendant la grossesse', k: 'Complément', d: 'Légère hausse transitoire au pic d\'hCG, puis tendance à la baisse aux 2e et 3e trimestres, variable selon la méthode de dosage (complément).' },
    'zt-pla': { t: 'Placenta', k: 'Complément', d: 'L\'iode et les IgG (dont les TRAb) le franchissent. La désiodase D3 placentaire inactive une partie de la T4 maternelle (complément).' },
    'zt-fetal': { t: 'Thyroïde fœtale', k: 'Complément', d: 'Elle commence à capter l\'iode et à synthétiser des hormones vers 10–12 SA, mais sa production ne devient importante que vers 18–20 SA : jusque-là, le fœtus dépend surtout de la T4 maternelle, importante pour le développement cérébral (complément).' },
    /* --- Auto-immunité --- */
    'zt-tshr': { t: 'Récepteur de la TSH', k: 'Membrane basolatérale du thyréocyte', d: 'Récepteur couplé aux protéines G (AMPc) (complément). La TSH active toutes les étapes du métabolisme iodé et a un effet mitogène (polycopié p. 7). Les TRAb s\'y fixent (p. 29, figure 9B).' },
    'zt-trab-s': { t: 'TRAb stimulants', k: 'Maladie de Basedow · polycopié p. 31', d: 'Auto-anticorps anti-récepteurs de la TSH qui stimulent la synthèse et la sécrétion des hormones thyroïdiennes (p. 31) : goitre diffus homogène et vasculaire (p. 26), fixation diffuse à la scintigraphie (figure 9B). Leur dosage confirme le diagnostic (p. 28).' },
    'zt-trab-b': { t: 'TRAb bloquants', k: 'Complément', d: 'Ils occupent le récepteur sans l\'activer et empêchent l\'action de la TSH : hypothyroïdie. Rares ; un même patient peut passer d\'un type à l\'autre (complément).' },
    'zt-camp': { t: 'AMPc', k: 'Second messager (complément)', d: 'Monte quand le récepteur de la TSH est activé : captage de l\'iode, synthèse de la thyroglobuline et de la TPO, sécrétion et croissance (p. 7).' },
    'zt-tpoab': { t: 'Anticorps anti-TPO', k: 'Marqueur de la maladie de Hashimoto · polycopié p. 23', d: 'Dirigés contre la thyroperoxydase, enzyme de la face apicale. S\'ils sont élevés, le diagnostic de maladie de Hashimoto est retenu et il n\'y a pas lieu de répéter le dosage (p. 23).' },
    'zt-tgab': { t: 'Anticorps anti-thyroglobuline', k: 'Complément', d: 'Dirigés contre la thyroglobuline de la colloïde. Moins spécifiques que les anti-TPO ; ils peuvent gêner le dosage de la thyroglobuline (complément).' },
    'zt-infil': { t: 'Infiltrat lymphocytaire', k: 'Thyroïdite lymphocytaire (complément)', d: 'Lymphocytes T et B, parfois organisés en follicules. La destruction des thyréocytes est surtout le fait de l\'immunité cellulaire ; les anticorps sont des marqueurs (complément). La glande est augmentée de volume ou atrophique, ferme et hétérogène (p. 21-22).' },
    'zt-tcyt': { t: 'Lymphocyte T cytotoxique', k: 'Complément', d: 'Reconnaît les thyréocytes et déclenche leur mort : la glande perd ses cellules, la T4 baisse, la TSH monte (hypothyroïdie primaire, p. 19).' },
    'zt-plasmo': { t: 'Plasmocyte', k: 'Complément', d: 'Lymphocyte B différencié qui sécrète les auto-anticorps (anti-TPO, anti-thyroglobuline).' },
    'zt-orbit': { t: 'Orbitopathie basedowienne', k: 'Polycopié p. 31-32', d: 'Augmentation du volume des tissus de l\'orbite : hypertrophie des muscles oculomoteurs et prolifération des tissus graisseux et conjonctifs rétro-orbitaires, liée aux récepteurs de la TSH orbitaires. Elle résulte de l\'auto-immunité, pas de l\'hyperthyroïdie ; le tabac est le principal facteur de risque (p. 31).' },
    'zt-fibro': { t: 'Fibroblaste orbitaire', k: 'Exprime le récepteur de la TSH (complément pour le mécanisme)', d: 'Stimulé par les TRAb (et via le récepteur de l\'IGF-1), il se différencie en adipocyte et produit des glycosaminoglycanes qui retiennent l\'eau : le contenu de l\'orbite gonfle (complément).' },
    'zt-eom': { t: 'Muscles oculomoteurs', k: 'Polycopié p. 32', d: 'Augmentés de volume puis fibreux, avec perte d\'élasticité : diplopie verticale ou oblique. À un stade avancé, ils compriment le nerf optique au sommet de l\'orbite (vision des couleurs, champ visuel, acuité) (p. 32).' },
    'zt-optic': { t: 'Nerf optique', k: 'Compression : forme sévère · polycopié p. 32', d: 'Comprimé par les muscles hypertrophiés du cône orbitaire : altération de la vision des couleurs, puis du champ visuel, puis de l\'acuité visuelle (p. 32).' },
    'zt-demo': { t: 'Intensité des TRAb', k: 'Démonstration ou modèle', d: '« Démonstration » : TRAb élevés fixes. « Modèle » : suit le curseur TRAb stimulants du panneau (scénario « Maladie de Basedow »).' }
  });

  /* ======================================================================
     1. Embryologie thyroïdienne
     ====================================================================== */
  const emb = HV.scene(Object.assign({
    id: 'thyro-embryo', parent: 'thyro', loupe: 'Embryologie',
    title: 'Embryologie thyroïdienne', level: 'Notion',
    lead: 'La thyroïde a deux origines. L\'ébauche médiane naît du plancher du pharynx, au foramen caecum de la langue, et descend dans le cou le long du canal thyréoglosse : elle donne les thyréocytes. Les poches pharyngées donnent les parathyroïdes (3e et 4e poches), le thymus et le corps ultimobranchial, qui apporte les cellules C (complément, sauf parathyroïdes : polycopié p. 33).',
    points: [
      'Parathyroïdes d\'origine endodermique : 3e poche → parathyroïdes inférieures (P3) et thymus ; 4e poche → parathyroïdes supérieures (P4) (polycopié p. 33, figure 10).',
      'P3 naît plus haut que P4 mais, entraînée par le thymus, termine plus bas : elle peut être dans le médiastin supérieur (40 % des cas, p. 34 ; fréquence variable selon les séries, complément).',
      'Arrêt de la descente : thyroïde linguale ; persistance du canal : kyste du tractus thyréoglosse ; reliquat bas : pyramide de Lalouette (p. 6) (complément pour le mécanisme).',
      'Cellules C (calcitonine) : apportées par le corps ultimobranchial (complément).'
    ],
    legend: new Set([]),
    build(g, a) {
      a.frame('Embryologie thyroïdienne', 'Descente de l\'ébauche médiane · dérivés des poches pharyngées');

      /* ---------- À gauche : coupe sagittale, face à gauche ---------- */
      a.text(70, 190, 'Ébauche médiane : du foramen caecum au cou (complément)', 'lbl-h');
      a.path('M 170,232 C 300,212 460,210 600,236', 'zt-soft');
      a.text(250, 222, 'palais', 'note');
      a.path('M 610,236 C 650,270 660,340 650,420 L 640,960', 'zt-soft');
      a.text(660, 460, 'pharynx', 'note');
      a.path('M 170,300 C 168,330 176,360 196,384 C 220,420 262,446 330,452 C 326,500 318,560 314,620 L 306,960', 'zt-skin');
      a.text(200, 470, ['peau', '(face antérieure)'], 'note', { anchor: 'end', lh: 1.15 });
      a.path('M 190,300 C 240,262 360,250 460,262 C 540,272 584,310 588,360 C 592,420 560,450 520,455 C 430,460 330,430 260,400 C 220,380 195,340 190,300 Z', 'zt-tongue', null, { 'data-info': 'zt-fc' });
      a.text(320, 345, 'langue', 'zt-in', { anchor: 'middle' });
      const hy = a.el('g', { 'data-info': 'zt-hyoid' });
      a.el('ellipse', { cx: 446, cy: 500, rx: 46, ry: 13, class: 'zt-bone' }, hy);
      a.text(506, 506, 'os hyoïde', 'note', null, hy);
      a.path('M 404,560 L 486,560 L 488,640 C 474,662 432,668 408,650 Z', 'org o-cart', null, { 'data-info': 'larynx' });
      a.text(504, 610, 'cartilage thyroïde', 'note');
      a.el('rect', { x: 412, y: 670, width: 72, height: 22, rx: 8, class: 'org o-cart', 'data-info': 'larynx' });
      a.text(504, 688, 'cricoïde', 'note');
      const tr = a.el('g', { 'data-info': 'trachea' });
      a.el('rect', { x: 418, y: 700, width: 62, height: 260, rx: 14, class: 'org o-trachea' }, tr);
      for (let y = 716; y < 950; y += 22) a.path(`M 420,${y} C 436,${y + 6} 462,${y + 6} 478,${y}`, 'o-ring', tr);
      a.el('rect', { x: 500, y: 700, width: 52, height: 260, rx: 22, class: 'zt-oeso' });
      a.text(504, 980, 'trachée · œsophage', 'note');

      // Canal et ébauche
      const ductD = 'M 472,268 C 474,340 454,420 414,476 C 400,494 390,506 390,530 C 388,600 386,680 394,738';
      const ductTrack = a.path(ductD, 'zt-track', null, { 'data-info': 'zt-duct' });
      const duct = a.path(ductD, 'zt-duct', null, { 'data-info': 'zt-duct' });
      const dLen = duct.getTotalLength();
      duct.setAttribute('stroke-dasharray', dLen.toFixed(0) + ' ' + dLen.toFixed(0));
      const fc = a.el('g', { 'data-info': 'zt-fc' });
      a.el('circle', { cx: 472, cy: 266, r: 7, class: 'zt-oeso' }, fc);
      a.path('M 480,262 L 660,262', 'connector', fc);
      a.text(668, 268, 'foramen caecum', 'lbl-s strong', null, fc);
      // Anomalies
      const ling = a.el('g', { 'data-info': 'zt-lingual' });
      a.el('circle', { cx: 472, cy: 290, r: 26, class: 'zt-anom' }, ling);
      a.text(668, 300, 'thyroïde linguale (ectopie)', 'zt-anom-t', null, ling);
      a.path('M 498,294 L 660,296', 'connector', ling);
      const cyst = a.el('g', { 'data-info': 'zt-cyst' });
      a.el('circle', { cx: 390, cy: 548, r: 15, class: 'zt-anom' }, cyst);
      a.text(300, 544, ['kyste du tractus', 'thyréoglosse'], 'zt-anom-t', { anchor: 'end', lh: 1.15 }, cyst);
      const pyr = a.el('g', { 'data-info': 'zt-pyr', opacity: 0 });
      a.path('M 386,742 C 386,722 390,700 393,684 C 398,700 402,722 402,742 Z', 'org o-thyroid', pyr);
      a.text(300, 690, ['pyramide de Lalouette', '(lobe pyramidal, p. 6)'], 'note', { anchor: 'end', lh: 1.15 }, pyr);
      const fin = a.el('ellipse', { cx: 395, cy: 790, rx: 24, ry: 50, class: 'org o-thyroid', 'data-info': 'thyroid', opacity: 0 });
      const finT = a.text(300, 796, 'thyroïde en place', 'lbl-s strong', { anchor: 'end' });
      const bud = a.el('circle', { r: 15, class: 'org o-thyroid', 'data-info': 'zt-bud' });
      // Âge
      const ageBox = a.el('g', { transform: 'translate(64 850)' });
      a.el('rect', { x: 0, y: 0, width: 220, height: 96, rx: 14, class: 'zt-card' }, ageBox);
      a.text(16, 28, 'Âge (complément)', 'note', null, ageBox);
      const ageT = a.text(16, 62, '', 'zt-mid', null, ageBox);
      a.text(16, 86, 'ordre de grandeur', 'note', null, ageBox);

      /* ---------- À droite : poches pharyngées ---------- */
      a.text(830, 380, 'Poches pharyngées · position finale (face postérieure)', 'lbl-h');
      const ph = a.el('g', { 'data-info': 'zt-pouch' });
      a.path('M 830,410 L 900,410 L 896,620 L 840,620 Z', 'zt-pharynx', ph);
      [['I', 440], ['II', 488], ['III', 536], ['IV', 584]].forEach(([n, y]) => {
        a.el('rect', { x: 890, y: y - 16, width: 74, height: 32, rx: 16, class: 'zt-pharynx' }, ph);
        a.text(866, y + 6, n, 'note strong', { anchor: 'middle' }, ph);
      });
      a.text(1020, 446, '1re, 2e : oreille moyenne, amygdale (complément)', 'note');
      a.text(1020, 520, '3e poche : P3 + thymus (p. 33)', 'lbl-s strong');
      a.text(1020, 572, '4e poche : P4 (p. 33)', 'lbl-s strong');
      a.text(1020, 596, '+ corps ultimobranchial → cellules C (complément)', 'note');
      a.text(1250, 640, ['P3 naît plus haut que P4 mais,', 'entraînée par le thymus, termine', 'plus bas (p. 33-34).'], 'note', { lh: 1.2 });
      HV.figBadge(a, 1510, 400, ['10']);

      // Lobe droit, face postérieure (position finale)
      a.el('ellipse', { cx: 1150, cy: 830, rx: 58, ry: 110, class: 'org o-thyroid', 'data-info': 'thyroid' });
      const cc = a.el('g', { 'data-info': 'zt-ccell' });
      [[1140, 780], [1162, 805], [1128, 818], [1150, 760], [1170, 840], [1135, 850]].forEach(([x, y]) => a.el('circle', { cx: x, cy: y, r: 5, class: 'zt-ccell' }, cc));
      const ccT = a.text(1074, 812, ['cellules C', '(calcitonine)'], 'note strong', { anchor: 'end', lh: 1.15 });
      ccT.setAttribute('data-info', 'zt-ccell');
      const tracks = {
        p3: a.path('M 975,525 C 1080,560 1150,700 1196,900', 'zt-track'),
        p4: a.path('M 975,575 C 1080,610 1160,680 1196,745', 'zt-track'),
        th: a.path('M 975,540 C 940,700 920,880 930,962', 'zt-track'),
        ub: a.path('M 975,592 C 1060,640 1120,700 1150,800', 'zt-track')
      };
      const buds = {
        p3: a.el('ellipse', { rx: 11, ry: 8, class: 'org o-parathyroid big', 'data-info': 'zt-p3' }),
        p4: a.el('ellipse', { rx: 11, ry: 8, class: 'org o-parathyroid big', 'data-info': 'zt-p4' }),
        th: a.el('ellipse', { rx: 22, ry: 14, class: 'zt-thymus', 'data-info': 'zt-thymus' }),
        ub: a.el('circle', { r: 11, class: 'zt-ub', 'data-info': 'zt-ub' })
      };
      const lens = {};
      for (const k in tracks) lens[k] = tracks[k].getTotalLength();
      a.text(1222, 756, 'P4 : derrière le pôle supérieur,', 'note strong', { attrs: { 'data-info': 'zt-p4' } });
      a.text(1222, 778, 'hauteur du cricoïde (p. 34)', 'note');
      a.text(1222, 900, 'P3 : pôle inférieur, ou', 'note strong', { attrs: { 'data-info': 'zt-p3' } });
      a.text(1222, 922, 'médiastin sup. (40 %*, p. 34)', 'note');
      a.text(1222, 944, '* variable selon les séries (complément)', 'note');
      a.text(956, 972, 'thymus → médiastin', 'note', { attrs: { 'data-info': 'zt-thymus' } });

      /* ---------- Animation (cycle de 12 s) ---------- */
      let t = 0, txt = 0;
      a.dyn((dt) => {
        t = (t + dt) % 12;
        const u = ss(1, 8, t); // descente
        const pt = duct.getPointAtLength(u * dLen);
        bud.setAttribute('cx', pt.x.toFixed(1));
        bud.setAttribute('cy', pt.y.toFixed(1));
        const arrived = ss(7.6, 8.4, t);
        bud.setAttribute('opacity', (1 - arrived).toFixed(2));
        fin.setAttribute('opacity', arrived.toFixed(2));
        finT.setAttribute('opacity', (0.3 + 0.7 * arrived).toFixed(2));
        pyr.setAttribute('opacity', ss(8.5, 9.5, t).toFixed(2));
        duct.setAttribute('stroke-dashoffset', (dLen * (1 - u)).toFixed(1));
        duct.setAttribute('opacity', (1 - 0.8 * ss(8.5, 10.5, t)).toFixed(2));
        ductTrack.setAttribute('opacity', 0.8);
        for (const k in tracks) {
          const p2 = tracks[k].getPointAtLength(u * lens[k]);
          buds[k].setAttribute('transform', `translate(${p2.x.toFixed(1)} ${p2.y.toFixed(1)})`);
        }
        cc.setAttribute('opacity', (0.15 + 0.85 * arrived).toFixed(2));
        txt -= dt;
        if (txt <= 0) {
          txt = 0.2;
          ageT.textContent = t < 1 ? '≈ 4e semaine' : t < 8 ? '≈ ' + Math.round(4 + 3 * u) + 'e semaine' : '≈ 7e semaine';
        }
      });

      HV.spotlight(emb, a, [
        { t: 'Le point de départ : le foramen caecum', d: 'L\'ébauche thyroïdienne médiane naît de l\'endoderme du plancher du pharynx, à la base de la langue (complément).', spot: [[472, 270, 70]] },
        { t: 'La descente le long du canal thyréoglosse', d: 'L\'ébauche descend en avant du pharynx, passe au contact de l\'os hyoïde et du larynx, et se place devant la trachée vers la 7e semaine (ordre de grandeur, complément).', spot: [[430, 520, 260]] },
        { t: 'Les anomalies de la descente', d: 'Arrêt en haut : thyroïde linguale. Canal persistant : kyste du tractus thyréoglosse, masse médiane qui monte à la protraction de la langue. Reliquat bas : pyramide de Lalouette (p. 6) (complément pour le mécanisme).', spot: [[472, 290, 50], [380, 548, 60], [392, 715, 50]] },
        { t: 'Les poches pharyngées', d: 'La 3e poche donne les parathyroïdes inférieures (P3) et le thymus, la 4e les parathyroïdes supérieures (P4) (polycopié p. 33, figure 10).', spot: [[960, 512, 150]] },
        { t: 'Le croisement de P3 et P4', d: 'Entraînée par le thymus, P3 descend plus bas que P4 : elle finit au pôle inférieur, voire dans le médiastin supérieur (40 % selon le polycopié ; fréquence variable selon les séries, complément) ; P4 reste au pôle supérieur, à hauteur du cricoïde (p. 34).', spot: [[1180, 830, 170]] },
        { t: 'Les cellules C', d: 'Le corps ultimobranchial, issu de la 4e poche, fusionne avec le lobe et y apporte les cellules C, qui sécrètent la calcitonine (p. 7) ; leur origine est la crête neurale (complément).', spot: [[1140, 805, 90]] }
      ]);
    }
  }, HV.LOUPE.L(0)));

  /* ======================================================================
     2. Anatomie chirurgicale
     ====================================================================== */
  const surg = HV.scene(Object.assign({
    id: 'thyro-surg', parent: 'thyro', loupe: 'Anatomie chirurgicale',
    title: 'Anatomie chirurgicale de la thyroïde', level: 'Organe',
    lead: 'Deux lobes réunis par un isthme (polycopié p. 6), vascularisés par les artères thyroïdiennes supérieures et inférieures. En arrière, les nerfs récurrents et les parathyroïdes sont les deux structures que la thyroïdectomie doit préserver. Survolez les complications pour voir les structures en cause.',
    points: [
      'Parathyroïdes : 4 dans 80 % des cas, à la face postérieure des pôles ; artère unique et terminale, thyroïdienne inférieure (pour P4 : 88 % des cas, supérieure dans 10 %) (p. 34).',
      'P3 : pôle inférieur, en dehors du récurrent, sous la bifurcation de l\'artère thyroïdienne inférieure ; P4 : pôle supérieur, à hauteur du cricoïde, parfois en arrière du récurrent (p. 34).',
      'Récurrent droit sous la sous-clavière droite, gauche sous la crosse aortique ; remontée dans l\'angle trachéo-œsophagien (complément).',
      'Hypoparathyroïdie post-chirurgicale : la cause la plus fréquente d\'hypoparathyroïdie (p. 46).'
    ],
    legend: new Set([]),
    build(g, a) {
      a.frame('Anatomie chirurgicale', 'Vue antérieure · face postérieure du lobe droit · complications de la thyroïdectomie');
      const hl = { rln: [], sln: [], para: [] };
      const mirror = (parent) => a.el('g', { transform: 'translate(940 0) scale(-1 1)' }, parent);

      /* ---------- Vue antérieure ---------- */
      a.text(70, 186, 'Vue antérieure', 'lbl-h');
      a.text(70, 214, 'droite du patient', 'note');
      a.text(870, 214, 'gauche', 'note', { anchor: 'end' });
      const base = a.el('g');
      // Artères (dessinées d'abord, côté droit puis miroir)
      const arch = a.el('g', { 'data-info': 'zt-arch' }, base);
      a.path('M 380,985 C 380,905 470,872 560,876 C 660,880 722,915 734,985', 'zt-art', arch, { 'stroke-width': 30 });
      a.path('M 450,884 C 420,860 360,830 330,800', 'zt-art', arch, { 'stroke-width': 18 });
      a.path('M 330,800 C 250,790 160,790 90,800', 'zt-art', arch, { 'stroke-width': 16 });
      a.path('M 650,884 C 720,852 780,824 860,806', 'zt-art', arch, { 'stroke-width': 16 });
      [0, 1].forEach((side) => {
        const s = side ? mirror(base) : a.el('g', null, base);
        const ita = a.el('g', { 'data-info': 'zt-ita' }, s);
        a.path(side ? 'M 230,858 L 230,640' : 'M 230,794 L 230,640', 'zt-art', ita, { 'stroke-width': 8 });
        a.path('M 230,640 C 236,570 300,548 340,546 C 362,546 372,536 380,520', 'zt-art', ita, { 'stroke-width': 7 });
        const sta = a.el('g', { 'data-info': 'zt-sta' }, s);
        a.path('M 352,214 C 380,232 394,290 394,346', 'zt-art', sta, { 'stroke-width': 7 });
      });
      // Carotides
      const car = a.el('g', { 'data-info': 'zt-carotid' }, base);
      a.path('M 330,800 L 330,244 M 330,244 L 312,170 M 330,244 L 360,170', 'zt-art', car, { 'stroke-width': 15 });
      a.path('M 560,878 C 590,860 610,840 610,800 L 610,244 M 610,244 L 628,170 M 610,244 L 580,170', 'zt-art', car, { 'stroke-width': 15 });
      // Nerfs vagues et récurrents
      const vag = a.el('g', { 'data-info': 'zt-vagus' });
      a.path('M 296,160 L 296,940', 'zt-nerve', vag);
      a.path('M 644,160 L 644,960', 'zt-nerve', vag);
      const rlnR = a.el('g', { 'data-info': 'zt-rln' });
      a.path('M 296,790 C 298,836 266,842 260,814 C 254,772 340,700 400,620 C 426,586 434,480 438,352', 'zt-nerve', rlnR);
      const rlnL = a.el('g', { 'data-info': 'zt-rln' });
      a.path('M 644,900 C 646,950 700,960 700,925 C 700,870 520,760 506,620 L 502,352', 'zt-nerve', rlnL);
      hl.rln.push(rlnR, rlnL);
      [0, 1].forEach((side) => {
        const s = side ? mirror() : a.el('g');
        s.setAttribute('data-info', 'zt-sln');
        a.path('M 296,172 C 330,190 360,198 384,204 L 404,214', 'zt-nerve thin', s);
        a.path('M 376,202 C 398,240 420,280 438,310', 'zt-nerve thin', s);
        hl.sln.push(s);
      });
      // Larynx, trachée
      a.el('rect', { x: 404, y: 178, width: 132, height: 16, rx: 8, class: 'zt-bone', 'data-info': 'zt-hyoid' });
      const lar = a.el('g', { 'data-info': 'larynx' });
      a.path('M 410,206 L 530,206 L 520,270 C 505,300 485,310 470,312 C 455,310 435,300 420,270 Z', 'org o-cart', lar);
      a.path('M 456,206 L 470,222 L 484,206', 'org-detail', lar);
      a.el('rect', { x: 434, y: 318, width: 72, height: 26, rx: 10, class: 'org o-cart' }, lar);
      [0, 1].forEach((side) => {
        const s = side ? mirror() : a.el('g');
        a.el('ellipse', { cx: 446, cy: 318, rx: 9, ry: 18, transform: 'rotate(-25 446 318)', class: 'zt-muscle', 'data-info': 'zt-ct' }, s);
      });
      const trach = a.el('g', { 'data-info': 'trachea' });
      a.el('rect', { x: 440, y: 350, width: 60, height: 500, rx: 14, class: 'org o-trachea' }, trach);
      for (let y = 364; y < 840; y += 20) a.path(`M 442,${y} C 456,${y + 6} 484,${y + 6} 498,${y}`, 'o-ring', trach);
      // Glande
      const lobes = a.el('g', { 'data-info': 'zt-lobes' });
      [0, 1].forEach((side) => {
        const s = side ? mirror(lobes) : a.el('g', null, lobes);
        a.path('M 440,362 C 422,340 396,330 380,346 C 360,366 352,420 356,480 C 360,540 380,570 406,568 C 426,566 440,540 442,500 Z', 'org o-thyroid zt-lobe', s);
      });
      a.path('M 436,442 C 456,436 484,436 504,442 L 504,488 C 484,494 456,494 436,488 Z', 'org o-thyroid zt-lobe', lobes);
      a.path('M 476,440 C 476,410 478,384 482,362 C 488,384 488,416 486,440 Z', 'org o-thyroid zt-lobe', lobes, { 'data-info': 'zt-pyr' });
      a.text(395, 455, 'lobe', 'zt-in', { anchor: 'middle' });
      a.text(545, 455, 'lobe', 'zt-in', { anchor: 'middle' });
      a.text(470, 520, 'isthme', 'zt-in', { anchor: 'middle' });
      // Parathyroïdes (en arrière, pointillés)
      [0, 1].forEach((side) => {
        const s = side ? mirror() : a.el('g');
        s.setAttribute('data-info', 'zt-para');
        a.el('ellipse', { cx: 372, cy: 404, rx: 9, ry: 7, class: 'org o-parathyroid zt-behind' }, s);
        a.el('ellipse', { cx: 380, cy: 548, rx: 9, ry: 7, class: 'org o-parathyroid zt-behind' }, s);
        hl.para.push(s);
      });
      // Étiquettes de la vue antérieure
      a.text(282, 238, 'nerf laryngé sup.', 'note', { anchor: 'end', attrs: { 'data-info': 'zt-sln' } });
      a.text(282, 300, ['a. thyroïdienne', 'supérieure'], 'note', { anchor: 'end', lh: 1.15, attrs: { 'data-info': 'zt-sta' } });
      a.text(282, 420, ['carotide', 'commune'], 'note', { anchor: 'end', lh: 1.15, attrs: { 'data-info': 'zt-carotid' } });
      a.text(216, 600, ['a. thyroïdienne', 'inférieure'], 'note', { anchor: 'end', lh: 1.15, attrs: { 'data-info': 'zt-ita' } });
      a.text(656, 290, 'nerf vague', 'note', { attrs: { 'data-info': 'zt-vagus' } });
      a.text(90, 745, ['a. sous-clavière', 'droite'], 'note', { lh: 1.15, attrs: { 'data-info': 'zt-arch' } });
      a.text(90, 862, ['récurrent droit :', 'boucle sous la', 'sous-clavière'], 'note strong', { lh: 1.15, attrs: { 'data-info': 'zt-rln' } });
      a.text(740, 940, ['récurrent gauche :', 'boucle sous la', 'crosse aortique'], 'note strong', { lh: 1.15, attrs: { 'data-info': 'zt-rln' } });
      a.text(726, 600, ['parathyroïdes', '(en arrière,', 'pointillés)'], 'note', { lh: 1.15, attrs: { 'data-info': 'zt-para' } });
      a.text(470, 960, 'crosse de l\'aorte', 'note', { anchor: 'middle', attrs: { 'data-info': 'zt-arch' } });

      /* ---------- Face postérieure du lobe droit ---------- */
      const n0 = g.childNodes.length;
      a.text(960, 186, 'Lobe droit vu de dos', 'lbl-h');
      a.el('rect', { x: 1060, y: 230, width: 96, height: 500, rx: 34, class: 'zt-oeso' });
      a.text(1108, 500, 'œsophage', 'zt-in', { anchor: 'middle', attrs: { transform: 'rotate(-90 1108 500)' } });
      a.path('M 1050,300 L 1460,300', 'connector');
      a.text(990, 296, 'cricoïde', 'note', { anchor: 'middle' });
      a.path('M 1250,250 C 1330,230 1392,280 1396,380 C 1402,500 1380,640 1300,680 C 1256,700 1220,660 1214,600 C 1206,500 1210,340 1250,250 Z', 'org o-thyroid zt-lobe', null, { 'data-info': 'zt-lobes' });
      a.text(1310, 420, 'lobe droit', 'zt-in', { anchor: 'middle' });
      const itaP = a.el('g', { 'data-info': 'zt-ita' });
      a.path('M 1540,470 C 1460,470 1400,466 1340,470 C 1300,472 1280,462 1262,450 M 1340,470 C 1310,490 1290,520 1280,560 M 1340,470 C 1320,440 1300,400 1296,350', 'zt-art', itaP, { 'stroke-width': 7 });
      a.text(1420, 456, 'a. thyroïdienne inf.', 'note', { attrs: { 'data-info': 'zt-ita' } });
      const rlnP = a.el('g', { 'data-info': 'zt-rln' });
      a.path('M 1196,740 C 1196,620 1210,470 1228,330 L 1236,262', 'zt-nerve', rlnP);
      hl.rln.push(rlnP);
      a.text(1046, 600, ['nerf', 'récurrent', '(angle trachéo-', 'œsophagien)'], 'note strong', { anchor: 'end', lh: 1.15, attrs: { 'data-info': 'zt-rln' } });
      const paraP = a.el('g', { 'data-info': 'zt-para' });
      a.el('ellipse', { cx: 1262, cy: 330, rx: 14, ry: 10, class: 'org o-parathyroid big' }, paraP);
      a.el('ellipse', { cx: 1310, cy: 610, rx: 14, ry: 10, class: 'org o-parathyroid big' }, paraP);
      hl.para.push(paraP);
      a.path('M 1278,326 L 1412,326', 'connector');
      a.text(1420, 320, 'P4 : pôle sup.,', 'note strong', { attrs: { 'data-info': 'zt-p4' } });
      a.text(1420, 342, 'près du récurrent', 'note');
      a.path('M 1326,612 L 1412,612', 'connector');
      a.text(1420, 606, 'P3 : pôle inf.,', 'note strong', { attrs: { 'data-info': 'zt-p3' } });
      a.text(1420, 628, 'sous l\'a. thyr. inf.', 'note');
      a.text(1420, 650, '(p. 34)', 'note');
      const post = a.el('g', { transform: 'translate(0 64)' });
      while (g.childNodes.length > n0 + 1) post.appendChild(g.childNodes[n0]);

      /* ---------- Complications (survol) ---------- */
      a.text(960, 846, 'Complications de la thyroïdectomie (survolez)', 'lbl-s strong');
      const cx = [
        ['zt-cx-rln', 'Nerf récurrent', ['dysphonie (paralysie', 'd\'une corde vocale)'], 'rln'],
        ['zt-cx-pth', 'Parathyroïdes', ['hypocalcémie, transitoire', 'ou définitive (p. 46)'], 'para'],
        ['zt-cx-bil', 'Deux récurrents', ['dyspnée laryngée,', 'urgence (complément)'], 'rln'],
        ['zt-cx-sln', 'Laryngé sup. (br. externe)', ['voix fatigable, sans', 'aigus (complément)'], 'sln']
      ];
      cx.forEach(([info, t, ls, key], i) => {
        const x = 960 + (i % 2) * 296, y = 856 + Math.floor(i / 2) * 70;
        const c = card(a, null, x, y, 284, 66, info);
        a.text(x + 14, y + 21, t, 'note strong', null, c.g);
        a.text(x + 14, y + 40, ls, 'note', { lh: 1.05 }, c.g);
        c.g.addEventListener('pointerenter', () => hl[key].forEach((e) => e.classList.add('zt-hl')));
        c.g.addEventListener('pointerleave', () => hl[key].forEach((e) => e.classList.remove('zt-hl')));
      });

      HV.spotlight(surg, a, [
        { t: 'Lobes et isthme', d: 'Deux lobes latéraux réunis par un isthme, parfois surmonté de la pyramide de Lalouette (polycopié p. 6).', spot: [[470, 450, 140]] },
        { t: 'Deux artères par lobe', d: 'L\'artère thyroïdienne supérieure (carotide externe) aborde le pôle supérieur ; l\'inférieure (tronc thyro-cervical de la sous-clavière) passe derrière la carotide et aborde la face postérieure (complément).', spot: [[372, 270, 70], [290, 600, 100]] },
        { t: 'Les nerfs récurrents', d: 'Le droit fait une boucle sous la sous-clavière droite, le gauche sous la crosse aortique ; tous deux remontent dans l\'angle trachéo-œsophagien, croisent l\'artère thyroïdienne inférieure et entrent dans le larynx (complément).', spot: [[270, 800, 70], [680, 920, 70], [1220, 564, 120]] },
        { t: 'Le nerf laryngé supérieur', d: 'Sa branche externe, motrice du muscle cricothyroïdien, longe l\'artère thyroïdienne supérieure : la ligature se fait au ras du pôle supérieur (complément).', spot: [[380, 240, 80]] },
        { t: 'Les parathyroïdes', d: 'À la face postérieure : P4 au pôle supérieur, près du récurrent ; P3 au pôle inférieur, sous l\'artère thyroïdienne inférieure. Chacune a une artère terminale, qu\'il faut respecter (p. 34).', spot: [[1290, 534, 230]] },
        { t: 'Les complications', d: 'Dysphonie par lésion récurrentielle (complément) ; hypoparathyroïdie, définitive (ablation) ou transitoire (dévascularisation), avec hypocalcémie (p. 46).', spot: [[950, 830, 600, 166]] }
      ]);
    }
  }, HV.LOUPE.L(1)));

  /* ======================================================================
     3. Désiodases
     ====================================================================== */
  const SIT = {
    norm: { d12: 1, d3: 1, txt: ['La T4 est exclusivement thyroïdienne ; 75 % de la T3 viennent de sa conversion périphérique', 'par les désiodases (polycopié p. 8). D1 et D2 activent, D3 inactive (complément).'] },
    nti: { d12: 0.5, d3: 2, txt: ['Maladie aiguë ou chronique sévère : syndrome de basse T3L, lié au stress somatique, sans dysfonction', 'thyroïdienne (p. 22). Mécanisme : D1 ↓, D3 ↑ → T3 ↓, T3 reverse ↑ (complément).'] },
    amio: { d12: 0.55, d3: 1, txt: ['Amiodarone : inhibe D1 et D2 → T4L un peu plus haute, T3 plus basse, T3 reverse ↑ (complément).', 'Riche en iode, elle peut aussi causer hypothyroïdie (p. 23) ou thyrotoxicose (p. 27).'] },
    prop: { d12: 0.8, d3: 1, txt: ['Propranolol à forte dose : inhibe modestement D1 → T3 un peu plus basse,', 'en plus de son effet bêtabloquant dans la thyrotoxicose (complément).'] },
    cort: { d12: 0.7, d3: 1, txt: ['Glucocorticoïdes à forte dose : inhibent D1 → T3 plus basse ;', 'ils freinent aussi la sécrétion de TSH (complément).'] }
  };
  const dei = HV.scene(Object.assign({
    id: 'deiod', parent: 'thyro', loupe: 'Désiodases',
    title: 'Désiodases D1, D2, D3', level: 'Notion',
    lead: 'La thyroïde sécrète surtout de la T4, forme de réserve ; 75 % de la T3, forme active, proviennent de la conversion périphérique de la T4 par les désiodases (polycopié p. 8). D1 et D2 enlèvent un iode de l\'anneau externe (T4 → T3) ; D3 enlève un iode de l\'anneau interne et inactive (T4 → T3 reverse, T3 → T2) (complément).',
    points: [
      'D1 : foie, rein, thyroïde ; alimente la T3 plasmatique (complément).',
      'D2 : cerveau, hypophyse, muscle, graisse brune ; T3 produite sur place, rétrocontrôle de la TSH (complément).',
      'D3 : placenta, cerveau ; inactivation (complément).',
      'Syndrome de basse T3L des maladies sévères, sans dysfonction thyroïdienne (p. 22).',
      'Les flux suivent le modèle du panneau (curseurs D1/D2 et D3, scénario « Syndrome de basse T3 »).'
    ],
    legend: new Set(['t4', 't3', 'rt3']),
    build(g, a) {
      a.frame('Désiodases D1, D2, D3', 'Activation (T4 → T3) et inactivation (T3 reverse, T2) dans les tissus');
      let sit = SIT.norm;
      const k12 = () => P.d12 * sit.d12, k3 = () => P.d3 * sit.d3;

      // Thyroïde
      const thy = a.el('g', { transform: 'translate(150 520) scale(4)', 'data-info': 'thyroid' });
      HV.organs.thyroidSmall(thy);
      a.text(150, 610, 'thyroïde', 'lbl-s strong', { anchor: 'middle' });
      a.text(150, 636, ['surtout T4 ; 25 % de', 'la T3 (p. 8)'], 'note', { anchor: 'middle', lh: 1.15 });
      // Cartes hormones
      const hcard = (x, y, w, t, sub, info, c) => {
        const gg = a.el('g', { 'data-info': info });
        a.el('rect', { x: x - w / 2, y: y - 36, width: w, height: 72, rx: 36, class: 'sig-box', style: `--c: var(${c})` }, gg);
        a.text(x, y - 2, t, 'lbl', { anchor: 'middle' }, gg);
        a.text(x, y + 22, sub, 'note', { anchor: 'middle' }, gg);
        return gg;
      };
      hcard(480, 520, 170, 'T4', 'réserve', 'zt-t4hub', '--p-orange');
      hcard(900, 300, 170, 'T3', 'active', 'zt-t3card', '--p-green');
      hcard(1160, 300, 170, 'T2', 'inactive', 'zt-t2card', '--p-grey');
      hcard(1000, 760, 210, 'T3 reverse', 'inactive', 'zt-rt3card', '--p-red');
      // Flux
      a.flow('M 225,520 L 392,520', { mol: 't4', rate: () => 1.6 * S.t4prod, pace: () => HV.paceOf(S.t4prod), size: 1.4, speed: 70, track: false });
      a.flow('M 200,460 C 280,320 560,236 812,284', { mol: 't3', rate: () => 0.45 * S.t3prod, size: 1.2, speed: 110, trackClass: 'track faint' });
      a.text(520, 262, 'sécrétion directe de T3 (25 %)', 'note', { anchor: 'middle' });
      a.path('M 566,490 C 680,410 740,320 812,300', 'zt-arrow');
      a.path('M 566,550 C 700,640 800,742 892,758', 'zt-arrow');
      a.path('M 986,300 L 1074,300', 'zt-arrow');
      a.flow('M 566,490 C 680,410 740,320 812,300', { mol: 't3', rate: () => 1.4 * S.t4 * k12(), pace: () => HV.paceOf(k12()), size: 1.4, speed: 80, track: false });
      a.flow('M 566,550 C 700,640 800,742 892,758', { mol: 'rt3', rate: () => 0.9 * S.t4 * k3(), pace: () => HV.paceOf(k3()), size: 1.4, speed: 80, track: false });
      a.flow('M 986,300 L 1074,300', { mol: 'dot', style: 'fill: var(--p-grey)', rate: () => 1.2 * S.t3 * k3(), size: 1.2, speed: 70, track: false });
      // Enzymes
      const enz = (x, y, n, info, cls) => {
        const gg = a.el('g', { class: 'zt-enz ' + (cls || ''), transform: `translate(${x} ${y})`, 'data-info': info });
        a.el('circle', { r: 27 }, gg);
        a.text(0, 7, n, null, { anchor: 'middle' }, gg);
        return gg;
      };
      const eD1 = enz(650, 420, 'D1', 'zt-d1'), eD2 = enz(718, 360, 'D2', 'zt-d2');
      const eD3a = enz(740, 682, 'D3', 'zt-d3', 'd3'), eD3b = enz(1030, 300, 'D3', 'zt-d3', 'd3');
      a.text(610, 360, ['anneau externe', '(complément)'], 'note', { anchor: 'end', lh: 1.15 });
      a.text(800, 640, ['anneau interne', '(complément)'], 'note', { lh: 1.15 });
      // Fiches enzymes
      const fiches = [
        ['zt-d1', 'D1 · foie, rein, thyroïde', ['T4 → T3 vers le plasma ;', 'dégrade la T3 reverse (complément)'], '--p-lime'],
        ['zt-d2', 'D2 · cerveau, hypophyse, muscle,', ['graisse brune : T3 produite sur', 'place, rétrocontrôle TSH (complément)'], '--p-lime'],
        ['zt-d3', 'D3 · placenta, cerveau', ['T4 → T3 reverse, T3 → T2 ;', 'protège le fœtus (complément)'], '--p-red']
      ];
      fiches.forEach(([info, t, ls], i) => {
        const y = 392 + i * 100;
        const c = card(a, null, 1150, y, 400, 88, info);
        a.text(1166, y + 26, t, 'note strong', null, c.g);
        a.text(1166, y + 50, ls, 'note', { lh: 1.15 }, c.g);
      });
      // Bilan du modèle
      const bil = card(a, null, 70, 690, 300, 112, 'zt-sit');
      a.text(86, 716, 'Bilan simulé (panneau)', 'note strong', null, bil.g);
      const bT = [0, 1, 2].map((i) => a.text(86, 742 + i * 22, '', 'note', null, bil.g));
      // Situations
      a.text(70, 846, 'Situations (cliquez)', 'lbl-s strong');
      const sitT = a.text(70, 910, SIT.norm.txt, 'note', { lh: 1.25 });
      const sitTsp = () => sitT.querySelectorAll('tspan');
      choice(a, dei, null, 280, 822, [
        ['norm', 'Normal', 100, 'zt-sit'], ['nti', 'Maladie grave', 150, 'zt-sit'], ['amio', 'Amiodarone', 140, 'zt-sit'],
        ['prop', 'Propranolol', 140, 'zt-sit'], ['cort', 'Corticoïdes', 140, 'zt-sit']
      ], 'norm', (v) => {
        sit = SIT[v];
        const ts = sitTsp();
        ts[0].textContent = sit.txt[0];
        ts[1].textContent = sit.txt[1];
      });

      let txt = 0;
      a.dyn((dt) => {
        const s12 = clamp(k12(), 0.2, 2), s3 = clamp(k3(), 0.3, 3);
        [eD1, eD2].forEach((e, i) => e.setAttribute('transform', `translate(${i ? 718 : 650} ${i ? 360 : 420}) scale(${(0.7 + 0.3 * s12).toFixed(2)})`));
        eD3a.setAttribute('transform', `translate(740 682) scale(${(0.75 + 0.25 * Math.min(2, s3)).toFixed(2)})`);
        eD3b.setAttribute('transform', `translate(1030 300) scale(${(0.75 + 0.25 * Math.min(2, s3)).toFixed(2)})`);
        txt -= dt;
        if (txt <= 0) {
          txt = 0.4;
          ['t4', 't3', 'rt3'].forEach((k, i) => {
            const L = M.LABS.find((x) => x.key === k);
            bT[i].textContent = L.name + ' : ' + fmt(M.lab(k), k === 'rt3' ? 2 : 1) + ' ' + L.unit;
          });
        }
      });

      HV.spotlight(dei, a, [
        { t: 'La thyroïde sécrète surtout de la T4', d: 'La T4 est la forme de réserve, exclusivement thyroïdienne ; la thyroïde ne fournit que 25 % de la T3 (p. 8).', spot: [[200, 520, 140]] },
        { t: 'D1 et D2 activent', d: 'En retirant un iode de l\'anneau externe, D1 (foie, rein, thyroïde) et D2 (cerveau, hypophyse, muscle, graisse brune) font de la T4 la T3 active : 75 % de la T3 (p. 8 ; enzymes : complément).', spot: [[684, 390, 100], [900, 300, 100]] },
        { t: 'D3 inactive', d: 'D3 retire un iode de l\'anneau interne : la T4 devient T3 reverse, la T3 devient T2, toutes deux inactives. Au placenta, elle protège le fœtus d\'un excès d\'hormones maternelles (complément).', spot: [[740, 682, 80], [1000, 760, 120], [1030, 300, 70], [1160, 300, 90]] },
        { t: 'Maladie grave : basse T3', d: 'Cliquez « Maladie grave » : moins de T3, plus de T3 reverse. Syndrome de basse T3L, sans dysfonction thyroïdienne (p. 22). Le scénario « Syndrome de basse T3 » du panneau change aussi le bilan simulé.', spot: [[70, 800, 820, 170], [70, 680, 320, 130]] },
        { t: 'Médicaments', d: 'Amiodarone, propranolol à forte dose, glucocorticoïdes à forte dose freinent D1 (complément). L\'amiodarone, riche en iode, peut aussi donner hypothyroïdie ou thyrotoxicose (p. 23, 27).', spot: [[420, 800, 470, 170]] }
      ]);
    }
  }, HV.LOUPE.L(2)));

  /* ======================================================================
     4. Nodule : EU-TIRADS et Bethesda
     ====================================================================== */
  const tir = HV.scene(Object.assign({
    id: 'tirads', parent: 'thyro', loupe: 'Nodule : EU-TIRADS',
    title: 'Nodule thyroïdien : EU-TIRADS et Bethesda', level: 'Notion',
    lead: 'L\'échographie, réalisée par un opérateur entraîné, est l\'examen clé devant un nodule : elle exprime le risque de malignité par le score EU-TIRADS (polycopié p. 15-16). Un seul critère de forte suspicion suffit pour classer EU-TIRADS 5. La décision de cytoponction dépend du score et de la taille ; la cytologie est classée selon Bethesda (complément).',
    points: [
      'EU-TIRADS 5 dès qu\'un critère est présent : forte hypoéchogénicité, microcalcifications, forme plus épaisse que large, bords irréguliers (p. 16).',
      'EU-TIRADS 2 : anéchogène (kyste), bénin ; 3 : iso- ou hyperéchogène ; 4 : modérément hypoéchogène (p. 16).',
      'Seuils de cytoponction : EU-TIRADS 3 > 20 mm, 4 > 15 mm, 5 > 10 mm (complément).',
      'TSH systématique ; scintigraphie seulement si TSH basse (p. 18). Calcitonine : contexte héréditaire, cytologie suspecte, avant chirurgie (p. 18).',
      'Bethesda I à VI : conduite selon la catégorie (complément).'
    ],
    legend: new Set([]),
    build(g, a) {
      a.frame('Nodule : EU-TIRADS et Bethesda', 'Composez le nodule : le score et la conduite s\'affichent');
      const st = { eco: 'mhypo', shape: 'oval', marg: 'reg', micro: false, mm: 18 };

      /* ---------- Schéma du nodule (pas une image échographique : les vraies images sont les figures du polycopié) ---------- */
      const US = { x: 60, y: 160, w: 700, h: 400 };
      const us = a.el('g', { 'data-info': 'zt-us' });
      a.el('rect', { x: US.x, y: US.y, width: US.w, height: US.h, rx: 18, class: 'zt-card' }, us);
      a.text(US.x + 20, US.y + 32, 'Schéma du lobe et du nodule (coupe transversale)', 'note strong', null, us);
      a.text(US.x + 20, US.y + 54, 'Teinte = échogénicité par rapport au parenchyme', 'note', null, us);
      const C = [400, 390];
      a.el('ellipse', { cx: C[0], cy: C[1], rx: 230, ry: 130, class: 'zt-paren' }, us);
      a.text(110, 290, 'parenchyme', 'note', null, us);
      a.el('circle', { cx: 120, cy: 470, r: 34, class: 'zt-art-c', 'data-info': 'zt-carotid' }, us);
      a.text(120, 532, 'carotide', 'note', { anchor: 'middle' }, us);
      a.path('M 660,500 C 676,430 716,400 750,396', 'zt-soft', us);
      a.text(735, 540, 'trachée', 'note', { anchor: 'end' }, us);
      const nodG = a.el('g', null, us);
      const nodFill = a.el('path', { d: '', class: 'zt-nod' }, nodG);
      const tex = a.el('g', null, nodG);
      seed = 57;
      const micro = [], cysts = [];
      for (let k = 0; k < 40; k++) cysts.push([rnd() * 1.4 - 0.7, rnd() * 1.4 - 0.7, 0.08 + rnd() * 0.07]);
      for (let k = 0; k < 12; k++) micro.push([(rnd() * 2 - 1) * 0.6, (rnd() * 2 - 1) * 0.6]);
      const irr = [];
      for (let k = 0; k < 24; k++) irr.push(rnd());
      a.path(`M ${US.x + 560},${US.y + 40} l 80,0`, 'zt-axis', us, { 'stroke-width': 4 });
      a.text(US.x + 600, US.y + 64, '10 mm', 'note', { anchor: 'middle' }, us);
      a.text(US.x + US.w / 2, US.y + US.h + 22, 'Schéma explicatif · images réelles : figures 6 et 7A à 7D du polycopié (pastille)', 'note', { anchor: 'middle' });
      HV.figBadge(a, 740, 182, ['6', '7A', '7B', '7C', '7D']);

      function drawNodule() {
        const R = 4 * Math.min(st.mm, 30); // 10 mm = 80 px de diamètre (dessin plafonné à 30 mm)
        const tall = st.shape === 'tall' && !cystic();
        const rx = (tall ? 0.8 : 1.2) * R, ry = (tall ? 1.2 : 0.8) * R;
        const irregular = st.marg === 'irr' && !cystic();
        let d = '';
        const N = 72;
        for (let i = 0; i <= N; i++) {
          const th = (i / N) * Math.PI * 2;
          let f = 1;
          if (irregular) f = 1 + 0.12 * Math.sin(th * 5 + 1) + 0.08 * Math.sin(th * 9) + (i % 6 === 0 ? 0.22 * irr[(i / 6) % 24] : 0);
          d += (i ? ' L ' : 'M ') + (C[0] + Math.cos(th) * rx * f).toFixed(1) + ',' + (C[1] + Math.sin(th) * ry * f).toFixed(1);
        }
        nodFill.setAttribute('d', d + ' Z');
        nodFill.setAttribute('class', 'zt-nod ' + st.eco);
        tex.textContent = '';
        if (st.eco === 'spong') cysts.forEach(([u, v, s]) => HV.el('circle', { cx: (C[0] + u * rx).toFixed(1), cy: (C[1] + v * ry).toFixed(1), r: (s * Math.min(rx, ry) + 2).toFixed(1), class: 'zt-nod anech' }, tex));
        if (st.micro && !cystic()) micro.forEach(([u, v]) => HV.el('circle', { cx: (C[0] + u * rx).toFixed(1), cy: (C[1] + v * ry).toFixed(1), r: 3, class: 'zt-calc' }, tex));
      }
      const cystic = () => st.eco === 'anech' || st.eco === 'spong';

      /* ---------- Commandes ---------- */
      const ctl = a.el('g', { transform: 'translate(0 22)' });
      const rows = [];
      a.text(60, 598, 'Échogénicité, composition', 'note strong', null, ctl);
      choice(a, tir, ctl, 60, 608, [['anech', 'anéchogène', 112], ['spong', 'spongiforme', 122, 'zt-spong'], ['iso', 'iso / hyper', 116], ['mhypo', 'modérément hypo', 156], ['shypo', 'fortement hypo', 146]], st.eco, (v) => { st.eco = v; update(); });
      a.text(60, 676, 'Forme', 'note strong', null, ctl);
      rows.push(choice(a, tir, ctl, 60, 686, [['oval', 'ovale, plus large qu\'épais', 236], ['tall', 'plus épais que large', 196]], st.shape, (v) => { st.shape = v; update(); }));
      a.text(60, 754, 'Contours', 'note strong', null, ctl);
      rows.push(choice(a, tir, ctl, 60, 764, [['reg', 'réguliers', 110], ['irr', 'irréguliers (lobulés, spiculés)', 262]], st.marg, (v) => { st.marg = v; update(); }));
      a.text(60, 832, 'Microcalcifications', 'note strong', null, ctl);
      rows.push(choice(a, tir, ctl, 60, 842, [[false, 'non', 70], [true, 'oui', 70]], st.micro, (v) => { st.micro = v; update(); }));
      a.text(360, 832, 'Plus grand diamètre', 'note strong', null, ctl);
      button(a, tir, ctl, 360, 842, 46, '−', () => { st.mm = Math.max(4, st.mm - 2); update(); });
      const mmT = a.text(470, 868, '', 'zt-mid', { anchor: 'middle' }, ctl);
      button(a, tir, ctl, 534, 842, 46, '+', () => { st.mm = Math.min(40, st.mm + 2); update(); });
      const cysNote = a.text(60, 920, '', 'note', null, ctl);
      a.text(60, 966, 'Critères : polycopié p. 16 ; spongiforme et seuils de taille : complément', 'note');

      /* ---------- Résultat ---------- */
      const res = card(a, null, 810, 160, 430, 400, 'zt-score');
      const scoreT = a.text(840, 222, '', 'zt-big', null, res.g);
      const riskT = a.text(840, 256, '', 'lbl-s strong', null, res.g);
      a.text(840, 296, 'Forte suspicion (un seul critère suffit, p. 16) :', 'note strong', null, res.g);
      const crit = [['shypo', 'forte hypoéchogénicité'], ['micro', 'microcalcifications'], ['tall', 'forme plus épaisse que large'], ['irr', 'bords irréguliers (lobulés, spiculés)']];
      const critT = crit.map((c, i) => a.text(860, 324 + i * 24, '', 'note', null, res.g));
      a.text(840, 436, 'Cytoponction (complément) :', 'note strong', null, res.g);
      const fnaT = a.text(840, 464, '', 'lbl-s strong', null, res.g);
      const fnaT2 = a.text(840, 490, ['', ''], 'note', { lh: 1.2 }, res.g);
      const fnaL = fnaT2.querySelectorAll('tspan');
      a.text(840, 544, 'Avant tout : TSH ; si basse → scintigraphie (p. 18).', 'note', null, res.g);

      const cal = card(a, null, 1260, 340, 290, 220, 'zt-calcit');
      a.text(1276, 368, 'Autres dosages (p. 18)', 'note strong', null, cal.g);
      a.text(1276, 396, ['Calcitonine : contexte', 'héréditaire de cancer', 'médullaire, cytologie suspecte,', 'avant toute chirurgie.', 'Thyroglobuline : aucun', 'intérêt devant un nodule.'], 'note', { lh: 1.2 }, cal.g);
      /* ---------- Bethesda ---------- */
      a.text(810, 600, 'Cytologie : système de Bethesda (complément)', 'lbl-h', { attrs: { 'data-info': 'zt-beth' } });
      const beth = [
        ['I', 'Non diagnostique', 'refaire la cytoponction échoguidée'],
        ['II', 'Bénin', 'surveillance clinique et échographique'],
        ['III', 'Atypies de signification indéterminée', 'nouvelle cytoponction, biologie moléculaire, ou chirurgie'],
        ['IV', 'Néoplasme folliculaire', 'chirurgie diagnostique (lobectomie) ou biologie moléculaire'],
        ['V', 'Suspect de malignité', 'chirurgie ; calcitonine (cytologie suspecte, p. 18)'],
        ['VI', 'Malin', 'chirurgie ; calcitonine avant toute chirurgie (p. 18)']
      ];
      beth.forEach(([n, t, c], i) => {
        const y = 618 + i * 58;
        const gg = a.el('g', { 'data-info': i >= 4 ? 'zt-calcit' : 'zt-beth' });
        a.el('rect', { x: 810, y, width: 740, height: 52, rx: 12, class: 'zt-card' }, gg);
        a.el('rect', { x: 820, y: y + 9, width: 52, height: 34, rx: 17, class: 'sig-box', style: `--c: var(${['--p-grey', '--p-green', '--p-gold', '--p-amber', '--p-orange', '--p-red'][i]})` }, gg);
        a.text(846, y + 32, n, 'note strong', { anchor: 'middle' }, gg);
        a.text(888, y + 22, t, 'note strong', null, gg);
        a.text(888, y + 43, '→ ' + c, 'note', null, gg);
      });

      function update() {
        const cy = cystic();
        rows.forEach((r) => r.btns.forEach(([, b]) => b.classList.toggle('off', cy)));
        cysNote.textContent = cy ? 'Kyste pur ou nodule spongiforme : les autres critères ne s\'appliquent pas.' : '';
        const hits = { shypo: st.eco === 'shypo', micro: st.micro, tall: st.shape === 'tall', irr: st.marg === 'irr' };
        let score;
        if (cy) score = 2;
        else if (hits.shypo || hits.micro || hits.tall || hits.irr) score = 5;
        else score = st.eco === 'iso' ? 3 : 4;
        scoreT.textContent = 'EU-TIRADS ' + score;
        scoreT.style.fill = ['', '', 'var(--good)', 'var(--good)', 'var(--warn)', 'var(--bad)'][score];
        riskT.textContent = ['', '', 'Bénin (p. 16)', 'Risque faible, voire très faible (p. 16)', 'Risque intermédiaire (p. 16)', 'Risque maximal (p. 16)'][score];
        crit.forEach(([k, l], i) => {
          const on = !cy && hits[k];
          critT[i].textContent = (on ? '● ' : '○ ') + l;
          critT[i].classList.toggle('strong', on);
        });
        const thr = { 2: null, 3: 20, 4: 15, 5: 10 }[score];
        if (!thr) { fnaT.textContent = 'Pas de cytoponction diagnostique'; fnaL[0].textContent = 'Nodule bénin (complément).'; fnaL[1].textContent = ''; }
        else if (st.mm > thr) { fnaT.textContent = st.mm + ' mm : cytoponction indiquée'; fnaL[0].textContent = 'Seuil pour EU-TIRADS ' + score + ' : > ' + thr + ' mm.'; fnaL[1].textContent = ''; }
        else { fnaT.textContent = st.mm + ' mm : pas de cytoponction'; fnaL[0].textContent = 'Seuil pour EU-TIRADS ' + score + ' : > ' + thr + ' mm.'; fnaL[1].textContent = 'Surveillance échographique.'; }
        fnaT.style.fill = thr && st.mm > thr ? 'var(--bad)' : 'var(--fg)';
        mmT.textContent = st.mm + ' mm';
        drawNodule();
      }
      update();

      HV.spotlight(tir, a, [
        { t: 'L\'échographie, examen clé', d: 'Localisation, taille, caractéristiques du nodule et aires ganglionnaires ; risque exprimé par le score EU-TIRADS (p. 15). Coupe transversale schématique : carotide en dehors, trachée en dedans.', spot: [[60, 160, 700, 400]] },
        { t: 'Les critères de forte suspicion', d: 'Forte hypoéchogénicité, microcalcifications, forme plus épaisse que large, bords irréguliers : un seul suffit pour EU-TIRADS 5 (p. 16). Essayez-les.', spot: [[50, 580, 600, 320], [810, 280, 740, 140]] },
        { t: 'Les autres scores', d: 'Anéchogène : EU-TIRADS 2, bénin. Iso- ou hyperéchogène : 3. Modérément hypoéchogène : 4 (p. 16, figures 7A à 7D).', spot: [[50, 580, 690, 80], [830, 170, 380, 100]] },
        { t: 'La taille décide de la cytoponction', d: 'Seuils : > 20 mm pour EU-TIRADS 3, > 15 mm pour 4, > 10 mm pour 5 (complément). Changez la taille avec − et +.', spot: [[350, 820, 250, 80], [810, 420, 740, 90]] },
        { t: 'La cytologie : Bethesda', d: 'Six catégories, chacune avec sa conduite (complément). La calcitonine est dosée si la cytologie est suspecte et avant toute chirurgie (p. 18).', spot: [[800, 580, 760, 400]] }
      ]);
    }
  }, HV.LOUPE.L(3)));

  /* ======================================================================
     5. Thyroïde et grossesse
     ====================================================================== */
  const X0 = 150, X1 = 900, Y0 = 720, YK = 190; // 1 unité = 190 px
  const wx = (w) => X0 + (w / 40) * (X1 - X0);
  const vy = (v) => Y0 - v * YK;
  const CURVES = [
    { key: 'hcg', name: 'hCG', info: 'zt-hcg', c: '--p-magenta', f: (w) => (0.95 * Math.exp(-Math.pow((w - 10) / 3.2, 2)) + 0.22 * ss(9, 16, w)) * ss(3, 7, w) * 2.4, ly: 0 },
    { key: 'tbg', name: 'TBG', info: 'zt-tbg', c: '--p-teal', f: (w) => 1 + ss(5, 20, w), ly: 0 },
    { key: 't4t', name: 'T4 totale', info: 'zt-t4tot', c: '--p-orange', f: (w) => 1 + 0.5 * ss(6, 20, w), ly: 0 },
    { key: 'tsh', name: 'TSH', info: 'zt-tshp', c: '--p-blue', f: (w) => 1 - 0.45 * Math.exp(-Math.pow((w - 10.5) / 3.6, 2)) - 0.06 * ss(12, 20, w), ly: -16 },
    { key: 't4l', name: 'T4 libre', info: 'zt-t4lp', c: '--p-red', f: (w) => 1 + 0.12 * Math.exp(-Math.pow((w - 10.5) / 3, 2)) - 0.12 * ss(14, 34, w), ly: 22 }
  ];
  const preg = HV.scene(Object.assign({
    id: 'thyro-preg', parent: 'thyro', loupe: 'Grossesse',
    title: 'Thyroïde et grossesse', level: 'Notion',
    lead: 'La grossesse modifie le bilan thyroïdien sans maladie : l\'hCG, proche de la TSH, stimule la thyroïde en fin de 1er trimestre (TSH plus basse, T4L un peu plus haute) ; les œstrogènes augmentent la TBG, donc la T4 totale. Les besoins en iode et en lévothyroxine augmentent ; les TRAb franchissent le placenta (complément, sauf mention).',
    points: [
      'Grossesse : situation à risque d\'apports iodés insuffisants (polycopié p. 10) ; goitre qui augmente pendant la grossesse (p. 11).',
      'Thyrotoxicose gestationnelle transitoire : 1er trimestre, vomissements incoercibles, après avoir éliminé une maladie de Basedow (p. 27).',
      'Hyperthyroïdie maternelle : risque de fausse couche, pré-éclampsie, retard de croissance intra-utérin, prématurité (p. 26).',
      'Courbes schématiques, sans valeurs : normes propres au trimestre et au laboratoire (complément).'
    ],
    legend: new Set(['trab', 'iod', 't4']),
    build(g, a) {
      a.frame('Thyroïde et grossesse', 'Courbes schématiques sur 40 semaines d\'aménorrhée (SA) · complément sauf mention');
      // Trimestres
      [[0, 14, 'T1'], [14, 28, 'T2'], [28, 40, 'T3']].forEach(([w0, w1, n], i) => {
        if (i !== 1) a.el('rect', { x: wx(w0), y: 180, width: wx(w1) - wx(w0), height: Y0 - 180, class: 'zt-band' });
        a.text((wx(w0) + wx(w1)) / 2, 202, n + ' trimestre'.replace(' trimestre', ''), 'lbl-s strong', { anchor: 'middle' });
      });
      a.path(`M ${X0},180 L ${X0},${Y0} L ${X1},${Y0}`, 'zt-axis');
      for (let w = 0; w <= 40; w += 10) {
        a.path(`M ${wx(w)},${Y0} L ${wx(w)},${Y0 + 8}`, 'zt-axis');
        a.text(wx(w), Y0 + 30, String(w), 'note', { anchor: 'middle' });
      }
      a.text((X0 + X1) / 2, Y0 + 56, 'semaines d\'aménorrhée (SA)', 'note', { anchor: 'middle' });
      a.path(`M ${X0},${vy(1)} L ${X1},${vy(1)}`, 'zt-base');
      a.text(X0 - 10, vy(1) + 6, '1', 'note', { anchor: 'end' });
      a.text(X0 - 10, vy(2) + 6, '×2', 'note', { anchor: 'end' });
      a.path(`M ${X0 - 6},${vy(2)} L ${X0},${vy(2)}`, 'zt-axis');
      a.text(70, 240, ['hors', 'grossesse', '= 1'], 'note', { lh: 1.15 });
      // Courbes
      const dots = [];
      CURVES.forEach((cv) => {
        let d = '';
        for (let w = 0; w <= 40; w += 0.25) d += (w ? ' L ' : 'M ') + wx(w).toFixed(1) + ',' + vy(cv.f(w)).toFixed(1);
        const gg = a.el('g', { 'data-info': cv.info, style: `--c: var(${cv.c})` });
        a.path(d, 'zt-curve', gg);
        a.text(X1 + 12, vy(cv.f(40)) + 6 + cv.ly, cv.name, 'note strong', null, gg).style.fill = `var(${cv.c})`;
        dots.push([cv, a.el('circle', { r: 7, class: 'zt-dotc', style: `--c: var(${cv.c})` })]);
      });
      a.text(wx(10) + 30, vy(2.45) - 10, 'pic d\'hCG (échelle propre)', 'note');
      const cur = a.path(`M ${wx(0)},190 L ${wx(0)},${Y0}`, 'zt-cursor');
      cur.parentNode.insertBefore(cur, cur.parentNode.firstChild.nextSibling);

      /* ---------- Lecture au curseur ---------- */
      const rd = card(a, null, 1020, 160, 220, 270);
      const wT = a.text(1040, 200, '', 'zt-mid', null, rd.g);
      const trT = a.text(1040, 226, '', 'note', null, rd.g);
      const vals = CURVES.map((cv, i) => {
        const t = a.text(1040, 266 + i * 30, '', 'note strong', null, rd.g);
        t.style.fill = `var(${cv.c})`;
        return t;
      });
      a.text(1020, 466, ['Courbes schématiques, sans', 'valeurs : normes propres au', 'trimestre et au laboratoire', '(complément).'], 'note', { lh: 1.2 });
      const mc = card(a, null, 70, 820, 1170, 140);
      const msg = a.text(90, 852, ['', '', '', ''], 'note', { lh: 1.3 }, mc.g);
      const msgL = msg.querySelectorAll('tspan');
      const MSG = [
        ['1er trimestre : l\'hCG, proche de la TSH, stimule son récepteur : T4L un peu ↑, TSH ↓, de façon physiologique (complément).',
          'Vomissements incoercibles : thyrotoxicose gestationnelle transitoire, après avoir éliminé une maladie de Basedow (p. 27).',
          'Hyperthyroïdie maternelle : risque de fausse couche, pré-éclampsie, retard de croissance intra-utérin, prématurité (p. 26).',
          'Thyroïde fœtale : captation de l\'iode vers 10–12 SA, production importante vers 18–20 SA ; avant, surtout la T4 maternelle (complément).'],
        ['2e trimestre : les œstrogènes augmentent la TBG (environ ×2), qui transporte 75 % des hormones (p. 8) : la T4 totale monte.',
          'Ce n\'est pas une hyperthyroïdie : on interprète la T4 libre, non liée à la TBG (p. 8), avec des normes adaptées (complément).',
          'Femme traitée par lévothyroxine : besoins augmentés, dose à adapter sur la TSH (complément).',
          'Iode : la grossesse est une situation à risque d\'apports insuffisants (p. 10) ; le goitre peut augmenter (p. 11).'],
        ['3e trimestre : TBG et T4 totale en plateau (complément).',
          'Maladie de Basedow, même ancienne ou traitée : les TRAb (IgG) franchissent le placenta (complément).',
          'Ils peuvent stimuler la thyroïde fœtale : risque d\'hyperthyroïdie fœtale ou néonatale (complément).',
          '']
      ];
      const lbl = (v) => (v > 1.08 ? '↑' : v < 0.92 ? '↓' : '≈ normal');

      /* ---------- Points clés ---------- */
      const keys = [
        ['zt-pla', 'Iode', ['Situation à risque d\'apports', 'insuffisants (p. 10).']],
        ['zt-pla', 'Lévothyroxine', ['Femme traitée : besoins ↑,', 'dose à adapter (complément).']],
        ['zt-trab-s', 'TRAb', ['Franchissent le placenta', '(complément).']]
      ];
      keys.forEach(([info, t, ls], i) => {
        const y = 340 + i * 92;
        const c = card(a, null, 1260, y, 290, 82, info);
        a.text(1276, y + 24, t, 'note strong', null, c.g);
        a.text(1276, y + 46, ls, 'note', { lh: 1.15 }, c.g);
      });

      /* ---------- Placenta ---------- */
      const pg = a.el('g', { 'data-info': 'zt-pla' });
      a.el('rect', { x: 1260, y: 620, width: 290, height: 340, rx: 16, class: 'zt-card' }, pg);
      a.text(1276, 648, 'Mère', 'note strong', null, pg);
      a.text(1276, 946, 'Fœtus', 'note strong', null, pg);
      a.path('M 1266,780 C 1340,756 1460,806 1544,780 L 1544,826 C 1460,852 1340,802 1266,826 Z', 'zt-pharynx', pg);
      a.text(1276, 772, 'placenta', 'note', null, pg);
      const trabRate = () => (P.trab > 0.02 ? 0.6 + 1.2 * P.trab : 0.25);
      a.flow('M 1310,700 C 1314,780 1314,860 1314,920', { mol: 'iod', rate: () => 1.4, size: 1.2, speed: 60, track: false });
      a.flow('M 1400,700 C 1404,780 1404,860 1404,920', { mol: 'trab', rate: trabRate, size: 1.3, speed: 60, track: false });
      a.flow('M 1500,700 C 1500,740 1500,770 1502,796', { mol: 't4', rate: () => 1.2, size: 1.2, speed: 60, track: false });
      a.flow('M 1510,806 C 1514,850 1514,890 1514,920', { mol: 'rt3', rate: () => 0.6, size: 1.1, speed: 50, track: false });
      a.text(1310, 694, 'iode', 'note', { anchor: 'middle' }, pg);
      a.text(1400, 694, 'TRAb', 'note', { anchor: 'middle' }, pg);
      a.text(1500, 694, 'T4', 'note', { anchor: 'middle' }, pg);
      a.text(1490, 872, ['D3 :', 'T4 → rT3'], 'note', { anchor: 'end', lh: 1.1 }, pg);
      const trabT = a.text(1540, 648, '', 'note', { anchor: 'end' }, pg);

      let t = 0, txt = 0;
      a.dyn((dt) => {
        t = (t + dt) % 24;
        const w = 40 * Math.min(1, t / 22);
        const x = wx(w);
        cur.setAttribute('d', `M ${x.toFixed(1)},190 L ${x.toFixed(1)},${Y0}`);
        dots.forEach(([cv, d]) => { d.setAttribute('cx', x.toFixed(1)); d.setAttribute('cy', vy(cv.f(w)).toFixed(1)); });
        txt -= dt;
        if (txt <= 0) {
          txt = 0.25;
          const tri = w < 14 ? 0 : w < 28 ? 1 : 2;
          wT.textContent = Math.round(w) + ' SA';
          trT.textContent = ['1er', '2e', '3e'][tri] + ' trimestre';
          CURVES.forEach((cv, i) => {
            const v = cv.f(w);
            vals[i].textContent = cv.name + ' : ' + (cv.key === 'hcg' ? (v > 1.8 ? 'pic' : v > 0.9 ? '↑' : v > 0.05 ? 'présente' : 'indosable') : lbl(v));
          });
          MSG[tri].forEach((l, i) => { msgL[i].textContent = l; });
          trabT.textContent = 'TRAb (modèle) : ' + fmt(P.trab * 4, 1) + ' UI/L';
        }
      });

      HV.spotlight(preg, a, [
        { t: 'L\'hCG au 1er trimestre', d: 'Son pic, en fin de 1er trimestre, stimule le récepteur de la TSH : T4L un peu plus haute, TSH plus basse, physiologiques (complément). Des vomissements incoercibles font évoquer une thyrotoxicose gestationnelle transitoire (p. 27).', spot: [[wx(0), 180, wx(16) - wx(0), Y0 - 170]] },
        { t: 'TBG et T4 totale', d: 'Les œstrogènes augmentent la TBG (environ ×2), qui transporte 75 % des hormones (p. 8) : la T4 totale monte sans hyperthyroïdie. On interprète la T4 libre (complément).', spot: [[wx(5), 280, wx(40) - wx(5) + 100, 200]] },
        { t: 'Iode et lévothyroxine', d: 'La grossesse est une situation à risque d\'apports iodés insuffisants (p. 10). Chez la femme traitée, les besoins en lévothyroxine augmentent dès le début (complément).', spot: [[1250, 330, 310, 280], [60, 810, 1190, 160]] },
        { t: 'Le placenta', d: 'L\'iode et les TRAb le franchissent ; D3 inactive une partie de la T4 maternelle (complément). En cas de maladie de Basedow, même ancienne, risque d\'hyperthyroïdie fœtale ou néonatale (complément).', spot: [[1250, 610, 310, 360]] }
      ]);
    }
  }, HV.LOUPE.L(4)));

  /* ======================================================================
     6. Auto-immunité thyroïdienne
     ====================================================================== */
  const ai = HV.scene(Object.assign({
    id: 'thyro-ai', parent: 'thyro', loupe: 'Auto-immunité',
    title: 'Auto-immunité thyroïdienne', level: 'Cellule',
    lead: 'Dans la maladie de Basedow, des auto-anticorps anti-récepteurs de la TSH (TRAb) stimulent la thyroïde (polycopié p. 31). Dans la maladie de Hashimoto, un infiltrat lymphocytaire détruit la glande ; les anticorps anti-TPO en sont le marqueur (p. 23). L\'orbitopathie basedowienne est liée aux récepteurs de la TSH orbitaires et résulte de l\'auto-immunité, pas de l\'hyperthyroïdie (p. 31).',
    points: [
      'TRAb positifs : confirment la maladie de Basedow (p. 28) ; fixation diffuse à la scintigraphie (figure 9B, p. 29).',
      'Anti-TPO élevés : diagnostic de Hashimoto retenu, sans répéter le dosage (p. 23).',
      'Orbitopathie : muscles oculomoteurs hypertrophiés, graisse rétro-orbitaire ; tabac, principal facteur de risque (p. 31).',
      'TRAb bloquants, anti-thyroglobuline, mécanisme cellulaire : complément.'
    ],
    legend: new Set(['trab', 'tsh', 't4']),
    build(g, a) {
      a.frame('Auto-immunité thyroïdienne', 'Basedow (TRAb) · Hashimoto (infiltrat, anti-TPO) · orbitopathie');
      let mode = 'stim', demo = true;
      const lvl = () => (demo ? 1.5 : P.trab);
      // Glyphes d'anticorps locaux
      const defs = a.el('defs');
      [['zt-tpoab', 'tpo'], ['zt-tgab', 'tg']].forEach(([id, c]) => {
        const s = a.el('g', { id: 'mol-' + id }, defs);
        a.path('M 0,9 L 0,0 L -7,-8 M 0,0 L 7,-8', 'zt-ab ' + c, s);
      });

      /* ---------- Basedow ---------- */
      a.text(70, 186, 'Maladie de Basedow', 'lbl-h');
      a.el('rect', { x: 90, y: 230, width: 400, height: 60, rx: 20, class: 'zt-colloid', 'data-info': 'colloid' });
      a.text(290, 266, 'colloïde', 'note', { anchor: 'middle' });
      const cell = a.el('rect', { x: 100, y: 296, width: 380, height: 360, rx: 50, class: 'zt-tcell-wall', 'data-info': 'thyrocyte' });
      a.el('ellipse', { cx: 390, cy: 380, rx: 50, ry: 38, class: 'nucleus' });
      a.vessel('M 70,770 L 510,770', 22);
      a.text(500, 812, 'capillaire', 'note', { anchor: 'end' });
      const camp = a.el('circle', { cx: 230, cy: 470, r: 34, class: 'zt-camp', 'data-info': 'zt-camp' });
      a.text(230, 476, 'AMPc', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zt-camp' } });
      const effT = a.text(290, 560, ['synthèse et sécrétion ↑', 'croissance → goitre diffus'], 'note strong', { anchor: 'middle', lh: 1.2 });
      const recs = [170, 290, 410].map((x) => {
        const r = a.el('rect', { x: x - 10, y: 636, width: 20, height: 44, rx: 7, class: 'zt-recep', 'data-info': 'zt-tshr' });
        return r;
      });
      a.text(290, 626, 'récepteur de la TSH ↓', 'note', { anchor: 'middle', attrs: { 'data-info': 'zt-tshr' } });
      [170, 290, 410].forEach((x) => a.flow(`M ${x},760 L ${x},${690}`, { mol: 'trab', rate: () => 0.25 + 0.6 * lvl(), size: 1.4, speed: 40, track: false, info: mode === 'stim' ? 'zt-trab-s' : 'zt-trab-b' }));
      a.flow('M 470,690 L 470,760', { mol: 't4', rate: () => (mode === 'stim' ? 0.4 + 0.8 * lvl() : 0.15), size: 1.2, speed: 50, track: false });
      const modeC = choice(a, ai, null, 70, 840, [['stim', 'TRAb stimulants', 170, 'zt-trab-s'], ['block', 'TRAb bloquants', 160, 'zt-trab-b']], mode, (v) => { mode = v; });
      a.text(70, 904, ['Stimulants : hyperthyroïdie (p. 31).', 'Bloquants : hypothyroïdie (complément).'], 'note', { lh: 1.15 });
      HV.figBadge(a, 500, 200, ['9B']);
      void modeC;

      /* ---------- Hashimoto ---------- */
      a.text(570, 186, 'Thyroïdite de Hashimoto', 'lbl-h');
      a.el('rect', { x: 580, y: 230, width: 440, height: 70, rx: 20, class: 'zt-colloid', 'data-info': 'colloid' });
      a.text(800, 262, 'colloïde : thyroglobuline', 'note', { anchor: 'middle' });
      const hcells = [];
      for (let i = 0; i < 4; i++) {
        const x = 584 + i * 110;
        const c = a.el('rect', { x, y: 306, width: 102, height: 150, rx: 18, class: 'zt-tcell-wall' + (i === 1 || i === 3 ? ' zt-dead' : ''), 'data-info': 'thyrocyte' });
        hcells.push(c);
        a.el('ellipse', { cx: x + 51, cy: 400, rx: 22, ry: 17, class: 'nucleus' + (i === 1 || i === 3 ? ' zt-dead' : '') });
        a.el('rect', { x: x + 34, y: 302, width: 34, height: 14, rx: 7, class: 'zt-tpo', 'data-info': 'zt-tpoab' });
      }
      a.text(1030, 330, 'TPO', 'note strong', { anchor: 'end', attrs: { 'data-info': 'zt-tpoab' } });
      const inf = a.el('g', { 'data-info': 'zt-infil' });
      seed = 5;
      for (let k = 0; k < 24; k++) a.el('circle', { cx: 600 + rnd() * 400, cy: 568 + rnd() * 90, r: 10 + rnd() * 4, class: 'zt-lympho' }, inf);
      a.text(800, 690, 'infiltrat lymphocytaire', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zt-infil' } });
      const tc = a.el('g', { 'data-info': 'zt-tcyt' });
      [[700, 476], [920, 476]].forEach(([x, y]) => a.el('circle', { cx: x, cy: y, r: 16, class: 'zt-tcell' }, tc));
      a.text(944, 492, 'LT cytotoxique', 'note', { attrs: { 'data-info': 'zt-tcyt' } });
      const pl = a.el('g', { 'data-info': 'zt-plasmo' });
      a.el('ellipse', { cx: 630, cy: 520, rx: 26, ry: 20, class: 'zt-lympho' }, pl);
      a.el('ellipse', { cx: 990, cy: 530, rx: 26, ry: 20, class: 'zt-lympho' }, pl);
      a.text(700, 526, 'plasmocyte', 'note', { anchor: 'middle', attrs: { 'data-info': 'zt-plasmo' } });
      a.flow('M 630,500 C 640,440 640,380 640,322', { mol: 'zt-tpoab', rate: () => 1.2, size: 1.3, speed: 50, track: false });
      a.flow('M 990,510 C 1000,440 1000,330 960,280', { mol: 'zt-tgab', rate: () => 1, size: 1.3, speed: 50, track: false });
      a.text(1030, 760, ['anti-TPO : marqueur ;', 's\'ils sont élevés, diagnostic', 'retenu, sans nouveau dosage (p. 23)'], 'note', { anchor: 'end', lh: 1.2 });
      a.text(580, 760, ['anti-Tg', '(complément)'], 'note', { lh: 1.2, attrs: { 'data-info': 'zt-tgab' } });
      a.text(580, 870, ['Destruction surtout cellulaire (complément) :', 'hypothyroïdie primaire, TSH ↑ (p. 19).', 'Glande augmentée ou atrophique,', 'ferme et hétérogène (p. 21-22).'], 'note', { lh: 1.2 });

      /* ---------- Orbitopathie ---------- */
      a.text(1080, 186, 'Orbitopathie', 'lbl-h');
      a.text(1080, 214, 'coupe sagittale', 'note');
      const OY = 100; // décalage vertical du schéma
      const orb = a.el('g', { 'data-info': 'zt-orbit', transform: `translate(0 ${OY})` });
      a.path('M 1110,250 L 1500,400 L 1500,460 L 1110,610 Z', 'zt-orbit', orb);
      const og = a.el('g', { transform: `translate(0 ${OY})` });
      const fat = a.el('g', { 'data-info': 'zt-orbit' }, og);
      seed = 9;
      for (let k = 0; k < 22; k++) a.el('ellipse', { cx: 1240 + rnd() * 220, cy: 330 + rnd() * 200, rx: 16, ry: 12, class: 'zt-fat' }, fat);
      a.path('M 1230,430 C 1320,426 1420,430 1500,430', 'zt-nerve', og, { 'data-info': 'zt-optic' });
      const musU = a.el('ellipse', { cx: 1350, cy: 370, rx: 110, ry: 18, transform: 'rotate(12 1350 370)', class: 'zt-muscle', 'data-info': 'zt-eom' }, og);
      const musD = a.el('ellipse', { cx: 1350, cy: 490, rx: 110, ry: 18, transform: 'rotate(-12 1350 490)', class: 'zt-muscle', 'data-info': 'zt-eom' }, og);
      const globe = a.el('g', { 'data-info': 'zt-orbit' }, og);
      a.el('circle', { cx: 1180, cy: 430, r: 70, class: 'zt-globe' }, globe);
      a.el('circle', { cx: 1112, cy: 430, r: 18, class: 'zt-lympho' }, globe);
      a.text(1420, 300, 'muscles oculomoteurs', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zt-eom' } }, og);
      a.text(1450, 590, 'graisse', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zt-orbit' } }, og);
      a.text(1540, 470, ['nerf', 'optique'], 'note', { anchor: 'end', lh: 1.1, attrs: { 'data-info': 'zt-optic' } }, og);
      const exT = a.text(1080, 760, '', 'note strong');
      // Fibroblaste
      const fb = a.el('g', { 'data-info': 'zt-fibro' });
      a.el('ellipse', { cx: 1170, cy: 860, rx: 80, ry: 38, class: 'zt-tcell-wall' }, fb);
      a.el('ellipse', { cx: 1170, cy: 864, rx: 22, ry: 15, class: 'nucleus' }, fb);
      a.el('rect', { x: 1160, y: 806, width: 20, height: 30, rx: 7, class: 'zt-recep', 'data-info': 'zt-tshr' }, fb);
      a.flow('M 1170,776 L 1170,806', { mol: 'trab', rate: () => 0.2 + 0.6 * lvl(), size: 1.3, speed: 20, track: false });
      a.text(1266, 820, ['fibroblaste orbitaire (complément)', 'récepteur de la TSH (p. 31)', '→ adipocytes, glycosamino-', 'glycanes : volume ↑ (complément)'], 'note', { lh: 1.2, attrs: { 'data-info': 'zt-fibro' } });
      a.text(1080, 950, 'Tabac : principal facteur de risque (p. 31)', 'note strong');
      HV.figBadge(a, 1520, 940, ['8']);

      // Démonstration / modèle
      choice(a, ai, null, 70, 946, [[true, 'Démonstration', 150, 'zt-demo'], [false, 'Modèle (panneau)', 170, 'zt-demo']], demo, (v) => { demo = v; });
      const lvT = a.text(80, 812, '', 'note');

      let ph = 0, txt = 0;
      a.dyn((dt) => {
        ph += dt;
        const L = clamp(lvl(), 0, 3);
        const k = Math.min(1, L / 1.5);
        const stim = mode === 'stim';
        const act = stim ? k : 0.1;
        camp.setAttribute('r', (22 + 22 * act + (stim ? 2 * Math.sin(ph * 4) * k : 0)).toFixed(1));
        recs.forEach((r) => r.classList.toggle('blocked', !stim && k > 0.05));
        cell.setAttribute('height', (330 + 30 * act).toFixed(0));
        cell.setAttribute('y', (326 - 30 * act).toFixed(0));
        musU.setAttribute('ry', (18 + 14 * k).toFixed(1));
        musD.setAttribute('ry', (18 + 14 * k).toFixed(1));
        globe.setAttribute('transform', `translate(${(-26 * k).toFixed(1)} 0)`);
        txt -= dt;
        if (txt <= 0) {
          txt = 0.3;
          effT.querySelectorAll('tspan')[0].textContent = stim ? (k > 0.05 ? 'synthèse et sécrétion ↑' : 'stimulation par la TSH seule') : 'TSH empêchée de se fixer';
          effT.querySelectorAll('tspan')[1].textContent = stim ? (k > 0.05 ? 'croissance → goitre diffus' : '') : 'AMPc ↓ → hypothyroïdie';
          exT.textContent = k > 0.05 ? 'Orbitopathie (moitié des cas, p. 31) : le contenu de l\'orbite augmente' : 'Orbite normale : TRAb du modèle négatifs';
          lvT.textContent = 'TRAb : ' + (demo ? 'élevés (démonstration)' : fmt(P.trab * 4, 1) + ' UI/L (modèle)');
        }
      });

      HV.spotlight(ai, a, [
        { t: 'Basedow : les TRAb stimulent', d: 'Les TRAb se fixent sur le récepteur de la TSH et le stimulent sans rétrocontrôle : synthèse et sécrétion d\'hormones ↑, goitre diffus vasculaire (p. 26, 31). Fixation diffuse à la scintigraphie (figure 9B).', spot: [[60, 160, 480, 680]] },
        { t: 'TRAb bloquants', d: 'Cliquez « TRAb bloquants » : l\'anticorps occupe le récepteur sans l\'activer, la TSH ne peut plus agir : hypothyroïdie (complément).', spot: [[60, 830, 360, 60], [290, 660, 160]] },
        { t: 'Hashimoto : l\'infiltrat détruit', d: 'Les lymphocytes infiltrent la glande et détruisent les thyréocytes (complément) : hypothyroïdie primaire (p. 19). Les anti-TPO, dirigés contre l\'enzyme de la face apicale, sont le marqueur (p. 23).', spot: [[560, 160, 480, 640]] },
        { t: 'Orbitopathie', d: 'Liée aux récepteurs de la TSH orbitaires : muscles oculomoteurs et graisse augmentent de volume, l\'œil est poussé en avant (p. 31). Formes sévères : compression du nerf optique (p. 32). Rôle des fibroblastes : complément.', spot: [[1070, 330, 480, 450]] },
        { t: 'Auto-immunité, pas hyperthyroïdie', d: 'L\'orbitopathie résulte de l\'auto-immunité thyroïdienne et non de l\'hyperthyroïdie ; le tabac en est le principal facteur de risque (p. 31). Passez en « Modèle » et choisissez « Maladie de Basedow » dans le panneau.', spot: [[1070, 790, 480, 190], [60, 930, 360, 60]] }
      ]);
    }
  }, HV.LOUPE.L(5)));
})();
