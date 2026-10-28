/*
 * Microangiopathie du patient DT2 : risque relatif selon l'HbA1c et exposition glycémique cumulée.
 * Relation log-linéaire de l'étude observationnelle UKPDS 35 : chaque point d'HbA1c en moins (moyenne
 * actualisée) s'accompagne de 37 % de complications microvasculaires en moins (IC 95 % 33 à 41 %), sans seuil,
 * le risque le plus bas étant sous 6 % [ukpds35]. Le modèle n'invente pas de probabilité absolue : il donne
 * le risque relatif instantané et l'exposition cumulée (années-équivalent à une HbA1c de 6 %), comparée à
 * celle qu'aurait eue le même patient à 7 %. Mémoire glycémique : l'excès passé reste acquis (UKPDS 80) [ukpds80].
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const S = (HV.simu = HV.simu || {});
  const NS = 'http://www.w3.org/2000/svg';
  const BETA = -Math.log(1 - 0.37); // ≈ 0,46 par point d'HbA1c : risque × 1,59 par point
  const rr = (a1c, ref) => Math.exp(BETA * (a1c - (ref == null ? 6 : ref)));
  const fmt = (v, d) => v.toFixed(d).replace('.', ',');

  // Exposition depuis le début du suivi simulé : intégrale du risque relatif (référence 6 %), en années.
  function exposure(log) {
    const pts = (log || []).filter((e) => e && e.a1c != null);
    if (pts.length < 2) return null;
    let E = 0, E7 = 0, sumA = 0;
    const curve = [];
    for (let i = 1; i < pts.length; i++) {
      const dy = (pts[i].day - pts[i - 1].day) / 365.25;
      if (!(dy > 0)) continue;
      E += rr(pts[i].a1c) * dy;
      E7 += rr(7) * dy;
      sumA += pts[i].a1c * dy;
      if (i % 7 === 0 || i === pts.length - 1) curve.push([(pts[i].day - pts[0].day) / 365.25, E, E7, pts[i].a1c]);
    }
    const years = (pts[pts.length - 1].day - pts[0].day) / 365.25;
    return { years, E, E7, meanA: years > 0 ? sumA / years : pts[0].a1c, curve };
  }

  function chart(x) {
    const W = 520, H = 170, L = 46, B = 26, T = 12, R = 12;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'mi-chart');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Exposition glycémique cumulée du patient et à une HbA1c de 7 %');
    const el = (t, a, txt) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (txt != null) n.textContent = txt; svg.appendChild(n); return n; };
    const maxY = Math.max(1e-3, ...x.curve.map((c) => Math.max(c[1], c[2]))), maxX = Math.max(1 / 12, x.years);
    const X = (v) => L + (v / maxX) * (W - L - R), Y = (v) => H - B - (v / maxY) * (H - B - T);
    el('line', { x1: L, y1: H - B, x2: W - R, y2: H - B, class: 'mi-axis' });
    el('line', { x1: L, y1: T, x2: L, y2: H - B, class: 'mi-axis' });
    el('text', { x: L - 6, y: T + 10, class: 'mi-t', 'text-anchor': 'end' }, fmt(maxY, maxY < 10 ? 1 : 0));
    el('text', { x: L - 6, y: H - B, class: 'mi-t', 'text-anchor': 'end' }, '0');
    el('text', { x: W - R, y: H - 6, class: 'mi-t', 'text-anchor': 'end' }, fmt(maxX, maxX < 3 ? 1 : 0) + ' an' + (maxX >= 2 ? 's' : ''));
    const path = (k) => 'M' + x.curve.map((c) => X(c[0]).toFixed(1) + ',' + Y(c[k]).toFixed(1)).join(' L');
    el('path', { d: path(2), class: 'mi-line mi-goal' });
    el('path', { d: path(1), class: 'mi-line mi-pt' });
    return svg;
  }

  // Carte du dossier : ctx = { h, pt, cfg }
  function card(ctx) {
    const { h, pt, cfg } = ctx;
    const A = pt.st.A, x = exposure(pt.log);
    const rel = rr(A), rel7 = rr(A, 7);
    const kids = [
      h('h3', null, 'Microangiopathie : risque selon l\'HbA1c'),
      h('dl', { class: 'sv-exam sv-qual' }, [
        h('dt', null, 'HbA1c actuelle'), h('dd', null, fmt(A, 1) + ' %'),
        h('dt', null, 'Risque relatif'), h('dd', null, '× ' + fmt(rel, 1) + ' par rapport à une HbA1c de 6 % ; ' + (A > 7 ? '× ' + fmt(rel7, 1) + ' par rapport à 7 %' : 'à l\'objectif de 7 % ou en dessous')),
        A > 10 ? h('dt', null, 'Prudence') : null, A > 10 ? h('dd', null, 'Au-delà de 10 %, la relation log-linéaire est extrapolée (complément).') : null,
        h('dt', null, 'Règle'), h('dd', null, 'Chaque point d\'HbA1c en moins : 37 % de complications microvasculaires (rétinopathie, néphropathie) en moins, sans seuil (UKPDS 35, étude observationnelle).')
      ])
    ];
    if (x && x.years >= 1 / 12) {
      kids.push(
        h('p', { class: 'sv-q' }, 'Exposition glycémique cumulée depuis le début du suivi (' + fmt(x.years, 1) + ' an' + (x.years >= 2 ? 's' : '') + ', HbA1c moyenne ' + fmt(x.meanA, 1) + ' %) :'),
        chart(x),
        h('p', { class: 'mi-leg' }, [h('span', { class: 'mi-sw mi-pt' }), ' patient : ' + fmt(x.E, 1) + ' années-équivalent ', h('span', { class: 'mi-sw mi-goal' }), ' à 7 % : ' + fmt(x.E7, 1) + ' (' + (x.E > x.E7 ? '+ ' + Math.round((x.E / x.E7 - 1) * 100) + ' %' : Math.round((x.E / x.E7 - 1) * 100) + ' %') + ')']),
        h('p', { class: 'sv-note' }, 'Une année-équivalent = une année à 6 % d\'HbA1c. Mémoire glycémique : l\'excès passé reste acquis ; dans UKPDS 80, dix ans après la fin de l\'essai, le groupe intensif gardait 24 % de complications microvasculaires en moins alors que les HbA1c s\'étaient rejointes en un an.')
      );
    } else kids.push(h('p', { class: 'sv-note' }, 'Faites avancer le temps : la courbe d\'exposition se construit au fil du suivi.'));
    kids.push(
      h('p', { class: 'sv-note' }, (cfg && cfg.duration ? 'Avant le suivi : diabète connu depuis ' + cfg.duration + ' an' + (cfg.duration > 1 ? 's' : '') + ', exposition antérieure inconnue. ' : '') + 'Dépistage annuel : fond d\'œil, DFG et albuminurie, examen des pieds (monofilament).'),
      h('p', { class: 'sv-note' }, 'Modèle (complément) : risque relatif seulement, pas de probabilité individuelle ; UKPDS 35 : Stratton IM et al. BMJ 2000;321:405 ; UKPDS 80 : Holman RR et al. N Engl J Med 2008;359:1577.')
    );
    return h('div', { class: 'sv-card sv-micro' }, kids);
  }

  S.dt2micro = { BETA, rr, exposure, card };
})();
