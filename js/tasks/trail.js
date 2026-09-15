// 미션 ⑧ 별 잇기 — 순서 잇기 (처리속도·주의 전환). Trail Making Test(TMT) 구조를 아동용으로 재구성.
//   A형: 1→2→…→N 순서로 터치. B형(스테이지 6+): 숫자와 ㄱㄴㄷ을 번갈아(1→ㄱ→2→ㄴ…) — 전환 부담 추가
//   지표: 완료 시간, 오터치(순서 틀림), 항목당 평균 시간. 이름·그림·UI는 모두 독자 제작.
const TaskTrail = {
  id: "trail",
  name: "별 잇기",
  world: "등불 정원",
  short: "잇는 힘",
  icon: "assets/characters/star_go.png",
  bg: "assets/bg/garden.jpg",
  sticker: "assets/stickers/garden.png",
  desc: "흩어진 등불을 1, 2, 3… 순서대로 터치해 별자리를 이어요. 높은 단계에선 숫자와 ㄱㄴㄷ을 번갈아요!",
  story: "정원의 등불이 뒤죽박죽 흩어졌어. 숫자 순서대로 이어 주면 등불이 별자리처럼 빛나! 나중엔 글자도 섞여서 나올 거야.",
  KO: ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ"],

  levelParams(level) {
    const table = [
      { n: 5, rounds: 4, alt: false, limit: 20000 },
      { n: 6, rounds: 4, alt: false, limit: 20000 },
      { n: 7, rounds: 4, alt: false, limit: 20000 },
      { n: 8, rounds: 4, alt: false, limit: 22000 },
      { n: 9, rounds: 4, alt: false, limit: 22000 },
      { n: 8, rounds: 4, alt: true, limit: 26000 },
      { n: 10, rounds: 4, alt: true, limit: 28000 },
      { n: 10, rounds: 5, alt: true, limit: 26000 },
      { n: 12, rounds: 5, alt: true, limit: 28000 },
      { n: 12, rounds: 5, alt: true, limit: 24000 },
    ];
    return table[Math.min(level, table.length) - 1];
  },

  intro(level) {
    const p = this.levelParams(level);
    return {
      title: "별 잇기",
      desc: p.alt ? `등불에 숫자와 글자가 섞여 있어요. <b>1 → ㄱ → 2 → ㄴ → 3 → ㄷ…</b> 순서로 번갈아 터치!` : `등불을 <b>1부터 ${p.n}까지</b> 순서대로 빠르게 터치해요. 틀리면 등불이 흔들려요.`,
      demo: `<div class="demo-item"><div class="trail-demo"><span>1</span><span>${p.alt ? "ㄱ" : "2"}</span><span>${p.alt ? "2" : "3"}</span><span>${p.alt ? "ㄴ" : "4"}</span></div>순서대로 터치!</div>`,
    };
  },

  sequence(p) {
    if (!p.alt) return Array.from({ length: p.n }, (_, i) => String(i + 1));
    const out = [];
    for (let i = 0; i < p.n; i++) out.push(i % 2 === 0 ? String(i / 2 + 1) : this.KO[(i - 1) / 2]);
    return out;
  },

  layout(n) {
    const cols = Math.ceil(Math.sqrt(n * 1.5)), rows = Math.ceil(n / cols);
    const cells = Stats.shuffle(Array.from({ length: cols * rows }, (_, i) => i)).slice(0, n);
    return cells.map((c) => ({ x: ((c % cols) + 0.5 + (Math.random() - 0.5) * 0.45) / cols * 100, y: (Math.floor(c / cols) + 0.5 + (Math.random() - 0.5) * 0.45) / rows * 100 }));
  },

  async run(ctx, level) {
    const p = Adaptive.tune(this.levelParams(level));
    ctx.stage.innerHTML = `<div class="garden" id="garden"><svg class="trail-lines" id="trail-lines"></svg></div>`;
    ctx.controls.innerHTML = `<div class="key-hint">등불을 순서대로 터치하세요</div>`;
    const garden = document.getElementById("garden"), lines = document.getElementById("trail-lines");
    const log = [];
    const rounds = p.quick ? 2 : p.rounds;

    for (let r = 0; r < rounds; r++) {
      const seq = this.sequence(p); const pos = this.layout(seq.length);
      lines.innerHTML = "";
      garden.querySelectorAll(".lantern").forEach((e) => e.remove());
      seq.forEach((label, i) => {
        const b = document.createElement("button"); b.className = "lantern pop"; b.dataset.i = i; b.textContent = label;
        b.style.left = `${pos[i].x}%`; b.style.top = `${pos[i].y}%`; b.style.setProperty("--d", `${(i * 0.05).toFixed(2)}s`); garden.appendChild(b);
      });
      const me = { next: 0, errors: 0, onset: performance.now(), done: false, resolve: null, times: [] };
      let lastT = me.onset;
      await new Promise((res) => {
        me.resolve = res;
        garden.querySelectorAll(".lantern").forEach((b) => b.addEventListener("pointerdown", (e) => {
          e.stopPropagation(); if (me.done) return;
          const i = +b.dataset.i;
          if (i === me.next) {
            const now = performance.now(); me.times.push(now - lastT); lastT = now;
            b.classList.add("lit");
            if (i > 0) { const a = pos[i - 1], c = pos[i]; const ln = document.createElementNS("http://www.w3.org/2000/svg", "line"); ln.setAttribute("x1", a.x); ln.setAttribute("y1", a.y); ln.setAttribute("x2", c.x); ln.setAttribute("y2", c.y); lines.appendChild(ln); }
            me.next++;
            if (me.next === seq.length) { me.done = true; const cc = Fx.center(b); Fx.burst(cc.x, cc.y, "#ffb7d5", 16); ctx.hit(b, { msg: "별자리 완성!", bonus: me.errors === 0 ? 2 : 0 }); setTimeout(res, 700); }
            else { Audio.tick(); const cc = Fx.center(b); Fx.burst(cc.x, cc.y, "#ffd24d", 5); }
          } else {
            me.errors++; b.classList.add("bonk"); setTimeout(() => b.classList.remove("bonk"), 400);
            ctx.miss(b, { msg: `다음은 ${seq[me.next]}!` });
          }
        }));
        ctx.wait(p.limit).then(() => { if (!me.done) { me.done = true; ctx.miss(garden, { msg: "시간이 다 됐어", soft: true }); setTimeout(res, 600); } }, () => { me.done = true; res(); });
      });
      const total = Math.round(performance.now() - me.onset);
      log.push({ completed: me.next === seq.length, ms: total, errors: me.errors, perItem: me.times.length ? Math.round(Stats.mean(me.times)) : null, items: seq.length });
      ctx.setProgress((r + 1) / rounds);
      await ctx.between();
      await ctx.wait(300);
    }
    lines.setAttribute("viewBox", "0 0 100 100");
    const done = log.filter((x) => x.completed).length;
    const errs = log.reduce((a, x) => a + x.errors, 0);
    const items = log.reduce((a, x) => a + x.items, 0);
    return {
      task: this.id, level,
      accuracy: Math.max(0, (items - errs * 1.5) / items) * (done / log.length),
      metrics: { rounds: log.length, completed: done, errors: errs, meanPerItem: Math.round(Stats.mean(log.filter((x) => x.perItem).map((x) => x.perItem))), meanRoundMs: Math.round(Stats.mean(log.map((x) => x.ms))), alt: !!p.alt },
      trials: items,
    };
  },

  summary(r) {
    return [`완성 ${r.metrics.completed}/${r.metrics.rounds}`, `등불당 ${(r.metrics.meanPerItem / 1000).toFixed(1)}초`, `순서 실수 ${r.metrics.errors}회`];
  },
};
