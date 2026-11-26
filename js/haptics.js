// ============================================================
// haptics.js — 휴대폰 진동
// 화면 흔들림 / 피격 / 패링 / 그로기 / 궁극기 / 전투 불능 에 맞춰 진동
// · 안드로이드 : Vibration API (크롬·삼성 인터넷). 짧은 진동은 기기에 따라 안 느껴져서 최소 35ms
// · 아이폰 : 사파리는 진동 API 자체가 없음 → iOS 18 이상의 '스위치' 입력 햅틱으로 대체 (짧은 틱만 가능, 길이·패턴 없음)
//            시스템 햅틱은 화면을 만지는 순간에만 나는 경우가 많아, 못 낸 진동은 다음 터치 때 바로 냄
// · Claude 아티팩트 화면처럼 다른 사이트 안에 끼워진(iframe) 페이지에서는 브라우저가 진동을 막음
//   → 한 파일 HTML을 직접 열거나 GitHub Pages 주소로 접속하면 동작
// · 일시정지 화면 : 진동 켜기/끄기 · 진동 테스트(안 될 때 이유 표시) (PC는 V 키)
// ============================================================
GL.Haptics = {
  supported: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',
  ios: typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)),
  framed: (() => { try { return window.self !== window.top; } catch (e) { return true; } })(),
  enabled: true,
  strength: 1.3,        // 진동 길이 배율 (안드로이드)
  minMs: 35,            // 이보다 짧으면 많은 기기에서 안 느껴짐
  _last: 0,
  _prevShake: 0,
  _pending: 0,          // iOS : 다음 터치 때 낼 틱 수
  lastResult: '',       // 진동 테스트 결과 문구

  init() {
    try { const v = localStorage.getItem('gl_haptics'); if (v !== null) this.enabled = v === '1'; } catch (e) { /* 저장 불가 환경 */ }
    if (this.ios) this.setupIOS();
  },
  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem('gl_haptics', this.enabled ? '1' : '0'); } catch (e) {}
    if (this.enabled) this.play(60, true);
    return this.enabled;
  },
  touchDevice() { return (GL.Touch && GL.Touch.enabled) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && /Android|iPhone|iPad|iPod|Mobile/.test(navigator.userAgent)); },
  usable() { return this.supported || this.ios; },
  active() { return this.usable() && this.enabled && this.touchDevice(); },

  // ---------- iOS : 숨긴 스위치 체크박스를 눌러 시스템 햅틱을 냄 (iOS 18+) ----------
  setupIOS() {
    if (this._label || typeof document === 'undefined') return;
    const id = 'gl-haptic-switch';
    const input = document.createElement('input');
    input.type = 'checkbox'; input.id = id; input.setAttribute('switch', '');
    const label = document.createElement('label');
    label.htmlFor = id; label.setAttribute('aria-hidden', 'true');
    for (const el of [input, label]) Object.assign(el.style, { position: 'fixed', left: '-100px', top: '0', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' });
    document.body.appendChild(input); document.body.appendChild(label);
    this._label = label;
    // 화면을 만질 때 밀린 틱을 냄 (사용자 동작 안에서만 햅틱이 나는 경우 대비)
    const flush = () => { if (this._pending > 0) { const n = this._pending; this._pending = 0; this.tickIOS(n); } };
    window.addEventListener('touchstart', flush, { passive: true, capture: true });
    window.addEventListener('touchend', flush, { passive: true, capture: true });
  },
  tickIOS(n = 1) {
    if (!this._label) return false;
    for (let i = 0; i < Math.min(3, n); i++) setTimeout(() => { try { this._label.click(); } catch (e) {} }, i * 90);
    return true;
  },
  inGesture() { const ua = navigator.userActivation; return !ua || ua.isActive; },

  // pattern : 숫자(ms) 또는 [진동, 쉼, 진동, …]
  play(pattern, force) {
    if (!this.active()) return false;
    const now = performance.now();
    if (!force && now - this._last < 70) return false;     // 너무 잦은 진동 방지
    this._last = now;
    if (!this.supported && this.ios) {                       // 아이폰 : 패턴의 진동 구간 수만큼 짧은 틱
      const n = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1;
      if (this.inGesture()) return this.tickIOS(n);
      this._pending = Math.min(3, Math.max(this._pending, n)); return true;
    }
    const len = (v) => Math.max(this.minMs, Math.round(v * this.strength));
    const p = Array.isArray(pattern) ? pattern.map((v, i) => (i % 2 ? v : len(v))) : len(pattern);
    try { return navigator.vibrate(p); } catch (e) { return false; }
  },

  // ---------- 진동 테스트 (일시정지 화면 버튼) : 안 될 때 이유를 알려줌 ----------
  test() {
    if (!this.supported && !this.ios) return (this.lastResult = '이 브라우저는 진동을 지원하지 않음');
    if (!this.enabled) return (this.lastResult = '진동이 꺼져 있음 — 먼저 켜기');
    if (this.ios) {
      this.tickIOS(2);
      return (this.lastResult = '아이폰 : 진동 API 없음 → 시스템 햅틱 틱으로 대체 (iOS 18 이상, 설정 > 사운드 및 햅틱 > 시스템 햅틱 켜기)');
    }
    let ok = false;
    try { ok = navigator.vibrate([120, 80, 200]); } catch (e) { ok = false; }
    if (this.framed) return (this.lastResult = ok ? '진동 요청됨 — 안 울리면 아티팩트 화면이 막는 것 → 한 파일 HTML을 직접 열기' : '아티팩트(다른 사이트 안) 화면이라 브라우저가 진동을 막음 → 한 파일 HTML을 직접 열기');
    return (this.lastResult = ok ? '진동 요청 성공 — 안 울리면 휴대폰 무음·방해 금지·절전 모드 또는 터치 진동 설정 확인' : '브라우저가 진동을 거부함 — 화면을 한 번 탭한 뒤 다시 시도');
  },

  // ---------- 화면 흔들림 연동 ----------
  // 매 프레임 호출 : 흔들림이 새로 커졌을 때 그 세기만큼 진동
  watchShake(shake) {
    if (shake > this._prevShake + 1.5) this.play(GL.U.clamp(Math.round(shake * 5), 35, 90));
    this._prevShake = shake;
  },

  // ---------- 상황별 진동 ----------
  hurt(dmg, maxHp) {
    const r = dmg / Math.max(1, maxHp);
    if (r >= 0.2) this.play([80, 50, 120], true);       // 큰 피격
    else if (r >= 0.08) this.play(60, true);
    else this.play(40, true);
  },
  parry() { this.play([30, 40, 50], true); },          // 퍼펙트 가드
  groggy() { this.play([35, 45, 35, 45, 60], true); }, // 적 그로기
  ult() { this.play([40, 40, 100], true); },           // 궁극기
  down() { this.play([110, 70, 110], true); },         // 파티원 전투 불능
  gameOver() { this.play([150, 80, 150, 80, 250], true); },
  win() { this.play([50, 60, 50, 60, 50, 60, 200], true); },
};
