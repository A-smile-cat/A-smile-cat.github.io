---
title: GitHub Pages 部署方式详解：GitHub Actions vs Deploy from a branch
date: 2026-09-08
category: 技术笔记
tags:
  - GitHub Pages
  - GitHub Actions
  - VuePress
  - CI/CD
---

搭建个人静态网站时，GitHub Pages 是最常用的免费托管方案。但在 **Settings → Pages → Source** 里，有两个选项经常让人困惑：

- **Deploy from a branch**
- **GitHub Actions**

它们到底有什么区别？该选哪个？

<!-- more -->

## Deploy from a branch（传统方式）

这是 GitHub Pages 最早的部署方式。工作原理很简单：

> GitHub 直接从某个分支的某个目录读取静态文件，原样托管。

### 工作流程

```mermaid
flowchart LR
    A[本地构建] --> B[产物推到 gh-pages 分支]
    B --> C[GitHub 读取并托管]
```

### 具体做法

以 VuePress 为例，你需要：

1. 本地执行 `npm run docs:build` 生成 `dist/` 目录
2. 用 `gh-pages` 包把构建产物推送到 `gh-pages` 分支
3. GitHub 从 `gh-pages` 分支的根目录读取文件并托管

```bash
# 典型的部署命令
npm run docs:build
npx gh-pages -d docs/.vuepress/dist
```

### 缺点

- **每次都要手动构建**，或者自己额外配 CI
- 需要维护一个**额外的 `gh-pages` 分支**
- 构建产物混在项目里，仓库结构不干净

## GitHub Actions（推荐方式）

GitHub 官方提供的 CI/CD 流水线，可以完全自动化构建和部署。

### 工作流程

```mermaid
flowchart LR
    A[git push master] --> B[GitHub Actions 自动触发]
    B --> C[安装依赖]
    C --> D[构建项目]
    D --> E[直接部署到 Pages]
```

### 配置示例

只需在仓库里放一个 `.github/workflows/deploy.yml`：

```yaml
name: Deploy VuePress to GitHub Pages

on:
  push:
    branches: [master]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build VuePress site
        run: npm run docs:build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs/.vuepress/dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

之后每次 push 到 `master`，GitHub 就会自动：

1. checkout 代码
2. 安装依赖（`npm ci`，带缓存）
3. 构建网站（`npm run docs:build`）
4. 部署到 Pages

**你只需要 `git push`，什么都不用管。**

## 对比总结

| | Deploy from a branch | GitHub Actions |
|---|---|---|
| **构建位置** | 本地 / 自己搭 CI | GitHub 免费 runner |
| **部署分支** | 需要额外的 `gh-pages` 分支 | 只用 `master`，无需额外分支 |
| **触发方式** | 手动推产物 / 配 CI | push 到 `master` 自动触发 |
| **配置复杂度** | 需要 `gh-pages` 包或额外脚本 | 一个 `.yml` 搞定 |
| **构建产物** | 需要提交到分支 | 不入库，Actions 直接上传 |

## 结论

**选 GitHub Actions。** 省心、干净、自动化程度高。

唯一需要注意的是：在 Settings → Pages 里，Source 要选 **GitHub Actions** 而不是 "Deploy from a branch"，否则 Actions 跑完了也不会生效。

## 参考

- [GitHub Pages 官方文档](https://docs.github.com/en/pages)
- [GitHub Actions 官方文档](https://docs.github.com/en/actions)
- [VuePress 部署指南](https://vuepress.vuejs.org/guide/deployment.html)
