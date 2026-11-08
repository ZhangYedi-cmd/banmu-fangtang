# 半亩方塘

Yedi Zhang 的个人技术博客。

## 本地

```bash
npm install
npm run dev
```

## 检查

```bash
npm test
npm run lint
npm run build
```

站点地址由 `NEXT_PUBLIC_SITE_URL` 决定。未设置时，在 Vercel 上使用 `VERCEL_URL`，本地默认为 `http://localhost:3000`。

文章放在 `content/posts/*.mdx`，关于页放在 `content/about.mdx`。写作规则见 `CONTENT.md`。
