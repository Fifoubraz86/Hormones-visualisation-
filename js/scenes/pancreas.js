/*
 * Module satellite « Pancréas » : physiologie exocrine et endocrine, hormones digestives et tumeurs
 * neuroendocrines pancréatiques (gastrinome, insulinome, glucagonome, VIPome, somatostatinome).
 * Un modèle commun (estomac, duodénum, pancréas exocrine, îlots, intestin) anime la scène et ses loupes
 * (zoom-pancreas.js) : chaque TNE y est une sécrétion hormonale autonome qui dérègle le tube digestif.
 * Sources : Les fondamentaux de la pathologie digestive, CDU-HGE / SNFGE, chapitre 7 « Pancréas »
 * (octobre 2014, « SNFGE p. ») ; CEEDMM / SFE, item 308 « Tumeurs neuroendocrines du pancréas » (2022, « SFE ») ;
 * TNCD, chapitre 11 « Néoplasies neuroendocrines digestives » (07/09/2026, « TNCD p. »). Le reste est « (complément) ».
 */
(function () {
  'use strict';
  const HV = window.HV;
  const clamp = HV.clamp;
  const ex = Math.exp, pw = Math.pow, lg = Math.log10;
  const f1 = (v) => v.toFixed(1).replace('.', ',');
  const f2 = (v) => v.toFixed(2).replace('.', ',');
  const pct = (v) => Math.round(v * 100) + ' %';
  const x1 = (v) => '×' + f1(v);
  const onoff = (v) => (v > 0 ? 'oui' : 'non');

  /* ===================== Modèle ===================== */
  // Grandeurs normalisées (1 = sujet sain à jeun) sauf mention. Paramètres tumoraux : sécrétion autonome
  // exprimée en multiples de la sécrétion normale. La somatostatine (tumorale ou analogue) freine presque
  // toutes les sécrétions digestives et pancréatiques, d'où trois facteurs d'inhibition.
  const SIM = {
    title: 'Bilan pancréatique et digestif simulé',
    defaults: { exo: 1, meal: 0, gas: 0, ins: 0, glu: 0, vip: 0, sst: 0, ipp: 0, asm: 0, pert: 0, sec: 0, long: 0 },
    init: { gastrin: 1, acid: 1, sec: 1, cck: 1, enz: 1, bic: 1, duo: 6.5, lip: 1, gb: 1, steat: 3, g: 0.9, ins: 1, insE: 1, glucagon: 1,
      vip: 1, sstp: 1, stool: 0.15, k: 4.2, hco3: 26, cga: 1, aa: 1, elast: 450 },
    tau: { gastrin: 0.35, acid: 0.4, sec: 0.3, cck: 0.3, enz: 0.4, bic: 0.4, duo: 0.4, lip: 0.4, gb: 0.5, steat: 1.5, g: 0.8, ins: 0.4, insE: 0.4,
      glucagon: 0.5, vip: 0.5, sstp: 0.4, stool: 1.2, k: 1.8, hco3: 1.8, cga: 2.5, aa: 2.5, elast: 2 },
    targets(p, s) {
      const Isst = 1 / (1 + 0.12 * p.sst + p.asm); // tube digestif, pancréas exocrine
      const Ib = 1 / (1 + 0.3 * p.sst + 1.2 * p.asm); // cellules β (la somatostatine freine surtout l'insuline)
      const Ia = 1 / (1 + 0.06 * p.sst + 1.2 * p.asm); // cellules α
      const meal = p.meal;
      // Sécrétions tumorales autonomes, freinées par les analogues de la somatostatine selon les récepteurs SST2.
      const tGas = p.gas * (1 - 0.5 * p.asm), tIns = p.ins * (1 - 0.3 * p.asm), tGlu = p.glu * (1 - 0.6 * p.asm);
      const tVip = p.vip * (1 - 0.75 * p.asm), tSst = p.sst * (1 - 0.5 * p.asm);
      // Gastrine : cellules G de l'antre (stimulées par le repas, freinées par l'acidité et la somatostatine).
      // Le gastrinome n'obéit pas à l'acidité et la sécrétine le stimule paradoxalement (test à la sécrétine).
      const physio = Isst * (1 + 0.5 * meal) * clamp(pw(Math.max(s.acid, 0.02), -0.5), 0.4, 6) * (1 - 0.3 * p.sec);
      const gastrin = physio + tGas * (1 + 2.5 * p.sec);
      // Acide : cellules pariétales (gastrine, histamine des cellules ECL) ; IPP, somatostatine et VIP freinent.
      const vipF = 1 / (1 + 0.25 * Math.max(0, s.vip - 1));
      const acid = clamp(Isst * (1 - 0.96 * p.ipp) * (0.35 + 0.65 * pw(Math.max(s.gastrin, 0.01), 0.6)) * vipF, 0.02, 12);
      // Duodénum : l'acide libère la sécrétine (cellules S), les graisses et protéines la CCK (cellules I).
      const sec = Isst * (0.4 + 0.6 * Math.min(s.acid, 6)) * (1 + 0.5 * meal) + 4 * p.sec;
      const cck = Isst * (1 + 3 * meal);
      // Pancréas exocrine : enzymes (acini, CCK) et bicarbonates (canaux, sécrétine ; VIP aussi).
      const enz = p.exo * Isst * (0.4 + 0.6 * s.cck);
      const bic = p.exo * Isst * (0.4 + 0.6 * Math.min(s.sec, 3)) * (1 + 0.3 * pw(Math.max(0, s.vip - 1), 0.5));
      // pH duodénal : bicarbonates contre acide gastrique.
      const duo = clamp(6.5 + 2.5 * lg(Math.max(s.bic, 0.005) / pw(Math.max(s.acid, 0.02), 2)), 2.5, 8);
      // Lipase active : enzymes endogènes + extraits pancréatiques, inactivés en milieu acide.
      const lip = (s.enz + 0.6 * p.pert) * clamp((s.duo - 2.5) / 2.5, 0.3, 1);
      // Vésicule biliaire : contraction sous CCK ; la somatostatine la freine (stase, lithiase).
      const gb = Isst * (0.3 + 0.7 * s.cck);
      // Digestion des graisses : stéatorrhée quand > 80 % de la fonction est perdue (SNFGE p. 13).
      const digest = clamp((1 - 0.97 * ex(-s.lip / 0.07)) * (0.75 + 0.25 * clamp(s.gb, 0, 1)), 0, 1);
      const steat = 3 + 45 * (1 - digest);
      // Îlots : insuline (glycémie), glucagon (hypoglycémie), sécrétions tumorales.
      const insE = Ib * clamp((s.g - 0.65) * 4, 0, 8);
      const ins = insE + tIns;
      const glucagon = Ia * clamp(1.3 + 4 * Math.max(0, 0.85 - s.g) - 0.3 * Math.min(s.ins, 2), 0.1, 6) + tGlu;
      const prod = (0.55 + 0.45 * s.glucagon + 0.05 * Math.max(0, s.vip - 1)) * (1 + 5 * Math.max(0, 0.6 - s.ins)) * (1 - 0.45 * p.long) / (1 + 0.8 * s.ins);
      const absorb = (meal * 1.2 * (0.4 + 0.6 * digest)) / (0.4 + 0.6 * Math.min(s.ins, 3));
      const g = clamp(0.12 + absorb + 1.4 * prod, 0.25, 6);
      // VIP : sécrétion intestinale d'eau et d'électrolytes (diarrhée hydrique, hypokaliémie, acidose).
      const vip = 1 + tVip;
      const sstp = (0.8 + 0.6 * meal) + tSst;
      const stool = 0.15 + 0.45 * pw(Math.max(0, s.vip - 1), 0.8) + 0.25 * Math.max(0, s.acid - 1.5) + 0.012 * Math.max(0, s.steat - 6);
      const k = clamp(4.2 - 0.45 * Math.max(0, s.stool - 0.3), 2.1, 5.2);
      const hco3 = clamp(26 - 2.6 * Math.max(0, s.stool - 0.3), 10, 30);
      // Chromogranine A : masse tumorale et hyperplasie des cellules ECL (hypergastrinémie, IPP).
      const cga = 1 + 0.06 * (p.gas + p.glu + p.vip + p.sst) + 0.02 * p.ins + 0.5 * pw(Math.max(0, s.gastrin - 1.5), 0.6);
      const aa = 1 / (1 + 0.3 * Math.max(0, s.glucagon - 1)); // acides aminés : catabolisme hépatique (glucagon)
      const elast = clamp(450 * p.exo * pw(Isst, 0.5), 5, 900); // élastase fécale (non apportée par les extraits)
      return { gastrin, acid, sec, cck, enz, bic, duo, lip, gb, steat, insE, ins, glucagon, g, vip, sstp, stool, k, hco3, cga, aa, elast };
    },
    labs: [
      { key: 'gastrin', name: 'Gastrinémie à jeun', unit: 'pg/mL', range: '< 100 pg/mL ; gastrinome > 3 N (TNCD p. 6)', k: 60, lo: 0, hi: 100, min: 10, max: 8000, log: true, dec: 0 },
      { key: 'ph', name: 'pH gastrique', unit: '', range: '1,5–3,5 à jeun (complément) ; gastrinome ≤ 2', lo: 1.5, hi: 3.5, min: 0.5, max: 8, dec: 1, fn: (s, p) => clamp(2 - 2 * lg(Math.max(s.acid, 0.02)) + 0.8 * p.meal, 0.8, 7.5) },
      { key: 'g', name: 'Glycémie', unit: 'g/L', range: 'à jeun 0,80–1,10 g/L', k: 1, lo: 0.7, hi: 1.26, min: 0.2, max: 4, dec: 2 },
      { key: 'ins', name: 'Insulinémie', unit: 'mU/L', range: '2–25 mU/L (complément)', k: 4, lo: 2, hi: 25, min: 0.5, max: 200, log: true, dec: 1 },
      { key: 'pepc', name: 'Peptide C', unit: 'ng/mL', range: '0,8–3 ng/mL à jeun (complément)', lo: 0.8, hi: 3, min: 0.05, max: 30, log: true, dec: 1, fn: (s) => 0.9 + 0.9 * s.ins },
      { key: 'glucagon', name: 'Glucagonémie', unit: 'pg/mL', range: '50–150 pg/mL (complément) ; glucagonome > 2 N', k: 80, lo: 30, hi: 150, min: 10, max: 4000, log: true, dec: 0 },
      { key: 'vip', name: 'VIP plasmatique', unit: 'pg/mL', range: '< 100 pg/mL (complément) ; VIPome > 2 N', k: 35, lo: 0, hi: 100, min: 5, max: 2000, log: true, dec: 0 },
      { key: 'sstp', name: 'Somatostatine plasmatique', unit: 'pg/mL', range: '< 25 pg/mL (complément)', k: 12, lo: 0, hi: 25, min: 2, max: 2000, log: true, dec: 0 },
      { key: 'k', name: 'Kaliémie', unit: 'mmol/L', range: '3,5–5,0 mmol/L', k: 1, lo: 3.5, hi: 5, min: 2, max: 6.5, dec: 1 },
      { key: 'hco3', name: 'Bicarbonates plasmatiques', unit: 'mmol/L', range: '22–29 mmol/L (complément)', k: 1, lo: 22, hi: 29, min: 8, max: 34, dec: 0 },
      { key: 'stool', name: 'Volume des selles', unit: 'L/24 h', range: '< 0,3 L/24 h (complément)', k: 1, lo: 0, hi: 0.3, min: 0, max: 6, dec: 1 },
      { key: 'steat', name: 'Débit fécal de graisses', unit: 'g/24 h', range: '≤ 6 g/24 h (SNFGE p. 16)', k: 1, lo: 0, hi: 6, min: 0, max: 50, dec: 0 },
      { key: 'elast', name: 'Élastase fécale', unit: 'µg/g', range: '> 200 µg/g ; < 100 : IPE (SNFGE p. 16)', k: 1, lo: 200, hi: 2000, min: 5, max: 900, dec: 0 },
      { key: 'cga', name: 'Chromogranine A', unit: '× N', range: 'valeur relative (complément)', k: 1, lo: 0, hi: 1.3, min: 0.5, max: 20, log: true, dec: 1 }
    ],
    params: [
      { key: 'meal', label: 'Repas (phase intestinale)', min: 0, max: 1, step: 0.05, fmt: pct },
      { key: 'exo', label: 'Parenchyme exocrine fonctionnel', min: 0.02, max: 1.2, step: 0.01, fmt: pct },
      { key: 'gas', label: 'Gastrinome', min: 0, max: 40, step: 0.5, fmt: x1 },
      { key: 'ins', label: 'Insulinome', min: 0, max: 10, step: 0.1, fmt: x1 },
      { key: 'glu', label: 'Glucagonome', min: 0, max: 30, step: 0.5, fmt: x1 },
      { key: 'vip', label: 'VIPome', min: 0, max: 30, step: 0.5, fmt: x1 },
      { key: 'sst', label: 'Somatostatinome', min: 0, max: 40, step: 0.5, fmt: x1 },
      { key: 'ipp', label: 'Inhibiteur de la pompe à protons', min: 0, max: 1, step: 1, fmt: onoff },
      { key: 'asm', label: 'Analogue de la somatostatine', min: 0, max: 1, step: 1, fmt: onoff },
      { key: 'pert', label: 'Extraits pancréatiques (repas)', min: 0, max: 1, step: 1, fmt: onoff }
    ],
    scenarios: [
      { id: 'eu', name: 'Sujet sain à jeun', note: 'Sécrétions de base : gastrine et acide modérés, pancréas au repos, insuline et glucagon équilibrés.', p: {} },
      { id: 'repas', name: 'Après un repas', note: 'Phase intestinale : l\'acide libère la sécrétine (bicarbonates), les graisses et protéines la CCK (enzymes, contraction vésiculaire) ; l\'insuline monte (SNFGE p. 10).', p: { meal: 1 } },
      { id: 'ipp', name: 'Sujet sain sous IPP', note: 'Piège : l\'achlorhydrie lève le frein acide sur les cellules G. Gastrine et chromogranine A montent sans tumeur ; arrêter les IPP 7 à 14 jours avant un dosage de chromogranine A, sauf syndrome de Zollinger-Ellison (TNCD p. 12).', p: { ipp: 1 } },
      { id: 'gastrinome', name: 'Gastrinome (Zollinger-Ellison)', note: 'Gastrine autonome : hypersécrétion acide, ulcères œso-gastro-duodénaux récidivants, diarrhée résolutive sous IPP (SFE) ; gastrinémie à jeun > 3 N avec pH gastrique ≤ 2 (TNCD p. 6).', p: { gas: 20 } },
      { id: 'gastrinomeT', name: 'Gastrinome sous IPP à forte dose', note: 'IPP à forte dose (40 à 60 mg deux fois par jour d\'équivalent oméprazole), à ne jamais interrompre : l\'acide et la diarrhée sont contrôlés, la gastrinémie reste > 10 N (TNCD p. 6 et 18).', p: { gas: 20, ipp: 1 } },
      { id: 'insulinome', name: 'Insulinome', note: 'TNE fonctionnelle la plus fréquente : insuline autonome, hypoglycémies de jeûne avec insuline ≥ 3 mU/L et peptide C élevé devant une glycémie < 0,45 g/L (TNCD p. 5-6).', p: { ins: 8 } },
      { id: 'glucagonome', name: 'Glucagonome', note: 'Glucagon > 2 N : diabète déséquilibré, perte de poids, érythème nécrolytique migrateur, diarrhée, thromboses, anémie (SFE ; TNCD p. 6).', p: { glu: 14 } },
      { id: 'glucagonomeT', name: 'Glucagonome sous analogue de la somatostatine', note: 'Les analogues de la somatostatine, traitement antisécrétoire de première intention, améliorent le syndrome dans plus de 60 % des cas ; corriger aussi la glycémie et les carences (TNCD p. 20).', p: { glu: 14, asm: 1 } },
      { id: 'vipome', name: 'VIPome (Verner-Morrison)', note: 'VIP > 2 N : diarrhée sécrétoire profuse, déshydratation, hypokaliémie, acidose métabolique, flushs, hypercalcémie (SFE ; TNCD p. 6).', p: { vip: 12 } },
      { id: 'vipomeT', name: 'VIPome sous analogue de la somatostatine', note: 'Hydratation intensive et correction hydroélectrolytique ; les analogues de la somatostatine, en première intention, améliorent la diarrhée dans environ 67 % des cas (TNCD p. 19).', p: { vip: 12, asm: 1 } },
      { id: 'somato', name: 'Somatostatinome', note: 'Hypersécrétion de somatostatine, très rare : diarrhée avec stéatorrhée, hyperglycémie, lithiase vésiculaire (TNCD p. 6) ; hypochlorhydrie (complément).', p: { sst: 25 } },
      { id: 'ipe', name: 'Insuffisance pancréatique exocrine', note: 'Pancréatite chronique évoluée : plus de 80 % de la fonction perdue, stéatorrhée > 6 g/24 h, élastase fécale < 100 µg/g (SNFGE p. 13 et 16).', p: { exo: 0.07, meal: 1 } },
      { id: 'ipeT', name: 'IPE traitée par extraits pancréatiques', note: 'Les extraits apportés au repas corrigent l\'essentiel de la stéatorrhée (SNFGE p. 17) ; l\'élastase fécale reste basse (enzyme humaine non apportée).', p: { exo: 0.07, meal: 1, pert: 1 } }
    ],
    interpret(s, p, L) {
      const gas = L('gastrin'), ph = L('ph'), g = L('g'), ins = L('ins'), glu = L('glucagon'), vip = L('vip'), sst = L('sstp');
      const st = L('stool'), fat = L('steat'), el = L('elast');
      if (g < 0.45 && ins >= 3) return { tone: 'bad', label: 'Hypoglycémie hyperinsulinique', text: 'Glycémie < 0,45 g/L avec insuline ≥ 3 mU/L et peptide C élevé, sans sulfamide ni glinide : insulinome (TNCD p. 6 et 13). Prévenir les hypoglycémies dès le diagnostic évoqué.' };
      if (gas > 1000 && p.ipp > 0) return { tone: 'bad', label: 'Gastrinome sous IPP', text: 'Gastrinémie > 10 N sous IPP : syndrome de Zollinger-Ellison. Les IPP ne doivent jamais être arrêtés (risque d\'hémorragie et de perforation) ; test à la sécrétine en centre expert si besoin (TNCD p. 6 et 14).' };
      if (gas > 300 && ph <= 2) return { tone: 'bad', label: 'Gastrinome (Zollinger-Ellison)', text: 'Gastrinémie à jeun > 3 N avec pH gastrique ≤ 2 : syndrome de Zollinger-Ellison (TNCD p. 6). Rechercher une NEM 1 (probabilité ≈ 25 % ; TNCD p. 14).' };
      if (vip > 200 && st > 1) return { tone: 'bad', label: 'VIPome (syndrome de Verner-Morrison)', text: 'Diarrhée sécrétoire profuse, hypokaliémie, acidose métabolique et VIP > 2 N (TNCD p. 6). Urgence hydroélectrolytique.' };
      if (p.vip > 0 && p.asm > 0 && vip > 100) return { tone: 'warn', label: 'VIPome sous analogue de la somatostatine', text: 'VIP encore élevé mais sécrétion freinée : diarrhée réduite (' + f1(st) + ' L/24 h), kaliémie qui remonte. Poursuivre la réhydratation et la correction du potassium (TNCD p. 19).' };
      if (glu > 300) return { tone: 'bad', label: 'Glucagonome', text: 'Glucagon > 2 N' + (g >= 1.26 ? ', diabète' : '') + ', acides aminés effondrés (' + Math.round(s.aa * 100) + ' % de la normale) : érythème nécrolytique migrateur, perte de poids, thromboses (TNCD p. 6).' };
      if (sst > 100) return { tone: 'bad', label: 'Somatostatinome', text: 'Somatostatine très élevée : hyperglycémie, stéatorrhée (' + Math.round(fat) + ' g/24 h), lithiase vésiculaire (TNCD p. 6) ; hypochlorhydrie (complément).' };
      if (gas > 100 && ph >= 4) return { tone: 'warn', label: 'Hypergastrinémie réactionnelle', text: 'IPP : achlorhydrie, gastrine et chromogranine A élevées sans tumeur. Toute hypergastrinémie fausse la chromogranine A (TNCD p. 12).' };
      if (fat > 6 && el < 200) return { tone: p.pert > 0 ? 'warn' : 'bad', label: 'Insuffisance pancréatique exocrine', text: 'Stéatorrhée ' + Math.round(fat) + ' g/24 h (> 6 g) et élastase fécale ' + Math.round(el) + ' µg/g' + (el < 100 ? ' (< 100 : IPE)' : '') + ' : maldigestion des graisses, la lipase n\'étant produite que par le pancréas (SNFGE p. 16).' };
      if (el < 100) return { tone: 'good', label: 'IPE compensée par les extraits', text: 'Élastase fécale basse (fonction exocrine détruite), mais stéatorrhée corrigée par les extraits pancréatiques pris au repas (SNFGE p. 17).' };
      if (p.meal > 0.3) return { tone: 'good', label: 'Digestion normale', text: 'Sécrétine → bicarbonates, CCK → enzymes et vésicule ; le suc pancréatique (≈ 1,5 L/j, pH 8,2–8,4) neutralise l\'acide (SNFGE p. 7).' };
      return { tone: 'good', label: 'Pancréas normal', text: 'Hormones digestives, pancréatiques et digestion dans les normes.' };
    }
  };
  const sim = HV.makeSim('pancreas', SIM);
  HV.PANC = { sim, SIM };

  // Les loupes, posées hors du cadre, font avancer le modèle quand la scène principale est masquée.
  let lastStep = 0;
  HV.PANC.keepAlive = function (dt) {
    if (!(dt > 0)) return;
    const now = performance.now();
    if (now - (HV.PANC.mainT || 0) < 40 || now - lastStep < 4) return; // la scène principale anime déjà le modèle
    lastStep = now;
    sim.step(dt);
  };
  // Choisit un scénario depuis un bouton de la scène (et coche le scénario du panneau s'il est affiché).
  HV.PANC.play = function (id) {
    const r = document.getElementById('sc-pancreas-' + id);
    if (r) { r.checked = true; r.dispatchEvent(new Event('change')); return; }
    if (HV.Tests) HV.Tests.reset();
    sim.active = id;
    sim.setScenario(id);
  };

  /* ===================== Tests dynamiques ===================== */
  const n0 = (v) => Math.round(v).toLocaleString('fr-FR');
  HV.TESTS.pancreas = [
    {
      id: 'secretine', name: 'Test à la sécrétine', poly: false,
      what: 'Suspicion de syndrome de Zollinger-Ellison avec gastrinémie peu élevée : la sécrétine stimule paradoxalement le gastrinome, alors qu\'elle freine les cellules G normales (mécanisme : complément).',
      proto: 'Sécrétine IV ; gastrinémie avant puis à 2, 5, 10 et 15 min (complément). Positif si la gastrine augmente d\'au moins 120 pg/mL. Si disponible, en centre expert : modifier les IPP expose à l\'hémorragie et à la perforation (TNCD p. 6 et 14).',
      unit: 'pg/mL', label: 'Gastrine', span: 15, xUnit: 'min', duration: 12,
      thrFn: (st) => (st.values.length ? st.values[0] + 120 : null), thrDir: 'below', thrLabel: 'base + 120 pg/mL',
      samples: [{ x: 0.05, label: 'T0' }, { x: 0.2, label: '2' }, { x: 0.4, label: '5' }, { x: 0.7, label: '10' }, { x: 1, label: '15' }],
      apply(p, x) { p.sec = x > 0.08 ? ex(-pw((x - 0.35) / 0.3, 2)) : 0; },
      measure: (s) => s.lab('gastrin'),
      interpret(v) {
        const d = Math.max(...v) - v[0];
        if (d >= 120) return { tone: 'bad', text: `Gastrine de base ${n0(v[0])} pg/mL, augmentation maximale de ${n0(d)} pg/mL (≥ 120) : réponse paradoxale, en faveur d'un gastrinome (TNCD p. 6).` };
        return { tone: 'good', text: `Gastrine de base ${n0(v[0])} pg/mL, variation maximale ${n0(d)} pg/mL (< 120) : pas de réponse paradoxale. Une hypergastrinémie réactionnelle (IPP, gastrite atrophique) est plus probable.` };
      }
    },
    {
      id: 'jeune', name: 'Épreuve de jeûne de 72 h', poly: false,
      what: 'Recherche d\'un hyperinsulinisme endogène : au jeûne, l\'insuline doit s\'effondrer et la glycémie se maintenir.',
      proto: 'Jeûne en hospitalisation, dans un service spécialisé ; au malaise ou si glycémie < 0,45 g/L : insuline, proinsuline, peptide C, dosage des sulfamides et glinides (TNCD p. 6 et 13).',
      unit: 'g/L', label: 'Glycémie', thr: 0.45, thrDir: 'above', thrLabel: 'seuil 0,45 g/L (2,5 mmol/L)',
      span: 72, xUnit: 'h', duration: 16,
      samples: [{ x: 0.03, label: '0 h' }, { x: 0.33, label: '24 h' }, { x: 0.67, label: '48 h' }, { x: 1, label: '72 h' }],
      apply(p, x) { p.meal = 0; if (x > 0.04) p.long = Math.min(1, (x - 0.04) / 0.6); },
      measure: (s) => s.lab('g'),
      interpret(v, s) {
        const min = Math.min(...v), ins = s.lab('ins'), pc = s.lab('pepc');
        if (min >= 0.45) return { tone: 'good', text: `Glycémie minimale ${f2(min)} g/L sans hypoglycémie, insuline freinée (${f1(ins)} mU/L) : pas d'hyperinsulinisme.` };
        if (ins >= 3) return { tone: 'bad', text: `Hypoglycémie ${f2(min)} g/L avec insuline ${f1(ins)} mU/L (≥ 3) et peptide C ${f1(pc)} ng/mL : hyperinsulinisme endogène (insuline ≥ 3 mU/L, proinsuline ≥ 5 pmol/L, peptide C élevé). Sulfamides et glinides négatifs : insulinome, à localiser (scanner, IRM, échoendoscopie, TEP au 68Ga-exendine si besoin ; TNCD p. 6 et 8).` };
        return { tone: 'warn', text: `Hypoglycémie ${f2(min)} g/L avec insuline freinée : cause non insulinique.` };
      }
    }
  ];

  /* ===================== Fiches ===================== */
  Object.assign(HV.INFO, {
    gastrin: { t: 'Gastrine', k: 'Cellules G de l\'antre gastrique · peptide (G-17, G-34)', d: 'Stimulée par le repas (protéines, distension) et freinée par l\'acidité de l\'antre et la somatostatine. Stimule les cellules pariétales (sécrétion d\'acide) directement et via l\'histamine des cellules ECL ; effet trophique sur la muqueuse fundique (complément).' },
    cck: { t: 'Cholécystokinine (CCK)', k: 'Cellules I du duodénum et du jéjunum', d: 'Libérée par les acides gras et les acides aminés arrivant dans le duodénum. Stimule la sécrétion enzymatique des acini (récepteur CCK-A, voie PLC – IP3 – Ca²⁺) directement et par les afférences vagales ; contracte la vésicule biliaire (SNFGE p. 10).' },
    secretin: { t: 'Sécrétine', k: 'Cellules S du duodénum', d: 'Libérée par l\'acidification du chyme duodénal. Plus puissant stimulant de la sécrétion d\'eau et de bicarbonates : récepteur couplé à l\'adénylate cyclase, AMPc, PKA, ouverture du canal CFTR (SNFGE p. 10). Freine la gastrine normale mais stimule le gastrinome (complément).' },
    vip: { t: 'VIP', k: 'Peptide vasoactif intestinal · 28 acides aminés (complément)', d: 'Neuromédiateur des plexus digestifs : sécrétion intestinale d\'eau et d\'électrolytes (AMPc), vasodilatation, relâchement des muscles lisses ; stimule la sécrétion de bicarbonates et freine l\'acide gastrique. Son excès tumoral donne une diarrhée hydrique massive (complément).' },
    ppol: { t: 'Polypeptide pancréatique (PP)', k: 'Cellules PP des îlots · 36 acides aminés', d: 'L\'une des quatre hormones des îlots (SNFGE p. 7). Freine la sécrétion pancréatique exocrine et la contraction vésiculaire ; marqueur non spécifique des TNE pancréatiques (complément).' },
    hplus: { t: 'Acide chlorhydrique (H⁺)', k: 'Cellules pariétales du fundus', d: 'Pompe à protons H⁺/K⁺-ATPase, stimulée par la gastrine, l\'histamine et l\'acétylcholine, bloquée par les IPP (complément). Dans le duodénum, l\'acide libère la sécrétine (SNFGE p. 10).' },
    hco3: { t: 'Bicarbonates (HCO₃⁻)', k: 'Cellules canalaires du pancréas', d: 'Échange chlore/bicarbonates et canal CFTR ; le suc pancréatique a un pH de 8,2 à 8,4 qui neutralise l\'acide et donne aux enzymes leur pH optimal (SNFGE p. 7).' },
    enzyme: { t: 'Enzymes pancréatiques', k: 'Cellules acineuses (85 % de la masse pancréatique)', d: 'Trypsine (protides), amylase (glucides), lipase (lipides). La plupart sont sécrétées en proenzymes inactives, activées dans le duodénum par l\'entérokinase et la trypsine ; la lipase et l\'amylase sont sécrétées actives (SNFGE p. 6-9).' },
    'pz-panc': { t: 'Pancréas', k: '20 cm, 60 à 80 g, devant L1-L2 (SNFGE p. 2)', d: 'Tête enchâssée dans le cadre duodénal, isthme devant la veine porte, corps et queue vers la rate. Glande exocrine (acini, 85 %) et endocrine (îlots, 1 à 2 %, surtout dans la queue).' },
    'pz-wirsung': { t: 'Canal de Wirsung', k: 'Canal pancréatique principal, 2 à 4 mm (SNFGE p. 2-3)', d: 'Naît dans la queue, parcourt la glande et rejoint le cholédoque dans l\'ampoule hépatopancréatique (papille majeure, D2). Le canal de Santorini draine le haut de la tête (papille mineure).' },
    'pz-chol': { t: 'Cholédoque et ampoule de Vater', k: 'Voie biliaire principale', d: 'Traverse la tête du pancréas : une tumeur ou une pancréatite de la tête peut la comprimer (cholestase, ictère ; SNFGE p. 13). Un calcul bloqué dans l\'ampoule déclenche la pancréatite biliaire.' },
    'pz-gb': { t: 'Vésicule biliaire', k: 'Contraction postprandiale sous CCK', d: 'Libère la bile qui émulsionne les graisses. La somatostatine (somatostatinome, analogues) freine sa contraction : stase et lithiase biliaire (complément).' },
    'pz-stom': { t: 'Estomac', k: 'Fundus : cellules pariétales et ECL · antre : cellules G et D', d: 'La gastrine de l\'antre stimule la sécrétion acide du fundus ; l\'acidité, via les cellules D (somatostatine), freine la gastrine : boucle de rétrocontrôle (complément).' },
    'pz-duo': { t: 'Duodénum', k: 'Cellules S (sécrétine), I (CCK), K (GIP)', d: 'Lieu de rencontre de l\'acide, de la bile et du suc pancréatique. Siège de la majorité des gastrinomes dans le « triangle des gastrinomes » (complément, TNCD).' },
    'pz-gut': { t: 'Intestin grêle', k: 'Absorption ; cellules L (GLP-1, PYY) ; plexus à VIP', d: 'Le VIP des neurones des plexus commande la sécrétion d\'eau et d\'électrolytes ; son excès tumoral la déborde (diarrhée sécrétoire).' },
    'pz-liver': { t: 'Foie', k: 'Reçoit le sang portal pancréatique', d: 'Premier organe exposé à l\'insuline et au glucagon. Lieu le plus fréquent des métastases des TNE pancréatiques (complément).' },
    'pz-gcell': { t: 'Cellules G', k: 'Antre gastrique · gastrine', d: 'Stimulées par les protéines du repas, freinées par l\'acidité (pH antral < 3) et la somatostatine. Sous IPP, le frein acide disparaît : hypergastrinémie réactionnelle (complément).' },
    'pz-pariet': { t: 'Cellules pariétales', k: 'Fundus · HCl et facteur intrinsèque', d: 'Leur pompe à protons est la cible des IPP. Sous l\'effet trophique d\'une gastrine très élevée, la muqueuse fundique s\'épaissit (gros plis du Zollinger-Ellison ; complément).' },
    'pz-dcell': { t: 'Cellules D', k: 'Estomac, duodénum, îlots · somatostatine', d: 'Frein paracrine général : gastrine, acide, insuline, glucagon, sécrétions pancréatique et biliaire (complément).' },
    'pz-scell': { t: 'Cellules S', k: 'Duodénum · sécrétine', d: 'Répondent à l\'acidification du chyme duodénal (SNFGE p. 10).' },
    'pz-icell': { t: 'Cellules I', k: 'Duodénum, jéjunum · CCK', d: 'Répondent aux acides gras et aux acides aminés (SNFGE p. 10).' },
    'pz-acini': { t: 'Acini', k: '85 % de la masse pancréatique (SNFGE p. 6)', d: 'Les cellules acineuses synthétisent les enzymes, stockées dans les granules de zymogène et libérées par exocytose sous CCK et acétylcholine.' },
    'pz-islets': { t: 'Îlots de Langerhans', k: '1 à 2 % de la masse, surtout dans la queue (SNFGE p. 1 et 7)', d: 'Cellules β (insuline), α (glucagon), δ (somatostatine), PP (polypeptide pancréatique). Clic : l\'îlot et la cellule β.' },
    'pz-portal': { t: 'Veine porte', k: 'Drainage veineux du pancréas (SNFGE p. 5)', d: 'Insuline et glucagon passent d\'abord par le foie.' },
    'pz-ulcer': { t: 'Ulcères duodénaux', k: 'Hypersécrétion acide', d: 'Ulcères multiples, récidivants, post-bulbaires ou jéjunaux, œsophagite sévère : faire doser la gastrine (complément, TNCD).' },
    'pz-stones': { t: 'Lithiase biliaire', k: 'Stase vésiculaire', d: 'La somatostatine freine la CCK et la contraction de la vésicule : boue biliaire puis calculs (somatostatinome, traitement prolongé par analogues ; complément).' },
    'pz-calc': { t: 'Pancréatite chronique calcifiée', k: 'Fibrose, sténoses canalaires, calculs (SNFGE p. 10)', d: 'Les pancréatites répétées laissent une fibrose qui désorganise la glande ; les calcifications se forment dans les canaux. Évoluée, elle donne une insuffisance exocrine puis un diabète.' },
    'pz-pert': { t: 'Extraits pancréatiques', k: 'Microgranules gastrorésistants pris au repas', d: 'Apportent lipase, protéases et amylase d\'origine porcine. Ils corrigent la stéatorrhée de l\'insuffisance exocrine (SNFGE p. 17) ; l\'élastase fécale, humaine, reste basse.' }
  });
  const pdb = (id) => ({ label: 'RCSB PDB ' + id, url: 'https://www.rcsb.org/structure/' + id });
  Object.assign(HV.MOL_SHEETS, {
    gastrin: { cls: 'Peptide', rows: [['Formes', 'Gastrine-17 (petite gastrine, majoritaire en post-prandial), gastrine-34, C-terminal amidé (complément)'], ['Synthèse', 'Cellules G de l\'antre et du duodénum ; gastrinome'], ['Demi-vie', 'G-17 ≈ 5 min, G-34 ≈ 40 min (complément)'], ['Récepteur', 'CCK-B (CCK2), Gq (cellules pariétales et ECL)'], ['Effets', 'Sécrétion acide, trophicité fundique, hyperplasie ECL'], ['Dosage', 'À jeun ; < 100 pg/mL ; > 10 N avec pH < 2 : gastrinome (complément, TNCD)']], links: [] },
    cck: { cls: 'Peptide', rows: [['Formes', 'CCK-8 (sulfatée), CCK-33, CCK-58'], ['Synthèse', 'Cellules I du duodénum et du jéjunum'], ['Stimulus', 'Acides gras, acides aminés'], ['Récepteur', 'CCK-A (CCK1), Gq → PLC → IP3, DAG (SNFGE p. 10)'], ['Effets', 'Sécrétion enzymatique, contraction vésiculaire, relâchement du sphincter d\'Oddi, satiété (complément)']], links: [] },
    secretin: { cls: 'Peptide', rows: [['Structure', '27 acides aminés, famille du glucagon et du VIP (complément)'], ['Synthèse', 'Cellules S du duodénum'], ['Stimulus', 'Acidification du chyme duodénal'], ['Récepteur', 'Gs → AMPc → PKA → CFTR (SNFGE p. 10)'], ['Effets', 'Eau et bicarbonates pancréatiques et biliaires ; freine la gastrine'], ['Pharmacologie', 'Test à la sécrétine (gastrinome, fonction exocrine ; complément)']], links: [] },
    vip: { cls: 'Peptide', rows: [['Structure', '28 acides aminés, famille du glucagon et de la sécrétine'], ['Synthèse', 'Neurones des plexus digestifs ; VIPome'], ['Récepteurs', 'VPAC1, VPAC2, Gs → AMPc'], ['Effets', 'Sécrétion intestinale de Cl⁻ et d\'eau, vasodilatation, relâchement des muscles lisses, glycogénolyse'], ['Dosage', 'VIPome : VIP > 3 N lors d\'une diarrhée (complément, SFE)']], links: [] },
    ppol: { cls: 'Peptide', rows: [['Structure', '36 acides aminés, famille du NPY et du PYY (épingle PP)'], ['Synthèse', 'Cellules PP des îlots, surtout dans la tête'], ['Effets', 'Freine la sécrétion exocrine et la vésicule'], ['Intérêt', 'Marqueur peu spécifique des TNE pancréatiques non fonctionnelles (complément)']], links: [pdb('1BBA')] },
    hplus: { cls: 'Ion', rows: [['Origine', 'Pompe H⁺/K⁺-ATPase des cellules pariétales'], ['Débit', 'pH gastrique à jeun 1,5 à 3,5 (complément)'], ['Pharmacologie', 'IPP (oméprazole, ésoméprazole…) : bloquent la pompe']], links: [] },
    hco3: { cls: 'Ion', rows: [['Origine', 'Cellules canalaires : échangeur Cl⁻/HCO₃⁻ et CFTR (SNFGE p. 7)'], ['Suc pancréatique', '≈ 1,5 L/j, pH 8,2 à 8,4'], ['Pathologie', 'Mucoviscidose : CFTR défaillant, suc visqueux, obstruction canalaire']], links: [] },
    enzyme: { cls: 'Protéines (hydrolases)', rows: [['Protéases', 'Trypsinogène, chymotrypsinogène, proélastase, procarboxypeptidase (proenzymes)'], ['Lipolyse', 'Lipase (active) et procolipase, prophospholipase'], ['Glucides', 'Amylase (active)'], ['Activation', 'Entérokinase duodénale → trypsine → cascade (SNFGE p. 9)'], ['Protection', 'Granules de zymogène, inhibiteur de Kazal (SPINK1), flux canalaire, autorégulation de la trypsine']], links: [] }
  });
  HV.ORGAN_SHEETS.pancreas.title = 'Pancréas';
  HV.ORGAN_SHEETS.pancreas.cls = 'Glande exocrine et endocrine';
  HV.ORGAN_SHEETS.pancreas.rows = [
    ['Anatomie', '20 cm, 60 à 80 g ; tête, isthme, corps, queue ; devant L1-L2 ; tête dans le cadre duodénal (SNFGE p. 2)'],
    ['Canaux', 'Wirsung → ampoule avec le cholédoque (papille majeure, D2) ; Santorini → papille mineure (SNFGE p. 2-3)'],
    ['Exocrine', 'Acini (85 %) : enzymes ; canaux : eau et bicarbonates ; ≈ 1,5 L/j, pH 8,2–8,4 (SNFGE p. 6-7)'],
    ['Régulation exocrine', 'Sécrétine (cellules S, acide duodénal) → bicarbonates ; CCK (cellules I, graisses et acides aminés) → enzymes (SNFGE p. 10)'],
    ['Proportion endocrine', 'Îlots : 1 à 2 % de la masse, surtout dans la queue (SNFGE p. 1 et 7) ; ≈ 1 % selon le polycopié'],
    ['Cellules des îlots', 'β (insuline, majoritaires), α (glucagon) ; δ (somatostatine) et PP (polypeptide pancréatique)'],
    ['Régulation endocrine', 'Glucose (β), hypoglycémie (α) ; incrétines (GLP-1, GIP) et système nerveux autonome (complément)'],
    ['Pathologie exocrine', 'Pancréatites aiguës (biliaire, alcool : 40 % chacune) et chroniques ; insuffisance exocrine : stéatorrhée > 6 g/24 h, élastase < 100 µg/g (SNFGE p. 10, 14, 16)'],
    ['Pathologie endocrine', 'DT1, DT2 ; tumeurs neuroendocrines : insulinome, gastrinome, glucagonome, VIPome, somatostatinome, non fonctionnelles']
  ];
  HV.ORGAN_SHEETS.pancreas.links = HV.ORGAN_SHEETS.pancreas.links.concat([{ label: 'Radiopaedia : pancreatic neuroendocrine tumour', url: 'https://radiopaedia.org/search?q=pancreatic%20neuroendocrine%20tumour' }]);

  /* ===================== Scène ===================== */
  const BX = 1400; // colonne du bilan
  const def = HV.scene({
    id: 'pancreas', parent: 'atlas', x: 840, y: 1168, scale: 0.24, loupe: 'Pancréas exocrine, endocrine et TNE',
    title: 'Pancréas exocrine et endocrine', level: 'Organe',
    lead: 'Le pancréas, indissociable du duodénum, sécrète le suc pancréatique (enzymes des acini, bicarbonates des canaux) et, par ses îlots, l\'insuline, le glucagon, la somatostatine et le polypeptide pancréatique. Deux hormones duodénales le commandent : la sécrétine et la cholécystokinine (SNFGE p. 1-10). Les tumeurs neuroendocrines fonctionnelles sécrètent une hormone de façon autonome : choisissez un scénario pour voir le tube digestif se dérégler.',
    points: [
      'Sécrétine (cellules S, acide duodénal) → eau et bicarbonates ; CCK (cellules I, graisses et acides aminés) → enzymes et contraction vésiculaire (SNFGE p. 10).',
      'Suc pancréatique ≈ 1,5 L/j, pH 8,2–8,4 ; acini 85 %, îlots 1 à 2 % de la masse (SNFGE p. 6-7).',
      'Stéatorrhée (> 6 g/24 h) quand plus de 80 % de la fonction exocrine est perdue ; élastase fécale < 100 µg/g (SNFGE p. 13 et 16).',
      'TNE duodéno-pancréatiques : non fonctionnelles dans 80 % des cas, révélées par une sécrétion hormonale dans 20 % (SFE).',
      'Gastrinome : ulcères et diarrhée ; insulinome : hypoglycémies de jeûne ; glucagonome : diabète, érythème nécrolytique migrateur ; VIPome : diarrhée profuse, hypokaliémie ; somatostatinome : stéatorrhée, hyperglycémie, lithiase (TNCD p. 6).',
      'Pièges : les IPP élèvent la gastrine et la chromogranine A (TNCD p. 12).',
      'Loupes : pancréas exocrine, pancréatites, hormones digestives, classification des TNE et un modèle par tumeur.'
    ],
    source: 'Sources : Les fondamentaux de la pathologie digestive (CDU-HGE, SNFGE), chapitre 7 « Pancréas », octobre 2014 (« SNFGE p. ») ; CEEDMM / SFE, item 308 « Tumeurs neuroendocrines du pancréas », 2022 (« SFE ») ; TNCD, chapitre 11 « Néoplasies neuroendocrines digestives », 07/09/2026 (« TNCD p. ») ; polycopié CEEDMM 2023. Le reste est marqué « complément ».',
    legend: new Set(['gastrin', 'hplus', 'secretin', 'cck', 'hco3', 'enzyme', 'insulin', 'glucagon', 'sst', 'vip', 'water']),
    build(g, a) {
      def.sim = sim;
      a.frame('Pancréas exocrine et endocrine', 'Estomac · duodénum · pancréas · voies biliaires : hormones digestives et tumeurs neuroendocrines');

      /* ---- Anatomie ---- */
      const an = a.el('g', { class: 'pz-anat' });
      // Illustrations Servier (kit Digestive system) posées sur le tracé, qui reste en dessous comme zone de survol.
      const dress = HV.dressArt;
      // Foie et vésicule
      const liver = a.el('g', { 'data-info': 'pz-liver' }, an);
      a.path('M 80,240 C 90,180 200,160 320,170 C 420,178 500,190 520,220 C 530,250 470,280 420,300 C 360,330 300,370 230,390 C 160,410 90,380 80,320 Z', 'pz-liver', liver);
      dress(liver.firstChild, 'servier/dig-liver', 14);
      a.text(150, 260, 'Foie', 'pz-org-t', null, liver);
      const gbG = a.el('g', { 'data-info': 'pz-gb' }, an);
      dress(a.el('ellipse', { cx: 300, cy: 420, rx: 34, ry: 56, transform: 'rotate(-25 300 420)', class: 'pz-gb' }, gbG), 'servier/dig-gallbladder', 22);
      a.text(222, 492, 'Vésicule', 'pz-org-s', { anchor: 'end' }, gbG);
      const stones = a.el('g', { 'data-info': 'pz-stones', opacity: 0 }, an);
      [[292, 440, 9], [310, 452, 7], [298, 462, 6]].forEach(([x, y, r]) => a.el('circle', { cx: x, cy: y, r, class: 'pz-stone' }, stones));
      // Estomac
      const stom = a.el('g', { 'data-info': 'pz-stom' }, an);
      a.path('M 800,170 C 830,160 900,170 930,215 C 965,270 960,360 905,420 C 850,478 740,495 660,485 C 620,480 595,470 585,455 L 590,425 C 640,440 700,438 760,410 C 810,385 820,330 812,280 C 806,240 790,210 785,180 Z', 'pz-stomach', stom);
      dress(stom.firstChild, 'servier/dig-stomach', 10);
      a.text(880, 205, 'Estomac', 'pz-org-t', { anchor: 'middle' }, stom);
      // Duodénum, jéjunum, iléon
      const duoD = 'M 588,445 C 540,442 480,440 452,470 C 432,495 430,560 432,640 C 434,700 440,740 480,752 C 560,770 690,770 760,745 C 790,732 800,700 795,670';
      const gutD = 'M 795,670 C 860,690 980,700 1060,740 C 1110,770 1100,840 1030,850 C 940,862 820,820 720,840 C 640,856 600,880 640,900';
      const duoG = a.el('g', { 'data-info': 'pz-duo' }, an);
      a.path(duoD, 'pz-gut', duoG);
      a.path(duoD, 'pz-gut-l', duoG);
      a.text(395, 735, 'Duodénum', 'pz-org-t', { anchor: 'end' }, duoG);
      const gutG = a.el('g', { 'data-info': 'pz-gut' }, an);
      a.path(gutD, 'pz-gut', gutG);
      a.path(gutD, 'pz-gut-l', gutG);
      a.text(1100, 885, 'Intestin grêle', 'pz-org-t', { anchor: 'end' }, gutG);
      // Pancréas
      const pg = a.el('g', { 'data-info': 'pz-panc' }, an);
      dress(a.path('M 478,575 C 480,540 525,532 565,548 C 650,568 780,532 900,512 C 985,498 1055,470 1092,488 C 1112,500 1098,530 1062,542 C 985,566 905,580 805,596 C 705,612 630,616 608,642 C 592,690 566,718 528,714 C 490,710 474,680 476,640 Z', 'pz-panc', pg), 'servier/dig-pancreas-duct', 18);
      const acG = a.el('g', { 'data-info': 'pz-acini' }, an);
      [[520, 600], [560, 655], [530, 680], [650, 590], [700, 578], [940, 530], [1000, 512]].forEach(([x, y]) => {
        a.el('circle', { cx: x, cy: y, r: 13, class: 'acinus' }, acG);
        a.el('circle', { cx: x, cy: y, r: 4, class: 'acinus-n' }, acG);
      });
      const isG = a.el('g', { 'data-info': 'pz-islets' }, an);
      [[760, 572, 10], [860, 552, 11], [985, 528, 12], [1050, 506, 11], [620, 600, 8]].forEach(([x, y, r]) => a.el('circle', { cx: x, cy: y, r, class: 'pz-islet' }, isG));
      a.zoomable(isG, 'islet');
      a.text(1065, 450, 'Queue', 'pz-org-s', { anchor: 'middle' }, pg);
      a.text(760, 640, 'Corps', 'pz-org-s', { anchor: 'middle' }, pg);
      a.text(530, 770, 'Tête', 'pz-org-s', { anchor: 'middle' }, pg);
      a.text(820, 625, 'Pancréas', 'pz-org-t', null, pg);
      const calc = a.el('g', { 'data-info': 'pz-calc', opacity: 0 }, an);
      [[540, 610], [600, 628], [680, 596], [770, 585], [880, 548], [970, 530], [1040, 512], [720, 590]].forEach(([x, y]) => a.el('circle', { cx: x, cy: y, r: 4.5, class: 'pz-calc' }, calc));
      // Canaux : Wirsung et cholédoque jusqu'à l'ampoule (D2)
      const wD = 'M 1070,505 C 950,528 800,560 650,588 C 560,604 500,600 452,612';
      a.path(wD, 'pz-duct', null, { 'data-info': 'pz-wirsung' });
      const cD = 'M 322,372 C 360,420 410,470 432,530 C 444,566 450,590 452,612';
      a.path(cD, 'pz-bile', null, { 'data-info': 'pz-chol' });
      a.el('circle', { cx: 450, cy: 614, r: 8, class: 'pz-amp', 'data-info': 'pz-chol' });
      // Veine porte (sang des îlots vers le foie)
      const pD = 'M 760,572 C 700,500 560,380 420,300';
      a.path(pD, 'pz-portal', null, { 'data-info': 'pz-portal' });
      a.text(585, 395, 'veine porte', 'pz-org-s', { anchor: 'middle', attrs: { transform: 'rotate(37 585 395)', 'data-info': 'pz-portal' } });

      /* ---- Cellules endocrines du tube digestif ---- */
      const cell = (x, y, info, color, label, lx, ly, anchor) => {
        const cg = a.el('g', { 'data-info': info, style: `--c: var(--${color})` });
        a.el('circle', { cx: x, cy: y, r: 11, class: 'pz-cell' }, cg);
        if (label) a.text(lx, ly, label, 'pz-cell-t', { anchor: anchor || 'start', lh: 1.15 }, cg);
        return cg;
      };
      cell(870, 300, 'pz-pariet', 'p-red', ['Cellules pariétales', 'HCl'], 975, 290);
      cell(665, 462, 'pz-gcell', 'p-red2', ['Cellules G', 'gastrine'], 640, 520, 'middle');
      cell(720, 470, 'pz-dcell', 'p-grey', null);
      a.text(752, 520, ['Cellules D', 'somatostatine'], 'pz-cell-t', { anchor: 'middle', lh: 1.15, attrs: { 'data-info': 'pz-dcell' } });
      cell(436, 520, 'pz-scell', 'p-teal', ['Cellules S', 'sécrétine'], 395, 520, 'end');
      cell(436, 660, 'pz-icell', 'p-gold', ['Cellules I', 'CCK'], 395, 650, 'end');
      cell(1020, 718, 'pz-gut', 'p-magenta', ['Neurones à VIP', '(plexus)'], 1120, 690, 'end');

      /* ---- Flux hormonaux ---- */
      const S = sim.s, P = sim.p;
      const track = (d, color, kind) => a.path(d, 'ax-track ' + (kind || 'stim'), null, { style: `--mc: var(--${color})` });
      const fl = (d, mol, rate, o) => a.flow(d, Object.assign({ mol, rate, track: false, speed: 75, size: 1.25, max: 30 }, o || {}));
      const gD = 'M 665,450 C 700,400 790,360 862,312';
      track(gD, 'p-red2'); fl(gD, 'gastrin', () => 0.9 * clamp(S.gastrin, 0.05, 6));
      const hD = 'M 830,360 C 760,430 660,455 590,450 C 530,446 470,448 446,490';
      fl(hD, 'hplus', () => 1.2 * clamp(S.acid, 0.02, 6), { speed: 90 });
      const sD = 'M 448,522 C 500,540 560,560 610,585';
      track(sD, 'p-teal'); fl(sD, 'secretin', () => 0.9 * clamp(S.sec, 0.1, 5));
      const kD = 'M 448,662 C 500,665 540,640 560,620';
      track(kD, 'p-gold'); fl(kD, 'cck', () => 0.9 * clamp(S.cck, 0.1, 5));
      const kD2 = 'M 425,655 C 380,600 350,530 322,478';
      track(kD2, 'p-gold'); fl(kD2, 'cck', () => 0.6 * clamp(S.cck, 0.1, 5));
      fl(wD, 'enzyme', () => 1.1 * clamp(S.enz, 0.02, 5), { speed: 60 });
      fl(wD, 'hco3', () => 1.1 * clamp(S.bic, 0.02, 5), { speed: 70 });
      fl(cD, 'dot', () => 1.2 * clamp(S.gb, 0.05, 3), { style: 'fill: var(--o-gall)', speed: 60 });
      fl(pD, 'insulin', () => 0.8 * clamp(S.ins, 0.05, 8), { speed: 85 });
      fl(pD, 'glucagon', () => 0.7 * clamp(S.glucagon, 0.05, 8), { speed: 85 });
      const vD = 'M 1020,730 C 980,760 900,780 820,800';
      // VIP des plexus : sécrétion physiologique, constante ; le VIP en excès vient de la tumeur (VIPome).
      fl(vD, 'vip', () => 0.6 * clamp(S.vip, 0.5, 1));
      const vtD = 'M 902,582 C 910,660 890,740 850,800';
      track(vtD, 'p-magenta');
      fl(vtD, 'vip', () => 0.6 * clamp(S.vip - 1, 0, 14));
      fl(gutD, 'water', () => 2.5 * clamp(S.stool, 0.1, 6), { speed: 110, size: 1.1, max: 40 });
      // Somatostatine : frein paracrine (cellules D)
      const sstD = 'M 720,470 C 700,475 685,470 675,466';
      fl(sstD, 'sst', () => 0.6 * clamp(S.sstp, 0.3, 6), { speed: 30, size: 0.9 });
      const sInh = a.sign(700, 492, 'inhib');
      a.sign(905, 345, 'stim').set(1);
      a.sign(560, 568, 'stim').set(1);

      /* ---- Tumeurs (apparaissent avec le scénario) ---- */
      const TUM = [
        ['gas', 452, 562, 'tne-gastrinome', 'gastrinome', 330, 590],
        ['ins', 700, 600, 'tne-insulinome', 'insulinome', 700, 655],
        ['glu', 1080, 520, 'tne-glucagonome', 'glucagonome', 1080, 580],
        ['vip', 900, 560, 'tne-vipome', 'VIPome', 968, 600],
        ['sst', 500, 690, 'tne-somatostatinome', 'somatostatinome', 600, 820]
      ].map(([k, x, y, zid, lbl, lx, ly]) => {
        const tg = a.el('g', { class: 'pz-tum', opacity: 0, 'data-info': 'pz-t-' + k });
        a.el('circle', { cx: x, cy: y, r: 20, class: 'pz-tum-c' }, tg);
        a.text(lx, ly, lbl, 'les-lbl', { anchor: 'middle' }, tg);
        a.zoomable(tg, zid);
        return [k, tg];
      });
      Object.assign(HV.INFO, {
        'pz-t-gas': { t: 'Gastrinome', k: 'Duodénum (le plus souvent) ou pancréas', d: 'Clic : modèle du syndrome de Zollinger-Ellison.' },
        'pz-t-ins': { t: 'Insulinome', k: 'Pancréas, réparti dans toute la glande', d: 'Clic : modèle de l\'insulinome.' },
        'pz-t-glu': { t: 'Glucagonome', k: 'Corps et queue du pancréas', d: 'Clic : modèle du glucagonome.' },
        'pz-t-vip': { t: 'VIPome', k: 'Corps et queue du pancréas', d: 'Clic : modèle du syndrome de Verner-Morrison.' },
        'pz-t-sst': { t: 'Somatostatinome', k: 'Tête du pancréas ou région ampullaire', d: 'Clic : modèle du somatostatinome.' }
      });
      const ulc = a.el('g', { 'data-info': 'pz-ulcer', opacity: 0 });
      [[510, 452], [440, 590]].forEach(([x, y]) => a.el('ellipse', { cx: x, cy: y, rx: 11, ry: 7, class: 'pz-ulcer' }, ulc));
      a.text(510, 425, 'ulcères', 'les-lbl', { anchor: 'middle' }, ulc);
      const ipeL = a.text(1000, 470, 'calcifications', 'les-lbl', { anchor: 'middle', attrs: { opacity: 0, 'data-info': 'pz-calc' } });
      const stoneL = a.text(200, 505, 'lithiase', 'les-lbl', { attrs: { opacity: 0, 'data-info': 'pz-stones' } });
      const pertG = a.el('g', { opacity: 0, 'data-info': 'pz-pert' });
      [[640, 455], [610, 450], [560, 446]].forEach(([x, y]) => a.el('circle', { cx: x, cy: y, r: 6, class: 'pz-pert' }, pertG));
      a.text(560, 420, 'extraits', 'pz-org-s', { anchor: 'middle' }, pertG);

      /* ---- Bilan en direct ---- */
      const bil = a.el('g', { transform: `translate(${BX} 170)` });
      a.el('rect', { x: -18, y: -12, width: 196, height: 600, rx: 16, class: 'sr-note-bg' }, bil);
      a.text(0, 22, 'Bilan', 'sr-zone-t', null, bil);
      const BL = [['gastrin', 'Gastrine'], ['ph', 'pH gastrique'], ['g', 'Glycémie'], ['ins', 'Insuline'], ['glucagon', 'Glucagon'], ['vip', 'VIP'], ['sstp', 'Somatostatine'], ['k', 'K⁺'], ['stool', 'Selles'], ['steat', 'Graisses fécales']];
      const bilTxt = BL.map(([k, n], i) => {
        a.text(0, 56 + i * 53, n, 'sr-b-n', null, bil);
        return [k, a.text(0, 78 + i * 53, '', 'sr-b-v', null, bil)];
      });
      // Accès aux modèles des TNE
      a.text(BX - 18, 808, 'Modèles des TNE', 'lbl-s strong');
      [['Gastrinome', 'tne-gastrinome', 'gastrinome'], ['Insulinome', 'tne-insulinome', 'insulinome'], ['Glucagonome', 'tne-glucagonome', 'glucagonome'], ['VIPome', 'tne-vipome', 'vipome'], ['Somatostatinome', 'tne-somatostatinome', 'somato']].forEach(([t, zid], i) => {
        const pgg = a.el('g', { transform: `translate(${BX - 18 + (i % 2) * 100} ${826 + Math.floor(i / 2) * 44})` });
        a.el('rect', { width: i === 4 ? 196 : 94, height: 36, rx: 18, class: 'pz-pill' }, pgg);
        a.text(i === 4 ? 98 : 47, 24, t, 'pz-pill-t', { anchor: 'middle' }, pgg);
        a.zoomable(pgg, zid);
      });
      // Interprétation
      const note = a.el('g', { transform: 'translate(1150 170)' });
      a.el('rect', { width: 220, height: 600, rx: 16, class: 'sr-note-bg' }, note);
      a.text(16, 34, 'Lecture', 'sr-zone-t', null, note);
      const noteT = a.text(16, 70, '', 'pz-note', null, note);
      const noteB = a.text(16, 0, '', 'pz-note-b', null, note);
      a.text(1150, 808, 'Loupes', 'lbl-s strong');
      [['Pancréas exocrine', 'panc-exo'], ['Pancréatites', 'panc-patho'], ['Hormones digestives', 'panc-gi'], ['Classification des TNE', 'panc-tne']].forEach(([t, zid], i) => {
        const pgg = a.el('g', { transform: `translate(1150 ${826 + i * 36})` });
        a.el('rect', { width: 220, height: 30, rx: 15, class: 'pz-pill' }, pgg);
        a.text(110, 21, t, 'pz-pill-t', { anchor: 'middle' }, pgg);
        a.zoomable(pgg, zid);
      });
      const wrap = (str, n) => {
        const out = [];
        let cur = '';
        str.split(' ').forEach((w) => { if (cur && (cur + ' ' + w).length > n) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; });
        if (cur) out.push(cur);
        return out;
      };
      const setLines = (t, x, y, lines) => {
        t.textContent = '';
        t.setAttribute('y', y);
        lines.forEach((ln, i) => HV.el('tspan', { x, dy: i ? '1.3em' : 0, text: ln }, t));
      };

      HV.loupeCaptions(a, 'pancreas');

      a.dyn((dt) => {
        HV.PANC.mainT = performance.now();
        sim.step(dt);
        const Pp = sim.p;
        bilTxt.forEach(([k, t]) => {
          const L = sim.LABS.find((x) => x.key === k), v = sim.lab(k);
          const unit = { gastrin: ' pg/mL', ph: '', g: ' g/L', ins: ' mU/L', glucagon: ' pg/mL', vip: ' pg/mL', sstp: ' pg/mL', k: '', stool: ' L/j', steat: ' g/j' }[k];
          t.textContent = (L.dec ? (L.dec === 2 ? f2(v) : f1(v)) : Math.round(v).toLocaleString('fr-FR')) + unit + (v > L.hi ? ' ↑' : v < L.lo ? ' ↓' : '');
          t.classList.toggle('hi', v > L.hi);
          t.classList.toggle('lo', v < L.lo);
        });
        TUM.forEach(([k, tg]) => tg.setAttribute('opacity', Pp[k] > 0.05 ? 1 : 0));
        ulc.setAttribute('opacity', S.acid > 2.5 ? 1 : 0);
        const ipe = Pp.exo < 0.4;
        calc.setAttribute('opacity', ipe ? 1 : 0);
        ipeL.setAttribute('opacity', ipe ? 1 : 0);
        const lith = S.gb < 0.5;
        stones.setAttribute('opacity', lith ? 1 : 0);
        stoneL.setAttribute('opacity', lith ? 1 : 0);
        pertG.setAttribute('opacity', Pp.pert > 0 ? 1 : 0);
        sInh.set(clamp(S.sstp / 2, 0.3, 3));
        const it = sim.interpret();
        if (noteT._l !== it.label) {
          noteT._l = it.label;
          const head = wrap(it.label, 20);
          setLines(noteT, 16, 72, head);
          setLines(noteB, 16, 72 + head.length * 24 + 16, wrap(it.text, 25).slice(0, 19));
        }
      });

      HV.spotlight(def, a, [
        { t: 'Gastrine et acide', d: 'Le repas stimule les cellules G de l\'antre : la gastrine fait sécréter l\'acide chlorhydrique par les cellules pariétales du fundus. L\'acidité, par la somatostatine des cellules D, freine en retour la gastrine (complément).', spot: [[760, 380, 190]] },
        { t: 'Sécrétine : les bicarbonates', d: 'L\'acide qui arrive dans le duodénum libère la sécrétine (cellules S). Elle fait sécréter par les canaux pancréatiques l\'eau et les bicarbonates, par l\'AMPc et le canal CFTR : le suc pancréatique (≈ 1,5 L/j, pH 8,2–8,4) neutralise l\'acide (SNFGE p. 7 et 10).', spot: [[470, 540, 130], [620, 590, 70]] },
        { t: 'CCK : les enzymes et la bile', d: 'Les acides gras et acides aminés libèrent la CCK (cellules I). Elle fait libérer les enzymes des acini et contracter la vésicule biliaire. Enzymes et bile rejoignent le duodénum par l\'ampoule de Vater (SNFGE p. 10).', spot: [[440, 650, 110], [320, 440, 90], [760, 560, 330]] },
        { t: 'Les îlots : insuline et glucagon', d: 'Les îlots (1 à 2 % de la masse, surtout dans la queue) sécrètent insuline, glucagon, somatostatine et polypeptide pancréatique dans la veine porte : le foie les reçoit en premier (SNFGE p. 7 et 11).', spot: [[900, 540, 200], [450, 310, 130]] },
        { t: 'Somatostatine, VIP : freins et accélérateurs', d: 'La somatostatine freine presque toutes les sécrétions digestives et pancréatiques. Le VIP des plexus fait sécréter l\'eau et les électrolytes par l\'intestin ; dans le VIPome, l\'excès de VIP vient de la tumeur pancréatique (complément).', spot: [[715, 480, 70], [1000, 740, 120]] },
        { t: 'Tumeurs neuroendocrines', d: 'Une TNE fonctionnelle sécrète son hormone sans rétrocontrôle : gastrinome (ulcères, diarrhée), insulinome (hypoglycémies), glucagonome (diabète, érythème), VIPome (diarrhée hydrique), somatostatinome (diabète, lithiase, stéatorrhée). Choisissez un scénario, ou cliquez une tumeur pour son modèle.', spot: [[1280, 880, 260]] }
      ]);
    }
  });
})();
