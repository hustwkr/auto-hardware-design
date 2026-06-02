p = r"C:\Users\Lenovo\Documents\Codex\2026-06-02\webapp-testing\outputs\electrolytic-capacitor-lifetime.html"
t = open(p, "r", encoding="utf-8").read()

# Change 1: FO array
t = t.replace(
    r'var FF={50:.85,60:.85,120:1,1e3:1.25,1e4:1.5,1e5:1.65},FO=[50,60,120,1e3,1e4,1e5];',
    r'var FF={50:.85,60:.85,120:1,1e3:1.25,1e4:1.5,1e5:1.65};'
)

# Change 2: mO -> mU
t = t.replace(
    r'function mO(){return FO.map(function(f){return"<option value="+f+">"+f+" Hz</option>"}).join("")}',
    r"function mU(){return '<select class=fu onchange=calc()><option value=1 selected>Hz</option><option value=1000>kHz</option></select>'}"
)

# Change 3: ripple row in mSeg
t = t.replace(
    r'rips.forEach(function(v){rr+="<tr><td><select onchange=calc()>"+mO()+"</select></td><td><input type=number value="+v+" min=0 step=10 style=width:90px oninput=calc()></td><td><button class=btn-sm onclick=removeRippleRow(this)>X</button></td></tr>"});',
    r'rips.forEach(function(v){rr+="<tr><td><input class=fv type=number value=120 style=width:65px oninput=calc()>"+mU()+"</td><td><input class=fc type=number value="+v+" min=0 step=10 style=width:80px oninput=calc()></td><td><button class=btn-sm onclick=removeRippleRow(this)>X</button></td></tr>"});'
)

# Change 4: addRR
old4 = r'function addRR(b){b.closest(".seg").querySelector(".rtb").insertAdjacentHTML("beforeend","<tr><td><select onchange=calc()>"+mO()+"</select></td><td><input type=number value=50 min=0 step=10 style=width:90px oninput=calc()></td><td><button class=btn-sm onclick=removeRippleRow(this)>X</button></td></tr>");calc()}'
new4 = r'function addRR(b){b.closest(".seg").querySelector(".rtb").insertAdjacentHTML("beforeend","<tr><td><input class=fv type=number value=120 style=width:65px oninput=calc()>"+mU()+"</td><td><input class=fc type=number value=50 min=0 step=10 style=width:80px oninput=calc()></td><td><button class=btn-sm onclick=removeRippleRow(this)>X</button></td></tr>");calc()}'
t = t.replace(old4, new4)

# Change 5: frequency reading
t = t.replace(
    r'f=+row.querySelector("select").value||120,iop=+row.querySelector("input").value||0;',
    r'f=(+row.querySelector(".fv").value||120)*(+row.querySelector(".fu").value||1),iop=+row.querySelector(".fc").value||0;'
)

with open(p, "w", encoding="utf-8") as f:
    f.write(t)

v = ["mO()" not in t, "mU()" in t, "class=fv" in t, "class=fc" in t, "class=fu" in t, "FO=[" not in t]
for i, ok in enumerate(v):
    print(f"  {i+1}: {'OK' if ok else 'FAIL'}")
print(f"File: {len(t)} bytes")
