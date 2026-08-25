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

  /* ── Op-amp selection & analysis ─── */
  var OA = global.OpampAnalysis;

  function fmtHz(f) {
    if (f == null || !isFinite(f)) return "—";
    if (f >= 1e6) return FM.fv(f / 1e6, 2) + " MHz";
    if (f >= 1e3) return FM.fv(f / 1e3, 2) + " kHz";
    return FM.fv(f, 2) + " Hz";
  }

  function fmtMV(v) { // mV value → adaptive unit string
    if (!isFinite(v)) return "—";
    var a = Math.abs(v);
    if (a >= 100) return FM.fv(v, 0) + " mV";
    if (a >= 1) return FM.fv(v, 2) + " mV";
    if (a >= 0.001) return FM.fv(v, 3) + " mV";
    return FM.fv(v * 1000, 1) + " µV";
  }

  function opampSpecLine(op) {
    var t = global._t || function(k){return k;};
    if (!op) return "";
    var ibPa = op.ib_a * 1e12;
    var s = "<b>" + op.name + "</b> — GBW " + fmtHz(op.gbw_hz) + ", Aol " + op.aol_db + " dB, eN @1kHz " + op.enW_nv + " nV/√Hz" +
      (op.en_corner_hz > 0 ? " (f/c ≈ " + FM.fv(op.en_corner_hz, op.en_corner_hz >= 100 ? 0 : 1) + " Hz)" : "") +
      ", iN " + op.in_pa + " pA/√Hz, Ib " + (ibPa >= 1000 ? FM.fv(ibPa / 1000, 1) + " nA" : FM.fv(ibPa, ibPa < 1 ? 2 : 0) + " pA") +
      ", VOS(max) ±" + (op.eio_uv_max >= 1000 ? FM.fv(op.eio_uv_max / 1000, 2) + " mV" : FM.fv(op.eio_uv_max, op.eio_uv_max < 1 ? 1 : 0) + " µV") +
      (op.typical ? ", " + t("filter.opamp.typTag") : "");
    if (op.chopper) s += ", " + t("filter.opamp.chopperTag");
    return s;
  }

  function initOpampSelect() {
    var sel = document.getElementById("filterOpamp");
    if (!sel || !OA) return;
    if (sel.options.length) return; // already populated
    var html = "";
    for (var i = 0; i < OA.OPAMPS.length; i++) {
      var op = OA.OPAMPS[i];
      html += '<option value="' + op.id + '">' + op.name + " · GBW " + fmtHz(op.gbw_hz) + (op.typical ? " *typ" : "") + "</option>";
    }
    sel.innerHTML = html;
    if (!OA.opampById(gvs("filterOpamp"))) sel.value = OA.OPAMPS[0].id;
    var sp = document.getElementById("filterOpampSpec");
    if (sp) sp.innerHTML = opampSpecLine(OA.opampById(sel.value));
  }

  function filterOpampChange() {
    var sel = document.getElementById("filterOpamp");
    var sp = document.getElementById("filterOpampSpec");
    if (sel && sp && OA) sp.innerHTML = opampSpecLine(OA.opampById(gvs("filterOpamp")));
    renderFilterOpamp();
  }

  function filterRTolChange() {
    // 电阻精度只影响运放分析（角点容差），不改变元件取值 → 仅重算分析卡片
    renderFilterOpamp();
  }

  /* 容差百分比显示：1 → "1"，0.1 → "0.1" */
  function fmtPct(p) { return (p % 1 === 0) ? String(p) : p.toFixed(1); }

  function runOpampAnalysis(r) {
    // r = global._filterResult; returns analyzeCore result or null
    if (!OA || !r) return null;
    var op = OA.opampById(gvs("filterOpamp")) || OA.OPAMPS[0];
    var comps = r.components;
    var tol = gvs("filterRTol") === "01pct" ? 0.001 : 0.01; // 电阻精度：±0.1% / ±1%（独立于 E24/E12 取值系列）
    var clEl = document.getElementById("filterCLoad");
    var clPf = (clEl && clEl.value !== "") ? parseFloat(clEl.value) : NaN;   // 输出负载电容 C_L (pF)，空/非法 → 无载
    if (!isFinite(clPf) || clPf < 0) clPf = 0;
    try {
      if (r.type === "diff1") {
        return OA.analyzeDiff1({ R1: comps.R1, R2: comps.R2, R3: comps.R3, R4: comps.R4, C4: comps.C4 }, op, { fc_hz: r.fc_actual, tol: tol, cl_pf: clPf });
      }
      return OA.analyzeMfb2(comps, op, { fc_hz: r.fc_actual, tol: tol, cl_pf: clPf });
    } catch (e) { console.error("opamp analysis failed", e); return null; }
  }

  function renderFilterOpamp() {
    var card = document.getElementById("filterOpampCard");
    if (!card || !OA) return;
    var t = global._t || function(k){return k;};
    var r = global._filterResult;
    if (!r) {
      card.innerHTML = '<p style="color:var(--color-text-soft);font-size:.85rem">' + t("filter.opamp.empty") + "</p>";
      return;
    }
    var res = runOpampAnalysis(r);
    if (!res) {
      card.innerHTML = '<p style="color:#b45309;font-size:.85rem">⚠ ' + t("filter.opamp.empty") + "</p>";
      return;
    }

    var stabMap = { ok: ["#16a34a", "filter.stab.ok"], marginal: ["#d97706", "filter.stab.marginal"], unstable: ["#dc2626", "filter.stab.unstable"], noCrossing: ["#64748b", "filter.stab.nocross"] };
    var sm = stabMap[res.stability] || stabMap.noCrossing;

    function ri(label, valHtml) { return '<div class="ri"><div class="rl">' + label + '</div><div class="rv">' + valHtml + "</div></div>"; }

    var html = '<div class="result-grid">';
    html += ri(t("filter.opamp.stability"), '<span style="color:' + sm[0] + ';font-weight:700">' + t(sm[1]) + "</span>");
    html += ri(t("filter.opamp.pm"), res.pmDeg != null ? FM.fv(res.pmDeg, 1) + "°" : "—");
    html += ri(t("filter.opamp.loopgain"), res.loopGainAtFc_dB != null ? FM.fv(res.loopGainAtFc_dB, 1) + " dB" : "—");
    html += ri(t("filter.opamp.crossover"), fmtHz(res.crossoverHz));
    html += ri(t("filter.opamp.ng"), FM.fv(res.ngDC.dB, 2) + " dB (" + FM.fv(res.ngDC.lin, 3) + ")");
    html += ri(t("filter.opamp.noise1k"), (res.noiseDensity1k_nVrtHz >= 1000 ? FM.fv(res.noiseDensity1k_nVrtHz / 1000, 2) + " µV" : FM.fv(res.noiseDensity1k_nVrtHz, res.noiseDensity1k_nVrtHz < 10 ? 2 : 0)) + " /√Hz");
    html += ri(t("filter.opamp.noiseInt"), (res.noiseRms_uV >= 1000 ? FM.fv(res.noiseRms_uV / 1000, 3) + " mV" : FM.fv(res.noiseRms_uV, res.noiseRms_uV < 10 ? 2 : 1)) + " rms");
    html += ri(t("filter.opamp.offset"), fmtMV(res.offsetWorst_mV) +
      ' <span style="color:#94a3b8;font-size:.7rem">(EIO ' + fmtMV(res.eioTerm_mV) + " + Ib " + fmtMV(res.ibTerm_mV) + ")</span>");
    html += "</div>";

    if (res.tolerance) {
      var T = res.tolerance;
      html += '<p style="color:#64748b;font-size:.75rem;margin-top:12px">' + t("filter.opamp.tolTitle") + "（±" + fmtPct(T.pct) + "%）</p>";
      html += '<div class="result-grid">';
      html += ri(t("filter.gain"), FM.fv(T.gain[0], 2) + " – " + FM.fv(T.gain[1], 2) + " V/V");
      html += "</div>";
    }

    if (res.warnings.length) {
      html += '<div style="margin-top:10px">';
      for (var i = 0; i < res.warnings.length; i++) {
        html += '<p style="color:#b45309;font-size:.78rem;line-height:1.5;margin-bottom:4px">⚠ ' + t(res.warnings[i]) + "</p>";
      }
      html += "</div>";
    } else {
      html += '<p style="color:#16a34a;font-size:.78rem;margin-top:10px">✓ ' + t("filter.opamp.okline") + "</p>";
    }
    html += '<p style="color:#94a3b8;font-size:.72rem;line-height:1.5;margin-top:10px">' + t("filter.opamp.note") + "</p>";

    card.innerHTML = html;
  }

  /* ── Lazy init — show placeholder results ─── */
  function initFilter() {
    filterShowPlaceholders();
    initOpampSelect();
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
    _diff1SvgCache = null;
    _mfb2SvgCache = null;
    global._filterResult = null;
    global._filterPrevResult = null;
    renderFilterOpamp(); // reset op-amp card to placeholder
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
    renderFilterOpamp();

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
    _diff1SvgCache = null;
    _mfb2SvgCache = null;
    global._filterResult = null;
    global._filterPrevResult = null;
    renderFilterOpamp(); // reset op-amp card to placeholder
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
  var _mfb2SvgCache = null;

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
      if (_mfb2SvgCache) {
        el.innerHTML = _mfb2SvgCache;
      } else {
        el.innerHTML = '<p style="color:var(--color-text-soft);font-size:.85rem">Loading schematic...</p>';
        fetch("resources/MFB2.svg").then(function(resp){
          if (!resp.ok) throw new Error("Load failed");
          return resp.text();
        }).then(function(svg){
          var styled = svg.replace('<svg ', '<svg style="width:100%;height:auto;max-width:300px" ');
          _mfb2SvgCache = styled;
          el.innerHTML = styled;
        }).catch(function(){
          el.innerHTML = '<p style="color:var(--color-text-soft);font-size:.85rem">Schematic unavailable.</p>';
        });
      }
    }
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
      html += '<p><span class="latex" data-l="H(s) = -\\frac{R_2/R_1}{1 + s\\,C_1\\left(R_2+R_3+\\frac{R_2 R_3}{R_1}\\right) + s^2\\,C_1 C_2 R_2 R_3}"></span></p>';
      html += '<p><span class="latex" data-l="G = \\frac{R_2}{R_1} = \\frac{' + FM.valLabel(comps.R2) + '}{' + FM.valLabel(comps.R1) + '} = ' + FM.fv(r.gain_actual, 2) + '"></span></p>';
      html += '<p><span class="latex" data-l="f_c = ' + FM.fv(r.fc_actual, 1) + '\\text{ Hz}"></span></p>';
      html += '<p><span class="latex" data-l="Q = ' + FM.fv(r.Q_actual, 3) + '"></span></p>';
    }
    html += '</div>';

    // ── Section 4: Op-amp analysis ──
    var oaRes = runOpampAnalysis(r);
    if (oaRes && OA) {
      var opSel = OA.opampById(gvs("filterOpamp")) || OA.OPAMPS[0];
      var stabKey = ({ ok: "filter.stab.ok", marginal: "filter.stab.marginal", unstable: "filter.stab.unstable" })[oaRes.stability] || "filter.stab.nocross";
      html += '<h3>4. ' + t("filter.report.opamp") + '</h3>';
      html += '<table class="data-tbl"><thead><tr><th>' + t("filter.report.param") + '</th><th>' + t("filter.report.value") + '</th></tr></thead><tbody>';
      html += '<tr><td>' + t("filter.report.opamp.part") + '</td><td style="font-size:.85rem">' + opampSpecLine(opSel) + '</td></tr>';
      html += '<tr><td>' + t("filter.opamp.stability") + '</td><td>' + t(stabKey) + '</td></tr>';
      html += '<tr><td>' + t("filter.opamp.pm") + '</td><td>' + (oaRes.pmDeg != null ? FM.fv(oaRes.pmDeg, 1) + "°" : "—") + '</td></tr>';
      if (oaRes.loopGainAtFc_dB != null) html += '<tr><td>' + t("filter.opamp.loopgain") + '</td><td>' + FM.fv(oaRes.loopGainAtFc_dB, 1) + ' dB</td></tr>';
      html += '<tr><td>' + t("filter.opamp.crossover") + '</td><td>' + fmtHz(oaRes.crossoverHz) + '</td></tr>';
      html += '<tr><td>' + t("filter.opamp.ng") + '</td><td>' + FM.fv(oaRes.ngDC.dB, 2) + ' dB (' + FM.fv(oaRes.ngDC.lin, 3) + ' V/V)</td></tr>';
      html += '<tr><td>' + t("filter.opamp.noise1k") + '</td><td>' + (oaRes.noiseDensity1k_nVrtHz >= 1000 ? FM.fv(oaRes.noiseDensity1k_nVrtHz / 1000, 2) + " µV/√Hz" : FM.fv(oaRes.noiseDensity1k_nVrtHz, oaRes.noiseDensity1k_nVrtHz < 10 ? 2 : 0) + " nV/√Hz") + '</td></tr>';
      html += '<tr><td>' + t("filter.opamp.noiseInt") + '</td><td>' + (oaRes.noiseRms_uV >= 1000 ? FM.fv(oaRes.noiseRms_uV / 1000, 3) + " mV" : FM.fv(oaRes.noiseRms_uV, oaRes.noiseRms_uV < 10 ? 2 : 1)) + ' rms</td></tr>';
      html += '<tr><td>' + t("filter.opamp.offset") + '</td><td>±' + fmtMV(oaRes.offsetWorst_mV) + ' (EIO ±' + fmtMV(oaRes.eioTerm_mV) + ', Ib ±' + fmtMV(oaRes.ibTerm_mV) + ')</td></tr>';
      if (oaRes.tolerance) {
        var TW = oaRes.tolerance;
        html += '<tr><td>' + t("filter.gain") + ' (' + t("filter.opamp.tolTitle") + ' ±' + fmtPct(TW.pct) + '%)</td><td>' + FM.fv(TW.gain[0], 2) + ' – ' + FM.fv(TW.gain[1], 2) + ' V/V</td></tr>';
      }
      html += '<tr><td>' + t("filter.opamp.warnings") + '</td><td style="font-size:.85rem">' + (oaRes.warnings.length ? oaRes.warnings.map(function(w){ return "⚠ " + t(w); }).join("<br>") : '✓ ' + t("filter.opamp.okline")) + '</td></tr>';
      html += '</tbody></table>';
      html += '<p style="color:#94a3b8;font-size:.75rem;line-height:1.5;margin-top:6px">' + t("filter.opamp.note") + '</p>';
    }

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

    // ── Section 4: Op-amp analysis (Word export) ──
    var oaResW = runOpampAnalysis(r);
    if (oaResW && OA) {
      var opSelW = OA.opampById(gvs("filterOpamp")) || OA.OPAMPS[0];
      var stabKeyW = ({ ok: "filter.stab.ok", marginal: "filter.stab.marginal", unstable: "filter.stab.unstable" })[oaResW.stability] || "filter.stab.nocross";
      html += '<h3>4. ' + t("filter.report.opamp") + '</h3>';
      html += '<table><tr><th>' + t("filter.report.param") + '</th><th>' + t("filter.report.value") + '</th></tr>';
      html += '<tr><td>' + t("filter.report.opamp.part") + '</td><td>' + opSelW.name + ' (GBW ' + fmtHz(opSelW.gbw_hz) + ', Aol ' + opSelW.aol_db + ' dB)</td></tr>';
      html += '<tr><td>' + t("filter.opamp.stability") + '</td><td>' + t(stabKeyW) + '</td></tr>';
      html += '<tr><td>' + t("filter.opamp.pm") + '</td><td>' + (oaResW.pmDeg != null ? FM.fv(oaResW.pmDeg, 1) + '°' : "—") + '</td></tr>';
      if (oaResW.loopGainAtFc_dB != null) html += '<tr><td>' + t("filter.opamp.loopgain") + '</td><td>' + FM.fv(oaResW.loopGainAtFc_dB, 1) + ' dB</td></tr>';
      html += '<tr><td>' + t("filter.opamp.crossover") + '</td><td>' + fmtHz(oaResW.crossoverHz) + '</td></tr>';
      html += '<tr><td>' + t("filter.opamp.ng") + '</td><td>' + FM.fv(oaResW.ngDC.dB, 2) + ' dB (' + FM.fv(oaResW.ngDC.lin, 3) + ' V/V)</td></tr>';
      html += '<tr><td>' + t("filter.opamp.noise1k") + '</td><td>' + (oaResW.noiseDensity1k_nVrtHz >= 1000 ? FM.fv(oaResW.noiseDensity1k_nVrtHz / 1000, 2) + " µV/√Hz" : FM.fv(oaResW.noiseDensity1k_nVrtHz, oaResW.noiseDensity1k_nVrtHz < 10 ? 2 : 0) + " nV/√Hz") + '</td></tr>';
      html += '<tr><td>' + t("filter.opamp.noiseInt") + '</td><td>' + (oaResW.noiseRms_uV >= 1000 ? FM.fv(oaResW.noiseRms_uV / 1000, 3) + " mV" : FM.fv(oaResW.noiseRms_uV, oaResW.noiseRms_uV < 10 ? 2 : 1)) + ' rms</td></tr>';
      html += '<tr><td>' + t("filter.opamp.offset") + '</td><td>±' + fmtMV(oaResW.offsetWorst_mV) + ' (EIO ±' + fmtMV(oaResW.eioTerm_mV) + ', Ib ±' + fmtMV(oaResW.ibTerm_mV) + ')</td></tr>';
      if (oaResW.tolerance) {
        var TW2 = oaResW.tolerance;
        html += '<tr><td>' + t("filter.gain") + ' (' + t("filter.opamp.tolTitle") + ' ±' + fmtPct(TW2.pct) + '%)</td><td>' + FM.fv(TW2.gain[0], 2) + ' – ' + FM.fv(TW2.gain[1], 2) + ' V/V</td></tr>';
      }
      html += '<tr><td>' + t("filter.opamp.warnings") + '</td><td>' + (oaResW.warnings.length ? oaResW.warnings.map(function(w){ return "⚠ " + t(w); }).join("<br>") : '✓ ' + t("filter.opamp.okline")) + '</td></tr>';
      html += '</table>';
    }

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
  global.filterOpampChange = filterOpampChange;
  global.filterRTolChange = filterRTolChange;
  global.filterGenRep = filterGenRep;
  global.filterExportWord = filterExportWord;

})(window);