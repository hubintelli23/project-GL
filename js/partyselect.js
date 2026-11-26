// ============================================================
// partyselect.js — 파티 편성 화면
// 이안(주인공 · 7대선 리더 · 관측 담당)은 1번 자리에 고정, 나머지 6명 중 2명을 골라 3인 파티
// 고른 순서 = 2번 · 3번 자리 (숫자키 태그 순서). 마지막 편성은 기기에 저장
// ============================================================
GL.PartySelect = {
  picks: ['baren', 'kay'],
  cards: [], buttons: [],

  init() {
    try {
      const v = JSON.parse(localStorage.getItem('gl_party') || 'null');
      if (Array.isArray(v) && v.length === 2 && v.every(id => GL.CONFIG.chars[id] && id !== 'ian')) this.picks = v;
    } catch (e) { /* 저장 불가 환경 */ }
  },
  chosen() { return this.picks.length === 2 ? ['ian', ...this.picks] : GL.CONFIG.partyOrder; },
  save() { try { localStorage.setItem('gl_party', JSON.stringify(this.picks)); } catch (e) {} },

  toggle(id) {
    if (id === 'ian') { GL.UI.banner('이안은 7대선 리더 · 관측 담당이라 항상 1번 자리에 고정'); return; }
    const i = this.picks.indexOf(id);
    if (i >= 0) this.picks.splice(i, 1);
    else { if (this.picks.length >= 2) this.picks.shift(); this.picks.push(id); }
  },

  // ---------- 클릭 / 탭 ----------
  click(x, y) {
    for (const b of this.buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (b.id === 'go') this.start();
        else if (b.id === 'default') this.picks = ['baren', 'kay'];
        else if (b.id === 'back') GL.Main.state = 'title';
        return;
      }
    }
    for (const c of this.cards) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) { this.toggle(c.id); return; }
  },
  start() {
    if (this.picks.length !== 2) { GL.UI.banner('함께할 동료 2명을 골라주세요'); return; }
    this.save();
    GL.Main.newGame(this.chosen());
  },

  // ---------- 그리기 ----------
  draw(ctx, cv) {
    const touch = GL.Touch.enabled, W = cv.width, H = cv.height;
    const k = touch ? Math.min(1.2, H / 400) : 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H);
    const t = performance.now() / 1000;
    ctx.strokeStyle = 'rgba(63,224,168,0.08)';
    for (let i = 0; i < 30; i++) { const x = (i * 131 + t * 20) % W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 160, H); ctx.stroke(); }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff'; ctx.font = `bold ${touch ? 20 * k : 30}px sans-serif`;
    ctx.fillText('파티 편성', W / 2, touch ? 26 * k : 48);
    ctx.fillStyle = '#9fb3c8'; ctx.font = `${touch ? 11 * k : 14}px sans-serif`;
    ctx.fillText('이안(리더 · 관측)은 고정  ·  함께할 동료 2명을 고르세요  ·  고른 순서가 2번 · 3번 자리', W / 2, touch ? 44 * k : 74);

    // 카드 7장 : 4 + 3
    const ids = GL.CONFIG.roster, cols = 4;
    const gap = touch ? 8 : 14, cw = Math.min(touch ? 190 : 250, (W - 40 - gap * (cols - 1)) / cols);
    const ch = touch ? Math.min(118 * k, (H - 150 * k) / 2 - gap) : 196;
    const top = touch ? 56 * k : 96;
    this.cards = [];
    ids.forEach((id, i) => {
      const row = i < cols ? 0 : 1, col = row ? i - cols : i, n = row ? ids.length - cols : cols;
      const rowW = n * cw + (n - 1) * gap, x = (W - rowW) / 2 + col * (cw + gap), y = top + row * (ch + gap);
      this.cards.push({ id, x, y, w: cw, h: ch });
      this.card(ctx, id, x, y, cw, ch, touch, k);
    });

    // 파티 미리보기 + 버튼
    const party = this.chosen(), by = top + 2 * (ch + gap) + (touch ? 2 : 10);
    ctx.textAlign = 'left'; ctx.font = `bold ${touch ? 12 * k : 15}px sans-serif`;
    let px = W / 2 - (touch ? 300 * k : 380);
    ['ian', ...this.picks].forEach((id, i) => {
      const c = GL.CONFIG.chars[id];
      ctx.fillStyle = c.color; ctx.fillText(`${i + 1} ${c.name}`, px, by + 16 * (touch ? k : 1)); px += touch ? 70 * k : 90;
    });
    for (let i = this.picks.length; i < 2; i++) { ctx.fillStyle = '#6b7c93'; ctx.fillText(`${i + 2} ?`, px, by + 16 * (touch ? k : 1)); px += touch ? 70 * k : 90; }
    const bh = touch ? 30 * k : 40, bw = touch ? 110 * k : 150;
    const bx = W / 2 + (touch ? 10 * k : 20);
    this.buttons = [
      { id: 'default', label: '기본 파티', x: bx - (touch ? 20 * k : 0), y: by - 4, w: bw * 0.8, h: bh },
      { id: 'go', label: this.picks.length === 2 ? '출격  (Enter)' : '2명을 고르세요', x: bx + bw * 0.85, y: by - 4, w: bw * 1.25, h: bh },
    ];
    if (!touch) this.buttons.push({ id: 'back', label: 'Esc 타이틀', x: 20, y: H - 54, w: 120, h: 34 });
    for (const b of this.buttons) {
      const ok = b.id !== 'go' || this.picks.length === 2;
      ctx.fillStyle = b.id === 'go' ? (ok ? 'rgba(63,224,168,0.85)' : 'rgba(60,70,90,0.8)') : 'rgba(30,40,60,0.9)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = ok ? '#3fe0a8' : '#6b7c93'; ctx.lineWidth = 1.5; ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.id === 'go' && ok ? '#05070d' : '#e8f1ff'; ctx.textAlign = 'center'; ctx.font = `bold ${touch ? 12 * k : 15}px sans-serif`;
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 5);
    }
  },

  card(ctx, id, x, y, w, h, touch, k) {
    const c = GL.CONFIG.chars[id], slot = id === 'ian' ? 1 : (this.picks.indexOf(id) >= 0 ? this.picks.indexOf(id) + 2 : 0);
    const sel = slot > 0;
    ctx.fillStyle = sel ? 'rgba(20,40,70,0.95)' : 'rgba(10,16,28,0.9)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = sel ? c.color : 'rgba(120,150,190,0.3)'; ctx.lineWidth = sel ? 3 : 1; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = c.color; ctx.fillRect(x, y, 5, h);
    const fs = (n) => `${touch ? n * k * 0.85 : n}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = c.color; ctx.font = 'bold ' + fs(18); ctx.fillText(c.name, x + 14, y + (touch ? 20 * k : 28));
    ctx.fillStyle = '#c9d6e6'; ctx.font = fs(12);
    ctx.fillText(`${c.virtue} · ${c.role}`, x + 14, y + (touch ? 36 * k : 48));
    ctx.fillStyle = '#9fb3c8'; ctx.fillText(`무기 : ${c.weapon}`, x + 14, y + (touch ? 50 * k : 66));
    const lines = touch
      ? [`R ${c.r.name}`, `조력 ${c.assist.name}`]
      : [`Q ${c.q.name}`, `E ${c.e.name}`, `R ${c.r.name}`, `강공격 ${c.heavy.name}`, `조력 ${c.assist.name}`, id === 'ian' ? '4타 후 공격 = 소거 · R 길게 = 인과 역류' : `패시브 ${c.passive.name}`];
    ctx.font = fs(11.5);
    lines.forEach((l, i) => {
      ctx.fillStyle = i === lines.length - 1 && id === 'ian' ? '#6b9cff' : '#e8f1ff';
      const yy = y + (touch ? (66 + i * 15) * k : 88 + i * 17);
      if (yy < y + h - 4) ctx.fillText(this.fit(ctx, l, w - 24), x + 14, yy);
    });
    if (sel) {
      ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(x + w - 18, y + 18, 13, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#05070d'; ctx.textAlign = 'center'; ctx.font = 'bold 14px sans-serif'; ctx.fillText(String(slot), x + w - 18, y + 23);
    }
    if (id === 'ian') { ctx.fillStyle = '#3fe0a8'; ctx.textAlign = 'right'; ctx.font = fs(11); ctx.fillText('리더 고정', x + w - 36, y + 23); }
  },
  fit(ctx, s, w) { if (ctx.measureText(s).width <= w) return s; while (s.length > 2 && ctx.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; },
};
