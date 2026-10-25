const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node-tools/node_modules/playwright'); } })();
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1440,height:900}});
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  p.on('console', m => { if (m.type()==='error') console.log('CONSOLE', m.text()); });
  await p.goto(process.argv[2]); await p.waitForTimeout(800); await p.click('#warnOk').catch(() => {});
  for (const spec of JSON.parse(process.argv[4])) {
    const [id, sc, step] = spec;
    await p.evaluate(id => HV.app.flyTo(HV.scenes[id], true), id); await p.waitForTimeout(400);
    if (sc) { await p.click(`#scenarios label:has(input[value="${sc}"]), label:has(#sc-${id}-${sc}), label:has(#sc-glyc-${sc})`); }
    if (step != null) { await p.click('#stepStart'); for (let i = 0; i < step; i++) await p.click('#stepNext'); }
    await p.waitForTimeout(sc ? 5000 : 1500);
    await p.screenshot({path: `${process.argv[3]}-${id}-${sc||''}-${step==null?'':step}.png`});
    if (step != null) await p.click('#stepQuit');
  }
  await b.close();
})();
