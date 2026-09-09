---
title: VLASH 深度解析：让 VLA 机器人在消费级显卡上跑出 30Hz 的丝滑动作
date: 2026-09-09
order: 2
category: 具身智能
tags:
  - 具身智能
  - VLA
  - 异步推理
  - LoRA
  - LeRobot
  - 论文精读
---

本文是「研究中心」系列的第二篇，继续面向**零基础读者**，拆解 MIT 韩松实验室（mit-han-lab）的开源项目 **VLASH**。上篇 [AsyncVLA](./asyncvla-explained.md) 讲的是"大脑小脑分离"的硬件分工方案，本篇讲的是**另一种解题思路**：不拆模型，而是通过巧妙的训练与调度，让一个完整的 VLA 在单张消费级显卡上实现低延迟、平滑的实时控制。所有细节均来自对官方代码（`mit-han-lab/vlash`）的实际阅读。

<!-- more -->

## 1. 先复习：为什么 VLA 机器人会"卡"

上篇讲过，VLA 模型一次"看图 → 想动作"的推理要几百毫秒甚至更久。目前主流 VLA（比如 π₀、π₀.₅）都用**动作分块（action chunking）**来缓解：一次推理输出未来 N 步动作，机器人先把这批动作逐个执行完，再停下来做下一次推理。执行时间线长这样：

```
[推理(卡住)]→[动作1,动作2,...,动作N]→[推理(卡住)]→[动作1,动作2,...]
```

问题出在"卡住"的那一下：

1. **执行末尾变慢（动作饥饿）**：动作块快用完时，如果下一次推理还没算完，机器人只能等待——动作播放节奏被打断，看起来一顿一顿的；
2. **执行开头僵直**：推理用的观察是"动作块开始前"拍的，等动作执行时图像信息已经过时（**陈旧观察**，stale observation），模型输出和真实环境的错位会累积；
3. **大 N 才能掩盖延迟**：想多攒一些动作慢慢播，推理就得一次想很远——但环境一变，这批"远期计划"就全错了。

一句话：**异步执行和陈旧观察是同一枚硬币的两面。** 只要把推理和执行重叠起来（异步），推理时用的观察必然比执行时刻"旧"；而不重叠，就得忍受卡顿。

## 2. VLASH 的一句话方案

> **未来状态感知（Future-state-awareness）**：训练时教会模型——"你看到的观察可能是过期的，请预测机器人**未来会到达的状态**，而不是它现在的状态"；推理时再配合重叠调度，就能既异步又稳定，且**零额外推理开销**。

对照一下三种方案：

| 方案 | 延迟来源 | 代价 |
|---|---|---|
| 传统同步执行 | 每个动作块之间停顿等推理 | 卡顿 |
| AsyncVLA（上篇） | 硬件分工：大模型+小模型各一个时钟 | 需要额外的小模型、训练流程和部署链路 |
| **VLASH（本篇）** | 训练时做时间偏移增强 + 推理时预测未来状态 | **零架构改动、零推理开销**，只需重新微调 |

VLASH 的全称可以从它的训练模块 docstring 里找到线索：*Vision-Language-Action with State-aware asynchronous Horizon*（具有状态感知的异步时域 VLA）。

## 3. 项目是什么、谁做的

**VLASH**（Apache 2.0 开源）来自 **MIT 韩松实验室（mit-han-lab）**——韩松组是模型压缩与高效推理方向的顶级团队（此前以 DeepCompression、Once-for-All、AWQ 量化等工作闻名）。README 的口号是：

> *Easy-to-use VLA deployment, fast to react, smooth in motion.*（好用的 VLA 部署框架，反应快、动作顺滑）

官方给出的代表性成绩：**π₀.₅ 模型在 RTX 5090（消费级显卡）上跑到 30Hz 以上的推理频率**，并且：

- 与 **LeRobot** 生态（HuggingFace 的机器人库）无缝对接：数据集（v2.1 / v3.0 格式）、模型、真机硬件全都兼容；
- **YAML 配置驱动**：训练、推理、评测都是改配置文件就能跑；
- 支持多种策略架构（π₀.₅、π₀ 等）；
- **LoRA 微调在 12GB 显存的消费级显卡上就能完成**（TODO 列表里还有 8GB 的 QLoRA 计划）。

## 4. 零基础前置知识（本篇新增部分）

上篇讲过的概念（VLA、action chunk、LoRA 等）不再重复，这里补充 VLASH 特有的背景。

### 4.1 π₀ 与 π₀.₅ 是什么

π₀（pi-zero）是 Physical Intelligence 公司（机器人基础模型领域的明星公司）发布的 VLA 基础模型；π₀.₅ 是其升级版。它们的架构可以粗略理解为：SigLIP 视觉编码器 + Gemma 语言模型主干 + **流匹配（flow matching）动作专家**。

**流匹配**是一种生成模型技术：模型从一堆随机噪声出发，学着把噪声一步步"抹"成真实的动作序列（类似扩散模型画图，但数学上更简洁高效）。所以 π₀ 的动作生成是"噪声 → 完整动作块"的迭代去噪过程。

VLASH 的代码里对 π₀ / π₀.₅ 做了工程化改造（后面细讲），这也是为什么它的 `policies/` 目录下有 `pi0` 和 `pi05` 两套实现。

### 4.2 LeRobot：机器人界的 HuggingFace

**LeRobot** 是 HuggingFace 出品的开源机器人框架，目标是成为"机器人领域的 🤗"：

- **数据格式**：统一的 LeRobotDataset（把相机视频、关节状态、动作录成带时间戳的数据集，v2.1 / v3.0 是两个版本）；
- **模型库**：收录了 ACT、Diffusion Policy、π₀ 等主流策略，`from_pretrained` 一行加载；
- **硬件支持**：SO-101 等平价机械臂的驱动、遥控、数据采集脚本。

VLASH 的代码大量复用 LeRobot（`pyproject.toml` 里直接依赖 `lerobot==0.4.1`），训练脚本开头写着 *modified from lerobot/scripts/lerobot_train.py*。**这意味着：你用 LeRobot 采集的数据、买 SO-101 机械臂，都能直接接入 VLASH。**

### 4.3 SO-101 与"主从臂"

`examples/inference/async.yaml` 里配置的机器人是 `so101_follower`。SO-101 是 HuggingFace 生态里流行的一款**低成本 6 轴机械臂**，通常成对使用：一只"主臂"由人手动拖动示教，一只"从臂"跟随记录，从而低成本采集几百条操作演示数据。这是个人入门具身智能最经典的硬件路线。

### 4.4 torch.compile 与算子融合

- **torch.compile**：PyTorch 的即时编译功能，把一段 Python 模型代码编译成优化后的 GPU 指令，通常能提速 10%~50%，但编译本身要花几十秒——所以 VLASH 提供了"预热"函数，在机器人开跑之前先空跑几遍让编译完成，避免运行中突然卡一下；
- **QKV 融合 / gate_up 融合**：Transformer 里的注意力计算本来要做 3 次矩阵乘法（Q、K、V 各一次），把它们合并成 1 次大矩阵乘法（QKVLinear）能减少 GPU 调用次数、提高吞吐；MLP 里的 gate/up 投影同理。VLASH 自己实现了这两个融合层（`vlash/layers/`），推理时用 `fuse_qkv: true` 打开。

## 5. 核心机制一：时间偏移训练（让模型学会"接受过期照片"）

这是 VLASH 训练侧的核心创新，实现在 `vlash/datasets/vlash_dataset.py` 的 `VLASHDataset` 中。

**朴素做法的问题**：如果训练时模型见到的永远是"观察与动作块完美对齐"的数据（观察在第 t 帧，动作块从 t 开始），那推理时一旦异步——观察其实是 t−Δ 帧拍的——模型就会输出"对 t−Δ 时刻而言正确、对当前时刻而言滞后"的动作。

**VLASH 的做法**：训练时给每个样本随机加一个时间偏移 `offset ∈ [0, max_delay_steps]`（例如 0~12 步）：

```
原样本：观察 s_t，动作块 [a_t, a_{t+1}, ..., a_{t+49}]
偏移 5 后：观察 s_t（不变），动作块改为 [a_{t+5}, ..., a_{t+54}]，
          状态改为"未来状态"（详见下）
```

相当于告诉模型："这张照片可能已经是 5 步之前拍的了，但我需要你预测**从 t+5 开始**该做什么。"训练结束后，模型对 0~12 步的任意延迟都有鲁棒的输出。

**"未来状态"怎么定义？** 这里有个巧妙的设计（`use_state_ground_truth=False` 时的默认行为）：**用动作块开始前的最后一步动作 `a_{t+offset-1}` 充当"未来状态"**。为什么可行？因为对这台机械臂，**状态（state）和动作（action）维度一致**——上一时刻的动作执行完，机器人就到达了那个位姿。所以"过去的动作"就是"现在的状态"的无噪替代品，不需要数据集额外记录状态。若状态和动作维度不一致，则打开 `use_state_ground_truth` 直接读取数据集里记录的未来状态 `s_{t+offset}`。

推理时如何对上？看第 6 节——这正是 async manager 干的事。

## 6. 核心机制二：未来状态感知的异步推理

实现在 `vlash/run.py` 的 `VLASHAsyncManager` 类。先看它管理的时间线（代码注释里的原图）：

```
Chunk N:     [action_0, action_1, ..., action_{n-overlap}, ..., action_{n-1}]
                                            ↑
                                            |-- 在这里启动 Chunk N+1 的推理
Chunk N+1:   [action_0, action_1, ...]
             ↑
             |-- Chunk N 执行完后无缝切换
```

三个关键方法把整个异步流程织在一起：

- **`should_launch_next_inference()`**：当前动作块播放到第 `n_action_steps - overlap_steps` 步时，启动下一次推理（`inference_overlap_steps=4` 表示还剩 4 步时开始）——推理耗时被最后 4 步的执行时间"藏"住，动作块之间不再停顿；
- **`launch_next_inference()`（未来状态感知）**：启动推理时，把观察字典里的 `observation.state` 替换成**当前动作块的最后一个动作**——即"执行完这块动作后，机器人应该处于的位姿"。于是模型收到的输入是：*过期的图像 + 预测的未来状态*。**这与训练时"过期观察 + 未来动作块 + 未来状态"的配对完全一致**，所以模型输出依然准确。这就是"零开销"的含义：没有第二个网络、没有额外前向计算，只是替换了一个状态向量；
- **`should_fetch_observation()`**：只在"启动推理的时刻"才拍新照片，其余时间步不碰相机——降低相机延迟对控制环的干扰。

**参数怎么调？** `overlap_steps` 越大，推理时间越充裕（对越慢的显卡越必要），但用的观察越旧；`n_action_steps=32` 且 `overlap=4` 是默认示例。README 声称这套机制让 π₀.₅ 在 RTX 5090 上稳定 30Hz+。

## 7. 核心机制三：共享观察训练（省 13 倍算力的批量偏移）

上一节的"随机采样一个 offset"有个训练效率问题：同一个观察，每次只练一个偏移，模型要见到 13 个不同偏移的样本才算把 0~12 全练过。`SharedObservationVLASHDataset` 的方案：

> **对每个观察，把所有合法偏移 [0, max_delay_steps] 一次性全部生成**：图像和语言 token 只编码一次（13 个偏移共享这份昂贵的视觉编码），每个偏移有自己的状态/动作目标和独立的注意力掩码（防止不同偏移的序列互相"串台"）。

代价是 batch 里的序列变长（13 份 suffix），收益是**视觉编码部分的计算量直接省了 (max_delay_steps+1) 倍**（约 13×）。策略模型里对应实现了 `forward_shared_observation` 前向（每个偏移的 suffix 分支各自做 adaRMS 条件化，再拼起来做注意力），训练配置里 `shared_observation: true` 一键打开。

## 8. 核心机制四：动作量化（执行更快）与 LoRA 微调（训练更省）

### 8.1 动作量化（action quantization）

命令行一个参数就能加速执行：

```bash
vlash run examples/inference/async.yaml --action_quant_ratio=2   # 2 倍速
```

原理：原策略每步输出一个精细动作，量化比 2 表示**每 2 步只发一次指令**（机器人每步执行动作块里隔一步的值），相当于把执行频率翻倍、总执行时间减半——代价是轨迹精度略降。`run_loop` 里就一行判断 `(step_count + 1) % action_quant_ratio == 0` 决定是否发动作。

### 8.2 LoRA / QLoRA 与 12GB 微调

- **LoRA**：冻结 π₀/π₀.₅ 底座，只训练插入的小矩阵（rank 可配）。VLASH 的 `vlash/lora/` 提供了 apply（挂载）、checkpoint（保存/合并）、QLoRA（4bit 量化底座，进一步省显存）全套工具；
- **dtype 细节**：底座 bf16 + LoRA 适配器，保存时还有"适配器对齐底座精度"的工具函数，避免混合精度加载报错；
- 官方 TODO 显示 π₀/π₀.₅ 的 LoRA 微调已支持 **12GB 显存**（如 RTX 3060/4070 级别），QLoRA 8GB 在计划中——对比 AsyncVLA 的 5×H200，这是消费级玩家真正摸得着的门槛。

### 8.3 推理侧优化全家桶

`fuse_qkv / fuse_gate_up`（第 4.4 节的算子融合）、`compile_model: true`（torch.compile + 预热）、bf16 推理——全部是 YAML 里的开关，不需要改代码。

## 9. 代码库导览

```
vlash/
├── vlash/
│   ├── cli.py                # 命令行入口：vlash train / run / benchmark
│   ├── train.py              # 训练主脚本（改自 lerobot 官方训练器）
│   ├── run.py                # ★ 推理主脚本：VLASHAsyncManager + run_loop
│   ├── configs/
│   │   ├── train_config.py   # VLASHTrainConfig：max_delay_steps / shared_observation / LoRAConfig
│   │   └── run_config.py     # 推理配置：overlap_steps / action_quant_ratio / 融合开关
│   ├── datasets/
│   │   ├── vlash_dataset.py  # ★ VLASHDataset（时间偏移）+ SharedObservationVLASHDataset
│   │   └── compat.py         # 对 LeRobot v2.1/v3.0 两种格式的兼容补丁
│   ├── policies/
│   │   ├── pi0/ pi05/        # 两套策略实现（含 forward_shared_observation）
│   │   └── factory.py        # 按配置实例化策略
│   ├── lora/                 # LoRA/QLoRA 工具集
│   └── layers/               # QKVLinear / MergedColumnLinear 融合层
├── examples/
│   ├── train/                # pi0、pi05 的 async/sync/async_lora YAML 配置
│   ├── inference/            # async 推理配置（SO-101 机械臂）
│   └── benchmarks/           # 推理延迟基准
└── benchmarks/               # benchmark_inference_latency.py 实现
```

**三条最常用的命令**（来自 README）：

```bash
vlash train examples/train/pi05/async.yaml        # 异步微调
vlash run examples/inference/async.yaml           # 真机异步推理
vlash run examples/inference/async.yaml --action_quant_ratio=2   # 2 倍速执行
```

**async.yaml 里的关键参数**（真机配置示例）：

```yaml
robot:
  type: so101_follower          # SO-101 从臂
  cameras:
    wrist: {type: opencv, index_or_path: 0}   # 腕部相机
policy:
  n_action_steps: 32            # 每个动作块 32 步
  compile_model: true           # torch.compile（异步推理必需）
  fuse_qkv: true
  fuse_gate_up: true
fps: 30                         # 控制频率 30Hz
inference_overlap_steps: 4      # 剩 4 步时提前启动下次推理
action_quant_ratio: 1           # 动作量化比（2 = 双倍速）
```

## 10. VLASH vs AsyncVLA：两种异步哲学的对决

两个项目都在解决"VLA 推理慢"这同一个问题，但路线截然不同，放在一起看非常有意思：

| 维度 | AsyncVLA（Berkeley） | VLASH（MIT 韩松组） |
|---|---|---|
| **解决思路** | 硬件分工：大模型（远程）+ 小模型（本体）双时钟 | 单模型：训练时教模型容忍过期观察，推理时预测未来状态 |
| **模型改动** | 新增 Edge Adapter 小网络 | **零架构改动**，只改训练数据分布和推理调度 |
| **额外推理开销** | Edge Adapter 常驻（虽小） | **零**（只替换一个状态向量） |
| **任务类型** | 户外/园区**导航**（2D 平面运动） | 机械臂**操作**（高维关节控制） |
| **模型底座** | OpenVLA-OFT / OmniVLA（7B） | π₀ / π₀.₅（LeRobot 生态） |
| **训练门槛** | Base 阶段 5×H200 | LoRA 微调 12GB 消费级显卡 |
| **部署形态** | 远程工作站 + 机器人端 ROS1 | 单机单卡，YAML 一键部署 |
| **核心技术** | 模态掩码、双帧编码、PD 控制 | 时间偏移增强、未来状态感知、共享观察训练、动作量化 |
| **生态** | 自成体系（ViNT 系） | 深度拥抱 LeRobot/HuggingFace |

**怎么选？** 如果你研究的是**移动机器人导航**、有多卡资源、需要多模态目标指定（卫星图/GPS），AsyncVLA 的架构更对口；如果你想在**消费级硬件上让机械臂丝滑干活**、或已经在用 LeRobot 生态，VLASH 是几乎零门槛的选择。两者合起来，恰好是"具身智能落地"两大流派（机器人系统派 vs 高效计算派）的代表作。

## 11. 上手路径（从零到真机）

1. 建环境：`conda create -n vlash python=3.10`，装 ffmpeg 7.1.1，`pip install -e .`，再升级 torch/torchvision/torchcodec；
2. **没有机器人也能先玩基准**：`examples/benchmarks/inference_latency.yaml` 用 `lerobot/pusht` 公开数据集测量推理延迟，验证 async 带来的频率提升；
3. 采集数据：买一对 SO-101 主从臂（或用 LeRobot 支持的其他硬件），用 LeRobot 脚本录制演示；
4. 微调：复制 `examples/train/pi05/async.yaml`，把 `repo_id` 改成你的数据集，可选打开 `shared_observation: true`、配置 LoRA；
5. 部署：复制 `examples/inference/async.yaml`，填机器人串口和相机编号，`vlash run` 跑起来；
6. 调优：控制不稳先降 `fps` 或增大 `inference_overlap_steps`；执行太肉则试 `--action_quant_ratio=2`。

## 12. 局限与思考

- **依赖 LeRobot 的特定版本**（`lerobot==0.4.1`、指定 commit 的 transformers），升级生态可能要跟着改 `compat.py`；
- **时间偏移的半径有限**：`max_delay_steps=8~12` 意味着它能容忍的"观察过期"是有界的——如果你的推理慢到超过这个窗口，还是得回到 AsyncVLA 式的架构分工；
- **未来状态是"预测"而非"感知"**：用动作块的最后一个动作近似真实未来位姿，执行中途被外力干扰时，这个近似会偏离（代码也提供了 `use_state_ground_truth` 的真值模式来缓解）；
- 目前策略实现覆盖 π₀ / π₀.₅，其他 VLA 架构（OpenVLA 系）需要自己接入 `policies/factory.py`。

## 13. 延伸阅读

- 论文：[arXiv:2512.01031](https://arxiv.org/abs/2512.01031) ｜ 演示视频（YouTube，README 内链）
- 代码：[github.com/mit-han-lab/vlash](https://github.com/mit-han-lab/vlash)
- 前置技术：π₀ / π₀.₅（Physical Intelligence）、LeRobot（HuggingFace）、LoRA / QLoRA（PEFT）
- 配套阅读：本系列第一篇 [AsyncVLA 深度解析](./asyncvla-explained.md)
