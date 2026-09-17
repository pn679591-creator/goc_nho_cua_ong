# Góc Nhỏ Của Ong — GitHub HTML Prompts

---

## PROMPT G1 — Convert the whole site to a static HTML website for GitHub Pages + balance images and games

━━━━━━━━ START COPYING PROMPT G1 ━━━━━━━━

You are a senior front-end engineer and game designer. Convert the entire current "Góc Nhỏ Của Ong" website into a complete static HTML website that I can upload to a GitHub repository and publish with GitHub Pages. This is a full working product, not a mockup: every button, menu, popup, page, game, shop, farm, Tarot, profile, and admin feature must actually work. Keep the current design, feature set, Firebase data, and Vietnamese UI text exactly as they are, unless this prompt says otherwise.

### 1. Before writing code
- Read the existing project and write `spec/FEATURE_PARITY.md`: a checklist of every page, feature, game, popup, admin tool, and data collection that exists now, each mapped to the new file that will implement it. Nothing on this list may be dropped.
- Keep all Firestore collection names and document fields unchanged so existing user data keeps working.

### 2. GitHub Pages rules (hard requirements)
- Pure static files only: HTML, CSS, JavaScript ES modules, images, audio, JSON. No build step, no npm, no bundler, no TypeScript, no JSX, no server code in the published site. Opening the repository through GitHub Pages must just work.
- `index.html` at the repository root. Add an empty `.nojekyll` file.
- The site is served from a sub-path like `https://<user>.github.io/<repo>/`, so every link, script, stylesheet, image, manifest, and service worker path must be relative (`./assets/...`, never `/assets/...`).
- Hash routing only: `#/`, `#/farm`, `#/arcade`, `#/tarot`, `#/bots/<id>`, `#/quan-tri`… so refreshing any page never 404s. Also add `404.html` that redirects to `./index.html` while keeping the hash.
- File and folder names: lowercase ASCII kebab-case only (GitHub Pages is case-sensitive; no Vietnamese characters or spaces in file names).
- Keep every single file under 25 MB and optimize images to WebP so the whole site stays well under 1 GB.
- Cache busting: add `?v=<APP_VERSION>` to CSS and JS includes; `APP_VERSION` lives in `js/config/app-config.js`.
- Firebase is loaded from the official Firebase CDN as ES modules with one exact pinned version number used everywhere.
- The Firebase web config goes in `js/config/firebase-config.js` (this config is safe to be public; security comes from Security Rules).
- NEVER put any secret in the repository: no Gemini API key, no admin password, no private tokens. The public repository is visible to everyone.
  - Gemini features (Tarot reading text, daily letters, companion lines) call an optional proxy URL set in `js/config/app-config.js` (`AI_PROXY_URL`, for example a Firebase Cloud Function). If it is empty or fails, use the built-in Vietnamese fallback texts. Never call Gemini directly from the browser with a key.
- Private 18+ images are NEVER stored in the repository. They stay in Firebase Storage behind Storage Rules. Only public assets go in `./assets/`.

### 3. Security model for a static site
- All protection is enforced by Firebase Security Rules, not by hiding buttons. Write complete `firebase/firestore.rules`, `firebase/storage.rules`, and `firebase/firestore.indexes.json`.
- Owner/admin identity is checked in rules by UID (`request.auth.uid in [⟦OWNER_UID⟧]` or a `roles` document clients cannot write).
- Two modes, switchable in `js/config/app-config.js`:
  - `SECURITY_MODE: "simple"` (free Firebase plan): economy actions run as client-side Firestore transactions and batched writes; rules validate every write (allowed fields only, value ranges, reward caps read from `settings/balance`, timestamps equal `request.time`, one reward per run id, owner-only content).
  - `SECURITY_MODE: "secure"`: the same actions call callable Cloud Functions in `/functions` (random rolls, stealing, rewards, shop stock, blind bags run on the server). Include the complete `/functions` code, but the site must work fully in simple mode without it.
- Velvet Curtain password without a server: the owner stores `sha256(salt + password)` in `settings/private` (clients cannot read it). A player submits a hash to `velvetAttempts/{uid}`; rules use `get()` on `settings/private` to allow creating `velvetAccess/{uid}` only if the hashes match. Changing the password bumps a session number that invalidates all old access.

### 4. File structure
```
index.html
404.html
.nojekyll
manifest.webmanifest
sw.js
css/  base.css  theme.css  layout.css  components.css  pages/*.css  games.css
js/
  app.js                 (boot, auth listener, router start)
  router.js              (hash router; calls page.mount() and page.destroy())
  config/  app-config.js  firebase-config.js  game-balance.js  economy.js
  core/    firebase.js  auth.js  db.js  store.js  events.js  audio.js  anim.js  ui.js  dialog.js  toast.js  images.js  lifecycle.js
  pages/   <one module per page>
  features/farm/  features/shop/  features/tarot/  features/bots/  features/gallery/  features/companions/  features/kitchen/  features/house/  features/events/  features/market/  features/notifications/  features/admin/
  games/   <game-id>/game.js   (one folder per game)
assets/  (public images, audio; lowercase kebab-case)
firebase/ firestore.rules  storage.rules  firestore.indexes.json
functions/ (optional secure mode)
spec/    MASTER_DESIGN_SPEC.md  FEATURE_PARITY.md  BALANCE.md
README.md (Vietnamese)
```
- Every page module exports `mount(container, params)` and `destroy()`. `js/core/lifecycle.js` gives each page an `AbortController` for all event listeners, a registry for timers, `requestAnimationFrame` ids, audio, and Firestore `onSnapshot` unsubscribers; `destroy()` clears all of them. Navigating away must leave nothing running.

### 5. Balanced images everywhere
- Global: `img, video, canvas { max-width: 100%; height: auto; }`; every image has `width` and `height` attributes (no layout shift), `loading="lazy"` below the first screen, `decoding="async"`, and Vietnamese `alt` text. No image may overflow the screen or push the layout sideways.
- Every image sits in a frame with a fixed `aspect-ratio`; never stretch or squash.
  - Character art (bot covers, companion portraits, profile art): `object-fit: cover; object-position: center 20%` so faces and heads are never cropped.
  - Sprites, icons, plants, items, mascots, Tarot cards: `object-fit: contain`.
  - Scenic banners and backgrounds: `object-fit: cover`.
- Breakpoints: phone < 600px, tablet 600–1023px, laptop 1024–1439px, desktop ≥ 1440px. Target sizes (phone / tablet / laptop / desktop):
  - Bot card grid: 2 / 3 / 4 / 5 columns; cover 4:5.
  - Game card: 2 / 3 / 4 / 4 columns; cartridge art 1:1.
  - Profile avatar: 72 / 88 / 96 / 104px, 1:1 circle.
  - Lobby mascot: 120 / 150 / 180 / 200px wide.
  - Banners: 16:9, max-height 38vh.
  - Tarot card: 2:3, width `min(70vw, 260px)` / 300px / 340px / 360px, centered. The Tarot result area shows exactly ONE card and ONE image.
  - Farm plot: min 72px; the plant image fills 80% of the plot.
  - Modal images: max 90vw × 70vh, contain.
- Use `srcset` with 1x/2x WebP when available.
- Test every page at 360, 390, 768, 1024, 1280, and 1920px wide with zero horizontal scrolling.

### 6. Real, balanced games
Apply to every game that exists on the site (the current games include, if present: Hamster Săn Hạt, Hứng Quả Rơi, Lật Thẻ Ghép Đôi, Hamster Nhảy Mây, Ghép Hạt Ngọt, Đập Sâu Vườn, Câu Cá Ao Hồng, Hamster Chạy Bánh Xe, Caro Hạt Dưa, Đua Hamster, Đố Vui Nhà Ong).

**State machine (same for every game):** `TITLE → READY (3-2-1) → PLAYING ⇄ PAUSED → GAME_OVER → RESULT → REWARD → RETRY or EXIT`. Screens in Vietnamese: "Bắt đầu", "Tạm dừng", "Tiếp tục", "Hết giờ!"/"Thua rồi!", "Kết quả", "Nhận thưởng", "Chơi lại", "Thoát".

**Game interface:** each `js/games/<id>/game.js` exports `createGame({ canvas, difficulty, config, testMode, onEnd })` returning `{ start, pause, resume, restart, destroy }`.
- Fixed-timestep loop at 60 updates per second, rendering with `requestAnimationFrame`, scaled with `devicePixelRatio`, resizes with the container.
- Only one game instance can exist at a time; starting a new one destroys the old one first.
- Auto-pause on `visibilitychange` and when the window loses focus.
- `destroy()` cancels animation frames, clears all intervals and timeouts, removes all listeners (via AbortController), stops audio, releases the canvas. Exiting or changing route always calls it.

**Controls:** touch (tap, swipe with a 24px threshold, on-screen D-pad/buttons at least 48px), mouse (click/drag where it fits), keyboard (arrows/WASD, Space, P to pause, Esc to exit). Prevent page scrolling while playing.

**Difficulty:** "Dễ" (Easy), "Thường" (Normal), "Khó" (Hard), all values in `js/config/game-balance.js` and overridable from `settings/balance` in Firestore by the owner. Defaults:
- Hamster Săn Hạt: speed 6 / 8 / 10 moves per second, +0.25 every 5 seeds, max 12 / 15 / 18; power-up every 6 / 8 / 10 s.
- Hứng Quả Rơi: spawn every 1.2 / 0.9 / 0.65 s; fall speed 30% / 42% / 55% of screen height per second; bad items 10% / 18% / 28%; lives 5 / 3 / 2.
- Lật Thẻ Ghép Đôi: 4×4 no timer / 6×6 in 120 s / 6×6 in 80 s with shuffle cards.
- Hamster Nhảy Mây: breaking clouds 5% / 15% / 25%; moving clouds 10% / 20% / 35%; cloud gap 60% / 75% / 90% of max jump height.
- Ghép Hạt Ngọt: level moves +5 / +0 / −4; fewer obstacles on Easy.
- Đập Sâu Vườn: bug visible 1.1 / 0.8 / 0.55 s; baby hamsters 5% / 12% / 20%; 60 s rounds.
- Câu Cá Ao Hồng: catch zone 40% / 28% / 18% of the bar; fish speed ×0.7 / ×1 / ×1.4.
- Hamster Chạy Bánh Xe: start speed ×0.8 / ×1 / ×1.25, +2% per 100 m; minimum obstacle gap 1.4 / 1.1 / 0.85 s.
- Caro Hạt Dưa (vs AI): Easy blocks obvious threats only 50% of the time; Normal 2-ply search with threat scoring; Hard 3-ply search plus open-four detection; move timer 45 / 30 / 20 s.
- Đua Hamster (vs AI): AI speed ×0.8 / ×1 / ×1.15 of an average tapper.
- Đố Vui Nhà Ong: 20 / 15 / 10 s per question.
- Tuning target (write it in `spec/BALANCE.md`): a normal player's run lasts 60–180 s; first-try success about 80% on Easy, 50% on Normal, 20% on Hard.

**Economy balance** (keep existing currency names if the site already has them; otherwise Coin = 🌻 Hạt Hướng Dương, Gem = 🍯 Mật Ong, Ticket = 🎟️ Vé, Energy = ⚡ Năng lượng). Defaults in `js/config/economy.js`, overridable from `settings/balance`:
- ⚡ Energy: max 100, regenerates 1 point every 3 minutes (calculated from timestamps, not timers); each rewarded run costs 6 / 8 / 10. With too little energy the player can still play in "Chơi vui" mode with no rewards.
- EXP per run: 10 base + up to 30 by performance, ×0.8 / ×1 / ×1.3 by difficulty.
- 🌻 per run: score × per-game rate, ×0.8 / ×1 / ×1.4, capped at 120 / 150 / 200 per run.
- 🍯 per run: only with at least 1 star; 5 / 10 / 15 plus 2 per star; games give at most 300 🍯 per day in total.
- 🎟️: a 3-star run gives 1 ticket, at most 3 tickets per day in total.
- Cooldown between rewarded runs of the same game: 15 s. Rewarded runs per game per day: 25; after that, "Chơi vui" only.
- Multiplayer: winner 10 🍯, loser 3 🍯; rewards against the same opponent at most 5 times per day.
- A value of 0 for any daily limit means unlimited.

**Rewards are granted exactly once:**
- `start` creates `gameRuns/{runId}` (runId from `crypto.randomUUID()`) with status `playing`, gameId, difficulty, uid, startedAt.
- `REWARD` claims in one transaction: allowed only when status is `finished`, sets status `claimed`, adds the capped rewards, writes `honeyLedger`/wallet history. Rules reject a second claim, rewards above the caps, or a run shorter than the game's minimum duration.
- The "Nhận thưởng" button disables on the first tap and shows a spinner; any error shows a clear Vietnamese message and allows retry without double crediting.
- No duplicate listeners, no duplicate `onEnd` calls (guard with a `finished` flag), no reward from a game instance that was already destroyed.

### 7. Deliverables
- Output the complete repository: every file in full, no "TODO", no "…rest of code". Because it is large, first print the full file tree, then output files in numbered batches in dependency order; stop after each batch and continue when I type "tiếp".
- `README.md` in Vietnamese: how to create the GitHub repository, upload all files, enable GitHub Pages (Settings → Pages → Deploy from branch → main → root), paste the Firebase config, add the GitHub Pages domain to Firebase Authentication authorized domains, publish the Firestore and Storage rules from the Firebase console, set the owner UID, switch simple/secure mode, and update `APP_VERSION` after each change.
- Keep `spec/MASTER_DESIGN_SPEC.md` updated with this new tech stack.

### Acceptance criteria
- Uploaded to GitHub Pages, the site loads at `https://<user>.github.io/<repo>/`, every route works after a refresh, and no request uses an absolute root path.
- Every item in `spec/FEATURE_PARITY.md` works.
- No image is stretched, cropped through a face, or wider than the screen at any tested width.
- Every game goes through all states, works with touch and keyboard, uses the difficulty settings, and leaves no timers, listeners, or animation running after "Thoát".
- A reward can never be claimed twice, even with double taps, slow network, or reloading on the result screen.
- Searching the repository finds no API keys or passwords.

━━━━━━━━ END OF PROMPT G1 ━━━━━━━━

---

## PROMPT G2 — Tarot fix: one draw = one card

━━━━━━━━ START COPYING PROMPT G2 ━━━━━━━━

Fix the Tarot display bug in the static HTML site (`js/features/tarot/`). Keep the current Tarot design exactly as it is; only fix the logic and rendering. All UI text stays in Vietnamese.

### Required behavior
- Each draw shows exactly ONE Tarot card and exactly ONE card image in the result area.
- Never show 2 or more cards at the same time, never duplicate a card, never draw more than once per turn, never auto-draw extra cards.
- A new card replaces the old one in the result area; it is never appended below it.
- History ("Lịch sử Tarot") can store many past cards, but it lives in a separate section and never appears inside the current result area.
- If the site has multi-card spreads, make them step by step: each tap draws one card that replaces the previous one in the result area, with a small "Lá 2/3" indicator; earlier cards of that spread are visible only in history.
- FINAL RULE: 1 draw = 1 card.

### Implementation
- One state object per Tarot page: `{ status: 'idle' | 'drawing' | 'revealed', currentCard: null | { id, orientation, drawnAt }, drawToken }`. Exactly one `currentCard`, never an array.
- `drawOneCard()` is the only function that picks a card. It returns immediately if `status === 'drawing'`. It sets `status = 'drawing'`, creates a new `drawToken`, calls the random picker exactly once, saves the result, then reveals.
- Rendering: the result container is rebuilt with `container.replaceChildren(cardElement)`, never `appendChild`, `insertAdjacentHTML`, or `innerHTML +=`. After rendering, assert in development that the container holds exactly one `.tarot-card` and one card-face `<img>`; if not, log an error and re-render.
- Card flip: a single `.tarot-card` element with a front face and a back face using `backface-visibility: hidden` and `transform-style: preserve-3d`, so only one face is ever visible. No extra image in CSS `::before`/`::after` or background layers.
- Animation callbacks (`transitionend`, `animationend`, `setTimeout`) check the `drawToken` they were created with and do nothing if it no longer matches, so a late callback can never render a second card.
- Event listeners are attached once per mount through the page's `AbortController`; `destroy()` aborts them. Navigating away and back must not stack listeners.
- Disable the "Rút bài" button while `status === 'drawing'` and ignore double taps and repeated key presses.
- Firestore: each draw writes one `tarotReadings` document with a client-generated id created before writing (`doc(collection(...))`), so a retry never creates two readings. "Lá bài hôm nay" is allowed once per Vietnam date; rules reject a second one.
- The reading text (from `AI_PROXY_URL` or the fallback meanings) is requested once per draw and rendered only if its `drawToken` still matches.
- If the page is still built with React anywhere, also remove double effects from `StrictMode`, avoid remount loops, and make sure the draw is triggered by the click handler, never by an effect.

### Check and report
Check for and fix: duplicate event listeners, duplicate renders, multiple random calls, animation callbacks rendering twice, component or page remounts, and history leaking into the result area. Then list which of these caused the bug.

### Acceptance criteria
- 50 rapid taps on "Rút bài" produce exactly one visible card at any moment and one reading per completed draw.
- The result area always contains exactly one card and one image, on phone, tablet, and desktop.
- Leaving the Tarot page mid-animation and returning shows no leftover or doubled card.

━━━━━━━━ END OF PROMPT G2 ━━━━━━━━

---

## PROMPT G3 — Owner/Admin full control over everything in the game

━━━━━━━━ START COPYING PROMPT G3 ━━━━━━━━

Upgrade the static HTML site's admin into a complete Owner Console ("Bảng Điều Khiển Chủ Nhà") at `#/quan-tri`. The OWNER (Ong) can manage everything that exists in the game and every admin mode, and can keep adding new content later without rewriting the website. All UI text stays in Vietnamese. Every power is enforced by Firebase Security Rules (and by Cloud Functions in secure mode), never only by hiding buttons.

### 1. Roles
- `owner`: Ong, full access to everything below.
- `admin`: optional helpers; the owner turns individual permission groups on or off per helper (for example only Content Master). Store in `roles/{uid}` which only the owner can write.
- Rules helper functions: `isOwner()`, `hasPerm(group)`.

### 2. Data-driven content registries (no hard limits)
- Firestore registries: `games`, `items`, `crops`, `seeds`, `tarotDeck`, `events`, `quests`, `achievements`, `shopItems`, `assets`, plus `currencies` and `settings/balance`.
- Each registry is described by a schema file in `js/features/admin/schemas/<registry>.js` (fields, types, labels in Vietnamese, validation, image fields, relations). The console builds its table, filters, and edit forms from these schemas, so a new registry or a new field is added by editing one schema file.
- The site reads content from the registries at runtime (with local defaults as fallback). No hard-coded maximum number of games, items, crops, seeds, Tarot cards, events, quests, or achievements.
- Every editor supports: create, edit, delete (with confirm and 10-second undo), clone, change image (pick from `assets` or upload), change rarity, change price, change quantity, enable/disable, search, sort, bulk edit, import/export JSON.

### 3. Console sections
**Overview dashboard:** total users, active games right now, total farms, total 🌻, total 🍯, total items, Tarot draws, successful steals, active events, recent activity log (Firestore count and sum aggregation queries, refreshed on demand).

**Owner inventory:** add any item to myself; add 🌻 coin, 🍯 gem, EXP, 🎟️ ticket, ⚡ energy to myself (logged like any other change).

**Game Master:** turn each game on/off, per-game maintenance, change difficulty values, rewards, cooldown, energy cost, daily limit; reset a game's leaderboard or high scores; unlock a game for a user or everyone; open any game in Test Mode.

**Test Mode ("Chế độ thử"):** Free Play, Infinite Energy, No Cooldown, No Daily Limit, Test Reward, God Score, Invincible, Pause, Force Win, Force Lose, Reset Game. Test Mode never touches the real economy: rewards go to a sandbox wallet in `testSandbox/{uid}`, runs are marked `test: true`, leaderboards and achievements ignore them, and a clear "CHẾ ĐỘ THỬ" badge stays on screen the whole time.

**Farm Master:** create, edit, delete, clone crops and seeds; change rarity, grow time, sell price, EXP, yield, image, season, weather conditions, spawn rate; Instant Grow and Instant Harvest (for my farm or a chosen user's farm); add or remove a crop on a plot; reset, lock, or unlock a farm.

**Spawn Control:** Force Spawn, Rare Spawn, Legendary Spawn, change spawn rates, set stock, set max stock, set respawn timer, Force Restock.

**Shop Master:** create, edit, delete shop items; change price, stock, rarity, appearance time window; Flash Sale (discount and end time), Limited Item, Event Item; Restock Now, Clear Stock, Randomize Stock, Force Rare Stock.

**Economy Master:** reward multiplier, sell multiplier, shop price multiplier, EXP multiplier, event multiplier, daily earning limit, game reward limit, farm income limit (0 = unlimited). Show a preview of how a change affects an example run before saving.

**Cooldown Master:** reset cooldowns for games, steal, farm, shop, quests, energy, events; for one user or all users (all-users resets run in batches with a progress bar).

**Steal Master:** steal on/off, cooldown, daily limit, energy cost, success rate, reward, penalty, defenses on/off, reset steal history, reset steal leaderboard.

**Leaderboard Master:** game, farm, steal, coin, level, and achievement leaderboards; reset, archive to `leaderboardArchives/{seasonId}`, start a new season.

**Tarot Master:** add, edit, delete, clone cards in `tarotDeck`; change image, meaning, upright message, reversed message, rarity; enable/disable; Draw Specific Card and Random Card for testing (still exactly 1 card per draw); reset a user's or everyone's Tarot history.

**Event Master:** create, edit, delete events; start/end now or on a schedule; 2X Coin, 2X EXP, Rare Drop, Special Crop, Special Shop, Special Game, Limited Tarot.

**Content Master:** bots, tags, categories, artworks, comments, feedback, announcements, notifications, Coming Soon, event content.

**User Control:** search users; view profile, inventory, farm, game history, steal history, Tarot history; add/subtract 🌻, 🍯, EXP, 🎟️, ⚡ (reason required); add/remove items and change quantities; unlock games and farm; reset cooldowns and daily limits; change level; grant achievements; lock, unlock, ban.

**Asset Manager:** browse, upload, replace, delete images in the `assets` registry, with the usage list for each image.

**Emergency Mode:** Disable All Games, Disable Economy, Disable Shop, Disable Steal, Disable Farm, Disable User Upload, Maintenance Mode. Flags live in `settings/public.flags`; every client listens live and shows a soft Vietnamese notice, and Security Rules block the matching writes while a flag is on. The owner can still enter everything.

**Owner Mode:** Full Game, Inventory, Economy, Farm, Shop, Tarot, Content, Event, User Management, Debug, and Config access. A Debug panel shows current route, active listeners count, running game instance, Firestore listener count, app version, and security mode.

### 4. Audit log
- Every change writes an `auditLogs` entry in the same batched write: `timestamp`, `adminId`, `action`, `target`, `oldValue`, `newValue`.
- Rules use `getAfter()` to require the matching audit entry for owner/admin writes to registries, balances, and user data.
- The log page filters by admin, action, target, and date, and can export CSV.

### 5. Safety and usability
- Destructive actions (delete, reset all, clear stock, emergency flags) ask for confirmation by typing the Vietnamese word "XÁC NHẬN".
- Every form validates values (no negative prices, rates between 0 and 100%, integer quantities).
- The console is responsive and works on a phone, with a search box to jump to any tool.
- Changes to registries and balance apply live for all players without redeploying the GitHub site.

### Acceptance criteria
- The owner can create a new game entry, crop, shop item, Tarot card, event, quest, and achievement from the console, and each appears in the site without editing code.
- A regular account calling the same Firestore writes from the browser console is rejected by the rules.
- Test Mode runs never change real wallets, leaderboards, or achievements.
- Emergency flags stop the matching features for all players within a few seconds, and rules reject writes while they are on.
- Every admin change produces an audit entry with old and new values.

━━━━━━━━ END OF PROMPT G3 ━━━━━━━━
