# ⚡ 电解电容寿命计算工具
# Electrolytic Capacitor Lifetime Calculator

基于 Arrhenius 加速模型 + Miner 累积损伤法则的电解电容寿命评估工具，支持多段运行剖面、多频率纹波电流叠加、质保期判定及报告导出。

An electrolytic capacitor lifetime evaluation tool based on the Arrhenius acceleration model and Miner cumulative damage rule. Supports multi-segment mission profiles, multi-frequency ripple current superposition, warranty period assessment, and report export.

## 功能特性 Features

- **多段运行剖面** Multi-segment mission profile — 自定义一天中各时段的温度、电压、纹波电流
- **多频率纹波叠加** Multi-frequency ripple superposition — 每个时段可添加多组不同频率的纹波电流分量
- **频率修正** Frequency correction — 根据纹波频率自动查表修正等效电流
- **质保期判定** Warranty assessment — 设置目标质保期，自动评估裕量是否满足要求
- **LaTeX 公式** LaTeX formulas — 公式使用 KaTeX 渲染（有网络时），无网络时降级为可读 Unicode 文本
- **导出 Word** Export to Word — 一键导出含详细计算过程的 `.doc` 报告
- **项目信息** Project info — 可选输入项目名称和电容型号

## 使用方法 Usage

直接打开 `index.html` 即可使用（无需服务器）。

Open `index.html` directly in a browser (no server required).

### 参数说明 Parameter Guide

| 参数 Parameter | 说明 Description |
|---|---|
| L₀ | 额定寿命 (h)，通常 1000-10000 |
| T_max | 最高额定温度 (°C)，常见 85/105/125 |
| V_rated | 额定电压 (V) |
| I_rated | 额定纹波电流 (mA)，@ 120Hz |
| ΔT₀ | 最大芯温升 (°C)，标准 10 / 长寿命 5 |
| T_a | 环境温度 (°C) |
| V_op | 运行电压 (V) |
| I_op | 运行纹波电流 (mA) |

### 寿命模型 Life Model

每段寿命: L_i = L₀ × 2^{(T_max - T_hs_i)/10} × K_V

芯温升: ΔT = ΔT₀ × Σⱼ(Iⱼ / (I_rated × K_freqⱼ))² / 散热系数

累积损伤: D = Σᵢ(tᵢ × 工作天数 / Lᵢ)

预计寿命: 1 / D (年)

## 构建 Build

```bash
cd capacitor-lifetime-calculator
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
capacitor-lifetime-calculator/
├── index.html                     # 最终输出文件
├── build.py                       # 构建脚本
├── gen-scripts/                   # 生成脚本
│   ├── 01_base.py
│   ├── ...
│   └── 10_readable_fallback.py
├── v2/                            # 备份版本
│   └── index.html
└── README.md
```

## 许可证 License

MIT
