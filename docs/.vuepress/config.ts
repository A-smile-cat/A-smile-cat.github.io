import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";
import { hopeTheme } from "vuepress-theme-hope";

export default defineUserConfig({
  base: "/",

  bundler: viteBundler(),

  lang: "zh-CN",
  title: "A-smile-cat",
  description: "A-smile-cat 的个人网站",

  // 霞鹜文楷字体
  head: [
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://cdnjs.cloudflare.com/ajax/libs/lxgw-wenkai-screen-webfont/1.7.0/style.css",
        integrity:
          "sha512-A2sVEqmNCGCac7ji4czWLqCVSn28L0U5lSobS173H+gk+QTV6rH0EH0QEnYk5mz3KPRDmEr+GKM1hfdfLrsFpg==",
        crossorigin: "anonymous",
        referrerpolicy: "no-referrer",
      },
    ],
  ],

  theme: hopeTheme({
    // 导航栏
    navbar: [
      { text: "快捷导航", link: "/navigation/", icon: "mdi:compass" },
      { text: "学习笔记", link: "/notes/", icon: "mdi:notebook-outline" },
      { text: "计算机知识库", link: "/blog/", icon: "mdi:book-open-variant" },
      { text: "AI 技术专栏", link: "/ai-tech/", icon: "mdi:robot-outline" },
      { text: "AI 应用技术专栏", link: "/ai-app/", icon: "mdi:application-brackets-outline" },
      { text: "研究中心", link: "/research/", icon: "mdi:flask-outline" },
      { text: "使用指南", link: "/guide/", icon: "mdi:map-marker-radius-outline" },
      { text: "娱乐场", link: "/entertainment/", icon: "mdi:gamepad-variant-outline" },
      { text: "关于我", link: "/about/", icon: "mdi:account-outline" },
    ],

    // 侧边栏（显式配置）
    // - 用数组形式 = 全站统一侧边栏，每个页面都显示同一套目录（对象形式则是按路径分块，访问哪显示哪）
    // - 一级分组顺序与 navbar 保持一致
    // - 所有可展开分组加 collapsible: true（否则 theme-hope 渲染成不可折叠的 <p>，永远全展开）
    // - 分组不配 expanded，默认收起，只显示顶层；点击标题展开/收起，进入某栏目时该分组自动展开
    sidebar: [
        {
          text: "快捷导航",
          link: "/navigation/",
          collapsible: true,
          children: [
            {
              text: "导航页面",
              link: "/navigation/",
              collapsible: true,
              children: [
                { text: "快捷导航", link: "/navigation/" },
              ],
            },
          ],
        },
        {
          text: "学习笔记",
          link: "/notes/",
          collapsible: true,
          children: [
            {
              text: "笔记页面",
              link: "/notes/",
              collapsible: true,
              children: [
                { text: "学习笔记", link: "/notes/" },
              ],
            },
          ],
        },
        {
          text: "计算机知识库",
          link: "/blog/",
          collapsible: true,
          children: [
            {
              text: "知识库页面",
              link: "/blog/",
              collapsible: true,
              children: [
                { text: "计算机知识库", link: "/blog/" },
              ],
            },
          ],
        },
        {
          text: "AI 技术专栏",
          link: "/ai-tech/",
          collapsible: true,
          children: [
            {
              text: "专栏页面",
              link: "/ai-tech/",
              collapsible: true,
              children: [
                { text: "AI 技术专栏", link: "/ai-tech/" },
              ],
            },
          ],
        },
        {
          text: "AI 应用技术专栏",
          link: "/ai-app/",
          collapsible: true,
          children: [
            {
              text: "专栏页面",
              link: "/ai-app/",
              collapsible: true,
              children: [
                { text: "AI 应用技术专栏", link: "/ai-app/" },
              ],
            },
          ],
        },
        {
          text: "研究中心",
          link: "/research/",
          collapsible: true,
          children: [
            {
              text: "科研相关",
              link: "/research/ky-keyan/",
              collapsible: true,
              children: [
                {
                  text: "具身智能与 VLA",
                  link: "/research/ky-keyan/ju-shen-zhi-neng-yu-vla/",
                  collapsible: true,
                  children: [
                    "/research/ky-keyan/ju-shen-zhi-neng-yu-vla/asyncvla-explained.md",
                    "/research/ky-keyan/ju-shen-zhi-neng-yu-vla/vlash-explained.md",
                  ],
                },
                {
                  text: "数据提取",
                  link: "/research/ky-keyan/shu-ju-ti-qu/",
                  collapsible: true,
                  children: [
                    "/research/ky-keyan/shu-ju-ti-qu/X平台科技新闻自动检索方案调研.md",
                  ],
                },
              ],
            },
          ],
        },
        {
          text: "使用指南",
          link: "/guide/",
          collapsible: true,
          children: [
            {
              text: "指南文章",
              link: "/guide/",
              collapsible: true,
              children: [
                "/guide/github-pages-deploy.md",
                "/guide/template-guide.md",
              ],
            },
          ],
        },
        {
          text: "娱乐场",
          link: "/entertainment/",
          collapsible: true,
          children: [
            {
              text: "娱乐内容",
              link: "/entertainment/",
              collapsible: true,
              children: [
                "/entertainment/enter1.md",
              ],
            },
          ],
        },
        {
          text: "关于我",
          link: "/about/",
          collapsible: true,
          children: [
            {
              text: "关于页面",
              link: "/about/",
              collapsible: true,
              children: [
                { text: "关于我", link: "/about/" },
              ],
            },
          ],
        },
    ],

    // 图标资源（Iconify，供 navbar 图标与 FontIcon 使用）
    iconAssets: "iconify",

    // 社交链接
    social: [
      {
        icon: "github",
        link: "https://github.com/A-smile-cat",
      },
    ],

    // 页脚
    footer:
      'Powered by <a href="https://v2.vuepress.vuejs.org/zh/" target="_blank"> VuePress </a> | Theme <a href="https://theme-hope.vuejs.press/zh/" target="_blank"> Hope </a>',
    displayFooter: true,
    copyright: "Copyright © 2024 - present A-smile-cat",

    // 博客配置
    blog: {
      name: "A-smile-cat",
      description: "热爱技术的开发者",
      intro: "/about/",
      medias: {
        GitHub: "https://github.com/A-smile-cat",
      },
    },

    // 加密（可选）
    // 注意：这里填写密码的 bcrypt 哈希（不是明文密码）
    // 已通过 patches/ 补丁移除 theme-hope rc.61 构建端对配置值的二次 hashSync，
    // 客户端浏览器直接 compareSync(输入密码, 哈希) 比对，明文不出现在仓库/产物中
    encrypt: {
      config: {
        "/entertainment/": ["$2a$10$VwRaDfaV937Ea/qC5b.pLOM94TH5/yif5kBZfg3TlHj7UfxPKXtsu"],
      },
    },

    // Markdown 增强
    plugins: {
      // 注册卡片组件，供导航页使用
      components: {
        components: ["Badge", "VPCard"],
      },
      blog: true,
      mdEnhance: {
        align: true,
        attrs: true,
        chart: true,
        codetabs: true,
        component: true,
        demo: true,
        echarts: true,
        figure: true,
        flowchart: true,
        gfm: true,
        imgLazyload: true,
        imgSize: true,
        include: true,
        mark: true,
        markmap: true,
        mermaid: true,
        playground: {
          presets: ["ts", "vue"],
        },
        presentation: ["highlight", "math", "search", "notes", "zoom"],
        stylize: [
          {
            matcher: "Recommended",
            replacer: ({ tag }) => {
              if (tag === "em")
                return {
                  tag: "Badge",
                  attrs: { type: "tip" },
                  content: "Recommended",
                };
            },
          },
        ],
        sub: true,
        sup: true,
        tabs: true,
        vPre: true,
        vuePlayground: true,
      },
    },
  }),
});
