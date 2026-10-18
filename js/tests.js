/*
 * Tests dynamiques : chaque test modifie temporairement les paramètres du modèle de l'axe
 * (injection, freinage, restriction), relève le dosage aux temps du protocole et conclut.
 * Le temps du test est compressé (quelques secondes simulées pour une heure ou une nuit).
 */
(function () {
  'use strict';
  const HV = window.HV;
  const clamp = HV.clamp;
  const n0 = (v) => Math.round(v).toLocaleString('fr-FR');
  const n2 = (v) => v.toFixed(2).replace('.', ',');

  /* ---------------- Protocoles ---------------- */
  const bell = (x) => (x > 0.08 ? Math.exp(-Math.pow((x - 0.36) / 0.17, 2)) : 0); // nadir glycémique vers 30 min
  const T = {};
  T.cortico = [
    {
      id: 'synacthene', name: 'Test au Synacthène immédiat', poly: true,
      what: 'Recherche une insuffisance surrénale : la corticosurrénale répond-elle à une stimulation maximale ?',
      proto: '250 µg de tétracosactide (ACTH 1-24) IV ou IM ; cortisol à T0, 30 et 60 min.',
      unit: 'nmol/L', label: 'Cortisol', thr: 500, thrDir: 'above', thrLabel: 'seuil 500 nmol/L (18 µg/dL)',
      span: 60, xUnit: 'min', duration: 14,
      samples: [{ x: 0.06, label: 'T0' }, { x: 0.55, label: '30 min' }, { x: 1, label: '60 min' }],
      apply(p, x) { if (x > 0.08) p.syn = 25; },
      measure: (sim) => sim.lab('cort'),
      interpret(v, sim, st) {
        const peak = Math.max(...v, ...st.trace.map((q) => q[1]));
        if (peak >= 500) return { tone: 'good', text: `Pic à ${n0(peak)} nmol/L : réponse normale (≥ 500 nmol/L). Une insuffisance surrénale est éliminée.` };
        const acth = sim.lab('acth');
        return { tone: 'bad', text: `Pic à ${n0(peak)} nmol/L (< 500) : réponse insuffisante. ` + (acth > 50 ? 'Avec une ACTH élevée : insuffisance surrénale périphérique.' : 'Avec une ACTH basse ou normale : insuffisance corticotrope ancienne, avec atrophie surrénalienne.') };
      }
    },
    {
      id: 'dxm', name: 'Freinage minute à la dexaméthasone', poly: true,
      what: 'Dépiste un hypercortisolisme : le cortisol se freine-t-il sous un glucocorticoïde exogène ?',
      proto: '1 mg de dexaméthasone à 23 h ; cortisol plasmatique le lendemain à 8 h.',
      unit: 'nmol/L', label: 'Cortisol', thr: 50, thrDir: 'below', thrLabel: 'freinage normal < 50 nmol/L (1,8 µg/dL)',
      span: 9, xUnit: 'h', x0: 23, duration: 16,
      samples: [{ x: 0.04, label: '23 h' }, { x: 1, label: '8 h' }],
      apply(p, x) { if (x > 0.06) p.dxm = 3; },
      measure: (sim) => sim.lab('cort'),
      interpret(v) {
        const last = v[v.length - 1];
        if (last < 50) return { tone: 'good', text: `Cortisol à 8 h : ${n0(last)} nmol/L. Freinage normal : un hypercortisolisme est peu probable.` };
        return { tone: 'bad', text: `Cortisol à 8 h : ${n0(last)} nmol/L. Absence de freinage : hypercortisolisme à confirmer (cortisol libre urinaire, cortisol salivaire à minuit), puis ACTH pour l'orientation.` };
      }
    }
  ];
  T.cortico.push(
    {
      id: 'ith', name: 'Hypoglycémie insulinique', poly: true,
      what: 'Explore l\'ensemble de l\'axe (hypothalamus, hypophyse, surrénale) : un stress hypoglycémique fait-il monter le cortisol ?',
      proto: 'Insuline IV jusqu\'à une glycémie < 0,40 g/L ; cortisol et ACTH avant, puis toutes les 15 à 30 min. Contre-indiquée en cas de cardiopathie ischémique ou d\'épilepsie.',
      unit: 'nmol/L', label: 'Cortisol', thr: 500, thrDir: 'above', thrLabel: 'élévation > 500 nmol/L (18 µg/dL)',
      span: 90, xUnit: 'min', duration: 15,
      samples: [{ x: 0.04, label: 'T0' }, { x: 0.34, label: '30' }, { x: 0.67, label: '60' }, { x: 1, label: '90' }],
      apply(p, x) { p.ith = bell(x); },
      measure: (sim) => sim.lab('cort'),
      interpret(v, sim, st) {
        const peak = Math.max(...v, ...st.trace.map((q) => q[1]));
        if (peak >= 500) return { tone: 'good', text: `Pic de cortisol à ${n0(peak)} nmol/L, pour une glycémie < 0,40 g/L : axe corticotrope fonctionnel.` };
        return { tone: 'bad', text: `Pic de cortisol à ${n0(peak)} nmol/L (< 500) : insuffisance de l'axe. ` + (sim.lab('acth') > 50 ? 'L\'ACTH monte : l\'atteinte est surrénalienne.' : 'L\'ACTH ne monte pas : atteinte hypothalamo-hypophysaire (insuffisance corticotrope).') };
      }
    },
    {
      id: 'dxm8', name: 'Freinage fort à la dexaméthasone', poly: false,
      what: 'Devant un Cushing ACTH-dépendant : origine hypophysaire (freinage partiel) ou sécrétion ectopique (pas de freinage) ?',
      proto: 'Dexaméthasone 8 mg (en une prise ou 2 mg toutes les 6 h pendant 48 h) ; cortisol avant et après (complément, non détaillé dans le polycopié).',
      unit: 'nmol/L', label: 'Cortisol', thrFn: (st) => (st.values.length ? st.values[0] * 0.5 : null), thrDir: 'below', thrLabel: 'baisse de 50 % par rapport au départ',
      span: 48, xUnit: 'h', duration: 15,
      samples: [{ x: 0.04, label: 'J0' }, { x: 0.5, label: 'J1' }, { x: 1, label: 'J2' }],
      apply(p, x) { if (x > 0.06) p.dxm = 8; },
      measure: (sim) => sim.lab('cort'),
      interpret(v, sim, st) {
        const fall = 1 - v[v.length - 1] / v[0];
        const pc = fall > 0 ? Math.round(fall * 100) + ' %' : 'aucune baisse';
        if (v[0] < 550) return { tone: 'warn', text: `Variation : ${pc}. Le test n'a d'intérêt qu'en cas d'hypercortisolisme ACTH-dépendant confirmé.` };
        if (st.base.autoAdr > 0.02) return { tone: 'warn', text: `Variation : ${pc}. ACTH effondrée : Cushing ACTH-indépendant (surrénalien), le test d'orientation hypophyse/ectopie n'est pas indiqué.` };
        if (fall >= 0.5) return { tone: 'good', text: `Baisse du cortisol de ${pc} (≥ 50 %) : freinage partiel en faveur d'un adénome corticotrope (maladie de Cushing).` };
        return { tone: 'bad', text: `Freinage du cortisol : ${pc} (< 50 %) : absence de freinage, en faveur d'une sécrétion ectopique d'ACTH.` };
      }
    }
  );
  T.somato = [
    {
      id: 'hgpo-gh', name: 'HGPO avec dosage de la GH', poly: true,
      what: 'Diagnostic de l\'acromégalie : la GH se freine-t-elle sous hyperglycémie ?',
      proto: '75 g de glucose per os ; GH à T0, 30, 60, 90 et 120 min.',
      unit: 'ng/mL', label: 'GH', thr: 0.4, thrDir: 'below', thrLabel: 'nadir < 0,4 ng/mL (1 mUI/L)',
      span: 120, xUnit: 'min', duration: 15,
      samples: [{ x: 0.04, label: 'T0' }, { x: 0.25, label: '30' }, { x: 0.5, label: '60' }, { x: 0.75, label: '90' }, { x: 1, label: '120' }],
      apply(p, x) { if (x > 0.05) p.load = clamp(Math.min((x - 0.05) * 8, 1) * (1 - 0.4 * Math.max(0, x - 0.6) / 0.4), 0, 1); },
      measure: (sim) => sim.lab('gh'),
      interpret(v, sim) {
        const nadir = Math.min(...v.slice(1));
        if (nadir < 0.4) return { tone: 'good', text: `Nadir de GH à ${n2(nadir)} ng/mL : freination normale. Pas d'acromégalie.` };
        return { tone: 'bad', text: `Nadir de GH à ${n2(nadir)} ng/mL (≥ 0,4) : absence de freination. Avec une IGF-1 élevée (${n0(sim.lab('igf'))} µg/L), le diagnostic d'acromégalie est confirmé : IRM hypophysaire.` };
      }
    }
  ];
  T.somato.push({
    id: 'ith-gh', name: 'Hypoglycémie insulinique', poly: true,
    what: 'Test de référence du déficit somatotrope : l\'hypoglycémie fait-elle monter la GH ?',
    proto: 'Insuline IV jusqu\'à une glycémie < 0,40 g/L ; GH (et cortisol) avant, puis toutes les 15 à 30 min. Contre-indiquée en cas de cardiopathie ischémique ou d\'épilepsie.',
    unit: 'ng/mL', label: 'GH', thr: 3, thrDir: 'above', thrLabel: 'pic < 3 : déficit complet · < 6 : partiel',
    span: 90, xUnit: 'min', duration: 15,
    samples: [{ x: 0.04, label: 'T0' }, { x: 0.34, label: '30' }, { x: 0.67, label: '60' }, { x: 1, label: '90' }],
    apply(p, x) { p.ith = bell(x); },
    measure: (sim) => sim.lab('gh'),
    interpret(v, sim, st) {
      const peak = Math.max(...v, ...st.trace.map((q) => q[1]));
      if (peak >= 6) return { tone: 'good', text: `Pic de GH à ${n2(peak)} ng/mL (≥ 6) : réponse normale.` };
      if (peak >= 3) return { tone: 'warn', text: `Pic de GH à ${n2(peak)} ng/mL (entre 3 et 6) : insuffisance somatotrope partielle.` };
      return { tone: 'bad', text: `Pic de GH à ${n2(peak)} ng/mL (< 3) : insuffisance somatotrope complète.` };
    }
  });
  T.raa = [{
    id: 'saline', name: 'Test de charge sodée', poly: true,
    what: 'Confirme l\'autonomie de l\'aldostérone : l\'expansion volémique la freine-t-elle ?',
    proto: 'Perfusion de 2 L de sérum salé isotonique en 4 h, patient allongé ; aldostérone avant et après. Les seuils sont des compléments (variables selon les centres).',
    unit: 'pmol/L', label: 'Aldostérone', thr: 140, thrDir: 'below', thrLabel: 'freinage normal < 140 pmol/L (5 ng/dL)',
    span: 4, xUnit: 'h', duration: 14,
    samples: [{ x: 0.04, label: '0 h' }, { x: 0.5, label: '2 h' }, { x: 1, label: '4 h' }],
    apply(p, x) { if (x > 0.06) p.salt = 1; },
    measure: (sim) => sim.lab('aldo'),
    interpret(v) {
      const a = v[v.length - 1];
      if (a < 140) return { tone: 'good', text: `Aldostérone à ${n0(a)} pmol/L après charge : freinage normal, l'hyperaldostéronisme primaire est exclu.` };
      if (a > 280) return { tone: 'bad', text: `Aldostérone à ${n0(a)} pmol/L malgré la charge sodée (> 280 pmol/L, 10 ng/dL) : sécrétion autonome, hyperaldostéronisme primaire confirmé. Étape suivante : scanner surrénalien et cathétérisme des veines surrénales.` };
      return { tone: 'warn', text: `Aldostérone à ${n0(a)} pmol/L : zone intermédiaire, à confronter aux autres tests (fludrocortisone, captopril).` };
    }
  }];
  T.glyc = [
    {
      id: 'hgpo', name: 'HGPO à 75 g', poly: true,
      what: 'Diagnostic du diabète et de l\'intolérance au glucose.',
      proto: '75 g de glucose per os à jeun ; glycémie à T0, 1 h et 2 h.',
      unit: 'g/L', label: 'Glycémie', thr: 2, thrDir: 'below', thrLabel: '2 h : ≥ 2,00 diabète · 1,40–1,99 intolérance',
      span: 120, xUnit: 'min', duration: 14,
      samples: [{ x: 0.04, label: 'T0' }, { x: 0.5, label: '60' }, { x: 1, label: '120' }],
      apply(p, x) { p.fast = 1; const u = (x - 0.06) / 0.25; p.ogtt = u > 0 ? u * Math.exp(1 - u) : 0; /* absorption digestive */ },
      measure: (sim) => sim.lab('g'),
      interpret(v) {
        const g0 = v[0], g2 = v[v.length - 1], f = (x) => x.toFixed(2).replace('.', ',');
        const fast = g0 >= 1.26 ? ` La glycémie à jeun (${f(g0)} g/L) est déjà ≥ 1,26 g/L.` : '';
        if (g2 >= 2) return { tone: 'bad', text: `Glycémie à 2 h : ${f(g2)} g/L (≥ 2,00) : diabète.` + fast };
        if (g2 >= 1.4) return { tone: 'warn', text: `Glycémie à 2 h : ${f(g2)} g/L (1,40–1,99) : intolérance au glucose (prédiabète).` + fast };
        return { tone: 'good', text: `Glycémie à 2 h : ${f(g2)} g/L (< 1,40) : tolérance normale.` + fast };
      }
    },
    {
      id: 'jeune', name: 'Épreuve de jeûne de 72 h', poly: false,
      what: 'Recherche une hypoglycémie organique : pendant le jeûne, l\'insuline doit s\'effondrer et la glycémie rester ≥ 0,50 g/L.',
      proto: 'Jeûne surveillé en hospitalisation ; glycémie répétée, insuline et peptide C au moment d\'une hypoglycémie (triade de Whipple, citée dans le polycopié).',
      unit: 'g/L', label: 'Glycémie', thr: 0.5, thrDir: 'above', thrLabel: 'hypoglycémie < 0,50 g/L',
      span: 72, xUnit: 'h', duration: 18,
      samples: [{ x: 0.03, label: '0 h' }, { x: 0.33, label: '24 h' }, { x: 0.67, label: '48 h' }, { x: 1, label: '72 h' }],
      apply(p, x) { if (x > 0.04) p.fast = 1; },
      measure: (sim) => sim.lab('g'),
      interpret(v, sim) {
        const min = Math.min(...v), ins = sim.lab('ins'), f = (x) => x.toFixed(2).replace('.', ',');
        if (min >= 0.5) return { tone: 'good', text: `Glycémie minimale ${f(min)} g/L sans hypoglycémie ; insuline freinée (${ins.toFixed(1).replace('.', ',')} µUI/mL). Pas d'hyperinsulinisme.` };
        if (ins > 3) return { tone: 'bad', text: `Hypoglycémie à ${f(min)} g/L avec une insuline non freinée (${ins.toFixed(1).replace('.', ',')} µUI/mL) : hyperinsulinisme. Peptide C élevé : insulinome ; peptide C bas : insuline exogène.` };
        return { tone: 'warn', text: `Hypoglycémie à ${f(min)} g/L avec une insuline freinée : cause non insulinique à rechercher.` };
      }
    }
  ];
  T.adh = [
    {
      id: 'restriction', name: 'Épreuve de restriction hydrique', poly: true,
      what: 'Diagnostic du diabète insipide : les urines se concentrent-elles quand on arrête de boire ? En fin d\'épreuve, la desmopressine distingue l\'origine centrale de l\'origine rénale (complément).',
      proto: 'En hospitalisation, après imagerie : arrêt des boissons ; poids, diurèse, osmolalités urinaire et plasmatique, natrémie ; desmopressine en fin d\'épreuve.',
      unit: 'mosmol/kg', label: 'Osmolalité urinaire', thr: 600, thrDir: 'above', thrLabel: 'urines concentrées > 600 mosmol/kg',
      span: 10, xUnit: 'h', duration: 20,
      samples: [{ x: 0.03, label: '0 h' }, { x: 0.2, label: '2 h' }, { x: 0.4, label: '4 h' }, { x: 0.6, label: '6 h' }, { x: 0.79, label: '8 h' }, { x: 1, label: 'DDAVP' }],
      apply(p, x) { if (x > 0.05) p.restrict = 1; if (x > 0.8) p.ddavp = 1; },
      measure: (sim) => sim.lab('uosm'),
      track: (sim) => sim.lab('diur') / 24, // litres par heure
      interpret(v, sim, st) {
        const u8 = v[4], ud = v[5], na = sim.lab('na');
        const loss = (st.acc / 70) * 100;
        const extra = ` Natrémie finale ${n0(na)} mmol/L ; perte de poids ≈ ${loss.toFixed(1).replace('.', ',')} %.` + (loss > 3 || na > 148 ? ' En pratique, l\'épreuve est interrompue avant ce stade (perte de poids > 3 à 5 % ou natrémie qui dépasse la normale ; complément).' : '');
        if (u8 >= 600) {
          if (HV.scenes.adh.sim.p.siadh > 0.02) return { tone: 'warn', text: 'Les urines restent concentrées et la natrémie remonte : la restriction corrige l\'hyponatrémie, argument pour un SIADH (épreuve diagnostique et thérapeutique).' + extra };
          return { tone: 'good', text: `Osmolalité urinaire à ${n0(u8)} mosmol/kg à 8 h : concentration normale, pas de diabète insipide.` + extra };
        }
        if (ud > u8 * 1.5 && ud > 400) return { tone: 'bad', text: `Urines non concentrées (${n0(u8)} mosmol/kg) puis concentration après desmopressine (${n0(ud)}) : diabète insipide central.` + extra };
        return { tone: 'bad', text: `Urines non concentrées (${n0(u8)} mosmol/kg) et pas de réponse à la desmopressine (${n0(ud)}) : diabète insipide néphrogénique.` + extra };
      }
    }
  ];
  HV.TESTS = T;

  /* ---------------- Moteur ---------------- */
  let st = null; // test en cours ou terminé
  let ui = null;

  function stop(keepResult) {
    if (st && st.running) {
      Object.keys(st.sim.p).forEach((k) => delete st.sim.p[k]);
      Object.assign(st.sim.p, st.base);
      st.running = false;
    }
    if (!keepResult) st = null;
  }
  HV.Tests = {
    start(def, sim) {
      stop();
      st = { def, sim, base: Object.assign({}, sim.p), t: 0, next: 0, values: [], trace: [], acc: 0, running: true, result: null };
      render();
    },
    cancel() { stop(); render(); },
    update(dt) {
      if (!st || !st.running || !(dt > 0)) return;
      const d = st.def, sim = st.sim;
      st.t += dt;
      const x = Math.min(1, st.t / d.duration);
      Object.keys(sim.p).forEach((k) => delete sim.p[k]);
      Object.assign(sim.p, st.base);
      d.apply(sim.p, x);
      const v = d.measure(sim);
      st.trace.push([x, v]);
      if (d.track) st.acc += d.track(sim) * d.span * (dt / d.duration) * (d.xUnit === 'min' ? 1 / 60 : 1);
      while (st.next < d.samples.length && x >= d.samples[st.next].x) {
        st.values.push(v);
        st.next++;
      }
      if (x >= 1) {
        st.result = d.interpret(st.values, sim, st);
        stop(true);
      }
      draw();
    },
    running: () => !!(st && st.running),
    state: () => st,
    // Appelé quand on change de scène ou de scénario : le test en cours est annulé.
    reset() { stop(); render(); }
  };

  /* ---------------- Interface ---------------- */
  HV.renderTests = function (card, sim) {
    ui = { card, sim };
    HV.Tests.reset();
  };
  const h = (tag, cls, text, parent) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  };
  function render() {
    if (!ui) return;
    const { card, sim } = ui;
    const list = sim && T[sim.id];
    card.hidden = !list;
    if (!list) return;
    const body = card.querySelector('.tests-body');
    body.textContent = '';
    const btns = h('div', 'chips', null, body);
    list.forEach((d) => {
      const b = h('button', 'chip test' + (st && st.def === d ? ' on' : ''), d.name + (d.poly ? ' (P)' : ''), btns);
      b.type = 'button';
      b.addEventListener('click', () => HV.Tests.start(d, sim));
    });
    if (!st) {
      h('p', 'tests-hint', 'Choisissez un scénario, puis lancez un test pour voir la réponse attendue. (P) : test cité dans le polycopié.', body);
      return;
    }
    const d = st.def;
    h('p', 'test-what', d.what, body);
    h('p', 'test-proto', 'Protocole : ' + d.proto, body);
    ui.chart = h('div', 'test-chart', null, body);
    ui.res = h('p', 'test-res', null, body);
    draw();
  }

  function draw() {
    if (!ui || !st || !ui.chart) return;
    const d = st.def;
    const W = 300, H = 150, L = 40, R = 10, Tp = 12, B = 26;
    const thr = d.thrFn ? d.thrFn(st) : d.thr;
    const vals = st.trace.map((q) => q[1]).concat(st.values, [(thr || st.values[0] || 1) * 1.4]);
    const ymax = Math.max(...vals) * 1.1;
    const sx = (x) => L + x * (W - L - R), sy = (v) => H - B - (v / ymax) * (H - B - Tp);
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="test-svg" role="img" aria-label="${d.label} au cours du test">`;
    svg += `<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" class="ax"/><line x1="${L}" y1="${Tp}" x2="${L}" y2="${H - B}" class="ax"/>`;
    [0, 0.5, 1].forEach((f) => { const v = ymax * f; svg += `<text x="${L - 4}" y="${sy(v) + 4}" class="tk" text-anchor="end">${v < 10 ? v.toFixed(1).replace('.', ',') : Math.round(v)}</text>`; });
    if (thr != null) svg += `<line x1="${L}" y1="${sy(thr)}" x2="${W - R}" y2="${sy(thr)}" class="thr"/><text x="${W - R}" y="${sy(thr) - 4}" class="thr-t" text-anchor="end">${d.thrLabel}</text>`;
    d.samples.forEach((s) => { svg += `<text x="${sx(s.x)}" y="${H - 8}" class="tk" text-anchor="middle">${s.label}</text>`; });
    if (st.trace.length > 1) svg += `<polyline points="${st.trace.map((q) => sx(q[0]).toFixed(1) + ',' + sy(q[1]).toFixed(1)).join(' ')}" class="trace"/>`;
    st.values.forEach((v, i) => {
      const ok = thr == null || (d.thrDir === 'above' ? v >= thr : v < thr);
      svg += `<circle cx="${sx(d.samples[i].x)}" cy="${sy(v)}" r="4.5" class="pt ${ok ? 'ok' : 'ko'}"/>`;
    });
    svg += `<text x="${L + 4}" y="${Tp + 2}" class="tk">${d.label} (${d.unit})</text></svg>`;
    ui.chart.innerHTML = svg;
    if (st.result) {
      ui.res.textContent = st.result.text;
      ui.res.dataset.tone = st.result.tone;
    } else {
      ui.res.textContent = st.running ? 'Test en cours…' : '';
      ui.res.dataset.tone = '';
    }
  }
})();
