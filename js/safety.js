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
      document.getElementById("sMa").innerHTML="<p>"+_t("safe.msg.addNode")+"</p>";
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
        var isoNote = iso==='isolated'?'<span class="imp-note">'+_t("safe.imp.isoDown")+'</span>':'<span class="imp-note">'+_t("safe.imp.noIso")+'</span>';
        el.innerHTML =
          '<div><span class="imp-label">'+_t("safe.imp.acLbl")+'</span> ' +
          '<span class="imp-val">'+impAC+' kV</span> ' +
          '<span class="imp-sub">(OVC '+ovcLabel(ovc_AC)+', V='+sysVAC+'V)</span></div>' +
          '<div><span class="imp-label">'+_t("safe.imp.dcLbl")+'</span> ' +
          '<span class="imp-val">'+impDC+' kV</span> ' +
          '<span class="imp-sub">(OVC '+ovcLabel(ovc_DC)+', V='+sysVDC+'V)</span> '+isoNote+'</div>' +
          '<div><span class="imp-label">'+_t("safe.imp.tovLbl")+'</span> ' +
          '<span class="imp-tov">'+(tovAC_info.peak/1000).toFixed(2)+' kV pk / '+(tovAC_info.rms/1000).toFixed(2)+' kV rms</span></div>' +
          '<div class="imp-footer">' +
          _t("safe.imp.lineNote")+': AC '+prevImpLevel(impAC)+' kV, DC '+Math.max(prevImpLevel(impDC), 2.5)+' kV' +
          '<br><span style="font-style:italic">'+_t("safe.imp.iecRef")+'</span></div>';
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
      document.getElementById("sMa").innerHTML="<p>"+_t("safe.msg.checkNode")+"</p>";
      return;
    }

    // P1-4: Show warnings if any clamping occurred
    (function(){var el=document.getElementById("safeWarn");if(warns.length){el.textContent="⚠ "+warns.join("; ");el.style.display="block"}else{el.style.display="none"}})();

    // Render results to DOM
    var tb="";
    result.results.forEach(function(r,i){
      var gndMark = r.toGnd ? '<span style="color:#2563eb;font-size:.7rem" title="'+_t("safe.tip.gndIns")+'">⊕</span>' : '';
      var withinNote = !r.toGnd ? ' <span style="color:#64748b;font-size:.65rem" title="'+_t("safe.tip.lineDerate")+'">↓1OVC</span>' : '';
      var warnNote = r.forcedReinforced ? ' <span style="color:#f59e0b;font-size:.7rem" title="'+_t("safe.tip.forced")+'">⚠ '+_t("safe.chain.forcedReinf")+'</span>' : '';
      var peakWarn = (r.recurringPeakOk === false) ? ' <span style="color:#ef4444;font-size:.7rem" title="'+_t("safe.tip.peakOver")+'">🔴 '+_t("safe.chain.warnPeak")+'</span>' : '';
      var t241Warn = r.tbl241Note ? ' <span style="color:#f59e0b;font-size:.7rem" title="'+_t("safe.tip.t241")+'">⚠T24.1</span>' : '';
      tb+="<tr><td>"+(i+1)+"</td><td>"+r.name+" "+gndMark+"</td><td>"+r.vrms+"</td><td>"+r.insL+warnNote+withinNote+"</td><td>"+r.reqClr+t241Warn+"</td><td>"+r.reqCrp+peakWarn+"</td></tr>";
    });
    document.getElementById("sRtb").innerHTML=tb;

    var altk = SM.altFactor(alt);
    var ah="<p style=margin-bottom:6px><strong>"+_t("safe.res.req")+"</strong></p>";
    ah+="<p style=font-size:.85rem>"+_t("safe.report.std")+": "+sot("sStd")+" | PD: "+pd+" | "+_t("safe.report.mg")+": "+sot("sMg")+" | "+_t("safe.report.alt")+": "+alt+"m (k="+altk+")</p>";
    if(std === 'iec'){
      var isoLabel = iso==='isolated'?_t("safe.report.iso.yes"):_t("safe.report.iso.no");
      ah+="<p style=font-size:.82rem;color:#64748b>"+_t("safe.report.iso")+": "+isoLabel+"</p>";
      ah+="<p style=font-size:.82rem;color:#64748b>"+_t("safe.report.conclusion")+":</p><ul style=font-size:.82rem;color:#64748b;margin:2px 0 0 16px;line-height:1.7>";
      ah+='<li><strong>'+_t("safe.note.gnd")+'</strong>(⊕): '+_t("safe.note.clrIec")+'</li>';
      ah+='<li><strong>'+_t("safe.note.line")+'</strong>(↓1OVC): '+_t("safe.note.reinfIec")+'</li>';
      ah+='<li>'+_t("safe.note.crpIec")+'</li>';
      ah+='<li style="color:#f59e0b;font-weight:500">'+_t("safe.note.warnIns")+'</li>';
      ah+='</ul>';
    } else {
      ah+="<p style=font-size:.82rem;color:#64748b>"+_t("safe.report.conclusion")+":</p><ul style=font-size:.82rem;color:#64748b;margin:2px 0 0 16px;line-height:1.7>";
      ah+='<li><strong>'+_t("safe.note.clrUl")+'</strong></li>';
      ah+='<li>'+_t("safe.note.reinfUl")+'</li>';
      ah+='<li>'+_t("safe.note.crpUl")+'</li>';
      ah+='<li style="color:#f59e0b;font-weight:500">'+_t("safe.note.warnUl")+'</li>';
      ah+='<li style="color:#ef4444;font-weight:500">'+_t("safe.note.peakUl")+'</li>';
      ah+='<li style="color:#f59e0b;font-weight:500">'+_t("safe.note.t241")+'</li>';
      ah+='</ul>';
    }
    document.getElementById("sMa").innerHTML=ah;

    // Store for report/export
    var ovc_AC_val = document.getElementById('sOvc_AC').value;
    var ovc_DC_val = document.getElementById('sOvc_DC').value;
    window._sd={results:result.results,pd:pd,mg:mg,alt:alt,altk:altk,std:std,impAC:impAC,impDC:impDC,ovc_AC:ovc_AC_val,ovc_DC:ovc_DC_val,isolation:iso};
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
      txt += "<strong>" + (i+1) + ". " + r.name + "</strong>, ";
      txt += _t("safe.chain.workV") + " " + r.vrms + " Vrms, " + r.insL + " ("+_t("safe.chain.mul")+"×" + mult + "), ";
      // ── Clearance chain ──
      if(d.std === 'ul'){
        var sysKV = (r.circ === 'dc' ? d.sysVDC : d.sysVAC);
        var sysKVRMS = (sysKV / 1000).toFixed(3);
        txt += "Clearance: "+_t("safe.chain.sysV") + " " + sysKV + " V (" + sysKVRMS + " kVRMS), "+_t("safe.chain.ulTable");
        if(r.interpUsed) txt += " <span style=\"color:#2563eb;font-weight:600\">("+_t("safe.chain.interpUsed")+")</span>";
        txt += ", ";
        if(mult > 1) txt += _t("safe.chain.insMult")+"×" + mult + ", ";
        var clrBase = (r.reqClr / d.altk).toFixed(2);
        txt += _t("safe.chain.altK") + " k=" + d.altk + " (" + d.alt + " m), reqClearance = " + clrBase + " × " + d.altk + " = " + r.reqClr + " mm.";
      } else {
        var impKV = (r.circ === 'dc' ? d.impDC : d.impAC);
        if(!r.toGnd){ impKV = Math.round((impKV * 0.6) * 10) / 10; }
        txt += "Clearance: ";
        txt += _t("safe.chain.impulseV") + " " + impKV + " kV";
        if(!r.toGnd) txt += " ("+_t("safe.chain.lineDerate")+")";
        txt += ", "+_t("safe.chain.iecTable")+", ";
        if(mult > 1) txt += _t("safe.chain.insMult")+"×" + mult + ", ";
        var clrBase = (r.reqClr / d.altk).toFixed(2);
        txt += _t("safe.chain.altK") + " k=" + d.altk + " (" + d.alt + " m), reqClearance = " + clrBase + " × " + d.altk + " = " + r.reqClr + " mm.";
      }
      // ── Creepage chain ──
      if(d.std === 'ul'){
        txt += "Creepage: "+_t("safe.chain.workV") + " " + r.vrms + " V, "+_t("safe.chain.pd")+"PD" + d.pd + ", "+_t("safe.chain.mg")+"II, "+_t("safe.chain.ulTableBase");
        var crpBase = (r.reqCrp / mult).toFixed(2);
        txt += " ~" + crpBase + " mm, ";
        if(mult > 1) txt += _t("safe.chain.insMult")+"×" + mult + ", ";
        txt += "reqCreepage = " + r.reqCrp + " mm.";
      } else {
        txt += "Creepage: "+_t("safe.chain.workV") + " " + r.vrms + " V, "+_t("safe.chain.pd")+"PD" + d.pd + ", "+_t("safe.chain.mg")+(d.mg||'II')+", "+_t("safe.chain.iecTable");
        var crpBase = (r.reqCrp / mult).toFixed(2);
        txt += " ~" + crpBase + " mm, ";
        if(mult > 1) txt += _t("safe.chain.insMult")+"×" + mult + ", ";
        txt += "reqCreepage = " + r.reqCrp + " mm.";
      }
      // ── Warnings/notes ──
      if(r.forcedReinforced) txt += "<br><span style=color:#f59e0b>"+_t("safe.chain.warnGnd2")+"</span>";
      if(r.tbl241Note) txt += "<br><span style=color:#f59e0b>"+_t("safe.chain.warnT241b")+"</span>";
      if(r.recurringPeakOk === false) txt += "<br><span style=color:#ef4444>"+_t("safe.chain.warnPeakB")+"</span>";
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
    var n=new Date(),ds=n.toLocaleDateString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit"}),ts=n.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
    var sr="";d.results.forEach(function(r){var g=r.toGnd?' '+_t("safe.chain.toGnd"):' '+_t("safe.chain.lineLine");var f=r.forcedReinforced?' '+_t("safe.chain.forcedReinf"):'';var pw=(r.recurringPeakOk===false)?' '+_t("safe.chain.warnPeak"):'';var t241=r.tbl241Note?' '+_t("safe.chain.warnT241"):'';sr+="<tr><td>"+(d.results.indexOf(r)+1)+"</td><td>"+r.name+g+"</td><td>"+r.vrms+"</td><td>"+r.insL+f+"</td><td>"+r.reqClr+t241+"</td><td>"+r.reqCrp+pw+"</td></tr>";});

    var isoLabel = (d.isolation==='isolated')?_t("safe.report.iso.yes"):_t("safe.report.iso.no");

    /* ── Read system voltage from correct input based on standard ─── */
    var sysVAC_el = d.std === 'ul' ? document.getElementById('sSysV_AC_ul') : document.getElementById('sSysV_AC');
    var sysVDC_el = d.std === 'ul' ? document.getElementById('sSysV_DC_ul') : document.getElementById('sSysV_DC');
    var sysVAC_val = (sysVAC_el?sysVAC_el.value:'-');
    var sysVDC_val = (sysVDC_el?sysVDC_el.value:'-');

    /* ── Build base params table based on standard ─── */
    var baseTable;
    if(d.std === 'iec'){
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
      +"<h3>1. "+_t("safe.report.projInfo")+"</h3><table><tr><th>"+_t("safe.report.proj")+"</th><th>"+_t("safe.report.content")+"</th></tr>"
        +"<tr><td>"+_t("cap.report.warr")+"</td><td>SA-"+ds.replace(/\//g,"")+"-" +(1e3+Math.floor(9e3*Math.random()))+"</td></tr>"
        +"<tr><td>"+_t("safe.report.std")+"</td><td>"+ds+" "+ts+"</td></tr>"
        +"<tr><td>"+_t("safe.projName")+"</td><td>"+(document.getElementById('sProjName').value||'-')+"</td></tr></table>"
      +"<h3>2. "+_t("safe.report.basic")+"</h3><table><tr><th>"+_t("safe.report.params")+"</th><th>"+_t("safe.report.val")+"</th></tr>"+baseTable+"</table>"
      +"<h3>3. "+_t("safe.report.nodes")+"</h3><table><tr><th>#</th><th>"+_t("safe.res.node")+"</th><th>"+_t("safe.nodeHdr.vrms")+"</th><th>"+_t("safe.res.ins")+"</th><th>Clearance(mm)</th><th>Creepage(mm)</th></tr>"+sr+"</table>"
      +"<h3>4. "+_t("safe.report.calcProc")+"</h3>" + buildCalcChains(d)
      +"<p style=margin:8px 0;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px><strong>"+_t("safe.report.conclusion")+":</strong> "+_t("safe.report.conclusionText")+"</p>"
      +"<div style=margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:.85rem;color:#64748b><span>"+_t("safe.report.footer")+" v1.0</span><span>"+ds+" "+ts+"</span></div>";
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
    d.results.forEach(function(r,i){var g=r.toGnd?' '+_t("safe.chain.toGnd"):' '+_t("safe.chain.lineLineShort");var pw=(r.recurringPeakOk===false)?' '+_t("safe.chain.warnPeak"):'';var t241=r.tbl241Note?' '+_t("safe.chain.warnT241"):'';sr+='<tr><td>'+(i+1)+'</td><td>'+r.name+g+'</td><td>'+r.vrms+'</td><td>'+r.insL+'</td><td>'+r.reqClr+t241+'</td><td>'+r.reqCrp+pw+'</td></tr>'});

    var isoLabel = (d.isolation==='isolated')?_t("safe.report.iso.yes"):_t("safe.report.iso.no");
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
        (pn?'<tr><td>'+pn+'</td><td>'+sot("sStd")+'</td></tr>':'')
        +'<tr><td>'+_t("safe.report.std")+'</td><td>'+sot("sStd")+'</td></tr>'
        +'<tr><td>'+_t("safe.report.iso")+'</td><td>'+isoLabel+'</td></tr>';
      baseParams=
        '<tr><td>'+_t("safe.report.pd")+'</td><td>PD '+d.pd+'</td></tr>'
        +'<tr><td>'+_t("safe.report.mg")+'</td><td>'+sot("sMg")+'</td></tr>'
        +'<tr><td>'+_t("safe.report.alt")+'</td><td>'+d.alt+'m ('+d.altk+')</td></tr>'
        +'<tr><td>'+_t("safe.report.acOvc")+'</td><td>OVC '+(d.ovc_AC?d.ovc_AC.toUpperCase():'II')+' ('+d.impAC+' kV)</td></tr>'
        +'<tr><td>'+_t("safe.report.dcOvc")+'</td><td>OVC '+(d.ovc_DC?d.ovc_DC.toUpperCase():'II')+' ('+d.impDC+' kV)' +(d.isolation==='isolated'?' '+_t("safe.word.addNote"):'')+'</td></tr>'
        +'<tr><td>'+_t("safe.report.acV")+'</td><td>'+sysVAC_val+' V</td></tr>'
        +'<tr><td>'+_t("safe.report.dcV")+'</td><td>'+sysVDC_val+' V</td></tr>'
        +'<tr><td>'+_t("safe.word.note")+'</td><td>'+_t("safe.word.noteIec")+'</td></tr>';
    } else {
      projInfo=
        (pn?'<tr><td>'+pn+'</td><td>'+sot("sStd")+'</td></tr>':'')
        +'<tr><td>'+_t("safe.report.std")+'</td><td>'+sot("sStd")+'</td></tr>';
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
    h+='<p class="meta">'+_t("safe.word.rptNum")+': SA-'+(new Date().toLocaleDateString('zh-CN').replace(/\//g,''))+'-'+(Math.floor(Math.random()*9000+1000))+'</p>';
    h+='<p class="meta">'+_t("safe.word.genDate")+': '+ds+'</p>';

    h+='<h3>1. '+_t("safe.word.projInfo")+'</h3>';
    h+='<table class="compact"><thead><tr><th>'+_t("safe.report.proj")+'</th><th>'+_t("safe.report.content")+'</th></tr></thead><tbody>'+projInfo+'</tbody></table>';

    h+='<h3>2. '+_t("safe.word.basic")+'</h3>';
    h+='<table class="compact"><thead><tr><th>'+_t("safe.report.params")+'</th><th>'+_t("safe.report.val")+'</th></tr></thead><tbody>'+baseParams+'</tbody></table>';

    h+='<h3>3. '+_t("safe.word.results")+'</h3>';
    h+='<table class="data-tbl"><thead><tr>'
      +'<th>#</th><th>'+_t("safe.word.node")+'</th><th>Vrms (V)</th><th>'+_t("safe.word.insLvl")+'</th><th>Clearance mm</th><th>Creepage mm</th>'
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

  /* ── Expose to global scope (no eval) ───── */
  global.mNode = mNode; global.sNChange = sNChange; global.sAddNode = sAddNode;
  global.sRmNode = sRmNode; global.sReNum = sReNum; global.sCalc = sCalc;
  global.buildCalcChains = buildCalcChains; global.sGenRep = sGenRep;
  global.sExportReport = sExportReport; global.loadNodesFromDefaults = loadNodesFromDefaults;

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
