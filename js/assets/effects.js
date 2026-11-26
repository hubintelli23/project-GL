// ============================================================
// assets/effects.js — 이펙트 (공격 궤적, 파쇄 유리 파편, 예고 범위, 장판, 버프, 투사체, 아이템)
// 세 단계로 그린다 : solid(불투명 3D) → decal(바닥 반투명) → glow(빛 더하기)
// 실제 이펙트(파티클·셰이더)로 바꿀 때는 해당 함수만 교체하면 된다.
// ============================================================
GL.Assets = GL.Assets || {};

GL.Assets.Effects = {
  c(hex, a = 1) { return GL.G3.rgba(hex, a); },
  glass: { spec: 1.0, shine: 60, rim: 0.8 },

  // ---------- 1) 불투명 : 투사체, 파편, 불꽃, 아이템, 매듭, 그로기 별 ----------
  solid(G) {
    const W = GL.World, t = W.time;
    // 적 투사체 : 데이터 탄환 (핵 + 꼬리)
    for (const s of W.eShots) {
      const a = Math.atan2(s.vy, s.vx);
      G.draw('ball', G.chain(G.T(s.x, 40, s.y), G.S(6, 6, 6)), this.c('#ffe0c0'), 1);
      G.draw('cone2', G.chain(G.root(s.x, 40, s.y, a + Math.PI), G.Rz(-Math.PI / 2), G.S(5, 22, 5)), this.c('#ff8a3d', 0.85), 1);
    }
    // 플레이어 투사체 : 단검 / 반사 탄
    for (const s of W.pShots) {
      const a = Math.atan2(s.vy, s.vx);
      if (s.dagger) GL.Assets.Weapons.kay(G, G.root(s.x, 26, s.y, a), { glow: 1 });
      else if (s.chakram) {   // 노아 차크람 / 잔영
        const M = G.chain(G.T(s.x, 28, s.y), G.Ry(t * 18));
        G.draw('ring', G.chain(M, G.S(11, 11, 11)), this.c(s.color, s.ghost ? 0.5 : 1), 0.6, { spec: 0.9, shine: 40 });
        for (let i = 0; i < 4; i++) G.draw('blade', G.chain(M, G.Ry(i * 1.5708), G.T(9, 0, 0), G.Rx(Math.PI / 2), G.S(7, 20, 26)), this.c('#ffffff', s.ghost ? 0.5 : 1), 0.7);
      }
      else if (s.wave) G.draw('ball', G.chain(G.root(s.x, 22, s.y, a), G.S(10, 16, s.r)), this.c('#ffffff', 0.85), 1);   // 세레나 광휘 파동
      else if (s.orb) { G.draw('ball', G.chain(G.T(s.x, 32, s.y), G.S(6, 6, 6)), this.c('#ffffff'), 1); G.draw('thinRing', G.chain(G.T(s.x, 32, s.y), G.Rx(t * 6), G.S(10, 10, 10)), this.c(s.color), 1); }
      else if (s.saw) { const M = G.chain(G.T(s.x, 24, s.y), G.Ry(t * 22)); G.draw('ring', G.chain(M, G.S(s.r, s.r, s.r)), this.c(s.color), 0.7, { spec: 0.9, shine: 40 }); for (let i = 0; i < 10; i++) G.draw('cone2', G.chain(M, G.Ry(i * 0.628), G.T(s.r, 0, 0), G.Rz(-Math.PI / 2), G.S(2, 7, 2)), this.c('#ffd0d8'), 0.6); }
      else if (s.needle) G.draw('tube', G.chain(G.root(s.x, 28, s.y, a), G.Rz(-Math.PI / 2), G.S(0.9, 14, 0.9)), this.c(s.color), 1);
      else if (s.slime) G.draw('ball', G.chain(G.T(s.x, 24, s.y), G.S(s.r, s.r * 0.7, s.r)), this.c(s.color, 0.85), 0.5);
      else G.draw('ball', G.chain(G.T(s.x, 30, s.y), G.S(s.r, s.r, s.r)), this.c(s.color || '#ffffff'), 1);
    }
    // 유리 파편 / 불꽃
    for (const f of W.fx) {
      const k = f.t / f.life;
      if (f.kind === 'shard') {
        const hh = 12 + Math.sin(k * Math.PI) * 55;
        G.draw('octa', G.chain(G.T(f.x, hh, f.y), G.Ry(f.rot + k * 8), G.Rx(k * 6), G.S(f.size * 0.7, f.size, f.size * 0.25)), [0.85, 0.95, 1, 1 - k * 0.7], 0.55, this.glass);
      }
    }
    // 클레아 창조의 모루 낙하 / 새 장판의 입체 부분
    for (const f of W.fx) {
      if (f.kind === 'anvil') {
        const k = f.t / f.life, h = 420 * (1 - k * k);
        G.draw('box', G.chain(G.T(f.x, h + 20, f.y), G.S(70, 26, 44)), this.c('#7a6a5a'), 0.1, { spec: 0.8, shine: 40 });
        G.draw('box', G.chain(G.T(f.x, h + 40, f.y), G.S(90, 14, 30)), this.c('#9a8a7a'), 0.1, { spec: 0.8, shine: 40 });
        G.draw('box', G.chain(G.T(f.x, h + 6, f.y), G.S(40, 10, 36)), this.c('#ff9f5a'), 0.6);
      }
    }
    // 7대죄 이펙트 (입체)
    for (const f of W.fx) {
      const k = f.t / f.life;
      if (f.kind === 'cube') {            // 백토르 격리 큐브 : 모서리만 빛나는 디지털 상자
        if (f.follow && !f.follow.dead) { f.x = f.follow.x; f.y = f.follow.y; }
        const z = f.size, col = this.c(f.color || '#e8e8ff', 0.9 * (1 - k * 0.5));
        for (const [x, y, zz, sx, sy, sz] of [[0, 0, -z, z * 2, 1.6, 1.6], [0, 0, z, z * 2, 1.6, 1.6], [-z, 0, 0, 1.6, 1.6, z * 2], [z, 0, 0, 1.6, 1.6, z * 2],
          [0, z * 2, -z, z * 2, 1.6, 1.6], [0, z * 2, z, z * 2, 1.6, 1.6], [-z, z * 2, 0, 1.6, 1.6, z * 2], [z, z * 2, 0, 1.6, 1.6, z * 2],
          [-z, z, -z, 1.6, z * 2, 1.6], [z, z, -z, 1.6, z * 2, 1.6], [-z, z, z, 1.6, z * 2, 1.6], [z, z, z, 1.6, z * 2, 1.6]])
          G.draw('box', G.chain(G.T(f.x + x, y + 2, f.y + zz), G.S(sx, sy, sz)), col, 1);
        G.draw('box', G.chain(G.T(f.x, z, f.y), G.S(z * 2, z * 2, z * 2)), this.c(f.color || '#e8e8ff', 0.08), 0.6);
      } else if (f.kind === 'bigsword') { // 백토르 궁극기 : 단죄의 검 수직 강하
        const d = Math.min(1, f.t / f.drop), h = 520 * (1 - d * d) + 10;
        G.draw('box', G.chain(G.T(f.x, h + 160, f.y), G.S(12, 300, 44)), this.c('#f4f4ff'), 0.4, { spec: 0.9, shine: 50 });
        G.draw('box', G.chain(G.T(f.x, h + 320, f.y), G.S(16, 10, 110)), this.c('#c9a640'), 0.4, { spec: 0.9, shine: 50 });
        G.draw('cone2', G.chain(G.T(f.x, h + 10, f.y), G.Rz(Math.PI), G.S(6, 40, 22)), this.c('#ffffff'), 0.7);
      } else if (f.kind === 'greedOrb') { // 플로토 탐욕의 구체
        G.draw('ball', G.chain(G.T(f.x, 60, f.y), G.S(f.r, f.r, f.r)), this.c('#3a0610', 0.85), 0.2);
        for (let i = 0; i < 3; i++) G.draw('ring', G.chain(G.T(f.x, 60, f.y), G.Rx(t * (2 + i) + i), G.Ry(i), G.S(f.r * 1.2, f.r * 1.2, f.r * 1.2)), this.c('#d2304a'), 0.8);
      } else if (f.kind === 'shadow') {   // 인바디 그림자 출몰
        G.draw('cone2', G.chain(G.T(f.x, 0, f.y), G.S(18 * (1 - k) + 4, 50 * (1 - k), 18 * (1 - k) + 4)), this.c('#0a1a10', 0.8 * (1 - k)), 0.2);
      } else if (f.kind === 'clones') {   // 인바디 분신 무도회
        const pp = GL.Party.player;
        for (let i = 0; i < f.n; i++) { const a = t * 4 + i * 6.283 / f.n; GL.Assets.Characters.humanoid(G, GL.Assets.Characters.defs.invidi, GL.Assets.Characters.pose({ anim: { kind: 'light', t: (t * 3 + i) % 0.3, dur: 0.3, step: 1 + i % 4 } }, {}, t), pp.x + Math.cos(a) * f.r, 0, pp.y + Math.sin(a) * f.r, a + Math.PI, { alpha: 0.45 * (1 - k * 0.5), t }); }
      } else if (f.kind === 'maw') {      // 굴라 아가리
        const op = Math.sin(Math.min(1, k * 1.6) * Math.PI) * 0.9, sc = f.s;
        const M = G.root(f.x, 26 * sc, f.y, f.dir);
        G.draw('cone2', G.chain(M, G.Rz(-Math.PI / 2 + op), G.S(14 * sc, 30 * sc, 20 * sc)), this.c('#7a2a2a', 1 - k * 0.4), 0.1);
        G.draw('cone2', G.chain(M, G.Rz(-Math.PI / 2 - op), G.S(14 * sc, 30 * sc, 20 * sc)), this.c('#7a2a2a', 1 - k * 0.4), 0.1);
        for (let i = 0; i < 6; i++) G.draw('cone2', G.chain(M, G.T(20 * sc, 0, (i - 2.5) * 5 * sc), G.Rz(op), G.S(1.5 * sc, 6 * sc, 1.5 * sc)), this.c('#f4ecd8'), 0.2);
      } else if (f.kind === 'vortex') {   // 굴라 블랙홀
        for (let i = 0; i < 4; i++) G.draw('thinRing', G.chain(G.T(f.x, 10 + i * 6, f.y), G.Ry(t * 6 + i), G.S(f.r * (1 - k) * (0.4 + i * 0.15), 6, f.r * (1 - k) * (0.4 + i * 0.15))), this.c('#d8a040', 0.6), 0.6);
      }
    }
    for (const f of W.fields) {
      if (f.kind === 'zone' && f.thorns) for (let i = 0; i < 14; i++) { const a = i * 2.4, r = (i % 5 + 1) / 5 * f.r * 0.85; G.draw('cone2', G.chain(G.T(f.x + Math.cos(a) * r, 0, f.y + Math.sin(a) * r), G.Rx(Math.sin(i) * 0.3), G.S(2.4, 22 + (i % 3) * 8, 2.4)), this.c('#8a3ac2'), 0.35); }
      if (f.kind === 'prison') for (let i = 0; i < 10; i++) { const a = i * 0.628 + t * 0.4; G.draw('tube', G.chain(G.T(f.x + Math.cos(a) * f.r, 0, f.y + Math.sin(a) * f.r), G.S(2, 60, 2)), this.c('#bfe8ff', 0.9), 0.8); }
      if (f.kind === 'spikes') for (let i = 0; i < 12; i++) { const a = i * 2.4, r = (i % 4 + 1) / 4 * f.r * 0.85; G.draw('octa', G.chain(G.T(f.x + Math.cos(a) * r, 10, f.y + Math.sin(a) * r), G.Ry(a), G.S(4, 16 + (i % 3) * 6, 4)), [0.85, 0.95, 1, 0.85], 0.4, this.glass); }
    }
    // 이안 인과 역류 : 칠흑의 먹물 노이즈가 몸에서 뿜어져 나옴
    if (GL.Ian.backflow && GL.Party.active().id === 'ian') {
      const pp = GL.Party.player, forced = GL.Ian.backflow.mode === 'forced';
      for (let i = 0; i < 8; i++) {
        const a = t * 2 + i * 0.785, r = 14 + Math.sin(t * 5 + i) * 5;
        G.draw('cone2', G.chain(G.T(pp.x + Math.cos(a) * r, pp.z * 0.6 + 6, pp.y + Math.sin(a) * r), G.Rz(Math.sin(t * 3 + i) * 0.4), G.S(4, 26 + Math.sin(t * 7 + i) * 10, 4)), this.c(forced && i % 3 === 0 ? '#5a0010' : '#050505', 0.9), 0, { spec: 0.6, rim: 0.2 });
      }
    }
    // 회복 데이터
    for (const k of W.pickups) {
      const by = Math.sin(t * 4 + k.x) * 5;
      G.draw('octa', G.chain(G.T(k.x, 24 + by, k.y), G.Ry(t * 2), G.S(8, 12, 8)), this.c('#3fe0a8'), 0.85, this.glass);
      G.draw('thinRing', G.chain(G.T(k.x, 24 + by, k.y), G.Rx(t), G.S(13, 13, 13)), this.c('#c8fff0'), 1);
    }
    // 그로기 : 머리 위를 도는 유리 별
    for (const e of W.enemies) {
      if (e.dead || e.groggy <= 0) continue;
      const top = e.boss ? 150 : (e instanceof GL.Guardian ? 100 : 66);
      for (let i = 0; i < 4; i++) {
        const a = t * 4 + i * 1.57;
        G.draw('octa', G.chain(G.T(e.x + Math.cos(a) * (e.r + 8), top, e.y + Math.sin(a) * (e.r + 8)), G.Ry(t * 5), G.S(4, 6, 4)), this.c('#ffe066'), 1);
      }
    }
  },

  // ---------- 2) 바닥 반투명 : 그림자, 장판, 예고 범위, 역류 궤적, 약점 고리, 버프 ----------
  decals(G) {
    const W = GL.World, t = W.time, p = GL.Party.player;
    // 그림자
    G.decal(G.circle(p.x, p.y, 13 * Math.max(0.5, 1 - p.z / 300), 18), 0.4, [0, 0, 0, 0.5]);
    for (const e of W.enemies) if (!e.dead) G.decal(G.circle(e.x, e.y, e.r * 1.1, 18), 0.4, [0, 0, 0, 0.45]);
    this.fields(G, t);
    this.tele(G);
    this.reversal(G);
    // 약점 고리
    for (const e of W.enemies) {
      if (e.dead || !GL.Combat.weakVisible(e)) continue;
      G.decal(G.ringStrip(e.x, e.y, e.r + 12, e.r + 16 + Math.sin(t * 8) * 2), 1.5, [0.25, 0.88, 0.66, 0.8]);
    }
    // 플레이어 버프 / 차지 / 락온
    const B = W.buffs;
    if (B.barrier > 0) G.decal(G.ringStrip(p.x, p.y, 34, 40 + Math.sin(t * 6) * 2), 1.6, [0.88, 0.71, 0.29, 0.8]);
    if (B.fortress > 0) G.decal(G.ringStrip(p.x, p.y, 22, 25), 1.6, [0.88, 0.71, 0.29, 0.6]);
    const cr = GL.Input.chargeRatio();
    if (cr > 0.15) G.decal(G.ringStrip(p.x, p.y, 20, 25, -Math.PI / 2, 6.2832 * cr, 30), 1.7, [1, 1, 1, cr >= 1 ? 1 : 0.6]);
    const tg = GL.Party.softTarget;
    if (tg && !tg.dead) G.decal(G.ringStrip(tg.x, tg.y, (tg.r || 20) + 18, (tg.r || 20) + 21, t * 2, 4.5, 24), 1.7, [1, 1, 1, 0.5]);
    if (W.observe.on) for (const s of W.eShots) G.decal(G.rect(s.x, s.y, Math.atan2(s.vy, s.vx), Math.hypot(s.vx, s.vy) * 1.2, 3), 1.9, [0.25, 0.88, 0.66, 0.6]);
    // 회복 데이터 바닥 빛
    for (const k of W.pickups) G.decal(G.circle(k.x, k.y, 16), 0.6, [0.25, 0.88, 0.66, 0.25]);
  },

  fields(G, t) {
    for (const f of GL.World.fields) {
      if (f.kind === 'slow') {
        G.decal(G.circle(f.x, f.y, f.r), 0.8, [0.63, 0.43, 1, 0.16]);
        G.decal(G.ringStrip(f.x, f.y, f.r - 3, f.r), 0.9, [0.75, 0.6, 1, 0.7]);
        for (let i = 0; i < 12; i++) G.decal(G.rect(f.x + Math.cos(i * 0.5236) * (f.r - 14), f.y + Math.sin(i * 0.5236) * (f.r - 14), i * 0.5236, 8, 2), 0.95, [0.75, 0.6, 1, 0.6]); // 시계 눈금
        G.decal(G.rect(f.x, f.y, t * 2, f.r * 0.85, 4), 0.9, [0.75, 0.6, 1, 0.7]);
        G.decal(G.rect(f.x, f.y, t * 0.3, f.r * 0.55, 6), 0.9, [0.75, 0.6, 1, 0.7]);
      } else if (f.kind === 'rift') {
        if (!f.armed) { for (let i = 0; i < 12; i += 2) G.decal(G.ringStrip(f.x, f.y, f.r - 3, f.r, i / 12 * 6.283, 6.283 / 12, 4), 0.9, [1, 0.25, 0.35, 0.8]); }
        else {
          G.decal(G.circle(f.x, f.y, f.r), 0.8, [0.8, 0.08, 0.2, 0.3]);
          for (let i = 0; i < 7; i++) G.decal(G.rect(f.x, f.y, i * 0.9 + f.x, f.r * (0.6 + (i % 3) * 0.2), 3), 0.9, [1, 0.35, 0.45, 0.8]);
        }
      } else if (f.kind === 'prison') {
        G.decal(G.circle(f.x, f.y, f.r), 0.8, [0.5, 0.78, 0.9, 0.15]);
        G.decal(G.ringStrip(f.x, f.y, f.r - 4, f.r), 0.9, [0.75, 0.9, 1, 0.9]);
      } else if (f.kind === 'garden') {
        G.decal(G.circle(f.x, f.y, f.r), 0.8, [0.95, 0.75, 1, 0.16]);
        G.decal(G.ringStrip(f.x, f.y, f.r - 3, f.r), 0.9, [1, 0.9, 1, 0.8]);
        for (let i = 0; i < 9; i++) { const a = i * 0.7 + t * 0.3, r = (i % 3 + 1) / 3 * f.r * 0.8; G.decal(G.circle(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, 6, 6), 0.95, [1, 0.95, 1, 0.7]); }
      } else if (f.kind === 'spikes') {
        G.decal(G.circle(f.x, f.y, f.r), 0.8, [0.8, 0.95, 1, 0.14]);
      } else if (f.kind === 'timestop') {
        G.decal(G.ringStrip(f.x, f.y, f.r - 4, f.r), 0.9, [0.75, 0.9, 1, 0.8]);
        for (let i = 0; i < 12; i++) G.decal(G.rect(f.x + Math.cos(i * 0.5236) * (f.r - 22), f.y + Math.sin(i * 0.5236) * (f.r - 22), i * 0.5236, 16, 3), 0.95, [0.75, 0.9, 1, 0.7]);
      } else if (f.kind === 'zone') {   // 7대죄 범용 장판
        const c = this.c(f.color || '#ffffff');
        G.decal(G.circle(f.x, f.y, f.r), 0.8, [c[0], c[1], c[2], 0.18]);
        G.decal(G.ringStrip(f.x, f.y, f.r - 3, f.r), 0.9, [c[0], c[1], c[2], 0.8]);
        if (f.clock) { for (let i = 0; i < 12; i++) G.decal(G.rect(f.x + Math.cos(i * 0.5236) * (f.r - 12), f.y + Math.sin(i * 0.5236) * (f.r - 12), i * 0.5236, 8, 2), 0.95, [c[0], c[1], c[2], 0.7]); G.decal(G.rect(f.x, f.y, t * 0.4, f.r * 0.8, 3), 0.95, [c[0], c[1], c[2], 0.8]); }
      } else if (f.kind === 'cut') {
        const s = f.shape;
        G.decal(G.rect(s.x, s.y, s.dir, s.len, s.w), 0.8, [0.8, 1, 0.95, 0.12 + 0.05 * Math.sin(t * 20)]);
      }
    }
  },

  shapeTris(G, s) {
    if (s.kind === 'arc') return G.sector(s.x, s.y, s.r, s.dir, s.arc);
    if (s.kind === 'line') return G.rect(s.x, s.y, s.dir, s.len, s.w);
    return G.circle(s.x, s.y, s.r);
  },
  tele(G) {
    const t0 = GL.World.time;
    for (const t of GL.World.tele) {
      const k = Math.min(1, t.t / t.warn);
      const col = t.ally ? [1, 0.78, 0.4] : t.ghost ? [0.7, 0.43, 1] : (t.red ? [1, 0.16, 0.31] : [1, 0.59, 0.24]);
      G.decal(this.shapeTris(G, t), 1.0, [...col, 0.1 + 0.2 * k]);
      const inner = { ...t };
      if (t.kind === 'line') inner.len = t.len * k; else inner.r = (t.r || 60) * k;
      G.decal(this.shapeTris(G, inner), 1.1, [...col, 0.22]);
      const pulse = t.red ? 0.75 + 0.25 * Math.sin(t0 * 20) : 0.9;
      if (t.kind !== 'line') {
        const full = !(t.kind === 'arc' && t.arc < 6.28);
        G.decal(G.ringStrip(t.x, t.y, t.r - (t.red ? 5 : 3), t.r, full ? 0 : t.dir - t.arc / 2, full ? 6.2832 : t.arc, 30), 1.2, [...col, pulse]);
      } else {
        G.decal(G.rect(t.x, t.y, t.dir, t.len, 3), 1.2, [...col, pulse]);
      }
    }
  },
  reversal(G) {
    const b = GL.Boss.current;
    if (!b || b.mode !== 'reversal') return;
    const h = b.history;
    for (let i = 1; i < h.length; i++) {
      if (i % 2) continue;
      const a = Math.atan2(h[i].y - h[i - 1].y, h[i].x - h[i - 1].x), d = Math.hypot(h[i].y - h[i - 1].y, h[i].x - h[i - 1].x);
      G.decal(G.rect(h[i - 1].x, h[i - 1].y, a, d, 10), 1.3, [1, 0.24, 0.35, 0.6]);
    }
  },

  // ---------- 3) 빛 더하기 : 베기 궤적, 충격 고리, 불꽃, 약점 코어, 매듭, 보호막, 시차 분신 ----------
  glow(G) {
    const W = GL.World, t = W.time, p = GL.Party.player;
    G.blend('add');
    for (const f of W.fx) {
      const k = f.t / f.life;
      const c = f.color ? this.c(f.color) : [1, 1, 1, 1];
      if (f.kind === 'ring') {
        const r = f.r * (0.4 + 0.6 * k);
        G.decal(G.ringStrip(f.x, f.y, Math.max(0, r - 7), r), 1.8, [c[0], c[1], c[2], (1 - k) * 0.9]);
      } else if (f.kind === 'slash') {
        // 초승달 모양 궤적 : 바깥쪽이 밝고 안쪽으로 옅어짐, 공중에 살짝 띄움
        const sweep = f.arc * Math.min(1, k * 3);
        const a0 = f.dir - f.arc / 2;
        G.decal(G.ringStrip(f.x, f.y, f.r * 0.55, f.r, a0, sweep, 24), 22, [c[0], c[1], c[2], (1 - k) * 0.35]);
        G.decal(G.ringStrip(f.x, f.y, f.r * 0.86, f.r, a0, sweep, 24), 22.5, [1, 1, 1, (1 - k) * 0.7]);
      } else if (f.kind === 'line') {
        G.decal(G.rect(f.x, f.y, f.dir, f.len, f.w * (1 - k * 0.6)), 20, [c[0], c[1], c[2], (1 - k) * 0.55]);
        G.decal(G.rect(f.x, f.y, f.dir, f.len, Math.max(2, f.w * 0.2)), 20.5, [1, 1, 1, (1 - k) * 0.9]);
      } else if (f.kind === 'erase') {   // 소거 : 심해 청색 입자가 수평으로 흩어지며 소멸
        G.draw('box', G.chain(G.T(f.x, f.h, f.y), G.Ry(k * 3), G.S(6 * (1 - k) + 1, 6 * (1 - k) + 1, 6 * (1 - k) + 1)), [0.16, 0.42, 1, 1 - k], 1);
      } else if (f.kind === 'beam') {    // 노아 만화경 광선
        G.draw('tube', G.chain(G.T(f.x, 0, f.y), G.S(10 * (1 - k) + 3, 500, 10 * (1 - k) + 3)), [0.78, 0.96, 1, 1 - k], 1);
        G.decal(G.circle(f.x, f.y, 45 * (1 - k * 0.5)), 1.2, [0.78, 0.96, 1, (1 - k) * 0.6]);
      } else if (f.kind === 'lens') {    // 노아 렌즈 광선 : 공중의 유리 렌즈
        G.draw('ring', G.chain(G.root(f.x, 34, f.y, f.dir), G.Rz(Math.PI / 2), G.S(26, 26, 26)), [0.78, 0.96, 1, 1 - k], 1);
        G.draw('ball', G.chain(G.root(f.x, 34, f.y, f.dir), G.S(3, 24, 24)), [0.9, 1, 1, (1 - k) * 0.5], 1);
      } else if (f.kind === 'kaleido') { // 노아 만화경 렌즈 배열
        const pp = GL.Party.player;
        for (let i = 0; i < 6; i++) { const a = t * 1.5 + i * 1.047; G.draw('ring', G.chain(G.T(pp.x + Math.cos(a) * 90, 200, pp.y + Math.sin(a) * 90), G.Rx(0.6), G.S(22, 22, 22)), [0.78, 0.96, 1, 1 - k * 0.6], 1); }
      } else if (f.kind === 'clockface') {   // 루시엘 지연
        for (let i = 0; i < 12; i++) G.decal(G.rect(f.x + Math.cos(i * 0.5236) * f.r * 0.9, f.y + Math.sin(i * 0.5236) * f.r * 0.9, i * 0.5236, 18, 4), 1.5, [0.8, 0.85, 0.9, 1 - k]);
        G.decal(G.rect(f.x, f.y, -k * 6, f.r * 0.8, 5), 1.6, [1, 1, 1, 1 - k]);
      } else if (f.kind === 'spark') {
        const a = Math.atan2(f.vy, f.vx);
        G.draw('box', G.chain(G.root(f.x, 28, f.y, a), G.S(10 * (1 - k) + 2, 1.6, 1.6)), [c[0], c[1], c[2], 1 - k], 1);
      }
    }
    // 약점 코어
    for (const e of W.enemies) {
      if (e.dead || !GL.Combat.weakVisible(e)) continue;
      const f = e.facing;
      let ox = 0, oy = 0, h = 30;
      if (e.guardUp || e.shieldUp) { ox = Math.cos(f) * (e.r + 6); oy = Math.sin(f) * (e.r + 6); h = 40; }
      if (e.boss) { ox = -Math.cos(f) * 34; oy = -Math.sin(f) * 34; h = 92; }
      G.draw('octa', G.chain(G.T(e.x + ox, h, e.y + oy), G.Ry(t * 3), G.S(7, 10, 7)), this.c('#3fe0a8'), 1);
      G.draw('ball', G.chain(G.T(e.x + ox, h, e.y + oy), G.S(14, 14, 14)), this.c('#3fe0a8', 0.25 + 0.1 * Math.sin(t * 8)), 1);
    }
    // 보스 기믹 매듭 (관측 중에만)
    for (const k of GL.Boss.knots) {
      if (k.frac <= 0) continue;
      if (W.observe.on) {
        G.draw('octa', G.chain(G.T(k.x, 46, k.y), G.Ry(t * 2), G.S(14, 20, 14)), this.c('#3fe0a8'), 1);
        G.draw('ring', G.chain(G.T(k.x, 46, k.y), G.Ry(t * 1.5), G.Rx(Math.PI / 2), G.S(26, 26, 26)), this.c('#c8fff0', 0.9), 1);
        G.draw('tube', G.chain(G.T(k.x, 0, k.y), G.S(4, 420, 4)), this.c('#3fe0a8', 0.35), 1);
        G.decal(G.ringStrip(k.x, k.y, 30, 36, -Math.PI / 2, 6.2832 * (k.frac / k.max), 30), 1.4, [1, 1, 1, 0.9]);
      } else {
        G.draw('ball', G.chain(G.T(k.x, 46, k.y), G.S(6, 6, 6)), [0.6, 0.7, 0.8, 0.15 + 0.08 * Math.sin(t * 6)], 1);
      }
    }
    // 무기 잔광 / 보호막
    if (W.buffs.shield > 0) G.draw('ball', G.chain(G.T(p.x, p.z * 0.6 + 28, p.y), G.S(26, 32, 26)), [0.62, 0.9, 1, 0.16], 1);
    if (W.observe.on) G.draw('thinRing', G.chain(G.T(p.x, p.z * 0.6 + 1, p.y), G.Ry(t), G.S(40, 40, 40)), this.c('#3fe0a8', 0.5), 1);
    G.blend('normal');
  },

  // ---------- 마스터 모드 : 판정 범위 표시 ----------
  debug(G) {
    if (!GL.Master || !GL.Master.opt.hitbox) return;
    const p = GL.Party.player;
    G.decal(G.ringStrip(p.x, p.y, p.r - 1.5, p.r), 30, [0.3, 1, 0.4, 1]);
    for (const e of GL.World.enemies) if (!e.dead) G.decal(G.ringStrip(e.x, e.y, e.r - 1.5, e.r), 30, [1, 0.3, 0.3, 1]);
    for (const s of GL.Master.shapes) G.decal(this.shapeTris(G, s), 30, [1, 1, 0.2, 0.25 * (s.life / 0.4)]);
  },
};
