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

    // 侧边栏
    sidebar: "structure",

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
    // 注意：这里填写的是密码的 bcrypt 哈希（不是明文密码）
    encrypt: {
      config: {
        "/entertainment/": ["$2a$10$pKE76iVUdm4/JrPyjJGCMOTerthJCUBSxMEgdMYS0F3oyPX6BlNC6"],
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
