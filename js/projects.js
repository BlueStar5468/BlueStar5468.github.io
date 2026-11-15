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

  var BASE     = 'projects/';       // 推上去的
  var DEV_BASE = 'dev-projects/';   // 只在本地
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

  /* 两个清单都读，正式项目排前面；同一个 id 以 projects/ 里的为准 */
  function loadIndexes() {
    function idx(dir) {
      return getJSON(dir + '_index.json').catch(function () { return { projects: [] }; });
    }
    return Promise.all([idx(BASE), idx(DEV_BASE)]).then(function (res) {
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

  /* ---------- 侧边栏（两个页面共用）---------- */
  function buildSidebar(box, list, currentId, toc) {
    if (!box) return;

    var html = '<button class="pnav__toggle" id="pnavToggle" type="button" ' +
                 'aria-label="收起 / 展开项目导航" aria-controls="pnavItems">' +
                 '<span class="pnav__bars" aria-hidden="true"></span>' +
               '</button>' +
               '<nav class="pnav__items" id="pnavItems" aria-label="项目导航">';

    list.forEach(function (p) {
      var c  = p.data.card || {};
      var on = p.id === currentId;
      html += '<div class="pnav__group">' +
        '<a class="pnav__item' + (on ? ' is-active' : '') + '" href="project.html?p=' + esc(p.id) + '"' +
          (on ? ' aria-current="page"' : '') + ' title="' + esc(c.title || p.id) + '">' +
          '<span class="pnav__ico" aria-hidden="true">' + esc(c.icon || '📦') + '</span>' +
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
    box.innerHTML = html;

    /* 收起 / 展开（状态存 localStorage，刷新后记得） */
    var root = document.documentElement;
    var btn  = box.querySelector('#pnavToggle');

    function setCollapsed(v) {
      root.classList.toggle('pnav-collapsed', v);
      if (btn) btn.setAttribute('aria-expanded', v ? 'false' : 'true');
      try { localStorage.setItem(STORE, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
    }

    var saved = '0';
    try { saved = localStorage.getItem(STORE) || '0'; } catch (e) { /* 忽略 */ }
    setCollapsed(saved === '1');

    if (btn) {
      btn.addEventListener('click', function () {
        setCollapsed(!root.classList.contains('pnav-collapsed'));
      });
    }
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
  function initList() {
    var grid  = document.querySelector('.pgrid');
    var err   = document.getElementById('perr');
    var empty = document.getElementById('pempty');
    var count = document.getElementById('pcount');
    var tpl   = window.SITE_TEMPLATES && window.SITE_TEMPLATES.projcard;

    loadIndexes().then(loadProjects).then(function (list) {
      buildSidebar(document.getElementById('pnav'), list, null, null);
      if (err) err.hidden = true;

      grid.innerHTML = list.map(function (p) {
        if (!tpl) return '';
        var c = p.data.card || {};
        c.id = p.id;                     // 模板靠 id 生成"点进详情页"的链接
        return tpl(c);
      }).join('');

      initFilter();

      // 一个项目都没有：给一句人话，而不是报错
      if (!list.length) {
        if (empty) {
          empty.hidden = false;
          empty.setAttribute('data-empty-hint', '1');
          empty.textContent = '还没有项目 —— 在 projects/ 里新建一个 json，' +
                              '再到 projects/_index.json 的 projects 数组里写上它的 id，就会出现。';
        }
        if (count) count.textContent = '共 0 个项目';
      }
    }).catch(function (e) {
      if (typeof console !== 'undefined' && console.warn) console.warn('[projects] 列表加载失败：', e);
      if (err) {
        err.hidden = false;
        err.textContent = '项目加载失败：' + e.message +
          '　—— 这些配置文件是用 fetch 读的，必须用 http 打开（本地：python -m http.server）。';
      }
      if (grid) grid.innerHTML = '';
    });
  }

  /* ---------- 详情页 ---------- */
  function initDetail() {
    var host = document.getElementById('pdetail');
    if (!host) return;

    var want = (/[?&]p=([\w.-]+)/.exec(location.search) || [])[1] || '';

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
      });
    }).catch(function (e) {
      if (typeof console !== 'undefined' && console.warn) console.warn('[projects] 详情加载失败：', e);
      host.innerHTML = '<p class="lderr">' + esc(e.message) +
        '　—— 要用 http 打开（本地：python -m http.server），' +
        '并且 projects/_index.json 里至少登记了一个项目。</p>';
    });
  }

  /* ---------- 入口 ---------- */
  if (document.querySelector('.pgrid')) initList();
  if (document.getElementById('pdetail')) initDetail();
})();
