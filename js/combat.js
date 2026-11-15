// ============================================================
// combat.js — 피해 공식, 파쇄 게이지, 그로기, 관측, 판정, 이펙트
// ============================================================
GL.World = {
  reset() {
    this.time = 0;
    this.enemies = [];
    this.pShots = [];     // 플레이어 투사체
    this.eShots = [];     // 적 투사체
    this.tele = [];       // 적 공격 예고(텔레그래프)
    this.fields = [];     // 장판 (지연의 늪, 균열, 공간 절단 지대)
    this.fx = [];         // 이펙트
    this.texts = [];      // 떠오르는 숫자
    this.pickups = [];    // 회복 데이터 (F로 줍기)
    this.shake = 0;
    this.observe = { on: false, t: 0, cd: 0 };
    this.buffs = { shield: 0, shieldT: 0, fortress: 0, barrier: 0, defDown: 0, weakAll: 0 };
    this.mono = 0;        // 화면 흑백 정도 (전멸기)
  },
};

GL.Combat = {
  R: () => GL.CONFIG.rules,

  // ---------- 관측 ----------
  toggleObserve() {
    const o = GL.World.observe, R = this.R();
    if (o.on) { o.on = false; o.cd = R.observeCooldown; return; }
    if (o.cd > 0) { this.text(GL.Party.player.x, GL.Party.player.y - 40, `관측 대기 ${o.cd.toFixed(1)}초`, '#9fb3c8', 14); return; }
    o.on = true; o.t = R.observeDuration;
    this.ring(GL.Party.player.x, GL.Party.player.y, 400, '#3fe0a8', 0.5);
  },
  updateObserve(dt) {
    const o = GL.World.observe;
    if (o.on) { o.t -= dt; if (o.t <= 0) { o.on = false; o.cd = this.R().observeCooldown; } }
    else if (o.cd > 0) o.cd = Math.max(0, o.cd - dt);
  },
  // 약점이 지금 보이는가 (관측 중 / 이안 E / 케이 조력)
  weakVisible(e) {
    if (!e.weakExposed || !e.weakExposed()) return false;
    return GL.World.observe.on || GL.World.buffs.weakAll > 0 || e.markWeak > 0;
  },

  // ---------- 플레이어 → 적 ----------
  hitEnemy(e, ch, coef, frac, opts = {}) {
    if (!e || e.dead) return 0;
    const R = this.R();
    const weak = this.weakVisible(e);
    const info = { dmgMul: 1, fracMul: 1, blocked: false, silent: false };
    if (weak) {
      info.fracMul *= R.weakFracMul;
      if (ch.id === 'ian') info.fracMul *= 1 + GL.CONFIG.chars.ian.passive.weakFracBonus;
      if (e.markWeak > 0) info.dmgMul *= 1 + GL.CONFIG.chars.ian.e.weakDmgBonus;
    }
    // 패링 반사는 가드·보호막을 무시하고 들어감
    if (e.onHit && !opts.parry) e.onHit(info, opts, weak, ch);
    if (e.dead) return 0;                       // 기믹으로 즉사 처리된 경우
    if (info.blocked) {
      if (!info.silent) this.text(e.x, e.y - e.r - 10, '차단', '#9fb3c8', 14);
      this.sparks(e.x, e.y, 4, '#cfe3ff');
      return 0;
    }
    const groggy = e.groggy > 0;
    let def = groggy ? 0 : e.def * (1 - GL.World.buffs.defDown - (e.defDownT > 0 ? e.defDown : 0));
    def = Math.max(0, def);
    let critRate = R.critRate + (ch.id === 'kay' && weak ? GL.CONFIG.chars.kay.passive.weakCritBonus : 0);
    if (GL.Party.critBuff > 0) critRate += 0.3;
    const crit = groggy || Math.random() < critRate;
    let dmg = ch.atk * coef / 100 * 100 / (100 + def) * info.dmgMul;
    if (crit) dmg *= R.critMul;
    if (groggy) dmg *= R.groggyDmgMul;
    if (opts.fixed) dmg = opts.fixed;
    dmg = Math.round(dmg);

    e.hp -= dmg;
    if (!groggy && frac > 0 && e.fracMax > 0) {
      e.frac -= frac * info.fracMul;
      if (e.frac <= 0) { e.frac = 0; e.startGroggy(); }
    }
    ch.ult = Math.min(ch.ultMax, ch.ult + (opts.skill ? R.ultPerSkillHit : R.ultPerHit));
    if (!e.boss) {
      if (opts.stun) e.stun = Math.max(e.stun, opts.stun);
      if (opts.knock && opts.dir !== undefined) { e.x += Math.cos(opts.dir) * opts.knock; e.y += Math.sin(opts.dir) * opts.knock; }
    }
    if (opts.bleed) { e.bleedT = opts.bleed.t; e.bleedDps = opts.bleed.dps; e.bleedCh = ch; }
    if (opts.defDown) { e.defDown = opts.defDown.v; e.defDownT = opts.defDown.t; }

    const col = groggy ? '#ffe066' : (weak ? '#3fe0a8' : (crit ? '#ffd27a' : '#ffffff'));
    this.text(e.x + GL.U.rand(-12, 12), e.y - e.r - 6, (crit ? '★' : '') + dmg, col, crit || groggy ? 20 : 15);
    if (weak && frac > 0) this.sparks(e.x, e.y, 5, '#3fe0a8');
    if (frac >= 6) this.shards(e.x, e.y, 6);
    e.hitFlash = 0.08;
    if (e.hp <= 0) e.die();
    return dmg;
  },

  // 범위 판정으로 여러 적을 한 번에 때림
  hitArea(shape, ch, coef, frac, opts = {}) {
    let n = 0;
    for (const e of GL.World.enemies) {
      if (e.dead || (opts.hitSet && opts.hitSet.has(e))) continue;
      if (this.inShape(shape, e)) {
        this.hitEnemy(e, ch, coef, frac, { ...opts, dir: shape.dir !== undefined ? shape.dir : GL.U.angleTo(shape, e) });
        if (opts.hitSet) opts.hitSet.add(e);
        n++;
      }
    }
    // 파쇄 속성 공격은 날아오는 적 투사체를 베어서 반사
    if (opts.shatter) {
      for (const s of GL.World.eShots) {
        if (s.dead) continue;
        if (this.inShape(shape, s)) {
          s.dead = true;
          this.shards(s.x, s.y, 5);
          this.text(s.x, s.y - 14, '투사체 파쇄', '#3fe0a8', 13);
          if (s.src && !s.src.dead) {
            const a = GL.U.angleTo(s, s.src);
            GL.World.pShots.push({ x: s.x, y: s.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 8, life: 1.5, ch, coef: 100, frac: 6, opts: { shatter: true }, color: '#3fe0a8', hit: new Set() });
          }
        }
      }
    }
    // 보스 기믹의 매듭(관측 중에만 보이고 맞출 수 있음)
    if (opts.shatter && GL.Boss) GL.Boss.hitKnots(shape, frac, ch);
    return n;
  },

  inShape(s, t) {
    const U = GL.U;
    if (s.kind === 'arc') return U.inArc(s, s.dir, s.r, s.arc, t);
    if (s.kind === 'line') return U.inLine(s, s.dir, s.len, s.w, t);
    return U.inCircle(s, s.r, t);
  },

  // ---------- 적 → 플레이어 ----------
  hurtPlayer(atk, coef, opts = {}) {
    const P = GL.Party, p = P.player, ch = P.active(), W = GL.World;
    if (!ch || ch.hp <= 0 || GL.Main.state !== 'play') return false;
    if (opts.ground && p.z > 25) return false;                 // 점프 중엔 바닥 공격 회피
    if (p.iframe > 0 && !opts.unavoidable) { this.text(p.x, p.y - 34, '회피', '#cfe3ff', 14); return false; }
    if (W.buffs.barrier > 0 && !opts.unavoidable) { this.text(p.x, p.y - 34, '절대 경계', '#e0b54a', 14); return false; }

    // 바렌 퍼펙트 가드 : 받은 피해를 반사하고 파쇄 게이지를 깎음
    if (ch.id === 'baren' && p.guard > 0 && !opts.unavoidable) {
      const hv = GL.CONFIG.chars.baren.heavy;
      const raw = atk * coef / 100;
      if (opts.src && !opts.src.dead) {
        this.hitEnemy(opts.src, ch, 0, hv.frac * (opts.red ? hv.redMul : 1), { shatter: true, skill: true, parry: true, fixed: Math.round(raw) });
      }
      this.text(p.x, p.y - 40, opts.red ? '퍼펙트 가드! 파쇄 x2' : '퍼펙트 가드!', '#ffe066', 18);
      this.ring(p.x, p.y, 70, '#ffe066', 0.35);
      W.shake = Math.max(W.shake, 6);
      return false;
    }

    let dmg = opts.ratio ? ch.maxHp * opts.ratio : atk * coef / 100 * 100 / (100 + ch.def);
    if (W.buffs.fortress > 0) dmg *= 1 - GL.CONFIG.chars.baren.assist.reduce;
    dmg = Math.round(dmg);
    if (W.buffs.shield > 0) {
      const ab = Math.min(W.buffs.shield, dmg);
      W.buffs.shield -= ab; dmg -= ab;
      if (ab > 0) this.text(p.x + 14, p.y - 30, `-${ab}`, '#9fe8ff', 13);
    }
    if (ch.id === 'baren' && opts.src && !opts.src.dead && dmg > 0) {
      // 패시브 노이즈 리플렉션 : 받은 피해 20% 반사
      this.hitEnemy(opts.src, ch, 0, 0, { fixed: Math.max(1, Math.round(dmg * GL.CONFIG.chars.baren.passive.reflect)) });
    }
    if (dmg <= 0) return true;
    ch.hp -= dmg;
    ch.ult = Math.min(ch.ultMax, ch.ult + this.R().ultPerHurt);
    this.text(p.x, p.y - 30, `-${dmg}`, '#ff5a6e', 17);
    W.shake = Math.max(W.shake, opts.ratio ? 2 : 7);
    p.hurtFlash = 0.15;
    if (ch.hp <= 0) { ch.hp = 0; P.onActiveDown(); }
    return true;
  },

  // ---------- 예고 공격 / 장판 / 투사체 ----------
  telegraph(t) { t.t = 0; GL.World.tele.push(t); return t; },

  update(dt) {
    const W = GL.World;
    this.updateObserve(dt);
    if (W.buffs.shieldT > 0) { W.buffs.shieldT -= dt; if (W.buffs.shieldT <= 0) W.buffs.shield = 0; }
    if (W.buffs.fortress > 0) W.buffs.fortress -= dt;
    if (W.buffs.barrier > 0) W.buffs.barrier -= dt;
    if (W.buffs.weakAll > 0) { W.buffs.weakAll -= dt; if (W.buffs.weakAll <= 0) W.buffs.defDown = 0; }

    // 예고 → 발동
    for (const t of W.tele) {
      if (t.owner && t.owner.dead) { t.dead = true; continue; }
      t.t += dt;
      if (t.follow && t.owner) { t.x = t.owner.x; t.y = t.owner.y; }
      if (t.t >= t.warn) {
        t.dead = true;
        if (t.onFire) t.onFire(t);
        else if (this.inShape(t, { x: GL.Party.player.x, y: GL.Party.player.y, r: 14 })) {
          this.hurtPlayer(t.atk, t.coef, { red: t.red, src: t.owner, ground: t.ground });
        }
        this.ring(t.x, t.y, t.r || 60, t.red ? '#ff3b5c' : '#ff9a3d', 0.25);
      }
    }
    W.tele = W.tele.filter(t => !t.dead);

    // 장판
    const p = GL.Party.player;
    p.slow = 0;
    for (const f of W.fields) {
      f.life -= dt;
      if (f.kind === 'slow' && GL.U.inCircle(f, f.r, p) && p.z < 20) p.slow = f.slow;
      if (f.kind === 'rift') {
        f.tick -= dt;
        if (f.armed === false) { f.arm -= dt; if (f.arm <= 0) f.armed = true; }
        else if (f.tick <= 0 && GL.U.inCircle(f, f.r, p) && p.z < 20) { f.tick = 0.5; this.hurtPlayer(0, 0, { ratio: f.dps * 0.5, ground: true }); }
      }
      if (f.kind === 'cut') {
        f.tick -= dt;
        if (f.tick <= 0) { f.tick = 0.5; this.hitArea(f.shape, f.ch, f.coef * 0.5, 0, {}); }
      }
    }
    W.fields = W.fields.filter(f => f.life > 0);

    // 플레이어 투사체
    for (const s of W.pShots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.life <= 0) { s.dead = true; continue; }
      for (const e of W.enemies) {
        if (e.dead || s.hit.has(e)) continue;
        if (GL.U.inCircle(s, s.r, e)) {
          s.hit.add(e);
          this.hitEnemy(e, s.ch, s.coef, s.frac, { ...s.opts, dir: Math.atan2(s.vy, s.vx) });
          if (!s.pierce) { s.dead = true; break; }
        }
      }
    }
    W.pShots = W.pShots.filter(s => !s.dead);

    // 적 투사체
    for (const s of W.eShots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.life <= 0) { s.dead = true; continue; }
      if (GL.U.inCircle(s, s.r, { x: p.x, y: p.y, r: 14 }) && p.z < 30) {
        s.dead = true;
        this.hurtPlayer(s.atk, s.coef, { src: s.src });
      }
    }
    W.eShots = W.eShots.filter(s => !s.dead);

    // 이펙트/텍스트
    for (const f of W.fx) { f.t += dt; if (f.vx) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.92; f.vy *= 0.92; } }
    W.fx = W.fx.filter(f => f.t < f.life);
    for (const t of W.texts) t.t += dt;
    W.texts = W.texts.filter(t => t.t < 0.9);
    if (W.shake > 0) W.shake = Math.max(0, W.shake - 30 * dt);
  },

  // ---------- 이펙트 ----------
  text(x, y, str, color = '#fff', size = 15) { GL.World.texts.push({ x, y, str, color, size, t: 0 }); },
  ring(x, y, r, color, life = 0.3) { GL.World.fx.push({ kind: 'ring', x, y, r, color, life, t: 0 }); },
  slash(x, y, dir, r, arc, color, life = 0.18) { GL.World.fx.push({ kind: 'slash', x, y, dir, r, arc, color, life, t: 0 }); },
  line(x, y, dir, len, w, color, life = 0.2) { GL.World.fx.push({ kind: 'line', x, y, dir, len, w, color, life, t: 0 }); },
  sparks(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = GL.U.rand(80, 220);
      GL.World.fx.push({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life: 0.35, t: 0 });
    }
  },
  // 유리 파편 (파쇄 연출)
  shards(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = GL.U.rand(60, 260);
      GL.World.fx.push({ kind: 'shard', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, rot: Math.random() * 6, size: GL.U.rand(4, 9), life: 0.6, t: 0 });
    }
  },
};
