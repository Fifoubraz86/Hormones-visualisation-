"""Indexe des kits SMART Servier (PPTX) : diapositives visibles, titre, étiquettes, dessins (groupes de premier niveau)
avec leur emprise. Usage : python3 servier_index.py dossier_des_kits sortie.json"""
import sys, os, re, json, zipfile, glob
src, out = sys.argv[1:3]
res = {}
for kit in sorted(glob.glob(os.path.join(src, '*.pptx'))):
    z = zipfile.ZipFile(kit)
    pres = z.read('ppt/presentation.xml').decode()
    rels = z.read('ppt/_rels/presentation.xml.rels').decode()
    rid2t = {}
    for m in re.finditer(r'<Relationship [^>]*>', rels):
        a = m.group(0)
        i = re.search(r'Id="(rId\d+)"', a); t = re.search(r'Target="(slides/slide\d+\.xml)"', a)
        if i and t: rid2t[i.group(1)] = t.group(1)
    slides, page = [], 0
    for rid in re.findall(r'<p:sldId [^>]*r:id="(rId\d+)"', pres):
        f = rid2t[rid]
        s = z.read('ppt/' + f).decode('utf-8', 'replace')
        if 'show="0"' in s[:600]: continue
        page += 1
        num = int(re.search(r'slide(\d+)\.xml', f).group(1))
        tree = s[s.index('<p:spTree>'):]
        depth, items = 0, []
        for m in re.finditer(r'<(/?)p:(grpSp|sp|pic|cxnSp)\b[^>]*?(/?)>', tree):
            close, tag, selfc = m.groups()
            if close: depth -= 1; continue
            if depth == 0 and tag == 'grpSp':
                seg = tree[m.end():m.end() + 2500]
                nm = re.search(r'<p:cNvPr [^>]*name="([^"]*)"', seg)
                off = re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"', seg)
                if nm and off: items.append({'group': nm.group(1), 'emu': list(map(int, off.groups()))})
            if not selfc: depth += 1
        texts = [t.strip() for t in re.findall(r'<a:t>([^<]*)</a:t>', s) if t.strip()]
        slides.append({'page': page, 'slide': num, 'title': texts[0] if texts else '', 'labels': texts[1:12], 'groups': items})
    res[os.path.basename(kit)] = slides
json.dump(res, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for k, v in res.items(): print(k, len(v), 'diapositives', sum(len(s['groups']) for s in v), 'dessins')
