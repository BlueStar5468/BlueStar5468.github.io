# BlueStar5468.github.io

个人主页
由于作者是个菜鸡 不会写前端三件套
由DeepSeekHarness和我共同开发

**线上：[blog.bluestar5468.com](https://blog.bluestar5468.com/)**

纯静态站点，原生 HTML / CSS / JS，零依赖、零构建，直接托管在 GitHub Pages 上。

---

## 目录

```
├── index.html          主页（左侧介绍栏 + 右侧滚动翻页）
├── projects.html       项目列表页（卡片由 projects/*.json 生成）
├── project.html        项目详情页（?p=<项目 id>，内容由配置里的 blocks 组合）
├── test.html           调试页（默认在 config.js 里关掉）
├── css/style.css       样式（设计变量 → 导航栏 → 侧栏 → 舞台 → 模块 → 响应式）
├── js/
│   ├── content.js      站点内容 + 导航栏链接 + 项目页文案（你要改的）
│   ├── config.js       开关（你要改的）
│   ├── render.js       渲染器 / 模板
│   ├── main.js         滚动翻页（只有 index.html 用）
│   ├── blocks.js       详情页组件库（hero / text / list / code / gallery …）
│   └── projects.js     读 json、生成卡片、侧边栏、筛选
├── projects/           ⭐ 一个项目一个 json
│   ├── _index.json     项目清单（顺序）
│   ├── starexplorer.json
│   └── …
├── assets/             图片
├── CNAME               自定义域名 —— 不要删
└── .nojekyll           让 Pages 跳过 Jekyll
```

要改内容改 `js/content.js`，要关掉某块改 `js/config.js`；
**加一个项目 = 在 `projects/` 里新建一个 json + 在 `_index.json` 里登记一行。**

> ⚠️ 项目配置是页面运行时用 `fetch` 读的，所以要**用 http 打开**（本地：`python -m http.server`），
> 直接双击 html 文件会读不到项目。

## 本地预览

```powershell
python -m http.server 8080
# 打开 http://localhost:8080
```

## 部署

推到 `main` 分支即可，GitHub Pages 自动构建。

仓库 → **Settings → Pages** → Source 选 `Deploy from a branch`，Branch 选 `main`、目录 `/ (root)`。

---

## 说明

页面里用到的 C / C++ / C# / OpenGL / Linux 等商标与 logo，版权归各自所有者，这里仅作技术方向的示意；
PCB 布线图与板子实物照片是作者自己的项目。
