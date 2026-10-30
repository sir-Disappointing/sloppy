import type { Minigame } from './types';

// Screw Sort Jam: sort the screws so each bolt holds one colour. Tap a bolt
// to pick up its top screws, tap another to drop them. Later patches pick
// colours that are "on brand", which is to say all basically red.

const CAP = 4;
const CLEAR = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00'];
const ON_BRAND = ['#e53935', '#f4511e', '#d81b60', '#ff7043', '#c62828', '#ec407a'];

export function screwSort(host: HTMLElement, d: number): Minigame {
  const colors = 4 + (d >= 4 ? 1 : 0) + (d >= 5 ? 1 : 0);
  const palette = d >= 4 ? ON_BRAND : CLEAR;
  const tubes: number[][] = [];
  for (let c = 0; c < colors; c++) tubes.push(Array(CAP).fill(c));
  tubes.push([], []);

  // Scramble with reverse moves only, so the puzzle is always solvable.
  for (let i = 0; i < 400; i++) {
    const from = Math.floor(Math.random() * tubes.length);
    const to = Math.floor(Math.random() * tubes.length);
    const t = tubes[from];
    if (from === to || !t.length || tubes[to].length >= CAP) continue;
    const top = t[t.length - 1];
    const below = t[t.length - 2];
    if (below !== undefined && below !== top) continue;
    tubes[to].push(t.pop()!);
  }

  const timeLimit = 75 - d * 4;
  let time = timeLimit;
  let selected = -1;
  let over = false;
  let resolve!: (won: boolean) => void;
  const result = new Promise<boolean>((r) => (resolve = r));

  const root = document.createElement('div');
  root.className = 'ad-dom screws';
  host.appendChild(root);

  const solved = () => tubes.every((t) => t.length === 0 || (t.length === CAP && t.every((c) => c === t[0])));

  const finish = (won: boolean) => {
    over = true;
    clearInterval(timer);
    render();
    const v = document.createElement('p');
    v.className = 'ss-verdict';
    v.textContent = won ? 'SORTED! So satisfying.' : "Time's up. The screws win.";
    root.appendChild(v);
    setTimeout(() => resolve(won), 1100);
  };

  const timer = window.setInterval(() => {
    time--;
    const el = root.querySelector('.ss-time');
    if (el) el.textContent = `⏱ ${time}s`;
    if (time <= 0) finish(false);
  }, 1000);

  function move(from: number, to: number) {
    const a = tubes[from];
    const b = tubes[to];
    const c = a[a.length - 1];
    if (b.length && b[b.length - 1] !== c) return;
    while (a.length && a[a.length - 1] === c && b.length < CAP) b.push(a.pop()!);
  }

  function render() {
    root.innerHTML = `<div class="ss-head"><span class="ss-time">⏱ ${time}s</span><span>Sort the screws!</span></div><div class="ss-tubes"></div>`;
    const wrap = root.querySelector<HTMLElement>('.ss-tubes')!;
    tubes.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = `ss-tube${i === selected ? ' sel' : ''}`;
      b.innerHTML = t.map((c) => `<span class="ss-screw" style="--c:${palette[c]}"></span>`).join('');
      b.onclick = () => {
        if (over) return;
        if (selected < 0) {
          if (t.length) selected = i;
        } else {
          if (selected !== i) move(selected, i);
          selected = -1;
        }
        render();
        if (solved()) finish(true);
      };
      wrap.appendChild(b);
    });
  }
  render();

  return {
    result,
    destroy() {
      over = true;
      clearInterval(timer);
      root.remove();
    },
  };
}
