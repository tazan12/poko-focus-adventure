// localStorage 기반 기록 저장 — 레벨, 세션 로그, 일일 사용 시간
const Storage = (() => {
  const KEY = "poko_focus_v1";

  // 저장 데이터에 새 버전 필드가 없어도 동작하도록 기본값과 병합
  function load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
    const base = defaults();
    if (!d || typeof d !== "object") return base;
    const out = { ...base, ...d };
    out.levels = { ...base.levels, ...(d.levels || {}) };
    for (const k of ["daily", "stickers", "challenges", "stages", "badges", "weekly"]) if (!out[k] || typeof out[k] !== "object") out[k] = {};
    out.profile = { ...base.profile, ...(d.profile || {}) };
    if (!Array.isArray(out.sessions)) out.sessions = [];
    if (!out.hats || !Array.isArray(out.hats.owned)) out.hats = { owned: [], equipped: null };
    // 잎사귀 화관은 방울 모자로 교체됨 (캐릭터마다 착용 모습이 어색해 바꿈) — 이미 산 사람은 그대로 방울 모자를 갖는다
    out.hats.owned = out.hats.owned.map((h) => (h === "leaf" ? "beanie" : h));
    if (out.hats.equipped === "leaf") out.hats.equipped = "beanie";
    if (!out.heroes || !Array.isArray(out.heroes.owned)) out.heroes = { owned: ["poko"], selected: "poko" };
    return out;
  }

  function defaults() {
    return {
      levels: { gonogo: 1, cpt: 1, nback: 1, flanker: 1, stroop: 1, search: 1, switch: 1, trail: 1, headcount: 1, balloons: 1, calc: 1, melody: 1 },
      coins: 0,
      stars: 0,
      sessions: [],   // { date, missions: [ {task, level, metrics...} ], durationSec }
      daily: {},      // { "YYYY-MM-DD": seconds }
      stickers: {},   // { task: true } 획득한 스티커
      challenges: {}, // { 'YYYY-MM-DD': true } 오늘의 도전 달성
      stages: {},     // { task: { level: bestStars } } 스테이지별 최고 별
      hats: { owned: [], equipped: null },
      heroes: { owned: ["poko"], selected: "poko" }, // 주인공 캐릭터 (포코는 기본, 나머지는 코인으로)
      badges: {},     // { task: true } 보스 배지
      tester: false,
      // 탐험대원 카드: 닉네임·나이(난이도 조정용)·이름 변경 횟수·온라인 등록 정보(id/secret/초대코드)
      profile: { name: "", age: null, nameChanges: 0, online: null, invitedBy: null, invitedCount: 0, pendingInvite: null },
      weekly: {},     // { "2026-W38": { points, stars, missions } } 주간 탐험 점수 (랭킹용)
    };
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 저장 공간 부족 시 무시 */ }
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  return {
    load, save, today,
    getLevel(task) { return load().levels[task] || 1; },
    setLevel(task, lv) { const d = load(); d.levels[task] = lv; save(d); },
    addCoins(n) { const d = load(); d.coins += n; save(d); return d.coins; },
    addStars(n) { const d = load(); d.stars += n; save(d); return d.stars; },
    addDailySeconds(sec) { const d = load(); const t = today(); d.daily[t] = (d.daily[t] || 0) + sec; save(d); return d.daily[t]; },
    todaySeconds() { return load().daily[today()] || 0; },
    addMissionResult(result) {
      const d = load();
      const t = today();
      let s = d.sessions.find((x) => x.date === t);
      if (!s) { s = { date: t, missions: [] }; d.sessions.push(s); }
      s.missions.push(result);
      save(d);
    },
    // 스티커 획득. 이미 있으면 false, 새로 획득하면 true
    unlockSticker(task) { const d = load(); d.stickers = d.stickers || {}; if (d.stickers[task]) return false; d.stickers[task] = true; save(d); return true; },
    // 스테이지 기록: 최고 별 갱신. 별 2개 이상이면 다음 스테이지 해금
    recordStage(task, level, stars) {
      const d = load(); d.stages = d.stages || {}; d.stages[task] = d.stages[task] || {};
      d.stages[task][level] = Math.max(d.stages[task][level] || 0, stars);
      save(d);
    },
    stageStars(task, level) { const d = load(); return ((d.stages || {})[task] || {})[level] || 0; },
    // 해금된 최고 스테이지: 별 2개 이상 받은 가장 높은 스테이지 + 1 (최대 10)
    maxUnlocked(task) {
      const d = load();
      if (d.tester) return 10;
      const st = ((d.stages || {})[task]) || {};
      let m = (d.profile && d.profile.age >= 14) ? 3 : 1;
      for (let l = 1; l <= 10; l++) if ((st[l] || 0) >= 2) m = Math.min(10, l + 1);
      return m;
    },
    buyHat(id, price) { const d = load(); d.hats = d.hats || { owned: [], equipped: null }; if (d.hats.owned.includes(id) || d.coins < price) return false; d.coins -= price; d.hats.owned.push(id); d.hats.equipped = id; save(d); return true; },
    buyHero(id, price) { const d = load(); if (d.heroes.owned.includes(id) || d.coins < price) return false; d.coins -= price; d.heroes.owned.push(id); d.heroes.selected = id; save(d); return true; },
    selectHero(id) { const d = load(); if (!d.heroes.owned.includes(id) && !d.tester) return false; d.heroes.selected = id; save(d); return true; },
    hero() { const d = load(); return d.heroes.selected || "poko"; },
    // 14살 이상은 1~3스테이지가 처음부터 열려 있고(가벼운 초반 건너뛰기), 레벨도 3에서 시작
    bumpLevels(min) { const d = load(); for (const k of Object.keys(d.levels)) d.levels[k] = Math.max(d.levels[k], min); save(d); },
    equipHat(id) { const d = load(); d.hats = d.hats || { owned: [], equipped: null }; d.hats.equipped = id; save(d); },
    // 탐험대원 카드 저장. 첫 이름은 무료, 이후 이름 변경은 코인(RENAME_COST) 차감. 반환: { ok, reason }
    RENAME_COST: 30,
    setProfile({ name, age }) {
      const d = load(); const p = d.profile;
      const renaming = p.name && name && name !== p.name;
      if (renaming) { if (d.coins < this.RENAME_COST) return { ok: false, reason: "coins" }; d.coins -= this.RENAME_COST; p.nameChanges = (p.nameChanges || 0) + 1; }
      if (name) p.name = name;
      if (age) p.age = age;
      save(d); return { ok: true, paid: renaming ? this.RENAME_COST : 0 };
    },
    // 주간 탐험 점수 누적 (미션마다 별×20 + 그 미션에서 번 코인)
    addWeekly(week, points, stars) {
      const d = load(); d.weekly = d.weekly || {}; const w = d.weekly[week] || { points: 0, stars: 0, missions: 0 };
      w.points += points; w.stars += stars; w.missions += 1; d.weekly[week] = w; save(d); return w;
    },
    unlockBadge(task) { const d = load(); d.badges = d.badges || {}; if (d.badges[task]) return false; d.badges[task] = true; save(d); return true; },
    setTester(on) { const d = load(); d.tester = on; save(d); },
    // 연속 출석일 (오늘 포함, 오늘 기록이 없으면 어제까지)
    streak() {
      const days = new Set(load().sessions.map((s) => s.date));
      let n = 0; const d = new Date();
      if (!days.has(today())) d.setDate(d.getDate() - 1);
      for (;;) { const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; if (!days.has(k)) break; n++; d.setDate(d.getDate() - 1); }
      return n;
    },
    completeChallenge(date) { const d = load(); d.challenges = d.challenges || {}; d.challenges[date] = true; save(d); },
    reset() { localStorage.removeItem(KEY); },
    exportJSON() {
      const blob = new Blob([JSON.stringify(load(), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `poko_focus_${today()}.json`;
      a.click();
    },
  };
})();
