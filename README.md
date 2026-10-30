# Idle Burger Empire 3D™

A parody of the slop flooding mobile and browser game stores. It starts as a boring idle game. Every expansion ships a "live-service patch" that stacks one more feature on top, and the ads that keep interrupting you are playable (and genuinely hard) versions of the fake ads you've seen everywhere. Keep patching and the game eventually collapses into the game the ads promised. There are no real ads, and it has an ending.

## Running it

```sh
npm install
npm run dev     # local dev server with hot reload
npm run build   # type-check and build to dist/
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`. In the repo settings, set Pages → Source to "GitHub Actions" once.

## Patches

| Patch | What it adds | New ads |
| --- | --- | --- |
| v1.0 Launch | A clean, polished idle game | Crowd Gate Rush, Brain Test |
| v1.1 Engagement | Energy, daily rewards every 30s, forced ad breaks, a "rate us" banner | Pin Rescue Saga, Help Her Choose |
| v1.2 Monetisation | Fake-X offers, x8 inflation, silly number suffixes, notification badges, Comic Sans | Squad Shooter, Screw Sort Jam |
| v1.3 AI | AI-written labels, a wandering burger with a hand, hallucinated taps | Hole Eater.io, Number Tower |
| v1.4 Live Service | Battle pass, sleepy workers, "server sync", twitchy UI, the ad hand | Perfect Slice ASMR, Stack Tower Pro |
| v1.5 Quality of Life | Dark mode on half the screen, a shuffled shop, ads inside ads | |
| v2.0 Final | The game collapses into a 4-part finale, then credits | |

## Layout

- `src/main.ts`: the idle game shell, per-patch UI text and the timers each patch switches on
- `src/style.css`: base look plus the `patch-N` decay classes
- `src/patches.ts`: the patch roadmap, with notes and expansion goals
- `src/popups.ts`: daily rewards, limited-time offers and patch downloads
- `src/sfx.ts`: synthesized sound effects
- `src/ads/ad.ts`: the ad frame and the registry of ad partners (which patch unlocks each one)
- `src/ads/*`: one file per minigame. Gate levels (`gates.ts`) are brute-force solved so the boss is always beatable, the pin and screw puzzles are built to be solvable, and Number Tower's boss is set from the best possible run.
- `src/finale.ts`: the v2.0 collapse and the credits

Progress autosaves to localStorage. In dev builds, `window.game` exposes `state`, `changed()`, `showAd()` and `applyDecay()` for poking at things from the console.
