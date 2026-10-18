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

  HV.axisScene = function (ax) {
    const pos = ax.card;
    const legendMols = new Set();
    HV.scene({
      id: ax.id,
      parent: 'atlas',
      x: HV.CARD.x(pos.side),
      y: HV.CARD.y(pos.row),
      scale: HV.CARD.s,
      title: ax.name,
      level: ax.level || 'Axe',
      lead: ax.lead,
      points: ax.points,
      source: ax.source || 'Source : Polycopié de sémiologie endocrinienne, CEEDMM, 1re édition 2023.',
      legend: legendMols,
      build(g, a) {
        a.frame(ax.name, ax.sub);
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

        /* ---- Nœuds ---- */
        allNodes.forEach((n) => {
          const key = ax.id + '.' + n.id;
          HV.INFO[key] = { t: n.label.replace(/\n/g, ' '), k: Array.isArray(n.sub) ? n.sub.join(' ') : n.sub || '', d: n.info || '', live: n.live ? () => n.live(T) : null };
          const s = n.s || 1.15;
          const grp = a.el('g', { class: 'ax-node' + (n.organ ? '' : ' signal'), 'data-info': key });
          if (n.organ) {
            const ic = a.el('g', { transform: `translate(${n.x} ${n.y}) scale(${s})` }, grp);
            a.el('circle', { r: 58, class: 'ax-halo', style: `--c: var(--${n.color || 'accent'})` }, ic);
            HV.organs[n.organ](ic);
            n.r = 62 * s;
            a.text(n.x, n.y + 62 * s + 28, n.label.split('\n'), 'lbl ax-lbl', { anchor: 'middle', lh: 1.15 }, grp);
            if (n.sub) a.text(n.x, n.y + 62 * s + 52 + (n.label.includes('\n') ? 26 : 0), Array.isArray(n.sub) ? n.sub : [n.sub], 'note', { anchor: 'middle', lh: 1.25 }, grp);
          } else {
            const w = n.w || 230, h = n.h || 76;
            a.el('rect', { x: n.x - w / 2, y: n.y - h / 2, width: w, height: h, rx: h / 2, class: 'sig-box', style: `--c: var(--${n.color || 'accent'})` }, grp);
            a.text(n.x, n.y + (n.live ? -6 : 7), n.label.split('\n'), 'lbl-s strong', { anchor: 'middle', lh: 1.15 }, grp);
            if (n.live) n.liveEl = a.text(n.x, n.y + 22, '', 'sig-val', { anchor: 'middle' }, grp);
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
          n.vis = () => !n.show || n.show(sim.p);
          nodes[n.id] = n;
        });

        const edge = (n, toward) => {
          const dx = toward[0] - n.x, dy = toward[1] - n.y, L = Math.hypot(dx, dy) || 1;
          let r = n.r;
          if (n.rx) r = Math.min(Math.abs(n.rx / (dx / L || 1e-6)), Math.abs(n.ry / (dy / L || 1e-6))) + 6;
          return [n.x + (dx / L) * r, n.y + (dy / L) * r];
        };

        /* ---- Liens ---- */
        const dynLinks = [];
        allLinks.forEach((l) => {
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
            a.flow(d, { mol: l.mol, rate: () => (vis() ? base * (l.mod && keepMod ? l.mod(T) : 1) * (sim && v ? Math.min(6, val(v)) : 1) : 0), size: l.size || 1.6, speed: l.speed || 120, track: false, max: 30 });
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
          }
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
          LV.y = Math.min(LV.y, 960 - 30 - LV.items.length * 34);
        }
        if (LV) {
          const L = LV;
          const lg = a.el('g', { class: 'levels', transform: `translate(${L.x} ${L.y})` });
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
            o.track.setAttribute('class', 'ax-track ' + k);
            if (o.sign) {
              o.sign.g.setAttribute('class', 'sign ' + k);
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
