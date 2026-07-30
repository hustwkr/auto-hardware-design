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

  /* ── SVG Schematic Helpers ─── */

  var L = function(x1,y1,x2,y2) {
    return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="currentColor" stroke-width="1.2"/>';
  };

  var GND = function(x, y) {
    return L(x-9, y, x+9, y) + L(x-6, y+6, x+6, y+6) + L(x-3, y+12, x+3, y+12);
  };

  var dot = function(x, y) {
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.5" fill="currentColor"/>';
  };

  // IEC rectangular resistor, horizontal
  var resRect = function(x, y, w, h) {
    return '<rect x="' + x.toFixed(1) + '" y="' + (y-h/2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="none" stroke="currentColor" stroke-width="1.2"/>';
  };

  // resistor body + leads: x1─[rect]─x2 at y
  var resDraw = function(x1, x2, y, w, h, label, value) {
    w = w || 44; h = h || 14;
    var cx = (x1+x2)/2;
    var a = [];
    a.push(L(x1, y, cx-w/2, y));
    a.push(resRect(cx-w/2, y, w, h));
    a.push(L(cx+w/2, y, x2, y));
    if (label) a.push('<text x="' + cx.toFixed(1) + '" y="' + (y-h/2-4).toFixed(1) + '" class="flbl" text-anchor="middle">' + label + '</text>');
    if (value) a.push('<text x="' + cx.toFixed(1) + '" y="' + (y+h/2+13).toFixed(1) + '" class="fref" text-anchor="middle">' + value + '</text>');
    return a.join('');
  };

  // vertical capacitor at x, from y1 to y2
  var capV = function(x, y1, y2) {
    var gap = 8, hw = 6;
    var mid = (y1+y2)/2;
    return L(x, y1, x, mid-gap/2) +
      '<line x1="' + (x-hw).toFixed(1) + '" y1="' + (mid-gap/2).toFixed(1) + '" x2="' + (x+hw).toFixed(1) + '" y2="' + (mid-gap/2).toFixed(1) + '" stroke="currentColor" stroke-width="1.2"/>' +
      '<line x1="' + (x-hw).toFixed(1) + '" y1="' + (mid+gap/2).toFixed(1) + '" x2="' + (x+hw).toFixed(1) + '" y2="' + (mid+gap/2).toFixed(1) + '" stroke="currentColor" stroke-width="1.2"/>' +
      L(x, mid+gap/2, x, y2);
  };

  var opAmpTri = function(x, cy, hh) {
    var s = '<polygon points="' + x + ',' + (cy-hh) + ' ' + x + ',' + (cy+hh) + ' ' + (x+40) + ',' + cy + '" fill="none" stroke="currentColor" stroke-width="1.5"/>';
    s += L(x-12, cy-0.55*hh, x, cy-0.55*hh);
    s += L(x-12, cy+0.55*hh, x, cy+0.55*hh);
    s += '<text x="' + (x-16).toFixed(1) + '" y="' + (cy-0.55*hh+4).toFixed(1) + '" class="flbl" text-anchor="end">-</text>';
    s += '<text x="' + (x-16).toFixed(1) + '" y="' + (cy+0.55*hh+4).toFixed(1) + '" class="flbl" text-anchor="end">+</text>';
    s += '<text x="' + (x+16).toFixed(1) + '" y="' + (cy+4).toFixed(1) + '" class="flbl" text-anchor="middle">A</text>';
    return s;
  };

  /* ================================================================
     1st-Order Differential LPF
     Both (+) and (-) receive signal inputs.
     R3,R4 on (+) side provide impedance matching (R3=R1, R4=R2).

              ┌───── [R2] ────────────────┐
              │                            │
     Vin- ───[R1]───N──┬──(-)──[OP]──┬── Vout
                       │             │
              ┌──────[C1]────────────┘
              │
     Vin+ ───[R3]───(+)──[R4]── GND
     ================================================================ */
  function renderDiff1Svg(w, h, c) {
    var r1V = FM.valLabel(c.R1) + "Ω";
    var r2V = FM.valLabel(c.R2) + "Ω";
    var c1V = FM.capLabel(c.C1);
    var rW = 44, rH = 14;
    var cy = 118, opH = 32;
    var parts = [];

    parts.push('<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-width:580px;color:var(--color-text)">');
    parts.push('<style>.flbl{fill:currentColor;font:13px -apple-system,sans-serif;}.fref{fill:var(--color-text-soft);font:11px -apple-system,sans-serif;}.fnode{fill:currentColor;font:12px -apple-system,sans-serif;font-weight:600}.fdes{fill:currentColor;font:14px -apple-system,sans-serif;font-weight:600}</style>');
    parts.push('<text x="290" y="18" class="fdes" text-anchor="middle">1st-Order Differential Low-Pass Filter</text>');

    // ── layout coordinates ──
    var r1s = 55, r1e = r1s + rW;          // R1: Vin- path, horizontal
    var nX = r1e + 24;                     // summing node (-)
    var opL = nX + 56, opR = opL + 40;     // op-amp
    var nTermY = cy - 0.55*opH;            // (-) terminal y
    var pTermY = cy + 0.55*opH;            // (+) terminal y

    // --- Vin- path (bottom) ---
    parts.push('<text x="18" y="' + (cy+4) + '" class="fnode">Vin−</text>');
    parts.push(L(48, cy, r1s, cy));
    parts.push(resDraw(r1s, r1e, cy, rW, rH, 'R1', r1V));
    // wire from R1 end to (-) summing node
    parts.push(L(r1e, cy, nX, cy));
    // (-) node → op-amp (-) terminal
    parts.push(L(nX, cy, nX, nTermY));
    parts.push(L(nX, nTermY, opL-12, nTermY));
    parts.push(dot(nX, cy));

    // --- Vin+ path (top: y = cy - 42) ---
    var plusY = cy - 50;
    var r3s = 55, r3e = r3s + rW;  // R3 = R1 (matching)
    parts.push('<text x="18" y="' + (plusY+4) + '" class="fnode">Vin+</text>');
    parts.push(L(48, plusY, r3s, plusY));
    parts.push(resDraw(r3s, r3e, plusY, rW, rH, 'R3', r1V));
    // wire from R3 end to (+) terminal
    var plusJ = r3e + 24;  // junction before (+) terminal
    parts.push(L(r3e, plusY, plusJ, plusY));
    parts.push(L(plusJ, plusY, plusJ, pTermY));
    parts.push(L(plusJ, pTermY, opL-12, pTermY));

    // R4 from (+) path to GND (R4 = R2 for matching)
    var r4X = plusJ + 30;
    parts.push(L(plusJ, plusY, r4X, plusY));
    parts.push(resDraw(r4X, r4X+rW, plusY, rW, rH, 'R4', r2V));
    var r4e = r4X + rW;
    parts.push(L(r4e, plusY, r4e, plusY+40));
    parts.push(GND(r4e, plusY+40));

    // Op-amp
    parts.push(opAmpTri(opL, cy, opH));

    // Output
    var voutX = opR + 24;
    parts.push(L(opR, cy, voutX, cy));
    parts.push('<text x="' + (voutX+3) + '" y="' + (cy+4) + '" class="fnode">Vout</text>');

    // ── Feedback: R2 (above) ──
    var tko = opR + 10, fbY = 38;
    parts.push(L(tko, cy, tko, fbY));
    parts.push(resDraw(nX, tko, fbY, rW, rH, 'R2', r2V));
    parts.push(L(nX, fbY, nX, nTermY));

    // ── Feedback: C1 (below) ──
    var tko2 = opR + 4, fbBot = 188;
    parts.push(L(tko2, cy, tko2, fbBot-18));
    parts.push(capV(tko2, fbBot-18, fbBot));
    parts.push(L(tko2, fbBot, nX, fbBot));
    parts.push(L(nX, fbBot, nX, nTermY));
    // C1 label to right
    var c1MidY = (fbBot-18+fbBot)/2;
    parts.push('<text x="' + (tko2+14).toFixed(1) + '" y="' + (c1MidY+4).toFixed(1) + '" class="flbl">C1</text>');
    parts.push('<text x="' + (tko2+14).toFixed(1) + '" y="' + (c1MidY+16).toFixed(1) + '" class="fref">' + c1V + '</text>');

    // Junction dots
    parts.push(dot(nX, nTermY));  // (-) input / feedback junction
    parts.push(dot(plusJ, pTermY));  // (+) input junction

    parts.push('</svg>');
    return parts.join('');
  }

  /* 2nd-Order MFB LPF
            ┌────── [R2] ────────────────────┐
            │                                 │
     Vin ───[R1]──N1──[R3]──N2──(-)──[OP]──┬── Vout
                │                         │
               [C1]                 ┌────[C2]────┐
                │                   │             │
               GND                  └───output────┘

     R2 ∥ C2 in feedback.  N2 → (-).  C1 from N1 to GND.
  */
  function renderMfb2Svg(w, h, c) {
    var r1V = FM.valLabel(c.R1) + "Ω";
    var r2V = FM.valLabel(c.R2) + "Ω";
    var r3V = FM.valLabel(c.R3) + "Ω";
    var c1V = FM.capLabel(c.C1);
    var c2V = FM.capLabel(c.C2);
    var rW = 44, rH = 14;
    var cy = 118, opH = 32;
    var parts = [];

    parts.push('<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-width:580px;color:var(--color-text)">');
    parts.push('<style>.flbl{fill:currentColor;font:13px -apple-system,sans-serif;}.fref{fill:var(--color-text-soft);font:11px -apple-system,sans-serif;}.fnode{fill:currentColor;font:12px -apple-system,sans-serif;font-weight:600}.fdes{fill:currentColor;font:14px -apple-system,sans-serif;font-weight:600}</style>');
    parts.push('<text x="290" y="18" class="fdes" text-anchor="middle">2nd-Order MFB Low-Pass Filter</text>');

    // ── layout ──
    var r1s = 45, r1e = r1s + rW;           // R1
    var N1 = r1e + 22;                      // node 1 (R1/R3/C1 junction)
    var r3s = N1, r3e = r3s + rW;           // R3
    var N2 = r3e + 20;                      // node 2 (R3 → (-) junction)
    var opL = N2 + 52, opR = opL + 40;      // op-amp
    var nTermY = cy - 0.55*opH, pTermY = cy + 0.55*opH;

    // --- Vin → R1 → N1 ---
    parts.push('<text x="18" y="' + (cy+4) + '" class="fnode">Vin</text>');
    parts.push(L(42, cy, r1s, cy));
    parts.push(resDraw(r1s, r1e, cy, rW, rH, 'R1', r1V));
    parts.push(L(r1e, cy, N1, cy));
    parts.push(dot(N1, cy));

    // --- C1 from N1 to GND ---
    var c1Bot = cy + 60;
    parts.push(L(N1, cy, N1, c1Bot-22));
    parts.push(capV(N1, c1Bot-22, c1Bot));
    parts.push(GND(N1, c1Bot));
    parts.push('<text x="' + (N1+12).toFixed(1) + '" y="' + (c1Bot-17).toFixed(1) + '" class="flbl">C1</text>');
    parts.push('<text x="' + (N1+12).toFixed(1) + '" y="' + (c1Bot-5).toFixed(1) + '" class="fref">' + c1V + '</text>');

    // --- R3: N1 → N2 ---
    parts.push(resDraw(N1, N2, cy, rW, rH, 'R3', r3V));
    parts.push(dot(N2, cy));

    // --- N2 → (-) terminal ---
    parts.push(L(N2, cy, N2, nTermY));
    parts.push(L(N2, nTermY, opL-12, nTermY));

    // Op-amp
    parts.push(opAmpTri(opL, cy, opH));

    // --- (+) to GND (routed to the left, avoiding feedback verticals) ---
    var gndX = opL - 44;   // GND horizontal offset, cleared from fb vertical
    parts.push(L(opL-12, pTermY, opL-12, pTermY+22));
    parts.push(L(opL-12, pTermY+22, gndX, pTermY+22));
    parts.push(L(gndX, pTermY+22, gndX, cy+54));
    parts.push(GND(gndX, cy+54));

    // Output
    var voutX = opR + 24;
    parts.push(L(opR, cy, voutX, cy));
    parts.push('<text x="' + (voutX+3) + '" y="' + (cy+4) + '" class="fnode">Vout</text>');

    // ── Feedback: R2 (above) → fb vertical at x = opL - 30 ──
    var fbx = opL - 30;   // dedicated feedback vertical column
    var tko = opR + 8, fbTop = 38;
    parts.push(L(tko, cy, tko, fbTop));
    parts.push(resDraw(fbx, tko, fbTop, rW, rH, 'R2', r2V));
    parts.push(L(fbx, fbTop, fbx, nTermY));

    // ── Feedback: C2 (below) ──
    var tko2 = opR + 4, fbBot = 196;
    parts.push(L(tko2, cy, tko2, fbBot-18));
    parts.push(capV(tko2, fbBot-18, fbBot));
    parts.push(L(tko2, fbBot, fbx, fbBot));
    parts.push(L(fbx, fbBot, fbx, nTermY));
    var c2MidY = (fbBot-18+fbBot)/2;
    parts.push('<text x="' + (tko2+14).toFixed(1) + '" y="' + (c2MidY+4).toFixed(1) + '" class="flbl">C2</text>');
    parts.push('<text x="' + (tko2+14).toFixed(1) + '" y="' + (c2MidY+16).toFixed(1) + '" class="fref">' + c2V + '</text>');

    // Junction dots (only at actual connection points, no duplicates)
    parts.push(dot(opL-12, nTermY));  // (-) input
    parts.push(dot(fbx, nTermY));     // feedback bus → (-) terminal

    parts.push('</svg>');
    return parts.join('');
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
