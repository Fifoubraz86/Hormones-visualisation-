// Repères de variabilité glycémique (CV du capteur, 14 jours) du modèle DT2 : node tools/cv-dt2.js
// Sources : Monnier, Diabetes Care 2017;40:832 (régime ou metformine seuls : CV médian 18 % [15–24] ; seuil 36 %) ;
// Dunn, Diabetes Technol Ther 2024;26:203 (> 20 000 utilisateurs : DT2 sans insuline et sous insuline 23–30 %,
// sous insuline 28–30 % ; DT1 36–38 %) ; essais en DT2 sous insuline : CV initial 28 % [24–31] (Control-IQ),
// 29 ± 7 % (Omnipod 5, basal-bolus).
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { window: {}, Math, console }; vm.createContext(ctx);
for (const f of ['dt2-ref.js', 'dt2-model.js', 'glyco.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/simu/', f), 'utf8'), ctx);
const D = ctx.window.HV.simu.dt2, Y = ctx.window.HV.simu.glyco;
const BASE = { profile: 'sird', sex: 'M', age: 60, weight: 90, height: 175, duration: 10, dfg: 85, alb: 'normo', ethnic: 'eur', sbp: 135, retino: 'none', adh: 'bonne', variab: 'moyen', act0: 30, soda0: 1, snack0: 'modere', motiv: 'moyenne' };
const CASES = [
  ['metformine, HbA1c 7 %', { a1c: 7, rx0: { met: 2000 } }, 15, 24, 'Monnier 2017, groupe 1'],
  ['metformine, HbA1c 8,5 %', { a1c: 8.5, rx0: { met: 2000 } }, 15, 25, 'Monnier 2017, groupe 1'],
  ['metformine + sulfamide', { a1c: 7.5, rx0: { met: 2000, su: 120 } }, 20, 27, 'Dunn 2024 (sans insuline) ; Monnier 2017'],
  ['basale, HbA1c 8 %', { a1c: 8, rx0: { met: 2000, basal: 30 } }, 25, 32, 'Dunn 2024 (basale seule)'],
  ['basale, HbA1c 7 %', { a1c: 7, rx0: { met: 2000, basal: 40 } }, 25, 33, 'Dunn 2024 (basale seule)'],
  ['basal-bolus, HbA1c 8 %', { a1c: 8, rx0: { met: 2000, basal: 36, rapid: 30, rapidM: [8, 12, 10] } }, 25, 32, 'Dunn 2024 ; Omnipod 5 DT2'],
  ['basal-bolus, HbA1c 7 %', { a1c: 7, rx0: { met: 2000, basal: 40, rapid: 30, rapidM: [8, 12, 10] } }, 25, 32, 'Dunn 2024 ; Control-IQ DT2'],
  ['insulinopénique, basal-bolus', { profile: 'sidd', a1c: 8, rx0: { basal: 30, rapid: 24, rapidM: [6, 10, 8] } }, 27, 36, 'Monnier 2017, groupe 3 (19 % > 36 %)']
];
let bad = 0;
for (const [name, cfg, lo, hi, src] of CASES) {
  const pt = D.create(Object.assign({}, BASE, cfg));
  for (let d = 0; d < 60; d++) D.advance(pt, 1);
  let cv = 0, tbr = 0; const K = 6;
  for (let k = 0; k < K; k++) {
    const days = []; let lh = pt.st.hypo;
    for (let d = 0; d < 14; d++) { D.advance(pt, 1); days.push(Y.makeDay(pt, D, { seed: d * 31 + 7 + k * 1013, newHypo: pt.st.hypo - lh })); lh = pt.st.hypo; }
    const s = Y.agpStats(Y.cgm(days), 14); cv += s.cv / K; tbr += s.tbr / K;
  }
  const ok = cv >= lo && cv <= hi; if (!ok) bad++;
  console.log((ok ? 'ok   ' : 'HORS ') + name.padEnd(30) + ' CV ' + cv.toFixed(1) + ' % (repère ' + lo + '–' + hi + ' %)  TBR ' + tbr.toFixed(1) + ' %  · ' + src);
}
console.log(bad ? bad + ' repère(s) hors tolérance.' : 'Tous les repères de CV sont dans la tolérance.');
process.exitCode = bad ? 1 : 0;
