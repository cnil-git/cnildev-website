// Ambient background. One scene per theme; scenes crossfade when the page
// changes. Everything is drawn on a single canvas behind the shell.

import type { Theme } from "./routes";
import { LEAF_BOX, LEAF_OUTLINE } from "./leaf";

interface Palette { fg: string; accent: string; accent2: string; bg: string }

interface Scene {
  resize(w: number, h: number): void;
  draw(ctx: CanvasRenderingContext2D, t: number, dt: number, p: Palette): void;
}

const leafPath = new Path2D(LEAF_OUTLINE);
const pointer = { x: -9999, y: -9999 };

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function rgba(color: string, a: number): string {
  // Colors arrive as rgb()/rgba() from getComputedStyle, or #hex from fallbacks.
  const m = color.match(/[\d.]+/g);
  if (color.startsWith("#")) {
    const n = parseInt(color.slice(1, 7), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  if (!m) return color;
  return `rgba(${m[0]},${m[1]},${m[2]},${a})`;
}

/** Draw the monstera outline centered at (x, y) with the given height. */
function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, rot: number, fill: string) {
  const s = h / LEAF_BOX.h;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.translate(-(LEAF_BOX.x + LEAF_BOX.w / 2), -(LEAF_BOX.y + LEAF_BOX.h / 2));
  ctx.fillStyle = fill;
  ctx.fill(leafPath, "evenodd");
  ctx.restore();
}

/* ~ : spores drifting up through soil, a few big leaves at the edges. */
function soilScene(): Scene {
  let w = 0, h = 0;
  let motes: { x: number; y: number; r: number; v: number; ph: number }[] = [];
  return {
    resize(W, H) {
      w = W; h = H;
      const n = Math.min(90, Math.floor((w * h) / 16000));
      motes = Array.from({ length: n }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(0.6, 2.2), v: rand(6, 18), ph: rand(0, 6.28) }));
    },
    draw(ctx, t, dt, p) {
      drawLeaf(ctx, w * 0.92, h * 0.86, Math.max(w, h) * 0.42, -0.5 + Math.sin(t * 0.12) * 0.04, rgba(p.accent2, 0.1));
      drawLeaf(ctx, w * 0.06, h * 0.08, Math.max(w, h) * 0.26, 2.6 + Math.sin(t * 0.1 + 1) * 0.05, rgba(p.accent2, 0.07));
      for (const m of motes) {
        m.y -= m.v * dt;
        m.x += Math.sin(t * 0.6 + m.ph) * 0.25;
        const dx = m.x - pointer.x, dy = m.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < 14400) { const f = (1 - d2 / 14400) * 1.6; m.x += (dx / Math.sqrt(d2 + 1)) * f; m.y += (dy / Math.sqrt(d2 + 1)) * f; }
        if (m.y < -10) { m.y = h + 10; m.x = rand(0, w); }
        const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + m.ph));
        ctx.fillStyle = rgba(p.accent, a);
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill();
      }
    },
  };
}

/* ~/about : warm light shafts with dust drifting through them. */
function sunScene(): Scene {
  let w = 0, h = 0;
  let dust: { x: number; y: number; r: number; vx: number; vy: number }[] = [];
  return {
    resize(W, H) {
      w = W; h = H;
      dust = Array.from({ length: Math.min(70, Math.floor((w * h) / 20000)) }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(0.5, 1.8), vx: rand(-4, 6), vy: rand(-3, 5) }));
    },
    draw(ctx, t, dt, p) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 4; i++) {
        const sway = Math.sin(t * 0.15 + i * 1.7) * 40;
        const x0 = w * (0.1 + i * 0.22) + sway;
        const g = ctx.createLinearGradient(x0, 0, x0 + h * 0.5, h);
        g.addColorStop(0, rgba(p.accent, 0.075 - i * 0.01));
        g.addColorStop(1, rgba(p.accent, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0, -10);
        ctx.lineTo(x0 + 70 + i * 30, -10);
        ctx.lineTo(x0 + h * 0.55 + 160 + i * 40, h + 10);
        ctx.lineTo(x0 + h * 0.55, h + 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      for (const d of dust) {
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.x < 0) d.x = w; if (d.x > w) d.x = 0; if (d.y < 0) d.y = h; if (d.y > h) d.y = 0;
        ctx.fillStyle = rgba(p.accent, 0.35 + 0.25 * Math.sin(t + d.x));
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill();
      }
    },
  };
}

/* ~/projects : copper traces on a board with signals running along them. */
function pcbScene(): Scene {
  let traces: { pts: [number, number][]; len: number; seg: number[] }[] = [];
  let pulses: { tr: number; s: number; v: number }[] = [];
  const G = 26;
  const dirs: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  return {
    resize(w, h) {
      traces = [];
      const cols = Math.ceil(w / G), rows = Math.ceil(h / G);
      const used = new Set<string>();
      const count = Math.min(70, Math.floor((cols * rows) / 22));
      for (let i = 0; i < count; i++) {
        let x = Math.floor(rand(0, cols)), y = Math.floor(rand(0, rows));
        let d = Math.floor(rand(0, 8)) & ~1;
        const pts: [number, number][] = [[x * G, y * G]];
        const steps = Math.floor(rand(6, 22));
        for (let s = 0; s < steps; s++) {
          if (Math.random() < 0.22) d = (d + (Math.random() < 0.5 ? 1 : 7)) % 8;
          const nx = x + dirs[d][0], ny = y + dirs[d][1];
          const key = `${nx},${ny}`;
          if (nx < 0 || ny < 0 || nx > cols || ny > rows || used.has(key)) break;
          used.add(key);
          x = nx; y = ny;
          const last = pts[pts.length - 1];
          const prev = pts[pts.length - 2];
          if (prev && (last[0] - prev[0]) * (y * G - last[1]) === (last[1] - prev[1]) * (x * G - last[0])) last[0] = x * G, last[1] = y * G;
          else pts.push([x * G, y * G]);
        }
        if (pts.length < 2) continue;
        const seg: number[] = [];
        let len = 0;
        for (let k = 1; k < pts.length; k++) { const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); seg.push(l); len += l; }
        if (len > G * 3) traces.push({ pts, len, seg });
      }
      pulses = Array.from({ length: Math.min(26, traces.length) }, () => ({ tr: Math.floor(rand(0, traces.length)), s: rand(0, 1), v: rand(60, 160) }));
    },
    draw(ctx, _t, dt, p) {
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const tr of traces) {
        ctx.strokeStyle = rgba(p.accent, 0.1);
        ctx.beginPath();
        ctx.moveTo(tr.pts[0][0], tr.pts[0][1]);
        for (let k = 1; k < tr.pts.length; k++) ctx.lineTo(tr.pts[k][0], tr.pts[k][1]);
        ctx.stroke();
        for (const end of [tr.pts[0], tr.pts[tr.pts.length - 1]]) {
          ctx.strokeStyle = rgba(p.accent2, 0.32);
          ctx.beginPath(); ctx.arc(end[0], end[1], 3.2, 0, 6.283); ctx.stroke();
        }
      }
      for (const pu of pulses) {
        const tr = traces[pu.tr];
        if (!tr) continue;
        pu.s += (pu.v * dt) / tr.len;
        if (pu.s > 1) { pu.s = 0; pu.tr = Math.floor(rand(0, traces.length)); continue; }
        let d = pu.s * tr.len, k = 0;
        while (k < tr.seg.length - 1 && d > tr.seg[k]) d -= tr.seg[k++];
        const a = tr.pts[k], b = tr.pts[k + 1], f = d / tr.seg[k];
        const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 14);
        g.addColorStop(0, rgba(p.accent, 0.85));
        g.addColorStop(1, rgba(p.accent, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 14, 0, 6.283); ctx.fill();
      }
    },
  };
}

/* ~/monstera : a syntax tree growing like roots, with a pass walking it. */
function treeScene(): Scene {
  interface Node { x: number; y: number; px: number; py: number; depth: number; born: number }
  let nodes: Node[] = [];
  let start = -1;
  return {
    resize(w, h) {
      nodes = [];
      start = -1;
      const grow = (x: number, y: number, ang: number, len: number, depth: number, born: number) => {
        const nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
        nodes.push({ x: nx, y: ny, px: x, py: y, depth, born });
        if (depth >= 6) return;
        const kids = depth < 2 ? 3 : Math.random() < 0.7 ? 2 : 1;
        for (let i = 0; i < kids; i++) {
          const spread = 0.95 - depth * 0.08;
          grow(nx, ny, ang + (i - (kids - 1) / 2) * spread + rand(-0.15, 0.15), len * rand(0.68, 0.82), depth + 1, born + rand(0.35, 0.7));
        }
      };
      const base = Math.min(h * 0.2, 170);
      grow(w * 0.78, -10, Math.PI / 2 + 0.25, base, 0, 0);
      grow(w * 0.12, h + 10, -Math.PI / 2 + 0.2, base * 0.8, 1, 0.5);
    },
    draw(ctx, t, _dt, p) {
      if (start < 0) start = t;
      const age = t - start;
      const scan = (age * 0.9) % 9;
      ctx.lineWidth = 1.1;
      for (const n of nodes) {
        const g = Math.min(1, Math.max(0, (age - n.born) / 0.8));
        if (g <= 0) continue;
        const x = n.px + (n.x - n.px) * g, y = n.py + (n.y - n.py) * g;
        const lit = Math.max(0, 1 - Math.abs(scan - n.depth * 1.2) * 1.6);
        ctx.strokeStyle = rgba(p.accent, 0.1 + lit * 0.25);
        ctx.beginPath(); ctx.moveTo(n.px, n.py); ctx.lineTo(x, y); ctx.stroke();
        if (g >= 1) {
          ctx.fillStyle = rgba(lit > 0.2 ? p.accent : p.accent2, 0.25 + lit * 0.6);
          ctx.beginPath(); ctx.arc(n.x, n.y, 2.4 + lit * 1.6, 0, 6.283); ctx.fill();
        }
      }
    },
  };
}

/* ~/garden : leaves drifting down through humid air. */
function leavesScene(): Scene {
  let w = 0, h = 0;
  let leaves: { x: number; y: number; s: number; r: number; vr: number; vy: number; ph: number; c: number }[] = [];
  let bokeh: { x: number; y: number; r: number; ph: number }[] = [];
  const spawn = (top: boolean) => ({ x: rand(-40, w + 40), y: top ? rand(-200, -40) : rand(0, h), s: rand(26, 70), r: rand(0, 6.28), vr: rand(-0.4, 0.4), vy: rand(14, 34), ph: rand(0, 6.28), c: Math.floor(rand(0, 3)) });
  return {
    resize(W, H) {
      w = W; h = H;
      leaves = Array.from({ length: Math.min(16, Math.max(7, Math.floor(w / 110))) }, () => spawn(false));
      bokeh = Array.from({ length: 14 }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(30, 110), ph: rand(0, 6.28) }));
    },
    draw(ctx, t, dt, p) {
      for (const b of bokeh) {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, rgba(p.accent, 0.05 + 0.03 * Math.sin(t * 0.4 + b.ph)));
        g.addColorStop(1, rgba(p.accent, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill();
      }
      const fills = [rgba("#318c3b", 0.32), rgba("#589562", 0.28), rgba(p.accent, 0.18)];
      for (const l of leaves) {
        l.y += l.vy * dt;
        l.x += Math.sin(t * 0.7 + l.ph) * 18 * dt;
        l.r += l.vr * dt;
        const dx = l.x - pointer.x, dy = l.y - pointer.y;
        if (dx * dx + dy * dy < 10000) { l.x += Math.sign(dx) * 60 * dt; l.vr += 0.02 * Math.sign(dx); }
        if (l.y > h + 80) Object.assign(l, spawn(true));
        drawLeaf(ctx, l.x, l.y, l.s, l.r, fills[l.c]);
      }
    },
  };
}

/* ~/ethos : first light behind a canopy of monstera leaves. */
function shadowScene(): Scene {
  let w = 0, h = 0;
  let shadow: HTMLCanvasElement | null = null;
  let spots: { x: number; y: number; s: number; r: number; ph: number }[] = [];
  return {
    resize(W, H) {
      w = W; h = H;
      shadow = document.createElement("canvas");
      const S = 360;
      shadow.width = S; shadow.height = S * 1.2;
      const c = shadow.getContext("2d")!;
      c.filter = "blur(10px)";
      drawLeaf(c, S / 2, S * 0.6, S * 0.95, 0, "rgba(10,5,10,1)");
      spots = [
        { x: w * 0.88, y: h * 0.18, s: Math.max(w, h) * 0.5, r: 0.5, ph: 0 },
        { x: w * 0.05, y: h * 0.92, s: Math.max(w, h) * 0.42, r: 2.7, ph: 2 },
        { x: w * 0.6, y: h * 1.02, s: Math.max(w, h) * 0.3, r: -0.3, ph: 4 },
      ];
    },
    draw(ctx, t, _dt, p) {
      const R = Math.max(w, h);
      const sun = ctx.createRadialGradient(w * 0.82, h * 0.04, 0, w * 0.82, h * 0.04, R * 0.85);
      sun.addColorStop(0, rgba(p.accent, 0.22 + 0.03 * Math.sin(t * 0.4)));
      sun.addColorStop(0.35, rgba(p.accent2, 0.08));
      sun.addColorStop(1, rgba(p.accent2, 0));
      ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
      if (!shadow) return;
      ctx.save();
      ctx.globalAlpha *= 0.55;
      for (const s of spots) {
        ctx.save();
        ctx.translate(s.x + Math.sin(t * 0.35 + s.ph) * 14, s.y + Math.cos(t * 0.28 + s.ph) * 8);
        ctx.rotate(s.r + Math.sin(t * 0.3 + s.ph) * 0.05);
        const sc = s.s / shadow.height;
        ctx.scale(sc, sc);
        ctx.drawImage(shadow, -shadow.width / 2, -shadow.height / 2);
        ctx.restore();
      }
      ctx.restore();
    },
  };
}

/* ~/contact : a carrier wave and rings going out. */
function signalScene(): Scene {
  let w = 0, h = 0;
  return {
    resize(W, H) { w = W; h = H; },
    draw(ctx, t, _dt, p) {
      const cx = w * 0.84, cy = h * 0.8;
      const max = Math.hypot(w, h) * 0.7;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        const f = ((t * 0.12 + i / 6) % 1);
        ctx.strokeStyle = rgba(p.accent, (1 - f) * 0.22);
        ctx.beginPath(); ctx.arc(cx, cy, f * max, 0, 6.283); ctx.stroke();
      }
      ctx.fillStyle = rgba(p.accent, 0.7);
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 6.283); ctx.fill();
      for (let k = 0; k < 2; k++) {
        ctx.strokeStyle = rgba(k ? p.accent2 : p.accent, 0.12);
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const y = h * (0.28 + k * 0.06) + Math.sin(x * 0.012 + t * (1.1 + k * 0.4)) * 22 * Math.sin(x * 0.002 + t * 0.2);
          if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    },
  };
}

const factories: Record<Theme, () => Scene> = {
  soil: soilScene,
  sunlit: sunScene,
  pcb: pcbScene,
  ide: treeScene,
  greenhouse: leavesScene,
  dawn: shadowScene,
  signal: signalScene,
};

export function startAmbient(canvas: HTMLCanvasElement): (theme: Theme) => void {
  const ctx = canvas.getContext("2d")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const scenes = new Map<Theme, Scene>();
  let layers: { theme: Theme; alpha: number; target: number }[] = [];
  let w = 0, h = 0, dpr = 1;
  let palette: Palette = { fg: "#eadfcd", accent: "#8ce99c", accent2: "#318c3b", bg: "#140b04" };
  let paletteAt = 0;
  let last = performance.now();
  let raf = 0;

  const scene = (theme: Theme) => {
    let s = scenes.get(theme);
    if (!s) { s = factories[theme](); s.resize(w, h); scenes.set(theme, s); }
    return s;
  };

  const readPalette = () => {
    const cs = getComputedStyle(document.documentElement);
    palette = {
      fg: cs.getPropertyValue("--fg").trim(),
      accent: cs.getPropertyValue("--accent").trim(),
      accent2: cs.getPropertyValue("--accent-2").trim(),
      bg: cs.getPropertyValue("--bg").trim(),
    };
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    for (const s of scenes.values()) s.resize(w, h);
    if (reduced.matches) frame(performance.now());
  };

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (now - paletteAt > 120) { readPalette(); paletteAt = now; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const t = now / 1000;
    for (const l of layers) {
      l.alpha += Math.sign(l.target - l.alpha) * Math.min(Math.abs(l.target - l.alpha), dt * 1.4);
      if (reduced.matches) l.alpha = l.target;
      if (l.alpha <= 0) continue;
      ctx.globalAlpha = l.alpha;
      scene(l.theme).draw(ctx, t, reduced.matches ? 0 : dt, palette);
    }
    ctx.globalAlpha = 1;
    layers = layers.filter((l) => l.alpha > 0 || l.target > 0);
    if (!reduced.matches && !document.hidden) raf = requestAnimationFrame(frame);
  };

  const loop = () => {
    cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  window.addEventListener("pointerleave", () => { pointer.x = pointer.y = -9999; });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !reduced.matches) loop(); });
  reduced.addEventListener("change", () => (reduced.matches ? frame(performance.now()) : loop()));
  resize();

  return (theme: Theme) => {
    for (const l of layers) l.target = l.theme === theme ? 1 : 0;
    if (!layers.some((l) => l.theme === theme)) layers.push({ theme, alpha: layers.length ? 0 : 1, target: 1 });
    if (reduced.matches) {
      // Let the CSS variables settle before drawing the single static frame.
      requestAnimationFrame(() => { readPalette(); frame(performance.now()); });
    } else loop();
  };
}
