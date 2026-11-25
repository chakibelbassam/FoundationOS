"""Run acceptance for a named FoundationOS version through its maintained fixture."""
import argparse
from pathlib import Path
import re
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("version", help="version number, e.g. 0.1")
args = parser.parse_args()
if not re.fullmatch(r"[0-9]+\.[0-9]+", args.version):
    parser.error("Use a version number.")
folder = root / "versions" / (args.version + " FoundationOS")
if not folder.is_dir():
    parser.error("Unknown version")
checks = [folder / component / "verify.py" for component in ("FoundationOS Server", "FoundationOS")]
available = [test for test in checks if test.is_file()]
if not available:
    parser.exit(2, f"No acceptance fixture available for {args.version}.\n")
for test in available:
    subprocess.run([sys.executable, "-B", str(test)], cwd=folder, check=True)
for missing in set(checks) - set(available):
    print("Not exercised:", missing.parent.name, "(no version acceptance fixture)")
