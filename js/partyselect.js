// ============================================================
// partyselect.js — 파티 편성 화면
// 기본 : 이안(주인공 · 7대선 리더 · 관측 담당)은 1번 자리에 고정, 나머지 6명 중 2명을 골라 3인 파티
// 마스터 모드 : 7대죄 7명까지 열려 14명 중 자유롭게 3명 (이안 고정 해제, 고른 순서 = 1·2·3번 자리)
// 고른 순서 = 숫자키 태그 순서. 마지막 편성은 기기에 저장 (기본 / 마스터 따로)
// ============================================================
GL.PartySelect = {
  picks: ['baren', 'kay'],          // 기본 편성 : 이안 다음 2·3번 자리
  mpicks: ['ian', 'baren', 'kay'],  // 마스터 편성 : 1·2·3번 자리 전부
  cards: [], buttons: [],
  msg: '', msgT: 0,

  master() { return GL.Master && GL.Master.active; },
  init() {
    const ok = (v, n, allowSin) => Array.isArray(v) && v.length === n && v.every(id => GL.CONFIG.chars[id] && (allowSin || !GL.CONFIG.chars[id].sin)) && new Set(v).size === n;
    try {
      const v = JSON.parse(localStorage.getItem('gl_party') || 'null');
      if (ok(v, 2, false) && !v.includes('ian')) this.picks = v;
      const m = JSON.parse(localStorage.getItem('gl_party_master') || 'null');
      if (ok(m, 3, true)) this.mpicks = m;
    } catch (e) { /* 저장 불가 환경 */ }
  },
  onMaster(on) {
    if (on) this.say('마스터 모드 — 7대죄 플레이 해금 · 14명 중 자유롭게 3명 (이안 고정 해제)');
    else this.say('마스터 모드 종료 — 7대선 편성 (이안 고정)');
  },
  say(s) { this.msg = s; this.msgT = 3; },
  chosen() {
    if (this.master()) return this.mpicks.length === 3 ? this.mpicks.slice() : null;
    return this.picks.length === 2 ? ['ian', ...this.picks] : GL.CONFIG.partyOrder;
  },
  save() {
    try {
      if (this.master()) localStorage.setItem('gl_party_master', JSON.stringify(this.mpicks));
      else localStorage.setItem('gl_party', JSON.stringify(this.picks));
    } catch (e) {}
  },

  toggle(id) {
    if (this.master()) {
      const i = this.mpicks.indexOf(id);
      if (i >= 0) this.mpicks.splice(i, 1);
      else { if (this.mpicks.length >= 3) this.mpicks.shift(); this.mpicks.push(id); }
      return;
    }
    if (GL.CONFIG.chars[id].sin) return;
    if (id === 'ian') { this.say('이안은 7대선 리더 · 관측 담당이라 항상 1번 자리에 고정 (마스터 모드에서는 해제)'); return; }
    const i = this.picks.indexOf(id);
    if (i >= 0) this.picks.splice(i, 1);
    else { if (this.picks.length >= 2) this.picks.shift(); this.picks.push(id); }
  },
  need() { return this.master() ? 3 - this.mpicks.length : 2 - this.picks.length; },

  // ---------- 클릭 / 탭 ----------
  click(x, y) {
    for (const b of this.buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (b.id === 'go') this.start();
        else if (b.id === 'default') { if (this.master()) this.mpicks = ['ian', 'baren', 'kay']; else this.picks = ['baren', 'kay']; }
        else if (b.id === 'sins') this.mpicks = ['baektor', 'ares', 'luciel'];
        else if (b.id === 'back') GL.Main.state = 'title';
        return;
      }
    }
    for (const c of this.cards) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) { this.toggle(c.id); return; }
  },
  start() {
    if (this.need() > 0) { this.say(this.master() ? '3명을 골라주세요' : '함께할 동료 2명을 골라주세요'); return; }
    this.save();
    GL.Main.newGame(this.chosen());
  },
  slotOf(id) {
    if (this.master()) { const i = this.mpicks.indexOf(id); return i >= 0 ? i + 1 : 0; }
    if (id === 'ian') return 1;
    const i = this.picks.indexOf(id); return i >= 0 ? i + 2 : 0;
  },

  // ---------- 그리기 ----------
  draw(ctx, cv) {
    const touch = GL.Touch.enabled, W = cv.width, H = cv.height, M = this.master();
    const k = touch ? Math.min(1.2, H / 400) : 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = M ? '#0b0509' : '#05070d'; ctx.fillRect(0, 0, W, H);
    const t = performance.now() / 1000;
    ctx.strokeStyle = M ? 'rgba(255,60,90,0.08)' : 'rgba(63,224,168,0.08)';
    for (let i = 0; i < 30; i++) { const x = (i * 131 + t * 20) % W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 160, H); ctx.stroke(); }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff'; ctx.font = `bold ${touch ? 20 * k : 30}px sans-serif`;
    ctx.fillText(M ? '파티 편성 · MASTER' : '파티 편성', W / 2, touch ? 24 * k : 44);
    ctx.fillStyle = M ? '#ff8aa0' : '#9fb3c8'; ctx.font = `${touch ? 11 * k : 14}px sans-serif`;
    ctx.fillText(M ? '마스터 모드 : 7대선 + 7대죄 14명 중 자유롭게 3명  ·  고른 순서가 1 · 2 · 3번 자리  ·  이안이 없으면 소거·인과 역류 없음'
      : '이안(리더 · 관측)은 고정  ·  함께할 동료 2명을 고르세요  ·  고른 순서가 2번 · 3번 자리', W / 2, touch ? 41 * k : 68);
    // 마스터 모드 안내 (타이틀에서 진입 방법)
    ctx.font = `bold ${touch ? 10 * k : 12}px sans-serif`; ctx.fillStyle = M ? 'rgba(255,60,90,0.9)' : 'rgba(255,90,120,0.75)';
    ctx.textAlign = 'right';
    ctx.fillText(M ? (touch ? '세 손가락 탭 = 마스터 모드 끄기' : '` = 마스터 모드 끄기') : (touch ? '세 손가락 탭 = 마스터 모드 (7대죄 해금)' : '` = 마스터 모드 (7대죄 해금)'), W - 14, touch ? 14 * k : 24);

    this.cards = [];
    let rowsBottom;
    if (!M) {
      // 카드 7장 : 4 + 3
      const ids = GL.CONFIG.roster, cols = 4;
      const gap = touch ? 8 : 14, cw = Math.min(touch ? 190 : 250, (W - 40 - gap * (cols - 1)) / cols);
      const ch = touch ? Math.min(118 * k, (H - 150 * k) / 2 - gap) : 196;
      const top = touch ? 56 * k : 96;
      ids.forEach((id, i) => {
        const row = i < cols ? 0 : 1, col = row ? i - cols : i, n = row ? ids.length - cols : cols;
        const rowW = n * cw + (n - 1) * gap, x = (W - rowW) / 2 + col * (cw + gap), y = top + row * (ch + gap);
        this.cards.push({ id, x, y, w: cw, h: ch });
        this.card(ctx, id, x, y, cw, ch, touch, k, 'full');
      });
      rowsBottom = top + 2 * (ch + gap);
    } else {
      // 마스터 : 7대선 한 줄 + 7대죄 한 줄
      const cols = 7, gap = touch ? 5 : 10, lab = touch ? 14 * k : 20;
      const cw = (W - (touch ? 16 : 40) - gap * (cols - 1)) / cols;
      const ch = touch ? Math.min(108 * k, (H - 140 * k) / 2 - lab - gap) : Math.min(210, (H - 230) / 2 - lab);
      const top = touch ? 50 * k : 86;
      [['7대선 (The 7 Virtues)', GL.CONFIG.roster, '#3fe0a8'], ['7대죄 (The 7 Sins) — 원래 플레이 불가 적대 세력', GL.CONFIG.sinRoster, '#ff5a78']].forEach(([title, ids, col], r) => {
        const y0 = top + r * (ch + lab + gap);
        ctx.textAlign = 'left'; ctx.fillStyle = col; ctx.font = `bold ${touch ? 10 * k : 13}px sans-serif`;
        ctx.fillText(title, (W - (cols * cw + (cols - 1) * gap)) / 2, y0 + lab * 0.7);
        ids.forEach((id, i) => {
          const x = (W - (cols * cw + (cols - 1) * gap)) / 2 + i * (cw + gap), y = y0 + lab;
          this.cards.push({ id, x, y, w: cw, h: ch });
          this.card(ctx, id, x, y, cw, ch, touch, k, 'compact');
        });
      });
      rowsBottom = top + 2 * (ch + lab + gap);
    }

    // 파티 미리보기 + 버튼
    const party = M ? this.mpicks : ['ian', ...this.picks], total = 3, by = rowsBottom + (touch ? 2 : 10);
    ctx.textAlign = 'left'; ctx.font = `bold ${touch ? 12 * k : 15}px sans-serif`;
    let px = W / 2 - (touch ? 320 * k : 420);
    for (let i = 0; i < total; i++) {
      const id = party[i], c = id && GL.CONFIG.chars[id];
      ctx.fillStyle = c ? c.color : '#6b7c93'; ctx.fillText(`${i + 1} ${c ? c.name : '?'}`, px, by + 16 * (touch ? k : 1)); px += touch ? 70 * k : 90;
    }
    const bh = touch ? 30 * k : 40, bw = touch ? 104 * k : 150;
    const bx = W / 2 + (touch ? -40 * k : -20);
    const ready = this.need() <= 0;
    this.buttons = [
      { id: 'default', label: '기본 파티', x: bx, y: by - 4, w: bw * 0.8, h: bh },
    ];
    let nx = bx + bw * 0.85;
    if (M) { this.buttons.push({ id: 'sins', label: '7대죄 파티', x: nx, y: by - 4, w: bw * 0.8, h: bh }); nx += bw * 0.85; }
    this.buttons.push({ id: 'go', label: ready ? '출격  (Enter)' : (M ? `${this.need()}명 더 고르세요` : '2명을 고르세요'), x: nx, y: by - 4, w: bw * 1.2, h: bh });
    if (!touch) this.buttons.push({ id: 'back', label: 'Esc 타이틀', x: 20, y: H - 54, w: 120, h: 34 });
    for (const b of this.buttons) {
      const ok = b.id !== 'go' || ready;
      ctx.fillStyle = b.id === 'go' ? (ok ? (M ? 'rgba(255,60,90,0.85)' : 'rgba(63,224,168,0.85)') : 'rgba(60,70,90,0.8)') : 'rgba(30,40,60,0.9)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = ok ? (M ? '#ff5a78' : '#3fe0a8') : '#6b7c93'; ctx.lineWidth = 1.5; ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.id === 'go' && ok ? '#05070d' : '#e8f1ff'; ctx.textAlign = 'center'; ctx.font = `bold ${touch ? 12 * k : 15}px sans-serif`;
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 5);
    }
    // 안내 문구
    if (this.msgT > 0) {
      this.msgT -= 1 / 60;
      ctx.font = `bold ${touch ? 12 * k : 15}px sans-serif`; ctx.textAlign = 'center';
      const tw = ctx.measureText(this.msg).width + 30, yy = H / 2 - 20;
      ctx.fillStyle = 'rgba(5,7,13,0.92)'; ctx.fillRect(W / 2 - tw / 2, yy - 22, tw, 34);
      ctx.strokeStyle = M ? '#ff5a78' : '#3fe0a8'; ctx.strokeRect(W / 2 - tw / 2, yy - 22, tw, 34);
      ctx.fillStyle = '#ffffff'; ctx.fillText(this.msg, W / 2, yy);
    }
  },

  card(ctx, id, x, y, w, h, touch, k, mode) {
    const c = GL.CONFIG.chars[id], slot = this.slotOf(id), sel = slot > 0, M = this.master();
    ctx.fillStyle = sel ? (c.sin ? 'rgba(60,16,28,0.95)' : 'rgba(20,40,70,0.95)') : 'rgba(10,16,28,0.9)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = sel ? c.color : (c.sin ? 'rgba(255,90,120,0.3)' : 'rgba(120,150,190,0.3)'); ctx.lineWidth = sel ? 3 : 1; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = c.color; ctx.fillRect(x, y, mode === 'compact' ? 4 : 5, h);
    const fs = (n) => `${touch ? n * k * 0.85 : n}px sans-serif`;
    ctx.textAlign = 'left';
    const px = x + (mode === 'compact' ? 9 : 14), lw = w - (mode === 'compact' ? 14 : 24);
    ctx.fillStyle = c.color; ctx.font = 'bold ' + fs(mode === 'compact' ? 15 : 18); ctx.fillText(c.name, px, y + (touch ? (mode === 'compact' ? 15 : 20) * k : (mode === 'compact' ? 22 : 28)));
    ctx.fillStyle = '#c9d6e6'; ctx.font = fs(mode === 'compact' ? 10.5 : 12);
    const L = (n, m) => y + (touch ? m * k : n);
    if (mode === 'compact') {
      ctx.fillText(this.fit(ctx, `${c.virtue} · ${c.role}`, lw), px, L(42, 29));
      ctx.fillStyle = '#9fb3c8'; ctx.fillText(this.fit(ctx, c.weapon, lw), px, L(58, 42));
      const lines = touch ? [`R ${c.r.name}`] : [`Q ${c.q.name}`, `E ${c.e.name}`, `R ${c.r.name}`, `강 ${c.heavy.name}`, `패 ${c.passive ? c.passive.name : ''}`, `조 ${c.assist.name}`];
      ctx.font = fs(10);
      lines.forEach((l, i) => { const yy = y + (touch ? (58 + i * 13) * k : 84 + i * 17); if (yy < y + h - 4) { ctx.fillStyle = '#e8f1ff'; ctx.fillText(this.fit(ctx, l, lw), px, yy); } });
    } else {
      ctx.fillText(`${c.virtue} · ${c.role}`, px, y + (touch ? 36 * k : 48));
      ctx.fillStyle = '#9fb3c8'; ctx.fillText(`무기 : ${c.weapon}`, px, y + (touch ? 50 * k : 66));
      const lines = touch
        ? [`R ${c.r.name}`, `조력 ${c.assist.name}`]
        : [`Q ${c.q.name}`, `E ${c.e.name}`, `R ${c.r.name}`, `강공격 ${c.heavy.name}`, `조력 ${c.assist.name}`, id === 'ian' ? '4타 후 공격 = 소거 · R 길게 = 인과 역류' : `패시브 ${c.passive.name}`];
      ctx.font = fs(11.5);
      lines.forEach((l, i) => {
        ctx.fillStyle = i === lines.length - 1 && id === 'ian' ? '#6b9cff' : '#e8f1ff';
        const yy = y + (touch ? (66 + i * 15) * k : 88 + i * 17);
        if (yy < y + h - 4) ctx.fillText(this.fit(ctx, l, w - 24), px, yy);
      });
    }
    if (sel) {
      const r = mode === 'compact' ? 10 : 13;
      ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(x + w - r - 5, y + r + 5, r, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#05070d'; ctx.textAlign = 'center'; ctx.font = `bold ${r + 1}px sans-serif`; ctx.fillText(String(slot), x + w - r - 5, y + r + 10);
    }
    if (id === 'ian' && !M) { ctx.fillStyle = '#3fe0a8'; ctx.textAlign = 'right'; ctx.font = fs(11); ctx.fillText('리더 고정', x + w - 36, y + 23); }
  },
  fit(ctx, s, w) { if (ctx.measureText(s).width <= w) return s; while (s.length > 2 && ctx.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; },
};
