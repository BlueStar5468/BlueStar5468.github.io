/* =========================================================================
   tools/build.js —— 把 blog/*.json 编译成纯静态的 blog/<id>.html
   -------------------------------------------------------------------------
   为什么：站点现在是「HTML 空壳 + JS fetch json 渲染」，爬虫（尤其百度）
   和社交预览都拿不到正文。这个脚本把渲染结果直接写进 HTML。

   用法：
     node tools/build.js            # 编译 blog/ 下所有文章
     node tools/build.js TestBlog   # 只编译某一篇（调试用）

   复用的是同一套东西：js/content.js（导航/介绍栏）+ js/render.js（模板）
   + js/blocks.js（组件渲染），所以生成出来的 HTML 和现在浏览器里看到的
   一模一样，不存在"两套模板要同步"。
   ========================================================================= */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SITE = 'https://blog.bluestar5468.com';

/* ---------- 1. 在 Node 里跑浏览器脚本（塞个假 window / document） ---------- */
const win = { location: { pathname: '/', search: '' }, localStorage: { getItem: () => null, setItem: () => {} } };
const doc = {
  title: '',
  body: { getAttribute: a => (a === 'data-section' ? 'blog' : null) },
  documentElement: { classList: { toggle() {}, contains: () => false, add() {}, remove() {} } },
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: () => ({
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {}, appendChild() {}, addEventListener() {}, style: {}
  })
};
const noop = { info() {}, warn() {} };

function runScript(file) {
  new Function('window', 'document', 'console', 'Date', read(file))(win, doc, noop, Date);
}

runScript('js/config.js');
runScript('js/content.js');
runScript('js/render.js');   // 提供 SITE_TEMPLATES / PROJ_ICON
runScript('js/blocks.js');   // 提供 RENDER_BLOCKS

const C = win.SITE_CONTENT;
const T = win.SITE_TEMPLATES;
const R = win.RENDER_BLOCKS;

if (!C || !T || !R) {
  console.error('✗ 加载站点脚本失败（content.js / render.js / blocks.js）');
  process.exit(1);
}

/* ---------- 2. 小工具 ---------- */
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);

function plain(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').trim();
}

/* 阅读时长：和 js/blog.js 里同一套规则（中文 300 字/分 + 英文 200 词/分） */
function readingMinutes(blocks) {
  const parts = [];
  (blocks || []).forEach(b => {
    if (!b) return;
    ['html', 'text', 'title', 'subtitle', 'desc', 'caption', 'summary'].forEach(k => {
      if (typeof b[k] === 'string' && b[k]) parts.push(plain(b[k]));
    });
    (b.items || []).forEach(it => {
      if (typeof it === 'string') parts.push(it);
      else if (it) ['title', 'desc', 'text'].forEach(k => { if (typeof it[k] === 'string') parts.push(plain(it[k])); });
    });
    (b.rows || []).forEach(r => { if (r && r.length) r.forEach(c => parts.push(String(c))); });
    (b.images || []).forEach(g => { if (g && g.caption) parts.push(plain(g.caption)); });
  });
  const t = parts.join(' ');
  const cjk = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = (t.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9_]+/g) || []).length;
  return Math.max(1, Math.round(cjk / 300 + words / 200));
}

/* ---------- 3. 读文章 ---------- */
const idx = JSON.parse(read('blog/_index.json'));
const posts = (idx.posts || []).map(id => {
  const d = JSON.parse(read('blog/' + id + '.json'));
  const meta = d.meta || {};
  return { id: id, meta: meta, blocks: (d.page && d.page.blocks) || [] };
}).sort((a, b) => {
  const da = String(a.meta.date || ''), db = String(b.meta.date || '');
  if (da === db) return 0;
  return da < db ? 1 : -1;
});

/* ---------- 4. 头部区块（复用模板，和运行时一模一样） ---------- */
function navHtml() {
  return (C.site && C.site.nav || []).map(item => T.navlink(item)).join('');
}

function introHtml() {
  const s = C.side || {};
  const avatar = s.avatarImg
    ? '<img class="avatar__img" src="../' + esc(s.avatarImg) + '" alt="头像" />'
    : esc(s.avatar || '');
  const meta = (s.meta || []).map(m => T.meta(m)).join('');
  const links = (s.links || []).map(l => T.link(l)).join('');
  return '' +
    '<div class="card bside__card">' +
      '<div class="bside__head">' +
        '<div class="avatar avatar--flat">' +
          '<span class="avatar__letter">' + avatar + '</span>' +
        '</div>' +
        '<div class="bside__id">' +
          '<h1 class="bside__name">' + esc(s.name || '') + '</h1>' +
          '<p class="bside__title" data-fill="side.title">' + esc(s.title || '') + '</p>' +
        '</div>' +
      '</div>' +
      '<p class="bside__bio">' + (s.bio || '') + '</p>' +
      '<ul class="bside__meta">' + meta + '</ul>' +
      '<nav class="bside__links">' + links + '</nav>' +
    '</div>';
}

/* 侧栏「最近文章」：直接用 posts 组件渲染，保证样式一致 */
function recentHtml(all, selfId) {
  const others = all.filter(p => p.id !== selfId).slice(0, 3);
  if (!others.length) return '';
  return R([{ type: 'posts', title: '最近文章', limit: 3, count: false }], { posts: others });
}

/* ---------- 5. 文章正文 ---------- */
function postHead(meta, minutes) {
  const tags = (meta.tags || []).map(t => '<span class="chip chip--sm">' + esc(t) + '</span>').join('');
  const bits = [];
  if (meta.date) bits.push('<time class="posthead__date" datetime="' + esc(meta.date) + '">' + esc(meta.date) + '</time>');
  bits.push('<span class="posthead__min">约 ' + minutes + ' 分钟</span>');
  return '<header class="posthead">' +
    '<div class="posthead__top">' + bits.join('<span class="posthead__dot">·</span>') +
      (tags ? '<span class="posthead__tags">' + tags + '</span>' : '') +
    '</div>' +
    '<h1 class="posthead__title">' + esc(meta.title || '') + '</h1>' +
    (meta.summary ? '<p class="posthead__sum">' + esc(meta.summary) + '</p>' : '') +
  '</header>';
}

/* 组件生成的链接是 blog/<id>.html（相对站点根）；
   静态文章页本身就在 blog/ 里，要去掉这个前缀 */
function fixLinks(html) {
  return String(html).replace(/href="blog\/([\w.-]+)\.html"/g, 'href="$1.html"');
}

/* 导航链接是 index.html / projects.html 这种（相对站点根），
   而静态页在 blog/ 里，得补上 ../ */
function fixNav(html) {
  return String(html).replace(
    /href="(?!\.\.\/)(index|projects|blog|test|studio)\.html/g,
    'href="../$1.html"'
  );
}

/* ---------- 6. 拼一页 ---------- */
function buildPage(post, all) {
  const m = post.meta;
  const title = m.title || post.id;
  const desc = m.summary || '';
  const minutes = readingMinutes(post.blocks);
  const url = SITE + '/blog/' + post.id + '.html';
  const cover = m.cover || (C.side && C.side.avatarImg) || '';
  const coverAbs = cover ? SITE + '/' + cover.replace(/^\/+/, '') : '';

  const body = fixLinks(postHead(m, minutes) + R(post.blocks, { posts: all }));
  const recent = fixLinks(recentHtml(all, post.id));

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: desc,
    datePublished: m.date || '',
    dateModified: m.date || '',
    author: { '@type': 'Person', name: (C.side && C.side.name) || 'BlueStar5468' },
    publisher: { '@type': 'Organization', name: (C.site && C.site.title) || 'BlueStar5468' },
    mainEntityOfPage: url,
    url: url,
    ...(coverAbs ? { image: coverAbs } : {}),
    ...(m.tags && m.tags.length ? { keywords: m.tags.join(', ') } : {})
  };

  return `<!DOCTYPE html>
<html lang="zh-CN" data-accent="blue">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} · ${esc((C.site && C.site.title) || 'BlueStar5468')}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${esc(url)}" />

<meta property="og:type" content="article" />
<meta property="og:site_name" content="${esc((C.site && C.site.title) || 'BlueStar5468')}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${esc(url)}" />
${coverAbs ? `<meta property="og:image" content="${esc(coverAbs)}" />` : ''}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
${m.date ? `<meta property="article:published_time" content="${esc(m.date)}" />` : ''}

<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='16' fill='%232563eb'/%3E%3Ctext y='72' x='50' text-anchor='middle' font-size='58' fill='white' font-family='sans-serif'%3EB%3C/text%3E%3C/svg%3E" />
<link rel="stylesheet" href="../css/style.css" />

<script type="application/ld+json">${JSON.stringify(jsonld, null, 2)}</script>
</head>
<body data-section="blog">

<header class="topbar">
  <div class="topbar__inner">
    <a class="topbar__brand" href="../index.html">
      <span class="topbar__logo" aria-hidden="true">B</span>
      <span>${esc((C.side && C.side.name) || 'BlueStar')}</span>
      <small>BSuniStudio</small>
    </a>
    <nav class="topbar__nav" aria-label="站点导航">${fixNav(navHtml())}</nav>
  </div>
</header>

<div class="bg" aria-hidden="true">
  <span class="bg__blob bg__blob--blue"></span>
  <span class="bg__blob bg__blob--cyan"></span>
  <span class="bg__blob bg__blob--amber"></span>
  <span class="bg__grid"></span>
</div>

<div class="blog-shell">
  <aside class="bside" aria-label="个人介绍">
    ${introHtml()}
    <div class="bside__extra">${recent}</div>
  </aside>

  <main class="bmain bmain--post">
    <a class="postback" href="../blog.html">← 回到博客</a>
    <article class="ppost">${body}</article>
  </main>
</div>

</body>
</html>
`;
}

/* ---------- 7. 预渲染 blog.html（让列表页的文章链接也存在于 HTML 里） ----------
   用注释标记包住生成内容，这样可以反复跑：
     <!-- build:bhome --> ...生成的内容... <!-- /build:bhome -->
   第一次跑时找不到标记，就先替换掉原来的「正在加载」占位。 */
function patchBlogHome(all) {
  const file = path.join(ROOT, 'blog.html');
  let html = read('blog.html');

  const cfg = JSON.parse(read('blog/_home.json'));
  const home = R(cfg.blocks || [], { posts: all });
  const side = R(cfg.sidebar || [], { posts: all });

  function put(src, key, inner) {
    const re = new RegExp('<!-- build:' + key + ' -->[\\s\\S]*?<!-- /build:' + key + ' -->');
    const block = '<!-- build:' + key + ' -->\n' + inner + '\n      <!-- /build:' + key + ' -->';
    if (re.test(src)) return src.replace(re, block);
    return null;
  }

  // bhome：有标记就替换，没标记就把「正在加载」换成带标记的内容
  let out = put(html, 'bhome', home);
  if (out === null) {
    const re = /<p class="pd-load">[\s\S]*?<\/p>/;
    if (!re.test(html)) {
      console.warn('  ! blog.html 里既没有 build:bhome 标记，也没有 pd-load 占位，跳过');
      return;
    }
    out = html.replace(re, '<!-- build:bhome -->\n' + home + '\n      <!-- /build:bhome -->');
    html = out;
  } else {
    html = out;
  }

  // 侧栏
  out = put(html, 'bside', side);
  if (out !== null) {
    html = out;
  } else {
    html = html.replace(
      /<div class="bside__extra" id="bsideExtra">[\s\S]*?<\/div>/,
      '<div class="bside__extra" id="bsideExtra"><!-- build:bside -->\n' + side + '\n      <!-- /build:bside --></div>'
    );
  }

  fs.writeFileSync(file, html, 'utf8');
  console.log('  ✓ blog.html（列表预渲染：文章链接已写进 HTML）');
}

/* ---------- 8. sitemap.xml / robots.txt ---------- */
function writeSitemap(all) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];
  const add = (p, lastmod, priority) => urls.push({ loc: SITE + p, lastmod: lastmod || today, priority: priority });

  add('/', today, '1.0');
  add('/projects.html', today, '0.8');
  add('/blog.html', today, '0.9');
  (all || []).forEach(p => add('/blog/' + p.id + '.html', p.meta.date, '0.8'));

  // 项目详情页还是动态的（project.html?p=<id>），先照样列进来；
  // 以后如果也预渲染成 projects/<id>.html，这里换成静态地址即可
  try {
    const pIdx = JSON.parse(read('projects/_index.json'));
    (pIdx.projects || []).forEach(id => add('/project.html?p=' + id, today, '0.6'));
  } catch (e) { /* 没有 projects/ 就算了 */ }

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u =>
      '  <url><loc>' + u.loc + '</loc><lastmod>' + u.lastmod + '</lastmod>' +
      '<priority>' + u.priority + '</priority></url>'
    ).join('\n') +
    '\n</urlset>\n';

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
  console.log('  ✓ sitemap.xml（' + urls.length + ' 个地址）');
}

function writeRobots() {
  const txt = 'User-agent: *\nAllow: /\n\nSitemap: ' + SITE + '/sitemap.xml\n';
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), txt, 'utf8');
  console.log('  ✓ robots.txt（指向 sitemap）');
}

/* ---------- 9. 输出 ---------- */
const only = process.argv[2];
let n = 0;
posts.forEach(post => {
  if (only && post.id !== only) return;
  const out = path.join(ROOT, 'blog', post.id + '.html');
  fs.writeFileSync(out, buildPage(post, posts), 'utf8');
  const kb = (fs.statSync(out).size / 1024).toFixed(1);
  console.log(`  ✓ blog/${post.id}.html  (${kb} KB, ${readingMinutes(post.blocks)} 分钟)`);
  n++;
});

if (!only) {
  patchBlogHome(posts);
  writeSitemap(posts);
  writeRobots();
}

console.log(`\n  共生成 ${n} 篇。正文已在 HTML 里；blog-post.html 保留为加载器参考实现（noindex）。`);
