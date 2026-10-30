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
      'New ad partner: Pin Rescue Saga.',
      'Gates now come with fine print. Please read it.',
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
    ],
    goal: { money: 6000, tickets: 2, label: 'Go public (IPO)' },
  },
  {
    version: 'v1.3',
    title: 'The Live Service Update',
    notes: [
      'Workers now require motivation. Tap sleeping workers to wake them.',
      'The player in our ads has been given more agency.',
      'The fine print is now finer.',
    ],
    goal: { money: 30000, tickets: 3, label: 'Acquire the competition' },
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
