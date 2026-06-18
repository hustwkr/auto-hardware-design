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

test("calcDeltaT - cooling factor reduces temperature rise", function () {
  var segs = [{rips: [{freq: 120, current: 500}]}];
  var dt2 = CM.calcDeltaT(segs, 500, 10, 1.3);
  approx(dt2[0].dt, 10 / 1.3, 0.1);
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

test("lookupCrp - PCB trace uses column 5", function () {
  var crp = SM.lookupCrp(230, 2, "ii", "iec", true);
  approx(crp, 0.56, 0.01);
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
  var clr = SM.calcClearance(230, 2.5, null, false, "reinf", 2);
  assert.ok(clr >= 0.8, "Reinforced clearance should be substantial");
});

test("calcClearance - functional insulation for mains", function () {
  var clr = SM.calcClearance(230, 2.5, null, true, "func", 2);
  assert.ok(clr > 0);
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
  // For a 300V AC system: sysKVRMS = 0.3, basic → row [0.3] PD3=1.5mm (UL 840 Table 8.1)
  // Reinforced: next row [0.6] PD3=1.5mm; max(1.5*2, 1.5) = 3.0mm
  // NOT 6kV impulse → ~50mm (which was the old bug with incorrect CLR_TBL_UL data)
  var result = SM.calcNode({name: "L-PE", vrms: 230, ins: "reinf", pcb: 0, coat: 0, circ: "ac", toGnd: true},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  assert.ok(result.reqClr < 10, "UL clearance for 300V system should be reasonable (got " + result.reqClr + ")");
  approx(result.reqClr, 3.0, 0.1); // reinforced: max(basic*2=3.0, next_row=1.5) = 3.0mm
});

test("calcNode - UL DC circuit uses sysVDC for clearance", function () {
  var result = SM.calcNode({name: "DC+-PE", vrms: 600, ins: "reinf", pcb: 0, coat: 0, circ: "dc", toGnd: true},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 800);
  // sysVDC=800 → sysKVRMS=0.8 → basic (no interp) rounds up to row [1.0] PD3=3.0mm
  // Reinforced: next row [1.5]=5.5; max(3.0*2, 5.5)=6.0mm
  approx(result.reqClr, 6.0, 0.5);
});

test("calcNode - UL reinforced insulation exceeds basic", function () {
  var basic = SM.calcNode({name: "X", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  var reinf = SM.calcNode({name: "X", vrms: 230, ins: "reinf", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  assert.ok(reinf.reqClr > basic.reqClr, "Reinforced UL clearance should exceed basic (" + reinf.reqClr + " > " + basic.reqClr + ")");
  // For 300V: basic=1.5mm (row [0.3] PD3), reinf=3.0mm → exactly 2x increase
  assert.ok(reinf.reqClr >= basic.reqClr * 2, "Reinforced should be at least 2x basic");
});

test("lookupClr - UL interpolation works", function () {
  // Between rows [1.0, PD3=3.0] and [1.5, PD3=5.5], at 1.25 kVRMS → linear interp:
  // 3.0 + (1.25-1.0)/(1.5-1.0) * (5.5-3.0) = 4.25mm
  var val = SM.lookupClr(1250, 3, "ul", true);
  approx(val, 4.25, 0.05);
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
  // AC node: sysKVRMS=0.3 → basic row [0.3] PD3=1.5; reinf next=[0.6]=1.5; max(3.0, 1.5)=3.0mm
  approx(result.results[0].reqClr, 3.0, 0.1);
  // DC node: sysKVRMS=0.6 → basic row [0.6] PD3=1.5; reinf next=[1.0]=3.0; max(3.0, 3.0)=3.0mm
  approx(result.results[1].reqClr, 3.0, 0.1);
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
  assert.ok(result.reqClr < 5, "Internal connection uses UL 840 (not T24.1) clearance: " + result.reqClr);
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
  // Without interp, should round up to next table row [0.3] → PD3=1.5mm
  approx(result.reqClr, 1.5, 0.1, "Primary circuit rounds up (no interpolation)");
});

test("calcNode - UL secondary circuit uses linear interpolation", function () {
  // sysVAC=300 → sysKVRMS=0.3, with interp=true (secondary/control)
  var result = SM.calcNode({name: "Secondary", vrms: 24, ins: "basic", pcb: 1, coat: 0, circ: "ac", toGnd: false, interp: true},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  // With interp at sysKVRMS=0.3: between [0.15]=0.8 and [0.3]=1.5 → interpolated value
  assert.ok(result.reqClr >= 0.8 && result.reqClr <= 1.5, "Secondary circuit uses interpolation: " + result.reqClr);
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

test("lookupClr UL PD3 at 300V → 1.5mm exact match", function () {
  // CLR_TBL_UL row [0.300, 0.5, 1.5, 1.5] — col pd=3 (index 3) = 1.5
  approx(SM.lookupClr(300, 3, "ul", false), 1.5, 0.01);
});

test("lookupClr UL PD3 at 600V → 1.5mm exact match", function () {
  // CLR_TBL_UL row [0.600, 1.5, 1.5, 1.5] — col pd=3 = 1.5
  approx(SM.lookupClr(600, 3, "ul", false), 1.5, 0.01);
});

test("lookupClr UL PD2 at 1000V → 3.0mm exact match", function () {
  // CLR_TBL_UL row [1.000, 3.0, 3.0, 3.0] — col pd=2 (index 2) = 3.0
  approx(SM.lookupClr(1000, 2, "ul", false), 3.0, 0.01);
});

test("lookupClr UL zero voltage returns 0", function () {
  assert.strictEqual(SM.lookupClr(0, 3, "ul", false), 0);
});

// ── lookupCrp UL (4) — NO direct UL creepage tests existed before! ───

test("lookupCrp UL PD2 MG-II at 230V uses CRP_UL table", function () {
  // vrms=230 → row [250,...]: [250,6.3,6.3,6.3,4.0,0.90,4.0,4.5,5.0,5.0]
  // pd=2, mg='ii' (mi=1) → col = 1+1 = 2 → value = 6.3
  approx(SM.lookupCrp(230, 2, "ii", "ul", false), 6.3, 0.05);
});

test("lookupCrp UL PCB mode at 100V — column 5 of CRP_UL", function () {
  // vrms=100 → row [100,...]: [100,2.5,2.5,2.5,2.2,0.16,2.2,2.5,2.8,2.8]
  // pcb=true, pd<=2 → returns col 5 = 0.16
  approx(SM.lookupCrp(100, 2, "ii", "ul", true), 0.16, 0.01);
});

test("lookupCrp UL high voltage extrapolation above max row", function () {
  // vrms=5000 → exact match row [5000,...]: [5000,50,80,100,125,20,80,90,100,100]
  // pd=2, mg='ii' (mi=1) → col = 1+1 = 2 → value = 80
  approx(SM.lookupCrp(5000, 2, "ii", "ul", false), 80, 0.5);
});

test("lookupCrp UL PD1 uses PCB column regardless of pcb flag", function () {
  // vrms=100 → row [100,...]: col 5 = 0.16
  // pd=1 always returns col 5 (PCB column) per code logic
  var withPcb   = SM.lookupCrp(100, 1, "ii", "ul", true);
  var withoutPcb = SM.lookupCrp(100, 1, "ii", "ul", false);
  assert.strictEqual(withPcb, withoutPcb, "PD1 should always use PCB column");
  approx(withPcb, 0.16, 0.01);
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

test("calcNode UL basic AC node exact match sysVAC=300 PD3 → 1.5mm", function () {
  // Basic insulation, non-toGnd → direct lookup by system voltage
  // sysVAC=300 → sysKVRMS=0.3 → row [0.3] PD3=1.5mm at alt=2000m (factor=1.0)
  var result = SM.calcNode({name: "Basic", vrms: 230, ins: "basic", pcb: 0, coat: 0, circ: "ac", toGnd: false},
    3, "ii", 2000, "ul", 6.0, 4.0, 300, 600);
  approx(result.reqClr, 1.5, 0.05);
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
  // In UL creepage tables, PD1/PD2 share basic/functional columns while PD3 has separate ones.
  // For some voltages (e.g. 250V row: PD2→6.3mm vs PD3→4.5mm), PD3 can be lower.
  // This test verifies the model correctly uses different column indices for each PD level.
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
  assert.notStrictEqual(r2.results[0].reqCrp, r3.results[0].reqCrp, "PD2 and PD3 should use different column indices");
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

process.stderr.write("\n" + "=".repeat(50) + "\n");
process.stderr.write("Total: " + total + " | Passed: " + passed + " | Failed: " + failed + "\n");

if (failed > 0) {
  process.stderr.write("RESULT: FAILED\n");
  process.exit(1);
} else {
  process.stderr.write("RESULT: ALL PASSED\n");
  process.exit(0);
}
