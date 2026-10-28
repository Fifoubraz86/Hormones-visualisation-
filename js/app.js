/* Caméra, navigation, panneau latéral et boucle d'animation. */
(function () {
  'use strict';
  const HV = window.HV;
  const M = HV.model;
  const $ = (id) => document.getElementById(id);
  const clamp = HV.clamp;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const svg = $('stage');
  const defs = HV.buildDefs(svg);
  HV.buildAxisDefs(defs);
  HV.applyTraces(defs);
  HV.applySmallSources();
  const root = HV.el('g', { class: 'world' }, svg);
  HV.initTips(svg.parentNode);
  HV.initSheets(svg.parentNode);

  HV.mount(root);
  // Molécules de l'axe thyréotrope proposées en fiches dans toutes ses scènes
  ['thyro', 'hypo', 'pit', 'foll', 'transp', 'cell'].forEach((id) => { HV.scenes[id].legend = new Set(['trh', 'tsh', 't4', 't3', 'rt3', 'iod', 'tg', 'trab', 'tbg', 'ttr', 'alb']); });
  const scenes = HV.sceneList;
  const TOUR = ['atlas', 'thyro', 'hypo', 'pit', 'foll', 'transp', 'cell', 'cortico', 'somato', 'gonadoF', 'gonadoM', 'lacto', 'adh', 'medullo', 'phospho', 'raa', 'glyc', 'islet', 'pancreas', 'lipid'];

  /* ---------- Caméra ---------- */
  const cam = { cx: 800, cy: 500, w: 1700 };
  let vw = 1, vh = 1;
  function measure() {
    const r = svg.getBoundingClientRect();
    vw = Math.max(1, r.width);
    vh = Math.max(1, r.height);
  }
  function apply() {
    const h = (cam.w * vh) / vw;
    svg.setAttribute('viewBox', `${cam.cx - cam.w / 2} ${cam.cy - h / 2} ${cam.w} ${h}`);
  }
  function fitOf(sc) {
    const r = HV.rectOf(sc);
    const pad = sc.depth === 0 ? 1.02 : 1.05;
    return [r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, (r.h * vw) / vh) * pad];
  }
  let tween = null;
  function flyTo(sc, instant) {
    const target = fitOf(sc);
    setCurrent(sc);
    if (instant || reduced) {
      cam.cx = target[0]; cam.cy = target[1]; cam.w = target[2];
      tween = null;
      apply();
      return;
    }
    const interp = HV.interpolateZoom([cam.cx, cam.cy, cam.w], target);
    tween = { interp, t0: performance.now(), dur: clamp(interp.duration * 0.9, 650, 2200) };
  }
  function stepTween(now) {
    if (!tween) return;
    let t = (now - tween.t0) / tween.dur;
    if (t >= 1) t = 1;
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const v = tween.interp(e);
    cam.cx = v[0]; cam.cy = v[1]; cam.w = v[2];
    apply();
    if (t === 1) tween = null;
  }
  function toWorld(px, py) {
    const r = svg.getBoundingClientRect();
    const h = (cam.w * vh) / vw;
    return [cam.cx - cam.w / 2 + ((px - r.left) / vw) * cam.w, cam.cy - h / 2 + ((py - r.top) / vh) * h];
  }
  function zoomAt(px, py, factor) {
    const [wx, wy] = toWorld(px, py);
    const nw = clamp(cam.w * factor, 4, 4000);
    const k = nw / cam.w;
    cam.cx = wx + (cam.cx - wx) * k;
    cam.cy = wy + (cam.cy - wy) * k;
    cam.w = nw;
    tween = null;
    apply();
    scheduleDetect();
  }

  /* Scène courante après navigation libre : la plus profonde qui remplit la vue. */
  let detectTimer = 0;
  function scheduleDetect() {
    clearTimeout(detectTimer);
    detectTimer = setTimeout(detect, 180);
  }
  function detect() {
    let best = HV.scenes.atlas;
    for (const sc of scenes) {
      const r = HV.rectOf(sc);
      const inside = cam.cx > r.x && cam.cx < r.x + r.w && cam.cy > r.y && cam.cy < r.y + r.h;
      if (inside && r.w / cam.w >= 0.5 && sc.depth > best.depth) best = sc;
    }
    if (best !== current) setCurrent(best);
  }
  function inView(sc) {
    const r = HV.rectOf(sc);
    const h = (cam.w * vh) / vw;
    return r.x < cam.cx + cam.w / 2 && r.x + r.w > cam.cx - cam.w / 2 && r.y < cam.cy + h / 2 && r.y + r.h > cam.cy - h / 2;
  }
  function isActive(sc) {
    return HV.rectOf(sc).w / cam.w >= 0.05 && inView(sc);
  }

  /* ---------- Interaction : glisser, molette, pincement, clic ---------- */
  const pointers = new Map();
  let drag = null;
  svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, moved: false, target: e.target };
    else drag && (drag.moved = true);
  });
  svg.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && pointers.size === 0) hover(e);
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d0 = Math.hypot(a.x - b.x, a.y - b.y);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [c, d] = [...pointers.values()];
      const d1 = Math.hypot(c.x - d.x, c.y - d.y);
      if (d0 > 0 && d1 > 0) zoomAt((c.x + d.x) / 2, (c.y + d.y) / 2, d0 / d1);
      return;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!drag) return;
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 5) drag.moved = true;
    if (drag.moved) {
      tween = null;
      cam.cx -= (dx * cam.w) / vw;
      cam.cy -= (dy * cam.w) / vw;
      apply();
      svg.classList.add('dragging');
    }
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    svg.classList.remove('dragging');
    if (drag && pointers.size === 0) {
      if (!drag.moved) {
        const z = drag.target && drag.target.closest && drag.target.closest('[data-zoom]');
        const sc = z && HV.scenes[z.getAttribute('data-zoom')];
        const inf = drag.target && drag.target.closest && drag.target.closest('[data-info]');
        // Un élément de la scène courante affiche sa fiche ; ailleurs, le clic fait entrer dans la scène.
        // Dans la scène courante, un clic ouvre la fiche (molécule, organe) ; Maj + clic l'ouvre aussi sur un élément zoomable.
        const chip = drag.target && drag.target.closest && drag.target.closest('[data-steps]');
        const chipSc = chip && HV.scenes[chip.getAttribute('data-steps')];
        if (chipSc) { if (chipSc !== current) flyTo(chipSc); stepShow(chipSc, 0); drag = null; return; }
        const sheet = HV.resolveSheet(drag.target);
        const fg = drag.target && drag.target.closest && drag.target.closest('[data-figs]');
        if (fg && sc === current) HV.openFigure(HV.polyFigsRef ? fg.getAttribute('data-figs').split(',').map(HV.polyFig).filter(Boolean) : [], 0);
        else if (sheet && (sc === current || e.shiftKey)) HV.openSheet(sheet);
        else if (inf && sc === current) HV.showTip(inf.getAttribute('data-info'), e.clientX, e.clientY, e.pointerType !== 'mouse');
        else if (sc && (sc !== current || !tween)) flyTo(sc);
      } else scheduleDetect();
      drag = null;
    }
  };
  function hover(e) {
    const inf = e.target.closest && e.target.closest('[data-info]');
    if (!inf) return HV.hideTip();
    const sheet = HV.resolveSheet(e.target);
    const z = e.target.closest('[data-zoom]');
    const zooms = z && HV.scenes[z.getAttribute('data-zoom')] !== current;
    const hint = inf.closest('[data-figs]') ? 'Clic : ouvrir les figures' : sheet ? (zooms ? 'Clic : zoomer · Maj + clic : fiche détaillée' : 'Clic : fiche détaillée') : zooms ? 'Clic : zoomer' : '';
    HV.showTip(inf.getAttribute('data-info'), e.clientX, e.clientY, false, hint);
  }
  svg.addEventListener('pointerleave', () => HV.hideTip());
  document.getElementById('legendBody').addEventListener('pointermove', (e) => {
    const li = e.target.closest('[data-info]');
    if (li) HV.showTip(li.dataset.info, e.clientX, e.clientY);
  });
  document.getElementById('legendBody').addEventListener('pointerleave', () => HV.hideTip());
  document.getElementById('legendBody').addEventListener('click', (e) => {
    const li = e.target.closest('[data-info]');
    if (li) HV.openSheet(HV.sheetFor(li.dataset.info));
  });
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(e.clientX, e.clientY, Math.exp(dy * 0.0016));
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    if (e.key === 'Escape' && HV.sheetOpen()) { HV.closeSheet(); e.preventDefault(); }
    else if (e.key === 'Escape' || e.key === 'Backspace') { goUp(); e.preventDefault(); }
    else if (e.key === 'ArrowRight') (stepping() ? stepGo(1) : tourStep(1));
    else if (e.key === 'ArrowLeft') (stepping() ? stepGo(-1) : tourStep(-1));
    else if (e.key === '+' || e.key === '=') zoomCenter(1 / 1.3);
    else if (e.key === '-') zoomCenter(1.3);
    else if (e.key === ' ' && e.target === document.body) { togglePlay(); e.preventDefault(); }
  });
  function zoomCenter(f) {
    const r = svg.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, f);
  }
  function goUp() {
    if (current.parent) flyTo(HV.scenes[current.parent]);
    else flyTo(current);
  }
  function tourStep(d) {
    let i = TOUR.indexOf(current.id);
    if (i < 0) i = 0;
    else i = clamp(i + d, 0, TOUR.length - 1);
    flyTo(HV.scenes[TOUR[i]]);
  }
  $('btnUp').addEventListener('click', goUp);
  $('btnHome').addEventListener('click', () => flyTo(HV.scenes.atlas));
  $('btnIn').addEventListener('click', () => zoomCenter(1 / 1.4));
  $('btnOut').addEventListener('click', () => zoomCenter(1.4));
  $('prevBtn').addEventListener('click', () => tourStep(-1));
  $('nextBtn').addEventListener('click', () => tourStep(1));

  /* ---------- Panneau : scène courante ---------- */
  /* ---------- Mode pas à pas ---------- */
  let stepSc = null, legOpen = null;
  const stepping = () => !!(stepSc && stepSc.stepIndex() >= 0);
  function stepShow(sc, i) {
    const box = $('stepBox');
    if (stepSc && stepSc !== sc) stepSc.stepTo(-1);
    // La légende (en haut à droite) se replie pendant le parcours pour ne pas masquer les projecteurs.
    const leg = $('legend');
    if (i >= 0 && box.hidden) { legOpen = leg.open; leg.open = false; } else if (i < 0 && !box.hidden && legOpen != null) { leg.open = legOpen; legOpen = null; }
    stepSc = sc;
    sc.stepTo(i);
    box.hidden = i < 0;
    if (i < 0) return;
    const S = sc.steps[i];
    // Projecteur dans la moitié basse de la scène : l'encadré passe en haut pour ne pas le cacher.
    const cy = S.spot ? S.spot.map((sp) => (sp.length === 3 ? sp[1] : sp[1] + sp[3] / 2)) : [];
    box.classList.toggle('at-top', cy.length > 0 && cy.reduce((x, y) => x + y, 0) / cy.length > 560);
    $('stepCount').textContent = `Étape ${i + 1} / ${sc.steps.length}`;
    $('stepTitle').textContent = S.t;
    $('stepText').textContent = S.d;
    $('stepPrev').disabled = i === 0;
    $('stepNext').textContent = i === sc.steps.length - 1 ? 'Tout afficher' : 'Étape suivante →';
    const dots = $('stepDots');
    dots.textContent = '';
    sc.steps.forEach((st, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.title = st.t;
      b.setAttribute('aria-label', `Étape ${k + 1} : ${st.t}`);
      if (k === i) b.setAttribute('aria-current', 'step');
      b.addEventListener('click', () => stepShow(sc, k));
      dots.appendChild(b);
    });
  }
  function stepGo(d) {
    if (!stepping()) return;
    const i = stepSc.stepIndex() + d;
    if (i >= stepSc.steps.length) return stepShow(stepSc, -1);
    if (i >= 0) stepShow(stepSc, i);
  }
  function stepStop() { if (stepSc) stepShow(stepSc, -1); }
  $('stepStart').addEventListener('click', () => { if (current.steps) stepShow(current, 0); });
  $('stepPrev').addEventListener('click', () => stepGo(-1));
  $('stepNext').addEventListener('click', () => stepGo(1));
  $('stepQuit').addEventListener('click', stepStop);

  let current = HV.scenes.atlas;
  function setCurrent(sc) {
    if (stepSc && stepSc !== sc) stepStop();
    current = sc;
    $('stepStart').hidden = !(sc.steps && sc.stepTo);
    if (sc.steps) $('stepStart').textContent = `▶ Comprendre pas à pas (${sc.steps.length} étapes)`;
    const chain = HV.ancestors(sc);
    scenes.forEach((s) => s.g.classList.toggle('can-zoom', !chain.includes(s)));
    const crumbs = $('crumbs');
    crumbs.textContent = '';
    chain.forEach((s, i) => {
      if (i) crumbs.appendChild(Object.assign(document.createElement('span'), { className: 'sep', textContent: '›' }));
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = s.id === 'atlas' ? 'Atlas' : s.title.split(' · ')[0];
      if (s === sc) b.setAttribute('aria-current', 'page');
      b.addEventListener('click', () => flyTo(s));
      crumbs.appendChild(b);
    });
    $('sceneLevel').textContent = 'Niveau ' + (sc.depth + 1) + ' · ' + sc.level;
    $('sceneTitle').textContent = sc.title;
    $('sceneLead').textContent = sc.lead;
    const ul = $('scenePoints');
    ul.textContent = '';
    (sc.points || []).forEach((p) => ul.appendChild(Object.assign(document.createElement('li'), { textContent: p })));
    const ex = $('sceneExplore');
    ex.textContent = '';
    const order = (k) => (TOUR.indexOf(k.id) + 100) % 100;
    const kids = sc.children.slice().sort((x, y) => order(x) - order(y));
    if (kids.length) {
      ex.appendChild(Object.assign(document.createElement('p'), { className: 'explore-h', textContent: 'Zoomer sur' }));
      const wrap = document.createElement('div');
      wrap.className = 'chips';
      kids.forEach((k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip' + (k.placeholder ? ' muted' : '');
        b.textContent = k.title.split(' · ')[0];
        b.addEventListener('click', () => flyTo(k));
        wrap.appendChild(b);
      });
      ex.appendChild(wrap);
    }
    const shWrap = $('sceneSheets');
    shWrap.textContent = '';
    const found = HV.sheetsInScene(sc);
    if (found.organs.length || found.mols.length) {
      shWrap.appendChild(Object.assign(document.createElement('p'), { className: 'explore-h', textContent: 'Fiches détaillées' }));
      const wrap = document.createElement('div');
      wrap.className = 'chips';
      found.organs.forEach((k) => {
        const b = Object.assign(document.createElement('button'), { type: 'button', className: 'chip organ', textContent: HV.ORGAN_SHEETS[k].title });
        b.addEventListener('click', () => HV.openSheet({ type: 'organ', key: k }));
        wrap.appendChild(b);
      });
      found.mols.forEach((k) => {
        const b = Object.assign(document.createElement('button'), { type: 'button', className: 'chip mol', textContent: (HV.INFO[k] ? HV.INFO[k].t : k).split(' · ')[0] });
        b.addEventListener('click', () => HV.openSheet({ type: 'mol', key: k }));
        wrap.appendChild(b);
      });
      shWrap.appendChild(wrap);
    }
    const figWrap = $('sceneFigs');
    figWrap.textContent = '';
    const figs = HV.polyFigsFor(sc.id);
    if (figs.length) {
      figWrap.appendChild(Object.assign(document.createElement('p'), { className: 'explore-h', textContent: `Iconographie du polycopié (${figs.length})` }));
      HV.figThumbs(figWrap, figs);
    }
    const ti = TOUR.indexOf(sc.id);
    $('tourPos').textContent = ti >= 0 ? ti + 1 + ' / ' + TOUR.length : 'hors parcours';
    $('prevBtn').disabled = ti === 0;
    $('nextBtn').disabled = ti === TOUR.length - 1;
    $('btnUp').disabled = !sc.parent;
    const thyroid = chain.some((s) => s.id === 'thyro') || sc.id === 'atlas';
    bindProvider(thyroid ? M : sc.sim || null);
    $('sceneSource').hidden = !sc.source;
    $('sceneSource').textContent = sc.source || '';
    HV.setLegend(document.getElementById('legendBody'), sc);
    try {
      history.replaceState(null, '', sc.id === 'atlas' ? location.pathname + location.search : '#' + sc.id);
    } catch (err) { /* contexte sans historique */ }
  }

  /* ---------- Panneau : bilan biologique, scénarios, paramètres ----------
     Un « fournisseur » décrit le modèle de la scène courante : HV.model pour l'axe thyréotrope,
     un modèle d'axe (HV.makeSim) pour les autres. */
  let prov = null;
  let hist = {};
  let labEls = {};
  let sliders = {};
  const fmtNum = (v, L) => {
    if (L.fmt) return L.fmt(v);
    const d = L.dec != null ? L.dec : v < 10 ? 2 : 1;
    return v.toFixed(d).replace('.', ',');
  };
  const rng = (L) => (L.range || `${String(L.lo).replace('.', ',')}–${String(L.hi).replace('.', ',')} ${L.unit}`);
  function bindProvider(P) {
    if (prov === P) return;
    prov = P;
    $('labCard').hidden = !P;
    $('scenarioCard').hidden = !P;
    HV.renderTests($('testCard'), P && P !== M ? P : null);
    if (!P) return;
    $('labTitle').textContent = P.title || 'Bilan simulé';
    hist = {};
    labEls = {};
    const rows = $('labRows');
    rows.textContent = '';
    P.LABS.forEach((L) => {
      hist[L.key] = [];
      const row = document.createElement('div');
      row.className = 'lab-row';
      row.innerHTML = `<div class="lab-name">${L.name}<span>${rng(L)}</span></div>
        <div class="lab-val"><b>–</b><i></i></div>
        <svg class="spark" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true"><rect class="spark-band" x="0" width="120"></rect><polyline class="spark-line" points=""></polyline><circle class="spark-dot" r="2.6"></circle></svg>`;
      rows.appendChild(row);
      const sy = (v) => {
        let f;
        if (L.log) f = (Math.log10(Math.max(v, L.min)) - Math.log10(L.min)) / (Math.log10(L.max) - Math.log10(L.min));
        else f = (v - L.min) / (L.max - L.min);
        return 32 - clamp(f, 0, 1) * 30;
      };
      const band = row.querySelector('.spark-band');
      band.setAttribute('y', sy(L.hi));
      band.setAttribute('height', Math.max(1, sy(L.lo) - sy(L.hi)));
      labEls[L.key] = { row, b: row.querySelector('b'), i: row.querySelector('i'), line: row.querySelector('.spark-line'), dot: row.querySelector('.spark-dot'), sy, L };
    });
    const scWrap = $('scenarios');
    scWrap.textContent = '';
    P.SCENARIOS.forEach((sc, i) => {
      const lab = document.createElement('label');
      lab.className = 'scenario';
      lab.innerHTML = `<input type="radio" name="scenario" id="sc-${P.id}-${sc.id}" value="${sc.id}"${(P.active || P.SCENARIOS[0].id) === sc.id ? ' checked' : ''}><span class="sc-name">${sc.name}</span><span class="sc-note">${sc.note}</span>`;
      lab.querySelector('input').addEventListener('change', () => {
        HV.Tests.reset();
        P.active = sc.id;
        P.setScenario(sc.id);
        syncSliders();
      });
      scWrap.appendChild(lab);
    });
    sliders = {};
    const slWrap = $('sliders');
    slWrap.textContent = '';
    P.PARAMS.forEach((Q) => {
      const row = document.createElement('div');
      row.className = 'slider';
      row.innerHTML = `<label for="p-${P.id}-${Q.key}">${Q.label}<output></output></label><input type="range" id="p-${P.id}-${Q.key}" min="${Q.min}" max="${Q.max}" step="${Q.step}">`;
      const input = row.querySelector('input');
      input.addEventListener('input', () => {
        HV.Tests.reset();
        P.p[Q.key] = parseFloat(input.value);
        row.querySelector('output').textContent = Q.fmt(P.p[Q.key]);
        const radio = document.querySelector('input[name="scenario"]:checked');
        if (radio) radio.checked = false;
        P.active = null;
      });
      slWrap.appendChild(row);
      sliders[Q.key] = { input, out: row.querySelector('output'), Q };
    });
    syncSliders();
    updateLabs(0.25);
  }
  function syncSliders() {
    for (const k in sliders) {
      sliders[k].input.value = prov.p[k];
      sliders[k].out.textContent = sliders[k].Q.fmt(prov.p[k]);
    }
  }
  let sampleAcc = 0;
  function updateLabs(sdt) {
    if (!prov) return;
    sampleAcc += sdt;
    const sample = sampleAcc >= 0.25;
    if (sample) sampleAcc = 0;
    prov.LABS.forEach((L) => {
      const v = prov.lab(L.key);
      const E = labEls[L.key];
      if (!E) return;
      if (sample) {
        hist[L.key].push(v);
        if (hist[L.key].length > 120) hist[L.key].shift();
      }
      const h = hist[L.key];
      E.line.setAttribute('points', h.map((x, i) => ((i / 119) * 120).toFixed(1) + ',' + E.sy(x).toFixed(1)).join(' '));
      if (h.length) {
        E.dot.setAttribute('cx', (((h.length - 1) / 119) * 120).toFixed(1));
        E.dot.setAttribute('cy', E.sy(h[h.length - 1]).toFixed(1));
      }
      E.b.textContent = fmtNum(v, L);
      const st = v > L.hi ? 'hi' : v < L.lo ? 'lo' : 'ok';
      E.i.textContent = st === 'hi' ? '↑' : st === 'lo' ? '↓' : '';
      E.row.dataset.state = st;
    });
    const it = prov.interpret();
    const pill = $('labStatus');
    pill.textContent = it.label;
    pill.dataset.tone = it.tone;
    $('labInterp').textContent = it.text;
    const an = prov.anat ? prov.anat() : '';
    $('labAnat').hidden = !an;
    $('labAnat').textContent = an ? 'Substrat anatomique : ' + an : '';
  }
  $('btnReset').addEventListener('click', () => {
    if (!prov) return;
    HV.Tests.reset();
    prov.reset();
    prov.active = prov.SCENARIOS[0].id;
    const r = document.getElementById(`sc-${prov.id}-${prov.active}`);
    if (r) r.checked = true;
    syncSliders();
  });

  /* ---------- Animation ---------- */
  let playing = !reduced;
  let speed = 1;
  // Deux boutons pilotent l'animation : celui du panneau et celui de la barre de navigation.
  function showPlay() {
    $('btnPlay').setAttribute('aria-pressed', String(playing));
    $('btnPlay').textContent = playing ? 'Pause' : 'Lecture';
    $('btnPause').setAttribute('aria-pressed', String(playing));
    $('btnPause').textContent = playing ? '❚❚ Pause' : '▶ Lecture';
  }
  function togglePlay() {
    playing = !playing;
    showPlay();
  }
  $('btnPlay').addEventListener('click', togglePlay);
  $('btnPause').addEventListener('click', togglePlay);
  showPlay();
  document.querySelectorAll('[data-speed]').forEach((b) => {
    b.addEventListener('click', () => {
      speed = parseFloat(b.dataset.speed);
      document.querySelectorAll('[data-speed]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
  });

  const paceR = $('paceRange');
  paceR.addEventListener('input', () => {
    HV.flowPace = parseFloat(paceR.value);
    $('paceOut').textContent = HV.flowPace.toFixed(2).replace(/\.?0+$/, '').replace('.', ',') + '×';
  });
  $('paceGain').addEventListener('change', (e) => { HV.flowGain = e.target.checked ? 1 : 0.4; });

  let last = performance.now();
  let labTimer = 0;
  let paused = false;
  // Une image : `run` force l'avance du temps simulé (export vidéo image par image).
  function tick(dt, now, run) {
    stepTween(now);
    const sdt = playing || run ? dt * speed : 0;
    M.step(sdt);
    HV.Tests.update(sdt);
    for (const sc of scenes) {
      // Le décor d'une scène parente s'efface quand on est loin à l'intérieur d'une de ses scènes enfants.
      const ratio = (HV.W * sc.world.s) / cam.w;
      const op = Math.round(clamp((4.5 - ratio) / 1.5, 0, 1) * 20) / 20;
      if (op !== sc._op) {
        sc._op = op;
        sc.content.style.opacity = op;
        sc.content.style.visibility = op === 0 ? 'hidden' : '';
      }
      // Allègement du rendu : une scène hors champ (ou réduite à un point) sort de l'arbre de rendu ;
      // vue de loin, ses particules sont masquées et ne sont plus animées.
      const frac = HV.rectOf(sc).w / cam.w;
      const on = op > 0 && frac > 0.012 && inView(sc);
      if (on !== sc._on) { sc._on = on; sc.content.style.display = on ? '' : 'none'; }
      const fl = on && frac > 0.2;
      if (fl !== sc._fl) { sc._fl = fl; for (const f of sc.flows) f.layer.style.display = fl ? '' : 'none'; }
      if (!on || !isActive(sc)) continue;
      if (fl) for (const f of sc.flows) f.step(sdt);
      for (const fn of sc.dyn) fn(sdt);
    }
    // Grands titres de la vue d'ensemble : visibles de loin, effacés dès qu'on zoome sur une carte.
    if (HV.atlasTitles) {
      const o = clamp((cam.w / HV.W - 0.45) / 0.3, 0, 1);
      if (o !== HV.atlasTitles._o) { HV.atlasTitles._o = o; HV.atlasTitles.style.opacity = o; HV.atlasTitles.style.display = o ? '' : 'none'; }
    }
    labTimer -= dt;
    if (labTimer <= 0) {
      labTimer = 0.1;
      updateLabs(playing || run ? 0.1 * speed : 0);
      HV.refreshTip();
    }
  }
  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    if (!paused) tick(dt, now, false);
    requestAnimationFrame(frame);
  }
  // Après un export, le panneau reflète l'état restauré du modèle.
  function refreshPanel() {
    if (!prov) return;
    document.querySelectorAll('input[name="scenario"]').forEach((r) => { r.checked = r.value === prov.active; });
    syncSliders();
  }

  /* ---------- Démarrage ---------- */
  measure();
  const start = HV.scenes[(location.hash || '').slice(1)] || HV.scenes.atlas;
  flyTo(HV.scenes.atlas, true);
  if (start !== HV.scenes.atlas) setTimeout(() => flyTo(start), 300);
  // Une première passe immobile place les éléments dynamiques avant l'animation.
  for (const sc of scenes) for (const fn of sc.dyn) fn(0);
  updateLabs(0.25);
  window.addEventListener('resize', () => {
    measure();
    if (!tween) {
      const t = fitOf(current);
      cam.cx = t[0]; cam.cy = t[1]; cam.w = t[2];
    }
    apply();
  });
  requestAnimationFrame(frame);
  HV.app = {
    flyTo, cam, refreshPanel,
    get current() { return current; },
    get provider() { return prov; },
    // Boucle temps réel suspendue pendant un export ; advance(dt) joue une image de durée fixe.
    pause() { paused = true; },
    resume() { paused = false; last = performance.now(); },
    advance(dt) { tick(dt, performance.now(), true); },
    stepShow,
    setView(c) { cam.cx = c.cx; cam.cy = c.cy; cam.w = c.w; tween = null; apply(); }
  };
})();
