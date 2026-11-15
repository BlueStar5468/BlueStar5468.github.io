/* =========================================================================
   博客加载器 —— 主页 + 文章页
   -------------------------------------------------------------------------
   两个目录（和项目页一个套路）：
     blog/        正式文章，会推上去
     dev-blog/    本地测试文章，在 .gitignore 里，不会推上去

   文件：
     blog/_index.json   文章清单（id 列表）
     blog/_home.json    主页配置：blocks（右边）+ sidebar（左边介绍卡下面） + title
     blog/<id>.json     一篇文章：meta（标题/日期/标签/摘要） + page.blocks（正文）
   ========================================================================= */

(function () {
  'use strict';

  // 页面在子目录里时（blog/、projects/），数据路径要带 ../ 前缀
  function siteBase() {
    try { return document.documentElement.getAttribute('data-base') || ''; } catch (e) { return ''; }
  }

  var BASE = siteBase() + 'blog/';
  var DEV  = siteBase() + 'dev-blog/';

  var SD  = window.SITE_DATA || {};
  var esc = SD.esc || function (s) { return String(s == null ? '' : s); };
  var getJSON = SD.getJSON || function (url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' · ' + url);
      return r.json();
    });
  };

  /* ================= 阅读时长 ================= */
  function plain(html) {
    return String(html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').trim();
  }

  // 把所有块里的文字抠出来（代码块不算：读代码不算阅读）
  function blocksText(blocks) {
    var parts = [];
    (blocks || []).forEach(function (b) {
      if (!b) return;
      ['html', 'text', 'title', 'subtitle', 'desc', 'caption', 'summary'].forEach(function (k) {
        if (typeof b[k] === 'string' && b[k]) parts.push(plain(b[k]));
      });
      (b.items || []).forEach(function (it) {
        if (typeof it === 'string') parts.push(it);
        else if (it) ['title', 'desc', 'text'].forEach(function (k) {
          if (typeof it[k] === 'string') parts.push(plain(it[k]));
        });
      });
      (b.rows || []).forEach(function (r) {
        if (r && r.length) r.forEach(function (c) { parts.push(String(c)); });
      });
      (b.images || []).forEach(function (g) {
        if (g && g.caption) parts.push(plain(g.caption));
      });
    });
    return parts.join(' ');
  }

  // 中文 300 字/分钟 + 英文 200 词/分钟，最少 1 分钟
  function readingMinutes(blocks) {
    var t = blocksText(blocks);
    var cjk = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
    var words = (t.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9_]+/g) || []).length;
    return Math.max(1, Math.round(cjk / 300 + words / 200));
  }

  /* ================= 读数据 ================= */
  function loadHomeConfig() {
    return getJSON(BASE + '_home.json').catch(function () {
      return getJSON(DEV + '_home.json');
    }).catch(function () {
      return {};
    });
  }

  /* dev-blog/ 只在「本地测试内容开关」开着时读（实验室页面里切） */
  function loadEntryList() {
    function idx(dir) {
      return getJSON(dir + '_index.json').catch(function () { return { posts: [] }; });
    }
    var useDev = !window.SITE_DEV || window.SITE_DEV.on();
    return Promise.all([
      idx(BASE),
      useDev ? idx(DEV) : Promise.resolve({ posts: [] })
    ]).then(function (res) {
      var out = [], seen = {};
      function add(j, dir) {
        ((j && j.posts) || []).forEach(function (id) {
          if (!id || seen[id]) return;
          seen[id] = true;
          out.push({ id: String(id), dir: dir });
        });
      }
      add(res[0], BASE);
      add(res[1], DEV);
      return out;
    });
  }

  // 读所有文章 -> 按日期倒序，并算好阅读时长（meta.minutes）
  function loadPosts(entries) {
    return Promise.all(entries.map(function (e) {
      return getJSON(e.dir + e.id + '.json')
        .then(function (d) {
          var meta = d.meta || {};
          meta.minutes = readingMinutes((d.page && d.page.blocks) || []);
          meta.href = e.dir + e.id + '.html';   // dev-blog 的要指到 dev-blog/
          return { id: e.id, dir: e.dir, meta: meta, data: d };
        })
        .catch(function (err) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('[blog] 读不到 ' + e.dir + e.id + '.json：' + err.message);
          }
          return null;
        });
    })).then(function (list) {
      return list.filter(Boolean).sort(function (a, b) {
        var da = String(a.meta.date || '');
        var db = String(b.meta.date || '');
        if (da === db) return 0;
        return da < db ? 1 : -1;      // 新的在前
      });
    });
  }

  /* ================= 左边介绍卡下面的东西（用组件库生成） ================= */
  function renderSidebar(cfg, posts) {
    var box = document.getElementById('bsideExtra');
    if (!box) return;
    var blocks = (cfg && cfg.sidebar) || [];
    if (!blocks.length) { box.innerHTML = ''; return; }
    box.innerHTML = window.RENDER_BLOCKS(blocks, { posts: posts });
  }

  /* ================= 文章页头部 ================= */
  function postHead(m) {
    var tags = (m.tags || []).map(function (t) {
      return '<span class="chip chip--sm">' + esc(t) + '</span>';
    }).join('');
    var bits = [];
    if (m.date) bits.push('<time class="posthead__date" datetime="' + esc(m.date) + '">' + esc(m.date) + '</time>');
    if (m.minutes) bits.push('<span class="posthead__min">约 ' + esc(m.minutes) + ' 分钟</span>');

    return '<header class="posthead">' +
      '<div class="posthead__top">' + bits.join('<span class="posthead__dot">·</span>') +
        (tags ? '<span class="posthead__tags">' + tags + '</span>' : '') +
      '</div>' +
      '<h1 class="posthead__title">' + esc(m.title || '') + '</h1>' +
      (m.summary ? '<p class="posthead__sum">' + esc(m.summary) + '</p>' : '') +
    '</header>';
  }

  /* ================= 主页 ================= */
  function initHome() {
    var host = document.getElementById('bhome');
    if (!host) return;
    var err = document.getElementById('berr');

    if (window.LOADBAR) window.LOADBAR.start();

    Promise.all([loadHomeConfig(), loadEntryList().then(loadPosts)])
      .then(function (r) {
        var cfg   = r[0] || {};
        var posts = r[1] || [];
        var ctx   = { posts: posts };

        host.innerHTML = window.RENDER_BLOCKS(cfg.blocks || [], ctx);
        renderSidebar(cfg, posts);

        if (err) err.hidden = true;
        if (cfg.title) document.title = cfg.title + ' · BlueStar5468';
        if (window.LOADBAR) window.LOADBAR.done();
      })
      .catch(function (e) {
        if (typeof console !== 'undefined' && console.warn) console.warn('[blog] 主页加载失败：', e);
        host.innerHTML = '<p class="lderr">博客加载失败：' + esc(e.message) +
          '　—— 要用 http 打开（本地：python -m http.server），并且 blog/_home.json 要存在。</p>';
      });
  }

  /* ================= 文章页 ================= */
  /* 文章页：页面里已经有预渲染内容就直接用，没有才回落到 json */
  function initPost() {
    var host = document.getElementById('ppost');
    if (!host) return;

    var hasBody = host.children.length > 0 && !host.querySelector('.pd-load');
    var side = document.getElementById('bsideExtra');

    if (hasBody) {
      // 正文是静态的（SEO 要的就是它），但侧栏「最近文章」还是要 JS 填
      if (typeof console !== 'undefined' && console.info) {
        console.info('[blog] 正文已预渲染，只补侧栏');
      }
      Promise.all([loadHomeConfig(), loadEntryList().then(loadPosts)])
        .then(function (r) { renderSidebar(r[0] || {}, r[1] || []); })
        .catch(function (e) { if (typeof console !== 'undefined' && console.warn) console.warn('[blog] 侧栏加载失败：', e); });
      return;
    }

    // 回落：id 从 ?p= 取，取不到就从 blog/<id>.html 的地址里取
    var want = (/[?&]p=([\w.-]+)/.exec(location.search) || [])[1] || '';
    if (!want) {
      var m = /\/blog\/([\w.-]+)\.html?$/.exec(location.pathname);
      if (m) want = m[1];
    }
    if (!want) {
      host.innerHTML = '<p class="lderr">没法确定要显示哪篇文章' +
        '（地址里既没有 ?p= 也没有 &lt;id&gt;.html）。</p>';
      return;
    }

    Promise.all([loadHomeConfig(), loadEntryList().then(loadPosts)])
      .then(function (r) {
        var cfg   = r[0] || {};
        var posts = r[1] || [];

        var hit = null;
        posts.forEach(function (p) { if (p.id === want) hit = p; });
        if (!hit) throw new Error('找不到文章「' + want + '」');

        var blocks = (hit.data.page && hit.data.page.blocks) || [];

        host.innerHTML = postHead(hit.meta) + window.RENDER_BLOCKS(blocks, { posts: posts });
        renderSidebar(cfg, posts);
        document.title = (hit.meta.title || hit.id) + ' · BlueStar5468';
      })
      .catch(function (e) {
        if (typeof console !== 'undefined' && console.warn) console.warn('[blog] 文章加载失败：', e);
        host.innerHTML = '<p class="lderr">' + esc(e.message) +
          '　—— 检查 blog/_index.json 里有没有这个 id，或者用 http 打开（本地：python -m http.server）。</p>';
      });
  }


  /* ================= 入口 ================= */
  if (document.getElementById('bhome')) initHome();
  if (document.getElementById('ppost')) initPost();
})();
