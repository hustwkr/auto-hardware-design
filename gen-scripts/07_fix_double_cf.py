p = r"C:\Users\Lenovo\Documents\Codex\2026-06-02\webapp-testing\outputs\electrolytic-capacitor-lifetime.html"
t = open(p, "r", encoding="utf-8").read()

# Fix the double calcFormulas
t = t.replace('calcFormulas()+"calcFormulas()+"', 'calcFormulas()+"')

# Also verify section 6 is correct
if 'calcFormulas()+"calcFormulas()' in t:
    print("Still has double calcFormulas!")
else:
    print("Double calcFormulas fixed!")

# Verify quote balance
si = t.find("<script>") + 8
ei = t.find("</script>", si)
js = t[si:ei]
sq = js.count("'")
dq = js.count('"')
ob = js.count("{")
cb = js.count("}")
print(f"JS: single={sq}(even={sq%2==0}) double={dq}(even={dq%2==0}) braces={ob}/{cb}(match={ob==cb})")

with open(p, "w", encoding="utf-8") as f:
    f.write(t)
print(f"Size: {len(t)} bytes")
