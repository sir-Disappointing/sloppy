import { showAd } from './ads/ad';
import { elapsed, state } from './state';

// v2.0: the game falls apart and the game from the ads takes over.
export async function runFinale(app: HTMLElement): Promise<void> {
  for (const el of app.querySelectorAll<HTMLElement>('.panel, header, #burger')) {
    el.style.setProperty('--rot', `${(Math.random() - 0.5) * 120}deg`);
    el.style.setProperty('--dx', `${(Math.random() - 0.5) * 300}px`);
    el.style.setProperty('--delay', `${Math.random() * 0.6}s`);
    el.classList.add('collapse');
  }
  await new Promise((r) => setTimeout(r, 2200));

  app.innerHTML = `
    <div class="finale-title">
      <p>Idle Burger Empire 3D has been removed.</p>
      <h1>THE GAME FROM THE AD</h1>
      <button class="start">Play the real thing</button>
    </div>`;
  await new Promise<void>((r) => (app.querySelector<HTMLButtonElement>('.start')!.onclick = () => r()));

  await showAd({ kind: 'gates', difficulty: 4, finale: true, title: 'Part 1 of 2 · Terms & Conditions apply' });
  await showAd({ kind: 'pins', difficulty: 4, finale: true, title: 'Part 2 of 2 · The hand is not on your side' });

  state.finishedAt = performance.now();
  app.innerHTML = `
    <div class="credits">
      <h1>You beat it.</h1>
      <p class="time">${elapsed()}</p>
      <dl>
        <dt>Ads beaten</dt><dd>${state.adsWon}</dd>
        <dt>Ads failed</dt><dd>${state.adsFailed}</dd>
        <dt>Burgers tapped</dt><dd>${state.totalEarned > 0 ? 'Too many' : 'None?'}</dd>
        <dt>Real ads shown</dt><dd>0</dd>
      </dl>
      <p class="small">No energy was refilled with real money during the making of this game.</p>
      <button class="again">Play again</button>
    </div>`;
  app.querySelector<HTMLButtonElement>('.again')!.onclick = () => location.reload();
}
