// Falling-sand simulation for the pull-the-pin ad. Pure logic, no DOM.

export const GW = 36;
export const GH = 54;

export const EMPTY = 0;
export const WALL = 1;
export const GOLD = 2;
export const LAVA = 3;
export const WATER = 4;
export const STONE = 5;
export const HERO = 6;
export const PIN = 10; // PIN + id

export interface PinInfo {
  id: number;
  x0: number;
  x1: number;
  y: number;
  pulled: boolean;
  // The pin the ad's "player" would pull first. Always wrong.
  bait?: boolean;
}

export interface PinLevel {
  grid: Uint8Array;
  pins: PinInfo[];
  goldTotal: number;
  collected: number;
  burnt: boolean;
  still: number;
  tick: number;
}

const idx = (x: number, y: number) => y * GW + x;

class Builder {
  grid = new Uint8Array(GW * GH);
  pins: PinInfo[] = [];
  rect(x0: number, y0: number, x1: number, y1: number, v: number) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.grid[idx(x, y)] = v;
  }
  pin(x0: number, x1: number, y: number, bait = false) {
    const id = this.pins.length;
    this.pins.push({ id, x0, x1, y, pulled: false, bait });
    this.rect(x0, y, x1, y, PIN + id);
  }
  border() {
    this.rect(0, 0, GW - 1, 0, WALL);
    this.rect(0, GH - 1, GW - 1, GH - 1, WALL);
    this.rect(0, 0, 0, GH - 1, WALL);
    this.rect(GW - 1, 0, GW - 1, GH - 1, WALL);
  }
  // A funnel that narrows down onto the hero at the bottom.
  heroRoom(top: number) {
    for (let y = top; y < GH - 8; y++) {
      const w = Math.min(14, y - top);
      this.rect(1, y, w, y, WALL);
      this.rect(GW - 1 - w, y, GW - 2, y, WALL);
    }
    this.rect(1, GH - 8, 13, GH - 2, WALL);
    this.rect(GW - 14, GH - 8, GW - 2, GH - 2, WALL);
    this.rect(15, GH - 6, 20, GH - 2, HERO);
    this.rect(14, GH - 6, 14, GH - 2, WALL);
    this.rect(21, GH - 6, 21, GH - 2, WALL);
  }
  build(): PinLevel {
    let goldTotal = 0;
    for (const v of this.grid) if (v === GOLD) goldTotal++;
    return { grid: this.grid, pins: this.pins, goldTotal, collected: 0, burnt: false, still: 0, tick: 0 };
  }
}

// Level 1: water must neutralise the lava basin before anything else moves.
function level1(): PinLevel {
  const b = new Builder();
  b.border();
  b.rect(17, 1, 18, 15, WALL);
  b.rect(1, 3, 16, 14, WATER);
  b.rect(19, 6, 34, 14, GOLD);
  b.pin(1, 16, 15);
  b.pin(19, 34, 15, true);
  b.rect(1, 28, 34, 30, LAVA);
  b.pin(1, 34, 31, true);
  b.heroRoom(32);
  return b.build();
}

// Level 2: same idea, plus a lava pocket above the hero behind a bait pin.
function level2(): PinLevel {
  const b = new Builder();
  b.border();
  b.rect(12, 1, 12, 13, WALL);
  b.rect(23, 1, 23, 13, WALL);
  b.rect(1, 4, 11, 12, WATER);
  b.rect(13, 6, 22, 12, LAVA);
  b.rect(24, 5, 34, 12, GOLD);
  b.pin(1, 11, 13);
  b.pin(13, 22, 13);
  b.pin(24, 34, 13, true);
  // Basin with a floor pin, and a side pocket of lava over the funnel.
  b.rect(1, 22, 34, 22, WALL);
  b.rect(16, 22, 34, 22, EMPTY);
  b.pin(16, 34, 22, true);
  b.rect(1, 23, 15, 23, WALL);
  b.rect(1, 18, 15, 21, WALL);
  b.rect(2, 24, 8, 30, LAVA);
  b.rect(9, 24, 9, 31, WALL);
  b.rect(1, 31, 9, 31, WALL);
  b.pin(2, 8, 31, true);
  b.heroRoom(32);
  return b.build();
}

export const LEVELS = [level1, level2];

function mirror(l: PinLevel): PinLevel {
  const g = new Uint8Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) g[idx(GW - 1 - x, y)] = l.grid[idx(x, y)];
  l.grid = g;
  for (const p of l.pins) [p.x0, p.x1] = [GW - 1 - p.x1, GW - 1 - p.x0];
  return l;
}

export function makeLevel(n: number, flip = Math.random() < 0.5): PinLevel {
  const l = LEVELS[Math.min(n, LEVELS.length - 1)]();
  return flip ? mirror(l) : l;
}

export function pull(l: PinLevel, id: number): void {
  const p = l.pins[id];
  if (!p || p.pulled) return;
  p.pulled = true;
  for (let x = p.x0; x <= p.x1; x++) if (l.grid[idx(x, p.y)] === PIN + id) l.grid[idx(x, p.y)] = EMPTY;
  l.still = 0;
}

const isLiquid = (v: number) => v === WATER || v === LAVA;

export function step(l: PinLevel): void {
  const g = l.grid;
  const moved = new Uint8Array(GW * GH);
  let moves = 0;
  l.tick++;
  const ltr = l.tick % 2 === 0;

  // Sideways sloshing doesn't count as movement, or water would never settle.
  const tryMove = (from: number, to: number, swapWith: (v: number) => boolean, counts = true) => {
    const t = g[to];
    if (t === EMPTY || swapWith(t)) {
      g[to] = g[from];
      g[from] = t;
      moved[to] = 1;
      if (counts) moves++;
      return true;
    }
    return false;
  };

  for (let y = GH - 2; y >= 1; y--) {
    for (let k = 1; k < GW - 1; k++) {
      const x = ltr ? k : GW - 1 - k;
      const i = idx(x, y);
      const v = g[i];
      if (moved[i] || v === EMPTY || v === WALL || v === HERO || v >= PIN) continue;
      const dir = Math.random() < 0.5 ? -1 : 1;
      if (v === GOLD || v === STONE) {
        const sinks = v === GOLD ? (t: number) => t === WATER : isLiquid;
        if (tryMove(i, idx(x, y + 1), sinks)) continue;
        if (tryMove(i, idx(x + dir, y + 1), sinks)) continue;
        tryMove(i, idx(x - dir, y + 1), sinks);
      } else if (isLiquid(v)) {
        if (v === LAVA && l.tick % 2 === 1) continue;
        const no = () => false;
        if (tryMove(i, idx(x, y + 1), no)) continue;
        if (tryMove(i, idx(x + dir, y + 1), no)) continue;
        if (tryMove(i, idx(x - dir, y + 1), no)) continue;
        if (tryMove(i, idx(x + dir, y), no, false)) continue;
        tryMove(i, idx(x - dir, y), no, false);
      }
    }
  }

  // Reactions.
  for (let y = 1; y < GH - 1; y++) {
    for (let x = 1; x < GW - 1; x++) {
      const i = idx(x, y);
      const v = g[i];
      if (v !== LAVA && v !== GOLD && v !== WATER) continue;
      for (const j of [i - 1, i + 1, i - GW, i + GW]) {
        const n = g[j];
        // Water and lava cancel out in a puff of steam.
        if (v === LAVA && n === WATER) {
          g[i] = EMPTY;
          g[j] = EMPTY;
          moves++;
          break;
        }
        if (v === LAVA && n === GOLD) {
          g[j] = STONE;
          moves++;
        }
        if (v === LAVA && n === HERO) l.burnt = true;
        // The hero is thirsty.
        if (v === WATER && n === HERO) {
          g[i] = EMPTY;
          moves++;
          break;
        }
        if (v === GOLD && n === HERO) {
          g[i] = EMPTY;
          l.collected++;
          moves++;
          break;
        }
      }
    }
  }

  l.still = moves === 0 ? l.still + 1 : 0;
}

export function goldLeft(l: PinLevel): number {
  let n = 0;
  for (const v of l.grid) if (v === GOLD) n++;
  return n;
}

export const TARGET = 0.5;

// 'win' | 'lose' | null while still undecided.
export function verdict(l: PinLevel): 'win' | 'lose' | null {
  if (l.burnt) return 'lose';
  if (l.collected >= l.goldTotal * TARGET) return 'win';
  if (l.collected + goldLeft(l) < l.goldTotal * TARGET) return 'lose';
  if (l.still > 40 && l.pins.every((p) => p.pulled)) return 'lose';
  return null;
}
