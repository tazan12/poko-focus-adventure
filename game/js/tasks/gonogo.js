// 미션 ① 반짝 숲 달리기 — Go/No-Go (억제조절)
// 과제 구조는 vekteo/GoNoGo_jsPsych (MIT, Bezdjian et al. 2009)와 동일하게 유지:
//   Go:No-Go = 80:20, 응답 창 = 자극 제시(≈500ms) + ISI(≈1500ms), 20시행 블록, 후반 규칙 반전
// 게임 껍데기(테스터 피드백 반영): 친구들이 오른쪽에서 한 명씩 포코를 향해 달려온다.
//   별별이·토끼 → 점프해서 잡기 / 심술이 → 아무것도 누르지 않으면 혀를 내밀며 옆으로 스쳐 지나간다 / 부엉이(7단계+) → 숙여서 피하기
//   응답 창 = 친구가 포코 앞에 도착할 때까지의 시간. 도착 후엔 각자 "지나가는" 모션을 보여준다.
const TaskGoNoGo = {
  id: "gonogo",
  name: "반짝 숲 달리기",
  world: "반짝 숲",
  short: "참는 힘",
  icon: "assets/characters/star_go.png",
  bg: "assets/bg/forest.jpg",
  sticker: "assets/stickers/forest.png",
  desc: "숲길을 달리며 다가오는 별별이를 점프해서 잡아요. 심술이는 참으면 알아서 스쳐 지나가요!",
  story: "숲의 별빛이 사라졌어! 숲길을 달려오는 별별이들을 잡아서 별빛을 되찾자. 심술이가 달려오면… 가만히 있으면 혀만 내밀고 지나갈 거야!",

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

  // 티어별 변화: 3+ 토끼 합류(잡는 친구 2종), 6+ 안개(가까이 와야 또렷), 7+ 부엉이(숙여서 피하기), 8+ 가속 구간
  tier(level) { return { bunny: level >= 3, fog: level >= 6, owl: level >= 7, burst: level >= 8 }; },

  intro(level) {
    const p = this.levelParams(level), t = this.tier(level);
    return {
      title: "반짝 숲 달리기",
      desc: (p.reverse
        ? "<b>별별이</b>가 달려오면 점프해서 잡기! <b>심술이</b>는 참기!<br>이 숲은 마법에 걸려서, 달리다가 <b>규칙이 뒤집힐 수도</b> 있어."
        : "친구들이 한 명씩 <b>달려와요</b>. <b>별별이</b>가 오면 <b>점프!</b>(스페이스 또는 화면 터치)<br><b>심술이</b>가 오면 <b>아무것도 누르지 말기</b> — 가만히 있으면 옆으로 스쳐 지나가요!")
        + (t.bunny ? "<br>🐰 <b>토끼</b>도 같이 달려와요. 토끼도 점프해서 잡기!" : "")
        + (t.fog ? "<br>🌫 안개 때문에 친구들이 <b>가까이 와야</b> 또렷하게 보여요." : "")
        + (t.owl ? "<br>🦉 <b>부엉이</b>가 날아오면 <b>숙이기!</b>(↓ 키 또는 숙이기 버튼)" : "")
        + (t.burst ? "<br>⚡ 중간에 <b>가속 구간</b>이 있어요!" : ""),
      demo: `
        <div class="demo-item go"><img src="assets/characters/star_go.png" alt="">점프해서 잡기!</div>
        ${t.bunny ? `<div class="demo-item go"><img src="assets/characters/bunny.png" alt="">점프해서 잡기!</div>` : ""}
        <div class="demo-item nogo"><img src="assets/characters/spiky_nogo.png" alt="">가만히 → 스쳐 지나감</div>
        ${t.owl ? `<div class="demo-item duck"><img src="assets/characters/owl.png" alt="">숙여서 피하기!</div>` : ""}`,
    };
  },

  // 20시행 블록: Go 16(부엉이 티어면 그중 4는 '숙이기' Go) + No-Go 4. Go:No-Go = 80:20 유지
  makeBlock(goIsStar, tier) {
    const trials = [];
    for (let i = 0; i < 16; i++) {
      if (tier.owl && i < 4) { trials.push({ go: true, kind: "owl", action: "duck" }); continue; }
      const kind = goIsStar ? (tier.bunny && i % 3 === 1 ? "bunny" : "star") : "spiky";
      trials.push({ go: true, kind, action: "jump" });
    }
    for (let i = 0; i < 4; i++) trials.push({ go: false, kind: goIsStar ? "spiky" : "star", action: null });
    return Stats.shuffle(trials).map((t) => {
      // 황금 별별이: 별별이가 Go 자극일 때 낮은 확률의 희귀 보너스 (측정상으로는 동일한 Go 시행)
      const gold = t.kind === "star" && t.go && Math.random() < (this._goldRate || 0.06);
      return { ...t, gold };
    });
  },

  async run(ctx, level) {
    const p = Adaptive.tune(this.levelParams(level));
    const tier = this.tier(level);
    this._goldRate = StageFX.has(level, "gold") ? 0.12 : 0.05;
    const BLOCKS = p.quick ? 1 : 3;
    let goIsStar = true;
    const log = [];

    ctx.stage.innerHTML = `
      <div class="runner">
        <div class="runner-bg"></div>
        <div class="runner-lane" id="runner-lane"></div>
        <div class="runner-poko" id="runner-poko"></div>
      </div>`;
    ctx.controls.innerHTML = `<button class="tap-btn" id="gng-tap">점프!</button>${tier.owl ? `<button class="tap-btn duck" id="gng-duck">숙이기!</button>` : ""}<div class="key-hint">키보드: 스페이스 = 점프${tier.owl ? " · ↓ = 숙이기" : ""} · 화면 터치도 돼요</div>`;
    const lane = document.getElementById("runner-lane");
    const poko = document.getElementById("runner-poko");
    const CHAR_H = window.innerWidth < 600 ? "22%" : "30%";
    const runAnim = () => Sprite.play(poko, "poko_run", { fps: 12, charHeight: CHAR_H });
    runAnim();
    const jump = () => Sprite.play(poko, "poko_jump", { fps: 14, loop: false, charHeight: CHAR_H, arc: 70, onEnd: runAnim });
    const duck = () => Sprite.play(poko, "poko_duck", { fps: 10, loop: false, charHeight: CHAR_H, onEnd: runAnim });
    const lean = () => { poko.classList.remove("lean"); void poko.offsetWidth; poko.classList.add("lean"); setTimeout(() => poko.classList.remove("lean"), 500); };
    const oops = () => { poko.classList.add("oops"); setTimeout(() => poko.classList.remove("oops"), 500); };

    // 친구가 포코 앞에 도착하는 시점(전체 이동 구간 대비 비율)을 실제 배치로 계산 → 응답 창 = 도착까지의 시간
    const passFrac = () => {
      const R = lane.getBoundingClientRect(), P = poko.getBoundingClientRect();
      const critterW = R.width * (window.innerWidth < 600 ? 0.22 : 0.16);
      const pokoCenter = P.left + P.width * 0.55 - R.left;
      const startX = R.width, endX = -R.width * 0.25; // left: 100% → -25%
      return Math.min(0.85, Math.max(0.5, (startX - (pokoCenter - critterW / 2)) / (startX - endX)));
    };

    // 현재 시행 상태
    let cur = null; // { t, wrap, el, pressed, onset, rt, window }
    const respond = (action) => {
      if (!cur || cur.pressed) return;
      cur.pressed = action;
      cur.rt = Math.round(performance.now() - cur.onset);
      const { t, wrap, el } = cur;
      if (action === "jump") jump(); else duck();
      if (t.go && t.action === action) {
        // 적중: 별별이/토끼를 잡거나, 부엉이를 숙여서 피함
        if (action === "jump") {
          // 잡힌 친구는 포코 품으로 빨려 들어온 뒤 반짝 터진다
          wrap.classList.add("stop");
          const P = poko.getBoundingClientRect(), C = wrap.getBoundingClientRect();
          wrap.style.setProperty("--dx", `${Math.round(P.left + P.width * 0.55 - (C.left + C.width / 2))}px`);
          wrap.style.setProperty("--dy", `${Math.round(P.top + P.height * 0.3 - (C.top + C.height / 2))}px`);
          wrap.classList.add("pull"); el.classList.add("caught");
          const c = { x: P.left + P.width * 0.55, y: P.top + P.height * 0.3 };
          Fx.burst(c.x, c.y, t.gold ? "#fff1a8" : t.kind === "bunny" ? "#ffd6e6" : "#ffd24d", t.gold ? 18 : 10);
          const quick = cur.rt < cur.window * 0.45; // 멀리 있을 때 바로 판단하면 번개 보너스
          if (t.gold) ctx.hit(el, { msg: "황금 별별이!", bonus: 5 });
          else if (quick) ctx.hit(el, { msg: "번개 판단!", bonus: 1 });
          else ctx.hit(el, { msg: "잡았다!" });
        } else {
          wrap.classList.add("over"); // 부엉이가 머리 위로 지나감
          ctx.hit(el, { msg: "숙였다!" });
        }
      } else if (!t.go) {
        // 오경보: 참아야 할 친구를 건드림 → 부딪혀 튕겨남
        wrap.classList.add("stop"); el.classList.add("bonk");
        setTimeout(() => el.classList.add("hide"), 450);
        oops();
        ctx.miss(el, { msg: t.kind === "spiky" ? "앗, 심술이야!" : "앗, 별별이는 참아야 해!" });
      } else {
        // 잘못된 동작(부엉이에게 점프 / 별별이에게 숙이기) → 부딪힘
        wrap.classList.add("stop"); el.classList.add("bonk");
        setTimeout(() => el.classList.add("hide"), 450);
        oops();
        ctx.miss(el, { msg: t.kind === "owl" ? "부엉이는 숙여야 해!" : "숙이면 못 잡아!" });
      }
    };
    const onPress = () => respond("jump");
    const onKey = (e) => { if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { e.preventDefault(); if (tier.owl) respond("duck"); } };
    ctx.input.on(onPress); ctx.input.onKey(onKey);
    document.getElementById("gng-tap").addEventListener("pointerdown", (e) => { e.stopPropagation(); onPress(); });
    if (tier.owl) document.getElementById("gng-duck").addEventListener("pointerdown", (e) => { e.stopPropagation(); respond("duck"); });

    const IMG = { star: "star_go", bunny: "bunny", owl: "owl", spiky: "spiky_nogo" };
    let total = 0;
    const totalTrials = BLOCKS * 20;
    for (let b = 0; b < BLOCKS; b++) {
      if (p.reverse && BLOCKS > 1 && b === BLOCKS - 1) {
        goIsStar = false;
        Audio.alert();
        await ctx.showMessage("🔄 마법의 안개!", "규칙이 뒤집혔어! 이제 <b>심술이</b>를 잡고 <b>별별이</b>는 참아요!", 3200);
      }
      const burst = tier.burst && b === 1; // 가운데 블록이 가속 구간
      if (burst) { Audio.alert(); await ctx.showMessage("⚡ 가속 구간!", "친구들이 더 빨리 달려와요!", 1600); }
      const win = Math.round((p.stim + p.isi) * (burst ? 0.7 : 1)); // 응답 창(jsPsych와 동일: 자극 + ISI)
      for (const t of this.makeBlock(goIsStar, tier)) {
        const frac = passFrac();
        const dur = Math.round(win / frac);
        const wrap = document.createElement("div");
        wrap.className = `runner-critter ${t.kind}${tier.fog ? " fog" : ""}`;
        wrap.style.setProperty("--dur", `${dur}ms`);
        wrap.style.setProperty("--pass", frac.toFixed(3));
        wrap.innerHTML = `<div class="critter ${t.kind === "owl" ? "flap" : t.kind === "spiky" ? "" : "hop"}${t.gold ? " gold" : ""}"></div>`;
        const el = wrap.firstElementChild;
        if (t.gold) el.style.backgroundImage = 'url("assets/characters/star_gold.png")';
        else if (t.kind === "spiky") Sprite.play(el, "spiky_run", { fps: 9 });
        else if (t.kind === "star") Sprite.play(el, "star_idle", { fps: 6 });
        else el.style.backgroundImage = `url("assets/characters/${IMG[t.kind]}.png")`;
        lane.appendChild(wrap);
        cur = { t, wrap, el, pressed: null, onset: performance.now(), rt: null, window: win };
        await ctx.wait(win);
        const done = cur; cur = null;

        let type;
        if (t.go) type = !done.pressed ? "omission" : done.pressed === t.action ? "hit" : "wrong";
        else type = done.pressed ? "commission" : "correct_rejection";
        if (type === "omission") {
          if (t.kind === "owl") { wrap.classList.add("stop"); el.classList.add("bonk"); oops(); setTimeout(() => el.classList.add("hide"), 450); ctx.miss(el, { msg: "앗, 부엉이!" }); }
          else { wrap.classList.add("passed"); el.classList.add("flyaway"); ctx.miss(el, { msg: "놓쳤다…", soft: true }); }
        }
        if (type === "correct_rejection") {
          // 잘 참음: 심술이는 혀를 내밀고 폴짝 뛰어 옆으로 스쳐 지나가고, 포코는 살짝 몸을 젖힌다
          wrap.classList.add("passed"); el.classList.add(t.kind === "spiky" ? "taunt" : "wink"); lean();
          ctx.hit(el, { msg: t.kind === "spiky" ? "휙~ 잘 참았어!" : "잘 참았어!", quiet: true });
        }
        log.push({ go: t.go, kind: t.kind, pressed: done.pressed, rt: done.rt, type, reversed: !goIsStar, gold: !!t.gold, burst });
        // 지나간 친구는 화면 밖으로 나간 뒤 제거 (다음 친구는 바로 출발)
        const tail = Math.max(500, dur - win + 100);
        setTimeout(() => { Sprite.stop(el); wrap.remove(); }, tail);
        total++;
        ctx.setProgress(total / totalTrials);
        await ctx.wait(220);
        await ctx.between();
      }
    }
    ctx.input.off(onPress); ctx.input.offKey(onKey);
    Sprite.stopAll();
    lane.innerHTML = "";

    const hits = log.filter((x) => x.type === "hit");
    const goN = log.filter((x) => x.go).length;
    const nogoN = log.length - goN;
    const omission = log.filter((x) => x.type === "omission").length;
    const commission = log.filter((x) => x.type === "commission").length;
    const wrong = log.filter((x) => x.type === "wrong").length;
    const rts = hits.map((x) => x.rt);
    return {
      task: this.id, level,
      accuracy: (log.length - omission - commission - wrong) / log.length,
      metrics: {
        hitRate: goN ? hits.length / goN : 0, omission, commission, wrong,
        omissionRate: goN ? omission / goN : 0, commissionRate: nogoN ? commission / nogoN : 0,
        meanRT: Math.round(Stats.mean(rts)), rtSD: Math.round(Stats.sd(rts)),
        bunny: tier.bunny, owl: tier.owl, fog: tier.fog, burst: tier.burst,
      },
      trials: log.length,
    };
  },

  summary(r) {
    return [`정확도 ${Math.round(r.accuracy * 100)}%`, `참기 성공 ${Math.round((1 - r.metrics.commissionRate) * 100)}%`, `평균 반응 ${r.metrics.meanRT}ms`];
  },
};
