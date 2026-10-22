/*
 * Iconographie du Polycopié de sémiologie endocrinienne (CEEDMM, 2e édition 2023), reproduite avec
 * l'accord du Collège. Chaque figure est rattachée aux scènes où elle éclaire le propos.
 * Images : assets/poly/fig<n>.jpg (extraites des PDF, réduites à 1 100 px).
 */
(function () {
  'use strict';
  const HV = window.HV;
  const BV = 'Valentin Brusseau', EF = 'Eva Feigerlova';
  // [numéro, légende, partie, page du PDF, scènes, crédit]
  const L = [
    ['1', 'Histologie normale de la thyroïde', 1, 6, ['thyro', 'foll']],
    ['2', 'Axe hypothalamo-hypophyso-thyroïdien', 1, 7, ['thyro', 'hypo', 'pit']],
    ['3', 'Synthèse des hormones thyroïdiennes', 1, 8, ['foll', 'thyro']],
    ['4', 'Goitre thyroïdien', 1, 12, ['thyro']],
    ['5', 'Scanner cervico-thoracique d\'un patient présentant un goitre', 1, 13, ['thyro']],
    ['6', 'Échographie thyroïdienne normale', 1, 15, ['thyro', 'tirads']],
    ['7A', 'Aspects échographiques de nodules thyroïdiens (A)', 1, 16, ['thyro', 'tirads']],
    ['7B', 'Aspects échographiques de nodules thyroïdiens (B)', 1, 17, ['thyro', 'tirads']],
    ['7C', 'Aspects échographiques de nodules thyroïdiens (C)', 1, 17, ['thyro', 'tirads']],
    ['7D', 'Aspects échographiques de nodules thyroïdiens (D)', 1, 18, ['thyro', 'tirads']],
    ['8', 'Orbitopathie basedowienne', 1, 27, ['thyro', 'thyro-ai']],
    ['9A', 'Scintigraphie thyroïdienne à l\'iode 123 montrant un nodule toxique', 1, 29, ['thyro']],
    ['9B', 'Scintigraphie thyroïdienne à l\'iode 123 en faveur d\'une maladie de Basedow', 1, 29, ['thyro', 'thyro-ai']],
    ['10', 'Embryologie des parathyroïdes', 1, 33, ['phospho', 'thyro-embryo']],
    ['11', 'Bilan du calcium', 1, 36, ['phospho']],
    ['12', 'Principaux mécanismes de régulation de la calcémie', 1, 37, ['phospho']],
    ['13', 'Mécanismes physiopathologiques de l\'hyperparathyroïdie primaire', 1, 41, ['phospho']],
    ['14', 'Signe de Chvostek', 1, 44, ['phospho']],
    ['15', 'Signe de Trousseau (ou spasme carpopédal induit)', 1, 44, ['phospho']],
    ['16', 'Allongement du segment QT à l\'ECG en cas d\'hypocalcémie', 1, 45, ['phospho']],
    ['17', 'Les cinq axes hypothalamo-antéhypophysaires', 1, 48, ['atlas', 'cortico', 'somato', 'lacto', 'gonadoF', 'gonadoM', 'thyro']],
    ['18', 'Champ visuel d\'une patiente de 47 ans ayant un macroadénome hypophysaire responsable d\'une hémianopsie bitemporale', 1, 51, ['lacto', 'somato', 'cortico']],
    ['19A', 'Acromégalie chez un patient de 65 ans', 1, 53, ['somato']],
    ['19B', 'Acromégalo-gigantisme chez un patient de 33 ans', 1, 54, ['somato']],
    ['20', 'Gynécomastie bilatérale en rapport avec une insuffisance gonadotrope chez un homme de 76 ans', 1, 56, ['gonadoM']],
    ['21', 'Syndrome de Cushing lié à un adénome corticotrope chez une patiente de 56 ans', 1, 57, ['cortico']],
    ['22A', 'Adénomes hypophysaires selon leur diamètre maximal en IRM (A)', 1, 65, ['lacto', 'somato', 'cortico']],
    ['22B', 'Adénomes hypophysaires selon leur diamètre maximal en IRM (B)', 1, 66, ['lacto', 'somato', 'cortico']],
    ['22C', 'Adénomes hypophysaires selon leur diamètre maximal en IRM (C)', 1, 66, ['lacto', 'somato', 'cortico']],
    ['23', 'Hypophysite', 1, 67, ['adh', 'lacto']],
    ['24', 'Rapports anatomiques des glandes surrénales, selon Sherlock M. et al. (Endocrine Reviews 2020)', 1, 68, ['cortico', 'medullo', 'raa']],
    ['25', 'Coupe de la glande surrénale humaine au microscope, montrant ses différentes zones', 1, 69, ['cortico', 'medullo', 'raa']],
    ['26', 'Stéroïdogenèse dans les glandes surrénales', 1, 71, ['cortico', 'raa', 'surrenale']],
    ['27', 'Le système rénine-angiotensine-aldostérone', 1, 71, ['raa']],
    ['28', 'Biosynthèse des catécholamines dans les cellules chromaffines', 1, 73, ['medullo']],
    ['29', 'Action de l\'aldostérone sur les cellules principales du tubule rénal distal', 1, 75, ['raa']],
    ['30', 'Mélanodermie chez une patiente de 65 ans hospitalisée pour découverte d\'insuffisance surrénale', 1, 87, ['cortico']],
    ['31', 'Histologie testiculaire', 2, 2, ['gonadoM'], BV],
    ['32', 'Histologie ovarienne', 2, 2, ['gonadoF'], BV],
    ['33', 'Mécanismes impliqués dans le contrôle neuroendocrine de l\'axe gonadotrope', 2, 3, ['gonadoF', 'gonadoM'], EF],
    ['34', 'Fonctions endocrine et exocrine du testicule', 2, 4, ['gonadoM'], EF],
    ['35', 'Cycle ovarien et cycle menstruel', 2, 6, ['gonadoF'], BV],
    ['36', 'Orchidomètre de Prader', 2, 9, ['gonadoM'], EF],
    ['37', 'Chronologie des signes pubertaires chez la fille', 2, 10, ['gonadoF'], BV],
    ['38', 'Structure générale d\'une lipoprotéine', 2, 17, ['lipid']],
    ['39', 'Schéma simplifié du métabolisme des lipides', 2, 19, ['lipid']],
    ['40', 'Arc cornéen', 2, 21, ['lipid']],
    ['41', 'Xanthélasma', 2, 22, ['lipid']],
    ['42', 'Xanthome tendineux d\'un doigt', 2, 22, ['lipid']],
    ['43', 'Xanthome tendineux du tendon d\'Achille', 2, 22, ['lipid']],
    ['44', 'Xanthome tubéreux', 2, 23, ['lipid']],
    ['45', 'Représentation schématique de la physiologie du métabolisme glucidique', 2, 30, ['glyc', 'islet']],
    ['46', 'Taux de prévalence standardisé du diabète traité pharmacologiquement en France en 2020', 2, 33, ['glyc']],
    ['47', 'Physiopathologie simplifiée de la rétinopathie diabétique', 2, 44, ['glyc']],
    ['48', 'Évolution de l\'excrétion urinaire d\'albumine et de la filtration glomérulaire au cours du diabète, d\'après Roussel R. (Médecine des maladies métaboliques, 2020)', 2, 46, ['glyc']],
    ['49', 'Questionnaire DN4 (un score supérieur à 4 est en faveur d\'une neuropathie algique)', 2, 50, ['glyc']],
    ['50', 'Dépistage par le monofilament d\'un trouble de la sensibilité superficielle du pied', 2, 51, ['glyc']],
    ['51', 'Histoire naturelle du mal perforant plantaire', 2, 55, ['glyc']],
    ['52A', 'Pied neuro-ischémique : hyperkératose sur un point d\'appui pathologique (a)', 2, 56, ['glyc']],
    ['52B', 'Pied neuro-ischémique (b)', 2, 56, ['glyc']],
    ['52C', 'Pied neuro-ischémique (c)', 2, 57, ['glyc']],
    ['52D', 'Pied neuro-ischémique (d)', 2, 57, ['glyc']],
    ['53', 'Pied de Charcot aigu à droite', 2, 58, ['glyc']],
    ['54A', 'Pied de Charcot chronique au stade d\'inversement de l\'arche plantaire (A)', 2, 59, ['glyc']],
    ['54B', 'Pied de Charcot chronique : radiographie (B)', 2, 59, ['glyc']],
    ['54C', 'Pied de Charcot chronique : scanner (C)', 2, 59, ['glyc']],
    ['55', 'Pied neuropathique pur', 2, 61, ['glyc']],
    ['56', 'Pied diabétique avec composante ischémique marquée', 2, 62, ['glyc']],
    ['57', 'Mesure de l\'index de pression systolique à la cheville', 2, 63, ['glyc']],
    ['58', 'Abcès plantaire typique du pied gauche chez un patient déjà amputé de deux orteils', 2, 63, ['glyc']],
    ['59', 'Dermo-hypodermite nécrosante', 2, 64, ['glyc']]
  ];
  HV.POLY_FIGS = L.map(([n, t, part, page, scenes, credit]) => ({ n, t, part, page, scenes, credit: credit || null, src: 'assets/poly/fig' + n + '.jpg' }));
  HV.polyFig = (n) => HV.POLY_FIGS.find((f) => f.n === n) || null;
  HV.polyFigsFor = (id) => HV.POLY_FIGS.filter((f) => f.scenes.includes(id));
  // « 7A–D », « 41–43 », « 19A » → liste de figures existantes
  HV.polyFigsRef = function (ref) {
    const m = String(ref).match(/^(\d+)([A-Z]?)\s*[–-]\s*(\d*)([A-Z]?)$/);
    let ns = [String(ref)];
    if (m && m[2] && m[4]) ns = Array.from({ length: m[4].charCodeAt(0) - m[2].charCodeAt(0) + 1 }, (_, i) => m[1] + String.fromCharCode(m[2].charCodeAt(0) + i));
    else if (m && m[3]) ns = Array.from({ length: +m[3] - +m[1] + 1 }, (_, i) => String(+m[1] + i));
    const out = [];
    ns.forEach((n) => { const f = HV.polyFig(n); if (f) out.push(f); else HV.POLY_FIGS.filter((x) => x.n.replace(/[A-Z]$/, '') === n).forEach((x) => out.push(x)); });
    return out;
  };
  // Pastilles « figures » posées sur les organes des schémas (scène → nœud → figures).
  HV.FIG_SPOTS = {
    cortico: { adr: ['24', '25', '26'], pit: ['22A', '22B', '22C', '18', '30'], fat: ['21'] },
    somato: { pit: ['22A', '22B', '22C', '18'], bone: ['19A', '19B'] },
    lacto: { pit: ['22A', '22B', '22C', '18'], hypo: ['17', '23'] },
    adh: { post: ['23'] },
    medullo: { med: ['28', '25', '24'] },
    raa: { adr: ['27', '26'], tub: ['29'] },
    gonadoF: { ovary: ['32', '35'], hypo: ['33'], breast: ['37'] },
    gonadoM: { testis: ['31', '34', '36'], hypo: ['33'], pit: ['20'] },
    phospho: { para: ['10', '13'], ca: ['11', '12', '14', '15', '16'] },
    glyc: { islet: ['45'], kidney: ['48'], glc: ['46', '47', '49', '50', '51', '52A', '52B', '52C', '52D', '53', '54A', '54B', '54C', '55', '56', '57', '58', '59'] },
    lipid: { plasma: ['38', '39'], artery: ['40', '41', '42', '43', '44'] }
  };
  HV.INFO = HV.INFO || {};
  HV.INFO.figs = { t: 'Iconographie du polycopié', k: 'Figures du Collège (CEEDMM)', d: 'Cliquez pour ouvrir les figures du polycopié correspondant à cette structure.' };
  HV.figBadge = function (a, x, y, ns, parent) {
    const g = a.el('g', { class: 'fig-badge', transform: `translate(${x} ${y})`, 'data-figs': ns.join(','), 'data-info': 'figs' }, parent);
    a.el('circle', { r: 19 }, g);
    a.el('path', { d: 'M -10,-4 h 5 l 3,-4 h 4 l 3,4 h 5 v 12 h -20 Z', class: 'fig-badge-i' }, g);
    a.el('circle', { cx: 0, cy: 2, r: 4, class: 'fig-badge-i' }, g);
    a.text(16, -12, String(ns.length), 'fig-badge-n', null, g);
    return g;
  };
  HV.polySource = (f) => `Polycopié de sémiologie endocrinienne, CEEDMM, 2e édition 2023 · partie ${f.part}, page ${f.page} du PDF` + (f.credit ? ` · crédit : ${f.credit}` : '');
})();
