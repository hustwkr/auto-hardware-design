/* ================================================================
   OpampAnalysis — 运放稳定性 / 噪声 / 失调分析（纯计算模型，无 DOM）
   ----------------------------------------------------------------
   拓扑事实（均经全频段数值验证，见 STATE_OPAMP_HANDOFF.md）：

   MFB2 二阶低通（节点 A = R1 右端；A—R3→x(OP−)；A—C2→GND；A—R2→o；
   x—C1→o；OP+ → GND）:
     H(s) = -(R2/R1) / [1 + s·C1(R2+R3+R2R3/R1) + s²·C1C2R2R3]  （全极点，与 filter-model.js 一致）

   diff1 一阶低通（Vin+—R1→P(OP+)；P—R3→GND；C3 悬空忽略；
   Vin−—R2→x(OP−)；x—(R4∥C4)→o）:
     H(s) = (R4/R2)/(1+s·R4C4)，平衡设计 R1=R2, R3=R4 下成立

   有限开环增益模型（单极点）: A(f) = Aol / (1 + j·f/fp), fp = GBW/Aol
   环路增益 L(f) = A(f)·β(f)，β 用 opamp-removal 法：移除运放、驱动 v_o=1、
   输入置零，解被动网络得 β=v_x/v_o；PM = 180° + arg(L) @ |L|=1。

   MFB2 KCL（未知数 [vA, vx, vo]，电流离开节点为正）:
     KCL_A: vA(G1+G2+G3+jwC2) − G3·vx − G2·vo = vin·G1
     KCL_x: −G3·vA + (G3+jwC1)·vx − jwC1·vo = Ix_inj
     OP   : A·vx + vo = A·e_i          （MFB2 的 (+) 端接地，e_i 串联注入）
   diff1 KCL（未知数 [vP, vx, vo]）:
     KCL_P: (G1+G3)·vP = vinp·G1 + IP_inj
     KCL_x: (G2+Yf)·vx − Yf·vo = vinm·G2 + Ix_inj ,  Yf = G4+jwC4
     OP   : −A·vP + A·vx + vo = A·e_i    （e_i 串联注入 (+) 端）

   注: MFB2 的 Ib(+) 流入接地端，无输出贡献（只有 Ix_inj=Ib(−) 项）。
================================================================ */
(function (global) {
  "use strict";

  /* ---------------- 复数工具 [re, im] ---------------- */
  function C(re, im) { return [re || 0, im || 0]; }
  function cadd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function csub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function cmul(a, b) { return [a[0]*b[0] - a[1]*b[1], a[0]*b[1] + a[1]*b[0]]; }
  function cdiv(a, b) {
    var d = b[0]*b[0] + b[1]*b[1];
    if (d < 1e-300) return [NaN, NaN];
    return [(a[0]*b[0] + a[1]*b[1]) / d, (a[1]*b[0] - a[0]*b[1]) / d];
  }
  function cmag(a) { return Math.hypot(a[0], a[1]); }

  /* 3×3 复数高斯-若尔当消元（部分选主元）。M/b 元素均为 [re,im]。奇异返回 null */
  function solve3x(M, b) {
    var n = 3;
    var A = [];
    for (var i = 0; i < n; i++) {
      A.push([C(M[i][0][0], M[i][0][1]), C(M[i][1][0], M[i][1][1]), C(M[i][2][0], M[i][2][1]), C(b[i][0], b[i][1])]);
    }
    for (var col = 0; col < n; col++) {
      var piv = col;
      for (var r = col + 1; r < n; r++) if (cmag(A[r][col]) > cmag(A[piv][col])) piv = r;
      if (cmag(A[piv][col]) < 1e-30) return null;
      var tmp = A[col]; A[col] = A[piv]; A[piv] = tmp;
      for (var r2 = 0; r2 < n; r2++) {
        if (r2 === col) continue;
        var f = cdiv(A[r2][col], A[col][col]);
        for (var k = col; k <= n; k++) A[r2][k] = csub(A[r2][k], cmul(f, A[col][k]));
      }
    }
    return [cdiv(A[0][3], A[0][0]), cdiv(A[1][3], A[1][1]), cdiv(A[2][3], A[2][2])];
  }

  /* ---------------- 运放库 ----------------
     TP6004 / TP555x: 本地 datasheet 实值（references/datasheets/*.pdf, 3PEAK） */
  var OPAMPS = [
    { id: "tp6004", name: "TP6004", zh: "TP6004 · 1MHz CMOS RRIO 低功耗（datasheet）",
      gbw_hz: 1e6, aol_db: 110,          /* Av typ 110dB (min 85) */
      enW_nv: 27,                        /* eN @1kHz */
      en_corner_hz: 400,                 /* 由 EN=8µVpp@0.1–10Hz 反推的估计值（非手册直读） */
      in_pa: 0.002,                      /* iN = 2 fA/√Hz @1kHz */
      ib_a: 1e-12,                       /* IB typ 1pA@25°C (max 25pA@85°C) */
      eio_uv_max: 3000,                  /* VOS max ±3mV (typ 0.5mV, TC≈2µV/°C) */
      ro_ohm: 50,                        /* 有效输出电阻 ≈ VS/Isc = 5V/100mA（datasheet ISC@VS=5V）；估算值，用于 R_o–C_L 负载极点 */
      chopper: false },
    { id: "tp555x", name: "TP555x", zh: "TP555x · 3.5MHz 零漂移斩波 RRIO（datasheet）",
      gbw_hz: 3.5e6, aol_db: 120,        /* AVO typ 120dB (min 100) */
      enW_nv: 15,                        /* VN @1kHz; 手册: no 1/f below 0.1Hz */
      en_corner_hz: 0.1,
      in_pa: 0.0,                        /* 手册: input current noise negligible */
      ib_a: 50e-12,                      /* IB max ±50pA@27°C (±200pA 全温) */
      eio_uv_max: 5,                     /* VOS max ±5µV@27°C (typ ±1; ±10µV 全温) */
      ro_ohm: 100,                       /* 有效输出电阻 ≈ VS/Isc = 5V/±50mA（datasheet ISC@VS=5V）；估算值，用于 R_o–C_L 负载极点 */
      chopper: true, chop_hz: 125e3 }    /* 斩波频率 125kHz */
  ];

  function opampById(id) {
    for (var i = 0; i < OPAMPS.length; i++) if (OPAMPS[i].id === id) return OPAMPS[i];
    return null;
  }

  /* 单极点开环增益 A(f)，f 单位 Hz */
  function aolAt(op, f) {
    var Aol = Math.pow(10, op.aol_db / 20);
    var fp = op.gbw_hz / Aol;             /* 主极点频率: GBW ≈ Aol·fp */
    var x = f / fp;
    return C(Aol / (1 + x * x), -Aol * x / (1 + x * x));
  }

  /* ---------------- MFB2 求解器 ----------------
     comp = {R1,R2,R3,C1,C2}（C 单位 F）。返回 [vA,vx,vo] 或 null。
     KCL: vA(G1+G2+G3+jwC2) − G3·vx − G2·vo = vin·G1
          −G3·vA + (G3+jwC1)·vx − jwC1·vo = Ix_inj
     load={ro,cl}（cl>0 时启用有限输出电阻+负载电容：Vsrc=A(e_i−vx) 经 R_o 驱动 C_L∥反馈网络）：
          KCL@vo: (vo−A(e_i−vx))/R_o + jwC_L·vo + G2(vo−vA) + jwC1(vo−vx) = 0
        → −G2·vA + (A/R_o − jwC1)·vx + (1/R_o+jwC_L+G2+jwC1)·vo = A·e_i/R_o
     否则理想源 OP 行: A·vx + vo = A·e_i */
  function mfb2Solve(w, comp, A, vin, ixInj, ei, load) {
    var g1 = 1 / comp.R1, g2 = 1 / comp.R2, g3 = 1 / comp.R3;
    var opRow, bOp;
    if (load && load.cl > 0) {
      var ro = load.ro;
      opRow = [[-g2, 0], [A[0] / ro, A[1] / ro - w * comp.C1], [1 / ro + g2, w * load.cl + w * comp.C1]];
      bOp = [A[0] * ei / ro, A[1] * ei / ro];
    } else {
      opRow = [[0, 0], A, [1, 0]];   /* OP: A·vx + vo = A·e_i */
      bOp = cmul(A, C(ei));
    }
    var M = [
      [[g1 + g2 + g3, w * comp.C2], [-g3, 0], [-g2, 0]],   /* KCL_A */
      [[-g3, 0], [g3, w * comp.C1], [0, -w * comp.C1]],    /* KCL_x */
      opRow
    ];
    var b = [[vin * g1, 0], [ixInj, 0], bOp];
    return solve3x(M, b);
  }

  /* β(opamp-removal)：移除运放、vo=1 驱动 → β=vx。w 单位 rad/s */
  function mfb2BetaRemoval(w, comp) {
    var g1 = 1 / comp.R1, g2 = 1 / comp.R2, g3 = 1 / comp.R3;
    var M = [
      [[g1 + g2 + g3, w * comp.C2], [-g3, 0], [-g2, 0]],
      [[-g3, 0], [g3, w * comp.C1], [0, -w * comp.C1]],
      [[0, 0], [0, 0], [1, 0]]                              /* vo = 1 */
    ];
    var b = [[0, 0], [0, 0], [1, 0]];
    return solve3x(M, b)[1];
  }

  /* ---------------- diff1 求解器 ----------------
     comp = {R1,R2,R3,R4,C4}（C3 悬空忽略）。返回 [vP,vx,vo] 或 null。
     KCL: (G1+G3)·vP = vinp·G1 + Ip_inj ; (G2+Yf)·vx − Yf·vo = vinm·G2 + Ix_inj , Yf=G4+jwC4
     load={ro,cl}（cl>0 时启用有限输出电阻+负载电容：Vsrc=A(e_i+vP−vx) 经 R_o 驱动 C_L∥Yf）：
          KCL@vo: (vo−A(e_i+vP−vx))/R_o + jwC_L·vo + Yf(vo−vx) = 0
        → −(A/R_o)·vP + (A/R_o−Yf)·vx + (1/R_o+jwC_L+Yf)·vo = A·e_i/R_o
      （R_o→0 时严格退化为无载 OP 行；自测 T6c/T6d 验证）
     否则理想源 OP 行: −A·vP + A·vx + vo = A·e_i */
  function diff1Solve(w, comp, A, vinp, vinm, ipInj, ixInj, ei, load) {
    var g1 = 1 / comp.R1, g2 = 1 / comp.R2, g3 = 1 / comp.R3;
    var Yf = [1 / comp.R4, w * comp.C4];                    /* G4 + jwC4 */
    var opRow, bOp;
    if (load && load.cl > 0) {
      var ro = load.ro;
      opRow = [[-A[0] / ro, -A[1] / ro], [A[0] / ro - Yf[0], A[1] / ro - Yf[1]], [1 / ro + Yf[0], w * load.cl + Yf[1]]];
      bOp = [A[0] * ei / ro, A[1] * ei / ro];
    } else {
      opRow = [[-A[0], -A[1]], [A[0], A[1]], [1, 0]];       /* OP: −A·vP + A·vx + vo = A·e_i */
      bOp = cmul(A, C(ei));
    }
    var M = [
      [[g1 + g3, 0], [0, 0], [0, 0]],                       /* KCL_P */
      [[0, 0], [g2 + Yf[0], Yf[1]], [-Yf[0], -Yf[1]]],      /* KCL_x */
      opRow
    ];
    var b = [[vinp * g1 + ipInj, 0], [vinm * g2 + ixInj, 0], bOp];
    return solve3x(M, b);
  }

  function diff1BetaRemoval(w, comp) {
    var g1 = 1 / comp.R1, g2 = 1 / comp.R2, g3 = 1 / comp.R3;
    var Yf = [1 / comp.R4, w * comp.C4];
    var M = [
      [[g1 + g3, 0], [0, 0], [0, 0]],
      [[0, 0], [g2 + Yf[0], Yf[1]], [-Yf[0], -Yf[1]]],
      [[0, 0], [0, 0], [1, 0]]                              /* vo = 1 */
    ];
    var b = [[0, 0], [0, 0], [1, 0]];
    return solve3x(M, b)[1];                                /* β = vx = Yf/(G2+Yf) */
  }

  /* ---------------- 输出负载分压器 D_load(f) ----------------
     vo/Vsrc = Z_l/(Z_l+R_o) = 1/(1 + R_o·(Y_dp + jwC_L))，其中 Y_dp 为反馈网络在 vo 节点
     （vin=0）的驱动点导纳。带载环路增益 L_loaded(f) = A(f)·β_ideal(f)·D_load(f)，
     在本线性模型内精确（自测 T-load 验证）。 */
  function mfb2YdpAt(w, comp) {
    var g1 = 1 / comp.R1, g2 = 1 / comp.R2, g3 = 1 / comp.R3;
    /* KCL_A/KCL_x（vin=0）: [[a,b],[c,d]]·[vA,vx]ᵀ = [G2, jwC1]·vo，克莱姆法则 */
    var a = [g1 + g2 + g3, w * comp.C2], b = [-g3, 0], c = [-g3, 0], d = [g3, w * comp.C1];
    var det = csub(cmul(a, d), cmul(b, c));
    var e = [g2, 0], f = [0, w * comp.C1];
    var vAvo = cdiv(csub(cmul(e, d), cmul(b, f)), det);     /* vA/vo */
    var vxvo = cdiv(csub(cmul(a, f), cmul(e, c)), det);     /* vx/vo */
    return cadd(cmul([g2, 0], csub(C(1), vAvo)), cmul(f, csub(C(1), vxvo)));
  }

  function diff1YdpAt(w, comp) {
    var g2 = [1 / comp.R2, 0];
    var Yf = [1 / comp.R4, w * comp.C4];
    return cdiv(cmul(g2, Yf), cadd(g2, Yf));                /* G2·Yf/(G2+Yf)（vP 节点与 vo 隔离） */
  }

  function dloadAt(kind, w, comp, ro, cl) {
    var ydp = kind === "mfb2" ? mfb2YdpAt(w, comp) : diff1YdpAt(w, comp);
    /* D = Zl/(Zl+Ro)，Zl=1/Y_total ⇒ D = 1/(1 + Ro·(Ydp + jwC_L)) */
    return cdiv(C(1), cadd(C(1), cmul([ro, 0], cadd(ydp, [0, w * cl]))));
  }

  /* ---------------- PM / 穿越频率 ----------------
     log 网格找 |L|=1（|L| 从 DC 的高值单调下降，取最后一次 >0→≤0 穿越），二分细化。
     返回 {crossoverHz, pmDeg}；无穿越返回 null */
  function findPM(betaFn, op) {
    var fLo = 0.5;
    var fHi = Math.max(1e8, op.gbw_hz * 20);
    var N = 400;
    var prevF = fLo;
    var prevG = Math.log(cmag(cmul(aolAt(op, fLo), betaFn(fLo))) + 1e-300);
    for (var i = 1; i <= N; i++) {
      var f = fLo * Math.pow(fHi / fLo, i / N);
      var g = Math.log(cmag(cmul(aolAt(op, f), betaFn(f))) + 1e-300);
      if (prevG > 0 && g <= 0) return bisectCross(betaFn, op, prevF, f);
      prevF = f; prevG = g;
    }
    return null;
  }
  function bisectCross(betaFn, op, lo, hi) {
    for (var it = 0; it < 60; it++) {
      var fm = Math.sqrt(lo * hi);
      var gm = Math.log(cmag(cmul(aolAt(op, fm), betaFn(fm))) + 1e-300);
      if (gm > 0) lo = fm; else hi = fm;
    }
    var amid = Math.sqrt(lo * hi);
    var L = cmul(aolAt(op, amid), betaFn(amid));
    return { crossoverHz: amid, pmDeg: 180 + Math.atan2(L[1], L[0]) * 180 / Math.PI };
  }

  /* ---------------- 噪声 ---------------- */
  function enDensity(op, f) {              /* nV/√Hz，白噪 + 单极点闪烁 */
    var fc = op.en_corner_hz || 0;
    if (fc <= 0) return op.enW_nv;
    return op.enW_nv * Math.sqrt(1 + fc / Math.max(f, 1e-4));
  }

  /* ∫ dens²df（0.1Hz→1e7Hz log 网格梯形）→ rms (V) */
  function integrateNoise(dens2At) {
    var fLo = 0.1, fHi = 1e7, N = 600;
    var sum = 0, pf = fLo, py = dens2At(fLo);
    for (var i = 1; i <= N; i++) {
      var f = fLo * Math.pow(fHi / fLo, i / N);
      var y = dens2At(f);
      sum += 0.5 * (py + y) * (f - pf);
      pf = f; py = y;
    }
    return Math.sqrt(Math.max(sum, 0));
  }

  /* ---------------- 公共分析驱动 ---------------- */
  function analyzeCore(kind, comp, op, opts) {
    var TAU = 2 * Math.PI;
    opts = opts || {};
    var fcHz = opts.fc_hz || 0;
    var fLoDC = 0.01;                      /* “直流”分析频率（电容近似开路） */

    /* 输出负载电容 C_L（pF→F）。cl>0 时全部 KCL 解与环路增益都计入 R_o–C_L 负载极点。
       理想电压源下 C_L 对环路无影响，其作用完全经有限 R_o 进入模型。 */
    var clF = (opts.cl_pf > 0) ? opts.cl_pf * 1e-12 : 0;
    var load = (clF > 0 && op.ro_ohm > 0) ? { ro: op.ro_ohm, cl: clF } : null;

    function betaFn(f) { return kind === "mfb2" ? mfb2BetaRemoval(TAU * f, comp) : diff1BetaRemoval(TAU * f, comp); }
    /* 带载环路函数：findPM 内部乘 A(f)，故传入 β·D_load 即得 L_loaded = A·β·D_load */
    function betaLoopFn(f) {
      if (!load) return betaFn(f);
      return cmul(betaFn(f), dloadAt(kind, TAU * f, comp, load.ro, load.cl));
    }
    function solveAll(f) {
      var w = TAU * f;
      if (kind === "mfb2") {
        var A1 = aolAt(op, f);
        var rSig = mfb2Solve(w, comp, A1, 1, 0, 0, load);    /* H_sig */
        var rE = mfb2Solve(w, comp, A1, 0, 0, 1, load);      /* H_e (e_i=1) */
        var rIm = mfb2Solve(w, comp, A1, 0, 1, 0, load);     /* H_i− */
        return { sig: rSig[2], he: rE[2], him: rIm[2] };
      }
      var A2 = aolAt(op, f);
      var rSigP = diff1Solve(w, comp, A2, 1, 0, 0, 0, 0, load);   /* 单端 Vin+ */
      var rE = diff1Solve(w, comp, A2, 0, 0, 0, 0, 1, load);      /* H_e */
      var rIp = diff1Solve(w, comp, A2, 0, 0, 1, 0, 0, load);     /* H_i+ */
      var rIm = diff1Solve(w, comp, A2, 0, 0, 0, 1, 0, load);     /* H_i− */
      return { sig: rSigP[2], he: rE[2], hip: rIp[2], him: rIm[2] };
    }

    /* --- PM / 穿越（带载时用 β·D_load）--- */
    var pmRes = findPM(betaLoopFn, op);
    var stability;
    if (!pmRes) stability = "noCrossing";
    else if (pmRes.pmDeg >= 45) stability = "ok";
    else if (pmRes.pmDeg >= 30) stability = "marginal";
    else stability = "unstable";

    /* --- 环路增益 @ fc: L(fc)=|A(fc)·β(fc)| —— 有限开环精度指标。
       主极点补偿运放中 PM≈90°+∠β(fx) 恒 ≥90°（单极点模型下不产生振荡），
       真正区分好坏的是 L(fc)：越小，闭环响应偏离理想滤波器形状越多（偏差 ~1/L）。
       <25dB(3.2×) 视为不足。 */
    var loopGainFc_dB = null;
    if (fcHz > 0) {
      var Lfc = cmag(cmul(aolAt(op, fcHz), betaLoopFn(fcHz)));   /* 带载时含 D_load */
      loopGainFc_dB = 20 * Math.log10(Lfc + 1e-300);
    }

    /* --- NG(0) / 失调（低频解） --- */
    var dc = solveAll(fLoDC);
    var ngLin = cmag(dc.he), ngDb = 20 * Math.log10(ngLin + 1e-300);

    var eioTerm_V = ngLin * op.eio_uv_max * 1e-6;            /* NG·EIO */
    var ibCur = Math.pow(cmag(dc.him) * op.ib_a, 2);         /* (|H_i−|·Ib)² */
    if (kind === "diff1") ibCur += Math.pow(cmag(dc.hip) * op.ib_a, 2);
    var ibTerm_V = Math.sqrt(ibCur);                         /* MFB2: Ib(+) 入地无贡献 */
    var offsetWorst_V = eioTerm_V + ibTerm_V;

    /* --- 输出噪声密度²(f) = |H_e|²en² + (|H_i−|·in)² (+diff1 (|H_i+|·in)²) --- */
    function dens2At(f) {
      var r = solveAll(f);
      var enV = enDensity(op, f) * 1e-9;                     /* V/√Hz */
      var inA = op.in_pa * 1e-12;                            /* A/√Hz */
      var v = cmag(r.he) * enV;
      var c = Math.pow(cmag(r.him) * inA, 2);
      if (kind === "diff1") c += Math.pow(cmag(r.hip) * inA, 2);
      return v * v + c;
    }
    var noiseRms_V = integrateNoise(dens2At);
    var dens1k = dens2At(1000);

    /* --- warnings --- */
    var warnings = [];
    if (stability === "marginal" || stability === "unstable") warnings.push("w.pmLow");
    if (loopGainFc_dB !== null && loopGainFc_dB < 25) warnings.push("w.gbWLow");
    if (ngDb > 20) warnings.push("w.ngHigh");
    if (!op.chopper && op.en_corner_hz > fcHz / 10) warnings.push("w.flickerChopper");
    if (ibTerm_V >= 0.3 * eioTerm_V && ibTerm_V > 0) warnings.push("w.ibOffset");
    if (op.chop_hz && fcHz > 0 && fcHz * 4 >= op.chop_hz) warnings.push("w.chopNear");

    /* --- 元件容差角点分析（opts.tol = 相对容差，如 E24→0.05 / E12→0.10）---
       电阻按 ±tol 全角点枚举（2ⁿ，n=3~4；比值型指标极值出现在混合符号角点）。
       只报告直流增益范围 G=R₂/R₁（mfb2）或 R₄/R₂（diff1），闭式精确。
       失调取跨角点保守最坏值：max(NG_c)·EIO_max + max(IbTerm_c)。 */
    var tolRes = null;
    if (opts.tol > 0) {
      function idealGain(c) { return kind === "mfb2" ? c.R2 / c.R1 : c.R4 / c.R2; }
      var rKeys = kind === "mfb2" ? ["R1", "R2", "R3"] : ["R1", "R2", "R3", "R4"];
      /* 全角点枚举（2ⁿ，n=3~4）：比值型指标（G=R₂/R₁、NG）的极值出现在混合符号角点 */
      var corners = [];
      (function () {
        var n = rKeys.length;
        for (var mask = 0; mask < (1 << n); mask++) {
          var c = {};
          for (var k in comp) c[k] = comp[k];
          for (var i = 0; i < n; i++) c[rKeys[i]] *= (mask & (1 << i)) ? (1 + opts.tol) : (1 - opts.tol);
          corners.push(c);
        }
      })();

      var gMin = Infinity, gMax = -Infinity, ngMaxLin = 0;
      for (var ci = 0; ci < corners.length; ci++) {
        var cc = corners[ci];
        var mG = idealGain(cc);
        if (mG < gMin) gMin = mG; if (mG > gMax) gMax = mG;
        var ngC = kind === "mfb2" ? 1 + cc.R2 / cc.R1 : 1 + cc.R4 / cc.R2;   // NG(0) 闭式（已验证）
        if (ngC > ngMaxLin) ngMaxLin = ngC;
      }

      /* 角点失调项：|H_e|(0)=NG_c（闭式），Ib 项用 DC KCL 解 */
      var ibMax_V = 0;
      for (var cj = 0; cj < corners.length; cj++) {
        var ccj = corners[cj], wdc = TAU * fLoDC, A1c = aolAt(op, fLoDC);
        if (kind === "mfb2") {
          var rImC = mfb2Solve(wdc, ccj, A1c, 0, 1, 0, load);
          ibMax_V = Math.max(ibMax_V, cmag(rImC[2]) * op.ib_a);
        } else {
          var rIpC = diff1Solve(wdc, ccj, A1c, 0, 0, 1, 0, 0, load), rImD = diff1Solve(wdc, ccj, A1c, 0, 0, 0, 1, 0, load);
          ibMax_V = Math.max(ibMax_V, Math.hypot(cmag(rIpC[2]) * op.ib_a, cmag(rImD[2]) * op.ib_a));
        }
      }
      var eioCorner_V = ngMaxLin * op.eio_uv_max * 1e-6;

      /* 容差开启时，失调报告值升级为跨角点保守最坏 */
      if (eioCorner_V > eioTerm_V) eioTerm_V = eioCorner_V;
      if (ibMax_V > ibTerm_V) ibTerm_V = ibMax_V;
      offsetWorst_V = eioTerm_V + ibTerm_V;

      tolRes = { pct: opts.tol * 100, gain: [gMin, gMax] };
    }

    return {
      kind: kind,
      opId: op.id,
      ngDC: { lin: ngLin, dB: ngDb },
      crossoverHz: pmRes ? pmRes.crossoverHz : null,
      pmDeg: pmRes ? pmRes.pmDeg : null,
      stability: stability,
      loopGainAtFc_dB: loopGainFc_dB,
      noiseDensity1k_nVrtHz: Math.sqrt(dens1k) * 1e9,
      noiseRms_uV: noiseRms_V * 1e6,
      offsetWorst_mV: offsetWorst_V * 1000,
      eioTerm_mV: eioTerm_V * 1000,
      ibTerm_mV: ibTerm_V * 1000,
      warnings: warnings,
      chopper: !!op.chopper,
      tolerance: tolRes
    };
  }

  /* ---------------- 对外 API ---------------- */
  function analyzeMfb2(comp, op, opts) { return analyzeCore("mfb2", comp, op, opts); }
  function analyzeDiff1(comp, op, opts) { return analyzeCore("diff1", comp, op, opts); }

  /* 调试/自测辅助（有限 A 传递函数） */
  function mfb2TransferAt(f, comp, op) {
    var r = mfb2Solve(2 * Math.PI * f, comp, aolAt(op, f), 1, 0, 0);
    return r ? r[2] : null;
  }
  function diff1TransferAt(f, comp, op, drive) {   /* drive: "plus"|"minus" */
    var w = 2 * Math.PI * f, A = aolAt(op, f);
    var r = (drive === "minus") ? diff1Solve(w, comp, A, 0, 1, 0, 0, 0) : diff1Solve(w, comp, A, 1, 0, 0, 0, 0);
    return r ? r[2] : null;
  }
  function mfb2BetaAt(f, comp) { return mfb2BetaRemoval(2 * Math.PI * f, comp); }
  function diff1BetaAt(f, comp) { return diff1BetaRemoval(2 * Math.PI * f, comp); }
  /* 测试用：H_e（e_i=1，无载/带载）与带载 H_sig */
  function mfb2HeAt(f, comp, op) {
    var r = mfb2Solve(2 * Math.PI * f, comp, aolAt(op, f), 0, 0, 1);
    return r ? r[2] : null;
  }
  function mfb2TransferLoadedAt(f, comp, op, load) {
    var r = mfb2Solve(2 * Math.PI * f, comp, aolAt(op, f), 1, 0, 0, load);
    return r ? r[2] : null;
  }
  function mfb2HeLoadedAt(f, comp, op, load) {
    var r = mfb2Solve(2 * Math.PI * f, comp, aolAt(op, f), 0, 0, 1, load);
    return r ? r[2] : null;
  }
  function diff1TransferLoadedAt(f, comp, op, drive, load) {   /* drive: "plus"|"minus" */
    var w = 2 * Math.PI * f, A = aolAt(op, f);
    var r = (drive === "minus") ? diff1Solve(w, comp, A, 0, 1, 0, 0, 0, load) : diff1Solve(w, comp, A, 1, 0, 0, 0, 0, load);
    return r ? r[2] : null;
  }

  /* 测试/报告用：频率 f (Hz) 处的传递函数 H_e=vo/e_i、H_i±=vo/i_inj（可选带载） */
  function transfersAt(kind, f, comp, op, load) {
    var w = 2 * Math.PI * f;
    if (kind === "mfb2") {
      var A1 = aolAt(op, f);
      return { he: mfb2Solve(w, comp, A1, 0, 0, 1, load)[2], him: mfb2Solve(w, comp, A1, 0, 1, 0, load)[2] };
    }
    var A2 = aolAt(op, f);
    return { he: diff1Solve(w, comp, A2, 0, 0, 0, 0, 1, load)[2], hip: diff1Solve(w, comp, A2, 0, 0, 1, 0, 0, load)[2], him: diff1Solve(w, comp, A2, 0, 0, 0, 1, 0, load)[2] };
  }

  global.OpampAnalysis = {
    OPAMPS: OPAMPS,
    opampById: opampById,
    analyzeMfb2: analyzeMfb2,
    analyzeDiff1: analyzeDiff1,
    _debug: { mfb2TransferAt: mfb2TransferAt, diff1TransferAt: diff1TransferAt, aolAt: aolAt, mfb2BetaAt: mfb2BetaAt, diff1BetaAt: diff1BetaAt, dloadAt: dloadAt, mfb2YdpAt: mfb2YdpAt, diff1YdpAt: diff1YdpAt, mfb2TransferLoadedAt: mfb2TransferLoadedAt, mfb2HeAt: mfb2HeAt, mfb2HeLoadedAt: mfb2HeLoadedAt, diff1TransferLoadedAt: diff1TransferLoadedAt, transfersAt: transfersAt }
  };
})(typeof window !== "undefined" ? window : globalThis);
