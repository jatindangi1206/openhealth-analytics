#!/usr/bin/env bash
set -euo pipefail

echo "[1/3] Running data_loaders.py"
python -u src/data_loaders.py

echo "[2/3] Running processors.py"
python -u src/processors.py

echo "[3/3] Running export_health_data.py"
python -u export_health_data.py

echo "Pipeline complete."
