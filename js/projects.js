/* =========================================================================
   项目页的筛选逻辑（projects.html 专用）
   -------------------------------------------------------------------------
   卡片是 render.js 根据 js/content.js 的 projects.items 生成的，
   这个文件只负责：数数、切换分类、更新计数、把筛选状态写进地址栏。
   ========================================================================= */

(function () {
  'use strict';

  var grid  = document.querySelector('.pgrid');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.pcard'));
  var btns  = Array.prototype.slice.call(document.querySelectorAll('.filter'));
  var empty = document.getElementById('pempty');
  var count = document.getElementById('pcount');

  /* ---- 1. 每个分类有几张卡 ---- */
  var tally = { all: cards.length };
  cards.forEach(function (c) {
    var k = c.getAttribute('data-cat') || 'all';
    tally[k] = (tally[k] || 0) + 1;
  });

  /* ---- 2. 把数量填进按钮，并绑点击 ---- */
  btns.forEach(function (b) {
    var k = b.getAttribute('data-filter') || 'all';
    var n = b.querySelector('.filter__n');
    if (n) n.textContent = tally[k] || 0;
    b.addEventListener('click', function () { apply(k); });
  });

  /* ---- 3. 应用筛选 ---- */
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

    if (empty) empty.hidden = shown > 0;
    if (count) count.textContent = '共 ' + shown + ' 个项目';

    // 地址栏同步（可以分享带筛选的链接）；file:// 下 replaceState 会报错，忽略即可
    try {
      var url = k === 'all' ? location.pathname : location.pathname + '?cat=' + encodeURIComponent(k);
      history.replaceState(null, '', url);
    } catch (e) { /* 忽略 */ }
  }

  /* ---- 4. 初始化：支持从地址栏读 ?cat=software ---- */
  var m = /[?&]cat=([\w-]+)/.exec(location.search);
  var start = m ? m[1] : 'all';
  // 地址里写了个不存在的分类，就退回「全部」
  if (start !== 'all' && !tally[start]) start = 'all';
  apply(start);
})();
