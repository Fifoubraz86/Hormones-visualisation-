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
  const bell = (x) => (x > 0.08 ? Math.exp(-Math.pow((x - 0.36) / 0.17, 2)) : 0); // nadir glycémique vers 30 min
  const T = {};
  T.cortico = [
    {
      id: 'synacthene', name: 'Test au Synacthène immédiat', poly: true,
      what: 'Recherche une insuffisance surrénale : la corticosurrénale répond-elle à une stimulation maximale ?',
      proto: '250 µg de tétracosactide (ACTH 1-24) IV ou IM ; cortisol à T0, 30 et 60 min.',
      unit: 'nmol/L', label: 'Cortisol', thr: 500, thrDir: 'above', thrLabel: 'seuil 500 nmol/L (18 µg/dL)',
      span: 60, xUnit: 'min', duration: 14,
      samples: [{ x: 0.06, label: 'T0' }, { x: 0.55, label: '30 min' }, { x: 1, label: '60 min' }],
      apply(p, x) { if (x > 0.08) p.syn = 6; },
      measure: (sim) => sim.lab('cort'),
      interpret(v, sim, st) {
        // Seules les valeurs prélevées aux temps du protocole comptent (T0, 30 et 60 min).
        const peak = Math.max(...v);
        // Bloc en 21-hydroxylase : le test sert surtout à doser la 17-OHP stimulée (polycopié p. 82).
        const b21 = sim.p && sim.p.cyp21 < 0.9;
        const ohp = b21 ? ` 17-OHP après stimulation : ${sim.lab('ohp').toFixed(1).replace('.', ',')} × N : élévation en faveur d'un bloc en 21-hydroxylase (polycopié p. 82).` : '';
        // Insuffisance corticotrope récente : surrénales pas encore atrophiées, réponse faussement normale (polycopié p. 61).
        const recent = (st && st.base && st.base.recent) || (v[0] < 275 && sim.lab('acth') < 20);
        if (peak >= 500 && recent) return { tone: 'warn', text: `Cortisol maximal sur les prélèvements : ${n0(peak)} nmol/L (≥ 500 nmol/L) : réponse faussement rassurante. Cortisol de base bas (${n0(v[0])} nmol/L) avec une ACTH basse : une insuffisance corticotrope récente est possible, les surrénales ne sont pas encore atrophiées et répondent encore à l'ACTH exogène (polycopié p. 61). Le test au Synacthène ne l'exclut pas : hypoglycémie insulinique, qui explore tout l'axe, ou nouveau test à distance (complément).` };
        if (peak >= 500) return { tone: b21 ? 'warn' : 'good', text: `Cortisol maximal sur les prélèvements : ${n0(peak)} nmol/L (≥ 500 nmol/L, 18 µg/dL) : réponse normale. Une insuffisance surrénale est éliminée (sauf insuffisance corticotrope récente, avant l'atrophie surrénalienne).` + ohp };
        const acth = sim.lab('acth') > 52; // ACTH endogène (le Synacthène n'est pas dosé comme ACTH)
        return { tone: 'bad', text: `Cortisol maximal sur les prélèvements : ${n0(peak)} nmol/L (< 500) : réponse insuffisante. ` + (acth ? (b21 ? 'Avec une ACTH élevée : insuffisance surrénale périphérique, ici par bloc en 21-hydroxylase.' : 'Avec une ACTH élevée : insuffisance surrénale périphérique.') : 'Avec une ACTH basse ou normale : insuffisance corticotrope ancienne, avec atrophie surrénalienne.') + ohp };
      }
    },
    {
      id: 'synacthene-17ohp', name: 'Synacthène : 17-OHP', poly: true,
      what: 'Recherche un bloc en 21-hydroxylase non classique devant une hyperandrogénie : la 17-OHP s\'élève-t-elle anormalement sous ACTH (polycopié p. 82) ?',
      proto: '250 µg de tétracosactide (ACTH 1-24) IV ou IM ; 17-OHP à T0 et à 60 min. Valeurs relatives (× N) ; en pratique, une 17-OHP stimulée > 10 ng/mL (≈ 30 nmol/L) est en faveur du bloc (complément, Endocrine Society 2018).',
      unit: '× N', label: '17-OHP', thr: 5, thrDir: 'below', thrLabel: 'seuil pédagogique 5 × N (valeur relative)',
      span: 60, xUnit: 'min', duration: 14,
      samples: [{ x: 0.06, label: 'T0' }, { x: 1, label: '60 min' }],
      apply(p, x) { if (x > 0.08) p.syn = 6; },
      measure: (sim) => sim.lab('ohp'),
      interpret(v, sim) {
        const f = (x) => x.toFixed(1).replace('.', ',');
        const base = v[0], peak = Math.max(...v);
        if (peak < 0.67) return { tone: 'warn', text: `17-OHP basse et non stimulable (${f(peak)} × N) : la corticosurrénale ne répond pas (insuffisance surrénale ou atrophie) ; le test n'apporte rien pour un bloc enzymatique.` };
        if (peak < 5) return { tone: 'good', text: `17-OHP : ${f(base)} × N à T0, ${f(peak)} × N après stimulation : réponse normale, un bloc en 21-hydroxylase non classique est peu probable.` };
        if (base > 20 && sim.lab('cort') < 275) return { tone: 'bad', text: `17-OHP déjà très élevée à T0 (${f(base)} × N), cortisol bas : bloc en 21-hydroxylase classique ; le test n'est pas nécessaire (dépistage néonatal à J3, polycopié p. 81).` };
        return { tone: 'bad', text: `17-OHP : ${f(base)} × N à T0, ${f(peak)} × N après stimulation : élévation anormale, en faveur d'un bloc en 21-hydroxylase non classique (polycopié p. 82). Confirmation par l'étude du gène CYP21A2 (complément).` };
      }
    },
    {
      id: 'dxm', name: 'Freinage minute à la dexaméthasone', poly: true,
      what: 'Dépiste un hypercortisolisme : le cortisol se freine-t-il sous un glucocorticoïde exogène ?',
      proto: '1 mg de dexaméthasone à 23 h ; cortisol plasmatique le lendemain à 8 h. Seuil de freinage normal < 50 nmol/L (1,8 µg/dL) : complément (Endocrine Society 2008), non chiffré dans le polycopié.',
      unit: 'nmol/L', label: 'Cortisol', thr: 50, thrDir: 'below', thrLabel: 'freinage normal < 50 nmol/L (1,8 µg/dL ; complément)',
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
  T.cortico.push(
    {
      id: 'ith', name: 'Hypoglycémie insulinique', poly: true,
      what: 'Explore l\'ensemble de l\'axe (hypothalamus, hypophyse, surrénale) : un stress hypoglycémique fait-il monter le cortisol ?',
      proto: 'Insuline IV jusqu\'à une glycémie < 0,40 g/L ; cortisol et ACTH avant, puis après l\'injection (toutes les 15 à 30 min ; complément). Contre-indiquée en cas de cardiopathie ischémique ou d\'épilepsie (complément).',
      unit: 'nmol/L', label: 'Cortisol', thr: 500, thrDir: 'above', thrLabel: 'élévation > 500 nmol/L (18 µg/dL)',
      span: 90, xUnit: 'min', duration: 15,
      samples: [{ x: 0.04, label: 'T0' }, { x: 0.34, label: '30' }, { x: 0.67, label: '60' }, { x: 1, label: '90' }],
      apply(p, x) { p.ith = bell(x); },
      measure: (sim) => sim.lab('cort'),
      interpret(v, sim) {
        const peak = Math.max(...v); // valeurs prélevées seulement
        if (peak >= 500) return { tone: 'good', text: `Cortisol maximal sur les prélèvements : ${n0(peak)} nmol/L, pour une glycémie < 0,40 g/L : axe corticotrope fonctionnel.` };
        return { tone: 'bad', text: `Cortisol maximal sur les prélèvements : ${n0(peak)} nmol/L (< 500) : insuffisance de l'axe. ` + (sim.lab('acth') > 52 ? 'ACTH élevée : atteinte surrénalienne (test non nécessaire : le couple cortisol bas, ACTH élevée suffit au diagnostic).' : 'L\'ACTH ne monte pas : atteinte hypothalamo-hypophysaire (insuffisance corticotrope).') };
      }
    },
    {
      id: 'dxm8', name: 'Freinage fort à la dexaméthasone', poly: false,
      what: 'Devant un Cushing ACTH-dépendant : origine hypophysaire (freinage partiel) ou sécrétion ectopique (pas de freinage) ?',
      proto: 'Dexaméthasone 8 mg (en une prise ou 2 mg toutes les 6 h pendant 48 h) ; cortisol avant et après (complément, non détaillé dans le polycopié). Sensibilité et spécificité médiocres : le cathétérisme des sinus pétreux inférieurs est préféré.',
      unit: 'nmol/L', label: 'Cortisol', thrFn: (st) => (st.values.length ? st.values[0] * 0.5 : null), thrDir: 'below', thrLabel: 'baisse de 50 % par rapport au départ',
      span: 48, xUnit: 'h', duration: 15,
      samples: [{ x: 0.04, label: 'J0' }, { x: 0.5, label: 'J1' }, { x: 1, label: 'J2' }],
      apply(p, x) { if (x > 0.06) p.dxm = 8; },
      measure: (sim) => sim.lab('cort'),
      interpret(v, sim, st) {
        const fall = 1 - v[v.length - 1] / v[0];
        const pc = fall > 0 ? Math.round(fall * 100) + ' %' : 'aucune baisse';
        if (v[0] < 550) return { tone: 'warn', text: `Variation : ${pc}. Le test n'a d'intérêt qu'en cas d'hypercortisolisme ACTH-dépendant confirmé.` };
        if (st.base.autoAdr > 0.02) return { tone: 'warn', text: `Variation : ${pc}. ACTH effondrée : Cushing ACTH-indépendant (surrénalien), le test d'orientation hypophyse/ectopie n'est pas indiqué.` };
        // Sensibilité et spécificité médiocres : le cathétérisme des sinus pétreux lui est préféré (complément).
        const lim = ' Test peu sensible et peu spécifique : les recommandations actuelles lui préfèrent le cathétérisme des sinus pétreux inférieurs (complément).';
        if (fall >= 0.5) return { tone: 'good', text: `Baisse du cortisol de ${pc} (≥ 50 %) : freinage partiel en faveur d'un adénome corticotrope (maladie de Cushing).` + lim };
        return { tone: 'bad', text: `Baisse du cortisol : ${pc} (< 50 %), absence de freinage en faveur d'une sécrétion ectopique d'ACTH.` + lim };
      }
    }
  );
  T.somato = [
    {
      id: 'hgpo-gh', name: 'HGPO avec dosage de la GH', poly: true,
      what: 'Diagnostic de l\'acromégalie : la GH se freine-t-elle sous hyperglycémie ?',
      proto: '75 g de glucose per os ; GH à T0, 30, 60, 90 et 120 min.',
      unit: 'ng/mL', label: 'GH', thr: 0.4, thrDir: 'below', thrLabel: 'nadir < 0,4 ng/mL (≈ 1 mUI/L)',
      span: 120, xUnit: 'min', duration: 15,
      samples: [{ x: 0.04, label: 'T0' }, { x: 0.25, label: '30' }, { x: 0.5, label: '60' }, { x: 0.75, label: '90' }, { x: 1, label: '120' }],
      apply(p, x) { if (x > 0.05) p.load = clamp(Math.min((x - 0.05) * 8, 1) * (1 - 0.4 * Math.max(0, x - 0.6) / 0.4), 0, 1); },
      measure: (sim) => {
        const st = HV.Tests.state();
        if (st && !st.trace.length) st.igf0 = sim.lab('igf'); // IGF-1 avant la charge
        return sim.lab('gh');
      },
      interpret(v, sim, st) {
        const nadir = Math.min(...v.slice(1)), igf0 = st && st.igf0 != null ? st.igf0 : sim.lab('igf');
        if (nadir >= 0.4 && igf0 <= 300) return { tone: 'warn', text: `Nadir de GH à ${n2(nadir)} ng/mL (≥ 0,4) : absence de freination, mais IGF-1 normale (${n0(igf0)} µg/L) : résultat discordant, à contrôler. Le diagnostic d'acromégalie repose d'abord sur l'IGF-1 élevée (polycopié p. 55).` };
        if (nadir < 0.4) return { tone: 'good', text: `Nadir de GH à ${n2(nadir)} ng/mL : freination normale. Pas d'acromégalie.` };
        return { tone: 'bad', text: `Nadir de GH à ${n2(nadir)} ng/mL (≥ 0,4) : absence de freination. Avec une IGF-1 élevée (${n0(igf0)} µg/L), le diagnostic d'acromégalie est confirmé : IRM hypophysaire.` };
      }
    }
  ];
  T.somato.push({
    id: 'ith-gh', name: 'Hypoglycémie insulinique', poly: true,
    what: 'Test de référence du déficit somatotrope : l\'hypoglycémie fait-elle monter la GH ?',
    proto: 'Insuline IV jusqu\'à une glycémie < 0,40 g/L ; GH (et cortisol) avant, puis après l\'injection (toutes les 15 à 30 min ; complément). Contre-indiquée en cas de cardiopathie ischémique ou d\'épilepsie (complément).',
    unit: 'ng/mL', label: 'GH', thr: 3, thrDir: 'above', thrLabel: 'pic < 3 : déficit complet · < 6 : partiel',
    span: 90, xUnit: 'min', duration: 15,
    samples: [{ x: 0.04, label: 'T0' }, { x: 0.34, label: '30' }, { x: 0.67, label: '60' }, { x: 1, label: '90' }],
    apply(p, x) { p.ith = bell(x); },
    measure: (sim) => sim.lab('gh'),
    interpret(v) {
      const peak = Math.max(...v); // valeurs prélevées seulement
      if (peak >= 6) return { tone: 'good', text: `GH maximale sur les prélèvements : ${n2(peak)} ng/mL (≥ 6) : réponse normale.` };
      if (peak >= 3) return { tone: 'warn', text: `GH maximale sur les prélèvements : ${n2(peak)} ng/mL (entre 3 et 6) : insuffisance somatotrope partielle.` };
      return { tone: 'bad', text: `GH maximale sur les prélèvements : ${n2(peak)} ng/mL (< 3) : insuffisance somatotrope complète.` };
    }
  });
  T.raa = [{
    id: 'saline', name: 'Test de charge sodée', poly: true,
    what: 'Confirme l\'autonomie de l\'aldostérone : l\'expansion volémique la freine-t-elle ?',
    proto: 'Principe : expansion volémique par charge sodée (polycopié p. 77). Perfusion de 2 L de sérum salé isotonique en 4 h, en position couchée ou assise ; aldostérone avant et après. Protocole et seuils : complément (Endocrine Society 2016), variables selon les centres.',
    unit: 'pmol/L', label: 'Aldostérone', thr: 140, thrDir: 'below', thrLabel: 'freinage normal < 140 pmol/L (5 ng/dL)',
    span: 4, xUnit: 'h', duration: 14,
    samples: [{ x: 0.04, label: '0 h' }, { x: 0.5, label: '2 h' }, { x: 1, label: '4 h' }],
    apply(p, x) { if (x > 0.06) p.salt = 1; },
    measure: (sim) => sim.lab('aldo'),
    interpret(v) {
      const a = v[v.length - 1];
      if (a < 140) return { tone: 'good', text: `Aldostérone à ${n0(a)} pmol/L après charge : freinage normal, l'hyperaldostéronisme primaire est peu probable.` };
      if (a > 280) return { tone: 'bad', text: `Aldostérone à ${n0(a)} pmol/L malgré la charge sodée (> 280 pmol/L, 10 ng/dL) : sécrétion autonome, hyperaldostéronisme primaire confirmé. Étape suivante : scanner surrénalien et cathétérisme des veines surrénales.` };
      return { tone: 'warn', text: `Aldostérone à ${n0(a)} pmol/L : zone intermédiaire, à confronter aux autres tests (fludrocortisone, captopril).` };
    }
  }];
  T.glyc = [
    {
      id: 'hgpo', name: 'HGPO à 75 g', poly: true,
      what: 'Diagnostic du diabète et de l\'intolérance au glucose.',
      proto: '75 g de glucose per os à jeun ; glycémie à T0, 1 h et 2 h.',
      unit: 'g/L', label: 'Glycémie', thr: 2, thrDir: 'below', thrLabel: '2 h : ≥ 2,00 diabète · 1,40–1,99 intolérance (à jeun : ≥ 1,26 diabète)',
      span: 120, xUnit: 'min', duration: 14,
      samples: [{ x: 0.04, label: 'T0' }, { x: 0.5, label: '60' }, { x: 1, label: '120' }],
      apply(p, x) { p.fast = 1; const u = (x - 0.06) / 0.33; p.ogtt = u > 0 ? u * Math.exp(1 - u) : 0; /* absorption digestive */ },
      measure: (sim) => sim.lab('g'),
      interpret(v) {
        const g0 = v[0], g2 = v[v.length - 1], f = (x) => x.toFixed(2).replace('.', ',');
        // Glycémie à jeun basse : l'HGPO n'est pas l'examen adapté (normale à jeun 0,80–1,10 g/L ; hypoglycémie < 0,50 g/L hors diabète, polycopié partie 2 p. 32 et 66).
        if (g0 < 0.7) return { tone: 'bad', text: `À jeun : ${f(g0)} g/L : glycémie basse (hypoglycémie si < 0,50 g/L hors diabète). À 2 h : ${f(g2)} g/L. L'HGPO standard n'est pas l'examen adapté : rechercher une hypoglycémie organique (triade de Whipple, épreuve de jeûne) ; l'HGPO prolongée sur 5 heures montre la chute tardive de la glycémie après le pic.` };
        // On classe d'abord sur la glycémie à jeun, puis à 2 h ; on retient la catégorie la plus haute (polycopié, tableau 8).
        const c0 = g0 >= 1.26 ? 3 : g0 >= 1.1 ? 1 : 0;
        const c2 = g2 >= 2 ? 3 : g2 >= 1.4 ? 2 : 0;
        const t0 = `À jeun : ${f(g0)} g/L` + (c0 === 3 ? ' (≥ 1,26 : diabète)' : c0 === 1 ? ' (1,10–1,25 : hyperglycémie modérée à jeun)' : ' (< 1,10 : normale)');
        const t2 = `à 2 h : ${f(g2)} g/L` + (c2 === 3 ? ' (≥ 2,00 : diabète)' : c2 === 2 ? ' (1,40–1,99 : intolérance au glucose)' : ' (< 1,40 : normale)');
        const head = `${t0} ; ${t2}. `;
        const noInd = c0 === 3 ? ' L\'HGPO n\'était pas indiquée : le diagnostic se pose sur la glycémie à jeun (≥ 1,26 g/L, à contrôler une seconde fois).' : '';
        const c = Math.max(c0, c2);
        if (c === 3) return { tone: 'bad', text: head + 'Conclusion : diabète.' + noInd };
        if (c === 2) return { tone: 'warn', text: head + 'Conclusion : intolérance au glucose (prédiabète)' + (c0 === 1 ? ', avec hyperglycémie modérée à jeun.' : '.') };
        if (c === 1) return { tone: 'warn', text: head + 'Conclusion : hyperglycémie modérée à jeun (prédiabète).' };
        return { tone: 'good', text: head + 'Conclusion : tolérance normale au glucose.' };
      }
    },
    {
      id: 'hgpo5', name: 'HGPO prolongée sur 5 heures', poly: true,
      what: 'Recherche une hypoglycémie post-stimulative : la glycémie descend-elle sous 0,50 g/L dans les heures qui suivent la charge (polycopié, partie 2 p. 70) ?',
      proto: '75 g de glucose per os à jeun ; glycémie toutes les heures pendant 5 heures (polycopié, partie 2 p. 70 ; rythme des prélèvements : complément).',
      unit: 'g/L', label: 'Glycémie', thr: 0.5, thrDir: 'above', thrLabel: 'hypoglycémie < 0,50 g/L',
      span: 300, xUnit: 'min', duration: 26,
      samples: [{ x: 0.02, label: 'T0' }, { x: 0.2, label: '60' }, { x: 0.4, label: '120' }, { x: 0.6, label: '180' }, { x: 0.8, label: '240' }, { x: 1, label: '300' }],
      apply(p, x) { p.fast = 1; const u = (x - 0.03) / 0.14; p.ogtt = u > 0 ? u * Math.exp(1 - u) : 0; /* absorption digestive */ },
      measure: (sim) => sim.lab('g'),
      interpret(v, sim) {
        const f = (x) => x.toFixed(2).replace('.', ','), g0 = v[0];
        const late = v.slice(2), m = Math.min(...late), at = [120, 180, 240, 300][late.indexOf(m)];
        if (sim.p && sim.p.exo > 0.05) return { tone: 'warn', text: 'Examen non indiqué chez le diabétique traité par insuline : l\'hypoglycémie est iatrogène (polycopié, partie 2 p. 70).' };
        if (m < 0.5) return { tone: 'bad', text: `Hypoglycémie tardive à ${f(m)} g/L (${at} min) après la charge` + (g0 < 0.7 ? `, avec une glycémie déjà basse à jeun (${f(g0)} g/L) : la sécrétion d'insuline, autonome, se prolonge après le pic glycémique. Évoque un hyperinsulinisme organique (insulinome) : épreuve de jeûne avec insuline et peptide C (complément).` : ' : hypoglycémie post-stimulative ; à confronter aux symptômes (triade de Whipple, polycopié partie 2 p. 72).') };
        return { tone: 'good', text: `Glycémie minimale ${f(m)} g/L entre 2 et 5 heures : pas de glycémie inférieure à 0,50 g/L (polycopié, partie 2 p. 70).` };
      }
    },
    {
      id: 'jeune', name: 'Épreuve de jeûne de 72 h', poly: false,
      what: 'Recherche une hypoglycémie organique : pendant le jeûne, l\'insuline doit s\'effondrer et la glycémie rester ≥ 0,50 g/L.',
      proto: 'Jeûne surveillé en hospitalisation ; glycémie répétée, insuline et peptide C (complément) au moment d\'une hypoglycémie (triade de Whipple, citée dans le polycopié). Non indiquée chez un diabétique traité.',
      unit: 'g/L', label: 'Glycémie', thr: 0.5, thrDir: 'above', thrLabel: 'hypoglycémie < 0,50 g/L',
      span: 72, xUnit: 'h', duration: 18,
      samples: [{ x: 0.03, label: '0 h' }, { x: 0.33, label: '24 h' }, { x: 0.67, label: '48 h' }, { x: 1, label: '72 h' }],
      apply(p, x) { if (x > 0.04) { p.fast = 1; p.long = Math.min(1, (x - 0.04) / 0.6); } },
      measure: (sim) => sim.lab('g'),
      interpret(v, sim) {
        const min = Math.min(...v), ins = sim.lab('ins'), f = (x) => x.toFixed(2).replace('.', ',');
        const iTxt = ins.toFixed(1).replace('.', ',') + ' µUI/mL';
        if (sim.p && sim.p.exo > 0.05) return { tone: 'warn', text: 'Épreuve non indiquée chez le diabétique traité par insuline : l\'hypoglycémie est iatrogène (polycopié, partie 2 p. 70).' };
        if (min >= 0.5) return { tone: 'good', text: `Glycémie minimale ${f(min)} g/L, sans hypoglycémie ; insuline ${ins < 3 ? 'freinée' : 'adaptée à la glycémie'} en fin de jeûne (${iTxt}). Pas d'hypoglycémie organique.` };
        if (ins >= 3) return { tone: 'bad', text: `Hypoglycémie à ${f(min)} g/L avec une insuline non freinée (${iTxt}, ≥ 3 µUI/mL ; complément) : hyperinsulinisme. Peptide C élevé : hyperinsulinisme endogène (insulinome, ou prise de sulfamides hypoglycémiants, à rechercher dans le plasma) ; peptide C bas : insuline exogène.` };
        return { tone: 'warn', text: `Hypoglycémie à ${f(min)} g/L avec une insuline freinée : cause non insulinique à rechercher.` };
      }
    }
  ];
  T.adh_situations = [
    {
      id: 'water', name: 'Charge en eau : 1,5 L bu', poly: false,
      what: 'Situation de la vie courante : que fait l\'osmostat quand on boit beaucoup d\'un coup ?',
      proto: '1,5 L d\'eau bus en 30 minutes ; diurèse et osmolalité urinaire suivies pendant 4 heures (illustration physiologique, complément).',
      unit: 'L/24 h', label: 'Débit urinaire', thr: 3, thrDir: 'below', thrLabel: 'débit urinaire habituel < 3 L/24 h',
      span: 4, xUnit: 'h', duration: 16,
      samples: [{ x: 0.03, label: '0 h' }, { x: 0.25, label: '1 h' }, { x: 0.5, label: '2 h' }, { x: 0.75, label: '3 h' }, { x: 1, label: '4 h' }],
      apply(p, x) { p.drink = x > 0.04 && x < 0.16 ? 1.6 : 0; },
      measure: (sim) => sim.lab('diur'),
      interpret(v, sim, st) {
        const peak = Math.max(...v), na = sim.lab('na');
        if (st.base.siadh > 0.02 || st.base.drug > 0.02) return { tone: 'bad', text: `L'ADH reste élevée : le rein ne peut pas éliminer l'eau bue, les urines restent concentrées et la natrémie chute à ${n0(na)} mmol/L. C'est pourquoi le SIADH se traite par restriction hydrique.` };
        if (st.base.hypo < 0.5 || st.base.kidney < 0.5) return { tone: 'warn', text: `Les urines sont déjà abondantes et diluées en permanence (diabète insipide) : la charge en eau ne modifie guère la diurèse, déjà maximale (${n2(peak)} L/24 h en débit). Natrémie ${n0(na)} mmol/L.` };
        return { tone: 'good', text: `L'eau bue abaisse l'osmolalité : l'ADH s'effondre, les urines deviennent abondantes (jusqu'à ${n2(peak)} L/24 h en débit) et diluées, puis tout revient à la normale en quelques heures (natrémie ${n0(na)} mmol/L). C'est le rétrocontrôle négatif de l'osmostat. Si le rein ne pouvait pas éliminer l'eau (SIADH), la même charge ferait chuter la natrémie.` };
      }
    },
    {
      id: 'desert', name: 'Marche dans le désert (6 h)', poly: false,
      what: 'Situation de la vie courante : sueur abondante sans pouvoir boire.',
      proto: 'Six heures de marche au soleil sans eau ; natrémie, osmolalité urinaire et diurèse (illustration physiologique, complément).',
      unit: 'mosmol/kg', label: 'Osmolalité urinaire', thr: 600, thrDir: 'above', thrLabel: 'urines concentrées > 600 mosmol/kg (complément)',
      span: 6, xUnit: 'h', duration: 16,
      samples: [{ x: 0.03, label: '0 h' }, { x: 0.33, label: '2 h' }, { x: 0.67, label: '4 h' }, { x: 1, label: '6 h' }],
      apply(p, x) { if (x > 0.04) p.sweat = Math.min(1, (x - 0.04) * 3); },
      measure: (sim) => sim.lab('uosm'),
      interpret(v, sim) {
        const u = v[v.length - 1], na = sim.lab('na'), d = sim.lab('diur');
        if (u < 300) return { tone: 'bad', text: `Malgré la déshydratation (natrémie ${n0(na)} mmol/L), les urines restent diluées (${n0(u)} mosmol/kg) : le rein ne peut pas économiser l'eau. Chez un patient atteint de diabète insipide, une telle situation est dangereuse (déshydratation hypernatrémique) s'il ne peut pas boire.` };
        return { tone: 'warn', text: `La sueur fait monter l'osmolalité (natrémie ${n0(na)} mmol/L) : l'ADH s'élève, les urines deviennent rares (${n2(d)} L/24 h) et très concentrées (${n0(u)} mosmol/kg). Le rein limite les pertes, mais seule la boisson (soif) peut corriger le déficit en eau.` };
      }
    }
  ];
  T.adh = [
    {
      id: 'restriction', name: 'Épreuve de restriction hydrique', poly: true,
      what: 'Diagnostic du diabète insipide : les urines se concentrent-elles quand on arrête de boire ? En fin d\'épreuve, la desmopressine distingue l\'origine centrale de l\'origine rénale (complément).',
      proto: 'En hospitalisation, après imagerie : arrêt des boissons ; poids, diurèse, osmolalités urinaire et plasmatique, natrémie ; desmopressine en fin d\'épreuve (complément). Devant une hyponatrémie (SIADH), la restriction est seulement partielle (500 à 800 mL/j, complément), sans desmopressine.',
      unit: 'mosmol/kg', label: 'Osmolalité urinaire', thr: 600, thrDir: 'above', thrLabel: 'urines concentrées > 600 mosmol/kg (complément)',
      span: 10, xUnit: 'h', duration: 20,
      samples: [{ x: 0.03, label: '0 h' }, { x: 0.2, label: '2 h' }, { x: 0.4, label: '4 h' }, { x: 0.6, label: '6 h' }, { x: 0.79, label: '8 h' }, { x: 1, label: 'DDAVP' }],
      apply(p, x) {
        const siadh = p.siadh > 0.02 || p.drug > 0.02;
        // SIADH : restriction partielle (500 à 800 mL/j) et correction lente ; jamais de desmopressine.
        if (x > 0.05) { p.restrict = siadh ? 0.2 : 1; if (!siadh) { p.drink = 0; p.sweat = 0; } }
        if (x > 0.8 && !siadh) p.ddavp = 1;
      },
      measure: (sim) => {
        const st = HV.Tests.state();
        if (st && !st.trace.length) st.na0 = sim.lab('na'); // natrémie de départ
        if (st) st.naMax = Math.max(st.naMax || 0, sim.lab('na')); // natrémie la plus haute de l'épreuve
        return sim.lab('uosm');
      },
      track: (sim) => sim.lab('diur') / 24, // litres par heure
      interpret(v, sim, st) {
        const u8 = v[4], ud = v[5], na = sim.lab('na');
        const loss = (st.acc / 70) * 100;
        const naMax = Math.max(st.naMax || 0, na);
        const extra = ` Natrémie maximale ${n0(naMax)} mmol/L ; perte de poids ≈ ${loss.toFixed(1).replace('.', ',')} %.` + (loss > 3 || naMax > 148 ? ' En pratique, l\'épreuve est interrompue avant ce stade (perte de poids > 3 à 5 % ou natrémie qui dépasse la normale ; complément).' : '');
        if (st.base.siadh > 0.02 || st.base.drug > 0.02) {
          const na0 = st.na0 != null ? st.na0 : na, d = na - na0;
          return { tone: 'warn', text: `Restriction hydrique partielle (500 à 800 mL/j ; complément) : les urines restent inappropriément concentrées et la natrémie remonte lentement, de ${n0(na0)} à ${n0(na)} mmol/L (+${d.toFixed(1).replace('.', ',')} mmol/L) : argument pour un SIADH (épreuve diagnostique et thérapeutique). Pas de desmopressine dans un SIADH. Mise en garde : corriger de 8 à 10 mmol/L par 24 h au plus (risque de myélinolyse osmotique ; complément).` };
        }
        if (u8 >= 600) {
          return { tone: 'good', text: `Osmolalité urinaire à ${n0(u8)} mosmol/kg à 8 h : concentration normale, pas de diabète insipide.` + extra };
        }
        if (ud > u8 * 1.5 && ud > 400) return { tone: 'bad', text: `Urines non concentrées (${n0(u8)} mosmol/kg) puis concentration après desmopressine (${n0(ud)}) : diabète insipide central.` + extra };
        return { tone: 'bad', text: `Urines non concentrées (${n0(u8)} mosmol/kg) et pas de réponse à la desmopressine (${n0(ud)}) : diabète insipide néphrogénique.` + extra };
      }
    }
  ].concat(T.adh_situations);
  delete T.adh_situations;
  /* Axe gonadotrope masculin : tests hors polycopié (complément), textes nuancés comme dans docs/tests-dynamiques.md. */
  const f1g = (v) => v.toFixed(1).replace('.', ',');
  T.gonadoM = [
    {
      id: 'gnrh', name: 'Test à la GnRH', poly: false,
      what: 'Les cellules gonadotropes répondent-elles à une injection de GnRH ? Utile surtout chez l\'enfant (puberté précoce centrale) ; chez l\'adulte, il ne précise pas le niveau d\'un déficit gonadotrope.',
      proto: 'Gonadoréline (GnRH) 100 µg IV ; LH et FSH à T0, 30, 60 et 90 min (complément, non détaillé dans le polycopié ; protocoles et seuils variables selon les centres).',
      unit: 'UI/L', label: 'LH', thrFn: (st) => (st.values.length ? st.values[0] * 3 : null), thrDir: 'above', thrLabel: 'réponse indicative : LH × 3 au pic (complément)',
      span: 90, xUnit: 'min', duration: 14,
      samples: [{ x: 0.04, label: 'T0' }, { x: 0.34, label: '30' }, { x: 0.67, label: '60' }, { x: 1, label: '90' }],
      apply(p, x) { if (x > 0.06) p.gnrh = 3 * Math.exp(-(x - 0.06) / 0.3); }, // bolus IV, éliminé en quelques minutes
      measure: (sim) => {
        const st = HV.Tests.state();
        if (st && !st.trace.length) st.fsh0 = sim.lab('fsh');
        if (st) st.fshMax = Math.max(st.fshMax || 0, sim.lab('fsh'));
        return sim.lab('lh');
      },
      interpret(v, sim, st) {
        const lh0 = v[0], peak = Math.max(...v.slice(1)), r = peak / Math.max(lh0, 0.05);
        const fsh = st && st.fsh0 != null ? ` ; FSH de ${f1g(st.fsh0)} à ${f1g(st.fshMax)} UI/L` : '';
        const head = `LH de ${f1g(lh0)} à ${f1g(peak)} UI/L au pic (× ${f1g(r)})${fsh}. `;
        if (st.base.exoT > 0.05) return { tone: 'warn', text: head + 'Axe freiné par des androgènes exogènes : le test n\'est pas interprétable. Arrêter les androgènes puis réévaluer l\'axe (complément).' };
        if (lh0 > 9) return { tone: 'warn', text: head + 'LH déjà élevée à l\'état basal : hypogonadisme primaire (testiculaire). Le test n\'apporte rien : le dosage de base de la testostérone, de la LH et de la FSH suffit (polycopié, partie 2, p. 10).' };
        if (r >= 3) return { tone: 'good', text: head + 'Réponse franche : les cellules gonadotropes sont fonctionnelles. Une réponse normale n\'élimine pas un déficit d\'origine hypothalamique (complément).' };
        return { tone: 'bad', text: head + 'Réponse faible : déficit gonadotrope, sans en préciser le niveau. Après une longue privation en GnRH, une hypophyse intacte peut répondre peu ; le test distingue mal le retard pubertaire simple du déficit congénital (complément).' };
      }
    },
    {
      id: 'hcg', name: 'Test à l\'hCG', poly: false,
      what: 'Les cellules de Leydig répondent-elles à une stimulation de type LH ? Utile surtout chez l\'enfant (cryptorchidie, anomalie de la différenciation sexuelle) ; chez l\'adulte, testostérone et LH de base suffisent le plus souvent.',
      proto: 'hCG en IM (agit sur le récepteur de la LH) ; testostérone avant puis à J3 (ou J5 selon le protocole) (complément, non détaillé dans le polycopié ; doses et seuils variables selon l\'âge et les centres).',
      unit: 'nmol/L', label: 'Testostérone', thrFn: (st) => (st.values.length ? st.values[0] * 2 : null), thrDir: 'above', thrLabel: 'hausse indicative : testostérone × 2 (complément)',
      span: 72, xUnit: 'h', duration: 14,
      samples: [{ x: 0.04, label: '0 h' }, { x: 0.34, label: '24 h' }, { x: 0.67, label: '48 h' }, { x: 1, label: '72 h' }],
      apply(p, x) { if (x > 0.06) p.hcg = 2; }, // demi-vie longue : stimulation soutenue sur 72 h
      measure: (sim) => sim.lab('tt'),
      interpret(v, sim, st) {
        const t0 = v[0], t3 = v[v.length - 1], r = t3 / Math.max(t0, 0.1);
        const head = `Testostérone de ${f1g(t0)} à ${f1g(t3)} nmol/L (× ${f1g(r)}). `;
        if (st.base.exoT > 0.05) return { tone: 'warn', text: head + 'Sous testostérone exogène, le dosage mêle hormone injectée et production testiculaire : test non interprétable (complément).' };
        if (r >= 2) return { tone: 'good', text: head + 'Hausse franche : cellules de Leydig fonctionnelles.' + (sim.lab('lh') < 9 && st.base.hypo < 0.5 ? ' Avec des gonadotrophines basses, l\'atteinte est située en amont (hypothalamo-hypophysaire).' : '') + ' (Complément.)' };
        return { tone: 'bad', text: head + 'Hausse faible : réserve des cellules de Leydig diminuée, en faveur d\'une atteinte testiculaire (complément). Après une longue privation en LH, la réponse peut aussi être retardée : une stimulation prolongée est parfois nécessaire (complément).' };
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
    state: () => st,
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
    const thr = d.thrFn ? d.thrFn(st) : d.thr;
    const vals = st.trace.map((q) => q[1]).concat(st.values, [(thr || st.values[0] || 1) * 1.4]);
    const ymax = Math.max(...vals) * 1.1;
    const sx = (x) => L + x * (W - L - R), sy = (v) => H - B - (v / ymax) * (H - B - Tp);
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="test-svg" role="img" aria-label="${d.label} au cours du test">`;
    svg += `<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" class="ax"/><line x1="${L}" y1="${Tp}" x2="${L}" y2="${H - B}" class="ax"/>`;
    [0, 0.5, 1].forEach((f) => { const v = ymax * f; svg += `<text x="${L - 4}" y="${sy(v) + 4}" class="tk" text-anchor="end">${v < 10 ? v.toFixed(1).replace('.', ',') : Math.round(v)}</text>`; });
    if (thr != null) svg += `<line x1="${L}" y1="${sy(thr)}" x2="${W - R}" y2="${sy(thr)}" class="thr"/><text x="${W - R}" y="${sy(thr) - 4}" class="thr-t" text-anchor="end">${d.thrLabel}</text>`;
    d.samples.forEach((s) => { svg += `<text x="${sx(s.x)}" y="${H - 8}" class="tk" text-anchor="middle">${s.label}</text>`; });
    if (st.trace.length > 1) svg += `<polyline points="${st.trace.map((q) => sx(q[0]).toFixed(1) + ',' + sy(q[1]).toFixed(1)).join(' ')}" class="trace"/>`;
    st.values.forEach((v, i) => {
      const ok = thr == null || (d.thrDir === 'above' ? v >= thr : v < thr);
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
