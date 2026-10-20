/* Choix du mode : thyroïde (par défaut), diabète de type 2 (#dt2), cas commentés (#cas) ; #cas-insuline ouvre
   directement le cas guidé d'initiation de l'insuline. */
(function () {
  'use strict';
  const S = window.HV.simu;
  const tabs = { sand: document.getElementById('svTabSand'), dt2: document.getElementById('svTabDt2'), cases: document.getElementById('svTabCases') };
  function show(mode) {
    for (const k in tabs) tabs[k].setAttribute('aria-selected', String(k === mode));
    document.getElementById('svHome').hidden = true;
    if (mode === 'cases') { S.casesUI.home(); if (location.hash === '#cas-insuline' && S.dt2case) S.dt2case.start(); } else if (mode === 'dt2') S.dt2ui.setup(); else S.sandbox.setup();
  }
  for (const k in tabs) tabs[k].addEventListener('click', () => show(k));
  show(location.hash.startsWith('#cas') ? 'cases' : location.hash === '#dt2' ? 'dt2' : 'sand');
})();
