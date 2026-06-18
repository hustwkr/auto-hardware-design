/* ===== Unit Tests for Example Model ===== */
/* Run: node tests/example.test.js                          */
/* Pure Node.js - zero dependencies (assert + fs only)      */

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

/* --- Load model into a fake global (browser -> node) -- */
var G = {};
eval(fs.readFileSync(path.join(__dirname, "../js/models/example-model.js"), "utf-8").replace("})(window)", "})(G)"));

var EM = G.ExampleModel;

process.stderr.write("\n--- ExampleModel ---\n");

test("fv formats numbers correctly", function () {
  assert.strictEqual(EM.fv(123.456, 2), "123.46");
  assert.strictEqual(EM.fv(null, 2), "-");
});

test("calcExample - basic calculation", function () {
  var result = EM.calcExample({ input: 5 });
  approx(result.result, 10, 0.01);
  assert.strictEqual(result.formatted, "10.00");
});

test("calcExample - zero input", function () {
  var result = EM.calcExample({ input: 0 });
  approx(result.result, 0, 0.01);
});

/* ── Summary ─────────────────────────────────────── */
process.stderr.write("\n" + passed + "/" + total + " tests passed\n");
if (failed > 0) { process.exit(1); }
