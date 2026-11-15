// ============================================================
// stage.js — 진행 흐름 : 필드 3웨이브 → 균열 포털 → 템푸스 보스전
// ============================================================
GL.Stage = {
  bounds: { x: 0, y: 0, w: 1800, h: 1300 },
  name: 'field',
  wave: 0,
  waveDelay: 0,
  portal: null,
  hint: '',

  WAVES: [
    { list: [['shard', 900, 450], ['shard', 1000, 800], ['shard', 1150, 600], ['eroder', 1400, 350], ['eroder', 1400, 950]],
      hint: '파편체가 멈춰서 깜빡이면 자폭 준비 — Tab(관측)을 켜고 4타·강공격(좌클릭 홀딩)·스킬로 폭발 코어를 파쇄하면 즉사' },
    { list: [['clasher', 1100, 500], ['clasher', 1100, 850], ['eroder', 1500, 400], ['shard', 900, 300], ['shard', 900, 1000]],
      hint: '파쇄손은 정면 피해 -70% — 관측 중 정면에서 파쇄 속성 공격을 넣으면 결합선이 끊겨 그로기' },
    { list: [['guardian', 1200, 650], ['shard', 1000, 400], ['shard', 1000, 900]],
      hint: '수호자는 정면 일반 타격을 막는다 — 관측 + 파쇄로 보호막 해제, 또는 바렌(2) 강공격 홀딩 = 퍼펙트 가드로 붉은 공격 반사' },
  ],

  start(name) {
    GL.World.reset();
    GL.Boss.knots = []; GL.Boss.current = null;
    this.name = name; this.portal = null;
    const p = GL.Party.player;
    GL.Render.yaw = 0; GL.Render.pitch = 0.38;
    p.facing = 0; p.z = 0; p.vz = 0; p.dash = null; p.plunge = null; p.lock = 0; p.guard = 0;
    if (name === 'field') {
      this.bounds = { x: 0, y: 0, w: 1800, h: 1300 };
      p.x = 300; p.y = 650;
      this.wave = 0; this.waveDelay = 1.2;
      GL.UI.banner('표면 현실 — 노이즈 반응 감지');
    } else {
      this.bounds = { x: 0, y: 0, w: 1300, h: 950 };
      p.x = 300; p.y = 475;
      const b = new GL.Tempus(950, 475);
      GL.World.enemies.push(b);
      this.hint = '인과 보스 템푸스 — 붉은 공격은 바렌 퍼펙트 가드로 반사 가능. 큰 참격 뒤 2초간 등의 시간의 핵이 노출된다(관측)';
      GL.UI.banner('인과 균열 토벌전 : 시간의 찌꺼기 템푸스');
    }
    GL.Render.tgt.x = p.x; GL.Render.tgt.y = p.y;
    if (GL.Render.buildProps) GL.Render.buildProps();
  },

  update(dt) {
    if (this.name === 'field' && this.waveDelay > 0) {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) this.spawnWave();
    }
    for (const k of GL.World.pickups) k.t += dt;
  },

  spawnWave() {
    const w = this.WAVES[this.wave];
    if (!w) return;
    for (const [type, x, y] of w.list) {
      const cls = { shard: GL.Shard, eroder: GL.Eroder, clasher: GL.Clasher, guardian: GL.Guardian }[type];
      GL.World.enemies.push(new cls(x, y));
    }
    this.hint = w.hint;
    GL.UI.banner(`웨이브 ${this.wave + 1} / ${this.WAVES.length}`);
  },

  onEnemyDeath(e) {
    if (!e.counted || this.name !== 'field') return;
    const alive = GL.World.enemies.some(x => !x.dead && x.counted);
    if (alive) return;
    this.wave++;
    if (this.wave < this.WAVES.length) { this.waveDelay = 1.5; }
    else {
      this.portal = { x: 1550, y: 650, r: 40 };
      this.hint = '필드 정리 완료 — 인과 균열(포털)로 가서 F로 진입';
      GL.UI.banner('인과 균열 발생');
    }
  },

  onBossDefeated() { GL.Main.win(); },

  // F : 상호작용 (회복 데이터 줍기 / 포털 진입)
  interact() {
    const p = GL.Party.player, W = GL.World;
    for (const k of W.pickups) {
      if (!k.taken && GL.U.dist(p, k) < 60) { k.taken = true; GL.Party.healActive(k.v); W.pickups = W.pickups.filter(x => !x.taken); return; }
    }
    if (this.portal && GL.U.dist(p, this.portal) < 90) { this.start('boss'); return; }
  },
  nearInteractable() {
    const p = GL.Party.player;
    if (GL.World.pickups.some(k => GL.U.dist(p, k) < 60)) return '회복 데이터 줍기';
    if (this.portal && GL.U.dist(p, this.portal) < 90) return '인과 균열 진입';
    return null;
  },

  clamp(o) {
    const b = this.bounds, r = o.r || 14;
    o.x = GL.U.clamp(o.x, b.x + r, b.x + b.w - r);
    o.y = GL.U.clamp(o.y, b.y + r, b.y + b.h - r);
  },
};
