/*
 * Construit une scène d'axe à partir d'une description déclarative :
 * nœuds (organes ou signaux), liens (stimulation, inhibition, sécrétion), horloge biologique,
 * niveaux hormonaux animés et chaînes de biosynthèse.
 */
(function () {
  'use strict';
  const HV = window.HV;
  const clamp = HV.clamp;

  /* Disposition des cartes de l'atlas : 2 colonnes × 6 rangées */
  HV.CARD = {
    s: 0.14,
    x: (side) => (side === 'L' ? 70 : 1306),
    y: (row) => 95 + row * 150
  };

  /* Horloges biologiques (temps simulé propre à chaque scène) */
  const G = (x, m, w) => Math.exp(-Math.pow((x - m) / w, 2));
  HV.rhythm = {
    circadian: (T) => 0.15 + 0.85 * Math.pow(0.5 + 0.5 * Math.cos((2 * Math.PI * (T.h - 8)) / 24), 1.6),
    gnrhPulse: (T) => 0.15 + 1.6 * G(T.h % 1.5, 0.2, 0.12),
    ghNight: (T) => {
      const night = T.h >= 23 || T.h < 4 ? 1 : 0.25;
      return 0.1 + night * 1.5 * G(T.h % 3, 0.6, 0.3);
    },
    meals: [7.5, 12.5, 19.5],
    glycemia: (T) => 0.85 + HV.rhythm.meals.reduce((a, m) => a + 0.55 * G(((T.h - m + 24) % 24), 0.9, 0.7), 0),
    e2: (T) => 0.25 + 1.2 * G(T.d, 12.5, 2.6) + 0.55 * G(T.d, 21, 3.5),
    lh: (T) => 0.35 + 2.4 * G(T.d, 14, 0.7),
    fsh: (T) => 0.45 + 0.55 * G(T.d, 2.5, 3) + 0.9 * G(T.d, 14, 0.8),
    prog: (T) => 0.08 + 1.4 * G(T.d, 21, 3.4),
    // Rétrocontrôle de l'estradiol : positif en milieu de cycle (pic de LH), négatif le reste du temps.
    e2Positive: (T) => T.d >= 12 && T.d < 14.6
  };

  function bezPoint(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  }

  /* Mode pas à pas : chaque étape allume des nœuds et des liens ; les étapes déjà vues restent
     visibles (atténuées), les suivantes sont estompées. */
  function makeSteps(def, reg) {
    let cur = -1;
    def.stepTo = function (i) {
      cur = i;
      const on = i >= 0;
      const past = new Set(), now = new Set(on ? def.steps[i].on : []);
      if (on) for (let k = 0; k < i; k++) def.steps[k].on.forEach((x) => past.add(x));
      const cls = (e, st) => {
        if (!e) return;
        e.classList.remove('st-now', 'st-past', 'st-dim');
        if (st) e.classList.add(st);
      };
      const state = (key) => (!on ? null : now.has(key) ? 'st-now' : past.has(key) ? 'st-past' : 'st-dim');
      Object.keys(reg.nodes).forEach((id) => cls(reg.nodes[id], state(id)));
      reg.links.forEach((L) => {
        const st = !on ? null : now.has(L.key) || now.has(L.key + '>' + L.mol) ? 'st-now' : past.has(L.key) || past.has(L.key + '>' + L.mol) ? 'st-past' : 'st-dim';
        L.on = !on || st !== 'st-dim';
        L.els.forEach((e) => cls(e, st));
      });
      Object.keys(reg.extras).forEach((k) => cls(reg.extras[k], state(k)));
      if (def.onStep) def.onStep(i);
    };
    def.stepIndex = () => cur;
  }

  /* Pas à pas pour les scènes dessinées à la main : un voile assombrit la scène sauf des « projecteurs »
     (cercles [x, y, r] ou rectangles [x, y, w, h]) ; les zones des étapes passées restent à demi éclairées. */
  HV.spotlight = function (def, a, steps) {
    def.steps = steps;
    const id = 'spot-' + def.id;
    const mask = a.el('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: HV.W, height: HV.H }, a.el('defs'));
    a.el('rect', { x: 0, y: 0, width: HV.W, height: HV.H, fill: 'white' }, mask);
    const holes = a.el('g', null, mask);
    const veil = a.el('rect', { x: 0, y: 0, width: HV.W, height: HV.H, rx: 30, class: 'spot-veil', mask: `url(#${id})`, visibility: 'hidden' });
    const ring = a.el('g', { class: 'spot-rings' });
    let cur = -1;
    const shape = (sp, fill, parent, cls) => (sp.length === 3
      ? a.el('circle', { cx: sp[0], cy: sp[1], r: sp[2], fill, class: cls || null }, parent)
      : a.el('rect', { x: sp[0], y: sp[1], width: sp[2], height: sp[3], rx: 24, fill, class: cls || null }, parent));
    def.stepTo = function (i) {
      cur = i;
      holes.textContent = '';
      ring.textContent = '';
      veil.setAttribute('visibility', i < 0 ? 'hidden' : 'visible');
      if (i < 0) return;
      def.content.appendChild(veil); // au-dessus des particules
      def.content.appendChild(ring);
      for (let k = 0; k < i; k++) steps[k].spot.forEach((sp) => shape(sp, '#7a7a7a', holes));
      steps[i].spot.forEach((sp) => { shape(sp, 'black', holes); shape(sp, 'none', ring, 'spot-ring'); });
    };
    def.stepIndex = () => cur;
  };

  /* Loupes : scènes de zoom posées hors du cadre de leur scène parente (à droite des cartes de gauche,
     à gauche des cartes de droite). Chaque loupe déclare `loupe: 'légende'` ; le parent écrit la légende. */
  HV.LOUPE = { L: (k) => ({ x: 1680, y: k * 175, scale: 0.15 }), R: (k) => ({ x: -330, y: k * 175, scale: 0.15 }) };
  HV.loupeCaptions = function (a, parentId) {
    HV.sceneList.filter((s) => s.parent === parentId && s.loupe).forEach((ch) => {
      const x = ch.x + (HV.W * ch.scale) / 2, y = ch.y + HV.H * ch.scale + 26;
      a.text(x, y, ch.loupe + ' ⊕', 'loupe-cap', { anchor: 'middle', attrs: { 'data-zoom': ch.id } });
    });
  };

  HV.axisScene = function (ax) {
    const pos = ax.card;
    const legendMols = new Set();
    const reg = { nodes: {}, links: [], extras: {} };
    const def = HV.scene({
      id: ax.id,
      parent: 'atlas',
      x: HV.CARD.x(pos.side),
      y: HV.CARD.y(pos.row),
      scale: HV.CARD.s,
      title: ax.name,
      level: ax.level || 'Axe',
      lead: ax.lead,
      points: ax.points,
      source: ax.source || 'Source : Polycopié de sémiologie endocrinienne, CEEDMM, 2e édition (2023).',
      legend: legendMols,
      build(g, a) {
        a.frame(ax.name, ax.sub);
        if (ax.steps) {
          def.steps = ax.steps;
          makeSteps(def, reg);
        }
        /* ---- Coupe cerveau – hypothalamus – hypophyse (axes hypophysaires) ---- */
        const hh = ax.hh || null;
        if (hh) {
          // Médaillon : la coupe est agrandie et découpée dans un cercle centré sur la région hypothalamo-hypophysaire.
          let host = null;
          if (hh.inset) {
            const I = hh.inset, cid = 'hhclip-' + ax.id;
            a.el('circle', { cx: I.cx, cy: I.cy, r: I.r, fill: 'black' }, a.el('clipPath', { id: cid }, a.el('defs')));
            a.el('circle', { cx: I.cx, cy: I.cy, r: I.r, class: 'hh-inset-bg' });
            host = a.el('g', { 'clip-path': `url(#${cid})` });
          }
          const hg = a.el('g', { class: 'hh', transform: `translate(${hh.x} ${hh.y}) scale(${hh.flip ? -hh.s : hh.s} ${hh.s})` }, host);
          if (hh.inset) a.el('circle', { cx: hh.inset.cx, cy: hh.inset.cy, r: hh.inset.r, class: 'hh-inset-ring' });
          HV.organs.hhSagittal(hg, hh);
          reg.extras.hh = hg;
          const fx = hh.flip ? -1 : 1, HX = (lx) => hh.x + lx * hh.s * fx, HY = (ly) => hh.y + ly * hh.s;
          const used = new Set(ax.nodes.filter((n) => n.at).map((n) => n.at));
          // Légendes discrètes, du côté postérieur (libre) de la tige.
          const back = fx > 0 ? 'start' : 'end';
          const caps = hh.portal === false ? [[HX(26), HY(96), ['tige pituitaire', '(axones)'], back]] : [];
          if (!used.has('post')) caps.push(hh.inset ? [HX(40), HY(196), ['posthypophyse'], 'middle'] : [HX(46), HY(214), ['posthypophyse'], 'middle']);
          if (!used.has('ant')) caps.push([HX(-30), HY(218), ['antéhypophyse'], 'middle']);
          if (hh.inset) caps.push([hh.inset.cx, hh.inset.cy + hh.inset.r + 26, ['coupe sagittale agrandie'], 'middle']);
          caps.concat(hh.captions || []).forEach((c) => a.text(c[0], c[1], c[2], 'hh-cap', { anchor: c[3] || 'start', lh: 1.15 }));
        }
        const T = { h: ax.startHour != null ? ax.startHour : 8, d: 1 };
        const nodes = {};
        // Modèle physiologique (axes-sim.js) : scénarios, variables qui pilotent flux, organes et niveaux.
        const sim = ax.sim || null;
        const hk = ax.hooks || {};
        const val = (v) => (hk.rates && hk.rates[v] ? hk.rates[v](sim.s, sim.p) : sim.s[v]);
        const allNodes = ax.nodes.concat(hk.extraNodes || []);
        const allLinks = ax.links.concat(hk.extraLinks || []);
        const shown = [];
        if (hk.liveNode) allNodes.forEach((n) => { if (hk.liveNode[n.id]) n.live = () => hk.liveNode[n.id](sim.s); });

        /* ---- Encadrés (sous-systèmes distincts dans une même scène) ---- */
        (ax.panels || []).forEach((P) => {
          const pg = a.el('g', { class: 'ax-panel', style: `--c: var(--${P.color || 'accent'})` });
          a.el('rect', { x: P.x, y: P.y, width: P.w, height: P.h, rx: 22, class: 'ax-panel-r' }, pg);
          a.text(P.x + 24, P.y + 36, P.title, 'ax-panel-t', null, pg);
          if (P.sub) a.text(P.x + 24, P.y + 62, P.sub, 'note', null, pg);
          if (P.id) reg.extras[P.id] = pg;
        });

        /* ---- Nœuds ---- */
        allNodes.forEach((n) => {
          const key = ax.id + '.' + n.id;
          HV.INFO[key] = { t: n.label.replace(/\n/g, ' '), k: Array.isArray(n.sub) ? n.sub.join(' ') : n.sub || '', d: n.info || '', live: n.live ? () => n.live(T) : null };
          const s = n.s || 1.15;
          const grp = a.el('g', { class: 'ax-node' + (n.organ || n.at ? '' : ' signal'), 'data-info': key, 'data-sheet': n.organ ? HV.ORGAN_BY_ICON[n.organ] || null : n.sheet || null });
          reg.nodes[n.id] = grp;
          if (n.at || n.bare) {
            // Point d'ancrage sur un dessin partagé (coupe cerveau – hypophyse, rein et surrénale) :
            // pas d'icône, juste une zone sensible et l'étiquette.
            if (n.at) {
              const P = HV.organs.HH[n.at];
              n.x = hh.x + P[0] * hh.s * (hh.flip ? -1 : 1);
              n.y = hh.y + P[1] * hh.s;
            }
            if (n.dot) a.el('circle', { cx: n.x, cy: n.y, r: n.dot, class: 'hh-dot', style: `--c: var(--${n.color || 'accent'})` }, grp);
            a.el('circle', { cx: n.x, cy: n.y, r: n.hit || 30, class: 'hh-hit', style: `--c: var(--${n.color || 'accent'})` }, grp);
            n.r = n.rr || 30;
            const lx = n.x + (n.lx != null ? n.lx : 46), ly = n.y + (n.ly || 0);
            const anc = n.anchor || 'start';
            if (n.leader) a.path(`M ${n.x},${n.y} L ${lx + (anc === 'end' ? 8 : -8)},${ly - 6}`, 'hh-leader', grp);
            a.text(lx, ly, n.label.split('\n'), 'lbl ax-lbl', { anchor: anc, lh: 1.15 }, grp);
            if (n.sub) a.text(lx, ly + 24 + (n.label.includes('\n') ? 26 : 0), Array.isArray(n.sub) ? n.sub : [n.sub], 'note', { anchor: anc, lh: 1.25 }, grp);
          } else if (n.organ) {
            const ic = a.el('g', { transform: `translate(${n.x} ${n.y}) scale(${s})` }, grp);
            a.el('circle', { r: 58, class: 'ax-halo', style: `--c: var(--${n.color || 'accent'})` }, ic);
            HV.organs[n.organ](ic);
            n.r = 62 * s;
            a.text(n.x, n.y + 62 * s + 28, n.label.split('\n'), 'lbl ax-lbl', { anchor: 'middle', lh: 1.15 }, grp);
            if (n.sub) a.text(n.x, n.y + 62 * s + 52 + (n.label.includes('\n') ? 26 : 0), Array.isArray(n.sub) ? n.sub : [n.sub], 'note', { anchor: 'middle', lh: 1.25 }, grp);
          } else {
            const w = n.w || 230, h = n.h || 76;
            a.el('rect', { x: n.x - w / 2, y: n.y - h / 2, width: w, height: h, rx: h / 2, class: 'sig-box', style: `--c: var(--${n.color || 'accent'})` }, grp);
            const top = n.gauge ? n.y - h / 2 + 34 : n.y + (n.live ? -6 : 7);
            a.text(n.x, top, n.label.split('\n'), 'lbl-s strong', { anchor: 'middle', lh: 1.15 }, grp);
            if (n.live) n.liveEl = a.text(n.x, n.gauge ? top + 30 : n.y + 22, '', 'sig-val', { anchor: 'middle' }, grp);
            if (n.gauge && sim) {
              // Jauge « thermostat » : zone normale, consigne et aiguille de la valeur simulée.
              const G = n.gauge, gx = n.x - w / 2 + 24, gw = w - 48, gy = n.y + h / 2 - 30;
              const X = (v) => gx + (clamp(v, G.min, G.max) - G.min) / (G.max - G.min) * gw;
              a.el('rect', { x: gx, y: gy, width: gw, height: 12, rx: 6, class: 'gauge-bg' }, grp);
              a.el('rect', { x: X(G.lo), y: gy, width: X(G.hi) - X(G.lo), height: 12, class: 'gauge-ok' }, grp);
              if (G.set != null) a.el('path', { d: `M ${X(G.set)},${gy - 6} L ${X(G.set)},${gy + 18}`, class: 'gauge-set' }, grp);
              (G.ticks || []).forEach((t) => a.text(X(t), gy + 32, String(t), 'gauge-t', { anchor: 'middle' }, grp));
              const nd = a.el('path', { d: 'M 0,-10 L 7,-22 L -7,-22 Z', class: 'gauge-needle' }, grp);
              shown.push(() => nd.setAttribute('transform', `translate(${X(G.val(sim.s, sim.p)).toFixed(1)} ${gy + 4})`));
            }
            if (n.sub) a.text(n.x, n.y + h / 2 + 24, Array.isArray(n.sub) ? n.sub : [n.sub], 'note', { anchor: 'middle', lh: 1.25 }, grp);
            n.r = Math.max(w, h) / 2 - 8;
            n.rx = w / 2; n.ry = h / 2;
          }
          if (n.zoom) a.zoomable(grp, n.zoom);
          if (sim && hk.cap && hk.cap[n.id] && n.organ) shown.push(() => grp.firstChild.setAttribute('opacity', (0.3 + 0.7 * Math.min(1, sim.p[hk.cap[n.id]])).toFixed(2)));
          if (sim && hk.tumor && hk.tumor[n.id]) {
            const s2 = n.s || 1.15;
            const tu = a.el('circle', { cx: n.x + 34 * s2, cy: n.y - 26 * s2, r: 15, class: 'tumor', 'data-info': 'tumor' });
            shown.push(() => tu.setAttribute('opacity', sim.p[hk.tumor[n.id]] > 0.02 ? 1 : 0));
          }
          if (n.show) shown.push(() => grp.setAttribute('visibility', n.show(sim.p) ? 'visible' : 'hidden'));
          if (sim && hk.scale && hk.scale[n.id] && n.organ) {
            const icg = grp.firstChild, s0 = n.s || 1.15;
            shown.push(() => icg.setAttribute('transform', `translate(${n.x} ${n.y}) scale(${(s0 * hk.scale[n.id](sim.p, sim.s)).toFixed(3)})`));
          }
          n.vis = () => !n.show || n.show(sim.p);
          nodes[n.id] = n;
        });

        /* ---- Substrat anatomique des scénarios (adénome, hyperplasie, infiltrat, sténose…) ---- */
        (hk.lesions || []).forEach((L, i) => {
          const n = nodes[L.node], s2 = n.s || 1.15;
          const key = ax.id + '.les' + i;
          HV.INFO[key] = { t: L.title, k: 'Substrat anatomique', d: L.text };
          const g = a.el('g', { class: 'lesion', 'data-info': key });
          const cx = n.x + (L.dx || 0) * s2, cy = n.y + (L.dy || 0) * s2;
          const inner = a.el('g', { transform: `translate(${cx} ${cy})` }, g);
          const body = a.el('g', null, inner);
          if (L.kind === 'nodule') {
            a.el('circle', { r: 17, class: 'les-cap' }, body);
            a.el('circle', { r: 14, class: 'les-nod ' + (L.tone || '') }, body);
            a.el('circle', { r: 14, fill: 'url(#shine)' }, body);
          } else if (L.kind === 'mass') {
            const d = 'M -30,4 C -32,-20 -6,-34 14,-26 C 34,-18 36,6 24,20 C 12,34 -24,30 -30,4 Z';
            a.el('path', { d, class: 'les-mass ' + (L.tone || '') }, body);
            a.el('path', { d, fill: 'url(#shine)' }, body);
          } else if (L.kind === 'infiltrate') {
            for (let k = 0; k < 9; k++) a.el('circle', { cx: Math.cos(k * 2.4) * (12 + (k % 3) * 9), cy: Math.sin(k * 2.4) * (10 + (k % 3) * 8), r: 4.5, class: 'les-lympho' }, body);
          } else if (L.kind === 'stenosis') {
            a.el('path', { d: 'M -26,-10 C -8,-10 -6,-3 0,-3 C 6,-3 8,-10 26,-10 M -26,10 C -8,10 -6,3 0,3 C 6,3 8,10 26,10', class: 'les-sten' }, body);
            a.el('path', { d: 'M -6,-18 L 0,-8 L 6,-18', class: 'les-arrow' }, body);
          } else if (L.kind === 'cross') {
            a.el('path', { d: 'M -14,-14 L 14,14 M 14,-14 L -14,14', class: 'les-cross' }, body);
          }
          if (L.label) a.text(L.lx || 0, L.ly != null ? L.ly : 36, L.label, 'les-lbl', { anchor: 'middle' }, inner);
          shown.push(() => {
            const on = L.show(sim.p, sim.s);
            g.setAttribute('opacity', on ? 1 : 0);
            g.setAttribute('visibility', on ? 'visible' : 'hidden');
            if (L.size) body.setAttribute('transform', `scale(${L.size(sim.p, sim.s).toFixed(2)})`);
          });
        });

        const edge = (n, toward) => {
          const dx = toward[0] - n.x, dy = toward[1] - n.y, L = Math.hypot(dx, dy) || 1;
          let r = n.r;
          if (n.rx) r = Math.min(Math.abs(n.rx / (dx / L || 1e-6)), Math.abs(n.ry / (dy / L || 1e-6))) + 6;
          return [n.x + (dx / L) * r, n.y + (dy / L) * r];
        };

        /* ---- Liens ---- */
        const dynLinks = [], pills = [];
        allLinks.forEach((l) => {
          const LR = { key: l.from + '>' + l.to, from: l.from, to: l.to, mol: l.mol || '', on: true, els: [] };
          reg.links.push(LR);
          const A = nodes[l.from], B = nodes[l.to];
          const v = l.v || (hk.links && hk.links[`${l.from}>${l.to}>${l.mol}`]) || null;
          const keepMod = !(hk.dropMod && v);
          const vis = () => A.vis() && B.vis();
          // Les extrémités partent vers les points de contrôle : les arcs d'une même paire de nœuds se séparent.
          const cdx = B.x - A.x, cdy = B.y - A.y, cL = Math.hypot(cdx, cdy) || 1;
          const nx = -cdy / cL, ny = cdx / cL, b = l.bend || 0;
          const c1 = [A.x + cdx / 3 + nx * b * 1.2, A.y + cdy / 3 + ny * b * 1.2];
          const c2 = [A.x + (2 * cdx) / 3 + nx * b * 1.2, A.y + (2 * cdy) / 3 + ny * b * 1.2];
          const p0 = edge(A, c1), p3 = edge(B, c2);
          const dx = p3[0] - p0[0], dy = p3[1] - p0[1];
          const p1 = [p0[0] + dx / 3 + nx * b, p0[1] + dy / 3 + ny * b];
          const p2 = [p0[0] + (2 * dx) / 3 + nx * b, p0[1] + (2 * dy) / 3 + ny * b];
          const d = `M ${p0[0].toFixed(1)},${p0[1].toFixed(1)} C ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)} ${p3[0].toFixed(1)},${p3[1].toFixed(1)}`;
          const kind = typeof l.kind === 'function' ? l.kind(T) : l.kind || 'flow';
          const color = l.mol ? HV.MOLC[l.mol] || 'accent' : l.color || 'accent';
          const track = a.path(d, 'ax-track ' + kind, null, { style: `--mc: var(--${color})`, 'data-info': l.mol || l.info || null });
          if (l.mol) {
            legendMols.add(l.mol);
            const base = l.rate || 1.6;
            a.flow(d, { mol: l.mol, rate: () => (vis() && LR.on ? base * (l.mod && keepMod ? l.mod(T) : 1) * (sim && v ? Math.min(6, val(v)) : 1) : 0), size: l.size || 1.6, speed: l.speed || 120, track: false, max: 30, pace: sim && v ? () => HV.paceOf(val(v)) : null });
          }
          let sign = null;
          if (kind !== 'flow') {
            const back = bezPoint(p0, p1, p2, p3, 0.93);
            sign = a.sign(back[0], back[1], kind === 'inhib' ? 'inhib' : 'stim');
            sign.set(1);
          }
          let pillEl = null;
          const lab = l.label !== undefined ? l.label : l.mol && HV.INFO[l.mol] ? HV.INFO[l.mol].t.split(' · ')[0] : null;
          if (lab) {
            const m = bezPoint(p0, p1, p2, p3, l.labelAt || 0.5);
            const w = 16 + lab.length * 10.5;
            const off = l.labelOff || 0;
            const lg = a.el('g', { class: 'ax-pill', style: `--mc: var(--${color})`, transform: `translate(${(m[0] + nx * off).toFixed(1)} ${(m[1] + ny * off).toFixed(1)})`, 'data-info': l.mol || l.info || null });
            a.el('rect', { x: -w / 2, y: -15, width: w, height: 30, rx: 15 }, lg);
            a.text(0, 6, lab, 'ax-pill-t', { anchor: 'middle' }, lg);
            pillEl = lg;
            pills.push(lg);
          }
          LR.els.push(track, sign && sign.g, pillEl);
          if (typeof l.kind === 'function') dynLinks.push({ l, track, sign });
          if (A.show || B.show) {
            const els = [track, sign && sign.g, pillEl];
            shown.push(() => els.forEach((e) => e && e.setAttribute('visibility', vis() ? 'visible' : 'hidden')));
          }
        });

        /* ---- Chaîne de biosynthèse ---- */
        if (ax.chain) {
          const c = ax.chain;
          const cg = a.el('g', { class: 'chain' });
          reg.extras.chain = cg;
          a.text(c.x, c.y - 26, c.title, 'lbl-s strong', null, cg);
          c.steps.forEach((st, i) => {
            const y = c.y + i * c.dy, x = c.x;
            const sg = a.el('g', { 'data-info': st.mol || null }, cg);
            a.el('rect', { x: x, y: y, width: c.w, height: 44, rx: 12, class: 'chain-step', style: `--mc: var(--${st.mol ? HV.MOLC[st.mol] || 'accent' : 'line-2'})` }, sg);
            if (st.mol) {
              a.el('use', { href: '#mol-' + st.mol, transform: `translate(${x + 28} ${y + 22}) scale(1.3)` }, sg);
              legendMols.add(st.mol);
            }
            a.text(x + 56, y + 28, st.label, 'note strong', null, sg);
            if (i < c.steps.length - 1) {
              const yy = y + 44, ny2 = y + c.dy;
              a.path(`M ${x + 28},${yy + 2} L ${x + 28},${ny2 - 2}`, 'chain-link', cg, { 'marker-end': 'url(#arr-accent)' });
              if (st.enz) a.text(x + 44, (yy + ny2) / 2 + 6, st.enz, 'chain-enz', null, cg);
            }
          });
          a.flow(`M ${c.x + 28},${c.y + 22} L ${c.x + 28},${c.y + 22 + (c.steps.length - 1) * c.dy}`, { mol: 'dot', style: 'fill: var(--accent)', rate: () => 1.2, speed: 60, size: 0.8, track: false });
        }

        if (ax.draw) ax.draw(a, nodes);
        // Les noms d'hormones passent devant les organes, y compris ceux dessinés par ax.draw.
        pills.forEach((pl) => pl.parentNode && pl.parentNode.appendChild(pl));
        HV.loupeCaptions(a, ax.id);
        /* ---- Iconographie du polycopié posée sur les organes ---- */
        const spots = (HV.FIG_SPOTS || {})[ax.id] || {};
        Object.keys(spots).forEach((id) => {
          const n = nodes[id];
          if (!n) return;
          const r = n.rx ? n.rx : n.r || 60;
          HV.figBadge(a, n.x + (n.rx ? r - 6 : r * 0.72), n.y - (n.ry ? n.ry + 4 : r * 0.72), spots[id]);
        });

        /* ---- Notes libres ---- */
        (ax.notes || []).forEach((nt) => a.text(nt.x, nt.y, nt.text, 'note' + (nt.cls ? ' ' + nt.cls : ''), { anchor: nt.anchor || 'start', lh: 1.3 }));

        /* ---- Horloge et niveaux ---- */
        let clockHand = null, clockTxt = null, cycleMark = null, cycleTxt = null;
        if (ax.clock === 'day') {
          const cg = a.el('g', { class: 'clock', transform: `translate(${ax.clockX || 790} 92)`, 'data-info': ax.id + '.clock' });
          HV.INFO[ax.id + '.clock'] = { t: 'Horloge simulée', k: '24 h en 48 s', d: ax.clockInfo || 'Le temps de la scène défile pour montrer les variations rythmiques de sécrétion.', live: () => String(Math.floor(T.h)).padStart(2, '0') + ' h' };
          a.el('circle', { r: 44, class: 'clock-face' }, cg);
          for (let i = 0; i < 24; i += 3) {
            const an = (i / 24) * 2 * Math.PI - Math.PI / 2;
            a.el('line', { x1: Math.cos(an) * 36, y1: Math.sin(an) * 36, x2: Math.cos(an) * 42, y2: Math.sin(an) * 42, class: 'clock-tick' }, cg);
          }
          a.el('path', { d: 'M 0,-44 A 44,44 0 0 1 0,44 Z', class: 'clock-day', transform: 'rotate(-90)' }, cg);
          clockHand = a.el('line', { x1: 0, y1: 0, x2: 0, y2: -34, class: 'clock-hand' }, cg);
          clockTxt = a.text(62, 8, '', 'clock-t', null, cg);
        }
        if (ax.clock === 'cycle') {
          const cg = a.el('g', { class: 'cycle', transform: 'translate(600 172)', 'data-info': ax.id + '.clock' });
          HV.INFO[ax.id + '.clock'] = { t: 'Cycle ovarien simulé', k: '28 jours', d: 'J1 : règles. J1–J14 : phase folliculaire. J14 : ovulation déclenchée par le pic de LH. J14–J28 : phase lutéale (corps jaune).', live: () => 'Jour ' + Math.floor(T.d) };
          a.el('rect', { x: 0, y: 0, width: 420, height: 16, rx: 8, class: 'cycle-foll' }, cg);
          a.el('rect', { x: 210, y: 0, width: 210, height: 16, rx: 8, class: 'cycle-lut' }, cg);
          a.el('rect', { x: 0, y: 0, width: 75, height: 16, rx: 8, class: 'cycle-mens' }, cg);
          a.text(0, 40, 'J1 règles', 'note', null, cg);
          a.text(210, 40, 'J14 ovulation', 'note', { anchor: 'middle' }, cg);
          a.text(420, 40, 'J28', 'note', { anchor: 'end' }, cg);
          cycleMark = a.el('path', { d: 'M 0,-4 L -8,-16 L 8,-16 Z', class: 'cycle-mark' }, cg);
          cycleTxt = a.text(440, 15, '', 'clock-t', null, cg);
        }
        const bars = [];
        let LV = ax.levels;
        if (sim && hk.levels) {
          LV = Object.assign({ x: 1180, y: 830, w: 340 }, ax.levels || {}, { title: 'Niveaux simulés' });
          LV.items = hk.levels.map((it) => Object.assign({}, it, { fn: it.fn ? () => it.fn(sim.s) : () => sim.s[it.v] }));
          LV.y = Math.min(LV.y, 972 - LV.items.length * 34); // le cadre doit tenir dans la scène
        }
        if (LV) {
          const L = LV;
          const lg = a.el('g', { class: 'levels', transform: `translate(${L.x} ${L.y})` });
          reg.extras.levels = lg;
          a.el('rect', { x: -16, y: -36, width: L.w + 32, height: 30 + L.items.length * 34, rx: 14, class: 'side-box' }, lg);
          a.text(0, -10, L.title || 'Niveaux simulés', 'lbl-s strong', null, lg);
          L.items.forEach((it, i) => {
            const y = 16 + i * 34;
            a.text(0, y + 6, it.label, 'note', null, lg);
            a.el('rect', { x: 130, y: y - 8, width: L.w - 130, height: 14, rx: 7, class: 'lvl-bg' }, lg);
            const bar = a.el('rect', { x: 130, y: y - 8, width: 10, height: 14, rx: 7, class: 'lvl-bar', style: `--mc: var(--${it.color || (it.mol ? HV.MOLC[it.mol] : 'accent')})` }, lg);
            bars.push({ bar, it, w: L.w - 130 });
          });
        }

        let txtT = 0;
        const tick = (dt) => {
          if (sim) sim.step(dt, T);
          shown.forEach((f) => f());
          T.h = (T.h + dt * 0.5) % 24;
          T.d = ((T.d - 1 + dt / 1.6) % 28) + 1;
          if (clockHand) clockHand.setAttribute('transform', `rotate(${(T.h / 24) * 360})`);
          if (cycleMark) cycleMark.setAttribute('transform', `translate(${(((T.d - 1) / 28) * 420).toFixed(1)} 0)`);
          bars.forEach((b) => b.bar.setAttribute('width', clamp(b.it.fn(T) / (b.it.max || 2), 0.03, 1) * b.w));
          dynLinks.forEach((o) => {
            const k = o.l.kind(T);
            o.track.classList.remove('stim', 'inhib');
            o.track.classList.add(k);
            if (o.sign) {
              o.sign.g.classList.remove('stim', 'inhib');
              o.sign.g.classList.add(k);
              o.sign.g.setAttribute('data-info', 'sign-' + k);
              o.sign.g.querySelector('.sign-glyph').setAttribute('d', k === 'inhib' ? 'M-7,0 H7' : 'M-7,0 H7 M0,-7 V7');
            }
          });
          txtT -= dt;
          if (txtT <= 0) {
            txtT = 0.25;
            if (clockTxt) clockTxt.textContent = String(Math.floor(T.h)).padStart(2, '0') + ' h' + (hk.clockLabel && sim ? ' · ' + hk.clockLabel(sim.s) : ax.clockLabel ? ' · ' + ax.clockLabel(T) : '');
            if (cycleTxt) cycleTxt.textContent = 'Jour ' + Math.floor(T.d) + ' · ' + (T.d < 6 ? 'règles' : T.d < 13 ? 'phase folliculaire' : T.d < 15 ? 'ovulation' : 'phase lutéale');
            allNodes.forEach((n) => { if (n.liveEl) n.liveEl.textContent = n.live(T); });
          }
        };
        tick(0);
        a.dyn(tick);
      }
    });
  };
})();
