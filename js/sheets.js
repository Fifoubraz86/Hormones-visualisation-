/* Fiche détaillée (molécule ou organe) affichée au clic, dans un panneau posé sur la scène. */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const NS = 'http://www.w3.org/2000/svg';
  let host = null;

  /* Retrouve la fiche correspondant à un élément cliqué ou survolé. */
  HV.resolveSheet = function (target) {
    if (!target || !target.closest) return null;
    const ds = target.closest('[data-sheet]');
    if (ds) return HV.sheetFor(ds.getAttribute('data-sheet'));
    const di = target.closest('[data-info]');
    return di ? HV.sheetFor(di.getAttribute('data-info')) : null;
  };
  HV.sheetFor = function (key) {
    if (!key) return null;
    if (HV.MOL_SHEETS[key]) return { type: 'mol', key };
    const o = HV.ORGAN_ALIAS[key] || key;
    if (HV.ORGAN_SHEETS[o]) return { type: 'organ', key: o };
    return null;
  };

  const h = (tag, cls, text, parent) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  };
  const rows = (parent, list) => {
    const dl = h('dl', 'sheet-rows', null, parent);
    list.forEach(([k, v]) => { h('dt', null, k, dl); h('dd', null, v, dl); });
  };
  const links = (parent, list) => {
    if (!list || !list.length) return;
    h('h3', null, 'Pour aller plus loin', parent);
    const ul = h('ul', 'sheet-links', null, parent);
    list.forEach((l) => {
      const li = h('li', null, null, ul);
      const a = h('a', null, l.label, li);
      a.href = l.url;
      a.target = '_blank';
      a.rel = 'noopener';
    });
  };

  function figure(parent, draw, viewBox) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('class', 'sheet-fig');
    svg.setAttribute('aria-hidden', 'true');
    parent.appendChild(svg);
    draw(svg);
    return svg;
  }

  function molSheet(body, key) {
    const S = HV.MOL_SHEETS[key], I = HV.INFO[key] || {};
    const top = h('div', 'sheet-top', null, body);
    figure(top, (svg) => {
      const u = document.createElementNS(NS, 'use');
      u.setAttribute('href', '#mol-' + key);
      svg.appendChild(u);
    }, '-17 -15 34 30');
    const t = h('div', null, null, top);
    h('p', 'sheet-eyebrow', 'Molécule · ' + S.cls, t);
    h('h2', null, I.t || key, t);
    if (I.k) h('p', 'sheet-sub', I.k, t);
    if (I.d) h('p', 'sheet-lead', I.d, body);
    h('h3', null, 'Propriétés biochimiques', body);
    rows(body, S.rows);
    if (I.live) h('p', 'sheet-live', I.live(), body);
    if (I.src) h('p', 'sheet-src', I.src, body);
    links(body, S.links);
  }

  function organSheet(body, key) {
    const S = HV.ORGAN_SHEETS[key];
    const top = h('div', 'sheet-top', null, body);
    figure(top, (svg) => {
      const g = document.createElementNS(NS, 'g');
      svg.appendChild(g);
      if (HV.organs[S.organ]) HV.organs[S.organ](g);
    }, '-60 -60 120 120');
    const t = h('div', null, null, top);
    h('p', 'sheet-eyebrow', 'Anatomie · ' + S.cls, t);
    h('h2', null, S.title, t);
    h('h3', null, 'Anatomie et physiologie', body);
    rows(body, S.rows);
    // Imagerie : seules de vraies images sont montrées (figures du polycopié ci-dessous). Les examens sans image
    // disponible sont listés comme « image manquante », pour qu'on puisse les fournir.
    const missing = (S.imaging || []).map((k) => HV.IMAGING[k]).filter(Boolean);
    if (missing.length) {
      h('h3', null, 'Imagerie', body);
      const ul = h('ul', 'sheet-missing', null, body);
      missing.forEach((P) => h('li', null, `${P.title} : ${P.variants.map((v) => v[1].toLowerCase()).join(', ')} — image manquante, à fournir`, ul));
    }
    if (S.figs && S.figs.length) {
      h('h3', null, 'Iconographie du polycopié CEEDMM', body);
      const imgs = [].concat(...S.figs.map((f) => HV.polyFigsRef(f.n)));
      if (imgs.length) HV.figThumbs(body, imgs);
      const ul = h('ul', 'sheet-figs', null, body);
      S.figs.filter((f) => !HV.polyFigsRef(f.n).length).forEach((f) => h('li', null, `Figure ${f.n} : ${f.t} (partie ${f.part}, page ${f.page} du PDF)`, ul));
    }
    links(body, S.links);
  }

  /* Vignettes d'iconographie : un clic ouvre la figure en grand, avec navigation dans la série. */
  HV.figThumbs = function (parent, list) {
    const wrap = h('div', 'fig-thumbs', null, parent);
    list.forEach((f, i) => {
      const b = h('button', 'fig-thumb', null, wrap);
      b.type = 'button';
      b.title = `Figure ${f.n} : ${f.t}`;
      const im = h('img', null, null, b);
      im.src = f.src;
      im.alt = `Figure ${f.n} du polycopié : ${f.t}`;
      im.loading = 'lazy';
      h('span', null, 'Fig. ' + f.n, b);
      b.addEventListener('click', () => HV.openFigure(list, i));
    });
    return wrap;
  };
  HV.openFigure = function (list, i) {
    if (!host) return;
    HV.hideTip && HV.hideTip();
    const f = list[i];
    const body = host.querySelector('.sheet-body');
    body.textContent = '';
    h('p', 'sheet-eyebrow', 'Iconographie du polycopié · figure ' + f.n, body);
    h('h2', null, f.t, body);
    const im = h('img', 'fig-big', null, body);
    im.src = f.src;
    im.alt = `Figure ${f.n} du polycopié : ${f.t}`;
    h('p', 'sheet-src', HV.polySource(f), body);
    if (list.length > 1) {
      const nav = h('div', 'fig-nav', null, body);
      const pv = h('button', null, '← Figure précédente', nav);
      h('span', null, `${i + 1} / ${list.length}`, nav);
      const nx = h('button', null, 'Figure suivante →', nav);
      pv.type = nx.type = 'button';
      pv.disabled = i === 0;
      nx.disabled = i === list.length - 1;
      pv.addEventListener('click', () => HV.openFigure(list, i - 1));
      nx.addEventListener('click', () => HV.openFigure(list, i + 1));
    }
    host.hidden = false;
    host.classList.add('wide');
    body.scrollTop = 0;
    host.querySelector('.sheet-close').focus({ preventScroll: true });
  };

  HV.openSheet = function (ref) {
    if (!ref || !host) return;
    HV.hideTip && HV.hideTip();
    const body = host.querySelector('.sheet-body');
    body.textContent = '';
    host.classList.remove('wide');
    if (ref.type === 'mol') molSheet(body, ref.key);
    else organSheet(body, ref.key);
    host.hidden = false;
    body.scrollTop = 0;
    host.querySelector('.sheet-close').focus({ preventScroll: true });
  };
  HV.closeSheet = function () {
    if (host) host.hidden = true;
  };
  HV.sheetOpen = () => host && !host.hidden;

  HV.initSheets = function (container) {
    host = h('aside', 'sheet', null, container);
    host.hidden = true;
    host.setAttribute('aria-label', 'Fiche détaillée');
    const close = h('button', 'sheet-close', '×', host);
    close.type = 'button';
    close.setAttribute('aria-label', 'Fermer la fiche');
    close.addEventListener('click', HV.closeSheet);
    h('div', 'sheet-body', null, host);
  };

  /* Liste des fiches disponibles dans une scène (pour le panneau). */
  HV.sheetsInScene = function (sc) {
    const organs = new Set(), mols = new Set();
    const scan = (root) => root.querySelectorAll('[data-sheet],[data-info]').forEach((e) => {
      const r = HV.sheetFor(e.getAttribute('data-sheet') || e.getAttribute('data-info'));
      if (r) (r.type === 'mol' ? mols : organs).add(r.key);
    });
    scan(sc.content);
    if (sc.legend) sc.legend.forEach((k) => HV.MOL_SHEETS[k] && mols.add(k));
    return { organs: [...organs], mols: [...mols] };
  };
})();
