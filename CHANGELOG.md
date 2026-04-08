# Changelog

## [0.4.0](https://github.com/jcgertig/Games/compare/games-site-v0.3.0...games-site-v0.4.0) (2026-04-08)


### ✨ Features

* add change log ([66a112b](https://github.com/jcgertig/Games/commit/66a112bffe7ea22c692457648a46a77d34212279))
* add display name editing with profanity filtering ([c13c749](https://github.com/jcgertig/Games/commit/c13c7497322cc8226357059ca13dd739b3c389cd))
* add hearts card game (phase 1 — local vs bots) ([4798a13](https://github.com/jcgertig/Games/commit/4798a1358173c91290c581f52e6d33c2362d4ac4))
* add hearts online multiplayer (phase 2) ([af5a04f](https://github.com/jcgertig/Games/commit/af5a04f95b2e3e1c6524592eb74e0a89a5bb9570))
* add hearts online rooms page with restricted rls ([720bb00](https://github.com/jcgertig/Games/commit/720bb00a2a1f77cf9cb3b26094be10c25e20f852))
* add hearts to leaderboards with wins and avg-points ladders ([61b4fd6](https://github.com/jcgertig/Games/commit/61b4fd6d146897918fd3e4a869a90b8c0d9e1ddf))
* add high score sdk, api, and supabase leaderboard system ([3837d8b](https://github.com/jcgertig/Games/commit/3837d8b05996a6e1992faa2454703e180094230f))
* add leaderboards page with game and ladder tabs ([0c15389](https://github.com/jcgertig/Games/commit/0c1538931061186aad924bcfef9a45d94cf68b74))
* add live chat to online game rooms ([4b4e625](https://github.com/jcgertig/Games/commit/4b4e625c682d5a482cf12c3eb24bafdba454fefc))
* add release automation, changelog page, and commit linting ([03a01d0](https://github.com/jcgertig/Games/commit/03a01d05bd1398dd7c33851fdb7031f373dd9264))
* add support to car shot to change cars without losing progress ([ae0c667](https://github.com/jcgertig/Games/commit/ae0c66708c0fb7f90a746c8c0d61ac1fb0bf3a6a))
* add tools page and move tile composer there ([f35912c](https://github.com/jcgertig/Games/commit/f35912cbeffba7d9ef5af87357e1b19f08b6baf5))
* close/leave/join/spectate for hearts online rooms ([a75e5e4](https://github.com/jcgertig/Games/commit/a75e5e4916e6d3419f4693bd213fc93a491268c9))
* hearts online game visual redesign and animation polish ([47850b6](https://github.com/jcgertig/Games/commit/47850b6344a3ffde5c8e451c134cbb34b89ed73c))
* massive New Home asset expansion + gameplay polish ([91e5ca5](https://github.com/jcgertig/Games/commit/91e5ca5659cc9a2c4a282b481c47baf4f525bb86))
* rotate hearts online table so myseat is always at bottom ([5e0d2e6](https://github.com/jcgertig/Games/commit/5e0d2e6c873d3a6ff36cdbe9ca90b0332c3429ec))
* run yarn build:app before every git commit ([2c5ffd3](https://github.com/jcgertig/Games/commit/2c5ffd3b68e3975d030dea8e13ec2602a44e5969))
* use photo texture as hearts table background ([2eafd62](https://github.com/jcgertig/Games/commit/2eafd62d7994f4bc220ef87a80b9d2cae62d639f))


### 🐛 Bug Fixes

* add lib/** to tailwind content paths ([8aeac02](https://github.com/jcgertig/Games/commit/8aeac02f5bf833d06815cb211a90f30bb42b6ab6))
* allow rejoining an in-progress hearts room on refresh ([ea60a59](https://github.com/jcgertig/Games/commit/ea60a5943716efa019a434f3fbb4cd294b4cc1d8))
* backdrop click skips modal; add space above login button ([ed82daf](https://github.com/jcgertig/Games/commit/ed82daf59d157a369916ae3831eb218d51fef4aa))
* correct spritesheet frame dimensions (64×64 not 128×64) ([2ef0c76](https://github.com/jcgertig/Games/commit/2ef0c76329dda2b356a164e6027e631e8edc2680))
* deliver initial state to online hearts scene and stop phaser recreation ([d257aca](https://github.com/jcgertig/Games/commit/d257acaaef50fc22edee8e8517a0cde10e0795d8))
* double canvas and invisible cards in hearts game ([ff17037](https://github.com/jcgertig/Games/commit/ff17037f353eda5674fd214960730a841915edef))
* drop old hearts_* tables before creating generic online_* tables ([3fb624f](https://github.com/jcgertig/Games/commit/3fb624f288913bc15234160206062d2089c75592))
* eliminate duplicate gotrueclient instances ([94e9707](https://github.com/jcgertig/Games/commit/94e97076e989172aa0eb00679ab7e7c8fc5b0a58))
* fetch game state on room-status transition to guarantee initial state ([1c2c258](https://github.com/jcgertig/Games/commit/1c2c2583f353870b599f57337093ead10498e5c2))
* forward bearer token from client to all score api routes ([77cc3c5](https://github.com/jcgertig/Games/commit/77cc3c501e59354e236e83773d60de4e33ab741d))
* modal overlay fills viewport with visible backdrop ([9f2d0a7](https://github.com/jcgertig/Games/commit/9f2d0a763c845e337407ce673ca4c2a3b3df62c5))
* move cypress chainable type augmentation to index.d.ts ([44dc544](https://github.com/jcgertig/Games/commit/44dc544c794adb1922dba7ed6a15860bf23f90ed))
* only submit car shot score on successful level completion ([772af12](https://github.com/jcgertig/Games/commit/772af12de43a1c10e9d7cb9bbe513e44a8f3a9ac))
* pass phase card selection and enter-to-confirm ([118da00](https://github.com/jcgertig/Games/commit/118da00d498146a84b7ca408aaf6a78dc48d6db6))
* prevent IndoorScene from auto-starting on boot ([7188a18](https://github.com/jcgertig/Games/commit/7188a18de32e3cf14050d47c2d5cd4f4bb766d17))
* remove immutable violation from score_submissions index ([f743948](https://github.com/jcgertig/Games/commit/f743948b2db1a820048611cf4d779dfbc4ced6e1))
* render auth and edit-name modals via portal into document.body ([643a34e](https://github.com/jcgertig/Games/commit/643a34efa254c9e64fa3b81c482f035401e9a930))
* spectator realtime updates and join button ([a8460d7](https://github.com/jcgertig/Games/commit/a8460d7f38e12adb401a5dc8704c8d5fae327ce6))
* switch scenes correctly + use TMX pixel-art assets in New Home ([4424eeb](https://github.com/jcgertig/Games/commit/4424eeba23d0ba5aef0f35c603c6411a0b1ce684))
* sync leaderboard display name on update ([b7696bd](https://github.com/jcgertig/Games/commit/b7696bdd5896eb79f92126b876e8a5a32c0a8232))
* use registry storage for initial hearts scene state delivery ([892480c](https://github.com/jcgertig/Games/commit/892480cfc5e4295ffcffe7cc0a9779f5c1994fdc))
* widen ongameendref type to accept points argument ([473b6d1](https://github.com/jcgertig/Games/commit/473b6d1aee7973b4f757bc644763d2df755f6f35))


### 📚 Documentation

* add assets and resources section to readme ([c48ba5c](https://github.com/jcgertig/Games/commit/c48ba5c47d03b2b4c39f6ff7d507629d2c89fc67))
* add readme, contributing guide, and env example ([230d42e](https://github.com/jcgertig/Games/commit/230d42eee8e5eb3cb4b9d7413ad0b179fad1d675))
* update changelog for v0.3.0 ([64f4e4b](https://github.com/jcgertig/Games/commit/64f4e4bd44a7880f4024b62fe5d93c7b97536021))


### ♻️ Refactors

* add correct migrations ([62ca2d4](https://github.com/jcgertig/Games/commit/62ca2d47e0dd1a8fa1bbde0c75646485314f4306))
* add felt texture ([d6f6593](https://github.com/jcgertig/Games/commit/d6f65938c14d709a6bdb8eb591a296968ec6386e))
* correct game engine for hearts ([3a27596](https://github.com/jcgertig/Games/commit/3a275965c27f93243ee25527765de808755465a6))
* generalize online multiplayer into reusable framework ([0355b70](https://github.com/jcgertig/Games/commit/0355b701d0250530102c2a2b9051627f1ab27545))
* replace lineicons css with [@lineiconshq](https://github.com/lineiconshq) react components ([b8054f3](https://github.com/jcgertig/Games/commit/b8054f3e004664cdc09a5adf258bc9d85a0ef699))

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
