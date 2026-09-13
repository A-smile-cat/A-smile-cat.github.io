---
title: 从零到一：用书签管理器掌握 HTML / CSS / JS 三件套
date: 2026-09-13
order: 1
category: 前端入门
tags:
  - HTML
  - CSS
  - JavaScript
  - 单页应用
  - localStorage
  - Blob 导出
---

本文以一个**单文件书签管理工具**（`bookmark_manager.html`，约 170 KB、231 行代码）为案例，梳理它用到的前端三件套基础知识与典型应用。读完后可独立完成一个小型的单页应用，并理解「导出数据」背后的技术原理。

<!-- more -->

## 一、项目简介

这是一个完全自包含的浏览器书签整理工具：

- **功能**：添加 / 编辑 / 删除 / 批量选中 / 移动分类 / 搜索过滤 / 右键菜单 / 导出可继续编辑的版本
- **存储**：`localStorage`，刷新不丢失，无需后端
- **体积**：单文件，HTML + CSS + JS 全部内嵌
- **特色**：导出一份文件后仍然是一个完整可用的书签管理应用

下面按 HTML、CSS、JS 三个层面拆解它用到的技术与思想。

---

## 二、HTML：结构层

### 2.1 页面骨架

整个页面是一个标准的单页应用结构：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>书签管理 · 整理归档</title>
  <link href="https://fonts.googleapis.com/..." rel="stylesheet">
  <style>/* 内嵌样式 */</style>
</head>
<body>
  <div class="mast">...</div>       <!-- 顶栏 -->
  <div class="searchbar">...</div>  <!-- 搜索 -->
  <div class="layout">
    <div class="cp" id="cp">...</div>   <!-- 左侧分类栏 -->
    <div class="bp2" id="bp">...</div>   <!-- 右侧内容区 -->
  </div>
  <!-- 几个隐藏的弹窗 -->
  <div class="ov" id="eov">...</div>
  <div class="ov" id="mov">...</div>
  ...
  <script>/* 逻辑 */</script>
</body>
</html>
```

**值得掌握的知识**：

- `<!DOCTYPE html>` 声明文档类型，告诉浏览器用标准模式渲染。
- `<meta charset="UTF-8">` 指定字符集，避免中文乱码。
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` 移动端适配必备。
- 结构上采用"容器 + 块"的经典布局：`mast`(顶栏) → `searchbar`(搜索) → `layout`(主体布局) → `ov`(遮罩弹窗)。

### 2.2 内嵌样式与脚本

本项目把 CSS 和 JS 都**内嵌**在同一个 `.html` 里：

```html
<style>
  /* CSS 全部放在这里 */
</style>
<script>
  // JS 全部放在这里
</script>
```

**为什么这样做？**

- 单文件便于分享和导出（导出时只需把 HTML 另存为新文件即可）。
- 对小项目来说，避免多文件带来的路径管理成本。
- 适合做"工具类"单页应用。

生产环境通常分离成独立文件并压缩，但学习阶段单文件更直观。

### 2.3 事件绑定的三种写法

本项目里三种写法都有体现：

| 写法 | 示例 | 适用场景 |
|------|------|----------|
| 属性内联 | `<button onclick="sE()">保存</button>` | 简单一次触发 |
| `addEventListener` | `document.getElementById('si').addEventListener('input', onS)` | 需要动态绑定或解绑 |
| 事件委托 | `oncontextmenu="onCtx(event,...)"` | 动态生成元素上需要的事件 |

**注意点**：内联 `onclick` 里的函数名是全局作用域下的函数，所以所有 handler 都必须声明在顶层（或用 `var` 在顶层作用域里定义）。

### 2.4 `data-*` 自定义属性

```html
<div class="br" data-url="https://example.com">...</div>
```

**用途**：给 DOM 元素挂上业务数据，避免在 JS 里维护额外的映射表。本项目用 `data-url` 标识每条书签的唯一地址，点击删除时通过 `[data-url]` 选择器精准定位。

---

## 三、CSS：表现层

本项目使用了一套**高度统一的设计系统**，值得初学者重点学习。

### 3.1 CSS 自定义属性（变量）

顶部定义了整套主题色板：

```css
:root {
  --p: #f6efe1;      /* 主背景 */
  --pd: #eee2c8;     /* 次背景 */
  --c: #fdf8ec;      /* 卡片背景 */
  --i: #2b2417;      /* 主文字 */
  --i2: #6f6350;     /* 次要文字 */
  --i3: #a08e6d;     /* 辅助文字 */
  --r: #ddd0ad;      /* 边框 */
  --r2: #cbb98f;     /* 次要边框 */
  --rd: #a93b2c;     /* 强调/警告 */
  --rd2: #7d2417;    /* 强调深色 */
  --rb: #f3e2d8;     /* 提醒背景 */
  --ok: #4f6b2f;     /* 成功色 */
  --serif: "Noto Serif SC", ...;
}
```

**好处**：
- 整站改色只需改一处 `:root`。
- 代码可读性极高：`background: var(--c)` 比 `#fdf8ec` 更语义化。
- 本项目共用了 **112 处** `var(...)`。

### 3.2 Flex 布局实战

本项目大量使用 Flex，是学习布局的好样本：

```css
/* 顶栏：品牌 + 统计 + 操作按钮 */
.mast {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;  /* 小屏自动换行 */
}

/* 左边栏 + 右边内容 */
.layout {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

/* 每张书签卡片 */
.br {
  display: flex;
  align-items: center;
  gap: 10px;
}
```

**值得总结的 Flex 套路**：
- `align-items: center`：垂直居中（最常见需求）。
- `gap`：代替 `margin` 控制间距，更简洁。
- `flex-wrap: wrap`：响应式必备，避免小屏溢出。
- `flex: 0 0 240px`：固定宽度侧边栏。
- `flex: 1`：内容区自适应填满剩余空间。

### 3.3 粘性定位 `position: sticky`

```css
.cp {
  position: sticky;
  top: 120px;  /* 距离视口顶部 120px 时固定 */
  max-height: calc(100vh - 150px);
  overflow-y: auto;
}
```

**应用场景**：侧边栏在页面滚动时保持可见，但不影响其他元素的正常流动——比 `position: fixed` 友好得多。

### 3.4 伪类与伪元素进阶用法

```css
/* ::selection —— 用户选中文本时的高亮色 */
::selection { background: var(--rd); color: #fdf8ec; }

/* ::-webkit-scrollbar —— 自定义滚动条样式 */
.cp::-webkit-scrollbar { width: 6px; }
.cp::-webkit-scrollbar-thumb { background: var(--r2); border-radius: 3px; }

/* :hover —— 交互反馈 */
.btn:hover { background: var(--i); color: var(--p); }
.ci.on { background: var(--rd); color: #fdf3e2; font-weight: 600; }

/* :focus-within —— 聚焦时整个表单区域高亮 */
.fld:focus-within label { color: var(--rd); }
```

### 3.5 渐变与毛玻璃效果

```css
body {
  /* 点阵背景 */
  background: radial-gradient(rgba(60,48,26,.045) 1px, transparent 1.4px)
              0 0 / 15px 15px,
              repeating-linear-gradient(0deg,
                transparent 0 31px,
                rgba(122,98,58,.05) 31px 32px),
              var(--p);
}

.mast {
  /* 毛玻璃 */
  backdrop-filter: blur(6px);
  background: linear-gradient(180deg, rgba(246,239,225,.97), rgba(246,239,225,.92));
}
```

### 3.6 过渡与动画

```css
/* 过渡 —— 平滑状态变化 */
.btn { transition: all .16s; }
.stat:hover { transform: translateY(-2px); }

/* 关键帧动画 —— Toast 弹出 */
@keyframes ti {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: none; }
}
.tst { animation: ti .3s; }
```

---

## 四、JavaScript：行为层

### 4.1 数据模型：一个对象 + 数组

```js
var D = {
  "学校与教育平台": [
    { title: "资源访问控制系统", url: "https://webvpn.sdust.edu.cn/login" },
    { title: "山东科技大学",     url: "https://xnfz.sdust.edu.cn/" }
  ],
  "开发工具": [...],
  // ...
};
```

**核心思想**：用"分类 → 书签列表"的嵌套结构，天然支持增删改查。

### 4.2 状态变量

```js
var cc = null,          // 当前选中的分类
    q = '',             // 搜索关键词
    sel = new Set(),    // 当前选中的 bookmark url 集合（支持多选）
    em = null,          // 编辑模式：'add' | 'edit'
    eou = null,         // 当前正在编辑的 bookmark url
    cxc = null,         // 右键菜单对应的分类名
    col = {};           // 各分类的折叠状态
```

用 `Set` 管理选中状态是因为：
- 天然去重（同一 url 不会被加入两次）。
- `has()` / `add()` / `delete()` / `clear()` 都是 O(1) 操作。
- `sel.size` 直接得到选中数量。

### 4.3 渲染函数：数据驱动视图

```js
function render() {
  rC();  // 渲染左侧分类栏
  rB();  // 渲染右侧书签列表
  var n = tot(), c = 0;
  for (var k in D) if (D[k].length) c++;
  document.getElementById('tc').textContent = n;
  document.getElementById('st1').textContent = n;
  document.getElementById('st2').textContent = c;
}
```

**数据驱动思想**：
1. 数据变化（增/删/改/移动）→ 调用 `save()` 持久化到 `localStorage`
2. 调用 `render()` 重新生成 DOM
3. 用户看到的变化只是 DOM 的再渲染，不需要手动操作 DOM

这是所有现代前端框架（Vue / React）的核心思想——本项目用最原始的 JS 实现了同样的模式。

### 4.4 删除功能的实现

```js
function dO(u) {
  var b = fB(u);               // 找到书签在哪个分类
  if (!b) return;
  if (!confirm('删除「' + b.title + '」？')) return;
  D[b.cat] = D[b.cat].filter(function(x) { return x.url !== u });
  sel.delete(u);
  save();
  render();
  tst('已删除', 'ok');
}
```

**关键技术点**：
- `Array.prototype.filter`：返回新数组，不修改原数组（不可变数据原则）。
- `sel.delete(u)`：从选中集合里移除，避免删除后仍显示"已选中"状态。
- `save()` + `render()`：保证持久化 + 视图同步。

### 4.5 localStorage 持久化

```js
function save() {
  localStorage.setItem('bm_d2', JSON.stringify(D));
}

// 页面加载时读取（init 里）
function init() {
  var saved = localStorage.getItem('bm_d2');
  if (saved) {
    try { D = JSON.parse(saved); } catch(e) {}
  }
  render();
}
```

**注意点**：
- `localStorage` 只能存字符串，所以要用 `JSON.stringify` / `JSON.parse` 做双向转换。
- key `bm_d2` 是项目内部命名，避免与其他应用冲突。
- 容量限制约 5MB，对于书签这类纯文本数据绰绰有余。

### 4.6 右键菜单与事件委托

```js
function onCtx(e, cat) {
  e.preventDefault();
  cxc = cat;
  var ctx = document.getElementById('ctx');
  ctx.style.left = e.clientX + 'px';
  ctx.style.top = e.clientY + 'px';
  ctx.classList.add('show');
}

// 点击其他地方关闭菜单
document.addEventListener('click', function(e) {
  if (!e.target.closest('.ctx') && !e.target.closest('.ci')) {
    document.getElementById('ctx').classList.remove('show');
  }
});
```

### 4.7 导出功能的底层原理（重点）

导出的核心代码（修复后）：

```js
function doExport() {
  // ① 把当前内存数据序列化成 JSON 字符串
  var cd = JSON.stringify(D);

  // ② 把当前页面 DOM 整体克隆为字符串
  var h = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

  // ③ 用当前数据替换掉源码里那行硬编码的初始数据
  h = h.replace(/var D=\{[\s\S]*?\};\s*var cc/,
    function() { return 'var D=' + cd + ';\nvar cc'; });

  // ④ 生成 Blob 并触发下载
  var blob = new Blob([h], { type: 'text/html;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '书签管理_完整版.html';
  a.click();
  URL.revokeObjectURL(a.href);
  tst('已导出完整可编辑版本', 'ok');
}
```

**分步解释**：

| 步骤 | 做了什么 | 为什么重要 |
|------|---------|-----------|
| `JSON.stringify(D)` | 把内存数据变成字符串 | 数据要嵌入到 JS 源码里，必须转成字符串 |
| `outerHTML` | 拿到当前页面的完整 HTML 文本 | 包含用户操作后的 DOM 结构 |
| `replace(...)` | 把初始数据段替换成最新数据 | 导出的文件里数据是"最新的" |
| `new Blob([...])` | 把字符串变成二进制大对象 | 浏览器下载机制需要 Blob |
| `URL.createObjectURL` | 给 Blob 生成临时 URL | 让 `<a href>` 可以引用这个内存数据 |
| `a.click()` | 模拟点击下载 | 触发浏览器下载对话框 |
| `revokeObjectURL` | 释放临时 URL | 防止内存泄漏 |

**一个关键细节**：原代码的正则存在双重转义 bug（`/var D=\\{...\\}/` 会匹配字面量反斜杠），导致 replace 始终匹配失败，导出文件里的数据还是最初的 939 条书签。修复后正则 `/var D=\{[\s\S]*?\};\s*var cc/` 正确匹配，导出才是当前真实状态。

---

## 五、综合技术栈清单

| 类别 | 用到的技术 | 典型 API / 写法 |
|------|-----------|---------------|
| **HTML** | 单页结构、内嵌样式/脚本、data 属性、语义化标签 | `<div class="ov" id="eov">`、`data-url`、`<button onclick="...">` |
| **CSS** | 自定义属性、Flex 布局、sticky、渐变、过渡、动画、伪类/伪元素 | `:root{--x:…}`、`display:flex`、`position:sticky`、`@keyframes`、`::selection` |
| **JS** | 闭包、高阶函数、Set、正则、localStorage、Blob、URL API、DOM 操作 | `filter`、`classList.toggle`、`JSON.stringify`、`replace(fn)`、`createObjectURL` |

---

## 六、延伸练习建议

学完本项目后，可以尝试以下扩展，进一步巩固三件套：

1. **加一个「导入」功能**：用 `<input type="file">` 读取另一个导出的 HTML，解析出里面的 `var D=...` 段，合并到当前数据。
2. **加一个「按标签搜索」**：在书签对象里加 `tags` 数组，搜索时同时匹配标题、URL、标签。
3. **把数据拆成多个 localStorage key**：每个分类一个 key，练习分而治之的思维。
4. **加入拖拽排序**：用 HTML5 Drag and Drop API 或 Pointer Events 实现分类拖拽。
5. **迁移到现代框架**：用 Vue / React 重写，体会"数据驱动"框架是如何把这里的 `render()` 自动化掉的。

---

## 七、参考

- 本项目源码：`bookmark_manager.html`（单文件，可直接用浏览器打开）
- MDN：[Flexbox](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_flexible_box_layout)、[localStorage](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/localStorage)、[Blob](https://developer.mozilla.org/zh-CN/docs/Web/API/Blob)
- [CSS 自定义属性](https://developer.mozilla.org/zh-CN/docs/Web/CSS/--*)
- [正则表达式教程](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_expressions)
