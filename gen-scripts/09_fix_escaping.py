p = r"C:\Users\Lenovo\Documents\Codex\2026-06-02\webapp-testing\outputs\electrolytic-capacitor-lifetime.html"
t = open(p, "r", encoding="utf-8").read()

# Find calcFormulas function
cf_start = t.find("function calcFormulas")
cf_end = t.find("function genRep", cf_start)
old_cf = t[cf_start:cf_end]

# Fix LaTeX escaping: \times -> \\times, \frac -> \\frac, \right -> \\right, \text -> \\text
# These need DOUBLE backslash in JS to produce single backslash for LaTeX
new_cf = old_cf
replacements = [
    ("\\times", "\\\\times"),
    ("\\frac", "\\\\frac"),
    ("\\right", "\\\\right"),
    ("\\text", "\\\\text"),
]
for old, new in replacements:
    new_cf = new_cf.replace(old, new)

t = t[:cf_start] + new_cf + t[cf_end:]

with open(p, "w", encoding="utf-8") as f:
    f.write(t)
print("Fixed LaTeX escaping in calcFormulas")
print(f"Size: {len(t)} bytes")

# Verify the data-l attributes now have double backslashes
cf = t[t.find("function calcFormulas"):t.find("function genRep", t.find("function calcFormulas"))]
# Check for \\times (double backslash in JS source)
if "\\\\times" in cf:
    print("  \\\\times: OK")
if "\\\\frac" in cf:
    print("  \\\\frac: OK") 
if "\\\\right" in cf:
    print("  \\\\right: OK")
if "\\\\text" in cf:
    print("  \\\\text: OK")
