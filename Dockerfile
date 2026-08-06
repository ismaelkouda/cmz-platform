# syntax=docker/dockerfile:1
#
# Image de production — CMZ backoffice Angular (audit G-4 / G-5).
#
# Contrainte ADR-0006 : copier `tools/` **avant** `bun install` (preinstall).
# Config runtime ADR-0007 : `env.js` généré à l'entrypoint depuis
# `deploy/env.template.js.in` (variables CMZ_* ; suffixe .in = template
# envsubst, pas du JS source pour Prettier).
#
# Build :
#   docker build -t cmz-backoffice .
# Run (ex. environnement de test — audit-workspace-2026-08-03.md, I-14/I-15) :
#   docker run --rm -p 8080:8080 \
#     -e CMZ_AUTHENTICATION_URL=https://api-services.mazone-test.ansut.ci/auth/v1.0/backoffice/ \
#     -e CMZ_REPORT_URL=https://api-services.mazone-test.ansut.ci/reports/v1.0/backoffice/ \
#     -e CMZ_SETTING_URL=https://api-services.mazone-test.ansut.ci/base-settings/v1.0/backoffice/ \
#     -e CMZ_FILE_URL=https://api-services.mazone-test.ansut.ci/auth/backoffice/ \
#     -e CMZ_ENVIRONMENT_DEPLOYMENT=PROD \
#     -e CMZ_ENABLE_DEBUG=false \
#     -e CMZ_CSP_FRAME_SRC=https://grafana.example.org \
#     cmz-backoffice
#
# CMZ_CSP_FRAME_SRC : origine du Grafana embarqué (GrafanaEmbedComponent) —
# à renseigner explicitement (jamais dérivable du code, cf. csp.template.conf) ;
# sans elle, l'iframe Grafana sera bloquée par la CSP générée à l'entrypoint.

# ─── deps + build ────────────────────────────────────────────────────────────
FROM oven/bun:1.3.14-debian AS build

WORKDIR /app

ENV HUSKY=0 \
    CI=true

COPY package.json bun.lock ./
COPY tools/ ./tools/

COPY nx.json tsconfig.base.json eslint.config.mjs ./
COPY apps/ ./apps/
COPY libs/ ./libs/

RUN bun install --frozen-lockfile
RUN bunx nx run backoffice-angular:build:production

# ─── runtime nginx ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# envsubst (gettext) — substitution du template à l'entrypoint
RUN apk add --no-cache gettext \
    && rm -f /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh \
    && rm -f /docker-entrypoint.d/20-envsubst-on-templates.sh \
    && rm -f /docker-entrypoint.d/30-tune-worker-processes.sh

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/env.template.js.in /etc/cmz/env.template.js.in
COPY deploy/csp.template.conf /etc/cmz/csp.template.conf
COPY deploy/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh \
    # placeholder pour que `nginx -t` ne casse pas avant le premier passage de
    # l'entrypoint (qui écrase ce fichier au démarrage réel) — cf. I-14/I-15
    && touch /etc/nginx/conf.d/csp.conf

COPY --from=build /app/dist/apps/backoffice-angular/browser /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
