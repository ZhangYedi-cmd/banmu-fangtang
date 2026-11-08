import type { Metadata } from "next";

import { PageHeading } from "@/components/page-heading";
import { PostList } from "@/components/post-list";
import { getPublishedPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "博客",
};

export default function BlogPage() {
  return (
    <>
      <PageHeading title="博客" />
      <PostList posts={getPublishedPosts()} />
    </>
  );
}
