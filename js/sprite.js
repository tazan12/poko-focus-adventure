// 프레임 스프라이트 재생기 — Higgsfield로 생성한 시트를 슬라이스한 assets/sprites/*.png 사용
// JS로 프레임을 넘겨서 일시정지(Sprite.paused)에 즉시 반응한다.
const Sprite = (() => {
  // slice_sprites.py 가 만든 sprites.json 과 동일한 메타 (file:// 실행을 위해 인라인)
  const META = {
    poko_run: { frames: 6, w: 285, h: 256, charRatio: 0.945 },
    poko_jump: { frames: 6, w: 278, h: 256, charRatio: 0.918 },
    poko_idle: { frames: 4, w: 187, h: 256, charRatio: 0.938 },
    star_idle: { frames: 4, w: 251, h: 256, charRatio: 0.914 },
    spiky_idle: { frames: 4, w: 312, h: 256, charRatio: 0.938 },
    poko_dance: { frames: 4, w: 215, h: 256, charRatio: 0.945 },
    poko_wave: { frames: 4, w: 214, h: 256, charRatio: 0.941 },
  };
  // 프레임별 머리 앵커 [x, y] (프레임 폭·높이 대비 비율). 모자는 이 점에 캐릭터 키 기준 크기로 얹힌다.
  const HEAD = {
    poko_idle: [[0.55, 0.14], [0.52, 0.21], [0.55, 0.14], [0.57, 0.15]],
    poko_wave: [[0.52, 0.13], [0.5, 0.12], [0.5, 0.14], [0.5, 0.12]],
    poko_dance: [[0.5, 0.19], [0.46, 0.15], [0.43, 0.2], [0.51, 0.15]],
    poko_jump: [[0.6, 0.44], [0.58, 0.16], [0.58, 0.16], [0.62, 0.17], [0.58, 0.28], [0.6, 0.43]],
    poko_run: [[0.63, 0.1], [0.63, 0.12], [0.63, 0.1], [0.63, 0.1], [0.63, 0.12], [0.63, 0.1]],
  };
  const active = new Set();
  let paused = false;

  // 요소에 시트를 붙인다. charHeight(px 또는 CSS 길이)는 "캐릭터 실제 높이" 기준이라 시트가 바뀌어도 크기가 같게 보인다.
  function attach(el, name, { charHeight } = {}) {
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
    if (hat) { const h = (HEAD[el.dataset.sprite] || [[0.5, 0.14]])[i] || [0.5, 0.14]; hat.style.left = `${h[0] * 100}%`; hat.style.top = `${h[1] * 100}%`; }
  }

  function stop(el) {
    if (el._sprite) { clearInterval(el._sprite.timer); active.delete(el); if (el._sprite.arc) el.style.transform = ""; el._sprite = null; }
  }

  // 재생. loop=false면 마지막 프레임에서 멈추고 onEnd 호출.
  // arc: 프레임 진행에 맞춰 포물선(translateY)을 그린다 — 점프 시트가 바닥 정렬이라 궤적은 코드로 만든다.
  function play(el, name, { fps = 10, loop = true, onEnd = null, charHeight, arc = 0 } = {}) {
    stop(el);
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
    attach, play, stop, stopAll, detach, META,
    get paused() { return paused; }, set paused(v) { paused = v; },
  };
})();
