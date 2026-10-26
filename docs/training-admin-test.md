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
- [ ] Press **Complete** on a running block. The card shows "No block running".
- [ ] Press **Reopen** on that block. It's running again, and any workout that was in progress before completing is back to in progress.
- [ ] Complete it again, start a new block, and check that **Reopen** is no longer offered for the old one.
- [ ] (Stage 4) Build one block for **two or more people** at once, then use **Start all queued**.

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
- [ ] Log every planned set. The tile turns pink with the date, without pressing Finish.
- [ ] Open the same exercise the following week. "Last" shows this week's numbers.
- [ ] As admin, complete the block while a workout is in progress. That tile shows finished early. **Reopen** puts it back to in progress.
- [ ] As admin, in **Build a block**, search the exercise picker for a new name. "+ Add as a new exercise" adds it to the list and the workout.
- [ ] Someone with logged sets shows no **Remove** button, only Pause.

## 7. Friend access (stage 1)

- [ ] **Pause** the test person. In their window they see "Your access is paused. Ask Nick."
- [ ] Unpause them, and they can log in again.
- [ ] **Remove** a test person who has no logged sets, even one whose block was started. They and their blocks disappear, and their password stops working.
- [ ] (Stage 2 onwards) Check that someone with logged sets shows no Remove button, only Pause.
- [ ] Remove or pause the test person when you've finished testing.
