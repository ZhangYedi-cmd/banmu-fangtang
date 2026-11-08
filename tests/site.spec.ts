import fs from "node:fs";
import path from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

const root = path.resolve(__dirname, "..");

type FeedItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

type FixturePost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  author: string;
  cover?: string;
  draft: boolean;
};

function formatPublishedDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function rawField(raw: string, field: string): string | undefined {
  const match = new RegExp(`^${field}:\\s*(.+)$`, "m").exec(raw);
  return match?.[1].trim().replace(/^["']|["']$/g, "");
}

function readPosts(): FixturePost[] {
  const dir = path.join(root, "content/posts");
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const author = rawField(raw, "author");
      return {
        slug: file.replace(/\.mdx$/, ""),
        title: rawField(raw, "title") ?? "",
        description: rawField(raw, "description") ?? "",
        publishedAt: rawField(raw, "publishedAt") ?? "",
        author: author && author.length > 0 ? author : "Yedi Zhang",
        cover: rawField(raw, "cover"),
        draft: rawField(raw, "draft") === "true",
      };
    })
    .sort((a, b) => {
      if (a.publishedAt === b.publishedAt) return a.slug.localeCompare(b.slug);
      return a.publishedAt < b.publishedAt ? 1 : -1;
    });
}

function publishedPosts(): FixturePost[] {
  return readPosts().filter((post) => !post.draft);
}

async function listTitles(page: Page): Promise<string[]> {
  return page.locator("main li h2 a").allInnerTexts();
}

async function expectSingleColumnList(list: Locator) {
  const items = list.getByRole("listitem");
  const count = await items.count();
  expect(count).toBeGreaterThan(1);
  const boxes = [];
  for (let index = 0; index < count; index += 1) {
    const box = await items.nth(index).boundingBox();
    expect(box).not.toBeNull();
    boxes.push(box!);
  }
  const xs = boxes.map((box) => box.x);
  expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(2);
  for (let index = 1; index < boxes.length; index += 1) {
    expect(boxes[index].y).toBeGreaterThan(boxes[index - 1].y);
  }
}

async function expectPostCard(page: Page, post: FixturePost) {
  const item = page.locator("main li").filter({ hasText: post.title });
  await expect(item).toBeVisible();
  const title = item.getByRole("link", { name: post.title });
  await expect(title).toHaveAttribute("href", `/blog/${post.slug}`);
  const weight = await title.evaluate((element) => getComputedStyle(element).fontWeight);
  expect(Number(weight)).toBeGreaterThanOrEqual(600);

  const summary = item.getByText(post.description, { exact: true });
  await expect(summary).toBeVisible();
  const summaryStyle = await summary.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      clamp: style.getPropertyValue("-webkit-line-clamp"),
      color: style.color,
    };
  });
  expect(summaryStyle.clamp).toBe("3");
  expectRgbClose(summaryStyle.color, [115, 115, 115]);
  await expect(item).toContainText(formatPublishedDate(post.publishedAt));
  await expect(item.locator("img")).toHaveCount(0);
}

function expectRgbClose(actual: string, expected: [number, number, number]) {
  const match = actual.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  expect(match, actual).not.toBeNull();
  const channels = [Number(match![1]), Number(match![2]), Number(match![3])];
  channels.forEach((channel, index) => {
    expect(Math.abs(channel - expected[index])).toBeLessThanOrEqual(1);
  });
}

async function chooseTheme(page: Page, theme: "light" | "dark") {
  const button = page.getByRole("button", { name: "切换浅色或深色主题" });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await page.evaluate(() =>
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
    if (current === theme) return;
    await button.click();
    await page.waitForFunction(
      (expected) => document.documentElement.classList.contains(expected),
      theme,
    );
  }
}

test.beforeEach(async ({ page }) => {
  page.on("request", (request) => {
    expect(request.url().toLowerCase()).not.toContain("baoyu.io");
  });
});

test("AC-1 home title, divider, and single-column list", async ({ page }) => {
  await page.goto("/");
  const main = page.locator("main");
  const heading = main.getByRole("heading", { level: 1, name: "首页" });
  await expect(heading).toBeVisible();
  const separator = main.getByRole("separator");
  await expect(separator).toBeVisible();
  const list = main.getByRole("list");
  const headingBox = await heading.boundingBox();
  const separatorBox = await separator.boundingBox();
  const listBox = await list.boundingBox();
  expect(headingBox && separatorBox && listBox).toBeTruthy();
  expect(separatorBox!.y).toBeGreaterThan(headingBox!.y);
  expect(listBox!.y).toBeGreaterThan(separatorBox!.y);
  await expectSingleColumnList(list);
  expect(await listTitles(page)).toEqual(publishedPosts().map((post) => post.title));
});

test("AC-2 list cards show a bold title, clamped gray summary, and English date", async ({
  page,
}) => {
  await page.goto("/");
  const posts = publishedPosts();
  expect(posts.length).toBeGreaterThanOrEqual(2);
  for (const post of posts) {
    await expectPostCard(page, post);
  }
  await expect(page.locator("main img")).toHaveCount(0);
});

test("AC-3 blog uses the same published posts, order, and card style", async ({ page }) => {
  await page.goto("/");
  const homeTitles = await listTitles(page);
  const homeSummary = page.locator("main li p").first();
  const homeWeight = await page
    .locator("main li h2 a")
    .first()
    .evaluate((element) => getComputedStyle(element).fontWeight);
  const homeClamp = await homeSummary.evaluate((element) =>
    getComputedStyle(element).getPropertyValue("-webkit-line-clamp"),
  );

  await page.goto("/blog");
  await expect(page.locator("main").getByRole("heading", { level: 1, name: "博客" })).toBeVisible();
  expect(await listTitles(page)).toEqual(homeTitles);
  expect(homeTitles).toEqual(publishedPosts().map((post) => post.title));
  const blogWeight = await page
    .locator("main li h2 a")
    .first()
    .evaluate((element) => getComputedStyle(element).fontWeight);
  const blogClamp = await page
    .locator("main li p")
    .first()
    .evaluate((element) => getComputedStyle(element).getPropertyValue("-webkit-line-clamp"));
  expect(blogWeight).toBe(homeWeight);
  expect(blogClamp).toBe(homeClamp);
  await expect(page.getByRole("link", { name: "翻译" })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("翻译");
});

test("AC-4 and AC-5 article order, cover, and missing cover", async ({ page }) => {
  const posts = publishedPosts();
  const withCover = posts.find((post) => post.cover);
  const withoutCover = posts.find((post) => !post.cover);
  expect(withCover).toBeTruthy();
  expect(withoutCover).toBeTruthy();

  await page.goto(`/blog/${withCover!.slug}`);
  const article = page.locator("article");
  const back = article.getByRole("link", { name: "查看全部文章" });
  await expect(back).toHaveAttribute("href", "/blog");
  const title = article.getByRole("heading", { level: 1 });
  await expect(title).toHaveText(withCover!.title);
  const author = article.getByText(withCover!.author, { exact: true });
  const date = article.getByText(`Published on ${formatPublishedDate(withCover!.publishedAt)}`);
  const image = article.locator("img");
  const body = article.locator(".prose");
  await expect(image).toHaveCount(1);
  await expect(image).toHaveAttribute("src", withCover!.cover!);
  expect(withCover!.cover!).not.toContain("baoyu.io");
  const ys = await Promise.all(
    [back, title, author, date, image, body].map(async (locator) => (await locator.boundingBox())!.y),
  );
  for (let index = 1; index < ys.length; index += 1) {
    expect(ys[index]).toBeGreaterThan(ys[index - 1]);
  }
  const imageBox = await image.boundingBox();
  const articleBox = await article.boundingBox();
  expect(Math.abs(imageBox!.width - articleBox!.width)).toBeLessThan(2);
  const loaded = await image.evaluate(
    (element: HTMLImageElement) => element.complete && element.naturalWidth > 0,
  );
  expect(loaded).toBe(true);
  expect(await body.locator("p").count()).toBeGreaterThan(2);
  expect(await body.locator("h2").count()).toBeGreaterThan(0);
  await expect(body).toHaveClass(/prose/);
  await expect(body).toHaveClass(/prose-invert/);

  await page.goto(`/blog/${withoutCover!.slug}`);
  const plain = page.locator("article");
  await expect(plain.getByRole("heading", { level: 1 })).toHaveText(withoutCover!.title);
  await expect(plain.locator("img")).toHaveCount(0);
  await expect(plain.getByText(`Published on ${formatPublishedDate(withoutCover!.publishedAt)}`)).toBeVisible();
  const html = await page.content();
  expect(html.toLowerCase()).not.toContain("baoyu.io");
});

test("AC-6 navigation, logo, and no sidebar or translation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page).toHaveTitle(/半亩方塘/);
  const logo = page.getByRole("link", { name: "半亩方塘" });
  await expect(logo).toHaveAttribute("href", "/");
  const nav = page.getByRole("navigation", { name: "主导航" });
  await expect(nav.getByRole("link", { name: "首页" })).toHaveAttribute("href", "/");
  await expect(nav.getByRole("link", { name: "博客" })).toHaveAttribute("href", "/blog");
  await expect(nav.getByRole("link", { name: "关于" })).toHaveAttribute("href", "/about");
  const hrefs = await nav.locator("a").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("href")),
  );
  expect(hrefs).toEqual(["/", "/blog", "/about"]);
  await expect(page.locator("aside")).toHaveCount(0);
  await expect(page.getByText("标签")).toHaveCount(0);

  await logo.click();
  await expect(page).toHaveURL("/");

  await page.setViewportSize({ width: 390, height: 800 });
  await page.getByRole("button", { name: "菜单" }).click();
  const mobileNav = page.getByRole("navigation", { name: "窄屏导航" });
  await expect(mobileNav.getByRole("link", { name: "首页" })).toBeVisible();
  await expect(mobileNav.getByRole("link", { name: "博客" })).toBeVisible();
  await expect(mobileNav.getByRole("link", { name: "关于" })).toBeVisible();
  const mobileHrefs = await mobileNav.locator("a").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("href")),
  );
  expect(mobileHrefs).toEqual(["/", "/blog", "/about"]);
});

test("AC-7 about page comes from the in-repo document", async ({ page }) => {
  const raw = fs.readFileSync(path.join(root, "content/about.mdx"), "utf8");
  const sentence = raw
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#") && !line.startsWith("---"));
  expect(sentence).toBeTruthy();
  const response = await page.goto("/about");
  expect(response?.status()).toBe(200);
  await expect(page.locator("main")).toContainText(sentence!);
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("赛博禅心");
});

test("AC-8 theme toggle persists and light background is white", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "切换浅色或深色主题" });
  await button.click();
  const chosen = await page.evaluate(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  expect(chosen === "light" || chosen === "dark").toBe(true);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => (document.documentElement.classList.contains("dark") ? "dark" : "light")),
    )
    .toBe(chosen);

  await chooseTheme(page, "light");
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe("rgb(255, 255, 255)");
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe("rgb(255, 255, 255)");
});

test("AC-9 footer RSS matches published posts and hides drafts", async ({ page }) => {
  const posts = readPosts();
  const published = posts.filter((post) => !post.draft);
  const drafts = posts.filter((post) => post.draft);
  expect(drafts.length).toBeGreaterThan(0);

  await page.goto("/");
  const rss = page.locator("footer").getByRole("link", { name: "RSS" });
  await expect(rss).toHaveAttribute("href", "/feed.xml");
  const alternate = page.locator('link[rel="alternate"][type="application/rss+xml"]');
  await expect(alternate).toHaveAttribute("href", /\/feed\.xml$/);

  for (const post of published) {
    await expect(page.locator("main")).toContainText(post.title);
  }
  for (const draft of drafts) {
    await expect(page.locator("body")).not.toContainText(draft.title);
  }

  await page.goto("/blog");
  for (const draft of drafts) {
    await expect(page.locator("body")).not.toContainText(draft.title);
  }

  for (const draft of drafts) {
    const response = await page.goto(`/blog/${draft.slug}`);
    expect(response?.status()).toBe(404);
    await expect(page.locator("body")).not.toContainText(draft.title);
  }

  const feed = await page.request.get("/feed.xml");
  expect(feed.ok()).toBe(true);
  expect(feed.headers()["content-type"]).toContain("xml");
  const xml = await feed.text();
  const parsed = await page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, "text/xml");
    const parserError = doc.querySelector("parsererror")?.textContent;
    if (parserError) return { error: parserError, items: [] as FeedItem[] };
    const items = Array.from(doc.querySelectorAll("item")).map((item) => ({
      title: item.querySelector("title")?.textContent ?? "",
      link: item.querySelector("link")?.textContent ?? "",
      description: item.querySelector("description")?.textContent ?? "",
      pubDate: item.querySelector("pubDate")?.textContent ?? "",
    }));
    return { error: "", items };
  }, xml);
  expect(parsed.error).toBe("");
  expect(parsed.items.map((item) => item.title)).toEqual(published.map((post) => post.title));
  parsed.items.forEach((item, index) => {
    const post = published[index];
    expect(item.link).toContain(`/blog/${post.slug}`);
    expect(item.description).toBe(post.description);
    const publishedAt = new Date(item.pubDate);
    expect(publishedAt.getUTCFullYear()).toBe(Number(post.publishedAt.slice(0, 4)));
    expect(publishedAt.getUTCMonth() + 1).toBe(Number(post.publishedAt.slice(5, 7)));
    expect(publishedAt.getUTCDate()).toBe(Number(post.publishedAt.slice(8, 10)));
  });
  for (const draft of drafts) {
    expect(xml).not.toContain(draft.title);
  }
});

test("AC-11 light tokens, colors, radius, and font stack", async ({ page }) => {
  await page.goto("/");
  await chooseTheme(page, "light");
  const styles = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const header = document.querySelector("header");
    const button = document.querySelector("header button");
    return {
      background: root.getPropertyValue("--background").trim(),
      foreground: root.getPropertyValue("--foreground").trim(),
      muted: root.getPropertyValue("--muted-foreground").trim(),
      border: root.getPropertyValue("--border").trim(),
      radius: root.getPropertyValue("--radius").trim(),
      bodyColor: body.color,
      font: body.fontFamily,
      borderColor: header ? getComputedStyle(header).borderBottomColor : "",
      buttonRadius: button ? getComputedStyle(button).borderRadius : "",
    };
  });
  expect(styles.background).toBe("0 0% 100%");
  expect(styles.foreground).toBe("0 0% 3.9%");
  expect(styles.muted).toBe("0 0% 45.1%");
  expect(styles.border).toBe("0 0% 89.8%");
  expect(["0.5rem", ".5rem"]).toContain(styles.radius);
  expect(fs.readFileSync(path.join(root, "app/globals.css"), "utf8")).toContain("--radius: 0.5rem");
  expectRgbClose(styles.bodyColor, [10, 10, 10]);
  expectRgbClose(styles.borderColor, [229, 229, 229]);
  expect(styles.buttonRadius).toBe("8px");
  for (const family of [
    "Inter",
    "PingFang SC",
    "Hiragino Sans GB",
    "Noto Sans SC",
    "Microsoft YaHei",
  ]) {
    expect(styles.font).toContain(family);
  }
});

test("AC-12 content guide states the four writing rules", async ({ page }) => {
  const guide = fs.readFileSync(path.join(root, "CONTENT.md"), "utf8");
  for (const rule of ["第一人称", "结论先行", "真实案例", "小标题写成完整判断"]) {
    expect(guide).toContain(rule);
  }
  expect(guide).not.toContain("宝玉");
  expect(guide).not.toContain("赛博禅心");

  await page.goto("/");
  const text = await page.locator("body").innerText();
  expect(text).not.toContain("赛博禅心");
  expect(text).not.toContain("宝玉");
  const footer = await page.locator("footer").innerText();
  expect(footer).not.toContain("赛博禅心");
  expect(footer).not.toContain("宝玉");
});
