// 미션 ⑤ 강물 길잡이 — Flanker (선택주의/간섭통제)
// 근거: Eriksen flanker는 소아 ADHD RCT에서 간섭통제 표적 과제로 사용 (Krauel et al. 2025 JAMA Netw Open, doi:10.1001/jamanetworkopen.2024.60477)
// 과제 구조: 5마리 물고기 중 가운데 물고기가 향하는 방향으로 응답. 양옆 물고기는 같은 방향(일치) 또는 반대 방향(불일치).
//   불일치 50%, 응답 제한 2.5→1.2초. 지표: 플랭커 효과(불일치 RT − 일치 RT), 정확도, 시간초과
// 게임 껍데기: 포코가 보트를 타고 강을 내려간다. 길잡이 물고기(가운데)가 가리키는 쪽으로 노를 저어야 한다.
const TaskFlanker = {
  id: "flanker",
  name: "강물 길잡이",
  world: "반짝 강",
  short: "고르는 힘",
  icon: "assets/characters/fish.png",
  bg: "assets/bg/river.jpg",
  sticker: "assets/stickers/river.png",
  desc: "가운데 길잡이 물고기가 가리키는 쪽으로 노를 저어요. 옆 물고기들은 속임수!",
  story: "강물이 갈라지는 곳마다 길잡이 물고기가 방향을 알려 줘. 그런데 장난꾸러기 물고기들이 옆에서 반대쪽을 가리키기도 해. 가운데 물고기만 믿고 노를 저어!",

  levelParams(level) {
    const table = [
      { limit: 2500, trials: 24, incongruent: 0.4, gap: 900 },
      { limit: 2200, trials: 26, incongruent: 0.45, gap: 850 },
      { limit: 2000, trials: 28, incongruent: 0.5, gap: 800 },
      { limit: 1800, trials: 30, incongruent: 0.5, gap: 750 },
      { limit: 1650, trials: 30, incongruent: 0.55, gap: 700 },
      { limit: 1500, trials: 32, incongruent: 0.6, gap: 650 },
      { limit: 1400, trials: 32, incongruent: 0.6, gap: 600 },
      { limit: 1300, trials: 34, incongruent: 0.65, gap: 600 },
      { limit: 1250, trials: 34, incongruent: 0.7, gap: 550 },
      { limit: 1200, trials: 36, incongruent: 0.7, gap: 500 },
    ];
    return table[Math.min(level, table.length) - 1];
  },

  tier(level) { return { n: level >= 4 ? 7 : 5, wobble: level >= 7 }; },
  intro(level) {
    const t = this.tier(level);
    return {
      title: "강물 길잡이",
      desc: `물고기 ${t.n}마리가 헤엄쳐 와요. <b>가운데 물고기</b>가 향하는 쪽으로 노를 저어요!<br>← → 키, 화면 왼쪽/오른쪽 터치, 또는 아래 버튼.<br>옆 물고기들이 반대를 가리켜도 <b>가운데만</b> 보세요.` + (t.n > 5 ? "<br>🐟 장난꾸러기 물고기가 <b>더 많아졌어요</b>." : "") + (t.wobble ? "<br>🌊 물고기 떼가 <b>흔들리며 떠내려가요</b>." : ""),
      demo: `<div class="demo-item"><div class="fish-demo">
          <img src="assets/characters/fish.png" class="flip" alt=""><img src="assets/characters/fish.png" class="flip" alt="">
          <img src="assets/characters/fish.png" class="center" alt="">
          <img src="assets/characters/fish.png" class="flip" alt=""><img src="assets/characters/fish.png" class="flip" alt="">
        </div>→ 오른쪽!</div>`,
    };
  },

  async run(ctx, level) {
    const p = Adaptive.tune(this.levelParams(level));
    const nInc = Math.round(p.trials * p.incongruent);
    const kinds = Stats.shuffle([...Array(nInc).fill(false), ...Array(p.trials - nInc).fill(true)]);

    ctx.stage.innerHTML = `
      <div class="river">
        <div class="fish-row" id="fish-row"></div>
        <img class="boat" id="boat" src="assets/characters/poko_boat.png" alt="포코">
      </div>`;
    ctx.controls.innerHTML = `
      <button class="tap-btn dir" id="fl-left">◀ 왼쪽</button>
      <button class="tap-btn dir" id="fl-right">오른쪽 ▶</button>
      <div class="key-hint">키보드: ← → · 화면 왼쪽/오른쪽 터치</div>`;
    const row = document.getElementById("fish-row");
    const boat = document.getElementById("boat");

    let cur = null; // { dir(0=왼,1=오), resolve, answer }
    const choose = (dir) => {
      if (!cur) return;
      const c = cur; cur = null;
      c.answer = dir;
      boat.classList.remove("row-left", "row-right", "bonk"); void boat.offsetWidth;
      if (dir === c.dir) {
        boat.classList.add(dir === 0 ? "row-left" : "row-right");
        row.classList.add(dir === 0 ? "swim-left" : "swim-right");
        const b = Fx.center(boat);
        Fx.burst(b.x + (dir === 0 ? -40 : 40), b.y + 20, "#8fe3e8", 8);
        Audio.splash();
        ctx.hit(boat, { msg: "잘 저었어!" });
      } else {
        boat.classList.add("bonk");
        row.classList.add("scatter");
        ctx.miss(boat, { msg: "가운데 물고기를 봐!" });
      }
      c.resolve();
    };
    document.getElementById("fl-left").addEventListener("pointerdown", (e) => { e.stopPropagation(); choose(0); });
    document.getElementById("fl-right").addEventListener("pointerdown", (e) => { e.stopPropagation(); choose(1); });
    // 화면 좌/우 터치 (스페이스 입력은 좌표가 없으므로 무시)
    const onPress = (e) => { if (e && typeof e.clientX === "number") choose(e.clientX < window.innerWidth / 2 ? 0 : 1); };
    const onKey = (e) => { if (e.key === "ArrowLeft") choose(0); else if (e.key === "ArrowRight") choose(1); };
    ctx.input.on(onPress); ctx.input.onKey(onKey);

    const log = [];
    for (let i = 0; i < kinds.length; i++) {
      const congruent = kinds[i];
      const dir = Math.random() < 0.5 ? 0 : 1;
      const side = congruent ? dir : 1 - dir;
      const tier = this.tier(level); const half = (tier.n - 1) / 2;
      row.className = "fish-row swim-in" + (tier.wobble ? " wobble" : "");
      row.innerHTML = Array.from({ length: tier.n }, (_, k) => (k === half ? dir : side)).map((d, k) =>
        `<img src="assets/characters/fish.png" class="fish ${d === 0 ? "flip" : ""} ${k === half ? "center" : ""}" style="--i:${k}" alt="">`).join("");
      const onset = performance.now();
      const me = { dir, answer: null, resolve: null };
      await new Promise((res) => {
        me.resolve = res; cur = me;
        ctx.wait(p.limit).then(
          () => { if (cur === me) { cur = null; row.classList.add("scatter"); ctx.miss(boat, { msg: "물고기들이 지나갔어", soft: true }); res(); } },
          () => { cur = null; res(); },
        );
      });
      const rt = Math.round(performance.now() - onset);
      const timeout = me.answer === null;
      log.push({ congruent, correct: !timeout && me.answer === dir, rt: timeout ? null : rt, timeout });
      await ctx.wait(p.gap);
      ctx.setProgress((i + 1) / kinds.length);
      await ctx.between();
    }
    ctx.input.off(onPress); ctx.input.offKey(onKey);

    const conRT = log.filter((x) => x.congruent && x.correct).map((x) => x.rt);
    const incRT = log.filter((x) => !x.congruent && x.correct).map((x) => x.rt);
    const correctN = log.filter((x) => x.correct).length;
    return {
      task: this.id, level,
      accuracy: correctN / log.length,
      metrics: {
        congruentRT: Math.round(Stats.mean(conRT)), incongruentRT: Math.round(Stats.mean(incRT)),
        flankerEffect: Math.round(Stats.mean(incRT) - Stats.mean(conRT)),
        timeouts: log.filter((x) => x.timeout).length,
        flankers: this.tier(level).n - 1,
        incongruentAccuracy: (() => { const inc = log.filter((x) => !x.congruent); return inc.length ? inc.filter((x) => x.correct).length / inc.length : 0; })(),
      },
      trials: log.length,
    };
  },

  summary(r) {
    return [`정확도 ${Math.round(r.accuracy * 100)}%`, `속임수 버티기 ${r.metrics.flankerEffect}ms`, `시간 초과 ${r.metrics.timeouts}회`];
  },
};
