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

  /* ── Lazy init — show placeholder results ─── */
  function initFilter() {
    filterShowPlaceholders();
  }

  /* ── Type change handler ─── */
  function filterTypeChange() {
    var type = gvs("filterType");
    document.getElementById("filterQGroup").style.display = (type === "mfb2") ? "" : "none";
    // Apply per-topology defaults from server cache
    var fd = window.__filterDefaults;
    if (fd) {
      var cfg = fd[type] || {};
      var elFc = document.getElementById("filterFc"); if (elFc && cfg.fc != null) elFc.value = cfg.fc;
      var elG = document.getElementById("filterGain"); if (elG && cfg.gain != null) elG.value = cfg.gain;
      var elQ = document.getElementById("filterQ"); if (elQ && cfg.Q != null) elQ.value = cfg.Q;
    }
    filterShowPlaceholders();
  }

  /* ── Show placeholder rows matching the selected filter type ─── */
  function filterShowPlaceholders() {
    var t = global._t || function(k){return k;};
    var type = gvs("filterType");

    // Result grid
    var el = document.getElementById("filterResultsContent");
    if (el) {
      var html = '<div class="result-grid"><div class="ri"><div class="rl">' + t("filter.topology") + '</div><div class="rv rv-placeholder">—</div></div><div class="ri"><div class="rl">' + t("filter.fc") + '</div><div class="rv rv-placeholder">—</div></div><div class="ri"><div class="rl">' + t("filter.gain") + '</div><div class="rv rv-placeholder">—</div></div>';
      if (type === "mfb2") {
        html += '<div class="ri"><div class="rl">' + t("filter.q") + '</div><div class="rv rv-placeholder">—</div></div>';
      }
      html += '</div>';
      el.innerHTML = html;
    }

    // Component table
    var cel = document.getElementById("filterComponentsTable");
    if (cel) {
      var ch = '<table class="sg-tbl"><thead><tr><th>' + t("filter.ref") + '</th><th>' + t("filter.value") + '</th></tr></thead><tbody>';
      if (type === "diff1") {
        ch += '<tr><td>R1</td><td><span class="rv-placeholder">—</span></td></tr><tr><td>R2</td><td><span class="rv-placeholder">—</span></td></tr><tr><td>R3</td><td><span class="rv-placeholder">—</span></td></tr><tr><td>R4</td><td><span class="rv-placeholder">—</span></td></tr><tr><td>C3</td><td><span class="rv-placeholder">—</span></td></tr><tr><td>C4</td><td><span class="rv-placeholder">—</span></td></tr>';
      } else {
        ch += '<tr><td>R1</td><td><span class="rv-placeholder">—</span></td></tr><tr><td>R2</td><td><span class="rv-placeholder">—</span></td></tr><tr><td>R3</td><td><span class="rv-placeholder">—</span></td></tr><tr><td>C1</td><td><span class="rv-placeholder">—</span></td></tr><tr><td>C2</td><td><span class="rv-placeholder">—</span></td></tr>';
      }
      ch += '</tbody></table>';
      cel.innerHTML = ch;
    }

    // Clear other state
    var ctx1 = (document.getElementById("filterChartMag")||{}).getContext;
    if (ctx1) { var c = document.getElementById("filterChartMag"); var x = c.getContext("2d"); x.clearRect(0,0,c.width,c.height); }
    var ctx2 = (document.getElementById("filterChartPhase")||{}).getContext;
    if (ctx2) { var c = document.getElementById("filterChartPhase"); var x = c.getContext("2d"); x.clearRect(0,0,c.width,c.height); }
    var schematic = document.getElementById("filterSchematic");
    if (schematic) schematic.innerHTML = "";
    global._filterResult = null;
    global._filterPrevResult = null;
  }

  /* ── Core calculation ─── */
  function filterCalc() {
    var btn = document.getElementById("filterCalcBtn");
    if (!btn) return;
    btn.textContent = "计算中…";
    btn.disabled = true;

    // Defer actual calculation so browser repaints the button text first
    setTimeout(function() { doFilterCalc(btn); }, 50);
  }

  function doFilterCalc(btn) {
    var type = gvs("filterType");
    var series = gvs("filterSeries");
    var fc = gv("filterFc");
    var gain = gv("filterGain");
    var Q = gv("filterQ");

    function restoreBtn() { if (btn) { btn.textContent = "开始计算"; btn.disabled = false; } }

    if (!fc || fc <= 0) { filterClearResults(); restoreBtn(); return; }

    var result;
    try {
      if (type === "diff1") {
        result = FM.designFilter(type, { fc: fc, gain: gain, series: series });
      } else {
        var qVal = Q > 0 ? Q : 0.707;
        result = FM.designFilter(type, { fc: fc, gain: gain, Q: qVal, series: series });
      }
    } catch(e) {
      var warn = document.getElementById("filterWarn");
      if (warn) { warn.textContent = "⚠ " + (e.message || "Calculation error"); warn.style.display = "block"; }
      restoreBtn();
      return;
    }

    if (!result) { restoreBtn(); return; }

    // Store for chart & report
    global._filterResult = result;

    // Hide warning
    var warn = document.getElementById("filterWarn");
    if (warn) warn.style.display = "none";

    // Render results
    renderFilterResults(result);
    renderFilterChart(result);
    renderFilterSchematic(result);

    // Highlight values that actually changed vs previous run
    setTimeout(function() {
      var prev = global._filterPrevResult;
      var highlights = [];

      // Result grid values: .rv elements in order: topology, fc, gain, Q(if mfb2)
      var rvs = document.querySelectorAll("#filterResultsContent .rv");
      var gridIdx = 0;
      rvs.forEach(function(el) {
        var val = el.textContent.trim();
        // topology is static — skip index 0
        if (gridIdx === 0) { gridIdx++; return; }
        if (prev && prev.grid && prev.grid[gridIdx] === val) { gridIdx++; return; }
        highlights.push(el);
        gridIdx++;
      });

      // Component table: every 2nd <td> (value column)
      var tds = document.querySelectorAll("#filterComponentsTable td");
      tds.forEach(function(td, i) {
        if (i % 2 !== 1) return; // only value cells (1,3,5...)
        var val = td.textContent.trim();
        var ci = Math.floor(i / 2);
        if (prev && prev.comp && prev.comp[ci] === val) return;
        highlights.push(td);
      });

      highlights.forEach(function(el) { el.classList.add("filter-rv-highlight"); });
      setTimeout(function() {
        highlights.forEach(function(el) { el.classList.remove("filter-rv-highlight"); });
      }, 2600);

      // Snapshot current values
      var snap = { grid: [], comp: [] };
      rvs.forEach(function(el, i) { snap.grid[i] = el.textContent.trim(); });
      tds.forEach(function(td, i) {
        if (i % 2 === 1) snap.comp.push(td.textContent.trim());
      });
      global._filterPrevResult = snap;
    }, 10);

    restoreBtn();
  }

  /* ── Clear results (keep placeholders) ─── */
  function filterClearResults() {
    var ctx1 = (document.getElementById("filterChartMag")||{}).getContext;
    if (ctx1) { var c = document.getElementById("filterChartMag"); var x = c.getContext("2d"); x.clearRect(0,0,c.width,c.height); }
    var ctx2 = (document.getElementById("filterChartPhase")||{}).getContext;
    if (ctx2) { var c = document.getElementById("filterChartPhase"); var x = c.getContext("2d"); x.clearRect(0,0,c.width,c.height); }
    var schematic = document.getElementById("filterSchematic");
    if (schematic) schematic.innerHTML = "";
    global._filterResult = null;
    global._filterPrevResult = null;
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
    }

    html += '</div>';
    el.innerHTML = html;

    // Component table → separate div
    var cel = document.getElementById("filterComponentsTable");
    if (cel) {
      var comps = r.components;
      var ch = '<table class="sg-tbl"><thead><tr><th>' + t("filter.ref") + '</th><th>' + t("filter.value") + '</th></tr></thead><tbody>';
      if (r.type === "diff1") {
        ch += '<tr><td>R1</td><td>' + FM.valLabel(comps.R1) + '\u03A9</td></tr>';
        ch += '<tr><td>R2</td><td>' + FM.valLabel(comps.R2) + '\u03A9</td></tr>';
        ch += '<tr><td>R3</td><td>' + FM.valLabel(comps.R3) + '\u03A9</td></tr>';
        ch += '<tr><td>R4</td><td>' + FM.valLabel(comps.R4) + '\u03A9</td></tr>';
        ch += '<tr><td>C3</td><td>' + FM.capLabel(comps.C3) + '</td></tr>';
        ch += '<tr><td>C4</td><td>' + FM.capLabel(comps.C4) + '</td></tr>';
      } else {
        ch += '<tr><td>R1</td><td>' + FM.valLabel(comps.R1) + '\u03A9</td></tr>';
        ch += '<tr><td>R2</td><td>' + FM.valLabel(comps.R2) + '\u03A9</td></tr>';
        ch += '<tr><td>R3</td><td>' + FM.valLabel(comps.R3) + '\u03A9</td></tr>';
        ch += '<tr><td>C1</td><td>' + FM.capLabel(comps.C1) + '</td></tr>';
        ch += '<tr><td>C2</td><td>' + FM.capLabel(comps.C2) + '</td></tr>';
      }
      ch += '</tbody></table>';
      cel.innerHTML = ch;
    }
  }

  /* ── Shared helpers for chart rendering ─── */
  function chartSetup(canvasId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;
    var dpr = window.devicePixelRatio || 1;
    var cs = getComputedStyle(canvas);
    var w = parseFloat(cs.width), h = parseFloat(cs.height);
    if (w <= 0 || h <= 0) return null;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = cs.width;
    canvas.style.height = cs.height;
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
    ctx.save();
    ctx.textAlign = "center";
    axis.steps.forEach(function(s) {
      var x = margin.left + plotW * Math.log(s.f / axis.fMin) / Math.log(axis.fMax / axis.fMin);
      ctx.beginPath(); ctx.moveTo(x, margin.top); ctx.lineTo(x, margin.top + plotH);
      ctx.stroke();
      if (s.label) ctx.fillText(s.label, x, margin.top + plotH + 14);
    });
    ctx.restore();
  }

  function chartColors() {
    var d = document.documentElement.getAttribute("data-theme") === "dark";
    return {
      grid: d ? "#334155" : "#e2e8f0", text: d ? "#a0aec0" : "#475569",
      axis: d ? "#475569" : "#cbd5e1", bg: d ? "#0f172a" : "#ffffff",
      mag: d ? "#60a5fa" : "#2563eb", phase: d ? "#34d399" : "#059669",
      ref: d ? "#fb923c" : "#f59e0b"
    };
  }

  /* ── Render magnitude (Bode gain) chart ─── */
  function renderMagChart(r) {
    var canvas = document.getElementById("filterChartMag");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var dpr = window.devicePixelRatio || 1;
    var cs = getComputedStyle(canvas);
    var W = parseFloat(cs.width);
    var H = parseFloat(cs.height);
    if (W <= 0 || H <= 0) return;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = cs.width;
    canvas.style.height = cs.height;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    var data = r.freqResp; if (!data || data.length < 2) return;
    var C = chartColors();
    var axis = freqAxisData(data);
    var ml = 56, mt = 14, mr = 16, mb = 44;
    var pw = W - ml - mr, ph = H - mt - mb;
    var fToX = function(f) { return ml + pw * Math.log(f/axis.fMin) / Math.log(axis.fMax/axis.fMin); };
    var magMin = -80, magMax = 10;
    for (var i = 0; i < data.length; i++) {
      if (data[i].magDb < magMin) magMin = data[i].magDb;
      if (data[i].magDb > magMax) magMax = data[i].magDb;
    }
    magMin = Math.floor(magMin/10)*10;
    magMax = Math.ceil((magMax+5)/10)*10;
    if (magMax - magMin < 20) magMax = magMin + 20;
    var magY = function(d) { return mt + ph*(1 - (d-magMin)/(magMax-magMin)); };
    ctx.save();
    ctx.beginPath(); ctx.rect(ml, mt, pw, ph); ctx.clip();
    ctx.fillStyle = C.bg; ctx.fillRect(ml, mt, pw, ph);
    ctx.strokeStyle = C.grid; ctx.lineWidth = 0.6;
    for (var db = magMin; db <= magMax; db += 10) {
      var y = magY(db);
      ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(ml+pw, y); ctx.stroke();
    }
    axis.steps.forEach(function(s) {
      var x = fToX(s.f);
      ctx.beginPath(); ctx.moveTo(x, mt); ctx.lineTo(x, mt+ph); ctx.stroke();
    });
    ctx.strokeStyle = C.mag; ctx.lineWidth = 1.5; ctx.beginPath();
    for (var i = 0; i < data.length; i++) {
      if (i===0) ctx.moveTo(fToX(data[i].f), magY(data[i].magDb));
      else ctx.lineTo(fToX(data[i].f), magY(data[i].magDb));
    }
    ctx.stroke();
    if (r.gain_actual) {
      var gDb = 20*Math.log10(r.gain_actual||1e-10), y3 = magY(gDb-3);
      ctx.setLineDash([3,3]); ctx.strokeStyle = C.ref; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(ml, y3); ctx.lineTo(ml+pw, y3); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1.2;
    ctx.strokeRect(ml, mt, pw, ph);
    ctx.fillStyle = C.text;
    ctx.font = "11px " + getComputedStyle(canvas).fontFamily;
    ctx.textAlign = "right";
    for (var db = magMin; db <= magMax; db += 10) {
      ctx.fillText(db + " dB", ml - 6, magY(db) + 4);
    }
    ctx.textAlign = "center";
    var lblY = mt + ph + 16;
    axis.steps.forEach(function(s) {
      if (s.label) ctx.fillText(s.label, fToX(s.f), lblY);
    });
    ctx.font = "12px " + getComputedStyle(canvas).fontFamily;
    ctx.fillText("Frequency (Hz)", ml + pw/2, lblY + 22);
    ctx.save(); ctx.translate(12, mt + ph/2); ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center"; ctx.font = "12px " + getComputedStyle(canvas).fontFamily;
    ctx.fillText("Magnitude (dB)", 0, 0);
    ctx.restore();
    ctx.fillStyle = C.text; ctx.textAlign = "left"; ctx.font = "11px " + getComputedStyle(canvas).fontFamily;
  }

  /* Render phase (Bode phase) chart */
  function renderPhaseChart(r) {
    var canvas = document.getElementById("filterChartPhase");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var dpr = window.devicePixelRatio || 1;
    var cs = getComputedStyle(canvas);
    var W = parseFloat(cs.width);
    var H = parseFloat(cs.height);
    if (W <= 0 || H <= 0) return;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = cs.width;
    canvas.style.height = cs.height;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    var data = r.freqResp; if (!data || data.length < 2) return;
    var C = chartColors();
    var axis = freqAxisData(data);
    var ml = 56, mt = 14, mr = 16, mb = 44;
    var pw = W - ml - mr, ph = H - mt - mb;
    var fToX = function(f) { return ml + pw * Math.log(f/axis.fMin) / Math.log(axis.fMax/axis.fMin); };
    var offset = data[0].phaseDeg > 150 ? -360 : 0;
    data[0]._ph = data[0].phaseDeg + offset;
    for (var i = 1; i < data.length; i++) {
      var raw = data[i].phaseDeg + offset, d2 = raw - data[i-1]._ph;
      if (d2 > 180) raw -= 360; else if (d2 < -180) raw += 360;
      data[i]._ph = raw;
    }
    var hMin = data[0]._ph, hMax = data[0]._ph;
    for (var i = 0; i < data.length; i++) {
      if (data[i]._ph < hMin) hMin = data[i]._ph;
      if (data[i]._ph > hMax) hMax = data[i]._ph;
    }
    hMin = Math.floor(hMin / 45)*45 - 45;
    hMax = Math.ceil(hMax / 45)*45 + 45;
    if (hMax - hMin < 180) hMax = hMin + 225;
    var phY = function(d) { return mt + ph*(1 - (d-hMin)/(hMax-hMin)); };
    ctx.save();
    ctx.beginPath(); ctx.rect(ml, mt, pw, ph); ctx.clip();
    ctx.fillStyle = C.bg; ctx.fillRect(ml, mt, pw, ph);
    ctx.strokeStyle = C.grid; ctx.lineWidth = 0.6;
    var g0 = Math.ceil(hMin / 45)*45;
    for (var g = g0; g <= hMax; g += 45) {
      ctx.beginPath(); ctx.moveTo(ml, phY(g)); ctx.lineTo(ml+pw, phY(g)); ctx.stroke();
    }
    axis.steps.forEach(function(s) {
      var x = fToX(s.f);
      ctx.beginPath(); ctx.moveTo(x, mt); ctx.lineTo(x, mt+ph); ctx.stroke();
    });
    ctx.strokeStyle = C.phase; ctx.lineWidth = 1.5; ctx.beginPath();
    for (var i = 0; i < data.length; i++) {
      if (i===0) ctx.moveTo(fToX(data[i].f), phY(data[i]._ph));
      else ctx.lineTo(fToX(data[i].f), phY(data[i]._ph));
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1.2;
    ctx.strokeRect(ml, mt, pw, ph);
    ctx.fillStyle = C.text;
    ctx.font = "11px " + getComputedStyle(canvas).fontFamily;
    ctx.textAlign = "right";
    for (var g = g0; g <= hMax; g += 45) {
      ctx.fillText(g + "°", ml - 6, phY(g) + 4);
    }
    ctx.textAlign = "center";
    var lblY = mt + ph + 16;
    axis.steps.forEach(function(s) {
      if (s.label) ctx.fillText(s.label, fToX(s.f), lblY);
    });
    ctx.font = "12px " + getComputedStyle(canvas).fontFamily;
    ctx.fillText("Frequency (Hz)", ml + pw/2, lblY + 22);
    ctx.save(); ctx.translate(12, mt + ph/2); ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center"; ctx.font = "12px " + getComputedStyle(canvas).fontFamily;
    ctx.fillText("Phase (deg)", 0, 0);
    ctx.restore();
  }
  /* ── Render both charts ─── */
  function renderFilterChart(r) {
    renderMagChart(r);
    renderPhaseChart(r);
  }

  /* ── Cache for static schematic SVGs ─── */
  var _diff1SvgCache = null;

  /* ── Render circuit schematic (SVG) ─── */
  function renderFilterSchematic(r) {
    var el = document.getElementById("filterSchematic");
    if (!el) return;

    if (r.type === "diff1") {
      if (_diff1SvgCache) {
        el.innerHTML = _diff1SvgCache;
      } else {
        el.innerHTML = '<p style="color:var(--color-text-soft);font-size:.85rem">Loading schematic...</p>';
        fetch("resources/diff1.svg").then(function(resp){
          if (!resp.ok) throw new Error("Load failed");
          return resp.text();
        }).then(function(svg){
          var styled = svg.replace('<svg ', '<svg style="width:100%;height:auto;max-width:300px" ');
          _diff1SvgCache = styled;
          el.innerHTML = styled;
        }).catch(function(){
          el.innerHTML = '<p style="color:var(--color-text-soft);font-size:.85rem">Schematic unavailable.</p>';
        });
      }
    } else {
      var comps = r.components;
      el.innerHTML = renderMfb2Svg(comps);
    }
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

  // vertical resistor: y1─[rect]─y2 at x
  var resDrawV = function(y1, y2, x, label, value) {
    var w = 14, h = 44;
    var cy = (y1+y2)/2;
    var a = [];
    a.push(L(x, y1, x, cy-h/2));
    a.push(resRect(x-w/2, cy, w, h));
    a.push(L(x, cy+h/2, x, y2));
    if (label) a.push('<text x="' + (x-w/2-4).toFixed(1) + '" y="' + (cy+4).toFixed(1) + '" class="flbl" text-anchor="end">' + label + '</text>');
    if (value) a.push('<text x="' + (x+w/2+4).toFixed(1) + '" y="' + (cy+4).toFixed(1) + '" class="fref" text-anchor="start">' + value + '</text>');
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

     Topology (balanced differential):
       R1: Vin+ → OP+ (non-inverting input)
       R2: Vin- → OP- (inverting input)
       R3∥C3: OP+ → GND (parallel RC to ground from non-inverting input)
       R4∥C4: OP- → Vout (parallel RC feedback from output to inverting input)

     Balanced design: R1=R2, R3=R4, C3=C4
     Transfer function: H(s) = (R4/R2) / (1 + s·R4·C4)
  ================================================================ */
  function renderDiff1Svg(c) {
    var r1V = FM.valLabel(c.R1) + "\u03A9";
    var r2V = FM.valLabel(c.R2) + "\u03A9";
    var r3V = FM.valLabel(c.R3) + "\u03A9";
    var r4V = FM.valLabel(c.R4) + "\u03A9";
    var c3V = FM.capLabel(c.C3);
    var c4V = FM.capLabel(c.C4);
    var RW = 44, RH = 14;

    // === Coordinate system ===
    var opX   = 240;   // op-amp left edge
    var opCY  = 120;   // op-amp vertical centre
    var opHH  = 32;    // half-height
    var nTY   = opCY - 18;  // 102 — (-) terminal Y
    var pTY   = opCY + 18;  // 138 — (+) terminal Y
    var opR   = opX + 40;   // 280 — op-amp output tip

    var negJ  = 150;        // inverting summing junction X
    var posJ  = 150;        // non-inverting junction X

    var vinMinusY = 65;     // Vin- horizontal path Y
    var vinPlusY  = 178;    // Vin+ horizontal path Y

    // feedback routing (R4∥C4)
    var fbTakeX = opR + 18;  // 298 — output takeoff X
    var fbTopY = 45;         // upper feedback bus (R4) Y
    var fbBotY = 65;         // lower feedback bus (C4) Y
    var fbBusX = opX - 10;   // 230 — feedback vertical bus X

    // R3∥C3 to GND routing (vertical)
    var r3s = posJ + 14;      // 164 — horizontal lead X
    var r3x = r3s + 10;      // 174 — R3 vertical X
    var c3x = r3s + 30;      // 194 — C3 vertical X
    var r3Top = pTY;          // 138 — R3 top
    var r3Bot = pTY + 48;     // 186 — R3 bottom
    var c3Bot = pTY + 48;     // 186 — C3 bottom
    var gndY = r3Bot + 12;    // 198 — GND Y

    var parts = [];
    parts.push('<svg viewBox="0 0 450 230" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-width:380px;color:var(--color-text)">');
    parts.push('<style>.flbl{fill:currentColor;font:12px -apple-system,sans-serif;}.fref{fill:var(--color-text-soft);font:10px -apple-system,sans-serif;}.fnode{fill:currentColor;font:11px -apple-system,sans-serif;font-weight:600}.fdes{fill:currentColor;font:12px -apple-system,sans-serif;font-weight:600}</style>');
    parts.push('<text x="190" y="16" class="fdes" text-anchor="middle">1st-Order Differential Low-Pass Filter</text>');

    // ── Vin- → R2 → negJ → OP- ──
    parts.push('<text x="5" y="' + (vinMinusY+4) + '" class="fnode">Vin\u2212</text>');
    parts.push(resDraw(34, 86, vinMinusY, RW, RH, 'R2', r2V));
    parts.push(L(86, vinMinusY, 86, nTY));         // down to (-) level
    parts.push(L(86, nTY, negJ, nTY));              // to summing junction
    parts.push(dot(negJ, nTY));
    // negJ to op-amp(-) terminal
    parts.push(L(negJ, nTY, opX-12, nTY));

    // ── Vin+ → R1 → posJ → OP+ ──
    parts.push('<text x="5" y="' + (vinPlusY+4) + '" class="fnode">Vin+</text>');
    parts.push(resDraw(34, 86, vinPlusY, RW, RH, 'R1', r1V));
    parts.push(L(86, vinPlusY, 86, pTY));           // up to (+) level
    parts.push(L(86, pTY, posJ, pTY));              // to non-inverting junction
    parts.push(dot(posJ, pTY));
    // posJ to op-amp(+) terminal
    parts.push(L(posJ, pTY, opX-12, pTY));

    // ── R4∥C4 feedback: output → feedback bus → negJ ──
    // Output takeoff up to feedback bus
    parts.push(L(fbTakeX, opCY, fbTakeX, fbTopY));  // R4 right connection
    parts.push(L(fbTakeX, opCY, fbTakeX, fbBotY));  // C4 right connection
    // R4 on upper feedback bus
    parts.push(resDraw(fbBusX, fbTakeX, fbTopY, RW, RH, 'R4', r4V));
    // C4 on lower feedback bus (parallel to R4)
    parts.push(capH(fbBusX, fbTakeX, fbBotY));
    parts.push('<text x="' + ((fbBusX+fbTakeX)/2).toFixed(0) + '" y="' + (fbBotY-9) + '" class="flbl" text-anchor="middle">C4</text>');
    parts.push('<text x="' + ((fbBusX+fbTakeX)/2).toFixed(0) + '" y="' + (fbBotY+19) + '" class="fref" text-anchor="middle">' + c4V + '</text>');
    // Vertical bus at fbBusX: connects R4, C4 left sides down to (-) level
    parts.push(L(fbBusX, fbTopY, fbBusX, nTY));
    // Connect feedback bus to inverting summing junction
    parts.push(L(fbBusX, nTY, negJ, nTY));
    parts.push(dot(fbBusX, nTY));

    // ── R3∥C3 from posJ to GND (vertical) ──
    // Horizontal lead from posJ to the vertical components
    parts.push(L(posJ, pTY, r3s, pTY));
    // R3 vertical
    parts.push(resDrawV(r3Top, r3Bot, r3x, 'R3', r3V));
    // C3 vertical (parallel to R3)
    parts.push(capV(c3x, r3Top, c3Bot));
    parts.push('<text x="' + (c3x+14).toFixed(0) + '" y="' + ((r3Top+r3Bot)/2-6) + '" class="flbl">C3</text>');
    parts.push('<text x="' + (c3x+14).toFixed(0) + '" y="' + ((r3Top+r3Bot)/2+6) + '" class="fref">' + c3V + '</text>');
    // Horizontal wire at top connecting R3 and C3 in parallel
    parts.push(L(r3x, r3Top, c3x, r3Top));
    // Horizontal wire at bottom connecting R3 and C3
    parts.push(L(r3x, r3Bot, c3x, c3Bot));
    // Down to GND
    parts.push(L(c3x, c3Bot, c3x, gndY));
    parts.push(GND(c3x, gndY));

    // ── Op-amp ──
    parts.push(opAmpTri(opX, opCY, opHH));

    // ── Output wire ──
    var voutX = opR + 60;
    parts.push(L(opR, opCY, voutX, opCY));
    parts.push('<text x="' + (voutX+3) + '" y="' + (opCY+4) + '" class="fnode">Vout</text>');

    // ── Junction dots (additional) ──
    parts.push(dot(r3s, pTY));   // R3 left junction

    parts.push('</svg>');
    return parts.join('');
  }
  /* ================================================================
     RENDER: 2nd-Order MFB Low-Pass Filter

     Standard multiple-feedback topology (single summing node):
       Vin -> R1 -> Node1 -> R3 -> op-amp(-) -> Vout
       Node1 -> C2 -> GND
       Node1 -> R2 -> op-amp output       (feedback resistor)
       op-amp(-) -> C1 -> op-amp output   (feedback capacitor)
       op-amp(+) -> GND
  ================================================================ */
  function renderMfb2Svg(c) {
    var r1V = FM.valLabel(c.R1) + "\u03A9";
    var r2V = FM.valLabel(c.R2) + "\u03A9";
    var r3V = FM.valLabel(c.R3) + "\u03A9";
    var c1V = FM.capLabel(c.C1);
    var c2V = FM.capLabel(c.C2);
    var RW = 44, RH = 14;

    // === Coordinate system ===
    var opX   = 260;    // op-amp left edge
    var opCY  = 120;    // op-amp vertical centre
    var opHH  = 32;     // half-height
    var opR   = opX + 40;    // output tip = 300

    // Summing node (all components connect here)
    var n1X   = 105;
    var n1Y   = opCY;        // y = 120
    var nTY   = opCY - 18;   // (-) terminal Y = 102
    var pTY   = opCY + 18;   // (+) terminal Y = 138

    // Feedback bus above op-amp
    var fbY   = 45;          // R2 horizontal bus
    var c1Y   = 72;          // C1 horizontal bus
    var outX  = opR + 10;    // output junction = 310

    var parts = [];
    parts.push('<svg viewBox="0 0 450 220" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-width:380px;color:var(--color-text)">');
    parts.push('<style>.flbl{fill:currentColor;font:12px -apple-system,sans-serif;}.fref{fill:var(--color-text-soft);font:10px -apple-system,sans-serif;}.fnode{fill:currentColor;font:11px -apple-system,sans-serif;font-weight:600}.fdes{fill:currentColor;font:12px -apple-system,sans-serif;font-weight:600}</style>');
    parts.push('<text x="190" y="16" class="fdes" text-anchor="middle">2nd-Order MFB Low-Pass Filter</text>');

    // --- Vin -> R1 -> Node1 ---
    parts.push('<text x="5" y="' + (n1Y+4) + '" class="fnode">Vin</text>');
    parts.push(L(28, n1Y, 28, n1Y));
    parts.push(resDraw(28, 78, n1Y, RW, RH, 'R1', r1V));
    parts.push(L(78, n1Y, n1X, n1Y));
    parts.push(dot(n1X, n1Y));

    // --- C2: Node1 -> GND (vertical) ---
    var c2Bot = 192;
    parts.push(L(n1X, n1Y, n1X, 165));
    parts.push(capV(n1X, 165, c2Bot));
    parts.push(GND(n1X, c2Bot));
    parts.push('<text x="' + (n1X+14) + '" y="' + (c2Bot-10) + '" class="flbl">C2</text>');
    parts.push('<text x="' + (n1X+14) + '" y="' + (c2Bot+2) + '" class="fref">' + c2V + '</text>');

    // --- R3: Node1 -> op-amp(-) ---
    parts.push(L(n1X, n1Y, 140, n1Y));
    parts.push(resDraw(140, 210, n1Y, RW, RH, 'R3', r3V));
    parts.push(L(210, n1Y, 210, nTY));
    parts.push(L(210, nTY, opX-12, nTY));

    // --- R2: Node1 -> output (feedback resistor) ---
    // Up from Node1 -> R2 body at fbY -> right to outX -> down to output
    parts.push(L(n1X, n1Y, n1X, fbY));
    parts.push(resDraw(n1X, 270, fbY, RW, RH, 'R2', r2V));
    parts.push(L(270, fbY, outX, fbY));
    parts.push(L(outX, fbY, outX, n1Y));

    // --- C1: op-amp(-) -> output (feedback capacitor) ---
    // Up from (-) -> C1 at c1Y -> right to outX -> down to output
    parts.push(L(opX-12, nTY, opX-12, c1Y));
    parts.push(capH(opX-12, outX, c1Y));
    parts.push('<text x="' + ((opX-12+outX)/2).toFixed(0) + '" y="' + (c1Y-9) + '" class="flbl" text-anchor="middle">C1</text>');
    parts.push('<text x="' + ((opX-12+outX)/2).toFixed(0) + '" y="' + (c1Y+19) + '" class="fref" text-anchor="middle">' + c1V + '</text>');
    parts.push(L(outX, c1Y, outX, n1Y));

    // --- Op-amp ---
    parts.push(opAmpTri(opX, opCY, opHH));

    // --- (+) terminal -> GND ---
    parts.push(L(opX-12, pTY, opX-12, 170));
    parts.push(GND(opX-12, 170));

    // --- Output wire ---
    var voutX = opR + 70;
    parts.push(L(opR, opCY, voutX, opCY));
    parts.push('<text x="' + (voutX+3) + '" y="' + (opCY+4) + '" class="fnode">Vout</text>');

    // --- Junction dot for output (R2 + C1 + output meet) ---
    parts.push(dot(outX, n1Y));

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
      html += '<tr><td>R1</td><td>' + FM.valLabel(comps.R1) + '\u03A9</td></tr>';
      html += '<tr><td>R2</td><td>' + FM.valLabel(comps.R2) + '\u03A9</td></tr>';
      html += '<tr><td>R3</td><td>' + FM.valLabel(comps.R3) + '\u03A9</td></tr>';
      html += '<tr><td>R4</td><td>' + FM.valLabel(comps.R4) + '\u03A9</td></tr>';
      html += '<tr><td>C3</td><td>' + FM.capLabel(comps.C3) + '</td></tr>';
      html += '<tr><td>C4</td><td>' + FM.capLabel(comps.C4) + '</td></tr>';
    } else {
      html += '<tr><td>R1</td><td>' + FM.valLabel(comps.R1) + '\u03A9</td></tr>';
      html += '<tr><td>R2</td><td>' + FM.valLabel(comps.R2) + '\u03A9</td></tr>';
      html += '<tr><td>R3</td><td>' + FM.valLabel(comps.R3) + '\u03A9</td></tr>';
      html += '<tr><td>C1</td><td>' + FM.capLabel(comps.C1) + '</td></tr>';
      html += '<tr><td>C2</td><td>' + FM.capLabel(comps.C2) + '</td></tr>';
    }
    html += '</tbody></table>';

    // Formula section
    html += '<h3>3. ' + t("filter.report.formulas", null, "Calculation Formulas") + '</h3>';
    html += '<div class="rep-model-box">';
    if (r.type === "diff1") {
      html += '<p><span class="latex" data-l="H(s) = \\frac{R_4/R_2}{1 + s\\,R_4 C_4}"></span></p>';
      html += '<p><span class="latex" data-l="G = \\frac{R_4}{R_2} = \\frac{' + FM.valLabel(comps.R4) + '}{' + FM.valLabel(comps.R2) + '} = ' + FM.fv(r.gain_actual, 2) + '"></span></p>';
      html += '<p><span class="latex" data-l="f_c = \\frac{1}{2\\pi\\,R_4 C_4} = \\frac{1}{2\\pi\\cdot' + FM.valLabel(comps.R4) + '\\cdot' + FM.capLabel(comps.C4) + '} = ' + FM.fv(r.fc_actual, 1) + '\\text{ Hz}"></span></p>';
      html += '<p><span class="latex" data-l="R_1 = R_2, R_3 = R_4, C_3 = C_4 \\text{ (balanced design)}"></span></p>';
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
      html += '<tr><td>R1</td><td>' + FM.valLabel(comps.R1) + '\u03A9</td></tr>';
      html += '<tr><td>R2</td><td>' + FM.valLabel(comps.R2) + '\u03A9</td></tr>';
      html += '<tr><td>R3</td><td>' + FM.valLabel(comps.R3) + '\u03A9</td></tr>';
      html += '<tr><td>R4</td><td>' + FM.valLabel(comps.R4) + '\u03A9</td></tr>';
      html += '<tr><td>C3</td><td>' + FM.capLabel(comps.C3) + '</td></tr>';
      html += '<tr><td>C4</td><td>' + FM.capLabel(comps.C4) + '</td></tr>';
    } else {
      html += '<tr><td>R1</td><td>' + FM.valLabel(comps.R1) + '\u03A9</td></tr>';
      html += '<tr><td>R2</td><td>' + FM.valLabel(comps.R2) + '\u03A9</td></tr>';
      html += '<tr><td>R3</td><td>' + FM.valLabel(comps.R3) + '\u03A9</td></tr>';
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