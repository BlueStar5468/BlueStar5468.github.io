/* =========================================================
   个人主页 · 交互脚本
   ---------------------------------------------------------
   右侧主内容是"滚动驱动的分页叙事"：
     · deck 是一条高 N 屏的滚动跑道，stage 在里面被 position:sticky 钉住
     · 滚动量映射成页码 p（0 … N-1），相邻两页按距离交叉淡入淡出 + 位移 + 模糊
     · 强调色（蓝 / 橙）随当前页切换，背景光晕交叉过渡
     · 最后一页走完，stage 自然解除钉住 → 真正往下滚到落地页
   窄屏 / 内容一屏放不下 / 用户偏好减少动效时，自动降级成普通流滚动。
   ========================================================= */

(function () {
  'use strict';

  var root  = document.documentElement;
  var deck  = document.getElementById('deck');
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));
  var rails = Array.prototype.slice.call(document.querySelectorAll('.rail__item'));
  var bar   = document.getElementById('progress');
  var hint  = document.getElementById('hint');
  var bars  = document.querySelector('.bars');
  var N     = pages.length;

  if (!deck || !N) return; // 结构不对就别跑了

  var inners = pages.map(function (p) { return p.querySelector('.page__inner') || p; });

  var narrowMQ = window.matchMedia('(max-width: 860px)');
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  var pinned  = false;   // true = 钉住 + 交叉淡入模式
  var started = false;
  var active  = -1;      // 当前页索引
  var hashReady = false; // 初始化跳页前先不要写 hash
  var geo = { top: 0, vh: 0, runway: 1 };
  var raf = null;
  var flowIO = null;

  var clamp  = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var smooth = function (t) { return t * t * (3 - 2 * t); };

  /* =============== 一屏放得下吗（与当前模式无关的测量） =============== */
  function fits() {
    var vh = window.innerHeight;
    // 钉住模式下页面上下内边距的近似值 + 安全余量
    var pad = clamp(vh * 0.165, 106, 176) + 14;
    var avail = vh - pad;
    for (var i = 0; i < N; i++) {
      if (inners[i].scrollHeight > avail) return false;
    }
    return true;
  }

  /* =============== 几何测量 =============== */
  function measure() {
    geo.vh = window.innerHeight;
    geo.top = deck.getBoundingClientRect().top + window.pageYOffset;
    geo.runway = Math.max(1, deck.offsetHeight - geo.vh);
  }

  /* =============== 应用当前页：强调色 / 导航高亮 / 地址 hash =============== */
  function apply() {
    var page = pages[active];
    if (!page) return;

    root.setAttribute('data-accent', page.dataset.accent || 'blue');
    rails.forEach(function (r, i) { r.classList.toggle('is-active', i === active); });

    // 硬件页的熟练度进度条，进入该页时才播动画
    if (bars && page.contains(bars)) bars.classList.add('is-inview');

    if (hashReady) {
      var slug = page.dataset.slug;
      try {
        if (slug && location.hash.slice(1) !== slug) {
          history.replaceState(null, '', '#' + slug);
        }
      } catch (err) { /* file:// 下可能被拦，忽略 */ }
    }
  }

  /* =============== 钉住模式：按滚动量渲染每一帧 =============== */
  function render() {
    var y = clamp(window.pageYOffset - geo.top, 0, geo.runway);
    var p = (y / geo.runway) * (N - 1);   // 页码，浮点
    var idx = clamp(Math.round(p), 0, N - 1);

    for (var i = 0; i < N; i++) {
      var el = pages[i];
      var d = p - i;
      var a = clamp(Math.abs(d), 0, 1);   // 0 = 完全在台上，1 = 完全退场
      var e = smooth(a);

      el.style.opacity = (1 - e).toFixed(3);
      el.style.transform = 'translate3d(0,' + (30 * clamp(-d, -1, 1)).toFixed(2) +
                           'px,0) scale(' + (1 - 0.03 * e).toFixed(4) + ')';
      el.style.filter = a > 0.01 ? 'blur(' + (5 * e).toFixed(2) + 'px)' : '';
      el.style.pointerEvents = a > 0.3 ? 'none' : '';
      el.style.visibility = a >= 1 ? 'hidden' : '';
      el.setAttribute('aria-hidden', a > 0.5 ? 'true' : 'false');
    }

    if (idx !== active) { active = idx; apply(); }

    if (bar) bar.style.width = (clamp(y / geo.runway, 0, 1) * 100).toFixed(2) + '%';
    if (hint) hint.classList.toggle('is-hidden', p > 0.1);
  }

  /* =============== 普通流模式：谁在视口中间谁就是当前页 =============== */
  function pickActiveByCenter() {
    var mid = window.innerHeight * 0.45;
    var best = 0, bestD = Infinity;
    for (var i = 0; i < N; i++) {
      var r = pages[i].getBoundingClientRect();
      var d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best !== active) { active = best; apply(); }
    if (hint) hint.classList.toggle('is-hidden', window.pageYOffset > 120);
  }

  function buildFlow() {
    if ('IntersectionObserver' in window && !flowIO) {
      flowIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('in-view');
          if (bars && en.target.contains(bars)) bars.classList.add('is-inview');
        });
      }, { threshold: 0.18, rootMargin: '-8% 0px -25% 0px' });
      pages.forEach(function (p) { flowIO.observe(p); });
    }
    pickActiveByCenter();
  }

  /* =============== 模式切换 =============== */
  function clearInline() {
    pages.forEach(function (p) {
      p.style.opacity = ''; p.style.transform = ''; p.style.filter = '';
      p.style.pointerEvents = ''; p.style.visibility = '';
      p.removeAttribute('aria-hidden');
    });
  }

  function setMode() {
    var want = !narrowMQ.matches && !reduceMQ.matches && fits();

    if (started && want === pinned) {        // 模式没变，只重新量一次
      if (pinned) { measure(); render(); } else { pickActiveByCenter(); }
      return;
    }

    pinned = want;
    started = true;

    if (pinned) {
      deck.classList.remove('is-flow');
      if (flowIO) { flowIO.disconnect(); flowIO = null; }
      measure();
      render();
    } else {
      deck.classList.add('is-flow');
      clearInline();
      active = -1;
      if (hint) hint.classList.add('is-hidden');
      buildFlow();
      if (window.console && console.info) {
        console.info('[portfolio] 已切换为普通滚动模式：' +
          (narrowMQ.matches ? '视口较窄' : reduceMQ.matches ? '系统开启了减少动态效果' : '有页面内容超出一屏'));
      }
    }
  }

  /* =============== 跳到某一页 =============== */
  // data-goto 支持两种写法：页面 slug（推荐，比如 "software"）或页序数字。
  // 用 slug 而不是页码，这样在 config.js 里关掉某一页之后，剩下的仍然指得对。
  function indexOfTarget(target) {
    if (target === null || target === undefined || target === '') return 0;
    if (/^-?\d+$/.test(String(target))) return clamp(parseInt(target, 10), 0, N - 1);
    for (var i = 0; i < N; i++) {
      if (pages[i].dataset.slug === target) return i;
    }
    return 0;
  }

  function goTo(i, instant) {
    i = clamp(i, 0, N - 1);
    var top, r;

    if (pinned) {
      top = geo.top + (geo.runway * i) / Math.max(1, N - 1);
    } else {
      r = pages[i].getBoundingClientRect();
      top = r.top + window.pageYOffset - 10;
    }
    top = Math.round(top);

    if (instant || reduceMQ.matches) {
      window.scrollTo(0, top);
    } else {
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
    if (instant) { active = -1; if (pinned) render(); else pickActiveByCenter(); }
  }

  /* =============== 事件 =============== */
  function tick() {
    raf = null;
    if (pinned) render(); else pickActiveByCenter();
  }
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(tick);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { setMode(); onScroll(); });
  window.addEventListener('load', function () { setMode(); onScroll(); });

  if (narrowMQ.addEventListener) {
    narrowMQ.addEventListener('change', setMode);
    reduceMQ.addEventListener('change', setMode);
  } else if (narrowMQ.addListener) {
    narrowMQ.addListener(setMode);
    reduceMQ.addListener(setMode);
  }

  window.addEventListener('hashchange', function () {
    var slug = location.hash.slice(1);
    for (var i = 0; i < N; i++) {
      if (pages[i].dataset.slug === slug) { goTo(i); return; }
    }
  });

  // 任何带 data-goto 的元素都能跳页（右侧章节导航 + 概览页的快捷卡）
  Array.prototype.forEach.call(document.querySelectorAll('[data-goto]'), function (el) {
    el.addEventListener('click', function () {
      goTo(indexOfTarget(el.getAttribute('data-goto')));
    });
  });

  // 键盘：焦点在章节导航上时用方向键翻页
  rails.forEach(function (btn, i) {
    btn.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = i + 1;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = i - 1;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = N - 1;
      if (next === null) return;
      e.preventDefault();
      e.stopPropagation();
      next = clamp(next, 0, N - 1);
      goTo(next);
      rails[next].focus();
    });
  });

  // 键盘翻页：钉住模式下按整屏走，配合"翻页"手感
  window.addEventListener('keydown', function (e) {
    if (!pinned || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    var t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName)) return;

    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goTo(active + 1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goTo(active - 1); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    else if (e.key === 'End') { e.preventDefault(); goTo(N - 1); }
  });

  // 字体加载 / 内容变化会让高度变，重新量一次
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function () { setMode(); onScroll(); });
    inners.forEach(function (el) { ro.observe(el); });
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { setMode(); onScroll(); });
  }

  /* =============== 初始化 =============== */
  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('#year, #yearB'), function (el) {
      el.textContent = new Date().getFullYear();
    });

    deck.style.setProperty('--pages', N);
    setMode();

    // 支持 #software / #hardware 之类直达某一页
    var slug = location.hash.slice(1);
    if (slug) {
      for (var i = 0; i < N; i++) {
        if (pages[i].dataset.slug === slug) { goTo(i, true); break; }
      }
    }
    hashReady = true;
    apply();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
