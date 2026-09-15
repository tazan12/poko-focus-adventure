// 스테이지 변주 시스템 — 측정 코어(자극 비율·제시 시간·ISI)는 건드리지 않고 "보상층·시각층·시행 사이"에만 변화를 준다.
//   스테이지가 오를수록 아이템·이벤트·팔레트·보스가 누적 해금되어 같은 과제도 매 스테이지가 다르게 느껴진다.
const StageFX = (() => {
  // 스테이지별 새 요소 (누적). intro 카드와 기능 게이트에 사용
  const UNLOCKS = {
    1: { name: "첫걸음", icon: "🌱", desc: "기본 규칙을 익혀요", feats: [] },
    2: { name: "코인 자석", icon: "🧲", desc: "5연속 성공하면 코인 자석 발동! 8번 동안 코인 2배", feats: ["magnet"] },
    3: { name: "황금 별별이", icon: "✨", desc: "황금 별별이가 더 자주 나타나요. 잡으면 +5", feats: ["gold"] },
    4: { name: "새벽빛", icon: "🌅", desc: "세계가 새벽빛으로 물들고, 포코가 중간중간 응원해요", feats: ["dawn", "cheer"] },
    5: { name: "심술이 대장", icon: "👺", desc: "마지막 구간에 심술이 대장이 나타나요. 정확하게 해서 물리치자!", feats: ["miniboss"] },
    6: { name: "눈꽃 안개", icon: "❄️", desc: "눈꽃이 내려요. 8연속 성공하면 별빛 보호막(실수 1번 콤보 유지)", feats: ["snow", "shield"] },
    7: { name: "황금 시간", icon: "⏳", desc: "가끔 황금 시간! 10번 동안 코인 2배", feats: ["goldentime"] },
    8: { name: "오로라", icon: "🌌", desc: "오로라가 뜨고, 코인 비가 내려요", feats: ["aurora", "coinrain"] },
    9: { name: "어둠 속 탐험", icon: "🌑", desc: "어두운 밤, 집중이 더 필요해요", feats: ["dark"] },
    10: { name: "심술이 대왕", icon: "👑", desc: "보스전! 심술이 대왕의 HP를 모두 깎으면 보스 배지를 얻어요", feats: ["boss"] },
  };
  const has = (level, f) => { for (let l = 1; l <= level; l++) if (UNLOCKS[l].feats.includes(f)) return true; return false; };
  // 스테이지별 목표 (달성 시 +20 코인). 결과 객체 r로 판정
  const GOALS = {
    1: { text: "끝까지 완주하기", check: () => true },
    2: { text: "5연속 콤보 만들기", check: (r) => (r.bestCombo || 0) >= 5 },
    3: { text: "정확도 80% 넘기기", check: (r) => r.accuracy >= 0.8 },
    4: { text: "정확도 85% 넘기기", check: (r) => r.accuracy >= 0.85 },
    5: { text: "심술이 대장 물리치기", check: (r) => !!(r.fx && r.fx.boss && r.fx.boss.win) },
    6: { text: "8연속 콤보 만들기", check: (r) => (r.bestCombo || 0) >= 8 },
    7: { text: "정확도 85% + 6콤보", check: (r) => r.accuracy >= 0.85 && (r.bestCombo || 0) >= 6 },
    8: { text: "정확도 90% 넘기기", check: (r) => r.accuracy >= 0.9 },
    9: { text: "10연속 콤보 만들기", check: (r) => (r.bestCombo || 0) >= 10 },
    10: { text: "심술이 대왕 물리치기", check: (r) => !!(r.fx && r.fx.boss && r.fx.boss.win) },
  };
  // 세계별 분위기 파티클 (4~6 스테이지). 7~8 오로라, 9 반짝임, 10 불씨
  const WORLD_PARTICLE = { gonogo: "leaves", cpt: "shooting", nback: "fireflies", search: "sparkles", flanker: "bubbles", switch: "sparkles", stroop: "bubbles", trail: "petals", headcount: "fireflies", balloons: "sparkles", calc: "leaves" };
  const P_STYLE = {
    fireflies: { dir: -0.6, color: [255, 240, 160], r: 1.2, n: 26 }, snow: { dir: 1, color: [235, 245, 255], r: 1.6, n: 40 },
    aurora: { dir: -0.6, color: [160, 255, 220], r: 1.2, n: 26 }, leaves: { dir: 0.8, color: [255, 190, 90], r: 2.2, n: 22, sway: 3 },
    petals: { dir: 0.7, color: [255, 183, 213], r: 2, n: 30, sway: 3 }, bubbles: { dir: -0.9, color: [180, 235, 255], r: 2.2, n: 24, ring: true },
    sparkles: { dir: 0, color: [255, 255, 220], r: 1.4, n: 34, twinkle: true }, shooting: { dir: -1.5, color: [255, 255, 255], r: 1.2, n: 8, streak: true },
    embers: { dir: -0.8, color: [255, 120, 70], r: 1.6, n: 30 },
  };

  const $ = (id) => document.getElementById(id);
  let state = null; // 현재 미션의 변주 상태
  let raf = null, parts = [];

  // ---------- 파티클 (미션 화면 캔버스, 저밀도) ----------
  function particles(type) {
    const canvas = $("task-fx");
    stopParticles();
    if (!type) { canvas.hidden = true; return; }
    canvas.hidden = false;
    const c2 = canvas.getContext("2d");
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const st = P_STYLE[type] || P_STYLE.fireflies;
    parts = Array.from({ length: st.n }, () => ({ x: Math.random(), y: Math.random(), r: (0.7 + Math.random() * 0.8) * st.r, s: 0.00005 + Math.random() * 0.00008, p: Math.random() * 6.3, vx: (Math.random() - 0.5) * 0.0003 }));
    let last = performance.now();
    const [cr, cg, cb] = st.color;
    const frame = (t) => {
      const dt = Math.min(50, t - last); last = t;
      if (!Sprite.paused) {
        const W = canvas.width, H = canvas.height;
        c2.clearRect(0, 0, W, H);
        for (const q of parts) {
          q.p += dt * 0.001;
          q.y += q.s * dt * st.dir; q.x += (Math.sin(q.p) * 0.00012 * (st.sway || 1) + (st.streak ? q.vx * 3 : 0)) * dt;
          if (q.y > 1.05) { q.y = -0.05; q.x = Math.random(); } if (q.y < -0.05) { q.y = 1.05; q.x = Math.random(); }
          const a = st.twinkle ? Math.max(0, Math.sin(q.p * 2.2)) * 0.8 : 0.35 + 0.35 * Math.sin(q.p * 1.7);
          c2.strokeStyle = c2.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
          if (st.streak) { c2.lineWidth = 1.5; c2.beginPath(); c2.moveTo(q.x * W, q.y * H); c2.lineTo(q.x * W - 22, q.y * H + 14); c2.stroke(); }
          else if (st.ring) { c2.lineWidth = 1.2; c2.beginPath(); c2.arc(q.x * W, q.y * H, q.r * 2.2, 0, Math.PI * 2); c2.stroke(); }
          else { c2.beginPath(); c2.arc(q.x * W, q.y * H, q.r * 1.3, 0, Math.PI * 2); c2.fill(); }
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }
  function stopParticles() { cancelAnimationFrame(raf); raf = null; const c = $("task-fx"); if (c) { c.hidden = true; } }

  // ---------- 미션 시작: 팔레트·파티클·보스 준비 ----------
  function begin(task, level, totalTrials) {
    state = { task, level, total: totalTrials, trial: 0, magnet: 0, shield: false, golden: 0, boss: null, events: [], nextEventAt: 12 + Math.floor(Math.random() * 6) };
    const scr = $("screen-task");
    scr.classList.remove("pal-dawn", "pal-aurora", "pal-dark", "pal-boss", "band1", "band2", "band3", "band4");
    scr.classList.add(level >= 10 ? "band4" : level >= 7 ? "band3" : level >= 4 ? "band2" : "band1");
    if (level >= 10) scr.classList.add("pal-boss");
    else if (level >= 9) scr.classList.add("pal-dark");
    else if (level >= 7) scr.classList.add("pal-aurora");
    else if (level >= 4) scr.classList.add("pal-dawn");
    const wp = WORLD_PARTICLE[task.id] || "fireflies";
    particles(level >= 10 ? "embers" : level >= 9 ? "sparkles" : level >= 7 ? "aurora" : level === 6 ? (["gonogo", "nback", "cpt", "headcount"].includes(task.id) ? "snow" : wp) : level >= 4 ? wp : null);
    // 보스: 10스테이지는 전체, 5~9는 마지막 1/3 구간에 미니보스
    $("boss-bar").hidden = true;
    if (level >= 10) startBoss("king", totalTrials);
    return state;
  }

  function startBoss(kind, hpTrials) {
    state.boss = { kind, hp: hpTrials, max: hpTrials, hits: 0, misses: 0 };
    const bar = $("boss-bar");
    bar.hidden = false;
    $("boss-img").src = kind === "king" ? "assets/characters/spiky_king.png" : "assets/characters/spiky_nogo.png";
    $("boss-name").textContent = kind === "king" ? "심술이 대왕" : "심술이 대장";
    $("boss-hp").style.width = "100%";
    bar.classList.remove("hurt"); void bar.offsetWidth; bar.classList.add("appear");
    Audio.alert();
  }

  // ---------- 정답/오답 훅: 아이템은 보상층에만 작용 ----------
  // 반환: { mult, msg } — 코인 배율 추가분과 표시 문구
  function onHit(combo) {
    if (!state) return { mult: 1, note: "" };
    let mult = 1; const notes = [];
    if (has(state.level, "magnet") && combo === 5 && state.magnet === 0) { state.magnet = 8; notes.push("🧲 코인 자석!"); Audio.gold(); }
    if (state.magnet > 0) { state.magnet--; mult *= 2; }
    if (state.golden > 0) { state.golden--; mult *= 2; }
    if (has(state.level, "shield") && combo === 8 && !state.shield) { state.shield = true; notes.push("🛡 별빛 보호막!"); Audio.gold(); }
    if (state.boss) { state.boss.hits++; state.boss.hp = Math.max(0, state.boss.hp - 1); $("boss-hp").style.width = `${(state.boss.hp / state.boss.max) * 100}%`; const b = $("boss-bar"); b.classList.remove("hurt"); void b.offsetWidth; b.classList.add("hurt"); }
    updateItems();
    return { mult, note: notes.join(" ") };
  }
  // 반환: true 면 보호막이 실수를 막았다(콤보 유지)
  function onMiss() {
    if (!state) return false;
    if (state.boss) { state.boss.misses++; const b = $("boss-bar"); b.classList.remove("attack"); void b.offsetWidth; b.classList.add("attack"); $("screen-task").classList.add("shake"); setTimeout(() => $("screen-task").classList.remove("shake"), 450); }
    if (state.shield) { state.shield = false; updateItems(); return true; }
    updateItems();
    return false;
  }
  function updateItems() {
    const el = $("hud-items");
    if (!state) { el.textContent = ""; return; }
    el.innerHTML = [state.magnet > 0 ? `<span>🧲 ${state.magnet}</span>` : "", state.golden > 0 ? `<span>⏳ ${state.golden}</span>` : "", state.shield ? "<span>🛡</span>" : ""].join("");
  }

  // ---------- 시행 사이 이벤트 (과제 타이밍 밖에서만 실행) ----------
  async function between(ctx) {
    if (!state) return;
    state.trial++;
    const L = state.level;
    // 미니보스: 마지막 1/3 구간 진입
    if (has(L, "miniboss") && L < 10 && !state.boss && state.trial === Math.floor(state.total * 2 / 3)) {
      await ctx.showMessage("👺 심술이 대장이 나타났다!", "정확하게 해서 물리치자!", 1800);
      startBoss("captain", state.total - state.trial);
      return;
    }
    if (state.trial < state.nextEventAt) return;
    state.nextEventAt = state.trial + 10 + Math.floor(Math.random() * 8);
    const pool = [];
    if (has(L, "cheer")) pool.push("cheer");
    if (has(L, "goldentime")) pool.push("goldentime");
    if (has(L, "coinrain")) pool.push("coinrain");
    if (has(L, "miniboss")) pool.push("treasure", "treasure");
    if (!pool.length) return;
    const ev = pool[Math.floor(Math.random() * pool.length)];
    state.events.push(ev);
    if (ev === "cheer") {
      await showEvent(ctx, "assets/characters/poko_excited.png", "포코의 응원!", "잘하고 있어, 조금만 더!", 1300);
    } else if (ev === "goldentime") {
      state.golden = 10; updateItems();
      await showEvent(ctx, "assets/characters/star_gold.png", "⏳ 황금 시간!", "10번 동안 코인 2배!", 1400);
    } else if (ev === "coinrain") {
      await showEvent(ctx, "assets/characters/coin.png", "💰 코인 비!", "+8 코인", 1400, true);
      ctx.bonusCoins(8);
    } else if (ev === "treasure") {
      // 보물 상자: 1.8초 안에 터치하면 +10 (시행 사이에만 등장 → 측정과 무관)
      await new Promise((res) => {
        const m = document.createElement("div");
        m.className = "stage-event treasure"; m.innerHTML = `<button class="treasure-btn"><img src="assets/characters/chest.png" alt=""><b>보물 상자!</b><small>빨리 터치!</small></button>`;
        ctx.stage.appendChild(m); Audio.alert();
        let done = false;
        m.querySelector(".treasure-btn").addEventListener("pointerdown", (e) => { e.stopPropagation(); if (done) return; done = true; ctx.bonusCoins(10); const c = Fx.center(m.querySelector("img")); Fx.burst(c.x, c.y, "#ffd24d", 16); Fx.popup(c.x, c.y - 60, "+10 코인!", "combo"); Audio.gold(); setTimeout(() => { m.remove(); res(); }, 500); });
        ctx.wait(1800).then(() => { if (!done) { done = true; m.remove(); res(); } }, () => { m.remove(); res(); });
      });
    }
  }
  async function showEvent(ctx, img, title, sub, ms, rain = false) {
    const m = document.createElement("div");
    m.className = "stage-event"; m.innerHTML = `<img src="${img}" alt=""><b>${title}</b><small>${sub}</small>`;
    ctx.stage.appendChild(m);
    Audio.fanfare();
    if (rain) { const L = $("fx-layer"); for (let i = 0; i < 14; i++) { const c = document.createElement("img"); c.src = "assets/characters/coin.png"; c.className = "coin-rain"; c.style.left = `${5 + Math.random() * 90}%`; c.style.animationDelay = `${Math.random() * 0.6}s`; L.appendChild(c); setTimeout(() => c.remove(), 1600); } }
    await ctx.wait(ms);
    m.remove();
  }

  // ---------- 미션 종료: 보스 결과 ----------
  function end() {
    stopParticles();
    $("boss-bar").hidden = true;
    $("screen-task").classList.remove("pal-dawn", "pal-aurora", "pal-dark", "pal-boss");
    const s = state; state = null;
    if (!s) return { boss: null };
    let boss = null;
    if (s.boss) {
      const total = s.boss.hits + s.boss.misses;
      const win = s.boss.hp === 0 || (total > 0 && s.boss.hits / total >= 0.7);
      boss = { kind: s.boss.kind, win };
    }
    return { boss, events: s.events };
  }

  return { UNLOCKS, GOALS, has, begin, between, onHit, onMiss, end, updateItems };
})();
