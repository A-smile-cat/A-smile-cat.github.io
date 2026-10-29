---
title: Python 基础篇 02：版本管理、代码规范与 IDE 配置
date: 2026-10-30
order: 2
category:
  - Python
tags:
  - Python
  - pyenv
  - mise
  - ruff
  - black
  - isort
  - VS Code
  - 代码规范
---

> 本文是 Python 学习笔记基础篇第 02 讲，在 [第 01 讲：环境配置与包管理](./01-env-setup-basics.md) 的基础上，进一步讲解多版本管理、代码规范工具和 IDE 配置，帮助你搭建一套完整的开发工作流。

---

## 目录

1. [Python 版本管理器：pyenv vs mise](#1-python-版本管理器pyenv-vs-mise)
2. [代码规范工具：ruff / black / isort](#2-代码规范工具ruff--black--isort)
3. [VS Code 配置指南](#3-vs-code-配置指南)
4. [完整开发工作流示例](#4-完整开发工作流示例)

---

## 1. Python 版本管理器：pyenv vs mise

当项目需要不同 Python 版本时（如项目 A 用 3.10，项目 B 用 3.12），手动切换解释器非常麻烦。**版本管理器**可以一键切换，是进阶开发者的必备工具。

### 1.1 pyenv（经典之选）

pyenv 是最流行的 Python 版本管理工具，支持在多个版本间自由切换。

#### 安装（Windows）

```powershell
# 使用winget安装
winget install pyenv.pyenv

# 或使用 Scoop
scoop install pyenv

# 安装完成后，重启终端，初始化
pyenv init
```

#### 安装 Python 版本

```bash
# 查看可安装的版本
pyenv install --list

# 安装指定版本（首次会自动下载）
pyenv install 3.12.7
pyenv install 3.11.9
pyenv install 3.10.14
```

#### 切换版本

```bash
# 全局默认版本
pyenv global 3.12.7

# 当前目录临时指定（项目级）
pyenv local 3.11.9
# 会在当前目录生成 .python-version 文件

# 手动切换（仅当前会话）
pyenv shell 3.10.14

# 查看当前版本
pyenv version

# 查看所有已安装版本
pyenv versions
```

#### .python-version 文件

```
# 在项目根目录，pyenv local 会自动生成
3.11.9
```

其他开发者 clone 项目后，执行 `pyenv install` 即可自动使用正确版本。

### 1.2 mise（新一代，推荐）

mise（原名 rtx）是一个通用的运行时管理器，支持 Python、Node.js、Go、Rust 等多种语言，**一个工具管理所有语言**。

#### 安装

```bash
# macOS / Linux
curl https://mise.run | sh

# Windows（推荐）
winget install jdx.mise
# 或 Scoop
scoop install mise
```

#### 配置 pyproject.toml 指定 Python 版本

```toml
[tool.mise]
requires = ">=3.12.0"
python.version = "3.12.7"
```

或单独的 `.tool-versions` 文件：
```
python 3.12.7
node 22.0.0
```

#### 常用命令

```bash
# 安装指定版本
mise install python@3.12.7

# 查看已安装版本
mise versions

# 切换版本
mise use python@3.11.9

# 运行命令（自动切换版本）
mise x python@3.12.7 -- python script.py

# 查看当前使用的版本
mise current python
```

### 1.3 pyenv vs mise 对比

| 特性 | pyenv | mise |
|------|-------|------|
| 专注领域 | 仅 Python | 多语言（Python/Node/Go/Rust...） |
| 配置方式 | `.python-version` 文件 | `.tool-versions` 或 `pyproject.toml` |
| 跨平台支持 | Windows 需额外配置 | 原生支持 Windows |
| 速度 | 较慢 | 快（Rust 编写） |
| 社区活跃度 | 高 | 快速增长中 |
| 适合场景 | 纯 Python 项目 | 全栈/多语言项目 |

> **建议**：如果只用 Python，pyenv 足够；如果是全栈开发者，mise 一劳永逸。

---

## 2. 代码规范工具：ruff / black / isort

代码规范是团队协作的基础。以下工具可以自动处理格式化和linting。

### 2.1 工具定位

| 工具 | 功能 | 语言 | 速度 |
|------|------|------|------|
| **ruff** | Lint + 格式化（一体化） | Rust | 极快 |
| **black** | 代码格式化 | Python | 快 |
| **isort** | import 排序 | Python | 快 |
| **flake8** | Lint | Python | 中等 |

### 2.2 ruff（新一代，强烈推荐）

ruff 是目前最快、最全面的 Python 代码质量工具，**一个工具替代 flake8 + black + isort + pydocstyle**。

#### 安装

```bash
# 推荐方式
pip install ruff
# 或用 uv
uv tool install ruff
```

#### 基本命令

```bash
# 检查代码问题
ruff check .

# 自动修复（部分问题）
ruff check --fix .

# 格式化代码
ruff format .

# 格式化 + 修复
ruff check --fix && ruff format .

# 指定 Python 版本
ruff check . --target-version py312
```

#### pyproject.toml 配置

```toml
[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = [
    "E",      # pycodestyle 错误
    "F",      # Pyflakes
    "W",      # pycodestyle 警告
    "I",      # isort
    "UP",     # pyupgrade
    "B",      # flake8-bugbear
    "SIM",    # flake8-simplify
]
ignore = [
    "E501",   # 行长度限制由 formatter 处理
]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
line-ending = "lf"
```

### 2.3 black（格式化标准）

#### 安装

```bash
pip install black
```

#### 基本命令

```bash
# 格式化指定文件或目录
black .

# 指定行长度（默认 88）
black --line-length 100 .

# 预览改动（不实际修改）
black --check .
```

#### pyproject.toml 配置

```toml
[tool.black]
line-length = 100
target-version = ['py312']
include = '\.pyi?$'
exclude = '''
/(
    \.git
  | \.venv
  | build
  | dist
)/
'''
```

### 2.4 isort（Import 排序）

#### 安装

```bash
pip install isort
```

#### 基本命令

```bash
# 排序 import
isort .

# 预览
isort --check-only --diff .
```

#### pyproject.toml 配置

```toml
[tool.isort]
profile = "black"         # 与 black 兼容
line_length = 100
combine_as_imports = true
force_sort_within_sections = true
```

### 2.5 三者协作（历史方案，逐步被 ruff 替代）

```toml
# 传统组合方案（ruff 出现前）
[tool.black]
line-length = 100

[tool.isort]
profile = "black"
line_length = 100
```

```bash
# 运行顺序
isort .    # 先排序 import
black .    # 再格式化代码
flake8 .   # 最后检查规范
```

> **新项目直接使用 ruff**，无需分别安装 black + isort + flake8。

---

## 3. VS Code 配置指南

VS Code 是目前最受欢迎的 Python IDE，正确配置后体验极佳。

### 3.1 必装扩展

| 扩展名 | 用途 |
|--------|------|
| **Python** (Microsoft) | 核心支持，IntelliSense、调试 |
| **Pylance** | 类型检查和智能补全 |
| **Ruff** | 快速 linting 和格式化 |
| **Black Formatter** | 代码格式化（可选，若用 ruff 可跳过） |
| **Error Lens** | 在代码行内显示错误提示 |
| **GitLens** | Git 增强，查看每行代码的作者 |

### 3.2 settings.json 配置

打开 `Ctrl+Shift+P` → 输入 `Preferences: Open User Settings (JSON)`

```json
{
    // Python 解释器路径
    "python.defaultInterpreterPath": "${workspaceFolder}/.venv/Scripts/python.exe",

    // 使用 ruff 作为 lint 和格式化
    "python.linting.enabled": true,
    "python.linting.linter": "ruff",
    "ruff.enable": true,
    "[python]": {
        "editor.defaultFormatter": "charliermarsh.ruff",
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
            "source.organizeImports": "explicit",
            "source.fixAll.ruff": "explicit"
        }
    },

    // 代码风格
    "editor.tabSize": 4,
    "editor.insertSpaces": true,
    "files.trimTrailingWhitespace": true,
    "files.insertFinalNewline": true,

    // Jupyter 支持
    "jupyter.notebookFileRoot": "${workspaceFolder}",

    // 终端
    "terminal.integrated.env.windows": {},
    "terminal.integrated.env.linux": {},
    "terminal.integrated.env.osx": {},

    // 代码折叠
    "editor.foldingStrategy": "indentation"
}
```

### 3.3 launch.json 调试配置

`Ctrl+Shift+D` → 创建 `launch.json`：

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python: 当前文件",
            "type": "python",
            "request": "launch",
            "program": "${file}",
            "console": "integratedTerminal",
            "justMyCode": true
        },
        {
            "name": "Python: 调试测试",
            "type": "python",
            "request": "launch",
            "module": "pytest",
            "args": ["-v", "--tb=short"],
            "console": "integratedTerminal",
            "justMyCode": true
        }
    ]
}
```

### 3.4 快捷键速查

| 操作 | 快捷键 |
|------|--------|
| 运行当前文件 | `F5` 或 `Ctrl+Shift+P` → `Python: Run Python File` |
| 运行测试 | `Ctrl+Shift+P` → `Python: Discover Tests` |
| 格式化代码 | `Shift+Alt+F` |
| 跳转到定义 | `F12` |
| 重命名重构 | `F2` |
| 查看文档 | `Shift+F12` |
| 拆分编辑器 | `Ctrl+\` |

---

## 4. 完整开发工作流示例

### 4.1 新建项目全流程

```bash
# 1. 创建项目目录
mkdir my_project && cd my_project

# 2. 使用 uv 初始化（推荐）
uv init
uv venv

# 3. 激活环境
source .venv/bin/activate   # macOS/Linux
# 或 .venv\Scripts\activate  # Windows

# 4. 安装依赖
uv add numpy pandas requests

# 5. 安装开发工具
uv add --dev ruff pytest

# 6. 创建源码目录
mkdir src && touch src/__init__.py
mkdir tests && touch tests/__init__.py

# 7. 配置 VS Code（自动提示选择解释器）
code .
# VS Code 会提示选择 .venv 中的 Python 解释器，点击确认
```

### 4.2 日常开发流程

```bash
# 1. 激活环境
source .venv/bin/activate

# 2. 在 VS Code 中编辑代码，保存时自动格式化和 lint

# 3. 手动运行 lint 检查
ruff check .

# 4. 运行测试
pytest

# 5. 提交前确保代码规范
ruff check --fix . && ruff format . && pytest
```

### 4.3 CI/CD 中集成

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv sync --frozen
      - run: ruff check .
      - run: ruff format --check .
      - run: pytest
```

---

## 总结

```
开发环境搭建优先级：

第一步  ✅ 安装 Python + pip
第二步  ✅ 配置虚拟环境（venv/uv）
第三步  ✅ 配置镜像源（国内用户必做）
第四步  ✅ 配置代码规范工具（ruff）
第五步  ✅ 配置 IDE（VS Code）
第六步  🚀 安装版本管理器（pyenv/mise，多版本需求时）
```

> 本文配套阅读：[第 01 讲：环境配置与包管理](./01-env-setup-basics.md)

---

*本文持续更新，欢迎提交 Issue 补充内容。*
*参考：[ruff 文档](https://docs.astral.sh/ruff/)、[mise 文档](https://mise.jdx.dev/)、[VS Code Python 文档](https://code.visualstudio.com/docs/python/python-tutorial)*