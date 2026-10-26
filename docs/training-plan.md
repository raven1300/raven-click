# Training record — planning snapshot

Last updated 2026-10-26. Training itself isn't built yet. The design below is agreed.

## To do (Nick)

- [x] **Rename the GitHub repo** from `recipe-filter` to `raven-click` (done 2026-10-25).
- [x] **Update the git remote** to https://github.com/raven1300/raven-click.git (done 2026-10-25).
- [x] **Check Netlify still points at the renamed repo** (confirmed 2026-10-25: deploy published, site working).
- [x] Rename the local folder `C:\code\recipe-filter` to `C:\code\raven-click` (done 2026-10-25).
- [x] Delete the unused `C:\code\training-record` folder (done 2026-10-25).
- The **domain stays raven.click**. Nothing to change there.
- [ ] Answer the questions at the bottom of this file.

## Site structure

Agreed 2026-10-25. The site should make it easy to add more features later.

- **Shared site header** on every page: a "raven.click" text logo (a real logo comes later) that links to `/`, then About, Recipes and Training. The Home link goes. The header and the landing page are built from a single nav list, so adding a feature means adding one entry.
- **raven.click (`/`)**: a landing page with a card or button for each feature.
- **/recipes**: works exactly as before. The only visible change is the new shared header.
- **/training**: its own layout, components, stylesheet, Netlify functions (`training-` prefix) and Blobs store. It does not reuse recipe code.
- **/about**: will become a site-wide page later. For now it stays as it is, in the recipe layout.
- **Styling**: three separate stylesheets for the site header and landing page, recipes, and training. Each has its own light and dark colours. The dark mode toggle is site-wide.
- **Code layout**: everything to do with recipes sits in a `recipes/` folder (`src/components/recipes/`, `src/layouts/recipes/`, `src/data/recipes/`, `src/content/recipes/`, `src/styles/recipes.css`, `public/recipes/images/`). Training will follow the same pattern.
- **URLs moved under /recipes/** (2026-10-25): `/cooking-plan`, `/tags/…`, `/rss.xml` and `/images/…` now live under `/recipes/`. The old addresses permanently redirect there through `public/_redirects`.

### Build steps
1. [x] Move recipe code into `recipes/` folders and recipe URLs under `/recipes/`.
2. [x] Shared site header, nav list (`src/data/site/nav.js`) and new landing page.
3. [x] Placeholder `/training` page with its own layout (`src/layouts/training/`) and stylesheet (`src/styles/training.css`).

### Later
- Recipes stylesheet: add a top border or edge in a recipe colour where the recipe page meets the charcoal site header, so it's clear where the header ends.

## How it works

Reference screenshots of the app Nick uses now, plus Gemini dashboard ideas, are in `docs/design-screenshots/`. That folder is local only (git-ignored), because the repo is public.

**Dropped:** the weekly drag-and-drop schedule (people arrange days outside the app), the stopwatch, and tempo and intensity.

**Exercise list (shared catalogue, managed by Nick)**
- Each exercise has a hidden ID, a name and a type. **History attaches to the exercise ID**, not to blocks or wording.
- Exercises are always **picked from the list**, never typed into a block. Adding a new name warns "Did you mean …?". Duplicates can be **merged**, which joins their histories. Renaming keeps history.
- Removing an exercise from a block keeps its history. Adding it back later picks the history up again. Deliberate variants (for example "Pause Squat") are separate entries.
- Sharing the list only shares names. Each person's history and blocks are their own.
- **Types:**
  - **Weight:** reps × kg. Only weight exercises follow the phase target.
  - **Bodyweight:** reps only, no target.
  - **Timed:** seconds, no target.
  - **Band:** a free-text band note (for example "red", "no band") plus reps, no target.
  - Exercises without a target show last time's numbers and history for reference.
- **Pictures (later):** each exercise can optionally have a picture. It's either linked from free-exercise-db (open source, about 800 exercises; check the licence first) and copied once into our own storage, or uploaded by Nick. No live lookups during workouts. Avoid copyrighted web images.

**Blocks (per person, built by Nick)**
- Training runs in **blocks** numbered from 1 per person. A new friend always starts at Block 1. Each block is 12 weeks: **3 phases of 4 weeks**, with targets of **10, 8 and 6 reps** for weight exercises. There are no rep ranges.
- A block has its own workouts (for example 3 for friends and 4 for Nick). Each workout lists exercises from the list, each with a number of sets.
- Every block is fully independent. Nothing links one person's block to another's.
- **Copy block:** copy any block from any person to one or more people. **Only the structure is copied** (workouts, exercises and sets), never logs. It becomes each person's next block number and **is queued**, starting when their current block is completed. Each copy can then be edited separately.
- **Complete block:** Nick, as admin, completes blocks for one person or for everyone, at the end of week 12 or earlier (for example to start a queued block now). Any workout still in progress becomes "finished early". Workouts nobody started stay "not started". Ticked sets stay in history either way.
- **Block notes:** free-text notes on the block as a whole (for example "got sick around week 9, starting fresh next block"). The person and Nick can both write them.
- **Past blocks:** listed newest first, grouped by year in collapsible sections, with only the latest year open. Opening one shows its grid as it ended, read-only. Only the block being viewed is loaded, so years of blocks stay fast.

**Dashboard (after PIN login)**
- The whole current block is shown as one compact grid: **phase headings** ("Phase 1 · 10 reps"), then **12 week rows**, each with one small tile per workout (name only). Nothing is collapsed and there's no "current week". The colours show what's done.
- **Tile states:**
  - **Not started.**
  - **In progress:** some sets logged and Finish not pressed, for example "4/10".
  - **Done:** every set logged. It turns done automatically, with no Finish needed.
  - **Finished early:** Finish was pressed with sets still empty.
- **History** opens from the dashboard without starting a workout. It lists every exercise the person has logged, with search. Other people's history can be browsed too.

**Workout screen**
- One scrolling list of exercises. Each exercise shows its target (weight only), last time's numbers, and a row per set. **Set boxes start empty** (decided 2026-10-26): pre-filling last time's numbers would nudge people to repeat them instead of trying to improve. "Last" stays visible above the sets for reference.
- **Each set saves the moment it's ticked.** Leaving the page loses nothing, and there's no Cancel button.
- **Opening a workout changes nothing.** It only becomes "in progress" when the first set is ticked. Unticking or deleting every set puts it back to "not started", so an accidental tap never marks anything.
- **Everything stays editable until the block is completed:** sets, notes and extras, on any day of the block. Only completed (past) blocks are read-only. Each workout has a **"Trained on" date**: today by default, or the day its first set was logged. Sets ticked later keep that date, and anyone can change it (for example when catching up the next day).
- **Unsaved drafts:** numbers typed into a set but not ticked are kept as a draft and shown again when the person comes back, with a "Not saved. Tap ✓" hint. Drafts never count as history.
- **Auto-tick:** ticking any later set in the workout, including in a later exercise or an extra, also saves earlier sets that have complete typed numbers but no tick. A message lists them ("Also saved: Back Squat set 2"), and they can be unticked. Being tried in the mockup; Nick may limit it to within one exercise.
- **History counts as soon as a set is ticked**, whether or not the workout is ever finished. "Last" shows the previous workout. For an extra that's also in today's plan, it shows "Earlier in this workout" instead.
- **Finish workout** sits at the bottom and is only needed when stopping with sets still empty. It asks "6 of 10 sets logged. Finish anyway?", and a yes marks the workout **finished early**. The empty sets can still be filled in later, and "Undo finish" reverses it. When every set is logged, the bottom bar shows "All sets logged" instead.
- **+ Add exercise** (anyone): pick an extra exercise from the list for **that day only**, marked as an extra. It starts with **1 set**. "+ Set" adds one, and "− Set" removes the last unticked set (or removes the exercise when only one empty set is left). It doesn't change the block and doesn't count towards the tile's state. History is kept, so re-adding it next week shows last time's numbers straight away.
- One note per exercise, hidden behind "+ note", and a "History" link per exercise.

**History (per exercise)**
- A Results tab (by date, then sets, reps and weight) and a Chart tab, with personal bests marked, like the current app. It spans all blocks.
- An "Export to CSV" button acts as a backup that opens in Google Sheets or Excel.

**Access (decided 2026-10-25)**
- The whole of `/training` is behind a PIN. A Netlify Edge Function checks for a valid login before any training page loads. Recipes and the landing page stay public.
- **No accounts.** No sign-up, emails or password resets.
- **Personal PINs:** each friend has their own PIN, and Nick sets them up on a "manage people" screen. The PIN identifies the person, so there's no name dropdown.
- **Admin PIN:** Nick has an admin PIN that also unlocks admin-only features: managing the exercise list, building, copying and completing blocks, managing people and switching friend access on or off. The server refuses these actions for anyone who isn't admin, as well as hiding them.
- **Staying logged in:** a correct PIN gives the device a signed cookie that records who the person is and whether they're admin. It can't be faked.
- **Controlling access:** Nick can pause or remove one friend, or turn all friend access off with one switch.
- **Guessing:** a short lockout after several wrong PIN attempts.
- The PIN secrets and the cookie signing key live in Netlify environment variables, not in the code.

**Friends and shared data**
- Each person has their own logs and history. Everyone can see everyone's data, to encourage each other.
- Everything opens on your own data by default.
- **Logging for someone else** is a deliberate step ("Log for someone else", then pick the person). A banner ("Logging for **Sam**") stays on screen with a button to switch back, and it switches back on its own when you leave the session. This covers a friend whose phone is flat or left behind.
- **Every entry records who typed it** (for example "entered by Nick for Sam"), and the person it belongs to sees that in their history.
- **Editing and deleting** an entry is allowed for the person who entered it, the person it belongs to, and the admin (Nick).

**Storage**
- Netlify Blobs: one training store holding everyone's data, kept per person.
- Google Sheets was considered and turned down, because seeing the data on the site is enough.

## Next step

All planning questions were answered by 2026-10-26. Clickable mockup (made-up data, private to Nick's claude.ai account): https://claude.ai/artifact/FLcAjJovNuxY66kYqfFmBV. Nick is trying it out, and changes go into this doc as they're agreed.
