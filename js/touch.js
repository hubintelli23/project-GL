// ============================================================
// touch.js — 휴대폰 터치 조작
// 왼쪽 엄지 : 가상 조이스틱(끝까지 밀면 대쉬)
// 오른쪽 엄지 : 화면 드래그 = 카메라 회전, 버튼 = 공격·스킬·점프·회피
// 왼쪽 위 파티 카드 : 짧게 = 태그, 0.5초 누르기 = 조력
// 버튼은 키보드/마우스와 같은 행동 이벤트를 GL.Input 에 넣는다.
// ============================================================
GL.Touch = {
  enabled: false,
  joy: { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0, mag: 0, sprint: false },
  cam: { id: null, lx: 0, ly: 0 },
  btnTouch: {},          // touch id → 버튼 id
  pressed: {},           // 버튼 id → true (그리기용)
  buttons: [],

  detect() {
    // 주소 뒤에 ?mobile=1 을 붙이면 휴대폰 조작 강제, ?mobile=0 이면 PC 조작 강제
    const q = (location.search || '').match(/mobile=([01])/);
    this.forced = q ? q[1] : null;
    if (q) return q[1] === '1';
    try { return matchMedia('(pointer: coarse)').matches && (('ontouchstart' in window) || navigator.maxTouchPoints > 0); }   // 터치 노트북은 마우스 조작 유지
    catch (e) { return false; }
  },

  init(canvas) {
    this.enabled = this.detect();
    this.canvas = canvas;
    // 감지를 못 했더라도 첫 터치가 들어오면 휴대폰 조작으로 전환
    window.addEventListener('touchstart', () => {
      if (!this.enabled && this.forced !== '0') { this.enabled = true; if (GL.Main.resize) GL.Main.resize(); }
    }, { capture: true, passive: true });
    const opt = { passive: false };
    canvas.addEventListener('touchstart', (e) => this.onStart(e), opt);
    canvas.addEventListener('touchmove', (e) => this.onMove(e), opt);
    canvas.addEventListener('touchend', (e) => this.onEnd(e), opt);
    canvas.addEventListener('touchcancel', (e) => this.onEnd(e), opt);
  },

  // 화면 크기에 맞춘 버튼 배치 (오른쪽 아래 기준)
  layout(cv) {
    const W = cv.width, H = cv.height;
    const s = GL.U.clamp(Math.min(W, H) / 400, 0.8, 1.4);
    this.s = s;
    const B = (id, ox, oy, r, label, from = 'br') => {
      const x = from === 'tr' ? W + ox * s : W + ox * s, y = from === 'tr' ? oy * s : H + oy * s;
      return { id, x, y, r: r * s, label };
    };
    const list = [
      B('attack', -100, -95, 48, '공격'),
      B('jump', -215, -50, 30, '점프'),
      B('dodge', -40, -185, 28, '회피'),
      B('q', -210, -135, 30, 'Q'),
      B('e', -165, -205, 30, 'E'),
      B('r', -95, -235, 32, 'R'),
      B('observe', -40, -275, 28, '관측'),
      B('pause', -32, 32, 20, 'Ⅱ', 'tr'),
      B('map', -80, 32, 20, '지도', 'tr'),
    ];
    if (GL.Stage.nearInteractable && GL.Stage.nearInteractable()) list.push(B('interact', -300, -60, 30, 'F'));
    this.buttons = list;
    return list;
  },

  hitButton(x, y) {
    for (const b of this.buttons) if (Math.hypot(x - b.x, y - b.y) <= b.r + 8) return b;
    return null;
  },
  hitParty(x, y) {
    const R = GL.UI.partyRects || [];
    for (let i = 0; i < R.length; i++) { const r = R[i]; if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i; }
    return -1;
  },

  tryFullscreen() {
    if (this._fsTried) return; this._fsTried = true;
    try {
      const el = document.documentElement;
      const r = el.requestFullscreen ? el.requestFullscreen() : (el.webkitRequestFullscreen && el.webkitRequestFullscreen());
      if (r && r.then) r.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
    } catch (e) { /* 전체화면을 지원하지 않는 기기 */ }
  },

  onStart(e) {
    e.preventDefault();
    const I = GL.Input, st = GL.Main.state;
    this.tryFullscreen();
    // 세 손가락 탭 = 마스터 모드 진입 / 나가기
    if (e.touches.length >= 3) { I.push('master'); return; }
    if (st !== 'play') {   // 타이틀·일시정지·결과 화면·마스터 패널 : 탭 = 진행 / 버튼 누르기
      const t0 = e.changedTouches[0]; I.mouse.x = t0.clientX; I.mouse.y = t0.clientY;
      I.push('click', { x: t0.clientX, y: t0.clientY }); return;
    }
    this.layout(this.canvas);
    for (const t of e.changedTouches) {
      const x = t.clientX, y = t.clientY;
      if (GL.Master.badgeHit(x, y)) { I.push('masterPanel'); continue; }   // MASTER 표시 탭 = 패널
      const b = this.hitButton(x, y);
      if (b) { this.btnTouch[t.identifier] = b.id; this.pressed[b.id] = true; if (b.id === 'r') I.onKeyDown('KeyR'); else this.press(b.id); continue; }
      const pi = this.hitParty(x, y);
      if (pi >= 0) { this.btnTouch[t.identifier] = 'party' + pi; this.pressed['party' + pi] = true; I.onKeyDown('Digit' + (pi + 1)); continue; }
      if (x < this.canvas.width * 0.45 && !this.joy.active) {
        Object.assign(this.joy, { active: true, id: t.identifier, ox: x, oy: y, x: 0, y: 0, mag: 0, sprint: false });
      } else if (this.cam.id === null) {
        this.cam = { id: t.identifier, lx: x, ly: y };
      }
    }
  },

  onMove(e) {
    e.preventDefault();
    const I = GL.Input;
    for (const t of e.changedTouches) {
      if (this.joy.active && t.identifier === this.joy.id) {
        const R = 60 * (this.s || 1);
        const dx = t.clientX - this.joy.ox, dy = t.clientY - this.joy.oy, d = Math.hypot(dx, dy);
        this.joy.mag = d / R;
        const k = d > R ? R / d : 1;
        this.joy.x = dx * k / R; this.joy.y = dy * k / R;
        this.joy.sprint = d > R * 1.3;          // 원 밖까지 밀면 대쉬
      } else if (t.identifier === this.cam.id) {
        I.mouse.dx += (t.clientX - this.cam.lx) * 1.6;
        I.mouse.dy += (t.clientY - this.cam.ly) * 1.2;
        this.cam.lx = t.clientX; this.cam.ly = t.clientY;
      }
    }
  },

  onEnd(e) {
    e.preventDefault();
    const I = GL.Input;
    for (const t of e.changedTouches) {
      const id = this.btnTouch[t.identifier];
      if (id) {
        delete this.btnTouch[t.identifier]; delete this.pressed[id];
        if (id === 'attack') I.leftUp();
        if (id === 'r') I.onKeyUp('KeyR');   // 짧게 = 궁극기, 길게 = 인과 역류
        if (id.startsWith('party')) I.onKeyUp('Digit' + (parseInt(id.slice(5), 10) + 1));
      }
      if (this.joy.active && t.identifier === this.joy.id) Object.assign(this.joy, { active: false, id: null, x: 0, y: 0, mag: 0, sprint: false });
      if (t.identifier === this.cam.id) this.cam.id = null;
    }
  },

  press(id) {
    const I = GL.Input;
    switch (id) {
      case 'attack': I.leftDown(false); break;
      // 공중에서 점프 버튼 = 점프 강공격 (PC의 Ctrl + 좌클릭)
      case 'jump': I.push(I.isAirborne() ? 'jumpHeavy' : 'jump'); break;
      case 'dodge': I.push('dodge'); break;
      case 'q': I.push('q'); break;
      case 'e': I.push('e'); break;
      case 'r': I.push('r'); break;
      case 'observe': I.push('observe'); break;
      case 'interact': I.push('interact'); break;
      case 'pause': I.push('pause'); break;
      case 'map': I.push('map'); break;
    }
  },

  // ---------- 그리기 ----------
  draw(ctx, cv) {
    if (!this.enabled || GL.Main.state !== 'play') return;
    const list = this.layout(cv), ch = GL.Party.active(), W = GL.World, p = GL.Party.player, R = GL.CONFIG.rules;
    ctx.save();
    // 조이스틱
    const s = this.s, jr = 60 * s;
    if (this.joy.active) {
      const j = this.joy;
      ctx.strokeStyle = j.sprint ? 'rgba(255,224,102,0.8)' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(10,20,40,0.35)';
      ctx.beginPath(); ctx.arc(j.ox, j.oy, jr, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.fillStyle = j.sprint ? 'rgba(255,224,102,0.85)' : 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.arc(j.ox + j.x * jr, j.oy + j.y * jr, 24 * s, 0, 6.283); ctx.fill();
      if (j.sprint) { ctx.font = `bold ${12 * s}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('대쉬', j.ox, j.oy - jr - 8); }
    } else {
      // 처음 위치 안내
      const gx = cv.width * 0.16, gy = cv.height - 110 * s;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(gx, gy, jr, 0, 6.283); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = `${11 * s}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillText('이동', gx, gy + 4);
    }
    // 버튼
    for (const b of list) {
      let cd = 0, cdMax = 0, ready = true, color = '#e8f1ff', label = b.label;
      if (ch && (b.id === 'q' || b.id === 'e')) { cd = ch.cd[b.id]; cdMax = ch.cfg[b.id].cd; ready = cd <= 0; color = ch.color; }
      if (ch && b.id === 'r') { ready = ch.ult >= ch.ultMax; color = '#ffe066'; }
      if (b.id === 'observe') { const o = W.observe; cd = o.on ? 0 : o.cd; cdMax = R.observeCooldown; ready = o.on || o.cd <= 0; color = '#3fe0a8'; if (o.on) label = `관측 ${o.t.toFixed(0)}`; }
      if (b.id === 'dodge') { ready = p.dodgeCharges > 0; label = `회피 ${p.dodgeCharges}`; }
      if (b.id === 'jump' && GL.Party.isAirborne()) { label = '낙하'; color = '#ffffff'; }
      if (b.id === 'attack' && GL.Party.isAirborne()) label = '점프 공격';
      const down = this.pressed[b.id];
      ctx.globalAlpha = 1;
      ctx.fillStyle = down ? 'rgba(60,90,140,0.75)' : 'rgba(8,14,26,0.55)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill();
      if (cd > 0 && cdMax > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + 6.283 * (cd / cdMax)); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = ready ? color : 'rgba(120,150,190,0.4)'; ctx.lineWidth = b.id === 'attack' ? 3 : 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.stroke();
      if (b.id === 'r' && ch) { // 궁극기 게이지 테두리
        ctx.strokeStyle = '#7aa7ff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 4, -Math.PI / 2, -Math.PI / 2 + 6.283 * (ch.ult / ch.ultMax)); ctx.stroke();
      }
      if (b.id === 'attack') { const cr = GL.Input.chargeRatio(); if (cr > 0.1) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 5, -Math.PI / 2, -Math.PI / 2 + 6.283 * cr); ctx.stroke(); } }
      ctx.fillStyle = ready ? color : '#6b7c93';
      ctx.textAlign = 'center';
      ctx.font = `bold ${(b.r > 40 ? 15 : b.r > 25 ? 13 : 11) * (b.label.length > 2 ? 0.9 : 1.15)}px sans-serif`;
      ctx.fillText(cd > 0 ? cd.toFixed(0) : label, b.x, b.y + 5);
      if (ch && (b.id === 'q' || b.id === 'e' || b.id === 'r')) {
        ctx.font = `${9 * s}px sans-serif`; ctx.fillStyle = '#c9d6e6';
        const nm = ch.cfg[b.id].name; ctx.fillText(nm.length > 6 ? nm.slice(0, 6) + '…' : nm, b.x, b.y + b.r + 11 * s);
      }
    }
    ctx.restore();
  },

  // 세로 화면 안내
  drawRotate(ctx, cv) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText('휴대폰을 가로로 돌려주세요', cv.width / 2, cv.height / 2 - 10);
    ctx.fillStyle = '#9fb3c8'; ctx.font = '14px sans-serif';
    ctx.fillText('이클립스 세븐은 가로 화면에서 플레이합니다', cv.width / 2, cv.height / 2 + 20);
    ctx.strokeStyle = '#3fe0a8'; ctx.lineWidth = 3;
    ctx.strokeRect(cv.width / 2 - 22, cv.height / 2 - 110, 44, 72);
  },
};
