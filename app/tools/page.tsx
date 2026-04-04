import Link from "next/link";
import { tools } from "@/lib/tools";

export default function ToolsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Tools</h1>
      <p className="text-slate-400 mb-10">A collection of creative and utility tools.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="group bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500 hover:bg-slate-800/60 transition-all"
          >
            <div className="text-4xl mb-4">{tool.emoji}</div>
            <h3 className="text-white font-semibold text-lg group-hover:text-indigo-400 transition-colors">
              {tool.title}
            </h3>
            <p className="text-slate-400 text-sm mt-1">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
