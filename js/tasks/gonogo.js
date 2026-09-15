// 미션 ① 반짝 숲 달리기 — Go/No-Go (억제조절)
// 과제 구조는 vekteo/GoNoGo_jsPsych (MIT, Bezdjian et al. 2009)와 동일하게 유지:
//   4개 위치, Go:No-Go = 80:20, 자극 500ms 내외, ISI 1500ms 내외, 20시행 블록, 후반 규칙 반전
// 게임 껍데기: 포코가 숲길을 달리고 덤불에서 튀어나오는 별별이를 점프해서 잡는다. 심술이는 그냥 지나친다.
const TaskGoNoGo = {
  id: "gonogo",
  name: "반짝 숲 달리기",
  world: "반짝 숲",
  short: "참는 힘",
  icon: "assets/characters/star_go.png",
  bg: "assets/bg/forest.jpg",
  sticker: "assets/stickers/forest.png",
  desc: "숲길을 달리며 튀어나오는 별별이를 점프해서 잡아요. 심술이는 참고 지나가요!",
  story: "숲의 별빛이 사라졌어! 덤불 속에 숨은 별별이들을 잡아서 별빛을 되찾자. 심술이가 튀어나오면… 절대 건드리면 안 돼!",

  levelParams(level) {
    const table = [
      { stim: 650, isi: 1500, reverse: false },
      { stim: 550, isi: 1500, reverse: false },
      { stim: 500, isi: 1300, reverse: false },
      { stim: 450, isi: 1200, reverse: false },
      { stim: 450, isi: 1100, reverse: true },
      { stim: 400, isi: 1000, reverse: true },
      { stim: 380, isi: 950, reverse: true },
      { stim: 350, isi: 900, reverse: true },
      { stim: 330, isi: 850, reverse: true },
      { stim: 300, isi: 800, reverse: true },
    ];
    return table[Math.min(level, table.length) - 1];
  },

  intro(level) {
    const p = this.levelParams(level);
    return {
      title: "반짝 숲 달리기",
      desc: (p.reverse
        ? "<b>별별이</b>가 튀어나오면 점프해서 잡기! <b>심술이</b>는 참기!<br>이 숲은 마법에 걸려서, 달리다가 <b>규칙이 뒤집힐 수도</b> 있어."
        : "<b>별별이</b>가 튀어나오면 <b>점프!</b>(스페이스 또는 화면 터치)<br><b>심술이</b>가 튀어나오면 <b>아무것도 누르지 말고</b> 지나가기!")
        + (this.tier(level).spots > 4 ? "<br>🌿 덤불이 <b>6곳</b>으로 늘었어요!" : "") + (this.tier(level).fog ? "<br>🌫 안개 때문에 친구들이 <b>서서히</b> 나타나요." : "") + (this.tier(level).burst ? "<br>⚡ 중간에 <b>가속 구간</b>이 있어요!" : ""),
      demo: `
        <div class="demo-item go"><img src="assets/characters/star_go.png" alt="">점프해서 잡기!</div>
        <div class="demo-item nogo"><img src="assets/characters/spiky_nogo.png" alt="">참고 지나가기!</div>`,
    };
  },

  // 티어별 규칙 변화: 4+ 덤불 6곳(위치 불확실성↑), 7+ 안개(자극이 서서히 나타남), 8+ 가속 구간(블록 하나는 ISI 70%)
  tier(level) { return { spots: level >= 4 ? 6 : 4, fog: level >= 7, burst: level >= 8 }; },
  makeBlock(goIsStar, spots = 4) {
    const trials = [];
    for (let i = 0; i < 16; i++) trials.push({ go: true, pos: i % spots });
    for (let i = 0; i < 4; i++) trials.push({ go: false, pos: (i * 2) % spots });
    return Stats.shuffle(trials).map((t) => {
      const img = (t.go === goIsStar) ? "star_go" : "spiky_nogo";
      // 황금 별별이: 별별이가 Go 자극일 때 6% 확률의 희귀 보너스 (측정상으로는 동일한 Go 시행)
      const gold = img === "star_go" && t.go && Math.random() < (this._goldRate || 0.06);
      return { ...t, img, gold };
    });
  },

  async run(ctx, level) {
    const p = Adaptive.tune(this.levelParams(level));
    this._goldRate = StageFX.has(level, "gold") ? 0.12 : 0.05;
    const BLOCKS = p.quick ? 1 : 3;
    let goIsStar = true;
    const log = [];

    ctx.stage.innerHTML = `
      <div class="runner">
        <div class="runner-bg"></div>
        ${Array.from({ length: this.tier(level).spots }, (_, i) => `<div class="runner-spot n${this.tier(level).spots}" id="spot-${i}"></div>`).join("")}
        <div class="runner-poko" id="runner-poko"></div>
      </div>`;
    ctx.controls.innerHTML = `<button class="tap-btn" id="gng-tap">점프!</button><div class="key-hint">키보드: 스페이스 · 화면 터치도 돼요</div>`;
    const poko = document.getElementById("runner-poko");
    // 달리기 6프레임 루프. 점프 시 6프레임 점프 시트를 한 번 재생하고 다시 달리기로
    const CHAR_H = window.innerWidth < 600 ? "22%" : "30%";
    Sprite.play(poko, "poko_run", { fps: 12, charHeight: CHAR_H });

    // 현재 시행 상태
    let cur = null; // { t, el, pressed, onset }
    const jump = () => {
      Sprite.play(poko, "poko_jump", { fps: 14, loop: false, charHeight: CHAR_H, arc: 70, onEnd: () => Sprite.play(poko, "poko_run", { fps: 12, charHeight: CHAR_H }) });
    };
    const onPress = () => {
      if (!cur || cur.pressed) return;
      cur.pressed = true;
      cur.rt = Math.round(performance.now() - cur.onset);
      jump();
      if (cur.t.go) {
        // 적중: 별별이 잡힘 (황금 별별이는 보너스 코인 +5)
        cur.el.classList.add("caught");
        const c = Fx.center(cur.el);
        Fx.burst(c.x, c.y, cur.t.gold ? "#fff1a8" : "#ffd24d", cur.t.gold ? 18 : 10);
        if (cur.t.gold) ctx.hit(cur.el, { msg: "황금 별별이!", bonus: 5 });
        else ctx.hit(cur.el, { msg: "잡았다!" });
      } else {
        // 오경보: 심술이를 건드림
        const bonked = cur.el;
        bonked.classList.add("bonk");
        setTimeout(() => bonked.classList.add("hide"), 450); // 튕겨난 뒤 덤불로 숨음
        poko.classList.add("oops"); setTimeout(() => poko.classList.remove("oops"), 500);
        ctx.miss(cur.el, { msg: "앗, 심술이야!" });
      }
    };
    ctx.input.on(onPress);
    document.getElementById("gng-tap").addEventListener("pointerdown", onPress);

    let total = 0;
    const totalTrials = BLOCKS * 20;
    for (let b = 0; b < BLOCKS; b++) {
      if (p.reverse && BLOCKS > 1 && b === BLOCKS - 1) {
        goIsStar = false;
        Audio.alert();
        await ctx.showMessage("🔄 마법의 안개!", "규칙이 뒤집혔어! 이제 <b>심술이</b>를 잡고 <b>별별이</b>는 참아요!", 3200);
      }
      const tier = this.tier(level);
      const burst = tier.burst && b === 1; // 가운데 블록이 가속 구간
      if (burst) { Audio.alert(); await ctx.showMessage("⚡ 가속 구간!", "친구들이 더 빨리 튀어나와요!", 1600); }
      const isi = burst ? Math.round(p.isi * 0.7) : p.isi;
      for (const t of this.makeBlock(goIsStar, tier.spots)) {
        const spot = document.getElementById(`spot-${t.pos}`);
        spot.innerHTML = `<div class="critter ${tier.fog ? "fog-in" : "pop"}${t.gold ? " gold" : ""}"></div>`;
        const el = spot.firstElementChild;
        if (t.gold) el.style.backgroundImage = 'url("assets/characters/star_gold.png")';
        else Sprite.play(el, t.img === "star_go" ? "star_idle" : "spiky_idle", { fps: 6 });
        cur = { t, el, pressed: false, onset: performance.now(), rt: null };
        await ctx.wait(p.stim);
        if (!cur.pressed) el.classList.add("hide"); // 덤불로 숨음 (jsPsych와 동일하게 ISI 동안에도 응답 허용)
        await ctx.wait(isi);
        const done = cur; cur = null;

        const type = t.go ? (done.pressed ? "hit" : "omission") : (done.pressed ? "commission" : "correct_rejection");
        if (type === "omission") { el.classList.add("flyaway"); ctx.miss(el, { msg: "놓쳤다…", soft: true }); }
        if (type === "correct_rejection") { ctx.hit(el, { msg: "잘 참았어!", quiet: true }); }
        log.push({ go: t.go, pressed: done.pressed, rt: done.rt, type, reversed: !goIsStar, gold: !!t.gold, burst });
        // 놓친 별은 날아가는 연출(500ms) 후 제거, 나머지는 즉시 제거해 다음 시행과 겹치지 않게
        const cleanup = () => { Sprite.stop(el); if (spot.firstElementChild === el) spot.innerHTML = ""; };
        if (type === "omission") setTimeout(cleanup, 500); else cleanup();
        total++;
        ctx.setProgress(total / totalTrials);
        await ctx.between();
      }
    }
    ctx.input.off(onPress);
    Sprite.stopAll();

    const hits = log.filter((x) => x.type === "hit");
    const goN = log.filter((x) => x.go).length;
    const nogoN = log.length - goN;
    const omission = log.filter((x) => x.type === "omission").length;
    const commission = log.filter((x) => x.type === "commission").length;
    const rts = hits.map((x) => x.rt);
    return {
      task: this.id, level,
      accuracy: (log.length - omission - commission) / log.length,
      metrics: {
        hitRate: goN ? hits.length / goN : 0, omission, commission,
        omissionRate: goN ? omission / goN : 0, commissionRate: nogoN ? commission / nogoN : 0,
        meanRT: Math.round(Stats.mean(rts)), rtSD: Math.round(Stats.sd(rts)),
        spots: this.tier(level).spots, fog: this.tier(level).fog, burst: this.tier(level).burst,
      },
      trials: log.length,
    };
  },

  summary(r) {
    return [`정확도 ${Math.round(r.accuracy * 100)}%`, `참기 성공 ${Math.round((1 - r.metrics.commissionRate) * 100)}%`, `평균 반응 ${r.metrics.meanRT}ms`];
  },
};
