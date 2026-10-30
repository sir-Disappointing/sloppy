import type { Minigame } from './types';

// Number Tower: absorb enemies weaker than you, drink potions, beat the boss.
// Touch anything stronger and you're done. Later patches print the numbers
// in Roman numerals and scientific notation "for a premium feel".

interface Room {
  kind: 'enemy' | 'potion';
  n: number;
  done: boolean;
}

const ENEMIES = ['👺', '🧟', '🐺', '🦂', '🐍', '👻', '🤡', '🦇'];

function roman(n: number): string {
  if (n <= 0 || n >= 4000) return String(n);
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  for (const [v, s] of table) while (n >= v) { out += s; n -= v; }
  return out;
}

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

// Builds a solvable set of rooms by playing it forwards.
function build(): { start: number; rooms: Room[] } {
  const start = rand(5, 9);
  let p = start;
  const rooms: Room[] = [];
  for (let i = 0; i < 11; i++) {
    if (i === 4 || i === 8) {
      const m = rand(2, 3);
      rooms.push({ kind: 'potion', n: m, done: false });
      p *= m;
    } else {
      const n = rand(Math.max(1, Math.ceil(p * 0.4)), p - 1);
      rooms.push({ kind: 'enemy', n, done: false });
      p += n;
    }
  }
  return { start, rooms };
}

// Best final power: take every add you can (smallest first), and only drink a
// potion when stuck, so multipliers land on the biggest number.
function bestFinal(start: number, rooms: Room[]): number {
  let p = start;
  const adds = rooms.filter((r) => r.kind === 'enemy').map((r) => r.n).sort((a, b) => a - b);
  const pots = rooms.filter((r) => r.kind === 'potion').map((r) => r.n).sort((a, b) => b - a);
  while (adds.length || pots.length) {
    if (adds.length && adds[0] < p) p += adds.shift()!;
    else if (pots.length) p *= pots.shift()!;
    else break;
  }
  return p;
}

export function numberTower(host: HTMLElement, d: number): Minigame {
  const { start, rooms } = build();
  const boss = Math.floor(bestFinal(start, rooms) * (0.8 + 0.028 * Math.min(d, 6)));
  const shuffled = [...rooms].sort(() => Math.random() - 0.5);
  let power = start;
  let over = false;
  let resolve!: (won: boolean) => void;
  const result = new Promise<boolean>((r) => (resolve = r));

  const fmt = (n: number, i: number) => {
    if (d >= 5 && i % 3 === 0 && n >= 100) return n.toExponential(1).replace('+', '');
    if (d >= 3 && i % 2 === 0) return roman(n);
    return String(n);
  };

  const root = document.createElement('div');
  root.className = 'ad-dom tower';
  host.appendChild(root);

  const finish = (won: boolean, msg: string) => {
    over = true;
    render();
    const v = document.createElement('p');
    v.className = 'nt-verdict';
    v.textContent = msg;
    root.appendChild(v);
    setTimeout(() => resolve(won), 1200);
  };

  function render() {
    root.innerHTML = `<div class="nt-hero">🦸 <b>${power}</b></div>
      <button class="nt-room nt-boss">👹<span>BOSS ${fmt(boss, 0)}</span></button>
      <div class="nt-grid"></div>`;
    const grid = root.querySelector<HTMLElement>('.nt-grid')!;
    shuffled.forEach((room, i) => {
      const b = document.createElement('button');
      b.className = `nt-room ${room.kind}${room.done ? ' done' : ''}`;
      b.disabled = room.done || over;
      b.innerHTML = room.done
        ? '✓'
        : room.kind === 'potion'
          ? `🧪<span>×${room.n}</span>`
          : `${ENEMIES[i % ENEMIES.length]}<span>${fmt(room.n, i)}</span>`;
      b.onclick = () => {
        if (over || room.done) return;
        if (room.kind === 'potion') power *= room.n;
        else if (room.n < power) power += room.n;
        else return finish(false, `${room.n} ≥ ${power}. Your hero has been absorbed.`);
        room.done = true;
        render();
      };
      grid.appendChild(b);
    });
    root.querySelector<HTMLButtonElement>('.nt-boss')!.onclick = () => {
      if (over) return;
      if (power > boss) finish(true, 'BOSS ABSORBED!');
      else finish(false, `${power} vs ${boss}. The boss absorbed you.`);
    };
  }
  render();

  return {
    result,
    destroy() {
      over = true;
      root.remove();
    },
  };
}
