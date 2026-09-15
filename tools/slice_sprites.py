"""Higgsfield(gpt_image_2_5)로 생성한 격자형 스프라이트 시트 → 균일 프레임 시트 변환.

입력: assets/sprites/_grid_<name>.png (R행 × C열, 셀마다 캐릭터 1개, 투명 배경)
출력: assets/sprites/<name>.png (가로 N프레임, 프레임 크기 동일, 바닥 중앙 정렬) + sprites.json

절차
1. 알파 채널의 가로 투영으로 행 경계(빈 띠)를 찾고, 각 행 안에서 세로 투영으로 열 경계를 찾는다.
   빈 띠가 없으면 예상 개수 기준으로 투영 최소값 위치에서 자른다.
2. 셀마다 가장 큰 연결 성분만 남겨 이웃 셀의 조각(꼬리 등)을 제거한다.
3. 시트 전체에 한 가지 배율을 적용해 프레임 간 캐릭터 크기 비율을 유지하고, 발 바닥을 맞춰 정렬한다.
"""
import os, json, sys
from collections import deque
import numpy as np
from PIL import Image

BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "game", "assets", "sprites")
ALPHA_T = 20


def segments(profile, expected, min_gap=4):
    """1차원 투영(profile)에서 비어 있지 않은 구간을 찾는다. 개수가 맞지 않으면 최소값 절단으로 보정."""
    on = profile > 0
    segs, start = [], None
    for i, v in enumerate(on):
        if v and start is None: start = i
        if not v and start is not None: segs.append([start, i]); start = None
    if start is not None: segs.append([start, len(on)])
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < min_gap: merged[-1][1] = s[1]
        else: merged.append(s)
    if merged:
        big = max(m[1] - m[0] for m in merged)
        merged = [m for m in merged if m[1] - m[0] >= big * 0.25]
    if len(merged) == expected: return merged
    nz = np.where(on)[0]; L, R = nz[0], nz[-1] + 1
    W = (R - L) / expected
    bounds = [L]
    for k in range(1, expected):
        c = int(L + k * W); w = int(W / 3)
        lo, hi = max(L, c - w), min(R, c + w)
        bounds.append(lo + int(np.argmin(profile[lo:hi])))
    bounds.append(R)
    return [[bounds[i], bounds[i + 1]] for i in range(expected)]


def erode(m, r):
    for _ in range(r):
        e = m.copy()
        e[1:, :] &= m[:-1, :]; e[:-1, :] &= m[1:, :]; e[:, 1:] &= m[:, :-1]; e[:, :-1] &= m[:, 1:]
        m = e
    return m


def dilate(m, r):
    for _ in range(r):
        d = m.copy()
        d[1:, :] |= m[:-1, :]; d[:-1, :] |= m[1:, :]; d[:, 1:] |= m[:, :-1]; d[:, :-1] |= m[:, 1:]
        m = d
    return m


def largest_component(alpha, er=3):
    orig = alpha > ALPHA_T
    m = erode(orig, er)
    H, W = m.shape
    label = np.zeros((H, W), dtype=np.int32)
    best, best_n, cur = 0, 0, 0
    for y in range(H):
        for x in range(W):
            if m[y, x] and label[y, x] == 0:
                cur += 1; n = 0; q = deque([(y, x)]); label[y, x] = cur
                while q:
                    cy, cx = q.popleft(); n += 1
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and label[ny, nx] == 0:
                            label[ny, nx] = cur; q.append((ny, nx))
                if n > best_n: best_n, best = n, cur
    return dilate(label == best, er + 1) & orig


def slice_grid(name, rows, cols, frame_h=256):
    src = os.path.join(BASE, f"_grid_{name}.png")
    im = Image.open(src).convert("RGBA")
    a = np.array(im)[:, :, 3] > ALPHA_T
    frames = []
    for y0, y1 in segments(a.sum(axis=1), rows):
        band = a[y0:y1]
        for x0, x1 in segments(band.sum(axis=0), cols):
            cell = np.array(im.crop((x0, y0, x1, y1)))
            keep_s = largest_component(cell[::2, ::2, 3])
            keep = np.kron(keep_s, np.ones((2, 2), dtype=bool))[: cell.shape[0], : cell.shape[1]]
            cell[:, :, 3] = np.where(keep, cell[:, :, 3], 0)
            f = Image.fromarray(cell)
            f = f.crop(f.getchannel("A").getbbox())
            frames.append(f)
    if len(frames) != rows * cols:
        print(f"  warn: {name} got {len(frames)} frames, expected {rows * cols}")
    s = (frame_h * 0.96) / max(f.height for f in frames)
    fw = int(max(f.width for f in frames) * s) + 4
    sheet = Image.new("RGBA", (fw * len(frames), frame_h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        g = f.resize((max(1, int(f.width * s)), max(1, int(f.height * s))), Image.LANCZOS)
        sheet.paste(g, (i * fw + (fw - g.width) // 2, frame_h - g.height), g)  # 바닥 중앙 정렬
    dst = os.path.join(BASE, f"{name}.png")
    sheet.save(dst, optimize=True)
    heights = sorted(int(f.height * s) for f in frames)
    meta = {"frames": len(frames), "w": fw, "h": frame_h, "charRatio": round(heights[len(heights) // 2] / frame_h, 3)}
    print(f"  {name}.png: {meta}, {os.path.getsize(dst) // 1024} KB")
    return meta


def split_faces(name, rows, cols, names, out_dir, size=512, prefix="poko"):
    """표정 시트를 개별 PNG로 분리 (정적 이미지용)"""
    src = os.path.join(BASE, f"_grid_{name}.png")
    im = Image.open(src).convert("RGBA")
    a = np.array(im)[:, :, 3] > ALPHA_T
    k = 0
    for y0, y1 in segments(a.sum(axis=1), rows):
        for x0, x1 in segments(a[y0:y1].sum(axis=0), cols):
            cell = np.array(im.crop((x0, y0, x1, y1)))
            keep_s = largest_component(cell[::2, ::2, 3])
            keep = np.kron(keep_s, np.ones((2, 2), dtype=bool))[: cell.shape[0], : cell.shape[1]]
            cell[:, :, 3] = np.where(keep, cell[:, :, 3], 0)
            f = Image.fromarray(cell); f = f.crop(f.getchannel("A").getbbox())
            w, h = f.size; sc = size / max(w, h)
            f = f.resize((max(1, int(w * sc)), max(1, int(h * sc))), Image.LANCZOS)
            dst = os.path.join(out_dir, f"{prefix}_{names[k]}.png"); f.save(dst, optimize=True)
            print(f"  {os.path.basename(dst)} {f.size}")
            k += 1


if __name__ == "__main__":
    jobs = [("poko_run", 2, 3), ("poko_jump", 2, 3), ("poko_idle", 2, 2), ("star_idle", 2, 2), ("spiky_idle", 2, 2), ("poko_dance", 2, 2), ("poko_wave", 2, 2), ("poko_duck", 2, 2), ("spiky_run", 2, 2)]
    meta = json.load(open(os.path.join(BASE, "sprites.json"))) if os.path.exists(os.path.join(BASE, "sprites.json")) else {}
    for name, r, c in jobs:
        if os.path.exists(os.path.join(BASE, f"_grid_{name}.png")):
            meta[name] = slice_grid(name, r, c)
    for h in ["bunny", "squirrel", "owl"]:
        for n, r, c in [("run", 2, 3), ("jump", 2, 3), ("idle", 2, 2), ("duck", 2, 2)]:
            if os.path.exists(os.path.join(BASE, f"_grid_{h}_{n}.png")): meta[f"{h}_{n}"] = slice_grid(f"{h}_{n}", r, c)
        if os.path.exists(os.path.join(BASE, f"_grid_{h}_faces.png")):
            split_faces(f"{h}_faces", 2, 3, ["happy", "surprised", "proud", "encourage", "excited", "sleepy"], os.path.join(os.path.dirname(BASE), "characters"), prefix=h)
    json.dump(meta, open(os.path.join(BASE, "sprites.json"), "w"), indent=1)
    print(json.dumps(meta))
    if os.path.exists(os.path.join(BASE, "_grid_poko_faces.png")):
        split_faces("poko_faces", 2, 3, ["surprised", "thinking", "sleepy", "proud", "sad", "excited"], os.path.join(os.path.dirname(BASE), "characters"))
