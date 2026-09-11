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

## 10. 宏观架构分析：这套系统是如何"组装"起来的

### 10.1 设计哲学的分层解剖："零架构改动"到底动了什么

VLASH 号称"零架构改动、零额外推理开销"，但读完代码会发现它其实在**五个不同层面**各动了一刀，每层独立可开关（全部由 YAML 配置驱动），组合起来才构成完整方案：

```
┌─ 第 5 层【执行层】action_quant_ratio：牺牲轨迹精度换执行时间
├─ 第 4 层【算子层】fuse_qkv / fuse_gate_up / torch.compile：同样的数学，更快的实现
├─ 第 3 层【调度层】inference_overlap_steps + future state：把推理藏进行动执行
├─ 第 2 层【损失层】shared_observation：同样的训练效果，1/13 的视觉编码算力
└─ 第 1 层【数据层】max_delay_steps 时间偏移：教会模型"观察可能是过期的"
```

这个分层本身就是对"VLA 实时化"这个问题的一次完整问题分解：

- **第 1 层解决"模型能不能接受过期输入"**（能力问题）——没有它，第 3 层的调度会让输出滞后；
- **第 2 层解决"第 1 层的训练代价能不能压下来"**（算力问题）——它不改变模型行为，只改变训练效率；
- **第 3 层解决"推理时间藏到哪里"**（调度问题）——没有第 1 层，它就没有安全余量；
- **第 4 层解决"单次推理够不够快"**（速度问题）——overlap 窗口只有 `overlap_steps / fps` 秒（示例中 4/30 ≈ 133ms），compile 和算子融合是为了挤进这个窗口；
- **第 5 层是逃生舱**：显卡实在慢，就把动作播放速率翻倍、推理窗口同步翻倍（`effective_overlap_steps = overlap × quant_ratio`，见 11.3 节）。

**注意层的独立性带来的组合性**：`max_delay_steps=0` + `overlap=0` 就退化成标准同步 LeRobot 训练/推理；只开第 1 层就是"抗延迟微调"；全部打开才是完整的 VLASH。这种"每个创新点都能单独消融"的结构，是经过良好实验设计的研究代码才有的形态。

### 10.2 宏观数据流：训练侧与部署侧的两条流水线

**训练侧**（`vlash train`）：

```
LeRobotDataset (v2.1/v3.0, compat.py 兼容)
  → VLASHDataset / SharedObservationVLASHDataset   ← 第 1 层：随机偏移 / 全偏移展开
  → collate（共享观察时由 shared_observation_collate_fn 打包 offset_mask）
  → Accelerate 封装的训练循环（train.py，改自 lerobot 官方训练器）
  → policy.forward / policy.forward_shared_observation   ← 第 2 层分支点
  → LoRA/QLoRA（lora/apply.py 在实例化后注入 PEFT 层）
```

**部署侧**（`vlash run`）：

```
相机(30Hz) → should_fetch_observation? ——否→ 复用旧观察
                    │是
                    ▼
        VLASHAsyncManager 状态机（should_switch / should_launch_next）
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
  get_current_action      launch_next_inference（未来状态感知 + GPU 前向）
        │                       │
        ▼                       ▼
  robot.send_action        next_chunk（留在 GPU 上待命）
  （action_quant_ratio 决定本步是否真的发送）
```

一个宏观上必须澄清的事实：**VLASH 的"异步"并没有用多线程**。`run_loop` 是单线程的——`launch_next_inference` 在控制线程里同步阻塞执行。所谓"重叠"，真正的机制是：推理发生在动作块还剩 4 步的时刻，推理耗时会推迟这 4 步的执行节拍（`busy_wait` 只在发动作后补偿到整帧），但**动作块之间的切换是零等待的**——机器人永远不会在"上一块播完、下一块没算好"的空档里干等。因此整个方案成立的物理条件是：**单次推理耗时 < overlap_steps × (1/fps)**（示例约 133ms）。第 4 层优化和 README 里 RTX 5090 跑 30Hz 的声明，都是在保证这个不等式成立。

### 10.3 生态站位：为什么重写 π₀.₅ 而不是 import 它

VLASH 的 `policies/pi05/`（1576 行）不是对 Physical Intelligence 官方 `openpi` 仓库的引用，而是一次**面向 LeRobot 接口的重写**：

- 模型实现改造成 LeRobot 的 `PreTrainedPolicy` 风格（`from_pretrained` / `predict_action_chunk` / `normalize_inputs`），从而能直接吃 LeRobotDataset、直接驱动 LeRobot 硬件；
- π₀.₅ 原版的"流匹配 + VLM 主干 + 动作专家"结构保留，但把 `PaliGemma` 主干和动作专家组织成**双流前向**（`hidden_states = [prefix_embs, suffix_embs]`，各自有独立的 LayerNorm/adaRMS/输出投影，共享注意力）——这个双流结构正是后面"共享观察"能塞进同一层注意力的前提（11.4 节）；
- 代价是对 LeRobot 版本强锁定（`lerobot==0.4.1`、指定 commit 的 transformers），由 `datasets/compat.py` 打补丁维持。

这体现了韩松组对"部署框架"的理解：**效率优化的前提是控制整条链路**。如果 π₀.₅ 是个外部黑盒，`init_qkv_fusion_from_existing`（加载后拆开权重重新打包成融合层）、`forward_shared_observation`（改写前向计算图）、把 `sample_actions` 挂 `torch.compile` 这些操作全都做不了。重写的 1500 行买来了对计算图的完全支配权。

### 10.4 失败模式与安全边界（代码里的那部分）

- **延迟超出训练分布**：`max_delay_steps=12` 意味着推理时若实际延迟超过 12 步（示例配置下 12×33ms ≈ 400ms），模型进入没见过的数据区域，输出可靠性下降。慢显卡 + 大模型组合必须靠第 5 层（量化执行）拉长物理时间窗口来匹配；
- **未来状态的近似误差**：`observation.state` 被替换为"动作块的最后一个动作"，前提是这串动作会被完整、无干扰地执行。中途被人掰了一下机械臂，未来状态就错了——模型会基于一个"没发生的现在"做规划。代码提供的缓解是 `use_state_ground_truth`（训练时用真值状态），但推理时无法拿到真值，这是方法本身的边界；
- **compile 触发重编译**：torch.compile 按输入 shape 特化编译。如果相机分辨率或 batch 形状在运行中变化，会触发数十秒的重编译——`validate_robot_cameras` 在启动时强制相机与训练配置完全一致，既是正确性检查，也是编译稳定性的保障；
- **阈值护栏都在启动时而非运行时**：`RunConfig.__post_init__` 的校验（overlap ≥ 0、quant ≥ 1、async 必须 compile）全部发生在进程启动阶段，运行中没有在线监控——长时间真机运行需要自己加看门狗。

## 11. 关键代码精读：核心源码走读

这一节把 VLASH 仓库里最关键的几段代码摊开讲——每段后面跟"为什么这么设计"。所有摘录来自 `mit-han-lab/vlash` 实际源码（有删减，删减处用 `...` 标出）。

### 11.1 时间偏移数据集：一次 override 改写整个数据分布（`vlash/datasets/vlash_dataset.py`）

核心改动小得惊人——只重写了 LeRobotDataset 的 `_get_query_indices` 一个方法：

```python
def _get_query_indices(self, idx: int, ep_idx: int):
    ep = self.meta.episodes[ep_idx]
    ep_start, ep_end = ep["dataset_from_index"], ep["dataset_to_index"]

    # 均匀采样 offset ∈ [0, max_delay_steps]
    offset = random.randint(0, self.max_delay_steps) if self.max_delay_steps > 0 else 0
    self._last_offset = offset

    for key, delta_idx in self.delta_indices.items():
        query_indices[key] = [
            max(ep_start, min(ep_end - 1, idx + delta + offset)) for delta in delta_idx
        ]
        # 越界位置打上 padding 标记，训练损失会把它们屏蔽掉
        padding[f"{key}_is_pad"] = torch.BoolTensor(
            [(idx + delta + offset < ep_start) | (idx + delta + offset >= ep_end) for delta in delta_idx]
        )
    return query_indices, padding
```

**设计要点**：父类的 `delta_indices` 描述"每个特征要取 t 起往后哪几帧"，VLASH 只是把所有索引统一加了一个随机 `offset`，再 clamp 到 episode 边界。越界不报错而是打 `*_is_pad` 标记交给损失函数屏蔽——这样 episode 结尾附近的样本也能安全使用大 offset，不会浪费数据。

`__getitem__` 里再补上"未来状态"：

```python
if self.use_state_ground_truth:
    future_idx = max(ep_start, min(ep_end - 1, idx + offset))
    new_state = self.hf_dataset[future_idx]["observation.state"]     # 直接读真值状态
else:
    prev_idx = max(ep_start, min(ep_end - 1, idx + offset - 1))
    prev_action = self.hf_dataset[prev_idx]["action"]               # 用「上一步动作」当状态
    if state_dim == action_dim:
        new_state = prev_action
    else:
        raise ValueError("... For LIBERO, set use_state_ground_truth=True.")
```

注意代码里的显式守卫：**"动作代状态"这条路硬性要求 state_dim == action_dim**，不满足直接抛异常并提示改用真值模式——宁可训练中断也不静默喂错数据。对 SO-101 这类关节角编码的机械臂，状态和动作确实都是 6 维关节角，`a_{t+offset-1}` 执行完机器人就恰好处于该位姿，所以这个近似是无噪的。

### 11.2 VLASHAsyncManager：一个状态机管完整个异步流程（`vlash/run.py`）

整个异步调度器就是三个谓词 + 一个状态转移：

```python
class VLASHAsyncManager:
    def should_switch_chunk(self) -> bool:
        return self.chunk_index == 0                                  # 到块头 → 切换

    def should_launch_next_inference(self) -> bool:
        return self.chunk_index == self.n_action_steps - self.overlap_steps
        # 还剩 overlap_steps 步 → 提前开跑下次推理

    def should_fetch_observation(self) -> bool:
        return (not self.is_running()) or self.should_launch_next_inference()
        # 只在「启动推理的时刻」才碰相机

    def launch_next_inference(self, observation):
        observation = copy(observation)
        # ★ 未来状态感知：把状态换成当前块最后一个动作
        last_action = self.current_chunk[self.n_action_steps - 1] if self.current_chunk is not None else None
        if last_action is not None:
            observation["observation.state"] = last_action
        with torch.inference_mode():
            observation = prepare_observation_for_inference(...)
            action_chunk = self.policy.predict_action_chunk(observation)
        return action_chunk.squeeze(0)
```

主循环 `get_action` 是一个干净的状态机：

```python
def get_action(self, observation_frame):
    if not self.is_running():                          # 开局：同步算第一块
        self.current_chunk = self.launch_next_inference(observation_frame).cpu().numpy()
    elif self.should_switch_chunk():                   # 块间切换
        self.current_chunk = self.next_chunk.cpu().numpy() if ... else None
        self.next_chunk = None
    if self.should_launch_next_inference():            # 异步预计算下一块
        self.next_chunk = self.launch_next_inference(observation_frame)
    action = self.get_current_action()
    self.chunk_index = (self.chunk_index + 1) % self.n_action_steps
    ...
```

两个容易被忽略的工程细节：

1. **`next_chunk` 留在 GPU 上，切换时才 `.cpu().numpy()`**——GPU→CPU 的数据搬运也被挪出了推理的关键路径，切块瞬间只做一次轻量拷贝；
2. **`launch_next_inference` 里 `copy(observation)` 是浅拷贝**——替换 `observation.state` 不会污染调用方的字典，下一时间步仍能拿到原始状态。这个"复制再改"的写法避免了异步下最隐蔽的一类 bug：共享可变状态。

### 11.3 异步的硬性前提：torch.compile 不是可选项

`vlash/configs/run_config.py` 里有一条强制校验：

```python
# Async inference requires compiled model for CPU overlap
if self.inference_overlap_steps > 0 and not self.policy.compile_model:
    raise ValueError(
        "When inference_overlap_steps > 0, policy.compile_model must be True. "
        "Async inference requires compiled model for CPU overlaping."
    )
```

这透露了 VLASH 异步方案的实现本质：**推理跑在 GPU 的同时，控制循环在 CPU 上继续执行动作**，所以单次推理必须足够快（能在 `overlap_steps` 步的执行时间内完成）。`compile_model: true` + `warmup_compiled_policy`（开跑前用 dummy 数据空跑 3 次触发编译）就是保证这一点的前置条件。另外 `run_loop` 里还有一行容易被漏看的换算：

```python
effective_overlap_steps = inference_overlap_steps * action_quant_ratio
```

打开动作量化（比如 2 倍速）后，同样的物理时间内"步数"翻倍，overlap 也要按比例放大，否则推理窗口会不够用。

### 11.4 共享观察训练：一条 batch 里同时练 13 种延迟

数据侧（`SharedObservationVLASHDataset.__getitem__`）对每个观察生成全部 `max_delay_steps + 1` 个分支：

```python
num_offsets = self.max_delay_steps + 1
base_item = super(VLASHDataset, self).__getitem__(idx)   # 图像/语言只取一次（共享）

result = {}
for key in base_item:
    if key.startswith("observation.images.") or key == "task" or ...:
        result[key] = base_item[key]                     # ★ 共享部分只放一份

for offset in range(num_offsets):
    states.append(...);  actions.append(...)             # 每个分支独立的状态/动作
result["observation.state"] = torch.stack(states, dim=0)  # [num_offsets, state_dim]
result["action"]           = torch.stack(actions, dim=0)  # [num_offsets, chunk, dim]
```

collate 函数再补一个 `offset_mask` 标记哪些分支有效。模型侧（`policies/pi05/modeling_pi05.py`）的 `forward_shared_observation` 是这场"省算力魔术"的执行者，核心手法是**把 B 个样本 × 13 个分支摊平成 B×13 条序列，前缀（视觉/语言 token）靠注意力掩码让所有分支共享，后缀（各分支自己的状态+动作 token）各自独立**：

```python
# 每个 Transformer 层内部：
suffix_flat = suffix.view(batch_size * num_offsets, suffix_length, hidden_dim)
cond_flat   = suffix_adarms_conds.view(batch_size * num_offsets, -1)
# 关键：adaRMS 条件化按「分支」分别做——13 个分支各有各的状态调制
suffix_normed_flat, gate = self.input_layernorm[1](suffix_flat, cond=cond_flat)
suffix_normed = suffix_normed_flat.view(batch_size, num_offsets * suffix_length, hidden_dim)
hidden_states[1] = suffix_normed
# 之后注意力把 [前缀 | 13×后缀] 拼在一起算，掩码保证分支之间互不可见
```

损失端同样精细——padding 的动作位、无效的 offset 分支都被逐元素乘零，最后只对有效分支取平均：

```python
losses = losses * in_episode_bound.unsqueeze(-1)     # episode 尾部 padding 清零
losses = losses * offset_mask[:, :, None, None]      # 无效 offset 分支清零
loss = losses.sum() / (num_valid_offsets * num_elements_per_offset).clamp(min=1)
```

**为什么要费这么大劲？** 视觉编码（SigLIP 过一遍图像）是 π₀.₅ 前向中最贵的部分之一。朴素做法下每个 offset 样本都要重新编码一次图像；共享后 13 个分支分摊一次编码，视觉编码开销直接除以 (max_delay_steps+1)。代价是序列变长、注意力计算变多，以及上面那些"分支间掩码 + 分支内条件化"的复杂度——典型的"用工程复杂度换训练算力"。

### 11.5 LoRA / QLoRA 配置：12GB 微调的实现（`vlash/configs/train_config.py`）

```python
@dataclass
class LoRAConfig:
    enable: bool = False
    backend: str = "peft"
    r: int = 16
    alpha: int = 16
    target_modules: List[str] = field(default_factory=lambda: [
        "q_proj", "k_proj", "v_proj", "o_proj",       # 注意力四件套
        "up_proj", "down_proj", "gate_proj",          # MLP 三件套
    ])
    # QLoRA：底座 4bit 量化
    use_qlora: bool = False
    qlora_quant_type: str = "nf4"           # Normalized Float 4
    qlora_compute_dtype: str = "bfloat16"
```

与 AsyncVLA"全网所有 Linear 都挂 LoRA、rank=128"的激进配置相反，VLASH 默认只挂 Transformer 标准的 7 类投影、rank=16——因为它微调的是**本来就预训练好的 π₀/π₀.₅ 动作模型**，只需要轻量适配新任务；而 AsyncVLA 的 Base 阶段是在给 VLM 塞进全新的导航能力，需要更大改动幅度。两个项目对 LoRA 的用法恰好是同一技术在不同改动深度需求下的两种配置策略。

### 11.6 算子融合：融合发生在"加载之后"（`vlash/layers/linear.py` + `init_qkv_fusion_from_existing`）

融合层本身的实现很直白——`QKVLinear` 就是一次大矩阵乘 + 一次切分：

```python
class QKVLinear(nn.Module):
    def __init__(self, hidden_size, head_size, total_num_heads, total_num_kv_heads=None, bias=False):
        total_num_kv_heads = total_num_kv_heads or total_num_heads
        output_size = (self.num_heads + 2 * self.num_kv_heads) * self.head_size  # 支持GQA：KV头数可与Q不同
        self.weight = nn.Parameter(torch.empty(output_size, hidden_size))

    def forward(self, x):
        out = F.linear(x, self.weight, self.bias)          # 1 次矩阵乘代替 3 次
        out = out.view(bsz, seqlen, total_heads, head_size)
        out = out.permute(0, 2, 1, 3).contiguous()
        q = out[:, :self.num_heads]                        # 切成 Q/K/V 三块
        k = out[:, self.num_heads : self.num_heads + self.num_kv_heads]
        v = out[:, self.num_heads + self.num_kv_heads :]
        return q, k, v
```

真正有意思的是**融合发生的时机**。`PI05Model.init_qkv_fusion_from_existing` 在模型加载完成后才被调用：遍历 VLM 主干和动作专家的每一层，取出已加载的 `q_proj/k_proj/v_proj`，新建 `QKVLinear` 并把三个独立权重**拼接打包**进去。这样做的收益是：预训练权重文件保持 HuggingFace 标准格式（可分享、可微调、可单独保存 LoRA 适配器），融合只是推理运行时的一种"视图"，关掉 `fuse_qkv: true` 一切回到原样。`MergedColumnLinear` 对 SwiGLU 的 gate/up 投影做同样的事。这是部署框架的典型手法：**权重存储格式和计算格式解耦**。

### 11.7 观察预处理的 GPU 化：一行注释里的带宽账（`vlash/utils.py`）

```python
def prepare_observation_for_inference(observation, device, task=None, robot_type=None):
    for name in observation:
        observation[name] = torch.from_numpy(observation[name])
        if "image" in name:
            # Transfer uint8 image to GPU first (1 byte/pixel vs 4 bytes for float32)
            # Then do all heavy operations (type cast, div, permute) on GPU
            observation[name] = observation[name].to(device)          # 先以 uint8 上 GPU
            observation[name] = observation[name].to(dtype=torch.float32).div_(255.0)
            observation[name] = observation[name].permute(2, 0, 1).contiguous()
            observation[name] = observation[name].unsqueeze(0)
        else:
            observation[name] = observation[name].unsqueeze(0).to(device)
    ...
```

640×480×3 的图像，float32 版本要占 3.7MB 的 PCIe 传输量，uint8 只要 0.9MB——归一化、除法、通道重排全部挪到 GPU 上做，主机到显卡的传输量降为 1/4。对 30Hz 控制循环来说每帧省下几毫秒的传输时间，正是 11.4 节那个"133ms 推理预算"里不该浪费的部分。这类优化的共同特点是：**不改变任何数学，只改变"在哪里算、以什么精度搬运"**。

### 11.8 流匹配的训练目标与去噪采样（`policies/pi05/modeling_pi05.py`）

π₀.₅ 的动作生成核心只有几行数学。训练时：

```python
# 噪声(=1) 与真实动作(=0) 之间线性插值出 x_t，模型学预测"速度" u_t
time_expanded = time[:, None, None]
x_t = time_expanded * noise + (1 - time_expanded) * actions
u_t = noise - actions                       # 真实速度场
...
v_t = self.action_out_proj(suffix_out)      # 模型预测的速度
loss = MSE(v_t, u_t)
```

推理时 `sample_actions` 从纯噪声出发，用预测的速度场迭代若干步积分回真实动作。两个值得注意的细节：

1. **时间步采样用 Beta(1.5, 1.0) 分布**而非均匀分布——偏向前段（t 小，靠近真实动作），因为去噪轨迹的"最后一段"误差对最终动作质量影响最大；
2. **双流结构是理解一切的前提**：前向中 `hidden_states = [prefix_embs, suffix_embs]`，prefix 是视觉/语言 token（走 VLM 主干的 LayerNorm/MLP），suffix 是"状态 + 含噪动作 + 时间嵌入"（走动作专家的分支），两流拼接后共享注意力，各自的 MLP 和归一化独立。adaRMS 条件化（状态向量调制 suffix 的 LayerNorm）就是"状态如何进入模型"的答案——也正因 suffix 是独立的流，11.4 节的"13 个分支各自条件化"才塞得进同一层注意力。

### 11.9 训练器的派发逻辑：一条 if 决定走哪条前向（`vlash/train.py`）

```python
def make_vlash_dataset(cfg):
    if cfg.shared_observation and cfg.max_delay_steps > 0:
        dataset = SharedObservationVLASHDataset(...)    # 全偏移展开 + 共享观察
    elif cfg.max_delay_steps > 0:
        dataset = VLASHDataset(...)                     # 随机偏移
    else:
        dataset = VLASHDataset(..., max_delay_steps=0)  # 标准 LeRobot 行为

def update_policy(..., use_shared_observation=False):
    if use_shared_observation:
        if hasattr(unwrapped_policy, 'forward_shared_observation'):
            loss, output_dict = unwrapped_policy.forward_shared_observation(batch)
        else:
            raise ValueError("Policy does not have a forward_shared_observation method")
```

训练循环本体几乎原封不动地继承自 LeRobot 官方 `lerobot_train.py`，所有新能力都通过"换数据集类 + 换前向方法"注入，且用 `hasattr` 做了防御式检查（防止对 π₀ 之类未实现共享前向的策略误开开关）。`train.py` 中还有一处决策逻辑值得留意：`use_shared_observation = cfg.shared_observation and cfg.max_delay_steps > 0`——共享观察只有在偏移增强打开时才有意义（没有偏移就没有"多分支"可共享），配置之间的这种依赖关系被代码显式守住了。

## 12. VLASH vs AsyncVLA：两种异步哲学的对决

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

## 13. 上手路径（从零到真机）

1. 建环境：`conda create -n vlash python=3.10`，装 ffmpeg 7.1.1，`pip install -e .`，再升级 torch/torchvision/torchcodec；
2. **没有机器人也能先玩基准**：`examples/benchmarks/inference_latency.yaml` 用 `lerobot/pusht` 公开数据集测量推理延迟，验证 async 带来的频率提升；
3. 采集数据：买一对 SO-101 主从臂（或用 LeRobot 支持的其他硬件），用 LeRobot 脚本录制演示；
4. 微调：复制 `examples/train/pi05/async.yaml`，把 `repo_id` 改成你的数据集，可选打开 `shared_observation: true`、配置 LoRA；
5. 部署：复制 `examples/inference/async.yaml`，填机器人串口和相机编号，`vlash run` 跑起来；
6. 调优：控制不稳先降 `fps` 或增大 `inference_overlap_steps`；执行太肉则试 `--action_quant_ratio=2`。

## 14. 局限与思考

- **依赖 LeRobot 的特定版本**（`lerobot==0.4.1`、指定 commit 的 transformers），升级生态可能要跟着改 `compat.py`；
- **时间偏移的半径有限**：`max_delay_steps=8~12` 意味着它能容忍的"观察过期"是有界的——如果你的推理慢到超过这个窗口，还是得回到 AsyncVLA 式的架构分工；
- **未来状态是"预测"而非"感知"**：用动作块的最后一个动作近似真实未来位姿，执行中途被外力干扰时，这个近似会偏离（代码也提供了 `use_state_ground_truth` 的真值模式来缓解）；
- 目前策略实现覆盖 π₀ / π₀.₅，其他 VLA 架构（OpenVLA 系）需要自己接入 `policies/factory.py`。

## 15. 延伸阅读

- 论文：[arXiv:2512.01031](https://arxiv.org/abs/2512.01031) ｜ 演示视频（YouTube，README 内链）
- 代码：[github.com/mit-han-lab/vlash](https://github.com/mit-han-lab/vlash)
- 前置技术：π₀ / π₀.₅（Physical Intelligence）、LeRobot（HuggingFace）、LoRA / QLoRA（PEFT）
- 配套阅读：本系列第一篇 [AsyncVLA 深度解析](./asyncvla-explained.md)
