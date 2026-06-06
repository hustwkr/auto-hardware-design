#!/usr/bin/env python3
"""
Build orchestrator for auto-hardware-design.

Runs all gen-scripts in order, piping content through stdin/stdout,
then writes the final HTML to index.html in the project root.

Usage:
    python build.py              # Full rebuild from scratch
    python build.py --from 05    # Start from script 05 (reads current index.html)
    python build.py --list       # List all scripts
"""

import subprocess
import sys
import os
import glob

SCRIPTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gen-scripts")
OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")


def discover_scripts():
    """Find all gen-scripts sorted by name."""
    pattern = os.path.join(SCRIPTS_DIR, "*.py")
    scripts = sorted(glob.glob(pattern))
    # Filter out __init__.py and non-numbered files
    scripts = [s for s in scripts if os.path.basename(s).startswith(("0", "1"))]
    return scripts


def run_script(script_path, input_content):
    """Run a single gen-script, feeding input via stdin, capturing stdout."""
    name = os.path.basename(script_path)
    
    # Determine if this is 01_base.py (generates from scratch) or a transformer
    is_base = name.startswith("01_")
    
    try:
        cmd = [sys.executable, script_path]
        
        proc = subprocess.run(
            cmd,
            input=input_content if not is_base else None,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=30,
        )
        
        if proc.returncode != 0:
            print(f"  FAIL {name}: exit code {proc.returncode}")
            if proc.stderr:
                for line in proc.stderr.strip().split("\n"):
                    print(f"       {line}")
            return None
        
        # Print script's own status messages (stderr)
        if proc.stderr:
            for line in proc.stderr.strip().split("\n"):
                print(f"  >> {line}")
        
        output = proc.stdout
        if not is_base and len(output) <= 10:
            print(f"  WARN {name}: suspiciously small output ({len(output)} bytes)")
        
        return output
    
    except subprocess.TimeoutExpired:
        print(f"  FAIL {name}: timeout after 30s")
        return None
    except FileNotFoundError:
        print(f"  FAIL {name}: python not found")
        return None


def main():
    scripts = discover_scripts()
    
    if not scripts:
        print("No gen-scripts found in", SCRIPTS_DIR)
        sys.exit(1)
    
    # Handle --list
    if len(scripts) > 0 and "--list" in sys.argv:
        for s in scripts:
            name = os.path.basename(s)
            size = os.path.getsize(s)
            print(f"  {name} ({size:,} bytes)")
        return
    
    # Determine starting point
    start_idx = 0
    if "--from" in sys.argv:
        idx = sys.argv.index("--from") + 1
        if idx < len(sys.argv):
            prefix = sys.argv[idx]
            for i, s in enumerate(scripts):
                if os.path.basename(s).startswith(prefix):
                    start_idx = i
                    break
    
    print(f"auto-hardware-design build ({len(scripts) - start_idx} scripts)")
    print("-" * 50)
    
    # If starting from scratch (default), run all scripts
    if start_idx == 0:
        content = ""
        for i, script_path in enumerate(scripts):
            name = os.path.basename(script_path)
            is_base = name.startswith("01_")
            
            status = "generate" if is_base else "transform"
            print(f"\n[{i+1}/{len(scripts)}] {name} ({status})")
            
            content = run_script(script_path, content)
            if content is None:
                print("\nBuild FAILED at", name)
                sys.exit(1)
            
            print(f"  -> {len(content):,} bytes")
        
        # Write final output
        with open(OUTPUT, "w", encoding="utf-8") as f:
            f.write(content)
        
        print(f"\n{'=' * 50}")
        print(f"Build OK -> {OUTPUT} ({len(content):,} bytes)")
    
    else:
        # Start from existing index.html + apply remaining scripts
        if not os.path.exists(OUTPUT):
            print("No existing index.html found. Run without --from to rebuild.")
            sys.exit(1)
        
        with open(OUTPUT, "r", encoding="utf-8") as f:
            content = f.read()
        
        print(f"Reading {OUTPUT} ({len(content):,} bytes)")
        
        for i in range(start_idx, len(scripts)):
            script_path = scripts[i]
            name = os.path.basename(script_path)
            
            global_num = i + 1
            print(f"\n[{global_num}/{len(scripts)}] {name} (transform)")
            
            content = run_script(script_path, content)
            if content is None:
                print("\nBuild FAILED at", name)
                sys.exit(1)
            
            print(f"  -> {len(content):,} bytes")
        
        with open(OUTPUT, "w", encoding="utf-8") as f:
            f.write(content)
        
        print(f"\n{'=' * 50}")
        print(f"Build OK -> {OUTPUT} ({len(content):,} bytes)")


if __name__ == "__main__":
    main()
