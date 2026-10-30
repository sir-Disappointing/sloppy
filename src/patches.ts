// The live-service roadmap. Each expansion ships the next patch, and every
// patch stacks one more "feature" on top of the last. Effects are implemented
// where they apply, by checking `state.patch >= n`.

export interface Patch {
  version: string;
  title: string;
  notes: string[];
  // What it costs to expand the empire and download the next patch.
  goal: { money: number; tickets: number; label: string };
}

export const PATCHES: Patch[] = [
  {
    version: 'v1.0',
    title: 'Launch',
    notes: ['Tap the burger. Earn money. That is the game.'],
    goal: { money: 60, tickets: 1, label: 'Open Restaurant #2' },
  },
  {
    version: 'v1.1',
    title: 'The Engagement Update',
    notes: [
      'Added Energy. Tapping now costs Energy. Energy refills slowly, or fully when you beat an ad.',
      'Added Daily Rewards! Now every 30 seconds, for maximum daily-ness.',
      'Gates now come with fine print. Please read it.',
      'New ad partners: Pin Rescue Saga, Help Her Choose.',
    ],
    goal: { money: 500, tickets: 2, label: 'Franchise to the next town' },
  },
  {
    version: 'v1.2',
    title: 'The Monetisation Update',
    notes: [
      'Limited-time offers now appear for a limited time, all the time.',
      'Prices adjusted for inflation (x8).',
      'Large numbers are now easier to read.',
      'Ads are now 20% more ad.',
      'Added notification badges so you never miss anything. Anything.',
      'New ad partners: Squad Shooter, Screw Sort Jam.',
    ],
    goal: { money: 5000, tickets: 2, label: 'Go public (IPO)' },
  },
  {
    version: 'v1.3',
    title: 'The AI Update',
    notes: [
      'Our writers have been replaced with AI. Text quality is now Embarkingly Delightful.',
      'Button placement is now optimised by AI. The burger goes where engagement is.',
      'Taps may occasionally hallucinate money.',
      'New ad partners: Hole Eater.io, Number Tower.',
    ],
    goal: { money: 25000, tickets: 3, label: 'Acquire the competition' },
  },
  {
    version: 'v1.4',
    title: 'The Live Service Update',
    notes: [
      'Season 1 Battle Pass! 100 tiers of rewards. Tier 2 unlocks at some point.',
      'Workers now require motivation. Tap sleeping workers to wake them.',
      'The player in our ads has been given more agency.',
      'The fine print is now finer.',
      'New ad partners: Perfect Slice ASMR, Stack Tower Pro.',
    ],
    goal: { money: 50000, tickets: 3, label: 'Become a lifestyle brand' },
  },
  {
    version: 'v1.5',
    title: 'The Quality of Life Update',
    notes: [
      'Dark mode (beta). Currently covers 50% of the screen.',
      'The shop is now sorted by what we want you to buy.',
      'Ads now contain ads.',
      'Fixed a bug where the game was fun.',
    ],
    goal: { money: 150000, tickets: 4, label: 'Merge with Big Burger' },
  },
  {
    version: 'v2.0',
    title: 'The Final Update',
    notes: [
      'By popular demand, we added the game from the ads to the game.',
      'Removed the game.',
    ],
    goal: { money: Infinity, tickets: Infinity, label: '' },
  },
];

export const FINAL_PATCH = PATCHES.length - 1;
