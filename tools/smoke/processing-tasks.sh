#!/usr/bin/env bash
# Smoke HTTP — GET processing/taken (mock server, port 3333 par défaut).
set -euo pipefail

BASE_URL="${REPORT_API_URL:-http://localhost:3333/api/report}"
URL="${BASE_URL}/taken?page=1"

echo "GET ${URL}"
curl -sfS "${URL}" | head -c 500
echo ""
