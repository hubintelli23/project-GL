// ============================================================
// render.js — 3인칭 백뷰 3D 렌더 (명조 방식 카메라)
// 마우스로 카메라를 돌리고, 캐릭터는 카메라 기준으로 움직임
// 3D 장면은 WebGL 캔버스, 글자·체력바는 위쪽 2D 오버레이 캔버스
// ============================================================
GL.Render = {
  yaw: 0, pitch: 0.38, dist: 260, fov: 1.05,
  tgt: { x: 0, y: 0 },

  init(glCanvas, uiCanvas) {
    GL.G3.init(glCanvas, GL.Touch.enabled);   // 휴대폰 : 안티에일리어싱 끄고 저전력
    this.canvas = uiCanvas; this.ctx = uiCanvas.getContext('2d');
    this.props = [];
  },

  // 스테이지가 바뀔 때 배경 구조물(데이터 모노리스) 배치
  buildProps() {
    const b = GL.Stage.bounds, list = [];
    const n = GL.Touch.enabled ? 14 : 26;   // 휴대폰은 배경 구조물 줄임
    for (let i = 0; i < n; i++) {
      const side = i % 4, t = (Math.floor(i / 4) + 0.5) / Math.ceil(n / 4);
      let x, y;
      if (side === 0) { x = b.x + b.w * t; y = b.y - 120 - Math.random() * 200; }
      if (side === 1) { x = b.x + b.w * t; y = b.y + b.h + 120 + Math.random() * 200; }
      if (side === 2) { x = b.x - 120 - Math.random() * 200; y = b.y + b.h * t; }
      if (side === 3) { x = b.x + b.w + 120 + Math.random() * 200; y = b.y + b.h * t; }
      list.push({ x, y, w: 40 + Math.random() * 60, h: 160 + Math.random() * 380, a: Math.random() * 3 });
    }
    this.props = list;
  },

  forward() { return { x: Math.cos(this.yaw), y: Math.sin(this.yaw) }; },

  // 카메라 : 마우스 이동량으로 회전, 플레이어 뒤에서 따라감
  updateCamera(dt) {
    const I = GL.Input, p = GL.Party.player;
    this.yaw += I.mouse.dx * 0.0032;
    this.pitch = GL.U.clamp(this.pitch + I.mouse.dy * 0.0022, 0.1, 0.9);
    I.mouse.dx = 0; I.mouse.dy = 0;
    const k = Math.min(1, dt * 12);
    this.tgt.x += (p.x - this.tgt.x) * k; this.tgt.y += (p.y - this.tgt.y) * k;
  },

  camera() {
    const W = GL.World, f = this.forward();
    const sh = W.shake || 0, jx = (Math.random() - 0.5) * sh, jy = (Math.random() - 0.5) * sh;
    const h = 46 + GL.Party.player.z * 0.3;
    const horiz = this.dist * Math.cos(this.pitch), up = this.dist * Math.sin(this.pitch);
    const target = [this.tgt.x + f.x * 40, h, this.tgt.y + f.y * 40];
    const eye = [this.tgt.x - f.x * horiz + jx, h + up + jy, this.tgt.y - f.y * horiz];
    return { eye, target, fov: this.fov };
  },

  draw() {
    const G = GL.G3, W = GL.World, t = W.time;
    const obs = W.observe.on ? 1 : 0;
    G.frame.mono = W.mono || 0;
    G.frame.fog = GL.Stage.name === 'boss' ? [0.04, 0.025, 0.07] : [0.02, 0.035, 0.07];
    G.begin(this.camera());
    G.resetProgram();
    G.ground(GL.Stage.bounds, obs, t, GL.Stage.name === 'boss' ? [0.07, 0.05, 0.12] : [0.045, 0.075, 0.13]);
    G.resetProgram();

    // ----- 불투명 -----
    this.drawWorldStatic(obs);
    this.drawPlayer();
    for (const e of W.enemies) if (!e.dead && !(e instanceof GL.Echo)) this.drawEnemy(e);
    this.drawShots();
    this.drawPickups();
    this.drawFxSolid();

    // ----- 반투명 (바닥 데칼, 예고 범위, 고스트) -----
    const gl = G.gl;
    gl.depthMask(false);
    this.drawShadows();
    this.drawFields();
    this.drawTele();
    this.drawReversalTrail();
    this.drawKnots(obs);
    for (const e of W.enemies) if (!e.dead && e instanceof GL.Echo) this.drawEnemy(e);
    this.drawWeakGlows();
    this.drawPlayerDecals();
    this.drawFxDecals();
    gl.depthMask(true);

    this.drawOverlay();
  },

  c(hex, a = 1) { return GL.G3.rgba(hex, a); },

  drawWorldStatic(obs) {
    const G = GL.G3, b = GL.Stage.bounds, t = GL.World.time;
    const wc = this.c(obs ? '#3fe0a8' : (GL.Stage.name === 'boss' ? '#b07bff' : '#5d8fd6'));
    const th = 14, hh = 18;
    G.draw('box', G.model(b.x + b.w / 2, hh / 2, b.y, 0, b.w, hh, th), wc, 0.8);
    G.draw('box', G.model(b.x + b.w / 2, hh / 2, b.y + b.h, 0, b.w, hh, th), wc, 0.8);
    G.draw('box', G.model(b.x, hh / 2, b.y + b.h / 2, 0, th, hh, b.h), wc, 0.8);
    G.draw('box', G.model(b.x + b.w, hh / 2, b.y + b.h / 2, 0, th, hh, b.h), wc, 0.8);
    for (const p of this.props) {
      G.draw('box', G.model(p.x, p.h / 2, p.y, p.a, p.w, p.h, p.w), this.c(GL.Stage.name === 'boss' ? '#1a1430' : '#14223a'), 0);
      G.draw('box', G.model(p.x, p.h - 4, p.y, p.a, p.w + 2, 6, p.w + 2), wc, 0.9);
    }
    // 포털
    const P = GL.Stage.portal;
    if (P) {
      G.draw('ring', G.model(P.x, 70, P.y, t * 0.8, 55, 55, 55, Math.PI / 2), this.c('#d36bff'), 0.9);
      G.draw('ring', G.model(P.x, 70, P.y, -t * 1.3, 42, 42, 42, Math.PI / 2), this.c('#f0c8ff'), 0.9);
      G.draw('octa', G.model(P.x, 70, P.y, t * 2, 16, 22, 16), this.c('#1a0024'), 0.4);
    }
  },

  // ---------- 캐릭터 ----------
  drawPlayer() {
    const G = GL.G3, p = GL.Party.player, ch = GL.Party.active(), t = GL.World.time;
    if (!ch) return;
    const y = p.z * 0.6, f = p.facing;
    const flash = p.hurtFlash > 0;
    const body = this.c(flash ? '#ffffff' : ch.color);
    const fx = Math.cos(f), fz = Math.sin(f), rx = -fz, rz = fx;
    const bob = (p.moving ? Math.sin(t * 14) * 1.5 : 0);
    G.draw('cyl6', G.model(p.x, y + 2, p.y, f, 11, 28, 11), body, 0.15);           // 몸
    G.draw('box', G.model(p.x - fx * 4, y + 22 + bob, p.y - fz * 4, f, 6, 20, 22), this.c('#1c2638'), 0);   // 코트
    G.draw('sphere', G.model(p.x, y + 40 + bob, p.y, f, 8.5, 8.5, 8.5), this.c('#f1e2d4'), 0.1); // 머리
    G.draw('box', G.model(p.x - fx * 2, y + 45 + bob, p.y - fz * 2, f, 12, 6, 15), this.c(ch.id === 'kay' ? '#2a1e3d' : ch.id === 'baren' ? '#5a4220' : '#cfe8ff'), 0); // 머리카락
    if (GL.World.observe.on) G.draw('box', G.model(p.x + fx * 8, y + 41 + bob, p.y + fz * 8, f, 2, 2, 9), this.c('#3fe0a8'), 1); // 관측의 눈
    const swing = p.lock > 0 ? Math.sin(p.lock * 30) * 0.6 : 0;
    if (ch.id === 'ian') {
      const a1 = f + 0.35 + swing, a2 = f - 0.35 - swing;
      G.draw('box', G.model(p.x + Math.cos(a1) * 18 + rx * 4, y + 24, p.y + Math.sin(a1) * 18 + rz * 4, a1, 28, 2, 4), this.c('#e8fff8'), 0.7);
      G.draw('box', G.model(p.x + Math.cos(a2) * 18 - rx * 4, y + 24, p.y + Math.sin(a2) * 18 - rz * 4, a2, 28, 2, 4), this.c('#e8fff8'), 0.7);
    } else if (ch.id === 'baren') {
      const gc = p.guard > 0 ? '#ffe066' : '#c89a3a';
      G.draw('box', G.model(p.x + fx * 16, y + 22, p.y + fz * 16, f, 5, 40, 32), this.c(gc), p.guard > 0 ? 0.8 : 0.2);
    } else {
      G.draw('box', G.model(p.x + fx * 14 + rx * 8, y + 24, p.y + fz * 14 + rz * 8, f + swing, 16, 2, 3), this.c('#e6d6ff'), 0.6);
      G.draw('box', G.model(p.x + fx * 10 - rx * 8, y + 22, p.y + fz * 10 - rz * 8, f - swing, 14, 2, 3), this.c('#e6d6ff'), 0.6);
    }
  },

  drawEnemy(e) {
    const G = GL.G3, t = GL.World.time;
    const groggy = e.groggy > 0;
    let col = e.hitFlash > 0 ? '#ffffff' : (groggy ? '#e8d26a' : e.color);
    const f = e.facing, fx = Math.cos(f), fz = Math.sin(f), rx = -fz, rz = fx;
    const ghost = e instanceof GL.Echo ? 0.45 : 1;
    if (e instanceof GL.Shard) {
      if (e.state === 'charge') col = Math.sin(t * 30) > 0 ? '#ffffff' : '#ff2040';
      const s = e.state === 'charge' ? 18 + Math.sin(t * 30) * 3 : 15;
      G.draw('octa', G.model(e.x, 24, e.y, t * 3, s, s * 1.3, s), this.c(col), 0.3);
    } else if (e instanceof GL.Eroder) {
      const h = 44 + Math.sin(t * 3 + e.x) * 5;
      G.draw('sphere', G.model(e.x, h, e.y, f, 14, 14, 14), this.c(col), 0.25);
      G.draw('ring', G.model(e.x, h, e.y, t * 2, 22, 22, 22, 0.4), this.c('#ffd0a0'), 0.6);
      G.draw('box', G.model(e.x + fx * 16, h, e.y + fz * 16, f, 14, 5, 5), this.c('#ffb070'), 0.7);
    } else if (e instanceof GL.Clasher) {
      G.draw('box', G.model(e.x, 22, e.y, f, 34, 44, 32), this.c(col), 0.1);
      G.draw('box', G.model(e.x + rx * 24 + fx * 6, 26, e.y + rz * 24 + fz * 6, f, 42, 30, 22), this.c(groggy ? '#8a7a3a' : '#5c3a7a'), 0.05); // 바위 팔
      if (e.guardUp && !groggy) G.draw('box', G.model(e.x + fx * 26, 26, e.y + fz * 26, f, 8, 46, 50), this.c('#e2b8ff'), 0.35);
    } else if (e instanceof GL.Guardian) {
      G.draw('box', G.model(e.x, 34, e.y, f, 40, 68, 36), this.c(col), 0.1);
      G.draw('box', G.model(e.x, 76, e.y, f, 22, 18, 22), this.c('#2a3c66'), 0.1);
      G.draw('cyl6', G.model(e.x - rx * 26, 10, e.y - rz * 26, f, 4, 56, 4), this.c('#9fb3c8'), 0.1);
      G.draw('sphere', G.model(e.x - rx * 26, 68, e.y - rz * 26, f, 10, 10, 10), this.c('#9fb3c8'), 0.2);
      if (e.shieldUp && !groggy) G.draw('box', G.model(e.x + fx * 28, 36, e.y + fz * 28, f, 8, 66, 58), this.c('#9fc4ff'), 0.45);
    } else if (e instanceof GL.Tempus || e instanceof GL.Echo) {
      const sc = e instanceof GL.Echo ? 0.6 : 1;
      const h = (groggy ? 50 : 84) * sc + Math.sin(t * 2) * 4;
      const c = this.c(col, ghost);
      G.draw('cone', G.model(e.x, 0, e.y, t * 0.3, 40 * sc, 40 * sc, 40 * sc), this.c('#2a1a40', ghost), 0.1);
      G.draw('octa', G.model(e.x, h, e.y, t * 0.6, 40 * sc, 52 * sc, 40 * sc), c, 0.25);
      G.draw('ring', G.model(e.x, h, e.y, t * 0.9, 74 * sc, 74 * sc, 74 * sc, 1.2), this.c('#f0c8ff', ghost), 0.7);
      G.draw('ring', G.model(e.x, h, e.y, -t * 0.5, 92 * sc, 92 * sc, 92 * sc, 1.45), this.c('#d36bff', ghost * 0.8), 0.7);
      // 시계 바늘
      G.draw('box', G.model(e.x + fx * 30 * sc, h, e.y + fz * 30 * sc, f, 4, 4 + 44 * sc, 4, t * 2), this.c('#ffffff', ghost), 0.8);
      G.draw('box', G.model(e.x + fx * 30 * sc, h, e.y + fz * 30 * sc, f, 4, 4 + 28 * sc, 4, -t * 0.7), this.c('#ffffff', ghost), 0.8);
    }
    // 그로기 : 머리 위를 도는 유리 파편
    if (groggy) {
      const top = e.boss ? 150 : (e instanceof GL.Guardian ? 100 : 66);
      for (let i = 0; i < 4; i++) {
        const a = t * 4 + i * 1.57;
        G.draw('octa', G.model(e.x + Math.cos(a) * (e.r + 8), top, e.y + Math.sin(a) * (e.r + 8), t * 5, 5, 7, 5), this.c('#ffe066'), 1);
      }
    }
  },

  drawShots() {
    const G = GL.G3;
    for (const s of GL.World.eShots) G.draw('sphere', G.model(s.x, 40, s.y, 0, 8, 8, 8), this.c('#ff8a3d'), 1);
    for (const s of GL.World.pShots) {
      const a = Math.atan2(s.vy, s.vx);
      if (s.dagger) G.draw('box', G.model(s.x, 26, s.y, a, 18, 2, 4), this.c(s.color || '#ffffff'), 0.9);
      else G.draw('sphere', G.model(s.x, 30, s.y, a, s.r, s.r, s.r), this.c(s.color || '#ffffff'), 1);
    }
  },

  drawPickups() {
    const G = GL.G3, t = GL.World.time;
    for (const k of GL.World.pickups) G.draw('octa', G.model(k.x, 22 + Math.sin(t * 4 + k.x) * 5, k.y, t * 2, 9, 12, 9), this.c('#3fe0a8'), 0.9);
  },

  drawFxSolid() {
    const G = GL.G3;
    for (const f of GL.World.fx) {
      const k = f.t / f.life;
      if (f.kind === 'shard') {
        const h = 12 + Math.sin(k * Math.PI) * 50;
        G.draw('octa', G.model(f.x, h, f.y, f.rot + k * 8, f.size * 0.7, f.size, f.size * 0.3, k * 6), [0.85, 0.95, 1, 1 - k], 0.8);
      } else if (f.kind === 'spark') {
        G.draw('box', G.model(f.x, 28, f.y, 0, 3, 3, 3), this.c(f.color, 1 - k), 1);
      }
    }
  },

  // ---------- 반투명 / 데칼 ----------
  drawShadows() {
    const G = GL.G3, p = GL.Party.player;
    G.decal(G.circle(p.x, p.y, 14 * Math.max(0.5, 1 - p.z / 300), 16), 0.4, [0, 0, 0, 0.45]);
    for (const e of GL.World.enemies) if (!e.dead) G.decal(G.circle(e.x, e.y, e.r * 1.05, 16), 0.4, [0, 0, 0, 0.4]);
  },

  drawFields() {
    const G = GL.G3, t = GL.World.time;
    for (const f of GL.World.fields) {
      if (f.kind === 'slow') {
        G.decal(G.circle(f.x, f.y, f.r), 0.8, [0.63, 0.43, 1, 0.16]);
        G.decal(G.ringStrip(f.x, f.y, f.r - 3, f.r), 0.9, [0.75, 0.6, 1, 0.7]);
        G.decal(G.rect(f.x, f.y, t * 2, f.r * 0.85, 4), 0.9, [0.75, 0.6, 1, 0.7]);
      } else if (f.kind === 'rift') {
        if (!f.armed) { for (let i = 0; i < 12; i += 2) G.decal(G.ringStrip(f.x, f.y, f.r - 3, f.r, i / 12 * 6.283, 6.283 / 12, 4), 0.9, [1, 0.25, 0.35, 0.8]); }
        else {
          G.decal(G.circle(f.x, f.y, f.r), 0.8, [0.8, 0.08, 0.2, 0.3]);
          for (let i = 0; i < 5; i++) G.decal(G.rect(f.x, f.y, i * 1.26 + f.x, f.r, 3), 0.9, [1, 0.35, 0.45, 0.8]);
        }
      } else if (f.kind === 'cut') {
        const s = f.shape;
        G.decal(G.rect(s.x, s.y, s.dir, s.len, s.w), 0.8, [0.8, 1, 0.95, 0.12 + 0.05 * Math.sin(t * 20)]);
      }
    }
  },

  teleTris(s) {
    const G = GL.G3;
    if (s.kind === 'arc') return G.sector(s.x, s.y, s.r, s.dir, s.arc);
    if (s.kind === 'line') return G.rect(s.x, s.y, s.dir, s.len, s.w);
    return G.circle(s.x, s.y, s.r);
  },
  drawTele() {
    const G = GL.G3;
    for (const t of GL.World.tele) {
      const k = Math.min(1, t.t / t.warn);
      const col = t.ghost ? [0.7, 0.43, 1] : (t.red ? [1, 0.16, 0.31] : [1, 0.59, 0.24]);
      G.decal(this.teleTris(t), 1.0, [...col, 0.12 + 0.22 * k]);
      // 차오르는 안쪽 (시간이 다 되면 발동)
      const inner = { ...t };
      if (t.kind === 'line') inner.len = t.len * k; else inner.r = (t.r || 60) * k;
      G.decal(this.teleTris(inner), 1.1, [...col, 0.25]);
      if (t.kind !== 'line') {
        const a0 = t.kind === 'arc' && t.arc < 6.28 ? t.dir - t.arc / 2 : 0, arc = t.kind === 'arc' && t.arc < 6.28 ? t.arc : 6.2832;
        G.decal(G.ringStrip(t.x, t.y, t.r - (t.red ? 5 : 3), t.r, a0, arc, 30), 1.2, [...col, 0.95]);
      }
    }
  },

  drawReversalTrail() {
    const b = GL.Boss.current, G = GL.G3;
    if (!b || b.mode !== 'reversal') return;
    const h = b.history;
    for (let i = 1; i < h.length; i++) {
      if (i % 2) continue;
      const a = Math.atan2(h[i].y - h[i - 1].y, h[i].x - h[i - 1].x), d = Math.hypot(h[i].y - h[i - 1].y, h[i].x - h[i - 1].x);
      G.decal(G.rect(h[i - 1].x, h[i - 1].y, a, d, 10), 1.3, [1, 0.24, 0.35, 0.6]);
    }
  },

  drawKnots(obs) {
    const G = GL.G3, t = GL.World.time;
    for (const k of GL.Boss.knots) {
      if (k.frac <= 0) continue;
      if (obs) {
        G.draw('octa', G.model(k.x, 46, k.y, t * 2, 14, 20, 14), this.c('#3fe0a8'), 1);
        G.draw('ring', G.model(k.x, 46, k.y, t * 1.5, 26, 26, 26, Math.PI / 2), this.c('#c8fff0', 0.9), 1);
        G.draw('cyl6', G.model(k.x, 0, k.y, 0, 3, 420, 3), this.c('#3fe0a8', 0.35), 1);
        G.decal(G.ringStrip(k.x, k.y, 30, 36, -Math.PI / 2, 6.2832 * (k.frac / k.max), 30), 1.4, [1, 1, 1, 0.9]);
      } else {
        G.draw('sphere', G.model(k.x, 46, k.y, 0, 6, 6, 6), [0.6, 0.7, 0.8, 0.12 + 0.08 * Math.sin(t * 6)], 1);
      }
    }
  },

  drawWeakGlows() {
    const G = GL.G3, t = GL.World.time;
    for (const e of GL.World.enemies) {
      if (e.dead || !GL.Combat.weakVisible(e)) continue;
      const f = e.facing;
      let ox = 0, oy = 0, h = 30;
      if (e.guardUp || e.shieldUp) { ox = Math.cos(f) * (e.r + 4); oy = Math.sin(f) * (e.r + 4); h = 40; }
      if (e.boss) { ox = -Math.cos(f) * 30; oy = -Math.sin(f) * 30; h = 84; }
      G.draw('octa', G.model(e.x + ox, h, e.y + oy, t * 3, 7, 10, 7), this.c('#3fe0a8'), 1);
      G.decal(G.ringStrip(e.x, e.y, e.r + 12, e.r + 16 + Math.sin(t * 8) * 2), 1.5, [0.25, 0.88, 0.66, 0.8]);
    }
  },

  drawPlayerDecals() {
    const G = GL.G3, p = GL.Party.player, B = GL.World.buffs, t = GL.World.time;
    if (B.shield > 0) G.draw('sphere', G.model(p.x, p.z * 0.6 + 26, p.y, 0, 26, 30, 26), [0.62, 0.9, 1, 0.18], 1);
    if (B.barrier > 0) G.decal(G.ringStrip(p.x, p.y, 34, 40 + Math.sin(t * 6) * 2), 1.6, [0.88, 0.71, 0.29, 0.8]);
    if (B.fortress > 0) G.decal(G.ringStrip(p.x, p.y, 22, 25), 1.6, [0.88, 0.71, 0.29, 0.6]);
    const cr = GL.Input.chargeRatio();
    if (cr > 0.15) G.decal(G.ringStrip(p.x, p.y, 20, 25, -Math.PI / 2, 6.2832 * cr, 30), 1.7, [1, 1, 1, cr >= 1 ? 1 : 0.6]);
    // 소프트 락온 대상 표시
    const tg = GL.Party.softTarget;
    if (tg && !tg.dead) G.decal(G.ringStrip(tg.x, tg.y, tg.r + 18, tg.r + 21, t * 2, 4.5, 24), 1.7, [1, 1, 1, 0.5]);
  },

  drawFxDecals() {
    const G = GL.G3;
    for (const f of GL.World.fx) {
      const k = f.t / f.life;
      const c = f.color ? this.c(f.color) : [1, 1, 1, 1];
      if (f.kind === 'ring') { const r = f.r * (0.4 + 0.6 * k); G.decal(G.ringStrip(f.x, f.y, Math.max(0, r - 5), r), 1.8, [c[0], c[1], c[2], 1 - k]); }
      else if (f.kind === 'slash') G.decal(G.sector(f.x, f.y, f.r, f.dir, f.arc), 2, [c[0], c[1], c[2], (1 - k) * 0.6]);
      else if (f.kind === 'line') G.decal(G.rect(f.x, f.y, f.dir, f.len, f.w * (1 - k * 0.6)), 2, [c[0], c[1], c[2], (1 - k) * 0.75]);
    }
    // 관측 중 투사체 궤적
    if (GL.World.observe.on) for (const s of GL.World.eShots) G.decal(G.rect(s.x, s.y, Math.atan2(s.vy, s.vx), Math.hypot(s.vx, s.vy) * 1.2, 3), 1.9, [0.25, 0.88, 0.66, 0.6]);
  },

  // ---------- 2D 오버레이 : 체력바, 떠오르는 숫자, 붉은 경고 ----------
  drawOverlay() {
    const ctx = this.ctx, cv = this.canvas, G = GL.G3, W = GL.World, p = GL.Party.player;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const e of W.enemies) {
      if (e.dead || e.boss) continue;
      const top = e instanceof GL.Guardian ? 100 : (e instanceof GL.Echo ? 110 : 66);
      const s = G.project(e.x, top, e.y);
      if (!s) continue;
      const w = Math.max(30, Math.min(90, 3000 / s.d * (e.r / 14))), x = s.x - w / 2, y = s.y;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, w, 7);
      ctx.fillStyle = e.elite ? '#ff9a3d' : '#ff5a6e'; ctx.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 4);
      ctx.fillStyle = e.groggy > 0 ? '#ffe066' : '#e8f1ff';
      ctx.fillRect(x, y + 4, w * (e.groggy > 0 ? e.groggy / GL.CONFIG.rules.groggyTime : e.frac / e.fracMax), 3);
      if (e.elite) { ctx.fillStyle = '#ffd7a8'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(e.name, s.x, y - 5); }
    }
    ctx.textAlign = 'center';
    for (const t of W.tele) {
      if (!t.red) continue;
      const s = G.project(t.x + Math.cos(t.dir || 0) * 40, 70, t.y + Math.sin(t.dir || 0) * 40);
      if (s) { ctx.font = 'bold 28px sans-serif'; ctx.fillStyle = '#ff3b5c'; ctx.fillText('!', s.x, s.y); }
    }
    for (const t of W.texts) {
      const s = G.project(t.x, 60, t.y);
      if (!s) continue;
      ctx.globalAlpha = 1 - t.t / 0.9;
      ctx.font = `bold ${t.size + 2}px sans-serif`;
      const yy = s.y - t.t * 46;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(t.str, s.x, yy);
      ctx.fillStyle = t.color; ctx.fillText(t.str, s.x, yy);
    }
    ctx.globalAlpha = 1;
    if (W.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${W.flash})`; ctx.fillRect(0, 0, cv.width, cv.height); W.flash -= 0.02; }
    if (p.hurtFlash > 0) { ctx.fillStyle = `rgba(255,40,70,${p.hurtFlash})`; ctx.fillRect(0, 0, cv.width, cv.height); }
    if (W.observe.on) { // 관측 중 화면 가장자리 에메랄드
      const g = ctx.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * 0.35, cv.width / 2, cv.height / 2, cv.height * 0.85);
      g.addColorStop(0, 'rgba(63,224,168,0)'); g.addColorStop(1, 'rgba(63,224,168,0.22)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
    }
  },
};
