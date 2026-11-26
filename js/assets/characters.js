// ============================================================
// assets/characters.js — 아바타 캐릭터 (플레이어 파티)
// 관절이 있는 인형 : 골반 → 허벅지 → 정강이 / 몸통 → 위팔 → 아래팔 → 손 → 무기
// 나중에 실제 아바타 모델로 바꿀 때는 defs 의 외형 값을 쓰는 draw() 를 교체하면 된다.
// 자세(pose)는 GL.Party.player.anim / walk / z 에서 계산 → 실제 모델의 애니메이션 이름과 맞춰 쓰면 됨
// ============================================================
GL.Assets = GL.Assets || {};

GL.Assets.Characters = {
  // ---------- 외형 정의 (색·체격·머리 모양·무기) ----------
  defs: {
    ian: {
      scale: 1.0, shoulder: 9, build: 1.0,
      skin: '#f1dfcf', hair: '#d8e6f2', hairStyle: 'spiky',
      coat: '#2e3f58', coatTrim: '#3fe0a8', shirt: '#e8eef5', pants: '#2c3646', boots: '#11161f',
      scarf: '#3fe0a8', coatLength: 'long', weapon: 'ian', dual: true, eye: '#3fe0a8',
    },
    baren: {
      scale: 1.12, shoulder: 11, build: 1.25,
      skin: '#d9b896', hair: '#4a3420', hairStyle: 'short',
      coat: '#5a4220', coatTrim: '#e0b54a', shirt: '#3a2c14', pants: '#2c2418', boots: '#1a140c',
      armor: '#b38b3a', coatLength: 'short', weapon: 'baren', shieldArm: true, eye: '#ffe066',
    },
    kay: {
      scale: 0.96, shoulder: 8, build: 0.9,
      skin: '#efd9cb', hair: '#2a1e3d', hairStyle: 'hood',
      coat: '#3a2a55', coatTrim: '#b48cff', shirt: '#4b3a6a', pants: '#2a1f3a', boots: '#120c1a',
      scarf: '#b48cff', coatLength: 'cape', weapon: 'kay', dual: true, eye: '#ff6b9a',
    },
    taron: {
      scale: 1.05, shoulder: 10, build: 1.1,
      skin: '#e6c9b0', hair: '#9aa6b2', hairStyle: 'short',
      coat: '#2a3a48', coatTrim: '#7fc8e8', shirt: '#3b4a5a', pants: '#1f2a34', boots: '#12181f',
      gauntlet: '#9fb3c8', coatLength: 'short', weapon: 'taron', eye: '#7fc8e8',
    },
    serena: {
      scale: 0.95, shoulder: 8, build: 0.88,
      skin: '#f6e3d6', hair: '#f2e6ff', hairStyle: 'long',
      coat: '#f4eefc', coatTrim: '#e9b8ff', shirt: '#d9c6f0', pants: '#cbb8e6', boots: '#7a6a90',
      coatLength: 'robe', weapon: 'serena', eye: '#c08ae8',
    },
    clea: {
      scale: 1.0, shoulder: 9.5, build: 1.05,
      skin: '#f0d2bc', hair: '#c4572a', hairStyle: 'ponytail',
      coat: '#3a2a20', coatTrim: '#ff9f5a', shirt: '#5a4030', pants: '#2a201a', boots: '#16100c',
      armor: '#8a6a50', coatLength: 'short', weapon: 'clea', eye: '#ff9f5a',
    },
    noah: {
      scale: 0.92, shoulder: 8, build: 0.85,
      skin: '#f2dcd0', hair: '#bfe9ff', hairStyle: 'bob',
      coat: '#1e3a4a', coatTrim: '#8fe3ff', shirt: '#e8f8ff', pants: '#1a2c38', boots: '#0e1a22',
      scarf: '#8fe3ff', coatLength: 'cape', weapon: 'noah', dual: true, eye: '#8fe3ff',
    },
    // ----- 7대죄 (마스터 모드 전용 플레이) -----
    baektor: {
      scale: 1.04, shoulder: 9, build: 0.95,
      skin: '#f4e6dc', hair: '#f2f2f8', hairStyle: 'short',
      coat: '#f0f0f6', coatTrim: '#c9a640', shirt: '#2a2a34', pants: '#e2e2ea', boots: '#1a1a22',
      coatLength: 'long', weapon: 'baektor', eye: '#ffd24a', sin: true,
    },
    ploto: {
      scale: 1.02, shoulder: 9.5, build: 1.05,
      skin: '#e8cfc0', hair: '#5a0e1a', hairStyle: 'spiky',
      coat: '#2a0c12', coatTrim: '#d2304a', shirt: '#4a1420', pants: '#1c0a0e', boots: '#0e0406',
      scarf: '#d2304a', coatLength: 'long', weapon: 'ploto', eye: '#ff3050', sin: true,
    },
    ares: {
      scale: 1.16, shoulder: 11.5, build: 1.3,
      skin: '#d8a890', hair: '#b82010', hairStyle: 'spiky',
      coat: '#3a1208', coatTrim: '#ff4a2a', shirt: '#1e0a06', pants: '#24100a', boots: '#100604',
      armor: '#5a2a1a', coatLength: 'short', weapon: 'ares', eye: '#ff6a2a', sin: true,
    },
    invidi: {
      scale: 0.98, shoulder: 8.5, build: 0.9,
      skin: '#cfe0d4', hair: '#0e2a1a', hairStyle: 'hood',
      coat: '#0e2a1a', coatTrim: '#5ad18c', shirt: '#163a26', pants: '#0a1a10', boots: '#050c08',
      scarf: '#5ad18c', coatLength: 'cape', weapon: 'invidi', eye: '#7affb0', sin: true,
    },
    asadi: {
      scale: 0.96, shoulder: 8, build: 0.86,
      skin: '#f2d6e0', hair: '#7a2aa8', hairStyle: 'long',
      coat: '#3a1250', coatTrim: '#e6a6ff', shirt: '#5a2278', pants: '#2a0c3a', boots: '#14061c',
      coatLength: 'robe', weapon: 'asadi', eye: '#ff7ae0', sin: true,
    },
    luciel: {
      scale: 1.0, shoulder: 9, build: 0.95,
      skin: '#e8e2dc', hair: '#8a929e', hairStyle: 'bob',
      coat: '#4a4e58', coatTrim: '#c8d0dc', shirt: '#2a2e36', pants: '#30343c', boots: '#16181c',
      scarf: '#6a7280', coatLength: 'long', weapon: 'luciel', eye: '#c8d0dc', sin: true,
    },
    gula: {
      scale: 1.2, shoulder: 12, build: 1.5,
      skin: '#d8b48c', hair: '#3a2a10', hairStyle: 'short',
      coat: '#4a3414', coatTrim: '#d8a040', shirt: '#2a1e0a', pants: '#2a200c', boots: '#120c04',
      armor: '#6a5020', coatLength: 'short', weapon: 'gula', dual: true, backMaw: true, eye: '#ffd040', sin: true,
    },
  },
  // 이안 인과 역류 중 외형 : 칠흑 (자의 발동 = 흰 눈 / 강제 폭주 = 붉은 눈)
  backflowLook(def, mode) {
    return Object.assign({}, def, { coat: '#050505', coatTrim: mode === 'forced' ? '#ff2040' : '#e8e8e8', shirt: '#101010', pants: '#080808', boots: '#000000',
      hair: '#1a1a1a', scarf: mode === 'forced' ? '#ff2040' : '#3a3a3a', eye: mode === 'forced' ? '#ff2040' : '#ffffff' });
  },

  c(hex, a = 1) { return GL.G3.rgba(hex, a); },
  cloth: { spec: 0.05, shine: 8, rim: 0.3 },
  skinM: { spec: 0.15, shine: 14, rim: 0.25 },

  // ---------- 자세 계산 ----------
  pose(p, def, t) {
    const a = p.anim || { kind: 'idle', t: 0, dur: 1 }, u = Math.min(1, a.t / (a.dur || 1));
    const P = {
      lean: 0, twist: 0, crouch: 0, head: 0,
      L: { hip: 0, knee: 0.08 }, R: { hip: 0, knee: 0.08 },
      aL: { pitch: 0.15, yaw: 0, roll: 0.18, elbow: 0.35 }, aR: { pitch: 0.15, yaw: 0, roll: -0.18, elbow: 0.35 },
      glow: 0, shield: 0, coatSwing: 0,
    };
    const breath = Math.sin(t * 2.2) * 0.03;
    P.aL.roll += breath; P.aR.roll -= breath;
    // 달리기
    if (p.moving && p.z < 1) {
      const ph = p.walk, s = Math.sin(ph), c = Math.cos(ph);
      P.L.hip = s * 0.85; P.R.hip = -s * 0.85;
      P.L.knee = 0.2 + Math.max(0, -c) * 1.1; P.R.knee = 0.2 + Math.max(0, c) * 1.1;
      P.aL.pitch = -s * 0.7; P.aR.pitch = s * 0.7; P.aL.elbow = P.aR.elbow = 0.9;
      P.lean = 0.22; P.crouch = Math.abs(c) * 1.5; P.coatSwing = 0.35 + Math.abs(s) * 0.2;
    }
    // 공중
    if (p.z > 1) {
      P.L.hip = 0.7; P.R.hip = 0.3; P.L.knee = 1.3; P.R.knee = 0.9;
      P.aL.pitch = P.aR.pitch = 0.6; P.aL.roll = 0.6; P.aR.roll = -0.6; P.coatSwing = 0.5;
    }
    const swing = (side, from, to) => {
      const arm = side === 'R' ? P.aR : P.aL, k = Math.sin(Math.min(1, u * 1.4) * Math.PI / 2);
      arm.pitch = 1.45; arm.elbow = 0.25; arm.yaw = (side === 'R' ? 1 : -1) * (from + (to - from) * k); arm.roll = 0;
      P.twist = (side === 'R' ? -1 : 1) * (from + (to - from) * k) * 0.35;
    };
    switch (a.kind) {
      case 'light': {
        const st = a.step || 1;
        if (st === 1) swing('R', -1.2, 1.3);
        else if (st === 2) swing('L', -1.2, 1.3);
        else if (st === 3) { P.aR.pitch = 1.55; P.aR.elbow = 0.05; P.aR.yaw = 0; P.lean = 0.35; P.L.hip = 0.6; P.R.hip = -0.4; }
        else { swing('R', -1.4, 1.4); swing('L', -1.4, 1.4); P.twist = 0; P.crouch = 3; P.glow = 1; }
        P.lean = Math.max(P.lean, 0.2); P.glow = Math.max(P.glow, 0.5);
        break;
      }
      case 'heavy': {
        const up = u < 0.35, k = up ? u / 0.35 : (u - 0.35) / 0.65;
        const pitch = up ? 1.4 + k * 1.5 : 2.9 - Math.min(1, k * 2) * 1.8;
        P.aL.pitch = P.aR.pitch = pitch; P.aL.elbow = P.aR.elbow = 0.2; P.aL.yaw = -0.25; P.aR.yaw = 0.25; P.aL.roll = P.aR.roll = 0;
        P.lean = up ? -0.1 : 0.45; P.crouch = up ? 0 : 5; P.L.hip = 0.6; P.R.hip = -0.5; P.R.knee = 0.6; P.glow = 1;
        break;
      }
      case 'guard': {
        P.aL.pitch = 1.3; P.aL.elbow = 1.1; P.aL.yaw = -0.4; P.aL.roll = 0; P.shield = 1;
        P.aR.pitch = 0.9; P.aR.elbow = 1.2; P.crouch = 5; P.lean = 0.15; P.L.hip = 0.5; P.R.hip = -0.4; P.L.knee = P.R.knee = 0.6;
        P.glow = 1;
        break;
      }
      case 'skillQ': case 'skillE': {
        P.aR.pitch = 1.5; P.aR.elbow = 0.1; P.aR.yaw = 0.1; P.aL.pitch = 1.2; P.aL.yaw = -0.6; P.aL.elbow = 0.4;
        P.lean = 0.4; P.L.hip = 0.7; P.R.hip = -0.6; P.R.knee = 0.4; P.glow = 1; P.coatSwing = 0.7;
        break;
      }
      case 'ult': {
        const k = Math.min(1, u * 2);
        P.aL.pitch = P.aR.pitch = 2.9 - k * 1.3; P.aL.roll = 0.8 * k; P.aR.roll = -0.8 * k; P.aL.elbow = P.aR.elbow = 0.1;
        P.crouch = 6 * k; P.lean = -0.1 + 0.3 * k; P.glow = 1; P.coatSwing = 0.8;
        break;
      }
      case 'plunge': {
        P.aL.pitch = P.aR.pitch = 2.6; P.aL.elbow = P.aR.elbow = 0.2; P.lean = 0.5; P.L.knee = P.R.knee = 1.4; P.L.hip = P.R.hip = 1.0; P.glow = 1;
        break;
      }
      case 'land': {
        const k = 1 - u;
        P.crouch = 9 * k; P.L.hip = P.R.hip = 0.9 * k; P.L.knee = P.R.knee = 1.6 * k; P.aL.pitch = P.aR.pitch = 1.0; P.lean = 0.5 * k;
        break;
      }
      case 'erase': {   // 소거 : 양팔을 앞으로 모아 청색 빛을 발현
        P.aL.pitch = P.aR.pitch = 1.5; P.aL.yaw = 0.35; P.aR.yaw = -0.35; P.aL.elbow = P.aR.elbow = 0.1;
        P.lean = 0.3; P.crouch = 3; P.glow = 1; P.L.hip = 0.4; P.R.hip = -0.3;
        break;
      }
      case 'dodge': {
        P.crouch = 7; P.lean = 0.7; P.L.hip = 1.1; P.R.hip = -0.2; P.L.knee = 1.4; P.R.knee = 0.9; P.aL.pitch = P.aR.pitch = -0.6; P.coatSwing = 0.9;
        break;
      }
    }
    if (def.shieldArm && a.kind !== 'guard') P.aL.pitch = Math.max(P.aL.pitch, 0.35);
    return P;
  },

  // ---------- 그리기 ----------
  drawPlayer(G) {
    const p = GL.Party.player, ch = GL.Party.active(), t = GL.World.time;
    if (!ch) return;
    let def = this.defs[ch.id] || this.defs.ian;
    const bf = ch.id === 'ian' && GL.Ian.backflow;
    if (bf) def = this.backflowLook(def, bf.mode);
    const P = this.pose(p, def, t);
    if (bf) P.glow = 1;
    const flash = p.hurtFlash > 0, alpha = p.iframe > 0 ? 0.55 : 1;
    this.humanoid(G, def, P, p.x, p.z * 0.6, p.y, p.facing, { flash, alpha, t, observe: GL.World.observe.on && !bf, backflow: bf });
  },

  humanoid(G, def, P, x, h, y, facing, o) {
    const s = def.scale, b = def.build, C = (hex) => this.c(o.flash ? '#ffffff' : hex, o.alpha);
    const hipY = 24 * s - P.crouch, thigh = 12 * s, shin = 12 * s, torso = 20 * s, upper = 10 * s, fore = 10 * s, sh = def.shoulder * s;
    const R0 = G.root(x, h, y, facing);

    // --- 다리 ---
    for (const [side, z] of [['L', -4.6 * s * b], ['R', 4.6 * s * b]]) {
      const L = P[side];
      const Mh = G.chain(R0, G.T(0, hipY, z), G.Rz(L.hip));
      G.draw('tube', G.chain(Mh, G.T(0, -thigh, 0), G.S(3.1 * b, thigh, 3.1 * b)), C(def.pants), 0, this.cloth);
      const Mk = G.chain(Mh, G.T(0, -thigh, 0), G.Rz(-L.knee));
      G.draw('ball', G.chain(Mk, G.S(3 * b, 3 * b, 3 * b)), C(def.pants), 0, this.cloth);
      G.draw('tube', G.chain(Mk, G.T(0, -shin, 0), G.S(2.7 * b, shin, 2.7 * b)), C(def.boots), 0, { spec: 0.3, shine: 20, rim: 0.3 });
      G.draw('box', G.chain(Mk, G.T(2.2, -shin - 1.2, 0), G.S(8.5 * b, 3.4, 5 * b)), C(def.boots), 0, { spec: 0.4, shine: 24 });
      if (def.armor) G.draw('box', G.chain(Mk, G.T(2.4, -shin * 0.45, 0), G.S(2, shin * 0.7, 4.6)), C(def.armor), 0.05, { spec: 0.8, shine: 40, rim: 0.4 });
    }

    // --- 몸통 ---
    const Mt = G.chain(R0, G.T(0, hipY, 0), G.Rz(-P.lean), G.Ry(P.twist));
    G.draw('box', G.chain(Mt, G.T(0, 1, 0), G.S(9 * b, 6, 12 * b)), C(def.pants), 0, this.cloth);                 // 골반
    G.draw('wedge', G.chain(Mt, G.T(0, torso * 0.55, 0), G.Rz(Math.PI), G.S(10 * b, torso * 0.95, 17 * b)), C(def.coat), 0, this.cloth); // 가슴(역삼각)
    G.draw('box', G.chain(Mt, G.T(5 * b, torso * 0.6, 0), G.S(1, torso * 0.7, 5)), C(def.shirt), 0, this.cloth);   // 셔츠 앞
    G.draw('box', G.chain(Mt, G.T(0, 4, 0), G.S(10 * b, 2.6, 13 * b)), C(def.coatTrim), 0.25, { spec: 0.6, shine: 30 }); // 벨트
    // 코트 자락 / 망토
    const sw = P.coatSwing;
    if (def.coatLength === 'long') {
      for (const z of [-4.5 * b, 4.5 * b]) G.draw('wedge', G.chain(Mt, G.T(-3, 2, z), G.Rz(-0.15 - sw), G.T(0, -9, 0), G.S(4, 18, 6)), C(def.coat), 0, this.cloth);
      G.draw('box', G.chain(Mt, G.T(-4.5, 2, 0), G.Rz(-0.1 - sw), G.T(0, -8.5, 0), G.S(1.2, 17, 1.4)), C(def.coatTrim), 0.6);
    } else if (def.coatLength === 'robe') {   // 긴 사제복 치마
      G.draw('cone2', G.chain(R0, G.T(0, Math.max(2, hipY - 22), 0), G.Ry(-facing * 0), G.S(11 * b + sw * 3, 26, 11 * b + sw * 2)), C(def.coat), 0, this.cloth);
      G.draw('tube', G.chain(R0, G.T(0, Math.max(2, hipY - 22), 0), G.S(11.2 * b + sw * 3, 1.5, 11.2 * b + sw * 2)), C(def.coatTrim), 0.4);
    } else if (def.coatLength === 'cape') {
      G.draw('wedge', G.chain(Mt, G.T(-5, torso, 0), G.Rz(-0.08 - sw * 0.8), G.T(0, -15, 0), G.S(2, 30, 17)), C(def.coat), 0, this.cloth);
    } else {
      G.draw('wedge', G.chain(Mt, G.T(-2, 2, 0), G.Rz(-0.1 - sw * 0.5), G.T(0, -5, 0), G.S(6, 10, 13 * b)), C(def.coat), 0, this.cloth);
    }
    if (def.armor) { // 가슴 장갑
      G.draw('box', G.chain(Mt, G.T(5.5 * b, torso * 0.68, 0), G.S(2.2, torso * 0.5, 13 * b)), C(def.armor), 0.05, { spec: 0.8, shine: 40, rim: 0.4 });
    }
    if (def.scarf) { // 목도리 (뒤로 날림)
      G.draw('tube', G.chain(Mt, G.T(0, torso + 0.5, 0), G.S(4.6, 2.6, 4.6)), C(def.scarf), 0.25, this.cloth);
      G.draw('box', G.chain(Mt, G.T(-4, torso, 2), G.Rz(-0.9 - sw), G.T(0, -5, 0), G.S(1, 10, 2.6)), C(def.scarf), 0.25, this.cloth);
    }

    if (def.backMaw) {   // 굴라 : 등에 달린 생체 아가리
      const open = 0.3 + P.glow * 0.5, Mm = G.chain(Mt, G.T(-8 * b, torso * 0.6, 0), G.Rz(Math.PI / 2 + 0.3));
      G.draw('cone2', G.chain(Mm, G.Rz(open), G.S(6, 12, 9)), C('#7a2a2a'), 0, this.skinM);
      G.draw('cone2', G.chain(Mm, G.Rz(-open), G.S(6, 12, 9)), C('#7a2a2a'), 0, this.skinM);
      for (let i = 0; i < 5; i++) G.draw('cone2', G.chain(Mm, G.T(4, (i - 2) * 1.6, 0), G.Rz(-Math.PI / 2), G.S(0.8, 2.6, 0.8)), C('#f4ecd8'), 0.1);
    }
    // --- 팔 ---
    const hands = {};
    for (const [side, z] of [['L', -sh * b], ['R', sh * b]]) {
      const A = side === 'L' ? P.aL : P.aR;
      const Ms = G.chain(Mt, G.T(0, torso - 1, z), G.Ry(A.yaw), G.Rz(A.pitch), G.Rx(A.roll));
      G.draw('ball', G.chain(Ms, G.S(3.6 * b, 3.6 * b, 3.6 * b)), C(def.armor || def.coat), def.armor ? 0.05 : 0, def.armor ? { spec: 0.8, shine: 40 } : this.cloth);
      if (def.armor) G.draw('ball', G.chain(Ms, G.T(0, 1.5, 0), G.S(5.2 * b, 3.6, 5.4 * b)), C(def.armor), 0.05, { spec: 0.8, shine: 40, rim: 0.4 });
      G.draw('tube', G.chain(Ms, G.T(0, -upper, 0), G.S(2.5 * b, upper, 2.5 * b)), C(def.coat), 0, this.cloth);
      const Me = G.chain(Ms, G.T(0, -upper, 0), G.Rz(A.elbow));
      G.draw('tube', G.chain(Me, G.T(0, -fore, 0), G.S(2.2 * b, fore, 2.2 * b)), C(def.coat), 0, this.cloth);
      G.draw('tube', G.chain(Me, G.T(0, -fore + 0.5, 0), G.S(2.5 * b, 2.4, 2.5 * b)), C(def.coatTrim), 0.3);   // 소매 끝
      G.draw('ball', G.chain(Me, G.T(0, -fore - 1.5, 0), G.S(2.4, 2.6, 2.4)), C(def.gauntlet || def.skin), def.gauntlet ? 0.1 : 0, def.gauntlet ? { spec: 0.9, shine: 40 } : this.skinM);
      if (def.gauntlet) G.draw('tube', G.chain(Me, G.T(0, -fore + 0.5, 0), G.S(2.9, 4, 2.9)), C(def.gauntlet), 0.1, { spec: 0.9, shine: 40 });
      hands[side] = G.chain(Me, G.T(0, -fore - 2, 0));
    }

    // --- 머리 ---
    const Mn = G.chain(Mt, G.T(0, torso + 1, 0), G.Rz(P.lean * 0.4 + P.head));
    G.draw('tube', G.chain(Mn, G.S(2.2, 3, 2.2)), C(def.skin), 0, this.skinM);
    const Mhd = G.chain(Mn, G.T(0.5, 8.5 * s, 0));
    G.draw('ball', G.chain(Mhd, G.S(6.6 * s, 7.4 * s, 6.4 * s)), C(def.skin), 0, this.skinM);
    // 눈 (관측 중 에메랄드로 빛남)
    const eye = o.observe ? '#3fe0a8' : def.eye;
    for (const z of [-2.3, 2.3]) G.draw('box', G.chain(Mhd, G.T(6 * s, 0.8, z * s), G.S(0.8, 1.4, 1.6)), this.c(eye, o.alpha), o.observe ? 1 : 0.6);
    this.hair(G, def, Mhd, s, C, P);

    // --- 무기 ---
    const W = GL.Assets.Weapons, glow = P.glow;
    if (def.weapon === 'baren') {
      // 타워 쉴드 : 왼팔 쪽에 붙어 있다가 가드 때 정면으로
      const k = P.shield;
      const M = G.chain(Mt, G.T(6 + 12 * k, 12 - 2 * k, -(sh + 5) * b * (1 - k * 0.85)), G.Ry(0.9 * (1 - k)));
      W.baren(G, M, { glow: glow * (k > 0 ? 1 : 0.3), t: o.t });
      // 오른손 : 건틀릿
      G.draw('ball', G.chain(hands.R, G.S(3.6, 3.6, 3.6)), C(def.armor), 0.1, { spec: 0.9, shine: 40 });
    } else if (def.dual) {
      for (const side of ['L', 'R']) {
        const grip = G.chain(hands[side], G.Rz(-Math.PI / 2 + 0.25));
        W[def.weapon](G, grip, { glow, t: o.t, side, backflow: o.backflow });
      }
    } else if (W[def.weapon]) {   // 한 손/양손 무기 (삼절곤 · 향로 메이스 · 워해머)
      W[def.weapon](G, G.chain(hands.R, G.Rz(-Math.PI / 2 + 0.25)), { glow, t: o.t });
    }
  },

  hair(G, def, Mh, s, C, P) {
    if (def.hairStyle === 'spiky') {
      G.draw('ball', G.chain(Mh, G.T(-0.8, 1.6, 0), G.S(7.2 * s, 6.8 * s, 7.0 * s)), C(def.hair), 0, { spec: 0.4, shine: 30, rim: 0.5 });
      for (let i = 0; i < 6; i++) {
        const a = -0.9 + i * 0.36;
        G.draw('cone2', G.chain(Mh, G.T(-2, 4, 0), G.Rx(a), G.Rz(0.9), G.S(2.4, 9, 2.4)), C(def.hair), 0, { spec: 0.4, shine: 30, rim: 0.5 });
      }
      G.draw('cone2', G.chain(Mh, G.T(4, 4.5, 0), G.Rz(-1.9), G.S(2.6, 6, 3.4)), C(def.hair), 0, { spec: 0.4, shine: 30 });   // 앞머리
    } else if (def.hairStyle === 'short') {
      G.draw('ball', G.chain(Mh, G.T(-0.6, 2.2, 0), G.S(7.0 * s, 6.0 * s, 6.8 * s)), C(def.hair), 0, { spec: 0.2 });
      G.draw('tube', G.chain(Mh, G.T(0, 3.2, 0), G.S(7.1 * s, 1.6, 7.1 * s)), C(def.coatTrim), 0.3, { spec: 0.7, shine: 30 }); // 머리띠
    } else if (def.hairStyle === 'long') {
      G.draw('ball', G.chain(Mh, G.T(-0.8, 1.4, 0), G.S(7.2 * s, 7.0 * s, 7.2 * s)), C(def.hair), 0, { spec: 0.5, shine: 30, rim: 0.5 });
      G.draw('wedge', G.chain(Mh, G.T(-4.5, -8, 0), G.Rz(0.12 + P.coatSwing * 0.3), G.S(3, 22, 13)), C(def.hair), 0, { spec: 0.5, shine: 30, rim: 0.5 });
      G.draw('thinRing', G.chain(Mh, G.T(0, 3.5, 0), G.Rz(0.25), G.S(7.6, 7.6, 7.6)), C(def.coatTrim), 0.6);   // 머리 장식
    } else if (def.hairStyle === 'ponytail') {
      G.draw('ball', G.chain(Mh, G.T(-0.6, 1.8, 0), G.S(7.1 * s, 6.4 * s, 7.0 * s)), C(def.hair), 0, { spec: 0.4, shine: 26 });
      G.draw('tube', G.chain(Mh, G.T(-6, 3, 0), G.Rz(2.4 + P.coatSwing * 0.4), G.S(2.2, 13, 2.2)), C(def.hair), 0, { spec: 0.4 });
      G.draw('box', G.chain(Mh, G.T(2, 5.5, 0), G.S(6, 1.6, 9)), C(def.coatTrim), 0.3);   // 고글
    } else if (def.hairStyle === 'bob') {
      G.draw('ball', G.chain(Mh, G.T(-0.6, 0.6, 0), G.S(7.6 * s, 7.4 * s, 7.8 * s)), C(def.hair), 0, { spec: 0.5, shine: 30, rim: 0.6 });
      G.draw('box', G.chain(Mh, G.T(5.2, 3.2, 0), G.S(1.4, 3, 12)), C(def.hair), 0, { spec: 0.4 });   // 앞머리
    } else if (def.hairStyle === 'hood') {
      G.draw('ball', G.chain(Mh, G.T(-1.2, 1.2, 0), G.S(8.2 * s, 8.4 * s, 8.0 * s)), C(def.coat), 0, this.cloth);
      G.draw('cone2', G.chain(Mh, G.T(-5, 3, 0), G.Rz(1.9), G.S(4, 8, 4)), C(def.coat), 0, this.cloth);
      G.draw('box', G.chain(Mh, G.T(6.4, -3, 0), G.S(1, 4, 9)), C(def.scarf || def.coatTrim), 0.3);   // 마스크
    }
  },
};
