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

**Look: Neon** (chosen 2026-10-26 over Silver & Red and the original blue): always dark, a deep night-purple background with a faint pink and cyan grid. **Acid green** means in progress, **hot pink with a glow** means done, and **cyan** means finished early. Cyan is also used for buttons and other active controls. Fonts are **Orbitron** for headings and **Exo 2** for text and numbers. The shared raven.click header stays charcoal. Icons come from the Lucide line-icon set.

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
- **Pictures (decided 2026-10-27, built in stage 6):** each exercise can optionally have one picture, uploaded by Nick. free-exercise-db was checked and left out: it says public domain but doesn't say where its images came from. ExRx is copyrighted, so nothing is copied from it. No live lookups during workouts.
  - **Upload:** on the Exercise list sheet. The browser shrinks the picture to at most 1000 pixels on its longest side, turns sideways phone photos upright and gives transparent backgrounds white. Nick then drags (and sizes) a square to crop the thumbnail.
  - **Animations (added 2026-10-27):** an animated GIF or WebP (up to 4 MB) is stored as uploaded, so it plays in the full-size view. Its thumbnail is a still of the first frame with a play badge. A one-frame GIF counts as a still.
  - **Checks:** the server checks each file's contents, not its name: only JPEG, or an animated GIF or WebP, is accepted. SVGs are refused (they can carry code). Pictures are served with a fixed image type and `nosniff`. Pictures under 300 pixels on their short side get a "may look blurry" warning, but can still be used.
  - **Shown:** a square thumbnail beside the exercise in workouts, on its History page and on the Exercise list. Tapping it shows the whole picture, uncropped.
  - **Storage:** two JPEGs per exercise in the training store (`pictures/<ex>/full` and `pictures/<ex>/thumb`), only for logged-in people. Replacing, removing, merging (the kept exercise keeps its picture, or takes the other's) and deleting all tidy them up.

**Blocks (per person, built by Nick)**
- Training runs in **blocks** numbered from 1 per person. A new friend always starts at Block 1. Everyone starts fresh: no history is imported from other apps.
- **Phase plan (per block):** a list of phases, each with a number of weeks and a rep target (or "no target") for weight exercises. There are no rep ranges. The block builder starts from the **Standard preset: 3 phases × 4 weeks at 10, 8 and 6 reps**, which is how Nick trains. Other kinds of block just use a different plan (for example 2 × 4 weeks at 12 then 10, or 6 weeks with no target). The dashboard grid is drawn from the plan.
- Sets are set per exercise and don't change between phases (this could be added later).
- A block has its own workouts (for example 3 for friends and 4 for Nick). Each workout lists exercises from the list, each with a number of sets.
- Every block is fully independent. Nothing links one person's block to another's.
- **Copy block:** copy any block from any person to one or more people. **Only the structure is copied** (workouts, exercises and sets), never logs. It becomes each person's next block number and **is queued** until Nick starts it. Each copy can then be edited separately.
- **Start block:** a queued block waits until Nick presses "Start block", for one person or several at once. The block's start date is the day it's started. Completing a block never starts the next one automatically. The Complete confirmation says so when a block is queued ("You can reopen it until you start Block 2. Block 2 stays queued until you press Start.").
- **Complete block:** Nick, as admin, completes blocks for one person or for everyone, at the end of the block or earlier. Any workout still in progress becomes "finished early". Workouts nobody started stay "not started". Ticked sets stay in history either way.
- **Block builder (admin, mocked 2026-10-26):** "Start from" a blank block or a copy of any person's block (running, queued or past). Then:
  - **Phase plan:** one row per phase, with weeks and an optional rep target, "+ Add phase", and a "Use Standard" button.
  - **Workouts:** each has a name and an icon button that opens the icon picker. Exercises come from the exercise picker and get 2 sets by default, with a − / + set stepper, ↑ / ↓ to reorder and × to remove. There are "+ Add workout" and "Remove workout" buttons.
  - **Who gets this block:** a checkbox per person, showing the Block number each will get. People who already have a queued block are greyed out.
  - **Saving** checks that every phase has weeks, every workout has a name and at least one exercise, and at least one person is chosen.
  - A queued block can be edited later from People.
- **People screen (admin):** each person's running block (progress and **Complete**), and their queued block (**Edit** and **Start**). "Start all queued" starts everyone's at once. Starting while a block is running asks first, then completes the running block.
- **Editing a running block with nothing logged (added 2026-10-27):** a running block gets **Edit** and **Delete** buttons on People for as long as nothing at all (sets, notes, extras or a Finish mark) has been logged in it. Everything can change, including the phase plan, and the start date stays the same. Delete removes it and the number is reused (unless a block is queued, which stays queued). This covers a mistake spotted just after pressing Start. Once anything is logged, the server refuses ("Block 1 has training logged, so it can't be edited yet"), and Delete is refused for good until the fuller edit below arrives.
- **Editing a running block (admin, built in stage 4):** Nick can edit a running block's workouts: swap, add or remove exercises, change sets, and rename workouts or change icons. Changes apply from then on.
  - The **phase plan** (weeks and rep targets) stays locked once a block has started.
  - Sets already logged keep their exercise and history.
  - **Earlier weeks keep their colours:** each trained workout remembers the exercises and sets it had at the time, so a change in week 6 doesn't make weeks 1–5 look "finished early".
  - **A workout with training logged can't be removed** (decided 2026-10-27): "Legs has training logged, so it can't be removed. You can change its exercises instead." Its tiles would otherwise vanish from the grid.
  - Each person's block is still edited separately (Nick is happy to repeat a change per person).
- **Adding exercises from the block builder (stage 2):** when the exercise picker's search finds no match, offer "+ Add '…' as a new exercise", with a type choice and the same "Did you mean…?" check. It's added to the list and the workout at once, so building a block never means leaving the builder. Until then: save the block queued for Nick, add the exercise on the Exercise list page, then edit the block from People.
- **Removing people (admin, added 2026-10-26):** "Remove" on a person's card, with a confirmation, for anyone with **no logged sets**. It deletes them and all their blocks. Anyone with logged sets can only be paused, so training history is never lost. This covers test people, or a block started by mistake for the wrong person. Logged sets will live under `logs/<person>/` in Blobs, and that's what the check looks at.
- **Renaming people (admin):** "Rename" on each person's card. Names must be unique. Blocks and history belong to the person's hidden ID, so renaming changes nothing else.
- **Reopen block (admin, undo for Complete):** the person's most recent completed block can be reopened while they have no block running. It becomes their running, editable block again. Workouts that completing marked "finished early" go back to "in progress", but ones the person finished early themselves stay that way. A queued block stays queued. Completing a block never affects set history, so reopening is only about the block's grid and editability.
- **Deleting a queued block (admin):** "Delete" on a queued block, with a confirmation. Nothing has been logged against it, so nothing is lost, and its Block number is reused by the next block queued for that person. Running and past blocks can't be deleted, only completed.
- **Admin test checklist:** `docs/training-admin-test.md`, to run on the live site after each build stage.
- **Adding people (admin):** "+ Add person" on the People screen takes a name and a password. The new person has no block until Nick builds or copies one and presses Start, and they always start at Block 1. "Reset password" sets a new one. Nick tells people their passwords himself, and friends can't change their own (could be added later).
- **Starting exercise list:** filled in with the exercises Nick actually uses (names to be confirmed by Nick), rather than empty. free-exercise-db is only for optional pictures and names later.
- **Tidying the exercise list (real build only, not in the mockup; agreed 2026-10-26):**
  - **Usage shown:** each exercise shows how much it's used, for example "Back Squat · 214 sets · Nick, Sam, Jess · in 3 blocks", so similar entries are easy to compare.
  - **Delete:** only allowed for exercises that have never been used (no logged sets and not in any block).
  - **Merge:** fold one exercise into another. All its history moves across, blocks using it switch over, and the duplicate disappears. Only exercises of the same type can be merged, and a merge is refused (naming the person, block and workout) where both are planned in one workout or both are extras in one trained workout (decided 2026-10-27).
  - **Hide:** for retired exercises that have history. They're removed from the pickers, but their history stays visible. They can be unhidden.
- **Exercise list screen (admin):** search, plus "Add an exercise" with name and type. While typing, it suggests close matches ("Did you mean Back Squat?") so duplicates aren't created. Rename and merge come in the real build.
- **Block notes:** free-text notes on the block as a whole (for example "got sick around week 9, starting fresh next block"). The person and Nick can both write them, on running and past blocks alike (confirmed 2026-10-27). The "who can edit" line is worded from the viewer's side ("Only you can edit these" on Nick's own block, "You and Nick can both edit these" for a friend).
- **Past blocks:** listed newest first, grouped by year in collapsible sections, with only the latest year open. Opening one shows its grid as it ended, read-only. Only the block being viewed is loaded, so years of blocks stay fast.

**Dashboard (after login)**
- The whole current block is shown as one compact grid: **phase headings** ("Phase 1 · 10 reps"), then one row per week (12 for the Standard preset), each with one small tile per workout (name only). Nothing is collapsed and there's no "current week". The colours show what's done.
- **Tile states:**
  - **Not started.**
  - **In progress:** some sets logged and Finish not pressed, for example "4/10".
  - **Done:** every set logged. It turns done automatically, with no Finish needed.
  - **Finished early:** Finish was pressed with sets still empty.
- **Tile details:** each workout has an **icon**, picked by Nick from a small line-icon set when building the block (for example footprints for Legs, a dumbbell for Push, a gripping hand for Pull, a flexed arm for Arms; Nick found arrows confusing for Push and Pull). Finished tiles show the **date** ("✓ 23 Oct"), and finished-early tiles show the count and date ("6/10 · 23 Oct"). In-progress tiles show the count only.
- **History** opens from the dashboard without starting a workout. It lists every exercise the person has logged, with search. Other people's history can be browsed too.

**Workout screen**
- One scrolling list of exercises. Each exercise shows its target (weight only), last time's numbers, and a row per set. **Set boxes start empty** (decided 2026-10-26): pre-filling last time's numbers would nudge people to repeat them instead of trying to improve. "Last" stays visible above the sets for reference.
- **Each set saves to the server the moment it's ticked.** Leaving the page loses nothing, and there's no Cancel button.
- **No offline mode** (decided 2026-10-26: gym signal is fine, and on-device storage risks stale data). If a save fails, the set stays unticked with "Not saved. Check your connection and tap ✓ again", and the typed numbers stay on screen.
- **Opening a workout changes nothing.** It only becomes "in progress" when the first set is ticked. Unticking or deleting every set puts it back to "not started", so an accidental tap never marks anything.
- **Everything stays editable until the block is completed:** sets, notes and extras, on any day of the block. Only completed (past) blocks are read-only. Each workout has a **"Trained on" date**: today by default, or the day its first set was logged. Sets ticked later keep that date, and anyone can change it (for example when catching up the next day).
- **Unsaved drafts:** numbers typed into a set but not ticked stay on the workout page with a "Not saved. Tap ✓" hint. Leaving the workout with any asks first, listing the sets: "Save them, then leave", "Discard them and leave" or "Stay".
- **Clear this workout** (added 2026-10-26): a red button at the bottom of a workout that has anything logged. After a confirmation that counts what goes, it removes every set, note and extra, plus the Finish mark and date, and the tile goes back to "not started". The block itself doesn't change. This is for when a workout was logged on the wrong day.
- **Unticking removes a set** (changed 2026-10-26, because unticking to erase a mistake got re-saved by the leave prompt). Its numbers stay visible with "Removed. Tap ✓ to save it again", but nothing saves them automatically: not moving on, not ticking a later set, and not leaving. Editing a number turns it back into normal typed numbers. They aren't stored on the device or the server, so closing the browser loses them. Drafts never count as history.
- **Save on moving on:** when the cursor moves from one set's boxes into a *different* set's boxes (by tapping or the keyboard's "next" key), the set just left is saved if its numbers are complete. Moving between boxes of the same set, leaving the page, or incomplete numbers don't save. The row turns green with a "Saved" message, and it can be unticked. Known risk: typing a later set's numbers in advance and then tapping back would save that later set early.
- **Auto-tick:** ticking any later set in the workout, including in a later exercise or an extra, also saves earlier sets that have complete typed numbers but no tick. A message lists them ("Also saved: Back Squat set 2"), and they can be unticked. Confirmed 2026-10-26.
- **History counts as soon as a set is ticked**, whether or not the workout is ever finished. "Last" shows the previous workout. For an extra that's also in today's plan, it shows "Earlier in this workout" instead.
- **Finish workout** sits at the bottom and is only needed when stopping with sets still empty. It asks "6 of 10 sets logged. Finish anyway?", and a yes marks the workout **finished early**. The empty sets can still be filled in later, and "Undo finish" reverses it. When every set is logged, the bottom bar shows "All sets logged" instead.
- **+ Add exercise** (anyone): pick an extra exercise from the list for **that day only**, marked as an extra. It starts with **1 set**. "+ Set" adds one, and "− Set" removes the last unticked set (or removes the exercise when only one empty set is left). It doesn't change the block and doesn't count towards the tile's state. History is kept, so re-adding it next week shows last time's numbers straight away.
- One note per exercise, hidden behind "+ note", and a "History" link per exercise.

**History (per exercise)**
- A Results tab (by date, then sets, reps and weight) and a Chart tab, with personal bests marked, like the current app. It spans all blocks.
- **Personal bests (decided 2026-10-27):** weight exercises: the heaviest weight, with more reps breaking a tie (not an estimated one-rep max). Bodyweight: most reps. Timed: longest hold. Band: most reps, with "No band" beating any band.
- **Export to CSV** as a backup that opens in Google Sheets or Excel. Each person can export their own data, and Nick can export everyone's. Built in stage 5: buttons on the History page, one row per set with date, person, block, week, workout, exercise, type, set, extra, reps, kg, seconds, band, entered by and note.

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
- **Viewing (stage 3):** a "Viewing" dropdown on the dashboard and History shows anyone's block grid, past blocks and history. Their workouts open read-only ("This is Sam's workout. You can view it but not change it."). Until stage 4, the server only lets people log their own workouts, the admin included.
- **Logging for someone else** (stage 4, open to any friend, confirmed 2026-10-27) is a deliberate step ("Log for someone else", then pick the person). A banner ("Logging for **Sam**") stays on screen with a button to switch back, and it switches back on its own when you leave the session. This covers a friend whose phone is flat or left behind.
- **How it works (built in stage 4):** pick the person under Viewing and press **Log for Sam**. The banner lasts until **Switch back**, until you choose anyone else under Viewing (yourself included), or until the browser tab is closed.
- **Every set records who typed it**, per set, when that wasn't the owner. The workout shows "Entered by Jess" under those sets. History marks those rows and sums them up under the workout ("Entered by Jess" if she did them all, otherwise "Sets 2 and 3 entered by Jess"). Whoever saves a set last owns it, so if Sam re-ticks it, the marker goes.
- **While logging for someone** (decided 2026-10-27): you can tick and edit sets, change the date, finish, and add notes and extras. You can only untick sets you entered. **Clear this workout** stays with the owner and Nick.
- **Editing and deleting** an entry is allowed for the person who entered it, the person it belongs to, and the admin (Nick).

**Storage**
- Netlify Blobs: one training store holding everyone's data, kept per person.
- Google Sheets was considered and turned down, because seeing the data on the site is enough.

## Build progress

- **Stage 1 (login and admin basics): live since 2026-10-26** (pull request #1).
  - Netlify settings: `TRAINING_ADMIN_PASSWORD` and `TRAINING_SESSION_SECRET`, both secret, for the Production and Deploy Previews contexts.
  - Local testing: put test values for both in `.env.development` (git-ignored). `netlify dev` doesn't pass command-line environment variables to Edge Functions.
- **Stage 2 (logging workouts): live since 2026-10-26**, after local tests and Nick working through checklist section 6b on the Deploy Preview.
  - Dashboard tiles open the workout screen at `/training/workout/`, with everything in the "Workout screen" section above.
  - Adding a new exercise from inside the block builder's picker.
  - Each trained workout keeps a snapshot of its planned exercises and sets.
  - **Separate preview data:** functions use the `training` Blobs store on the live site and `training-preview` on Deploy Previews and in local testing, chosen from the deploy context. The preview shows a "Preview data" note.
  - **Unsaved drafts change:** typed-but-unticked numbers live only on the workout page. Leaving with any asks first ("Save and leave", "Leave without saving" or "Stay").

- **Stage 6 (pictures): in progress on branch `training-stage-6`.** Upload with a square crop, animated GIF and WebP, thumbnails in workouts, History and the Exercise list, and a full-size view.
- **Stage 5 (tidying the exercise list, CSV export): live since 2026-10-27**, after Nick checked it on the Deploy Preview.
  - Exercise list: usage per exercise, and a sheet to rename, hide or unhide, merge into another of the same type, or delete when unused. Pickers leave hidden exercises out.
  - `/api/training/export`: CSV of your own training, or anyone's and everyone's for Nick.
- **Stage 4 (logging for others, block notes, editing a running block): live since 2026-10-27**, after Nick worked through checklist section 6d on the Deploy Preview.
  - Log for someone else with a banner, and "Entered by" on sets in the workout and in History.
  - Block notes on the dashboard, editable by the person and Nick on running and past blocks.
  - Editing a running block with training logged: phase plan locked, trained workouts can't be removed, past weeks keep their snapshot.
  - Queueing a block for two or more people asks first, listing each person's Block number.
- **Stage 3 (history): live since 2026-10-27**, after Nick worked through checklist section 6c on the Deploy Preview.
  - `/api/training/history` (read-only): every exercise a person has logged, or one exercise across all their blocks with its PB.
  - History list at `/training/history/` (search, Viewing dropdown) and one exercise at `/training/history/exercise/` (Results and Chart tabs, PB marked in both). The chart plots each workout's best set; tapping or hovering a point shows its details.
  - Each exercise on the workout screen has **History ›** (asking first if there are unsaved numbers), and the history page's back link returns to that workout.
  - Dashboard: Viewing dropdown and History button. Past blocks open their grid read-only at `/training/?block=N`.

## Next step

Stages 1 to 5 are live, and stage 6 (pictures, the last planned stage) is on a Deploy Preview. The clickable mockup (made-up data, private to Nick's claude.ai account) is still at https://claude.ai/artifact/FLcAjJovNuxY66kYqfFmBV.
