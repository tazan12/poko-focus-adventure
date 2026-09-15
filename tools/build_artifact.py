"""game/ → claude.ai 아티팩트용 사본 만들기 (index.html 의 <body> 내용 + 필요한 <head> 줄만).
사용: python tools/build_artifact.py <출력 폴더>
"""
import os, re, shutil, sys
G = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "game")
OUT = sys.argv[1]
html = open(os.path.join(G, "index.html"), encoding="utf-8").read()
head = "\n".join(l for l in html.split("\n") if re.match(r"\s*<(title|meta name=\"theme-color\"|meta name=\"(apple-)?mobile-web-app-capable\"|link rel=\"(manifest|apple-touch-icon|stylesheet)\")", l))
body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1).strip()
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, "poko-focus.html"), "w", encoding="utf-8").write(head + "\n\n" + body + "\n")
for d in ["js", "css", "assets"]:
    dst = os.path.join(OUT, d)
    if os.path.exists(dst): shutil.rmtree(dst)
    shutil.copytree(os.path.join(G, d), dst, ignore=lambda _, fs: [f for f in fs if f.startswith("_") or f == "sprites.json"])
shutil.copy(os.path.join(G, "manifest.json"), OUT)
print("artifact copy ->", OUT)
