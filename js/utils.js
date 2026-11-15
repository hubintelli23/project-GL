// ============================================================
// utils.js — 수학/공용 도구
// ============================================================
GL.U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  angleTo: (a, b) => Math.atan2(b.y - a.y, b.x - a.x),
  angDiff(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  },
  rand: (a, b) => a + Math.random() * (b - a),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  deg: (d) => d * Math.PI / 180,

  // 부채꼴 판정: 중심 c, 방향 dir, 반경 r, 각도 arc(라디안), 대상 t(반지름 t.r)
  inArc(c, dir, r, arc, t) {
    const d = Math.hypot(t.x - c.x, t.y - c.y);
    if (d > r + (t.r || 0)) return false;
    if (arc >= Math.PI * 2 - 0.01) return true;
    const a = Math.atan2(t.y - c.y, t.x - c.x);
    return Math.abs(GL.U.angDiff(dir, a)) <= arc / 2 + Math.atan2(t.r || 0, Math.max(d, 1));
  },
  // 직선(폭 w) 판정
  inLine(c, dir, len, w, t) {
    const dx = t.x - c.x, dy = t.y - c.y;
    const fx = Math.cos(dir), fy = Math.sin(dir);
    const along = dx * fx + dy * fy;
    const side = Math.abs(-dx * fy + dy * fx);
    return along >= -(t.r || 0) && along <= len + (t.r || 0) && side <= w / 2 + (t.r || 0);
  },
  inCircle(c, r, t) {
    return Math.hypot(t.x - c.x, t.y - c.y) <= r + (t.r || 0);
  },
};
