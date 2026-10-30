import { makeCanvas, type Minigame } from './types';

// Perfect Slice ASMR: drop the knife exactly on the line. Five cuts, every
// one at least GOOD, and at least three PERFECT. Very relaxing.

const W = 360;
const H = 600;
const CAKE_Y = 330;
const CAKE_H = 90;
const CUTS = 5;
const PERFECTS = 3;

export function perfectSlice(host: HTMLElement, d: number): Minigame {
  const canvas = makeCanvas(host, W, H);
  const ctx = canvas.getContext('2d')!;
  const tol = Math.max(3, 7 - d * 0.6);
  let cut = 0;
  let perfects = 0;
  let line = 0;
  let lineV = 0;
  let knifeX = 40;
  let knifeV = 0;
  let drop = 0; // 0 = hovering, >0 = falling progress
  let verdict = '';
  let verdictT = 0;
  let pieces: { x: number; w: number; vy: number; y: number; r: number }[] = [];
  let done = false;
  let raf = 0;
  let last = performance.now();
  let resolve!: (won: boolean) => void;
  const result = new Promise<boolean>((r) => (resolve = r));

  const newRound = () => {
    line = 90 + Math.random() * 180;
    // From v1.5 the line wanders off while you aim.
    lineV = d >= 5 ? (Math.random() < 0.5 ? -1 : 1) * 30 : 0;
    knifeV = (170 + cut * 35 + d * 15) * (Math.random() < 0.5 ? -1 : 1);
    drop = 0;
  };
  newRound();

  const onDown = () => {
    if (done || drop > 0) return;
    drop = 0.0001;
  };
  canvas.addEventListener('pointerdown', onDown);
  const onKey = (e: KeyboardEvent) => e.key === ' ' && onDown();
  window.addEventListener('keydown', onKey);

  function judge() {
    const err = Math.abs(knifeX - line);
    pieces.push({ x: knifeX, w: W - 40 - knifeX, vy: 0, y: CAKE_Y, r: 0 });
    cut++;
    if (err <= tol) {
      perfects++;
      verdict = 'PERFECT!';
    } else if (err <= tol * 3) {
      verdict = 'GOOD';
    } else {
      verdict = 'MISS';
      done = true;
      setTimeout(() => resolve(false), 1000);
      return;
    }
    verdictT = 0.8;
    if (cut >= CUTS) {
      done = true;
      const won = perfects >= PERFECTS;
      verdict = won ? 'SO SATISFYING' : `Only ${perfects} PERFECT. Need ${PERFECTS}.`;
      setTimeout(() => resolve(won), 1200);
      return;
    }
    setTimeout(newRound, 650);
  }

  function step(dt: number) {
    if (verdictT > 0) verdictT -= dt;
    line += lineV * dt;
    if (line < 60 || line > W - 60) lineV = -lineV;
    if (drop === 0) {
      knifeX += knifeV * dt;
      if (knifeX < 40 || knifeX > W - 40) {
        knifeV = -knifeV;
        knifeX = Math.max(40, Math.min(W - 40, knifeX));
      }
    } else if (drop < 1) {
      drop = Math.min(1, drop + dt * 6);
      if (drop >= 1) judge();
    }
    for (const p of pieces) {
      p.vy += 900 * dt;
      p.y += p.vy * dt * 0.3;
      p.r += dt * 0.6;
    }
    pieces = pieces.filter((p) => p.y < H + 200);
  }

  function draw() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ffe3f1');
    g.addColorStop(1, '#ffc2dd');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.fillRect(20, CAKE_Y + CAKE_H, W - 40, 14);

    // Cake.
    const cakeRight = W - 40;
    ctx.fillStyle = '#8d5524';
    ctx.fillRect(40, CAKE_Y, cakeRight - 40, CAKE_H);
    ctx.fillStyle = '#ffb6d5';
    ctx.fillRect(40, CAKE_Y, cakeRight - 40, 18);
    ctx.fillStyle = '#fff6';
    ctx.fillRect(40, CAKE_Y + 45, cakeRight - 40, 6);
    for (const p of pieces) {
      ctx.save();
      ctx.translate(p.x + 20, p.y + CAKE_H / 2);
      ctx.rotate(p.r);
      ctx.fillStyle = '#8d5524';
      ctx.fillRect(-10, -CAKE_H / 2, 40, CAKE_H);
      ctx.fillStyle = '#ffb6d5';
      ctx.fillRect(-10, -CAKE_H / 2, 40, 18);
      ctx.restore();
    }

    // Target line.
    if (!done) {
      ctx.strokeStyle = '#ff1f6b';
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(line, CAKE_Y - 30);
      ctx.lineTo(line, CAKE_Y + CAKE_H + 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Knife.
    const ky = CAKE_Y - 150 + drop * 150 + (drop > 0 ? CAKE_H * drop : 0);
    ctx.fillStyle = '#cfd8dc';
    ctx.beginPath();
    ctx.moveTo(knifeX - 4, ky - 110);
    ctx.lineTo(knifeX + 10, ky - 110);
    ctx.lineTo(knifeX + 2, ky);
    ctx.lineTo(knifeX - 4, ky);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(knifeX - 6, ky - 160, 18, 52);

    ctx.fillStyle = '#5a1840';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Cut ${Math.min(cut + 1, CUTS)}/${CUTS} · PERFECT ${perfects}/${PERFECTS}`, W / 2, H - 40);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('Tap to drop the knife', W / 2, H - 18);
    if (verdict && (verdictT > 0 || done)) {
      ctx.font = `bold ${verdict.length > 14 ? 20 : 34}px system-ui, sans-serif`;
      ctx.fillStyle = verdict === 'PERFECT!' || verdict === 'SO SATISFYING' ? '#ff1f6b' : '#5a1840';
      ctx.fillText(verdict, W / 2, 490);
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
