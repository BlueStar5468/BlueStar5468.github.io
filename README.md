# BlueStar5468.github.io

个人主页
由于作者是个菜鸡 不会写前端三件套
由DeepSeekHarness和我共同开发

**线上：[blog.bluestar5468.com](https://blog.bluestar5468.com/)**

纯静态站点，原生 HTML / CSS / JS，零依赖、零构建，直接托管在 GitHub Pages 上。

---

## 目录

```
├── index.html          页面结构
├── css/style.css       样式（设计变量 → 侧栏 → 舞台 → 模块 → 响应式）
├── js/
│   ├── content.js      内容（你要改的）
│   ├── config.js       开关（你要改的）
│   ├── render.js       渲染器
│   └── main.js         滚动 / 翻页
├── assets/             图片
├── CNAME               自定义域名 —— 不要删
└── .nojekyll           让 Pages 跳过 Jekyll
```

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
