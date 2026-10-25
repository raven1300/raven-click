# Training record — planning snapshot

Last updated 2026-10-25. Training itself isn't built yet; access is decided. This is where planning stopped, plus the questions still to answer.

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

**Program (per person)**
- A program runs about 12 weeks and has 4 lifting days (Day A–D, or named).
- Each day has a list of exercises.

**Weekly schedule (Nick only)**
- Drag the 4 days onto Mon–Sun for the current week. Must work by touch on a phone.
- Tap a scheduled day to see its exercises. Tap an exercise to log it.

**Logging an exercise**
- Shows sets and reps, and records what was done plus notes. Exact details to come (see the questions below).

**History**
- Viewed on the site: past sessions and how each exercise has progressed.
- An "Export to CSV" button acts as a backup that opens in Google Sheets or Excel.

**Access (decided 2026-10-25)**
- The whole of `/training` is behind a PIN. A Netlify Edge Function checks for a valid login before any training page loads. Recipes and the landing page stay public.
- **No accounts.** No sign-up, emails or password resets.
- **Personal PINs:** each friend has their own PIN, and Nick sets them up on a "manage people" screen. The PIN identifies the person, so there's no name dropdown.
- **Admin PIN:** Nick has an admin PIN that also unlocks admin-only features: the weekly schedule, managing people, editing programs and switching friend access on or off. The server refuses these actions for anyone who isn't admin, as well as hiding them.
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
- Friends don't need the schedule. They open the site, record their numbers, and see them next time.

**Storage**
- Netlify Blobs: one training store holding everyone's data, kept per person.
- Google Sheets was considered and turned down, because seeing the data on the site is enough.

## Questions to answer

### Exercise screen
1. Do you set **targets** in the program (for example 4 sets × 8 reps @ 60kg), or just log what you actually did?
2. Do you log **each set separately** (set 1: 10 × 60kg, set 2: 8 × 62.5kg), or one entry per exercise?
3. Where do **notes** go: per set, per exercise, per session, or a mix?
4. Any extras? For example rest timer, RPE / how hard it felt, **last time's numbers shown next to today's**, or a "done" tick per exercise.
5. Weight in **kg** only, or does it need lbs too? Any bodyweight or timed exercises (planks, pull-ups, cardio) that don't fit "reps × weight"?

### Program and schedule
6. What happens at the end of a 12-week program: start a fresh one and keep the old history?
7. If a scheduled day gets missed, should it roll over, or just stay unticked?
8. Do you ever do the same day twice in a week, or skip one?

### Friends
9. Do friends have **their own 4-day programs** (set up like yours), or do they just **pick or type an exercise** and log it freeform?
10. Could a friend follow **your program** (same days and exercises) while logging their own numbers?
11. ~~Who adds people?~~ **Answered:** only Nick, on the "manage people" screen, which also sets each person's PIN.
12. Showing the schedule only for you is easy. Should friends be able to switch it on later, or never?

### History
13. What matters most to see: a list of past sessions, one exercise's progress over time (for example a chart of bench press weight), personal bests, or all of these?

### Access
14. ~~One PIN or an admin PIN?~~ **Answered:** personal PINs plus an admin PIN. See "Access" above.
