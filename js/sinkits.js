// ============================================================
// sinkits.js — 7대죄 기술 (마스터 모드 전용 플레이)
// 원래 플레이 불가 적대 세력. 마스터 모드에서 파티 편성에 나타나며, 수치는 config.js 의 임시값
// 백토르(오만) · 플로토(탐욕) · 아레스(분노) · 인바디(질투) · 아사디(색욕) · 루시엘(나태) · 굴라(폭식)
// 공통 훅 : light / heavy / q / e / r / assist / land(착지) / tick(매 프레임) / dmgMul / onHit / onHurt / move(이동 속도 보너스) / reset
// ============================================================
(() => {
  const K = GL.Kits, U = () => GL.U, C = () => GL.Combat, W = () => GL.World;
  const arc = (ch, p, d, coef, frac, opts, color, mul = 1) => {
    const r = d.range * mul, a = U().deg(d.arc);
    C().hitArea({ kind: 'arc', x: p.x, y: p.y, dir: p.facing, r, arc: a }, ch, coef, frac, opts);
    C().slash(p.x, p.y, p.facing, r, a, color);
  };
  const circ = (ch, x, y, r, coef, frac, opts, color, life = 0.35) => {
    C().hitArea({ kind: 'circle', x, y, r }, ch, coef, frac, opts);
    C().ring(x, y, r, color, life);
  };
  const line = (ch, p, len, w, coef, frac, opts, color, dir = p.facing, x = p.x, y = p.y) => {
    C().hitArea({ kind: 'line', x, y, dir, len, w }, ch, coef, frac, opts);
    C().line(x, y, dir, len, w * 0.6, color, 0.25);
  };
  const nearest = (p, range, filter) => {
    let best = null, bd = range;
    for (const e of W().enemies) { if (e.dead || (filter && !filter(e))) continue; const d = U().dist(p, e); if (d < bd) { bd = d; best = e; } }
    return best;
  };
  const inRange = (x, y, r) => W().enemies.filter(e => !e.dead && U().dist({ x, y }, e) < r);
  K.isSin = (id) => !!(GL.CONFIG.chars[id] && GL.CONFIG.chars[id].sin);

  // ====== 백토르 (오만) : 레이피어 · 격리 큐브 & 오만한 연산 ======
  K.baektor = {
    calc: 0, // 피격 없이 지난 시간 (오만한 연산)
    reset() { this.calc = 0; },
    k(ch) { return Math.min(1, this.calc / ch.cfg.passive.full); },
    tick(dt) { this.calc += dt; },
    onHurt() { if (this.calc > 1) GL.Combat.text(GL.Party.player.x, GL.Party.player.y - 56, '연산 초기화', '#e8e8ff', 12); this.calc = 0; },
    move(ch) { return ch.cfg.passive.speedMax * this.k(ch); },
    light(step, ch, p, d) {
      p.lock *= 1 - ch.cfg.passive.lockCut * this.k(ch);
      const col = '#e8e8ff';
      if (d.thrust) {
        if (d.lunge) { p.x += Math.cos(p.facing) * d.lunge; p.y += Math.sin(p.facing) * d.lunge; }
        line(ch, p, d.len, d.w, d.coef, d.frac, { stun: d.stun || 0.2, shatter: step === 3 }, col);
      } else if (d.zcut) {      // Z 컷 : 서로 다른 방향 3연속
        [-0.5, 0.5, -0.3].forEach((o, i) => GL.Party.later(i * 0.07, () => {
          C().hitArea({ kind: 'arc', x: p.x, y: p.y, dir: p.facing + o, r: d.range, arc: U().deg(70) }, ch, d.coef, d.frac, { stun: 0.2 });
          C().slash(p.x, p.y, p.facing + o, d.range, U().deg(70), col, 0.14);
        }));
      } else if (d.grid) {      // 질서의 참격 : 사각 그리드
        const c = K.fwd(p, d.len / 2);
        C().hitArea({ kind: 'line', x: p.x, y: p.y, dir: p.facing, len: d.len, w: d.w }, ch, d.coef, d.frac, { shatter: true, stun: 0.6 });
        W().fx.push({ kind: 'cube', x: c.x, y: c.y, size: d.w * 0.55, life: 0.45, t: 0, color: col, dir: p.facing });
        C().shards(c.x, c.y, 8);
      }
    },
    heavy(ch, p, h) {           // 환영 난사 : 찌르기 잔상 연타
      p.lock = 0.7;
      for (let i = 0; i < h.hits; i++) GL.Party.later(i * 0.06, () => {
        const o = U().rand(-0.25, 0.25);
        line(ch, p, h.len, h.w * 0.5, h.coef, h.frac, { shatter: i === h.hits - 1, stun: 0.3 }, '#ffffff', p.facing + o);
      });
    },
    q(ch, p, s) {               // 성관 단죄 : 돌진 찌르기 + 섬광 고경직
      const f = p.facing;
      line(ch, p, s.dash + 40, 50, s.coef, s.frac, { shatter: true, skill: true, stun: s.stun }, '#ffffff');
      p.dash = { t: 0.14, vx: Math.cos(f) * s.dash / 0.14, vy: Math.sin(f) * s.dash / 0.14 };
      p.iframe = Math.max(p.iframe, 0.2); W().flash = 0.12;
    },
    e(ch, p, s) {               // 격리 큐브 : 대상을 큐브에 가둠 (행동 정지 + 받는 피해 증가)
      const t = GL.Party.softTarget && !GL.Party.softTarget.dead ? GL.Party.softTarget : nearest(p, s.range);
      if (!t) { ch.cd.e = 0; C().text(p.x, p.y - 30, '대상 없음', '#9fb3c8', 13); return; }
      t.frozenT = Math.max(t.frozenT || 0, t.boss ? s.dur * 0.4 : s.dur);
      t.isolateT = s.dur; t.isolateMul = s.dmgTaken;
      C().hitEnemy(t, ch, s.coef, s.frac, { skill: true, shatter: true });
      W().fx.push({ kind: 'cube', x: t.x, y: t.y, size: (t.r || 20) + 26, life: s.dur, t: 0, color: '#e8e8ff', follow: t });
      p.lock = 0.25;
    },
    r(ch, p, s) {               // 시스템 단죄 : 큐브 위로 단죄의 검 수직 강하
      const list = inRange(p.x, p.y, s.radius);
      p.lock = 0.6; p.iframe = 1.0;
      const c = list.length ? { x: list.reduce((a, e) => a + e.x, 0) / list.length, y: list.reduce((a, e) => a + e.y, 0) / list.length } : K.fwd(p, 120);
      for (const e of list) { e.frozenT = Math.max(e.frozenT || 0, s.delay + 0.2); W().fx.push({ kind: 'cube', x: e.x, y: e.y, size: (e.r || 20) + 22, life: s.delay + 0.3, t: 0, color: '#e8e8ff', follow: e }); }
      W().fx.push({ kind: 'bigsword', x: c.x, y: c.y, life: s.delay + 0.3, t: 0, drop: s.delay });
      GL.Party.later(s.delay, () => {
        circ(ch, c.x, c.y, s.radius * 0.75, s.coef, s.frac, { shatter: true, skill: true, stun: 1.5 }, '#ffffff', 0.6);
        C().shards(c.x, c.y, 30); W().shake = 16; W().flash = 0.25;
      });
    },
    assist(m) { W().buffs.cubeCut = m.cfg.assist.dur; },
  };

  // ====== 플로토 (탐욕) : 사슬 톱날 채찍 · 갈취 & 데이터 압쇄 ======
  K.ploto = {
    stacks: 0, keepT: 0,
    reset() { this.stacks = 0; this.keepT = 0; },
    tick(dt) { if (this.keepT > 0) { this.keepT -= dt; if (this.keepT <= 0) this.stacks = 0; } },
    dmgMul(ch) { return 1 + this.stacks * ch.cfg.passive.atkPer; },
    onHit(e, dmg, opts, ch) {   // 탐욕의 갈취 : 체력 흡수 + 공격력 누적
      const P = ch.cfg.passive;
      ch.hp = Math.min(ch.maxHp, ch.hp + dmg * P.steal);
      this.stacks = Math.min(P.max, this.stacks + 1); this.keepT = P.keep;
    },
    bleed(ch, t) { return { t, dps: ch.atk * 0.12 }; },
    light(step, ch, p, d) {
      const col = '#d2304a';
      if (d.hook) {             // 갈고리 포박 : 찍어서 끌어오며 체력 흡수
        const hit = [];
        C().hitArea({ kind: 'line', x: p.x, y: p.y, dir: p.facing, len: d.len, w: d.w }, ch, d.coef, d.frac, { shatter: true, stun: 0.6, pull: { ...K.fwd(p, 40), amt: 200 }, hitSet: { has: () => false, add: (e) => hit.push(e) } });
        C().line(p.x, p.y, p.facing, d.len, 10, col, 0.3);
        if (hit.length) { const v = Math.round(ch.maxHp * d.drain * hit.length); ch.hp = Math.min(ch.maxHp, ch.hp + v); C().text(p.x, p.y - 40, `+${v}`, '#ff8a9a', 14); }
      } else if (d.radius) circ(ch, p.x, p.y, d.radius, d.coef, d.frac, { bleed: this.bleed(ch, d.bleed) }, col);
      else arc(ch, p, d, d.coef, d.frac, { bleed: this.bleed(ch, d.bleed), stun: 0.2 }, col);
    },
    heavy(ch, p, h) {           // 포식 : 넓게 회전시켜 끌어당기고 이동 속도를 빼앗음
      p.lock = 0.5;
      circ(ch, p.x, p.y, h.radius, h.coef, h.frac, { shatter: true, slow: h.slow, pull: { x: p.x, y: p.y, amt: h.pull } }, '#d2304a', 0.5);
      W().buffs.plotoSpeed = h.slow;
    },
    land(ch, p, heavy, d) { for (const e of inRange(p.x, p.y, d.radius + 60)) if (!e.boss) { const k = Math.min(1, d.pull / Math.max(1, U().dist(p, e))); e.x += (p.x - e.x) * k; e.y += (p.y - e.y) * k; } },
    move() { return W().buffs.plotoSpeed > 0 ? 0.25 : 0; },
    q(ch, p, s) {               // 생명력 강탈
      const t = nearest(p, s.range);
      if (!t) { ch.cd.q = 0; C().text(p.x, p.y - 30, '대상 없음', '#9fb3c8', 13); return; }
      C().hitEnemy(t, ch, s.coef, s.frac, { shatter: true, skill: true, stun: 0.8 });
      C().line(p.x, p.y, U().angleTo(p, t), U().dist(p, t), 8, '#d2304a', 0.4);
      const v = Math.round(ch.maxHp * s.heal); ch.hp = Math.min(ch.maxHp, ch.hp + v);
      C().text(p.x, p.y - 40, `강탈 +${v}`, '#ff8a9a', 16); p.lock = 0.3;
    },
    e(ch, p, s) {               // 검붉은 톱날파
      K.shot({ x: p.x, y: p.y, vx: Math.cos(p.facing) * 560, vy: Math.sin(p.facing) * 560, r: 26, life: s.len / 560, ch, coef: s.coef, frac: s.frac, saw: true, color: '#d2304a', pierce: true, multi: 0.2, opts: { shatter: true, skill: true, bleed: this.bleed(ch, 4) }, hit: new Set() });
      p.lock = 0.25;
    },
    r(ch, p, s) {               // 탐욕의 구체 : 거대 구체가 주변을 빨아들여 압쇄
      const c = K.fwd(p, 120); p.lock = 0.6; p.iframe = 0.8;
      W().fx.push({ kind: 'greedOrb', x: c.x, y: c.y, life: s.hits * 0.15 + 0.3, t: 0, r: s.radius * 0.35 });
      for (let i = 0; i < s.hits; i++) GL.Party.later(0.15 * i, () => {
        circ(ch, c.x, c.y, s.radius, s.coef, s.frac, { shatter: i === s.hits - 1, skill: true, pull: { x: c.x, y: c.y, amt: s.pull } }, '#d2304a', 0.2);
        W().eShots = W().eShots.filter(x => U().dist(x, c) > s.radius);   // 데이터(투사체)도 집어삼킴
      });
    },
    assist(m) { W().buffs.lifesteal = m.cfg.assist.dur; },
  };

  // ====== 아레스 (분노) : 양손 대검 · 핏빛 광란 & 전장 양분 ======
  K.ares = {
    reset() {},
    lowK(ch) { return 1 - ch.hp / ch.maxHp; },
    dmgMul(ch) { return 1 + ch.cfg.passive.dmgMax * this.lowK(ch); },
    reduce(ch) { return ch.cfg.passive.reduceMax * this.lowK(ch) + (W().buffs.aresRage > 0 ? ch.cfg.q.reduce : 0); },
    mul() { return W().buffs.aresRage > 0 ? GL.CONFIG.chars.ares.q.range : 1; },
    light(step, ch, p, d) {
      const col = '#ff4a2a', m = this.mul();
      if (d.wave) {             // 단두대 : 혈흔 충격파
        line(ch, p, d.len * m, d.w * m, d.coef, d.frac, { shatter: true, stun: 0.8 }, col);
        C().shards(K.fwd(p, 60).x, K.fwd(p, 60).y, 10); W().shake = 8;
      } else arc(ch, p, d, d.coef, d.frac, { stun: d.stun || 0.3, launch: d.launch ? 0.8 : 0, knock: 15 }, col, m);
      if (step === 1) W().shake = Math.max(W().shake, 5);
    },
    heavy(ch, p, h) {           // 혈흔 파동 : 회전 베기 + 전방 충격파
      p.lock = 0.6; const m = this.mul();
      circ(ch, p.x, p.y, h.radius * m, h.coef * 0.5, h.frac * 0.5, { shatter: true, knock: 30 }, '#ff4a2a');
      GL.Party.later(0.15, () => line(ch, p, h.len * m, h.w * m, h.coef, h.frac, { shatter: true, stun: 0.6 }, '#ff2a1a'));
      W().shake = 9;
    },
    q(ch, p, s) { W().buffs.aresRage = s.dur; C().ring(p.x, p.y, 120, '#ff4a2a', 0.6); p.lock = 0.3; },
    e(ch, p, s) {               // 자폭파 : 체력을 깎아 주변 전체 폭발
      ch.hp = Math.max(1, ch.hp - ch.maxHp * s.hpCost);
      p.lock = 0.5; p.iframe = Math.max(p.iframe, 0.4);
      circ(ch, p.x, p.y, s.radius, s.coef, s.frac, { shatter: true, skill: true, knock: 60, stun: 0.8 }, '#ff2a1a', 0.6);
      C().shards(p.x, p.y, 24); W().shake = 14; W().flash = 0.15;
    },
    r(ch, p, s) {               // 비극의 단두대 : 전장을 양분하는 참격
      p.lock = 0.7; p.iframe = 0.8;
      GL.Party.later(0.3, () => {
        const sx = p.x - Math.cos(p.facing) * s.len * 0.3, sy = p.y - Math.sin(p.facing) * s.len * 0.3;
        line(ch, p, s.len, s.w, s.coef, s.frac, { shatter: true, skill: true, stun: 1.5 }, '#ff2a1a', p.facing, sx, sy);
        C().line(sx, sy, p.facing, s.len, 8, '#ffffff', 0.6);
        W().shake = 18; W().flash = 0.2;
      });
    },
    assist(m) { W().buffs.berserk = m.cfg.assist.dur; },
  };

  // ====== 인바디 (질투) : 대형 낫 · 위상 반전 & 그림자 분신 ======
  K.invidi = {
    stacks: 0, keepT: 0,
    reset() { this.stacks = 0; this.keepT = 0; },
    tick(dt) { if (this.keepT > 0) { this.keepT -= dt; if (this.keepT <= 0) this.stacks = Math.max(0, this.stacks - 5); } },
    dmgMul(ch) { return 1 + this.stacks * ch.cfg.passive.per; },
    onHit(e, dmg, opts, ch) { const P = ch.cfg.passive; this.stacks = Math.min(P.max, this.stacks + 1); this.keepT = P.keep; },
    light(step, ch, p, d) {
      arc(ch, p, d, d.coef, d.frac, { stun: d.stun || 0.25, knock: d.knock || 0, shatter: step === 4, defDown: d.defDown ? { v: d.defDown, t: 5 } : undefined }, '#5ad18c');
    },
    heavy(ch, p, h) {           // 기습치기 : 그림자로 숨어 적 뒤에서 솟구침
      const t = nearest(p, h.range);
      p.lock = 0.45; p.iframe = Math.max(p.iframe, 0.35);
      if (t) { const a = U().angleTo(t, p) + Math.PI; p.x = t.x + Math.cos(a) * ((t.r || 20) + 24); p.y = t.y + Math.sin(a) * ((t.r || 20) + 24); p.facing = U().angleTo(p, t); }
      circ(ch, p.x, p.y, h.radius, h.coef, h.frac, { shatter: true, launch: 1.0, stun: 0.6 }, '#5ad18c', 0.4);
      W().fx.push({ kind: 'shadow', x: p.x, y: p.y, life: 0.5, t: 0 });
    },
    q(ch, p, s) {               // 위상반전 : 대상과 위치 교체
      const t = nearest(p, s.range, e => !e.boss) || nearest(p, s.range);
      if (!t) { ch.cd.q = 0; C().text(p.x, p.y - 30, '대상 없음', '#9fb3c8', 13); return; }
      const ox = p.x, oy = p.y;
      W().fx.push({ kind: 'shadow', x: ox, y: oy, life: 0.4, t: 0 });
      if (!t.boss) { p.x = t.x; p.y = t.y; t.x = ox; t.y = oy; } else { const a = U().angleTo(t, p); p.x = t.x + Math.cos(a) * ((t.r || 30) + 30); p.y = t.y + Math.sin(a) * ((t.r || 30) + 30); }
      p.iframe = Math.max(p.iframe, 0.3);
      C().hitEnemy(t, ch, s.coef, s.frac, { shatter: true, skill: true, stun: s.stun });
      C().ring(p.x, p.y, 60, '#5ad18c', 0.3); p.lock = 0.25;
    },
    e(ch, p, s) { circ(ch, p.x, p.y, s.radius, s.coef, s.frac, { shatter: true, skill: true, seal: s.seal, slow: s.slow }, '#2a6a44', 0.6); p.lock = 0.3; },
    r(ch, p, s) {               // 분신 무도회 : 그림자 분신이 돌아가며 난타
      p.lock = 0.6; p.iframe = 1.2;
      W().fx.push({ kind: 'clones', x: p.x, y: p.y, life: s.hits * 0.09 + 0.3, t: 0, n: s.clones, r: s.radius * 0.5 });
      for (let i = 0; i < s.hits; i++) GL.Party.later(0.09 * i, () => {
        const list = inRange(p.x, p.y, s.radius), tg = list.length ? U().pick(list) : null;
        if (tg) { C().hitEnemy(tg, ch, s.coef, s.frac, { shatter: i === s.hits - 1, skill: true, stun: 0.3 }); C().slash(tg.x, tg.y, Math.random() * 6.28, 50, U().deg(120), '#5ad18c', 0.15); }
      });
    },
    assist(m) { W().buffs.mirror = m.cfg.assist.dur; },
  };

  // ====== 아사디 (색욕) : 가시 채찍 & 바늘 · 이성 마비 & 연쇄 매혹 ======
  K.asadi = {
    reset() {},
    tick(dt) {                  // 매혹된 적 : 무방비하게 플레이어 쪽으로 걸어옴
      const p = GL.Party.player;
      for (const e of W().enemies) {
        if (e.dead || !(e.charmT > 0)) continue;
        e.charmT -= dt; e.sealT = Math.max(e.sealT || 0, 0.2); e.stun = Math.max(e.stun || 0, 0.1);
        if (!e.boss && U().dist(e, p) > 50) { const a = U().angleTo(e, p); e.x += Math.cos(a) * 45 * dt; e.y += Math.sin(a) * 45 * dt; }
      }
      if (W().buffs.taint > 0) for (const e of inRange(p.x, p.y, GL.CONFIG.chars.asadi.assist.radius)) { e.slowT = Math.max(e.slowT || 0, 0.3); e.defDown = Math.max(e.defDown || 0, 0.15); e.defDownT = Math.max(e.defDownT || 0, 0.3); }
    },
    paralyze(ch) { const P = ch.cfg.passive; return { v: P.defDown, t: P.dur }; },
    charm(list, t) { for (const e of list) { e.charmT = Math.max(e.charmT || 0, e.boss ? t * 0.3 : t); C().text(e.x, e.y - (e.r || 20) - 14, '매혹', '#e6a6ff', 12); } },
    needles(ch, p, n, spread, coef, frac, opts) {
      for (let i = 0; i < n; i++) { const a = p.facing + (n > 1 ? (i - (n - 1) / 2) * spread : 0); K.shot({ x: p.x, y: p.y, vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, r: 6, life: 0.45, ch, coef, frac, needle: true, color: '#c26bff', opts }); }
    },
    light(step, ch, p, d) {
      const col = '#c26bff';
      if (d.needles) this.needles(ch, p, d.needles, 0.12, d.coef, d.frac, {});
      else if (d.len) line(ch, p, d.len, d.w, d.coef, d.frac, { stun: 0.4, defDown: { v: 0.1, t: 3 } }, col);
      else {
        arc(ch, p, d, d.coef, d.frac, { knock: d.knock || 0, shatter: step === 4 }, col);
        if (d.gas) W().fields.push({ kind: 'zone', x: K.fwd(p, 70).x, y: K.fwd(p, 70).y, r: 90, life: 3, color: '#c26bff', tick: 0, every: 0.5, ch, coef: 10, effect: { defDown: this.paralyze(ch), slow: 1 } });
      }
    },
    heavy(ch, p, h) {           // 자색 향수 유포 : 범위 매혹
      p.lock = 0.5;
      const list = inRange(p.x, p.y, h.radius);
      C().hitArea({ kind: 'circle', x: p.x, y: p.y, r: h.radius }, ch, h.coef, h.frac, { shatter: true, defDown: this.paralyze(ch) });
      this.charm(list, h.charm);
      W().fields.push({ kind: 'zone', x: p.x, y: p.y, r: h.radius, life: 1.2, color: '#e6a6ff' });
    },
    land(ch, p, heavy, d) { const o = { ...p, facing: p.facing }; this.needles(ch, o, d.needles, 0.22, d.coef * 0.3, 1, {}); },
    q(ch, p, s) {               // 가시 덩굴 : 속박
      const c = K.aimPoint(p, 160);
      circ(ch, c.x, c.y, s.radius, s.coef, s.frac, { shatter: true, skill: true, stun: s.root, defDown: this.paralyze(ch) }, '#8a3ac2', 0.5);
      W().fields.push({ kind: 'zone', x: c.x, y: c.y, r: s.radius, life: s.root, color: '#8a3ac2', thorns: true });
      p.lock = 0.3;
    },
    e(ch, p, s) {               // 환각 연기 : 이성 마비 (봉인 + 방어 저하)
      W().fields.push({ kind: 'zone', x: p.x, y: p.y, r: s.radius, life: s.dur, color: '#b070e0', tick: 0, every: 0.5, ch, coef: s.coef, effect: { defDown: this.paralyze(ch), seal: 0.6, slow: 0.6 } });
      p.lock = 0.25;
    },
    r(ch, p, s) {               // 가시밭 : 매혹 + 연쇄 폭발
      p.lock = 0.6; p.iframe = 0.8;
      this.charm(inRange(p.x, p.y, s.radius), 3);
      W().fields.push({ kind: 'zone', x: p.x, y: p.y, r: s.radius, life: s.blasts * 0.18 + 0.4, color: '#c26bff', thorns: true });
      for (let i = 0; i < s.blasts; i++) GL.Party.later(0.3 + i * 0.18, () => {
        const list = inRange(p.x, p.y, s.radius), tg = list.length ? U().pick(list) : { x: p.x + U().rand(-s.radius, s.radius) * 0.6, y: p.y + U().rand(-s.radius, s.radius) * 0.6 };
        circ(ch, tg.x, tg.y, 70, s.coef, s.frac, { shatter: true, skill: true, defDown: this.paralyze(ch) }, '#e6a6ff', 0.3);
        C().sparks(tg.x, tg.y, 6, '#e6a6ff');
      });
    },
    assist(m) { W().buffs.taint = m.cfg.assist.dur; },
  };

  // ====== 루시엘 (나태) : 시계 추 메이스 · 정지 구체 & 시간 도둑 ======
  K.luciel = {
    reset() {},
    tick() {                    // 나태의 숲 : 주변 적 자동 감속
      const ch = GL.Party.active(); if (!ch || ch.id !== 'luciel') return;
      const P = ch.cfg.passive, p = GL.Party.player;
      for (const e of inRange(p.x, p.y, P.radius)) e.slowT = Math.max(e.slowT || 0, 0.2);
    },
    field(ch, x, y, r, life) { W().fields.push({ kind: 'zone', x, y, r, life, color: '#a0a8b8', clock: true, tick: 0, every: 0.3, ch, coef: 0, effect: { slow: 0.6, freezeShots: true } }); },
    light(step, ch, p, d) {
      const col = '#c8d0dc';
      if (d.field) { const c = K.fwd(p, 70); circ(ch, c.x, c.y, d.radius, d.coef, d.frac, { stun: 0.3 }, col); this.field(ch, c.x, c.y, d.radius, d.field); }
      else if (d.radius) { circ(ch, p.x, p.y, d.radius, d.coef, d.frac, { shatter: true, slow: d.slow }, col, 0.5); C().text(p.x, p.y - 60, '데엥—', '#c8d0dc', 13); }
      else arc(ch, p, d, d.coef, d.frac, { stun: d.stun || 0.3, knock: d.knock || 0 }, col);
    },
    heavy(ch, p, h) {           // 그레비티 : 투사체·움직임을 극도로 느리게 하는 중력 지대
      const c = K.fwd(p, h.dist); p.lock = 0.5;
      circ(ch, c.x, c.y, h.radius, h.coef, h.frac, { shatter: true, slow: h.dur }, '#a0a8b8', 0.5);
      W().fields.push({ kind: 'zone', x: c.x, y: c.y, r: h.radius, life: h.dur, color: '#707888', clock: true, tick: 0, every: 0.25, ch, coef: 0, effect: { slow: 0.5, seal: 0.3, freezeShots: true } });
    },
    land(ch, p, heavy, d) { this.field(ch, p.x, p.y, d.radius, d.field); },
    q(ch, p, s) {               // 정지 구체
      for (let i = 0; i < s.count; i++) { const a = p.facing + (i - (s.count - 1) / 2) * 0.3; K.shot({ x: p.x, y: p.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 14, life: 1.4, ch, coef: s.coef, frac: s.frac, orb: true, color: '#c8d0dc', opts: { shatter: true, skill: true, slow: s.slow } }); }
      p.lock = 0.25;
    },
    e(ch, p, s) {               // 지연 : 적 쿨타임·투사체 속도를 극도로 늘림
      for (const e of inRange(p.x, p.y, s.radius)) { e.sealT = Math.max(e.sealT || 0, e.boss ? s.seal * 0.4 : s.seal); e.slowT = Math.max(e.slowT || 0, s.seal); }
      for (const x of W().eShots) if (U().dist(x, p) < s.radius * 1.5) x.frozenT = Math.max(x.frozenT || 0, s.freezeShots);
      C().ring(p.x, p.y, s.radius, '#c8d0dc', 0.6); W().fx.push({ kind: 'clockface', x: p.x, y: p.y, r: s.radius, life: 0.8, t: 0 });
      p.lock = 0.3;
    },
    r(ch, p, s) {               // 세계 정지 : 필드 전체 정지 → 루시엘만 움직여 단일타
      p.lock = 0.4; p.iframe = s.stop + 0.3;
      for (const e of W().enemies) if (!e.dead) e.frozenT = Math.max(e.frozenT || 0, s.stop);
      for (const x of W().eShots) x.frozenT = Math.max(x.frozenT || 0, s.stop);
      W().buffs.worldStop = s.stop; W().fields.push({ kind: 'timestop', x: p.x, y: p.y, r: 340, life: s.stop });
      GL.Party.later(s.stop * 0.7, () => {
        let best = null; for (const e of W().enemies) if (!e.dead && (!best || e.hp > best.hp)) best = e;
        if (!best) return;
        const a = U().angleTo(best, p); p.x = best.x + Math.cos(a) * ((best.r || 20) + 26); p.y = best.y + Math.sin(a) * ((best.r || 20) + 26); p.facing = U().angleTo(p, best);
        C().hitEnemy(best, ch, s.coef, s.frac, { shatter: true, skill: true, stun: 1 });
        C().ring(best.x, best.y, 120, '#ffffff', 0.5); C().shards(best.x, best.y, 26); W().shake = 14;
      });
    },
    assist(m) {                 // 시간 도둑 : 아군 쿨타임 감소
      const cut = m.cfg.assist.cut;
      for (const o of GL.Party.members) { o.cd.q = Math.max(0, o.cd.q - cut); o.cd.e = Math.max(0, o.cd.e - cut); }
      for (const e of W().enemies) if (!e.dead) e.sealT = Math.max(e.sealT || 0, 1.5);
    },
  };

  // ====== 굴라 (폭식) : 클로 & 생체 입 · 압쇄 포식 & 블랙홀 ======
  K.gula = {
    eaten: 0,
    reset() { this.eaten = 0; },
    feed(ch, n = 1) {           // 과식 : 삼킬 때마다 최대 체력·방어력 증가
      const P = ch.cfg.passive;
      for (let i = 0; i < n && this.eaten < P.max; i++) {
        this.eaten++; const add = Math.round(ch.cfg.hp * P.hpPer);
        ch.maxHp += add; ch.hp += add; ch.def += P.defPer;
      }
      C().text(GL.Party.player.x, GL.Party.player.y - 60, `과식 ${this.eaten}/${P.max}`, '#d8a040', 13);
    },
    light(step, ch, p, d) {
      const col = '#d8a040';
      if (d.lunge) { p.x += Math.cos(p.facing) * d.lunge; p.y += Math.sin(p.facing) * d.lunge; line(ch, p, d.len, d.w, d.coef, d.frac, { stun: d.stun, knock: d.knock }, col); }
      else if (d.spit) K.shot({ x: p.x, y: p.y, vx: Math.cos(p.facing) * 520, vy: Math.sin(p.facing) * 520, r: 16, life: 0.6, ch, coef: d.coef, frac: d.frac, slime: true, color: '#b8d040', opts: { shatter: true, knock: d.knock, slow: 2 } });
      else { arc(ch, p, d, d.coef, d.frac, { stun: 0.25 }, col); if (d.bite) W().fx.push({ kind: 'maw', x: K.fwd(p, 50).x, y: K.fwd(p, 50).y, dir: p.facing, life: 0.3, t: 0, s: 0.6 }); }
    },
    heavy(ch, p, h) {           // 집어 삼키기 : 전방 적·투사체를 삼킴
      p.lock = 0.55; const a = U().deg(h.arc);
      let n = 0;
      W().eShots = W().eShots.filter(x => { const ok = U().inArc(p, p.facing, h.range, a, x); if (ok) n++; return !ok; });
      const hit = C().hitArea({ kind: 'arc', x: p.x, y: p.y, dir: p.facing, r: h.range, arc: a }, ch, h.coef, h.frac, { shatter: true, pull: { ...K.fwd(p, 30), amt: 80 } });
      W().fx.push({ kind: 'maw', x: K.fwd(p, 60).x, y: K.fwd(p, 60).y, dir: p.facing, life: 0.45, t: 0, s: 1 });
      if (n + hit > 0) this.feed(ch, 1);
      if (n) C().text(p.x, p.y - 44, `투사체 ${n}개 삼킴`, '#d8a040', 14);
    },
    q(ch, p, s) {               // 블랙홀
      p.lock = 0.5;
      for (let i = 0; i < 4; i++) GL.Party.later(i * 0.15, () => circ(ch, p.x, p.y, s.radius, s.coef / 4, s.frac / 4, { skill: true, shatter: i === 3, pull: { x: p.x, y: p.y, amt: s.pull / 3 } }, '#6a4a20', 0.25));
      W().fx.push({ kind: 'vortex', x: p.x, y: p.y, life: 0.7, t: 0, r: s.radius });
    },
    e(ch, p, s) { arc(ch, p, s, s.coef, s.frac, { shatter: true, skill: true, slow: 3, defDown: { v: 0.15, t: 5 } }, '#b8d040'); p.lock = 0.3; },
    r(ch, p, s) {               // 대식의 아가리 : 전방 적을 한꺼번에 삼켜 압쇄
      p.lock = 0.8; p.iframe = 1.0;
      W().fx.push({ kind: 'maw', x: K.fwd(p, 90).x, y: K.fwd(p, 90).y, dir: p.facing, life: 0.9, t: 0, s: 2.6 });
      C().hitArea({ kind: 'arc', x: p.x, y: p.y, dir: p.facing, r: s.range, arc: U().deg(s.arc) }, ch, 0, 0, { pull: { ...K.fwd(p, 60), amt: s.pull }, stun: 1 });
      GL.Party.later(0.45, () => {
        const n = C().hitArea({ kind: 'arc', x: p.x, y: p.y, dir: p.facing, r: s.range * 0.8, arc: U().deg(s.arc) }, ch, s.coef, s.frac, { shatter: true, skill: true, stun: 1.5 });
        W().shake = 16; C().shards(K.fwd(p, 80).x, K.fwd(p, 80).y, 20);
        if (n) this.feed(ch, Math.min(3, n));
      });
    },
    assist(m) {                 // 식탄 : 회복 덩어리를 떨어뜨림 (F로 줍기)
      const p = GL.Party.player, A = m.cfg.assist;
      for (let i = 0; i < A.count; i++) { const a = i * 2.1; W().pickups.push({ x: p.x + Math.cos(a) * 70, y: p.y + Math.sin(a) * 70, kind: 'heal', v: A.heal, t: 0 }); }
    },
  };

  // 7대죄 공통 : 상태 초기화 / 매 프레임
  K.resetSins = () => { for (const id of GL.CONFIG.sinRoster) if (K[id].reset) K[id].reset(); W().buffs.plotoSpeed = 0; };
  K.tickSins = (dt) => {
    for (const id of GL.CONFIG.sinRoster) if (K[id].tick) K[id].tick(dt);
    for (const e of W().enemies) if (e.isolateT > 0) e.isolateT -= dt;
    if (W().buffs.plotoSpeed > 0) W().buffs.plotoSpeed = Math.max(0, W().buffs.plotoSpeed - dt);
  };
  K.moveBonus = () => { const ch = GL.Party.active(); const k = ch && K[ch.id]; return k && k.move ? k.move(ch) : 0; };
})();
