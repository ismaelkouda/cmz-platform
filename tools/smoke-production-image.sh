#!/usr/bin/env bash
# Test permanent DOCKER-314. Docker réel exclusivement sur le runner Linux.
set -euo pipefail
image="$1"
if ! [[ "$image" =~ ^sha256:[a-f0-9]{64}$ ]]; then
    echo 'PRODUCTION_IMAGE_INVALID_ID' >&2
    exit 1
fi
container=''
root_file="$(mktemp)"
env_file="$(mktemp)"
cleanup() {
    status=$?
    if test -n "$container"; then
        if test "$status" -ne 0; then
            docker logs "$container" >&2 || true
            docker inspect "$container" >&2 || true
        fi
        docker rm -f "$container" > /dev/null || true
    fi
    rm -f "$root_file" "$env_file"
    return "$status"
}
trap cleanup EXIT
template="$(printenv CMZ_ENV_TEMPLATE || true)"
test -n "$template" || template=/etc/cmz/env.template.js.in
container="$(docker run --detach --pull=never --publish 127.0.0.1::8080 \
    -e CMZ_AUTHENTICATION_URL=/api/auth/ \
    -e CMZ_REPORT_URL=/api/report/ \
    -e CMZ_SETTING_URL=/api/settings/ \
    -e CMZ_FILE_URL=/api/file/ \
    -e CMZ_ENVIRONMENT_DEPLOYMENT=PROD \
    -e CMZ_ENABLE_DEBUG=false \
    -e CMZ_CSP_FRAME_SRC= \
    -e "CMZ_ENV_TEMPLATE=$template" "$image")"
running() {
    if test "$(docker inspect --format '{{.State.Running}}' "$container")" != true; then
        echo 'PRODUCTION_IMAGE_EXITED_BEFORE_HTTP' >&2
        exit 1
    fi
}
running
address="$(docker port "$container" 8080/tcp)"
if ! [[ "$address" =~ ^127\.0\.0\.1:[0-9]+$ ]]; then
    echo 'PRODUCTION_IMAGE_NOT_LOOPBACK' >&2
    exit 1
fi
deadline=$((SECONDS + 60))
while ((SECONDS < deadline)); do
    running
    status="$(curl --silent --show-error --connect-timeout 1 --max-time 2 \
        --output "$root_file" --write-out '%{http_code}' "http://$address/" || true)"
    if test "$status" = 200; then
        grep -Eq '<app-root[ >]' "$root_file"
        env_status="$(curl --silent --show-error --connect-timeout 1 --max-time 2 \
            --output "$env_file" --write-out '%{http_code}' "http://$address/env.js")"
        test "$env_status" = 200
        grep -F 'window.__env = {' "$env_file"
        grep -F "authenticationUrl: '/api/auth/'" "$env_file"
        grep -F "reportUrl: '/api/report/'" "$env_file"
        grep -F "settingUrl: '/api/settings/'" "$env_file"
        grep -F "fileUrl: '/api/file/'" "$env_file"
        grep -F "environmentDeployment: 'PROD'" "$env_file"
        grep -F 'enableDebug: false' "$env_file"
        grep -F 'trustedFrameOrigins: []' "$env_file"
        if grep -F '$' "$env_file"; then
            echo 'PRODUCTION_IMAGE_UNSUBSTITUTED_CONFIG' >&2
            exit 1
        fi
        echo "PRODUCTION_IMAGE_HTTP=PASS image=$image"
        exit 0
    fi
    sleep 1
done
echo 'PRODUCTION_IMAGE_HTTP_TIMEOUT' >&2
exit 1
