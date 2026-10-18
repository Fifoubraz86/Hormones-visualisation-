/*
 * Remplace les glyphes dessinés à la main des protéines par leur tracé réel :
 * squelette des carbones α projeté depuis une structure de la PDB (voir docs/tools/traces.py),
 * avec ponts disulfure, glycanes et ligand (T4) à leur position.
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});

  const COLOR = {
    tsh: 'tsh', lh: 'p-violet', fsh: 'p-rose', insulin: 'p-blue2', gh: 'p-sky', prl: 'p-magenta', igf1: 'p-blue', glucagon: 'p-orange',
    pth: 'p-green', renin: 'p-red', pcsk9: 'p-magenta', ldlr: 'p-teal', trab: 'trab', ttr: 'ttr', tbg: 'tbg', alb: 'alb', tg: 'tg'
  };

  HV.applyTraces = function (defs) {
    const T = HV.TRACES;
    if (!T) return;
    const el = HV.el;
    const make = (id, key, iodinated) => {
      const t = T[key];
      const old = defs.querySelector('#mol-' + id);
      if (old) old.remove();
      const g = el('g', { id: 'mol-' + id, style: `--mc: var(--${COLOR[key]})`, class: 'm-trace-g' }, defs);
      const big = Object.values(t.n).reduce((a, v) => a + v, 0) > 1500;
      t.chains.forEach((c, i) => {
        let d = '';
        for (let j = 0; j < c.length; j += 2) d += (j ? ' L' : 'M') + c[j] + ',' + c[j + 1];
        el('path', { d, class: 'm-trace c' + (i % 4) + (big ? ' thin' : '') }, g);
      });
      // Sur les très grosses protéines, ponts et glycanes sont trop nombreux pour rester lisibles.
      if (!big) t.ss.forEach((q) => el('line', { x1: q[0], y1: q[1], x2: q[2], y2: q[3], class: 'm-ss' }, g));
      t.gly.filter((_, i) => !big || i % 5 === 0).forEach((q) => el('circle', { cx: q[0], cy: q[1], r: 0.9, class: 'm-glycan' }, g));
      if (t.lig) el('use', { href: '#mol-t4', transform: `translate(${t.lig[0]} ${t.lig[1]}) scale(0.45)` }, g);
      if (iodinated) {
        // Résidus tyrosyl iodés répartis le long de la chaîne (représentation qualitative)
        const c = t.chains[0];
        for (let j = 6; j < c.length; j += 22) el('circle', { cx: c[j], cy: c[j + 1], r: 1.3, class: 'm-I' }, g);
      }
    };
    Object.keys(COLOR).forEach((k) => T[k] && make(k, k));
    if (T.tg) make('tgi', 'tg', true);

    // Fiches : ajoute la source structurale
    Object.keys(COLOR).forEach((k) => {
      if (T[k] && HV.INFO[k]) HV.INFO[k].src = 'Structure : ' + T[k].src;
    });
    if (T.tg && HV.INFO.tgi) HV.INFO.tgi.src = 'Structure : ' + T.tg.src + ' ; positions d\'iodation figurées qualitativement';
  };

  /* Sources des petites molécules (vérifiées dans PubChem) */
  HV.SMALL_SRC = {
    t4: 'PubChem CID 5819 · L-thyroxine', t3: 'PubChem CID 5920 · L-triiodothyronine', rt3: 'PubChem CID 644280 · 3,3′,5′-triiodothyronine',
    trh: 'PubChem CID 638678 · protiréline', cortisol: 'PubChem CID 5754', aldo: 'PubChem CID 5839', testo: 'PubChem CID 6013',
    e2: 'PubChem CID 5757', prog: 'PubChem CID 5994', dhea: 'PubChem CID 5881', calcitriol: 'PubChem CID 5280453',
    adre: 'PubChem CID 5816', nora: 'PubChem CID 439260', dopa: 'PubChem CID 681', glucose: 'PubChem CID 5793'
  };
  HV.applySmallSources = function () {
    Object.keys(HV.SMALL_SRC).forEach((k) => { if (HV.INFO[k]) HV.INFO[k].src = 'Structure : ' + HV.SMALL_SRC[k]; });
  };
})();
