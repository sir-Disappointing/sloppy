import { state } from '../state';
import { brainTest } from './brainTest';
import { choose } from './choose';
import { gateRunner, squadShooter } from './gateRunner';
import { holeEater } from './holeEater';
import { numberTower } from './numberTower';
import { perfectSlice } from './perfectSlice';
import { pullPin } from './pullPin';
import { screwSort } from './screwSort';
import { towerStack } from './towerStack';
import type { MinigameFactory } from './types';

export type AdKind =
  | 'gates' | 'brain' | 'pins' | 'choose' | 'squad' | 'screws' | 'hole' | 'tower' | 'slice' | 'stack';

interface AdGame {
  make: MinigameFactory;
  brand: string;
  // The patch that adds this ad partner.
  unlock: number;
  captions: string[];
}

const GAMES: Record<AdKind, AdGame> = {
  gates: {
    make: gateRunner,
    brand: 'Crowd Gate Rush 3D',
    unlock: 0,
    captions: ['Only 1% can beat this boss!', 'Pick the right gates! IQ 180+ only', 'My dad got 9,999 on this level'],
  },
  brain: {
    make: brainTest,
    brand: 'Brain Test: Tricky IQ Puzzles',
    unlock: 0,
    captions: ['99% of people get this WRONG', 'Only geniuses can answer #3', 'Teachers HATE this quiz'],
  },
  pins: {
    make: pullPin,
    brand: 'Pin Rescue Saga',
    unlock: 1,
    captions: ['99% FAIL this level!', 'Save him!! He is so sad', 'Can you pull the right pin?'],
  },
  choose: {
    make: choose,
    brand: 'Help Her Choose!',
    unlock: 1,
    captions: ['She needs YOUR help 😢', 'Choose wisely...', 'Can you save her day?'],
  },
  squad: {
    make: squadShooter,
    brand: 'Squad Shooter: Last Gate',
    unlock: 2,
    captions: ['Shoot the gates! Grow your army!', 'This is real gameplay*', 'Only 1% reach the boss'],
  },
  screws: {
    make: screwSort,
    brand: 'Screw Sort Jam 3D',
    unlock: 2,
    captions: ['So satisfying!! 😌', 'Can you sort them all?', 'Relax your brain (60 second limit)'],
  },
  hole: {
    make: holeEater,
    brand: 'Hole Eater.io',
    unlock: 3,
    captions: ['Eat EVERYTHING!', 'Real players online: 4', 'Be #1 or be eaten'],
  },
  tower: {
    make: numberTower,
    brand: 'Number Tower: Hero Wars',
    unlock: 3,
    captions: ['Absorb the weak! Avoid the strong!', 'Only 2% reach the boss', 'Can you do the math?'],
  },
  slice: {
    make: perfectSlice,
    brand: 'Perfect Slice ASMR',
    unlock: 4,
    captions: ['Oddly satisfying 😌', 'Only PERFECT cuts allowed', 'Relaxing (mandatory)'],
  },
  stack: {
    make: towerStack,
    brand: 'Stack Tower Pro',
    unlock: 4,
    captions: ['How high can YOU go?', 'Our player made it to 10!', 'Stack to the moon 🚀'],
  },
};

const FAILS = [
  'FAIL! Only 1% of players solve this.',
  'So close! (Not really.)',
  'Our ads player did the same thing.',
  'Even the guy in the ad does better than that.',
  'Have you tried being in the 1%?',
];

function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

export function availableAds(): AdKind[] {
  return (Object.keys(GAMES) as AdKind[]).filter((k) => GAMES[k].unlock <= state.patch);
}

const played = new Map<AdKind, number>();

// Prefer ads you've seen least, so new ad partners show up right away.
function nextAd(): AdKind {
  const ads = availableAds();
  const least = Math.min(...ads.map((k) => played.get(k) ?? 0));
  return pick(ads.filter((k) => (played.get(k) ?? 0) === least));
}

interface AdOptions {
  kind?: AdKind;
  // Clicked a fake X: no skipping this one.
  forced?: boolean;
  difficulty?: number;
  // Finale mode: no ad chrome, no skipping, keep retrying until you win.
  finale?: boolean;
  // v1.5: an ad that played inside another ad.
  nested?: boolean;
  title?: string;
}

// Shows an ad. Resolves true if the player beat the minigame inside it.
export function showAd(opts: AdOptions = {}): Promise<boolean> {
  const kind = opts.kind ?? nextAd();
  played.set(kind, (played.get(kind) ?? 0) + 1);
  const game = GAMES[kind];
  const difficulty = opts.difficulty ?? state.patch;
  state.inAd = true;

  const el = document.createElement('div');
  el.className = `ad-overlay${opts.finale ? ' finale' : ''}`;
  el.innerHTML = `
    <div class="ad-top">
      <span class="ad-label">${opts.finale ? opts.title ?? '' : `${opts.nested ? 'Ad inside an ad' : 'Ad'} · ${game.brand}`}</span>
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
