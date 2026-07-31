#!/usr/bin/env bash
# Smoke HTTP — GET processing/processing (all list, mock server port 3333 par défaut).
set -euo pipefail

BASE_URL="${REPORT_API_URL:-http://localhost:3333/api/report}"
URL="${BASE_URL}/processing?page=1&state=terminated"

echo "GET ${URL}"
curl -sfS "${URL}" | head -c 500
echo ""
