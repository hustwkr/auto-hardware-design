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

  /* ── Impedance calculation: resistance + inductance + voltage drop ─── */
  function calcImpedance(params) {
    var current   = params.current;   // A
    var widthMil  = params.widthMil;  // mil
    var copperOz  = params.copperOz;
    var lengthMm  = params.lengthMm;  // mm
    var ambTemp   = params.ambTemp || 25; // °C

    if (!current || current <= 0 || !widthMil || widthMil <= 0 ||
        !copperOz || copperOz <= 0 || !lengthMm || lengthMm <= 0) {
      return { resistance: null, inductance: null, vdrop: null, powerLoss: null };
    }

    var thicknessCm = copperOz * OZ_TO_UM * 1e-4; // cm
    var widthCm = widthMil * MIL_TO_CM;
    var lengthCm = lengthMm * 0.1;

    // Temperature-corrected resistivity
    var rho = RHO_20 * (1 + ALPHA * (ambTemp - 20));
    var R = rho * lengthCm / (widthCm * thicknessCm); // Ω

    // PCB trace inductance (approximate microstrip formula, nH)
    // L ≈ 0.2 × l × [ln(2l/(w+t)) + 0.5 + 0.2235×(w+t)/l]
    var wT = widthMil * MIL_TO_MM; // mm
    var tT = copperOz * OZ_TO_UM * 0.001;  // mm (1 μm = 0.001 mm)
    var lT = lengthMm;              // mm
    var sumWT = wT + tT;
    var L_nH = 0.2 * lT * (Math.log(2 * lT / sumWT) + 0.5 + 0.2235 * sumWT / lT);

    var vdrop = current * R * 1000;  // mV
    var powerLoss = current * current * R * 1000; // mW

    return {
      resistance: Math.round(R * 1e8) / 1e8,  // Ω
      inductance: Math.round(L_nH * 100) / 100, // nH
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
      var vd = calcImpedance({
        current: r.current,
        widthMil: widths[i],
        copperOz: params.copperOz,
        lengthMm: params.lengthMm || 50,
        ambTemp: params.ambTemp || 25
      });
      results.push({
        width: widths[i],
        current: r.current,
        resistance: vd.resistance,
        inductance: vd.inductance,
        vdrop: vd.vdrop,
        powerLoss: vd.powerLoss
      });
    }
    return results;
  }

  /* ── Via hole wall cross-section area ─── */
  /* drillMm: finished hole diameter     */
  /* wallUm:  plating thickness in μm    */
  /* returns cross-section in mm²        */
  function viaArea(drillMm, wallUm) {
    var tw = wallUm / 1000;           // μm → mm
    var rInner = drillMm / 2;
    var rOuter = rInner + tw;
    return Math.PI * (rOuter * rOuter - rInner * rInner);
  }

  /* ── Forward: via drill diameter → max current ─── */
  function calcViaCurrent(params) {
    var drillMm  = params.drillMm;
    var wallUm   = params.wallUm || 25;
    var position = params.position || "external";
    var deltaT   = params.deltaT || 10;

    if (!drillMm || drillMm <= 0 || !wallUm || wallUm <= 0 || !deltaT || deltaT <= 0) {
      return { current: null, areaMm2: null, areaMil2: null };
    }

    var areaMm2 = viaArea(drillMm, wallUm);
    var areaMil2 = areaMm2 / (MIL_TO_MM * MIL_TO_MM);

    var c = CONST[position] || CONST.external;
    var I = c.K * Math.pow(deltaT, c.b) * Math.pow(areaMil2, c.c);

    return {
      current:   Math.round(I * 1000) / 1000,
      areaMm2:   Math.round(areaMm2 * 10000) / 10000,
      areaMil2:  Math.round(areaMil2 * 100) / 100
    };
  }

  /* ── Reverse: target current → min drill + parallel vias ─── */
  function calcViaDrill(params) {
    var targetI  = params.targetI;
    var wallUm   = params.wallUm || 25;
    var position = params.position || "external";
    var deltaT   = params.deltaT || 10;

    if (!targetI || targetI <= 0 || !wallUm || wallUm <= 0 || !deltaT || deltaT <= 0) {
      return { drillMm: null, singleCurrent: null, viasNeeded: null, areaNeededMm2: null };
    }

    var c = CONST[position] || CONST.external;
    var factor = c.K * Math.pow(deltaT, c.b);
    var areaNeededMil2 = Math.pow(targetI / factor, 1 / c.c);
    var areaNeededMm2  = areaNeededMil2 * MIL_TO_MM * MIL_TO_MM;

    var tw = wallUm / 1000; // mm
    // area = π × tw × (d + tw)  →  d = area/(π×tw) − tw
    var dApprox = (areaNeededMm2 / (Math.PI * tw)) - tw;
    if (dApprox < 0.15) dApprox = 0.15;

    // Nearest standard drill (0.05mm steps below 0.5, 0.1mm above)
    var STD = [0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.8, 1.0, 1.2, 1.5, 2.0];
    var minDrill = 2.0;
    for (var i = 0; i < STD.length; i++) {
      if (STD[i] >= dApprox) { minDrill = STD[i]; break; }
    }

    var single = calcViaCurrent({ drillMm: minDrill, wallUm: wallUm, position: position, deltaT: deltaT });
    var viasNeeded = single.current > 0 ? Math.ceil(targetI / single.current) : 1;
    if (viasNeeded < 1) viasNeeded = 1;

    return {
      drillMm:       minDrill,
      singleCurrent: single.current,
      viasNeeded:    viasNeeded,
      areaNeededMm2: Math.round(areaNeededMm2 * 10000) / 10000
    };
  }

  /* ── Public API ─── */
  global.PcbTraceModel = {
    fv: fv,
    calcCurrent: calcCurrent,
    calcWidth: calcWidth,
    calcImpedance: calcImpedance,
    calcComparison: calcComparison,
    viaArea: viaArea,
    calcViaCurrent: calcViaCurrent,
    calcViaDrill: calcViaDrill,
    OZ_TO_MIL: OZ_TO_MIL,
    MIL_TO_MM: MIL_TO_MM
  };

})(window);
