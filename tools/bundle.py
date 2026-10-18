"""Assemble index.html, ses feuilles de style et ses scripts en une seule page (publication en artefact).
Usage : python3 tools/bundle.py sortie.html — les images assets/poly/*.jpg sont publiées à côté."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
head = html[html.index('<title>'):html.index('</head>')]
body = html[html.index('<body>') + 6:html.index('</body>')]
head = re.sub(r'<meta name="description"[^>]*>\n?', '', head)
inline_css = lambda m: '<style>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '\n</style>'
inline_js = lambda m: '<script>\n' + (root / m.group(1)).read_text(encoding='utf-8').replace('</script', '<\\/script') + '\n</script>'
head = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', inline_css, head)
body = re.sub(r'<script src="(js/[^"]+)"></script>', inline_js, body)
pathlib.Path(sys.argv[1]).write_text(head + body, encoding='utf-8')
