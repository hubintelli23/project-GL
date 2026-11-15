// ============================================================
// enemies.js — 일반 · 엘리트 적과 각자의 관측/파쇄 기믹
// ============================================================
GL.Enemy = class {
  constructor(type, x, y, cfg) {
    const c = cfg || GL.CONFIG.enemies[type];
    this.type = type; this.cfg = c; this.name = c.name;
    this.x = x; this.y = y; this.r = c.r; this.color = c.color;
    this.maxHp = c.hp; this.hp = c.hp; this.atk = c.atk; this.def = c.def;
    this.fracMax = c.frac; this.frac = c.frac; this.speed = c.speed;
    this.groggy = 0; this.stun = 0; this.markWeak = 0; this.hitFlash = 0;
    this.bleedT = 0; this.defDownT = 0; this.defDown = 0;
    this.facing = 0; this.cd = GL.U.rand(0.8, 1.6); this.dead = false;
    this.elite = !!c.elite; this.boss = false; this.counted = true;
  }
  weakExposed() { return false; }
  player() { return GL.Party.player; }
  distP() { return GL.U.dist(this, this.player()); }
  angP() { return GL.U.angleTo(this, this.player()); }

  startGroggy() {
    this.groggy = GL.CONFIG.rules.groggyTime;
    GL.Combat.text(this.x, this.y - this.r - 24, '그로기!', '#ffe066', 22);
    GL.Combat.shards(this.x, this.y, 18);
    GL.World.shake = Math.max(GL.World.shake, 6);
    if (this.onGroggy) this.onGroggy();
  }

  update(dt) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.markWeak > 0) this.markWeak -= dt;
    if (this.defDownT > 0) this.defDownT -= dt;
    if (this.bleedT > 0) {
      this.bleedT -= dt; this.bleedAcc = (this.bleedAcc || 0) + this.bleedDps * dt;
      if (this.bleedAcc >= 10) { const v = Math.round(this.bleedAcc); this.bleedAcc = 0; this.hp -= v; GL.Combat.text(this.x, this.y - this.r, `${v}`, '#ff6b9a', 12); if (this.hp <= 0) this.die(); }
    }
    if (this.groggy > 0) {
      this.groggy -= dt;
      if (this.groggy <= 0) this.endGroggy();
      return;
    }
    if (this.stun > 0) { this.stun -= dt; return; }
    this.think(dt);
  }

  endGroggy() {
    this.groggy = 0; this.frac = this.fracMax;
    // 일어서며 밀쳐내기 충격파
    const p = this.player(), d = this.distP();
    if (d < this.r + 90) {
      const a = this.angP();
      p.x += Math.cos(a) * 60; p.y += Math.sin(a) * 60;
    }
    GL.Combat.ring(this.x, this.y, this.r + 90, '#ff3b5c', 0.3);
    if (this.onRecover) this.onRecover();
  }

  moveToward(tx, ty, sp, dt) {
    const a = Math.atan2(ty - this.y, tx - this.x);
    this.x += Math.cos(a) * sp * dt; this.y += Math.sin(a) * sp * dt;
  }

  die(noDrop) {
    if (this.dead) return;
    this.dead = true; this.hp = 0;
    GL.Combat.shards(this.x, this.y, 14);
    if (!noDrop && !this.boss && Math.random() < (this.elite ? 1 : 0.3)) {
      GL.World.pickups.push({ x: this.x, y: this.y, kind: 'heal', v: this.elite ? 0.4 : 0.2, t: 0 });
    }
    GL.Stage.onEnemyDeath(this);
  }

  // 공격이 정면에서 들어왔는지 (가드 판정용)
  fromFront(src) {
    const p = src || this.player();
    return Math.abs(GL.U.angDiff(this.facing, GL.U.angleTo(this, p))) < GL.U.deg(70);
  }
};

// ---------- ① 노이즈 파편체 : 자폭 직전 폭발 코어 노출 ----------
GL.Shard = class extends GL.Enemy {
  constructor(x, y) { super('shard', x, y); this.state = 'chase'; }
  weakExposed() { return this.state === 'charge'; }
  think(dt) {
    this.facing = this.angP();
    if (this.state === 'chase') {
      this.moveToward(this.player().x, this.player().y, this.speed, dt);
      if (this.distP() < 70) {
        this.state = 'charge';
        GL.Combat.telegraph({ kind: 'circle', x: this.x, y: this.y, r: this.cfg.blastR, warn: this.cfg.chargeTime, owner: this, follow: true,
          onFire: (t) => {
            if (GL.U.inCircle(t, t.r, { x: GL.Party.player.x, y: GL.Party.player.y, r: 14 })) GL.Combat.hurtPlayer(this.atk, this.cfg.blastCoef, { src: null, ground: true });
            GL.Combat.ring(this.x, this.y, t.r, '#ff3b5c', 0.4);
            this.die(true);
          } });
      }
    }
  }
  onHit(info, opts, weak) {
    if (this.state === 'charge' && weak && opts.shatter) {
      GL.Combat.text(this.x, this.y - 30, '코어 파쇄!', '#3fe0a8', 18);
      this.die();
    }
  }
};

// ---------- ② 데이터 침식자 : 원거리 투사체 (관측 시 궤적 표시, 파쇄로 베어 반사) ----------
GL.Eroder = class extends GL.Enemy {
  constructor(x, y) { super('eroder', x, y); }
  think(dt) {
    const d = this.distP(), c = this.cfg;
    this.facing = this.angP();
    if (d < c.range - 60) this.moveToward(this.x * 2 - this.player().x, this.y * 2 - this.player().y, this.speed, dt);
    else if (d > c.range + 40) this.moveToward(this.player().x, this.player().y, this.speed, dt);
    this.cd -= dt;
    if (this.cd <= 0) {
      this.cd = c.fireEvery;
      const a = this.facing;
      GL.World.eShots.push({ x: this.x, y: this.y, vx: Math.cos(a) * c.shotSpeed, vy: Math.sin(a) * c.shotSpeed, r: 8, life: 2.5, atk: this.atk, coef: c.shotCoef, src: this });
    }
    GL.Stage.clamp(this);
  }
};

// ---------- ④ 균열의 파쇄손 : 정면 가드 -70%, 결합선 파쇄 시 가드 해제 + 그로기 ----------
GL.Clasher = class extends GL.Enemy {
  constructor(x, y) { super('clasher', x, y); this.guardUp = true; }
  weakExposed() { return this.guardUp && this.groggy <= 0; }
  think(dt) {
    const turn = 1.6 * dt, want = this.angP();
    this.facing += GL.U.clamp(GL.U.angDiff(this.facing, want), -turn, turn);
    if (this.distP() > 80) this.moveToward(this.player().x, this.player().y, this.speed, dt);
    this.cd -= dt;
    if (this.cd <= 0 && this.distP() < 110) {
      this.cd = 3;
      GL.Combat.telegraph({ kind: 'arc', x: this.x, y: this.y, dir: this.facing, r: 100, arc: GL.U.deg(100), warn: 0.9, red: true, atk: this.atk, coef: this.cfg.slamCoef, owner: this, ground: true });
    }
  }
  onHit(info, opts, weak) {
    if (!this.guardUp || this.groggy > 0) return;
    if (!this.fromFront()) return;
    if (weak && opts.shatter) {
      this.guardUp = false;
      GL.Combat.text(this.x, this.y - 40, '결합선 파쇄!', '#3fe0a8', 18);
      this.frac = 0; this.startGroggy();
    } else info.dmgMul *= 1 - this.cfg.frontReduce;
  }
  onRecover() { this.guardUp = true; }
};

// ---------- 엘리트 : 아카이브 집행 수호자 : 정면 일반 타격 100% 차단 ----------
GL.Guardian = class extends GL.Enemy {
  constructor(x, y) { super('guardian', x, y); this.shieldUp = true; this.pattern = 0; }
  weakExposed() { return this.shieldUp && this.groggy <= 0; }
  think(dt) {
    const turn = 2.2 * dt, want = this.angP();
    this.facing += GL.U.clamp(GL.U.angDiff(this.facing, want), -turn, turn);
    if (this.distP() > 95) this.moveToward(this.player().x, this.player().y, this.speed, dt);
    this.cd -= dt;
    if (this.cd <= 0 && this.distP() < 170) {
      this.cd = 2.4;
      this.pattern = (this.pattern + 1) % 2;
      if (this.pattern === 0) {
        GL.Combat.telegraph({ kind: 'arc', x: this.x, y: this.y, dir: this.facing, r: 110, arc: GL.U.deg(130), warn: 0.7, red: true, atk: this.atk, coef: this.cfg.swingCoef, owner: this, follow: true, ground: true });
      } else {
        GL.Combat.telegraph({ kind: 'line', x: this.x, y: this.y, dir: this.facing, len: 180, w: 56, warn: 0.8, atk: this.atk, coef: this.cfg.bashCoef, owner: this, ground: true });
      }
    }
  }
  onHit(info, opts, weak) {
    if (!this.shieldUp || this.groggy > 0) return;
    if (weak && opts.shatter) {
      this.shieldUp = false;
      GL.Combat.text(this.x, this.y - 44, '보호막 결합부 파쇄!', '#3fe0a8', 18);
      this.frac = 0; this.startGroggy();
      return;
    }
    if (this.fromFront()) info.blocked = true;
  }
  onRecover() { this.shieldUp = true; }
};

// ---------- 템푸스 2페이즈 : 시차 분신 (3초 전 본체 패턴 재현) ----------
GL.Echo = class extends GL.Enemy {
  constructor(x, y) { super('echo', x, y); this.life = GL.CONFIG.tempus.echoLife; this.counted = false; this.alpha = 0.6; }
  think(dt) {
    this.life -= dt;
    this.facing = this.angP();
    if (this.life <= 0) { GL.Combat.text(this.x, this.y - 30, '소멸', '#9a7bff', 13); this.die(true); }
  }
  replaySlash() {
    if (this.dead) return;
    const T = GL.CONFIG.tempus;
    GL.Combat.telegraph({ kind: 'arc', x: this.x, y: this.y, dir: this.angP(), r: T.slashR * 0.85, arc: GL.U.deg(T.slashArc), warn: 0.8, atk: GL.CONFIG.tempus.atk * T.echoCoef, coef: T.slashCoef, owner: this, ground: true });
  }
};
