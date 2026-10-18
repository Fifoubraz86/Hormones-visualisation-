/* Loupes de l'axe phosphocalcique : vitamine D (de la peau au rein), FGF23 – klotho – phosphate, remodelage osseux.
   Sources : polycopié CEEDMM, partie 1, p. 35–46 (pages du PDF) ; le reste est marqué « (complément) ». */
(function () {
  'use strict';
  const HV = window.HV;
  const clamp = HV.clamp;
  const fr = (v, d) => v.toFixed(d).replace('.', ',');
  const lerp = (a, b, k) => a + (b - a) * k;

  /* ---------- Outils communs ---------- */
  let defsDone = false;
  function zpDefs(a) {
    if (defsDone) return;
    defsDone = true;
    const defs = a.el('defs');
    const m = a.el('marker', { id: 'zp-head', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs);
    a.el('path', { d: 'M0,0 L10,5 L0,10 Z', class: 'zp-head' }, m);
    let g = a.el('g', { id: 'mol-zp-d3' }, defs);
    a.el('circle', { r: 6, class: 'zp-g-d3' }, g);
    g = a.el('g', { id: 'mol-zp-25d' }, defs);
    a.el('circle', { r: 7, class: 'zp-g-25d' }, g);
    a.el('circle', { cx: -2, cy: -2, r: 2, fill: '#fff', 'fill-opacity': 0.6 }, g);
    g = a.el('g', { id: 'mol-zp-fgf' }, defs);
    a.el('path', { d: 'M -9,-5 Q 0,-10 9,-5 Q 12,0 9,5 Q 0,10 -9,5 Q -12,0 -9,-5 Z', class: 'zp-g-fgf' }, g);
    g = a.el('g', { id: 'mol-zp-pi' }, defs);
    [[0, -6], [5.5, 3], [-5.5, 3], [0, 0]].forEach(([x, y], i) => a.el('circle', { cx: x, cy: y, r: i === 3 ? 4.2 : 2.6, class: 'zp-g-pi' }, g));
    g = a.el('g', { id: 'mol-zp-scl' }, defs);
    a.el('path', { d: 'M -7,-6 L 7,-6 L 9,0 L 7,6 L -7,6 L -9,0 Z', class: 'zp-g-scl' }, g);
  }
  // Boutons SVG (le clic n'agit que dans la scène courante ; ailleurs il fait entrer dans la scène).
  function buttons(def, a, x, y, labels, onPick, o) {
    o = o || {};
    const h = o.h || 40, gap = o.gap || 10;
    const g = a.el('g', { transform: `translate(${x} ${y})` });
    const items = [];
    let cx = 0, cy = 0;
    labels.forEach((L, i) => {
      const w = o.w || Math.round(L.length * 8.9 + 32);
      const b = a.el('g', { class: 'zp-btn', transform: `translate(${cx} ${cy})` }, g);
      a.el('rect', { x: 0, y: 0, width: w, height: h, rx: h / 2 }, b);
      a.text(w / 2, h / 2 + 6, L, 'zp-btn-t', { anchor: 'middle' }, b);
      b.addEventListener('pointerdown', (e) => {
        if (HV.app && HV.app.current !== def) return;
        e.stopPropagation();
        pick(i);
      });
      items.push(b);
      if (o.vertical) cy += h + gap; else cx += w + gap;
    });
    function pick(i) {
      items.forEach((b, k) => b.classList.toggle('on', k === i));
      onPick(i);
    }
    return { pick };
  }
  const arrow = (a, d, parent) => a.path(d, 'zp-arrow', parent);
  const panel = (a, x, y, w, h, info) => a.el('rect', { x, y, width: w, height: h, rx: 22, class: 'zp-panel', 'data-info': info || null });
  // Barre de niveau : renvoie une fonction set(fraction 0–1).
  function gauge(a, x, y, w, color) {
    a.el('rect', { x, y, width: w, height: 12, rx: 6, class: 'lvl-bg' });
    const bar = a.el('rect', { x, y, width: 10, height: 12, rx: 6, class: 'lvl-bar', style: `--mc: var(--${color})` });
    return (f) => bar.setAttribute('width', (6 + (w - 6) * clamp(f, 0, 1)).toFixed(1));
  }

  /* =====================================================================
     1. Vitamine D : de la peau au rein
     ===================================================================== */
  Object.assign(HV.INFO, {
    'zp-d3': { t: 'Vitamine D3 (cholécalciférol)', k: 'Précurseur inactif (complément)', d: 'Formée dans la peau sous l\'effet des UVB, ou apportée par l\'alimentation. Gagne le foie, transportée dans le sang par la DBP.' },
    'zp-25d': { t: '25-hydroxyvitamine D (calcidiol)', k: 'Forme de réserve circulante (complément)', d: 'Produite par le foie. C\'est la forme que l\'on dose pour juger du statut en vitamine D. Elle est convertie par le rein (1α-hydroxylation) en forme active (polycopié p. 37).' },
    'zp-skin': { t: 'Synthèse cutanée', k: 'UVB → prévitamine D3 → vitamine D3 (complément)', d: 'Dans l\'épiderme, les UVB transforment le 7-déhydrocholestérol en prévitamine D3, qui s\'isomérise à la chaleur du corps en cholécalciférol (vitamine D3). Faible en hiver, chez le sujet âgé, à peau foncée ou couverte.' },
    'zp-diet': { t: 'Apports alimentaires', k: 'Vitamines D2 et D3 (complément)', d: 'D2 (ergocalciférol) d\'origine végétale et fongique, D3 (cholécalciférol) d\'origine animale (poissons gras, œufs). Liposolubles : absorbées avec les graisses, d\'où le risque de carence dans les malabsorptions.' },
    'zp-liver': { t: 'Foie : 25-hydroxylation', k: '25-hydroxylase (complément)', d: 'Transforme la vitamine D en 25-hydroxyvitamine D (calcidiol), peu régulée : son taux reflète les apports et la synthèse cutanée. C\'est la forme de réserve, celle que l\'on dose.' },
    'zp-dbp': { t: 'DBP (vitamin D binding protein)', k: 'Protéine porteuse plasmatique (complément)', d: 'Transporte la vitamine D et ses métabolites dans le sang (25-OH-D, calcitriol).' },
    'zp-1a': { t: 'Rein : 1α-hydroxylation', k: 'Tube contourné proximal (polycopié p. 37)', d: 'La 1α-hydroxylase transforme la 25-OH-D en 1,25-dihydroxyvitamine D (calcitriol), la forme active. Stimulée par la PTH (polycopié p. 37–38) et par l\'hypophosphatémie ; freinée par le FGF23 et par le calcitriol lui-même (complément).' },
    'zp-24': { t: '24-hydroxylase', k: 'Voie d\'inactivation (complément)', d: 'Transforme la 25-OH-D et le calcitriol en dérivés 24-hydroxylés inactifs. Induite par le calcitriol (rétrocontrôle) et par le FGF23.' },
    'zp-gut': { t: 'Intestin grêle', k: 'Absorption active du calcium (polycopié p. 36, 38)', d: 'Seuls 30 à 35 % du calcium alimentaire sont absorbés, par voie paracellulaire passive et par voie transcellulaire active ; la voie active est stimulée par la 1,25-dihydroxyvitamine D. Le calcitriol augmente aussi l\'absorption du phosphate (complément).' },
    'zp-bone-t': { t: 'Os', k: 'Minéralisation (complément)', d: 'En apportant calcium et phosphate, le calcitriol permet la minéralisation de l\'os : sa carence donne le rachitisme chez l\'enfant et l\'ostéomalacie chez l\'adulte (complément).' },
    'zp-para-t': { t: 'Parathyroïdes', k: 'Rétrocontrôle (complément)', d: 'Le calcitriol freine la synthèse de PTH. En carence en vitamine D, ce frein et l\'absorption du calcium diminuent : hyperparathyroïdie secondaire.' },
    'zp-kid-t': { t: 'Rein (tube distal)', k: 'Polycopié p. 38', d: 'La 1,25-dihydroxyvitamine D stimule la réabsorption rénale de calcium au niveau du tube contourné distal.' },
    'zp-model': { t: 'Valeurs du modèle', k: 'Simulation pédagogique de l\'axe', d: 'Le réglage « Statut en vitamine D » du panneau (ou le scénario « Carence en vitamine D ») fixe la réserve en 25-OH-D du modèle ; la PTH et le calcitriol en découlent. Les chiffres sont illustratifs.' },
    'zp-sunbtn': { t: 'Ensoleillement', k: 'Illustration locale', d: 'Ce réglage ne change que le débit de synthèse cutanée dessiné ici ; la réserve du modèle se règle dans le panneau.' }
  });

  const vitd = HV.scene(Object.assign({
    id: 'vitd', parent: 'phospho', loupe: 'Vitamine D',
    title: 'Vitamine D : de la peau au rein', level: 'Organe',
    lead: 'La vitamine D vient de la peau (sous l\'effet des UVB) et de l\'alimentation. Le foie la transforme en 25-hydroxyvitamine D, la forme de réserve que l\'on dose ; le rein la convertit en 1,25-dihydroxyvitamine D (calcitriol), la forme active, sous l\'effet de la PTH. Le calcitriol augmente l\'absorption intestinale du calcium.',
    points: [
      'La PTH stimule au rein l\'hydroxylation de la 25-OH-D en 1,25-dihydroxyvitamine D (calcitriol), forme active (polycopié p. 37–38).',
      'Le calcitriol stimule l\'absorption digestive active du calcium et sa réabsorption au tube distal (polycopié p. 38).',
      'On dose la 25-OH-D pour juger du statut en vitamine D, pas le calcitriol (complément).',
      'La 1α-hydroxylase est aussi stimulée par l\'hypophosphatémie et freinée par le FGF23 et le calcitriol ; la 24-hydroxylase inactive (complément).',
      'Réglez « Statut en vitamine D » dans le panneau, ou le scénario « Carence en vitamine D ».'
    ],
    legend: new Set(['calcitriol', 'ca', 'pth']),
    build(g, a) {
      a.frame('Vitamine D : de la peau au rein', 'Synthèse, activation en deux hydroxylations, cibles du calcitriol');
      zpDefs(a);
      vitd.sim = HV.scenes.phospho.sim;
      const sim = () => HV.scenes.phospho.sim;
      HV.figBadge(a, 1530, 192, ['11', '12']);

      /* --- Peau --- */
      panel(a, 50, 165, 390, 425, 'zp-skin');
      a.text(72, 202, 'Peau (épiderme)', 'lbl-h');
      const sun = a.el('g', { transform: 'translate(395 205)' });
      a.el('circle', { r: 20, class: 'zp-sun' }, sun);
      for (let k = 0; k < 8; k++) {
        const an = (k / 8) * Math.PI * 2;
        a.el('line', { x1: Math.cos(an) * 25, y1: Math.sin(an) * 25, x2: Math.cos(an) * 33, y2: Math.sin(an) * 33, class: 'zp-ray' }, sun);
      }
      const synT = a.text(72, 232, '', 'note');
      const rays = a.el('g');
      [120, 200, 280, 360].forEach((x) => a.path(`M ${x + 30},244 q -6,8 -4,14 q 3,7 -4,14 q -6,8 -4,14 l -6,8`, 'zp-ray', rays));
      a.el('rect', { x: 70, y: 296, width: 350, height: 36, rx: 10, class: 'zp-skin' });
      for (let k = 0; k < 9; k++) a.el('ellipse', { cx: 92 + k * 38, cy: 314, rx: 16, ry: 10, class: 'zp-skin-c' });
      a.text(90, 370, '7-déhydrocholestérol', 'lbl-s strong');
      arrow(a, 'M 105,380 L 105,412');
      a.text(122, 403, 'UVB', 'note');
      a.text(90, 438, 'prévitamine D3', 'lbl-s strong');
      arrow(a, 'M 105,448 L 105,480');
      a.text(122, 471, 'chaleur du corps (isomérisation)', 'note');
      a.text(90, 506, 'cholécalciférol (vitamine D3)', 'lbl-s strong');
      a.text(72, 540, 'Ensoleillement (illustration) :', 'note', { attrs: { 'data-info': 'zp-sunbtn' } });
      let sunTarget = 1, sunF = 1;
      const SUN = [0.08, 0.5, 1];

      /* --- Alimentation --- */
      panel(a, 50, 610, 390, 170, 'zp-diet');
      a.text(72, 646, 'Alimentation', 'lbl-h');
      a.text(72, 680, 'D2 (ergocalciférol) : végétaux', 'note');
      a.text(72, 706, 'D3 (cholécalciférol) : poissons gras', 'note');
      a.text(72, 732, 'liposolubles : absorbées avec', 'note');
      a.text(72, 756, 'les graisses (complément)', 'note');

      /* --- Foie --- */
      const LX = 690;
      a.text(LX, 200, 'Foie', 'lbl-h', { anchor: 'middle' });
      a.organ('liver', LX, 290, 1.1, { 'data-info': 'zp-liver' });
      const lz = a.el('g', { 'data-info': 'zp-liver' });
      a.el('rect', { x: LX - 105, y: 378, width: 210, height: 46, rx: 23, class: 'enz' }, lz);
      a.text(LX, 408, '25-hydroxylase', 'note strong', { anchor: 'middle' }, lz);
      const p25 = a.el('g', { 'data-info': 'zp-25d' });
      a.el('rect', { x: LX - 125, y: 456, width: 250, height: 46, rx: 23, class: 'sig-box', style: '--c: var(--p-orange)' }, p25);
      a.text(LX, 486, '25-OH-D (calcidiol)', 'lbl-s strong', { anchor: 'middle' }, p25);
      a.text(LX, 534, 'forme de réserve,', 'note', { anchor: 'middle' });
      a.text(LX, 558, 'c\'est elle que l\'on dose', 'note strong', { anchor: 'middle' });
      a.text(LX, 582, '(complément)', 'note', { anchor: 'middle' });
      arrow(a, `M ${LX},424 L ${LX},452`);

      /* --- Rein --- */
      const KX = 1035;
      a.text(KX, 200, 'Rein (tube proximal)', 'lbl-h', { anchor: 'middle' });
      a.organ('kidney', KX, 290, 1.05, { 'data-info': 'zp-1a' });
      const kz = a.el('g', { 'data-info': 'zp-1a' });
      a.el('rect', { x: KX - 105, y: 378, width: 210, height: 46, rx: 23, class: 'enz' }, kz);
      a.text(KX, 408, '1α-hydroxylase', 'note strong', { anchor: 'middle' }, kz);
      const pD = a.el('g', { 'data-info': 'calcitriol' });
      a.el('rect', { x: KX - 140, y: 456, width: 280, height: 46, rx: 23, class: 'sig-box', style: '--c: var(--p-amber)' }, pD);
      a.text(KX, 486, '1,25-(OH)₂-D : calcitriol', 'lbl-s strong', { anchor: 'middle' }, pD);
      arrow(a, `M ${KX},424 L ${KX},452`);
      // Régulation de la 1α-hydroxylase
      const rg = a.el('g', { 'data-info': 'zp-1a' });
      a.el('rect', { x: KX - 150, y: 524, width: 300, height: 170, rx: 18, class: 'side-box' }, rg);
      a.text(KX - 132, 554, 'Régulation (complément sauf PTH)', 'note strong', null, rg);
      const sPTH = a.sign(KX - 118, 584, 'stim', rg); sPTH.set(1);
      a.text(KX - 96, 590, 'PTH (polycopié p. 38)', 'note', null, rg);
      a.sign(KX - 118, 616, 'stim', rg).set(0.6);
      a.text(KX - 96, 622, 'hypophosphatémie', 'note', null, rg);
      a.sign(KX - 118, 648, 'inhib', rg).set(0.6);
      a.text(KX - 96, 654, 'FGF23', 'note', null, rg);
      a.sign(KX - 118, 680, 'inhib', rg).set(0.6);
      a.text(KX - 96, 686, 'calcitriol (rétrocontrôle)', 'note', null, rg);
      const iz = a.el('g', { 'data-info': 'zp-24' });
      a.el('rect', { x: KX - 150, y: 708, width: 300, height: 76, rx: 18, class: 'side-box' }, iz);
      a.text(KX - 132, 738, '24-hydroxylase (complément)', 'note strong', null, iz);
      a.text(KX - 132, 764, 'inactivation : dérivés 24-OH', 'note', null, iz);

      /* --- Transport : DBP --- */
      a.text(862, 236, 'sang : liée à la DBP', 'note', { anchor: 'middle', attrs: { 'data-info': 'zp-dbp' } });
      a.text(862, 258, '(complément)', 'note', { anchor: 'middle', attrs: { 'data-info': 'zp-dbp' } });
      a.flow('M 760,300 C 820,285 900,285 960,300', { mol: 'zp-25d', rate: () => 2 * sim().p.vitD, size: 1.2, speed: 60, trackClass: 'track' });
      a.flow('M 330,500 C 450,500 520,400 610,320', { mol: 'zp-d3', rate: () => 2.4 * sunF, size: 1.1, speed: 70, trackClass: 'track' });
      a.flow('M 400,700 C 520,690 540,420 625,345', { mol: 'zp-d3', rate: () => 0.7, size: 1.1, speed: 70, trackClass: 'track' });

      /* --- Cibles --- */
      a.text(1228, 200, 'Cibles du calcitriol', 'lbl-h');
      const TX = 1280;
      const tgt = [
        ['intestine', 290, 'zp-gut', ['Intestin grêle', 'absorption active du Ca²⁺', '(polycopié p. 36)']],
        ['bone', 440, 'zp-bone-t', ['Os', 'minéralisation', '(complément)']],
        ['parathyroidBack', 590, 'zp-para-t', ['Parathyroïdes', 'freine la synthèse de PTH', '(complément)']],
        ['kidney', 740, 'zp-kid-t', ['Rein', 'réabsorption du Ca²⁺', 'au tube distal (p. 38)']]
      ];
      tgt.forEach(([org, y, inf, lines]) => {
        a.organ(org, TX, y, 0.62, { 'data-info': inf });
        a.text(TX + 52, y - 22, lines[0], 'lbl-s strong', { attrs: { 'data-info': inf } });
        a.text(TX + 52, y + 4, lines[1], 'note', { attrs: { 'data-info': inf } });
        a.text(TX + 52, y + 28, lines[2], 'note', { attrs: { 'data-info': inf } });
        a.flow(`M ${KX + 140},479 C ${KX + 180},479 ${TX - 80},${y} ${TX - 42},${y}`, { mol: 'calcitriol', rate: () => 0.9 * sim().s.d, pace: () => HV.paceOf(sim().s.d), size: 1.2, speed: 70, trackClass: 'track' });
      });
      a.sign(TX - 52, 590, 'inhib').set(0.8);
      a.flow(`M ${TX + 50},346 L ${TX + 240},346`, { mol: 'ca', rate: () => 1.5 * clamp(sim().s.d, 0.2, 3), size: 1.2, speed: 60, trackClass: 'track' });
      a.text(TX + 250, 352, 'sang', 'note');

      /* --- Bandeau : valeurs du modèle --- */
      const mb = a.el('g', { 'data-info': 'zp-model' });
      a.el('rect', { x: 50, y: 820, width: 1500, height: 140, rx: 22, class: 'side-box' }, mb);
      a.text(76, 856, 'Dans le modèle de l\'axe (panneau) — valeurs illustratives', 'note strong', null, mb);
      const cols = [['Statut en vitamine D', 76], ['25-OH-D', 420], ['PTH', 700], ['Calcitriol (relatif)', 960]];
      const vals = cols.map(([t, x]) => { a.text(x, 890, t, 'note', null, mb); return a.text(x, 920, '', 'sig-val', null, mb); });
      const msg = a.text(1190, 892, '', 'note strong', null, mb);
      const setD = (ln) => { msg.textContent = ''; ln.forEach((s, i) => a.el('tspan', { x: 1190, dy: i ? '1.3em' : 0, text: s }, msg)); };

      const sb = buttons(vitd, a, 72, 552, ['hiver', 'mi-saison', 'été'], (i) => { sunTarget = SUN[i]; });
      sb.pick(2);

      let tt = 0, lastMsg = '';
      a.dyn((dt) => {
        const S = sim();
        if (dt > 0 && HV.app && HV.app.current === vitd) S.step(dt);
        sunF = lerp(sunF, sunTarget, clamp(dt * 3, 0, 1));
        rays.setAttribute('opacity', (0.15 + 0.85 * sunF).toFixed(2));
        sun.setAttribute('opacity', (0.35 + 0.65 * sunF).toFixed(2));
        tt -= dt;
        if (tt > 0) return;
        tt = 0.3;
        synT.textContent = 'synthèse cutanée : ' + (sunF > 0.75 ? 'forte' : sunF > 0.3 ? 'modérée' : 'très faible');
        const vd = S.lab('vd'), pth = S.lab('pth');
        vals[0].textContent = Math.round(S.p.vitD * 100) + ' %';
        vals[1].textContent = Math.round(vd) + ' ng/mL';
        vals[2].textContent = Math.round(pth) + ' pg/mL';
        vals[3].textContent = '× ' + fr(S.s.d, 1);
        const m = S.p.vitD < 0.5 ? ['Réserve basse : moins de Ca²⁺ absorbé,', 'PTH ↑ (hyperparathyroïdie secondaire)']
          : pth > 65 ? ['PTH élevée : elle stimule', 'la 1α-hydroxylase, calcitriol ↑']
            : ['Réserve suffisante : calcitriol', 'ajusté par la PTH'];
        if (m.join() !== lastMsg) { lastMsg = m.join(); setD(m); }
      });

      HV.spotlight(vitd, a, [
        { t: 'La peau fabrique la vitamine D3', d: 'Dans l\'épiderme, les UVB transforment le 7-déhydrocholestérol en prévitamine D3, qui s\'isomérise en cholécalciférol (vitamine D3). Cette synthèse s\'effondre en hiver (complément).', spot: [[50, 165, 390, 425]] },
        { t: 'L\'alimentation complète', d: 'Vitamine D2 (végétaux) et D3 (produits animaux), absorbées avec les graisses (complément).', spot: [[50, 610, 390, 170]] },
        { t: 'Le foie : 25-hydroxylation', d: 'La 25-hydroxylase donne la 25-hydroxyvitamine D, forme de réserve transportée par la DBP. C\'est elle que l\'on dose pour juger du statut en vitamine D (complément).', spot: [[560, 180, 260, 420]] },
        { t: 'Le rein : 1α-hydroxylation', d: 'Au tube proximal, la 25-OH-D devient 1,25-dihydroxyvitamine D (calcitriol), la forme active. La PTH stimule cette étape (polycopié p. 37–38).', spot: [[880, 180, 310, 330]] },
        { t: 'Une étape très régulée', d: 'La 1α-hydroxylase est stimulée par la PTH et l\'hypophosphatémie, freinée par le FGF23 et par le calcitriol. La 24-hydroxylase, induite par le calcitriol et le FGF23, inactive (complément).', spot: [[880, 518, 310, 272]] },
        { t: 'Les cibles du calcitriol', d: 'Intestin : absorption active du calcium (polycopié p. 36, 38) ; rein : réabsorption du calcium au tube distal (p. 38) ; os : minéralisation ; parathyroïdes : frein de la PTH (complément).', spot: [[1210, 170, 360, 630]] },
        { t: 'Carence en vitamine D', d: 'Choisissez le scénario « Carence en vitamine D » dans le panneau : la 25-OH-D baisse, la PTH monte et maintient la calcémie (hyperparathyroïdie secondaire, complément).', spot: [[50, 820, 1500, 140]] }
      ]);
    }
  }, HV.LOUPE.R(0)));

  /* =====================================================================
     2. FGF23, klotho et phosphate (complément)
     ===================================================================== */
  Object.assign(HV.INFO, {
    'zp-fgf': { t: 'FGF23', k: 'Hormone phosphaturiante de l\'os (complément)', d: 'Sécrété surtout par les ostéocytes quand la phosphatémie ou le calcitriol augmentent. Au rein, il agit par son récepteur FGFR associé au corécepteur klotho : moins de NPT2a (phosphaturie), 1α-hydroxylase freinée et 24-hydroxylase stimulée (calcitriol ↓).' },
    'zp-pi': { t: 'Phosphate', k: 'Phosphatémie (complément)', d: 'Réabsorbé au tube proximal par les cotransporteurs sodium-phosphate (NPT2a surtout). La PTH est aussi phosphaturiante : hypophosphatémie et hyperphosphaturie de l\'hyperparathyroïdie primaire (polycopié p. 41).' },
    'zp-ocy': { t: 'Ostéocyte', k: 'Cellule de l\'os, dans sa lacune (complément)', d: 'Relié aux autres par des canalicules. Principale source de FGF23 (et de sclérostine). Les protéines PHEX et DMP1 freinent localement la production de FGF23.' },
    'zp-klotho': { t: 'Récepteur FGFR + α-klotho', k: 'Corécepteur indispensable (complément)', d: 'Le FGF23 n\'agit que sur les tissus qui expriment klotho : rein et parathyroïdes. Sans klotho, pas d\'effet du FGF23.' },
    'zp-npt': { t: 'NPT2a (cotransporteur Na⁺-phosphate)', k: 'Bordure en brosse du tube proximal (complément)', d: 'Réabsorbe le phosphate filtré. Le FGF23 (comme la PTH) le fait internaliser : il quitte la membrane, le phosphate reste dans l\'urine (phosphaturie).' },
    'zp-1a2': { t: '1α-hydroxylase et 24-hydroxylase', k: 'Mitochondrie du tube proximal (complément)', d: 'Le FGF23 freine la 1α-hydroxylase et stimule la 24-hydroxylase : le calcitriol baisse, et avec lui l\'absorption intestinale du phosphate.' },
    'zp-xlh': { t: 'Rachitisme hypophosphatémique lié à l\'X', k: 'Mutation de PHEX (complément)', d: 'FGF23 élevé ou inadapté : fuite rénale de phosphate, hypophosphatémie, calcitriol bas ou normal (inadapté). Rachitisme et déformation des membres chez l\'enfant, ostéomalacie chez l\'adulte. Traitement : phosphate et calcitriol, ou anticorps anti-FGF23 (burosumab).' },
    'zp-tio': { t: 'Ostéomalacie oncogénique', k: 'Tumeur sécrétant du FGF23 (complément)', d: 'Petite tumeur, le plus souvent mésenchymateuse et bénigne, qui sécrète du FGF23 : hypophosphatémie acquise de l\'adulte, calcitriol bas, douleurs osseuses, faiblesse musculaire, fractures. Guérie par l\'exérèse de la tumeur.' },
    'zp-irc': { t: 'Insuffisance rénale chronique', k: 'FGF23 très élevé (complément)', d: 'Le FGF23 monte tôt, pour maintenir l\'excrétion du phosphate par les néphrons restants ; klotho rénal diminue. Le calcitriol baisse, ce qui contribue à l\'hyperparathyroïdie secondaire ; l\'hyperphosphatémie apparaît aux stades avancés.' },
    'zp-loops': { t: 'Boucles de régulation', k: 'Complément', d: 'Phosphate ↑ → FGF23 ↑ → phosphaturie → phosphate ↓. Calcitriol ↑ → FGF23 ↑ → calcitriol ↓. Le FGF23 freine aussi la sécrétion de PTH.' },
    'zp-gauges': { t: 'Niveaux relatifs', k: 'Illustration qualitative', d: 'Les barres indiquent un sens de variation, pas une valeur biologique.' }
  });

  const fgf = HV.scene(Object.assign({
    id: 'fgf23', parent: 'phospho', loupe: 'FGF23 et phosphate',
    title: 'FGF23, klotho et phosphate', level: 'Cellule',
    lead: 'Cette loupe est un complément au polycopié. L\'ostéocyte sécrète le FGF23 quand le phosphate ou le calcitriol augmentent. Au tube proximal, avec son corécepteur klotho, le FGF23 retire de la membrane les cotransporteurs NPT2a (le phosphate part dans l\'urine) et freine la 1α-hydroxylase (le calcitriol baisse).',
    points: [
      'FGF23 : hormone osseuse phosphaturiante (complément).',
      'Effets rénaux : NPT2a ↓ → phosphaturie ; 1α-hydroxylase ↓ et 24-hydroxylase ↑ → calcitriol ↓ (complément).',
      'Klotho est le corécepteur indispensable du FGF23 (complément).',
      'Excès de FGF23 : rachitisme hypophosphatémique lié à l\'X, ostéomalacie oncogénique ; FGF23 très élevé dans l\'insuffisance rénale chronique (complément).',
      'La PTH est elle aussi phosphaturiante : hyperphosphaturie et hypophosphatémie de l\'hyperparathyroïdie primaire (polycopié p. 41).'
    ],
    legend: new Set(['calcitriol', 'pth']),
    build(g, a) {
      a.frame('FGF23, klotho et phosphate', 'L\'os règle le phosphate par le rein (complément)');
      zpDefs(a);
      fgf.sim = HV.scenes.phospho.sim;

      /* --- Os : ostéocyte --- */
      panel(a, 50, 165, 390, 480);
      a.text(72, 202, 'Os : ostéocyte', 'lbl-h');
      a.el('rect', { x: 72, y: 222, width: 346, height: 270, rx: 16, class: 'zp-bone' });
      for (let k = 0; k < 6; k++) a.path(`M 80,${250 + k * 42} C 180,${238 + k * 42} 300,${262 + k * 42} 410,${248 + k * 42}`, 'zp-lam');
      const oc = a.el('g', { 'data-info': 'zp-ocy', transform: 'translate(230 356)' });
      for (let k = 0; k < 10; k++) {
        const an = (k / 10) * Math.PI * 2 + 0.2;
        a.path(`M ${Math.cos(an) * 50},${Math.sin(an) * 30} L ${Math.cos(an) * 140},${Math.sin(an) * 105}`, 'zp-canal', oc);
      }
      a.el('ellipse', { rx: 66, ry: 40, class: 'zp-lac' }, oc);
      a.el('ellipse', { rx: 56, ry: 32, class: 'zp-cyte' }, oc);
      a.el('ellipse', { rx: 18, ry: 13, class: 'zp-nuc' }, oc);
      a.text(230, 474, 'ostéocyte', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zp-ocy' } });
      a.sign(92, 528, 'stim').set(0.8);
      a.text(116, 534, 'phosphate ↑', 'note');
      a.sign(92, 564, 'stim').set(0.8);
      a.text(116, 570, 'calcitriol ↑', 'note');
      a.text(72, 610, 'PHEX, DMP1 : freins locaux', 'note');
      a.text(72, 634, 'de la production de FGF23', 'note');

      /* --- Cellule du tube proximal --- */
      a.text(590, 202, 'Rein : cellule du tube proximal', 'lbl-h');
      a.text(505, 250, 'sang', 'note strong', { anchor: 'middle' });
      a.el('rect', { x: 1030, y: 222, width: 80, height: 380, rx: 14, class: 'zp-lumen' });
      a.text(1070, 250, 'urine', 'note strong', { anchor: 'middle' });
      a.el('rect', { x: 580, y: 228, width: 440, height: 340, rx: 40, class: 'zp-cell', 'data-info': 'zp-1a2' });
      for (let y = 250; y < 550; y += 12) a.path(`M 1022,${y} l 8,0`, 'zp-villi');
      // Récepteur basolatéral
      const rc = a.el('g', { 'data-info': 'zp-klotho', transform: 'translate(580 380)' });
      a.el('rect', { x: -12, y: -26, width: 24, height: 52, rx: 8, class: 'zp-rec' }, rc);
      a.el('path', { d: 'M -14,-30 C -34,-20 -34,20 -14,30 L -18,22 C -26,12 -26,-12 -18,-22 Z', class: 'zp-klotho' }, rc);
      a.text(604, 320, 'FGFR + klotho', 'note strong', { attrs: { 'data-info': 'zp-klotho' } });
      a.flow('M 300,356 C 380,356 440,380 552,380', { mol: 'zp-fgf', rate: () => 1.2 * Math.sqrt(st.fgf), pace: () => HV.paceOf(st.fgf), size: 1.3, speed: 80, trackClass: 'track', max: 40 });
      a.text(470, 410, 'FGF23', 'lbl-s strong', { anchor: 'middle', attrs: { 'data-info': 'zp-fgf' } });
      // NPT2a apicaux et vésicules d'internalisation
      const npt = [], ves = [];
      [300, 390, 480].forEach((y) => {
        const t = a.el('g', { 'data-info': 'zp-npt', transform: `translate(1020 ${y})` });
        a.el('rect', { x: -12, y: -22, width: 24, height: 44, rx: 8, class: 'zp-npt' }, t);
        a.el('rect', { x: -3, y: -22, width: 6, height: 44, class: 'chan-pore' }, t);
        npt.push(t);
        ves.push(a.el('circle', { cx: 948, cy: y, r: 14, class: 'zp-ves', 'data-info': 'zp-npt' }));
      });
      a.text(1000, 262, 'NPT2a', 'note strong', { anchor: 'end', attrs: { 'data-info': 'zp-npt' } });
      // Signalisation : inhibition des NPT2a et de la 1α-hydroxylase, stimulation de la 24-hydroxylase
      a.path('M 600,380 C 720,350 820,330 925,330', 'ax-track inhib', null, { 'data-info': 'zp-npt' });
      a.sign(925, 330, 'inhib').set(1);
      a.text(820, 300, 'internalisation', 'note', { anchor: 'middle' });
      a.path('M 600,392 C 640,440 660,460 704,460', 'ax-track inhib', null, { 'data-info': 'zp-1a2' });
      a.path('M 600,392 C 630,480 660,520 704,520', 'ax-track stim', null, { 'data-info': 'zp-1a2', style: '--mc: var(--stim)' });
      const e1 = a.el('g', { 'data-info': 'zp-1a2' });
      a.el('rect', { x: 724, y: 438, width: 200, height: 44, rx: 22, class: 'enz' }, e1);
      a.text(824, 467, '1α-hydroxylase', 'note strong', { anchor: 'middle' }, e1);
      a.sign(704, 460, 'inhib', e1).set(0.8);
      a.el('rect', { x: 724, y: 498, width: 200, height: 44, rx: 22, class: 'enz' }, e1);
      a.text(824, 527, '24-hydroxylase', 'note strong', { anchor: 'middle' }, e1);
      a.sign(704, 520, 'stim', e1).set(0.8);
      a.text(800, 596, 'calcitriol ↓ → absorption intestinale du phosphate ↓', 'note', { anchor: 'middle' });
      // Phosphate : réabsorption (vers le sang) et phosphaturie
      [300, 390, 480].forEach((y, i) => a.flow(`M 1095,${y - 30} C 1060,${y - 10} 1040,${y} 1000,${y} C 900,${y + 10} 700,${y + 60} 470,${560 + i * 12}`, { mol: 'zp-pi', rate: () => 0.9 * st.npt * st.pi, size: 1.2, speed: 90, track: false, max: 14 }));
      a.flow('M 1070,262 L 1070,600', { mol: 'zp-pi', rate: () => 2.2 * clamp(st.uri, 0, 3), size: 1.2, speed: 70, track: false, max: 30 });
      a.text(1070, 628, 'phosphaturie', 'note strong', { anchor: 'middle' });

      /* --- Niveaux et boucles --- */
      panel(a, 1140, 165, 410, 480);
      a.text(1162, 202, 'Niveaux relatifs', 'lbl-h', { attrs: { 'data-info': 'zp-gauges' } });
      const G = [['FGF23', 'p-violet'], ['Phosphatémie', 'p-magenta'], ['Excrétion fractionnelle du Pi', 'p-magenta'], ['Calcitriol', 'p-amber'], ['PTH', 'p-green']].map(([t, c], i) => {
        const y = 240 + i * 48;
        a.text(1162, y, t, 'note', { attrs: { 'data-info': 'zp-gauges' } });
        const v = a.text(1528, y, '', 'note strong', { anchor: 'end' });
        return { set: gauge(a, 1162, y + 10, 366, c), v };
      });
      const lp = a.el('g', { 'data-info': 'zp-loops' });
      a.el('rect', { x: 1162, y: 482, width: 366, height: 146, rx: 16, class: 'side-box' }, lp);
      a.text(1180, 512, 'Boucles (complément)', 'note strong', null, lp);
      a.text(1180, 542, 'Pi ↑ → FGF23 ↑ → Pi ↓', 'note', null, lp);
      a.text(1180, 570, 'calcitriol ↑ → FGF23 ↑ → calcitriol ↓', 'note', null, lp);
      a.text(1180, 598, 'FGF23 → PTH ↓', 'note', null, lp);

      /* --- Situations --- */
      a.text(60, 696, 'Situation :', 'lbl-s strong');
      const ST = [
        { fgf: 1, pi: 1, uri: 1, d: 1, pth: 1, npt: 1, card: -1, msg: 'Équilibre : le FGF23 ajuste l\'excrétion du phosphate aux apports.' },
        { fgf: 1.8, pi: 1.15, uri: 1.6, d: 0.75, pth: 1.1, npt: 0.6, card: -1, msg: 'Charge en phosphate : FGF23 ↑, phosphaturie ↑, calcitriol ↓ ; la phosphatémie revient vers la normale.' },
        { fgf: 3, pi: 0.5, uri: 1.4, d: 0.8, pth: 1.2, npt: 0.3, card: 0, msg: 'FGF23 en excès : fuite rénale de phosphate, hypophosphatémie, calcitriol inadapté (non augmenté).' },
        { fgf: 4.5, pi: 0.45, uri: 1.4, d: 0.5, pth: 1.1, npt: 0.25, card: 1, msg: 'Tumeur sécrétant du FGF23 : hypophosphatémie acquise, calcitriol bas.' },
        { fgf: 12, pi: 1.6, uri: 1.8, d: 0.4, pth: 2.5, npt: 0.3, card: 2, msg: 'IRC : FGF23 très élevé, calcitriol ↓, PTH ↑ ; excrétion par néphron ↑, mais le phosphate s\'accumule aux stades avancés.' }
      ];
      const st = Object.assign({}, ST[0]);
      let tgt = ST[0];
      const msgT = a.text(60, 730, '', 'note strong');
      const fb = buttons(fgf, a, 180, 672, ['Normal', 'Charge en phosphate', 'XLH', 'Ostéomalacie oncogénique', 'Insuffisance rénale chronique'], (i) => { tgt = ST[i]; msgT.textContent = ST[i].msg; cards.forEach((c, k) => c.classList.toggle('on', k === ST[i].card)); });

      /* --- Pathologies --- */
      const cards = [];
      [['zp-xlh', 'Rachitisme hypophosphatémique lié à l\'X', ['mutation de PHEX : FGF23 ↑ ou inadapté', 'hypophosphatémie, calcitriol inadapté', 'rachitisme, membres arqués', 'traitement : burosumab (anti-FGF23)']],
        ['zp-tio', 'Ostéomalacie oncogénique', ['petite tumeur (souvent mésenchymateuse)', 'qui sécrète du FGF23 : adulte,', 'douleurs osseuses, faiblesse, fractures', 'guérie par l\'exérèse de la tumeur']],
        ['zp-irc', 'Insuffisance rénale chronique', ['FGF23 ↑ tôt, très élevé ensuite', 'klotho rénal ↓, calcitriol ↓', '→ hyperparathyroïdie secondaire', 'hyperphosphatémie aux stades avancés']]
      ].forEach(([inf, t, lines], i) => {
        const x = 50 + i * 505;
        const cg = a.el('g', { 'data-info': inf });
        cards.push(a.el('rect', { x, y: 750, width: 490, height: 210, rx: 20, class: 'zp-panel' }, cg));
        a.text(x + 20, 784, t, 'lbl-s strong', null, cg);
        lines.forEach((ln, k) => a.text(x + 20, 816 + k * 30, ln, 'note', null, cg));
        a.text(x + 470, 945, '(complément)', 'note', { anchor: 'end' }, cg);
      });
      fb.pick(0);

      let tt = 0;
      a.dyn((dt) => {
        const k = clamp(dt * 1.5, 0, 1);
        for (const key of ['fgf', 'pi', 'uri', 'd', 'pth', 'npt']) st[key] = lerp(st[key], tgt[key], k);
        npt.forEach((t, i) => t.setAttribute('opacity', st.npt > (i + 0.5) / 3.2 ? 1 : 0.15));
        ves.forEach((v, i) => v.setAttribute('opacity', st.npt > (i + 0.5) / 3.2 ? 0 : 1));
        tt -= dt;
        if (tt > 0) return;
        tt = 0.25;
        const q = (v) => (v > 6 ? '↑↑↑' : v > 2.2 ? '↑↑' : v > 1.3 ? '↑' : v < 0.6 ? '↓↓' : v < 0.85 ? '↓' : 'normal');
        const vals = [st.fgf, st.pi, st.uri, st.d, st.pth];
        G[0].set(Math.log(1 + st.fgf) / Math.log(14));
        G[1].set(st.pi / 2); G[2].set(st.uri / 2.2); G[3].set(st.d / 2); G[4].set(st.pth / 3);
        G.forEach((gg, i) => { gg.v.textContent = q(vals[i]); });
      });

      HV.spotlight(fgf, a, [
        { t: 'L\'ostéocyte sécrète le FGF23', d: 'Enfoui dans l\'os, relié aux autres par des canalicules, l\'ostéocyte sécrète le FGF23 quand le phosphate ou le calcitriol augmentent (complément).', spot: [[50, 165, 390, 480]], st: 1 },
        { t: 'Klotho, le corécepteur', d: 'Le FGF23 agit par un récepteur FGFR associé à klotho, exprimé surtout au rein et aux parathyroïdes (complément).', spot: [[470, 300, 230, 140]], st: 1 },
        { t: 'Phosphaturie', d: 'Les cotransporteurs NPT2a quittent la bordure en brosse : le phosphate filtré n\'est plus réabsorbé et part dans l\'urine (complément). La PTH est aussi phosphaturiante (polycopié p. 41).', spot: [[880, 222, 240, 410]], st: 1 },
        { t: 'Moins de calcitriol', d: 'Le FGF23 freine la 1α-hydroxylase et stimule la 24-hydroxylase : moins de calcitriol, donc moins d\'absorption intestinale du phosphate (complément).', spot: [[590, 425, 420, 190]], st: 1 },
        { t: 'Des boucles fermées', d: 'Phosphate ↑ → FGF23 ↑ → phosphate ↓ ; calcitriol ↑ → FGF23 ↑ → calcitriol ↓ ; le FGF23 freine aussi la PTH (complément).', spot: [[1140, 165, 410, 480]], st: 1 },
        { t: 'Rachitisme hypophosphatémique lié à l\'X', d: 'Mutation de PHEX : FGF23 en excès, fuite rénale de phosphate, calcitriol inadapté (complément).', spot: [[50, 750, 490, 210]], st: 2 },
        { t: 'Ostéomalacie oncogénique', d: 'Une petite tumeur sécrète du FGF23 ; son exérèse guérit (complément).', spot: [[555, 750, 490, 210]], st: 3 },
        { t: 'Insuffisance rénale chronique', d: 'Le FGF23 monte tôt et devient très élevé ; le calcitriol baisse et la PTH monte (hyperparathyroïdie secondaire) (complément).', spot: [[1060, 750, 490, 210]], st: 4 }
      ]);
      const base = fgf.stepTo;
      fgf.stepTo = function (i) { base(i); if (i >= 0 && fgf.steps[i].st != null) fb.pick(fgf.steps[i].st); };
    }
  }, HV.LOUPE.R(1)));

  /* =====================================================================
     3. Remodelage osseux
     ===================================================================== */
  Object.assign(HV.INFO, {
    'zp-bmu': { t: 'Unité de remodelage osseux', k: 'Résorption puis formation au même endroit', d: 'Le remodelage entraîne un flux de calcium équilibré entre la résorption osseuse et la minéralisation (polycopié p. 35–36). Séquence : activation, résorption par les ostéoclastes, inversion, formation par les ostéoblastes, minéralisation (complément).' },
    'zp-ocl': { t: 'Ostéoclaste', k: 'Cellule géante multinucléée (complément)', d: 'Issue de la lignée monocyte-macrophage, elle creuse une lacune en dissolvant le minéral (acidification) et en digérant la matrice : le calcium et le phosphate sont libérés. Sa différenciation exige RANKL.' },
    'zp-obl': { t: 'Ostéoblaste', k: 'Cellule qui forme l\'os (complément)', d: 'Dépose la matrice non minéralisée (ostéoïde), puis la minéralise. Certains restent emmurés et deviennent des ostéocytes, d\'autres des cellules bordantes. Exprime RANKL et OPG.' },
    'zp-ocy3': { t: 'Ostéocyte', k: 'Mécanosensible (complément)', d: 'Ancien ostéoblaste emmuré, relié aux autres par des canalicules. Il perçoit les contraintes mécaniques et sécrète la sclérostine (frein de la formation), RANKL et FGF23. La PTH active les ostéocytes, qui permettent une libération rapide de calcium (polycopié p. 38).' },
    'zp-rev': { t: 'Phase d\'inversion', k: 'Complément', d: 'Des cellules mononucléées nettoient le fond de la lacune et préparent l\'arrivée des ostéoblastes.' },
    'zp-osteoid': { t: 'Ostéoïde', k: 'Matrice non minéralisée (complément)', d: 'Surtout du collagène de type I, déposé par les ostéoblastes puis minéralisé (hydroxyapatite) en plusieurs semaines à mois.' },
    'zp-lin': { t: 'Cellules bordantes', k: 'Os au repos (complément)', d: 'Ostéoblastes aplatis qui recouvrent les surfaces osseuses inactives ; ils se rétractent à l\'activation.' },
    'zp-rankl': { t: 'RANKL / RANK / OPG', k: 'Couple clé de la résorption (complément)', d: 'RANKL, exprimé par les ostéoblastes et les ostéocytes, se lie à RANK sur les précurseurs des ostéoclastes et déclenche leur différenciation. L\'OPG (ostéoprotégérine) est un récepteur leurre qui capte RANKL. La PTH continue augmente RANKL et diminue l\'OPG.' },
    'zp-scl': { t: 'Sclérostine', k: 'Frein de la formation (complément)', d: 'Sécrétée par les ostéocytes, elle bloque la voie Wnt des ostéoblastes. La charge mécanique la diminue (la formation augmente) ; l\'immobilisation l\'augmente. La PTH la diminue.' },
    'zp-pthmode': { t: 'PTH continue ou intermittente', k: 'Hyperparathyroïdie (polycopié p. 40–41) · tériparatide (complément)', d: 'L\'excès chronique de PTH entraîne une anomalie du remodelage avec déminéralisation osseuse : ostéoporose (polycopié p. 40–41). À l\'inverse, l\'injection quotidienne de PTH (1-34), le tériparatide, stimule davantage la formation : effet anabolique (complément). L\'hypoparathyroïdie réduit le remodelage (polycopié p. 46).' },
    'zp-balance': { t: 'Bilan de chaque cycle', k: 'Illustration qualitative', d: 'Compare la quantité d\'os résorbée et la quantité reformée à chaque cycle.' },
    'zp-bp': { t: 'Bisphosphonates', k: 'Antirésorptifs (complément)', d: 'Se fixent sur l\'hydroxyapatite ; captés par les ostéoclastes, ils les inhibent : la résorption diminue.' },
    'zp-dmab': { t: 'Dénosumab', k: 'Anticorps anti-RANKL (complément)', d: 'Mime l\'OPG : bloque RANKL, la formation et l\'activité des ostéoclastes diminuent. Effet réversible à l\'arrêt, avec un rebond de la résorption.' },
    'zp-romo': { t: 'Romosozumab', k: 'Anticorps anti-sclérostine (complément)', d: 'Lève le frein de la sclérostine : la formation augmente et la résorption diminue.' },
    'zp-teri': { t: 'Tériparatide', k: 'PTH (1-34) intermittente (complément)', d: 'Une injection quotidienne : pic bref de PTH qui stimule surtout la formation (anabolique), contrairement à l\'excès continu de PTH.' }
  });

  const remo = HV.scene(Object.assign({
    id: 'remodelage', parent: 'phospho', loupe: 'Remodelage osseux',
    title: 'Remodelage osseux', level: 'Tissu',
    lead: 'L\'os se renouvelle en permanence. Dans chaque unité de remodelage, les ostéoclastes creusent une lacune, puis les ostéoblastes la comblent d\'os nouveau qui se minéralise ; en situation normale, le flux de calcium entre résorption et minéralisation est équilibré (polycopié p. 35–36). L\'excès de PTH déséquilibre ce cycle vers la perte osseuse (polycopié p. 40–41).',
    points: [
      'Remodelage : flux de calcium équilibré entre résorption et minéralisation (polycopié p. 35–36).',
      'Hyperparathyroïdie : anomalie du remodelage, déminéralisation, ostéoporose (polycopié p. 40–41) ; hypoparathyroïdie : remodelage réduit (p. 46).',
      'RANKL (ostéoblastes, ostéocytes) active les ostéoclastes ; l\'OPG est un leurre (complément).',
      'L\'ostéocyte, mécanosensible, sécrète la sclérostine qui freine la formation (complément).',
      'Cibles : bisphosphonates et dénosumab (résorption ↓), romosozumab (anti-sclérostine), tériparatide (PTH intermittente, formation ↑) (complément).'
    ],
    legend: new Set(['ca', 'pth']),
    build(g, a) {
      a.frame('Remodelage osseux', 'Unité de remodelage · RANKL / OPG · sclérostine · cibles des traitements');
      zpDefs(a);
      remo.sim = HV.scenes.phospho.sim;

      /* --- Unité de remodelage --- */
      panel(a, 50, 165, 1050, 505, 'zp-bmu');
      a.text(72, 202, 'Unité de remodelage', 'lbl-h', { attrs: { 'data-info': 'zp-bmu' } });
      const phaseT = a.text(1080, 202, '', 'lbl-s strong', { anchor: 'end' });
      const SY = 350, CX = 575, HW = 250;
      a.el('rect', { x: 72, y: 220, width: 1006, height: SY - 220, class: 'zp-marrow' });
      a.vessel('M 80,252 L 1070,252', 20);
      a.text(1068, 290, 'moelle, capillaire', 'note', { anchor: 'end' });
      a.el('rect', { x: 72, y: SY, width: 1006, height: 205, class: 'zp-bone', 'data-info': 'zp-bmu' });
      for (let k = 0; k < 5; k++) a.path(`M 74,${SY + 40 + k * 36} C 300,${SY + 30 + k * 36} 800,${SY + 52 + k * 36} 1076,${SY + 38 + k * 36}`, 'zp-lam');
      // Ostéocytes de l'os ancien
      [[150, 470], [960, 440], [380, 520], [790, 525]].forEach(([x, y]) => {
        const oc = a.el('g', { 'data-info': 'zp-ocy3', transform: `translate(${x} ${y})` });
        for (let k = 0; k < 6; k++) { const an = (k / 6) * Math.PI * 2; a.path(`M 0,0 L ${Math.cos(an) * 40},${Math.sin(an) * 26}`, 'zp-canal', oc); }
        a.el('ellipse', { rx: 18, ry: 10, class: 'zp-cyte' }, oc);
      });
      a.text(150, 505, 'ostéocyte', 'note', { anchor: 'middle', attrs: { 'data-info': 'zp-ocy3' } });
      // Lacune, ostéoïde, os nouveau
      const prof = (u) => Math.pow(Math.max(0, 1 - u * u), 0.6);
      const N = 40;
      const curve = (depth, sign) => {
        let d = '';
        for (let i = 0; i <= N; i++) {
          const u = -1 + (2 * i) / N, x = CX + u * HW, y = SY + sign * depth * prof(u);
          d += (i ? ' L ' : 'M ') + x.toFixed(1) + ',' + y.toFixed(1);
        }
        return d;
      };
      const region = (depth, f) => {
        // entre le fond de la lacune et la surface de remplissage (fraction f de la profondeur)
        let d = curve(depth, 1);
        for (let i = N; i >= 0; i--) {
          const u = -1 + (2 * i) / N, x = CX + u * HW, y = SY + depth * prof(u) * (1 - f);
          d += ' L ' + x.toFixed(1) + ',' + y.toFixed(1);
        }
        return d + ' Z';
      };
      const cav = a.path(curve(0, 1) + ' Z', 'zp-cavity', null, { 'data-info': 'zp-ocl' });
      const ost = a.path('', 'zp-osteoid', null, { 'data-info': 'zp-osteoid' });
      const nb = a.path('', 'zp-newbone', null, { 'data-info': 'zp-osteoid' });
      // Cellules bordantes (hors de la zone active et dans la zone)
      const lining = a.el('g', { 'data-info': 'zp-lin' }), linZone = a.el('g', { 'data-info': 'zp-lin' });
      for (let x = 90; x < 1070; x += 46) {
        const inZone = Math.abs(x - CX) < HW + 10;
        a.el('ellipse', { cx: x, cy: SY - 5, rx: 20, ry: 5, class: 'zp-lining' }, inZone ? linZone : lining);
      }
      // Précurseurs (activation)
      const pre = a.el('g', { 'data-info': 'zp-ocl' });
      const preC = [0, 1, 2].map(() => a.el('circle', { r: 11, class: 'zp-ocl' }, pre));
      // Ostéoclastes
      const ocls = [-0.42, 0.05, 0.48].map(() => {
        const o = a.el('g', { 'data-info': 'zp-ocl' });
        a.el('path', { d: 'M -46,8 C -48,-30 48,-30 46,8 Z', class: 'zp-ocl' }, o);
        [-22, -6, 10, 26].forEach((x) => a.el('circle', { cx: x, cy: -8, r: 5.5, class: 'zp-nuc' }, o));
        a.path('M -42,8 q 5,6 10,0 t 10,0 t 10,0 t 10,0 t 10,0 t 10,0 t 10,0 t 10,0', 'zp-villi', o);
        return o;
      });
      const revs = [-0.5, -0.15, 0.2, 0.55].map(() => { const r = a.el('g', { 'data-info': 'zp-rev' }); a.el('ellipse', { rx: 16, ry: 9, class: 'zp-rev' }, r); return r; });
      const obls = [];
      for (let i = 0; i < 9; i++) { const o = a.el('g', { 'data-info': 'zp-obl' }); a.el('rect', { x: -15, y: -26, width: 30, height: 26, rx: 7, class: 'zp-obl' }, o); a.el('circle', { cx: 0, cy: -15, r: 5, class: 'zp-nuc' }, o); obls.push(o); }
      const newCytes = [-0.35, 0.3].map(() => { const o = a.el('g', { 'data-info': 'zp-ocy3' }); a.el('ellipse', { rx: 16, ry: 9, class: 'zp-cyte' }, o); return o; });
      const lblOcl = a.text(0, 0, 'ostéoclastes', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zp-ocl' } });
      const lblObl = a.text(0, 0, 'ostéoblastes', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zp-obl' } });
      a.flow(`M ${CX},${SY + 60} C ${CX + 20},${SY - 40} ${CX + 80},300 ${CX + 120},262`, { mol: 'ca', rate: () => (ph === 1 ? 4 * mode.res : 0), size: 1.2, speed: 60, track: false, max: 30 });
      const caLbl = a.text(CX + 140, 318, 'Ca²⁺, phosphate libérés', 'note', { attrs: { 'data-info': 'zp-ocl' } });

      // Frise des phases
      const PH = [['activation', 0.1], ['résorption', 0.25], ['inversion', 0.1], ['formation', 0.35], ['minéralisation', 0.2]];
      const PCOL = ['p-grey', 'p-violet', 'p-teal', 'p-sky', 'p-gold'];
      const T0 = 80, TW = 990, TY = 585;
      let acc = 0;
      const starts = [];
      PH.forEach(([t, f], i) => {
        starts.push(acc);
        a.el('rect', { x: T0 + acc * TW, y: TY, width: f * TW, height: 34, class: 'zp-seg', fill: `color-mix(in srgb, var(--${PCOL[i]}) 35%, var(--scene-1))` });
        a.text(T0 + (acc + f / 2) * TW, TY + 23, t, 'zp-seg-t', { anchor: 'middle' });
        acc += f;
      });
      const cur = a.el('path', { d: 'M -9,-14 L 9,-14 L 0,0 Z', class: 'zp-cursor' });
      a.text(T0, TY + 66, 'Cycle complet : environ 3 à 6 mois (complément) · animation très accélérée', 'note');

      /* --- RANKL / OPG --- */
      panel(a, 1120, 165, 430, 285, 'zp-rankl');
      a.text(1142, 202, 'RANKL / RANK / OPG', 'lbl-h', { attrs: { 'data-info': 'zp-rankl' } });
      const rk = a.el('g', { 'data-info': 'zp-rankl' });
      a.el('ellipse', { cx: 1195, cy: 290, rx: 56, ry: 40, class: 'zp-obl' }, rk);
      a.el('circle', { cx: 1190, cy: 290, r: 12, class: 'zp-nuc' }, rk);
      a.el('ellipse', { cx: 1478, cy: 290, rx: 52, ry: 40, class: 'zp-ocl' }, rk);
      a.el('circle', { cx: 1485, cy: 290, r: 12, class: 'zp-nuc' }, rk);
      [262, 290, 318].forEach((y) => {
        a.path(`M 1250,${y} L 1300,${y}`, 'zp-canal', rk, { style: 'stroke: var(--p-violet); opacity: 1; stroke-width: 4' });
        a.el('circle', { cx: 1306, cy: y, r: 7, class: 'zp-ocl' }, rk);
        a.path(`M 1426,${y} L 1380,${y} M 1380,${y - 9} L 1370,${y - 9} L 1370,${y + 9} L 1380,${y + 9}`, 'zp-canal', rk, { style: 'stroke: var(--p-green); opacity: 1; stroke-width: 4' });
      });
      a.path('M 1322,232 l 10,14 l 10,-14 M 1332,246 l 0,14', 'zp-g-opg', rk);
      a.text(1352, 242, 'OPG', 'note strong', null, rk);
      a.text(1278, 246, 'RANKL', 'note strong', { anchor: 'middle' }, rk);
      a.text(1398, 350, 'RANK', 'note strong', { anchor: 'middle' }, rk);
      a.text(1195, 356, 'ostéoblaste', 'note', { anchor: 'middle' }, rk);
      a.text(1478, 372, 'précurseur', 'note', { anchor: 'middle' }, rk);
      a.text(1478, 394, 'd\'ostéoclaste', 'note', { anchor: 'middle' }, rk);
      a.text(1142, 410, 'OPG : leurre qui capte RANKL', 'note', null, rk);
      a.text(1142, 436, 'dénosumab : anti-RANKL', 'note strong', null, rk);

      /* --- Sclérostine --- */
      panel(a, 1120, 465, 430, 205, 'zp-scl');
      a.text(1142, 502, 'Sclérostine', 'lbl-h', { attrs: { 'data-info': 'zp-scl' } });
      a.text(1290, 502, 'ostéocyte mécanosensible', 'note', { attrs: { 'data-info': 'zp-scl' } });
      const so = a.el('g', { 'data-info': 'zp-ocy3', transform: 'translate(1190 555)' });
      for (let k = 0; k < 6; k++) { const an = (k / 6) * Math.PI * 2; a.path(`M 0,0 L ${Math.cos(an) * 44},${Math.sin(an) * 30}`, 'zp-canal', so); }
      a.el('ellipse', { rx: 26, ry: 15, class: 'zp-cyte' }, so);
      a.text(1190, 600, 'ostéocyte', 'note', { anchor: 'middle', attrs: { 'data-info': 'zp-ocy3' } });
      const sob = a.el('g', { 'data-info': 'zp-obl' });
      a.el('rect', { x: 1452, y: 533, width: 52, height: 44, rx: 10, class: 'zp-obl' }, sob);
      a.text(1478, 600, 'ostéoblaste', 'note', { anchor: 'middle' }, sob);
      a.path('M 1244,555 L 1438,555', 'ax-track inhib', null, { 'data-info': 'zp-scl' });
      a.sign(1438, 555, 'inhib').set(1);
      a.flow('M 1240,555 L 1420,555', { mol: 'zp-scl', rate: () => 1, size: 1.1, speed: 50, track: false, max: 8 });
      a.text(1340, 537, 'voie Wnt ⊖', 'note', { anchor: 'middle', attrs: { 'data-info': 'zp-scl' } });
      a.text(1142, 632, 'charge mécanique : sclérostine ↓', 'note', { attrs: { 'data-info': 'zp-scl' } });
      a.text(1142, 658, 'romosozumab : anti-sclérostine', 'note strong', { attrs: { 'data-info': 'zp-scl' } });

      /* --- PTH : continue ou intermittente --- */
      const pg = a.el('g', { 'data-info': 'zp-pthmode' });
      a.el('rect', { x: 50, y: 690, width: 620, height: 270, rx: 22, class: 'zp-panel' }, pg);
      a.text(72, 726, 'PTH et remodelage', 'lbl-h', null, pg);
      HV.figBadge(a, 640, 718, ['13', '12']);
      const MODES = [
        { res: 1, form: 1, speed: 1, txt: ['Équilibre : l\'os reformé comble', 'la lacune (polycopié p. 35)'] },
        { res: 1.3, form: 0.78, speed: 1.35, txt: ['Hyperparathyroïdie : résorption > formation,', 'déminéralisation, ostéoporose (p. 40–41)'] },
        { res: 1, form: 1.18, speed: 1, txt: ['Tériparatide : la formation l\'emporte,', 'effet anabolique (complément)'] }
      ];
      let mode = MODES[0];
      const bal = [];
      const bx = 400;
      a.text(bx, 770, 'résorption', 'note', { attrs: { 'data-info': 'zp-balance' } });
      bal.push(gauge(a, bx, 780, 240, 'p-violet'));
      a.text(bx, 820, 'formation', 'note', { attrs: { 'data-info': 'zp-balance' } });
      bal.push(gauge(a, bx, 830, 240, 'p-sky'));
      const balT = a.text(bx, 870, '', 'note strong', { attrs: { 'data-info': 'zp-balance' } });
      const modeT = a.text(72, 914, '', 'note');
      const pb = buttons(remo, a, 72, 744, ['PTH normale', 'PTH continue (excès)', 'PTH intermittente'], (i) => {
        mode = MODES[i];
        bal[0](mode.res / 1.5); bal[1]((mode.res * mode.form) / 1.5);
        balT.textContent = 'bilan : ' + (mode.form < 0.95 ? 'perte osseuse' : mode.form > 1.05 ? 'gain osseux' : 'équilibré');
        modeT.textContent = '';
        mode.txt.forEach((s, k) => a.el('tspan', { x: 72, dy: k ? '1.3em' : 0, text: s }, modeT));
      }, { vertical: true, w: 300, h: 40, gap: 9 });
      pb.pick(0);

      /* --- Traitements --- */
      a.el('rect', { x: 690, y: 690, width: 860, height: 270, rx: 22, class: 'zp-panel' });
      a.text(712, 726, 'Cibles des traitements (complément)', 'lbl-h');
      [['zp-bp', 'Bisphosphonates', ['fixés sur l\'os,', 'inhibent les', 'ostéoclastes', 'résorption ↓']],
        ['zp-dmab', 'Dénosumab', ['anticorps', 'anti-RANKL', 'résorption ↓', 'réversible à l\'arrêt']],
        ['zp-romo', 'Romosozumab', ['anticorps', 'anti-sclérostine', 'formation ↑', 'résorption ↓']],
        ['zp-teri', 'Tériparatide', ['PTH (1-34),', 'injection', 'quotidienne', 'formation ↑']]
      ].forEach(([inf, t, lines], i) => {
        const x = 712 + i * 206;
        const cg = a.el('g', { 'data-info': inf });
        a.el('rect', { x, y: 746, width: 194, height: 196, rx: 16, class: 'side-box' }, cg);
        a.text(x + 16, 778, t, 'lbl-s strong', null, cg);
        lines.forEach((ln, k) => a.text(x + 16, 812 + k * 30, ln, 'note', null, cg));
      });

      /* --- Animation du cycle --- */
      const CYCLE = 22;
      let t = 0, ph = 0, lock = -1;
      const NAMES = ['Activation', 'Résorption', 'Inversion', 'Formation', 'Minéralisation'];
      const ptAt = (u, depth, f) => [CX + u * HW, SY + depth * prof(u) * (1 - (f || 0))];
      a.dyn((dt) => {
        t += (dt * mode.speed) / CYCLE;
        if (lock >= 0) { const s0 = starts[lock], s1 = s0 + PH[lock][1]; if (t < s0 || t >= s1) t = s0 + ((t - s0) % (s1 - s0) + (s1 - s0)) % (s1 - s0); }
        t = ((t % 1) + 1) % 1;
        ph = 4;
        for (let i = 0; i < 5; i++) if (t < starts[i] + PH[i][1]) { ph = i; break; }
        const loc = (t - starts[ph]) / PH[ph][1];
        const Dmax = 120 * mode.res;
        const depth = ph === 0 ? 0 : ph === 1 ? Dmax * loc : Dmax;
        const fill = ph < 3 ? 0 : ph === 3 ? mode.form * loc : mode.form;
        const mine = ph < 3 ? 0 : ph === 3 ? Math.max(0, mode.form * (loc - 0.4)) : lerp(mode.form * 0.6, mode.form, loc);
        cav.setAttribute('d', curve(depth, 1) + ' Z');
        ost.setAttribute('d', depth > 0 && fill > 0 ? region(depth, fill) : '');
        nb.setAttribute('d', depth > 0 && mine > 0 ? region(depth, mine) : '');
        linZone.setAttribute('opacity', ph === 0 ? (1 - loc).toFixed(2) : ph === 4 && loc > 0.6 ? ((loc - 0.6) / 0.4).toFixed(2) : 0);
        pre.setAttribute('opacity', ph === 0 ? 1 : 0);
        preC.forEach((c, i) => { c.setAttribute('cx', CX - 120 + i * 120); c.setAttribute('cy', (262 + (SY - 30 - 262) * (ph === 0 ? loc : 1)).toFixed(1)); });
        ocls.forEach((o, i) => {
          const u = [-0.42, 0.05, 0.48][i], p = ptAt(u, depth);
          o.setAttribute('transform', `translate(${p[0].toFixed(1)} ${(p[1] - 8).toFixed(1)})`);
          o.setAttribute('opacity', ph === 1 ? 1 : 0);
        });
        lblOcl.setAttribute('opacity', ph === 1 ? 1 : 0);
        lblOcl.setAttribute('x', CX - 160); lblOcl.setAttribute('y', SY - 60);
        revs.forEach((r, i) => { const p = ptAt([-0.5, -0.15, 0.2, 0.55][i], depth); r.setAttribute('transform', `translate(${p[0].toFixed(1)} ${(p[1] - 9).toFixed(1)})`); r.setAttribute('opacity', ph === 2 ? 1 : 0); });
        obls.forEach((o, i) => {
          const u = -0.8 + i * 0.2, p = ptAt(u, depth, fill);
          o.setAttribute('transform', `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
          o.setAttribute('opacity', ph === 3 || (ph === 4 && loc < 0.7) ? 1 : 0);
        });
        lblObl.setAttribute('opacity', ph === 3 || (ph === 4 && loc < 0.7) ? 1 : 0);
        lblObl.setAttribute('x', CX + 150); lblObl.setAttribute('y', SY - 60);
        newCytes.forEach((o, i) => { const p = ptAt([-0.35, 0.3][i], depth, 0.45); o.setAttribute('transform', `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`); o.setAttribute('opacity', ph === 4 ? clamp(loc * 2, 0, 1).toFixed(2) : 0); });
        caLbl.setAttribute('opacity', ph === 1 ? 1 : 0);
        cur.setAttribute('transform', `translate(${(T0 + t * TW).toFixed(1)} ${TY})`);
        phaseT.textContent = 'Phase : ' + NAMES[ph].toLowerCase();
      });

      HV.spotlight(remo, a, [
        { t: 'Activation', d: 'Les cellules bordantes se rétractent ; des précurseurs d\'ostéoclastes arrivent de la moelle (complément).', spot: [[60, 215, 1030, 420]], ph: 0 },
        { t: 'Résorption', d: 'Les ostéoclastes, cellules géantes multinucléées, creusent une lacune et libèrent calcium et phosphate (complément). La PTH stimule la résorption osseuse (polycopié p. 36).', spot: [[60, 215, 1030, 420]], ph: 1 },
        { t: 'Inversion', d: 'Des cellules mononucléées préparent le fond de la lacune (complément).', spot: [[60, 215, 1030, 420]], ph: 2 },
        { t: 'Formation puis minéralisation', d: 'Les ostéoblastes déposent l\'ostéoïde, qui se minéralise ; certains deviennent ostéocytes. Le flux de calcium est équilibré entre résorption et minéralisation (polycopié p. 35–36).', spot: [[60, 215, 1030, 420]], ph: 3 },
        { t: 'RANKL et OPG', d: 'RANKL des ostéoblastes et ostéocytes active RANK des précurseurs d\'ostéoclastes ; l\'OPG est un leurre. Le dénosumab bloque RANKL (complément).', spot: [[1120, 165, 430, 285]] },
        { t: 'Sclérostine', d: 'L\'ostéocyte freine la formation par la sclérostine (voie Wnt) ; la charge mécanique la diminue. Le romosozumab la neutralise (complément).', spot: [[1120, 465, 430, 205]] },
        { t: 'PTH continue ou intermittente', d: 'L\'excès chronique de PTH (hyperparathyroïdie) déminéralise l\'os : ostéoporose (polycopié p. 40–41). L\'injection quotidienne de tériparatide favorise la formation (complément).', spot: [[50, 690, 620, 270]], mode: 1 },
        { t: 'Cibles des traitements', d: 'Antirésorptifs (bisphosphonates, dénosumab), anti-sclérostine (romosozumab), anabolique (tériparatide) (complément).', spot: [[690, 690, 860, 270]] }
      ]);
      const base = remo.stepTo;
      remo.stepTo = function (i) {
        base(i);
        const s = i >= 0 ? remo.steps[i] : null;
        lock = s && s.ph != null ? s.ph : -1;
        if (s && s.ph === 3) lock = -1, t = starts[3];
        if (s && s.ph != null && s.ph !== 3) t = starts[s.ph];
        if (s && s.mode != null) pb.pick(s.mode);
      };
    }
  }, HV.LOUPE.R(2)));
})();
