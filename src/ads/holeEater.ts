import { canvasPoint, makeCanvas, type Minigame } from './types';

// Hole Eater.io: be #1 when the timer ends. The bots have suspicious names,
// and xX_Player_Xx bought the Battle Pass, so he grows on his own.

const W = 360;
const H = 600;
const TOP = 30;

interface Thing {
  x: number;
  y: number;
  s: number;
  e: string;
}

interface Hole {
  name: string;
  x: number;
  y: number;
  r: number;
  you: boolean;
  cheat: boolean;
  alive: boolean;
  tx: number;
  ty: number;
}

const KINDS: [string, number, number][] = [
  // emoji, radius, how many
  ['🧍', 4, 55],
  ['🚧', 5, 22],
  ['🌳', 8, 18],
  ['🚗', 10, 14],
  ['🍔', 12, 8],
  ['🏪', 17, 6],
  ['🏠', 22, 4],
  ['🏢', 30, 3],
];

const BOT_NAMES = ['xX_Player_Xx', 'BurgerLord99', 'hole_hole_hole', 'Player7731', 'not_a_bot'];

export function holeEater(host: HTMLElement, d: number): Minigame {
  const canvas = makeCanvas(host, W, H);
  const ctx = canvas.getContext('2d')!;
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const things: Thing[] = [];
  const spawn = (e: string, s: number) => things.push({ x: rand(s, W - s), y: rand(TOP + s, H - s), e, s });
  for (const [e, s, n] of KINDS) for (let i = 0; i < n; i++) spawn(e, s);

  const bots = Math.min(5, 3 + Math.max(0, d - 3));
  const holes: Hole[] = [{ name: 'You', x: W / 2, y: H / 2, r: 11, you: true, cheat: false, alive: true, tx: W / 2, ty: H / 2 }];
  for (let i = 0; i < bots; i++) {
    const a = (i / bots) * Math.PI * 2;
    holes.push({
      name: BOT_NAMES[i],
      x: W / 2 + Math.cos(a) * 130,
      y: H / 2 + Math.sin(a) * 200,
      r: 11,
      you: false,
      cheat: i === 0,
      alive: true,
      tx: 0,
      ty: 0,
    });
  }
  const you = holes[0];
  const duration = 40;
  let time = duration;
  let respawn = 0;
  let done = false;
  let raf = 0;
  let last = performance.now();
  let resolve!: (won: boolean) => void;
  const result = new Promise<boolean>((r) => (resolve = r));

  const onMove = (e: PointerEvent) => {
    const p = canvasPoint(canvas, W, e);
    you.tx = p.x;
    you.ty = p.y;
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onMove);
  const keys = new Set<string>();
  const onKey = (e: KeyboardEvent) => (e.type === 'keydown' ? keys.add(e.key) : keys.delete(e.key));
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  const speedOf = (h: Hole) => Math.max(40, 95 - h.r * 0.9) * (h.you ? 1 : 0.8 + 0.04 * d);

  function end(won: boolean) {
    done = true;
    setTimeout(() => resolve(won), 1000);
  }

  function step(dt: number) {
    time -= dt;
    if (keys.size) {
      you.tx = you.x + ((keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)) * 50;
      you.ty = you.y + ((keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0)) * 50;
    }
    for (const h of holes) {
      if (!h.alive) continue;
      if (!h.you) think(h);
      if (h.cheat) h.r += (0.18 + 0.05 * d) * dt;
      const dx = h.tx - h.x;
      const dy = h.ty - h.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        const v = Math.min(dist, speedOf(h) * dt);
        h.x += (dx / dist) * v;
        h.y += (dy / dist) * v;
      }
      h.x = Math.max(h.r * 0.5, Math.min(W - h.r * 0.5, h.x));
      h.y = Math.max(TOP + h.r * 0.5, Math.min(H - h.r * 0.5, h.y));

      for (let i = things.length - 1; i >= 0; i--) {
        const t = things[i];
        if (t.s < h.r * 0.85 && Math.hypot(t.x - h.x, t.y - h.y) < h.r - t.s * 0.4) {
          things.splice(i, 1);
          h.r = Math.sqrt(h.r * h.r + t.s * t.s * 0.55);
        }
      }
    }
    for (const a of holes) {
      for (const b of holes) {
        if (a === b || !a.alive || !b.alive) continue;
        if (a.r > b.r * 1.15 && Math.hypot(a.x - b.x, a.y - b.y) < a.r - b.r * 0.4) {
          b.alive = false;
          a.r = Math.sqrt(a.r * a.r + b.r * b.r * 0.7);
          if (b.you) return end(false);
        }
      }
    }
    respawn -= dt;
    if (respawn <= 0 && things.length < 140) {
      respawn = 0.35;
      const [e, s] = KINDS[Math.floor(Math.random() * 3)];
      spawn(e, s);
    }
    if (time <= 0) {
      time = 0;
      end(ranking()[0] === you);
    }
  }

  // Bots chase the best snack in reach, or a smaller hole.
  function think(h: Hole) {
    let best: { x: number; y: number } | null = null;
    let bestScore = -Infinity;
    for (const t of things) {
      if (t.s >= h.r * 0.85) continue;
      const dist = Math.hypot(t.x - h.x, t.y - h.y);
      const score = t.s * t.s - dist * 0.6;
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
    for (const o of holes) {
      if (o === h || !o.alive || o.r * 1.2 > h.r) continue;
      const dist = Math.hypot(o.x - h.x, o.y - h.y);
      const score = o.r * o.r * 2 - dist * 0.6;
      if (score > bestScore) {
        bestScore = score;
        best = o;
      }
    }
    if (best) {
      h.tx = best.x;
      h.ty = best.y;
    }
  }

  const ranking = () => holes.filter((h) => h.alive).sort((a, b) => b.r - a.r);

  function draw() {
    ctx.fillStyle = '#9aa3ad';
    ctx.fillRect(0, 0, W, H);
    // City blocks.
    ctx.fillStyle = '#b9c1c9';
    for (let y = TOP + 10; y < H; y += 90) for (let x = 10; x < W; x += 90) ctx.fillRect(x, y, 70, 70);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of things) {
      ctx.font = `${t.s * 2}px system-ui, sans-serif`;
      ctx.fillText(t.e, t.x, t.y);
    }
    for (const h of holes) {
      if (!h.alive) continue;
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = h.you ? '#2f8cff' : '#e33';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = h.you ? '#0b3d91' : '#600';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(h.name, h.x, h.y - h.r - 8);
    }

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, TOP);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`⏱ ${Math.ceil(time)}s`, 10, 20);
    ctx.textAlign = 'right';
    ctx.fillText('Be #1 when time runs out', W - 10, 20);

    const rank = ranking();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(W - 150, TOP + 6, 144, 16 * rank.length + 8);
    ctx.font = '12px system-ui, sans-serif';
    rank.forEach((h, i) => {
      ctx.fillStyle = h.you ? '#0b3d91' : '#222';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}. ${h.name}`, W - 144, TOP + 20 + i * 16);
      ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(h.r * h.r)), W - 12, TOP + 20 + i * 16);
    });
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!done) step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    result,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      canvas.remove();
    },
  };
}
