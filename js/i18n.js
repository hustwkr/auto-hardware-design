/* ===== i18n Module — Language Switching (zh ↔ en) ===== */
(function(global) {
  "use strict";

  var currentLang = "zh";

  /* ── Translation dictionary ─── */
  var D = {
    /* Nav */
    "nav.capacitor":     { zh: "电解电容寿命计算", en: "Capacitor Lifetime" },
    "nav.safety":        { zh: "安规距离计算", en: "Safety Distance" },
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
    "cap.profile":       { zh: "运行剖面", en: "Mission Profile" },
    "cap.profile.hint":  { zh: "多段工况 + 多频率纹波叠加，总温升按各频率 (I/K_freq)² 平方和计算", en: "Multi-segment + multi-frequency ripple; total ΔT by sum-of-squares of (I/K_freq)² per frequency" },
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
    "cap.report.profile":{ zh: "运行剖面", en: "Mission Profile" },
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

    /* Capacitor — model description for report */
    "cap.modelDesc.temp":{ zh: "温度加速：Arrhenius 模型 K_T = 2^((T_max - T_hs) / τ)", en: "Temp Acceleration: Arrhenius K_T = 2^((T_max - T_hs) / τ)" },
    "cap.modelDesc.volt":{ zh: "电压修正：Nichicon 指数模型 K_V = exp[a·((V_r/V_op)^b - 1)]，a=0.56, b=1.0", en: "Voltage Correction: Nichicon K_V = exp[a·((V_r/V_op)^b - 1)], a=0.56, b=1.0" },
    "cap.modelDesc.freq":{ zh: "频率修正：K_freq 查表法（铝电解电容 ESR-频率特性）", en: "Frequency Correction: K_freq lookup (Al electrolytic ESR-frequency)" },
    "cap.modelDesc.dmg": { zh: "累积损伤：Miner 线性疲劳准则 D = Σ(t_i·N_days / L_i)", en: "Cumulative Damage: Miner D = Σ(t_i·N_days / L_i)" },
    "cap.modelDesc.eol": { zh: "EOL 判据：容量下降 ≥20% 或 ESR ≥2× 初始值", en: "EOL: Capacitance drop ≥20% or ESR ≥2× initial" },
    "cap.modelDesc.ref": { zh: "参考标准", en: "Reference" },

    /* Capacitor — model results (dynamically generated) */
    "cap.verdict.excellent":{ zh: "优秀", en: "Excellent" },
    "cap.verdict.pass":  { zh: "合格", en: "Pass" },
    "cap.verdict.marginal":{ zh: "边缘", en: "Marginal" },
    "cap.verdict.fail":  { zh: "不合格", en: "Fail" },

    /* Capacitor — warranty description templates */
    "cap.warranty.sufficient":{ zh: "质保期{wt}年,预计{ly}年,裕量充足", en: "Warranty {wt}yr, Est. {ly}yr, sufficient margin" },
    "cap.warranty.meets": { zh: "质保期{wt}年,预计{ly}年,满足要求", en: "Warranty {wt}yr, Est. {ly}yr, meets requirement" },
    "cap.warranty.edge":  { zh: "质保期{wt}年,预计{ly}年,建议增加裕量", en: "Warranty {wt}yr, Est. {ly}yr, consider more margin" },
    "cap.warranty.fail":  { zh: "质保期{wt}年,预计{ly}年,无法满足", en: "Warranty {wt}yr, Est. {ly}yr, cannot meet" },
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
    "safe.pd.hint.ul":   { zh: "UL §25.4a 固定 PD3", en: "UL §25.4a fixed PD3" },
    "safe.pd.ul.ro":     { zh: "PD 3 (UL 1741 §25.4a 强制)", en: "PD 3 (UL 1741 §25.4a mandatory)" },
    "safe.mg":           { zh: "材料组别 (CTI)", en: "Material Group (CTI)" },
    "safe.mg.hint.ul":   { zh: "UL §25.4d 固定 II 组", en: "UL §25.4d fixed Group II" },
    "safe.mg.ul.ro":     { zh: "II 组 (CTI >= 100, UL §25.4d)", en: "Group II (CTI >= 100, UL §25.4d)" },
    "safe.alt":          { zh: "海拔", en: "Altitude" },
    "safe.iso.title":    { zh: "隔离架构 (IEC 62109-1 §7.3.7)", en: "Isolation Architecture (IEC 62109-1 §7.3.7)" },
    "safe.iso.label":    { zh: "是否隔离", en: "Isolation" },
    "safe.iso.isolated": { zh: "有隔离", en: "Isolated" },
    "safe.iso.noniso":   { zh: "无隔离", en: "Non-isolated" },
    "safe.ovc.ac":       { zh: "AC侧过电压类别", en: "AC-side OVC" },
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
    "safe.chain.reqClr": { zh: "reqClearance", en: "reqClearance" },
    "safe.chain.reqCrp": { zh: "reqCreepage", en: "reqCreepage" },
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
    "cap.warranty.sufficient":{ zh: "质保期{wt}年,预计{ly}年,裕量充足", en: "Warranty {wt}yr, Est. {ly}yr, sufficient margin" },
    "cap.warranty.meets": { zh: "质保期{wt}年,预计{ly}年,满足要求", en: "Warranty {wt}yr, Est. {ly}yr, meets requirement" },
    "cap.warranty.edge":  { zh: "质保期{wt}年,预计{ly}年,建议增加裕量", en: "Warranty {wt}yr, Est. {ly}yr, consider more margin" },
    "cap.warranty.fail":  { zh: "质保期{wt}年,预计{ly}年,无法满足", en: "Warranty {wt}yr, Est. {ly}yr, cannot meet" },
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
    "safe.chain.ulTable":{ zh: "查UL 840表", en: "UL 840 table" },
    "safe.chain.iecTable":{ zh: "查IEC 60664-1表得基准值", en: "IEC 60664-1 table baseline" },
    "safe.chain.ulTableBase":{ zh: "查UL 840表得基准值", en: "UL 840 table baseline" },
    "safe.chain.iecTableBase":{ zh: "查IEC 60664-1表得基准值", en: "IEC 60664-1 table baseline" },
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
    "safe.msg.checkNode":{ zh: "请检查节点配置。", en: "Please check node configuration." }
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
    document.title = currentLang === "zh" ? "电解电容寿命计算工具" : "Capacitor Lifetime Calculator";
    // Refresh dynamically created content that uses _t() at creation time
    if (typeof refreshSegLabels === "function") { try { refreshSegLabels(); } catch(e) {} }
    if (typeof refreshNodeLabels === "function") { try { refreshNodeLabels(); } catch(e) {} }
    if (typeof calc === "function") { try { calc(); } catch(e) {} }
    if (typeof sCalc === "function") { try { sCalc(); } catch(e) {} }
  }

  /* ── Expose ─── */
  global._t = t;
  global._getLang = getLang;
  global._applyLang = applyLang;
  global._i18n = D;

})(window);
