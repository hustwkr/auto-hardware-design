# 安规距离计算逻辑 vs IEC 62109-1:2010 对比分析报告

生成日期：2026-06-15
分析对象：js/models/safety-model.js (428行) + js/safety.js
规范文件：IEC_62109-1_2010.pdf (154页)

================================================================================

## 一、实现正确的部分（与标准一致）

1. Table 12 冲击电压数据 — 完全正确，所有系统电压 x OVC 组合的值与规范一致
2. Table 13 电气间隙查找表 (CLR_TBL_IEC) — 列1的冲击电压数据准确
3. Table 14 爬电距离数据 (CRP_IEC) — 各污染等级/材料组的值正确
4. 加强绝缘 x2 逻辑 — effIns = 'reinf' 时对电气间隙和爬电距离均应用翻倍，符合 §7.3.7.5.1
5. 对地节点强制加强绝缘 — toGnd && ins !== 'reinf' -> forcedReinforced = true，正确实现 §7.3.7 的强制性要求
6. 线间 OVC 降档 (prevImpLevel) — 符合 §7.3.7.1.2f "同一电路内部的功能绝缘比对地再降一档"
7. TOV 仅用于对地节点 — isMains && sysVAC && toGnd 条件正确，因为 TOV 只适用于电路与大地之间 (§7.3.7.1.2f)
8. DC侧最小 2.5kV — 符合 §7.3.7.1.2b "PV circuits minimum impulse voltage of 2,500 V"
9. 隔离架构下的 OVC 降档 (autoDeriveDC) — AC OVC -1 level for DC side，符合 §7.3.7.1.2c

================================================================================

## 二、发现的问题与改进建议（按严重程度排序）

### [严重] Coating Type 2（灌封）将爬电距离设为零

代码位置：safety-model.js line 349
```javascript
if (coat === 2) reqCrp = 0; // Coating cancels creepage requirement
```

规范要求 (§7.3.7.8.4.2): Type 2 protection 被视为等效于固体绝缘。Table 13/14 不适用，但间距应满足 IEC 60664-3 Table 1 的最小值（通常 ~0.15mm），而不是零。

风险：报告输出爬电距离为 "0 mm"，这在安规审查中会被质疑。

建议修改：
```javascript
if (coat === 2) reqCrp = 0.15; // IEC 60664-3 Table 1 minimum spacing under Type 2 potting
```

--------------------------------------------------------------------------------

### [中等] 加强绝缘电气间隙 — TOV 查找使用了错误的 Table 13 列

代码位置：safety-model.js line 248
```javascript
var clrC = clrFromPeak(tovPeak * 1.6, pd); // criterion (c): 1.6x TOV
```

clrFromPeak 将电压查表到 CLR_TBL_IEC（列1 = 冲击电压）。但标准 §7.3.7.4.1 明确要求：
- (a) 冲击电压升一档 -> Table 13 列1 (Impulse voltage)
- (b) 1.6x工作峰值 -> Table 13 列4 (Working voltage for surroundings)
- (c) 1.6xTOV峰值 -> Table 13 列2 (Temporary overvoltage peak)

三列的映射关系不同。例如 TOV = 2120V x 1.6 = 3392V：
- 代码查列1: 3392V -> 落在 2500~4000 之间 -> ~2.2mm
- 正确查列2: 3392V -> 落在 2600~3700 之间 -> ~3.8mm

实际影响：由于代码取 (a)(b)(c) 的最大值，而 (a) "冲击电压升一档"通常更大（如 4000V->3.0mm），所以 TOV 列错误在实践中很少成为绑定条件。但为了规范一致性，应修正查找逻辑。

建议：为列2和列4分别建立独立的查找函数，或扩展 CLR_TBL_IEC 包含所有列：
```javascript
// Extended table: [impulse_V, tov_peak_V, wrk_peak_surr_V, PD1, PD2, PD3]
var CLR_TBL_FULL = [
    [330,   340,  212, 0.01, 0.20, 0.80],
    [500,   530,  330, 0.04, 0.20, 0.80],
    [800,   700,  440, 0.10, 0.20, 0.80],
    [1500,  960,  600, 0.50, 0.50, 0.80],
    [2500, 1600, 1000, 1.5,  1.5,  1.5],
    [4000, 2600, 1600, 3.0,  3.0,  3.0],
    [6000, 3700, 2300, 5.5,  5.5,  5.5],
    [8000, 4800, 3000, 8.0,  8.0,  8.0],
    [12000,7400, 4600, 14.0, 14.0, 14.0]
];
```

--------------------------------------------------------------------------------

### [中等] 海拔修正系数不支持插值

代码位置：safety-model.js line 103
```javascript
var ALT_K = {2000:1.0, 3000:1.14, 4000:1.29, 5000:1.48};
```

规范 (Annex F Table F.1): 支持到 20,000m，共 11 个数据点。当前只覆盖了 4 个点，中间海拔（如 3500m）会回退到默认值 1.0，导致电气间隙计算偏小。

完整 Annex F Table F.1 数据：
| 海拔 (m) | 气压 (kPa) | 修正系数 |
|----------|-----------|---------|
| 2,000    | 80.0      | 1.00    |
| 3,000    | 70.0      | 1.14    |
| 4,000    | 62.0      | 1.29    |
| 5,000    | 54.0      | 1.48    |
| 6,000    | 47.0      | 1.70    |
| 7,000    | 41.0      | 1.95    |
| 8,000    | 35.5      | 2.25    |
| 9,000    | 30.5      | 2.62    |
| 10,000   | 26.5      | 3.02    |
| 15,000   | 12.0      | 6.67    |
| 20,000   | 5.5       | 14.50   |

建议：使用线性插值函数 + 完整数据表，参考代码见下方。

--------------------------------------------------------------------------------

### [中等] DC侧冲击电压计算未使用 Table 12

代码位置：safety-model.js line 386-390
```javascript
impDC = 2.5; // §7.3.7.1.2b minimum
if (sysVDC > 600)  impDC = 4.0;
if (sysVDC > 1000) impDC = 5.0;
```

规范 (§7.3.7.1.2b + §7.3.7.2.3): PV电路的冲击电压应通过 Table 12 查系统电压获得，且最小值为 2500V。Table 12 也接受 DC 电压（如 "600 V rms or 849 V dc"）。

当前硬编码的方式在 sysVDC=800V 时返回 4.0kV，但按 Table 12 OVC II 查 849Vdc (~600Vrms row) 应该是 4.0kV —— 在这个范围内碰巧一致。但对于非标准电压值（如 sysVDC=500），代码返回 2.5kV，而 Table 12 可能给出不同的值。

建议：统一使用 lookupImpulse(sysVDC, 2) + Math.max(result, 2.5) 的方式计算 DC 侧冲击电压。

--------------------------------------------------------------------------------

### [低] 缺少高频绝缘分析 (>30kHz)

规范 (§7.3.7.9): 当绝缘两端的电压基频 >30kHz，需参考 IEC 60664-4，取 §7.3.7.1~8 和 Annex G 中更严苛的要求。Annex G 提供了专门的电气间隙/爬电距离确定流程图。

影响：对于逆变器中的开关节点（如 MOSFET drain-source、高频变压器绕组），当前系统无法评估高频下的安规距离要求。

建议：增加一个 "高频模式" 选项，基于 Annex G Table G.1/G.2 计算高频峰值电压对应的间隙/爬电距离。

--------------------------------------------------------------------------------

### [低] 缺少以下规范特性（非阻塞性）

| 缺失特性 | 规范依据 | 影响 |
|---------|---------|------|
| 无机材料（玻璃/陶瓷）爬电 = 电气间隙 | §7.3.7.5.3 "For inorganic insulating materials... creepage distance may equal the associated clearance" | 对使用陶瓷绝缘子的设计偏保守 |
| 沟槽脊 (rib) 降低材料组别 | §7.3.7.5.3 "If ribbed, Group II -> use Group I values" | PCB加胶/开槽设计的优化空间未利用 |
| PWB功能绝缘豁免 (§7.3.7.7) | V-0 + CTI>=175 + 短路测试通过时，PCB上的功能绝缘可低于 §7.3.7.4/5 | 对低压 (<80Vrms) PCB走线偏保守 |
| 均匀电场减小 (§7.3.7.4.2) | 均匀电场下间隙可减少到 IEC 60664-1 Table F.2 Case B | 高压大间距场景的优化空间 |

================================================================================

## 三、总结

当前系统的核心计算框架是正确的，Table 12/13/14 的数据准确，OVC 降档逻辑和对地强制加强绝缘等关键安全机制都已到位。

主要问题集中在：
1. Coating Type 2 -> reqCrp = 0（应改为 IEC 60664-3 Table 1 最小值）
2. 加强绝缘 TOV 查找列错误（实践中因取最大值而通常不绑定，但规范一致性有问题）
3. 海拔修正缺插值和完整数据（高海拔场景可能低估间隙要求）
4. DC侧冲击电压应统一走 Table 12 查表

================================================================================

## 附录：关键规范条款速查

### §7.3.7.1 绝缘选择考虑因素
- 污染等级 (pollution degree)
- 过电压类别 (overvoltage category)
- 供电接地系统 (supply earthing system)
- 绝缘电压 (insulation voltage)
- 绝缘位置 (location of insulation)
- 绝缘类型 (type of insulation)

### §7.3.7.1.2 过电压类别与冲击耐受电压
a) AC电网电路：OVC I-IV（取决于连接点）
b) PV电路：默认 OVC II，最小冲击电压 2500V
c) 有隔离时：两侧分别计算，跨隔离降一档后取较大值
d) 无隔离时：取两侧中较高者用于整个组合电路
e) 其他电路：取决于与 AC/PV 的关系
f) 电路内部功能绝缘：比对地低一档

### §7.3.7.2 系统电压的确定 (Table 12 Column 1)
- TN/TT 系统：相-地有效值
- IT 三相（冲击）：相-人工中性点 = 线电压 / 1.732
- IT 三相（TOV）：相间有效值
- IT 单相：相间有效值

### §7.3.7.4.1 加强绝缘电气间隙的三种标准（取最严苛者）
(a) Table 13，冲击电压升一档
(b) 1.6 x 工作峰值 -> Table 13 列4
(c) 1.6 x TOV峰值 -> Table 13 列2

### §7.3.7.5 爬电距离
- Table 14 基于 RMS 工作电压
- 加强绝缘 = 基本值 x 2
- 当爬电 < 电气间隙时，爬电提升到等于电气间隙

### Annex F 海拔修正 (完整表)
| m   | kPa  | Factor |
|-----|------|--------|
| 2000 | 80.0 | 1.00   |
| 3000 | 70.0 | 1.14   |
| 4000 | 62.0 | 1.29   |
| 5000 | 54.0 | 1.48   |
| 6000 | 47.0 | 1.70   |
| 7000 | 41.0 | 1.95   |
| 8000 | 35.5 | 2.25   |
| 9000 | 30.5 | 2.62   |
| 10000| 26.5 | 3.02   |
| 15000| 12.0 | 6.67   |
| 20000| 5.5  | 14.50  |

### Annex G >30kHz 高频绝缘 (Table G.1/G.2)
- 电气间隙：基于 IEC 60664-4 Table 1，按峰值电压查表
- 爬电距离：基于 IEC 60664-4 Table 2，按频率范围和峰值电压查表
- PD2 乘数 1.2，PD3 乘数 1.4

================================================================================

## 三、实施记录 (2026-06-15)

以下修改已全部落地至 `js/models/safety-model.js` 和 `js/safety.js`：

### [严重] Coating Type 2 — ✅ 已修复
**文件**: safety-model.js line ~389-395
**变更**: `reqCrp = 0` → `reqCrp = 0.15` (IEC 60664-3 Table 1 min)
**额外处理**: coat=2 时跳过 crpMult（×2 for reinforced），避免双重计算
**验证**: Node.js 测试确认 coat=2 返回 0.2mm（经 round），即使 toGnd=true 也不会翻倍

### [中等] TOV lookup columns — ✅ 已修复
**文件**: safety-model.js line ~7-24 (CLR_TBL_IEC), line ~178-198 (lookupClr), line ~254-259 (clrFromPeak)
**变更**: CLR_TBL_IEC 扩展为 `[impulse_V, tov_peak_V, wrk_peak_surr_V, PD1, PD2, PD3]` 完整三列
**变更**: `lookupClr()` 新增 `col` 参数，支持按不同电压列查表
**变更**: `clrFromPeak()` 透传 col 参数；calcClearance() 中 criterion (b) 用 col=2，(c) 用 col=1

### [中等] Altitude correction — ✅ 已修复
**文件**: safety-model.js line ~113-137, line ~381, line ~438
**变更**: `ALT_K` object → `ALT_DATA` 完整表 (2000m-20000m) + `altFactor()` 线性插值函数
**变更**: 所有 `ALT_K[alt] || 1.0` 引用替换为 `altFactor(alt)`
**兼容**: ALT_K object 从 ALT_DATA 自动生成，保持向后兼容
**验证**: altFactor(3500)=1.21（线性插值），altFactor(6000)=1.70，ALT_K[3000]=1.14

### [中等] DC impulse voltage — ✅ 已修复
**文件**: safety-model.js line ~425-434
**变更**: 硬编码 `if (sysVDC > 600) impDC = 4.0` → `Math.max(lookupImpulse(sysVDC, 2, true), 2.5)`
**效果**: DC侧冲击电压现在基于 Table 12 查表+插值，同时保留 §7.3.7.1.2b 的 2.5kV 下限

### UI 层同步 (safety.js)
- line ~186: `SM.ALT_K[alt] || 1.0` → `SM.altFactor(alt)`（海拔修正系数显示）

### 防御性加固与测试更新 (2026-06-15 continued)
- **calcSafety null guard**: 增加 `if (!params) return null;`，防止无参数调用崩溃
- **safety.js try-catch**: calcSafety 调用包裹在 try/catch 中，异常时显示红色错误提示而非静默失败
- **空结果处理**: result=null 时清空表格并提示"请检查节点配置"
- **测试更新**: `lookupClr IEC interpolation` 预期值 0.2→0.8（PD列索引修正后的正确值）；`coating=2` 断言从 strictEqual(0) 改为 approx(0.2)（IEC 60664-3 Table 1 min spacing = 0.15mm → round to 0.2）
- **缓存失效**: index.html 脚本版本号 v=6 → v=8，强制浏览器重新加载最新代码

### 前端对接修复 — mNode() class="seg" 缺失 (2026-06-15)
**根因**: `mNode()` 生成的 `<tr>` 缺少 `class="seg"`，导致 `sCalc()` 中 `querySelectorAll("#sN .seg")` 永远返回空 NodeList，节点列表无法被遍历，计算结果和报告始终为空。
**修复**: `js/safety.js` line 21: `<tr data-id=` → `<tr class="seg" data-id=`
**影响**: sCalc()、sReNum() 两个函数都依赖 `.seg` 选择器定位节点行。此 bug 是用户报告"计算结果和设计报告空白"的最终根因。
**验证**: 42/42 测试通过，Node.js 模拟 calcSafety 输出正确结果。
**缓存失效**: index.html 脚本版本号 v=8 → v=10

### CSS 类名冲突 — .seg 被电容模块占用 (2026-06-15)
**根因**: `.seg` 在 `css/main.css` 中定义为 `display: flex; flex-direction: column;`（用于电容模块的 `<div>` 时间段容器）。当安全模块的节点行使用 `class="seg"` 时，flexbox 覆盖了 `<tr>` 默认的 table-row 布局行为，导致所有 `<td>` 单元格挤入第一列。
**修复**: 将安全节点行的类名从 `.seg` 改为 `.snode`，同步更新 sCalc()、sReNum() 中的选择器为 `#sN .snode`。
**缓存失效**: index.html 脚本版本号 v=9 → v=10

### 低优先级建议（未实施 — 非阻塞性优化）
以下项目为安全分析文档中标记为 [低] 的增强项，属于规范合规性的锦上添花而非 bug 修复：
- 高频绝缘分析 (>30kHz, Annex G)
- 无机材料爬电 = 电气间隙 (§7.3.7.5.3)
- 沟槽脊降低材料组别 (§7.3.7.5.3 ribbed)
- PWB功能绝缘豁免 (§7.3.7.7 V-0 + CTI>=175)
- 均匀电场减小 (§7.3.7.4.2 Case B)

================================================================================

## 四、UL 840 / UL 1741 安规距离计算修正 (2026-06-16)

### [严重] UL 电气间隙使用了冲击电压而非系统电压

**代码位置**: safety-model.js line ~390-394（修复前）
```javascript
// 旧代码 — 错误：使用冲击电压查UL表
var im = INS_K[effIns] || 1.0;
reqClr = lookupClr(impKV * 1000, pd, standard, false) * im;
```

**规范要求**:
- **UL 1741 §25.4g**: "The Phase-to-Ground Rated System Voltage shall be used to determine clearances" — 电气间隙由相地系统电压决定，而非冲击耐受电压。
- **UL 840 §6.3**: Clearance table is indexed by system voltage (kVRMS), NOT impulse withstand voltage.
- **UL 1741 §25.4b**: Inverters use Overvoltage Category IV — 逆变器使用OVC IV。
- **UL 1741 §25.4a**: Default Pollution Degree 3 (§25.4c: coated PCB = PD2).

**Bug 影响**:
对于典型 300V AC 系统 @ OVC IV：
| 方法 | 查表值 | 结果 |
|------|--------|------|
| ~~旧代码~~ impKV=6kV → row [6.0] PD3 | ~50mm | **严重过大（~20x）** |
| ✅ 新代码 sysKVRMS=0.3 → row [0.33] PD3 | 0.8mm (reinf) | 正确 |

**修复**:
1. `calcNode()` 新增 `sysVDC` 参数，从 `calcSafety()` 透传系统电压。
2. UL模式下使用 `sysVAC/1000` (AC电路) 或 `sysVDC/1000` (DC电路) 作为 kVRMS 查表值。
3. 加强绝缘：在UL表中向上查找一行（table step-up），与 basic*2 取较大值，符合 UL 840 §6.3 的两种等效方法。

**测试**: 新增5个UL专用测试用例 (47/47 pass)：
- `calcNode - UL uses system voltage not impulse for clearance` — 验证300V AC系统电气间隙 ~0.8mm
- `calcNode - UL DC circuit uses sysVDC for clearance` — 验证800V DC系统电气间隙 ~7.0mm
- `calcNode - UL reinforced insulation exceeds basic` — 加强绝缘 > 基本绝缘 (≥2x)
- `lookupClr - UL interpolation works` — UL表线性插值正确性
- `calcSafety - UL full calculation with sysVDC` — 完整UL计算流程

### UL 840 规范要点总结（从 standards/ 目录提取）

**电气间隙 (Clearance)**:
- 查表依据：系统电压 kVRMS + 污染等级 (PD1/PD2/PD3)
- CLR_TBL_UL = [[kVRMS, PD1, PD2, PD3], ...] — 从 0.33kV 到 12kV，共17行
- 加强绝缘：翻倍基本绝缘距离 **或** 向上查找一行（取较大值）

**爬电距离 (Creepage)**:
- 查表依据：工作电压 Vrms + PD + 材料组别 (CTI)
- CRP_UL = [[Vrms, PD1-B, PD1-F, PD2-B, PD2-F, PCB, PD3-B, PD3-F, ...], ...] — 从0V到6300V，共27行
- 加强绝缘：爬电距离翻倍 (UL 840 §6.3.1)
- UL 1741 §25.4d: All PWBs minimum CTI = 100 → Material Group II

================================================================================
