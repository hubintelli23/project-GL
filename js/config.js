// ============================================================
// config.js — 모든 수치 (Project GL 첫 플레이 수치표와 같은 값)
// 밸런스 조정은 이 파일만 고치면 됩니다.
// ============================================================
window.GL = window.GL || {};

GL.VERSION = 'v0.8';

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
      name: '이안', role: '파쇄 딜러', virtue: '겸손', color: '#3fe0a8', weapon: '가변형 재봉 가위',
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
      r: { name: '인과해체', coef: 600, frac: 30, radius: 260 },   // 2단계 파쇄 중심 광역 궁극기 (소거와 통합하지 않음)
      assist: { name: '유리 파편', dur: 5, shieldRatio: 0.15 },
      // ---- 3단계 소거 연계 / 4단계 인과 역류 (문서상 미정 수치 → 임시값) ----
      erasure: {
        name: '소거', window: 0.7,         // 4타 '궤적 합체 절단' 이후 추가 입력 유효 시간(초)
        markMax: 100, markNeed: 40,          // 파쇄 흔적 최대 / 소거 가능 조건
        markPerFrac: 4,                      // 이안의 파쇄 수치 1당 쌓이는 흔적
        coef: 260, radius: 150,              // 소거 피해(방어 무시 시스템 피해), 잔재·장판 삭제 반경
        reaction: 18,                        // 소거 1회당 반작용 누적
      },
      reaction: {
        max: 100, unstable: 60,              // 불안정 단계 = 플레이어 선택 발동 가능
        grace: 3,                            // 임계(100) 도달 후 강제 발동까지 유예(초)
        decay: 1.5, decayDelay: 6,           // 소거를 안 하면 6초 뒤부터 초당 1.5 감소
      },
      backflow: {
        name: '인과 역류',
        player: { dur: 8, hpCost: 0.10, drain: 0.015, dmgMul: 2.2 },          // 자의 발동
        forced: { dur: 10, hpCost: 0, drain: 0.03, dmgMul: 2.6, allyHit: 0.03 }, // 강제 폭주 (아군도 공격)
        pulseEvery: 1.2, pulseCoef: 70, pulseR: 170,
        after: { dur: 8, slow: 0.3 },        // 후유증 : 감각 상실 (이동 감소, 소거 봉인)
      },
    },
    baren: {
      name: '바렌', role: '수호 · 패링', virtue: '인내', color: '#e0b54a', weapon: '타워 쉴드',
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
      name: '케이', role: '극딜 · 약점 해독', virtue: '순결', color: '#b48cff', weapon: '단검(스틸레토)',
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
    // ---------- v0.7 추가 7대선 ----------
    taron: {
      name: '태론', role: '제어 · 결계', virtue: '절제', color: '#7fc8e8', weapon: '삼절곤',
      hp: 1200, atk: 85, def: 70, ultMax: 110,
      light: [
        { name: '구속 타격', coef: 45, frac: 2, range: 95, arc: 90, stun: 0.4 },
        { name: '진공 청소', coef: 40, frac: 2, range: 140, arc: 100, pull: 60 },
        { name: '디지털 에어본', coef: 60, frac: 3, range: 80, arc: 110, stun: 0.9, launch: true },
        { name: '체인 슬랩', coef: 100, frac: 8, line: true, len: 160, w: 50, stun: 1.0 },
      ],
      heavy: { name: '억제 결계', coef: 120, frac: 12, radius: 130, seal: 4 },
      jump: { coef: 80, frac: 4, radius: 90, stun: 1.0 },
      jumpHeavy: { coef: 130, frac: 10, radius: 120, stun: 1.4 },
      passive: { name: '노이즈 쿨다운', cdCut: 1.5, slow: 2 },
      q: { name: '진공 포박', coef: 140, frac: 12, cd: 9, len: 320 },
      e: { name: '절제 감옥', coef: 0, frac: 0, cd: 14, radius: 120, dur: 6 },
      r: { name: '절대 쇄인 : 시간 정지', radius: 340, dur: 4, bossDur: 2.5 },
      assist: { name: '절제의 사슬 방벽', dur: 8, reduce: 0.25, radius: 120 },
    },
    serena: {
      name: '세레나', role: '치유 · 정화', virtue: '자애', color: '#e9b8ff', weapon: '향로 메이스',
      hp: 1050, atk: 80, def: 55, ultMax: 120,
      light: [
        { name: '지애의 유도 탄환', coef: 45, frac: 1, homing: true },
        { name: '은총', coef: 40, frac: 2, range: 90, arc: 140, knock: 40 },
        { name: '초승달 밀치기', coef: 55, frac: 3, range: 115, arc: 220, knock: 50 },
        { name: '백색 파동', coef: 90, frac: 6, radius: 130, heal: 0.03 },
      ],
      heavy: { name: '광휘 파동', coef: 160, frac: 8, len: 300, w: 90 },
      jump: { coef: 70, frac: 3, radius: 130, slow: 3 },
      jumpHeavy: { coef: 110, frac: 6, radius: 150, slow: 4 },
      passive: { name: '기억의 잔재', every: 5, heal: 0.02 },
      q: { name: '빛의 정원', cd: 14, radius: 150, dur: 6, heal: 0.03, speed: 0.2 },
      e: { name: '기억 정화', cd: 12, heal: 0.10, immune: 5 },
      r: { name: '자애의 빛 : 무결 구원', dur: 4, coef: 400, frac: 20, radius: 260 },
      assist: { name: '구명조끼', dur: 20, revive: 0.3 },
    },
    clea: {
      name: '클레아', role: '파괴 · 무기 강화', virtue: '근면', color: '#ff9f5a', weapon: '메카닉 워해머',
      hp: 1150, atk: 110, def: 60, ultMax: 120,
      light: [
        { name: '모루 횡단', coef: 55, frac: 3, range: 95, arc: 160 },
        { name: '제련', coef: 60, frac: 4, range: 85, arc: 100, stun: 0.6, launch: true },
        { name: '중력 해머', coef: 80, frac: 5, circleFront: 60, radius: 80, stun: 0.5 },
        { name: '피스톤 가시', coef: 110, frac: 8, circleFront: 60, radius: 110, after: 50 },
      ],
      heavy: { name: '역 중력', coef: 170, frac: 14, radius: 140, stun: 1.2 },
      jump: { coef: 100, frac: 5, radius: 140 },
      jumpHeavy: { coef: 160, frac: 12, radius: 170 },
      passive: { name: '연마', perHit: 0.02, max: 10, keep: 3 },
      q: { name: '유리 가시', cd: 10, radius: 120, dur: 5, coef: 30 },
      e: { name: '크리티컬 제련', cd: 16, dur: 6 },
      r: { name: '제련의 인과 : 창조의 모루', coef: 650, frac: 35, radius: 200, delay: 0.6 },
      assist: { name: '대장장이의 무구', dur: 10, atkUp: 0.25 },
    },
    noah: {
      name: '노아', role: '원거리 · 환영', virtue: '소망', color: '#8fe3ff', weapon: '차크람',
      hp: 900, atk: 105, def: 45, ultMax: 110,
      light: [
        { name: '차크람 투척', coef: 45, frac: 2, boomerang: true, range: 260 },
        { name: '궤적 투척', coef: 45, frac: 2, curve: true, range: 240 },
        { name: '교차 궤적', coef: 30, frac: 2, cross: true, range: 220 },
        { name: '파편 폭풍', coef: 35, frac: 3, storm: true, radius: 130, hits: 3, knock: 50 },
      ],
      heavy: { name: '렌즈 광선', coef: 190, frac: 12, len: 420, w: 40 },
      jump: { coef: 70, frac: 3, radius: 120, stun: 1.2 },
      jumpHeavy: { coef: 110, frac: 7, radius: 140, stun: 1.5 },
      passive: { name: '소망의 관측', rangeUp: 0.2 },
      q: { name: '희망의 파동', cd: 8, coef: 120, frac: 10, radius: 150, knock: 90 },
      e: { name: '잔영 투척', cd: 10, coef: 60, frac: 4, count: 3 },
      r: { name: '희망의 만화경', coef: 80, frac: 4, beams: 14, radius: 360 },
      assist: { name: '소망의 잔영', dur: 8, echo: 0.4 },
    },
    // ===== 7대죄 (원래 플레이 불가 적대 세력) — 마스터 모드에서만 플레이 가능 · 수치는 전부 임시값 =====
    baektor: {
      sin: true, name: '백토르', role: '처형 · 격리', virtue: '오만', color: '#e8e8ff', weapon: '레이피어',
      hp: 1000, atk: 110, def: 50, ultMax: 120,
      light: [
        { name: '광속 천공', coef: 50, frac: 2, thrust: true, len: 170, w: 34, lunge: 50 },
        { name: 'Z 컷', coef: 22, frac: 1, zcut: true, range: 110, hits: 3 },
        { name: '핵심 찌르기', coef: 70, frac: 4, thrust: true, len: 150, w: 26, stun: 1.0 },
        { name: '질서의 참격', coef: 95, frac: 8, grid: true, len: 190, w: 150 },
      ],
      heavy: { name: '환영 난사', coef: 26, frac: 2, hits: 8, len: 200, w: 70 },
      jump: { coef: 90, frac: 4, radius: 80, stun: 0.8 },
      jumpHeavy: { coef: 140, frac: 8, radius: 100, stun: 1.2 },
      passive: { name: '오만한 연산', full: 6, speedMax: 0.35, lockCut: 0.35 },
      q: { name: '성관 단죄', cd: 8, coef: 180, frac: 14, dash: 200, stun: 2.0 },
      e: { name: '격리 큐브', cd: 12, coef: 60, frac: 6, range: 320, dur: 4, dmgTaken: 0.3 },
      r: { name: '시스템 단죄 : 천공의 검', coef: 650, frac: 30, radius: 260, delay: 0.9 },
      assist: { name: '절단 연산', dur: 8, extra: 0.25 },
    },
    ploto: {
      sin: true, name: '플로토', role: '흡혈 · 갈취', virtue: '탐욕', color: '#d2304a', weapon: '사슬 톱날 채찍',
      hp: 1150, atk: 95, def: 55, ultMax: 115,
      light: [
        { name: '톱날 절삭', coef: 40, frac: 2, range: 150, arc: 40, bleed: 2 },
        { name: '탐식 휘두르기', coef: 45, frac: 2, radius: 140, bleed: 2 },
        { name: '출혈 채찍', coef: 65, frac: 3, range: 170, arc: 30, bleed: 4 },
        { name: '갈고리 포박', coef: 90, frac: 8, len: 220, w: 40, hook: true, drain: 0.04 },
      ],
      heavy: { name: '포식', coef: 110, frac: 10, radius: 200, pull: 120, slow: 3 },
      jump: { coef: 80, frac: 3, radius: 110, pull: 50 },
      jumpHeavy: { coef: 120, frac: 7, radius: 140, pull: 80 },
      passive: { name: '탐욕의 갈취', steal: 0.03, atkPer: 0.01, max: 20, keep: 4 },
      q: { name: '생명력 강탈', cd: 10, coef: 200, frac: 10, range: 260, heal: 0.18 },
      e: { name: '검붉은 톱날파', cd: 8, coef: 140, frac: 10, len: 420 },
      r: { name: '탐욕의 구체 : 데이터 압쇄', coef: 70, frac: 4, radius: 220, hits: 8, pull: 70 },
      assist: { name: '라이프 스틸', dur: 8, steal: 0.06 },
    },
    ares: {
      sin: true, name: '아레스', role: '광전사 · 파쇄', virtue: '분노', color: '#ff4a2a', weapon: '양손 대검',
      hp: 1350, atk: 120, def: 60, ultMax: 130,
      light: [
        { name: '혈흔 내려치기', coef: 70, frac: 4, range: 110, arc: 50, stun: 0.5 },
        { name: '광란', coef: 60, frac: 3, range: 120, arc: 120 },
        { name: '노이즈 올리기', coef: 75, frac: 4, range: 130, arc: 90, launch: true },
        { name: '단두대', coef: 140, frac: 12, len: 320, w: 60, wave: true },
      ],
      heavy: { name: '혈흔 파동', coef: 170, frac: 14, radius: 140, len: 360, w: 80 },
      jump: { coef: 110, frac: 6, radius: 140, stun: 0.8 },
      jumpHeavy: { coef: 180, frac: 12, radius: 180, stun: 1.2 },
      passive: { name: '핏빛 분노', dmgMax: 1.0, reduceMax: 0.4 },
      q: { name: '폭주 강화', cd: 14, dur: 8, reduce: 0.3, range: 1.4 },
      e: { name: '자폭파', cd: 12, coef: 320, frac: 20, radius: 200, hpCost: 0.12 },
      r: { name: '비극의 단두대 : 양분', coef: 700, frac: 35, len: 700, w: 110 },
      assist: { name: '광란의 버서커', dur: 8, atkUp: 0.35, defDown: 0.2 },
    },
    invidi: {
      sin: true, name: '인바디', role: '교란 · 암살', virtue: '질투', color: '#5ad18c', weapon: '대형 낫',
      hp: 950, atk: 108, def: 45, ultMax: 120,
      light: [
        { name: '위상 회전', coef: 45, frac: 2, range: 130, arc: 180 },
        { name: '질투', coef: 40, frac: 2, range: 90, arc: 60, knock: 60 },
        { name: '자루 습격', coef: 55, frac: 3, range: 110, arc: 80, defDown: 0.15 },
        { name: '목긋기', coef: 110, frac: 9, range: 120, arc: 120, stun: 1.2 },
      ],
      heavy: { name: '기습치기', coef: 160, frac: 12, range: 300, radius: 90 },
      jump: { coef: 80, frac: 3, radius: 130 },
      jumpHeavy: { coef: 130, frac: 8, radius: 160 },
      passive: { name: '정체성', per: 0.015, max: 20, keep: 5 },
      q: { name: '위상반전', cd: 9, coef: 120, frac: 10, range: 360, stun: 1.2 },
      e: { name: '그림자 봉인', cd: 11, coef: 90, frac: 8, radius: 170, seal: 4, slow: 4 },
      r: { name: '질투의 미러링 : 분신 무도회', coef: 55, frac: 3, radius: 260, clones: 6, hits: 12 },
      assist: { name: '교란 결계', dur: 8, miss: 0.4 },
    },
    asadi: {
      sin: true, name: '아사디', role: '환각 · 매혹', virtue: '색욕', color: '#c26bff', weapon: '가시 채찍 & 바늘',
      hp: 920, atk: 100, def: 42, ultMax: 115,
      light: [
        { name: '자색 비늘', coef: 30, frac: 1, needles: 2, range: 300 },
        { name: '가시 뿌리기', coef: 45, frac: 2, range: 150, arc: 110 },
        { name: '가시 자극', coef: 65, frac: 4, len: 200, w: 36 },
        { name: '매혹베기', coef: 80, frac: 7, range: 160, arc: 140, gas: true, knock: 50 },
      ],
      heavy: { name: '자색 향수 유포', radius: 220, charm: 2.5, coef: 60, frac: 4 },
      jump: { coef: 60, frac: 3, radius: 100, needles: 7 },
      jumpHeavy: { coef: 100, frac: 6, radius: 130, needles: 11 },
      passive: { name: '이성 마비', defDown: 0.2, dur: 4 },
      q: { name: '가시 덩굴', cd: 10, coef: 110, frac: 10, radius: 140, root: 2.5 },
      e: { name: '환각 연기', cd: 12, radius: 170, dur: 6, coef: 20 },
      r: { name: '비극의 가시발 : 연쇄 매혹', coef: 90, frac: 5, radius: 280, blasts: 8 },
      assist: { name: '정서 오염', dur: 8, radius: 260 },
    },
    luciel: {
      sin: true, name: '루시엘', role: '감속 · 시간 지연', virtue: '나태', color: '#a0a8b8', weapon: '시계 추 메이스',
      hp: 1100, atk: 100, def: 58, ultMax: 130,
      light: [
        { name: '나태의 추', coef: 55, frac: 3, range: 130, arc: 70 },
        { name: '시계 자루', coef: 45, frac: 2, range: 90, arc: 60, knock: 70, stun: 0.6 },
        { name: '정체 영역', coef: 60, frac: 4, radius: 100, field: 4 },
        { name: '침체 파동', coef: 100, frac: 9, radius: 170, slow: 5 },
      ],
      heavy: { name: '그레비티', coef: 90, frac: 10, radius: 160, dist: 130, dur: 5 },
      jump: { coef: 80, frac: 4, radius: 110, field: 4 },
      jumpHeavy: { coef: 120, frac: 8, radius: 140, field: 6 },
      passive: { name: '나태의 숲', radius: 150, slow: 0.3 },
      q: { name: '정지 구체', cd: 7, coef: 90, frac: 8, count: 3, slow: 4 },
      e: { name: '지연', cd: 13, radius: 260, seal: 5, freezeShots: 5 },
      r: { name: '세계 정지 : 나태자의 방관', coef: 900, frac: 40, stop: 3, radius: 900 },
      assist: { name: '시간 도둑', cut: 4 },
    },
    gula: {
      sin: true, name: '굴라', role: '포식 · 탱커', virtue: '폭식', color: '#d8a040', weapon: '클로 & 생체 입',
      hp: 1500, atk: 95, def: 75, ultMax: 130,
      light: [
        { name: '긁기', coef: 50, frac: 3, range: 90, arc: 70 },
        { name: '체중 박치기', coef: 60, frac: 4, len: 110, w: 60, lunge: 60, knock: 50, stun: 0.5 },
        { name: '기형의 입', coef: 75, frac: 5, range: 110, arc: 50, bite: true },
        { name: '침 뱉기', coef: 100, frac: 8, spit: true, knock: 80 },
      ],
      heavy: { name: '집어 삼키기', coef: 140, frac: 12, range: 160, arc: 90 },
      jump: { coef: 100, frac: 6, radius: 140, stun: 0.8 },
      jumpHeavy: { coef: 160, frac: 12, radius: 180, stun: 1.2 },
      passive: { name: '과식', hpPer: 0.03, defPer: 3, max: 10 },
      q: { name: '블랙홀', cd: 10, coef: 70, frac: 6, radius: 280, pull: 180 },
      e: { name: '침 분사', cd: 8, coef: 130, frac: 10, range: 220, arc: 70 },
      r: { name: '대식의 아가리 : 압쇄 포식', coef: 720, frac: 36, range: 300, arc: 120, pull: 140 },
      assist: { name: '식탄', count: 3, heal: 0.15 },
    },
  },
  // 파티 편성 : 이안(주인공·리더, 관측 담당)은 고정, 나머지 6명 중 2명 선택
  roster: ['ian', 'taron', 'serena', 'baren', 'kay', 'clea', 'noah'],
  sinRoster: ['baektor', 'ploto', 'ares', 'invidi', 'asadi', 'luciel', 'gula'],   // 7대죄 : 마스터 모드 전용
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
