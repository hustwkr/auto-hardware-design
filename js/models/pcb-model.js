/* ===== PCB Trace Current Capacity — Pure Calculation Model ===== */
/* Zero DOM dependency — IPC-2221 standard formula.               */

(function (global) {
  "use strict";

  /* ── IPC-2221 constants: I = K × ΔT^b × A^c ─── */
  /* A = cross-section in mil² (width_mil × thickness_mil)       */
  var CONST = {
    external: { K: 0.048, b: 0.44, c: 0.725 },
    internal: { K: 0.024, b: 0.44, c: 0.725 }
  };

  /* ── Copper thickness conversions ─── */
  var OZ_TO_MIL = 1.378;  // 1 oz = 35 μm ≈ 1.378 mil
  var OZ_TO_UM  = 35;     // 1 oz = 35 μm
  var MIL_TO_MM = 0.0254; // 1 mil = 0.0254 mm
  var MIL_TO_CM = 0.00254;

  /* ── Copper resistivity at 20°C (Ω·cm) and temp coefficient ─── */
  var RHO_20 = 1.724e-6;  // Ω·cm at 20°C
  var ALPHA  = 0.00393;   // per °C

  /* ── Number formatting ─── */
  function fv(v, d) {
    if (v === null || v === undefined || isNaN(v)) return "-";
    var n = Number(v);
    if (Math.abs(n) >= 1e6) return (n / 1e4).toFixed(d || 1) + "万";
    return n.toFixed(d !== undefined ? d : 2);
  }

  /* ── Forward: width + copper → max current ─── */
  function calcCurrent(params) {
    var widthMil = params.widthMil;   // trace width in mil
    var copperOz = params.copperOz;   // copper weight in oz
    var position  = params.position;   // "external" or "internal"
    var deltaT    = params.deltaT;     // allowed temp rise in °C

    if (!widthMil || widthMil <= 0 || !copperOz || copperOz <= 0 || !deltaT || deltaT <= 0) {
      return { current: null, area: null };
    }

    var thicknessMil = copperOz * OZ_TO_MIL;
    var area = widthMil * thicknessMil; // mil²
    var c = CONST[position] || CONST.external;
    var I = c.K * Math.pow(deltaT, c.b) * Math.pow(area, c.c);

    return {
      current: Math.round(I * 1000) / 1000,
      area: Math.round(area * 100) / 100
    };
  }

  /* ── Reverse: target current + params → min width ─── */
  function calcWidth(params) {
    var targetI   = params.targetI;    // target current in A
    var copperOz  = params.copperOz;
    var position  = params.position;
    var deltaT    = params.deltaT;

    if (!targetI || targetI <= 0 || !copperOz || copperOz <= 0 || !deltaT || deltaT <= 0) {
      return { widthMil: null, widthMm: null };
    }

    var thicknessMil = copperOz * OZ_TO_MIL;
    var c = CONST[position] || CONST.external;
    // I = K × ΔT^b × (W × T)^c  →  W = (I / (K × ΔT^b))^(1/c) / T
    var factor = c.K * Math.pow(deltaT, c.b);
    var areaNeeded = Math.pow(targetI / factor, 1 / c.c);
    var widthMil = areaNeeded / thicknessMil;

    return {
      widthMil: Math.ceil(widthMil * 10) / 10,  // round up to 0.1 mil
      widthMm:  Math.round(widthMil * MIL_TO_MM * 100) / 100
    };
  }

  /* ── Voltage drop calculation ─── */
  function calcVoltageDrop(params) {
    var current   = params.current;   // A
    var widthMil  = params.widthMil;  // mil
    var copperOz  = params.copperOz;
    var lengthMm  = params.lengthMm;  // mm
    var ambTemp   = params.ambTemp || 25; // °C

    if (!current || current <= 0 || !widthMil || widthMil <= 0 ||
        !copperOz || copperOz <= 0 || !lengthMm || lengthMm <= 0) {
      return { resistance: null, vdrop: null, powerLoss: null };
    }

    var thicknessCm = copperOz * OZ_TO_UM * 1e-4; // cm
    var widthCm = widthMil * MIL_TO_CM;
    var lengthCm = lengthMm * 0.1;

    // Temperature-corrected resistivity
    var rho = RHO_20 * (1 + ALPHA * (ambTemp - 20));
    var R = rho * lengthCm / (widthCm * thicknessCm); // Ω

    var vdrop = current * R * 1000;  // mV
    var powerLoss = current * current * R * 1000; // mW

    return {
      resistance: Math.round(R * 1e8) / 1e8,  // Ω
      vdrop: Math.round(vdrop * 100) / 100,    // mV
      powerLoss: Math.round(powerLoss * 100) / 100 // mW
    };
  }

  /* ── Multi-width comparison table ─── */
  function calcComparison(params) {
    var widths = params.widths || [5, 8, 10, 15, 20, 25, 30, 40, 50];
    var results = [];
    for (var i = 0; i < widths.length; i++) {
      var r = calcCurrent({
        widthMil: widths[i],
        copperOz: params.copperOz,
        position: params.position,
        deltaT: params.deltaT
      });
      var vd = calcVoltageDrop({
        current: r.current,
        widthMil: widths[i],
        copperOz: params.copperOz,
        lengthMm: params.lengthMm || 50,
        ambTemp: params.ambTemp || 25
      });
      results.push({
        width: widths[i],
        current: r.current,
        vdrop: vd.vdrop,
        powerLoss: vd.powerLoss
      });
    }
    return results;
  }

  /* ── Public API ─── */
  global.PcbTraceModel = {
    fv: fv,
    calcCurrent: calcCurrent,
    calcWidth: calcWidth,
    calcVoltageDrop: calcVoltageDrop,
    calcComparison: calcComparison,
    OZ_TO_MIL: OZ_TO_MIL,
    MIL_TO_MM: MIL_TO_MM
  };

})(window);
