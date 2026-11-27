"""Run acceptance for a named FoundationOS version through its maintained fixture."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("target", help="PI ID for PI verification, or a directly requested version")
parser.add_argument("--resolve-only", action="store_true", help="Print the selected launcher without running acceptance")
parser.add_argument("--expect-version", help="Refuse a target that differs from the requested release")
args = parser.parse_args()
version = args.target
pi = None
if re.fullmatch(r"PI-\d{2}", args.target):
    result = subprocess.run(["node", "Edge/tools/scrumWorkSpace.mjs", "query", json.dumps({"id": args.target})],
                            cwd=root, capture_output=True, text=True, check=True)
    pi = json.loads(result.stdout)
    version = pi.get("targetVersion")
    if version == "none":
        parser.error("Development setup has no product launcher.")
if not isinstance(version, str) or not re.fullmatch(r"[0-9]+\.[0-9]+(?:\.[0-9]+)?", version):
    parser.error("An explicit release version is required.")
folder = root / "versions" / (version + " FoundationOS")
if args.expect_version and version != args.expect_version:
    parser.error(f"Requested v{args.expect_version} conflicts with the recorded v{version}.")
launcher = folder / "Start.cmd"
if not launcher.is_file():
    parser.error(f"Missing launcher: {launcher}")
head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
changes = subprocess.check_output(["git", "status", "--porcelain", "--", str(folder)], cwd=root, text=True)
context = {"pi": pi["id"] if pi else None, "piRevision": pi["revision"] if pi else None,
           "targetVersion": version, "launcher": str(launcher), "sourceCommit": head,
           "versionFolderModified": bool(changes.strip())}
print(json.dumps(context), flush=True)
if args.resolve_only:
    sys.exit(0)
checks = [folder / component / "verify.py" for component in ("FoundationOS Server", "FoundationOS")]
available = [test for test in checks if test.is_file()]
if not available:
    parser.exit(2, f"No acceptance fixture available for {version}.\n")
for test in available:
    subprocess.run([sys.executable, "-B", str(test)], cwd=folder, check=True)
for missing in set(checks) - set(available):
    print("Not exercised:", missing.parent.name, "(no version acceptance fixture)")
