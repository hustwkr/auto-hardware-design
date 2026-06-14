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
- **API 文档**: `/api/defaults` (GET), `/api/admin/defaults` (PUT, requires auth)

#### API Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | /api/login | No | Login with password |
| GET  | /api/session | Token | Check authentication status |
| GET  | /api/defaults | No | Get current default parameters |
| PUT  | /api/admin/defaults | Token | Update default parameters (validated) |

#### Security Features

- Path traversal protection on all file routes
- Login rate limiting (10 attempts per 5 minutes per IP)
- Request body size limit (1MB) to prevent DoS
- Input validation on defaults structure
- Default password warning on startup


## 文件结构 File Structure

```
auto-hardware-design/
├── index.html                     # SPA 入口（所有计算模块）
├── css/app.css                    # 全局样式 + Design Tokens
├── js/
│   ├── app.js                     # App Shell：Tab 切换、Defaults API、导出
│   ├── capacitor.js               # 电解电容寿命 UI 层
│   ├── safety.js                  # 安规距离 UI 层
│   └── models/
│       ├── capacitor-model.js     # 纯计算模型（Arrhenius + Miner，零 DOM）
│       └── safety-model.js        # 纯计算模型（IEC 62109-1 / UL 840）
├── backend/                       # Node.js 后端服务
│   ├── server.js                  # HTTP 服务器 + REST API
│   ├── defaults.json              # 默认参数持久化存储
│   └── admin/                     # 管理面板（Token 认证）
│       ├── dashboard.html
│       └── login.html
├── build.py                       # Python 构建脚本
├── IEC_62109-1_2010.pdf          # 安规标准参考文档
└── README.md
```

## 架构 Architecture

### Model / UI 分离

计算逻辑完全封装在 `js/models/` 中，为零依赖纯函数（IIFE），可直接用于单元测试或移植到其他语言：

| 模型 | 核心入口 | 算法依据 |
|------|----------|----------|
| `CapacitorModel` | `calcLifetime(params)` | Arrhenius + Miner 累积损伤 |
| `SafetyModel` | `calcSafety(params)` | IEC 62109-1 §7.3.7 / UL 840 |

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
