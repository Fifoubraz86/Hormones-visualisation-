/* Caméra, navigation, panneau latéral et boucle d'animation. */
(function () {
  'use strict';
  const HV = window.HV;
  const M = HV.model;
  const $ = (id) => document.getElementById(id);
  const clamp = HV.clamp;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const svg = $('stage');
  HV.buildDefs(svg);
  const root = HV.el('g', { class: 'world' }, svg);
  HV.initTips(svg.parentNode);
  HV.buildLegend(document.getElementById('legendBody'));
  HV.mount(root);
  const scenes = HV.sceneList;
  const TOUR = ['atlas', 'thyro', 'hypo', 'pit', 'foll', 'transp', 'cell'];

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
  function isActive(sc) {
    const r = HV.rectOf(sc);
    const h = (cam.w * vh) / vw;
    if (r.w / cam.w < 0.05) return false;
    return r.x < cam.cx + cam.w / 2 && r.x + r.w > cam.cx - cam.w / 2 && r.y < cam.cy + h / 2 && r.y + r.h > cam.cy - h / 2;
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
        if (inf && sc && HV.ancestors(current).includes(sc) && sc === current) HV.showTip(inf.getAttribute('data-info'), e.clientX, e.clientY, e.pointerType !== 'mouse');
        else if (sc && (sc !== current || !tween)) flyTo(sc);
      } else scheduleDetect();
      drag = null;
    }
  };
  function hover(e) {
    const inf = e.target.closest && e.target.closest('[data-info]');
    if (inf) HV.showTip(inf.getAttribute('data-info'), e.clientX, e.clientY);
    else HV.hideTip();
  }
  svg.addEventListener('pointerleave', () => HV.hideTip());
  document.getElementById('legendBody').addEventListener('pointermove', (e) => {
    const li = e.target.closest('[data-info]');
    if (li) HV.showTip(li.dataset.info, e.clientX, e.clientY);
  });
  document.getElementById('legendBody').addEventListener('pointerleave', () => HV.hideTip());
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(e.clientX, e.clientY, Math.exp(dy * 0.0016));
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    if (e.key === 'Escape' || e.key === 'Backspace') { goUp(); e.preventDefault(); }
    else if (e.key === 'ArrowRight') tourStep(1);
    else if (e.key === 'ArrowLeft') tourStep(-1);
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
  let current = HV.scenes.atlas;
  function setCurrent(sc) {
    current = sc;
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
    const kids = sc.children.filter((k) => !(sc.id === 'atlas' && k.placeholder));
    if (sc.id === 'atlas') kids.push(...sc.children.filter((k) => k.placeholder));
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
    const ti = TOUR.indexOf(sc.id);
    $('tourPos').textContent = ti >= 0 ? ti + 1 + ' / ' + TOUR.length : 'hors parcours';
    $('prevBtn').disabled = ti === 0;
    $('nextBtn').disabled = ti === TOUR.length - 1;
    $('btnUp').disabled = !sc.parent;
    const thyroid = !sc.placeholder;
    $('labCard').hidden = !thyroid;
    $('scenarioCard').hidden = !thyroid;
    try {
      history.replaceState(null, '', sc.id === 'atlas' ? location.pathname + location.search : '#' + sc.id);
    } catch (err) { /* contexte sans historique */ }
  }

  /* ---------- Panneau : bilan biologique ---------- */
  const hist = {};
  const labEls = {};
  const rows = $('labRows');
  M.LABS.forEach((L) => {
    hist[L.key] = [];
    const row = document.createElement('div');
    row.className = 'lab-row';
    row.innerHTML = `<div class="lab-name">${L.name}<span>${L.lo.toString().replace('.', ',')}–${L.hi.toString().replace('.', ',')} ${L.unit}</span></div>
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
  const fmt = (v, key) => {
    if (key === 'tsh') return v < 0.01 ? '< 0,01' : v < 10 ? v.toFixed(2).replace('.', ',') : v.toFixed(1).replace('.', ',');
    if (key === 'rt3') return v.toFixed(2).replace('.', ',');
    return v.toFixed(1).replace('.', ',');
  };
  let sampleAcc = 0;
  function updateLabs(sdt) {
    sampleAcc += sdt;
    const sample = sampleAcc >= 0.25;
    if (sample) sampleAcc = 0;
    M.LABS.forEach((L) => {
      const v = M.lab(L.key);
      const E = labEls[L.key];
      if (sample) {
        hist[L.key].push(v);
        if (hist[L.key].length > 120) hist[L.key].shift();
      }
      const h = hist[L.key];
      const pts = h.map((x, i) => ((i / 119) * 120).toFixed(1) + ',' + E.sy(x).toFixed(1)).join(' ');
      E.line.setAttribute('points', pts);
      if (h.length) {
        E.dot.setAttribute('cx', (((h.length - 1) / 119) * 120).toFixed(1));
        E.dot.setAttribute('cy', E.sy(h[h.length - 1]).toFixed(1));
      }
      E.b.textContent = fmt(v, L.key);
      const st = v > L.hi ? 'hi' : v < L.lo ? 'lo' : 'ok';
      E.i.textContent = st === 'hi' ? '↑' : st === 'lo' ? '↓' : '';
      E.row.dataset.state = st;
    });
    const it = M.interpret();
    const pill = $('labStatus');
    pill.textContent = it.label;
    pill.dataset.tone = it.tone;
    $('labInterp').textContent = it.text;
  }

  /* ---------- Scénarios et paramètres ---------- */
  const scWrap = $('scenarios');
  let activeScenario = 'eu';
  M.SCENARIOS.forEach((sc) => {
    const lab = document.createElement('label');
    lab.className = 'scenario';
    lab.innerHTML = `<input type="radio" name="scenario" id="sc-${sc.id}" value="${sc.id}"${sc.id === 'eu' ? ' checked' : ''}><span class="sc-name">${sc.name}</span><span class="sc-note">${sc.note}</span>`;
    lab.querySelector('input').addEventListener('change', () => {
      activeScenario = sc.id;
      M.setScenario(sc.id);
      syncSliders();
    });
    scWrap.appendChild(lab);
  });
  const sliders = {};
  const slWrap = $('sliders');
  M.PARAMS.forEach((P) => {
    const row = document.createElement('div');
    row.className = 'slider';
    row.innerHTML = `<label for="p-${P.key}">${P.label}<output id="o-${P.key}"></output></label><input type="range" id="p-${P.key}" min="${P.min}" max="${P.max}" step="${P.step}">`;
    const input = row.querySelector('input');
    input.addEventListener('input', () => {
      M.p[P.key] = parseFloat(input.value);
      row.querySelector('output').textContent = P.fmt(M.p[P.key]);
      const radio = document.querySelector('input[name="scenario"]:checked');
      if (radio) radio.checked = false;
      activeScenario = null;
    });
    slWrap.appendChild(row);
    sliders[P.key] = { input, out: row.querySelector('output'), P };
  });
  function syncSliders() {
    for (const k in sliders) {
      sliders[k].input.value = M.p[k];
      sliders[k].out.textContent = sliders[k].P.fmt(M.p[k]);
    }
  }
  syncSliders();
  $('btnReset').addEventListener('click', () => {
    M.setScenario('eu');
    for (const k in M.s) M.s[k] = 1;
    document.getElementById('sc-eu').checked = true;
    syncSliders();
  });

  /* ---------- Animation ---------- */
  let playing = !reduced;
  let speed = 1;
  function togglePlay() {
    playing = !playing;
    $('btnPlay').setAttribute('aria-pressed', String(playing));
    $('btnPlay').textContent = playing ? 'Pause' : 'Lecture';
  }
  $('btnPlay').addEventListener('click', togglePlay);
  $('btnPlay').setAttribute('aria-pressed', String(playing));
  $('btnPlay').textContent = playing ? 'Pause' : 'Lecture';
  document.querySelectorAll('[data-speed]').forEach((b) => {
    b.addEventListener('click', () => {
      speed = parseFloat(b.dataset.speed);
      document.querySelectorAll('[data-speed]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
  });

  let last = performance.now();
  let labTimer = 0;
  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    stepTween(now);
    const sdt = playing ? dt * speed : 0;
    M.step(sdt);
    for (const sc of scenes) {
      // Le décor d'une scène parente s'efface quand on est loin à l'intérieur d'une de ses scènes enfants.
      const ratio = (HV.W * sc.world.s) / cam.w;
      const op = Math.round(clamp((4.5 - ratio) / 1.5, 0, 1) * 20) / 20;
      if (op !== sc._op) {
        sc._op = op;
        sc.content.style.opacity = op;
        sc.content.style.visibility = op === 0 ? 'hidden' : '';
      }
      if (op === 0 || !isActive(sc)) continue;
      for (const f of sc.flows) f.step(sdt);
      for (const fn of sc.dyn) fn(sdt);
    }
    labTimer -= dt;
    if (labTimer <= 0) {
      labTimer = 0.1;
      updateLabs(playing ? 0.1 * speed : 0);
      HV.refreshTip();
    }
    requestAnimationFrame(frame);
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
  HV.app = { flyTo, cam, get current() { return current; } };
})();
