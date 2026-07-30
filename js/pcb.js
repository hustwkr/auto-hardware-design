/* ===== PCB Trace Current Capacity — UI Layer ===== */
/* Imports: window.PcbTraceModel (models/pcb-model.js)           */
/* Exposes: initPcb (called from app.js on tab switch)            */

(function (global) {
  "use strict";

  var PM = global.PcbTraceModel;
  if (!PM) { console.error("PcbTraceModel not loaded"); return; }
  var _t = global._t || function(k){return k};

  /* ── Helpers ─── */
  function sot(id) {
    var el = document.getElementById(id);
    if (!el) return "";
    return el.selectedOptions && el.selectedOptions[0] ? el.selectedOptions[0].text : el.value;
  }
  function gv(id) { var el = document.getElementById(id); return el ? (parseFloat(el.value) || 0) : 0; }

  /* ── Core calculation ─── */
  function pcbCalc() {
    var widthVal = gv("pcbWidth");
    var widthUnit = document.getElementById("pcbWidthUnit") ? document.getElementById("pcbWidthUnit").value : "mil";
    var widthMil = widthUnit === "mm" ? widthVal / PM.MIL_TO_MM : widthVal;
    var copperOz = gv("pcbCopper");
    var position = document.getElementById("pcbPos") ? document.getElementById("pcbPos").value : "external";
    var deltaT   = gv("pcbDeltaT");
    var ambTemp  = gv("pcbAmbTemp");
    var lengthMm = gv("pcbLength");
    var targetI  = gv("pcbTargetI");

    var result = {};
    var vd = {};

    // Forward calculation (always)
    var fwd = PM.calcCurrent({ widthMil: widthMil, copperOz: copperOz, position: position, deltaT: deltaT });
    result.maxI = fwd.current;
    result.area = fwd.area;

    // Reverse calculation (if target current > 0)
    if (targetI > 0) {
      var rev = PM.calcWidth({ targetI: targetI, copperOz: copperOz, position: position, deltaT: deltaT });
      result.minWidthMil = rev.widthMil;
      result.minWidthMm = rev.widthMm;
    }

    // Impedance (resistance + inductance + voltage drop)
    if (fwd.current > 0 && widthMil > 0) {
      vd = PM.calcImpedance({ current: fwd.current, widthMil: widthMil, copperOz: copperOz, lengthMm: lengthMm, ambTemp: ambTemp });
    }
    result.vdrop = vd.vdrop;
    result.powerLoss = vd.powerLoss;
    result.resistance = vd.resistance;
    result.inductance = vd.inductance;

    // Render results
    var el = document.getElementById("pcbResult");
    if (el) {
      var html = "<div class=\"result-grid\">";
      html += "<div class=\"ri\"><div class=\"rl\">" + _t("pcb.maxI") + "</div><div class=\"rv\"><span style=\"font-size:1.1rem;font-weight:600\">" + PM.fv(result.maxI, 3) + "</span> A</div></div>";

      html += "<div class=\"ri\"><div class=\"rl\">" + _t("pcb.resistance") + "</div><div class=\"rv\">" + (result.resistance !== null ? PM.fv(result.resistance * 1000, 2) + " mΩ" : "-") + "</div></div>";

      html += "<div class=\"ri\"><div class=\"rl\">" + _t("pcb.inductance") + "</div><div class=\"rv\">" + (result.inductance !== null ? PM.fv(result.inductance, 2) + " nH" : "-") + "</div></div>";

      html += "<div class=\"ri\"><div class=\"rl\">" + _t("pcb.vdrop") + "</div><div class=\"rv\">" + (result.vdrop !== null ? PM.fv(result.vdrop, 2) + " mV" : "-") + "</div></div>";

      html += "<div class=\"ri\"><div class=\"rl\">" + _t("pcb.powerLoss") + "</div><div class=\"rv\">" + (result.powerLoss !== null ? PM.fv(result.powerLoss, 2) + " mW" : "-") + "</div></div>";

      html += "<div class=\"ri\"><div class=\"rl\">" + _t("pcb.minWidth") + "</div><div class=\"rv\">" + (result.minWidthMil ? PM.fv(result.minWidthMil, 1) + " mil (" + PM.fv(result.minWidthMm, 2) + " mm)" : "-") + "</div></div>";

      html += "</div>";
      el.innerHTML = html;
    }

    // Store for report
    window._pcbResult = result;
    window._pcbInput = { widthMil: widthMil, widthVal: widthVal, widthUnit: widthUnit, copperOz: copperOz, position: position, deltaT: deltaT, ambTemp: ambTemp, lengthMm: lengthMm, targetI: targetI };
  }

  /* ── Comparison table ─── */
  function pcbCompare() {
    var copperOz = gv("pcbCopper");
    var position = document.getElementById("pcbPos") ? document.getElementById("pcbPos").value : "external";
    var deltaT = gv("pcbDeltaT");
    var lengthMm = gv("pcbLength");
    var ambTemp = gv("pcbAmbTemp");
    var widthUnit = document.getElementById("pcbWidthUnit") ? document.getElementById("pcbWidthUnit").value : "mm";
    var unitLabel = widthUnit === "mm" ? "mm" : "mil";
    var cmpWidths = widthUnit === "mm"
      ? [0.2, 0.3, 0.5, 0.6, 1].map(function(w){ return w / PM.MIL_TO_MM; })
      : [5, 8, 10, 15, 20, 25, 30, 40, 50];

    var data = PM.calcComparison({ widths: cmpWidths, copperOz: copperOz, position: position, deltaT: deltaT, lengthMm: lengthMm, ambTemp: ambTemp });

    var el = document.getElementById("pcbCompare");
    if (!el) return;

    var html = "<table class=\"sg-tbl\"><thead><tr>";
    html += "<th>" + _t("pcb.width") + " (" + unitLabel + ")</th>";
    html += "<th>" + _t("pcb.maxI") + " (A)</th>";
    html += "<th>" + _t("pcb.resistance") + " (mΩ)</th>";
    html += "<th>" + _t("pcb.inductance") + " (nH)</th>";
    html += "<th>" + _t("pcb.vdrop") + " (mV)</th>";
    html += "<th>" + _t("pcb.powerLoss") + " (mW)</th>";
    html += "</tr></thead><tbody>";

    for (var i = 0; i < data.length; i++) {
      var w = widthUnit === "mm" ? PM.fv(data[i].width * PM.MIL_TO_MM, 2) : data[i].width;
      html += "<tr><td>" + w + "</td>";
      html += "<td>" + PM.fv(data[i].current, 3) + "</td>";
      html += "<td>" + PM.fv(data[i].resistance * 1000, 2) + "</td>";
      html += "<td>" + PM.fv(data[i].inductance, 2) + "</td>";
      html += "<td>" + PM.fv(data[i].vdrop, 2) + "</td>";
      html += "<td>" + PM.fv(data[i].powerLoss, 2) + "</td></tr>";
    }
    html += "</tbody></table>";
    el.innerHTML = html;
  }

  /* ── Report generation ─── */
  function genPcbRep() {
    var r = window._pcbResult;
    var p = window._pcbInput;
    if (!r || !p) { pcbCalc(); r = window._pcbResult; p = window._pcbInput; }
    if (!r || !p) return;

    var vr = window._pcbViaResult; // via result for report

    var n = new Date(), locale = _getLang() === "en" ? "en-US" : "zh-CN";
    var ds = n.toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
    var ts = n.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

    var posLabel = p.position === "external" ? _t("pcb.posExternal") : _t("pcb.posInternal");
    var posConst = p.position === "external" ? "K=0.048" : "K=0.024";

    var rep = document.getElementById("pcbRc");
    if (!rep) return;

    var html = "<h3>" + _t("pcb.repTitle") + "</h3>";

    // Section 1: Input parameters
    html += "<h3>1. " + _t("pcb.repInput") + "</h3>";
    html += "<table class=\"data-tbl\"><thead><tr>";
    html += "<th>" + _t("pcb.width") + "</th><th>" + _t("pcb.copper") + "</th><th>" + _t("pcb.position") + "</th>";
    html += "<th>" + _t("pcb.tempRise") + "</th><th>" + _t("pcb.ambTemp") + "</th><th>" + _t("pcb.length") + "</th>";
    if (p.targetI > 0) html += "<th>" + _t("pcb.targetI") + "</th>";
    html += "</tr></thead><tbody><tr>";
    html += "<td>" + PM.fv(p.widthMil, 1) + " mil (" + PM.fv(p.widthMil * PM.MIL_TO_MM, 2) + " mm)</td><td>" + p.copperOz + " oz</td><td>" + posLabel + "</td>";
    html += "<td>" + p.deltaT + " °C</td><td>" + p.ambTemp + " °C</td><td>" + p.lengthMm + " mm</td>";
    if (p.targetI > 0) html += "<td>" + p.targetI + " A</td>";
    html += "</tr></tbody></table>";

    // Section 2: Calculation
    html += "<h3>2. " + _t("pcb.repCalc") + "</h3>";
    html += "<p><span class=\"latex\" data-l=\"I = K\\,\\Delta T^{0.44} A^{0.725}\"></span></p>";
    html += "<p>" + posLabel + ": " + posConst + ", b=0.44, c=0.725</p>";
    html += "<p><span class=\"latex\" data-l=\"A = " + p.widthMil + "\\times " + PM.fv(p.copperOz * PM.OZ_TO_MIL, 3) + " = " + PM.fv(r.area, 2) + "\\text{ mil}^2\"></span></p>";
    html += "<p><span class=\"latex\" data-l=\"I = " + posConst.split("=")[1] + "\\times " + PM.fv(p.deltaT, 1) + "^{0.44}\\times " + PM.fv(r.area, 2) + "^{0.725} = " + PM.fv(r.maxI, 3) + "\\text{ A}\"></span></p>";

    if (r.minWidthMil) {
      html += "<p><b>" + _t("pcb.repReverse") + ":</b></p>";
      html += "<p><span class=\"latex\" data-l=\"W = \\left(\\frac{" + p.targetI + "}{" + posConst.split("=")[1] + "\\times " + PM.fv(p.deltaT, 1) + "^{0.44}}\\right)^{1/0.725} / " + PM.fv(p.copperOz * PM.OZ_TO_MIL, 3) + " = " + PM.fv(r.minWidthMil, 1) + "\\text{ mil}\"></span></p>";
    }

    if (r.vdrop !== null) {
      html += "<p><b>" + _t("pcb.repVdrop") + ":</b></p>";
      html += "<p><span class=\"latex\" data-l=\"R = \\rho\\,\\frac{L}{W\\times T} = " + PM.fv(r.resistance, 8) + "\\,\\Omega\"></span></p>";
      html += "<p><span class=\"latex\" data-l=\"\\Delta V = I R = " + PM.fv(r.maxI, 3) + "\\times " + PM.fv(r.resistance, 8) + " = " + PM.fv(r.vdrop, 2) + "\\text{ mV}\"></span></p>";
      html += "<p><span class=\"latex\" data-l=\"P = I^2 R = " + PM.fv(r.powerLoss, 2) + "\\text{ mW}\"></span></p>";
    }

    // Section 2b: Via calculation (if available)
    if (vr && vr.current !== null) {
      html += "<h3>2b. " + _t("pcb.via.title") + "</h3>";
      html += "<p><b>" + _t("pcb.via.drill") + ":</b> " + (vr.drillMm || "") + " mm  |  <b>" + _t("pcb.via.wall") + ":</b> " + (vr.wallUm || "") + "μm</p>";
      html += "<p><span class=\"latex\" data-l=\"A = \\pi\\,t_w(d + t_w) = \\pi\\times " + (vr.wallUm||"") + "\\times(" + (vr.drillMm||"") + "+" + (vr.wallUm||"") + ") = " + PM.fv(vr.areaMm2, 4) + "\\text{ mm}^2\"></span></p>";
      html += "<p><span class=\"latex\" data-l=\"I = " + posConst.split("=")[1] + "\\times " + PM.fv(p.deltaT, 1) + "^{0.44}\\times " + PM.fv(vr.areaMil2, 2) + "^{0.725} = " + PM.fv(vr.current, 3) + "\\text{ A}\"></span></p>";
      if (vr.viasNeeded) {
        html += "<p><b>" + _t("pcb.via.viasRec") + ":</b> " + _t("pcb.via.targetI") + " = " + PM.fv(vr.targetI, 1) + " A → " + _t("pcb.via.minDrill") + " = " + vr.drillRev + " mm, " + _t("pcb.via.singleI") + " = " + PM.fv(vr.singleRev, 2) + " A → ≥ <b>" + vr.viasNeeded + "</b> 个</p>";
      }
    }

    // Section 3: Comparison
    html += "<h3>3. " + _t("pcb.repCompare") + "</h3>";
    html += document.getElementById("pcbCompare") ? document.getElementById("pcbCompare").innerHTML : "";

    // Footer
    html += "<div class=rep-footer><span>" + _t("pcb.repFooter") + " v1.1</span><span>" + _t("cap.report.date") + ": " + ds + " " + ts + "</span></div>";

    rep.innerHTML = html;
    if (typeof window._renderLatex === 'function') window._renderLatex();
    var eg = document.getElementById("exportPcbGroup");
    if (eg) eg.style.display = "";
  }

  /* ── Word export ─── */
  function pcbExportWord() {
    genPcbRep();
    var rep = document.getElementById("pcbRc");
    if (!rep) return;
    var n = new Date(), locale = _getLang() === "en" ? "en-US" : "zh-CN";
    var ds = n.toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/[\/-]/g, "");
    var ts = n.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    var p = window._pcbInput || {};
    var te = [];
    if (p.widthMil) te.push(p.widthMil + "mil");

    var h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><title>' + _t("pcb.repTitle") + '</title>';
    h += '<style>body{font-family:"Noto Sans SC",sans-serif;font-size:11pt;line-height:1.6}h2{font-size:16pt;border-bottom:2px solid #2563eb;padding-bottom:4px}h3{font-size:13pt;color:#1e40af;margin-top:16px}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #ccc;padding:4px 8px;text-align:left;font-size:10pt}th{background:#f0f0f0}.footer{margin-top:20px;padding-top:8px;border-top:1px solid #ccc;font-size:9pt;color:#666;display:flex;justify-content:space-between}</style></head><body>';
    h += '<h2>' + _t("pcb.repTitle") + '</h2>';
    h += '<p style="color:#666;font-size:9pt">' + _t("cap.calc.rptNum") + ': PCB-' + ds + '-' + (1e3 + Math.floor(9e3 * Math.random())) + '</p>';
    h += rep.innerHTML;
    h += '</body></html>';

    var blob = new Blob([h], { type: "application/msword" });
    var dn = _t("pcb.repTitle") + (te.length ? "(" + te.join("-") + ")" : "") + ".doc";
    if (typeof saveBlobWithDialog === "function") {
      saveBlobWithDialog(blob, dn);
    } else {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = dn;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  }

  /* ── Via current calculation ─── */
  function viaCalc() {
    var drillMm = parseFloat(document.getElementById("pcbViaDrill").value) || 0.3;
    var wallUm  = parseInt(document.getElementById("pcbViaWall").value) || 25;
    var position = document.getElementById("pcbViaPos").value;
    var deltaT  = parseInt(document.getElementById("pcbViaDeltaT").value) || 10;
    var targetI = parseFloat(document.getElementById("pcbViaTargetI").value) || 0;

    var fwd = PM.calcViaCurrent({ drillMm: drillMm, wallUm: wallUm, position: position, deltaT: deltaT });
    var rev = targetI > 0 ? PM.calcViaDrill({ targetI: targetI, wallUm: wallUm, position: position, deltaT: deltaT }) : null;

    // Store for report
    window._pcbViaResult = {
      drillMm: drillMm, wallUm: wallUm, position: position, deltaT: deltaT,
      current: fwd.current, areaMm2: fwd.areaMm2, areaMil2: fwd.areaMil2,
      targetI: targetI,
      drillRev: rev ? rev.drillMm : null,
      singleRev: rev ? rev.singleCurrent : null,
      viasNeeded: rev ? rev.viasNeeded : null
    };

    var el = document.getElementById("pcbViaResult");
    if (!el) return;

    var html = '<div class="result-grid">';
    html += '<div class="ri"><div class="rl">' + _t("pcb.via.maxI") + '</div><div class="rv"><span style="font-size:1.1rem;font-weight:600">' + PM.fv(fwd.current, 3) + '</span> A</div></div>';
    html += '<div class="ri"><div class="rl">' + _t("pcb.via.area") + '</div><div class="rv">' + PM.fv(fwd.areaMm2, 4) + ' mm² (' + PM.fv(fwd.areaMil2, 2) + ' mil²)</div></div>';

    if (rev && rev.drillMm) {
      html += '<div class="ri"><div class="rl">' + _t("pcb.via.targetI") + '</div><div class="rv">' + PM.fv(targetI, 1) + ' A</div></div>';
      html += '<div class="ri"><div class="rl">' + _t("pcb.via.minDrill") + '</div><div class="rv">' + rev.drillMm + ' mm</div></div>';
      html += '<div class="ri"><div class="rl">' + _t("pcb.via.singleI") + '</div><div class="rv">' + PM.fv(rev.singleCurrent, 2) + ' A</div></div>';
      html += '<div class="ri"><div class="rl">' + _t("pcb.via.viasRec") + '</div><div class="rv"><span style="font-size:1.1rem;font-weight:600;color:var(--color-accent)">≥ ' + rev.viasNeeded + '</span> 个 (' + PM.fv(rev.drillMm, 2) + 'mm 孔径)</div></div>';
    }

    html += '</div>';
    el.innerHTML = html;
  }

  /* ── Init ─── */
  function initPcb() {
    pcbCalc();
    pcbCompare();
    viaCalc();
  }

  /* ── Event binding ─── */
  document.addEventListener("input", function (e) {
    var id = e.target.id;
    if (id && ["pcbWidth", "pcbCopper", "pcbDeltaT", "pcbAmbTemp", "pcbLength", "pcbTargetI"].indexOf(id) >= 0) {
      pcbCalc();
      pcbCompare();
    }
    if (id && ["pcbViaDeltaT", "pcbViaTargetI"].indexOf(id) >= 0) {
      viaCalc();
    }
  });

  document.addEventListener("change", function (e) {
    var id = e.target.id;
    if (id === "pcbPos" || id === "pcbWidthUnit") {
      pcbCalc();
      pcbCompare();
    }
    if (id && ["pcbViaDrill", "pcbViaWall", "pcbViaPos"].indexOf(id) >= 0) {
      viaCalc();
    }
  });

  /* ── Expose to window ─── */
  global.initPcb = initPcb;
  global.pcbCalc = pcbCalc;
  global.pcbCompare = pcbCompare;
  global.viaCalc = viaCalc;
  global.genPcbRep = genPcbRep;
  global.pcbExportWord = pcbExportWord;

})(window);
