import { toRfc822 } from "@/lib/dates";
import { getPublishedPosts } from "@/lib/posts";
import { getSiteUrl, siteConfig } from "@/lib/site";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildFeed(): string {
  const siteUrl = getSiteUrl();
  const items = getPublishedPosts()
    .map((post) => {
      const link = `${siteUrl}/blog/${post.slug}`;
      return `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(link)}</link><guid>${escapeXml(link)}</guid><pubDate>${toRfc822(post.publishedAt)}</pubDate><description>${escapeXml(post.description)}</description></item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(siteConfig.name)}</title><link>${escapeXml(siteUrl)}</link><description>${escapeXml(siteConfig.description)}</description>${items}</channel></rss>`;
}
