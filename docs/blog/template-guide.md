---
title: 📖 博客模板使用指南
date: 2024-01-01
sticky: 100
star: true
category: 指南
tags:
  - VuePress
  - 教程
---

本文介绍本站模板的日常使用方法，包括更换头像、编写文章、提交推送等常见操作。

<!-- more -->

## 项目结构

```
A-smile-cat.github.io/
├── .github/workflows/deploy.yml   ← GitHub Actions 自动部署
├── docs/
│   ├── .vuepress/
│   │   ├── config.ts              ← 站点 + 主题配置
│   │   ├── client.ts              ← 自定义客户端脚本（打字机、页脚等）
│   │   ├── public/                ← 静态资源（图片、图标等）
│   │   │   ├── logo.svg           ← 网站 Logo / 头像
│   │   │   └── hero-bg.jpg        ← 首页全屏背景图
│   │   └── styles/
│   │       └── custom.scss        ← 自定义样式
│   ├── README.md                  ← 首页配置（frontmatter）
│   ├── intro.md                   ← 「关于我」页面
│   ├── blog/                      ← 📝 博客文章放这里
│   │   ├── README.md
│   │   └── template-guide.md      ← 就是本篇
│   └── notes/                     ← 📚 笔记放这里
│       └── README.md
└── package.json
```

## 一、更换头像 / Logo

头像文件是 `docs/.vuepress/public/logo.svg`。

### 方法 1：替换文件（推荐）

1. 准备一张正方形的图片，比如 `avatar.png`
2. 把它放到 `docs/.vuepress/public/` 目录下
3. 修改首页 frontmatter 里的 `heroImage` 路径：

```yaml
# docs/README.md
heroImage: /avatar.png        # 亮色模式
heroImageDark: /avatar.png    # 暗色模式（可设不同图片）
```

### 方法 2：用外部链接

```yaml
heroImage: https://your-cdn.com/avatar.png
```

> **提示**：`public/` 目录下的文件会被原样复制到构建产物的根目录，所以路径用 `/文件名` 即可。

---

## 二、更换首页背景图

背景图文件是 `docs/.vuepress/public/hero-bg.jpg`。

1. 准备一张高清宽图（建议 1920×1080 以上）
2. 替换 `docs/.vuepress/public/hero-bg.jpg`
3. 如果想用暗色模式不同背景，在 `docs/README.md` 中设置：

```yaml
bgImage: /hero-bg.jpg
bgImageDark: /hero-bg-dark.jpg    # 暗色模式背景
```

设置 `bgImage: false` 可以关闭背景图。

---

## 三、修改首页信息

首页由 `docs/README.md` 的 frontmatter 控制：

```yaml
---
home: true
layout: BlogHome
title: A-smile-cat
heroImage: /logo.svg              # 头像
heroText: A-smile-cat             # 大标题
tagline: 一只敲代码时会碎碎念的程序喵  # 副标题
heroFullScreen: true              # 首屏全屏显示
bgImage: /hero-bg.jpg             # 背景图

# 操作按钮
actions:
  - text: 博客
    link: /blog/
    type: primary
  - text: 笔记
    link: /notes/

# 功能特性卡片
features:
  - title: JavaGuide
    details: Java面试 + 学习指南
    link: https://javaguide.cn/
  - title: 小林coding
    details: 计算机基础
    link: https://www.xiaolincoding.com/
  - title: Leetcode
    details: 力扣
    link: https://leetcode.cn/
---
```

### 打字机动画

打字机效果在 `docs/.vuepress/client.ts` 中配置，修改 `taglines` 数组即可：

```ts
const taglines = [
  "一只敲代码时会碎碎念的程序喵 🐱",
  "热爱技术，享受编码的乐趣 💻",
  "持续学习，不断成长 🚀",
];
```

---

## 四、编写新文章

### 4.1 创建文件

在 `docs/blog/` 目录下新建 `.md` 文件：

```bash
docs/blog/my-first-post.md
```

### 4.2 编写 Frontmatter

每个文章开头需要写 YAML frontmatter：

```yaml
---
title: 文章标题
date: 2024-01-15           # 发布日期
category: 技术笔记          # 分类（只能一个）
tags:                      # 标签（可以多个）
  - VuePress
  - 前端
sticky: 1                  # 置顶权重（数字越大越靠前，不写则不置顶）
star: true                 # 是否标记为星标文章
---
```

### 4.3 编写正文

正文就是普通 Markdown，支持 VuePress Theme Hope 增强语法：

```markdown
---
title: 我的第一篇文章
date: 2024-01-15
category: 随笔
tags:
  - 随笔
---

这里是文章摘要，会在列表中显示。

<!-- more -->

这里是正文内容，`<!-- more -->` 之后的部分只在文章详情页显示。

## 二级标题

正文内容...
```

> **重要**：`<!-- more -->` 标记用于分隔摘要和正文。列表页只显示摘要部分。

### 4.4 文章分类与标签

- **category**（分类）：每篇文章只能属于一个分类
- **tags**（标签）：每篇文章可以有多个标签

分类和标签页面会自动生成，无需手动创建。

### 4.5 常用 Frontmatter 速查

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 文章标题（必填） |
| `date` | date | 发布日期（必填，用于排序） |
| `category` | string | 分类 |
| `tags` | string[] | 标签数组 |
| `sticky` | number | 置顶权重 |
| `star` | boolean | 星标文章 |
| `draft` | boolean | 草稿（不会发布） |
| `excerpt` | boolean | 是否启用摘要 |
| `cover` | string | 文章封面图 |
| `icon` | string | 文章图标 |

---

## 五、编写笔记

笔记放在 `docs/notes/` 目录下，写法和博客文章一样：

```bash
docs/notes/vue-basics.md
```

---

## 六、本地预览

```bash
# 安装依赖（首次）
npm install

# 启动开发服务器
npm run docs:dev
```

浏览器打开 `http://localhost:8080` 即可预览。修改文件后页面会自动热更新。

---

## 七、提交推送

每次写完文章或修改内容后，需要提交到 Git 并推送到 GitHub：

```bash
# 1. 查看修改了哪些文件
git status

# 2. 添加所有修改
git add -A

# 3. 提交（引号内写本次修改说明）
git commit -m "blog: 新增文章《我的第一篇文章》"

# 4. 推送到 GitHub
git push origin master
```

推送后，GitHub Actions 会自动构建并部署到 GitHub Pages，大约 1-2 分钟后网站就会更新。

### 提交信息规范

建议使用以下前缀：

| 前缀 | 用途 |
|------|------|
| `blog:` | 新增或修改博客文章 |
| `note:` | 新增或修改笔记 |
| `style:` | 修改样式、美化 |
| `feat:` | 新增功能 |
| `fix:` | 修复问题 |
| `docs:` | 修改文档 |

---

## 八、常用配置修改

### 修改导航栏

编辑 `docs/.vuepress/config.ts` 中的 `navbar`：

```ts
navbar: [
  { text: "首页", link: "/" },
  { text: "博客", link: "/blog/" },
  { text: "笔记", link: "/notes/" },
  { text: "友链", link: "/friends/" },   // 新增
],
```

### 修改社交链接

编辑 `config.ts` 中的 `social` 和 `blog.medias`：

```ts
social: [
  { icon: "github", link: "https://github.com/A-smile-cat" },
],

blog: {
  name: "A-smile-cat",
  description: "热爱技术的开发者",
  intro: "/intro.html",
  medias: {
    GitHub: "https://github.com/A-smile-cat",
    // QQ: "https://your-qq-link",
    // 微博: "https://your-weibo-link",
  },
},
```

### 修改页脚

编辑 `config.ts` 中的 `footer` 和 `copyright`。

### 修改建站起始时间

编辑 `docs/.vuepress/client.ts` 中的 `startDate`：

```ts
const startDate = new Date("2024-01-01T00:00:00"); // 改成你的建站日期
```

### 修改全局字体

当前使用「霞鹜文楷」字体，在 `config.ts` 的 `head` 中修改 CDN 链接即可更换。

---

## 九、目录与侧边栏

侧边栏配置为 `"structure"`，即自动根据目录结构生成。

你可以通过 frontmatter 控制页面在侧边栏中的排序：

```yaml
---
title: 笔记
index: false          # 是否在列表中显示
dir:
  order: 1            # 排序权重（数字越小越靠前）
---
```

---

## 十、部署说明

本站使用 **GitHub Actions** 自动部署：

1. 你只需要 `git push` 到 `master` 分支
2. GitHub Actions 自动执行 `npm run docs:build`
3. 构建产物自动部署到 GitHub Pages
4. 约 1-2 分钟后，`https://a-smile-cat.github.io` 更新

### 首次部署设置

1. 打开 GitHub 仓库 → **Settings → Pages**
2. Source 选择 **GitHub Actions**（不是 "Deploy from a branch"）
3. 保存即可

---

## 十一、常见问题

### Q: 文章没有显示？

- 检查 frontmatter 是否正确（尤其是 `---` 分隔符）
- 检查文件是否放在 `docs/blog/` 或 `docs/notes/` 目录下
- 检查 `date` 字段是否已填写

### Q: 置顶不生效？

- 确保 frontmatter 中有 `sticky: 数字`，数字越大越靠前
- 需要在 `config.ts` 中开启博客插件（已默认开启）

### Q: 构建失败？

- 本地运行 `npm run docs:build` 查看错误信息
- 常见原因：frontmatter 格式错误、Markdown 语法错误

### Q: 如何添加新页面？

在 `docs/` 下创建 `.md` 文件即可。如需在导航栏显示，需要在 `config.ts` 的 `navbar` 中添加对应链接。
