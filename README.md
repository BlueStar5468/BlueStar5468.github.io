# BlueStar5468.github.io

> 注意：本人并不会写前端三件套 这个网页由AI制作 代码不具有参考价值

个人主页 —— 软件 & 硬件双方向。

**线上：[blog.bluestar5468.com](https://blog.bluestar5468.com/)**

纯静态站点，原生 HTML / CSS / JS，**零依赖、零构建**，直接托管在 GitHub Pages 上。

---

## 有哪些页面

| 页面 | 说明 |
| --- | --- |
| `index.html` | **主页**：左侧介绍栏 + 右侧四页滚动叙事（软件 / 硬件 / 经历），滚一屏渐变到下一页 |
| `projects.html` | **项目列表**：卡片网格 + 分类筛选 + 左侧项目导航 |
| `projects/<id>.html` | **项目详情**（静态，构建时生成） |
| `blog.html` | **博客主页**：左侧个人介绍 + 最近文章，右侧由 `blog/_home.json` 的 blocks 组成 |
| `blog/<id>.html` | **文章页**（静态，构建时生成） |

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

## 说明

页面里用到的 C / C++ / C# / OpenGL / Linux 等商标与 logo，版权归各自所有者，这里仅作技术方向的示意；
PCB 布线图与板子实物照片是作者自己的项目。
