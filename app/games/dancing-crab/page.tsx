"use client";

import Link from "next/link";

export default function DancingCrabPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-4 px-4 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <Link
          href="/"
          className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          ← Back to games
        </Link>
        <h1 className="text-white font-semibold">Dancing Crab</h1>
      </div>
      <iframe
        src="/dancing-crab/index.html"
        className="flex-1 w-full border-0"
        title="Dancing Crab"
      />
    </div>
  );
}
