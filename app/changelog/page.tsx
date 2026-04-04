import fs from "fs";
import path from "path";
import { marked } from "marked";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog – Games",
  description: "What's new across all games",
};

// Render on every request so a freshly-generated CHANGELOG.md is always shown.
export const dynamic = "force-dynamic";

async function getChangelog(): Promise<{ html: string; exists: boolean }> {
  const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
  try {
    const raw = fs.readFileSync(changelogPath, "utf-8");
    const html = await marked(raw, { gfm: true, breaks: false });
    return { html, exists: true };
  } catch {
    return { html: "", exists: false };
  }
}

export default async function ChangelogPage() {
  const { html, exists } = await getChangelog();

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/"
            className="text-slate-500 text-sm hover:text-slate-300 transition-colors"
          >
            ← Games
          </Link>
        </div>
        <h1 className="text-4xl font-extrabold text-white">Changelog</h1>
        <p className="text-slate-400 mt-2">
          A full history of releases, features, and fixes.
        </p>
      </div>

      {exists ? (
        /* Render the release-please generated CHANGELOG.md */
        <div
          className="
            prose prose-invert max-w-none
            prose-headings:scroll-mt-24
            prose-h1:text-3xl prose-h1:font-bold prose-h1:text-white prose-h1:border-b prose-h1:border-slate-700 prose-h1:pb-3
            prose-h2:text-xl prose-h2:font-semibold prose-h2:text-indigo-400 prose-h2:mt-10 prose-h2:mb-3
            prose-h3:text-base prose-h3:font-semibold prose-h3:text-slate-300 prose-h3:mt-6 prose-h3:mb-2
            prose-p:text-slate-400
            prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
            prose-li:text-slate-400 prose-li:marker:text-slate-600
            prose-code:text-indigo-300 prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded
            prose-strong:text-slate-200
          "
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        /* Placeholder shown before the first release is cut */
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            No releases yet
          </h2>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Once the first release is cut via{" "}
            <span className="text-indigo-400 font-mono text-xs">
              release-please
            </span>
            , a{" "}
            <span className="font-mono text-xs text-slate-300">
              CHANGELOG.md
            </span>{" "}
            will appear here automatically.
          </p>
          <p className="text-slate-500 text-xs mt-4">
            Commit with{" "}
            <span className="font-mono text-slate-400">feat:</span> or{" "}
            <span className="font-mono text-slate-400">fix:</span> prefixes and
            merge to <span className="font-mono text-slate-400">main</span>.
          </p>
        </div>
      )}
    </div>
  );
}
