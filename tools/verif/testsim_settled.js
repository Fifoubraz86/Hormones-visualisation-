global.window = { HV: { clamp: (v,a,b)=>Math.max(a,Math.min(b,v)), INFO: {}, scene(){}, scenes: {} } };
global.document = { createElement: () => ({}) };
const HV = window.HV;
require(process.cwd()+'/js/axis-builder.js'); HV.axisScene = () => {};
require(process.cwd()+'/js/axes-data.js'); require(process.cwd()+'/js/axes-sim.js');
try { require(process.cwd()+'/js/tests.js'); } catch (e) { console.log('tests.js load', e.message); }
const cases = JSON.parse(process.argv[2]);
for (const [ax, sc, tn] of cases) {
  const S = HV.AXES.find(a => a.id === ax).sim; S.setScenario(sc);
  const T = { h: 8, d: 1 }; const dt = 0.05; // sim dt (s); time speed approx like app
  const tick = () => { T.h = (T.h + dt*0.5) % 24; T.d = ((T.d - 1 + dt/1.6) % 28) + 1; S.step(dt, T); };
  for (let i = 0; i < 2000; i++) tick();
  const d = HV.TESTS[ax].find(t => t.name.includes(tn));
  HV.Tests.start(d, S);
  for (let i = 0; i < d.duration / dt + 2; i++) { HV.Tests.update(dt); tick(); }
  console.log(ax, sc, '|', tn, '::', HV.Tests._st ? '' : '', HV.Tests.state().values.map(v=>+v.toFixed(2)).join(' '), '→', HV.Tests.state().result.text);
}
if (process.argv[3]) { const st = HV.Tests.state(); console.log(st.trace.filter((_, i) => i % 15 === 0).map(q => q[0].toFixed(2) + ':' + q[1].toFixed(2)).join(' ')); }
