# Training admin: test checklist

A step-by-step check of the admin side of `/training`, to run on the live site after each build stage. Tick items off as you go. Each section notes which build stage adds it, so skip sections for stages that aren't built yet.

**Before you start**

- Log in with your **admin password**.
- Use a throwaway **test person** (for example "Test Alex") rather than a real friend, so real blocks and history stay clean. Remove or pause them when you're done.
- Have a second browser or a private window ready, to log in as the test person.

## 1. Logging in (stage 1)

- [ ] In a private window, open `/training`. It asks for a password and shows no training pages.
- [ ] A wrong password is refused. After several wrong tries, there's a short lockout.
- [ ] Your admin password logs you in, and you see the Admin panel at the bottom of your dashboard.
- [ ] Close and reopen the browser. You're still logged in.

## 2. Exercise list (stage 1)

- [ ] Open **Admin → Exercise list**. Your starting exercises are all there with the right types.
- [ ] Type a near-duplicate of an existing name (for example "Back Squats"). It warns "Did you mean Back Squat?"
- [ ] Add a new exercise (for example "Goblet Squat", Weight). It appears in the list.
- [ ] Search finds it.

## 3. People and passwords (stage 1)

- [ ] Open **Admin → People and blocks** and press **+ Add person**.
- [ ] Try a password someone else already has. It's refused with "Someone already has that password".
- [ ] Add the test person with a new password. They appear with no block.
- [ ] **Rename** the test person. Then try renaming them to an existing person's name, which is refused.
- [ ] **Reset password** for the test person. The old password stops working and the new one works.
- [ ] Log in as the test person in the private window. They see "No block running".

## 4. Building a block (stage 1)

- [ ] Press **+ Build a block**. It starts as a copy of your current block. Check the **Start from** menu, including **Blank block**.
- [ ] **Phase plan:** remove a phase (the week total drops), clear a rep target to make it "no target", then press **Use Standard** to reset.
- [ ] **Workouts:** change a workout's icon, add an exercise, change its sets with − / +, and move it with ↑ ↓.
- [ ] Press **+ Add workout** and try to save without naming it. It's refused with a clear message.
- [ ] Remove the extra workout. Tick the **test person** under "Who gets this block" and check the Block number shown. Save.

## 5. Queued blocks (stage 1, and copying to several people in stage 4)

- [ ] On People, the test person shows a **queued** block.
- [ ] **Edit** it, change something and save. The change is kept.
- [ ] **Delete** it. It disappears. Build it again, and the Block number is the same as before.
- [ ] Press **Start**. It starts today.
- [ ] Queue another block for the test person and press **Start**. It warns that the running block will be completed first. Confirm.
- [ ] Start a block and, before logging anything, press **Edit** on the running block. The builder says "Edit running block". Change the sets and save: the change is kept and it is still running from the same date.
- [ ] Press **Delete** on that untouched running block and confirm. It disappears, and the next block built for that person reuses its number.
- [ ] Start a block again and log one set in it. **Edit** and **Delete** disappear from the running block on People.
- [ ] Press **Complete** with a block queued: the message names the queued block and says it stays queued. Cancel, delete the queued block, and press **Complete** again: the message no longer mentions a queued block.
- [ ] Press **Complete** on a running block. The card shows "No block running".
- [ ] Press **Reopen** on that block. It's running again, and any workout that was in progress before completing is back to in progress.
- [ ] Complete it again, start a new block, and check that **Reopen** is no longer offered for the old one.
- [ ] (Stage 4) Build one block for **two or more people** at once. It asks first, listing each person's Block number. Then use **Start all queued**.

## 6. Checking from the test person's side (stage 2 onwards)

- [ ] Log in as the test person. The dashboard shows the new block with the right workouts, icons and phase plan (one row per week).
- [ ] Open a workout and log a set. The tile turns in-progress green.
- [ ] After a block is completed, it appears under **Past blocks**, and any workout that was in progress shows **finished early**.
- [ ] Build a block with a different phase plan (for example 2 phases of 3 weeks with no targets), start it, and check that the grid has 6 rows.

## 6b. Logging a workout (stage 2)

Run these as the test person, on a phone, against a running block.

- [ ] On a Deploy Preview, the page shows the "Preview data" note. On the live site, it doesn't.
- [ ] Tap a tile. The workout opens with the right week, phase and rep target, and empty set boxes. "Last" shows earlier numbers, or "First time doing this one".
- [ ] Type a set's numbers, then tap into the next set's boxes. The first set turns pink and says "Saved", and the keyboard stays up.
- [ ] Type a set without ticking, then tick a later set. Both save ("Also saved…").
- [ ] Untick a set. Its numbers stay with "Removed. Tap ✓ to save it again". Moving to another set, ticking a later set, or leaving doesn't save it again, and leaving doesn't ask about it. Re-ticking it saves it.
- [ ] Tick with a box empty. It asks for the missing number.
- [ ] Try timed (seconds) and band (band + reps) exercises. Leaving the band empty saves "No band".
- [ ] Add a note, change the "Trained on" date, and reload. Both are kept.
- [ ] **+ Add exercise** adds an extra with 1 set. **+ Set** and **− Set** work, and the extra doesn't change the tile's count.
- [ ] Press the back link with newly typed numbers. It lists the sets and asks "Save them, then leave", "Discard them and leave" or "Stay".
- [ ] **Finish workout** with sets missing: the tile shows "finished early" with the count and date. **Undo finish** reverses it.
- [ ] **Clear this workout** on a workout with sets, a note and an extra. The confirmation counts them, and afterwards the workout and its tile are back to not started.
- [ ] Log every planned set. The tile turns pink with the date, without pressing Finish.
- [ ] Open the same exercise the following week. "Last" shows this week's numbers.

## 6c. History and viewing others (stage 3)

You need a test person with sets logged in at least two workouts, ideally across two blocks.

- [ ] On the dashboard, press **History**. Every exercise you've logged is listed A–Z with its last numbers. Search narrows the list.
- [ ] Open an exercise. **Results** lists each workout newest first, with the date, block, week, workout and any note. The PB row is highlighted, and the PB is at the top.
- [ ] Check the PB rules: weight is the heaviest weight (more reps wins a tie), timed is the longest hold, bodyweight is the most reps, and for bands "No band" beats any band.
- [ ] **Chart** shows one point per workout once there are two. Tapping a point shows its numbers and date above the chart.
- [ ] On a workout, **History ›** under an exercise opens its history, and **‹ Back to workout** returns. With unsaved numbers typed, it asks first.
- [ ] Tick a new set, then open History. It's there straight away.
- [ ] Use the **Viewing** dropdown to pick the test person. Their block grid shows, without the Admin panel. Their workouts open read-only with "This is …'s workout".
- [ ] In History, switch **Viewing** to the test person and open one of their exercises.
- [ ] Under **Past blocks**, open a completed block. Its grid shows, marked read-only, with a link back to the current block. Its workouts open read-only.
- [ ] As admin, complete the block while a workout is in progress. That tile shows finished early. **Reopen** puts it back to in progress.
- [ ] As admin, in **Build a block**, search the exercise picker for a new name. "+ Add as a new exercise" adds it to the list and the workout.
- [ ] Someone with logged sets shows no **Remove** button, only Pause.

## 6d. Logging for others, notes and editing a running block (stage 4)

You need two test people (say Sam and Jess) with running blocks.

- [ ] As Jess, open Sam's block under **Viewing**. His workouts are read-only. Press **Log for Sam**: a "Logging for Sam" banner appears on every page.
- [ ] Log a set in one of Sam's workouts. It shows "Entered by Jess". Sets Sam entered himself can't be unticked by Jess, and **Clear this workout** isn't offered to her.
- [ ] As Sam, open that exercise's History. The row has a marker and the line under it says which sets Jess entered.
- [ ] As Sam, untick and re-tick Jess's set. The "Entered by" note goes.
- [ ] As Jess, press **Switch back**. The banner goes and you're back on your own block. Close and reopen the tab while logging for someone: it has switched back.
- [ ] As Sam, add **Block notes** on the dashboard ("You and Nick can both edit these"). Jess sees them but can't edit. You (admin) can edit them on Sam's block. Notes can also be edited on a past block.
- [ ] As admin, press **Edit** on Sam's running block (which has training). The builder says training is logged, the phase plan is shown but locked, and the trained workout says "Has training logged, so it stays".
- [ ] Add a set to an exercise and save. Weeks Sam has already trained keep their old counts and colours, and the change shows in workouts he hasn't started.
- [ ] **Delete** isn't offered on a running block with training, only **Edit** and **Complete**.

## 7. Friend access (stage 1)

- [ ] **Pause** the test person. In their window they see "Your access is paused. Ask Nick."
- [ ] Unpause them, and they can log in again.
- [ ] **Remove** a test person who has no logged sets, even one whose block was started. They and their blocks disappear, and their password stops working.
- [ ] (Stage 2 onwards) Check that someone with logged sets shows no Remove button, only Pause.
- [ ] Remove or pause the test person when you've finished testing.
