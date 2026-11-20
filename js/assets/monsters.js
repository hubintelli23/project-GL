// ============================================================
// assets/monsters.js — 적·보스 모델 (노이즈 기형체)
// 실제 모델로 바꿀 때는 각 타입의 draw 함수만 교체하면 된다.
//   e : 적 객체 (x, y, facing, groggy, hitFlash, 상태값 …)
//   공격 예고가 진행 중이면 windup(0~1)으로 들어 올리는 자세를 만든다
// ============================================================
GL.Assets = GL.Assets || {};

GL.Assets.Monsters = {
  style: {
    shard:    { body: '#ff5a6e', core: '#ffd0d8', crack: '#2a0610' },
    eroder:   { body: '#3a1c12', iris: '#ff8a3d', ring: '#ffd0a0', frag: '#ff8a3d' },
    clasher:  { rock: '#4a3560', crystal: '#c25cff', arm: '#3a2a4e', guard: '#e2b8ff' },
    guardian: { armor: '#3e5c96', trim: '#c9dcff', visor: '#9fc4ff', cloth: '#1c2640' },
    tempus:   { core: '#d36bff', gear: '#f0c8ff', metal: '#2a1a40', hand: '#ffffff', cape: '#1a1030' },
  },
  c(hex, a = 1) { return GL.G3.rgba(hex, a); },
  stone: { spec: 0.15, shine: 10, rim: 0.4 },
  metal: { spec: 0.85, shine: 44, rim: 0.45 },

  // 이 적이 지금 공격 예고 중인지 (0~1 진행도)
  windup(e) {
    let w = 0;
    for (const t of GL.World.tele) if (t.owner === e) w = Math.max(w, Math.min(1, t.t / t.warn));
    return w;
  },
  tint(e, hex) { return e.hitFlash > 0 ? '#ffffff' : (e.groggy > 0 ? '#e8d26a' : hex); },

  draw(G, e) {
    if (e instanceof GL.Shard) return this.shard(G, e);
    if (e instanceof GL.Eroder) return this.eroder(G, e);
    if (e instanceof GL.Clasher) return this.clasher(G, e);
    if (e instanceof GL.Guardian) return this.guardian(G, e);
    if (e instanceof GL.Echo) return this.tempus(G, e, 0.6, 0.45);
    if (e instanceof GL.Tempus) return this.tempus(G, e, 1, 1);
  },

  // ---------- ① 노이즈 파편체 : 깨진 결정 덩어리, 자폭 준비 때 벌어지며 붉게 ----------
  shard(G, e) {
    const s = this.style.shard, t = GL.World.time, ch = e.state === 'charge';
    const open = ch ? 4 + Math.sin(t * 30) * 2 : 0, bob = Math.sin(t * 4 + e.x) * 3;
    const R0 = G.root(e.x, 22 + bob, e.y, t * (ch ? 6 : 1.5));
    const col = ch && Math.sin(t * 30) > 0 ? '#ffffff' : this.tint(e, s.body);
    G.draw('ball', G.chain(R0, G.S(7, 7, 7)), this.c(ch ? '#ff2040' : s.core), ch ? 1 : 0.7);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.2566;
      const M = G.chain(R0, G.Ry(a), G.Rz(0.5 + (i % 2) * 0.5), G.T(0, 8 + open, 0));
      G.draw('octa', G.chain(M, G.S(5, 12 + (i % 3) * 3, 5)), this.c(col), 0.15, { spec: 0.7, shine: 40, rim: 0.6 });
    }
    // 주위를 도는 작은 파편
    for (let i = 0; i < 3; i++) {
      const a = t * 3 + i * 2.09;
      G.draw('octa', G.chain(G.T(e.x + Math.cos(a) * 16, 26 + bob + Math.sin(a * 2) * 4, e.y + Math.sin(a) * 16), G.S(2, 3, 2)), this.c(s.body), 0.5);
    }
  },

  // ---------- ② 데이터 침식자 : 떠다니는 눈 + 공전 파편 + 아래로 늘어진 촉수 ----------
  eroder(G, e) {
    const s = this.style.eroder, t = GL.World.time, w = this.windup(e) || (e.cd < 0.4 ? 1 - e.cd / 0.4 : 0);
    const h = 46 + Math.sin(t * 3 + e.x) * 5;
    const R0 = G.root(e.x, h, e.y, e.facing);
    G.draw('ball', G.chain(R0, G.S(14, 13, 14)), this.c(this.tint(e, s.body)), 0.05, { spec: 0.6, shine: 30, rim: 0.7 });
    G.draw('ball', G.chain(R0, G.T(10, 0, 0), G.S(5.5, 6.5 + w * 2, 6.5 + w * 2)), this.c(s.iris), 0.9);            // 눈동자
    G.draw('ball', G.chain(R0, G.T(13.5, 0, 0), G.S(2, 3, 3)), this.c('#1a0800'), 0.2);
    G.draw('thinRing', G.chain(R0, G.Rz(0.5), G.Ry(t * 1.5), G.S(22, 22, 22)), this.c(s.ring, 0.9), 0.8);
    for (let i = 0; i < 4; i++) {
      const a = t * 2 + i * 1.57;
      G.draw('octa', G.chain(R0, G.T(Math.cos(a) * 20, Math.sin(a * 1.3) * 6, Math.sin(a) * 20), G.Ry(a), G.S(3, 5, 3)), this.c(s.frag), 0.6);
    }
    for (let i = 0; i < 3; i++) { // 촉수
      const a = i * 2.09 + t;
      G.draw('cone2', G.chain(R0, G.T(-3 + Math.cos(a) * 5, -9, Math.sin(a) * 5), G.Rz(Math.PI + Math.sin(t * 3 + i) * 0.3), G.S(2.2, 16, 2.2)), this.c(this.tint(e, s.body)), 0.05);
    }
  },

  // ---------- ④ 균열의 파쇄손 : 거대한 바위 팔을 가진 골렘, 정면 결정 가드 ----------
  clasher(G, e) {
    const s = this.style.clasher, t = GL.World.time, w = this.windup(e);
    const R0 = G.root(e.x, 0, e.y, e.facing);
    const col = this.c(this.tint(e, s.rock));
    const step = Math.sin(t * 4 + e.x) * 0.3;
    for (const z of [-9, 9]) G.draw('box', G.chain(R0, G.T(0, 8, z), G.Rz(z > 0 ? step : -step), G.T(0, 0, 0), G.S(12, 16, 9)), col, 0, this.stone);
    const Mb = G.chain(R0, G.T(-2, 24, 0), G.Rz(0.25 + w * 0.2));
    G.draw('box', G.chain(Mb, G.S(26, 26, 30)), col, 0, this.stone);
    G.draw('box', G.chain(Mb, G.T(4, 16, 0), G.S(12, 10, 14)), col, 0, this.stone);          // 머리
    G.draw('box', G.chain(Mb, G.T(10.5, 16, 0), G.S(1, 2, 9)), this.c(s.crystal), 1);        // 눈
    for (let i = 0; i < 4; i++) G.draw('octa', G.chain(Mb, G.T(-10, 10 + i * 2, -9 + i * 6), G.Rz(-0.6), G.S(4, 10 + i * 2, 4)), this.c(s.crystal), 0.6, { spec: 0.8, shine: 40, rim: 0.6 });
    // 거대 팔 (예고 중 들어 올림)
    const lift = w > 0 ? 1.6 * w : 0;
    const Ma = G.chain(Mb, G.T(2, 8, 20), G.Rz(-0.4 + lift), G.Rx(-0.15));
    G.draw('box', G.chain(Ma, G.T(10, 0, 0), G.S(24, 13, 13)), this.c(this.tint(e, s.arm)), 0, this.stone);
    G.draw('box', G.chain(Ma, G.T(26, -2, 0), G.S(16, 22, 20)), this.c(this.tint(e, s.arm)), 0, this.stone);
    G.draw('box', G.chain(Mb, G.T(2, 6, -18), G.Rz(-0.8), G.T(8, 0, 0), G.S(18, 9, 9)), col, 0, this.stone);
    // 정면 결정 가드
    if (e.guardUp && e.groggy <= 0) {
      G.draw('box', G.chain(R0, G.T(24, 26, 0), G.S(5, 40, 46)), this.c(s.guard, 0.85), 0.45, { spec: 0.9, shine: 50, rim: 0.8 });
    }
  },

  // ---------- 엘리트 : 아카이브 집행 수호자 (갑옷 기사, 방패 + 철퇴) ----------
  guardian(G, e) {
    const s = this.style.guardian, t = GL.World.time, w = this.windup(e);
    const R0 = G.root(e.x, 0, e.y, e.facing);
    const C = (hex) => this.c(this.tint(e, hex));
    const step = Math.sin(t * 3.5 + e.x) * 0.35;
    for (const [z, k] of [[-8, 1], [8, -1]]) {
      const Mh = G.chain(R0, G.T(0, 30, z), G.Rz(step * k));
      G.draw('tube', G.chain(Mh, G.T(0, -15, 0), G.S(5, 15, 5)), C(s.cloth), 0);
      G.draw('box', G.chain(Mh, G.T(1, -24, 0), G.S(9, 16, 8)), C(s.armor), 0.05, this.metal);
      G.draw('box', G.chain(Mh, G.T(3, -31, 0), G.S(13, 4, 9)), C(s.armor), 0.05, this.metal);
    }
    const Mt = G.chain(R0, G.T(0, 30, 0), G.Rz(0.1 + w * 0.15));
    G.draw('wedge', G.chain(Mt, G.T(0, 18, 0), G.Rz(Math.PI), G.S(18, 36, 34)), C(s.armor), 0.05, this.metal);
    G.draw('box', G.chain(Mt, G.T(9, 18, 0), G.S(2, 24, 6)), C(s.trim), 0.4, this.metal);
    G.draw('wedge', G.chain(Mt, G.T(-6, 4, 0), G.Rz(-0.15), G.T(0, -10, 0), G.S(4, 22, 28)), C(s.cloth), 0);   // 망토
    for (const z of [-19, 19]) G.draw('ball', G.chain(Mt, G.T(0, 34, z), G.S(9, 7, 10)), C(s.armor), 0.05, this.metal); // 견갑
    const Mhd = G.chain(Mt, G.T(1, 44, 0));
    G.draw('box', G.chain(Mhd, G.S(14, 15, 13)), C(s.armor), 0.05, this.metal);
    G.draw('box', G.chain(Mhd, G.T(7.2, 1, 0), G.S(1, 3, 10)), this.c(s.visor), 1);           // 투구 틈 빛
    G.draw('cone2', G.chain(Mhd, G.T(0, 7, 0), G.S(4, 10, 4)), C(s.trim), 0.2, this.metal);
    // 철퇴 팔 (예고 중 들어 올림)
    const Ma = G.chain(Mt, G.T(0, 32, -21), G.Rz(0.3 + w * 2.2), G.Ry(-0.2));
    G.draw('tube', G.chain(Ma, G.T(0, -20, 0), G.S(4.5, 20, 4.5)), C(s.armor), 0.05, this.metal);
    GL.Assets.Weapons.guardianMace(G, G.chain(Ma, G.T(0, -22, 0), G.Rz(-Math.PI / 2 + 1.2)));
    // 방패 (정면)
    if (e.shieldUp && e.groggy <= 0) GL.Assets.Weapons.guardianShield(G, G.chain(R0, G.T(26, 36, 6)));
    else GL.Assets.Weapons.guardianShield(G, G.chain(R0, G.T(4, 16, 26), G.Ry(1.3), G.Rz(0.6)), { alpha: 0.9 });
  },

  // ---------- 템푸스 : 시계 장치 거신 (코어 + 톱니 고리 + 바늘) / 시차 분신은 반투명 ----------
  tempus(G, e, sc, alpha) {
    const s = this.style.tempus, t = GL.World.time, gro = e.groggy > 0;
    const w = this.windup(e);
    const h = (gro ? 52 : 92) * sc + Math.sin(t * 2) * 4;
    const R0 = G.root(e.x, h, e.y, e.facing);
    const C = (hex, a = alpha) => this.c(e.hitFlash > 0 ? '#ffffff' : (gro ? '#e8d26a' : hex), a);
    // 아래 망토(시간의 찌꺼기가 흘러내림)
    G.draw('cone2', G.chain(G.T(e.x, 0, e.y), G.Ry(t * 0.2), G.S(46 * sc, 70 * sc, 46 * sc)), C(s.cape, alpha * 0.95), 0.05, { spec: 0.2, rim: 0.6 });
    // 코어
    G.draw('ball', G.chain(R0, G.S(22 * sc, 22 * sc, 22 * sc)), C(s.core), 0.9);
    // 코어를 감싼 4개의 금속 날개 (사이로 빛나는 코어가 보임)
    for (let i = 0; i < 4; i++) G.draw('wedge', G.chain(R0, G.Ry(t * 0.6 + i * 1.5708), G.T(20 * sc, 0, 0), G.Rz(Math.PI / 2), G.S(14 * sc, 10 * sc, 30 * sc)), C(s.metal, alpha), 0.1, this.metal);
    G.draw('octa', G.chain(R0, G.T(0, 30 * sc, 0), G.Ry(t), G.S(8 * sc, 16 * sc, 8 * sc)), C(s.gear), 0.6, this.metal);
    G.draw('octa', G.chain(R0, G.T(0, -30 * sc, 0), G.Ry(-t), G.S(8 * sc, 16 * sc, 8 * sc)), C(s.gear), 0.6, this.metal);
    // 톱니 고리 3개 (서로 다른 축으로 회전)
    const rings = [[54, 1.2, t * 0.9], [70, 1.45, -t * 0.5], [86, 0.35, t * 0.3]];
    rings.forEach(([r, tilt, rot], k) => {
      const M = G.chain(R0, G.Rx(tilt), G.Ry(rot));
      G.draw('ring', G.chain(M, G.S(r * sc, r * sc, r * sc)), C(k === 1 ? s.core : s.gear), 0.75, this.metal);
      const teeth = k === 2 ? 18 : 12;
      for (let i = 0; i < teeth; i++) {
        const a = i / teeth * 6.2832;
        G.draw('box', G.chain(M, G.T(Math.cos(a) * r * sc, 0, Math.sin(a) * r * sc), G.Ry(-a), G.S(6 * sc, 4 * sc, 4 * sc)), C(s.gear), 0.4, this.metal);
      }
    });
    // 시계 바늘 (예고 중 빠르게 돎)
    const spin = t * (2 + w * 10);
    G.draw('box', G.chain(R0, G.T(22 * sc, 0, 0), G.Rx(spin), G.T(0, 18 * sc, 0), G.S(3, 36 * sc, 3)), C(s.hand), 0.9);
    G.draw('box', G.chain(R0, G.T(22 * sc, 0, 0), G.Rx(-t * 0.7), G.T(0, 11 * sc, 0), G.S(3.5, 22 * sc, 3.5)), C(s.hand), 0.9);
    // 양팔 : 떠 있는 칼날 손
    for (const z of [-1, 1]) {
      const Ma = G.chain(R0, G.T(0, -6 * sc, z * 46 * sc), G.Ry(z * (0.4 - w * 0.9)), G.Rz(-0.4 + w * 1.2));
      G.draw('blade', G.chain(Ma, G.S(48 * sc, 70 * sc, 60 * sc)), C(s.gear), 0.35, this.metal);
    }
  },
};
