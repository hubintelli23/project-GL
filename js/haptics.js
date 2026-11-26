// ============================================================
// haptics.js — 휴대폰 진동 (Vibration API)
// 화면 흔들림 / 피격 / 패링 / 그로기 / 궁극기 / 전투 불능 에 맞춰 진동
// · 안드로이드 크롬·삼성 인터넷 등에서 동작. 아이폰(사파리)은 진동 API를 지원하지 않아 조용히 무시됨
// · Claude 아티팩트 화면처럼 다른 사이트 안에 끼워진(iframe) 페이지에서는 브라우저가 진동을 막음
//   → 한 파일 HTML을 직접 열거나 GitHub Pages 주소로 접속하면 동작
// · 일시정지 화면에서 켜고 끌 수 있음 (PC는 V 키)
// ============================================================
GL.Haptics = {
  supported: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',
  enabled: true,
  strength: 1,          // 진동 세기 배율 (길이에 곱함)
  _last: 0,
  _prevShake: 0,

  init() {
    try { const v = localStorage.getItem('gl_haptics'); if (v !== null) this.enabled = v === '1'; } catch (e) { /* 저장 불가 환경 */ }
  },
  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem('gl_haptics', this.enabled ? '1' : '0'); } catch (e) {}
    if (this.enabled) this.play(40, true);
    return this.enabled;
  },
  active() { return this.supported && this.enabled && GL.Touch && GL.Touch.enabled; },

  // pattern : 숫자(ms) 또는 [진동, 쉼, 진동, …]
  play(pattern, force) {
    if (!this.active()) return false;
    const now = performance.now();
    if (!force && now - this._last < 70) return false;     // 너무 잦은 진동 방지
    this._last = now;
    const p = Array.isArray(pattern) ? pattern.map((v, i) => (i % 2 ? v : Math.round(v * this.strength))) : Math.round(pattern * this.strength);
    try { navigator.vibrate(p); return true; } catch (e) { return false; }
  },

  // ---------- 화면 흔들림 연동 ----------
  // 매 프레임 호출 : 흔들림이 새로 커졌을 때 그 세기만큼 진동
  watchShake(shake) {
    if (shake > this._prevShake + 1.5) this.play(GL.U.clamp(Math.round(shake * 4), 12, 70));
    this._prevShake = shake;
  },

  // ---------- 상황별 진동 ----------
  hurt(dmg, maxHp) {
    const r = dmg / Math.max(1, maxHp);
    if (r >= 0.2) this.play([60, 40, 90], true);        // 큰 피격
    else if (r >= 0.08) this.play(45, true);
    else this.play(25, true);
  },
  parry() { this.play([18, 30, 40], true); },          // 퍼펙트 가드
  groggy() { this.play([25, 40, 25, 40, 50], true); }, // 적 그로기
  ult() { this.play([30, 30, 80], true); },            // 궁극기
  down() { this.play([90, 60, 90], true); },           // 파티원 전투 불능
  gameOver() { this.play([150, 80, 150, 80, 250], true); },
  win() { this.play([40, 60, 40, 60, 40, 60, 200], true); },
};
