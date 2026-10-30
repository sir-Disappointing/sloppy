import { applyGate, bossHp, fineText, generateLevel, opText, shootGate, type RunState } from './gates';
import { canvasPoint, makeCanvas, type Minigame } from './types';

const W = 360;
const H = 600;
const PLAYER_Y = 500;
const ROW_GAP = 320;
const GATE_H = 80;

// Squad Shooter: the same run, but your crowd shoots the gates. Hits pump up
// "+" gates and wear down "−" gates; × and ÷ gates are armoured. The boss is
// tuned so you can't win without shooting.
export function squadShooter(host: HTMLElement, d: number): Minigame {
  return gateRunner(host, d, true);
}

export function gateRunner(host: HTMLElement, d: number, shooter = false): Minigame {
  // Squad Shooter levels are solved assuming ~10 hits per gate you take.
  const level = generateLevel(d, shooter ? 10 : 0);
  const canvas = makeCanvas(host, W, H);
  const ctx = canvas.getContext('2d')!;
  const speed = 110 + 20 * Math.min(d, 4);
  const fineSize = Math.max(8, 12 - d);

  let s: RunState = { count: level.start, bossA: 1, bossB: 0 };
  let x = W / 2;
  let targetX = W / 2;
  let scroll = 0;
  let nextRow = 0;
  let flash = '';
  let flashT = 0;
  let phase: 'run' | 'boss' | 'done' = 'run';
  let fightT = 0;
  let fightStart = { you: 0, boss: 0 };
  let bullets: { x: number; y: number }[] = [];
  let fireT = 0;
  let raf = 0;
  let last = performance.now();
  let resolve!: (won: boolean) => void;
  const result = new Promise<boolean>((r) => (resolve = r));

  // The first row starts above the screen; rows scroll down towards the player.
  const rowY = (i: number) => PLAYER_Y - 260 - i * ROW_GAP + scroll;
  const finishY = () => rowY(level.rows.length) + 100;

  const onMove = (e: PointerEvent) => {
    targetX = Math.max(20, Math.min(W - 20, canvasPoint(canvas, W, e).x));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') targetX = W * 0.25;
    if (e.key === 'ArrowRight' || e.key === 'd') targetX = W * 0.75;
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onMove);
  window.addEventListener('keydown', onKey);

  function end(won: boolean) {
    phase = 'done';
    setTimeout(() => resolve(won), 900);
  }

  function step(dt: number) {
    x += (targetX - x) * Math.min(1, dt * 10);
    if (flashT > 0) flashT -= dt;
    if (phase === 'run') {
      scroll += speed * dt;
      if (shooter) shoot(dt);
      while (nextRow < level.rows.length && rowY(nextRow) + GATE_H / 2 >= PLAYER_Y) {
        const gate = level.rows[nextRow][x < W / 2 ? 0 : 1];
        const before = s.count;
        s = applyGate(s, gate);
        const diff = s.count - before;
        flash = gate.fine === 'boss' ? (gate.op === '-' ? 'BOSS NERFED!' : 'BOSS BUFFED?!') : diff >= 0 ? `+${diff}` : `${diff}`;
        flashT = 0.8;
        nextRow++;
        if (s.count <= 0) {
          s.count = 0;
          end(false);
          return;
        }
      }
      if (nextRow === level.rows.length && finishY() >= 120) {
        phase = 'boss';
        fightStart = { you: s.count, boss: bossHp(s, level.bossBase) };
      }
    } else if (phase === 'boss') {
      fightT = Math.min(1, fightT + dt / 1.8);
      if (fightT >= 1) end(fightStart.you > fightStart.boss);
    }
  }

  function shoot(dt: number) {
    fireT -= dt;
    if (fireT <= 0) {
      fireT = 0.11;
      bullets.push({ x: x + (Math.random() - 0.5) * 10, y: PLAYER_Y - 20 });
    }
    bullets = bullets.filter((b) => {
      b.y -= 650 * dt;
      if (b.y < 0) return false;
      for (let i = nextRow; i < level.rows.length; i++) {
        const y = rowY(i);
        if (b.y > y + GATE_H / 2 || b.y < y - GATE_H / 2) continue;
        shootGate(level.rows[i][b.x < W / 2 ? 0 : 1], 1);
        return false;
      }
      return true;
    });
  }

  function drawCrowd(cx: number, cy: number, n: number, color: string) {
    const dots = Math.min(n, 120);
    ctx.fillStyle = color;
    for (let i = 0; i < dots; i++) {
      const a = i * 2.39996;
      const r = 4.2 * Math.sqrt(i);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    ctx.fillStyle = '#7ec8f0';
    ctx.fillRect(0, 0, W, H);
    // Track.
    ctx.fillStyle = '#e9d9b4';
    ctx.fillRect(30, 0, W - 60, H);
    ctx.strokeStyle = '#c9b78f';
    ctx.lineWidth = 3;
    ctx.setLineDash([24, 24]);
    ctx.lineDashOffset = -scroll;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    level.rows.forEach((row, i) => {
      const y = rowY(i);
      if (y < -GATE_H || y > H + GATE_H) return;
      row.forEach((g, side) => {
        const gx = side === 0 ? 34 : W / 2 + 4;
        const gw = W / 2 - 38;
        const good = g.op === '+' || g.op === 'x';
        ctx.globalAlpha = i < nextRow ? 0.25 : 0.85;
        ctx.fillStyle = good ? '#2f8cff' : '#ff4a4a';
        ctx.fillRect(gx, y - GATE_H / 2, gw, GATE_H);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 34px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(opText(g), gx + gw / 2, y + 8);
        if (shooter && (g.op === 'x' || g.op === '/' || g.fine === 'boss')) {
          ctx.font = 'bold 10px system-ui, sans-serif';
          ctx.fillText('ARMOURED', gx + gw / 2, y - GATE_H / 2 + 14);
        }
        const fine = fineText(g);
        if (fine) {
          ctx.font = `${fineSize}px system-ui, sans-serif`;
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillText(fine, gx + gw / 2, y + GATE_H / 2 - 6);
        }
      });
    });

    // Boss.
    const fighting = phase === 'boss' || (phase === 'done' && fightT > 0);
    const by = !fighting ? finishY() - 60 : 60;
    const hp = !fighting ? bossHp(s, level.bossBase) : Math.max(0, Math.round(fightStart.boss - Math.min(fightStart.boss, fightStart.you) * fightT));
    if (by > -80) {
      ctx.fillStyle = '#5a2a82';
      ctx.beginPath();
      ctx.arc(W / 2, by, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`BOSS ${hp}`, W / 2, by + 7);
    }

    ctx.fillStyle = '#ffd400';
    for (const b of bullets) ctx.fillRect(b.x - 1.5, b.y - 6, 3, 10);

    // Player crowd.
    const you = !fighting ? s.count : Math.max(0, Math.round(fightStart.you - Math.min(fightStart.boss, fightStart.you) * fightT));
    const py = fighting ? PLAYER_Y - (PLAYER_Y - 150) * fightT * 0.6 : PLAYER_Y;
    drawCrowd(x, py, you, '#1d4fd8');
    ctx.fillStyle = '#111';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(you), x, py - 48);

    // Always-visible boss HP, because the boss can change behind your back.
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, 28);
    ctx.fillStyle = '#fff';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Boss HP: ${bossHp(s, level.bossBase)}`, 10, 19);
    ctx.textAlign = 'right';
    ctx.fillText(`Gate ${Math.min(nextRow + 1, level.rows.length)}/${level.rows.length}`, W - 10, 19);

    if (flashT > 0) {
      ctx.globalAlpha = Math.min(1, flashT * 2);
      ctx.fillStyle = flash.startsWith('-') || flash === 'BOSS BUFFED?!' ? '#d00' : '#0a0';
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(flash, x, PLAYER_Y - 80);
      ctx.globalAlpha = 1;
    }
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (phase !== 'done') step(dt);
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
