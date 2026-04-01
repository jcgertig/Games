import Link from "next/link";
import { games } from "@/lib/games";

export default function GamesPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">All Games</h1>
      <p className="text-slate-400 mb-10">Browse and play all available games.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => (
          <Link
            key={game.slug}
            href={`/games/${game.slug}`}
            className="group bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500 hover:bg-slate-800/60 transition-all"
          >
            <div className="text-4xl mb-4">{game.emoji}</div>
            <h3 className="text-white font-semibold text-lg group-hover:text-indigo-400 transition-colors">
              {game.title}
            </h3>
            <p className="text-slate-400 text-sm mt-1">{game.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
