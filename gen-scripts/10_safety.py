import sys
import os

sys.stdin.reconfigure(encoding="utf-8")
c = sys.stdin.read()

# Read safety module from data file (avoids escaping issues)
data_dir = os.path.dirname(os.path.abspath(__file__))
safety_path = os.path.join(data_dir, "safety_section.txt")

with open(safety_path, 'r', encoding='utf-8') as f:
    safety_html = f.read()

# Insert before </body>
insert_point = c.rfind('</body>')
if insert_point >= 0:
    c = c[:insert_point] + "\n" + safety_html + c[insert_point:]

sys.stdout.write(c)
sys.stdout.flush()
print(f"Safety module added and integrated", file=sys.stderr)
