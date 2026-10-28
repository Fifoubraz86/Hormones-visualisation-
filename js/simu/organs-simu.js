/*
 * Organes des schémas physiologiques du simulateur : mêmes dessins que l'atlas (js/organs.js,
 * illustrations Servier Medical Art, crédits dans assets/organs/CREDITS.md).
 * S.organIcon(g, ic) dessine l'organe `ic` centré sur (0, 0), dans une boîte d'environ 100 × 100,
 * et renvoie false si l'atlas n'a pas cet organe (l'appelant garde alors son propre dessin).
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const S = (HV.simu = HV.simu || {});
  const NS = 'http://www.w3.org/2000/svg';
  // js/organs.js dessine avec HV.el (js/engine.js dans l'atlas) ; le simulateur ne charge pas le moteur.
  if (!HV.el) {
    HV.el = function (tag, attrs, parent) {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs || {}) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'text') e.textContent = v; else e.setAttribute(k, v); }
      if (parent) parent.appendChild(e);
      return e;
    };
  }
  const O = () => HV.organs;
  const wrap = (g, cls) => HV.el('g', { class: 'org-ic ' + cls }, g);

  // Organes du simulateur → dessins de l'atlas. La classe du groupe (o-brain, o-adrenal…) porte les
  // effets d'état du schéma (cerveau qui pâlit en hypoglycémie sévère, surrénales en alerte).
  const ICONS = {
    brain: (g) => O().hypothalamusIcon(wrap(g, 'o-brain')),
    stomach: (g) => HV.organArt(wrap(g, 'o-stomach'), 'servier/dig-stomach', -44, -48, 88, 94),
    gut: (g) => O().intestine(wrap(g, 'o-small')),
    islet: (g) => { const w = wrap(g, 'o-pancreas'); w.setAttribute('transform', 'translate(0 8)'); O().islet(w); },
    liver: (g) => O().liver(wrap(g, 'o-liver')),
    muscle: (g) => O().muscle(wrap(g, 'o-muscle')),
    fat: (g) => O().fat(wrap(g, 'o-fat-g')),
    kidney: (g) => O().kidney(wrap(g, 'o-kidney')),
    adrenal: (g) => O().adrenalKidney(wrap(g, 'o-adrenal')),
    pit: (g) => { const w = wrap(g, 'o-pit'); w.setAttribute('transform', 'translate(0 6) scale(0.86)'); O().pituitaryIcon(w); },
    blood: (g) => O().vessel(wrap(g, 'o-blood')),
    tissue: (g) => O().cellIcon(wrap(g, 'o-tissue'))
  };
  S.organIcon = function (g, ic) {
    if (!HV.organs || !ICONS[ic]) return false;
    ICONS[ic](g);
    return true;
  };
  // Reflet des formes pleines de js/organs.js (fill: url(#shine)) : à poser dans les <defs> du schéma.
  S.organDefs = function (defs) {
    const sh = HV.el('radialGradient', { id: 'shine', cx: '35%', cy: '30%', r: '75%' }, defs);
    [[0, '#fff', 0.45], [0.55, '#fff', 0.08], [1, '#000', 0.18]].forEach(([o, c, op]) => HV.el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }, sh));
  };
  // Mention des illustrations, sous chaque schéma qui les utilise.
  S.organCredit = function (h) {
    return h('p', { class: 'sv-note org-credit' }, ['Illustrations d\'organes : Servier Medical Art (smart.servier.com), licences CC BY 3.0 et CC BY 4.0 · ',
      h('a', { href: 'assets/organs/CREDITS.md', target: '_blank', rel: 'noopener' }, 'crédits et modifications')]);
  };
})();
