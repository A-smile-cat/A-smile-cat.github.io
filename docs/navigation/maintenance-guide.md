---
title: 维护指南：如何添加 / 修改快捷导航
date: 2026-09-14
order: 2
category: 站点维护
tags:
  - 快捷导航
  - 站点维护
  - VPCard
---

[快捷导航](/navigation/)页面的所有内容都在 **`docs/navigation/README.md`** 一个文件里，用编辑器打开它即可维护。本指南说明如何添加卡片、新增分类、调整顺序以及排查常见问题。

## 一、添加一张卡片

找到目标分类的 `<div class="nav-grid ...">` 和 `</div>` 之间，按下面的格式新增一行：

```html
<VPCard title="网站名称" desc="一句话简介" link="https://目标网址/" logo="https://目标网址/favicon.ico" />
```

四个属性的含义：

| 属性 | 作用 | 必填 |
|---|---|---|
| `title` | 卡片标题（网站名） | ✅ |
| `desc` | 标题下的小字描述 | 可省略 |
| `link` | 点击后跳转的网址 | ✅ |
| `logo` | 卡片左侧图标，一般写 `https://域名/favicon.ico` | 可省略 |

> 小技巧：新网站不确定有没有 favicon 时，先填上 `logo="https://域名/favicon.ico"`，预览后如果显示空白圈再删掉 `logo` 属性即可（卡片会退化为无图标样式，不影响使用）。

## 二、新增一个分类

复制一段现成的分类结构，改标题和配色类名：

````md
## 🏷️ 分类名

<div class="nav-grid cat-xxx">

<VPCard title="..." desc="..." link="..." logo="..." />

</div>
````

注意三点：

1. `## ` 标题开头的 emoji 和文字随意，但**分类标题要与 `<div>` 之间隔一个空行**。
2. `cat-xxx` 是配色类名，可用的有：`cat-blue` 蓝 / `cat-green` 绿 / `cat-orange` 橙 / `cat-cyan` 青 / `cat-pink` 粉 / `cat-red` 红 / `cat-amber` 琥珀 / `cat-violet` 紫 / `cat-sky` 天蓝 / `cat-teal` 蓝绿 / `cat-lime` 草绿 / `cat-grape` 亮紫 / `cat-indigo` 靛蓝。重复使用同一个颜色也没问题。
3. 想要新颜色：打开 `docs/.vuepress/styles/custom.scss`，在 `$nav-accents` 列表里照格式加一行（如 `"cat-gold": #d4af37, // 我的分类`），然后分类的 `div` 用 `class="nav-grid cat-gold"`。

## 三、调整分类顺序

分类的显示顺序 = 在文件中出现的先后顺序。把整个分类段落（从 `## ` 标题到对应的 `</div>`）剪切、粘贴到目标位置即可。

## 四、删除卡片或分类

- 删卡片：删除对应的那一行 `<VPCard ... />`。
- 删分类：删除该分类的整个段落（标题 + `<div>` 块）。

## 五、预览与发布

改完后在本机验证效果：

```bash
npm run docs:dev
```

浏览器打开 http://localhost:8080/navigation/ 查看（开发服务器支持热更新，保存即刷新）。

确认没问题后提交推送：

```bash
git add docs/navigation/README.md
git commit -m "content: update navigation links"
git push
```

等 GitHub Pages 自动构建 1~2 分钟后，线上页面即更新。

## 六、常见问题

- **改完本地预览没变化**：确认保存了文件；开发服务器偶尔需要重启（`Ctrl+C` 后重新 `npm run docs:dev`）。
- **卡片显示成一行文字 `<VPCard ...>`**：说明组件标签没被识别，检查 `<VPCard` 是否拼写正确、行尾是否有 `/>`，以及 `config.ts` 里 `components: ["Badge", "VPCard"]` 是否还在。
- **卡片没有对齐成网格**：确认 `<VPCard />` 外层包着 `<div class="nav-grid ...">`，且 div 与卡片之间有空行。
- **链接带了一长串参数不好看**：可以只保留根路径（如 `https://example.com/`），但登录入口、具体题目页等带路径的链接建议保留原路径，直达更方便。
