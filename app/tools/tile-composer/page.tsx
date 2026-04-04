"use client";

import Link from "next/link";

export default function TileComposerPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-4 px-4 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <Link
          href="/tools"
          className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          ← Back to tools
        </Link>
        <h1 className="text-white font-semibold">Tile Composer</h1>
      </div>
      <iframe
        src="/tile-composer/index.html"
        className="flex-1 w-full border-0"
        title="Tile Composer"
      />
    </div>
  );
}
