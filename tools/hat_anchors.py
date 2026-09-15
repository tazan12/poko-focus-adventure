"""주인공 시트의 프레임별 머리 앵커(모자 위치)를 알파 채널에서 자동 계산해 js/sprite.js 의 HEAD 블록과
META 블록(주인공 시트 부분)을 갱신한다. 새 캐릭터 시트를 슬라이스한 뒤 실행.
  옆모습(run/jump/duck/catch): 캐릭터 상자의 오른쪽 55% 영역, 정면(idle): 가운데 56% 영역에서
  "충분히 넓은(영역 폭의 32%↑) 첫 행"을 머리 꼭대기로 본다 → 귀 끝·꼬리처럼 가느다란 돌출부를 건너뛴다.
사용: python tools/hat_anchors.py
"""
import json, os, re
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, "game", "assets", "sprites")
CHARS = os.path.join(ROOT, "game", "assets", "characters")
JS = os.path.join(ROOT, "game", "js", "sprite.js")
HEROES = ["poko", "bunny", "squirrel", "owl", "dino", "pig", "sheep", "tiger"]
KINDS = ["idle", "run", "jump", "catch", "duck"]
FH = 256


def anchor(mask, side):
    cols = np.where(mask.any(axis=0))[0]
    x0, x1 = cols[0], cols[-1]
    bw = x1 - x0 + 1
    if side: rx0, rx1 = x0 + int(bw * 0.45), x1 + 1
    else: rx0, rx1 = x0 + int(bw * 0.22), x0 + int(bw * 0.78)
    reg = mask[:, rx0:rx1]
    rows = np.where(reg.sum(axis=1) >= 0.32 * (rx1 - rx0))[0]
    top = rows[0] if len(rows) else np.where(mask.any(axis=1))[0][0]
    y = min(mask.shape[0] - 1, top + 6)
    xs = np.where(reg[y])[0]
    cx = rx0 + (xs[0] + xs[-1]) / 2 if len(xs) else (rx0 + rx1) / 2
    return round(cx / mask.shape[1], 2), round(top / mask.shape[0], 2)


def face_anchor(path):
    """HUD 얼굴 이미지 위 모자 위치 [left%, top%]"""
    im = Image.open(path).convert("RGBA")
    x, y = anchor(np.array(im)[:, :, 3] > 40, side=False)
    return [round(x * 100), round(y * 100)]


if __name__ == "__main__":
    meta = json.load(open(os.path.join(SPR, "sprites.json")))
    head, metas = {}, {}
    for h in HEROES:
        for k in KINDS:
            name = f"{h}_{k}"
            if name not in meta or not os.path.exists(os.path.join(SPR, f"{name}.png")): continue
            m = meta[name]; sheet = Image.open(os.path.join(SPR, f"{name}.png")).convert("RGBA")
            head[name] = [anchor(np.array(sheet.crop((i * m["w"], 0, (i + 1) * m["w"], FH)))[:, :, 3] > 40, k != "idle") for i in range(m["frames"])]
            metas[name] = m
    src = open(JS, encoding="utf-8").read()
    # HEAD: 수동 항목(poko_wave/poko_dance)은 남기고 주인공 시트는 자동값으로
    mh = re.search(r"(  const HEAD = \{\n)(.*?)(\n  \};)", src, re.S)
    keep = [l for l in mh.group(2).split("\n") if l.strip().startswith(("poko_wave", "poko_dance"))]
    lines = keep + ["    // 아래는 tools/hat_anchors.py 가 프레임 알파에서 자동 계산한 머리 앵커"]
    lines += [f"    {n}: {json.dumps(a)}," for n, a in head.items()]
    src = src[: mh.start(2)] + "\n".join(lines) + src[mh.end(2):]
    # META: 주인공 시트 항목을 갱신/추가 (기존 줄은 교체)
    mm = re.search(r"(  const META = \{\n)(.*?)(\n  \};)", src, re.S)
    body = [l for l in mm.group(2).split("\n") if not re.match(r"\s*(" + "|".join(metas.keys()) + r"): \{", l) and "자동 계산" not in l]
    body += ["    // 주인공 시트 (tools/hat_anchors.py 가 sprites.json 에서 자동 갱신)"]
    body += [f"    {n}: {{ frames: {m['frames']}, w: {m['w']}, h: {m['h']}, charRatio: {m['charRatio']} }}," for n, m in metas.items()]
    src = src[: mm.start(2)] + "\n".join(body) + src[mm.end(2):]
    open(JS, "w", encoding="utf-8").write(src)
    hud = {h: face_anchor(os.path.join(CHARS, "poko_neutral.png" if h == "poko" else f"{h}.png")) for h in HEROES if os.path.exists(os.path.join(CHARS, f"{h}.png")) or h == "poko"}
    print("HEAD/META updated for", len(head), "sheets")
    print("HUD face anchors:", json.dumps(hud, ensure_ascii=False))
