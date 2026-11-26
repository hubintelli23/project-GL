// ============================================================
// main.js — 게임 루프, 화면 상태(타이틀/플레이/일시정지/패배/승리), 충돌 정리
// ============================================================
GL.Main = {
  state: 'title',
  startTime: 0, endTime: 0,

  init() {
    const cv = document.getElementById('game'), cv3 = document.getElementById('gl3d');
    this.cv = cv;
    // 화면 크기 : 휴대폰 주소창이 접히거나 화면을 돌릴 때도 다시 맞춤
    const resize = () => {
      const vv = window.visualViewport;
      const w = Math.round(vv ? vv.width : window.innerWidth), h = Math.round(vv ? vv.height : window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, GL.Touch.enabled ? 1.5 : 2);   // 휴대폰은 발열·속도 위해 1.5배까지
      cv.width = w; cv.height = h;
      cv3.width = Math.floor(w * dpr); cv3.height = Math.floor(h * dpr);
      cv.style.width = cv3.style.width = w + 'px'; cv.style.height = cv3.style.height = h + 'px';
    };
    this.resize = resize;
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 250));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    GL.Touch.init(cv);          // 터치 감지를 먼저 해야 그래픽 설정(저전력)을 고를 수 있음
    resize();
    try { GL.Render.init(cv3, cv); }
    catch (e) { this.fatal = 'WebGL을 켤 수 없는 브라우저입니다: ' + e.message; }
    // 휴대폰에서 앱 전환 등으로 그래픽이 끊기면 탭해서 다시 불러오기
    cv3.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.fatal = '그래픽이 끊겼습니다. 화면을 탭하면 다시 불러옵니다.'; this.reloadOnTap = true; });
    const reload = () => { if (this.reloadOnTap) location.reload(); };
    cv.addEventListener('touchstart', reload); cv.addEventListener('mousedown', reload);
    // 다른 앱으로 나갔다 오면 일시정지
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'play') this.state = 'pause'; });
    GL.Input.init(cv);
    GL.Haptics.init();
    GL.PartySelect.init();
    GL.Input.isAirborne = () => GL.Party.isAirborne();
    GL.World.reset();
    GL.Party.init();
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  },

  newGame(ids) {
    GL.Party.init(ids || GL.PartySelect.chosen());
    GL.Stage.start('field');
    this.state = 'play';
    this.startTime = GL.World.time; this.elapsed = 0;
  },

  retryStage() {
    const name = GL.Stage.name;
    for (const m of GL.Party.members) { m.hp = m.maxHp; m.cd = { q: 0, e: 0, assist: 0 }; }
    GL.Party.activeIdx = 0;
    GL.Ian.reset();
    GL.Stage.start(name);
    this.state = 'play';
  },

  gameOver() { if (this.state === 'play') { this.state = 'over'; GL.Input.unlock(); GL.Haptics.gameOver(); } },
  win() { this.state = 'win'; GL.Input.unlock(); GL.Haptics.win(); },
  clearTime() { const s = Math.floor(this.elapsed || 0); return `${Math.floor(s / 60)}분 ${s % 60}초`; },

  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
    if (this.fatal) {
      const c = this.cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = '#05070d'; c.fillRect(0, 0, this.cv.width, this.cv.height);
      c.fillStyle = '#fff'; c.font = '16px sans-serif'; c.textAlign = 'center';
      c.fillText(this.fatal, this.cv.width / 2, this.cv.height / 2);
      requestAnimationFrame((t) => this.loop(t)); return;
    }
    // 휴대폰 세로 화면이면 가로로 돌리라는 안내만 표시 (게임은 멈춤)
    if (GL.Touch.enabled && this.cv.height > this.cv.width) { GL.Touch.drawRotate(GL.Render.ctx, this.cv); if (this.state === 'play') this.state = 'pause'; requestAnimationFrame((t) => this.loop(t)); return; }   // v0.4 : 세로 화면에서 루프가 멈추던 버그 수정
    if (this.state === 'party') { GL.PartySelect.draw(GL.Render.ctx, this.cv); requestAnimationFrame((t) => this.loop(t)); return; }   // 파티 편성 화면
    if (this.state !== 'title') GL.Render.draw();
    GL.UI.draw(GL.Render.ctx, this.cv);
    requestAnimationFrame((t) => this.loop(t));
  },

  update(dt) {
    const I = GL.Input;
    I.update(dt);
    const events = I.consume();

    // 화면 상태별 공통 입력
    // 세 손가락 탭은 손가락이 몇 ms 차이로 닿아 같은 프레임에 탭이 섞여 들어옴 → 마스터 전환만 처리
    const evs = events.some(e => e.type === 'master') ? events.filter(e => e.type !== 'click') : events;
    for (const ev of evs) {
      if (ev.type === 'click' && ev.value) { I.mouse.x = ev.value.x; I.mouse.y = ev.value.y; }   // 같은 프레임 연속 클릭도 각자 좌표로
      // 마스터 모드 (테스트)
      if (ev.type === 'master') { GL.Master.toggle(); continue; }
      if (ev.type === 'masterPanel') { GL.Master.togglePanel(); continue; }
      if (this.state === 'master') { if (ev.type === 'click') GL.Master.click(I.mouse.x, I.mouse.y); if (ev.type === 'pause') GL.Master.closePanel(); continue; }
      if (this.state === 'title' && (ev.type === 'confirm' || ev.type === 'click')) { this.state = 'party'; return; }   // 타이틀 → 파티 편성
      if (this.state === 'party') {
        if (ev.type === 'click') GL.PartySelect.click(I.mouse.x, I.mouse.y);
        else if (ev.type === 'confirm') GL.PartySelect.start();
        else if (ev.type === 'pause') this.state = 'title';
        if (this.state !== 'party') return;
        continue;
      }
      if (this.state === 'over' && (ev.type === 'confirm' || ev.type === 'click')) { this.retryStage(); return; }
      if (this.state === 'win' && (ev.type === 'confirm' || ev.type === 'click')) { this.newGame(); return; }
      if (ev.type === 'pause' && (this.state === 'play' || this.state === 'pause')) {
        if (this.state === 'play') { this.state = 'pause'; I.unlock(); } else { this.state = 'play'; }
        return;
      }
      if (ev.type === 'vibe') { const on = GL.Haptics.toggle(); GL.UI.banner(on ? '진동 켜짐' : '진동 꺼짐'); continue; }
      if (this.state === 'pause' && ev.type === 'click') {
        const b = GL.UI.vibeBtn, x = I.mouse.x, y = I.mouse.y;
        if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { GL.Haptics.toggle(); continue; }
        const vt = GL.UI.vibeTestBtn;   // 진동 테스트
        if (vt && x >= vt.x && x <= vt.x + vt.w && y >= vt.y && y <= vt.y + vt.h) { GL.Haptics.test(); continue; }
        const pb = GL.UI.partyBtn;   // 파티 다시 편성 (처음부터)
        if (pb && x >= pb.x && x <= pb.x + pb.w && y >= pb.y && y <= pb.y + pb.h) { this.state = 'party'; return; }
        this.state = 'play'; return;
      }
      if (ev.type === 'map' && this.state === 'play') GL.UI.mapOpen = !GL.UI.mapOpen;
    }
    GL.Master.update(dt);
    if (this.state !== 'play') return;
    dt *= GL.Master.timeScale();

    for (const ev of events) {
      if (ev.type === 'interact') GL.Stage.interact();
      else GL.Party.handle(ev);
      if (this.state !== 'play') return;
    }

    GL.World.time += dt; this.elapsed = (this.elapsed || 0) + dt;
    GL.Render.updateCamera(dt);
    GL.Party.update(dt);
    if (!GL.Master.frozen()) for (const e of GL.World.enemies) if (!e.dead) e.update(dt);
    this.separate();
    GL.Combat.update(dt);
    GL.Haptics.watchShake(GL.World.shake);   // 화면 흔들림 → 진동
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
