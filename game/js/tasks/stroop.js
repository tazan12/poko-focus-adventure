// 미션 ④ 마법 물약 공방 — Stroop (간섭통제/인지유연성)
// 과제 구조: 색-단어 스트룹, 일치/불일치 비율·응답 제한시간이 레벨에 따라 변함. 지표: 간섭 효과(불일치 RT − 일치 RT)
// 게임 껍데기: 주문서에 적힌 글자의 '색깔'과 같은 물약을 골라 넣으면 물약이 완성된다.
const TaskStroop = {
  id: "stroop",
  name: "마법 물약 공방",
  world: "물약 공방",
  short: "속지 않는 힘",
  icon: "assets/characters/planet.png",
  bg: "assets/bg/lab.jpg",
  sticker: "assets/stickers/lab.png",
  desc: "주문서 글자의 '색깔'과 같은 물약을 골라요. 글자에 쓰인 말은 함정!",
  story: "마법사 할머니가 물약 만드는 법을 알려 주셨어. 주문서에 적힌 글자의 '색깔'만 보고 같은 색 물약을 넣어야 해. 글자가 뭐라고 쓰여 있든 속으면 안 돼!",

  COLORS: [
    { name: "빨강", hex: "#ff5c5c", key: "1" },
    { name: "파랑", hex: "#4f8bff", key: "2" },
    { name: "초록", hex: "#4ccf6f", key: "3" },
    { name: "노랑", hex: "#ffd23f", key: "4" },
    { name: "보라", hex: "#b06bff", key: "5" },
  ],
  tier(level) { return { colors: level >= 7 ? 5 : 4, flash: level >= 4 ? 900 : 0 }; },

  levelParams(level) {
    const table = [
      { limit: 3000, trials: 24, incongruent: 0.4 },
      { limit: 2600, trials: 26, incongruent: 0.45 },
      { limit: 2300, trials: 28, incongruent: 0.5 },
      { limit: 2000, trials: 30, incongruent: 0.5 },
      { limit: 1800, trials: 30, incongruent: 0.55 },
      { limit: 1600, trials: 32, incongruent: 0.6 },
      { limit: 1500, trials: 32, incongruent: 0.6 },
      { limit: 1400, trials: 34, incongruent: 0.65 },
      { limit: 1300, trials: 34, incongruent: 0.7 },
      { limit: 1200, trials: 36, incongruent: 0.7 },
    ];
    return table[Math.min(level, table.length) - 1];
  },

  intro(level) {
    const t = this.tier(level);
    return {
      title: "마법 물약 공방",
      desc: "주문서 글자가 나타나면 <b>글자의 색깔</b>과 같은 물약을 골라요.<br>글자에 쓰인 말은 무시! 예) <span style=\"color:#4f8bff;font-weight:900\">빨강</span> → <b>파란 물약</b>" + (t.flash ? "<br>📜 주문서가 <b>금방 사라져요</b>. 색을 얼른 기억!" : "") + (t.colors > 4 ? "<br>🟣 <b>보라 물약</b>이 추가됐어요 (5번 키)." : ""),
      demo: `<div class="demo-item"><span class="stroop-word" style="color:#4f8bff;font-size:2.4rem;text-shadow:none">빨강</span>→ 파란 물약!</div>`,
    };
  },

  async run(ctx, level) {
    const p = Adaptive.tune(this.levelParams(level));
    const tier = this.tier(level);
    const C = this.COLORS.slice(0, tier.colors);
    const nInc = Math.round(p.trials * p.incongruent);
    const kinds = Stats.shuffle([...Array(nInc).fill(false), ...Array(p.trials - nInc).fill(true)]);

    ctx.stage.innerHTML = `
      <div class="lab">
        <div class="scroll" id="scroll"><div class="stroop-word" id="stroop-word"></div></div>
        <div class="cauldron" id="cauldron"></div>
      </div>`;
    ctx.controls.innerHTML = C.map((c, i) => `
      <button class="potion-btn" data-idx="${i}" style="--liquid:${c.hex}">
        <span class="potion-liquid"></span><img src="assets/characters/bottle.png" alt="">
        <span class="potion-name">${c.name}<small>키 ${c.key}</small></span>
      </button>`).join("");
    const word = document.getElementById("stroop-word");
    const scroll = document.getElementById("scroll");
    const cauldron = document.getElementById("cauldron");
    const btns = [...ctx.controls.querySelectorAll(".potion-btn")];

    let cur = null; // { ink, resolve }
    const choose = (idx) => {
      if (!cur) return;
      const c = cur; cur = null;
      const btn = btns[idx];
      btn.classList.add("pour"); setTimeout(() => btn.classList.remove("pour"), 500);
      c.answer = idx;
      if (idx === c.ink) {
        cauldron.style.setProperty("--liquid", C[idx].hex);
        cauldron.classList.remove("bubble"); void cauldron.offsetWidth; cauldron.classList.add("bubble");
        const ce = Fx.center(cauldron);
        Fx.burst(ce.x, ce.y - 20, C[idx].hex, 12);
        ctx.hit(cauldron, { msg: "물약 완성!" });
      } else {
        scroll.classList.add("bonk");
        setTimeout(() => scroll.classList.remove("bonk"), 400);
        ctx.miss(scroll, { msg: `글자 색은 ${C[c.ink].name}!` });
      }
      c.resolve();
    };
    btns.forEach((b) => b.addEventListener("pointerdown", () => choose(+b.dataset.idx)));
    const onKey = (e) => { const i = C.findIndex((c) => c.key === e.key); if (i >= 0) choose(i); };
    ctx.input.onKey(onKey);

    const log = [];
    for (let i = 0; i < kinds.length; i++) {
      const congruent = kinds[i];
      const ink = Math.floor(Math.random() * C.length);
      let text = ink;
      if (!congruent) { do { text = Math.floor(Math.random() * C.length); } while (text === ink); }
      const me = { ink, answer: null, resolve: null };
      word.textContent = C[text].name;
      word.style.color = C[ink].hex;
      scroll.classList.add("show");
      if (tier.flash) ctx.wait(tier.flash).then(() => { if (cur === me) scroll.classList.remove("show"); }, () => {}); // 주문서가 사라짐(제한시간은 그대로)
      const onset = performance.now();
      me.resolve = null;
      await new Promise((res) => {
        me.resolve = res;
        cur = me;
        // 제한시간 타이머는 이 시행(me)에만 적용
        ctx.wait(p.limit).then(
          () => { if (cur === me) { cur = null; ctx.miss(scroll, { msg: "시간이 지났어", soft: true }); res(); } },
          () => { cur = null; res(); }, // 그만하기로 중단된 경우
        );
      });
      const rt = Math.round(performance.now() - onset);
      scroll.classList.remove("show");
      const timeout = me.answer === null;
      log.push({ congruent, correct: !timeout && me.answer === ink, rt: timeout ? null : rt, timeout });
      await ctx.wait(450);
      ctx.setProgress((i + 1) / kinds.length);
      await ctx.between();
    }
    ctx.input.offKey(onKey);

    const conRT = log.filter((x) => x.congruent && x.correct).map((x) => x.rt);
    const incRT = log.filter((x) => !x.congruent && x.correct).map((x) => x.rt);
    const correctN = log.filter((x) => x.correct).length;
    return {
      task: this.id, level,
      accuracy: correctN / log.length,
      metrics: {
        congruentRT: Math.round(Stats.mean(conRT)), incongruentRT: Math.round(Stats.mean(incRT)),
        interference: Math.round(Stats.mean(incRT) - Stats.mean(conRT)),
        timeouts: log.filter((x) => x.timeout).length,
        colors: C.length, flash: tier.flash,
        incongruentAccuracy: (() => { const inc = log.filter((x) => !x.congruent); return inc.length ? inc.filter((x) => x.correct).length / inc.length : 0; })(),
      },
      trials: log.length,
    };
  },

  summary(r) {
    return [`물약 ${Math.round(r.accuracy * 100)}% 성공`, `함정 버티기 ${r.metrics.interference}ms`, `시간 초과 ${r.metrics.timeouts}회`];
  },
};
