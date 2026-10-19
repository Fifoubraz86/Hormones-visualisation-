/*
 * Petits dessins d'humour noir pour les événements des modes thérapeutiques.
 * SVG dessinés à la main (viewBox 220 × 150), contours aux couleurs du thème, aplats pastel.
 * HV.simu.toon(nom, { titre, epitaphe }) renvoie un élément <figure>.
 */
(function () {
  'use strict';
  const S = window.HV.simu;
  const NS = 'http://www.w3.org/2000/svg';
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Bonhomme de base : tête, corps, bras, jambes. Position, humeur (yeux, bouche).
  function guy(x, y, o) {
    o = o || {};
    const skin = o.skin || '#f6d2b0';
    const eyes = o.eyes === 'x'
      ? `<path d="M${x - 9},${y - 4} l6,6 m0,-6 l-6,6 M${x + 3},${y - 4} l6,6 m0,-6 l-6,6" class="tn-l"/>`
      : o.eyes === 'spiral'
        ? `<path d="M${x - 6},${y - 1} a2,2 0 1 1 3,-2 a4,4 0 1 0 -6,3 M${x + 6},${y - 1} a2,2 0 1 1 3,-2 a4,4 0 1 0 -6,3" class="tn-l"/>`
        : o.eyes === 'closed'
          ? `<path d="M${x - 9},${y - 1} q3,3 6,0 M${x + 3},${y - 1} q3,3 6,0" class="tn-l"/>`
          : `<circle cx="${x - 6}" cy="${y - 1}" r="2" class="tn-k"/><circle cx="${x + 6}" cy="${y - 1}" r="2" class="tn-k"/>`;
    const mouth = { sad: `<path d="M${x - 6},${y + 10} q6,-6 12,0" class="tn-l"/>`, o: `<ellipse cx="${x}" cy="${y + 9}" rx="3" ry="4" class="tn-k"/>`, wavy: `<path d="M${x - 7},${y + 9} q2,-3 4,0 q2,3 4,0 q2,-3 4,0" class="tn-l"/>`, happy: `<path d="M${x - 7},${y + 7} q7,7 14,0" class="tn-l"/>`, flat: `<path d="M${x - 6},${y + 9} h12" class="tn-l"/>` }[o.mouth || 'flat'];
    return `<g><circle cx="${x}" cy="${y}" r="16" fill="${skin}" class="tn-o"/>${eyes}${mouth}</g>`;
  }
  const body = (x, y, col) => `<path d="M${x},${y + 16} v34 M${x},${y + 26} l-16,12 M${x},${y + 26} l16,12 M${x},${y + 50} l-12,22 M${x},${y + 50} l12,22" class="tn-l tn-w"/>`;

  const DRAW = {
    // Coma hypoglycémique : patient à terre, yeux en spirale, morceaux de sucre, gyrophare.
    hypoSevere: () => `
      <rect x="0" y="118" width="220" height="32" class="tn-ground"/>
      <g transform="rotate(-90 70 104)">${guy(70, 104, { eyes: 'spiral', mouth: 'o' })}</g>
      <path d="M86,104 h46 M96,104 l10,-12 M96,104 l10,12 M132,104 l20,-10 M132,104 l20,10" class="tn-l tn-w"/>
      <g class="tn-stars"><text x="40" y="70" class="tn-big">✦</text><text x="62" y="58" class="tn-big">✧</text><text x="84" y="72" class="tn-big">✦</text></g>
      <rect x="160" y="92" width="16" height="16" rx="2" fill="#ffffff" class="tn-o"/><rect x="180" y="100" width="16" height="16" rx="2" fill="#ffffff" class="tn-o"/>
      <text x="168" y="86" class="tn-small">sucre</text>
      <path d="M170,20 l14,0 l4,14 h-22 z" fill="#ff5a5a" class="tn-o tn-blink"/><text x="152" y="52" class="tn-small">SAMU, G30 %</text>`,
    // Malaise hypoglycémique : sueurs, tremblement, bonbon.
    hypo: () => `
      ${guy(80, 46, { mouth: 'wavy' })}${body(80, 46)}
      <path d="M58,30 q-4,8 0,12 q4,-4 0,-12 M104,26 q-4,8 0,12 q4,-4 0,-12 M100,58 q-3,6 0,9 q3,-3 0,-9" fill="#7fc8ff" class="tn-o"/>
      <path d="M58,80 l-6,-3 m0,6 l-6,-3 M102,80 l6,-3 m0,6 l6,-3" class="tn-l"/>
      <circle cx="150" cy="70" r="12" fill="#ff8fc8" class="tn-o"/><path d="M138,70 l-10,-6 v12 z M162,70 l10,-6 v12 z" fill="#ff8fc8" class="tn-o"/>
      <text x="126" y="104" class="tn-small">15 g de sucre</text>`,
    // Mort : cimetière, pierre tombale avec épitaphe.
    death: (o) => `
      <rect x="0" y="0" width="220" height="150" class="tn-night"/>
      <circle cx="186" cy="26" r="14" fill="#f4f0c8" class="tn-o"/><circle cx="192" cy="22" r="12" class="tn-nightfill"/>
      <rect x="0" y="122" width="220" height="28" fill="#5b7a4a"/>
      <path d="M46,124 v-66 a64,40 0 0 1 128,0 v66 z" fill="#b8bec8" class="tn-o"/>
      <text x="110" y="52" class="tn-rip">R.I.P.</text>
      ${(o.epitaphe || []).slice(0, 4).map((l, i) => `<text x="110" y="${68 + i * 12}" class="tn-epi">${esc(l)}</text>`).join('')}
      <path d="M30,124 v-20 m-7,6 h14 M196,124 v-16 m-6,5 h12" class="tn-l tn-cross"/>
      <path d="M48,124 q4,-10 8,0 M164,124 q4,-12 8,0" fill="none" stroke="#3e5a30" stroke-width="2"/>`,
    // Diarrhée sous metformine : toilettes, horloge.
    diarrhee: () => `
      <rect x="118" y="70" width="44" height="12" rx="4" fill="#ffffff" class="tn-o"/><path d="M122,82 h36 l-6,30 h-24 z" fill="#ffffff" class="tn-o"/><rect x="150" y="38" width="20" height="34" rx="3" fill="#ffffff" class="tn-o"/>
      ${guy(70, 40, { mouth: 'wavy', eyes: 'closed' })}${body(70, 40)}
      <path d="M86,72 q10,-4 14,4" class="tn-l"/>
      <circle cx="40" cy="104" r="14" fill="#fff6c8" class="tn-o"/><path d="M40,104 v-8 M40,104 l6,4" class="tn-l"/>
      <text x="110" y="136" class="tn-small" text-anchor="middle">metformine 3 g d'emblée</text>`,
    // Vomissements sous aGLP1 : seau.
    vomit: () => `
      ${guy(80, 46, { mouth: 'o', skin: '#cfe8b4' })}${body(80, 46)}
      <path d="M84,58 q20,10 40,40" stroke="#9ccc65" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M118,96 h36 l-4,26 h-28 z" fill="#c8d2dc" class="tn-o"/><path d="M118,96 q18,-14 36,0" class="tn-l"/>
      <text x="110" y="142" class="tn-small" text-anchor="middle">deux paliers d'un coup…</text>`,
    // Acidocétose : polypnée de Kussmaul, odeur de pomme.
    acd: () => `
      ${guy(70, 46, { mouth: 'o', eyes: 'closed' })}${body(70, 46)}
      <path d="M92,44 q10,-6 20,0 M92,52 q14,-2 26,6 M92,38 q12,-12 24,-8" class="tn-l"/>
      <circle cx="150" cy="44" r="14" fill="#9ccc65" class="tn-o"/><path d="M150,30 q4,-8 10,-8" class="tn-l"/>
      <text x="120" y="80" class="tn-small">haleine de pomme</text><text x="120" y="94" class="tn-small">pH 7,18</text>`,
    // Coma hyperosmolaire : le patient est devenu un raisin sec.
    hyperosm: () => `
      <ellipse cx="90" cy="84" rx="40" ry="34" fill="#7b4f8a" class="tn-o"/>
      <path d="M62,70 q10,8 20,0 M70,96 q12,-8 24,0 M98,72 q8,10 18,2 M104,98 q6,-6 14,0" class="tn-l"/>
      <path d="M78,80 l6,6 m0,-6 l-6,6 M98,80 l6,6 m0,-6 l-6,6" class="tn-l"/>
      <text x="140" y="70" class="tn-small">osmolalité 345</text><text x="140" y="84" class="tn-small">(déshydraté)</text>`,
    // Acidose lactique : citron grimaçant.
    lactic: () => `
      <ellipse cx="96" cy="78" rx="44" ry="32" fill="#ffe36b" class="tn-o"/><path d="M52,78 l-8,0 M140,78 l8,0" class="tn-l"/>
      <path d="M80,72 l6,6 m0,-6 l-6,6 M104,72 l6,6 m0,-6 l-6,6 M84,94 q12,-8 24,0" class="tn-l"/>
      <text x="150" y="60" class="tn-small">lactates 9</text><text x="150" y="74" class="tn-small">DFG &lt; 30</text>`,
    // Pancréatite : pancréas en feu.
    panc: () => `
      <path d="M50,90 q20,-30 60,-20 q40,10 70,-6 q8,16 -10,26 q-40,18 -80,10 q-30,-4 -40,-10 z" fill="#f2b28a" class="tn-o"/>
      <path d="M90,66 q-6,-20 6,-30 q-2,14 8,18 q4,-12 12,-14 q-4,16 4,26" fill="#ff7a3a" class="tn-o"/>
      <text x="110" y="132" class="tn-small" text-anchor="middle">lipase 12 N</text>`,
    // Hémorragie intravitréenne : œil injecté.
    retino: () => `
      <path d="M40,76 q70,-60 140,0 q-70,60 -140,0 z" fill="#ffffff" class="tn-o"/>
      <circle cx="110" cy="76" r="24" fill="#c0392b" class="tn-o"/><circle cx="110" cy="76" r="9" class="tn-k"/>
      <path d="M50,70 q20,4 30,-4 M170,82 q-20,-2 -28,6" stroke="#c0392b" stroke-width="2" fill="none"/>
      <text x="110" y="134" class="tn-small" text-anchor="middle">trop vite, trop bien</text>`,
    // Syndrome coronarien aigu : cœur fissuré.
    sca: () => `
      <path d="M110,126 l-46,-46 a24,24 0 0 1 46,-30 a24,24 0 0 1 46,30 z" fill="#ff6b6b" class="tn-o"/>
      <path d="M110,52 l-8,20 l12,10 l-8,22" class="tn-l tn-w"/>
      <text x="110" y="144" class="tn-small" text-anchor="middle">100 µg d'emblée</text>`,
    angor: () => `
      ${guy(80, 46, { mouth: 'sad' })}${body(80, 46)}
      <path d="M80,74 q-10,-6 -16,4" class="tn-l"/><path d="M84,70 l6,-4 l-2,6 l6,-2" stroke="#ff5a5a" stroke-width="3" fill="none"/>
      <path d="M126,118 l20,-30 l20,30" class="tn-l"/><text x="122" y="84" class="tn-small">l'escalier</text>`,
    // Agranulocytose : globule blanc fantôme.
    agranulo: () => `
      <path d="M70,120 v-50 a40,40 0 0 1 80,0 v50 l-10,-10 l-10,10 l-10,-10 l-10,10 l-10,-10 l-10,10 l-10,-10 z" fill="#f3f3f8" class="tn-o"/>
      <circle cx="96" cy="70" r="5" class="tn-k"/><circle cx="124" cy="70" r="5" class="tn-k"/><ellipse cx="110" cy="90" rx="6" ry="8" class="tn-k"/>
      <text x="110" y="144" class="tn-small" text-anchor="middle">PNN 0,18 G/L, ouh ouh</text>`,
    hepat: () => `${guy(90, 56, { skin: '#ffd84a', mouth: 'flat' })}<text x="120" y="50" class="tn-small">un peu jaune,</text><text x="120" y="64" class="tn-small">non ?</text>`,
    rash: () => `${guy(90, 56, { mouth: 'wavy' })}${[[80, 48], [100, 44], [86, 66], [104, 62], [74, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#ff5a7a"/>`).join('')}<text x="120" y="96" class="tn-small">ça gratte</text>`,
    crise: () => `${guy(80, 46, { mouth: 'o' })}${body(80, 46)}<rect x="140" y="30" width="12" height="70" rx="6" fill="#ffffff" class="tn-o"/><circle cx="146" cy="104" r="10" fill="#ff5a5a" class="tn-o"/><rect x="143" y="36" width="6" height="64" fill="#ff5a5a"/><text x="120" y="134" class="tn-small">41 °C</text>`,
    trophy: () => `
      <path d="M80,30 h60 v20 a30,30 0 0 1 -60,0 z" fill="#ffd34a" class="tn-o"/><path d="M80,36 h-14 a12,12 0 0 0 14,20 M140,36 h14 a12,12 0 0 1 -14,20" class="tn-l"/>
      <rect x="104" y="78" width="12" height="20" fill="#ffd34a" class="tn-o"/><rect x="88" y="98" width="44" height="12" rx="2" fill="#c8a02a" class="tn-o"/>
      <text x="110" y="132" class="tn-small" text-anchor="middle">objectif atteint, sans hypoglycémie</text>`
  };

  function toon(kind, o) {
    o = o || {};
    const fig = document.createElement('figure');
    fig.className = 'sv-toon sv-toon-' + kind;
    fig.innerHTML = `<svg viewBox="0 0 220 150" role="img" aria-label="${esc(o.titre || kind)}">${(DRAW[kind] || DRAW.hypo)(o)}</svg>` + (o.titre ? `<figcaption>${esc(o.titre)}</figcaption>` : '');
    return fig;
  }

  S.toon = toon;
})();
