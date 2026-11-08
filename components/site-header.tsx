import Link from "next/link";

import { MobileNav } from "@/components/mobile-nav";
import { SiteMark } from "@/components/site-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { navItems } from "@/lib/navigation";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-base font-semibold text-foreground"
          >
            <SiteMark />
            {siteConfig.name}
          </Link>
          <nav aria-label="主导航" className="hidden items-center gap-5 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <MobileNav items={navItems} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
