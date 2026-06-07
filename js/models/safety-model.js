/* ===== Safety Distance — Pure Calculation Model ===== */
/* Zero DOM dependency — lookup tables + pure formula functions.   */

(function (global) {
  "use strict";

  /* ── IEC Clearance Table [Vpeak, PD1, PD2, PD3] ──── */
  var CLR_TBL_IEC = [
    [0,0.2,0.2,0.2],[330,0.2,0.2,0.2],[500,0.2,0.2,0.2],
    [800,0.2,0.2,0.2],[1500,0.5,0.5,0.8],[2500,1.5,1.5,1.5],
    [4000,3.0,3.0,3.0],[6000,5.5,5.5,5.5],[8000,8.0,8.0,8.0],
    [12000,14.0,14.0,14.0]
  ];

  /* ── UL Clearance Table [kVRMS, PD1, PD2, PD3] ───── */
  var CLR_TBL_UL = [
    [0.33,0.2,0.2,0.2],[0.4,0.5,0.5,0.8],[0.5,1.5,1.5,1.5],
    [0.6,2.2,2.2,2.2],[0.8,3.5,3.5,3.5],[1.0,4.5,4.5,4.5],
    [1.2,6.0,6.0,6.0],[1.5,9.0,9.0,9.0],[2.0,14,14,14],
    [2.5,18,18,18],[3.0,23,23,23],[4.0,32,32,32],[5.0,42,42,42],
    [6.0,50,50,50],[8.0,70,70,70],[10.0,95,95,95],
    [12.0,120,120,120]
  ];

  /* ── IEC Creepage Table [Vrms, PD1-B, PD1-F, PD2-B, PD2-F, PCB, PD3-B, PD3-F, ...] ── */
  var CRP_IEC = [
    [0,0.35,0.35,0.35,0.87,0.025,0.87,0.87,0.87,0.87],
    [2,0.35,0.35,0.35,0.87,0.025,0.87,0.87,0.87,0.87],
    [10,0.40,0.40,0.40,1.0,0.025,1.0,1.0,1.0,1.0],
    [25,0.50,0.50,0.50,1.25,0.025,1.25,1.25,1.25,1.25],
    [32,0.53,0.53,0.53,1.3,0.025,1.3,1.3,1.3,1.3],
    [40,0.56,0.80,1.1,1.4,0.025,1.4,1.6,1.8,1.8],
    [50,0.60,0.85,1.20,1.5,0.025,1.5,1.7,1.9,1.9],
    [63,0.63,0.90,1.25,1.6,0.04,1.6,1.8,2.0,2.0],
    [80,0.67,0.95,1.3,1.7,0.063,1.7,1.9,2.1,2.1],
    [100,0.71,1.0,1.4,1.8,0.10,1.8,2.0,2.2,2.2],
    [125,0.75,1.05,1.5,1.9,0.16,1.9,2.1,2.4,2.4],
    [160,0.80,1.1,1.6,2.0,0.25,2.0,2.2,2.5,2.5],
    [200,1.0,1.4,2.0,2.5,0.40,2.5,2.8,3.2,3.2],
    [250,1.25,1.8,2.5,3.2,0.56,3.2,3.6,4.0,4.0],
    [320,1.6,2.2,3.2,4.0,0.75,4.0,4.5,5.0,5.0],
    [400,2.0,2.8,4.0,5.0,1.0,5.0,5.6,6.3,6.3],
    [500,2.5,3.6,5.0,6.3,1.3,6.3,7.1,8.0,8.0],
    [630,3.2,4.5,6.3,8.0,1.8,8.0,9.0,10.0,10.0],
    [800,4.0,5.6,8.0,10.0,2.4,10.0,11,12.5,12.5],
    [1000,5.0,7.1,10.0,12.5,3.2,12.5,14,16,16],
    [1250,6.3,9,12.5,16,4.2,16,18,20,20],
    [1600,8.0,11,16,20,5.6,20,22,25,25],
    [2000,10.0,14,20,25,7.5,25,28,32,32],
    [2500,12.5,18,25,32,10.0,32,36,40,40],
    [3200,16,22,32,40,12.5,40,45,50,50],
    [4000,20,28,40,50,16,50,56,63,63],
    [5000,25,36,50,63,20,63,71,80,80],
    [6300,32,45,63,80,25,80,90,100,100]
  ];

  /* ── UL Creepage Table ─────────────────────── */
  var CRP_UL = [
    [0,0.5,0.5,0.5,1.0,0.04,1.0,1.0,1.0,1.0],
    [2,0.5,0.5,0.5,1.0,0.04,1.0,1.0,1.0,1.0],
    [10,0.6,0.6,0.6,1.2,0.04,1.2,1.2,1.2,1.2],
    [25,0.6,0.6,0.6,1.4,0.04,1.4,1.4,1.4,1.4],
    [32,1.0,1.0,1.0,1.5,0.04,1.5,1.5,1.5,1.5],
    [40,1.2,1.2,1.2,1.6,0.04,1.6,1.8,2.0,2.0],
    [50,1.5,1.5,1.5,1.7,0.04,1.7,2.0,2.2,2.2],
    [63,2.0,2.0,2.0,1.8,0.06,1.8,2.0,2.3,2.3],
    [80,2.5,2.5,2.5,2.0,0.10,2.0,2.2,2.5,2.5],
    [100,2.5,2.5,2.5,2.2,0.16,2.2,2.5,2.8,2.8],
    [125,3.2,3.2,3.2,2.4,0.25,2.4,2.6,3.0,3.0],
    [160,4.0,4.0,4.0,2.5,0.40,2.5,2.8,3.2,3.2],
    [200,5.0,5.0,5.0,3.2,0.63,3.2,3.6,4.0,4.0],
    [250,6.3,6.3,6.3,4.0,0.90,4.0,4.5,5.0,5.0],
    [320,8.0,8.0,8.0,5.0,1.2,5.0,5.6,6.3,6.3],
    [400,8.0,10,10,12,1.6,6.3,7.1,8.0,8.0],
    [500,10,12,12,14,2.0,8.0,9.0,10,10],
    [630,12,14,14,18,2.5,10,11,12.5,12.5],
    [800,12,14,14,18,3.2,12.5,14,16,16],
    [1000,16,18,20,25,4.0,16,18,20,20],
    [1250,20,22,25,32,5.0,20,22,25,25],
    [1600,20,25,32,40,6.3,25,28,32,32],
    [2000,20,32,40,50,8.0,32,36,40,40],
    [2500,25,40,50,63,10.0,40,45,50,50],
    [3200,32,50,63,80,12.5,50,56,63,63],
    [4000,40,63,80,100,16,63,71,80,80],
    [5000,50,80,100,125,20,80,90,100,100],
    [6300,63,100,100,125,25,100,110,125,125]
  ];

  /* ── Impulse withstand voltage per IEC 62109-1 Table 12 [sysV, OVC-I..IV] (kV) ─ */
  var IMPULSE_TBL = [
    [50,0.33,0.5,0.8,1.5],[100,0.5,0.8,1.5,2.5],
    [150,0.8,1.5,2.5,4.0],[300,1.5,2.5,4.0,6.0],
    [600,1.5,2.5,4.0,6.0],[1000,2.5,4.0,6.0,8.0]
  ];

  /* ── Temporary overvoltage per Table 12 col 6 [sysV, Vpeak, Vrms] — mains only ─ */
  var TOV_TBL = [
    [50,1770,1250],[100,1840,1300],[150,1910,1350],
    [300,2120,1500],[600,2550,1800],[1000,3110,2200]
  ];

  /* ── Altitude correction factor ─────────────── */
  var ALT_K = {2000:1.0,3000:1.14,4000:1.29,5000:1.48};

  /* ── Insulation multiplication factor ───────── */
  var INS_K = {func:1.0,basic:1.0,supp:1.0,reinf:2.0};

  /* ── Material group column index in CRP tables ─── */
  var MG_I = {i:0,ii:1,iiia:2,iiib:3};

  /* ── Insulation type labels ─────────────────── */
  var INS_LABELS = {func:"功能",basic:"基本",supp:"附加",reinf:"加强"};

  /* ════════════════════════════════════════════ */
  /* Pure lookup functions (no DOM)               */
  /* ════════════════════════════════════════════ */

  function lookupImpulse(sysV, ovcClass, interp) {
    // sysV: AC system voltage in V (e.g. 300)
    // ovcClass: 1-4 for OVC I-IV
    // interp: true for linear interpolation between rows
    var ov = ovcClass || 2;
    for (var i = 0; i < IMPULSE_TBL.length; i++) {
      if (sysV == IMPULSE_TBL[i][0]) return IMPULSE_TBL[i][ov];
      if (sysV < IMPULSE_TBL[i][0]) {
        if (!interp || i == 0) return IMPULSE_TBL[i][ov];
        var x0 = IMPULSE_TBL[i-1][0], x1 = IMPULSE_TBL[i][0];
        var y0 = IMPULSE_TBL[i-1][ov], y1 = IMPULSE_TBL[i][ov];
        return Math.round((y0 + (sysV - x0) / (x1 - x0) * (y1 - y0)) * 100) / 100;
      }
    }
    return IMPULSE_TBL[IMPULSE_TBL.length - 1][ov];
  }

  function lookupTov(sysV) {
    // Returns {peak, rms} from Table 12 col 6 — only for mains circuits
    for (var i = 0; i < TOV_TBL.length; i++) {
      if (sysV <= TOV_TBL[i][0]) return { peak: TOV_TBL[i][1], rms: TOV_TBL[i][2] };
    }
    var last = TOV_TBL[TOV_TBL.length - 1];
    return { peak: last[1], rms: last[2] };
  }

  function lookupClr(impulseV, pd, standard, interp) {
    // impulseV: in Volts peak (IEC) or kVRMS*1000 (UL converted)
    // pd: pollution degree 1-3 → column index 1-3
    // standard: 'iec' | 'ul'
    if (impulseV <= 0) return 0;
    var tbl = standard === 'ul' ? CLR_TBL_UL : CLR_TBL_IEC;
    for (var i = 0; i < tbl.length; i++) {
      if (impulseV == tbl[i][0]) return tbl[i][pd];
      if (impulseV < tbl[i][0]) {
        if (!interp || i == 0) return tbl[i][pd];
        var x0 = tbl[i-1][0], x1 = tbl[i][0];
        var y0 = tbl[i-1][pd], y1 = tbl[i][pd];
        return Math.round((y0 + (impulseV - x0) / (x1 - x0) * (y1 - y0)) * 1000) / 1000;
      }
    }
    return tbl[tbl.length - 1][pd];
  }

  function lookupCrp(rmsV, pd, mgGroup, standard, pcb) {
    // rmsV: RMS voltage in V
    // pd: pollution degree 1-3
    // mgGroup: 'i' | 'ii' | 'iiia' | 'iiib'
    // standard: 'iec' | 'ul'
    // pcb: boolean — PCB trace (uses column 5)
    var v = Math.min(rmsV, 6300);
    var tbl = standard === 'ul' ? CRP_UL : CRP_IEC;
    var mi = MG_I[mgGroup] || 0;
    for (var i = 0; i < tbl.length; i++) {
      if (v <= tbl[i][0]) {
        if (pcb && pd <= 2) return tbl[i][5];
        if (pd === 1) return tbl[i][5];
        if (pd === 2) return tbl[i][1 + mi];
        return tbl[i][6 + mi];
      }
    }
    var last = tbl[tbl.length - 1];
    if (pcb && pd <= 2) return last[5];
    if (pd === 1) return last[5];
    if (pd === 2) return last[1 + mi];
    return last[6 + mi];
  }

  /* ── Per-node calculation (pure) ─────────────── */
  function calcNode(node, pd, mgGroup, alt, standard, impAC, impDC) {
    // node: { name, vrms, ins, pcb, coat, circ }
    var vrms = node.vrms || 0;
    var ins  = node.ins  || 'basic';
    var pcb  = !!node.pcb;
    var coat = node.coat || 0;
    var circ = node.circ || 'ac';

    // Determine impulse withstand voltage (kV) from Table 12
    var impKV = circ === 'dc' ? impDC : impAC;

    // Clearance calculation — based on impulse voltage per IEC 60664-1 Table A.1
    var im = INS_K[ins] || 1.0;
    var baseClr, clrMult;

    if (standard === 'iec') {
      // IEC: clearance from Table 13 using impulse voltage (kV → V)
      var impV = impKV * 1000;
      if (ins === 'reinf') {
        // Reinforced: double the basic insulation clearance
        baseClr = lookupClr(impV, pd, standard, true);
        clrMult = 2.0;
      } else {
        baseClr = lookupClr(impV, pd, standard, true);
        clrMult = 1.0;
      }
    } else {
      // UL: clearance based on impulse voltage in kV
      baseClr = lookupClr(impKV * 1000, pd, standard, false);
      clrMult = im;
    }

    var altk = ALT_K[alt] || 1.0;
    var reqClr = Math.round(baseClr * altk * clrMult * 10) / 10;

    // Creepage calculation
    var localPd = pd;
    if (coat === 1) localPd = Math.max(1, localPd - 1);
    var reqCrp = lookupCrp(vrms, localPd, mgGroup, standard, pcb ? 1 : 0);
    if (coat === 2) reqCrp = 0; // Coating cancels creepage requirement
    reqCrp = Math.round(reqCrp * im * 10) / 10;

    return {
      name: node.name || "节点",
      vrms: vrms,
      ins: ins,
      insL: INS_LABELS[ins] || ins,
      im: im,
      pcb: pcb ? 1 : 0,
      coat: coat,
      reqClr: reqClr,
      reqCrp: reqCrp
    };
  }

  /* ── Full safety assessment (pure) ───────────── */
  function calcSafety(params) {
    var pd       = params.pd || 2;
    var mgGroup  = params.mgGroup || 'ii';
    var alt      = params.alt || 2000;
    var standard = params.standard || 'iec';
    var sysVAC   = params.sysVAC || 300;
    var sysVDC   = params.sysVDC || 600;
    var nodes    = params.nodes || [];

    // Impulse withstand voltage (kV) — accept from caller or compute via lookupImpulse as fallback
    var impAC = typeof params.impAC === 'number' ? params.impAC : lookupImpulse(sysVAC, params.ovcClass||2, true);
    var impDC = typeof params.impDC === 'number' ? params.impDC : lookupImpulse(sysVDC, params.ovcClass||2, true);

    /* PV circuit rule: min 2.5 kV per §7.3.7.1.2b */
    if(impDC < 2.5) impDC = 2.5;

    if (!nodes.length) return null;

    var altk = ALT_K[alt] || 1.0;

    var results = nodes.map(function (node) {
      return calcNode(node, pd, mgGroup, alt, standard, impAC, impDC);
    });

    return {
      results: results,
      pd: pd, mgGroup: mgGroup, alt: alt, altk: altk,
      standard: standard,
      sysVAC: sysVAC, sysVDC: sysVDC, impAC: impAC, impDC: impDC
    };
  }

  /* ── Expose ─────────────────────────────────── */
  global.SafetyModel = {
    CLR_TBL_IEC: CLR_TBL_IEC,
    CLR_TBL_UL: CLR_TBL_UL,
    CRP_IEC: CRP_IEC,
    CRP_UL: CRP_UL,
    IMPULSE_TBL: IMPULSE_TBL,
    TOV_TBL: TOV_TBL,
    ALT_K: ALT_K,
    INS_K: INS_K,
    MG_I: MG_I,
    INS_LABELS: INS_LABELS,
    lookupImpulse: lookupImpulse,
    lookupTov: lookupTov,
    lookupClr: lookupClr,
    lookupCrp: lookupCrp,
    calcNode: calcNode,
    calcSafety: calcSafety
  };

})(window);
