/* ===== Safety Distance Calculator — UI Layer ===== */
/* Imports: window.SafetyModel (models/safety-model.js)           */
/* Exposes: initSafety (called from app.js on first tab click)    */

(function (global) {
  "use strict";

  var SM = global.SafetyModel;
  if (!SM) { console.error("SafetyModel not loaded — load models/safety-model.js first"); return; }

  var snid = 0;
  var dcManualOverride = false; // Track whether user manually changed DC OVC

  /* ── Node markup (DOM-only) ─────────────── */
  function mNode(id,idx,name,vrms,ins,pcb,coat,interp,circ,toGnd){
    ins=ins||'basic';pcb=pcb||0;coat=coat||0;interp=interp||false;circ=circ||'ac';toGnd=!!toGnd;
    var io='<option value="func" '+(ins=='func'?'selected':'')+'>功能</option><option value="basic" '+(ins=='basic'?'selected':'')+'>基本</option><option value="supp" '+(ins=='supp'?'selected':'')+'>附加</option><option value="reinf" '+(ins=='reinf'?'selected':'')+'>加强</option>';
    var po='<option value="0" '+(pcb==0?'selected':'')+'>否(端子)</option><option value="1" '+(pcb==1?'selected':'')+'>是(PCB)</option>';
    var co='<option value="0" '+(coat==0?'selected':'')+'>无</option><option value="1" '+(coat==1?'selected':'')+'>Type 1 (降PD)</option><option value="2" '+(coat==2?'selected':'')+'>Type 2/灌封</option>';
    var go='<option value="0" '+(!toGnd?'selected':'')+'>否(线间)</option><option value="1" '+(toGnd?'selected':'')+'>是(对地)</option>';
    return '<tr class="snode" data-id='+id+'>'
      +'<td style="text-align:center;color:#94a3b8;font-size:.72rem">'+(idx+1)+'</td>'
      +'<td><input class=sname type=text value="'+name+'" style="width:80px;border:1px solid #e2e8f0;border-radius:3px;padding:2px 4px;font-size:.78rem"></td>'
      +'<td><select class=stoGnd style="font-size:.75rem;padding:1px 2px;border:1px solid #e2e8f0;border-radius:3px;min-width:0;width:auto">'+go+'</select></td>'
      +'<td><input class=svrms type=number value='+vrms+' min=0 step=10 style="width:60px;border:1px solid #e2e8f0;border-radius:3px;padding:2px 4px;font-size:.78rem"></td>'
      +'<td><select class=sins style="font-size:.75rem;padding:1px 2px;border:1px solid #e2e8f0;border-radius:3px;min-width:0;width:auto">'+io+'</select></td>'
      +'<td><select class=spcb style="font-size:.75rem;padding:1px 2px;border:1px solid #e2e8f0;border-radius:3px;min-width:0;width:auto">'+po+'</select></td>'
      +'<td><select class=scoat style="font-size:.75rem;padding:1px 2px;border:1px solid #e2e8f0;border-radius:3px;min-width:0;width:auto">'+co+'</select></td>'
      +'<td><select class=scirc style="font-size:.75rem;padding:1px 2px;border:1px solid #e2e8f0;border-radius:3px;min-width:0;width:auto"><option value=ac '+(circ=='ac'?'selected':'')+'>AC</option><option value=dc '+(circ=='dc'?'selected':'')+'>DC(PV)</option></select></td>'
      +'<td style="text-align:center;white-space:nowrap"><button class="btn-sm" style="color:#ef4444;padding:1px 6px" onclick=sRmNode(this)>✕</button></td>'
      +'</tr>';
  }

  function sNChange(inp){} // Name displayed directly in input

  function sAddNode(){
    document.getElementById("sN").insertAdjacentHTML("beforeend", mNode(snid++,0,"L-N",230,"basic",0,0,false,"ac"));
    var btn=document.getElementById("addNodeBtn");if(btn)btn.onclick=sAddNode;
    sCalc();
  }

  function sRmNode(b){b.closest("tr[data-id]").remove();sReNum();sCalc()};

  function sReNum(){
    document.querySelectorAll("#sN .snode").forEach(function(s,i){s.cells[0].textContent=i+1;});
  }

  /* ── Auto-derive DC OVC from AC OVC + isolation architecture ─── */
  /* Per IEC 62109-1 §7.3.7:                                      */
  /*   - Isolated: DC side = AC side − 1 level (min I)            */
  /*   - Non-isolated: DC side = max(AC, PV inherent OVC II)      */
  function autoDeriveDC(){
    var ovcNum = {i:1,ii:2,iii:3,iv:4}[document.getElementById('sOvc_AC').value] || 2;
    var iso = document.getElementById('sIsolation')?document.getElementById('sIsolation').value:'isolated';
    if(iso==='isolated'){
      ovcNum = Math.max(1, ovcNum - 1); // Step down one level across isolation barrier
    } else {
      ovcNum = Math.max(ovcNum, 2); // Non-isolated: take max of AC and PV inherent (OVC II)
    }
    var label = {1:'i',2:'ii',3:'iii',4:'iv'}[ovcNum] || 'ii';
    document.getElementById('sOvc_DC').value = label;
    // Show "auto-derived" badge
    var badge = document.getElementById('sOvc_DC_derived');
    if(badge) badge.style.display = 'inline-block';
  }

  /* ── Apply standard-specific UI mode (IEC vs UL) ─── */
  function applyStandardMode(std){
    // Toggle data-standard="iec" and data-standard="ul" elements
    document.querySelectorAll("[data-standard]").forEach(function(el){
      if(el.getAttribute("data-standard") === std){
        el.style.display = "";
      } else {
        el.style.display = "none";
      }
    });
  }

  /* ── Read params from DOM → call model → render results ─── */
  function sCalc(){
    var nodes=document.querySelectorAll("#sN .snode");
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

    /* ── UL mode: PD and material group are fixed by standard ─── */
    if(std === 'ul'){
      pd = 3; // UL 1741 §25.4a: default PD3
      mg = "ii"; // UL 1741 §25.4d: CTI >= 100 → Material Group II
    }

    var iso = document.getElementById('sIsolation')?document.getElementById('sIsolation').value:'isolated';
    var ovc_AC = {i:1,ii:2,iii:3,iv:4}[document.getElementById('sOvc_AC').value||'ii'] || 2;
    var ovc_DC = {i:1,ii:2,iii:3,iv:4}[document.getElementById('sOvc_DC').value||'ii'] || 2;

    /* ── Read system voltage from IEC or UL inputs ─── */
    var sysVAC_el = std === 'ul' ? document.getElementById('sSysV_AC_ul') : document.getElementById('sSysV_AC');
    var sysVDC_el = std === 'ul' ? document.getElementById('sSysV_DC_ul') : document.getElementById('sSysV_DC');
    var sysVAC = +(sysVAC_el?sysVAC_el.value:0) || 300;
    var sysVDC = +(sysVDC_el?sysVDC_el.value:0) || 600;

    /* ── Impulse withstand voltage per IEC 62109-1 Table 12 ──── */
    var IMPULSE_TBL = [
      [50,   0.33,  0.5,   0.8,   1.5],
      [100,  0.5,   0.8,   1.5,   2.5],
      [150,  0.8,   1.5,   2.5,   4.0],
      [300,  1.5,   2.5,   4.0,   6.0],
      [600,  1.5,   2.5,   4.0,   6.0],
      [1000, 2.5,   4.0,   6.0,   8.0]
    ];

    function impulseFor(ovcNum, sysV){
      var ov = Math.min(ovcNum || 2, 4);
      for(var i=0; i<IMPULSE_TBL.length; i++){
        if(sysV <= IMPULSE_TBL[i][0]) return IMPULSE_TBL[i][ov];
      }
      return IMPULSE_TBL[IMPULSE_TBL.length-1][ov];
    }

    /* ── Temporary overvoltage per Table 12 col 6 — mains only ─── */
    var TOV_TBL = [
      [50,   1770, 1250],[100,  1840, 1300],[150,  1910, 1350],
      [300,  2120, 1500],[600,  2550, 1800],[1000, 3110, 2200]
    ];

    function tovFor(sysV){
      for(var i=0; i<TOV_TBL.length; i++){
        if(sysV <= TOV_TBL[i][0]) return { peak: TOV_TBL[i][1], rms: TOV_TBL[i][2] };
      }
      var last = TOV_TBL[TOV_TBL.length-1];
      return { peak: last[1], rms: last[2] };
    }

    // Compute impulse withstand voltage (kV) for AC and DC sides
    var impAC = impulseFor(ovc_AC, sysVAC);
    var impDC = impulseFor(ovc_DC, sysVDC);

    /* PV circuit rule: minimum 2.5 kV per IEC 62109-1 §7.3.7.1.2b */
    if(impDC < 2.5) impDC = 2.5;

    // Impulse level stepping helpers (for within-circuit reduction display)
    var IMPULSE_LEVELS = [0.33, 0.5, 0.8, 1.5, 2.5, 4.0, 6.0, 8.0];
    function prevImpLevel(kv){
      for(var i=1; i<IMPULSE_LEVELS.length; i++){
        if(IMPULSE_LEVELS[i] >= kv) return IMPULSE_LEVELS[Math.max(0, i-1)];
      }
      return kv;
    }

    /* ── Display impulse + TOV info in #sImpulseInfo (IEC only) ─── */
    if(std === 'iec'){
      (function(){
        var el = document.getElementById("sImpulseInfo");
        if(!el) return;
        var ovcLabel = function(n){return {1:'I',2:'II',3:'III',4:'IV'}[n]||'II';};
        var tovAC_info = tovFor(sysVAC);
        var isoNote = iso==='isolated'?'<span style="color:#64748b;font-size:.75rem">(隔离降档)</span>':'<span style="color:#64748b;font-size:.75rem">(无隔离取较高值)</span>';
        el.innerHTML =
          '<div><span style="font-weight:600;color:#1e293b">AC侧冲击电压:</span> ' +
          '<span style="color:#2563eb;font-weight:700;font-size:.95rem">'+impAC+' kV</span> ' +
          '<span style="color:#64748b">(OVC '+ovcLabel(ovc_AC)+', V='+sysVAC+'V)</span></div>' +
          '<div><span style="font-weight:600;color:#1e293b">DC侧冲击电压:</span> ' +
          '<span style="color:#2563eb;font-weight:700;font-size:.95rem">'+impDC+' kV</span> ' +
          '<span style="color:#64748b">(OVC '+ovcLabel(ovc_DC)+', V='+sysVDC+'V)</span> '+isoNote+'</div>' +
          '<div><span style="font-weight:600;color:#1e293b">AC侧暂态过电压:</span> ' +
          '<span style="color:#7c3aed;font-size:.85rem">'+(tovAC_info.peak/1000).toFixed(2)+' kV pk / '+(tovAC_info.rms/1000).toFixed(2)+' kV rms</span></div>' +
          '<div style="margin-top:4px;padding-top:4px;border-top:1px solid #e0e7ff;font-size:.78rem;color:#64748b">' +
          '线间节点(电气间隙): 冲击电压降一档 → AC '+prevImpLevel(impAC)+' kV, DC '+Math.max(prevImpLevel(impDC), 2.5)+' kV' +
          '<br><span style="font-style:italic">依据 IEC 62109-1 §7.3.7 — 同一电路内部的功能绝缘比对地再降一档</span></div>';
      })();
    } else {
      /* ── UL mode: show system voltage info instead of impulse/TOV ─── */
      (function(){
        var el = document.getElementById("sImpulseInfo");
        if(!el) return;
        el.innerHTML =
          '<div style="padding:8px 12px;background:#f0fdf4;border-radius:6px;font-size:.85rem;width:100%">' +
          '<span style="font-weight:600;color:#1e293b">UL 1741 查表依据:</span><br>' +
          'AC侧系统电压: <strong>'+sysVAC+' V</strong> → '+((sysVAC/1000).toFixed(2))+' kVRMS | DC侧系统电压: <strong>'+sysVDC+' V</strong> → '+((sysVDC/1000).toFixed(2))+' kVRMS<br>' +
          '<span style="font-size:.78rem;color:#64748b">UL 电气间隙由相地额定系统电压查表确定 (§25.4g)，不使用冲击耐受电压</span></div>';
      })();
    }

    // Build nodes array for model
    var nodeArr=[];
    nodes.forEach(function(seg,i){
      nodeArr.push({
        name: seg.querySelector(".sname").value || "节点"+(i+1),
        vrms: +seg.querySelector(".svrms").value || 0,
        ins:  seg.querySelector(".sins").value || "basic",
        pcb:  +seg.querySelector(".spcb").value || 0,
        coat: +seg.querySelector(".scoat").value || 0,
        circ: seg.querySelector('.scirc')?seg.querySelector('.scirc').value:'ac',
        toGnd: seg.querySelector('.stoGnd')?+seg.querySelector('.stoGnd').value||0:1,
        interp: seg.dataset.interp === 'true',       // P2#5: secondary circuit → linear interpolation
        fieldTerminal: seg.dataset.fieldTerm === 'true'  // P2#4: UL §25.3 field wiring terminal
      });
    });

    // Call pure model calculation — pass impulse voltage (kV) for clearance lookup
    var result;
    try {
      result = SM.calcSafety({
        pd:pd, mgGroup:mg, alt:alt, standard:std,
        impAC:impAC, impDC:impDC,
        sysVAC:sysVAC, sysVDC:sysVDC, nodes:nodeArr
      });
    } catch(e) {
      console.error("SafetyModel.calcSafety error:", e);
      document.getElementById("sMa").innerHTML = '<p style="color:#ef4444">计算错误: '+e.message+'</p>';
      return;
    }
    if(!result){
      document.getElementById("sRtb").innerHTML="";
      document.getElementById("sMa").innerHTML="<p>请检查节点配置。</p>";
      return;
    }

    // Render results to DOM
    var tb="";
    result.results.forEach(function(r,i){
      var gndMark = r.toGnd ? '<span style="color:#2563eb;font-size:.7rem" title="对地节点，IEC 62109-1 §7.3.7 强制加强绝缘">⊕</span>' : '';
      var withinNote = !r.toGnd ? ' <span style="color:#64748b;font-size:.65rem" title="线间节点：冲击电压按标准降一档计算">↓1OVC</span>' : '';
      var warnNote = r.forcedReinforced ? ' <span style="color:#f59e0b;font-size:.7rem" title="该节点为对地连接，标准强制要求加强绝缘(×2)，已自动应用">⚠ 已强制加强</span>' : '';
      var peakWarn = (r.recurringPeakOk === false) ? ' <span style="color:#ef4444;font-size:.7rem" title="UL 840 §9.6: PCB反复峰值电压超出Table 9.3限制，请增大爬电距离或降低工作电压">🔴 峰值超限</span>' : '';
      var t241Warn = r.tbl241Note ? ' <span style="color:#f59e0b;font-size:.7rem" title="UL 1741 §25.3: 现场接线端子强制使用Table 24.1基线间距(非UL 840替代方案)">⚠ T24.1</span>' : '';
      tb+="<tr><td>"+(i+1)+"</td><td>"+r.name+" "+gndMark+"</td><td>"+r.vrms+"</td><td>"+r.insL+warnNote+withinNote+"</td><td>"+r.reqClr+t241Warn+"</td><td>"+r.reqCrp+peakWarn+"</td></tr>";
    });
    document.getElementById("sRtb").innerHTML=tb;

    var altk = SM.altFactor(alt);
    var ah="<p style=margin-bottom:6px><strong>安规距离计算结果</strong></p>";
    ah+="<p style=font-size:.85rem>标准: "+document.getElementById("sStd").selectedOptions[0].text+" | PD: "+pd+" | 材料: "+document.getElementById("sMg").selectedOptions[0].text+" | 海拔: "+alt+"m(系数"+altk+")</p>";
    if(std === 'iec'){
      var isoLabel = iso==='isolated'?'有隔离':'无隔离';
      ah+="<p style=font-size:.82rem;color:#64748b>隔离架构: "+isoLabel+"</p>";
      ah+="<p style=font-size:.82rem;color:#64748b>注:</p><ul style=font-size:.82rem;color:#64748b;margin:2px 0 0 16px;line-height:1.7>";
      ah+='<li><strong>对地节点</strong>(⊕): 使用电路完整OVC冲击电压 — IEC 62109-1 §7.3.7 强制要求加强绝缘</li>';
      ah+='<li><strong>线间节点</strong>(↓1OVC): 同一电路内部的功能绝缘比对地再降一档 (§7.3.7) — 冲击电压取低一档计算电气间隙</li>';
      ah+='<li>电气间隙(IEC): 取冲击电压、暂态过电压(TOV)、工作电压峰值三者查表后最严苛值，再乘海拔系数</li>';
      ah+='<li>加强绝缘(IEC): 取三项中最严 — (a)冲击电压升一档 (b)1.6×工作峰值 (c)1.6×TOV峰值(仅电网电路)</li>';
      ah+='<li>爬电距离已乘绝缘倍率，非PCB走线按污染等级选取</li>';
      ah+='<li style="color:#f59e0b;font-weight:500">⚠ = 用户选择了非加强绝缘但对地连接，系统已自动按加强绝缘计算</li>';
      ah+='</ul>';
    } else {
      /* ── UL mode assessment notes ─── */
      ah+="<p style=font-size:.82rem;color:#64748b>注:</p><ul style=font-size:.82rem;color:#64748b;margin:2px 0 0 16px;line-height:1.7>";
      ah+='<li><strong>电气间隙(UL)</strong>: 由相地额定系统电压(kVRMS)查表确定 (§25.4g)，不使用冲击耐受电压</li>';
      ah+='<li>加强绝缘(UL): 取基本绝缘距离×2 或表中上一行，以较大值为准 (§6.3)</li>';
      ah+='<li>爬电距离(UL): 由工作电压Vrms查表确定，加强绝缘翻倍</li>';
      ah+='<li style="color:#f59e0b;font-weight:500">⚠ = 对地节点强制加强绝缘，系统已自动应用</li>';
      ah+='<li style="color:#ef4444;font-weight:500">🔴 = PCB反复峰值电压超限 (UL 840 §9.6)，需增大爬电距离或降低工作电压</li>';
      ah+='<li style="color:#f59e0b;font-weight:500">⚠T24.1 = 现场接线端子强制使用Table 24.1基线间距 (UL 1741 §25.3)，不使用UL 840替代方案</li>';
      ah+='</ul>';
    }
    document.getElementById("sMa").innerHTML=ah;

    // Store for report/export
    var ovc_AC_val = document.getElementById('sOvc_AC').value;
    var ovc_DC_val = document.getElementById('sOvc_DC').value;
    window._sd={results:result.results,pd:pd,mg:mg,alt:alt,altk:altk,std:std,impAC:impAC,impDC:impDC,ovc_AC:ovc_AC_val,ovc_DC:ovc_DC_val,isolation:iso};
    sGenRep();
  }

  /* ── Report generation (DOM-only) ───────── */
    /* ── Build per-node calculation chain as plain text ─── */
  function buildCalcChains(d){
    if(!d||!d.results||!d.results.length)return "";
    var html="";
    d.results.forEach(function(r,i){
      var mult = SM.INS_K[r.effIns] || SM.INS_K[r.ins] || 1;
      var txt="<div style=margin:6px 0;padding:10px 14px;border-left:3px solid #2563eb;background:#f8fafc;font-size:.85rem;line-height:1.7>";
      // Node header + input params
      txt += "<strong>" + (i+1) + ". " + r.name + "</strong>，";
      txt += "工作电压 " + r.vrms + " Vrms，" + r.insL + "（倍率×" + mult + "），";
      // ── Clearance chain ──
      if(d.std === 'ul'){
        var sysKV = (r.circ === 'dc' ? d.sysVDC : d.sysVAC);
        var sysKVRMS = (sysKV / 1000).toFixed(3);
        txt += "Clearance：系统电压 " + sysKV + " V（" + sysKVRMS + " kVRMS），查UL 840表";
        if(r.interpUsed) txt += "<span style=\"color:#2563eb;font-weight:600\">（差值法）</span>";
        txt += "得基准值，";
        if(mult > 1) txt += "绝缘倍率×" + mult + "，";
        var clrBase = (r.reqClr / d.altk).toFixed(2);
        txt += "海拔修正系数 k=" + d.altk + "（" + d.alt + " m），reqClearance = " + clrBase + " × " + d.altk + " = " + r.reqClr + " mm。";
      } else {
        var impKV = (r.circ === 'dc' ? d.impDC : d.impAC);
        if(!r.toGnd){ impKV = Math.round((impKV * 0.6) * 10) / 10; }
        txt += "Clearance：";
        txt += "冲击电压 " + impKV + " kV";
        if(!r.toGnd) txt += "（线间降档）";
        txt += "，查IEC 60664-1表得基准值，";
        if(mult > 1) txt += "绝缘倍率×" + mult + "，";
        var clrBase = (r.reqClr / d.altk).toFixed(2);
        txt += "海拔修正系数 k=" + d.altk + "（" + d.alt + " m），reqClearance = " + clrBase + " × " + d.altk + " = " + r.reqClr + " mm。";
      }
      // ── Creepage chain ──
      if(d.std === 'ul'){
        txt += "Creepage：工作电压 " + r.vrms + " V，污染等级PD" + d.pd + "，材料组II，查UL 840表得基准值";
        var crpBase = (r.reqCrp / mult).toFixed(2);
        txt += "约 " + crpBase + " mm，";
        if(mult > 1) txt += "绝缘倍率×" + mult + "，";
        txt += "reqCreepage = " + r.reqCrp + " mm。";
      } else {
        txt += "Creepage：工作电压 " + r.vrms + " V，污染等级PD" + d.pd + "，材料组" + (d.mg||'II') + "，查IEC 60664-1表得基准值";
        var crpBase = (r.reqCrp / mult).toFixed(2);
        txt += "约 " + crpBase + " mm，";
        if(mult > 1) txt += "绝缘倍率×" + mult + "，";
        txt += "reqCreepage = " + r.reqCrp + " mm。";
      }
      // ── Warnings/notes ──
      if(r.forcedReinforced) txt += "<br><span style=color:#f59e0b>⚠ 对地节点，标准强制要求加强绝缘</span>";
      if(r.tbl241Note) txt += "<br><span style=color:#f59e0b>⚠ UL Table 24.1最小值约束生效</span>";
      if(r.recurringPeakOk === false) txt += "<br><span style=color:#ef4444>🔴 UL §9.6 PCB峰值电压超限</span>";
      txt += "</div>";
      html += txt;
    });
    return html;
}

  function sGenRep(){
    var d=window._sd;
    if(!d||!d.results||!d.results.length){document.getElementById("sRc").innerHTML="<h3>安规距离评估报告</h3><p>请添加测量节点。</p>";return;}
    var n=new Date(),ds=n.toLocaleDateString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit"}),ts=n.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
    var sr="";d.results.forEach(function(r){var g=r.toGnd?' (对地)':' (线间,降档)';var f=r.forcedReinforced?' ⚠强制加强':'';var pw=(r.recurringPeakOk===false)?' 🔴峰值超限':'';var t241=r.tbl241Note?' ⚠T24.1':'';sr+="<tr><td>"+(d.results.indexOf(r)+1)+"</td><td>"+r.name+g+"</td><td>"+r.vrms+"</td><td>"+r.insL+f+"</td><td>"+r.reqClr+t241+"</td><td>"+r.reqCrp+pw+"</td></tr>";});

    var isoLabel = (d.isolation==='isolated')?'有隔离':'无隔离';

    /* ── Read system voltage from correct input based on standard ─── */
    var sysVAC_el = d.std === 'ul' ? document.getElementById('sSysV_AC_ul') : document.getElementById('sSysV_AC');
    var sysVDC_el = d.std === 'ul' ? document.getElementById('sSysV_DC_ul') : document.getElementById('sSysV_DC');
    var sysVAC_val = (sysVAC_el?sysVAC_el.value:'-');
    var sysVDC_val = (sysVDC_el?sysVDC_el.value:'-');

    /* ── Build base params table based on standard ─── */
    var baseTable;
    if(d.std === 'iec'){
      baseTable=
        "<tr><td>标准</td><td>"+document.getElementById('sStd').selectedOptions[0].text+"</td></tr>"
        +"<tr><td>污染等级</td><td>PD "+d.pd+"</td></tr>"
        +"<tr><td>材料组别</td><td>"+document.getElementById('sMg').selectedOptions[0].text+"</td></tr>"
        +"<tr><td>海拔</td><td>"+d.alt+"m (系数 "+d.altk+")</td></tr>"
        +"<tr><td>隔离架构</td><td>"+isoLabel+"</td></tr>"
        +"<tr><td>AC侧过电压类别</td><td>OVC "+(d.ovc_AC?d.ovc_AC.toUpperCase():'II')+" (冲击电压 "+(d.impAC||'-')+' kV)'+"</td></tr>"
        +"<tr><td>DC侧过电压类别</td><td>OVC "+(d.ovc_DC?d.ovc_DC.toUpperCase():'II')+" (冲击电压 "+(d.impDC||'-')+' kV)' +(d.isolation==='isolated'?' <em>(隔离降档)</em>':'')+ "</td></tr>"
        +"<tr><td>AC系统电压</td><td>"+sysVAC_val+' V'+'</td></tr>'
        +"<tr><td>DC系统电压</td><td>"+sysVDC_val+' V'+'</td></tr>';
    } else {
      /* ── UL mode base params ─── */
      baseTable=
        "<tr><td>标准</td><td>"+document.getElementById('sStd').selectedOptions[0].text+"</td></tr>"
        +" <tr><td>污染等级</td><td>PD "+d.pd+" (UL §25.4a)</td></tr>"
        +" <tr><td>材料组别</td><td>II 组 CTI >= 100 (UL §25.4d)</td></tr>"
        +" <tr><td>过电压类别</td><td>OVC IV (UL §25.4b)</td></tr>"
        +" <tr><td>海拔</td><td>"+d.alt+"m (系数 "+d.altk+")</td></tr>"
        +" <tr><td>AC系统电压</td><td>"+sysVAC_val+' V ('+((+sysVAC_val/1000).toFixed(2))+' kVRMS)'+ "</td></tr>"
        +" <tr><td>DC系统电压</td><td>"+sysVDC_val+' V ('+((+sysVDC_val/1000).toFixed(2))+' kVRMS)'+ "</td></tr>";
    }

    document.getElementById("sRc").innerHTML=
      (document.getElementById('sProjName').value?'<p><strong>项目: </strong>'+document.getElementById('sProjName').value+'</p>':'')
      +" <h3>1. 项目信息</h3><table><tr><th>项目</th><th>内容</th></tr>"
        +" <tr><td>报告编号</td><td>SA-"+ds.replace(/\//g,"")+"-" +(1e3+Math.floor(9e3*Math.random()))+"</td></tr>"
        +"<tr><td>生成日期</td><td>"+ds+" "+ts+"</td></tr>"
        +"<tr><td>项目名称</td><td>"+(document.getElementById('sProjName').value||'-')+"</td></tr></table>"
      +" <h3>2. 基础参数</h3><table><tr><th>参数</th><th>值</th></tr>"+baseTable+"</table>"
      +" <h3>3. 各节点所需安规距离</h3><table><tr><th>#</th><th>节点</th><th>工作电压Vrms(V)</th><th>绝缘类型</th><th>Clearance(mm)</th><th>Creepage(mm)</th></tr>"+sr+"</table>"
      +" <h3>4. 各节点计算过程</h3>" + buildCalcChains(d)
      +" <p style=margin:8px 0;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px><strong>结论:</strong> 各节点安规距离计算结果如上表所示，实际工程设计中应确保实际距离大于所需值，并留足设计裕量。</p>"
      +" <div style=margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:.85rem;color:#64748b><span>安规距离计算工具 v1.0</span><span>报告: "+ds+" "+ts+"</span></div>";
  }

  /* ── Word export (DOM-only) ─────────────── */
  function sExportReport(mode){
    var d=window._sd;if(!d||!d.results||!d.results.length)return;
    if(mode==='pdf'){window.print();return}
    var pn=document.getElementById('sProjName').value,te=[];if(pn)te.push(pn);
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
    css+='table.compact{border-collapse:collapse;width:auto;margin:10px 0;font-size:9pt;display:inline-table}';
    css+='table.compact th,table.compact td{border:1px solid #d0d7e4;padding:5px 12px;text-align:center;vertical-align:middle}';
    css+='table.compact thead th{background:#f1f5f9;font-weight:bold;color:#475569;font-size:8.5pt}';
    css+='</style>';

    /* ── Results rows ─── */
    d.results.forEach(function(r){var g=r.toGnd?' (对地)':' (线间)';var pw=(r.recurringPeakOk===false)?' 🔴峰值超限':'';var t241=r.tbl241Note?' ⚠T24.1':'';sr+='<tr><td>'+i+'</td><td>'+r.name+g+'</td><td>'+r.vrms+'</td><td>'+r.insL+'</td><td>'+r.reqClr+t241+'</td><td>'+r.reqCrp+pw+'</td></tr>'});

    var isoLabel = (d.isolation==='isolated')?'有隔离':'无隔离';
    var n=new Date(),ds=n.toLocaleDateString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit"});

    /* ── Read system voltage from correct input based on standard ─── */
    var sysVAC_el = d.std === 'ul' ? document.getElementById('sSysV_AC_ul') : document.getElementById('sSysV_AC');
    var sysVDC_el = d.std === 'ul' ? document.getElementById('sSysV_DC_ul') : document.getElementById('sSysV_DC');
    var sysVAC_val = (sysVAC_el?sysVAC_el.value:'-');
    var sysVDC_val = (sysVDC_el?sysVDC_el.value:'-');

    /* ── Build project info + base params based on standard ─── */
    var projInfo, baseParams;
    if(d.std === 'iec'){
      projInfo=
        (pn?'<tr><td>'+pn+'</td><td>'+document.getElementById('sStd').selectedOptions[0].text+'</td></tr>':'')
        +'<tr><td>标准</td><td>'+document.getElementById('sStd').selectedOptions[0].text+'</td></tr>'
        +'<tr><td>隔离架构</td><td>'+isoLabel+'</td></tr>';
      baseParams=
        '<tr><td>污染等级</td><td>PD '+d.pd+'</td></tr>'
        +'<tr><td>材料组别</td><td>'+document.getElementById('sMg').selectedOptions[0].text+'</td></tr>'
        +'<tr><td>海拔</td><td>'+d.alt+'m (系数 '+d.altk+')</td></tr>'
        +'<tr><td>AC侧过电压类别</td><td>OVC '+(d.ovc_AC?d.ovc_AC.toUpperCase():'II')+' ('+d.impAC+' kV)</td></tr>'
        +'<tr><td>DC侧过电压类别</td><td>OVC '+(d.ovc_DC?d.ovc_DC.toUpperCase():'II')+' ('+d.impDC+' kV)' +(d.isolation==='isolated'?' (隔离降档)':'')+'</td></tr>'
        +'<tr><td>AC系统电压</td><td>'+sysVAC_val+' V</td></tr>'
        +'<tr><td>DC系统电压</td><td>'+sysVDC_val+' V</td></tr>'
        +'<tr><td>说明</td><td>线间节点按IEC 62109-1 §7.3.7降一档计算电气间隙</td></tr>';
    } else {
      /* ── UL mode project info + base params ─── */
      projInfo=
        (pn?'<tr><td>'+pn+'</td><td>'+document.getElementById('sStd').selectedOptions[0].text+'</td></tr>':'')
        +'<tr><td>标准</td><td>'+document.getElementById('sStd').selectedOptions[0].text+'</td></tr>';
      baseParams=
        '<tr><td>污染等级</td><td>PD '+d.pd+' (UL §25.4a)</td></tr>'
        +'<tr><td>材料组别</td><td>II 组 CTI >= 100 (UL §25.4d)</td></tr>'
        +'<tr><td>过电压类别</td><td>OVC IV (UL §25.4b)</td></tr>'
        +'<tr><td>海拔</td><td>'+d.alt+'m (系数 '+d.altk+')</td></tr>'
        +'<tr><td>AC系统电压</td><td>'+sysVAC_val+' V ('+((+sysVAC_val/1000).toFixed(2))+' kVRMS)</td></tr>'
        +'<tr><td>DC系统电压</td><td>'+sysVDC_val+' V ('+((+sysVDC_val/1000).toFixed(2))+' kVRMS)</td></tr>'
        +'<tr><td>说明</td><td>UL 电气间隙由相地额定系统电压(kVRMS)查表确定 (§25.4g)</td></tr>';
    }

    var h='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><title>安规距离评估报告'+ts+'</title>';
    h+=css;
    h+='</head><body>';

    /* Title */
    h+='<h2 class="title">安规距离评估报告'+ts+'</h2>';
    h+='<p class="meta">报告编号: SA-'+(new Date().toLocaleDateString('zh-CN').replace(/\//g,''))+'-'+(Math.floor(Math.random()*9000+1000))+'</p>';
    h+='<p class="meta">生成日期: '+ds+'</p>';

    /* 1. Project info */
    h+='<h3>1. 项目信息</h3>';
    h+='<table class="compact"><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody>'+projInfo+'</tbody></table>';

    /* 2. Base parameters */
    h+='<h3>2. 基础参数</h3>';
    h+='<table class="compact"><thead><tr><th>参数</th><th>值</th></tr></thead><tbody>'+baseParams+'</tbody></table>';

    /* 3. Results table */
    h+='<h3>3. 评估结果</h3>';
    h+='<table class="data-tbl"><thead><tr>'
      +'<th>节点名称</th><th>Vrms (V)</th><th>绝缘等级</th><th>Clearance mm</th><th>Creepage mm</th>'
      +'</tr></thead><tbody>'+sr+'</tbody></table>';

    /* Footer */
    h+='<div class="footer">安规距离计算工具 v1.0 &nbsp;|&nbsp; 报告自动生成 '+ds+'</div>';
    h+='</body></html>';
    var b=new Blob([h],{type:'application/msword'});var dn='安规距离评估报告'+(te.length?'('+te.join('-')+')':'')+'.doc';saveBlobWithDialog(b,dn);
  }

  /* ── Load nodes from defaults.json (called by app.js applyDefaults) ─── */
  function loadNodesFromDefaults(nodes){
    if(!Array.isArray(nodes)||!nodes.length)return false;
    var sN=document.getElementById('sN');if(sN)sN.innerHTML='';
    nodes.forEach(function(n,idx){
      sN.insertAdjacentHTML('beforeend',mNode(snid++,idx,n.name||'',n.vrms||0,n.ins||'basic',
        n.pcb||0,n.coat||0,n.interp||false,n.circ||'ac',n.toGnd));
    });
    // FIX Bug #4: after loading nodes from defaults, ensure DC OVC is derived
    if(typeof autoDeriveDC==='function')autoDeriveDC();
    sCalc();
  }

  /* ── Init ──────────────────────── */
  function initSafety(defaultNodes){
// FIX Bug #4: handle race where initSafety was already called with fallback,
// but defaults have now arrived via applyDefaults -> loadNodesFromDefaults
    var hasNodes = document.querySelector("#sN [data-id]");

      // No nodes yet — load from defaults or use fallback
      if(defaultNodes && defaultNodes.length){
        defaultNodes.forEach(function(n,i){
          document.getElementById("sN").insertAdjacentHTML("beforeend", mNode(snid++,i,n.name,n.vrms,n.ins,n.pcb,n.coat,n.interp||false,n.circ||'ac',n.toGnd));
        });
      } else {
        sAddNode();
      }
    var btn=document.getElementById("addNodeBtn");if(btn)btn.onclick=sAddNode;

    /* Auto-derive DC OVC based on isolation + AC OVC — called during init */
    dcManualOverride = false; // Reset before init derivation
    autoDeriveDC();

    /* Apply standard-specific UI mode (IEC by default) */
    applyStandardMode(document.getElementById("sStd").value || "iec");

    sCalc();
  }

  /* ── Expose to global scope ────────────── */
  var expose = [
    'mNode','sNChange','sAddNode',
    'sRmNode','sReNum','sCalc','buildCalcChains','sGenRep','sExportReport',
    'loadNodesFromDefaults'
  ];
  expose.forEach(function(n){global[n]=eval('('+n+')')});

  /* ── Wire static inputs via event delegation ─── */
  document.addEventListener('input', function(e){
    var t=e.target;
    if(t.id && ['sSysV_AC','sSysV_DC'].includes(t.id)){sCalc()}
    // Node-level text/number inputs (dynamically added rows) — class-based detection
    if(t.className && typeof t.className === 'string' && /svrms|sname/.test(t.className)){sCalc()}
  });
  document.addEventListener('change', function(e){
    var t=e.target;
    // Node-level select inputs (insulation, PCB, coating, circuit type, toGnd)
    if(t.className && typeof t.className === 'string' && /sins|spcb|scoat|scirc|stoGnd/.test(t.className)){sCalc(); return;}
    // Isolation architecture or AC OVC change → re-derive DC OVC (unless manually overridden)
    if((t.id === 'sIsolation' || t.id === 'sOvc_AC') && !dcManualOverride){
      autoDeriveDC();
      sCalc();
      return;
    }
    // Manual override of DC OVC → stop auto-derivation, hide badge
    if(t.id === 'sOvc_DC'){
      dcManualOverride = true;
      var badge = document.getElementById('sOvc_DC_derived');
      if(badge) badge.style.display = 'none';
      sCalc();
      return;
    }
    // Other global settings that trigger recalculation
    if(t.id && ['sStd','sPd','sMg','sAlt'].includes(t.id)){
      if(t.id === 'sStd'){
        applyStandardMode(t.value);
      }
      sCalc();
    }
  });

  /* ── Wire UL input fields to recalculation ─── */
  document.addEventListener('input', function(e){
    var t=e.target;
    if(t.id && ['sSysV_AC_ul','sSysV_DC_ul'].includes(t.id)){sCalc()}
  });

  global.initSafety = initSafety;

})(window);
