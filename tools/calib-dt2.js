#!/usr/bin/env node
/*
 * Banc de calibration du patient virtuel DT2 (node tools/calib-dt2.js).
 * Rejoue les essais du référentiel js/simu/dt2-ref.js avec le modèle js/simu/dt2-model.js et compare
 * l'effet simulé aux valeurs publiées. Sortie non nulle si un écart dépasse la tolérance.
 * Avec --md : imprime le tableau du référentiel (docs/referentiel-effets.md).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ctx = { window: {}, Math, console };
vm.createContext(ctx);
for (const f of ['dt2-ref.js', 'dt2-model.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'simu', f), 'utf8'), ctx);
const D = ctx.window.HV.simu.dt2;
const REF = ctx.window.HV.simu.dt2ref;

const fmt = (t, v) => (v > 0 && t.metric !== 'abs' ? '+' : '') + v.toFixed(2).replace('.', ',') + ({ dW: ' kg', slope: ' %/pt' }[t.metric] || ' %');
if (process.argv.includes('--md')) {
  console.log('| Traitement | Situation | Effet publié | Source | Repère | Modèle |\n| --- | --- | --- | --- | --- | --- |');
  for (const r of REF) {
    const t = r.calib, cell = (x) => x.replace(/\|/g, '\\|');
    const m = t ? fmt(t, D.replay(t).v) : '—', c = t ? fmt(t, t.target) + ' ± ' + String(t.tol).replace('.', ',') : '—';
    console.log('| ' + [r.cls, r.situation, r.effet, '[' + r.source + '](' + r.url + ')' + (r.verif === 'secondaire' ? ' ²' : ''), c, m].map(cell).join(' | ') + ' |');
  }
  process.exit(0);
}

let bad = 0;
for (const r of REF.filter((x) => x.calib)) {
  const t = r.calib, e = D.replay(t);
  const ok = Math.abs(e.v - t.target) <= t.tol;
  if (!ok) bad++;
  console.log([ok ? 'ok   ' : 'ÉCART', r.id.padEnd(12), (t.metric || 'dA').padEnd(5), 'cible ' + t.target.toFixed(2).padStart(5), 'modèle ' + e.v.toFixed(2).padStart(5), '±' + t.tol,
    ' poids ' + e.dW.toFixed(1) + ' kg' + (e.basal ? ', basale ' + e.basal + ' U' : '')].join(' '));
}
console.log(bad ? bad + ' écart(s) hors tolérance' : 'Tous les repères sont dans la tolérance.');
process.exit(bad ? 1 : 0);
