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

**Look: Neon** (chosen 2026-10-26 over Silver & Red and the original blue): always dark, a deep night-purple background with a faint pink and cyan grid. **Cyan** means in progress and active controls, **hot pink with a glow** means done, and **acid yellow** means finished early. Fonts are **Orbitron** for headings and **Exo 2** for text and numbers. The shared raven.click header stays charcoal. Icons come from the Lucide line-icon set.

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
- Training runs in **blocks** numbered from 1 per person. A new friend always starts at Block 1. Everyone starts fresh: no history is imported from other apps.
- **Phase plan (per block):** a list of phases, each with a number of weeks and a rep target (or "no target") for weight exercises. There are no rep ranges. The block builder starts from the **Standard preset: 3 phases × 4 weeks at 10, 8 and 6 reps**, which is how Nick trains. Other kinds of block just use a different plan (for example 2 × 4 weeks at 12 then 10, or 6 weeks with no target). The dashboard grid is drawn from the plan.
- Sets are set per exercise and don't change between phases (this could be added later).
- A block has its own workouts (for example 3 for friends and 4 for Nick). Each workout lists exercises from the list, each with a number of sets.
- Every block is fully independent. Nothing links one person's block to another's.
- **Copy block:** copy any block from any person to one or more people. **Only the structure is copied** (workouts, exercises and sets), never logs. It becomes each person's next block number and **is queued** until Nick starts it. Each copy can then be edited separately.
- **Start block:** a queued block waits until Nick presses "Start block", for one person or several at once. The block's start date is the day it's started. Completing a block never starts the next one automatically.
- **Complete block:** Nick, as admin, completes blocks for one person or for everyone, at the end of the block or earlier. Any workout still in progress becomes "finished early". Workouts nobody started stay "not started". Ticked sets stay in history either way.
- **Block notes:** free-text notes on the block as a whole (for example "got sick around week 9, starting fresh next block"). The person and Nick can both write them.
- **Past blocks:** listed newest first, grouped by year in collapsible sections, with only the latest year open. Opening one shows its grid as it ended, read-only. Only the block being viewed is loaded, so years of blocks stay fast.

**Dashboard (after login)**
- The whole current block is shown as one compact grid: **phase headings** ("Phase 1 · 10 reps"), then one row per week (12 for the Standard preset), each with one small tile per workout (name only). Nothing is collapsed and there's no "current week". The colours show what's done.
- **Tile states:**
  - **Not started.**
  - **In progress:** some sets logged and Finish not pressed, for example "4/10".
  - **Done:** every set logged. It turns done automatically, with no Finish needed.
  - **Finished early:** Finish was pressed with sets still empty.
- **Tile details:** each workout has an **icon**, picked by Nick from a small line-icon set when building the block (for example footprints for Legs, an up arrow for Push, a down arrow for Pull, a flexed arm for Arms). Finished tiles show the **date** ("✓ 23 Oct"), and finished-early tiles show the count and date ("6/10 · 23 Oct"). In-progress tiles show the count only.
- **History** opens from the dashboard without starting a workout. It lists every exercise the person has logged, with search. Other people's history can be browsed too.

**Workout screen**
- One scrolling list of exercises. Each exercise shows its target (weight only), last time's numbers, and a row per set. **Set boxes start empty** (decided 2026-10-26): pre-filling last time's numbers would nudge people to repeat them instead of trying to improve. "Last" stays visible above the sets for reference.
- **Each set saves to the server the moment it's ticked.** Leaving the page loses nothing, and there's no Cancel button.
- **No offline mode** (decided 2026-10-26: gym signal is fine, and on-device storage risks stale data). If a save fails, the set stays unticked with "Not saved. Check your connection and tap ✓ again", and the typed numbers stay on screen.
- **Opening a workout changes nothing.** It only becomes "in progress" when the first set is ticked. Unticking or deleting every set puts it back to "not started", so an accidental tap never marks anything.
- **Everything stays editable until the block is completed:** sets, notes and extras, on any day of the block. Only completed (past) blocks are read-only. Each workout has a **"Trained on" date**: today by default, or the day its first set was logged. Sets ticked later keep that date, and anyone can change it (for example when catching up the next day).
- **Unsaved drafts:** numbers typed into a set but not ticked are kept while the page is open, including when moving between screens, with a "Not saved. Tap ✓" hint. They aren't stored on the device or the server, so closing the browser loses them. Drafts never count as history.
- **Save on moving on:** when the cursor moves from one set's boxes into a *different* set's boxes (by tapping or the keyboard's "next" key), the set just left is saved if its numbers are complete. Moving between boxes of the same set, leaving the page, or incomplete numbers don't save. The row turns green with a "Saved" message, and it can be unticked. Known risk: typing a later set's numbers in advance and then tapping back would save that later set early.
- **Auto-tick:** ticking any later set in the workout, including in a later exercise or an extra, also saves earlier sets that have complete typed numbers but no tick. A message lists them ("Also saved: Back Squat set 2"), and they can be unticked. Confirmed 2026-10-26.
- **History counts as soon as a set is ticked**, whether or not the workout is ever finished. "Last" shows the previous workout. For an extra that's also in today's plan, it shows "Earlier in this workout" instead.
- **Finish workout** sits at the bottom and is only needed when stopping with sets still empty. It asks "6 of 10 sets logged. Finish anyway?", and a yes marks the workout **finished early**. The empty sets can still be filled in later, and "Undo finish" reverses it. When every set is logged, the bottom bar shows "All sets logged" instead.
- **+ Add exercise** (anyone): pick an extra exercise from the list for **that day only**, marked as an extra. It starts with **1 set**. "+ Set" adds one, and "− Set" removes the last unticked set (or removes the exercise when only one empty set is left). It doesn't change the block and doesn't count towards the tile's state. History is kept, so re-adding it next week shows last time's numbers straight away.
- One note per exercise, hidden behind "+ note", and a "History" link per exercise.

**History (per exercise)**
- A Results tab (by date, then sets, reps and weight) and a Chart tab, with personal bests marked, like the current app. It spans all blocks.
- **Export to CSV** as a backup that opens in Google Sheets or Excel. Each person can export their own data, and Nick can export everyone's.

**Access (decided 2026-10-25, passwords 2026-10-26)**
- The whole of `/training` is behind a login. A Netlify Edge Function checks for a valid login before any training page loads. Recipes and the landing page stay public.
- **No accounts.** No sign-up, emails or password resets by email.
- **One step:** a single password box. Each person has their **own simple password**, which both lets them in and identifies them, so there's no name dropdown. Because of that, passwords must be **unique**, and the admin screen enforces it.
- **Admin password:** Nick's password also unlocks admin-only features: managing the exercise list, building, copying, starting and completing blocks, managing people and passwords, and switching friend access on or off. The server refuses these actions for anyone who isn't admin, as well as hiding them. It lives in a Netlify environment variable, so it can't be changed or lost from the site.
- **Friends' passwords** are set by Nick and stored hashed in Blobs. Nick can **reset** a password but can't look one up.
- **Staying logged in:** a correct password gives the browser a signed, HTTP-only cookie that lasts **one year**. It holds only who the person is and whether they're admin, never the password, and it can't be faked. Each device logs in separately. Clearing browser data means logging in again.
- **Controlling access:** Nick can pause or remove one friend, or turn all friend access off with one switch. A paused friend sees "Your access is paused. Ask Nick."
- **Guessing:** a short lockout after several wrong attempts. This matters more because passwords are simple.
- The cookie signing key lives in a Netlify environment variable, not in the code.

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

Next: a mockup of the admin block builder, in the Neon look. Clickable mockup (made-up data, private to Nick's claude.ai account): https://claude.ai/artifact/FLcAjJovNuxY66kYqfFmBV. Nick is trying it out, and changes go into this doc as they're agreed.
