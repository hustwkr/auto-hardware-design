/* ===== Example Module — Pure Calculation Model ===== */
/* Zero DOM dependency — all functions are pure, testable.         */

(function (global) {
  "use strict";

  /* ── Pure helpers ─────────────────────────────── */
  function fv(v, d) { return typeof v !== "number" || !isFinite(v) ? "-" : v.toFixed(d); }

  /* ── Example calculation (pure) ───────────────── */
  // Replace this with your actual model logic.
  // All functions here should be pure: same input → same output, no DOM access.
  function calcExample(params) {
    var input = params.input || 0;
    return {
      result: input * 2,       // placeholder — replace with real formula
      formatted: fv(input * 2, 2),
      input: input
    };
  }

  /* ── Expose to global scope ───────────────────── */
  global.ExampleModel = {
    fv: fv,
    calcExample: calcExample
  };

})(window);
