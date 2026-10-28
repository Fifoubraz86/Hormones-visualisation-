const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node-tools/node_modules/playwright'); } })();
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('file://' + process.cwd() + '/index.html'); await p.waitForTimeout(1500);
  await p.click('#warnOk').catch(() => {});
  for (const id of ['atlas', 'cortico', 'glyc', 'thyro', 'steroido']) {
    await p.evaluate((i) => HV.app.flyTo(HV.scenes[i], true), id); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => new Promise((res) => {
      let n = 0, t0 = performance.now(), worst = 0, prev = t0;
      const f = (t) => { n++; worst = Math.max(worst, t - prev); prev = t; if (t - t0 < 3000) requestAnimationFrame(f); else res({ fps: n / ((t - t0) / 1000), worst }); };
      requestAnimationFrame(f);
    }));
    const st = await p.evaluate(() => ({
      nodes: document.querySelectorAll('svg *').length,
      uses: [...document.querySelectorAll('g.flow use')].filter((u) => u.style.display !== 'none').length,
      active: HV.sceneList.filter((s) => s._op > 0).length,
      filters: document.querySelectorAll('[filter]').length
    }));
    console.log(id, JSON.stringify(r), JSON.stringify(st));
  }
  await b.close();
})();
