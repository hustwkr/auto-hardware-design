/* ===== Signal Filter Design — UI Layer ===== */
/* Imports: window.FilterModel (models/filter-model.js)          */
/* Exposes: initFilter (called from app.js on tab switch)         */

(function (global) {
  "use strict";

  var FM = global.FilterModel;
  if (!FM) { console.error("FilterModel not loaded — load models/filter-model.js first"); return; }

  /* ── Helpers ─── */
  function gv(id) { var el = document.getElementById(id); return el ? (parseFloat(el.value) || 0) : 0; }
  function gvs(id) { var el = document.getElementById(id); return el ? el.value : ""; }

  /* ── Design parameter presets ─── */
  var CAP_PRESETS = [
    {label_zh: "100 pF", label_en: "100 pF", value: 1e-10},
    {label_zh: "1 nF", label_en: "1 nF", value: 1e-9},
    {label_zh: "10 nF", label_en: "10 nF", value: 1e-8},
    {label_zh: "47 nF", label_en: "47 nF", value: 47e-9},
    {label_zh: "100 nF", label_en: "100 nF", value: 1e-7},
    {label_zh: "220 nF", label_en: "220 nF", value: 220e-9},
    {label_zh: "470 nF", label_en: "470 nF", value: 470e-9},
    {label_zh: "1 μF", label_en: "1 μF", value: 1e-6},
    {label_zh: "2.2 μF", label_en: "2.2 μF", value: 2.2e-6},
    {label_zh: "4.7 μF", label_en: "4.7 μF", value: 4.7e-6},
    {label_zh: "10 μF", label_en: "10 μF", value: 10e-6}
  ];

  /* ── Initialize tab —─*/
  function initFilter() {
    populateCapSelect();
    filterTypeChange();
    filterCalc();
  }

  function populateCapSelect() {
    var sel = document.getElementById("filterC1");
    if (!sel) return;
    var lang = global._getLang ? global._getLang() : "zh";
    sel.innerHTML = "";
    CAP_PRESETS.forEach(function(p, i) {
      var opt = document.createElement("option");
      opt.value = p.value;
      opt.textContent = lang === "en" ? p.label_en : p.label_zh;
      // Set 100nF as default
      if (Math.abs(p.value - 1e-7) < 1e-12) opt.selected = true;
      sel.appendChild(opt);
    });

    var sel2 = document.getElementById("filterC2");
    if (sel2) {
      sel2.innerHTML = "";
      CAP_PRESETS.forEach(function(p, i) {
        var opt = document.createElement("option");
        opt.value = p.value;
        opt.textContent = lang === "en" ? p.label_en : p.label_zh;
        sel2.appendChild(opt);
      });
      sel2.value = "1e-7"; // default 100nF
    }
  }

  /* ── Type change handler ─── */
  function filterTypeChange() {
    var type = gvs("filterType");
    var c2Group = document.getElementById("filterC2Group");
    var qGroup = document.getElementById("filterQGroup");
    if (type === "mfb2") {
      if (c2Group) c2Group.style.display = "";
      if (qGroup) qGroup.style.display = "";
    } else {
      if (c2Group) c2Group.style.display = "none";
      if (qGroup) qGroup.style.display = "none";
    }
    filterCalc();
  }

  /* ── Core calculation ─── */
  function filterCalc() {
    var type = gvs("filterType");
    var series = gvs("filterSeries");
    var fc = gv("filterFc");
    var gain = gv("filterGain");
    var Q = gv("filterQ");
    var C1 = gv("filterC1") || 1e-7;
    var C2 = gv("filterC2") || 1e-7;

    if (!fc || fc <= 0) { filterClearResults(); return; }

    var result;
    try {
      if (type === "diff1") {
        result = FM.designFilter(type, { fc: fc, gain: gain, C1: C1, series: series });
      } else {
        var qVal = Q > 0 ? Q : 0.707;
        result = FM.designFilter(type, { fc: fc, gain: gain, Q: qVal, C1: C1, C2: C2, series: series });
      }
    } catch(e) {
      var warn = document.getElementById("filterWarn");
      if (warn) { warn.textContent = "⚠ " + (e.message || "Calculation error"); warn.style.display = "block"; }
      return;
    }

    if (!result) return;

    // Store for chart & report
    global._filterResult = result;

    // Hide warning
    var warn = document.getElementById("filterWarn");
    if (warn) warn.style.display = "none";

    // Render results
    renderFilterResults(result);
    renderFilterChart(result);
    renderFilterSchematic(result);
  }

  /* ── Clear results ─── */
  function filterClearResults() {
    var el = document.getElementById("filterResultsContent");
    if (el) el.innerHTML = "";
    var chart = document.getElementById("filterChart");
    if (chart) { var ctx = chart.getContext("2d"); if (ctx) ctx.clearRect(0, 0, chart.width, chart.height); }
    var schematic = document.getElementById("filterSchematic");
    if (schematic) schematic.innerHTML = "";
    global._filterResult = null;
  }

  /* ── Render KPI results grid ─── */
  function renderFilterResults(r) {
    var el = document.getElementById("filterResultsContent");
    if (!el) return;

    var lang = global._getLang ? global._getLang() : "zh";
    var t = global._t || function(k){return k;};

    var html = '<div class="result-grid">';
    if (r.type === "diff1") {
      html += '<div class="ri"><div class="rl">' + t("filter.topology") + '</div><div class="rv">1st-Order Differential LPF</div></div>';
    } else {
      html += '<div class="ri"><div class="rl">' + t("filter.topology") + '</div><div class="rv">2nd-Order MFB LPF</div></div>';
    }
    html += '<div class="ri"><div class="rl">' + t("filter.fc") + '</div><div class="rv">' + FM.fv(r.fc_actual, 1) + ' Hz</div></div>';
    html += '<div class="ri"><div class="rl">' + t("filter.gain") + '</div><div class="rv">' + FM.fv(r.gain_actual, 2) + ' V/V (' + FM.fv(20 * Math.log10(r.gain_actual || 1e-10), 2) + ' dB)</div></div>';

    if (r.type === "mfb2") {
      html += '<div class="ri"><div class="rl">' + t("filter.q") + '</div><div class="rv">' + FM.fv(r.Q_actual, 3) + '</div></div>';
      // Pole frequency
      if (r.poles && r.poles.length >= 2) {
        var fp = Math.sqrt(r.poles[0].real * r.poles[0].real + r.poles[0].imag * r.poles[0].imag) / (2 * Math.PI);
        html += '<div class="ri"><div class="rl">' + t("filter.poleFreq") + '</div><div class="rv">' + FM.fv(fp, 1) + ' Hz</div></div>';
      }
    } else {
      html += '<div class="ri"><div class="rl">' + t("filter.q") + '</div><div class="rv">0.5 (1st-order)</div></div>';
      if (r.poles && r.poles.length) {
        var fp1 = Math.sqrt(r.poles[0].real * r.poles[0].real + r.poles[0].imag * r.poles[0].imag) / (2 * Math.PI);
        html += '<div class="ri"><div class="rl">' + t("filter.poleFreq") + '</div><div class="rv">' + FM.fv(fp1, 1) + ' Hz</div></div>';
      }
    }

    if (r.gain_target !== undefined) {
      html += '<div class="ri"><div class="rl">' + t("filter.errFc") + '</div><div class="rv">' + FM.fv((r.fc_actual / r.fc_target - 1) * 100, 2) + '%</div></div>';
    }
    if (r.gain_target !== undefined) {
      html += '<div class="ri"><div class="rl">' + t("filter.errGain") + '</div><div class="rv">' + FM.fv((r.gain_actual / r.gain_target - 1) * 100, 2) + '%</div></div>';
    }

    html += '</div>';

    // Component table
    html += '<h3 class="section-h3" style="margin-top:12px">' + t("filter.components") + '</h3>';
    html += '<table class="sg-tbl"><thead><tr><th>' + t("filter.ref") + '</th><th>' + t("filter.value") + '</th></tr></thead><tbody>';

    var comps = r.components;
    if (r.type === "diff1") {
      html += '<tr><td>R1</td><td>' + FM.valLabel(comps.R1) + 'Ω</td></tr>';
      html += '<tr><td>R2</td><td>' + FM.valLabel(comps.R2) + 'Ω</td></tr>';
      html += '<tr><td>C1</td><td>' + FM.capLabel(comps.C1) + '</td></tr>';
    } else {
      html += '<tr><td>R1</td><td>' + FM.valLabel(comps.R1) + 'Ω</td></tr>';
      html += '<tr><td>R2</td><td>' + FM.valLabel(comps.R2) + 'Ω</td></tr>';
      html += '<tr><td>R3</td><td>' + FM.valLabel(comps.R3) + 'Ω</td></tr>';
      html += '<tr><td>C1</td><td>' + FM.capLabel(comps.C1) + '</td></tr>';
      html += '<tr><td>C2</td><td>' + FM.capLabel(comps.C2) + '</td></tr>';
    }

    html += '</tbody></table>';
    el.innerHTML = html;
  }

  /* ── Render frequency response chart (Canvas) ─── */
  function renderFilterChart(r) {
    var canvas = document.getElementById("filterChart");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var lang = global._getLang ? global._getLang() : "zh";

    // HiDPI support
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var w = rect.width || canvas.width;
    var h = rect.height || canvas.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, w, h);

    var data = r.freqResp;
    if (!data || data.length < 2) return;

    // Chart margins
    var margin = { top: 24, bottom: 36, left: 56, right: 20 };
    var plotW = w - margin.left - margin.right;
    var plotH = (h - margin.top - margin.bottom) / 2 - 4; // split for mag + phase

    // Frequency axis (log)
    var fMin = data[0].f, fMax = data[data.length - 1].f;
    function fToX(f) { return margin.left + plotW * Math.log(f / fMin) / Math.log(fMax / fMin); }

    // Determine data range
    var magMin = -80, magMax = 10;
    data.forEach(function(d) {
      if (d.magDb < magMin) magMin = d.magDb;
      if (d.magDb > magMax) magMax = d.magDb;
    });
    magMin = Math.floor(magMin / 10) * 10;
    magMax = Math.ceil((magMax + 5) / 10) * 10;
    if (magMax - magMin < 20) { magMax = magMin + 20; }

    // Phase range: -180 to 0
    var phaseMin = -200, phaseMax = 20;

    // ── Background ───
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    var gridColor = isDark ? "#334155" : "#e2e8f0";
    var textColor = isDark ? "#94a3b8" : "#64748b";
    var axisColor = isDark ? "#475569" : "#cbd5e1";
    var lineColor = isDark ? "#60a5fa" : "#2563eb";
    var phaseColor = isDark ? "#34d399" : "#059669";

    ctx.fillStyle = isDark ? "#0f172a" : "#ffffff";
    ctx.fillRect(margin.left, margin.top - 8, plotW, plotH * 2 + 12);

    function drawMagGrid() {
      // Magnitude Y grid
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      ctx.font = "10px " + getComputedStyle(document.body).fontFamily;
      ctx.fillStyle = textColor;
      ctx.textAlign = "right";
      for (var db = magMin; db <= magMax; db += 10) {
        var y = margin.top + plotH * (1 - (db - magMin) / (magMax - magMin));
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(margin.left + plotW, y);
        ctx.stroke();
        ctx.fillText(db + " dB", margin.left - 4, y + 4);
      }
    }

    function drawPhaseGrid() {
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      ctx.font = "10px " + getComputedStyle(document.body).fontFamily;
      ctx.fillStyle = textColor;
      ctx.textAlign = "right";
      for (var ph = -180; ph <= 0; ph += 30) {
        var y = margin.top + plotH + 4 + plotH * (1 - (ph - phaseMin) / (phaseMax - phaseMin));
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(margin.left + plotW, y);
        ctx.stroke();
        ctx.fillText(ph + "°", margin.left - 4, y + 4);
      }
    }

    function drawFreqGrid() {
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      ctx.textAlign = "center";
      ctx.fillStyle = textColor;
      ctx.font = "10px " + getComputedStyle(document.body).fontFamily;

      // Log-spaced freq labels: 1, 10, 100, 1k, 10k, 100k, 1M
      var steps = [];
      var base = Math.pow(10, Math.floor(Math.log10(fMin)));
      for (var decade = 0; ; decade++) {
        for (var sub = 1; sub <= 9; sub += 1) {
          var f = base * Math.pow(10, decade) * sub;
          if (f >= fMin && f <= fMax) {
            // Only label the major decades (1, 10, 100, 1k, ...)
            if (sub === 1) {
              steps.push({ f: f, label: f >= 1000 ? (f/1000)+"k" : f+"" });
            } else {
              steps.push({ f: f, label: null });
            }
          }
        }
        if (base * Math.pow(10, decade) * 10 > fMax) break;
      }

      steps.forEach(function(s) {
        var x = fToX(s.f);
        ctx.beginPath();
        ctx.moveTo(x, margin.top - 8);
        ctx.lineTo(x, margin.top + plotH * 2 + 12);
        ctx.stroke();
        if (s.label !== null) {
          ctx.fillText(s.label, x, margin.top + plotH * 2 + 20);
        }
      });
    }

    function drawAxisLabels() {
      ctx.textAlign = "center";
      ctx.fillStyle = textColor;
      ctx.font = "11px " + getComputedStyle(document.body).fontFamily;
      ctx.fillText(lang === "en" ? "Frequency (Hz)" : "频率 (Hz)", margin.left + plotW / 2, margin.top + plotH * 2 + 34);
      ctx.textAlign = "center";

      // Y axis labels are rotated — draw them as text at the side
      ctx.save();
      ctx.translate(12, margin.top + plotH / 2 + plotH);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillText(lang === "en" ? "Phase (°)" : "相位 (°)", 0, 0);
      ctx.restore();

      ctx.save();
      ctx.translate(12, margin.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillText(lang === "en" ? "Magnitude (dB)" : "幅值 (dB)", 0, 0);
      ctx.restore();
    }

    function drawMagTrace() {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      data.forEach(function(d, i) {
        var x = fToX(d.f);
        var y = margin.top + plotH * (1 - (d.magDb - magMin) / (magMax - magMin));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // -3dB line (reference)
      ctx.strokeStyle = isDark ? "#fb923c" : "#f59e0b";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      if (r.gain_actual) {
        var gDb = 20 * Math.log10(r.gain_actual || 1e-10);
        var y3db = margin.top + plotH * (1 - ((gDb - 3) - magMin) / (magMax - magMin));
        ctx.beginPath();
        ctx.moveTo(margin.left, y3db);
        ctx.lineTo(margin.left + plotW, y3db);
        ctx.stroke();
        // Label -3dB
        ctx.fillStyle = isDark ? "#fb923c" : "#d97706";
        ctx.font = "9px " + getComputedStyle(document.body).fontFamily;
        ctx.textAlign = "left";
        ctx.fillText("-3 dB", margin.left + 3, y3db - 2);
      }
      ctx.setLineDash([]);
    }

    function drawPhaseTrace() {
      ctx.strokeStyle = phaseColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      data.forEach(function(d, i) {
        var x = fToX(d.f);
        var y = margin.top + plotH + 4 + plotH * (1 - (d.phaseDeg - phaseMin) / (phaseMax - phaseMin));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    drawFreqGrid();
    drawMagGrid();
    drawPhaseGrid();

    // Frame
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(margin.left, margin.top - 8, plotW, plotH * 2 + 12);

    drawMagTrace();
    drawPhaseTrace();
    drawAxisLabels();

    // Legend
    ctx.fillStyle = lineColor;
    ctx.fillRect(margin.left + plotW - 140, margin.top - 4, 10, 10);
    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    ctx.font = "10px " + getComputedStyle(document.body).fontFamily;
    ctx.fillText(lang === "en" ? "Magnitude" : "幅频", margin.left + plotW - 126, margin.top + 5);

    ctx.fillStyle = phaseColor;
    ctx.fillRect(margin.left + plotW - 80, margin.top - 4, 10, 10);
    ctx.fillStyle = textColor;
    ctx.fillText(lang === "en" ? "Phase" : "相频", margin.left + plotW - 66, margin.top + 5);
  }

  /* ── Render circuit schematic (SVG) ─── */
  function renderFilterSchematic(r) {
    var el = document.getElementById("filterSchematic");
    if (!el) return;

    var svgW = 580, svgH = r.type === "mfb2" ? 320 : 240;
    var comps = r.components;
    var svg = '';

    if (r.type === "diff1") {
      svg = renderDiff1Svg(svgW, svgH, comps);
    } else {
      svg = renderMfb2Svg(svgW, svgH, comps);
    }

    el.innerHTML = svg;
  }

  /* ── Simplified SVG rendering ─── */
  // Helper: draw a resistor zigzag path (returns points string for <polyline>)
  function resistorPath(zigCount, x1, y1, x2, y2) {
    var pts = [];
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx*dx + dy*dy);
    if (len < 1) return '';
    var ux = dx/len, uy = dy/len;
    var nx = -uy, ny = ux;
    var zigAmp = Math.min(8, len * 0.12);
    pts.push([x1, y1]);
    for (var i = 1; i <= zigCount; i++) {
      var t = i / (zigCount + 1);
      var mx = x1 + dx * t, my = y1 + dy * t;
      var zig = (i % 2 === 1) ? zigAmp : -zigAmp;
      pts.push([mx + nx * zig, my + ny * zig]);
    }
    pts.push([x2, y2]);
    return pts.map(function(p){return p[0]+','+p[1]}).join(' ');
  }

  function Rpath(z, x1, y1, x2, y2) {
    var pts = resistorPath(z, x1, y1, x2, y2);
    return '<polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.2"/>';
  }

  function L(x1,y1,x2,y2) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="currentColor" stroke-width="1.2"/>';
  }

  function GND(x, y) {
    return L(x-8, y, x+8, y) + L(x-5, y+6, x+5, y+6) + L(x-2, y+12, x+2, y+12);
  }

  // Vertical capacitor: two parallel plates
  function capV(x, y1, y2) {
    var mid = (y1+y2)/2;
    return L(x, y1, x, mid-5) + L(x-5, mid-5, x+5, mid-5) +
           L(x-5, mid+5, x+5, mid+5) + L(x, mid+5, x, y2);
  }

  // Horizontal capacitor: two parallel plates
  function capH(x1, x2, y) {
    var mid = (x1+x2)/2;
    return L(x1, y, mid-5, y) + L(mid-5, y-5, mid-5, y+5) +
           L(mid+5, y-5, mid+5, y+5) + L(mid+5, y, x2, y);
  }

  function nodeDot(x, y) {
    return '<circle cx="' + x + '" cy="' + y + '" r="2.5" fill="currentColor"/>';
  }

  function opAmp(opX, cy, h, label) {
    // Triangle: left edge (opX, cy-h) to (opX, cy+h), right tip at (opX+36, cy)
    var tri = '<polygon points="' + opX + ',' + (cy-h) + ' ' + opX + ',' + (cy+h) + ' ' + (opX+36) + ',' + cy + '" fill="none" stroke="currentColor" stroke-width="1.2"/>';
    // (-) terminal — short line from left edge, 1/4 from top
    var termN = '<line x1="' + (opX-10) + '" y1="' + (cy-h*0.55) + '" x2="' + opX + '" y2="' + (cy-h*0.55) + '" stroke="currentColor" stroke-width="1.2"/>';
    // (+) terminal — short line from left edge, 1/4 from bottom
    var termP = '<line x1="' + (opX-10) + '" y1="' + (cy+h*0.55) + '" x2="' + opX + '" y2="' + (cy+h*0.55) + '" stroke="currentColor" stroke-width="1.2"/>';
    // (-) and (+) signs
    var signN = '<text x="' + (opX-14) + '" y="' + (cy-h*0.55+4) + '" class="flbl" text-anchor="end">-</text>';
    var signP = '<text x="' + (opX-14) + '" y="' + (cy+h*0.55+4) + '" class="flbl" text-anchor="end">+</text>';
    var lbl = label ? '<text x="' + (opX+14) + '" y="' + (cy+4) + '" class="flbl">A</text>' : '';
    return termN + termP + tri + signN + signP + lbl;
  }

  /* ================================================================
     1st-Order Inverting LPF Schematic

     Topology: Vin --R1--+---> (-) op-amp ---+--- Vout
                          |     |      |      |
                    (virtual  (+)    C1||R2   |
                     ground)  |      |        |
                             GND    GND   ----+

     R2 and C1 are in parallel in the feedback path (output to - input)
     ================================================================ */
  function renderDiff1Svg(w, h, c) {
    var t = global._t || function(k){return k;};
    var lang = global._getLang ? global._getLang() : "zh";
    var r1Val = FM.valLabel(c.R1) + "Ω";
    var r2Val = FM.valLabel(c.R2) + "Ω";
    var c1Val = FM.capLabel(c.C1);

    var cy = Math.round(h * 0.48);
    var opH = 28;
    var svg = '';
    svg += '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-width:' + w + 'px;color:var(--color-text)">';
    svg += '<style>.flbl{fill:var(--color-text);font-size:13px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}.fref{fill:var(--color-text-soft);font-size:11px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}.fnode{fill:var(--color-text);font-size:12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-weight:600}.fdes{fill:var(--color-text);font-size:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-weight:600}</style>';
    svg += '<text x="' + (w/2) + '" y="18" class="fdes" text-anchor="middle">1st-Order Inverting Low-Pass Filter</text>';

    // ---- Signal path positions ----
    var r1s = 100, r1e = 170; // R1: 70px
    var opX = 230, opW = 36, opR = opX + opW;
    var outX = opR + 18;
    var nTermY = cy - opH*0.55; // (-) terminal y at op-amp

    // Vin
    svg += '<text x="20" y="' + (cy+4) + '" class="fnode">Vin</text>';
    svg += L(48, cy, r1s, cy);

    // R1
    svg += Rpath(5, r1s, cy, r1e, cy);
    svg += '<text x="' + ((r1s+r1e)/2) + '" y="' + (cy-14) + '" class="flbl" text-anchor="middle">R1</text>';
    svg += '<text x="' + ((r1s+r1e)/2) + '" y="' + (cy-2) + '" class="fref" text-anchor="middle">' + r1Val + '</text>';

    // Wire from R1 end to op-amp (-) terminal
    var nTermX = opX - 10;
    svg += L(r1e, cy, r1e, nTermY);
    svg += L(r1e, nTermY, nTermX, nTermY);

    // Op-amp
    svg += opAmp(opX, cy, opH, true);

    // (+) label (opAmp already drew the sign)
    // (+) terminal to GND
    var pTermY = cy + opH*0.55;
    svg += L(opX-10, pTermY, opX-10, pTermY+22);
    svg += L(opX-10, pTermY+22, opX-20, pTermY+22);
    svg += L(opX-20, pTermY+22, opX-20, cy+45);
    svg += GND(opX-20, cy+45);

    // Output
    svg += L(opR, cy, outX, cy);
    svg += '<text x="' + (outX+2) + '" y="' + (cy+4) + '" class="fnode">Vout</text>';

    // ---- Feedback: R2 || C1 from output back to (-) input ----
    // Output takeoff point (where feedback branches from output wire)
    var fbOffX = opR + 2;
    // R2 above (horizontal, use 3 zigzags for tight space)
    var fbY = cy - 50;
    svg += L(fbOffX, cy, fbOffX, fbY);
    svg += Rpath(3, fbOffX, fbY, nTermX, fbY);
    svg += L(nTermX, fbY, nTermX, nTermY);
    var r2mx = (fbOffX + nTermX)/2;
    svg += '<text x="' + r2mx + '" y="' + (fbY-5) + '" class="flbl" text-anchor="middle">R2</text>';
    svg += '<text x="' + r2mx + '" y="' + (fbY+7) + '" class="fref" text-anchor="middle">' + r2Val + '</text>';

    // C1 below (parallel with R2), use different vertical offset
    var fbOff2X = opR + 4;
    var fbY2 = cy + 48;
    svg += L(fbOff2X, cy, fbOff2X, fbY2-22);
    svg += capV(fbOff2X, fbY2-22, fbY2);
    svg += L(fbOff2X, fbY2, nTermX, fbY2);
    svg += L(nTermX, fbY2, nTermX, nTermY);
    svg += '<text x="' + (fbOff2X+10) + '" y="' + (fbY2-6) + '" class="flbl">C1</text>';
    svg += '<text x="' + (fbOff2X+10) + '" y="' + (fbY2+6) + '" class="fref">' + c1Val + '</text>';

    // Junction dot at (-) input node
    svg += nodeDot(nTermX, nTermY);

    svg += '</svg>';
    return svg;
  }

  /* ================================================================
     2nd-Order MFB LPF Schematic

     Topology:

     Vin --R1--+--R3--+---> (-) op-amp ---+--- Vout
               |      |      |     |       |
              C1    C2||R2   (+)   GND     |
               |      |      |             |
              GND    GND    GND           -+

     R2 and C2 are in parallel in the feedback path
     ================================================================ */
  function renderMfb2Svg(w, h, c) {
    var lang = global._getLang ? global._getLang() : "zh";
    var r1Val = FM.valLabel(c.R1) + "Ω";
    var r2Val = FM.valLabel(c.R2) + "Ω";
    var r3Val = FM.valLabel(c.R3) + "Ω";
    var c1Val = FM.capLabel(c.C1);
    var c2Val = FM.capLabel(c.C2);

    var cy = Math.round(h * 0.43);
    var opH = 28;
    var svg = '';
    svg += '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-width:' + w + 'px;color:var(--color-text)">';
    svg += '<style>.flbl{fill:var(--color-text);font-size:13px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}.fref{fill:var(--color-text-soft);font-size:11px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}.fnode{fill:var(--color-text);font-size:12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-weight:600}.fdes{fill:var(--color-text);font-size:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-weight:600}</style>';

    svg += '<text x="' + (w/2) + '" y="18" class="fdes" text-anchor="middle">2nd-Order MFB Low-Pass Filter</text>';

    // Positions
    var r1s = 75, r1e = 150;  // R1: 75px
    var r3s = r1e, r3e = 235; // R3: 85px
    var opX = 265, opR = opX + 36, outX = opR + 18;
    var nTermX = opX - 10;
    var nTermY = cy - opH*0.55;

    // Vin
    svg += '<text x="20" y="' + (cy+4) + '" class="fnode">Vin</text>';
    svg += L(48, cy, r1s, cy);

    // R1
    svg += Rpath(5, r1s, cy, r1e, cy);
    svg += '<text x="' + ((r1s+r1e)/2) + '" y="' + (cy-14) + '" class="flbl" text-anchor="middle">R1</text>';
    svg += '<text x="' + ((r1s+r1e)/2) + '" y="' + (cy-2) + '" class="fref" text-anchor="middle">' + r1Val + '</text>';
    svg += nodeDot(r1e, cy);

    // C1 from node 1 to GND
    svg += L(r1e, cy, r1e, cy+28);
    svg += capV(r1e, cy+28, cy+60);
    svg += GND(r1e, cy+60);
    svg += '<text x="' + (r1e+14) + '" y="' + (cy+44) + '" class="flbl">C1</text>';
    svg += '<text x="' + (r1e+14) + '" y="' + (cy+56) + '" class="fref">' + c1Val + '</text>';

    // R3
    svg += Rpath(5, r3s, cy, r3e, cy);
    svg += '<text x="' + ((r3s+r3e)/2) + '" y="' + (cy-14) + '" class="flbl" text-anchor="middle">R3</text>';
    svg += '<text x="' + ((r3s+r3e)/2) + '" y="' + (cy-2) + '" class="fref" text-anchor="middle">' + r3Val + '</text>';
    svg += nodeDot(r3e, cy);

    // Wire from R3 end to op-amp (-) terminal
    svg += L(r3e, cy, r3e, nTermY);
    svg += L(r3e, nTermY, nTermX, nTermY);

    // Op-amp
    svg += opAmp(opX, cy, opH, true);

    // (+) terminal to GND
    var pTermY = cy + opH*0.55;
    svg += L(opX-10, pTermY, opX-10, pTermY+22);
    svg += L(opX-10, pTermY+22, opX-20, pTermY+22);
    svg += L(opX-20, pTermY+22, opX-20, cy+45);
    svg += GND(opX-20, cy+45);

    // Output
    svg += L(opR, cy, outX, cy);
    svg += '<text x="' + (outX+2) + '" y="' + (cy+4) + '" class="fnode">Vout</text>';

    // ---- Feedback: R2 || C2 from output to (-) input ----
    // Output takeoff point
    var fbOffX = opR + 2;
    // R2 above
    var fbY = cy - 50;
    svg += L(fbOffX, cy, fbOffX, fbY);
    svg += Rpath(3, fbOffX, fbY, nTermX, fbY);
    svg += L(nTermX, fbY, nTermX, nTermY);
    var r2mx = (fbOffX + nTermX)/2;
    svg += '<text x="' + r2mx + '" y="' + (fbY-5) + '" class="flbl" text-anchor="middle">R2</text>';
    svg += '<text x="' + r2mx + '" y="' + (fbY+7) + '" class="fref" text-anchor="middle">' + r2Val + '</text>';

    // C2 below (parallel with R2)
    var fbOff2X = opR + 4;
    var fbY2 = cy + 48;
    svg += L(fbOff2X, cy, fbOff2X, fbY2-22);
    svg += capV(fbOff2X, fbY2-22, fbY2);
    svg += L(fbOff2X, fbY2, nTermX, fbY2);
    svg += L(nTermX, fbY2, nTermX, nTermY);
    svg += '<text x="' + (fbOff2X+10) + '" y="' + (fbY2-6) + '" class="flbl">C2</text>';
    svg += '<text x="' + (fbOff2X+10) + '" y="' + (fbY2+6) + '" class="fref">' + c2Val + '</text>';

    // Junction dot at (-) input node
    svg += nodeDot(nTermX, nTermY);

    svg += '</svg>';
    return svg;
  }

  /* ── Report generation ─── */
  function filterGenRep() {
    var r = global._filterResult;
    if (!r) {
      document.getElementById("filterRc").innerHTML = "<h3>" + (_t ? _t("filter.report.title") : "Filter Design Report") + "</h3><p>" + (_t ? _t("cap.report.empty") : 'Click "Generate Report" to display.') + "</p>";
      return;
    }

    // Show export button
    var eg = document.getElementById('exportFilterGroup');
    if (eg) eg.style.display = '';

    var lang = global._getLang ? global._getLang() : "zh";
    var t = global._t || function(k){return k;};

    var n = new Date();
    var locale = lang === 'en' ? 'en-US' : 'zh-CN';
    var ds = n.toLocaleDateString(locale, {year:"numeric",month:"2-digit",day:"2-digit"});
    var ts = n.toLocaleTimeString(locale, {hour:"2-digit",minute:"2-digit"});

    var typeName = r.type === "diff1" ? "1st-Order Differential LPF" : "2nd-Order MFB LPF";
    var comps = r.components;

    var html = '<h3>1. ' + t("filter.report.info") + '</h3>';
    html += '<table class="data-tbl"><thead><tr>';
    html += '<th>' + t("filter.report.param") + '</th><th>' + t("filter.report.value") + '</th></tr></thead><tbody>';
    html += '<tr><td>' + t("filter.topology") + '</td><td>' + typeName + '</td></tr>';
    html += '<tr><td>' + t("filter.report.date") + '</td><td>' + ds + ' ' + ts + '</td></tr>';
    html += '<tr><td>' + t("filter.fc") + ' (' + t("filter.target") + ')</td><td>' + FM.fv(r.fc_target, 1) + ' Hz</td></tr>';
    html += '<tr><td>' + t("filter.fc") + ' (' + t("filter.actual") + ')</td><td>' + FM.fv(r.fc_actual, 1) + ' Hz</td></tr>';
    html += '<tr><td>' + t("filter.gain") + ' (' + t("filter.target") + ')</td><td>' + FM.fv(r.gain_target, 2) + ' V/V (' + FM.fv(20*Math.log10(r.gain_target||1), 2) + ' dB)</td></tr>';
    html += '<tr><td>' + t("filter.gain") + ' (' + t("filter.actual") + ')</td><td>' + FM.fv(r.gain_actual, 2) + ' V/V (' + FM.fv(20*Math.log10(r.gain_actual||1), 2) + ' dB)</td></tr>';
    if (r.type === "mfb2") {
      html += '<tr><td>Q (' + t("filter.target") + ')</td><td>' + FM.fv(r.Q_target, 3) + '</td></tr>';
      html += '<tr><td>Q (' + t("filter.actual") + ')</td><td>' + FM.fv(r.Q_actual, 3) + '</td></tr>';
    }
    html += '</tbody></table>';

    html += '<h3>2. ' + t("filter.components") + '</h3>';
    html += '<table class="data-tbl"><thead><tr><th>Ref</th><th>' + t("filter.value") + '</th></tr></thead><tbody>';
    if (r.type === "diff1") {
      html += '<tr><td>R1</td><td>' + FM.valLabel(comps.R1) + 'Ω</td></tr>';
      html += '<tr><td>R2</td><td>' + FM.valLabel(comps.R2) + 'Ω</td></tr>';
      html += '<tr><td>C1</td><td>' + FM.capLabel(comps.C1) + '</td></tr>';
    } else {
      html += '<tr><td>R1</td><td>' + FM.valLabel(comps.R1) + 'Ω</td></tr>';
      html += '<tr><td>R2</td><td>' + FM.valLabel(comps.R2) + 'Ω</td></tr>';
      html += '<tr><td>R3</td><td>' + FM.valLabel(comps.R3) + 'Ω</td></tr>';
      html += '<tr><td>C1</td><td>' + FM.capLabel(comps.C1) + '</td></tr>';
      html += '<tr><td>C2</td><td>' + FM.capLabel(comps.C2) + '</td></tr>';
    }
    html += '</tbody></table>';

    // Formula section
    html += '<h3>3. ' + t("filter.report.formulas", null, "Calculation Formulas") + '</h3>';
    html += '<div class="rep-model-box">';
    if (r.type === "diff1") {
      html += '<p><b>Transfer Function:</b> H(s) = -(R₂/R₁) / (1 + s·R₂·C₁)</p>';
      html += '<p><b>DC Gain:</b> G = R₂ / R₁ = ' + FM.valLabel(comps.R2) + '/' + FM.valLabel(comps.R1) + ' = ' + FM.fv(r.gain_actual, 2) + '</p>';
      html += '<p><b>Cutoff Frequency:</b> f_c = 1 / (2π·R₂·C₁) = 1/(2π·' + FM.valLabel(comps.R2) + '·' + FM.capLabel(comps.C1) + ') = ' + FM.fv(r.fc_actual, 1) + ' Hz</p>';
    } else {
      html += '<p><b>Transfer Function:</b> H(s) = -(R₂/(R₁+R₃)) / [1 + s·(R₂·C₂ + C₁·R₁·R₃/(R₁+R₃)) + s²·C₁·C₂·R₁·R₂·R₃/(R₁+R₃)]</p>';
      html += '<p><b>DC Gain:</b> G = R₂ / (R₁+R₃) = ' + FM.valLabel(comps.R2) + '/(' + FM.valLabel(comps.R1) + '+' + FM.valLabel(comps.R3) + ') = ' + FM.fv(r.gain_actual, 2) + '</p>';
      html += '<p><b>Cutoff Frequency:</b> f_c = ' + FM.fv(r.fc_actual, 1) + ' Hz</p>';
      html += '<p><b>Quality Factor:</b> Q = ' + FM.fv(r.Q_actual, 3) + '</p>';
    }
    html += '</div>';

    document.getElementById("filterRc").innerHTML = html;
  }

  /* ── Word export ─── */
  function filterExportWord() {
    var r = global._filterResult;
    if (!r) return;

    var lang = global._getLang ? global._getLang() : "zh";
    var t = global._t || function(k){return k;};

    var n = new Date();
    var locale = lang === 'en' ? 'en-US' : 'zh-CN';
    var ds = n.toLocaleDateString(locale, {year:"numeric",month:"2-digit",day:"2-digit"});
    var ts = n.toLocaleTimeString(locale, {hour:"2-digit",minute:"2-digit"});

    var typeName = r.type === "diff1" ? "1st-Order Differential LPF" : "2nd-Order MFB LPF";
    var comps = r.components;

    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head><meta charset="utf-8"><title>' + (lang === 'en' ? 'Filter Design Report' : '滤波器设计报告') + '</title>';

    html += '<style>body{font-family:Calibri,SimSun,sans-serif;font-size:11pt;color:#333;}';
    html += 'h2{font-size:14pt;margin-top:16pt;margin-bottom:6pt;}';
    html += 'table{border-collapse:collapse;width:100%;margin:6pt 0;font-size:10pt;}';
    html += 'th,td{border:1px solid #999;padding:4px 8px;text-align:left;}';
    html += 'th{background:#f0f0f0;font-weight:600;}';
    html += '.footer{margin-top:14pt;padding-top:8pt;border-top:1px solid #ccc;font-size:9pt;color:#888;}</style></head><body>';

    html += '<h2>' + (lang === 'en' ? 'Filter Design Report' : '信号滤波器设计报告') + '</h2>';
    html += '<p>' + (lang === 'en' ? 'Report Date: ' : '报告日期：') + ds + ' ' + ts + '</p>';

    html += '<h3>1. ' + (lang === 'en' ? 'Design Parameters' : '设计参数') + '</h3>';
    html += '<table><tr><th>' + (lang === 'en' ? 'Parameter' : '参数') + '</th><th>' + (lang === 'en' ? 'Target' : '目标值') + '</th><th>' + (lang === 'en' ? 'Actual' : '实际值') + '</th><th>' + (lang === 'en' ? 'Error' : '误差') + '</th></tr>';
    html += '<tr><td>' + (lang === 'en' ? 'Filter Type' : '滤波器类型') + '</td><td colspan="3">' + typeName + '</td></tr>';
    html += '<tr><td>' + (lang === 'en' ? 'Cutoff Frequency' : '截止频率') + '</td><td>' + FM.fv(r.fc_target, 1) + ' Hz</td><td>' + FM.fv(r.fc_actual, 1) + ' Hz</td><td>' + FM.fv((r.fc_actual/r.fc_target-1)*100, 2) + '%</td></tr>';
    html += '<tr><td>' + (lang === 'en' ? 'DC Gain' : '直流增益') + '</td><td>' + FM.fv(r.gain_target, 2) + ' V/V (' + FM.fv(20*Math.log10(r.gain_target||1),2) + ' dB)</td><td>' + FM.fv(r.gain_actual, 2) + ' V/V (' + FM.fv(20*Math.log10(r.gain_actual||1),2) + ' dB)</td><td>' + FM.fv((r.gain_actual/r.gain_target-1)*100, 2) + '%</td></tr>';
    if (r.type === "mfb2") {
      html += '<tr><td>Q</td><td>' + FM.fv(r.Q_target, 3) + '</td><td>' + FM.fv(r.Q_actual, 3) + '</td><td>' + FM.fv((r.Q_actual/r.Q_target-1)*100, 2) + '%</td></tr>';
    }
    html += '</table>';

    html += '<h3>2. ' + (lang === 'en' ? 'Component Values' : '器件值') + '</h3>';
    html += '<table><tr><th>Ref</th><th>' + (lang === 'en' ? 'Value' : '值') + '</th></tr>';
    if (r.type === "diff1") {
      html += '<tr><td>R1</td><td>' + FM.valLabel(comps.R1) + 'Ω</td></tr>';
      html += '<tr><td>R2</td><td>' + FM.valLabel(comps.R2) + 'Ω</td></tr>';
      html += '<tr><td>C1</td><td>' + FM.capLabel(comps.C1) + '</td></tr>';
    } else {
      html += '<tr><td>R1</td><td>' + FM.valLabel(comps.R1) + 'Ω</td></tr>';
      html += '<tr><td>R2</td><td>' + FM.valLabel(comps.R2) + 'Ω</td></tr>';
      html += '<tr><td>R3</td><td>' + FM.valLabel(comps.R3) + 'Ω</td></tr>';
      html += '<tr><td>C1</td><td>' + FM.capLabel(comps.C1) + '</td></tr>';
      html += '<tr><td>C2</td><td>' + FM.capLabel(comps.C2) + '</td></tr>';
    }
    html += '</table>';

    html += '<h3>3. ' + (lang === 'en' ? 'Frequency Response' : '频率响应') + '</h3>';
    html += '<p>' + (lang === 'en' ? 'See chart in application for Bode plot.' : '幅频/相频特性图请在应用程序中查看。') + '</p>';
    html += '<p>f_c = ' + FM.fv(r.fc_actual, 1) + ' Hz, G = ' + FM.fv(r.gain_actual, 2) + ' V/V (' + FM.fv(20*Math.log10(r.gain_actual||1),2) + ' dB)' + (r.type==="mfb2"?', Q = '+FM.fv(r.Q_actual,3):'') + '</p>';

    html += '<div class="footer"><p>' + (lang === 'en' ? 'Auto-generated by Auto Hardware Design Tool - Filter Designer' : '自动硬件设计工具 - 信号滤波器设计 自动生成') + '</p></div>';
    html += '</body></html>';

    var blob = new Blob([html], { type: "application/msword" });
    var dn = lang === 'en' ? 'Filter_Design_Report.doc' : '滤波器设计报告.doc';
    if (typeof global.saveBlobWithDialog === "function") {
      global.saveBlobWithDialog(blob, dn);
    } else {
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = dn;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  /* ── Expose ─── */
  global.initFilter = initFilter;
  global.filterTypeChange = filterTypeChange;
  global.filterCalc = filterCalc;
  global.filterGenRep = filterGenRep;
  global.filterExportWord = filterExportWord;

})(window);
