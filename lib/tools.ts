export interface Tool {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  tags: string[];
}

export const tools: Tool[] = [
  {
    slug: "tile-composer",
    title: "Tile Composer",
    description: "Design tilemaps with a full-featured editor — paint tiles, place objects, and export your creations.",
    emoji: "🗺️",
    tags: ["creative", "editor", "sandbox"],
  },
  // Add more tools here
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}
