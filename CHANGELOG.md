# Changelog

## [0.3.0](https://github.com/jcgertig/Games/releases/tag/v0.3.0) (2026-04-06)


### ✨ Features

* add hearts card game — local vs bots (phase 1) ([4798a13](https://github.com/jcgertig/Games/commit/4798a13))
* add hearts online multiplayer — create/join rooms, real-time play (phase 2) ([af5a04f](https://github.com/jcgertig/Games/commit/af5a04f))
* add hearts online rooms page with member-only RLS ([720bb00](https://github.com/jcgertig/Games/commit/720bb00))
* generalize online multiplayer into reusable framework for all games ([0355b70](https://github.com/jcgertig/Games/commit/0355b70))
* add leaderboards page with game and ladder tabs ([0c15389](https://github.com/jcgertig/Games/commit/0c15389))
* add display name editing with profanity filtering ([c13c749](https://github.com/jcgertig/Games/commit/c13c749))


### 🐛 Bug Fixes

* drop old hearts_* tables before creating generic online_* tables ([3fb624f](https://github.com/jcgertig/Games/commit/3fb624f))
* allow rejoining an in-progress hearts room on refresh ([ea60a59](https://github.com/jcgertig/Games/commit/ea60a59))
* correct hearts game engine and pass phase card selection ([3a27596](https://github.com/jcgertig/Games/commit/3a27596))
* pass phase card selection and enter-to-confirm ([118da00](https://github.com/jcgertig/Games/commit/118da00))
* double canvas and invisible cards in hearts game ([ff17037](https://github.com/jcgertig/Games/commit/ff17037))
* sync leaderboard display name on update ([b7696bd](https://github.com/jcgertig/Games/commit/b7696bd))
* forward bearer token from client to all score API routes ([77cc3c5](https://github.com/jcgertig/Games/commit/77cc3c5))
* only submit car shot score on successful level completion ([772af12](https://github.com/jcgertig/Games/commit/772af12))
* render auth and edit-name modals via portal into document.body ([643a34e](https://github.com/jcgertig/Games/commit/643a34e))
* modal overlay fills viewport with visible backdrop ([9f2d0a7](https://github.com/jcgertig/Games/commit/9f2d0a7))
* backdrop click skips modal; add space above login button ([ed82daf](https://github.com/jcgertig/Games/commit/ed82daf))
* add lib/** to tailwind content paths ([8aeac02](https://github.com/jcgertig/Games/commit/8aeac02))
* remove immutable violation from score_submissions index ([f743948](https://github.com/jcgertig/Games/commit/f743948))
* move cypress chainable type augmentation to index.d.ts ([44dc544](https://github.com/jcgertig/Games/commit/44dc544))


### 🧪 Tests

* add coverage for display-name route and client update method ([c3f8b11](https://github.com/jcgertig/Games/commit/c3f8b11))
* enforce test coverage ratchet via PostToolUse hook ([2144a7c](https://github.com/jcgertig/Games/commit/2144a7c))


## [0.2.0](https://github.com/jcgertig/Games/releases/tag/v0.2.0) (2026-04-05)


### ✨ Features

* add high score SDK, API, and Supabase leaderboard system ([3837d8b](https://github.com/jcgertig/Games/commit/3837d8b))
* add tools page and move Tile Composer there ([f35912c](https://github.com/jcgertig/Games/commit/f35912c))


### 🧪 Tests

* add unit tests and Cypress e2e suite with 80%+ coverage ([2601c3c](https://github.com/jcgertig/Games/commit/2601c3c))


## [0.1.0](https://github.com/jcgertig/Games/releases/tag/v0.1.0) (2026-04-04)


### ✨ Features

* add changelog page ([03a01d0](https://github.com/jcgertig/Games/commit/03a01d0))
* add release automation, changelog page, and commit linting ([03a01d0](https://github.com/jcgertig/Games/commit/03a01d0))
* add support to Car Shot to change cars without losing progress ([ae0c667](https://github.com/jcgertig/Games/commit/ae0c667))
* massive New Home asset expansion + gameplay polish ([91e5ca5](https://github.com/jcgertig/Games/commit/91e5ca5))
* add New Home — decoration sandbox game ([eac298b](https://github.com/jcgertig/Games/commit/eac298b))
* add Car Shot game (Phaser 3) ([cf6ef3e](https://github.com/jcgertig/Games/commit/cf6ef3e))
* Initial Next.js games site scaffold ([15287ee](https://github.com/jcgertig/Games/commit/15287ee))


### 🐛 Bug Fixes

* correct spritesheet frame dimensions (64×64 not 128×64) ([2ef0c76](https://github.com/jcgertig/Games/commit/2ef0c76))
* prevent IndoorScene from auto-starting on boot ([4424eeb](https://github.com/jcgertig/Games/commit/4424eeb))
* switch scenes correctly + use TMX pixel-art assets in New Home ([cd74c72](https://github.com/jcgertig/Games/commit/cd74c72))
* fix ground pass-through and over-sized obstacle hitboxes ([dafad9e](https://github.com/jcgertig/Games/commit/dafad9e))
* fix Car Shot: add retry button, R-key, and stuck detection ([583f5e0](https://github.com/jcgertig/Games/commit/583f5e0))
