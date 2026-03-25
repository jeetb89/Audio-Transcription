"""Run Alembic with ``backend/alembic.ini`` from any working directory."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> None:
    backend = Path(__file__).resolve().parents[2]
    ini = backend / "alembic.ini"
    if not ini.is_file():
        print(f"Missing Alembic config: {ini}", file=sys.stderr)
        raise SystemExit(1)
    cmd = [sys.executable, "-m", "alembic", "-c", str(ini), *sys.argv[1:]]
    raise SystemExit(subprocess.call(cmd, cwd=str(backend)))
