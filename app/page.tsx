import type { Metadata } from "next";

import { PageHeading } from "@/components/page-heading";
import { PostList } from "@/components/post-list";
import { getPublishedPosts } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: `首页 · ${siteConfig.name}`,
  },
};

export default function HomePage() {
  return (
    <>
      <PageHeading title="首页" />
      <PostList posts={getPublishedPosts()} />
    </>
  );
}
