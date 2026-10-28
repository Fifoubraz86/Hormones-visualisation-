"""Génère des illustrations d'organes en SVG, dans un style proche de Servier Medical Art :
dégradé doux, reflet flou, contour fin plus sombre, détails translucides.
Usage : python3 tools/organs_svg.py assets/organs
"""
import sys, os
OUT = sys.argv[1]

def doc(w, h, defs, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n<defs>\n<filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>\n<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2"/></filter>\n<pattern id="dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="#fff" opacity="0.35"/><circle cx="6.5" cy="5.5" r="1" fill="#000" opacity="0.08"/><circle cx="4" cy="7.6" r="0.8" fill="#fff" opacity="0.25"/></pattern>\n<pattern id="fibres" width="10" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)"><path d="M 0,3 q 2.5,-2 5,0 q 2.5,2 5,0" fill="none" stroke="#fff" stroke-width="0.8" opacity="0.6"/></pattern>\n{defs}\n</defs>\n{body}\n</svg>\n'

def grad(id, c1, c2, c3, x1=0.2, y1=0.1, x2=0.8, y2=0.95):
    return f'<linearGradient id="{id}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"><stop offset="0" stop-color="{c1}"/><stop offset="0.55" stop-color="{c2}"/><stop offset="1" stop-color="{c3}"/></linearGradient>'

def rgrad(id, c1, c2, cx=0.4, cy=0.35, r=0.7):
    return f'<radialGradient id="{id}" cx="{cx}" cy="{cy}" r="{r}"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></radialGradient>'

_n = [0]
def organ(d, fill, stroke, sw=1.4, extra='', shade=0.32, tex=None):
    """Forme pleine + ombre interne (bord assombri, flou, limité à la forme) + texture éventuelle."""
    _n[0] += 1
    cid = 'c%d' % _n[0]
    out = f'<clipPath id="{cid}"><path d="{d}"/></clipPath>'
    out += f'<path d="{d}" fill="url(#{fill})" {extra}/>'
    if tex:
        out += f'<path d="{d}" fill="url(#{tex})" opacity="0.5" clip-path="url(#{cid})"/>'
    if shade:
        out += f'<g clip-path="url(#{cid})"><path d="{d}" fill="none" stroke="{stroke}" stroke-width="14" opacity="{shade}" filter="url(#blur)" transform="translate(4 5)"/></g>'
    out += f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>'
    return out

def shine(d, op=0.45):
    return f'<path d="{d}" fill="#fff" opacity="{op}" filter="url(#blur)"/>'

def detail(d, col, w=1.1, op=0.55):
    return f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" opacity="{op}"/>'

def mirror(d, cx):
    import re
    return re.sub(r'(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)', lambda m: f'{2*cx-float(m.group(1)):g},{m.group(2)}', d)

files = {}

# ---------- Thyroïde (face antérieure, avec larynx et trachée) ----------
lobe = 'M 90,78 C 86,58 78,36 70,22 C 66,16 60,18 56,26 C 46,46 36,74 36,100 C 36,124 46,140 62,142 C 76,144 86,132 90,116 Z'
trach = ''.join(f'<path d="M 86,{y} C 94,{y+4} 106,{y+4} 114,{y}" fill="none" stroke="#9fb2c4" stroke-width="2.2" opacity="0.8"/>' for y in range(64, 176, 11))
files['thyroid'] = doc(200, 190,
    grad('thy', '#e98a8e', '#c9545e', '#9a3442') + grad('tra', '#e7eef5', '#cbd8e4', '#a9bccd') + grad('lar', '#e3ebf3', '#c6d4e1', '#9fb3c6'),
    # larynx (cartilage thyroïde) puis trachée
    organ('M 74,6 L 126,6 L 122,28 C 114,44 106,50 100,52 C 94,50 86,44 78,28 Z', 'lar', '#7f95ab', 1.2)
    + detail('M 92,6 L 100,16 L 108,6', '#7f95ab', 1.2, 0.8)
    + organ('M 84,54 L 116,54 L 116,186 L 84,186 Z', 'tra', '#8ea3b8', 1.2) + trach
    + organ(lobe, 'thy', '#7d2a37', tex='dots') + organ(mirror(lobe, 100), 'thy', '#7d2a37', tex='dots')
    + organ('M 88,92 C 96,98 104,98 112,92 L 112,116 C 104,122 96,122 88,116 Z', 'thy', '#7d2a37')
    + organ('M 104,94 C 104,76 107,58 110,44 C 114,48 114,74 110,94 Z', 'thy', '#7d2a37', 1)
    + shine('M 50,60 C 56,46 70,44 74,58 C 70,76 56,84 50,60 Z') + shine(mirror('M 50,60 C 56,46 70,44 74,58 C 70,76 56,84 50,60 Z', 100), 0.3)
    + ''.join(detail(f'M {x-7},{y} q 7,-6 14,0', '#7d2a37', 1, 0.35) + detail(f'M {200-x-7},{y} q 7,-6 14,0', '#7d2a37', 1, 0.35) for x, y in [(52, 92), (62, 112), (50, 118), (70, 80), (60, 70)]))

# ---------- Glande surrénale (pyramide coiffant un pôle rénal, coupe montrant cortex et médullaire) ----------
adr = 'M 20,92 C 22,60 46,24 80,14 C 104,8 124,22 130,44 C 136,64 128,84 112,94 C 86,104 46,104 20,92 Z'
files['adrenal'] = doc(150, 110,
    grad('adr', '#f6d47a', '#e3a93a', '#b97b1d') + grad('med', '#c8743a', '#a3532a', '#7c3a1c'),
    organ(adr, 'adr', '#8a5a14', tex='dots')
    + organ('M 40,86 C 46,62 64,40 86,34 C 102,30 114,40 116,56 C 118,70 110,82 98,86 C 80,92 56,92 40,86 Z', 'med', '#6e3418', 1, 'opacity="0.85"')
    + detail('M 30,90 C 34,64 54,36 82,24 M 120,40 C 126,58 124,78 110,90', '#8a5a14', 1, 0.4)
    + shine('M 50,40 C 60,26 82,18 92,24 C 84,36 64,46 50,40 Z', 0.5))

# ---------- Hypophyse dans la selle turcique (tige, antéhypophyse, posthypophyse) ----------
files['pituitary'] = doc(180, 170,
    grad('ant', '#93b9ee', '#5f8fd8', '#3d67ad') + grad('post', '#d6dbe6', '#aeb6c8', '#868fa6') + grad('sel', '#f2e9d6', '#ddd0b3', '#c3b28d') + grad('stk', '#c2c8d6', '#a1a9bd', '#7f879d'),
    organ('M 14,82 C 10,150 170,150 166,82 L 152,82 C 154,128 26,128 28,82 Z', 'sel', '#a99a72', 1.3)
    + organ('M 82,4 C 78,30 82,52 90,70 L 108,70 C 104,52 104,28 106,4 Z', 'stk', '#6f778c', 1.2)
    + organ('M 30,96 C 30,64 72,56 96,70 C 110,80 106,118 82,128 C 56,138 30,124 30,96 Z', 'ant', '#2e5491', tex='dots')
    + organ('M 100,72 C 118,58 150,66 150,94 C 150,120 122,132 104,122 C 112,106 112,86 100,72 Z', 'post', '#6f778c')
    + shine('M 44,82 C 52,70 72,68 80,76 C 74,88 54,94 44,82 Z', 0.5)
    + detail('M 92,10 L 94,64 M 98,10 L 100,64', '#6f778c', 0.9, 0.4))

# ---------- Testicule et épididyme ----------
files['testis'] = doc(170, 190,
    grad('tes', '#f3c2d4', '#d985a8', '#b05a82') + grad('epi', '#e9a6c0', '#c06e93', '#8f4569') + grad('cord', '#e7c9d4', '#c9a2b2', '#a07d8c'),
    organ('M 112,4 C 108,30 112,44 116,52 L 128,50 C 126,36 124,20 126,4 Z', 'cord', '#87606f', 1.1)
    + organ('M 54,46 C 86,30 128,48 134,96 C 140,144 112,178 76,180 C 40,182 18,150 20,108 C 22,78 34,56 54,46 Z', 'tes', '#8d3e63', tex='fibres')
    + organ('M 116,48 C 140,48 156,74 152,106 C 150,134 140,160 122,174 C 134,148 140,116 136,90 C 134,72 128,58 116,48 Z', 'epi', '#6e2f4e')
    + ''.join(detail(f'M {x},{y} q 5,-7 10,0 q 5,7 10,0 q 5,-7 10,0', '#8d3e63', 1, 0.35) for x, y in [(42, 96), (52, 120), (40, 142), (66, 78), (70, 152), (86, 108)])
    + shine('M 44,74 C 54,58 80,54 88,64 C 82,80 56,92 44,74 Z', 0.55))

# ---------- Ovaire (follicules à plusieurs stades, corps jaune) ----------
fol = ''
for (x, y, r) in [(54, 64, 9), (84, 52, 6), (118, 70, 17), (70, 98, 7), (102, 104, 5), (44, 92, 5)]:
    fol += f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#fol)" stroke="#a86b88" stroke-width="0.9" opacity="0.95"/><circle cx="{x + r*0.3:.1f}" cy="{y - r*0.25:.1f}" r="{max(1.6, r*0.28):.1f}" fill="#f6e3a8" stroke="#c49a3c" stroke-width="0.6"/>'
files['ovary'] = doc(180, 140,
    grad('ova', '#f5d3dc', '#e3a6b8', '#c27b93') + rgrad('fol', '#fffaf6', '#f1d5df', 0.45, 0.4, 0.7) + rgrad('cj', '#fbe08a', '#e4ad35', 0.4, 0.4, 0.7),
    organ('M 18,74 C 16,40 52,18 92,18 C 136,18 166,42 164,74 C 162,108 128,126 88,124 C 46,122 20,104 18,74 Z', 'ova', '#a35d79', tex='dots')
    + fol + '<circle cx="136" cy="98" r="10" fill="url(#cj)" stroke="#b7862a" stroke-width="0.9"/>'
    + shine('M 40,46 C 54,30 86,26 96,34 C 86,48 56,58 40,46 Z', 0.5))

# ---------- Utérus, trompes et ovaires (vue antérieure, coupe frontale de la cavité) ----------
tube = 'M 72,44 C 58,30 40,26 26,34 C 16,40 10,52 12,60'
files['uterus'] = doc(220, 190,
    grad('ute', '#f2b3c3', '#da7f99', '#b65a77') + grad('end', '#c9506e', '#a83a58', '#86283f') + grad('ova2', '#f5d3dc', '#e3a6b8', '#c27b93'),
    f'<path d="{tube}" fill="none" stroke="#c9758f" stroke-width="7" stroke-linecap="round"/><path d="{mirror(tube, 110)}" fill="none" stroke="#c9758f" stroke-width="7" stroke-linecap="round"/>'
    + ''.join(f'<path d="M {x},{y} l -6,8 M {x},{y} l 0,9 M {x},{y} l 6,8" stroke="#c9758f" stroke-width="2.4" stroke-linecap="round"/>' for x, y in [(12, 60), (208, 60)])
    + organ('M 18,96 C 10,82 20,70 34,72 C 46,74 52,86 46,96 C 40,104 24,104 18,96 Z', 'ova2', '#a35d79', 1.1)
    + organ(mirror('M 18,96 C 10,82 20,70 34,72 C 46,74 52,86 46,96 C 40,104 24,104 18,96 Z', 110), 'ova2', '#a35d79', 1.1)
    + organ('M 70,40 C 70,22 150,22 150,40 C 150,84 128,118 122,150 L 120,186 L 100,186 L 98,150 C 92,118 70,84 70,40 Z', 'ute', '#8f3d58', tex='fibres')
    + organ('M 86,44 C 96,52 124,52 134,44 C 130,76 118,104 112,126 L 108,126 C 102,104 90,76 86,44 Z', 'end', '#7a2238', 1, 'opacity="0.9"')
    + shine('M 84,32 C 96,24 122,24 128,32 C 118,40 92,42 84,32 Z', 0.5)
    + detail('M 104,150 L 104,180 M 116,150 L 116,180', '#8f3d58', 1, 0.35))

# ---------- Glande mammaire (coupe sagittale : lobules, canaux, mamelon) ----------
lob = ''
for (x, y) in [(70, 50), (92, 40), (112, 56), (66, 80), (90, 74), (112, 90), (74, 110), (96, 120), (60, 136)]:
    lob += f'<ellipse cx="{x}" cy="{y}" rx="11" ry="9" fill="url(#lob)" stroke="#b46a7f" stroke-width="0.8"/>'
ducts = 'M 70,50 C 100,70 130,86 152,100 M 92,40 C 112,64 134,84 152,100 M 112,56 C 128,74 142,88 152,100 M 66,80 C 98,90 128,96 152,100 M 90,74 C 112,86 134,94 152,100 M 112,90 C 130,96 142,99 152,100 M 74,110 C 102,108 130,104 152,100 M 96,120 C 118,112 138,104 152,100 M 60,136 C 96,126 128,110 152,100'
files['breast'] = doc(190, 200,
    grad('br', '#fbe3d6', '#f2c4ad', '#d99a80') + rgrad('lob', '#f6c7d3', '#d98aa2', 0.4, 0.4, 0.8) + grad('nip', '#d58a80', '#b9635c', '#8f453f') + grad('wall', '#e9c9c9', '#cf9e9e', '#a97373'),
    organ('M 6,4 L 34,4 L 34,196 L 6,196 Z', 'wall', '#8f5f5f', 1)
    + organ('M 34,8 C 90,10 150,52 158,94 C 166,140 120,190 34,194 Z', 'br', '#b97a62')
    + lob + detail(ducts, '#b46a7f', 1.4, 0.75)
    + organ('M 152,88 C 164,88 172,94 172,100 C 172,106 164,112 152,112 Z', 'nip', '#7e3b36', 1)
    + shine('M 50,26 C 80,22 118,42 126,58 C 108,62 70,48 50,26 Z', 0.45))

# ---------- Parathyroïdes (face postérieure de la thyroïde) ----------
pts = [(62, 70), (56, 112), (138, 70), (144, 112)]
files['parathyroid'] = doc(200, 190,
    grad('thy', '#e98a8e', '#c9545e', '#9a3442') + rgrad('pth', '#ffe8a6', '#e4a93a', 0.4, 0.35, 0.7) + grad('tra', '#e7eef5', '#cbd8e4', '#a9bccd'),
    organ('M 84,30 L 116,30 L 116,186 L 84,186 Z', 'tra', '#8ea3b8', 1.2)
    + organ(lobe, 'thy', '#7d2a37') + organ(mirror(lobe, 100), 'thy', '#7d2a37')
    + organ('M 88,92 C 96,98 104,98 112,92 L 112,116 C 104,122 96,122 88,116 Z', 'thy', '#7d2a37')
    + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="11" ry="8" fill="url(#pth)" stroke="#9c6a18" stroke-width="1.2"/>' for x, y in pts)
    + shine(mirror('M 50,60 C 56,46 70,44 74,58 C 70,76 56,84 50,60 Z', 100), 0.3))

os.makedirs(OUT, exist_ok=True)
for k, v in files.items():
    open(os.path.join(OUT, k + '.svg'), 'w', encoding='utf-8').write(v)
    print(k, len(v))
