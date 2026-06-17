/* ===== Safety Distance — Pure Calculation Model ===== */
/* Zero DOM dependency — lookup tables + pure formula functions.   */

(function (global) {
  "use strict";

  /* ── IEC Clearance Table — extended with all Table 13 columns ─── */
  /* [impulse_V, tov_peak_V, wrk_peak_surr_V, PD1, PD2, PD3]          */
  /* Per §7.3.7.4.1: reinforced insulation uses three criteria:        */
  /*   (a) impulse voltage stepped up → col 0 (impulse Vpeak)          */
  /*   (b) 1.6× working peak      → col 2 (wrk peak for surroundings)  */
  /*   (c) 1.6× TOV peak          → col 1 (TOV peak)                   */
  var CLR_TBL_IEC = [
    [0,     0,    0,   0.01, 0.20, 0.80],
    [330,   340,  212, 0.10, 0.20, 0.80],
    [500,   530,  330, 0.10, 0.20, 0.80],
    [800,   700,  440, 0.10, 0.20, 0.80],
    [1500,  960,  600, 0.50, 0.50, 0.80],
    [2500, 1600, 1000, 1.5,  1.5,  1.5],
    [4000, 2600, 1600, 3.0,  3.0,  3.0],
    [6000, 3700, 2300, 5.5,  5.5,  5.5],
    [8000, 4800, 3000, 8.0,  8.0,  8.0],
    [12000,7400, 4600, 14.0, 14.0, 14.0]
  ];

  /* ── UL Clearance Table (UL 840 Table 8.1, OVC IV for inverters) ─── */
  /* [kVRMS(system voltage), PD1, PD2, PD3] — per §25.4g + Table 8.1     */
  var CLR_TBL_UL = [
    [0.050, 0.2, 0.8, 0.8],   // 50V   → 0.33kV impulse
    [0.100, 0.2, 0.8, 1.6],   // 100V  → 0.5kV impulse
    [0.150, 0.2, 0.8, 1.6],   // 150V  → 0.8kV impulse
    [0.300, 0.5, 1.5, 1.5],   // 300V  → 1.5kV impulse
    [0.600, 1.5, 1.5, 1.5],   // 600V  → 2.5kV impulse
    [1.000, 3.0, 3.0, 3.0],   // 1000V → 4.0kV impulse
    [1.500, 5.5, 5.5, 5.5],   // 1500V → 6.0kV impulse
    [2.000, 8.0, 8.0, 8.0],   //       → 8.0kV impulse
    [3.000, 14.0, 14.0, 14.0],//       → 12.0kV impulse
    [4.000, 19.4, 19.4, 19.4] //       → 16.0kV impulse
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

  /* ── UL 840 Table 9.3 — Max recurring peak voltage for PCB creepage distances ─── */
  /* Per §9.6: when using Table 9.2 (PCB) creepage, recurring peak voltage must not    */
  /* exceed the limit in this table. Values extracted from UL 840_2007.pdf via PyMuPDF.*/
  var RECURRING_PEAK_TBL = [
    [0.025, 330], [0.04, 336], [0.063, 345], [0.1, 360],
    [0.16, 384], [0.25, 450], [0.4, 600], [0.5, 640],
    [0.56, 678], [0.63, 723], [0.75, 800], [1.0, 913],
    [1.3, 1049], [1.5, 1140], [1.6, 1150], [1.8, 1250],
    [2.0, 1314], [2.4, 1443], [2.5, 1475], [3.2, 1700],
    [4.0, 1922], [5.0, 2200]
  ];

  /* ── UL 1741 Table 24.1 — Baseline spacing requirements (field wiring terminals) ─ */
  /* Per §25.3: field wiring terminals MUST comply with Section 24, not UL 840 alt.    */
  /* [maxVrms, throughAir_mm, overSurface_mm]                                          */
  var TBL_24_1 = [
    [50,   1.6,  1.6],
    [150,  3.2,  6.4],
    [300,  6.4,  9.5],
    [600,  9.5, 12.7]
  ];

  /* ── UL 1741 §25.3 — Table 24.1 lookup for field wiring terminals ─── */
  function lookupTable24_1(vrms) {
    // Returns { clearance: throughAir, creepage: overSurface } per Table 24.1
    if (vrms <= 0) return { clearance: 0, creepage: 0 };
    for (var i = 0; i < TBL_24_1.length; i++) {
      if (vrms <= TBL_24_1[i][0]) {
        return { clearance: TBL_24_1[i][1], creepage: TBL_24_1[i][2] };
      }
    }
    // Above max entry — use last row
    var last = TBL_24_1[TBL_24_1.length - 1];
    return { clearance: last[1], creepage: last[2] };
  }

  /* ── Altitude correction factor (IEC 62109-1 Annex F Table F.1) ─── */
  var ALT_DATA = [
    [2000, 80.0, 1.00],[3000, 70.0, 1.14],[4000, 62.0, 1.29],[5000, 54.0, 1.48],
    [6000, 47.0, 1.70],[7000, 41.0, 1.95],[8000, 35.5, 2.25],[9000, 30.5, 2.62],
    [10000, 26.5, 3.02],[15000, 12.0, 6.67],[20000, 5.5, 14.50]
  ];

  /* ── Altitude correction factor with linear interpolation ─── */
  function altFactor(m) {
    // m: altitude in meters (default 2000)
    if (m <= 2000) return 1.0;
    if (m >= 20000) return 14.50;
    for (var i = 0; i < ALT_DATA.length - 1; i++) {
      if (m >= ALT_DATA[i][0] && m <= ALT_DATA[i+1][0]) {
        var a0 = ALT_DATA[i][0], a1 = ALT_DATA[i+1][0];
        var k0 = ALT_DATA[i][2], k1 = ALT_DATA[i+1][2];
        return Math.round((k0 + (m - a0) / (a1 - a0) * (k1 - k0)) * 100) / 100;
      }
    }
    return 1.0;
  }

  /* ── UL 840 altitude correction (§6.3 note 5) ─── */
  function altFactorUL(m) {
    // m: altitude in meters
    if (m <= 2000) return 1.0;
    // UL uses exponential atmosphere model: k = e^((h-2000)/3300)
    var h = m - 2000;
    return Math.round(Math.exp(h / 3300) * 100) / 100;
  }

  /* ── Backward compat: ALT_K object for UI display ─── */
  var ALT_K = {};
  ALT_DATA.forEach(function(d){ ALT_K[d[0]] = d[2]; });

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

  function lookupClr(impulseV, pd, standard, interp, col) {
    // impulseV: in Volts peak (IEC) or Volts (UL: kVRMS*1000 from caller)
    // pd: pollution degree 1-3
    // standard: 'iec' | 'ul'
    // col: voltage column index for IEC table (default 0 = impulse). Ignored for UL.
    if (impulseV <= 0) return 0;

    if (standard === 'ul') {
      // UL table: [kVRMS, PD1, PD2, PD3] — convert impulseV to kVRMS for comparison
      var v = impulseV / 1000;
      for (var i = 0; i < CLR_TBL_UL.length; i++) {
        if (v == CLR_TBL_UL[i][0]) return CLR_TBL_UL[i][pd];
        if (v < CLR_TBL_UL[i][0]) {
          if (!interp || i == 0) return CLR_TBL_UL[i][pd];
          var x0 = CLR_TBL_UL[i-1][0], x1 = CLR_TBL_UL[i][0];
          var y0 = CLR_TBL_UL[i-1][pd], y1 = CLR_TBL_UL[i][pd];
          return Math.round((y0 + (v - x0) / (x1 - x0) * (y1 - y0)) * 1000) / 1000;
        }
      }
      return CLR_TBL_UL[CLR_TBL_UL.length - 1][pd];
    }

    // IEC extended table: [impulse_V, tov_peak_V, wrk_peak_surr_V, PD1, PD2, PD3]
    // PD columns at index 3,4,5 → offset = pd (since pd=1→idx3, pd=2→idx4, pd=3→idx5)
    var colIdx = col || 0;
    for (var i = 0; i < CLR_TBL_IEC.length; i++) {
      if (impulseV == CLR_TBL_IEC[i][colIdx]) return CLR_TBL_IEC[i][2 + pd];
      if (impulseV < CLR_TBL_IEC[i][colIdx]) {
        if (!interp || i == 0) return CLR_TBL_IEC[i][2 + pd];
        var x0 = CLR_TBL_IEC[i-1][colIdx], x1 = CLR_TBL_IEC[i][colIdx];
        var y0 = CLR_TBL_IEC[i-1][2 + pd], y1 = CLR_TBL_IEC[i][2 + pd];
        return Math.round((y0 + (impulseV - x0) / (x1 - x0) * (y1 - y0)) * 1000) / 1000;
      }
    }
    return CLR_TBL_IEC[CLR_TBL_IEC.length - 1][2 + pd];
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

  /* ── UL 840 §9.6 — Recurring peak voltage check for PCB creepage distances ─── */
  function lookupRecurringPeakMax(creepage_mm) {
    // Returns max allowable recurring peak voltage (V) for given PCB creepage distance.
    // Linear interpolation between table entries per UL 840 Table 9.3 footnote.
    if (creepage_mm <= RECURRING_PEAK_TBL[0][0]) return RECURRING_PEAK_TBL[0][1];
    for (var i = 0; i < RECURRING_PEAK_TBL.length - 1; i++) {
      var c0 = RECURRING_PEAK_TBL[i][0], v0 = RECURRING_PEAK_TBL[i][1];
      var c1 = RECURRING_PEAK_TBL[i+1][0], v1 = RECURRING_PEAK_TBL[i+1][1];
      if (creepage_mm <= c1) {
        // Linear interpolation: V = v0 + (v1-v0) * (c - c0) / (c1 - c0)
        return Math.round((v0 + (v1 - v0) * (creepage_mm - c0) / (c1 - c0)) * 10) / 10;
      }
    }
    // Above max table entry — extrapolate conservatively (return last value)
    return RECURRING_PEAK_TBL[RECURRING_PEAK_TBL.length - 1][1];
  }

  /* ── Impulse voltage levels for "one step higher" (reinforced) ─── */
  var IMPULSE_LEVELS = [0.33, 0.5, 0.8, 1.5, 2.5, 4.0, 6.0, 8.0];

  /* ── Next higher impulse level for reinforced insulation ─── */
  function nextImpulseLevel(impKV) {
    // impKV: impulse withstand voltage in kV
    // Returns the next standard impulse level (kV), or same value if already max
    var v = impKV;
    for (var i = 0; i < IMPULSE_LEVELS.length; i++) {
      if (IMPULSE_LEVELS[i] > v) return IMPULSE_LEVELS[i];
    }
    return v; // Already at or above the highest level
  }

  /* ── Previous lower impulse level for within-circuit OVC reduction ─── */
  function prevImpLevel(impKV) {
    // impKV: impulse withstand voltage in kV
    // Returns the previous standard impulse level (kV), or same value if already minimum
    var v = impKV;
    for (var i = IMPULSE_LEVELS.length - 1; i >= 0; i--) {
      if(IMPULSE_LEVELS[i] < v) return IMPULSE_LEVELS[i];
    }
    // If exact match, find previous level
    for (var i = IMPULSE_LEVELS.length - 1; i > 0; i--) {
      if(IMPULSE_LEVELS[i] === v) return IMPULSE_LEVELS[i-1];
    }
    return v; // Already at or below the lowest level
  }

  /* ── Table 13 lookup — IEC clearance from peak voltage & PD ─── */
  function clrFromPeak(peakV, pd, col) {
    // peakV: in Volts (e.g. impulse Vpeak, TOV Vpeak, working Vpeak)
    // pd: pollution degree (default 2)
    // col: voltage column index — 0=impulse (default), 1=tov_peak, 2=wrk_peak_surr
    return lookupClr(peakV, pd || 2, 'iec', true, col);
  }

  /* ── Clearance calculation per IEC 62109-1 §7.3.7 / Table 14 ─── */
  function calcClearance(vrms, impKV, tovPeakV, isMains, insType, pd) {
    // Parameters:
    //   vrms     — working RMS voltage (V)
    //   impKV    — impulse withstand voltage from Table 12 (kV)
    //   tovPeakV — temporary overvoltage peak from Table 12 col 6 (V), null if N/A
    //   isMains  — true for AC mains circuits, false for DC/PV/internal
    //   insType  — 'func' | 'basic' | 'supp' | 'reinf'
    //   pd       — pollution degree 1-3

    var impPeak = impKV * 1000;            // kV → V
    var wrkPeak = vrms * Math.sqrt(2);     // working voltage peak

    if (insType === 'reinf') {
      /* ── REINFORCED INSULATION ───────────────────────────── */
      // IEC 60664-1 / IEC 62109-1: use the MOST STRINGENT of three criteria:
      //   (a) Table 13 with impulse voltage stepped up one level
      //   (b) 1.6 × working voltage peak → Table 13
      //   (c) 1.6 × TOV peak → Table 13 (mains circuits only)

      var impNext = nextImpulseLevel(impKV);          // step up one level (kV)
      var clrA    = clrFromPeak(impNext * 1000, pd);  // criterion (a): stepped-up impulse

      var clrB    = clrFromPeak(wrkPeak * 1.6, pd, 2);   // criterion (b): col 2 = wrk_peak_surr

      var reqClr;
      if (isMains && tovPeakV) {
        var clrC  = clrFromPeak(tovPeakV * 1.6, pd, 1);  // criterion (c): col 1 = tov_peak
        reqClr    = Math.max(clrA, clrB, clrC);       // most stringent of all three
      } else {
        reqClr    = Math.max(clrA, clrB);              // only (a) and (b) for non-mains
      }
      return reqClr;

    } else if (insType === 'func') {
      /* ── FUNCTIONAL INSULATION ───────────────────────────── */
      // OVC I: based on working voltage peak
      // OVC II-IV: based on impulse voltage
      // Since per-node OVC is not tracked, we use the more conservative approach:
      // for mains circuits → max(impulse, working peak) covers both cases

      var clrImp = clrFromPeak(impPeak, pd);
      if (isMains) {
        var wrkClr = clrFromPeak(wrkPeak, pd);
        return Math.max(clrImp, wrkClr);
      }
      return clrImp; // non-mains: impulse voltage

    } else {
      /* ── BASIC / SUPPLEMENTARY INSULATION ────────────────── */
      if (isMains) {
        // Mains circuits: most stringent of impulse, TOV peak, working voltage peak
        var cImp   = clrFromPeak(impPeak, pd);
        var cWk    = clrFromPeak(wrkPeak, pd);
        if (tovPeakV) {
          var cTov  = clrFromPeak(tovPeakV, pd);
          return Math.max(cImp, cWk, cTov);
        }
        return Math.max(cImp, cWk);
      } else {
        // Non-mains (PV/DC): most stringent of impulse or working voltage recurring peak
        var cI = clrFromPeak(impPeak, pd);
        var cW = clrFromPeak(wrkPeak, pd);
        return Math.max(cI, cW);
      }
    }
  }

  /* ── Per-node calculation (pure) ─────────────── */
  function calcNode(node, pd, mgGroup, alt, standard, impAC, impDC, sysVAC, sysVDC) {
    // node: { name, vrms, ins, pcb, coat, circ, toGnd, interp? }
    // interp: optional — true for secondary/control circuits (linear interpolation allowed)
    //         false/undefined for primary/power circuits (round up per §25.4g)
    // sysVAC: AC system voltage for TOV lookup (optional, V rms)
    // sysVDC: DC system voltage for UL clearance lookup (optional, V)
    var vrms = node.vrms || 0;
    var ins  = node.ins  || 'basic';
    var pcb  = !!node.pcb;
    var coat = node.coat || 0;
    var circ = node.circ || 'ac';
    var toGnd = !!node.toGnd;
    var useInterp = !!node.interp;  // P2#5: secondary circuit → linear interpolation

    // Determine impulse withstand voltage (kV) from Table 12
    var impKV = circ === 'dc' ? impDC : impAC;
    var isMains = (circ === 'ac');

    /* ── Within-circuit OVC reduction per IEC 62109-1 §7.3.7 ─── */
    // The OVC determined above applies to circuit-to-earth insulation.
    // For functional insulation WITHIN each circuit (line-to-line, DC+ to DC-),
    // the overvoltage category is reduced by one level → lower impulse voltage.
    if (!toGnd) {
      impKV = prevImpLevel(impKV);
    }

    /* ── IEC 62109-1 §7.3.7: Insulation type enforcement ─── */
    // Between live parts and accessible conductive parts (PE/enclosure):
    // reinforced insulation is MANDATORY — basic/functional alone is NOT compliant.
    var forcedReinforced = false;
    if (toGnd && ins !== 'reinf') {
      forcedReinforced = true;
    }

    // Effective insulation type for clearance calculation
    var effIns = (ins === 'reinf' || toGnd) ? 'reinf' : ins;

    /* ── Clearance distances ─────────────── */
    var reqClr;
    var interpUsed = false;  // true when linear interpolation was applied (UL secondary circuits)
    if (standard === 'iec') {
      // sysVAC: AC system voltage for TOV lookup (from calcSafety)
      var tovPeak = null;
      /* TOV only applies to circuit-to-earth insulation — within-circuit nodes skip it */
      if (isMains && sysVAC && toGnd) {
        var tovInfo = lookupTov(sysVAC);
        tovPeak = tovInfo ? tovInfo.peak : null;
      }

      reqClr = calcClearance(vrms, impKV, tovPeak, isMains, effIns, pd);
    } else {
      /* ── UL 840 clearance: based on system voltage (kVRMS) ─── */
      // Per UL 1741 §25.4g and UL 840 §6.3:
      // Clearance is determined by Phase-to-Ground Rated System Voltage,
      // NOT impulse withstand voltage. The CLR_TBL_UL table is indexed by kVRMS.
      var sysKV = circ === 'dc' ? (sysVDC || 600) : (sysVAC || 300);
      var sysKVRMS = sysKV / 1000; // V → kVRMS for UL table lookup

      /* ── P2#5: Primary vs secondary circuit interpolation ─── */
      // §25.4g: primary circuits round UP to next table entry (§25.4g "higher value")
      //          secondary/control circuits allow linear interpolation
      var clrInterp = useInterp;  // false for primary (round up), true for secondary

      if (effIns === 'reinf') {
        /* ── REINFORCED INSULATION (UL 840 §6.3) ───────────── */
        // Two equivalent approaches per UL 840:
        //   (1) Double the basic insulation distance, OR
        //   (2) Step up one row in the clearance table
        // We use approach (2): find next higher voltage row → more accurate.
        var basicClr = lookupClr(sysKVRMS * 1000, pd, standard, clrInterp);
        // Find the row used for basic, then step to the NEXT row:
        var reinfV = sysKVRMS;
        var foundBasic = false;
        for (var ri = 0; ri < CLR_TBL_UL.length; ri++) {
          if (!foundBasic && CLR_TBL_UL[ri][0] >= sysKVRMS) {
            foundBasic = true; // This is the basic row — skip to next
            continue;
          }
          if (foundBasic) { reinfV = CLR_TBL_UL[ri][0]; break; }
        }
        var reinfClr = lookupClr(reinfV * 1000, pd, standard, clrInterp);
        // Use the more conservative (larger) of both approaches:
        reqClr = Math.max(basicClr * 2, reinfClr);
      } else {
        // Basic/supplementary/functional insulation — direct lookup by system voltage
        reqClr = lookupClr(sysKVRMS * 1000, pd, standard, clrInterp);
      }

      /* ── Track if linear interpolation was actually used (UL only) ─── */
      if (clrInterp) {
        for (var _i = 0; _i < CLR_TBL_UL.length; _i++) {
          if (sysKVRMS === CLR_TBL_UL[_i][0]) break; // exact match → no interpolation
          if (_i > 0 && sysKVRMS > CLR_TBL_UL[_i - 1][0] && sysKVRMS < CLR_TBL_UL[_i][0]) {
            interpUsed = true; // between rows → interpolation applied
            break;
          }
        }
      }
    }

    var altk = (standard === 'ul') ? altFactorUL(alt) : altFactor(alt);
    reqClr = Math.round(reqClr * altk * 10) / 10;

    // Creepage calculation — reinforced doubles the basic creepage per IEC 60664-1 Table A.2
    var localPd = pd;
    if (coat === 1) localPd = Math.max(1, localPd - 1);
    var crpMult = (effIns === 'reinf') ? 2.0 : 1.0;
    var reqCrp = lookupCrp(vrms, localPd, mgGroup, standard, pcb ? 1 : 0);
    if (coat === 2) {
      // IEC 60664-3 Table 1: Type 2 potting provides solid insulation equivalent,
      // Tables 13/14 do not apply. Use minimum spacing directly without crpMult.
      reqCrp = Math.round(0.15 * 10) / 10;
    } else {
      reqCrp = Math.round(reqCrp * crpMult * 10) / 10;
    }

    /* ── P2#4: UL 1741 §25.3 — Field wiring terminals floor (Table 24.1) ─── */
    // Per §25.3: field wiring terminals MUST comply with Section 24 (Table 24.1),
    // not the UL 840 alternative approach. Only enforced when node.fieldTerminal is true.
    var tbl241Note = null;
    if (standard === 'ul' && node.fieldTerminal) {
      var t24 = lookupTable24_1(vrms);
      if (reqClr < t24.clearance) {
        reqClr = Math.round(t24.clearance * 10) / 10;
        tbl241Note = 'clr';
      }
      if (reqCrp < t24.creepage) {
        reqCrp = Math.round(t24.creepage * 10) / 10;
        tbl241Note = tbl241Note ? 'both' : 'crp';
      }
    }

    // UL 840 §9.6: Recurring peak voltage check for PCB creepage distances
    var recurringPeakOk = null;  // null = N/A, true = pass, false = exceed limit
    if (standard === 'ul' && pcb) {
      // Operating peak voltage: AC → vrms*√2, DC → vrms
      var opPeakV = circ === 'ac' ? Math.round(vrms * 1.414 * 10) / 10 : vrms;
      var maxPeakV = lookupRecurringPeakMax(reqCrp);
      recurringPeakOk = opPeakV <= maxPeakV;
    }

    return {
      name: node.name || "节点",
      vrms: vrms,
      ins: ins,
      insL: INS_LABELS[ins] || ins,
      effIns: effIns,
      pcb: pcb ? 1 : 0,
      coat: coat,
      toGnd: toGnd,
      circ: circ,
      forcedReinforced: forcedReinforced,
      reqClr: reqClr,
      reqCrp: reqCrp,
      recurringPeakOk: recurringPeakOk,   // UL §9.6 PCB check: null=NA, true=pass, false=exceeds
      tbl241Note: tbl241Note,            // UL §25.3 Table 24.1 floor: null/clr/crp/both
      interpUsed: interpUsed              // true when linear interpolation was applied
    };
  }

  /* ── Full safety assessment (pure) ───────────── */
  function calcSafety(params) {
    if (!params) return null;
    var pd       = params.pd || 2;
    var mgGroup  = params.mgGroup || 'ii';
    var alt      = params.alt || 2000;
    var standard = params.standard || 'iec';
    var sysVAC   = params.sysVAC || 300;
    var sysVDC   = params.sysVDC || 600;
    var nodes    = params.nodes || [];

    // Impulse withstand voltage (kV) — accept from caller or compute via lookupImpulse as fallback
    var impAC = typeof params.impAC === 'number' ? params.impAC : lookupImpulse(sysVAC, params.ovcClass||2, true);

    /* DC impulse: per IEC 62109-1 §7.3.7.1.2b — PV circuits have
       minimum 2.5kV regardless of system voltage. Use Table 12 lookup
       with OVC II as baseline, then enforce the 2.5kV floor. */
    var impDC;
    if (typeof params.impDC === 'number') {
      impDC = params.impDC;
    } else {
      // Table 12 lookup for DC system voltage at OVC II + minimum clamp
      impDC = Math.max(lookupImpulse(sysVDC, 2, true), 2.5);
    }

    if (!nodes.length) return null;

    var altk = (standard === 'ul') ? altFactorUL(alt) : altFactor(alt);

    var results = nodes.map(function (node) {
      return calcNode(node, pd, mgGroup, alt, standard, impAC, impDC, sysVAC, sysVDC);
    });

    return {
      results: results,
      pd: pd, mgGroup: mgGroup, alt: alt, altk: altk,
      standard: standard,
      sysVAC: sysVAC, sysVDC: sysVDC, impAC: impAC, impDC: impDC
    };
  }

  /* ── Expose (internal lookup tables are private) ─── */
  global.SafetyModel = {
    ALT_K: ALT_K,          // Used by UI for altitude display (backward compat)
    altFactor: altFactor,   // Altitude correction with interpolation (IEC)
    altFactorUL: altFactorUL, // UL 840 altitude correction (exponential)
    INS_K: INS_K,          // Used by UI report generation
    INS_LABELS: INS_LABELS, // Insulation type labels
    lookupImpulse: lookupImpulse,
    lookupTov: lookupTov,
    lookupClr: lookupClr,
    lookupCrp: lookupCrp,
    lookupRecurringPeakMax: lookupRecurringPeakMax, // UL 840 Table 9.3 PCB recurring peak check
    lookupTable24_1: lookupTable24_1,               // UL 1741 §25.3 field wiring terminal baselines
    nextImpulseLevel: nextImpulseLevel,
    prevImpLevel: prevImpLevel,
    clrFromPeak: clrFromPeak,
    calcClearance: calcClearance,
    calcNode: calcNode,
    calcSafety: calcSafety
  };

})(window);
