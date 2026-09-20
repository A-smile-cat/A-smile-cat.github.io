---
title: 双系统时间来回跳 8 小时？Windows 与 Linux 的硬件时钟默认约定之争
date: 2026-09-20
order: 2
category: Linux 运维
tags:
  - Linux
  - Windows
  - 双系统
  - timedatectl
  - RTC
  - 时区
---

在物理机的 Windows 和 Ventoy 持久化 Ubuntu 之间来回切换启动时，系统时间每次都会偏差恰好 8 个小时，并且两个系统「各改各的」，时间反复跳变。这不是 bug，而是 Windows 和 Linux 对硬件时钟的**默认约定天生不同**：一个按本地时间、一个按 UTC。这篇文章从这个默认差异讲起，记录问题的根因与修复方法。

<!-- more -->

## 一、现象

两个系统分别是：

- 物理机上安装的 **Windows**（日常使用）
- 通过 Ventoy 启动的**持久化 Ubuntu**（同一块物理机，靠启动方式切换）

每次从其中一个系统切到另一个，进入后查看时间，总是和真实时间差 8 小时。更麻烦的是：在这个系统里改对时间后，切到另一个系统又不对了，来回变化。

## 二、根因：硬件时钟（RTC）的时区约定不一致

差值**恰好是 8 小时**——正好是中国标准时间（CST，UTC+8）与 UTC 的差，这基本可以断定不是 NTP 或网络问题，而是时区约定问题。

主板里有一块由电池供电的**硬件时钟（RTC / Hardware Clock）**，断电也走时，但 RTC 本身只是一个「裸时间值」，不带任何时区信息——存的是什么、按什么解读，全看操作系统的约定。而两大系统出厂默认就不同：

- **Windows 默认：RTC 存本地时间**。为了方便用户在 BIOS 里直接看到墙上的时间，Windows 把 RTC 当本地时间读写（注册表键 `RealTimeIsUniversal` 不存在时就是这种模式）。这是历史沿革——从 DOS 时代一路沿用下来。
- **Linux 默认：RTC 存 UTC**。`timedatectl` 里 `RTC in local TZ: no` 就是这个状态。UTC 是与时区无关的绝对时间，跨时区、夏令时切换都不会把 RTC 写乱，这也是 systemd 把 local RTC 模式标记为「cannot be fully supported」的原因。

也就是说：**两边的默认约定恰好相反**，装完什么都不设置，双系统切换必然差一个时区偏移（中国是 8 小时）。如果两个系统对同一块 RTC 采用了不同约定，比如：

1. 系统一按 UTC 读 RTC，显示时间 = RTC + 8h
2. 系统二按本地时间读 RTC，显示时间 = RTC 本身

那么只要 RTC 里存的是其中一种格式，另一个系统读出来就必然差 8 小时。

更糟的是**写回循环**：两边在关机/校时后都会把系统时间写回 RTC。Ubuntu 一把 RTC 改写成 UTC 格式，Windows 下次启动读到就错了 8 小时；Windows 再把它改回本地时间格式，Ubuntu 下次启动又错了——这就是「时间来回变化」的原因。

## 三、排查：两边分别查看 RTC 约定

两个系统的命令不一样，要分别查。

**Ubuntu 侧**执行：

```bash
timedatectl
```

重点关注两行输出：

```text
Local time: 六 2026-09-20 22:30:00 CST    # 是否与真实时间一致
RTC in local TZ: no                       # no = 按 UTC 对待硬件时钟（Linux 默认）
                                          # yes = 按本地时间对待硬件时钟
```

**Windows 侧**没有 `timedatectl`，用 PowerShell（管理员不是必需，查询不需要提权）查注册表：

```powershell
(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\TimeZoneInformation").RealTimeIsUniversal
```

- 输出 `1` → Windows 按 UTC 对待硬件时钟（相当于 `RTC in local TZ: no`）
- **什么都不输出 / 0**（Windows 的默认状态）→ 按本地时间对待硬件时钟（相当于 `RTC in local TZ: yes`）

在这个场景里，典型结果就是：Ubuntu 显示 `RTC in local TZ: no`，而 Windows 的 `RealTimeIsUniversal` 不存在——一个按 UTC、一个按本地时间，坐实了根因。

## 四、修复：统一约定为 UTC

推荐把**两边都统一成 UTC**（Linux 标准做法，也是硬件时钟的「标准答案」）。两个系统各改各的，不存在「一条命令两边跑」：

**① Ubuntu 侧**（若 `RTC in local TZ` 已是 `no`，只需做 NTP 校时）：

```bash
sudo timedatectl set-local-rtc 0   # 按 UTC 对待硬件时钟
sudo timedatectl set-ntp true      # 开启 NTP 自动校时
```

顺带一提：如果系统处于 local RTC 模式（`RTC in local TZ: yes`，即本文要修掉的那种状态），`timedatectl` 会持续提示：

```text
Warning: The system is configured to read the RTC time in the local time zone.
         This mode cannot be fully supported. ...
```

执行 `set-local-rtc 0` 改回 UTC 后，这条警告即消失。

**② Windows 侧**：Windows 默认按**本地时间**读硬件时钟，需要以**管理员身份**运行，把它切到 UTC：

```cmd
reg add "HKLM\SYSTEM\CurrentControlSet\Control\TimeZoneInformation" /v RealTimeIsUniversal /t REG_DWORD /d 1 /f
```

设置后 `RealTimeIsUniversal = 1` 表示按 UTC 对待 RTC；可用第三节那条查询命令确认生效。改完后 Windows 当前显示的时间可能需要重新校准一次（联网后 Windows Time 会自动同步，或在设置里手动「立即同步」）。

两边约定统一后，RTC 里只存一种格式的时间，切换系统就不会再来回跳了。

> 另一种反向做法是让 Ubuntu 迁就 Windows（`sudo timedatectl set-local-rtc 1`），只改一边就能生效，但 systemd 会持续警告此模式不推荐，不作为首选。

## 五、如果设置一致还跳时间

若两边的约定设置本来就一致，问题可能出在别处：

- **Ventoy 持久化分区没有真正生效**，每次启动都当成全新 live 系统初始化时钟设置；
- 持久化系统未联网、没做 NTP 同步，RTC 被另一个系统改写后无法自动纠正。

此时优先检查 Ventoy 持久化配置（`ventoy.json` 中的 persistence 插件）是否对该 ISO 生效。

## 六、小结

| 项目 | 说明 |
| --- | --- |
| 现象 | 双系统切换后时间差恰好 8 小时，且来回跳 |
| 根因 | 两系统**默认约定相反**：Windows 默认 RTC 存本地时间，Linux 默认 RTC 存 UTC，且互相写回 |
| 诊断 | Ubuntu 用 `timedatectl` 看 `RTC in local TZ`；Windows 查注册表 `RealTimeIsUniversal`（不存在/0 = 本地时间，1 = UTC） |
| 修复 | Ubuntu `sudo timedatectl set-local-rtc 0` + `set-ntp true`；Windows（管理员）设 `RealTimeIsUniversal = 1` |

一句话：**Windows 和 Linux 对硬件时钟的默认约定天生相反**——硬件时钟只有一个，装完双系统必须先统一约定。差 8 小时且来回变，先查两边对 RTC 的解读方式。
