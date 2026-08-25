/* ===== Unit Tests for Calculation Models ===== */
/* Run: node tests/models.test.js                        */
/* Pure Node.js - zero dependencies (assert + fs only)   */

var assert = require("assert");
var fs     = require("fs");
var path   = require("path");

var passed = 0;
var failed = 0;
var total  = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    process.stderr.write("  PASS " + name + "\n");
  } catch (e) {
    failed++;
    process.stderr.write("  FAIL " + name + ": " + e.message + "\n");
  }
}

function approx(a, b, delta, msg) {
  assert.ok(Math.abs(a - b) < delta, msg || ("Expected ~" + b + " got " + a));
}

/* --- Load models into a fake global (browser -> node) -- */
function loadModel(filePath, fakeGlobal) {
  var src = fs.readFileSync(filePath, "utf-8");
  // Replace })(window) with })(__model__) to inject our fake global
  src = src.replace(/\}\)\(window\)/, "})(__model__)");
  // Use Function constructor instead of eval() — safer and more explicit
  var fn = new Function("__model__", src);
  fn(fakeGlobal);
}

var G = {};
loadModel(path.join(__dirname, "../js/models/capacitor-model.js"), G);
loadModel(path.join(__dirname, "../js/models/safety-model.js"), G);

var CM = G.CapacitorModel;
var SM = G.SafetyModel;

/* ================================================== */
/* Capacitor Model Tests                              */
/* ================================================== */

process.stderr.write("\n--- CapacitorModel ---\n");

test("fv formats numbers correctly", function () {
  assert.strictEqual(CM.fv(123.456, 2), "123.46");
  assert.strictEqual(CM.fv(null, 2), "-");
  assert.strictEqual(CM.fv(Infinity, 2), "-");
});

test("kvf voltage correction - at rated = 1", function () {
  approx(CM.kvf(50, 50), 1, 0.001);
});

test("kvf voltage correction - below rated increases life (Nichicon exponential)", function () {
  assert.ok(CM.kvf(25, 50) > 1, "KV should be > 1 at half voltage");
  // Nichicon model: Kv = exp[a * ((Vr/Vop)^b - 1)] with a=0.56, b=1.0
  // At Vop=25, Vr=50: ratio=2, Kv = exp[0.56*(2-1)] = exp(0.56) ≈ 1.75
  approx(CM.kvf(25, 50), 1.75, 0.05);
});

test("kvf above rated = 1", function () {
  approx(CM.kvf(60, 50), 1, 0.001);
});

test("tau configurable - tau=8 gives longer life than tau=10 at moderate temps", function () {
  var r10 = CM.calcLifetime({l0:5000,tmax:105,tau:10,vrated:450,irated:2000,dt0:10,cooling:1.0,wd:365,wt:10,scenario:"industrial",segments:[{dur:24,ta:70,vop:400,rips:[{freq:120,current:800}]}]});
  var r8  = CM.calcLifetime({l0:5000,tmax:105,tau:8,vrated:450,irated:2000,dt0:10,cooling:1.0,wd:365,wt:10,scenario:"industrial",segments:[{dur:24,ta:70,vop:400,rips:[{freq:120,current:800}]}]});
  assert.ok(r8.ly > r10.ly, "tau=8 should give longer life (Arrhenius more sensitive to cooling)");
});

test("calcDeltaT - single frequency ripple", function () {
  var segs = [{rips: [{freq: 120, current: 500}]}];
  var dt   = CM.calcDeltaT(segs, 500, 10, 1);
  approx(dt[0].dt, 10, 0.1);
});

test("calcDeltaT - multi-frequency ripple superposition", function () {
  var segs = [{rips: [
    {freq: 120, current: 354},
    {freq: 1000, current: 354}
  ]}];
  var dt = CM.calcDeltaT(segs, 500, 10, 1);
  assert.ok(dt[0].dt > 7 && dt[0].dt < 9, "Should be ~8C, got " + dt[0].dt);
});

test("calcDeltaT - frequency correction applied", function () {
  var segs = [{rips: [
    {freq: 120, current: 500},
    {freq: 10000, current: 500}
  ]}];
  var dt = CM.calcDeltaT(segs, 500, 10, 1);
  approx(dt[0].dt, 14.4, 0.5);
});

test("calcDeltaT - natural convection (cooling=1)", function () {
  var segs = [{rips: [{freq: 120, current: 500}]}];
  var dt2 = CM.calcDeltaT(segs, 500, 10);
  approx(dt2[0].dt, 10, 0.1);
});

test("calcDeltaT - deltaT capped at 3*dt0", function () {
  var segs = [{rips: [{freq: 120, current: 2000}]}];
  var dt   = CM.calcDeltaT(segs, 500, 10, 1);
  assert.ok(dt[0].dt <= 30, "Should be capped at 3*dt0=30C");
});

test("calcLifetime - returns null for empty segments", function () {
  assert.strictEqual(CM.calcLifetime({segments: []}), null);
});

test("calcLifetime - basic calculation produces reasonable result", function () {
  var result = CM.calcLifetime({
    l0: 5000, tmax: 105, vrated: 450, irated: 2000,
    dt0: 10, cooling: 1.0, wd: 365, wt: 10,
    scenario: "industrial",
    segments: [
      {dur: 8, ta: 75, vop: 400, rips: [{freq: 120, current: 800}]},
      {dur: 16, ta: 40, vop: 400, rips: [{freq: 120, current: 200}]}
    ]
  });
  assert.ok(result !== null);
  assert.ok(result.ly > 0, "Lifetime should be positive");
  assert.ok(result.sr.length === 2);
  assert.ok(result.margin > 0);
});

test("calcLifetime - warranty verdict logic", function () {
  var result = CM.calcLifetime({
    l0: 2000, tmax: 105, vrated: 50, irated: 500,
    dt0: 10, cooling: 1.0, wd: 365, wt: 10,
    scenario: "industrial",
    segments: [
      {dur: 24, ta: 95, vop: 50, rips: [{freq: 120, current: 500}]}
    ]
  });
  assert.ok(result.ws === "\u4e0d\u5408\u683c" || result.ws === "\u8fb9\u7f18",
            "High temp should fail or be marginal, got: " + result.ws);

  var result2 = CM.calcLifetime({
    l0: 5000, tmax: 105, vrated: 450, irated: 3000,
    dt0: 10, cooling: 1.3, wd: 365, wt: 5,
    scenario: "consumer",
    segments: [
      {dur: 24, ta: 30, vop: 200, rips: [{freq: 120, current: 200}]}
    ]
  });
  assert.ok(result2.ws === "\u4f18\u79c0" || result2.ws === "\u5408\u683c",
            "Low temp should pass, got: " + result2.ws);
});

test("calcLifetime - scenario margin factors applied correctly", function () {
  var baseParams = {
    l0: 5000, tmax: 105, vrated: 450, irated: 3000,
    dt0: 10, cooling: 1.0, wd: 365, wt: 5,
    segments: [{dur: 24, ta: 40, vop: 200, rips: [{freq: 120, current: 300}]}]
  };

  var consumer = CM.calcLifetime(baseParams);
  consumer.scenario = "consumer";
  consumer = CM.calcLifetime(Object.assign({}, baseParams, {scenario: "consumer"}));
  var medical  = CM.calcLifetime(Object.assign({}, baseParams, {scenario: "medical"}));

  assert.ok(medical.req > consumer.req, "Medical req should be higher");
});

test("calcLifetime - worst-case segment tracking", function () {
  var result = CM.calcLifetime({
    l0: 5000, tmax: 105, vrated: 450, irated: 2000,
    dt0: 10, cooling: 1.0, wd: 365, wt: 10,
    scenario: "industrial",
    segments: [
      {dur: 8, ta: 85, vop: 400, rips: [{freq: 120, current: 1500}]},
      {dur: 16, ta: 30, vop: 400, rips: [{freq: 120, current: 200}]}
    ]
  });
  assert.ok(result.wtHs > result.sr[1].ths, "Segment 1 should have higher temp");
});

test("calcLifetime - zero ripple current", function () {
  var result = CM.calcLifetime({
    l0: 5000, tmax: 105, vrated: 450, irated: 2000,
    dt0: 10, cooling: 1.0, wd: 365, wt: 5,
    scenario: "industrial",
    segments: [
      {dur: 24, ta: 40, vop: 400, rips: []}
    ]
  });
  assert.ok(result.ly > 50, "Zero ripple should give extremely long life");
});

test("calcLifetime - all ripple currents zero", function () {
  var result = CM.calcLifetime({
    l0: 5000, tmax: 105, vrated: 450, irated: 2000,
    dt0: 10, cooling: 1.0, wd: 365, wt: 5,
    scenario: "industrial",
    segments: [
      {dur: 24, ta: 40, vop: 400, rips: [{freq: 120, current: 0}]}
    ]
  });
  assert.ok(result.ly > 50, "Zero-current ripple should behave like no ripple");
});


/* ================================================== */
/* Safety Model Tests                                 */
/* ================================================== */

process.stderr.write("\n--- SafetyModel ---\n");

test("lookupImpulse - exact match OVC II at 300V", function () {
  approx(SM.lookupImpulse(300, 2, false), 2.5, 0.01);
});

test("lookupImpulse - interpolation between rows", function () {
  var val = SM.lookupImpulse(200, 2, true);
  approx(val, 1.83, 0.1);
});

test("lookupImpulse - no interpolation rounds up", function () {
  var val = SM.lookupImpulse(200, 2, false);
  assert.strictEqual(val, 2.5, "Should round up to next row without interp");
});

test("lookupTov - returns correct TOV for 300V system", function () {
  var tov = SM.lookupTov(300);
  assert.strictEqual(tov.peak, 2120);
  assert.strictEqual(tov.rms, 1500);
});

test("lookupTov - above max returns last row", function () {
  var tov = SM.lookupTov(2000);
  assert.strictEqual(tov.peak, 3110);
});

test("lookupClr - IEC exact match", function () {
  approx(SM.lookupClr(800, 2, "iec", false), 0.2, 0.01);
});

test("lookupClr - IEC interpolation", function () {
  // IEC table [impulse_V, tov_peak, wrk_peak_surr, PD1, PD2, PD3]
  // At 600V between rows [500,...PD3=0.8] and [800,...PD3=0.8] → interpolated = 0.8
  approx(SM.lookupClr(600, 3, "iec", true), 0.8, 0.01);
});

test("lookupClr - UL table used when standard=ul", function () {
  var iec = SM.lookupClr(800, 2, "iec", false);
  var ul  = SM.lookupClr(800, 2, "ul", false);
  assert.ok(typeof ul === "number");
});

test("lookupCrp - basic IEC creepage lookup", function () {
  var crp = SM.lookupCrp(230, 2, "ii", "iec", false);
  approx(crp, 1.8, 0.1);
});

test("lookupCrp - PCB trace uses PWBs-PD2 column", function () {
  // At Vrms=250, PWBs-PD2 = 1.0 (vs Other-PD2-II = 1.8) — verifies PCB path selects shorter distance
  var crp = SM.lookupCrp(250, 2, "ii", "iec", true);
  approx(crp, 1.0, 0.01);
});

test("lookupCrp - coating reduces pollution degree", function () {
  var crp_high_pd = SM.lookupCrp(230, 3, "ii", "iec", false);
  var crp_low_pd  = SM.lookupCrp(230, 2, "ii", "iec", false);
  assert.ok(crp_high_pd >= crp_low_pd, "Higher PD should give equal or higher creepage");
});

test("nextImpulseLevel - steps up correctly", function () {
  approx(SM.nextImpulseLevel(0.5), 0.8, 0.01);
  approx(SM.nextImpulseLevel(2.5), 4.0, 0.01);
  approx(SM.nextImpulseLevel(8.0), 8.0, 0.01);
});

test("prevImpLevel - steps down correctly", function () {
  approx(SM.prevImpLevel(4.0), 2.5, 0.01);
  approx(SM.prevImpLevel(0.33), 0.33, 0.01);
});

test("calcClearance - reinforced insulation uses most stringent", function () {
  var res = SM.calcClearance(230, 2.5, null, false, "reinf", 2);
  assert.ok(res.reqClr >= 0.8, "Reinforced clearance should be substantial");
});

test("calcClearance - functional insulation for mains", function () {
  var res = SM.calcClearance(230, 2.5, null, true, "func", 2);
  assert.ok(res.reqClr > 0);
});

test("calcNode - toGnd forces reinforced insulation", function () {
  var result = SM.calcNode({name: "L-PE", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: true},
    2, "ii", 2000, "iec", 2.5, 2.5, 300);
  assert.strictEqual(result.forcedReinforced, true);
  assert.strictEqual(result.effIns, "reinf");
});

test("calcNode - within-circuit reduces OVC", function () {
  var result = SM.calcNode({name: "L-N", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    2, "ii", 2000, "iec", 2.5, 2.5, 300);
  assert.ok(!result.toGnd);
});

test("calcSafety - returns null for empty nodes", function () {
  assert.strictEqual(SM.calcSafety({nodes: []}), null);
});

test("calcSafety - full calculation with multiple nodes", function () {
  var result = SM.calcSafety({
    pd: 2, mgGroup: "ii", alt: 2000, standard: "iec",
    sysVAC: 300, sysVDC: 600,
    nodes: [
      {name: "L-N", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac"},
      {name: "L-PE", vrms: 230, ins: "reinf", pcb: 0, coat: 0, circ: "ac", toGnd: true},
      {name: "DC+-PE", vrms: 600, ins: "reinf", pcb: 0, coat: 0, circ: "dc", toGnd: true}
    ]
  });
  assert.ok(result.results.length === 3);
  assert.strictEqual(result.results[1].forcedReinforced, false);
  assert.strictEqual(result.results[2].toGnd, true);
});

test("calcSafety - altitude correction applied", function () {
  var params = {
    pd: 2, mgGroup: "ii", standard: "iec",
    sysVAC: 300, sysVDC: 600,
    nodes: [{name: "L-PE", vrms: 230, ins: "reinf", pcb: 0, coat: 0, circ: "ac", toGnd: true}]
  };

  var r1 = SM.calcSafety(Object.assign({}, params, {alt: 2000}));
  var r2 = SM.calcSafety(Object.assign({}, params, {alt: 5000}));

  assert.ok(r2.results[0].reqClr > r1.results[0].reqClr,
            "Higher altitude should increase clearance");
});

test("calcSafety - coating=2 cancels creepage", function () {
  var result = SM.calcSafety({
    pd: 3, mgGroup: "ii", alt: 2000, standard: "iec",
    sysVAC: 300, sysVDC: 600,
    nodes: [{name: "X", vrms: 400, ins: "basic", pcb: 0, coat: 2, circ: "ac"}]
  });
  // IEC 60664-3 Table 1: Type 2 potting → minimum spacing 0.15mm (not zero)
  approx(result.results[0].reqCrp, 0.2, 0.01); // 0.15 rounded to 1 decimal = 0.2
});

test("calcSafety - DC impulse minimum 2.5kV enforced", function () {
  var result = SM.calcSafety({
    pd: 2, mgGroup: "ii", alt: 2000, standard: "iec",
    sysVAC: 300, sysVDC: 100,
    nodes: [{name: "DC+-PE", vrms: 100, ins: "reinf", pcb: 0, coat: 0, circ: "dc", toGnd: true}]
  });
  assert.ok(result.impDC >= 2.5, "DC impulse should be at least 2.5kV");
});

test("calcSafety - high DC voltage increases impulse", function () {
  var result = SM.calcSafety({
    pd: 2, mgGroup: "ii", alt: 2000, standard: "iec",
    sysVAC: 300, sysVDC: 1500,
    nodes: [{name: "X", vrms: 800, ins: "reinf", pcb: 0, coat: 0, circ: "dc"}]
  });
  assert.ok(result.impDC >= 4.0, "1500V DC should have impDC >= 4kV");
});

test("ALT_K values are correct", function () {
  assert.strictEqual(SM.ALT_K[2000], 1.0);
  approx(SM.ALT_K[3000], 1.14, 0.01);
  approx(SM.ALT_K[5000], 1.48, 0.01);
});

test("INS_K reinforced = 2x", function () {
  assert.strictEqual(SM.INS_K.reinf, 2.0);
  assert.strictEqual(SM.INS_K.basic, 1.0);
});

/* ── UL clearance tests (system voltage based — per corrected CLR_TBL_UL = UL 840 Table 8.1) ─── */
test("calcNode - UL uses system voltage not impulse for clearance", function () {
  // For a 300V AC system: sysKVRMS = 0.3, basic → row [0.3] PD3=5.5mm (UL 840 Table 8.1)
  // Reinforced: next row [0.6] PD3=8.0; max(5.5*2=11.0, 8.0) = 11.0mm
  var result = SM.calcNode({name: "L-PE", vrms: 230, ins: "reinf", pcb: 0, coat: 0, circ: "ac", toGnd: true},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  assert.ok(result.reqClr < 50, "UL clearance for 300V system should be reasonable (got " + result.reqClr + ")");
  approx(result.reqClr, 11.0, 0.5); // reinforced: max(basic*2=11.0, next_row=8.0) = 11.0mm
});

test("calcNode - UL DC circuit uses sysVDC for clearance", function () {
  var result = SM.calcNode({name: "DC+-PE", vrms: 600, ins: "reinf", pcb: 0, coat: 0, circ: "dc", toGnd: true},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 800);
  // sysVDC=800 → sysKVRMS=0.8 → basic (no interp) rounds up to row [1.0] PD3=14.0mm
  // Reinforced: next row [1.5]=19.4; max(14.0*2, 19.4)=28.0mm
  approx(result.reqClr, 28.0, 1.0);
});

test("calcNode - UL reinforced insulation exceeds basic", function () {
  var basic = SM.calcNode({name: "X", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  var reinf = SM.calcNode({name: "X", vrms: 230, ins: "reinf", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  assert.ok(reinf.reqClr > basic.reqClr, "Reinforced UL clearance should exceed basic (" + reinf.reqClr + " > " + basic.reqClr + ")");
  // For 300V: basic=5.5mm (row [0.3] PD3), reinf=max(11.0, next_row[0.6]=8.0)=11.0mm → exactly 2x increase
  assert.ok(reinf.reqClr >= basic.reqClr * 2, "Reinforced should be at least 2x basic");
});

test("lookupClr - UL interpolation works", function () {
  // Between rows [1.0, PD3=14.0] and [1.5, PD3=19.4], at 1.25 kVRMS → linear interp:
  // 14.0 + (1.25-1.0)/(1.5-1.0) * (19.4-14.0) = 14.0 + 0.5*5.4 = 16.7mm
  var val = SM.lookupClr(1250, 3, "ul", true);
  approx(val, 16.7, 0.05);
});

test("calcSafety - UL full calculation with sysVDC", function () {
  var result = SM.calcSafety({
    pd: 3, mgGroup: "ii", alt: 2000, standard: "ul",
    sysVAC: 300, sysVDC: 600,
    nodes: [
      {name: "L-PE", vrms: 230, ins: "reinf", pcb: 0, coat: 0, circ: "ac", toGnd: true},
      {name: "DC+-PE", vrms: 600, ins: "reinf", pcb: 0, coat: 0, circ: "dc", toGnd: true}
    ]
  });
  assert.ok(result.results.length === 2);
  // AC node: sysKVRMS=0.3 → basic row [0.3] PD3=5.5; reinf next=[0.6]=8.0; max(11.0, 8.0)=11.0mm
  approx(result.results[0].reqClr, 11.0, 0.5);
  // DC node: sysKVRMS=0.6 → basic row [0.6] PD3=8.0; reinf next=[1.0]=14.0; max(16.0, 14.0)=16.0mm
  approx(result.results[1].reqClr, 16.0, 0.5);
});


/* ================================================== */
/* Altitude correction — IEC vs UL                    */
/* ================================================== */

test("altFactor - IEC 2000m baseline", function() {
  assert.strictEqual(SM.altFactor(2000), 1.0);
});

test("altFactor - IEC 5000m interpolation", function() {
  var k = SM.altFactor(5000);
  assert.ok(k > 1 && k < 3, "IEC alt factor at 5000m should be ~1.6-2.0");
});

test("altFactorUL - baseline 2000m", function() {
  assert.strictEqual(SM.altFactorUL(2000), 1.0);
});

test("altFactorUL - exponential at 5000m", function() {
  var k = SM.altFactorUL(5000);
  // e^((5000-2000)/3300) ≈ e^0.909 ≈ 2.48
  assert.ok(k > 2.4 && k < 2.6, "UL alt factor at 5000m should be ~2.48, got: " + k);
});

test("altFactorUL - exponential at 10000m", function() {
  var k = SM.altFactorUL(10000);
  // e^((10000-2000)/3300) ≈ e^2.424 ≈ 11.29
  assert.ok(k > 11 && k < 12, "UL alt factor at 10000m should be ~11.3, got: " + k);
});

test("altFactorUL - below 2000m returns 1", function() {
  assert.strictEqual(SM.altFactorUL(1500), 1.0);
  assert.strictEqual(SM.altFactorUL(0), 1.0);
});

/* ── UL 840 §9.6 — Recurring peak voltage verification (Table 9.3) ─── */

test("lookupRecurringPeakMax - exact table entries", function() {
  // Direct lookups from Table 9.3
  assert.strictEqual(SM.lookupRecurringPeakMax(0.025), 330, "0.025mm → 330V");
  assert.strictEqual(SM.lookupRecurringPeakMax(0.1), 360, "0.1mm → 360V");
  assert.strictEqual(SM.lookupRecurringPeakMax(0.4), 600, "0.4mm → 600V");
  assert.strictEqual(SM.lookupRecurringPeakMax(1.0), 913, "1.0mm → 913V");
  assert.strictEqual(SM.lookupRecurringPeakMax(2.0), 1314, "2.0mm → 1314V");
  assert.strictEqual(SM.lookupRecurringPeakMax(5.0), 2200, "5.0mm → 2200V");
});

test("lookupRecurringPeakMax - interpolation between entries", function() {
  // Between 0.4 (600V) and 0.5 (640V): at 0.45 should be ~620V
  var v = SM.lookupRecurringPeakMax(0.45);
  assert.ok(v > 610 && v < 630, "Interpolation at 0.45mm: expected ~620V, got " + v);

  // Between 1.0 (913V) and 1.3 (1049V): at 1.15 should be ~981V
  var v2 = SM.lookupRecurringPeakMax(1.15);
  assert.ok(v2 > 970 && v2 < 990, "Interpolation at 1.15mm: expected ~981V, got " + v2);
});

test("lookupRecurringPeakMax - boundary conditions", function() {
  // Below minimum entry → return first value (330V)
  assert.strictEqual(SM.lookupRecurringPeakMax(0.001), 330, "Below min returns 330V");

  // Above maximum entry → return last value (2200V)
  assert.strictEqual(SM.lookupRecurringPeakMax(10.0), 2200, "Above max returns 2200V");
});

test("calcNode UL PCB - recurring peak check passes for low voltage", function() {
  // Low-voltage PCB node: 5V AC → opPeak=7.07V, well below any Table 9.3 limit
  var result = SM.calcNode({ name: "Test", vrms: 5, ins: 'basic', pcb: true, circ: 'ac' },
    2, 'ii', 2000, 'ul', 1.5, 2.5, 300, 600);
  assert.strictEqual(result.recurringPeakOk, true, "Low-voltage PCB should pass recurring peak check");
});

test("calcNode UL PCB - recurring peak check fails for high voltage", function() {
  // High-voltage PCB node: 800V AC → opPeak=1131.2V
  // reqCrp at PD3 MG-II = 14mm, maxPeak from Table 9.3 ≈ extrapolated ~2200V (above table)
  // This should pass because 14mm creepage handles >2200V peak
  var result = SM.calcNode({ name: "Test", vrms: 800, ins: 'basic', pcb: true, circ: 'ac' },
    3, 'ii', 2000, 'ul', 1.5, 2.5, 600, 800);
  // 800V AC PCB at PD3 → reqCrp=14mm → maxPeak=2200V (clamped to table max)
  // opPeak = 800*1.414 ≈ 1131V < 2200V → should pass
  assert.strictEqual(result.recurringPeakOk, true, "800V AC PCB at PD3 should pass");
});

test("calcNode UL PCB - recurring peak check for tight creepage", function() {
  // Tight scenario: 400V DC on PCB with small creepage
  // reqCrp at PD2 MG-II = 4.0mm, maxPeak from Table 9.3 ≈ 1922V
  var result = SM.calcNode({ name: "Test", vrms: 400, ins: 'basic', pcb: true, circ: 'dc' },
    2, 'ii', 2000, 'ul', 1.5, 2.5, 300, 600);
  // DC → opPeak = vrms = 400V; reqCrp(PD2,MG-II) ≈ 4.0mm → maxPeak=1922V
  // 400 < 1922 → pass
  assert.strictEqual(result.recurringPeakOk, true, "400V DC PCB should pass");
});

test("calcNode IEC — recurring peak check is N/A", function() {
  var result = SM.calcNode({ name: "Test", vrms: 300, ins: 'basic', pcb: true, circ: 'ac' },
    2, 'ii', 2000, 'iec', 1.5, 2.5, 300, 600);
  assert.strictEqual(result.recurringPeakOk, null, "IEC mode should have recurringPeakOk=null");
});

test("calcNode UL non-PCB — recurring peak check is N/A", function() {
  var result = SM.calcNode({ name: "Test", vrms: 300, ins: 'basic', pcb: false, circ: 'ac' },
    2, 'ii', 2000, 'ul', 1.5, 2.5, 300, 600);
  assert.strictEqual(result.recurringPeakOk, null, "Non-PCB UL node should have recurringPeakOk=null");
});


/* ================================================== */
/* P2#4: UL 1741 §25.3 — Field wiring terminals (Table 24.1) */
/* ================================================== */

test("lookupTable24_1 - 50V range", function () {
  var r = SM.lookupTable24_1(50);
  assert.strictEqual(r.clearance, 1.6, "T24.1 50V: throughAir");
  assert.strictEqual(r.creepage, 1.6, "T24.1 50V: overSurface");
});

test("lookupTable24_1 - >50-150V range", function () {
  var r = SM.lookupTable24_1(120);
  assert.strictEqual(r.clearance, 3.2, "T24.1 120V: throughAir");
  assert.strictEqual(r.creepage, 6.4, "T24.1 120V: overSurface");
});

test("lookupTable24_1 - >150-300V range", function () {
  var r = SM.lookupTable24_1(230);
  assert.strictEqual(r.clearance, 6.4, "T24.1 230V: throughAir");
  assert.strictEqual(r.creepage, 9.5, "T24.1 230V: overSurface");
});

test("lookupTable24_1 - >300-600V range", function () {
  var r = SM.lookupTable24_1(480);
  assert.strictEqual(r.clearance, 9.5, "T24.1 480V: throughAir");
  assert.strictEqual(r.creepage, 12.7, "T24.1 480V: overSurface");
});

test("lookupTable24_1 - above 600V uses last row", function () {
  var r = SM.lookupTable24_1(800);
  assert.strictEqual(r.clearance, 9.5, "T24.1 800V: capped at last row");
  assert.strictEqual(r.creepage, 12.7, "T24.1 800V: capped at last row");
});

test("calcNode - fieldTerminal enforces Table 24.1 floor", function () {
  // 300V AC system, non-PCB, with fieldTerminal=true
  // UL calc gives ~1.5mm clearance (UL 840), but T24.1 requires 6.4mm for >150-300V
  var result = SM.calcNode({name: "FieldTerm", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false, fieldTerminal: true},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  assert.strictEqual(result.tbl241Note, 'both', "Field terminal should flag Table 24.1 enforcement");
  approx(result.reqClr, 6.4, 0.1, "T24.1 clearance floor for 230V field terminal");
  approx(result.reqCrp, 9.5, 0.1, "T24.1 creepage floor for 230V field terminal");
});

test("calcNode - non-fieldTerminal does NOT enforce Table 24.1", function () {
  // Same node but without fieldTerminal flag — should use UL 840 values
  var result = SM.calcNode({name: "InternalConn", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  assert.strictEqual(result.tbl241Note, null, "Non-field terminal should not have T24.1 note");
  // UL 840 gives 5.5mm for sysVAC=300/PD3; T24.1 requires 6.4mm → proves no enforcement since 5.5 < 6.4
  assert.ok(result.reqClr < 6.4, "Internal connection uses UL 840 (not T24.1) clearance: " + result.reqClr);
});

test("calcNode - fieldTerminal IEC mode is N/A", function () {
  var result = SM.calcNode({name: "X", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false, fieldTerminal: true},
    2, "ii", 2000, "iec", 4.0, 2.5, 230, 600);
  assert.strictEqual(result.tbl241Note, null, "IEC mode ignores field terminal flag");
});


/* ================================================== */
/* P2#5: Primary vs secondary circuit interpolation   */
/* ================================================== */

test("calcNode - UL primary circuit uses no interpolation", function () {
  // sysVAC=300 → sysKVRMS=0.3, basic insulation, non-interp (primary)
  var result = SM.calcNode({name: "Primary", vrms: 230, ins: "basic", pcb: 1, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  // Without interp, should round up to next table row [0.3] → PD3=5.5mm
  approx(result.reqClr, 5.5, 0.1, "Primary circuit rounds up (no interpolation)");
});

test("calcNode - UL secondary circuit uses linear interpolation", function () {
  // sysVAC=300 → sysKVRMS=0.3, with interp=true (secondary/control)
  var result = SM.calcNode({name: "Secondary", vrms: 24, ins: "basic", pcb: 1, coat: 0, circ: "ac", toGnd: false, interp: true},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  // With interp at sysKVRMS=0.3: between [0.15]=3.0 and [0.3]=5.5 → interpolated value
  assert.ok(result.reqClr >= 3.0 && result.reqClr <= 5.5, "Secondary circuit uses interpolation: " + result.reqClr);
});

test("calcNode - interp flag does not affect IEC mode", function () {
  var rNo = SM.calcNode({name: "A", vrms: 230, ins: "basic", pcb: 1, coat: 0, circ: "ac", toGnd: false, interp: false},
    2, "ii", 2000, "iec", 4.0, 2.5, 230, 600);
  var rYes = SM.calcNode({name: "A", vrms: 230, ins: "basic", pcb: 1, coat: 0, circ: "ac", toGnd: false, interp: true},
    2, "ii", 2000, "iec", 4.0, 2.5, 230, 600);
  assert.strictEqual(rNo.reqClr, rYes.reqClr, "IEC mode ignores interp flag");
});


/* ================================================== */
/* P1-5: Extended UL Test Coverage                    */
/* ================================================== */

process.stderr.write("\n--- UL Extended Tests ---\n");

// ── altFactorUL (3) ───────────────────────────────

test("altFactorUL at 3000m ≈ 1.35", function () {
  // e^((3000-2000)/3300) = e^(1/3.3) ≈ e^0.303 ≈ 1.354 → rounds to 1.35
  approx(SM.altFactorUL(3000), 1.35, 0.01);
});

test("altFactorUL above 20000m extrapolates correctly", function () {
  // No cap in UL exponential model: e^((25000-2000)/3300) ≈ e^6.97 ≈ 1064
  var k = SM.altFactorUL(25000);
  assert.ok(k > 1000, "Should extrapolate to ~1064 at 25000m, got: " + k);
});

test("altFactorUL monotonic growth — higher altitude → higher factor", function () {
  var k3 = SM.altFactorUL(3000); // ≈ 1.35
  var k5 = SM.altFactorUL(5000); // ≈ 2.48
  assert.ok(k5 > k3, "Altitude factor should increase with altitude");
});

// ── lookupClr UL exact matches (4) ────────────────

test("lookupClr UL PD3 at 300V → 5.5mm exact match", function () {
  // CLR_TBL_UL row [0.300, 5.5, 5.5, 5.5, 5.5] — col pd=3 (index 3) = 5.5
  approx(SM.lookupClr(300, 3, "ul", false), 5.5, 0.01);
});

test("lookupClr UL PD3 at 600V → 8.0mm exact match", function () {
  // CLR_TBL_UL row [0.600, 8.0, 8.0, 8.0, 8.0] — col pd=3 = 8.0
  approx(SM.lookupClr(600, 3, "ul", false), 8.0, 0.01);
});

test("lookupClr UL PD2 at 1000V → 14.0mm exact match", function () {
  // CLR_TBL_UL row [1.000, 14.0, 14.0, 14.0, 14.0] — col pd=2 (index 2) = 14.0
  approx(SM.lookupClr(1000, 2, "ul", false), 14.0, 0.01);
});

test("lookupClr UL PD4 at 50V → 1.6mm exact match", function () {
  // CLR_TBL_UL row [0.050, 0.5, 0.5, 0.8, 1.6] — col pd=4 (index 4) = 1.6
  approx(SM.lookupClr(50, 4, "ul", false), 1.6, 0.01);
});

test("lookupClr UL zero voltage returns 0", function () {
  assert.strictEqual(SM.lookupClr(0, 3, "ul", false), 0);
});

// ── lookupCrp UL (4) — NO direct UL creepage tests existed before! ───

test("lookupCrp UL PD2 at 230V uses CRP_UL table", function () {
  // vrms=230 → row [250,...]: [250, 0.56, 1.25, 3.2, 3.6, 4.0, 4.0, 5.0, 6.3, 8.0]
  // pd=2 → col 2 = 1.25 (PD2 is same for all material groups)
  approx(SM.lookupCrp(230, 2, "ii", "ul", false), 1.25, 0.05);
});

test("lookupCrp UL PD3 MG-II at 230V → 3.6mm", function () {
  // vrms=230 → row [250,...]: col[3+mi(1)] = col 4 = 3.6 (PD3_GrII)
  approx(SM.lookupCrp(230, 3, "ii", "ul", false), 3.6, 0.05);
});

test("lookupCrp UL PCB mode at 100V — Table 9.2 col PD1 = 0.1", function () {
  // CRP_UL_PCB row [100,...]: [100, 0.1, 0.16] → pd=1 → col 1 = 0.1
  approx(SM.lookupCrp(100, 1, "ii", "ul", true), 0.1, 0.01);
});

test("lookupCrp UL PCB PD2 at 100V — Table 9.2 col PD2 = 0.16", function () {
  // CRP_UL_PCB row [100,...]: [100, 0.1, 0.16] → pd=2 → col 2 = 0.16
  approx(SM.lookupCrp(100, 2, "ii", "ul", true), 0.16, 0.01);
});

test("lookupCrp UL high voltage at 5000V PD2 → 25mm", function () {
  // vrms=5000 → row [5000,...]: col 2 = 25 (PD2)
  approx(SM.lookupCrp(5000, 2, "ii", "ul", false), 25, 0.5);
});

test("lookupCrp UL PD1 uses PCB column regardless of pcb flag", function () {
  // vrms=100 → row [100,...]: col 1 = 0.25 (PD1)
  var withPcb   = SM.lookupCrp(100, 1, "ii", "ul", true);
  var withoutPcb = SM.lookupCrp(100, 1, "ii", "ul", false);
  // pd=1 in UL uses col 1 of CRP_UL = 0.25; PCB path uses CRP_UL_PCB col 1 = 0.1
  // They differ because PCB Table 9.2 has smaller values — this is correct behavior
  approx(withoutPcb, 0.25, 0.01);
  approx(withPcb, 0.1, 0.01);
});

test("lookupCrp UL PD4 MG-II at 230V → 6.3mm", function () {
  // vrms=230 → row [250,...]: col[8] = 6.3 (PD4_GrII)
  approx(SM.lookupCrp(230, 4, "ii", "ul", false), 6.3, 0.05);
});

test("lookupCrp UL PD3 Gr IIIb at 800V → null (N/A per footnote y)", function () {
  // vrms=800 → row [800,...]: col[6] = null (PD3_GrIIIb >630V is N/A)
  assert.strictEqual(SM.lookupCrp(800, 3, "iiib", "ul", false), null);
});

test("lookupCrp UL PCB PD2 Gr IIIb falls back to Table 9.1", function () {
  // pcb=true, pd=2, mgGroup='iiib' → should NOT use CRP_UL_PCB (IIIb excluded)
  // Instead falls back to lookupCrp_UL_Table9_1 which returns col 2 of CRP_UL
  var fallback = SM.lookupCrp(100, 2, "iiib", "ul", true);
  var normalII = SM.lookupCrp(100, 2, "ii", "ul", false);
  // Both should use PD2 col from Table 9.1 → same value
  assert.strictEqual(fallback, normalII, "IIIb@PD2 PCB should fall back to Tbl 9.1");
  approx(fallback, 0.71, 0.05);
});

// ── calcNode UL (4) ───────────────────────────────

test("calcNode UL with altitude correction at 5000m → clearance increases", function () {
  var r2k = SM.calcNode({name: "A", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  var r5k = SM.calcNode({name: "A", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 5000, "ul", 6.0, 4.0, 300, 600);
  // altFactorUL(5000) ≈ 2.48 → clearance should be ~2.48x higher
  assert.ok(r5k.reqClr > r2k.reqClr * 2, "Higher altitude increases UL clearance: " + r5k.reqClr + " vs " + r2k.reqClr);
});

test("calcNode UL basic AC node exact match sysVAC=300 PD3 → 5.5mm", function () {
  // Basic insulation, non-toGnd → direct lookup by system voltage
  // sysVAC=300 → sysKVRMS=0.3 → row [0.3] PD3=5.5mm at alt=2000m (factor=1.0)
  var result = SM.calcNode({name: "Basic", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  approx(result.reqClr, 5.5, 0.05);
});

test("calcNode UL functional insulation matches basic for non-toGnd node", function () {
  // Both func and basic go through the same direct lookup path in UL mode (neither is 'reinf')
  var basic = SM.calcNode({name: "A", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  var func  = SM.calcNode({name: "A", vrms: 230, ins: "func", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  assert.strictEqual(basic.reqClr, func.reqClr, "Functional and basic UL clearance should be identical");
});

test("calcNode UL supplementary insulation same distance as basic (not reinf)", function () {
  var basic = SM.calcNode({name: "A", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  var supp  = SM.calcNode({name: "A", vrms: 230, ins: "supp", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  assert.strictEqual(basic.reqClr, supp.reqClr, "Supplementary UL clearance should equal basic");
});

// ── calcSafety UL (3) ─────────────────────────────

test("calcSafety UL pd=3 may differ from pd=2 due to column structure", function () {
  // In the new CRP_UL table: PD2 uses single col (col 2), PD3 has material-group-specific cols (3-6).
  // For voltages where raw creepage differs between PD levels, they produce different results.
  var r2 = SM.calcSafety({
    pd: 2, mgGroup: "ii", alt: 2000, standard: "ul",
    sysVAC: 300, sysVDC: 600,
    nodes: [{name: "X", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac"}]
  });
  var r3 = SM.calcSafety({
    pd: 3, mgGroup: "ii", alt: 2000, standard: "ul",
    sysVAC: 300, sysVDC: 600,
    nodes: [{name: "X", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac"}]
  });
  // Both should return valid creepage values (not equal = different columns used)
  assert.ok(r2.results[0].reqCrp > 0 && r3.results[0].reqCrp > 0, "Both PD levels produce valid creepage");
  // With Cr>=Cl constraint, both may be raised to clearance floor — check raw lookup instead
  var crp2 = SM.lookupCrp(230, 2, "ii", "ul", false);
  var crp3 = SM.lookupCrp(230, 3, "ii", "ul", false);
  assert.notStrictEqual(crp2, crp3, "Raw PD2 and PD3 creepage should differ: pd2=" + crp2 + ", pd3=" + crp3);
});

test("calcSafety UL fieldTerminal enforces Table 24.1 floor in full flow", function () {
  var result = SM.calcSafety({
    pd: 3, mgGroup: "ii", alt: 2000, standard: "ul",
    sysVAC: 300, sysVDC: 600,
    nodes: [{name: "FieldTerm", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", fieldTerminal: true}]
  });
  // T24.1 for >150-300V: clearance=6.4mm, creepage=9.5mm
  assert.strictEqual(result.results[0].tbl241Note, 'both', "Field terminal should flag Table 24.1 enforcement");
  approx(result.results[0].reqClr, 6.4, 0.1);
  approx(result.results[0].reqCrp, 9.5, 0.1);
});

test("calcSafety UL coating=2 cancels creepage (same as IEC)", function () {
  var result = SM.calcSafety({
    pd: 3, mgGroup: "ii", alt: 2000, standard: "ul",
    sysVAC: 300, sysVDC: 600,
    nodes: [{name: "X", vrms: 400, ins: "basic", pcb: 0, coat: 2, circ: "ac"}]
  });
  // IEC 60664-3 Table 1: Type 2 potting → minimum spacing 0.15mm (rounded to 0.2)
  approx(result.results[0].reqCrp, 0.2, 0.01);
});

// ── lookupTable24_1 boundary test (1) ─────────────

test("lookupTable24_1 at exactly boundary voltage uses correct row", function () {
  // vrms=50 → should match first row [50, 1.6, 1.6] since 50 <= 50
  var r = SM.lookupTable24_1(50);
  assert.strictEqual(r.clearance, 1.6, "T24.1 at exactly 50V: throughAir");
  assert.strictEqual(r.creepage, 1.6, "T24.1 at exactly 50V: overSurface");
});


/* ================================================== */
/* P0/P1/P2: UL Standard Compliance Fixes             */
/* ================================================== */

process.stderr.write("\n--- P0/P1/P2 Compliance Tests ---\n");

// ── P1-4: Cr ≥ Cl floor constraint (3) ────────────

test("calcNode - Cr >= Cl floor enforced when creepage < clearance", function () {
  // Low voltage where UL creepage can be smaller than clearance
  var result = SM.calcNode({name: "LowV", vrms: 50, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    1, "ii", 2000, "ul", 6.0, 4.0, 50, 100);
  // CLR_TBL_UL @ 50V/PD1 = 0.5mm; CRP_UL @ PD1 = 0.18mm → Cr should be raised to Cl
  assert.ok(result.reqCrp >= result.reqClr, "Creepage must not be less than clearance: crp=" + result.reqCrp + " clr=" + result.reqClr);
});

test("calcNode - Cr >= Cl floor does NOT reduce creepage", function () {
  // High voltage where creepage naturally exceeds clearance
  var result = SM.calcNode({name: "HighV", vrms: 400, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "iiia", 2000, "ul", 6.0, 4.0, 500, 700);
  // CLR_TBL_UL @ 500V/PD3 = ~11mm (interp), CRP_UL PD3/GrIIIa @ 400V = 6.3mm → crp raised to clr
  assert.ok(result.reqCrp >= result.reqClr, "Creepage floor applied: crp=" + result.reqCrp);
});

test("calcNode - Cr >= Cl works with reinforced insulation (2x creepage)", function () {
  var result = SM.calcNode({name: "Reinf", vrms: 100, ins: "reinf", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 2000, "ul", 6.0, 4.0, 150, 300);
  // Reinforced doubles creepage → should still respect Cr >= Cl
  assert.ok(result.reqCrp >= result.reqClr, "Reinforced insulation respects Cr>=Cl: crp=" + result.reqCrp);
});

// ── P1-5: Group IIIb @ PD3 >630V N/A (2) ─────────

test("calcNode - Group IIIb @ PD3 >630V triggers grIIIbNa flag", function () {
  var result = SM.calcNode({name: "IIIbHigh", vrms: 800, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "iiib", 2000, "ul", 6.0, 4.0, 1000, 1200);
  assert.strictEqual(result.grIIIbNa, true, "Should flag IIIb@PD3>630V as N/A");
});

test("calcNode - Group IIIb @ PD3 <=630V does NOT trigger grIIIbNa", function () {
  var result = SM.calcNode({name: "IIIbLow", vrms: 400, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "iiib", 2000, "ul", 6.0, 4.0, 500, 700);
  assert.strictEqual(result.grIIIbNa, false, "Should NOT flag IIIb@PD3<=630V");
});

// ── P2: UL 1741 Table 1 Enclosure (3) ─────────────

test("lookupUL1741_Table1 - 50V range", function () {
  var r = SM.lookupUL1741_Table1(50);
  assert.strictEqual(r.toEnclosure, 1.6, "T1 50V: toEnclosure");
  assert.strictEqual(r.clearance, 1.6, "T1 50V: clearance");
  assert.strictEqual(r.creepage, 1.6, "T1 50V: creepage");
});

test("lookupUL1741_Table1 - >150-300V range", function () {
  var r = SM.lookupUL1741_Table1(230);
  assert.strictEqual(r.toEnclosure, 12.7, "T1 230V: toEnclosure");
  assert.strictEqual(r.clearance, 6.4, "T1 230V: clearance");
  assert.strictEqual(r.creepage, 9.5, "T1 230V: creepage");
});

test("calcNode - enclosure flag enforces UL 1741 Table 1 floor", function () {
  // 230V AC system with enclosure=true → T1 requires clearance=6.4mm (UL840 gives ~5.5)
  var result = SM.calcNode({name: "Enclosure", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false, enclosure: true},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  assert.ok(result.tbl1Note !== null, "Enclosure node should flag Table 1 enforcement");
  approx(result.reqClr, 12.7, 0.1, "T1 toEnclosure floor for 230V: clearance raised to 12.7mm");
});

test("calcNode - non-enclosure does NOT enforce UL 1741 Table 1", function () {
  var result = SM.calcNode({name: "Internal", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  assert.strictEqual(result.tbl1Note, null, "Non-enclosure should not have T1 note");
});

test("calcNode - enclosure IEC mode is N/A", function () {
  var result = SM.calcNode({name: "X", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false, enclosure: true},
    2, "ii", 2000, "iec", 4.0, 2.5, 230, 600);
  assert.strictEqual(result.tbl1Note, null, "IEC mode ignores enclosure flag");
});

// ── P0: CLR_TBL_UL correct values (spot checks) ───

test("lookupClr UL PD1 at 50V → 0.5mm", function () {
  approx(SM.lookupClr(50, 1, "ul", false), 0.5, 0.01);
});

test("lookupClr UL PD2 at 100V → 1.5mm", function () {
  approx(SM.lookupClr(100, 2, "ul", false), 1.5, 0.01);
});

/* ================================================== */
/* OpampAnalysis Tests (stability / noise / offset / C_L load) */
/* ================================================== */

process.stderr.write("\n--- OpampAnalysis ---\n");

loadModel(path.join(__dirname, "../js/models/filter-model.js"), G);
// opamp-analysis.js 在 Node（无 window）下自挂 globalThis
new Function(fs.readFileSync(path.join(__dirname, "../js/models/opamp-analysis.js"), "utf8"))();
var OA = globalThis.OpampAnalysis;

/* ---- 测试侧复数运算（独立于模型实现）---- */
function C(re, im) { return [re, im === undefined ? 0 : im]; }
function cadd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
function csub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
function cmul(a, b) { return [a[0]*b[0] - a[1]*b[1], a[0]*b[1] + a[1]*b[0]]; }
function cdiv(a, b) { var d = b[0]*b[0] + b[1]*b[1]; return [(a[0]*b[0]+a[1]*b[1])/d, (a[1]*b[0]-a[0]*b[1])/d]; }
function cmag(a) { return Math.hypot(a[0], a[1]); }

/* ---- 参考设计（Q≈0.707 MFB2 + diff1，前段已验证）---- */
var compM = { R1: 47e3, R2: 220e3, R3: 82e3, C1: 330e-12, C2: 4.3e-9 };
var fcM = 1 / (2 * Math.PI * Math.sqrt(compM.C1 * compM.C2 * compM.R2 * compM.R3)); // ≈994.7Hz
var diffDesign = G.FilterModel.designDiff1(1000, 2, "e24");
var compD = { R1: diffDesign.components.R1, R2: diffDesign.components.R2, R3: diffDesign.components.R3, R4: diffDesign.components.R4, C4: diffDesign.components.C4 };

var opHuge = { gbw_hz: 1e16, aol_db: 200, enW_nv: 0, en_corner_hz: 0, in_pa: 0, ib_a: 0, eio_uv_max: 0, ro_ohm: 50 };
var NE5532 = { id: "ne5532", name: "NE5532", gbw_hz: 1e7, aol_db: 104, enW_nv: 5, en_corner_hz: 20, in_pa: 5, ib_a: 80e-9, eio_uv_max: 500, ro_ohm: 100 };

/* MFB2 闭式系数（测试侧克莱姆法则，独立于模型求解器）
   KCL_A/KCL_x（vo 作参数）: [[a,b],[c,d]]·[vA,vx]ᵀ = [G1·vin+G2·vo, Ix+jwC1·vo]
   α=vx/vin|vo=0 ; β=vx/vo|vin=0 ; p11=vA/vin|vo=0 */
function mfb2Coefs(f) {
  var w = 2 * Math.PI * f;
  var g1 = 1/compM.R1, g2 = 1/compM.R2, g3 = 1/compM.R3;
  var a = C(g1+g2+g3, w*compM.C2), b = C(-g3), c = C(-g3), d = C(g3, w*compM.C1);
  var det = csub(cmul(a,d), cmul(b,c));
  return {
    alpha: cdiv(C(g1*g3), det),                                   // y=(a·r2−r1·c)/det, r=[G1,0] → −G1·c/det=G1g3/det
    beta:  cdiv(csub(cmul(a, C(0, w*compM.C1)), cmul(C(g2), c)), det), // r=[G2,jwC1]
    p11:   cdiv(cmul(C(g1), d), det)                              // x=(r1·d−b·r2)/det, r=[G1,0] → G1·d/det
  };
}

test("opamp: mfb2 H_sig(hugeA) vs ideal formula", function () {
  var maxRel = 0; var N = 80;
  for (var i = 0; i < N; i++) {
    var f = 0.5 * Math.pow(5e6/0.5, i/(N-1));
    var w = 2*Math.PI*f;
    var n0 = -compM.R2/compM.R1;
    var d1c = compM.C1*(compM.R2+compM.R3+compM.R2*compM.R3/compM.R1);
    var d2c = compM.C1*compM.C2*compM.R2*compM.R3;
    var den = Math.pow(1-w*w*d2c, 2) + Math.pow(w*d1c, 2);
    var Hideal = C(n0*(1-w*w*d2c)/den, -n0*w*d1c/den);
    var Hs = OA._debug.mfb2TransferAt(f, compM, opHuge);
    maxRel = Math.max(maxRel, cmag(csub(Hs, Hideal)) / cmag(Hideal));
  }
  assert.ok(maxRel < 1e-6, "maxRel=" + maxRel.toExponential(2));
});

test("opamp: mfb2 finite-A H_sig closed form", function () {
  var op = OA.opampById("tp6004");
  var maxSig = 0; var N = 80;
  for (var i = 0; i < N; i++) {
    var f = 0.5 * Math.pow(5e6/0.5, i/(N-1));
    var A = OA._debug.aolAt(op, f);
    var cf = mfb2Coefs(f);
    var oneAb = cadd(C(1), cmul(A, cf.beta));
    var HsigC = cdiv(cmul(A, csub(C(0), cf.alpha)), oneAb);   // −Aα/(1+Aβ)
    maxSig = Math.max(maxSig, cmag(csub(OA._debug.mfb2TransferAt(f, compM, op), HsigC)) / cmag(HsigC));
  }
  assert.ok(maxSig < 1e-7, "maxRel=" + maxSig.toExponential(2));
});

test("opamp: mfb2 finite-A H_e closed form", function () {
  var op = OA.opampById("tp6004");
  var maxHe = 0; var N = 80;
  for (var i = 0; i < N; i++) {
    var f = 0.5 * Math.pow(5e6/0.5, i/(N-1));
    var A = OA._debug.aolAt(op, f);
    var cf = mfb2Coefs(f);
    var HeC = cdiv(A, cadd(C(1), cmul(A, cf.beta)));
    maxHe = Math.max(maxHe, cmag(csub(OA._debug.mfb2HeAt(f, compM, op), HeC)) / cmag(HeC));
  }
  assert.ok(maxHe < 1e-7, "maxRel=" + maxHe.toExponential(2));
});

test("opamp: mfb2 β solver vs Cramer's rule", function () {
  var maxBeta = 0; var N = 80;
  for (var i = 0; i < N; i++) {
    var f = 0.5 * Math.pow(5e6/0.5, i/(N-1));
    var cf = mfb2Coefs(f);
    maxBeta = Math.max(maxBeta, cmag(csub(OA._debug.mfb2BetaAt(f, compM), cf.beta)) / cmag(cf.beta));
  }
  assert.ok(maxBeta < 1e-9, "maxRel=" + maxBeta.toExponential(2));
});

test("opamp: mfb2 NG(0)=1+R2/R1", function () {
  var rM = OA.analyzeMfb2(compM, OA.opampById("tp6004"), { fc_hz: fcM });
  assert.ok(Math.abs(rM.ngDC.lin - (1 + compM.R2/compM.R1)) / (1 + compM.R2/compM.R1) < 1e-4, "got " + rM.ngDC.lin);
});

test("opamp: diff1 NG(0)=1+R4/R2", function () {
  var rD = OA.analyzeDiff1(compD, OA.opampById("tp6004"), { fc_hz: diffDesign.fc_actual });
  assert.ok(Math.abs(rD.ngDC.lin - (1 + compD.R4/compD.R2)) / (1 + compD.R4/compD.R2) < 1e-4, "got " + rD.ngDC.lin);
});

/* 带载 MFB2 精确闭式（50Ω+1nF → 负载极点≈3.2MHz）：
   H_e_L=AD/(1+AβD)；H_sig_L=[−Aα+Ro(G2·p11+jwC1·α)]·D/(1+AβD)
   （第二项 = vin 经 R2/C1 馈通到 vo 节点、绕过输出分压器的电流）*/
test("opamp: mfb2 loaded H_sig closed form", function () {
  var op = OA.opampById("tp6004");
  var load = { ro: op.ro_ohm, cl: 1e-9 };
  var g2c = C(1/compM.R2);
  var maxSig = 0; var N = 80;
  for (var i = 0; i < N; i++) {
    var f = 0.5 * Math.pow(5e6/0.5, i/(N-1));
    var w = 2*Math.PI*f;
    var A = OA._debug.aolAt(op, f);
    var cf = mfb2Coefs(f);
    var D = OA._debug.dloadAt("mfb2", w, compM, load.ro, load.cl);
    var oneAbD = cadd(C(1), cmul(cmul(A, cf.beta), D));
    var feed = cadd(cmul(g2c, cf.p11), cmul(C(0, w*compM.C1), cf.alpha));   // G2·p11+jwC1·α
    var HsigC = cdiv(cmul(cadd(csub(C(0), cmul(A, cf.alpha)), cmul(C(load.ro), feed)), D), oneAbD);  // [−Aα+Ro·feed]·D/(1+AβD)
    maxSig = Math.max(maxSig, cmag(csub(OA._debug.mfb2TransferLoadedAt(f, compM, op, load), HsigC)) / cmag(HsigC));
  }
  assert.ok(maxSig < 1e-7, "maxRel=" + maxSig.toExponential(2));
});

test("opamp: mfb2 loaded H_e closed form", function () {
  var op = OA.opampById("tp6004");
  var load = { ro: op.ro_ohm, cl: 1e-9 };
  var maxHe = 0; var N = 80;
  for (var i = 0; i < N; i++) {
    var f = 0.5 * Math.pow(5e6/0.5, i/(N-1));
    var A = OA._debug.aolAt(op, f);
    var cf = mfb2Coefs(f);
    var D = OA._debug.dloadAt("mfb2", 2*Math.PI*f, compM, load.ro, load.cl);
    var HeC = cdiv(cmul(A, D), cadd(C(1), cmul(cmul(A, cf.beta), D)));
    maxHe = Math.max(maxHe, cmag(csub(OA._debug.mfb2HeLoadedAt(f, compM, op, load), HeC)) / cmag(HeC));
  }
  assert.ok(maxHe < 1e-7, "maxRel=" + maxHe.toExponential(2));
});

test("opamp: mfb2 Ro→0 ⇒ no-load (C_L has no effect)", function () {
  var op = OA.opampById("tp6004");
  var maxRel = 0;
  [1, 994.7, 3e3, 3.2e6].forEach(function (f) {
    var Hload = OA._debug.mfb2TransferLoadedAt(f, compM, op, { ro: 1e-3, cl: 1e-9 });
    var Hfree = OA._debug.mfb2TransferAt(f, compM, op);
    maxRel = Math.max(maxRel, cmag(csub(Hload, Hfree)) / cmag(Hfree));
  });
  assert.ok(maxRel < 1e-4, "maxRel=" + maxRel.toExponential(2));
});

test("opamp: diff1 Ro→0 ⇒ no-load (C_L has no effect)", function () {
  var op = OA.opampById("tp555x");
  var maxRel = 0;
  [1, diffDesign.fc_actual, 3e3].forEach(function (f) {
    ["plus", "minus"].forEach(function (drive) {
      var Hload = OA._debug.diff1TransferLoadedAt(f, compD, op, drive, { ro: 1e-3, cl: 1e-9 });
      var Hfree = OA._debug.diff1TransferAt(f, compD, op, drive);
      maxRel = Math.max(maxRel, cmag(csub(Hload, Hfree)) / cmag(Hfree));
    });
  });
  assert.ok(maxRel < 1e-4, "maxRel=" + maxRel.toExponential(2));
});

/* diff1 闭式（无载+带载，双驱动方向）
   OP 行 vo=A(ei+vP−vx) ⇒ 恒等式 vo(1+Aβ)=A·ei + A·kp·vinp − A·km·vinm：
   H_plus=+A·kp/(1+Aβ), H_minus=−A·km/(1+Aβ)；带载: 各系数 ×D */
test("opamp: diff1 no-load closed forms (plus & minus)", function () {
  var op = OA.opampById("tp555x");
  var g1 = 1/compD.R1, g3 = 1/compD.R3;
  var kp = g1/(g1+g3);                       // R1=R2,R3=R4 ⇒ G1=G2,G3=G4
  var maxPlus = 0, maxMinus = 0; var N = 80;
  for (var i = 0; i < N; i++) {
    var f = 0.5 * Math.pow(5e6/0.5, i/(N-1));
    var w = 2*Math.PI*f;
    var A = OA._debug.aolAt(op, f);
    var Yf = C(1/compD.R4, w*compD.C4), g2 = C(1/compD.R2);
    var beta = cdiv(Yf, cadd(g2, Yf));
    var km = cdiv(g2, cadd(g2, Yf));
    var oneAb = cadd(C(1), cmul(A, beta));
    maxPlus  = Math.max(maxPlus,  cmag(csub(OA._debug.diff1TransferAt(f, compD, op, "plus"),  cdiv(cmul(A, C(kp)), oneAb))) / cmag(cdiv(cmul(A, C(kp)), oneAb)));
    maxMinus = Math.max(maxMinus, cmag(csub(OA._debug.diff1TransferAt(f, compD, op, "minus"), cdiv(cmul(A, C(-km[0], -km[1])), oneAb))) / cmag(cdiv(cmul(A, C(-km[0], -km[1])), oneAb)));
  }
  assert.ok(maxPlus < 1e-7 && maxMinus < 1e-7, "maxRel=" + Math.max(maxPlus, maxMinus).toExponential(2));
});

test("opamp: diff1 loaded closed forms (plus & minus)", function () {
  var op = OA.opampById("tp555x");
  var g1 = 1/compD.R1, g3 = 1/compD.R3;
  var kp = g1/(g1+g3);
  var load = { ro: op.ro_ohm, cl: 1e-9 };
  var maxLp = 0, maxLm = 0; var N = 80;
  for (var i = 0; i < N; i++) {
    var f = 0.5 * Math.pow(5e6/0.5, i/(N-1));
    var w = 2*Math.PI*f;
    var A = OA._debug.aolAt(op, f);
    var Yf = C(1/compD.R4, w*compD.C4), g2 = C(1/compD.R2);
    var beta = cdiv(Yf, cadd(g2, Yf));
    var km = cdiv(g2, cadd(g2, Yf));
    var D = OA._debug.dloadAt("diff1", w, compD, load.ro, load.cl);
    var oneAbD = cadd(C(1), cmul(cmul(A, beta), D));
    /* H_plus_L=+A·kp·D/(1+AβD)（vP 不与 vo 耦合，无馈通项）；
       H_minus_L=−(A−RoYf)·km·D/(1+AβD)（vinm 经 Yf 馈通到 vo 节点）*/
    var HpC = cdiv(cmul(cmul(A, C(kp)), D), oneAbD);
    maxLp = Math.max(maxLp, cmag(csub(OA._debug.diff1TransferLoadedAt(f, compD, op, "plus", load), HpC)) / cmag(HpC));
    var HmCC = cdiv(cmul(cmul(csub(A, cmul(C(load.ro), Yf)), C(-km[0], -km[1])), D), oneAbD);   // −(A−RoYf)·km·D/(1+AβD)
    maxLm = Math.max(maxLm, cmag(csub(OA._debug.diff1TransferLoadedAt(f, compD, op, "minus", load), HmCC)) / cmag(HmCC));
  }
  assert.ok(maxLp < 1e-7 && maxLm < 1e-7, "maxRel=" + Math.max(maxLp, maxLm).toExponential(2));
});

test("opamp: cl=0 regression (validated reference values)", function () {
  var r = OA.analyzeMfb2(compM, OA.opampById("tp6004"), { fc_hz: fcM });
  assert.ok(Math.abs(r.pmDeg - 90.34) < 0.05, "pm got " + r.pmDeg);
  assert.ok(r.crossoverHz > 0.85e6 && r.crossoverHz < 1.15e6, "fxc got " + r.crossoverHz);
  assert.ok(Math.abs(r.noiseDensity1k_nVrtHz - 195.3)/195.3 < 0.02, "n1k got " + r.noiseDensity1k_nVrtHz);
  assert.ok(Math.abs(r.noiseRms_uV - 34.97)/34.97 < 0.02, "nrms got " + r.noiseRms_uV);
  assert.ok(Math.abs(r.offsetWorst_mV - 17.04)/17.04 < 0.02, "off got " + r.offsetWorst_mV);
});

test("opamp: PM/fxc/L(fc) monotone in C_L", function () {
  var op = OA.opampById("tp6004");
  var res = [0, 10, 100, 1000].map(function (cl) { return OA.analyzeMfb2(compM, op, { fc_hz: fcM, cl_pf: cl }); });
  for (var i = 1; i < res.length; i++) {
    assert.ok(res[i].pmDeg <= res[i-1].pmDeg + 1e-9, "PM not monotone at step " + i);
    assert.ok(res[i].crossoverHz <= res[i-1].crossoverHz + 1e-6, "fxc not monotone at step " + i);
    assert.ok(res[i].loopGainAtFc_dB <= res[i-1].loopGainAtFc_dB + 1e-9, "L(fc) not monotone at step " + i);
  }
});

test("opamp: PM drop (0→1nF) > 2°", function () {
  var op = OA.opampById("tp6004");
  var r0 = OA.analyzeMfb2(compM, op, { fc_hz: fcM });
  var rL = OA.analyzeMfb2(compM, op, { fc_hz: fcM, cl_pf: 1000 });
  assert.ok(r0.pmDeg - rL.pmDeg > 2, "drop=" + (r0.pmDeg - rL.pmDeg).toFixed(2));
});

test("opamp: loopGainAtFc_dB == 20log|Aβ|(fc)", function () {
  var op = OA.opampById("tp6004");
  var r = OA.analyzeMfb2(compM, op, { fc_hz: fcM });
  var Afc = OA._debug.aolAt(op, fcM), betaFc = OA._debug.mfb2BetaAt(fcM, compM);
  var Lref = 20 * Math.log10(cmag(cmul(Afc, betaFc)));
  assert.ok(Math.abs(r.loopGainAtFc_dB - Lref) < 1e-6, "got " + r.loopGainAtFc_dB + " vs " + Lref);
});

test("opamp: tp6004 no w.gbWLow; ne5532 L(fc) > tp6004+10dB", function () {
  var op = OA.opampById("tp6004");
  var r = OA.analyzeMfb2(compM, op, { fc_hz: fcM });
  assert.ok(r.warnings.indexOf("w.gbWLow") === -1, JSON.stringify(r.warnings));
  var rN = OA.analyzeMfb2(compM, NE5532, { fc_hz: fcM });
  assert.ok(rN.loopGainAtFc_dB > r.loopGainAtFc_dB + 10, rN.loopGainAtFc_dB.toFixed(1) + " vs " + r.loopGainAtFc_dB.toFixed(1));
});

test("opamp: low-GBW part fires w.gbWLow", function () {
  var stress = { id: "stress", name: "stress", gbw_hz: 2e4, aol_db: 86, enW_nv: 30, en_corner_hz: 10, in_pa: 5, ib_a: 50e-9, eio_uv_max: 500, ro_ohm: 50 };
  var rS = OA.analyzeMfb2(compM, stress, { fc_hz: fcM });
  assert.ok(rS.warnings.indexOf("w.gbWLow") !== -1, "Lfc=" + rS.loopGainAtFc_dB);
});

test("opamp: tolerance reports DC-gain range only (exact ±tol)", function () {
  var op = OA.opampById("tp6004");
  var t = 0.01;
  var rt = OA.analyzeMfb2(compM, op, { fc_hz: fcM, tol: t });
  assert.ok(rt.tolerance && Math.abs(rt.tolerance.pct - 1) < 1e-9 && Array.isArray(rt.tolerance.gain), JSON.stringify(Object.keys(rt.tolerance)));
  assert.ok(!("fc" in rt.tolerance) && !("q" in rt.tolerance) && !("ngMax_dB" in rt.tolerance), "unexpected keys: " + JSON.stringify(Object.keys(rt.tolerance)));
  var G0 = compM.R2/compM.R1;
  assert.ok(Math.abs(rt.tolerance.gain[0] - G0*(1-t)/(1+t)) < 1e-12 && Math.abs(rt.tolerance.gain[1] - G0*(1+t)/(1-t)) < 1e-12, JSON.stringify(rt.tolerance.gain));
});

test("opamp: tolerance offset ≥ baseline (corner upgrade)", function () {
  var op = OA.opampById("tp6004");
  var base = OA.analyzeMfb2(compM, op, { fc_hz: fcM });
  var rt = OA.analyzeMfb2(compM, op, { fc_hz: fcM, tol: 0.01 });
  assert.ok(rt.offsetWorst_mV >= base.offsetWorst_mV - 1e-9, rt.offsetWorst_mV + " vs " + base.offsetWorst_mV);
});

test("opamp: diff1 loaded PM finite and decreases with C_L", function () {
  var op = OA.opampById("tp6004");
  var r0 = OA.analyzeDiff1(compD, op, { fc_hz: diffDesign.fc_actual });
  var rL = OA.analyzeDiff1(compD, op, { fc_hz: diffDesign.fc_actual, cl_pf: 100 });
  assert.ok(isFinite(r0.pmDeg) && isFinite(rL.pmDeg), JSON.stringify([r0.pmDeg, rL.pmDeg]));
  assert.ok(rL.pmDeg < r0.pmDeg - 0.5, rL.pmDeg + " vs " + r0.pmDeg);
});

/* ================================================== */

process.stderr.write("\n" + "=".repeat(50) + "\n");
process.stderr.write("Total: " + total + " | Passed: " + passed + " | Failed: " + failed + "\n");

if (failed > 0) {
  process.stderr.write("RESULT: FAILED\n");
  process.exit(1);
} else {
  process.stderr.write("RESULT: ALL PASSED\n");
  process.exit(0);
}
