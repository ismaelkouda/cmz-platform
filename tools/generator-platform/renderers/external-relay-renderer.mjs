// X4-config : relais de même origine de la coque extérieure (topologie A,
// conception v3). Le navigateur ne connaît que `/api/<service_id>/` ; les
// adresses des services ne vivent que dans les variables `CMZ_UPSTREAM_*` de
// l'opérateur, lues par nginx au démarrage. Une seule table de chemins,
// générée depuis la conception, est lue à l'identique par la fabrique de
// SESSION_ENDPOINTS, le gabarit nginx, le script de validation et le proxy de
// développement.
import { readFileSync } from 'node:fs';

import { sessionServices } from './angular-application-session-renderer.mjs';

export const RELAY_FILES = Object.freeze({
    template: 'deploy/nginx/templates/default.conf.template',
    headers: 'deploy/security-headers.conf',
    envsh: 'deploy/nginx/docker-entrypoint.d/15-cmz-upstreams.envsh',
    readme: 'deploy/README.md',
    endpoints: 'src/app/session/relay-endpoints.ts',
    devProxy: 'proxy.conf.mjs',
    devExample: 'proxy.local.example.json',
});

// Amont permis dans ce lot : http seulement (T6), chemin facultatif, `/`
// final imposé (E7), ni identifiants, ni requête, ni fragment.
export const UPSTREAM_PATTERN =
    '^http://[a-z0-9.-]+(:[0-9]{1,5})?(/[A-Za-z0-9._~-]+)*/$';

// Image officielle épinglée : seule source, le Dockerfile du harnais.
export function nginxImage() {
    const source = readFileSync(
        new URL('../nginx-harness/Dockerfile', import.meta.url),
        'utf8'
    );
    const found = /^FROM (nginx:[a-z0-9.-]+@sha256:[a-f0-9]{64})$/m.exec(
        source
    );
    if (!found) throw new Error('nginx harness: image is not pinned');
    return found[1];
}

const variableOf = (serviceId) =>
    `CMZ_UPSTREAM_${serviceId.toUpperCase().replaceAll('-', '_')}`;

// Table des chemins, ordonnée, depuis les services de la session.
export function relayServiceTable(config) {
    const table = [...sessionServices(config)]
        .map(([serviceId, contractId]) => {
            if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(serviceId))
                throw new Error(
                    `application shell: relay service id is not a path segment: ${serviceId}`
                );
            return {
                service_id: serviceId,
                contract_id: contractId,
                path: `/api/${serviceId}/`,
                variable: variableOf(serviceId),
            };
        })
        .sort((left, right) => left.service_id.localeCompare(right.service_id));
    if (new Set(table.map((entry) => entry.variable)).size !== table.length)
        throw new Error('application shell: relay variables collide');
    return table;
}

// Invariant d'échappement (§ 3.5) : seules les variables de l'opérateur, en
// majuscules `CMZ_*`, sont écrites `${…}` ; nginx garde ses variables en
// minuscules, jamais entre accolades.
function serviceBlock(entry) {
    const prefix = entry.path.slice(0, -1);
    return `    location ^~ ${entry.path} {
        proxy_pass \${${entry.variable}};
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_cookie_path / ${entry.path};
        proxy_set_header Host $proxy_host;
        proxy_set_header X-Forwarded-Proto $cmz_forwarded_proto;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Prefix ${prefix};
        proxy_read_timeout 60s;
    }
`;
}

export function renderNginxTemplate(table) {
    return `# Généré par la coque extérieure (X4-config), possédé et scellé.
# Rendu au démarrage par l'image officielle (/etc/nginx/templates, filtre
# NGINX_ENVSUBST_FILTER=^CMZ_) : seules les variables CMZ_* de l'opérateur
# sont substituées. Aucune location ne porte d'add_header (un seul niveau).
map $uri $cmz_cache_control {
    default "no-cache";
    /index.html "no-cache";
    /sw.js "no-cache";
    /manifest.webmanifest "no-cache";
    "~^/api/" "";
    "~*\\.(?:js|css|svg|png|woff2)$" "public, max-age=31536000, immutable";
}

map $http_x_forwarded_proto $cmz_forwarded_proto {
    default $scheme;
    https https;
}

server {
    listen 8080;
    root /usr/share/nginx/html;
    server_tokens off;
    absolute_redirect off;
    client_max_body_size 10m;
    # Garde : sans le script de validation, la variable n'est pas substituée et
    # nginx refuse une variable inconnue. Les noms de variables nginx ignorent
    # la casse : la cible du set ne doit jamais être cmz_upstreams_validated.
    set $cmz_relay_guard "\${CMZ_UPSTREAMS_VALIDATED}";

    include /etc/nginx/cmz/content-security-policy.conf;
    include /etc/nginx/cmz/security-headers.conf;
    add_header Cache-Control $cmz_cache_control always;

${table.map(serviceBlock).join('\n')}
    location ^~ /api/ {
        return 404;
    }

    location = /api {
        return 404;
    }

    location / {
        try_files $uri /index.html;
    }
}
`;
}

export function renderSecurityHeaders() {
    return `# Généré par la coque extérieure (X4-config), possédé et scellé.
# Inclus au niveau server du relais, à côté de la politique de contenu.
add_header X-Content-Type-Options "nosniff" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;
add_header Referrer-Policy "no-referrer" always;
add_header X-Frame-Options "DENY" always;
add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()" always;
`;
}

// Sourcé par l'entrypoint officiel avant 20-envsubst-on-templates.sh. Il
// n'écrit jamais une valeur, seulement le nom de la variable en défaut, et
// n'exporte CMZ_UPSTREAMS_VALIDATED qu'en cas de succès.
export function renderUpstreamsEnvsh(table) {
    return `# Généré par la coque extérieure (X4-config), possédé et scellé.
# Sourcé par l'entrypoint officiel de nginx avant le rendu des gabarits.
# N'écrit jamais une valeur : seulement le nom de la variable en défaut.
cmz_fail() {
    echo "$1" >&2
    exit 1
}
[ "\${NGINX_ENVSUBST_FILTER-}" = '^CMZ_' ] || cmz_fail CMZ_ENVSUBST_FILTER_INVALID
cmz_check() {
    eval "cmz_state=\\\${$1+set}"
    [ "$cmz_state" = set ] || cmz_fail "$1_MISSING"
    eval "cmz_value=\\\${$1}"
    [ -n "$cmz_value" ] || cmz_fail "$1_EMPTY"
    [ "$(printf '%s' "$cmz_value" | wc -l)" -eq 0 ] || cmz_fail "$1_INVALID"
    printf '%s' "$cmz_value" | grep -Eqx '${UPSTREAM_PATTERN}' || cmz_fail "$1_INVALID"
}
${table.map((entry) => `cmz_check ${entry.variable}`).join('\n')}
unset cmz_state cmz_value
export CMZ_UPSTREAMS_VALIDATED=1
`;
}

export function renderRelayEndpoints(table) {
    const services = table
        .map(
            (entry) =>
                `    { contract_id: ${JSON.stringify(entry.contract_id)}, service_id: ${JSON.stringify(entry.service_id)}, path: ${JSON.stringify(entry.path)} },`
        )
        .join('\n');
    return `import { type Provider } from '@angular/core';
import { SESSION_ENDPOINTS, type SessionEndpoint } from './session.types';

// Généré par la coque extérieure (X4-config) : chemins de même origine,
// relayés par le serveur. Aucune adresse de service n'est connue du
// navigateur.
export const RELAY_SERVICES = [
${services}
] as const;

export function relayEndpoints(): readonly SessionEndpoint[] {
    if (typeof location === 'undefined' || !['http:', 'https:'].includes(location.protocol)) return Object.freeze([]);
    return Object.freeze(
        RELAY_SERVICES.map((service) =>
            Object.freeze({ contract_id: service.contract_id, service_id: service.service_id, base_url: new URL(service.path, location.origin).href })
        )
    );
}

export const RELAY_ENDPOINTS: Provider = { provide: SESSION_ENDPOINTS, useFactory: relayEndpoints };
`;
}

export function renderRelayReadme({ appName, table }) {
    const variables = table
        .map((entry) => `    --env ${entry.variable} \\\n`)
        .join('');
    return `# Relais de même origine — ${appName}

Généré par la coque extérieure (X4-config), possédé et scellé. Le navigateur
ne connaît que des chemins de même origine ; les adresses des services ne
vivent que dans les variables de l'opérateur, jamais dans ce dépôt.

| Chemin | Variable |
| --- | --- |
${table.map((entry) => `| \`${entry.path}\` | \`${entry.variable}\` |`).join('\n')}

Chaque variable vaut \`http://hôte[:port]/\` ou \`http://hôte[:port]/chemin/\`,
avec un \`/\` final. Une valeur absente, vide ou d'une autre forme fait refuser
le démarrage, avec un message qui nomme la variable sans sa valeur.

## Commande de référence

Après \`nx run ${appName}:build:production\`, depuis la racine du produit. Les
variables viennent d'un fichier d'environnement **hors du produit**.

\`\`\`sh
docker run --rm -p 8080:8080 \\
    --env-file <fichier hors du produit> \\
    --env NGINX_ENVSUBST_FILTER='^CMZ_' \\
${variables}    -v "$PWD/apps/${appName}/deploy/nginx/templates:/etc/nginx/templates:ro" \\
    -v "$PWD/apps/${appName}/deploy/content-security-policy.conf:/etc/nginx/cmz/content-security-policy.conf:ro" \\
    -v "$PWD/apps/${appName}/deploy/security-headers.conf:/etc/nginx/cmz/security-headers.conf:ro" \\
    -v "$PWD/apps/${appName}/deploy/nginx/docker-entrypoint.d/15-cmz-upstreams.envsh:/docker-entrypoint.d/15-cmz-upstreams.envsh:ro" \\
    -v "$PWD/dist/apps/${appName}/browser:/usr/share/nginx/html:ro" \\
    ${nginxImage()}
\`\`\`

La terminaison TLS (et HSTS) est devant ce conteneur ; il fait confiance à
\`X-Forwarded-Proto\` reçu. La coque ne se republie pas : un produit créé avant
X4-config ne reçoit ces fichiers qu'en recréant son application.

## Développement local

\`nx serve ${appName}\` relaie les mêmes chemins par \`proxy.conf.mjs\`, avec
les cibles lues dans le fichier désigné par \`CMZ_DEV_PROXY_FILE\`, **hors du
produit** (forme : \`proxy.local.example.json\`). Différence connue : le proxy
de développement ne réécrit pas un \`Location\` absolu renvoyé par un service.
`;
}

export function renderDevProxy(table) {
    const services = table.map(({ service_id, path }) => ({
        service_id,
        path,
    }));
    return `// Généré par la coque extérieure (X4-config), possédé et scellé. Proxy du
// serveur de développement : même table de chemins et même forme d'amont que
// le relais nginx. Les cibles viennent du fichier désigné par
// CMZ_DEV_PROXY_FILE, hors du produit ; sans lui, aucun service n'est relayé.
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVICES = ${JSON.stringify(services)};
const UPSTREAM = new RegExp(${JSON.stringify(UPSTREAM_PATTERN)});

function fail(message) {
    throw new Error('CMZ_DEV_PROXY ' + message);
}

export function devProxyConfig(file, productRoot) {
    if (!file) {
        console.warn('CMZ_DEV_PROXY aucun service relayé : définir CMZ_DEV_PROXY_FILE (voir proxy.local.example.json)');
        return {};
    }
    const real = realpathSync(file);
    const inside = relative(realpathSync(productRoot), real);
    if (!inside.startsWith('..' + sep) && inside !== '..')
        fail('FILE_INSIDE_PRODUCT');
    let targets;
    try {
        targets = JSON.parse(readFileSync(real, 'utf8'));
    } catch {
        fail('FILE_UNREADABLE');
    }
    if (!targets || typeof targets !== 'object' || Array.isArray(targets)) fail('FILE_INVALID');
    const known = new Set(SERVICES.map((service) => service.service_id));
    for (const key of Object.keys(targets)) if (!known.has(key)) fail('UNKNOWN_SERVICE ' + key.replace(/[^a-z0-9-]/g, '?'));
    const config = {};
    for (const { service_id, path } of SERVICES) {
        const upstream = targets[service_id];
        if (typeof upstream !== 'string' || !UPSTREAM.test(upstream)) fail('INVALID ' + service_id);
        const url = new URL(upstream);
        config[path] = {
            target: url.origin,
            pathRewrite: { ['^' + path]: url.pathname },
            changeOrigin: true,
            ws: false,
        };
    }
    return config;
}

const here = dirname(fileURLToPath(import.meta.url));
export default devProxyConfig(process.env.CMZ_DEV_PROXY_FILE, resolve(here, '..', '..'));
`;
}

export function renderDevProxyExample(table) {
    return (
        JSON.stringify(
            Object.fromEntries(
                table.map((entry, index) => [
                    entry.service_id,
                    `http://localhost:${8001 + index}/`,
                ])
            ),
            null,
            4
        ) + '\n'
    );
}

// Fichiers du relais pour une coque extérieure avec session.
export function renderExternalRelayFiles({ appName, config }) {
    const table = relayServiceTable(config);
    return {
        table,
        files: {
            [RELAY_FILES.template]: renderNginxTemplate(table),
            [RELAY_FILES.headers]: renderSecurityHeaders(),
            [RELAY_FILES.envsh]: renderUpstreamsEnvsh(table),
            [RELAY_FILES.readme]: renderRelayReadme({ appName, table }),
            [RELAY_FILES.endpoints]: renderRelayEndpoints(table),
            [RELAY_FILES.devProxy]: renderDevProxy(table),
            [RELAY_FILES.devExample]: renderDevProxyExample(table),
        },
    };
}
