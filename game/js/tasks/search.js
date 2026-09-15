// 미션 ⑥ 숨은 별별이 찾기 — 시각 탐색 (선택주의)
// 과제 구조: 방해자극(구름·달·행성·심술이) 속에서 표적(별별이) 1개를 찾아 터치. 세트 크기·제한시간이 레벨에 따라 변함.
//   레벨 6+에서는 자극이 천천히 떠다녀 동적 탐색이 된다. 지표: 탐색 RT, 오터치(심술이/방해자극 터치), 시간초과
// 게임 껍데기: 별빛 동굴. 반짝이는 친구들 사이에 숨은 별별이를 찾아 터치하면 별빛이 켜진다.
const TaskSearch = {
  id: "search",
  name: "숨은 별별이 찾기",
  world: "별빛 동굴",
  short: "찾는 힘",
  icon: "assets/characters/star_go.png",
  bg: "assets/bg/cave.jpg",
  sticker: "assets/stickers/cave.png",
  desc: "동굴 속 친구들 사이에 숨은 별별이를 빨리 찾아 터치해요. 심술이는 절대 누르지 마세요!",
  story: "동굴 깊은 곳에 별별이들이 숨어 있어. 구름이랑 달, 행성 친구들 사이에서 별별이만 골라내야 해. 심술이를 건드리면 동굴이 흔들려!",

  levelParams(level) {
    const table = [
      { items: 6, trials: 12, limit: 7000, spiky: 0, drift: false },
      { items: 8, trials: 12, limit: 6500, spiky: 0, drift: false },
      { items: 10, trials: 14, limit: 6000, spiky: 1, drift: false },
      { items: 12, trials: 14, limit: 5500, spiky: 1, drift: false },
      { items: 14, trials: 16, limit: 5000, spiky: 2, drift: false },
      { items: 14, trials: 16, limit: 5000, spiky: 2, drift: true },
      { items: 16, trials: 16, limit: 4500, spiky: 3, drift: true },
      { items: 18, trials: 18, limit: 4200, spiky: 3, drift: true },
      { items: 20, trials: 18, limit: 4000, spiky: 4, drift: true },
      { items: 24, trials: 20, limit: 3500, spiky: 4, drift: true },
    ];
    return table[Math.min(level, table.length) - 1];
  },

  intro(level) {
    const p = this.levelParams(level);
    return {
      title: "숨은 별별이 찾기",
      desc: `친구들이 잔뜩 나타나요. 그중 <b>별별이 한 마리</b>를 찾아 <b>터치</b>(클릭)!<br>${p.spiky ? "<b>심술이</b>는 건드리면 안 돼요. " : ""}${p.drift ? "친구들이 천천히 움직여요!" : "빨리 찾을수록 코인이 많아요."}` + (level >= 8 ? "<br>👻 색이 바랜 <b>가짜 별별이</b>가 섞여 있어요. 진짜 노란 별별이만!" : ""),
      demo: `
        <div class="demo-item go"><img src="assets/characters/star_go.png" alt="">찾아서 터치!</div>
        <div class="demo-item nogo"><img src="assets/characters/cloud.png" alt="">아니야</div>
        <div class="demo-item nogo"><img src="assets/characters/planet.png" alt="">아니야</div>
        ${p.spiky ? `<div class="demo-item nogo"><img src="assets/characters/spiky_nogo.png" alt="">절대 금지!</div>` : ""}`,
    };
  },

  // 겹치지 않게 배치 (격자 셀에 무작위 지터)
  layout(n) {
    const cols = Math.ceil(Math.sqrt(n * 1.6)), rows = Math.ceil(n / cols);
    const cells = Stats.shuffle(Array.from({ length: cols * rows }, (_, i) => i)).slice(0, n);
    return cells.map((c) => ({
      x: ((c % cols) + 0.5 + (Math.random() - 0.5) * 0.5) / cols * 100,
      y: (Math.floor(c / cols) + 0.5 + (Math.random() - 0.5) * 0.5) / rows * 100,
    }));
  },

  async run(ctx, level) {
    const p = Adaptive.tune(this.levelParams(level));
    ctx.stage.innerHTML = `<div class="cave" id="cave"></div>`;
    ctx.controls.innerHTML = `<div class="key-hint">별별이를 손가락/마우스로 직접 터치하세요</div>`;
    const cave = document.getElementById("cave");
    const distractors = (level >= 3 ? ["cloud", "moon", "planet", "bunny", "squirrel", "owl"] : ["cloud", "moon", "planet"]).filter((k) => k !== Storage.hero());
    const log = [];
    let cur = null;

    for (let i = 0; i < p.trials; i++) {
      const pos = this.layout(p.items);
      const fakes = level >= 8 ? 2 : 0;
      const kinds = ["star_go", ...Array(p.spiky).fill("spiky_nogo"), ...Array(fakes).fill("star_fake"), ...Array.from({ length: p.items - 1 - p.spiky - fakes }, (_, k) => distractors[k % distractors.length])];
      cave.innerHTML = Stats.shuffle(kinds).map((k, j) => `
        <button class="cave-item ${p.drift ? "drift" : ""}" data-kind="${k}" style="left:${pos[j].x}%;top:${pos[j].y}%;--d:${(Math.random() * 2).toFixed(2)}s;--dx:${((Math.random() - 0.5) * 6).toFixed(1)}%;--dy:${((Math.random() - 0.5) * 6).toFixed(1)}%">
          <img src="assets/characters/${k === "star_fake" ? "star_go" : k}.png" alt=""></button>`).join("");
      const me = { found: false, wrong: 0, onset: performance.now(), rt: null, resolve: null };
      cur = me;
      await new Promise((res) => {
        me.resolve = res;
        cave.querySelectorAll(".cave-item").forEach((b) => b.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          if (cur !== me || me.found) return;
          const kind = b.dataset.kind;
          if (kind === "star_go") {
            me.found = true; me.rt = Math.round(performance.now() - me.onset);
            b.classList.add("found");
            const c = Fx.center(b); Fx.burst(c.x, c.y, "#ffe680", 14);
            const fast = me.rt < p.limit * 0.4;
            ctx.hit(b, { msg: fast ? "번개 찾기!" : "찾았다!", bonus: fast ? 1 : 0 });
            cur = null; setTimeout(res, 600);
          } else {
            me.wrong++;
            b.classList.add("bonk");
            if (kind === "spiky_nogo") { cave.classList.add("shake"); setTimeout(() => cave.classList.remove("shake"), 500); ctx.miss(b, { msg: "앗, 심술이!" }); }
            else ctx.miss(b, { msg: kind === "star_fake" ? "가짜 별별이야!" : "별별이가 아니야" });
          }
        }));
        ctx.wait(p.limit).then(() => { if (cur === me) { cur = null; const star = cave.querySelector('[data-kind="star_go"]'); if (star) star.classList.add("reveal"); ctx.miss(cave, { msg: "여기 숨어 있었어!", soft: true }); setTimeout(res, 900); } }, () => { cur = null; res(); });
      });
      log.push({ found: me.found, rt: me.rt, wrong: me.wrong, spikyTaps: 0 });
      ctx.setProgress((i + 1) / p.trials);
      await ctx.between();
      await ctx.wait(300);
    }

    const found = log.filter((x) => x.found).length;
    const wrong = log.reduce((a, x) => a + x.wrong, 0);
    const rts = log.filter((x) => x.found).map((x) => x.rt);
    return {
      task: this.id, level,
      accuracy: Math.max(0, (found - wrong * 0.5) / log.length),
      metrics: { found, timeouts: log.length - found, wrongTaps: wrong, meanRT: Math.round(Stats.mean(rts)), rtSD: Math.round(Stats.sd(rts)), setSize: p.items },
      trials: log.length,
    };
  },

  summary(r) {
    return [`찾은 별별이 ${r.metrics.found}/${r.trials}`, `평균 ${(r.metrics.meanRT / 1000).toFixed(1)}초`, `잘못 터치 ${r.metrics.wrongTaps}회`];
  },
};
