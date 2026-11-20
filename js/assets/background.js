// ============================================================
// assets/background.js — 배경 (하늘, 바닥, 경계 장벽, 데이터 모노리스, 떠다니는 입자, 포털)
// 스테이지마다 테마를 themes 에 정의. 실제 배경 모델로 바꿀 때는 build / draw 를 교체하면 된다.
// ============================================================
GL.Assets = GL.Assets || {};

GL.Assets.Background = {
  themes: {
    field: { // 표면 현실 : 차가운 디지털 블루/화이트
      sky: [[0.05, 0.10, 0.20], [0.01, 0.02, 0.05]], ground: [0.045, 0.075, 0.13], fog: [0.03, 0.06, 0.11],
      wall: '#5d8fd6', mono: '#14223a', seam: '#7fb4ff', mote: '#9fd0ff', rimC: [0.45, 0.7, 1.0],
    },
    boss: { // 인과 균열 : 보랏빛 시간의 잔해
      sky: [[0.16, 0.06, 0.22], [0.02, 0.01, 0.04]], ground: [0.07, 0.05, 0.12], fog: [0.07, 0.035, 0.10],
      wall: '#b07bff', mono: '#1a1430', seam: '#d36bff', mote: '#f0c8ff', rimC: [0.8, 0.5, 1.0],
    },
  },
  props: [], motes: [], islands: [],

  theme() { return this.themes[GL.Stage.name] || this.themes.field; },
  c(hex, a = 1) { return GL.G3.rgba(hex, a); },

  // 스테이지가 바뀔 때 배치
  build() {
    const b = GL.Stage.bounds, light = GL.Touch && GL.Touch.enabled;
    const rnd = (a, z) => a + Math.random() * (z - a);
    this.props = [];
    const n = light ? 14 : 26;
    for (let i = 0; i < n; i++) {
      const side = i % 4, t = (Math.floor(i / 4) + 0.5) / Math.ceil(n / 4);
      let x, y;
      if (side === 0) { x = b.x + b.w * t; y = b.y - rnd(120, 320); }
      if (side === 1) { x = b.x + b.w * t; y = b.y + b.h + rnd(120, 320); }
      if (side === 2) { x = b.x - rnd(120, 320); y = b.y + b.h * t; }
      if (side === 3) { x = b.x + b.w + rnd(120, 320); y = b.y + b.h * t; }
      this.props.push({ x, y, w: rnd(40, 100), h: rnd(160, 540), a: Math.random() * 3, seams: 2 + Math.floor(Math.random() * 3), cube: Math.random() < 0.5 });
    }
    this.motes = [];
    for (let i = 0; i < (light ? 30 : 70); i++) this.motes.push({ x: rnd(b.x - 200, b.x + b.w + 200), y: rnd(b.y - 200, b.y + b.h + 200), h: rnd(20, 260), s: rnd(1.5, 3.5), sp: rnd(6, 20), ph: Math.random() * 6 });
    this.islands = [];
    for (let i = 0; i < (light ? 4 : 8); i++) {
      const a = i / (light ? 4 : 8) * 6.2832 + Math.random() * 0.4, r = Math.max(b.w, b.h) * rnd(0.9, 1.3);
      this.islands.push({ x: b.x + b.w / 2 + Math.cos(a) * r, y: b.y + b.h / 2 + Math.sin(a) * r, h: rnd(120, 420), s: rnd(60, 160), rot: Math.random() * 6 });
    }
  },

  // 카메라가 정해진 뒤 가장 먼저 : 하늘·바닥
  drawBase(G, t, obs) {
    const th = this.theme();
    G.frame.fog = th.fog; G.frame.rimC = th.rimC;
    G.sky(th.sky[0], th.sky[1], t);
    G.ground(GL.Stage.bounds, obs, t, th.ground);
    G.resetProgram();
  },

  // 불투명 구조물
  drawSolid(G, t, obs) {
    const b = GL.Stage.bounds, th = this.theme();
    const wc = this.c(obs ? '#3fe0a8' : th.wall);
    // 경계 받침
    const thk = 16, hh = 10;
    G.draw('box', G.model(b.x + b.w / 2, hh / 2, b.y, 0, b.w + thk, hh, thk), this.c(th.mono), 0, { spec: 0.4 });
    G.draw('box', G.model(b.x + b.w / 2, hh / 2, b.y + b.h, 0, b.w + thk, hh, thk), this.c(th.mono), 0, { spec: 0.4 });
    G.draw('box', G.model(b.x, hh / 2, b.y + b.h / 2, 0, thk, hh, b.h), this.c(th.mono), 0, { spec: 0.4 });
    G.draw('box', G.model(b.x + b.w, hh / 2, b.y + b.h / 2, 0, thk, hh, b.h), this.c(th.mono), 0, { spec: 0.4 });
    G.draw('box', G.model(b.x + b.w / 2, hh + 1, b.y, 0, b.w, 2, 4), wc, 1);
    G.draw('box', G.model(b.x + b.w / 2, hh + 1, b.y + b.h, 0, b.w, 2, 4), wc, 1);
    G.draw('box', G.model(b.x, hh + 1, b.y + b.h / 2, 0, 4, 2, b.h), wc, 1);
    G.draw('box', G.model(b.x + b.w, hh + 1, b.y + b.h / 2, 0, 4, 2, b.h), wc, 1);
    // 데이터 모노리스 : 빛나는 이음새 + 위에 떠 있는 큐브
    for (const p of this.props) {
      G.draw('box', G.model(p.x, p.h / 2, p.y, p.a, p.w, p.h, p.w), this.c(th.mono), 0, { spec: 0.5, shine: 30, rim: 0.5 });
      for (let i = 1; i <= p.seams; i++) G.draw('box', G.model(p.x, p.h * i / (p.seams + 1), p.y, p.a, p.w + 2, 2, p.w + 2), this.c(th.seam), 1);
      G.draw('box', G.model(p.x, p.h - 3, p.y, p.a, p.w + 3, 5, p.w + 3), wc, 0.9);
      if (p.cube) G.draw('box', G.chain(G.T(p.x, p.h + 40 + Math.sin(t + p.a) * 10, p.y), G.Ry(t * 0.6 + p.a), G.Rx(0.6), G.S(p.w * 0.4, p.w * 0.4, p.w * 0.4)), this.c(th.seam), 0.6, { spec: 0.8, shine: 40 });
    }
    // 멀리 떠 있는 부서진 섬
    for (const s of this.islands) {
      const y = s.h + Math.sin(t * 0.5 + s.rot) * 12;
      G.draw('cone2', G.chain(G.T(s.x, y, s.y), G.Ry(s.rot), G.Rz(Math.PI), G.S(s.s, s.s * 1.4, s.s)), this.c(th.mono), 0, { spec: 0.2, rim: 0.6 });
      G.draw('tube', G.chain(G.T(s.x, y, s.y), G.Ry(s.rot), G.S(s.s, 8, s.s)), this.c(th.mono), 0, { spec: 0.3 });
      G.draw('thinRing', G.chain(G.T(s.x, y + 6, s.y), G.S(s.s * 1.02, s.s, s.s * 1.02)), this.c(th.seam), 1);
    }
    // 보스 스테이지 : 하늘의 거대한 시계 고리
    if (GL.Stage.name === 'boss') {
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      G.draw('ring', G.chain(G.T(cx, 520, cy + 900), G.Rx(Math.PI / 2 - 0.2), G.Ry(t * 0.05), G.S(700, 700, 700)), this.c('#3a2056'), 0.6);
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * 6.2832 + t * 0.05;
        G.draw('box', G.chain(G.T(cx, 520, cy + 900), G.Rx(-0.2), G.T(Math.cos(a) * 700, Math.sin(a) * 700, 0), G.Rz(a), G.S(60, 14, 14)), this.c(th.seam), 0.8);
      }
    }
    // 포털
    const P = GL.Stage.portal;
    if (P) {
      G.draw('ring', G.chain(G.T(P.x, 70, P.y), G.Ry(t * 0.8), G.Rx(Math.PI / 2), G.S(55, 55, 55)), this.c('#d36bff'), 0.9, { spec: 0.8 });
      G.draw('ring', G.chain(G.T(P.x, 70, P.y), G.Ry(-t * 1.3), G.Rx(Math.PI / 2), G.S(42, 42, 42)), this.c('#f0c8ff'), 0.9);
      G.draw('octa', G.chain(G.T(P.x, 70, P.y), G.Ry(t * 2), G.S(16, 22, 16)), this.c('#1a0024'), 0.4, { spec: 1, shine: 60 });
    }
  },

  // 빛 더하기 : 떠다니는 입자, 경계 장벽 빛, 포털 소용돌이
  drawGlow(G, t, obs) {
    const th = this.theme(), b = GL.Stage.bounds;
    G.blend('add');
    const mc = this.c(obs ? '#3fe0a8' : th.mote, 0.7);
    for (const m of this.motes) {
      const h = m.h + Math.sin(t * 0.8 + m.ph) * 20 + ((t * m.sp) % 80);
      G.draw('box', G.chain(G.T(m.x + Math.sin(t * 0.3 + m.ph) * 20, h, m.y), G.Ry(t + m.ph), G.S(m.s, m.s, m.s)), mc, 1);
    }
    // 경계 장벽 : 반투명 빛의 막
    const wa = obs ? [0.25, 0.88, 0.66, 0.08] : [...this.c(th.wall).slice(0, 3), 0.06];
    G.draw('box', G.model(b.x + b.w / 2, 40, b.y, 0, b.w, 70, 1), wa, 1);
    G.draw('box', G.model(b.x + b.w / 2, 40, b.y + b.h, 0, b.w, 70, 1), wa, 1);
    G.draw('box', G.model(b.x, 40, b.y + b.h / 2, 0, 1, 70, b.h), wa, 1);
    G.draw('box', G.model(b.x + b.w, 40, b.y + b.h / 2, 0, 1, 70, b.h), wa, 1);
    const P = GL.Stage.portal;
    if (P) {
      G.decal(G.circle(P.x, P.y, 60), 0.7, [0.8, 0.4, 1, 0.25]);
      for (let i = 0; i < 6; i++) G.decal(G.ringStrip(P.x, P.y, 20 + i * 8, 24 + i * 8, t * (1 + i * 0.2), 2.4, 16), 0.8, [0.83, 0.42, 1, 0.5]);
    }
    G.blend('normal');
  },
};
