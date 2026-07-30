# ⚡ 自动硬件设计工具
# Auto Hardware Design Tool

一站式自动化硬件设计辅助工具集，覆盖电解电容寿命评估、安规距离计算、信号滤波器设计等核心硬件工程场景。纯前端离线可用，零框架零依赖。

本项目由具备多年一线硬件设计经验的工程师开发，经过多位资深电源/安规工程师实际使用与专业审查，确保计算结果符合工程实践要求。

A one-stop automated hardware design assistant toolset covering electrolytic capacitor lifetime evaluation, safety distance calculations, and signal filter design — core scenarios in power electronics hardware engineering. Pure frontend, offline-capable, zero framework, zero dependencies. Developed by experienced hardware engineers and reviewed by senior power/safety engineers.

所有模块均支持一键生成详细设计报告（在线预览 + Word 导出），完整展示从输入参数到最终结果的每一步计算逻辑。

All modules support one-click design report generation (online preview + Word export), with full calculation traceability from input parameters to final results.

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

### 4. 信号滤波器设计
### Signal Filter Designer

基于运放的有源低通滤波器设计工具，支持一阶差分和二阶 MFB (Multiple Feedback) 拓扑。自动匹配 E24/E48 标准电阻值，渲染伯德图和电路原理图。

An op-amp based active low-pass filter design tool supporting 1st-order differential and 2nd-order MFB topologies. Auto-matches E24/E48 standard resistor values, renders Bode plots and circuit schematics.

#### 功能特性 Features

- **双拓扑** Dual topology — 一阶差分 LPF / 二阶 MFB LPF，输入端切换显示对应参数
- **E24/E48 标准值** Standard value matching — 自动选取最接近的标准电阻值，计算截止频率/增益/Q 值实际误差
- **伯德图** Bode plot — Canvas 渲染幅频 + 相频特性曲线，含 -3dB 参考线
- **电路原理图** Schematic — SVG 内联渲染，标注元件编号与参数值
- **频率响应点** Pole analysis — 计算并展示极点频率

#### 设计公式 Design Formulas

```
一阶差分:  H(s) = -(R₂/R₁) / (1 + s·R₂·C₁)
           f_c = 1/(2π·R₂·C₁),  G = R₂/R₁

二阶 MFB:  H(s) = -(R₂/(R₁+R₃)) / [1 + s·(R₂C₂ + C₁R₁R₃/(R₁+R₃)) + s²·C₁C₂R₁R₂R₃/(R₁+R₃)]
           R₃ = R₁,  G = R₂/(2R₁),  f_c = 1/(2π·√(C₁C₂R₁R₂/2))
```

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
| POST | /api/login | No | 登录获取 Token（含速率限制，5分钟内最多10次） |
| GET  | /api/session | Token | 检查认证状态 |
| POST | /api/logout | No | 登出 |
| GET  | /api/defaults | No | 获取当前默认参数 |
| PUT  | /api/admin/defaults | Token | 更新默认参数（严格校验，拒绝未知键） |
| GET  | /api/admin/email-config | Token | 获取 SMTP 邮件配置 |
| PUT  | /api/admin/email-config | Token | 更新 SMTP 邮件配置 |
| POST | /api/feedback | No | 提交用户反馈（含邮件通知） |
| GET  | /api/feedback | Token | 查看反馈列表 |

---

## 文件结构 File Structure

```
auto-hardware-design/
├── index.html                     # SPA 入口（所有计算模块 + tab 导航）
├── css/app.css                    # 全局样式系统 + Design Tokens + 暗色主题
├── js/
│   ├── app.js                     # App Shell：Tab 切换、Defaults API、主题/语言切换、自动保存
│   ├── i18n.js                    # 国际化（中/英双语）
│   ├── capacitor.js               # 电解电容寿命 UI 层（输入→计算→报告→Word导出）
│   ├── safety.js                  # 安规距离 UI 层（多节点管理→计算→报告→Word导出）
│   ├── pcb.js                     # PCB 载流能力 UI 层
│   ├── filter.js                  # 信号滤波器 UI 层（设计→伯德图→SVG原理图→报告）
│   ├── feedback.js                # 用户反馈表单
│   └── models/
│       ├── capacitor-model.js     # 纯计算模型（Arrhenius + Miner，零 DOM 依赖）
│       ├── safety-model.js        # 纯计算模型（IEC 62109-1 / UL 840 / UL 1741）
│       ├── pcb-model.js           # 纯计算模型（IPC-2221）
│       └── filter-model.js        # 纯计算模型（一阶差分/二阶MFB + E24/E48）
├── backend/                       # Node.js 后端服务（零 npm 依赖）
│   ├── server.js                  # HTTP 服务器 + REST API + scrypt认证 + HMAC Token
│   ├── defaults.json              # 默认参数持久化存储
│   ├── email.config.json          # SMTP 邮件配置模板（凭据通过环境变量注入）
│   └── admin/                     # 管理面板（Token 认证）
│       ├── dashboard.html
│       └── login.html
├── tests/                         # 单元测试（纯 Node.js，零测试框架依赖）
│   └── models.test.js
├── templates/                     # 新模块开发模板
│   └── new-module/
├── references/                    # 参考资料（电容数据手册、公式分析）
├── standards/                     # 参考标准文档（IEC 62109-1, UL 840, UL 1741）
├── README.md
└── CLAUDE.md
```

## 架构 Architecture

### Model / UI 分离

计算逻辑完全封装在 `js/models/` 中，为零依赖纯函数（IIFE），可直接用于单元测试或移植到其他语言：

| 模型 | 核心入口 | 算法依据 |
|------|----------|----------|
| `CapacitorModel` | `calcLifetime(params)` | Arrhenius + Miner 累积损伤 |
| `SafetyModel` | `calcSafety(params)` | IEC 62109-1 §7.3.7 / UL 840 / UL 1741 |
| `PcbTraceModel` | `calcCurrent(params)` | IPC-2221 标准公式 |
| `FilterModel` | `designFilter(type, params)` | 一阶差分 / 二阶 MFB 传递函数 + E24/E48 逼近 |

UI 层 (`capacitor.js`, `safety.js`, `filter.js`, `pcb.js`) 仅负责 DOM 操作和事件绑定，通过 `window.CapacitorModel` / `window.SafetyModel` / `window.FilterModel` 调用计算。

### 安全特性 Security

- **凭据保护**：SMTP 密码和管理员密码通过环境变量注入，不写入仓库文件
- **Token 认证**：HMAC-SHA256 签名 Token，密钥持久化防重启失效
- **登录限频**：IP 级别速率限制（5分钟窗口 ≤10次），过期条目定期清理防内存泄漏
- **路径防护**：静态文件白名单 + `path.resolve` 防目录穿越
- **密码策略**：最小 12 位 + 常见弱密码黑名单（不区分大小写拒绝）
- **邮件安全**：SMTP TLS 证书验证已启用，用户输入经 htmlEscape + CRLF 剥离防注入
- **CSP 头**：Content-Security-Policy 限制脚本/样式来源
- **输入校验**：默认参数保存前严格结构校验，拒绝未知键

## 路线图 Roadmap

已完成模块 Completed:
- [x] 电解电容寿命计算 Capacitor Lifetime
- [x] 安规距离计算 Creepage & Clearance (IEC + UL)
- [x] PCB 载流能力计算 PCB Trace Current Capacity
- [x] 信号滤波器设计 Signal Filter Designer

计划中的后续模块 Planned:
- [ ] 电源回路滤波器设计 Power Stage Filter Design (LC/CLC/π)
- [ ] 变压器/电感设计 Transformer & Inductor Design
- [ ] 散热器热阻计算 Heatsink Thermal Resistance
- [ ] 保险丝/断路器选型 Fuse & Breaker Selection
- [ ] 电压分压器 / 采样电路设计 Voltage Divider & Sensing

## 许可证 License

MIT
