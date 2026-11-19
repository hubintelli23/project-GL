// ============================================================
// gl3d.js — 외부 라이브러리 없는 작은 WebGL 엔진
// 로우폴리 도형(박스·원기둥·구·원뿔·팔면체·고리) + 바닥 그리드 + 바닥 데칼(예고 범위)
// 좌표 : 게임 (x, y) 평면 = 3D (X, Z) 바닥, 높이 = 3D Y
// ============================================================
GL.G3 = {
  init(canvas, lowPower) {
    const opts = { antialias: !lowPower, alpha: false, powerPreference: lowPower ? 'low-power' : 'high-performance', preserveDrawingBuffer: false };
    const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) throw new Error('WebGL을 사용할 수 없습니다');
    this.gl = gl; this.canvas = canvas;

    const vs = `
      attribute vec3 aPos; attribute vec3 aNor;
      uniform mat4 uVP; uniform mat4 uM;
      varying vec3 vN; varying vec3 vW;
      void main(){ vec4 w = uM * vec4(aPos,1.0); vW = w.xyz; vN = (uM * vec4(aNor,0.0)).xyz; gl_Position = uVP * w; }`;
    const fs = `
      precision mediump float;
      varying vec3 vN; varying vec3 vW;
      uniform vec4 uColor; uniform float uEmit; uniform vec3 uLight; uniform vec3 uCam;
      uniform vec3 uFog; uniform vec2 uFogR; uniform float uMono;
      void main(){
        vec3 n = normalize(vN);
        float d = max(dot(n, uLight), 0.0);
        vec3 c = uColor.rgb * (0.42 + 0.68 * d);
        c = mix(c, uColor.rgb, uEmit);
        float f = clamp((length(vW - uCam) - uFogR.x) / (uFogR.y - uFogR.x), 0.0, 1.0);
        c = mix(c, uFog, f);
        float g = dot(c, vec3(0.3, 0.59, 0.11));
        c = mix(c, vec3(g), uMono * (1.0 - step(0.99, uEmit)));   // 빛나는 것(매듭·약점·경고)은 흑백에서 제외
        gl_FragColor = vec4(c, uColor.a);
      }`;
    // 바닥 : 월드 좌표로 그리드를 그림 (관측 중 에메랄드 그리드 + 스캔 라인)
    const fsGround = `
      precision mediump float;
      varying vec3 vN; varying vec3 vW;
      uniform vec3 uCam; uniform vec3 uFog; uniform vec2 uFogR; uniform float uMono;
      uniform float uObs; uniform float uTime; uniform vec4 uBounds; uniform vec3 uBase;
      float grid(float v, float s, float w){ float g = abs(fract(v / s - 0.5) - 0.5) * s; return 1.0 - smoothstep(0.0, w, g); }
      void main(){
        vec2 p = vW.xz;
        float inside = step(uBounds.x, p.x) * step(p.x, uBounds.x + uBounds.z) * step(uBounds.y, p.y) * step(p.y, uBounds.y + uBounds.w);
        float s = mix(60.0, 40.0, uObs);
        float g = max(grid(p.x, s, 1.4), grid(p.y, s, 1.4));
        vec3 base = uBase * (0.75 + 0.25 * inside);
        vec3 lineC = mix(vec3(0.30, 0.48, 0.75), vec3(0.25, 0.88, 0.66), uObs);
        vec3 c = mix(base, lineC, g * mix(0.22, 0.55, uObs) * inside);
        float scan = (1.0 - smoothstep(0.0, 6.0, abs(p.y - (uBounds.y + mod(uTime * 260.0, uBounds.w))))) * uObs * inside;
        c += vec3(0.1, 0.45, 0.33) * scan;
        c += vec3(0.02, 0.10, 0.07) * uObs * inside;
        float f = clamp((length(vW - uCam) - uFogR.x) / (uFogR.y - uFogR.x), 0.0, 1.0);
        c = mix(c, uFog, f);
        float gg = dot(c, vec3(0.3, 0.59, 0.11));
        c = mix(c, vec3(gg) * 0.7, uMono);
        gl_FragColor = vec4(c, 1.0);
      }`;
    this.prog = this.program(vs, fs);
    this.progGround = this.program(vs, fsGround);
    this.dyn = gl.createBuffer();
    this.meshes = {
      box: this.mesh(this.boxData()),
      cyl: this.mesh(this.cylData(10)),
      cyl6: this.mesh(this.cylData(6)),
      sphere: this.mesh(this.sphereData(8, 6)),
      cone: this.mesh(this.coneData(8)),
      octa: this.mesh(this.octaData()),
      ring: this.mesh(this.torusData(24, 6, 1, 0.12)),
      plane: this.mesh(this.planeData()),
    };
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.frame = { light: this.norm([0.45, 0.85, 0.3]), fog: [0.02, 0.03, 0.06], fogR: [500, 1500], mono: 0 };
  },

  program(vsrc, fsrc) {
    const gl = this.gl;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vsrc)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fsrc));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.bindAttribLocation(p, 1, 'aNor');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  },

  // ---------- 도형 데이터 (면마다 법선 = 로우폴리 질감) ----------
  tri(out, a, b, c) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = this.norm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
    for (const p of [a, b, c]) out.push(p[0], p[1], p[2], n[0], n[1], n[2]);
  },
  quad(out, a, b, c, d) { this.tri(out, a, b, c); this.tri(out, a, c, d); },
  boxData() { // -0.5~0.5
    const o = [], h = 0.5, P = (x, y, z) => [x * h, y * h, z * h];
    this.quad(o, P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1));
    this.quad(o, P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1));
    this.quad(o, P(1, -1, 1), P(1, -1, -1), P(1, 1, -1), P(1, 1, 1));
    this.quad(o, P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1));
    this.quad(o, P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1), P(-1, 1, -1));
    this.quad(o, P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1));
    return this.fixWinding(o);
  },
  cylData(seg) { // 반지름 1, 높이 0~1
    const o = [];
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832;
      const p0 = [Math.cos(a0), 0, Math.sin(a0)], p1 = [Math.cos(a1), 0, Math.sin(a1)];
      this.quad(o, [p0[0], 0, p0[2]], [p0[0], 1, p0[2]], [p1[0], 1, p1[2]], [p1[0], 0, p1[2]]);
      this.tri(o, [0, 1, 0], [p1[0], 1, p1[2]], [p0[0], 1, p0[2]]);
      this.tri(o, [0, 0, 0], [p0[0], 0, p0[2]], [p1[0], 0, p1[2]]);
    }
    return this.fixWinding(o, 0.5);
  },
  coneData(seg) { // 밑면 반지름 1, 높이 0~1
    const o = [];
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832;
      const p0 = [Math.cos(a0), 0, Math.sin(a0)], p1 = [Math.cos(a1), 0, Math.sin(a1)];
      this.tri(o, p0, [0, 1, 0], p1);
      this.tri(o, [0, 0, 0], p0, p1);
    }
    return this.fixWinding(o, 0.3);
  },
  sphereData(seg, rings) { // 반지름 1
    const o = [], P = (i, j) => { const th = i / seg * 6.2832, ph = j / rings * Math.PI; return [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)]; };
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) this.quad(o, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1));
    return o.length ? this.fixWinding(o) : o;
  },
  fixWinding(o, oy = 0) { // 법선이 바깥(중심 0,oy,0 기준)을 향하도록
    for (let k = 0; k < o.length; k += 18) {
      const cx = (o[k] + o[k + 6] + o[k + 12]) / 3, cy = (o[k + 1] + o[k + 7] + o[k + 13]) / 3 - oy, cz = (o[k + 2] + o[k + 8] + o[k + 14]) / 3;
      if (o[k + 3] * cx + o[k + 4] * cy + o[k + 5] * cz < 0) for (let v = 0; v < 3; v++) { o[k + v * 6 + 3] *= -1; o[k + v * 6 + 4] *= -1; o[k + v * 6 + 5] *= -1; }
    }
    return o;
  },
  octaData() {
    const o = [], V = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const F = [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]];
    for (const f of F) this.tri(o, V[f[0]], V[f[1]], V[f[2]]);
    return this.fixWinding(o);
  },
  torusData(seg, sides, R, r) { // XZ 평면 고리
    const o = [], P = (i, j) => { const a = i / seg * 6.2832, b = j / sides * 6.2832; const rr = R + r * Math.cos(b); return [rr * Math.cos(a), r * Math.sin(b), rr * Math.sin(a)]; };
    for (let i = 0; i < seg; i++) for (let j = 0; j < sides; j++) this.quad(o, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1));
    // 고리 법선은 관 중심 기준으로 맞춤
    for (let k = 0; k < o.length; k += 6) { const x = o[k], y = o[k + 1], z = o[k + 2], l = Math.hypot(x, z) || 1; const n = this.norm([x - x / l * R, y, z - z / l * R]); o[k + 3] = n[0]; o[k + 4] = n[1]; o[k + 5] = n[2]; }
    return o;
  },
  planeData() { const o = []; this.quad(o, [-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, -0.5], [-0.5, 0, -0.5]); return this.fixWindingUp(o); },
  fixWindingUp(o) { for (let k = 3; k < o.length; k += 6) { o[k] = 0; o[k + 1] = 1; o[k + 2] = 0; } return o; },

  mesh(data) {
    const gl = this.gl, b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return { b, n: data.length / 6 };
  },

  // ---------- 행렬 (열 우선) ----------
  norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; },
  perspective(fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2), nf = 1 / (n - f);
    return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]);
  },
  lookAt(e, c, up) {
    const z = this.norm([e[0] - c[0], e[1] - c[1], e[2] - c[2]]);
    const x = this.norm([up[1] * z[2] - up[2] * z[1], up[2] * z[0] - up[0] * z[2], up[0] * z[1] - up[1] * z[0]]);
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1]);
  },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s;
    }
    return o;
  },
  // 위치 + 방향(게임 각도 a) + 크기 + 기울기(tilt: X축 회전)
  model(x, y, z, a = 0, sx = 1, sy = 1, sz = 1, tilt = 0) {
    const c = Math.cos(-a), s = Math.sin(-a);
    let m = new Float32Array([c * sx, 0, -s * sx, 0, 0, sy, 0, 0, s * sz, 0, c * sz, 0, x, y, z, 1]);
    if (tilt) {
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const r = new Float32Array([1, 0, 0, 0, 0, ct, st, 0, 0, -st, ct, 0, 0, 0, 0, 1]);
      // 크기·회전 뒤에 기울기 : T * Ry * Rx * S
      const T = new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, x, y, z, 1]);
      const S = new Float32Array([sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1]);
      m = this.mul(T, this.mul(r, S));
    }
    return m;
  },

  // ---------- 프레임 ----------
  begin(cam) {
    const gl = this.gl, cv = this.canvas;
    gl.viewport(0, 0, cv.width, cv.height);
    const f = this.frame.fog;
    gl.clearColor(f[0], f[1], f[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.proj = this.perspective(cam.fov, cv.width / cv.height, 5, 4000);
    this.view = this.lookAt(cam.eye, cam.target, [0, 1, 0]);
    this.vp = this.mul(this.proj, this.view);
    this.eye = cam.eye;
  },
  use(pr) {
    const gl = this.gl, F = this.frame;
    gl.useProgram(pr.p);
    gl.uniformMatrix4fv(pr.u.uVP, false, this.vp);
    if (pr.u.uLight) gl.uniform3fv(pr.u.uLight, F.light);
    gl.uniform3fv(pr.u.uCam, this.eye);
    gl.uniform3fv(pr.u.uFog, F.fog);
    gl.uniform2fv(pr.u.uFogR, F.fogR);
    gl.uniform1f(pr.u.uMono, F.mono);
    return pr;
  },
  bindMesh(m) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, m.b);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  },
  rgba(hex, a = 1) {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
  },

  ground(bounds, obs, time, base) {
    const gl = this.gl, pr = this.use(this.progGround);
    gl.uniform1f(pr.u.uObs, obs); gl.uniform1f(pr.u.uTime, time);
    gl.uniform4fv(pr.u.uBounds, [bounds.x, bounds.y, bounds.w, bounds.h]);
    gl.uniform3fv(pr.u.uBase, base);
    gl.uniformMatrix4fv(pr.u.uM, false, this.model(bounds.x + bounds.w / 2, 0, bounds.y + bounds.h / 2, 0, bounds.w + 3000, 1, bounds.h + 3000));
    this.bindMesh(this.meshes.plane);
    gl.drawArrays(gl.TRIANGLES, 0, this.meshes.plane.n);
  },

  // 도형 하나 그리기
  draw(meshName, M, color, emit = 0) {
    const gl = this.gl, pr = this.prog;
    if (this._cur !== pr) { this.use(pr); this._cur = pr; }
    gl.uniformMatrix4fv(pr.u.uM, false, M);
    gl.uniform4fv(pr.u.uColor, color);
    gl.uniform1f(pr.u.uEmit, emit);
    const m = this.meshes[meshName];
    this.bindMesh(m);
    gl.drawArrays(gl.TRIANGLES, 0, m.n);
  },
  resetProgram() { this._cur = null; },

  // 바닥 데칼 : 삼각형 목록(x,z 쌍 3개씩)을 높이 y에 그림
  decal(tris, y, color) {
    if (!tris.length) return;
    const gl = this.gl, pr = this.prog;
    if (this._cur !== pr) { this.use(pr); this._cur = pr; }
    const data = new Float32Array(tris.length / 2 * 6);
    for (let i = 0, k = 0; i < tris.length; i += 2, k += 6) { data[k] = tris[i]; data[k + 1] = y; data[k + 2] = tris[i + 1]; data[k + 3] = 0; data[k + 4] = 1; data[k + 5] = 0; }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dyn);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.uniformMatrix4fv(pr.u.uM, false, this.model(0, 0, 0));
    gl.uniform4fv(pr.u.uColor, color);
    gl.uniform1f(pr.u.uEmit, 1);
    gl.drawArrays(gl.TRIANGLES, 0, data.length / 6);
  },
  // 데칼 도형 만들기
  sector(x, z, r, dir, arc, seg = 24) {
    const t = [];
    if (arc >= 6.28) return this.circle(x, z, r, seg);
    const a0 = dir - arc / 2;
    for (let i = 0; i < seg; i++) {
      const a = a0 + arc * i / seg, b = a0 + arc * (i + 1) / seg;
      t.push(x, z, x + Math.cos(a) * r, z + Math.sin(a) * r, x + Math.cos(b) * r, z + Math.sin(b) * r);
    }
    return t;
  },
  circle(x, z, r, seg = 32) { return this._circle(x, z, r, seg); },
  _circle(x, z, r, seg) {
    const t = [];
    for (let i = 0; i < seg; i++) { const a = i / seg * 6.2832, b = (i + 1) / seg * 6.2832; t.push(x, z, x + Math.cos(a) * r, z + Math.sin(a) * r, x + Math.cos(b) * r, z + Math.sin(b) * r); }
    return t;
  },
  ringStrip(x, z, r1, r2, a0 = 0, arc = 6.2832, seg = 40) {
    const t = [];
    for (let i = 0; i < seg; i++) {
      const a = a0 + arc * i / seg, b = a0 + arc * (i + 1) / seg;
      const p = [x + Math.cos(a) * r1, z + Math.sin(a) * r1, x + Math.cos(a) * r2, z + Math.sin(a) * r2, x + Math.cos(b) * r2, z + Math.sin(b) * r2, x + Math.cos(b) * r1, z + Math.sin(b) * r1];
      t.push(p[0], p[1], p[2], p[3], p[4], p[5], p[0], p[1], p[4], p[5], p[6], p[7]);
    }
    return t;
  },
  rect(x, z, dir, len, w) {
    const c = Math.cos(dir), s = Math.sin(dir), hw = w / 2;
    const A = [x - s * hw, z + c * hw], B = [x + s * hw, z - c * hw], C = [B[0] + c * len, B[1] + s * len], D = [A[0] + c * len, A[1] + s * len];
    return [A[0], A[1], B[0], B[1], C[0], C[1], A[0], A[1], C[0], C[1], D[0], D[1]];
  },

  // 월드 → 화면 좌표 (오버레이 글자·체력바용)
  project(x, y, z) {
    const m = this.vp;
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 1) return null;
    return { x: (cx / cw * 0.5 + 0.5) * this.canvas.width, y: (1 - (cy / cw * 0.5 + 0.5)) * this.canvas.height, d: cw };
  },
};
