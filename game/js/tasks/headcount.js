// 미션 ⑨ 텐트 친구 세기 — 작업기억 갱신 (수 추적). "드나드는 인원 세기" 메커니즘을 아동용으로 재구성.
//   친구들이 텐트에 들어가고 나오는 장면이 이어진 뒤 "지금 텐트 안에 몇 명?"에 답한다. 스테이지↑: 이동 횟수↑, 속도↑, 시작 인원 숨김
//   지표: 정답률, 절대 오차 평균. 이름·그림·UI는 독자 제작.
const TaskHeadcount = {
  id: "headcount",
  name: "텐트 친구 세기",
  world: "별빛 캠프",
  short: "세는 힘",
  icon: "assets/characters/cloud.png",
  bg: "assets/bg/camp.jpg",
  sticker: "assets/stickers/camp.png",
  desc: "친구들이 텐트에 들어가고 나와요. 마지막에 텐트 안에 몇 명 있는지 맞혀요!",
  story: "캠프의 텐트는 안이 안 보여. 누가 들어가고 누가 나오는지 잘 세어 두었다가, 안에 몇 명 남았는지 알려 줘!",
  CRITTERS: ["star_go", "cloud", "moon", "planet"],

  levelParams(level) {
    const table = [
      { moves: 3, start: 2, speed: 1100, trials: 5, hideStart: false, maxIn: 6 },
      { moves: 4, start: 2, speed: 1000, trials: 5, hideStart: false, maxIn: 7 },
      { moves: 5, start: 3, speed: 950, trials: 6, hideStart: false, maxIn: 8 },
      { moves: 6, start: 3, speed: 900, trials: 6, hideStart: false, maxIn: 8 },
      { moves: 6, start: 3, speed: 850, trials: 6, hideStart: true, maxIn: 9 },
      { moves: 7, start: 4, speed: 800, trials: 6, hideStart: true, maxIn: 9 },
      { moves: 8, start: 4, speed: 750, trials: 7, hideStart: true, maxIn: 10 },
      { moves: 9, start: 4, speed: 700, trials: 7, hideStart: true, maxIn: 10 },
      { moves: 10, start: 5, speed: 650, trials: 7, hideStart: true, maxIn: 11 },
      { moves: 12, start: 5, speed: 600, trials: 8, hideStart: true, maxIn: 12 },
    ];
    return table[Math.min(level, table.length) - 1];
  },

  intro(level) {
    const p = this.levelParams(level);
    return {
      title: "텐트 친구 세기",
      desc: `처음에 ${p.hideStart ? "친구들이 <b>빠르게</b> 들어가고" : `친구 <b>${p.start}명</b>이 들어가 있고`}, 그다음 친구들이 <b>들어가거나 나와요</b>.<br>끝나면 <b>텐트 안에 몇 명</b>인지 숫자를 골라요!`,
      demo: `<div class="demo-item"><div class="hc-demo"><img src="assets/characters/cloud.png" alt="">→ ⛺ ← <img src="assets/characters/moon.png" alt=""></div>들어가면 +1, 나오면 −1</div>`,
    };
  },

  async run(ctx, level) {
    const p = Adaptive.tune(this.levelParams(level));
    ctx.stage.innerHTML = `
      <div class="camp">
        <div class="tent-wrap"><img class="tent" src="assets/characters/tent.png" alt=""><div class="tent-count" id="tent-count"></div></div>
        <div class="camp-lane" id="camp-lane"></div>
        <div class="camp-msg" id="camp-msg"></div>
      </div>`;
    ctx.controls.innerHTML = "";
    const lane = document.getElementById("camp-lane"), msg = document.getElementById("camp-msg"), countEl = document.getElementById("tent-count");
    const log = [];
    const trials = p.quick ? 3 : p.trials;

    const walk = async (kind, dir, speed) => {
      // dir: "in" 오른쪽에서 텐트로 / "out" 텐트에서 오른쪽으로
      const el = document.createElement("img"); el.src = `assets/characters/${kind}.png`; el.className = `walker ${dir}`; el.style.setProperty("--dur", `${speed}ms`);
      lane.appendChild(el); Audio.tick();
      await ctx.wait(speed + 80); el.remove();
    };

    for (let t = 0; t < trials; t++) {
      let inside = 0;
      msg.textContent = ""; countEl.textContent = "";
      // 시작 인원: 보이게 표시하거나(저단계) 빠르게 들어가게(고단계)
      if (!p.hideStart) { inside = p.start; countEl.textContent = `${inside}명 안에 있어요`; await ctx.wait(1400); countEl.textContent = ""; }
      else { for (let k = 0; k < p.start; k++) { await walk(this.CRITTERS[k % 4], "in", Math.round(p.speed * 0.7)); inside++; } }
      // 이동 시퀀스: 안이 0 미만/최대 초과가 되지 않게
      const moves = [];
      let cur = inside;
      for (let k = 0; k < p.moves; k++) {
        let dir = Math.random() < 0.5 ? "in" : "out";
        if (cur <= 0) dir = "in"; if (cur >= p.maxIn) dir = "out";
        moves.push(dir); cur += dir === "in" ? 1 : -1;
      }
      for (const dir of moves) { await walk(this.CRITTERS[Math.floor(Math.random() * 4)], dir, p.speed); inside += dir === "in" ? 1 : -1; await ctx.wait(120); }
      // 질문
      msg.textContent = "텐트 안에 몇 명?";
      const opts = []; const lo = Math.max(0, inside - 2), hi = lo + 4;
      for (let v = lo; v <= hi; v++) opts.push(v);
      ctx.controls.innerHTML = opts.map((v) => `<button class="num-btn" data-v="${v}">${v}</button>`).join("") + `<div class="key-hint">숫자 키로도 답할 수 있어요</div>`;
      const onset = performance.now();
      const me = { answer: null, resolve: null };
      const choose = (v) => { if (me.answer !== null) return; me.answer = v; me.resolve(); };
      ctx.controls.querySelectorAll(".num-btn").forEach((b) => b.addEventListener("pointerdown", (e) => { e.stopPropagation(); choose(+b.dataset.v); }));
      const onKey = (e) => { if (/^[0-9]$/.test(e.key) && opts.includes(+e.key)) choose(+e.key); };
      ctx.input.onKey(onKey);
      await new Promise((res) => { me.resolve = res; ctx.wait(8000).then(() => { if (me.answer === null) { me.answer = -1; res(); } }, () => { me.answer = -1; res(); }); });
      ctx.input.offKey(onKey);
      const rt = Math.round(performance.now() - onset);
      const correct = me.answer === inside;
      countEl.textContent = `${inside}명!`;
      const tent = document.querySelector(".tent-wrap");
      if (correct) { const c = Fx.center(tent); Fx.burst(c.x, c.y - 30, "#ffe680", 12); ctx.hit(tent, { msg: "딱 맞았어!" }); }
      else ctx.miss(tent, { msg: me.answer < 0 ? "시간이 지났어" : `정답은 ${inside}명이었어` });
      log.push({ correct, answer: me.answer, truth: inside, rt, err: me.answer < 0 ? null : Math.abs(me.answer - inside) });
      ctx.controls.innerHTML = "";
      await ctx.wait(1100);
      ctx.setProgress((t + 1) / trials);
      await ctx.between();
    }
    const errs = log.filter((x) => x.err !== null).map((x) => x.err);
    return {
      task: this.id, level,
      accuracy: log.filter((x) => x.correct).length / log.length,
      metrics: { correct: log.filter((x) => x.correct).length, meanAbsError: errs.length ? +(Stats.mean(errs)).toFixed(2) : 0, moves: p.moves, meanRT: Math.round(Stats.mean(log.filter((x) => x.answer >= 0).map((x) => x.rt))) },
      trials: log.length,
    };
  },

  summary(r) {
    return [`맞힌 횟수 ${r.metrics.correct}/${r.trials}`, `평균 오차 ${r.metrics.meanAbsError}명`, `이동 ${r.metrics.moves}번`];
  },
};
