# 🎮 Games

A collection of small web-based games and tools, built with Next.js 15, Phaser 3, and Supabase.

**Live site:** https://github.com/jcgertig/Games

---

## Games

| Game | Description |
|---|---|
| ⭕ **Tic Tac Toe** | Classic two-player game. Track your wins on the global leaderboard. |
| 🚗 **Car Shot** | Pull back a Hot Wheels-style car, release it down a ramp, and fly through structures to collect golden wheels. Built with Phaser 3. |
| 🦀 **Dancing Crab** | Rhythm-based game with song-specific leaderboards. Runs in an iframe with a postMessage score bridge. |
| 🏡 **New Home** | Walk around your property and drag & drop trees, bushes, rocks, and plants to decorate inside and out. Save your layout between sessions. |

## Tools

| Tool | Description |
|---|---|
| 🗺️ **Tile Composer** | Design tilemaps with a full-featured editor — paint tiles, place objects, and export your creations. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS 3 |
| Language | TypeScript 5 (strict) |
| Game engine | Phaser 3 |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Data fetching | SWR |
| Unit tests | Vitest + jsdom |
| E2E tests | Cypress |
| Commit linting | Commitlint + Husky |
| CI/CD | GitHub Actions + Release Please |

---

## Getting Started

### Prerequisites

- Node.js ≥ 22 (managed via nvm — see `.nvmrc` if present)
- A [Supabase](https://supabase.com) project
- Supabase CLI (`npm i -g supabase`)

### 1. Clone & install

```bash
git clone https://github.com/jcgertig/Games.git
cd Games
yarn install
```

### 2. Environment variables

Copy the example and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — used server-side only, never exposed to the client |
| `SUPABASE_PROJECT_ID` | Supabase project ref (e.g. `abcdefghijklmnop`) |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI token — used during Vercel builds to push migrations |

### 3. Push the database schema

```bash
npx supabase login
npx supabase link --project-ref <your-project-id>
npx supabase db push
```

Or use the npm shortcuts:

```bash
npm run sb:login   # authenticate the CLI
npm run sb:link    # link to your project
npm run sb:push    # push migrations
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Login → link → push DB migrations → build Next.js |
| `npm run build:app` | Build Next.js only (no DB steps) |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run all unit tests once |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:coverage` | Run unit tests with coverage report |
| `npm run test:e2e` | Open the Cypress interactive runner |
| `npm run test:e2e:ci` | Run Cypress headlessly against a production build |

---

## Project Structure

```
├── app/
│   ├── api/scores/         # Score API routes (submit, leaderboard, player/stats, games)
│   ├── games/              # Game pages
│   ├── scores/             # Leaderboards page
│   ├── tools/              # Tool pages
│   └── changelog/          # Changelog page
├── lib/
│   └── scores/             # High score SDK
│       ├── client.ts       # ScoresClient (singleton)
│       ├── config/         # Ladder definitions
│       ├── components/     # AuthModal, AuthModalProvider
│       ├── hooks/          # useLeaderboard, usePlayerStats, useSubmitScore
│       ├── internal/       # iframe postMessage bridge
│       └── types/          # TypeScript interfaces
├── public/                 # Static game assets (sprites, audio, maps)
├── supabase/
│   └── migrations/         # SQL migrations (schema + seed data)
├── __tests__/              # Vitest unit tests
└── cypress/                # Cypress e2e tests
```

---

## High Score System

The scores SDK lives in `lib/scores` and exposes:

- **`ScoresClient`** — submit scores, fetch leaderboards, and manage player stats. Instantiated once by `AuthModalProvider` and accessed everywhere via `getScoresClient()`.
- **`useLeaderboard(gameSlug, ladderSlug)`** — SWR hook that fetches and auto-refreshes a leaderboard every 30 seconds.
- **`useSubmitScore()`** — convenience hook wrapping `ScoresClient.submitScore`.
- **`usePlayerStats(gameSlug)`** — fetch accumulated player stats for a game.
- **`attachIframeBridge(iframeRef, client)`** — proxy SDK calls from iframe games via `postMessage`.

### Score types

| Type | Description |
|---|---|
| `total_wins` | Accumulated across all sessions (e.g. Tic Tac Toe) |
| `highest_score` | Best single-session score |
| `lowest_time` | Fastest time |
| `composite` | Ranked by two values (primary + secondary tiebreaker) |

### Database

Migrations are in `supabase/migrations/`. The schema includes:

- **`games`** — game registry
- **`ladders`** — one or more ranked lists per game
- **`leaderboard_entries`** — best entry per player per ladder (trimmed to top 100)
- **`player_stats`** — cumulative stats per player per game (never trimmed)
- **`score_submissions`** — full audit log of every submission

All writes go through security-definer PL/pgSQL functions (`upsert_leaderboard_entry`, `increment_player_stats`) that handle atomic upserts and top-N trimming.

---

## Testing

Unit tests use **Vitest** with v8 coverage (≥ 80% threshold across branches, functions, lines, and statements). E2E tests use **Cypress** against a live Next.js server.

```bash
# Unit tests
npm test
npm run test:coverage   # open coverage/ for the HTML report

# E2E (requires a running server)
npm run dev &
npm run test:e2e
```

---

## Releases

Releases are automated via [Release Please](https://github.com/googleapis/release-please). Merging to `main` triggers the workflow; a release PR is opened when releasable commits accumulate. Merging the release PR bumps the version, tags the commit, and updates `CHANGELOG.md`.

See [CHANGELOG.md](./CHANGELOG.md) for the full history.

---

## License

MIT
