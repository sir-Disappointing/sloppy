// Gate generation for the crowd-runner ad. The math is honest: the level is
// solved by brute force so the boss is always beatable, but only just.

export type Op = '+' | '-' | 'x' | '/';
export type Fine = 'none' | 'boss' | 'fee' | 'minus' | 'round' | 'even';

export interface Gate {
  op: Op;
  value: number;
  fine: Fine;
  fineValue: number;
}

export interface Level {
  rows: [Gate, Gate][];
  start: number;
  bossBase: number;
}

export interface RunState {
  count: number;
  // The boss's HP is bossA * bossBase + bossB.
  bossA: number;
  bossB: number;
}

export function fineText(g: Gate): string {
  switch (g.fine) {
    case 'boss': return '*applies to the boss';
    case 'fee': return '*after 30% platform fee';
    case 'minus': return `*then -${g.fineValue}`;
    case 'round': return `*rounded down to nearest ${g.fineValue}`;
    case 'even': return '*only if your count is even';
    default: return '';
  }
}

export function opText(g: Gate): string {
  const sym = { '+': '+', '-': '−', x: '×', '/': '÷' }[g.op];
  return `${sym}${g.value}${g.fine === 'none' ? '' : '*'}`;
}

function applyOp(n: number, op: Op, v: number): number {
  switch (op) {
    case '+': return n + v;
    case '-': return n - v;
    case 'x': return n * v;
    case '/': return Math.floor(n / v);
  }
}

export function applyGate(s: RunState, g: Gate): RunState {
  const { count, bossA, bossB } = s;
  switch (g.fine) {
    case 'boss':
      if (g.op === 'x') return { count, bossA: bossA * g.value, bossB: bossB * g.value };
      return { count, bossA, bossB: bossB + (g.op === '+' ? g.value : -g.value) };
    case 'fee':
      return { count: Math.floor(applyOp(count, g.op, g.value) * 0.7), bossA, bossB };
    case 'minus':
      return { count: applyOp(count, g.op, g.value) - g.fineValue, bossA, bossB };
    case 'round': {
      const n = applyOp(count, g.op, g.value);
      return { count: Math.floor(n / g.fineValue) * g.fineValue, bossA, bossB };
    }
    case 'even':
      return count % 2 === 0 ? { count: applyOp(count, g.op, g.value), bossA, bossB } : s;
    default:
      return { count: applyOp(count, g.op, g.value), bossA, bossB };
  }
}

export function bossHp(s: RunState, base: number): number {
  return Math.max(1, s.bossA * base + s.bossB);
}

function rand(a: number, b: number): number {
  return a + Math.floor(Math.random() * (b - a + 1));
}

function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

function makeGate(d: number): Gate {
  const op = pick<Op>(['+', '+', 'x', '-', '/', '+', 'x']);
  const value =
    op === '+' ? rand(2, 8) * 5 :
    op === '-' ? rand(1, 6) * 5 :
    op === 'x' ? rand(2, 4) :
    rand(2, 3);
  const fineChance = [0, 0.25, 0.4, 0.55, 0.65][Math.min(d, 4)];
  let fine: Fine = 'none';
  if (Math.random() < fineChance) {
    fine = op === '/' ? pick<Fine>(['fee', 'minus', 'round', 'even']) : pick<Fine>(['boss', 'fee', 'minus', 'round', 'even']);
  }
  const fineValue = fine === 'minus' ? rand(2, 8) * 5 : fine === 'round' ? pick([10, 25, 50]) : 0;
  return { op, value, fine, fineValue };
}

// What a gate becomes after `hits` shots in Squad Shooter. "+" gates grow,
// "−" gates shrink and flip; ×, ÷ and boss gates are armoured.
export function shootGate(g: Gate, hits: number): void {
  if (g.fine === 'boss') return;
  if (g.op === '+') g.value += hits;
  else if (g.op === '-') {
    if (g.value > hits) g.value -= hits;
    else {
      g.op = '+';
      g.value = hits - g.value + 1;
    }
  }
}

// Best achievable margin over all paths, as the largest boss base still beatable.
// `boost` assumes that many hits on every gate you take (Squad Shooter).
function solve(rows: [Gate, Gate][], start: number, boost: number): number {
  let best = -Infinity;
  const paths = 1 << rows.length;
  for (let p = 0; p < paths; p++) {
    let s: RunState = { count: start, bossA: 1, bossB: 0 };
    let alive = true;
    for (let i = 0; i < rows.length; i++) {
      const g = { ...rows[i][(p >> i) & 1] };
      if (boost) shootGate(g, boost);
      s = applyGate(s, g);
      if (s.count <= 0) { alive = false; break; }
    }
    if (!alive) continue;
    // Largest base with count > bossA * base + bossB.
    const maxBase = Math.ceil((s.count - s.bossB) / s.bossA) - 1;
    best = Math.max(best, maxBase);
  }
  return best;
}

export function generateLevel(d: number, boost = 0): Level {
  const n = 6 + Math.min(d, 4);
  const start = 10;
  for (let attempt = 0; attempt < 200; attempt++) {
    const rows: [Gate, Gate][] = [];
    for (let i = 0; i < n; i++) rows.push([makeGate(d), makeGate(d)]);
    const maxBase = solve(rows, start, boost);
    if (maxBase < 20) continue;
    // Higher difficulty leaves less room for a sloppy route.
    const slack = 0.6 + 0.08 * Math.min(d, 4);
    return { rows, start, bossBase: Math.max(10, Math.floor(maxBase * slack)) };
  }
  // Practically unreachable; a dull but fair fallback.
  const g: Gate = { op: '+', value: 10, fine: 'none', fineValue: 0 };
  return { rows: [[g, g]], start, bossBase: 15 };
}
