// Global game state. Everything the patches can poke at lives here.

export const state = {
  money: 0,
  totalEarned: 0,
  tapValue: 1,
  tapUpgrades: 0,
  workers: 0,
  tickets: 0,
  patch: 0,
  energy: 20,
  maxEnergy: 20,
  asleep: new Set<number>(),
  adsWon: 0,
  adsFailed: 0,
  startedAt: 0,
  finishedAt: 0,
  inAd: false,
};

type Listener = () => void;
const listeners: Listener[] = [];

export function onChange(fn: Listener): void {
  listeners.push(fn);
}

export function changed(): void {
  for (const fn of listeners) fn();
}

export function earn(amount: number): void {
  if (!state.startedAt) state.startedAt = performance.now();
  state.money += amount;
  state.totalEarned += amount;
  changed();
}

// Patch v1.2 "adjusts prices for inflation".
export function inflation(): number {
  return state.patch >= 2 ? 8 : 1;
}

export function tapUpgradePrice(): number {
  return Math.ceil(10 * Math.pow(1.6, state.tapUpgrades) * inflation());
}

export function workerPrice(): number {
  return Math.ceil(15 * Math.pow(1.17, state.workers) * inflation());
}

export function workerIncome(): number {
  return state.workers - state.asleep.size;
}

const SILLY = ['', 'K', 'M', ' Bajillion', ' Gazillion', ' Kajillion', ' Squintillion', ' Too Many'];

export function fmt(n: number): string {
  n = Math.floor(n);
  if (state.patch < 2 || n < 1000) return n.toLocaleString('en-US');
  let i = 0;
  let v = n;
  while (v >= 1000 && i < SILLY.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v.toFixed(2)}${SILLY[i]}`;
}

export function money(n: number): string {
  return `$${fmt(n)}`;
}

export function elapsed(): string {
  const end = state.finishedAt || performance.now();
  const s = state.startedAt ? Math.floor((end - state.startedAt) / 1000) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
