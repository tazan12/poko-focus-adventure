// 미션 ③ 반딧불 연못 — 공간 N-back (시공간 작업기억)
// 과제 구조: 3×3 격자, 자극 간격 2.1~3.0초, 목표 비율 30%, 정확도 80%↑ 승급 (brain-training-games 참고)
// 게임 껍데기: 연못의 연잎 위에 반딧불(별별이)이 내려앉는다. "바로 전(2번 전)" 연잎과 같은 자리면 포코가 폴짝 뛰어 반딧불을 모은다.
const TaskNBack = {
  id: "nback",
  name: "반딧불 연못",
  world: "반딧불 연못",
  short: "기억하는 힘",
  icon: "assets/characters/coin.png",
  bg: "assets/bg/pond.jpg",
  sticker: "assets/stickers/pond.png",
  desc: "반딧불이 앉은 연잎을 기억하고, 같은 연잎에 또 앉으면 폴짝 뛰어요!",
  story: "이 연못의 반딧불은 같은 연잎에 두 번 앉을 때만 빛을 남겨. 어느 연잎에 앉았는지 잘 기억했다가 알려 줘!",

  levelParams(level) {
    const table = [
      { n: 1, interval: 3000, trials: 20 },
      { n: 1, interval: 2600, trials: 22 },
      { n: 1, interval: 2200, trials: 24 },
      { n: 2, interval: 3000, trials: 22 },
      { n: 2, interval: 2700, trials: 24 },
      { n: 2, interval: 2400, trials: 26 },
      { n: 2, interval: 2100, trials: 28 },
      { n: 3, interval: 3000, trials: 26 },
      { n: 3, interval: 2700, trials: 28 },
      { n: 3, interval: 2400, trials: 30 },
    ];
    return table[Math.min(level, table.length) - 1];
  },

  intro(level) {
    const p = this.levelParams(level);
    const word = ["", "바로 전", "2번 전", "3번 전"][p.n];
    return {
      title: "반딧불 연못",
      desc: `반딧불이 9개 연잎 중 하나에 내려앉아요.<br><b>${word}</b>에 앉았던 연잎과 <b>같은 연잎</b>이면 "폴짝!" 버튼(스페이스)을 눌러요.<br>다른 연잎이면 가만히 지켜봐요.` + (level >= 7 ? "<br>🌈 반딧불 <b>색깔이 자꾸 바뀌지만</b> 색은 신경 쓰지 말고 <b>자리만</b> 기억해요!" : ""),
      demo: `<div class="demo-item"><img src="assets/characters/star_go.png" alt="">${p.n}-back</div>`,
    };
  },

  makeSequence(n, trials) {
    const seq = [];
    for (let i = 0; i < trials; i++) {
      if (i >= n && Math.random() < 0.3) seq.push(seq[i - n]);
      else { let pos; do { pos = Math.floor(Math.random() * 9); } while (i >= n && pos === seq[i - n]); seq.push(pos); }
    }
    return seq;
  },

  async run(ctx, level) {
    const p = Adaptive.tune(this.levelParams(level));
    const seq = this.makeSequence(p.n, p.trials);
    const STIM = 600;

    ctx.stage.innerHTML = `
      <div class="pond">
        <div class="nb-grid">${Array.from({ length: 9 }, (_, i) => `<div class="nb-cell" id="nb-${i}"><img class="pad" src="assets/characters/lilypad.png" alt=""><div class="pad-slot"></div></div>`).join("")}</div>
        <div class="pond-poko" id="pond-poko"></div>
      </div>`;
    ctx.controls.innerHTML = `<button class="tap-btn secondary" id="nb-tap">폴짝!</button><div class="key-hint">키보드: 스페이스</div>`;
    const poko = document.getElementById("pond-poko");
    const CHAR_H = window.innerWidth < 600 ? "18%" : "26%";
    const idle = () => Sprite.play(poko, "poko_idle", { fps: 4, charHeight: CHAR_H });
    idle();
    const hop = () => Sprite.play(poko, "poko_jump", { fps: 14, loop: false, charHeight: CHAR_H, arc: 45, onEnd: idle });

    let cur = null;
    const onPress = () => {
      if (!cur || cur.pressed) return;
      cur.pressed = true;
      cur.rt = Math.round(performance.now() - cur.onset);
      hop();
      if (cur.judge && cur.isMatch) {
        cur.cell.classList.add("ripple");
        const c = Fx.center(cur.cell);
        Fx.burst(c.x, c.y, "#b9ff8a", 8);
        ctx.hit(cur.cell, { msg: "반딧불 획득!" });
        setTimeout(() => cur && cur.cell.classList.remove("ripple"), 700);
      } else {
        poko.classList.add("oops"); setTimeout(() => poko.classList.remove("oops"), 500);
        ctx.miss(cur.cell, { msg: cur.judge ? "다른 연잎이었어" : "아직 기억할 차례야" });
      }
    };
    ctx.input.on(onPress);
    document.getElementById("nb-tap").addEventListener("pointerdown", onPress);

    const log = [];
    for (let i = 0; i < seq.length; i++) {
      const cell = document.getElementById(`nb-${seq[i]}`);
      const slot = cell.querySelector(".pad-slot");
      slot.innerHTML = `<div class="critter pop"></div>`;
      if (level >= 7) slot.firstElementChild.style.filter = `hue-rotate(${Math.floor(Math.random() * 6) * 60}deg) drop-shadow(0 6px 10px rgba(0,0,0,0.35))`; // 색 간섭(무시해야 함)
      Sprite.play(slot.firstElementChild, "star_idle", { fps: 6 });
      const judge = i >= p.n;
      const isMatch = judge && seq[i] === seq[i - p.n];
      cur = { cell, judge, isMatch, pressed: false, onset: performance.now(), rt: null };
      await ctx.wait(STIM);
      slot.firstElementChild.classList.add("hide");
      await ctx.wait(p.interval - STIM);
      const done = cur; cur = null;
      Sprite.stop(slot.firstElementChild); slot.innerHTML = "";
      if (!judge) continue;
      const type = isMatch ? (done.pressed ? "hit" : "miss") : (done.pressed ? "false_alarm" : "correct_rejection");
      if (type === "miss") ctx.miss(cell, { msg: "같은 연잎이었어!", soft: true });
      log.push({ match: isMatch, pressed: done.pressed, rt: done.rt, type });
      ctx.setProgress((i + 1) / seq.length);
      await ctx.between();
    }
    ctx.input.off(onPress);
    Sprite.stopAll();

    const matches = log.filter((x) => x.match).length;
    const hits = log.filter((x) => x.type === "hit").length;
    const fa = log.filter((x) => x.type === "false_alarm").length;
    const correct = log.filter((x) => x.type === "hit" || x.type === "correct_rejection").length;
    return {
      task: this.id, level,
      accuracy: log.length ? correct / log.length : 0,
      metrics: { n: p.n, hits, misses: matches - hits, falseAlarms: fa, hitRate: matches ? hits / matches : 0 },
      trials: log.length,
    };
  },

  summary(r) {
    return [`${r.metrics.n}-back`, `정확도 ${Math.round(r.accuracy * 100)}%`, `반딧불 ${r.metrics.hits}마리`];
  },
};
