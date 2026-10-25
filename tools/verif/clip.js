const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node-tools/node_modules/playwright'); } })();
(async () => {
  const [id, sc, x, y, w, h, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 });
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.goto('file://' + process.cwd() + '/index.html'); await p.waitForTimeout(800); await p.click('#warnOk');
  await p.evaluate((i) => HV.app.flyTo(HV.scenes[i], true), id); await p.waitForTimeout(500);
  if (sc !== '-') await p.click(`label:has(#sc-${id}-${sc})`).catch(async () => { await p.click(`#scenarios label:has(input[value="${sc}"])`); });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: out, clip: { x: +x, y: +y, width: +w, height: +h } });
  await b.close();
})();
