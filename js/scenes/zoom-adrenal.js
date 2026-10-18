/* Loupes de la surrénale et du tube collecteur :
   - steroido : stéroïdogenèse et blocs enzymatiques (axe corticotrope) ;
   - adr-vasc : zonation et vascularisation centripète de la surrénale (axe corticotrope) ;
   - incidentalome : arbre décisionnel et calculateur de wash-out (axe corticotrope) ;
   - principal-cell : cellule principale du tube collecteur et action de l'aldostérone (SRAA). */
(function () {
  'use strict';
  const HV = window.HV;
  const clamp = HV.clamp;

  /* ---------- Outils communs ---------- */
  // Typographie française : espace insécable avant « : ; ? ! » et à l'intérieur des guillemets.
  const NB = (s) => String(s).replace(/ ([:;?!»%])/g, ' $1').replace(/« /g, '« ');
  const fr = (v, d) => v.toFixed(d || 0).replace('.', ',');
  const wrap = (str, n) => {
    const out = [];
    let cur = '';
    NB(str).split(' ').forEach((w) => {
      if (cur && (cur + ' ' + w).length > n) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
    });
    if (cur) out.push(cur);
    return out;
  };
  const T = (a) => (x, y, c, cls, o, p) => a.text(x, y, Array.isArray(c) ? c.map(NB) : NB(c), cls, o, p);
  // Écrit un paragraphe dans un <text> existant (lignes en <tspan>).
  const setLines = (t, x, lines, lh) => {
    t.textContent = '';
    lines.forEach((ln, i) => HV.el('tspan', { x, dy: i ? lh : 0, text: ln }, t));
  };
  const marker = (a, defs, id) => {
    const m = a.el('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs);
    a.el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'za-arrhead' }, m);
  };
  // Bouton SVG (pointerdown : le clic ne doit ni déplacer la caméra ni zoomer).
  const button = (a, x, y, w, h, label, onPress, info, parent) => {
    const g = a.el('g', { class: 'za-btn', transform: `translate(${x} ${y})`, 'data-info': info || null }, parent);
    a.el('rect', { x: 0, y: 0, width: w, height: h, rx: h / 2 }, g);
    a.text(w / 2, h / 2 + 6, NB(label), 'za-btn-t', { anchor: 'middle' }, g);
    g.addEventListener('pointerdown', (e) => { e.stopPropagation(); onPress(); });
    return g;
  };
  // Curseur SVG glissable.
  const slider = (a, x, y, w, o, parent) => {
    const g = a.el('g', { class: 'za-slider', 'data-info': o.info || null }, parent);
    const lab = a.text(x, y - 22, NB(o.label), 'za-sl-l', null, g);
    const val = a.text(x + w, y - 22, '', 'za-sl-v', { anchor: 'end' }, g);
    a.el('rect', { x: x - 16, y: y - 20, width: w + 32, height: 40, class: 'za-sl-hit' }, g);
    const track = a.el('rect', { x, y: y - 4, width: w, height: 8, rx: 4, class: 'za-sl-track' }, g);
    const fill = a.el('rect', { x, y: y - 4, width: 0, height: 8, rx: 4, class: 'za-sl-fill' }, g);
    const knob = a.el('circle', { cx: x, cy: y, r: 13, class: 'za-sl-knob' }, g);
    let v = o.val, drag = false;
    const draw = () => {
      const f = (v - o.min) / (o.max - o.min);
      knob.setAttribute('cx', (x + f * w).toFixed(1));
      fill.setAttribute('width', (f * w).toFixed(1));
      val.textContent = NB(o.fmt(v));
    };
    const upd = (e) => {
      const m = track.getScreenCTM();
      if (!m) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      const raw = o.min + clamp((p.x - x) / w, 0, 1) * (o.max - o.min);
      v = clamp(Math.round(raw / o.step) * o.step, o.min, o.max);
      draw();
      o.onChange(v);
    };
    g.addEventListener('pointerdown', (e) => { e.stopPropagation(); drag = true; try { g.setPointerCapture(e.pointerId); } catch (err) { /* sans capture */ } upd(e); });
    g.addEventListener('pointermove', (e) => { if (drag) upd(e); });
    const stop = () => { drag = false; };
    g.addEventListener('pointerup', stop);
    g.addEventListener('pointercancel', stop);
    draw();
    return { get: () => v, set(nv) { v = nv; draw(); o.onChange(v); }, lab };
  };
  // Les pas à pas peuvent piloter un état de la scène (ex. : un bloc enzymatique).
  const hookSteps = (def, fn) => {
    const orig = def.stepTo;
    def.stepTo = (i) => { orig(i); fn(i); };
  };

  /* =====================================================================
     1. Stéroïdogenèse et blocs enzymatiques
     ===================================================================== */
  Object.assign(HV.INFO, {
    'za-chol': { t: 'Cholestérol', k: 'Précurseur commun de tous les corticostéroïdes', d: 'Apporté par les LDL (endocytose médiée par les récepteurs) ou synthétisé dans le réticulum endoplasmique.' },
    'za-star': { t: 'StAR', k: 'Protéine régulatrice aiguë de la stéroïdogenèse · étape limitante', d: 'Fait passer le cholestérol de la membrane externe à la membrane interne de la mitochondrie, où se trouvent les premiers cytochromes P450. L\'ACTH augmente d\'abord la StAR, puis toutes les enzymes P450 stéroïdogènes.' },
    'za-scc': { t: 'CYP11A1 (P450scc)', k: 'Cholestérol desmolase · clivage de la chaîne latérale', d: 'Première étape enzymatique de toutes les hormones stéroïdes : cholestérol → prégnénolone, dans la mitochondrie.' },
    'za-acth': { t: 'ACTH', k: 'Stimule la zone fasciculée (et réticulée)', d: 'L\'ACTH augmente la StAR, puis les enzymes P450, et induit une hyperplasie surrénalienne en cas d\'excès chronique. Dans les blocs enzymatiques, le cortisol baisse : le rétrocontrôle négatif est levé, l\'ACTH monte et pousse la synthèse vers les précurseurs accumulés.' },
    'za-e3b': { t: '3β-HSD (HSD3B2)', k: '3β-hydroxystéroïde déshydrogénase', d: 'Transforme les stéroïdes Δ5 (prégnénolone, 17-OH-prégnénolone, DHEA) en stéroïdes Δ4 (progestérone, 17-OH-progestérone, androstènedione), dans les trois zones (complément).' },
    'za-e17h': { t: 'CYP17A1 · 17α-hydroxylase', k: 'Zones fasciculée et réticulée, absente de la glomérulée (complément)', d: 'Hydroxyle la prégnénolone et la progestérone en position 17 : oriente vers le cortisol. Son absence dans la zone glomérulée explique que celle-ci ne fasse ni cortisol ni androgènes.' },
    'za-e17l': { t: 'CYP17A1 · 17,20-lyase', k: 'Même enzyme, seconde activité · surtout zone réticulée (complément)', d: 'Coupe la chaîne latérale des stéroïdes 17-hydroxylés : 17-OH-prégnénolone → DHEA (voie principale chez l\'homme) ; 17-OH-progestérone → androstènedione (voie faible, qui devient importante quand la 17-OHP s\'accumule).' },
    'za-e21': { t: 'CYP21A2 · 21-hydroxylase', k: 'Gène sur le chromosome 6p21.3', d: 'Progestérone → 11-désoxycorticostérone (voie de l\'aldostérone) et 17-OH-progestérone → 11-désoxycortisol (voie du cortisol). Son déficit explique 95 % des hyperplasies congénitales des surrénales.' },
    'za-e11b1': { t: 'CYP11B1 · 11β-hydroxylase', k: 'Zone fasciculée, sous ACTH (complément)', d: '11-désoxycortisol → cortisol (et 11-désoxycorticostérone → corticostérone dans la fasciculée). Dernière étape de la synthèse du cortisol.' },
    'za-e11b2': { t: 'CYP11B2 · aldostérone synthase', k: 'Zone glomérulée uniquement · angiotensine II et K⁺', d: 'Assure les trois dernières étapes de la voie minéralocorticoïde : 11β-hydroxylation (DOC → corticostérone), puis 18-hydroxylation et 18-oxydation (corticostérone → aldostérone) (détail en complément).' },
    'za-e17b': { t: '17β-HSD', k: 'Surtout dans les gonades et les tissus périphériques (complément)', d: 'Androstènedione → testostérone. L\'androstènedione surrénalienne est un précurseur de la testostérone.' },
    'za-n-preg': { t: 'Prégnénolone', k: 'Premier stéroïde formé', d: 'Produite par CYP11A1 à partir du cholestérol, puis modifiée par des enzymes propres à chaque zone.' },
    'za-n-prog': { t: 'Progestérone', k: 'Stéroïde Δ4', d: 'Formée par la 3β-HSD. Dans la zone glomérulée, elle s\'engage dans la voie de l\'aldostérone.' },
    'za-n-doc': { t: '11-désoxycorticostérone (DOC)', k: 'Minéralocorticoïde actif (complément)', d: 'Son accumulation dans les blocs en 11β- et en 17α-hydroxylase donne une HTA avec hypokaliémie, rénine et aldostérone basses.' },
    'za-n-corticost': { t: 'Corticostérone', k: 'Faible activité glucocorticoïde (complément)', d: 'Précurseur de l\'aldostérone dans la zone glomérulée. Dans le bloc en 17α-hydroxylase, son excès évite l\'insuffisance surrénale aiguë malgré l\'absence de cortisol.' },
    'za-n-aldo': { t: 'Aldostérone', k: 'Principal minéralocorticoïde · zone glomérulée', d: 'Sous le contrôle du système rénine-angiotensine et de la kaliémie. Augmente la réabsorption du sodium et l\'excrétion du potassium et des ions H⁺.' },
    'za-n-ohpreg': { t: '17-OH-prégnénolone', k: 'Stéroïde Δ5 · zone fasciculée et réticulée', d: 'S\'accumule dans le bloc en 3β-HSD (complément).' },
    'za-n-ohp': { t: '17-hydroxyprogestérone (17-OHP)', k: 'Marqueur du bloc en 21-hydroxylase', d: 'S\'accumule massivement dans le déficit en 21-hydroxylase. Dosée au 3e jour de vie (test de Guthrie) pour le dépistage néonatal, et de base ou après stimulation par l\'ACTH pour les formes non classiques.' },
    'za-n-s11': { t: '11-désoxycortisol', k: 'Composé S', d: 'Précurseur immédiat du cortisol ; s\'accumule dans le bloc en 11β-hydroxylase (complément).' },
    'za-n-cortisol': { t: 'Cortisol', k: 'Principal glucocorticoïde · zone fasciculée', d: 'Sous le contrôle de l\'ACTH ; freine en retour la CRH et l\'ACTH. Effets : néoglucogenèse, catabolisme protidique, effet anti-inflammatoire, tonus vasculaire…' },
    'za-n-dhea': { t: 'DHEA et DHEA-S', k: 'Androgènes surrénaliens · zone réticulée', d: 'La DHEA est en grande partie sulfatée en DHEA-S. Androgènes faibles, dépendants de l\'ACTH.' },
    'za-n-adione': { t: 'Androstènedione', k: 'Précurseur de la testostérone', d: 'Produite par la zone réticulée ; convertie en testostérone en périphérie. Augmentée dans les blocs en 21- et en 11β-hydroxylase : virilisation.' },
    'za-n-testo': { t: 'Testostérone', k: 'Surtout gonadique', d: 'Une partie de la testostérone circulante de la femme provient de la conversion périphérique des androgènes surrénaliens (complément).' },
    'za-zones': { t: 'Zonation fonctionnelle', k: 'Une enzyme distincte par zone', d: 'Glomérulée : CYP11B2 sans CYP17 → aldostérone. Fasciculée : CYP17 (17α-hydroxylase) et CYP11B1 → cortisol. Réticulée : CYP17 (17,20-lyase) → DHEA, androstènedione.' },
    'za-blk-n': { t: 'Sujet sain', k: 'Aucune enzyme bloquée', d: 'Les trois voies fonctionnent ; le cortisol freine l\'ACTH.' },
    'za-blk-21': { t: 'Bloc en 21-hydroxylase', k: '95 % des hyperplasies congénitales des surrénales', d: 'Autosomique récessif (CYP21A2). Cortisol ± aldostérone effondrés, 17-OHP et androgènes en excès.' },
    'za-blk-11': { t: 'Bloc en 11β-hydroxylase', k: 'Environ 5 % des HCS (complément)', d: 'CYP11B1 : excès de 11-désoxycortisol et de DOC ; virilisation avec HTA.' },
    'za-blk-17': { t: 'Bloc en 17α-hydroxylase', k: 'Très rare (complément)', d: 'CYP17A1 : ni cortisol ni stéroïdes sexuels ; DOC et corticostérone en excès : HTA, hypokaliémie.' },
    'za-blk-3': { t: 'Bloc en 3β-HSD', k: 'Très rare (complément)', d: 'HSD3B2 : seuls les stéroïdes Δ5 sont produits ; perte de sel, ambiguïté sexuelle.' }
  });

  const dSt = HV.scene(Object.assign({
    id: 'steroido', parent: 'cortico', loupe: 'Stéroïdogenèse',
    title: 'Stéroïdogenèse et blocs enzymatiques', level: 'Cellule',
    lead: NB('Toutes les hormones corticostéroïdes dérivent du cholestérol. La StAR le fait entrer dans la mitochondrie (étape limitante), où CYP11A1 forme la prégnénolone ; chaque zone du cortex la transforme ensuite avec ses propres enzymes. Bloquez une enzyme : les précurseurs d\'amont s\'accumulent, le cortisol baisse, l\'ACTH monte et pousse encore la synthèse.'),
    points: [
      'Étape limitante : transfert mitochondrial du cholestérol par la StAR, stimulée par l\'ACTH.',
      'Glomérulée : pas de CYP17 → voie de l\'aldostérone (CYP21A2 puis CYP11B2).',
      'Fasciculée : CYP17 (17α-hydroxylase), CYP21A2, CYP11B1 → cortisol.',
      'Réticulée : CYP17 (17,20-lyase) → DHEA, DHEA-S, androstènedione.',
      'Bloc en 21-hydroxylase : 95 % des HCS ; 17-OHP très élevée (dépistage néonatal à J3), virilisation, perte de sel dans les formes classiques.',
      'Blocs en 11β-, 17α-hydroxylase et 3β-HSD : rares (complément).',
      'Polycopié, partie 1 : texte p. 70 à 73 du PDF, figure 26 p. 71.'
    ].map(NB),
    legend: new Set(['chol', 'acth', 'aldo', 'cortisol', 'dhea', 'testo', 'prog']),
    build(g, a) {
      a.frame('Stéroïdogenèse surrénalienne', 'Du cholestérol aux trois familles d\'hormones · blocs enzymatiques');
      const t = T(a);
      const defs = a.el('defs');
      marker(a, defs, 'za-st-arr');
      HV.figBadge(a, 1540, 186, ['26']);

      const CX = [205, 565, 925], RY = [330, 470, 610, 750, 890];
      const COL = ['--p-amber', '--p-gold', '--p-sky'];
      // Bandes des trois zones
      [['Zone glomérulée', 'minéralocorticoïdes'], ['Zone fasciculée', 'glucocorticoïdes'], ['Zone réticulée', 'androgènes']].forEach(([z, s], i) => {
        a.el('rect', { x: CX[i] - 170, y: 165, width: 340, height: 815, rx: 22, class: 'za-band', style: `--c: var(${COL[i]})`, 'data-info': 'za-zones' });
        t(CX[i], i === 0 ? 952 : 920, z, 'za-band-t', { anchor: 'middle' });
        t(CX[i], i === 0 ? 972 : 944, s, 'note', { anchor: 'middle' });
      });

      // Nœuds
      const N = {
        chol: [0, 200, 'cholestérol', 'za-chol'],
        preg: [0, RY[0], 'prégnénolone', 'za-n-preg'], prog: [0, RY[1], 'progestérone', 'za-n-prog'],
        doc: [0, RY[2], '11-désoxycorticostérone', 'za-n-doc', 'small'], corticost: [0, RY[3], 'corticostérone', 'za-n-corticost'],
        aldo: [0, RY[4], 'aldostérone', 'za-n-aldo', 'final'],
        ohpreg: [1, RY[0], '17-OH-prégnénolone', 'za-n-ohpreg'], ohp: [1, RY[1], '17-OH-progestérone', 'za-n-ohp'],
        s11: [1, RY[2], '11-désoxycortisol', 'za-n-s11'], cortisol: [1, RY[3], 'cortisol', 'za-n-cortisol', 'final'],
        dhea: [2, RY[0], 'DHEA', 'za-n-dhea', 'final'], adione: [2, RY[1], 'androstènedione', 'za-n-adione', 'final'],
        testo: [2, RY[2], 'testostérone', 'za-n-testo', 'peri']
      };
      const nodeEl = {};
      const edgeLayer = a.el('g');
      const nodeLayer = a.el('g');
      const crossLayer = a.el('g');
      Object.keys(N).forEach((k) => {
        const [c, y, lbl, info, extra] = N[k];
        const x = CX[c];
        const gN = a.el('g', { class: 'za-node' + (extra ? ' ' + extra : ''), style: `--c: var(${COL[c]})`, 'data-info': info }, nodeLayer);
        a.el('rect', { x: x - 112, y: y - 26, width: 224, height: 52, rx: 26, class: 'za-node-r' }, gN);
        t(x, y + 6, lbl, 'za-node-t', { anchor: 'middle' }, gN);
        const bd = a.el('g', { class: 'za-lv', transform: `translate(${x + 112} ${y - 26})` }, gN);
        a.el('circle', { r: 16 }, bd);
        const bt = a.text(0, 6, '', 'za-lv-t', { anchor: 'middle' }, bd);
        nodeEl[k] = { g: gN, bd, bt };
      });
      t(CX[0] + 128, 206, 'LDL ou synthèse (RE)', 'note');
      t(CX[2] - 16, RY[0] + 76, 'sulfatation → DHEA-S', 'note', { anchor: 'end' });
      t(CX[2], RY[2] + 52, 'surtout gonades, périphérie', 'note', { anchor: 'middle' });

      // Arêtes : [de, vers, enzyme, libellés]
      const E = [
        ['chol', 'preg', 'star'],
        ['preg', 'prog', 'e3b', ['3β-HSD']], ['ohpreg', 'ohp', 'e3b', ['3β-HSD']], ['dhea', 'adione', 'e3b', ['3β-HSD']],
        ['prog', 'doc', 'e21', ['CYP21A2']], ['ohp', 's11', 'e21', ['CYP21A2']],
        ['doc', 'corticost', 'e11b2', ['CYP11B2']], ['corticost', 'aldo', 'e11b2', ['CYP11B2']], ['s11', 'cortisol', 'e11b1', ['CYP11B1']],
        ['adione', 'testo', 'e17b', ['17β-HSD'], 'peri'],
        ['preg', 'ohpreg', 'e17h', ['CYP17A1', '17α-hydroxylase']], ['prog', 'ohp', 'e17h', ['CYP17A1', '17α-hydroxylase']],
        ['ohpreg', 'dhea', 'e17l', ['CYP17A1', '17,20-lyase']], ['ohp', 'adione', 'e17l', ['CYP17A1', '17,20-lyase'], 'weak']
      ];
      const pos = (k) => [CX[N[k][0]], N[k][1]];
      const edges = E.map(([f, to, enz, labs, kind]) => {
        const [x1, y1] = pos(f), [x2, y2] = pos(to);
        const vert = x1 === x2;
        const d = vert ? `M ${x1},${y1 + 27} L ${x2},${y2 - 30}` : `M ${x1 + 113},${y1} L ${x2 - 116},${y2}`;
        const ed = { f, to, enz, d };
        ed.line = a.path(d, 'za-edge' + (kind ? ' ' + kind : ''), edgeLayer, { 'marker-end': 'url(#za-st-arr)', 'data-info': 'za-' + (enz === 'star' ? 'scc' : enz) });
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        ed.cross = a.el('g', { class: 'za-cross', transform: `translate(${mx} ${vert ? my : y1})`, visibility: 'hidden' }, crossLayer);
        a.el('path', { d: 'M -15,-15 L 15,15 M 15,-15 L -15,15' }, ed.cross);
        if (enz === 'star') {
          [['StAR', 248, 'za-star'], ['CYP11A1', 286, 'za-scc']].forEach(([l, y, inf]) => {
            const pg = a.el('g', { class: 'za-enz', 'data-info': inf }, edgeLayer);
            a.el('rect', { x: x1 + 14, y: y - 14, width: l.length * 10.5 + 18, height: 28, rx: 14 }, pg);
            a.text(x1 + 23, y + 6, l, 'za-enz-t', null, pg);
          });
        } else if (vert) {
          ed.pill = a.el('g', { class: 'za-enz', 'data-info': 'za-' + enz }, edgeLayer);
          a.el('rect', { x: x1 + 14, y: my - 14, width: labs[0].length * 10.5 + 18, height: 28, rx: 14 }, ed.pill);
          a.text(x1 + 23, my + 6, labs[0], 'za-enz-t', null, ed.pill);
        } else {
          ed.pill = a.el('g', { class: 'za-enz bare', 'data-info': 'za-' + enz }, edgeLayer);
          a.el('rect', { x: mx - 66, y: y1 - 32, width: 132, height: 64, rx: 10, class: 'za-hit' }, ed.pill);
          a.text(mx, y1 - 10, labs[0], 'za-enz-t', { anchor: 'middle' }, ed.pill);
          a.text(mx, y1 + 25, labs[1], 'za-enz-s', { anchor: 'middle' }, ed.pill);
        }
        return ed;
      });

      // ACTH → StAR
      const acthG = a.el('g', { 'data-info': 'za-acth' });
      a.el('rect', { x: 392, y: 232, width: 92, height: 34, rx: 17, class: 'sig-box', style: '--c: var(--p-orange2)' }, acthG);
      a.text(438, 256, 'ACTH', 'za-enz-t', { anchor: 'middle' }, acthG);
      a.path('M 390,249 L 300,249', 'ax-track stim', acthG, { style: '--mc: var(--p-orange2)', 'marker-end': 'url(#za-st-arr)' });
      const acthSign = a.sign(345, 249, 'stim', acthG);

      // Niveaux par scénario : acc (accumulation massive), up, n, down, none
      const LV = { acc: 3, up: 1.8, n: 1, down: 0.3, none: 0.04 };
      const BLOCKS = {
        n: { lab: 'Sujet sain', enz: [], acth: 1, cort: 1, lv: {}, chips: [],
          txt: 'Sous ACTH, la fasciculée produit le cortisol, qui freine en retour la CRH et l\'ACTH. La glomérulée produit l\'aldostérone sous l\'effet de l\'angiotensine II et du potassium ; la réticulée produit DHEA, DHEA-S et androstènedione. Choisissez un bloc enzymatique.' },
        b21: { lab: 'Bloc 21-hydroxylase', enz: ['e21'], acth: 3, cort: 0.25, chips: ['vir', 'salt'],
          lv: { preg: 'up', prog: 'up', ohpreg: 'up', ohp: 'acc', doc: 'down', corticost: 'down', aldo: 'down', s11: 'down', cortisol: 'down', dhea: 'up', adione: 'acc', testo: 'up' },
          txt: '95 % des HCS (CYP21A2, 6p21.3). La 17-OHP s\'accumule massivement et se détourne vers les androgènes. Fille : virilisation des organes génitaux externes ; deux sexes : pilosité pubienne précoce, croissance et maturation osseuse accélérées. Forme classique avec perte de sel : hyponatrémie, hyperkaliémie, acidose, déshydratation dès les premières semaines. Dépistage néonatal : 17-OHP à J3.' },
        b11: { lab: 'Bloc 11β-hydroxylase', enz: ['e11b1'], acth: 2.6, cort: 0.3, chips: ['vir', 'hta'],
          lv: { preg: 'up', prog: 'up', ohpreg: 'up', ohp: 'up', doc: 'acc', corticost: 'down', aldo: 'down', s11: 'acc', cortisol: 'down', dhea: 'up', adione: 'up', testo: 'up' },
          txt: '(complément) Environ 5 % des HCS (CYP11B1). Le 11-désoxycortisol et la DOC, fabriquée en excès par la fasciculée sous ACTH, s\'accumulent. La DOC est minéralocorticoïde : HTA, hypokaliémie, rénine et aldostérone basses. Virilisation comme dans le bloc en 21-hydroxylase.' },
        b17: { lab: 'Bloc 17α-hydroxylase', enz: ['e17h', 'e17l'], acth: 2.6, cort: 0.05, chips: ['hta', 'hypo'],
          lv: { preg: 'up', prog: 'up', doc: 'acc', corticost: 'acc', aldo: 'down', ohpreg: 'none', ohp: 'none', s11: 'none', cortisol: 'none', dhea: 'none', adione: 'none', testo: 'none' },
          txt: '(complément) Très rare (CYP17A1, aussi exprimée dans les gonades). Ni cortisol ni stéroïdes sexuels. DOC et corticostérone en excès : HTA, hypokaliémie, rénine et aldostérone basses ; la corticostérone évite la crise surrénale. Garçon 46,XY peu ou pas virilisé ; fille : impubérisme, aménorrhée primaire.' },
        b3: { lab: 'Bloc 3β-HSD', enz: ['e3b'], acth: 3, cort: 0.2, chips: ['salt', 'hypo', 'vir'],
          lv: { preg: 'acc', ohpreg: 'acc', dhea: 'acc', prog: 'down', ohp: 'down', doc: 'down', corticost: 'down', aldo: 'down', s11: 'down', cortisol: 'down', adione: 'down', testo: 'down' },
          txt: '(complément) Très rare (HSD3B2, aussi gonadique). Seuls les stéroïdes Δ5 (prégnénolone, 17-OH-prégnénolone, DHEA) s\'accumulent. Perte de sel et déficit en cortisol. Garçon insuffisamment virilisé (la DHEA est un androgène faible) ; fille modérément virilisée par conversion périphérique de la DHEA.' }
      };
      let cur = 'n';
      const lvOf = (k) => LV[BLOCKS[cur].lv[k] || 'n'];
      const blocked = (enz) => BLOCKS[cur].enz.indexOf(enz) >= 0;

      // Particules le long des arêtes
      edges.forEach((ed) => {
        const c = COL[N[ed.to][0]];
        a.flow(ed.d, { mol: 'dot', style: `fill: var(${c})`, size: 0.9, speed: 45, track: false, max: 14,
          rate: () => (blocked(ed.enz) ? 0 : 0.9 * Math.min(lvOf(ed.f), Math.max(lvOf(ed.to), 0.3)) * (ed.enz === 'e17b' ? 0.5 : 1)) });
      });

      /* --- Panneau de droite --- */
      const PX = 1130, PW = 430;
      t(PX, 196, 'Bloquer une enzyme', 'lbl-h');
      const btns = {};
      ['n', 'b21', 'b11', 'b17', 'b3'].forEach((k, i) => {
        btns[k] = button(a, PX, 214 + i * 52, PW, 42, BLOCKS[k].lab, () => setBlock(k), 'za-blk-' + (k === 'n' ? 'n' : k.slice(1)));
      });
      // ACTH et cortisol
      const fbG = a.el('g', { 'data-info': 'za-acth' });
      a.el('rect', { x: PX, y: 486, width: PW, height: 118, rx: 16, class: 'side-box' }, fbG);
      t(PX + 18, 518, 'ACTH', 'lbl-s strong', null, fbG);
      t(PX + 18, 552, 'cortisol', 'lbl-s strong', null, fbG);
      a.el('rect', { x: PX + 120, y: 506, width: 290, height: 14, rx: 7, class: 'lvl-bg' }, fbG);
      a.el('rect', { x: PX + 120, y: 540, width: 290, height: 14, rx: 7, class: 'lvl-bg' }, fbG);
      const barA = a.el('rect', { x: PX + 120, y: 506, width: 90, height: 14, rx: 7, class: 'lvl-bar', style: '--mc: var(--p-orange2)' }, fbG);
      const barC = a.el('rect', { x: PX + 120, y: 540, width: 90, height: 14, rx: 7, class: 'lvl-bar', style: '--mc: var(--p-gold)' }, fbG);
      const fbT = a.text(PX + 18, 588, '', 'za-small', null, fbG);
      // Conséquences cliniques
      const CH = [['vir', 'Virilisation'], ['salt', 'Perte de sel'], ['hta', 'HTA, hypokaliémie'], ['hypo', 'Stéroïdes sexuels ↓']];
      const chipEl = {};
      CH.forEach(([k, l], i) => {
        const x = PX + (i % 2) * 220, y = 622 + Math.floor(i / 2) * 46;
        const cg = a.el('g', { class: 'za-chip' });
        a.el('rect', { x, y, width: 210, height: 36, rx: 18 }, cg);
        a.text(x + 105, y + 24, NB(l), 'za-chip-t', { anchor: 'middle' }, cg);
        chipEl[k] = cg;
      });
      const txt = a.text(PX, 742, '', 'za-txt');

      function setBlock(k) {
        cur = k;
        const B = BLOCKS[k];
        Object.keys(btns).forEach((b) => btns[b].classList.toggle('on', b === k));
        Object.keys(nodeEl).forEach((n) => {
          const lv = B.lv[n] || 'n', ne = nodeEl[n];
          ['acc', 'up', 'down', 'none'].forEach((c) => ne.g.classList.toggle('lv-' + c, lv === c));
          ne.bt.textContent = { acc: '↑↑', up: '↑', down: '↓', none: '0' }[lv] || '';
          ne.bd.setAttribute('visibility', lv === 'n' ? 'hidden' : 'visible');
        });
        edges.forEach((ed) => {
          const b = blocked(ed.enz);
          ed.cross.setAttribute('visibility', b ? 'visible' : 'hidden');
          ed.line.classList.toggle('blocked', b);
          if (ed.pill) ed.pill.classList.toggle('blocked', b);
        });
        Object.keys(chipEl).forEach((c) => chipEl[c].classList.toggle('on', B.chips.indexOf(c) >= 0));
        barA.setAttribute('width', (290 * Math.min(1, B.acth / 3.2)).toFixed(0));
        barC.setAttribute('width', (290 * Math.min(1, 0.04 + B.cort / 3.2)).toFixed(0));
        fbT.textContent = NB(k === 'n' ? 'Le cortisol freine la CRH et l\'ACTH : boucle équilibrée.' : 'Cortisol ↓ : rétrocontrôle levé → ACTH ↑ → hyperplasie.');
        setLines(txt, PX, wrap(B.txt, 50), 22);
        acthSign.set(B.acth);
      }
      setBlock('n');
      a.dyn(() => {});

      HV.spotlight(dSt, a, [
        { t: 'Le cholestérol entre dans la mitochondrie', d: NB('Apporté par les LDL ou synthétisé sur place, le cholestérol est transféré à la membrane mitochondriale interne par la StAR : c\'est l\'étape limitante, stimulée par l\'ACTH.'), spot: [[80, 165, 420, 145]], block: 'n' },
        { t: 'Prégnénolone, le tronc commun', d: NB('CYP11A1 (P450scc, cholestérol desmolase) clive la chaîne latérale : la prégnénolone est le point de départ des trois voies.'), spot: [[CX[0], RY[0], 130]], block: 'n' },
        { t: 'Zone glomérulée : aldostérone', d: NB('Sans CYP17, la glomérulée suit la voie de gauche : 3β-HSD, CYP21A2 puis aldostérone synthase (CYP11B2), sous le contrôle de l\'angiotensine II et du potassium.'), spot: [[35, 300, 340, 620]], block: 'n' },
        { t: 'Zone fasciculée : cortisol', d: NB('La 17α-hydroxylase (CYP17A1) oriente vers la voie du cortisol : 17-OH-progestérone, 11-désoxycortisol, puis cortisol par CYP11B1. C\'est la plus grande zone (75 à 80 % du cortex).'), spot: [[395, 300, 340, 480], [380, RY[0], 70]], block: 'n' },
        { t: 'Zone réticulée : androgènes', d: NB('La 17,20-lyase (même enzyme CYP17A1) produit la DHEA, sulfatée en DHEA-S, et l\'androstènedione, précurseur de la testostérone.'), spot: [[755, 300, 340, 340]], block: 'n' },
        { t: 'Bloc en 21-hydroxylase', d: NB('95 % des HCS : le cortisol (et souvent l\'aldostérone) ne se fait plus. La 17-OHP s\'accumule et se déverse vers les androgènes : virilisation, perte de sel dans les formes classiques.'), spot: [[CX[1], RY[1], 120], [CX[2], RY[1], 120], [CX[1], (RY[1] + RY[2]) / 2, 70]], block: 'b21' },
        { t: 'Le rétrocontrôle est levé', d: NB('Moins de cortisol, donc plus d\'ACTH : la StAR et toutes les enzymes sont stimulées, les surrénales s\'hyperplasient, et les précurseurs d\'amont s\'accumulent encore plus.'), spot: [[PX - 10, 476, PW + 20, 138], [438, 249, 70]], block: 'b21' },
        { t: 'Autres blocs', d: NB('Essayez les boutons : bloc en 11β-hydroxylase (DOC → HTA avec virilisation), 17α-hydroxylase (HTA sans stéroïdes sexuels), 3β-HSD (stéroïdes Δ5, perte de sel). Formes rares, en complément du polycopié.'), spot: [[PX - 10, 204, PW + 20, 268]], block: 'b11' }
      ]);
      hookSteps(dSt, (i) => setBlock(i < 0 ? 'n' : dSt.steps[i].block));
    }
  }, HV.LOUPE.L(0)));

  /* =====================================================================
     2. Vascularisation et zonation
     ===================================================================== */
  Object.assign(HV.INFO, {
    'za-caps': { t: 'Capsule et artères capsulaires', k: 'Trois artères par glande', d: 'Les artères surrénales (supérieure, moyenne et inférieure : branches de l\'artère phrénique inférieure, de l\'aorte et de l\'artère rénale, en complément) forment un plexus sous la capsule. La surrénale a l\'un des débits sanguins par gramme les plus élevés de l\'organisme.' },
    'za-zg': { t: 'Zone glomérulée', k: 'La plus externe · aldostérone', d: 'Cellules en amas arrondis sous la capsule. Produit l\'aldostérone (aldostérone synthase) sous l\'effet de l\'angiotensine II et du potassium.' },
    'za-zf': { t: 'Zone fasciculée', k: '75 à 80 % du volume du cortex · cortisol', d: 'Cellules riches en lipides (spongiocytes, en complément), en cordons parallèles séparés par des capillaires sinusoïdes. Produit le cortisol sous ACTH.' },
    'za-zr': { t: 'Zone réticulée', k: 'Au contact de la médullaire · androgènes', d: 'Cordons anastomosés. Produit DHEA, DHEA-S et androstènedione, sous la dépendance de l\'ACTH.' },
    'za-med': { t: 'Médullosurrénale', k: 'Cellules chromaffines · catécholamines', d: 'Synthèse des catécholamines à partir de la tyrosine. Sécrète environ 80 à 95 % d\'adrénaline et 10 à 20 % de noradrénaline, sous la commande des nerfs splanchniques (sympathique).' },
    'za-sinus': { t: 'Capillaires sinusoïdes', k: 'Circulation centripète (complément)', d: 'Le sang descend de la capsule vers la médullaire entre les cordons cellulaires, en se chargeant des stéroïdes de chaque zone : la médullaire est baignée par un sang très riche en cortisol.' },
    'za-artmed': { t: 'Artérioles médullaires', k: 'Apport artériel direct (complément)', d: 'Quelques artérioles traversent le cortex sans s\'y ramifier et apportent à la médullaire du sang artériel.' },
    'za-pnmt': { t: 'PNMT', k: 'Phényléthanolamine N-méthyltransférase', d: 'Transforme la noradrénaline en adrénaline dans le cytosol des cellules chromaffines. Les glucocorticoïdes du cortex augmentent la tyrosine hydroxylase et la PNMT : la circulation centripète apporte ce cortisol à forte concentration (complément).' },
    'za-cv': { t: 'Veine centrale', k: 'Draine toute la glande', d: 'Reçoit les sinusoïdes et les veinules médullaires, puis se continue par la veine surrénale (une par glande).' },
    'za-vsd': { t: 'Veine surrénale droite', k: 'Se jette dans la veine cave inférieure', d: 'Très courte, abouchée directement à la face postérieure de la VCI : c\'est la plus difficile à cathétériser (complément).' },
    'za-vsg': { t: 'Veine surrénale gauche', k: 'Se draine dans la veine rénale gauche', d: 'Ou dans la veine phrénique inférieure gauche. Plus longue, elle est plus facile à cathétériser (complément).' },
    'za-kt': { t: 'Cathétérisme des veines surrénales', k: 'Examen de référence pour latéraliser un HAP', d: 'Dosage du cortisol et de l\'aldostérone dans les deux veines surrénales et dans le sang veineux mêlé (VCI ou veine périphérique), avec ou sans ACTH. Cortisol veine surrénale / VCI : confirme la sélectivité. Rapport aldostérone/cortisol droite vs gauche : sécrétion unilatérale ou bilatérale.' },
    'za-ivc': { t: 'Veine cave inférieure', k: 'À droite de l\'aorte', d: 'Reçoit directement la veine surrénale droite et les deux veines rénales.' },
    'za-aorta': { t: 'Aorte abdominale', k: 'Repère', d: 'La veine rénale gauche passe en avant de l\'aorte pour rejoindre la VCI.' },
    'za-adr-r': { t: 'Surrénale droite', k: 'Forme pyramidale', d: 'Environ 5 cm de long, 4 g, rétropéritonéale, au pôle supérieur du rein droit.' },
    'za-adr-l': { t: 'Surrénale gauche', k: 'Semi-lunaire (en croissant), un peu plus grande', d: 'Au bord supéro-médial du rein gauche.' }
  });

  const dV = HV.scene(Object.assign({
    id: 'adr-vasc', parent: 'cortico', loupe: 'Zonation et vaisseaux',
    title: 'Vascularisation et zonation surrénaliennes', level: 'Tissu',
    lead: NB('De la capsule vers le centre : zone glomérulée, zone fasciculée, zone réticulée, puis médullaire. Le sang artériel arrive sous la capsule et descend vers la médullaire par des capillaires sinusoïdes : la médullaire reçoit un sang très riche en cortisol, qui induit la PNMT (noradrénaline → adrénaline). Une veine centrale draine la glande ; la veine surrénale droite, courte, rejoint la VCI, la gauche la veine rénale gauche.'),
    points: [
      'Trois artères par glande ; débit sanguin par gramme parmi les plus élevés de l\'organisme.',
      'Circulation centripète, de la capsule vers la veine centrale (complément).',
      'Les glucocorticoïdes augmentent la tyrosine hydroxylase et la PNMT : la médullaire sécrète surtout de l\'adrénaline (80 à 95 %).',
      'Veine surrénale droite → VCI ; gauche → veine rénale gauche (ou phrénique inférieure gauche).',
      'Cathétérisme des veines surrénales : cortisol pour la sélectivité, rapport aldostérone/cortisol pour la latéralisation.',
      'Polycopié, partie 1 : p. 68 et 69 du PDF (figures 24 et 25), p. 74 (PNMT), p. 78 (cathétérisme).'
    ].map(NB),
    legend: new Set(['aldo', 'cortisol', 'dhea', 'adre', 'nora']),
    build(g, a) {
      a.frame('Zonation et vascularisation', 'Coupe radiaire de la surrénale · drainage veineux');
      const t = T(a);
      const sim = () => HV.scenes.cortico.sim;
      dV.sim = HV.scenes.cortico.sim;
      a.dyn((dt) => { if (!(HV.scenes.cortico._op > 0)) sim().step(dt); });
      HV.figBadge(a, 1535, 78, ['24', '25']);
      const defs = a.el('defs');
      marker(a, defs, 'za-v-arr');

      const X0 = 110, X1 = 640;
      const Z = { cap: [196, 212], zg: [212, 292], zf: [292, 560], zr: [560, 660], med: [660, 930] };
      // Couches
      a.el('rect', { x: X0, y: Z.cap[0], width: X1 - X0, height: Z.cap[1] - Z.cap[0], class: 'za-cap', 'data-info': 'za-caps' });
      [['zg', '--p-amber'], ['zf', '--p-gold'], ['zr', '--p-brown'], ['med', '--p-rose']].forEach(([k, c]) => {
        a.el('rect', { x: X0, y: Z[k][0], width: X1 - X0, height: Z[k][1] - Z[k][0], class: 'za-layer', style: `--c: var(${c})`, 'data-info': 'za-' + k });
      });
      // Cellules
      let seed = 11;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const cells = a.el('g', { class: 'za-cells' });
      for (let x = X0 + 30; x < X1 - 20; x += 62) { // glomérules (arcs)
        for (let k = 0; k < 5; k++) {
          const an = Math.PI * (0.15 + 0.7 * k / 4);
          a.el('circle', { cx: x + 22 * Math.cos(an) + 6, cy: 262 - 30 * Math.sin(an), r: 10, class: 'za-c', style: '--c: var(--p-amber)', 'data-info': 'za-zg' }, cells);
        }
      }
      const SX = [150, 260, 380, 500, 610];
      for (let i = 0; i < SX.length - 1; i++) { // cordons de la fasciculée
        const mx = (SX[i] + SX[i + 1]) / 2;
        for (let y = 306; y < 550; y += 24) {
          a.el('rect', { x: mx - 26, y, width: 24, height: 21, rx: 7, class: 'za-c', style: '--c: var(--p-gold)', 'data-info': 'za-zf' }, cells);
          a.el('rect', { x: mx + 2, y, width: 24, height: 21, rx: 7, class: 'za-c', style: '--c: var(--p-gold)', 'data-info': 'za-zf' }, cells);
        }
      }
      for (let k = 0; k < 46; k++) { // réticulée
        a.el('circle', { cx: X0 + 20 + rnd() * (X1 - X0 - 40), cy: 574 + rnd() * 72, r: 9, class: 'za-c', style: '--c: var(--p-brown)', 'data-info': 'za-zr' }, cells);
      }
      for (let k = 0; k < 60; k++) { // chromaffines (évite la PNMT et la veine)
        const cx = X0 + 20 + rnd() * (X1 - X0 - 40), cy = 680 + rnd() * 140;
                a.el('circle', { cx, cy, r: 11, class: 'za-c chrom', style: '--c: var(--p-rose)', 'data-info': 'za-med' }, cells);
      }
      // Artères capsulaires
      a.vessel(`M ${X0 - 50},180 L ${X1 + 10},180`, 16);
      a.el('rect', { x: X0 - 50, y: 168, width: X1 - X0 + 60, height: 24, class: 'za-hit', 'data-info': 'za-caps' });
      // Sinusoïdes et artériole médullaire
      const sin = SX.map((x, i) => `M ${x},186 C ${x + 14},300 ${x - 14},420 ${x},520 C ${x + 12},620 ${x - 10},760 ${x + (345 - x) * 0.25},862`);
      sin.forEach((d) => a.path(d, 'za-sinus', null, { 'data-info': 'za-sinus' }));
      a.path('M 320,186 L 320,690', 'za-artmed', null, { 'data-info': 'za-artmed' });
      // Veine centrale
      a.el('ellipse', { cx: 360, cy: 872, rx: 240, ry: 30, class: 'za-vein', 'data-info': 'za-cv' });
      a.path('M 600,872 L 650,872', 'za-vein-out', null, { 'data-info': 'za-cv' });
      // Flux
      const S = () => sim().s;
      sin.forEach((d) => a.flow(d, { mol: 'dot', style: 'fill: var(--o-aorta)', size: 0.8, speed: 70, track: false, max: 10, rate: () => 1.4 }));
      SX.forEach((x, i) => {
        const dC = `M ${x},320 C ${x - 14},420 ${x},520 ${x},520 C ${x + 12},620 ${x - 10},760 ${x + (345 - x) * 0.25},862`;
        a.flow(dC, { mol: 'cortisol', size: 1.1, speed: 60, track: false, max: 10, rate: () => 0.9 * clamp(S().cort, 0.05, 4), pace: () => HV.paceOf(S().cort) });
        if (i % 2 === 0) a.flow(`M ${x},222 C ${x + 14},300 ${x - 14},420 ${x},520`, { mol: 'aldo', size: 1, speed: 60, track: false, max: 5, rate: () => 0.35 });
        if (i % 2 === 1) a.flow(`M ${x},575 C ${x + 6},640 ${x - 6},760 ${x + (345 - x) * 0.25},862`, { mol: 'dhea', size: 1, speed: 60, track: false, max: 5, rate: () => 0.4 * clamp(S().acth, 0.1, 3) });
      });
      a.flow('M 590,872 L 650,872', { mol: 'cortisol', size: 1, speed: 50, track: false, max: 6, rate: () => 1.2 * clamp(S().cort, 0.05, 4) });
      a.flow('M 300,812 C 300,840 320,860 340,868', { mol: 'adre', size: 1.1, speed: 40, track: false, max: 6, rate: () => 0.6 + 0.6 * clamp(S().cort, 0, 2) });
      a.flow('M 470,812 C 470,840 440,860 420,868', { mol: 'nora', size: 1.1, speed: 40, track: false, max: 4, rate: () => 0.25 });
      // PNMT
      const pn = a.el('g', { 'data-info': 'za-pnmt' });
      a.el('rect', { x: 668, y: 736, width: 290, height: 60, rx: 30, class: 'enz' }, pn);
      t(813, 760, 'PNMT ⊕ cortisol', 'za-enz-t', { anchor: 'middle' }, pn);
      t(813, 784, 'noradrénaline → adrénaline', 'za-small', { anchor: 'middle' }, pn);
      a.path('M 596,690 C 610,730 630,760 664,766', 'ax-track stim', null, { style: '--mc: var(--p-gold)', 'data-info': 'za-pnmt', 'marker-end': 'url(#za-v-arr)' });
      // Sens centripète
      a.path('M 62,215 L 62,850', 'za-centri', null, { 'marker-end': 'url(#za-v-arr)' });
      t(50, 532, 'flux centripète', 'za-small', { anchor: 'middle', attrs: { transform: 'rotate(-90 50 532)' } });

      // Étiquettes des couches
      const LX = 668;
      [[188, 'Capsule', 'artères capsulaires (3 par glande)', 'za-caps'], [256, 'Zone glomérulée', 'aldostérone', 'za-zg'],
        [420, 'Zone fasciculée', ['cortisol', '75 à 80 % du cortex'], 'za-zf'], [606, 'Zone réticulée', 'DHEA, DHEA-S, androstènedione', 'za-zr'],
        [680, 'Médullaire', ['adrénaline 80–95 %', 'noradrénaline 10–20 %'], 'za-med'], [866, 'Veine centrale', '→ veine surrénale', 'za-cv']].forEach(([y, h, s, inf]) => {
        t(LX, y, h, 'lbl-s strong', { attrs: { 'data-info': inf } });
        t(LX, y + 24, s, 'note', { lh: 1.2 });
      });
      t(LX, 528, 'artériole médullaire', 'note', { attrs: { 'data-info': 'za-artmed' } });
      a.path(`M ${LX - 6},522 C 500,522 380,530 324,530`, 'connector');

      /* --- Drainage veineux (vue de face) --- */
      const RX = 1000;
      t(RX + 10, 196, 'Drainage veineux', 'lbl-h');
      t(RX + 10, 222, 'vue de face : la droite du patient est à gauche', 'note');
      const kid = (cx, cy, flip) => `M ${cx},${cy - 92} C ${cx + 70 * flip},${cy - 96} ${cx + 74 * flip},${cy + 92} ${cx},${cy + 96} C ${cx - 52 * flip},${cy + 98} ${cx - 36 * flip},${cy + 30} ${cx - 20 * flip},${cy + 10} C ${cx - 30 * flip},${cy - 20} ${cx - 54 * flip},${cy - 90} ${cx},${cy - 92} Z`;
      a.path(kid(1065, 500, -1), 'za-kidney', null, { 'data-info': 'kidney' });
      a.path(kid(1460, 520, 1), 'za-kidney', null, { 'data-info': 'kidney' });
      a.vessel('M 1310,280 L 1310,700', 26).setAttribute('data-info', 'za-aorta');
      const ivc = a.path('M 1200,280 L 1200,700', 'za-ivc', null, { 'data-info': 'za-ivc' });
      // Veines rénales
      a.path('M 1090,505 L 1186,505', 'za-vein-s', null, { 'data-info': 'za-ivc' });
      a.path('M 1430,520 C 1380,520 1340,505 1214,505', 'za-vein-s', null, { 'data-info': 'za-vsg' });
      // Surrénales
      a.path('M 1050,402 L 1098,312 L 1146,400 Z', 'za-adr', null, { 'data-info': 'za-adr-r' });
      a.path('M 1440,398 C 1400,380 1390,330 1418,300 C 1408,340 1430,372 1470,382 Z', 'za-adr', null, { 'data-info': 'za-adr-l' });
      // Veines surrénales
      a.path('M 1140,368 L 1186,360', 'za-vadr', null, { 'data-info': 'za-vsd' });
      a.path('M 1420,384 C 1402,420 1396,470 1392,512', 'za-vadr', null, { 'data-info': 'za-vsg' });
      // Cathéter (pointillés) depuis la VCI
      a.path('M 1206,690 L 1206,372 L 1150,368', 'za-cath', null, { 'data-info': 'za-kt' });
      a.path('M 1214,690 L 1214,512 C 1300,508 1380,516 1398,500 L 1414,400', 'za-cath', null, { 'data-info': 'za-kt' });
      // Libellés
      t(1040, 330, 'surrénale D', 'za-small', { anchor: 'end' });
      t(1500, 318, 'surrénale G', 'za-small', { anchor: 'middle' });
      t(1200, 728, 'VCI', 'lbl-s strong', { anchor: 'middle', attrs: { 'data-info': 'za-ivc' } });
      t(1310, 728, 'aorte', 'lbl-s strong', { anchor: 'middle', attrs: { 'data-info': 'za-aorta' } });
      t(1065, 640, 'rein D', 'note', { anchor: 'middle' });
      t(1460, 660, 'rein G', 'note', { anchor: 'middle' });
      t(1010, 256, 'veine surrénale D, courte → VCI', 'za-small strong', { attrs: { 'data-info': 'za-vsd' } });
      a.path('M 1120,262 C 1130,300 1150,340 1162,358', 'connector');
      t(1555, 256, 'veine surrénale G → veine rénale G', 'za-small strong', { anchor: 'end', attrs: { 'data-info': 'za-vsg' } });
      t(1555, 278, '(ou phrénique inférieure G)', 'za-small', { anchor: 'end', attrs: { 'data-info': 'za-vsg' } });
      a.path('M 1410,286 C 1440,330 1420,400 1404,440', 'connector');
      a.flow('M 1146,368 L 1186,360', { mol: 'cortisol', size: 0.9, speed: 30, track: false, max: 4, rate: () => 0.8 });
      a.flow('M 1420,390 C 1402,420 1396,470 1392,505 L 1220,505', { mol: 'cortisol', size: 0.9, speed: 50, track: false, max: 8, rate: () => 0.8 });
      // Encadré cathétérisme
      const kb = a.el('g', { 'data-info': 'za-kt' });
      a.el('rect', { x: RX, y: 770, width: 560, height: 190, rx: 16, class: 'side-box' }, kb);
      t(RX + 18, 800, 'Cathétérisme des veines surrénales', 'lbl-s strong', null, kb);
      const kt = a.text(RX + 18, 828, '', 'za-txt', null, kb);
      setLines(kt, RX + 18, wrap('Examen de référence pour latéraliser un hyperaldostéronisme primaire. Cortisol veine surrénale / VCI : prouve que le cathéter est bien en place. Rapport aldostérone/cortisol droite vs gauche : sécrétion unilatérale ou bilatérale. La veine droite, très courte, est la plus difficile à cathétériser (complément).', 64), 22);

      HV.spotlight(dV, a, [
        { t: 'Une coupe de la capsule au centre', d: NB('Sous la capsule : zone glomérulée (aldostérone), zone fasciculée (cortisol, 75 à 80 % du cortex), zone réticulée (androgènes), puis la médullaire (catécholamines).'), spot: [[X0 - 10, 186, X1 - X0 + 20, 750]] },
        { t: 'Le sang arrive par la capsule', d: NB('Trois artères par glande forment un plexus capsulaire. La surrénale a l\'un des débits sanguins par gramme les plus élevés de l\'organisme.'), spot: [[X0 - 60, 160, X1 - X0 + 80, 60]] },
        { t: 'Il descend vers le centre', d: NB('Les capillaires sinusoïdes traversent les trois zones et se chargent de leurs stéroïdes : flux centripète (complément).'), spot: [[X0 - 10, 290, X1 - X0 + 20, 380]] },
        { t: 'Le cortisol induit la PNMT', d: NB('La médullaire baigne dans un sang très riche en cortisol, qui augmente la tyrosine hydroxylase et la PNMT : l\'adrénaline représente 80 à 95 % des catécholamines sécrétées.'), spot: [[813, 766, 160], [600, 720, 60]] },
        { t: 'Veine centrale puis veine surrénale', d: NB('Une veine par glande : la droite, courte, rejoint directement la VCI ; la gauche rejoint la veine rénale gauche (ou la veine phrénique inférieure gauche).'), spot: [[360, 872, 150], [1240, 440, 260]] },
        { t: 'Conséquence pratique : le cathétérisme', d: NB('Pour latéraliser un hyperaldostéronisme primaire, on prélève dans les deux veines surrénales : le cortisol vérifie la sélectivité, le rapport aldostérone/cortisol compare les deux côtés.'), spot: [[RX - 10, 760, 580, 210]] }
      ]);
    }
  }, HV.LOUPE.L(1)));

  /* =====================================================================
     3. Incidentalome surrénalien
     ===================================================================== */
  Object.assign(HV.INFO, {
    'za-inc': { t: 'Incidentalome surrénalien', k: 'Lésion > 1 cm découverte fortuitement', d: 'Prévalence de 0,3 à 5,1 % en imagerie, 2 à 9 % dans les séries autopsiques ; environ 1 % à 30 ans et 10 % après 70 ans. Deux questions : est-il sécrétant ? est-il bénin ou malin ?' },
    'za-i-cort': { t: 'Hypercortisolisme', k: 'Freinage minute à la dexaméthasone (1 mg)', d: 'Aussi : cortisol libre urinaire des 24 h, cortisol salivaire à minuit. Complément : un cortisol ≤ 50 nmol/L (1,8 µg/dL) le matin après 1 mg de dexaméthasone à minuit exclut une sécrétion autonome de cortisol.' },
    'za-i-pheo': { t: 'Phéochromocytome', k: 'Métanéphrines et normétanéphrines', d: 'Plasmatiques ou urinaires des 24 h (rapportées à la créatininurie). Complément : les recommandations européennes de 2023 jugent ce dosage facultatif si la densité spontanée est ≤ 10 UH.' },
    'za-i-aldo': { t: 'Hyperaldostéronisme primaire', k: 'Rapport aldostérone/rénine', d: 'Le polycopié recommande de rechercher un HAP en cas d\'HTA avec incidentalome. Complément : les recommandations le réservent aux patients hypertendus ou hypokaliémiques.' },
    'za-i-andro': { t: 'Hyperandrogénie, hyperœstrogénie', k: 'Selon la clinique', d: 'SDHEA, testostérone totale, estradiol, SHBG. Un excès d\'androgènes ou d\'œstrogènes oriente vers un corticosurrénalome.' },
    'za-i-hu': { t: 'Densité spontanée', k: 'TDM sans injection, en unités Hounsfield', d: 'Reflète le contenu en graisse. < 10 UH : sensibilité 71 %, spécificité 98 % pour un adénome, donc une lésion bénigne.' },
    'za-i-wo': { t: 'Wash-out (lavage)', k: 'TDM avec injection : temps portal puis tardif (15 min, complément)', d: 'WOA = 100 × (portale − tardive) / (portale − spontanée). WOR = 100 × (portale − tardive) / portale. WOA > 60 % ou WOR > 40 % : évocateur de bénignité.' },
    'za-i-ind': { t: 'Lésion indéterminée', k: 'Ni graisse ni lavage rapide', d: 'L\'IRM a un faible niveau de preuve (alternative si le scanner est contre-indiqué). TEP-TDM au 18F-FDG discutée au cas par cas. Décision en réunion multidisciplinaire (complément).' },
    'za-i-size': { t: 'Taille', k: 'Risque de malignité', d: '> 6 cm : 25 % ; 4 à 6 cm : 6 % ; < 4 cm : < 2 %. Les adénomes cortisoliques mesurent généralement moins de 4 cm, les corticosurrénalomes souvent plus de 6 cm, hétérogènes et nécrotiques.' },
    'za-i-k': { t: 'Antécédent de cancer', k: '30 à 50 % de masses malignes', d: 'Le plus souvent des métastases : lymphome, cancer broncho-pulmonaire, cancers digestifs, rein, sein, mélanome.' }
  });

  const dI = HV.scene(Object.assign({
    id: 'incidentalome', parent: 'cortico', loupe: 'Incidentalome',
    title: 'Incidentalome surrénalien', level: 'Notion',
    lead: NB('Une masse surrénalienne de plus de 1 cm découverte par hasard pose deux questions : est-elle sécrétante (bilan hormonal systématique) ? est-elle bénigne ou maligne (scanner : densité spontanée, wash-out, taille) ? Faites varier les densités du calculateur pour voir le raisonnement.'),
    points: [
      'Bilan sécrétoire : freinage minute à la dexaméthasone (1 mg), métanéphrines, rapport aldostérone/rénine si HTA (ou hypokaliémie, complément), androgènes selon la clinique.',
      'Densité spontanée < 10 UH : adénome riche en lipides (Se 71 %, Sp 98 %).',
      'Sinon wash-out : WOA > 60 % ou WOR > 40 % évocateurs de bénignité.',
      'Taille : < 4 cm < 2 % de malignité, 4 à 6 cm 6 %, > 6 cm 25 %.',
      'Antécédent de cancer : 30 à 50 % de lésions malignes (métastases).',
      'Polycopié, partie 1 : p. 82 à 85 du PDF.'
    ].map(NB),
    legend: new Set(['cortisol', 'aldo', 'adre', 'dhea']),
    build(g, a) {
      a.frame('Incidentalome surrénalien', 'Est-il sécrétant ? Est-il bénin ou malin ?');
      const t = T(a);
      const defs = a.el('defs');
      marker(a, defs, 'za-i-arr');
      const box = (x, y, w, h, title, lines, info, cls, col) => {
        const gB = a.el('g', { class: 'za-dbox' + (cls ? ' ' + cls : ''), style: `--c: var(${col || '--line-2'})`, 'data-info': info });
        a.el('rect', { x, y, width: w, height: h, rx: 14 }, gB);
        t(x + 16, y + 28, title, 'za-dbox-h', null, gB);
        if (lines) a.text(x + 16, y + 54, lines.map(NB), 'za-small', { lh: 1.3 }, gB);
        return gB;
      };
      const arr = (d) => a.path(d, 'za-darr', null, { 'marker-end': 'url(#za-i-arr)' });

      box(60, 160, 930, 58, 'Masse surrénalienne > 1 cm découverte fortuitement', null, 'za-inc', 'root', '--accent');
      arr('M 280,218 L 280,252');
      arr('M 770,218 L 770,252');
      t(60, 278, '1. Est-il sécrétant ?', 'lbl-h');
      t(540, 278, '2. Est-il bénin ou malin ?', 'lbl-h');

      // Bilan sécrétoire (gauche)
      box(60, 298, 440, 118, 'Cortisol', ['Freinage minute (dexaméthasone 1 mg)', 'cortisol libre urinaire, salivaire à minuit', 'normal si ≤ 50 nmol/L après 1 mg (complément)'], 'za-i-cort', null, '--p-gold');
      box(60, 430, 440, 96, 'Catécholamines', ['Métanéphrines et normétanéphrines', 'plasmatiques ou urinaires des 24 h'], 'za-i-pheo', null, '--p-rose');
      box(60, 540, 440, 96, 'Aldostérone', ['Rapport aldostérone/rénine', 'si HTA ou hypokaliémie (complément)'], 'za-i-aldo', null, '--p-amber');
      box(60, 650, 440, 96, 'Androgènes, œstrogènes', ['SDHEA, testostérone, estradiol, SHBG', 'selon la clinique'], 'za-i-andro', null, '--p-sky');
      const kBox = box(60, 772, 440, 96, 'Antécédent de cancer ?', ['30 à 50 % des masses sont malignes,', 'surtout des métastases'], 'za-i-k', null, '--p-red');
      kBox.classList.add('warn');

      // Imagerie (droite)
      const nHU = box(540, 298, 450, 64, 'TDM sans injection : densité spontanée', null, 'za-i-hu', null, '--p-teal');
      arr('M 640,362 L 640,392');
      arr('M 890,362 L 890,392');
      const nLip = box(540, 394, 215, 120, '< 10 UH', ['adénome riche', 'en lipides : bénin', 'Se 71 %, Sp 98 %'], 'za-i-hu', null, '--good');
      const nInj = box(775, 394, 215, 120, '≥ 10 UH', ['TDM avec injection :', 'calcul du wash-out'], 'za-i-wo', null, '--warn');
      arr('M 830,514 L 680,546');
      arr('M 890,514 L 890,546');
      const nOk = box(540, 548, 215, 120, 'WOA > 60 %', ['ou WOR > 40 % :', 'adénome pauvre', 'en lipides, bénin'], 'za-i-wo', null, '--good');
      const nInd = box(775, 548, 215, 120, 'Indéterminé', ['IRM, TEP-FDG', 'au cas par cas,', 'avis spécialisé'], 'za-i-ind', null, '--bad');
      // Taille
      const sz = a.el('g', { 'data-info': 'za-i-size' });
      a.el('rect', { x: 540, y: 690, width: 450, height: 178, rx: 14, class: 'side-box' }, sz);
      t(556, 718, 'Taille et risque de malignité', 'za-dbox-h', null, sz);
      const SZ = [['< 4 cm', '< 2 %', 2], ['4 à 6 cm', '6 %', 6], ['> 6 cm', '25 %', 25]];
      const szRow = SZ.map(([l, v, p], i) => {
        const y = 748 + i * 38;
        const rg = a.el('g', { class: 'za-szrow' }, sz);
        t(556, y + 16, l, 'za-small', null, rg);
        a.el('rect', { x: 660, y: y + 2, width: 250, height: 18, rx: 9, class: 'lvl-bg' }, rg);
        a.el('rect', { x: 660, y: y + 2, width: Math.max(10, 250 * p / 25), height: 18, rx: 9, class: 'lvl-bar', style: '--mc: var(--bad)' }, rg);
        t(978, y + 16, v, 'za-small strong', { anchor: 'end' }, rg);
        return rg;
      });
      t(60, 950, 'Seuils et formules : polycopié. Seuil de freinage, réserve sur la rénine : complément.', 'note');

      /* --- Calculateur --- */
      const CX0 = 1040, CW = 520;
      a.el('rect', { x: CX0 - 14, y: 160, width: CW + 28, height: 808, rx: 18, class: 'side-box' });
      t(CX0 + 6, 196, 'Calculateur de wash-out', 'lbl-h');
      const st = { size: 2.5, u: 25, p: 90, d: 40 };
      const sls = [];
      const mk = (key, y, lbl, min, max, step, fmt, info) => sls.push(slider(a, CX0 + 16, y, CW - 32, { min, max, step, val: st[key], label: lbl, fmt, info, onChange: (v) => { st[key] = v; refresh(); } }));
      mk('size', 254, 'Taille (grand axe)', 1, 10, 0.5, (v) => fr(v, 1) + ' cm', 'za-i-size');
      mk('u', 330, 'Densité sans injection', -30, 60, 1, (v) => Math.round(v) + ' UH', 'za-i-hu');
      mk('p', 406, 'Densité au temps portal', -30, 200, 1, (v) => Math.round(v) + ' UH', 'za-i-wo');
      mk('d', 482, 'Densité tardive', -30, 200, 1, (v) => Math.round(v) + ' UH', 'za-i-wo');
      // Mini-graphe des trois temps
      const GX = CX0 + 80, GY = 540, GW = 400, GH = 190;
      const yv = (v) => GY + GH - ((v + 30) / 230) * GH;
      a.el('rect', { x: GX, y: GY, width: GW, height: GH, class: 'za-plot' });
      [0, 100, 200].forEach((v) => { a.path(`M ${GX},${yv(v)} L ${GX + GW},${yv(v)}`, 'za-grid'); t(GX - 10, yv(v) + 5, String(v), 'za-small', { anchor: 'end' }); });
      a.path(`M ${GX},${yv(10)} L ${GX + GW},${yv(10)}`, 'za-thr');
      t(GX + GW - 4, yv(10) - 6, '10 UH', 'za-small', { anchor: 'end' });
      t(GX - 10, GY - 12, 'UH', 'za-small', { anchor: 'end' });
      const PXs = [GX + 60, GX + 200, GX + 340];
      ['sans inj.', 'portal', 'tardif'].forEach((l, i) => t(PXs[i], GY + GH + 24, l, 'za-small', { anchor: 'middle' }));
      const curve = a.path('', 'za-curve');
      const dots = PXs.map(() => a.el('circle', { r: 8, class: 'za-dot' }));
      // Résultats
      const rW = a.text(CX0 + 16, 806, '', 'za-res');
      const rR = a.text(CX0 + 16, 836, '', 'za-res');
      const verdict = a.text(CX0 + 16, 872, '', 'za-verdict');
      const all = [nHU, nLip, nInj, nOk, nInd];

      function refresh() {
        const { size, u, p, d } = st;
        const pts = [u, p, d].map((v, i) => [PXs[i], yv(v)]);
        curve.setAttribute('d', 'M ' + pts.map((q) => q.join(',')).join(' L '));
        dots.forEach((c, i) => { c.setAttribute('cx', pts[i][0]); c.setAttribute('cy', pts[i][1]); });
        const woa = p - u > 0 ? (100 * (p - d)) / (p - u) : null;
        const wor = p > 0 ? (100 * (p - d)) / p : null;
        rW.textContent = NB('WOA = 100 × (P − T) / (P − S) = ' + (woa == null ? 'non calculable' : fr(woa, 0) + ' %'));
        rR.textContent = NB('WOR = 100 × (P − T) / P = ' + (wor == null ? 'non calculable' : fr(wor, 0) + ' %'));
        let v, hit, tone;
        if (u < 10) { v = ['Densité < 10 UH : adénome riche en lipides,', 'bénin ; le wash-out n\'est pas nécessaire.']; hit = [nHU, nLip]; tone = 'good'; } else if (woa == null) { v = ['Pas de rehaussement au temps portal :', 'wash-out non calculable.']; hit = [nHU, nInj, nInd]; tone = 'bad'; } else if (woa > 60 || (wor != null && wor > 40)) { v = ['Wash-out rapide : évocateur d\'un adénome', 'pauvre en lipides (bénin).']; hit = [nHU, nInj, nOk]; tone = 'good'; } else { v = ['Lavage insuffisant : lésion indéterminée,', 'avis spécialisé (IRM, TEP-FDG).']; hit = [nHU, nInj, nInd]; tone = 'bad'; }
        if (size > 4) { v = v.concat(['Taille > 4 cm : risque de malignité accru', '(' + (size > 6 ? '25 %' : '6 %') + ') : avis spécialisé.']); if (tone === 'good') tone = 'warn'; }
        setLines(verdict, CX0 + 16, v.map(NB), 26);
        verdict.setAttribute('class', 'za-verdict ' + tone);
        all.forEach((n) => n.classList.toggle('hit', hit.indexOf(n) >= 0));
        szRow.forEach((r, i) => r.classList.toggle('hit', (i === 0 && size < 4) || (i === 1 && size >= 4 && size <= 6) || (i === 2 && size > 6)));
      }
      refresh();
      // Scénarios rapides
      const PRE = [['Adénome', { size: 2.5, u: 4, p: 70, d: 30 }], ['Pauvre en lipides', { size: 2.5, u: 25, p: 90, d: 40 }], ['Suspect', { size: 7, u: 38, p: 95, d: 80 }]];
      PRE.forEach(([l, v], i) => button(a, CX0 + i * 176, 920, 166, 38, l, () => { Object.assign(st, v); sls[0].set(v.size); sls[1].set(v.u); sls[2].set(v.p); sls[3].set(v.d); }, 'za-i-wo'));
    }
  }, HV.LOUPE.L(2)));

  /* =====================================================================
     4. Cellule principale du tube collecteur
     ===================================================================== */
  Object.assign(HV.INFO, {
    'za-pc': { t: 'Cellule principale', k: 'Tube contourné distal et canal collecteur', d: 'Cible de l\'aldostérone : réabsorbe le sodium (ENaC) et sécrète le potassium (ROMK).' },
    'za-mr': { t: 'Récepteur minéralocorticoïde (MR)', k: 'Récepteur nucléaire', d: 'Lié à l\'aldostérone, il gagne le noyau et active la transcription de gènes cibles (SGK1, sous-unités d\'ENaC, Na⁺/K⁺-ATPase ; complément). Il a la même affinité pour le cortisol que pour l\'aldostérone (complément) : d\'où le rôle protecteur de la 11β-HSD2. Bloqué par la spironolactone et l\'éplérénone.' },
    'za-enac': { t: 'ENaC', k: 'Canal sodique épithélial · pôle apical', d: 'Le sodium de l\'urine entre dans la cellule par ENaC : la lumière devient électronégative, ce qui favorise la sécrétion de K⁺ et de H⁺. Bloqué par l\'amiloride (diurétique épargneur de potassium, complément).' },
    'za-romk': { t: 'ROMK', k: 'Canal potassique apical (complément)', d: 'Le potassium accumulé par la pompe sort vers l\'urine : kaliurèse. Dans l\'hyperaldostéronisme, cette perte urinaire explique l\'hypokaliémie avec kaliurèse conservée.' },
    'za-pump': { t: 'Na⁺/K⁺-ATPase', k: 'Pôle basolatéral', d: 'Fait sortir 3 Na⁺ vers le sang et entrer 2 K⁺ dans la cellule, en consommant de l\'ATP : moteur de la réabsorption du sodium.' },
    'za-hsd2': { t: '11β-HSD2', k: '11β-hydroxystéroïde déshydrogénase de type 2 (complément)', d: 'Inactive le cortisol en cortisone, qui ne se lie pas au MR : le récepteur reste réservé à l\'aldostérone, pourtant 100 à 1 000 fois moins concentrée que le cortisol. La glycyrrhizine de la réglisse l\'inhibe : syndrome d\'excès apparent de minéralocorticoïdes.' },
    'za-cortisone': { t: 'Cortisone', k: 'Forme inactive (complément)', d: 'Produite par la 11β-HSD2 ; ne se lie pas au MR. Réactivée en cortisol par la 11β-HSD1 dans le foie et le tissu adipeux.' },
    'za-ic': { t: 'Cellule intercalaire de type A', k: 'Sécrétion d\'ions H⁺ (complément)', d: 'Une H⁺-ATPase apicale sécrète les ions H⁺ ; le bicarbonate repart vers le sang. L\'aldostérone stimule cette sécrétion : l\'hyperaldostéronisme tend vers l\'alcalose métabolique.' },
    'za-h': { t: 'Ion H⁺', k: 'Sécrété dans l\'urine', d: 'Sa perte urinaire, accrue par l\'aldostérone, explique la tendance à l\'alcalose métabolique de l\'hyperaldostéronisme.' },
    'za-hco3': { t: 'Bicarbonate (HCO₃⁻)', k: 'Retourne vers le sang (complément)', d: 'Généré avec chaque H⁺ sécrété ; réabsorbé vers le sang, il alcalinise le plasma.' },
    'za-lumen': { t: 'Lumière tubulaire', k: 'Urine', d: 'Le sodium y est réabsorbé, le potassium et les ions H⁺ y sont sécrétés.' },
    'za-blood': { t: 'Capillaire péritubulaire', k: 'Sang', d: 'Apporte l\'aldostérone et le cortisol ; reçoit le sodium réabsorbé.' },
    'za-tj': { t: 'Jonction serrée', k: 'Étanchéité de l\'épithélium (complément)', d: 'Permet de maintenir les gradients entre urine et sang.' },
    'za-t-lic': { t: 'Réglisse (glycyrrhizine)', k: 'Inhibe la 11β-HSD2 (complément)', d: 'Le cortisol n\'est plus inactivé et occupe le MR : HTA, hypokaliémie, alcalose avec rénine et aldostérone basses (« excès apparent de minéralocorticoïdes »).' },
    'za-t-mr': { t: 'Spironolactone, éplérénone', k: 'Antagonistes du MR (complément)', d: 'Natriurèse et épargne potassique : traitement de l\'hyperaldostéronisme bilatéral. Risque d\'hyperkaliémie ; la spironolactone est aussi anti-androgène (gynécomastie), l\'éplérénone plus sélective.' },
    'za-t-ami': { t: 'Amiloride', k: 'Bloqueur d\'ENaC (complément)', d: 'Diurétique épargneur de potassium : moins de Na⁺ réabsorbé, moins de K⁺ et de H⁺ sécrétés, quelle que soit l\'aldostérone. Efficace aussi dans le syndrome de Liddle (ENaC hyperactif).' }
  });

  const dP = HV.scene(Object.assign({
    id: 'principal-cell', parent: 'raa', loupe: 'Cellule principale',
    title: 'Cellule principale du tube collecteur', level: 'Cellule',
    lead: NB('L\'aldostérone se fixe sur le récepteur minéralocorticoïde des cellules principales du tubule distal et du canal collecteur : le sodium est réabsorbé par ENaC en échange du potassium et des ions H⁺, sécrétés dans les urines. La 11β-HSD2 protège le récepteur du cortisol. Le débit des ions suit l\'aldostérone du modèle : essayez le scénario « hyperaldostéronisme primaire ».'),
    points: [
      'Aldostérone → MR → réabsorption de Na⁺ par ENaC, sécrétion de K⁺ et de H⁺.',
      'Hyperaldostéronisme : expansion volémique et HTA, hypokaliémie (2/3 des cas) avec kaliurèse conservée, tendance à l\'alcalose métabolique, rénine freinée ; pas d\'œdème.',
      '11β-HSD2 : cortisol → cortisone ; inhibée par la réglisse (excès apparent de minéralocorticoïdes, complément).',
      'Spironolactone, éplérénone (MR) ; amiloride (ENaC) : épargneurs de potassium (complément).',
      'Polycopié, partie 1 : p. 72 et 75 du PDF, figure 29.'
    ].map(NB),
    legend: new Set(['aldo', 'cortisol', 'nai', 'k']),
    build(g, a) {
      a.frame('Cellule principale', 'Tube collecteur · action de l\'aldostérone');
      const t = T(a);
      const sim = () => HV.scenes.raa.sim;
      dP.sim = HV.scenes.raa.sim;
      // Le modèle est avancé par la scène de l'axe ; quand celle-ci est masquée (on est dans la loupe), on l'avance ici.
      a.dyn((dt) => { if (!(HV.scenes.raa._op > 0)) sim().step(dt); });
      HV.figBadge(a, 1535, 78, ['29']);
      const defs = a.el('defs');
      marker(a, defs, 'za-p-arr');
      // Glyphes locaux : H⁺ et HCO₃⁻
      const gh = a.el('g', { id: 'mol-za-h' }, defs);
      a.el('circle', { r: 11, class: 'za-hglyph' }, gh);
      a.text(0, 5, 'H⁺', 'za-hglyph-t', { anchor: 'middle' }, gh);
      const gb = a.el('g', { id: 'mol-za-hco3' }, defs);
      a.el('rect', { x: -22, y: -10, width: 44, height: 20, rx: 10, class: 'za-bglyph' }, gb);
      a.text(0, 5, 'HCO₃⁻', 'za-bglyph-t', { anchor: 'middle' }, gb);

      // Compartiments
      a.el('rect', { x: 40, y: 160, width: 1100, height: 122, rx: 18, class: 'za-lumen', 'data-info': 'za-lumen' });
      t(60, 194, 'Lumière tubulaire (urine)', 'lbl-s strong');
      t(930, 194, 'lumière électronégative (−)', 'za-small', { anchor: 'end', attrs: { 'data-info': 'za-enac' } });
      a.el('rect', { x: 40, y: 800, width: 1100, height: 168, rx: 18, class: 'za-blood', 'data-info': 'za-blood' });
      t(60, 950, 'Sang (capillaire péritubulaire)', 'lbl-s strong');
      a.vessel('M 70,880 L 1110,880', 30).setAttribute('data-info', 'za-blood');

      // Cellule principale
      const pc = a.el('rect', { x: 70, y: 290, width: 740, height: 500, rx: 40, class: 'bcell', 'data-info': 'za-pc' });
      t(300, 334, 'cellule principale', 'za-cell-t');
      const ic = a.el('rect', { x: 836, y: 290, width: 290, height: 500, rx: 40, class: 'bcell za-ic', 'data-info': 'za-ic' });
      t(852, 334, ['cellule', 'intercalaire A'], 'za-cell-t', { lh: 1.2 });
      a.el('rect', { x: 812, y: 286, width: 22, height: 26, rx: 4, class: 'za-tj', 'data-info': 'za-tj' });
      // Noyau
      a.el('ellipse', { cx: 420, cy: 540, rx: 120, ry: 72, class: 'bcell-n', 'data-info': 'za-mr' });
      t(420, 532, 'noyau', 'za-small', { anchor: 'middle' });
      t(420, 556, 'transcription ↑', 'za-small strong', { anchor: 'middle' });

      // Canaux
      const chan = (x, y, lbl, info, horiz) => {
        const cg = a.el('g', { 'data-info': info, transform: `translate(${x} ${y})` });
        if (horiz) a.el('rect', { x: -30, y: -14, width: 60, height: 28, rx: 8, class: 'chan' }, cg);
        else a.el('rect', { x: -15, y: -28, width: 30, height: 56, rx: 8, class: 'chan' }, cg);
        const pore = a.el('rect', horiz ? { x: -30, y: -4, width: 60, height: 8, class: 'chan-pore' } : { x: -4, y: -28, width: 8, height: 56, class: 'chan-pore' }, cg);
        const cross = a.el('path', { d: 'M -22,-22 L 22,22 M 22,-22 L -22,22', class: 'za-xmark', visibility: 'hidden' }, cg);
        return { cg, pore, cross };
      };
      const enac = chan(220, 290, 'ENaC', 'za-enac');
      t(250, 262, 'ENaC', 'chan-t', { attrs: { 'data-info': 'za-enac' } });
      const romk = chan(600, 290, 'ROMK', 'za-romk');
      t(630, 262, 'ROMK', 'chan-t', { attrs: { 'data-info': 'za-romk' } });
      const hpump = chan(981, 290, '', 'za-ic');
      t(1011, 262, 'H⁺-ATPase', 'chan-t', { attrs: { 'data-info': 'za-ic' } });
      // Pompe Na/K basolatérale
      const pump = a.el('g', { 'data-info': 'za-pump', transform: 'translate(430 790)' });
      a.el('circle', { r: 30, class: 'za-pump' }, pump);
      a.text(0, 6, 'ATP', 'za-enz-t', { anchor: 'middle' }, pump);
      t(470, 760, '3 Na⁺ / 2 K⁺', 'za-small strong', { attrs: { 'data-info': 'za-pump' } });
      // 11β-HSD2
      const hsd = a.el('g', { 'data-info': 'za-hsd2' });
      a.el('rect', { x: 96, y: 610, width: 150, height: 44, rx: 22, class: 'enz' }, hsd);
      a.text(171, 638, '11β-HSD2', 'za-enz-t', { anchor: 'middle' }, hsd);
      const hsdX = a.el('path', { d: 'M 150,612 L 192,652 M 192,612 L 150,652', class: 'za-xmark', visibility: 'hidden' });
      t(96, 590, 'cortisol → cortisone', 'za-small');
      // MR
      const mr = a.el('g', { 'data-info': 'za-mr', transform: 'translate(680 620)' });
      a.el('path', { d: 'M -18,24 L -18,-6 C -18,-24 18,-24 18,-6 L 18,24', class: 'za-mr' }, mr);
      a.el('circle', { cx: 0, cy: -6, r: 9, class: 'za-mr-site' }, mr);
      a.text(36, 8, 'MR', 'chan-t', null, mr);
      const mrX = a.el('path', { d: 'M -24,-24 L 24,24 M 24,-24 L -24,24', class: 'za-xmark', visibility: 'hidden' }, mr);
      a.path('M 660,598 C 620,570 580,556 546,550', 'ax-track stim', null, { style: '--mc: var(--p-amber)', 'marker-end': 'url(#za-p-arr)', 'data-info': 'za-mr' });
      // Effets génomiques
      const gen = a.el('g', { class: 'za-gen' });
      a.path('M 360,474 C 320,420 260,380 228,326', 'ax-track stim', gen, { style: '--mc: var(--p-amber)', 'data-info': 'za-mr' });
      a.path('M 480,474 C 530,420 580,380 596,326', 'ax-track stim', gen, { style: '--mc: var(--p-amber)', 'data-info': 'za-mr' });
      a.path('M 420,612 L 428,752', 'ax-track stim', gen, { style: '--mc: var(--p-amber)', 'data-info': 'za-mr' });
      const sgn = [a.sign(282, 392, 'stim'), a.sign(548, 392, 'stim'), a.sign(424, 690, 'stim')];

      // Flux d'ions et d'hormones
      const st = { lic: false, amr: false, ami: false };
      const A = () => clamp(sim().s.aldo, 0.03, 8);
      const drive = () => (st.amr ? 0.12 : A() + (st.lic ? 3 : 0));
      const enacOpen = () => (st.ami ? 0.06 : drive());
      const pace = (f) => () => HV.paceOf(f());
      a.flow('M 220,180 L 220,330 C 220,430 280,640 410,766 L 410,920', { mol: 'nai', size: 2, speed: 75, track: false, max: 30, rate: () => 1.3 * enacOpen(), pace: pace(enacOpen) });
      a.flow('M 470,920 L 450,770 C 480,690 600,560 600,420 L 600,176', { mol: 'k', size: 2, speed: 75, track: false, max: 30, rate: () => 1.1 * enacOpen(), pace: pace(enacOpen) });
      a.flow('M 981,520 L 981,176', { mol: 'za-h', info: 'za-h', size: 1.1, speed: 60, track: false, max: 16, rate: () => 0.9 * (st.ami ? 0.4 : 1) * drive() });
      a.flow('M 981,560 L 981,900', { mol: 'za-hco3', info: 'za-hco3', size: 1, speed: 60, track: false, max: 12, rate: () => 0.6 * drive() });
      a.flow('M 730,900 C 730,780 700,700 684,640', { mol: 'aldo', size: 1.3, speed: 60, track: false, max: 16, rate: () => 0.8 * A(), pace: pace(A) });
      a.flow('M 150,900 C 150,780 160,700 165,656', { mol: 'cortisol', size: 1.2, speed: 60, track: false, max: 12, rate: () => 1.4 });
      a.flow('M 200,656 C 220,720 250,800 270,900', { mol: 'cortisol', info: 'za-cortisone', style: 'filter: grayscale(1) brightness(0.75)', size: 1.1, speed: 60, track: false, max: 12, rate: () => (st.lic ? 0.1 : 1.3) });
      a.flow('M 246,620 C 380,640 560,700 664,628', { mol: 'cortisol', size: 1.2, speed: 70, track: false, max: 12, rate: () => (st.lic ? 1.6 : 0) });
      t(748, 840, 'aldostérone', 'za-small');
      t(136, 840, 'cortisol', 'za-small', { anchor: 'end' });
      t(284, 840, 'cortisone', 'za-small');

      /* --- Panneau droit --- */
      const PX = 1170, PW = 390;
      t(PX, 196, 'Modifier la cellule', 'lbl-h');
      const tg = {};
      [['lic', 'Réglisse', 'za-t-lic'], ['amr', 'Spironolactone, éplérénone', 'za-t-mr'], ['ami', 'Amiloride', 'za-t-ami']].forEach(([k, l, inf], i) => {
        tg[k] = button(a, PX, 214 + i * 52, PW, 42, l, () => { st[k] = !st[k]; tg[k].classList.toggle('on', st[k]); upd(); }, inf);
      });
      const sb = a.el('g', { 'data-info': 'za-pc' });
      a.el('rect', { x: PX, y: 384, width: PW, height: 158, rx: 16, class: 'side-box' }, sb);
      t(PX + 16, 412, 'Bilan simulé (SRAA)', 'lbl-s strong', null, sb);
      const L1 = a.text(PX + 16, 442, '', 'za-small', null, sb);
      const L2 = a.text(PX + 16, 470, '', 'za-small', null, sb);
      const L3 = a.text(PX + 16, 498, '', 'za-small', null, sb);
      const L4 = a.text(PX + 16, 526, '', 'za-small', null, sb);
      t(PX, 576, 'Lecture', 'lbl-s strong');
      const msg = a.text(PX, 606, '', 'za-txt');

      let tick = 0, lastMsg = '';
      function upd() {
        enac.cross.setAttribute('visibility', st.ami ? 'visible' : 'hidden');
        mrX.setAttribute('visibility', st.amr ? 'visible' : 'hidden');
        hsdX.setAttribute('visibility', st.lic ? 'visible' : 'hidden');
        tick = 0;
      }
      a.dyn((dt) => {
        const dv = drive();
        sgn.forEach((s) => s.set(Math.min(2.5, dv)));
        enac.pore.setAttribute('opacity', (0.15 + 0.85 * Math.min(1, enacOpen() / 2)).toFixed(2));
        romk.pore.setAttribute('opacity', (0.15 + 0.85 * Math.min(1, enacOpen() / 2)).toFixed(2));
        tick -= dt;
        if (tick > 0) return;
        tick = 0.4;
        const S = sim();
        const lab = (k, d) => fr(S.lab(k), d);
        L1.textContent = NB('Aldostérone : ' + lab('aldo', 0) + ' pmol/L · rénine : ' + lab('renin', 1) + ' mUI/L');
        L2.textContent = NB('Kaliémie : ' + lab('k', 1) + ' mmol/L · natrémie : ' + lab('na', 0) + ' mmol/L');
        L3.textContent = NB('PA systolique : ' + lab('pas', 0) + ' mmHg');
        L4.textContent = NB('MR activé : ' + (dv > 2 ? 'fortement' : dv > 0.5 ? 'normalement' : 'peu') + (st.lic || st.amr || st.ami ? ' (traitement : cellule seule)' : ''));
        let m;
        if (st.amr) m = 'Antagoniste du MR : moins de Na⁺ réabsorbé, moins de K⁺ et de H⁺ sécrétés : natriurèse et épargne potassique, risque d\'hyperkaliémie. Traitement médical de l\'hyperaldostéronisme bilatéral (complément).';
        else if (st.lic && !st.ami) m = 'Réglisse : la 11β-HSD2 est inhibée, le cortisol (bien plus abondant que l\'aldostérone) occupe le MR. Excès apparent de minéralocorticoïdes : HTA, hypokaliémie, alcalose, mais rénine et aldostérone basses (complément).';
        else if (st.ami) m = 'Amiloride : ENaC fermé, le Na⁺ n\'entre plus ; la lumière n\'est plus électronégative, le K⁺ et les H⁺ ne sont plus sécrétés. Diurétique épargneur de potassium, actif même si l\'aldostérone est élevée (complément).';
        else if (S.s.aldo > 2) m = 'Hyperaldostéronisme : la réabsorption de Na⁺ augmente (expansion volémique, HTA, rénine freinée) ; le K⁺ et les H⁺ sont sécrétés dans l\'urine : hypokaliémie avec kaliurèse conservée, tendance à l\'alcalose métabolique. Pas d\'œdème.';
        else if (S.s.aldo < 0.4) m = 'Déficit en aldostérone : le Na⁺ est perdu dans l\'urine, le K⁺ et les H⁺ sont retenus : hypotension, tendance à l\'hyponatrémie, à l\'hyperkaliémie et à l\'acidose.';
        else m = 'Aldostérone adaptée : le MR règle la réabsorption de sodium (volémie, pression artérielle) et la sécrétion de potassium. Choisissez « Hyperaldostéronisme primaire » dans le panneau, ou testez réglisse et diurétiques.';
        if (m !== lastMsg) { lastMsg = m; setLines(msg, PX, wrap(m, 44), 23); }
      });
      upd();

      HV.spotlight(dP, a, [
        { t: 'Deux pôles : urine et sang', d: NB('En haut, la lumière du tube collecteur (urine) ; en bas, le sang. La cellule principale réabsorbe le sodium et sécrète le potassium ; la cellule intercalaire sécrète les ions H⁺.'), spot: [[40, 160, 1100, 122], [40, 800, 1100, 168]] },
        { t: 'L\'aldostérone gagne son récepteur', d: NB('Venue du sang, l\'aldostérone diffuse dans la cellule et se fixe sur le récepteur minéralocorticoïde (MR), qui migre dans le noyau.'), spot: [[700, 700, 150], [520, 560, 120]] },
        { t: 'Transcription de nouveaux transporteurs', d: NB('Le complexe aldostérone-MR augmente l\'expression et l\'activité d\'ENaC, de ROMK et de la Na⁺/K⁺-ATPase (complément pour le détail moléculaire).'), spot: [[420, 540, 150], [282, 392, 60], [548, 392, 60]] },
        { t: 'Le sodium est réabsorbé', d: NB('Le Na⁺ de l\'urine entre par ENaC puis repart vers le sang grâce à la Na⁺/K⁺-ATPase basolatérale (3 Na⁺ sortis pour 2 K⁺ entrés). L\'eau suit : expansion volémique.'), spot: [[220, 300, 110], [430, 790, 90]] },
        { t: 'Le potassium et les H⁺ sont sécrétés', d: NB('La lumière devenue électronégative attire le K⁺, qui sort par ROMK, et les ions H⁺ sécrétés par la cellule intercalaire : kaliurèse et acidification de l\'urine.'), spot: [[600, 300, 110], [981, 290, 130]] },
        { t: 'La 11β-HSD2 protège le récepteur', d: NB('Le cortisol, bien plus concentré que l\'aldostérone, se lie aussi au MR. La 11β-HSD2 le transforme en cortisone inactive. La réglisse l\'inhibe : excès apparent de minéralocorticoïdes (complément).'), spot: [[171, 632, 120]] },
        { t: 'Hyperaldostéronisme primaire', d: NB('Trop d\'aldostérone : HTA par expansion volémique, hypokaliémie (2/3 des cas) avec kaliurèse conservée, tendance à l\'alcalose, rénine freinée. Choisissez le scénario dans le panneau pour voir les flux s\'accélérer.'), spot: [[PX - 10, 374, PW + 20, 590]] }
      ]);
    }
  }, HV.LOUPE.R(0)));

  // Typographie française des fiches de survol ajoutées ici.
  Object.keys(HV.INFO).filter((k) => k.indexOf('za-') === 0).forEach((k) => {
    const o = HV.INFO[k];
    ['t', 'k', 'd'].forEach((f) => { if (typeof o[f] === 'string') o[f] = NB(o[f]); });
  });
})();
