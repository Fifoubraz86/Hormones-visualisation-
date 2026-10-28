// Captures de scènes de l'atlas avec Playwright, pour relire la mise en page.
// Usage : servir la racine du dépôt (python3 -m http.server 8765), puis
//   node docs/tools/captures.js pancreas tne-gastrinome:gastrinome atlas
// « scène:scénario » coche un scénario du panneau. Les images vont dans docs/tools/captures/ (ignoré par git).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'captures');
const URL = process.env.ATLAS_URL || 'http://localhost:8765/index.html';
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1700, height: 1000 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(() => { const w = document.getElementById('warnBox'); if (w) w.remove(); });
  await p.waitForTimeout(800);
  for (const arg of process.argv.slice(2)) {
    const [sid, scen] = arg.split(':');
    await p.evaluate(([sid, scen]) => {
      HV.app.flyTo(HV.scenes[sid], true);
      if (scen) { const r = document.querySelector(`input[name=scenario][value="${scen}"]`); if (r) { r.checked = true; r.dispatchEvent(new Event('change')); } }
    }, [sid, scen]);
    await p.waitForTimeout(scen ? 4000 : 1500);
    await p.screenshot({ path: path.join(OUT, arg.replace(':', '_') + '.png') });
  }
  console.log(errs.length ? errs.join('\n') : 'aucune erreur');
  await b.close();
})();
