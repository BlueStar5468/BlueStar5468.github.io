/* =========================================================================
   站点内容 —— 你要填的信息全在这里
   -------------------------------------------------------------------------
   规则：
     · 纯文本字段直接写（会自动转义，写 < > 不会坏页面）
     · 标了「可写 HTML」的字段可以塞标签，比如 <em>高亮</em> <span class="hl hl--blue">软件</span>
     · 数组字段：想加一条就复制一行；想删就删掉那一行（末尾逗号别留）
     · 填完刷新页面即可，不用动 index.html / css / main.js

   想控制某一块显示不显示，去 js/config.js（那边是开关，这边是内容）
   ========================================================================= */

window.SITE_CONTENT = {

  /* ══════════════════════════════════════════════════════════
     站点本身（浏览器标签页标题 + 搜索结果摘要）
     ══════════════════════════════════════════════════════════ */
  site: {
    title:       'BlueStar5468',
    description: '泛星际蓝星工作室'
  },

  /* ══════════════════════════════════════════════════════════
     左侧介绍栏
     ══════════════════════════════════════════════════════════ */
  side: {
    /* 头像：
       · 想用自己的图 → 图片丢进 assets/（比如 avatar.jpg），下面写 'assets/avatar.jpg'
       · 留空 '' → 就用 avatar 里的字母生成一个蓝青渐变方块
       图片居中裁成正方形填满，换方的 / 竖的都不会变形 */
    avatarImg: 'assets/avatar.jpg',
    avatar: 'YN',                                  // 字母头像里显示的字，1~2 个字符最好
    status: '开放合作',                            // 右上角小徽章
    name:   'BlueStar5468',
    title:  'BSuniStudio/BlueStar5468',            // 用 " / " 分隔，斜杠会变淡

    // 一行一条
    meta: [
      { icon: '', text: '泛星际蓝星工作室' },
      { icon: '', text: '泛星际蓝星网络组' }
      //{ icon: '📍', text: '' },
      //{ icon: '🎓', text: '' },
      //{ icon: '💼', text: '求职中 · 实习 / 全职' }
    ],

    // 可写 HTML
    bio: '一只手写代码，一只手焊板子。喜欢把想法从 <em>一行代码</em> 做到 <em>一块电路板</em>，再让它跑起来。坚持开放,自由理念',

    // color 可选 'blue'（默认）或 'amber'
    skills: [
      { text: 'TypeScript' }, { text: 'React' }, { text: 'Node.js' }, { text: 'Python' },
      { text: 'C / 嵌入式', color: 'amber' }, { text: 'STM32', color: 'amber' },
      { text: 'ESP32', color: 'amber' }, { text: 'KiCad', color: 'amber' }
    ],

    /* 链接：ico 是左边小方块里的字（2~3 个字符最合适），text 是显示出来的文字。
       邮箱这条把地址本身写在 text 里 —— 侧栏直接显示邮箱地址，别人一眼看到也能选中复制；
       href 用 mailto: 开头，点了才会拉起邮件客户端（href 留空的话，
       render.js 看到 text 像个邮箱会自动帮你补 mailto:）。 */
    links: [
      { ico: 'GH', text: 'GitHub',                    href: 'https://github.com/BlueStar5468' },
      { ico: '@',  text: 'contact@bluestar5468.com', href: 'mailto:contact@bluestar5468.com' },
      //{ ico: 'B',  text: '博客 / 笔记', href: '#' },
      //{ ico: 'CV', text: '简历 PDF',    href: '#' }
    ],

    credit: '由 DSH 与我共同制作'                   // 底部第二行；年份会自动更新
  },

  /* ══════════════════════════════════════════════════════════
     第 1 页 · 概览
     ══════════════════════════════════════════════════════════ */
  overview: {
    eyebrow: 'root@BSuniStudio$~ HELLO, WORLD_ 👋',
    // 可写 HTML：<span class="hl hl--blue">软件</span> 就是蓝色高亮块
    title:   '我做 <span class="hl hl--blue">软件</span>，也做 <span class="hl hl--amber">硬件</span>。',
    lead:    '来自一个人的工作室，从一行代码到一块电路板，全链路把想法做成能跑的东西。往下滚，逐页看我分别在折腾什么。',

    stats: [
      { num: '6+',  label: '年写代码' },
      { num: '20+', label: '项目 / 课程设计' },
      { num: '15+', label: 'PCB 打样' },
      { num: '10+', label: '开源仓库' }
    ],

    // goto 写目标页面的 slug：overview / software / hardware / journey
    quick: [
      { ico: '💻', title: '软件开发', sub: '前端 / 后端 / 工具链', goto: 'software' },
      { ico: '🔌', title: '硬件开发', sub: '固件 / 电路 / PCB',    goto: 'hardware', amber: true },
      { ico: '📄', title: '经历',     sub: '做过的事 & 正在学',    goto: 'journey' }
    ],

    skillsTitle: '技能速览',
    skills: [
      'TypeScript', 'React', 'Node.js', 'Python',
      { text: 'C / 嵌入式', color: 'amber' }, { text: 'STM32', color: 'amber' },
      { text: 'ESP32', color: 'amber' }, { text: 'KiCad', color: 'amber' }
    ]
  },

  /* ══════════════════════════════════════════════════════════
     第 2 页 · 软件开发
     ══════════════════════════════════════════════════════════ */
  software: {
    eyebrow: '01 · SOFTWARE',
    title:   '玩软件',
    desc:    '从界面到服务端，喜欢把东西做得又慢又烂(bushi',

    // 技术栈：每组一张卡
    stack: [
      { title: '前端',      chips: ['不会('] },
      { title: '后端',      chips: ['C#', 'C', 'C++'] },
      { title: '数据 & 云', chips: ['也不会'] },
      { title: '工具链',    chips: ['Git', 'GCC', 'Linux', 'ArmClang'] }
    ],

    projectsTitle: '精选项目',
    // link 留空字符串就不显示「仓库 ↗」那个链接
    projects: [
      { ico: '⚙️', title: 'StarExplorer', desc: '受windowsExplorer气而用C#实现的文件管理器', link: 'https://github.com/BlueStar5468/StarExplorer', linkText: '仓库' },
      { ico: '📊', title: 'Stm32ExtendedLib', desc: '不想用32标准库导致的',   link: 'https://github.com/BlueStar5468/Stm32ExtendedLib', linkText: '仓库' },
      { ico: '🧩', title: '待补充', desc: '摆点什么好呢...',     link: '', linkText: '仓库' }
    ],

    opensourceTitle: '开源 & 社区',
    opensource: [
      { tag: '维护', text: '某 CLI 工具 · 300+ star' },
      { tag: '贡献', text: '某开源项目 · 3 个 PR 被合并' },
      { tag: '写作', text: '技术博客 / 笔记 · 20 篇' }
    ],

    certsTitle: '证书 / 课程',
    certs: ['CET-6', '软考 · 中级', 'CS50', 'MIT 6.824', '阿里云 ACA']
  },

  /* ══════════════════════════════════════════════════════════
     第 3 页 · 硬件开发（这一页的标签自动用橙色）
     ══════════════════════════════════════════════════════════ */
  hardware: {
    eyebrow: '02 · HARDWARE',
    title:   '玩硬件',
    desc:    '其实是硬件玩我（',

    skills: [
      { title: '单片机',     chips: ['STM32', 'ESP32'] },
      { title: '电路设计',   chips: ['KiCad', '立创EDA'] },
      { title: '通信协议',   chips: ['UART', 'I²C', 'SPI', 'CAN'] },
      { title: '', chips: ['', ''] }
    ],

    // value 是 0~100 的百分比
    bars: [
      { label: '嵌入式 C 固件',   value: 85 },
      { label: 'PCB 设计与打样',  value: 75 },
      { label: '硬件调试与测试',  value: 80 }
    ],

    projects: [
      { ico: '🔧', title: 'RK3568板子', desc: '没错就是背景上这张。' },
      { ico: '🛠️', title: '待补充', desc: '啥也没有呢...' }
    ],

    recordsTitle: '打样 / 作品记录',
    records: [
      { tag: '2025', text: '四层板 · 电机驱动 · 打样 2 版' },
      { tag: '2024', text: '双层板 · 传感器节点 · 立创打样' },
      { tag: '2023', text: '洞洞板 · 功放 / 电源练习' }
    ],

    gearTitle: '我的装备台',
    gear: ['恒温焊台', '热风枪', '数字示波器', '可调电源', '万用表', '逻辑分析仪', '3D 打印']
  },

  /* ══════════════════════════════════════════════════════════
     第 4 页 · 经历
     ══════════════════════════════════════════════════════════ */
  journey: {
    eyebrow: '03 · JOURNEY',
    title:   '经历 & 正在学',
    desc:    '各种正在构思但是就是不做的项目',

    timeline: [
      { time: '2024 — 至今', title: '某某公司 · 软件开发实习', desc: '做了什么事情、用到什么技术、带来什么结果。' },
      { time: '2023 — 2024', title: '校园项目 / 实验室',       desc: '负责模块与产出，例如把某流程自动化、节省多少时间。' },
      { time: '2022 — 2023', title: '第一块自己画的板子',      desc: '从抄原理图到独立布局布线，踩过的坑写在博客里。' }
    ],

    honorsTitle: '荣誉 / 奖项',
    honors: [
      { tag: '国家级', text: '全国大学生电子设计竞赛 · 二等奖' },
      { tag: '省级',   text: '蓝桥杯 · 软件类 一等奖' },
      { tag: '校级',   text: '某某奖学金 / 优秀学生干部' }
    ],

    learningTitle: '最近在折腾',
    learning: [
      'FPGA', 'OpenGL',
      { text: 'Risc-V', color: 'amber' }, { text: '2D加速引擎', color: 'amber' }
    ],

    note: '再往下滚，就真正到底了'
  },

  /* ══════════════════════════════════════════════════════════
     落地页（滚到底之后那一屏）
     ══════════════════════════════════════════════════════════ */
  landing: {
    eyebrow: '关于',
    // 这是「可写 HTML」的字段：想换行要写 <br />，直接敲 \n 在 HTML 里会变成一个空格
    title:   '想加入泛星际蓝星工作室?<br />或者只是想找我?',
    desc:    '有什么想交流的，欢迎找我。',

    // primary: true 的那个是实心蓝按钮
    buttons: [
      { text: '发邮件给我', href: 'mailto:contact@bluestar5468.com', primary: true },
      { text: 'GitHub ↗',   href: 'https://github.com/BlueStar5468' },
      //{ text: '简历 PDF ↗', href: '#' }
    ],

    foot: '托管于 GitHub Pages'   // 会拼成「© 年份 你的名字 · 这段」
  }
};
