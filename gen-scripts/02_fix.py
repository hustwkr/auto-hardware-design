import sys
sys.stdin.reconfigure(encoding="utf-8")
c = sys.stdin.read()

c = c.replace("lh:mh||lh", "lh:lh")

old = 'document.querySelectorAll(\\".seg\\\").forEach(function(s,i){s.querySelector(\\".seg>:first-child>:first-child\\\").textContent=\\\"时段\\\"+(i+1)})'
new = 'document.querySelectorAll(\\".seg\\\").forEach(function(s,i){s.querySelector(\\".seg>div>:first-child\\\").textContent=\\\"时段\\\"+(i+1)})'
if old in c:
    c = c.replace(old, new)
    print("Fixed selector", file=sys.stderr)
else:
    print("Selector not found - checking...", file=sys.stderr)
    idx = c.find("querySelectorAll")
    if idx > -1:
        print(c[idx:idx+200], file=sys.stderr)

sys.stdout.write(c)
sys.stdout.flush()
print(f"Done: {len(c)} bytes", file=sys.stderr)
