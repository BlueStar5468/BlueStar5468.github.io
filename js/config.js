/* =========================================================================
   站点配置 —— 所有「可配置的地方」都集中在这一个文件里
   -------------------------------------------------------------------------
   用法：把 true 改成 false 就是「关掉」。
        关掉 = 该元素直接从页面里移除，所以布局会自动收紧（不会留空位）。
        改完刷新页面即可，不用动 index.html / css / 其它 js。

   注意：
     · 整页开关（page.*）同时也控制右侧对应的导航点，两个一起消失。
     · 关掉所有页面也不会报错，只是没有内容。
     · 想加一个自己的开关：给元素加 data-cfg="你的key"，再来这里写一行。
     · 拼错的 key 或没配的 data-cfg，会在浏览器控制台 warn 出来。
   ========================================================================= */

(function () {
  'use strict';

  var SITE = {

    /* ══════════ 整页（4 个滚动页 + 落地页）══════════ */
    'page.overview':  true,   // 第 1 页 · 概览
    'page.software':  true,   // 第 2 页 · 软件开发
    'page.hardware':  true,   // 第 3 页 · 硬件开发
    'page.journey':   true,   // 第 4 页 · 经历
    'ui.landing':     true,   // 滚到底之后的联系页

    /* ══════════ 全局零件 ══════════ */
    'ui.sidebar':     true,   // 左侧整栏
    'ui.rail':        true,   // 右侧章节导航点
    'ui.progress':    true,   // 顶部滚动进度线
    'ui.hint':        true,   // 第 1 页的「向下滚动」提示
    'ui.glow':        true,   // 随板块变色的背景光晕

    /* ══════════ 左侧介绍栏（逐块）══════════ */
    'side.avatar':    true,   // 头像 + 右侧状态徽章
    'side.status':    false,   // 「开放合作」徽章
    'side.name':      true,   // 姓名 + 身份那两行
    'side.meta':      true,   // 城市 / 学校 / 求职状态三行
    'side.bio':       true,   // 一句话自我介绍
    'side.skills':    false,   // 「技能速览」标题 + 标签
    'side.links':     true,   // 「找到我」标题 + 四个链接
    'side.credit':    true,   // 底部版权 / 署名

    /* ══════════ 第 1 页 · 概览 ══════════ */
    'ov.stats':       false,   // 四个数字卡
    'ov.quick':       true,   // 三张快捷跳转卡
    'ov.skills':      false,   // 技能速览标签卡
    'deco.bridge':    true,   // 装饰：`</>` 接丝印元件外框
    'deco.tokens':    true,   // 装饰：零散技术词（{ }、git push…）

    /* ══════════ 第 2 页 · 软件开发 ══════════ */
    'sw.stack':       true,   // 技术栈四张卡
    'sw.projects':    true,   // 「精选项目」标题 + 三张项目卡
    'sw.opensource':  false,   // 开源 & 社区列表
    'sw.certs':       false,   // 证书 / 课程标签
    'deco.hexstack':  true,   // 装饰：C / C++ / C# 六边形堆叠
    'deco.opengl':    true,   // 装饰：OpenGL logo
    'deco.linux':     true,   // 装饰：Tux + Linux
    'deco.binary':    true,   // 装饰：二进制彩蛋
    'deco.elf':       true,   // 装饰：readelf 输出

    /* ══════════ 第 3 页 · 硬件开发 ══════════ */
    'hw.skills':      true,   // 硬件技能四张卡
    'hw.bars':        false,   // 熟练度进度条
    'hw.projects':    true,   // 硬件项目两张卡
    'hw.records':     false,   // 打样 / 作品记录
    'hw.gear':        false,   // 装备台标签
    'deco.pcb':       true,   // 装饰：PCB 走线 + 过孔
    'deco.silkscreen':true,   // 装饰：丝印层（U1 外框 / 位号）
    'deco.layoutShot':true,   // 装饰：整张布线图铺右上角
    'deco.boardShot': true,   // 装饰：焊接实物照片

    /* ══════════ 第 4 页 · 经历 ══════════ */
    'jn.timeline':    false,   // 时间线
    'jn.honors':      false,   // 荣誉 / 奖项
    'jn.learning':    true,   // 最近在折腾
    'jn.note':        true,   // 「再往下滚就到底了」提示
    'deco.path':      true,   // 装饰：向上的里程碑折线
    'deco.jTokens':   true    // 装饰：TODO / next → / keep going
  };

  /* ───────── 下面是执行逻辑，一般不用改 ───────── */

  window.SITE_CONFIG = SITE;   // 控制台里可以直接看：SITE_CONFIG['page.software']

  var nodes = document.querySelectorAll('[data-cfg]');
  var present = {};
  var removed = [];

  for (var i = 0; i < nodes.length; i++) {
    var key = nodes[i].getAttribute('data-cfg');
    present[key] = true;
  }
  // 倒序删，避免 index 错位
  for (var j = nodes.length - 1; j >= 0; j--) {
    var el = nodes[j];
    var k = el.getAttribute('data-cfg');
    if (SITE[k] === false && el.parentNode) {
      el.parentNode.removeChild(el);
      if (removed.indexOf(k) < 0) removed.push(k);
    }
  }

  if (typeof console !== 'undefined' && console.info) {
    console.info('[config] 已关闭 ' + removed.length + ' 项：' + (removed.join(', ') || '（无）'));

    var unused = Object.keys(SITE).filter(function (k) { return !present[k]; });
    if (unused.length) console.warn('[config] 这些配置项在页面里找不到对应元素（拼错了？）：', unused.join(', '));

    var unset = Object.keys(present).filter(function (k) { return !(k in SITE); });
    if (unset.length) console.warn('[config] 这些 data-cfg 没在 config.js 里配置（默认开启）：', unset.join(', '));
  }
})();
