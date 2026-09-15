// 연출 효과 — 짧고(≤600ms) 국소적으로. 자극 영역 밖의 지속적 움직임은 피한다(주의 분산 방지).
const Fx = (() => {
  const layer = () => document.getElementById("fx-layer");

  // 요소의 화면 중심 좌표 (fx-layer 기준)
  function center(el) {
    const r = el.getBoundingClientRect();
    const L = layer().getBoundingClientRect();
    return { x: r.left + r.width / 2 - L.left, y: r.top + r.height / 2 - L.top };
  }

  function burst(x, y, color = "#ffd24d", n = 10) {
    const L = layer();
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "fx-particle";
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const d = 50 + Math.random() * 50;
      p.style.cssText = `left:${x}px;top:${y}px;background:${color};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
      L.appendChild(p);
      setTimeout(() => p.remove(), 600);
    }
  }

  function popup(x, y, text, cls = "") {
    const L = layer();
    const p = document.createElement("div");
    p.className = `fx-popup ${cls}`;
    p.textContent = text;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    L.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }

  // 코인이 자극 위치에서 HUD 코인으로 날아감
  function coinFly(x, y) {
    const L = layer();
    const target = document.getElementById("hud-coin-icon");
    if (!target) return;
    const t = center(target);
    const c = document.createElement("img");
    c.src = "assets/characters/coin.png";
    c.className = "fx-coin";
    c.style.left = `${x}px`;
    c.style.top = `${y}px`;
    L.appendChild(c);
    requestAnimationFrame(() => { c.style.transform = `translate(${t.x - x}px, ${t.y - y}px) scale(0.5)`; c.style.opacity = "0.9"; });
    setTimeout(() => { c.remove(); target.classList.add("bump"); setTimeout(() => target.classList.remove("bump"), 200); }, 520);
  }

  // 보상 화면 콘페티 (캔버스, 2초)
  function confetti(canvas) {
    const ctx = canvas.getContext("2d");
    const W = (canvas.width = canvas.offsetWidth);
    const H = (canvas.height = canvas.offsetHeight);
    const colors = ["#ff9b3d", "#4fc3c9", "#ffd24d", "#ff8a80", "#8fe3e8", "#b39ddb"];
    const parts = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3,
      s: 6 + Math.random() * 6, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.2, c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
      }
      if (t - t0 < 2200) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
    })(t0);
  }

  return { center, burst, popup, coinFly, confetti };
})();
