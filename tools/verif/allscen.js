const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node-tools/node_modules/playwright'); } })();
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/index.html'); await p.waitForTimeout(1000);
  const out = await p.evaluate(() => {
    const lines = [];
    const run = (name, sim) => {
      lines.push('== ' + name);
      sim.SCENARIOS.forEach((sc) => {
        sim.setScenario(sc.id); if (sim.settle) sim.settle(); else for (let i = 0; i < 600; i++) sim.step(0.1);
        const labs = sim.LABS.map((L) => L.key + '=' + (+sim.lab(L.key)).toFixed(L.dec != null ? L.dec : 2)).join(' ');
        const it = sim.interpret();
        lines.push('  ' + sc.id.padEnd(9) + ' [' + it.tone + '] ' + it.label + ' | ' + labs);
      });
    };
    const seen = new Set();
    if (HV.model && HV.model.SCENARIOS) { HV.model.settle = null; run('thyro (HV.model)', HV.model); }
    HV.sceneList.forEach((sc) => { if (sc.sim && !seen.has(sc.sim)) { seen.add(sc.sim); run(sc.id, sc.sim); } });
    return lines.join('\n');
  });
  console.log(out); console.log('PAGEERRORS', errs.length, errs.slice(0, 3).join(' | '));
  await b.close();
})();
