"""Garde dans un SVG (pdftocairo) les formes dont la couleur de remplissage est dans une liste, et leurs contours.
Usage : python3 keepfill.py entree.svg sortie.svg 'r,g,b' ['r,g,b'...]  (pourcentages arrondis à l'entier)"""
import re,sys
src,dst,*cols=sys.argv[1:]
keepc={tuple(int(round(float(v))) for v in c.split(',')) for c in cols}
s=open(src).read()
last=0;res='';keep=False
for m in re.finditer(r'<path [^>]*/>',s):
    t=m.group(0); f=re.search(r'fill="rgb\(([\d.]+)%, ([\d.]+)%, ([\d.]+)%\)"',t)
    if f: keep=tuple(int(round(float(v))) for v in f.groups()) in keepc; k=keep
    else: k=keep
    res+=s[last:m.start()]+(t if k else ''); last=m.end()
open(dst,'w').write(res+s[last:])
