/*
 * Iconographie schématique (dessins originaux, pas des images de patients) :
 * échographie, IRM, scanner, scintigraphie et histologie, en version normale et pathologique.
 * Chaque planche est dessinée dans un repère 320 × 220.
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const NS = 'http://www.w3.org/2000/svg';
  let uid = 0;
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const txt = (p, x, y, s, cls, anchor) => { const t = el('text', { x, y, class: 'img-t ' + (cls || ''), 'text-anchor': anchor || 'start' }, p); t.textContent = s; return t; };
  const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, x, y) => 320 - parseFloat(x) + ',' + y);

  // Filtres propres à chaque planche : grain échographique et flou d'IRM
  function base(svg, bg) {
    const id = 'im' + ++uid;
    const defs = el('defs', null, svg);
    const f = el('filter', { id: id + 's', x: 0, y: 0, width: '100%', height: '100%' }, defs);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.85', numOctaves: 2, seed: uid, result: 'n' }, f);
    el('feColorMatrix', { in: 'n', type: 'saturate', values: 0, result: 'g' }, f);
    el('feComposite', { in: 'g', in2: 'SourceGraphic', operator: 'in' }, f);
    const b = el('filter', { id: id + 'b' }, defs);
    el('feGaussianBlur', { stdDeviation: 1.6 }, b);
    el('rect', { width: 320, height: 220, fill: bg || '#050608' }, svg);
    return { speck: `url(#${id}s)`, blur: `url(#${id}b)`, defs, id };
  }
  // Tissu échographique : niveau de gris + grain
  const tissue = (svg, B, d, gray, opa) => {
    el('path', { d, fill: gray }, svg);
    el('path', { d, fill: '#fff', filter: B.speck, opacity: opa == null ? 0.45 : opa }, svg);
  };

  const P = {};

  /* ---------------- Thyroïde : échographie (coupe transversale) ---------------- */
  P['thyroid-echo'] = {
    title: 'Échographie thyroïdienne, coupe transversale',
    variants: [
      ['normal', 'Normale', 'Parenchyme homogène, hyperéchogène par rapport aux muscles sous-hyoïdiens ; trachée médiane avec cône d\'ombre ; carotides et jugulaires anéchogènes en dehors (complément ; voir polycopié, figure 6).'],
      ['nodule', 'Adénome toxique', 'Nodule solide unique, bien limité, entouré d\'un fin halo (complément) ; le reste du parenchyme est normal (et éteint en scintigraphie).'],
      ['graves', 'Basedow', 'Glande augmentée de volume, globalement hypoéchogène, très vascularisée en Doppler couleur (aspect « d\'enfer thyroïdien » ; complément).'],
      ['hashi', 'Hashimoto', 'Parenchyme hypoéchogène et hétérogène, micronodulaire, cloisonné ; glande parfois atrophique (complément).'],
      ['gmn', 'Goitre multinodulaire', 'Glande augmentée de volume contenant plusieurs nodules d\'échogénicité variable, parfois kystiques.']
    ],
    draw(svg, v) {
      const B = base(svg);
      el('path', { d: 'M 10,18 L 310,18 L 310,212 L 10,212 Z', fill: '#0c0d10' }, svg);
      tissue(svg, B, 'M 10,18 L 310,18 L 310,40 L 10,40 Z', '#6d6d6d', 0.5); // peau, sous-cutané
      tissue(svg, B, 'M 40,40 C 90,46 120,52 140,58 L 180,58 C 200,52 230,46 280,40 L 280,52 C 230,58 200,66 180,70 L 140,70 C 120,66 90,58 40,52 Z', '#3a3a3a', 0.35); // muscles sous-hyoïdiens
      const big = v === 'graves' || v === 'gmn' ? 1.18 : v === 'hashi' ? 0.92 : 1;
      const k = (x, y) => `${160 + (x - 160) * big},${70 + (y - 70) * big}`;
      const lobe = `M ${k(140, 72)} C ${k(120, 74)} ${k(84, 80)} ${k(72, 110)} C ${k(64, 140)} ${k(88, 162)} ${k(118, 160)} C ${k(136, 158)} ${k(146, 132)} ${k(146, 104)} Z`;
      const gray = v === 'graves' ? '#5c5c5c' : v === 'hashi' ? '#565656' : '#8a8a8a';
      tissue(svg, B, lobe, gray);
      tissue(svg, B, mirror(lobe), gray);
      tissue(svg, B, `M ${k(140, 72)} L ${k(180, 72)} L ${k(178, 88)} L ${k(142, 88)} Z`, gray);
      // Trachée et cône d'ombre
      el('path', { d: 'M 136,104 C 136,82 184,82 184,104', fill: 'none', stroke: '#d8d8d8', 'stroke-width': 3 }, svg);
      el('path', { d: 'M 138,104 L 182,104 L 196,212 L 124,212 Z', fill: '#020203' }, svg);
      // Vaisseaux
      [[52, 132, 15], [268, 132, 15]].forEach(([x, y, r]) => el('circle', { cx: x, cy: y, r, fill: '#050506', stroke: '#9a9a9a', 'stroke-width': 1.5 }, svg));
      [[40, 104, 10], [280, 104, 10]].forEach(([x, y, r]) => el('ellipse', { cx: x, cy: y, rx: r + 4, ry: r - 2, fill: '#050506' }, svg));
      if (v === 'nodule') {
        el('ellipse', { cx: 222, cy: 118, rx: 24, ry: 20, fill: 'none', stroke: '#1b1b1b', 'stroke-width': 4 }, svg);
        tissue(svg, B, 'M 200,118 A 22,18 0 1 0 244,118 A 22,18 0 1 0 200,118 Z', '#9c9c9c');
      }
      if (v === 'graves') {
        for (let i = 0; i < 26; i++) {
          const x = (i % 2 ? 196 : 78) + ((i * 37) % 46), y = 92 + ((i * 53) % 70);
          el('path', { d: `M ${x},${y} q 4,-6 8,0 t 8,0`, fill: 'none', stroke: i % 3 ? '#e0342e' : '#2f6fe0', 'stroke-width': 2.4, opacity: 0.9 }, svg);
        }
      }
      if (v === 'hashi') {
        for (let i = 0; i < 22; i++) el('ellipse', { cx: (i % 2 ? 196 : 86) + ((i * 29) % 40), cy: 92 + ((i * 41) % 62), rx: 5, ry: 4, fill: '#2a2a2a', opacity: 0.85 }, svg);
        [[96, 110, 128, 140], [204, 104, 226, 150]].forEach(([x1, y1, x2, y2]) => el('path', { d: `M ${x1},${y1} L ${x2},${y2}`, stroke: '#b0b0b0', 'stroke-width': 1.4 }, svg));
      }
      if (v === 'gmn') {
        [[96, 106, 14, '#a8a8a8'], [110, 146, 11, '#4a4a4a'], [216, 102, 13, '#b2b2b2'], [236, 140, 12, '#090909']].forEach(([x, y, r, g]) => {
          el('circle', { cx: x, cy: y, r: r + 2, fill: 'none', stroke: '#1d1d1d', 'stroke-width': 2 }, svg);
          tissue(svg, B, `M ${x - r},${y} A ${r},${r} 0 1 0 ${x + r},${y} A ${r},${r} 0 1 0 ${x - r},${y} Z`, g, g === '#090909' ? 0 : 0.45);
        });
      }
      txt(svg, 16, 32, 'D', 'img-w');
      txt(svg, 304, 32, 'G', 'img-w', 'end');
    }
  };

  /* ---------------- Thyroïde : scintigraphie à l'iode 123 ---------------- */
  P['thyroid-scinti'] = {
    title: 'Scintigraphie thyroïdienne à l\'iode 123',
    variants: [
      ['normal', 'Normale', 'Fixation homogène des deux lobes, modérée.'],
      ['nodule', 'Adénome toxique', 'Nodule hyperfixant (« chaud ») avec extinction du reste du parenchyme (TSH effondrée). Polycopié, figure 9A.'],
      ['graves', 'Basedow', 'Fixation diffuse, homogène et intense de toute la glande. Polycopié, figure 9B.'],
      ['blank', 'Thyroïdite, surcharge iodée, LT4', 'Hypofixation globale (« scintigraphie blanche ») : thyroïdite, médicamenteuse ou autre (polycopié) ; surcharge iodée, prise d\'hormones thyroïdiennes (complément).']
    ],
    draw(svg, v) {
      base(svg, '#000');
      const lobe = 'M 152,92 C 148,60 128,36 108,36 C 82,36 74,72 74,110 C 74,152 92,182 116,182 C 138,182 150,160 152,134 Z';
      const g = el('g', null, svg);
      const lvl = v === 'graves' ? 0.95 : v === 'normal' ? 0.55 : v === 'nodule' ? 0.07 : 0.03;
      [lobe, mirror(lobe), 'M 148,120 L 172,120 L 172,140 L 148,140 Z'].forEach((d) => el('path', { d, fill: '#ffb000', 'fill-opacity': lvl, filter: 'blur(2px)' }, g));
      if (v === 'graves') [lobe, mirror(lobe)].forEach((d) => el('path', { d, fill: '#fff4c8', 'fill-opacity': 0.35, transform: 'translate(0 4)' }, g));
      if (v === 'nodule') {
        el('circle', { cx: 212, cy: 118, r: 30, fill: '#ffb000', filter: 'blur(4px)' }, g);
        el('circle', { cx: 212, cy: 118, r: 16, fill: '#fff6d0', filter: 'blur(3px)' }, g);
      }
      txt(svg, 16, 26, 'Face antérieure', 'img-w');
    }
  };

  /* ---------------- Thyroïde : histologie ---------------- */
  P['thyroid-histo'] = {
    title: 'Histologie thyroïdienne',
    variants: [
      ['normal', 'Normale', 'Follicules bordés de thyréocytes cubiques, remplis de colloïde ; cellules C entre les follicules. Polycopié, figure 1.'],
      ['graves', 'Basedow', 'Thyréocytes hauts (cylindriques), colloïde raréfiée et « festonnée » par les vacuoles de résorption (complément).'],
      ['hashi', 'Hashimoto', 'Infiltrat lymphocytaire avec follicules lymphoïdes à centre germinatif ; follicules thyroïdiens atrophiques (complément).']
    ],
    draw(svg, v) {
      base(svg, '#f3e6ee');
      const tall = v === 'graves';
      const fol = [[60, 60, 34], [140, 50, 28], [220, 64, 36], [92, 140, 30], [176, 134, 38], [262, 148, 30], [36, 190, 22], [130, 200, 20]];
      fol.forEach(([x, y, r], i) => {
        if (v === 'hashi' && i % 3 === 0) return;
        const rr = v === 'hashi' ? r * 0.6 : r;
        el('circle', { cx: x, cy: y, r: rr, fill: '#c24d86', opacity: 0.85 }, svg); // épithélium
        el('circle', { cx: x, cy: y, r: rr - (tall ? 10 : 5), fill: tall ? '#f2b7d3' : '#e98cbb' }, svg); // colloïde
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * 2 * Math.PI;
          el('circle', { cx: x + Math.cos(a) * (rr - (tall ? 6 : 2.5)), cy: y + Math.sin(a) * (rr - (tall ? 6 : 2.5)), r: 1.8, fill: '#4b1d55' }, svg);
          if (tall && k % 2) el('circle', { cx: x + Math.cos(a) * (rr - 13), cy: y + Math.sin(a) * (rr - 13), r: 3, fill: '#fbe3ee' }, svg);
        }
      });
      if (v === 'hashi') {
        el('circle', { cx: 100, cy: 100, r: 46, fill: '#5b4aa2', opacity: 0.25 }, svg);
        for (let i = 0; i < 160; i++) el('circle', { cx: 100 + Math.cos(i * 2.4) * (i % 46), cy: 100 + Math.sin(i * 2.4) * (i % 46), r: 2, fill: '#3b2a7a' }, svg);
        el('circle', { cx: 100, cy: 100, r: 16, fill: '#c8b8ee', opacity: 0.8 }, svg);
      }
      if (v === 'normal') [[104, 96], [196, 92], [60, 104]].forEach(([x, y]) => el('ellipse', { cx: x, cy: y, rx: 6, ry: 4, fill: '#d9a6c2', stroke: '#7a3d63' }, svg));
    }
  };

  /* ---------------- Hypophyse : IRM sagittale T1 ---------------- */
  P['pit-mri'] = {
    title: 'IRM hypophysaire, coupe sagittale T1',
    variants: [
      ['normal', 'Normale', 'Glande dans la selle turcique, tige médiane, hypersignal spontané de la posthypophyse (complément) ; chiasma optique au-dessus.'],
      ['micro', 'Microadénome', 'Lésion < 10 mm (polycopié, figure 22A), en hyposignal T1 par rapport à la glande saine (complément).'],
      ['macro', 'Macroadénome', 'Lésion ≥ 10 mm avec extension suprasellaire au contact du chiasma (risque d\'hémianopsie bitemporale) et parfois vers le sinus sphénoïdal (polycopié, figure 22B).'],
      ['hypophysite', 'Hypophysite', 'Bombement de l\'hypophyse au contact du chiasma optique, légèrement refoulé vers le haut (polycopié, figure 23) ; épaississement de la tige possible (complément).'],
      ['di', 'Diabète insipide central', 'Perte de l\'hypersignal spontané de la posthypophyse (complément) ; analyser l\'épaisseur de la tige.']
    ],
    draw(svg, v) {
      const B = base(svg, '#000');
      el('path', { d: 'M 0,0 L 320,0 L 320,90 C 250,70 200,64 160,70 C 110,76 60,92 0,104 Z', fill: '#5a5a5a', filter: B.blur }, svg); // cerveau
      el('path', { d: 'M 0,220 L 0,170 C 60,160 110,170 120,150 L 210,150 C 230,168 280,172 320,170 L 320,220 Z', fill: '#262626', filter: B.blur }, svg); // base du crâne
      el('path', { d: 'M 96,196 C 100,180 120,176 160,178 C 200,176 220,182 226,198 L 226,220 L 96,220 Z', fill: '#060606' }, svg); // sinus sphénoïdal
      el('path', { d: 'M 120,150 C 118,190 210,190 210,150', fill: 'none', stroke: '#141414', 'stroke-width': 10 }, svg); // plancher sellaire (os cortical)
      el('ellipse', { cx: 132, cy: v === 'hypophysite' ? 91 : 98, rx: 28, ry: 7, fill: '#7a7a7a', filter: B.blur }, svg); // chiasma (refoulé vers le haut dans l'hypophysite)
      const big = v === 'hypophysite' ? 1.25 : 1;
      el('path', { d: `M 160,96 C 156,112 ${162 - 3 * big},124 ${158 - 2 * big},140 L ${168 + 2 * big},140 C ${166 + 3 * big},124 168,112 168,96 Z`, fill: '#7b7b7b', filter: B.blur, transform: v === 'hypophysite' ? 'translate(-4 0) scale(1.03 1)' : null }, svg); // tige
      el('path', { d: `M ${130 - 6 * big},158 C ${128 - 6 * big},${144 - 4 * big} 150,140 168,142 C 178,144 184,150 182,166 C 178,${176 + 4 * big} ${140 - 4 * big},${178 + 4 * big} ${130 - 6 * big},158 Z`, fill: '#8a8a8a', filter: B.blur }, svg); // antéhypophyse
      if (v !== 'di') el('ellipse', { cx: 188, cy: 156, rx: 10, ry: 9, fill: '#f2f2f2', filter: B.blur }, svg); // hypersignal posthypophysaire
      else el('ellipse', { cx: 188, cy: 156, rx: 10, ry: 9, fill: '#7a7a7a', filter: B.blur }, svg);
      if (v === 'micro') el('ellipse', { cx: 146, cy: 158, rx: 7, ry: 6, fill: '#4b4b4b', filter: B.blur }, svg);
      if (v === 'macro') {
        el('path', { d: 'M 118,170 C 108,140 122,100 152,96 C 182,92 196,120 192,148 C 190,170 170,186 146,186 C 132,186 122,180 118,170 Z', fill: '#9d9d9d', filter: B.blur }, svg);
        el('ellipse', { cx: 132, cy: 88, rx: 28, ry: 6, fill: '#7a7a7a', filter: B.blur }, svg);
      }
      txt(svg, 132, 82, 'chiasma', 'img-w', 'middle');
      txt(svg, 160, 214, 'sinus sphénoïdal', 'img-w', 'middle');
      txt(svg, 14, 24, 'Ant.', 'img-w');
    }
  };

  /* ---------------- Surrénales : scanner axial ---------------- */
  P['adrenal-ct'] = {
    title: 'Scanner surrénalien, coupe axiale',
    variants: [
      ['normal', 'Normal', 'Surrénales fines en Y ou en V inversé, en arrière de la veine cave (droite) et en dehors de l\'aorte (gauche).'],
      ['adenoma', 'Adénome', 'Nodule unilatéral, rond, homogène, bien limité. En faveur de la bénignité (polycopié) : taille < 4 cm, densité spontanée < 10 UH (riche en lipides ; sensibilité 71 %, spécificité 98 % pour l\'adénome), lavage (wash-out) absolu > 60 % ou relatif > 40 %.'],
      ['hyper', 'Hyperplasie bilatérale', 'Surrénales épaissies des deux côtés (excès d\'ACTH ; dans l\'hyperaldostéronisme idiopathique, surrénales souvent normales ou micronodulaires ; complément).'],
      ['pheo', 'Phéochromocytome', 'Masse plus volumineuse, hétérogène, souvent nécrotique, à densité élevée (complément).'],
      ['atrophy', 'Atrophie', 'Surrénales grêles (insuffisance surrénale auto-immune, corticothérapie prolongée, ou côté opposé à un adénome cortisolique).']
    ],
    draw(svg, v) {
      const B = base(svg, '#000');
      el('ellipse', { cx: 160, cy: 116, rx: 150, ry: 98, fill: '#4c4c4c' }, svg); // abdomen
      el('ellipse', { cx: 160, cy: 116, rx: 140, ry: 88, fill: '#5f5f5f' }, svg);
      el('path', { d: 'M 22,110 C 30,50 100,30 150,40 C 150,80 130,110 96,120 C 70,128 40,130 22,110 Z', fill: '#8a8a8a' }, svg); // foie
      el('path', { d: 'M 210,50 C 250,48 286,70 292,100 C 260,96 230,90 210,70 Z', fill: '#7a7a7a' }, svg); // rate
      el('circle', { cx: 160, cy: 188, r: 22, fill: '#e8e8e8' }, svg); // vertèbre
      el('circle', { cx: 160, cy: 188, r: 12, fill: '#888' }, svg);
      el('circle', { cx: 170, cy: 150, r: 10, fill: '#aaa' }, svg); // aorte
      el('ellipse', { cx: 136, cy: 140, rx: 12, ry: 8, fill: '#9a9a9a' }, svg); // VCI
      el('ellipse', { cx: 96, cy: 166, rx: 26, ry: 20, fill: '#9a9a9a' }, svg); // rein droit (pôle sup)
      el('ellipse', { cx: 228, cy: 166, rx: 26, ry: 20, fill: '#9a9a9a' }, svg);
      const w = v === 'hyper' ? 6 : v === 'atrophy' ? 1.6 : 3.2;
      const adr = (x, y, flip) => el('path', { d: `M ${x},${y} l ${flip * 10},-22 M ${x},${y} l ${flip * 18},-10 M ${x},${y} l ${-flip * 2},16`, stroke: '#3a3a3a', 'stroke-width': w, 'stroke-linecap': 'round', fill: 'none' }, svg);
      adr(118, 148, -1);
      adr(198, 146, 1);
      if (v === 'adenoma') el('circle', { cx: 210, cy: 134, r: 13, fill: '#575757', stroke: '#2e2e2e' }, svg);
      if (v === 'pheo') {
        el('circle', { cx: 214, cy: 128, r: 26, fill: '#8d8d8d' }, svg);
        el('path', { d: 'M 204,120 C 212,112 226,120 222,132 C 216,140 204,134 204,120 Z', fill: '#4a4a4a' }, svg);
      }
      txt(svg, 14, 24, 'D', 'img-w');
      txt(svg, 306, 24, 'G', 'img-w', 'end');
    }
  };

  /* ---------------- Surrénale : histologie ---------------- */
  P['adrenal-histo'] = {
    title: 'Histologie de la glande surrénale',
    variants: [['normal', 'Normale', 'De la capsule vers le centre : zone glomérulée (aldostérone), fasciculée (cortisol, 75–80 % du volume du cortex), réticulée (androgènes), médullaire (catécholamines). Polycopié, figure 25.']],
    draw(svg) {
      base(svg, '#f6eadf');
      const bands = [['#a33e5a', 18, 'capsule'], ['#e4a6b8', 16, 'glomérulée'], ['#f3d3dc', 100, 'fasciculée'], ['#d48aa5', 16, 'réticulée'], ['#8a6aa8', 60, 'médullaire']];
      let y = 6;
      bands.forEach(([c, h, l]) => {
        el('rect', { x: 10, y, width: 230, height: h, fill: c }, svg);
        if (l === 'fasciculée') for (let i = 0; i < 12; i++) el('line', { x1: 18 + i * 19, y1: y + 2, x2: 18 + i * 19, y2: y + h - 2, stroke: '#c78fa5', 'stroke-width': 1 }, svg);
        txt(svg, 248, y + h / 2 + 4, l, 'img-d');
        y += h;
      });
    }
  };

  /* ---------------- Parathyroïdes ---------------- */
  P['para-echo'] = {
    title: 'Échographie cervicale (parathyroïdes)',
    variants: [
      ['normal', 'Normale', 'Les parathyroïdes normales ne sont en général pas visibles.'],
      ['adenoma', 'Adénome parathyroïdien', 'Formation ovalaire hypoéchogène, bien limitée, en arrière du pôle inférieur du lobe thyroïdien, avec un pédicule vasculaire en Doppler (complément).']
    ],
    draw(svg, v) {
      const B = base(svg);
      el('path', { d: 'M 10,18 L 310,18 L 310,212 L 10,212 Z', fill: '#0c0d10' }, svg);
      tissue(svg, B, 'M 10,18 L 310,18 L 310,44 L 10,44 Z', '#6d6d6d', 0.5);
      tissue(svg, B, 'M 40,60 C 120,50 220,52 290,64 C 300,110 280,140 230,150 C 170,160 100,156 60,146 C 30,130 30,90 40,60 Z', '#8a8a8a');
      txt(svg, 160, 104, 'lobe thyroïdien (coupe longitudinale)', 'img-w', 'middle');
      if (v === 'adenoma') {
        tissue(svg, B, 'M 190,170 C 190,156 236,152 250,166 C 262,180 240,196 214,194 C 196,192 190,184 190,170 Z', '#2c2c2c', 0.25);
        el('path', { d: 'M 220,154 q -6,-10 4,-18', stroke: '#e0342e', 'stroke-width': 2.5, fill: 'none' }, svg);
      }
      txt(svg, 16, 34, 'Haut', 'img-w');
    }
  };
  P['para-mibi'] = {
    title: 'Scintigraphie au MIBI (sestamibi)',
    variants: [
      ['normal', 'Normale', 'Fixation thyroïdienne précoce qui s\'efface sur les clichés tardifs.'],
      ['adenoma', 'Adénome', 'Foyer qui persiste sur les clichés tardifs, sous le pôle inférieur d\'un lobe (complément).']
    ],
    draw(svg, v) {
      base(svg, '#000');
      const lobe = 'M 152,92 C 148,60 128,36 108,36 C 82,36 74,72 74,110 C 74,152 92,182 116,182 C 138,182 150,160 152,134 Z';
      [lobe, mirror(lobe)].forEach((d) => el('path', { d, fill: '#9ad0ff', 'fill-opacity': 0.12, filter: 'blur(2px)' }, svg));
      if (v === 'adenoma') {
        el('circle', { cx: 214, cy: 192, r: 15, fill: '#9ad0ff', filter: 'blur(3px)' }, svg);
        el('circle', { cx: 214, cy: 192, r: 7, fill: '#eaf6ff', filter: 'blur(2px)' }, svg);
      }
      txt(svg, 16, 26, 'Cliché tardif (2 h)', 'img-w');
    }
  };

  /* ---------------- Pancréas endocrine : histologie de l'îlot ---------------- */
  P['islet-histo'] = {
    title: 'Îlot de Langerhans (immunohistochimie schématique)',
    variants: [
      ['normal', 'Normal', 'Cellules β (insuline, ≈ 60–70 % ; complément) au centre, cellules α (glucagon) en périphérie, cellules δ (somatostatine) dispersées ; acini exocrines autour (organisation schématique ; chez l\'homme, les cellules sont plus entremêlées : complément).'],
      ['dt1', 'Diabète de type 1', 'Insulite : infiltrat lymphocytaire de l\'îlot et disparition des cellules β.'],
      ['insulinoma', 'Insulinome', 'Prolifération tumorale de cellules β, sécrétant l\'insuline de façon autonome.']
    ],
    draw(svg, v) {
      base(svg, '#f4e9e1');
      for (let i = 0; i < 40; i++) el('circle', { cx: 20 + (i % 8) * 40, cy: 20 + Math.floor(i / 8) * 46, r: 16, fill: '#e3c3cf', stroke: '#c79aad' }, svg); // acini
      el('circle', { cx: 160, cy: 110, r: v === 'insulinoma' ? 92 : 64, fill: '#f8efe9', stroke: '#b98' }, svg);
      const R = v === 'insulinoma' ? 86 : 58;
      for (let i = 0; i < 140; i++) {
        const a = i * 2.399, rr = Math.sqrt(i / 140) * R;
        const x = 160 + Math.cos(a) * rr, y = 110 + Math.sin(a) * rr;
        const periph = rr > R * 0.72;
        let c = periph ? '#e8892e' : '#2f78c4';
        if (i % 17 === 0) c = '#7f8c99';
        if (v === 'dt1' && c === '#2f78c4') c = i % 3 ? '#3a2f7a' : '#2f78c4';
        if (v === 'insulinoma') c = i % 11 === 0 ? '#e8892e' : '#2f78c4';
        el('circle', { cx: x, cy: y, r: v === 'dt1' && c === '#3a2f7a' ? 2.6 : 4, fill: c }, svg);
      }
      txt(svg, 8, 214, v === 'dt1' ? 'violet : lymphocytes' : 'bleu : β · orange : α · gris : δ', 'img-d');
    }
  };

  /* ---------------- Gonades : échographie ---------------- */
  P['ovary-echo'] = {
    title: 'Échographie ovarienne',
    variants: [
      ['normal', 'Phase folliculaire', 'Ovaire avec plusieurs petits follicules anéchogènes ; un follicule dominant (≈ 20 mm ; complément) avant l\'ovulation.'],
      ['meno', 'Ménopause, insuffisance ovarienne', 'Ovaire petit, sans follicule visible.'],
      ['sopk', 'Syndrome des ovaires polykystiques', 'Ovaires augmentés de volume (> 10 mL) avec plus de 20 follicules par ovaire (critère échographique de Rotterdam, polycopié) ; disposition périphérique et stroma augmenté (complément).']
    ],
    draw(svg, v) {
      const B = base(svg);
      el('path', { d: 'M 160,10 L 310,200 C 230,220 90,220 10,200 Z', fill: '#0c0d10' }, svg);
      const s = v === 'meno' ? 0.55 : v === 'sopk' ? 1.15 : 1;
      const ov = `M ${160 - 70 * s},110 C ${160 - 70 * s},${110 - 46 * s} ${160 + 70 * s},${110 - 46 * s} ${160 + 70 * s},110 C ${160 + 70 * s},${110 + 46 * s} ${160 - 70 * s},${110 + 46 * s} ${160 - 70 * s},110 Z`;
      tissue(svg, B, ov, v === 'sopk' ? '#9a9a9a' : '#7a7a7a');
      const fol = v === 'normal' ? [[126, 100, 7], [150, 128, 6], [196, 92, 6], [180, 118, 18], [134, 124, 5]] : v === 'sopk' ? Array.from({ length: 16 }, (_, i) => [160 + Math.cos(i / 16 * 6.28) * 64, 110 + Math.sin(i / 16 * 6.28) * 40, 6]) : [];
      fol.forEach(([x, y, r]) => el('circle', { cx: x, cy: y, r, fill: '#050505' }, svg));
    }
  };
  P['testis-echo'] = {
    title: 'Échographie testiculaire',
    variants: [
      ['normal', 'Normale', 'Testicule ovoïde homogène (15 à 20 mL), épididyme en arrière.'],
      ['small', 'Klinefelter, atrophie', 'Atrophie testiculaire, volume < 4 mL (Klinefelter, polycopié) ; aspect parfois hétérogène (complément).']
    ],
    draw(svg, v) {
      const B = base(svg);
      el('path', { d: 'M 10,18 L 310,18 L 310,212 L 10,212 Z', fill: '#0c0d10' }, svg);
      const s = v === 'small' ? 0.45 : 1;
      tissue(svg, B, `M ${160 - 110 * s},115 C ${160 - 110 * s},${115 - 70 * s} ${160 + 110 * s},${115 - 70 * s} ${160 + 110 * s},115 C ${160 + 110 * s},${115 + 70 * s} ${160 - 110 * s},${115 + 70 * s} ${160 - 110 * s},115 Z`, '#8c8c8c');
      el('path', { d: `M ${160 + 100 * s},${115 - 50 * s} C ${160 + 140 * s},${115 - 20 * s} ${160 + 140 * s},${115 + 30 * s} ${160 + 100 * s},${115 + 60 * s}`, stroke: '#5a5a5a', 'stroke-width': 12 * s, fill: 'none' }, svg);
    }
  };

  HV.IMAGING = P;

  HV.drawImaging = function (host, key, variant) {
    const p = P[key];
    host.textContent = '';
    const svg = el('svg', { viewBox: '0 0 320 220', class: 'img-svg', role: 'img', 'aria-label': p.title }, host);
    p.draw(svg, variant || p.variants[0][0]);
    return svg;
  };
})();
