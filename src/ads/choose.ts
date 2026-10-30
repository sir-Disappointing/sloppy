import type { Minigame } from './types';

// "Help her choose!" Five quick decisions. Too slow, and the ad's player
// chooses for you. They always choose wrong.

const SCENES: [string, string, string][] = [
  ["She's freezing 🥶", '🧥 Wear a coat', '🍦 Eat ice cream'],
  ["She's starving 😫", '🍔 Eat a burger', '🪨 Eat a rock'],
  ['Her house is on fire 🔥', '🚒 Call firefighters', '🛁 Take a bath'],
  ["She's broke 💸", '💼 Get a job', '🎰 Buy loot boxes'],
  ['A bee is chasing her 🐝', '🏃 Run inside', '🍯 Cover herself in honey'],
  ["She's exhausted 😴", '🛏️ Go to bed', '☕ Drink 9 espressos'],
  ['Her phone is at 1% 🔋', '🔌 Charge it', '📺 Watch a 30s ad'],
  ["It's pouring 🌧️", '☂️ Umbrella', '🧻 Paper hat'],
  ['Her dog looks sad 🐶', '🦴 Give it a bone', '🎻 Play a sad violin'],
  ["She's stuck in a hole 🕳️", '🪜 Use a ladder', '⛏️ Dig deeper'],
  ["She's standing in lava 🌋", '💧 Pour water', '🪙 Pour gold'],
  ['The boss has 500 HP 👹', '✖️3 gate', '➕5 gate'],
  ['Her crush texted "hey" 💌', '💬 Reply "hey"', '📜 Send a 9-page essay'],
  ['She wants to save money 🐷', '🐖 Piggy bank', '💎 Buy the 10,000 gem pack'],
];

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function choose(host: HTMLElement, d: number): Minigame {
  const root = document.createElement('div');
  root.className = 'ad-dom choose';
  host.appendChild(root);

  const rounds = shuffle(SCENES).slice(0, 5);
  const time = Math.max(1.5, 3.8 - 0.35 * d) * 1000;
  // From v1.2 the options swap sides halfway through the timer.
  const swaps = d >= 2;
  let round = 0;
  let raf = 0;
  let over = false;
  let resolve!: (won: boolean) => void;
  const result = new Promise<boolean>((r) => (resolve = r));

  const finish = (won: boolean, why: string) => {
    over = true;
    cancelAnimationFrame(raf);
    root.innerHTML = `<div class="ch-girl">${won ? '😍' : '😭'}</div><p class="ch-verdict">${why}</p>`;
    setTimeout(() => resolve(won), 1100);
  };

  const show = () => {
    if (round >= rounds.length) return finish(true, 'She is saved! Somehow.');
    const [scene, good, bad] = rounds[round];
    root.innerHTML = `<p class="ch-count">${round + 1} / ${rounds.length}</p>
      <div class="ch-girl">👧</div>
      <p class="ch-scene">${scene}</p>
      <div class="ch-bar"><div class="ch-fill"></div></div>
      <div class="ch-opts"></div>`;
    const opts = root.querySelector<HTMLElement>('.ch-opts')!;
    const fill = root.querySelector<HTMLElement>('.ch-fill')!;
    let order = shuffle([good, bad]);
    const render = () => {
      opts.innerHTML = '';
      for (const o of order) {
        const b = document.createElement('button');
        b.textContent = o;
        b.onclick = () => {
          if (over) return;
          cancelAnimationFrame(raf);
          if (o === good) {
            round++;
            show();
          } else {
            finish(false, `She chose ${o}. Why would you do that.`);
          }
        };
        opts.appendChild(b);
      }
    };
    render();
    const start = performance.now();
    let swapped = false;
    const tick = (now: number) => {
      if (over) return;
      const t = (now - start) / time;
      fill.style.width = `${Math.max(0, 1 - t) * 100}%`;
      if (swaps && !swapped && t > 0.5) {
        swapped = true;
        order = [order[1], order[0]];
        render();
      }
      if (t >= 1) return finish(false, `Too slow! The ad player chose ${bad} for you.`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };
  show();

  return {
    result,
    destroy() {
      over = true;
      cancelAnimationFrame(raf);
      root.remove();
    },
  };
}
