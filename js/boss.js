// ============================================================
// boss.js — 인과 보스 1 : 템푸스 (시간의 찌꺼기)
// 1페이즈 시공간 참격 / 지연의 늪 / 약점 노출
// 2페이즈 시차 분신 / 시간 역류(HP 50%)
// 3페이즈 공간 붕괴 충격파 / 전멸기 시간의 톱니바퀴(HP 30%)
// ============================================================
GL.Boss = {
  knots: [],          // 관측 중에만 보이고 파쇄 속성으로만 끊을 수 있는 매듭
  current: null,

  hitKnots(shape, frac, ch) {
    if (!GL.World.observe.on || !this.knots.length) return;
    const R = GL.CONFIG.rules;
    for (const k of this.knots) {
      if (k.frac <= 0) continue;
      if (GL.Combat.inShape(shape, k)) {
        const v = frac * R.weakFracMul * (ch.id === 'ian' ? 1 + GL.CONFIG.chars.ian.passive.weakFracBonus : 1);
        k.frac = Math.max(0, k.frac - v);
        GL.Combat.shards(k.x, k.y, 8);
        GL.Combat.text(k.x, k.y - 26, k.frac <= 0 ? '매듭 절단!' : `-${Math.round(v)}`, '#3fe0a8', k.frac <= 0 ? 18 : 14);
      }
    }
  },
};

GL.Tempus = class extends GL.Enemy {
  constructor(x, y) {
    super('tempus', x, y, GL.CONFIG.tempus);
    this.boss = true; this.title = this.cfg.title;
    this.phase = 1; this.mode = 'idle';
    this.history = []; this.histT = 0;
    this.reversalDone = false; this.doomDone = false;
    this.echoTimer = 0; this.riftT = 2; this.cd = 2;
    this.timers = [];
    GL.Boss.current = this; GL.Boss.knots = [];
  }
  later(t, fn) { this.timers.push({ t, fn }); }
  weakExposed() { return this.mode === 'recover'; }
  hpRatio() { return this.hp / this.maxHp; }

  update(dt) {
    for (const t of this.timers) { t.t -= dt; if (t.t <= 0 && !t.done) { t.done = true; if (!this.dead) t.fn(); } }
    this.timers = this.timers.filter(t => !t.done);
    super.update(dt);
  }

  think(dt) {
    const T = this.cfg, W = GL.World;
    // 시간 역류용 기록 (0.25초 간격, 최근 6초)
    this.histT -= dt;
    if (this.histT <= 0) {
      this.histT = 0.25;
      this.history.push({ t: W.time, hp: this.hp, x: this.x, y: this.y });
      while (this.history.length && W.time - this.history[0].t > 6) this.history.shift();
    }

    // 페이즈 전환
    const hr = this.hpRatio();
    if (this.phase === 1 && hr <= T.phase2) { this.phase = 2; this.announce('2페이즈 : 인과 역류와 환영'); this.spawnEchoes(); }
    if (!this.reversalDone && hr <= T.reversalAt && this.mode !== 'doom') { this.startReversal(); }
    if (this.phase === 2 && hr <= T.phase3 && this.mode !== 'reversal') { this.phase = 3; this.announce('3페이즈 : 붕괴하는 궤적'); this.startDoom(); }

    if (this.mode === 'reversal') return this.updateReversal(dt);
    if (this.mode === 'doom') return this.updateDoom(dt);
    if (this.mode === 'recover') { this.recT -= dt; if (this.recT <= 0) this.mode = 'idle'; return; }

    // 2페이즈 이후 분신 재소환
    if (this.phase >= 2) {
      const alive = W.enemies.some(e => e instanceof GL.Echo && !e.dead);
      if (!alive) { this.echoTimer -= dt; if (this.echoTimer <= 0) this.spawnEchoes(); }
    }
    // 3페이즈 공간 붕괴 충격파
    if (this.phase >= 3) {
      this.riftT -= dt;
      if (this.riftT <= 0) { this.riftT = T.riftEvery; this.spawnRift(); }
    }

    // 이동
    this.facing = this.angP();
    if (this.distP() > 140) this.moveToward(this.player().x, this.player().y, this.speed, dt);
    GL.Stage.clamp(this);

    // 패턴 선택
    this.cd -= dt;
    if (this.cd <= 0) {
      this.cd = this.phase >= 3 ? 1.5 : 1.9;
      if (Math.random() < 0.6 || this.distP() < 200) this.slash();
      else this.swamp();
    }
  }

  announce(str) { GL.UI.banner(str); }

  // ---- 패턴 1 : 시공간 참격 (+1초 뒤 잔상 폭발) ----
  slash() {
    const T = this.cfg, dir = this.angP();
    const x = this.x, y = this.y;
    GL.Combat.telegraph({ kind: 'arc', x, y, dir, r: T.slashR, arc: GL.U.deg(T.slashArc), warn: 0.8, red: true, atk: this.atk, coef: T.slashCoef, owner: this, ground: true,
      onFire: (t) => {
        if (GL.Combat.inShape(t, { x: GL.Party.player.x, y: GL.Party.player.y, r: 14 })) GL.Combat.hurtPlayer(this.atk, T.slashCoef, { red: true, src: this, ground: true });
        GL.Combat.slash(x, y, dir, T.slashR, GL.U.deg(T.slashArc), '#d36bff', 0.3);
        // 잔상 : 같은 자리에 시차를 두고 다시 폭발
        GL.Combat.telegraph({ kind: 'arc', x, y, dir, r: T.slashR, arc: GL.U.deg(T.slashArc), warn: T.ghostDelay, ghost: true, atk: this.atk, coef: T.ghostCoef, owner: null, ground: true });
        // 큰 공격 후 약점 노출
        this.mode = 'recover'; this.recT = T.recover;
        // 2페이즈 : 분신이 3초 뒤 같은 패턴을 재현
        if (this.phase >= 2) this.later(T.echoDelay, () => GL.World.enemies.forEach(e => e instanceof GL.Echo && e.replaySlash()));
      } });
  }

  // ---- 패턴 2 : 지연의 늪 ----
  swamp() {
    const T = this.cfg, p = this.player();
    GL.Combat.telegraph({ kind: 'circle', x: p.x, y: p.y, r: T.swampR, warn: 0.6, atk: 0, coef: 0, owner: this,
      onFire: (t) => GL.World.fields.push({ kind: 'slow', x: t.x, y: t.y, r: T.swampR, life: T.swampTime, slow: T.swampSlow }) });
  }

  spawnEchoes() {
    const T = this.cfg;
    this.echoTimer = 20;
    for (let i = 0; i < T.echoCount; i++) {
      const a = this.angP() + (i === 0 ? 1.6 : -1.6);
      const e = new GL.Echo(this.x + Math.cos(a) * 180, this.y + Math.sin(a) * 180);
      GL.Stage.clamp(e);
      GL.World.enemies.push(e);
    }
    GL.Combat.text(this.x, this.y - 70, '시차 분신', '#9a7bff', 18);
  }

  spawnRift() {
    const T = this.cfg, b = GL.Stage.bounds, p = this.player();
    const near = Math.random() < 0.5;
    const x = near ? p.x + GL.U.rand(-80, 80) : GL.U.rand(b.x + 80, b.x + b.w - 80);
    const y = near ? p.y + GL.U.rand(-80, 80) : GL.U.rand(b.y + 80, b.y + b.h - 80);
    GL.World.fields.push({ kind: 'rift', x, y, r: T.riftR, life: T.riftLife + 1, arm: 1, armed: false, tick: 0, dps: T.riftDps });
  }

  // ---- 2페이즈 기믹 : 시간 역류 ----
  startReversal() {
    const T = this.cfg;
    this.reversalDone = true; this.mode = 'reversal'; this.castT = T.reversalCast;
    GL.World.tele = GL.World.tele.filter(t => t.owner !== this);
    // 지난 5초 동안의 이동 궤적 중앙에 인과 매듭이 생김
    const past = this.history[0] || { x: this.x, y: this.y };
    const mx = (past.x + this.x) / 2 + GL.U.rand(-60, 60), my = (past.y + this.y) / 2 + GL.U.rand(-60, 60);
    GL.Boss.knots = [{ x: mx, y: my, r: 24, frac: T.reversalKnotFrac, max: T.reversalKnotFrac, kind: 'reversal' }];
    if (!GL.World.observe.on) GL.World.observe.cd = 0;   // 기믹 시작 시 관측 쿨타임 초기화
    this.announce('시간 역류 캐스팅 — 관측(Tab)으로 인과 매듭을 찾아 파쇄하라');
  }
  updateReversal(dt) {
    const T = this.cfg;
    this.castT -= dt;
    if (GL.Boss.knots.every(k => k.frac <= 0)) {
      GL.Boss.knots = []; this.mode = 'idle';
      GL.UI.banner('시간 역류 저지!');
      this.frac = 0; this.startGroggy();
      return;
    }
    if (this.castT <= 0) {
      GL.Boss.knots = []; this.mode = 'idle';
      const target = this.history.find(h => GL.World.time - h.t <= T.reversalBack + 0.1) || this.history[0];
      if (target) { this.hp = Math.max(this.hp, target.hp); this.x = target.x; this.y = target.y; }
      GL.UI.banner('시간 역류 — 템푸스가 5초 전으로 되돌아갔다');
      GL.Combat.ring(this.x, this.y, 160, '#d36bff', 0.6);
    }
  }

  // ---- 3페이즈 전멸기 : 시간의 톱니바퀴 ----
  startDoom() {
    const T = this.cfg, b = GL.Stage.bounds;
    this.doomDone = true; this.mode = 'doom'; this.doomT = T.doomTime;
    GL.World.tele = GL.World.tele.filter(t => t.owner !== this);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, off = Math.random() * 6.28;
    GL.Boss.knots = [];
    for (let i = 0; i < T.doomKnots; i++) {
      const a = off + i * Math.PI * 2 / T.doomKnots;
      GL.Boss.knots.push({ x: cx + Math.cos(a) * 300, y: cy + Math.sin(a) * 230, r: 24, frac: T.doomKnotFrac, max: T.doomKnotFrac, kind: 'doom' });
    }
    this.x = cx; this.y = cy;
    if (!GL.World.observe.on) GL.World.observe.cd = 0;   // 기믹 시작 시 관측 쿨타임 초기화
    this.announce('[전멸기] 시간의 톱니바퀴 — 10초 안에 시간의 매듭 3개를 끊어라');
  }
  updateDoom(dt) {
    this.doomT -= dt;
    GL.World.mono = Math.min(1, GL.World.mono + dt * 2);
    if (GL.Boss.knots.every(k => k.frac <= 0)) {
      GL.Boss.knots = []; this.mode = 'idle'; GL.World.mono = 0;
      GL.UI.banner('전멸기 저지! 극딜 타임');
      this.frac = 0; this.startGroggy();
      return;
    }
    if (this.doomT <= 0) {
      GL.Boss.knots = []; this.mode = 'idle'; GL.World.mono = 0;
      GL.UI.banner('시간의 톱니바퀴 — 파티 전멸');
      for (const m of GL.Party.members) m.hp = 0;
      GL.Main.gameOver();
    }
  }

  die() {
    if (this.dead) return;
    this.dead = true; this.hp = 0;
    GL.Boss.knots = []; GL.World.mono = 0;
    GL.Combat.shards(this.x, this.y, 60);
    GL.World.shake = 16;
    GL.World.enemies.forEach(e => { if (e instanceof GL.Echo) e.die(true); });
    GL.Stage.onBossDefeated();
  }
};
