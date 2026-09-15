// 메인 컨트롤러 — 화면 전환, 세션 흐름, 스테이지 지도, 콤보/보상, 오늘의 도전, 스티커, 별 지도, 보호자 리포트, PWA 설치
(() => {
  const TASKS = { gonogo: TaskGoNoGo, nback: TaskNBack, cpt: TaskCPT, search: TaskSearch, flanker: TaskFlanker, switch: TaskSwitch, stroop: TaskStroop, trail: TaskTrail, headcount: TaskHeadcount, balloons: TaskBalloons, calc: TaskCalc, melody: TaskMelody };
  // 하루 세션 = 핵심 4개(억제·작업기억·지속주의·간섭통제) + 날짜별로 바뀌는 3개 = 7개 (약 12분)
  const CORE = ["gonogo", "nback", "cpt"], ROTATING = ["search", "flanker", "switch", "trail", "headcount", "balloons", "calc", "melody"];
  function sessionOrder() {
    const day = Math.floor(Date.now() / 86400000);
    const k = (day * 3) % ROTATING.length;
    const rot = [0, 1, 2].map((i) => ROTATING[(k + i) % ROTATING.length]);
    return [...CORE, ...rot, "stroop"];
  }
  const SESSION_ORDER = sessionOrder();
  const DAILY_CAP_MIN = () => (Adaptive.grown ? 45 : 25);
  const DAILY_CAP_SEC = { valueOf() { return DAILY_CAP_MIN() * 60; } };
  const MAX_STAGE = 10;

  const CHALLENGES = [
    { id: "no_commission", text: "심술이를 한 번도 건드리지 않기", icon: "assets/characters/spiky_nogo.png", bonus: 30, check: (rs) => rs.some((r) => r.task === "gonogo" && r.metrics.commission === 0) },
    { id: "combo8", text: "어느 미션에서든 8연속 콤보 만들기", icon: "assets/characters/coin.png", bonus: 25, check: (rs) => rs.some((r) => (r.bestCombo || 0) >= 8) },
    { id: "constellation", text: "별자리 80% 이상 완성하기", icon: "assets/characters/star_go.png", bonus: 30, check: (rs) => rs.some((r) => r.task === "cpt" && r.metrics.constellation >= 0.8) },
    { id: "potion90", text: "물약 90% 이상 성공하기", icon: "assets/characters/bottle.png", bonus: 30, check: (rs) => rs.some((r) => r.task === "stroop" && r.accuracy >= 0.9) },
    { id: "river85", text: "강물 길잡이 정확도 85% 넘기기", icon: "assets/characters/fish.png", bonus: 30, check: (rs) => rs.some((r) => r.task === "flanker" && r.accuracy >= 0.85) },
    { id: "search_all", text: "숨은 별별이를 한 마리도 놓치지 않기", icon: "assets/characters/star_gold.png", bonus: 30, check: (rs) => rs.some((r) => r.task === "search" && r.metrics.timeouts === 0) },
    { id: "switch90", text: "보물 분류 정확도 90% 넘기기", icon: "assets/characters/chest.png", bonus: 30, check: (rs) => rs.some((r) => r.task === "switch" && r.accuracy >= 0.9) },
    { id: "melody5", text: "별빛 멜로디 5음 이상 기억하기", icon: "assets/characters/bell.png", bonus: 30, check: (rs) => rs.some((r) => r.task === "melody" && r.metrics.span >= 5) },
    { id: "all_two_stars", text: "모든 세계에서 별 2개 이상 받기", icon: "assets/characters/poko_proud.png", bonus: 50, check: (rs) => rs.length >= SESSION_ORDER.length && rs.every((r) => r.stars >= 2) },
  ];
  const todayChallenge = () => CHALLENGES[[...Storage.today()].reduce((a, c) => a + c.charCodeAt(0), 0) % CHALLENGES.length];

  const HATS = [
    { id: "explorer", name: "탐험가 모자", price: 60 }, { id: "crown", name: "황금 왕관", price: 300 }, { id: "wizard", name: "마법사 모자", price: 150 },
    { id: "star", name: "별빛 머리띠", price: 90 }, { id: "party", name: "파티 모자", price: 120 }, { id: "beanie", name: "방울 모자", price: 80 },
  ];
  const $ = (id) => document.getElementById(id);
  // ---------- 주인공 캐릭터 (포코 기본, 나머지는 코인으로 열기) ----------
  const HEROES = [
    { id: "poko", name: "포코", desc: "별빛 탐험대 대장 여우", price: 0 },
    { id: "bunny", name: "토토", desc: "폴짝폴짝 잘 뛰는 토끼", price: 120 },
    { id: "squirrel", name: "도토", desc: "재빠른 다람쥐", price: 160 },
    { id: "owl", name: "부우", desc: "밤하늘을 나는 부엉이", price: 200 },
    { id: "pig", name: "꿀꿀", desc: "명랑한 아기 돼지", price: 200 },
    { id: "sheep", name: "양양", desc: "구름처럼 폭신한 양", price: 220 },
    { id: "dino", name: "디노", desc: "씩씩한 아기 공룡", price: 240 },
    { id: "tiger", name: "호호", desc: "용감한 아기 호랑이", price: 260 },
  ];
  // 표정 파일: 포코는 표정 10종, 다른 캐릭터는 6종(happy/surprised/proud/encourage/excited/sleepy) + 기본 이미지
  const FACE_MAP = { neutral: null, alert: "surprised", thinking: null, sad: "encourage" };
  const Hero = {
    get id() { return Storage.hero(); },
    face(state) {
      const id = Storage.hero();
      if (id === "poko") return `assets/characters/poko_${state}.png`;
      const st = state in FACE_MAP ? FACE_MAP[state] : state;
      return st ? `assets/characters/${id}_${st}.png` : `assets/characters/${id}.png`;
    },
    // 정적 이미지 표시용: 포코는 원본 비율, 다른 캐릭터는 정사각형 상자(contain)
    aspect(state, pokoRatio) { return Storage.hero() === "poko" ? pokoRatio : "1 / 1"; },
    // 모자를 쓴 모습은 오버레이가 아니라 캐릭터마다 실제로 쓴 그림(assets/characters/{hero}_hat_{hat}.png)을 쓴다 → 자연스러운 착용감
    wearing() { const d = Storage.load(); const hat = d.hats && d.hats.equipped; return hat ? `assets/characters/${Storage.hero()}_hat_${hat}.png` : null; },
    // 스프라이트 상자에 정적 그림을 넣는다 (모자 쓴 모습 등)
    showStatic(el, src, height) { Sprite.detach(el); el.classList.add("static"); el.style.backgroundImage = `url("${src}")`; el.style.backgroundSize = "contain"; el.style.backgroundPosition = "center bottom"; el.style.backgroundRepeat = "no-repeat"; el.style.aspectRatio = "1 / 1"; el.style.height = height; },
    // HUD 얼굴 이미지 위 모자 위치 (캐릭터마다 머리 위치가 다름) [left%, top%]
    HUD_HAT: { poko: [52, 12], bunny: [50, 7], squirrel: [40, 14], owl: [48, 12], dino: [50, 8], pig: [50, 5], sheep: [49, 5], tiger: [50, 6] },
    apply() {
      Sprite.hero = Storage.hero();
      Sprite.hat = (Storage.load().hats || {}).equipped || null;
      $("hud-poko").src = Hero.wearing() || Hero.face("neutral");
      document.querySelectorAll(".sprite[data-sprite]").forEach((el) => { if (!el._sprite) Sprite.detach(el); });
    },
  };

  // 모자: 오버레이 슬롯은 더 이상 쓰지 않는다(캐릭터별로 그려 넣은 착용 그림 사용). HUD 얼굴만 갱신
  function applyHat() {
    document.querySelectorAll(".hat-slot").forEach((el) => { el.hidden = true; });
    Sprite.hat = (Storage.load().hats || {}).equipped || null;
    $("hud-poko").src = Hero.wearing() || Hero.face("neutral");
  }
  let queue = [], sessionMode = "session", currentTask = null, forcedLevel = null, stageTask = null;
  let sessionCoins = 0, combo = 0, bestCombo = 0, sessionResults = [], missionCoinBase = 0;

  function show(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $(`screen-${name}`).classList.add("active");
    if (name === "home") Home.start(); else Home.stop();
    if (name !== "intro") Sprite.stop($("intro-poko"));
    if (name !== "reward") Sprite.stop($("reward-poko"));
    if (name !== "end") Sprite.stop($("end-poko"));
    if (name !== "shop") Sprite.stop($("shop-poko"));
    if (name !== "fail") Sprite.stop($("fail-poko"));
    if (name !== "rank") Rank.stop();
  }
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => { if (b.dataset.go === "home") renderHome(); show(b.dataset.go); }));

  // ---------- 입력 ----------
  const pressHandlers = new Set(), keyHandlers = new Set();
  document.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.key === "Escape" && $("screen-task").classList.contains("active")) { togglePause(); return; }
    if (paused) return;
    if (e.code === "Space") { e.preventDefault(); pressHandlers.forEach((h) => h()); }
    keyHandlers.forEach((h) => h(e));
  });
  $("stage").addEventListener("pointerdown", (e) => { if (!paused) pressHandlers.forEach((h) => h(e)); });
  const input = { on: (h) => pressHandlers.add(h), off: (h) => pressHandlers.delete(h), onKey: (h) => keyHandlers.add(h), offKey: (h) => keyHandlers.delete(h) };

  // ---------- HUD 포코 표정 / 콤보 ----------
  let pokoTimer = null;
  function pokoReact(state, ms = 900) {
    const el = $("hud-poko");
    el.src = Hero.face(state);
    el.classList.remove("react"); void el.offsetWidth; el.classList.add("react");
    clearTimeout(pokoTimer);
    pokoTimer = setTimeout(() => { el.src = Hero.wearing() || Hero.face("neutral"); }, ms);
  }
  function updateCombo() {
    const el = $("hud-combo");
    const mult = 1 + Math.min(2, Math.floor(combo / 5));
    el.textContent = combo >= 3 ? `🔥 ${combo}연속 ×${mult}` : "";
    el.classList.toggle("hot", combo >= 5);
    return mult;
  }

  // ---------- 일시정지 / 그만하기 ----------
  let paused = false, aborted = false, failed = false, pausedMs = 0, pauseStart = 0;
  const waits = new Set();
  class AbortError extends Error { constructor() { super("aborted"); this.name = "AbortError"; } }
  // 하트: 실수(부딪힘·오답)마다 하나씩 줄고 0이 되면 미션이 중단된다 → "무조건 완주"가 아니라 긴장감이 생긴다.
  //   나이대별: 6~8살 5개, 9~13살 4개, 14살+ 3개. 놓침(soft)은 하트를 깎지 않는다. 보호막 아이템이 막으면 유지.
  class FailError extends AbortError { constructor() { super(); this.name = "FailError"; } }
  let lives = 0, maxLives = 0;
  function livesFor() { const dbg = +(localStorage.getItem("poko_debug_lives") || 0); if (dbg) return dbg; const a = Adaptive.age || 9; return a >= 14 ? 3 : a <= 8 ? 5 : 4; }
  function renderLives() {
    $("hud-lives").innerHTML = Array.from({ length: maxLives }, (_, i) => `<i class="${i < lives ? "on" : "off"}"></i>`).join("");
  }
  function loseLife(el) {
    if (lives <= 0) return;
    lives--; renderLives();
    const hl = $("hud-lives"); hl.classList.remove("shake"); void hl.offsetWidth; hl.classList.add("shake");
    if (lives === 1) { const c = Fx.center(el); Fx.popup(c.x, c.y - 100, "하트 하나 남았어! 집중!", "bad"); }
    if (lives <= 0) failMission();
  }
  function failMission() {
    // 진행 중인 미션의 대기(wait)를 모두 끊고 실패 화면으로
    failed = true;
    for (const w of waits) { clearTimeout(w.timer); w.rej(new FailError()); }
    waits.clear();
    paused = false; Sprite.paused = false; Music.duck(false);
    $("screen-task").classList.remove("paused"); $("pause-overlay").hidden = true;
  }
  function wait(ms) {
    return new Promise((res, rej) => {
      const w = { remaining: ms, start: 0, timer: null, res, rej };
      w.arm = () => { w.start = performance.now(); w.timer = setTimeout(() => { waits.delete(w); res(); }, w.remaining); };
      waits.add(w);
      if (aborted) { waits.delete(w); rej(new AbortError()); return; }
      if (failed) { waits.delete(w); rej(new FailError()); return; }
      if (!paused) w.arm();
    });
  }
  const showQuitConfirm = (on) => { $("pause-main").hidden = on; $("pause-confirm").hidden = !on; };
  function togglePause() { if (paused) resumeGame(); else pauseGame(); }
  function pauseGame() {
    if (paused) return;
    showQuitConfirm(false);
    paused = true; pauseStart = performance.now(); Sprite.paused = true; Music.duck(true);
    for (const w of waits) { clearTimeout(w.timer); w.remaining -= performance.now() - w.start; }
    $("screen-task").classList.add("paused"); $("pause-overlay").hidden = false;
  }
  function resumeGame() {
    if (!paused) return;
    paused = false; pausedMs += performance.now() - pauseStart; Sprite.paused = false; Music.duck(false);
    $("screen-task").classList.remove("paused"); $("pause-overlay").hidden = true;
    for (const w of waits) w.arm();
  }
  function abortGame() {
    aborted = true;
    for (const w of waits) { clearTimeout(w.timer); w.rej(new AbortError()); }
    waits.clear();
    paused = false; Sprite.paused = false; Music.duck(false);
    $("screen-task").classList.remove("paused"); $("pause-overlay").hidden = true;
  }
  $("btn-pause").addEventListener("click", () => { Audio.unlock(); pauseGame(); });
  $("btn-resume").addEventListener("click", resumeGame);
  $("btn-quit").addEventListener("click", () => showQuitConfirm(true));
  $("btn-quit-no").addEventListener("click", () => showQuitConfirm(false));
  $("btn-quit-yes").addEventListener("click", () => { showQuitConfirm(false); abortGame(); });

  // ---------- 미션 컨텍스트 ----------
  const ctx = {
    stage: $("stage"), controls: $("task-controls"), input, wait,
    setProgress: (f) => { $("hud-progress").style.width = `${Math.round(f * 100)}%`; },
    hit(el, { msg = "", quiet = false, bonus = 0 } = {}) {
      combo++; bestCombo = Math.max(bestCombo, combo);
      const mult = updateCombo();
      const fx = StageFX.onHit(combo);
      const gain = ((quiet ? 1 : mult) + bonus) * fx.mult;
      sessionCoins += gain; $("hud-coins").textContent = sessionCoins;
      const c = Fx.center(el);
      if (fx.note) Fx.popup(c.x, c.y - 120, fx.note, "combo");
      if (quiet) { Audio.tick(); Fx.popup(c.x, c.y - 30, msg, "calm"); }
      else if (bonus >= 3) { Audio.gold(); Fx.coinFly(c.x, c.y); Fx.coinFly(c.x + 20, c.y - 10); Fx.popup(c.x, c.y - 50, `${msg} +${gain}`, "combo"); pokoReact("surprised", 1200); }
      else { Audio.correct(); Audio.coin(); Fx.coinFly(c.x, c.y); Fx.popup(c.x, c.y - 40, `${msg} +${gain}`, "good"); }
      if (combo === 10) { Fx.popup(c.x, c.y - 90, "콤보 ×3!!", "combo"); Audio.fanfare(); pokoReact("excited", 1400); }
      else if (combo === 5) { Fx.popup(c.x, c.y - 90, "콤보 ×2!", "combo"); Audio.fanfare(); pokoReact("proud", 1200); }
      else if (combo % 3 === 0) pokoReact("happy");
    },
    // soft=누락(부드럽게, 격려 표정) / 그 외 오경보·오답(놀람 표정)
    miss(el, { msg = "", soft = false } = {}) {
      const saved = StageFX.onMiss();
      if (saved) { const c0 = Fx.center(el); Fx.popup(c0.x, c0.y - 70, "🛡 보호막이 막았어!", "combo"); Audio.tick(); }
      else { combo = 0; updateCombo(); }
      const c = Fx.center(el);
      if (!soft) Audio.wrong();
      Fx.popup(c.x, c.y - 40, msg, soft ? "calm" : "bad");
      ctx.flash(soft ? "" : "bad");
      pokoReact(soft ? "encourage" : "surprised");
      if (!soft && !saved) loseLife(el);
    },
    between: () => StageFX.between(ctx),
    bonusCoins(n) { sessionCoins += n; $("hud-coins").textContent = sessionCoins; Audio.coin(); },
    flash(kind) { if (!kind) return; const el = $("feedback-flash"); el.className = `flash ${kind}`; setTimeout(() => { el.className = "flash"; }, 180); },
    async showMessage(title, sub, ms) {
      const m = document.createElement("div");
      m.className = "stage-msg overlay"; m.innerHTML = `${title}<small>${sub}</small>`;
      ctx.stage.appendChild(m); await ctx.wait(ms); m.remove();
    },
  };

  // ---------- 탐험대원 카드 (닉네임·나이) ----------
  const Profile = (() => {
    let after = null, age = null;
    function open(next) {
      after = next || null;
      const p = Storage.load().profile || {}; age = p.age || null;
      $("profile-title").textContent = p.name ? "탐험대원 카드" : "탐험대원 카드 만들기";
      $("profile-name").value = p.name || "";
      const AGES = [...[6, 7, 8, 9, 10, 11, 12, 13].map((a) => [a, `${a}살`]), [15, "14~17살"], [25, "어른"]];
      $("profile-ages").innerHTML = AGES.map(([a, label]) => `<button type="button" class="age-chip${a === age ? " on" : ""}" data-age="${a}">${label}</button>`).join("");
      $("profile-ages").querySelectorAll(".age-chip").forEach((b) => b.addEventListener("click", () => { age = +b.dataset.age; $("profile-ages").querySelectorAll(".age-chip").forEach((x) => x.classList.toggle("on", x === b)); Audio.tick(); }));
      const hasInviter = !!p.invitedBy;
      $("profile-invite-field").hidden = hasInviter;
      $("profile-invite").value = p.pendingInvite || "";
      $("profile-cost").innerHTML = p.name
        ? `이름을 바꾸면 <b>${Storage.RENAME_COST}코인</b>이 들어요 (보유 ${Storage.load().coins}코인). 나이는 언제든 무료로 고칠 수 있어요.${hasInviter ? `<br>💌 ${p.invitedBy}의 초대로 함께하고 있어요.` : ""}`
        : `첫 이름은 <b>무료</b>! 다음부터 바꿀 때는 ${Storage.RENAME_COST}코인이 들어요.`;
      $("profile-msg").textContent = "";
      show("profile");
      if (!p.name) setTimeout(() => $("profile-name").focus(), 300);
    }
    async function save() {
      const name = $("profile-name").value.trim().replace(/\s+/g, " ");
      const msg = $("profile-msg");
      if (!name) { msg.textContent = "이름을 지어 주세요!"; return; }
      if (name.length > 8) { msg.textContent = "이름은 8글자까지예요."; return; }
      if (!age) { msg.textContent = "나이를 골라 주세요!"; return; }
      const prev = Storage.load().profile || {};
      const res = Storage.setProfile({ name, age });
      if (!res.ok) { msg.textContent = `코인이 부족해요. 이름을 바꾸려면 ${Storage.RENAME_COST}코인이 필요해요.`; return; }
      Adaptive.age = age;
      if (age >= 14) Storage.bumpLevels(3); else Adaptive.speed = false;
      const invite = ($("profile-invite").value || "").trim().toUpperCase() || null;
      const btn = $("btn-profile-save"); btn.disabled = true; msg.textContent = "저장 중…";
      let note = res.paid ? `이름을 바꿨어요 (−${res.paid}코인)` : `${name} 탐험대원, 환영해요!`;
      try {
        const r = Online.registered ? await Online.update(name, age, invite) : await Online.register(name, age, invite);
        if (r && r.invited_by_name) note += ` 💌 ${r.invited_by_name}의 초대로 +${Online.INVITE_BONUS}코인!`;
        else if (invite && !prev.invitedBy) note += " (초대코드를 찾지 못했어요)";
      } catch (e) {
        note += " — 인터넷이 연결되면 랭킹에 자동 등록돼요.";
      }
      btn.disabled = false;
      Audio.jingle();
      renderHome();
      const n = $("home-notice"); n.textContent = note; n.hidden = false;
      show("home");
      if (after === "session") { after = null; $("btn-start-session").click(); }
    }
    $("btn-profile").addEventListener("click", () => { Audio.unlock(); open(); });
    $("btn-profile-menu").addEventListener("click", () => { Audio.unlock(); open(); });
    $("btn-profile-save").addEventListener("click", save);
    $("profile-name").addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
    return { open };
  })();

  // ---------- 이번 주 랭킹 + 친구 초대 ----------
  const Rank = (() => {
    let timer = null, data = null, tab = "all";
    const medal = (i) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
    function esc(t) { return String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
    function row(x, i) { return `<div class="rank-row${x.me ? " me" : ""}"><span class="rk">${medal(i)}</span><span class="nm">${esc(x.name)}${x.me ? " (나)" : ""}</span><span class="bd">${x.band}</span><span class="pt">${x.points}점</span><span class="st">⭐${x.stars}</span></div>`; }
    function renderList() {
      const el = $("rank-list");
      if (!data) return;
      if (tab === "stats") {
        const bands = ["6~8살", "9~10살", "11~13살"]; const st = data.band_stats || [];
        const maxAvg = Math.max(1, ...st.map((b) => b.avg_points || 0));
        el.innerHTML = `<div class="band-stats">${bands.map((b) => { const s = st.find((x) => x.band === b) || { players: 0, avg_points: 0, top: 0 };
          return `<div class="band-row${b === data.band ? " mine" : ""}"><div class="band-name">${b}${b === data.band ? " · 내 나이대" : ""}</div><div class="band-bar"><i style="width:${Math.round((s.avg_points || 0) / maxAvg * 100)}%"></i></div><div class="band-meta">${s.players}명 · 평균 ${s.avg_points || 0}점 · 최고 ${s.top || 0}점</div></div>`; }).join("")}</div>
          <p class="rank-hint">나이에 맞춰 놀이 속도가 조정되니, 같은 나이대끼리 비교하는 게 가장 공평해요.</p>`;
        return;
      }
      const list = tab === "all" ? data.all : tab === "band" ? data.band_list : data.friends;
      const empty = tab === "friends" ? "아직 함께하는 친구가 없어요. 아래 초대코드를 보내 보세요!" : "이번 주 첫 번째 탐험가가 되어 보세요!";
      el.innerHTML = list.length ? list.map(row).join("") : `<p class="rank-empty">${empty}</p>`;
    }
    function renderMe() {
      const p = Storage.load().profile || {};
      const my = data ? `<div class="me-card"><div><small>${esc(p.name || "")} · ${data.band}</small><b>${data.my_points}점</b></div>
        <div><small>전체 (${data.total}명)</small><b>${data.my_rank_all ? `${data.my_rank_all}위` : "-"}</b></div>
        <div><small>내 나이대 (${data.band_total}명)</small><b>${data.my_rank_band ? `${data.my_rank_band}위` : "-"}</b></div></div>` : "";
      $("rank-me").innerHTML = my;
      const o = p.online;
      $("invite-box").innerHTML = o ? `<div class="invite-card"><div><small>내 초대코드</small><b class="code">${o.code}</b><small>친구가 이 코드로 가입하면 둘 다 +${Online.INVITE_BONUS}코인 · 지금까지 ${p.invitedCount || 0}명</small></div><button class="btn btn-primary" id="btn-share">💌 친구에게 보내기</button></div>` : "";
      const sb = $("btn-share"); if (sb) sb.addEventListener("click", share);
    }
    async function share() {
      const p = Storage.load().profile || {};
      const r = await Online.share(p.name);
      const n = $("home-notice");
      n.textContent = r === "copied" ? "초대 링크를 복사했어요! 메시지로 붙여넣어 보내 주세요." : r === "shared" ? "초대를 보냈어요!" : `초대코드 ${(p.online || {}).code} 를 친구에게 알려 주세요.`;
      n.hidden = false;
      if ($("screen-rank").classList.contains("active")) { $("rank-updated").textContent = n.textContent; }
    }
    async function refresh() {
      if (!Online.registered) return;
      $("rank-updated").textContent = "불러오는 중…";
      try { data = await Online.rank(); renderMe(); renderList(); $("rank-updated").textContent = `${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준 · 30초마다 새로고침`; }
      catch (e) { $("rank-updated").textContent = "지금은 랭킹을 불러올 수 없어요. 인터넷 연결을 확인해 주세요."; if (!data) $("rank-list").innerHTML = ""; }
    }
    function open() {
      if (!Online.available) { const n = $("home-notice"); n.innerHTML = `랭킹·친구 초대는 정식 앱 주소에서 열려요 → <a href="${Online.SHARE_URL}" target="_blank" rel="noopener">tazan12.github.io/poko-focus-adventure</a>`; n.hidden = false; return; }
      if (!Online.registered) { Profile.open("rank"); return; }
      show("rank"); tab = "all";
      $("rank-tabs").querySelectorAll(".rank-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
      data = null; renderMe(); $("rank-list").innerHTML = "";
      Online.submit().then(refresh);
      clearInterval(timer); timer = setInterval(refresh, 30000);
    }
    function stop() { clearInterval(timer); timer = null; }
    $("rank-tabs").addEventListener("click", (e) => { const b = e.target.closest(".rank-tab"); if (!b) return; tab = b.dataset.tab; $("rank-tabs").querySelectorAll(".rank-tab").forEach((x) => x.classList.toggle("active", x === b)); renderList(); Audio.tick(); });
    $("btn-rank-refresh").addEventListener("click", refresh);
    $("btn-rank").addEventListener("click", () => { Audio.unlock(); open(); });
    $("btn-invite").addEventListener("click", () => { Audio.unlock(); if (!Online.available) { open(); return; } if (!Online.registered) { Profile.open(); return; } share(); });
    return { open, stop, share };
  })();

  // ---------- 홈 화면 ----------
  const Home = (() => {
    let raf = null, gestureTimer = null, parts = [], turn = 0;
    const canvas = $("home-fx");
    const idle = () => { const el = $("home-poko"); el.classList.remove("breathe", "hop", "static"); Sprite.play(el, "poko_idle", { fps: 4, charHeight: "var(--char-h)" }); };
    const IMG_W = 1344, IMG_H = 752, HILL_X = 1000 / IMG_W, HILL_Y = 508 / IMG_H;
    function layout() {
      const W = window.innerWidth, H = window.innerHeight;
      const portrait = H > W * 0.9;
      const zoom = portrait ? 1.7 : 1;
      const sw = Math.max(W, H * IMG_W / IMG_H) * zoom, sh = sw * IMG_H / IMG_W;
      // 세로 화면: 장면을 확대해 언덕이 타이틀 아래 빈 띠(45% 높이)에 오게 하고, 본문은 그 아래에서 시작 → 포코가 텍스트에 가리지 않음
      const tx = portrait ? W * 0.74 : W * 0.744, ty = portrait ? H * 0.45 : H * 0.675;
      const left = Math.min(0, Math.max(W - sw, tx - HILL_X * sw));
      const top = Math.min(0, Math.max(H - sh, ty - HILL_Y * sh));
      const sc = $("home-scene");
      sc.style.width = `${sw}px`; sc.style.height = `${sh}px`; sc.style.left = `${left}px`; sc.style.top = `${top}px`;
      sc.style.setProperty("--char-h", portrait ? "14%" : "33%");
      document.getElementById("screen-home").classList.toggle("portrait", portrait);
    }
    const relayout = () => { if ($("screen-home").classList.contains("active")) layout(); };
    window.addEventListener("resize", relayout);
    window.addEventListener("orientationchange", () => setTimeout(relayout, 150));
    if (window.visualViewport) window.visualViewport.addEventListener("resize", relayout);
    function start() {
      const poko = $("home-poko");
      Sprite.stop(poko); poko.style.transform = "";   // 점프 도중 떠났을 때 남은 변환값 제거 (싱크 틀어짐 방지)
      layout();
      requestAnimationFrame(layout);                  // 화면 전환 직후 뷰포트 크기가 확정된 뒤 한 번 더
      Music.play("home");
      idle();
      applyHat();
      clearInterval(gestureTimer);
      // 7초마다 점프와 손 흔들기를 번갈아 (다양한 제스처)
      gestureTimer = setInterval(() => {
        const poko = $("home-poko");
        if (turn++ % 2 === 0) Sprite.play(poko, "poko_jump", { fps: 12, loop: false, charHeight: "var(--char-h)", arc: 40, onEnd: idle });
        else { Sprite.play(poko, "poko_wave", { fps: 4, charHeight: "var(--char-h)" }); setTimeout(idle, 2600); }
      }, 7000);
      const c2 = canvas.getContext("2d");
      const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
      resize();
      parts = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), r: 1.5 + Math.random() * 2.5, s: 0.00008 + Math.random() * 0.00012, p: Math.random() * Math.PI * 2, a: 0.3 + Math.random() * 0.6 }));
      let last = performance.now();
      const frame = (t) => {
        const dt = Math.min(50, t - last); last = t;
        if (canvas.width !== canvas.offsetWidth) resize();
        const W = canvas.width, H = canvas.height;
        c2.clearRect(0, 0, W, H);
        for (const q of parts) {
          q.p += dt * 0.0015; q.y -= q.s * dt; q.x += Math.sin(q.p) * 0.00015 * dt;
          if (q.y < -0.05) { q.y = 1.05; q.x = Math.random(); }
          const alpha = q.a * (0.55 + 0.45 * Math.sin(q.p * 1.3));
          const g = c2.createRadialGradient(q.x * W, q.y * H, 0, q.x * W, q.y * H, q.r * 4);
          g.addColorStop(0, `rgba(255, 240, 160, ${alpha})`); g.addColorStop(1, "rgba(255, 240, 160, 0)");
          c2.fillStyle = g; c2.beginPath(); c2.arc(q.x * W, q.y * H, q.r * 4, 0, Math.PI * 2); c2.fill();
        }
        raf = requestAnimationFrame(frame);
      };
      cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    }
    function stop() { cancelAnimationFrame(raf); raf = null; clearInterval(gestureTimer); Sprite.stop($("home-poko")); }
    return { start, stop };
  })();

  function renderHome() {
    const d = Storage.load();
    $("home-notice").hidden = true;
    const pf = d.profile || {};
    $("profile-chip-text").textContent = pf.name ? `${pf.name} · ${pf.age}살` : "이름 짓기 (무료)";
    $("btn-profile").classList.toggle("empty", !pf.name);
    $("home-subtitle").textContent = pf.name ? `${pf.name} 탐험대원, 오늘도 별을 모으러 가자!` : "집중의 힘으로 사라진 별을 되찾자!";
    $("btn-report").textContent = Adaptive.grown ? "📊 내 기록" : "📊 보호자 리포트";
    document.querySelector("#screen-report h2").textContent = Adaptive.grown ? "내 기록 리포트" : "보호자 리포트";
    document.querySelector(".disclaimer").textContent = Adaptive.grown ? "하루 45분 이내로 가볍게 즐기는 걸 추천해요. 스피드 도전으로 코인을 2배로!" : "보호자와 함께 하루 25분 이내로 즐기는 걸 추천해요. 매일 조금씩이 가장 좋아요!";
    const mins = Math.round(Storage.todaySeconds() / 60);
    const totalStars = Object.values(d.stages || {}).reduce((a, w) => a + Object.values(w).reduce((x, y) => x + y, 0), 0);
    $("home-stats").innerHTML = `
      <span class="chip"><img src="assets/characters/coin.png" alt="">${d.coins}</span>
      <span class="chip">⭐ ${totalStars}/${Object.keys(TASKS).length * MAX_STAGE * 3}</span>
      <span class="chip">⏱ ${mins}/${DAILY_CAP_MIN()}분</span>
      <span class="chip">📅 ${d.sessions.length}일째</span>
      ${Storage.streak() >= 2 ? `<span class="chip hot">🔥 ${Storage.streak()}일 연속</span>` : ""}`;
    const ch = todayChallenge();
    const done = d.challenges && d.challenges[Storage.today()];
    $("home-challenge").innerHTML = `<img src="${ch.icon}" alt=""><div><small>오늘의 도전${done ? " · 달성 ✔" : ""}</small><b>${ch.text}</b><span>+${ch.bonus} 코인</span></div>`;
    $("home-challenge").classList.toggle("done", !!done);
    $("home-today").innerHTML = `<small>오늘의 탐험 코스</small>` + sessionOrder().map((id) => `<img src="${TASKS[id].icon}" title="${TASKS[id].world}" alt="">`).join("");
    $("home-stickers").innerHTML = Object.values(TASKS).map((t, i) =>
      `<img class="sticker ${d.stickers && d.stickers[t.id] ? "" : "locked"}" style="--i:${i}" src="${t.sticker}" title="${t.world}" alt="">`).join("");
    const panel = $("home-panel");
    panel.classList.remove("enter"); void panel.offsetWidth; panel.classList.add("enter");
  }

  $("btn-start-session").addEventListener("click", () => {
    Audio.unlock(); Audio.jingle();
    if (!(Storage.load().profile || {}).name) { Profile.open("session"); return; }
    if (Storage.todaySeconds() >= DAILY_CAP_SEC) { const n = $("home-notice"); n.textContent = `오늘 놀이 시간(${DAILY_CAP_MIN()}분)을 다 채웠어요! 내일 다시 만나요 🌙`; n.hidden = false; return; }
    sessionMode = "session"; queue = sessionOrder(); sessionCoins = 0; sessionResults = []; forcedLevel = null;
    startNextMission();
  });

  // ---------- 세계 선택 → 스테이지 지도 ----------
  $("btn-free-play").addEventListener("click", () => { Audio.unlock(); renderWorlds(); show("select"); });

  // ---------- 상점: 포코 꾸미기 ----------
  function renderShop() {
    const d = Storage.load(); const h = d.hats || { owned: [], equipped: null };
    Sprite.hat = h.equipped || null; // 미리보기 시트가 방금 고른 모자를 쓰도록 먼저 반영
    $("shop-coins").textContent = d.coins;
    const pv = $("shop-poko"); pv.classList.remove("static");
    if (!pv._sprite || pv.dataset.sprite !== Sprite.resolve("poko_idle")) { Sprite.detach(pv); Sprite.play(pv, "poko_idle", { fps: 4, charHeight: "140px" }); }
    const eqName = h.equipped ? HATS.find((x) => x.id === h.equipped).name : null;
    const heroName = HEROES.find((x) => x.id === Storage.hero()).name;
    $("shop-preview-text").textContent = `${heroName}${eqName ? ` · ${eqName} 착용 중!` : " (모자를 골라 보세요)"}`;
    const hs = d.heroes || { owned: ["poko"], selected: "poko" };
    $("hero-grid").innerHTML = HEROES.map((x, i) => {
      const owned = hs.owned.includes(x.id) || d.tester, sel = hs.selected === x.id;
      return `<button class="hat-card hero-card ${sel ? "equipped" : ""} ${!owned && d.coins < x.price ? "poor" : ""}" data-hero="${x.id}" style="--i:${i}">
        <img src="assets/characters/${x.id === "poko" ? "poko_happy" : x.id}.png" alt=""><b>${x.name}</b><small>${x.desc}</small>
        <span>${sel ? "함께 모험 중" : owned ? "고르기" : `🪙 ${x.price}`}</span></button>`; }).join("");
    $("hero-grid").querySelectorAll(".hero-card").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.hero; const dd = Storage.load(); const hero = HEROES.find((x) => x.id === id);
      if (dd.heroes.owned.includes(id) || dd.tester) { Storage.selectHero(id); Audio.jingle(); }
      else if (Storage.buyHero(id, hero.price)) { Audio.fanfare(); Fx.confetti($("shop-confetti")); }
      else { Audio.wrong(); $("shop-msg").textContent = `코인이 ${hero.price - dd.coins}개 더 필요해요. 미션에서 모아 보자!`; setTimeout(() => { $("shop-msg").textContent = ""; }, 2500); return; }
      Hero.apply(); renderShop(); applyHat();
    }));
    $("shop-grid").innerHTML = HATS.map((x, i) => {
      const owned = h.owned.includes(x.id), eq = h.equipped === x.id;
      return `<button class="hat-card ${eq ? "equipped" : ""} ${!owned && d.coins < x.price ? "poor" : ""}" data-id="${x.id}" style="--i:${i}">
        <img src="assets/hats/${x.id}.png" alt=""><b>${x.name}</b>
        <span>${eq ? "착용 중" : owned ? "착용하기" : `🪙 ${x.price}`}</span></button>`; }).join("") +
      `<button class="hat-card ${!h.equipped ? "equipped" : ""}" data-id=""><div class="hat-none">🚫</div><b>모자 벗기</b><span>${!h.equipped ? "착용 중" : "선택"}</span></button>`;
    $("shop-grid").querySelectorAll(".hat-card").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.id; const dd = Storage.load(); const hh = dd.hats || { owned: [], equipped: null };
      if (!id) { Storage.equipHat(null); }
      else if (hh.owned.includes(id)) { Storage.equipHat(id); Audio.tick(); }
      else { const hat = HATS.find((x) => x.id === id); if (Storage.buyHat(id, hat.price)) { Audio.fanfare(); Fx.confetti($("shop-confetti")); } else { Audio.wrong(); $("shop-msg").textContent = `코인이 ${hat.price - dd.coins}개 더 필요해요. 미션에서 모아 보자!`; setTimeout(() => { $("shop-msg").textContent = ""; }, 2500); } }
      renderShop(); applyHat();
    }));
  }
  $("btn-shop").addEventListener("click", () => { Audio.unlock(); renderShop(); applyHat(); show("shop"); });
  function renderWorlds() {
    const d = Storage.load();
    const grid = $("world-cards");
    grid.innerHTML = Object.values(TASKS).map((t, i) => {
      const st = (d.stages || {})[t.id] || {};
      const stars = Object.values(st).reduce((a, b) => a + b, 0);
      return `
      <button class="world-card" data-task="${t.id}" style="--i:${i}">
        <div class="wc-bg" style="background-image:url('${t.bg}')"></div>
        <img class="wc-icon" src="${t.icon}" alt="">
        ${d.stickers && d.stickers[t.id] ? `<img class="wc-sticker" src="${t.sticker}" alt="">` : ""}
        ${["trail", "headcount", "balloons", "calc", "melody"].includes(t.id) && !((d.stages || {})[t.id] && Object.keys(d.stages[t.id]).length) ? `<span class="wc-new">NEW</span>` : ""}
        <div class="wc-body">
          <small>${t.world} · ${t.short}</small>
          <h3>${t.name}</h3>
          <p>${t.desc}</p>
          <div class="wc-foot"><span class="lv">스테이지 ${Storage.maxUnlocked(t.id)}/${MAX_STAGE}</span><span class="wc-stars">⭐ ${stars}/${MAX_STAGE * 3}</span></div>
        </div>
      </button>`; }).join("");
    grid.querySelectorAll(".world-card").forEach((c) => c.addEventListener("click", () => openStages(c.dataset.task)));
  }

  function openStages(taskId) {
    stageTask = TASKS[taskId];
    const unlocked = Storage.maxUnlocked(taskId);
    $("screen-stages").style.backgroundImage = `url('${stageTask.bg}')`;
    $("stages-title").textContent = `${stageTask.world} · ${stageTask.name}`;
    $("stages-sub").textContent = stageTask.short;
    // 뱀 모양 경로: 1행(1~5) 왼→오, 2행(6~10) 오→왼
    const pts = Array.from({ length: MAX_STAGE }, (_, i) => {
      const row = Math.floor(i / 5), col = i % 5;
      const x = 10 + (row === 0 ? col : 4 - col) * 20;
      const y = row === 0 ? 30 : 72;
      return { x, y: y + (col % 2 ? -6 : 6) * (row === 0 ? 1 : -1) };
    });
    const path = pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
    const donePath = pts.slice(0, Math.min(unlocked, MAX_STAGE)).map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
    $("stage-map").innerHTML = `
      <svg class="stage-path" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${path}" class="rail"/><path d="${donePath}" class="rail done"/></svg>
      ${pts.map((p, i) => {
        const lv = i + 1, stars = Storage.stageStars(taskId, lv), locked = lv > unlocked, current = lv === unlocked;
        return `<button class="stage-node ${locked ? "locked" : ""} ${current ? "current" : ""} ${stars === 3 ? "perfect" : ""}" style="left:${p.x}%;top:${p.y}%;--i:${i}" data-level="${lv}" ${locked ? "disabled" : ""}>
          <span class="num">${lv === MAX_STAGE ? "👑" : lv}</span>
          <span class="stars">${locked ? "🔒" : "★".repeat(stars) + "<i>" + "★".repeat(3 - stars) + "</i>"}</span>
        </button>`; }).join("")}`;
    $("stage-map").querySelectorAll(".stage-node:not(.locked)").forEach((b) => b.addEventListener("click", () => {
      Audio.unlock(); sessionMode = "free"; queue = [taskId]; forcedLevel = +b.dataset.level; sessionCoins = 0; sessionResults = [];
      startNextMission();
    }));
    const tip = unlocked === MAX_STAGE ? "마지막 스테이지까지 열렸어! 별 3개를 다 모아 보자." : `스테이지 ${unlocked}에서 별 2개 이상을 받으면 다음 스테이지가 열려.`;
    $("stages-tip").textContent = tip;
    // 14살 이상: 재미 위주 — 스피드 도전(시간 창 75%, 코인 2배) 토글
    let sp = $("stage-speed");
    if (!sp) { sp = document.createElement("button"); sp.id = "stage-speed"; sp.className = "btn btn-glass stage-speed"; document.querySelector(".stages-guide").appendChild(sp); sp.addEventListener("click", () => { Adaptive.speed = !Adaptive.speed; Audio.tick(); openStages(stageTask.id); }); }
    sp.hidden = !Adaptive.grown;
    sp.classList.toggle("on", Adaptive.speed);
    sp.innerHTML = Adaptive.speed ? "⚡ 스피드 도전 켜짐 · 코인 2배 <small>(끄기)</small>" : "⚡ 스피드 도전 <small>시간 창 75% · 코인 2배</small>";
    $("stages-poko").src = unlocked >= 5 ? Hero.face("excited") : Hero.face("thinking");
    show("stages");
  }
  $("btn-stages-back").addEventListener("click", () => { renderWorlds(); show("select"); });

  // ---------- 미션 안내 → 진행 ----------
  function levelFor(task) {
    // 세션: 적응형 레벨(해금 범위 내) / 스테이지 선택: 지정 레벨
    if (forcedLevel) return forcedLevel;
    return Math.min(Storage.getLevel(task.id), Storage.maxUnlocked(task.id));
  }
  function startNextMission() {
    if (!queue.length) { endSession(); return; }
    currentTask = TASKS[queue.shift()];
    const level = levelFor(currentTask);
    const info = currentTask.intro(level);
    $("screen-intro").style.backgroundImage = `url('${currentTask.bg}')`;
    $("intro-world").textContent = `${currentTask.world} · 스테이지 ${level}`;
    $("intro-title").textContent = info.title;
    $("intro-story").textContent = currentTask.story;
    $("intro-desc").innerHTML = info.desc;
    $("intro-demo").innerHTML = info.demo;
    $("intro-level").textContent = level;
    const u = StageFX.UNLOCKS[level];
    const feats = Object.keys(StageFX.UNLOCKS).filter((l) => +l <= level && +l > 1).map((l) => `<span class="${+l === level ? "new" : ""}">${StageFX.UNLOCKS[l].icon} ${StageFX.UNLOCKS[l].name}</span>`).join("");
    const goal = StageFX.GOALS[level];
    $("intro-stage").innerHTML = `<b>${u.icon} 스테이지 ${level} · ${u.name}</b><p>${u.desc}</p><p class="goal-line">🎯 이번 목표: <b>${goal.text}</b> <span>+20 코인</span></p>${feats ? `<div class="feat-list">${feats}</div>` : ""}`;
    show("intro");
    { const ip = $("intro-poko"); Sprite.detach(ip); ip.classList.remove("static"); Sprite.play(ip, "poko_wave", { fps: 3, charHeight: "150px" }); }
    applyHat();
  }

  $("btn-intro-go").addEventListener("click", async () => {
    Audio.unlock();
    const level = levelFor(currentTask);
    Music.play(currentTask.id, level);
    $("hud-mission").textContent = `${currentTask.name} · ${level}`;
    $("hud-coins").textContent = sessionCoins;
    missionCoinBase = sessionCoins;
    $("screen-task").style.backgroundImage = `url('${currentTask.bg}')`;
    combo = 0; bestCombo = 0; updateCombo();
    aborted = false; failed = false; pausedMs = 0;
    maxLives = livesFor(); lives = maxLives; renderLives();
    ctx.setProgress(0);
    show("task");
    ctx.controls.innerHTML = "";
    const t0 = performance.now();
    Adaptive.quick = !!Storage.load().tester;
    const lp = Adaptive.tune(currentTask.levelParams(level));
    const totalTrials = currentTask.id === "gonogo" ? (lp.quick ? 20 : 60) : currentTask.id === "cpt" ? Math.round((lp.sec * 1000) / (lp.stim + lp.isi)) : lp.trials;
    StageFX.begin(currentTask, level, totalTrials); StageFX.updateItems();
    try {
      for (const n of [3, 2, 1]) { ctx.stage.innerHTML = `<div class="countdown">${n}</div>`; Audio.tick(); await ctx.wait(700); }
      const result = await currentTask.run(ctx, level);
      result.fx = StageFX.end();
      result.test = Adaptive.quick;
      result.durationSec = Math.round((performance.now() - t0 - pausedMs) / 1000);
      result.date = new Date().toISOString();
      result.bestCombo = bestCombo;
      finishMission(result);
    } catch (e) {
      if (!(e instanceof AbortError)) throw e;
      StageFX.end();
      pressHandlers.clear(); keyHandlers.clear(); Sprite.stopAll();
      ctx.stage.innerHTML = ""; ctx.controls.innerHTML = "";
      Storage.addDailySeconds(Math.round((performance.now() - t0 - pausedMs) / 1000));
      if (e instanceof FailError) { showFail(level, Math.round((performance.now() - t0 - pausedMs) / 1000)); return; }
      queue = []; forcedLevel = null;
      renderHome(); show("home");
    }
  });

  // ---------- 실패 화면 ----------
  // 하트가 다 떨어지면: 이 미션의 코인은 절반만 남고, 별·스티커·목표 보너스는 없다. 세션 적응 레벨은 한 단계 내려간다.
  function showFail(level, durationSec) {
    const earned = Math.max(0, sessionCoins - missionCoinBase);
    const keep = Math.floor(earned / 2);
    sessionCoins = missionCoinBase + keep; Storage.addCoins(keep);
    if (!forcedLevel) Storage.setLevel(currentTask.id, Math.max(1, level - 1));
    Storage.addMissionResult({ task: currentTask.id, level, failed: true, accuracy: 0, metrics: {}, trials: 0, durationSec, date: new Date().toISOString(), test: Adaptive.quick });
    const fp = $("fail-poko"); Sprite.detach(fp); fp.className = "poko sprite-box";
    if (Hero.wearing()) Sprite.play(fp, "poko_idle", { fps: 3, charHeight: "170px" });
    else { fp.classList.add("static"); fp.style.backgroundImage = `url("${Hero.face("sad")}")`; fp.style.aspectRatio = Hero.aspect("sad", "1 / 1"); fp.style.height = "170px"; }
    $("fail-title").textContent = ["앗, 하트가 다 떨어졌어!", "심술이한테 잡혔어…", "이번엔 여기까지!"][Math.floor(Math.random() * 3)];
    $("fail-msg").innerHTML = `${currentTask.world} 스테이지 ${level}은(는) 다음에 다시 도전하자.<br>실수해도 괜찮아 — 조금만 더 집중하면 돼!`;
    $("fail-stats").innerHTML = [`모은 코인 ${keep}개 (절반)`, `최고 콤보 ${bestCombo}`].map((x) => `<span class="chip">${x}</span>`).join("");
    Audio.wrong();
    show("fail");
    Music.play("home");
  }
  $("btn-fail-retry").addEventListener("click", () => {
    Audio.unlock(); sessionMode = "free"; queue = [currentTask.id]; forcedLevel = forcedLevel || levelFor(currentTask); sessionCoins = 0; sessionResults = [];
    startNextMission();
  });
  $("btn-fail-map").addEventListener("click", () => { queue = []; forcedLevel = null; if (currentTask) openStages(currentTask.id); else { renderHome(); show("home"); } });

  // ---------- 보상 ----------
  function finishMission(r) {
    const stars = Adaptive.stars(r.accuracy);
    const prevUnlocked = Storage.maxUnlocked(r.task);
    Storage.recordStage(r.task, r.level, stars);
    const nowUnlocked = Storage.maxUnlocked(r.task);
    // 세션의 적응형 레벨은 해금 범위 안에서만 움직인다
    const newLevel = Math.min(Adaptive.next(r.level, r.accuracy), nowUnlocked);
    r.newLevel = newLevel; r.stars = stars;
    if (!forcedLevel) Storage.setLevel(r.task, newLevel);
    Storage.addStars(stars);
    let earned = Math.max(0, sessionCoins - missionCoinBase);
    if (Adaptive.speed) { earned *= 2; sessionCoins += earned / 2; r.speed = true; }
    Storage.addCoins(earned);
    Storage.addDailySeconds(r.durationSec);
    if (Adaptive.age) { r.age = Adaptive.age; r.ageBand = Online.ageBand(Adaptive.age); }
    Storage.addMissionResult(r);
    sessionResults.push(r);
    const newSticker = stars >= 2 && Storage.unlockSticker(r.task);
    const unlockedNew = nowUnlocked > prevUnlocked;
    const boss = r.fx && r.fx.boss;
    const newBadge = boss && boss.win && boss.kind === "king" && Storage.unlockBadge(r.task);
    const goal = StageFX.GOALS[r.level]; const goalOk = goal && goal.check(r);
    if (goalOk) { Storage.addCoins(20); sessionCoins += 20; }
    // 주간 탐험 점수: 별×20 + 이 미션에서 번 코인(목표 보너스 포함) → 랭킹 서버로
    Storage.addWeekly(Online.weekKey(), stars * 20 + earned + (goalOk ? 20 : 0), stars);
    Online.submit();

    Audio.fanfare();
    const stageMsg = unlockedNew ? `🔓 스테이지 ${nowUnlocked}이(가) 열렸어요!`
      : stars >= 2 ? (r.level === MAX_STAGE ? "마지막 스테이지 클리어! 별 3개에 도전해 봐요." : "다음 스테이지는 이미 열려 있어요.")
      : "별 2개 이상이면 다음 스테이지가 열려요. 한 번 더 해볼까?";
    const encouragement = r.accuracy >= 0.9 ? "완벽해! 정말 집중 잘했어!" : r.accuracy >= 0.75 ? "좋아, 점점 나아지고 있어!" : "끝까지 해낸 게 제일 중요해!";

    const rp = $("reward-poko");
    Sprite.detach(rp); rp.className = "poko sprite-box";
    if (Hero.wearing()) Sprite.play(rp, stars >= 2 ? "poko_dance" : "poko_idle", { fps: 5, charHeight: "190px", arc: stars === 3 ? 12 : 0 });
    else if (stars === 3 || (boss && boss.win)) Sprite.play(rp, "poko_dance", { fps: 5, charHeight: "190px" });
    else if (stars === 2) { rp.classList.add("static"); rp.style.backgroundImage = `url("${Hero.face("proud")}")`; rp.style.aspectRatio = Hero.aspect("proud", "361/512"); rp.style.height = "190px"; }
    else { rp.classList.add("static"); rp.style.backgroundImage = `url("${Hero.face("encourage")}")`; rp.style.aspectRatio = Hero.aspect("encourage", "508/512"); rp.style.height = "190px"; }
    applyHat();
    $("reward-title").textContent = `${currentTask.world} 스테이지 ${r.level} ${stars >= 2 ? "클리어!" : "완주!"}`;
    $("reward-msg").innerHTML = `${encouragement}<br>${stageMsg}`;
    $("reward-stars").innerHTML = Array.from({ length: 3 }, (_, i) => `<img class="${i < stars ? "" : "dim"}" src="assets/characters/coin.png" alt="⭐">`).join("");
    $("reward-stats").innerHTML = [...currentTask.summary(r), `최고 콤보 ${bestCombo}`, ...(r.speed ? ["⚡ 스피드 도전 코인 2배"] : [])].map((s) => `<span class="chip">${s}</span>`).join("");
    const bossMsg = boss ? (boss.win ? (boss.kind === "king" ? "👑 심술이 대왕을 물리쳤다! 이 세계의 별빛이 돌아왔어!" : "👺 심술이 대장을 물리쳤어!") : "심술이가 도망갔어… 다음엔 꼭 물리치자!") : "";
    $("reward-boss").innerHTML = (goal ? `<div class="goal-result ${goalOk ? "ok" : ""}">🎯 ${goal.text} — ${goalOk ? "달성! +20 코인" : "다음에 도전"}</div>` : "") + (bossMsg ? `<div class="boss-result ${boss.win ? "win" : ""}">${bossMsg}</div>` : "");
    $("reward-sticker").innerHTML = (newBadge ? `<img src="assets/stickers/boss.png" alt=""><span>보스 배지 획득!</span>` : "") + (newSticker ? `<img src="${currentTask.sticker}" alt=""><span>NEW 스티커!</span>` : "");
    $("btn-reward-next").textContent = queue.length ? "다음 세계로" : (sessionMode === "free" ? "스테이지 지도로" : "탐험 마무리");
    show("reward");
    Music.play("home");
    Fx.confetti($("confetti"));
  }

  $("btn-reward-next").addEventListener("click", () => {
    if (sessionMode === "free") { forcedLevel = null; openStages(currentTask.id); return; }
    if (Storage.todaySeconds() >= DAILY_CAP_SEC) queue = [];
    startNextMission();
  });

  function endSession() {
    const ch = todayChallenge();
    let bonusMsg = "";
    const d0 = Storage.load();
    if (!(d0.challenges && d0.challenges[Storage.today()]) && ch.check(sessionResults)) {
      Storage.completeChallenge(Storage.today());
      Storage.addCoins(ch.bonus);
      bonusMsg = `<div class="challenge-clear"><img src="${ch.icon}" alt="">오늘의 도전 성공! <b>+${ch.bonus} 코인</b></div>`;
      Audio.gold();
    }
    const streak = Storage.streak();
    if ([3, 7, 14, 30].includes(streak) && !(d0.streakPaid && d0.streakPaid[Storage.today()])) {
      const bonus = { 3: 30, 7: 100, 14: 200, 30: 500 }[streak];
      Storage.addCoins(bonus); const dd = Storage.load(); dd.streakPaid = dd.streakPaid || {}; dd.streakPaid[Storage.today()] = true; Storage.save(dd);
      bonusMsg += `<div class="challenge-clear">🔥 ${streak}일 연속 출석! <b>+${bonus} 코인</b></div>`;
    }
    const d = Storage.load();
    const doneToday = new Set(sessionResults.map((r) => r.task));
    const sleepy = Storage.todaySeconds() >= DAILY_CAP_SEC;
    $("end-msg").innerHTML = `오늘 코인 ${sessionCoins}개를 모았어요!<br>별 ${d.stars}개가 지도를 밝히고 있어요.${bonusMsg}${sleepy ? "<br><small>오늘 훈련은 여기까지! 내일 또 만나요 🌙</small>" : ""}`;
    $("starmap").innerHTML = Object.values(TASKS).map((t, i) => `
      <div class="region ${doneToday.has(t.id) ? "lit" : ""}" style="background-image:url('${t.bg}');--i:${i}"><span>${t.world}</span></div>`).join("");
    const ep = $("end-poko");
    Sprite.detach(ep); ep.className = "poko sprite-box";
    if (Hero.wearing()) Sprite.play(ep, "poko_dance", { fps: 5, charHeight: "170px" });
    else if (sleepy) { ep.classList.add("static"); ep.style.backgroundImage = `url("${Hero.face("sleepy")}")`; ep.style.aspectRatio = Hero.aspect("sleepy", "433/512"); ep.style.height = "170px"; }
    else Sprite.play(ep, "poko_dance", { fps: 5, charHeight: "170px" });
    applyHat();
    show("end");
  }

  // ---------- 보호자 리포트 ----------
  const METRIC_LABELS = {
    gonogo: [["omissionRate", "놓친 별별이", "%"], ["commissionRate", "심술이 건드림", "%"], ["meanRT", "반응 속도", "ms"], ["rtSD", "반응 들쭉날쭉", "ms"]],
    cpt: [["omissionRate", "놓친 별", "%"], ["commissionRate", "잘못 잡음", "%"], ["rtSD", "반응 들쭉날쭉", "ms"], ["vigilanceDecrement", "후반에 놓침 ↑", "회"]],
    nback: [["n", "기억 칸", ""], ["hitRate", "기억 성공", "%"], ["falseAlarms", "헷갈림", "회"]],
    search: [["setSize", "친구 수", "개"], ["meanRT", "찾는 속도", "ms"], ["wrongTaps", "잘못 터치", "회"], ["timeouts", "못 찾음", "회"]],
    flanker: [["flankerEffect", "속임수 버티기", "ms"], ["incongruentAccuracy", "속임수일 때 정답", "%"], ["timeouts", "시간 초과", "회"]],
    switch: [["switchAccuracy", "규칙 바뀐 직후 정답", "%"], ["switchCost", "규칙 바꾸기", "ms"], ["perseverative", "옛 규칙 고집", "회"]],
    stroop: [["interference", "함정 버티기", "ms"], ["incongruentAccuracy", "함정일 때 정답", "%"], ["timeouts", "시간 초과", "회"]],
    trail: [["meanPerItem", "등불당 시간", "ms"], ["errors", "순서 실수", "회"], ["completed", "완성 라운드", "회"]],
    headcount: [["meanAbsError", "평균 오차", "명"], ["moves", "이동 횟수", "번"], ["meanRT", "대답 속도", "ms"]],
    balloons: [["span", "풍선 수", "개"], ["meanReached", "평균 성공", "개"], ["perfectRounds", "완벽 라운드", "회"]],
    calc: [["meanRT", "계산 속도", "ms"], ["timeouts", "시간 초과", "회"], ["range", "숫자 범위", ""]],
    melody: [["span", "최고 기억 길이", "음"], ["perfectRounds", "완성 라운드", "회"], ["bells", "종 수", "개"]],
  };
  const fmt = (v, unit) => unit === "%" ? `${Math.round(v * 100)}%` : `${v}${unit}`;

  // ---------- 리포트 그래픽 (인라인 SVG, 단일 계열·단일 색조) ----------
  const svgRadar = (items) => {
    const n = items.length, cx = 120, cy = 120, R = 82;
    const pt = (i, v) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
    const rings = [0.25, 0.5, 0.75, 1].map((r) => `<polygon points="${items.map((_, i) => pt(i, r).join(",")).join(" ")}" class="ring"/>`).join("");
    const spokes = items.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="ring"/>`; }).join("");
    const poly = items.map((it, i) => pt(i, it.v).join(",")).join(" ");
    const dots = items.map((it, i) => { const [x, y] = pt(i, it.v); return `<circle cx="${x}" cy="${y}" r="4" class="dot"><title>${it.label}: ${Math.round(it.v * 100)}%</title></circle>`; }).join("");
    const labels = items.map((it, i) => { const [x, y] = pt(i, 1.28); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${it.label}</text>`; }).join("");
    return `<svg class="radar" viewBox="0 0 240 240" role="img" aria-label="힘 레이더">${rings}${spokes}<polygon points="${poly}" class="area"/>${dots}${labels}</svg>`;
  };
  const svgLine = (vals, labelsArr) => {
    const W = 260, H = 70, pad = 6, n = vals.length;
    if (n < 1) return "";
    const x = (i) => n === 1 ? W / 2 : pad + (i / (n - 1)) * (W - pad * 2), y = (v) => H - pad - v * (H - pad * 2);
    const path = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
    const area = `${path} L${x(n - 1).toFixed(1)} ${H - pad} L${x(0).toFixed(1)} ${H - pad} Z`;
    const dots = vals.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${i === n - 1 ? 5 : 3.5}" class="${i === n - 1 ? "dot end" : "dot"}"><title>${labelsArr[i]}: ${Math.round(v * 100)}%</title></circle>`).join("");
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="정확도 추세"><line x1="${pad}" y1="${y(0.75)}" x2="${W - pad}" y2="${y(0.75)}" class="guide"/><path d="${area}" class="area"/><path d="${path}" class="line"/>${dots}</svg>`;
  };
  const starStrip = (taskId) => `<div class="star-strip">${Array.from({ length: MAX_STAGE }, (_, i) => { const st = Storage.stageStars(taskId, i + 1); return `<span class="s${st}" title="스테이지 ${i + 1}: 별 ${st}개">${i + 1}</span>`; }).join("")}</div>`;
  const heatmap = (daily) => {
    const cells = []; const d = new Date(); d.setDate(d.getDate() - 27);
    const steps = ["#eef3f7", "#bfe6e8", "#7fd0d4", "#3fb3b9", "#1f8b91"];
    for (let i = 0; i < 28; i++) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const min = Math.round((daily[k] || 0) / 60); const lv = min === 0 ? 0 : min < 5 ? 1 : min < 12 ? 2 : min < 20 ? 3 : 4;
      cells.push(`<span style="background:${steps[lv]}" title="${k}: ${min}분"></span>`); d.setDate(d.getDate() + 1);
    }
    return `<div class="heat"><div class="heat-grid">${cells.join("")}</div><div class="heat-legend">적음 ${steps.map((c) => `<i style="background:${c}"></i>`).join("")} 많음</div></div>`;
  };

  function renderReport() {
    // 하트 소진으로 중단된 미션은 지표 집계에서 뺀다 (기록 수에는 포함)
    const d = Storage.load();
    const allRaw = d.sessions.flatMap((s) => s.missions).filter((m) => !m.test);
    const failedN = allRaw.filter((m) => m.failed).length;
    const all = allRaw.filter((m) => !m.failed);
    $("btn-tester").textContent = d.tester ? "🧪 테스터 모드 켜짐 (끄기)" : "🧪 테스터 모드 (전체 해금·짧은 미션)";
    if (!all.length) { $("report-body").innerHTML = "<p style='text-align:center'>아직 기록이 없어요. 미션을 먼저 해보세요!</p>"; return; }
    const totalMin = Math.round(all.reduce((a, m) => a + (m.durationSec || 0), 0) / 60);
    const totalStars = Object.values(d.stages || {}).reduce((a, w) => a + Object.values(w).reduce((x, y) => x + y, 0), 0);
    const tiles = [["훈련한 날", `${d.sessions.length}일`], ["미션", `${all.length}회${failedN ? ` <small>(중단 ${failedN})</small>` : ""}`], ["놀이 시간", `${totalMin}분`], ["모은 별", `${totalStars}개`], ["연속 출석", `${Storage.streak()}일`]];
    let html = `<div class="tiles">${tiles.map(([k, v]) => `<div class="tile"><b>${v}</b><small>${k}</small></div>`).join("")}</div>`;
    // 힘 레이더: 세계별 최근 3회 평균 정확도
    const radarItems = Object.values(TASKS).map((t) => { const rows = all.filter((m) => m.task === t.id).slice(-3); return { label: t.short, v: rows.length ? rows.reduce((a, m) => a + m.accuracy, 0) / rows.length : 0 }; });
    html += `<div class="report-grid"><div class="report-card"><h3>우리 아이의 힘 지도</h3><p class="card-note">세계별 최근 3회 평균 정확도</p>${svgRadar(radarItems)}</div>
      <div class="report-card"><h3>최근 4주 놀이 기록</h3><p class="card-note">칸이 진할수록 그날 오래 놀았어요</p>${heatmap(d.daily || {})}</div></div>`;
    for (const t of Object.values(TASKS)) {
      const rows = all.filter((m) => m.task === t.id);
      if (!rows.length) continue;
      const labels = METRIC_LABELS[t.id]; const last = rows[rows.length - 1]; const recent = rows.slice(-12);
      const first3 = rows.slice(0, 3), last3 = rows.slice(-3);
      const delta = Math.round((last3.reduce((a, m) => a + m.accuracy, 0) / last3.length - first3.reduce((a, m) => a + m.accuracy, 0) / first3.length) * 100);
      html += `<div class="report-section"><div class="rs-head"><img src="${t.icon}" alt=""><div><h3>${t.name} <small>${t.short}</small></h3><small class="card-note">${rows.length}회 · 스테이지 ${Storage.maxUnlocked(t.id)}/${MAX_STAGE} 해금${rows.length >= 4 ? ` · 처음보다 <b class="${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}%p</b>` : ""}</small></div><b class="rs-acc">${Math.round(last.accuracy * 100)}%</b></div>
        ${svgLine(recent.map((m) => m.accuracy), recent.map((m) => m.date.slice(5, 10)))}
        ${starStrip(t.id)}
        <div class="kv">${labels.map((l) => `<span><small>${l[1]}</small><b>${fmt(last.metrics[l[0]] ?? 0, l[2])}</b></span>`).join("")}</div>
      </div>`;
    }
    html += `<p class="report-note" style="margin-top:16px">읽는 법: "놓침"이 줄면 오래 지켜보는 힘이, "심술이 건드림·잘못 잡음"이 줄면 참는 힘이, "반응 들쭉날쭉"이 줄면 꾸준함이 자라고 있는 거예요. 하루하루보다 일주일 흐름을 봐 주세요.</p>`;
    $("report-body").innerHTML = html;
  }
  $("btn-report").addEventListener("click", () => { renderReport(); show("report"); });
  $("btn-export").addEventListener("click", () => Storage.exportJSON());
  $("btn-tester").addEventListener("click", () => { const d = Storage.load(); Storage.setTester(!d.tester); renderReport(); });
  $("btn-reset").addEventListener("click", () => { $("btn-reset-yes").hidden = !$("btn-reset-yes").hidden; });
  $("btn-reset-yes").addEventListener("click", () => { Storage.reset(); $("btn-reset-yes").hidden = true; renderReport(); renderHome(); });

  // ---------- 음악 ----------
  document.querySelectorAll("[data-music-toggle]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); Audio.unlock(); Music.setEnabled(!Music.enabled); }));
  Music.setEnabled(Music.enabled);
  Music.armAutoplay();

  // ---------- PWA: 서비스 워커 + 설치 버튼 ----------
  (() => {
    const isHttp = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    const isArtifact = /claude\.ai$/.test(location.hostname);
    if ("serviceWorker" in navigator && isHttp && !isArtifact) {
      window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
      // 새 버전 서비스워커가 자리 잡으면 한 번 새로고침해 최신 화면을 보여준다 (미션 중이 아닐 때만)
      let refreshed = false; const hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshed || !hadController) return;
        refreshed = true;
        if (!$("screen-task").classList.contains("active")) location.reload();
      });
    }
    let deferred = null;
    const btn = $("btn-install");
    window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; btn.hidden = false; });
    btn.addEventListener("click", async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; btn.hidden = true; });
    window.addEventListener("appinstalled", () => { btn.hidden = true; });
    // iOS Safari는 설치 프롬프트가 없으므로 안내 문구
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
    if (ios && !isArtifact) { $("install-hint").hidden = false; }
  })();

  // 프리로드
  ["poko_neutral", "poko_happy", "poko_encourage", "poko_alert", "poko_surprised", "poko_thinking", "poko_sleepy", "poko_proud", "poko_sad", "poko_excited",
   "star_go", "star_gold", "spiky_nogo", "coin", "cloud", "moon", "planet", "lilypad", "bottle", "fish", "poko_boat", "chest"]
    .forEach((n) => { const i = new Image(); i.src = `assets/characters/${n}.png`; });
  Object.values(TASKS).forEach((t) => { const i = new Image(); i.src = t.bg; });

  ["spiky_king", "tent", "fruit", "bell", "bunny", "squirrel", "owl", "bee", "log", "dino", "pig", "sheep", "tiger"].forEach((n) => { const i = new Image(); i.src = `assets/characters/${n}.png`; });
  if (Storage.hero() !== "poko") ["happy", "surprised", "proud", "encourage", "excited", "sleepy"].forEach((st) => { const i = new Image(); i.src = Hero.face(st); });
  applyHat();
  // 초대 링크(?invite=CODE)로 들어오면 코드를 기억해 두고 주소를 정리한다
  try {
    const code = new URLSearchParams(location.search).get("invite");
    if (code) { const d = Storage.load(); if (!d.profile.invitedBy) d.profile.pendingInvite = code.toUpperCase().slice(0, 6); Storage.save(d); history.replaceState(null, "", location.pathname); }
  } catch (e) { /* ignore */ }
  Adaptive.age = (Storage.load().profile || {}).age || null;
  Hero.apply();
  renderHome();
  Home.start();
  // 지난번에 못 보낸 점수 전송 + 초대 성공 보상
  Online.submit().then(() => Online.claimInvites()).then((n) => {
    if (n > 0) { const el = $("home-notice"); el.textContent = `💌 초대한 친구 ${n}명이 탐험대에 들어왔어요! +${n * Online.INVITE_BONUS} 코인`; el.hidden = false; Audio.gold(); renderHome(); }
  });
  if ((Storage.load().profile || {}).pendingInvite && !(Storage.load().profile || {}).invitedBy) {
    const el = $("home-notice"); el.textContent = "💌 친구의 초대를 받았어요! 이름을 지으면 둘 다 +50 코인"; el.hidden = false;
  }
})();
