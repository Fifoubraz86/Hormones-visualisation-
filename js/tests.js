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
      interpret(v, sim) {
        const peak = Math.max(...v);
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
        const extra = ` Natrémie finale ${n0(na)} mmol/L ; perte de poids ≈ ${loss.toFixed(1).replace('.', ',')} %.`;
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
    const vals = st.trace.map((q) => q[1]).concat(st.values, [d.thr * 1.4]);
    const ymax = Math.max(...vals) * 1.1;
    const sx = (x) => L + x * (W - L - R), sy = (v) => H - B - (v / ymax) * (H - B - Tp);
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="test-svg" role="img" aria-label="${d.label} au cours du test">`;
    svg += `<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" class="ax"/><line x1="${L}" y1="${Tp}" x2="${L}" y2="${H - B}" class="ax"/>`;
    [0, 0.5, 1].forEach((f) => { const v = ymax * f; svg += `<text x="${L - 4}" y="${sy(v) + 4}" class="tk" text-anchor="end">${v < 10 ? v.toFixed(1).replace('.', ',') : Math.round(v)}</text>`; });
    svg += `<line x1="${L}" y1="${sy(d.thr)}" x2="${W - R}" y2="${sy(d.thr)}" class="thr"/><text x="${W - R}" y="${sy(d.thr) - 4}" class="thr-t" text-anchor="end">${d.thrLabel}</text>`;
    d.samples.forEach((s) => { svg += `<text x="${sx(s.x)}" y="${H - 8}" class="tk" text-anchor="middle">${s.label}</text>`; });
    if (st.trace.length > 1) svg += `<polyline points="${st.trace.map((q) => sx(q[0]).toFixed(1) + ',' + sy(q[1]).toFixed(1)).join(' ')}" class="trace"/>`;
    st.values.forEach((v, i) => {
      const ok = d.thrDir === 'above' ? v >= d.thr : v < d.thr;
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
