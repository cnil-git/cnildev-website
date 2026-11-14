// The garden's monstera: a procedurally drawn plant that gains a leaf each
// time a visitor waters it. State is per visitor and stored locally.

import { LEAF_BOX, LEAF_HIGHLIGHT, LEAF_OUTLINE, LEAF_SHADE } from "./leaf";

const KEY = "cnil.garden.v1";
const MAX_LEAVES = 13;
const START_LEAVES = 3;

const outline = new Path2D(LEAF_OUTLINE);
const hi = new Path2D(LEAF_HIGHLIGHT);
const shade = new Path2D(LEAF_SHADE);

export interface GardenState { waters: number; last: number }

export function loadGarden(): GardenState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (typeof s.waters === "number" && typeof s.last === "number") return s;
    }
  } catch { /* storage unavailable */ }
  return { waters: 0, last: 0 };
}

function saveGarden(s: GardenState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

export function leafCount(s: GardenState): number {
  return Math.min(MAX_LEAVES, START_LEAVES + s.waters);
}

export function mood(s: GardenState): string {
  if (!s.last) return "thirsty";
  const mins = (Date.now() - s.last) / 60000;
  if (mins < 0.2) return "glistening";
  if (mins < 60) return "happy";
  if (mins < 60 * 24) return "content";
  return "a little thirsty";
}

/** Water the plant. Returns the new state and whether a leaf was added. */
export function water(): { state: GardenState; grew: boolean; tooSoon: boolean } {
  const s = loadGarden();
  const tooSoon = Date.now() - s.last < 1500;
  const before = leafCount(s);
  if (!tooSoon) {
    s.waters += 1;
    s.last = Date.now();
    saveGarden(s);
  }
  const grew = leafCount(s) > before;
  window.dispatchEvent(new CustomEvent("garden:water", { detail: { grew } }));
  return { state: s, grew, tooSoon };
}

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface LeafSpec { x: number; y: number; ang: number; size: number; side: number }

/** Layout in a 300 x 400 box. Leaf i is placed higher and larger as i grows. */
function layout(): LeafSpec[] {
  const r = rng(1022);
  return Array.from({ length: MAX_LEAVES }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const tier = i / (MAX_LEAVES - 1);
    return {
      x: 150 + side * (40 + r() * 70) * (0.6 + tier * 0.5),
      y: 300 - tier * 230 - r() * 20,
      ang: side * (0.5 + r() * 0.5) - 0.05,
      size: 70 + tier * 30 + r() * 26,
      side,
    };
  });
}

function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, rot: number, grow: number) {
  if (grow <= 0) return;
  const s = (h * grow) / LEAF_BOX.h;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  // Anchor at the petiole (bottom center of the leaf).
  ctx.translate(-(LEAF_BOX.x + LEAF_BOX.w / 2), -(LEAF_BOX.y + LEAF_BOX.h));
  ctx.fillStyle = "#318c3b";
  ctx.fill(outline, "evenodd");
  ctx.clip(outline, "evenodd");
  ctx.fillStyle = "#8ce99c";
  ctx.fill(hi, "evenodd");
  ctx.fillStyle = "#589562";
  ctx.fill(shade, "evenodd");
  ctx.restore();
}

export function mountPlant(root: HTMLElement): () => void {
  const canvas = root.querySelector<HTMLCanvasElement>("#plant");
  if (!canvas) return () => {};
  const ctx = canvas.getContext("2d")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const specs = layout();
  const born = new Map<number, number>();
  let shown = leafCount(loadGarden());
  let splash = 0;
  let grewAt = -1;
  let raf = 0;
  let alive = true;

  const stats = () => {
    const s = loadGarden();
    const set = (id: string, v: string) => { const el = root.querySelector(`#${id}`); if (el) el.textContent = v; };
    set("g-leaves", `${leafCount(s)} / ${MAX_LEAVES}`);
    set("g-waters", s.waters ? `${s.waters} time${s.waters === 1 ? "" : "s"} by you` : "not yet");
    set("g-mood", mood(s));
    const meter = root.querySelector<HTMLElement>("#g-meter");
    if (meter) meter.style.width = `${(leafCount(s) / MAX_LEAVES) * 100}%`;
  };

  const size = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
  };

  const draw = (now: number) => {
    const t = now / 1000;
    const W = canvas.width, H = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const k = Math.min(W / 300, H / 400);
    ctx.setTransform(k, 0, 0, k, (W - 300 * k) / 2, (H - 400 * k) / 2);

    // Moss pole.
    ctx.fillStyle = "#5a3a1c";
    ctx.beginPath(); ctx.roundRect(144, 60, 12, 280, 6); ctx.fill();
    ctx.fillStyle = "rgba(140,233,156,0.18)";
    for (let y = 70; y < 330; y += 14) { ctx.beginPath(); ctx.arc(150 + Math.sin(y) * 3, y, 3, 0, 6.283); ctx.fill(); }

    // Stems first, then leaves, so leaves sit on top.
    const leaves: [LeafSpec, number, number][] = [];
    for (let i = 0; i < shown; i++) {
      const sp = specs[i];
      const b = born.get(i);
      const g = b === undefined ? 1 : Math.min(1, (now - b) / 1400);
      const ease = 1 - Math.pow(1 - g, 3);
      const sway = reduced ? 0 : Math.sin(t * 0.8 + i * 1.3) * 0.035;
      const tipX = 150 + (sp.x - 150) * ease, tipY = 330 + (sp.y - 330) * ease;
      ctx.strokeStyle = "#3f7f3f"; ctx.lineWidth = 3.2; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(150 + sp.side * 4, 330);
      ctx.quadraticCurveTo(150 + sp.side * 10, (330 + tipY) / 2 - 20, tipX, tipY);
      ctx.stroke();
      leaves.push([{ ...sp, x: tipX, y: tipY }, ease, sway]);
    }
    for (const [sp, ease, sway] of leaves) drawLeaf(ctx, sp.x, sp.y, sp.size, sp.ang + sway, ease);

    // Pot.
    const potTop = 322;
    ctx.fillStyle = "#3a2210";
    ctx.beginPath(); ctx.ellipse(150, potTop + 4, 82, 10, 0, 0, 6.283); ctx.fill();
    const g = ctx.createLinearGradient(70, 0, 230, 0);
    g.addColorStop(0, "#9c4f22"); g.addColorStop(0.5, "#c4703a"); g.addColorStop(1, "#8a431b");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(66, potTop); ctx.lineTo(234, potTop); ctx.lineTo(214, 396); ctx.lineTo(86, 396); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#b8612b";
    ctx.beginPath(); ctx.roundRect(60, potTop - 6, 180, 22, 5); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(64, potTop - 4, 172, 4);

    // Water drops after watering.
    if (splash && now - splash < 1200) {
      const p = (now - splash) / 1200;
      ctx.fillStyle = `rgba(150,210,255,${0.8 * (1 - p)})`;
      for (let d = 0; d < 7; d++) {
        const x = 110 + d * 13 + Math.sin(d * 7) * 5;
        const y = 120 + p * 210 + (d % 3) * 12;
        ctx.beginPath(); ctx.ellipse(x, y, 2.2, 4.5, 0, 0, 6.283); ctx.fill();
      }
      if (grewAt === splash) {
        ctx.fillStyle = `rgba(182,240,138,${1 - p})`;
        ctx.font = "600 18px 'JetBrains Mono Variable', monospace";
        ctx.textAlign = "center";
        ctx.fillText("+1 leaf", 150, 40 - p * 20);
      }
    }

    if (alive && !reduced) raf = requestAnimationFrame(draw);
  };

  const onWater = (e: Event) => {
    const grew = (e as CustomEvent).detail?.grew;
    const next = leafCount(loadGarden());
    if (grew && next > shown) { born.set(next - 1, performance.now()); shown = next; }
    splash = performance.now();
    if (grew) grewAt = splash;
    stats();
    // Let the shell finish scrolling to the new output, then show the plant.
    window.setTimeout(() => canvas.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" }), 60);
    if (reduced) draw(performance.now());
  };

  const ro = new ResizeObserver(() => { size(); if (reduced) draw(performance.now()); });
  ro.observe(canvas);
  window.addEventListener("garden:water", onWater);
  size();
  stats();
  raf = requestAnimationFrame(draw);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener("garden:water", onWater);
  };
}
