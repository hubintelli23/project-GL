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
    taron:  { rod: '#2c3e50', cap: '#bfe8ff', chain: '#9fb3c8', seg: 18 },
    serena: { shaft: '#e8dcf5', head: '#c9b0e6', chain: '#d8c8ee', lantern: '#fff2c8', glow: '#f3c6ff' },
    clea:   { shaft: '#4a3a30', head: '#7a6a5a', trim: '#ff9f5a', piston: '#c8c0b8' },
    noah:   { ring: '#d8f4ff', edge: '#8fe3ff', grip: '#1e3a4a' },
    baektor: { steel: '#f4f4ff', guard: '#c9a640', grip: '#2a2a34' },
    ploto:   { chain: '#8a8a94', saw: '#d2304a', grip: '#2a0c12' },
    ares:    { steel: '#5a5a60', edge: '#ff4a2a', grip: '#2a1008' },
    invidi:  { shaft: '#1a2a20', blade: '#cfe0d4', edge: '#5ad18c' },
    asadi:   { whip: '#5a2278', thorn: '#e6a6ff', grip: '#2a0c3a' },
    luciel:  { shaft: '#6a7280', face: '#e8e2dc', rim: '#c8d0dc', hand: '#2a2e36' },
    gula:    { claw: '#d8d0c0', knuckle: '#6a5020' },
    guardianShield: { plate: '#5c7fc0', rim: '#c9dcff', core: '#9fc4ff' },
    guardianMace:   { shaft: '#7a8796', head: '#aab6c4', spike: '#e6eef8' },
  },

  c(hex, a = 1) { return GL.G3.rgba(hex, a); },
  metal: { spec: 0.9, shine: 48, rim: 0.4 },

  // ---------- 이안 : 가변형 재봉 가위 (분리 = 쌍검) ----------
  // half : 'L' / 'R' — 가위의 한쪽 날. 두 손에 하나씩 쥔다.
  ian(G, M, opt = {}) {
    let s = this.style.ian; const glow = opt.glow || 0;
    if (opt.backflow) s = Object.assign({}, s, { steel: '#202020', edge: opt.backflow.mode === 'forced' ? '#ff2040' : '#ffffff', pivot: '#3a3a3a' });   // 인과 역류 : 칠흑 날
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

  // ---------- 태론 : 삼절곤 (세 마디가 사슬로 이어짐, 휘두를 때 꺾임) ----------
  taron(G, M, opt = {}) {
    const s = this.style.taron, t = opt.t || 0, g = opt.glow || 0, L = s.seg;
    const bend = 0.5 + Math.sin(t * 6) * 0.25 + g * 0.6;
    let m = G.chain(M, G.T(-4, 0, 0));
    for (let i = 0; i < 3; i++) {
      G.draw('tube', G.chain(m, G.Rz(-Math.PI / 2), G.S(1.6, L, 1.6)), this.c(s.rod), 0.05, this.metal);
      G.draw('tube', G.chain(m, G.T(L - 2, 0, 0), G.Rz(-Math.PI / 2), G.S(1.9, 2.5, 1.9)), this.c(s.cap), 0.3 + g * 0.5, this.metal);
      G.draw('thinRing', G.chain(m, G.T(L + 1.5, 0, 0), G.Rx(Math.PI / 2), G.S(1.6, 1.6, 1.6)), this.c(s.chain), 0.2, this.metal);
      m = G.chain(m, G.T(L + 3, 0, 0), G.Rz(-bend * (i === 0 ? 0.6 : 1)), G.Ry(i ? 0.3 : -0.2));
    }
  },

  // ---------- 세레나 : 향로 메이스 (자루 끝 사슬에 매달린 랜턴, 향이 퍼짐) ----------
  serena(G, M, opt = {}) {
    const s = this.style.serena, t = opt.t || 0, g = opt.glow || 0;
    G.draw('tube', G.chain(M, G.T(-8, 0, 0), G.Rz(-Math.PI / 2), G.S(1.4, 30, 1.4)), this.c(s.shaft), 0.1, this.metal);
    G.draw('octa', G.chain(M, G.T(22, 0, 0), G.S(4, 5, 4)), this.c(s.head), 0.3, this.metal);
    // 사슬 + 랜턴 (흔들림)
    const sw = Math.sin(t * 3) * 0.5;
    const Mc = G.chain(M, G.T(22, 0, 0), G.Rx(sw), G.Rz(-1.2 - g * 0.6));
    for (let i = 0; i < 4; i++) G.draw('thinRing', G.chain(Mc, G.T(3 + i * 3.2, 0, 0), G.Ry(i * 1.57), G.Rx(Math.PI / 2), G.S(1.6, 1.6, 1.6)), this.c(s.chain), 0.3, this.metal);
    const Ml = G.chain(Mc, G.T(18, 0, 0));
    G.draw('ball', G.chain(Ml, G.S(4.6, 4.6, 4.6)), this.c(s.lantern), 0.9 + g * 0.1);
    G.draw('thinRing', G.chain(Ml, G.S(5.4, 5.4, 5.4)), this.c(s.head), 0.3, this.metal);
    G.draw('thinRing', G.chain(Ml, G.Rx(Math.PI / 2), G.S(5.4, 5.4, 5.4)), this.c(s.head), 0.3, this.metal);
    G.draw('cone2', G.chain(Ml, G.T(0, 5, 0), G.S(2.4, 3, 2.4)), this.c(s.head), 0.3, this.metal);
  },

  // ---------- 클레아 : 메카닉 워해머 (피스톤 머리) ----------
  clea(G, M, opt = {}) {
    const s = this.style.clea, g = opt.glow || 0;
    G.draw('tube', G.chain(M, G.T(-12, 0, 0), G.Rz(-Math.PI / 2), G.S(1.9, 46, 1.9)), this.c(s.shaft), 0, { spec: 0.4 });
    G.draw('tube', G.chain(M, G.T(-12, 0, 0), G.Rz(-Math.PI / 2), G.S(2.3, 6, 2.3)), this.c(s.trim), 0.3, this.metal);
    const Mh = G.chain(M, G.T(34, 0, 0));
    G.draw('box', G.chain(Mh, G.S(12, 13, 20)), this.c(s.head), 0.05, this.metal);
    G.draw('box', G.chain(Mh, G.T(0, 0, 10.5), G.S(10, 10, 2)), this.c(s.trim), 0.3 + g * 0.6, this.metal);
    G.draw('tube', G.chain(Mh, G.T(0, 0, -10), G.Rx(-Math.PI / 2), G.S(3.2, 6 + g * 4, 3.2)), this.c(s.piston), 0.1, this.metal);   // 피스톤
    G.draw('box', G.chain(Mh, G.T(6.5, 0, 0), G.S(1, 10, 16)), this.c(s.trim), 0.5 + g * 0.5);
  },

  // ---------- 노아 : 차크람 (손에 쥔 고리 날) ----------
  noah(G, M, opt = {}) {
    const s = this.style.noah, t = opt.t || 0, g = opt.glow || 0;
    const Mr = G.chain(M, G.T(9, 0, 0), G.Rx(Math.PI / 2), G.Ry(t * (2 + g * 6)));
    G.draw('ring', G.chain(Mr, G.S(9, 9, 9)), this.c(s.ring), 0.2, this.metal);
    for (let i = 0; i < 4; i++) G.draw('blade', G.chain(Mr, G.Ry(i * 1.5708), G.T(7, 0, 0), G.Rx(Math.PI / 2), G.S(6, 18, 24)), this.c(s.edge), 0.5 + g * 0.4, this.metal);
    G.draw('box', G.chain(M, G.S(4, 2, 2)), this.c(s.grip), 0);
  },

  // ========== 7대죄 무기 ==========
  // 백토르 : 레이피어
  baektor(G, M, opt = {}) {
    const s = this.style.baektor, g = opt.glow || 0;
    G.draw('tube', G.chain(M, G.T(-6, 0, 0), G.Rz(-Math.PI / 2), G.S(1.2, 8, 1.2)), this.c(s.grip), 0);
    G.draw('thinRing', G.chain(M, G.T(1, 0, 0), G.Ry(Math.PI / 2), G.S(4.5, 4.5, 4.5)), this.c(s.guard), 0.3, this.metal);
    G.draw('tube', G.chain(M, G.T(2, 0, 0), G.Rz(-Math.PI / 2), G.S(0.7, 44, 0.7)), this.c(s.steel), 0.2 + g * 0.6, this.metal);
    G.draw('cone2', G.chain(M, G.T(46, 0, 0), G.Rz(-Math.PI / 2), G.S(0.7, 4, 0.7)), this.c('#ffffff'), 0.6 + g * 0.4);
  },
  // 플로토 : 사슬 톱날 채찍 (끝에 회전 톱날)
  ploto(G, M, opt = {}) {
    const s = this.style.ploto, t = opt.t || 0, g = opt.glow || 0;
    G.draw('tube', G.chain(M, G.T(-6, 0, 0), G.Rz(-Math.PI / 2), G.S(1.6, 10, 1.6)), this.c(s.grip), 0);
    let m = G.chain(M, G.T(4, 0, 0));
    for (let i = 0; i < 8; i++) { G.draw('thinRing', G.chain(m, G.Ry(i * 1.57), G.Rx(Math.PI / 2), G.S(1.8, 1.8, 1.8)), this.c(s.chain), 0.1, this.metal); m = G.chain(m, G.T(3.4, 0, 0), G.Rz(-0.12 - g * 0.15 + Math.sin(t * 6 + i) * 0.08)); }
    const Ms = G.chain(m, G.T(4, 0, 0), G.Rx(Math.PI / 2), G.Ry(t * 20));
    G.draw('ring', G.chain(Ms, G.S(6, 6, 6)), this.c(s.saw), 0.4 + g * 0.5, this.metal);
    for (let i = 0; i < 8; i++) G.draw('cone2', G.chain(Ms, G.Ry(i * 0.785), G.T(6, 0, 0), G.Rz(-Math.PI / 2), G.S(1, 3, 1)), this.c('#ffffff'), 0.3, this.metal);
  },
  // 아레스 : 양손 대검
  ares(G, M, opt = {}) {
    const s = this.style.ares, g = opt.glow || 0;
    G.draw('tube', G.chain(M, G.T(-10, 0, 0), G.Rz(-Math.PI / 2), G.S(1.8, 14, 1.8)), this.c(s.grip), 0);
    G.draw('box', G.chain(M, G.T(4, 0, 0), G.S(3, 3, 16)), this.c(s.steel), 0.1, this.metal);
    G.draw('box', G.chain(M, G.T(32, 0, 0), G.S(52, 1.6, 9)), this.c(s.steel), 0.05, this.metal);
    G.draw('box', G.chain(M, G.T(32, 0, 4.8), G.S(50, 1.2, 1.4)), this.c(s.edge), 0.5 + g * 0.5);
    G.draw('wedge', G.chain(M, G.T(60, 0, 0), G.Rz(-Math.PI / 2), G.S(4.5, 8, 1.6)), this.c(s.steel), 0.05, this.metal);
  },
  // 인바디 : 대형 낫
  invidi(G, M, opt = {}) {
    const s = this.style.invidi, g = opt.glow || 0;
    G.draw('tube', G.chain(M, G.T(-14, 0, 0), G.Rz(-Math.PI / 2), G.S(1.4, 62, 1.4)), this.c(s.shaft), 0, { spec: 0.4 });
    const Mb = G.chain(M, G.T(46, 0, 0), G.Ry(Math.PI / 2));
    G.draw('wedge', G.chain(Mb, G.T(0, 0, 14), G.Rx(Math.PI / 2), G.Rz(0.3), G.S(2, 30, 8)), this.c(s.blade), 0.1, this.metal);
    G.draw('box', G.chain(Mb, G.T(0, -3, 14), G.Rz(0.3), G.S(0.8, 1, 28)), this.c(s.edge), 0.5 + g * 0.5);
  },
  // 아사디 : 가시 채찍 (휘어지는 마디 + 가시)
  asadi(G, M, opt = {}) {
    const s = this.style.asadi, t = opt.t || 0, g = opt.glow || 0;
    G.draw('tube', G.chain(M, G.T(-6, 0, 0), G.Rz(-Math.PI / 2), G.S(1.4, 9, 1.4)), this.c(s.grip), 0);
    let m = G.chain(M, G.T(3, 0, 0));
    for (let i = 0; i < 10; i++) {
      G.draw('tube', G.chain(m, G.Rz(-Math.PI / 2), G.S(0.9, 4, 0.9)), this.c(s.whip), 0.1);
      if (i % 2) G.draw('cone2', G.chain(m, G.T(2, 1, 0), G.S(0.6, 2.4, 0.6)), this.c(s.thorn), 0.4 + g * 0.5);
      m = G.chain(m, G.T(4, 0, 0), G.Rz(-0.15 + Math.sin(t * 4 + i * 0.6) * 0.12), G.Ry(Math.sin(t * 3 + i) * 0.1));
    }
  },
  // 루시엘 : 시계 추 메이스
  luciel(G, M, opt = {}) {
    const s = this.style.luciel, t = opt.t || 0, g = opt.glow || 0;
    G.draw('tube', G.chain(M, G.T(-8, 0, 0), G.Rz(-Math.PI / 2), G.S(1.4, 30, 1.4)), this.c(s.shaft), 0.05, this.metal);
    const Mh = G.chain(M, G.T(28, 0, 0), G.Rx(Math.sin(t * 2) * 0.4));
    G.draw('ball', G.chain(Mh, G.S(3, 3, 3)), this.c(s.rim), 0.2, this.metal);
    const Mp = G.chain(Mh, G.Rz(-1.3 + Math.sin(t * 2.2) * 0.4), G.T(12, 0, 0));
    G.draw('tube', G.chain(Mh, G.Rz(-1.3 + Math.sin(t * 2.2) * 0.4), G.Rz(-Math.PI / 2), G.S(0.6, 12, 0.6)), this.c(s.rim), 0.2, this.metal);
    G.draw('tube', G.chain(Mp, G.Rz(Math.PI / 2), G.S(7, 1.6, 7)), this.c(s.face), 0.3 + g * 0.5, this.metal);   // 시계판
    G.draw('thinRing', G.chain(Mp, G.Rz(Math.PI / 2), G.S(7.6, 7.6, 7.6)), this.c(s.rim), 0.3, this.metal);
    G.draw('box', G.chain(Mp, G.T(0, 0.9, 0), G.Ry(t * 2), G.S(0.4, 0.3, 5)), this.c(s.hand), 0);
  },
  // 굴라 : 너클 클로 (양손)
  gula(G, M, opt = {}) {
    const s = this.style.gula, g = opt.glow || 0;
    G.draw('box', G.chain(M, G.T(1, 0, 0), G.S(5, 5, 6)), this.c(s.knuckle), 0.05, this.metal);
    for (let i = -1; i <= 1; i++) G.draw('cone2', G.chain(M, G.T(4, 0, i * 2.2), G.Rz(-Math.PI / 2 - 0.2), G.S(0.9, 11, 0.9)), this.c(s.claw), 0.1 + g * 0.3, this.metal);
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
