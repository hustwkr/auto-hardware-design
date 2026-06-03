# ⚡ 自动硬件设计工具
# Auto Hardware Design Tool

一站式自动化硬件设计辅助工具集，覆盖电源、安规、热设计等常见硬件工程计算场景。
持续集成更多模块。

A one-stop automated hardware design assistant toolset covering power, safety, thermal, and other common hardware engineering calculations. More modules are continuously being integrated.

---

## 模块列表 Modules

### 1. 电解电容寿命计算
### Electrolytic Capacitor Lifetime Calculator

基于 Arrhenius 加速模型 + Miner 累积损伤法则，支持多段运行剖面、多频率纹波电流叠加、质保期判定及报告导出。

An electrolytic capacitor lifetime evaluation tool based on the Arrhenius acceleration model and Miner cumulative damage rule. Supports multi-segment mission profiles, multi-frequency ripple current superposition, warranty assessment, and report export.

#### 功能特性 Features

- **多段运行剖面** Multi-segment mission profile — 自定义一天中各时段的温度、电压、纹波电流
- **多频率纹波叠加** Multi-frequency ripple superposition — 每个时段可添加多组不同频率的纹波电流分量
- **频率修正** Frequency correction — 根据纹波频率自动查表修正等效电流
- **质保期判定** Warranty assessment — 设置目标质保期，自动评估裕量是否满足要求
- **LaTeX 公式** LaTeX formulas — 公式使用 KaTeX 渲染

#### 寿命模型 Life Model

```
L_i = L_0 × 2^((T_max - T_hs_i)/10) × K_V
ΔT = ΔT_0 × Σ_j(I_j / (I_rated × K_freq_j))^2 / 散热系数
D = Σ_i(t_i × 工作天数 / L_i)
寿命 = 1 / D (年)
```

---

### 2. 安规距离计算
### Creepage & Clearance Calculator

基于 IEC 60664-1 / UL 840 标准的爬电距离和电气间隙计算工具，适用于并网逆变器设计。支持多测量节点、绝缘类型、PCB/三防漆配置，自动生成带公式推导的设计报告。

A creepage and clearance distance calculation tool based on IEC 60664-1 / UL 840 standards for grid-tied inverter design. Supports multiple measurement nodes, insulation type, PCB/conformal coating configuration, and automatic report generation with formula derivation.

#### 功能特性 Features

- **双标准支持** Dual standard support — IEC 60664-1 / IEC 62109-1 或 UL 840 / UL 1741
- **多测量节点** Multiple measurement nodes — 可定义 L-N、L-PE、DC+-PE 等多个被测节点
- **绝缘类型** Insulation type — 功能/基本/附加/加强绝缘，各节点独立设置
- **污染等级 & 材料组别** Pollution degree & Material group — PD 1-3, CTI 分组 I-IIIb
- **过电压类别 (OVC)** Overvoltage category — 根据 OVC I-IV + 系统额定电压自动查表确定额定冲击电压 Uimp (IEC 60664-1 Table B.1)
- **海拔修正** Altitude correction — 海拔系数自动应用至电气间隙
- **PCB/三防漆** PCB & coating — 每个节点独立设置走线方式和三防漆使用情况
- **设计报告** Design report — 含各节点计算公式推导详情，支持 Word 导出

#### 计算依据 Standards Reference

- **电气间隙 Clearance**: IEC 60664-1 Table 1（按峰值电压 + 污染等级查表，乘海拔系数 + 绝缘倍率）
- **爬电距离 Creepage**: IEC 60664-1 Table 18（按 RMS 电压 + 污染等级 + 材料组别查表，乘 PCB/三防漆修正 + 绝缘倍率）
- **额定冲击电压 Uimp**: IEC 60664-1 Table B.1（按 OVC 类别 + 系统额定电压查表）

#### 参数说明 Parameter Guide

| 参数 Parameter | 说明 Description |
|---|---|
| OVC I-IV | 过电压类别，决定额定冲击电压 |
| 污染等级 PD 1-3 | 环境清洁程度，影响爬电和间隙 |
| 材料组别 CTI I-IIIb | 材料耐漏电起痕指数 |
| 海拔 Altitude | >=2000m 时电气间隙需乘系数放大 |
| 绝缘类型 | 功能/基本(1x)/附加(1x)/加强(2x) |

---

## 使用方式 Usage

直接打开 `index.html` 在浏览器中打开即可（无需服务器）。顶部导航栏切换计算模块。

Open `index.html` directly in a browser (no server required). Switch between calculation modules using the top navigation bar.

## 构建 Build

```bash
cd auto-hardware-design
python build.py
```

这会按顺序运行 `gen-scripts/` 下的所有生成脚本，在 `index.html` 输出最终文件。

This runs all generation scripts in `gen-scripts/` in order, outputting the final file as `index.html`.

### 生成步骤 Build Steps

| # | 脚本 Script | 作用 Purpose |
|---|---|---|
| 1 | 01_base.py | 生成基础 HTML 结构 |
| 2 | 02_fix.py | 修正选择器等问题 |
| 3 | 03_frequency.py | 添加频率文本框 + Hz/kHz 选择 |
| 4 | 04_katex_inputs.py | 添加 KaTeX CDN + 项目输入框 |
| 5 | 05_latex_formulas.py | 添加 calcFormulas + renderLatex |
| 6 | 06_fix_cf_position.py | 修正 calcFormulas 插入位置 |
| 7 | 07_fix_double_cf.py | 修复重复调用 |
| 8 | 08_export_word.py | 添加 Word 导出功能 |
| 9 | 09_fix_escaping.py | 修正 LaTeX 反斜杠转义 |
| 10 | 10_readable_fallback.py | 添加可读 Unicode 降级方案 |

## 文件结构 File Structure

```
auto-hardware-design/
├── index.html                     # 最终输出文件（所有模块）
├── build.py                       # 构建脚本
├── gen-scripts/                   # 生成脚本（电容器模块）
│   ├── 01_base.py
│   ├── ...
│   └── 10_readable_fallback.py
├── v2/                            # 备份版本
│   └── index.html
└── README.md
```

## 路线图 Roadmap

计划中的后续模块 Planned modules:

- 变压器/电感设计计算 Transformer & Inductor Design
- 散热器热阻计算 Heatsink Thermal Resistance
- PCB 载流能力计算 PCB Trace Current Capacity
- EMC 滤波器设计 EMC Filter Design
- 保险丝/断路器选型 Fuse & Breaker Selection

## 许可证 License

MIT
