import type { Metadata } from "next";

import { MdxBody } from "@/components/mdx-body";
import { PageHeading } from "@/components/page-heading";
import { getAboutSource } from "@/lib/posts";

export const metadata: Metadata = {
  title: "关于",
};

export default function AboutPage() {
  return (
    <>
      <PageHeading title="关于" />
      <MdxBody source={getAboutSource()} />
    </>
  );
}
