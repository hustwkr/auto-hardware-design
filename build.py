# 电解电容寿命计算工具 - 构建脚本
# Electrolytic Capacitor Lifetime Calculator - Build Script
# 按顺序运行所有生成脚本以产生最终 HTML

import sys, os, subprocess

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
GEN_DIR = os.path.join(SCRIPTS_DIR, "gen-scripts")
OUTPUT = os.path.join(SCRIPTS_DIR, "index.html")

scripts = [
    "01_base.py",
    "02_fix.py",
    "03_frequency.py",
    "04_katex_inputs.py",
    "05_latex_formulas.py",
    "06_fix_cf_position.py",
    "07_fix_double_cf.py",
    "08_export_word.py",
    "09_fix_escaping.py",
    "10_readable_fallback.py",
]

print("=" * 60)
print("电解电容寿命计算工具 - 构建")
print("Electrolytic Capacitor Lifetime Calculator - Build")
print("=" * 60)

for i, script in enumerate(scripts, 1):
    path = os.path.join(GEN_DIR, script)
    if not os.path.exists(path):
        print(f"[{i}/{len(scripts)}] SKIP: {script} (not found)")
        continue
    print(f"[{i}/{len(scripts)}] Running: {script}...", end=" ")
    sys.stdout.flush()
    result = subprocess.run(
        [sys.executable, path],
        cwd=GEN_DIR,
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        print("OK")
    else:
        print(f"FAILED (return code {result.returncode})")
        print(f"  Error: {result.stderr[:200] if result.stderr else 'Unknown'}")

size = os.path.getsize(OUTPUT) if os.path.exists(OUTPUT) else 0
print(f"\nDone. Output: {OUTPUT} ({size:,} bytes)")
