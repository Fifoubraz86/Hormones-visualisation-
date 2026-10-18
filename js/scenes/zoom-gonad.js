/* Loupes des axes gonadotropes.
   Axe féminin : folliculogenèse (deux cellules – deux gonadotrophines), cycle (hormones, endomètre, glaire),
   grossesse et placenta. Axe masculin : tube séminifère, différenciation sexuelle, puberté.
   Sources : polycopié de sémiologie endocrinienne (CEEDMM), partie 2 pages 1 à 12 ; le reste est marqué « (complément) ». */
(function () {
  'use strict';
  const HV = window.HV;
  const clamp = HV.clamp;
  const G = (x, m, w) => Math.exp(-Math.pow((x - m) / w, 2));
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const f1 = (v) => v.toFixed(1).replace('.', ',');
  const POLY = 'Source : Polycopié de sémiologie endocrinienne, CEEDMM, 2e édition 2023 (partie 2) ; compléments signalés.';

  /* ---------- Outils de dessin communs ---------- */
  // Flèche avec pointe : marqueur propre à chaque scène (le contenu d'une scène masquée est invisible).
  function arrows(a, key) {
    const id = 'zgo-arr-' + key;
    const m = a.el('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, a.el('defs'));
    a.el('path', { d: 'M 0,0 L 10,5 L 0,10 Z', class: 'zgo-arrowhead' }, m);
    return (d, parent, extra) => a.path(d, 'zgo-arrow', parent, Object.assign({ 'marker-end': `url(#${id})` }, extra || {}));
  }
  function box(a, x, y, w, h, color, parent, info) {
    return a.el('rect', { x, y, width: w, height: h, rx: 16, class: 'zgo-box', style: color ? `--c: var(--${color})` : null, 'data-info': info || null }, parent);
  }
  function curvePath(fn, X, Y, t0, t1, n) {
    let d = '';
    for (let i = 0; i <= n; i++) {
      const t = t0 + ((t1 - t0) * i) / n;
      d += (i ? ' L ' : 'M ') + X(t).toFixed(1) + ',' + Y(fn(t)).toFixed(1);
    }
    return d;
  }
  function curve(a, fn, X, Y, t0, t1, color, cls, parent, info) {
    return a.path(curvePath(fn, X, Y, t0, t1, 160), 'zgo-curve ' + (cls || ''), parent, { style: `--c: var(--${color})`, 'data-info': info || null });
  }
  function area(a, fn, X, Y, t0, t1, y0, color, parent) {
    return a.path(curvePath(fn, X, Y, t0, t1, 120) + ` L ${X(t1).toFixed(1)},${y0} L ${X(t0).toFixed(1)},${y0} Z`, 'zgo-area', parent, { style: `--c: var(--${color})` });
  }
  const tag = (a, x, y, t, color, opts, parent) => a.text(x, y, t, 'zgo-ctag', Object.assign({}, opts || {}, { attrs: Object.assign({ style: `--c: var(--${color})` }, (opts && opts.attrs) || {}) }), parent);

  /* ---------- Follicules (frise) ---------- */
  function ring(a, g, r, n, cr, cls) {
    for (let k = 0; k < n; k++) {
      const an = (k / n) * Math.PI * 2;
      a.el('circle', { cx: Math.cos(an) * r, cy: Math.sin(an) * r, r: cr, class: cls }, g);
    }
  }
  function oocyte(a, g, x, y, r) {
    a.el('circle', { cx: x, cy: y, r: r + 3, class: 'zgo-zp' }, g);
    a.el('circle', { cx: x, cy: y, r, class: 'zgo-oo' }, g);
    a.el('circle', { cx: x + r * 0.25, cy: y - r * 0.2, r: r * 0.35, class: 'zgo-oo-n' }, g);
  }
  const FOLL = {
    primordial(a, g) {
      for (let k = 0; k < 9; k++) {
        const an = (k / 9) * Math.PI * 2;
        a.el('ellipse', { cx: Math.cos(an) * 20, cy: Math.sin(an) * 20, rx: 8, ry: 3.5, transform: `rotate(${(an * 180) / Math.PI + 90} ${Math.cos(an) * 20} ${Math.sin(an) * 20})`, class: 'zgo-gc' }, g);
      }
      a.el('circle', { r: 15, class: 'zgo-oo' }, g);
      a.el('circle', { cx: 4, cy: -3, r: 5, class: 'zgo-oo-n' }, g);
    },
    primary(a, g) {
      ring(a, g, 27, 14, 6.5, 'zgo-gc');
      oocyte(a, g, 0, 0, 17);
    },
    secondary(a, g) {
      a.el('circle', { r: 50, class: 'zgo-th' }, g);
      a.el('circle', { r: 43, class: 'zgo-gl' }, g);
      ring(a, g, 36, 18, 5, 'zgo-gc');
      ring(a, g, 26, 13, 5, 'zgo-gc');
      oocyte(a, g, 0, 0, 17);
    },
    antral(a, g) {
      a.el('circle', { r: 62, class: 'zgo-th' }, g);
      a.el('circle', { r: 54, class: 'zgo-gl' }, g);
      a.el('ellipse', { cx: 10, cy: -8, rx: 34, ry: 30, class: 'zgo-antrum' }, g);
      oocyte(a, g, -26, 26, 15);
    },
    preov(a, g) {
      a.el('circle', { r: 84, class: 'zgo-th' }, g);
      a.el('circle', { r: 75, class: 'zgo-gl' }, g);
      a.el('path', { d: 'M -10,-62 C 50,-66 66,-10 60,24 C 54,58 10,66 -20,58 C -34,54 -36,30 -54,30 C -70,6 -58,-50 -10,-62 Z', class: 'zgo-antrum' }, g);
      ring(a, g, 26, 12, 5, 'zgo-gc');
      oocyte(a, g, 0, 0, 18);
    },
    ovul(a, g) {
      a.el('path', { d: 'M -20,-58 A 62,62 0 1 0 20,-58', class: 'zgo-th' }, g);
      a.el('path', { d: 'M -16,-50 A 54,54 0 1 0 16,-50', class: 'zgo-gl' }, g);
      a.el('ellipse', { cx: 0, cy: 6, rx: 34, ry: 32, class: 'zgo-antrum' }, g);
      ring(a, g, 22, 10, 4.5, 'zgo-gc');
      const o = a.el('g', { transform: 'translate(0 -92)' }, g);
      ring(a, o, 22, 10, 4.5, 'zgo-gc');
      oocyte(a, o, 0, 0, 14);
    },
    cl(a, g) {
      a.el('path', { d: 'M 0,-64 C 30,-70 48,-46 60,-22 C 72,8 58,38 36,54 C 12,72 -22,68 -44,50 C -66,30 -68,-6 -56,-30 C -44,-54 -24,-60 0,-64 Z', class: 'zgo-cl' }, g);
      a.el('path', { d: 'M -30,-30 C -10,-40 4,-18 22,-30 C 36,-10 20,6 32,22 C 14,34 0,18 -18,34 C -30,16 -14,0 -30,-30 Z', class: 'zgo-fib' }, g);
    },
    cb(a, g) {
      a.el('path', { d: 'M 0,-38 C 22,-40 38,-22 36,0 C 34,24 18,38 -4,36 C -26,34 -40,16 -36,-6 C -32,-26 -18,-36 0,-38 Z', class: 'zgo-cb' }, g);
      a.path('M -24,-14 C -8,-22 8,-6 24,-14 M -26,4 C -10,-4 6,12 26,4 M -18,20 C -4,14 8,26 20,18', 'zgo-fib', g);
    }
  };

  /* =====================================================================
     1. Folliculogenèse
     ===================================================================== */
  Object.assign(HV.INFO, {
    'zgo-primordial': { t: 'Follicule primordial', k: 'La réserve ovarienne', d: 'Ovocyte I bloqué en prophase de 1re division méiotique, entouré d\'une couche de cellules aplaties. Le stock est constitué avant la naissance puis s\'épuise jusqu\'à la ménopause (complément).' },
    'zgo-primary': { t: 'Follicule primaire', k: 'Une couche de cellules cubiques', d: 'Sortie de la réserve (recrutement initial), indépendante des gonadotrophines ; apparition de la zone pellucide (complément).' },
    'zgo-secondary': { t: 'Follicule secondaire (préantral)', k: 'Plusieurs couches de granulosa, thèque', d: 'La granulosa prolifère et s\'entoure de la thèque, qui acquiert des récepteurs de la LH. Croissance surtout sous le contrôle de facteurs locaux (complément).' },
    'zgo-antral': { t: 'Follicule antral (cavitaire)', k: 'Apparition de l\'antrum (cavité)', d: 'Les petits follicules antraux sécrètent l\'AMH et l\'inhibine B. Ils deviennent sensibles puis dépendants de la FSH : c\'est parmi eux qu\'une cohorte est recrutée à chaque cycle.' },
    'zgo-preov': { t: 'Follicule préovulatoire (de De Graaf)', k: 'Le follicule dominant', d: 'Le follicule dominant : antrum volumineux, ovocyte dans le cumulus oophorus. Il sécrète beaucoup d\'estradiol, qui déclenche par rétrocontrôle positif le pic de LH.' },
    'zgo-ovul': { t: 'Ovulation (J14)', k: 'Déclenchée par le pic de LH', d: 'Rupture du follicule et expulsion de l\'ovocyte II (polycopié).' },
    'zgo-cl': { t: 'Corps jaune', k: 'Phase lutéale, J14 à J28', d: 'Les restes folliculaires se transforment en corps jaune, qui sécrète de la progestérone et de l\'estradiol (polycopié). Sans grossesse, il régresse en fin de cycle ; en cas de grossesse, l\'hCG le maintient (complément).' },
    'zgo-cb': { t: 'Corps blanc (corpus albicans)', k: 'Cicatrice fibreuse (complément)', d: 'Le corps jaune involue en une cicatrice hyaline non sécrétante.' },
    'zgo-amh': { t: 'AMH (hormone antimüllérienne)', k: 'Granulosa des petits follicules en croissance (complément)', d: 'Sécrétée par les follicules primaires à petits antraux, elle reflète le nombre de follicules en croissance : marqueur de la réserve ovarienne, peu variable au cours du cycle. Elle est élevée dans le syndrome des ovaires polykystiques et effondrée à la ménopause.' },
    'zgo-inhb': { t: 'Inhibine B', k: 'Cellules folliculaires (granulosa)', d: 'Exerce un rétrocontrôle négatif sur la FSH, par action essentiellement hypophysaire (polycopié). Sécrétée surtout par les petits follicules antraux en phase folliculaire (complément).' },
    'zgo-fshwin': { t: 'Fenêtre de FSH', k: 'Sélection du follicule dominant (complément)', d: 'La FSH monte à la fin du cycle précédent (chute de l\'estradiol, de la progestérone et de l\'inhibine A du corps jaune) et recrute une cohorte. En phase folliculaire, l\'estradiol et l\'inhibine B la font baisser : seul le follicule le plus sensible (plus de récepteurs de la FSH, puis de la LH sur sa granulosa) continue ; les autres deviennent atrétiques.' },
    'zgo-theca': { t: 'Cellule de la thèque interne', k: 'Récepteurs de la LH · vascularisée', d: 'La LH stimule la synthèse d\'androgènes (delta-4-androstènedione) à partir du cholestérol (polycopié). La thèque n\'a pas d\'aromatase (complément).' },
    'zgo-granu': { t: 'Cellule de la granulosa', k: 'Récepteurs de la FSH · non vascularisée', d: 'La FSH stimule l\'aromatase, qui transforme les androgènes venus de la thèque en estradiol (polycopié). La granulosa ne peut pas fabriquer elle-même les androgènes (complément).' },
    'zgo-arom': { t: 'Aromatase (CYP19A1)', k: 'Induite par la FSH (complément)', d: 'Convertit l\'androstènedione en estrone et la testostérone en estradiol.' },
    'zgo-bm': { t: 'Membrane basale', k: 'Sépare thèque et granulosa', d: 'Les capillaires restent dans la thèque : la granulosa est avasculaire jusqu\'à l\'ovulation (complément).' }
  });

  const fol = HV.scene(Object.assign({
    id: 'folliculo', parent: 'gonadoF', loupe: 'Folliculogenèse',
    title: 'Folliculogenèse', level: 'Tissu et cellule',
    lead: 'Dans l\'ovaire, les follicules passent du stade primordial (la réserve) au follicule préovulatoire de De Graaf. La croissance dure environ trois mois ; seule la phase finale dépend de la FSH. À chaque cycle, une cohorte est recrutée et un seul follicule, le dominant, est sélectionné puis ovule. Thèque et granulosa coopèrent : la LH fait fabriquer des androgènes à la thèque, la FSH les fait aromatiser en estradiol par la granulosa.',
    points: [
      'Primordial → primaire → secondaire (préantral) → antral → préovulatoire → ovulation → corps jaune → corps blanc.',
      'La croissance d\'un follicule dure ≈ 3 mois ; seule la phase finale, pendant la phase folliculaire, dépend de la FSH (complément).',
      'Sélection du dominant : la FSH baisse en phase folliculaire (estradiol, inhibine B) ; seul le follicule le plus sensible survit, les autres deviennent atrétiques (complément).',
      'AMH : sécrétée par les petits follicules en croissance, marqueur de la réserve ovarienne (complément). Inhibine B : freine la FSH.',
      'Deux cellules – deux gonadotrophines : thèque + LH → androgènes ; granulosa + FSH → aromatase → estradiol (polycopié).'
    ],
    source: POLY,
    legend: new Set(['lh', 'fsh', 'testo', 'e2', 'chol']),
    build(g, a) {
      a.frame('Folliculogenèse', 'Du follicule primordial au corps blanc · deux cellules, deux gonadotrophines');
      const arr = arrows(a, 'fol');
      HV.figBadge(a, 1180, 92, ['32']);

      /* ---- Frise des stades ---- */
      const st = [
        ['primordial', 'primordial', 110, 0.95], ['primary', 'primaire', 270, 1], ['secondary', ['secondaire', '(préantral)'], 440, 1],
        ['antral', 'antral', 630, 1], ['preov', ['préovulatoire', '(De Graaf)'], 840, 1], ['ovul', 'ovulation', 1040, 1],
        ['cl', 'corps jaune', 1235, 1], ['cb', 'corps blanc', 1420, 1]
      ];
      const FY = 300;
      st.forEach(([k, lbl, x], i) => {
        const gg = a.el('g', { transform: `translate(${x} ${k === 'ovul' ? FY + 20 : FY})`, 'data-info': 'zgo-' + k });
        FOLL[k](a, gg);
        a.text(x, 420, lbl, 'lbl-s strong', { anchor: 'middle', lh: 1.1 });
        if (i < st.length - 1) arr(`M ${x + (k === 'preov' ? 92 : k === 'antral' ? 70 : 58)},${FY} L ${st[i + 1][2] - (k === 'antral' ? 92 : k === 'preov' ? 66 : 62)},${FY}`);
      });
      a.text(1040, 190, 'pic de LH', 'note strong', { anchor: 'middle' });
      a.text(1068, 234, 'ovocyte II', 'note');

      // Durées
      const brk = (x0, x1, y, txt, color) => {
        a.path(`M ${x0},${y - 8} L ${x0},${y} L ${x1},${y} L ${x1},${y - 8}`, 'zgo-band-l', null, { style: `--c: var(--${color})` });
        a.text((x0 + x1) / 2, y + 22, txt, 'note', { anchor: 'middle' });
      };
      brk(60, 160, 478, 'réserve fixée', 'p-grey');
      brk(200, 560, 478, 'croissance lente (≈ 3 mois au total, compl.)', 'p-grey');
      brk(570, 950, 478, 'phase finale : dépend de la FSH', 'p-rose');
      brk(1170, 1490, 478, 'phase lutéale : J14–J28', 'p-amber');
      // Marqueurs hormonaux
      const hbar = (x0, x1, y, txt, color, info) => {
        const gg = a.el('g', { 'data-info': info });
        a.el('rect', { x: x0, y, width: x1 - x0, height: 24, rx: 12, class: 'zgo-bar', style: `--c: var(--${color})` }, gg);
        a.text(x0 + 12, y + 18, txt, 'note strong', null, gg);
      };
      hbar(1000, 1490, 546, 'progestérone + estradiol (corps jaune)', 'p-violet', 'prog');
      hbar(200, 560, 546, 'AMH : petits follicules (réserve)', 'p-teal', 'zgo-amh');
      hbar(570, 790, 546, 'inhibine B', 'p-brown', 'zgo-inhb');
      hbar(800, 960, 546, 'estradiol ↑↑', 'p-rose', 'e2');

      /* ---- Recrutement et sélection ---- */
      const P0 = { x: 60, y: 620, w: 700, h: 350 };
      box(a, P0.x, P0.y, P0.w, P0.h, 'p-rose');
      a.text(P0.x + 24, P0.y + 38, 'Recrutement d\'une cohorte, sélection du dominant', 'lbl-h');
      const cx0 = 140, cx1 = 730, cy0 = 730, cy1 = 830;
      const D0 = -4, D1 = 14;
      const X = (d) => cx0 + ((d - D0) / (D1 - D0)) * (cx1 - cx0);
      const fshF = (d) => 0.25 + 0.75 * G(d, 1.5, 4.2) + 0.55 * G(d, 13.6, 0.7);
      const Y = (v) => cy1 - v * 95;
      const thr = 0.72;
      a.path(`M ${cx0},${cy1} L ${cx1},${cy1}`, 'zgo-axis');
      // Fenêtre : FSH au-dessus du seuil
      let w0 = null, w1 = null;
      for (let d = D0; d <= 10; d += 0.05) { if (fshF(d) > thr) { if (w0 === null) w0 = d; w1 = d; } }
      a.el('rect', { x: X(w0), y: cy0 - 12, width: X(w1) - X(w0), height: cy1 - cy0 + 12, class: 'zgo-band', style: '--c: var(--p-rose)', 'data-info': 'zgo-fshwin' });
      a.text((X(w0) + X(w1)) / 2, cy0 - 18, 'fenêtre de FSH', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zgo-fshwin' } });
      a.path(`M ${cx0},${Y(thr)} L ${cx1},${Y(thr)}`, 'zgo-band-l', null, { style: '--c: var(--fg)' });
      a.text(cx1 - 160, Y(thr) - 8, 'seuil de FSH', 'note', { anchor: 'end' });
      curve(a, fshF, X, Y, D0, D1, 'p-rose', '', null, 'fsh');
      tag(a, X(4.5), Y(fshF(4.5)) - 12, 'FSH', 'p-rose');
      [[1, 'J1'], [7, 'J7'], [14, 'J14']].forEach(([d, t]) => a.text(X(d), cy1 + 22, t, 'zgo-tick', { anchor: 'middle' }));
      a.text(X(-2.2), cy1 + 22, 'cycle précédent', 'zgo-tick', { anchor: 'middle' });
      const cur = a.el('line', { x1: 0, y1: cy0 - 4, x2: 0, y2: cy1, class: 'zgo-cursor' });
      // Cohorte
      const coh = [], CX = [150, 245, 345, 455, 565, 680], dom = 3;
      const cohG = a.el('g', { 'data-info': 'zgo-fshwin' });
      CX.forEach((x, i) => {
        const gg = a.el('g', { transform: `translate(${x} 892)` }, cohG);
        const th = a.el('circle', { r: 20, class: 'zgo-th' }, gg);
        const gl = a.el('circle', { r: 16, class: 'zgo-gl' }, gg);
        const an = a.el('circle', { r: 8, class: 'zgo-antrum' }, gg);
        coh.push({ gg, th, gl, an, k: 0.85 + (i === dom ? 0.25 : (i * 37 % 10) / 50) });
      });
      const cohT = a.text(P0.x + 24, P0.y + 336, '', 'note strong');

      /* ---- Deux cellules, deux gonadotrophines ---- */
      const Q = { x: 800, y: 620, w: 740, h: 350 };
      box(a, Q.x, Q.y, Q.w, Q.h, 'p-violet');
      a.text(Q.x + 24, Q.y + 38, 'Deux cellules, deux gonadotrophines', 'lbl-h');
      // capillaire de la thèque
      a.path(`M 850,690 L 850,950`, 'zgo-cap');
      a.text(850, 680, 'sang', 'note', { anchor: 'middle' });
      // thèque
      const th = a.el('g', { 'data-info': 'zgo-theca', style: '--c: var(--p-brown)' });
      a.el('rect', { x: 885, y: 706, width: 250, height: 200, rx: 40, class: 'zgo-cell' }, th);
      a.el('ellipse', { cx: 1080, cy: 872, rx: 26, ry: 17, class: 'zgo-nuc' }, th);
      a.text(1010, 734, 'thèque interne', 'lbl-s strong', { anchor: 'middle' }, th);
      a.text(1010, 758, 'récepteurs de la LH', 'note', { anchor: 'middle' }, th);
      a.el('rect', { x: 879, y: 752, width: 14, height: 34, rx: 5, class: 'chan' }, th);
      a.text(1010, 790, 'cholestérol ↓', 'note', { anchor: 'middle' }, th);
      // membrane basale
      a.path('M 1160,700 L 1160,950', 'zgo-bm', null, { 'data-info': 'zgo-bm' });
      a.text(1160, 694, 'membrane basale', 'note', { anchor: 'middle', attrs: { 'data-info': 'zgo-bm' } });
      // granulosa
      const gr = a.el('g', { 'data-info': 'zgo-granu', style: '--c: var(--p-gold)' });
      a.el('rect', { x: 1185, y: 706, width: 220, height: 200, rx: 40, class: 'zgo-cell' }, gr);
      a.el('ellipse', { cx: 1295, cy: 870, rx: 30, ry: 20, class: 'zgo-nuc' }, gr);
      a.text(1295, 734, 'granulosa', 'lbl-s strong', { anchor: 'middle' }, gr);
      a.text(1295, 758, 'récepteurs de la FSH', 'note', { anchor: 'middle' }, gr);
      a.el('rect', { x: 1178, y: 852, width: 14, height: 34, rx: 5, class: 'chan', style: 'fill: var(--p-rose)' }, gr);
      const arom = a.el('g', { 'data-info': 'zgo-arom' });
      a.el('rect', { x: 1235, y: 776, width: 120, height: 36, rx: 18, class: 'enz' }, arom);
      a.text(1295, 800, 'aromatase', 'note strong', { anchor: 'middle' }, arom);
      // antre
      a.el('rect', { x: 1425, y: 706, width: 100, height: 200, rx: 30, class: 'zgo-antrum', 'data-info': 'zgo-antral' });
      a.text(1475, 736, 'antre', 'note strong', { anchor: 'middle' });
      a.text(1475, 920, 'E2', 'zgo-ctag', { anchor: 'middle', attrs: { style: '--c: var(--p-rose)' } });
      // androgènes (dans la thèque)
      const an = a.el('g', { 'data-info': 'zgo-theca' });
      a.el('rect', { x: 950, y: 802, width: 120, height: 32, rx: 16, class: 'sig-box', style: '--c: var(--p-blue)' }, an);
      a.text(1010, 824, 'androgènes', 'note strong', { anchor: 'middle' }, an);
      // Flux
      a.flow('M 850,769 L 884,769', { mol: 'lh', rate: () => 1.4, size: 1.2, speed: 30, track: false });
      a.flow('M 850,900 C 870,925 900,925 960,925 L 1140,925 C 1175,925 1170,880 1190,869', { mol: 'fsh', rate: () => 1.3, size: 1.2, speed: 90, track: false });
      a.flow('M 850,860 L 900,860', { mol: 'chol', rate: () => 0.8, size: 1, speed: 30, track: false });
      a.flow('M 1072,814 C 1120,814 1180,800 1234,796', { mol: 'testo', rate: () => 1.5, size: 1.2, speed: 60, track: false });
      a.flow('M 1356,794 C 1385,794 1400,800 1440,810', { mol: 'e2', rate: () => 1.5, size: 1.2, speed: 50, track: false });
      a.text(Q.x + 24, Q.y + 336, 'Thèque : LH → androgènes · granulosa : FSH → aromatase → estradiol', 'note strong');

      let t = 0;
      a.dyn((dt) => {
        t = (t + dt / 14) % 1;
        const d = D0 + t * (D1 - D0);
        cur.setAttribute('transform', `translate(${X(d).toFixed(1)} 0)`);
        const sel = d > 6;
        coh.forEach((c, i) => {
          let r;
          if (i === dom) r = 12 + 30 * smooth((d + 3) / 17) * c.k + (d > 8 ? 14 * smooth((d - 8) / 6) : 0);
          else r = 12 + 22 * smooth((d + 3) / 10) * c.k - (sel ? 12 * smooth((d - 6) / 6) : 0);
          r = Math.max(8, Math.min(40, r));
          c.th.setAttribute('r', r.toFixed(1));
          c.gl.setAttribute('r', (r * 0.82).toFixed(1));
          c.an.setAttribute('r', (Math.max(0, r * 0.82 - 10) * (i === dom ? 0.9 : 0.6)).toFixed(1));
          c.gg.classList.toggle('zgo-atr', i !== dom && sel);
        });
        cohT.textContent = d < 1 ? 'Fin du cycle précédent : la FSH monte, une cohorte est recrutée'
          : d < 6 ? 'J' + Math.max(1, Math.floor(d)) + ' : la cohorte grandit sous FSH'
            : d < 12 ? 'J' + Math.floor(d) + ' : FSH ↓ (estradiol, inhibine B) : seul le dominant continue'
              : 'J' + Math.floor(d) + ' : follicule préovulatoire, les autres sont atrétiques';
      });

      HV.spotlight(fol, a, [
        { t: 'La réserve', d: 'Les follicules primordiaux forment un stock constitué avant la naissance. Leur sortie de la réserve ne dépend pas des gonadotrophines (complément).', spot: [[110, 300, 90]] },
        { t: 'Une croissance lente', d: 'Primaire, secondaire puis antral : la croissance dure environ trois mois. L\'AMH, sécrétée par ces petits follicules, reflète la réserve ovarienne (complément).', spot: [[200, 200, 560, 400]] },
        { t: 'La phase finale dépend de la FSH', d: 'Les follicules antraux recrutés à la fin du cycle précédent ne continuent que s\'ils reçoivent assez de FSH. Ils sécrètent l\'inhibine B, qui freine la FSH.', spot: [[560, 190, 400, 410]] },
        { t: 'Sélection du dominant', d: 'En phase folliculaire, l\'estradiol et l\'inhibine B font baisser la FSH sous le seuil : seul le follicule le plus sensible continue jusqu\'au stade préovulatoire, les autres deviennent atrétiques (complément).', spot: [[60, 620, 700, 350]] },
        { t: 'Deux cellules, deux gonadotrophines', d: 'La LH stimule la synthèse d\'androgènes par la thèque interne ; la FSH stimule l\'aromatisation de ces androgènes en estradiol par la granulosa (polycopié).', spot: [[800, 620, 740, 350]] },
        { t: 'Ovulation et corps jaune', d: 'Le pic de LH déclenche la rupture du follicule et l\'expulsion de l\'ovocyte II à J14. Le corps jaune sécrète progestérone et estradiol pendant la phase lutéale, puis involue en corps blanc.', spot: [[960, 180, 560, 430]] }
      ]);
    }
  }, HV.LOUPE.R(0)));

  /* =====================================================================
     2. Cycle : hormones, endomètre, glaire
     ===================================================================== */
  Object.assign(HV.INFO, {
    'zgo-endo': { t: 'Endomètre', k: 'Muqueuse utérine', d: 'Règles (J1–J5) : desquamation de la couche fonctionnelle. Phase proliférative : l\'estradiol fait épaissir la muqueuse. Phase sécrétoire : la progestérone transforme l\'endomètre (glandes tortueuses) pour permettre l\'implantation et diminue la contractilité du myomètre (polycopié).' },
    'zgo-glaire': { t: 'Glaire cervicale', k: 'Col utérin', d: 'L\'estradiol la rend abondante, filante et perméable aux spermatozoïdes en période préovulatoire ; la progestérone la rend épaisse et infranchissable (polycopié).' },
    'zgo-temp': { t: 'Température basale', k: 'Courbe ménothermique (complément)', d: 'La progestérone élève la température du matin de 0,3 à 0,5 °C : plateau thermique pendant la phase lutéale, signe a posteriori de l\'ovulation.' },
    'zgo-ovev': { t: 'Ovaire', k: 'Follicule puis corps jaune', d: 'Phase folliculaire : croissance du follicule dominant ; J14 : ovulation ; phase lutéale : corps jaune.' }
  });
  const endoMm = (d) => (d < 5 ? 12 - 10 * smooth((d - 1) / 4) : d < 14 ? 2 + 7 * smooth((d - 5) / 9) : 9 + 3 * smooth((d - 14) / 7));
  const glaireQ = (d) => clamp(G(d, 13.2, 2.4) - (d > 14.5 ? smooth((d - 14.5) / 1.5) : 0), 0, 1);
  const tempC = (d) => (d < 14.5 ? 36.5 - 0.08 * G(d, 14, 0.5) : 36.5 + 0.4 * smooth((d - 14.6) / 1.6)) + 0.012 * Math.sin(d * 5.3);

  const endo = HV.scene(Object.assign({
    id: 'endometre', parent: 'gonadoF', loupe: 'Cycle et endomètre',
    title: 'Cycle : hormones, endomètre, glaire', level: 'Notion',
    lead: 'Le cycle ovarien de 28 jours se lit à plusieurs niveaux en même temps : gonadotrophines, hormones ovariennes, endomètre, glaire cervicale et température. L\'estradiol de la phase folliculaire fait proliférer l\'endomètre et rend la glaire perméable ; après l\'ovulation, la progestérone du corps jaune rend l\'endomètre sécrétoire, la glaire infranchissable et élève la température.',
    points: [
      'J1 : premier jour des règles ; J1–J14 : phase folliculaire ; J14 : ovulation (pic de LH) ; J14–J28 : phase lutéale (polycopié).',
      'Estradiol : prolifération de l\'endomètre, glaire filante et perméable en période préovulatoire.',
      'Progestérone : endomètre sécrétoire (implantation), glaire épaisse et infranchissable, myomètre moins contractile.',
      'Température basale : +0,3 à 0,5 °C en phase lutéale (complément).',
      'Le curseur parcourt le cycle ; les valeurs lues suivent le scénario choisi dans le panneau.'
    ],
    source: POLY,
    legend: new Set(['fsh', 'lh', 'e2', 'prog']),
    build(g, a) {
      a.frame('Cycle : hormones, endomètre, glaire', 'Un cycle de 28 jours lu à tous les étages');
      const sim = HV.scenes.gonadoF.sim;
      endo.sim = sim;
      const R = HV.rhythm, T = { h: 8, d: 1 };
      const x0 = 250, x1 = 1130;
      const X = (d) => x0 + ((d - 1) / 27) * (x1 - x0);
      // Bandes de phases
      a.el('rect', { x: X(1), y: 160, width: X(5) - X(1), height: 785, class: 'zgo-band', style: '--c: var(--p-red)' });
      a.el('rect', { x: X(13.5), y: 160, width: X(14.5) - X(13.5), height: 785, class: 'zgo-band', style: '--c: var(--p-violet)' });
      a.text(X(3), 176, 'règles', 'note strong', { anchor: 'middle' });
      a.text(X(9.5), 176, 'phase folliculaire', 'note strong', { anchor: 'middle' });
      a.text(X(14), 176, 'ovulation', 'note strong', { anchor: 'middle' });
      a.text(X(21.5), 176, 'phase lutéale', 'note strong', { anchor: 'middle' });
      const rowLbl = (y, l, info) => a.text(60, y, l, 'lbl-s strong', { lh: 1.1, attrs: { 'data-info': info || null } });

      // A. Gonadotrophines
      const YA = (v) => 320 - v * 46;
      a.path(`M ${x0},320 L ${x1},320`, 'zgo-axis');
      rowLbl(250, ['Hypophyse', 'FSH, LH']);
      curve(a, (d) => R.fsh({ d }), X, YA, 1, 28, 'p-rose', '', null, 'fsh');
      curve(a, (d) => R.lh({ d }), X, YA, 1, 28, 'p-violet', '', null, 'lh');
      tag(a, X(15.2), YA(2.4), 'pic de LH', 'p-violet');
      tag(a, X(4), YA(1.1) - 8, 'FSH', 'p-rose', { anchor: 'middle' });
      tag(a, X(24), YA(0.35) - 10, 'LH', 'p-violet', { anchor: 'middle' });
      // B. Ovaire : hormones
      const YB = (v) => 470 - v * 90;
      a.path(`M ${x0},470 L ${x1},470`, 'zgo-axis');
      rowLbl(400, ['Ovaire', 'E2, progestérone']);
      curve(a, (d) => R.e2({ d }), X, YB, 1, 28, 'p-rose', '', null, 'e2');
      curve(a, (d) => R.prog({ d }), X, YB, 1, 28, 'p-violet', 'dash', null, 'prog');
      tag(a, X(9.6), YB(1.2), 'estradiol', 'p-rose', { anchor: 'end' });
      tag(a, X(24.5), YB(1.25), 'progestérone', 'p-violet');
      // C. Ovaire : événements
      a.text(60, 528, ['Ovaire', 'follicule, corps jaune'], 'lbl-s strong', { lh: 1.1, attrs: { 'data-info': 'zgo-ovev' } });
      [[3, 10], [7, 15], [11, 22], [13.6, 27]].forEach(([d, r]) => {
        const gg = a.el('g', { transform: `translate(${X(d)} 530)`, 'data-info': 'zgo-ovev' });
        a.el('circle', { r, class: 'zgo-th' }, gg);
        a.el('circle', { r: r * 0.8, class: 'zgo-gl' }, gg);
        if (r > 12) a.el('circle', { cx: r * 0.15, cy: -r * 0.1, r: r * 0.5, class: 'zgo-antrum' }, gg);
      });
      a.text(X(14.6), 506, '↑ ovocyte II', 'note', { anchor: 'start' });
      [[17, 18], [21, 24], [25, 20], [27.4, 14]].forEach(([d, r], i) => {
        const gg = a.el('g', { transform: `translate(${X(d)} 530) scale(${r / 64})`, 'data-info': 'zgo-cl' });
        FOLL[i < 3 ? 'cl' : 'cb'](a, gg);
      });
      // D. Endomètre
      const EB = 710, k = 9.5;
      rowLbl(640, ['Endomètre', '(épaisseur)'], 'zgo-endo');
      a.el('rect', { x: x0, y: EB, width: x1 - x0, height: 18, class: 'zgo-myom', 'data-info': 'zgo-endo' });
      a.el('rect', { x: x0, y: EB - 16, width: x1 - x0, height: 16, class: 'zgo-endo-b', 'data-info': 'zgo-endo' });
      a.path(curvePath((d) => EB - 16 - Math.max(0, endoMm(d) - 1.6) * k, X, (v) => v, 1, 28, 140) + ` L ${x1},${EB - 16} L ${x0},${EB - 16} Z`, 'zgo-endo', null, { 'data-info': 'zgo-endo' });
      for (let d = 1.5; d < 28; d += 1.1) {
        const top = EB - 16 - Math.max(0, endoMm(d) - 1.6) * k + 6, x = X(d);
        if (top > EB - 22) continue;
        let p = `M ${x.toFixed(1)},${EB - 4}`;
        if (d > 15) { for (let y = EB - 4, s = 1; y > top; y -= 9, s = -s) p += ` Q ${(x + 7 * s).toFixed(1)},${y - 4.5} ${x.toFixed(1)},${y - 9}`; } else p += ` L ${x.toFixed(1)},${top.toFixed(1)}`;
        a.path(p, 'zgo-gland', null, { 'data-info': 'zgo-endo' });
      }
      for (let d = 1.3; d < 5; d += 0.45) a.el('circle', { cx: X(d), cy: EB - 16 - Math.max(0, endoMm(d) - 1.6) * k - 8 - ((d * 7) % 3) * 4, r: 4, class: 'zgo-blood' });
      a.text(X(9.5), 600, 'prolifération (E2)', 'note', { anchor: 'middle' });
      a.text(X(21.5), 570, 'sécrétion (progestérone)', 'note', { anchor: 'middle' });
      a.text(X(3) + 20, 572, 'desquamation', 'note', { anchor: 'middle' });
      // E. Glaire
      rowLbl(762, ['Glaire', 'cervicale'], 'zgo-glaire');
      const GY = 744;
      for (let d = 1; d < 28; d += 0.5) {
        const q = glaireQ(d + 0.25);
        a.el('rect', { x: X(d), y: GY, width: X(d + 0.5) - X(d) + 0.5, height: 36, class: 'zgo-mucus', 'fill-opacity': (0.12 + 0.88 * q).toFixed(2), 'stroke-opacity': 0, 'data-info': 'zgo-glaire' });
      }
      a.text(X(4.6), GY + 24, 'rare, épaisse', 'note', { anchor: 'middle' });
      a.text(X(12.6), GY + 24, 'filante, perméable', 'note strong', { anchor: 'middle' });
      a.text(X(22), GY + 24, 'épaisse, infranchissable', 'note', { anchor: 'middle' });
      // F. Température basale
      rowLbl(838, ['Température', 'basale (compl.)'], 'zgo-temp');
      const YT = (c) => 925 - (c - 36.3) * 150;
      a.path(`M ${x0},${YT(36.5)} L ${x1},${YT(36.5)}`, 'zgo-grid');
      curve(a, tempC, X, YT, 1, 28, 'p-orange', 'thin', null, 'zgo-temp');
      a.text(X(21.5), YT(36.9) - 10, 'plateau thermique +0,3 à 0,5 °C', 'note', { anchor: 'middle' });
      // Axe des jours
      [1, 7, 14, 21, 28].forEach((d) => a.text(X(d), 942, 'J' + d, 'zgo-tick', { anchor: 'middle' }));
      // Curseur
      const cur = a.el('g');
      a.el('line', { x1: 0, y1: 190, x2: 0, y2: 925, class: 'zgo-cursor' }, cur);
      const dots = ['p-rose', 'p-violet', 'p-rose', 'p-violet', 'p-orange'].map((c) => a.el('circle', { r: 7, class: 'zgo-dot', style: `--c: var(--${c})` }));

      // Lecture des valeurs
      const RX = 1175, RY = 240;
      box(a, RX, RY, 380, 735, 'p-rose');
      const dayT = a.text(RX + 24, RY + 48, '', 'zgo-big');
      const phT = a.text(RX + 24, RY + 78, '', 'lbl-s strong');
      const rows = [['FSH', 'fsh'], ['LH', 'lh'], ['Estradiol', 'e2'], ['Progestérone', 'prog'], ['Endomètre', 'zgo-endo'], ['Glaire', 'zgo-glaire'], ['Température', 'zgo-temp']];
      const vals = rows.map(([l, info], i) => {
        a.text(RX + 24, RY + 128 + i * 36, l, 'note', { attrs: { 'data-info': info } });
        return a.text(RX + 356, RY + 128 + i * 36, '', 'zgo-val', { anchor: 'end' });
      });
      a.text(RX + 24, RY + 392, 'Rétrocontrôle de l\'estradiol', 'note strong');
      const fbT = a.text(RX + 24, RY + 420, '', 'note', { lh: 1.25 });
      const stT = a.text(RX + 24, RY + 500, '', 'note', { lh: 1.25 });
      a.text(RX + 24, RY + 640, ['Courbes : cycle normal de référence.', 'Valeurs lues : scénario du panneau.'], 'note', { lh: 1.25 });
      HV.figBadge(a, RX + 340, RY + 40, ['35']);

      let txt = 0;
      const setLines = (el, arr) => { el.textContent = ''; arr.forEach((ln, i) => HV.el('tspan', { x: RX + 24, dy: i ? '1.25em' : 0, text: ln }, el)); };
      a.dyn((dt) => {
        T.d = ((T.d - 1 + dt / 1.6) % 28) + 1;
        sim.step(dt, T);
        const d = T.d, x = X(d);
        cur.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
        const ys = [YA(R.fsh(T)), YA(R.lh(T)), YB(R.e2(T)), YB(R.prog(T)), YT(tempC(d))];
        dots.forEach((c, i) => { c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', ys[i].toFixed(1)); });
        txt -= dt;
        if (txt > 0) return;
        txt = 0.2;
        const cyc = sim.s.cyc > 0.5;
        dayT.textContent = 'Jour ' + Math.floor(d);
        phT.textContent = d < 6 ? 'règles, début de phase folliculaire' : d < 13.5 ? 'phase folliculaire' : d < 14.6 ? 'ovulation (pic de LH)' : 'phase lutéale';
        const L = (k2) => sim.lab(k2);
        vals[0].textContent = f1(L('fsh')) + ' UI/L';
        vals[1].textContent = f1(L('lh')) + ' UI/L';
        vals[2].textContent = Math.round(L('e2')) + ' pg/mL';
        vals[3].textContent = f1(L('prog')) + ' ng/mL';
        vals[4].textContent = !cyc ? (sim.s.e2 > 0.5 ? 'non sécrétoire' : 'mince') : d < 5 ? 'desquamation' : d < 14.5 ? 'prolifère' : 'sécrétoire';
        const q = cyc ? glaireQ(d) : 0.15 * clamp(sim.s.e2, 0, 1);
        vals[5].textContent = q > 0.55 ? 'filante' : q > 0.25 ? 'en cours' : 'épaisse';
        vals[6].textContent = cyc && d > 15.2 ? 'plateau haut' : 'basse';
        setLines(fbT, R.e2Positive(T) && cyc ? ['positif : l\'estradiol élevé', 'déclenche le pic de LH'] : ['négatif : l\'estradiol et la', 'progestérone freinent LH et FSH']);
        setLines(stT, cyc ? ['Cycle ovulatoire : pic de LH,', 'puis corps jaune et progestérone.'] : ['Pas de cycle ovulatoire dans ce', 'scénario : pas de pic de LH ni', 'de phase lutéale, aménorrhée.']);
      });

      HV.spotlight(endo, a, [
        { t: 'Phase folliculaire', d: 'La FSH fait croître le follicule dominant, qui sécrète de plus en plus d\'estradiol. L\'estradiol fait proliférer l\'endomètre.', spot: [[X(5), 160, X(13.5) - X(5), 600]] },
        { t: 'Le pic de LH', d: 'Quand l\'estradiol reste élevé, son rétrocontrôle devient positif : pic de LH (et de FSH) qui déclenche l\'ovulation à J14 (polycopié).', spot: [[X(14), 300, 110]] },
        { t: 'La glaire devient perméable', d: 'En période préovulatoire, l\'estradiol rend la glaire abondante, filante et perméable aux spermatozoïdes ; après l\'ovulation, la progestérone la rend infranchissable.', spot: [[X(9), 735, X(17) - X(9), 55]] },
        { t: 'Phase lutéale', d: 'Le corps jaune sécrète progestérone et estradiol : l\'endomètre devient sécrétoire, prêt pour l\'implantation ; la température basale monte de 0,3 à 0,5 °C (complément).', spot: [[X(14.6), 330, X(28) - X(14.6), 590]] },
        { t: 'Les règles', d: 'Sans grossesse, le corps jaune régresse : la chute de la progestérone et de l\'estradiol entraîne la desquamation de l\'endomètre. Le premier jour des règles est J1.', spot: [[X(1) - 10, 560, X(5) - X(1) + 20, 170]] },
        { t: 'Lire les valeurs', d: 'Le encadré de droite donne les valeurs au jour du curseur, selon le scénario choisi dans le panneau (ménopause, déficit gonadotrope, hyperprolactinémie).', spot: [[1175, 240, 380, 735]] }
      ]);
    }
  }, HV.LOUPE.R(1)));

  /* =====================================================================
     3. Grossesse et placenta
     ===================================================================== */
  Object.assign(HV.INFO, {
    'zgo-hcg': { t: 'hCG', k: 'Gonadotrophine chorionique · trophoblaste (complément)', d: 'Proche de la LH, elle maintient le corps jaune, qui continue de sécréter progestérone et estradiol pendant les premières semaines. Elle culmine vers 10 SA puis baisse vers un plateau. Elle stimule aussi le récepteur de la TSH (thyrotoxicose gestationnelle transitoire du 1er trimestre).' },
    'zgo-hpl': { t: 'hPL', k: 'Hormone lactogène placentaire (complément)', d: 'Augmente avec la masse placentaire. Effet anti-insuline (lipolyse, épargne du glucose au profit du fœtus) : participe à l\'insulinorésistance de la fin de grossesse.' },
    'zgo-relais': { t: 'Relais lutéo-placentaire', k: 'Vers 8 à 10 SA (complément)', d: 'Le corps jaune assure d\'abord la sécrétion de progestérone ; le placenta prend le relais vers 8 à 10 SA.' },
    'zgo-fpu': { t: 'Unité fœto-placentaire', k: 'Synthèse de l\'estriol (complément)', d: 'Le placenta n\'a pas de 17α-hydroxylase : il ne peut pas fabriquer d\'androgènes. La surrénale fœtale (zone fœtale) fournit le DHEA-S, hydroxylé en 16α par le foie fœtal ; le placenta le désulfate puis l\'aromatise en estriol. L\'estriol maternel reflète donc le fonctionnement du fœtus et du placenta.' },
    'zgo-preg-prl': { t: 'Prolactine pendant la grossesse', k: 'Polycopié : stimulée par les estrogènes', d: 'Les estrogènes stimulent les cellules lactotropes (hyperplasie lactotrope : l\'hypophyse augmente de volume, complément). La prolactine monte progressivement jusqu\'au terme ; la lactation reste bloquée par la progestérone et les estrogènes jusqu\'à l\'accouchement.' },
    'zgo-tbg': { t: 'TBG et CBG augmentées', k: 'Effet des estrogènes sur le foie (complément)', d: 'TBG ↑ : T4 et T3 totales augmentent, les fractions libres restent proches de la normale. CBG ↑ : le cortisol total augmente.' },
    'zgo-ir': { t: 'Insulinorésistance du 3e trimestre', k: 'hPL, progestérone, cortisol, GH placentaire (complément)', d: 'La sécrétion d\'insuline doit augmenter. Si elle ne suit pas : diabète gestationnel, diagnostiqué lors de la grossesse et qui régresse après l\'accouchement (polycopié). Dépistage par HGPO 75 g entre 24 et 28 SA chez les femmes à risque ; seuils (complément) : à jeun ≥ 0,92 g/L, 1 h ≥ 1,80 g/L, 2 h ≥ 1,53 g/L.' }
  });
  const PREG = {
    hcg: (w) => (w < 3.5 ? 0 : w <= 10 ? Math.pow((w - 3.5) / 6.5, 2.2) : 0.2 + 0.8 * G(w, 10, 3.6)),
    prog: (w) => 0.06 + 0.94 * Math.pow(w / 40, 1.6),
    e3: (w) => 0.02 + 0.98 * Math.pow(w / 40, 2.6),
    hpl: (w) => (w < 5 ? 0 : 0.98 * Math.pow(clamp((w - 5) / 31, 0, 1), 1.2) + 0.02),
    prl: (w) => 0.08 + 0.9 * Math.pow(w / 40, 1.7)
  };
  const preg = HV.scene(Object.assign({
    id: 'grossesse', parent: 'gonadoF', loupe: 'Grossesse et placenta',
    title: 'Grossesse et placenta', level: 'Notion',
    lead: 'Pendant la grossesse, l\'hCG du trophoblaste maintient le corps jaune, puis le placenta prend le relais de la progestérone et des estrogènes vers 8 à 10 SA. Les estrogènes (surtout l\'estriol) naissent d\'une coopération entre le fœtus et le placenta. Tout l\'organisme maternel s\'adapte : hypophyse, protéines de transport, métabolisme glucidique (complément, sauf mention).',
    points: [
      'hCG : pic vers 10 SA ; elle maintient le corps jaune (complément).',
      'Relais lutéo-placentaire vers 8–10 SA pour la progestérone et les estrogènes (complément).',
      'Unité fœto-placentaire : DHEA-S de la surrénale fœtale → 16α-OH (foie fœtal) → estriol (placenta) (complément).',
      'La prolactine augmente sous l\'effet des estrogènes pour préparer la lactation (polycopié) ; hyperplasie lactotrope (complément).',
      'TBG et CBG ↑ ; insulinorésistance du 3e trimestre → dépistage du diabète gestationnel par HGPO 75 g à 24–28 SA (complément ; HGPO : polycopié).'
    ],
    source: POLY,
    legend: new Set(['prog', 'e2', 'prl', 'dhea', 'chol']),
    build(g, a) {
      a.frame('Grossesse et placenta', 'hCG, relais placentaire, unité fœto-placentaire, adaptations maternelles');
      const arr = arrows(a, 'preg');
      const x0 = 150, x1 = 990, yb = 600, yt = 250;
      const X = (w) => x0 + (w / 40) * (x1 - x0), Y = (v) => yb - v * (yb - yt);
      // trimestres
      [[0, 14, '1er trimestre'], [14, 28, '2e trimestre'], [28, 40, '3e trimestre']].forEach(([w0, w1, l], i) => {
        a.el('rect', { x: X(w0), y: 190, width: X(w1) - X(w0), height: yb - 190, class: 'zgo-band', style: `--c: var(--${i % 2 ? 'p-grey' : 'line'})` });
        a.text((X(w0) + X(w1)) / 2, 212, l, 'note strong', { anchor: 'middle' });
      });
      a.el('rect', { x: X(8), y: 226, width: X(10) - X(8), height: yb - 226, class: 'zgo-band', style: '--c: var(--p-violet)', 'data-info': 'zgo-relais' });
      a.text(X(8) - 4, 244, 'relais', 'note strong', { anchor: 'end', attrs: { 'data-info': 'zgo-relais' } });
      a.el('rect', { x: X(24), y: 226, width: X(28) - X(24), height: yb - 226, class: 'zgo-band', style: '--c: var(--p-lime)', 'data-info': 'zgo-ir' });
      a.text(X(26), 244, 'HGPO', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zgo-ir' } });
      a.path(`M ${x0},${yb} L ${x1},${yb}`, 'zgo-axis');
      [0, 10, 20, 30, 40].forEach((w) => a.text(X(w), yb + 20, w + ' SA', 'zgo-tick', { anchor: 'middle' }));
      a.text(x0 - 12, yt + 6, 'max', 'zgo-tick', { anchor: 'end' });
      a.text(x0 - 12, yb, '0', 'zgo-tick', { anchor: 'end' });
      a.text(60, 652, 'Échelles relatives, profils schématiques (complément) · SA : semaines d\'aménorrhée', 'note');
      const S = [['hcg', 'p-teal', 'hCG', 'zgo-hcg', 12, -14, 'start'], ['prog', 'p-violet', 'progestérone', 'prog', 40, -6, 'end'], ['e3', 'p-rose', 'estrogènes', 'e2', 33, 30, 'start'],
        ['hpl', 'p-amber', 'hPL', 'zgo-hpl', 30, -16, 'end'], ['prl', 'p-magenta', 'prolactine', 'zgo-preg-prl', 26, 26, 'start']];
      S.forEach(([k, c, l, info, wl, dy, anc]) => {
        curve(a, PREG[k], X, Y, 0, 40, c, k === 'prl' || k === 'hpl' ? 'thin' : '', null, info);
        tag(a, X(wl) + (anc === 'end' ? -8 : 8), Y(PREG[k](wl)) + dy, l, c, { anchor: anc, attrs: { 'data-info': info } });
      });
      const cur = a.el('line', { x1: 0, y1: 226, x2: 0, y2: yb, class: 'zgo-cursor' });
      const dots = S.map(([k, c]) => a.el('circle', { r: 7, class: 'zgo-dot', style: `--c: var(--${c})` }));
      const wT = a.text(1010, 290, '', 'zgo-big');
      const lines = [0, 1, 2].map((i) => a.text(1010, 330 + i * 28, '', 'note'));

      /* ---- Unité fœto-placentaire ---- */
      box(a, 60, 670, 940, 300, 'p-amber', null, 'zgo-fpu');
      a.text(84, 706, 'Unité fœto-placentaire (complément)', 'lbl-h', { attrs: { 'data-info': 'zgo-fpu' } });
      const col = (x, w, t, c) => { a.el('rect', { x, y: 724, width: w, height: 228, rx: 18, class: 'zgo-cell', style: `--c: var(--${c})` }); a.text(x + w / 2, 752, t, 'lbl-s strong', { anchor: 'middle' }); };
      col(84, 250, 'Mère', 'p-rose');
      col(370, 270, 'Placenta', 'p-amber');
      col(676, 300, 'Fœtus', 'p-sky');
      const pill = (x, y, w, t, c, info) => {
        const gg = a.el('g', { 'data-info': info || null });
        a.el('rect', { x: x - w / 2, y: y - 18, width: w, height: 36, rx: 18, class: 'sig-box', style: `--c: var(--${c})` }, gg);
        a.text(x, y + 6, t, 'note strong', { anchor: 'middle' }, gg);
      };
      pill(209, 800, 200, 'cholestérol (LDL)', 'p-gold', 'chol');
      pill(505, 800, 230, 'progestérone', 'p-violet', 'prog');
      pill(209, 900, 200, 'estriol (urines)', 'p-rose', 'e2');
      pill(505, 900, 230, 'sulfatase, aromatase', 'p-lime', 'zgo-fpu');
      pill(826, 800, 250, 'surrénale : DHEA-S', 'p-sky', 'dhea');
      pill(826, 900, 250, 'foie : 16α-OH-DHEA-S', 'p-sky', 'zgo-fpu');
      a.text(505, 852, 'pas de 17α-hydroxylase', 'note', { anchor: 'middle' });
      arr('M 310,800 L 386,800');
      arr('M 390,812 C 350,830 330,850 312,888');
      arr('M 826,820 L 826,878');
      arr('M 700,900 L 622,900');
      arr('M 388,900 L 312,900');
      a.flow('M 300,790 L 390,790', { mol: 'chol', rate: () => 0.9, size: 1, speed: 40, track: false });
      a.flow('M 826,822 L 826,876', { mol: 'dhea', rate: () => 1, size: 1.1, speed: 30, track: false });
      a.flow('M 700,890 L 622,890', { mol: 'dhea', rate: () => 1, size: 1.1, speed: 40, track: false });
      a.flow('M 388,890 L 312,890', { mol: 'e2', rate: () => 1, size: 1.1, speed: 40, track: false });
      a.flow('M 390,808 C 350,826 330,846 312,880', { mol: 'prog', rate: () => 0.9, size: 1.1, speed: 40, track: false });

      /* ---- Adaptations maternelles ---- */
      const AX = 1010, AW = 545;
      a.text(AX, 456, 'Adaptations maternelles', 'lbl-h');
      const card = (y, h, c, title, txt, info) => {
        const gg = a.el('g', { 'data-info': info });
        a.el('rect', { x: AX, y, width: AW, height: h, rx: 16, class: 'zgo-box', style: `--c: var(--${c})` }, gg);
        a.text(AX + 18, y + 30, title, 'lbl-s strong', null, gg);
        a.text(AX + 18, y + 58, txt, 'note', { lh: 1.25 }, gg);
      };
      card(474, 120, 'p-magenta', 'Hypophyse', ['Hyperplasie lactotrope : l\'hypophyse grossit (compl.).', 'Prolactine ↑ sous l\'effet des estrogènes (polycopié).'], 'zgo-preg-prl');
      card(606, 120, 'p-teal', 'Foie, thyroïde, surrénales (complément)', ['TBG ↑ : T4 totale ↑, T4 libre ≈ normale ; hCG → TSH ↓ au T1.', 'CBG ↑ : cortisol total ↑.'], 'zgo-tbg');
      card(738, 232, 'p-lime', 'Métabolisme glucidique', ['Insulinorésistance du 3e trimestre (hPL, progestérone,', 'cortisol, GH placentaire ; complément).', 'Dépistage du diabète gestationnel : HGPO 75 g', 'entre 24 et 28 SA (femmes à risque ; complément).', 'Seuils : à jeun ≥ 0,92 ; 1 h ≥ 1,80 ; 2 h ≥ 1,53 g/L.'], 'zgo-ir');

      let t = 0, txt = 0;
      a.dyn((dt) => {
        t = (t + dt / 24) % 1;
        const w = t * 40, x = X(w);
        cur.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
        S.forEach(([k], i) => { dots[i].setAttribute('cx', x.toFixed(1)); dots[i].setAttribute('cy', Y(PREG[k](w)).toFixed(1)); });
        txt -= dt;
        if (txt > 0) return;
        txt = 0.2;
        wT.textContent = Math.floor(w) + ' SA';
        lines[0].textContent = 'hCG : ' + (w < 4 ? 'encore indétectable' : w < 9 ? 'monte, maintient le corps jaune' : w < 12 ? 'au pic (≈ 10 SA)' : 'baisse puis plateau');
        lines[1].textContent = 'Progestérone : ' + (w < 7 ? 'corps jaune' : w < 10.5 ? 'corps jaune → placenta' : 'placenta');
        lines[2].textContent = w >= 24 && w < 28 ? 'Fenêtre de l\'HGPO (24–28 SA)' : w >= 28 ? 'Insulinorésistance maximale' : w < 14 ? '1er trimestre' : '2e trimestre';
      });

      HV.spotlight(preg, a, [
        { t: 'L\'hCG sauve le corps jaune', d: 'Sécrétée par le trophoblaste, l\'hCG agit comme la LH : le corps jaune ne régresse pas et continue de sécréter progestérone et estradiol. Pic vers 10 SA (complément).', spot: [[X(0), 220, X(16) - X(0), 390]] },
        { t: 'Le relais placentaire', d: 'Vers 8 à 10 SA, le placenta devient la source principale de progestérone et d\'estrogènes, qui montent jusqu\'au terme (complément).', spot: [[X(8) - 20, 220, X(40) - X(8) + 40, 390]] },
        { t: 'L\'unité fœto-placentaire', d: 'Sans 17α-hydroxylase, le placenta utilise le DHEA-S de la surrénale fœtale, hydroxylé par le foie fœtal, pour fabriquer l\'estriol (complément).', spot: [[60, 670, 940, 300]] },
        { t: 'Hypophyse et prolactine', d: 'Les estrogènes stimulent la sécrétion de prolactine pour préparer la lactation (polycopié) ; les cellules lactotropes se multiplient (complément).', spot: [[AX, 474, AW, 120]] },
        { t: 'Protéines de transport', d: 'Les estrogènes font augmenter la TBG et la CBG : les hormones totales augmentent, les fractions libres beaucoup moins. Interpréter T4 libre et TSH avec des normes de grossesse (complément).', spot: [[AX, 606, AW, 120]] },
        { t: 'Insulinorésistance', d: 'Au 3e trimestre, hPL, progestérone et cortisol diminuent la sensibilité à l\'insuline. Le dépistage du diabète gestationnel repose sur l\'HGPO 75 g entre 24 et 28 SA (complément).', spot: [[AX, 738, AW, 232], [X(26), 420, 90]] }
      ]);
    }
  }, HV.LOUPE.R(2)));

  /* =====================================================================
     4. Testicule : tube séminifère
     ===================================================================== */
  Object.assign(HV.INFO, {
    'zgo-sertoli': { t: 'Cellule de Sertoli', k: 'Cellule de soutien, stimulée par la FSH (polycopié)', d: 'Elle s\'étend de la lame basale à la lumière et entoure les cellules germinales. Ses jonctions serrées forment la barrière hémato-testiculaire ; elle sécrète l\'ABP (qui concentre la testostérone dans le tube), l\'inhibine B (rétrocontrôle négatif de la FSH) et, chez le fœtus, l\'AMH (complément pour l\'ABP et l\'AMH).' },
    'zgo-btb': { t: 'Barrière hémato-testiculaire', k: 'Jonctions serrées entre cellules de Sertoli (complément)', d: 'Sépare un compartiment basal (spermatogonies) d\'un compartiment adluminal (spermatocytes, spermatides), isolé du sang et du système immunitaire : les cellules haploïdes, apparues après la puberté, sont étrangères à l\'organisme.' },
    'zgo-spg': { t: 'Spermatogonies (2n)', k: 'Cellules souches, contre la lame basale', d: 'Se divisent par mitoses ; certaines entrent en méiose et deviennent spermatocytes.' },
    'zgo-spc': { t: 'Spermatocytes', k: 'Méiose (complément)', d: 'Le spermatocyte I fait la 1re division de méiose (longue prophase), puis le spermatocyte II la 2e division.' },
    'zgo-spt': { t: 'Spermatides (n)', k: 'Spermiogenèse (complément)', d: 'Cellules haploïdes qui se transforment en spermatozoïdes : condensation du noyau, acrosome, flagelle.' },
    'zgo-spz': { t: 'Spermatozoïdes', k: 'Libérés dans la lumière', d: 'Ils gagnent l\'épididyme, où ils acquièrent leur mobilité (complément). La spermatogenèse complète dure ≈ 74 jours (complément).' },
    'zgo-leydig': { t: 'Cellules de Leydig', k: 'Tissu interstitiel, stimulées par la LH (polycopié)', d: 'Produisent la testostérone à partir du cholestérol, via la DHEA et l\'androstènedione (polycopié). La testostérone diffuse vers les tubes (où elle est très concentrée) et vers le sang.' },
    'zgo-itt': { t: 'Testostérone intratesticulaire', k: 'Bien plus élevée que dans le sang (complément)', d: 'La testostérone et les cellules de Sertoli sont indispensables à la production des spermatozoïdes (polycopié). La testostérone exogène freine la LH : la testostérone intratesticulaire s\'effondre et la spermatogenèse s\'arrête (complément).' },
    'zgo-myoid': { t: 'Lame basale et cellules myoïdes', k: 'Paroi du tube (complément)', d: 'Les cellules myoïdes, contractiles, font progresser les spermatozoïdes vers le rete testis.' },
    'zgo-capT': { t: 'Capillaire de l\'interstitium', k: 'Apport de LH et FSH, départ de la testostérone et de l\'inhibine B', d: 'La testostérone gagne la circulation générale (tissus cibles, rétrocontrôle négatif) ; l\'inhibine B freine la FSH hypophysaire.' }
  });
  const tes = HV.scene(Object.assign({
    id: 'testis-sec', parent: 'gonadoM', loupe: 'Tube séminifère',
    title: 'Testicule : tube séminifère', level: 'Tissu et cellule',
    lead: 'Les tubes séminifères produisent les spermatozoïdes : les cellules germinales y mûrissent au contact des cellules de Sertoli, stimulées par la FSH. Entre les tubes, le tissu interstitiel contient les cellules de Leydig, stimulées par la LH, qui produisent la testostérone. La testostérone et les cellules de Sertoli sont indispensables à la spermatogenèse (polycopié).',
    points: [
      'Sertoli (FSH) : barrière hémato-testiculaire, ABP, inhibine B (rétrocontrôle de la FSH), AMH chez le fœtus (complément sauf inhibine B).',
      'Spermatogonies → spermatocytes (méiose) → spermatides → spermatozoïdes : ≈ 74 jours (complément).',
      'Leydig (LH) → testostérone, très concentrée dans le testicule, bien plus que dans le sang (complément).',
      'Testostérone exogène : LH et FSH freinées, spermatogenèse arrêtée. Klinefelter : tubes hyalinisés, azoospermie.',
      'Changez de scénario dans le panneau pour voir l\'effet sur le tube.'
    ],
    source: POLY,
    legend: new Set(['lh', 'fsh', 'testo', 'inhib']),
    build(g, a) {
      a.frame('Testicule : tube séminifère', 'Coupe transversale · cellules de Sertoli, lignée germinale, cellules de Leydig');
      const sim = HV.scenes.gonadoM.sim;
      tes.sim = sim;
      const S = () => sim.s, P = () => sim.p;
      HV.figBadge(a, 1180, 92, ['31', '34']);
      let seed = 11;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const C = [560, 600], Rb = 300, Rl = 78;
      const pt = (an, r) => [C[0] + Math.cos(an) * r, C[1] + Math.sin(an) * r];

      // Interstitium : capillaires et tubes voisins
      a.path('M 120,190 C 100,380 150,560 110,960', 'zgo-cap', null, { 'data-info': 'zgo-capT' });
      a.path('M 960,190 C 930,380 990,700 950,960', 'zgo-cap-l', null, { 'data-info': 'zgo-capT' });
      a.text(120, 182, 'capillaire', 'note', { anchor: 'middle' });
      // Paroi
      a.el('circle', { cx: C[0], cy: C[1], r: Rb + 14, class: 'zgo-tub', 'data-info': 'zgo-myoid' });
      for (let k = 0; k < 28; k++) {
        const an = (k / 28) * Math.PI * 2, p = pt(an, Rb + 8);
        a.el('ellipse', { cx: p[0], cy: p[1], rx: 18, ry: 4, transform: `rotate(${(an * 180) / Math.PI + 90} ${p[0]} ${p[1]})`, class: 'zgo-myo', 'data-info': 'zgo-myoid' });
      }
      a.el('circle', { cx: C[0], cy: C[1], r: Rb, class: 'zgo-lumen', style: 'fill: var(--scene-1)' });
      // Sertoli
      const NS = 9, sertG = a.el('g', { 'data-info': 'zgo-sertoli' });
      for (let k = 0; k < NS; k++) {
        const an = (k / NS) * Math.PI * 2 + 0.2, w0 = 0.13, w1 = 0.06;
        const b1 = pt(an - w0, Rb - 2), b2 = pt(an + w0, Rb - 2), m1 = pt(an - 0.05, Rb - 150), m2 = pt(an + 0.05, Rb - 150), t1 = pt(an - w1, Rl + 4), t2 = pt(an + w1, Rl + 4);
        a.path(`M ${b1} Q ${m1} ${t1} L ${t2} Q ${m2} ${b2} Z`, 'zgo-sert', sertG);
        const n = pt(an, Rb - 52);
        a.el('ellipse', { cx: n[0], cy: n[1], rx: 10, ry: 20, transform: `rotate(${(an * 180) / Math.PI + 90} ${n[0]} ${n[1]})`, class: 'zgo-sert-n' }, sertG);
      }
      // Lignée germinale (entre les Sertoli)
      const germ = a.el('g');
      const gc = (cls, info, c) => a.el('g', { 'data-info': info, style: `--c: var(--${c})` }, germ);
      const gSpg = gc('', 'zgo-spg', 'p-violet'), gSpc = gc('', 'zgo-spc', 'p-magenta'), gSpt = gc('', 'zgo-spt', 'p-blue2'), gSpz = gc('', 'zgo-spz', 'p-blue');
      for (let k = 0; k < NS; k++) {
        const an = ((k + 0.5) / NS) * Math.PI * 2 + 0.2;
        [-0.09, 0.09].forEach((o) => {
          const p = pt(an + o, Rb - 22);
          a.el('circle', { cx: p[0], cy: p[1], r: 13, class: 'zgo-germ' }, gSpg);
          a.el('circle', { cx: p[0], cy: p[1], r: 6, class: 'zgo-germ-n' }, gSpg);
        });
        [[-0.08, Rb - 95], [0.08, Rb - 100], [0, Rb - 140]].forEach(([o, r]) => {
          const p = pt(an + o, r);
          a.el('circle', { cx: p[0], cy: p[1], r: 17, class: 'zgo-germ' }, gSpc);
          a.path(`M ${p[0] - 7},${p[1] - 4} q 4,-6 8,0 t 7,2 M ${p[0] - 6},${p[1] + 5} q 4,-5 9,0`, 'zgo-tail', gSpc, { style: 'stroke: var(--p-magenta)' });
        });
        [[-0.07, Rb - 180], [0.07, Rb - 180], [0, Rb - 202]].forEach(([o, r]) => {
          const p = pt(an + o, r);
          a.el('circle', { cx: p[0], cy: p[1], r: 9, class: 'zgo-germ' }, gSpt);
          a.el('circle', { cx: p[0], cy: p[1], r: 4, class: 'zgo-germ-n' }, gSpt);
        });
        [-0.05, 0.05].forEach((o) => {
          const p = pt(an + o, Rb - 228), q = pt(an + o, Rl - 10);
          a.el('ellipse', { cx: p[0], cy: p[1], rx: 4, ry: 9, transform: `rotate(${(an * 180) / Math.PI + 90} ${p[0]} ${p[1]})`, class: 'zgo-germ' }, gSpz);
          a.path(`M ${p[0]},${p[1]} Q ${(p[0] + q[0]) / 2 + 8},${(p[1] + q[1]) / 2 - 6} ${q[0]},${q[1]}`, 'zgo-tail', gSpz);
        });
      }
      // Barrière hémato-testiculaire
      a.el('circle', { cx: C[0], cy: C[1], r: Rb - 52, class: 'zgo-bm', style: 'stroke: var(--p-red2); opacity: 0.6', 'data-info': 'zgo-btb' });
      for (let k = 0; k < NS; k++) {
        const an = (k / NS) * Math.PI * 2 + 0.2, p1 = pt(an - 0.13, Rb - 50), p2 = pt(an + 0.13, Rb - 50);
        a.path(`M ${p1} L ${pt(an - 0.1, Rb - 56)}`, 'zgo-tj', null, { 'data-info': 'zgo-btb' });
        a.path(`M ${p2} L ${pt(an + 0.1, Rb - 56)}`, 'zgo-tj', null, { 'data-info': 'zgo-btb' });
      }
      // Lumière
      a.el('circle', { cx: C[0], cy: C[1], r: Rl - 16, class: 'zgo-lumen', 'data-info': 'zgo-spz' });
      a.text(C[0], C[1] - 4, 'lumière', 'note strong', { anchor: 'middle' });
      a.text(C[0], C[1] + 18, 'ABP', 'note', { anchor: 'middle', attrs: { 'data-info': 'zgo-sertoli' } });
      // Leydig
      const leyd = a.el('g', { 'data-info': 'zgo-leydig' });
      const cluster = (cx, cy) => {
        for (let k = 0; k < 6; k++) {
          const x = cx + (k % 3) * 34 - 34 + rnd() * 6, y = cy + Math.floor(k / 3) * 34 - 17 + rnd() * 6;
          a.el('path', { d: `M ${x - 15},${y - 8} L ${x - 4},${y - 17} L ${x + 13},${y - 12} L ${x + 16},${y + 6} L ${x + 4},${y + 16} L ${x - 13},${y + 11} Z`, class: 'zgo-leyd' }, leyd);
          a.el('circle', { cx: x + 3, cy: y, r: 5, class: 'zgo-nuc', style: '--c: var(--p-amber)' }, leyd);
          a.el('circle', { cx: x - 7, cy: y + 6, r: 2.5, class: 'zgo-lip' }, leyd);
        }
      };
      cluster(200, 300); cluster(195, 860); cluster(920, 250);
      a.text(200, 378, 'cellules de Leydig', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zgo-leydig' } });
      a.text(195, 920, 'Leydig', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zgo-leydig' } });
      // Flux
      a.flow('M 112,250 C 140,260 150,290 172,296', { mol: 'lh', rate: () => 1.2 * S().lh, size: 1.1, speed: 40, track: false });
      a.flow('M 115,820 C 140,830 150,850 170,856', { mol: 'lh', rate: () => 1.2 * S().lh, size: 1.1, speed: 40, track: false });
      a.flow('M 960,190 C 950,215 935,230 925,240', { mol: 'lh', rate: () => 0.8 * S().lh, size: 1.1, speed: 30, track: false });
      a.flow('M 236,322 C 260,360 270,390 296,420', { mol: 'testo', rate: () => 2 * S().t, pace: () => HV.paceOf(S().t), size: 1.1, speed: 50, track: false });
      a.flow('M 168,320 C 150,350 130,380 118,420', { mol: 'testo', rate: () => 1 * S().t, size: 1.1, speed: 40, track: false });
      a.flow('M 232,840 C 260,810 280,790 300,770', { mol: 'testo', rate: () => 2 * S().t, size: 1.1, speed: 50, track: false });
      a.flow('M 112,600 C 160,600 220,605 262,610', { mol: 'fsh', rate: () => 1.3 * S().fsh, pace: () => HV.paceOf(S().fsh), size: 1.1, speed: 60, track: false });
      a.text(175, 586, 'FSH', 'zgo-ctag', { anchor: 'middle', attrs: { style: '--c: var(--p-rose)' } });
      a.flow('M 266,700 C 220,700 170,690 118,700', { mol: 'inhib', rate: () => 1 * S().inh, size: 1.1, speed: 50, track: false });
      a.text(185, 730, 'inhibine B', 'zgo-ctag', { anchor: 'middle', attrs: { style: '--c: var(--p-brown)' } });

      /* ---- Panneau ---- */
      const RX = 1010, RW = 545;
      a.text(RX, 262, 'Cellules', 'lbl-h');
      const items = [['zgo-sert', null, 'cellule de Sertoli (FSH)', 'zgo-sertoli'], ['zgo-germ', 'p-violet', 'spermatogonie (2n)', 'zgo-spg'], ['zgo-germ', 'p-magenta', 'spermatocyte (méiose)', 'zgo-spc'],
        ['zgo-germ', 'p-blue2', 'spermatide (n)', 'zgo-spt'], ['zgo-germ', 'p-blue', 'spermatozoïde', 'zgo-spz'], ['zgo-leyd', null, 'cellule de Leydig (LH)', 'zgo-leydig'], ['zgo-tj', null, 'barrière hémato-testiculaire', 'zgo-btb']];
      items.forEach(([cls, c, l, info], i) => {
        const gg = a.el('g', { 'data-info': info, transform: `translate(${RX + 14 + (i % 2) * 270} ${296 + Math.floor(i / 2) * 32})` });
        if (cls === 'zgo-tj') a.path('M -8,0 L 8,0', 'zgo-tj', gg);
        else a.el('circle', { r: 10, class: cls, style: c ? `--c: var(--${c})` : null }, gg);
        a.text(20, 6, l, 'note', null, gg);
      });
      // Chaîne de la spermatogenèse
      box(a, RX, 420, RW, 120, 'p-blue');
      a.text(RX + 18, 450, 'Spermatogenèse ≈ 74 jours (complément)', 'lbl-s strong', { attrs: { 'data-info': 'zgo-spz' } });
      a.text(RX + 18, 482, 'spermatogonie → spermatocyte I → II (méiose)', 'note');
      a.text(RX + 18, 508, '→ spermatide → spermatozoïde (spermiogenèse)', 'note');
      // Testostérone intratesticulaire
      box(a, RX, 556, RW, 132, 'p-blue', null, 'zgo-itt');
      a.text(RX + 18, 586, 'Testostérone intratesticulaire', 'lbl-s strong', { attrs: { 'data-info': 'zgo-itt' } });
      a.text(RX + 18, 614, ['Bien plus élevée que dans le sang (complément).', 'Indispensable à la spermatogenèse, avec Sertoli.'], 'note', { lh: 1.25 });
      const itt = a.el('rect', { x: RX + 18, y: 662, width: 10, height: 12, rx: 6, class: 'lvl-bar', style: '--mc: var(--p-blue)' });
      a.el('rect', { x: RX + 18, y: 662, width: RW - 36, height: 12, rx: 6, class: 'lvl-bg', 'fill-opacity': 0.4 });
      // Sertoli
      box(a, RX, 704, RW, 170, 'p-teal', null, 'zgo-sertoli');
      a.text(RX + 18, 734, 'La cellule de Sertoli', 'lbl-s strong');
      a.text(RX + 18, 762, ['jonctions serrées : barrière hémato-testiculaire', 'ABP : garde la testostérone dans le tube (compl.)', 'inhibine B : rétrocontrôle négatif de la FSH', 'AMH chez le fœtus : régression de Müller (compl.)'], 'note', { lh: 1.25 });
      const stT = a.text(RX, 908, '', 'note strong', { lh: 1.25 });

      let txt = 0;
      a.dyn((dt) => {
        sim.step(dt);
        const s = S(), p = P();
        const sert = clamp(p.sertoli, 0, 1), ittV = clamp(s.t / 1, 0, 1.3);
        const sp = clamp(Math.min(sert, ittV), 0, 1);
        gSpc.setAttribute('opacity', (0.1 + 0.9 * sp).toFixed(2));
        gSpt.setAttribute('opacity', (0.05 + 0.95 * sp * sp).toFixed(2));
        gSpz.setAttribute('opacity', (0.05 + 0.95 * sp * sp).toFixed(2));
        gSpg.setAttribute('opacity', (0.3 + 0.7 * sert).toFixed(2));
        sertG.setAttribute('opacity', (0.35 + 0.65 * sert).toFixed(2));
        leyd.setAttribute('opacity', (0.3 + 0.7 * clamp(p.leydig * Math.min(1, s.lh), 0, 1)).toFixed(2));
        itt.setAttribute('width', (10 + (RW - 46) * clamp(s.t / 1.3, 0, 1)).toFixed(0));
        txt -= dt;
        if (txt > 0) return;
        txt = 0.3;
        const msg = p.exoT > 0.05 ? ['Testostérone exogène : LH et FSH freinées, la testostérone', 'intratesticulaire chute, la spermatogenèse s\'arrête.']
          : p.sertoli < 0.5 ? ['Atteinte testiculaire (Klinefelter) : tubes hyalinisés,', 'azoospermie, inhibine B basse, FSH et LH élevées.']
            : p.hypo < 0.5 ? ['Déficit en GnRH : sans LH ni FSH, Leydig et Sertoli', 'ne sont plus stimulées : testostérone basse, pas de spermatozoïdes.']
              : ['Axe normal : la LH fait produire la testostérone,', 'la FSH et la testostérone soutiennent la spermatogenèse.'];
        stT.textContent = '';
        msg.forEach((ln, i) => HV.el('tspan', { x: RX, dy: i ? '1.25em' : 0, text: ln }, stT));
      });

      HV.spotlight(tes, a, [
        { t: 'Le tube séminifère', d: 'Une paroi (lame basale, cellules myoïdes), des cellules de Sertoli qui vont de la base à la lumière, et la lignée germinale entre elles.', spot: [[C[0], C[1], Rb + 20]] },
        { t: 'La cellule de Sertoli', d: 'Stimulée par la FSH, elle nourrit et protège les cellules germinales, sécrète l\'ABP et l\'inhibine B, et forme la barrière hémato-testiculaire par ses jonctions serrées.', spot: [[C[0], C[1], Rb - 40], [RX, 704, RW, 170]] },
        { t: 'De la spermatogonie au spermatozoïde', d: 'Les spermatogonies, contre la lame basale, entrent en méiose (spermatocytes) puis donnent des spermatides et des spermatozoïdes libérés dans la lumière : ≈ 74 jours (complément).', spot: [[C[0], C[1], Rb], [RX, 420, RW, 120]] },
        { t: 'Les cellules de Leydig', d: 'Dans le tissu interstitiel, près des capillaires, elles produisent la testostérone sous l\'effet de la LH (polycopié).', spot: [[180, 300, 110], [190, 860, 100], [920, 250, 80]] },
        { t: 'Une testostérone très concentrée', d: 'La testostérone diffuse dans les tubes, où elle est bien plus concentrée que dans le sang (complément). C\'est pourquoi la testostérone exogène, qui freine la LH, arrête la spermatogenèse.', spot: [[RX, 556, RW, 132]] },
        { t: 'Les rétrocontrôles', d: 'La testostérone freine la GnRH et la LH ; l\'inhibine B des cellules de Sertoli freine la FSH (polycopié).', spot: [[180, 650, 120]] }
      ]);
    }
  }, HV.LOUPE.R(0)));

  /* =====================================================================
     5. Différenciation sexuelle
     ===================================================================== */
  Object.assign(HV.INFO, {
    'zgo-bip': { t: 'Gonade bipotentielle', k: 'Crête génitale (complément)', d: 'Au début de la vie embryonnaire, la gonade est indifférenciée et l\'embryon possède les deux systèmes de canaux : canaux de Wolff et canaux de Müller.' },
    'zgo-sry': { t: 'SRY', k: 'Gène du chromosome Y', d: 'La différenciation testiculaire dépend principalement de la présence du chromosome Y (polycopié). SRY déclenche (via SOX9) la différenciation des cellules de Sertoli (complément).' },
    'zgo-amh': { t: 'AMH (hormone antimüllérienne)', k: 'Cellules de Sertoli fœtales (complément)', d: 'Fait régresser les canaux de Müller du côté où elle est sécrétée.' },
    'zgo-wolff': { t: 'Canaux de Wolff', k: 'Testostérone (complément)', d: 'La testostérone, à forte concentration locale, les stabilise : épididyme, canal déférent, vésicules séminales. Sans testostérone, ils régressent.' },
    'zgo-muller': { t: 'Canaux de Müller', k: 'Trompes, utérus, haut du vagin (complément)', d: 'Se développent en l\'absence d\'AMH.' },
    'zgo-5ar': { t: '5α-réductase de type 2', k: 'Testostérone → DHT (complément)', d: 'La dihydrotestostérone, androgène plus puissant, virilise le sinus urogénital et les organes génitaux externes : pénis, scrotum, prostate.' },
    'zgo-dsd1': { t: 'Déficit en 5α-réductase (46,XY)', k: 'Complément', d: 'Testicules, AMH et testostérone normales : pas d\'utérus, canaux de Wolff présents. Mais peu de DHT : organes génitaux externes féminins ou atypiques à la naissance ; virilisation partielle à la puberté.' },
    'zgo-dsd2': { t: 'Insensibilité complète aux androgènes (46,XY)', k: 'Récepteur des androgènes inactif (complément)', d: 'Testicules (souvent inguinaux) et AMH : pas d\'utérus. Ni Wolff ni virilisation : organes génitaux externes féminins, vagin court. À la puberté, seins par aromatisation de la testostérone, pilosité pubienne absente ou rare, aménorrhée primaire.' },
    'zgo-dsd3': { t: 'Bloc en 21-hydroxylase chez la fille 46,XX', k: 'Hyperplasie congénitale des surrénales (polycopié, partie 1)', d: 'Les ovaires, l\'utérus et les trompes se développent normalement ; l\'excès d\'androgènes surrénaliens virilise les organes génitaux externes (hypertrophie clitoridienne, fusion des lèvres). Dépistage néonatal par la 17-hydroxyprogestérone au 3e jour.' }
  });
  const sexd = HV.scene(Object.assign({
    id: 'sexdiff', parent: 'gonadoM', loupe: 'Différenciation sexuelle',
    title: 'Différenciation sexuelle', level: 'Notion',
    lead: 'La différenciation des gonades primitives en testicules ou en ovaires est génétiquement déterminée et dépend principalement de la présence du chromosome Y. La formation des organes génitaux masculins nécessite un testicule fonctionnel et sécréteur ; en l\'absence de tissu testiculaire, le développement est féminin (polycopié).',
    points: [
      'Gonade bipotentielle + SRY (chromosome Y) → testicule (polycopié).',
      'AMH (Sertoli) → régression des canaux de Müller ; testostérone (Leydig) → canaux de Wolff (complément).',
      'Testostérone → 5α-réductase → DHT → organes génitaux externes masculins (complément).',
      'Sans testicule : développement féminin (polycopié).',
      'Déficit en 5α-réductase, insensibilité aux androgènes, bloc en 21-hydroxylase chez la fille 46,XX (complément).'
    ],
    source: POLY,
    legend: new Set(['testo']),
    build(g, a) {
      a.frame('Différenciation sexuelle', 'Gonade bipotentielle → testicule ou ovaire → canaux et organes génitaux');
      const arr = arrows(a, 'sex');
      const node = (x, y, w, h, t, c, info, sub) => {
        const gg = a.el('g', { 'data-info': info || null });
        a.el('rect', { x, y, width: w, height: h, rx: 18, class: 'zgo-box', style: `--c: var(--${c})` }, gg);
        a.text(x + w / 2, y + (sub ? h / 2 - 4 : h / 2 + 7), t, 'lbl-s strong', { anchor: 'middle' }, gg);
        if (sub) a.text(x + w / 2, y + h / 2 + 20, sub, 'note', { anchor: 'middle' }, gg);
        return gg;
      };
      a.text(60, 186, '46,XY', 'lbl-h');
      a.text(60, 528, '46,XX', 'lbl-h');
      node(60, 330, 220, 100, 'gonade', 'p-grey', 'zgo-bip', 'bipotentielle');
      a.text(170, 460, ['+ canaux de Wolff', 'et de Müller'], 'note', { anchor: 'middle', lh: 1.2 });
      // Voie masculine
      node(330, 230, 170, 76, 'SRY', 'p-blue', 'zgo-sry', 'chromosome Y');
      node(550, 200, 210, 136, '', 'p-blue', 'zgo-sertoli');
      a.text(655, 232, 'testicule', 'lbl-s strong', { anchor: 'middle' });
      a.text(655, 266, 'Sertoli → AMH', 'note', { anchor: 'middle', attrs: { 'data-info': 'zgo-amh' } });
      a.text(655, 300, 'Leydig → testostérone', 'note', { anchor: 'middle', attrs: { 'data-info': 'zgo-leydig' } });
      arr('M 282,360 C 300,330 310,280 328,272');
      arr('M 502,268 L 548,268');
      arr('M 762,250 L 806,228');
      arr('M 762,300 L 806,304');
      // hormones
      node(810, 196, 200, 56, 'AMH', 'p-teal', 'zgo-amh');
      node(810, 276, 200, 56, 'testostérone', 'p-blue', 'testo');
      node(810, 356, 200, 56, 'DHT', 'p-blue2', 'zgo-5ar');
      arr('M 910,334 L 910,354');
      a.text(1020, 348, '5α-réductase', 'note strong', { attrs: { 'data-info': 'zgo-5ar' } });
      // résultats
      node(1190, 196 + 30, 360, 50, 'Müller : régression', 'p-teal', 'zgo-muller');
      node(1190, 286, 360, 56, 'Wolff : voies spermatiques', 'p-blue', 'zgo-wolff');
      node(1190, 366, 360, 56, 'OGE masculins, prostate', 'p-blue2', 'zgo-5ar');
      a.text(1370, 440, 'épididyme, déférent, vésicules séminales (Wolff)', 'note', { anchor: 'middle' });
      arr('M 1012,224 C 1100,224 1120,250 1188,251');
      arr('M 1012,304 L 1188,312');
      arr('M 1012,384 L 1188,392');
      a.flow('M 760,250 C 780,240 790,226 810,224', { mol: 'dot', style: 'fill: var(--p-teal)', rate: () => 1.4, size: 1.3, speed: 40, track: false });
      a.flow('M 1012,224 C 1100,224 1120,250 1188,251', { mol: 'dot', style: 'fill: var(--p-teal)', rate: () => 1.2, size: 1.3, speed: 70, track: false });
      a.flow('M 760,300 L 810,304', { mol: 'testo', rate: () => 1.4, size: 1.1, speed: 40, track: false });
      a.flow('M 1012,304 L 1188,312', { mol: 'testo', rate: () => 1.2, size: 1.1, speed: 70, track: false });
      a.flow('M 1012,384 L 1188,392', { mol: 'dot', style: 'fill: var(--p-blue2)', rate: () => 1.2, size: 1.3, speed: 70, track: false });
      // Voie féminine
      node(330, 480, 170, 76, 'pas de SRY', 'p-rose', 'zgo-sry', '');
      node(550, 470, 210, 96, 'ovaire', 'p-rose', 'zgo-bip', 'pas d\'AMH ni de T');
      arr('M 282,410 C 300,450 310,500 328,512');
      arr('M 502,518 L 548,518');
      node(1190, 470, 360, 50, 'Müller : trompes, utérus', 'p-rose', 'zgo-muller');
      node(1190, 530, 360, 50, 'Wolff : régression', 'p-grey', 'zgo-wolff');
      node(1190, 590, 360, 50, 'OGE féminins', 'p-rose', 'zgo-bip');
      arr('M 762,518 C 950,518 1050,496 1188,495');
      arr('M 762,530 C 950,540 1080,555 1188,555');
      arr('M 762,545 C 950,580 1080,615 1188,615');
      a.text(960, 656, ['voie féminine « par défaut » : sans testicule,', 'le développement est féminin (polycopié)'], 'note', { anchor: 'middle', lh: 1.2 });

      // Exemples
      a.text(60, 712, 'Quand la voie se bloque (complément)', 'lbl-h');
      const cases = [
        ['zgo-dsd1', 'Déficit en 5α-réductase', '46,XY', [['testicules', 1], ['Müller régressé (AMH)', 1], ['Wolff présent', 1], ['OGE peu virilisés (DHT ↓)', 0]], 'virilisation partielle à la puberté'],
        ['zgo-dsd2', 'Insensibilité aux androgènes', '46,XY', [['testicules', 1], ['Müller régressé (AMH)', 1], ['Wolff absent', 0], ['OGE féminins', 0]], 'seins à la puberté, aménorrhée primaire'],
        ['zgo-dsd3', 'Bloc en 21-hydroxylase', '46,XX', [['ovaires, utérus normaux', 1], ['androgènes surrénaliens ↑', 0], ['OGE virilisés', 0], ['pas d\'AMH : Müller présent', 1]], 'polycopié, partie 1']
      ];
      cases.forEach(([info, t, k, rows, foot], i) => {
        const x = 60 + i * 500, gg = a.el('g', { 'data-info': info });
        a.el('rect', { x, y: 732, width: 480, height: 236, rx: 18, class: 'zgo-box', style: `--c: var(--${i === 2 ? 'p-rose' : 'p-blue'})` }, gg);
        a.text(x + 20, 766, t, 'lbl-s strong', null, gg);
        a.text(x + 460, 766, k, 'zgo-val', { anchor: 'end' }, gg);
        rows.forEach(([r, ok], j) => {
          a.text(x + 24, 806 + j * 32, ok ? '✓' : '✗', 'lbl-s strong', { attrs: { style: `fill: var(--${ok ? 'good' : 'warn'})` } }, gg);
          a.text(x + 52, 806 + j * 32, r, 'note', null, gg);
        });
        a.text(x + 24, 950, foot, 'note', { attrs: { 'font-style': 'italic' } }, gg);
      });

      HV.spotlight(sexd, a, [
        { t: 'Une gonade bipotentielle', d: 'Au début, la gonade peut devenir testicule ou ovaire, et l\'embryon possède à la fois les canaux de Wolff et de Müller (complément).', spot: [[60, 320, 220, 170]] },
        { t: 'SRY fait le testicule', d: 'La différenciation testiculaire dépend principalement du chromosome Y (polycopié) : SRY oriente la gonade vers le testicule.', spot: [[320, 190, 450, 160]] },
        { t: 'AMH et testostérone', d: 'Les cellules de Sertoli sécrètent l\'AMH, qui fait régresser les canaux de Müller ; les cellules de Leydig sécrètent la testostérone, qui maintient les canaux de Wolff (complément).', spot: [[800, 186, 760, 170]] },
        { t: 'La DHT virilise les organes externes', d: 'La 5α-réductase transforme la testostérone en DHT, nécessaire à la formation du pénis, du scrotum et de la prostate (complément).', spot: [[800, 330, 760, 120]] },
        { t: 'La voie féminine', d: 'Sans testicule, pas d\'AMH ni de testostérone : les canaux de Müller forment trompes et utérus, les canaux de Wolff régressent, les organes externes sont féminins (polycopié).', spot: [[320, 460, 1240, 190]] },
        { t: 'Trois exemples', d: 'Selon l\'étape bloquée, gonades, canaux et organes externes ne concordent plus (complément ; HCS : polycopié, partie 1).', spot: [[60, 700, 1490, 270]] }
      ]);
    }
  }, HV.LOUPE.R(1)));

  /* =====================================================================
     6. Puberté
     ===================================================================== */
  Object.assign(HV.INFO, {
    'zgo-life': { t: 'L\'axe gonadotrope au cours de la vie', k: 'Polycopié, partie 2 page 1', d: 'Actif pendant la vie fœtale, il le reste trois à six mois après la naissance (« mini-puberté »), puis entre en quiescence pendant toute l\'enfance. La puberté commence par la réactivation progressive des pics pulsatiles de GnRH : FSH puis LH, avec augmentation de la fréquence et de l\'amplitude des pics de LH.' },
    'zgo-pulse': { t: 'Pulses de LH', k: 'Reflet de la GnRH pulsatile', d: 'Au début de la puberté, les pulses de LH apparaissent d\'abord pendant le sommeil (complément), puis s\'étendent au jour et à la nuit à l\'âge adulte (complément).' },
    'zgo-adren': { t: 'Adrénarche', k: 'Androgènes surrénaliens (complément)', d: 'Quelques années avant la puberté, la zone réticulée de la corticosurrénale augmente la sécrétion de DHEA et DHEA-S, indépendamment de l\'axe gonadotrope. Chez la fille, la pilosité pubienne et axillaire reflète la synthèse des androgènes surrénaliens et non l\'activité de l\'axe gonadotrope (polycopié).' },
    'zgo-tannerS': { t: 'Stades de Tanner : seins (S)', k: 'Polycopié, tableau 4', d: 'S1 : pas de tissu glandulaire ; S2 : bourgeon mammaire ; S3 : saillie du sein et de l\'aréole ; S4 : saillie de l\'aréole et du mamelon en avant du sein ; S5 : morphologie adulte.' },
    'zgo-tannerG': { t: 'Stades de Tanner : organes génitaux (G)', k: 'Polycopié, tableau 4 · orchidomètre de Prader', d: 'G1 : < 4 mL ; G2 : 4 à 6–8 mL, pigmentation du scrotum ; G3 : 8 à 12 mL, début d\'allongement de la verge ; G4 : 12 à 16 mL ; G5 : > 20 mL, morphologie adulte.' },
    'zgo-tannerP': { t: 'Stades de Tanner : pilosité pubienne (P)', k: 'Polycopié, tableau 4', d: 'P1 : aucune ; P2 : quelques poils droits ; P3 : plus denses, épais, bouclés ; P4 : triangulaire fournie ; P5 : adulte, extension aux cuisses.' },
    'zgo-girl': { t: 'Chronologie chez la fille', k: 'Polycopié, page 10', d: 'Développement mammaire de 8,5 à 13,3 ans (précoce avant 8 ans, retardé après 13 ans) ; pilosité de 9 à 14 ans (pubienne vers 12 ans) ; ménarche de 10 à 15 ans, 2 à 2,5 ans après les premiers signes, vers 12–13 ans. L\'accélération de la croissance est associée aux premiers signes ou les précède de quelques mois. Aménorrhée primaire : pas de règles après 15 ans ou 3 ans après le début des seins.' },
    'zgo-boy': { t: 'Chronologie chez le garçon', k: 'Polycopié, page 9', d: 'Volume testiculaire d\'abord (Sertoli et tubes sous FSH ; précoce avant 9 ans, retardé après 14 ans) ; pilosité pubienne dans l\'année ; verge vers 13 ans ; pilosité axillaire 12 à 18 mois après le début ; pilosité faciale et mue vers 15 ans. L\'accélération de la croissance survient après le démarrage pubertaire.' }
  });
  const pub = HV.scene(Object.assign({
    id: 'puberte', parent: 'gonadoM', loupe: 'Puberté',
    title: 'Puberté', level: 'Notion',
    lead: 'La puberté commence par la réactivation progressive des pics pulsatiles de GnRH, quiescents pendant l\'enfance : FSH puis LH augmentent, avec des pics de LH plus fréquents et plus amples. Les stéroïdes sexuels font apparaître les caractères sexuels secondaires, dont la progression se cote selon les stades de Tanner (polycopié, partie 2, pages 1 et 7 à 10).',
    points: [
      'Axe actif chez le fœtus et 3 à 6 mois après la naissance, puis quiescent pendant l\'enfance (polycopié).',
      'Fille : seins (8,5–13,3 ans) → pilosité (pubienne vers 12 ans) → ménarche vers 12–13 ans, 2 à 2,5 ans après le début (polycopié).',
      'Garçon : volume testiculaire ≥ 4 mL → pilosité pubienne → verge vers 13 ans → pilosité axillaire, faciale, mue vers 15 ans (polycopié).',
      'Pic de croissance : précoce chez la fille, après le démarrage pubertaire chez le garçon (polycopié).',
      'Précoce : seins avant 8 ans, testicules avant 9 ans ; retardée : après 13 ans (fille), 14 ans (garçon) (polycopié).'
    ],
    source: 'Source : Polycopié de sémiologie endocrinienne, CEEDMM, 2e édition 2023, partie 2 pages 1 et 7 à 10 (tableau 4, figures 36 et 37) ; compléments signalés.',
    legend: new Set(['gnrh', 'lh', 'fsh', 'testo', 'e2']),
    build(g, a) {
      a.frame('Puberté', 'Réveil de la GnRH pulsatile · chronologie · stades de Tanner');
      HV.figBadge(a, 1180, 92, ['36', '37']);
      /* ---- Activité de l'axe au cours de la vie ---- */
      const L0 = 90, L1 = 690, LB = 400;
      a.text(60, 196, 'Activité de l\'axe gonadotrope au cours de la vie', 'lbl-s strong', { attrs: { 'data-info': 'zgo-life' } });
      const lifeX = [[0, 'fœtus'], [0.22, 'naissance'], [0.36, '6 mois'], [0.58, 'enfance'], [0.8, 'puberté'], [1, 'adulte']];
      const lifeF = (u) => (u < 0.2 ? 0.75 * G(u, 0.11, 0.07) + 0.1 : u < 0.4 ? 0.1 + 0.6 * G(u, 0.27, 0.05) : u < 0.68 ? 0.1 : 0.1 + 0.8 * smooth((u - 0.68) / 0.22));
      const LX = (u) => L0 + u * (L1 - L0), LY = (v) => LB - v * 170;
      a.path(`M ${L0},${LB} L ${L1},${LB}`, 'zgo-axis');
      area(a, lifeF, LX, LY, 0, 1, LB, 'p-violet');
      curve(a, lifeF, LX, LY, 0, 1, 'p-violet', '', null, 'zgo-life');
      lifeX.forEach(([u, t]) => a.text(LX(u), LB + 24, t, 'zgo-tick', { anchor: 'middle' }));
      a.text(LX(0.27), LY(0.7) - 12, 'mini-puberté', 'note', { anchor: 'middle' });
      a.text(LX(0.54), LY(0.1) - 14, 'quiescence', 'note', { anchor: 'middle' });
      a.text(LX(0.9), LY(0.9) - 14, 'réactivation', 'note', { anchor: 'middle' });

      /* ---- Pulses de LH sur 24 h ---- */
      const pulse = (h, amp, night) => {
        let v = 0.05;
        for (let c = -1; c < 17; c++) {
          const ct = c * 1.5 + 0.3, nn = ct >= 21 || ct < 6;
          if (night && !nn) continue;
          v += amp * (nn && night ? 1 : 0.85) * Math.exp(-Math.max(0, h - ct) / 0.35) * (h >= ct ? 1 : 0);
        }
        return v;
      };
      const PL = [['prépubère', (h) => 0.05 + 0.03 * Math.sin(h)], ['début de puberté', (h) => pulse(h, 0.6, true)], ['adulte', (h) => pulse(h, 0.55, false)]];
      const PW = 245, PH = 140, PX = 740, PY = 230;
      a.text(PX, 196, 'LH sur 24 h (pulses reflétant la GnRH)', 'lbl-s strong', { attrs: { 'data-info': 'zgo-pulse' } });
      const pcur = [];
      PL.forEach(([t, fn], i) => {
        const x = PX + i * (PW + 22), X = (h) => x + ((h - 12 + 24) % 24) / 24 * PW, Y = (v) => PY + PH - v * 110;
        a.el('rect', { x: X(21), y: PY, width: X(24 + 6 - 0.001) - X(21) > 0 ? (9 / 24) * PW : 0, height: PH, class: 'zgo-band', style: '--c: var(--p-blue)' });
        a.path(`M ${x},${PY + PH} L ${x + PW},${PY + PH}`, 'zgo-axis');
        let d = '';
        for (let k = 0; k <= 240; k++) { const h = (12 + (k / 240) * 24) % 24; d += (k ? ' L ' : 'M ') + (x + (k / 240) * PW).toFixed(1) + ',' + Y(fn(h)).toFixed(1); }
        a.path(d, 'zgo-curve thin', null, { style: '--c: var(--p-violet)', 'data-info': 'zgo-pulse' });
        a.text(x + PW / 2, PY + PH + 24, t, 'note strong', { anchor: 'middle' });
        a.text(x, PY + PH + 46, '12 h', 'zgo-tick');
        a.text(x + PW / 2, PY + PH + 46, 'nuit', 'zgo-tick', { anchor: 'middle' });
        a.text(x + PW, PY + PH + 46, '12 h', 'zgo-tick', { anchor: 'end' });
        pcur.push({ c: a.el('line', { x1: 0, y1: PY, x2: 0, y2: PY + PH, class: 'zgo-cursor' }), x });
      });

      /* ---- Chronologies ---- */
      const A0 = 7, A1 = 16, cx0 = 250, cx1 = 900;
      const X = (age) => cx0 + ((age - A0) / (A1 - A0)) * (cx1 - cx0);
      for (let k = A0; k <= A1; k++) {
        a.path(`M ${X(k)},466 L ${X(k)},706`, 'zgo-grid');
        a.text(X(k), 726, k + ' ans', 'zgo-tick', { anchor: 'middle' });
      }
      const ev = (y, f, t, mean, txt, c, info) => {
        const gg = a.el('g', { 'data-info': info });
        a.el('rect', { x: X(f), y, width: X(t) - X(f), height: 22, rx: 11, class: 'zgo-bar', style: `--c: var(--${c})` }, gg);
        if (mean != null) a.el('circle', { cx: X(mean), cy: y + 11, r: 7, class: 'zgo-dot', style: `--c: var(--${c})` }, gg);
        a.text(X(t) + 10, y + 17, txt, 'note', null, gg);
      };
      a.text(60, 490, 'Fille', 'lbl-h', { attrs: { 'data-info': 'zgo-girl' } });
      ev(470, 8.5, 13.3, null, 'seins (S2) : 8,5–13,3 ans', 'p-rose', 'zgo-girl');
      ev(498, 9, 14, 12, 'pilosité (pubienne vers 12 ans)', 'p-brown', 'zgo-adren');
      ev(526, 10, 15, 12.5, 'ménarche (vers 12–13 ans)', 'p-red', 'zgo-girl');
      a.text(X(7) + 4, 570, 'pic de croissance : avec les premiers signes ou quelques mois avant', 'note', { attrs: { 'data-info': 'zgo-girl' } });
      a.text(60, 616, 'Garçon', 'lbl-h', { attrs: { 'data-info': 'zgo-boy' } });
      ev(596, 9, 14, null, 'testicules ≥ 4 mL (G2) : début entre 9 et 14 ans', 'p-blue', 'zgo-boy');
      a.text(X(7) + 4, 632, 'puis pilosité pubienne (dans l\'année), pilosité axillaire (12–18 mois après)', 'note', { attrs: { 'data-info': 'zgo-boy' } });
      const pt1 = (age, y, txt, c) => { a.el('circle', { cx: X(age), cy: y, r: 7, class: 'zgo-dot', style: `--c: var(--${c})`, 'data-info': 'zgo-boy' }); a.text(X(age) + 14, y + 6, txt, 'note', { attrs: { 'data-info': 'zgo-boy' } }); };
      pt1(13, 654, 'verge (vers 13 ans)', 'p-blue2');
      pt1(15, 682, 'pilosité faciale, mue (vers 15 ans)', 'p-blue2');
      a.text(X(7) + 4, 660, 'pic de croissance : après le démarrage', 'note', { attrs: { 'data-info': 'zgo-boy' } });
      // seuils
      [[8, 'p-rose', 466, 556], [9, 'p-blue', 590, 618]].forEach(([age, c, y0, y1]) => a.path(`M ${X(age)},${y0} L ${X(age)},${y1}`, 'zgo-band-l', null, { style: `--c: var(--${c})` }));

      /* ---- Encadrés de droite ---- */
      const RX = 1175, RW = 380;
      box(a, RX, 456, RW, 130, 'p-sky', null, 'zgo-adren');
      a.text(RX + 18, 486, 'Adrénarche (complément)', 'lbl-s strong');
      a.text(RX + 18, 514, ['Avant la puberté : DHEA-S surrénalien ↑,', 'indépendante de l\'axe gonadotrope ;', 'pilosité de la fille (polycopié).'], 'note', { lh: 1.25 });
      box(a, RX, 598, RW, 128, 'p-red', null, 'zgo-girl');
      a.text(RX + 18, 628, 'Seuils (polycopié)', 'lbl-s strong');
      a.text(RX + 18, 656, ['précoce : seins < 8 ans, testicules < 9 ans', 'retardée : > 13 ans (F), > 14 ans (G)', 'aménorrhée primaire : pas de règles à 15 ans'], 'note', { lh: 1.25 });

      /* ---- Stades de Tanner ---- */
      const TY = 752, TC = (k) => 340 + k * 190;
      a.text(60, TY + 24, 'Stades de Tanner', 'lbl-h');
      const hl = a.el('rect', { x: 0, y: TY + 40, width: 170, height: 190, rx: 16, class: 'zgo-col-hl' });
      a.text(60, TY + 74, 'Seins (S)', 'lbl-s strong', { attrs: { 'data-info': 'zgo-tannerS' } });
      a.text(60, TY + 140, ['Testicules (G)', 'orchidomètre'], 'lbl-s strong', { lh: 1.1, attrs: { 'data-info': 'zgo-tannerG' } });
      a.text(60, TY + 212, 'Pilosité (P)', 'lbl-s strong', { attrs: { 'data-info': 'zgo-tannerP' } });
      const vols = [['< 4 mL', 3], ['4 à 6–8 mL', 6], ['8–12 mL', 10], ['12–16 mL', 14], ['> 20 mL', 22]];
      const pils = ['aucune', 'quelques poils', 'bouclés, denses', 'triangle fourni', 'adulte, cuisses'];
      for (let k = 0; k < 5; k++) {
        const x = TC(k);
        a.text(x, TY + 24, String(k + 1), 'zgo-val', { anchor: 'middle' });
        // profil mammaire
        const sg = a.el('g', { transform: `translate(${x - 18} ${TY + 80})`, 'data-info': 'zgo-tannerS' });
        const b = [-10, 2, 9, 16, 22][k], ar = [0, 4, 6, 10, 4][k];
        a.path(`M 0,-30 L 0,30 M 0,-30 C ${10 + b},-24 ${18 + b * 1.6},${-6} ${18 + b * 1.6},4 C ${18 + b * 1.6},16 ${8 + b},26 0,30`, 'zgo-skin', sg, { style: 'fill: none' });
        if (k > 0) a.el('ellipse', { cx: 16 + b * 1.6 + ar * 0.5, cy: 2, rx: 3 + ar * 0.5, ry: 6 + k, class: 'zgo-areola' }, sg);
        // orchidomètre
        const v = vols[k][1], rx = 9 + Math.sqrt(v) * 4.2;
        a.el('ellipse', { cx: x, cy: TY + 134, rx, ry: rx * 0.66, class: 'zgo-orchi', 'data-info': 'zgo-tannerG' });
        a.text(x, TY + 176, vols[k][0], 'note', { anchor: 'middle', attrs: { 'data-info': 'zgo-tannerG' } });
        a.text(x, TY + 212, pils[k], 'note', { anchor: 'middle', attrs: { 'data-info': 'zgo-tannerP' } });
      }

      let t = 0, ts = 0;
      a.dyn((dt) => {
        t = (t + dt / 8) % 1;
        pcur.forEach((p) => p.c.setAttribute('transform', `translate(${(p.x + t * PW).toFixed(1)} 0)`));
        ts = (ts + dt / 2.4) % 5;
        hl.setAttribute('x', (TC(Math.floor(ts)) - 85).toFixed(0));
      });

      HV.spotlight(pub, a, [
        { t: 'Un axe qui s\'endort', d: 'L\'axe gonadotrope est actif chez le fœtus et pendant les 3 à 6 premiers mois de vie, puis quiescent pendant toute l\'enfance (polycopié).', spot: [[60, 170, 660, 270]] },
        { t: 'Le réveil de la GnRH', d: 'Au début de la puberté, les pics pulsatiles de GnRH réapparaissent : FSH puis LH, avec des pics de LH plus fréquents et plus amples (polycopié), d\'abord la nuit (complément).', spot: [[730, 170, 820, 270]] },
        { t: 'Chez la fille', d: 'Seins (S2) d\'abord, de 8,5 à 13,3 ans, puis pilosité, puis ménarche 2 à 2,5 ans après le début. La croissance s\'accélère tôt (polycopié).', spot: [[50, 456, 1100, 128]] },
        { t: 'Chez le garçon', d: 'Le volume testiculaire augmente d\'abord (≥ 4 mL à l\'orchidomètre), puis pilosité pubienne, verge vers 13 ans, pilosité axillaire et faciale, mue. Le pic de croissance est plus tardif (polycopié).', spot: [[50, 584, 1100, 128]] },
        { t: 'L\'adrénarche', d: 'Les androgènes surrénaliens augmentent avant la puberté, indépendamment de l\'axe gonadotrope ; chez la fille, ils expliquent la pilosité (complément ; polycopié pour la pilosité).', spot: [[RX, 456, RW, 130]] },
        { t: 'Les stades de Tanner', d: 'S (seins), G (organes génitaux, volume testiculaire à l\'orchidomètre de Prader) et P (pilosité pubienne), cotés de 1 (prépubère) à 5 (adulte) (polycopié, tableau 4).', spot: [[50, 740, 1500, 240]] }
      ]);
    }
  }, HV.LOUPE.R(2)));
})();
