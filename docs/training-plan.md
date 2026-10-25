# Training record — planning snapshot

Last updated 2026-10-18. Nothing has been built yet. This is where planning stopped, plus the questions still to answer.

## To do (Nick)

- [x] **Rename the GitHub repo** from `recipe-filter` to `raven-click` (done 2026-10-25).
- [x] **Update the git remote** to https://github.com/raven1300/raven-click.git (done 2026-10-25).
- [ ] **Check Netlify still points at the renamed repo** (Site configuration → Build & deploy → Repository). Reconnect the *existing* site. Don't create a new one.
- [ ] Optional: rename the local folder `C:\code\recipe-filter` to match.
- The **domain stays raven.click**. Nothing to change there.
- [ ] Answer the questions at the bottom of this file.

## Site structure

- **raven.click**: a neutral landing page with two buttons, Recipes and Training, and a generic raven.click header.
- **/recipes**: stays exactly as it is.
- **/training**: its own layout, header, components folder, Netlify functions and Blobs store. No links to or from the recipe section.
- **Repo rename** (recipe-filter → something like raven-click): update the git remote afterwards. Reconnect the *existing* Netlify site to the renamed repo. Don't make a new site, because the stored data lives with the site.

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

**Friends**
- Everyone uses one shared password or PIN. No separate logins.
- Pick your name from a dropdown. The phone remembers it, so you only choose once.
- Each person has their own logs and history. Anyone can see anyone's data, which is fine because there are no privacy concerns.
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
11. Who adds people to the name dropdown: only you (a simple "manage people" screen), or anyone can add themselves?
12. Showing the schedule only for you is easy. Should friends be able to switch it on later, or never?

### History
13. What matters most to see: a list of past sessions, one exercise's progress over time (for example a chart of bench press weight), personal bests, or all of these?

### Access
14. Is one PIN for everyone fine, including for editing programs? Or should program and people setup need a separate admin PIN that only you know?
