p = r"C:\Users\Lenovo\Documents\Codex\2026-06-02\webapp-testing\outputs\electrolytic-capacitor-lifetime.html"
t = open(p, "r", encoding="utf-8").read()

# Fix KaTeX CDN script to not block loading
t = t.replace(
    '<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>',
    '<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" defer></script>'
)

# Fix calcFormulas insertion - insert BEFORE genRep instead of before exportWord
# First, remove the incorrectly placed calcFormulas
cf_start = t.find("function calcFormulas")
if cf_start > 0:
    # Find the next function after calcFormulas
    next_fn = t.find("\nfunction init", cf_start)
    if next_fn < 0:
        next_fn = t.find("\nfunction fv", cf_start)
    if next_fn < 0:
        next_fn = cf_start + 2000  # estimate
    # Remove the bad calcFormulas
    t = t[:cf_start] + t[next_fn:]
    print("Removed misplaced calcFormulas")

# Re-insert calcFormulas in the right place - before genRep
gr_idx = t.find("function genRep")
cf_func = """function calcFormulas(){var d=window._cd;if(!d||!d.sr||!d.sr.length)return '';var fs='';d.sr.forEach(function(r){fs+='<p style=margin:4px 0><b>\u65f6\u6bb5'+r.i+':</b> <span class=latex data-l=\"L_i = L_0 \\times 2^{\\frac{T_{max} - T_{hs_i}}{10}} \\times K_V\"></span> = <span class=latex data-l=\"'+d.l0+' \\times 2^{\\frac{'+d.tmax+'-'+r.ths.toFixed(1)+'}{10}} \\times '+r.kv.toFixed(3)+'\"></span> = <span class=latex data-l=\"'+r.Li.toFixed(0)+'\\,\\text{h}\"></span></p>';if(r.rd&&r.rd.length){fs+='<p style=margin:2px 0 4px 20px;font-size:.82rem;color:#555>';r.rd.forEach(function(x,i){if(i>0)fs+=' + ';fs+=x.iop+'mA@'+x.f+'Hz(K='+x.k.toFixed(2)+')'});fs+='<br><span class=latex data-l=\"\\Delta T = \\Delta T_0 \\times \\sum_j \\left(\\frac{I_j}{I_{rated} \\times K_{freq_j}}\\right)^2 / C\"></span> = '+r.dt.toFixed(2)+'C, T_{hs}='+r.ths.toFixed(1)+'C</p>'}});fs+='<p style=margin:4px 0><b>\u7d2f\u8ba1:</b> <span class=latex data-l=\"D = \\sum_i \\frac{t_i \\times days}{L_i}\"></span> = ';var ft=true;d.sr.forEach(function(r){if(!ft)fs+=' + ';ft=false;fs+=r.dur.toFixed(1)+'x'+d.wd+'/'+r.Li.toFixed(0)});fs+=' = '+(d.dmg*100).toFixed(3)+'%/\u5e74, \u5bff\u547d = 1/('+d.dmg.toFixed(6)+') = '+d.ly.toFixed(1)+'\u5e74</p>';return fs}
"""
t = t[:gr_idx] + cf_func + "\n" + t[gr_idx:]

with open(p, "w", encoding="utf-8") as f:
    f.write(t)
print(f"Fixed. Size: {len(t)} bytes")

# Verify
si = t.find("<script>") + 8
ei = t.find("</script>", si)
js = t[si:ei]
print(f"Main JS: {len(js)} chars")
for fn in ["renderLatex", "calcFormulas", "calc(", "genRep", "init"]:
    print(f"  {fn}: {'OK' if 'function '+fn in js else 'MISSING'}")
