import { canvasPoint, makeCanvas, type Minigame } from './types';
import { EMPTY, GH, GOLD, GW, HERO, LAVA, PIN, STONE, WALL, WATER, makeLevel, pull, step, verdict, TARGET } from './pins';

const CELL = 10;
const W = GW * CELL;
const H = GH * CELL + 40;
const TOP = 40;

const COLORS: Record<number, string> = {
  [WALL]: '#6b4a2b',
  [GOLD]: '#ffc928',
  [LAVA]: '#ff4d1a',
  [WATER]: '#3aa0ff',
  [STONE]: '#555',
  [HERO]: '#ffd1a8',
};

export function pullPin(host: HTMLElement, d: number): Minigame {
  const level = makeLevel(d >= 2 ? 1 : 0);
  const canvas = makeCanvas(host, W, H);
  const ctx = canvas.getContext('2d')!;
  // From patch v1.4 on, the "player" from the ad tries to solve it for you. Badly.
  const handActive = d >= 4;
  const hand = { x: W / 2, y: H + 40, target: -1, wait: 4 };
  let done = false;
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  let resolve!: (won: boolean) => void;
  const result = new Promise<boolean>((r) => (resolve = r));

  const pinRect = (id: number) => {
    const p = level.pins[id];
    return { x: p.x0 * CELL - 4, y: TOP + p.y * CELL - 6, w: (p.x1 - p.x0 + 1) * CELL + 8, h: CELL + 12 };
  };

  const onDown = (e: PointerEvent) => {
    if (done) return;
    const pt = canvasPoint(canvas, W, e);
    if (handActive && Math.hypot(pt.x - hand.x, pt.y - hand.y) < 34) {
      // Swat the hand away.
      hand.y = H + 60;
      hand.wait = 2 + Math.random() * 1.5;
      hand.target = -1;
      return;
    }
    for (const p of level.pins) {
      const r = pinRect(p.id);
      if (!p.pulled && pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) {
        pull(level, p.id);
        return;
      }
    }
  };
  canvas.addEventListener('pointerdown', onDown);

  function updateHand(dt: number) {
    if (!handActive) return;
    if (hand.target < 0) {
      hand.wait -= dt;
      if (hand.wait > 0) return;
      const bait = level.pins.filter((p) => p.bait && !p.pulled);
      if (!bait.length) return;
      hand.target = bait[Math.floor(Math.random() * bait.length)].id;
    }
    const r = pinRect(hand.target);
    const tx = r.x + r.w / 2;
    const ty = r.y + r.h / 2;
    const dist = Math.hypot(tx - hand.x, ty - hand.y);
    const speed = 70 + 15 * d;
    if (dist < 6) {
      pull(level, hand.target);
      hand.target = -1;
      hand.wait = 3;
      return;
    }
    hand.x += ((tx - hand.x) / dist) * speed * dt;
    hand.y += ((ty - hand.y) / dist) * speed * dt;
  }

  function draw() {
    ctx.fillStyle = '#f5e6c8';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#222';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const pct = Math.floor((level.collected / Math.ceil(level.goldTotal * TARGET)) * 100);
    ctx.fillText(`SAVE HIM! Gold: ${Math.min(100, pct)}%`, W / 2, 26);

    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const v = level.grid[y * GW + x];
        if (v === EMPTY || v >= PIN) continue;
        ctx.fillStyle = COLORS[v];
        ctx.fillRect(x * CELL, TOP + y * CELL, CELL, CELL);
      }
    }

    for (const p of level.pins) {
      if (p.pulled) continue;
      const r = pinRect(p.id);
      ctx.fillStyle = '#c9ccd1';
      ctx.fillRect(r.x + 4, r.y + 8, r.w - 8, CELL - 4);
      ctx.strokeStyle = '#7a7d82';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 4, r.y + 8, r.w - 8, CELL - 4);
      // Knob at the open end.
      const kx = p.x0 <= 1 ? r.x + 6 : r.x + r.w - 6;
      ctx.fillStyle = '#9aa0a6';
      ctx.beginPath();
      ctx.arc(kx, r.y + 11, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // The hero's face.
    const hx = 18 * CELL;
    const hy = TOP + (GH - 4) * CELL;
    ctx.fillStyle = '#222';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(level.burnt ? 'x_x' : done ? '^_^' : 'o_o', hx, hy + 8);

    if (handActive) {
      ctx.font = '40px system-ui, sans-serif';
      ctx.fillText('👆', hand.x, hand.y + 30);
    }
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!done) {
      updateHand(dt);
      acc += dt;
      while (acc > 1 / 60) {
        step(level);
        acc -= 1 / 60;
      }
      const v = verdict(level);
      if (v) {
        done = true;
        setTimeout(() => resolve(v === 'win'), 900);
      }
    }
    draw();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    result,
    destroy() {
      cancelAnimationFrame(raf);
      canvas.remove();
    },
  };
}
