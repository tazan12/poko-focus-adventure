// 프레임 스프라이트 재생기 — Higgsfield로 생성한 시트를 슬라이스한 assets/sprites/*.png 사용
// JS로 프레임을 넘겨서 일시정지(Sprite.paused)에 즉시 반응한다.
const Sprite = (() => {
  // slice_sprites.py 가 만든 sprites.json 과 동일한 메타 (file:// 실행을 위해 인라인)
  const META = {
    star_idle: { frames: 4, w: 251, h: 256, charRatio: 0.914 },
    spiky_idle: { frames: 4, w: 312, h: 256, charRatio: 0.938 },
    poko_dance: { frames: 4, w: 215, h: 256, charRatio: 0.945 },
    poko_wave: { frames: 4, w: 214, h: 256, charRatio: 0.941 },
    spiky_run: { frames: 4, w: 271, h: 256, charRatio: 0.957 },
    // 잡기(손 뻗어 안기) — 점프와 구분되는 동작
    // 선택 가능한 주인공(토토·도토·부우) — Sprite.hero 로 poko_* 이름이 여기로 해석된다
    // 주인공 시트 (tools/hat_anchors.py 가 sprites.json 에서 자동 갱신)
    // 주인공 시트 (tools/hat_anchors.py 가 sprites.json 에서 자동 갱신)
    // 주인공 시트 (tools/hat_anchors.py 가 sprites.json 에서 자동 갱신)
    // 주인공 시트 (tools/hat_anchors.py 가 sprites.json 에서 자동 갱신)
    poko_idle: { frames: 4, w: 187, h: 256, charRatio: 0.938 },
    poko_run: { frames: 6, w: 285, h: 256, charRatio: 0.945 },
    poko_jump: { frames: 6, w: 250, h: 256, charRatio: 0.875 },
    poko_catch: { frames: 4, w: 269, h: 256, charRatio: 0.949 },
    poko_duck: { frames: 4, w: 278, h: 256, charRatio: 0.934 },
    bunny_idle: { frames: 4, w: 308, h: 256, charRatio: 0.859 },
    bunny_run: { frames: 6, w: 300, h: 256, charRatio: 0.852 },
    bunny_jump: { frames: 6, w: 246, h: 256, charRatio: 0.848 },
    bunny_catch: { frames: 4, w: 290, h: 256, charRatio: 0.938 },
    bunny_duck: { frames: 4, w: 303, h: 256, charRatio: 0.945 },
    squirrel_idle: { frames: 4, w: 265, h: 256, charRatio: 0.914 },
    squirrel_run: { frames: 6, w: 396, h: 256, charRatio: 0.879 },
    squirrel_jump: { frames: 6, w: 260, h: 256, charRatio: 0.855 },
    squirrel_catch: { frames: 4, w: 326, h: 256, charRatio: 0.953 },
    squirrel_duck: { frames: 4, w: 271, h: 256, charRatio: 0.879 },
    owl_idle: { frames: 4, w: 221, h: 256, charRatio: 0.93 },
    owl_run: { frames: 6, w: 348, h: 256, charRatio: 0.953 },
    owl_jump: { frames: 6, w: 265, h: 256, charRatio: 0.941 },
    owl_catch: { frames: 4, w: 288, h: 256, charRatio: 0.934 },
    owl_duck: { frames: 4, w: 283, h: 256, charRatio: 0.953 },
    dino_idle: { frames: 4, w: 169, h: 256, charRatio: 0.91 },
    dino_run: { frames: 6, w: 268, h: 256, charRatio: 0.91 },
    dino_jump: { frames: 6, w: 209, h: 256, charRatio: 0.809 },
    dino_catch: { frames: 4, w: 242, h: 256, charRatio: 0.949 },
    dino_duck: { frames: 4, w: 249, h: 256, charRatio: 0.953 },
    pig_idle: { frames: 4, w: 216, h: 256, charRatio: 0.949 },
    pig_run: { frames: 6, w: 287, h: 256, charRatio: 0.922 },
    pig_jump: { frames: 6, w: 204, h: 256, charRatio: 0.691 },
    pig_catch: { frames: 4, w: 271, h: 256, charRatio: 0.957 },
    pig_duck: { frames: 4, w: 295, h: 256, charRatio: 0.883 },
    sheep_idle: { frames: 4, w: 209, h: 256, charRatio: 0.906 },
    sheep_run: { frames: 6, w: 279, h: 256, charRatio: 0.918 },
    sheep_jump: { frames: 6, w: 196, h: 256, charRatio: 0.824 },
    sheep_catch: { frames: 4, w: 237, h: 256, charRatio: 0.945 },
    sheep_duck: { frames: 4, w: 251, h: 256, charRatio: 0.918 },
    tiger_idle: { frames: 4, w: 183, h: 256, charRatio: 0.934 },
    tiger_run: { frames: 6, w: 336, h: 256, charRatio: 0.914 },
    tiger_jump: { frames: 6, w: 235, h: 256, charRatio: 0.734 },
    tiger_catch: { frames: 4, w: 336, h: 256, charRatio: 0.953 },
    tiger_duck: { frames: 4, w: 269, h: 256, charRatio: 0.945 },
  };
  // 프레임별 머리 앵커 [x, y] (프레임 폭·높이 대비 비율). 모자는 이 점에 캐릭터 키 기준 크기로 얹힌다.
  const HEAD = {
    poko_wave: [[0.52, 0.13], [0.5, 0.12], [0.5, 0.14], [0.5, 0.12]],
    poko_dance: [[0.5, 0.19], [0.46, 0.15], [0.43, 0.2], [0.51, 0.15]],
    // 아래는 tools/hat_anchors.py 가 프레임 알파에서 자동 계산한 머리 앵커
    poko_idle: [[0.5, 0.19, 0.87], [0.5, 0.21, 0.95], [0.49, 0.19, 0.88], [0.49, 0.17, 0.94]],
    poko_run: [[0.65, 0.15, 1.07], [0.67, 0.22, 1.06], [0.69, 0.16, 1.06], [0.66, 0.14, 1.08], [0.66, 0.16, 1.08], [0.7, 0.22, 1.05]],
    poko_jump: [[0.66, 0.3, 0.99], [0.65, 0.18, 0.92], [0.65, 0.09, 0.9], [0.6, 0.17, 0.75], [0.72, 0.35, 0.99], [0.66, 0.34, 0.97]],
    poko_catch: [[0.6, 0.09, 0.75], [0.61, 0.15, 0.8], [0.61, 0.1, 0.75], [0.6, 0.08, 0.75]],
    poko_duck: [[0.65, 0.21, 1.04], [0.69, 0.48, 1.15], [0.67, 0.48, 1.15], [0.65, 0.16, 1.02]],
    bunny_idle: [[0.52, 0.17, 1.15], [0.52, 0.26, 1.15], [0.5, 0.08, 1.15], [0.52, 0.17, 1.15]],
    bunny_run: [[0.66, 0.18, 1.11], [0.66, 0.07, 1.13], [0.69, 0.18, 1.15], [0.65, 0.2, 1.06], [0.64, 0.14, 1.02], [0.66, 0.18, 1.13]],
    bunny_jump: [[0.7, 0.41, 1.12], [0.66, 0.19, 0.98], [0.68, 0.11, 1.07], [0.68, 0.3, 1.07], [0.61, 0.27, 0.75], [0.68, 0.32, 1.03]],
    bunny_catch: [[0.6, 0.09, 0.78], [0.62, 0.1, 0.94], [0.6, 0.09, 0.75], [0.62, 0.08, 0.84]],
    bunny_duck: [[0.64, 0.06, 1.0], [0.68, 0.39, 1.15], [0.66, 0.44, 1.15], [0.64, 0.07, 1.0]],
    squirrel_idle: [[0.5, 0.14, 1.15], [0.61, 0.18, 0.82], [0.49, 0.12, 1.15], [0.5, 0.19, 1.15]],
    squirrel_run: [[0.62, 0.2, 1.15], [0.63, 0.18, 1.15], [0.74, 0.29, 1.15], [0.63, 0.25, 1.15], [0.63, 0.23, 1.15], [0.63, 0.25, 1.15]],
    squirrel_jump: [[0.67, 0.42, 1.03], [0.65, 0.28, 0.96], [0.71, 0.16, 1.05], [0.65, 0.32, 0.95], [0.67, 0.38, 1.03], [0.68, 0.39, 1.12]],
    squirrel_catch: [[0.63, 0.14, 1.05], [0.63, 0.23, 1.08], [0.63, 0.14, 1.06], [0.64, 0.17, 1.12]],
    squirrel_duck: [[0.67, 0.09, 1.0], [0.64, 0.2, 0.96], [0.63, 0.21, 0.92], [0.66, 0.16, 0.95]],
    owl_idle: [[0.52, 0.16, 0.95], [0.51, 0.28, 1.07], [0.5, 0.11, 1.02], [0.51, 0.2, 0.99]],
    owl_run: [[0.6, 0.15, 0.9], [0.63, 0.2, 1.12], [0.58, 0.14, 0.75], [0.59, 0.15, 0.86], [0.59, 0.2, 0.79], [0.61, 0.24, 1.03]],
    owl_jump: [[0.64, 0.31, 0.94], [0.65, 0.19, 0.96], [0.62, 0.19, 0.84], [0.61, 0.26, 0.78], [0.62, 0.18, 0.81], [0.65, 0.28, 0.93]],
    owl_catch: [[0.59, 0.25, 0.75], [0.6, 0.27, 0.8], [0.6, 0.18, 0.75], [0.6, 0.17, 0.75]],
    owl_duck: [[0.6, 0.14, 0.75], [0.64, 0.44, 0.99], [0.64, 0.43, 0.99], [0.6, 0.14, 0.75]],
    dino_idle: [[0.48, 0.15, 0.75], [0.49, 0.27, 0.82], [0.47, 0.1, 0.75], [0.48, 0.15, 0.81]],
    dino_run: [[0.65, 0.1, 0.95], [0.65, 0.12, 0.99], [0.69, 0.25, 1.11], [0.65, 0.19, 0.96], [0.64, 0.16, 0.95], [0.65, 0.16, 0.96]],
    dino_jump: [[0.68, 0.38, 0.9], [0.65, 0.18, 0.76], [0.64, 0.09, 0.75], [0.61, 0.25, 0.75], [0.66, 0.33, 0.8], [0.68, 0.38, 0.9]],
    dino_catch: [[0.59, 0.11, 0.75], [0.6, 0.18, 0.75], [0.59, 0.12, 0.75], [0.6, 0.11, 0.75]],
    dino_duck: [[0.62, 0.09, 0.75], [0.67, 0.44, 1.01], [0.67, 0.43, 1.0], [0.62, 0.09, 0.75]],
    pig_idle: [[0.5, 0.08, 1.03], [0.5, 0.15, 1.1], [0.5, 0.07, 1.02], [0.49, 0.1, 1.07]],
    pig_run: [[0.64, 0.06, 1.0], [0.64, 0.09, 0.96], [0.67, 0.21, 1.15], [0.63, 0.1, 0.95], [0.63, 0.12, 0.93], [0.64, 0.1, 1.01]],
    pig_jump: [[0.68, 0.39, 0.88], [0.64, 0.17, 0.75], [0.63, 0.06, 0.75], [0.66, 0.33, 0.79], [0.65, 0.35, 0.76], [0.67, 0.38, 0.84]],
    pig_catch: [[0.58, 0.11, 0.75], [0.62, 0.08, 0.85], [0.64, 0.07, 0.88], [0.63, 0.06, 0.82]],
    pig_duck: [[0.61, 0.07, 0.83], [0.67, 0.38, 1.15], [0.65, 0.43, 1.11], [0.61, 0.14, 0.79]],
    sheep_idle: [[0.5, 0.11, 0.99], [0.5, 0.19, 1.0], [0.49, 0.06, 0.97], [0.5, 0.11, 1.01]],
    sheep_run: [[0.66, 0.07, 1.04], [0.65, 0.07, 1.0], [0.7, 0.17, 1.15], [0.65, 0.11, 0.99], [0.64, 0.11, 0.94], [0.65, 0.11, 1.0]],
    sheep_jump: [[0.69, 0.32, 0.88], [0.65, 0.13, 0.75], [0.65, 0.05, 0.75], [0.66, 0.27, 0.75], [0.67, 0.2, 0.81], [0.69, 0.32, 0.87]],
    sheep_catch: [[0.58, 0.11, 0.75], [0.62, 0.12, 0.75], [0.61, 0.1, 0.75], [0.59, 0.09, 0.75]],
    sheep_duck: [[0.65, 0.06, 0.87], [0.68, 0.28, 1.06], [0.67, 0.35, 1.01], [0.65, 0.1, 0.89]],
    tiger_idle: [[0.49, 0.11, 0.89], [0.5, 0.25, 0.93], [0.49, 0.08, 0.88], [0.5, 0.13, 0.9]],
    tiger_run: [[0.65, 0.11, 1.15], [0.65, 0.06, 1.15], [0.72, 0.15, 1.15], [0.66, 0.14, 1.15], [0.66, 0.09, 1.15], [0.66, 0.12, 1.15]],
    tiger_jump: [[0.7, 0.36, 0.97], [0.66, 0.1, 0.88], [0.64, 0.06, 0.81], [0.63, 0.31, 0.75], [0.66, 0.3, 0.86], [0.7, 0.36, 0.97]],
    tiger_catch: [[0.59, 0.11, 0.81], [0.62, 0.15, 1.05], [0.6, 0.07, 0.81], [0.59, 0.07, 0.78]],
    tiger_duck: [[0.62, 0.06, 0.82], [0.68, 0.48, 1.13], [0.67, 0.48, 1.13], [0.62, 0.07, 0.81]],
  };
  const active = new Set();
  let paused = false;
  let hero = "poko";
  // 선택한 주인공에 맞춰 시트 이름을 바꾼다. 없는 동작은 비슷한 시트로 대체(손흔들기→서기, 춤→점프 반복)
  const FALLBACK = { wave: "idle", dance: "jump" };
  function resolve(name) {
    if (hero === "poko" || !name.startsWith("poko_")) return name;
    const suffix = name.slice(5);
    const alt = `${hero}_${suffix}`;
    if (META[alt]) return alt;
    const fb = FALLBACK[suffix] && `${hero}_${FALLBACK[suffix]}`;
    return fb && META[fb] ? fb : name;
  }

  // 요소에 시트를 붙인다. charHeight(px 또는 CSS 길이)는 "캐릭터 실제 높이" 기준이라 시트가 바뀌어도 크기가 같게 보인다.
  function attach(el, name, { charHeight } = {}) {
    name = resolve(name);
    const m = META[name];
    el.classList.add("sprite");
    el.dataset.sprite = name;
    el.style.backgroundImage = `url("assets/sprites/${name}.png")`;
    el.style.backgroundSize = `${m.frames * 100}% 100%`;
    el.style.aspectRatio = `${m.w} / ${m.h}`;
    if (charHeight) el.style.height = `calc(${charHeight} / ${m.charRatio})`;
    setFrame(el, 0);
  }

  function setFrame(el, i) {
    const m = META[el.dataset.sprite];
    el.style.backgroundPositionX = m.frames > 1 ? `${(i / (m.frames - 1)) * 100}%` : "0";
    const hat = el.querySelector && el.querySelector(".hat-slot");
    // 프레임별 머리 앵커 [x, y, scale] — scale은 머리 폭에 맞춘 모자 크기 배율 (tools/hat_anchors.py)
    if (hat) { const h = (HEAD[el.dataset.sprite] || [[0.5, 0.14]])[i] || [0.5, 0.14]; hat.style.left = `${h[0] * 100}%`; hat.style.top = `${h[1] * 100}%`; hat.style.height = `${(34 * (h[2] || 1)).toFixed(1)}%`; }
  }

  function stop(el) {
    if (el._sprite) { clearInterval(el._sprite.timer); active.delete(el); if (el._sprite.arc) el.style.transform = ""; el._sprite = null; }
  }

  // 재생. loop=false면 마지막 프레임에서 멈추고 onEnd 호출.
  // arc: 프레임 진행에 맞춰 포물선(translateY)을 그린다 — 점프 시트가 바닥 정렬이라 궤적은 코드로 만든다.
  function play(el, name, { fps = 10, loop = true, onEnd = null, charHeight, arc = 0 } = {}) {
    stop(el);
    name = resolve(name);
    if (el.dataset.sprite !== name) attach(el, name, { charHeight });
    const m = META[name];
    let i = 0;
    setFrame(el, 0);
    const applyArc = (k) => {
      if (!arc) return;
      const t = k / (m.frames - 1);                 // 0 → 1
      const y = -arc * 4 * t * (1 - t);             // 포물선: 중간 프레임에서 최고점
      el.style.transform = `translateY(${y.toFixed(1)}%)`;
    };
    applyArc(0);
    const st = { timer: null, arc };
    st.timer = setInterval(() => {
      if (paused) return;
      i++;
      if (i >= m.frames) {
        if (loop) i = 0;
        else { stop(el); if (arc) el.style.transform = ""; if (onEnd) onEnd(); return; }
      }
      setFrame(el, i);
      applyArc(i);
    }, 1000 / fps);
    el._sprite = st;
    active.add(el);
  }

  function stopAll() { [...active].forEach(stop); }
  // 스프라이트 해제: 정적 이미지를 넣기 전에 배경 크기/위치/비율 잔여값을 지운다 (이미지 깨짐 방지)
  function detach(el) {
    stop(el);
    el.classList.remove("sprite"); delete el.dataset.sprite;
    el.style.backgroundImage = ""; el.style.backgroundSize = ""; el.style.backgroundPositionX = ""; el.style.aspectRatio = ""; el.style.height = ""; el.style.transform = "";
  }

  return {
    attach, play, stop, stopAll, detach, META, resolve,
    get paused() { return paused; }, set paused(v) { paused = v; },
    get hero() { return hero; }, set hero(v) { hero = v || "poko"; },
  };
})();
