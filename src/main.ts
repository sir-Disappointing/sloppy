import './style.css';
import { showAd } from './ads/ad';
import { runFinale } from './finale';
import { FINAL_PATCH, PATCHES } from './patches';
import { dailyReward, limitedOffer, patchNotes, popupOpen } from './popups';
import {
  changed, earn, elapsed, fmt, money, onChange, state, tapUpgradePrice, workerIncome, workerPrice,
} from './state';

const app = document.getElementById('app')!;

app.innerHTML = `
  <header>
    <div class="title">Idle Burger Empire 3D<sup>™</sup> <span class="version"></span></div>
    <div class="stats">
      <span class="money"></span>
      <span class="tickets" title="Golden Tickets. Earned by beating ads."></span>
      <span class="energy" hidden></span>
    </div>
  </header>
  <button id="burger" aria-label="Tap the burger">🍔</button>
  <div class="tap-hint">Tap the burger</div>
  <section class="panel workers-panel"><h3>Staff <small class="income"></small></h3><div class="workers"></div></section>
  <section class="panel shop">
    <button class="buy-tap"></button>
    <button class="buy-worker"></button>
    <button class="watch-ad">Watch ad for 2×*<small>*2× nothing. Beat it for a Golden Ticket.</small></button>
  </section>
  <section class="panel goal">
    <div class="goal-label"></div>
    <button class="expand">Expand</button>
  </section>
  <section class="panel issues"><h3>Patch notes</h3><ul></ul></section>
  <footer><span class="clock">0:00</span></footer>`;

const $ = <T extends HTMLElement>(sel: string) => app.querySelector<T>(sel)!;

// Each expansion doubles income. Numbers must go up.
const expansionBonus = () => Math.pow(2, state.patch);

function adReward(won: boolean) {
  if (!won) return;
  state.tickets++;
  state.energy = state.maxEnergy;
  earn(Math.max(25, workerIncome() * expansionBonus() * 20));
}

let floaters = 0;
$('#burger').addEventListener('click', (e) => {
  if (state.patch >= 1) {
    if (state.energy <= 0) {
      $('.tap-hint').textContent = 'Out of Energy! Wait, or beat an ad.';
      return;
    }
    state.energy--;
  }
  earn(state.tapValue);
  $('.tap-hint').textContent = state.patch >= 1 ? 'Every tap costs Energy now' : 'Tap the burger';
  if (floaters < 12) {
    floaters++;
    const f = document.createElement('div');
    f.className = 'floater';
    f.textContent = `+${money(state.tapValue)}`;
    f.style.left = `${e.clientX}px`;
    f.style.top = `${e.clientY}px`;
    document.body.appendChild(f);
    setTimeout(() => {
      f.remove();
      floaters--;
    }, 700);
  }
});

$('.buy-tap').onclick = () => {
  const p = tapUpgradePrice();
  if (state.money < p) return;
  state.money -= p;
  state.tapUpgrades++;
  state.tapValue++;
  changed();
};

$('.buy-worker').onclick = () => {
  const p = workerPrice();
  if (state.money < p) return;
  state.money -= p;
  state.workers++;
  changed();
};

$('.watch-ad').onclick = async () => {
  adReward(await showAd());
  changed();
};

$('.expand').onclick = async () => {
  const goal = PATCHES[state.patch].goal;
  if (state.money < goal.money || state.tickets < goal.tickets) return;
  state.money -= goal.money;
  state.tickets -= goal.tickets;
  state.patch++;
  const p = PATCHES[state.patch];
  await patchNotes(p.version, p.title, p.notes);
  changed();
  if (state.patch === FINAL_PATCH) void runFinale(app);
};

$('.workers').addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-worker]');
  if (!btn) return;
  state.asleep.delete(Number(btn.dataset.worker));
  changed();
});

function render() {
  // The finale replaces the whole page.
  if (state.patch >= FINAL_PATCH) return;
  const goal = PATCHES[state.patch].goal;
  $('.version').textContent = PATCHES[state.patch].version;
  $('.money').textContent = money(state.money);
  $('.tickets').textContent = `🎟 ${state.tickets}`;
  const energy = $('.energy');
  energy.hidden = state.patch < 1;
  energy.textContent = `⚡ ${state.energy}/${state.maxEnergy}`;
  $('.income').textContent = `${money(workerIncome() * expansionBonus())}/s`;

  const tap = $<HTMLButtonElement>('.buy-tap');
  tap.innerHTML = `Bigger Spatula <small>+$1 per tap · ${money(tapUpgradePrice())}</small>`;
  tap.disabled = state.money < tapUpgradePrice();
  const hire = $<HTMLButtonElement>('.buy-worker');
  hire.innerHTML = `Hire a Teen <small>+$1/s · ${money(workerPrice())}</small>`;
  hire.disabled = state.money < workerPrice();

  $('.goal-label').innerHTML = goal.label
    ? `<b>${goal.label}</b><br>${money(goal.money)} + ${fmt(goal.tickets)} Golden Ticket${goal.tickets > 1 ? 's' : ''}<br><small>Golden Tickets come from beating ads 🙂</small>`
    : '';
  $<HTMLButtonElement>('.expand').disabled = state.money < goal.money || state.tickets < goal.tickets;

  const workers = $('.workers');
  if (workers.childElementCount !== state.workers || workers.dataset.asleep !== String(state.asleep.size)) {
    workers.innerHTML = Array.from({ length: state.workers }, (_, i) =>
      state.asleep.has(i)
        ? `<button class="worker asleep" data-worker="${i}" title="Asleep. Tap to motivate.">😴</button>`
        : `<span class="worker">🧑‍🍳</span>`,
    ).join('') || '<small>Nobody works here yet.</small>';
    workers.dataset.asleep = String(state.asleep.size);
  }

  const issues = PATCHES.slice(0, state.patch + 1)
    .reverse()
    .flatMap((p) => p.notes.map((n) => `<li><span class="v">${p.version}</span> ${n}</li>`));
  $('.issues ul').innerHTML = issues.join('');
}

onChange(render);
render();

// Game loop timers. Everything pauses during ads and pop-ups, except time.
setInterval(() => {
  if (state.patch >= FINAL_PATCH) return;
  if (state.workers > 0 && !state.inAd) earn((workerIncome() * expansionBonus()) / 10);
  $('.clock').textContent = elapsed();
}, 100);

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
every(30000, () => state.patch >= 1 && dailyReward());

// v1.1 Sponsored interruptions.
every(80000, async () => {
  if (state.patch < 1) return;
  adReward(await showAd());
  changed();
});

// v1.2 Limited-time offers.
every(22000, () => state.patch >= 2 && limitedOffer());

// v1.3 Workers need motivation.
every(3000, () => {
  if (state.patch < 3 || state.workers === 0 || Math.random() < 0.4) return;
  const i = Math.floor(Math.random() * state.workers);
  state.asleep.add(i);
  changed();
});

// Dev-only handle for poking at the economy from the console.
if (import.meta.env.DEV) Object.assign(window, { game: { state, changed, showAd } });
