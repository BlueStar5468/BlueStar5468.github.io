/* =========================================================================
   渲染器 —— 把 js/content.js 里的数据填进 index.html
   -------------------------------------------------------------------------
   一般不用改这个文件。它做两件事：
     1. [data-fill="a.b"]       → 把 a.b 的文本塞进这个元素（自动转义）
        [data-fill-html="a.b"]  → 同上，但允许写 HTML
     2. [data-list="a.b"][data-item="模板名"] → 用数据里的数组生成一列子元素
        （容器里可以留一条示例，JS 没跑起来时就是它在显示）

   往 index.html 里加新模块时：容器写 data-list + data-item，
   然后在下面 T 里加一个模板函数即可。
   ========================================================================= */

(function () {
  'use strict';

  var C = window.SITE_CONTENT;
  if (!C) return;                       // 没内容文件就保持 HTML 原样，不报错

  var YEAR = new Date().getFullYear();

  /* ---------- 浏览器标签页标题 / 搜索摘要 ---------- */
  if (C.site) {
    if (C.site.title) document.title = C.site.title;
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && C.site.description) metaDesc.setAttribute('content', C.site.description);
  }

  /* ---------- 小工具 ---------- */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function get(path) {
    var parts = path.split('.'), o = C;
    for (var i = 0; i < parts.length; i++) {
      if (o === null || o === undefined) return undefined;
      o = o[parts[i]];
    }
    return o;
  }
  function isExt(href) { return /^https?:/i.test(href || ''); }
  function attr(target, href) {
    return target ? ' target="_blank" rel="noopener"' : (isExt(href) ? ' target="_blank" rel="noopener"' : '');
  }

  /* ---------- 标签（chip）通用 ---------- */
  function chipOne(t, forceAmber) {
    var o = (typeof t === 'string') ? { text: t } : (t || {});
    var cls = (o.color === 'amber' || forceAmber) ? ' chip--amber'
            : (o.color === 'blue' ? ' chip--blue' : '');
    return '<span class="chip' + cls + '">' + esc(o.text) + '</span>';
  }
  function chipList(list, forceAmber) {
    if (!list || !list.length) return '';
    var out = [];
    for (var i = 0; i < list.length; i++) out.push(chipOne(list[i], forceAmber));
    return out.join('');
  }

  /* ---------- 各种模板 ---------- */
  var T = {
    meta: function (d) {
      return '<li><span class="ico">' + esc(d.icon || '·') + '</span>' + esc(d.text) + '</li>';
    },
    link: function (d) {
      // href 留空时：文字看着像邮箱就自动拼 mailto:
      var href = d.href;
      if (!href && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.text || '').trim())) {
        href = 'mailto:' + String(d.text).trim();
      }
      return '<a class="link" href="' + esc(href || '#') + '"' + attr(false, href) + '>' +
             '<span class="link__ico">' + esc(d.ico || '·') + '</span>' +
             '<span class="link__text">' + esc(d.text) + '</span>' +
             '<span class="link__arrow">↗</span></a>';
    },
    chip: function (d) { return chipOne(d); },
    chipAmber: function (d) { return chipOne(d, true); },   // 整组强制橙色（硬件页用）

    /* 项目卡（projects.html 用）：一张卡 = 一个项目 */
    projcard: function (d) {
      var ST = { '进行中': 'wip', '已完成': 'done', '归档': 'archived', '概念': 'idea' };
      var st = d.status ? (ST[d.status] || 'wip') : '';
      var cover = d.cover
        ? '<img class="pcard__img" src="' + esc(d.cover) + '" alt="" loading="lazy" />'
        : '<span class="pcard__ph" aria-hidden="true">' + iconHtml(d.icon || '📦', 'pcard__phimg') + '</span>';
      var stack = (d.stack || []).map(function (s) {
        return '<span class="chip chip--sm">' + esc(s) + '</span>';
      }).join('');
      var links = (d.links || []).map(function (l) {
        var ext = isExt(l.href);
        return '<a class="pcard__link' + (l.primary ? ' pcard__link--primary' : '') +
               '" href="' + esc(l.href || '#') + '"' +
               (ext ? ' target="_blank" rel="noopener"' : '') + '>' +
               esc(l.text) + (ext ? ' ↗' : '') + '</a>';
      }).join('');
      // 整张卡可点：标题包一层链接，再用 CSS 把它撑满整张卡（卡片里的按钮 z-index 更高）
      var name = d.title || d.name || '';
      var go = d.href || (d.id ? 'project.html?p=' + encodeURIComponent(d.id) : '');
      var head = go
        ? '<a class="pcard__go" href="' + esc(go) + '">' + esc(name) + '</a>'
        : esc(name);
      return '<article class="pcard" data-cat="' + esc(d.cat || 'all') + '"' +
             (d.id ? ' data-id="' + esc(d.id) + '"' : '') +
             (d.featured ? ' data-featured="1"' : '') + '>' +
        '<div class="pcard__cover">' + cover +
          (st ? '<span class="pcard__status pcard__status--' + st + '">' + esc(d.status) + '</span>' : '') +
        '</div>' +
        '<div class="pcard__body">' +
          '<h3 class="pcard__title">' + head + '</h3>' +
          (d.summary ? '<p class="pcard__sum">' + esc(d.summary) + '</p>' : '') +
          (d.desc ? '<p class="pcard__desc">' + d.desc + '</p>' : '') +
          (stack ? '<div class="chips chips--sm">' + stack + '</div>' : '') +
        '</div>' +
        '<div class="pcard__foot">' +
          '<span class="pcard__year">' + esc(d.year || '') + '</span>' +
          '<span class="pcard__links">' + links + '</span>' +
        '</div>' +
      '</article>';
    },

    /* 分类筛选按钮 */
    filterbtn: function (d) {
      return '<button class="filter" type="button" data-filter="' + esc(d.key) + '">' +
             esc(d.label) + '<b class="filter__n">0</b></button>';
    },

    navlink: function (d) {
      var here = '', section = '';
      try { here = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase(); } catch (e) { here = ''; }
      try {
        section = (document.body && document.body.getAttribute('data-section') || '').toLowerCase();
      } catch (e) { section = ''; }
      var href = String(d.href || '#');
      var ext = d.ext === true || isExt(href);
      // 两种判定：文件名一致，或者所在板块一致（详情页也算「项目」板块）
      var active = !ext && (href.toLowerCase() === here ||
                            (!!d.section && String(d.section).toLowerCase() === section));
      return '<a class="topbar__link' + (active ? ' is-active' : '') + '" href="' + esc(href) + '"' +
             (ext ? ' target="_blank" rel="noopener"' : '') +
             (active ? ' aria-current="page"' : '') + '>' +
             esc(d.text) + (ext ? ' ↗' : '') + '</a>';
    },

    stat: function (d) {
      return '<div class="stat card"><b>' + esc(d.num) + '</b><span>' + esc(d.label) + '</span></div>';
    },

    quick: function (d) {
      return '<button class="card quick__card" data-goto="' + esc(d.goto || '') + '">' +
             '<span class="quick__ico' + (d.amber ? ' quick__ico--amber' : '') + '">' + esc(d.ico || '') + '</span>' +
             '<span class="quick__text"><b>' + esc(d.title) + '</b><i>' + esc(d.sub) + '</i></span>' +
             '<span class="quick__arrow">→</span></button>';
    },

    mini:      function (d) { return T._mini(d, false); },
    miniAmber: function (d) { return T._mini(d, true); },
    _mini: function (d, amber) {
      return '<article class="card mini' + (amber ? ' mini--amber' : '') + '">' +
             '<h4>' + esc(d.title) + '</h4>' +
             '<div class="chips">' + chipList(d.chips, amber) + '</div></article>';
    },

    work: function (d) {
      var link = d.link
        ? '<a class="work__link" href="' + esc(d.link) + '"' + attr(false, d.link) + '>' +
          esc(d.linkText || '链接') + ' ↗</a>'
        : '';
      return '<article class="card work work--slim">' +
             '<div class="work__ico">' + esc(d.ico || '') + '</div>' +
             '<div><h4>' + esc(d.title) + '</h4><p>' + esc(d.desc) + '</p></div>' +
             link + '</article>';
    },

    listitem: function (d) {
      return '<li><span class="list__tag">' + esc(d.tag) + '</span><span>' + esc(d.text) + '</span></li>';
    },

    bar: function (d) {
      var v = Math.max(0, Math.min(100, Number(d.value) || 0));
      return '<div class="bar"><div class="bar__head"><span>' + esc(d.label) + '</span><span>' + v + '%</span></div>' +
             '<div class="bar__track"><i class="bar__fill" style="--v:' + v + '%"></i></div></div>';
    },

    timeline: function (d) {
      return '<li><span class="timeline__time">' + esc(d.time) + '</span>' +
             '<div class="timeline__body card"><h4>' + esc(d.title) + '</h4>' +
             '<p>' + esc(d.desc) + '</p></div></li>';
    },

    btn: function (d) {
      return '<a class="btn' + (d.primary ? ' btn--primary' : '') + '" href="' + esc(d.href || '#') + '"' +
             attr(false, d.href) + '>' + esc(d.text) + '</a>';
    }
  };

  /* ---------- 项目图标：emoji 或图片都可以 ----------
     icon 字段写 "⚙️" 就用 emoji，写 "assets/xxx.png"（或 http 链接）就渲染成图片 */
  function iconHtml(v, imgClass) {
    var s = String(v === undefined || v === null ? '' : v).trim();
    if (!s) return '';
    var isImg = /^https?:\/\//i.test(s) ||
                /\.(png|jpe?g|webp|svg|gif|avif)$/i.test(s) ||
                /^(?:\.{0,2}\/)/.test(s);
    if (!isImg) return esc(s);
    return '<img class="' + imgClass + '" src="' + esc(s) + '" alt="" loading="lazy" />';
  }
  window.PROJ_ICON = iconHtml;

  /* ---------- 共享小工具（blog.js 等复用） ---------- */
  window.SITE_DATA = {
    esc: esc,
    icon: iconHtml,
    getJSON: function (url) {
      return fetch(url, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' · ' + url);
        return r.json();
      });
    }
  };

  /* ---------- 本地测试内容开关（实验室页面里可以切） ----------
     开：项目页 / 博客页也会读 dev-projects/ 和 dev-blog/
     关：只读 projects/ 和 blog/，跟线上一致
     默认开；状态存在 localStorage，所有页面共用 */
  window.SITE_DEV = {
    KEY: 'dev-content',
    on: function () {
      try { return window.localStorage.getItem('dev-content') !== '0'; } catch (e) { return true; }
    },
    set: function (v) {
      try { window.localStorage.setItem('dev-content', v ? '1' : '0'); } catch (e) { /* 忽略 */ }
    }
  };

  /* ---------- 条目开关：show: '某个 key' 的判定 ----------
     默认看 config.js 里的布尔值；个别 key 允许被 localStorage 覆盖
     （实验室页面上的「在导航栏显示实验室」就是这么做的） */
  var FLAG_STORE = { 'ui.debug': 'lab-in-nav' };

  function flag(key) {
    var ls = FLAG_STORE[key];
    if (ls) {
      try {
        var v = window.localStorage.getItem(ls);
        if (v === '1') return true;
        if (v === '0') return false;
      } catch (e) { /* localStorage 不可用就走下面 */ }
    }
    if (!window.SITE_CONFIG) return false;   // config 都没加载，当没开
    return window.SITE_CONFIG[key] !== false;
  }

  /* ---------- 列表渲染（抽出来，方便只重画导航） ---------- */
  function fillList(el) {
    var key = el.getAttribute('data-list');
    var tplName = el.getAttribute('data-item');
    var val = get(key);
    if (!T[tplName]) { warned.push('没有叫 ' + tplName + ' 的模板（' + key + '）'); return; }
    if (!val || !val.length) { el.innerHTML = ''; return; }
    var html = [];
    for (var j = 0; j < val.length; j++) {
      var item = val[j];
      if (item && item.show && !flag(item.show)) continue;
      html.push(T[tplName](item, j));
    }
    el.innerHTML = html.join('');
  }

  /* ---------- 头像：配了图片就把字母方块换掉（要在填充之前做） ---------- */
  var avatarBox = document.querySelector('[data-avatar]');
  if (avatarBox && C.side && C.side.avatarImg) {
    var avatarBackup = avatarBox.innerHTML;
    avatarBox.innerHTML = '<img class="avatar__img" src="' + esc(C.side.avatarImg) + '" alt="头像" />';
    var avatarImg = avatarBox.firstChild;
    if (avatarImg && avatarImg.tagName === 'IMG') {
      avatarImg.onerror = function () {                  // 图挂了就退回字母头像
        avatarBox.innerHTML = avatarBackup;
        var t = avatarBox.querySelector('[data-fill="side.avatar"]');
        if (t) t.textContent = C.side.avatar || '';
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[content] 头像图加载失败，已退回字母头像：' + C.side.avatarImg);
        }
      };
    }
  }

  /* ---------- 两处页脚：把年份和名字拼进去 ---------- */
  if (C.side) {
    C.side.credit = '© <span id="year">' + YEAR + '</span> ' + esc(C.side.name) +
                    '<br />' + esc(C.side.credit);
  }
  if (C.landing) {
    C.landing.foot = '© <span id="yearB">' + YEAR + '</span> ' + esc(C.side ? C.side.name : '') +
                     ' · ' + esc(C.landing.foot);
  }

  /* ---------- 开始填充 ---------- */
  var warned = [];

  var i, el, key, val, nodes;

  nodes = document.querySelectorAll('[data-fill]');
  for (i = 0; i < nodes.length; i++) {
    el = nodes[i]; key = el.getAttribute('data-fill'); val = get(key);
    if (val === undefined) { warned.push('填不到 ' + key); continue; }
    el.textContent = val;
  }

  nodes = document.querySelectorAll('[data-fill-html]');
  for (i = 0; i < nodes.length; i++) {
    el = nodes[i]; key = el.getAttribute('data-fill-html'); val = get(key);
    if (val === undefined) { warned.push('填不到 ' + key); continue; }
    el.innerHTML = val;
  }

  nodes = document.querySelectorAll('[data-list]');
  for (i = 0; i < nodes.length; i++) {
    fillList(nodes[i]);
  }

  if (typeof console !== 'undefined' && console.info) {
    if (warned.length) console.warn('[content] 有几处没填上：', warned.join('；'));
    else console.info('[content] 内容已从 js/content.js 渲染完成');
  }

  // 模板也暴露出去：项目页（js/projects.js）要用 projcard 渲染卡片
  window.SITE_TEMPLATES = T;

  // 只重画顶部导航（实验室里切「显示实验室」时要立刻生效）
  window.SITE_RENDER_NAV = function () {
    var nav = document.querySelector('[data-list="site.nav"]');
    if (nav) fillList(nav);
  };
})();
