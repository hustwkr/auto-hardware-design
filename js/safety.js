/* ===== Safety Distance Calculator — UI Layer ===== */
/* Imports: window.SafetyModel (models/safety-model.js)           */
/* Exposes: initSafety (called from app.js on first tab click)    */

(function (global) {
  "use strict";

  var SM = global.SafetyModel;
  if (!SM) { console.error("SafetyModel not loaded — load models/safety-model.js first"); return; }

  var snid = 0;

  /* ── Node markup (DOM-only) ─────────────── */
  function mNode(id,idx,name,vrms,ins,pcb,coat,interp,circ){
    ins=ins||'basic';pcb=pcb||0;coat=coat||0;interp=interp||false;circ=circ||'ac';
    var io='<option value="func" '+(ins=='func'?'selected':'')+'>功能绝缘</option><option value="basic" '+(ins=='basic'?'selected':'')+'>基本绝缘</option><option value="supp" '+(ins=='supp'?'selected':'')+'>附加绝缘</option><option value="reinf" '+(ins=='reinf'?'selected':'')+'>加强绝缘</option>';
    var po='<option value="0" '+(pcb==0?'selected':'')+'>否(接线端子)</option><option value="1" '+(pcb==1?'selected':'')+'>是(PCB走线)</option>';
    var co='<option value="0" '+(coat==0?'selected':'')+'>否</option><option value="1" '+(coat==1?'selected':'')+'>Type 1 (降低PD)</option><option value="2" '+(coat==2?'selected':'')+'>Type 2/灌封 (取消爬电)</option>';
    return '<tr class="seg" data-id='+id+'>'
      +'<td style="text-align:center;color:#94a3b8;font-size:.72rem">'+(idx+1)+'</td>'
      +'<td><input class=sname type=text value="'+name+'" style="width:80px;border:1px solid #e2e8f0;border-radius:3px;padding:2px 4px;font-size:.78rem" oninput=sNChange(this);sCalc()></td>'
      +'<td><input class=svrms type=number value='+vrms+' min=0 step=10 style="width:65px;border:1px solid #e2e8f0;border-radius:3px;padding:2px 4px;font-size:.78rem" oninput=sCalc()></td>'
      +'<td><select class=sins onchange=sCalc() style="font-size:.78rem;padding:2px;border:1px solid #e2e8f0;border-radius:3px">'+io+'</select></td>'
      +'<td><select class=spcb onchange=sCalc() style="font-size:.78rem;padding:2px;border:1px solid #e2e8f0;border-radius:3px">'+po+'</select></td>'
      +'<td><select class=scoat onchange=sCalc() style="font-size:.78rem;padding:2px;border:1px solid #e2e8f0;border-radius:3px">'+co+'</select></td>'
      +'<td><select class=scirc onchange=sCalc() style="font-size:.78rem;padding:2px;border:1px solid #e2e8f0;border-radius:3px"><option value=ac '+(circ=='ac'?'selected':'')+'>AC</option><option value=dc '+(circ=='dc'?'selected':'')+'>DC(PV)</option></select></td>'
      +'<td style="text-align:center;white-space:nowrap"><button class="btn-sm" style="color:#ef4444;padding:1px 6px" onclick=sRmNode(this)>✕</button></td>'
      +'</tr>';
  }

  function sNChange(inp){} // Name displayed directly in input

  function sAddNode(){
    document.getElementById("sN").insertAdjacentHTML("beforeend", mNode(snid++,0,"L-N",230,"basic",0,0,false,"ac"));
    var btn=document.getElementById("addNodeBtn");if(btn)btn.onclick=sAddNode;
    sCalc();
  }

  function sRmNode(b){b.closest(".seg").remove();sReNum();sCalc();}

  function sReNum(){
    document.querySelectorAll("#sN .seg").forEach(function(s,i){s.cells[0].textContent=i+1;});
  }

  /* ── Read params from DOM → call model → render results ─── */
  function sCalc(){
    var nodes=document.querySelectorAll("#sN .seg");
    document.getElementById("sNc").textContent=nodes.length;
    if(!nodes.length){
      document.getElementById("sRtb").innerHTML="";
      document.getElementById("sMa").innerHTML="<p>请添加测量节点。</p>";
      return;
    }

    // Read global params from DOM
    var pd  = +document.getElementById("sPd").value||2;
    var mg  = document.getElementById("sMg").value||"ii";
    var alt = +document.getElementById("sAlt").value||2000;
    var std = document.getElementById("sStd").value||"iec";
    var ovc_AC = {i:1,ii:2,iii:3,iv:4}[document.getElementById('sOvc_AC').value||'ii'] || 2;
    var ovc_DC = {i:1,ii:2,iii:3,iv:4}[document.getElementById('sOvc_DC').value||'ii'] || 2;
    var sysVAC = +document.getElementById('sSysV_AC').value || 300;
    var sysVDC = +document.getElementById('sSysV_DC').value || 600;

    // Compute TOV (Temporary Overvoltage) per IEC 62109-1 Table 12
    function tovFor(ovcNum, v){
      // Base lookup: OVC → impulse voltage for given system voltage range
      var tbl = {
        1: {[50]:6,[100]:8,[130]:12,[240]:17,[300]:22,[400]:26,[500]:34,[690]:42},
        2: {[50]:8,[100]:12,[130]:17,[240]:22,[300]:26,[400]:34,[500]:42,[690]:50},
        3: {[50]:12,[100]:17,[130]:22,[240]:26,[300]:34,[400]:42,[500]:50,[690]:60},
        4: {[50]:17,[100]:22,[130]:26,[240]:34,[300]:42,[400]:50,[500]:60,[690]:80}
      };
      var t = tbl[ovcNum] || tbl[2];
      // Find the nearest voltage bracket (round up)
      var keys = Object.keys(t).map(Number).sort(function(a,b){return a-b});
      for(var i=0;i<keys.length;i++){ if(v<=keys[i]) return t[keys[i]]; }
      return t[keys[keys.length-1]] || 50; // cap at max bracket
    }

    var tovAC = tovFor(ovc_AC, sysVAC);
    var tovDC = tovFor(ovc_DC, sysVDC);

    // Display impulse voltage info in #sImpulseInfo
    (function(){
      var el = document.getElementById("sImpulseInfo");
      if(!el) return;
      el.style.display = "block";
      var ovcLabel = function(n){return {1:'I',2:'II',3:'III',4:'IV'}[n]||'II';};
      el.innerHTML =
        '<div style="display:flex;gap:16px;flex-wrap:wrap;padding:8px 12px;background:#f0f4ff;border-radius:6px">' +
        '<div><span style="font-weight:600;color:#1e293b">AC侧冲击电压:</span> ' +
        '<span style="color:#2563eb;font-weight:700;font-size:.95rem">'+tovAC+' kV</span> ' +
        '<span style="color:#64748b">(OVC '+ovcLabel(ovc_AC)+', V='+sysVAC+'V)</span></div>' +
        '<div><span style="font-weight:600;color:#1e293b">DC侧冲击电压:</span> ' +
        '<span style="color:#2563eb;font-weight:700;font-size:.95rem">'+tovDC+' kV</span> ' +
        '<span style="color:#64748b">(OVC '+ovcLabel(ovc_DC)+', V='+sysVDC+'V)</span></div>' +
        '</div>';
    })();

    // Build nodes array for model
    var nodeArr=[];
    nodes.forEach(function(seg,i){
      nodeArr.push({
        name: seg.querySelector(".sname").value || "节点"+(i+1),
        vrms: +seg.querySelector(".svrms").value || 0,
        ins:  seg.querySelector(".sins").value || "basic",
        pcb:  +seg.querySelector(".spcb").value || 0,
        coat: +seg.querySelector(".scoat").value || 0,
        circ: seg.querySelector('.scirc')?seg.querySelector('.scirc').value:'ac'
      });
    });

    // Call pure model calculation
    var result = SM.calcSafety({
      pd:pd, mgGroup:mg, alt:alt, standard:std,
      tovAC:tovAC, tovDC:tovDC,
      sysVAC:sysVAC, sysVDC:sysVDC, nodes:nodeArr
    });
    if(!result) return;

    // Render results to DOM
    var tb="";
    result.results.forEach(function(r){
      tb+="<tr><td>"+r.name+"</td><td>"+r.vrms+"</td><td>"+r.insL+"</td><td>"+r.reqClr+"</td><td>"+r.reqCrp+"</td></tr>";
    });
    document.getElementById("sRtb").innerHTML=tb;

    var altk = SM.ALT_K[alt] || 1.0;
    var ah="<p style=margin-bottom:6px><strong>安规距离计算结果</strong></p>";
    ah+="<p style=font-size:.85rem>标准: "+document.getElementById("sStd").selectedOptions[0].text+" | PD: "+pd+" | 材料: "+document.getElementById("sMg").selectedOptions[0].text+" | 海拔: "+alt+"m(系数"+altk+")</p>";
    ah+="<p style=font-size:.85rem>注:电气间隙已乘海拔系数和绝缘倍率; 爬电距离已乘绝缘倍率(详见各节点); 非PCB走线爬电距离增加1.2倍</p>";
    document.getElementById("sMa").innerHTML=ah;

    // Store for report/export
    var ovc_AC = document.getElementById('sOvc_AC').value;
    var ovc_DC = document.getElementById('sOvc_DC').value;
    window._sd={results:result.results,pd:pd,mg:mg,alt:alt,altk:altk,tovAC:tovAC,tovDC:tovDC,ovc_AC:ovc_AC,ovc_DC:ovc_DC};
    sGenRep();
  }

  /* ── Report generation (DOM-only) ───────── */
  function sCalcFormulas(d){
    if(!d||!d.results||!d.results.length)return '';
    var fs='<p style=margin:4px 0;font-size:.85rem><b>计算依据:</b></p>';
    var std=document.getElementById('sStd').selectedOptions[0].text;
    var ovcAC = document.getElementById('sOvc_AC')?document.getElementById('sOvc_AC').value.toUpperCase():'II';
    var ovcDC = document.getElementById('sOvc_DC')?document.getElementById('sOvc_DC').value.toUpperCase():'II';
    fs+='<ul style=margin:2px 0 2px 20px;font-size:.82rem;color:#555>'+(std.includes('IEC')?'<li>标准: IEC 60664-1</li>':'<li>标准: UL 840</li>')+'<li>AC侧冲击电压: OVC '+ovcAC+', '+d.tovAC+' kV | DC侧: OVC '+ovcDC+', '+d.tovDC+' kV</li>'+'<li>海拔系数: '+d.altk+'</li>'+'<li>爬电距离: PD '+d.pd+', 材料组别'+document.getElementById('sMg').selectedOptions[0].text+'</li>';
    d.results.forEach(function(r){var k=SM.INS_K[r.ins]||1;if(k>1)fs+='<li>'+r.name+': '+r.insL+'绝缘x'+k+'</li>'});
    return fs+='</ul>';
  }

  function sGenRep(){
    var d=window._sd;
    if(!d||!d.results||!d.results.length){document.getElementById("sRc").innerHTML="<h3>安规距离评估报告</h3><p>请添加测量节点。</p>";return;}
    var n=new Date(),ds=n.toLocaleDateString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit"}),ts=n.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
    var sr="";d.results.forEach(function(r){sr+="<tr><td>"+r.name+"</td><td>"+r.vrms+"</td><td>"+r.insL+"</td><td>"+r.reqClr+"</td><td>"+r.reqCrp+"</td></tr>";});

    document.getElementById("sRc").innerHTML=
      (document.getElementById('sProjName').value?'<p><strong>项目: </strong>'+document.getElementById('sProjName').value+'</p>':'')
      +"<h3>1. 项目信息</h3><table><tr><th>项目</th><th>内容</th></tr>"
        +"<tr><td>报告编号</td><td>SA-"+ds.replace(/\//g,"")+"-" +(1e3+Math.floor(9e3*Math.random()))+"</td></tr>"
        +"<tr><td>生成日期</td><td>"+ds+" "+ts+"</td></tr>"
        +"<tr><td>项目名称</td><td>"+(document.getElementById('sProjName').value||'-')+"</td></tr></table>"
      +"<h3>2. 基础参数</h3><table><tr><th>参数</th><th>值</th></tr>"
        +"<tr><td>标准</td><td>"+document.getElementById('sStd').selectedOptions[0].text+"</td></tr>"
        +"<tr><td>污染等级</td><td>PD "+d.pd+"</td></tr>"
        +"<tr><td>材料组别</td><td>"+document.getElementById('sMg').selectedOptions[0].text+"</td></tr>"
        +"<tr><td>海拔</td><td>"+d.alt+"m (系数 "+d.altk+")</td></tr>"
        +"<tr><td>AC侧过电压类别</td><td>OVC "+(d.ovc_AC?d.ovc_AC.toUpperCase():'II')+" (冲击电压 "+(d.tovAC||'-')+' kV)'+"</td></tr>"
        +"<tr><td>DC侧过电压类别</td><td>OVC "+(d.ovc_DC?d.ovc_DC.toUpperCase():'II')+" (冲击电压 "+(d.tovDC||'-')+' kV)'+"</td></tr>"
        +"<tr><td>AC系统电压</td><td>"+document.getElementById('sSysV_AC').value+' V'+'</td></tr>'
        +"<tr><td>DC系统电压</td><td>"+document.getElementById('sSysV_DC').value+' V'+'</td></tr>'
        +"</table>"
      +"<h3>3. 各节点所需安规距离</h3><table><tr><th>节点</th><th>工作电压Vrms(V)</th><th>绝缘类型</th><th>所需Clr(mm)</th><th>所需Crp(mm)</th></tr>"+sr+"</table>"
      +sCalcFormulas()
      +"<h3>4. 设计建议</h3><ul style=margin:4px 0 0 20px>"
        +"<li>实际工程设计中应确保实际距离大于上表所需值</li>"
        +"<li>海拔超过2000m时电气间隙需按系数放大</li>"
        +"<li>加强绝缘(Reinforced)要求为基本绝缘的2倍</li>"
        +"<li>建议预留20%以上设计裕量</li>"
        +"<li>最终需通过安规认证机构(如TUV/UL)的实测验证</li></ul>"
      +"<p style=margin:8px 0;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px><strong>结论:</strong> 各节点安规距离计算结果如上表所示，实际工程设计中应确保实际距离大于所需值，并留足设计裕量。</p>"
      +"<div style=margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:.85rem;color:#64748b><span>安规距离计算工具 v1.0</span><span>报告: "+ds+" "+ts+"</span></div>";
  }

  /* ── Word export (DOM-only) ─────────────── */
  function sExportReport(mode){
    var d=window._sd;if(!d||!d.results||!d.results.length)return;
    if(mode==='pdf'){window.print();return}
    var pn=document.getElementById('sProjName').value,te=[];if(pn)te.push(pn);
    var ts=te.length?' ('+te.join(' - ')+')':'',sr='';
    d.results.forEach(function(r){sr+='<tr><td>'+r.name+'</td><td>'+r.vrms+'</td><td>'+r.insL+'</td><td>'+r.reqClr+'</td><td>'+r.reqCrp+'</td></tr>'});
    var h='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><title>安规距离评估报告'+ts+'</title><style>body{font-family:SimSun,serif;font-size:11pt}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #000;padding:3px 6px;font-size:10pt}th{background:#eee}h2{font-size:13pt;margin-top:14px}</style></head><body>';
    h+='<h2 style="text-align:center">安规距离评估报告'+ts+'</h2>';
    h+='<p>报告编号: SA-'+(new Date().toLocaleDateString('zh-CN').replace(/\//g,''))+'-'+(Math.floor(Math.random()*9000+1000))+'</p>';
    h+='<p>生成日期: '+new Date().toLocaleDateString('zh-CN')+'</p>';
    h+='<h2>1. 项目信息</h2><table><tr><th>项目</th><th>内容</th></tr>'+(pn?'<tr><td>项目名称</td><td>'+pn+'</td></tr>':'')+'<tr><td>标准</td><td>'+document.getElementById('sStd').selectedOptions[0].text+'</td></tr></table>';
    h+='<h2>2. 基础参数</h2><table><tr><th>参数</th><th>值</th></tr>'
      +'<tr><td>污染等级</td><td>PD '+d.pd+'</td></tr>'
      +'<tr><td>材料组别</td><td>'+document.getElementById('sMg').selectedOptions[0].text+'</td></tr>'
      +'<tr><td>海拔</td><td>'+d.alt+'m (系数 '+d.altk+')</td></tr>'
      +'<tr><td>AC侧过电压类别</td><td>OVC '+(d.ovc_AC?d.ovc_AC.toUpperCase():'II')+' ('+d.tovAC+' kV)</td></tr>'
      +'<tr><td>DC侧过电压类别</td><td>OVC '+(d.ovc_DC?d.ovc_DC.toUpperCase():'II')+' ('+d.tovDC+' kV)</td></tr>'
      +'</table>';
    h+='<p style="margin-top:20px"><i>安规距离计算工具 v1.0 - 报告自动生成</i></p></body></html>';
    var b=new Blob([h],{type:'application/msword'});var dn='安规距离评估报告'+(te.length?'('+te.join('-')+')':'')+'.doc';saveBlobWithDialog(b,dn);
  }

  /* ── Init ──────────────────────────────── */
  function initSafety(defaultNodes){
    if(defaultNodes && defaultNodes.length){
      // Load nodes from defaults.json
      defaultNodes.forEach(function(n,i){
        document.getElementById("sN").insertAdjacentHTML("beforeend", mNode(snid++,i,n.name,n.vrms,n.ins,n.pcb,n.coat,n.interp||false,n.circ||'ac'));
      });
    } else {
      // Fallback: single default node
      sAddNode();
    }
    var btn=document.getElementById("addNodeBtn");if(btn)btn.onclick=sAddNode;
    sCalc();
  }

  /* ── Expose to global scope ────────────── */
  var expose = [
    'mNode','sNChange','sAddNode',
    'sRmNode','sReNum','sCalc','sCalcFormulas','sGenRep','sExportReport'
  ];
  expose.forEach(function(n){global[n]=eval('('+n+')')});

  /* ── Wire static inputs via event delegation ─── */
  document.addEventListener('input', function(e){
    var t=e.target;
    if(t.id && ['sSysV_AC','sSysV_DC'].includes(t.id)){sCalc()}
  });
  document.addEventListener('change', function(e){
    var t=e.target;
    if(t.id && ['sStd','sPd','sMg','sAlt','sOvc_AC','sOvc_DC'].includes(t.id)){sCalc()}
  });

  global.initSafety = initSafety;

})(window);
