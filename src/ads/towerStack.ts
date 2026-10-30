import { canvasPoint, makeCanvas, type Minigame } from './types';

// Stack Tower Pro: tap to drop the sliding block. Whatever hangs over gets
// sliced off. From v1.4 the ad's "player" hand keeps trying to tap for you.

const W = 360;
const H = 600;
const BH = 26;
const BASE_Y = H - 60;

interface Block {
  x: number;
  w: number;
  hue: number;
}

export function towerStack(host: HTMLElement, d: number): Minigame {
  const canvas = makeCanvas(host, W, H);
  const ctx = canvas.getContext('2d')!;
  const goal = 10 + Math.min(d, 6);
  const stack: Block[] = [{ x: 80, w: 200, hue: 30 }];
  let cur: Block = { x: 0, w: 200, hue: 45 };
  let dir = 1;
  let speed = 150 + d * 12;
  let cam = 0;
  let falling: { x: number; w: number; y: number; vy: number; hue: number }[] = [];
  let banner = '';
  let bannerT = 0;
  let done = false;
  const handActive = d >= 4;
  const hand = { x: W + 40, y: 200, wait: 3, active: false };
  let raf = 0;
  let last = performance.now();
  let resolve!: (won: boolean) => void;
  const result = new Promise<boolean>((r) => (resolve = r));

  const rowY = (i: number) => BASE_Y - i * BH + cam;

  function place() {
    if (done) return;
    const top = stack[stack.length - 1];
    let left = Math.max(cur.x, top.x);
    let right = Math.min(cur.x + cur.w, top.x + top.w);
    if (right - left <= 0) {
      falling.push({ x: cur.x, w: cur.w, y: rowY(stack.length), vy: 0, hue: cur.hue });
      done = true;
      banner = 'MISSED!';
      bannerT = 2;
      setTimeout(() => resolve(false), 1100);
      return;
    }
    if (Math.abs(cur.x - top.x) < 4) {
      // Close enough: snap to perfect.
      left = top.x;
      right = top.x + top.w;
      banner = 'PERFECT!';
      bannerT = 0.6;
    } else {
      const offX = cur.x < top.x ? cur.x : right;
      falling.push({ x: offX, w: cur.w - (right - left), y: rowY(stack.length), vy: 0, hue: cur.hue });
    }
    stack.push({ x: left, w: right - left, hue: cur.hue });
    if (stack.length - 1 >= goal) {
      done = true;
      banner = 'TOWER COMPLETE!';
      bannerT = 2;
      setTimeout(() => resolve(true), 1100);
      return;
    }
    speed += 12;
    dir = Math.random() < 0.5 ? 1 : -1;
    cur = { x: dir > 0 ? -right + left : W, w: right - left, hue: (cur.hue + 25) % 360 };
  }

  const onDown = (e: PointerEvent) => {
    const p = canvasPoint(canvas, W, e);
    if (hand.active && Math.hypot(p.x - hand.x, p.y - hand.y) < 40) {
      hand.active = false;
      hand.x = W + 40;
      hand.wait = 2 + Math.random() * 2;
      return;
    }
    place();
  };
  canvas.addEventListener('pointerdown', onDown);
  const onKey = (e: KeyboardEvent) => e.key === ' ' && place();
  window.addEventListener('keydown', onKey);

  function step(dt: number) {
    if (bannerT > 0) bannerT -= dt;
    if (!done) {
      cur.x += dir * speed * dt;
      if (cur.x > W - cur.w * 0.2 || cur.x < -cur.w * 0.8) dir = -dir;
    }
    const want = Math.max(0, (stack.length - 12) * BH);
    cam += (want - cam) * Math.min(1, dt * 4);
    for (const f of falling) {
      f.vy += 900 * dt;
      f.y += f.vy * dt;
    }
    falling = falling.filter((f) => f.y < H + 100);

    if (handActive && !done) {
      if (!hand.active) {
        hand.wait -= dt;
        if (hand.wait <= 0) {
          hand.active = true;
          hand.x = W + 30;
          hand.y = 120 + Math.random() * 200;
        }
      } else {
        hand.x -= 90 * dt;
        if (hand.x < W * 0.55) {
          // The hand taps. Whatever happens, happens.
          hand.active = false;
          hand.x = W + 40;
          hand.wait = 2.5 + Math.random() * 2;
          banner = 'The ad player tapped!';
          bannerT = 0.8;
          place();
        }
      }
    }
  }

  function draw() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1b2a49');
    g.addColorStop(1, '#4b6cb7');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0e1626';
    ctx.fillRect(0, BASE_Y + BH + cam, W, H);

    stack.forEach((b, i) => {
      ctx.fillStyle = `hsl(${b.hue} 80% 60%)`;
      ctx.fillRect(b.x, rowY(i), b.w, BH - 2);
    });
    for (const f of falling) {
      ctx.fillStyle = `hsl(${f.hue} 60% 45%)`;
      ctx.fillRect(f.x, f.y, f.w, BH - 2);
    }
    if (!done) {
      ctx.fillStyle = `hsl(${cur.hue} 80% 60%)`;
      ctx.fillRect(cur.x, rowY(stack.length), cur.w, BH - 2);
    }
    if (handActive && hand.active) {
      ctx.font = '44px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👈', hand.x, hand.y);
    }

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`${stack.length - 1} / ${goal}`, W / 2, 34);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(handActive ? 'Tap to drop · tap the hand to swat it' : 'Tap to drop the block', W / 2, 54);
    if (bannerT > 0 || done) {
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.fillStyle = '#ffd400';
      ctx.fillText(banner, W / 2, 110);
    }
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    result,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      canvas.remove();
    },
  };
}
