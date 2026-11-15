/* =========================================================================
   写文章的小工具（studio.html 专用）
   -------------------------------------------------------------------------
   左侧：文章信息 + 内容块列表        中间：选中块的表单        右侧：实时预览
   预览直接用 js/blocks.js 的 RENDER_BLOCKS，所以看到的 = 发布后的效果。

   导出：下载 json（或复制），放进 blog/ 目录，再在 blog/_index.json 里登记 id。
   草稿：自动存 localStorage（studio-draft），刷新不丢；换电脑记得先导出。
   ========================================================================= */

(function () {
  'use strict';

  var LS_DRAFT = 'studio-draft';
  var LS_ID    = 'studio-id';

  /* 图片下拉里给的候选（也可以手输任意路径） */
  var ASSETS = [
    'assets/avatar.jpg', 'assets/board.jpg', 'assets/layout.jpg',
    'assets/hex-c.png', 'assets/hex-cpp.png', 'assets/hex-csharp.png',
    'assets/logo-opengl.png', 'assets/logo-linux.png'
  ];

  /* ---------- 组件表单定义 ----------
     没在这里的类型（cards / stats / timeline / video / postref）走 JSON 输入框 */
  var SCHEMA = {
    hero: { label: '顶部 Hero', fields: [
      { k: 'title',    t: 'text',  label: '标题' },
      { k: 'subtitle', t: 'text',  label: '副标题' },
      { k: 'eyebrow',  t: 'text',  label: '小标签（可选）' },
      { k: 'icon',     t: 'text',  label: '图标（emoji 或 assets/x.png）' },
      { k: 'cover',    t: 'asset', label: '封面图（可选）' },
      { k: 'meta',     t: 'metapairs', label: '信息行（一行一组：标签 | 值）', cols: ['标签', '值'] },
      { k: 'links',    t: 'links', label: '按钮' }
    ]},
    text: { label: '段落', fields: [
      { k: 'title', t: 'text', label: '标题（可选）' },
      { k: 'html',  t: 'html', label: '内容（可以直接写 HTML）' }
    ]},
    list: { label: '要点列表', fields: [
      { k: 'title', t: 'text',   label: '标题（可选）' },
      { k: 'style', t: 'select', label: '样式', options: [['check', '✓ 打勾'], ['bullet', '• 圆点'], ['number', '1. 数字']] },
      { k: 'items', t: 'lines',  label: '条目（一行一条）' }
    ]},
    code: { label: '代码块', fields: [
      { k: 'title', t: 'text',     label: '标题（可选）' },
      { k: 'lang',  t: 'text',     label: '语言标签（比如 c / csharp / bash）' },
      { k: 'code',  t: 'textarea', label: '代码' }
    ]},
    image: { label: '单张图片', fields: [
      { k: 'title',   t: 'text',  label: '标题（可选）' },
      { k: 'src',     t: 'asset', label: '图片路径' },
      { k: 'caption', t: 'text',  label: '说明（可选）' }
    ]},
    gallery: { label: '图集', fields: [
      { k: 'title',  t: 'text',  label: '标题（可选）' },
      { k: 'cols',   t: 'number', label: '列数（2 或 3）' },
      { k: 'images', t: 'imgs',  label: '图片（一行一张：路径 | 说明）' }
    ]},
    specs: { label: '参数表', fields: [
      { k: 'title', t: 'text',  label: '标题（可选）' },
      { k: 'rows',  t: 'pairs', label: '行', cols: ['键', '值'] }
    ]},
    links: { label: '按钮组', fields: [
      { k: 'title', t: 'text',  label: '标题（可选）' },
      { k: 'items', t: 'links', label: '按钮（一行一个：文字 | 地址 | 是否实心(1/0)）' }
    ]},
    quote: { label: '引用', fields: [
      { k: 'text', t: 'textarea', label: '引用内容' },
      { k: 'by',   t: 'text',     label: '出处（可选）' }
    ]},
    divider: { label: '分隔线', fields: [] }
  };

  var TYPE_LABEL = {
    hero: 'Hero', text: '段落', list: '列表', code: '代码', image: '图片',
    gallery: '图集', specs: '参数表', links: '按钮', quote: '引用', divider: '分隔线',
    cards: '卡片组', stats: '数字', timeline: '时间线', video: '视频', postref: '引用文章'
  };
  var ALL_TYPES = ['hero', 'text', 'list', 'code', 'image', 'gallery', 'specs', 'links', 'quote', 'divider',
                   'cards', 'stats', 'timeline', 'video', 'postref'];

  /* ---------- 状态 ---------- */
  var state = { id: '', meta: {}, blocks: [] };
  var sel = 0;
  var saveTimer = null;

  function $(id) { return document.getElementById(id); }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function blank() {
    return {
      id: '',
      meta: { title: '', date: today(), summary: '', tags: [], cover: '' },
      blocks: [
        { type: 'hero', title: '', subtitle: '', icon: '📝' },
        { type: 'text', title: '', html: '<p>在这里写正文。</p>' }
      ]
    };
  }

  /* ---------- 文本 <-> 数组 ---------- */
  function lines(v) { return Array.isArray(v) ? v.join('\n') : ''; }
  function unlines(s) {
    return String(s || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function pairs(v) {
    return (v || []).map(function (r) {
      if (Array.isArray(r)) return r.join(' | ');
      return [r && r.label, r && r.value].join(' | ');   // 兼容对象写法
    }).join('\n');
  }
  function unpairs(s) {
    return unlines(s).map(function (l) { return l.split('|').map(function (x) { return x.trim(); }); });
  }
  /* hero 的 meta 要的是 [{label, value}]，和 specs.rows 的 [[k,v]] 不一样 */
  function metas(v) {
    return (v || []).map(function (m) {
      if (Array.isArray(m)) return [m[0], m[1]].join(' | ');
      return [m && m.label, m && m.value].join(' | ');
    }).join('\n');
  }
  function unMetas(s) {
    return unlines(s).map(function (l) {
      var p = l.split('|').map(function (x) { return x.trim(); });
      return { label: p[0] || '', value: p[1] || '' };
    });
  }
  function imgs(v) { return (v || []).map(function (g) { return [g.src, g.caption || ''].join(' | '); }).join('\n'); }
  function unImgs(s) {
    return unlines(s).map(function (l) {
      var p = l.split('|').map(function (x) { return x.trim(); });
      return { src: p[0] || '', caption: p[1] || '' };
    });
  }
  function links(v) {
    return (v || []).map(function (l) { return [l.text, l.href, l.primary ? '1' : ''].join(' | '); }).join('\n');
  }
  function unLinks(s) {
    return unlines(s).map(function (l) {
      var p = l.split('|').map(function (x) { return x.trim(); });
      return { text: p[0] || '', href: p[1] || '#', primary: /^(1|true|yes|是)$/i.test(p[2] || '') };
    });
  }

  /* ---------- 预览：用 iframe 装，这样媒体查询会跟着容器宽度变 ---------- */
  var PREVIEW_SHELL =
    '<!DOCTYPE html><html lang="zh-CN" data-accent="blue"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<base target="_blank">' +
    '<link rel="stylesheet" href="css/style.css">' +
    '<style>' +
      'html,body{background:#fff}' +
      'body{margin:0;padding:clamp(14px,4vw,30px)}' +
      '.studio__empty{margin:0;padding:22px;text-align:center;font-size:13px;color:#94a3b8;' +
        'border:1px dashed #e5eaf1;border-radius:10px}' +
    '</style></head><body><div id="pv"></div></body></html>';

  var pendingInner = '';

  function flushPreview() {
    var f = $('pvFrame');
    if (!f) return;
    var doc = f.contentDocument;
    var host = doc && doc.getElementById ? doc.getElementById('pv') : null;
    if (host) { host.innerHTML = pendingInner; return; }   // iframe 已经就绪，直接换内容（不闪）

    if (!f._hooked) {
      f._hooked = true;
      f.addEventListener('load', function () {
        var d = f.contentDocument;
        var h = d && d.getElementById ? d.getElementById('pv') : null;
        if (h) h.innerHTML = pendingInner;
      });
      f.srcdoc = PREVIEW_SHELL;
    }
  }

  function renderPreview() {
    pendingInner = window.RENDER_BLOCKS(state.blocks, {})
      || '<p class="studio__empty">还没有内容块</p>';
    flushPreview();
  }

  /* ---------- 预览尺寸：预设 + 拖动右下角 ---------- */
  function initPreviewSize() {
    var box   = $('frameBox');
    var label = $('pvSize');
    var btns  = document.querySelectorAll('.studio__pvBtn');
    var list  = Array.prototype.slice.call(btns);

    function paint() {
      if (!label || !box) return;
      label.textContent = Math.round(box.clientWidth) + ' × ' + Math.round(box.clientHeight);
    }

    list.forEach(function (b) {
      b.addEventListener('click', function () {
        var w = parseInt(b.getAttribute('data-w'), 10) || 0;
        list.forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        if (box) box.style.width = w > 0 ? (w + 'px') : '';
        paint();
      });
    });

    if (box && window.ResizeObserver) {
      new window.ResizeObserver(paint).observe(box);
    } else if (window.addEventListener) {
      window.addEventListener('resize', paint);
    }
    paint();
  }

  /* ---------- 折叠：分区折叠 + 左栏整体收起 ---------- */
  var LS_SEC  = 'studio-sec-';
  var LS_LEFT = 'studio-left';

  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* 忽略 */ } }

  function secEl(name) {
    var all = document.querySelectorAll('.studio__sec');
    for (var i = 0; i < all.length; i++) {
      if (all[i].getAttribute('data-sec') === name) return all[i];
    }
    return null;
  }

  function setSec(name, closed, save) {
    var el = secEl(name);
    if (!el) return;
    el.classList.toggle('is-closed', !!closed);
    var head = el.querySelector('.studio__secHead');
    if (head) head.setAttribute('aria-expanded', closed ? 'false' : 'true');
    if (save) lsSet(LS_SEC + name, closed ? '1' : '0');
  }

  function setLeft(closed, save) {
    var grid = $('studioGrid');
    var btn  = $('btnCollapse');
    if (grid) grid.classList.toggle('is-left-closed', !!closed);
    if (btn) {
      btn.classList.toggle('is-closed', !!closed);
      btn.setAttribute('aria-expanded', closed ? 'false' : 'true');
      btn.textContent = closed ? '»' : '«';
    }
    if (save) lsSet(LS_LEFT, closed ? '1' : '0');
  }

  function initCollapse() {
    var heads = document.querySelectorAll('.studio__secHead');
    Array.prototype.forEach.call(heads, function (head) {
      head.addEventListener('click', function () {
        var sec = head.parentNode.getAttribute('data-sec');
        setSec(sec, !head.parentNode.classList.contains('is-closed'), true);
      });
    });

    var btn = $('btnCollapse');
    if (btn) {
      btn.addEventListener('click', function () {
        var grid = $('studioGrid');
        setLeft(!(grid && grid.classList.contains('is-left-closed')), true);
      });
    }

    var railBtns = document.querySelectorAll('.studio__railBtn');
    Array.prototype.forEach.call(railBtns, function (b) {
      b.addEventListener('click', function () {
        var what = b.getAttribute('data-rail');
        if (what === 'expand') { setLeft(false, true); return; }
        setLeft(false, true);
        setSec(what, false, true);
        var sec = secEl(what);
        if (sec && sec.scrollIntoView) sec.scrollIntoView({ block: 'nearest' });
      });
    });

    /* 恢复上次的状态 */
    setLeft(lsGet(LS_LEFT) === '1', false);
    setSec('info', lsGet(LS_SEC + 'info') === '1', false);
    setSec('blocks', lsGet(LS_SEC + 'blocks') === '1', false);
  }

  function toFile() {
    return { id: state.id || 'my-post', meta: state.meta, page: { blocks: state.blocks } };
  }

  function renderOut() {
    var out = $('jsonOut'), hint = $('hint');
    var json = JSON.stringify(toFile(), null, 2);
    if (out) out.textContent = json;
    if (hint) {
      var id = state.id || 'my-post';
      hint.innerHTML = '把下载的文件命名成 <code>' + id + '.json</code> 放进 <code>blog/</code>，' +
        '再到 <code>blog/_index.json</code> 的 posts 里加 <code>"' + id + '"</code>。' +
        '（想先本地看效果，也可以放进 <code>dev-blog/</code>）';
    }
    return json;
  }

  /* ---------- 块列表 ---------- */
  function renderList() {
    var host = $('blockList');
    if (!host) return;
    host.innerHTML = '';

    if (!state.blocks.length) {
      host.innerHTML = '<p class="posts__empty">还没有内容块，下面加一个</p>';
      return;
    }

    state.blocks.forEach(function (b, i) {
      var row = document.createElement('div');
      row.className = 'brow' + (i === sel ? ' is-sel' : '');
      row.setAttribute('role', 'button');
      row.tabIndex = 0;

      var no = document.createElement('span');
      no.className = 'brow__no';
      no.textContent = (i + 1);

      var name = document.createElement('span');
      name.className = 'brow__name';
      name.textContent = TYPE_LABEL[b.type] || b.type;

      var ops = document.createElement('span');
      ops.className = 'brow__ops';

      function op(txt, title, fn) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'brow__op';
        btn.textContent = txt;
        btn.title = title;
        btn.setAttribute('aria-label', title);
        btn.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
        ops.appendChild(btn);
      }
      op('↑', '上移', function () { move(i, -1); });
      op('↓', '下移', function () { move(i, 1); });
      op('⧉', '复制', function () { dup(i); });
      op('✕', '删除', function () { del(i); });

      row.appendChild(no);
      row.appendChild(name);
      row.appendChild(ops);
      row.addEventListener('click', function () { sel = i; renderList(); renderForm(); });
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel = i; renderList(); renderForm(); }
      });

      host.appendChild(row);
    });
  }

  function move(i, d) {
    var j = i + d;
    if (j < 0 || j >= state.blocks.length) return;
    var t = state.blocks[i];
    state.blocks[i] = state.blocks[j];
    state.blocks[j] = t;
    sel = j;
    onChange(true);
  }
  function dup(i) {
    state.blocks.splice(i + 1, 0, JSON.parse(JSON.stringify(state.blocks[i])));
    sel = i + 1;
    onChange(true);
  }
  function del(i) {
    state.blocks.splice(i, 1);
    if (sel >= state.blocks.length) sel = state.blocks.length - 1;
    if (sel < 0) sel = 0;
    onChange(true);
  }

  /* ---------- 表单 ---------- */
  function fld(labelText, el) {
    var wrap = document.createElement('label');
    wrap.className = 'fld';
    var cap = document.createElement('span');
    cap.className = 'fld__cap';
    cap.textContent = labelText;
    wrap.appendChild(cap);
    wrap.appendChild(el);
    return wrap;
  }

  function renderForm() {
    var host = $('formHost');
    if (!host) return;
    host.innerHTML = '';

    var b = state.blocks[sel];
    if (!b) {
      host.innerHTML = '<p class="pd-load">左边选一个块，或者先加一个</p>';
      return;
    }

    var head = document.createElement('h3');
    head.className = 'mini-title';
    head.textContent = '第 ' + (sel + 1) + ' 块 · ' + (TYPE_LABEL[b.type] || b.type);
    host.appendChild(head);

    var def = SCHEMA[b.type];

    /* 没有表单定义的类型：直接编辑 JSON */
    if (!def) {
      var ta = document.createElement('textarea');
      ta.className = 'fld__json';
      ta.rows = 14;
      ta.spellcheck = false;
      ta.value = JSON.stringify(b, null, 2);
      var tip = document.createElement('p');
      tip.className = 'fld__tip';
      tip.textContent = '这个类型暂时用 JSON 编辑（改完自动同步预览）：';
      host.appendChild(tip);
      host.appendChild(ta);
      ta.addEventListener('input', function () {
        try {
          var obj = JSON.parse(ta.value);
          if (obj && typeof obj === 'object') {
            state.blocks[sel] = obj;
            ta.classList.remove('is-bad');
            renderPreview(); renderOut(); scheduleSave();
          }
        } catch (e) {
          ta.classList.add('is-bad');
        }
      });
      return;
    }

    /* divider 这种没有字段的 */
    if (!def.fields.length) {
      var none = document.createElement('p');
      none.className = 'fld__tip';
      none.textContent = '这个块没有可填的字段。';
      host.appendChild(none);
      return;
    }

    def.fields.forEach(function (f) {
      var el;
      var val = b[f.k];

      if (f.t === 'select') {
        el = document.createElement('select');
        (f.options || []).forEach(function (o) {
          var op = document.createElement('option');
          op.value = o[0]; op.textContent = o[1];
          el.appendChild(op);
        });
        el.value = val || (f.options && f.options[0] ? f.options[0][0] : '');
      } else if (f.t === 'lines') {
        el = document.createElement('textarea');
        el.rows = 5;
        el.placeholder = '一行一条';
        el.value = lines(val);
      } else if (f.t === 'pairs') {
        el = document.createElement('textarea');
        el.rows = 5;
        el.placeholder = (f.cols || ['键', '值']).join(' | ');
        el.value = pairs(val);
      } else if (f.t === 'metapairs') {
        el = document.createElement('textarea');
        el.rows = 4;
        el.placeholder = (f.cols || ['标签', '值']).join(' | ');
        el.value = metas(val);
      } else if (f.t === 'imgs') {
        el = document.createElement('textarea');
        el.rows = 4;
        el.placeholder = 'assets/a.jpg | 说明';
        el.value = imgs(val);
      } else if (f.t === 'links') {
        el = document.createElement('textarea');
        el.rows = 4;
        el.placeholder = '文字 | https://… | 1';
        el.value = links(val);
      } else if (f.t === 'html') {
        el = document.createElement('textarea');
        el.rows = 12;
        el.spellcheck = false;
        el.className = 'fld__json';
        el.value = val || '';
      } else if (f.t === 'textarea') {
        el = document.createElement('textarea');
        el.rows = 8;
        el.value = val || '';
      } else if (f.t === 'number') {
        el = document.createElement('input');
        el.type = 'number';
        el.value = (val === undefined || val === null) ? '' : val;
      } else {
        el = document.createElement('input');
        el.type = 'text';
        el.value = val || '';
        if (f.t === 'asset') el.setAttribute('list', 'assets');
      }

      if (f.t === 'text' || f.t === 'asset') el.placeholder = f.label || '';

      el.addEventListener('input', function () {
        if (f.t === 'lines')      b[f.k] = unlines(el.value);
        else if (f.t === 'pairs') b[f.k] = unpairs(el.value);
        else if (f.t === 'metapairs') b[f.k] = unMetas(el.value);
        else if (f.t === 'imgs')  b[f.k] = unImgs(el.value);
        else if (f.t === 'links') b[f.k] = unLinks(el.value);
        else if (f.t === 'number') b[f.k] = el.value === '' ? undefined : Number(el.value);
        else                      b[f.k] = el.value;

        renderPreview(); renderOut(); scheduleSave();
      });
      el.addEventListener('change', function () {
        if (f.t === 'select') { b[f.k] = el.value; renderPreview(); renderOut(); scheduleSave(); }
      });

      host.appendChild(fld(f.label || f.k, el));
    });
  }

  /* ---------- 文章信息 ---------- */
  function bindMeta() {
    function bind(id, apply) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('input', function () { apply(el.value); renderPreview(); renderOut(); scheduleSave(); });
      return el;
    }
    var idEl = bind('postId', function (v) { state.id = v.trim(); });
    var t = bind('mTitle', function (v) { state.meta.title = v; });
    var d = bind('mDate', function (v) { state.meta.date = v; });
    var s = bind('mSummary', function (v) { state.meta.summary = v; });
    var g = bind('mTags', function (v) {
      state.meta.tags = String(v).split(/[,，]/).map(function (x) { return x.trim(); }).filter(Boolean);
    });
    var c = bind('mCover', function (v) { state.meta.cover = v.trim(); });

    /* 把 state 写回输入框 */
    state._fill = function () {
      if (idEl) idEl.value = state.id || '';
      if (t) t.value = state.meta.title || '';
      if (d) d.value = state.meta.date || '';
      if (s) s.value = state.meta.summary || '';
      if (g) g.value = (state.meta.tags || []).join(', ');
      if (c) c.value = state.meta.cover || '';
    };
  }

  /* ---------- 自动保存 ---------- */
  function scheduleSave() {
    if (state._fill) state._fill();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { window.localStorage.setItem(LS_DRAFT, JSON.stringify(state)); } catch (e) { /* 忽略 */ }
    }, 400);
  }

  function onChange(structureChanged) {
    renderPreview();
    renderOut();
    scheduleSave();
    if (structureChanged) { renderList(); renderForm(); }
  }

  /* ---------- 按钮 ---------- */
  function bindButtons() {
    var addBtn = $('btnAdd');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        var t = ($('addType') || {}).value || 'text';
        var block = { type: t };
        if (t === 'list') block.items = [];
        if (t === 'text') block.html = '';
        state.blocks.push(block);
        sel = state.blocks.length - 1;
        onChange(true);
      });
    }

    var dl = $('btnDownload');
    if (dl) {
      dl.addEventListener('click', function () {
        var json = renderOut();
        var name = (state.id || 'my-post') + '.json';
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      });
    }

    var cp = $('btnCopy');
    if (cp) {
      cp.addEventListener('click', function () {
        var json = renderOut();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(json).then(function () {
            cp.textContent = '已复制 ✓';
            setTimeout(function () { cp.textContent = '复制 JSON'; }, 1500);
          }, function () { alert('复制失败，直接手动选下面的文本吧'); });
        } else {
          alert('这个浏览器不支持自动复制，直接手动选下面的文本吧');
        }
      });
    }

    var imp = $('btnImport');
    var file = $('fileIn');
    if (imp && file) {
      imp.addEventListener('click', function () { file.click(); });
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var obj = JSON.parse(String(reader.result));
            state.id = obj.id || '';
            state.meta = Object.assign({ title: '', date: today(), summary: '', tags: [], cover: '' }, obj.meta || {});
            state.blocks = (obj.page && obj.page.blocks) || obj.blocks || [];
            sel = 0;
            if (state._fill) state._fill();
            onChange(true);
          } catch (e) {
            alert('这个文件不是合法的 JSON：' + e.message);
          }
          file.value = '';
        };
        reader.readAsText(f, 'utf-8');
      });
    }

    var clr = $('btnClear');
    if (clr) {
      clr.addEventListener('click', function () {
        if (!confirm('清空当前内容？草稿也会一起清掉。')) return;
        try { window.localStorage.removeItem(LS_DRAFT); } catch (e) { /* 忽略 */ }
        state = blank();
        sel = 0;
        if (state._fill) state._fill();
        onChange(true);
      });
    }
  }

  /* ---------- 启动 ---------- */
  function init() {
    var draft = null;
    try { draft = window.localStorage.getItem(LS_DRAFT); } catch (e) { draft = null; }

    if (draft) {
      try {
        var d = JSON.parse(draft);
        state = {
          id: d.id || '',
          meta: Object.assign({ title: '', date: today(), summary: '', tags: [], cover: '' }, d.meta || {}),
          blocks: d.blocks || []
        };
      } catch (e) { state = blank(); }
    } else {
      state = blank();
    }

    if (!state.meta.date) state.meta.date = today();

    /* 添加下拉 */
    var selEl = $('addType');
    if (selEl) {
      ALL_TYPES.forEach(function (t) {
        var op = document.createElement('option');
        op.value = t;
        op.textContent = (TYPE_LABEL[t] || t) + (SCHEMA[t] ? '' : '（JSON）');
        selEl.appendChild(op);
      });
    }

    bindMeta();
    if (state._fill) state._fill();
    bindButtons();
    initCollapse();
    initPreviewSize();
    renderList();
    renderForm();
    renderPreview();
    renderOut();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
