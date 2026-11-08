import { evaluate } from "@mdx-js/mdx";
import type { ComponentType } from "react";
import * as runtime from "react/jsx-runtime";

export async function renderMdx(source: string): Promise<ComponentType> {
  const evaluated = await evaluate(source, {
    Fragment: runtime.Fragment,
    jsx: runtime.jsx,
    jsxs: runtime.jsxs,
    development: false,
  });
  return evaluated.default;
}
