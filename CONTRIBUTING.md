# Contributing

Thanks for your interest in contributing! This document covers everything you need to get up and running.

---

## Table of Contents

1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Commit Conventions](#commit-conventions)
4. [Adding a Game](#adding-a-game)
5. [Adding a Tool](#adding-a-tool)
6. [High Score Integration](#high-score-integration)
7. [Database Migrations](#database-migrations)
8. [Tests](#tests)
9. [Pull Requests](#pull-requests)

---

## Development Setup

### Prerequisites

- **Node.js ≥ 22** — use [nvm](https://github.com/nvm-sh/nvm) for version management
- **Yarn** — package manager used by this project
- **Supabase CLI** — `npm i -g supabase`
- A free [Supabase](https://supabase.com) project for your local development

### First-time setup

```bash
# 1. Fork & clone
git clone https://github.com/<your-fork>/Games.git
cd Games

# 2. Install dependencies (also installs git hooks via husky)
yarn install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Push the DB schema to your Supabase project
npx supabase login
npx supabase link --project-ref <your-project-id>
npx supabase db push

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you're good to go.

---

## Project Structure

```
├── app/                    # Next.js App Router pages & API routes
│   ├── api/scores/         # Score API (submit, leaderboard, player/stats, games)
│   ├── games/<slug>/       # One directory per game
│   ├── tools/<slug>/       # One directory per tool
│   └── scores/             # Leaderboards page
├── lib/
│   ├── games.ts            # Game registry (metadata + nav links)
│   ├── tools.ts            # Tool registry
│   └── scores/             # High score SDK (client, hooks, components, types)
├── public/<slug>/          # Static assets for each game/tool
├── supabase/migrations/    # SQL migrations — schema + seed data
├── __tests__/              # Vitest unit tests (mirrors lib/ and app/api/)
└── cypress/e2e/            # Cypress e2e tests
```

---

## Commit Conventions

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/). This is enforced by `commitlint` via a Husky `commit-msg` hook — invalid messages are rejected before the commit is created.

### Format

```
<type>(<optional scope>): <subject>
```

### Allowed types

| Type | When to use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting — no logic change |
| `refactor` | Code restructuring — neither fix nor feat |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system or dependency changes |
| `ci` | CI configuration |
| `chore` | Maintenance (e.g. version bumps) |
| `revert` | Revert a previous commit |

### Rules

- **Subject is lowercase** — `feat: add car shot game` ✓, `feat: Add Car Shot Game` ✗
- **No period** at the end of the subject
- **Max 100 characters** per line in the body
- **Scope is optional** but encouraged for larger changes — e.g. `feat(scores): add composite ladder type`

### Examples

```bash
feat: add new-home decoration game
fix: prevent indoor scene from auto-starting on boot
test: add unit tests for upsert_leaderboard_entry rpc
docs: update contributing guide with migration steps
chore(main): release 0.3.0
```

---

## Adding a Game

### 1. Create the page

```
app/games/<your-slug>/page.tsx
```

Use `'use client'` if the game needs browser APIs. Follow the existing pages for nav/layout patterns (back link, title, container sizing).

### 2. Add static assets

Place sprites, audio, tilemaps, etc. in:

```
public/<your-slug>/
```

### 3. Register the game

Add an entry to `lib/games.ts` so it appears on the `/games` listing and home page:

```ts
{
  slug:        'your-slug',
  title:       'Your Game Title',
  emoji:       '🎯',
  description: 'One sentence description.',
  tags:        ['arcade', 'single-player'],
  href:        '/games/your-slug',
}
```

### 4. Add a leaderboard (optional)

See [High Score Integration](#high-score-integration) below.

---

## Adding a Tool

### 1. Create the page

```
app/tools/<your-slug>/page.tsx
```

### 2. Add static assets

```
public/<your-slug>/
```

### 3. Register the tool

Add an entry to `lib/tools.ts`:

```ts
{
  slug:        'your-slug',
  title:       'Your Tool Title',
  emoji:       '🔧',
  description: 'One sentence description.',
  href:        '/tools/your-slug',
}
```

---

## High Score Integration

The `lib/scores` SDK handles authentication, submission, and retrieval. Here's how to wire it into a new game.

### 1. Add a ladder config

In `lib/scores/config/ladders.ts`, add your game's ladder(s):

```ts
{
  gameSlug:     'your-slug',
  ladderSlug:   'global',
  name:         'Global',
  scoreType:    'highest_score',   // or 'total_wins' | 'lowest_time' | 'composite'
  primaryLabel: 'Score',
  sortPrimary:  'desc',
}
```

For composite scores (two-column ranking):

```ts
{
  gameSlug:        'your-slug',
  ladderSlug:      'global',
  name:            'Global',
  scoreType:       'composite',
  primaryLabel:    'Score',
  secondaryLabel:  'Level',
  sortPrimary:     'desc',
  sortSecondary:   'desc',
}
```

### 2. Add a database migration

Create a new migration file to seed your game and ladders:

```
supabase/migrations/<timestamp>_seed_your_game.sql
```

```sql
do $$
declare v_game_id uuid;
begin
  insert into public.games (slug, name)
  values ('your-slug', 'Your Game Title')
  returning id into v_game_id;

  insert into public.ladders (game_id, slug, name, score_type, primary_label, sort_primary)
  values (v_game_id, 'global', 'Global', 'highest_score', 'Score', 'desc');
end $$;
```

### 3. Submit a score in your game component

```tsx
import { useSubmitScore } from '@/lib/scores/hooks/useSubmitScore';

const { submitScore } = useSubmitScore();

// On game over:
await submitScore({
  gameSlug:     'your-slug',
  ladderSlug:   'global',
  primaryValue: finalScore,
});
```

If the user isn't logged in, an auth modal is shown automatically. The result tells you if it was saved and what rank was achieved:

```ts
const result = await submitScore({ ... });
// { saved: true, isImprovement: true, rank: 4 }
```

### 4. Update player stats (optional)

For tracking plays, wins, losses, etc. independently of the leaderboard:

```ts
import { useScoresClient } from '@/lib/scores/components/AuthModalProvider';

const client = useScoresClient();
await client.updatePlayerStats('your-slug', { plays: 1, wins: 1 });
```

### 5. Iframe games

If your game runs inside an `<iframe>` (like Dancing Crab), use the bridge:

```tsx
import { useEffect, useRef } from 'react';
import { attachIframeBridge } from '@/lib/scores/internal/iframe-bridge';
import { useScoresClient } from '@/lib/scores/components/AuthModalProvider';

const iframeRef = useRef<HTMLIFrameElement>(null);
const client = useScoresClient();

useEffect(() => {
  return attachIframeBridge(iframeRef, client);
}, [client]);
```

Then include `scores-shim.js` in your game's HTML and call `ScoresShim.submitScore(...)` from within the iframe.

---

## Database Migrations

Migrations live in `supabase/migrations/` and are applied in filename order. Use an ISO-timestamp prefix:

```
20260405000000_add_your_feature.sql
```

After writing a migration, apply it to your local/dev Supabase project:

```bash
npm run sb:push
```

Migrations are automatically applied on every Vercel build.

### Guidelines

- **Never edit existing migration files** — Supabase tracks which have been applied. Always create a new file.
- Keep each migration focused on a single change.
- Seed data (game/ladder rows) belongs in its own migration file, separate from schema changes.
- Security-sensitive operations (e.g. inserting into leaderboards) must go through security-definer functions, not direct table writes.

---

## Tests

### Unit tests (Vitest)

Tests live in `__tests__/` and mirror the structure of `app/api/` and `lib/`:

```
__tests__/
├── api/scores/         # API route tests
├── lib/scores/         # SDK tests
└── helpers/            # Shared mocks (buildChain, createMockClient, etc.)
```

Run them:

```bash
npm test                 # run once
npm run test:watch       # watch mode
npm run test:coverage    # with coverage report (target ≥ 80%)
```

**Coverage requirement:** All new server-side code must maintain ≥ 80% coverage across branches, functions, lines, and statements. The CI build will fail if thresholds are not met.

**Supabase mocking:** Use the helpers in `__tests__/helpers/supabase-mock.ts`:

```ts
import { createMockClient, buildChain, mockUser } from '@/tests/helpers/supabase-mock';

const client = createMockClient((table) => {
  if (table === 'games') return buildChain({ single: { data: { id: '1', slug: 'x' }, error: null } });
  return buildChain();
});
```

### E2E tests (Cypress)

Tests live in `cypress/e2e/`. They run against a live server on `localhost:3000`.

```bash
# Interactive mode
npm run dev &
npm run test:e2e

# Headless CI mode
npm run test:e2e:ci
```

Write e2e tests for any new pages and API endpoints — at minimum, verify the page loads and the API returns the expected HTTP status codes.

---

## Pull Requests

1. **Fork** the repo and create a branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Write tests** for any new server-side code. Coverage must stay ≥ 80%.

3. **Use conventional commits** — the CI will reject PRs with non-conforming commit messages.

4. **Keep PRs focused** — one feature or fix per PR makes review faster.

5. **Open the PR** against `main`. The PR title should also follow conventional commit format (Release Please uses it to determine version bumps).

6. **CI checks** that must pass:
   - `npm run lint`
   - `npm test`
   - Commitlint on all commits in the PR

### Versioning

This project follows [Semantic Versioning](https://semver.org/):

| Commit type | Version bump |
|---|---|
| `feat` | minor (0.x.0) |
| `fix`, `perf` | patch (0.0.x) |
| `feat!` or `BREAKING CHANGE` footer | major (x.0.0) |
| `docs`, `test`, `chore`, etc. | no bump |

Releases are created automatically by [Release Please](https://github.com/googleapis/release-please) when releasable commits are merged to `main`.
