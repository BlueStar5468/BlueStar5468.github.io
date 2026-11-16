/* =========================================================================
   详情页组件库 —— 一个 block = 一段 HTML
   -------------------------------------------------------------------------
   支持的类型（每个都可以在 projects/<项目>.json 的 page.blocks 里组合）：
     hero      大标题 + 副标题 + 封面 + meta + 按钮
     text      一段富文本（html 字段可写任意 HTML）
     list      要点列表（style: check / bullet / number）
     cards     小卡片网格（cols 控制列数）
     stats     数字统计
     specs     参数表（rows: [["键","值"], ...]）
     code      代码块（lang 只是右上角的标签，不做着色）
     image     单张图（src, caption）
     gallery   图集（cols, images: [{src, caption}]）
     timeline  时间线（items: [{time, title, desc}]）
     quote     引用块
     video     iframe 嵌入（src 留空显示占位）
     divider   分隔线
     links     按钮组（primary: true 是实心蓝）
   ========================================================================= */

(function () {
  'use strict';

    // 子目录页面（blog/、projects/）的资源 URL 要带前缀
    var PU = window.PAGE_URL || function (u) { return u; };

  /* ---------- 小工具 ---------- */
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; });
  }
  function isExt(href) { return /^https?:\/\//i.test(String(href || '')); }
  function attr(href) { return isExt(href) ? ' target="_blank" rel="noopener"' : ''; }
  function cols(n) { return ' style="--cols:' + (parseInt(n, 10) || 2) + '"'; }

  /* 每块统一的外壳：有 title 就出标题（hero / divider 除外） */
  function wrap(b, i, inner, opt) {
    var o = opt || {};
    var cls = 'blk blk--' + esc(b.type);
    if (o.cls) cls += ' ' + o.cls;
    var head = '';
    if (b.title && !o.noTitle) {
      head = '<h2 class="blk__title">' + esc(b.title) + '</h2>';
    }
    return '<section class="' + cls + '" id="s-' + i + '">' + head + inner + '</section>';
  }

  function btn(l) {
    return '<a class="btn' + (l.primary ? ' btn--primary' : '') + '" href="' + esc(l.href || '#') + '"' +
           attr(l.href) + '>' + esc(l.text) + (isExt(l.href) ? ' ↗' : '') + '</a>';
  }

  /* =======================================================================
     通用组件（项目页 / 博客页 / 列表页都能用）
     ======================================================================= */

  /* ---------- 各组件 ---------- */
  var B = {};

  /* 图标：emoji 或图片（复用 render.js 里的实现；没有就退回纯文本） */
  function icon(v, imgClass) {
    if (typeof window.PROJ_ICON === 'function') return window.PROJ_ICON(v, imgClass || 'phero__phimg');
    return esc(v);
  }

  B.hero = function (b, i) {
    // meta 兼容两种写法：{ label, value } 对象 或 ["标签","值"] 数组；空行直接跳过
    function pair(m) {
      if (Array.isArray(m)) return [m[0], m[1]];
      return [m && m.label, m && m.value];
    }
    var meta = (b.meta || []).filter(function (m) {
      var p = pair(m);
      return (p[0] && String(p[0]).trim()) || (p[1] && String(p[1]).trim());
    }).map(function (m) {
      var p = pair(m);
      return '<li><span>' + esc(p[0]) + '</span><b>' + esc(p[1]) + '</b></li>';
    }).join('');
    var acts = (b.links || []).map(btn).join('');
    var cover = b.cover
      ? '<img class="phero__img" src="' + esc(PU(b.cover)) + '" alt="" />'
      : '<span class="phero__ph" aria-hidden="true">' + icon(b.icon || '📦') + '</span>';
    return '<header class="phero" id="s-' + i + '">' +
      '<div class="phero__main">' +
        (b.eyebrow ? '<p class="eyebrow">' + esc(b.eyebrow) + '</p>' : '') +
        '<h1 class="phero__title">' + esc(b.title || '') + '</h1>' +
        (b.subtitle ? '<p class="phero__sub">' + esc(b.subtitle) + '</p>' : '') +
        (meta ? '<ul class="phero__meta">' + meta + '</ul>' : '') +
        (acts ? '<div class="page-main__actions">' + acts + '</div>' : '') +
      '</div>' +
      (b.cover || b.icon ? '<div class="phero__side">' + cover + '</div>' : '') +
    '</header>';
  };

  B.text = function (b, i) {
    return wrap(b, i, '<div class="prose">' + (b.html || '') + '</div>');
  };

  B.list = function (b, i) {
    var style = b.style || 'bullet';
    var items = (b.items || []).map(function (t) {
      return '<li>' + esc(t) + '</li>';
    }).join('');
    return wrap(b, i, '<ul class="plist plist--' + esc(style) + '">' + items + '</ul>');
  };

  B.cards = function (b, i) {
    var inner = (b.items || []).map(function (c) {
      return '<article class="bcard">' +
        (c.icon ? '<span class="bcard__ico" aria-hidden="true">' + esc(c.icon) + '</span>' : '') +
        '<h4 class="bcard__title">' + esc(c.title) + '</h4>' +
        (c.desc ? '<p class="bcard__desc">' + esc(c.desc) + '</p>' : '') +
      '</article>';
    }).join('');
    return wrap(b, i, '<div class="bcards"' + cols(b.cols || 3) + '>' + inner + '</div>');
  };

  B.stats = function (b, i) {
    var inner = (b.items || []).map(function (s) {
      return '<div class="bstat"><b>' + esc(s.num) + '</b><span>' + esc(s.label) + '</span></div>';
    }).join('');
    return wrap(b, i, '<div class="bstats">' + inner + '</div>');
  };

  B.specs = function (b, i) {
    var rows = (b.rows || []).filter(function (r) {
      if (!r) return false;
      if (Array.isArray(r)) return (r[0] && String(r[0]).trim()) || (r[1] && String(r[1]).trim());
      return (r.k && String(r.k).trim()) || (r.v && String(r.v).trim()) || (r.label && String(r.label).trim()) || (r.value && String(r.value).trim());
    }).map(function (r) {
      var k, v;
      if (Array.isArray(r)) { k = r[0]; v = r[1]; }
      else { k = (r.k !== undefined ? r.k : r.label); v = (r.v !== undefined ? r.v : r.value); }
      return '<tr><th>' + esc(k) + '</th><td>' + esc(v) + '</td></tr>';
    }).join('');
    return wrap(b, i, '<table class="specs"><tbody>' + rows + '</tbody></table>');
  };

  B.code = function (b, i) {
    // 顶部横条：左边文件名（可选），右边语言标签（可选）；两个都没有就不出横条
    var bar = '';
    if (b.file || b.lang) {
      bar = '<div class="codeblk__bar">' +
        '<span class="codeblk__file">' + esc(b.file || '') + '</span>' +
        '<span class="codeblk__lang">' + esc(b.lang || '') + '</span>' +
      '</div>';
    }
    var inner = '<div class="codeblk">' + bar +
      '<pre><code>' + esc(b.code || '') + '</code></pre></div>';
    return wrap(b, i, inner);
  };

  B.image = function (b, i) {
    var inner = '<figure class="fig">' +
      '<img class="fig__img" src="' + esc(PU(b.src)) + '" alt="' + esc(b.alt || b.caption || '') + '" loading="lazy" />' +
      (b.caption ? '<figcaption class="fig__cap">' + esc(b.caption) + '</figcaption>' : '') +
    '</figure>';
    return wrap(b, i, inner);
  };

  B.gallery = function (b, i) {
    var inner = (b.images || []).map(function (g) {
      return '<figure class="fig fig--sm">' +
        '<img class="fig__img" src="' + esc(PU(g.src)) + '" alt="' + esc(g.caption || '') + '" loading="lazy" />' +
        (g.caption ? '<figcaption class="fig__cap">' + esc(g.caption) + '</figcaption>' : '') +
      '</figure>';
    }).join('');
    return wrap(b, i, '<div class="gal"' + cols(b.cols || 2) + '>' + inner + '</div>');
  };

  B.timeline = function (b, i) {
    var inner = (b.items || []).map(function (t) {
      return '<li class="ptl__item">' +
        '<span class="ptl__time">' + esc(t.time) + '</span>' +
        '<div class="ptl__body">' +
          '<h4 class="ptl__title">' + esc(t.title) + '</h4>' +
          (t.desc ? '<p class="ptl__desc">' + esc(t.desc) + '</p>' : '') +
        '</div>' +
      '</li>';
    }).join('');
    return wrap(b, i, '<ol class="ptl">' + inner + '</ol>');
  };

  B.quote = function (b, i) {
    return wrap(b, i, '<blockquote class="bquote">' +
      '<p>' + esc(b.text) + '</p>' +
      (b.by ? '<cite>' + esc(b.by) + '</cite>' : '') +
    '</blockquote>', { noTitle: true });
  };

  B.video = function (b, i) {
    var inner = b.src
      ? '<div class="bvideo"><iframe src="' + esc(b.src) + '" title="' + esc(b.title || '视频') +
        '" loading="lazy" allowfullscreen frameborder="0"></iframe></div>'
      : '<div class="bvideo bvideo--empty"><span>🎬 ' + esc(b.caption || '视频位置（src 留空）') + '</span></div>';
    return wrap(b, i, inner);
  };

  /* 侧边栏介绍卡：头像 + 名字 + 副标题（不带块标题） */
  B.profile = function (b, i) {
    var inner = '<div class="blk-profile">' +
      '<div class="bside__head">' +
        '<div class="avatar avatar--flat"><span class="avatar__letter">B</span></div>' +
        '<div class="bside__id">' +
          '<h1 class="bside__name">' + esc(b.name || 'BlueStar5468') + '</h1>' +
          '<p class="bside__title">' + esc(b.title || 'BSuniStudio/BlueStar5468') + '</p>' +
        '</div>' +
      '</div>' +
    '</div>';
    return wrap(b, i, inner, { noTitle: true });
  };

  B.divider = function (b, i) {
    return '<hr class="bdiv" id="s-' + i + '" />';
  };

  B.links = function (b, i) {
    var inner = (b.items || []).map(btn).join('');
    return wrap(b, i, '<div class="page-main__actions">' + inner + '</div>');
  };

  /* posts —— 专属组件：列出所有博文（数据由 blog.js 预先读好，通过 ctx.posts 传进来）
     limit  只显示前 N 篇（0 / 不写 = 全部）
     count  是否显示「共 N 篇」（默认显示，写 false 关掉）
     emptyText  没有文章时的提示 */
  /* =======================================================================
     博客专属组件（需要 ctx.posts）
     ======================================================================= */

  B.posts = function (b, i, ctx) {
    var list = (ctx && ctx.posts) || [];
    var limit = parseInt(b.limit, 10) || 0;
    var shown = limit > 0 ? list.slice(0, limit) : list;

    if (!shown.length) {
      return wrap(b, i, '<p class="posts__empty">' + esc(b.emptyText || '还没有文章。') + '</p>');
    }

    var html = shown.map(function (p) {
      var m = p.meta || {};
      var tags = (m.tags || []).map(function (t) {
        return '<span class="chip chip--sm">' + esc(t) + '</span>';
      }).join('');
      // 链到静态文章页（tools/build.js 生成的 blog/<id>.html），爬虫和 JS 看到的是同一个链接
      var href = (p.meta && p.meta.href) || ('blog/' + p.id + '.html');
      return '<a class="post" href="' + esc(href) + '">' +
        (m.cover ? '<img class="post__thumb" src="' + esc(PU(m.cover)) + '" alt="" loading="lazy" />' : '') +
        '<span class="post__body">' +
          '<span class="post__head">' +
            (m.date ? '<time class="post__date" datetime="' + esc(m.date) + '">' + esc(m.date) + '</time>' : '') +
            (m.minutes ? '<span class="post__min">' + esc(m.minutes) + ' 分钟</span>' : '') +
            (tags ? '<span class="post__tags">' + tags + '</span>' : '') +
          '</span>' +
          '<span class="post__title">' + esc(m.title || p.id) + '</span>' +
          (m.summary ? '<span class="post__sum">' + esc(m.summary) + '</span>' : '') +
        '</span>' +
      '</a>';
    }).join('');

    var foot = (b.count === false) ? ''
      : '<p class="posts__count">共 ' + shown.length + ' 篇</p>';

    return wrap(b, i, '<div class="posts">' + html + '</div>' + foot);
  };

  /* postref —— 引用另一篇博文（文章页里用得最多）
     id    必填，被引用文章的 id
     note  可选，前面加一句说明
     （数据同样来自 ctx.posts，找不到会显示黄色提示） */
  B.postref = function (b, i, ctx) {
    var list = (ctx && ctx.posts) || [];
    var hit = null;
    list.forEach(function (p) { if (p.id === b.id) hit = p; });

    if (!hit) {
      return wrap(b, i, '<p class="blk__warn">引用的文章找不到：' + esc(b.id) +
        '（检查 blog/_index.json 里有没有这个 id）</p>');
    }

    var m = hit.meta || {};
    var tags = (m.tags || []).map(function (t) {
      return '<span class="chip chip--sm">' + esc(t) + '</span>';
    }).join('');

    return wrap(b, i,
      (b.note ? '<p class="prose">' + esc(b.note) + '</p>' : '') +
      '<a class="post post--ref" href="' + esc((hit.meta && hit.meta.href) || ('blog/' + hit.id + '.html')) + '">' +
        '<span class="post__body">' +
          '<span class="post__head">' +
            '<span class="post__label">相关</span>' +
            (m.date ? '<time class="post__date" datetime="' + esc(m.date) + '">' + esc(m.date) + '</time>' : '') +
            (m.minutes ? '<span class="post__min">' + esc(m.minutes) + ' 分钟</span>' : '') +
            (tags ? '<span class="post__tags">' + tags + '</span>' : '') +
          '</span>' +
          '<span class="post__title">' + esc(m.title || hit.id) + '</span>' +
          (m.summary ? '<span class="post__sum">' + esc(m.summary) + '</span>' : '') +
        '</span>' +
        '<span class="post__arrow" aria-hidden="true">↗</span>' +
      '</a>');
  };

  /* ---------- 对外 ---------- */
  window.RENDER_BLOCKS = function (blocks, ctx) {
    if (!blocks || !blocks.length) return '';
    return blocks.map(function (b, i) {
      var fn = B[b && b.type];
      if (!fn) {
        return '<section class="blk" id="s-' + i + '"><p class="blk__warn">未知组件：' +
               esc(b && b.type) + '（写在 projects/ 或 blog/ 的 json 里）</p></section>';
      }
      return fn(b, i, ctx || {});
    }).join('');
  };

  // 侧边栏的章节列表：只取有标题的块（hero 是顶部的，不算）
  window.BLOCK_TOC = function (blocks) {
    var out = [];
    (blocks || []).forEach(function (b, i) {
      if (!b || !b.title || b.type === 'hero') return;
      out.push({ id: 's-' + i, title: b.title });
    });
    return out;
  };

  /* =======================================================================
     项目专属组件
     ======================================================================= */

  /* projlist —— 项目卡片列表（可选分类筛选 + 计数）
     依赖 ctx.projects（形如 [{ id, dir, data }]），数据来自 projects/_index.json */
  B.projlist = function (b, i, ctx) {
    var all = (ctx && ctx.projects) || [];
    var cats = b.categories || [];
    var tpl = window.SITE_TEMPLATES && window.SITE_TEMPLATES.projcard;
    var showFilter = b.filter !== false && cats.length > 0;

    var cards = all.map(function (p) {
      if (!tpl) return '';
      var c = p.data.card || {};
      c.id = p.id;
      if (p.dir !== 'projects/') c.href = p.dir + p.id + '.html';
      return tpl(c);
    }).join('');

    var bar = '';
    if (showFilter || b.count !== false) {
      var btns = showFilter ? cats.map(function (c) {
        var on = c.key === 'all';
        return '<button class="filter' + (on ? ' is-active' : '') + '" data-filter="' + esc(c.key) + '"' +
               ' type="button" aria-pressed="' + (on ? 'true' : 'false') + '">' +
               esc(c.label) + '<b class="filter__n">0</b></button>';
      }).join('') : '';
      bar = '<div class="pbar">' +
        (btns ? '<div class="filters">' + btns + '</div>' : '') +
        (b.count !== false ? '<span class="pbar__count" id="pcount">共 0 个项目</span>' : '') +
      '</div>';
    }

    var inner = bar +
      '<div class="pgrid">' + cards + '</div>' +
      '<p class="pgrid__empty" id="pempty" hidden>这个分类下还没有项目。</p>';

    return wrap(b, i, inner);
  };

})();
