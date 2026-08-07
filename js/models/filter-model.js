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

  // Next lower standard value (snap down) — ensures R < 1MΩ
  function predecessorStd(val, series) {
    var arr = series === "e48" ? E48 : E24;
    var decade = Math.pow(10, Math.floor(Math.log10(val)));
    var best = arr[arr.length-1] * decade / 10;
    for (var i = 0; i < arr.length; i++) { var c = arr[i] * decade; if (c < val && c > best) best = c; }
    var dec2 = decade / 10;
    for (var i = 0; i < arr.length; i++) { var c = arr[i] * dec2; if (c < val && c > best) best = c; }
    return best;
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

     Topology (balanced differential):
       R1: Vin+ → OP+ (non-inverting input)
       R2: Vin- → OP- (inverting input)
       R3∥C3: OP+ → GND (parallel RC to ground from non-inverting input)
       R4∥C4: OP- → Vout (parallel RC feedback from output to inverting input)

     Balanced design: R1=R2, R3=R4, C3=C4

     Transfer function for differential signal:
       H(s) = (R4/R2) / (1 + s·R4·C4)

     DC gain:  G = R4/R2
     Cutoff:   fc = 1/(2π·R4·C4)

     Design: choose C4 so that R4 falls in the sweet-spot range
     (Rmin…Rmax, default 1kΩ…470kΩ), then snap to standard values.
     ================================================================ */
  function designDiff1(fc, gain, series, C4_hint) {
    series = series || "e24";
    if (!fc || fc <= 0) return null;
    if (!gain || gain <= 0) gain = 1;

    var Rmin = 1e3, Rmax = 1e6;  // 1kΩ … 1MΩ range


    // Choose C4 so R4 lands in the sweet-spot
    var C4_nominal;
    if (C4_hint && C4_hint > 0) {
      C4_nominal = C4_hint;
    } else {
      var preferredCaps = [1.0, 1.5, 2.2, 3.3, 4.7, 6.8];
      var bestC4 = 1e-7, bestScore = Infinity;
      for (var decade = -12; decade <= -3; decade++) {  // pF to μF
        for (var j = 0; j < preferredCaps.length; j++) {
          var c = preferredCaps[j] * Math.pow(10, decade);
          var r4d = 1 / (2 * Math.PI * fc * c);
          if (r4d >= Rmin && r4d <= Rmax) {
            var score = Math.abs(Math.log(r4d) - 0.5 * Math.log(Rmin * Rmax));
            if (score < bestScore) { bestScore = score; bestC4 = c; }
          }
        }
      }
      C4_nominal = bestC4;
    }

    var R4_ideal = 1 / (2 * Math.PI * fc * C4_nominal);
    var R2_ideal = R4_ideal / gain;

    var C4 = nearestStdCap(C4_nominal, series);
    var R4 = nearestStd(R4_ideal, series);
    var R2 = nearestStd(R2_ideal, series);
    // Ensure R < 1MΩ: if snap overshoots, step down one standard value
    if (R4 >= 1e6) R4 = predecessorStd(R4_ideal, series);
    if (R2 >= 1e6) R2 = predecessorStd(R2_ideal, series);
    // Balanced: R1=R2, R3=R4, C3=C4
    var R1 = R2;
    var R3 = R4;
    var C3 = C4;

    var actual_fc = 1 / (2 * Math.PI * R4 * C4);
    var actual_gain = R4 / R2;

    var freqs = genFreqPoints(actual_fc * 0.01, actual_fc * 100, 300);
    var freqResp = [];
    var tau = R4 * C4;
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
      Q: 0.5,
      components: {
        R1: R1, R2: R2, R3: R3, R4: R4, C3: C3, C4: C4,
        R1_label: valLabel(R1) + "Ω",
        R2_label: valLabel(R2) + "Ω",
        R3_label: valLabel(R3) + "Ω",
        R4_label: valLabel(R4) + "Ω",
        C3_label: capLabel(C3),
        C4_label: capLabel(C4)
      },
      freqResp: freqResp,
      poles: [{real: -1/tau, imag: 0}]
    };
  }

  /* ================================================================
     2nd-Order MFB Low-Pass Filter

     Topology: R2 || C2 as feedback, R3 in series, C1 from node to GND
     Simplified design: R3 = R1

     H0 = -R2/(2·R1)
     ω0² = 2/(C1·C2·R1·R2)

     Design approach (classic MFB cookbook):
       Let C2 = n·C1  (default n=1 for unity-gain, or auto-tune)
       Choose C1 so that R1,R2 land in the op-amp sweet-spot (1k…470k)
       R1 = 1/(2·Q·ω0·C1)          [approximately, when R3=R1]
       R2 = 2·Q/(ω0·C1)
       Then snap C1,C2,R1,R2,R3 to nearest standard values.
     ================================================================ */
  function designMfb2(fc, gain, Q, series, C1_hint, C2_hint) {
    series = series || "e24";
    if (!fc || fc <= 0) return null;
    if (!gain || gain <= 0) gain = 1;
    if (!Q || Q <= 0) Q = 0.707;
    var Q_target = Q;
    var w0 = 2 * Math.PI * fc;
    var seriesArr = series === "e48" ? E48 : E24;

    // Generate standard capacitor values (1pF .. 10uF)
    var CAPS = [];
    for (var dec = -12; dec <= -3; dec++)
      for (var j = 0; j < seriesArr.length; j++) CAPS.push(seriesArr[j] * Math.pow(10, dec));

    // Correct transfer function:
    //   H(s) = -(R2/R1) / [1 + s·C1·(R2+R3+R2·R3/R1) + s²·C1·C2·R2·R3]
    //   d1 = C1·(R2+R3+R2·R3/R1),  d2 = C1·C2·R2·R3,  Q = √d2/d1,  ω₀ = 1/√d2
    function qAct(R1,R2,R3,C1,C2){
      var d1=C1*(R2+R3+R2*R3/R1),d2=C1*C2*R2*R3;
      return d1>0&&d2>0?Math.sqrt(d2)/d1:0;
    }
    function fAct(R1,R2,R3,C1,C2){
      var d2=C1*C2*R2*R3;
      return d2>0?1/(2*Math.PI*Math.sqrt(d2)):0;
    }

    var best=null,bestScore=Infinity;
    for(var ci=0;ci<CAPS.length;ci++){
      var c1t=CAPS[ci];
      for(var cj=0;cj<CAPS.length;cj++){
        var c2t=CAPS[cj];
        if(c2t<c1t*0.05||c2t>c1t*20) continue;
        for(var logR1=3;logR1<=6;logR1+=0.015){
          var R1=Math.pow(10,logR1);
          if(R1>=1e6) continue;
          // R2 = G·R1  (from gain = R2/R1)
          var R2 = gain * R1;
          if(R2<10||R2>=1e6) continue;
          // R3 = 1/(C1·C2·R2·ω₀²)  (from d2 = 1/ω₀²)
          var R3 = 1/(c1t*c2t*R2*w0*w0);
          if(R3<10||R3>=1e6) continue;
          var R1s=nearestStd(R1,series),R2s=nearestStd(R2,series),R3s=nearestStd(R3,series);
          var C1s=nearestStdCap(c1t,series),C2s=nearestStdCap(c2t,series);
          if(R1s<=0||R2s<=0||R3s<=0) continue;
          var qA=qAct(R1s,R2s,R3s,C1s,C2s),fA=fAct(R1s,R2s,R3s,C1s,C2s);
          if(qA<=0||fA<=0) continue;
          var gA=R2s/R1s;
          var sc=10*Math.abs(qA-Q_target)/Q_target+Math.abs(fA-fc)/fc+Math.abs(gA-gain)/gain;
          if(sc<bestScore){bestScore=sc;best={R1:R1s,R2:R2s,R3:R3s,C1:C1s,C2:C2s};}
        }
      }
    }
    if(!best) return null;
    var R1=best.R1,R2=best.R2,R3=best.R3,C1=best.C1,C2=best.C2;

    var n0=-R2/R1,d1=C1*(R2+R3+R2*R3/R1),d2=C1*C2*R2*R3;
    var actual_w0=1/Math.sqrt(d2),actual_Q=(d2>0&&d1>0)?Math.sqrt(d2)/d1:0;
    var actual_fc=actual_w0/(2*Math.PI),actual_gain=Math.abs(n0);

    var freqs=genFreqPoints(actual_fc*0.01,actual_fc*100,300),freqResp=[];
    for(var i=0;i<freqs.length;i++){
      var w=2*Math.PI*freqs[i],re=n0*(1-w*w*d2)/((1-w*w*d2)*(1-w*w*d2)+(w*d1)*(w*d1));
      var im=-n0*w*d1/((1-w*w*d2)*(1-w*w*d2)+(w*d1)*(w*d1));
      freqResp.push({f:freqs[i],mag:Math.sqrt(re*re+im*im),phase:Math.atan2(im,re)*180/Math.PI,magDb:20*Math.log10(Math.sqrt(re*re+im*im)||1e-30),phaseDeg:Math.atan2(im,re)*180/Math.PI});
    }
    var disc=d1*d1-4*d2,poles=[];
    if(disc>=0){poles.push({real:-d1/(2*d2)+Math.sqrt(disc)/(2*d2),imag:0});poles.push({real:-d1/(2*d2)-Math.sqrt(disc)/(2*d2),imag:0});}
    else{poles.push({real:-d1/(2*d2),imag:Math.sqrt(-disc)/(2*d2)});poles.push({real:-d1/(2*d2),imag:-Math.sqrt(-disc)/(2*d2)});}

    return{type:"mfb2",fc_target:fc,gain_target:gain,Q_target:Q_target,fc_actual:actual_fc,gain_actual:actual_gain,Q_actual:actual_Q,
      components:{R1:R1,R2:R2,R3:R3,C1:C1,C2:C2,R1_label:valLabel(R1)+"Ω",R2_label:valLabel(R2)+"Ω",R3_label:valLabel(R3)+"Ω",C1_label:capLabel(C1),C2_label:capLabel(C2)},
      freqResp:freqResp,poles:poles};
  }

  /* ── Evaluate from existing component values ─── */
  function evalDiff1(R1, R2, R3, R4, C3, C4) {
    if (!R1 || !R2 || !R3 || !R4 || !C3 || !C4) return null;
    if (R1 <= 0 || R2 <= 0 || R3 <= 0 || R4 <= 0 || C3 <= 0 || C4 <= 0) return null;
    var gain = R4 / R2;
    var fc = 1 / (2 * Math.PI * R4 * C4);

    var freqs = genFreqPoints(fc * 0.01, fc * 100, 300);
    var freqResp = [];
    var tau = R4 * C4;
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
      components: { R1: R1, R2: R2, R3: R3, R4: R4, C3: C3, C4: C4 },
      freqResp: freqResp
    };
  }

  function evalMfb2(R1, R2, R3, C1, C2) {
    if (!R1 || !R2 || !R3 || !C1 || !C2) return null;
    if (R1 <= 0 || R2 <= 0 || R3 <= 0 || C1 <= 0 || C2 <= 0) return null;

    var n0 = -R2 / R1;
    var d1 = C1 * (R2 + R3 + R2 * R3 / R1);
    var d2 = C1 * C2 * R2 * R3;

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

  /* ── Nearest standard capacitor value ─── */
  function nearestStdCap(val, series) {
    var seriesArr = series === "e48" ? E48 : E24;
    // Find the appropriate decade
    var decade = Math.pow(10, Math.floor(Math.log10(val)));
    var norm = val / decade;
    var nearest = seriesArr[0];
    var minDiff = Infinity;
    for (var i = 0; i < seriesArr.length; i++) {
      var diff = Math.abs(seriesArr[i] - norm);
      if (diff < minDiff) { minDiff = diff; nearest = seriesArr[i]; }
    }
    return nearest * decade;
  }

  /* ── Design entry point ──────────────── */
  function designFilter(type, params) {
    if (type === "diff1") {
      return designDiff1(params.fc, params.gain, params.series, params.C4);
    } else if (type === "mfb2") {
      return designMfb2(params.fc, params.gain, params.Q, params.series, params.C1, params.C2);
    }
    return null;
  }

  /* ── Evaluate entry point ────────────── */
  function evalFilter(type, comps) {
    if (type === "diff1") {
      return evalDiff1(comps.R1, comps.R2, comps.R3, comps.R4, comps.C3, comps.C4);
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
    nearestStdCap: nearestStdCap,
    predecessorStd: predecessorStd,
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
