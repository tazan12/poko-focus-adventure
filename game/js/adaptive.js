// 적응형 난이도 조절
// 근거: Kim et al. 2026 (JMIR Serious Games, doi:10.2196/83932) — 높은 난이도 도달보다
// "개인화되고 안정적인 난이도 유지"가 증상 개선과 연관. 따라서 한 번에 1단계만 이동하고
// 넓은 유지 구간(65~85%)을 두어 난이도 변동성을 낮춘다.
const Adaptive = {
  UP_THRESHOLD: 0.85,   // 정확도 85% 이상 → 1단계 상승 (brain-training-games의 80% 기준을 보수적으로 상향)
  DOWN_THRESHOLD: 0.65, // 정확도 65% 미만 → 1단계 하강
  MAX_LEVEL: 10,

  next(currentLevel, accuracy) {
    if (accuracy >= this.UP_THRESHOLD) return Math.min(this.MAX_LEVEL, currentLevel + 1);
    if (accuracy < this.DOWN_THRESHOLD) return Math.max(1, currentLevel - 1);
    return currentLevel;
  },

  // 나이대별 조정: 시간 창(자극 제시·응답 제한·간격)만 배율로 늘리거나 줄인다.
  //   6~8살 ×1.15 (조금 더 여유), 9~10살 ×1.0, 11~13살 ×0.9. 시행 수·비율·규칙은 그대로라 측정 구조는 같고,
  //   결과에는 ageBand 가 함께 기록되어 같은 나이대끼리 비교한다.
  //   14~17살 ×0.8, 어른 ×0.7 — 기획 연령(6~13) 밖의 이용자는 측정보다 재미 위주로 빠르게 진행한다.
  age: null,
  speed: false, // ⚡ 스피드 도전(14살+): 시간 창 75%, 코인 2배
  TIME_KEYS: ["stim", "isi", "limit", "show", "interval", "speed", "tempo", "gap"],
  get grown() { return !!this.age && this.age >= 14; },
  ageFactor() { const a = !this.age ? 1 : this.age <= 8 ? 1.15 : this.age <= 10 ? 1 : this.age <= 13 ? 0.9 : this.age <= 17 ? 0.8 : 0.7; return a * (this.speed ? 0.75 : 1); },
  // 테스터 모드: 시행 수를 1/3로 줄인 파라미터 사본 (측정용 데이터에는 test 플래그가 붙는다)
  quick: false,
  tune(p) {
    const f = this.ageFactor();
    if (f !== 1) { p = { ...p }; for (const k of this.TIME_KEYS) if (typeof p[k] === "number") p[k] = Math.round(p[k] * f); }
    if (!this.quick) return p;
    const q = { ...p, quick: true };
    if (q.trials) q.trials = Math.max(6, Math.round(q.trials / 3));
    if (q.sec) q.sec = Math.max(20, Math.round(q.sec / 3));
    return q;
  },

  // 결과에 따른 별(0~3) — 오답에 비처벌적: 완주만 해도 별 1개
  stars(accuracy) {
    if (accuracy >= 0.9) return 3;
    if (accuracy >= 0.75) return 2;
    return 1;
  },
};

// 공통 통계 유틸
const Stats = {
  mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; },
  sd(arr) {
    if (arr.length < 2) return 0;
    const m = this.mean(arr);
    return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1));
  },
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
};
