// ============================================================
// input.js — 공통 조작 체계 + 0.5초 홀딩 판정 (키보드·마우스)
// 키 입력을 '행동 이벤트'로 바꿔 GL.Input.events 에 쌓는다.
// ============================================================
GL.Input = {
  keys: {},            // 눌려 있는 키 (e.code)
  events: [],          // 이번 프레임에 발생한 행동
  mouse: { x: 0, y: 0, dx: 0, dy: 0, left: false, right: false },
  locked: false,       // 포인터 잠금(마우스로 카메라 회전)
  _left: null,         // { t, heavyFired, air }
  _num: {},            // 숫자키 홀딩 상태 { Digit1: { t, fired } }
  isAirborne: () => false, // main 에서 연결

  init(canvas) {
    const prevent = ['Tab', 'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'Escape'];
    window.addEventListener('keydown', (e) => {
      if (prevent.includes(e.code) || e.code.startsWith('Digit')) e.preventDefault();
      if (e.repeat) return;
      this.keys[e.code] = true;
      this.onKeyDown(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.onKeyUp(e.code);
    });
    window.addEventListener('blur', () => { this.keys = {}; this._left = null; this._num = {}; this._rHold = null; this.mouse.right = false; });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      // 마우스 이동 = 카메라 회전 (잠금 중일 때, 또는 잠금이 막힌 환경에선 마우스 이동량 그대로)
      if (GL.Main.state === 'play') { this.mouse.dx += e.movementX || 0; this.mouse.dy += e.movementY || 0; }
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked && GL.Main.state === 'play') GL.Main.state = 'pause';   // Esc로 잠금이 풀리면 일시정지
    });
    this.canvas = canvas;
    canvas.addEventListener('mousedown', (e) => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      if (GL.Touch && GL.Touch.enabled) return;   // 휴대폰은 touch.js 가 처리
      if (!this.locked && GL.Main.state === 'play') this.lock();
      if (e.button === 0) {
        this.push('click', { x: e.clientX, y: e.clientY });
        this.leftDown(this.keys.ControlLeft || this.keys.ControlRight || e.ctrlKey);
      } else if (e.button === 2) {
        this.mouse.right = true; // 우클릭 = 대쉬(누르고 있는 동안)
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (GL.Touch && GL.Touch.enabled) return;
      if (e.button === 0) {
        this.leftUp();
      } else if (e.button === 2) {
        this.mouse.right = false;
      }
    });
  },

  // 공격 버튼 누름/뗌 (마우스 좌클릭, 휴대폰 공격 버튼 공용)
  leftDown(ctrl) {
    this.mouse.left = true;
    if (this.isAirborne()) {
      // 공중 : 좌클릭 = 점프 공격, Ctrl + 좌클릭 = 점프 강공격
      this.push(ctrl ? 'jumpHeavy' : 'jumpAtk');
      this._left = { t: 0, t0: performance.now(), heavyFired: true, air: true };
    } else {
      this._left = { t: 0, t0: performance.now(), heavyFired: false, air: false };
    }
  },
  leftUp() {
    this.mouse.left = false;
    if (this._left && !this._left.heavyFired) this.push('light');   // 0.5초 전에 떼면 평타
    this._left = null;
  },

  onKeyDown(code) {
    const map = {
      Space: 'jump', ShiftLeft: 'dodge', ShiftRight: 'dodge',
      KeyQ: 'q', KeyE: 'e', Tab: 'observe',   // R 은 아래에서 짧게/길게 구분
      KeyF: 'interact', KeyM: 'map', Escape: 'pause', Enter: 'confirm',
      Backquote: 'master', KeyH: 'masterPanel',   // 마스터 모드 : ` 진입/나가기, H 패널
      KeyV: 'vibe',                                // 진동 켜기/끄기
    };
    if (map[code]) this.push(map[code]);
    // R : 짧게 = 궁극기, 0.5초 길게 = 이안 인과 역류(자의 발동)
    if (code === 'KeyR') { this._rHold = { t0: performance.now(), fired: false }; return; }
    if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') {
      this._num[code] = { t: 0, t0: performance.now(), fired: false };
    }
  },

  onKeyUp(code) {
    if (code === 'KeyR' && this._rHold) { if (!this._rHold.fired) this.push('r'); this._rHold = null; return; }
    const n = this._num[code];
    if (n) {
      // 0.5초 전에 떼면 태그
      if (!n.fired) this.push('tag', parseInt(code.slice(5), 10) - 1);
      delete this._num[code];
    }
  },

  update(dt) {
    const hold = GL.CONFIG.rules.holdTime;
    // 좌클릭 0.5초 홀딩 = 강공격
    // 홀딩은 실제 시간으로 잼 (느린 기기에서도 0.5초가 0.5초)
    const now = performance.now();
    if (this._left && !this._left.heavyFired) {
      this._left.t = (now - this._left.t0) / 1000;
      if (this._left.t >= hold) { this._left.heavyFired = true; this.push('heavy'); }
    }
    if (this._rHold && !this._rHold.fired && (now - this._rHold.t0) / 1000 >= hold) { this._rHold.fired = true; this.push('rHold'); }
    // 숫자키 0.5초 홀딩 = 조력 스킬
    for (const code in this._num) {
      const n = this._num[code];
      n.t = (now - n.t0) / 1000;
      if (!n.fired && n.t >= hold) { n.fired = true; this.push('assist', parseInt(code.slice(5), 10) - 1); }
    }
  },

  // 강공격 차징 진행도(0~1) — UI 표시용
  chargeRatio() {
    if (!this._left || this._left.air) return 0;
    return Math.min(1, (performance.now() - this._left.t0) / 1000 / GL.CONFIG.rules.holdTime);
  },

  lock() {
    try {
      const r = this.canvas.requestPointerLock && this.canvas.requestPointerLock();
      if (r && r.catch) r.catch(() => {});
    } catch (e) { /* 잠금이 막힌 환경: 마우스 이동량으로만 회전 */ }
  },
  unlock() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} },

  push(type, value) { this.events.push({ type, value }); },
  consume() { const ev = this.events; this.events = []; return ev; },
};
