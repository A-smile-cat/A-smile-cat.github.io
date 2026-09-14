---
title: 宇树 Go2-EDU 开发与学习指南
date: 2026-09-14
order: 3
category: 具身智能
tags:
  - 具身智能
  - 机器人
  - 四足机器人
  - Unitree
  - Go2
  - SDK
  - 开发指南
---

## 1. 宇树科技简介

Unitree（宇树科技，Unitree Robotics Co., Ltd.）是一家专注于四足机器人研发与制造的中国高科技企业。

**产品定位**

- 开发并生产高性能四足机器人，如 Go2 和 B2 系列；
- 机器人具备行走、跑步、爬楼梯、跳跃、趴下、起立、跳舞等运动能力。

**软件生态与开源支持**

- 开源控制工程 `unitree_guide`，用于四足机器人基础控制算法实践，配套教材《四足机器人控制算法——建模、控制与实践》；
- 开发者可通过 DDS/ROS 接口访问底层传感器与执行器数据（如电机状态 `MotorState`、电池状态 `BmsState` 等 IDL 定义）。

**移动应用生态**

| App | 面向机型 | 账号类型 | 主要功能 |
| --- | -------- | -------- | -------- |
| Unitree Go | Go2 | 个人用户注册 | 高清图传、遥控操作、传感器数据查看 |
| Unitree Explore | B2 | 企业账号登录 | 功能类似，侧重专业/行业应用 |

**技术能力**

- 完整的软硬件协同：从电机驱动、电池管理（BMS）、IMU、足端力传感器到上层运动控制算法；
- 多种连接方式（蓝牙绑定 + Wi-Fi / AP 热点直连），低延迟远程操控与实时数据回传。

简言之：Unitree 是一家以四足机器人为核心产品的科技公司，覆盖硬件研发、控制算法、开源工具链及用户级移动应用的全栈解决方案提供商。

## 2. Go2 与 Go2-EDU 的区别

### 2.1 共同点

- 均采用 DDS 作为核心通信中间件（兼容 ROS2，需适配 RMW）；
- 都支持通过 WebRTC 实现音视频、点云、控制指令等实时数据传输；
- 硬件架构相似：电机、雷达、UWB 等传感器通过串口接入，再转发至 DDS 层；
- 均可通过 MQTT 与云服务通信，支持 OTA 升级、故障上报等。

### 2.2 核心区别

| 项目 | Go2（标准版） | Go2-EDU（教育版） |
| ---- | -------------- | ------------------ |
| 定位 | 商业/消费级产品，面向终端用户或行业应用 | 教育/开发用途，面向高校、研究机构、开发者 |
| SDK 支持 | 提供基础 SDK（如 `unitree_sdk2` C++ 库），但可能限制底层接口访问 | 明确强调"搭建环境、配置参数、SDK 下载及安装、创建自己的应用并运行成功"，提供更完整的开发支持 |
| ROS2 支持 | 未明确提及是否开放 ROS2 接口 | 明确说明"EDU 版本可以通过 DDS 或 ROS2 调用接口"，官方支持 ROS2 接入 |
| 多媒体模块 | 未特别说明开放性 | "EDU 及以上版本的多媒体模块面向二次开发，支持 GST 推流"，开放 GStreamer 图传推流能力 |
| 开发文档覆盖 | 主要聚焦于 App 使用、云服务、远程控制等 | 有专门章节《Application Development》指导从环境搭建到应用创建全流程 |

### 2.3 结论

Go2-EDU 是 Go2 的教育/开发增强版本，在保持硬件平台一致的基础上，显著增强了二次开发支持：

- 官方提供完整 SDK 开发指南；
- 明确支持 ROS2 接口；
- 开放 GStreamer（GST）多媒体推流能力；
- 更适合用于教学、算法研究（如强化学习示例中使用的即为 EDU 相关环境）。

因此，若用于科研、教学或自定义算法部署（如结合 Isaac Gym 训练控制器），**Go2-EDU 是更合适的选择**；而标准 Go2 更侧重开箱即用的远程操控与云服务集成。

## 3. 官方文档资源

与 Go2-EDU 直接相关的文档集中在宇树官方开发者支持页面（support.unitree.com）。

### 3.1 明确提及 Go2-EDU 的文档

**《Application Development》（应用开发指南）**

- URL: <https://support.unitree.com/home/zh/developer/Application_development>
- 内容：明确说明"用户拿到 EDU-Go2 后，如何搭建环境、配置参数、SDK 下载及安装，以及创建自己的应用并运行成功"；
- 定位：针对 Go2-EDU 的入门级开发指南，涵盖从环境配置到第一个应用运行的全流程。

### 3.2 核心 SDK 文档

**《Obtain SDK》（SDK 获取与介绍）**

- URL: <https://support.unitree.com/home/zh/developer/Obtain_SDK>
- 内容：提供 `unitree_sdk2` 的介绍、下载地址（GitHub）以及配套《Go2 SDK 开发指南》指引；
- 定位：Go2-EDU 二次开发的基础，所有控制与感知功能均通过此 SDK 实现。

**《DDS Services》（服务接口文档）**

- URL: <https://support.unitree.com/home/zh/developer/DDS_services>
- 内容：列出关键客户端类（如 `SportClient`、`RobotStateClient`、`VuiClient`、`ObstaclesAvoidClient`），并链接到各服务的详细接口文档；
- 定位：适用于高级功能开发，如运动控制、避障、状态监控等。

### 3.3 辅助资料

**Go2 简化模型（STEP/URDF）**

- URDF 链接：`unitree_ros/go2_description`；
- 用途：仿真建模、机械设计验证（如 ROS/Gazebo 仿真）。

**案例参考（Case Reference）**

- URL: <https://support.unitree.com/home/zh/developer/Case_reference>
- 用途：提供实际项目示例，快速理解 Go2-EDU 的能力边界与典型用法。

## 4. 建议学习路径（新手）

1. 阅读 **Application Development** → 快速上手环境搭建与第一个程序；
2. 下载并熟悉 **unitree_sdk2**（GitHub）+ 配套《Go2 SDK 开发指南》；
3. 结合 **Case Reference** 中的示例代码进行实操；
4. 按需查阅 **DDS Services** 及其子文档实现特定功能（如避障、语音交互等）。

## 5. 开发入门 Checklist

- [ ] 机器人完成初始化，App 可遥控，已连入局域网；
- [ ] 开发机与机器人网络互通（DDS 通信可达）；
- [ ] `unitree_sdk2` 下载、编译/安装通过；
- [ ] 跑通第一个官方例程（站起/行走/状态打印）；
- [ ] 仿真环境（Gazebo + `go2_description`）可运行；
- [ ] 书签好《Application Development》《Obtain SDK》《DDS Services》《Case Reference》四份文档。

## 参考资料

- [宇树开发者支持站点 · Application Development](https://support.unitree.com/home/zh/developer/Application_development)
- [宇树开发者支持站点 · Obtain SDK](https://support.unitree.com/home/zh/developer/Obtain_SDK)
- [宇树开发者支持站点 · DDS Services](https://support.unitree.com/home/zh/developer/DDS_services)
- [宇树开发者支持站点 · Case Reference](https://support.unitree.com/home/zh/developer/Case_reference)
- [unitree_sdk2（GitHub）](https://github.com/unitreerobotics/unitree_sdk2)
- [unitree_ros（GitHub，含 go2_description）](https://github.com/unitreerobotics/unitree_ros)
- [unitree_guide（GitHub）](https://github.com/unitreerobotics/unitree_guide)
