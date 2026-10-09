// RSS 2.0 feed for the blog — consumed by the standard-site projection worker
// and by any feed reader. Includes both native and imported (Substack) posts.
import { getCollection } from 'astro:content';

export async function GET() {
  const posts = (await getCollection('blog')).sort((a, b) => b.data.date.localeCompare(a.data.date));
  const site = 'https://p31ca.org';
  const slugOf = (id: string) => id.replace(/\.md$/, '');
  const items = posts.map((p) => ({
    title: p.data.title,
    link: `${site}/blog/${slugOf(p.id)}`,
    description: p.data.excerpt ?? '',
    pubDate: new Date(`${p.data.date}T00:00:00Z`).toUTCString(),
    guid: `${site}/blog/${slugOf(p.id)}`,
  }));

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>P31 Labs — Blog</title>
    <link>${site}/blog</link>
    <description>Thoughts on sovereign infrastructure, neurodivergent technology, and open science.</description>
    <atom:link href="${site}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items.map((p) => `
    <item>
      <title>${p.title}</title>
      <link>${p.link}</link>
      <description>${p.description}</description>
      <pubDate>${p.pubDate}</pubDate>
      <guid isPermaLink="false">${p.guid}</guid>
    </item>`).join('')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  });
}