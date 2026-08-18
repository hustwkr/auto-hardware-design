/* ===== Safety Distance Calculator — UI Layer ===== */
/* Imports: window.SafetyModel (models/safety-model.js)           */
/* Exposes: initSafety (called from app.js on first tab click)    */

(function (global) {
  "use strict";

  var SM = global.SafetyModel;
  if (!SM) { console.error("SafetyModel not loaded — load models/safety-model.js first"); return; }

  var snid = 0;
  var dcManualOverride = false; // Track whether user manually changed DC OVC

  function sot(id){var el=document.getElementById(id);return el&&el.selectedOptions&&el.selectedOptions[0]?el.selectedOptions[0].text:''}

  /* ── Node markup (DOM-only) ─────────────── */
  function mNode(id,idx,name,vrms,ins,pcb,coat,interp,circ,toGnd){
    ins=ins||'basic';pcb=pcb||0;coat=coat||0;interp=interp||false;circ=circ||'ac';toGnd=!!toGnd;
    var io='<option value="func" '+(ins=='func'?'selected':'')+'>'+_t("safe.ins.func")+'</option><option value="basic" '+(ins=='basic'?'selected':'')+'>'+_t("safe.ins.basic")+'</option><option value="supp" '+(ins=='supp'?'selected':'')+'>'+_t("safe.ins.supp")+'</option><option value="reinf" '+(ins=='reinf'?'selected':'')+'>'+_t("safe.ins.reinf")+'</option>';
    var po='<option value="0" '+(pcb==0?'selected':'')+'>'+_t("safe.pcb.no")+'</option><option value="1" '+(pcb==1?'selected':'')+'>'+_t("safe.pcb.yes")+'</option>';
    var co='<option value="0" '+(coat==0?'selected':'')+'>'+_t("safe.coat.no")+'</option><option value="1" '+(coat==1?'selected':'')+'>'+_t("safe.coat.t1")+'</option><option value="2" '+(coat==2?'selected':'')+'>'+_t("safe.coat.t2")+'</option>';
    var go='<option value="0" '+(!toGnd?'selected':'')+'>'+_t("safe.gnd.no")+'</option><option value="1" '+(toGnd?'selected':'')+'>'+_t("safe.gnd.yes")+'</option>';
    return '<tr class="snode" data-id='+id+'>'
      +'<td style="text-align:center;color:#94a3b8;font-size:.72rem">'+(idx+1)+'</td>'
      +'<td><input class=sname type=text value="'+name+'" style="width:80px;border:1px solid #e2e8f0;border-radius:3px;padding:2px 4px;font-size:.78rem"></td>'
      +'<td><select class=scirc style="font-size:.75rem;padding:1px 2px;border:1px solid #e2e8f0;border-radius:3px;min-width:0;width:auto"><option value=ac '+(circ=='ac'?'selected':'')+'>'+_t("opt.value.ac")+'</option><option value=dc '+(circ=='dc'?'selected':'')+'>'+_t("opt.value.dc")+'</option></select></td>'
      +'<td><select class=stoGnd style="font-size:.75rem;padding:1px 2px;border:1px solid #e2e8f0;border-radius:3px;min-width:0;width:auto">'+go+'</select></td>'
      +'<td><input class=svrms type=number value='+vrms+' min=0 step=10 style="width:60px;border:1px solid #e2e8f0;border-radius:3px;padding:2px 4px;font-size:.78rem"></td>'
      +'<td><select class=sins style="font-size:.75rem;padding:1px 2px;border:1px solid #e2e8f0;border-radius:3px;min-width:0;width:auto">'+io+'</select></td>'
      +'<td><select class=spcb style="font-size:.75rem;padding:1px 2px;border:1px solid #e2e8f0;border-radius:3px;min-width:0;width:auto">'+po+'</select></td>'
      +'<td><select class=scoat style="font-size:.75rem;padding:1px 2px;border:1px solid #e2e8f0;border-radius:3px;min-width:0;width:auto">'+co+'</select></td>'
      +'<td style="text-align:center;white-space:nowrap"><button class="btn-sm" onclick=sRmNode(this)>&times;</button></td>'
      +'</tr>';
  }

  function sNChange(inp){} // Name displayed directly in input

  function sAddNode(){
    document.getElementById("sN").insertAdjacentHTML("beforeend", mNode(snid++,0,"L-N",230,"basic",0,0,false,"ac"));
    var btn=document.getElementById("addNodeBtn");if(btn)btn.onclick=sAddNode;
    sReNum();sCalc();
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
  }

  /* ── Apply standard-specific UI mode (IEC / IEC 62477 vs UL) ─── */
  function applyStandardMode(std){
    // IEC 62477 shares the IEC input layout (pollution degree, material group,
    // OVC, isolation, system voltage). Map iec62477 → iec for UI visibility.
    var uiStd = (std === 'iec62477') ? 'iec' : std;
    document.querySelectorAll("[data-standard]").forEach(function(el){
      if(el.getAttribute("data-standard") === uiStd){
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
      return;
    }

    // Read global params from DOM
    var pd  = +document.getElementById("sPd").value||2;
    var mg  = document.getElementById("sMg").value||"ii";
    var alt = +document.getElementById("sAlt").value||2000;
    var std = document.getElementById("sStd").value||"iec";

    /* ── P1-4: Input validation helpers ─── */
    var warns=[];
    function w(msg){warns.push(msg)}
    function cl(v,lo,hi,name){if(v<lo||v>hi){w(name+" "+v+" → "+_t("param.corrected")+" "+Math.max(lo,Math.min(hi,v)));return Math.max(lo,Math.min(hi,v))}return v}

    // P1-4: Validate altitude
    alt = cl(alt,0,20000,_t("param.altitude"));

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

    // P1-4: Validate system voltages
    sysVAC = cl(sysVAC,0,15000,_t("param.acv"));
    sysVDC = cl(sysVDC,0,15000,_t("param.dcv"));

    /* ── Impulse withstand voltage per IEC 62109-1 Table 12 ──── */
    var IMPULSE_TBL_AC = [
      [50,   0.33,  0.5,   0.8,   1.5],
      [100,  0.5,   0.8,   1.5,   2.5],
      [150,  0.8,   1.5,   2.5,   4.0],
      [300,  1.5,   2.5,   4.0,   6.0],
      [600,  2.5,   4.0,   6.0,   8.0],
      [1000, 4.0,   6.0,   8.0,   12.0]
    ];
    var IMPULSE_TBL_DC = [
      [71,   0.33,  0.5,   0.8,   1.5],
      [141,  0.5,   0.8,   1.5,   2.5],
      [213,  0.8,   1.5,   2.5,   4.0],
      [424,  1.5,   2.5,   4.0,   6.0],
      [849,  1.5,   4.0,   6.0,   8.0],
      [1500, 2.5,   6.0,   8.0,   12.0]
    ];

    function impulseFor(ovcNum, sysV, interp, circType){
      var ov = Math.min(ovcNum || 2, 4);
      var tbl = (circType === 'dc') ? IMPULSE_TBL_DC : IMPULSE_TBL_AC;
      for(var i=0; i<tbl.length; i++){
        if(sysV == tbl[i][0]) return tbl[i][ov];
        if(sysV < tbl[i][0]){
          if(!interp || i==0) return tbl[i][ov];
          var x0=tbl[i-1][0], x1=tbl[i][0];
          var y0=tbl[i-1][ov], y1=tbl[i][ov];
          return Math.round((y0+(sysV-x0)/(x1-x0)*(y1-y0))*100)/100;
        }
      }
      return tbl[tbl.length-1][ov];
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
    var impAC, impDC;
    if (std === 'iec62477') {
      // IEC 62477-1 Table 9 — impulse values same as 62109 Table 12 but
      // DC system-voltage breakpoints differ (75/150/225/450/900/1500).
      impAC = SM.lookupImpulse62477(sysVAC, ovc_AC, false);
      impDC = SM.lookupImpulse62477(sysVDC, ovc_DC, true, 'dc');
    } else {
      impAC = impulseFor(ovc_AC, sysVAC, false);
      impDC = impulseFor(ovc_DC, sysVDC, true, 'dc');
      /* PV circuit rule: minimum 2.5 kV per IEC 62109-1 §7.3.7.1.2b */
      if(impDC < 2.5) impDC = 2.5;
    }

    // Impulse level stepping helpers (for within-circuit reduction display)
    var IMPULSE_LEVELS = [0.33, 0.5, 0.8, 1.5, 2.5, 4.0, 6.0, 8.0];
    function prevImpLevel(kv){
      for(var i=1; i<IMPULSE_LEVELS.length; i++){
        if(IMPULSE_LEVELS[i] >= kv) return IMPULSE_LEVELS[Math.max(0, i-1)];
      }
      return kv;
    }

    /* ── Display impulse + TOV info in #sImpulseInfo (IEC / IEC 62477) ─── */
    if(std === 'iec' || std === 'iec62477'){
      (function(){
        var el = document.getElementById("sImpulseInfo");
        if(!el) return;
        var ovcLabel = function(n){return {1:'I',2:'II',3:'III',4:'IV'}[n]||'II';};
        var tovAC_info = std === 'iec62477' ? SM.lookupTov62477(sysVAC) : tovFor(sysVAC);
        var stdRef = std === 'iec62477' ? 'IEC 62477-1 Table 9' : 'IEC 62109-1 Table 12';
        el.innerHTML =
          '<div><span class="imp-label">'+_t("safe.imp.acLbl")+'</span> ' +
          '<span class="imp-val">'+impAC+' kV</span> ' +
          '<span class="imp-sub">(OVC '+ovcLabel(ovc_AC)+', V='+sysVAC+'V, '+stdRef+')</span></div>' +
          '<div><span class="imp-label">'+_t("safe.imp.dcLbl")+'</span> ' +
          '<span class="imp-val">'+impDC+' kV</span> ' +
          '<span class="imp-sub">(OVC '+ovcLabel(ovc_DC)+', V='+sysVDC+'V)</span></div>' +
          '<div><span class="imp-label">'+_t("safe.imp.tovLbl")+'</span> ' +
          '<span class="imp-tov">'+(tovAC_info.peak/1000).toFixed(2)+' kV pk / '+(tovAC_info.rms/1000).toFixed(2)+' kV rms</span></div>';
      })();
    } else {
      /* ── UL mode: show system voltage info instead of impulse/TOV ─── */
      (function(){
        var el = document.getElementById("sImpulseInfo");
        if(!el) return;
        el.innerHTML =
          '<span class="imp-label">'+_t("safe.imp.ulTitle")+'</span><br>' +
          _t("safe.imp.ulAc")+': <strong>'+sysVAC+' V</strong> → '+((sysVAC/1000).toFixed(2))+' kVRMS | '+_t("safe.imp.ulDc")+': <strong>'+sysVDC+' V</strong> → '+((sysVDC/1000).toFixed(2))+' kVRMS<br>' +
          '<span class="imp-sub">'+_t("safe.imp.ulNote")+'</span>';
      })();
    }

    // Build nodes array for model
    var nodeArr=[];
    nodes.forEach(function(seg,i){
      var vrms = +seg.querySelector(".svrms").value || 0;
      // P1-4: Validate node vrms
      vrms = cl(vrms,0,15000,_t("param.nodeV",{n:i+1}));
      nodeArr.push({
        name: seg.querySelector(".sname").value || _t("param.node")+(i+1),
        vrms: vrms,
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
      // P1-7: Error boundary — show error in #safeWarn
      console.error("SafetyModel.calcSafety error:", e);
      var swn=document.getElementById("safeWarn");
      if(swn){swn.textContent=_t("common.warn.calcErr")+" "+e.message;swn.style.display="block"}
      return;
    }
    if(!result){
      document.getElementById("sRtb").innerHTML="";
      return;
    }

    // P1-4: Show warnings if any clamping occurred
    (function(){var el=document.getElementById("safeWarn");if(warns.length){el.textContent="⚠ "+warns.join("; ");el.style.display="block"}else{el.style.display="none"}})();

    // Render results to DOM
    var tb="";
    result.results.forEach(function(r,i){
      var gndMark = r.toGnd ? '<span style="color:#2563eb;font-size:.7rem" title="'+_t("safe.tip.gndIns")+'">⊕</span>' : '';
      var withinNote = !r.toGnd ? ' <span style="color:#64748b;font-size:.65rem" title="'+_t("safe.tip.lineDerate")+'">↓1OVC</span>' : '';
      var warnNote = r.forcedReinforced ? ' <span style="color:#f59e0b;font-size:.7rem" title="'+_t("safe.tip.forced")+'">'+_t("safe.chain.forcedReinf")+'</span>' : '';
      var peakWarn = (r.recurringPeakOk === false) ? ' <span style="color:#ef4444;font-size:.7rem" title="'+_t("safe.tip.peakOver")+'">🔴 '+_t("safe.chain.warnPeak")+'</span>' : '';
      var t241Warn = r.tbl241Note ? ' <span style="color:#f59e0b;font-size:.7rem" title="'+_t("safe.tip.t241")+'">⚠T24.1</span>' : '';
      var crFloorNote = r.crFloorApplied ? ' <span style="color:#64748b;font-size:.65rem" title="爬电距离不低于电气间隙 (Cr≥Cl)">Cr≥Cl</span>' : '';
      var iiiBNote = r.grIIIbNoData ? ' <span style="color:#f59e0b;font-size:.7rem" title="'+_t("safe.chain.warnIIIb62477")+'">IIIb→IIIa</span>' : '';
      var pcbLabel = r.pcb ? _t("safe.pcb.yes") : _t("safe.pcb.no");
      tb+="<tr><td>"+(i+1)+"</td><td>"+r.name+" "+gndMark+"</td><td>"+r.vrms+"</td><td>"+_t(r.insL)+warnNote+withinNote+"</td><td>"+pcbLabel+"</td><td>"+r.reqClr+t241Warn+"</td><td>"+r.reqCrp+crFloorNote+iiiBNote+peakWarn+"</td></tr>";
    });
    document.getElementById("sRtb").innerHTML=tb;

    // Store for report/export
    var ovc_AC_val = document.getElementById('sOvc_AC').value;
    var ovc_DC_val = document.getElementById('sOvc_DC').value;
    var altk = SM.altFactor(alt);
    window._sd={results:result.results,pd:pd,mg:mg,alt:alt,altk:altk,std:std,impAC:impAC,impDC:impDC,ovc_AC:ovc_AC_val,ovc_DC:ovc_DC_val,isolation:iso,sysVAC:sysVAC,sysVDC:sysVDC};
  }

  /* ── Report generation (DOM-only) ───────── */
    /* ── Build per-node calculation chain as plain text ─── */
  function buildCalcChains(d){
    if(!d||!d.results||!d.results.length)return "";
    var html="";

    /* ── Voltage calculation summary (before per-node details) ─── */
    if(d.std === 'iec' || d.std === 'iec62477'){
      var ovcLabel = function(n){return {1:'I',2:'II',3:'III',4:'IV'}[n]||'II';};
      var is62477 = (d.std === 'iec62477');
      var tblRef = is62477 ? 'Table 9' : 'Table 12';
      var tovInfo = is62477 ? (typeof SM.lookupTov62477 === 'function' ? SM.lookupTov62477(d.sysVAC) : null)
                            : (typeof SM.lookupTov === 'function' ? SM.lookupTov(d.sysVAC) : null);
      html += "<div style=margin:6px 0;padding:10px 14px;border-left:3px solid #7c3aed;background:#f5f3ff;font-size:.85rem;line-height:1.7>";
      html += "<strong>冲击电压与暂态过电压确定 (" + (is62477 ? 'IEC 62477-1 ' : '') + tblRef + ")</strong><br>";
      html += "&nbsp;&nbsp;AC侧: 系统电压 " + d.sysVAC + " V, OVC " + ovcLabel(d.ovc_AC) + " → 冲击电压 = <strong>" + d.impAC + " kV</strong> (电网电路，不允许插值，向上取整)<br>";
      html += "&nbsp;&nbsp;DC侧: 系统电压 " + d.sysVDC + " V, OVC " + ovcLabel(d.ovc_DC);
      if(d.isolation === 'isolated') html += " (隔离降档)";
      html += " → 冲击电压 = <strong>" + d.impDC + " kV</strong>";
      if(!is62477 && d.impDC <= 2.5) html += " (PV最低2.5kV)";
      html += " (PV电路，允许插值)<br>";
      if(tovInfo){
        html += "&nbsp;&nbsp;暂态过电压: " + tblRef + " 第6列 → " + (tovInfo.peak/1000).toFixed(2) + " kV pk / " + (tovInfo.rms/1000).toFixed(2) + " kV rms (仅电网电路)<br>";
      }
      html += "</div>";
    }
    d.results.forEach(function(r,i){
      var mult = SM.INS_K[r.effIns] || SM.INS_K[r.ins] || 1;
      var txt="<div style=margin:6px 0;padding:10px 14px;border-left:3px solid #2563eb;background:#f8fafc;font-size:.85rem;line-height:1.7>";
      // Node header + input params
      var gndMark = r.toGnd ? ' ⊕' : ' ↓';
      txt += "<strong>" + (i+1) + ". " + r.name + gndMark + "</strong><br>";
      txt += _t("safe.chain.workV") + ": " + r.vrms + " Vrms | " + _t(r.insL) + " ("+_t("safe.chain.mul")+": ×" + mult + ")<br>";

      // ── Clearance chain ──
      if(d.std === 'ul'){
        var sysKV = (r.circ === 'dc' ? d.sysVDC : d.sysVAC);
        var sysKVRMS = (sysKV / 1000).toFixed(3);
        txt += "<strong>" + _t("safe.chain.clr") + "</strong> "+_t("safe.chain.sysV") + " " + sysKV + " V (" + sysKVRMS + " kVRMS), " + _t("safe.chain.ulTable");
        if(r.interpUsed) txt += " <span style=\"color:#2563eb;font-weight:600\">("+_t("safe.chain.interpUsed")+")</span>";
        if(mult > 1) txt += ", " + _t("safe.chain.insMult")+": ×" + mult;
        var clrBase = (r.reqClr / d.altk).toFixed(2);
        txt += "<br>" + _t("safe.chain.altK") + ": k=" + d.altk + " (" + d.alt + " m) → " + _t("safe.chain.reqClr") + " = " + clrBase + " × " + d.altk + " = <strong>" + r.reqClr + " mm</strong>";
      } else {
        // IEC clearance with full detail chain
        var det = r.clrDetail;
        var clrTblRef = (d.std === 'iec62477') ? 'IEC 62477-1 Table 10' : _t("safe.chain.clrT13");
        txt += "<strong>" + _t("safe.chain.clrIec") + "</strong><br>";
        if(det){
          if(det.type === 'reinf'){
            txt += "&nbsp;&nbsp;" + _t("safe.chain.clrA") + ": " + det.impKV + " kV " + clrTblRef + " = <span style=\"font-weight:600\">" + det.clrA + " mm</span><br>";
            txt += "&nbsp;&nbsp;" + _t("safe.chain.clrB") + ": " + det.wrkPeak + " V × 1.6 " + clrTblRef + " = <span style=\"font-weight:600\">" + det.clrB + " mm</span><br>";
            if(det.clrC !== undefined){
              txt += "&nbsp;&nbsp;" + _t("safe.chain.clrC") + ": " + (det.tovPeakV/1000).toFixed(2) + " kV × 1.6 " + clrTblRef + " = <span style=\"font-weight:600\">" + det.clrC + " mm</span><br>";
            } else {
              txt += "&nbsp;&nbsp;" + _t("safe.chain.clrCna") + "<br>";
            }
          } else if(det.type === 'func'){
            txt += "&nbsp;&nbsp;" + _t("safe.chain.clrImp") + ": " + det.impKV + " kV " + clrTblRef + " = <span style=\"font-weight:600\">" + det.cImp + " mm</span><br>";
            if(det.cWk !== undefined){
              txt += "&nbsp;&nbsp;" + _t("safe.chain.clrWk") + ": " + det.wrkPeak + " V " + clrTblRef + " = <span style=\"font-weight:600\">" + det.cWk + " mm</span><br>";
            }
          } else {
            // basic/supp
            txt += "&nbsp;&nbsp;" + _t("safe.chain.clrImp") + ": " + det.impKV + " kV " + clrTblRef + " = <span style=\"font-weight:600\">" + det.cImp + " mm</span><br>";
            if(det.cTov !== undefined){
              txt += "&nbsp;&nbsp;" + _t("safe.chain.clrC") + ": " + (det.tovPeakV/1000).toFixed(2) + " kV × 1.6 " + clrTblRef + " = <span style=\"font-weight:600\">" + det.cTov + " mm</span><br>";
            } else {
              txt += "&nbsp;&nbsp;" + _t("safe.chain.clrCna") + "<br>";
            }
            txt += "&nbsp;&nbsp;" + _t("safe.chain.clrWk") + ": " + det.wrkPeak + " V " + clrTblRef + " = <span style=\"font-weight:600\">" + det.cWk + " mm</span><br>";
          }
          // Final clearance with altitude factor
          var clrBase = (r.reqClr / d.altk).toFixed(2);
          txt += "&nbsp;&nbsp;→ 取最严苛值 <strong>" + clrBase + " mm</strong> × 海拔系数 k=" + d.altk + " (" + d.alt + " m) = <strong>" + r.reqClr + " mm</strong>";
        } else {
          // Fallback for UL or missing detail
          var impKV = (r.circ === 'dc' ? d.impDC : d.impAC);
          if(!r.toGnd){ impKV = Math.round((impKV * 0.6) * 10) / 10; }
          txt += _t("safe.chain.impulseV") + " " + impKV + " kV" + ", " + _t("safe.chain.iecTable");
          var clrBase = (r.reqClr / d.altk).toFixed(2);
          txt += ", " + _t("safe.chain.altK") + " k=" + d.altk + " → " + _t("safe.chain.reqClr") + " = " + clrBase + " × " + d.altk + " = <strong>" + r.reqClr + " mm</strong>";
        }
      }

      // ── Creepage chain ──
      var crpBaseVal = r.baseCrp !== undefined ? r.baseCrp : (r.reqCrp / mult);
      var crpBase = crpBaseVal.toFixed(2);
      if(d.std === 'ul'){
        txt += "<br><strong>" + _t("safe.chain.crp") + "</strong> "+_t("safe.chain.workV") + " " + r.vrms + " V, PD" + d.pd + ", MG-II, " + _t("safe.chain.ulTableBase");
        txt += " ~" + crpBase + " mm";
        if(mult > 1) txt += " × " + _t("safe.chain.insMult") + "×" + mult;
        if(r.crFloorApplied) txt += " → Cr≥Cl: " + r.reqClr + " mm";
        txt += " → " + _t("safe.chain.reqCrp") + " = <strong>" + r.reqCrp + " mm</strong>";
      } else {
        var iec62477Tbl = (d.std === 'iec62477') ? 'IEC 62477-1 Table 11' : _t("safe.chain.iecTableBase");
        txt += "<br><strong>" + _t("safe.chain.crpIec") + "</strong> "+_t("safe.chain.workV") + " " + r.vrms + " V, PD" + d.pd + ", MG-" + (d.mg||'II').toUpperCase() + ", " + iec62477Tbl;
        txt += " ~" + crpBase + " mm";
        if(mult > 1) txt += " × " + _t("safe.chain.insMult") + "×" + mult;
        if(r.crFloorApplied) txt += " → Cr≥Cl: " + r.reqClr + " mm";
        txt += " → " + _t("safe.chain.reqCrp") + " = <strong>" + r.reqCrp + " mm</strong>";
      }

      // ── Warnings/notes ──
      if(r.forcedReinforced) txt += "<br><span style=color:#f59e0b>" + _t("safe.chain.warnGnd2") + "</span>";
      if(r.grIIIbNoData) txt += "<br><span style=color:#f59e0b>" + _t("safe.chain.warnIIIb62477") + "</span>";
      if(r.tbl241Note) txt += "<br><span style=color:#f59e0b>" + _t("safe.chain.warnT241b") + "</span>";
      if(r.recurringPeakOk === false) txt += "<br><span style=color:#ef4444>" + _t("safe.chain.warnPeakB") + "</span>";
      txt += "</div>";
      html += txt;
    });
    return html;
}

  function sGenRep(){
    var d=window._sd;
    if(!d||!d.results||!d.results.length){document.getElementById("sRc").innerHTML="<h3>"+_t("safe.report.rptTitle")+"</h3><p>"+_t("safe.report.hint")+"</p>";return;}

    // Show export button after report generation
    var eg=document.getElementById('exportSafeGroup');if(eg)eg.style.display='';
    var n=new Date(),locale=_getLang()==='en'?'en-US':'zh-CN',ds=n.toLocaleDateString(locale,{year:"numeric",month:"2-digit",day:"2-digit"}),ts=n.toLocaleTimeString(locale,{hour:"2-digit",minute:"2-digit"});
    var sr="";d.results.forEach(function(r){var g=r.toGnd?' '+_t("safe.chain.toGnd"):' '+_t("safe.chain.lineLine");var f=r.forcedReinforced?' '+_t("safe.chain.forcedReinf"):'';var pw=(r.recurringPeakOk===false)?' '+_t("safe.chain.warnPeak"):'';var t241=r.tbl241Note?' '+_t("safe.chain.warnT241"):'';var iiiB=r.grIIIbNoData?' '+_t("safe.chain.warnIIIb62477"):'';var pcb=r.pcb?_t("safe.pcb.yes"):_t("safe.pcb.no");sr+="<tr><td>"+(d.results.indexOf(r)+1)+"</td><td>"+r.name+g+"</td><td>"+r.vrms+"</td><td>"+_t(r.insL)+f+"</td><td>"+pcb+"</td><td>"+r.reqClr+t241+"</td><td>"+r.reqCrp+iiiB+pw+"</td></tr>";});

    var isoLabel = (d.isolation==='isolated')?_t("safe.report.iso.yes"):_t("safe.report.iso.no");

    /* ── Read system voltage from correct input based on standard ─── */
    var sysVAC_el = d.std === 'ul' ? document.getElementById('sSysV_AC_ul') : document.getElementById('sSysV_AC');
    var sysVDC_el = d.std === 'ul' ? document.getElementById('sSysV_DC_ul') : document.getElementById('sSysV_DC');
    var sysVAC_val = (sysVAC_el?sysVAC_el.value:'-');
    var sysVDC_val = (sysVDC_el?sysVDC_el.value:'-');

    /* ── Build base params table based on standard ─── */
    var baseTable;
    if(d.std === 'iec' || d.std === 'iec62477'){
      baseTable=
        "<tr><td>"+_t("safe.report.std")+"</td><td>"+sot("sStd")+"</td></tr>"
        +"<tr><td>"+_t("safe.report.pd")+"</td><td>PD "+d.pd+"</td></tr>"
        +"<tr><td>"+_t("safe.report.mg")+"</td><td>"+sot("sMg")+"</td></tr>"
        +"<tr><td>"+_t("safe.report.alt")+"</td><td>"+d.alt+"m (k="+d.altk+")</td></tr>"
        +"<tr><td>"+_t("safe.report.iso")+"</td><td>"+isoLabel+"</td></tr>"
        +"<tr><td>"+_t("safe.report.acOvc")+"</td><td>OVC "+(d.ovc_AC?d.ovc_AC.toUpperCase():'II')+" ("+d.impAC+' kV)'+"</td></tr>"
        +"<tr><td>"+_t("safe.report.dcOvc")+"</td><td>OVC "+(d.ovc_DC?d.ovc_DC.toUpperCase():'II')+" ("+d.impDC+' kV)' +(d.isolation==='isolated'?' <em>'+_t("safe.word.addNote")+'</em>':'')+ "</td></tr>"
        +"<tr><td>"+_t("safe.report.acV")+"</td><td>"+sysVAC_val+' V'+'</td></tr>'
        +"<tr><td>"+_t("safe.report.dcV")+"</td><td>"+sysVDC_val+' V'+'</td></tr>';
    } else {
      baseTable=
        "<tr><td>"+_t("safe.report.std")+"</td><td>"+sot("sStd")+"</td></tr>"
        +"<tr><td>"+_t("safe.report.pd")+"</td><td>PD "+d.pd+" (UL §25.4a)</td></tr>"
        +"<tr><td>"+_t("safe.report.mg")+"</td><td>II (CTI >= 100, UL §25.4d)</td></tr>"
        +"<tr><td>"+_t("safe.ovc.ac")+"</td><td>OVC IV (UL §25.4b)</td></tr>"
        +"<tr><td>"+_t("safe.report.alt")+"</td><td>"+d.alt+"m (k="+d.altk+")</td></tr>"
        +"<tr><td>"+_t("safe.report.acV")+"</td><td>"+sysVAC_val+' V ('+((+sysVAC_val/1000).toFixed(2))+' kVRMS)'+ "</td></tr>"
        +"<tr><td>"+_t("safe.report.dcV")+"</td><td>"+sysVDC_val+' V ('+((+sysVDC_val/1000).toFixed(2))+' kVRMS)'+ "</td></tr>";
    }

    document.getElementById("sRc").innerHTML=
      (document.getElementById('sProjName').value?'<p><strong>'+_t("safe.report.proj")+': </strong>'+document.getElementById('sProjName').value+'</p>':'')
      +"<h3>1. "+_t("safe.report.projInfo")+"</h3><table><tr><th>"+_t("safe.report.std")+"</th><th>"+sot("sStd")+"</th></tr>"
        +"<tr><td>"+_t("safe.report.proj")+"</td><td>"+(document.getElementById('sProjName').value||'-')+"</td></tr></table>"
      +"<h3>2. "+_t("safe.report.basic")+"</h3><table><tr><th>"+_t("safe.report.params")+"</th><th>"+_t("safe.report.val")+"</th></tr>"+baseTable+"</table>"
      +"<h3>3. "+_t("safe.report.nodes")+"</h3><table><tr><th>#</th><th>"+_t("safe.res.node")+"</th><th>"+_t("safe.nodeHdr.vrms")+"</th><th>"+_t("safe.res.ins")+"</th><th>"+_t("safe.nodeHdr.pcb")+"</th><th>"+_t("safe.res.clr")+"</th><th>"+_t("safe.res.crp")+"</th></tr>"+sr+"</table>"
      +"<h3>4. "+_t("safe.report.calcProc")+"</h3>" + buildCalcChains(d)
      +"<p style=margin:8px 0;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px><strong>"+_t("safe.report.conclusion")+":</strong> "+_t("safe.report.conclusionText")+"</p>"
      +"<div class=rep-footer><span>"+_t("safe.report.footer")+" v1.0</span><span>"+_t("cap.report.date")+": "+ds+" "+ts+"</span></div>";
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
    d.results.forEach(function(r,i){var g=r.toGnd?' '+_t("safe.chain.toGnd"):' '+_t("safe.chain.lineLineShort");var pw=(r.recurringPeakOk===false)?' '+_t("safe.chain.warnPeak"):'';var t241=r.tbl241Note?' '+_t("safe.chain.warnT241"):'';var iiiB=r.grIIIbNoData?' '+_t("safe.chain.warnIIIb62477"):'';var pcb=r.pcb?_t("safe.pcb.yes"):_t("safe.pcb.no");sr+='<tr><td>'+(i+1)+'</td><td>'+r.name+g+'</td><td>'+r.vrms+'</td><td>'+_t(r.insL)+'</td><td>'+pcb+'</td><td>'+r.reqClr+t241+'</td><td>'+r.reqCrp+iiiB+pw+'</td></tr>'});

    var isoLabel = (d.isolation==='isolated')?_t("safe.report.iso.yes"):_t("safe.report.iso.no");
    var n=new Date(),locale=_getLang()==='en'?'en-US':'zh-CN',ds=n.toLocaleDateString(locale,{year:"numeric",month:"2-digit",day:"2-digit"});

    /* ── Read system voltage from correct input based on standard ─── */
    var sysVAC_el = d.std === 'ul' ? document.getElementById('sSysV_AC_ul') : document.getElementById('sSysV_AC');
    var sysVDC_el = d.std === 'ul' ? document.getElementById('sSysV_DC_ul') : document.getElementById('sSysV_DC');
    var sysVAC_val = (sysVAC_el?sysVAC_el.value:'-');
    var sysVDC_val = (sysVDC_el?sysVDC_el.value:'-');

    /* ── Build project info + base params based on standard ─── */
    var projInfo, baseParams;
    if(d.std === 'iec' || d.std === 'iec62477'){
      projInfo=
        '<tr><td>'+_t("safe.report.std")+'</td><td>'+sot("sStd")+'</td></tr>'
        +'<tr><td>'+_t("safe.report.proj")+'</td><td>'+(pn||'-')+'</td></tr>';
      baseParams=
        '<tr><td>'+_t("safe.report.pd")+'</td><td>PD '+d.pd+'</td></tr>'
        +'<tr><td>'+_t("safe.report.mg")+'</td><td>'+sot("sMg")+'</td></tr>'
        +'<tr><td>'+_t("safe.report.alt")+'</td><td>'+d.alt+'m ('+d.altk+')</td></tr>'
        +'<tr><td>'+_t("safe.report.acOvc")+'</td><td>OVC '+(d.ovc_AC?d.ovc_AC.toUpperCase():'II')+' ('+d.impAC+' kV)</td></tr>'
        +'<tr><td>'+_t("safe.report.dcOvc")+'</td><td>OVC '+(d.ovc_DC?d.ovc_DC.toUpperCase():'II')+' ('+d.impDC+' kV)' +(d.isolation==='isolated'?' '+_t("safe.word.addNote"):'')+'</td></tr>'
        +'<tr><td>'+_t("safe.report.acV")+'</td><td>'+sysVAC_val+' V</td></tr>'
        +'<tr><td>'+_t("safe.report.dcV")+'</td><td>'+sysVDC_val+' V</td></tr>'
        +'<tr><td>'+_t("safe.word.note")+'</td><td>'+(d.std === 'iec62477' ? _t("safe.word.noteIec62477") : _t("safe.word.noteIec"))+'</td></tr>';
    } else {
      projInfo=
        '<tr><td>'+_t("safe.report.std")+'</td><td>'+sot("sStd")+'</td></tr>'
        +'<tr><td>'+_t("safe.report.proj")+'</td><td>'+(pn||'-')+'</td></tr>';
      baseParams=
        '<tr><td>'+_t("safe.report.pd")+'</td><td>PD '+d.pd+' (UL §25.4a)</td></tr>'
        +'<tr><td>'+_t("safe.report.mg")+'</td><td>II (CTI >= 100, UL §25.4d)</td></tr>'
        +'<tr><td>'+_t("safe.report.alt")+'</td><td>'+d.alt+'m ('+d.altk+')</td></tr>'
        +'<tr><td>'+_t("safe.ovc.ac")+'</td><td>OVC IV (UL §25.4b)</td></tr>'
        +'<tr><td>'+_t("safe.report.acV")+'</td><td>'+sysVAC_val+' V ('+((+sysVAC_val/1000).toFixed(2))+' kVRMS)</td></tr>'
        +'<tr><td>'+_t("safe.report.dcV")+'</td><td>'+sysVDC_val+' V ('+((+sysVDC_val/1000).toFixed(2))+' kVRMS)</td></tr>'
        +'<tr><td>'+_t("safe.word.note")+'</td><td>'+_t("safe.word.noteUl")+'</td></tr>';
    }

    var h='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><title>'+_t("safe.word.title")+ts+'</title>';
    h+=css;
    h+='</head><body>';

    h+='<h2 class="title">'+_t("safe.word.title")+ts+'</h2>';
    h+='<p class="meta">'+_t("safe.word.rptNum")+': SA-'+(new Date().toLocaleDateString(locale).replace(/[\/-]/g,''))+'-'+(Math.floor(Math.random()*9000+1000))+'</p>';
    h+='<p class="meta">'+_t("safe.word.genDate")+': '+ds+'</p>';

    h+='<h3>1. '+_t("safe.word.projInfo")+'</h3>';
    h+='<table class="compact"><thead><tr><th>'+_t("safe.report.proj")+'</th><th>'+_t("safe.report.content")+'</th></tr></thead><tbody>'+projInfo+'</tbody></table>';

    h+='<h3>2. '+_t("safe.word.basic")+'</h3>';
    h+='<table class="compact"><thead><tr><th>'+_t("safe.report.params")+'</th><th>'+_t("safe.report.val")+'</th></tr></thead><tbody>'+baseParams+'</tbody></table>';

    h+='<h3>3. '+_t("safe.word.results")+'</h3>';
    h+='<table class="data-tbl"><thead><tr>'
      +'<th>#</th><th>'+_t("safe.word.node")+'</th><th>Vrms (V)</th><th>'+_t("safe.word.insLvl")+'</th><th>'+_t("safe.nodeHdr.pcb")+'</th><th>'+_t("safe.res.clr")+'</th><th>'+_t("safe.res.crp")+'</th>'
      +'</tr></thead><tbody>'+sr+'</tbody></table>';

    /* Footer */
    h+='<div class="footer">'+_t("safe.word.footer")+' | '+_t("safe.word.autoGen")+' '+ds+'</div>';
    h+='</body></html>';
    var b=new Blob([h],{type:'application/msword'});var dn=_t("safe.word.title")+(te.length?'('+te.join('-')+')':'')+'.doc';saveBlobWithDialog(b,dn);
  }

  /* ── Load nodes from defaults.json (called by app.js applyDefaults) ─── */
  function loadNodesFromDefaults(nodes){
    if(!Array.isArray(nodes)||!nodes.length)return false;
    var sN=document.getElementById('sN');if(sN)sN.innerHTML='';
    nodes.forEach(function(n,idx){
      sN.insertAdjacentHTML('beforeend',mNode(snid++,idx,n.name||'',n.vrms||0,n.ins||'basic',
        n.pcb||0,n.coat||0,n.interp||false,n.circ||'ac',n.toGnd));
    });
    // FIX Bug #4: after loading nodes from defaults, derive DC OVC only if not manually overridden
    if(typeof autoDeriveDC==='function' && !dcManualOverride)autoDeriveDC();
    var btn=document.getElementById("addNodeBtn");if(btn)btn.onclick=sAddNode;
    sCalc();
  }

  /* ── Refresh dynamic node labels on lang change ─── */
  function refreshNodeLabels(){
    document.querySelectorAll("#sN .snode").forEach(function(row){
      // Rebuild select options for insulation, PCB, coating, toGnd
      var ins=row.querySelector(".sins");if(ins)refreshSelect(ins,"safe.ins.func","safe.ins.basic","safe.ins.supp","safe.ins.reinf");
      var pcb=row.querySelector(".spcb");if(pcb)refreshSelect(pcb,"safe.pcb.no","safe.pcb.yes");
      var coat=row.querySelector(".scoat");if(coat)refreshSelect(coat,"safe.coat.no","safe.coat.t1","safe.coat.t2");
      var gnd=row.querySelector(".stoGnd");if(gnd)refreshSelect(gnd,"safe.gnd.no","safe.gnd.yes");
      var circ=row.querySelector(".scirc");if(circ)refreshSelect(circ,"opt.value.ac","opt.value.dc");
    });
  }

  function refreshSelect(sel/*, key1, key2, ... */){
    var keys=Array.prototype.slice.call(arguments,1);
    Array.from(sel.options).forEach(function(opt,idx){
      if(keys[idx])opt.textContent=_t(keys[idx]);
    });
  }

  /* ── Init ──────────────────────── */
  function initSafety(defaultNodes){
// FIX Bug #4: handle race where initSafety was already called with fallback,
// but defaults have now arrived via applyDefaults -> loadNodesFromDefaults
    var hasNodes = document.querySelector("#sN [data-id]");
    if(hasNodes) return;

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
    /* Skip if DC OVC was already loaded from defaults (not the HTML default "ii") */
    var dcOvcEl = document.getElementById('sOvc_DC');
    if(dcOvcEl && dcOvcEl.value !== 'ii'){
      dcManualOverride = true;
    } else if(!dcManualOverride){
      autoDeriveDC();
    }

    /* Apply standard-specific UI mode (IEC by default) */
    applyStandardMode(document.getElementById("sStd").value || "iec");

    sCalc();
  }

  /* ── Expose to global scope (no eval) ───── */
  global.mNode = mNode; global.sNChange = sNChange; global.sAddNode = sAddNode;
  global.sRmNode = sRmNode; global.sReNum = sReNum; global.sCalc = sCalc;
  global.buildCalcChains = buildCalcChains; global.sGenRep = sGenRep;
  global.sExportReport = sExportReport; global.loadNodesFromDefaults = loadNodesFromDefaults;
  global.refreshNodeLabels = refreshNodeLabels;

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
    // Manual override of DC OVC → stop auto-derivation
    if(t.id === 'sOvc_DC'){
      dcManualOverride = true;
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
  global.setDcManualOverride = function(v){ dcManualOverride = v; };

})(window);
