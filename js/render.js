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
    el = nodes[i];
    key = el.getAttribute('data-list');
    var tplName = el.getAttribute('data-item');
    val = get(key);
    if (!T[tplName]) { warned.push('没有叫 ' + tplName + ' 的模板（' + key + '）'); continue; }
    if (!val || !val.length) { el.innerHTML = ''; continue; }   // 空数组 = 清空
    var html = [];
    for (var j = 0; j < val.length; j++) html.push(T[tplName](val[j], j));
    el.innerHTML = html.join('');
  }

  if (typeof console !== 'undefined' && console.info) {
    if (warned.length) console.warn('[content] 有几处没填上：', warned.join('；'));
    else console.info('[content] 内容已从 js/content.js 渲染完成');
  }
})();
