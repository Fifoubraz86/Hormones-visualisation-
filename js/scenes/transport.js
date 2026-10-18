/* Niveau 2 : transport plasmatique des hormones thyroïdiennes (formes liées et libres). */
(function () {
  'use strict';
  const HV = window.HV;
  const S = HV.model.s;

  HV.scene({
    id: 'transp',
    parent: 'thyro',
    x: 1030,
    y: 150,
    scale: 0.15,
    title: 'Transport plasmatique',
    level: 'Circulation',
    lead: 'Plus de 99 % des hormones thyroïdiennes circulent liées à des protéines. Seule la fraction libre entre dans les cellules et agit : c\'est elle que l\'on dose (T4L, T3L).',
    points: [
      'Protéines de transport : TBG ≈ 70–75 %, transthyrétine (TBPA) ≈ 10–15 %, albumine ≈ 10–20 % (complément ; le polycopié simplifie en TBG 75 %, TBPA 25 %).',
      'Fraction libre : environ 0,03 % de la T4 et 0,3 % de la T3 (complément).',
      'Les œstrogènes et la grossesse augmentent la TBG : la T4 totale monte, la T4L reste normale (complément).',
      'Demi-vie : T4 ≈ 7 jours, T3 ≈ 1 jour (complément). On contrôle donc la TSH 6 à 8 semaines après un changement de dose de lévothyroxine.'
    ],
    build(g, a) {
      a.frame('Transport plasmatique', 'Formes liées (réservoir) et fraction libre (active)');

      // Répartition de la T4 liée
      const bar = a.el('g', { transform: 'translate(900 58)' });
      a.text(0, 0, 'T4 liée (valeurs physiologiques, complément)', 'note strong', null, bar);
      [['tbg', 'TBG ≈ 72 %', 0.72], ['ttr', 'TTR ≈ 13 %', 0.13], ['alb', 'Alb. ≈ 15 %', 0.15]].reduce((x, [k, l, f]) => {
        const w = 640 * f;
        a.el('rect', { x, y: 14, width: w - 4, height: 26, rx: 6, class: 'bar-' + k }, bar);
        a.text(x + 8, 66, l, 'note', null, bar);
        return x + w;
      }, 0);
      a.text(0, 112, 'Fraction libre : T4 ≈ 0,03 % · T3 ≈ 0,3 %', 'note', null, bar);

      // Lumière vasculaire et endothélium
      a.el('rect', { x: 60, y: 200, width: 1480, height: 500, rx: 40, class: 'plasma', 'data-info': 'plasma' });
      a.path('M 60,200 H 1540 M 60,700 H 1540', 'endo');
      a.text(80, 236, 'Plasma →', 'lbl-s');

      // Tissu et transporteurs
      a.el('rect', { x: 60, y: 800, width: 1480, height: 170, rx: 26, class: 'cell', 'data-info': 'tissue' });
      a.text(80, 940, 'Cellules des tissus', 'lbl-s');
      const tx = [420, 820, 1220];
      const names = ['MCT8', 'MCT10', 'OATP1C1'];
      tx.forEach((x, i) => {
        a.el('rect', { x: x - 15, y: 780, width: 30, height: 46, rx: 9, class: 'transporter', 'data-info': i === 0 ? 'mct8' : 'oatp' });
        a.text(x + 26, 858, names[i], 'note');
      });
      tx.forEach((x, i) => {
        a.flow(`M ${x - 40},640 C ${x - 30},720 ${x},740 ${x},800 L ${x},900`, { mol: 't4', rate: () => 0.55 * S.t4, size: 1.8, speed: 70, track: false, max: 8 });
        a.flow(`M ${x + 40},640 C ${x + 30},720 ${x},740 ${x},800 L ${x},900`, { mol: 't3', rate: () => 0.3 * S.t3, size: 1.8, speed: 70, track: false, max: 6 });
      });

      // Objets qui dérivent dans le plasma
      const layer = a.el('g', { class: 'drift' });
      const items = [];
      const add = (mol, size, speed, yMin, yMax, cargo) => {
        const gg = a.el('g', { 'data-info': mol }, layer);
        a.el('use', { href: '#mol-' + mol, transform: `scale(${size})` }, gg);
        let load = null;
        if (cargo) load = a.el('use', { href: '#mol-' + cargo, transform: `translate(${size * 4} ${-size * 4}) scale(1.4)` }, gg);
        const it = { g: gg, load, x: 80 + Math.random() * 1440, y: yMin + Math.random() * (yMax - yMin), v: speed * (0.8 + Math.random() * 0.4), ph: Math.random() * 6.28, yMin, yMax };
        items.push(it);
        return it;
      };
      for (let i = 0; i < 7; i++) add('rbc', 1.6, 60, 270, 640);
      const carriers = [];
      for (let i = 0; i < 12; i++) carriers.push(add('tbg', 2.3, 75, 260, 650, 't4'));
      for (let i = 0; i < 3; i++) carriers.push(add('ttr', 2.0, 80, 260, 650, 't4'));
      for (let i = 0; i < 3; i++) carriers.push(add('alb', 2.0, 85, 260, 650, 't4'));
      const free4 = [], free3 = [];
      for (let i = 0; i < 24; i++) free4.push(add('t4', 1.9, 120, 250, 660));
      for (let i = 0; i < 24; i++) free3.push(add('t3', 1.9, 120, 250, 660));

      const tick = (dt) => {
        // Nombre visible proportionnel au niveau hormonal
        const n4 = Math.round(HV.clamp(6 * S.t4, 0, 24));
        const n3 = Math.round(HV.clamp(4 * S.t3, 0, 24));
        const loaded = HV.clamp(S.t4 / 1.6, 0.15, 1);
        free4.forEach((it, i) => it.g.setAttribute('visibility', i < n4 ? 'visible' : 'hidden'));
        free3.forEach((it, i) => it.g.setAttribute('visibility', i < n3 ? 'visible' : 'hidden'));
        carriers.forEach((it, i) => it.load.setAttribute('visibility', i / carriers.length < loaded ? 'visible' : 'hidden'));
        for (const it of items) {
          it.x += it.v * dt;
          it.ph += dt * 1.3;
          if (it.x > 1520) {
            it.x = 80;
            it.y = it.yMin + Math.random() * (it.yMax - it.yMin);
          }
          it.g.setAttribute('transform', `translate(${it.x.toFixed(1)} ${(it.y + Math.sin(it.ph) * 10).toFixed(1)})`);
        }
      };
      tick(0);
      a.dyn(tick);
    }
  });
})();
