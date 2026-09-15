// BGM 시퀀서(합성) — 음원 파일이 없거나 로드에 실패했을 때의 대체용. 실제 BGM 은 아래 Music(파일 재생)이 담당.
// 세계(테마)마다 조성·박자·음색·멜로디가 다른 곡이 있고, 스테이지 구간에 따라 편곡이 바뀐다:
//   1~3 기본(멜로디+베이스+패드) / 4~6 +아르페지오·하이햇 / 7~9 템포↑·킥·후반 멜로디 옥타브↑ / 10 보스: 단조 변환·템포↑·8분 베이스
// 볼륨은 낮게(주의 분산 최소화). Music.enabled 는 localStorage에 저장.
const SynthMusic = (() => {
  const KEY = "poko_music_on";
  let enabled = (() => { try { return localStorage.getItem(KEY) !== "0"; } catch (e) { return true; } })();
  let ctx = null, master = null, timer = null, current = null, song = null, step = 0, nextTime = 0, ducked = false;
  const LOOK = 0.25, TICK = 90;

  const MODES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], penta: [0, 2, 4, 7, 9], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11] };
  const ROOTS = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A3: 220, Bb3: 233.08, A4: 440 };

  // 멜로디: [음계 도수(null=쉼표), 길이(16분음표)] 를 순서대로. 총 64스텝(4마디)이 되게 작성.
  // 베이스 진행: 마디별 코드 근음 도수. 각 세계의 성격에 맞춰 조성/템포/음색을 다르게.
  const THEMES = {
    home:    { root: "C4", mode: "penta", bpm: 84, wave: "triangle", gain: 0.07,
               mel: [[2, 3], [3, 3], [4, 4], [null, 2], [3, 2], [2, 2], [1, 6], [null, 2], [0, 4], [null, 4], [2, 3], [3, 3], [5, 4], [null, 2], [4, 2], [3, 2], [2, 6], [null, 2], [1, 4], [null, 4]],
               prog: [0, 5, 3, 4] },
    gonogo:  { root: "C4", mode: "major", bpm: 108, wave: "triangle", gain: 0.065,
               mel: [[0, 2], [2, 2], [4, 2], [null, 2], [4, 2], [5, 2], [4, 4], [2, 2], [1, 2], [2, 2], [null, 2], [0, 6], [null, 2], [4, 2], [5, 2], [6, 2], [null, 2], [7, 4], [6, 2], [4, 2], [5, 2], [4, 2], [2, 2], [null, 2], [1, 6], [null, 2]],
               prog: [0, 3, 4, 0] },
    nback:   { root: "F4", mode: "penta", bpm: 88, wave: "sine", gain: 0.075,
               mel: [[0, 4], [1, 4], [2, 6], [null, 2], [1, 4], [0, 4], [-1, 6], [null, 2], [2, 4], [3, 4], [4, 6], [null, 2], [3, 4], [2, 4], [1, 6], [null, 2]],
               prog: [0, 3, 1, 4] },
    cpt:     { root: "D4", mode: "lydian", bpm: 78, wave: "sine", gain: 0.07,
               mel: [[4, 6], [null, 2], [3, 6], [null, 2], [2, 4], [4, 4], [6, 8], [null, 8], [5, 6], [null, 2], [4, 6], [null, 2], [2, 4], [1, 4], [0, 8], [null, 8]],
               prog: [0, 4, 3, 0] },
    search:  { root: "A3", mode: "dorian", bpm: 100, wave: "square", gain: 0.04,
               mel: [[0, 2], [null, 2], [2, 2], [3, 2], [4, 4], [null, 4], [5, 2], [4, 2], [3, 2], [2, 2], [0, 6], [null, 2], [7, 2], [null, 2], [6, 2], [5, 2], [4, 4], [null, 4], [3, 2], [2, 2], [1, 2], [2, 2], [0, 6], [null, 2]],
               prog: [0, 6, 3, 4] },
    flanker: { root: "G4", mode: "major", bpm: 112, wave: "triangle", gain: 0.065,
               mel: [[0, 2], [1, 2], [2, 2], [4, 2], [2, 2], [1, 2], [0, 4], [4, 2], [5, 2], [6, 2], [7, 2], [6, 2], [5, 2], [4, 4], [2, 2], [4, 2], [5, 2], [4, 2], [2, 2], [1, 2], [0, 4], [null, 4], [1, 2], [2, 2], [1, 2], [0, 6]],
               prog: [0, 4, 5, 3] },
    switch:  { root: "E4", mode: "major", bpm: 104, wave: "square", gain: 0.038,
               mel: [[0, 1], [null, 1], [0, 1], [null, 1], [2, 2], [4, 2], [null, 2], [4, 1], [null, 1], [5, 2], [4, 2], [2, 2], [null, 2], [1, 1], [null, 1], [1, 1], [null, 1], [3, 2], [5, 2], [null, 2], [5, 1], [null, 1], [6, 2], [5, 2], [3, 2], [null, 2], [4, 2], [2, 2], [0, 4], [null, 2], [1, 2], [0, 6], [null, 2]],
               prog: [0, 3, 1, 4] },
    stroop:  { root: "Bb3", mode: "major", bpm: 96, wave: "triangle", gain: 0.065,
               mel: [[4, 2], [4, 2], [5, 2], [4, 2], [2, 4], [null, 2], [2, 2], [4, 2], [5, 2], [6, 2], [7, 2], [6, 4], [null, 2], [4, 2], [5, 2], [6, 2], [5, 2], [4, 2], [2, 4], [null, 2], [1, 2], [2, 2], [3, 2], [2, 2], [1, 2], [0, 6], [null, 2]],
               prog: [0, 5, 3, 4] },
    trail:     { root: "A4", mode: "penta", bpm: 96, wave: "triangle", gain: 0.06,
               mel: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 4], [null, 4], [4, 2], [3, 2], [2, 2], [1, 2], [0, 4], [null, 4], [2, 2], [3, 2], [4, 2], [5, 2], [6, 4], [null, 4], [5, 2], [4, 2], [3, 2], [2, 2], [1, 6], [null, 2]],
               prog: [0, 3, 1, 4] },
    headcount: { root: "G4", mode: "major", bpm: 92, wave: "sine", gain: 0.07,
               mel: [[0, 4], [2, 4], [4, 6], [null, 2], [4, 2], [3, 2], [2, 2], [1, 2], [0, 6], [null, 2], [1, 4], [3, 4], [5, 6], [null, 2], [4, 2], [3, 2], [2, 2], [1, 2], [2, 6], [null, 2]],
               prog: [0, 3, 4, 0] },
    balloons:  { root: "D4", mode: "major", bpm: 116, wave: "square", gain: 0.036,
               mel: [[0, 1], [null, 1], [2, 1], [null, 1], [4, 2], [7, 2], [null, 2], [6, 2], [4, 2], [2, 2], [null, 2], [1, 1], [null, 1], [3, 1], [null, 1], [5, 2], [7, 2], [null, 2], [6, 2], [5, 2], [4, 2], [null, 2], [4, 2], [3, 2], [2, 2], [1, 2], [0, 4], [null, 4], [2, 2], [4, 2], [0, 6], [null, 2]],
               prog: [0, 5, 3, 4] },
    melody:    { root: "C4", mode: "major", bpm: 90, wave: "sine", gain: 0.06,
               mel: [[0, 2], [2, 2], [4, 2], [7, 2], [4, 2], [2, 2], [0, 4], [null, 2], [1, 2], [3, 2], [5, 2], [3, 2], [1, 4], [null, 2], [2, 2], [4, 2], [6, 2], [4, 2], [2, 4], [null, 2], [4, 2], [3, 2], [2, 2], [1, 2], [0, 6], [null, 2]],
               prog: [0, 3, 4, 0] },
    calc:      { root: "F4", mode: "lydian", bpm: 100, wave: "triangle", gain: 0.06,
               mel: [[4, 2], [2, 2], [0, 4], [null, 2], [2, 2], [4, 2], [5, 2], [4, 4], [null, 4], [6, 2], [4, 2], [2, 4], [null, 2], [4, 2], [6, 2], [7, 2], [6, 4], [null, 4], [5, 2], [4, 2], [2, 2], [1, 2], [0, 6], [null, 2]],
               prog: [0, 4, 3, 0] },
  };

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
  }
  const freqOf = (root, mode, degree, octShift = 0) => {
    const iv = MODES[mode]; const n = iv.length;
    const oct = Math.floor(degree / n), idx = ((degree % n) + n) % n;
    return ROOTS[root] * Math.pow(2, (iv[idx] + 12 * (oct + octShift)) / 12);
  };
  function note(freq, t, dur, wave, gain, attack = 0.02) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, t + Math.max(attack, dur - 0.08)); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function kick(t) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g).connect(master); o.start(t); o.stop(t + 0.2); }
  function hat(t) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "square"; o.frequency.value = 7000 + Math.random() * 1500; g.gain.setValueAtTime(0.012, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.04); o.connect(g).connect(master); o.start(t); o.stop(t + 0.05); }

  // 테마 + 스테이지 구간 → 실제 연주 계획
  function arrange(themeId, level) {
    const th = THEMES[themeId] || THEMES.home;
    const band = level >= 10 ? 4 : level >= 7 ? 3 : level >= 4 ? 2 : 1;
    const mode = band === 4 && th.mode !== "minor" && th.mode !== "dorian" ? "minor" : th.mode;
    const bpm = th.bpm + (band === 3 ? 10 : band === 4 ? 18 : 0);
    // 멜로디 → 스텝 맵
    const melody = {}; let s = 0;
    for (const [d, len] of th.mel) { if (d !== null) melody[s % 64] = [d, len]; s += len; }
    return { th, band, mode, bpm, melody, steps: 64 };
  }

  function scheduleStep(a, s, t) {
    const spb = 60 / a.bpm / 4;
    const { th, mode, band } = a;
    const bar = Math.floor(s / 16) % 4, chordDeg = th.prog[bar];
    const m = a.melody[s];
    if (m) { const up = band >= 3 && bar >= 2 ? 1 : 0; note(freqOf(th.root, mode, m[0], up), t, m[1] * spb * 0.92, th.wave, th.gain); }
    // 베이스: 기본은 온음표/2분음표, 보스는 8분음표
    const bassEvery = band === 4 ? 2 : band >= 2 ? 8 : 16;
    if (s % bassEvery === 0) note(freqOf(th.root, mode, chordDeg, -2), t, (band === 4 ? 2 : bassEvery) * spb * 0.9, "sine", 0.055, 0.01);
    // 패드: 마디마다 3화음
    if (s % 16 === 0) [0, 2, 4].forEach((k) => note(freqOf(th.root, mode, chordDeg + k, -1), t, 16 * spb, "sine", 0.02, 0.4));
    // 아르페지오 (4스테이지~)
    if (band >= 2 && s % 2 === 0) note(freqOf(th.root, mode, chordDeg + [0, 2, 4, 2][(s / 2) % 4], 1), t, spb * 1.5, "triangle", band === 4 ? 0.035 : 0.028, 0.01);
    // 드럼: 하이햇(4~) / 킥(7~)
    if (band >= 2 && s % 4 === 2) hat(t);
    if (band >= 3 && s % 8 === 0) kick(t);
    if (band === 4 && s % 8 === 4) kick(t);
  }

  function tick() {
    const spb = 60 / song.bpm / 4;
    while (nextTime < ctx.currentTime + LOOK) {
      scheduleStep(song, step, nextTime);
      nextTime += spb; step = (step + 1) % song.steps;
    }
  }
  function fadeTo(v, sec = 0.6) {
    if (!master) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(v, ctx.currentTime + sec);
  }

  // play(테마 id, 스테이지) — 같은 테마·구간이면 이어서 재생
  function play(name, level = 1) {
    const key = `${name}:${level >= 10 ? 4 : level >= 7 ? 3 : level >= 4 ? 2 : 1}`;
    if (!enabled) { current = key; song = arrange(name, level); return; }
    ensure();
    if (current === key && timer) { fadeTo(ducked ? 0.35 : 1); return; }
    current = key; song = arrange(name, level); step = 0; nextTime = ctx.currentTime + 0.05;
    clearInterval(timer); timer = setInterval(tick, TICK); tick();
    fadeTo(ducked ? 0.35 : 1);
  }
  function stop() { clearInterval(timer); timer = null; fadeTo(0, 0.4); }
  function duck(on) { ducked = on; if (timer) fadeTo(on ? 0.35 : 1, 0.3); }
  function setEnabled(on) {
    enabled = on;
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) { /* ignore */ }
    if (on) { if (current) { const [n, b] = current.split(":"); timer = null; play(n, b === "4" ? 10 : b === "3" ? 7 : b === "2" ? 4 : 1); } } else stop();
    document.querySelectorAll("[data-music-toggle]").forEach((b) => { b.classList.toggle("muted", !on); b.title = on ? "음악 끄기" : "음악 켜기"; b.setAttribute("aria-pressed", String(on)); });
  }
  function armAutoplay() {
    const kick = () => { if (enabled && current) { const [n, b] = current.split(":"); timer = null; play(n, b === "4" ? 10 : b === "3" ? 7 : b === "2" ? 4 : 1); } };
    document.addEventListener("pointerdown", kick, { once: true });
    document.addEventListener("keydown", kick, { once: true });
  }

  return { play, stop, duck, setEnabled, armAutoplay, THEMES, get enabled() { return enabled; }, get current() { return current; } };
})();


// ===================== BGM v2 — 세계별 음원 파일 재생 (assets/music/*.mp3) =====================
// 편안하고 경쾌한 어린이용 곡을 세계마다 하나씩(홈 포함 13곡) 둔다. 60초 루프, 두 트랙을 교차 페이드.
// 스테이지 구간(4~6 / 7~9 / 10 보스)은 재생 속도로 살짝 긴장감을 준다(음높이 유지). 파일이 없으면 합성 시퀀서로 대체.
const Music = (() => {
  const KEY = "poko_music_on";
  let enabled = (() => { try { return localStorage.getItem(KEY) !== "0"; } catch (e) { return true; } })();
  const VOL = { home: 0.45, mission: 0.32 };
  const RATE = [1, 1, 1.04, 1.08, 1.12]; // band 1~4
  const TRACKS = {};
  ["home", "gonogo", "nback", "cpt", "search", "flanker", "switch", "stroop", "trail", "headcount", "balloons", "calc", "melody"].forEach((k) => { TRACKS[k] = `assets/music/${k}.mp3`; });
  let a = null, b = null, cur = null, current = null, ducked = false, fadeTimer = null, failed = false, unlocked = false;

  function el() { const e = new window.Audio(); e.loop = true; e.preload = "auto"; e.volume = 0; return e; }
  function band(level) { return level >= 10 ? 4 : level >= 7 ? 3 : level >= 4 ? 2 : 1; }
  function target() { return (current && current.startsWith("home") ? VOL.home : VOL.mission) * (ducked ? 0.35 : 1); }
  function fade(e, to, ms, stopAfter) {
    if (!e) return;
    const from = e.volume, t0 = performance.now();
    const step = () => { const k = Math.min(1, (performance.now() - t0) / ms); e.volume = from + (to - from) * k; if (k < 1) requestAnimationFrame(step); else if (stopAfter) { e.pause(); } };
    step();
  }
  function play(name, level = 1) {
    if (failed) return SynthMusic.play(name, level);
    const key = `${name}:${band(level)}`;
    if (!enabled) { current = key; return; }
    if (current === key && cur && !cur.paused) { fade(cur, target(), 300); return; }
    const sameTrack = current && current.split(":")[0] === name && cur;
    current = key;
    if (sameTrack) { cur.playbackRate = RATE[band(level)]; fade(cur, target(), 300); return; }
    const next = cur === a ? (b || (b = el())) : (a || (a = el()));
    const prev = cur; cur = next;
    next.src = TRACKS[name] || TRACKS.home; next.playbackRate = RATE[band(level)]; next.currentTime = 0;
    next.onerror = () => { if (!failed) { failed = true; SynthMusic.setEnabled(enabled); SynthMusic.play(name, level); } };
    const p = next.play();
    if (p && p.catch) p.catch(() => { /* 첫 상호작용 전 자동재생 차단 → armAutoplay 가 다시 시도 */ });
    fade(next, target(), 900);
    if (prev) fade(prev, 0, 700, true);
  }
  function stop() { if (cur) fade(cur, 0, 400, true); if (failed) SynthMusic.stop(); }
  function duck(on) { ducked = on; if (failed) return SynthMusic.duck(on); if (cur && !cur.paused) fade(cur, target(), 300); }
  function setEnabled(on) {
    enabled = on;
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) { /* ignore */ }
    if (failed) return SynthMusic.setEnabled(on);
    if (on) { if (current) { const [n, bd] = current.split(":"); const c = current; current = null; cur = null; play(n, bd === "4" ? 10 : bd === "3" ? 7 : bd === "2" ? 4 : 1); } }
    else stop();
    document.querySelectorAll("[data-music-toggle]").forEach((x) => { x.classList.toggle("muted", !on); x.title = on ? "음악 끄기" : "음악 켜기"; x.setAttribute("aria-pressed", String(on)); });
  }
  function armAutoplay() {
    const kick = () => { unlocked = true; if (enabled && current) { const [n, bd] = current.split(":"); const c = current; current = null; if (cur) { cur.pause(); } cur = null; play(n, bd === "4" ? 10 : bd === "3" ? 7 : bd === "2" ? 4 : 1); } };
    document.addEventListener("pointerdown", kick, { once: true });
    document.addEventListener("keydown", kick, { once: true });
  }
  return { play, stop, duck, setEnabled, armAutoplay, TRACKS, get enabled() { return enabled; }, get current() { return current; },
    get state() { return cur ? { src: cur.src.split("/").pop(), paused: cur.paused, volume: +cur.volume.toFixed(2), rate: cur.playbackRate, synth: failed } : { synth: failed }; } };
})();
