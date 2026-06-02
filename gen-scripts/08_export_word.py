p = r"C:\Users\Lenovo\Documents\Codex\2026-06-02\webapp-testing\outputs\electrolytic-capacitor-lifetime.html"
t = open(p, "r", encoding="utf-8").read()

# 1. Update renderLatex with fallback
old_rl = r"function renderLatex(){try{document.querySelectorAll('.latex').forEach(function(e){try{var w=window;if(!w.katex)return;w.katex.render(e.getAttribute('data-l'),e,{throwOnError:false})}catch(er){}})}catch(er){}}"
new_rl = r"function renderLatex(){try{document.querySelectorAll('.latex').forEach(function(e){try{var w=window;if(!w.katex){e.textContent=e.getAttribute('data-l');return}w.katex.render(e.getAttribute('data-l'),e,{throwOnError:false})}catch(er){}})}catch(er){}}"
t = t.replace(old_rl, new_rl)

# 2. Add export button
old_btn = '<button class="btn btn-p" onclick="window.print()">'
new_btn = '<button class="btn" onclick="exportWord()">\u5bfc\u51fa Word</button>' + old_btn
t = t.replace(old_btn, new_btn)

# 3. Add exportWord function before init
init_marker = 'function init(){'
ew = r"""function exportWord(){var d=window._cd;if(!d||!d.sr||!d.sr.length)return;var pn=document.getElementById('projName').value,cm=document.getElementById('capModel').value,te=[];if(pn)te.push(pn);if(cm)te.push(cm);var ts=te.length?' ('+te.join(' - ')+')':'',sr='';d.sr.forEach(function(r){var rd=r.rd.length?r.rd.map(function(x){return x.iop+'mA@'+x.f+'Hz'}).join(', '):'\u65e0';sr+='<tr><td>\u65f6\u6bb5'+r.i+'</td><td>'+r.dur.toFixed(1)+'</td><td>'+r.ta.toFixed(1)+'</td><td>'+r.vop.toFixed(1)+'</td><td>'+r.dt.toFixed(2)+'</td><td>'+r.ths.toFixed(1)+'</td><td>'+r.kt.toFixed(2)+'</td><td>'+r.kv.toFixed(3)+'</td><td>'+r.Li.toFixed(0)+'</td><td>'+rd+'</td></tr>'});var fh=calcFormulas();fh=fh.replace(/<span class=latex data-l="([^"]*)"><\/span>/g,'$1');var lh=d.lh>=1e6?(d.lh/1e4).toFixed(1)+'\u4e07':d.lh.toFixed(0);var h='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><title>\u7535\u89e3\u7535\u5bb9\u5bff\u547d\u8bc4\u4f30\u62a5\u544a'+ts+'</title><style>body{font-family:SimSun,serif;font-size:11pt}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #000;padding:3px 6px;font-size:10pt}th{background:#eee}h2{font-size:13pt;margin-top:14px}</style></head><body>';h+='<h2 style="text-align:center">\u7535\u89e3\u7535\u5bb9\u5bff\u547d\u8bc4\u4f30\u62a5\u544a'+ts+'</h2>';h+='<p>\u62a5\u544a\u7f16\u53f7: EL-'+(new Date().toLocaleDateString('zh-CN').replace(/\//g,''))+'-'+(Math.floor(Math.random()*9000+1000))+'</p>';h+='<p>\u751f\u6210\u65e5\u671f: '+new Date().toLocaleDateString('zh-CN')+'</p>';h+='<h2>1. \u9879\u76ee\u4fe1\u606f</h2><table><tr><th>\u9879\u76ee</th><th>\u5185\u5bb9</th></tr>'+(pn?'<tr><td>\u9879\u76ee\u540d\u79f0</td><td>'+pn+'</td></tr>':'')+(cm?'<tr><td>\u7535\u5bb9\u578b\u53f7</td><td>'+cm+'</td></tr>':'')+'<tr><td>\u5e94\u7528\u573a\u666f</td><td>'+d.mi.l+'</td></tr><tr><td>\u6563\u70ed\u6761\u4ef6</td><td>'+document.getElementById('cooling').selectedOptions[0].text+'</td></tr><tr><td>\u5e74\u5de5\u4f5c\u5929\u6570</td><td>'+d.wd+'</td></tr><tr><td>\u76ee\u6807\u8d28\u4fdd\u671f</td><td>'+d.wt+'\u5e74</td></tr></table>';h+='<h2>2. \u7535\u5bb9\u5668\u989d\u5b9a\u53c2\u6570</h2><table><tr><th>\u53c2\u6570</th><th>\u6570\u503c</th></tr><tr><td>\u989d\u5b9a\u5bff\u547d L0</td><td>'+d.l0+' h</td></tr><tr><td>\u6700\u9ad8\u6e29\u5ea6 Tmax</td><td>'+d.tmax+' C</td></tr><tr><td>\u989d\u5b9a\u7535\u538b Vrated</td><td>'+d.vr+' V</td></tr><tr><td>\u989d\u5b9a\u7eb9\u6ce2 Irated</td><td>'+d.ir+' mA</td></tr><tr><td>\u6700\u5927\u82af\u6e29\u5347 DT0</td><td>'+d.dt0+' C</td></tr></table>';h+='<h2>3. \u8fd0\u884c\u5256\u9762</h2><table><tr><th>\u65f6\u6bb5</th><th>h/\u5929</th><th>Ta C</th><th>Vop V</th><th>DT C</th><th>Ths C</th><th>KT</th><th>KV</th><th>Li h</th><th>\u7eb9\u6ce2</th></tr>'+sr+'</table>';h+='<h2>4. \u7d2f\u79ef\u635f\u4f24</h2><table><tr><th>\u9879\u76ee</th><th>\u6570\u503c</th></tr><tr><td>\u5e74\u635f\u4f24 D</td><td>'+(d.dmg*100).toFixed(3)+'%</td></tr><tr><td>\u9884\u8ba1\u5bff\u547d</td><td>'+d.ly.toFixed(1)+' \u5e74 ('+lh+' h)</td></tr><tr><td>\u8d28\u4fdd\u671f\u76ee\u6807</td><td>'+d.wt+' \u5e74</td></tr><tr><td>\u5b9e\u9645\u88d5\u91cf</td><td>'+d.margin.toFixed(2)+'x</td></tr><tr><td>\u5224\u5b9a</td><td>'+d.ws+'</td></tr></table>';h+='<h2>5. \u8be6\u7ec6\u8ba1\u7b97\u8fc7\u7a0b</h2>'+fh;h+='<h2>6. \u8bbe\u8ba1\u5efa\u8bae</h2><ul><li>\u73af\u5883\u6e29\u5ea6\u6bcf\u964d\u4f4e10C\uff0c\u5bff\u547d\u7ea6\u5ef6\u957f\u4e00\u500d</li><li>'+(d.margin>=d.req?'\u88d5\u91cf\u6ee1\u8db3\u8981\u6c42':'\u88d5\u91cf\u4e0d\u8db3\uff0c\u9700\u6539\u5584\u8bbe\u8ba1')+'</li><li>\u5efa\u8bae\u6279\u91cf\u751f\u4ea7\u524d\u8fdb\u884c\u9ad8\u6e29\u8d1f\u8f7d\u8bd5\u9a8c\u9a8c\u8bc1</li></ul>';h+='<p style="margin-top:20px"><i>\u7535\u89e3\u7535\u5bb9\u5bff\u547d\u8ba1\u7b97\u5de5\u5177 v2.0 - \u62a5\u544a\u81ea\u52a8\u751f\u6210</i></p></body></html>';var b=new Blob([h],{type:'application/msword'});var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download='\u7535\u89e3\u7535\u5bb9\u5bff\u547d\u8bc4\u4f30\u62a5\u544a'+(te.length?'('+te.join('-')+')':'')+'.doc';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u)}
"""
t = t.replace(init_marker, ew + "\n" + init_marker)

with open(p, "w", encoding="utf-8") as f:
    f.write(t)
print("exportWord + renderLatex fallback added")

# Verify
si = t.find("<script>") + 8
ei = t.find("</script>", si)
js = t[si:ei]
sq = js.count("'")
dq = js.count('"')
ob = js.count("{")
cb = js.count("}")
print(f"JS: single={sq}(even={sq%2==0}) double={dq}(even={dq%2==0}) braces={ob}/{cb}(match={ob==cb})")
print(f"Has exportWord: {'function exportWord' in js}")
print(f"Has fallback: {'e.textContent=e.getAttribute' in js}")
print(f"Size: {len(t)} bytes")
