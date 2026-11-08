import { buildFeed } from "@/lib/rss";

export function GET() {
  return new Response(buildFeed(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
