/* ===== Capacitor Lifetime Calculator — UI Layer ===== */
/* Imports: window.CapacitorModel (models/capacitor-model.js)     */
/* Exposes: initCapacitor (called from app.js on tab switch)      */

(function (global) {
  "use strict";

  var CM = global.CapacitorModel;
  if (!CM) { console.error("CapacitorModel not loaded — load models/capacitor-model.js first"); return; }

  /* ── Helpers (UI-specific wrappers around model) ─── */
  function fv(v,d){return CM.fv(v,d)}

  var sid = 0;

  /* ── Segment markup ────────────────────── */
  function mU(){return '<span style="font-size:.7rem;color:#94a3b8;margin-left:2px">Hz</span>'}

  function mSeg(id,idx,dur,ta,vop,rips){
    var rr="";
    rips.forEach(function(v){
      // FIX Bug #1: support {freq,current} objects for per-row frequency (K_freq)
      var freq = typeof v === 'object' && v !== null ? (v.freq || 120) : 120;
      var cur  = typeof v === 'object' && v !== null ? (v.current || 0)   : v;
      rr+="<tr><td class=ripgroup><input class=fv type=number value="+freq+" style=width:55px oninput=calc()>" +mU()+ "</td>"
        +" <td><input class=fc type=number value=" +cur+" min=0 step=10 style=width:65px oninput=calc()><span style=\"font-size:.7rem;color:#94a3b8;margin-left:2px\">mA</span></td>"
        +" <td><button class=btn-sm onclick=removeRippleRow(this)>&times;</button></td></tr>";
    });
    return "<div class=seg data-id="+id+">"
      +"<div class=seg-head><span>时段"+(idx+1)+"</span><span style='font-size:.72rem;color:#94a3b8;font-weight:400'>每天 <span class=sh>"+dur+"</span> h</span>"
        +"<button class=btn-sm style=margin-left:auto;color:#ef4444;padding:1px 6px;font-size:.65rem onclick=rmSeg(this)>&times;删除</button></div>"
      +"<div class=seg-body>"
        +"<label>时长(h)：</label><input class=sd type=number value="+dur+" min=0 max=24 step=0.5 oninput=sdChange(this);calc()>"
        +"<label>环温(℃)：</label><input class=stp type=number value="+ta+" min=-40 max=150 oninput=calc()>"
        +"<label>电压(V)：</label><input class=sv type=number value="+vop+" min=0 step=1 oninput=calc()>"
      +"</div>"
      +"<table class=rt><thead><tr><th>频率(Hz)</th><th>电流(mA)</th><th></th></tr></thead>"
        +"<tbody class=rtb>"+rr+"</tbody></table>"
      +"<button class=btn-sm onclick=addRR(this)>+ 纹波分量</button>"
    +"</div>";
  }

  /* ── Segment ops (DOM-only) ─────────────── */
  function sdChange(inp){
    inp.closest(".seg").querySelector(".sh").textContent = parseFloat(inp.value)||0;
    updT();
  }

  function updT(){
    var t=0;
    document.querySelectorAll(".sd").forEach(function(i){t+=parseFloat(i.value)||0});
    document.getElementById("stt").textContent="合计: "+fv(t,1)+" / 24 h";
    var w=document.getElementById("stw");
    if(t>24){w.style.display="block";w.textContent="总时长 "+fv(t,1)+" h 超 24 h"}
    else if(t<24){w.style.display="block";w.textContent="剩余 "+fv(24-t,1)+" h 未定义(停机)"}
    else w.style.display="none";
  }

  function addSeg(){
    document.getElementById("sc").insertAdjacentHTML("beforeend", mSeg(sid++,0,8,50,30,[100]));
    updT(); calc();
  }

  function rmSeg(b){b.closest(".seg").remove();reNum();updT();calc()}

  function reNum(){
    document.querySelectorAll("#sc .seg").forEach(function(s,i){
      s.querySelector(".seg>:first-child>:first-child").textContent="时段"+(i+1);
    });
  }

  function addRR(b){
    b.closest(".seg").querySelector(".rtb").insertAdjacentHTML("beforeend",
      "<tr><td class=ripgroup><input class=fv type=number value=120 style=width:55px oninput=calc()>" +mU()+ "</td>"
        +"<td><input class=fc type=number value=50 min=0 step=10 style=width:65px oninput=calc()><span style=\"font-size:.7rem;color:#94a3b8;margin-left:2px\">mA</span></td>"
        +"<td><button class=btn-sm onclick=removeRippleRow(this)>&times;</button></td></tr>");
    calc();
  }

  function removeRippleRow(b){
    var tb=b.closest(".rtb");
    if(tb.querySelectorAll("tr").length<=1)return;
    b.closest("tr").remove();calc();
  }

  /* ── LaTeX helpers (UI-only) ─────────────── */
  function l2r(l){
    try{return l.replace(/\\times/g,"\u00D7")
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g,"($1)/($2)")
      .replace(/\\Delta/g,"\u0394").replace(/\\sum/g,"\u2211")
      .replace(/\\left/g,"").replace(/\\right/g,"")
      .replace(/\\text\{([^}]+)\}/g,"$1")
      .replace(/\\cdot/g,"\u00B7").replace(/\\,/g," ")
      .replace(/\^{([^}]+)}/g,"^($1)")
      .replace(/\^{([a-zA-Z0-9])}/g,"^$1")
      .replace(/_{([^}]+)}/g,"_$1")
      .replace(/{/g,"").replace(/}/g,"");
    }catch(e){return l}
  }

  function renderLatex(){
    try{document.querySelectorAll('.latex').forEach(function(e){
      try{var w=window;if(!w.katex){e.textContent=e.getAttribute('data-l');return}
        w.katex.render(e.getAttribute('data-l'),e,{throwOnError:false})}
      catch(er){}})
    }catch(er){}
  }

  /* ── Clamp helper (P1-4) ─────────────── */
  function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v))}

  /* ── Read params from DOM → call model → render results ─── */
  function calc(){
    var segs=document.querySelectorAll("#sc .seg");
    if(!segs.length){
      document.getElementById("lh").textContent="-";document.getElementById("ly").textContent="-";
      document.getElementById("ad").textContent="-";document.getElementById("wt").textContent="-";
      document.getElementById("wk").textContent="-";return;
    }

    var warns=[];
    function w(msg){warns.push(msg)}
    function cl(v,lo,hi,name){if(v<lo||v>hi){w(name+" "+fv(v,1)+" → 修正为"+name+" "+fv(Math.max(lo,Math.min(hi,v)),1));return Math.max(lo,Math.min(hi,v))}return v}

    // Read rated params from DOM
    var l0=+document.getElementById("l0").value||2e3,
        tmax=+document.getElementById("tmax").value||105,
        tau=+document.getElementById("tau").value||10,
        vrated=+document.getElementById("vrated").value||50,
        irated=+document.getElementById("irated").value||500,
        dt0=+document.getElementById("dt0").value||10,
        cooling=+document.getElementById("cooling").value||1,
        wd=+document.getElementById("workdays").value||365,
        wt=+document.getElementById("warrantyTarget").value||5,
        scenario=document.getElementById("scenario").value;

    // P1-4: Validate & clamp rated params
    l0  = cl(l0,500,100000,"L₀");
    tmax= cl(tmax,60,150,"T_max");
    tau = cl(tau,8,20,"τ");
    vrated = cl(vrated,1,1000,"V_rated");
    irated = cl(irated,10,50000,"I_rated");
    dt0  = cl(dt0,1,30,"ΔT₀");
    wd   = cl(wd,1,365,"工作日");
    wt   = cl(wt,0.5,50,"质保目标");

    // Build segments array for model
    var segments=[];
    segs.forEach(function(seg){
      var dur=+seg.querySelector(".sd").value||0,
          ta=+seg.querySelector(".stp").value||25,
          vop=+seg.querySelector(".sv").value||0,
          rips=[];
      seg.querySelectorAll(".rtb tr").forEach(function(row){
        var f=(+row.querySelector(".fv").value||120),
            iop=+row.querySelector(".fc").value||0;
        if(iop>0) rips.push({freq:f, current:iop});
      });
      // P1-4: Validate & clamp segment params
      dur = cl(dur,0.1,24,"时长");
      ta  = cl(ta,-40,150,"环温");
      vop = cl(vop,0,vrated*2,"电压");
      rips.forEach(function(r){r.current=cl(r.current,0,irated*3,"纹波电流")});
      segments.push({dur:dur, ta:ta, vop:vop, rips:rips});
    });

    // P1-4: Check total duration ≤24h
    var totDur=0;segments.forEach(function(s){totDur+=s.dur});
    if(totDur>24) w("总时长"+fv(totDur,1)+"h超24h，已修正");

    // P1-7: Error boundary — wrap model call in try/catch
    var result;
    try{
      result = CM.calcLifetime({l0:l0,tmax:tmax,tau:tau,vrated:vrated,irated:irated,dt0:dt0,cooling:cooling,wd:wd,wt:wt,scenario:scenario,segments:segments});
    }catch(e){
      var el=document.getElementById("capWarn");
      if(el){el.textContent="⚠ 计算错误: "+e.message;el.style.display="block"}
      console.error("CapacitorModel.calcLifetime error:",e);
      return;
    }
    if(!result) return;

    // P1-4: Show warnings if any clamping occurred
    (function(){var el=document.getElementById("capWarn");if(warns.length){el.textContent="⚠ "+warns.join("; ");el.style.display="block"}else{el.style.display="none"}})();

    // Render results to DOM
    document.getElementById("lh").textContent=result.lh>=1e6?fv(result.lh/1e4,1)+"万":fv(result.lh,0);
    document.getElementById("ly").textContent=fv(result.ly,1);
    document.getElementById("ad").textContent=fv(result.dmg*100,3);
    document.getElementById("wt").textContent=fv(result.wtHs,1);
    document.getElementById("wk").textContent=fv(result.wtKt,2);
    document.getElementById("wb").innerHTML="<span class=badge "+result.wc+">"+result.wsFull+"</span>";
    document.getElementById("wd").textContent=result.wd2;

    var mb=Math.max(wt*3,result.ly);
    document.getElementById("wf").style.width=Math.min(100,(result.ly/mb)*100)+"%";
    document.getElementById("wm").style.left=Math.min(100,(wt/mb)*100)+"%";
    document.getElementById("wf").style.background=result.margin>=result.req?"#10b981":result.margin>=result.req*0.7?"#f59e0b":"#ef4444";
    document.getElementById("wtl").textContent="目标: "+wt+"年";
    document.getElementById("wml").textContent=fv(mb,0)+"年";

    // Per-segment results table
    var tb="";result.sr.forEach(function(r){tb+="<tr><td>时段"+r.i+"</td><td>"+fv(r.dur,1)+"</td><td>"+fv(r.ths,1)+"</td><td>"+fv(r.kt,2)+"</td><td>"+fv(r.kv,3)+"</td><td>"+(r.Li>=1e6?fv(r.Li/1e4,1)+"万":fv(r.Li,0))+"</td><td>"+fv(r.d*100,3)+"%</td></tr>"});
    document.getElementById("srb").innerHTML=tb;



    // Store for report/export
    window._cd=result;
  }

  /* ── LaTeX → Unicode/HTML for Word export ─── */
  function latexToWord(src){return cvtLW(src);}
  function brkLW(s,p){var d=1,o='';while(p<s.length&&d>0){if(s[p]==='{'){d++;o+=s[p];}else if(s[p]==='}'){d--;if(!d)break;o+=s[p];}else o+=s[p];p++}return{c:o,e:p};}
  function cvtLW(s){var o='';var i=0;while(i<s.length){if(s[i]==='\\'){var j=i+1;while(j<s.length&&((s[j]>='a'&&s[j]<='z')||(s[j]>='A'&&s[j]<='Z')))j++;var w=s.slice(i,j);if(w==='\\frac' && s[j]==='{'){var r=brkLW(s,++j);i=r.e+1;var rn=cvtLW(r.c);r=brkLW(s,++i);i=r.e+1;var rd=cvtLW(r.c);o+='('+rn+')/('+rd+')';continue;}if(w==='\\text' && s[j]==='{'){var r=brkLW(s,++j);i=r.e+1;o+=r.c;continue;}if(w==='\\left'||w==='\
ight'){i=j;continue;}o+=(G_LW[w.slice(1)]||O_LW[w.slice(1)]||w.slice(1));i=j;continue;}if(s[i]==='^'||s[i]==='_'){i++;var tag=s[i-1]==='^'?'sup':'sub';if(s[i]==='{'){var r=brkLW(s,++i);i=r.e+1;o+='<'+tag+'>'+cvtLW(r.c)+'</'+tag+'>';}else{o+='<'+tag+'>'+cvtLW(s[i])+'</'+tag+'>';i++;}continue;}o+=s[i];i++}return o;}
  var G_LW={Delta:'Δ',alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',sigma:'σ',tau:'τ',mu:'μ',pi:'π',lambda:'λ',rho:'ρ',phi:'φ'};
  var O_LW={cdot:'·',times:'×',sum:'Σ',quad:'  ',circ:'°'};

  /* ── Formula rendering (uses model data) ─── */
  function calcFormulas(){
    var d=window._cd;if(!d||!d.sr||!d.sr.length)return '';
    var ir=d.irated;
    var fs='';
    fs+='<div class="rep-model-box">';
    fs+='<b>计算模型说明</b><br>';
    fs+='• <b>温度加速</b>：Arrhenius 模型 K_T = 2^((T_max - T_hs) / τ)，τ='+d.tau+'°C<br>';
    fs+='• <b>电压修正</b>：Nichicon 指数模型 K_V = exp[a·((V_r/V_op)^b - 1)]，a=0.56, b=1.0<br>';
    fs+='• <b>频率修正</b>：K_freq 查表法（铝电解电容 ESR-频率特性）<br>';
    fs+='• <b>累积损伤</b>：Miner 线性疲劳准则 D = Σ(t_i·N_days / L_i)<br>';
    fs+='• <b>EOL 判据</b>：容量下降 ≥20% 或 ESR ≥2× 初始值<br>';
    fs+='• 参考标准：Nichicon Technical Manual §"How to Calculate Life Time"<br></div>';
    d.sr.forEach(function(r){
      fs+='<p class="rep-section"><b>时段'+r.i+' — ① 温升计算</b></p>';
      if(r.rd&&r.rd.length){
        fs+='<p class="rep-formula">';
        fs+='<span class=latex data-l="\\Delta T_i = \\Delta T_0 \\times \\sum_j \\left(\\frac{I_{op,j}}{I_{rated} \\cdot K_{freq,j}}\\right)^2"></span></p>';
        /* Build substitution as single LaTeX string, then wrap in one span */
        var sub='';sub+=d.dt0+' \\times (';
        r.rd.forEach(function(x,j){if(j>0)sub+=' + ';sub+='\\left(\\frac{'+x.iop+'}{'+ir+' \\cdot '+x.k.toFixed(2)+'}\\right)^2'});
        sub+=')';
        fs+='<p class="rep-formula-sub">=';
        fs+='<span class=latex data-l="'+sub+'"></span></p>';
        fs+='<p class="rep-result">=';
        fs+='<span class=latex data-l="\\Delta T_'+r.i+' = '+r.dt.toFixed(2)+' \\text{°C}"></span></p>';
      } else {
        fs+='<p class="rep-formula-sub">无纹波输入, ΔT = 0°C</p>';
      }
      /* Ths line as single KaTeX span — no mixed HTML/LaTeX */
      fs+='<p class="rep-result">';
      fs+='<span class=latex data-l="T_{hs,'+r.i+'} = T_a + \\Delta T = '+r.ta.toFixed(1)+' + '+(r.dt>0?r.dt.toFixed(2):'0')+' = '+r.ths.toFixed(1)+'\\text{°C}"></span></p>';

      fs+='<p class="rep-section"><b>时段'+r.i+' — ② 寿命计算</b></p>';
      fs+='<p class="rep-formula">';
      fs+='<span class=latex data-l="L_i = L_0 \\cdot 2^{\\frac{T_{max} - T_{hs,i}}{' + d.tau + '}} \\cdot K_V"></span></p>';
      fs+='<p class="rep-formula-sub">=';
      fs+='<span class=latex data-l="L_'+r.i+' = '+d.l0+' \\cdot 2^{\\frac{'+d.tmax+' - '+r.ths.toFixed(1)+'}{' + d.tau + '}} \\cdot '+r.kv.toFixed(3)+'"></span></p>';
      fs+='<p class="rep-result">=';
      fs+='<span class=latex data-l="L_'+r.i+' = '+r.Li.toFixed(0)+' \\text{h}"></span></p>';
    });

    fs+='<p class="rep-section"><b>累计损伤 (Miner准则)</b></p>';
    fs+='<p class="rep-formula">';
    fs+='<span class=latex data-l="D = \\sum_i \\frac{t_i \\cdot N_{days}}{L_i}"></span></p>';
    /* Build Miner sum as single LaTeX string */
    var miner='';var ft=true;
    d.sr.forEach(function(r){if(!ft)miner+=' + ';ft=false;miner+='\\frac{'+r.dur.toFixed(1)+' \\cdot '+d.wd+'}{'+r.Li.toFixed(0)+'}'});
    fs+='<p class="rep-formula-sub">=';
    fs+='<span class=latex data-l="'+miner+'"></span></p>';
    fs+='<p class="rep-result">=';
    fs+='<span class=latex data-l="D = '+(d.dmg*100).toFixed(3)+'\\% / \\text{年}, \\quad \\text{寿命} = 1/'+d.dmg.toFixed(6)+' = '+d.ly.toFixed(1)+' \\text{年}"></span></p>';
    return fs;
  }
/* ── Report generation (DOM-only) ───────── */
  function genRep(){
    var d=window._cd;
    if(!d||!d.sr||!d.sr.length){
      document.getElementById("rc").innerHTML="<h3>电解电容寿命评估报告</h3><p>请先定义运行剖面</p>";
      setTimeout(renderLatex,200);return;
    }

    // Show export button after report generation
    var eg=document.getElementById('exportCapGroup');if(eg)eg.style.display='';

    var n=new Date(),ds=n.toLocaleDateString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit"}),ts=n.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
    var sr="";

    d.sr.forEach(function(r){
      var rd=r.rd.length?r.rd.map(function(x){return fv(x.iop,0)+" mA @ "+x.f+" Hz(K="+x.k.toFixed(2)+")"}).join(", "):"无纹波";
      sr+="<tr><td>时段"+r.i+"</td><td>"+fv(r.dur,1)+"</td><td>"+fv(r.ta,1)+"</td><td>"+fv(r.vop,1)+"</td>"
        +"<td>"+fv(r.dt,2)+"</td><td>"+fv(r.ths,1)+"</td><td>"+fv(r.kt,2)+"</td><td>"+fv(r.kv,3)+"</td>"
        +"<td>"+(r.Li>=1e6?fv(r.Li/1e4,1)+"万":fv(r.Li,0))+"</td><td>"+rd+"</td></tr>";
    });

    var pn=document.getElementById("projName").value||"-", cm=document.getElementById("capModel").value||"-";
    document.getElementById("rc").innerHTML=
      "<h3>1. 项目信息</h3><table class=\"data-tbl\"><thead><tr>"
        +"<th>项目名称</th><th>器件型号</th><th>应用场景</th><th>散热</th><th>年工作天数</th><th>质保期</th></tr></thead><tbody><tr>"
        +"<td>"+pn+"</td><td>"+cm+"</td><td>"+d.mi.l+"</td>"
        +"<td>"+document.getElementById("cooling").selectedOptions[0].text+"</td>"
        +"<td>"+d.wd+"</td><td>"+d.wt+"年</td></tr></tbody></table>"
      +"<h3>2. 额定参数</h3><table class=\"data-tbl\"><thead><tr>"
        +"<th>L<sub>0</sub></th><th>T<sub>max</sub></th><th>V<sub>rated</sub></th><th>I<sub>rated</sub></th><th>ΔT<sub>0</sub></th></tr></thead><tbody><tr>"
        +"<td>"+d.l0+" h</td><td>"+d.tmax+" °C</td><td>"+(d.vr||d.vrated)+" V</td>"
        +"<td>"+(d.ir||d.irated)+" mA</td><td>"+d.dt0+" °C</td></tr></tbody></table>"

      +"<h3>3. 运行剖面</h3><table class=\"data-tbl\"><thead><tr>"
        +"<th>时段</th><th>h/天</th><th>Ta C</th><th>Vop V</th><th>DT C</th><th>Ths C</th><th>KT</th><th>KV</th><th>Li h</th><th>纹波</th></tr></thead><tbody>"+sr+"</tbody></table>"
      +"<h3>4. 计算过程</h3>"+calcFormulas()

      +"<h3>5. 结论</h3><table class=\"data-tbl\"><thead><tr>"
        +"<th>年损伤 D</th><th>预计寿命</th><th>质保期</th><th>裕量</th><th>判定</th></tr></thead><tbody><tr>"
        +"<td>"+fv(d.dmg*100,3)+"%</td><td>"+fv(d.ly,1)+" 年</td><td>"+d.wt+" 年</td>"
        +"<td>"+fv(d.margin,2)+"x</td><td><strong>"+d.ws+"</strong></td></tr></tbody></table>"
      +"<div class=\"rep-footer\"><span>电解电容寿命计算器 v2.0</span><span>报告: "+ds+" "+ts+"</span></div>";

    setTimeout(renderLatex,200);
  }

  /* ── Export report (Word / PDF) ─────────── */
  function cExportReport(mode){
    if(mode==='pdf'){window.print();return}
    exportWord();
  }

  /* ── Word export (DOM-only) ─────────────── */
  function exportWord(){
    var d=window._cd;if(!d||!d.sr||!d.sr.length)return;
    var pn=document.getElementById('projName').value||'-',cm=document.getElementById('capModel').value||'-',te=[];if(pn&&pn!=='-')te.push(pn);if(cm&&cm!=='-')te.push(cm);
    var ts=te.length?' ('+te.join(' - ')+')':'',sr='';

    /* ── Shared CSS for Word (matches web report style) ─── */
    var css='<style>';
    css+='body{font-family:"Microsoft YaHei","Segoe UI",SimSun,sans-serif;font-size:10pt;color:#1e293b;line-height:1.6}';
    css+='table.data-tbl{border-collapse:collapse;width:100%;margin:10px 0;font-size:9pt}';
    css+='table.data-tbl th,table.data-tbl td{border:1px solid #d0d7e4;padding:6px 10px;text-align:center;vertical-align:middle}';
    css+='table.data-tbl thead th{background:#f1f5f9;font-weight:bold;color:#475569;font-size:8.5pt}';
    css+='table.data-tbl tbody tr:nth-child(even){background:#fafbfd}';
    css+='h2.title{text-align:center;font-size:16pt;margin-bottom:6px;color:#1e293b}';
    css+='h3{font-size:12pt;margin-top:18px;margin-bottom:6px;color:#475569;border-left:3px solid #2563eb;padding-left:8px}';
    css+='p.meta{text-align:center;font-size:8.5pt;color:#64748b;margin:2px 0}';
    css+='div.footer{margin-top:18px;padding-top:8px;border-top:1px solid #e2e8f0;text-align:center;font-size:8pt;color:#94a3b8}';
    css+='p.formula{font-family:"Cambria Math","Times New Roman",serif;font-size:10pt;margin:6px 0 6px 16px;color:#334155;line-height:1.7}';
    css+='div.model-box{background:#f0f9ff;border:1px solid #bae6fd;padding:8px 12px;margin-bottom:10px;font-size:8.5pt;color:#0c4a6e;line-height:1.6}';
    css+='table.compact{border-collapse:collapse;width:auto;margin:10px 0;font-size:9pt;display:inline-table}';
    css+='table.compact th,table.compact td{border:1px solid #d0d7e4;padding:5px 12px;text-align:center;vertical-align:middle}';
    css+='table.compact thead th{background:#f1f5f9;font-weight:bold;color:#475569;font-size:8.5pt}';
    css+='</style>';

    /* ── Run-profile rows (same data, styled for Word) ─── */
    d.sr.forEach(function(r){
      var rd=r.rd.length?r.rd.map(function(x){return x.iop+'mA @ '+x.f+'Hz (K='+x.k.toFixed(2)+')'}).join(', '):'无纹波';
      sr+='<tr><td>时段'+r.i+'</td><td>'+r.dur.toFixed(1)+'</td><td>'+r.ta.toFixed(1)+'</td><td>'+r.vop.toFixed(1)+'</td>'
        +'<td>'+r.dt.toFixed(2)+'</td><td>'+r.ths.toFixed(1)+'</td><td>'+r.kt.toFixed(2)+'</td><td>'+r.kv.toFixed(3)+'</td>'
        +'<td>'+(r.Li>=1e6?(r.Li/1e4).toFixed(1)+'万':r.Li.toFixed(0))+'</td><td>'+rd+'</td></tr>';
    });

    /* ── Formula rendering (convert LaTeX spans to plain text) ─── */
    var fh=calcFormulas();
    fh=fh.replace(/<span[^>]*class=latex[^>]*data-l="([^"]*)"[^>]*><\/span>/g,function(m,ltx){return latexToWord(ltx)});

    /* ── Conclusion data ─── */
    var margin=d.margin?d.margin.toFixed(2):'-';
    var ws=d.ws||'--';

    var h='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><title>电解电容寿命评估报告'+ts+'</title>';
    h+=css;
    h+='</head><body>';

    /* Title block */
    h+='<h2 class="title">电解电容寿命评估报告'+ts+'</h2>';
    var n=new Date(),ds=n.toLocaleDateString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit"});
    h+='<p class="meta">报告编号: EL-'+(new Date().toLocaleDateString('zh-CN').replace(/\//g,''))+'-'+(Math.floor(Math.random()*9000+1000))+'</p>';
    h+='<p class="meta">生成日期: '+ds+'</p>';

    /* 1. Project info */
    h+='<h3>1. 项目信息</h3>';
    h+='<table class="data-tbl"><thead><tr>'
      +'<th>项目名称</th><th>器件型号</th><th>应用场景</th><th>散热条件</th><th>年工作天数</th><th>质保期</th>'
      +'</tr></thead><tbody><tr>';
    h+='<td>'+pn+'</td><td>'+cm+'</td><td>'+d.mi.l+'</td>';
    h+='<td>'+document.getElementById("cooling").selectedOptions[0].text+'</td>';
    h+='<td>'+d.wd+'</td><td>'+d.wt+'年</td></tr></tbody></table>';

    /* 2. Rated parameters */
    h+='<h3>2. 额定参数</h3>';
    h+='<table class="compact"><thead><tr>'
      +'<th>L<sub>0</sub></th><th>T<sub>max</sub></th><th>V<sub>rated</sub></th><th>I<sub>rated</sub></th><th>ΔT<sub>0</sub></th><th>τ (Arrhenius)</th>'
      +'</tr></thead><tbody><tr>';
    h+='<td>'+d.l0+' h</td><td>'+d.tmax+' °C</td><td>'+(d.vr||d.vrated)+' V</td>';
    h+='<td>'+(d.ir||d.irated)+' mA</td><td>'+d.dt0+' °C</td><td>'+d.tau+' °C</td></tr></tbody></table>';

    /* 3. Run profile */
    h+='<h3>3. 运行剖面与寿命计算</h3>';
    h+='<table class="data-tbl"><thead><tr>'
      +'<th>时段</th><th>h/天</th><th>Ta °C</th><th>Vop V</th><th>ΔT °C</th><th>Ths °C</th><th>K<sub>T</sub></th><th>K<sub>V</sub></th>'
      +'<th>Li h</th><th>纹波电流</th>'
      +'</tr></thead><tbody>'+sr+'</tbody></table>';

    /* 4. Calculation process */
    h+='<h3>4. 计算过程</h3>';
    h+='<div class="model-box"><b>计算模型说明</b><br>'
      +'• <b>温度加速</b>: Arrhenius 模型 K<sub>T</sub> = 2^((T<sub>max</sub> - T<sub>hs</sub>) / τ), τ='+d.tau+'°C<br>'
      +'• <b>电压修正</b>: Nichicon 指数模型 K<sub>V</sub> = exp[a·((V<sub>r</sub>/V<sub>op</sub>)^b - 1)], a=0.56, b=1.0<br>'
      +'• <b>频率修正</b>: K<sub>freq</sub> 查表法（铝电解电容 ESR-频率特性）<br>'
      +'• <b>累积损伤</b>: Miner 线性疲劳准则 D = Σ(t<sub>i</sub>·N<sub>days</sub> / L<sub>i</sub>)<br>'
      +'• <b>EOL 判据</b>: 容量下降 ≥20% 或 ESR ≥2× 初始值<br>'
      +'• 参考标准: Nichicon Technical Manual §"How to Calculate Life Time"</div>';

    /* Convert formula divs/paragraphs to Word-friendly format */
    h+='<p class="formula">'+fh.replace(/<br\s*\/?>/g,'<br>').replace(/<\/?div[^>]*>/g,'').replace(/style="[^"]*"/g,'')+'</p>';

    /* 5. Conclusion */
    h+='<h3>5. 结论</h3>';
    h+='<table class="compact"><thead><tr>'
      +'<th>年损伤 D</th><th>预计寿命</th><th>质保期</th><th>裕量</th><th>判定</th>'
      +'</tr></thead><tbody><tr>';
    h+='<td>'+(d.dmg*100).toFixed(3)+'%</td><td>'+d.ly.toFixed(1)+' 年</td>';
    h+='<td>'+d.wt+' 年</td><td>'+margin+'x</td><td><b>'+ws+'</b></td></tr></tbody></table>';

    /* Footer */
    h+='<div class="footer">电解电容寿命计算器 v2.0 &nbsp;|&nbsp; 报告自动生成 '+ds+'</div>';
    h+='</body></html>';

    var b=new Blob([h],{type:'application/msword'});var dn='电解电容寿命评估报告'+(te.length?'('+te.join('-')+')':'')+'.doc';saveBlobWithDialog(b,dn);
  }

  /* ── Init ──────────────────────── */
  function initCapacitor(){
    document.getElementById("sc").insertAdjacentHTML("beforeend", mSeg(sid++,0,8,60,30,[250,150]));
    document.getElementById("sc").insertAdjacentHTML("beforeend", mSeg(sid++,1,16,40,30,[100]));
    document.getElementById("addSegBtn").onclick = addSeg;
    updT(); calc();
  }

  /* ── Load segments from defaults.json (called by app.js applyDefaults) ─── */
  function loadSegmentsFromDefaults(segments){
    if(!Array.isArray(segments)||!segments.length)return false;
    var sc=document.getElementById('sc');if(sc)sc.innerHTML='';
    segments.forEach(function(sg,idx){
      var r=sg.rips||[];

      var segId=sid++;
      sc.insertAdjacentHTML('beforeend',mSeg(segId,idx,sg.dur||8,sg.ta||60,sg.vop||30,r));
    });
    updT();calc();
    return true;
  }

  /* ── Expose to global scope (for inline handlers) ── */
  // Direct assignment — no eval() needed (all funcs in same scope)
  global.fv = fv; global.mU = mU; global.mSeg = mSeg; global.sdChange = sdChange;
  global.updT = updT; global.addSeg = addSeg; global.rmSeg = rmSeg; global.reNum = reNum;
  global.addRR = addRR; global.removeRippleRow = removeRippleRow; global.l2r = l2r;
  global.renderLatex = renderLatex; global.calc = calc; global.calcFormulas = calcFormulas;
  global.genRep = genRep; global.exportWord = exportWord; global.cExportReport = cExportReport;
  global.loadSegmentsFromDefaults = loadSegmentsFromDefaults;

  /* ── Wire static inputs via event delegation ─── */
  document.addEventListener('input', function(e){
    var t=e.target;
    if(t.id && ['l0','tmax','tau','vrated','irated','dt0','cap','workdays','warrantyTarget'].includes(t.id)){calc()}
  });
  document.addEventListener('change', function(e){
    var t=e.target;
    if(t.id && ['cooling','scenario'].includes(t.id)){calc()}
  });

  global.initCapacitor = initCapacitor;

})(window);
