/* =========================================================================
   博客加载器 —— 主页 + 文章页
   -------------------------------------------------------------------------
   两个目录（和项目页一个套路）：
     blog/        正式文章，会推上去
     dev-blog/    本地测试文章，在 .gitignore 里，不会推上去

   文件：
     blog/_index.json   文章清单（id 列表）
     blog/_home.json    主页配置（blocks 数组，组件同项目页）
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

  /* ---------- 读清单（正式 + 本地，正式优先） ---------- */
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

  /* ---------- 读所有文章，按日期倒序（新的在前） ---------- */
  function loadPosts(entries) {
    return Promise.all(entries.map(function (e) {
      return getJSON(e.dir + e.id + '.json')
        .then(function (d) { return { id: e.id, dir: e.dir, meta: d.meta || {}, data: d }; })
        .catch(function (err) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('[blog] 读不到 ' + e.dir + e.id + '.json：' + err.message);
          }
          return null;
        });
    })).then(function (list) {
      return list.filter(Boolean).sort(function (a, b) {
        var da = String((a.meta && a.meta.date) || '');
        var db = String((b.meta && b.meta.date) || '');
        if (da === db) return 0;
        return da < db ? 1 : -1;
      });
    });
  }

  /* ---------- 文章页的头部（用 meta 生成，不用写在 blocks 里） ---------- */
  function postHead(m) {
    var tags = (m.tags || []).map(function (t) {
      return '<span class="chip chip--sm">' + esc(t) + '</span>';
    }).join('');
    return '<header class="posthead">' +
      '<div class="posthead__top">' +
        (m.date ? '<time class="posthead__date" datetime="' + esc(m.date) + '">' + esc(m.date) + '</time>' : '') +
        (tags ? '<span class="posthead__tags">' + tags + '</span>' : '') +
      '</div>' +
      '<h1 class="posthead__title">' + esc(m.title || '') + '</h1>' +
      (m.summary ? '<p class="posthead__sum">' + esc(m.summary) + '</p>' : '') +
    '</header>';
  }

  /* ---------- 主页 ---------- */
  function initHome() {
    var host = document.getElementById('bhome');
    if (!host) return;
    var err = document.getElementById('berr');

    var home = getJSON(BASE + '_home.json').catch(function () {
      return getJSON(DEV + '_home.json');
    });

    Promise.all([home, loadEntryList().then(loadPosts)])
      .then(function (r) {
        var cfg = r[0] || {};
        var posts = r[1] || [];

        host.innerHTML = window.RENDER_BLOCKS(cfg.blocks || [], { posts: posts });
        if (err) err.hidden = true;
        if (cfg.title) document.title = cfg.title + ' · BlueStar5468';
      })
      .catch(function (e) {
        if (typeof console !== 'undefined' && console.warn) console.warn('[blog] 主页加载失败：', e);
        host.innerHTML = '<p class="lderr">博客加载失败：' + esc(e.message) +
          '　—— 要用 http 打开（本地：python -m http.server），' +
          '并且 blog/_home.json 要存在。</p>';
      });
  }

  /* ---------- 文章页 ---------- */
  function initPost() {
    var host = document.getElementById('ppost');
    if (!host) return;

    var want = (/[?&]p=([\w.-]+)/.exec(location.search) || [])[1] || '';

    loadEntryList().then(function (entries) {
      var hit = null;
      entries.forEach(function (e) { if (e.id === want) hit = e; });
      if (!hit) throw new Error(want ? ('找不到文章「' + want + '」') : '还没有文章');

      return getJSON(hit.dir + hit.id + '.json').then(function (d) {
        var meta   = d.meta || {};
        var blocks = (d.page && d.page.blocks) || [];

        host.innerHTML = postHead(meta) + window.RENDER_BLOCKS(blocks, {});
        document.title = (meta.title || hit.id) + ' · BlueStar5468';
      });
    }).catch(function (e) {
      if (typeof console !== 'undefined' && console.warn) console.warn('[blog] 文章加载失败：', e);
      host.innerHTML = '<p class="lderr">' + esc(e.message) +
        '　—— 检查 blog/_index.json 里有没有这个 id，' +
        '或者用 http 打开（本地：python -m http.server）。</p>';
    });
  }

  /* ---------- 入口 ---------- */
  if (document.getElementById('bhome')) initHome();
  if (document.getElementById('ppost')) initPost();
})();
