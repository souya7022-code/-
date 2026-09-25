/* ============================================================
   CLAUDE — MOTION DESIGN SHOWREEL 2026
   15s / 1920x1080 / 60fps / 128BPM
   Every frame is a pure function of time: Reel.draw(t)
   ============================================================ */
(function () {
  'use strict';

  const W = 1920, H = 1080, FPS = 60, DUR = 15;
  const BPM = 128, BEAT = 60 / BPM, BAR = BEAT * 4;
  const TAU = Math.PI * 2;
  const C = {
    bg: '#0A0A0C', ink: '#F4EFE6', lime: '#C8FF2E', coral: '#FF4A1C',
    violet: '#6C4DFF', sky: '#2EC8FF', panel: '#141419', line: '#2A2A33', mute: '#8A8A99',
  };
  const SANS = 'Inter Tight', MONO = 'JetBrains Mono', SERIF = 'Instrument Serif', JP = 'Noto Sans JP';
  const font = (w, s, fam = SANS, st = '') => `${st} ${w} ${s}px "${fam}"`.trim();

  // ---------- math ----------
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    linear: t => t,
    inCubic: t => t * t * t,
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inQuart: t => t * t * t * t,
    outQuart: t => 1 - Math.pow(1 - t, 4),
    outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
    outBack: (t, s = 1.70158) => (t <= 0 ? 0 : 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2)),
    outElastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
  };
  // damped spring, t in seconds
  const spring = (t, f = 2.5, d = 7) => (t <= 0 ? 0 : 1 - Math.exp(-d * t) * Math.cos(TAU * f * t));
  // decaying pulse after time h
  const pulse = (t, h, k = 8) => (t < h ? 0 : Math.exp(-(t - h) * k));

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash = (a, b) => { const r = mulberry32((a * 73856093) ^ (b * 19349663)); r(); return r(); };

  function mkCanvas(w = W, h = H) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // ---------- typography ----------
  const layoutCache = new Map();
  function layout(ctx, str, f, track = 0) {
    const key = f + '|' + str + '|' + track;
    let L = layoutCache.get(key);
    if (L) return L;
    ctx.save();
    ctx.font = f;
    ctx.letterSpacing = '0px';
    const xs = [], ws = [];
    for (let i = 0; i < str.length; i++) {
      xs.push(ctx.measureText(str.slice(0, i)).width + i * track);
      ws.push(ctx.measureText(str[i]).width);
    }
    const width = ctx.measureText(str).width + (str.length - 1) * track;
    ctx.restore();
    L = { xs, ws, width };
    layoutCache.set(key, L);
    return L;
  }
  // per-letter animated text. fn(i,n) -> {dx,dy,sx,sy,rot,alpha,color,ch}
  function letters(ctx, str, f, x0, baseline, color, fn, track = 0, stroke = 0) {
    const L = layout(ctx, str, f, track);
    ctx.save();
    ctx.font = f;
    ctx.letterSpacing = '0px';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < str.length; i++) {
      const o = fn ? fn(i, str.length) : {};
      if (o.alpha !== undefined && o.alpha <= 0) continue;
      ctx.save();
      ctx.translate(x0 + L.xs[i] + L.ws[i] / 2 + (o.dx || 0), baseline + (o.dy || 0));
      if (o.rot) ctx.rotate(o.rot);
      if (o.sx !== undefined || o.sy !== undefined) ctx.scale(o.sx ?? 1, o.sy ?? 1);
      ctx.globalAlpha *= o.alpha ?? 1;
      const ch = o.ch || str[i];
      if (stroke) {
        ctx.strokeStyle = o.color || color; ctx.lineWidth = stroke; ctx.lineJoin = 'round';
        ctx.strokeText(ch, 0, 0);
      } else {
        ctx.fillStyle = o.color || color;
        ctx.fillText(ch, 0, 0);
      }
      ctx.restore();
    }
    ctx.restore();
    return L;
  }
  function fitSize(ctx, str, weight, fam, maxW, maxS, st = '') {
    ctx.save();
    ctx.font = font(weight, 100, fam, st);
    const w = ctx.measureText(str).width;
    ctx.restore();
    return Math.min(maxS, (maxW / w) * 100);
  }
  function label(ctx, str, x, y, color, size = 16, align = 'left', weight = 700, track = 3) {
    ctx.save();
    ctx.font = font(weight, size, MONO);
    ctx.letterSpacing = track + 'px';
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&*+=?@/<>';
  function scramble(str, u, start, per, settle, seed = 1) {
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const on = start + i * per;
      if (u < on) { out += ' '; continue; }
      if (str[i] === ' ' || u >= on + settle) { out += str[i]; continue; }
      out += GLYPHS[Math.floor(hash(i + seed * 100, Math.floor(u * 40)) * GLYPHS.length)];
    }
    return out;
  }

  // ---------- helpers ----------
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function bg(ctx, col) { ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); }

  /* ============================================================
     SCENE 0 — IGNITION (0.000 – 1.875)
     dot → anticipation → stretch → slit reveal → slice glitch
     ============================================================ */
  const S0_SLICES = (() => { const r = mulberry32(11); return Array.from({ length: 9 }, () => ({ o: (r() * 2 - 1), inv: r() < 0.35 })); })();

  function s0Content(ctx, u, invert) {
    const cx = W / 2, cy = H / 2;
    const fg = invert ? C.lime : C.bg, back = invert ? C.bg : C.lime;
    ctx.fillStyle = back; ctx.fillRect(0, 0, W, H);
    const size = 340, f = font(900, size);
    const L = layout(ctx, 'MOTION', f, -6);
    letters(ctx, 'MOTION', f, cx - L.width / 2, cy - 70 + size * 0.36, fg, (i) => {
      const p = E.outExpo(prog(u, 0.97 + i * 0.03, 1.45 + i * 0.03));
      return { dy: (1 - p) * 420, rot: (1 - p) * 0.25 * (i % 2 ? 1 : -1) };
    }, -6);
    const sf = font(400, 250, SERIF, 'italic');
    const L2 = layout(ctx, 'design', sf, 0);
    letters(ctx, 'design', sf, cx + 120 - L2.width / 2, cy + 230, invert ? C.ink : C.bg, (i) => {
      const p = E.outExpo(prog(u, 1.406 + i * 0.022, 1.75 + i * 0.022));
      return { dx: (1 - p) * 140, alpha: prog(u, 1.406 + i * 0.022, 1.46 + i * 0.022), rot: (1 - p) * 0.1 };
    });
    // micro labels
    const la = prog(u, 1.1, 1.2);
    if (la > 0) {
      ctx.globalAlpha = la;
      label(ctx, '(00)', 120, 150, fg, 18);
      label(ctx, 'HELLO — I MAKE THINGS MOVE', W - 120, 150, fg, 18, 'right');
      label(ctx, '↓ SHOWREEL 2026', 120, H - 120, fg, 18);
      ctx.globalAlpha = 1;
    }
  }

  function scene0(ctx, t) {
    const u = t, cx = W / 2, cy = H / 2;
    bg(ctx, C.bg);
    // shockwave ring from ignition
    const pr = prog(u, 0.03, 0.85);
    if (pr > 0 && pr < 1) {
      ctx.strokeStyle = C.lime; ctx.globalAlpha = 1 - pr; ctx.lineWidth = 3 * (1 - pr) + 0.5;
      circle(ctx, cx, cy, 24 + 560 * E.outExpo(pr)); ctx.stroke();
      circle(ctx, cx, cy, 24 + 300 * E.outExpo(prog(u, 0.1, 0.8))); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (u < BEAT) {
      const s = E.outBack(prog(u, 0.0, 0.3), 2.6);
      const a = E.inOutCubic(prog(u, 0.32, BEAT)); // anticipation
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s * (1 - 0.4 * a), s * (1 + 0.35 * a));
      ctx.fillStyle = C.lime; circle(ctx, 0, 0, 22); ctx.fill();
      ctx.restore();
    } else if (u < 2 * BEAT + 0.02) {
      const l = cx - 1010 * E.outExpo(prog(u, BEAT + 0.04, 0.9));
      const r = cx + 1010 * E.outExpo(prog(u, BEAT, 0.72));
      const th = lerp(44, 4, E.outExpo(prog(u, BEAT, 0.66)));
      ctx.fillStyle = C.lime;
      ctx.beginPath(); ctx.roundRect(l - th / 2, cy - th / 2, r - l + th, th, th / 2); ctx.fill();
    }
    if (u >= 2 * BEAT) {
      const h = lerp(4, H + 4, E.outExpo(prog(u, 2 * BEAT, 2 * BEAT + 0.42)));
      const g = E.inExpo(prog(u, 1.56, 1.875));
      if (g <= 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, cy - h / 2, W, h); ctx.clip();
        s0Content(ctx, u, false);
        ctx.restore();
      } else {
        const n = S0_SLICES.length, sh = H / n;
        for (let k = 0; k < n; k++) {
          const sl = S0_SLICES[k];
          ctx.save(); ctx.beginPath(); ctx.rect(0, k * sh, W, sh + 1); ctx.clip();
          ctx.translate(sl.o * g * W * 0.7, 0);
          s0Content(ctx, u, sl.inv && g > 0.15);
          ctx.restore();
        }
      }
    }
  }

  /* ============================================================
     SCENE 1 — KINETIC TYPE (1.875 – 3.75)
     EVERY / SINGLE / FRAME / matters.
     ============================================================ */
  function scene1(ctx, t) {
    const u = t - BAR, cx = W / 2, cy = H / 2;
    const bi = u < BEAT ? 0 : u < 2 * BEAT ? 1 : u < 3 * BEAT ? 2 : 3;
    const lu = u - bi * BEAT;
    const zoom = 1 + 0.06 * lu;
    ctx.save();
    if (bi === 0) {
      bg(ctx, C.coral);
      const s = fitSize(ctx, 'EVERY', 900, SANS, 1560, 420), f = font(900, s);
      const pop = 1 + 0.3 * (1 - E.outExpo(prog(lu, 0, 0.4)));
      ctx.translate(cx, cy); ctx.scale(zoom * pop, zoom * pop); ctx.translate(-cx, -cy);
      const L = layout(ctx, 'EVERY', f, -8);
      letters(ctx, 'EVERY', f, cx - L.width / 2, cy + s * 0.36, C.ink, (i) => {
        const p = E.outExpo(prog(lu, i * 0.028, 0.34 + i * 0.028));
        return { dy: (1 - p) * 360, sx: 1, sy: lerp(1.6, 1, p) };
      }, -8);
      label(ctx, '[ TYPE IN MOTION ]', 120, H - 120, C.bg, 18);
    } else if (bi === 1) {
      bg(ctx, C.ink);
      const s = fitSize(ctx, 'SINGLE', 900, SANS, 1600, 420), f = font(900, s);
      ctx.translate(cx, cy); ctx.scale(zoom, zoom);
      ctx.transform(1, 0, -0.18 * pulse(lu, 0.234, 10), 1, 0, 0);
      ctx.translate(-cx, -cy);
      const L = layout(ctx, 'SINGLE', f, -8);
      letters(ctx, 'SINGLE', f, cx - L.width / 2, cy + s * 0.36, C.bg, (i) => {
        const p = E.outBack(prog(lu, i * 0.03, 0.26 + i * 0.03), 2.4);
        return { sy: p, sx: lerp(1.4, 1, clamp(p)) };
      }, -8);
    } else if (bi === 2) {
      bg(ctx, C.violet);
      const s = fitSize(ctx, 'FRAME', 900, SANS, 1560, 420), f = font(900, s);
      ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);
      const L = layout(ctx, 'FRAME', f, -8);
      letters(ctx, 'FRAME', f, cx - L.width / 2, cy - 30 + s * 0.36, C.lime, (i) => {
        const sp = spring(lu - i * 0.035, 2.4, 7.5);
        return { dy: (1 - sp) * -760, rot: (1 - sp) * 0.3 };
      }, -8);
      const fr = Math.round(t * FPS);
      const a = prog(lu, 0.12, 0.2);
      ctx.globalAlpha = a;
      label(ctx, `FRAME ${String(fr).padStart(4, '0')} / 0900`, cx, cy + 250, C.lime, 30, 'center', 700, 10);
      // ruler ticks
      ctx.fillStyle = C.lime;
      for (let k = -40; k <= 40; k++) {
        const x = cx + k * 18 - ((t * FPS) % 1) * 18;
        const hh = k % 5 === 0 ? 22 : 10;
        ctx.globalAlpha = a * (1 - Math.abs(k) / 42);
        ctx.fillRect(x - 1, cy + 290, 2, hh);
      }
      ctx.globalAlpha = 1;
    } else {
      bg(ctx, C.bg);
      const f = font(400, 440, SERIF, 'italic');
      ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);
      const L = layout(ctx, 'matters.', f, 0);
      const x0 = cx - L.width / 2, base = cy + 110;
      letters(ctx, 'matters.', f, x0, base, C.ink, (i) => {
        const p = E.outExpo(prog(lu, i * 0.022, 0.45 + i * 0.022));
        return { dx: (1 - p) * 520, alpha: prog(lu, i * 0.022, 0.06 + i * 0.022), color: i === 7 ? C.lime : C.ink };
      });
      const ul = E.outExpo(prog(lu, 0.2, 0.55));
      ctx.fillStyle = C.lime;
      ctx.fillRect(x0 + 10, base + 50, (L.width - 20) * ul, 14);
      label(ctx, '— EVERY SINGLE FRAME', x0 + 10, base - 330, C.mute, 20, 'left', 700, 6);
    }
    ctx.restore();
  }

  /* ============================================================
     SCENE 2 — FORM & MORPH (3.75 – 5.625)
     ============================================================ */
  const NS = 240;
  function polyR(verts) {
    const out = new Float32Array(NS);
    for (let k = 0; k < NS; k++) {
      const th = (k / NS) * TAU, dx = Math.cos(th), dy = Math.sin(th);
      let best = 1e9;
      for (let e = 0; e < verts.length; e++) {
        const a = verts[e], b = verts[(e + 1) % verts.length];
        const ex = b[0] - a[0], ey = b[1] - a[1];
        const den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const s = (a[0] * ey - a[1] * ex) / den;
        const w = (a[0] * dy - a[1] * dx) / den;
        if (s > 0 && w >= -1e-6 && w <= 1 + 1e-6 && s < best) best = s;
      }
      out[k] = best;
    }
    return out;
  }
  const ngon = (n, r, rot, r2) => Array.from({ length: r2 ? n * 2 : n }, (_, i) => {
    const a = rot + (i / (r2 ? n * 2 : n)) * TAU;
    const rr = r2 && i % 2 ? r2 : r;
    return [Math.cos(a) * rr, Math.sin(a) * rr];
  });
  const SHAPES = [
    new Float32Array(NS).fill(1),
    polyR(ngon(4, 1.18, Math.PI / 4)),
    polyR(ngon(3, 1.3, -Math.PI / 2)),
    polyR(ngon(5, 1.28, -Math.PI / 2, 0.55)),
    new Float32Array(NS).fill(1),
  ];
  function shapeState(u) {
    let r = SHAPES[0], rot = 0;
    const out = new Float32Array(NS);
    out.set(r);
    for (let k = 0; k < 4; k++) {
      const p = E.outBack(prog(u, k * BEAT, k * BEAT + 0.36), 1.5);
      if (p <= 0) break;
      const A = SHAPES[k], B = SHAPES[k + 1];
      for (let i = 0; i < NS; i++) out[i] = lerp(A[i], B[i], p);
      rot += p * (Math.PI / 2) * (k % 2 ? -1 : 1) * 1.5;
    }
    const s = E.outBack(prog(u, -0.12, 0.22), 2.2) * (1 + 16 * E.inExpo(prog(u, 1.5, 1.875)));
    return { r: out, rot, s };
  }
  function drawShape(ctx, st, R, cx, cy) {
    ctx.beginPath();
    for (let i = 0; i <= NS; i++) {
      const k = i % NS, th = (k / NS) * TAU + st.rot;
      const rr = st.r[k] * R * st.s;
      const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  const ECHO = [C.violet, C.sky, C.lime, C.coral, C.violet, C.coral];
  function scene2(ctx, t) {
    const u = t - 2 * BAR, cx = W / 2, cy = H / 2, R = 280;
    bg(ctx, C.ink);
    // plus grid
    let gr = 0;
    for (let k = 0; k < 4; k++) gr += E.outBack(prog(u, k * BEAT, k * BEAT + 0.4), 2) * (Math.PI / 4);
    ctx.strokeStyle = 'rgba(10,10,12,0.16)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let gx = 0; gx < 25; gx++) for (let gy = 0; gy < 14; gy++) {
      const x = 0 + gx * 80, y = 20 + gy * 80;
      const c = Math.cos(gr), s = Math.sin(gr), L = 7;
      ctx.moveTo(x - c * L, y - s * L); ctx.lineTo(x + c * L, y + s * L);
      ctx.moveTo(x + s * L, y - c * L); ctx.lineTo(x - s * L, y + c * L);
    }
    ctx.stroke();
    // guide ring + orbiting dot
    const st = shapeState(u);
    const ga = (1 - prog(u, 1.4, 1.6)) * prog(u, 0.05, 0.3);
    if (ga > 0) {
      ctx.globalAlpha = ga;
      ctx.setLineDash([4, 10]); ctx.strokeStyle = 'rgba(10,10,12,0.4)'; ctx.lineWidth = 2;
      circle(ctx, cx, cy, R * 1.6); ctx.stroke(); ctx.setLineDash([]);
      const oa = u * 3.2;
      ctx.fillStyle = C.coral; circle(ctx, cx + Math.cos(oa) * R * 1.6, cy + Math.sin(oa) * R * 1.6, 12); ctx.fill();
      // measurement annotation
      ctx.strokeStyle = C.bg; ctx.lineWidth = 2;
      const ax = cx + R * 1.6 + 60;
      ctx.beginPath(); ctx.moveTo(ax, cy - R); ctx.lineTo(ax, cy + R); ctx.moveTo(ax - 10, cy - R); ctx.lineTo(ax + 10, cy - R); ctx.moveTo(ax - 10, cy + R); ctx.lineTo(ax + 10, cy + R); ctx.stroke();
      const deg = Math.round((st.rot * 180) / Math.PI);
      label(ctx, `r ${Math.round(R * st.s)}px`, ax + 24, cy - 8, C.bg, 18);
      label(ctx, `θ ${deg}°`, ax + 24, cy + 22, C.bg, 18);
      const names = ['CIRCLE', 'SQUARE', 'TRIANGLE', 'STAR', 'CIRCLE'];
      const idx = clamp(Math.floor((u + 0.05) / BEAT) + 1, 0, 4);
      label(ctx, `SHAPE / ${names[u < 0 ? 0 : idx]}`, cx - R * 1.6 - 60, cy + 8, C.bg, 18, 'right');
      ctx.globalAlpha = 1;
    }
    // echoes
    for (let j = ECHO.length; j >= 1; j--) {
      const e = shapeState(u - j * 0.028);
      ctx.fillStyle = ECHO[j - 1];
      drawShape(ctx, e, R, cx, cy); ctx.fill();
    }
    ctx.fillStyle = C.bg;
    drawShape(ctx, st, R, cx, cy); ctx.fill();
    // center cross
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.globalAlpha = ga;
    ctx.beginPath(); ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* ============================================================
     SCENE 3 — PARTICLES (5.625 – 7.5)
     ============================================================ */
  let P3 = null;
  function initParticles() {
    const c = mkCanvas(W, H), x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; x.font = font(900, 560); x.textAlign = 'center';
    x.fillText('FLOW', W / 2, H / 2 + 560 * 0.36);
    const d = x.getImageData(0, 0, W, H).data;
    const pts = [], step = 9;
    for (let y = 0; y < H; y += step) for (let xx = 0; xx < W; xx += step) if (d[(y * W + xx) * 4 + 3] > 128) pts.push([xx, y]);
    const r = mulberry32(3);
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
    let minx = 1e9, maxx = -1e9;
    for (const p of pts) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); }
    P3 = pts.map((p) => {
      const q = r();
      return {
        tx: p[0] + (r() - 0.5) * 3, ty: p[1] + (r() - 0.5) * 3,
        a: r() * TAU, sp: 250 + 1700 * Math.pow(r(), 1.6),
        d: 0.22 * (p[0] - minx) / (maxx - minx) + 0.06 * r(),
        ph: r() * TAU, sz: 2.2 + r() * 2.8,
        col: q < 0.1 ? 2 : q < 0.2 ? 1 : 0,
      };
    });
  }
  function p3pos(p, u) {
    const cx = W / 2, cy = H / 2, k = 4.2;
    const tb = Math.max(0, u);
    const dist = (p.sp * (1 - Math.exp(-k * tb))) / k;
    const a = p.a + tb * 0.9;
    let x = cx + Math.cos(a) * dist, y = cy + Math.sin(a) * dist;
    const f = E.outExpo(prog(u, 0.26 + p.d, 0.95 + p.d));
    x = lerp(x, p.tx, f); y = lerp(y, p.ty, f);
    x += Math.sin(u * 5 + p.ph) * 1.8 * f; y += Math.cos(u * 4.3 + p.ph) * 1.8 * f;
    const pl = 0.05 * pulse(u, 2 * BEAT, 9) + 0.03 * pulse(u, 3 * BEAT, 9);
    x = cx + (x - cx) * (1 + pl); y = cy + (y - cy) * (1 + pl);
    const v = prog(u, 1.36 + p.d * 0.35, 1.82);
    if (v > 0) {
      const dx = x - cx, dy = y - cy;
      let rr = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      const e = E.inCubic(v);
      rr *= 1 - e; th += e * 4 + v * v * 3;
      x = cx + Math.cos(th) * rr; y = cy + Math.sin(th) * rr;
    }
    return [x, y];
  }
  const P3COL = [C.ink, C.lime, C.coral];
  function scene3(ctx, t) {
    const u = t - 3 * BAR, cx = W / 2, cy = H / 2;
    bg(ctx, C.bg);
    // radial flash on burst
    const fl = pulse(u, 0, 6);
    if (fl > 0.01) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 900);
      g.addColorStop(0, `rgba(200,255,46,${0.35 * fl})`); g.addColorStop(1, 'rgba(200,255,46,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.lineCap = 'round';
    const dt = 1 / 70;
    for (let c = 0; c < 3; c++) {
      for (let big = 0; big < 2; big++) {
        ctx.beginPath();
        for (const p of P3) {
          if (p.col !== c || (p.sz > 3.6) !== !!big) continue;
          const [x, y] = p3pos(p, u);
          const [px, py] = p3pos(p, u - dt);
          ctx.moveTo(px, py); ctx.lineTo(x + 0.2, y + 0.2);
        }
        ctx.strokeStyle = P3COL[c]; ctx.lineWidth = big ? 4.8 : 2.8;
        ctx.stroke();
      }
    }
    // core glow + seed dot for the next scene
    const v = prog(u, 1.5, 1.85);
    if (v > 0) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 260);
      g.addColorStop(0, `rgba(200,255,46,${0.5 * v})`); g.addColorStop(1, 'rgba(200,255,46,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = C.lime; circle(ctx, cx, cy, 16 * E.outBack(prog(u, 1.7, 1.86), 2)); ctx.fill();
    }
    const la = prog(u, 0.3, 0.5) * (1 - prog(u, 1.4, 1.6));
    if (la > 0) {
      ctx.globalAlpha = la;
      label(ctx, `n = ${P3.length.toLocaleString('en-US')}`, 120, H - 170, C.mute, 18);
      label(ctx, 'drag 4.2 · ease expo.out · stagger x', 120, H - 140, C.mute, 18);
      ctx.globalAlpha = 1;
    }
  }

  /* ============================================================
     SCENE 4 — DEPTH (7.5 – 9.375)  sphere → torus → cube → wave
     ============================================================ */
  const ROWS = 20, COLS = 36;
  const G4 = [];
  (function () {
    for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) {
      const lat = -Math.PI / 2 + (Math.PI * (i + 0.5)) / ROWS, lon = (TAU * j) / COLS;
      const d = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
      const m = Math.max(Math.abs(d[0]), Math.abs(d[1]), Math.abs(d[2]));
      const v = (TAU * i) / ROWS, Rt = 280, rt = 115;
      G4.push({
        sph: d.map(q => q * 330),
        tor: [(Rt + rt * Math.cos(v)) * Math.cos(lon), rt * Math.sin(v), (Rt + rt * Math.cos(v)) * Math.sin(lon)],
        cub: d.map(q => (q / m) * 240),
        px: (j / (COLS - 1) - 0.5) * 1300, pz: (i / (ROWS - 1) - 0.5) * 900,
      });
    }
  })();
  function scene4(ctx, t) {
    const u = t - 4 * BAR, cx = W / 2, cy = H / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 1100);
    g.addColorStop(0, '#24145F'); g.addColorStop(0.6, '#0F0A24'); g.addColorStop(1, C.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // parallax type
    ctx.save();
    ctx.font = font(900, 460); ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(140,110,255,0.35)'; ctx.lineWidth = 2;
    ctx.translate(cx - u * 60, cy); ctx.scale(1 + u * 0.05, 1 + u * 0.05);
    ctx.globalAlpha = prog(u, 0.1, 0.4);
    ctx.strokeText('DEPTH', 0, 460 * 0.36);
    ctx.restore();

    const e1 = E.inOutExpo(prog(u, BEAT - 0.03, BEAT + 0.36));
    const e2 = E.inOutExpo(prog(u, 2 * BEAT - 0.03, 2 * BEAT + 0.36));
    const e3 = E.inOutExpo(prog(u, 3 * BEAT - 0.03, 3 * BEAT + 0.4));
    const sc = E.outBack(prog(u, 0, 0.4), 1.6);
    let ry = u * 0.8, rx = lerp(0.42 + 0.18 * Math.sin(u * 1.4), 0.62, e3);
    for (let k = 1; k < 4; k++) ry += E.outExpo(prog(u, k * BEAT, k * BEAT + 0.6)) * 0.8;
    const cyr = Math.cos(ry), syr = Math.sin(ry), cxr = Math.cos(rx), sxr = Math.sin(rx);
    const F = 1000, Z = 1180;
    const pts = new Array(G4.length);
    for (let n = 0; n < G4.length; n++) {
      const q = G4[n];
      let x = q.sph[0], y = q.sph[1], z = q.sph[2];
      x = lerp(x, q.tor[0], e1); y = lerp(y, q.tor[1], e1); z = lerp(z, q.tor[2], e1);
      x = lerp(x, q.cub[0], e2); y = lerp(y, q.cub[1], e2); z = lerp(z, q.cub[2], e2);
      const wy = 70 * Math.sin(q.px * 0.008 + u * 7) * Math.cos(q.pz * 0.006 + u * 3);
      x = lerp(x, q.px, e3); y = lerp(y, wy, e3); z = lerp(z, q.pz, e3);
      x *= sc; y *= sc; z *= sc;
      const x1 = x * cyr - z * syr, z1 = x * syr + z * cyr;
      const y2 = y * cxr - z1 * sxr, z2 = y * sxr + z1 * cxr;
      const zz = z2 + Z, pf = F / zz;
      pts[n] = [cx + x1 * pf, cy + y2 * pf, zz];
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.4;
    // rings
    ctx.strokeStyle = 'rgba(120,95,255,0.55)';
    ctx.beginPath();
    for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) {
      const a = pts[i * COLS + j];
      if (j === COLS - 1 && e3 > 0.5) continue;
      const b = pts[i * COLS + ((j + 1) % COLS)];
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
    // meridians
    ctx.strokeStyle = 'rgba(200,255,46,0.22)';
    ctx.beginPath();
    for (let j = 0; j < COLS; j++) for (let i = 0; i < ROWS - 1; i++) {
      const a = pts[i * COLS + j], b = pts[(i + 1) * COLS + j];
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
    // points
    const front = new Path2D(), back = new Path2D();
    for (const p of pts) {
      const r = Math.max(0.8, (F / p[2]) * 3.2);
      const path = p[2] < Z ? front : back;
      path.moveTo(p[0] + r, p[1]); path.arc(p[0], p[1], r, 0, TAU);
    }
    ctx.fillStyle = 'rgba(140,110,255,0.8)'; ctx.fill(back);
    ctx.fillStyle = C.lime; ctx.fill(front);
    ctx.restore();

    // axis gizmo
    const ox = 190, oy = H - 190, L = 60;
    const axes = [[1, 0, 0, C.coral, 'X'], [0, -1, 0, C.lime, 'Y'], [0, 0, 1, C.sky, 'Z']];
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const [ax, ay, az, col, nm] of axes) {
      const x1 = ax * cyr - az * syr, z1 = ax * syr + az * cyr;
      const y2 = ay * cxr - z1 * sxr;
      ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + x1 * L, oy + y2 * L); ctx.stroke();
      label(ctx, nm, ox + x1 * (L + 18) - 5, oy + y2 * (L + 18) + 6, col, 14, 'left', 700, 0);
    }
    const names = ['SPHERE', 'TORUS', 'CUBE', 'FIELD'];
    const idx = clamp(Math.floor(u / BEAT), 0, 3);
    label(ctx, `MESH / ${names[idx]} · ${G4.length} VERTS`, 290, H - 182, C.mute, 16);
    label(ctx, `rotY ${(ry % TAU).toFixed(2)}  rotX ${rx.toFixed(2)}`, 290, H - 156, C.mute, 16);
  }

  /* ============================================================
     SCENE 5 — TIMING (9.375 – 11.25)  graph editor
     ============================================================ */
  function bez(p1x, p1y, p2x, p2y) {
    const bx = s => 3 * (1 - s) * (1 - s) * s * p1x + 3 * (1 - s) * s * s * p2x + s * s * s;
    const by = s => 3 * (1 - s) * (1 - s) * s * p1y + 3 * (1 - s) * s * s * p2y + s * s * s;
    return {
      bx, by,
      y(x) { let lo = 0, hi = 1; for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (bx(m) < x) lo = m; else hi = m; } return by((lo + hi) / 2); },
    };
  }
  const CA = [0.7, 0.0, 0.2, 1.0], CB = [0.34, 1.56, 0.64, 1.0];
  function curveAt(u) {
    const m = E.outExpo(prog(u, 2 * BEAT, 2 * BEAT + 0.4));
    return CA.map((v, i) => lerp(v, CB[i], m));
  }
  const S5 = { gx: 150, gy: 230, gw: 900, gh: 640, tx0: 1170, tx1: 1730, ty: 700, br: 28 };
  const S5T0 = 0.32, S5P = 2 * BEAT;
  function ballAt(u) {
    const cv = curveAt(u), b = bez(...cv);
    if (u < S5T0) return { v: 0, ph: 0, cyc: 0 };
    const q = (u - S5T0) / S5P, cyc = Math.floor(q), ph = clamp(((q - cyc) - 0.06) / 0.86);
    let v = b.y(ph);
    if (cyc % 2) v = 1 - v;
    return { v, ph, cyc };
  }
  function ballPos(t) {
    const u = t - 5 * BAR, b = ballAt(u);
    return [lerp(S5.tx0, S5.tx1, b.v), S5.ty];
  }
  function scene5(ctx, t) {
    const u = t - 5 * BAR;
    bg(ctx, '#0E0E11');
    const { gx, gy, gw, gh } = S5;
    const px = gx + 90, py = gy + 90, pw = gw - 150, ph = gh - 170;
    const vy = v => py + ph - (0.12 + v * 0.7) * ph;
    const vx = x => px + x * pw;
    // panel
    ctx.fillStyle = C.panel; ctx.beginPath(); ctx.roundRect(gx, gy, gw, gh, 18); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
    label(ctx, 'GRAPH EDITOR — VALUE', gx + 30, gy + 44, C.mute, 15);
    ctx.fillStyle = C.coral; circle(ctx, gx + gw - 40, gy + 38, 6); ctx.fill();
    ctx.fillStyle = C.lime; circle(ctx, gx + gw - 62, gy + 38, 6); ctx.fill();
    // grid
    const gd = E.outExpo(prog(u, -0.05, 0.4));
    ctx.strokeStyle = '#22222A'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let k = 0; k <= 10; k++) { const x = px + (k / 10) * pw; ctx.moveTo(x, py); ctx.lineTo(x, py + ph * gd); }
    for (let k = 0; k <= 6; k++) { const y = py + (k / 6) * ph; ctx.moveTo(px, y); ctx.lineTo(px + pw * gd, y); }
    ctx.stroke();
    for (let k = 0; k <= 10; k += 2) label(ctx, String(k * 6).padStart(2, '0'), px + (k / 10) * pw, py + ph + 34, '#55555F', 13, 'center', 400, 0);
    const cv = curveAt(u), b = bez(...cv);
    // handles
    const ha = E.outBack(prog(u, 0.25, 0.5), 2);
    const P0 = [vx(0), vy(0)], P3 = [vx(1), vy(1)], P1 = [vx(cv[0]), vy(cv[1])], P2 = [vx(cv[2]), vy(cv[3])];
    if (ha > 0) {
      ctx.strokeStyle = 'rgba(255,74,28,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(...P0); ctx.lineTo(...P1); ctx.moveTo(...P3); ctx.lineTo(...P2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.coral;
      for (const P of [P1, P2]) { const s = 16 * ha; ctx.fillRect(P[0] - s / 2, P[1] - s / 2, s, s); }
    }
    // curve draw-on
    const dr = E.outExpo(prog(u, 0.02, 0.5));
    ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    const N = 90;
    for (let i = 0; i <= N * dr; i++) { const s = i / N; const x = vx(b.bx(s)), y = vy(b.by(s)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = C.ink; for (const P of [P0, P3]) { circle(ctx, P[0], P[1], 8 * gd); ctx.fill(); }
    // playhead
    const bl = ballAt(u);
    if (u >= S5T0) {
      const x = vx(bl.ph), yv = vy(b.y(bl.ph));
      ctx.strokeStyle = C.lime; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, py - 10); ctx.lineTo(x, py + ph); ctx.stroke();
      ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.moveTo(px, yv); ctx.lineTo(x, yv); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.lime; circle(ctx, x, yv, 10); ctx.fill();
      ctx.fillStyle = C.lime; ctx.beginPath(); ctx.moveTo(x - 9, py - 24); ctx.lineTo(x + 9, py - 24); ctx.lineTo(x, py - 10); ctx.fill();
    }
    // headline
    const hx = 1170;
    const hf = font(900, 130);
    letters(ctx, 'EASING', hf, hx, 360, C.ink, (i) => {
      const p = E.outExpo(prog(u, 0.05 + i * 0.03, 0.5 + i * 0.03));
      return { dy: (1 - p) * 80, alpha: p };
    }, -3);
    const sf = font(400, 104, SERIF, 'italic');
    letters(ctx, 'is everything.', sf, hx + 4, 470, C.lime, (i) => {
      const p = E.outExpo(prog(u, 0.25 + i * 0.018, 0.65 + i * 0.018));
      return { dy: (1 - p) * 60, alpha: p };
    });
    // track + onion skin
    const { tx0, tx1, ty, br } = S5;
    const ta = E.outExpo(prog(u, 0.15, 0.55));
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tx0, ty + br + 18); ctx.lineTo(lerp(tx0, tx1, ta), ty + br + 18); ctx.stroke();
    ctx.lineWidth = 2;
    for (let k = 0; k <= 12; k++) {
      const v = b.y(k / 12);
      const x = lerp(tx0, tx1, v);
      ctx.strokeStyle = `rgba(244,239,230,${0.28 * ta})`;
      circle(ctx, x, ty, br); ctx.stroke();
      ctx.fillStyle = `rgba(244,239,230,${0.5 * ta})`;
      ctx.fillRect(x - 1, ty + br + 10, 2, 16);
    }
    if (u >= 0.1) {
      const [bx] = ballPos(t);
      const [bx2] = ballPos(t - 1 / 60);
      const vel = bx - bx2;
      const stch = clamp(Math.abs(vel) / 70, 0, 0.55);
      ctx.fillStyle = C.lime;
      ctx.beginPath(); ctx.ellipse(bx, ty, br * (1 + stch), br * (1 - stch * 0.45), 0, 0, TAU); ctx.fill();
    }
    const fmt = v => v.toFixed(2);
    label(ctx, `cubic-bezier(${fmt(cv[0])}, ${fmt(cv[1])}, ${fmt(cv[2])}, ${fmt(cv[3])})`, tx0, ty + 130, C.mute, 22, 'left', 400, 0);
    label(ctx, u < 2 * BEAT ? 'EXPO IN-OUT' : 'BACK OUT · OVERSHOOT', tx0, ty + 166, C.coral, 16);
  }

  /* ============================================================
     SCENE 6 — SYSTEMS (11.25 – 13.125)  12-cell loop grid
     ============================================================ */
  const GRID = { cols: 4, rows: 3, mx: 120, my: 150, gap: 18 };
  GRID.cw = (W - 2 * GRID.mx - (GRID.cols - 1) * GRID.gap) / GRID.cols;
  GRID.ch = (H - 2 * GRID.my - (GRID.rows - 1) * GRID.gap) / GRID.rows;
  const cellXY = k => [GRID.mx + (k % 4) * (GRID.cw + GRID.gap), GRID.my + Math.floor(k / 4) * (GRID.ch + GRID.gap)];
  const DARK = '#16161B';
  const CELLS = [
    { name: 'LOADER', bg: DARK, fn(ctx, w, h, u) {
      const a0 = u * 7, len = 0.5 + (Math.sin(u * 5) + 1) * 1.4;
      ctx.strokeStyle = C.lime; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 62, a0, a0 + len); ctx.stroke();
      ctx.strokeStyle = C.line; ctx.lineWidth = 2; circle(ctx, w / 2, h / 2, 62); ctx.stroke();
    } },
    { name: 'SQUASH', bg: C.ink, fn(ctx, w, h, u) {
      const q = ((u + 10) / (2 * BEAT)) % 1, ht = 4 * q * (1 - q), g = h - 50;
      const sq = Math.max(0, 1 - Math.min(q, 1 - q) / 0.07);
      const r = 26, y = g - r * (1 - sq * 0.35) - ht * 130;
      ctx.fillStyle = 'rgba(10,10,12,0.15)'; ctx.beginPath(); ctx.ellipse(w / 2, g + 4, 34 * (1 - ht * 0.5), 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C.bg; ctx.beginPath(); ctx.ellipse(w / 2, y, r * (1 + sq * 0.35 - (1 - sq) * ht * 0.12), r * (1 - sq * 0.35 + (1 - sq) * ht * 0.18), 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C.bg; ctx.fillRect(40, g + 1, w - 80, 2);
    } },
    { name: 'WAVE', bg: C.violet, fn(ctx, w, h, u) {
      ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = k === 1 ? C.lime : C.ink; ctx.beginPath();
        for (let x = 30; x <= w - 30; x += 6) { const y = h / 2 + Math.sin(x * 0.03 - u * 6 + k * 1.2) * (30 + k * 12) * Math.sin((x / w) * Math.PI); x === 30 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke();
      }
    } },
    { name: 'TUNNEL', bg: DARK, fn(ctx, w, h, u) {
      ctx.lineWidth = 3;
      for (let k = 0; k < 9; k++) {
        const s = ((k * 28 + u * 90) % 252);
        ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(s * 0.012 + u * 0.8);
        ctx.strokeStyle = k % 2 ? C.lime : C.ink; ctx.globalAlpha = s / 252;
        ctx.strokeRect(-s / 2, -s / 2, s, s); ctx.restore();
      }
    } },
    { name: 'EQ', bg: C.lime, fn(ctx, w, h, u) {
      const n = 14, bw = (w - 80) / n, env = 0.45 + 0.55 * Math.exp(-(((u % BEAT) + BEAT) % BEAT) * 7);
      ctx.fillStyle = C.bg;
      for (let k = 0; k < n; k++) { const v = (0.15 + 0.85 * Math.abs(Math.sin(u * 5 + k * 0.9) * Math.cos(u * 2.3 + k * 0.4))) * env; const bh = v * (h - 90); ctx.fillRect(40 + k * bw + 3, h - 45 - bh, bw - 6, bh); }
    } },
    { name: 'PULSE', bg: C.coral, fn(ctx, w, h, u) {
      ctx.strokeStyle = C.ink;
      for (let k = 0; k < 8; k++) { const r = (u * 90 + k * 50) % 400; ctx.lineWidth = 6; ctx.globalAlpha = clamp(1 - r / 400); circle(ctx, w / 2, h / 2, r); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.fillStyle = C.ink; circle(ctx, w / 2, h / 2, 14 * (1 + 0.4 * pulse(((u % BEAT) + BEAT) % BEAT, 0, 8))); ctx.fill();
    } },
    { name: 'FIELD', bg: DARK, fn(ctx, w, h, u) {
      ctx.fillStyle = C.ink;
      for (let i = 0; i < 15; i++) for (let j = 0; j < 8; j++) {
        const x = 30 + i * ((w - 60) / 14), y = 30 + j * ((h - 60) / 7), d = Math.hypot(x - w / 2, y - h / 2);
        const r = 1.2 + 4.5 * (Math.sin(d * 0.05 - u * 7) + 1) / 2; circle(ctx, x, y, r); ctx.fill();
      }
    } },
    { name: 'PENDULUM', bg: C.ink, fn(ctx, w, h, u) {
      ctx.fillStyle = C.bg; ctx.fillRect(30, 30, w - 60, 3);
      for (let k = 0; k < 12; k++) {
        const ax = 50 + k * ((w - 100) / 11), a = 0.55 * Math.sin(u * (4 + k * 0.32)), L = h - 90;
        const bx = ax + Math.sin(a) * L * 0.35, by = 32 + Math.cos(a) * L * (0.55 + k * 0.035);
        ctx.strokeStyle = C.bg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax, 32); ctx.lineTo(bx, by); ctx.stroke();
        ctx.fillStyle = C.coral; circle(ctx, bx, by, 8); ctx.fill();
      }
    } },
    { name: 'COUNTER', bg: DARK, fn(ctx, w, h, u) {
      const val = E.outCubic(prog(u, -0.2, 1.3)) * 100, size = 120;
      ctx.save(); ctx.beginPath(); ctx.rect(0, h / 2 - size * 0.62, w, size * 0.84); ctx.clip();
      ctx.font = font(900, size); ctx.fillStyle = C.lime; ctx.textAlign = 'center';
      const tens = Math.floor(val / 10), ones = val % 10, frac = ones % 1;
      const base = h / 2 + size * 0.36 - 30;
      const dig = (d, x, off) => { ctx.fillText(String(d % 10), x, base - off * size); ctx.fillText(String((d + 1) % 10), x, base + size - off * size); };
      dig(Math.floor(ones), w / 2 + 10, frac);
      dig(tens, w / 2 - 62, ones >= 9 ? frac : 0);
      ctx.restore();
      label(ctx, '%', w / 2 + 88, h / 2 - 50, C.lime, 28, 'left');
    } },
    { name: 'BLOB', bg: C.violet, fn(ctx, w, h, u) {
      ctx.fillStyle = C.lime; ctx.beginPath();
      for (let k = 0; k <= 90; k++) { const a = (k / 90) * TAU, r = 72 * (1 + 0.16 * Math.sin(3 * a + u * 3.2) + 0.1 * Math.sin(5 * a - u * 4.1)); const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.fill();
    } },
    { name: 'LOOP', bg: C.ink, fn(ctx, w, h, u) {
      ctx.fillStyle = C.bg;
      for (let k = -6; k < 16; k++) { const x = k * 44 + ((u * 140) % 44); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 18, 0); ctx.lineTo(x + 18 - h, h); ctx.lineTo(x - h, h); ctx.fill(); }
      ctx.font = font(900, 96); ctx.textAlign = 'center';
      ctx.fillStyle = C.ink; ctx.fillRect(w / 2 - 150, h / 2 - 58, 300, 116);
      ctx.fillStyle = C.coral; ctx.fillText('LOOP', w / 2, h / 2 + 35);
    } },
    { name: 'ORBIT', bg: DARK, fn(ctx, w, h, u) {
      ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
      const o = [[50, 2.6, C.lime, 8], [85, -1.7, C.coral, 10], [115, 1.1, C.violet, 12]];
      for (const [r, s, col, pr] of o) { ctx.beginPath(); ctx.ellipse(w / 2, h / 2, r * 1.5, r * 0.8, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = col; circle(ctx, w / 2 + Math.cos(u * s) * r * 1.5, h / 2 + Math.sin(u * s) * r * 0.8, pr); ctx.fill(); }
      ctx.fillStyle = C.ink; circle(ctx, w / 2, h / 2, 16); ctx.fill();
    } },
  ];
  const ZCELL = 5;
  function scene6(ctx, t) {
    const u = t - 6 * BAR;
    bg(ctx, C.bg);
    const z = E.inExpo(prog(u, 1.3, 1.875));
    const [zx, zy] = cellXY(ZCELL), zc = [zx + GRID.cw / 2, zy + GRID.ch / 2];
    const s = lerp(1, 7.5, z) * (1 + 0.012 * pulse(u, 0, 8) + 0.012 * pulse(u, BEAT, 8) + 0.012 * pulse(u, 2 * BEAT, 8));
    const ccx = lerp(W / 2, zc[0], E.outCubic(prog(u, 1.3, 1.7))), ccy = lerp(H / 2, zc[1], E.outCubic(prog(u, 1.3, 1.7)));
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-ccx, -ccy);
    for (let k = 0; k < CELLS.length; k++) {
      const [x, y] = cellXY(k), cell = CELLS[k];
      const ord = (k % 4) + Math.floor(k / 4);
      const rv = E.outExpo(prog(u, -0.14 + ord * 0.045, 0.3 + ord * 0.045));
      if (rv <= 0) continue;
      ctx.save();
      ctx.translate(x + GRID.cw / 2, y + GRID.ch / 2);
      const sc = lerp(0.75, 1, rv); ctx.scale(sc, sc);
      ctx.translate(-GRID.cw / 2, -GRID.ch / 2);
      ctx.globalAlpha = rv;
      ctx.beginPath(); ctx.roundRect(0, 0, GRID.cw, GRID.ch, 16); ctx.clip();
      ctx.fillStyle = cell.bg; ctx.fillRect(0, 0, GRID.cw, GRID.ch);
      cell.fn(ctx, GRID.cw, GRID.ch, u + k * 0.13);
      ctx.globalAlpha = rv;
      const light = cell.bg === C.ink || cell.bg === C.lime || cell.bg === C.coral;
      label(ctx, `${String(k + 1).padStart(2, '0')} / ${cell.name}`, 18, GRID.ch - 18, light ? 'rgba(10,10,12,0.6)' : C.mute, 13);
      ctx.restore();
    }
    ctx.restore();
    const la = prog(u, 0.2, 0.4) * (1 - z);
    if (la > 0) {
      ctx.globalAlpha = la;
      label(ctx, '12 LOOPS · 1 SYSTEM · ALL IN SYNC @ 128 BPM', W / 2, H - 92, C.mute, 16, 'center');
      ctx.globalAlpha = 1;
    }
  }

  /* ============================================================
     SCENE 7 — FINALE (13.125 – 15.0)
     ============================================================ */
  const DUST = (() => { const r = mulberry32(21); return Array.from({ length: 90 }, () => ({ x: r() * W, y: r() * H, s: 0.6 + r() * 1.8, v: 6 + r() * 20, p: r() * TAU })); })();
  function scene7(ctx, t) {
    const u = t - 7 * BAR, cx = W / 2, cy = H / 2;
    // coral world continuing the zoom, black iris opens from the center
    bg(ctx, C.coral);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 42;
    for (let k = 0; k < 8; k++) { const r = ((u + 1.9) * 630 + k * 350) % 2800; ctx.globalAlpha = clamp(1 - r / 2800); circle(ctx, cx, cy, r); ctx.stroke(); }
    ctx.globalAlpha = 1;
    const ir = 1150 * E.outExpo(prog(u, 0, 0.55));
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, ir, 0, TAU); ctx.clip();
    bg(ctx, C.bg);
    // dust
    ctx.fillStyle = C.ink;
    for (const d of DUST) { ctx.globalAlpha = 0.25; circle(ctx, (d.x + u * d.v) % W, d.y + Math.sin(u + d.p) * 6, d.s); ctx.fill(); }
    ctx.globalAlpha = 1;
    // dashed ring
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(u * 0.25);
    ctx.setLineDash([2, 14]); ctx.strokeStyle = 'rgba(244,239,230,0.18)'; ctx.lineWidth = 2;
    circle(ctx, 0, 0, 470 + 30 * E.outExpo(prog(u, 0, 1))); ctx.stroke(); ctx.setLineDash([]); ctx.restore();

    const push = 1 + 0.035 * E.outCubic(prog(u, 0, 1.875));
    ctx.translate(cx, cy); ctx.scale(push, push); ctx.translate(-cx, -cy);
    // name
    const size = 290, f = font(900, size);
    const L = layout(ctx, 'CLAUDE', f, -6);
    const dotR = 30, gap = 22;
    const total = L.width + gap + dotR * 2;
    const x0 = cx - total / 2, base = cy - 20;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, base - size * 0.9, W, size * 0.9 + 14); ctx.clip();
    letters(ctx, 'CLAUDE', f, x0, base, C.ink, (i) => {
      const p = E.outExpo(prog(u, 0.06 + i * 0.045, 0.75 + i * 0.045));
      return { dy: (1 - p) * size * 1.05 };
    }, -6);
    ctx.restore();
    // the dot — callback to frame one
    const dx = x0 + L.width + gap + dotR, dy = base - dotR;
    const da = E.outBack(prog(u, 0.44, 0.7), 3);
    let beat = 0; for (let k = 1; k < 4; k++) beat += pulse(u, k * BEAT, 9);
    if (da > 0) {
      ctx.fillStyle = C.lime; circle(ctx, dx, dy, dotR * da * (1 + 0.14 * beat)); ctx.fill();
      const rp = prog(u, 0.46, 1.2);
      if (rp < 1) { ctx.strokeStyle = C.lime; ctx.lineWidth = 2; ctx.globalAlpha = 1 - rp; circle(ctx, dx, dy, dotR + 180 * E.outExpo(rp)); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    // subtitle scramble
    const sub = 'MOTION DESIGNER';
    const sy = base + 108;
    const sf = font(700, 34, MONO);
    const s = scramble(sub, u, BEAT, 0.022, 0.2, 7);
    const SL = layout(ctx, sub, sf, 14);
    letters(ctx, s, sf, cx - SL.width / 2, sy, C.lime, null, 14);
    const ll = E.outExpo(prog(u, BEAT + 0.15, BEAT + 0.8));
    ctx.fillStyle = 'rgba(244,239,230,0.5)';
    const lw = 330 * ll;
    ctx.fillRect(cx - SL.width / 2 - 40 - lw, sy - 13, lw, 2);
    ctx.fillRect(cx + SL.width / 2 + 40, sy - 13, lw, 2);
    // JP tagline
    const jf = font(700, 40, JP);
    const jt = '動きで、心を動かす。';
    const JL = layout(ctx, jt, jf, 8);
    letters(ctx, jt, jf, cx - JL.width / 2, sy + 92, C.ink, (i) => {
      const p = E.outExpo(prog(u, 2 * BEAT + i * 0.03, 2 * BEAT + 0.5 + i * 0.03));
      return { dy: (1 - p) * 30, alpha: p };
    }, 8);
    // credits
    const ca = prog(u, 3 * BEAT - 0.1, 3 * BEAT + 0.2);
    if (ca > 0) {
      ctx.globalAlpha = ca;
      label(ctx, 'DIRECTION · ANIMATION · 3D · GENERATIVE · TYPE', cx, H - 170, C.mute, 17, 'center', 400, 6);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // flash on impact
    const fl = pulse(u, 0, 14);
    if (fl > 0.01) { ctx.fillStyle = `rgba(255,255,255,${0.85 * fl})`; ctx.fillRect(0, 0, W, H); }
  }

  const SCENES = [scene0, scene1, scene2, scene3, scene4, scene5, scene6, scene7];

  /* ============================================================
     COMPOSITOR + TRANSITIONS
     ============================================================ */
  let bufA, bufB, bufS, bufT, bufM;
  function run(i, ctx, t) { ctx.save(); SCENES[i](ctx, t); ctx.restore(); }
  function slantRegion(ctx, lead, slant) {
    ctx.beginPath();
    ctx.moveTo(-10, -10); ctx.lineTo(lead + slant, -10); ctx.lineTo(lead - slant, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath();
  }
  function compose(ctx, t) {
    if (t < BAR) return run(0, ctx, t);
    // 1 → 2 : diagonal colour bands
    if (t < 2 * BAR - 0.16) return run(1, ctx, t);
    if (t < 2 * BAR + 0.18) {
      const p = prog(t, 2 * BAR - 0.16, 2 * BAR + 0.18);
      run(1, ctx, t);
      const cols = [C.lime, C.violet];
      for (let k = 0; k < 3; k++) {
        const e = E.inOutCubic(prog(p, k * 0.14, 0.62 + k * 0.14));
        const lead = lerp(-420, W + 420, e);
        ctx.save(); slantRegion(ctx, lead, 380);
        if (k < 2) { ctx.fillStyle = cols[k]; ctx.fill(); }
        else { ctx.clip(); run(2, ctx, t); }
        ctx.restore();
      }
      return;
    }
    if (t < 3 * BAR) return run(2, ctx, t);
    if (t < 4 * BAR) return run(3, ctx, t);
    // 4 → 5 : whip pan with motion blur
    const w0 = 5 * BAR - 0.1, w1 = 5 * BAR + 0.1;
    if (t < w0) return run(4, ctx, t);
    if (t < w1) {
      const a = bufA.getContext('2d'), b = bufB.getContext('2d');
      run(4, a, t); run(5, b, t);
      const e = E.inOutCubic(prog(t, w0, w1)), e2 = E.inOutCubic(prog(t - 1 / 60, w0, w1));
      const v = (e - e2) * W * 1.1;
      bg(ctx, C.bg);
      const n = 8;
      for (let k = 0; k < n; k++) {
        const off = -e * W * 1.1 + (k / (n - 1) - 0.5) * v;
        ctx.globalAlpha = 1 / (k + 1);
        ctx.drawImage(bufA, off, 0);
        ctx.drawImage(bufB, off + W * 1.1, 0);
      }
      ctx.globalAlpha = 1;
      return;
    }
    // 5 → 6 : iris from the ball
    const i0 = 6 * BAR - 0.17, i1 = 6 * BAR + 0.17;
    if (t < i0) return run(5, ctx, t);
    if (t < i1) {
      run(5, ctx, t);
      const [bx, by] = ballPos(i0);
      const e = E.inOutCubic(prog(t, i0, i1));
      const r = 2300 * e;
      ctx.save(); ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.clip(); run(6, ctx, t); ctx.restore();
      ctx.strokeStyle = C.lime; ctx.lineWidth = 14 * (1 - e) + 1; circle(ctx, bx, by, r); ctx.stroke();
      return;
    }
    if (t < 7 * BAR) return run(6, ctx, t);
    return run(7, ctx, t);
  }

  // hits: [time, shake, aberration]
  const HITS = [[2 * BEAT, 5, 6], [BAR, 12, 14], [2 * BAR, 6, 8], [3 * BAR, 16, 16], [4 * BAR, 8, 10], [5 * BAR, 6, 12], [6 * BAR, 6, 8], [7 * BAR, 26, 24]];
  function shakeAt(t) {
    let x = 0, y = 0, ca = 0;
    for (const [h, a, c] of HITS) {
      if (t < h) continue;
      const d = t - h, k = Math.exp(-d * 11);
      x += a * k * Math.sin(d * 97 + h * 13); y += a * k * Math.cos(d * 83 + h * 7);
      ca += c * Math.exp(-d * 16);
    }
    return { x, y, ca };
  }

  function core(out, t) {
    const s = bufS.getContext('2d');
    s.save(); compose(s, t); s.restore();
    const { x, y, ca } = shakeAt(t);
    const sc = 1 + (Math.abs(x) + Math.abs(y)) * 2.4 / W;
    out.save();
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.globalCompositeOperation = 'source-over';
    out.globalAlpha = 1;
    const place = (src, dx) => { out.save(); out.translate(W / 2 + x + dx, H / 2 + y); out.scale(sc, sc); out.drawImage(src, -W / 2, -H / 2); out.restore(); };
    if (ca > 0.6) {
      const tt = bufT.getContext('2d');
      out.fillStyle = '#000'; out.fillRect(0, 0, W, H);
      const chans = [['#ff0000', ca], ['#00ff00', 0], ['#0000ff', -ca]];
      for (const [col, dx] of chans) {
        tt.globalCompositeOperation = 'source-over'; tt.drawImage(bufS, 0, 0);
        tt.globalCompositeOperation = 'multiply'; tt.fillStyle = col; tt.fillRect(0, 0, W, H);
        tt.globalCompositeOperation = 'source-over';
        out.globalCompositeOperation = 'lighter';
        place(bufT, dx);
        out.globalCompositeOperation = 'source-over';
      }
    } else {
      place(bufS, 0);
    }
    out.restore();
  }

  /* ---------- HUD ---------- */
  const CHAPTERS = [[0, ''], [BAR, '00 — TYPE'], [2 * BAR, '01 — FORM'], [3 * BAR, '02 — PARTICLES'], [4 * BAR, '03 — DEPTH'], [5 * BAR, '04 — TIMING'], [6 * BAR, '05 — SYSTEMS'], [7 * BAR, '']];
  function hud(ctx, t) {
    const a = prog(t, BAR, BAR + 0.05);
    if (a <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.globalAlpha = a;
    const col = '#FFFFFF';
    // crop marks
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    const m = 56, l = 26;
    ctx.beginPath();
    ctx.moveTo(m, m + l); ctx.lineTo(m, m); ctx.lineTo(m + l, m);
    ctx.moveTo(W - m - l, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + l);
    ctx.moveTo(m, H - m - l); ctx.lineTo(m, H - m); ctx.lineTo(m + l, H - m);
    ctx.moveTo(W - m - l, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - l);
    ctx.stroke();
    label(ctx, 'CLAUDE ©2026', 96, 100, col, 15);
    label(ctx, 'MOTION DESIGN SHOWREEL', 96, 124, col, 15, 'left', 400);
    // chapter
    let ci = 0; for (let k = 0; k < CHAPTERS.length; k++) if (t >= CHAPTERS[k][0]) ci = k;
    const [ct, cn] = CHAPTERS[ci];
    if (cn) label(ctx, scramble(cn, t - ct, 0, 0.012, 0.12, ci), W - 96, 100, col, 15, 'right');
    // tech + timecode
    label(ctx, '1920×1080 · 60 FPS · 128 BPM', 96, H - 96, col, 14, 'left', 400);
    const fr = Math.min(Math.round(t * FPS), DUR * FPS - 1);
    const tc = `00:00:${String(Math.floor(fr / FPS)).padStart(2, '0')}:${String(fr % FPS).padStart(2, '0')}`;
    label(ctx, tc, W - 96, H - 96, col, 16, 'right', 700, 2);
    // progress
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(96, H - 76, W - 192, 2);
    ctx.fillStyle = col; ctx.fillRect(96, H - 76, (W - 192) * clamp(t / DUR), 2);
    // beat ticks
    for (let k = 0; k <= 32; k++) { const x = 96 + (W - 192) * (k * BEAT / DUR); ctx.fillRect(x - 1, H - 80, 2, k % 4 === 0 ? 10 : 5); }
    ctx.restore();
  }

  /* ---------- grain / vignette ---------- */
  let grain = [], vign;
  function initPost(ctx) {
    const r = mulberry32(99);
    for (let k = 0; k < 8; k++) {
      const c = mkCanvas(256, 256), x = c.getContext('2d'), id = x.createImageData(256, 256);
      for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() - 0.5) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      x.putImageData(id, 0, 0);
      grain.push(ctx.createPattern(c, 'repeat'));
    }
    vign = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
    vign.addColorStop(0, 'rgba(0,0,0,0)'); vign.addColorStop(1, 'rgba(0,0,0,0.38)');
  }
  function post(ctx, t) {
    const f = Math.round(t * FPS);
    ctx.save();
    ctx.fillStyle = vign; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.07;
    const ox = Math.floor(hash(f, 1) * 256), oy = Math.floor(hash(f, 2) * 256);
    ctx.translate(-ox, -oy);
    ctx.fillStyle = grain[f % grain.length];
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
  }

  /* ---------- public API ---------- */
  let outCtx = null, opts = { mb: 1, shutter: 0.5 };
  const Reel = {
    W, H, FPS, DUR, BPM,
    async init(canvas, o = {}) {
      Object.assign(opts, o);
      canvas.width = W; canvas.height = H;
      outCtx = canvas.getContext('2d');
      const fonts = [font(900, 100), font(900, 100, SANS, 'italic'), font(400, 100), font(800, 100), font(400, 20, MONO), font(700, 20, MONO), font(400, 100, SERIF), font(400, 100, SERIF, 'italic')];
      await Promise.all(fonts.map(f => document.fonts.load(f, 'AaBb09')));
      await document.fonts.load(font(700, 40, JP), '動きで、心を動かす。');
      await document.fonts.ready;
      bufA = mkCanvas(); bufB = mkCanvas(); bufS = mkCanvas(); bufT = mkCanvas(); bufM = mkCanvas();
      initParticles();
      initPost(outCtx);
    },
    draw(t) {
      t = clamp(t, 0, DUR - 1e-6);
      const n = Math.max(1, opts.mb | 0);
      core(outCtx, t);
      if (n > 1) {
        const m = bufM.getContext('2d');
        for (let k = 1; k < n; k++) {
          const tk = Math.min(DUR - 1e-6, t + (k / n) * (opts.shutter / FPS));
          core(m, tk);
          outCtx.save(); outCtx.globalAlpha = 1 / (k + 1); outCtx.drawImage(bufM, 0, 0); outCtx.restore();
        }
      }
      hud(outCtx, t);
      post(outCtx, t);
    },
  };
  window.Reel = Reel;
})();
