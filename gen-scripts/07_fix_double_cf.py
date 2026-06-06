import sys
sys.stdin.reconfigure(encoding="utf-8")
t = sys.stdin.read()

# Fix the double calcFormulas
t = t.replace('calcFormulas()+"calcFormulas()+"', 'calcFormulas()+"')

# Also verify section 6 is correct
if 'calcFormulas()+"calcFormulas()' in t:
    print("Still has double calcFormulas!", file=sys.stderr)
else:
    print("Double calcFormulas fixed!", file=sys.stderr)

# Verify quote balance
si = t.find("<script>") + 8
ei = t.find("</script>", si)
js = t[si:ei]
sq = js.count("'")
dq = js.count('"')
ob = js.count("{")
cb = js.count("}")
print(f"JS: single={sq}(even={sq%2==0}) double={dq}(even={dq%2==0}) braces={ob}/{cb}(match={ob==cb})", file=sys.stderr)

sys.stdout.write(t)
sys.stdout.flush()
print(f"Size: {len(t)} bytes", file=sys.stderr)
