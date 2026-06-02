p = r"C:\Users\Lenovo\Documents\Codex\2026-06-02\webapp-testing\outputs\electrolytic-capacitor-lifetime.html"
with open(p, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("lh:mh||lh", "lh:lh")

import re
old = 'document.querySelectorAll(\".seg\").forEach(function(s,i){s.querySelector(\".seg>:first-child>:first-child\").textContent=\"时段\"+(i+1)})'
new = 'document.querySelectorAll(\".seg\").forEach(function(s,i){s.querySelector(\".seg>div>:first-child\").textContent=\"时段\"+(i+1)})'
if old in c:
    c = c.replace(old, new)
    print("Fixed selector")
else:
    print("Selector not found - checking...")
    idx = c.find("querySelectorAll")
    if idx > -1:
        print(c[idx:idx+200])

with open(p, "w", encoding="utf-8") as f:
    f.write(c)
print(f"Done: {len(c)} bytes")
