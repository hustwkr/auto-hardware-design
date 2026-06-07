import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add the missing sCalcFormulas function before sGenRep
sCalcFunc = """function sCalcFormulas(d){if(!d||!d.results||!d.results.length)return '';var fs='<p style=margin:4px 0;font-size:.85rem><b>计算依据:</b></p>';var std=document.getElementById('sStd').selectedOptions[0].text;fs+='<ul style=margin:2px 0 2px 20px;font-size:.82rem;color:#555>'+(std.includes('IEC')?'<li>标准: IEC 60664-1</li>':'<li>标准: UL 840</li>')+'<li>电气间隙: 基于冲击电压'+document.getElementById('sOvc').value.toUpperCase()+'类过电压,海拔系数'+d.altk+'</li>'+'<li>爬电距离: PD '+d.pd+', 材料组别'+document.getElementById('sMg').selectedOptions[0].text+'</li>';var insK={func:1,basic:1,supp:1,reinf:2};d.results.forEach(function(r){var k=insK[r.ins]||1;if(k>1)fs+='<li>'+r.name+': '+r.insL+'绝缘x'+k+'</li>'});return fs+='</ul>'}
"""

content = content.replace('function sGenRep(){', sCalcFunc + 'function sGenRep(){')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fix applied successfully!")
