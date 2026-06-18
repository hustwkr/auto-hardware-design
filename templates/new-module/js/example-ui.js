/* ===== Example Module — UI Layer ===== */
/* Imports: window.ExampleModel (models/example-model.js)         */
/* Exposes: initExample (called from app.js on tab switch)        */

(function (global) {
  "use strict";

  var EM = global.ExampleModel;
  if (!EM) { console.error("ExampleModel not loaded — load models/example-model.js first"); return; }

  /* ── Read params from DOM → call model → render results ─── */
  function calc() {
    // 1. Read inputs from the DOM (replace with your actual element IDs)
    var input = parseFloat(document.getElementById("exampleInput").value) || 0;

    // 2. Call pure model
    var result = EM.calcExample({ input: input });

    // 3. Update results in the DOM (replace with your actual element IDs)
    document.getElementById("exampleResult").textContent = result.formatted;
  }

  /* ── Init ──────────────────────── */
  function initExample() {
    // Set up initial state, wire event listeners on static inputs:
    var inputEl = document.getElementById("exampleInput");
    if (inputEl) {
      inputEl.addEventListener("input", calc);
    }

    // Run first calculation
    calc();
  }

  global.initExample = initExample;

})(window);
