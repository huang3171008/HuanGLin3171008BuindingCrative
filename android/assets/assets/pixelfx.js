/* Dual-buffer PixelFX-inspired Canvas 2D particle engine (color + additive light layers).
   Visual only; respects prefers-reduced-motion, low quality setting, and document visibility. */
window.PixelFX = (() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let overlay = null, ctx = null, colorBuf = null, cctx = null, lightBuf = null, lctx = null;
  let raf = 0, last = 0, w = 0, h = 0;
  const particles = [], rings = [], slashes = [];
  const PIXEL = 3;

  function disabled() {
    if (document.hidden || reduce.matches) return true;
    const q = window.SkyRenderer?.getQuality?.();
    return q === 'low';
  }
  function density() {
    return window.SkyRenderer?.getQuality?.() === 'medium' ? 0.65 : 1;
  }

  function ensureCanvas() {
    if (!overlay) {
      overlay = document.createElement('canvas');
      overlay.id = 'pixelfx-canvas';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;z-index:32;pointer-events:none';
      document.body.append(overlay);
      ctx = overlay.getContext('2d', { alpha: true });
      colorBuf = document.createElement('canvas');
      cctx = colorBuf.getContext('2d', { alpha: true });
      lightBuf = document.createElement('canvas');
      lctx = lightBuf.getContext('2d', { alpha: true });
    }
    const nw = Math.max(1, Math.floor(innerWidth)), nh = Math.max(1, Math.floor(innerHeight));
    if (nw !== w || nh !== h) {
      w = nw; h = nh;
      overlay.width = w; overlay.height = h;
      colorBuf.width = Math.max(1, Math.ceil(w / PIXEL));
      colorBuf.height = Math.max(1, Math.ceil(h / PIXEL));
      lightBuf.width = colorBuf.width;
      lightBuf.height = colorBuf.height;
    }
  }

  function start() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function clearAll() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    particles.length = 0; rings.length = 0; slashes.length = 0;
    if (ctx) ctx.clearRect(0, 0, w, h);
  }

  function addParticle(p) {
    if (particles.length > 180) particles.shift();
    particles.push({
      x: p.x, y: p.y, vx: p.vx, vy: p.vy,
      drag: p.drag ?? 0.92, grav: p.grav ?? 0, swirl: p.swirl ?? 0,
      size: p.size ?? 2, color: p.color, glow: p.glow || p.color,
      shape: p.shape || 'sq', life: 0, maxLife: p.maxLife ?? 0.55
    });
  }

  function burstCard(x, y, school) {
    if (disabled()) return;
    ensureCanvas();
    const k = density();
    if (school === '强攻') {
      const n = Math.round(24 * k);
      const colors = ['#ff4e42', '#ff9638', '#ffe36e', '#fff6cc'];
      rings.push({ x, y, r: 8, maxR: 58, color: '#ff8533', light: '#ffe07d', sides: 0, life: 0, maxLife: 0.34, lw: 3 });
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.4;
        const spd = 110 + Math.random() * 190;
        addParticle({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 35, drag: 0.90, grav: 240, size: Math.random() < 0.35 ? 3 : 2, color: colors[i % colors.length], glow: '#ff9c42', shape: 'sq', maxLife: 0.45 + Math.random() * 0.35 });
      }
    } else if (school === '防守') {
      const n = Math.round(18 * k);
      const colors = ['#4ac7ff', '#9be8ff', '#dff7ff', '#ffffff'];
      rings.push({ x, y, r: 10, maxR: 56, color: '#58ccff', light: '#c7f2ff', sides: 6, life: 0, maxLife: 0.42, lw: 3 });
      rings.push({ x, y, r: 6, maxR: 38, color: '#ffffff', light: '#7ad8ff', sides: 6, life: 0, maxLife: 0.34, lw: 2 });
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.25;
        const spd = 75 + Math.random() * 115;
        addParticle({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, drag: 0.91, grav: 20, size: 2, color: colors[i % colors.length], glow: '#6cd6ff', shape: 'diamond', maxLife: 0.42 + Math.random() * 0.28 });
      }
    } else if (school === '回复') {
      const n = Math.round(18 * k);
      const colors = ['#35e08a', '#8affc3', '#e2ffcf', '#fff9c4'];
      rings.push({ x, y, r: 8, maxR: 48, color: '#42e093', light: '#b8ffd9', sides: 0, life: 0, maxLife: 0.4, lw: 2.5 });
      for (let i = 0; i < n; i++) {
        const ox = (Math.random() - 0.5) * 44, oy = (Math.random() - 0.5) * 26;
        addParticle({ x: x + ox, y: y + oy, vx: (Math.random() - 0.5) * 40, vy: -65 - Math.random() * 95, drag: 0.95, grav: -35, size: 2.5, color: colors[i % colors.length], glow: '#7affbe', shape: 'plus', maxLife: 0.55 + Math.random() * 0.35 });
      }
    } else {
      const n = Math.round(22 * k);
      const colors = ['#a96eff', '#df8cff', '#f6c8ff', '#9be4ff'];
      rings.push({ x, y, r: 8, maxR: 54, color: '#b474ff', light: '#f0b8ff', sides: 4, life: 0, maxLife: 0.4, lw: 2.5 });
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.3;
        const spd = 80 + Math.random() * 135;
        addParticle({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, drag: 0.91, swirl: i % 2 ? 3.2 : -3.2, size: 2, color: colors[i % colors.length], glow: '#d28aff', shape: i % 3 === 0 ? 'plus' : 'sq', maxLife: 0.48 + Math.random() * 0.34 });
      }
    }
    start();
  }

  function burstMove(x, y, move) {
    if (disabled()) return;
    ensureCanvas();
    const k = density();
    if (move === 'rock') {
      rings.push({ x, y, r: 10, maxR: 62, color: '#ff9d3b', light: '#ffe184', sides: 0, life: 0, maxLife: 0.36, lw: 3.5 });
      rings.push({ x, y, r: 6, maxR: 42, color: '#ffd166', light: '#fff3b8', sides: 0, life: 0, maxLife: 0.28, lw: 2 });
      const n = Math.round(20 * k);
      const colors = ['#ffb545', '#ff7b3b', '#ffe58f', '#d97a3a'];
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.35;
        const spd = 95 + Math.random() * 140;
        addParticle({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30, drag: 0.9, grav: 260, size: Math.random() < 0.4 ? 3 : 2, color: colors[i % colors.length], glow: '#ffc259', shape: 'sq', maxLife: 0.42 + Math.random() * 0.26 });
      }
    } else if (move === 'scissors') {
      slashes.push({ x, y, angle: Math.PI / 4, len: 68, color: '#39e5ff', light: '#e0fbff', life: 0, maxLife: 0.28 });
      slashes.push({ x, y, angle: -Math.PI / 4, len: 68, color: '#5cb8ff', light: '#ffffff', life: 0, maxLife: 0.28 });
      const n = Math.round(18 * k);
      const colors = ['#3be7ff', '#9bf0ff', '#ffffff', '#63a8ff'];
      for (let i = 0; i < n; i++) {
        const base = (i % 4) * (Math.PI / 2) + Math.PI / 4;
        const a = base + (Math.random() - 0.5) * 0.32;
        const spd = 120 + Math.random() * 150;
        addParticle({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, drag: 0.89, grav: 40, size: 2, color: colors[i % colors.length], glow: '#75f0ff', shape: 'diamond', maxLife: 0.34 + Math.random() * 0.24 });
      }
    } else {
      rings.push({ x, y, r: 10, maxR: 60, color: '#b47cff', light: '#f3d4ff', sides: 0, life: 0, maxLife: 0.42, lw: 3 });
      const n = Math.round(18 * k);
      const colors = ['#b882ff', '#e4b3ff', '#fff0ff', '#ffd6f5'];
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.25;
        const spd = 70 + Math.random() * 105;
        addParticle({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, drag: 0.93, grav: -20, swirl: 1.4, size: 2.5, color: colors[i % colors.length], glow: '#dfadff', shape: 'plus', maxLife: 0.48 + Math.random() * 0.3 });
      }
    }
    start();
  }

  function drawPoly(context, x, y, r, sides) {
    if (!sides) { context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.stroke(); return; }
    context.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) context.moveTo(px, py); else context.lineTo(px, py);
    }
    context.stroke();
  }

  function tick(now) {
    raf = 0;
    if (disabled()) { clearAll(); return; }
    const dt = Math.min(0.05, Math.max(0.004, (now - last) / 1000));
    last = now;

    const bw = colorBuf.width, bh = colorBuf.height;
    cctx.clearRect(0, 0, bw, bh);
    lctx.clearRect(0, 0, bw, bh);
    ctx.clearRect(0, 0, w, h);

    // 1. 更新并绘制双缓冲像素粒子（color 层 + additive light 层）
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) { particles.splice(i, 1); continue; }
      const t = p.life / p.maxLife;
      const dragPow = Math.pow(p.drag, dt * 60);
      if (p.swirl) {
        const ang = p.swirl * dt;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const nvx = p.vx * ca - p.vy * sa, nvy = p.vx * sa + p.vy * ca;
        p.vx = nvx; p.vy = nvy;
      }
      p.vx *= dragPow;
      p.vy = p.vy * dragPow + p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const alpha = t < 0.18 ? 1 : Math.pow(1 - (t - 0.18) / 0.82, 1.6);
      const gx = Math.round(p.x / PIXEL), gy = Math.round(p.y / PIXEL);
      const sz = Math.max(1, Math.round(p.size * (1 - t * 0.45)));

      cctx.globalAlpha = alpha;
      cctx.fillStyle = p.color;
      if (p.shape === 'plus') {
        cctx.fillRect(gx - sz, gy, sz * 2 + 1, 1);
        cctx.fillRect(gx, gy - sz, 1, sz * 2 + 1);
      } else if (p.shape === 'diamond') {
        cctx.fillRect(gx, gy - 1, 1, 3);
        cctx.fillRect(gx - 1, gy, 3, 1);
      } else {
        cctx.fillRect(gx - Math.floor(sz / 2), gy - Math.floor(sz / 2), sz, sz);
      }

      lctx.globalCompositeOperation = 'lighter';
      lctx.globalAlpha = alpha * 0.72;
      lctx.fillStyle = p.glow;
      lctx.fillRect(gx - sz, gy - sz, sz * 2 + 1, sz * 2 + 1);
    }

    // 合成像素层与发光层到主叠加画布
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(colorBuf, 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(lightBuf, 0, 0, w, h);

    // 2. 矢量震荡环与斩击光刃
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.life += dt;
      if (r.life >= r.maxLife) { rings.splice(i, 1); continue; }
      const t = r.life / r.maxLife;
      const ease = 1 - Math.pow(1 - t, 3);
      const rad = r.r + (r.maxR - r.r) * ease;
      const a = Math.pow(1 - t, 1.4);
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(1, r.lw * (1 - t * 0.5));
      drawPoly(ctx, r.x, r.y, rad, r.sides);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a * 0.65;
      ctx.strokeStyle = r.light;
      ctx.lineWidth = Math.max(1, r.lw * 1.6 * (1 - t * 0.5));
      drawPoly(ctx, r.x, r.y, rad, r.sides);
      ctx.restore();
    }

    for (let i = slashes.length - 1; i >= 0; i--) {
      const s = slashes[i];
      s.life += dt;
      if (s.life >= s.maxLife) { slashes.splice(i, 1); continue; }
      const t = s.life / s.maxLife;
      const ease = 1 - Math.pow(1 - t, 2.6);
      const half = (s.len * 0.5) * ease;
      const a = Math.pow(1 - t, 1.3);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(-half, 0);
      ctx.quadraticCurveTo(0, -4.5 * (1 - t * 0.6), half, 0);
      ctx.quadraticCurveTo(0, 4.5 * (1 - t * 0.6), -half, 0);
      ctx.fill();
      ctx.fillStyle = s.light;
      ctx.beginPath();
      ctx.moveTo(-half * 0.72, 0);
      ctx.quadraticCurveTo(0, -2 * (1 - t * 0.5), half * 0.72, 0);
      ctx.quadraticCurveTo(0, 2 * (1 - t * 0.5), -half * 0.72, 0);
      ctx.fill();
      ctx.restore();
    }

    if (particles.length || rings.length || slashes.length) {
      raf = requestAnimationFrame(tick);
    }
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) clearAll(); });
  reduce.addEventListener?.('change', () => { if (reduce.matches) clearAll(); });

  return { burstCard, burstMove, clear: clearAll };
})();
