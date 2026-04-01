export interface Game {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  tags: string[];
}

export const games: Game[] = [
  {
    slug: "tic-tac-toe",
    title: "Tic Tac Toe",
    description: "Classic two-player game. Get three in a row to win!",
    emoji: "⭕",
    tags: ["2-player", "strategy", "classic"],
  },
  {
    slug: "car-shot",
    title: "Car Shot",
    description: "Pull back a Hot Wheels car, release it down a ramp, and fly through structures to collect golden wheels!",
    emoji: "🚗",
    tags: ["physics", "skill", "single-player"],
  },
  {
    slug: "new-home",
    title: "New Home",
    description: "Walk around your property with WASD, drag & drop trees, bushes, rocks and plants to decorate inside and out, then save your layout.",
    emoji: "🏡",
    tags: ["decoration", "sandbox", "creative"],
  },
  // Add more games here
];

export function getGame(slug: string): Game | undefined {
  return games.find((g) => g.slug === slug);
}
