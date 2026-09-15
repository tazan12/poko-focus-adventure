// Web Audio API로 효과음을 합성 — 외부 파일 없이 즉각(<100ms) 피드백 제공
// ADHD 아동 대상: 오답음은 낮고 부드럽게(처벌적이지 않게), 정답음은 짧고 밝게
const Audio = (() => {
  let ctx = null;

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = "sine", gain = 0.18, delay = 0) {
    const c = ensure();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime + delay);
    g.gain.linearRampToValueAtTime(gain, c.currentTime + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    osc.connect(g).connect(c.destination);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + dur + 0.05);
  }

  return {
    unlock: ensure, tone,
    correct() { tone(660, 0.12, "sine"); tone(990, 0.16, "sine", 0.16, 0.08); },
    wrong() { tone(220, 0.25, "triangle", 0.12); },
    coin() { tone(880, 0.08, "square", 0.08); tone(1320, 0.12, "square", 0.08, 0.07); },
    tick() { tone(520, 0.05, "sine", 0.06); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, "sine", 0.16, i * 0.12)); },
    alert() { tone(440, 0.1, "sine", 0.12); tone(440, 0.1, "sine", 0.12, 0.15); },
    splash() { tone(300, 0.12, "triangle", 0.1); tone(180, 0.2, "sine", 0.08, 0.05); },
    gold() { [784, 988, 1175, 1568, 1975].forEach((f, i) => tone(f, 0.22, "sine", 0.14, i * 0.07)); },
    jingle() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.18, "sine", 0.12, i * 0.09)); },
  };
})();
