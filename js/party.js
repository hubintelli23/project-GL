// ============================================================
// party.js — 3인 파티 (파티 편성으로 고른 3명), 태그, 조력, 평타/강공격/스킬
// 이안·바렌·케이의 기술은 여기, 태론·세레나·클레아·노아와 이안의 소거/인과 역류는 kits.js
// ============================================================
GL.Party = {
  init(ids) {
    const C = GL.CONFIG;
    ids = ids || (GL.PartySelect && GL.PartySelect.chosen()) || C.partyOrder;
    GL.Ian.reset();
    if (GL.Kits) { GL.Kits.serena.hits = 0; GL.Kits.clea.stacks = 0; GL.Kits.clea.keepT = 0; }
    this.members = ids.map(id => {
      const c = C.chars[id];
      return {
        id, cfg: c, name: c.name, color: c.color,
        maxHp: c.hp, hp: c.hp, atk: c.atk, def: c.def,
        ultMax: c.ultMax, ult: 0,
        cd: { q: 0, e: 0, assist: 0 }, combo: 0, comboT: 0,
      };
    });
    this.activeIdx = 0;
    this.tagCd = 0;
    this.critBuff = 0;
    this.timers = [];
    this.player = {
      x: 0, y: 0, z: 0, vz: 0, r: 14, facing: 0,
      iframe: 0, dodgeCharges: C.rules.dodgeCharges, dodgeRe: 0,
      lock: 0, guard: 0, dash: null, plunge: null, slow: 0, hurtFlash: 0, buffer: null, moving: false, moveDir: null,
      anim: { kind: 'idle', t: 0, dur: 1, step: 0 }, walk: 0, eraseWin: 0, speedUp: 0,
    };
  },

  active() { return this.members[this.activeIdx]; },
  // 애니메이션 상태 (assets/characters.js 가 읽어서 자세를 만듦)
  setAnim(kind, dur, step = 0) { this.player.anim = { kind, t: 0, dur, step }; },
  isAirborne() { return this.player.z > 0.5; },
  later(t, fn) { this.timers.push({ t, fn }); },

  // ---------- 입력 이벤트 처리 ----------
  handle(ev) {
    const ch = this.active();
    if (!ch || ch.hp <= 0) return;
    switch (ev.type) {
      case 'light': this.light(); break;
      case 'heavy': this.heavy(); break;
      case 'jumpAtk': this.jumpAttack(false); break;
      case 'jumpHeavy': this.jumpAttack(true); break;
      case 'jump': this.jump(); break;
      case 'dodge': this.dodge(); break;
      case 'q': this.skill('q'); break;
      case 'e': this.skill('e'); break;
      case 'r': this.ultimate(); break;
      case 'rHold': this.rHold(); break;
      case 'observe': GL.Combat.toggleObserve(); break;
      case 'tag': this.tag(ev.value); break;
      case 'assist': this.assist(ev.value); break;
    }
  },

  // ---------- 이동 / 타이머 ----------
  update(dt) {
    const p = this.player, R = GL.CONFIG.rules, I = GL.Input;
    for (const t of this.timers) { t.t -= dt; if (t.t <= 0 && !t.done) { t.done = true; t.fn(); } }
    this.timers = this.timers.filter(t => !t.done);

    for (const m of this.members) {
      m.cd.q = Math.max(0, m.cd.q - dt); m.cd.e = Math.max(0, m.cd.e - dt); m.cd.assist = Math.max(0, m.cd.assist - dt);
      if (m.comboT > 0) { m.comboT -= dt; if (m.comboT <= 0) m.combo = 0; }
    }
    this.tagCd = Math.max(0, this.tagCd - dt);
    p.iframe = Math.max(0, p.iframe - dt);
    p.hurtFlash = Math.max(0, p.hurtFlash - dt);
    p.guard = Math.max(0, p.guard - dt);
    if (p.dodgeCharges < R.dodgeCharges) {
      p.dodgeRe -= dt;
      if (p.dodgeRe <= 0) p.dodgeCharges = R.dodgeCharges;
    }
    p.lock = Math.max(0, p.lock - dt);
    p.eraseWin = Math.max(0, p.eraseWin - dt);
    GL.Ian.update(dt);
    GL.Kits.clea.update(dt);
    p.anim.t += dt;
    if (p.anim.kind !== 'idle' && p.anim.t > p.anim.dur) p.anim = { kind: 'idle', t: 0, dur: 1, step: 0 };
    if (p.moving) p.walk += dt * (I.mouse.right || (GL.Touch && GL.Touch.joy.sprint) ? 15 : 10);
    if (p.lock <= 0 && p.buffer) { const b = p.buffer; p.buffer = null; if (b === 'light') this.light(); }

    // 소프트 락온 대상 갱신 (명조 방식 : 카메라 앞쪽 가까운 적)
    this.softTarget = this.findTarget();

    if (p.dash) {
      p.x += p.dash.vx * dt; p.y += p.dash.vy * dt; p.dash.t -= dt;
      if (p.dash.t <= 0) { const end = p.dash.onEnd; p.dash = null; if (end) end(); }
    } else if (p.lock <= 0) {
      // 카메라 기준 이동 : W = 카메라가 보는 방향
      let f = 0, s = 0;
      if (I.keys.KeyW) f += 1; if (I.keys.KeyS) f -= 1;
      if (I.keys.KeyD) s += 1; if (I.keys.KeyA) s -= 1;
      const J = GL.Touch && GL.Touch.joy;
      if (J && J.active && J.mag > 0.15) { f = -J.y; s = J.x; }   // 휴대폰 조이스틱 (화면 위 = 앞)
      const fw = GL.Render.forward(), rt = { x: -fw.y, y: fw.x };
      const mx = fw.x * f + rt.x * s, my = fw.y * f + rt.y * s;
      const len = Math.hypot(mx, my);
      if (len > 0) {
        const sprint = I.mouse.right || (J && J.active && J.sprint);
        let sp = R.moveSpeed * (sprint ? R.sprintMul : 1) * (1 - p.slow) * Math.min(1, len) * (1 + (p.speedUp || 0));
        if (this.active().id === 'ian' && GL.Ian.after > 0) sp *= 1 - GL.CONFIG.chars.ian.backflow.after.slow;   // 감각 상실
        p.x += mx / len * sp * dt; p.y += my / len * sp * dt;
        p.moveDir = Math.atan2(my, mx);
        // 캐릭터는 이동 방향으로 부드럽게 돌아섬
        p.facing += GL.U.angDiff(p.facing, p.moveDir) * Math.min(1, dt * 14);
        p.moving = true;
      } else { p.moveDir = null; p.moving = false; }
    } else p.moving = false;

    // 점프 / 낙하 공격
    if (p.z > 0 || p.vz > 0) {
      p.vz -= R.gravity * dt; p.z += p.vz * dt;
      if (p.z <= 0) { p.z = 0; p.vz = 0; if (p.plunge) this.landPlunge(); }
    }
    GL.Stage.clamp(p);
  },

  // ---------- 조준 : 소프트 락온 ----------
  // 카메라 앞쪽 400 안의 가장 가까운 적 → 없으면 가까운 적(170 안) → 없으면 이동 방향/카메라 방향
  findTarget() {
    const p = this.player, fw = GL.Render.forward(), cam = Math.atan2(fw.y, fw.x);
    let best = null, bs = Infinity;
    // 관측 중에는 보스 기믹의 매듭을 우선 조준
    if (GL.World.observe.on) {
      for (const k of GL.Boss.knots) {
        if (k.frac <= 0) continue;
        const d = GL.U.dist(p, k);
        if (d < 420 && d < bs) { bs = d; best = k; }
      }
      if (best) return best;
    }
    for (const e of GL.World.enemies) {
      if (e.dead) continue;
      const d = GL.U.dist(p, e);
      if (d > 400) continue;
      const off = Math.abs(GL.U.angDiff(cam, GL.U.angleTo(p, e)));
      if (off > GL.U.deg(80) && d > 170) continue;
      const score = d + off * 120;
      if (score < bs) { bs = score; best = e; }
    }
    return best;
  },
  aim() {
    const p = this.player, t = (this.softTarget = this.findTarget());
    if (t && !t.dead) p.facing = GL.U.angleTo(p, t);
    else if (p.moveDir !== null && p.moveDir !== undefined) p.facing = p.moveDir;
    else { const fw = GL.Render.forward(); p.facing = Math.atan2(fw.y, fw.x); }
  },

  // ---------- 평타 1~4타 ----------
  light() {
    const p = this.player, ch = this.active();
    if (p.z > 0.5) return;
    // 이안 : 4타 '궤적 합체 절단' 이후 추가 입력 = 3단계 소거 연계
    if (ch.id === 'ian' && p.eraseWin > 0 && p.lock < 0.3 && GL.Ian.tryErase()) return;
    if (p.lock > 0) { if (p.lock < 0.2) p.buffer = 'light'; return; }
    this.aim();
    ch.combo = ch.comboT > 0 ? (ch.combo % 4) + 1 : 1;
    ch.comboT = GL.CONFIG.rules.comboWindow;
    const d = ch.cfg.light[ch.combo - 1];
    const step4 = ch.combo === 4;
    p.lock = step4 ? 0.42 : 0.26;
    this.setAnim('light', p.lock + 0.08, ch.combo);
    const shatter = step4;                     // 마지막 4타 = 파쇄 속성
    if (GL.Kits[ch.id] && GL.Kits[ch.id].light) { GL.Kits[ch.id].light(ch.combo, ch, p, d); return; }
    if (ch.id === 'ian' && step4) {           // 소거 연계 입력 대기
      p.eraseWin = ch.cfg.erasure.window;
      GL.Party.later(0.05, () => { if (GL.Ian.target() && GL.Ian.after <= 0) GL.Combat.text(p.x, p.y - 70, '공격 : 소거', '#6b9cff', 16); });
    }

    if (d.lunge) { p.x += Math.cos(p.facing) * d.lunge; p.y += Math.sin(p.facing) * d.lunge; }
    if (d.projectile) {
      for (let i = 0; i < d.count; i++) {
        const a = p.facing + GL.U.deg((i - (d.count - 1) / 2) * 14);
        GL.World.pShots.push({ x: p.x, y: p.y, vx: Math.cos(a) * 600, vy: Math.sin(a) * 600, r: 6, life: 0.6, ch, coef: d.coef / d.count, frac: d.frac / d.count,
          opts: { shatter, defDown: { v: d.defDown, t: d.defDownTime } }, color: ch.color, hit: new Set(), dagger: true });
      }
      p.x -= Math.cos(p.facing) * 30; p.y -= Math.sin(p.facing) * 30;
      return;
    }
    const shape = { kind: 'arc', x: p.x, y: p.y, dir: p.facing, r: d.range, arc: GL.U.deg(d.arc) };
    GL.Combat.hitArea(shape, ch, d.coef, d.frac, { shatter, stun: d.stun || 0.15, knock: d.knock || 8 });
    GL.Combat.slash(p.x, p.y, p.facing, d.range, GL.U.deg(Math.min(d.arc, 359)), step4 ? '#ffffff' : ch.color);
    if (step4) GL.Combat.shards(p.x + Math.cos(p.facing) * 50, p.y + Math.sin(p.facing) * 50, 8);
  },

  // ---------- 강공격 (좌클릭 0.5초 홀딩) ----------
  heavy() {
    const p = this.player, ch = this.active(), h = ch.cfg.heavy;
    if (p.z > 0.5 || p.dash) return;
    ch.combo = 0; this.aim();
    this.setAnim(ch.id === 'baren' ? 'guard' : 'heavy', ch.id === 'baren' ? h.guardTime : 0.5);
    if (GL.Kits[ch.id] && GL.Kits[ch.id].heavy) { GL.Kits[ch.id].heavy(ch, p, h); return; }
    if (ch.id === 'ian') {
      p.lock = 0.45;
      const shape = { kind: 'line', x: p.x, y: p.y, dir: p.facing, len: h.range, w: h.width };
      GL.Combat.hitArea(shape, ch, h.coef, h.frac, { shatter: true, stun: 0.5, knock: 20 });
      GL.Combat.line(p.x, p.y, p.facing, h.range, h.width, '#c8fff0', 0.3);
      GL.Combat.shards(p.x + Math.cos(p.facing) * 90, p.y + Math.sin(p.facing) * 90, 12);
      GL.World.fields.push({ kind: 'cut', shape, x: shape.x, y: shape.y, r: h.range, life: h.fieldTime, tick: 0.5, ch, coef: h.fieldCoef });
      GL.World.shake = 5;
    } else if (ch.id === 'baren') {
      p.lock = h.guardTime; p.guard = h.guardTime;
      GL.Combat.text(p.x, p.y - 36, '가드', '#e0b54a', 14);
    } else if (ch.id === 'kay') {
      p.lock = 0.4; p.iframe = Math.max(p.iframe, 0.25);
      const back = p.facing + Math.PI;
      p.dash = { t: 0.12, vx: Math.cos(back) * h.backstep / 0.12, vy: Math.sin(back) * h.backstep / 0.12,
        onEnd: () => {
          for (let i = 0; i < h.count; i++) {
            const a = p.facing + GL.U.deg((i - (h.count - 1) / 2) * 9);
            GL.World.pShots.push({ x: p.x, y: p.y, vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, r: 7, life: 0.7, ch, coef: h.coef / h.count, frac: h.frac / h.count,
              opts: { shatter: true }, color: '#e6d6ff', hit: new Set(), dagger: true, pierce: true });
          }
        } };
    }
  },

  // ---------- 점프 / 점프 공격 ----------
  jump() {
    const p = this.player;
    if (p.z > 0.5 || p.lock > 0 || p.dash) return;
    p.vz = GL.CONFIG.rules.jumpVel;
    this.setAnim('jump', 0.7);
  },
  jumpAttack(isHeavy) {
    const p = this.player;
    if (p.z <= 0.5 || p.plunge) return;
    p.plunge = isHeavy ? 'heavy' : 'light'; this.aim(); this.setAnim('plunge', 0.6);
    p.vz = isHeavy ? -1400 : -900;
  },
  landPlunge() {
    const p = this.player, ch = this.active();
    const d = p.plunge === 'heavy' ? ch.cfg.jumpHeavy : ch.cfg.jump;
    const heavy = p.plunge === 'heavy';
    p.plunge = null; p.lock = 0.25; this.setAnim('land', 0.3);
    GL.Combat.hitArea({ kind: 'circle', x: p.x, y: p.y, r: d.radius }, ch, d.coef, d.frac, { shatter: heavy, stun: d.stun || 0.3, knock: 25, slow: d.slow || ch.cfg.passive?.slow || 0 });
    GL.Combat.ring(p.x, p.y, d.radius, heavy ? '#ffffff' : ch.color, 0.35);
    GL.Combat.shards(p.x, p.y, heavy ? 14 : 6);
    GL.World.shake = heavy ? 8 : 4;
  },

  // ---------- 회피 (Shift) ----------
  dodge() {
    const p = this.player, R = GL.CONFIG.rules;
    if (p.dodgeCharges <= 0 || p.z > 0.5) return;
    p.dodgeCharges--;
    if (p.dodgeCharges === 0) p.dodgeRe = R.dodgeRecharge;
    const a = p.moveDir !== null && p.moveDir !== undefined ? p.moveDir : p.facing;
    const t = 0.18;
    p.dash = { t, vx: Math.cos(a) * R.dodgeDistance / t, vy: Math.sin(a) * R.dodgeDistance / t };
    p.iframe = R.dodgeIframe; p.lock = 0; p.guard = 0; p.buffer = null;
    this.setAnim('dodge', 0.3);
  },

  // ---------- 스킬 Q / E ----------
  skill(key) {
    const p = this.player, ch = this.active(), s = ch.cfg[key];
    if (p.z > 0.5 || p.dash) return;
    if (ch.cd[key] > 0) { GL.Combat.text(p.x, p.y - 36, `${key.toUpperCase()} ${ch.cd[key].toFixed(1)}초`, '#9fb3c8', 13); return; }
    ch.cd[key] = s.cd; ch.combo = 0; p.guard = 0; this.aim();
    this.setAnim('skill' + key.toUpperCase(), 0.45);
    const C = GL.Combat, f = p.facing, opt = { shatter: true, skill: true };
    C.text(p.x, p.y - 44, s.name, ch.color, 15);
    if (GL.Kits[ch.id] && GL.Kits[ch.id][key]) { GL.Kits[ch.id][key](ch, p, s); return; }

    if (ch.id === 'ian' && key === 'q') {
      const shape = { kind: 'line', x: p.x, y: p.y, dir: f, len: s.dash + 20, w: 60 };
      C.hitArea(shape, ch, s.coef, s.frac, { ...opt, stun: s.stun });
      C.line(p.x, p.y, f, s.dash + 20, 30, '#3fe0a8', 0.3);
      p.dash = { t: 0.15, vx: Math.cos(f) * s.dash / 0.15, vy: Math.sin(f) * s.dash / 0.15 };
      p.iframe = Math.max(p.iframe, 0.15);
    } else if (ch.id === 'ian' && key === 'e') {
      let n = 0;
      for (const e of GL.World.enemies) if (!e.dead && GL.U.dist(p, e) <= s.radius) { e.markWeak = s.dur; n++; }
      C.ring(p.x, p.y, s.radius, '#3fe0a8', 0.5);
      p.lock = 0.2;
    } else if (ch.id === 'baren' && key === 'q') {
      // 돌진 경로 전체를 한 번에 판정
      C.hitArea({ kind: 'line', x: p.x, y: p.y, dir: f, len: s.dash + 40, w: 70 }, ch, s.coef, s.frac, { ...opt, stun: 0.6, knock: 50 });
      C.line(p.x, p.y, f, s.dash + 40, 40, '#e0b54a', 0.3);
      p.dash = { t: 0.22, vx: Math.cos(f) * s.dash / 0.22, vy: Math.sin(f) * s.dash / 0.22 };
    } else if (ch.id === 'baren' && key === 'e') {
      C.hitArea({ kind: 'arc', x: p.x, y: p.y, dir: f, r: s.range, arc: GL.U.deg(s.arc) }, ch, s.coef, s.frac, { ...opt, stun: 0.8, knock: 40 });
      C.slash(p.x, p.y, f, s.range, GL.U.deg(s.arc), '#e0b54a', 0.3);
      p.lock = 0.35; GL.World.shake = 6;
    } else if (ch.id === 'kay' && key === 'q') {
      GL.World.pShots.push({ x: p.x, y: p.y, vx: Math.cos(f) * 700, vy: Math.sin(f) * 700, r: 8, life: 0.8, ch, coef: s.coef, frac: s.frac,
        opts: { ...opt, bleed: { t: s.bleedTime, dps: ch.atk * s.bleedCoef / 100 } }, color: '#ff6b9a', hit: new Set(), dagger: true });
      p.lock = 0.2;
    } else if (ch.id === 'kay' && key === 'e') {
      let best = null, bd = s.range;
      for (const e of GL.World.enemies) { if (e.dead) continue; const d = GL.U.dist(p, e); if (d < bd) { bd = d; best = e; } }
      if (!best) { ch.cd.e = 0; C.text(p.x, p.y - 30, '대상 없음', '#9fb3c8', 13); return; }
      const a = GL.U.angleTo(p, best);
      p.x = best.x + Math.cos(a) * (best.r + 26); p.y = best.y + Math.sin(a) * (best.r + 26);
      p.iframe = Math.max(p.iframe, 0.25);
      C.hitEnemy(best, ch, s.coef, s.frac, { ...opt, stun: 0.4 });
      C.slash(p.x, p.y, a + Math.PI, 60, GL.U.deg(120), '#b48cff');
      p.lock = 0.25;
    }
  },

  // ---------- 궁극기 R ----------
  ultimate() {
    const p = this.player, ch = this.active(), s = ch.cfg.r, C = GL.Combat;
    if (p.z > 0.5 || p.dash) return;
    if (ch.ult < ch.ultMax) { C.text(p.x, p.y - 36, `궁극기 ${Math.floor(ch.ult)}/${ch.ultMax}`, '#9fb3c8', 13); return; }
    ch.ult = 0; ch.combo = 0; p.guard = 0; this.aim();
    this.setAnim('ult', 0.8);
    GL.Haptics.ult();
    C.text(p.x, p.y - 56, s.name, '#ffffff', 22);
    if (GL.Kits[ch.id] && GL.Kits[ch.id].r) { GL.Kits[ch.id].r(ch, p, s); return; }
    if (ch.id === 'ian') {
      p.lock = 0.6; p.iframe = 0.6;
      this.later(0.25, () => {
        C.hitArea({ kind: 'circle', x: p.x, y: p.y, r: s.radius }, ch, s.coef, s.frac, { shatter: true, skill: true, stun: 1 });
        C.ring(p.x, p.y, s.radius, '#ffffff', 0.5); C.shards(p.x, p.y, 40); GL.World.shake = 14; GL.World.flash = 0.25;
      });
    } else if (ch.id === 'baren') {
      GL.World.buffs.barrier = s.dur;
      C.ring(p.x, p.y, 120, '#e0b54a', 0.6);
    } else if (ch.id === 'kay') {
      p.lock = 0.8; p.iframe = 0.8;
      for (let i = 0; i < s.hits; i++) {
        this.later(0.1 * i, () => {
          const shape = { kind: 'circle', x: p.x, y: p.y, r: s.radius };
          C.hitArea(shape, ch, s.coef / s.hits, s.frac / s.hits, { shatter: true, skill: true });
          C.slash(p.x, p.y, Math.random() * 6.28, s.radius * 0.8, GL.U.deg(70), '#e6d6ff', 0.15);
        });
      }
      GL.World.shake = 8;
    }
  },

  // R 길게 : 이안 인과 역류 (자의 발동) — 반작용 불안정 단계부터 / 그 외 캐릭터는 궁극기
  rHold() {
    const ch = this.active(), p = this.player, C = GL.Combat, R = GL.CONFIG.chars.ian.reaction;
    // 임계 상태면 다른 동료로 싸우는 중이어도 R 길게 = 이안을 불러내 자의 발동 (강제 폭주를 피하는 선택)
    if (ch.id !== 'ian' && !(GL.Ian.member() && GL.Ian.stage() === 'critical' && GL.Ian.after <= 0)) return this.ultimate();
    if (GL.Ian.backflow) return;
    if (!GL.Ian.canPlayerActivate()) { C.text(p.x, p.y - 44, `반작용 ${Math.floor(GL.Ian.reaction)}/${R.unstable} — 불안정 단계부터 발동`, '#9fb3c8', 13); return; }
    this.setAnim('ult', 0.8);
    GL.Ian.activate('player');
  },

  // ---------- 태그 (숫자키 짧게) ----------
  tag(idx) {
    const p = this.player, C = GL.Combat;
    if (idx === this.activeIdx || !this.members[idx]) return;
    if (GL.Ian.backflow) { C.text(p.x, p.y - 30, '인과 역류 중 — 교체 불가', '#ff5a6e', 13); return; }
    const m = this.members[idx];
    if (m.hp <= 0) { C.text(p.x, p.y - 30, `${m.name} 전투 불능`, '#9fb3c8', 13); return; }
    if (this.tagCd > 0) return;
    this.activeIdx = idx; this.tagCd = GL.CONFIG.rules.tagCooldown;
    p.lock = 0; p.guard = 0; p.buffer = null; p.iframe = Math.max(p.iframe, 0.2);
    C.ring(p.x, p.y, 50, m.color, 0.3);
    C.text(p.x, p.y - 40, m.name, m.color, 16);
  },

  // ---------- 조력 스킬 (숫자키 0.5초 홀딩) ----------
  assist(idx) {
    const p = this.player, C = GL.Combat, W = GL.World;
    const m = this.members[idx];
    if (!m) return;
    if (idx === this.activeIdx) { C.text(p.x, p.y - 30, '조력은 대기 중인 파티원만', '#9fb3c8', 13); return; }
    if (m.hp <= 0) return;
    if (m.cd.assist > 0) { C.text(p.x, p.y - 30, `${m.name} 조력 ${m.cd.assist.toFixed(1)}초`, '#9fb3c8', 13); return; }
    const a = m.cfg.assist;
    m.cd.assist = GL.CONFIG.rules.assistCooldown;
    C.text(p.x, p.y - 60, `${m.name} 조력 : ${a.name}`, m.color, 16);
    C.ring(p.x, p.y, 90, m.color, 0.45);
    if (m.id === 'ian') { W.buffs.shield = Math.round(this.active().maxHp * a.shieldRatio); W.buffs.shieldT = a.dur; }
    if (m.id === 'baren') W.buffs.fortress = a.dur;
    if (m.id === 'kay') { W.buffs.weakAll = a.dur; W.buffs.defDown = a.defDown; }
    if (GL.Kits[m.id] && GL.Kits[m.id].assist) GL.Kits[m.id].assist(m);
  },

  onActiveDown() {
    const p = this.player;
    GL.Combat.text(p.x, p.y - 50, `${this.active().name} 전투 불능`, '#ff5a6e', 18);
    GL.Haptics.down();
    const next = this.members.findIndex(m => m.hp > 0);
    if (next < 0) { GL.Main.gameOver(); return; }
    this.activeIdx = next; this.tagCd = 0; p.iframe = 1.0; p.lock = 0; p.guard = 0;
  },

  healAll(ratio, quiet) {
    for (const m of this.members) if (m.hp > 0) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * ratio);
    if (!quiet) GL.Combat.text(this.player.x, this.player.y - 36, '파티 회복', '#f3c6ff', 15);
  },

  healActive(ratio) {
    const ch = this.active();
    const v = Math.round(ch.maxHp * ratio);
    ch.hp = Math.min(ch.maxHp, ch.hp + v);
    GL.Combat.text(this.player.x, this.player.y - 36, `+${v}`, '#3fe0a8', 16);
  },
};
