"""Extrait des tracés 2D (carbones alpha projetés) depuis des fichiers mmCIF de la PDB."""
import json, math, shlex, sys
import numpy as np

def atoms(path):
    keys, rows, inloop = [], [], False
    for l in open(path):
        if l.startswith('_atom_site.'):
            keys.append(l.strip().split('.')[1]); inloop = True; continue
        if inloop and (l.startswith('ATOM') or l.startswith('HETATM')):
            rows.append(dict(zip(keys, l.split())))
        elif inloop and keys and l.startswith('#'):
            break
    return rows

def disulf(path):
    out, keys, on = [], [], False
    for l in open(path):
        if l.startswith('_struct_conn.'):
            keys.append(l.strip().split('.')[1]); on = True; continue
        if on and keys and not l.startswith('_'):
            if l.startswith('#'): break
            try: v = shlex.split(l)
            except ValueError: v = l.split()
            d = dict(zip(keys, v))
            if d.get('conn_type_id') == 'disulf':
                out.append(((d['ptnr1_auth_asym_id'], d['ptnr1_auth_seq_id']), (d['ptnr2_auth_asym_id'], d['ptnr2_auth_seq_id'])))
    return out

GLY = {'NAG', 'MAN', 'BMA', 'FUC', 'GAL', 'SIA', 'NDG', 'FUL'}
def build(spec):
    rows = atoms(spec['file'])
    model = min(int(r.get('pdbx_PDB_model_num', 1)) for r in rows)
    rows = [r for r in rows if int(r.get('pdbx_PDB_model_num', 1)) == model]
    chains = {}
    for r in rows:
        if r['group_PDB'] == 'ATOM' and r['label_atom_id'] == 'CA' and r['auth_asym_id'] in spec['chains'] and r['label_alt_id'] in ('.', 'A'):
            chains.setdefault(r['auth_asym_id'], []).append((r['auth_seq_id'], float(r['Cartn_x']), float(r['Cartn_y']), float(r['Cartn_z'])))
    gly = [(float(r['Cartn_x']), float(r['Cartn_y']), float(r['Cartn_z'])) for r in rows
           if r['group_PDB'] == 'HETATM' and r['label_comp_id'] in GLY and r['label_atom_id'] == 'C1' and r['auth_asym_id'] in spec['chains']]
    lig = [(float(r['Cartn_x']), float(r['Cartn_y']), float(r['Cartn_z'])) for r in rows
           if r['group_PDB'] == 'HETATM' and r['label_comp_id'] in spec.get('ligand', ()) ]
    allp = np.array([p[1:] for c in spec['chains'] for p in chains.get(c, [])])
    ctr = allp.mean(0)
    u, s, vt = np.linalg.svd(allp - ctr, full_matrices=False)
    ax = vt[:2]                       # vue perpendiculaire au plus petit axe d'inertie
    proj = lambda p: (np.array(p) - ctr) @ ax.T
    P = proj(allp)
    k = spec['size'] / (P.max(0) - P.min(0)).max()
    mid = (P.max(0) + P.min(0)) / 2
    tf = lambda xy: [round(float((xy[0] - mid[0]) * k), 1), round(float((xy[1] - mid[1]) * k), 1)]
    res = {'src': spec['src'], 'chains': [], 'ss': [], 'gly': [], 'lig': None, 'n': {}}
    lookup = {}
    for c in spec['chains']:
        pts = chains.get(c, [])
        res['n'][c] = len(pts)
        xy = proj([p[1:] for p in pts])
        for (num, *_), q in zip(pts, xy): lookup[(c, num)] = q
        # lissage léger puis sous-échantillonnage
        w = spec.get('smooth', 3)
        sm = np.array([xy[max(0, i - w // 2): i + w // 2 + 1].mean(0) for i in range(len(xy))])
        step = max(1, len(sm) // spec.get('maxpts', 70))
        sel = list(sm[::step]) + [sm[-1]]
        res['chains'].append([v for q in sel for v in tf(q)])
    for a, b in disulf(spec['file']):
        if a in lookup and b in lookup:
            res['ss'].append(tf(lookup[a]) + tf(lookup[b]))
    if gly: res['gly'] = [tf(q) for q in proj(gly)]
    if lig: res['lig'] = tf(np.array(proj(lig)).mean(0))
    return res

D = 'pdb/'  # fichiers mmCIF téléchargés depuis https://files.rcsb.org/download/<ID>.cif.gz
SPECS = {
  'tsh':     dict(file=D+'7T9I.cif', chains=['A', 'B'], size=24, src='PDB 7T9I (TSH native liée au TSHR, cryo-ME 2022)'),
  'lh':      dict(file=D+'1HRP.cif', chains=['A', 'B'], size=24, src='PDB 1HRP (hCG, même récepteur et même sous-unité α que la LH)'),
  'fsh':     dict(file=D+'4AY9.cif', chains=['A', 'B'], size=24, src='PDB 4AY9 (FSH liée à son récepteur)'),
  'insulin': dict(file=D+'4INS.cif', chains=['A', 'B'], size=20, smooth=1, maxpts=40, src='PDB 4INS (insuline, chaînes A et B)'),
  'gh':      dict(file=D+'3HHR.cif', chains=['A'], size=24, src='PDB 3HHR (GH liée à son récepteur)'),
  'prl':     dict(file=D+'1RW5.cif', chains=['A'], size=24, src='PDB 1RW5 (prolactine humaine, RMN)'),
  'igf1':    dict(file=D+'1GZR.cif', chains=['B'], size=20, smooth=1, maxpts=50, src='PDB 1GZR (IGF-1 humain)'),
  'glucagon':dict(file=D+'1GCN.cif', chains=['A'], size=22, smooth=1, src='PDB 1GCN (glucagon)'),
  'pth':     dict(file=D+'1ET1.cif', chains=['A'], size=24, smooth=1, src='PDB 1ET1 (PTH 1-34)'),
  'renin':   dict(file=D+'2REN.cif', chains=['A'], size=24, src='PDB 2REN (rénine humaine)'),
  'pcsk9':   dict(file=D+'2P4E.cif', chains=['P', 'A'], size=24, src='PDB 2P4E (PCSK9)'),
  'ldlr':    dict(file=D+'1N7D.cif', chains=['A'], size=26, src='PDB 1N7D (domaine extracellulaire du récepteur des LDL)'),
  'trab':    dict(file=D+'1IGT.cif', chains=['A', 'B', 'C', 'D'], size=26, maxpts=60, src='PDB 1IGT (IgG entière)'),
  'ttr':     dict(file=D+'2ROX-a1.cif', chains=['A', 'A-2', 'B', 'B-2'], size=22, ligand=('T44',), src='PDB 2ROX (transthyrétine tétramérique avec T4)'),
  'tbg':     dict(file=D+'2CEO.cif', chains=['A'], size=30, ligand=('T44',), src='PDB 2CEO (TBG avec T4)'),
  'alb':     dict(file=D+'1AO6.cif', chains=['A'], size=30, src='PDB 1AO6 (albumine sérique humaine)'),
  'tg':      dict(file=D+'6SCJ.cif', chains=['A', 'B'], size=28, maxpts=90, src='PDB 6SCJ (thyroglobuline humaine dimérique, cryo-ME 2020)'),
}
out = {}
for k, s in SPECS.items():
    r = build(s); out[k] = r
    print(k, r['n'], 'ss', len(r['ss']), 'gly', len(r['gly']), 'lig', r['lig'], file=sys.stderr)
js = '/* Tracés générés par docs/tools/traces.py à partir des coordonnées de la PDB (carbones α projetés). */\nwindow.HV = window.HV || {};\nwindow.HV.TRACES = ' + json.dumps(out, separators=(',', ':')) + ';\n'
open(sys.argv[1], 'w').write(js)
print(len(js), file=sys.stderr)
