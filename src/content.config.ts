// Import the glob loader
import { glob } from "astro/loaders";
// Import utilities from `astro:content`
import { z, defineCollection } from "astro:content";
// Define a `loader` and `schema` for each collection
const recipes = defineCollection({
    loader: glob({ pattern: '**/[^_]*.md', base: "./src/content/recipes" }),
    schema: z.object({
      title: z.string(),
      pubDate: z.date(),
      description: z.string(),
      author: z.string(),
      image: z.object({
        url: z.string(),
        alt: z.string()
      }),
      tags: z.array(z.string()),
      shortName: z.string(),
      ingredients: z.array(z.string()),
      source: z.string().optional(),
      video: z.string().optional(),
    })
});
// Export a single `collections` object to register your collection(s)
export const collections = { recipes };