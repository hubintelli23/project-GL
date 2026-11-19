// ============================================================
// ui.js — HUD : 파티, 스킬, 보스 체력·파쇄 게이지, 지도, 안내, 화면 전환
// ============================================================
GL.UI = {
  bannerText: '', bannerT: 0, mapOpen: false,

  banner(str) { this.bannerText = str; this.bannerT = 3; },

  draw(ctx, cv) {
    const W = GL.World, st = GL.Main.state;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (st === 'title') return this.drawTitle(ctx, cv);
    const touch = GL.Touch.enabled;
    // 안내 배너는 HUD 아래에 깔리도록 먼저 그림
    if (this.bannerT > 0) {
      this.bannerT -= 1 / 60;
      ctx.save(); ctx.globalAlpha = Math.min(1, this.bannerT);
      const fs = touch ? 16 : 22;
      ctx.fillStyle = 'rgba(5,10,20,0.75)'; ctx.fillRect(0, cv.height * 0.28 - fs - 8, cv.width, fs + 30);
      ctx.fillStyle = '#e8f1ff'; ctx.font = `bold ${fs}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(this.bannerText, cv.width / 2, cv.height * 0.28 + 4); ctx.restore();
    }
    this.drawHint(ctx, cv);
    this.drawParty(ctx, cv);
    if (!touch) this.drawSkills(ctx, cv);
    this.drawBoss(ctx, cv);
    if (!touch) this.drawMinimap(ctx, cv);
    this.drawBuffs(ctx, cv);
    const near = GL.Stage.nearInteractable();
    if (near && !touch) this.pill(ctx, cv.width / 2, cv.height - 170, `[F] ${near}`, '#ffffff');
    if (near && touch) this.pill(ctx, cv.width / 2, cv.height - 40, `F 버튼 : ${near}`, '#ffffff');
    GL.Touch.draw(ctx, cv);
    ctx.fillStyle = 'rgba(200,220,255,0.5)'; ctx.font = '11px sans-serif'; ctx.textAlign = touch ? 'left' : 'right';
    if (touch) ctx.fillText(`프로토타입 ${GL.VERSION}`, 12, cv.height - 8);
    else ctx.fillText(`이클립스 세븐 프로토타입 ${GL.VERSION}  ·  Esc 설정/조작법`, cv.width - 12, cv.height - 10);
    if (this.mapOpen) this.drawBigMap(ctx, cv);
    const again = touch ? '화면을 탭' : 'Enter';
    if (st === 'pause') this.drawPause(ctx, cv);
    if (st === 'over') this.drawEnd(ctx, cv, '전투 불능', '모든 파티원이 쓰러졌습니다', `${again} : 이 구역 다시 도전`);
    if (st === 'win') this.drawEnd(ctx, cv, '토벌 완료', `시간의 찌꺼기 템푸스 처치  ·  클리어 시간 ${GL.Main.clearTime()}`, `${again} : 처음부터 다시`);
  },

  bar(ctx, x, y, w, h, ratio, color, bg = 'rgba(0,0,0,0.55)') {
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color; ctx.fillRect(x, y, w * GL.U.clamp(ratio, 0, 1), h);
  },
  pill(ctx, x, y, str, color) {
    ctx.save(); ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
    const w = ctx.measureText(str).width + 24;
    ctx.fillStyle = 'rgba(5,10,20,0.8)'; ctx.fillRect(x - w / 2, y - 18, w, 28);
    ctx.strokeStyle = color; ctx.strokeRect(x - w / 2, y - 18, w, 28);
    ctx.fillStyle = color; ctx.fillText(str, x, y + 1); ctx.restore();
  },

  drawParty(ctx, cv) {
    if (GL.Touch.enabled) return this.drawPartyTouch(ctx, cv);
    const P = GL.Party, x0 = 16, y0 = cv.height - 16 - 3 * 64;
    this.partyRects = P.members.map((m, i) => ({ x: x0, y: y0 + i * 64, w: 250, h: 56 }));
    P.members.forEach((m, i) => {
      const y = y0 + i * 64, act = i === P.activeIdx, dead = m.hp <= 0;
      ctx.fillStyle = act ? 'rgba(20,40,70,0.9)' : 'rgba(8,14,26,0.8)'; ctx.fillRect(x0, y, 250, 56);
      ctx.strokeStyle = act ? m.color : 'rgba(120,150,190,0.3)'; ctx.lineWidth = act ? 2 : 1; ctx.strokeRect(x0, y, 250, 56);
      ctx.fillStyle = dead ? '#555' : m.color; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}  ${m.name}`, x0 + 10, y + 20);
      ctx.fillStyle = '#9fb3c8'; ctx.font = '11px sans-serif'; ctx.fillText(m.cfg.role, x0 + 80, y + 20);
      this.bar(ctx, x0 + 10, y + 28, 230, 8, m.hp / m.maxHp, dead ? '#444' : '#3fe0a8');
      ctx.fillStyle = '#e8f1ff'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(`${Math.ceil(m.hp)} / ${m.maxHp}`, x0 + 240, y + 20);
      this.bar(ctx, x0 + 10, y + 40, 150, 5, m.ult / m.ultMax, m.ult >= m.ultMax ? '#ffe066' : '#7aa7ff');
      ctx.textAlign = 'left'; ctx.font = '10px sans-serif';
      if (!act && !dead) {
        ctx.fillStyle = m.cd.assist > 0 ? '#6b7c93' : '#ffe066';
        ctx.fillText(m.cd.assist > 0 ? `조력 ${m.cd.assist.toFixed(0)}초` : `조력 가능 (${i + 1} 홀딩)`, x0 + 168, y + 46);
      } else if (act) { ctx.fillStyle = '#e8f1ff'; ctx.fillText('필드', x0 + 168, y + 46); }
    });
    if (P.tagCd > 0) { ctx.fillStyle = '#9fb3c8'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`태그 대기 ${P.tagCd.toFixed(1)}초`, x0, y0 - 8); }
  },

  // 휴대폰 : 왼쪽 위 작은 카드 (탭 = 태그, 0.5초 누르기 = 조력)
  drawPartyTouch(ctx, cv) {
    const P = GL.Party, x0 = 10, w = 168, h = 38, gap = 5;
    const y0 = (this.hintBottom || 60) + 6;
    this.partyRects = [];
    P.members.forEach((m, i) => {
      const y = y0 + i * (h + gap), act = i === P.activeIdx, dead = m.hp <= 0;
      this.partyRects.push({ x: x0, y, w, h });
      const down = GL.Touch.pressed['party' + i];
      ctx.fillStyle = down ? 'rgba(60,90,140,0.85)' : (act ? 'rgba(20,40,70,0.88)' : 'rgba(8,14,26,0.72)');
      ctx.fillRect(x0, y, w, h);
      ctx.strokeStyle = act ? m.color : 'rgba(120,150,190,0.3)'; ctx.lineWidth = act ? 2 : 1; ctx.strokeRect(x0, y, w, h);
      ctx.textAlign = 'left'; ctx.fillStyle = dead ? '#555' : m.color; ctx.font = 'bold 13px sans-serif';
      ctx.fillText(m.name, x0 + 8, y + 15);
      ctx.font = '10px sans-serif';
      if (!act && !dead) { ctx.fillStyle = m.cd.assist > 0 ? '#6b7c93' : '#ffe066'; ctx.fillText(m.cd.assist > 0 ? `조력 ${m.cd.assist.toFixed(0)}` : '조력 (길게)', x0 + 52, y + 15); }
      else if (act) { ctx.fillStyle = '#e8f1ff'; ctx.fillText('필드', x0 + 52, y + 15); }
      ctx.textAlign = 'right'; ctx.fillStyle = '#e8f1ff'; ctx.fillText(`${Math.ceil(m.hp)}`, x0 + w - 6, y + 15);
      this.bar(ctx, x0 + 8, y + 21, w - 16, 6, m.hp / m.maxHp, dead ? '#444' : '#3fe0a8');
      this.bar(ctx, x0 + 8, y + 30, (w - 16) * 0.6, 3, m.ult / m.ultMax, m.ult >= m.ultMax ? '#ffe066' : '#7aa7ff');
    });
    this.partyBottom = y0 + 3 * (h + gap);
  },

  slot(ctx, x, y, key, name, cdLeft, cdMax, ready, color = '#e8f1ff') {
    const s = 58;
    ctx.fillStyle = 'rgba(8,14,26,0.85)'; ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = ready ? color : 'rgba(120,150,190,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, s, s);
    if (cdLeft > 0 && cdMax > 0) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y + s * (1 - cdLeft / cdMax), s, s * cdLeft / cdMax); }
    ctx.textAlign = 'center';
    ctx.fillStyle = ready ? color : '#6b7c93'; ctx.font = 'bold 18px sans-serif'; ctx.fillText(key, x + s / 2, y + 26);
    ctx.font = '10px sans-serif'; ctx.fillStyle = '#c9d6e6';
    ctx.fillText(name.length > 7 ? name.slice(0, 7) + '…' : name, x + s / 2, y + 46);
    if (cdLeft > 0) { ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(cdLeft.toFixed(1), x + s / 2, y + s + 14); }
  },

  drawSkills(ctx, cv) {
    const ch = GL.Party.active(), p = GL.Party.player, W = GL.World, R = GL.CONFIG.rules;
    if (!ch) return;
    const n = 5, gap = 10, s = 58, total = n * s + (n - 1) * gap;
    let x = cv.width / 2 - total / 2; const y = cv.height - s - 26;
    this.slot(ctx, x, y, 'Q', ch.cfg.q.name, ch.cd.q, ch.cfg.q.cd, ch.cd.q <= 0, ch.color); x += s + gap;
    this.slot(ctx, x, y, 'E', ch.cfg.e.name, ch.cd.e, ch.cfg.e.cd, ch.cd.e <= 0, ch.color); x += s + gap;
    const ultReady = ch.ult >= ch.ultMax;
    this.slot(ctx, x, y, 'R', ch.cfg.r.name, 0, 0, ultReady, '#ffe066');
    ctx.fillStyle = '#7aa7ff'; ctx.fillRect(x, y + s + 4, s * ch.ult / ch.ultMax, 3); x += s + gap;
    const o = W.observe;
    this.slot(ctx, x, y, 'Tab', o.on ? `관측 ${o.t.toFixed(1)}` : '관측', o.cd, R.observeCooldown, !o.on && o.cd <= 0 || o.on, '#3fe0a8');
    if (o.on) { ctx.strokeStyle = '#3fe0a8'; ctx.lineWidth = 3; ctx.strokeRect(x - 3, y - 3, s + 6, s + 6); }
    x += s + gap;
    this.slot(ctx, x, y, 'Shift', `회피 ${p.dodgeCharges}/${R.dodgeCharges}`, p.dodgeCharges === 0 ? p.dodgeRe : 0, R.dodgeRecharge, p.dodgeCharges > 0);
    // 평타 콤보 표시
    if (ch.combo > 0) {
      ctx.textAlign = 'center'; ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = ch.combo === 4 ? '#ffffff' : '#9fb3c8';
      ctx.fillText(`${ch.combo}타 · ${ch.cfg.light[ch.combo - 1].name}`, cv.width / 2, y - 14);
    }
  },

  drawBuffs(ctx, cv) {
    const B = GL.World.buffs, list = [];
    if (B.shield > 0) list.push([`유리 파편 보호막 ${B.shield}`, '#9fe8ff']);
    if (B.fortress > 0) list.push([`수호자의 요새 ${B.fortress.toFixed(1)}초`, '#e0b54a']);
    if (B.barrier > 0) list.push([`절대 경계 ${B.barrier.toFixed(1)}초`, '#e0b54a']);
    if (B.weakAll > 0) list.push([`약점 해독 ${B.weakAll.toFixed(1)}초`, '#b48cff']);
    if (GL.Party.player.slow > 0) list.push(['지연의 늪 : 이동 -50%', '#c49bff']);
    ctx.textAlign = 'left'; ctx.font = 'bold 12px sans-serif';
    if (GL.Touch.enabled) list.forEach(([s, c], i) => { ctx.fillStyle = c; ctx.fillText(s, 12, (this.partyBottom || 200) + 12 + i * 16); });
    else list.forEach(([s, c], i) => { ctx.fillStyle = c; ctx.fillText(s, 280, cv.height - 30 - i * 18); });
  },

  drawBoss(ctx, cv) {
    const b = GL.Boss.current;
    if (!b || b.dead) return;
    const w = Math.max(240, Math.min(560, cv.width - 2 * 390)), x = cv.width / 2 - w / 2, y = 22;
    ctx.textAlign = 'center'; ctx.fillStyle = '#e8d6ff'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`${b.title} : ${b.name}   ·   ${b.phase}페이즈`, cv.width / 2, y);
    this.bar(ctx, x, y + 8, w, 14, b.hp / b.maxHp, '#d36bff');
    ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.fillText(`${Math.ceil(b.hp)} / ${b.maxHp}`, cv.width / 2, y + 19);
    // 70% / 50% / 30% 표시
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (const r of [0.7, 0.5, 0.3]) ctx.fillRect(x + w * r - 1, y + 8, 2, 14);
    if (b.groggy > 0) {
      this.bar(ctx, x, y + 26, w, 8, b.groggy / GL.CONFIG.rules.groggyTime, '#ffe066');
      ctx.fillStyle = '#ffe066'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(`그로기 ${b.groggy.toFixed(1)}초 — 받는 피해 +150%`, cv.width / 2, y + 50);
    } else {
      this.bar(ctx, x, y + 26, w, 8, b.frac / b.fracMax, '#e8f1ff');
      ctx.fillStyle = '#c9d6e6'; ctx.font = '11px sans-serif'; ctx.fillText(`파쇄 게이지 ${Math.ceil(b.frac)} / ${b.fracMax}`, cv.width / 2, y + 48);
    }
    if (b.mode === 'recover') { ctx.fillStyle = '#3fe0a8'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('약점 노출 — 시간의 핵 (관측)', cv.width / 2, y + 66); }
    if (b.mode === 'reversal' || b.mode === 'doom') {
      const left = b.mode === 'reversal' ? b.castT : b.doomT;
      ctx.fillStyle = b.mode === 'doom' ? '#ff3b5c' : '#ff9a3d'; ctx.font = 'bold 40px sans-serif';
      ctx.fillText(left.toFixed(1), cv.width / 2, y + 104);
      ctx.font = 'bold 14px sans-serif';
      const cut = GL.Boss.knots.filter(k => k.frac <= 0).length;
      ctx.fillText(`${b.mode === 'doom' ? '시간의 톱니바퀴' : '시간 역류'} — 매듭 ${cut} / ${GL.Boss.knots.length}${GL.World.observe.on ? '' : '   (Tab 관측으로 매듭 확인)'}`, cv.width / 2, y + 126);
    }
  },

  drawHint(ctx, cv) {
    let hint = GL.Stage.hint;
    // 휴대폰에서는 안내 문구의 PC 키 이름을 버튼 이름으로 바꿈
    if (GL.Touch.enabled && hint) {
      for (const [a, b] of [['Tab(관측)', '관측 버튼'], ['(관측)', '(관측 버튼)'], ['강공격(좌클릭 홀딩)', '강공격(공격 길게)'], ['바렌(2) 강공격 홀딩', '바렌 공격 길게'], ['F로', 'F 버튼으로']]) hint = hint.split(a).join(b);
    }
    const lines = [GL.Stage.name === 'field' ? `필드 · 웨이브 ${Math.min(GL.Stage.wave + 1, GL.Stage.WAVES.length)} / ${GL.Stage.WAVES.length}` : '보스전'];
    const touch = GL.Touch.enabled;
    const bw = touch ? Math.min(270, cv.width * 0.32) : 350, lh = touch ? 15 : 18;
    if (hint) { let w = this.wrap(ctx, hint, bw - 20, touch ? 11 : 12); if (touch && w.length > 3) { w = w.slice(0, 3); w[2] += '…'; } lines.push(...w); }
    ctx.fillStyle = 'rgba(8,14,26,0.75)'; ctx.fillRect(touch ? 10 : 12, touch ? 8 : 12, bw, 12 + lines.length * lh);
    ctx.textAlign = 'left';
    lines.forEach((l, i) => { ctx.fillStyle = i === 0 ? '#7aa7ff' : '#c9d6e6'; ctx.font = i === 0 ? `bold ${touch ? 12 : 13}px sans-serif` : `${touch ? 11 : 12}px sans-serif`; ctx.fillText(l, touch ? 18 : 22, (touch ? 23 : 30) + i * lh); });
    this.hintBottom = (touch ? 8 : 12) + 12 + lines.length * lh;
  },

  wrap(ctx, text, maxW, size = 12) {
    ctx.font = `${size}px sans-serif`;
    const out = []; let cur = '';
    for (const ch of text) {
      if (ctx.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; } else cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  },

  drawMinimap(ctx, cv, big) {
    const b = GL.Stage.bounds;
    const mw = big ? Math.min(cv.width * 0.6, 700) : 180;
    const sc = mw / b.w, mh = b.h * sc;
    const x = big ? cv.width / 2 - mw / 2 : cv.width - mw - 14, y = big ? cv.height / 2 - mh / 2 : 14;
    ctx.fillStyle = 'rgba(5,10,20,0.8)'; ctx.fillRect(x, y, mw, mh);
    ctx.strokeStyle = '#5d8fd6'; ctx.lineWidth = 1; ctx.strokeRect(x, y, mw, mh);
    for (const e of GL.World.enemies) {
      if (e.dead) continue;
      ctx.fillStyle = e.boss ? '#d36bff' : (e.elite ? '#ff9a3d' : '#ff5a6e');
      ctx.fillRect(x + e.x * sc - 2, y + e.y * sc - 2, e.boss ? 7 : 4, e.boss ? 7 : 4);
    }
    if (GL.Stage.portal) { ctx.fillStyle = '#d36bff'; ctx.beginPath(); ctx.arc(x + GL.Stage.portal.x * sc, y + GL.Stage.portal.y * sc, 4, 0, 6.283); ctx.fill(); }
    for (const k of GL.World.pickups) { ctx.fillStyle = '#3fe0a8'; ctx.fillRect(x + k.x * sc - 1.5, y + k.y * sc - 1.5, 3, 3); }
    const p = GL.Party.player;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + p.x * sc, y + p.y * sc, 3, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#9fb3c8'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    if (!big) ctx.fillText('M 지도', x + mw, y + mh + 12);
  },

  drawBigMap(ctx, cv) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, cv.width, cv.height);
    this.drawMinimap(ctx, cv, true);
    ctx.fillStyle = '#e8f1ff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('지도 (M으로 닫기)', cv.width / 2, cv.height / 2 - GL.Stage.bounds.h * Math.min(cv.width * 0.6, 700) / GL.Stage.bounds.w / 2 - 12);
  },

  controlsList() {
    if (GL.Touch.enabled) return [
      ['왼쪽 엄지', '조이스틱 이동 · 원 밖까지 밀면 대쉬'], ['오른쪽 화면 드래그', '카메라 회전'],
      ['공격 탭 / 0.5초 누르기', '평타 1~4타 / 강공격 (바렌 = 퍼펙트 가드)'],
      ['점프 · 공중 공격 · 공중 점프', '점프 / 점프 공격 / 점프 강공격(낙하)'],
      ['회피 · Q · E · R', '회피 / 스킬 1·2 / 궁극기'], ['관측', '약점·매듭·투사체 궤적 보기 (8초)'],
      ['파티 카드 탭 / 길게', '태그 / 대기 파티원 조력 스킬'], ['F · 지도 · Ⅱ', '상호작용 / 지도 / 일시정지'],
    ];
    return [
      ['마우스 이동', '카메라 회전 (3인칭 백뷰) · 공격은 앞쪽 가까운 적에게 자동 조준'],
      ['WASD', '카메라 기준 이동'], ['Space', '점프'], ['Shift', '회피 (0.3초 무적, 2회)'], ['우클릭 (누르고 있기)', '대쉬 (이동 속도 1.8배)'],
      ['좌클릭', '평타 1~4타 (4타 = 파쇄 속성)'], ['좌클릭 0.5초 홀딩', '강공격 (파쇄 속성) · 바렌 = 퍼펙트 가드'],
      ['공중 좌클릭', '점프 공격'], ['공중 Ctrl + 좌클릭', '점프 강공격 (파쇄 속성)'],
      ['Q / E', '스킬 1 / 2'], ['R', '궁극기 (게이지 가득)'], ['Tab', '관측 : 약점 코어·매듭·투사체 궤적 보기 (8초)'],
      ['1 · 2 · 3 짧게', '파티원 태그'], ['1 · 2 · 3 0.5초 홀딩', '대기 파티원 조력 스킬'],
      ['F', '상호작용 (회복 데이터, 포털)'], ['M', '지도'], ['Esc', '일시정지 / 조작법'],
    ];
  },

  drawControls(ctx, cx, y, size = 14, lh = 24) {
    ctx.font = `${size}px sans-serif`;
    for (const [k, v] of this.controlsList()) {
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffe066'; ctx.fillText(k, cx - 12, y);
      ctx.textAlign = 'left'; ctx.fillStyle = '#e8f1ff'; ctx.fillText(v, cx + 12, y);
      y += lh;
    }
    return y;
  },

  // 휴대폰 타이틀 (가로 화면 높이 ~360px 기준)
  drawTitleTouch(ctx, cv) {
    const t = performance.now() / 1000, H = cv.height, k = Math.min(1.3, H / 390);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3fe0a8'; ctx.font = `bold ${11 * k}px sans-serif`; ctx.fillText(`PROJECT GL  ·  프로토타입 ${GL.VERSION}  ·  휴대폰`, cv.width / 2, 26 * k);
    ctx.fillStyle = '#ffffff'; ctx.font = `bold ${34 * k}px sans-serif`; ctx.fillText('이클립스 세븐', cv.width / 2, 64 * k);
    ctx.fillStyle = '#7aa7ff'; ctx.font = `bold ${11 * k}px sans-serif`; ctx.fillText('3D 액션 JRPG  ·  3인칭 백뷰', cv.width / 2, 84 * k);
    const y = this.drawControls(ctx, cv.width / 2 - 20, 112 * k, 12 * k, 22 * k);
    ctx.textAlign = 'center'; ctx.fillStyle = '#c9d6e6'; ctx.font = `${11 * k}px sans-serif`;
    ctx.fillText('파티 : 이안(파쇄) · 바렌(수호/패링) · 케이(극딜)  —  필드 3웨이브 → 인과 보스 템푸스', cv.width / 2, y + 4 * k);
    ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ffffff' : '#7aa7ff'; ctx.font = `bold ${16 * k}px sans-serif`;
    ctx.fillText('화면을 탭해서 시작', cv.width / 2, Math.min(H - 14, y + 30 * k));
  },

  drawTitle(ctx, cv) {
    ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, cv.width, cv.height);
    const t = performance.now() / 1000;
    ctx.strokeStyle = 'rgba(63,224,168,0.12)';
    for (let i = 0; i < 40; i++) { const x = (i * 97 + t * 30) % cv.width; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 200, cv.height); ctx.stroke(); }
    if (GL.Touch.enabled) return this.drawTitleTouch(ctx, cv);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3fe0a8'; ctx.font = 'bold 14px sans-serif'; ctx.fillText(`PROJECT GL  ·  첫 플레이 프로토타입 ${GL.VERSION}`, cv.width / 2, 70);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 52px sans-serif'; ctx.fillText('이클립스 세븐', cv.width / 2, 130);
    ctx.fillStyle = '#7aa7ff'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('3D 액션 JRPG  ·  3인칭 백뷰', cv.width / 2, 188);
    ctx.fillStyle = '#9fb3c8'; ctx.font = '15px sans-serif';
    ctx.fillText('현실은 시스템이 쓴 오답 노트, 반전 세계는 그 위에 덧씌워진 진짜 비극.', cv.width / 2, 162);
    const y = this.drawControls(ctx, cv.width / 2, 220);
    ctx.fillStyle = '#c9d6e6'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('파티 : 1 이안(파쇄)  ·  2 바렌(수호/패링)  ·  3 케이(극딜)   —   필드 3웨이브 → 인과 보스 템푸스', cv.width / 2, y + 14);
    ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ffffff' : '#7aa7ff'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText('클릭해서 시작 (마우스가 화면에 고정됩니다 · Esc로 해제)', cv.width / 2, y + 54);
  },

  drawPause(ctx, cv) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, cv.width, cv.height);
    const touch = GL.Touch.enabled, k = touch ? Math.min(1.3, cv.height / 390) : 1;
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.font = `bold ${touch ? 22 * k : 30}px sans-serif`;
    ctx.fillText('일시정지 · 조작법', cv.width / 2, touch ? 40 * k : 80);
    if (touch) this.drawControls(ctx, cv.width / 2 - 20, 80 * k, 12 * k, 24 * k);
    else this.drawControls(ctx, cv.width / 2, 130);
    ctx.textAlign = 'center'; ctx.fillStyle = '#7aa7ff'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText(touch ? '화면을 탭하면 계속합니다' : '클릭 또는 Esc : 계속하기', cv.width / 2, cv.height - (touch ? 18 : 40));
  },

  drawEnd(ctx, cv, title, sub, action) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.font = `bold ${GL.Touch.enabled ? 34 : 48}px sans-serif`;
    ctx.fillText(title, cv.width / 2, cv.height / 2 - 30);
    ctx.fillStyle = '#c9d6e6'; ctx.font = '16px sans-serif'; ctx.fillText(sub, cv.width / 2, cv.height / 2 + 10);
    ctx.fillStyle = '#7aa7ff'; ctx.font = 'bold 18px sans-serif'; ctx.fillText(action, cv.width / 2, cv.height / 2 + 56);
  },
};
