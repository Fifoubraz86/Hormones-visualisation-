// node rec.js <scene> <scenario|-> <secondes> <sortie.webm>
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [id, sc, sec, out] = process.argv.slice(2);
  const dir = path.dirname(out) + '/rec-tmp';
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir, size: { width: 1920, height: 1080 } } });
  const p = await ctx.newPage();
  await p.goto('file:///home/user/Hormones-visualisation-/index.html'); await p.waitForTimeout(800);
  await p.evaluate((i) => HV.app.flyTo(HV.scenes[i], true), id);
  if (sc && sc !== '-') await p.click(`#scenarios label:has(input[value="${sc}"]), label:has(#sc-${id}-${sc})`);
  await p.waitForTimeout(+sec * 1000);
  const v = p.video(); await ctx.close(); fs.renameSync(await v.path(), out); await b.close();
})();
