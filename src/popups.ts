import { showAd } from './ads/ad';
import { changed, earn, money, state } from './state';

// Pop-ups that the patches add. Each one blocks the game until dealt with.

let open = 0;
let dailyDay = 1;

function popup(html: string, cls: string): HTMLDivElement {
  open++;
  const back = document.createElement('div');
  back.className = 'popup-back';
  const box = document.createElement('div');
  box.className = `popup ${cls}`;
  box.innerHTML = html;
  back.appendChild(box);
  document.body.appendChild(back);
  return box;
}

function close(box: HTMLElement) {
  box.parentElement?.remove();
  open--;
}

export function popupOpen(): boolean {
  return open > 0;
}

// v1.1: "daily" rewards every 30 seconds. The X wanders off when you get close.
export function dailyReward(): void {
  const reward = Math.ceil(dailyDay / 3);
  const box = popup(
    `<h2>DAILY REWARD!</h2>
     <p class="big">Day ${dailyDay} streak</p>
     <p>Today's reward: <b>${money(reward)}</b></p>
     <button class="claim">CLAIM</button>
     <button class="x roaming" aria-label="Close">✕</button>`,
    'daily',
  );
  const x = box.querySelector<HTMLButtonElement>('.x')!;
  let dodges = 3;
  x.addEventListener('pointerenter', () => {
    if (dodges-- <= 0) return;
    x.style.top = `${10 + Math.random() * 70}%`;
    x.style.left = `${10 + Math.random() * 75}%`;
  });
  x.onclick = () => close(box);
  box.querySelector<HTMLButtonElement>('.claim')!.onclick = () => {
    dailyDay++;
    earn(reward);
    close(box);
  };
}

const OFFERS = [
  ['MEGA BURGER BUNDLE', '99% OFF', '$0.99'],
  ['STARTER PACK (for veterans)', 'BEST VALUE', '$4.99'],
  ['10,000 GEMS', 'Gems do nothing', '$19.99'],
  ['VIP PASS LEVEL 1 of 100', 'ONLY TODAY', '$9.99/week'],
];

// v1.2: limited-time offers. The big X is an ad; the real X is tiny.
export function limitedOffer(): void {
  const [name, tag, price] = OFFERS[Math.floor(Math.random() * OFFERS.length)];
  const corner = ['tl', 'tr', 'bl', 'br'][Math.floor(Math.random() * 4)];
  const box = popup(
    `<div class="tag">${tag}</div>
     <h2>${name}</h2>
     <p class="timer">Ends in <b>00:59</b></p>
     <button class="buy">${price}</button>
     <button class="x decoy" aria-label="Close">✕</button>
     <button class="x tiny ${corner}" aria-label="Actually close">x</button>
     <p class="msg"></p>`,
    'offer',
  );
  let secs = 59;
  const timerEl = box.querySelector('.timer b')!;
  const t = window.setInterval(() => {
    // Limited time, renewed forever.
    secs = secs <= 1 ? 59 : secs - 1;
    timerEl.textContent = `00:${String(secs).padStart(2, '0')}`;
  }, 1000);
  const done = () => {
    clearInterval(t);
    close(box);
  };
  box.querySelector<HTMLButtonElement>('.tiny')!.onclick = done;
  box.querySelector<HTMLButtonElement>('.decoy')!.onclick = () => {
    done();
    void showAd({ forced: true }).then((won) => {
      if (won) {
        state.tickets++;
        changed();
      }
    });
  };
  box.querySelector<HTMLButtonElement>('.buy')!.onclick = () => {
    box.querySelector('.msg')!.textContent = 'This game has no purchases. Nice try though.';
  };
}

export function patchNotes(version: string, title: string, notes: string[]): Promise<void> {
  const box = popup(
    `<h2>Downloading update…</h2>
     <div class="bar"><div class="fill"></div></div>
     <p class="pct">0%</p>`,
    'patch',
  );
  const fill = box.querySelector<HTMLDivElement>('.fill')!;
  const pct = box.querySelector<HTMLParagraphElement>('.pct')!;
  return new Promise((resolve) => {
    let p = 0;
    const t = window.setInterval(() => {
      // Races to 99%, then thinks about it.
      p = p < 99 ? Math.min(99, p + 7 + Math.random() * 10) : p + 0.04;
      if (p >= 100) {
        clearInterval(t);
        box.innerHTML = `<h2>${version}: ${title}</h2>
          <ul>${notes.map((n) => `<li>${n}</li>`).join('')}</ul>
          <button class="ok">Cool, I guess</button>`;
        box.querySelector<HTMLButtonElement>('.ok')!.onclick = () => {
          close(box);
          resolve();
        };
        return;
      }
      fill.style.width = `${Math.min(p, 99)}%`;
      pct.textContent = `${Math.floor(Math.min(p, 99))}%`;
    }, 80);
  });
}
