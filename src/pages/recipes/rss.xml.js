import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection("recipes");
  return rss({
    title: 'Raven dot Click',
    description: 'My journey learning stuff',
    site: context.site,
    // items: await pagesGlobToRssItems(import.meta.glob('./**/*.md')),
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/recipes/${post.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}