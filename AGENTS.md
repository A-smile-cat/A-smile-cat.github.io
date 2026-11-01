# AGENTS.md — 给 AI 助手与后续维护者的工程须知

本站为 VuePress 2 + vuepress-theme-hope，内容在 `docs/`，站点配置在
`docs/.vuepress/config.ts`（sidebar / navbar / 插件），全局脚本在
`docs/.vuepress/client.ts`。

## ⚠️ 硬性规则：新增文章必须同步收录进侧边栏

本站的侧边栏（`theme.sidebar`）和导航栏（`theme.navbar`）都是 **显式配置的数组**，
**不会**根据 `docs/` 目录自动生成。因此「文件放进 docs/ ≠ 全站可见」：

> **新增 / 删除 / 移动 / 重命名任何 `.md` 文章后，必须同步更新
> `docs/.vuepress/config.ts` 中 `sidebar` 对应分组的 `children`，
> 否则这篇文章在侧边栏里完全不可见，读者和搜索引擎都找不到它。**

这是本仓库历史上反复出现的回归 bug（例如提交 8e21013 新增的 3 篇 Python
笔记就曾漏收，靠人工事后发现），写文章时请把「收进侧边栏」当作任务的
一部分，而不是可选的后续步骤。

### 操作清单

1. **新增文章** → 在 `sidebar` 里找到所属一级分组，把路径加进对应
   `children`；需要新的专题时仿照「学习笔记 → 计算机体系结构」新建一个
   二级分组（`collapsible: true`，不配 link）。
2. **删除 / 移动 / 重命名文章** → 同步修改 `sidebar`，并全站检查指向旧
   路径的链接。
3. **新增一个栏目目录** → 除 `sidebar` 外，还要在 `navbar` 加入口，并给
   目录创建 `README.md` 落地页（有 README 的目录不会被 catalog 插件
   自动生成目录页）。

### sidebar 配置约定（细节见 config.ts 内注释）

- **有子项的分组不要配 `link`**：`link` 与 `collapsible` 同时存在时，点击
  分组标题会同时触发跳转和折叠切换，SPA 导航后展开状态被重置，表现为
  「点击分组永远展开不了」。
- 可折叠分组加 `collapsible: true`；不配 `expanded`，默认收起，进入子页
  时主题按 children 匹配自动展开，不依赖分组自身的 link。
- 无子项的入口保持普通链接写法（如「关于我」）。

## 提交前自检

```bash
# 1. 侧边栏收录校验（已串联进 docs:build，CI 会自动执行）
npm run check:sidebar
#    输出 ✓ = 全部文章可见；列出路径 = 漏收，去 config.ts 补进对应分组的 children。
#    （等价的手工检查：grep -n "新文章文件名.md" docs/.vuepress/config.ts）

# 2. 完整构建必须通过，且输出中不允许出现 "Broken links found"
npm run docs:build
```

脚本规则与白名单见 `scripts/check-sidebar.mjs` 顶部注释。

涉及 `docs/.vuepress/client.ts`（打字机、头像轮播、主页布局搬移等 DOM
hack）的改动，需本地起 `npm run docs:dev` 后实际刷新主页确认动画正常，
再提交。
