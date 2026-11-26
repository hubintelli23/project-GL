// ============================================================
// render.js — 3인칭 백뷰 카메라 + 그리는 순서만 담당 (v0.5)
// 모델은 모두 js/assets/ 아래 파일에 있음
//   characters.js 아바타 캐릭터 · monsters.js 적/보스 · weapons.js 무기 아티팩트
//   effects.js 이펙트 · background.js 배경
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

  // 스테이지가 바뀔 때 배경 배치 (assets/background.js)
  buildProps() { GL.Assets.Background.build(); },

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
    const G = GL.G3, W = GL.World, t = W.time, A = GL.Assets;
    const obs = W.observe.on ? 1 : 0;
    G.frame.mono = Math.max(W.mono || 0, GL.Ian.monoLevel());   // 전멸기 · 인과 역류 흑백
    G.begin(this.camera());
    G.resetProgram();

    // 1) 하늘 · 바닥
    A.Background.drawBase(G, t, obs);
    // 2) 불투명 : 배경 구조물 → 캐릭터 → 적 → 이펙트(투사체·파편·아이템)
    A.Background.drawSolid(G, t, obs);
    A.Characters.drawPlayer(G);
    for (const e of W.enemies) if (!e.dead && !(e instanceof GL.Echo)) A.Monsters.draw(G, e);
    A.Effects.solid(G);
    // 3) 반투명 : 바닥 데칼 → 시차 분신(유령) → 빛 더하기
    const gl = G.gl;
    gl.depthMask(false);
    A.Effects.decals(G);
    for (const e of W.enemies) if (!e.dead && e instanceof GL.Echo) A.Monsters.draw(G, e);
    A.Background.drawGlow(G, t, obs);
    A.Effects.glow(G);
    A.Effects.debug(G);
    gl.depthMask(true);

    this.drawOverlay();
  },

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
      if (e.marks > 0) {   // 이안 파쇄 흔적 (소거 가능하면 밝게)
        const ok = e.marks >= GL.CONFIG.chars.ian.erasure.markNeed;
        ctx.fillStyle = ok ? '#6b9cff' : 'rgba(42,107,255,0.7)'; ctx.fillRect(x, y + 8, w * e.marks / 100, ok ? 3 : 2);
      }
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
