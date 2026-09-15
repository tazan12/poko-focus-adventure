// 미션 ⑪ 열매 계산 — 처리속도 (간단 연산). "빠른 계산" 메커니즘을 아동용으로 재구성.
//   나무 팻말의 식(덧셈·뺄셈, 고단계에서 곱셈)을 보고 답이 적힌 열매를 딴다. 보기 3개. 스테이지↑: 수 범위↑, 제한시간↓
//   지표: 정확도, 평균 응답시간. 이름·그림·UI는 독자 제작.
const TaskCalc = {
  id: "calc",
  name: "열매 계산",
  world: "별빛 과수원",
  short: "계산 힘",
  icon: "assets/characters/fruit.png",
  bg: "assets/bg/orchard.jpg",
  sticker: "assets/stickers/orchard.png",
  desc: "팻말의 계산 문제를 보고 답이 적힌 열매를 빨리 따요!",
  story: "과수원 열매마다 숫자가 적혀 있어. 팻말 문제의 답이 적힌 열매를 따면 별빛 주스를 만들 수 있대. 빠르고 정확하게!",

  levelParams(level) {
    const table = [
      { max: 10, ops: ["+"], trials: 12, limit: 9000 },
      { max: 10, ops: ["+", "-"], trials: 12, limit: 8000 },
      { max: 20, ops: ["+", "-"], trials: 14, limit: 8000 },
      { max: 20, ops: ["+", "-"], trials: 14, limit: 7000 },
      { max: 30, ops: ["+", "-"], trials: 16, limit: 7000 },
      { max: 50, ops: ["+", "-"], trials: 16, limit: 6500 },
      { max: 50, ops: ["+", "-", "×"], trials: 16, limit: 6500 },
      { max: 100, ops: ["+", "-", "×"], trials: 18, limit: 6000 },
      { max: 100, ops: ["+", "-", "×"], trials: 18, limit: 5500 },
      { max: 100, ops: ["+", "-", "×"], trials: 20, limit: 5000 },
    ];
    return table[Math.min(level, table.length) - 1];
  },

  // 나이대별 출제 범위 (한국 교육과정 기준으로 맞춤). 스테이지(1~10)는 그 안에서 난이도를 올린다.
  //   6~7살: 10→20 이내 덧셈·뺄셈만 / 8살: 20→50, 8스테이지+ 구구단(2~5단)
  //   9~10살: 100 이내 덧셈·뺄셈, 3+ 구구단(2~9단), 6+ 나눗셈(나누어떨어짐), 9+ 두 자리×한 자리
  //   11~13살: 200 이내, 2+ 나눗셈, 3+ 두 자리×한 자리, 6+ 혼합 계산(a + b × c), 8+ 두 자리×두 자리(20 이내)
  //   14~17살: 500 이내, 혼합 계산·두 자리 곱셈·나눗셈 / 어른: 1000 이내, 세 항 혼합 계산, 두 자리×두 자리
  spec(level) {
    const age = Adaptive.age || 8;
    const t = (a, b) => a + Math.round((b - a) * (level - 1) / 9); // 스테이지에 따라 a→b로 보간
    if (age <= 7) return { max: t(10, 20), ops: level >= 3 ? ["+", "-"] : ["+"], mul: null, div: null, mixed: false, label: "20까지 덧셈·뺄셈" };
    if (age <= 8) return { max: t(20, 50), ops: level >= 2 ? ["+", "-"] : ["+"], mul: level >= 8 ? [2, 5, 1, 9] : null, div: null, mixed: false, label: level >= 8 ? "50까지 덧셈·뺄셈 + 구구단" : "50까지 덧셈·뺄셈" };
    if (age <= 10) return { max: t(30, 100), ops: ["+", "-"], mul: level >= 3 ? (level >= 9 ? [11, 30, 2, 9] : [2, 9, 2, 9]) : null, div: level >= 6 ? 9 : null, mixed: false, label: level >= 6 ? "100까지 계산 + 곱셈·나눗셈" : level >= 3 ? "100까지 계산 + 구구단" : "100까지 덧셈·뺄셈" };
    if (age <= 13) return { max: t(50, 200), ops: ["+", "-"], mul: level >= 8 ? [11, 20, 11, 20] : level >= 3 ? [11, 40, 2, 9] : [2, 9, 2, 9], div: level >= 2 ? 12 : null, mixed: level >= 6, label: level >= 6 ? "혼합 계산 + 두 자리 곱셈" : "200까지 계산 + 곱셈·나눗셈" };
    if (age <= 17) return { max: t(100, 500), ops: ["+", "-"], mul: level >= 5 ? [11, 40, 11, 30] : [11, 60, 2, 9], div: 15, mixed: true, label: "혼합 계산 + 두 자리 곱셈·나눗셈" };
    return { max: t(200, 1000), ops: ["+", "-"], mul: level >= 4 ? [12, 60, 12, 60] : [11, 90, 3, 12], div: 25, mixed: true, terms3: level >= 5, label: "세 항 혼합 계산 + 두 자리 곱셈" };
  },

  intro(level) {
    const p = this.levelParams(level), sp = this.spec(level);
    return {
      title: "열매 계산",
      desc: `팻말에 <b>${sp.label}</b> 문제가 나와요. 답이 적힌 <b>열매를 터치</b>(또는 1·2·3 키)!<br>빨리 맞힐수록 보너스 코인. <small>(나이에 맞춰 출제돼요)</small>`,
      demo: `<div class="demo-item"><div class="calc-demo"><span class="sign">3 + 4 = ?</span><span class="fruit-demo">7</span></div>답 열매 따기!</div>`,
    };
  },

  problem(p, sp) {
    sp = sp || this.spec(p.level || 1);
    const ri = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
    // 연산 종류를 고른다: 덧셈·뺄셈 기본, 곱셈·나눗셈·혼합은 스펙에 있을 때 섞는다
    const kinds = [...sp.ops];
    if (sp.mul) kinds.push("×", "×");
    if (sp.div) kinds.push("÷");
    if (sp.mixed) kinds.push("mix");
    if (sp.terms3) kinds.push("mix3");
    const op = kinds[Math.floor(Math.random() * kinds.length)];
    let a, b, c, ans, text;
    if (op === "+") { a = ri(1, sp.max - 1); b = ri(1, sp.max - a); ans = a + b; text = `${a} + ${b}`; }
    else if (op === "-") { a = ri(2, sp.max); b = ri(1, a - 1); ans = a - b; text = `${a} − ${b}`; }
    else if (op === "×") { a = ri(sp.mul[0], sp.mul[1]); b = ri(sp.mul[2], sp.mul[3]); ans = a * b; text = `${a} × ${b}`; }
    else if (op === "÷") { b = ri(2, Math.min(9, sp.div)); ans = ri(2, sp.div); a = ans * b; text = `${a} ÷ ${b}`; }
    else if (op === "mix") { b = ri(2, 9); c = ri(2, 9); a = ri(1, Math.max(10, Math.floor(sp.max / 4))); if (Math.random() < 0.5) { ans = a + b * c; text = `${a} + ${b} × ${c}`; } else { const bc = b * c; a = ri(bc + 1, bc + Math.max(10, Math.floor(sp.max / 4))); ans = a - bc; text = `${a} − ${b} × ${c}`; } }
    else { a = ri(10, 99); b = ri(10, 99); c = ri(2, 9); if (Math.random() < 0.5) { ans = a + b - c; text = `${a} + ${b} − ${c}`; } else { const d = ri(2, 9); ans = a + b * c - d; text = `${a} + ${b} × ${c} − ${d}`; } }
    // 오답 보기: 답이 작으면 ±1~3, 크면 답의 약 5~15% 만큼 벗어난 값 (한 자리 실수처럼 보이게)
    const wrong = new Set();
    const span = ans < 20 ? 3 : Math.max(3, Math.round(ans * 0.12));
    let guard = 0;
    while (wrong.size < 2 && guard++ < 50) { const d = ans + (Math.random() < 0.5 ? -1 : 1) * ri(1, span); if (d !== ans && d >= 0) wrong.add(d); }
    while (wrong.size < 2) wrong.add(ans + 1 + wrong.size);
    return { text: `${text} = ?`, ans, options: Stats.shuffle([ans, ...wrong]) };
  },

  async run(ctx, level) {
    const p = Adaptive.tune(this.levelParams(level));
    const sp = this.spec(level);
    ctx.stage.innerHTML = `<div class="orchard"><div class="sign-board" id="sign-board"></div><div class="fruit-row" id="fruit-row"></div></div>`;
    ctx.controls.innerHTML = `<div class="key-hint">열매를 터치하거나 1·2·3 키</div>`;
    const sign = document.getElementById("sign-board"), row = document.getElementById("fruit-row");
    const log = [];
    for (let i = 0; i < p.trials; i++) {
      const q = this.problem(p, sp);
      sign.textContent = q.text; sign.classList.remove("pop"); void sign.offsetWidth; sign.classList.add("pop");
      row.innerHTML = q.options.map((v, k) => `<button class="fruit pop" data-v="${v}" style="--d:${(k * 0.08).toFixed(2)}s"><img src="assets/characters/fruit.png" alt=""><b>${v}</b><small>${k + 1}</small></button>`).join("");
      const onset = performance.now();
      const me = { answer: null, resolve: null };
      const choose = (v, el) => { if (me.answer !== null) return; me.answer = v; me.el = el; me.resolve(); };
      row.querySelectorAll(".fruit").forEach((b) => b.addEventListener("pointerdown", (e) => { e.stopPropagation(); choose(+b.dataset.v, b); }));
      const onKey = (e) => { const k = +e.key; if (k >= 1 && k <= 3) { const b = row.children[k - 1]; if (b) choose(+b.dataset.v, b); } };
      ctx.input.onKey(onKey);
      await new Promise((res) => { me.resolve = res; ctx.wait(p.limit).then(() => { if (me.answer === null) { me.answer = -1; res(); } }, () => { me.answer = -1; res(); }); });
      ctx.input.offKey(onKey);
      const rt = Math.round(performance.now() - onset);
      const correct = me.answer === q.ans;
      if (correct) { me.el.classList.add("picked"); const c = Fx.center(me.el); Fx.burst(c.x, c.y, "#ffd24d", 10); ctx.hit(me.el, { msg: rt < p.limit * 0.35 ? "번개 계산!" : "맞았어!", bonus: rt < p.limit * 0.35 ? 1 : 0 }); }
      else { if (me.el) me.el.classList.add("bonk"); ctx.miss(me.el || sign, { msg: me.answer < 0 ? "시간이 지났어" : `답은 ${q.ans}!`, soft: me.answer < 0 }); }
      log.push({ correct, rt: me.answer < 0 ? null : rt, timeout: me.answer < 0 });
      await ctx.wait(650);
      ctx.setProgress((i + 1) / p.trials);
      await ctx.between();
    }
    const rts = log.filter((x) => x.correct).map((x) => x.rt);
    return {
      task: this.id, level,
      accuracy: log.filter((x) => x.correct).length / log.length,
      metrics: { correct: log.filter((x) => x.correct).length, meanRT: Math.round(Stats.mean(rts)), timeouts: log.filter((x) => x.timeout).length, range: sp.max, curriculum: sp.label },
      trials: log.length,
    };
  },

  summary(r) {
    return [`정답 ${r.metrics.correct}/${r.trials}`, `평균 ${(r.metrics.meanRT / 1000).toFixed(1)}초`, `시간 초과 ${r.metrics.timeouts}회`];
  },
};
