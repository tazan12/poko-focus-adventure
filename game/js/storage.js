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
    for (const k of ["daily", "stickers", "challenges", "stages", "badges"]) if (!out[k] || typeof out[k] !== "object") out[k] = {};
    if (!Array.isArray(out.sessions)) out.sessions = [];
    if (!out.hats || !Array.isArray(out.hats.owned)) out.hats = { owned: [], equipped: null };
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
      badges: {},     // { task: true } 보스 배지
      tester: false,
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
      let m = 1;
      for (let l = 1; l <= 10; l++) if ((st[l] || 0) >= 2) m = Math.min(10, l + 1);
      return m;
    },
    buyHat(id, price) { const d = load(); d.hats = d.hats || { owned: [], equipped: null }; if (d.hats.owned.includes(id) || d.coins < price) return false; d.coins -= price; d.hats.owned.push(id); d.hats.equipped = id; save(d); return true; },
    equipHat(id) { const d = load(); d.hats = d.hats || { owned: [], equipped: null }; d.hats.equipped = id; save(d); },
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
