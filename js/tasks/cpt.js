// 미션 ② 별자리 망원경 — CPT (지속주의/경계)
// 과제 구조: 표적(별별이) 저확률(18~30%) 제시, 75~110초 지속. TOVA/Conners CPT 구조. 지표: 누락·오경보·RT 변동성·후반 저하
// 게임 껍데기: 망원경으로 밤하늘을 관찰. 별별이를 잡을 때마다 별자리에 별이 하나씩 켜지고 선이 이어진다.
const TaskCPT = {
  id: "cpt",
  name: "별자리 망원경",
  world: "별빛 언덕",
  short: "지켜보는 힘",
  icon: "assets/characters/moon.png",
  bg: "assets/bg/sky.jpg",
  sticker: "assets/stickers/sky.png",
  desc: "망원경으로 하늘을 지켜보다가 별별이가 반짝일 때만 잡아서 별자리를 완성해요.",
  story: "언덕 위 망원경으로 하늘을 보면 사라진 별자리의 조각들이 보여. 별별이가 반짝이는 순간을 놓치지 말고 잡아서 별자리를 이어 줘!",

  levelParams(level) {
    const table = [
      { stim: 700, isi: 1500, target: 0.30, sec: 75 },
      { stim: 600, isi: 1400, target: 0.28, sec: 80 },
      { stim: 550, isi: 1300, target: 0.26, sec: 85 },
      { stim: 500, isi: 1200, target: 0.25, sec: 90 },
      { stim: 450, isi: 1100, target: 0.24, sec: 90 },
      { stim: 400, isi: 1000, target: 0.22, sec: 95 },
      { stim: 380, isi: 950, target: 0.21, sec: 100 },
      { stim: 350, isi: 900, target: 0.20, sec: 100 },
      { stim: 320, isi: 850, target: 0.20, sec: 105 },
      { stim: 300, isi: 800, target: 0.18, sec: 110 },
    ];
    return table[Math.min(level, table.length) - 1];
  },

  tier(level) { return { wide: level >= 4, drift: level >= 7 }; },
  intro(level) {
    const t = this.tier(level);
    return {
      title: "별자리 망원경",
      desc: "하늘에 친구들이 하나씩 반짝여요.<br><b>별별이</b>가 반짝일 때만 잡기(스페이스/터치)! 잡을 때마다 별자리가 이어져요.<br>구름·달·행성은 그냥 지켜보기." + (t.wide ? "<br>🔭 친구들이 <b>하늘 어디서나</b> 나타나요." : "") + (t.drift ? "<br>💨 친구들이 <b>떠다니며 지나가요</b>. 눈으로 잘 따라가요!" : ""),
      demo: `
        <div class="demo-item go"><img src="assets/characters/star_go.png" alt="">잡기!</div>
        <div class="demo-item nogo"><img src="assets/characters/cloud.png" alt="">지켜보기</div>
        <div class="demo-item nogo"><img src="assets/characters/moon.png" alt="">지켜보기</div>
        <div class="demo-item nogo"><img src="assets/characters/planet.png" alt="">지켜보기</div>`,
    };
  },

  // 별자리 모양: 스테이지마다 다른 도형(물결·여우·배·왕관·하트)을 표적 수에 맞춰 폴리라인 위에 균등 배치
  SHAPES: [
    [[8, 24], [22, 18], [36, 30], [50, 20], [64, 30], [78, 18], [92, 26]],
    [[10, 32], [18, 14], [26, 26], [50, 22], [74, 26], [82, 14], [90, 32], [74, 36], [50, 34], [26, 36], [10, 32]],
    [[10, 22], [30, 22], [50, 10], [70, 22], [90, 22], [80, 34], [20, 34], [10, 22]],
    [[12, 34], [12, 16], [31, 26], [50, 8], [69, 26], [88, 16], [88, 34], [12, 34]],
    [[50, 36], [22, 20], [28, 10], [40, 10], [50, 18], [60, 10], [72, 10], [78, 20], [50, 36]],
  ],
  constellation(n, level = 1) {
    const pts = this.SHAPES[(level - 1) % this.SHAPES.length];
    const segs = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
    const total = segs.reduce((a, b) => a + b, 0);
    return Array.from({ length: n }, (_, i) => {
      let d = (n === 1 ? 0.5 : i / (n - 1)) * total, k = 0;
      while (k < segs.length - 1 && d > segs[k]) { d -= segs[k]; k++; }
      const t = segs[k] ? d / segs[k] : 0;
      return { x: pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t, y: pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t };
    });
  },

  async run(ctx, level) {
    const p = Adaptive.tune(this.levelParams(level));
    const nTrials = Math.round((p.sec * 1000) / (p.stim + p.isi));
    const distractors = ["cloud", "moon", "planet"];
    const nTarget = Math.round(nTrials * p.target);
    const seq = Stats.shuffle([...Array(nTarget).fill("star_go"), ...Array.from({ length: nTrials - nTarget }, (_, i) => distractors[i % 3])]);
    const goldRate = StageFX.has(level, "gold") ? 0.15 : 0.07;
    const goldAt = new Set(seq.map((v, i) => v === "star_go" && Math.random() < goldRate ? i : -1).filter((i) => i >= 0));
    const pts = this.constellation(nTarget, level);

    // 별자리는 픽셀 좌표로 그려서 원이 찌그러지지 않게 한다
    const W = ctx.stage.clientWidth, H = ctx.stage.clientHeight;
    const px = pts.map((q) => ({ x: (q.x / 100) * W, y: (q.y / 100) * H }));
    ctx.stage.innerHTML = `
      <div class="sky">
        <svg class="constellation" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          ${px.slice(1).map((q, i) => `<line id="cl-${i}" x1="${px[i].x}" y1="${px[i].y}" x2="${q.x}" y2="${q.y}"/>`).join("")}
          ${px.map((q, i) => `<circle id="cs-${i}" cx="${q.x}" cy="${q.y}" r="7"/>`).join("")}
        </svg>
        <div class="sky-critter" id="sky-critter"></div>
        <div class="telescope-mask"></div>
      </div>`;
    ctx.controls.innerHTML = `<button class="tap-btn" id="cpt-tap">잡기!</button><div class="key-hint">키보드: 스페이스 · 화면 터치도 돼요</div>`;
    const box = document.getElementById("sky-critter");
    let lit = 0;
    const lightNext = () => {
      const c = document.getElementById(`cs-${lit}`);
      if (c) c.classList.add("lit");
      if (lit > 0) { const l = document.getElementById(`cl-${lit - 1}`); if (l) l.classList.add("lit"); }
      lit++;
    };

    let cur = null;
    const onPress = () => {
      if (!cur || cur.pressed) return;
      cur.pressed = true;
      cur.rt = Math.round(performance.now() - cur.onset);
      const c = Fx.center(cur.el);
      if (cur.isTarget) {
        cur.el.classList.add("caught");
        Fx.burst(c.x, c.y, cur.gold ? "#fff1a8" : "#ffe680", cur.gold ? 18 : 10);
        lightNext();
        if (cur.gold) ctx.hit(cur.el, { msg: "황금 별별이!", bonus: 5 });
        else ctx.hit(cur.el, { msg: "별자리 +1" });
      } else {
        cur.el.classList.add("bonk");
        ctx.miss(cur.el, { msg: "그건 별별이가 아니야" });
      }
    };
    ctx.input.on(onPress);
    document.getElementById("cpt-tap").addEventListener("pointerdown", onPress);

    const log = [];
    for (let i = 0; i < seq.length; i++) {
      const isTarget = seq[i] === "star_go";
      // 자극 위치: 망원경 시야 중앙 영역 (별자리 띠 아래)
      const tier = this.tier(level);
      box.style.left = tier.wide ? `${12 + Math.random() * 76}%` : `${25 + Math.random() * 50}%`;
      box.style.top = tier.wide ? `${36 + Math.random() * 44}%` : `${42 + Math.random() * 30}%`;
      box.classList.toggle("drift-l", tier.drift && Math.random() < 0.5); box.classList.toggle("drift-r", tier.drift && !box.classList.contains("drift-l"));
      box.style.setProperty("--dur", `${p.stim + 200}ms`);
      const el = document.createElement("div");
      const gold = goldAt.has(i);
      el.className = "critter twinkle" + (gold ? " gold" : "");
      if (gold) el.style.backgroundImage = 'url("assets/characters/star_gold.png")';
      else if (seq[i] === "star_go") Sprite.play(el, "star_idle", { fps: 6 });
      else el.style.backgroundImage = `url("assets/characters/${seq[i]}.png")`;
      box.innerHTML = ""; box.appendChild(el);
      cur = { el, isTarget, gold, pressed: false, onset: performance.now(), rt: null };
      await ctx.wait(p.stim);
      if (!cur.pressed) el.classList.add("hide");
      await ctx.wait(p.isi);
      const done = cur; cur = null;
      Sprite.stop(el);
      const type = isTarget ? (done.pressed ? "hit" : "omission") : (done.pressed ? "commission" : "correct_rejection");
      if (type === "omission") ctx.miss(el, { msg: "별이 지나갔어…", soft: true });
      log.push({ target: isTarget, pressed: done.pressed, rt: done.rt, type, index: i });
      ctx.setProgress((i + 1) / seq.length);
      await ctx.between();
    }
    ctx.input.off(onPress);

    const hits = log.filter((x) => x.type === "hit");
    const tN = log.filter((x) => x.target).length;
    const omission = log.filter((x) => x.type === "omission").length;
    const commission = log.filter((x) => x.type === "commission").length;
    const rts = hits.map((x) => x.rt);
    const half = Math.floor(log.length / 2);
    const omFirst = log.slice(0, half).filter((x) => x.type === "omission").length;
    const omSecond = log.slice(half).filter((x) => x.type === "omission").length;
    return {
      task: this.id, level,
      accuracy: (log.length - omission - commission) / log.length,
      metrics: {
        omission, commission,
        omissionRate: tN ? omission / tN : 0,
        commissionRate: (log.length - tN) ? commission / (log.length - tN) : 0,
        meanRT: Math.round(Stats.mean(rts)), rtSD: Math.round(Stats.sd(rts)),
        vigilanceDecrement: omSecond - omFirst, durationSec: p.sec,
        constellation: tN ? hits.length / tN : 0,
      },
      trials: log.length,
    };
  },

  summary(r) {
    return [`별자리 ${Math.round(r.metrics.constellation * 100)}% 완성`, `놓친 별 ${r.metrics.omission}개`, `반응 흔들림 ±${r.metrics.rtSD}ms`];
  },
};
