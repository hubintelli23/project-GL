// ============================================================
// assets/weapons.js — 무기 아티팩트 모델
// 지금은 코드로 만든 임시 모델. 나중에 실제 모델(glTF 등)로 바꿀 때는
// 같은 이름의 draw(G, M, opt) 함수만 교체하면 된다.
//   M   : 무기를 쥔 손의 행렬 (원점 = 손잡이, +X = 칼끝 방향)
//   opt : { glow 0~1 (발광 세기), t 시간, ... }
// ============================================================
GL.Assets = GL.Assets || {};

GL.Assets.Weapons = {
  // 색·크기는 여기서 조정
  style: {
    ian:  { steel: '#dfe9f2', edge: '#3fe0a8', grip: '#1d2a33', pivot: '#c8d2dc', length: 34 },
    baren:{ plate: '#8c6a2a', rim: '#e0b54a', emblem: '#ffe9a8', back: '#3a2c14' },
    kay:  { steel: '#cdbcff', edge: '#b48cff', grip: '#231833', length: 18 },
    guardianShield: { plate: '#5c7fc0', rim: '#c9dcff', core: '#9fc4ff' },
    guardianMace:   { shaft: '#7a8796', head: '#aab6c4', spike: '#e6eef8' },
  },

  c(hex, a = 1) { return GL.G3.rgba(hex, a); },
  metal: { spec: 0.9, shine: 48, rim: 0.4 },

  // ---------- 이안 : 가변형 재봉 가위 (분리 = 쌍검) ----------
  // half : 'L' / 'R' — 가위의 한쪽 날. 두 손에 하나씩 쥔다.
  ian(G, M, opt = {}) {
    const s = this.style.ian, glow = opt.glow || 0;
    // 손잡이 + 가위 고리
    G.draw('tube', G.chain(M, G.T(-7, 0, 0), G.Rz(-Math.PI / 2), G.S(1.5, 9, 1.5)), this.c(s.grip), 0, { spec: 0.3 });
    G.draw('thinRing', G.chain(M, G.T(-10, 0, 0), G.Rx(Math.PI / 2), G.S(4.2, 4.2, 4.2)), this.c(s.pivot), 0.1, this.metal);
    // 가위 축(피벗 나사)
    G.draw('ball', G.chain(M, G.T(2, 0, 0), G.S(2.2, 2.2, 2.2)), this.c(s.pivot), 0.2, this.metal);
    // 날
    G.draw('blade', G.chain(M, G.T(2, 0, 0), G.S(s.length, 30, 34)), this.c(s.steel), 0.05, this.metal);
    // 궤적의 빛이 흐르는 날 끝
    G.draw('box', G.chain(M, G.T(2 + s.length * 0.5, 2.3, 0), G.S(s.length * 0.9, 0.6, 0.8)), this.c(s.edge, 0.6 + 0.4 * glow), 1);
  },

  // ---------- 바렌 : 타워 쉴드 ----------
  // M : 방패 중심. +X = 방패 앞면이 바라보는 방향
  baren(G, M, opt = {}) {
    const s = this.style.baren, glow = opt.glow || 0;
    G.draw('box', G.chain(M, G.S(3.2, 48, 32)), this.c(s.plate), 0.05, { spec: 0.6, shine: 30, rim: 0.4 });
    G.draw('box', G.chain(M, G.T(-2.2, 0, 0), G.S(1.4, 44, 28)), this.c(s.back), 0, { spec: 0.1 });
    // 테두리
    for (const [y, h, z, w] of [[24, 2.4, 0, 33], [-24, 2.4, 0, 33], [0, 48, 16, 2.4], [0, 48, -16, 2.4]]) {
      G.draw('box', G.chain(M, G.T(1.4, y, z), G.S(2.4, h, w)), this.c(s.rim), 0.15 + glow * 0.6, this.metal);
    }
    // 가운데 문장 (가드 중 빛남)
    G.draw('octa', G.chain(M, G.T(2.4, 4, 0), G.Rz(Math.PI / 2), G.S(5, 3, 7)), this.c(s.emblem), 0.4 + glow * 0.6, this.metal);
    G.draw('box', G.chain(M, G.T(2.2, -8, 0), G.S(1.2, 18, 3)), this.c(s.rim), 0.2 + glow * 0.5, this.metal);
    // 아래 지면 박는 쐐기
    G.draw('cone2', G.chain(M, G.T(0, -24, 0), G.Rz(Math.PI), G.S(3, 7, 3)), this.c(s.rim), 0.1, this.metal);
  },

  // ---------- 케이 : 단검(스틸레토) ----------
  kay(G, M, opt = {}) {
    const s = this.style.kay, glow = opt.glow || 0;
    G.draw('tube', G.chain(M, G.T(-5, 0, 0), G.Rz(-Math.PI / 2), G.S(1.2, 7, 1.2)), this.c(s.grip), 0, { spec: 0.3 });
    G.draw('box', G.chain(M, G.T(2, 0, 0), G.S(1.6, 6, 2)), this.c(s.edge), 0.3, this.metal);
    G.draw('blade', G.chain(M, G.T(2.5, 0, 0), G.S(s.length, 22, 30)), this.c(s.steel), 0.1, this.metal);
    G.draw('box', G.chain(M, G.T(2.5 + s.length * 0.45, 0, 0), G.S(s.length * 0.8, 0.5, 0.6)), this.c(s.edge, 0.5 + 0.5 * glow), 1);
  },

  // ---------- 아카이브 집행 수호자 : 방패 / 철퇴 ----------
  guardianShield(G, M, opt = {}) {
    const s = this.style.guardianShield;
    G.draw('box', G.chain(M, G.S(5, 62, 52)), this.c(s.plate, opt.alpha || 1), 0.15, { spec: 0.7, shine: 30, rim: 0.5 });
    for (const [y, z, h, w] of [[31, 0, 3, 54], [-31, 0, 3, 54], [0, 26, 62, 3], [0, -26, 62, 3]]) G.draw('box', G.chain(M, G.T(2, y, z), G.S(3, h, w)), this.c(s.rim), 0.3, this.metal);
    // 관측 시 보이는 동력 결합부 자리
    G.draw('ball', G.chain(M, G.T(3, 0, 0), G.S(5, 5, 5)), this.c(s.core), 0.7, this.metal);
  },
  guardianMace(G, M, opt = {}) {
    const s = this.style.guardianMace;
    G.draw('tube', G.chain(M, G.T(-6, 0, 0), G.Rz(-Math.PI / 2), G.S(2, 44, 2)), this.c(s.shaft), 0, this.metal);
    G.draw('ball', G.chain(M, G.T(40, 0, 0), G.S(9, 9, 9)), this.c(s.head), 0.05, this.metal);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      G.draw('cone2', G.chain(M, G.T(40, 0, 0), G.Rx(a), G.T(0, 8, 0), G.S(2.4, 7, 2.4)), this.c(s.spike), 0.1, this.metal);
    }
  },
};
