import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";
import { hopeTheme } from "vuepress-theme-hope";
import "dotenv/config";

import { encryptedPagesPlugin } from "./plugins/encrypted-pages";

// ---------------------------------------------------------------------------
// 娱乐场（/entertainment/）访问口令
// ---------------------------------------------------------------------------
// 该口令在构建期用于加密受保护页面的正文（AES-256-GCM，密钥由口令经
// PBKDF2-SHA256 派生），产物里只留密文与 KDF 参数；浏览器端用访问者输入的口令
// 派生出同一把密钥解密。实现见 plugins/encrypted-pages.ts 与 client.ts。
//
// 明文不进入仓库：本地构建由项目根目录的 .env 提供（.env 已写入 .gitignore），
// CI 构建由 GitHub Actions Secret 注入，二者都只存在于构建环境。
const ENTERTAINMENT_PASSWORD = process.env.ENTERTAINMENT_PASSWORD;

if (!ENTERTAINMENT_PASSWORD) {
  throw new Error(
    [
      "缺少环境变量 ENTERTAINMENT_PASSWORD（娱乐场访问口令），已终止构建。",
      "  本地构建：在项目根目录创建 .env，写入一行 ENTERTAINMENT_PASSWORD=你的口令",
      "  CI 构建：仓库 Settings → Secrets and variables → Actions → 新建 Secret，名称同上",
      "此处不放行是为了避免漏配时无法加密正文，从而把娱乐场内容以明文发布出去。",
    ].join("\n"),
  );
}

export default defineUserConfig({
  base: "/",

  bundler: viteBundler(),

  plugins: [
    // 构建期加密娱乐场正文，产物中只保留密文
    encryptedPagesPlugin({
      password: ENTERTAINMENT_PASSWORD,
      dir: "entertainment",
    }),
  ],

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
    // - 只保留「一级分组 + 其下的实际页面/子分组」两层，不再有中间的包装分组；
    //   一级分组下只有一个同名同链接页面时，直接退化为普通链接（不再可展开）
    // - 「有子项的分组」不配 link：点击标题只展开/折叠，不跳转到目录页（这类目录页已由
    //   plugins.catalog.exclude 排除，不再生成）
    // - 可展开分组加 collapsible: true（否则 theme-hope 渲染成不可折叠的 <p>，永远全展开）
    // - 分组不配 expanded，默认收起，只显示顶层；点击标题展开/收起，进入某栏目时该分组自动展开
    sidebar: [
        { text: "快捷导航", link: "/navigation/" },
        { text: "学习笔记", link: "/notes/" },
        { text: "计算机知识库", link: "/blog/" },
        { text: "AI 技术专栏", link: "/ai-tech/" },
        { text: "AI 应用技术专栏", link: "/ai-app/" },
        {
          text: "研究中心",
          link: "/research/",
          collapsible: true,
          children: [
            {
              text: "具身智能与 VLA",
              collapsible: true,
              children: [
                "/research/vla/asyncvla-explained.md",
                "/research/vla/vlash-explained.md",
              ],
            },
            {
              text: "数据提取",
              collapsible: true,
              children: [
                "/research/data-extract/X平台科技新闻自动检索方案调研.md",
              ],
            },
          ],
        },
        {
          text: "使用指南",
          link: "/guide/",
          collapsible: true,
          children: [
            "/guide/github-pages-deploy.md",
            "/guide/template-guide.md",
          ],
        },
        {
          text: "娱乐场",
          link: "/entertainment/",
          collapsible: true,
          children: [
            "/entertainment/enter1.md",
          ],
        },
        { text: "关于我", link: "/about/" },
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
    // 已改用 plugins/encrypted-pages.ts：构建期加密正文、产物只留密文，
    // 比主题自带的 encrypt 门禁更彻底（门禁只是不显示，正文仍在源码里）。
    // 因此这里不再配置 theme.encrypt。

    // Markdown 增强
    plugins: {
      // 注册卡片组件，供导航页使用
      components: {
        components: ["Badge", "VPCard"],
      },
      blog: true,
      // 目录插件：默认会为「没有 README 的目录」自动生成一个目录页（标题取自文件夹名）。
      // 侧边栏的分组只做展开/折叠、不跳转，不需要这类落地页，因此排除这几处子目录。
      catalog: {
        exclude: [/^\/research\/(vla|data-extract)\//],
      },
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
