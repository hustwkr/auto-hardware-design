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
    var ctx1 = (document.getElementById("filterChartMag")||{}).getContext;
    if (ctx1) { var c = document.getElementById("filterChartMag"); var x = c.getContext("2d"); x.clearRect(0,0,c.width,c.height); }
    var ctx2 = (document.getElementById("filterChartPhase")||{}).getContext;
    if (ctx2) { var c = document.getElementById("filterChartPhase"); var x = c.getContext("2d"); x.clearRect(0,0,c.width,c.height); }
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

  /* ── Shared helpers for chart rendering ─── */
  function chartSetup(canvasId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (w <= 0 || h <= 0) return null;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  function freqAxisData(data) {
    var fMin = data[0].f, fMax = data[data.length-1].f;
    var steps = [], base = Math.pow(10, Math.floor(Math.log10(fMin)));
    for (var decade = 0; ; decade++) {
      for (var sub = 1; sub <= 9; sub += 1) {
        var f = base * Math.pow(10, decade) * sub;
        if (f >= fMin && f <= fMax) steps.push({f: f, label: sub===1 ? (f>=1000?(f/1000)+'k':String(f)) : null});
      }
      if (base * Math.pow(10, decade) * 10 > fMax) break;
    }
    return { fMin: fMin, fMax: fMax, steps: steps };
  }

  function drawFreqAxis(ctx, axis, margin, plotW, plotH) {
    var txt = ctx.fillStyle, grid = ctx.strokeStyle, lw = ctx.lineWidth;
    ctx.textAlign = "center";
    axis.steps.forEach(function(s) {
      var x = margin.left + plotW * Math.log(s.f / axis.fMin) / Math.log(axis.fMax / axis.fMin);
      ctx.beginPath(); ctx.moveTo(x, margin.top); ctx.lineTo(x, margin.top + plotH); ctx.stroke();
      if (s.label) ctx.fillText(s.label, x, margin.top + plotH + 16);
    });
  }

  function chartColors() {
    var d = document.documentElement.getAttribute("data-theme") === "dark";
    return {
      grid: d ? "#334155" : "#e2e8f0", text: d ? "#94a3b8" : "#64748b",
      axis: d ? "#475569" : "#cbd5e1", bg: d ? "#0f172a" : "#ffffff",
      mag: d ? "#60a5fa" : "#2563eb", phase: d ? "#34d399" : "#059669",
      ref: d ? "#fb923c" : "#f59e0b"
    };
  }

  /* ── Render magnitude (Bode gain) chart ─── */
  function renderMagChart(r) {
    var setup = chartSetup("filterChartMag");
    if (!setup) return;
    var ctx = setup.ctx, W = setup.w, H = setup.h;

    var data = r.freqResp; if (!data || data.length < 2) return;
    var C = chartColors();
    var axis = freqAxisData(data);
    var margin = {top: 12, bottom: 28, left: 52, right: 16};
    var pw = W - margin.left - margin.right, ph = H - margin.top - margin.bottom;
    var fToX = function(f) { return margin.left + pw * Math.log(f/axis.fMin) / Math.log(axis.fMax/axis.fMin); };

    // dynamic Y range
    var magMin = -80, magMax = 10;
    data.forEach(function(d) { if (d.magDb<magMin) magMin=d.magDb; if (d.magDb>magMax) magMax=d.magDb; });
    magMin = Math.floor(magMin/10)*10; magMax = Math.ceil((magMax+5)/10)*10;
    if (magMax-magMin<20) magMax = magMin+20;
    var magY = function(db) { return margin.top + ph * (1 - (db - magMin)/(magMax-magMin)); };

    // Background
    ctx.fillStyle = C.bg;
    ctx.fillRect(margin.left, margin.top, pw, ph);

    // Grid
    ctx.strokeStyle = C.grid; ctx.lineWidth = 0.5; ctx.fillStyle = C.text;
    ctx.font = "10px " + getComputedStyle(document.body).fontFamily; ctx.textAlign = "right";
    for (var db = magMin; db <= magMax; db += 10) {
      var y = magY(db);
      ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left+pw, y); ctx.stroke();
      ctx.fillText(db+" dB", margin.left-4, y+4);
    }
    drawFreqAxis(ctx, axis, margin, pw, ph);

    // Trace
    ctx.strokeStyle = C.mag; ctx.lineWidth = 1.5; ctx.beginPath();
    data.forEach(function(d, i) { var x = fToX(d.f), y = magY(d.magDb); i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); });
    ctx.stroke();

    // -3dB reference
    if (r.gain_actual) {
      var gDb = 20*Math.log10(r.gain_actual||1e-10), y3 = magY(gDb-3);
      ctx.strokeStyle = C.ref; ctx.lineWidth = 0.5; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(margin.left, y3); ctx.lineTo(margin.left+pw, y3); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.ref; ctx.font = "9px "+getComputedStyle(document.body).fontFamily; ctx.textAlign = "left";
      ctx.fillText("-3 dB", margin.left+3, y3-2);
    }

    // Frame & Y label
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
    ctx.strokeRect(margin.left, margin.top, pw, ph);
    ctx.save(); ctx.translate(10, margin.top+ph/2); ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center"; ctx.fillStyle = C.text; ctx.font = "11px "+getComputedStyle(document.body).fontFamily;
    ctx.fillText("Magnitude (dB)", 0, 0); ctx.restore();

    // Legend
    ctx.fillStyle = C.mag; ctx.fillRect(margin.left+pw-110, margin.top+5, 10, 10);
    ctx.textAlign = "left"; ctx.fillStyle = C.text; ctx.font = "10px "+getComputedStyle(document.body).fontFamily;
    ctx.fillText("|H(f)|", margin.left+pw-96, margin.top+14);
  }

  /* ── Render phase (Bode phase) chart ─── */
  function renderPhaseChart(r) {
    var setup = chartSetup("filterChartPhase");
    if (!setup) return;
    var ctx = setup.ctx, W = setup.w, H = setup.h;

    var data = r.freqResp; if (!data || data.length < 2) return;
    var C = chartColors();
    var axis = freqAxisData(data);
    var margin = {top: 12, bottom: 28, left: 52, right: 16};
    var pw = W - margin.left - margin.right, ph = H - margin.top - margin.bottom;
    var fToX = function(f) { return margin.left + pw * Math.log(f/axis.fMin) / Math.log(axis.fMax/axis.fMin); };

    var phMin = -185, phMax = 5;
    var phY = function(deg) { return margin.top + ph * (1 - (deg - phMin)/(phMax - phMin)); };

    // Background
    ctx.fillStyle = C.bg;
    ctx.fillRect(margin.left, margin.top, pw, ph);

    // Grid
    ctx.strokeStyle = C.grid; ctx.lineWidth = 0.5; ctx.fillStyle = C.text;
    ctx.font = "10px " + getComputedStyle(document.body).fontFamily; ctx.textAlign = "right";
    for (var ph = -180; ph <= 0; ph += 45) {
      var y = phY(ph);
      ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left+pw, y); ctx.stroke();
      ctx.fillText(ph+"\u00B0", margin.left-4, y+4);
    }
    drawFreqAxis(ctx, axis, margin, pw, ph);

    // Trace
    ctx.strokeStyle = C.phase; ctx.lineWidth = 1.5; ctx.beginPath();
    data.forEach(function(d, i) { var x = fToX(d.f), y = phY(d.phaseDeg); i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); });
    ctx.stroke();

    // Frame & Y label
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
    ctx.strokeRect(margin.left, margin.top, pw, ph);
    ctx.save(); ctx.translate(10, margin.top+ph/2); ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center"; ctx.fillStyle = C.text; ctx.font = "11px "+getComputedStyle(document.body).fontFamily;
    ctx.fillText("Phase (°)", 0, 0); ctx.restore();

    // Legend
    ctx.fillStyle = C.phase; ctx.fillRect(margin.left+pw-70, margin.top+5, 10, 10);
    ctx.textAlign = "left"; ctx.fillStyle = C.text; ctx.font = "10px "+getComputedStyle(document.body).fontFamily;
    ctx.fillText("∠H(f)", margin.left+pw-56, margin.top+14);
  }

  /* ── Render both charts ─── */
  function renderFilterChart(r) {
    renderMagChart(r);
    renderPhaseChart(r);
  }

  /* ── Render circuit schematic (SVG) ─── */
  function renderFilterSchematic(r) {
    var el = document.getElementById("filterSchematic");
    if (!el) return;

    var comps = r.components;
    var svg = r.type === "diff1" ? renderDiff1Svg(comps) : renderMfb2Svg(comps);
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

  // horizontal capacitor from x1 to x2 at y
  var capH = function(x1, x2, y) {
    var gap = 8, hw = 6;
    var mid = (x1+x2)/2;
    return L(x1, y, mid-gap/2, y) +
      '<line x1="' + (mid-gap/2).toFixed(1) + '" y1="' + (y-hw).toFixed(1) + '" x2="' + (mid-gap/2).toFixed(1) + '" y2="' + (y+hw).toFixed(1) + '" stroke="currentColor" stroke-width="1.2"/>' +
      '<line x1="' + (mid+gap/2).toFixed(1) + '" y1="' + (y-hw).toFixed(1) + '" x2="' + (mid+gap/2).toFixed(1) + '" y2="' + (y+hw).toFixed(1) + '" stroke="currentColor" stroke-width="1.2"/>' +
      L(mid+gap/2, y, x2, y);
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
     RENDER: 1st-Order Differential Low-Pass Filter

     Topology: Vin- → R1 → (-) junction   |   Vin+ → R3 → (+) junction
               R2 ∥ C1 as feedback from output to (-) junction
               R4 from (+) junction to GND (matched impedance)
  ================================================================ */
  function renderDiff1Svg(c) {
    var r1V = FM.valLabel(c.R1) + "\u03A9";
    var r2V = FM.valLabel(c.R2) + "\u03A9";
    var c1V = FM.capLabel(c.C1);
    var RW = 44, RH = 14;

    // === Coordinate system ===
    var opX   = 240;   // op-amp left edge
    var opCY  = 125;   // op-amp vertical centre
    var opHH  = 32;    // half-height
    var nTY   = opCY - 18;  // (-) terminal Y = 107
    var pTY   = opCY + 18;  // (+) terminal Y = 143
    var opR   = opX + 40;   // op-amp output tip = 280

    // (-) summing junction (where R1, R2∥C1 feedback all meet)
    var negJ  = opX - 90;        // x = 150
    // (+) bias junction (where R3, R4, op-amp(+) meet)
    var posJ  = negJ;            // same X for clean layout

    var vinMinusY = 70;          // upper input path
    var vinPlusY  = 177;         // lower input path

    // feedback routing
    var fbTakeX  = opR + 18;     // output takeoff X = 298
    var fbTopY   = 30;           // upper feedback bus Y
    var fbMidY   = 50;           // C1 bus Y
    var fbBusX   = opX - 10;     // feedback vertical bus X = 230

    var parts = [];
    parts.push('<svg viewBox="0 0 640 240" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-width:640px;color:var(--color-text)">');
    parts.push('<style>.flbl{fill:currentColor;font:13px -apple-system,sans-serif;}.fref{fill:var(--color-text-soft);font:11px -apple-system,sans-serif;}.fnode{fill:currentColor;font:12px -apple-system,sans-serif;font-weight:600}.fdes{fill:currentColor;font:14px -apple-system,sans-serif;font-weight:600}</style>');
    parts.push('<text x="320" y="18" class="fdes" text-anchor="middle">1st-Order Differential Low-Pass Filter</text>');

    // ── Vin- → R1 → negJ ──
    parts.push('<text x="5" y="' + (vinMinusY+4) + '" class="fnode">Vin\u2212</text>');
    parts.push(L(34, vinMinusY, 34, vinMinusY));  // short lead
    parts.push(resDraw(34, 86, vinMinusY, RW, RH, 'R1', r1V));
    parts.push(L(86, vinMinusY, 86, opCY));
    parts.push(L(86, opCY, negJ, opCY));
    // wire from negJ up to (-) terminal level, then into op-amp
    parts.push(L(negJ, opCY, negJ, nTY));
    parts.push(L(negJ, nTY, opX-12, nTY));
    parts.push(dot(negJ, opCY));

    // ── Vin+ → R3 → posJ ──
    parts.push('<text x="5" y="' + (vinPlusY+4) + '" class="fnode">Vin+</text>');
    parts.push(resDraw(34, 86, vinPlusY, RW, RH, 'R3', FM.valLabel(c.R1)+'\u03A9')); // R3=R1 label
    parts.push(L(86, vinPlusY, 86, pTY));
    parts.push(L(86, pTY, posJ, pTY));
    parts.push(dot(posJ, pTY));
    // posJ to (+) terminal
    parts.push(L(posJ, pTY, opX-12, pTY));

    // ── R4 from posJ to GND ──
    var r4s = posJ + 14;  // small gap from junction
    parts.push(L(posJ, pTY, r4s, pTY));
    parts.push(resDraw(r4s, r4s + RW, pTY, RW, RH, 'R4', r2V));
    var r4e = r4s + RW;
    parts.push(L(r4e, pTY, r4e, pTY + 54));
    parts.push(GND(r4e, pTY + 54));

    // ── Op-amp ──
    parts.push(opAmpTri(opX, opCY, opHH));

    // ── Output wire ──
    var voutX = opR + 60;
    parts.push(L(opR, opCY, voutX, opCY));
    parts.push('<text x="' + (voutX+3) + '" y="' + (opCY+4) + '" class="fnode">Vout</text>');

    // ── Feedback R2 ∥ C1: output → top → back to negJ ──
    // Takeoff from output up to feedback bus
    parts.push(L(fbTakeX, opCY, fbTakeX, fbTopY));
    // R2 on upper horizontal
    parts.push(resDraw(fbBusX, fbTakeX, fbTopY, RW, RH, 'R2', r2V));
    // C1 on lower horizontal (parallel with R2)
    parts.push(L(fbTakeX, opCY, fbTakeX, fbMidY));  // second takeoff for C1
    parts.push(capH(fbBusX, fbTakeX, fbMidY));
    parts.push('<text x="' + ((fbBusX+fbTakeX)/2).toFixed(0) + '" y="' + (fbMidY-9) + '" class="flbl" text-anchor="middle">C1</text>');
    parts.push('<text x="' + ((fbBusX+fbTakeX)/2).toFixed(0) + '" y="' + (fbMidY+19) + '" class="fref" text-anchor="middle">' + c1V + '</text>');
    // vertical drop bus at fbBusX: connects both R2 and C1 down to (-) level
    parts.push(L(fbBusX, fbTopY, fbBusX, nTY));
    // horizontal from feedback bus to negJ (-) terminal node
    parts.push(L(fbBusX, nTY, negJ, nTY));

    // ── Junction dots ──
    parts.push(dot(negJ, nTY));     // (-) input node
    parts.push(dot(fbBusX, nTY));   // feedback bus join

    parts.push('</svg>');
    return parts.join('');
  }

  /* ================================================================
     RENDER: 2nd-Order MFB Low-Pass Filter

     Standard MFB: Vin → R1 → N1 → R3 → N2 → (-) → Vout
     C1 from N1 to GND.  R2 ∥ C2 in feedback from output to N2.
     (+) to GND.
  ================================================================ */
  function renderMfb2Svg(c) {
    var r1V = FM.valLabel(c.R1) + "\u03A9";
    var r2V = FM.valLabel(c.R2) + "\u03A9";
    var r3V = FM.valLabel(c.R3) + "\u03A9";
    var c1V = FM.capLabel(c.C1);
    var c2V = FM.capLabel(c.C2);
    var RW = 44, RH = 14;

    // === Coordinate system ===
    var opX   = 235;    // op-amp left edge
    var opCY  = 125;    // op-amp vertical centre
    var opHH  = 32;     // half-height
    var nTY   = opCY - 18;   // (-) terminal Y = 107
    var pTY   = opCY + 18;   // (+) terminal Y = 143
    var opR   = opX + 40;    // output tip = 275

    var sigY  = opCY;        // main signal Y = 125

    // signal nodes (left to right along sigY)
    var n1X   = opX - 130;   // N1: after R1, C1 to GND = 105
    var n2X   = opX - 42;    // N2: after R3, feedback join = 193

    // feedback routing (above op-amp)
    var fbTakeX = opR + 22;  // output takeoff = 297
    var fbBusX  = n2X + 44;  // feedback vertical bus = 237
    var fbTopY  = 28;        // R2 bus
    var fbMidY  = 50;        // C2 bus

    var parts = [];
    parts.push('<svg viewBox="0 0 640 270" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-width:640px;color:var(--color-text)">');
    parts.push('<style>.flbl{fill:currentColor;font:13px -apple-system,sans-serif;}.fref{fill:var(--color-text-soft);font:11px -apple-system,sans-serif;}.fnode{fill:currentColor;font:12px -apple-system,sans-serif;font-weight:600}.fdes{fill:currentColor;font:14px -apple-system,sans-serif;font-weight:600}</style>');
    parts.push('<text x="320" y="18" class="fdes" text-anchor="middle">2nd-Order MFB Low-Pass Filter</text>');

    // ── Vin → R1 → N1 ──
    parts.push('<text x="5" y="' + (sigY+4) + '" class="fnode">Vin</text>');
    parts.push(L(32, sigY, 32, sigY));
    parts.push(resDraw(32, n1X-18, sigY, RW, RH, 'R1', r1V));
    parts.push(L(n1X-18, sigY, n1X, sigY));
    parts.push(dot(n1X, sigY));

    // ── C1: N1 → GND (vertical) ──
    var c1Bot = sigY + 85;
    parts.push(L(n1X, sigY, n1X, c1Bot-22));
    parts.push(capV(n1X, c1Bot-22, c1Bot));
    parts.push(GND(n1X, c1Bot));
    parts.push('<text x="' + (n1X+14) + '" y="' + (c1Bot-10) + '" class="flbl">C1</text>');
    parts.push('<text x="' + (n1X+14) + '" y="' + (c1Bot+2) + '" class="fref">' + c1V + '</text>');

    // ── R3: N1 → N2 ──
    var r3s = n1X + 18;
    parts.push(L(n1X, sigY, r3s, sigY));
    parts.push(resDraw(r3s, n2X-18, sigY, RW, RH, 'R3', r3V));
    parts.push(L(n2X-18, sigY, n2X, sigY));
    parts.push(dot(n2X, sigY));

    // ── N2 → op-amp (-) ──
    parts.push(L(n2X, sigY, n2X, nTY));
    parts.push(L(n2X, nTY, opX-12, nTY));

    // ── Op-amp ──
    parts.push(opAmpTri(opX, opCY, opHH));

    // ── (+) terminal → GND ──
    parts.push(L(opX-12, pTY, n2X, pTY));
    parts.push(L(n2X, pTY, n2X, pTY+40));
    parts.push(GND(n2X, pTY+40));

    // ── Output ──
    var voutX = opR + 60;
    parts.push(L(opR, opCY, voutX, opCY));
    parts.push('<text x="' + (voutX+3) + '" y="' + (opCY+4) + '" class="fnode">Vout</text>');

    // ── Feedback R2 ∥ C2: output → top → back to N2 ──
    // takeoff from output up to feedback bus
    parts.push(L(fbTakeX, opCY, fbTakeX, fbTopY));
    // R2 on upper horizontal
    parts.push(resDraw(fbBusX, fbTakeX, fbTopY, RW, RH, 'R2', r2V));
    // C2 on lower horizontal (parallel with R2)
    parts.push(L(fbTakeX, opCY, fbTakeX, fbMidY));
    parts.push(capH(fbBusX, fbTakeX, fbMidY));
    parts.push('<text x="' + ((fbBusX+fbTakeX)/2).toFixed(0) + '" y="' + (fbMidY-9) + '" class="flbl" text-anchor="middle">C2</text>');
    parts.push('<text x="' + ((fbBusX+fbTakeX)/2).toFixed(0) + '" y="' + (fbMidY+19) + '" class="fref" text-anchor="middle">' + c2V + '</text>');
    // vertical drop bus: connects both R2 and C2 to N2 level
    parts.push(L(fbBusX, fbTopY, fbBusX, nTY));
    // horizontal from feedback bus to N2
    parts.push(L(fbBusX, nTY, n2X, nTY));

    // ── Junction dots ──
    parts.push(dot(n2X, nTY));     // (-) input / feedback join
    parts.push(dot(fbBusX, nTY));   // feedback bus

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
      html += '<p><span class="latex" data-l="H(s) = -\\frac{R_2/R_1}{1 + s\\,R_2 C_1}"></span></p>';
      html += '<p><span class="latex" data-l="G = \\frac{R_2}{R_1} = \\frac{' + FM.valLabel(comps.R2) + '}{' + FM.valLabel(comps.R1) + '} = ' + FM.fv(r.gain_actual, 2) + '"></span></p>';
      html += '<p><span class="latex" data-l="f_c = \\frac{1}{2\\pi\\,R_2 C_1} = \\frac{1}{2\\pi\\cdot' + FM.valLabel(comps.R2) + '\\cdot' + FM.capLabel(comps.C1) + '} = ' + FM.fv(r.fc_actual, 1) + '\\text{ Hz}"></span></p>';
    } else {
      html += '<p><span class="latex" data-l="H(s) = -\\frac{R_2/(R_1+R_3)}{1 + s\\left(R_2C_2 + \\frac{C_1 R_1 R_3}{R_1+R_3}\\right) + s^2\\frac{C_1 C_2 R_1 R_2 R_3}{R_1+R_3}}"></span></p>';
      html += '<p><span class="latex" data-l="G = \\frac{R_2}{R_1+R_3} = \\frac{' + FM.valLabel(comps.R2) + '}{' + FM.valLabel(comps.R1) + '+' + FM.valLabel(comps.R3) + '} = ' + FM.fv(r.gain_actual, 2) + '"></span></p>';
      html += '<p><span class="latex" data-l="f_c = ' + FM.fv(r.fc_actual, 1) + '\\text{ Hz}"></span></p>';
      html += '<p><span class="latex" data-l="Q = ' + FM.fv(r.Q_actual, 3) + '"></span></p>';
    }
    html += '</div>';

    document.getElementById("filterRc").innerHTML = html;
    if (typeof window._renderLatex === 'function') window._renderLatex();
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
