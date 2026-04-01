import Link from "next/link";
import { games } from "@/lib/games";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold text-white mb-4">
          🎮 Games
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          A collection of small, fun web games. No installs, no accounts — just play.
        </p>
      </div>

      {/* Game grid */}
      <section>
        <h2 className="text-slate-500 uppercase text-xs font-semibold tracking-widest mb-6">
          All Games
        </h2>
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
              <div className="flex flex-wrap gap-2 mt-4">
                {game.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-slate-800 text-slate-500 px-2 py-1 rounded-full border border-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
