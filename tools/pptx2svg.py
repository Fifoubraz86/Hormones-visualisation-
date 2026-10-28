"""Extrait des dessins d'un kit SMART Servier (PPTX) en SVG autonomes, un fichier par groupe.
Usage : python3 pptx2svg.py kit.pptx sortie/ spec.txt
spec : une ligne par dessin : nom_sortie | numéro de diapositive | nom du groupe[, autre groupe…]
Puis réduire la taille : npx svgo@3.3.2 --multipass -p 1 -f sortie/ -o sortie/
Méthode : pour chaque dessin, copie du PPTX où la diapositive ne garde que les groupes demandés,
masque et disposition vidés ; LibreOffice → PDF ; pdftocairo → SVG ; cadrage sur l'emprise des groupes."""
import sys, os, re, shutil, subprocess, zipfile, tempfile
kit, out, spec = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
EMU_PT = 12700.0
z = zipfile.ZipFile(kit)
names = z.namelist()
src = {n: z.read(n) for n in names}

def top_children(tree):
    """Renvoie [(start, end, tag, name, (x, y, cx, cy))] des enfants directs de p:spTree."""
    res, depth, start, cur = [], 0, None, None
    for m in re.finditer(r'<(/?)p:(grpSp|sp|pic|cxnSp|graphicFrame)\b[^>]*?(/?)>', tree):
        close, tag, selfc = m.groups()
        if close:
            depth -= 1
            if depth == 0 and cur: res.append((cur[0], m.end(), cur[1])); cur = None
            continue
        if depth == 0:
            if selfc: res.append((m.start(), m.end(), tag)); continue
            cur = (m.start(), tag)
        if not selfc: depth += 1
    out = []
    for s, e, tag in res:
        seg = tree[s:e]
        nm = re.search(r'<p:cNvPr [^>]*name="([^"]*)"', seg)
        off = re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"', seg)
        out.append((s, e, tag, nm.group(1) if nm else '', tuple(map(int, off.groups())) if off else None))
    return out

def blank_master(xml):
    xml = re.sub(rb'<p:bg>.*?</p:bg>', b'<p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>', xml, flags=re.S)
    m = re.search(rb'(<p:spTree>.*?<p:grpSpPr>.*?</p:grpSpPr>)(.*)(</p:spTree>)', xml, flags=re.S)
    if m: xml = xml[:m.start(2)] + xml[m.end(2):]
    return xml

for line in open(spec, encoding='utf-8'):
    line = line.strip()
    if not line or line.startswith('#'): continue
    oname, sl, groups = [t.strip() for t in line.split('|')]
    groups = [g.strip() for g in groups.split(',')]
    slide = f'ppt/slides/slide{sl}.xml'
    xml = src[slide].decode('utf-8')
    i0 = xml.index('<p:spTree>')
    i1 = xml.index('</p:spTree>')
    tree = xml[i0:i1]
    kids = top_children(tree)
    keep = [k for k in kids if k[3] in groups]
    assert keep, (oname, groups, [k[3] for k in kids])
    # emprise
    x0 = min(k[4][0] for k in keep); y0 = min(k[4][1] for k in keep)
    x1 = max(k[4][0] + k[4][2] for k in keep); y1 = max(k[4][1] + k[4][3] for k in keep)
    # nouvel arbre : en-tête du spTree (jusqu'au premier enfant) + groupes gardés
    head = tree[:kids[0][0]] if kids else tree
    body = ''.join(tree[k[0]:k[1]] for k in keep)
    newxml = xml[:i0] + head + body + xml[i1:]
    tmp = tempfile.mkdtemp()
    pp = os.path.join(tmp, 'k.pptx')
    with zipfile.ZipFile(pp, 'w', zipfile.ZIP_DEFLATED) as w:
        for n in names:
            data = src[n]
            if n == slide: data = newxml.encode('utf-8')
            elif re.match(r'ppt/(slideMasters|slideLayouts)/[^/]+\.xml$', n): data = blank_master(data)
            elif n == 'ppt/presentation.xml':
                # ne garder que la diapositive voulue dans la liste
                rels = src['ppt/_rels/presentation.xml.rels'].decode()
                rid = re.search(r'Id="(rId\d+)"[^>]*Target="slides/slide%s\.xml"' % sl, rels) or re.search(r'Target="slides/slide%s\.xml"[^>]*Id="(rId\d+)"' % sl, rels)
                rid = rid.group(1).encode()
                d = data
                d = re.sub(rb'<p:sldId [^>]*/>', lambda m: m.group(0) if b'r:id="' + rid + b'"' in m.group(0) else b'', d)
                data = d
            w.writestr(n, data)
    subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', tmp, pp], check=True, capture_output=True, timeout=180)
    svgp = os.path.join(tmp, 'k.svg')
    subprocess.run(['pdftocairo', '-svg', os.path.join(tmp, 'k.pdf'), svgp], check=True)
    s = open(svgp, encoding='utf-8').read()
    m = 4 * EMU_PT  # petite marge (4 pt)
    vx, vy, vw, vh = x0 / EMU_PT - 4, y0 / EMU_PT - 4, (x1 - x0) / EMU_PT + 8, (y1 - y0) / EMU_PT + 8
    s = re.sub(r'<svg([^>]*?)width="[^"]*" height="[^"]*" viewBox="[^"]*"', lambda mm: f'<svg{mm.group(1)}width="{vw:.1f}" height="{vh:.1f}" viewBox="{vx:.1f} {vy:.1f} {vw:.1f} {vh:.1f}"', s, count=1)
    # retirer le fond blanc pleine page éventuel
    s = re.sub(r'<rect x="0" y="0" width="960" height="540"[^>]*/>', '', s)
    s = re.sub(r'<g clip-path="url\(#[^)]*\)">\s*(?:<path [^>]*fill="rgb\(100%, 100%, 100%\)"[^>]*d="M 0 [0-9.]+ L 95[89][^"]*"/>\s*)+</g>', '', s)
    open(os.path.join(out, oname + '.svg'), 'w', encoding='utf-8').write(s)
    print(oname, f'{len(s)//1024} Ko', f'{vw:.0f}x{vh:.0f}')
    shutil.rmtree(tmp, ignore_errors=True)
