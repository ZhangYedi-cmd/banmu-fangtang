import Link from "next/link";

import { formatPublishedDate } from "@/lib/dates";
import type { Post } from "@/lib/posts";

export function PostList({ posts }: { posts: Post[] }) {
  return (
    <ul className="flex flex-col gap-10">
      {posts.map((post) => (
        <li key={post.slug}>
          <article>
            <h2 className="text-xl font-bold leading-snug">
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            <p className="mt-2 line-clamp-3 text-muted-foreground">{post.description}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              <time dateTime={post.publishedAt}>{formatPublishedDate(post.publishedAt)}</time>
            </p>
          </article>
        </li>
      ))}
    </ul>
  );
}
