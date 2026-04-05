"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { attachIframeBridge } from "@/lib/scores/internal/iframe-bridge";
import { useScoresClient } from "@/lib/scores/components/AuthModalProvider";

export default function DancingCrabPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const client = useScoresClient();

  useEffect(() => {
    return attachIframeBridge(iframeRef, client);
  }, [client]);

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
        ref={iframeRef}
        src="/dancing-crab/index.html"
        className="flex-1 w-full border-0"
        title="Dancing Crab"
      />
    </div>
  );
}
