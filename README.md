# Raven Recipes

A personal recipe browser and meal planning tool built with Astro. Browse recipes, filter by tags, build a weekly list, and generate a categorised shopping list.

## Features

- **Recipe browser**: grid of recipe cards with thumbnail images, tag badges, and Add to List button
- **Tag filtering**: filter by ingredient, cuisine, cook method, or dish type using AND logic (sidebar with emoji tags)
- **Search**: filter recipes by title via the search modal
- **My List**: save up to 6 recipes; view full recipes with ingredients and method side by side
- **Shopping list**: automatically generated from your list, grouped into categories (vegetables, meats, dairy, etc.) and copied to clipboard
- **Individual recipe pages**: each recipe has its own page at `/recipes/<slug>/` with ingredients and method
- **Dark mode**: dark mode default with OS preference detection; toggle in the header
- **Mobile responsive**: drawer-based filter and list panels for small screens
- **RSS feed**: available at `/rss.xml`

## Recipe Files

Recipes live in `src/blog/` as markdown files with YAML frontmatter. Files prefixed with `_` are drafts and won't appear in the browser until the underscore is removed.

### Frontmatter fields

```yaml
---
title: Recipe Title
pubDate: 2026-01-01
description: "Short description"
author: Raven
image:
    url: "/images/my-photo.jpg"
    alt: "Alt text"
tags: ["chicken", "slow cooker", "Asian"]
shortName: Short Title        # used in shopping list
ingredients:
  - 500g chicken thighs
  - 2 garlic cloves, minced
source: "https://example.com/original-recipe"   # optional
video: "https://youtube.com/watch?v=..."         # optional
---
```

### Adding recipes

1. Create a new `.md` file in `src/blog/`
2. Use `_filename.md` prefix to keep it as a draft
3. Remove the `_` prefix to publish it
4. Add a photo to `public/images/` (recommended: 800×600px, 4:3 ratio, JPEG or PNG/WebP)

## Tags

Tags are defined in `src/data/tagConfig.js` with emoji mappings. Tag names must match exactly (case-sensitive) between the recipe frontmatter and tagConfig.

## Shopping List Categories

Category keywords are defined in `src/data/categories.js`. Ingredients are matched by substring against keyword lists and grouped into: vegetables, meats, dairy, pasta & grains, tins, herbs & spices, sauces & oils, frozen, sweeteners, other.

## Running locally

```sh
npm install       # first time only
npm run dev       # dev server at localhost:4321
npm run build     # production build
npm run preview   # preview production build
```

## Tech stack

- [Astro](https://astro.build) — static site generator
- [Preact](https://preactjs.com) — interactive recipe browser component
- TypeScript — strict config, JSX via Preact
- CSS custom properties for theming (light/dark mode)
- Google Fonts — Crimson Pro (headings), Lato (body), Space Grotesk (card titles)
