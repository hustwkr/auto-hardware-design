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
      rr+="<tr><td class=ripgroup><input class=fv type=number value=120 style=width:55px oninput=calc()>" +mU()+ "</td>"
        +"<td><input class=fc type=number value=" +v+ " min=0 step=10 style=width:65px oninput=calc()><span style=\"font-size:.7rem;color:#94a3b8;margin-left:2px\">mA</span></td>"
        +"<td><button class=btn-sm onclick=removeRippleRow(this)>&times;</button></td></tr>";
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

  function rmSeg(b){b.closest(".seg").remove();reNum();calc()}

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

  /* ── Read params from DOM → call model → render results ─── */
  function calc(){
    var segs=document.querySelectorAll("#sc .seg");
    if(!segs.length){
      document.getElementById("lh").textContent="-";document.getElementById("ly").textContent="-";
      document.getElementById("ad").textContent="-";document.getElementById("wt").textContent="-";
      document.getElementById("wk").textContent="-";return;
    }

    // Read rated params from DOM
    var l0=+document.getElementById("l0").value||2e3,
        tmax=+document.getElementById("tmax").value||105,
        vrated=+document.getElementById("vrated").value||50,
        irated=+document.getElementById("irated").value||500,
        dt0=+document.getElementById("dt0").value||10,
        cooling=+document.getElementById("cooling").value||1,
        wd=+document.getElementById("workdays").value||365,
        wt=+document.getElementById("warrantyTarget").value||5,
        scenario=document.getElementById("scenario").value;

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
      segments.push({dur:dur, ta:ta, vop:vop, rips:rips});
    });

    // Call pure model calculation
    var result = CM.calcLifetime({l0:l0,tmax:tmax,vrated:vrated,irated:irated,dt0:dt0,cooling:cooling,wd:wd,wt:wt,scenario:scenario,segments:segments});
    if(!result) return;

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

    // Summary bar chart
    var td=result.sr.reduce(function(s,r){return s+r.d},0)||1,
        ah="<p style=margin-bottom:4px><strong>寿命预测</strong></p>"
      +"<p style=font-size:.82rem>预计寿命: <strong>"+fv(result.ly,1)+" 年</strong></p>"
      +"<p style=font-size:.82rem>质保期: "+wt+"年 | "+result.mi.l+" | 裕量: <strong>"+fv(result.margin,2)+"x</strong> "+(result.margin>=result.req?"✓":"✗")+"</p>"
      +"<p style=font-size:.82rem;color:#64748b;margin-top:3px>"+result.wd2+"</p>"
      +"<p style=font-size:.82rem;margin-top:6px><strong>各时段寿命消耗占比</strong></p>"
      +"<div style=display:flex;gap:3px;margin-top:3px;align-items:flex-end;flex-wrap:wrap;min-height:40px>";
    result.sr.forEach(function(r){var p=(r.d/td)*100,h=Math.max(16,p*2);ah+="<div style=display:flex;flex-direction:column;align-items:center;gap:1px><div style=width:28px;height:"+h+"px;background:#2563eb;border-radius:3px 3px 0 0;opacity:.75></div><span style=font-size:.64rem;color:#64748b>"+fv(p,0)+"%</span><span style=font-size:.6rem;color:#64748b>T"+r.i+"</span></div>"});
    ah+="</div>";
    document.getElementById("ma").innerHTML=ah;

    // Store for report/export
    window._cd=result;
    genRep();
  }

  /* ── Formula rendering (uses model data) ─── */
  function calcFormulas(){
    var d=window._cd;if(!d||!d.sr||!d.sr.length)return '';
    var fs='';
    d.sr.forEach(function(r){
      fs+='<p style=margin:3px 0><b>时段'+r.i+':</b> <span class=latex data-l="L_i = L_0 \\times 2^{\\frac{T_{max} - T_{hs_i}}{10}} \\times K_V"></span>'
        +' = <span class=latex data-l="'+d.l0+' \\times 2^{\\frac{('+d.tmax+'-'+r.ths.toFixed(1)+')}{10}} \\times '+r.kv.toFixed(3)+'"></span>'
        +' = <span class=latex data-l="'+r.Li.toFixed(0)+'\\,\\text{h}"></span></p>';
      if(r.rd&&r.rd.length){
        fs+='<p style=margin:2px 0 3px 16px;font-size:.8rem;color:#555>';
        r.rd.forEach(function(x,i){if(i>0)fs+=' + ';fs+=x.iop+'mA@'+x.f+'Hz(K='+x.k.toFixed(2)+')'});
        fs+='<br><span class=latex data-l="\\Delta T = \\Delta T_0 \\times \\sum_j \\left(\\frac{I_j}{I_{rated} \\times K_{freq_j}}\\right)^2 / C"></span> = '+r.dt.toFixed(2)+'C, <span class=latex data-l="T_{hs}='+r.ths.toFixed(1)+ '\\text{°C}"></span></p>';
      }
    });
    fs+='<p style=margin:3px 0><b>累计:</b> <span class=latex data-l="D = \\sum_i \\frac{t_i \\times days}{L_i}"></span> = ';
    var ft=true;
    d.sr.forEach(function(r){if(!ft)fs+=' + ';ft=false;fs+=r.dur.toFixed(1)+'x'+d.wd+'/'+r.Li.toFixed(0)});
    fs+=' = '+(d.dmg*100).toFixed(3)+'%/年, 寿命 = 1/('+d.dmg.toFixed(6)+') = '+d.ly.toFixed(1)+'年</p>';
    return fs;
  }

  /* ── Report generation (DOM-only) ───────── */
  function genRep(){
    var d=window._cd;
    if(!d||!d.sr||!d.sr.length){
      document.getElementById("rc").innerHTML="<h3>电解电容寿命评估报告</h3><p>请先定义运行剖面</p>";
      setTimeout(renderLatex,200);return;
    }

    var n=new Date(),ds=n.toLocaleDateString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit"}),ts=n.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
    var rc=document.querySelectorAll(".rtb tr").length||0,sr="";

    d.sr.forEach(function(r){
      var rd=r.rd.length?r.rd.map(function(x){return fv(x.iop,0)+" mA @ "+x.f+" Hz(K="+x.k.toFixed(2)+")"}).join(", "):"无纹波";
      sr+="<tr><td>时段"+r.i+"</td><td>"+fv(r.dur,1)+"</td><td>"+fv(r.ta,1)+"</td><td>"+fv(r.vop,1)+"</td>"
        +"<td>"+fv(r.dt,2)+"</td><td>"+fv(r.ths,1)+"</td><td>"+fv(r.kt,2)+"</td><td>"+fv(r.kv,3)+"</td>"
        +"<td>"+(r.Li>=1e6?fv(r.Li/1e4,1)+"万":fv(r.Li,0))+"</td><td>"+rd+"</td></tr>";
    });

    document.getElementById("rc").innerHTML=
      "<h3>1. 项目信息</h3><table><tr><th>项目</th><th>内容</th></tr>"
        +"<tr><td>报告编号</td><td>EL-"+ds.replace(/\//g,"")+"-" +(1e3+Math.floor(9e3*Math.random()))+"</td></tr>"
        +"<tr><td>生成日期</td><td>"+ds+" "+ts+"</td></tr>"
        +"<tr><td>应用场景</td><td>"+d.mi.l+"</td></tr>"
        +"<tr><td>散热</td><td>"+document.getElementById("cooling").selectedOptions[0].text+"</td></tr>"
        +"<tr><td>年工作天数</td><td>"+d.wd+"</td></tr>"
        +"<tr><td>质保期</td><td>"+d.wt+"年</td></tr>"
        +"<tr><td>时段数</td><td>"+d.sr.length+"</td></tr>"
        +"<tr><td>纹波分量</td><td>"+rc+"</td></tr></table>"
      +"<h3>2. 额定参数</h3><table><tr><th>参数</th><th>数值</th></tr>"
        +"<tr><td>L0</td><td>"+d.l0+" h</td></tr>"
        +"<tr><td>Tmax</td><td>"+d.tmax+" C</td></tr>"
        +"<tr><td>Vrated</td><td>"+(d.vr||d.vrated)+" V</td></tr>"
        +"<tr><td>Irated</td><td>"+(d.ir||d.irated)+" mA</td></tr>"
        +"<tr><td>DT0</td><td>"+d.dt0+" C</td></tr></table>"
      +"<h3>3. 运行剖面</h3><table><tr><th>时段</th><th>h/天</th><th>Ta C</th><th>Vop V</th><th>DT C</th><th>Ths C</th><th>KT</th><th>KV</th><th>Li h</th><th>纹波</th></tr>"+sr+"</table>"
      +"<h3>4. 累积损伤</h3><table><tr><th>项目</th><th>数值</th></tr>"
        +"<tr><td>年损伤 D</td><td>"+fv(d.dmg*100,3)+"%</td></tr>"
        +"<tr><td>预计寿命</td><td>"+fv(d.ly,1)+" 年</td></tr>"
        +"<tr><td>质保期</td><td>"+d.wt+" 年</td></tr>"
        +"<tr><td>裕量</td><td>"+fv(d.margin,2)+"x</td></tr>"
        +"<tr><td>判定</td><td><strong>"+d.ws+"</strong></td></tr></table>"
      +"<p style=margin:6px 0;padding:6px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px><strong>结论:</strong> "+d.wd2+"</p>"
      +calcFormulas()
      +"<h3>6. 设计建议</h3><ul style=margin:3px 0 0 18px>"
        +"<li>温度每降10C寿命延长一倍</li>"
        +"<li>"+(d.margin>=d.req?"裕量满足":"裕量不足,需改善")+"</li>"
        +"<li>建议高温负载试验验证</li></ul>"
      +"<div style=margin-top:14px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:.8rem;color:#64748b>"
        +"<span>电解电容寿命计算器 v2.0</span><span>报告: "+ds+" "+ts+"</span></div>";

    setTimeout(renderLatex,200);
  }

  /* ── Word export (DOM-only) ─────────────── */
  function exportWord(){
    var d=window._cd;if(!d||!d.sr||!d.sr.length)return;
    var pn=document.getElementById('projName').value,cm=document.getElementById('capModel').value,te=[];if(pn)te.push(pn);if(cm)te.push(cm);
    var ts=te.length?' ('+te.join(' - ')+')':'',sr='';
    d.sr.forEach(function(r){var rd=r.rd.length?r.rd.map(function(x){return x.iop+'mA@'+x.f+'Hz'}).join(', '):'\u65e0';sr+='<tr><td>\u65f6\u6bb5'+r.i+'</td><td>'+r.dur.toFixed(1)+'</td><td>'+r.ta.toFixed(1)+'</td><td>'+r.vop.toFixed(1)+'</td><td>'+r.dt.toFixed(2)+'</td><td>'+r.ths.toFixed(1)+'</td><td>'+r.kt.toFixed(2)+'</td><td>'+r.kv.toFixed(3)+'</td><td>'+r.Li.toFixed(0)+'</td><td>'+rd+'</td></tr>'});
    var fh=calcFormulas();fh=fh.replace(/<span class=latex data-l="([^"]*)"><\/span>/g,'$1');
    var lh=d.lh>=1e6?(d.lh/1e4).toFixed(1)+'\u4e07':d.lh.toFixed(0);
    var h='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><title>\u7535\u89e3\u7535\u5bb9\u5bff\u547d\u8bc4\u4f30\u62a5\u544a'+ts+'</title><style>body{font-family:SimSun,serif;font-size:11pt}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #000;padding:3px 6px;font-size:10pt}th{background:#eee}h2{font-size:13pt;margin-top:14px}</style></head><body>';
    h+='<h2 style="text-align:center">\u7535\u89e3\u7535\u5bb9\u5bff\u547d\u8bc4\u4f30\u62a5\u544a'+ts+'</h2>';
    h+='<p>\u62a5\u544a\u7f16\u53f7: EL-'+(new Date().toLocaleDateString('zh-CN').replace(/\//g,''))+'-'+(Math.floor(Math.random()*9000+1000))+'</p>';
    h+='<p>\u751f\u6210\u65e5\u671f: '+new Date().toLocaleDateString('zh-CN')+'</p>';
    h+='<h2>1. \u9879\u76ee\u4fe1\u606f</h2><table><tr><th>\u9879\u76ee</th><th>\u5185\u5bb9</th></tr>'+(pn?'<tr><td>\u9879\u76ee\u540d\u79f0</td><td>'+pn+'</td></tr>':'')+(cm?'<tr><td>\u7535\u5bb9\u578b\u53f7</td><td>'+cm+'</td></tr>':'')+'<tr><td>\u5e94\u7528\u573a\u666f</td><td>'+d.mi.l+'</td></tr><tr><td>\u6563\u70ed\u6761\u4ef6</td><td>'+document.getElementById("cooling").selectedOptions[0].text+'</td></tr><tr><td>\u5de5\u4f5c\u5929\u6570</td><td>'+d.wd+'</td></tr><tr><td>\u8d28\u4fdd\u671f</td><td>'+d.wt+'\u5e74</td></tr></table>';
    h+='<h2>2. \\u989d\\u5b9a\\u53c2\\u6570</h2><table><tr><th>\\u53c2\\u6570</th><th>\\u6570\\u503c</th></tr><tr><td>L0</td><td>'+d.l0+' h</td></tr><tr><td>Tmax</td><td>'+d.tmax+' C</td></tr><tr><td>Vrated</td><td>'+(d.vr||d.vrated)+' V</td></tr><tr><td>Irated</td><td>'+(d.ir||d.irated)+' mA</td></tr><tr><td>DT0</td><td>'+d.dt0+' C</td></tr></table>';
    h+='<h2>3. \u8fd0\u884c\u7ed3\u679c</h2><table><tr><th>\u65f6\u6bb5</th><th>h/\u5929</th><th>Ta C</th><th>Vop V</th><th>\u0394T C</th><th>Ths C</th><th>K_T</th><th>K_V</th><th>Li h</th><th>\u7eb9\u6ce2</th></tr>'+sr+'</table>';
    h+='<h2>4. \u8bc4\u4f30</h2><table><tr><th>\u9879\u76ee</th><th>\u503c</th></tr><tr><td>\u5e74\u635f\u4f24</td><td>'+(d.dmg*100).toFixed(3)+'%</td></tr><tr><td>\u9884\u8ba1\u5bff\u547d</td><td>'+lh+' h / '+fv(d.ly,1)+' \u5e74</td></tr><tr><td>\u6807\u51c6\u8981\u6c42</td><td>'+d.req+'x ('+d.mi.l+')</td></tr><tr><td>\u8fbe\u6807\u500d\u6570</td><td>'+fv(d.margin,2)+'x</td></tr><tr><td>\u5224\u5b9a</td><td><strong>'+d.ws+'</strong></td></tr></table>';
    h+='<p style="margin-top:16px">'+fh+'</p>';
    h+='<h2>5. \u8bbe\u8ba1\u5efa\u8bae</h2><ul><li>\u6e29\u5ea6\u6bcf\u964d10C\uff0c\u5bff\u547d\u5ef6\u957f\u4e00\u500d</li><li>'+(d.margin>=d.req?' \u8d28\u4fdd\u671f\u9884\u91cf\u6ee1\u8db3':'\u8d28\u4fdd\u671f\u9884\u91cf\u4e0d\u8db3\uff0c\u5efa\u8bae\u964d\u4f4e\u6838\u6e29\u6216\u63d2\u6362\u66f4\u9ad8\u7ea7\u7535\u5bb9')+'</li><li>\u5efa\u8bae\u8fdb\u884c\u9ad8\u6e29\u8d1f\u8f7d\u8bd5\u9a8c\u9a8c\u8bc1</li></ul>';
    h+='<p style="margin-top:20px"><i>\u7535\u89e3\u7535\u5bb9\u5bff\u547d\u8ba1\u7b97\u5668 v2.0 - \u62a5\u544a\u81ea\u52a8\u751f\u6210</i></p></body></html>';
    var b=new Blob([h],{type:'application/msword'});var dn='\u7535\u89e3\u7535\u5bb9\u5bff\u547d\u8bc4\u4f30\u62a5\u544a'+(te.length?'('+te.join('-')+')':'')+'.doc';saveBlobWithDialog(b,dn);
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
      if(r.length&&typeof r[0]==='object')r=r.map(function(v){return v.current||0});
      sc.insertAdjacentHTML('beforeend',mSeg(sid++,idx,sg.dur||8,sg.ta||60,sg.vop||30,r));
    });
    updT();calc();
    return true;
  }

  /* ── Expose to global scope (for inline handlers) ── */
  var expose = [
    'fv','mU','mSeg','sdChange','updT','addSeg','rmSeg','reNum',
    'addRR','removeRippleRow','l2r','renderLatex','calc','calcFormulas',
    'genRep','exportWord','loadSegmentsFromDefaults'
  ];
  expose.forEach(function(n){global[n] = global[n] || eval('('+n+')')});

  /* ── Wire static inputs via event delegation ─── */
  document.addEventListener('input', function(e){
    var t=e.target;
    if(t.id && ['l0','tmax','vrated','irated','dt0','cap','workdays','warrantyTarget'].includes(t.id)){calc()}
  });
  document.addEventListener('change', function(e){
    var t=e.target;
    if(t.id && ['cooling','scenario'].includes(t.id)){calc()}
  });

  global.initCapacitor = initCapacitor;

})(window);
