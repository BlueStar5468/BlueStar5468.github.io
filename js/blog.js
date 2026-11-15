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

  var BASE = 'blog/';
  var DEV  = 'dev-blog/';

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

  function loadEntryList() {
    function idx(dir) {
      return getJSON(dir + '_index.json').catch(function () { return { posts: [] }; });
    }
    return Promise.all([idx(BASE), idx(DEV)]).then(function (res) {
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

    Promise.all([loadHomeConfig(), loadEntryList().then(loadPosts)])
      .then(function (r) {
        var cfg   = r[0] || {};
        var posts = r[1] || [];
        var ctx   = { posts: posts };

        host.innerHTML = window.RENDER_BLOCKS(cfg.blocks || [], ctx);
        renderSidebar(cfg, posts);

        if (err) err.hidden = true;
        if (cfg.title) document.title = cfg.title + ' · BlueStar5468';
      })
      .catch(function (e) {
        if (typeof console !== 'undefined' && console.warn) console.warn('[blog] 主页加载失败：', e);
        host.innerHTML = '<p class="lderr">博客加载失败：' + esc(e.message) +
          '　—— 要用 http 打开（本地：python -m http.server），并且 blog/_home.json 要存在。</p>';
      });
  }

  /* ================= 文章页 ================= */
  function initPost() {
    var host = document.getElementById('ppost');
    if (!host) return;

    var want = (/[?&]p=([\w.-]+)/.exec(location.search) || [])[1] || '';

    Promise.all([loadHomeConfig(), loadEntryList().then(loadPosts)])
      .then(function (r) {
        var cfg   = r[0] || {};
        var posts = r[1] || [];

        var hit = null;
        posts.forEach(function (p) { if (p.id === want) hit = p; });
        if (!hit) throw new Error(want ? ('找不到文章「' + want + '」') : '还没有文章');

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
