# BlueStar5468.github.io

个人主页 —— 软件 & 硬件双方向。
线上：**https://blog.bluestar5468.com/**

> ⚠️ **这个仓库的根目录就是部署产物**（GitHub Pages 直接服务根目录）。
> 源码在本地 `astro/`，不推上来。

## 结构

```
<仓库根>
├── index.html / blog.html / projects.html …   ← 构建产物（astro/dist 铺过来的）
├── _astro/  assets/  css/  js/                 ← 产物资源
├── CNAME  robots.txt  sitemap.xml  .nojekyll
└── (本地) astro/  .Archive/                    ← 不推
```

## 怎么改

```powershell
cd astro
.\build.ps1          # 只构建，产物在 astro\dist\
.\build.ps1 -Dev     # 开发服务器（改代码自动刷新）
.\deploy.ps1         # 构建 + 把 dist 铺到仓库根
.\deploy.ps1 -Publish  # 上面三步 + 提交 + 推送
```

内容（文章 / 项目）是 `astro/content/` 下的 JSON，格式没变，写作工具 `studio.html` 仍然可用。

## 说明

- 页面用 [Astro](https://astro.build) 生成，静态输出，零运行时框架
- 样式在 `astro/src/styles/style.css`，设计令牌集中在顶部 `:root`
- 写作工具 `/studio.html`、调试页 `/test.html` 带 `noindex`，不进 sitemap