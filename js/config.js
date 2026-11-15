// ============================================================
// config.js — 모든 수치 (Project GL 첫 플레이 수치표와 같은 값)
// 밸런스 조정은 이 파일만 고치면 됩니다.
// ============================================================
window.GL = window.GL || {};

GL.VERSION = 'v0.2';

GL.CONFIG = {
  // ---- 공통 규칙 ----
  rules: {
    holdTime: 0.5,          // 홀딩 판정 기준(초) — 강공격, 조력
    dodgeIframe: 0.3,       // 회피 무적(초)
    dodgeDistance: 140,     // 회피 이동 거리(px)
    dodgeCharges: 2,        // 연속 회피 횟수
    dodgeRecharge: 1.0,     // 2회 사용 후 재충전(초)
    moveSpeed: 230,         // 기본 이동 속도(px/초)
    sprintMul: 1.8,         // 대쉬(우클릭 홀딩) 배율
    tagCooldown: 1.0,       // 태그 재사용 대기(초)
    assistCooldown: 15,     // 조력 스킬 쿨타임(초)
    observeDuration: 8,     // 관측 지속(초)
    observeCooldown: 12,    // 관측 쿨타임(초, 끄는 순간부터)
    weakFracMul: 2,         // 약점 코어 타격 시 파쇄 배율
    groggyTime: 3,          // 그로기 지속(초)
    groggyDmgMul: 2.5,      // 그로기 중 피해 배율(+150%)
    critRate: 0.05,
    critMul: 1.5,
    ultPerHit: 2,
    ultPerSkillHit: 5,
    ultPerHurt: 1,
    comboWindow: 0.8,       // 평타 연계 유지 시간(초)
    jumpVel: 520,
    gravity: 1500,
  },

  // ---- 캐릭터 ----
  chars: {
    ian: {
      name: '이안', role: '파쇄 딜러', color: '#3fe0a8', weapon: '가변형 재봉 가위',
      hp: 1000, atk: 100, def: 50, ultMax: 100,
      light: [ // 평타 1~4타 : 계수(%), 파쇄, 사거리, 각도(도)
        { name: '사선 절단', coef: 50, frac: 1, range: 75, arc: 110 },
        { name: '역교차 베기', coef: 55, frac: 1, range: 75, arc: 110, stun: 0.2 },
        { name: '점격 찌르기', coef: 60, frac: 2, range: 95, arc: 40 },
        { name: '궤적 합체 절단', coef: 110, frac: 6, range: 100, arc: 170, knock: 60 },
      ],
      heavy: { name: '공간 절단', coef: 180, frac: 10, range: 170, width: 70, fieldTime: 3, fieldCoef: 20 },
      jump: { coef: 80, frac: 3, radius: 90 },
      jumpHeavy: { coef: 150, frac: 8, radius: 120 },
      passive: { name: '오류 정정', weakFracBonus: 0.5 },
      q: { name: '궤적 절삭', coef: 200, frac: 12, cd: 8, dash: 170, stun: 0.5 },
      e: { name: '관찰자의 혜안', cd: 15, dur: 3, radius: 320, weakDmgBonus: 0.3 },
      r: { name: '해체', coef: 600, frac: 30, radius: 260 },
      assist: { name: '유리 파편', dur: 5, shieldRatio: 0.15 },
    },
    baren: {
      name: '바렌', role: '수호 · 패링', color: '#e0b54a', weapon: '타워 쉴드',
      hp: 1400, atk: 70, def: 90, ultMax: 100,
      light: [
        { name: '방패 치기', coef: 40, frac: 2, range: 65, arc: 120 },
        { name: '지면 치기', coef: 45, frac: 2, range: 70, arc: 90 },
        { name: '스윙', coef: 55, frac: 3, range: 75, arc: 360 },
        { name: '반전 충격파', coef: 90, frac: 8, range: 95, arc: 140, knock: 70 },
      ],
      heavy: { name: '퍼펙트 가드', coef: 100, frac: 25, guardTime: 1.2, redMul: 2 },
      jump: { coef: 90, frac: 4, radius: 100, stun: 0.5 },
      jumpHeavy: { coef: 140, frac: 10, radius: 130, stun: 1.0 },
      passive: { name: '노이즈 리플렉션', reflect: 0.2 },
      q: { name: '불굴의 돌진', coef: 150, frac: 15, cd: 10, dash: 200 },
      e: { name: '압력 방출', coef: 220, frac: 18, cd: 12, range: 160, arc: 90 },
      r: { name: '이면 방패 : 절대 경계', dur: 6 },
      assist: { name: '수호자의 요새', dur: 8, reduce: 0.5 },
    },
    kay: {
      name: '케이', role: '극딜 · 약점 해독', color: '#b48cff', weapon: '단검(스틸레토)',
      hp: 850, atk: 115, def: 40, ultMax: 120,
      light: [
        { name: '코드:천공', coef: 35, frac: 1, range: 70, arc: 50, lunge: 25 },
        { name: 'X자 해독', coef: 40, frac: 1, range: 65, arc: 100 },
        { name: '오금 사냥', coef: 60, frac: 2, range: 70, arc: 80 },
        { name: '약점 분산', coef: 75, frac: 3, projectile: true, count: 3, defDown: 0.1, defDownTime: 5 },
      ],
      heavy: { name: '칼날 비', coef: 160, frac: 6, backstep: 90, count: 5 },
      jump: { coef: 70, frac: 2, radius: 90 },
      jumpHeavy: { coef: 130, frac: 5, radius: 110 },
      passive: { name: '오류탐지', weakCritBonus: 0.4 },
      q: { name: '출혈 단검', coef: 120, frac: 4, cd: 8, bleedCoef: 20, bleedTime: 5 },
      e: { name: '진영 교차', coef: 180, frac: 6, cd: 10, range: 380 },
      r: { name: '코드 파쇄 : 오버라이브', coef: 700, frac: 20, hits: 7, radius: 200 },
      assist: { name: '약점 해독', dur: 8, defDown: 0.3 },
    },
  },
  partyOrder: ['ian', 'baren', 'kay'],

  // ---- 적 ----
  enemies: {
    shard:    { name: '노이즈 파편체', hp: 200, atk: 60, def: 10, frac: 20, speed: 140, r: 14, color: '#ff5a6e', chargeTime: 1.5, blastCoef: 250, blastR: 85 },
    eroder:   { name: '데이터 침식자', hp: 300, atk: 50, def: 20, frac: 30, speed: 90, r: 16, color: '#ff8a3d', fireEvery: 2, range: 280, shotSpeed: 260, shotCoef: 100 },
    clasher:  { name: '균열의 파쇄손', hp: 800, atk: 90, def: 40, frac: 80, speed: 60, r: 24, color: '#c25cff', frontReduce: 0.7, slamCoef: 160 },
    guardian: { name: '아카이브 집행 수호자', hp: 2000, atk: 110, def: 60, frac: 150, speed: 70, r: 28, color: '#5c8dff', swingCoef: 150, bashCoef: 110, elite: true },
    echo:     { name: '시차 분신', hp: 1500, atk: 78, def: 30, frac: 60, speed: 0, r: 30, color: '#9a7bff' },
  },

  // ---- 보스 : 템푸스 ----
  tempus: {
    name: '템푸스', title: '시간의 찌꺼기',
    hp: 12000, atk: 130, def: 60, frac: 400, r: 44, speed: 95, color: '#d36bff',
    slashCoef: 150, ghostCoef: 120, ghostDelay: 1.0, slashR: 170, slashArc: 120,
    swampR: 120, swampTime: 6, swampSlow: 0.5,
    recover: 2.0,                         // 큰 공격 후 약점 노출 시간
    phase2: 0.7, phase3: 0.3,
    echoCount: 2, echoDelay: 3, echoLife: 10, echoCoef: 0.6,
    reversalAt: 0.5, reversalCast: 4, reversalKnotFrac: 60, reversalBack: 5,
    riftEvery: 3, riftR: 90, riftLife: 5, riftDps: 0.03,
    doomTime: 10, doomKnots: 3, doomKnotFrac: 40,
  },
};
