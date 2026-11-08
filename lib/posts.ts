import fs from "node:fs";
import path from "node:path";
import { cache } from "react";

import matter from "gray-matter";

import { siteConfig } from "@/lib/site";

export type Post = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  author: string;
  cover?: string;
  draft: boolean;
  content: string;
};

const postsDirectory = path.join(process.cwd(), "content/posts");

function readPublishedAt(value: unknown, fileName: string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return readRequiredString(value, "publishedAt", fileName);
}

function readRequiredString(value: unknown, field: string, fileName: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fileName} is missing ${field}`);
  }
  return value.trim();
}

export function coverSrc(cover: unknown): string | undefined {
  if (typeof cover !== "string") return undefined;
  const value = cover.trim();
  if (!value || /baoyu\.io/i.test(value)) return undefined;
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function readPost(fileName: string): Post {
  const slug = fileName.replace(/\.mdx$/, "");
  const raw = fs.readFileSync(path.join(postsDirectory, fileName), "utf8");
  const { data, content } = matter(raw);
  const publishedAt = readPublishedAt(data.publishedAt, fileName);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) {
    throw new Error(`${fileName} publishedAt must be YYYY-MM-DD`);
  }

  const author =
    typeof data.author === "string" && data.author.trim()
      ? data.author.trim()
      : siteConfig.author.name;

  return {
    slug,
    title: readRequiredString(data.title, "title", fileName),
    description: readRequiredString(data.description, "description", fileName),
    publishedAt,
    author,
    cover: coverSrc(data.cover),
    draft: data.draft === true,
    content,
  };
}

export const getAllPosts = cache(function getAllPosts(): Post[] {
  return fs
    .readdirSync(postsDirectory)
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map(readPost)
    .sort((a, b) => {
      if (a.publishedAt === b.publishedAt) return a.slug.localeCompare(b.slug);
      return a.publishedAt < b.publishedAt ? 1 : -1;
    });
});

export const getPublishedPosts = cache(function getPublishedPosts(): Post[] {
  return getAllPosts().filter((post) => !post.draft);
});

export function getPublishedPost(slug: string): Post | undefined {
  return getPublishedPosts().find((post) => post.slug === slug);
}

export function getAboutSource(): string {
  const raw = fs.readFileSync(path.join(process.cwd(), "content/about.mdx"), "utf8");
  return matter(raw).content;
}
