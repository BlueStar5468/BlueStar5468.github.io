/* =========================================================================
   项目加载器 —— 列表页 + 详情页 + 侧边栏（三个都在这一个文件里）
   -------------------------------------------------------------------------
   两个目录：
     projects/        正式项目，会推上去（你自己写的）
     dev-projects/    本地测试项目，在 .gitignore 里，不会推上去
                      ↑ 本地预览时会一起显示，线上只有 projects/ 里的

   每个项目一个 json，分两段：
     card           列表页卡片（标题 / 封面 / 标签 / 链接…）
     page.blocks    详情页的组件数组（组件见 js/blocks.js）
   ========================================================================= */

(function () {
  'use strict';

  // 页面在子目录里时（blog/、projects/），数据路径要带 ../ 前缀
  function siteBase() {
    try { return document.documentElement.getAttribute('data-base') || ''; } catch (e) { return ''; }
  }

  var BASE     = siteBase() + 'projects/';       // 推上去的
  var DEV_BASE = siteBase() + 'dev-projects/';   // 只在本地
  var STORE    = 'pnav-collapsed';

  /* ---------- 小工具 ---------- */
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; });
  }

  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' · ' + url);
      return r.json();
    });
  }

  /* 两个清单都读，正式项目排前面；同一个 id 以 projects/ 里的为准
     dev-projects/ 只在「本地测试内容开关」开着时读（实验室页面里切） */
  function loadIndexes() {
    function idx(dir) {
      return getJSON(dir + '_index.json').catch(function () { return { projects: [] }; });
    }
    var useDev = !window.SITE_DEV || window.SITE_DEV.on();
    return Promise.all([
      idx(BASE),
      useDev ? idx(DEV_BASE) : Promise.resolve({ projects: [] })
    ]).then(function (res) {
      var out = [], seen = {};
      function add(j, dir) {
        ((j && j.projects) || []).forEach(function (id) {
          if (!id || seen[id]) return;
          seen[id] = true;
          out.push({ id: String(id), dir: dir });
        });
      }
      add(res[0], BASE);
      add(res[1], DEV_BASE);
      return out;
    });
  }

  function loadProjects(entries) {
    return Promise.all(entries.map(function (e) {
      return getJSON(e.dir + e.id + '.json')
        .then(function (p) { return { id: e.id, dir: e.dir, data: p }; })
        .catch(function (err) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('[projects] 读不到 ' + e.dir + e.id + '.json：' + err.message);
          }
          return null;
        });
    })).then(function (list) { return list.filter(Boolean); });
  }

  /* ---------- 侧边栏（两个页面共用）----------
     sidebarHtml() 是纯函数（只吐字符串），这样 tools/build.js 能在 Node 里直接复用它，
     保证静态页的侧栏和运行时一模一样 */
  function sidebarHtml(list, currentId, toc, dir) {
    var base = dir || 'projects';
    var html = '<button class="pnav__toggle" id="pnavToggle" type="button" ' +
                 'aria-label="收起 / 展开项目导航" aria-controls="pnavItems">' +
                 '<span class="pnav__bars" aria-hidden="true"></span>' +
               '</button>' +
               '<nav class="pnav__items" id="pnavItems" aria-label="项目导航">';

    list.forEach(function (p) {
      var c  = p.data.card || {};
      var on = p.id === currentId;
      var icon = window.PROJ_ICON
        ? window.PROJ_ICON(c.icon || '📦', 'pnav__img')
        : esc(c.icon || '📦');
      html += '<div class="pnav__group">' +
        '<a class="pnav__item' + (on ? ' is-active' : '') + '" href="' + PU(base + '/' + esc(p.id) + '.html') + '"' +
          (on ? ' aria-current="page"' : '') + ' title="' + esc(c.title || p.id) + '">' +
          '<span class="pnav__ico" aria-hidden="true">' + icon + '</span>' +
          '<span class="pnav__label">' + esc(c.title || p.id) + '</span>' +
        '</a>';
      if (on && toc && toc.length) {
        html += '<div class="pnav__toc">' + toc.map(function (t) {
          return '<a class="pnav__toc-item" href="#' + esc(t.id) + '">' + esc(t.title) + '</a>';
        }).join('') + '</div>';
      }
      html += '</div>';
    });

    html += '</nav>';
    return html;
  }
  var PU = window.PAGE_URL || function (u) { return u; };
  window.PROJ_SIDEBAR_HTML = sidebarHtml;   // 给 tools/build.js 用

  /* 只绑侧栏的收起 / 展开（侧栏已经预渲染好时用） */
  function bindPnav(box) {
    if (!box) return;

    /* 收起 / 展开（状态存 localStorage，刷新后记得） */
    var root = document.documentElement;
    var btn  = box.querySelector('#pnavToggle');

    function setCollapsed(v) {
      root.classList.toggle('pnav-collapsed', v);
      if (btn) btn.setAttribute('aria-expanded', v ? 'false' : 'true');
      try { window.localStorage.setItem(STORE, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
    }

    var saved = '0';
    try { saved = window.localStorage.getItem(STORE) || '0'; } catch (e) { /* 忽略 */ }
    setCollapsed(saved === '1');

    if (btn) {
      btn.addEventListener('click', function () {
        setCollapsed(!root.classList.contains('pnav-collapsed'));
      });
    }
  }
  window.PROJ_BIND_PNAV = bindPnav;

  function buildSidebar(box, list, currentId, toc) {
    if (!box) return;
    box.innerHTML = sidebarHtml(list, currentId, toc);
    bindPnav(box);
  }

  /* ---------- 滚动时高亮当前章节 ---------- */
  function spyToc() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.pnav__toc-item'));
    if (!links.length) return;

    var targets = links.map(function (a) {
      return document.getElementById(a.getAttribute('href').slice(1));
    });

    function update() {
      var mark = window.innerHeight * 0.3;
      var best = -1;
      targets.forEach(function (el, i) {
        if (el && el.getBoundingClientRect().top <= mark) best = i;
      });
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === best); });
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- 列表页：分类筛选 ---------- */
  function initFilter() {
    var grid  = document.querySelector('.pgrid');
    if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.pcard'));
    var btns  = Array.prototype.slice.call(document.querySelectorAll('.filter'));
    var empty = document.getElementById('pempty');
    var count = document.getElementById('pcount');

    var tally = { all: cards.length };
    cards.forEach(function (c) {
      var k = c.getAttribute('data-cat') || 'all';
      tally[k] = (tally[k] || 0) + 1;
    });

    btns.forEach(function (b) {
      var k = b.getAttribute('data-filter') || 'all';
      var n = b.querySelector('.filter__n');
      if (n) n.textContent = tally[k] || 0;
      b.addEventListener('click', function () { apply(k); });
    });

    function apply(key) {
      var k = key || 'all';
      var shown = 0;
      cards.forEach(function (c) {
        var hit = k === 'all' || c.getAttribute('data-cat') === k;
        c.classList.toggle('is-off', !hit);
        if (hit) shown++;
      });
      btns.forEach(function (b) {
        var on = (b.getAttribute('data-filter') || 'all') === k;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      if (empty) empty.hidden = shown > 0 && empty.getAttribute('data-empty-hint') !== '1';
      if (count) count.textContent = '共 ' + shown + ' 个项目';
      try {
        var url = k === 'all' ? location.pathname : location.pathname + '?cat=' + encodeURIComponent(k);
        history.replaceState(null, '', url);
      } catch (e) { /* file:// 下会报错，忽略 */ }
    }

    var m = /[?&]cat=([\w-]+)/.exec(location.search);
    var start = m ? m[1] : 'all';
    if (start !== 'all' && !tally[start]) start = 'all';
    apply(start);
  }

  /* ---------- 列表页 ---------- */
  /* 项目主页：结构由 projects/_home.json 的 blocks 决定（和博客主页一个套路） */
  function initHome() {
    var host = document.getElementById('phome');
    var err  = document.getElementById('perr');
    if (!host) return;

    if (window.LOADBAR) window.LOADBAR.start();

    Promise.all([
      getJSON(BASE + '_home.json').catch(function () { return { blocks: [] }; }),
      loadIndexes().then(loadProjects)
    ]).then(function (r) {
      var cfg  = r[0] || {};
      var list = r[1] || [];

      host.innerHTML = window.RENDER_BLOCKS(cfg.blocks || [], { projects: list });
      document.title = (cfg.title || '项目') + ' · BlueStar5468';

      buildSidebar(document.getElementById('pnav'), list, null, null);
      initFilter();
      spyToc();

      if (err) err.hidden = true;
      if (window.LOADBAR) window.LOADBAR.done();
      if (window.SITE_BOOTED) window.SITE_BOOTED();
    }).catch(function (e) {
      if (typeof console !== 'undefined' && console.warn) console.warn('[projects] 主页加载失败：', e);
      host.innerHTML = '<p class="lderr">项目列表加载失败：' + esc(e.message) +
        '\u3000—— 要用 http 打开（本地：python -m http.server）。</p>';
      if (window.SITE_BOOTED) window.SITE_BOOTED();
    });
  }

  /* ---------- 详情页 ---------- */
  /* 详情页：页面里已经有预渲染内容就直接用，没有才回落到 json */
  /* 详情页：正文静态时只补侧栏；没有正文才回落到 json */
  function initDetail() {
    var host = document.getElementById('pdetail');
    if (!host) return;

    var hasBody = host.children.length > 0 && !host.querySelector('.pd-load');

    var want = (/[?&]p=([\w.-]+)/.exec(location.search) || [])[1] || '';
    if (!want) {
      var m = /\/(?:dev-)?projects\/([\w.-]+)\.html?$/.exec(location.pathname);
      if (m) want = m[1];
    }

    if (hasBody) {
      // 正文已经是静态的；侧栏（项目列表 + 章节 TOC）由 JS 建
      if (typeof console !== 'undefined' && console.info) {
        console.info('[projects] 正文已预渲染，只补侧栏');
      }
      loadIndexes().then(loadProjects).then(function (list) {
        var cur = null;
        list.forEach(function (p) { if (p.id === want) cur = p; });
        buildSidebar(document.getElementById('pnav'), list, cur ? cur.id : null,
                     cur ? window.BLOCK_TOC(cur.blocks) : []);
        spyToc();
        if (window.SITE_BOOTED) window.SITE_BOOTED();
      }).catch(function (e) {
        if (typeof console !== 'undefined' && console.warn) console.warn('[projects] 侧栏加载失败：', e);
      });
      return;
    }

    loadIndexes().then(function (entries) {
      if (!entries.length) throw new Error('还没有项目');
      var target = want;
      var found = entries.some(function (e) { return e.id === target; });
      if (!found) target = entries[0].id;

      return loadProjects(entries).then(function (list) {
        var cur = null;
        list.forEach(function (p) { if (p.id === target) cur = p; });
        if (!cur) cur = list[0];
        if (!cur) throw new Error('读不到项目 ' + target);

        var page   = cur.data.page || {};
        var blocks = page.blocks || [];
        var title  = (cur.data.card && cur.data.card.title) || cur.id;

        host.innerHTML = window.RENDER_BLOCKS(blocks);
        document.title = title + ' · BlueStar5468';

        buildSidebar(document.getElementById('pnav'), list, cur.id, window.BLOCK_TOC(blocks));
        spyToc();
        if (window.SITE_BOOTED) window.SITE_BOOTED();
      });
    }).catch(function (e) {
      if (typeof console !== 'undefined' && console.warn) console.warn('[projects] 详情加载失败：', e);
      host.innerHTML = '<p class="lderr">' + esc(e.message) +
        '　—— 要用 http 打开（本地：python -m http.server），并且 projects/_index.json 里至少登记了一个项目。</p>';
    });
  }


  /* ---------- 入口 ---------- */
  if (document.getElementById('phome')) initHome();
  if (document.getElementById('pdetail')) initDetail();
})();
