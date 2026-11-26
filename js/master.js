// ============================================================
// master.js — 마스터 모드 (테스트 모드)
//   PC     : ` (숫자 1 왼쪽 키) = 진입 / 나가기,  H = 패널 열기 / 숨기기 (옵션 유지)
//   휴대폰 : 세 손가락으로 탭 = 진입 / 나가기,  화면 위 MASTER 표시 탭 = 패널 열기
// 패널이 열려 있는 동안 게임은 멈춘다. 나가면 모든 테스트 옵션이 꺼진다.
// ============================================================
GL.Master = {
  active: false,
  panel: false,
  speed: 1,
  shapes: [],           // 판정 범위 표시용 (최근 공격 범위)
  opt: { god: false, noCd: false, fullUlt: false, oneShot: false, freeze: false, infObs: false, hitbox: false, info: true },
  buttons: [],
  fps: 60, _fpsAcc: 0, _fpsN: 0,

  TOGGLES: [
    ['god', '무적'], ['noCd', '쿨타임 없음'], ['fullUlt', '궁극기 항상 가득'], ['oneShot', '원샷 (피해 x100)'],
    ['freeze', '적 정지'], ['infObs', '관측 무한'], ['hitbox', '판정 범위 표시'], ['info', '정보 표시'],
  ],
  ACTIONS: [
    ['heal', '파티 전원 회복'], ['killAll', '일반 적 전부 처치'], ['speed', '게임 속도'],
    ['wave1', '필드 웨이브 1'], ['wave2', '필드 웨이브 2'], ['wave3', '필드 웨이브 3 (엘리트)'],
    ['boss', '보스전 처음부터'], ['phase2', '보스 2페이즈 (70%)'], ['reversal', '시간 역류 (50%)'],
    ['doom', '3페이즈 · 전멸기 (30%)'], ['groggy', '보스 그로기'], ['portal', '포털 열기'],
    ['spawn:shard', '파편체 소환'], ['spawn:eroder', '침식자 소환'], ['spawn:clasher', '파쇄손 소환'],
    ['spawn:guardian', '수호자 소환'],
    ['reaction', '이안 반작용 +40'], ['party', '파티 편성 화면'],
  ],

  // ---------- 진입 / 나가기 ----------
  toggle() {
    const M = GL.Main;
    if (!['play', 'pause', 'master'].includes(M.state)) return;
    if (!this.active) {
      this.active = true; this.openPanel();
      GL.UI.banner('마스터 모드 진입');
    } else {
      this.active = false; this.panel = false; this.speed = 1; this.shapes = [];
      for (const k in this.opt) this.opt[k] = k === 'info';
      if (M.state === 'master') M.state = 'play';
      GL.UI.banner('마스터 모드 종료 — 테스트 옵션 모두 꺼짐');
    }
  },
  togglePanel() {
    if (!this.active) return;
    if (this.panel) this.closePanel(); else this.openPanel();
  },
  openPanel() {
    this.panel = true;
    if (GL.Main.state === 'play' || GL.Main.state === 'pause') GL.Main.state = 'master';
    GL.Input.unlock();
  },
  closePanel() {
    this.panel = false;
    if (GL.Main.state === 'master') GL.Main.state = 'play';
  },

  // ---------- 매 프레임 적용 ----------
  update(dt) {
    this._fpsAcc += dt; this._fpsN++;
    if (this._fpsAcc >= 0.5) { this.fps = Math.round(this._fpsN / this._fpsAcc); this._fpsAcc = 0; this._fpsN = 0; }
    if (!this.active) return;
    const P = GL.Party, W = GL.World, O = this.opt;
    if (O.noCd) {
      for (const m of P.members) { m.cd.q = 0; m.cd.e = 0; m.cd.assist = 0; }
      P.tagCd = 0; P.player.dodgeCharges = GL.CONFIG.rules.dodgeCharges;
      if (!W.observe.on) W.observe.cd = 0;
    }
    if (O.fullUlt) for (const m of P.members) m.ult = m.ultMax;
    if (O.infObs && W.observe.on) W.observe.t = GL.CONFIG.rules.observeDuration;
    for (const s of this.shapes) s.life -= dt;
    this.shapes = this.shapes.filter(s => s.life > 0);
  },
  dmgMul() { return this.active && this.opt.oneShot ? 100 : 1; },
  god() { return this.active && this.opt.god; },
  frozen() { return this.active && this.opt.freeze; },
  timeScale() { return this.active ? this.speed : 1; },
  recordShape(s) { if (this.active && this.opt.hitbox) this.shapes.push({ ...s, life: 0.4 }); },

  // ---------- 동작 ----------
  run(id) {
    const S = GL.Stage, W = GL.World, P = GL.Party;
    const boss = () => { if (S.name !== 'boss' || !GL.Boss.current || GL.Boss.current.dead) S.start('boss'); return GL.Boss.current; };
    if (id === 'speed') { this.speed = this.speed === 1 ? 2 : (this.speed === 2 ? 0.5 : 1); return; }
    if (id === 'heal') {
      for (const m of P.members) m.hp = m.maxHp;
      GL.Combat.text(P.player.x, P.player.y - 40, '전원 회복', '#3fe0a8', 16);
    } else if (id === 'killAll') {
      for (const e of W.enemies) if (!e.dead && !e.boss) e.die(true);
    } else if (id.startsWith('wave')) {
      const n = parseInt(id.slice(4), 10);
      S.start('field'); S.wave = n - 1; S.waveDelay = 0.05;
    } else if (id === 'boss') {
      S.start('boss');
    } else if (id === 'phase2') {
      const b = boss(); b.hp = b.maxHp * 0.69;
    } else if (id === 'reversal') {
      const b = boss(); b.phase = 2; b.reversalDone = false; b.hp = b.maxHp * 0.49;
    } else if (id === 'doom') {
      const b = boss(); b.phase = 2; b.reversalDone = true; b.mode = 'idle'; GL.Boss.knots = []; b.hp = b.maxHp * 0.29;
    } else if (id === 'groggy') {
      const b = boss(); b.frac = 0; b.startGroggy();
    } else if (id === 'portal') {
      if (S.name !== 'field') S.start('field');
      for (const e of W.enemies) if (!e.dead) e.die(true);
      S.wave = S.WAVES.length; S.waveDelay = 0;
      S.portal = { x: 1550, y: 650, r: 40 }; S.hint = '포털이 열렸다 — F로 진입';
    } else if (id === 'reaction') {
      if (!GL.Ian.backflow) { GL.Ian.reaction = Math.min(100, GL.Ian.reaction + 40); GL.Ian.sinceErase = 0; }
    } else if (id === 'party') {
      this.panel = false; GL.Main.state = 'party'; return;
    } else if (id.startsWith('spawn:')) {
      const type = id.slice(6), cls = { shard: GL.Shard, eroder: GL.Eroder, clasher: GL.Clasher, guardian: GL.Guardian }[type];
      const f = GL.Render.forward(), p = P.player;
      const e = new cls(p.x + f.x * 180, p.y + f.y * 180); e.counted = false; S.clamp(e);
      W.enemies.push(e);
    }
    // 장면이 바뀌는 동작은 패널을 닫고 바로 보여줌
    if (id !== 'heal') this.closePanel();
  },

  // ---------- 그리기 ----------
  layout(cv) {
    const touch = GL.Touch.enabled;
    const cols = 3, bw = Math.min(touch ? 168 : 200, (cv.width - 60) / cols), bh = touch ? 26 : 30, gap = 6;
    const rows = Math.ceil(this.TOGGLES.length / cols) + Math.ceil(this.ACTIONS.length / cols) + 1;
    const W = cols * bw + (cols - 1) * gap, H = 44 + rows * (bh + gap) + 22;
    const x0 = (cv.width - W) / 2, y0 = Math.max(6, (cv.height - H) / 2);
    const list = [];
    let y = y0 + 40;
    const place = (items, kind) => {
      items.forEach(([id, label], i) => {
        const c = i % cols, r = Math.floor(i / cols);
        list.push({ id, label, kind, x: x0 + c * (bw + gap), y: y + r * (bh + gap), w: bw, h: bh });
      });
      y += Math.ceil(items.length / cols) * (bh + gap) + 8;
    };
    place(this.TOGGLES, 'toggle');
    place(this.ACTIONS, 'action');
    place([['hide', 'H  패널 숨기기 (옵션 유지)'], ['exit', '`  마스터 모드 나가기'], ['close', '닫고 계속하기']], 'sys');
    this.box = { x: x0 - 14, y: y0, w: W + 28, h: y - y0 + 2 };
    this.buttons = list;
    return list;
  },

  click(x, y) {
    if (!this.panel) return false;
    for (const b of this.buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (b.kind === 'toggle') this.opt[b.id] = !this.opt[b.id];
        else if (b.id === 'hide' || b.id === 'close') this.closePanel();
        else if (b.id === 'exit') this.toggle();
        else this.run(b.id);
        return true;
      }
    }
    return false;
  },

  badgeHit(x, y) { const r = this.badgeRect; return this.active && !this.panel && r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; },

  draw(ctx, cv) {
    if (!this.active) return;
    const touch = GL.Touch.enabled;
    ctx.save();
    // MASTER 표시 (패널 닫혀 있을 때)
    const on = Object.entries(this.opt).filter(([k, v]) => v && k !== 'info').map(([k]) => this.TOGGLES.find(t => t[0] === k)[1]);
    if (this.speed !== 1) on.push(`속도 x${this.speed}`);
    const label = `MASTER ${on.length ? '· ' + on.join(' · ') : ''}`;
    ctx.font = 'bold 12px sans-serif';
    const bw = Math.min(cv.width * 0.5, ctx.measureText(label).width + 20);
    const bx = cv.width / 2 - bw / 2, by = cv.height - (touch ? 30 : 128);
    this.badgeRect = { x: bx, y: by, w: bw, h: 22 };
    ctx.fillStyle = 'rgba(255,60,90,0.85)'; ctx.fillRect(bx, by, bw, 22);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    let lab = label; while (ctx.measureText(lab).width > bw - 12 && lab.length > 8) lab = lab.slice(0, -2);
    ctx.fillText(lab === label ? label : lab + '…', cv.width / 2, by + 15);
    // 정보 표시
    if (this.opt.info) {
      const p = GL.Party.player, b = GL.Boss.current;
      const lines = [
        `FPS ${this.fps}   속도 x${this.speed}`,
        `위치 ${Math.round(p.x)}, ${Math.round(p.y)}  높이 ${Math.round(p.z)}`,
        `스테이지 ${GL.Stage.name}  웨이브 ${GL.Stage.wave + 1}  적 ${GL.World.enemies.filter(e => !e.dead).length}`,
        b && !b.dead ? `템푸스 HP ${(b.hp / b.maxHp * 100).toFixed(1)}%  ${b.phase}페이즈  ${b.mode}  파쇄 ${Math.ceil(b.frac)}` : '보스 없음',
        `관측 ${GL.World.observe.on ? '켜짐 ' + GL.World.observe.t.toFixed(1) : '쿨 ' + GL.World.observe.cd.toFixed(1)}`,
      ];
      const x = touch ? cv.width - 210 : cv.width - 230, y = touch ? 56 : 210;
      ctx.fillStyle = 'rgba(40,0,10,0.7)'; ctx.fillRect(x, y, touch ? 200 : 216, lines.length * 15 + 10);
      ctx.fillStyle = '#ffd0d8'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
      lines.forEach((l, i) => ctx.fillText(l, x + 8, y + 17 + i * 15));
    }
    if (!this.panel) { ctx.restore(); return; }
    // 패널
    this.layout(cv);
    const B = this.box;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(14,6,14,0.94)'; ctx.fillRect(B.x, B.y, B.w, B.h);
    ctx.strokeStyle = '#ff3b5c'; ctx.lineWidth = 2; ctx.strokeRect(B.x, B.y, B.w, B.h);
    ctx.textAlign = 'left'; ctx.fillStyle = '#ff3b5c'; ctx.font = `bold ${touch ? 15 : 18}px sans-serif`;
    ctx.fillText('MASTER MODE · 테스트 모드', B.x + 14, B.y + 26);
    ctx.textAlign = 'right'; ctx.fillStyle = '#c9a0aa'; ctx.font = '11px sans-serif';
    ctx.fillText(touch ? '세 손가락 탭 = 나가기  ·  MASTER 표시 탭 = 패널' : '` = 나가기  ·  H = 패널 숨기기  ·  게임 일시정지 중', B.x + B.w - 14, B.y + 26);
    for (const b of this.buttons) {
      const on = b.kind === 'toggle' && this.opt[b.id];
      ctx.fillStyle = on ? 'rgba(255,60,90,0.85)' : (b.kind === 'sys' ? 'rgba(60,40,60,0.9)' : 'rgba(40,28,44,0.9)');
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = on ? '#ffd0d8' : 'rgba(255,120,150,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.font = `${touch ? 11 : 13}px sans-serif`;
      let text = b.label;
      if (b.kind === 'toggle') text = `${on ? '■' : '□'}  ${b.label}`;
      if (b.id === 'speed') text = `게임 속도 x${this.speed}`;
      ctx.fillText(text, b.x + b.w / 2, b.y + b.h / 2 + 4);
    }
    ctx.restore();
  },
};
