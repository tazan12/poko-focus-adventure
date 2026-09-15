// 온라인 기능 — 탐험대원 등록·친구 초대·주간 랭킹 (Supabase RPC, 익명 키)
// 서버에는 닉네임(≤8자)·나이·초대코드·주간 점수만 저장한다. 이메일·실명·기기정보 없음.
// 네트워크가 없어도 게임은 그대로 동작하고, 점수는 다음 접속 때 다시 보낸다.
const Online = (() => {
  const BASE = "https://enwkeklilzxfteoplmwq.supabase.co/rest/v1/rpc/";
  const KEY = "sb_publishable_WAVxoYUYgofA62qYAjAlyQ_EVoRbC-F";
  const INVITE_BONUS = 50;   // 초대한 사람·초대받은 사람 모두 +50 코인
  const SHARE_URL = "https://tazan12.github.io/poko-focus-adventure/";

  async function rpc(fn, args, timeoutMs = 8000) {
    if (!available) throw new Error("offline_preview");
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await fetch(BASE + fn, { method: "POST", signal: ctl.signal, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
      if (!r.ok) { const txt = await r.text(); throw new Error(`${r.status} ${txt.slice(0, 120)}`); }
      return await r.json();
    } finally { clearTimeout(t); }
  }

  // ISO 주차 키 (월요일 시작) — 랭킹은 매주 새로 시작
  function weekKey(d = new Date()) {
    const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
    const w = Math.ceil(((x - y0) / 86400000 + 1) / 7);
    return `${x.getUTCFullYear()}-W${String(w).padStart(2, "0")}`;
  }
  function ageBand(age) { return age <= 8 ? "6~8살" : age <= 10 ? "9~10살" : "11~13살"; }

  const me = () => (Storage.load().profile || {}).online || null;
  // claude.ai 아티팩트 미리보기에서는 외부 요청이 막혀 있어 온라인 기능을 끄고 안내만 한다
  const available = !/claude\.ai$/.test(location.hostname);

  return {
    INVITE_BONUS, SHARE_URL, weekKey, ageBand, available,
    get registered() { return !!me(); },
    // 등록: 성공하면 profile.online 에 id/secret/code 저장. 초대코드가 있으면 서버가 초대 관계를 기록
    async register(name, age, inviteCode) {
      const r = await rpc("poko_register", { p_name: name, p_age: age, p_invite_code: inviteCode || null });
      const d = Storage.load(); d.profile = d.profile || {};
      d.profile.online = { id: r.id, secret: r.secret, code: r.code };
      if (r.invited_by_name) { d.profile.invitedBy = r.invited_by_name; d.coins += INVITE_BONUS; }
      d.profile.pendingInvite = null; Storage.save(d);
      return r;
    },
    async update(name, age, inviteCode) {
      const o = me(); if (!o) return null;
      const r = await rpc("poko_update", { p_id: o.id, p_secret: o.secret, p_name: name, p_age: age, p_invite_code: inviteCode || null });
      if (r.invited_by_name) { const d = Storage.load(); d.profile.invitedBy = r.invited_by_name; d.coins += INVITE_BONUS; d.profile.pendingInvite = null; Storage.save(d); }
      return r;
    },
    // 이번 주 점수 보내기 (실패해도 조용히 넘어가고 다음에 다시 보낸다)
    async submit() {
      const o = me(); if (!o || !navigator.onLine) return false;
      const d = Storage.load(); const wk = weekKey(); const w = (d.weekly || {})[wk] || { points: 0, stars: 0, missions: 0 };
      const totalStars = Object.values(d.stages || {}).reduce((a, x) => a + Object.values(x).reduce((s, y) => s + y, 0), 0);
      const totalPoints = Object.values(d.weekly || {}).reduce((a, x) => a + (x.points || 0), 0);
      try { await rpc("poko_submit", { p_id: o.id, p_secret: o.secret, p_week: wk, p_points: w.points, p_stars: w.stars, p_missions: w.missions, p_total_points: totalPoints, p_total_stars: totalStars }); return true; }
      catch (e) { return false; }
    },
    // 초대 보상: 새로 가입한 초대 친구 수 × 50코인
    async claimInvites() {
      const o = me(); if (!o || !navigator.onLine) return 0;
      try {
        const r = await rpc("poko_claim_invites", { p_id: o.id, p_secret: o.secret });
        if (r.new > 0) { const d = Storage.load(); d.coins += r.new * INVITE_BONUS; d.profile.invitedCount = r.total; Storage.save(d); }
        else if (r.total !== undefined) { const d = Storage.load(); d.profile.invitedCount = r.total; Storage.save(d); }
        return r.new;
      } catch (e) { return 0; }
    },
    async rank() {
      const o = me(); if (!o) return null;
      return rpc("poko_rank", { p_id: o.id, p_week: weekKey() });
    },
    inviteLink() { const o = me(); return o ? `${SHARE_URL}?invite=${o.code}` : SHARE_URL; },
    async share(name) {
      const o = me(); if (!o) return "none";
      const text = `${name || "친구"}가 포코와 별빛 탐험대에 초대했어요! 초대코드 ${o.code} — 함께 별을 모아요 ⭐`;
      const url = this.inviteLink();
      if (navigator.share) { try { await navigator.share({ title: "포코와 별빛 탐험대", text, url }); return "shared"; } catch (e) { /* 취소 */ } }
      try { await navigator.clipboard.writeText(`${text}\n${url}`); return "copied"; } catch (e) { return "manual"; }
    },
  };
})();
