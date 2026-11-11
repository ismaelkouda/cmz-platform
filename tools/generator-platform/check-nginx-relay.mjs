#!/usr/bin/env node
// X4-config : harnais du relais nginx (conception v3, § 6). Il rend le relais
// d'une coque extérieure fictive et le sert avec l'image officielle épinglée,
// par son entrypoint, exactement comme la commande de référence du README. Un
// second conteneur de la même image joue le service fictif et renvoie ce
// qu'il reçoit. Réseau utilisateur Docker dédié ; aucune adresse réelle.
// Usage : node check-nginx-relay.mjs [--mutations]
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sessionRenderConfiguration } from './core/application-design-session.mjs';
import { renderAngularPwaShell } from './renderers/angular-pwa-shell-renderer.mjs';
import {
    EXTERNAL_CSP_HEADER,
    renderCspHeaderTemplate,
} from './renderers/external-content-security-policy.mjs';
import {
    RELAY_FILES,
    nginxImage,
    relayServiceTable,
} from './renderers/external-relay-renderer.mjs';
import { createApplicationSessionFixture } from './test-support/application-session-fixture.mjs';

const SECRET = 'cmz-harness-secret';
const BUNDLE = '/main-ABC123.js';

function docker(args, { timeout = 60_000 } = {}) {
    const result = spawnSync('docker', args, { encoding: 'utf8', timeout });
    return {
        status: result.status,
        timedOut: Boolean(result.error) || result.signal !== null,
        output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    };
}

function ok(args, options) {
    const result = docker(args, options);
    assert.equal(result.status, 0, `docker ${args[0]} ${args[1] ?? ''}`);
    return result.output.trim();
}

export function get(port, path, headers = {}) {
    return new Promise((done, fail) => {
        const sent = request(
            { host: '127.0.0.1', port, path, headers, method: 'GET' },
            (response) => {
                let body = '';
                response.setEncoding('utf8');
                response.on('data', (chunk) => (body += chunk));
                response.on('end', () => {
                    const all = {};
                    for (let i = 0; i < response.rawHeaders.length; i += 2) {
                        const name = response.rawHeaders[i].toLowerCase();
                        (all[name] ??= []).push(response.rawHeaders[i + 1]);
                    }
                    done({ status: response.statusCode, headers: all, body });
                });
            }
        );
        sent.on('error', fail);
        sent.end();
    });
}

// Fichiers du relais et site statique fictif.
export async function relayFixture() {
    const data = await createApplicationSessionFixture({
        domain: 'observatory',
    });
    try {
        const experience = data.design.experiences[0];
        const shell = await renderAngularPwaShell({
            design: data.design,
            experienceId: experience.id,
            appName: 'relay-harness',
            designPath: 'design/observatory.json',
            designSha256: 'a'.repeat(64),
            externalWorkspace: true,
        });
        const table = relayServiceTable(
            sessionRenderConfiguration(data.design, experience)
        );
        return {
            table,
            files: {
                template: shell.files[RELAY_FILES.template],
                headers: shell.files[RELAY_FILES.headers],
                envsh: shell.files[RELAY_FILES.envsh],
                csp: renderCspHeaderTemplate(),
            },
        };
    } finally {
        await rm(data.root, { recursive: true, force: true });
    }
}

const FAKE_SERVICE = `server {
    listen 8000;
    default_type text/plain;
    location = /ok { add_header Cache-Control "max-age=60"; return 200 "ok"; }
    location = /nocache { return 200 "nocache"; }
    location = /redirect { return 302 http://svc:8000/x; }
    location = /cookie { add_header Set-Cookie "s=1; Path=/"; return 200 "cookie"; }
    location / {
        return 200 "path=$request_uri|host=$http_host|xfp=$http_x_forwarded_proto|xfh=$http_x_forwarded_host|xff=$http_x_forwarded_for|xfprefix=$http_x_forwarded_prefix|connection=$http_connection|protocol=$server_protocol";
    }
}
`;

export async function stage(root, files, { envshMode = 0o755 } = {}) {
    await mkdir(join(root, 'templates'), { recursive: true });
    await mkdir(join(root, 'cmz'), { recursive: true });
    await mkdir(join(root, 'html'), { recursive: true });
    await mkdir(join(root, 'svc'), { recursive: true });
    await writeFile(
        join(root, 'templates', 'default.conf.template'),
        files.template
    );
    await writeFile(
        join(root, 'cmz', 'content-security-policy.conf'),
        files.csp
    );
    await writeFile(join(root, 'cmz', 'security-headers.conf'), files.headers);
    await writeFile(join(root, '15-cmz-upstreams.envsh'), files.envsh);
    await chmod(join(root, '15-cmz-upstreams.envsh'), envshMode);
    await writeFile(join(root, 'svc', 'default.conf'), FAKE_SERVICE);
    for (const [name, text] of Object.entries({
        'index.html': '<!doctype html><title>relay</title>',
        'sw.js': 'self.addEventListener("fetch", () => undefined);',
        'manifest.webmanifest': '{}',
        [BUNDLE.slice(1)]: 'export {};',
    }))
        await writeFile(join(root, 'html', name), text);
}

// Arguments de la commande de référence (README), sans -p ni nom.
function relayArgs(root, env, { mountEnvsh = true } = {}) {
    return [
        ...Object.entries(env).flatMap(([key, value]) => [
            '--env',
            `${key}=${value}`,
        ]),
        '-v',
        `${root}/templates:/etc/nginx/templates:ro`,
        '-v',
        `${root}/cmz/content-security-policy.conf:/etc/nginx/cmz/content-security-policy.conf:ro`,
        '-v',
        `${root}/cmz/security-headers.conf:/etc/nginx/cmz/security-headers.conf:ro`,
        ...(mountEnvsh
            ? [
                  '-v',
                  `${root}/15-cmz-upstreams.envsh:/docker-entrypoint.d/15-cmz-upstreams.envsh:ro`,
              ]
            : []),
        '-v',
        `${root}/html:/usr/share/nginx/html:ro`,
    ];
}

async function waitReady(port) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
        try {
            const response = await get(port, '/index.html');
            if (response.status === 200) return;
        } catch {
            // pas encore prêt
        }
        await new Promise((done) => setTimeout(done, 200));
    }
    throw new Error('relais non prêt');
}

// Arrêt réel du relais (preuve hors ligne du service worker).
export function stopRelay(relay) {
    ok(['stop', relay]);
}

// Une session : réseau, service fictif, relais ; fermeture garantie.
export async function withRelay(root, variable, upstream, action) {
    const id = randomBytes(4).toString('hex');
    const network = `cmz-relay-${id}`;
    const svc = `cmz-svc-${id}`;
    const relay = `cmz-relay-${id}`;
    try {
        ok(['network', 'create', network]);
        ok([
            'run',
            '-d',
            '--name',
            svc,
            '--network',
            network,
            '--network-alias',
            'svc',
            '-v',
            `${root}/svc/default.conf:/etc/nginx/conf.d/default.conf:ro`,
            nginxImage(),
        ]);
        ok([
            'run',
            '-d',
            '--name',
            relay,
            '--network',
            network,
            '-p',
            '127.0.0.1::8080',
            ...relayArgs(root, {
                NGINX_ENVSUBST_FILTER: '^CMZ_',
                [variable]: upstream,
            }),
            nginxImage(),
        ]);
        const port = Number(
            /:(\d+)$/.exec(ok(['port', relay, '8080/tcp']).split('\n')[0])[1]
        );
        await waitReady(port);
        return await action(port, network, relay);
    } finally {
        docker(['rm', '-f', relay, svc]);
        docker(['network', 'rm', network]);
    }
}

const SECURITY = {
    'x-content-type-options': 'nosniff',
    'cross-origin-resource-policy': 'same-origin',
    'referrer-policy': 'no-referrer',
    'x-frame-options': 'DENY',
};

export async function runChecks(files, table) {
    const results = {};
    const check = async (name, run) => {
        try {
            await run();
            results[name] = 'PASS';
        } catch (error) {
            results[name] = `FAIL ${String(error.message).split('\n')[0]}`;
        }
    };
    const root = await mkdtemp(join(tmpdir(), 'cmz-nginx-relay-'));
    const [service] = table;
    const prefix = service.path;
    try {
        await stage(root, files);
        await withRelay(
            root,
            service.variable,
            'http://svc:8000/',
            async (port, network) => {
                await check('5-nginx-t-via-entrypoint', async () => {
                    const result = docker(
                        [
                            'run',
                            '--rm',
                            '--network',
                            network,
                            ...relayArgs(root, {
                                NGINX_ENVSUBST_FILTER: '^CMZ_',
                                [service.variable]: 'http://svc:8000/',
                            }),
                            nginxImage(),
                            'nginx',
                            '-t',
                        ],
                        { timeout: 30_000 }
                    );
                    assert.equal(
                        result.status,
                        0,
                        result.output.split('\n').slice(-3).join(' ')
                    );
                });
                await check('1-header-matrix', async () => {
                    const expected = {
                        '/': 'no-cache',
                        '/index.html': 'no-cache',
                        '/sw.js': 'no-cache',
                        '/manifest.webmanifest': 'no-cache',
                        [BUNDLE]: 'public, max-age=31536000, immutable',
                        '/enter': 'no-cache',
                        [`${prefix}ok`]: 'max-age=60',
                        [`${prefix}nocache`]: undefined,
                        [`${prefix}x.css`]: undefined,
                        '/api/zzz': undefined,
                        '/api': 'no-cache',
                    };
                    for (const [path, cache] of Object.entries(expected)) {
                        const response = await get(port, path);
                        const headers = response.headers;
                        // Politique exacte, une seule fois : le service worker
                        // prend la sienne dans les en-têtes de /sw.js.
                        assert.deepEqual(
                            headers['content-security-policy'],
                            [EXTERNAL_CSP_HEADER],
                            path
                        );
                        assert.equal(
                            headers['cross-origin-opener-policy']?.[0],
                            'same-origin',
                            path
                        );
                        for (const [name, value] of Object.entries(SECURITY))
                            assert.deepEqual(
                                headers[name],
                                [value],
                                `${path} ${name}`
                            );
                        assert.match(
                            headers['permissions-policy']?.[0] ?? '',
                            /^accelerometer=\(\)/,
                            path
                        );
                        assert.deepEqual(
                            headers['cache-control'] ?? [],
                            cache === undefined ? [] : [cache],
                            `${path} cache-control`
                        );
                        if (path === '/api/zzz' || path === '/api')
                            assert.equal(response.status, 404, path);
                        if (path === '/sw.js') {
                            assert.equal(response.status, 200, path);
                            assert.match(
                                headers['content-type']?.[0] ?? '',
                                /^(?:application|text)\/javascript\b/,
                                path
                            );
                        }
                        if (path === `${prefix}x.css`)
                            assert.match(
                                response.body,
                                /^path=\/x\.css\|/,
                                path
                            );
                        assert.equal(
                            headers.server?.[0],
                            'nginx',
                            `${path} server_tokens`
                        );
                    }
                });
                await check('2-upstream-receives', async () => {
                    const plain = await get(port, `${prefix}echo/a?b=1`);
                    assert.match(
                        plain.body,
                        /^path=\/echo\/a\?b=1\|host=svc:8000\|xfp=http\|xfh=127\.0\.0\.1\|xff=[0-9.]+\|xfprefix=\/api\/[a-z-]+\|connection=\|protocol=HTTP\/1\.1$/,
                        plain.body
                    );
                    const tls = await get(port, `${prefix}echo`, {
                        'X-Forwarded-Proto': 'https',
                    });
                    assert.match(tls.body, /\|xfp=https\|/);
                });
                await check('3-redirect-and-cookie', async () => {
                    const redirect = await get(port, `${prefix}redirect`);
                    assert.equal(redirect.status, 302);
                    assert.deepEqual(redirect.headers.location, [`${prefix}x`]);
                    const cookie = await get(port, `${prefix}cookie`);
                    assert.deepEqual(cookie.headers['set-cookie'], [
                        `s=1; Path=${prefix}`,
                    ]);
                });
                await check('6-relay-equivalence', async () => {
                    for (const [path, upstream] of [
                        [`${prefix}a/b`, '/a/b'],
                        [`${prefix}`, '/'],
                        [`${prefix}a.css?x=1`, '/a.css?x=1'],
                    ]) {
                        const response = await get(port, path);
                        assert.match(
                            response.body,
                            new RegExp(
                                `^path=${upstream.replace(/[.?]/g, '\\$&')}\\|`
                            ),
                            path
                        );
                    }
                });
            }
        );
        await withRelay(
            root,
            service.variable,
            'http://svc:8000/base/v1/',
            async (port) => {
                await check('2b-upstream-with-path', async () => {
                    const response = await get(port, `${prefix}echo`);
                    assert.match(response.body, /^path=\/base\/v1\/echo\|/);
                });
            }
        );
        await check('13-escaping-invariant-rendered', async () => {
            const rendered = ok(
                [
                    'run',
                    '--rm',
                    ...relayArgs(root, {
                        NGINX_ENVSUBST_FILTER: '^CMZ_',
                        [service.variable]: 'http://svc:8000/',
                    }),
                    nginxImage(),
                    'sh',
                    '-c',
                    '/docker-entrypoint.sh nginx -t >/dev/null 2>&1; cat /etc/nginx/conf.d/default.conf',
                ],
                { timeout: 30_000 }
            );
            for (const name of [
                '$host',
                '$scheme',
                '$uri',
                '$cmz_cache_control',
                '$cmz_forwarded_proto',
                '$proxy_add_x_forwarded_for',
            ])
                assert.ok(rendered.includes(name), name);
            assert.equal(
                rendered.includes('${CMZ_'),
                false,
                'variable non substituée'
            );
            assert.ok(rendered.includes('proxy_pass http://svc:8000/;'));
        });
        // 4 : chaque échec arrête le conteneur (code non nul), nomme la
        // variable, n'écrit jamais la valeur.
        const failure = async (name, env, expected, options) => {
            await check(`4-${name}`, async () => {
                const result = docker(
                    [
                        'run',
                        '--rm',
                        ...relayArgs(root, env, options),
                        nginxImage(),
                    ],
                    { timeout: 30_000 }
                );
                assert.equal(
                    result.timedOut,
                    false,
                    'le conteneur ne s’est pas arrêté'
                );
                assert.notEqual(result.status, 0, 'code de sortie nul');
                assert.match(result.output, expected);
                assert.equal(
                    result.output.includes(SECRET),
                    false,
                    'valeur écrite'
                );
            });
        };
        const base = { NGINX_ENVSUBST_FILTER: '^CMZ_' };
        const v = service.variable;
        await failure(
            'credentials',
            { ...base, [v]: `http://user:${SECRET}@svc/` },
            new RegExp(`${v}_INVALID`)
        );
        await failure(
            'ftp',
            { ...base, [v]: `ftp://svc/${SECRET}/` },
            new RegExp(`${v}_INVALID`)
        );
        await failure(
            'https',
            { ...base, [v]: `https://svc/${SECRET}/` },
            new RegExp(`${v}_INVALID`)
        );
        await failure(
            'no-trailing-slash',
            { ...base, [v]: `http://svc:8000/${SECRET}` },
            new RegExp(`${v}_INVALID`)
        );
        await failure('missing', { ...base }, new RegExp(`${v}_MISSING`));
        await failure('empty', { ...base, [v]: '' }, new RegExp(`${v}_EMPTY`));
        await failure(
            'filter-absent',
            { [v]: 'http://svc:8000/' },
            /CMZ_ENVSUBST_FILTER_INVALID/
        );
        // Garde : un amont résolvable (127.0.0.1) pour que seul l'échec de la
        // garde puisse arrêter le conteneur.
        const resolvable = { ...base, [v]: 'http://127.0.0.1:8000/' };
        const guard = /unknown "cmz_upstreams_validated" variable/i;
        await failure('envsh-not-mounted', resolvable, guard, {
            mountEnvsh: false,
        });
        await chmod(join(root, '15-cmz-upstreams.envsh'), 0o644);
        await failure('envsh-not-executable', resolvable, guard);
        await chmod(join(root, '15-cmz-upstreams.envsh'), 0o755);
        await rm(join(root, 'cmz', 'security-headers.conf'));
        await failure(
            '11-headers-file-absent',
            resolvable,
            /security-headers\.conf/
        );
    } finally {
        await rm(root, { recursive: true, force: true });
    }
    return results;
}

// Contre-mutations nommées : chacune doit faire échouer la vérification visée.
export const MUTATIONS = [
    [
        'retirer always',
        (f) => ({
            ...f,
            headers: f.headers.replace('"nosniff" always;', '"nosniff";'),
        }),
        '1-header-matrix',
    ],
    [
        'proxy_redirect off',
        (f) => ({
            ...f,
            template: f.template.replace(
                'proxy_http_version 1.1;',
                'proxy_http_version 1.1;\n        proxy_redirect off;'
            ),
        }),
        '3-redirect-and-cookie',
    ],
    [
        '/ final non exigé',
        (f) => ({ ...f, envsh: f.envsh.replace(')*/$', ')*/?$') }),
        '4-no-trailing-slash',
    ],
    [
        '/api/ après la regex',
        (f) => ({
            ...f,
            template: f.template
                .replace('    "~^/api/" "";\n', '')
                .replace('immutable";\n', 'immutable";\n    "~^/api/" "";\n'),
        }),
        '1-header-matrix',
    ],
    [
        'entrée /api/ retirée',
        (f) => ({
            ...f,
            template: f.template.replace('    "~^/api/" "";\n', ''),
        }),
        '1-header-matrix',
    ],
    [
        'location = /api retirée',
        (f) => ({
            ...f,
            template: f.template.replace(
                '    location = /api {\n        return 404;\n    }\n',
                ''
            ),
        }),
        '1-header-matrix',
    ],
    [
        'add_header dans une location',
        (f) => ({
            ...f,
            template: f.template.replace(
                'try_files $uri /index.html;',
                'try_files $uri /index.html;\n        add_header X-Cmz-Test "1";'
            ),
        }),
        '1-header-matrix',
    ],
    [
        'garde retirée',
        (f) => ({
            ...f,
            template: f.template.replace(
                /^ {4}set \$cmz_relay_guard .*\n/m,
                ''
            ),
        }),
        '4-envsh-not-executable',
    ],
    [
        'garde auto-référencée',
        (f) => ({
            ...f,
            template: f.template.replace(
                'set $cmz_relay_guard',
                'set $cmz_upstreams_validated'
            ),
        }),
        '4-envsh-not-executable',
    ],
    [
        'valeur écrite',
        (f) => ({
            ...f,
            envsh: f.envsh.replace(
                'cmz_fail "$1_INVALID"\n}',
                'cmz_fail "$1_INVALID $cmz_value"\n}'
            ),
        }),
        '4-credentials',
    ],
    // Retirer `proxy_http_version 1.1` ou `Connection ""` est équivalent sur
    // nginx 1.31.8 (mesuré : l'amont reçoit déjà HTTP/1.1 sans `close`) ; les
    // deux lignes restent explicites contre un changement d'image.
];

async function main() {
    const { files, table } = await relayFixture();
    const results = await runChecks(files, table);
    let failed = 0;
    for (const [name, outcome] of Object.entries(results)) {
        console.log(
            `${outcome.startsWith('PASS') ? 'PASS' : 'FAIL'} nginx-relay/${name}${outcome === 'PASS' ? '' : ' ' + outcome.slice(5)}`
        );
        if (outcome !== 'PASS') failed += 1;
    }
    const only = process.argv
        .find((arg) => arg.startsWith('--mutation='))
        ?.slice('--mutation='.length);
    if (process.argv.includes('--mutations') || only)
        for (const [label, mutate, target] of MUTATIONS) {
            if (only && label !== only) continue;
            const mutated = await runChecks(mutate(files), table);
            const killed = mutated[target] !== 'PASS';
            console.log(
                `${killed ? 'PASS' : 'FAIL'} nginx-relay/mutation ${label} -> ${target} ${killed ? 'red' : 'still green'}`
            );
            if (!killed) failed += 1;
        }
    console.log(`nginx-relay image=${nginxImage()} failed=${failed}`);
    process.exitCode = failed ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
