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

  intro(level) {
    const p = this.levelParams(level);
    return {
      title: "열매 계산",
      desc: `팻말에 <b>${p.ops.join(" ")}</b> 문제가 나와요(${p.max}까지). 답이 적힌 <b>열매를 터치</b>(또는 1·2·3 키)!<br>빨리 맞힐수록 보너스 코인.`,
      demo: `<div class="demo-item"><div class="calc-demo"><span class="sign">3 + 4 = ?</span><span class="fruit-demo">7</span></div>답 열매 따기!</div>`,
    };
  },

  problem(p) {
    const op = p.ops[Math.floor(Math.random() * p.ops.length)];
    let a, b, ans;
    if (op === "+") { a = 1 + Math.floor(Math.random() * (p.max - 1)); b = 1 + Math.floor(Math.random() * (p.max - a)); ans = a + b; }
    else if (op === "-") { a = 2 + Math.floor(Math.random() * (p.max - 1)); b = 1 + Math.floor(Math.random() * (a - 1)); ans = a - b; }
    else { a = 2 + Math.floor(Math.random() * 8); b = 2 + Math.floor(Math.random() * 8); ans = a * b; }
    const wrong = new Set();
    while (wrong.size < 2) { const d = ans + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 3)); if (d !== ans && d >= 0) wrong.add(d); }
    return { text: `${a} ${op} ${b} = ?`, ans, options: Stats.shuffle([ans, ...wrong]) };
  },

  async run(ctx, level) {
    const p = Adaptive.tune(this.levelParams(level));
    ctx.stage.innerHTML = `<div class="orchard"><div class="sign-board" id="sign-board"></div><div class="fruit-row" id="fruit-row"></div></div>`;
    ctx.controls.innerHTML = `<div class="key-hint">열매를 터치하거나 1·2·3 키</div>`;
    const sign = document.getElementById("sign-board"), row = document.getElementById("fruit-row");
    const log = [];
    for (let i = 0; i < p.trials; i++) {
      const q = this.problem(p);
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
      metrics: { correct: log.filter((x) => x.correct).length, meanRT: Math.round(Stats.mean(rts)), timeouts: log.filter((x) => x.timeout).length, range: p.max },
      trials: log.length,
    };
  },

  summary(r) {
    return [`정답 ${r.metrics.correct}/${r.trials}`, `평균 ${(r.metrics.meanRT / 1000).toFixed(1)}초`, `시간 초과 ${r.metrics.timeouts}회`];
  },
};
