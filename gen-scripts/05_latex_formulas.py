import sys
sys.stdin.reconfigure(encoding="utf-8")
t = sys.stdin.read()

# 1. Insert renderLatex function before calc()
calc_idx = t.find("function calc()")
rl_func = """function renderLatex(){try{document.querySelectorAll('.latex').forEach(function(e){try{var w=window;if(!w.katex)return;w.katex.render(e.getAttribute('data-l'),e,{throwOnError:false})}catch(er){}})}catch(er){}}
"""
t = t[:calc_idx] + rl_func + t[calc_idx:]

# 2. Insert calcFormulas function before exportWord()
ew_idx = t.find("function exportWord")
cf_func = """function calcFormulas(){var d=window._cd;if(!d||!d.sr||!d.sr.length)return '';var fs='';d.sr.forEach(function(r){fs+='<p style=margin:4px 0><b>\u65f6\u6bb5'+r.i+':</b> <span class=latex data-l=\"L_i = L_0 \\times 2^{\\frac{T_{max} - T_{hs_i}}{10}} \\times K_V\"></span> = <span class=latex data-l=\"'+d.l0+' \\times 2^{\\frac{'+d.tmax+'-'+r.ths.toFixed(1)+'}{10}} \\times '+r.kv.toFixed(3)+'\"></span> = <span class=latex data-l=\"'+r.Li.toFixed(0)+'\\,\\text{h}\"></span></p>';if(r.rd&&r.rd.length){fs+='<p style=margin:2px 0 4px 20px;font-size:.82rem;color:#555>';r.rd.forEach(function(x,i){if(i>0)fs+=' + ';fs+=x.iop+'mA@'+x.f+'Hz(K='+x.k.toFixed(2)+')'});fs+='<br><span class=latex data-l=\"\\Delta T = \\Delta T_0 \\times \\sum_j \\left(\\frac{I_j}{I_{rated} \\times K_{freq_j}}\\right)^2 / C\"></span> = '+r.dt.toFixed(2)+'C, T_{hs}='+r.ths.toFixed(1)+'C</p>'}});fs+='<p style=margin:4px 0><b>\u7d2f\u8ba1:</b> <span class=latex data-l=\"D = \\sum_i \\frac{t_i \\times days}{L_i}\"></span> = ';var ft=true;d.sr.forEach(function(r){if(!ft)fs+=' + ';ft=false;fs+=r.dur.toFixed(1)+'x'+d.wd+'/'+r.Li.toFixed(0)});fs+=' = '+(d.dmg*100).toFixed(3)+'%/\u5e74, \u5bff\u547d = 1/('+d.dmg.toFixed(6)+') = '+d.ly.toFixed(1)+'\u5e74</p>';return fs}
"""
t = t[:ew_idx] + cf_func + "\n" + t[ew_idx:]

# 3. Insert calcFormulas() call before section 5 in genRep and rename to 6
old_sec5 = '<h3>5. \u8bbe\u8ba1\u5efa\u8bae</h3><ul style=margin:4px 0 0 20px>'
new_sec5 = 'calcFormulas()+\"<h3>6. \u8bbe\u8ba1\u5efa\u8bae</h3><ul style=margin:4px 0 0 20px>'
# But we need to include the + before it
# The pattern is: +"<h3>5. 设计建议...
# Change to: +calcFormulas()+"<h3>6. 设计建议...
old_full = '+\"' + old_sec5
new_full = '+calcFormulas()+\"' + new_sec5
t = t.replace(old_full, new_full)

# 4. Add renderLatex call after genRep's innerHTML
rc_marker = 'document.getElementById("rc").innerHTML='
rc_idx = t.find(rc_marker, t.find("function genRep"))
rc_semi = t.find(";", rc_idx)
t = t[:rc_semi+1] + 'setTimeout(renderLatex,200);' + t[rc_semi+1:]

sys.stdout.write(t)
sys.stdout.flush()
print("calcFormulas + renderLatex + genRep mods applied", file=sys.stderr)
print(f"Size: {len(t)} bytes", file=sys.stderr)
