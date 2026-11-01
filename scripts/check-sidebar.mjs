#!/usr/bin/env node
/**
 * 侧边栏收录完整性校验。
 *
 * 本站 sidebar 是 docs/.vuepress/config.ts 里的显式配置，不会从目录自动生成，
 * 「文件放进 docs/ ≠ 全站可见」——新文章若漏收，构建不会报错、页面静默失踪
 * （历史案例：8e21013 的 Python 笔记）。本脚本把这类遗漏变成构建期硬错误。
 *
 * 规则：docs/ 下所有非 README 的 .md 文章，其路径必须出现在 config.ts 的
 * sidebar（或 navbar）配置文本中。个别确要隐藏的草稿，加入下方 ALLOWLIST。
 *
 * 用法：npm run check:sidebar（已串联进 npm run docs:build，CI 自动执行）
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DOCS = fileURLToPath(new URL("../docs", import.meta.url));
const CONFIG = join(DOCS, ".vuepress", "config.ts");

/** 允许不出现在侧边栏的文章（草稿等）。路径相对 docs/，以 "/" 开头 */
const ALLOWLIST = new Set([
  // "/some/draft.md",
]);

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    // .vuepress 是配置目录，node_modules 防御性跳过
    if (entry.name === ".vuepress" || entry.name === "node_modules") return [];
    const full = join(dir, entry.name);
    return entry.isDirectory()
      ? walk(full)
      : entry.name.endsWith(".md")
        ? [full]
        : [];
  });

const articles = walk(DOCS)
  .map((p) => "/" + relative(DOCS, p).split(sep).join("/"))
  // README.md 是目录落地页，由 navbar 直达，不属于侧边栏收录对象
  .filter((p) => !p.endsWith("/README.md") && !ALLOWLIST.has(p));

const configText = readFileSync(CONFIG, "utf8");
const missing = articles.filter((path) => !configText.includes(path));

if (missing.length > 0) {
  console.error(
    `\n✗ 以下 ${missing.length} 篇文章未被 sidebar 收录（全站导航中不可见）：\n` +
      missing.map((p) => `    ${p}`).join("\n") +
      "\n\n请在 docs/.vuepress/config.ts 的 sidebar 对应分组的 children 中收录；\n" +
      "确属刻意隐藏的文章，加入 scripts/check-sidebar.mjs 顶部的 ALLOWLIST。\n",
  );
  process.exit(1);
}

console.log(`✓ sidebar 收录检查通过：${articles.length} 篇文章全部可见。`);
