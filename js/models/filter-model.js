/* ===== Signal Filter Design — Pure Calculation Model ===== */
/* Zero DOM dependency. Implements 1st-order differential LPF   */
/* and 2nd-order MFB LPF, E24/E48 nearest-value lookup.         */

(function (global) {
  "use strict";

  /* ── E24 series (5% tolerance) ─────────── */
  var E24 = [1.0,1.1,1.2,1.3,1.5,1.6,1.8,2.0,2.2,2.4,2.7,
             3.0,3.3,3.6,3.9,4.3,4.7,5.1,5.6,6.2,6.8,7.5,8.2,9.1];

  /* ── E48 series (2% tolerance) ─────────── */
  var E48 = [1.00,1.05,1.10,1.15,1.21,1.27,1.33,1.40,1.47,1.54,
             1.62,1.69,1.78,1.87,1.96,2.05,2.15,2.26,2.37,2.49,
             2.61,2.74,2.87,3.01,3.16,3.32,3.48,3.65,3.83,4.02,
             4.22,4.42,4.64,4.87,5.11,5.36,5.62,5.90,6.19,6.49,
             6.81,7.15,7.50,7.87,8.25,8.66,9.09,9.53];

  function fv(v, d) { return typeof v !== "number" || !isFinite(v) ? "-" : v.toFixed(d); }

  /* ── Nearest standard value (scaled) ──── */
  function nearestStd(val, series, minR, maxR) {
    var seriesArr = series === "e48" ? E48 : E24;
    minR = minR || 10; maxR = maxR || 10000000; // 10Ω – 10MΩ default range

    // Find appropriate decade
    function scaled(v) {
      var decade = Math.pow(10, Math.floor(Math.log10(v)));
      var norm = v / decade;
      var nearest = seriesArr[0];
      var minDiff = Infinity;
      for (var i = 0; i < seriesArr.length; i++) {
        var d2 = Math.abs(seriesArr[i] - norm);
        if (d2 < minDiff) { minDiff = d2; nearest = seriesArr[i]; }
      }
      return nearest * decade;
    }

    var result = scaled(val);
    // Clamp to range. If still out of range, try other decades
    var decade = Math.pow(10, Math.floor(Math.log10(val)));
    for (var attempt = 0; attempt < 5; attempt++) {
      var test = scaled(val * Math.pow(10, attempt - 2));
      if (test >= minR && test <= maxR) {
        result = test;
        // Find closest to target within range
        var candidates = [
          {v: scaled(val), d: Math.abs(scaled(val) - val)},
          {v: scaled(val * 0.1), d: Math.abs(scaled(val * 0.1) - val)},
          {v: scaled(val * 10), d: Math.abs(scaled(val * 10) - val)},
        ];
        candidates.sort(function(a,b){return a.d - b.d});
        for (var c = 0; c < candidates.length; c++) {
          if (candidates[c].v >= minR && candidates[c].v <= maxR) {
            result = candidates[c].v;
            break;
          }
        }
        break;
      }
    }
    return result;
  }

  /* ── Generate frequency response points ─── */
  function genFreqPoints(fMin, fMax, points) {
    points = points || 200;
    var out = [];
    var step = Math.log(fMax / fMin) / (points - 1);
    for (var i = 0; i < points; i++) {
      out.push(fMin * Math.exp(step * i));
    }
    return out;
  }

  /* ================================================================
     1st-Order Differential Low-Pass Filter
     Transfer function: H(s) = (R2/R1) / (1 + s*R2*C1)
     DC gain: G = R2/R1
     Cutoff: fc = 1/(2π*R2*C1)
     ================================================================ */
  function designDiff1(fc, gain, C1, series) {
    series = series || "e24";
    if (!fc || fc <= 0) return null;
    if (!gain || gain <= 0) gain = 1;
    if (!C1 || C1 <= 0) C1 = 1e-7; // default 100nF

    // Calculate ideal values
    var R2_ideal = 1 / (2 * Math.PI * fc * C1);
    var R1_ideal = R2_ideal / gain;

    // Snap to standard values
    var R2 = nearestStd(R2_ideal, series);
    // Recompute C1 from snapped R2 to maintain fc
    var C1_snapped = C1; // keep original C1
    var R1 = nearestStd(R1_ideal, series);

    // Actual performance with snapped values
    var actual_fc = 1 / (2 * Math.PI * R2 * C1_snapped);
    var actual_gain = R2 / R1;

    // Generate frequency response
    var freqs = genFreqPoints(actual_fc * 0.01, actual_fc * 100, 300);
    var freqResp = [];
    var tau = R2 * C1_snapped;
    for (var i = 0; i < freqs.length; i++) {
      var w = 2 * Math.PI * freqs[i];
      var denom = Math.sqrt(1 + (w * tau) * (w * tau));
      var mag = actual_gain / denom;
      var phase = -Math.atan2(w * tau, 1) * 180 / Math.PI;
      freqResp.push({f: freqs[i], mag: mag, phase: phase, magDb: 20 * Math.log10(mag || 1e-30), phaseDeg: phase});
    }

    return {
      type: "diff1",
      fc_target: fc,
      gain_target: gain,
      fc_actual: actual_fc,
      gain_actual: actual_gain,
      Q: 0.5, // 1st-order
      components: {
        R1: R1, R2: R2, C1: C1_snapped,
        R1_label: valLabel(R1) + "Ω",
        R2_label: valLabel(R2) + "Ω",
        C1_label: capLabel(C1_snapped)
      },
      freqResp: freqResp,
      poles: [{real: -1/tau, imag: 0}]
    };
  }

  /* ================================================================
     2nd-Order MFB Low-Pass Filter

     Topology: R2 || C2 as feedback, R3 in series, C1 from node to GND

        Vin --[R1]--+--[R3]--+--->(-) op-amp --> Vout
                    |        |       |
                   [C1]     |   +--+
                    |       [R2]  |
                   GND      |   [C2]
                            |    |
                           GND   |
                                (+)
                                 |
                                GND

     H(s) = -(R2/(R1+R3)) / [1 + s*(R2*C2 + C1*R1*R3/(R1+R3)) + s²*C1*C2*R1*R2*R3/(R1+R3)]

     Simplified design: Let R3 = R1. Then:
     H0 = -R2/(2*R1)
     ω0² = 2/(C1*C2*R1*R2)
     ω0/Q = (R2*C2 * ω0²) + (C1*R1/2 * ω0²) = 2/(C1*R1) + 1/(C2*R2)
     ================================================================ */
  function designMfb2(fc, gain, Q, C1, C2, series) {
    series = series || "e24";
    if (!fc || fc <= 0) return null;
    if (!gain || gain <= 0) gain = 1;
    if (!Q || Q <= 0) Q = 0.707; // Butterworth default
    if (!C1 || C1 <= 0) C1 = 1e-7; // default 100nF
    if (!C2 || C2 <= 0) C2 = C1; // default equal values

    // Use simplified design with R3 = R1
    // From: H0 = -R2/(2*R1) → R2 = 2*|H0|*R1
    // ω0² = 2/(C1*C2*R1*R2) → ω0 = 1/√(C1*C2*R1*R2/2)
    // Q: ω0/Q = 2/(C1*R1) + 1/(C2*R2)

    var w0 = 2 * Math.PI * fc;

    // Solve: R1 and R2 from gain and fc
    // R2 = 2*gain*R1 (from H0)
    // ω0² = 2/(C1*C2*R1*(2*gain*R1)) = 1/(C1*C2*gain*R1²)
    // R1 = 1/(w0*√(C1*C2*gain))

    var sqrtC1C2K = Math.sqrt(C1 * C2 * gain);
    var R1_ideal = 1 / (w0 * sqrtC1C2K);
    var R2_ideal = 2 * gain * R1_ideal;
    var R3_ideal = R1_ideal;

    // Snap to standard values
    var R1 = nearestStd(R1_ideal, series);
    var R2 = nearestStd(R2_ideal, series);
    var R3 = nearestStd(R3_ideal, series);

    // Actual performance with snapped values
    var n0 = -R2 / (R1 + R3);
    var d1 = R2 * C2 + C1 * R1 * R3 / (R1 + R3);
    var d2 = C1 * C2 * R1 * R2 * R3 / (R1 + R3);

    var actual_w0 = 1 / Math.sqrt(d2);
    var actual_Q = (d2 > 0 && d1 > 0) ? Math.sqrt(d2) / d1 : 0;
    var actual_fc = actual_w0 / (2 * Math.PI);
    var actual_gain = Math.abs(n0);

    // Generate frequency response
    var freqs = genFreqPoints(actual_fc * 0.01, actual_fc * 100, 300);
    var freqResp = [];
    for (var i = 0; i < freqs.length; i++) {
      var w = 2 * Math.PI * freqs[i];
      var realPart = n0 * (1 - w*w*d2) / ((1 - w*w*d2)*(1 - w*w*d2) + (w*d1)*(w*d1));
      var imagPart = -n0 * w * d1 / ((1 - w*w*d2)*(1 - w*w*d2) + (w*d1)*(w*d1));
      var mag = Math.sqrt(realPart*realPart + imagPart*imagPart);
      var p = Math.atan2(imagPart, realPart) * 180 / Math.PI;
      freqResp.push({f: freqs[i], mag: mag, phase: p, magDb: 20 * Math.log10(mag || 1e-30), phaseDeg: p});
    }

    // Calculate poles
    var a = d2, b = d1, c = 1;
    var disc = b*b - 4*a*c;
    var poles = [];
    if (disc >= 0) {
      poles.push({real: -b/(2*a) + Math.sqrt(disc)/(2*a), imag: 0});
      poles.push({real: -b/(2*a) - Math.sqrt(disc)/(2*a), imag: 0});
    } else {
      poles.push({real: -b/(2*a), imag: Math.sqrt(-disc)/(2*a)});
      poles.push({real: -b/(2*a), imag: -Math.sqrt(-disc)/(2*a)});
    }

    return {
      type: "mfb2",
      fc_target: fc,
      gain_target: gain,
      Q_target: Q,
      fc_actual: actual_fc,
      gain_actual: actual_gain,
      Q_actual: actual_Q,
      components: {
        R1: R1, R2: R2, R3: R3, C1: C1, C2: C2,
        R1_label: valLabel(R1) + "Ω",
        R2_label: valLabel(R2) + "Ω",
        R3_label: valLabel(R3) + "Ω",
        C1_label: capLabel(C1),
        C2_label: capLabel(C2)
      },
      freqResp: freqResp,
      poles: poles
    };
  }

  /* ── Evaluate from existing component values ─── */
  function evalDiff1(R1, R2, C1) {
    if (!R1 || !R2 || !C1 || R1 <= 0 || R2 <= 0 || C1 <= 0) return null;
    var gain = R2 / R1;
    var fc = 1 / (2 * Math.PI * R2 * C1);

    var freqs = genFreqPoints(fc * 0.01, fc * 100, 300);
    var freqResp = [];
    var tau = R2 * C1;
    for (var i = 0; i < freqs.length; i++) {
      var w = 2 * Math.PI * freqs[i];
      var denom = Math.sqrt(1 + (w * tau) * (w * tau));
      var mag = gain / denom;
      var phase = -Math.atan2(w * tau, 1) * 180 / Math.PI;
      freqResp.push({f: freqs[i], mag: mag, phase: phase, magDb: 20 * Math.log10(mag || 1e-30), phaseDeg: phase});
    }

    return {
      type: "diff1",
      fc_actual: fc,
      gain_actual: gain,
      Q: 0.5,
      components: { R1: R1, R2: R2, C1: C1 },
      freqResp: freqResp
    };
  }

  function evalMfb2(R1, R2, R3, C1, C2) {
    if (!R1 || !R2 || !R3 || !C1 || !C2) return null;
    if (R1 <= 0 || R2 <= 0 || R3 <= 0 || C1 <= 0 || C2 <= 0) return null;

    var n0 = -R2 / (R1 + R3);
    var d1 = R2 * C2 + C1 * R1 * R3 / (R1 + R3);
    var d2 = C1 * C2 * R1 * R2 * R3 / (R1 + R3);

    if (d2 <= 0) return null;

    var actual_w0 = 1 / Math.sqrt(d2);
    var actual_Q = (d1 > 0) ? Math.sqrt(d2) / d1 : 0;
    var actual_fc = actual_w0 / (2 * Math.PI);
    var actual_gain = Math.abs(n0);

    var freqs = genFreqPoints(actual_fc * 0.01, actual_fc * 100, 300);
    var freqResp = [];
    for (var i = 0; i < freqs.length; i++) {
      var w = 2 * Math.PI * freqs[i];
      var re = n0 * (1 - w*w*d2) / ((1 - w*w*d2)*(1 - w*w*d2) + (w*d1)*(w*d1));
      var im = -n0 * w * d1 / ((1 - w*w*d2)*(1 - w*w*d2) + (w*d1)*(w*d1));
      var mag = Math.sqrt(re*re + im*im);
      var p = Math.atan2(im, re) * 180 / Math.PI;
      freqResp.push({f: freqs[i], mag: mag, phase: p, magDb: 20 * Math.log10(mag || 1e-30), phaseDeg: p});
    }

    return {
      type: "mfb2",
      fc_actual: actual_fc,
      gain_actual: actual_gain,
      Q_actual: actual_Q,
      components: { R1: R1, R2: R2, R3: R3, C1: C1, C2: C2 },
      freqResp: freqResp
    };
  }

  /* ── Value formatting helpers ──────────── */
  function valLabel(v) {
    if (v >= 1000000) return fv(v / 1000000, 1) + "M";
    if (v >= 1000) return fv(v / 1000, 1) + "k";
    return fv(v, 1);
  }

  function capLabel(v) {
    if (v >= 1e-3) return fv(v * 1000, 0) + "mF";
    if (v >= 1e-6) return fv(v * 1e6, 1) + "μF";
    if (v >= 1e-9) return fv(v * 1e9, 1) + "nF";
    return fv(v * 1e12, 1) + "pF";
  }

  /* ── Design entry point ──────────────── */
  function designFilter(type, params) {
    if (type === "diff1") {
      return designDiff1(params.fc, params.gain, params.C1, params.series);
    } else if (type === "mfb2") {
      return designMfb2(params.fc, params.gain, params.Q, params.C1, params.C2, params.series);
    }
    return null;
  }

  /* ── Evaluate entry point ────────────── */
  function evalFilter(type, comps) {
    if (type === "diff1") {
      return evalDiff1(comps.R1, comps.R2, comps.C1);
    } else if (type === "mfb2") {
      return evalMfb2(comps.R1, comps.R2, comps.R3, comps.C1, comps.C2);
    }
    return null;
  }

  // Expose
  global.FilterModel = {
    fv: fv,
    valLabel: valLabel,
    capLabel: capLabel,
    nearestStd: nearestStd,
    E24: E24,
    E48: E48,
    designFilter: designFilter,
    evalFilter: evalFilter,
    designDiff1: designDiff1,
    designMfb2: designMfb2,
    evalDiff1: evalDiff1,
    evalMfb2: evalMfb2,
    genFreqPoints: genFreqPoints
  };

})(window);
