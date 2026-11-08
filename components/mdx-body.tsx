import { renderMdx } from "@/lib/mdx";

export async function MdxBody({ source }: { source: string }) {
  const Content = await renderMdx(source);
  return (
    <div className="prose dark:prose-invert max-w-none">
      <Content />
    </div>
  );
}
