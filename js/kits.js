// ============================================================
// kits.js — 등장인물 능력 (통합 등장인물 능력 및 전투 시스템 문서 기준)
//   GL.Ian  : 이안의 3단계 소거 연계 · 시스템 반작용 · 4단계 인과 역류(혼합형)
//   GL.Kits : 태론 · 세레나 · 클레아 · 노아 의 평타/강공격/스킬/궁극기/조력
//   (이안·바렌·케이의 기본 기술은 party.js)
// 문서에서 '미정'인 수치는 config.js 에 임시값으로 두었다.
// ============================================================

// ---------------- 이안 : 소거 · 반작용 · 인과 역류 ----------------
GL.Ian = {
  reaction: 0, sinceErase: 99, graceT: 0, backflow: null, after: 0,

  cfg() { return GL.CONFIG.chars.ian; },
  reset() { this.reaction = 0; this.sinceErase = 99; this.graceT = 0; this.backflow = null; this.after = 0; },
  member() { return GL.Party.members && GL.Party.members.find(m => m.id === 'ian'); },
  isActive() { const a = GL.Party.active(); return a && a.id === 'ian'; },
  stage() { // 'stable' | 'unstable' | 'critical'
    const R = this.cfg().reaction;
    if (this.reaction >= R.max) return 'critical';
    if (this.reaction >= R.unstable) return 'unstable';
    return 'stable';
  },
  canPlayerActivate() { return !this.backflow && this.reaction >= this.cfg().reaction.unstable; },
  dmgMul() { return this.backflow && this.isActive() ? this.cfg().backflow[this.backflow.mode].dmgMul : 1; },
  invincible() { return !!this.backflow && this.isActive(); },
  monoLevel() { return this.backflow ? (this.backflow.mode === 'forced' ? 0.85 : 0.7) : 0; },

  // 이안의 파쇄 공격이 적에게 파쇄 흔적을 남김 (combat.js 에서 호출)
  addMarks(e, fracApplied) {
    const E = this.cfg().erasure;
    e.marks = Math.min(E.markMax, (e.marks || 0) + fracApplied * E.markPerFrac * (this.backflow ? 2 : 1));
  },

  // 4타 이후 추가 입력 대상 : 앞쪽 가까운 적 중 흔적이 충분한 적
  target() {
    const p = GL.Party.player, E = this.cfg().erasure;
    let best = null, bd = 190;
    for (const e of GL.World.enemies) {
      if (e.dead) continue;
      const d = GL.U.dist(p, e) - e.r;
      if (d > bd) continue;
      if (!this.backflow && (e.marks || 0) < E.markNeed) continue;   // 역류 중에는 흔적 조건 없음
      bd = d; best = e;
    }
    return best;
  },

  // ---------- 3단계 소거 (4타 이후 추가 입력) ----------
  tryErase() {
    const p = GL.Party.player, ch = GL.Party.active(), E = this.cfg().erasure, C = GL.Combat;
    if (this.after > 0) { C.text(p.x, p.y - 44, '감각 상실 — 소거 불가', '#6b8cff', 14); return false; }
    const t = this.target();
    if (!t) return false;   // 대상 없음 → 평소처럼 다음 콤보
    p.eraseWin = 0; p.lock = 0.4; ch.combo = 0; ch.comboT = 0;
    p.facing = GL.U.angleTo(p, t);
    GL.Party.setAnim('erase', 0.45);
    const marks = t.marks || 0;
    // 시스템 피해 : 방어 무시, 흔적이 많을수록 강함
    C.hitEnemy(t, ch, E.coef * (1 + marks / 100), 0, { trueDmg: true, skill: true, stun: 0.8, erase: true });
    t.marks = 0;
    // 주변의 파쇄 잔재 · 지속 피해 장판 · 투사체를 '없었던 일'로 삭제
    const W = GL.World;
    let wiped = 0;
    W.fields = W.fields.filter(f => { const hit = (f.kind === 'slow' || f.kind === 'rift') && GL.U.dist(f, t) < E.radius + f.r; if (hit) wiped++; return !hit; });
    for (const s of W.eShots) if (GL.U.dist(s, t) < E.radius) { s.dead = true; wiped++; }
    // 연출 : 심해의 청색 입자가 번지며 수평으로 소멸
    C.ring(t.x, t.y, E.radius, '#2a6bff', 0.6);
    C.ring(t.x, t.y, E.radius * 0.6, '#9fc4ff', 0.45);
    for (let i = 0; i < 18; i++) W.fx.push({ kind: 'erase', x: t.x + GL.U.rand(-t.r, t.r), y: t.y + GL.U.rand(-t.r, t.r), h: GL.U.rand(10, 70), vx: GL.U.rand(-160, 160), vy: 0, life: 0.8, t: 0, color: '#2a6bff' });
    C.text(t.x, t.y - t.r - 30, wiped ? `소거 · 잔재 ${wiped} 삭제` : '소거', '#6b9cff', 20);
    GL.Haptics.play([20, 60, 40], true);
    // 시스템 반작용 누적
    if (!this.backflow) {
      this.reaction = Math.min(this.cfg().reaction.max, this.reaction + E.reaction);
      this.sinceErase = 0;
      if (this.stage() === 'critical' && this.graceT <= 0) {
        this.graceT = this.cfg().reaction.grace;
        GL.UI.banner('반작용 임계 — 곧 인과 역류가 강제로 발동한다 (R 길게 : 지금 직접 발동)');
      } else if (this.stage() === 'unstable') {
        GL.UI.banner('반작용 불안정 — R 길게 눌러 인과 역류 발동 가능');
      }
    }
    return true;
  },

  // ---------- 4단계 인과 역류 ----------
  activate(mode) {
    const B = this.cfg().backflow, P = GL.Party, C = GL.Combat;
    if (this.backflow) return;
    const ian = this.member();
    if (!ian || ian.hp <= 0) { this.reaction = 0; this.graceT = 0; return; }
    // 강제 폭주 : 이안이 대기 중이어도 끌려 나옴
    const idx = P.members.indexOf(ian);
    if (P.activeIdx !== idx) { P.activeIdx = idx; P.player.lock = 0; P.player.guard = 0; }
    const M = B[mode];
    this.backflow = { mode, t: 0, dur: M.dur, pulseT: 0.4 };
    if (M.hpCost) ian.hp = Math.max(1, ian.hp - ian.maxHp * M.hpCost);
    this.graceT = 0;
    const p = P.player;
    C.ring(p.x, p.y, 320, '#000000', 0.8); C.ring(p.x, p.y, 200, mode === 'forced' ? '#ff2040' : '#3fe0a8', 0.6);
    GL.World.shake = 14;
    GL.UI.banner(mode === 'forced' ? '[강제 폭주] 인과 역류 — 제어 불가, 아군까지 공격한다' : '[자의 발동] 인과 역류 — 모든 오염을 이안이 짊어진다');
    GL.Haptics.play(mode === 'forced' ? [120, 50, 120, 50, 200] : [60, 40, 160], true);
  },
  end() {
    const A = this.cfg().backflow.after;
    const mode = this.backflow && this.backflow.mode;
    this.backflow = null; this.reaction = 0; this.graceT = 0; this.after = A.dur;
    GL.UI.banner(`인과 역류 종료${mode === 'forced' ? ' (강제 폭주)' : ''} — 감각 상실 ${A.dur}초 : 이동 둔화 · 소거 봉인`);
  },

  update(dt) {
    const R = this.cfg().reaction, B = this.cfg().backflow, P = GL.Party, C = GL.Combat;
    if (this.after > 0) this.after = Math.max(0, this.after - dt);
    const ian = this.member();
    if (!ian) return;
    if (this.backflow) {
      const bf = this.backflow, M = B[bf.mode];
      bf.t += dt;
      ian.hp = Math.max(1, ian.hp - ian.maxHp * M.drain * dt);       // 생명력 소모
      bf.pulseT -= dt;
      if (bf.pulseT <= 0 && this.isActive()) {
        bf.pulseT = B.pulseEvery;
        const p = P.player;
        C.hitArea({ kind: 'circle', x: p.x, y: p.y, r: B.pulseR }, ian, B.pulseCoef, 6, { shatter: true, skill: true });
        C.ring(p.x, p.y, B.pulseR, bf.mode === 'forced' ? '#ff2040' : '#000000', 0.4);
        if (bf.mode === 'forced') {   // 강제 폭주 : 적과 아군을 구분하지 못함 → 대기 중인 동료도 피해
          for (const m of P.members) if (m !== ian && m.hp > 0) { m.hp = Math.max(1, m.hp - m.maxHp * M.allyHit); }
          C.text(p.x, p.y - 70, '아군 피해', '#ff5a6e', 13);
        }
      }
      if (bf.t >= bf.dur || ian.hp <= 1) this.end();
      return;
    }
    // 반작용 : 소거를 안 하면 천천히 가라앉음 (임계 도달 후엔 줄지 않음)
    this.sinceErase += dt;
    if (this.stage() !== 'critical' && this.sinceErase > R.decayDelay) this.reaction = Math.max(0, this.reaction - R.decay * dt);
    if (this.stage() === 'critical') {
      if (this.graceT <= 0) this.graceT = R.grace;
      this.graceT -= dt;
      if (this.graceT <= 0) this.activate('forced');
    }
  },
};

// ---------------- 새 7대선 기술 ----------------
GL.Kits = {
  C() { return GL.Combat; },
  fwd(p, d) { return { x: p.x + Math.cos(p.facing) * d, y: p.y + Math.sin(p.facing) * d }; },
  aimPoint(p, d) { const t = GL.Party.softTarget; return t && !t.dead && GL.U.dist(p, t) < d * 1.6 ? { x: t.x, y: t.y } : this.fwd(p, d); },
  shot(o) { GL.World.pShots.push(Object.assign({ r: 7, life: 0.8, hit: new Set(), opts: {} }, o)); },

  // ====== 태론 (절제) : 삼절곤 · 진공 포박 & 억제 결계 ======
  taron: {
    light(step, ch, p, d) {
      const C = GL.Combat, K = GL.Kits, sl = ch.cfg.passive.slow;
      if (d.line) {
        C.hitArea({ kind: 'line', x: p.x, y: p.y, dir: p.facing, len: d.len, w: d.w }, ch, d.coef, d.frac, { shatter: true, stun: d.stun, slow: sl });
        C.line(p.x, p.y, p.facing, d.len, 16, '#bfe8ff', 0.3); C.shards(K.fwd(p, d.len * 0.8).x, K.fwd(p, d.len * 0.8).y, 8);
        return;
      }
      const opts = { stun: d.stun || 0.2, slow: sl, knock: d.launch ? 0 : 8 };
      if (d.pull) { const c = K.fwd(p, 55); opts.pull = { x: c.x, y: c.y, amt: d.pull }; C.ring(c.x, c.y, 70, '#7fc8e8', 0.35); }
      if (d.launch) opts.launch = 0.8;
      C.hitArea({ kind: 'arc', x: p.x, y: p.y, dir: p.facing, r: d.range, arc: GL.U.deg(d.arc) }, ch, d.coef, d.frac, opts);
      C.slash(p.x, p.y, p.facing, d.range, GL.U.deg(d.arc), '#7fc8e8');
    },
    heavy(ch, p, h) {
      const C = GL.Combat, c = GL.Kits.fwd(p, 50);
      p.lock = 0.55;
      C.hitArea({ kind: 'circle', x: c.x, y: c.y, r: h.radius }, ch, h.coef, h.frac, { shatter: true, seal: h.seal, stun: 0.4 });
      C.ring(c.x, c.y, h.radius, '#bfe8ff', 0.5); C.ring(c.x, c.y, h.radius * 0.7, '#7fc8e8', 0.6);
      C.text(c.x, c.y - 30, '억제 결계 : 스킬 봉인', '#bfe8ff', 14);
      GL.World.shake = 6;
    },
    passiveCd(ch, used) { const o = used === 'q' ? 'e' : 'q'; ch.cd[o] = Math.max(0, ch.cd[o] - ch.cfg.passive.cdCut); },
    q(ch, p, s) {   // 진공 포박 : 사슬로 첫 적을 끌어옴
      const C = GL.Combat;
      let best = null, bd = Infinity;
      for (const e of GL.World.enemies) {
        if (e.dead || !GL.U.inLine(p, p.facing, s.len, 50, e)) continue;
        const d = GL.U.dist(p, e); if (d < bd) { bd = d; best = e; }
      }
      C.line(p.x, p.y, p.facing, best ? bd : s.len, 6, '#bfe8ff', 0.35);
      if (best) {
        const c = GL.Kits.fwd(p, 45);
        C.hitEnemy(best, ch, s.coef, s.frac, { shatter: true, skill: true, stun: 0.7, slow: 2, pull: best.boss ? null : { x: c.x, y: c.y, amt: 9999 } });
        C.text(best.x, best.y - 30, '진공 포박', '#7fc8e8', 14);
      }
      p.lock = 0.3; this.passiveCd(ch, 'q');
    },
    e(ch, p, s) {   // 절제 감옥 : 지정 위치 억제 결계
      const at = GL.Kits.aimPoint(p, 160);
      GL.World.fields.push({ kind: 'prison', x: at.x, y: at.y, r: s.radius, life: s.dur, maxLife: s.dur });
      GL.Combat.ring(at.x, at.y, s.radius, '#7fc8e8', 0.5);
      p.lock = 0.3; this.passiveCd(ch, 'e');
    },
    r(ch, p, s) {   // 절대 쇄인 : 시간 정지
      const C = GL.Combat, W = GL.World;
      p.lock = 0.6;
      let n = 0;
      for (const e of W.enemies) if (!e.dead && GL.U.dist(p, e) <= s.radius) { e.frozenT = e.boss ? s.bossDur : s.dur; n++; }
      for (const sh of W.eShots) if (GL.U.dist(p, sh) <= s.radius) sh.frozenT = s.dur;
      W.fields.push({ kind: 'timestop', x: p.x, y: p.y, r: s.radius, life: s.dur, maxLife: s.dur });
      C.ring(p.x, p.y, s.radius, '#bfe8ff', 0.8); W.flash = 0.2; W.shake = 8;
      C.text(p.x, p.y - 60, `시간 정지 · ${n}`, '#bfe8ff', 18);
    },
    assist(m) { GL.World.buffs.chainWall = m.cfg.assist.dur; },
  },

  // ====== 세레나 (자애) : 향로 메이스 · 기억 정화 & 무결 구원 ======
  serena: {
    hits: 0,
    remnant(n) { // 패시브 기억의 잔재 : 타격 5번마다 파티 전원 소량 회복
      const P = GL.CONFIG.chars.serena.passive;
      this.hits += n;
      if (this.hits >= P.every) { this.hits = 0; GL.Party.healAll(P.heal, true); GL.Combat.ring(GL.Party.player.x, GL.Party.player.y, 60, '#f3e0ff', 0.4); }
    },
    light(step, ch, p, d) {
      const C = GL.Combat, K = GL.Kits;
      if (d.homing) {
        K.shot({ x: p.x, y: p.y, vx: Math.cos(p.facing) * 420, vy: Math.sin(p.facing) * 420, r: 9, life: 1.2, ch, coef: d.coef, frac: d.frac, homing: true, color: '#f3c6ff', orb: true, onHit: () => this.remnant(1) });
        return;
      }
      let n;
      if (d.radius) {
        n = C.hitArea({ kind: 'circle', x: p.x, y: p.y, r: d.radius }, ch, d.coef, d.frac, { shatter: true, knock: 50 });
        C.ring(p.x, p.y, d.radius, '#ffffff', 0.45); C.ring(p.x, p.y, d.radius * 0.6, '#f3c6ff', 0.4);
        GL.Party.healAll(d.heal, true);
      } else {
        n = C.hitArea({ kind: 'arc', x: p.x, y: p.y, dir: p.facing, r: d.range, arc: GL.U.deg(d.arc) }, ch, d.coef, d.frac, { knock: d.knock, stun: 0.2 });
        C.slash(p.x, p.y, p.facing, d.range, GL.U.deg(d.arc), '#f3c6ff');
      }
      this.remnant(n);
    },
    heavy(ch, p, h) {   // 광휘 파동 : 관통하는 넓은 백색 파동
      p.lock = 0.5;
      GL.Kits.shot({ x: p.x, y: p.y, vx: Math.cos(p.facing) * 560, vy: Math.sin(p.facing) * 560, r: h.w / 2, life: h.len / 560, ch, coef: h.coef, frac: h.frac, pierce: true, wave: true, color: '#ffffff', opts: { shatter: true, knock: 60 } });
    },
    q(ch, p, s) {   // 빛의 정원
      GL.World.fields.push({ kind: 'garden', x: p.x, y: p.y, r: s.radius, life: s.dur, maxLife: s.dur, heal: s.heal, speed: s.speed });
      GL.Combat.ring(p.x, p.y, s.radius, '#f3c6ff', 0.6); p.lock = 0.3;
    },
    e(ch, p, s) {   // 기억 정화
      const B = GL.World.buffs;
      B.cleanse = s.immune; GL.Party.player.slow = 0;
      GL.Party.healActive(s.heal);
      for (const f of GL.World.fields) if (f.kind === 'slow' && GL.U.dist(f, p) < f.r + 20) f.life = Math.min(f.life, 0.3);
      GL.Combat.ring(p.x, p.y, 90, '#ffffff', 0.5); GL.Combat.text(p.x, p.y - 50, '정화', '#ffffff', 16); p.lock = 0.25;
    },
    r(ch, p, s) {   // 자애의 빛 : 무결 구원
      const C = GL.Combat, W = GL.World;
      p.lock = 0.6; W.buffs.salvation = s.dur;
      C.hitArea({ kind: 'circle', x: p.x, y: p.y, r: s.radius }, ch, s.coef, s.frac, { shatter: true, skill: true, knock: 80 });
      C.ring(p.x, p.y, s.radius, '#ffffff', 0.8); C.ring(p.x, p.y, s.radius * 0.7, '#f3c6ff', 0.7); W.flash = 0.3;
      GL.Party.healAll(0.15, false);
    },
    assist(m) { GL.World.buffs.vest = m.cfg.assist.dur; },
  },

  // ====== 클레아 (근면) : 메카닉 워해머 · 제련 연마 & 창조의 모루 ======
  clea: {
    stacks: 0, keepT: 0,
    mul() { return 1 + this.stacks * GL.CONFIG.chars.clea.passive.perHit; },
    temper(n) { if (n > 0) { const P = GL.CONFIG.chars.clea.passive; this.stacks = Math.min(P.max, this.stacks + 1); this.keepT = P.keep; } },
    update(dt) { if (this.keepT > 0) { this.keepT -= dt; if (this.keepT <= 0) this.stacks = 0; } },
    light(step, ch, p, d) {
      const C = GL.Combat, K = GL.Kits, mul = this.mul();
      let n;
      if (d.circleFront) {
        const c = K.fwd(p, d.circleFront);
        n = C.hitArea({ kind: 'circle', x: c.x, y: c.y, r: d.radius }, ch, d.coef, d.frac, { shatter: step === 4, stun: d.stun || 0.3, mul });
        C.ring(c.x, c.y, d.radius, '#ff9f5a', 0.35); C.shards(c.x, c.y, 8); GL.World.shake = Math.max(GL.World.shake, 4);
        if (d.after) GL.Party.later(0.3, () => { // 피스톤 가시 2차 폭발
          C.hitArea({ kind: 'circle', x: c.x, y: c.y, r: d.radius + 30 }, ch, d.after, 2, { mul });
          C.shards(c.x, c.y, 16); C.ring(c.x, c.y, d.radius + 30, '#ffd0a0', 0.4);
        });
      } else {
        n = C.hitArea({ kind: 'arc', x: p.x, y: p.y, dir: p.facing, r: d.range, arc: GL.U.deg(d.arc) }, ch, d.coef, d.frac, { stun: d.stun || 0.2, shatter: step === 2, mul, launch: d.launch ? 0.7 : 0 });
        C.slash(p.x, p.y, p.facing, d.range, GL.U.deg(d.arc), '#ff9f5a');
      }
      this.temper(n);
    },
    heavy(ch, p, h) {   // 역 중력
      const C = GL.Combat;
      p.lock = 0.55;
      const n = C.hitArea({ kind: 'circle', x: p.x, y: p.y, r: h.radius }, ch, h.coef, h.frac, { shatter: true, stun: h.stun, launch: 1.0, mul: this.mul() });
      C.ring(p.x, p.y, h.radius, '#ff9f5a', 0.5); C.shards(p.x, p.y, 20); GL.World.shake = 8;
      this.temper(n);
    },
    q(ch, p, s) {   // 유리 가시 지대
      const at = GL.Kits.aimPoint(p, 140);
      GL.World.fields.push({ kind: 'spikes', x: at.x, y: at.y, r: s.radius, life: s.dur, maxLife: s.dur, tick: 0, ch, coef: s.coef });
      GL.Combat.shards(at.x, at.y, 14); p.lock = 0.3;
    },
    e(ch, p, s) { GL.World.buffs.cleaCrit = s.dur; GL.Combat.text(p.x, p.y - 50, '확정 치명타', '#ffd0a0', 16); GL.Combat.ring(p.x, p.y, 60, '#ff9f5a', 0.5); },
    r(ch, p, s) {   // 창조의 모루 : 거대한 모루 낙하
      const C = GL.Combat, W = GL.World, at = GL.Kits.aimPoint(p, 170);
      p.lock = 0.5;
      W.fx.push({ kind: 'anvil', x: at.x, y: at.y, life: s.delay, t: 0 });
      C.telegraph({ kind: 'circle', x: at.x, y: at.y, r: s.radius, warn: s.delay, ally: true,
        onFire: () => {
          C.hitArea({ kind: 'circle', x: at.x, y: at.y, r: s.radius }, ch, s.coef, s.frac, { shatter: true, skill: true, stun: 1.2, mul: this.mul() });
          C.ring(at.x, at.y, s.radius, '#ff9f5a', 0.6); C.shards(at.x, at.y, 40); W.shake = 14; W.flash = 0.15;
          GL.Party.later(0.25, () => { C.hitArea({ kind: 'circle', x: at.x, y: at.y, r: s.radius + 40 }, ch, 80, 4, {}); C.shards(at.x, at.y, 30); });
        } });
    },
    assist(m) { GL.World.buffs.atkUp = m.cfg.assist.dur; },
  },

  // ====== 노아 (소망) : 차크람 · 잔영 관측 & 만화경 ======
  noah: {
    light(step, ch, p, d) {
      const K = GL.Kits, C = GL.Combat, up = 1 + ch.cfg.passive.rangeUp, sp = 560;
      const base = { ch, coef: d.coef, frac: d.frac, chakram: true, color: '#8fe3ff', r: 12, pierce: true, opts: { shatter: step === 4 } };
      if (d.boomerang) K.shot({ ...base, x: p.x, y: p.y, vx: Math.cos(p.facing) * sp, vy: Math.sin(p.facing) * sp, life: 2, boomerang: { turn: d.range * up / sp }, hit: new Set() });
      else if (d.curve) K.shot({ ...base, x: p.x, y: p.y, vx: Math.cos(p.facing - 0.6) * sp, vy: Math.sin(p.facing - 0.6) * sp, life: d.range * up / sp * 1.3, curve: 1.6, hit: new Set() });
      else if (d.cross) {
        for (const k of [-1, 1]) K.shot({ ...base, x: p.x, y: p.y, vx: Math.cos(p.facing + k * 0.5) * sp, vy: Math.sin(p.facing + k * 0.5) * sp, life: d.range * up / sp * 1.2, curve: -k * 1.7, hit: new Set(), multi: 0.15 });
      } else if (d.storm) {
        for (let i = 0; i < d.hits; i++) GL.Party.later(i * 0.1, () => {
          C.hitArea({ kind: 'circle', x: p.x, y: p.y, r: d.radius }, ch, d.coef, d.frac / d.hits, { shatter: true, knock: i === d.hits - 1 ? d.knock : 0 });
          C.ring(p.x, p.y, d.radius, '#c8f4ff', 0.3); C.shards(p.x, p.y, 6);
        });
      }
    },
    heavy(ch, p, h) {   // 렌즈 광선
      const C = GL.Combat;
      p.lock = 0.55;
      C.hitArea({ kind: 'line', x: p.x, y: p.y, dir: p.facing, len: h.len, w: h.w }, ch, h.coef, h.frac, { shatter: true, stun: 0.4 });
      C.line(p.x, p.y, p.facing, h.len, h.w, '#c8f4ff', 0.45);
      GL.World.fx.push({ kind: 'lens', x: p.x + Math.cos(p.facing) * 30, y: p.y + Math.sin(p.facing) * 30, dir: p.facing, life: 0.5, t: 0 });
    },
    q(ch, p, s) { const C = GL.Combat; C.hitArea({ kind: 'circle', x: p.x, y: p.y, r: s.radius }, ch, s.coef, s.frac, { shatter: true, skill: true, knock: s.knock }); C.ring(p.x, p.y, s.radius, '#8fe3ff', 0.5); p.lock = 0.3; },
    e(ch, p, s) {   // 잔영 투척 : 위치가 흔들리는 분신 차크람
      for (let i = 0; i < s.count; i++) GL.Kits.shot({ x: p.x, y: p.y, vx: Math.cos(p.facing + (i - 1) * 0.25) * 480, vy: Math.sin(p.facing + (i - 1) * 0.25) * 480, r: 12, life: 0.9, ch, coef: s.coef, frac: s.frac, chakram: true, ghost: true, wobble: GL.U.rand(0, 6), color: '#c8f4ff', pierce: true, opts: { shatter: true, skill: true }, hit: new Set() });
      p.lock = 0.25;
    },
    r(ch, p, s) {   // 희망의 만화경 : 공중 렌즈 배열에서 굴절 광선
      const C = GL.Combat, W = GL.World;
      p.lock = 0.5;
      W.fx.push({ kind: 'kaleido', x: p.x, y: p.y, life: s.beams * 0.1 + 0.4, t: 0 });
      for (let i = 0; i < s.beams; i++) GL.Party.later(0.2 + i * 0.1, () => {
        const list = W.enemies.filter(e => !e.dead && GL.U.dist(p, e) < s.radius);
        const tgt = list.length ? GL.U.pick(list) : { x: p.x + GL.U.rand(-s.radius, s.radius) * 0.6, y: p.y + GL.U.rand(-s.radius, s.radius) * 0.6 };
        C.hitArea({ kind: 'circle', x: tgt.x, y: tgt.y, r: 45 }, ch, s.coef, s.frac, { shatter: true, skill: true });
        W.fx.push({ kind: 'beam', x: tgt.x, y: tgt.y, life: 0.25, t: 0, color: '#c8f4ff' });
      });
    },
    assist(m) { GL.World.buffs.echo = m.cfg.assist.dur; },
  },
};
