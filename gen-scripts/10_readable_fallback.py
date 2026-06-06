import sys
sys.stdin.reconfigure(encoding="utf-8")
t = sys.stdin.read()

# 1. Add latexToReadable function before renderLatex
rl_idx = t.find("function renderLatex")
ltor = """function l2r(l){try{return l.replace(/\\\\times/g,"\\u00D7").replace(/\\\\frac\\{([^}]+)\\}\\{([^}]+)\\}/g,"($1)/($2)").replace(/\\\\Delta/g,"\\u0394").replace(/\\\\sum/g,"\\u2211").replace(/\\\\left/g,"").replace(/\\\\right/g,"").replace(/\\\\text\\{([^}]+)\\}/g,"$1").replace(/\\\\cdot/g,"\\u00B7").replace(/\\\\,/g," ").replace(/\\^{([^}]+)\\}/g,"^($1)").replace(/\\^{([a-zA-Z0-9])}/g,"^$1").replace(/_{([^}]+)}/g,"_$1").replace(/{/g,"").replace(/}/g,"")}catch(e){return l}}
""" + "\n"
t = t[:rl_idx] + ltor + t[rl_idx:]

# 2. Update renderLatex fallback to use l2r
old_fallback = 'if(!w.katex){e.textContent=e.getAttribute("data-l");return}'
new_fallback = 'if(!w.katex){e.textContent=l2r(e.getAttribute("data-l"));return}'
t = t.replace(old_fallback, new_fallback)

# 3. Update Word export to use l2r for formulas
old_word_replace = 'fh=fh.replace(/<span class=latex data-l="([^"]*)"><\\/span>/g,"$1")'
new_word_replace = 'fh=fh.replace(/<span class=latex data-l="([^"]*)"><\\/span>/g,function(m,m1){return l2r(m1)})'
t = t.replace(old_word_replace, new_word_replace)

sys.stdout.write(t)
sys.stdout.flush()
print("latexToReadable function added and integrated", file=sys.stderr)
print(f"Size: {len(t)} bytes", file=sys.stderr)
