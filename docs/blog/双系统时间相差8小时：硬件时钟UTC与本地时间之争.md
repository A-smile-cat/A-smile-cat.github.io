---
title: 双系统时间来回跳 8 小时？聊聊硬件时钟的 UTC / 本地时间之争
date: 2026-09-20
order: 2
category: Linux 运维
tags:
  - Linux
  - 双系统
  - timedatectl
  - RTC
  - 时区
---

在 VMware 虚拟机里的 Ubuntu 和 Ventoy 持久化 Ubuntu 之间来回切换启动时，系统时间每次都会偏差恰好 8 个小时，并且两个系统「各改各的」，时间反复跳变。这篇文章记录问题的根因与修复方法。

<!-- more -->

## 一、现象

两个系统分别是：

- 装在 VMware 虚拟机磁盘上的 Ubuntu（日常使用）
- 通过 Ventoy 安装的持久化 Ubuntu（同一块物理机，靠启动方式切换）

每次从其中一个系统切到另一个，进入后查看时间，总是和真实时间差 8 小时。更麻烦的是：在这个系统里改对时间后，切到另一个系统又不对了，来回变化。

## 二、根因：硬件时钟（RTC）的时区约定不一致

差值**恰好是 8 小时**——正好是中国标准时间（CST，UTC+8）与 UTC 的差，这基本可以断定不是 NTP 或网络问题，而是时区约定问题。

主板（虚拟机）里有一块由电池供电的**硬件时钟（RTC / Hardware Clock）**，断电也走时。但操作系统对「这块时钟里存的是什么时间」有两种约定：

- **约定 A：硬件时钟存 UTC**（Linux 的默认约定）。系统启动后读取 RTC，再按时区偏移 +8 换算成本地时间。
- **约定 B：硬件时钟存本地时间**（Windows 的传统约定，不少装机环境也沿用）。

如果两个系统对同一块 RTC 采用了不同约定，比如：

1. 系统一按 UTC 读 RTC，显示时间 = RTC + 8h
2. 系统二按本地时间读 RTC，显示时间 = RTC 本身

那么只要 RTC 里存的是其中一种格式，另一个系统读出来就必然差 8 小时。

更糟的是**写回循环**：Linux 默认在关机/校时后会把系统时间写回 RTC。系统一把 RTC 改写成 UTC 格式，系统二下次启动读到就错了 8 小时；系统二再把它改回本地时间格式，系统一下次启动又错了——这就是「时间来回变化」的原因。

## 三、排查：timedatectl

在**两个系统里分别**执行：

```bash
timedatectl
```

重点关注两行输出：

```text
Local time: 六 2026-09-20 22:30:00 CST    # 是否与真实时间一致
RTC in local TZ: no                       # no = 按 UTC 对待硬件时钟（Linux 默认）
                                          # yes = 按本地时间对待硬件时钟
```

如果两个系统的 `RTC in local TZ` 一个是 `no` 一个是 `yes`，就坐实了根因。

## 四、修复：统一约定为 UTC

最推荐的做法是**两边都统一用 UTC**（Linux 标准做法，与 Windows 共存时兼容性也最好）：

```bash
# 确保硬件时钟按 UTC 对待（如果已是 no 可跳过）
sudo timedatectl set-local-rtc 0

# 开启 NTP 自动校时，校准一次
sudo timedatectl set-ntp true
```

执行后 `timedatectl` 会提示：

```text
Warning: The system is configured to read the RTC time in the local time zone.
         This mode cannot be fully supported. ...
```

这条警告正是提醒 local RTC 模式的坑——把 `set-local-rtc 0` 改回 UTC 后警告即消失。

两边约定统一后，RTC 里只存一种格式的时间，切换系统就不会再来回跳了。

## 五、如果设置一致还跳时间

若两边的 `timedatectl` 输出本来就一致，问题可能出在别处：

- **Ventoy 持久化分区没有真正生效**，每次启动都当成全新 live 系统初始化时钟设置；
- 持久化系统未联网、没做 NTP 同步，RTC 被另一个系统改写后无法自动纠正。

此时优先检查 Ventoy 持久化配置（`ventoy.json` 中的 persistence 插件）是否对该 ISO 生效。

## 六、小结

| 项目 | 说明 |
| --- | --- |
| 现象 | 双系统切换后时间差恰好 8 小时，且来回跳 |
| 根因 | 两系统对硬件时钟（RTC）的时区约定不一致（UTC vs 本地时间），且互相写回 |
| 诊断 | `timedatectl` 看 `RTC in local TZ` 是否一致 |
| 修复 | 两边统一 `sudo timedatectl set-local-rtc 0` + `set-ntp true` |

一句话：**硬件时钟只有一个，时区约定必须统一**。差 8 小时且来回变，先查 `RTC in local TZ`。
