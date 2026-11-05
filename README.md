# raven.click

A personal website built with Astro, Preact and Netlify. It has two parts:

- **Recipes** (`/recipes/`): a public recipe browser with a meal list, a shopping list and an AI batch-cooking plan.
- **Training** (`/training/`): a private gym log for a small group of friends, with training blocks, set logging, history and an optional weekly schedule.

The landing page and the site header are built from one list of features in `src/data/site/nav.js`, so adding a section means adding one entry there.

## Recipes

- **Recipe browser:** a grid of recipe cards with photos, tags and an Add to List button.
- **Tag filtering:** filter by ingredient, cuisine, cook method or dish type. Several tags combine with AND.
- **Search:** filter recipes by title.
- **My List:** save up to 6 recipes and view them with ingredients and method side by side.
- **Shopping list:** generated from your list, grouped into categories (vegetables, meats, dairy and so on) and copied to the clipboard.
- **Cooking plan:** sends the recipes on your list to Claude, which writes a timed plan for cooking them in one session. It runs as a Netlify Background Function and the page polls for the result.
- **Recipe pages:** each recipe has its own page at `/recipes/<slug>/`.
- **Light and dark mode**, a mobile layout with drawer panels, and an RSS feed at `/recipes/rss.xml`.

### Recipe files

Recipes live in `src/content/recipes/` as Markdown files with YAML frontmatter. Files whose names start with `_` are drafts and don't appear until the underscore is removed.

```yaml
---
title: Recipe Title
pubDate: 2026-01-01
description: "Short description"
author: Raven
image:
    url: "/recipes/images/my-photo.jpg"
    alt: "Alt text"
tags: ["chicken", "slow cooker", "Asian"]
shortName: Short Title        # used in the shopping list
ingredients:
  - 500g chicken thighs
  - 2 garlic cloves, minced
source: "https://example.com/original-recipe"   # optional
video: "https://youtube.com/watch?v=..."         # optional
---
```

To add a recipe:

1. Create a `.md` file in `src/content/recipes/`, starting its name with `_` while it's a draft.
2. Add a photo to `public/recipes/images/` (800×600, 4:3, JPEG, PNG or WebP).
3. Remove the `_` to publish it.

Tags and their emoji are defined in `src/data/recipes/tagConfig.js`, and tag names must match the frontmatter exactly. Shopping-list categories are keyword lists in `src/data/recipes/categories.js`.

## Training

A gym log for a handful of people. Everyone logs in with their own password, and one admin sets up people, exercises and blocks.

- **Blocks:** a block is a few weeks of workouts split into phases with rep targets. The dashboard shows the running block as a grid of weeks and workouts, coloured by progress.
- **Logging a workout:** weight, bodyweight, timed and band exercises, each with its own boxes. A set saves when you tick it or move on to the next set. Each exercise shows what you did last time, and a weight exercise can be marked **Go up next time**, which shows as a reminder on the next session.
- **Extras and notes:** add an extra exercise for one day, and a note per exercise.
- **Logging for someone else:** log a friend's workout, with their sets marked as entered by you.
- **History:** every exercise has a results table, a progress chart and personal bests. Logged sets can be downloaded as a CSV.
- **Weekly schedule:** an optional planner, switched on per person by the admin. It lays the week's workouts out on days, by tap or by drag and drop.
- **Admin:** add people and reset passwords, build and queue blocks, and manage the exercise list, including pictures and videos.

### How it works

- **Pages** are Astro pages with Preact components (`src/pages/training/`, `src/components/training/`). An edge function (`netlify/edge-functions/training-guard.js`) keeps them behind the login.
- **The API** is a set of Netlify Functions under `/api/training/*` (`netlify/functions/training-*.js`), with shared code in `netlify/lib/training/`. Every function checks who is logged in and what they're allowed to change.
- **Data** is stored in Netlify Blobs. The live site uses the `training` store. Deploy Previews and local testing use `training-preview`, so testing never touches real data.
- **Login** uses a signed cookie. Passwords are stored as salted hashes.

The plan and design decisions are in `docs/training-plan.md`, and a test checklist for each change is in `docs/training-admin-test.md`.

## Running locally

```sh
npm install         # first time only
npm run dev         # Astro dev server at localhost:4321 (recipes only, no functions)
npx netlify dev     # the whole site, including functions, Blobs and the edge function
npm run build       # production build
```

The functions read these environment variables. Set them in Netlify, or in `.env` / `.env.development` locally (both are git-ignored):

| Variable | Used for |
| --- | --- |
| `TRAINING_ADMIN_PASSWORD` | The admin's training login |
| `TRAINING_SESSION_SECRET` | Signing the training login cookie |
| `ANTHROPIC_API_KEY` | The recipes cooking plan |
| `COOKING_PLAN_ENABLED` | Set to `true` to turn the cooking plan on |

## Tech stack

- [Astro](https://astro.build) for pages and the build
- [Preact](https://preactjs.com) for interactive components
- [Netlify](https://www.netlify.com) for hosting, Functions, Edge Functions and Blobs
- The [Claude API](https://docs.claude.com) for the cooking plan
- [Lucide](https://lucide.dev) icons
- Fonts from Google Fonts: Crimson Pro, Lato and Space Grotesk for recipes, Orbitron and Exo 2 for training
