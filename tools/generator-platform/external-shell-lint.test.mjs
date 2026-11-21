// Correctif CI #389 (d) : la coque extérieure rendue passe le lint du produit,
// dans ses deux variantes (sans session, avec session et relais). L'ESLint du
// produit est lancé comme sa cible `lint` : depuis le dossier de l'application,
// avec sa configuration et `--max-warnings=0`. Les versions des outils sont
// celles que le produit épingle. Sans ce test, un fichier de coque refusé par
// le lint du produit n'était vu que par la preuve native en CI.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, realpath, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { ESLint } from 'eslint';

import {
    planExternalApplicationShell,
    publishExternalApplicationShell,
} from './core/application-workspace.mjs';
import {
    shellFixture,
    TOOLS_ROOT,
} from './test-support/external-application-fixture.mjs';
import { sessionApp } from './test-support/external-publication-fixture.mjs';

const LINT_PACKAGES = [
    'eslint',
    '@eslint/js',
    'typescript-eslint',
    'angular-eslint',
];

// Copie du produit rendu, avec les outils de lint réels de l'atelier, aux
// versions épinglées par le produit.
async function lintableCopy(t, productRoot) {
    const root = await realpath(
        await mkdtemp(join(tmpdir(), 'cmz-shell-lint-'))
    );
    t.after(() => rm(root, { recursive: true, force: true }));
    await cp(productRoot, root, {
        recursive: true,
        filter: (source) => !/[\\/]node_modules(?:[\\/]|$)/.test(source),
    });
    await symlink(
        join(TOOLS_ROOT, 'node_modules'),
        join(root, 'node_modules'),
        'dir'
    );
    const product = JSON.parse(
        await readFile(join(root, 'package.json'), 'utf8')
    );
    const pinned = { ...product.dependencies, ...product.devDependencies };
    for (const name of LINT_PACKAGES) {
        const installed = JSON.parse(
            await readFile(
                join(TOOLS_ROOT, 'node_modules', name, 'package.json'),
                'utf8'
            )
        ).version;
        assert.equal(installed, pinned[name], `${name} : version du produit`);
    }
    return root;
}

// Cible `lint` du produit, à l'identique, dans un processus séparé (le
// parseur TypeScript garde un état par processus).
export function lintRenderedApp(appRoot) {
    const result = spawnSync(
        process.execPath,
        [
            join(TOOLS_ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js'),
            '.',
            '--max-warnings=0',
            '--config=eslint.config.mjs',
        ],
        { cwd: appRoot, encoding: 'utf8', timeout: 300_000 }
    );
    return {
        status: result.status,
        output: `${result.stdout}${result.stderr}`.split(appRoot).join('<app>'),
    };
}

test('CI #389 : la coque extérieure sans session passe le lint du produit (--max-warnings=0)', async (t) => {
    const fixture = await shellFixture(t, 'angular-pwa');
    const plan = await planExternalApplicationShell(fixture.shell);
    await publishExternalApplicationShell(
        { ...fixture.shell, expectedPlanId: plan.plan_id },
        { run: () => undefined }
    );
    const root = await lintableCopy(t, fixture.root);
    const linted = lintRenderedApp(join(root, 'apps', fixture.shell.appName));
    assert.equal(linted.status, 0, linted.output);
});

test('CI #389 : la coque extérieure avec session et relais passe le lint du produit (--max-warnings=0)', async (t) => {
    const product = await sessionApp(t, 'observatory');
    const root = await lintableCopy(t, product.root);
    const app = join(root, 'apps', product.shell.appName);
    const linted = lintRenderedApp(app);
    assert.equal(linted.status, 0, linted.output);
    // Le proxy de développement, le relais et le point d'entrée sont lintés.
    const eslint = new ESLint({
        cwd: app,
        overrideConfigFile: join(app, 'eslint.config.mjs'),
    });
    for (const file of [
        'proxy.conf.mjs',
        'src/main.ts',
        'src/app/session/relay-endpoints.ts',
    ])
        assert.equal(await eslint.isPathIgnored(join(app, file)), false, file);
});
