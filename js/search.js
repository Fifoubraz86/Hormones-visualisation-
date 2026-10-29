/*
 * Recherche par mot-clé dans tout l'atlas (barre du haut) : scènes et loupes (titre, texte, libellés dessinés),
 * étapes des pas à pas, fiches des molécules et des organes, repères à survoler, figures du polycopié.
 * Insensible aux accents et à la casse ; tous les mots doivent figurer. Raccourcis : « / » ou Ctrl + K.
 */
(function () {
  'use strict';
  const HV = window.HV;
  const $ = (id) => document.getElementById(id);
  const input = $('searchInput'), list = $('searchList');
  if (!input || !list) return;

  /* Pliage : minuscules, sans accents, ligatures dépliées. `map` relie chaque caractère plié à l'original. */
  const LIG = { 'œ': 'oe', 'æ': 'ae', 'ß': 'ss', '’': "'", '‘': "'", ' ': ' ', ' ': ' ' };
  function foldMap(str) {
    let s = '';
    const map = [];
    for (let i = 0; i < str.length; i++) {
      const c = str[i].toLowerCase();
      const f = LIG[c] || c.normalize('NFD').replace(/[̀-ͯ]/g, '');
      for (let k = 0; k < f.length; k++) { s += f[k]; map.push(i); }
    }
    return { s, map };
  }
  const fold = (str) => foldMap(str || '').s;
  const clean = (str) => (str || '').replace(/\s+/g, ' ').trim();

  /* ---------- Index (construit au premier usage, une fois les scènes dessinées) ---------- */
  let INDEX = null;
  const sceneName = (sc) => (sc.id === 'atlas' ? 'Atlas' : sc.title.split(' · ')[0]);
  function build() {
    const out = [];
    const add = (e) => { e.ft = fold(e.title); e.fk = fold(e.kick); e.fx = fold(e.text); out.push(e); };
    const where = {};
    HV.sceneList.forEach((sc) => {
      if (!sc.content) return;
      sc.content.querySelectorAll('[data-info]').forEach((el) => {
        const k = el.getAttribute('data-info');
        (where[k] = where[k] || new Set()).add(sc);
      });
      const drawn = clean([...sc.content.querySelectorAll('text')].map((t) => t.textContent).join(' · '));
      add({ type: 'Scène', title: sc.title, kick: [sc.level, sc.lead].join(' '),
        text: [(sc.points || []).join(' '), sc.source, drawn].join(' '), sc, go: () => HV.app.flyTo(sc) });
      (sc.steps || []).forEach((st, k) => add({ type: 'Pas à pas', title: st.t, kick: sceneName(sc), text: st.d || '',
        sub: `${sceneName(sc)} · étape ${k + 1} / ${sc.steps.length}`,
        go: () => { if (HV.app.current !== sc) HV.app.flyTo(sc); HV.app.stepShow(sc, k); } }));
    });
    const inScenes = (k) => [...(where[k] || [])].sort((a, b) => a.depth - b.depth);
    const rowsText = (rows) => (rows || []).map((r) => r.join(' : ')).join(' · ');
    Object.keys(HV.MOL_SHEETS).forEach((k) => {
      const S = HV.MOL_SHEETS[k], I = HV.INFO[k] || {};
      if (k === 'tgi' && S === HV.MOL_SHEETS.tg) return;
      add({ type: 'Fiche molécule', title: I.t || k, kick: [S.cls, I.k].join(' '), text: [I.d, rowsText(S.rows)].join(' '),
        go: () => HV.openSheet({ type: 'mol', key: k }) });
    });
    Object.keys(HV.ORGAN_SHEETS).forEach((k) => {
      const S = HV.ORGAN_SHEETS[k];
      add({ type: 'Fiche organe', title: S.title, kick: S.cls || '', text: [rowsText(S.rows), (S.figs || []).map((f) => f.t).join(' ')].join(' '),
        go: () => HV.openSheet({ type: 'organ', key: k }) });
    });
    // Repères sans fiche détaillée : on vole vers la scène qui les montre et on les fait clignoter.
    // Un même nom posé dans plusieurs scènes (clés différentes) ne donne qu'un résultat.
    const seen = {};
    Object.keys(HV.INFO).forEach((k) => {
      if (HV.sheetFor(k)) return;
      const scs = inScenes(k);
      if (!scs.length) return;
      const I = HV.INFO[k], id = fold(I.t || k);
      if (seen[id]) {
        seen[id].keys.push(k);
        scs.forEach((sc) => seen[id].scs.includes(sc) || seen[id].scs.push(sc));
        seen[id].sub = 'dans ' + seen[id].scs.map(sceneName).join(', ');
        return;
      }
      const e = { type: 'Repère', title: I.t || k, kick: I.k || '', text: I.d || '', scs: scs.slice(), keys: [k] };
      e.sub = 'dans ' + scs.map(sceneName).join(', ');
      // Scène courante si le repère y figure, sinon la plus détaillée.
      e.go = () => {
        const sc = e.scs.includes(HV.app.current) ? HV.app.current : e.scs.slice().sort((a, b) => b.depth - a.depth)[0];
        HV.app.flyTo(sc);
        flash(sc, e.keys);
      };
      seen[id] = e;
      add(e);
    });
    (HV.POLY_FIGS || []).forEach((f) => add({ type: 'Figure du polycopié', title: `Figure ${f.n} · ${f.t}`, kick: '', text: '',
      sub: HV.polySource ? HV.polySource(f) : '', go: () => HV.openFigure([f], 0) }));
    return out;
  }
  function flash(sc, keys) {
    const els = sc.content.querySelectorAll(keys.map((k) => `[data-info="${CSS.escape(k)}"]`).join(','));
    els.forEach((e) => e.classList.add('search-hit'));
    setTimeout(() => els.forEach((e) => e.classList.remove('search-hit')), 3600);
  }

  /* ---------- Recherche ---------- */
  const RANK = { 'Scène': 3, 'Fiche organe': 2, 'Fiche molécule': 2, 'Pas à pas': 1, 'Repère': 1, 'Figure du polycopié': 0 };
  function search(q) {
    const terms = fold(q).split(/[\s,;·]+/).filter((t) => t.length > 1 || /\d/.test(t));
    if (!terms.length) return [];
    INDEX = INDEX || build();
    const res = [];
    INDEX.forEach((e) => {
      let score = RANK[e.type];
      for (const t of terms) {
        const re = new RegExp('(^|[^a-z0-9])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        if (re.test(e.ft)) score += 12;
        else if (re.test(e.fk)) score += 6;
        else if (re.test(e.fx)) score += 2;
        else if (e.ft.includes(t)) score += 3;
        else if (e.fk.includes(t) || e.fx.includes(t)) score += 0.5;
        else return;
      }
      if (e.ft === terms.join(' ')) score += 10;
      res.push({ e, score });
    });
    res.sort((a, b) => b.score - a.score || a.e.title.length - b.e.title.length);
    return res.slice(0, 40).map((r) => r.e);
  }

  /* Extrait autour du premier mot trouvé, mots surlignés (construit en DOM, sans HTML). */
  function snippet(parent, str, terms, max) {
    const { s, map } = foldMap(str);
    let at = -1;
    terms.forEach((t) => { const i = s.indexOf(t); if (i >= 0 && (at < 0 || i < at)) at = i; });
    let a = 0, b = str.length;
    if (str.length > max) {
      const o = at < 0 ? 0 : map[at];
      a = Math.max(0, o - Math.round(max * 0.3));
      b = Math.min(str.length, a + max);
      a = Math.max(0, b - max);
    }
    const marks = [];
    terms.forEach((t) => {
      let i = s.indexOf(t);
      while (i >= 0) { marks.push([map[i], map[i + t.length - 1] + 1]); i = s.indexOf(t, i + t.length); }
    });
    marks.sort((x, y) => x[0] - y[0]);
    let pos = a;
    if (a > 0) parent.appendChild(document.createTextNode('…'));
    marks.forEach(([x, y]) => {
      if (y <= pos || x >= b) return;
      x = Math.max(x, pos);
      if (x > pos) parent.appendChild(document.createTextNode(str.slice(pos, x)));
      parent.appendChild(Object.assign(document.createElement('mark'), { textContent: str.slice(x, Math.min(y, b)) }));
      pos = Math.min(y, b);
    });
    if (pos < b) parent.appendChild(document.createTextNode(str.slice(pos, b)));
    if (b < str.length) parent.appendChild(document.createTextNode('…'));
  }

  /* ---------- Liste déroulante ---------- */
  let shown = [], active = -1;
  function render() {
    const q = input.value;
    shown = search(q);
    const terms = fold(q).split(/[\s,;·]+/).filter(Boolean);
    list.textContent = '';
    active = -1;
    input.removeAttribute('aria-activedescendant');
    if (!q.trim()) return close();
    if (!shown.length) {
      list.appendChild(Object.assign(document.createElement('li'), { className: 'search-none', textContent: `Aucun résultat pour « ${q.trim()} »` }));
    }
    shown.forEach((e, i) => {
      const li = document.createElement('li');
      li.id = 'sr-' + i;
      li.setAttribute('role', 'option');
      li.className = 'search-item';
      const top = document.createElement('div');
      top.className = 'search-top';
      top.appendChild(Object.assign(document.createElement('span'), { className: 'search-type', textContent: e.type }));
      const t = document.createElement('span');
      t.className = 'search-title';
      snippet(t, e.title, terms, 90);
      top.appendChild(t);
      li.appendChild(top);
      if (e.sub) li.appendChild(Object.assign(document.createElement('div'), { className: 'search-sub', textContent: e.sub }));
      const ctx = clean([e.kick, e.text].join(' '));
      if (ctx && terms.some((x) => !e.ft.includes(x))) {
        const p = document.createElement('div');
        p.className = 'search-snip';
        snippet(p, ctx, terms, 150);
        li.appendChild(p);
      } else if (!e.sub && e.kick) {
        li.appendChild(Object.assign(document.createElement('div'), { className: 'search-sub', textContent: clean(e.kick).slice(0, 150) }));
      }
      li.addEventListener('pointerdown', (ev) => ev.preventDefault());
      li.addEventListener('click', () => choose(i));
      li.addEventListener('pointermove', () => setActive(i, false));
      list.appendChild(li);
    });
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }
  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  }
  function setActive(i, scroll) {
    const items = list.querySelectorAll('.search-item');
    if (!items.length) return;
    active = (i + items.length) % items.length;
    items.forEach((li, k) => li.setAttribute('aria-selected', k === active ? 'true' : 'false'));
    input.setAttribute('aria-activedescendant', 'sr-' + active);
    if (scroll) items[active].scrollIntoView({ block: 'nearest' });
  }
  function choose(i) {
    const e = shown[i];
    if (!e) return;
    close();
    input.blur();
    if (HV.sheetOpen() && !/^Fiche|^Figure/.test(e.type)) HV.closeSheet();
    e.go();
  }

  let timer = 0;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { timer = 0; render(); }, 90); });
  input.addEventListener('focus', () => { if (input.value.trim()) render(); });
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { if (list.hidden) render(); setActive(active + 1, true); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { setActive(active - 1, true); e.preventDefault(); }
    else if (e.key === 'Enter') { if (timer) { clearTimeout(timer); timer = 0; render(); } choose(active >= 0 ? active : 0); e.preventDefault(); }
    else if (e.key === 'Escape') { if (input.value) { input.value = ''; close(); } else input.blur(); e.preventDefault(); e.stopPropagation(); }
  });
  window.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { input.focus(); input.select(); e.preventDefault(); }
  });

  HV.search = (q) => search(q).map((e) => ({ type: e.type, title: e.title }));
})();
