#!/usr/bin/env node
/*
 * Génère docs/guide-modele-dt2.md : guide didactique du modèle DT2 (js/simu/dt2-guide.js), résultats
 * simulés de chaque option chez des patients types (arbres de décision, js/simu/dt2-tree.js) et
 * enchaînements de traitements. Usage : node tools/guide-dt2.js > docs/guide-modele-dt2.md
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ctx = { window: {}, Math, console };
vm.createContext(ctx);
for (const f of ['dt2-ref.js', 'dt2-model.js', 'glyco.js', 'sfd.js', 'dt2-tree.js', 'dt2-guide.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'simu', f), 'utf8'), ctx);
const S = ctx.window.HV.simu, D = S.dt2, TR = S.dt2tree, GU = S.dt2guide;
const fr = (x, d = 1) => x.toFixed(d).replace('.', ',');
const sg = (x) => (x >= 0 ? '+' : '−') + fr(Math.abs(x));
const out = [];
const p = (s) => out.push(s);

const BASE = { dfg: 85, alb: 'normo', ethnic: 'eur', sbp: 140, retino: 'none', adh: 'bonne', variab: 'moyen', act0: 30, soda0: 1, snack0: 'modere', motiv: 'moyenne', hfail: false, cvd: false, hcvr: false, masld: false, severe: false, driver: false, geria: 'bonne', panc: false, irregular: false };
const TYPES = [
  ['Diabète découvert, obèse (56 ans, IMC 33, HbA1c 8,5 %, sans traitement)', { profile: 'sird', sex: 'M', age: 56, weight: 98, height: 172, a1c: 8.5, duration: 0 }],
  ['Sous metformine, obèse (58 ans, IMC 33, HbA1c 7,9 %)', { profile: 'sird', sex: 'F', age: 58, weight: 88, height: 163, a1c: 7.9, duration: 5, rx0: { met: 2000 } }],
  ['Insuffisance cardiaque et maladie rénale (67 ans, DFG 55, microalbuminurie, metformine, HbA1c 8,2 %)', { profile: 'sird', sex: 'M', age: 67, weight: 90, height: 175, a1c: 8.2, duration: 10, hfail: true, cvd: true, dfg: 55, alb: 'micro', rx0: { met: 2000 } }],
  ['Trithérapie orale en échec (62 ans, IMC 31, HbA1c 9,4 %)', { profile: 'sird', sex: 'M', age: 62, weight: 95, height: 175, a1c: 9.4, duration: 14, rx0: { met: 2000, su: 120, dpp4: 100 } }],
  ['Basale à 0,7 U/kg + metformine (64 ans, IMC 37, HbA1c 8,6 %)', { profile: 'sird', sex: 'F', age: 64, weight: 100, height: 165, a1c: 8.6, duration: 16, rx0: { met: 2000, basal: 70 } }],
  ['Personne âgée fragile (82 ans, DFG 38, metformine 1 g, HbA1c 8 %)', { profile: 'mard', sex: 'F', age: 82, weight: 62, height: 158, a1c: 8, duration: 15, dfg: 38, irregular: true, geria: 'fragile', rx0: { met: 1000 } }]
];
const mk = (c) => { const cfg = Object.assign({}, BASE, c); const pt = D.create(cfg); pt.rx.rapidM = pt.rx.rapidM || [0, 0, 0]; return { cfg, pt }; };

p('# Guide du modèle DT2 : variables, effets, enchaînements, arbres de décision');
p('');
p('Généré par `node tools/guide-dt2.js` à partir du modèle (`js/simu/dt2-model.js`), du guide (`js/simu/dt2-guide.js`) et de l\'arbre des décisions (`js/simu/dt2-tree.js`). Les chiffres « obtenus » sont ceux du patient moyen (mode reproductible, observance bonne) : en mode patient réel, chaque patient s\'en écarte (réponses individuelles cachées). Les effets publiés qui ont servi au calage sont dans [`referentiel-effets.md`](referentiel-effets.md).');
p('');
p('## 1. Le cœur du modèle');
p('');
GU.CORE.forEach((t) => p('- ' + t));
p('');
p('## 2. Traitement par traitement');
p('');
GU.TREATMENTS.forEach((t) => {
  p('### ' + t.name);
  p('');
  p('- **Dans le modèle** : ' + t.how(D.P, D.GLP1));
  p('- **Ce qui module la réponse** : ' + t.mod);
  p('- **Ce que l\'on obtient** : ' + t.expect);
  p('- **Tolérance, événements simulés** : ' + t.safety);
  p('- **Repères de calage** : ' + t.refs);
  p('');
});
p('## 3. Situation par situation');
p('');
p('| Situation | Effet dans le modèle |');
p('| --- | --- |');
GU.SITUATIONS.forEach(([k, v]) => p('| ' + k + ' | ' + v + ' |'));
p('');
p('## 4. Arbres de décision pour six patients types');
p('');
p('Chaque option possible, classée de la meilleure à la pire selon la SFD 2025 (rang 1 recommandé · 2 acceptable · 3 possible, moins bon · 4 à éviter · 5 erreur), avec le résultat simulé à 6 mois ; pour les trois meilleures branches encore au-dessus de la cible, l\'étape suivante la mieux classée, à 12 mois. Le même arbre est calculé en direct pour le patient affiché dans le simulateur (carte « Arbre des décisions pour ce patient »).');
p('');
TYPES.forEach(([title, c]) => {
  const { cfg, pt } = mk(c);
  const T = TR.build(pt, cfg);
  p('### ' + title);
  p('');
  p('Cible SFD : HbA1c ≤ ' + fr(T.T.max) + ' %' + (T.T.floor ? ', sans descendre sous ' + fr(T.T.floor) + ' %' : '') + '.');
  p('');
  p('| Rang | Option | Pourquoi (SFD 2025) | HbA1c à 6 mois | Poids | Hypoglycémies | Puis (à 12 mois) |');
  p('| --- | --- | --- | --- | --- | --- | --- |');
  T.branches.forEach((b) => p('| ' + b.r + ' · ' + TR.RANK[b.r] + ' | ' + b.o.name + ' | ' + b.why.replace(/\|/g, '/') + ' (' + b.src + ') | ' + fr(b.res.a1c) + ' % | ' + sg(b.res.dW) + ' kg | ' + b.res.hypo + (b.res.sev ? ' (' + b.res.sev + ' sévère)' : '') + ' | ' + (b.next ? b.next.o.name + ' → ' + fr(b.next.res.a1c) + ' %, ' + sg(b.res.dW + b.next.res.dW) + ' kg' : '—') + ' |'));
  p('');
});
p('## 5. Enchaînements de traitements');
p('');
p('Patient type : diabète découvert, obèse (56 ans, IMC 33, HbA1c 8,5 %). Chaque étape dure 6 mois ; l\'étape suivante s\'ajoute à la précédente.');
p('');
const CHAINS = [
  ['Metformine → iSGLT2 → sémaglutide', ['met', 'sglt2', 'sema']],
  ['Metformine → sémaglutide → iSGLT2', ['met', 'sema', 'sglt2']],
  ['Metformine + sémaglutide d\'emblée → iSGLT2', ['metGlp', 'sglt2']],
  ['Metformine → tirzépatide', ['met', 'tirz']],
  ['Metformine → iDPP4 → sulfamide → insuline basale', ['met', 'dpp4', 'su', 'basal']],
  ['Metformine → sulfamide → insuline basale → bolus', ['met', 'su', 'basal', 'bolus']],
  ['Metformine → insuline basale → sémaglutide', ['met', 'basal', 'sema']],
  ['Mode de vie seul → metformine → sémaglutide', ['rhd', 'met', 'sema']],
  ['Ne rien faire pendant 1 an', ['none', 'none']]
];
p('| Enchaînement | Étapes (HbA1c, poids cumulé, hypoglycémies) | À la fin |');
p('| --- | --- | --- |');
CHAINS.forEach(([name, ids]) => {
  let { cfg, pt } = mk(TYPES[0][1]);
  let w = 0, hy = 0;
  const steps = [];
  ids.forEach((id) => {
    const o = TR.byId(id), x = TR.ctxOf(pt, cfg, pt.st.A);
    const r = TR.simulate(pt, o, x, 182);
    w += r.dW; hy += r.hypo; pt = r.pt;
    steps.push(o.name.replace(/^Ajouter (un |une |le |la )?/, '+ ').replace(/ \(.*\)$/, '') + ' : ' + fr(r.a1c) + ' %, ' + sg(w) + ' kg' + (r.hypo ? ', ' + r.hypo + ' hypo' : ''));
  });
  p('| ' + name + ' | ' + steps.join(' → ') + ' | HbA1c ' + fr(pt.st.A) + ' %, ' + sg(w) + ' kg, ' + hy + ' hypoglycémie' + (hy > 1 ? 's' : '') + ' |');
});
p('');
p('## 6. Limites');
p('');
p('- Le modèle reproduit des effets moyens publiés ; il ne prédit pas un patient réel. Les différences entre molécules d\'une même classe se limitent aux doses listées.');
p('- La perte de poids sous aGLP1 est calée sur les essais chez le diabétique de type 2 (SUSTAIN 1, 5 et 7, SURPASS-2) : elle est moindre que dans les essais d\'obésité sans diabète.');
p('- Les arbres utilisent une titration simplifiée de l\'insuline (glycémie à jeun) ; dans le simulateur, la titration suit le protocole du service.');
process.stdout.write(out.join('\n') + '\n');
