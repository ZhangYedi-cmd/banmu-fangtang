import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MdxBody } from "@/components/mdx-body";
import { formatPublishedDate } from "@/lib/dates";
import { getPublishedPost, getPublishedPosts } from "@/lib/posts";

type PostPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getPublishedPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPublishedPost(slug);
  if (!post) return { title: "页面不存在" };
  return {
    title: post.title,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPublishedPost(slug);
  if (!post) notFound();

  return (
    <article className="flex flex-col gap-4">
      <p>
        <Link href="/blog" className="text-sm text-muted-foreground">
          查看全部文章
        </Link>
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
      <p>{post.author}</p>
      <p>Published on {formatPublishedDate(post.publishedAt)}</p>
      {post.cover ? (
        <Image
          src={post.cover}
          alt=""
          width={1200}
          height={630}
          unoptimized
          className="block h-auto w-full"
        />
      ) : null}
      <MdxBody source={post.content} />
    </article>
  );
}
