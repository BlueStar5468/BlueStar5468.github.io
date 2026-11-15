# BlueStar5468.github.io

个人主页 —— 软件 & 硬件双方向。

**线上：[blog.bluestar5468.com](https://blog.bluestar5468.com/)**

纯静态站点，原生 HTML / CSS / JS，**零依赖、零构建**，直接托管在 GitHub Pages 上。

---

## 有哪些页面

| 页面 | 说明 |
| --- | --- |
| `index.html` | **主页**：左侧介绍栏 + 右侧四页滚动叙事（软件 / 硬件 / 经历），滚一屏渐变到下一页 |
| `projects.html` | **项目列表**：卡片网格 + 分类筛选 + 左侧项目导航 |
| `project.html?p=<id>` | **项目详情**：由 `projects/<id>.json` 里的 `page.blocks` 拼出来 |
| `blog.html` | **博客主页**：左侧个人介绍 + 最近文章，右侧由 `blog/_home.json` 的 blocks 组成 |
| `blog-post.html?p=<id>` | **文章页**：头部用 `meta` 生成，正文用 `page.blocks` |
| `studio.html` | **写作工具**（自用）：用组件拼文章，实时预览，导出 json |
| `test.html` | 调试页：风格自检（导航里默认隐藏，按住 `Ctrl + Alt` 右上角可临时调出） |

## 目录

```
├── index.html          主页
├── projects.html       项目列表
├── project.html        项目详情（?p=<id>）
├── blog.html           博客主页
├── blog-post.html      文章页（?p=<id>）
├── studio.html         写作工具
├── test.html           调试页（默认隐藏）

├── css/style.css       全部样式（设计变量 → 导航栏 → 侧栏 → 各页面 → 响应式）

├── js/
│   ├── content.js      站点文字 + 导航栏链接          ← 你主要改这个
│   ├── config.js       所有开关（50 个）              ← 你主要改这个
│   ├── render.js       渲染器 / 模板 / 快捷键
│   ├── main.js         主页的滚动翻页
│   ├── blocks.js       组件库（16 种「积木」）
│   ├── projects.js     项目页：读 json、卡片、侧边栏、筛选
│   ├── blog.js         博客页：读清单、排序、阅读时长
│   └── studio.js       写作工具

├── projects/           ⭐ 项目：一个项目一个 json
│   ├── _index.json     清单（顺序）
│   └── _template.json  新项目从这里复制
├── blog/               ⭐ 博客：一篇文章一个 json
│   ├── _index.json     文章清单（按日期倒序显示）
│   ├── _home.json      博客主页的配置（blocks + sidebar）
│   └── _template.json  新文章从这里复制

├── assets/             图片
├── CNAME               自定义域名 —— 不要删
└── .nojekyll           让 Pages 跳过 Jekyll
```

## 怎么改内容

**文字、技能、经历、联系方式** → `js/content.js`
**某一块显示不显示** → `js/config.js`（把 `true` 改成 `false` 就行，元素会直接移除）
**加一个项目** → 复制 `projects/_template.json` 成 `projects/<id>.json`，再在 `projects/_index.json` 的 `projects` 里写上这个 id
**加一篇文章** → 复制 `blog/_template.json` 成 `blog/<id>.json`，再在 `blog/_index.json` 的 `posts` 里写上这个 id
**改导航栏** → `js/content.js` 的 `site.nav`

### 组件库

详情页和博客都共用 `js/blocks.js` 里的 15 种组件，在 json 的 `blocks` 数组里按顺序组合：

```
hero   顶部大标题 + 封面 + 信息行 + 按钮
text   一段富文本（html 字段可以直接写 HTML）
list   要点列表（✓ / • / 1.）
cards  小卡片网格          stats     一排数字
specs  参数表              code      代码块（可带文件名）
image  单张图              gallery   图集
timeline  时间线           quote     引用
video  嵌入视频            divider   分隔线
links  按钮组              posts     文章列表（博客专用）
postref 引用另一篇文章（博客专用）
```

### 设计风格

Win11 / Fluent 扁平化 —— 白底 + 极淡描边、几乎不用投影、小圆角（卡片 10px / 控件 6px）。
主色蓝 + 白；软件板块蓝青、硬件板块琥珀橙，滚动切换时整站强调色一起过渡。
所有颜色 / 圆角 / 投影都集中在 `css/style.css` 顶部的 `:root` 变量里。

## 本地预览

⚠️ 项目页和博客页是**用 `fetch` 读 json** 的，必须用 http 打开（双击 html 会读不到）：

```powershell
python -m http.server 8080
# 然后打开 http://127.0.0.1:8080/
```

## 部署

推到 `main` 分支即可，GitHub Pages 自动构建。

仓库 → **Settings → Pages** → Source 选 `Deploy from a branch`，Branch 选 `main`、目录 `/ (root)`。

> 站点所有资源都是相对路径，放子路径也不会 404。

---

## 说明

页面里用到的 C / C++ / C# / OpenGL / Linux 等商标与 logo，版权归各自所有者，这里仅作技术方向的示意；
PCB 布线图与板子实物照片是作者自己的项目。
