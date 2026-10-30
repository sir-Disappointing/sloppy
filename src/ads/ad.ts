import { state } from '../state';
import { gateRunner } from './gateRunner';
import { pullPin } from './pullPin';
import type { MinigameFactory } from './types';

export type AdKind = 'gates' | 'pins';

const GAMES: Record<AdKind, { make: MinigameFactory; brand: string; captions: string[] }> = {
  gates: {
    make: gateRunner,
    brand: 'Crowd Gate Rush 3D',
    captions: ['Only 1% can beat this boss!', 'Pick the right gates! IQ 180+ only', 'My dad got 9,999 on this level'],
  },
  pins: {
    make: pullPin,
    brand: 'Pin Rescue Saga',
    captions: ['99% FAIL this level!', 'Save him!! He is so sad', 'Can you pull the right pin?'],
  },
};

const FAILS = [
  'FAIL! Only 1% of players solve this.',
  'So close! (Not really.)',
  'Our ads player did the same thing.',
  'Even the guy in the ad does better than that.',
];

function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

export function availableAds(): AdKind[] {
  return state.patch >= 1 ? ['gates', 'pins'] : ['gates'];
}

interface AdOptions {
  kind?: AdKind;
  // Clicked a fake X: no skipping this one.
  forced?: boolean;
  difficulty?: number;
  // Finale mode: no ad chrome, no skipping, keep retrying until you win.
  finale?: boolean;
  title?: string;
}

// Shows an ad. Resolves true if the player beat the minigame inside it.
export function showAd(opts: AdOptions = {}): Promise<boolean> {
  const kind = opts.kind ?? pick(availableAds());
  const game = GAMES[kind];
  const difficulty = opts.difficulty ?? state.patch;
  state.inAd = true;

  const el = document.createElement('div');
  el.className = `ad-overlay${opts.finale ? ' finale' : ''}`;
  el.innerHTML = `
    <div class="ad-top">
      <span class="ad-label">${opts.finale ? opts.title ?? '' : `Ad · ${game.brand}`}</span>
      <button class="ad-skip" disabled></button>
    </div>
    <div class="ad-caption"></div>
    <div class="ad-host"></div>
    <div class="ad-bottom">
      <button class="ad-install">INSTALL NOW</button>
      <div class="ad-msg"></div>
    </div>`;
  document.body.appendChild(el);

  const skip = el.querySelector<HTMLButtonElement>('.ad-skip')!;
  const caption = el.querySelector<HTMLDivElement>('.ad-caption')!;
  const host = el.querySelector<HTMLDivElement>('.ad-host')!;
  const msg = el.querySelector<HTMLDivElement>('.ad-msg')!;
  const install = el.querySelector<HTMLButtonElement>('.ad-install')!;
  caption.textContent = opts.finale ? 'No skip button. No ads. Just the game you were promised.' : pick(game.captions);
  install.onclick = () => {
    msg.textContent = "There's nothing to install. You're already in it.";
  };
  if (opts.finale) {
    skip.hidden = true;
    install.hidden = true;
  }

  // The skip countdown. Patch v1.2 makes ads "20% more ad" by restarting it once.
  let countdown = 5;
  let restarted = state.patch < 2;
  let timer = 0;
  const tick = () => {
    if (opts.forced) {
      skip.textContent = 'You clicked the ad. No skipping.';
      return;
    }
    if (countdown <= 0) {
      skip.disabled = false;
      skip.textContent = 'Skip ad ›';
      return;
    }
    skip.textContent = `Skip in ${countdown}`;
    countdown--;
    if (countdown === 0 && !restarted) {
      restarted = true;
      countdown = 5;
    }
    timer = window.setTimeout(tick, 1000);
  };
  if (!opts.finale) tick();

  return new Promise((resolve) => {
    let current = game.make(host, difficulty);
    let finished = false;

    const finish = (won: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      current.destroy();
      el.remove();
      state.inAd = false;
      resolve(won);
    };

    skip.onclick = () => finish(false);

    const play = () => {
      current.result.then((won) => {
        if (finished) return;
        if (won) {
          state.adsWon++;
          msg.textContent = '';
          caption.textContent = opts.finale ? 'Cleared.' : 'WINNER! +1 Golden Ticket';
          setTimeout(() => finish(true), 1200);
          return;
        }
        state.adsFailed++;
        caption.textContent = pick(FAILS);
        const again = document.createElement('button');
        again.className = 'ad-retry';
        again.textContent = 'Try again';
        again.onclick = () => {
          again.remove();
          current.destroy();
          caption.textContent = opts.finale ? 'Again.' : pick(game.captions);
          current = game.make(host, difficulty);
          play();
        };
        host.appendChild(again);
      });
    };
    play();
  });
}
