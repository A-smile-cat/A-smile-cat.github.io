---
title: Python 基础篇 01：环境配置与包管理完全指南
date: 2026-10-30
order: 1
category:
  - Python
tags:
  - Python
  - 虚拟环境
  - pip
  - conda
  - uv
  - 环境管理
---

> 本文是 Python 学习笔记的基础篇，涵盖环境安装、包管理工具、虚拟环境及常用命令，适合从零开始搭建 Python 开发环境的开发者。

---

## 目录

1. [Python 解释器介绍](#1-python-解释器介绍)
2. [Anaconda 与 Miniconda 选择](#2-anaconda-与-miniconda-选择)
3. [包管理工具对比：pip vs conda vs uv](#3-包管理工具对比pip-vs-conda-vs-uv)
4. [虚拟环境详解](#4-虚拟环境详解)
5. [pip 常用命令与换源](#5-pip-常用命令与换源)
6. [conda 常用命令](#6-conda-常用命令)
7. [uv 快速上手](#7-uv-快速上手)
8. [环境变量配置](#8-环境变量配置)
9. [常见问题与排查](#9-常见问题与排查)

---

## 1. Python 解释器介绍

### 1.1 什么是 Python 解释器

Python 解释器是将 Python 代码翻译成计算机能执行的指令的程序。安装 Python 时，实际上安装的就是解释器及其标准库。

### 1.2 官方 CPython 与其他实现

| 实现 | 说明 | 用途 |
|------|------|------|
| **CPython** | 官方标准实现，由 C 语言编写 | 最常用，默认选择 |
| **PyPy** | JIT 编译器加速的 Python | 高性能计算场景 |
| **Jython** | 运行在 JVM 上的 Python | Java 生态集成 |
| **IronPython** | 运行在 .NET 上的 Python | .NET 生态集成 |

> **日常开发选择 CPython 即可**，绝大多数第三方库只针对 CPython 发布。

### 1.3 Python 版本选择

```bash
# 查看当前 Python 版本
python --version
# 或
python3 --version
```

截至 2026 年，主流版本支持情况：

| 版本 | 状态 | 建议 |
|------|------|------|
| 3.14 | 最新稳定版 | 新项目首选 |
| 3.13 | 稳定版 | 推荐，性能有提升 |
| 3.12 | LTS 级别 | 生产环境稳定选择 |
| 3.11 | 维护中 | 兼容老项目 |
| 3.10 及以下 | 已停止安全更新 | 不建议新项目使用 |

---

## 2. Anaconda 与 Miniconda 选择

### 2.1 三者关系

```
┌─────────────────────────────────────────────┐
│              Anaconda                       │
│  （自带 1500+ 科学计算包 + conda + Jupyter） │
└─────────────────────────────────────────────┘
                      ↓ 精简
┌─────────────────────────────────────────────┐
│            Miniconda                         │
│  （仅包含 conda + Python + 少量基础包）      │
└─────────────────────────────────────────────┘
                      ↓ 更精简
┌─────────────────────────────────────────────┐
│          Anaconda/Miniconda 核心             │
│  （conda 包管理器 + Python 解释器）          │
└─────────────────────────────────────────────┘
```

### 2.2 如何选择

| 需求 | 推荐方案 |
|------|----------|
| 数据科学 / 机器学习，不想花时间配置 | **Anaconda**（开箱即用） |
| 只想轻量安装 Python 环境，手动按需安装包 | **Miniconda** |
| 前端/后端 Web 开发 | **官方 Python** 或 **Miniconda** |
| 磁盘空间有限 | **Miniconda**（约 400MB vs Anaconda 3GB+） |

### 2.3 下载地址

- **Anaconda**：https://www.anaconda.com/download
- **Miniconda**：https://docs.conda.io/en/latest/miniconda.html
- **Python 官方**：https://www.python.org/downloads

---

## 3. 包管理工具对比：pip vs conda vs uv

### 3.1 三者定位

| 工具 | 归属 | 定位 | 速度 |
|------|------|------|------|
| **pip** | Python 官方 | 纯 Python 包管理 | 中等 |
| **conda** | Anaconda Inc. | 跨语言包管理 + 环境管理 | 较慢（依赖解析慢） |
| **uv** | Astral（Rust 编写） | 新一代极速 Python 工具链 | 极快（比 pip 快 10-100x） |

### 3.2 详细对比

| 特性 | pip | conda | uv |
|------|-----|-------|-----|
| 安装方式 | `get-pip.py` / 随 Python 安装 | Anaconda/Miniconda 安装 | Homebrew / curl / 官方脚本 |
| 包来源 | PyPI | conda-forge / defaults + PyPI | PyPI |
| 非 Python 包 | ❌ | ✅（如 CUDA、Qt、GCC） | ❌ |
| 环境管理 | ❌（需配合 venv） | ✅ | ✅（`uv venv`） |
| 依赖解析 | 慢（串行） | 慢（Conda 算法复杂） | 极快（并行 + Rust） |
| 确定性构建 | ❌ | ✅（可锁定版本号） | ✅（`uv.lock`） |
| 与 Poetry/PDM 兼容 | 可作为后端 | 不适用 | ✅ |
| 学习成本 | 低 | 中 | 低 |

### 3.3 何时用哪个

```
需要安装系统级库（CUDA、MKL）？
├── 是 → 用 conda
└── 否 → 需要用 Python 项目？
           ├── 是 → uv（推荐）或 pip + venv
           └── 否 → uv 或 pip
```

---

## 4. 虚拟环境详解

### 4.1 为什么需要虚拟环境

- **隔离依赖**：不同项目可能依赖同一个包的不同版本
- **避免污染全局环境**：不污染系统 Python
- **方便部署**：冻结依赖列表，一键复现环境
- **权限安全**：不需要管理员权限安装包

### 4.2 venv（Python 标准库）

#### 创建环境

```bash
# 在项目根目录下创建 .venv 目录
python -m venv .venv

# 指定 Python 版本
python3.12 -m venv .venv

# 带上系统 site-packages（继承已安装包）
python -m venv .venv --system-site-packages
```

#### 激活环境

```bash
# Windows (CMD)
.venv\Scripts\activate.bat

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate
```

激活后，命令行提示符前会出现 `(.venv)` 标识。

#### 退出环境

```bash
deactivate
```

#### 删除环境

```bash
# 直接删除目录即可
rm -rf .venv        # macOS/Linux
rmdir /s .venv      # Windows
```

### 4.3 conda 环境

#### 创建环境

```bash
# 创建名为 myenv 的环境，Python 版本 3.12
conda create -n myenv python=3.12

# 指定多个包一起安装
conda create -n myenv python=3.12 numpy pandas

# 从 yml 文件创建
conda env create -f environment.yml

# 项目级环境（路径在项目目录下）
conda create -p ./env python=3.12
```

#### 管理环境

```bash
# 查看所有环境
conda env list

# 激活环境
conda activate myenv

# 退出环境
conda deactivate

# 删除环境
conda remove -n myenv --all

# 复制环境
conda env export -n myenv > myenv.yml
conda env create -f myenv.yml
```

#### 环境文件

`environment.yml` 示例：

```yaml
name: myproject
channels:
  - conda-forge
  - defaults
dependencies:
  - python=3.12
  - numpy=1.26
  - pandas=2.1
  - pip:
    - requests==2.31.0
    - flask~=2.3.0
```

### 4.4 uv 环境

```bash
# 创建环境（自动在项目下创建 .venv）
uv venv

# 激活（与 venv 相同）
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate

# 一步创建并安装依赖
uv venv && uv pip install -r requirements.txt

# 或直接用 uv 管理依赖（更现代的方式）
uv init myproject
cd myproject
uv add numpy pandas
uv run python script.py
```

### 4.5 各方案对比

| 特性 | venv | conda | uv |
|------|------|-------|-----|
| 创建速度 | 快 | 慢 | 极快 |
| 环境隔离 | ✅ | ✅ | ✅ |
| 跨语言依赖 | ❌ | ✅ | ❌ |
| 依赖锁定 | 手动 | 自动 | 自动（uv.lock） |
| 推荐场景 | 通用 Python 项目 | 数据科学/ML | 所有场景（新一代首选） |

---

## 5. pip 常用命令与换源

### 5.1 基础命令

```bash
# 查看版本
pip --version
# pip 24.0 from ... (python 3.12)

# 查看已安装包
pip list
pip list --format=freeze   # 输出 requirements.txt 格式

# 查看包详细信息
pip show numpy

# 搜索包
pip search numpy   # 注意：PyPI 已关闭搜索 API，此命令可能不可用

# 安装包
pip install numpy
pip install numpy==1.26.0       # 指定版本
pip install numpy>=1.26.0       # 指定版本范围
pip install "numpy<2.0"          # 排除特定版本

# 批量安装（从 requirements.txt）
pip install -r requirements.txt

# 卸载包
pip uninstall numpy
pip uninstall numpy pandas matplotlib   # 一次卸载多个

# 升级包
pip install --upgrade numpy
pip install -U numpy

# 查看包来源信息
pip show -f numpy    # 查看安装的文件列表
pip index versions numpy   # 查看可用版本（pip 21.2+）
```

### 5.2 换源（国内镜像加速）

国内访问 PyPI 经常很慢，推荐使用国内镜像源：

#### 临时换源（一次有效）

```bash
pip install numpy -i https://pypi.tuna.tsinghua.edu.cn/simple
```

#### 永久换源（推荐）

**方法一：配置文件**

```bash
# Windows
notepad %APPDATA%\pip\pip.ini

# macOS/Linux
nano ~/.pip/pip.conf
```

写入配置：

```ini
[global]
index-url = https://pypi.tuna.tsinghua.edu.cn/simple
trusted-host = pypi.tuna.tsinghua.edu.cn
```

**方法二：conda 换源**

```bash
# 编辑 condarc 配置文件
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main/
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free/
conda config --set show_channel_urls yes
```

#### 常用镜像源

| 镜像源 | URL |
|--------|-----|
| **清华大学** | `https://pypi.tuna.tsinghua.edu.cn/simple` |
| **阿里云** | `https://mirrors.aliyun.com/pypi/simple/` |
| **中国科技大学** | `https://pypi.mirrors.ustc.edu.cn/simple/` |
| **华为云** | `https://repo.huaweicloud.com/repository/pypi/simple/` |
| **豆瓣** | `https://pypi.douban.com/simple/` |

#### 完整 pip.conf 示例

```ini
[global]
timeout = 60
index-url = https://pypi.tuna.tsinghua.edu.cn/simple
trusted-host = pypi.tuna.tsinghua.edu.cn

[install]
trusted-host = pypi.tuna.tsinghua.edu.cn
```

### 5.3 requirements.txt 常见写法

```txt
# 精确版本
numpy==1.26.4

# 版本范围
requests>=2.28.0,<3.0.0

# 不等式
flask>=2.3.0

# 从 git 安装
git+https://github.com/user/repo.git@main

# 从本地路径安装
./local-package

# 分组注释
# 核心依赖
numpy==1.26.4
pandas==2.1.4

# 开发依赖
pytest>=7.0
black>=23.0
```

---

## 6. conda 常用命令

### 6.1 环境管理

```bash
# 查看已安装的环境
conda env list
# 或
conda info --envs

# 创建环境
conda create -n myenv python=3.12
conda create -n myenv python=3.12 numpy pandas

# 激活环境
conda activate myenv

# 退出环境
conda deactivate

# 删除环境
conda remove -n myenv --all

# 克隆环境
conda create --clone myenv --name myenv-copy

# 导出环境
conda env export > environment.yml
conda env export --from-history > environment.yml   # 只导出显式安装的包
```

### 6.2 包管理

```bash
# 搜索包
conda search numpy

# 安装包
conda install numpy
conda install numpy=1.26    # 指定版本
conda install numpy pandas matplotlib

# 批量安装
conda install --file requirements.txt

# 卸载包
conda remove numpy

# 更新包
conda update numpy
conda update --all          # 更新所有包

# 查看已安装包
conda list
conda list -n myenv        # 查看指定环境的包
```

### 6.3 通道（Channel）管理

```bash
# 查看通道配置
conda config --show channels

# 添加通道
conda config --add channels conda-forge
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main/

# 设置通道优先级
conda config --set channel_priority strict

# 移除通道
conda config --remove channels conda-forge
```

### 6.4 conda-forge 说明

`conda-forge` 是一个社区维护的通道，包数量远多于官方通道，更新更快：

```bash
# 优先使用 conda-forge
conda config --add channels conda-forge
conda config --set channel_priority strict

# 或在创建环境时指定
conda create -n myenv -c conda-forge python=3.12 numpy
```

---

## 7. uv 快速上手

> `uv` 是由 [Astral](https://astral.sh)（Ruff 的开发者）用 Rust 编写的新一代 Python 工具链，速度极快。

### 7.1 安装

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# 验证安装
uv --version
```

### 7.2 项目管理

```bash
# 初始化项目
uv init myproject
cd myproject

# 添加依赖（自动更新 pyproject.toml 和 uv.lock）
uv add numpy pandas
uv add "requests>=2.28"

# 添加开发依赖
uv add --dev pytest black

# 运行脚本（自动管理依赖）
uv run python script.py

# 在环境中运行命令
uv run pytest
```

### 7.3 pyproject.toml 示例

```toml
[project]
name = "myproject"
version = "0.1.0"
description = "我的 Python 项目"
requires-python = ">=3.12"
dependencies = [
    "numpy>=1.26",
    "pandas>=2.1",
]

[project.dev-dependencies]
dev = [
    "pytest>=7.0",
    "black>=23.0",
]

[tool.uv]
package = false
```

### 7.4 其他常用命令

```bash
# 创建虚拟环境
uv venv

# 在当前环境安装包
uv pip install numpy

# 同步依赖（根据 lock 文件安装）
uv sync

# 查看依赖树
uv tree

# 运行项目
uv run python main.py

# 清理缓存
uv cache clean
```

### 7.5 uv vs pip 对比

```bash
# 传统方式
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# uv 方式
uv venv
uv sync          # 自动读取 pyproject.toml 或 requirements.txt
uv run python script.py
```

---

## 8. 环境变量配置

### 8.1 Windows 配置

```powershell
# 查看当前 PATH
$env:PATH -split ";"

# 临时添加（仅当前会话有效）
$env:PATH = "D:\miniconda3;" + $env:PATH

# 永久添加到用户 PATH
[Environment]::SetEnvironmentVariable(
    "Path",
    "D:\miniconda3;" + [Environment]::GetEnvironmentVariable("Path", "User"),
    "User"
)
```

**常见需要加入 PATH 的路径：**

| 安装方式 | 路径 |
|----------|------|
| Python 官方安装包 | `C:\Users\<用户名>\AppData\Local\Programs\Python\Python3xx\` |
| Python 官方安装包（Scripts） | `C:\Users\<用户名>\AppData\Local\Programs\Python\Python3xx\Scripts\` |
| Miniconda | `D:\miniconda3\` 和 `D:\miniconda3\Scripts\` |
| Anaconda | `D:\Anaconda3\` 和 `D:\Anaconda3\Scripts\` |

### 8.2 macOS / Linux 配置

```bash
# 查看当前 PATH
echo $PATH

# 临时添加
export PATH="/usr/local/bin:$PATH"

# 永久添加（写入 ~/.zshrc 或 ~/.bashrc）
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 8.3 验证配置是否成功

```bash
# 所有平台通用
python --version
pip --version
conda --version    # 如果安装了 conda
uv --version       # 如果安装了 uv
```

---

## 9. 常见问题与排查

### 9.1 找不到 python 命令

```bash
# Windows：检查是否在 PowerShell 中执行
where.exe python

# macOS/Linux：检查是否在 PATH 中
which python3

# 如果找不到，可能是：
# 1. Python 未安装 → 重新安装
# 2. PATH 未配置 → 按第 8 节配置环境变量
# 3. 多版本冲突 → 使用完整路径或 conda 环境
```

### 9.2 pip 安装速度慢

```bash
# 换用国内镜像（见 5.2 节）
pip install numpy -i https://pypi.tuna.tsinghua.edu.cn/simple

# 或使用 uv（速度提升 10-100 倍）
uv pip install numpy
```

### 9.3 权限错误（PermissionError）

```bash
# 不要使用 --user 或 sudo，而是使用虚拟环境
python -m venv .venv
source .venv/bin/activate
pip install xxx

# 或升级 pip（Linux/macOS）
pip install --user --upgrade pip
```

### 9.4 依赖冲突

```bash
# 使用 conda 解决（依赖解析更强）
conda install numpy pandas

# 使用 uv（更快的依赖解析）
uv pip install numpy pandas

# 或创建全新环境
conda create -n fresh python=3.12
conda activate fresh
```

### 9.5 SSL 证书错误

```bash
# 方法一：降低安全级别（不推荐生产环境）
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org numpy

# 方法二：更新 pip
pip install --upgrade pip

# 方法三：使用镜像源（镜像通常有正确的 SSL 配置）
pip install numpy -i https://pypi.tuna.tsinghua.edu.cn/simple
```

---

## 附录：一键初始化脚本

### 新建 Python 项目标准化流程

```bash
#!/bin/bash
# init_python_project.sh

PROJECT_NAME=$1
PYTHON_VERSION=${2:-3.12}

# 1. 创建项目目录
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# 2. 创建虚拟环境
python"$PYTHON_VERSION" -m venv .venv

# 3. 激活环境
source .venv/bin/activate

# 4. 升级工具链
pip install --upgrade pip setuptools wheel

# 5. 安装常用开发工具
pip install uv requests numpy pandas

# 6. 创建基础文件结构
mkdir -p src tests docs
touch src/__init__.py
touch tests/__init__.py
cat > pyproject.toml << 'EOF'
[project]
name = "'"$PROJECT_NAME"'"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = []

[tool.uv]
package = false
EOF

cat > .gitignore << 'EOF'
.venv/
__pycache__/
*.pyc
*.pyo
.env
EOF

echo "✅ 项目 '$PROJECT_NAME' 初始化完成！"
echo "激活环境：source $PROJECT_NAME/.venv/bin/activate"
```

## 10. pip 缓存管理详解

`pip` 下载包后会缓存在本地，避免重复下载。但如果缓存积累过多会占用大量磁盘空间。

### 查看缓存

```bash
# 查看缓存位置
pip cache dir

# 查看缓存中的包
pip cache list

# 查看缓存大小（macOS/Linux）
du -sh ~/Library/Caches/pip
du -sh ~/.cache/pip

# Windows
Get-ChildItem -Path "$env:LOCALAPPDATA\pip\Cache" -Recurse | Measure-Object -Property Length -Sum | ForEach-Object { [math]::Round($_.Sum/1GB, 2) } GB
```

### 清理缓存

```bash
# 删除所有缓存
pip cache purge

# 删除过期缓存（保留最近使用的）
pip cache remove "*"

# 限制缓存大小（自动清理旧缓存）
pip config set global.max-cache-size 500
```

### 禁用缓存

```bash
# 命令行临时禁用
pip install numpy --no-cache-dir

# 永久禁用（配置文件）
pip config set global.no-cache-dir true
```

### 缓存配置位置

| 系统 | 缓存路径 |
|------|----------|
| Windows | `%LOCALAPPDATA\pip\Cache` |
| macOS | `~/Library/Caches/pip` |
| Linux | `~/.cache/pip` |

---

## 11. 虚拟环境激活原理深入

理解激活原理，才能在跨平台时写出可靠的脚本。

### 11.1 激活做了什么

`activate` 本质上只做了两件事：

1. **修改 `PATH`**：把虚拟环境的 `Scripts/`（Windows）或 `bin/`（macOS/Linux）路径插到最前面
2. **设置 shell 变量**：`VIRTUAL_ENV`、`CONDA_DEFAULT_ENV` 等，供程序检测当前环境

### 11.2 各平台激活脚本对比

```bash
# Windows .bat（CMD 用）
# 核心逻辑：把 .venv\Scripts 插入 PATH 开头
set VIRTUAL_ENV=D:\project\.venv
set PATH=%VIRTUAL_ENV%\Scripts;%PATH%
```

```powershell
# Windows PowerShell
$env:VIRTUAL_ENV = "D:\project\.venv"
$env:PATH = "D:\project\.venv\Scripts;" + $env:PATH
```

```bash
# macOS/Linux
export VIRTUAL_ENV="$HOME/project/.venv"
export PATH="$HOME/project/.venv/bin:$PATH"
```

### 11.3 为什么 deactivate 能恢复

`deactivate` 是 shell 函数，它的逻辑是**还原 PATH 和清除变量**：

```bash
# deactivate 核心逻辑（简化版）
unset VIRTUAL_ENV
PATH=$(echo "$PATH" | tr ':' '\n' | grep -v "/.venv/bin" | tr '\n' ':')
```

### 11.4 常见坑

| 问题 | 原因 | 解决 |
|------|------|------|
| `deactivate` 报 `not found` | 用了新终端，旧函数不继承 | 重新 `source` 激活脚本 |
| 激活后 `python` 仍指向全局 | PATH 顺序不对，全局在前 | 检查 `which python`，调整 PATH 顺序 |
| Git Bash 里激活失败 | .bat 脚本不兼容 | 用 `.venv/Scripts/activate`（Git Bash 格式） |
| PowerShell 执行策略阻止激活 | ExecutionPolicy 限制 | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |

---

## 12. 小结

> 记住这张表，遇到问题随时翻：

| 任务 | 推荐工具 | 命令速查 |
|------|----------|----------|
| 创建环境 | uv | `uv venv` |
| 安装包 | pip | `pip install xxx` |
| 换源 | pip 配置 | `pip config set global.index-url ...` |
| 清理缓存 | pip | `pip cache purge` |
| 管理多版本 | pyenv | `pyenv install 3.12` |
| 复杂依赖 | conda | `conda create -n xxx python=3.12` |

---

*本文持续更新，欢迎提交 Issue 补充内容。*
*参考：[Python 官方文档](https://docs.python.org/3/)、[uv 文档](https://docs.astral.sh/uv/)、[Conda 文档](https://docs.conda.io/)*
