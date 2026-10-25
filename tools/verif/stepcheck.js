const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node-tools/node_modules/playwright'); } })();
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1440,height:900}});
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(process.argv[2]); await p.waitForTimeout(600); await p.click('#warnOk').catch(() => {}); await p.waitForTimeout(800);
  const ids = await p.evaluate(() => Object.keys(HV.scenes).filter(k => HV.scenes[k].steps));
  for (const id of ids) {
    await p.evaluate(id => HV.app.flyTo(HV.scenes[id], true), id); await p.waitForTimeout(200);
    const n = await p.evaluate(() => document.getElementById('stepStart').hidden ? -1 : 1);
    if (n < 0) { console.log(id, 'NO BUTTON'); continue; }
    await p.click('#stepStart');
    const res = await p.evaluate((id) => { const sc = HV.scenes[id]; const out = []; sc.steps.forEach((st, i) => { sc.stepTo(i); if (st.on) { const missing = st.on.filter(k => !sc.content.querySelector('.st-now') ); } }); 
      // keys not matching anything
      const bad = [];
      if (sc.steps[0].on) sc.steps.forEach((st) => st.on.forEach((k) => { sc.stepTo(sc.steps.indexOf(st)); }));
      return sc.steps.length; }, id);
    // check each step has at least one st-now element
    for (let i = 0; i < res; i++) {
      const c = await p.evaluate(([id, i]) => { const sc = HV.scenes[id]; sc.stepTo(i); return sc.steps[i].on ? sc.content.querySelectorAll('.st-now').length : 1; }, [id, i]);
      if (!c) console.log(id, 'step', i, 'nothing lit');
    }
    // unknown keys
    const unk = await p.evaluate((id) => { const sc = HV.scenes[id]; if (!sc.steps[0].on) return []; const u = []; sc.steps.forEach((st, i) => st.on.forEach(k => { sc.stepTo(i); }));
      return u; }, id);
    console.log(id, res, 'steps ok');
    await p.click('#stepQuit');
  }
  await b.close();
})();
