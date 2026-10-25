const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node-tools/node_modules/playwright'); } })();
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  await p.goto('file://' + process.cwd() + '/index.html'); await p.waitForTimeout(1000); await p.click('#warnOk');
  // Panneau et légende masqués : seule compte la scène
  await p.addStyleTag({ content: '.legend, .side, aside, .stage-ctrl { display: none !important; }' });
  const ids = await p.evaluate(() => HV.sceneList.map((s) => s.id));
  const report = [];
  for (const id of ids) {
    await p.evaluate((i) => HV.app.flyTo(HV.scenes[i], true), id); await p.waitForTimeout(350);
    const r = await p.evaluate((i) => {
      const sc = HV.scenes[i];
      const vis = (el) => { for (let e = el; e && e !== sc.g; e = e.parentNode) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.3 || e.getAttribute('opacity') === '0') return false; } return true; };
      const T = [...sc.content.querySelectorAll('text')].filter((t) => t.textContent.trim().length > 1 && vis(t)).map((t) => ({ t: t.textContent.trim().slice(0, 40), r: t.getBoundingClientRect() })).filter((o) => o.r.width > 2);
      const hits = [];
      for (let a = 0; a < T.length; a++) for (let c = a + 1; c < T.length; c++) {
        const A = T[a].r, B = T[c].r;
        const w = Math.min(A.right, B.right) - Math.max(A.left, B.left), h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
        if (w > 3 && h > 3) { const fr = (w * h) / Math.min(A.width * A.height, B.width * B.height); if (fr > 0.25) hits.push(`« ${T[a].t} » × « ${T[c].t} » (${Math.round(fr * 100)} %)`); }
      }
      return hits;
    }, id);
    if (r.length) report.push(`${id} : ${r.length}\n    ` + r.slice(0, 8).join('\n    '));
  }
  console.log(report.join('\n'));
  await b.close();
})();
