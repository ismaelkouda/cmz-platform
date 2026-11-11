// X0 (lot produit extérieur) : coque Angular avec session créée par
// `create-app --target-root` dans deux produits fictifs indépendants.
// Le runner injecté ne compile rien : la compilation, le build, le lint, les
// tests et le navigateur réels sont prouvés par check:external-application-shells.
import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
    planExternalApplicationShell,
    publishExternalApplicationShell,
} from './core/application-workspace.mjs';
import {
    pathExists,
    verifyGeneratedTree,
} from './core/external-application-paths.mjs';
import { EXTERNAL_WORKSPACE_CMZ as CMZ } from './renderers/application-workspace-renderer.mjs';
import { renderAngularPwaShell } from './renderers/angular-pwa-shell-renderer.mjs';
import {
    EXTERNAL_CSP_HEADER,
    EXTERNAL_CSP_HEADER_PATH,
    EXTERNAL_CSP_META,
} from './renderers/external-content-security-policy.mjs';
import { RELAY_FILES } from './renderers/external-relay-renderer.mjs';
import { createApplicationSessionFixture } from './test-support/application-session-fixture.mjs';
import {
    hash,
    installMetadataOnly,
    prepareFixture,
    snapshotTree,
    TOOLS_ROOT,
} from './test-support/external-application-fixture.mjs';
import { runDocumentCli } from './test-support/external-document-fixture.mjs';
import {
    CMZ_MODULE_SPECIFIER,
    createAppArguments,
    SESSION_FIXTURE_DOMAINS,
    sessionShellOptions,
    writeExternalSessionDesign,
} from './test-support/external-session-fixture.mjs';

async function sessionProduct(t, domain) {
    const fixture = await prepareFixture(t);
    const input = await writeExternalSessionDesign(fixture.root, domain);
    await installMetadataOnly(fixture.plan);
    return { ...fixture, input, shell: sessionShellOptions(input) };
}

const typescript = (plan) =>
    Object.entries(plan.files).filter(([path]) => path.endsWith('.ts'));

test('X0 : deux produits fictifs planifient une coque Angular avec session, sans import cmz ni URL de service', async (t) => {
    const plans = [];
    for (const domain of SESSION_FIXTURE_DOMAINS) {
        const product = await sessionProduct(t, domain);
        const plan = await planExternalApplicationShell(product.shell);
        plans.push(plan);
        assert.equal(plan.profile, 'angular-pwa');
        assert.equal(plan.compiler_validation, 'angular-ngc');
        // La fermeture des entrées est exactement celle du produit.
        assert.deepEqual(
            plan.external_workspace.inputs.map((entry) => entry.path),
            product.input.inputPaths
        );
        for (const entry of plan.external_workspace.inputs)
            assert.equal(
                entry.sha256,
                hash(await readFile(join(product.root, entry.path)))
            );
        const files = Object.keys(plan.files);
        for (const path of [
            'src/app/session/session.guard.ts',
            'src/app/session/session.store.ts',
            'src/app/session/session.interceptor.ts',
        ])
            assert.ok(files.includes(path), path);
        const source = typescript(plan)
            .map(([, content]) => content)
            .join('\n');
        assert.doesNotMatch(source, CMZ_MODULE_SPECIFIER);
        assert.equal(
            typescript(plan).filter(([, content]) =>
                /export const SKIP_AUTH =/.test(content)
            ).length,
            1
        );
        // Aucune URL déclarée du contrat n'est embarquée : elles sont
        // injectées au lancement par SESSION_ENDPOINTS.
        assert.ok(product.input.serviceUrls.length > 0);
        for (const url of product.input.serviceUrls)
            for (const [path, content] of Object.entries(plan.files))
                assert.equal(content.includes(url), false, path);
        const routes = plan.files['src/app/app.routes.ts'];
        for (const page of product.input.design.pages)
            assert.match(
                routes,
                new RegExp(
                    `page_id: ['"]${page.id}['"] },\\s*canActivate: \\[applicationSessionGuard\\]`
                )
            );
        assert.match(
            routes,
            new RegExp(
                `path: ['"]\\*\\*['"], redirectTo: ['"]${product.input.reconnectPage.path}['"]`
            )
        );
        const entry = JSON.parse(
            plan.files[`.cmz/pages/${product.input.entryPage.id}.json`]
        );
        assert.equal(entry.experience.session.storage, 'memory');
        assert.equal(
            entry.experience.session.producer.page_id,
            product.input.entryPage.id
        );
    }
    assert.notEqual(plans[0].plan_id, plans[1].plan_id);
    assert.notEqual(plans[0].tree_sha256, plans[1].tree_sha256);
});

test('X0/T4 : le plan relu d’un produit ne se transfère pas à un produit aux entrées identiques', async (t) => {
    const a = await sessionProduct(t, 'observatory');
    const b = await sessionProduct(t, 'observatory');
    const planA = await planExternalApplicationShell(a.shell);
    const planB = await planExternalApplicationShell(b.shell);
    assert.equal(planA.tree_sha256, planB.tree_sha256);
    assert.notEqual(planA.plan_id, planB.plan_id);
    const before = await snapshotTree(b.root, []);
    await assert.rejects(
        publishExternalApplicationShell(
            { ...b.shell, expectedPlanId: planA.plan_id },
            { run: () => assert.fail('Plan transféré accepté') }
        ),
        /reviewed shell plan is stale/
    );
    assert.deepEqual(await snapshotTree(b.root, []), before);
});

test('X0 : React reste refusé pour une conception avec session, en API comme en CLI, sans écriture', async (t) => {
    const product = await sessionProduct(t, 'equipment-hire');
    const before = await snapshotTree(product.root, []);
    const react = sessionShellOptions(product.input, 'react-spa');
    await assert.rejects(
        planExternalApplicationShell(react),
        /APP_SESSION_REACT_UNSUPPORTED/
    );
    const cli = runDocumentCli('create-app', [
        ...createAppArguments(react),
        '--dry-run',
    ]);
    assert.equal(cli.status, 1);
    assert.equal(cli.stdout, '');
    assert.match(cli.stderr, /Création extérieure refusée/);
    assert.deepEqual(await snapshotTree(product.root, []), before);
});

test('X0 : create-app --target-root --dry-run, puis publication relue avec les seuls exécutables du produit', async (t) => {
    const workshopBefore = await snapshotTree(TOOLS_ROOT);
    for (const domain of SESSION_FIXTURE_DOMAINS) {
        const product = await sessionProduct(t, domain);
        const preview = runDocumentCli('create-app', [
            ...createAppArguments(product.shell),
            '--dry-run',
        ]);
        assert.equal(preview.status, 0, preview.stderr);
        const reviewed = JSON.parse(preview.stdout);
        const plan = await planExternalApplicationShell(product.shell);
        assert.equal(reviewed.plan_id, plan.plan_id);
        assert.equal(reviewed.output, `apps/session-${domain}`);
        assert.deepEqual(reviewed.files, Object.keys(plan.files).sort());
        // Le dry-run n'écrit rien dans le produit.
        assert.equal(await pathExists(plan.outputAbsolute), false);
        assert.equal(await pathExists(plan.candidate), false);
        const marker = await readFile(
            join(product.root, '.cmz/application-workspace.json')
        );
        const calls = [];
        const result = await publishExternalApplicationShell(
            { ...product.shell, expectedPlanId: reviewed.plan_id },
            {
                run: (command, args, cwd) => {
                    calls.push({ command, args, cwd });
                },
            }
        );
        assert.equal(result.recovered, false);
        assert.equal(result.plan.plan_id, reviewed.plan_id);
        const labels = calls.map(({ command, args, cwd }) => {
            assert.equal(command, process.execPath);
            assert.equal(cwd, product.root);
            assert.ok(args[0].startsWith(product.root + '/'), args[0]);
            return args[0].endsWith('check-workspace.mjs')
                ? 'workspace-contract'
                : args[1] === 'run'
                  ? args[2]
                  : 'native-compiler';
        });
        const app = `session-${domain}`;
        assert.deepEqual(labels, [
            'native-compiler',
            `${app}:build:production`,
            `${app}:lint`,
            `${app}:test`,
            'workspace-contract',
        ]);
        assert.ok(
            calls[0].args[0].startsWith(join(product.root, 'node_modules/'))
        );
        assert.equal(
            calls.at(-1).args[0],
            join(product.root, CMZ.support, 'check-workspace.mjs')
        );
        await verifyGeneratedTree(plan.outputAbsolute, plan.files);
        assert.equal(await pathExists(plan.candidate), false);
        const manifest = JSON.parse(plan.files['.cmz/app-manifest.json']);
        assert.equal(manifest.design_ref.path, product.input.designPath);
        assert.ok(
            manifest.generated_files.some(
                (entry) => entry.path === 'src/app/session/session.guard.ts'
            )
        );
        assert.deepEqual(
            await readFile(
                join(product.root, '.cmz/application-workspace.json')
            ),
            marker
        );
        // Une seconde publication du même plan reprend sans réécrire.
        const again = await publishExternalApplicationShell(
            { ...product.shell, expectedPlanId: reviewed.plan_id },
            { run: () => undefined }
        );
        assert.equal(again.recovered, true);
    }
    assert.deepEqual(
        await snapshotTree(TOOLS_ROOT),
        workshopBefore,
        'L’atelier a changé pendant la création extérieure'
    );
});

test('X0 : une entrée de session modifiée après relecture périme le plan, sans candidat ni sortie', async (t) => {
    const product = await sessionProduct(t, 'observatory');
    const plan = await planExternalApplicationShell(product.shell);
    const contract = join(
        product.root,
        'descriptions/session-observatory/backend.json'
    );
    await writeFile(contract, (await readFile(contract, 'utf8')) + ' ');
    await assert.rejects(
        publishExternalApplicationShell(
            { ...product.shell, expectedPlanId: plan.plan_id },
            { run: () => assert.fail('Entrée modifiée acceptée') }
        ),
        /external application:/
    );
    assert.equal(await pathExists(plan.outputAbsolute), false);
    assert.equal(await pathExists(plan.candidate), false);
});

test('X0 : un fichier ajouté à la main dans la coque avec session bloque toute commande suivante', async (t) => {
    const product = await sessionProduct(t, 'equipment-hire');
    const plan = await planExternalApplicationShell(product.shell);
    await publishExternalApplicationShell(
        { ...product.shell, expectedPlanId: plan.plan_id },
        { run: () => undefined }
    );
    const added = join(plan.outputAbsolute, 'src/app/pages/hand-made.ts');
    await writeFile(added, 'export const handMade = true;\n', { flag: 'wx' });
    // État d'entrée du lot : aucune adoption, même d'un fichier anodin.
    await assert.rejects(
        planExternalApplicationShell(product.shell),
        /generated inventory drift/
    );
    await assert.rejects(
        planExternalApplicationShell({
            ...product.shell,
            appName: 'session-equipment-hire-second',
        }),
        /generated inventory drift/
    );
});

// Régression trouvée par la preuve native X0 : sans test, la cible native
// `test` du produit échoue (« No tests found ») et create-app refuse `created`.
test('X0 : la coque extérieure avec session porte son test de garde ; le mode atelier reste sans', async (t) => {
    for (const domain of SESSION_FIXTURE_DOMAINS) {
        const data = await createApplicationSessionFixture({ domain });
        t.after(() => rm(data.root, { recursive: true, force: true }));
        const render = async (externalWorkspace) =>
            (
                await renderAngularPwaShell({
                    design: data.design,
                    experienceId: data.design.experiences[0].id,
                    appName: 'session-mode',
                    designPath: `design/${domain}.json`,
                    designSha256: hash('mode'),
                    externalWorkspace,
                })
            ).files;
        const atelier = await render(false);
        const external = await render(true);
        const spec = 'src/app/session/session.guard.spec.ts';
        const specs = (files) =>
            Object.keys(files).filter((path) => path.endsWith('.spec.ts'));
        assert.deepEqual(specs(atelier), []);
        assert.deepEqual(specs(external), [spec]);
        assert.deepEqual(
            Object.keys(external).sort(),
            [
                ...Object.keys(atelier),
                spec,
                EXTERNAL_CSP_HEADER_PATH,
                ...Object.values(RELAY_FILES),
            ].sort()
        );
        assert.match(external[spec], /from '\.\/session\.guard'/);
        assert.match(external[spec], /toBeInstanceOf\(UrlTree\)/);
        assert.ok(
            JSON.parse(external['.cmz/app-manifest.json']).generated_files.some(
                (entry) => entry.path === spec
            )
        );
    }
});

// X4-sécurité : la coque extérieure porte sa politique de sécurité de
// contenu, en balise meta avant toute ressource et en gabarit d'en-tête, les
// deux possédés et scellés ; le mode atelier reste sans politique.
test('X4-sécurité : politique de sécurité de contenu générée par la coque extérieure, mode atelier inchangé', async (t) => {
    const data = await createApplicationSessionFixture({
        domain: SESSION_FIXTURE_DOMAINS[0],
    });
    t.after(() => rm(data.root, { recursive: true, force: true }));
    const render = async (externalWorkspace) =>
        (
            await renderAngularPwaShell({
                design: data.design,
                experienceId: data.design.experiences[0].id,
                appName: 'session-mode',
                designPath: 'design/csp.json',
                designSha256: hash('csp'),
                externalWorkspace,
            })
        ).files;
    const atelier = await render(false);
    const external = await render(true);
    assert.doesNotMatch(atelier['src/index.html'], /Content-Security-Policy/);
    assert.equal(atelier[EXTERNAL_CSP_HEADER_PATH], undefined);
    const index = external['src/index.html'];
    const metas = [
        ...index.matchAll(
            /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/g
        ),
    ];
    assert.equal(metas.length, 1);
    assert.equal(metas[0][1], EXTERNAL_CSP_META);
    // Avant toute ressource : base, manifeste, scripts injectés au build.
    for (const later of ['<base href', '<link rel="manifest"', '<title>'])
        assert.ok(index.indexOf(metas[0][0]) < index.indexOf(later), later);
    const directives = new Map(
        EXTERNAL_CSP_META.split('; ').map((entry) => {
            const [name, ...values] = entry.split(' ');
            return [name, values.join(' ')];
        })
    );
    assert.equal(directives.get('connect-src'), "'self'");
    assert.equal(directives.get('script-src'), "'self'");
    assert.equal(directives.get('base-uri'), "'self'");
    assert.equal(directives.get('form-action'), "'self'");
    assert.equal(directives.get('object-src'), "'none'");
    assert.equal(directives.get('frame-src'), "'none'");
    assert.equal(directives.has('frame-ancestors'), false);
    // Aucune origine nommée, aucun joker, aucun code dynamique.
    for (const value of directives.values())
        assert.doesNotMatch(value, /\*|https?:|unsafe-eval|\/\//);
    assert.equal(
        EXTERNAL_CSP_HEADER,
        `${EXTERNAL_CSP_META}; frame-ancestors 'none'`
    );
    assert.ok(
        external[EXTERNAL_CSP_HEADER_PATH].includes(
            `add_header Content-Security-Policy "${EXTERNAL_CSP_HEADER}" always;`
        )
    );
    const manifest = JSON.parse(external['.cmz/app-manifest.json']);
    for (const path of ['src/index.html', EXTERNAL_CSP_HEADER_PATH])
        assert.ok(
            manifest.generated_files.some((entry) => entry.path === path),
            path
        );
    // Le CSS critique en ligne ajouterait un gestionnaire onload refusé.
    assert.deepEqual(
        JSON.parse(external['project.json']).targets.build.configurations
            .production.optimization,
        {
            scripts: true,
            styles: { minify: true, inlineCritical: false },
            fonts: false,
        }
    );
    assert.equal(
        JSON.parse(atelier['project.json']).targets.build.configurations
            .production.optimization,
        undefined
    );
});

// V9-R1 : l'oracle du test 37 refuse aussi un import sans `from`.
test('X0 : l’oracle « aucun module cmz » voit chaque forme d’import, sans faux positif', () => {
    for (const source of [
        "import { session } from '@cmz/shared-domain';",
        "import '@cmz/x';",
        'import "@cmz/x";',
        "export * from '@cmz/x';",
        "const lazy = await import('@cmz/x');",
        'const old = require(`@cmz/x`);',
    ])
        assert.match(source, CMZ_MODULE_SPECIFIER, source);
    for (const source of [
        "import { inject } from '@angular/core';",
        "import { tokens } from '@cmzx/y';",
        '// cmz est le nom de l’atelier, pas un module.',
    ])
        assert.doesNotMatch(source, CMZ_MODULE_SPECIFIER, source);
});
