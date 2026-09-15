// 미션 ⑩ 풍선 순서 기억 — 기억 폭(시공간 작업기억). "숫자를 보고 가려진 뒤 작은 수부터" 메커니즘을 아동용으로 재구성.
//   숫자 풍선이 잠깐 보였다가 구름에 가려진다. 작은 수부터 큰 수 순서로 터치. 스테이지↑: 풍선 수↑, 보이는 시간↓
//   지표: 정확도(순서대로 모두 맞힌 라운드 비율), 첫 실수 위치, 기억 폭. 이름·그림·UI는 독자 제작.
const TaskBalloons = {
  id: "balloons",
  name: "풍선 순서 기억",
  world: "축제 광장",
  short: "기억 폭",
  icon: "assets/characters/coin.png",
  bg: "assets/bg/plaza.jpg",
  sticker: "assets/stickers/plaza.png",
  desc: "숫자 풍선을 잘 봐 두세요. 구름에 가려지면 작은 수부터 순서대로 터뜨려요!",
  story: "축제 풍선에 숫자가 적혀 있는데 구름이 자꾸 가려 버려. 숫자를 잘 기억했다가 작은 수부터 터뜨리면 불꽃이 터진대!",
  COLORS: ["#ff5c5c", "#4f8bff", "#ffd23f", "#4ccf6f", "#b39ddb", "#ff9b3d", "#4fc3c9", "#f48fb1"],

  levelParams(level) {
    const table = [
      { n: 3, show: 2600, rounds: 6 },
      { n: 3, show: 2200, rounds: 6 },
      { n: 4, show: 2600, rounds: 6 },
      { n: 4, show: 2200, rounds: 6 },
      { n: 5, show: 2800, rounds: 6 },
      { n: 5, show: 2300, rounds: 7 },
      { n: 6, show: 3000, rounds: 7 },
      { n: 6, show: 2500, rounds: 7 },
      { n: 7, show: 3200, rounds: 8 },
      { n: 7, show: 2700, rounds: 8 },
    ];
    return table[Math.min(level, table.length) - 1];
  },

  intro(level) {
    const p = this.levelParams(level);
    return {
      title: "풍선 순서 기억",
      desc: `풍선 <b>${p.n}개</b>에 숫자가 보여요. 잠시 뒤 구름에 가려지면 <b>작은 수부터 큰 수 순서</b>로 터치!<br>틀리면 그 라운드는 끝나요.`,
      demo: `<div class="demo-item"><div class="bl-demo"><span style="--c:#ff5c5c">7</span><span style="--c:#4f8bff">2</span><span style="--c:#ffd23f">5</span></div>2 → 5 → 7 순서!</div>`,
    };
  },

  async run(ctx, level) {
    const p = Adaptive.tune(this.levelParams(level));
    ctx.stage.innerHTML = `<div class="plaza" id="plaza"></div>`;
    ctx.controls.innerHTML = `<div class="key-hint">풍선을 작은 수부터 터치하세요</div>`;
    const plaza = document.getElementById("plaza");
    const log = [];
    const rounds = p.quick ? 3 : p.rounds;

    for (let r = 0; r < rounds; r++) {
      const nums = Stats.shuffle(Array.from({ length: 20 }, (_, i) => i + 1)).slice(0, p.n);
      const order = [...nums].sort((a, b) => a - b);
      const cols = p.n; const colors = Stats.shuffle(this.COLORS).slice(0, p.n);
      plaza.innerHTML = nums.map((v, i) => `
        <button class="balloon rise" data-v="${v}" style="left:${(i + 0.5) / cols * 100}%;top:${28 + (i % 2) * 18 + Math.random() * 10}%;--c:${colors[i]};--d:${(i * 0.08).toFixed(2)}s"><b>${v}</b><i class="cloud-cover"></i></button>`).join("");
      await ctx.wait(p.show);
      plaza.querySelectorAll(".balloon").forEach((b) => b.classList.add("covered"));
      Audio.tick();
      const me = { next: 0, failed: false, done: false, resolve: null, onset: performance.now() };
      await new Promise((res) => {
        me.resolve = res;
        plaza.querySelectorAll(".balloon").forEach((b) => b.addEventListener("pointerdown", (e) => {
          e.stopPropagation(); if (me.done || b.classList.contains("popped")) return;
          const v = +b.dataset.v;
          if (v === order[me.next]) {
            b.classList.remove("covered"); b.classList.add("popped");
            const c = Fx.center(b); Fx.burst(c.x, c.y, b.style.getPropertyValue("--c") || "#ffd24d", 10);
            me.next++;
            if (me.next === order.length) { me.done = true; ctx.hit(b, { msg: "전부 기억했어!", bonus: p.n >= 5 ? 2 : 1 }); setTimeout(res, 700); }
            else { Audio.correct(); }
          } else {
            me.failed = true; me.done = true;
            plaza.querySelectorAll(".balloon").forEach((x) => x.classList.remove("covered"));
            b.classList.add("bonk");
            ctx.miss(b, { msg: `다음은 ${order[me.next]}이었어` });
            setTimeout(res, 1100);
          }
        }));
        ctx.wait(12000).then(() => { if (!me.done) { me.done = true; me.failed = true; plaza.querySelectorAll(".balloon").forEach((x) => x.classList.remove("covered")); ctx.miss(plaza, { msg: "시간이 지났어", soft: true }); setTimeout(res, 900); } }, () => { me.done = true; res(); });
      });
      log.push({ success: !me.failed && me.next === order.length, reached: me.next, n: p.n, ms: Math.round(performance.now() - me.onset) });
      ctx.setProgress((r + 1) / rounds);
      await ctx.between();
      await ctx.wait(300);
    }
    const ok = log.filter((x) => x.success).length;
    return {
      task: this.id, level,
      accuracy: log.reduce((a, x) => a + x.reached / x.n, 0) / log.length,
      metrics: { perfectRounds: ok, span: p.n, meanReached: +(Stats.mean(log.map((x) => x.reached))).toFixed(1), meanMs: Math.round(Stats.mean(log.map((x) => x.ms))) },
      trials: log.length,
    };
  },

  summary(r) {
    return [`완벽 라운드 ${r.metrics.perfectRounds}/${r.trials}`, `풍선 ${r.metrics.span}개 기억`, `평균 ${r.metrics.meanReached}개 성공`];
  },
};
