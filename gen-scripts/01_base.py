import sys
sys.stdout.reconfigure(encoding="utf-8")

p = r"C:\Users\Lenovo\Documents\Codex\2026-06-02\webapp-testing\outputs\electrolytic-capacitor-lifetime.html"

# Start fresh
lines = []
lines.append('<!DOCTYPE html>')
lines.append('<html lang="zh-CN">')
lines.append('<head>')
lines.append('<meta charset="UTF-8">')
lines.append('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
lines.append('<title>电解电容寿命计算工具</title>')
lines.append('<style>')

# CSS
css = []
css.append('*{box-sizing:border-box;margin:0;padding:0}')
css.append('body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f7fa;color:#1e293b;padding:24px}')
css.append('.container{max-width:1480px;margin:0 auto}')
css.append('.layout{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}')
css.append('@media(max-width:960px){.layout{grid-template-columns:1fr}}')
css.append('.card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px 24px;margin-bottom:20px}')
css.append('.card h2{font-size:1rem;font-weight:600;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #e2e8f0}')
css.append('.fg{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px}')
css.append('.fg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 14px}')
css.append('.fgl{display:flex;flex-direction:column}')
css.append('.fgl.full{grid-column:1/-1}')
css.append('.fgl label{font-size:.78rem;font-weight:500;color:#64748b;margin-bottom:1px}')
css.append('.fgl input,.fgl select{padding:7px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:.88rem;background:#fff}')
css.append('.fgl input:focus,.fgl select:focus{border-color:#2563eb;outline:none;box-shadow:0 0 0 3px rgba(37,99,235,.15)}')
css.append('.hint{font-size:.72rem;color:#64748b;margin-top:1px}')
css.append('.seg{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 14px;margin-bottom:10px}')
css.append('.rt{width:100%;border-collapse:collapse;font-size:.8rem;margin-top:4px}')
css.append('.rt th,.rt td{text-align:left;padding:4px 6px;border:1px solid #e2e8f0}')
css.append('.rt th{background:#f1f5f9;font-weight:500;font-size:.76rem}')
css.append('.btn-sm{padding:2px 8px;border:1px solid #e2e8f0;border-radius:4px;background:#fff;cursor:pointer;font-size:.78rem}')
css.append('.btn-sm:hover{background:#f1f5f9}')
css.append('.result-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}')
css.append('.ri{padding:10px 12px;background:#f8fafc;border-radius:6px}')
css.append('.ri .rl{font-size:.73rem;color:#64748b}')
css.append('.ri .rv{font-size:1.15rem;font-weight:600;margin-top:1px}')
css.append('.sg-tbl{width:100%;border-collapse:collapse;font-size:.8rem}')
css.append('.sg-tbl th,.sg-tbl td{text-align:left;padding:4px 8px;border:1px solid #e2e8f0}')
css.append('.sg-tbl th{background:#f1f5f9;font-size:.76rem}')
css.append('.btn{padding:8px 16px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:pointer;font-size:.85rem}')
css.append('.btn-p{background:#2563eb;color:#fff;border-color:#2563eb}')
css.append('.badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:.78rem;font-weight:500}')
css.append('.badge.g{background:#d1fae5;color:#065f46}')
css.append('.badge.c{background:#fef3c7;color:#92400e}')
css.append('.badge.b{background:#fee2e2;color:#991b1b}')
css.append('.badge.p{background:#dbeafe;color:#1e40af}')
css.append('.wb{margin:10px 0;height:18px;background:#e2e8f0;border-radius:9px;overflow:hidden;position:relative}')
css.append('.wf{height:100%;border-radius:9px;transition:width .3s}')
css.append('.wm{position:absolute;top:0;height:100%;border-right:2px dashed #ef4444;z-index:2}')
css.append('#rc{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:24px 28px;font-size:.88rem}')
css.append('#rc h3{font-size:1.05rem;margin:16px 0 8px}')
css.append('#rc h3:first-child{margin-top:0}')
css.append('#rc table{width:100%;border-collapse:collapse;margin:8px 0}')
css.append('#rc th,#rc td{text-align:left;padding:6px 10px;border:1px solid #e2e8f0;font-size:.85rem}')
css.append('#rc th{background:#f8fafc;font-weight:600}')
css.append('@media print{body{padding:0;background:#fff}._np{display:none!important}.layout{display:block}.card{break-inside:avoid}}')

for c in css:
    lines.append(c)

lines.append('</style>')
lines.append('</head>')
lines.append('<body>')
lines.append('<div class="container">')

# HTML body
lines.append('<h1 style="font-size:1.6rem;margin-bottom:4px">电解电容寿命计算工具 <span style="font-size:.9rem;font-weight:400;color:#64748b">Electrolytic Capacitor Lifetime Calculator</span></h1>')
lines.append('<p style="color:#64748b;margin-bottom:24px;font-size:.9rem">Arrhenius + Miner 累积损伤 + 多段运行剖面 + 多频率纹波叠加 + 质保期判定</p>')
lines.append('<div class="layout">')
lines.append('<div>')

# Left column - rated params
lines.append('<div class="card"><h2>电容器额定参数</h2><div class="fg">')
lines.append('<div class="fgl"><label>额定寿命 L0 (h)</label><input type="number" id="l0" value="2000" min="100" step="100" oninput="calc()"><span class="hint">1000-10000 h</span></div>')
lines.append('<div class="fgl"><label>最高额定温度 Tmax (C)</label><input type="number" id="tmax" value="105" min="60" max="150" oninput="calc()"><span class="hint">85 / 105 / 125</span></div>')
lines.append('<div class="fgl"><label>额定电压 Vrated (V)</label><input type="number" id="vrated" value="50" min="1" step="1" oninput="calc()"></div>')
lines.append('<div class="fgl"><label>额定纹波电流 Irated (mA)</label><input type="number" id="irated" value="500" min="1" step="10" oninput="calc()"><span class="hint">@ 120Hz, Tmax</span></div>')
lines.append('<div class="fgl"><label>最大芯温升 DT0 (C)</label><input type="number" id="dt0" value="10" min="1" max="30" step="1" oninput="calc()"><span class="hint">标准10 / 长寿命5</span></div>')
lines.append('<div class="fgl"><label>标称电容量 (uF)</label><input type="number" id="cap" value="470" min="1" step="1" oninput="calc()"></div>')
lines.append('</div></div>')

# Left column - mission profile
lines.append('<div class="card"><h2>运行剖面 <span style="font-size:.78rem;font-weight:400;color:#64748b">(多段工况 + 多频率纹波)</span></h2>')
lines.append('<p style="font-size:.78rem;color:#64748b;margin-bottom:8px">各时段可添加多组不同频率纹波分量, 总温升按各频率 (I/K_freq)^2 平方和叠加</p>')
lines.append('<div id="sc"></div>')
lines.append('<button class="btn-sm" id="addSegBtn">+ 添加时段</button>')
lines.append('<span id="stt" style="font-size:.78rem;color:#64748b;margin-left:10px"></span>')
lines.append('<div id="stw" style="font-size:.78rem;color:#ef4444;margin-top:4px;display:none"></div>')

lines.append('<div class="fg" style="margin-top:14px;padding-top:12px;border-top:1px solid #e2e8f0">')
lines.append('<div class="fgl"><label>散热条件</label><select id="cooling" onchange="calc()"><option value="1.0" selected>自然对流</option><option value="1.15">强制风冷 (1-2 m/s)</option><option value="1.30">强制风冷 (>2 m/s)</option></select></div>')
lines.append('<div class="fgl"><label>年工作天数</label><input type="number" id="workdays" value="365" min="1" max="365" step="1" oninput="calc()"></div>')
lines.append('<div class="fgl"><label>目标质保期 (年)</label><input type="number" id="warrantyTarget" value="5" min="1" max="50" step="0.5" oninput="calc()"></div>')
lines.append('<div class="fgl"><label>应用场景</label><select id="scenario" onchange="calc()"><option value="consumer">消费电子 (1.3x)</option><option value="industrial" selected>工业设备 (1.5x)</option><option value="automotive">汽车电子 (2.0x)</option><option value="medical">医疗设备 (2.5x)</option></select></div>')
lines.append('</div></div>')
lines.append('</div>')

# Right column
lines.append('<div>')
lines.append('<div class="card"><h2>计算结果</h2><div class="result-grid">')
lines.append('<div class="ri"><div class="rl">预计总寿命</div><div class="rv"><span id="lh">-</span><span style="font-size:.78rem;color:#64748b;margin-left:3px">h</span></div></div>')
lines.append('<div class="ri"><div class="rl">预计服役年限</div><div class="rv"><span id="ly">-</span><span style="font-size:.78rem;color:#64748b;margin-left:3px">年</span></div></div>')
lines.append('<div class="ri"><div class="rl">质保期判定</div><div class="rv"><span id="wb">-</span></div></div>')
lines.append('<div class="ri"><div class="rl">年损伤率</div><div class="rv"><span id="ad">-</span><span style="font-size:.78rem;color:#64748b;margin-left:3px">%/年</span></div></div>')
lines.append('<div class="ri"><div class="rl">最恶劣时段芯温</div><div class="rv"><span id="wt">-</span><span style="font-size:.78rem;color:#64748b;margin-left:3px">C</span></div></div>')
lines.append('<div class="ri"><div class="rl">最恶劣时段 K_T</div><div class="rv"><span id="wk">-</span></div></div>')
lines.append('</div>')

# Warranty section
lines.append('<div style="margin-top:14px"><h3 style="font-size:.88rem;font-weight:600;margin-bottom:8px">质保期裕量</h3>')
lines.append('<div style="display:flex;justify-content:space-between;font-size:.82rem;color:#64748b"><span id="wd">-</span></div>')
lines.append('<div class="wb" style="margin-top:8px"><div class="wf" id="wf" style="width:0;background:#10b981"></div><div class="wm" id="wm" style="left:0"></div></div>')
lines.append('<div style="display:flex;justify-content:space-between;font-size:.72rem;color:#64748b"><span>0 年</span><span id="wtl">目标: - 年</span><span id="wml">-</span></div>')
lines.append('</div>')

# Segment results
lines.append('<div style="margin-top:14px"><h3 style="font-size:.88rem;font-weight:600;margin-bottom:6px">各时段寿命消耗</h3>')
lines.append('<table class="sg-tbl"><thead><tr><th>时段</th><th>h/天</th><th>芯温C</th><th>K_T</th><th>K_V</th><th>Li (h)</th><th>年损伤</th></tr></thead><tbody id="srb"></tbody></table>')
lines.append('</div></div>')

# Assessment
lines.append('<div class="card"><h2>寿命评估</h2><div id="ma" style="font-size:.88rem"><p>-</p></div></div>')
lines.append('</div></div>')

# Report section
lines.append('<div style="margin-top:24px">')
lines.append('<div class="_np" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">')
lines.append('<h2 style="font-size:1.1rem;font-weight:600">设计报告</h2>')
lines.append('<div style="display:flex;gap:8px">')
lines.append('<button class="btn" onclick="genRep()">刷新报告</button>')
lines.append('<button class="btn btn-p" onclick="window.print()">打印/导出 PDF</button>')
lines.append('</div></div>')
lines.append('<div id="rc"><h3>电解电容寿命评估报告</h3><p>请调整参数后刷新。</p></div>')
lines.append('</div></div>')

# ===== JAVASCRIPT =====
lines.append('<script>')

# Constants
lines.append('var FF={50:.85,60:.85,120:1,1e3:1.25,1e4:1.5,1e5:1.65},FO=[50,60,120,1e3,1e4,1e5];')
lines.append('var MG={consumer:{r:1.3,l:"消费电子"},industrial:{r:1.5,l:"工业设备"},automotive:{r:2,l:"汽车电子"},medical:{r:2.5,l:"医疗设备"}};')
lines.append('function fv(v,d){return typeof v!="number"||!isFinite(v)?"-":v.toFixed(d)}')
lines.append('function kvf(v,vr){if(vr<=0||v<=0)return 1;var r=v/vr;return r>=1?1:1+0.6*Math.pow(1-r,1.5)}')
lines.append('var sid=0;')

# Options HTML
lines.append('function mO(){return FO.map(function(f){return"<option value="+f+">"+f+" Hz</option>"}).join("")}')

# Segment HTML builder
lines.append('function mSeg(id,idx,dur,ta,vop,rips){')
lines.append('var rr="";')
lines.append('rips.forEach(function(v){rr+="<tr><td><select onchange=calc()>"+mO()+"</select></td><td><input type=number value="+v+" min=0 step=10 style=width:90px oninput=calc()></td><td><button class=btn-sm onclick=removeRippleRow(this)>X</button></td></tr>"});')
lines.append('return"<div class=seg data-id="+id+"><div><span>时段"+(idx+1)+"</span><span style=font-size:.78rem;color:#64748b> 每天 <span class=sh>"+dur+" h</span></span></div>"')
lines.append('+"<div class=fg3><div class=fgl><label>时长(h/天)</label><input class=sd type=number value="+dur+" min=0 max=24 step=0.5 oninput=sdChange(this);calc()></div>"')
lines.append('+"<div class=fgl><label>温度Ta(C)</label><input class=stp type=number value="+ta+" min=-40 max=150 oninput=calc()></div>"')
lines.append('+"<div class=fgl><label>电压Vop(V)</label><input class=sv type=number value="+vop+" min=0 step=1 oninput=calc()></div></div>"')
lines.append('+"<div class=fgl style=margin-top:6px><label>纹波电流分量</label><table class=rt><thead><tr><th>频率</th><th>电流(mA)</th><th></th></tr></thead><tbody class=rtb>"+rr+"</tbody></table>"')
lines.append('+"<button class=btn-sm style=margin-top:4px onclick=addRR(this)>+ 添加纹波分量</button></div>"')
lines.append('+"<button class=btn-sm style=margin-top:8px;color:#ef4444 onclick=rmSeg(this)>删除该时段</button></div>"}')

# Utility functions
lines.append('function sdChange(inp){inp.closest(".seg").querySelector(".sh").textContent=parseFloat(inp.value)||0;updT()}')
lines.append('function updT(){var t=0;document.querySelectorAll(".sd").forEach(function(i){t+=parseFloat(i.value)||0});document.getElementById("stt").textContent="合计: "+fv(t,1)+" / 24 h";var w=document.getElementById("stw");if(t>24){w.style.display="block";w.textContent="总时长 "+fv(t,1)+" h 超 24 h"}else if(t<24){w.style.display="block";w.textContent="剩余 "+fv(24-t,1)+" h 未定义(停机)"}else w.style.display="none"}')

# Segment CRUD
lines.append('function addSeg(){document.getElementById("sc").insertAdjacentHTML("beforeend",mSeg(sid++,0,8,50,30,[100]));updT();calc()}')
lines.append('function rmSeg(b){b.closest(".seg").remove();reNum();calc()}')
lines.append('function reNum(){document.querySelectorAll(".seg").forEach(function(s,i){s.querySelector(".seg>:first-child>:first-child").textContent="时段"+(i+1)})}')
lines.append('function addRR(b){b.closest(".seg").querySelector(".rtb").insertAdjacentHTML("beforeend","<tr><td><select onchange=calc()>"+mO()+"</select></td><td><input type=number value=50 min=0 step=10 style=width:90px oninput=calc()></td><td><button class=btn-sm onclick=removeRippleRow(this)>X</button></td></tr>");calc()}')
lines.append('function removeRippleRow(b){var tb=b.closest(".rtb");if(tb.querySelectorAll("tr").length<=1)return;b.closest("tr").remove();calc()}')

# Core calculation
lines.append('function calc(){')
lines.append('if(!document.querySelectorAll(".seg").length){document.getElementById("lh").textContent="-";document.getElementById("ly").textContent="-";document.getElementById("ad").textContent="-";document.getElementById("wt").textContent="-";document.getElementById("wk").textContent="-";return}')
lines.append('var l0=+document.getElementById("l0").value||2e3,tmax=+document.getElementById("tmax").value||105,vr=+document.getElementById("vrated").value||50,ir=+document.getElementById("irated").value||500,dt0=+document.getElementById("dt0").value||10,cl=+document.getElementById("cooling").value||1,wd=+document.getElementById("workdays").value||365,wt=+document.getElementById("warrantyTarget").value||5,sc=document.getElementById("scenario").value,mi=MG[sc]||MG.industrial,dmg=0,wtHs=-1/0,wtKt=1/0,sr=[];')
lines.append('document.querySelectorAll(".seg").forEach(function(seg,i){var dur=+seg.querySelector(".sd").value||0,ta=+seg.querySelector(".stp").value||25,vop=+seg.querySelector(".sv").value||0,sq=0,rd=[];seg.querySelectorAll(".rtb tr").forEach(function(row){var f=+row.querySelector("select").value||120,iop=+row.querySelector("input").value||0;if(iop<=0)return;var k=FF[f]||1,ec=iop/k,s=(ec/ir)*(ec/ir);sq+=s;rd.push({f:f,iop:iop,k:k,ec:ec,s:s})});var dt=Math.min(dt0*sq/cl,dt0*3),ths=ta+dt,kt=Math.pow(2,(tmax-ths)/10),kv=kvf(vop,vr),Li=l0*kt*kv,d=Li>0?dur*wd/Li:1/0;dmg+=d;if(ths>wtHs)wtHs=ths;if(kt<wtKt)wtKt=kt;sr.push({i:i+1,dur:dur,ta:ta,vop:vop,ths:ths,kt:kt,kv:kv,Li:Li,d:d,dt:dt,rd:rd})});')

lines.append('var ly=dmg>0?1/dmg:1/0,lh=ly*wd*Array.from(document.querySelectorAll(".seg")).reduce(function(s,seg){return s+(+seg.querySelector(".sd").value||0)},0),margin=ly/wt,req=mi.r,ws,wc,wd2;')
lines.append('if(margin>=req*1.2){ws="优秀("+fv(margin,1)+"x,需"+req+"x)";wc="g";wd2="质保期"+wt+"年,预计"+fv(ly,1)+"年,裕量充足"}')
lines.append('else if(margin>=req){ws="合格("+fv(margin,1)+"x,需"+req+"x)";wc="p";wd2="质保期"+wt+"年,预计"+fv(ly,1)+"年,满足要求"}')
lines.append('else if(margin>=req*0.7){ws="边缘("+fv(margin,1)+"x,需"+req+"x)";wc="c";wd2="质保期"+wt+"年,预计"+fv(ly,1)+"年,建议增加裕量"}')
lines.append('else{ws="不合格("+fv(margin,1)+"x,需"+req+"x)";wc="b";wd2="质保期"+wt+"年,预计"+fv(ly,1)+"年,无法满足"}')

lines.append('document.getElementById("lh").textContent=lh>=1e6?fv(lh/1e4,1)+"万":fv(lh,0);')
lines.append('document.getElementById("ly").textContent=fv(ly,1);')
lines.append('document.getElementById("ad").textContent=fv(dmg*100,3);')
lines.append('document.getElementById("wt").textContent=fv(wtHs,1);')
lines.append('document.getElementById("wk").textContent=fv(wtKt,2);')
lines.append('document.getElementById("wb").innerHTML="<span class=badge "+wc+">"+ws+"</span>";')
lines.append('document.getElementById("wd").textContent=wd2;')

lines.append('var mb=Math.max(wt*3,ly);')
lines.append('document.getElementById("wf").style.width=Math.min(100,(ly/mb)*100)+"%";')
lines.append('document.getElementById("wm").style.left=Math.min(100,(wt/mb)*100)+"%";')
lines.append('document.getElementById("wf").style.background=margin>=req?"#10b981":margin>=req*0.7?"#f59e0b":"#ef4444";')
lines.append('document.getElementById("wtl").textContent="目标: "+wt+"年";')
lines.append('document.getElementById("wml").textContent=fv(mb,0)+"年";')

# Segment results table
lines.append('var tb="";sr.forEach(function(r){tb+="<tr><td>时段"+r.i+"</td><td>"+fv(r.dur,1)+"</td><td>"+fv(r.ths,1)+"</td><td>"+fv(r.kt,2)+"</td><td>"+fv(r.kv,3)+"</td><td>"+(r.Li>=1e6?fv(r.Li/1e4,1)+"万":fv(r.Li,0))+"</td><td>"+fv(r.d*100,3)+"%</td></tr>"});document.getElementById("srb").innerHTML=tb;')

# Assessment chart
lines.append('var td=sr.reduce(function(s,r){return s+r.d},0)||1,ah="<p style=margin-bottom:6px><strong>寿命预测</strong></p><p style=font-size:.85rem>预计寿命: <strong>"+fv(ly,1)+" 年</strong></p><p style=font-size:.85rem>质保期: "+wt+"年 | "+mi.l+" | 裕量: <strong>"+fv(margin,2)+"x</strong> "+(margin>=req?"\u2713":"\u2717")+"</p><p style=font-size:.85rem;color:#64748b;margin-top:4px>"+wd2+"</p><p style=font-size:.85rem;margin-top:8px><strong>各时段寿命消耗占比</strong></p><div style=display:flex;gap:4px;margin-top:4px;align-items:flex-end;flex-wrap:wrap;min-height:50px>";')
lines.append('sr.forEach(function(r){var p=(r.d/td)*100,h=Math.max(20,p*2);ah+="<div style=display:flex;flex-direction:column;align-items:center;gap:2px><div style=width:32px;height:"+h+"px;background:#2563eb;border-radius:4px 4px 0 0;opacity:.75></div><span style=font-size:.68rem;color:#64748b>"+fv(p,0)+"%</span><span style=font-size:.62rem;color:#64748b>T"+r.i+"</span></div>"});ah+="</div>";document.getElementById("ma").innerHTML=ah;')

# Store data for report
lines.append('window._cd={l0:tmax,vr,ir,dt0,cl,wd,wt,sc,mi,sr,dmg,lh:mh||lh,ly,margin,ws,wd2,req};genRep()')
lines.append('}')

# Report generator
lines.append('function genRep(){')
lines.append('var d=window._cd;if(!d||!d.sr||!d.sr.length){document.getElementById("rc").innerHTML="<h3>电解电容寿命评估报告</h3><p>请先定义运行剖面</p>";return}')
lines.append('var n=new Date(),ds=n.toLocaleDateString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit"}),ts=n.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});')
lines.append('var rc=document.querySelectorAll(".rtb tr").length||0,sr="";')
lines.append('d.sr.forEach(function(r){var rd=r.rd.length?r.rd.map(function(x){return fv(x.iop,0)+" mA @ "+x.f+" Hz(K="+x.k.toFixed(2)+")"}).join(", "):"无纹波";sr+="<tr><td>时段"+r.i+"</td><td>"+fv(r.dur,1)+"</td><td>"+fv(r.ta,1)+"</td><td>"+fv(r.vop,1)+"</td><td>"+fv(r.dt,2)+"</td><td>"+fv(r.ths,1)+"</td><td>"+fv(r.kt,2)+"</td><td>"+fv(r.kv,3)+"</td><td>"+(r.Li>=1e6?fv(r.Li/1e4,1)+"万":fv(r.Li,0))+"</td><td>"+rd+"</td></tr>"});')
lines.append('document.getElementById("rc").innerHTML="<h3>1. 项目信息</h3><table><tr><th>项目</th><th>内容</th></tr><tr><td>报告编号</td><td>EL-"+ds.replace(/\//g,"")+"-"+(1e3+Math.floor(9e3*Math.random()))+"</td></tr><tr><td>生成日期</td><td>"+ds+" "+ts+"</td></tr><tr><td>应用场景</td><td>"+d.mi.l+"</td></tr><tr><td>散热</td><td>"+document.getElementById("cooling").selectedOptions[0].text+"</td></tr><tr><td>年工作天数</td><td>"+d.wd+"</td></tr><tr><td>质保期</td><td>"+d.wt+"年</td></tr><tr><td>时段数</td><td>"+d.sr.length+"</td></tr><tr><td>纹波分量</td><td>"+rc+"</td></tr></table>"')
lines.append('+"<h3>2. 额定参数</h3><table><tr><th>参数</th><th>数值</th></tr><tr><td>L0</td><td>"+d.l0+" h</td></tr><tr><td>Tmax</td><td>"+d.tmax+" C</td></tr><tr><td>Vrated</td><td>"+d.vr+" V</td></tr><tr><td>Irated</td><td>"+d.ir+" mA</td></tr><tr><td>DT0</td><td>"+d.dt0+" C</td></tr></table>"')
lines.append('+"<h3>3. 运行剖面</h3><table><tr><th>时段</th><th>h/天</th><th>Ta C</th><th>Vop V</th><th>DT C</th><th>Ths C</th><th>KT</th><th>KV</th><th>Li h</th><th>纹波</th></tr>"+sr+"</table>"')
lines.append('+"<h3>4. 累积损伤</h3><table><tr><th>项目</th><th>数值</th></tr><tr><td>年损伤 D</td><td>"+fv(d.dmg*100,3)+"%</td></tr><tr><td>预计寿命</td><td>"+fv(d.ly,1)+" 年</td></tr><tr><td>质保期</td><td>"+d.wt+" 年</td></tr><tr><td>裕量</td><td>"+fv(d.margin,2)+"x</td></tr><tr><td>判定</td><td><strong>"+d.ws+"</strong></td></tr></table>"')
lines.append('+"<p style=margin:8px 0;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px><strong>结论:</strong> "+d.wd2+"</p>"')
lines.append('+"<h3>5. 设计建议</h3><ul style=margin:4px 0 0 20px><li>温度每降10C寿命延长一倍</li><li>"+(d.margin>=d.req?"裕量满足":"裕量不足,需改善")+"</li><li>建议高温负载试验验证</li></ul>"')
lines.append('+"<div style=margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:.85rem;color:#64748b><span>电解电容寿命计算器 v2.0</span><span>报告: "+ds+" "+ts+"</span></div>"}')
lines.append('function init(){document.getElementById("sc").insertAdjacentHTML("beforeend",mSeg(sid++,0,8,60,30,[250,150]));document.getElementById("sc").insertAdjacentHTML("beforeend",mSeg(sid++,1,16,40,30,[100]));document.getElementById("addSegBtn").onclick=addSeg;updT();calc()}')
lines.append('window.addEventListener("DOMContentLoaded",init);')
lines.append('</script>')
lines.append('</body>')
lines.append('</html>')

with open(p, "w", encoding="utf-8") as f:
    for line in lines:
        f.write(line + "\n")

print(f"Written {len(lines)} lines, {sum(len(l)+1 for l in lines)} bytes")
