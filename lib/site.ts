export const siteConfig = {
  name: "半亩方塘",
  description: "Yedi Zhang 的个人技术博客，记录工程实践里的判断。",
  author: {
    name: "Yedi Zhang",
  },
};

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}
