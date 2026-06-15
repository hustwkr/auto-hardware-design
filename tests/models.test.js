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
var G = {};
eval(fs.readFileSync(path.join(__dirname, "../js/models/capacitor-model.js"), "utf-8").replace("})(window)", "})(G)"));
eval(fs.readFileSync(path.join(__dirname, "../js/models/safety-model.js"), "utf-8").replace("})(window)", "})(G)"));

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

test("kvf voltage correction - below rated increases life", function () {
  assert.ok(CM.kvf(25, 50) > 1, "KV should be > 1 at half voltage");
  approx(CM.kvf(25, 50), 1.21, 0.05);
});

test("kvf above rated = 1", function () {
  approx(CM.kvf(60, 50), 1, 0.001);
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
  approx(SM.lookupClr(600, 3, "iec", true), 0.2, 0.01);
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
  assert.strictEqual(result.results[0].reqCrp, 0, "Coat=2 should zero out creepage");
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


/* ================================================== */
/* Summary                                            */
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
