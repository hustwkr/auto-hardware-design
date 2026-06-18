# New Module Template

Copy this `new-module/` directory and rename it to your module name (e.g. `inductor/`).

## Quick Start

1. **Rename**: Copy `templates/new-module/` → `your-module/`
2. **Replace**: Search-and-replace `example` / `ExampleModel` with your module name throughout all files in the new directory.
3. **Register in index.html** — add a script tag in the `<head>` (models first, then UI):

   ```html
   <script src="js/models/your-model.js"></script>
   <script src="js/your-ui.js"></script>
   ```

4. **Add a tab button** in `index.html` and wire it to call `initYourModule()` from `app.js`.
5. **Move files**: After scaffolding, move the final `.js` files out of the template folder into their proper locations:
   - `your-module/js/models/your-model.js` → `js/models/your-model.js`
   - `your-module/js/your-ui.js` → `js/your-ui.js`
   - `your-module/tests/your.test.js` → add tests to the existing `tests/models.test.js` (or keep as a separate file)

## File Structure

```
new-module/
├── js/
│   ├── models/example-model.js   # Pure calculation model (IIFE, exports to global.ExampleModel)
│   └── example-ui.js             # UI layer (reads DOM, calls model, updates results)
├── tests/
│   └── example.test.js           # Node test stub using assert + eval pattern
└── README.md                     # This file
```

## Patterns to Follow

- **Model files**: IIFE that attaches pure functions to `global.YourModel`. No DOM access.
- **UI files**: IIFE that reads `global.YourModel`, exposes `initYour()` function, wires event listeners.
- **Tests**: Use the project's harness — `assert` + `eval()` with `(window)` → `(G)` replacement for Node compatibility.
