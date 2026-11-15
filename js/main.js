// ============================================================
// main.js — 게임 루프, 화면 상태(타이틀/플레이/일시정지/패배/승리), 충돌 정리
// ============================================================
GL.Main = {
  state: 'title',
  startTime: 0, endTime: 0,

  init() {
    const cv = document.getElementById('game'), cv3 = document.getElementById('gl3d');
    this.cv = cv;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = window.innerWidth; cv.height = window.innerHeight;
      cv3.width = Math.floor(window.innerWidth * dpr); cv3.height = Math.floor(window.innerHeight * dpr);
    };
    window.addEventListener('resize', resize); resize();
    try { GL.Render.init(cv3, cv); }
    catch (e) { this.fatal = 'WebGL을 켤 수 없는 브라우저입니다: ' + e.message; }
    GL.Input.init(cv);
    GL.Input.isAirborne = () => GL.Party.isAirborne();
    GL.World.reset();
    GL.Party.init();
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  },

  newGame() {
    GL.Party.init();
    GL.Stage.start('field');
    this.state = 'play';
    this.startTime = GL.World.time; this.elapsed = 0;
  },

  retryStage() {
    const name = GL.Stage.name;
    for (const m of GL.Party.members) { m.hp = m.maxHp; m.cd = { q: 0, e: 0, assist: 0 }; }
    GL.Party.activeIdx = 0;
    GL.Stage.start(name);
    this.state = 'play';
  },

  gameOver() { if (this.state === 'play') { this.state = 'over'; GL.Input.unlock(); } },
  win() { this.state = 'win'; GL.Input.unlock(); },
  clearTime() { const s = Math.floor(this.elapsed || 0); return `${Math.floor(s / 60)}분 ${s % 60}초`; },

  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
    if (this.fatal) { const c = this.cv.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, this.cv.width, this.cv.height); c.fillStyle = '#fff'; c.font = '18px sans-serif'; c.fillText(this.fatal, 40, 60); return; }
    if (this.state !== 'title') GL.Render.draw();
    GL.UI.draw(GL.Render.ctx, this.cv);
    requestAnimationFrame((t) => this.loop(t));
  },

  update(dt) {
    const I = GL.Input;
    I.update(dt);
    const events = I.consume();

    // 화면 상태별 공통 입력
    for (const ev of events) {
      if (this.state === 'title' && (ev.type === 'confirm' || ev.type === 'click')) { this.newGame(); return; }
      if (this.state === 'over' && ev.type === 'confirm') { this.retryStage(); return; }
      if (this.state === 'win' && ev.type === 'confirm') { this.newGame(); return; }
      if (ev.type === 'pause' && (this.state === 'play' || this.state === 'pause')) {
        if (this.state === 'play') { this.state = 'pause'; I.unlock(); } else { this.state = 'play'; }
        return;
      }
      if (this.state === 'pause' && ev.type === 'click') { this.state = 'play'; return; }
      if (ev.type === 'map' && this.state === 'play') GL.UI.mapOpen = !GL.UI.mapOpen;
    }
    if (this.state !== 'play') return;

    for (const ev of events) {
      if (ev.type === 'interact') GL.Stage.interact();
      else GL.Party.handle(ev);
      if (this.state !== 'play') return;
    }

    GL.World.time += dt; this.elapsed = (this.elapsed || 0) + dt;
    GL.Render.updateCamera(dt);
    GL.Party.update(dt);
    for (const e of GL.World.enemies) if (!e.dead) e.update(dt);
    this.separate();
    GL.Combat.update(dt);
    GL.Stage.update(dt);
    GL.World.enemies = GL.World.enemies.filter(e => !e.dead);
  },

  // 적끼리, 적과 플레이어가 겹치지 않게 밀어냄
  separate() {
    const list = GL.World.enemies, p = GL.Party.player;
    for (let i = 0; i < list.length; i++) {
      const a = list[i]; if (a.dead) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]; if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r;
        if (d < min) {
          const push = (min - d) / 2, nx = dx / d, ny = dy / d;
          const wa = a.boss ? 0 : 1, wb = b.boss ? 0 : 1;
          a.x -= nx * push * wa * (wb ? 1 : 2); a.y -= ny * push * wa * (wb ? 1 : 2);
          b.x += nx * push * wb * (wa ? 1 : 2); b.y += ny * push * wb * (wa ? 1 : 2);
        }
      }
      if (p.z < 20 && !p.dash) {
        const dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = a.r + p.r;
        if (d < min) { p.x += dx / d * (min - d); p.y += dy / d * (min - d); }
      }
      GL.Stage.clamp(a);
    }
    GL.Stage.clamp(p);
  },
};

window.addEventListener('load', () => GL.Main.init());
