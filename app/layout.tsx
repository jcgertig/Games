import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Games",
  description: "A collection of small web-based games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-white tracking-tight hover:text-indigo-400 transition-colors">
              🎮 Games
            </Link>
            <nav className="flex gap-6 text-sm text-slate-400">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <Link href="/games" className="hover:text-white transition-colors">All Games</Link>
              <Link href="/changelog" className="hover:text-white transition-colors">Changelog</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
