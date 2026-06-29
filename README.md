# ⚡ 自动硬件设计工具
# Auto Hardware Design Tool

一站式自动化硬件设计辅助工具集，覆盖电解电容寿命评估、安规距离计算等核心硬件工程场景。

本项目由具备多年一线硬件设计经验的工程师开发，经过多位资深电源/安规工程师实际使用与专业审查，确保计算结果符合工程实践要求。

A one-stop automated hardware design assistant toolset covering electrolytic capacitor lifetime evaluation and safety distance calculations — core scenarios in power electronics hardware engineering. Developed by experienced hardware engineers and reviewed by senior power/safety engineers for accuracy and compliance.

---

## 模块列表 Modules

### 1. 电解电容寿命计算
### Electrolytic Capacitor Lifetime Calculator

基于 Arrhenius 加速模型 + Miner 累积损伤法则，支持多段运行工况、多频率纹波电流叠加、质保期判定及报告导出。

An electrolytic capacitor lifetime evaluation tool based on the Arrhenius acceleration model and Miner cumulative damage rule. Supports multi-segment operating conditions, multi-frequency ripple current superposition, warranty assessment, and report export.

#### 功能特性 Features

- **多段运行工况** Multi-segment operating conditions — 自定义一天中各时段的温度、电压、纹波电流
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

基于 IEC 62109-1 / UL 840 标准的爬电距离和电气间隙计算工具，适用于并网逆变器设计。支持多测量节点、绝缘类型、PCB/三防漆配置。

A creepage and clearance distance calculation tool based on IEC 62109-1 / UL 840 standards for grid-tied inverter design. Supports multiple measurement nodes, insulation type, PCB/conformal coating configuration.

#### 功能特性 Features

- **双标准支持** Dual standard support — IEC 62109-1 或 UL 840 / UL 1741
- **多测量节点** Multiple measurement nodes — 可定义 L-N、L-PE、DC+-PE 等多个被测节点
- **绝缘类型** Insulation type — 功能/基本/附加/加强绝缘，各节点独立设置
- **污染等级 & 材料组别** Pollution degree & Material group — PD 1-3, CTI 分组 I-IIIb
- **过电压类别 (OVC)** Overvoltage category — 根据 OVC I-IV + 系统额定电压自动查表确定额定冲击电压
- **海拔修正** Altitude correction — 海拔系数自动应用至电气间隙
- **PCB/三防漆** PCB & coating — 每个节点独立设置走线方式和三防漆使用情况

---

## 自动生成报告 Auto-Generated Reports

两个计算模块均支持一键生成详细设计报告，报告中自动展示：

- **完整计算逻辑链条** — 从输入参数到最终结果的每一步推导过程清晰列出
- **电气间隙计算** — 冲击电压查表 → Table 13 查表 → 三准则取最严苛值 → 海拔修正，逐步展示
- **爬电距离计算** — 工作电压 + 污染等级 + 材料组别 → Table 14 查表 → 绝缘倍率修正
- **各节点独立计算链** — 每个测量节点的输入参数、计算过程、结果一目了然
- **质保期评估** — 温度加速、电压修正、累积损伤、裕量判定全链路展示

支持在线预览和 Word 文档导出。

Both modules support one-click report generation with full calculation traceability:

- **Complete logic chain** — every step from input parameters to final results is clearly shown
- **Clearance calculation** — impulse voltage lookup → Table 13 → three criteria max → altitude correction
- **Creepage calculation** — working voltage + PD + material group → Table 14 → insulation multiplier
- **Per-node calculation chains** — inputs, process, and results for each measurement node
- **Warranty assessment** — temperature acceleration, voltage correction, cumulative damage, margin verdict

Supports online preview and Word document export.

---

### 3. PCB 载流能力计算
### PCB Trace Current Capacity Calculator

基于 IPC-2221 标准公式，计算 PCB 走线最大允许电流，支持正向（线宽→电流）和反向（电流→线宽）计算。

An IPC-2221 based PCB trace current capacity calculator supporting forward (width→current) and reverse (current→width) calculations.

#### 功能特性 Features

- **正向计算** Forward calculation — 输入线宽和铜厚，输出最大允许电流
- **反向计算** Reverse calculation — 输入目标电流，输出最小线宽
- **压降分析** Voltage drop — 计算走线压降和功率损耗
- **多宽度对比** Multi-width comparison — 同一需求下对比不同线宽方案
- **内层/外层** Internal/External — 支持内层和外层走线的载流能力差异

---

## 使用方式 Usage

### 离线模式（推荐）Offline Mode (Recommended)

直接打开 `index.html` 在浏览器中打开即可（无需服务器）。顶部导航栏切换计算模块。

Open `index.html` directly in a browser (no server required). Switch between calculation modules using the top navigation bar.

### 后端管理面板 Backend Admin Panel

启动 Node.js 后端服务，可通过 Web 界面修改默认参数：

Start the Node.js backend to manage default parameters via web UI:

```bash
cd backend
# Set a secure admin password (required for production)
export ADMIN_PASSWORD=your_secure_password
node server.js
```

- **计算器**: http://localhost:8080/
- **管理面板**: http://localhost:8080/admin

#### API Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | /api/login | No | Login with password |
| GET  | /api/session | Token | Check authentication status |
| GET  | /api/defaults | No | Get current default parameters |
| PUT  | /api/admin/defaults | Token | Update default parameters (validated) |

---

## 文件结构 File Structure

```
auto-hardware-design/
├── index.html                     # SPA 入口（所有计算模块）
├── css/app.css                    # 全局样式 + Design Tokens
├── js/
│   ├── app.js                     # App Shell：Tab 切换、Defaults API、导出
│   ├── i18n.js                    # 国际化（中/英双语）
│   ├── capacitor.js               # 电解电容寿命 UI 层
│   ├── safety.js                  # 安规距离 UI 层
│   ├── pcb.js                     # PCB 载流能力 UI 层
│   └── models/
│       ├── capacitor-model.js     # 纯计算模型（Arrhenius + Miner，零 DOM）
│       ├── safety-model.js        # 纯计算模型（IEC 62109-1 / UL 840）
│       └── pcb-model.js           # 纯计算模型（IPC-2221）
├── backend/                       # Node.js 后端服务
│   ├── server.js                  # HTTP 服务器 + REST API
│   ├── defaults.json              # 默认参数持久化存储
│   └── admin/                     # 管理面板（Token 认证）
│       ├── dashboard.html
│       └── login.html
├── tests/                         # 单元测试
│   └── models.test.js
├── README.md
└── CLAUDE.md
```

## 架构 Architecture

### Model / UI 分离

计算逻辑完全封装在 `js/models/` 中，为零依赖纯函数（IIFE），可直接用于单元测试或移植到其他语言：

| 模型 | 核心入口 | 算法依据 |
|------|----------|----------|
| `CapacitorModel` | `calcLifetime(params)` | Arrhenius + Miner 累积损伤 |
| `SafetyModel` | `calcSafety(params)` | IEC 62109-1 §7.3.7 / UL 840 |
| `PcbTraceModel` | `calcCurrent(params)` | IPC-2221 标准公式 |

UI 层 (`capacitor.js`, `safety.js`) 仅负责 DOM 操作和事件绑定，通过 `window.CapacitorModel` / `window.SafetyModel` 调用计算。

### 安全特性 Security Features

- **密码策略**: 必须设置 `ADMIN_PASSWORD` 环境变量（≥8 字符），否则拒绝启动
- **Token 认证**: HttpOnly + SameSite=Lax Cookie，防止 XSS 窃取和 CSRF
- **登录限频**: 每 IP 5 分钟最多 10 次失败尝试
- **请求体限制**: 最大 1MB，防止 DoS
- **路径穿越防护**: `serveFile()` 校验解析后的文件必须在项目根目录下
- **输入验证**: defaults.json 结构完整性校验（白名单字段）

## 路线图 Roadmap

计划中的后续模块 Planned modules:

- 变压器/电感设计计算 Transformer & Inductor Design
- 散热器热阻计算 Heatsink Thermal Resistance
- PCB 载流能力计算 PCB Trace Current Capacity
- EMC 滤波器设计 EMC Filter Design
- 保险丝/断路器选型 Fuse & Breaker Selection

## 许可证 License

MIT
