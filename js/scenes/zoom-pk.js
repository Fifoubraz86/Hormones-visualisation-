/* Notion transversale : pharmacocinétique (absorption, distribution, élimination, prises répétées).
   Calculs : js/pk.js (socle). Principes de pharmacocinétique : complément. Paramètres :
   lévothyroxine, demi-vie ≈ 7 jours (complément, comme la loupe « Transport plasmatique ») ;
   hydrocortisone à libération immédiate, demi-vie ≈ 1,5 h, d'où 2 à 3 prises par jour (complément :
   Expert Opin Drug Metab Toxicol 2008;4:749) ; médicament à demi-vie de 2 jours : exemple illustratif. */
(function () {
  'use strict';
  const HV = window.HV;
  const PK = HV.pk;
  const clamp = HV.clamp;
  const fr = (v, d) => v.toFixed(d).replace('.', ',');
  const dur = (h) => (h >= 48 ? fr(h / 24, h / 24 < 10 ? 1 : 0) + ' j' : fr(h, h < 10 ? 1 : 0) + ' h');

  Object.assign(HV.INFO, {
    'zpk-gut': { t: 'Absorption', k: 'Tube digestif → plasma (complément)', d: 'Après une prise orale, le médicament passe progressivement dans le sang (constante d\'absorption ka) : la concentration monte jusqu\'à un pic, puis redescend. La biodisponibilité est la fraction de la dose qui atteint la circulation.' },
    'zpk-plasma': { t: 'Compartiment central', k: 'Plasma et tissus en équilibre rapide (complément)', d: 'Le volume de distribution relie la quantité de médicament dans l\'organisme à sa concentration plasmatique. Certains médicaments diffusent aussi dans un compartiment périphérique, plus lent (modèle à deux compartiments, disponible dans js/pk.js).' },
    'zpk-elim': { t: 'Élimination', k: 'Métabolisme hépatique, excrétion rénale (complément)', d: 'Le plus souvent d\'ordre 1 : une fraction constante est éliminée par unité de temps. La demi-vie (t½ = 0,693 / ke) est le temps pour que la concentration diminue de moitié.' },
    'zpk-ss': { t: 'État d\'équilibre', k: '4 à 5 demi-vies (complément)', d: 'Avec des prises répétées à dose fixe, le médicament s\'accumule jusqu\'à ce que l\'élimination compense les apports : 90 % de l\'équilibre en 3,3 demi-vies, 97 % en 5 demi-vies, quelle que soit la dose.' },
    'zpk-load': { t: 'Dose de charge', k: 'Atteindre l\'équilibre d\'emblée (complément)', d: 'Une première dose plus forte (dose d\'entretien × facteur d\'accumulation) place d\'emblée la concentration au niveau de l\'équilibre, au lieu d\'attendre 4 à 5 demi-vies.' },
    'zpk-chart': { t: 'Concentration plasmatique', k: 'Rapportée à la moyenne à l\'équilibre', d: '1 = concentration moyenne une fois l\'équilibre atteint. Les traits verticaux marquent 90 % et 97 % de l\'équilibre ; les triangles, les prises.' }
  });

  const PRESETS = {
    levo: { name: 'Lévothyroxine, 1 prise par jour', t12: 168, ka: 0.5, schedule: [[0, 1]], horizon: 24 * 70, note: 'Demi-vie ≈ 7 jours (complément) : l\'équilibre demande environ 5 semaines ; d\'où le contrôle de la TSH 6 à 8 semaines après un changement de dose.' },
    hc3: { name: 'Hydrocortisone, 3 prises par jour', t12: 1.5, ka: 2.5, schedule: [[7, 2], [12, 1], [17, 1]], horizon: 48, note: 'Demi-vie ≈ 1,5 h (complément) : pics élevés et creux bas entre les prises, d\'où 2 à 3 prises par jour ; la dose du matin, plus forte, imite le pic matinal du cortisol (doses relatives illustratives).' },
    hc1: { name: 'Hydrocortisone, 1 prise par jour', t12: 1.5, ka: 2.5, schedule: [[7, 4]], horizon: 48, note: 'Une seule prise : le cortisol plasmatique est presque nul la majeure partie de la journée (illustration).' },
    gen: { name: 'Demi-vie de 2 jours, 1 prise par jour', t12: 48, ka: 2, schedule: [[0, 1]], horizon: 24 * 14, note: 'Exemple illustratif : accumulation pendant 4 à 5 demi-vies (8 à 10 jours) ; cochez la dose de charge pour l\'atteindre d\'emblée.' }
  };

  const def = HV.scene(Object.assign({
    id: 'pk', parent: 'atlas', loupe: 'Pharmacocinétique',
    title: 'Pharmacocinétique', level: 'Notion',
    lead: 'Ce que devient un médicament : absorption, distribution, élimination. Avec des prises répétées, il s\'accumule jusqu\'à l\'état d\'équilibre, atteint en 4 à 5 demi-vies quelle que soit la dose. La demi-vie explique le rythme des prises et le délai des contrôles. (Principes : complément.)',
    points: [
      'Demi-vie t½ = 0,693 / ke : temps pour que la concentration diminue de moitié (complément).',
      'Équilibre : 90 % en 3,3 demi-vies, 97 % en 5 demi-vies (complément).',
      'Lévothyroxine : demi-vie ≈ 7 jours, équilibre en ≈ 5 semaines ; TSH 6 à 8 semaines après un changement de dose (complément).',
      'Hydrocortisone : demi-vie ≈ 1,5 h, d\'où 2 à 3 prises par jour, pics et creux (complément).',
      'Dose de charge : atteindre l\'équilibre d\'emblée (complément).',
      'Calculs du socle (js/pk.js), réutilisables par chaque module et par le simulateur.'
    ],
    source: 'Principes de pharmacocinétique (complément). Hydrocortisone : Expert Opin Drug Metab Toxicol 2008;4:749.',
    build(g, a) {
      a.frame('Pharmacocinétique', 'Absorption, distribution, élimination · prises répétées et état d\'équilibre (complément)');
      /* ---- Compartiments ---- */
      const gutG = a.el('g', { 'data-info': 'zpk-gut', transform: 'translate(160 360) scale(1.15)' });
      HV.organs.intestine(gutG);
      a.text(160, 270, 'Tube digestif', 'lbl-s strong', { anchor: 'middle', attrs: { 'data-info': 'zpk-gut' } });
      const gutT = a.text(160, 450, '', 'note', { anchor: 'middle' });
      const pl = a.el('g', { 'data-info': 'zpk-plasma' });
      const plRect = a.el('rect', { x: 300, y: 250, width: 220, height: 200, rx: 30, class: 'zpk-plasma' }, pl);
      const plFill = a.el('rect', { x: 300, y: 250, width: 220, height: 200, rx: 30, class: 'zpk-plasma-fill' }, pl);
      HV.organs.vessel(a.el('g', { transform: 'translate(410 320) scale(1.4)' }, pl));
      a.text(410, 236, 'Plasma (compartiment central)', 'lbl-s strong', { anchor: 'middle' }, pl);
      const plT = a.text(410, 410, '', 'note strong', { anchor: 'middle' }, pl);
      const liv = a.el('g', { 'data-info': 'zpk-elim', transform: 'translate(630 270) scale(0.85)' });
      HV.organs.liver(liv);
      a.text(630, 336, 'Foie : métabolisme', 'note', { anchor: 'middle', attrs: { 'data-info': 'zpk-elim' } });
      const kid = a.el('g', { 'data-info': 'zpk-elim', transform: 'translate(630 430) scale(0.62)' });
      HV.organs.kidney(kid);
      a.text(630, 500, 'Rein : excrétion', 'note', { anchor: 'middle', attrs: { 'data-info': 'zpk-elim' } });
      const st = { k: 'levo', loading: false, t: 0, R: null, mode: 'run' };
      const absRate = () => (st.R ? st.R.gut(st.t) * st.ka : 0), elRate = () => (st.R ? st.R.C(st.t) * st.ke : 0);
      a.flow('M 220,360 C 250,360 270,350 300,350', { mol: 'dot', style: 'fill: var(--p-amber)', rate: () => clamp(6 * absRate() / Math.max(1e-6, st.norm), 0, 8), size: 1.6, speed: 60, max: 14, info: 'zpk-gut' });
      a.flow('M 520,320 C 560,300 580,285 600,280', { mol: 'dot', style: 'fill: var(--p-amber)', rate: () => clamp(3 * elRate() / Math.max(1e-6, st.norm), 0, 6), size: 1.6, speed: 60, max: 10, info: 'zpk-elim' });
      a.flow('M 520,390 C 560,410 585,425 605,430', { mol: 'dot', style: 'fill: var(--p-amber)', rate: () => clamp(3 * elRate() / Math.max(1e-6, st.norm), 0, 6), size: 1.6, speed: 60, max: 10, info: 'zpk-elim' });
      a.text(260, 336, 'ka', 'note strong', { anchor: 'middle' });
      a.text(572, 360, 'ke', 'note strong', { anchor: 'middle' });

      /* ---- Choix et chiffres ---- */
      a.el('rect', { x: 60, y: 540, width: 650, height: 400, rx: 22, class: 'side-box' });
      const btns = Object.keys(PRESETS).map((k, i) => {
        const b = a.el('g', { class: 'zpk-btn', transform: `translate(${80 + (i % 2) * 312} ${560 + Math.floor(i / 2) * 54})` });
        a.el('rect', { width: 300, height: 44, rx: 22 }, b);
        a.text(150, 28, PRESETS[k].name, 'zpk-btn-t', { anchor: 'middle' }, b);
        b.addEventListener('pointerdown', (e) => { e.stopPropagation(); setPreset(k, st.loading); });
        return [k, b];
      });
      const loadB = a.el('g', { class: 'zpk-btn zpk-load', transform: 'translate(80 672)', 'data-info': 'zpk-load' });
      a.el('rect', { width: 300, height: 44, rx: 22 }, loadB);
      a.text(150, 28, 'Dose de charge', 'zpk-btn-t', { anchor: 'middle' }, loadB);
      loadB.addEventListener('pointerdown', (e) => { e.stopPropagation(); setPreset(st.k, !st.loading); });
      const facts = a.text(80, 746, '', 'note', { lh: 1.35 });
      const noteT = a.text(80, 836, '', 'note strong', { lh: 1.3 });

      /* ---- Courbe ---- */
      const GX = 800, GY = 230, GW = 720, GH = 560;
      a.el('rect', { x: 760, y: 170, width: 790, height: 770, rx: 22, class: 'side-box', 'data-info': 'zpk-chart' });
      a.text(780, 208, 'Concentration plasmatique', 'lbl-h', { attrs: { 'data-info': 'zpk-chart' } });
      const axes = a.path(`M ${GX},${GY} L ${GX},${GY + GH} L ${GX + GW},${GY + GH}`, 'zpk-axis');
      const yLab = a.text(GX - 10, GY + 6, '', 'note', { anchor: 'end' });
      const avgL = a.path('', 'zpk-avg', null, { 'data-info': 'zpk-ss' });
      const avgT = a.text(GX + 10, 0, 'moyenne à l\'équilibre', 'note strong', { attrs: { 'data-info': 'zpk-ss', class: 'note strong zpk-avg-t' } });
      const ss90 = a.path('', 'zpk-ss', null, { 'data-info': 'zpk-ss' }), ss97 = a.path('', 'zpk-ss', null, { 'data-info': 'zpk-ss' });
      const ss90T = a.text(0, GY + 18, '90 %', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zpk-ss' } });
      const ss97T = a.text(0, GY + 18, '97 %', 'note strong', { anchor: 'middle', attrs: { 'data-info': 'zpk-ss' } });
      const curve = a.path('', 'zpk-curve', null, { 'data-info': 'zpk-chart' });
      const ticks = a.el('g', { class: 'zpk-ticks' });
      const xLab = a.text(GX + GW, GY + GH + 34, '', 'note', { anchor: 'end' });
      const head = a.path('', 'zpk-head');
      const dot = a.el('circle', { r: 9, class: 'zpk-dot' });
      let X = () => 0, Y = () => 0, yMax = 2;

      function setPreset(k, loading) {
        const P = PRESETS[k];
        st.k = k; st.loading = !!loading; st.t = 0;
        st.ke = PK.ke(P.t12); st.ka = P.ka;
        const tau = P.schedule.length === 1 ? 24 : 24 / P.schedule.length;
        const R = PK.accumulation(st.ke, tau);
        const load = st.loading ? P.schedule[0][1] * (R - 1) : 0;
        const rg = PK.regimen({ schedule: P.schedule, period: 24, ka: P.ka, ke: st.ke, loading: load, horizon: P.horizon });
        rg.gut = (t) => rg.doses.reduce((s, [td, d]) => (td <= t ? s + d * Math.exp(-P.ka * (t - td)) : s), 0);
        st.R = rg; st.norm = rg.cavg; st.H = P.horizon;
        // Échelle
        const N = 500, pts = [];
        let mx = 0;
        for (let i = 0; i <= N; i++) { const t = (P.horizon * i) / N, c = rg.C(t) / rg.cavg; pts.push([t, c]); mx = Math.max(mx, c); }
        yMax = Math.max(1.4, Math.ceil(mx * 1.15 * 2) / 2);
        X = (t) => GX + (t / P.horizon) * GW; Y = (c) => GY + GH - (c / yMax) * GH;
        curve.setAttribute('d', 'M ' + pts.map((p) => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' L '));
        avgL.setAttribute('d', `M ${GX},${Y(1).toFixed(1)} L ${GX + GW},${Y(1).toFixed(1)}`);
        avgT.setAttribute('y', (Y(1) + 24).toFixed(1));
        yLab.textContent = fr(yMax, 1);
        const t90 = PK.timeToSS(P.t12, 0.9), t97 = PK.timeToSS(P.t12, 0.97);
        [[ss90, ss90T, t90], [ss97, ss97T, t97]].forEach(([l, tx, t]) => {
          const on = t < P.horizon * 0.98 && !st.loading && (t97 - t90) / P.horizon * GW > 46; // inutile si l'équilibre est quasi immédiat
          l.setAttribute('d', on ? `M ${X(t).toFixed(1)},${GY} L ${X(t).toFixed(1)},${GY + GH}` : '');
          tx.setAttribute('x', X(t).toFixed(1)); tx.setAttribute('visibility', on ? 'visible' : 'hidden');
        });
        ticks.textContent = '';
        rg.doses.forEach(([t]) => a.path(`M ${X(t).toFixed(1)},${GY + GH + 2} l -6,12 l 12,0 Z`, 'zpk-tick', ticks));
        xLab.textContent = 'temps → ' + dur(P.horizon);
        const ratio = Math.exp(st.ke * tau);
        facts.textContent = '';
        ['Demi-vie : ' + dur(P.t12) + ' · intervalle entre les prises : ' + dur(tau),
          'Facteur d\'accumulation : × ' + fr(R, R < 10 ? 2 : 1) + ' · pic / vallée à l\'équilibre : ≈ × ' + (ratio > 50 ? '> 50' : fr(ratio, ratio < 10 ? 2 : 0)),
          '90 % de l\'équilibre en ' + dur(t90) + ' · 97 % en ' + dur(t97) + (st.loading ? ' (dose de charge : d\'emblée)' : '')
        ].forEach((ln, i) => HV.el('tspan', { x: 80, dy: i ? '1.35em' : 0, text: ln }, facts));
        noteT.textContent = '';
        wrap(P.note, 70).forEach((ln, i) => HV.el('tspan', { x: 80, dy: i ? '1.3em' : 0, text: ln }, noteT));
        btns.forEach(([kk, b]) => b.classList.toggle('on', kk === k));
        loadB.classList.toggle('on', st.loading);
      }
      const wrap = (s, n) => { const out = []; let cur = ''; s.split(' ').forEach((w) => { if (cur && (cur + ' ' + w).length > n) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }); if (cur) out.push(cur); return out; };
      setPreset('levo', false);

      a.dyn((dt) => {
        if (!st.R) return;
        if (dt > 0) st.t = (st.t + (dt / 16) * st.H) % st.H; // la période affichée défile en 16 s
        const c = st.R.C(st.t) / st.norm, x = X(st.t), y = Y(c);
        head.setAttribute('d', `M ${x.toFixed(1)},${GY} L ${x.toFixed(1)},${GY + GH}`);
        dot.setAttribute('cx', x.toFixed(1)); dot.setAttribute('cy', y.toFixed(1));
        const f = clamp(c / yMax, 0, 1);
        plFill.setAttribute('opacity', (0.08 + 0.75 * f).toFixed(2));
        plT.textContent = 'concentration × ' + fr(c, 2);
        gutT.textContent = 'à absorber : ' + fr(st.R.gut(st.t) / st.R.doses[0][1], 2) + ' dose';
      });

      /* ---- Pas à pas ---- */
      const go = (k, l) => () => setPreset(k, l);
      def.stepEnd = () => setPreset('levo', false);
      HV.spotlight(def, a, [
        { t: 'Trois étapes', d: 'Un médicament pris par la bouche est absorbé par le tube digestif, se distribue dans le plasma et les tissus (compartiment central), puis il est éliminé par le foie (métabolisme) et le rein (excrétion). Les flèches ka et ke sont les constantes d\'absorption et d\'élimination (complément).', spot: [[70, 220, 640, 300]], go: go('hc1') },
        { t: 'Absorption : le pic', d: 'Démonstration : une prise d\'hydrocortisone le matin. La concentration monte tant que l\'absorption l\'emporte sur l\'élimination, atteint un pic (environ 1 h après la prise ici), puis redescend (complément).', spot: [[760, 170, 790, 680]], go: go('hc1') },
        { t: 'Élimination : la demi-vie', d: 'Ensuite, la concentration diminue de moitié à chaque demi-vie (≈ 1,5 h pour l\'hydrocortisone, complément) : au bout de 5 demi-vies, il reste environ 3 %. Avec une seule prise, le cortisol est presque nul l\'après-midi et la nuit.', spot: [[760, 170, 790, 680], [80, 735, 610, 90]], go: go('hc1') },
        { t: 'Des prises répétées : l\'accumulation', d: 'Démonstration : demi-vie de 2 jours, une prise par jour (exemple illustratif). Chaque prise arrive avant que la précédente soit éliminée : la concentration monte par paliers, puis se stabilise quand l\'élimination compense les apports (complément).', spot: [[760, 170, 790, 680]], go: go('gen') },
        { t: 'L\'équilibre en 4 à 5 demi-vies', d: 'Démonstration : lévothyroxine, demi-vie ≈ 7 jours. L\'équilibre est atteint à 90 % en 3,3 demi-vies (≈ 23 jours) et à 97 % en 5 (≈ 5 semaines), quelle que soit la dose : c\'est pourquoi on contrôle la TSH 6 à 8 semaines après un changement de dose (complément).', spot: [[760, 170, 790, 680], [80, 735, 610, 90]], go: go('levo') },
        { t: 'Demi-vie courte : fractionner', d: 'Démonstration : hydrocortisone en 3 prises. Quand l\'intervalle entre les prises dépasse largement la demi-vie, la concentration oscille fortement entre pic et vallée : on fractionne les prises (2 à 3 par jour pour l\'hydrocortisone, complément). Comparez avec la prise unique (bouton).', spot: [[760, 170, 790, 680], [70, 550, 640, 110]], go: go('hc3') },
        { t: 'La dose de charge', d: 'Démonstration : la première dose est plus forte (dose d\'entretien × facteur d\'accumulation) : l\'équilibre est atteint d\'emblée au lieu de 4 à 5 demi-vies. Utile quand il faut agir vite avec un médicament à demi-vie longue (complément).', spot: [[760, 170, 790, 680], [70, 662, 320, 64]], go: go('gen', true) },
        { t: 'En résumé', d: 'Demi-vie → rythme des prises (fractionner si elle est courte) et délai d\'équilibre (4 à 5 demi-vies, d\'où le délai des contrôles : TSH à 6 à 8 semaines sous lévothyroxine). Dose de charge pour aller plus vite. Ces calculs viennent du socle (js/pk.js) et servent à tous les modules.', spot: [[60, 150, 1490, 800]], go: go('levo') }
      ]);
    }
  }, { parent: 'atlas', x: 330 + 6 * 165, y: 1050, scale: 0.09 }));
})();
