// X4-config : relais de même origine de la coque extérieure (conception v3 et
// addendum T3). Une seule table de chemins pour tous ses consommateurs ;
// gabarit nginx, invariant d'échappement ; validation des amonts sans valeur
// ; proxy de développement hors du produit ; mode des fichiers possédés ;
// refus des fichiers de configuration locale sous la racine du produit.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
    mkdir,
    mkdtemp,
    readFile,
    realpath,
    rm,
    stat,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { ownedProductContext } from './core/application-workspace-root.mjs';
import {
    assertNoLocalConfiguration,
    ownedFileMode,
    stageGeneratedTree,
} from './core/external-application-paths.mjs';
import { sessionRenderConfiguration } from './core/application-design-session.mjs';
import { renderAngularPwaShell } from './renderers/angular-pwa-shell-renderer.mjs';
import {
    RELAY_FILES,
    UPSTREAM_PATTERN,
    nginxImage,
    relayServiceTable,
} from './renderers/external-relay-renderer.mjs';
import {
    createApplicationSessionFixture,
    SESSION_FIXTURE_DOMAINS,
} from './test-support/application-session-fixture.mjs';
import { TOOLS_ROOT } from './test-support/external-application-fixture.mjs';
import { sessionApp } from './test-support/external-publication-fixture.mjs';

async function scratch(t, prefix) {
    const root = await realpath(await mkdtemp(join(tmpdir(), prefix)));
    t.after(() => rm(root, { recursive: true, force: true }));
    return root;
}

async function renderShells(t, domain) {
    const data = await createApplicationSessionFixture({ domain });
    t.after(() => rm(data.root, { recursive: true, force: true }));
    const render = async (externalWorkspace) =>
        (
            await renderAngularPwaShell({
                design: data.design,
                experienceId: data.design.experiences[0].id,
                appName: 'relay-app',
                designPath: `design/${domain}.json`,
                designSha256: 'a'.repeat(64),
                externalWorkspace,
            })
        ).files;
    const config = sessionRenderConfiguration(
        data.design,
        data.design.experiences[0]
    );
    return {
        atelier: await render(false),
        external: await render(true),
        table: relayServiceTable(config),
    };
}

test('X4-config : une seule table de chemins, lue à l’identique par tous ses consommateurs', async (t) => {
    for (const domain of SESSION_FIXTURE_DOMAINS) {
        const { atelier, external, table } = await renderShells(t, domain);
        assert.ok(table.length > 0, domain);
        const paths = table.map((entry) => entry.path);
        // Fabrique de SESSION_ENDPOINTS.
        const endpoints = external[RELAY_FILES.endpoints];
        assert.deepEqual(
            [...endpoints.matchAll(/path: '([^']+)'/g)].map((m) => m[1]),
            paths
        );
        assert.deepEqual(
            [
                ...endpoints.matchAll(
                    /contract_id: '([^']+)',\s*service_id: '([^']+)',/g
                ),
            ].map(([, contract_id, service_id]) => ({
                contract_id,
                service_id,
            })),
            table.map(({ contract_id, service_id }) => ({
                contract_id,
                service_id,
            }))
        );
        // Gabarit nginx : un bloc par service, et pas d'autre.
        const template = external[RELAY_FILES.template];
        assert.deepEqual(
            [...template.matchAll(/location \^~ (\/api\/[^ ]+\/) \{/g)]
                .map((m) => m[1])
                .filter((path) => path !== '/api/'),
            paths
        );
        assert.deepEqual(
            [...template.matchAll(/proxy_pass \$\{(CMZ_[A-Z0-9_]+)\};/g)].map(
                (m) => m[1]
            ),
            table.map((entry) => entry.variable)
        );
        // Validation au démarrage.
        assert.deepEqual(
            [
                ...external[RELAY_FILES.envsh].matchAll(
                    /^cmz_check (CMZ_[A-Z0-9_]+)$/gm
                ),
            ].map((m) => m[1]),
            table.map((entry) => entry.variable)
        );
        // Proxy de développement.
        const services = [
            ...external[RELAY_FILES.devProxy].matchAll(
                /\{\s*service_id: '([^']+)',\s*path: '([^']+)',?\s*\}/g
            ),
        ].map(([, service_id, path]) => ({ service_id, path }));
        assert.deepEqual(
            services,
            table.map(({ service_id, path }) => ({ service_id, path }))
        );
        // README et exemple.
        for (const entry of table)
            assert.ok(
                external[RELAY_FILES.readme].includes(
                    `| \`${entry.path}\` | \`${entry.variable}\` |`
                )
            );
        assert.deepEqual(
            Object.keys(JSON.parse(external[RELAY_FILES.devExample])),
            table.map((entry) => entry.service_id)
        );
        assert.ok(external[RELAY_FILES.readme].includes(nginxImage()));
        // Câblage : fournisseur et proxy du serveur de développement.
        assert.match(
            external['src/app/app.config.ts'],
            /import \{ RELAY_ENDPOINTS \} from '\.\/session\/relay-endpoints';/
        );
        assert.match(
            external['src/app/app.config.ts'],
            /useExisting: ApplicationSession \},\n\s+RELAY_ENDPOINTS,\n/
        );
        assert.equal(
            JSON.parse(external['project.json']).targets.serve.options
                .proxyConfig,
            'apps/relay-app/proxy.conf.mjs'
        );
        // Mode atelier inchangé.
        for (const path of Object.values(RELAY_FILES))
            assert.equal(atelier[path], undefined, path);
        assert.equal(atelier['src/app/app.config.ts'].includes('RELAY'), false);
        assert.equal(
            JSON.parse(atelier['project.json']).targets.serve.options
                ?.proxyConfig,
            undefined
        );
        // Aucune adresse dans les fichiers possédés du relais.
        for (const path of Object.values(RELAY_FILES)) {
            const text = external[path]
                .replaceAll(UPSTREAM_PATTERN, '')
                .replaceAll('http://hôte[:port]/', '');
            for (const [url] of text.matchAll(/https?:\/\/[^\s'"`)|\\]+/g))
                assert.match(
                    url,
                    /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//,
                    `${path}: ${url}`
                );
        }
    }
});

test('X4-config : gabarit nginx, ordre de la map et invariant d’échappement', async (t) => {
    const { external } = await renderShells(t, SESSION_FIXTURE_DOMAINS[0]);
    const template = external[RELAY_FILES.template];
    // Seules les variables de l'opérateur sont écrites ${…}, en majuscules.
    for (const [variable] of template.matchAll(/\$\{[^}]*\}/g))
        assert.match(variable, /^\$\{CMZ_[A-Z0-9_]+\}$/);
    // Toute autre variable est une variable nginx en minuscules.
    for (const [, name] of template.matchAll(
        /\$(?!\{)([A-Za-z_][A-Za-z0-9_]*)/g
    ))
        assert.match(name, /^[a-z_][a-z0-9_]*$/, name);
    for (const name of ['$host', '$scheme', '$uri', '$cmz_cache_control'])
        assert.ok(template.includes(name), name);
    // nginx ignore la casse des noms de variables : aucune variable nginx ne
    // porte le nom, en minuscules, d'une variable de l'opérateur (sinon la
    // garde se référencerait elle-même et nginx accepterait la configuration).
    const declared = new Set(
        [...template.matchAll(/(?:set|map \S+) \$([a-z_][a-z0-9_]*)/g)].map(
            (found) => found[1]
        )
    );
    for (const [, operator] of template.matchAll(/\$\{(CMZ_[A-Z0-9_]+)\}/g))
        assert.equal(declared.has(operator.toLowerCase()), false, operator);
    // Map : /api/ avant la regex d'assets (entre regex, l'ordre compte).
    const api = template.indexOf('"~^/api/" "";');
    const assets = template.indexOf('"~*\\.(?:js|css|svg|png|woff2)$"');
    assert.ok(api > 0 && assets > api, 'ordre de la map');
    // Un seul niveau d'add_header : aucun dans une location.
    const locations = template.slice(template.indexOf('    location ^~'));
    assert.equal(locations.includes('add_header'), false);
    assert.equal(
        template.match(/add_header Cache-Control \$cmz_cache_control always;/g)
            ?.length,
        1
    );
    for (const directive of [
        'server_tokens off;',
        'absolute_redirect off;',
        'client_max_body_size 10m;',
        'location ^~ /api/ {',
        'try_files $uri /index.html;',
        'set $cmz_relay_guard "${CMZ_UPSTREAMS_VALIDATED}";',
        'proxy_http_version 1.1;',
        'proxy_set_header Connection "";',
    ])
        assert.ok(template.includes(directive), directive);
    assert.equal(template.includes('proxy_redirect'), false);
    assert.equal(template.includes('$uri/'), false);
    // `/api` et tout `/api/…` hors des services déclarés répondent 404 : sans
    // `location = /api`, `/api` tomberait sur `try_files` et servirait
    // index.html (survivant relevé par la validation de X4-config).
    for (const block of [
        '    location ^~ /api/ {\n        return 404;\n    }\n',
        '    location = /api {\n        return 404;\n    }\n',
    ])
        assert.equal(template.split(block).length - 1, 1, block);
    // En-têtes de sécurité, tous avec always.
    const headers = external[RELAY_FILES.headers];
    for (const name of [
        'X-Content-Type-Options "nosniff"',
        'Cross-Origin-Resource-Policy "same-origin"',
        'Referrer-Policy "no-referrer"',
        'X-Frame-Options "DENY"',
        'Permissions-Policy "accelerometer=()',
    ])
        assert.ok(headers.includes(name), name);
    for (const line of headers
        .split('\n')
        .filter((entry) => entry.startsWith('add_header')))
        assert.match(line, / always;$/);
});

// Le script tourne ici sous /bin/sh ; la preuve CI le rejoue dans l'image.
function runEnvsh(file, env) {
    return spawnSync(
        '/bin/sh',
        [
            '-c',
            '. "$1"; printf "VALIDATED=%s" "$CMZ_UPSTREAMS_VALIDATED"',
            'sh',
            file,
        ],
        { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' }
    );
}

test('X4-config : le script de validation refuse sans jamais écrire une valeur', async (t) => {
    const { external, table } = await renderShells(
        t,
        SESSION_FIXTURE_DOMAINS[0]
    );
    const root = await scratch(t, 'cmz-relay-envsh-');
    const file = join(root, '15-cmz-upstreams.envsh');
    await writeFile(file, external[RELAY_FILES.envsh]);
    const [first, ...others] = table.map((entry) => entry.variable);
    const valid = Object.fromEntries(
        others.map((variable) => [variable, 'http://svc:8000/'])
    );
    const base = { NGINX_ENVSUBST_FILTER: '^CMZ_', ...valid };
    for (const value of ['http://svc:8000/', 'http://svc:8000/base/v1/']) {
        const result = runEnvsh(file, { ...base, [first]: value });
        assert.equal(result.status, 0, value);
        assert.equal(result.stdout, 'VALIDATED=1');
    }
    const secret = 'cmz-secret-sentinel';
    const failures = [
        [{ [first]: `http://user:${secret}@svc/` }, `${first}_INVALID`],
        [{ [first]: `ftp://svc/${secret}/` }, `${first}_INVALID`],
        [{ [first]: `https://svc/${secret}/` }, `${first}_INVALID`],
        [{ [first]: `http://svc:8000/${secret}` }, `${first}_INVALID`],
        [{ [first]: `http://svc/\n${secret}/` }, `${first}_INVALID`],
        [{}, `${first}_MISSING`],
        [{ [first]: '' }, `${first}_EMPTY`],
    ];
    for (const [env, message] of failures) {
        const result = runEnvsh(file, { ...base, ...env });
        assert.equal(result.status, 1, message);
        assert.equal(result.stdout, '', message);
        assert.equal(result.stderr, message + '\n', message);
        assert.equal(result.stderr.includes(secret), false, message);
    }
    for (const filter of [undefined, '^cmz_', '.*'])
        assert.equal(
            runEnvsh(file, {
                ...valid,
                [first]: 'http://svc/',
                ...(filter === undefined
                    ? {}
                    : { NGINX_ENVSUBST_FILTER: filter }),
            }).stderr,
            'CMZ_ENVSUBST_FILTER_INVALID\n'
        );
});

test('X4-config : proxy de développement, cibles hors du produit sur chemins réels', async (t) => {
    const { external } = await renderShells(t, SESSION_FIXTURE_DOMAINS[0]);
    const root = await scratch(t, 'cmz-relay-dev-');
    const product = join(root, 'product');
    const app = join(product, 'apps', 'relay-app');
    await mkdir(app, { recursive: true });
    await writeFile(
        join(app, 'proxy.conf.mjs'),
        external[RELAY_FILES.devProxy]
    );
    const example = JSON.parse(external[RELAY_FILES.devExample]);
    const write = process.stderr.write;
    const warnings = [];
    process.stderr.write = (chunk) => warnings.push(String(chunk)) > 0;
    let module;
    try {
        module = await import(pathToFileURL(join(app, 'proxy.conf.mjs')).href);
    } finally {
        process.stderr.write = write;
    }
    // Sans fichier : un avertissement, aucun service relayé, pas de blocage.
    assert.deepEqual(warnings, [
        'CMZ_DEV_PROXY aucun service relayé : définir CMZ_DEV_PROXY_FILE (voir proxy.local.example.json)\n',
    ]);
    const { devProxyConfig } = module;
    assert.deepEqual(module.default, {});
    const outside = join(root, 'targets.json');
    await writeFile(outside, JSON.stringify(example));
    const [service] = Object.keys(example);
    const config = devProxyConfig(outside, product);
    assert.deepEqual(config[`/api/${service}/`], {
        target: new URL(example[service]).origin,
        pathRewrite: { [`^/api/${service}/`]: '/' },
        changeOrigin: true,
        ws: false,
    });
    // Chemin avec `..` qui sort réellement du produit : accepté.
    assert.ok(devProxyConfig(join(product, '..', 'targets.json'), product));
    const inside = join(product, 'proxy.local.json');
    await writeFile(inside, JSON.stringify(example));
    const refused = (file) =>
        assert.throws(
            () => devProxyConfig(file, product),
            /CMZ_DEV_PROXY FILE_INSIDE_PRODUCT/
        );
    refused(inside);
    // `..` qui retombe dans le produit, puis lien hors du produit vers dedans.
    refused(join(product, 'apps', '..', 'proxy.local.json'));
    const link = join(root, 'link.json');
    await symlink(inside, link);
    refused(link);
    // Produit atteint par un lien : comparaison sur chemins réels.
    const productLink = join(root, 'product-link');
    await symlink(product, productLink);
    assert.throws(
        () => devProxyConfig(inside, productLink),
        /FILE_INSIDE_PRODUCT/
    );
    await writeFile(
        outside,
        JSON.stringify({ ...example, inconnu: 'http://a/' })
    );
    assert.throws(
        () => devProxyConfig(outside, product),
        /UNKNOWN_SERVICE inconnu/
    );
    await writeFile(
        outside,
        JSON.stringify({ ...example, [service]: 'http://user:x@a/' })
    );
    assert.throws(
        () => devProxyConfig(outside, product),
        /CMZ_DEV_PROXY INVALID /
    );
});

test('X4-config : seul le script de validation est exécutable', async (t) => {
    const envsh = `apps/relay-app/${RELAY_FILES.envsh}`;
    assert.equal(ownedFileMode(envsh), 0o755);
    assert.equal(ownedFileMode(RELAY_FILES.envsh), 0o755);
    for (const path of [
        ...Object.values(RELAY_FILES)
            .filter((entry) => entry !== RELAY_FILES.envsh)
            .map((entry) => `apps/relay-app/${entry}`),
        'apps/relay-app/deploy/nginx/docker-entrypoint.d/15-cmz-upstreams.sh',
        'apps/relay-app/deploy/15-cmz-upstreams.envsh',
        'package.json',
    ])
        assert.equal(ownedFileMode(path), 0o644, path);
    const root = await scratch(t, 'cmz-relay-mode-');
    const candidate = join(root, 'candidate');
    await stageGeneratedTree(candidate, {
        [envsh]: 'echo\n',
        'apps/relay-app/deploy/security-headers.conf': 'x\n',
    });
    assert.equal((await stat(join(candidate, envsh))).mode & 0o777, 0o755);
    assert.equal(
        (
            await stat(
                join(candidate, 'apps/relay-app/deploy/security-headers.conf')
            )
        ).mode & 0o777,
        0o644
    );
});

test('X4-config : fichiers de configuration locale refusés sous la racine, avec ou sans Git', async (t) => {
    const root = await scratch(t, 'cmz-relay-local-');
    for (const git of [false, true]) {
        for (const path of [
            '.env',
            '.env.local',
            'proxy.local.json',
            'apps/a/proxy.local.json',
            'apps/a/.env',
        ]) {
            const product = await mkdtemp(join(root, 'product-'));
            await mkdir(join(product, 'apps', 'a'), { recursive: true });
            if (git) execFileSync('git', ['init', '-q', product]);
            await assertNoLocalConfiguration(product);
            await writeFile(join(product, path), 'X=1\n');
            await assert.rejects(
                assertNoLocalConfiguration(product),
                new RegExp(
                    `local configuration file inside the product: ${path.replaceAll('.', '\\.')}$`
                )
            );
        }
    }
    // Un lien nommé .env est une présence, quelle que soit sa cible.
    const product = await mkdtemp(join(root, 'product-'));
    await symlink(join(root, 'ailleurs'), join(product, '.env'));
    await assert.rejects(assertNoLocalConfiguration(product), /: \.env$/);
    // Sur un vrai produit : toute commande sur un produit existant refuse.
    const created = await sessionApp(t, 'observatory');
    await ownedProductContext({
        workspaceRoot: TOOLS_ROOT,
        targetRoot: created.root,
    });
    await writeFile(join(created.root, '.env'), 'CMZ_UPSTREAM_X=http://a/\n');
    await assert.rejects(
        ownedProductContext({
            workspaceRoot: TOOLS_ROOT,
            targetRoot: created.root,
        }),
        /local configuration file inside the product: \.env$/
    );
    assert.equal(
        await readFile(join(created.root, '.env'), 'utf8'),
        'CMZ_UPSTREAM_X=http://a/\n'
    );
});

// Correctif CodeQL (CI #389) : le harnais compare le chemin écho par préfixe
// exact, sans expression régulière construite. Contre-test : métacaractères.
test('X4-config : le harnais compare le chemin relayé sans expression régulière', async () => {
    const { echoes } = await import('./check-nginx-relay.mjs');
    for (const upstream of [
        '/a/b',
        '/',
        '/a.css?x=1',
        '/a\\b',
        '/a(b)[c]{d}*+^$|',
        '/a.b',
    ]) {
        assert.equal(
            echoes(`path=${upstream}|method=GET`, upstream),
            true,
            upstream
        );
        assert.equal(
            echoes(`path=${upstream}x|method=GET`, upstream),
            false,
            upstream
        );
    }
    // Un `.` ou un `?` n'est jamais un joker.
    assert.equal(echoes('path=/aXcss|', '/a.css'), false);
    assert.equal(echoes('path=/a.cs|', '/a.css?'), false);
    assert.equal(echoes(undefined, '/'), false);
});
