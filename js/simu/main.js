/* Choix du mode : thérapeutique libre (par défaut) ou cas commentés (#cas). */
(function () {
  'use strict';
  const S = window.HV.simu;
  const tabS = document.getElementById('svTabSand');
  const tabC = document.getElementById('svTabCases');
  function show(mode) {
    tabS.setAttribute('aria-selected', String(mode === 'sand'));
    tabC.setAttribute('aria-selected', String(mode === 'cases'));
    document.getElementById('svHome').hidden = true;
    if (mode === 'cases') S.casesUI.home(); else S.sandbox.setup();
  }
  tabS.addEventListener('click', () => show('sand'));
  tabC.addEventListener('click', () => show('cases'));
  show(location.hash === '#cas' ? 'cases' : 'sand');
})();
