/* Avertissement affiché à chaque ouverture : outil pédagogique, pas de données de patients ni d'usage médical. */
(function () {
  'use strict';
  const box = document.getElementById('warnBox');
  if (!box) return;
  const ok = document.getElementById('warnOk');
  const open = () => { box.hidden = false; ok.focus(); };
  const close = () => { box.hidden = true; };
  ok.addEventListener('click', close);
  document.getElementById('warnOpen').addEventListener('click', open);
  // Échap ferme l'avertissement sans déclencher les raccourcis de l'atlas.
  window.addEventListener('keydown', (e) => {
    if (!box.hidden && e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); }
  }, true);
  open();
})();
