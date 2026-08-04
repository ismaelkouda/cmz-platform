#!/bin/sh
# Génère env.js depuis env.template.js (audit G-5 / ADR-0007) et le CSP
# depuis csp.template.conf (audit-workspace-2026-08-03.md, I-14/I-15),
# puis démarre nginx.
set -eu

TEMPLATE="${CMZ_ENV_TEMPLATE:-/etc/cmz/env.template.js}"
TARGET="${CMZ_ENV_TARGET:-/usr/share/nginx/html/env.js}"
CSP_TEMPLATE="${CMZ_CSP_TEMPLATE:-/etc/cmz/csp.template.conf}"
CSP_TARGET="${CMZ_CSP_TARGET:-/etc/nginx/conf.d/csp.conf}"

# Défauts = mêmes valeurs que public/env.js (dev / proxy Angular)
: "${CMZ_AUTHENTICATION_URL:=/api/auth/}"
: "${CMZ_REPORT_URL:=/api/report/}"
: "${CMZ_SETTING_URL:=/api/settings/}"
: "${CMZ_FILE_URL:=/api/file/}"
: "${CMZ_ENVIRONMENT_DEPLOYMENT:=PROD}"
: "${CMZ_ENABLE_DEBUG:=false}"
# CSP frame-src pour l'iframe Grafana (GrafanaEmbedComponent) : PAS de valeur
# par défaut non vide — l'origine Grafana n'est jamais une constante de code
# (elle vient de la réponse backend, `grafanaLink`), donc pas dérivable ici.
# Défaut = échoue fermé (iframe Grafana bloquée par CSP tant que ce n'est
# pas positionné), jamais `*`. Une seule variable pour deux consommateurs :
# l'en-tête CSP (frame-src) ET l'allowlist app-level (window.__env.
# trustedFrameOrigins, TrustedOriginPort/SafeUrlPipe) — voir plus bas.
: "${CMZ_CSP_FRAME_SRC:=}"

export CMZ_AUTHENTICATION_URL CMZ_REPORT_URL CMZ_SETTING_URL CMZ_FILE_URL \
    CMZ_ENVIRONMENT_DEPLOYMENT CMZ_ENABLE_DEBUG CMZ_CSP_FRAME_SRC

# --- CSP connect-src : dérivé des 4 URLs backend, pas d'une 5e variable ---
# Les 4 URLs partagent aujourd'hui un même hôte (api-services.mazone-test.
# ansut.ci, avec des préfixes de chemin différents) ; rien ne garantit que ce
# sera toujours le cas, donc on extrait l'origine (schéma+hôte) de chacune et
# on déduplique, plutôt que de supposer un hôte unique.
csp_connect_src=""
for url in "$CMZ_AUTHENTICATION_URL" "$CMZ_REPORT_URL" "$CMZ_SETTING_URL" "$CMZ_FILE_URL"; do
    case "$url" in
        http://* | https://*)
            origin=$(printf '%s' "$url" | sed -E 's#^(https?://[^/]+).*#\1#')
            case " $csp_connect_src " in
                *" $origin "*) ;; # déjà présente
                *) csp_connect_src="$csp_connect_src $origin" ;;
            esac
            ;;
        *) ;; # URL relative (dev local, proxy /api/*) — 'self' suffit déjà
    esac
done
# shellcheck disable=SC2001
CMZ_CSP_CONNECT_SRC=$(printf '%s' "$csp_connect_src" | sed -E 's/^ +//')
export CMZ_CSP_CONNECT_SRC

# --- window.__env.trustedFrameOrigins : même variable que frame-src, format
# JSON pour le JS plutôt que le format CSP (liste espacée) ---
trusted_frame_origins_json=""
for origin in $CMZ_CSP_FRAME_SRC; do
    case "$trusted_frame_origins_json" in
        "") trusted_frame_origins_json="\"$origin\"" ;;
        *) trusted_frame_origins_json="$trusted_frame_origins_json,\"$origin\"" ;;
    esac
done
CMZ_TRUSTED_FRAME_ORIGINS_JSON="[$trusted_frame_origins_json]"
export CMZ_TRUSTED_FRAME_ORIGINS_JSON

# n'exporter que les placeholders du template (évite de polluer avec $PATH etc.)
# shellcheck disable=SC2016
envsubst '${CMZ_AUTHENTICATION_URL} ${CMZ_REPORT_URL} ${CMZ_SETTING_URL} ${CMZ_FILE_URL} ${CMZ_ENVIRONMENT_DEPLOYMENT} ${CMZ_ENABLE_DEBUG} ${CMZ_TRUSTED_FRAME_ORIGINS_JSON}' \
    <"$TEMPLATE" >"$TARGET"

echo "cmz: wrote runtime config → ${TARGET} (env=${CMZ_ENVIRONMENT_DEPLOYMENT})"

envsubst '${CMZ_CSP_CONNECT_SRC} ${CMZ_CSP_FRAME_SRC}' \
    <"$CSP_TEMPLATE" >"$CSP_TARGET"

echo "cmz: wrote CSP → ${CSP_TARGET} (connect-src=${CMZ_CSP_CONNECT_SRC:-<self only>}; frame-src=${CMZ_CSP_FRAME_SRC:-<none — Grafana iframe bloquée si non renseigné>})"

exec nginx -g 'daemon off;'
