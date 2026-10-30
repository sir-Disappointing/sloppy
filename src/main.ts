import './style.css';
import { showAd } from './ads/ad';
import { runFinale } from './finale';
import { FINAL_PATCH, PATCHES } from './patches';
import { dailyReward, limitedOffer, patchNotes, popupOpen } from './popups';
import { sfx, toggleMute } from './sfx';
import {
  changed, earn, elapsed, fmt, load, money, onChange, save, state, tapUpgradePrice, wipeSave, workerIncome, workerPrice,
} from './state';

const app = document.getElementById('app')!;

// UI text, by the patch it changes in. The AI Update "improves" most of it.
const TEXT: Record<string, [number, string][]> = {
  title: [
    [0, 'Idle Burger Empire 3D'],
    [2, 'Idle Burger Empire 3D: Tycoon Merge Simulator'],
    [3, 'Idle Burger Empire 3D: Embark on a Delicious Journey'],
    [5, 'IBE3D Season 1: Burger Pass Edition (Remastered)'],
  ],
  hint: [
    [0, 'Tap the burger'],
    [1, 'Every tap costs Energy now'],
    [3, 'Tap the burger to elevate your culinary journey ✨'],
    [5, 'Tap the burger (premium tapping coming soon)'],
  ],
  spatula: [[0, 'Bigger Spatula'], [3, 'Unleash Spatula Synergy']],
  hire: [[0, 'Hire a Teen'], [3, 'Hire a Teen (Teen)']],
  watch: [[0, 'Watch ad for 2×*'], [3, 'Delve into an Ad for 2×*']],
  watchSub: [
    [0, '*2× nothing. Beat it for a Golden Ticket.'],
    [3, '*As an AI, I cannot double anything. Here is a Golden Ticket.'],
  ],
  staff: [[0, 'Staff'], [3, 'Human Resources (Humans)']],
  expand: [[0, 'Expand'], [3, 'Expandify'], [5, 'Expand (sponsored)']],
  tickets: [
    [0, 'Golden Tickets come from beating ads 🙂'],
    [3, 'Golden Tickets are a testament to your rich tapestry of ad-beating.'],
  ],
  notes: [[0, 'Patch notes'], [3, 'Patch notes (summarised by AI)']],
  empty: [[0, 'Nobody works here yet.'], [3, 'The kitchen is a vibrant tapestry of nobody.']],
};

function t(key: string): string {
  let out = '';
  for (const [p, s] of TEXT[key]) if (state.patch >= p) out = s;
  return out;
}

app.innerHTML = `
  <header>
    <div class="title"><span class="title-text"></span><sup>™</sup> <span class="version"></span></div>
    <div class="stats">
      <span class="stat money"></span>
      <span class="stat tickets" title="Golden Tickets. Earned by beating ads."></span>
      <span class="stat energy" hidden></span>
      <button class="stat mute" aria-label="Toggle sound">🔊</button>
    </div>
    <div class="battle-pass" hidden><span>Season 1 Battle Pass · Tier 1/100</span><div class="bp-bar"><div class="bp-fill"></div></div><small class="bp-pct"></small></div>
  </header>
  <div class="stage">
    <div class="sunburst"></div>
    <button id="burger" aria-label="Tap the burger"><span class="burger-emoji">🍔</span></button>
  </div>
  <div class="tap-hint"></div>
  <section class="panel workers-panel"><h3><span class="staff-title"></span> <small class="income"></small></h3><div class="workers"></div></section>
  <section class="panel shop">
    <button class="buy-tap" data-badge="3"></button>
    <button class="buy-worker" data-badge="12"></button>
    <button class="watch-ad" data-badge="!"></button>
    <div class="syncing" hidden>Syncing with server…</div>
  </section>
  <section class="panel goal">
    <div class="goal-label"></div>
    <button class="expand" data-badge="1"></button>
  </section>
  <section class="panel issues"><h3 class="notes-title"></h3><ul></ul></section>
  <footer><span class="clock">0:00</span> · <button class="reset">Reset progress</button></footer>
  <div class="rate-banner" hidden>⭐⭐⭐⭐⭐ Enjoying the game? <button class="rate">Rate us 5 stars!</button></div>
  <div class="dark-mode" aria-hidden="true"></div>`;

const $ = <T extends HTMLElement>(sel: string) => app.querySelector<T>(sel)!;

// Each expansion doubles income. Numbers must go up.
const expansionBonus = () => Math.pow(2, state.patch);

function adReward(won: boolean) {
  if (!won) return;
  sfx.win();
  state.tickets++;
  state.energy = state.maxEnergy;
  earn(Math.max(25, workerIncome() * expansionBonus() * 20));
}

// v1.5: winning an ad may lead straight into another ad.
async function watchAd(): Promise<void> {
  let won = await showAd();
  adReward(won);
  while (won && state.patch >= 5 && Math.random() < 0.4) {
    won = await showAd({ nested: true });
    adReward(won);
  }
  changed();
}

function floater(x: number, y: number, text: string, cls = '') {
  const f = document.createElement('div');
  f.className = `floater ${cls}`;
  f.textContent = text;
  f.style.left = `${x}px`;
  f.style.top = `${y}px`;
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 800);
}

let floaters = 0;
$('#burger').addEventListener('click', (e) => {
  const burger = $('#burger');
  if (state.patch >= 1) {
    if (state.energy <= 0) {
      sfx.denied();
      $('.tap-hint').textContent = 'Out of Energy! Wait, or beat an ad.';
      return;
    }
    state.energy--;
  }
  sfx.tap();
  burger.classList.remove('squish');
  void burger.offsetWidth;
  burger.classList.add('squish');
  if (state.patch >= 4) state.battlePass += 0.003;
  // v1.3: some taps are hallucinated.
  const fake = state.patch >= 3 && Math.random() < 0.15;
  if (!fake) earn(state.tapValue);
  else changed();
  $('.tap-hint').textContent = t('hint');
  if (floaters < 14) {
    floaters++;
    floater(e.clientX, e.clientY, fake ? `+${money(state.tapValue * 7)}?` : `+${money(state.tapValue)}`, fake ? 'fake' : '');
    setTimeout(() => floaters--, 800);
  }
});

// v1.4 "server sync" after every purchase, v1.5 shuffled shop.
function afterPurchase() {
  sfx.buy();
  if (state.patch >= 4) {
    const sync = $('.syncing');
    sync.hidden = false;
    setTimeout(() => (sync.hidden = true), 900);
  }
  if (state.patch >= 5) {
    for (const b of app.querySelectorAll<HTMLElement>('.shop button')) b.style.order = String(Math.floor(Math.random() * 3));
  }
  changed();
}

$('.buy-tap').onclick = () => {
  const p = tapUpgradePrice();
  if (state.money < p) return sfx.denied();
  state.money -= p;
  state.tapUpgrades++;
  state.tapValue++;
  afterPurchase();
};

$('.buy-worker').onclick = () => {
  const p = workerPrice();
  if (state.money < p) return sfx.denied();
  state.money -= p;
  state.workers++;
  afterPurchase();
};

$('.watch-ad').onclick = () => void watchAd();

$('.expand').onclick = async () => {
  const goal = PATCHES[state.patch].goal;
  if (state.money < goal.money || state.tickets < goal.tickets) return sfx.denied();
  state.money -= goal.money;
  state.tickets -= goal.tickets;
  state.patch++;
  const p = PATCHES[state.patch];
  await patchNotes(p.version, p.title, p.notes);
  if (state.patch === FINAL_PATCH) {
    wipeSave();
    void runFinale(app);
    return;
  }
  applyDecay();
  save(FINAL_PATCH);
  changed();
};

$('.workers').addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-worker]');
  if (!btn) return;
  state.asleep.delete(Number(btn.dataset.worker));
  sfx.tap();
  changed();
});

$('.mute').onclick = () => ($('.mute').textContent = toggleMute() ? '🔇' : '🔊');
$('.rate').onclick = () => ($('.rate-banner').innerHTML = 'Thanks for your 5 star rating! (We gave it on your behalf.)');
$('.reset').onclick = () => {
  wipeSave();
  location.reload();
};

// The UI rots a little more with every patch. See the patch-N classes in style.css.
function applyDecay() {
  for (let i = 0; i <= FINAL_PATCH; i++) document.body.classList.toggle(`patch-${i}`, state.patch >= i);
  $('.rate-banner').hidden = state.patch < 1;
  $('.battle-pass').hidden = state.patch < 4;
  $('.tap-hint').textContent = t('hint');
  // v1.3 "AI-optimised layout": everything is a little bit off.
  for (const el of app.querySelectorAll<HTMLElement>('.panel, .stat, .shop button')) {
    el.style.rotate = state.patch >= 3 ? `${(Math.random() - 0.5) * 3}deg` : '';
  }
}

function render() {
  // The finale replaces the whole page.
  if (state.patch >= FINAL_PATCH) return;
  const goal = PATCHES[state.patch].goal;
  $('.title-text').textContent = t('title');
  $('.version').textContent = PATCHES[state.patch].version;
  $('.money').textContent = money(state.money);
  $('.tickets').textContent = `🎟 ${state.tickets}`;
  const energy = $('.energy');
  energy.hidden = state.patch < 1;
  energy.textContent = `⚡ ${state.energy}/${state.maxEnergy}`;
  $('.staff-title').textContent = t('staff');
  $('.income').textContent = `${money(workerIncome() * expansionBonus())}/s`;
  $('.notes-title').textContent = t('notes');
  $('.bp-fill').style.width = `${Math.min(100, state.battlePass)}%`;
  $('.bp-pct').textContent = `${state.battlePass.toFixed(3)}% to Tier 2`;

  const tap = $<HTMLButtonElement>('.buy-tap');
  tap.innerHTML = `${t('spatula')} <small>+$1 per tap · ${money(tapUpgradePrice())}</small>`;
  tap.classList.toggle('poor', state.money < tapUpgradePrice());
  const hire = $<HTMLButtonElement>('.buy-worker');
  hire.innerHTML = `${t('hire')} <small>+$1/s · ${money(workerPrice())}</small>`;
  hire.classList.toggle('poor', state.money < workerPrice());
  $('.watch-ad').innerHTML = `${t('watch')}<small>${t('watchSub')}</small>`;

  const ready = state.money >= goal.money && state.tickets >= goal.tickets;
  $('.goal-label').innerHTML = goal.label
    ? `<b>${goal.label}</b>
       <div class="goal-req"><span class="${state.money >= goal.money ? 'ok' : ''}">${money(goal.money)}</span> + <span class="${state.tickets >= goal.tickets ? 'ok' : ''}">${fmt(goal.tickets)} 🎟</span></div>
       <small>${t('tickets')}</small>`
    : '';
  const expand = $<HTMLButtonElement>('.expand');
  expand.textContent = t('expand');
  expand.classList.toggle('poor', !ready);
  expand.classList.toggle('ready', ready);

  const workers = $('.workers');
  const key = `${state.workers}/${[...state.asleep].join(',')}/${state.patch}`;
  if (workers.dataset.key !== key) {
    workers.innerHTML =
      Array.from({ length: state.workers }, (_, i) =>
        state.asleep.has(i)
          ? `<button class="worker asleep" data-worker="${i}" title="Asleep. Tap to motivate.">😴</button>`
          : `<span class="worker">🧑‍🍳</span>`,
      ).join('') || `<small>${t('empty')}</small>`;
    workers.dataset.key = key;
  }

  const notes = PATCHES.slice(0, state.patch + 1)
    .reverse()
    .flatMap((p) => p.notes.map((n) => `<li><span class="v">${p.version}</span> ${n}</li>`));
  $('.issues ul').innerHTML = notes.join('');
}

load();
applyDecay();
onChange(render);
render();

// Game loop timers. Everything pauses during ads and pop-ups, except time.
setInterval(() => {
  if (state.patch >= FINAL_PATCH) return;
  if (state.workers > 0 && !state.inAd) earn((workerIncome() * expansionBonus()) / 10);
  $('.clock').textContent = elapsed();
}, 100);

setInterval(() => save(FINAL_PATCH), 5000);
document.addEventListener('visibilitychange', () => save(FINAL_PATCH));

const every = (ms: number, fn: () => void) =>
  setInterval(() => {
    if (!state.inAd && !popupOpen() && state.patch < FINAL_PATCH) fn();
  }, ms);

// v1.1 Energy.
setInterval(() => {
  if (state.patch >= 1 && state.energy < state.maxEnergy) {
    state.energy++;
    changed();
  }
}, 1500);

// v1.1 Daily rewards, every 30 seconds.
every(30000, () => {
  if (state.patch < 1) return;
  sfx.popup();
  dailyReward();
});

// v1.1 Sponsored interruptions.
every(80000, () => {
  if (state.patch >= 1) void watchAd();
});

// v1.2 Limited-time offers.
every(22000, () => {
  if (state.patch < 2) return;
  sfx.popup();
  limitedOffer();
});

// v1.2 Notification badges keep counting up.
every(4000, () => {
  if (state.patch < 2) return;
  for (const b of app.querySelectorAll<HTMLElement>('[data-badge]')) {
    const n = Number(b.dataset.badge);
    b.dataset.badge = Number.isNaN(n) ? '!' : String(n + Math.floor(Math.random() * 3));
  }
});

// v1.4 Workers need motivation.
every(3000, () => {
  if (state.patch < 4 || state.workers === 0 || Math.random() < 0.4) return;
  state.asleep.add(Math.floor(Math.random() * state.workers));
  changed();
});

// Dev-only handle for poking at the economy from the console.
if (import.meta.env.DEV) Object.assign(window, { game: { state, changed, showAd, applyDecay } });
