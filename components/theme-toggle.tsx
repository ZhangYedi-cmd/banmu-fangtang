"use client";

import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  function toggle() {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <Button type="button" variant="outline" aria-label="切换浅色或深色主题" onClick={toggle}>
      {resolvedTheme === "dark" ? "浅色" : "深色"}
    </Button>
  );
}
