/* Loupes de l'axe glycémique : récepteur de l'insuline, foie du repas au jeûne, incrétines,
   complications du diabète, appétit et poids. Toutes lisent le modèle « glyc » (axes-sim.js).
   Les notions hors polycopié sont marquées « (complément) ». */
(function () {
  'use strict';
  const HV = window.HV;
  const clamp = HV.clamp;
  const sim = () => HV.scenes.glyc.sim;
  const S = () => sim().s, P = () => sim().p;
  const f2 = (v) => v.toFixed(2).replace('.', ',');
  const G = (x, m, w) => Math.exp(-Math.pow((x - m) / w, 2));

  /* ---------- Outils communs ---------- */
  // Le modèle de l'axe n'est animé que par la scène parente : quand elle est masquée (on est dans une loupe),
  // la loupe fait avancer l'horloge et le modèle (une seule fois par image).
  let lastStep = 0;
  function keepAlive(dt) {
    if (!(dt > 0)) return;
    const par = HV.scenes.glyc;
    if (par._op !== 0) return;
    const now = performance.now();
    if (now - lastStep < 4) return;
    lastStep = now;
    const M = sim();
    M.T.h = (M.T.h + dt * 0.5) % 24;
    M.step(dt, M.T);
  }
  // Apport alimentaire (même forme que dans le modèle) : repas, jeûne, charge orale.
  const food = () => {
    const M = sim(), p = M.p, h = M.T.h;
    return HV.rhythm.meals.reduce((a, m) => a + G((h - m + 24) % 24, 0.8, 0.6), 0) * (1 - p.fast) + 4 * p.ogtt;
  };
  const wrap = (str, n) => {
    const out = [];
    let cur = '';
    str.split(' ').forEach((w) => {
      if (cur && (cur + ' ' + w).length > n) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
    });
    if (cur) out.push(cur);
    return out;
  };
  function setLines(t, x, lines, lh) {
    t.textContent = '';
    lines.forEach((ln, i) => HV.el('tspan', { x, dy: i ? (lh || 1.3) + 'em' : 0, text: ln }, t));
  }
  function pill(a, x, y, txt, color, o) {
    o = o || {};
    const h = o.h || 38, w = o.w || Math.round(txt.length * 9.4 + 34);
    const g = a.el('g', { transform: `translate(${x} ${y})`, 'data-info': o.info || null, class: o.cls || null }, o.parent);
    a.el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: Math.min(h / 2, 14), class: 'sig-box', style: `--c: var(--${color})` }, g);
    a.text(0, 6, txt, o.tcls || 'note strong', { anchor: 'middle' }, g);
    return g;
  }
  function bar(a, x, y, w, label, color, parent) {
    const g = a.el('g', { transform: `translate(${x} ${y})` }, parent);
    a.text(0, 0, label, 'note', null, g);
    const val = a.text(w, 0, '', 'note strong', { anchor: 'end' }, g);
    a.el('rect', { x: 0, y: 10, width: w, height: 13, rx: 6.5, class: 'lvl-bg' }, g);
    const b = a.el('rect', { x: 0, y: 10, width: 8, height: 13, rx: 6.5, class: 'lvl-bar', style: `--mc: var(--${color})` }, g);
    return { g, set(v, txt) { b.setAttribute('width', (8 + (w - 8) * clamp(v, 0, 1)).toFixed(1)); if (txt != null) val.textContent = txt; } };
  }
  function button(a, x, y, w, label, onDown, info) {
    const g = a.el('g', { class: 'zgl-btn', transform: `translate(${x} ${y})`, 'data-info': info || null });
    a.el('rect', { x: 0, y: 0, width: w, height: 42, rx: 21 }, g);
    const t = a.text(w / 2, 28, label, 'zgl-btn-t', { anchor: 'middle' }, g);
    g.addEventListener('pointerdown', (e) => { e.stopPropagation(); onDown(); });
    return { g, t };
  }
  const arrowTrack = (a, d, color, info, parent) => a.path(d, 'ax-track stim', parent, { style: `--mc: var(--${color})`, 'data-info': info || null });
  // Glyphes locaux (peptides absents de la bibliothèque) : chaîne de perles colorée.
  function ensureDefs(a) {
    if (document.getElementById('mol-zgl-glp1')) return;
    const defs = a.el('defs');
    const chain = (id, cls, n) => {
      const g = a.el('g', { id: 'mol-zgl-' + id, class: cls }, defs);
      for (let i = 0; i < n; i++) a.el('circle', { cx: -((n - 1) * 5) + i * 10, cy: i % 2 ? 3 : -3, r: 5.2 }, g);
    };
    chain('glp1', 'zgl-g glp1', 4);
    chain('gip', 'zgl-g gip', 4);
    chain('lep', 'zgl-g lep', 4);
    chain('ghr', 'zgl-g ghr', 3);
    chain('pyy', 'zgl-g pyy', 3);
    chain('amsh', 'zgl-g amsh', 3);
    chain('agrp', 'zgl-g agrp', 3);
    const fr = a.el('g', { id: 'mol-zgl-frag', class: 'zgl-g frag' }, defs);
    a.el('circle', { cx: -6, cy: 0, r: 4 }, fr);
    a.el('circle', { cx: 6, cy: 3, r: 4 }, fr);
    a.el('circle', { cx: 2, cy: -6, r: 3.5 }, fr);
  }
  function glyphKey(a, x, y, items, parent) {
    const g = a.el('g', { transform: `translate(${x} ${y})` }, parent);
    items.forEach(([mol, label, info], i) => {
      const row = a.el('g', { transform: `translate(0 ${i * 28})`, 'data-info': info || null }, g);
      a.el('use', { href: '#mol-' + mol, transform: 'scale(1.3)' }, row);
      a.text(30, 6, label, 'note', null, row);
    });
    return g;
  }

  Object.assign(HV.INFO, {
    /* Récepteur de l'insuline */
    'zgl-ir': { t: 'Récepteur de l\'insuline', k: 'Récepteur tyrosine kinase · dimère α2β2 (complément)', d: 'Deux sous-unités α extracellulaires fixent l\'insuline ; deux sous-unités β traversent la membrane et portent un domaine tyrosine kinase. Présent sur le foie, le muscle et le tissu adipeux (polycopié, partie 2 p. 29).' },
    'zgl-autop': { t: 'Autophosphorylation', k: 'Tyrosines des sous-unités β (complément)', d: 'La fixation de l\'insuline rapproche les domaines kinase : chaque sous-unité β phosphoryle sa voisine sur des tyrosines, ce qui active la kinase et crée des sites d\'ancrage.' },
    'zgl-irs': { t: 'IRS (substrats du récepteur de l\'insuline)', k: 'Protéines d\'arrimage (complément)', d: 'Phosphorylés sur tyrosine par le récepteur, ils recrutent la PI3K (voie métabolique) et Grb2 (voie de croissance). Dans l\'insulinorésistance, leur phosphorylation sur sérine les inactive.' },
    'zgl-pi3k': { t: 'PI3K', k: 'Phosphatidylinositol 3-kinase (complément)', d: 'Produit des phosphoinositides membranaires qui activent la kinase AKT.' },
    'zgl-akt': { t: 'AKT (protéine kinase B)', k: 'Voie métabolique de l\'insuline (complément)', d: 'Déclenche la translocation des vésicules de GLUT4 vers la membrane ; active aussi la synthèse de glycogène et participe au frein de la lipolyse.' },
    'zgl-mapk': { t: 'Voie des MAP kinases', k: 'Grb2 – SOS → Ras → MAPK (ERK) (complément)', d: 'Branche « croissance » de la signalisation insulinique : prolifération, synthèse protéique, effets mitogènes. Elle reste peu touchée par l\'insulinorésistance.' },
    'zgl-nucleus': { t: 'Noyau', k: 'Effets transcriptionnels (complément)', d: 'Les MAP kinases modifient l\'expression de gènes de croissance et de prolifération.' },
    'zgl-glut4': { t: 'GLUT4', k: 'Transporteur du glucose insulinodépendant', d: 'Présent dans le muscle et le tissu adipeux : le transport du glucose y est sous la dépendance de l\'insuline (polycopié, partie 2 p. 29-30). Au repos, GLUT4 est stocké dans des vésicules intracellulaires (complément).' },
    'zgl-ves': { t: 'Vésicules de stockage de GLUT4', k: 'Translocation (complément)', d: 'Sous l\'effet d\'AKT, les vésicules fusionnent avec la membrane : GLUT4 apparaît en surface et le glucose entre. Quand l\'insuline baisse, GLUT4 est réinternalisé.' },
    'zgl-ir-res': { t: 'Insulinorésistance', k: 'Foie, muscle, tissu adipeux', d: 'Le DT2 associe une insulinorésistance des tissus périphériques et un défaut de sécrétion d\'insuline (polycopié, partie 2 p. 33). Mécanisme (complément) : acides gras libres et médiateurs de l\'inflammation issus du tissu adipeux viscéral activent des kinases qui phosphorylent IRS sur sérine.' },
    'zgl-ir-prim': { t: 'Insulinorésistance primitive', k: 'Extrêmement rare', d: 'Anomalie ou absence de récepteurs de l\'insuline, anomalie située en aval du récepteur, diabète lipo-atrophique (polycopié, partie 2 p. 34).' },
    'zgl-glc-in': { t: 'Devenir du glucose capté', k: 'Muscle et adipocyte (complément)', d: 'Le glucose est phosphorylé en glucose-6-phosphate puis stocké (glycogène musculaire) ou utilisé (glycolyse) ; dans l\'adipocyte, il fournit le glycérol des triglycérides.' },
    /* Foie */
    'zgl-hep': { t: 'Hépatocyte', k: 'Stock de glycogène, production de glucose', d: 'Le foie stocke le glucose sous forme de glycogène et c\'est le principal organe capable de produire du glucose (glycogénolyse, néoglucogenèse), surtout la nuit et au jeûne (polycopié, partie 2 p. 30).' },
    'zgl-glycogen': { t: 'Glycogène hépatique', k: 'Réserve de glucose', d: 'Constitué après les repas (insuline), mobilisé au jeûne (glucagon). La réserve s\'épuise au cours d\'un jeûne prolongé (complément).' },
    'zgl-g6p': { t: 'Glucose-6-phosphate', k: 'Carrefour métabolique (complément)', d: 'Point de rencontre du glycogène, de la glycolyse et de la néoglucogenèse. Le foie possède la glucose-6-phosphatase, qui libère du glucose dans le sang (complément).' },
    'zgl-gk': { t: 'Glucokinase', k: 'Repas · insuline (complément)', d: 'Phosphoryle le glucose entré par GLUT2 ; son activité suit la glycémie.' },
    'zgl-g6pase': { t: 'Glucose-6-phosphatase', k: 'Jeûne · glucagon (complément)', d: 'Dernière étape de la glycogénolyse et de la néoglucogenèse : le glucose formé sort dans le sang.' },
    'zgl-glyn': { t: 'Glycogénogenèse', k: 'Après le repas · insuline', d: 'Mise en réserve du glucose sous forme de glycogène (polycopié, partie 2 p. 30).' },
    'zgl-glyl': { t: 'Glycogénolyse', k: 'Jeûne · glucagon', d: 'Mobilisation du glycogène, rapide : elle fournit l\'essentiel du glucose hépatique dans les premières heures du jeûne (complément).' },
    'zgl-ngg': { t: 'Néoglucogenèse', k: 'Jeûne · glucagon', d: 'Néo-production de glucose par le foie à partir de différents substrats (polycopié, partie 2 p. 30) : lactate, acides aminés comme l\'alanine (muscle) et glycérol (lipolyse) (complément). Elle prend le relais quand le glycogène s\'épuise.' },
    'zgl-lipo': { t: 'Lipogenèse', k: 'Après le repas · insuline (complément)', d: 'L\'excès de glucose est transformé en acides gras puis en triglycérides, exportés dans les VLDL. Les VLDL sont riches en triglycérides (polycopié, partie 2 p. 18).' },
    'zgl-boxy': { t: 'β-oxydation mitochondriale', k: 'Jeûne · carence en insuline', d: 'Les acides gras libérés par la lipolyse sont métabolisés en acétyl-coenzyme A (polycopié, partie 2 p. 31).' },
    'zgl-keto': { t: 'Cétogenèse hépatique', k: 'Jeûne prolongé, carence en insuline', d: 'Au jeûne prolongé, cétose de jeûne limitée, car même une faible quantité d\'insuline freine la lipolyse. En carence en insuline, la lipolyse n\'est plus freinée et, sous l\'influence du glucagon dominant, la cétogenèse s\'emballe : acidocétose (polycopié, partie 2 p. 31 et 38).' },
    'zgl-ngg-sub': { t: 'Substrats de la néoglucogenèse', k: '(complément)', d: 'Lactate (muscle, globules rouges), alanine (protéolyse musculaire), glycérol (lipolyse du tissu adipeux).' },
    'zgl-ffa-in': { t: 'Acides gras libres', k: 'Lipolyse du tissu adipeux', d: 'L\'insuline freine la lipolyse ; au jeûne prolongé ou en carence en insuline, les acides gras affluent vers le foie (polycopié, partie 2 p. 29-31).' },
    'zgl-sinus': { t: 'Sinusoïde hépatique', k: 'Sang de la veine porte et de l\'artère hépatique (complément)', d: 'Le foie reçoit en premier l\'insuline et le glucagon pancréatiques, ainsi que les nutriments absorbés.' },
    'zgl-demo': { t: 'Démonstration', k: 'Cycle repas → jeûne → carence en insuline', d: 'Fait défiler les états du foie sans tenir compte du modèle. Cliquez à nouveau pour revenir au modèle de l\'axe (scénarios du panneau, horloge des repas).' },
    /* Incrétines */
    'zgl-kcell': { t: 'Cellules K', k: 'Duodénum, jéjunum (complément)', d: 'Cellules entéroendocrines de l\'intestin proximal : sécrètent le GIP (glucose-dependent insulinotropic polypeptide) quand les nutriments arrivent.' },
    'zgl-lcell': { t: 'Cellules L', k: 'Iléon, côlon (complément)', d: 'Cellules entéroendocrines de l\'intestin distal : sécrètent le GLP-1 (glucagon-like peptide-1) et le PYY après le repas.' },
    'zgl-glp1': { t: 'GLP-1', k: 'Incrétine (complément)', d: 'Stimule la sécrétion d\'insuline seulement si la glycémie est élevée, freine le glucagon, ralentit la vidange gastrique et favorise la satiété. Dégradé très vite par la DPP-4.' },
    'zgl-gip': { t: 'GIP', k: 'Incrétine (complément)', d: 'Stimule la sécrétion d\'insuline de façon glucose-dépendante. Son effet insulinotrope est très diminué dans le DT2. Dégradé par la DPP-4.' },
    'zgl-dpp4': { t: 'DPP-4 (dipeptidyl peptidase 4)', k: 'Enzyme de l\'endothélium et du plasma (complément)', d: 'Coupe le GLP-1 et le GIP en quelques minutes : seule une petite fraction des incrétines actives atteint la circulation générale. Les gliptines inhibent cette enzyme.' },
    'zgl-frag': { t: 'Fragments inactifs', k: '(complément)', d: 'Produits de la coupure par la DPP-4, sans effet insulinotrope.' },
    'zgl-inc-islet': { t: 'Îlot : effet des incrétines', k: 'Glucose-dépendant (complément)', d: 'Sur la cellule β, le GLP-1 et le GIP augmentent l\'AMPc et amplifient la sécrétion d\'insuline seulement si la glycémie est élevée. Le GLP-1 freine aussi la sécrétion de glucagon par les cellules α quand la glycémie est élevée.' },
    'zgl-inc-stom': { t: 'Vidange gastrique ralentie', k: 'GLP-1 (complément)', d: 'Le glucose arrive plus lentement dans l\'intestin : le pic glycémique post-prandial s\'atténue.' },
    'zgl-inc-brain': { t: 'Satiété', k: 'GLP-1 (complément)', d: 'Le GLP-1 agit sur le tronc cérébral et l\'hypothalamus : il réduit la prise alimentaire. Les analogues font perdre du poids.' },
    'zgl-inc-eff': { t: 'Effet incrétine', k: '(complément)', d: 'À glycémie égale, la réponse insulinique est plus forte quand le glucose est pris par la bouche que lorsqu\'il est perfusé par voie veineuse : la différence est due aux incrétines. Cet effet est très diminué dans le DT2.' },
    'zgl-inc-tt': { t: 'Médicaments des incrétines', k: '(complément)', d: 'Analogues du GLP-1 résistants à la DPP-4 (injectables, une forme orale existe) ; double agoniste GIP/GLP-1 ; inhibiteurs de la DPP-4 (gliptines, par voie orale). Effet glucose-dépendant : peu d\'hypoglycémies en l\'absence d\'insuline ou de sulfamide associés.' },
    /* Complications */
    'zgl-c-micro': { t: 'Microangiopathie', k: 'Spécifique du diabète', d: 'Souffrance de l\'endothélium des capillaires en réponse à l\'hyperglycémie : production de radicaux libres (voie des polyols, oxydation des protéines, protéine kinase C, glycation non enzymatique), dysfonction endothéliale, puis perte de fonction et de structure des micro-vaisseaux (polycopié, partie 2 p. 43).' },
    'zgl-c-macro': { t: 'Macroangiopathie', k: 'Athérome et médiacalcose', d: 'Atteinte sténosante des artères de moyen et gros calibre : coronaropathie, AOMI, atteinte cérébrale artérielle. Non spécifique, mais plus précoce, diffuse, distale et sévère chez le diabétique (polycopié, partie 2 p. 41).' },
    'zgl-c-retina': { t: 'Rétinopathie diabétique', k: 'Fond d\'œil annuel · figure 47', d: 'Occlusion des capillaires (périphérie) → ischémie → RD proliférante ; hyperperméabilité (centre) → œdème maculaire. Longtemps asymptomatique. Premiers signes au FO : microanévrismes (polycopié, partie 2 p. 43-45).' },
    'zgl-c-kidney': { t: 'Néphropathie diabétique', k: 'DFG et albuminurie annuels · figure 48', d: 'Pression intraglomérulaire ↑ : hyperfiltration initiale, puis albuminurie croissante, sclérose glomérulaire et baisse du DFG. Première cause d\'insuffisance rénale terminale dans les pays occidentaux, environ au même niveau que l\'HTA (polycopié, partie 2 p. 46-48).' },
    'zgl-c-nerve': { t: 'Neuropathie diabétique', k: 'Examen annuel · figures 49 et 50', d: 'Polyneuropathie distale, symétrique, longueur-dépendante (« en chaussettes ») : 80 à 85 % des neuropathies ; mononeuropathies (10 à 15 %) ; neuropathie végétative. Dépistage : interrogatoire (DN4), monofilament (polycopié, partie 2 p. 48-53).' },
    'zgl-c-auto': { t: 'Neuropathie végétative', k: 'Dysautonomie', d: 'Hypotension orthostatique, tachycardie permanente, gastroparésie, diarrhée motrice, troubles mictionnels, dysfonction érectile, troubles sudoraux et pupillaires (polycopié, partie 2 p. 53-54).' },
    'zgl-c-coro': { t: 'Coronaropathie', k: 'Souvent silencieuse', d: 'Penser à un syndrome coronarien devant un déséquilibre inexpliqué du diabète, une dyspnée d\'effort, des troubles du rythme ou des symptômes vagues. Examen cardiovasculaire annuel avec ECG de repos (polycopié, partie 2 p. 41-42).' },
    'zgl-c-carot': { t: 'Atteinte cérébrale artérielle', k: 'Carotides, artères cérébrales', d: 'Fait partie de la macroangiopathie diabétique (polycopié, partie 2 p. 41). Auscultation vasculaire annuelle (p. 42).' },
    'zgl-c-aomi': { t: 'Artériopathie des membres inférieurs (AOMI)', k: 'Distale · IPS · figure 57', d: 'Atteinte surtout au-delà de l\'artère poplitée (axes jambiers). IPS : artérite si < 0,9, non compensée si < 0,5, médiacalcose si > 1,3. Elle aggrave les plaies du pied (polycopié, partie 2 p. 41-42 et 62).' },
    'zgl-c-foot': { t: 'Pied diabétique', k: 'Figures 51 à 59', d: 'La neuropathie est le facteur de risque principal de plaie ; l\'artérite et l\'infection sont les facteurs majeurs d\'amputation. Mal perforant plantaire, pied de Charcot. Grade de risque podologique 0 à 3, examen des pieds au moins une fois par an (polycopié, partie 2 p. 55-65).' },
    'zgl-m-glyc': { t: 'Glycation non enzymatique', k: 'Produits avancés de la glycation', d: 'Le glucose se fixe sans enzyme sur les protéines ; les produits avancés de la glycation altèrent les tissus et la paroi des vaisseaux (polycopié, partie 2 p. 43 et 48).' },
    'zgl-m-poly': { t: 'Voie des polyols', k: 'Aldose réductase → sorbitol (complément)', d: 'L\'excès de glucose intracellulaire est réduit en sorbitol, qui s\'accumule dans les tissus où l\'entrée du glucose ne dépend pas de l\'insuline (nerf, rétine, rein) (polycopié, partie 2 p. 43 et 48 ; détail enzymatique en complément).' },
    'zgl-m-ox': { t: 'Stress oxydant', k: 'Radicaux libres', d: 'Toutes ces voies convergent vers la production de radicaux libres et la dysfonction endothéliale (polycopié, partie 2 p. 43 et 48).' },
    'zgl-m-pkc': { t: 'Protéine kinase C, hexosamines, inflammation', k: 'Autres voies', d: 'Voies activées par l\'hyperglycémie chronique (polycopié, partie 2 p. 43 et 48).' },
    'zgl-m-vasa': { t: 'Vasa nervorum', k: 'Composante microangiopathique de la neuropathie', d: 'Épaississement de la membrane basale, dysfonction endothéliale et thromboses locales oblitèrent le fin réseau qui nourrit le nerf (polycopié, partie 2 p. 48).' },
    'zgl-m-det': { t: 'Déterminants des complications', k: 'Durée et niveau de l\'hyperglycémie', d: 'Plus le diabète est ancien et la glycémie élevée, plus le risque est grand. Les complications apparaissent après plusieurs années d\'exposition (5 à 10 ans en moyenne) (polycopié, partie 2 p. 40-41).' },
    /* Appétit */
    'zgl-arc': { t: 'Noyau arqué de l\'hypothalamus', k: 'Centre intégrateur de l\'appétit (complément)', d: 'Au contact de l\'éminence médiane, il perçoit les signaux circulants (leptine, insuline, ghréline, PYY, GLP-1) et règle la prise alimentaire et la dépense énergétique.' },
    'zgl-npy': { t: 'Neurones NPY/AgRP', k: 'Orexigènes (complément)', d: 'Stimulent la prise alimentaire : le NPY agit directement, l\'AgRP bloque le récepteur MC4R. Activés par la ghréline, freinés par la leptine, l\'insuline et le PYY.' },
    'zgl-pomc': { t: 'Neurones POMC/CART', k: 'Anorexigènes (complément)', d: 'La POMC est clivée en α-MSH, qui active MC4R : satiété et dépense énergétique ↑. Activés par la leptine et l\'insuline.' },
    'zgl-mc4r': { t: 'Récepteur MC4R', k: 'Noyau paraventriculaire (complément)', d: 'Activé par l\'α-MSH (satiété), bloqué par l\'AgRP (faim). Ses mutations sont la cause la plus fréquente d\'obésité monogénique.' },
    'zgl-lep': { t: 'Leptine', k: 'Tissu adipeux (complément)', d: 'Sécrétée proportionnellement à la masse grasse : signal à long terme des réserves. Freine NPY/AgRP, active POMC. Dans l\'obésité commune, elle est élevée mais son effet est diminué (résistance à la leptine). Elle exerce aussi un effet permissif indirect sur la sécrétion de GnRH (polycopié, partie 2 p. 4).' },
    'zgl-ins-app': { t: 'Insuline', k: 'Pancréas (complément pour l\'effet central)', d: 'Signal des réserves et du repas ; agit dans l\'hypothalamus comme la leptine (effet anorexigène).' },
    'zgl-ghr': { t: 'Ghréline', k: 'Estomac (complément)', d: 'Seule hormone digestive orexigène : elle monte avant les repas et chute après. Active les neurones NPY/AgRP.' },
    'zgl-pyy': { t: 'PYY et GLP-1', k: 'Intestin distal, cellules L (complément)', d: 'Sécrétés après le repas : satiété. Le PYY freine les neurones NPY/AgRP ; le GLP-1 agit sur l\'hypothalamus et le tronc cérébral.' },
    'zgl-mono': { t: 'Obésités monogéniques', k: 'Rares (complément)', d: 'Obésité sévère et précoce par mutation d\'un gène de la voie leptine – mélanocortines : leptine, récepteur de la leptine, POMC, PCSK1, MC4R (le plus fréquent). Le déficit congénital en leptine se traite par leptine recombinante ; un agoniste de MC4R existe pour certaines formes en amont du récepteur.' }
  });

  /* ===================================================================== */
  /* 1. Récepteur de l'insuline                                             */
  /* ===================================================================== */
  const ir = HV.scene(Object.assign({
    id: 'insulin-rec', parent: 'glyc', loupe: 'Récepteur de l\'insuline',
    title: 'Récepteur de l\'insuline', level: 'Cellule',
    lead: 'Dans le muscle et le tissu adipeux, l\'insuline se fixe sur un récepteur tyrosine kinase. La cascade IRS → PI3K → AKT fait monter les vésicules de GLUT4 à la membrane : le glucose entre. Dans l\'insulinorésistance, cette voie est freinée : moins de GLUT4 en surface pour la même insuline.',
    points: [
      'Le transport du glucose dans le muscle et le tissu adipeux (GLUT4) est sous la dépendance de l\'insuline (polycopié).',
      'Récepteur α2β2 : liaison de l\'insuline sur α, autophosphorylation des domaines tyrosine kinase β (complément).',
      'Voie métabolique : IRS → PI3K → AKT → translocation de GLUT4 ; voie de croissance : Grb2 – SOS → Ras → MAPK (complément).',
      'DT2 : insulinorésistance (foie, muscle, tissu adipeux) et défaut de sécrétion d\'insuline (polycopié).',
      'Changez de scénario (DT2, DT1, insulinome) : le signal suit insuline × sensibilité.'
    ],
    legend: new Set(['insulin', 'glucose', 'ffa']),
    build(g, a) {
      a.frame('Récepteur de l\'insuline', 'Muscle et adipocyte · de la liaison de l\'insuline à l\'entrée du glucose');
      ir.sim = HV.scenes.glyc.sim;
      ensureDefs(a);
      const RX = 380;
      // Cellule
      a.el('rect', { x: 60, y: 300, width: 1050, height: 620, rx: 50, class: 'zgl-cell', 'data-info': 'zgl-ves' });
      a.el('rect', { x: 60, y: 300, width: 1050, height: 620, rx: 50, class: 'zgl-cell-in' });
      a.text(90, 272, 'milieu extracellulaire', 'note');
      a.text(90, 345, 'cytoplasme (muscle, adipocyte)', 'note');
      // Récepteur
      const rec = a.el('g', { 'data-info': 'zgl-ir' });
      a.el('rect', { x: RX - 44, y: 190, width: 36, height: 104, rx: 16, class: 'zgl-alpha' }, rec);
      a.el('rect', { x: RX + 8, y: 190, width: 36, height: 104, rx: 16, class: 'zgl-alpha' }, rec);
      a.text(RX - 26, 280, 'α', 'lbl-s strong', { anchor: 'middle' }, rec);
      a.text(RX + 26, 280, 'α', 'lbl-s strong', { anchor: 'middle' }, rec);
      a.el('rect', { x: RX - 30, y: 288, width: 18, height: 70, rx: 5, class: 'zgl-betasub' }, rec);
      a.el('rect', { x: RX + 12, y: 288, width: 18, height: 70, rx: 5, class: 'zgl-betasub' }, rec);
      a.el('ellipse', { cx: RX - 30, cy: 392, rx: 28, ry: 32, class: 'zgl-kin' }, rec);
      a.el('ellipse', { cx: RX + 30, cy: 392, rx: 28, ry: 32, class: 'zgl-kin' }, rec);
      a.text(RX - 30, 398, 'β', 'lbl-s strong', { anchor: 'middle' }, rec);
      a.text(RX + 30, 398, 'β', 'lbl-s strong', { anchor: 'middle' }, rec);
      const boundIns = a.el('use', { href: '#mol-insulin', transform: `translate(${RX} 214) scale(1.6)` });
      const phos = a.el('g', { 'data-info': 'zgl-autop' });
      [[RX - 72, 375], [RX - 72, 412], [RX + 72, 375], [RX + 72, 412]].forEach(([x, y]) => {
        a.el('circle', { cx: x, cy: y, r: 13, class: 'zgl-p' }, phos);
        a.text(x, y + 5.5, 'P', 'zgl-p-t', { anchor: 'middle' }, phos);
      });
      a.text(RX + 60, 214, 'récepteur de l\'insuline', 'lbl-s strong', { attrs: { 'data-info': 'zgl-ir' } });
      a.text(RX + 60, 240, '2 α (liaison) + 2 β (tyrosine kinase)', 'note', { attrs: { 'data-info': 'zgl-ir' } });
      a.text(RX + 100, 400, 'autophosphorylation', 'note', { attrs: { 'data-info': 'zgl-autop' } });
      // Démonstration du pas à pas : insuline et sensibilité imposées (ov), sinon le modèle de l'axe.
      let ov = null;
      const insNow = () => (ov ? ov.ins : S().ins);
      a.flow(`M 110,170 C 200,170 ${RX - 60},180 ${RX},208`, { mol: 'insulin', rate: () => 1.2 * insNow(), pace: () => HV.paceOf(insNow()), size: 1.3, speed: 70, track: false, max: 14 });
      a.text(96, 206, 'insuline', 'note strong');
      // Voie métabolique
      const irs = pill(a, RX, 490, 'IRS-1/2', 'p-gold', { info: 'zgl-irs', w: 140 });
      const irsP = a.el('g', { 'data-info': 'zgl-autop' });
      a.el('circle', { cx: RX + 62, cy: 466, r: 13, class: 'zgl-p' }, irsP);
      a.text(RX + 62, 471.5, 'P', 'zgl-p-t', { anchor: 'middle' }, irsP);
      pill(a, RX, 580, 'PI3K', 'p-teal', { info: 'zgl-pi3k', w: 140 });
      pill(a, RX, 670, 'AKT (PKB)', 'p-teal', { info: 'zgl-akt', w: 140 });
      const sigFlow = (d, info) => a.flow(d, { mol: 'dot', style: 'fill: var(--p-gold)', rate: () => 3 * sig, size: 1, speed: 45, track: false, max: 8, info });
      arrowTrack(a, `M ${RX},426 L ${RX},468`, 'p-gold', 'zgl-irs');
      arrowTrack(a, `M ${RX},510 L ${RX},560`, 'p-teal', 'zgl-pi3k');
      arrowTrack(a, `M ${RX},600 L ${RX},650`, 'p-teal', 'zgl-akt');
      sigFlow(`M ${RX},426 L ${RX},468`); sigFlow(`M ${RX},510 L ${RX},560`); sigFlow(`M ${RX},600 L ${RX},650`);
      const aktD = `M ${RX + 72},670 C 560,670 600,640 690,640`;
      arrowTrack(a, aktD, 'p-teal', 'zgl-ves');
      sigFlow(aktD, 'zgl-akt');
      a.text(560, 700, 'translocation', 'note', { anchor: 'middle', attrs: { 'data-info': 'zgl-ves' } });
      a.text(430, 770, ['AKT agit aussi sur la glycogène synthase', '(muscle) et freine la lipolyse (adipocyte).'], 'note', { lh: 1.3, attrs: { 'data-info': 'zgl-akt' } });
      // Voie MAPK
      const mapD1 = `M ${RX - 72},498 C 260,510 190,530 175,560`;
      arrowTrack(a, mapD1, 'p-violet', 'zgl-mapk');
      pill(a, 175, 580, 'Grb2 – SOS', 'p-violet', { info: 'zgl-mapk', w: 150 });
      arrowTrack(a, 'M 175,600 L 175,650', 'p-violet', 'zgl-mapk');
      pill(a, 175, 670, 'Ras → MAPK', 'p-violet', { info: 'zgl-mapk', w: 150 });
      arrowTrack(a, 'M 190,690 L 215,770', 'p-violet', 'zgl-mapk');
      a.flow(mapD1, { mol: 'dot', style: 'fill: var(--p-violet)', rate: () => 1.6 * clamp(insNow() / 3, 0, 1), size: 1, speed: 45, track: false, max: 6 });
      a.el('ellipse', { cx: 230, cy: 830, rx: 150, ry: 60, class: 'bcell-n', 'data-info': 'zgl-nucleus' });
      a.text(230, 820, 'noyau', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zgl-nucleus' } });
      a.text(230, 845, 'croissance, prolifération', 'note', { anchor: 'middle', attrs: { 'data-info': 'zgl-nucleus' } });
      // GLUT4 : transporteurs membranaires et vésicules
      const NG = 7, chans = [], vesicles = [], vstate = [];
      for (let k = 0; k < NG; k++) {
        const cx = 700 + k * 60;
        const ch = a.el('g', { 'data-info': 'zgl-glut4', transform: `translate(${cx} 300)` });
        a.el('rect', { x: -11, y: -22, width: 22, height: 44, rx: 6, class: 'zgl-glut' }, ch);
        a.el('rect', { x: -3, y: -22, width: 6, height: 44, class: 'chan-pore' }, ch);
        chans.push(ch);
        const kk = k;
        a.flow(`M ${cx},165 L ${cx},440`, { mol: 'glucose', rate: () => (vstate[kk] > 0.8 ? 1.1 * S().g : 0), size: 1.2, speed: 70, track: false, max: 8 });
        const v = a.el('g', { 'data-info': 'zgl-ves' });
        a.el('circle', { r: 22, class: 'zgl-ves' }, v);
        a.el('rect', { x: -6, y: -11, width: 12, height: 22, rx: 4, class: 'zgl-glut' }, v);
        vesicles.push({ v, sx: 720 + k * 55, sy: 640 + (k % 2) * 56, mx: cx, my: 344 });
        vstate.push(0);
      }
      a.text(670, 268, 'GLUT4', 'chan-t', { anchor: 'end', attrs: { 'data-info': 'zgl-glut4' } });
      a.text(880, 160, 'glucose', 'note strong', { anchor: 'middle' });
      a.text(880, 476, 'glucose → glucose-6-P → glycogène, glycolyse', 'note', { anchor: 'middle', attrs: { 'data-info': 'zgl-glc-in' } });
      a.text(1020, 760, 'vésicules de GLUT4', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zgl-ves' } });

      // Insulinorésistance (panneau)
      const pan = a.el('g', { 'data-info': 'zgl-ir-res' });
      a.el('rect', { x: 1150, y: 170, width: 400, height: 770, rx: 22, class: 'side-box' }, pan);
      a.text(1175, 212, 'Insulinorésistance', 'lbl-h', null, pan);
      a.text(1175, 248, [
        'Obésité viscérale, sédentarité',
        '(complément) : adipocytes',
        'hypertrophiés, acides gras libres ↑,',
        'inflammation. Des kinases',
        'phosphorylent IRS sur sérine :',
        'la voie IRS → PI3K → AKT est freinée,',
        'moins de GLUT4 monte en surface.',
        '',
        'DT2 : insulinorésistance et défaut',
        'de sécrétion d\'insuline (polycopié).'
      ], 'note', { lh: 1.32 }, pan);
      const bIns = bar(a, 1175, 535, 350, 'Insuline (modèle)', 'p-blue2');
      const bSens = bar(a, 1175, 590, 350, 'Sensibilité à l\'insuline', 'p-green');
      const bSig = bar(a, 1175, 645, 350, 'Signal IRS → AKT', 'p-teal');
      const bGl = bar(a, 1175, 700, 350, 'GLUT4 en surface', 'p-teal');
      const bIn = bar(a, 1175, 755, 350, 'Entrée du glucose', 'p-lime');
      a.text(1175, 830, ['Rare : anomalie ou absence du', 'récepteur (insulinorésistance', 'primitive, polycopié).'], 'note', { lh: 1.3, attrs: { 'data-info': 'zgl-ir-prim' } });
      const resG = a.el('g', { 'data-info': 'zgl-ir-res' });
      a.path(`M 1150,520 C 900,545 620,530 ${RX + 90},500`, 'ax-track inhib', resG);
      a.sign(RX + 92, 500, 'inhib', resG).set(1);
      a.text(830, 560, 'acides gras, inflammation', 'note', { anchor: 'middle' }, resG);

      const state = a.text(585, 968, '', 'lbl-s strong', { anchor: 'middle' });
      let sig = 0.3, txt = 0;
      a.dyn((dt) => {
        keepAlive(dt);
        const s = ov ? Object.assign({}, S(), { ins: ov.ins }) : S(), p = ov ? Object.assign({}, P(), { sens: ov.sens, beta: 1, exo: 0 }) : P();
        const occ = clamp(s.ins / 3, 0, 1);
        sig = clamp((s.ins * p.sens) / 1.3, 0, 1);
        const n = Math.round(1 + sig * (NG - 1) * 1.05);
        const k1 = dt > 0 ? 1 - Math.exp(-dt * 2.2) : 1;
        vesicles.forEach((V, k) => {
          vstate[k] += ((k < n ? 1 : 0) - vstate[k]) * k1;
          const u = vstate[k];
          const x = V.sx + (V.mx - V.sx) * u, y = V.sy + (V.my - V.sy) * u;
          V.v.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
          V.v.setAttribute('opacity', (1 - Math.pow(u, 6)).toFixed(2));
          chans[k].setAttribute('opacity', (0.08 + 0.92 * Math.pow(u, 4)).toFixed(2));
        });
        boundIns.setAttribute('opacity', (0.15 + 0.85 * occ).toFixed(2));
        phos.setAttribute('opacity', (0.15 + 0.85 * occ).toFixed(2));
        irsP.setAttribute('opacity', (0.1 + 0.9 * sig).toFixed(2));
        resG.setAttribute('opacity', clamp((1.05 - p.sens) / 0.6, 0.12, 1).toFixed(2));
        txt -= dt;
        if (txt <= 0) {
          txt = 0.3;
          const glIn = clamp((n / NG) * s.g / 1.2, 0, 1);
          bIns.set(s.ins / 6, Math.round(s.ins * 8) + ' µUI/mL');
          bSens.set(p.sens / 1.5, Math.round(p.sens * 100) + ' %');
          bSig.set(sig, Math.round(sig * 100) + ' %');
          bGl.set(n / NG, n + ' / ' + NG);
          bIn.set(glIn, '');
          state.textContent = p.beta < 0.3 && p.exo < 0.05 ? 'Carence en insuline : récepteurs libres, GLUT4 reste dans les vésicules (DT1)'
            : p.sens < 0.6 ? 'Insulinorésistance : beaucoup d\'insuline, peu de GLUT4 en surface'
              : sig > 0.6 ? 'Insuline élevée : GLUT4 à la membrane, le glucose entre'
                : 'Insuline basse : GLUT4 surtout dans les vésicules';
        }
      });
      const repos = () => { ov = { ins: 0.4, sens: 1 }; }, repas = () => { ov = { ins: 2.2, sens: 1 }; };
      ir.stepEnd = () => { ov = null; };
      HV.spotlight(ir, a, [
        { t: 'À jeun : le glucose entre peu', d: 'Démonstration : insuline basse. Les transporteurs GLUT4 restent stockés dans des vésicules à l\'intérieur de la cellule ; la membrane en porte peu et le glucose entre peu dans le muscle et l\'adipocyte (complément). C\'est l\'insuline qui va ouvrir la porte.', spot: [[660, 300, 450, 470]], go: repos },
        { t: 'L\'insuline se fixe sur son récepteur', d: 'Après le repas, l\'insuline monte (démonstration). Elle se lie aux deux sous-unités α, à l\'extérieur de la cellule. Le récepteur est présent sur le foie, le muscle et le tissu adipeux (polycopié, partie 2 p. 29 ; structure α2β2 en complément).', spot: [[RX, 230, 110]], go: repas },
        { t: 'Le récepteur s\'active lui-même', d: 'La fixation rapproche les deux sous-unités β, qui portent une activité tyrosine kinase : chacune phosphoryle sa voisine (les « P »). Le signal a franchi la membrane (complément).', spot: [[RX, 395, 110]], go: repas },
        { t: 'Le relais : IRS → PI3K → AKT', d: 'Les tyrosines phosphorylées servent de quai d\'amarrage aux IRS, qui recrutent la PI3K ; celle-ci active AKT. C\'est la voie « métabolique » de l\'insuline, celle qui règle le glucose (complément).', spot: [[RX - 90, 460, 190, 240]], go: repas },
        { t: 'GLUT4 monte à la membrane', d: 'AKT fait fusionner les vésicules avec la membrane : les GLUT4 apparaissent en surface (translocation, complément). Le transport du glucose dans le muscle et le tissu adipeux dépend donc de l\'insuline (polycopié, partie 2 p. 29-30).', spot: [[660, 300, 450, 470]], go: repas },
        { t: 'Le glucose entre et est mis en réserve', d: 'Le glucose entre par les GLUT4 ouverts, puis il est stocké (glycogène musculaire) ou utilisé (glycolyse) (complément). Après le repas, muscle et tissu adipeux captent ainsi le glucose, ce qui fait redescendre la glycémie.', spot: [[660, 150, 450, 340]], go: repas },
        { t: 'Une seconde voie : la croissance', d: 'Le même récepteur active une autre branche, Grb2 – SOS → Ras → MAPK, qui agit sur le noyau : croissance et prolifération. Elle reste peu touchée par l\'insulinorésistance (complément).', spot: [[70, 540, 320, 370]], go: repas },
        { t: 'Insulinorésistance : la porte s\'ouvre mal', d: 'Démonstration : même insuline élevée, sensibilité à 30 %. Les acides gras et l\'inflammation du tissu adipeux viscéral freinent IRS et AKT (complément) : moins de GLUT4 en surface, le glucose entre mal. Le pancréas compense en sécrétant plus, tant qu\'il le peut ; le DT2 associe insulinorésistance et défaut de sécrétion (polycopié, partie 2 p. 33).', spot: [[1150, 170, 400, 770], [RX + 92, 500, 50]], go: () => { ov = { ins: 2.2, sens: 0.3 }; } },
        { t: 'En résumé', d: 'Insuline → récepteur → IRS → PI3K → AKT → GLUT4 à la membrane → le glucose entre. Si l\'insuline manque (DT1), les GLUT4 restent dans les vésicules ; si la voie est freinée (insulinorésistance), il faut beaucoup plus d\'insuline pour le même effet. Quittez le pas à pas pour revenir au modèle et essayer les scénarios du panneau.', spot: [[60, 150, 1490, 800]], go: () => { ov = null; } }
      ]);
    }
  }, HV.LOUPE.R(0)));

  /* ===================================================================== */
  /* 2. Le foie, du repas au jeûne                                          */
  /* ===================================================================== */
  const PHASES = [
    { id: 'meal', name: 'Après le repas', c: 'p-blue2', d: 'Insuline dominante : le foie capte le glucose et le stocke en glycogène ; l\'excès devient acides gras et triglycérides, exportés dans les VLDL (complément). La production hépatique de glucose est freinée.' },
    { id: 'post', name: 'Nuit, premières heures de jeûne', c: 'p-orange', d: 'Glucagon dominant : le foie produit du glucose, d\'abord surtout par glycogénolyse, avec une néoglucogenèse croissante (complément pour la chronologie).' },
    { id: 'fast', name: 'Jeûne', c: 'p-orange', d: 'Le glycogène s\'épuise : la néoglucogenèse (lactate, alanine, glycérol) prend le relais (complément). Les acides gras du tissu adipeux deviennent le principal carburant.' },
    { id: 'long', name: 'Jeûne prolongé', c: 'p-amber', d: 'Les acides gras sont oxydés en acétyl-CoA, dont une partie forme des corps cétoniques : cétose de jeûne, limitée car un peu d\'insuline freine la lipolyse (polycopié).' },
    { id: 'dka', name: 'Carence en insuline', c: 'p-red', d: 'Plus de frein sur la lipolyse : les acides gras affluent et, sous l\'influence du glucagon dominant, la cétogenèse s\'emballe (acidocétose). La production de glucose n\'est plus freinée (polycopié).' }
  ];
  const lf = HV.scene(Object.assign({
    id: 'liver-fast', parent: 'glyc', loupe: 'Le foie, du repas au jeûne',
    title: 'Le foie, du repas au jeûne', level: 'Cellule',
    lead: 'Après le repas, l\'insuline fait stocker le glucose en glycogène et l\'excès en triglycérides (VLDL). La nuit et au jeûne, le glucagon fait produire du glucose : glycogénolyse puis néoglucogenèse. Au jeûne prolongé, les acides gras alimentent une cétogenèse limitée, qui s\'emballe en cas de carence en insuline.',
    points: [
      'Le foie stocke le glucose en glycogène et c\'est le principal organe capable de produire du glucose (glycogénolyse, néoglucogenèse), surtout la nuit et au jeûne (polycopié).',
      'Insuline : glycogénogenèse, lipogenèse et VLDL (complément), frein de la production hépatique de glucose.',
      'Glucagon : glycogénolyse dans les premières heures, puis néoglucogenèse à partir du lactate, de l\'alanine et du glycérol (complément pour les substrats).',
      'Jeûne prolongé : cétose de jeûne limitée ; carence en insuline : cétogenèse emballée, acidocétose (polycopié).',
      'Le schéma suit le modèle (repas de l\'horloge, scénarios DT1, jeûne). Le bouton « Démonstration » fait défiler les états.'
    ],
    legend: new Set(['glucose', 'insulin', 'glucagon', 'ffa', 'ketone', 'vldl']),
    build(g, a) {
      a.frame('Le foie, du repas au jeûne', 'Hépatocyte · insuline et glucagon règlent le stockage et la production de glucose');
      lf.sim = HV.scenes.glyc.sim;
      // Cellule et sinusoïde
      a.el('rect', { x: 60, y: 170, width: 1060, height: 620, rx: 56, class: 'zgl-hep', 'data-info': 'zgl-hep' });
      a.el('ellipse', { cx: 560, cy: 250, rx: 58, ry: 40, class: 'bcell-n zgl-hep-n', 'data-info': 'zgl-hep' });
      a.vessel('M 40,875 L 1140,875', 72).setAttribute('data-info', 'zgl-sinus');
      a.text(60, 945, 'sinusoïde : sang portal (insuline, glucagon, nutriments)', 'note', { attrs: { 'data-info': 'zgl-sinus' } });
      a.flow('M 50,862 L 1130,862', { mol: 'insulin', rate: () => 0.9 * act.ins, size: 1.1, speed: 120, track: false, max: 16 });
      a.flow('M 50,890 L 1130,890', { mol: 'glucagon', rate: () => 0.9 * act.glu, size: 1.1, speed: 120, track: false, max: 16 });
      // Glycogène
      const GX = 300;
      const glyco = a.el('g', { 'data-info': 'zgl-glycogen' });
      const gran = [];
      for (let r = 0; r < 4; r++) {
        const n = r === 0 ? 1 : r * 6;
        for (let i = 0; i < n; i++) {
          const an = (i / n) * Math.PI * 2 + r * 0.4;
          const c = a.el('circle', { cx: GX + Math.cos(an) * r * 16, cy: 268 + Math.sin(an) * r * 16, r: 7, class: 'zgl-glyco' }, glyco);
          gran.push(c);
        }
      }
      a.text(GX + 75, 250, 'glycogène', 'lbl-s strong', { attrs: { 'data-info': 'zgl-glycogen' } });
      const glyT = a.text(GX + 75, 276, '', 'note', { attrs: { 'data-info': 'zgl-glycogen' } });
      pill(a, GX, 470, 'glucose-6-P', 'p-lime', { info: 'zgl-g6p', w: 150 });
      pill(a, GX, 660, 'glucose', 'p-lime', { info: 'zgl-g6p', w: 120 });
      const paths = {};
      const track = (key, d, color, info, mol, rate, o) => {
        const t = arrowTrack(a, d, color, info);
        a.flow(d, Object.assign({ mol, rate: () => rate() * (act[key] || 0), size: 1.1, speed: 60, track: false, max: 10, info }, o || {}));
        paths[key] = paths[key] || [];
        paths[key].push(t);
      };
      track('glyn', `M ${GX + 30},448 L ${GX + 30},336`, 'p-blue2', 'zgl-glyn', 'glucose', () => 2.4);
      track('glyl', `M ${GX - 30},336 L ${GX - 30},448`, 'p-orange', 'zgl-glyl', 'glucose', () => 2.4);
      track('gk', `M ${GX + 30},640 L ${GX + 30},492`, 'p-blue2', 'zgl-gk', 'glucose', () => 2.4);
      track('g6pase', `M ${GX - 30},492 L ${GX - 30},640`, 'p-orange', 'zgl-g6pase', 'glucose', () => 2.4);
      track('gin', `M ${GX + 30},860 L ${GX + 30},682`, 'p-blue2', 'zgl-gk', 'glucose', () => 2.4);
      track('gout', `M ${GX - 30},682 L ${GX - 30},860`, 'p-orange', 'zgl-g6pase', 'glucose', () => 2.4);
      a.text(GX + 46, 398, 'glycogénogenèse', 'note', { attrs: { 'data-info': 'zgl-glyn' } });
      a.text(GX - 46, 398, 'glycogénolyse', 'note', { anchor: 'end', attrs: { 'data-info': 'zgl-glyl' } });
      a.text(GX + 46, 572, 'glucokinase', 'note', { attrs: { 'data-info': 'zgl-gk' } });
      a.text(GX - 46, 560, ['glucose-6-', 'phosphatase'], 'note', { anchor: 'end', lh: 1.2, attrs: { 'data-info': 'zgl-g6pase' } });
      const glut2 = a.el('g', { 'data-info': 'glut2', transform: `translate(${GX} 790)` });
      a.el('rect', { x: -52, y: -13, width: 104, height: 26, rx: 8, class: 'chan' }, glut2);
      a.text(GX + 64, 818, 'GLUT2', 'chan-t', { attrs: { 'data-info': 'glut2' } });
      // Néoglucogenèse
      const NX = 640;
      pill(a, NX, 560, 'néoglucogenèse', 'p-orange', { info: 'zgl-ngg', w: 190 });
      [['lactate', 540], ['alanine', 640], ['glycérol', 740]].forEach(([nm, x]) => {
        track('ngg', `M ${x},860 L ${x},584`, 'p-orange', 'zgl-ngg-sub', 'dot', () => 1.4, { style: 'fill: var(--p-orange)' });
        a.text(x + 8, 690 + (x === 640 ? 26 : 0), nm, 'note', { attrs: { 'data-info': 'zgl-ngg-sub' } });
      });
      track('ngg', `M ${NX - 96},548 C 480,520 420,490 ${GX + 76},478`, 'p-orange', 'zgl-ngg', 'glucose', () => 1.6);
      // Lipogenèse et VLDL
      track('lipo', `M ${GX + 76},458 C 470,440 620,330 790,300`, 'p-blue2', 'zgl-lipo', 'dot', () => 2, { style: 'fill: var(--p-blue2)' });
      pill(a, 880, 290, 'lipogenèse', 'p-blue2', { info: 'zgl-lipo', w: 170 });
      a.text(880, 336, 'acides gras → triglycérides', 'note', { anchor: 'middle', attrs: { 'data-info': 'zgl-lipo' } });
      track('lipo', 'M 966,300 C 1040,300 1080,330 1080,380 L 1080,860', 'p-blue2', 'zgl-lipo', 'vldl', () => 1.2, { size: 1.2 });
      a.text(1068, 470, 'VLDL', 'note strong', { anchor: 'end', attrs: { 'data-info': 'zgl-lipo' } });
      a.text(640, 440, 'glycolyse → acétyl-CoA', 'note', { anchor: 'middle', attrs: { 'data-info': 'zgl-lipo' } });
      // β-oxydation et cétogenèse
      const mito = a.el('g', { 'data-info': 'zgl-boxy', transform: 'translate(880 630)' });
      a.el('ellipse', { rx: 115, ry: 52, class: 'mito' }, mito);
      a.text(0, -6, 'β-oxydation', 'note strong', { anchor: 'middle' }, mito);
      a.text(0, 18, '→ acétyl-CoA', 'note', { anchor: 'middle' }, mito);
      track('boxy', 'M 810,860 L 810,676', 'p-amber', 'zgl-ffa-in', 'ffa', () => 1.6, { size: 1.1 });
      a.text(798, 772, 'acides gras', 'note', { anchor: 'end', attrs: { 'data-info': 'zgl-ffa-in' } });
      track('keto', 'M 960,676 L 960,860', 'p-red', 'zgl-keto', 'ketone', () => 2.2, { size: 1.2 });
      a.text(972, 742, ['corps', 'cétoniques'], 'note strong', { lh: 1.2, attrs: { 'data-info': 'zgl-keto' } });
      a.text(880, 548, 'cétogenèse', 'note', { anchor: 'middle', attrs: { 'data-info': 'zgl-keto' } });

      // Panneau d'état
      const PX = 1160;
      a.el('rect', { x: PX, y: 170, width: 390, height: 770, rx: 22, class: 'side-box' });
      a.text(PX + 22, 210, 'État du foie', 'lbl-h');
      const phT = a.text(PX + 22, 250, '', 'zgl-big');
      const phD = a.text(PX + 22, 284, '', 'note');
      const bI = bar(a, PX + 22, 500, 346, 'Insuline', 'p-blue2');
      const bG = bar(a, PX + 22, 552, 346, 'Glucagon', 'p-orange');
      const bGy = bar(a, PX + 22, 604, 346, 'Glycogène hépatique', 'p-lime');
      const bK = bar(a, PX + 22, 656, 346, 'Corps cétoniques', 'p-red');
      const phRows = PHASES.map((ph, i) => {
        const r = a.el('g', { class: 'zgl-ph', transform: `translate(${PX + 30} ${712 + i * 29})` });
        a.el('circle', { cx: 0, cy: -6, r: 7, class: 'zgl-dot' }, r);
        a.text(16, 0, ph.name, 'note', null, r);
        return r;
      });
      let demo = false, demoT = 0, forced = null; // forced : phase imposée par le pas à pas
      const btn = button(a, PX + 20, 870, 350, '', () => { demo = !demo; demoT = 0; }, 'zgl-demo');

      const act = { ins: 1, glu: 1 };
      let gly = 0.75, cur = -1, txt = 0;
      a.dyn((dt) => {
        keepAlive(dt);
        const s = S(), p = P();
        let ph, keto;
        const dm = demo || forced != null;
        if (dm) {
          demoT = (demoT + dt) % 40;
          const k = forced != null ? forced : Math.floor(demoT / 8);
          ph = k;
          const tgt = [1, 0.75, 0.1, 0.05, 0.15][k];
          gly += (tgt - gly) * (dt > 0 ? 1 - Math.exp(-dt * 0.8) : 1);
          act.ins = [3, 0.8, 0.5, 0.3, 0.05][k];
          act.glu = [0.5, 1.4, 1.8, 2, 2.6][k];
          keto = [0.02, 0.05, 0.25, 0.55, 1][k];
        } else {
          const eff = s.ins * p.sens;
          const fed = clamp((eff - 0.85) / 0.3, 0, 1); // calé sur l'insuline post-prandiale du modèle (sujet sain)
          const target = p.long > 0.3 ? 0.05 : fed > 0.2 ? 1 : 0.1;
          const rate = fed > 0.2 ? 0.25 : 0.045 + 0.2 * p.long;
          if (dt > 0) gly += (target - gly) * (1 - Math.exp(-dt * rate));
          act.ins = s.ins; act.glu = s.glu;
          keto = clamp(s.ket / 2.5, 0, 1);
          ph = eff < 0.3 && s.ket > 0.6 ? 4 : fed > 0.35 ? 0 : (p.long > 0.3 || s.ket > 0.4) ? 3 : gly > 0.45 ? 1 : 2;
        }
        const fed = ph === 0 ? 1 : 0;
        const fast = 1 - fed;
        Object.assign(act, {
          glyn: fed * (1 - 0.6 * gly), gk: fed, gin: fed, lipo: fed,
          glyl: fast * clamp(gly * 1.3, 0, 1), g6pase: fast, gout: fast * (ph === 4 ? 1.4 : 1),
          ngg: fast * (ph === 1 ? 0.35 : ph === 4 ? 1.3 : 1),
          boxy: ph >= 2 ? 0.4 + keto : 0.1 * fast, keto: ph >= 3 ? 0.25 + keto : 0.04 * fast
        });
        Object.keys(paths).forEach((k) => paths[k].forEach((t) => t.setAttribute('opacity', (0.12 + 0.6 * clamp(act[k], 0, 1)).toFixed(2))));
        const ng = Math.round(clamp(gly, 0, 1) * gran.length);
        gran.forEach((c, i) => c.setAttribute('opacity', i < ng ? 1 : 0.12));
        txt -= dt;
        if (txt <= 0 || ph !== cur) {
          txt = 0.3;
          if (ph !== cur) {
            cur = ph;
            phT.textContent = PHASES[ph].name;
            phT.setAttribute('style', `fill: var(--${PHASES[ph].c})`);
            setLines(phD, PX + 22, wrap(PHASES[ph].d, 40), 1.32);
            phRows.forEach((r, i) => r.classList.toggle('on', i === ph));
          }
          bI.set(act.ins / 5, dm ? '' : Math.round(s.ins * 8) + ' µUI/mL');
          bG.set(act.glu / 3, '');
          bGy.set(gly, Math.round(gly * 100) + ' %');
          bK.set(dm ? keto : s.ket / 5, dm ? '' : s.ket.toFixed(1).replace('.', ',') + ' mmol/L');
          glyT.textContent = gly > 0.6 ? 'réserve pleine' : gly > 0.25 ? 'réserve entamée' : 'réserve épuisée';
          btn.t.textContent = forced != null ? 'Démonstration du pas à pas' : demo ? '◼ Revenir au modèle' : '▶ Démonstration : du repas au jeûne';
        }
      });
      const ph = (k) => () => { forced = k; };
      lf.stepEnd = () => { forced = null; };
      HV.spotlight(lf, a, [
        { t: 'Après le repas : stocker', d: 'Démonstration : phase « après le repas ». L\'insuline domine. Le glucose du sang portal entre par GLUT2, la glucokinase le phosphoryle en glucose-6-phosphate, puis il est stocké en glycogène : la réserve se remplit (glycogénogenèse, polycopié, partie 2 p. 30 ; enzymes en complément).', spot: [[GX - 140, 190, 340, 690]], go: ph(0) },
        { t: 'L\'excès devient graisse', d: 'Quand le glycogène est plein, le glucose en excès suit la glycolyse jusqu\'à l\'acétyl-CoA, puis devient acides gras et triglycérides (lipogenèse, complément). Le foie les exporte dans les VLDL, lipoprotéines riches en triglycérides (polycopié, partie 2 p. 18).', spot: [[440, 250, 680, 230], [1080, 620, 70]], go: ph(0) },
        { t: 'La nuit : vider la réserve', d: 'Démonstration : la nuit. L\'insuline baisse, le glucagon domine : le glycogène est dégradé (glycogénolyse) et la glucose-6-phosphatase libère le glucose dans le sang. Le foie est le principal organe capable de produire du glucose, surtout la nuit et au jeûne (polycopié, partie 2 p. 30 ; chronologie en complément).', spot: [[GX - 160, 190, 260, 690]], go: ph(1) },
        { t: 'Jeûne : fabriquer du glucose', d: 'Démonstration : jeûne. Le glycogène s\'épuise. Le foie fabrique alors du glucose neuf (néoglucogenèse, polycopié, partie 2 p. 30) à partir du lactate, de l\'alanine venue du muscle et du glycérol venu du tissu adipeux (substrats en complément).', spot: [[500, 520, 280, 360]], go: ph(2) },
        { t: 'Jeûne prolongé : les corps cétoniques', d: 'Démonstration : jeûne prolongé. Les acides gras du tissu adipeux deviennent le carburant principal ; le foie les oxyde en acétyl-CoA (β-oxydation), dont une partie forme des corps cétoniques. La cétose de jeûne reste limitée, car même un peu d\'insuline freine la lipolyse (polycopié, partie 2 p. 31).', spot: [[760, 520, 320, 360]], go: ph(3) },
        { t: 'Carence en insuline : l\'emballement', d: 'Démonstration : carence en insuline. Plus aucun frein sur la lipolyse : les acides gras affluent et, sous l\'influence du glucagon dominant, la cétogenèse s\'emballe (acidocétose) ; la production de glucose n\'est plus freinée non plus (polycopié, partie 2 p. 31 et 38).', spot: [[760, 520, 320, 360], [PX, 170, 390, 450]], go: ph(4) },
        { t: 'En résumé', d: 'Insuline : le foie stocke (glycogène, puis graisse). Glucagon : il produit du glucose (glycogénolyse, puis néoglucogenèse). Sans insuline : glucose et corps cétoniques montent ensemble. Quittez le pas à pas pour revenir au modèle : choisissez « Jeûne » ou « Diabète de type 1 » dans le panneau.', spot: [[60, 150, 1490, 800]], go: () => { forced = null; } }
      ]);
    }
  }, HV.LOUPE.R(1)));

  /* ===================================================================== */
  /* 3. Incrétines                                                           */
  /* ===================================================================== */
  const inc = HV.scene(Object.assign({
    id: 'incretines', parent: 'glyc', loupe: 'Incrétines',
    title: 'Incrétines', level: 'Organe',
    lead: 'Après un repas, l\'intestin sécrète deux incrétines : le GIP (cellules K) et le GLP-1 (cellules L). Elles amplifient la sécrétion d\'insuline seulement si la glycémie est élevée ; le GLP-1 freine aussi le glucagon, ralentit la vidange gastrique et favorise la satiété. La DPP-4 les inactive en quelques minutes. (Notions en complément du polycopié.)',
    points: [
      'Cellules K (intestin proximal) : GIP ; cellules L (intestin distal) : GLP-1 (complément).',
      'Effet glucose-dépendant : insuline ↑ seulement en hyperglycémie, glucagon ↓ (GLP-1) (complément).',
      'Effet incrétine : réponse insulinique plus forte au glucose oral qu\'au glucose intraveineux, à glycémie égale ; diminué dans le DT2 (complément).',
      'Traitements : analogues du GLP-1, double agoniste GIP/GLP-1, gliptines (inhibiteurs de la DPP-4) (complément).'
    ],
    legend: new Set(['glucose', 'insulin', 'glucagon']),
    build(g, a) {
      a.frame('Incrétines', 'Intestin → pancréas · amplification glucose-dépendante de l\'insuline (complément)');
      inc.sim = HV.scenes.glyc.sim;
      ensureDefs(a);
      let fo = null; // repas imposé par le pas à pas
      const fd = () => (fo != null ? fo : food());
      // Estomac et intestin
      const st = a.el('g', { 'data-info': 'zgl-inc-stom' });
      HV.organArt(st, 'servier/dig-stomach', 70, 175, 250, 270);
      a.text(110, 196, 'estomac', 'lbl-s strong', null, st);
      const gutD = 'M 345,340 C 430,340 470,380 470,440 C 470,520 380,540 300,570 C 200,610 160,680 210,730 C 260,780 380,760 420,800 C 450,830 430,880 380,900';
      // Duodénum et intestin grêle : dessins Servier ; le trajet du bol alimentaire reste en dessous.
      const gutG = a.el('g', { 'data-info': 'intestine' });
      HV.organArt(gutG, 'servier/dig-duodenum', 300, 330, 170, 190);
      HV.organArt(gutG, 'servier/dig-small-intestine', 150, 560, 300, 310);
      a.path(gutD, 'connector'); // trajet du bol alimentaire
      a.flow(gutD, { mol: 'glucose', rate: () => 1.5 * fd() + 0.1, size: 1, speed: 70, track: false, max: 24 });
      a.text(64, 300, 'repas →', 'note');
      const cellK = a.el('g', { 'data-info': 'zgl-kcell', transform: 'translate(512 430)' });
      a.el('rect', { x: -22, y: -30, width: 44, height: 60, rx: 12, class: 'zgl-ecell k' }, cellK);
      [[-8, -12], [7, -6], [-6, 6], [8, 12]].forEach(([x, y]) => a.el('circle', { cx: x, cy: y, r: 4.5, class: 'zgl-ecell-g k' }, cellK));
      a.text(546, 405, 'cellules K', 'lbl-s strong', { attrs: { 'data-info': 'zgl-kcell' } });
      a.text(546, 430, 'duodénum, jéjunum', 'note', { attrs: { 'data-info': 'zgl-kcell' } });
      a.text(546, 455, '→ GIP', 'note strong', { attrs: { 'data-info': 'zgl-gip' } });
      const cellL = a.el('g', { 'data-info': 'zgl-lcell', transform: 'translate(486 780)' });
      a.el('rect', { x: -22, y: -30, width: 44, height: 60, rx: 12, class: 'zgl-ecell l' }, cellL);
      [[-8, -12], [7, -6], [-6, 6], [8, 12]].forEach(([x, y]) => a.el('circle', { cx: x, cy: y, r: 4.5, class: 'zgl-ecell-g l' }, cellL));
      a.text(520, 760, 'cellules L', 'lbl-s strong', { attrs: { 'data-info': 'zgl-lcell' } });
      a.text(520, 785, 'iléon, côlon', 'note', { attrs: { 'data-info': 'zgl-lcell' } });
      a.text(520, 810, '→ GLP-1', 'note strong', { attrs: { 'data-info': 'zgl-glp1' } });
            // Vaisseau, DPP-4
      a.vessel('M 690,520 L 1020,520', 64).setAttribute('data-info', 'zgl-dpp4');
      const kD = 'M 534,430 C 620,430 650,500 700,510', lD = 'M 508,780 C 610,780 630,560 700,530';
      const secr = () => 0.25 + 2.2 * fd();
      a.flow(kD + ' L 800,510', { mol: 'zgl-gip', rate: () => secr() * 0.8, size: 1.2, speed: 70, track: false, max: 10, info: 'zgl-gip' });
      a.flow(lD + ' L 800,530', { mol: 'zgl-glp1', rate: () => secr() * 0.8, size: 1.2, speed: 70, track: false, max: 10, info: 'zgl-glp1' });
      a.flow('M 800,510 L 1030,510', { mol: 'zgl-gip', rate: () => secr() * 0.15, size: 1.2, speed: 70, track: false, max: 6, info: 'zgl-gip' });
      a.flow('M 800,530 L 1030,530', { mol: 'zgl-glp1', rate: () => secr() * 0.15, size: 1.2, speed: 70, track: false, max: 6, info: 'zgl-glp1' });
      a.flow('M 812,520 C 850,560 900,575 960,580', { mol: 'zgl-frag', rate: () => secr() * 1.2, size: 1.1, speed: 50, track: false, max: 14, info: 'zgl-frag' });
      const dpp = a.el('g', { 'data-info': 'zgl-dpp4', transform: 'translate(806 520)' });
      a.el('circle', { r: 26, class: 'zgl-dpp' }, dpp);
      a.path('M -10,-10 L 10,10 M 10,-10 L -10,10', 'zgl-dpp-x', dpp);
      a.text(806, 470, 'DPP-4', 'lbl-s strong', { anchor: 'middle', attrs: { 'data-info': 'zgl-dpp4' } });
      a.text(806, 618, 'inactivation en quelques minutes', 'note', { anchor: 'middle', attrs: { 'data-info': 'zgl-dpp4' } });
      // Îlot
      const isl = a.el('g', { transform: 'translate(1130 520) scale(1.4)', 'data-info': 'zgl-inc-islet' });
      HV.organs.islet(isl);
      a.zoomable(isl, 'islet');
      a.text(1130, 418, 'îlot de Langerhans', 'lbl-s strong', { anchor: 'middle', attrs: { 'data-info': 'zgl-inc-islet' } });
      a.sign(1040, 478, 'stim').set(1);
      a.sign(1040, 566, 'inhib').set(1);
      a.text(1130, 624, 'β : insuline ↑ si glycémie élevée', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zgl-inc-islet' } });
      a.text(1130, 648, 'α : glucagon ↓ (GLP-1)', 'note', { anchor: 'middle', attrs: { 'data-info': 'zgl-inc-islet' } });
      a.flow('M 1175,500 C 1205,470 1205,430 1200,390', { mol: 'insulin', rate: () => 1 * S().ins, pace: () => HV.paceOf(S().ins), size: 1.2, speed: 60, track: false, max: 10 });
      a.flow('M 1175,545 C 1205,560 1210,580 1215,600', { mol: 'glucagon', rate: () => 0.8 * S().glu, size: 1.1, speed: 50, track: false, max: 6 });
      // Estomac et cerveau
      const sto = a.el('g', { 'data-info': 'zgl-inc-stom' });
      a.path('M 740,488 C 740,330 560,300 372,300', 'ax-track inhib', sto);
      a.sign(372, 300, 'inhib', sto).set(1);
      a.text(560, 290, 'vidange gastrique ralentie', 'note', { anchor: 'middle' }, sto);
      const br = a.el('g', { transform: 'translate(1000 290) scale(0.42)', 'data-info': 'zgl-inc-brain' });
      HV.organs.brainSagittal(br);
      const brT = a.el('g', { 'data-info': 'zgl-inc-brain' });
      a.path('M 900,490 C 900,420 920,380 960,350', 'ax-track stim', brT, { style: '--mc: var(--p-teal)' });
      a.sign(960, 350, 'stim', brT).set(1);
      a.text(1070, 290, 'satiété ↑', 'lbl-s strong', null, brT);
      a.text(1070, 314, '(GLP-1)', 'note', null, brT);
      glyphKey(a, 780, 175, [['zgl-gip', 'GIP', 'zgl-gip'], ['zgl-glp1', 'GLP-1', 'zgl-glp1'], ['zgl-frag', 'fragments inactifs', 'zgl-frag']]);
      // Médicaments
      const tt = a.el('g', { 'data-info': 'zgl-inc-tt' });
      a.el('rect', { x: 1260, y: 170, width: 290, height: 470, rx: 22, class: 'side-box' }, tt);
      a.text(1280, 208, 'Médicaments', 'lbl-h', null, tt);
      a.text(1280, 232, '(complément)', 'note', null, tt);
      a.text(1280, 272, ['Analogues du GLP-1 :', 'résistent à la DPP-4.', '', 'Double agoniste', 'GIP/GLP-1.', '', 'Gliptines : inhibent', 'la DPP-4.', '', 'Effet glucose-', 'dépendant : peu', 'd\'hypoglycémies', 'seuls.'], 'note', { lh: 1.28 }, tt);
      // Effet incrétine
      a.text(660, 690, 'Effet incrétine', 'lbl-h', { attrs: { 'data-info': 'zgl-inc-eff' } });
      a.text(870, 690, 'insulinémie à glycémie égale (allure schématique, complément)', 'note', { attrs: { 'data-info': 'zgl-inc-eff' } });
      const chart = (x0, title, hOral, hIV) => {
        const c = a.el('g', { transform: `translate(${x0} 710)`, 'data-info': 'zgl-inc-eff' });
        a.el('rect', { x: 0, y: 0, width: 400, height: 220, rx: 16, class: 'side-box' }, c);
        a.text(20, 32, title, 'lbl-s strong', null, c);
        a.path('M 40,190 L 380,190 M 40,190 L 40,50', 'zgl-axis', c);
        const curve = (h) => `M 40,190 C 90,190 110,${190 - h} 160,${190 - h} C 230,${190 - h} 280,${190 - h * 0.45} 380,${190 - h * 0.25}`;
        a.path(curve(hOral), 'zgl-curve oral', c);
        a.path(curve(hIV), 'zgl-curve iv', c);
        a.path('M 210,26 L 240,26', 'zgl-curve oral', c);
        a.text(248, 32, 'oral', 'note', null, c);
        a.path('M 300,26 L 330,26', 'zgl-curve iv', c);
        a.text(338, 32, 'IV', 'note', null, c);
        a.text(380, 212, 'temps →', 'note', { anchor: 'end' }, c);
        return c;
      };
      const cN = chart(660, 'Sujet sain', 120, 50);
      const cD = chart(1110, 'Diabète de type 2', 62, 46);

      const state = a.text(330, 968, '', 'lbl-s strong', { anchor: 'middle' });
      let txt = 0;
      a.dyn((dt) => {
        keepAlive(dt);
        const p = P(), s = S();
        const dt2 = p.sens < 0.6 && p.beta < 0.7;
        cN.setAttribute('opacity', dt2 ? 0.45 : 1);
        cD.setAttribute('opacity', dt2 ? 1 : 0.45);
        txt -= dt;
        if (txt <= 0) {
          txt = 0.3;
          const f = fd();
          state.textContent = f > 0.3 ? 'Repas en cours : incrétines ↑ · glycémie ' + f2(s.g) + ' g/L' : 'À jeun : sécrétion d\'incrétines basale · glycémie ' + f2(s.g) + ' g/L';
        }
      });
      const repas = () => { fo = 1; };
      inc.stepEnd = () => { fo = null; };
      HV.spotlight(inc, a, [
        { t: 'Le repas arrive dans l\'intestin', d: 'Démonstration : repas en cours. Les nutriments quittent l\'estomac et descendent dans l\'intestin, où des cellules endocrines dispersées dans la muqueuse les détectent (complément).', spot: [[90, 170, 520, 760]], go: repas },
        { t: 'Cellules K et L : deux incrétines', d: 'Les cellules K de l\'intestin proximal (duodénum, jéjunum) sécrètent le GIP ; les cellules L de l\'intestin distal (iléon, côlon) sécrètent le GLP-1. Le pancréas est ainsi prévenu de l\'arrivée du repas (complément).', spot: [[490, 380, 230, 90], [455, 735, 200, 100]], go: repas },
        { t: 'La DPP-4 les coupe très vite', d: 'Dans les vaisseaux, l\'enzyme DPP-4 coupe le GLP-1 et le GIP en quelques minutes : seule une petite fraction atteint la circulation générale sous forme active (fragments = inactifs). C\'est la cible des gliptines (complément).', spot: [[806, 540, 100]], go: repas },
        { t: 'Sur l\'îlot : insuline ↑, glucagon ↓', d: 'Les incrétines amplifient la sécrétion d\'insuline seulement si la glycémie est élevée : d\'où peu d\'hypoglycémies avec ces médicaments en l\'absence d\'insuline ou de sulfamide associés. Le GLP-1 freine aussi le glucagon (complément).', spot: [[1110, 530, 130]], go: repas },
        { t: 'Estomac et cerveau', d: 'Le GLP-1 ralentit la vidange gastrique (le glucose arrive plus lentement, le pic après le repas s\'atténue) et agit sur l\'hypothalamus et le tronc cérébral : satiété, d\'où la perte de poids sous analogues (complément).', spot: [[540, 280, 200], [990, 290, 120]], go: repas },
        { t: 'L\'effet incrétine', d: 'À glycémie égale, l\'insuline monte davantage après du glucose pris par la bouche qu\'après du glucose perfusé : la différence est due aux incrétines. Dans le DT2, cet effet est très diminué (comparez les deux graphiques, allure schématique, complément).', spot: [[650, 660, 880, 290]] },
        { t: 'Les médicaments', d: 'Deux stratégies : des analogues du GLP-1 (ou un double agoniste GIP/GLP-1) qui résistent à la DPP-4, ou des gliptines qui inhibent la DPP-4 et prolongent les incrétines naturelles. Effet glucose-dépendant dans les deux cas (complément).', spot: [[1260, 170, 290, 470]] },
        { t: 'En résumé', d: 'Repas → cellules K et L → GIP et GLP-1 → (la DPP-4 en inactive la plus grande partie) → plus d\'insuline seulement si la glycémie est haute, moins de glucagon, estomac plus lent, satiété. Quittez le pas à pas pour revenir à l\'horloge des repas du modèle.', spot: [[60, 150, 1490, 800]], go: () => { fo = null; } }
      ]);
    }
  }, HV.LOUPE.R(2)));

  /* ===================================================================== */
  /* 4. Complications du diabète                                             */
  /* ===================================================================== */
  const cp = HV.scene(Object.assign({
    id: 'complications', parent: 'glyc', loupe: 'Complications du diabète',
    title: 'Complications du diabète', level: 'Organe',
    lead: 'L\'exposition prolongée à l\'hyperglycémie (plusieurs années, 5 à 10 ans en moyenne) abîme les petits vaisseaux — rétine, rein, nerf : microangiopathie, spécifique du diabète — et accélère l\'athérome des grosses artères — coronaires, carotides, membres inférieurs : macroangiopathie. Neuropathie et artérite se rejoignent dans le pied diabétique.',
    points: [
      'Déterminants : durée et niveau d\'exposition à l\'hyperglycémie (polycopié p. 40-41).',
      'Microangiopathie : rétinopathie (FO annuel), néphropathie (DFG et albuminurie annuels), neuropathie (examen annuel, monofilament) (p. 43-53).',
      'Macroangiopathie : précoce, diffuse, distale, sévère ; ischémie myocardique souvent silencieuse ; IPS (p. 41-42, 62).',
      'Pied diabétique : neuropathie (facteur principal de plaie), artérite et infection (facteurs majeurs d\'amputation) (p. 55-65).',
      'Mécanismes au survol : glycation, polyols, protéine kinase C, stress oxydant (p. 43, 48).'
    ],
    legend: new Set(['glucose']),
    build(g, a) {
      a.frame('Complications du diabète', 'Microangiopathie · macroangiopathie · pied diabétique');
      cp.sim = HV.scenes.glyc.sim;
      const BX = 557;
      // Arbre artériel Servier (Arteries-physiology, diapositive 3) : cœur, aorte, carotides, reins et artères
      // des membres dessinés ; tête de profil. Repères mesurés sur le dessin : œil (590, 293), cœur (565, 438),
      // reins (527 et 592, 505), axes artériels des jambes (532 et 588, 800), pieds (528 et 594, 928).
      const body = a.el('g', { class: 'zgl-bodyg' });
      HV.organArt(body, 'servier/art-tree', 415, 232, 285, 715);
      // Zones de survol (transparentes) posées sur le dessin
      const zone = (info, el) => { const z = a.el('g', { 'data-info': info }); el(z); return z; };
      zone('zgl-c-retina', (z) => a.el('circle', { cx: 590, cy: 293, r: 6, class: 'zgl-eye' }, z));
      zone('zgl-c-carot', (z) => a.path('M 548,372 L 548,320 M 560,372 L 562,320', 'zgl-hit', z));
      zone('zgl-c-coro', (z) => a.el('circle', { cx: 565, cy: 438, r: 38, class: 'zgl-hit' }, z));
      zone('zgl-c-aomi', (z) => a.path('M 545,600 L 532,800 L 532,910 M 575,600 L 588,800 L 590,910', 'zgl-hit', z));
      // Nerfs des membres inférieurs (en pointillés, à côté des axes artériels)
      zone('zgl-c-nerve', (z) => a.path('M 518,640 L 514,760 L 518,900 M 606,640 L 610,760 L 606,900', 'zgl-nerve', z));
      // Reins : ceux du dessin ; la néphropathie (kit Diabetes) les recouvre pendant la démonstration
      const kid = a.el('g', { 'data-info': 'zgl-c-kidney' });
      a.el('ellipse', { cx: 527, cy: 505, rx: 18, ry: 26, class: 'zgl-hit' }, kid);
      a.el('ellipse', { cx: 592, cy: 505, rx: 18, ry: 26, class: 'zgl-hit' }, kid);
      const kidN = a.el('g', null, kid), kidD = a.el('g', { opacity: 0 }, kid);
      [[1, 527], [-1, 592]].forEach(([k, x]) => HV.organArt(a.el('g', { transform: `translate(${x} 505) scale(${k} 1)` }, kidD), 'servier/diab-kidney-nephro', -18, -27, 36, 54));
      // Pied : mal perforant plantaire
      const foot = a.el('g', { 'data-info': 'zgl-c-foot' });
      a.el('circle', { cx: 600, cy: 930, r: 7, class: 'zgl-ulcer' }, foot);
      // Encadrés : microangiopathie à gauche, macroangiopathie à droite
      const box = (x, y, w, h, color, title, lines, info, figs, dot) => {
        const gB = a.el('g', { 'data-info': info });
        a.el('rect', { x, y, width: w, height: h, rx: 16, class: 'sig-box', style: `--c: var(--${color})` }, gB);
        a.text(x + 18, y + 32, title, 'lbl-s strong', null, gB);
        a.text(x + 18, y + 60, lines, 'note', { lh: 1.3 }, gB);
        if (figs) HV.figBadge(a, x + w - 36, y + 34, figs);
        if (dot) a.path(dot, 'connector');
        return gB;
      };
      a.text(60, 196, 'Microangiopathie', 'lbl-h', { attrs: { 'data-info': 'zgl-c-micro' } });
      a.text(60, 220, 'spécifique du diabète · dépistage annuel', 'note', { attrs: { 'data-info': 'zgl-c-micro' } });
      const ret = box(60, 240, 340, 150, 'p-violet', 'Rétinopathie', ['Occlusion capillaire → ischémie', '→ RD proliférante ; hyper-', 'perméabilité → œdème maculaire.'], 'zgl-c-retina', ['47'], `M 400,300 L 584,294`);
      const nep = box(60, 410, 340, 175, 'p-violet', 'Néphropathie', ['Hyperfiltration, puis albuminurie', '↑ et DFG ↓. Première cause', 'd\'insuffisance rénale terminale', '(avec l\'HTA).'], 'zgl-c-kidney', ['48'], `M 400,500 L 509,505`);
      const neu = box(60, 605, 340, 175, 'p-violet', 'Neuropathie', ['Polyneuropathie distale, symé-', 'trique, « en chaussettes » ;', 'mononeuropathies ; neuropathie', 'végétative.'], 'zgl-c-nerve', ['49', '50'], `M 400,700 L 514,720`);
      a.text(60, 815, ['Neuropathie végétative : hypotension', 'orthostatique, gastroparésie, troubles', 'mictionnels, dysfonction érectile.'], 'note', { lh: 1.3, attrs: { 'data-info': 'zgl-c-auto' } });
      a.text(1080, 196, 'Macroangiopathie', 'lbl-h', { anchor: 'end', attrs: { 'data-info': 'zgl-c-macro' } });
      a.text(1080, 220, 'précoce, diffuse, distale, sévère', 'note', { anchor: 'end', attrs: { 'data-info': 'zgl-c-macro' } });
      const carB = box(740, 240, 340, 110, 'p-red', 'Carotides, cerveau', ['Atteinte cérébrale artérielle :', 'auscultation vasculaire.'], 'zgl-c-carot', null, `M 740,295 L 562,340`);
      const corB = box(740, 370, 340, 140, 'p-red', 'Coronaires', ['Ischémie souvent silencieuse :', 'déséquilibre inexpliqué, dyspnée', 'd\'effort. ECG de repos annuel.'], 'zgl-c-coro', null, `M 740,430 L 603,438`);
      const aoB = box(740, 530, 340, 140, 'p-red', 'Membres inférieurs (AOMI)', ['Distale (axes jambiers). IPS :', 'artérite < 0,9 ; médiacalcose', '> 1,3.'], 'zgl-c-aomi', ['57'], `M 740,600 L 590,700`);
      const ftB = box(740, 690, 340, 200, 'p-amber', 'Pied diabétique', ['Neuropathie : facteur principal', 'de plaie. Artérite et infection :', 'facteurs majeurs d\'amputation.', 'Mal perforant, pied de Charcot.', 'Grade de risque podologique 0 à 3.'], 'zgl-c-foot', ['51', '52A', '52B', '52C', '52D', '53', '54A', '54B', '54C', '55', '56', '58', '59'], `M 740,850 L 606,926`);
      // Mécanismes
      const MX = 1110;
      a.el('rect', { x: MX, y: 170, width: 440, height: 770, rx: 22, class: 'side-box' });
      a.text(MX + 22, 210, 'Mécanismes', 'lbl-h');
      a.text(MX + 22, 236, 'survolez chaque voie', 'note');
      const mech = [
        ['zgl-m-glyc', 'Glycation non enzymatique', 'produits avancés de la glycation'],
        ['zgl-m-poly', 'Voie des polyols', 'sorbitol (aldose réductase)'],
        ['zgl-m-pkc', 'Protéine kinase C, hexosamines', 'inflammation'],
        ['zgl-m-ox', 'Stress oxydant', 'radicaux libres → endothélium'],
        ['zgl-m-vasa', 'Vasa nervorum', 'microangiopathie du nerf']
      ];
      mech.forEach(([info, t, k], i) => {
        const y = 262 + i * 78;
        const r = a.el('g', { 'data-info': info });
        a.el('rect', { x: MX + 20, y, width: 400, height: 64, rx: 14, class: 'sig-box', style: '--c: var(--p-grey)' }, r);
        a.text(MX + 38, y + 27, t, 'note strong', null, r);
        a.text(MX + 38, y + 50, k, 'note', null, r);
      });
      const det = a.el('g', { 'data-info': 'zgl-m-det' });
      a.text(MX + 22, 685, 'Déterminants', 'lbl-s strong', null, det);
      a.text(MX + 22, 712, ['Durée du diabète et niveau', 'd\'hyperglycémie ; complications', 'après plusieurs années (5 à 10 ans', 'en moyenne).'], 'note', { lh: 1.3 }, det);
      const gB = bar(a, MX + 22, 855, 396, 'Glycémie du modèle', 'p-lime');
      const gT = a.text(MX + 22, 920, '', 'note');
      // Planches du kit Diabetes (Servier) : posées sur le panneau des mécanismes pendant le pas à pas.
      const cards = {};
      const card = (key, title, items) => {
        const c = a.el('g', { class: 'zgl-card', visibility: 'hidden' });
        a.el('rect', { x: MX, y: 170, width: 440, height: 770, rx: 22 }, c);
        a.text(MX + 22, 210, title, 'lbl-h', null, c);
        items.forEach(([name, x, y, w, h, cap]) => {
          HV.organArt(c, 'servier/' + name, MX + x, y, w, h);
          a.text(MX + x + w / 2, y + h + 26, cap, 'note', { anchor: 'middle' }, c);
        });
        a.text(MX + 22, 920, 'Illustrations : Servier Medical Art, CC BY 4.0', 'note', null, c);
        cards[key] = c;
      };
      card('eye', 'Rétinopathie', [['diab-eye', 70, 240, 300, 250, 'Œil en coupe'], ['diab-fundus', 95, 560, 250, 260, 'Fond d\'œil']]);
      card('kidney', 'Néphropathie', [['diab-kidney-normal', 40, 280, 170, 300, 'Rein normal'], ['diab-kidney-nephro', 230, 280, 170, 300, 'Néphropathie']]);
      card('nerve', 'Neuropathies', [['diab-neuro-periph', 20, 240, 190, 350, 'Périphérique'], ['diab-neuro-auto', 230, 240, 190, 350, 'Végétative'], ['diab-monofilament', 90, 650, 260, 180, 'Monofilament']]);
      card('foot', 'Pied diabétique', [['diab-sole-ulcer', 30, 250, 180, 420, 'Mal perforant plantaire'], ['diab-foot', 220, 330, 200, 280, 'Pied']]);
      const showCard = (k) => Object.keys(cards).forEach((n) => cards[n].setAttribute('visibility', n === k ? 'visible' : 'hidden'));
      const marks = [ret, nep, neu, carB, corB, aoB, ftB];
      let txt = 0, hot = false; // hot : hyperglycémie chronique imposée par le pas à pas
      a.dyn((dt) => {
        keepAlive(dt);
        txt -= dt;
        if (txt > 0) return;
        txt = 0.3;
        const s = S();
        const hi = clamp((s.g - 1.1) / 1.5, 0, 1);
        gB.set(s.g / 3, f2(s.g) + ' g/L');
        gT.textContent = s.g >= 1.26 ? 'Hyperglycémie : si elle dure, le risque ↑' : 'Glycémie dans les valeurs usuelles';
        marks.forEach((m) => m.classList.toggle('zgl-hot', hot || hi > 0.05));
        kidD.setAttribute('opacity', hot ? 1 : 0);
        kidN.setAttribute('opacity', hot ? 0 : 1);
        if (hot) gT.textContent = 'Démonstration : hyperglycémie prolongée';
        body.setAttribute('opacity', 1);
      });
      const chaud = (k) => () => { hot = true; txt = 0; showCard(k || null); };
      cp.stepEnd = () => { hot = false; txt = 0; showCard(null); };
      HV.spotlight(cp, a, [
        { t: 'Le temps et le niveau de la glycémie', d: 'Démonstration : hyperglycémie prolongée (les cadres s\'allument). Les complications chroniques dépendent de la durée et du niveau de l\'hyperglycémie ; elles surviennent après plusieurs années (5 à 10 ans en moyenne) et ne sont pas spécifiques d\'un type de diabète (polycopié, partie 2 p. 40-41).', spot: [[MX, 660, 440, 280]], go: chaud() },
        { t: 'Pourquoi les petits vaisseaux souffrent', d: 'L\'hyperglycémie active des voies délétères : glycation non enzymatique, voie des polyols, protéine kinase C. Elles convergent vers les radicaux libres et la dysfonction de l\'endothélium des capillaires (polycopié, partie 2 p. 43 et 48). Survolez chaque voie.', spot: [[MX, 240, 440, 400]], go: chaud() },
        { t: 'L\'œil : rétinopathie', d: 'En périphérie, les capillaires se bouchent → ischémie → rétinopathie proliférante ; au centre, ils deviennent hyperperméables → œdème maculaire. Longtemps asymptomatique : d\'où le fond d\'œil annuel (polycopié, partie 2 p. 43-45, figure 47).', spot: [[60, 240, 340, 150], [590, 293, 32], [MX, 170, 440, 770]], go: chaud('eye') },
        { t: 'Le rein : néphropathie', d: 'La pression monte dans le glomérule : d\'abord hyperfiltration, puis albuminurie croissante et baisse du DFG. Première cause d\'insuffisance rénale terminale dans les pays occidentaux, au même niveau que l\'HTA. Dépistage annuel : DFG et rapport albuminurie/créatininurie (polycopié, partie 2 p. 46-48, figure 48).', spot: [[60, 410, 340, 175], [560, 505, 62], [MX, 170, 440, 770]], go: chaud('kidney') },
        { t: 'Le nerf : neuropathie', d: 'Polyneuropathie distale, symétrique, longueur-dépendante, « en chaussettes » (80 à 85 % des neuropathies) ; mononeuropathies (10 à 15 %) ; neuropathie végétative (hypotension orthostatique, gastroparésie…). Dépistage : DN4, monofilament (polycopié, partie 2 p. 48-54, figures 49 et 50).', spot: [[60, 605, 340, 310], [BX, 760, 90], [MX, 170, 440, 770]], go: chaud('nerve') },
        { t: 'Les grosses artères : macroangiopathie', d: 'L\'athérome n\'est pas propre au diabète, mais il y est plus précoce, diffus, distal et sévère : coronaires (ischémie souvent silencieuse), carotides et cerveau, membres inférieurs (au-delà de l\'artère poplitée ; IPS < 0,9 = artérite). Examen cardiovasculaire annuel (polycopié, partie 2 p. 41-42 et 62).', spot: [[740, 240, 340, 430]], go: chaud() },
        { t: 'Le pied : tout se rejoint', d: 'La neuropathie supprime le signal douleur et entraîne troubles morphostatiques et hyperkératose → mal perforant plantaire : c\'est le facteur principal de plaie. L\'artérite et l\'infection sont les facteurs majeurs d\'amputation. Grade de risque podologique 0 à 3, examen des pieds au moins une fois par an (polycopié, partie 2 p. 55-65).', spot: [[740, 690, 340, 200], [562, 922, 60], [MX, 170, 440, 770]], go: chaud('foot') },
        { t: 'En résumé', d: 'Hyperglycémie prolongée → petits vaisseaux (rétine, rein, nerf : microangiopathie, spécifique du diabète) et grosses artères (cœur, cerveau, jambes : macroangiopathie, plus précoce et plus sévère). Dépistage annuel de chacune. Quittez le pas à pas : la glycémie du modèle reprend la main.', spot: [[60, 150, 1490, 800]], go: () => { hot = false; txt = 0; showCard(null); } }
      ]);
    }
  }, HV.LOUPE.R(3)));

  /* ===================================================================== */
  /* 5. Appétit et poids                                                     */
  /* ===================================================================== */
  const ap = HV.scene(Object.assign({
    id: 'appetit', parent: 'glyc', loupe: 'Appétit et poids',
    title: 'Appétit et poids', level: 'Organe',
    lead: 'Le noyau arqué de l\'hypothalamus intègre des signaux du tissu adipeux (leptine), du pancréas (insuline), de l\'estomac (ghréline) et de l\'intestin (PYY, GLP-1). Deux populations de neurones s\'opposent : NPY/AgRP stimulent la prise alimentaire, POMC/CART la freinent par l\'α-MSH et le récepteur MC4R. (Notions en complément du polycopié.)',
    points: [
      'Neurones NPY/AgRP orexigènes ; neurones POMC/CART anorexigènes : α-MSH → MC4R (complément).',
      'Leptine (masse grasse) et insuline : signaux des réserves, anorexigènes (complément).',
      'Ghréline (estomac) : monte avant les repas, orexigène ; PYY et GLP-1 (intestin) : après les repas, satiété (complément).',
      'Obésités monogéniques rares : leptine, récepteur de la leptine, POMC, MC4R (complément).',
      'La leptine exerce aussi un effet permissif indirect sur la GnRH (polycopié, partie 2 p. 4).'
    ],
    legend: new Set(['insulin']),
    build(g, a) {
      a.frame('Appétit et poids', 'Noyau arqué de l\'hypothalamus · signaux de faim et de satiété (complément)');
      ap.sim = HV.scenes.glyc.sim;
      ensureDefs(a);
      // Sources
      const src = (y, organ, sc, title, sub, info) => {
        const o = a.el('g', { transform: `translate(130 ${y}) scale(${sc})`, 'data-info': info });
        if (organ) HV.organs[organ](o);
        a.text(210, y - 6, title, 'lbl-s strong', { attrs: { 'data-info': info } });
        a.text(210, y + 18, sub, 'note', { attrs: { 'data-info': info } });
        return o;
      };
      src(250, 'fat', 0.8, 'Tissu adipeux', 'leptine · réserves', 'zgl-lep');
      src(420, 'islet', 0.8, 'Pancréas', 'insuline', 'zgl-ins-app');
      const stG = a.el('g', { transform: 'translate(130 590)', 'data-info': 'zgl-ghr' });
      HV.organArt(stG, 'servier/dig-stomach', -62, -66, 124, 134);
      a.text(210, 584, 'Estomac', 'lbl-s strong', { attrs: { 'data-info': 'zgl-ghr' } });
      a.text(210, 608, 'ghréline · avant le repas', 'note', { attrs: { 'data-info': 'zgl-ghr' } });
      src(760, 'intestine', 0.75, 'Intestin (cellules L)', 'PYY, GLP-1 · après le repas', 'zgl-pyy');
      // Noyau arqué
      a.el('ellipse', { cx: 830, cy: 500, rx: 210, ry: 300, class: 'zgl-nuc', 'data-info': 'zgl-arc' });
      a.text(830, 240, 'noyau arqué', 'lbl-s strong', { anchor: 'middle', attrs: { 'data-info': 'zgl-arc' } });
      a.text(830, 264, '(hypothalamus)', 'note', { anchor: 'middle', attrs: { 'data-info': 'zgl-arc' } });
      const neuron = (x, y, color, l1, l2, info) => {
        const n = a.el('g', { transform: `translate(${x} ${y})`, style: `--c: var(--${color})`, 'data-info': info });
        a.path('M -40,-30 L -78,-58 M -42,22 L -82,40 M -10,-44 L -20,-80', 'zgl-dend', n);
        a.path('M 54,0 L 340,0', 'zgl-dend', n);
        const halo = a.el('circle', { r: 74, class: 'zgl-halo' }, n);
        a.el('circle', { r: 58, class: 'zgl-neuron' }, n);
        a.text(0, -4, l1, 'note strong', { anchor: 'middle' }, n);
        a.text(0, 18, l2, 'note', { anchor: 'middle' }, n);
        return halo;
      };
      const hNpy = neuron(790, 390, 'p-orange', 'NPY/AgRP', 'faim', 'zgl-npy');
      const hPomc = neuron(790, 620, 'p-teal', 'POMC/CART', 'satiété', 'zgl-pomc');
      // Signaux vers les neurones
      const sig = (d, mol, rate, kind, sx, sy, info, o) => {
        const gS = a.el('g', { 'data-info': info });
        a.path(d, 'ax-track ' + kind, gS, { style: '--mc: var(--p-grey)' });
        a.sign(sx, sy, kind, gS).set(1);
        a.flow(d, Object.assign({ mol, rate, size: 1.2, speed: 80, track: false, max: 10, info }, o || {}));
        return gS;
      };
      // leptine
      sig('M 450,250 C 560,250 640,320 728,355', 'zgl-lep', () => 0.9 * lev.lep, 'inhib', 740, 361, 'zgl-lep');
      sig('M 450,262 C 560,300 600,560 728,588', 'zgl-lep', () => 0.9 * lev.lep, 'stim', 740, 591, 'zgl-lep');
      // insuline
      sig('M 450,420 C 560,420 620,600 720,620', 'insulin', () => 0.8 * lev.ins, 'stim', 732, 622, 'zgl-ins-app');
      // ghréline
      sig('M 450,590 C 560,590 620,420 720,392', 'zgl-ghr', () => 2.2 * lev.ghr, 'stim', 732, 392, 'zgl-ghr');
      // PYY / GLP-1
      sig('M 450,760 C 560,760 640,480 728,424', 'zgl-pyy', () => 2 * lev.pyy, 'inhib', 740, 419, 'zgl-pyy');
      sig('M 450,775 C 560,780 660,690 732,660', 'zgl-glp1', () => 1.6 * lev.pyy, 'stim', 744, 655, 'zgl-pyy');
      // PVN / MC4R
      const pvn = a.el('g', { 'data-info': 'zgl-mc4r' });
      a.el('ellipse', { cx: 1230, cy: 505, rx: 110, ry: 120, class: 'zgl-nuc' }, pvn);
      a.text(1230, 336, 'noyau', 'note strong', { anchor: 'middle' }, pvn);
      a.text(1230, 360, 'paraventriculaire', 'note strong', { anchor: 'middle' }, pvn);
      const rec = a.el('g', { transform: 'translate(1150 505)' }, pvn);
      a.el('rect', { x: -14, y: -34, width: 28, height: 68, rx: 10, class: 'chan' }, rec);
      a.text(1240, 512, 'MC4R', 'lbl-s strong', { anchor: 'middle' }, pvn);
      a.flow('M 1130,620 C 1150,580 1140,560 1140,530', { mol: 'zgl-amsh', rate: () => 2 * lev.pomc, size: 1.2, speed: 60, track: false, max: 8, info: 'zgl-pomc' });
      a.flow('M 1130,390 C 1150,430 1140,450 1140,480', { mol: 'zgl-agrp', rate: () => 2 * lev.npy, size: 1.2, speed: 60, track: false, max: 8, info: 'zgl-npy' });
      a.sign(1112, 560, 'stim').set(1);
      a.sign(1112, 450, 'inhib').set(1);
      a.text(1060, 660, 'α-MSH', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zgl-pomc' } });
      a.text(1060, 360, 'AgRP', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zgl-npy' } });
      // Bilan
      const OX = 1370;
      a.el('rect', { x: OX, y: 170, width: 180, height: 640, rx: 22, class: 'side-box' });
      a.text(OX + 90, 210, 'Bilan', 'lbl-h', { anchor: 'middle' });
      a.text(OX + 90, 262, 'faim', 'lbl-s strong', { anchor: 'middle', attrs: { style: 'fill: var(--p-orange)' } });
      a.el('rect', { x: OX + 70, y: 280, width: 40, height: 380, rx: 20, class: 'lvl-bg' });
      const mark = a.el('circle', { cx: OX + 90, cy: 470, r: 22, class: 'zgl-mark' });
      a.text(OX + 90, 696, 'satiété', 'lbl-s strong', { anchor: 'middle', attrs: { style: 'fill: var(--p-teal)' } });
      const clk = a.text(OX + 90, 740, '', 'note strong', { anchor: 'middle' });
      const clk2 = a.text(OX + 90, 764, '', 'note', { anchor: 'middle' });
      glyphKey(a, 1000, 760, [['zgl-lep', 'leptine', 'zgl-lep'], ['zgl-ghr', 'ghréline', 'zgl-ghr'], ['zgl-pyy', 'PYY', 'zgl-pyy']]);
      glyphKey(a, 1180, 760, [['zgl-glp1', 'GLP-1', 'zgl-pyy'], ['zgl-amsh', 'α-MSH', 'zgl-pomc'], ['zgl-agrp', 'AgRP', 'zgl-npy']]);
      // Obésité monogénique
      const mono = a.el('g', { 'data-info': 'zgl-mono' });
      a.el('rect', { x: 60, y: 850, width: 1490, height: 100, rx: 20, class: 'sig-box', style: '--c: var(--p-rose)' }, mono);
      a.text(84, 886, 'Obésités monogéniques (complément, rares)', 'lbl-s strong', null, mono);
      a.text(84, 916, 'Mutations de la voie leptine – mélanocortines : leptine, récepteur de la leptine, POMC, MC4R (la plus fréquente). Obésité sévère dès l\'enfance, hyperphagie.', 'note', null, mono);

      const lev = { lep: 1, ins: 1, ghr: 0.3, pyy: 0.3, npy: 0.5, pomc: 0.5 };
      let txt = 0, force = null; // force : signaux imposés par le pas à pas
      a.dyn((dt) => {
        keepAlive(dt);
        const M = sim(), s = M.s, h = M.T.h, p = M.p;
        // Ghréline : monte dans l'heure qui précède les repas (et pendant le jeûne).
        const pre = HV.rhythm.meals.reduce((acc, m) => acc + G(((m - h + 24) % 24), 0.6, 0.5), 0);
        lev.ghr = clamp(0.2 + 1.1 * pre + 0.6 * p.fast, 0, 1.5);
        lev.pyy = clamp(0.1 + 0.9 * food(), 0, 1.5);
        lev.ins = clamp(s.ins / 3, 0.05, 1.5);
        lev.lep = 1;
        if (force) Object.assign(lev, force);
        lev.npy = clamp(0.3 + 0.7 * lev.ghr - 0.3 * lev.pyy - 0.2 * lev.ins, 0.05, 1.3);
        lev.pomc = clamp(0.3 + 0.5 * lev.pyy + 0.3 * lev.ins - 0.2 * lev.ghr, 0.05, 1.3);
        hNpy.setAttribute('opacity', (0.1 + 0.6 * lev.npy).toFixed(2));
        hPomc.setAttribute('opacity', (0.1 + 0.6 * lev.pomc).toFixed(2));
        const bal = clamp(0.5 + (lev.pomc - lev.npy) * 0.6, 0, 1);
        mark.setAttribute('cy', (300 + 340 * bal).toFixed(1));
        txt -= dt;
        if (txt <= 0) {
          txt = 0.3;
          clk.textContent = force ? 'démonstration' : String(Math.floor(h)).padStart(2, '0') + ' h';
          clk2.textContent = lev.pyy > 0.5 ? 'repas' : lev.ghr > 0.6 ? 'avant un repas' : 'entre les repas';
        }
      });
      const demoSig = (o) => () => { force = o; txt = 0; };
      ap.stepEnd = () => { force = null; txt = 0; };
      HV.spotlight(ap, a, [
        { t: 'Le noyau arqué, chef d\'orchestre', d: 'Au contact de l\'éminence médiane, le noyau arqué de l\'hypothalamus perçoit des hormones venues de tout le corps et règle la prise alimentaire et la dépense énergétique (complément).', spot: [[830, 500, 230]], go: demoSig(null) },
        { t: 'Deux neurones qui s\'opposent', d: 'Les neurones NPY/AgRP stimulent la prise alimentaire (orexigènes) ; les neurones POMC/CART la freinent (anorexigènes). La faim dépend de la balance entre les deux, que montre la jauge « Bilan » (complément).', spot: [[790, 390, 80], [790, 620, 80], [1370, 170, 180, 640]], go: demoSig(null) },
        { t: 'Les réserves : leptine et insuline', d: 'Démonstration : insuline élevée. La leptine, sécrétée en proportion de la masse grasse, et l\'insuline sont des signaux des réserves : elles freinent NPY/AgRP et activent POMC (complément). Dans l\'obésité commune, la leptine est élevée mais agit moins (résistance à la leptine).', spot: [[60, 170, 300, 320], [790, 500, 150]], go: demoSig({ ins: 1.3, ghr: 0.1, pyy: 0.2 }) },
        { t: 'Avant le repas : la ghréline', d: 'Démonstration : avant un repas. L\'estomac sécrète la ghréline, seule hormone digestive orexigène : elle monte avant les repas, active NPY/AgRP et la jauge descend vers « faim ». Elle chute après le repas (complément).', spot: [[60, 510, 300, 140], [790, 390, 80], [1370, 170, 180, 640]], go: demoSig({ ghr: 1.4, pyy: 0.05, ins: 0.2 }) },
        { t: 'Après le repas : PYY et GLP-1', d: 'Démonstration : repas en cours. Les cellules L de l\'intestin sécrètent le PYY et le GLP-1 : le PYY freine NPY/AgRP, le GLP-1 agit sur l\'hypothalamus et le tronc cérébral ; la jauge remonte vers « satiété » (complément).', spot: [[60, 680, 340, 150], [790, 620, 80], [1370, 170, 180, 640]], go: demoSig({ pyy: 1.3, ghr: 0.05, ins: 1.2 }) },
        { t: 'Le relais : MC4R', d: 'Les deux voies se retrouvent sur le récepteur MC4R du noyau paraventriculaire : l\'α-MSH, issue de la POMC, l\'active → satiété ; l\'AgRP le bloque → faim (complément).', spot: [[1100, 340, 250, 340]], go: demoSig(null) },
        { t: 'Quand un maillon manque', d: 'Rares obésités monogéniques : une mutation de la leptine, de son récepteur, de la POMC ou de MC4R (la plus fréquente) coupe la voie de la satiété : obésité sévère dès l\'enfance, hyperphagie (complément).', spot: [[60, 850, 1490, 100]], go: demoSig(null) },
        { t: 'En résumé', d: 'Faim : ghréline → NPY/AgRP (l\'AgRP bloque MC4R). Satiété : leptine, insuline, PYY, GLP-1 → POMC → α-MSH → MC4R. Quittez le pas à pas : la jauge suit de nouveau l\'horloge des repas du modèle.', spot: [[60, 150, 1490, 800]], go: demoSig(null) }
      ]);
    }
  }, HV.LOUPE.R(4)));
})();
