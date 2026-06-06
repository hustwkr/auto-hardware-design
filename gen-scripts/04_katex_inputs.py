import sys
sys.stdin.reconfigure(encoding="utf-8")
t = sys.stdin.read()

# Step A: Add KaTeX CDN references
t = t.replace(
    "</style>",
    "</style>\n<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css\">"
)
t = t.replace(
    "</head>",
    "<script src=\"https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js\"></script>\n</head>"
)

# Step B: Add project inputs after subtitle
old_sub = '<p style="color:#64748b;margin-bottom:24px;font-size:.9rem">Arrhenius + Miner '
new_card = '<div class="card" style="padding:12px 20px;margin-bottom:20px"><div class="fg"><div class="fgl"><label>\u9879\u76ee\u540d\u79f0</label><input type="text" id="projName" placeholder="\u9009\u586b" oninput="calc()"></div><div class="fgl"><label>\u7535\u5bb9\u578b\u53f7</label><input type="text" id="capModel" placeholder="\u9009\u586b" oninput="calc()"></div></div></div>'
sub_end = t.find("</p>", t.find(old_sub))
if sub_end > -1:
    t = t[:sub_end+4] + "\n" + new_card + t[sub_end+4:]

sys.stdout.write(t)
sys.stdout.flush()
print("KaTeX + project inputs added", file=sys.stderr)
print(f"Size: {len(t)} bytes", file=sys.stderr)
