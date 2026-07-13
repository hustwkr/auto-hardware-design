/* ===== Capacitor Lifetime — Pure Calculation Model ===== */
/* Zero DOM dependency — all functions are pure, testable.         */

(function (global) {
  "use strict";

  /* ── Frequency correction factors ──────────────── */
  var FF = {50:.85,60:.85,120:1,1e3:1.25,1e4:1.5,1e5:1.65};

  /* ── Margin-of-safety multipliers by scenario ─── */
  var MG = {
    none:{r:1,l:"不考虑额外余量"},
    consumer:{r:1.3,l:"消费电子"},
    industrial:{r:1.5,l:"工业设备"},
    automotive:{r:2,l:"汽车电子"},
    medical:{r:2.5,l:"医疗设备"}
  };

  /* ── Pure helpers ─────────────────────────────── */
  function fv(v, d) { return typeof v !== "number" || !isFinite(v) ? "-" : v.toFixed(d); }

  /* ── Voltage correction (Nichicon exponential model) ─── */
  function kvf(v, vr, a, b) {
    if (vr <= 0 || v <= 0) return 1;
    // Nichicon-style: Kv = exp[a * ((Vr/Vop)^b - 1)]
    // Default a=0.56, b=1.0 for industrial-grade electrolytic caps
    var ka = typeof a === "number" ? a : 0.56;
    var kb = typeof b === "number" ? b : 1.0;
    if (v >= vr) return 1;
    return Math.exp(ka * (Math.pow(vr / v, kb) - 1));
  }

  /* ── Ripple → ΔT calculation (pure) ───────────── */
  function calcDeltaT(segments, irated, dt0) {
    var cooling = 1; // Natural convection only
    return segments.map(function (seg) {
      var sq = 0;
      var rd = [];
      seg.rips.forEach(function (rip) {
        if (rip.current <= 0) return;
        var k = FF[rip.freq] || 1;
        var ec = rip.current / k;
        var s = (ec / irated) * (ec / irated);
        sq += s;
        rd.push({ f: rip.freq, iop: rip.current, k: k, ec: ec, s: s });
      });
      var dt = Math.min(dt0 * sq, dt0 * 3) / cooling;
      return { rd: rd, dt: dt };
    });
  }

  /* ── Per-segment lifetime (pure Arrhenius + Miner) */
  function calcSegments(segments, l0, tmax, tau, vrated, irated, dt0, kva, kvb, wd) {
    var cooling = 1; // Natural convection only
    var deltas = calcDeltaT(segments, irated, dt0);
    return segments.map(function (seg, i) {
      var dur = seg.dur || 0;
      var ta  = seg.ta  || 25;
      var vop = seg.vop || 0;

      // Find matching deltaT from deltas array
      var dtInfo = deltas[i] || { rd: [], dt: 0 };
      var ths   = ta + dtInfo.dt;
      // Arrhenius + ripple: Kt = 2^((Tmax - Ta + ΔT0 - ΔTx) / τ)
      // Standard formula: 2^((Tmax - Ta)/τ) × 2^((ΔT0 - ΔTx)/τ)
      var kt    = Math.pow(2, (tmax - ta + dt0 - dtInfo.dt) / tau);
      var kv    = kvf(vop, vrated, kva, kvb);
      var Li    = l0 * kt * kv;
      var d     = Li > 0 ? dur * wd / Li : Infinity;

      return {
        i: i + 1, dur: dur, ta: ta, vop: vop,
        ths: ths, kt: kt, kv: kv, Li: Li, d: d, dt: dtInfo.dt, rd: dtInfo.rd
      };
    });
  }

  /* ── Full lifetime assessment (pure) ──────────── */
  function calcLifetime(params) {
    var l0       = params.l0       || 2000;
    var tmax     = params.tmax     || 105;
    var tau      = params.tau      || 10;   // Arrhenius temperature coefficient (8/9/10)
    var vrated   = params.vrated   || 50;
    var irated   = params.irated   || 500;
    var dt0      = params.dt0      || 10;
    var cooling = 1; // Natural convection only
    var wd       = params.wd       || 365;
    var wt       = params.wt       || 5;
    var scenario = params.scenario || "industrial";
    var kva      = params.kva !== undefined ? params.kva : 0.56; // Kv exponential model parameter a (Nichicon)
    var kvb      = params.kvb !== undefined ? params.kvb : 1.0;  // Kv exponential model parameter b
    var segments = params.segments || [];

    if (!segments.length) return null;

    var mi   = MG[scenario] || MG.industrial;
    var sr   = calcSegments(segments, l0, tmax, tau, vrated, irated, dt0, kva, kvb, wd);
    var dmg  = sr.reduce(function (s, r) { return s + r.d; }, 0);
    var ly   = dmg > 0 ? 1 / dmg : Infinity;
    var lh   = ly * wd * segments.reduce(function (s, seg) { return s + (seg.dur || 0); }, 0);
    var margin = ly / wt;
    var req    = mi.r;

    // Warranty verdict
    var ws, wc, wd2;
    if      (margin >= req * 1.2) { ws = "优秀";     wc = "g"; wd2 = "质保期" + wt + "年,预计" + fv(ly,1) + "年,裕量充足"; }
    else if (margin >= req)       { ws = "合格";     wc = "p"; wd2 = "质保期" + wt + "年,预计" + fv(ly,1) + "年,满足要求"; }
    else if (margin >= req * 0.7) { ws = "边缘";     wc = "c"; wd2 = "质保期" + wt + "年,预计" + fv(ly,1) + "年,建议增加裕量"; }
    else                          { ws = "不合格";   wc = "b"; wd2 = "质保期" + wt + "年,预计" + fv(ly,1) + "年,无法满足"; }

    // Worst-case segment stats
    var wtHs = -Infinity;
    var wtKt = Infinity;
    sr.forEach(function (r) { if (r.ths > wtHs) wtHs = r.ths; if (r.kt < wtKt) wtKt = r.kt; });

    return {
      l0: l0, tmax: tmax, tau: tau, vrated: vrated, irated: irated, dt0: dt0,
      // cooling removed — always natural convection (coefficient = 1)
      wd: wd, wt: wt, scenario: scenario, mi: mi,
      sr: sr, dmg: dmg, lh: lh, ly: ly, margin: margin,
      ws: ws, wc: wc, wd2: wd2, req: req,
      wsFull: ws + "(" + fv(margin,1) + "x,需" + req + "x)",
      wtHs: wtHs, wtKt: wtKt
    };
  }

  /* ── Expose ───────────────────────────────────── */
  global.CapacitorModel = {
    fv: fv, kvf: kvf,
    calcDeltaT: calcDeltaT,
    calcSegments: calcSegments,
    calcLifetime: calcLifetime
  };

})(window);
