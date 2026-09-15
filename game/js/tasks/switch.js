// 미션 ⑦ 마법 보물 분류 — 규칙 전환 (인지 유연성, DCCS/과제전환 계열)
// 과제 구조: 보석(모양 2종 × 색 2종)을 왼쪽/오른쪽 상자로 분류. 규칙은 "색깔로" 또는 "모양으로".
//   왼쪽 상자 = 빨간 별, 오른쪽 상자 = 파란 하트. 갈등 보석(파란 별, 빨간 하트)은 규칙에 따라 답이 달라진다.
//   레벨↑: 규칙 전환 빈도↑(블록 8 → 4 → 무작위), 제한시간↓. 지표: 정확도, 전환 비용(전환 시행 RT − 반복 시행 RT), 고집 오류
//   근거: 인지 유연성은 Tramoni 2026 EF 훈련 RCT에서 개선이 관찰된 영역
// 게임 껍데기: 보물 다락. 포코가 보석을 상자에 넣는다. 규칙이 바뀌면 마법 두루마리가 펄럭인다.
const TaskSwitch = {
  id: "switch",
  name: "마법 보물 분류",
  world: "보물 다락",
  short: "바꾸는 힘",
  icon: "assets/characters/chest.png",
  bg: "assets/bg/attic.jpg",
  sticker: "assets/stickers/attic.png",
  desc: "보석을 '색깔로' 또는 '모양으로' 상자에 나눠 담아요. 규칙이 갑자기 바뀌니 두루마리를 잘 봐요!",
  story: "다락방 보물을 정리해야 해. 마법 두루마리가 '색깔로!' 하면 색깔로, '모양으로!' 하면 모양으로 나눠 담자. 두루마리는 마음이 자주 바뀌니까 조심!",

  GEMS: { star: { name: "별", path: "M50 6 L61 38 L95 38 L68 58 L78 92 L50 72 L22 92 L32 58 L5 38 L39 38 Z" }, heart: { name: "하트", path: "M50 90 C20 65 5 50 5 32 C5 18 16 8 29 8 C38 8 46 13 50 21 C54 13 62 8 71 8 C84 8 95 18 95 32 C95 50 80 65 50 90 Z" } },
  COLORS: { red: { name: "빨간", hex: "#ff5c5c" }, blue: { name: "파란", hex: "#4f8bff" } },

  levelParams(level) {
    const table = [
      { limit: 4000, trials: 20, block: 10, conflict: 0.6 },
      { limit: 3600, trials: 22, block: 8, conflict: 0.6 },
      { limit: 3300, trials: 24, block: 6, conflict: 0.65 },
      { limit: 3000, trials: 24, block: 4, conflict: 0.7 },
      { limit: 2800, trials: 26, block: 4, conflict: 0.7 },
      { limit: 2600, trials: 28, block: 3, conflict: 0.75 },
      { limit: 2400, trials: 28, block: 0, conflict: 0.75 },
      { limit: 2200, trials: 30, block: 0, conflict: 0.8 },
      { limit: 2000, trials: 30, block: 0, conflict: 0.8 },
      { limit: 1800, trials: 32, block: 0, conflict: 0.85 },
    ];
    return table[Math.min(level, table.length) - 1];
  },

  gem(shape, color, size = 64) {
    return `<svg class="gem" viewBox="0 0 100 100" width="${size}" height="${size}"><path d="${this.GEMS[shape].path}" fill="${this.COLORS[color].hex}" stroke="#fff" stroke-width="4" stroke-linejoin="round"/></svg>`;
  },

  intro(level) {
    const p = this.levelParams(level);
    return {
      title: "마법 보물 분류",
      desc: `왼쪽 상자엔 <b>빨간 별</b>, 오른쪽 상자엔 <b>파란 하트</b>가 들어 있어요.<br>두루마리가 <b>"색깔로!"</b>면 색이 같은 상자로, <b>"모양으로!"</b>면 모양이 같은 상자로!<br>← → 키, 좌우 터치, 아래 버튼.${p.block === 0 ? " 규칙이 언제든 바뀔 수 있어요!" : ""}` + (level >= 7 ? "<br>📜 두루마리가 <b>1초 뒤 사라져요</b>. 지금 규칙을 잘 기억!" : ""),
      demo: `<div class="demo-item"><div class="switch-demo">${this.gem("star", "blue", 52)}<span>색깔로 → 오른쪽(파랑)<br>모양으로 → 왼쪽(별)</span></div></div>`,
    };
  },

  async run(ctx, level) {
    const p = Adaptive.tune(this.levelParams(level));
    ctx.stage.innerHTML = `
      <div class="attic">
        <div class="rule-scroll" id="rule-scroll"><span id="rule-text"></span></div>
        <div class="chest left"><img src="assets/characters/chest.png" alt=""><div class="chest-label">${this.gem("star", "red", 40)}</div></div>
        <div class="chest right"><img src="assets/characters/chest.png" alt=""><div class="chest-label">${this.gem("heart", "blue", 40)}</div></div>
        <div class="gem-slot" id="gem-slot"></div>
      </div>`;
    ctx.controls.innerHTML = `
      <button class="tap-btn dir" id="sw-left">◀ 왼쪽 상자</button>
      <button class="tap-btn dir" id="sw-right">오른쪽 상자 ▶</button>
      <div class="key-hint">키보드: ← → · 화면 왼쪽/오른쪽 터치</div>`;
    const scroll = document.getElementById("rule-scroll"), ruleText = document.getElementById("rule-text"), slot = document.getElementById("gem-slot");

    // 시행 생성: 규칙 시퀀스(블록 또는 무작위) + 보석
    const trials = [];
    let rule = Math.random() < 0.5 ? "color" : "shape";
    for (let i = 0; i < p.trials; i++) {
      if (i > 0) {
        if (p.block > 0) { if (i % p.block === 0) rule = rule === "color" ? "shape" : "color"; }
        else if (Math.random() < 0.5) rule = rule === "color" ? "shape" : "color";
      }
      const conflict = Math.random() < p.conflict;
      const shape = Math.random() < 0.5 ? "star" : "heart";
      // 비갈등: 빨간 별 / 파란 하트, 갈등: 파란 별 / 빨간 하트
      const color = conflict ? (shape === "star" ? "blue" : "red") : (shape === "star" ? "red" : "blue");
      const answer = rule === "color" ? (color === "red" ? 0 : 1) : (shape === "star" ? 0 : 1);
      trials.push({ rule, shape, color, conflict, answer, switched: i > 0 && trials[i - 1].rule !== rule });
    }

    let cur = null;
    const choose = (dir) => {
      if (!cur) return;
      const c = cur; cur = null; c.answer = dir;
      const target = document.querySelector(dir === 0 ? ".chest.left" : ".chest.right");
      const g = slot.firstElementChild;
      if (g) { g.classList.add(dir === 0 ? "to-left" : "to-right"); }
      if (dir === c.t.answer) {
        target.classList.add("open"); setTimeout(() => target.classList.remove("open"), 500);
        const ce = Fx.center(target); Fx.burst(ce.x, ce.y - 20, this.COLORS[c.t.color].hex, 10);
        ctx.hit(target, { msg: "쏙!" });
      } else {
        target.classList.add("bonk"); setTimeout(() => target.classList.remove("bonk"), 450);
        const why = c.t.rule === "color" ? `지금은 색깔로! ${this.COLORS[c.t.color].name}색` : `지금은 모양으로! ${this.GEMS[c.t.shape].name} 모양`;
        ctx.miss(target, { msg: why });
      }
      c.resolve();
    };
    document.getElementById("sw-left").addEventListener("pointerdown", (e) => { e.stopPropagation(); choose(0); });
    document.getElementById("sw-right").addEventListener("pointerdown", (e) => { e.stopPropagation(); choose(1); });
    const onPress = (e) => { if (e && typeof e.clientX === "number") choose(e.clientX < window.innerWidth / 2 ? 0 : 1); };
    const onKey = (e) => { if (e.key === "ArrowLeft") choose(0); else if (e.key === "ArrowRight") choose(1); };
    ctx.input.on(onPress); ctx.input.onKey(onKey);

    const log = [];
    let shownRule = null;
    for (let i = 0; i < trials.length; i++) {
      const t = trials[i];
      if (t.rule !== shownRule) {
        shownRule = t.rule;
        ruleText.innerHTML = t.rule === "color" ? "🎨 색깔로!" : "🔷 모양으로!";
        scroll.classList.remove("flip", "faded"); void scroll.offsetWidth; scroll.classList.add("flip");
        if (level >= 7) ctx.wait(1200).then(() => scroll.classList.add("faded"), () => {}); // 규칙 기억 부담
        if (i > 0) { Audio.alert(); await ctx.wait(600); }
      }
      slot.innerHTML = `<div class="gem-wrap pop">${this.gem(t.shape, t.color, 110)}</div>`;
      const onset = performance.now();
      const me = { t, answer: null, resolve: null };
      await new Promise((res) => {
        me.resolve = res; cur = me;
        ctx.wait(p.limit).then(() => { if (cur === me) { cur = null; ctx.miss(slot, { msg: "시간이 지났어", soft: true }); res(); } }, () => { cur = null; res(); });
      });
      const rt = Math.round(performance.now() - onset);
      const timeout = me.answer === null;
      log.push({ ...t, correct: !timeout && me.answer === t.answer, rt: timeout ? null : rt, timeout, persev: !timeout && me.answer !== t.answer && t.conflict && t.switched });
      await ctx.wait(450);
      slot.innerHTML = "";
      ctx.setProgress((i + 1) / trials.length);
      await ctx.between();
    }
    ctx.input.off(onPress); ctx.input.offKey(onKey);

    const rtSw = log.filter((x) => x.switched && x.correct).map((x) => x.rt);
    const rtRep = log.filter((x) => !x.switched && x.correct && x.conflict).map((x) => x.rt);
    const correctN = log.filter((x) => x.correct).length;
    return {
      task: this.id, level,
      accuracy: correctN / log.length,
      metrics: {
        switchCost: rtSw.length && rtRep.length ? Math.round(Stats.mean(rtSw) - Stats.mean(rtRep)) : 0,
        switchAccuracy: (() => { const s = log.filter((x) => x.switched); return s.length ? s.filter((x) => x.correct).length / s.length : 0; })(),
        perseverative: log.filter((x) => x.persev).length,
        timeouts: log.filter((x) => x.timeout).length,
      },
      trials: log.length,
    };
  },

  summary(r) {
    return [`정확도 ${Math.round(r.accuracy * 100)}%`, `규칙 바뀐 직후 ${Math.round(r.metrics.switchAccuracy * 100)}%`, `규칙 바꾸기 ${r.metrics.switchCost}ms`];
  },
};
