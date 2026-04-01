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
  // Add more games here
];

export function getGame(slug: string): Game | undefined {
  return games.find((g) => g.slug === slug);
}
