/* ===== i18n Module — Language Switching (zh ↔ en) ===== */
(function(global) {
  "use strict";

  var currentLang = "zh";

  /* ── Translation dictionary ─── */
  var D = {
    /* Nav */
    "nav.capacitor":     { zh: "电解电容寿命计算", en: "Capacitor Lifetime" },
    "nav.safety":        { zh: "安规距离计算", en: "Safety Distance" },
    "nav.pcb":           { zh: "PCB走线载流计算", en: "PCB Trace Current" },
    "nav.admin":         { zh: "⚙ 后台", en: "⚙ Admin" },
    /* Theme */
    "theme.light":       { zh: "浅色", en: "Light" },
    "theme.dark":        { zh: "深色", en: "Dark" },
    "theme.system":      { zh: "系统", en: "System" },

    /* Capacitor page */
    "cap.title":         { zh: "电解电容寿命计算工具", en: "Electrolytic Capacitor Lifetime Calculator" },
    "cap.subtitle":      { zh: "Arrhenius + Miner 累积损伤 + 多段运行剖面 + 多频率纹波叠加 + 质保期判定", en: "Arrhenius + Miner cumulative damage + multi-segment profiles + multi-frequency ripple + warranty assessment" },

    /* Capacitor — basic info */
    "cap.basic":         { zh: "基本信息", en: "Basic Information" },
    "cap.projName":      { zh: "项目名称", en: "Project Name" },
    "cap.capModel":      { zh: "器件型号", en: "Component Model" },
    "cap.cooling":       { zh: "散热条件", en: "Cooling Condition" },
    "cap.opt.natural":   { zh: "自然对流", en: "Natural Convection" },
    "cap.opt.fan1":      { zh: "强制风冷 1-2m/s", en: "Forced Air 1-2m/s" },
    "cap.opt.fan2":      { zh: "强制风冷 >2m/s", en: "Forced Air >2m/s" },
    "cap.workdays":      { zh: "每年工作天数", en: "Workdays/Year" },
    "cap.workdays.unit": { zh: "天", en: "days" },
    "cap.warranty":      { zh: "产品质保期(年)", en: "Warranty Target (yr)" },
    "cap.scenario":      { zh: "场景", en: "Scenario" },
    "cap.opt.none":      { zh: "无额外余量(1.0x)", en: "No extra margin (1.0x)" },
    "cap.opt.consumer":  { zh: "消费(1.3x)", en: "Consumer (1.3x)" },
    "cap.opt.industrial":{ zh: "工业(1.5x)", en: "Industrial (1.5x)" },
    "cap.opt.automotive":{ zh: "汽车(2.0x)", en: "Automotive (2.0x)" },
    "cap.opt.medical":   { zh: "医疗(2.5x)", en: "Medical (2.5x)" },

    /* Capacitor — device params */
    "cap.device":        { zh: "器件参数", en: "Device Parameters" },
    "cap.l0":            { zh: "额定寿命(h)", en: "Rated Life (h)" },
    "cap.tmax":          { zh: "最高温度(°C)", en: "Max Temp (°C)" },
    "cap.tau":           { zh: "Arrhenius τ(℃)", en: "Arrhenius τ (°C)" },
    "cap.tau.8":         { zh: "8 (长寿命型)", en: "8 (Long-life)" },
    "cap.tau.9":         { zh: "9 (高可靠型)", en: "9 (High-reliability)" },
    "cap.tau.10":        { zh: "10 (标准品)", en: "10 (Standard)" },
    "cap.vrated":        { zh: "额定电压(V)", en: "Rated Voltage (V)" },
    "cap.irated":        { zh: "额定纹波电流(mA)", en: "Rated Ripple Current (mA)" },
    "cap.dt0":           { zh: "最大芯温升(°C)", en: "Max Core Temp Rise (°C)" },
    "cap.capval":        { zh: "电容量(μF)", en: "Capacitance (μF)" },

    /* Capacitor — mission profile */
    "cap.profile":       { zh: "运行工况", en: "Operating Conditions" },
    "cap.profile.hint":  { zh: "多段工况 + 多频率纹波叠加。<br><br>不同频率的纹波电流因电容 ESR 不同而发热不同，频率越高 ESR 越低。<br>各频率纹波先除以频率修正系数 K_freq 折算到 120Hz 等效值，再平方求和计算温升：<br>等效电流 I_eff = √[Σ(I_n ÷ Kfreq_n)²]<br>温升 ΔT = ΔT₀ × (I_eff / I_rated)²<br><br>频率修正系数表（典型铝电解电容）：<br>• 50/60Hz  → 0.85<br>• 120Hz    → 1.0（基准）<br>• 1kHz     → 1.25<br>• 10kHz    → 1.5<br>• 100kHz   → 1.65<br><br>注：不同系列/耐压的电容 K_freq 不同，以规格书为准。", en: "Multi-segment + multi-frequency ripple superposition.<br><br>Ripple current at different frequencies produces different heating due to ESR vs frequency characteristics. Higher frequency → lower ESR.<br>Each frequency is normalized to 120Hz equivalent via K_freq, then summed by squares:<br>I_eff = √[Σ(I_n ÷ Kfreq_n)²]<br>ΔT = ΔT₀ × (I_eff / I_rated)²<br><br>Typical frequency correction factors (Al electrolytic):<br>• 50/60Hz  → 0.85<br>• 120Hz    → 1.0 (reference)<br>• 1kHz     → 1.25<br>• 10kHz    → 1.5<br>• 100kHz   → 1.65<br><br>Note: Actual K_freq varies by series and voltage rating; refer to the datasheet." },
    "cap.addSeg":        { zh: "+ 添加时段", en: "+ Add Segment" },
    "cap.seg":           { zh: "时段", en: "Segment" },
    "cap.segDur":        { zh: "每天", en: "per day" },
    "cap.segDur.h":      { zh: "h", en: "h" },
    "cap.delSeg":        { zh: "×删除", en: "×Del" },
    "cap.durLabel":      { zh: "时长(h)：", en: "Duration(h):" },
    "cap.taLabel":       { zh: "环温(℃)：", en: "Amb.Temp(°C):" },
    "cap.vopLabel":      { zh: "电压(V)：", en: "Voltage(V):" },
    "cap.rippleHdr.freq":{ zh: "频率(Hz)", en: "Freq(Hz)" },
    "cap.rippleHdr.cur": { zh: "电流(mA)", en: "Current(mA)" },
    "cap.addRipple":     { zh: "+ 纹波分量", en: "+ Ripple Component" },

    /* Capacitor — results */
    "cap.results":       { zh: "计算结果", en: "Results" },
    "cap.r.life":        { zh: "预计总寿命", en: "Est. Total Life" },
    "cap.r.years":       { zh: "预计服役年限", en: "Est. Service Life" },
    "cap.r.warranty":    { zh: "质保期判定", en: "Warranty Verdict" },
    "cap.r.damage":      { zh: "年损伤率", en: "Annual Damage" },
    "cap.r.worstT":      { zh: "最恶劣时段芯温", en: "Worst Segment Temp" },
    "cap.r.worstKt":     { zh: "最恶劣时段 K_T", en: "Worst Segment K_T" },
    "cap.r.unit.yr":     { zh: "年", en: "yr" },
    "cap.r.unit.pct":    { zh: "%/年", en: "%/yr" },
    "cap.margin.title":  { zh: "质保期裕量", en: "Warranty Margin" },
    "cap.margin.target": { zh: "目标:", en: "Target:" },
    "cap.segment.title": { zh: "各时段寿命消耗", en: "Per-Segment Life Consumption" },
    "cap.segHdr.seg":    { zh: "时段", en: "Seg" },
    "cap.segHdr.dur":    { zh: "时长(h)", en: "Dur(h)" },
    "cap.segHdr.temp":   { zh: "芯温℃", en: "T_core°C" },
    "cap.segHdr.li":     { zh: "等效寿命Li(h)", en: "Life Li(h)" },
    "cap.segHdr.dmg":    { zh: "年损伤", en: "Dmg/yr" },

    /* Capacitor type */
    "cap.type":        { zh: "电容类型", en: "Capacitor Type" },
    "cap.type.lv":     { zh: "低压引线/贴片型(≤100V)", en: "Low-Voltage Lead/SMD (≤100V)" },
    "cap.type.hv":     { zh: "高压牛角/螺栓型(≥160V)", en: "High-Voltage Snap-in/Screw (≥160V)" },
    "cap.type.manual": { zh: "手动设置 Kv 参数", en: "Manual Kv Parameters" },
    "cap.type.hint":   { zh: "电容类型决定电压修正系数 K_V 的取值方式：<br><b>低压型 (≤100V)</b>：电压降额对寿命影响可忽略，K_V=1<br><b>高压型 (≥160V)</b>：电压降额效果显著，使用 Nichicon 指数模型<br><b>手动设置</b>：自行指定模型参数 a、b<br><br>详见《电解电容寿命计算中的电压修正系数探讨》", en: "Capacitor type determines K_V behavior:<br><b>Low-Voltage (≤100V)</b>: derating negligible, K_V=1<br><b>High-Voltage (≥160V)</b>: significant derating, Nichicon exponential model<br><b>Manual</b>: specify own a, b parameters" },
    "cap.kva":         { zh: "Kv 参数 a（指数系数）", en: "Kv param a (exponent)" },
    "cap.kvb":         { zh: "Kv 参数 b（曲率系数）", en: "Kv param b (curvature)" },

    /* Capacitor — model description */
    "cap.model.title":   { zh: "计算模型说明", en: "Calculation Model" },
    "cap.model.temp":    { zh: "温度加速", en: "Temp Acceleration" },
    "cap.model.volt":    { zh: "电压修正", en: "Voltage Correction" },
    "cap.model.freq":    { zh: "频率修正", en: "Frequency Correction" },
    "cap.model.damage":  { zh: "累积损伤", en: "Cumulative Damage" },
    "cap.model.eol":     { zh: "EOL 判据", en: "EOL Criteria" },

    /* Capacitor — dynamic UI */
    "cap.totalTime":     { zh: "合计: {v} / 24 h", en: "Total: {v} / 24 h" },
    "cap.over24":        { zh: "总时长 {v} h 超 24 h", en: "Total {v} h exceeds 24 h" },
    "cap.remaining":     { zh: "剩余 {v} h 未定义(停机)", en: "{v} h undefined (idle)" },

    /* Capacitor — report */
    "cap.report.title":  { zh: "设计报告", en: "Design Report" },
    "cap.report.gen":    { zh: "生成报告", en: "Generate Report" },
    "cap.report.export": { zh: "导出报告", en: "Export Report" },
    "cap.report.empty":  { zh: '点击"生成报告"按钮后显示。', en: 'Click "Generate Report" to display.' },
    "cap.report.rptTitle":{ zh: "电解电容寿命评估报告", en: "Electrolytic Capacitor Lifetime Report" },
    "cap.report.hint":   { zh: "请先定义运行剖面", en: "Please define a mission profile first" },
    "cap.report.projInfo":{ zh: "项目信息", en: "Project Information" },
    "cap.report.rated":  { zh: "额定参数", en: "Rated Parameters" },
    "cap.report.profile":{ zh: "运行工况", en: "Operating Conditions" },
    "cap.report.calc":   { zh: "计算过程", en: "Calculation Process" },
    "cap.report.conclusion":{ zh: "结论", en: "Conclusion" },
    "cap.report.projName":{ zh: "项目名称", en: "Project" },
    "cap.report.model":  { zh: "器件型号", en: "Model" },
    "cap.report.scene":  { zh: "应用场景", en: "Scenario" },
    "cap.report.cool":   { zh: "散热", en: "Cooling" },
    "cap.report.days":   { zh: "年工作天数", en: "Workdays/yr" },
    "cap.report.warr":   { zh: "质保期", en: "Warranty" },
    "cap.report.coolCond":{ zh: "散热条件", en: "Cooling Condition" },
    "cap.report.dmgD":   { zh: "年损伤 D", en: "Damage D/yr" },
    "cap.report.estLife":{ zh: "预计寿命", en: "Est. Life" },
    "cap.report.margin": { zh: "裕量", en: "Margin" },
    "cap.report.verdict":{ zh: "判定", en: "Verdict" },
    "cap.report.noRipple":{ zh: "无纹波", en: "No Ripple" },
    "cap.report.ripple": { zh: "纹波", en: "Ripple" },
    "cap.report.rippleCurrent":{ zh: "纹波电流", en: "Ripple Current" },
    "cap.report.riseCalc":{ zh: "温升计算", en: "Temperature Rise" },
    "cap.report.lifeCalc":{ zh: "寿命计算", en: "Life Calculation" },
    "cap.report.miner":  { zh: "累计损伤 (Miner准则)", en: "Cumulative Damage (Miner)" },
    "cap.report.footer": { zh: "电解电容寿命计算器", en: "Capacitor Lifetime Calculator" },
    "cap.report.date":  { zh: "报告日期", en: "Report Date" },

    /* Capacitor — model description for report */
    "cap.modelDesc.temp":{ zh: "温度加速：Arrhenius K_T = 2^((T_max - T_a + ΔT₀ - ΔT_x) / τ) [含纹波温升]", en: "Temp Acceleration: Arrhenius K_T = 2^((T_max - T_a + ΔT₀ - ΔT_x) / τ) [with ripple]" },
    "cap.modelDesc.volt":{ zh: "电压修正：Nichicon 指数模型 K_V = exp[a·((V_r/V_op)^b - 1)]，a=0.56, b=1.0", en: "Voltage Correction: Nichicon K_V = exp[a·((V_r/V_op)^b - 1)], a=0.56, b=1.0" },
    "cap.modelDesc.freq":{ zh: "频率修正：K_freq 查表法（铝电解电容 ESR-频率特性）", en: "Frequency Correction: K_freq lookup (Al electrolytic ESR-frequency)" },
    "cap.modelDesc.dmg": { zh: "累积损伤：Miner 线性疲劳准则 D = Σ(t_i·N_days / L_i)", en: "Cumulative Damage: Miner D = Σ(t_i·N_days / L_i)" },
    "cap.modelDesc.eol": { zh: "EOL 判据：容量下降 ≥20% 或 ESR ≥2× 初始值", en: "EOL: Capacitance drop ≥20% or ESR ≥2× initial" },
    "cap.modelDesc.ref": { zh: "参考标准", en: "Reference" },
    "cap.modelDesc.voltLv":{ zh: "电压修正：低压引线型(V_r≤100V)，电压降额影响可忽略，K_V=1", en: "Voltage Correction: LV type (V_r≤100V), derating negligible, K_V=1" },
    "cap.modelDesc.voltHv":{ zh: "电压修正：高压牛角/螺栓型(V_r≥160V)，Nichicon K_V = exp[a·((V_r/V_op)^b - 1)]", en: "Voltage Correction: HV type (V_r≥160V), Nichicon K_V = exp[a·((V_r/V_op)^b - 1)]" },

    /* Capacitor — model results (dynamically generated) */
    "cap.verdict.excellent":{ zh: "优秀", en: "Excellent" },
    "cap.verdict.pass":  { zh: "合格", en: "Pass" },
    "cap.verdict.marginal":{ zh: "边缘", en: "Marginal" },
    "cap.verdict.fail":  { zh: "不合格", en: "Fail" },

    /* Capacitor — warranty description templates */
    "cap.warranty.sufficient":{ zh: "质保期{wt}年，预计寿命{ly}年", en: "Warranty {wt}yr, Est. {ly}yr" },
    "cap.warranty.meets": { zh: "质保期{wt}年，预计寿命{ly}年", en: "Warranty {wt}yr, Est. {ly}yr" },
    "cap.warranty.edge":  { zh: "质保期{wt}年，预计寿命{ly}年", en: "Warranty {wt}yr, Est. {ly}yr" },
    "cap.warranty.fail":  { zh: "质保期{wt}年，预计寿命{ly}年", en: "Warranty {wt}yr, Est. {ly}yr" },
    "cap.warranty.req":   { zh: "需{req}x", en: "need {req}x" },

    /* Capacitor — clamping warnings */
    "cap.warn.to24":     { zh: "总时长{v}h超24h，已修正", en: "Total {v}h exceeds 24h, corrected" },
    "cap.warn.calcErr":  { zh: "⚠ 计算错误:", en: "⚠ Calculation error:" },

    /* Safety page */
    "safe.title":        { zh: "安规距离计算工具", en: "Creepage & Clearance Calculator" },
    "safe.subtitle":     { zh: "IEC 62109-1 / UL 1741 爬电距离 + 电气间隙 | 适用于并网逆变器", en: "IEC 62109-1 / UL 1741 Creepage + Clearance | Grid-tied Inverter Design" },

    /* Safety — standard system */
    "safe.standard":     { zh: "标准体系", en: "Standard System" },

    /* Safety — basic params */
    "safe.basic":        { zh: "基础参数", en: "Basic Parameters" },
    "safe.projName":     { zh: "项目名称", en: "Project Name" },
    "safe.pd":           { zh: "污染等级", en: "Pollution Degree" },
    "safe.pd.1":         { zh: "PD 1 (无污染/密封)", en: "PD 1 (No pollution / Sealed)" },
    "safe.pd.2":         { zh: "PD 2 (一般污染)", en: "PD 2 (General pollution)" },
    "safe.pd.3":         { zh: "PD 3 (严重污染)", en: "PD 3 (Severe pollution)" },
    "safe.pd.hint.ul":   { zh: "UL §25.4a 固定 PD3", en: "UL §25.4a fixed PD3" },
    "safe.pd.ul.ro":     { zh: "PD 3 (UL 1741 §25.4a 强制)", en: "PD 3 (UL 1741 §25.4a mandatory)" },
    "safe.mg":           { zh: "材料组别 (CTI)", en: "Material Group (CTI)" },
    "safe.mg.i":         { zh: "I 组 (CTI ≥ 600)", en: "Group I (CTI ≥ 600)" },
    "safe.mg.ii":        { zh: "II 组 (400 ≤ CTI < 600)", en: "Group II (400 ≤ CTI < 600)" },
    "safe.mg.iiia":      { zh: "IIIa 组 (175 ≤ CTI < 400)", en: "Group IIIa (175 ≤ CTI < 400)" },
    "safe.mg.iiib":      { zh: "IIIb 组 (100 ≤ CTI < 175)", en: "Group IIIb (100 ≤ CTI < 175)" },
    "safe.mg.hint.ul":   { zh: "UL §25.4d 固定 II 组", en: "UL §25.4d fixed Group II" },
    "safe.mg.ul.ro":     { zh: "II 组 (CTI >= 100, UL §25.4d)", en: "Group II (CTI >= 100, UL §25.4d)" },
    "safe.alt":          { zh: "海拔", en: "Altitude" },
    "safe.iso.title":    { zh: "隔离架构 (IEC 62109-1 §7.3.7)", en: "Isolation Architecture (IEC 62109-1 §7.3.7)" },
    "safe.iso.label":    { zh: "是否隔离", en: "Isolation" },
    "safe.iso.isolated": { zh: "有隔离", en: "Isolated" },
    "safe.iso.noniso":   { zh: "无隔离", en: "Non-isolated" },
    "safe.ovc.ac":       { zh: "AC侧过电压类别", en: "AC-side OVC" },
    "safe.ovc.i":        { zh: "I — 经SPD保护电路", en: "I — SPD protected" },
    "safe.ovc.ii":       { zh: "II — 插接式设备", en: "II — Plug-in equipment" },
    "safe.ovc.iii":      { zh: "III — 固定安装/配电盘下游", en: "III — Fixed installation" },
    "safe.ovc.iv":       { zh: "IV — 建筑入口/电表上游", en: "IV — Building entrance" },
    "safe.ovc.dc.i":     { zh: "I — 经SPD保护电路", en: "I — SPD protected" },
    "safe.ovc.dc.ii":    { zh: "II — PV默认/插接式设备", en: "II — PV default / Plug-in" },
    "safe.ovc.dc.iii":   { zh: "III — 固定安装", en: "III — Fixed installation" },
    "safe.ovc.dc.iv":    { zh: "IV — 建筑入口", en: "IV — Building entrance" },
    "safe.ovc.ul.hint":  { zh: "UL §25.4b 固定 OVC IV", en: "UL §25.4b fixed OVC IV" },
    "safe.ovc.ul.ro":    { zh: "IV (UL 1741 §25.4b 强制)", en: "IV (UL 1741 §25.4b mandatory)" },
    "safe.ovc.dc":       { zh: "DC侧过电压类别", en: "DC-side OVC" },
    "safe.ovc.derived":  { zh: "自动派生", en: "Auto-derived" },
    "safe.sysVac":       { zh: "AC系统电压 (Vrms)", en: "AC System Voltage (Vrms)" },
    "safe.sysVdc":       { zh: "DC系统电压 (Vdc)", en: "DC System Voltage (Vdc)" },
    "safe.hint.acMain":  { zh: "AC主回路", en: "AC Main Circuit" },
    "safe.hint.pvVoc":   { zh: "PV最大开路电压", en: "PV Max Open-circuit Voltage" },

    /* Safety — impulse */
    "safe.impulse":      { zh: "冲击电压 / 暂态过电压", en: "Impulse / Temporary Overvoltage" },

    /* Safety — nodes */
    "safe.nodes":        { zh: "测量节点定义", en: "Measurement Nodes" },
    "safe.nodes.hint":   { zh: "定义逆变器中各需要计算安规距离的节点及其电气参数", en: "Define nodes in the inverter requiring clearance/creepage calculation" },
    "safe.nodeHdr.name": { zh: "节点名称", en: "Node Name" },
    "safe.nodeHdr.gnd":  { zh: "是否对地", en: "To Gnd" },
    "safe.nodeHdr.vrms": { zh: "工作电压Vrms(V)", en: "Voltage Vrms (V)" },
    "safe.nodeHdr.ins":  { zh: "绝缘类型", en: "Insulation" },
    "safe.nodeHdr.pcb":  { zh: "是否PCB走线", en: "PCB Trace" },
    "safe.nodeHdr.coat": { zh: "三防漆", en: "Coating" },
    "safe.nodeHdr.circ": { zh: "电路位置", en: "Circuit" },
    "safe.addNode":      { zh: "+ 添加测量节点", en: "+ Add Node" },
    "safe.ins.func":     { zh: "功能", en: "Functional" },
    "safe.ins.basic":    { zh: "基本", en: "Basic" },
    "safe.ins.supp":     { zh: "附加", en: "Supplementary" },
    "safe.ins.reinf":    { zh: "加强", en: "Reinforced" },
    "safe.pcb.no":       { zh: "否", en: "No" },
    "safe.pcb.yes":      { zh: "是", en: "Yes" },
    "safe.coat.no":      { zh: "无", en: "None" },
    "safe.coat.t1":      { zh: "Type 1 (降PD)", en: "Type 1 (Reduce PD)" },
    "safe.coat.t2":      { zh: "Type 2/灌封", en: "Type 2/Potting" },
    "safe.gnd.no":       { zh: "否", en: "No" },
    "safe.gnd.yes":      { zh: "是", en: "Yes" },

    /* Safety — results */
    "safe.res.title":    { zh: "计算结果", en: "Results" },
    "safe.res.req":      { zh: "各节点所需安规距离", en: "Required Safety Distances per Node" },
    "safe.res.node":     { zh: "节点", en: "Node" },
    "safe.res.ins":      { zh: "绝缘类型", en: "Insulation" },
    "safe.res.clr":      { zh: "电气间隙(mm)", en: "Clearance(mm)" },
    "safe.res.crp":      { zh: "爬电距离(mm)", en: "Creepage(mm)" },
    "safe.res.assess":   { zh: "评估详情", en: "Assessment Details" },

    /* Safety — report */
    "safe.report.title": { zh: "安距设计报告", en: "Safety Distance Report" },
    "safe.report.gen":   { zh: "生成报告", en: "Generate Report" },
    "safe.report.export":{ zh: "导出报告", en: "Export Report" },
    "safe.report.empty": { zh: '点击"生成报告"按钮后显示。', en: 'Click "Generate Report" to display.' },
    "safe.report.rptTitle":{ zh: "安规距离评估报告", en: "Safety Distance Assessment Report" },
    "safe.report.hint":  { zh: "请添加测量节点。", en: "Please add measurement nodes." },
    "safe.report.projInfo":{ zh: "项目信息", en: "Project Information" },
    "safe.report.basic": { zh: "基础参数", en: "Basic Parameters" },
    "safe.report.nodes": { zh: "各节点所需安规距离", en: "Required Safety Distances per Node" },
    "safe.report.calcProc":{ zh: "计算过程", en: "Calculation Process" },
    "safe.report.conclusion":{ zh: "结论", en: "Conclusion" },
    "safe.report.conclusionText":{ zh: "各节点安规距离计算结果如上表所示，实际工程设计中应确保实际距离大于所需值，并留足设计裕量。", en: "Safety distance results are shown above. Ensure actual distances exceed required values with adequate design margin." },
    "safe.report.footer":{ zh: "安规距离计算工具", en: "Safety Distance Calculator" },
    "safe.report.std":   { zh: "标准", en: "Standard" },
    "safe.report.pd":    { zh: "污染等级", en: "Pollution Degree" },
    "safe.report.mg":    { zh: "材料组别", en: "Material Group" },
    "safe.report.alt":   { zh: "海拔", en: "Altitude" },
    "safe.report.iso":   { zh: "隔离架构", en: "Isolation" },
    "safe.report.iso.yes":{ zh: "有隔离", en: "Isolated" },
    "safe.report.iso.no":{ zh: "无隔离", en: "Non-isolated" },
    "safe.report.acOvc": { zh: "AC侧过电压类别", en: "AC-side OVC" },
    "safe.report.dcOvc": { zh: "DC侧过电压类别", en: "DC-side OVC" },
    "safe.report.acV":   { zh: "AC系统电压", en: "AC System Voltage" },
    "safe.report.dcV":   { zh: "DC系统电压", en: "DC System Voltage" },
    "safe.report.isolated":{ zh: "(隔离降档)", en: "(Isolated step-down)" },
    "safe.report.proj":  { zh: "项目", en: "Project" },
    "safe.report.content":{ zh: "内容", en: "Content" },
    "safe.report.val":   { zh: "值", en: "Value" },
    "safe.report.node":  { zh: "节点", en: "Node" },
    "safe.report.params":{ zh: "参数", en: "Parameter" },

    /* Safety — assessment notes */
    "safe.note.gnd":     { zh: "对地节点", en: "Grounded node" },
    "safe.note.line":    { zh: "线间节点", en: "Line-line node" },
    "safe.note.clrIec":  { zh: "电气间隙(IEC): 取冲击电压、暂态过电压(TOV)、工作电压峰值三者查表后最严苛值，再乘海拔系数", en: "Clearance (IEC): max of impulse voltage, TOV, and working voltage peak lookups, × altitude factor" },
    "safe.note.reinfIec":{ zh: "加强绝缘(IEC): 取三项中最严 — (a)冲击电压升一档 (b)1.6×工作峰值 (c)1.6×TOV峰值(仅电网电路)", en: "Reinforced (IEC): max of (a) impulse up one level (b) 1.6×peak working (c) 1.6×TOV peak (mains only)" },
    "safe.note.crpIec":  { zh: "爬电距离已乘绝缘倍率，非PCB走线按污染等级选取", en: "Creepage includes insulation multiplier; non-PCB per pollution degree" },
    "safe.note.warnIns": { zh: "⚠ = 用户选择了非加强绝缘但对地连接，系统已自动按加强绝缘计算", en: "⚠ = Non-reinforced selected for grounded node; auto-applied reinforced" },
    "safe.note.clrUl":   { zh: "电气间隙(UL): 由相地额定系统电压(kVRMS)查表确定 (§25.4g)，不使用冲击耐受电压", en: "Clearance (UL): from phase-to-ground rated system voltage (kVRMS) per §25.4g" },
    "safe.note.reinfUl": { zh: "加强绝缘(UL): 取基本绝缘距离×2 或表中上一行，以较大值为准 (§6.3)", en: "Reinforced (UL): max of basic×2 or next table row (§6.3)" },
    "safe.note.crpUl":   { zh: "爬电距离(UL): 由工作电压Vrms查表确定，加强绝缘翻倍", en: "Creepage (UL): from Vrms lookup; reinforced doubles" },
    "safe.note.warnUl":  { zh: "⚠ = 对地节点强制加强绝缘，系统已自动应用", en: "⚠ = Grounded node forced reinforced; auto-applied" },
    "safe.note.peakUl":  { zh: "🔴 = PCB反复峰值电压超限 (UL 840 §9.6)，需增大爬电距离或降低工作电压", en: "🔴 = PCB recurring peak over limit (UL 840 §9.6); increase creepage or lower voltage" },
    "safe.note.t241":    { zh: "⚠T24.1 = 现场接线端子强制使用Table 24.1基线间距 (UL 1741 §25.3)，不使用UL 840替代方案", en: "⚠T24.1 = Field terminal uses Table 24.1 baseline (UL 1741 §25.3), not UL 840 alternative" },

    /* Safety — impulse info labels */
    "safe.imp.ac":       { zh: "AC侧冲击电压:", en: "AC Impulse Voltage:" },
    "safe.imp.dc":       { zh: "DC侧冲击电压:", en: "DC Impulse Voltage:" },
    "safe.imp.tov":      { zh: "AC侧暂态过电压:", en: "AC Temporary Overvoltage:" },
    "safe.imp.note":     { zh: "(隔离降档)", en: "(Isolated step-down)" },
    "safe.imp.within":   { zh: "线间节点(电气间隙): 冲击电压降一档", en: "Line-line clearance: impulse steps down one level" },
    "safe.imp.ref":      { zh: "依据 IEC 62109-1 §7.3.7 — 同一电路内部的功能绝缘比对地再降一档", en: "Per IEC 62109-1 §7.3.7 — functional insulation within circuit steps down one level" },

    /* Safety — calc chain */
    "safe.chain.workV":  { zh: "工作电压", en: "Working Voltage" },
    "safe.chain.mult":   { zh: "倍率", en: "Multiplier" },
    "safe.chain.alt":    { zh: "海拔修正系数", en: "Altitude Factor" },
    "safe.chain.reqClr": { zh: "→ 所需电气间隙", en: "→ reqClearance" },
    "safe.chain.reqCrp": { zh: "→ 所需爬电距离", en: "→ reqCreepage" },
    "safe.chain.warnGnd":{ zh: "⚠ 对地节点，标准强制要求加强绝缘", en: "⚠ Grounded node: standard requires reinforced insulation" },
    "safe.chain.warnT241":{ zh: "⚠ UL Table 24.1最小值约束生效", en: "⚠ UL Table 24.1 minimum constraint active" },
    "safe.chain.warnPeak":{ zh: "🔴 UL §9.6 PCB峰值电压超限", en: "🔴 UL §9.6 PCB peak voltage exceeded" },
    "safe.chain.forcedReinf":{ zh: "强制加强", en: "Forced R." },
    "safe.chain.interp": { zh: "差值法", en: "Interpolated" },
    "safe.chain.lookup":  { zh: "查表得基准值", en: "table lookup baseline" },
    "safe.chain.toGnd":  { zh: "(对地)", en: "(To Gnd)" },
    "safe.chain.lineLine":{ zh: "(线间,降档)", en: "(Line-line, step-down)" },
    "safe.chain.lineLineShort":{ zh: "(线间)", en: "(Line-line)" },
    "safe.chain.withinNote":{ zh: "线间节点：冲击电压按标准降一档计算", en: "Line-line: impulse steps down per standard" },

    /* Safety — UL assessment notes */
    "safe.ul.clrNote":   { zh: "UL 电气间隙由相地额定系统电压(kVRMS)查表确定 (§25.4g)，不使用冲击耐受电压", en: "UL clearance from phase-ground rated system voltage (kVRMS) per §25.4g" },
    "safe.ul.reinfNote": { zh: "加强绝缘(UL): 取基本绝缘距离×2 或表中上一行，以较大值为准 (§6.3)", en: "Reinforced (UL): max of basic×2 or next row (§6.3)" },
    "safe.ul.crpNote":   { zh: "爬电距离(UL): 由工作电压Vrms查表确定，加强绝缘翻倍", en: "Creepage (UL): from Vrms lookup, reinforced doubles" },

    /* PCB Trace Current Capacity */
    "pcb.title":        { zh: "PCB 载流能力计算工具", en: "PCB Trace Current Capacity Calculator" },
    "pcb.subtitle":     { zh: "IPC-2221 标准公式 · 正向/反向计算 · 压降分析 · 多宽度对比", en: "IPC-2221 standard formula · Forward/Reverse calculation · Voltage drop · Multi-width comparison" },
    "pcb.basic":        { zh: "基础参数", en: "Basic Parameters" },
    "pcb.width":        { zh: "走线宽度", en: "Trace Width" },
    "pcb.copper":       { zh: "铜厚 (oz)", en: "Copper Weight (oz)" },
    "pcb.position":     { zh: "走线位置", en: "Trace Position" },
    "pcb.position.tip": { zh: "IPC-2221 公式中，外层 K=0.048，内层 K=0.024。内层走线被夹在板层之间，散热受限，载流能力约为外层的一半。", en: "In the IPC-2221 formula, external K=0.048, internal K=0.024. Internal traces are sandwiched between board layers with limited heat dissipation, so current capacity is roughly half that of external traces." },
    "pcb.posExternal":  { zh: "外层", en: "External" },
    "pcb.posInternal":  { zh: "内层", en: "Internal" },
    "pcb.tempRise":     { zh: "允许温升 (°C)", en: "Allowed Temp Rise (°C)" },
    "pcb.ambTemp":      { zh: "环境温度 (°C)", en: "Ambient Temp (°C)" },
    "pcb.length":       { zh: "走线长度 (mm)", en: "Trace Length (mm)" },
    "pcb.targetI":      { zh: "目标电流 (A)", en: "Target Current (A)" },
    "pcb.targetI.tip":  { zh: "输入目标电流可反向计算所需的最小走线宽度。填0则不进行反向计算。", en: "Enter a target current to reverse-calculate the minimum trace width. Enter 0 to skip reverse calculation." },
    "pcb.result":       { zh: "计算结果", en: "Calculation Results" },
    "pcb.maxI":         { zh: "最大允许电流", en: "Max Current" },
    "pcb.minWidth":     { zh: "最小线宽", en: "Min Width" },
    "pcb.resistance":   { zh: "电阻", en: "Resistance" },
    "pcb.inductance":   { zh: "电感", en: "Inductance" },
    "pcb.vdrop":        { zh: "压降", en: "Voltage Drop" },
    "pcb.powerLoss":    { zh: "功率损耗", en: "Power Loss" },
    "pcb.compare":      { zh: "多宽度对比", en: "Multi-Width Comparison" },
    "pcb.repTitle":     { zh: "PCB 载流能力评估报告", en: "PCB Trace Current Capacity Report" },
    "pcb.repInput":     { zh: "输入参数", en: "Input Parameters" },
    "pcb.repCalc":      { zh: "计算过程", en: "Calculation Process" },
    "pcb.repFormula":   { zh: "IPC-2221 公式", en: "IPC-2221 Formula" },
    "pcb.repReverse":   { zh: "反向计算（由目标电流求最小线宽）", en: "Reverse calculation (target current → min width)" },
    "pcb.repVdrop":     { zh: "压降计算", en: "Voltage Drop" },
    "pcb.repCompare":   { zh: "多宽度对比", en: "Multi-Width Comparison" },
    "pcb.repFooter":    { zh: "PCB载流能力计算器", en: "PCB Trace Current Calculator" },

    /* Via current */
    "pcb.via.title":    { zh: "过孔载流能力", en: "Via Current Capacity" },
    "pcb.via.drill":    { zh: "过孔内径 (mm)", en: "Via Drill Dia. (mm)" },
    "pcb.via.wall":     { zh: "孔壁铜厚", en: "Plating Thickness" },
    "pcb.via.wall20":   { zh: "20μm (IPC Class 2 min)", en: "20μm (IPC Class 2 min)" },
    "pcb.via.wall25":   { zh: "25μm (1oz plating)", en: "25μm (1oz plating)" },
    "pcb.via.wall35":   { zh: "35μm (2oz plating)", en: "35μm (2oz plating)" },
    "pcb.via.targetI":  { zh: "目标电流 (A)", en: "Target Current (A)" },
    "pcb.via.targetI.tip":{ zh: "输入目标电流可反向计算所需最小孔径和建议并联过孔数。填0则不进行反向计算。", en: "Enter a target current to reverse-calculate the minimum drill size and recommended parallel vias. Set 0 to skip." },
    "pcb.via.maxI":     { zh: "单孔最大电流", en: "Max Current per Via" },
    "pcb.via.area":     { zh: "等效截面积", en: "Equivalent Area" },
    "pcb.via.minDrill": { zh: "最小建议孔径", en: "Recommended Drill" },
    "pcb.via.viasRec":  { zh: "建议并联过孔数", en: "Recommended Vias" },
    "pcb.via.singleI":  { zh: "单孔载流", en: "Single Via Current" },

    /* Common warnings */
    "common.warn.calcErr":{ zh: "⚠ 计算错误:", en: "⚠ Calculation error:" },
    "common.noRipple":   { zh: "无纹波输入, ΔT = 0°C", en: "No ripple input, ΔT = 0°C" },

    /* Select option value-based translations (for <option> elements) */
    "opt.value.func":    { zh: "功能", en: "Functional" },
    "opt.value.basic":   { zh: "基本", en: "Basic" },
    "opt.value.supp":    { zh: "附加", en: "Supplementary" },
    "opt.value.reinf":   { zh: "加强", en: "Reinforced" },
    "opt.value.ac":      { zh: "AC", en: "AC" },
    "opt.value.dc":      { zh: "DC(PV)", en: "DC(PV)" },
/* Capacitor — dynamic UI */
    "cap.totalTime":     { zh: "合计: {v} / 24 h", en: "Total: {v} / 24 h" },
    "cap.over24":        { zh: "总时长 {v} h 超 24 h", en: "Total {v} h exceeds 24 h" },
    "cap.remaining":     { zh: "剩余 {v} h 未定义(停机)", en: "{v} h undefined (idle)" },

    /* Capacitor — warranty description templates */
    "cap.warranty.sufficient":{ zh: "质保期{wt}年，预计寿命{ly}年", en: "Warranty {wt}yr, Est. {ly}yr" },
    "cap.warranty.meets": { zh: "质保期{wt}年，预计寿命{ly}年", en: "Warranty {wt}yr, Est. {ly}yr" },
    "cap.warranty.edge":  { zh: "质保期{wt}年，预计寿命{ly}年", en: "Warranty {wt}yr, Est. {ly}yr" },
    "cap.warranty.fail":  { zh: "质保期{wt}年，预计寿命{ly}年", en: "Warranty {wt}yr, Est. {ly}yr" },
    "cap.warranty.req":   { zh: "需{req}x", en: "need {req}x" },

    /* Capacitor — clamping warnings */
    "cap.warn.to24":     { zh: "总时长{v}h超24h，已修正", en: "Total {v}h exceeds 24h, corrected" },
    "cap.warn.calcErr":  { zh: "⚠ 计算错误:", en: "⚠ Calculation error:" },

    /* Validation parameter names */
    "param.workdays":    { zh: "工作日", en: "Workdays" },
    "param.warranty":    { zh: "质保目标", en: "Warranty target" },
    "param.duration":    { zh: "时长", en: "Duration" },
    "param.ambtemp":     { zh: "环温", en: "Amb. temp" },
    "param.voltage":     { zh: "电压", en: "Voltage" },
    "param.ripple":      { zh: "纹波电流", en: "Ripple current" },
    "param.altitude":    { zh: "海拔", en: "Altitude" },
    "param.acv":         { zh: "AC系统电压", en: "AC sys voltage" },
    "param.dcv":         { zh: "DC系统电压", en: "DC sys voltage" },
    "param.nodeV":       { zh: "节点{n}电压", en: "Node {n} voltage" },
    "param.corrected":   { zh: "修正为", en: "corrected to" },
    "param.node":        { zh: "节点", en: "Node" },

    /* Calculation process */
    "cap.calc.modelDesc":{ zh: "计算模型说明", en: "Model Description" },
    "cap.calc.tempAccel":{ zh: "温度加速", en: "Temp Acceleration" },
    "cap.calc.voltCorr": { zh: "电压修正", en: "Voltage Correction" },
    "cap.calc.freqCorr": { zh: "频率修正", en: "Freq Correction" },
    "cap.calc.freqDesc": { zh: "查表法（铝电解电容 ESR-频率特性）", en: "Lookup (Al electrolytic ESR-freq)" },
    "cap.calc.cumDmg":   { zh: "累积损伤", en: "Cumulative Damage" },
    "cap.calc.eol":      { zh: "EOL 判据", en: "EOL Criteria" },
    "cap.calc.eolDesc":  { zh: "容量下降 ≥20% 或 ESR ≥2× 初始值", en: "Cap. drop ≥20% or ESR ≥2× initial" },
    "cap.calc.ref":      { zh: "参考标准：", en: "Reference: " },
    "cap.calc.riseCalc": { zh: "温升计算", en: "Temp Rise" },
    "cap.calc.lifeCalc": { zh: "寿命计算", en: "Life Calc" },
    "cap.calc.minerTitle":{ zh: "累计损伤 (Miner准则)", en: "Cumulative Damage (Miner)" },
    "cap.calc.noRipple": { zh: "无纹波输入, ΔT = 0°C", en: "No ripple, ΔT = 0°C" },
    "cap.calc.reportTitle":{ zh: "电解电容寿命评估报告", en: "Capacitor Lifetime Report" },
    "cap.calc.rptNum":   { zh: "报告编号", en: "Report No." },
    "cap.calc.genDate":  { zh: "生成日期", en: "Generated" },
    "cap.calc.ratedParam":{ zh: "额定参数", en: "Rated Parameters" },
    "cap.calc.profileCalc":{ zh: "运行剖面与寿命计算", en: "Profile & Life Calculation" },
    "cap.calc.calcProc": { zh: "计算过程", en: "Calculation Process" },
    "cap.calc.conclusion":{ zh: "结论", en: "Conclusion" },
    "cap.calc.coolCond": { zh: "散热条件", en: "Cooling" },
    "cap.calc.annDmg":   { zh: "年损伤 D", en: "Damage D/yr" },
    "cap.calc.estLife":  { zh: "预计寿命", en: "Est. Life" },
    "cap.calc.footer":   { zh: "电解电容寿命计算器 v2.0", en: "Capacitor Lifetime Calculator v2.0" },
    "cap.calc.autoGen":  { zh: "报告自动生成", en: "Auto-generated" },
    "cap.calc.wan":      { zh: "万", en: "×10⁴" },

    /* Safety — impulse info */
    "safe.imp.acLbl":    { zh: "AC侧冲击电压:", en: "AC Impulse:" },
    "safe.imp.dcLbl":    { zh: "DC侧冲击电压:", en: "DC Impulse:" },
    "safe.imp.tovLbl":   { zh: "AC侧暂态过电压:", en: "AC TOV:" },
    "safe.imp.ulTitle":  { zh: "UL 1741 查表依据:", en: "UL 1741 Table Basis:" },
    "safe.imp.ulAc":     { zh: "AC侧系统电压", en: "AC system voltage" },
    "safe.imp.ulDc":     { zh: "DC侧系统电压", en: "DC system voltage" },
    "safe.imp.ulNote":   { zh: "UL 电气间隙由相地额定系统电压查表确定 (§25.4g)，不使用冲击耐受电压", en: "UL clearance from phase-ground rated sys voltage (§25.4g), not impulse" },
    "safe.imp.isoDown":  { zh: "", en: "" },
    "safe.imp.noIso":    { zh: "", en: "" },
    "safe.imp.lineNote": { zh: "线间节点(电气间隙): 冲击电压降一档", en: "Line-line (clearance): impulse one level down" },
    "safe.imp.iecRef":   { zh: "依据 IEC 62109-1 §7.3.7 — 同一电路内部的功能绝缘比对地再降一档", en: "Per IEC 62109-1 §7.3.7 — functional insulation within circuit further derated" },
    "safe.imp.tipAc":    { zh: "查表12，按系统电压与AC侧过电压类别确定。电网电路不允许插值，电压在两档之间时向上取整到标准档位。<br><br><b>作用：</b>AC电路节点的电气间隙由该值查Table 13确定。加强绝缘时冲击电压升一档后查表（criterion a）；基本/附加/功能绝缘直接查表。线间节点再降一档。", en: "From Table 12 by system voltage and AC OVC. Mains circuits: no interpolation, round up.<br><br><b>Role:</b> Determines clearance for AC circuit nodes via Table 13. Reinforced: step up one level (criterion a). Basic/supp/func: direct lookup. Line-to-line nodes step down one level." },
    "safe.imp.tipDc":    { zh: "查表12，按DC系统电压与OVC II确定。PV电路允许插值。最低冲击电压为2.5kV（§7.3.7.1.2b）。有隔离时OVC比AC侧降一档。<br><br><b>作用：</b>DC/PV电路节点的电气间隙由该值查Table 13确定。计算逻辑与AC侧相同：加强绝缘升一档，基本/附加直接查表，线间降一档。", en: "From Table 12 by DC system voltage and OVC II. PV circuits allow interpolation. Min 2.5kV (§7.3.7.1.2b). Isolation reduces OVC by one level.<br><br><b>Role:</b> Determines clearance for DC/PV circuit nodes via Table 13. Same logic as AC: reinforced steps up, basic/supp direct, line-to-line steps down." },
    "safe.imp.tipTov":   { zh: "查表12第6列，仅适用于电网电路。用于加强绝缘电气间隙计算：1.6×TOV峰值查Table 13列2（criterion c）。基本/附加绝缘直接用TOV峰值查Table 13。非电网电路不适用TOV。", en: "From Table 12 col 6, mains only. Used for reinforced insulation clearance: 1.6×TOV peak → Table 13 col 2 (criterion c). Basic/supp uses TOV peak directly. Non-mains circuits: TOV not applicable." },
    "safe.imp.tipAll":   { zh: "<b>AC冲击电压：</b>查表12，按系统电压与AC侧过电压类别确定。电网电路不允许插值，向上取整。用于确定AC电路节点电气间隙（查Table 13），加强绝缘升一档，线间降一档。<br><br><b>DC冲击电压：</b>查表12，按DC系统电压与OVC II确定。PV电路允许插值，最低2.5kV（§7.3.7.1.2b），有隔离时OVC降一档。用于确定DC/PV电路节点电气间隙。<br><br><b>暂态过电压(TOV)：</b>查表12第6列，仅电网电路适用。加强绝缘时取1.6×TOV峰值查Table 13列2（criterion c），基本/附加直接用TOV峰值查表。", en: "<b>AC Impulse:</b> From Table 12 by system voltage and AC OVC. Mains: no interpolation, round up. Determines AC node clearance via Table 13. Reinforced: step up one level; line-to-line: step down.<br><br><b>DC Impulse:</b> From Table 12 by DC voltage and OVC II. PV allows interpolation, min 2.5kV (§7.3.7.1.2b). Isolation reduces OVC by one level. Determines DC/PV node clearance.<br><br><b>TOV:</b> From Table 12 col 6, mains only. Reinforced: 1.6×TOV peak → Table 13 col 2 (criterion c). Basic/supp: TOV peak directly." },

    /* Safety — calculation chain */
    "safe.chain.workV":  { zh: "工作电压", en: "Working voltage" },
    "safe.chain.mul":    { zh: "倍率", en: "Multiplier" },
    "safe.chain.altK":   { zh: "海拔修正系数", en: "Altitude factor" },
    "safe.chain.ulTable":{ zh: "查UL 840 Table 8.1", en: "UL 840 Table 8.1" },
    "safe.chain.iecTable":{ zh: "查Table 13得基准值", en: "Table 13 baseline" },
    "safe.chain.ulTableBase":{ zh: "查UL 840 Table 9.1得基准值", en: "UL 840 Table 9.1 baseline" },
    "safe.chain.iecTableBase":{ zh: "查Table 14得基准值", en: "Table 14 baseline" },
    "safe.chain.interpUsed":{ zh: "差值法", en: "Interpolated" },
    "safe.chain.impulseV":{ zh: "冲击电压", en: "Impulse" },
    "safe.chain.lineDerate":{ zh: "线间降档", en: "Line-line derated" },
    "safe.chain.sysV":   { zh: "系统电压", en: "System voltage" },
    "safe.chain.insMult":{ zh: "绝缘倍率", en: "Insulation mult." },
    "safe.chain.pd":     { zh: "污染等级", en: "Pollution degree" },
    "safe.chain.mg":     { zh: "材料组", en: "Material group" },
    "safe.chain.warnGnd2":{ zh: "⚠ 对地节点，标准强制要求加强绝缘", en: "⚠ Ground node: standard requires reinforced" },
    "safe.chain.warnT241b":{ zh: "⚠ UL Table 24.1最小值约束生效", en: "⚠ UL Table 24.1 minimum active" },
    "safe.chain.warnPeakB":{ zh: "🔴 UL §9.6 PCB峰值电压超限", en: "🔴 UL §9.6 PCB peak exceeded" },
    "safe.chain.toGnd":  { zh: "(对地)", en: "(To Gnd)" },
    "safe.chain.lineLine":{ zh: "(线间,降档)", en: "(Line-line, step-down)" },
    "safe.chain.lineLineShort":{ zh: "(线间)", en: "(Line-line)" },
    "safe.chain.forcedReinf":{ zh: "强制加强", en: "Forced R." },
    "safe.chain.clrIec": { zh: "电气间隙 (IEC):", en: "Clearance (IEC):" },
    "safe.chain.clr":    { zh: "电气间隙:", en: "Clearance:" },
    "safe.chain.crp":    { zh: "爬电距离:", en: "Creepage:" },
    "safe.chain.clrA":   { zh: "(a) 冲击电压升一档", en: "(a) Impulse stepped up" },
    "safe.chain.clrB":   { zh: "(b) 1.6×工作峰值", en: "(b) 1.6× working peak" },
    "safe.chain.clrC":   { zh: "(c) 1.6×TOV峰值", en: "(c) 1.6× TOV peak" },
    "safe.chain.clrCna": { zh: "TOV峰值: N/A (非电网电路)", en: "TOV peak: N/A (non-mains)" },
    "safe.chain.clrImp": { zh: "冲击电压", en: "Impulse" },
    "safe.chain.clrWk":  { zh: "工作峰值", en: "Working peak" },
    "safe.chain.clrMax": { zh: "→ 取最严苛值", en: "→ Max of" },
    "safe.chain.clrT13": { zh: "→ 查Table 13", en: "→ Table 13" },
    "safe.chain.crpIec": { zh: "爬电距离 (IEC):", en: "Creepage (IEC):" },
    "safe.chain.warnGnd":{ zh: "⚠ 对地节点，标准强制要求加强绝缘", en: "⚠ Ground node: reinforced required" },
    "safe.chain.warnT241":{ zh: "⚠ UL Table 24.1最小值约束生效", en: "⚠ UL Table 24.1 minimum active" },
    "safe.chain.warnPeak":{ zh: "🔴 UL §9.6 PCB峰值电压超限", en: "🔴 UL §9.6 PCB peak exceeded" },

    /* Safety — tooltip text */
    "safe.tip.gndIns":   { zh: "对地节点，IEC 62109-1 §7.3.7 强制加强绝缘", en: "Ground node, IEC 62109-1 §7.3.7 enforces reinforced" },
    "safe.tip.lineDerate":{ zh: "线间节点：冲击电压按标准降一档计算", en: "Line-line: impulse derated one level per standard" },
    "safe.tip.forced":   { zh: "该节点为对地连接，标准强制要求加强绝缘(×2)，已自动应用", en: "Ground-connected, standard enforces reinforced (×2), auto-applied" },
    "safe.tip.peakOver": { zh: "UL 840 §9.6: PCB反复峰值电压超出Table 9.3限制，请增大爬电距离或降低工作电压", en: "UL 840 §9.6: PCB recurring peak exceeds Table 9.3 — increase creepage or lower voltage" },
    "safe.tip.t241":     { zh: "UL 1741 §25.3: 现场接线端子强制使用Table 24.1基线间距(非UL 840替代方案)", en: "UL 1741 §25.3: Field terminals must use Table 24.1 baseline (not UL 840 alt)" },

    /* Safety — Word export */
    "safe.word.title":   { zh: "安规距离评估报告", en: "Safety Distance Report" },
    "safe.word.rptNum":  { zh: "报告编号", en: "Report No." },
    "safe.word.genDate": { zh: "生成日期", en: "Generated" },
    "safe.word.projInfo":{ zh: "项目信息", en: "Project Information" },
    "safe.word.basic":   { zh: "基础参数", en: "Basic Parameters" },
    "safe.word.results": { zh: "评估结果", en: "Evaluation Results" },
    "safe.word.footer":  { zh: "安规距离计算工具 v1.0", en: "Safety Distance Calculator v1.0" },
    "safe.word.autoGen": { zh: "报告自动生成", en: "Auto-generated" },
    "safe.word.node":    { zh: "节点名称", en: "Node Name" },
    "safe.word.insLvl":  { zh: "绝缘等级", en: "Insulation" },
    "safe.word.note":    { zh: "说明", en: "Note" },
    "safe.word.noteIec": { zh: "线间节点按IEC 62109-1 §7.3.7降一档计算电气间隙", en: "Line-line nodes derated one level per IEC 62109-1 §7.3.7" },
    "safe.word.noteUl":  { zh: "UL 电气间隙由相地额定系统电压(kVRMS)查表确定 (§25.4g)", en: "UL clearance from phase-ground rated sys voltage (kVRMS) per §25.4g" },
    "safe.word.addNote": { zh: "(隔离降档)", en: "(Isolated step-down)" },

    /* Safety — error/empty messages */
    "safe.msg.addNode":  { zh: "请添加测量节点。", en: "Please add measurement nodes." },
    "safe.msg.checkNode":{ zh: "请检查节点配置。", en: "Please check node configuration." },

    /* Filter Design page */
    "nav.filter":        { zh: "信号滤波器设计", en: "Filter Design" },
    "filter.title":      { zh: "信号滤波器设计工具", en: "Signal Filter Design Tool" },
    "filter.subtitle":   { zh: "基于运放的有源低通滤波器 · 一阶差分 / 二阶 MFB · 幅频相频特性 · E24/E48 标准值", en: "Op-amp active low-pass filter · 1st-order Diff / 2nd-order MFB · Bode plot · E24/E48 standard values" },
    "filter.spec":       { zh: "设计指标", en: "Design Specifications" },
    "filter.type":       { zh: "滤波器类型", en: "Filter Type" },
    "filter.type.diff1": { zh: "一阶差分 (Differential LPF)", en: "1st-Order Differential LPF" },
    "filter.type.mfb2":  { zh: "二阶MFB (Multiple Feedback LPF)", en: "2nd-Order MFB LPF" },
    "filter.series":     { zh: "电阻精度系列", en: "Resistor Series" },
    "filter.series.e24": { zh: "E24 (5%)", en: "E24 (5%)" },
    "filter.series.e48": { zh: "E48 (2%)", en: "E48 (2%)" },
    "filter.fc":         { zh: "截止频率", en: "Cutoff Frequency" },
    "filter.gain":       { zh: "直流增益", en: "DC Gain" },
    "filter.q":          { zh: "Q值", en: "Q Factor" },
    "filter.c1":         { zh: "C1 预设电容", en: "C1 Preset Capacitor" },
    "filter.c2":         { zh: "C2 预设电容", en: "C2 Preset Capacitor" },
    "filter.target":     { zh: "目标", en: "Target" },
    "filter.actual":     { zh: "实际", en: "Actual" },
    "filter.errFc":      { zh: "截止频率误差", en: "fc Error" },
    "filter.errGain":    { zh: "增益误差", en: "Gain Error" },
    "filter.topology":   { zh: "拓扑结构", en: "Topology" },
    "filter.poleFreq":   { zh: "极点频率", en: "Pole Frequency" },
    "filter.components": { zh: "器件参数", en: "Component Values" },
    "filter.ref":        { zh: "位号", en: "Ref" },
    "filter.refDes":     { zh: "参考编号", en: "Ref Des" },
    "filter.value":      { zh: "参数值", en: "Value" },
    "filter.results":    { zh: "计算结果", en: "Results" },
    "filter.chartMag":   { zh: "幅频特性", en: "Magnitude Response" },
    "filter.chartPhase": { zh: "相频特性", en: "Phase Response" },
    "filter.circuit":    { zh: "滤波器电路", en: "Filter Circuit" },
    "filter.noResult":   { zh: "请设置设计指标后查看电路。", en: "Set design targets to view the circuit." },

    /* Filter — report */
    "filter.report.title": { zh: "设计报告", en: "Design Report" },
    "filter.report.info":  { zh: "设计信息", en: "Design Information" },
    "filter.report.param": { zh: "参数", en: "Parameter" },
    "filter.report.value": { zh: "值", en: "Value" },
    "filter.report.date":  { zh: "报告日期", en: "Report Date" },
    "filter.report.formulas": { zh: "计算公式", en: "Calculation Formulas" }
  };

  /* ── Translation function ─── */
  function t(key, params) {
    var entry = D[key];
    if (!entry) return key;
    var str = entry[currentLang] || entry.zh || key;
    if (params) {
      Object.keys(params).forEach(function(k) {
        str = str.replace(new RegExp("\\{" + k + "\\}", "g"), params[k]);
      });
    }
    return str;
  }

  /* ── Get current language ─── */
  function getLang() { return currentLang; }

  /* ── Apply language to entire DOM ─── */
  function applyLang(lang) {
    currentLang = lang || "zh";
    document.documentElement.setAttribute("data-lang", currentLang);
    try { localStorage.setItem("hw-design-lang", currentLang); } catch(e) {}

    document.querySelectorAll("[data-i18n]").forEach(function(el) {
      var key = el.getAttribute("data-i18n");
      var entry = D[key];
      if (!entry) return;
      var val = entry[currentLang] || entry.zh;
      // Preserve child elements (e.g. info-icon spans) — only replace text nodes
      if (el.children.length > 0) {
        el.childNodes.forEach(function(node) {
          if (node.nodeType === Node.TEXT_NODE) node.textContent = val;
        });
        // If no text node exists, prepend one
        if (!Array.from(el.childNodes).some(function(n){return n.nodeType===Node.TEXT_NODE})) {
          el.insertBefore(document.createTextNode(val), el.firstChild);
        }
      } else {
        el.textContent = val;
      }
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function(el) {
      var key = el.getAttribute("data-i18n-html");
      var entry = D[key];
      if (entry) el.innerHTML = entry[currentLang] || entry.zh;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function(el) {
      var key = el.getAttribute("data-i18n-placeholder");
      var entry = D[key];
      if (entry) el.placeholder = entry[currentLang] || entry.zh;
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function(el) {
      var key = el.getAttribute("data-i18n-title");
      var entry = D[key];
      if (entry) el.title = entry[currentLang] || entry.zh;
    });
    document.querySelectorAll("[data-i18n-opts]").forEach(function(sel) {
      var mapping = sel.getAttribute("data-i18n-opts");
      try {
        var map = JSON.parse(mapping);
        Array.from(sel.options).forEach(function(opt) {
          if (map[opt.value]) {
            var entry = D[map[opt.value]];
            if (entry) opt.textContent = entry[currentLang] || entry.zh;
          }
        });
      } catch(e) {}
    });
    document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
    document.title = currentLang === "zh" ? "自动硬件设计工具" : "Auto Hardware Design Tool";
    // Refresh dynamically created content that uses _t() at creation time
    if (typeof refreshSegLabels === "function") { try { refreshSegLabels(); } catch(e) {} }
    if (typeof refreshNodeLabels === "function") { try { refreshNodeLabels(); } catch(e) {} }
    if (typeof calc === "function") { try { calc(); } catch(e) {} }
    if (typeof sCalc === "function") { try { sCalc(); } catch(e) {} }
    if (typeof pcbCalc === "function") { try { pcbCalc(); pcbCompare(); } catch(e) {} }
    if (typeof filterCalc === "function") { try { filterCalc(); } catch(e) {} }
  }

  /* ── Expose ─── */
  global._t = t;
  global._getLang = getLang;
  global._applyLang = applyLang;
  global._i18n = D;

})(window);
