/*
 * Export vidéo d'une scène pour PowerPoint, entièrement dans le navigateur.
 * La boucle temps réel est suspendue ; chaque image avance la simulation d'un pas fixe (HV.app.advance),
 * puis la scène est sérialisée en SVG autonome (CSS de la page, glyphes utilisés, figures en data URI),
 * dessinée dans un canvas et encodée en H.264 (WebCodecs), multiplexée en MP4 par mp4-muxer.
 * Repli : MediaRecorder WebM quand l'encodeur H.264 manque.
 */
(function () {
  'use strict';
  const HV = window.HV;
  const NS = 'http://www.w3.org/2000/svg';
  const MUXER_URL = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/build/mp4-muxer.js';
  const CODECS = ['avc1.640028', 'avc1.4D4028', 'avc1.42E028'];
  const PAD = 40;
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmt = (v, d) => v.toFixed(d).replace('.', ',');

  /* ---------- Chargement paresseux de mp4-muxer ---------- */
  let muxerP = null;
  function loadMuxer() {
    if (window.Mp4Muxer) return Promise.resolve(window.Mp4Muxer);
    if (!muxerP) {
      muxerP = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = MUXER_URL;
        s.crossOrigin = 'anonymous';
        s.onload = () => (window.Mp4Muxer ? res(window.Mp4Muxer) : rej(new Error('Mp4Muxer absent')));
        s.onerror = () => { muxerP = null; rej(new Error('script non chargé')); };
        document.head.appendChild(s);
      });
    }
    return muxerP;
  }

  async function pickCodec(w, h, fps) {
    if (!window.VideoEncoder || !window.VideoFrame) return null;
    for (const codec of CODECS) {
      const cfg = { codec, width: w, height: h, bitrate: w >= 1920 ? 10e6 : 5e6, framerate: fps, avc: { format: 'avc' } };
      try {
        const r = await VideoEncoder.isConfigSupported(cfg);
        if (r.supported) return r.config || cfg;
      } catch (e) { /* configuration refusée : candidat suivant */ }
    }
    return null;
  }

  /* ---------- Ressources du rendu SVG autonome ---------- */
  // Tout le CSS lisible de la page (les feuilles inaccessibles, comme Google Fonts, sont ignorées).
  function pageCss() {
    let out = '';
    let blocked = 0;
    for (const sh of document.styleSheets) {
      let rules;
      try { rules = sh.cssRules; } catch (e) { if (!/fonts\.googleapis/.test(sh.href || '')) blocked++; continue; }
      for (const r of rules) out += r.cssText + '\n';
    }
    return { css: out.replace(/]]>/g, ''), blocked };
  }

  const toDataUrl = (blob) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
  // fetch, puis XMLHttpRequest (fichier local ouvert avec l'accès aux fichiers autorisé).
  async function fetchBlob(url) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.blob();
    } catch (e) { /* repli XHR */ }
    return new Promise((res, rej) => {
      const x = new XMLHttpRequest();
      x.open('GET', url);
      x.responseType = 'blob';
      x.onload = () => (x.status === 200 || (x.status === 0 && x.response && x.response.size) ? res(x.response) : rej(new Error('HTTP ' + x.status)));
      x.onerror = () => rej(new Error('réseau'));
      x.send();
    });
  }

  const imgCache = new Map();
  function imageData(href) {
    const abs = new URL(href, document.baseURI).href;
    if (!imgCache.has(abs)) imgCache.set(abs, fetchBlob(abs).then(toDataUrl).catch(() => { imgCache.delete(abs); return null; }));
    return imgCache.get(abs);
  }

  // Polices Google (sous-ensemble latin) incorporées en data URI ; à défaut, polices de repli du système.
  let fontsP = null;
  function fontCss() {
    if (fontsP) return fontsP;
    const link = document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis.com"]');
    if (!link) return (fontsP = Promise.resolve(''));
    fontsP = (async () => {
      const css = await (await fetch(link.href)).text();
      const blocks = css.split('/* ').filter((b) => /^latin \*\//.test(b)).map((b) => b.slice(b.indexOf('@font-face')));
      const out = await Promise.all(blocks.map(async (b) => {
        const m = b.match(/url\(([^)]+)\)/);
        if (!m) return '';
        return b.replace(m[0], 'url(' + (await toDataUrl(await (await fetch(m[1])).blob())) + ')');
      }));
      return out.join('\n');
    })().catch(() => { fontsP = null; return ''; });
    return fontsP;
  }

  /* ---------- Rendu d'une image de la scène ---------- */
  const REF = /(?:href="#|url\((?:&quot;|["'])?#)([\w.:-]+)/g;
  function makeRenderer(sc, o, res) {
    const ser = new XMLSerializer();
    const W = o.w, H = o.h;
    const band = (o.caption ? 72 : 0) + (o.steps ? 56 : 0);
    let vbH = HV.H + 2 * PAD + (band ? band + 24 : 0);
    let vbW = (vbH * 16) / 9;
    if (vbW < HV.W + 2 * PAD) { vbW = HV.W + 2 * PAD; vbH = (vbW * 9) / 16; }
    const x0 = HV.W / 2 - vbW / 2, y0 = -PAD;
    const chain = HV.ancestors(sc);
    const open = chain.map((s) => `<g class="${esc(s.g.getAttribute('class').replace('can-zoom', ''))}">`).join('');
    const close = '</g>'.repeat(chain.length);
    const head = `<svg xmlns="${NS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}" data-theme="${o.theme}"><style><![CDATA[${res.fonts}\n${res.css}]]></style>`;
    const bg = `<rect class="world-bg" x="${x0 - 10}" y="${y0 - 10}" width="${vbW + 20}" height="${vbH + 20}"/>`;
    // Schéma seul : les loupes posées hors du cadre sont coupées.
    const clip = `<clipPath id="ve-clip"><rect x="${-PAD}" y="${-PAD}" width="${HV.W + 2 * PAD}" height="${HV.H + 2 * PAD}"/></clipPath>`;
    // Éléments référencés hors de la scène (glyphes #mol-…, dégradés, marqueurs) : clos par références successives.
    const mainDefs = document.querySelector('#stage > defs');
    const defsCache = new Map();
    function defsFor(str) {
      const want = new Set();
      const scan = (s) => { REF.lastIndex = 0; let m; while ((m = REF.exec(s))) want.add(m[1]); };
      scan(str);
      scan(res.css);
      const done = new Set();
      let out = '';
      for (const id of want) {
        if (done.has(id)) continue;
        done.add(id);
        let el = document.getElementById(id);
        if (!el || sc.g.contains(el)) continue;
        if (mainDefs && mainDefs.contains(el)) while (el.parentNode !== mainDefs) el = el.parentNode;
        if (!defsCache.has(el)) defsCache.set(el, ser.serializeToString(el));
        const txt = defsCache.get(el);
        if (out.includes(txt)) continue;
        out += txt;
        scan(txt);
      }
      return out ? `<defs>${out}</defs>` : '';
    }
    const IMG = /(<image\b[^>]*?\s(?:xlink:)?href=")([^"#][^"]*)"/g;
    return function svgAt(t, stepLabel) {
      let body = ser.serializeToString(sc.content) + ser.serializeToString(sc.childLayer);
      body = body.replace(IMG, (m, a, href) => a + (res.images.get(href) || '') + '"');
      let cap = '';
      if (band) {
        const by = HV.H + 24;
        cap = `<g class="ve-band"><rect class="ve-band-bg" x="${x0}" y="${by - 12}" width="${vbW}" height="${vbH - (by - 12 - y0)}"/>`;
        let y = by + 10;
        if (o.steps) { y += 34; cap += `<text class="ve-step" x="${HV.W / 2}" y="${y}" text-anchor="middle">${esc(stepLabel || '')}</text>`; y += 22; }
        if (o.caption) { y += 50; cap += `<text class="ve-cap" x="${HV.W / 2}" y="${y}" text-anchor="middle">${esc(o.caption)}</text>`; }
        cap += '</g>';
      }
      // Animations CSS figées à l'instant t (rendu déterministe).
      const anim = `<style>*{animation-delay:-${t.toFixed(3)}s !important;animation-play-state:paused !important;transition:none !important}</style>`;
      return head + anim + defsFor(body) + `<defs>${clip}</defs>` + bg + '<g clip-path="url(#ve-clip)">' + open + body + close + '</g>' + cap + '</svg>';
    };
  }

  async function drawSvg(ctx, str, w, h) {
    const url = URL.createObjectURL(new Blob([str], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      ctx.drawImage(img, 0, 0, w, h);
    } finally { URL.revokeObjectURL(url); }
  }

  /* ---------- Sauvegarde et restauration de l'état de l'atlas ---------- */
  const provOf = (sc) => (sc.id === 'atlas' || HV.ancestors(sc).some((s) => s.id === 'thyro') ? HV.model : sc.sim || null);
  function snapshot() {
    const cur = HV.app.current;
    const sims = [...new Set([HV.model, ...HV.sceneList.map((s) => s.sim).filter(Boolean)])];
    return {
      cur,
      cam: { cx: HV.app.cam.cx, cy: HV.app.cam.cy, w: HV.app.cam.w },
      step: cur.stepIndex ? cur.stepIndex() : -1,
      sims: sims.map((P) => ({ P, active: P.active, p: Object.assign({}, P.p), s: Object.assign({}, P.s), T: P.T ? Object.assign({}, P.T) : null })),
      pace: $('paceRange').value,
      gain: $('paceGain').checked,
      random: Math.random
    };
  }
  function setPace(v, gain) {
    $('paceRange').value = v;
    $('paceRange').dispatchEvent(new Event('input'));
    $('paceGain').checked = gain;
    $('paceGain').dispatchEvent(new Event('change'));
  }
  function restore(S, sc) {
    Math.random = S.random;
    if (sc.stepTo && sc.stepIndex() >= 0) HV.app.stepShow(sc, -1);
    if (HV.app.current !== S.cur) HV.app.flyTo(S.cur, true);
    HV.app.setView(S.cam);
    S.sims.forEach((x) => {
      Object.keys(x.P.p).forEach((k) => delete x.P.p[k]);
      Object.assign(x.P.p, x.p);
      Object.assign(x.P.s, x.s);
      if (x.T && x.P.T) Object.assign(x.P.T, x.T);
      x.P.active = x.active;
    });
    HV.app.refreshPanel();
    setPace(S.pace, S.gain);
    if (S.step >= 0 && S.cur.stepTo) HV.app.stepShow(S.cur, S.step);
    HV.app.advance(0);
  }
  // Aléa reproductible pendant l'export (apparition et dispersion des particules).
  function seeded(a) {
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- Boîte de dialogue ---------- */
  const back = document.createElement('div');
  back.className = 've-back';
  back.hidden = true;
  back.innerHTML = `<div class="ve-dlg" role="dialog" aria-modal="true" aria-labelledby="veTitle">
    <button type="button" class="sheet-close" id="veX" aria-label="Fermer">×</button>
    <p class="sheet-eyebrow">Éditeur vidéo</p>
    <h2 id="veTitle">Exporter en vidéo</h2>
    <form class="ve-form" id="veForm">
      <label class="ve-wide">Module<select id="veScene"></select></label>
      <label class="ve-wide" id="veScWrap">Scénario clinique<select id="veScenario"></select></label>
      <label class="ve-check ve-wide" id="veSettleWrap"><input type="checkbox" id="veSettle" checked> Partir de l'état d'équilibre du scénario</label>
      <label>Durée (s)<input type="number" id="veDur" min="5" max="60" step="1" value="10"></label>
      <label>Images par seconde<select id="veFps"><option value="25">25</option><option value="30" selected>30</option></select></label>
      <label class="ve-wide">Cadrage<select id="veSize"><option value="1920x1080">Schéma seul · 16:9 · 1920 × 1080</option><option value="1280x720">Schéma seul · 16:9 · 1280 × 720</option></select></label>
      <fieldset class="ve-wide" id="veStepsWrap"><legend>Pas à pas</legend>
        <label class="ve-check"><input type="radio" name="veSteps" value="0" checked> Aucun</label>
        <label class="ve-check"><input type="radio" name="veSteps" value="1"> Toutes les étapes, <input type="number" id="veStepSec" min="2" max="20" step="1" value="4"> s par étape</label>
      </fieldset>
      <label class="ve-wide">Vitesse des hormones <output id="vePaceOut">1×</output><input type="range" id="vePace" min="0.25" max="3" step="0.05" value="1"></label>
      <label class="ve-check ve-wide"><input type="checkbox" id="veGain"> Accentuer : la vitesse suit fortement le taux sécrété</label>
      <label>Thème<select id="veTheme"><option value="dark">Sombre</option><option value="light">Clair</option></select></label>
      <label>Titre incrusté<input type="text" id="veCap" maxlength="90" placeholder="ex. Bloc en 21-hydroxylase"></label>
    </form>
    <div class="ve-prog" id="veProg" hidden><progress id="veBar" max="1" value="0"></progress><span id="veStat"></span></div>
    <p class="ve-msg" id="veMsg" aria-live="polite"></p>
    <div class="ve-actions">
      <button type="button" id="veSave" hidden>Télécharger à nouveau</button>
      <button type="button" id="veCancel">Fermer</button>
      <button type="button" id="veGo" class="ve-go">Exporter</button>
    </div>
  </div>`;
  document.body.appendChild(back);

  let busy = false, cancel = false, last = null;
  const pace = $('vePace');
  pace.addEventListener('input', () => { $('vePaceOut').textContent = fmt(parseFloat(pace.value), 2).replace(/,?0+$/, '') + '×'; });

  function fillScenes() {
    const sel = $('veScene');
    sel.textContent = '';
    const walk = (s) => {
      if (s.title) sel.appendChild(new Option(' '.repeat(s.depth) + s.title, s.id));
      s.children.forEach(walk);
    };
    HV.sceneList.filter((s) => !s.parent).forEach(walk);
  }
  function syncScene() {
    const sc = HV.scenes[$('veScene').value];
    const P = provOf(sc);
    const ok = !!(P && P.SCENARIOS && P.SCENARIOS.length);
    $('veScWrap').hidden = !ok;
    $('veSettleWrap').hidden = !ok || !P.settle;
    const ss = $('veScenario');
    ss.textContent = '';
    if (ok) P.SCENARIOS.forEach((x) => ss.appendChild(new Option(x.name, x.id, false, x.id === (P.active || P.SCENARIOS[0].id))));
    const st = !!(sc.steps && sc.stepTo);
    $('veStepsWrap').hidden = !st;
    if (!st) back.querySelector('input[name="veSteps"][value="0"]').checked = true;
    syncDur();
  }
  function stepsOn() {
    const sc = HV.scenes[$('veScene').value];
    return !!(sc.steps && sc.stepTo) && back.querySelector('input[name="veSteps"]:checked').value === '1';
  }
  function syncDur() {
    const d = $('veDur');
    d.disabled = stepsOn();
    if (stepsOn()) d.value = Math.min(60, Math.max(5, (HV.scenes[$('veScene').value].steps.length + 1) * (parseFloat($('veStepSec').value) || 4)));
  }
  $('veScene').addEventListener('change', syncScene);
  back.querySelectorAll('input[name="veSteps"]').forEach((r) => r.addEventListener('change', syncDur));
  $('veStepSec').addEventListener('input', () => { back.querySelector('input[name="veSteps"][value="1"]').checked = true; syncDur(); });

  function openDlg() {
    fillScenes();
    $('veScene').value = HV.app.current.title ? HV.app.current.id : 'atlas';
    syncScene();
    pace.value = HV.flowPace;
    pace.dispatchEvent(new Event('input'));
    $('veGain').checked = HV.flowGain === 1;
    const docTheme = document.documentElement.getAttribute('data-theme');
    $('veTheme').value = docTheme || (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    $('veMsg').textContent = '';
    $('veProg').hidden = true;
    $('veSave').hidden = !last;
    back.hidden = false;
    $('veScene').focus();
    loadMuxer().catch(() => {});
    fontCss();
  }
  function closeDlg() {
    if (busy) return;
    back.hidden = true;
    $('veOpen').focus();
  }
  $('veOpen').addEventListener('click', openDlg);
  $('veX').addEventListener('click', () => (busy ? (cancel = true) : closeDlg()));
  $('veCancel').addEventListener('click', () => (busy ? (cancel = true) : closeDlg()));
  back.addEventListener('pointerdown', (e) => { if (e.target === back) closeDlg(); });
  // Les raccourcis de l'atlas (Échap, flèches, espace) ne traversent pas la boîte de dialogue.
  back.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { busy ? (cancel = true) : closeDlg(); e.preventDefault(); }
    e.stopPropagation();
  });
  $('veGo').addEventListener('click', () => { if (!busy) exportVideo(); });
  $('veSave').addEventListener('click', () => { if (last) save(last); });

  function setBusy(b) {
    busy = b;
    $('veForm').querySelectorAll('input, select').forEach((x) => { x.disabled = b; });
    if (!b) syncDur();
    $('veGo').disabled = b;
    $('veCancel').textContent = b ? 'Annuler' : 'Fermer';
    $('veProg').hidden = false;
  }

  /* ---------- Téléchargement ---------- */
  async function save(file) {
    const msg = $('veMsg');
    let d = null;
    try { d = await (window.claude && window.claude.use ? window.claude.use('downloads') : null); } catch (e) { d = null; }
    if (d) {
      try {
        await d.save({ filename: file.name, data: file.blob });
        msg.textContent = file.note + ' Fichier enregistré.';
        return;
      } catch (e) {
        if (e && e.code === 'declined') { msg.textContent = file.note + ' Enregistrement refusé : « Télécharger à nouveau » pour réessayer.'; return; }
        if (e && e.code === 'rate_limited') { msg.textContent = 'Une demande d\'enregistrement est déjà ouverte ; réessayez dans un instant.'; return; }
        if (e && e.code === 'too_large') { msg.textContent = 'Fichier trop volumineux pour cette vue : choisissez 1280 × 720 ou une durée plus courte.'; return; }
      }
    }
    const url = URL.createObjectURL(file.blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: file.name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    msg.textContent = file.note + ' Téléchargement lancé.';
  }

  /* ---------- Export ---------- */
  async function exportVideo() {
    const sc = HV.scenes[$('veScene').value];
    const [w, h] = $('veSize').value.split('x').map(Number);
    const fps = parseInt($('veFps').value, 10);
    const steps = stepsOn();
    const stepSec = Math.max(2, parseFloat($('veStepSec').value) || 4);
    const dur = Math.min(60, Math.max(5, parseFloat($('veDur').value) || 10));
    const P = provOf(sc);
    const scenario = !$('veScWrap').hidden ? $('veScenario').value : null;
    const o = { w, h, theme: $('veTheme').value, caption: $('veCap').value.trim(), steps };
    const n = Math.round(dur * fps);
    const msg = $('veMsg'), bar = $('veBar'), stat = $('veStat');
    msg.textContent = '';
    cancel = false;
    setBusy(true);
    stat.textContent = 'Préparation…';
    bar.value = 0;
    const S = snapshot();
    HV.app.pause();
    let enc = null;
    try {
      // Choix de l'encodeur : H.264 + MP4, sinon MediaRecorder WebM.
      const cfg = await pickCodec(w, h, fps);
      let Mux = null;
      if (cfg) Mux = await loadMuxer().catch(() => null);
      const webm = !(cfg && Mux);
      if (webm && !window.MediaRecorder) throw new Error('Ni WebCodecs ni MediaRecorder dans ce navigateur : export impossible.');

      // Scène, scénario, vitesse des hormones
      Math.random = seeded(1729);
      HV.app.flyTo(sc, true);
      if (scenario && P) {
        const r = document.getElementById(`sc-${P.id}-${scenario}`);
        if (r && HV.app.provider === P) { r.checked = true; r.dispatchEvent(new Event('change')); }
        else { P.active = scenario; P.setScenario(scenario); }
        if ($('veSettle').checked && P.settle) P.settle();
      }
      setPace(pace.value, $('veGain').checked);
      if (sc.stepTo && sc.stepIndex() >= 0) HV.app.stepShow(sc, -1);

      // Ressources : CSS, polices, figures
      const { css, blocked } = pageCss();
      if (blocked) throw new Error('Feuilles de style illisibles (page ouverte en fichier local) : ouvrez l\'atlas par un serveur (python3 -m http.server) ou la page publiée.');
      const fonts = await fontCss();
      const images = new Map();
      let missing = 0;
      for (const im of sc.g.querySelectorAll('image')) {
        const href = im.getAttribute('href') || im.getAttribute('xlink:href');
        if (!href || href.startsWith('data:') || images.has(href)) continue;
        const data = await imageData(href);
        if (data) images.set(href, data); else missing++;
      }
      const svgAt = makeRenderer(sc, o, { css, fonts, images });

      // Mise en route : une seconde de simulation pour remplir les flux.
      for (let k = 0; k < fps; k++) HV.app.advance(1 / fps);

      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d', { alpha: false });

      let muxer = null, target = null, rec = null, track = null;
      const chunks = [];
      let encErr = null;
      if (!webm) {
        target = new Mux.ArrayBufferTarget();
        muxer = new Mux.Muxer({ target, video: { codec: 'avc', width: w, height: h, frameRate: fps }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
        enc = new VideoEncoder({ output: (c, meta) => muxer.addVideoChunk(c, meta), error: (e) => { encErr = e; } });
        enc.configure(cfg);
      } else {
        const stream = cv.captureStream(0);
        track = stream.getVideoTracks()[0];
        const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
        rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: w >= 1920 ? 10e6 : 5e6 });
        rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      }

      const t0 = performance.now();
      let curStep = -2;
      for (let i = 0; i < n; i++) {
        if (cancel) break;
        if (encErr) throw encErr;
        const t = i / fps;
        if (i) HV.app.advance(1 / fps);
        let label = '';
        if (steps) {
          const k = Math.floor(t / stepSec);
          const si = k < sc.steps.length ? k : -1;
          if (si !== curStep) { curStep = si; HV.app.stepShow(sc, si); HV.app.advance(0); }
          label = si >= 0 ? `Étape ${si + 1} / ${sc.steps.length} · ${sc.steps[si].t}` : 'Vue d\'ensemble';
        }
        await drawSvg(ctx, svgAt(t, label), w, h);
        if (!webm) {
          const fr = new VideoFrame(cv, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
          enc.encode(fr, { keyFrame: i % (fps * 2) === 0 });
          fr.close();
          while (enc.encodeQueueSize > 6) await sleep(4);
        } else {
          // Enregistreur en pause pendant le dessin : chaque image dure exactement 1/fps à l'écran.
          if (i === 0) { rec.start(); } else rec.resume();
          track.requestFrame();
          await sleep(1000 / fps);
          rec.pause();
        }
        bar.value = (i + 1) / n;
        const el = (performance.now() - t0) / 1000;
        stat.textContent = `Image ${i + 1} / ${n} · encore ${Math.max(0, Math.round((el / (i + 1)) * (n - i - 1)))} s`;
      }
      if (cancel) {
        msg.textContent = 'Export annulé.';
        if (rec && rec.state !== 'inactive') rec.stop();
        return;
      }
      stat.textContent = 'Finalisation…';
      let blob, note;
      const base = `atlas-${sc.id}${scenario ? '-' + scenario : ''}`;
      if (!webm) {
        await enc.flush();
        if (encErr) throw encErr;
        muxer.finalize();
        blob = new Blob([target.buffer], { type: 'video/mp4' });
        note = `MP4 H.264 prêt : ${w} × ${h}, ${fmt(n / fps, 1)} s, ${fmt(blob.size / 1048576, 1)} Mo.`;
        last = { blob, name: base + '.mp4', note };
      } else {
        await new Promise((r) => { rec.onstop = r; rec.resume(); rec.stop(); });
        blob = new Blob(chunks, { type: 'video/webm' });
        note = 'MP4 indisponible dans ce navigateur ; WebM produit, à convertir (par exemple avec HandBrake) avant PowerPoint.';
        last = { blob, name: base + '.webm', note };
      }
      if (missing) last.note += ` ${missing} figure(s) non incorporée(s) : page ouverte en fichier local.`;
      if (!fonts) last.note += ' Polices de la page indisponibles : polices de repli du système.';
      stat.textContent = 'Terminé';
      $('veSave').hidden = false;
      await save(last);
    } catch (e) {
      msg.textContent = 'Échec de l\'export : ' + (e && e.message ? e.message : e);
    } finally {
      if (enc && enc.state !== 'closed') try { enc.close(); } catch (e) { /* déjà fermé */ }
      restore(S, sc);
      HV.app.resume();
      setBusy(false);
    }
  }
})();
