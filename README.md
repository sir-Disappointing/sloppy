# Idle Burger Empire 3D™

A parody of the slop flooding mobile and browser game stores. It starts as a boring idle game. Every expansion ships a "live-service patch" that stacks one more feature on top, and the ads that keep interrupting you are playable (and genuinely hard) versions of the fake ads you've seen everywhere. Keep patching and the game eventually collapses into the game the ads promised. There are no real ads, and it has an ending.

## Running it

```sh
npm install
npm run dev     # local dev server with hot reload
npm run build   # type-check and build to dist/
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`. In the repo settings, set Pages → Source to "GitHub Actions" once.

## Layout

- `src/main.ts`: the idle game shell and the timers each patch switches on
- `src/patches.ts`: the patch roadmap, with notes and expansion goals
- `src/popups.ts`: daily rewards, limited-time offers and patch downloads
- `src/ads/`: the ad frame and the minigames inside it
  - `gates.ts` / `gateRunner.ts`: crowd gate runner with fine print. A brute-force solver keeps the boss beatable, but only just.
  - `pins.ts` / `pullPin.ts`: falling-sand pull-the-pin puzzle
- `src/finale.ts`: the v2.0 collapse and the credits

In dev builds, `window.game` exposes `state`, `changed()` and `showAd()` for poking at things from the console.
