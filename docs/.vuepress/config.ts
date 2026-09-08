import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";
import { hopeTheme } from "vuepress-theme-hope";

export default defineUserConfig({
  base: "/",

  bundler: viteBundler(),

  lang: "zh-CN",
  title: "A-smile-cat",
  description: "A-smile-cat 的个人网站",

  theme: hopeTheme({
    // 导航栏
    navbar: [
      { text: "首页", link: "/" },
      { text: "博客", link: "/blog/" },
      { text: "笔记", link: "/notes/" },
    ],

    // 侧边栏
    sidebar: "structure",

    // 社交链接
    social: [
      {
        icon: "github",
        link: "https://github.com/A-smile-cat",
      },
    ],

    // 页脚
    footer: "默认页脚",
    displayFooter: true,

    // 博客配置
    blog: {
      description: "一个热爱技术的开发者",
      intro: "/intro.html",
      medias: {
        GitHub: "https://github.com/A-smile-cat",
      },
    },

    // 加密（可选）
    encrypt: {},

    // Markdown 增强
    plugins: {
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
