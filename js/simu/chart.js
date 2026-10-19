/*
 * Évolution du patient : petits multiples alignés sur le temps (une échelle par panneau, jamais deux).
 * T4L (linéaire, zone normale), TSH (logarithmique, zone normale), puis le traitement.
 * Points : valeurs mesurées aux consultations. Courbe pointillée : évolution réelle (corrigé).
 */
(function () {
  'use strict';
  const S = window.HV.simu;
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = (v, d) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function render(box, g, opts) {
    opts = opts || {};
    const tip = document.getElementById('svTip');
    box.textContent = '';
    const W = Math.max(300, box.clientWidth || 600);
    const L = 54, R = 14;
    const log = g.pt.log;
    const visits = g.visits.concat(g.current && g.current.labs && !g.visits.includes(g.current) ? [g.current] : []);
    const lastDay = Math.max(28, g.pt.day + 7);
    const x = (d) => L + ((W - L - R) * d) / lastDay;
    const anyAts = log.some((p) => p.ats > 0);
    const anyLt4 = log.some((p) => p.lt4 > 0);
    const lanes = [
      { key: 't4', title: 'T4 libre (pmol/L)', h: 92, lo: 12, hi: 22, color: 'var(--t4)', scale: 'lin', max: Math.max(30, ...log.map((p) => p.t4), ...visits.map((v) => (v.labs && v.labs.t4) || 0)) * 1.08 },
      { key: 'tsh', title: 'TSH (mUI/L, échelle log)', h: 92, lo: 0.4, hi: 4, color: 'var(--tsh)', scale: 'log', min: 0.005, max: 150 }
    ];
    if (anyAts) lanes.push({ key: 'ats', title: 'ATS (mg/j, équivalent carbimazole)', h: 52, color: 'var(--trab)', scale: 'step', max: Math.max(20, ...log.map((p) => p.ats)) * 1.15 });
    if (anyLt4) lanes.push({ key: 'lt4', title: 'Lévothyroxine (µg/j)', h: 52, color: 'var(--t3)', scale: 'step', max: Math.max(50, ...log.map((p) => p.lt4)) * 1.15 });
    const GAP = 30, TOP = 8;
    const H = TOP + lanes.reduce((a, l) => a + 16 + l.h + GAP, 0) - GAP + 26;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'sv-chart', role: 'img', 'aria-label': 'Évolution de la T4L, de la TSH et du traitement' }, box);
    let y0 = TOP;
    lanes.forEach((ln) => {
      const top = y0 + 16, bot = top + ln.h;
      const yv = ln.scale === 'log'
        ? (v) => bot - ((Math.log10(Math.max(ln.min, Math.min(ln.max, v))) - Math.log10(ln.min)) / (Math.log10(ln.max) - Math.log10(ln.min))) * ln.h
        : (v) => bot - (Math.max(0, Math.min(ln.max, v)) / ln.max) * ln.h;
      el('text', { x: L, y: y0 + 10, class: 'sv-ch-title' }, svg).textContent = ln.title;
      el('rect', { x: L, y: top, width: W - L - R, height: ln.h, class: 'sv-ch-bg' }, svg);
      if (ln.lo != null) {
        el('rect', { x: L, y: yv(ln.hi), width: W - L - R, height: yv(ln.lo) - yv(ln.hi), class: 'sv-ch-band' }, svg);
      }
      // Graduations
      const ticks = ln.scale === 'log' ? [0.01, 0.1, 1, 10, 100] : [0, ln.max / 2, ln.max].map((v) => (ln.scale === 'step' ? Math.round(v) : Math.round(v)));
      if (ln.lo != null && ln.scale !== 'log') ticks.splice(1, 1, ln.lo, ln.hi);
      ticks.forEach((t) => {
        const yy = yv(t);
        el('line', { x1: L, x2: W - R, y1: yy, y2: yy, class: 'sv-ch-grid' }, svg);
        el('text', { x: L - 6, y: yy + 4, class: 'sv-ch-tick', 'text-anchor': 'end' }, svg).textContent = t === 0 ? '0' : t < 1 ? fmt(t, t < 0.1 ? 2 : 1) : fmt(t, 0);
      });
      if (ln.scale === 'step') {
        let d = '';
        log.forEach((p, i) => { const v = p[ln.key]; d += (i ? 'L' : 'M') + x(p.day).toFixed(1) + ',' + yv(v).toFixed(1); });
        el('path', { d, class: 'sv-ch-step', style: 'stroke:' + ln.color }, svg);
        // Étiquettes de dose aux changements
        let prev = null;
        log.forEach((p) => {
          const v = p[ln.key];
          if (v !== prev && v > 0) el('text', { x: x(p.day) + 3, y: yv(v) - 4, class: 'sv-ch-lab' }, svg).textContent = fmt(v, v % 1 ? 1 : 0);
          prev = v;
        });
      } else {
        if (opts.truth) {
          let d = '';
          log.forEach((p, i) => { d += (i ? 'L' : 'M') + x(p.day).toFixed(1) + ',' + yv(p[ln.key]).toFixed(1); });
          el('path', { d, class: 'sv-ch-true', style: 'stroke:' + ln.color }, svg);
        }
        visits.forEach((v) => {
          const val = v.labs && v.labs[ln.key];
          if (val == null) return;
          const c = el('circle', { cx: x(v.day), cy: yv(val), r: 5, class: 'sv-ch-dot', style: 'fill:' + ln.color }, svg);
          const label = 'S' + fmt(v.day / 7, 0) + ' (J' + v.day + ') · ' + (ln.key === 'tsh' ? 'TSH ' + (val < 0.01 ? '< 0,01' : fmt(val, val < 1 ? 2 : 1)) + ' mUI/L' : 'T4L ' + fmt(val, 1) + ' pmol/L');
          const hit = el('circle', { cx: x(v.day), cy: yv(val), r: 13, class: 'sv-ch-hit', tabindex: 0, 'aria-label': label }, svg);
          const show = (ev) => { tip.textContent = label; tip.hidden = false; const r = c.getBoundingClientRect(); tip.style.left = r.left + r.width / 2 + 'px'; tip.style.top = r.top + window.scrollY - 8 + 'px'; };
          hit.addEventListener('pointerenter', show); hit.addEventListener('focus', show);
          hit.addEventListener('pointerleave', () => (tip.hidden = true)); hit.addEventListener('blur', () => (tip.hidden = true));
        });
      }
      y0 = bot + GAP;
    });
    // Axe du temps (semaines)
    const step = lastDay > 400 ? 26 : lastDay > 160 ? 8 : lastDay > 60 ? 4 : 1;
    for (let w = 0; w * 7 <= lastDay; w += step) {
      el('text', { x: x(w * 7), y: H - 4, class: 'sv-ch-tick', 'text-anchor': 'middle' }, svg).textContent = 'S' + w;
    }
    // Jour courant
    el('line', { x1: x(g.pt.day), x2: x(g.pt.day), y1: TOP + 14, y2: H - 20, class: 'sv-ch-now' }, svg);
  }

  S.chart = { render };
})();
