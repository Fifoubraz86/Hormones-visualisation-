/*
 * Moteur de scènes : chaque scène est dessinée dans son propre repère (1600 × 1000)
 * puis imbriquée, à petite échelle, dans sa scène parente. La caméra se déplace dans
 * le repère du monde (celui de l'atlas), comme dans une présentation zoomable.
 */
(function () {
  'use strict';
  const HV = (window.HV = window.HV || {});
  const NS = 'http://www.w3.org/2000/svg';
  HV.W = 1600;
  HV.H = 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  HV.clamp = clamp;

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'text') e.textContent = v;
        else e.setAttribute(k, v);
      }
    }
    if (parent) parent.appendChild(e);
    return e;
  }

  function text(parent, x, y, content, cls, opts) {
    opts = opts || {};
    const lines = Array.isArray(content) ? content : [content];
    const attrs = Object.assign({ x, y, class: cls }, opts.attrs || {});
    if (opts.anchor) attrs['text-anchor'] = opts.anchor;
    const t = el('text', attrs, parent);
    if (lines.length === 1) t.textContent = lines[0];
    else lines.forEach((ln, i) => el('tspan', { x, dy: i ? (opts.lh || 1.25) + 'em' : 0, text: ln }, t));
    return t;
  }
  HV.el = el;
  HV.text = text;

  /* ---------- Flux de particules le long d'un chemin ---------- */
  function Flow(path, o, layer) {
    this.o = o;
    this.len = path.getTotalLength();
    const N = Math.max(16, Math.min(160, Math.round(this.len / 6)));
    this.pts = new Float32Array((N + 1) * 2);
    for (let i = 0; i <= N; i++) {
      const pt = path.getPointAtLength((i / N) * this.len);
      this.pts[i * 2] = pt.x;
      this.pts[i * 2 + 1] = pt.y;
    }
    this.N = N;
    this.mol = o.mol;
    this.rate = o.rate || (() => 1);
    this.dur = o.dur || Math.max(1.2, this.len / (o.speed || 140));
    this.size = o.size || 1;
    this.jit = o.jitter || 0;
    this.max = o.max || 36;
    this.acc = Math.random();
    this.layer = el('g', { class: 'flow' }, layer);
    this.ps = [];
    this.pool = [];
  }
  Flow.prototype.at = function (t) {
    const f = t * this.N;
    const i = Math.min(this.N - 1, Math.floor(f));
    const r = f - i;
    const P = this.pts;
    return [P[i * 2] + (P[i * 2 + 2] - P[i * 2]) * r, P[i * 2 + 1] + (P[i * 2 + 3] - P[i * 2 + 1]) * r];
  };
  Flow.prototype.spawn = function (t) {
    let e = this.pool.pop();
    if (!e) {
      e = el('use', { href: '#mol-' + this.mol, class: this.o.cls || null, style: this.o.style || null, 'data-info': this.o.info || this.mol }, this.layer);
    }
    e.style.display = '';
    this.ps.push({
      e,
      t: t || 0,
      v: 0.85 + Math.random() * 0.3,
      ox: (Math.random() * 2 - 1) * this.jit,
      oy: (Math.random() * 2 - 1) * this.jit,
      rot: this.o.spin === false ? 0 : (Math.random() * 2 - 1) * 25
    });
  };
  Flow.prototype.step = function (dt) {
    if (dt > 0) {
      this.acc += Math.max(0, this.rate()) * dt;
      while (this.acc >= 1) {
        this.acc -= 1;
        if (this.ps.length < this.max) this.spawn(0);
      }
    }
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      p.t += (dt / this.dur) * p.v;
      if (p.t >= 1) {
        p.e.style.display = 'none';
        this.pool.push(p.e);
        this.ps.splice(i, 1);
        continue;
      }
      const xy = this.at(p.t);
      const a = p.t < 0.07 ? p.t / 0.07 : p.t > 0.93 ? (1 - p.t) / 0.07 : 1;
      p.e.setAttribute('transform', `translate(${(xy[0] + p.ox).toFixed(1)} ${(xy[1] + p.oy).toFixed(1)}) rotate(${p.rot.toFixed(0)}) scale(${this.size})`);
      p.e.setAttribute('opacity', a.toFixed(2));
    }
  };
  Flow.prototype.prewarm = function () {
    const n = Math.min(this.max, Math.round(Math.max(0, this.rate()) * this.dur));
    for (let i = 0; i < n; i++) this.spawn(Math.random());
    this.step(0);
  };

  /* ---------- Registre des scènes ---------- */
  HV.scenes = {};
  HV.sceneList = [];
  HV.scene = function (def) {
    HV.scenes[def.id] = def;
    HV.sceneList.push(def);
    return def;
  };

  function makeApi(s) {
    const c = () => s.content;
    return {
      el: (tag, attrs, parent) => el(tag, attrs, parent || c()),
      text: (x, y, content, cls, opts, parent) => text(parent || c(), x, y, content, cls, opts),
      path: (d, cls, parent, extra) => el('path', Object.assign({ d, class: cls }, extra || {}), parent || c()),
      frame(title, sub) {
        el('rect', { x: 0, y: 0, width: HV.W, height: HV.H, rx: 30, class: 'frame' }, c());
        if (title) text(c(), 60, 88, title, 's-title');
        if (sub) text(c(), 62, 130, sub, 's-sub');
      },
      vessel(d, w, parent) {
        const g = el('g', { class: 'vessel-g' }, parent || c());
        el('path', { d, class: 'vessel-wall', 'stroke-width': w }, g);
        el('path', { d, class: 'vessel-lumen', 'stroke-width': Math.max(2, w - 7) }, g);
        return g;
      },
      flow(d, o) {
        o = o || {};
        const path = el('path', { d, class: o.track === false ? 'track-none' : o.trackClass || 'track' }, o.parent || c());
        const f = new Flow(path, o, o.layer || s.pLayer);
        s.flows.push(f);
        return f;
      },
      dyn(fn) {
        s.dyn.push(fn);
      },
      sign(x, y, kind, parent) {
        const g = el('g', { class: 'sign ' + kind, transform: `translate(${x} ${y})`, 'data-info': 'sign-' + kind }, parent || c());
        const halo = el('circle', { r: 22, class: 'sign-halo' }, g);
        el('circle', { r: 14, class: 'sign-core' }, g);
        el('path', { d: kind === 'inhib' ? 'M-7,0 H7' : 'M-7,0 H7 M0,-7 V7', class: 'sign-glyph' }, g);
        return {
          g,
          set(v) {
            const k = clamp(v, 0, 3);
            halo.setAttribute('r', (16 + 11 * k).toFixed(1));
            halo.setAttribute('opacity', (0.1 + 0.3 * Math.min(1, k)).toFixed(2));
          }
        };
      },
      step(x, y, n, parent) {
        const g = el('g', { class: 'step', transform: `translate(${x} ${y})` }, parent || c());
        el('circle', { r: 16 }, g);
        text(g, 0, 6, String(n), 'step-n', { anchor: 'middle' });
        return g;
      },
      childCaption(id, str) {
        const ch = HV.scenes[id];
        text(c(), ch.x + (HV.W * ch.scale) / 2, ch.y + HV.H * ch.scale + 30, str, 'loupe-cap', { anchor: 'middle', attrs: { 'data-zoom': id } });
      },
      info(elm, key) {
        elm.setAttribute('data-info', key);
        return elm;
      },
      organ(name, x, y, s, attrs) {
        const g = el('g', Object.assign({ transform: `translate(${x} ${y}) scale(${s || 1})`, 'data-info': name }, attrs || {}), c());
        HV.organs[name](g);
        return g;
      },
      zoomable(elm, id) {
        elm.setAttribute('data-zoom', id);
        elm.classList.add('zoomable');
        return elm;
      }
    };
  }

  HV.mount = function (root) {
    const sorted = [];
    const seen = {};
    const visit = (id) => {
      if (seen[id]) return;
      const sc = HV.scenes[id];
      if (sc.parent) visit(sc.parent);
      seen[id] = 1;
      sorted.push(sc);
    };
    HV.sceneList.forEach((sc) => visit(sc.id));
    sorted.forEach((sc) => {
      const p = sc.parent ? HV.scenes[sc.parent] : null;
      sc.x = sc.x || 0;
      sc.y = sc.y || 0;
      sc.scale = sc.scale || 1;
      sc.depth = p ? p.depth + 1 : 0;
      sc.world = p ? { ox: p.world.ox + p.world.s * sc.x, oy: p.world.oy + p.world.s * sc.y, s: p.world.s * sc.scale } : { ox: sc.x, oy: sc.y, s: sc.scale };
      sc.g = el('g', { class: `scene depth-${sc.depth}`, 'data-zoom': sc.id, transform: `translate(${sc.x} ${sc.y}) scale(${sc.scale})` }, p ? p.childLayer : root);
      sc.content = el('g', { class: 'content' }, sc.g);
      sc.pLayer = el('g', { class: 'particles' });
      sc.childLayer = el('g', { class: 'children' }, sc.g);
      sc.flows = [];
      sc.dyn = [];
      sc.children = [];
      if (p) p.children.push(sc);
    });
    sorted.forEach((sc) => {
      sc.build && sc.build(sc.content, makeApi(sc));
      sc.content.appendChild(sc.pLayer);
    });
    sorted.forEach((sc) => sc.flows.forEach((f) => f.prewarm()));
    return sorted;
  };

  HV.rectOf = function (sc) {
    return { x: sc.world.ox, y: sc.world.oy, w: HV.W * sc.world.s, h: HV.H * sc.world.s };
  };
  HV.ancestors = function (sc) {
    const out = [];
    let cur = sc;
    while (cur) {
      out.unshift(cur);
      cur = cur.parent ? HV.scenes[cur.parent] : null;
    }
    return out;
  };

  /* Interpolation de zoom « lisse » (van Wijk & Nuij) : dézoome puis rezoome. */
  HV.interpolateZoom = function (p0, p1) {
    const rho = Math.SQRT2, rho2 = 2, rho4 = 4;
    const ux0 = p0[0], uy0 = p0[1], w0 = p0[2], ux1 = p1[0], uy1 = p1[1], w1 = p1[2];
    const dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy;
    let i, S;
    if (d2 < 1e-12) {
      S = Math.log(w1 / w0) / rho;
      i = (t) => [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(rho * t * S)];
    } else {
      const d1 = Math.sqrt(d2);
      const b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1);
      const b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1);
      const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
      const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
      S = (r1 - r0) / rho;
      i = (t) => {
        const s = t * S;
        const c0 = Math.cosh(r0);
        const u = (w0 / (rho2 * d1)) * (c0 * Math.tanh(rho * s + r0) - Math.sinh(r0));
        return [ux0 + u * dx, uy0 + u * dy, (w0 * c0) / Math.cosh(rho * s + r0)];
      };
    }
    i.duration = Math.abs(S) * 1000;
    return i;
  };
})();
