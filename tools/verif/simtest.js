global.window = { HV: { clamp: (v,a,b)=>Math.max(a,Math.min(b,v)), INFO: {}, scene(){}, scenes: {} } };
require(process.cwd()+'/js/axis-builder.js'); window.HV.axisScene = () => {};
require(process.cwd()+'/js/axes-data.js'); require(process.cwd()+'/js/axes-sim.js');
for (const ax of window.HV.AXES) {
  const S = ax.sim; if (!S) { console.log('NO SIM', ax.id); continue; }
  console.log('== ' + ax.id);
  for (const sc of S.SCENARIOS) {
    S.setScenario(sc.id);
    // run 40 s sim with clock
    const T = { h: 8, d: 1 }; let mins = {}, maxs = {};
    for (let i = 0; i < 1200; i++) { T.h = (T.h + 0.05*0.5) % 24; T.d = ((T.d - 1 + 0.05/1.6) % 28) + 1; S.step(0.05, T);
      if (i > 600) S.LABS.forEach(L => { const v = S.lab(L.key); mins[L.key] = Math.min(mins[L.key] ?? 1e9, v); maxs[L.key] = Math.max(maxs[L.key] ?? -1e9, v); }); }
    const it = S.interpret();
    console.log(' ', sc.id.padEnd(10), S.LABS.map(L => `${L.key}=${(+mins[L.key]).toFixed(2)}..${(+maxs[L.key]).toFixed(2)}`).join(' '), '|', it.label);
  }
}
