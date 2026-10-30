import { PATCHES } from '../patches';
import { state } from '../state';
import { applyGate, opText, fineText, type Gate } from './gates';
import type { Minigame } from './types';

// "Only 1% can solve this!" trick questions. Three in a row, on a timer.

type Done = (ok: boolean) => void;

interface Question {
  minPatch: number;
  build(el: HTMLElement, done: Done): void | (() => void);
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function choices(el: HTMLElement, prompt: string, options: string[], correct: string, done: Done) {
  el.innerHTML = `<p class="bt-q">${prompt}</p><div class="bt-opts"></div>`;
  const opts = el.querySelector('.bt-opts')!;
  for (const o of shuffle(options)) {
    const b = document.createElement('button');
    b.textContent = o;
    b.onclick = () => done(o === correct);
    opts.appendChild(b);
  }
}

const QUESTIONS: Question[] = [
  {
    minPatch: 0,
    build: (el, done) =>
      choices(el, 'Which is heavier?', ['1 kg of feathers', '1 kg of steel', 'They weigh the same'], 'They weigh the same', done),
  },
  {
    minPatch: 0,
    build(el, done) {
      el.innerHTML = `<p class="bt-q">Tap the smallest <span class="bt-tiny">🍔</span> burger.</p>
        <div class="bt-burgers"><button style="font-size:64px">🍔</button><button style="font-size:44px">🍔</button><button style="font-size:30px">🍔</button></div>`;
      el.querySelector<HTMLElement>('.bt-tiny')!.onclick = () => done(true);
      el.querySelectorAll<HTMLButtonElement>('.bt-burgers button').forEach((b) => (b.onclick = () => done(false)));
    },
  },
  {
    minPatch: 0,
    build: (el, done) =>
      choices(el, 'How many real ads has this game shown you?', ['0', '3', '99+', 'Too many'], '0', done),
  },
  {
    minPatch: 0,
    build(el, done) {
      el.innerHTML = `<p class="bt-q">Close this question.</p><div class="bt-xfield"></div>`;
      const field = el.querySelector<HTMLElement>('.bt-xfield')!;
      for (let i = 0; i < 5; i++) {
        const x = document.createElement('button');
        x.className = 'bt-bigx';
        x.textContent = '✕';
        x.style.left = `${8 + Math.random() * 70}%`;
        x.style.top = `${8 + Math.random() * 65}%`;
        x.onclick = () => done(false);
        field.appendChild(x);
      }
      const real = document.createElement('button');
      real.className = 'bt-realx';
      real.textContent = 'x';
      real.style.left = `${Math.random() * 90}%`;
      real.style.top = `${Math.random() * 88}%`;
      real.onclick = () => done(true);
      field.appendChild(real);
    },
  },
  {
    minPatch: 0,
    build(el, done) {
      const text = 'Tap the 5th letter of this sentence.';
      el.innerHTML = `<p class="bt-q bt-letters"></p>`;
      const p = el.querySelector('.bt-letters')!;
      let letter = 0;
      for (const ch of text) {
        const s = document.createElement('span');
        s.textContent = ch;
        if (/[a-z]/i.test(ch)) {
          const n = letter++;
          s.className = 'bt-letter';
          s.onclick = () => done(n === 4);
        }
        p.appendChild(s);
      }
    },
  },
  {
    minPatch: 0,
    build(el, done) {
      el.innerHTML = `<p class="bt-q">Tap the biggest number.</p>
        <div class="bt-opts"><button>7</button><button>420</button><button>1,000</button></div>
        <span class="bt-inf">∞</span>`;
      el.querySelectorAll<HTMLButtonElement>('.bt-opts button').forEach((b) => (b.onclick = () => done(false)));
      el.querySelector<HTMLElement>('.bt-inf')!.onclick = () => done(true);
    },
  },
  {
    minPatch: 0,
    build(el, done) {
      el.innerHTML = `<p class="bt-q">Don't tap anything for 3 seconds.</p><button class="bt-tapme">TAP!</button>`;
      el.querySelector<HTMLButtonElement>('.bt-tapme')!.onclick = () => done(false);
      const t = setTimeout(() => done(true), 3000);
      return () => clearTimeout(t);
    },
  },
  {
    minPatch: 1,
    build(el, done) {
      const current = PATCHES[state.patch].version;
      const others = shuffle(PATCHES.map((p) => p.version).filter((v) => v !== current)).slice(0, 3);
      choices(el, 'Which version of the game are you playing?', [current, ...others], current, done);
    },
  },
  {
    minPatch: 1,
    build(el, done) {
      const n = 1 + Math.floor(Math.random() * state.patch);
      const p = PATCHES[n];
      const right = p.notes[Math.floor(Math.random() * p.notes.length)];
      const wrong = shuffle(
        PATCHES.filter((_, i) => i !== n && i < PATCHES.length - 1).flatMap((q) => q.notes),
      ).slice(0, 2);
      wrong.push('Removed all ads.');
      choices(el, `Patch notes quiz! What did ${p.version} add?`, [right, ...wrong.slice(0, 3)], right, done);
    },
  },
  {
    minPatch: 1,
    build(el, done) {
      const count = 10 + Math.floor(Math.random() * 30);
      let a: Gate, b: Gate, ra: number, rb: number;
      do {
        a = { op: 'x', value: 2 + Math.floor(Math.random() * 2), fine: 'minus', fineValue: 10 + 5 * Math.floor(Math.random() * 6) };
        b = { op: '+', value: 5 + 5 * Math.floor(Math.random() * 5), fine: 'none', fineValue: 0 };
        ra = applyGate({ count, bossA: 1, bossB: 0 }, a).count;
        rb = applyGate({ count, bossA: 1, bossB: 0 }, b).count;
      } while (ra === rb);
      const la = `${opText(a)} (${fineText(a)})`;
      const lb = opText(b);
      choices(el, `Your crowd is ${count}. Which gate leaves you with more?`, [la, lb], ra > rb ? la : lb, done);
    },
  },
];

const FINALE: Question = {
  minPatch: 0,
  build: (el, done) =>
    choices(el, 'Final question. What did this game never show you?', ['A real ad', 'A burger', 'Patch notes', 'Fine print'], 'A real ad', done),
};

export function brainTest(host: HTMLElement, d: number): Minigame {
  const root = document.createElement('div');
  root.className = 'ad-dom brain';
  root.innerHTML = `<div class="bt-head"><span class="bt-num"></span><span class="bt-brand">🧠 BRAIN TEST</span></div>
    <div class="bt-bar"><div class="bt-fill"></div></div><div class="bt-body"></div>`;
  host.appendChild(root);
  const body = root.querySelector<HTMLElement>('.bt-body')!;
  const fill = root.querySelector<HTMLElement>('.bt-fill')!;
  const num = root.querySelector<HTMLElement>('.bt-num')!;

  const finale = d >= 6;
  const pool = shuffle(QUESTIONS.filter((q) => q.minPatch <= Math.min(d, state.patch)));
  const qs = finale ? [...pool.slice(0, 2), FINALE] : pool.slice(0, 3);
  const limit = Math.max(6, 12 - d) * 1000;
  let i = 0;
  let timer = 0;
  let cleanup: void | (() => void);
  let resolve!: (won: boolean) => void;
  const result = new Promise<boolean>((r) => (resolve = r));
  let over = false;

  const finish = (won: boolean) => {
    if (over) return;
    over = true;
    clearInterval(timer);
    if (cleanup) cleanup();
    body.innerHTML = `<p class="bt-verdict">${won ? 'GENIUS! 🧠' : 'WRONG!'}</p>`;
    setTimeout(() => resolve(won), 800);
  };

  const next = () => {
    if (i >= qs.length) return finish(true);
    if (cleanup) cleanup();
    num.textContent = `Question ${i + 1}/${qs.length}`;
    const started = performance.now();
    let answered = false;
    cleanup = qs[i].build(body, (ok) => {
      if (answered || over) return;
      answered = true;
      if (!ok) return finish(false);
      i++;
      next();
    });
    clearInterval(timer);
    timer = window.setInterval(() => {
      const left = 1 - (performance.now() - started) / limit;
      fill.style.width = `${Math.max(0, left) * 100}%`;
      if (left <= 0) finish(false);
    }, 50);
  };
  next();

  return {
    result,
    destroy() {
      over = true;
      clearInterval(timer);
      if (cleanup) cleanup();
      root.remove();
    },
  };
}
