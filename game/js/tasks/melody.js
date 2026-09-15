// 미션 ⑫ 별빛 멜로디 — 시청각 순서 기억 (기억 폭·주의 유지). "순서대로 켜지는 소리를 따라 하기" 메커니즘을 아동용으로 재구성.
//   종 4개(7+ 5개)가 순서대로 빛나며 음을 낸다 → 같은 순서로 터치. 라운드마다 순서가 1개씩 길어진다(2→최대 9).
//   스테이지↑: 시작 길이↑, 재생 속도↑, 종 수↑. 지표: 최대 성공 길이(span), 정확도, 평균 입력 시간. 이름·그림·UI·음악 독자 제작.
const TaskMelody = {
  id: "melody",
  name: "별빛 멜로디",
  world: "음악 마을",
  short: "따라하는 힘",
  icon: "assets/characters/bell.png",
  bg: "assets/bg/stage.jpg",
  sticker: "assets/stickers/stage.png",
  desc: "종들이 순서대로 빛나며 노래해요. 똑같은 순서로 종을 쳐서 멜로디를 완성해요!",
  story: "음악 마을의 종들이 밤마다 멜로디를 연주해. 그런데 마지막 부분은 네가 이어서 쳐 줘야 곡이 완성된대. 순서를 잘 듣고 따라 쳐!",
  BELLS: [
    { color: "#ff5c5c", freq: 523.25, name: "빨강" }, { color: "#4f8bff", freq: 659.25, name: "파랑" },
    { color: "#4ccf6f", freq: 783.99, name: "초록" }, { color: "#ffd23f", freq: 987.77, name: "노랑" }, { color: "#b06bff", freq: 1174.66, name: "보라" },
  ],

  levelParams(level) {
    const table = [
      { bells: 4, start: 2, max: 4, tempo: 700, rounds: 5 },
      { bells: 4, start: 2, max: 5, tempo: 650, rounds: 5 },
      { bells: 4, start: 3, max: 5, tempo: 600, rounds: 5 },
      { bells: 4, start: 3, max: 6, tempo: 560, rounds: 6 },
      { bells: 4, start: 3, max: 6, tempo: 520, rounds: 6 },
      { bells: 4, start: 4, max: 7, tempo: 480, rounds: 6 },
      { bells: 5, start: 4, max: 7, tempo: 480, rounds: 6 },
      { bells: 5, start: 4, max: 8, tempo: 440, rounds: 7 },
      { bells: 5, start: 5, max: 8, tempo: 420, rounds: 7 },
      { bells: 5, start: 5, max: 9, tempo: 400, rounds: 7 },
    ];
    return table[Math.min(level, table.length) - 1];
  },

  intro(level) {
    const p = this.levelParams(level);
    return {
      title: "별빛 멜로디",
      desc: `종 <b>${p.bells}개</b>가 순서대로 빛나며 소리를 내요. 다 끝나면 <b>같은 순서로</b> 종을 터치(1~${p.bells} 키)!<br>맞히면 멜로디가 <b>한 음씩 길어져요</b>. 처음엔 ${p.start}음부터.` + (p.bells > 4 ? "<br>🟣 보라 종이 추가됐어요!" : ""),
      demo: `<div class="demo-item"><div class="bell-demo">${this.BELLS.slice(0, 4).map((b) => `<span style="--c:${b.color}"></span>`).join("")}</div>빛나는 순서대로!</div>`,
    };
  },

  ring(i, ms = 350) {
    // 종소리: 기본음 + 배음 살짝
    const b = this.BELLS[i];
    Audio.tone(b.freq, ms / 1000, "sine", 0.16); Audio.tone(b.freq * 2, ms / 1000 * 0.6, "sine", 0.05);
  },

  async run(ctx, level) {
    const p = Adaptive.tune(this.levelParams(level));
    const bells = this.BELLS.slice(0, p.bells);
    ctx.stage.innerHTML = `
      <div class="stage-scene">
        <div class="bell-row" id="bell-row">${bells.map((b, i) => `<button class="bell" data-i="${i}" style="--c:${b.color}"><img src="assets/characters/bell.png" alt=""><i class="bell-glow"></i><small>${i + 1}</small></button>`).join("")}</div>
        <div class="melody-msg" id="melody-msg"></div>
        <div class="melody-dots" id="melody-dots"></div>
      </div>`;
    ctx.controls.innerHTML = `<div class="key-hint">종을 터치하거나 숫자 키로 따라 쳐요</div>`;
    const row = document.getElementById("bell-row"), msg = document.getElementById("melody-msg"), dots = document.getElementById("melody-dots");
    const bellEls = [...row.querySelectorAll(".bell")];
    const light = async (i, ms) => { const el = bellEls[i]; el.classList.add("lit"); this.ring(i, ms); await ctx.wait(ms); el.classList.remove("lit"); };

    const log = []; let seq = [];
    let listening = false, me = null;
    const press = (i) => { if (!listening || !me) return; me.input.push(i); light(i, 220); me.times.push(performance.now()); me.check(); };
    bellEls.forEach((el) => el.addEventListener("pointerdown", (e) => { e.stopPropagation(); press(+el.dataset.i); }));
    const onKey = (e) => { const k = +e.key; if (k >= 1 && k <= bells.length) press(k - 1); };
    ctx.input.onKey(onKey);

    const rounds = p.quick ? 3 : p.rounds;
    let len = p.start;
    for (let r = 0; r < rounds; r++) {
      // 시퀀스: 이전 라운드 성공 시 1개 추가, 실패 시 새 시퀀스로 같은 길이
      seq = Array.from({ length: len }, () => Math.floor(Math.random() * bells.length));
      dots.innerHTML = seq.map(() => "<span></span>").join("");
      msg.textContent = "잘 들어요…"; row.classList.add("playing");
      await ctx.wait(700);
      for (let k = 0; k < seq.length; k++) { await light(seq[k], p.tempo * 0.6); await ctx.wait(p.tempo * 0.4); }
      row.classList.remove("playing");
      msg.textContent = "이제 따라 쳐요!";
      const onset = performance.now();
      const result = await new Promise((res) => {
        me = { input: [], times: [], check: null };
        me.check = () => {
          const n = me.input.length; const ok = me.input[n - 1] === seq[n - 1];
          dots.children[n - 1].className = ok ? "ok" : "bad";
          if (!ok) { listening = false; res({ success: false, reached: n - 1 }); return; }
          if (n === seq.length) { listening = false; res({ success: true, reached: n }); }
        };
        listening = true;
        ctx.wait(4000 + seq.length * 2500).then(() => { if (listening) { listening = false; res({ success: false, reached: me.input.length, timeout: true }); } }, () => { listening = false; res({ success: false, reached: 0 }); });
      });
      const ms = Math.round(performance.now() - onset);
      if (result.success) {
        row.classList.add("finale"); setTimeout(() => row.classList.remove("finale"), 900);
        Audio.fanfare(); const c = Fx.center(row); Fx.burst(c.x, c.y - 40, "#ffe680", 16);
        ctx.hit(row, { msg: `${seq.length}음 멜로디 완성!`, bonus: seq.length >= 6 ? 2 : seq.length >= 4 ? 1 : 0 });
        len = Math.min(p.max, len + 1);
      } else {
        msg.textContent = result.timeout ? "시간이 지났어" : `${result.reached + 1}번째가 달랐어`;
        // 정답 시퀀스 다시 보여주기(학습)
        ctx.miss(row, { msg: result.timeout ? "시간이 지났어" : "여기서 달랐어", soft: !!result.timeout });
        await ctx.wait(500);
        for (let k = 0; k < seq.length; k++) { await light(seq[k], 220); await ctx.wait(120); }
      }
      log.push({ len: seq.length, success: result.success, reached: result.reached, ms, timeout: !!result.timeout });
      await ctx.wait(700);
      ctx.setProgress((r + 1) / rounds);
      await ctx.between();
    }
    ctx.input.offKey(onKey);

    const span = Math.max(0, ...log.filter((x) => x.success).map((x) => x.len));
    return {
      task: this.id, level,
      accuracy: log.reduce((a, x) => a + x.reached / x.len, 0) / log.length,
      metrics: { span, perfectRounds: log.filter((x) => x.success).length, bells: bells.length, meanMs: Math.round(Stats.mean(log.map((x) => x.ms))) },
      trials: log.length,
    };
  },

  summary(r) {
    return [`최고 ${r.metrics.span}음 기억`, `완성 ${r.metrics.perfectRounds}/${r.trials}`, `종 ${r.metrics.bells}개`];
  },
};
