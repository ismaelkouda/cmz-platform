import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

import { validateRecipes, verifyApps } from '../check-library-setup.mjs';
import { parseArgs } from '../create-app.mjs';
import {
    planApplicationShell,
    publishApplicationShell,
} from './core/application-shell-publication.mjs';
import { renderAngularPwaShell } from './renderers/angular-pwa-shell-renderer.mjs';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
import {
    sha256,
    writeApplicationDesignFixture,
} from './test-support/application-design-fixture.mjs';

const applicationDesignSchema = JSON.parse(
    await readFile(
        new URL('./schemas/application-design.schema.json', import.meta.url),
        'utf8'
    )
);
const backendContractSchema = JSON.parse(
    await readFile(
        new URL('./schemas/backend-contract.schema.json', import.meta.url),
        'utf8'
    )
);

async function fixture() {
    const root = await mkdtemp(join(tmpdir(), 'application-shell-'));
    await mkdir(join(root, 'apps'));
    await mkdir(join(root, 'designs'));
    const data = await writeApplicationDesignFixture(
        root,
        backendContractSchema
    );
    const designContent = Buffer.from(
        `${JSON.stringify(data.design, null, 2)}\n`
    );
    await writeFile(
        join(root, 'designs/clean-street.application-design.json'),
        designContent
    );
    return {
        workspaceRoot: root,
        designPath: 'designs/clean-street.application-design.json',
        experienceId: 'citizen-web',
        appName: 'clean-street',
        profile: 'angular-pwa',
        applicationDesignSchema,
        backendContractSchema,
        data,
        designContent,
    };
}

test('la CLI create-app est explicitement planifiée puis appliquée', () => {
    assert.deepEqual(
        parseArgs([
            '--design',
            'design.json',
            '--experience',
            'citizen-web',
            '--app',
            'clean-street',
            '--dry-run',
        ]),
        {
            dryRun: true,
            profile: 'angular-pwa',
            designPath: 'design.json',
            experienceId: 'citizen-web',
            appName: 'clean-street',
        }
    );
});

test('le renderer produit routing, i18n, PWA et un contrat borné par page', async () => {
    const options = await fixture();
    const rendered = renderAngularPwaShell({
        design: options.data.design,
        experienceId: options.experienceId,
        appName: options.appName,
        designPath: options.designPath,
        designSha256: sha256(options.designContent),
    });
    for (const path of [
        'project.json',
        'src/app/app.routes.ts',
        'src/app/transloco-loader.ts',
        'public/manifest.webmanifest',
        'public/sw.js',
        '.cmz/libraries.json',
        '.cmz/app-manifest.json',
        '.cmz/pages/page_1111111111111111.json',
        '.cmz/pages/page_2222222222222222.json',
    ]) {
        assert.ok(rendered.files[path], `missing ${path}`);
    }
    assert.match(rendered.files['src/app/app.routes.ts'], /loadComponent/);
    assert.deepEqual(JSON.parse(rendered.files['.cmz/libraries.json']), {
        schema_version: '1.0.0',
        kind: 'app-library-manifest',
        platform: 'angular',
        libraries: ['transloco'],
    });
    assert.doesNotMatch(
        rendered.files['.cmz/pages/page_1111111111111111.json'],
        /angular/i
    );
});

test('échappe le titre métier dans chaque contexte HTML et SVG', async () => {
    const options = await fixture();
    options.data.design.design.title = '<script>"unsafe" & test</script>';
    const rendered = renderAngularPwaShell({
        design: options.data.design,
        experienceId: options.experienceId,
        appName: options.appName,
        designPath: options.designPath,
        designSha256: sha256(options.designContent),
    });
    for (const path of ['src/index.html', 'public/icon.svg']) {
        assert.doesNotMatch(rendered.files[path], /<script>/);
        assert.match(rendered.files[path], /&#60;/);
        assert.match(rendered.files[path], /&#62;/);
        assert.match(rendered.files[path], /&#38;/);
    }
    assert.match(rendered.files['public/icon.svg'], /&#34;/);
});

test('le service worker ne capture jamais API ni origine externe', async () => {
    const options = await fixture();
    const rendered = renderAngularPwaShell({
        design: options.data.design,
        experienceId: options.experienceId,
        appName: options.appName,
        designPath: options.designPath,
        designSha256: sha256(options.designContent),
    });
    const listeners = new Map();
    let fetchCalls = 0;
    runInNewContext(rendered.files['public/sw.js'], {
        URL,
        caches: {
            open: async () => ({
                addAll: async () => undefined,
                put: async () => undefined,
            }),
            match: async () => undefined,
        },
        fetch: async () => {
            fetchCalls += 1;
            return { clone: () => ({}), ok: true, type: 'basic' };
        },
        self: {
            addEventListener: (name, listener) => listeners.set(name, listener),
            clients: { claim: async () => undefined },
            location: { origin: 'https://citizen.example' },
        },
    });
    for (const request of [
        {
            method: 'GET',
            url: 'https://api.example/reports',
            mode: 'cors',
            destination: '',
        },
        {
            method: 'GET',
            url: 'https://citizen.example/api/reports',
            mode: 'cors',
            destination: '',
        },
    ]) {
        let responded = false;
        listeners.get('fetch')({
            request,
            respondWith: () => {
                responded = true;
            },
        });
        assert.equal(responded, false);
    }
    assert.equal(fetchCalls, 0);
});

test('dry-run n’écrit rien puis apply vérifie compilation, build et lint', async () => {
    const options = await fixture();
    const plan = await planApplicationShell(options);
    await assert.rejects(
        () =>
            readFile(join(options.workspaceRoot, plan.output, 'project.json')),
        /ENOENT/
    );
    const calls = [];
    const run = (command, args) => {
        calls.push([command, args]);
        return '';
    };
    const result = await publishApplicationShell(
        { ...options, planId: plan.plan_id },
        { run }
    );
    assert.equal(result.recovered, false);
    assert.deepEqual(
        calls.map((entry) => entry[1][0]),
        ['ngc', 'nx', 'nx']
    );
    assert.equal(
        JSON.parse(
            await readFile(
                join(options.workspaceRoot, plan.output, 'project.json'),
                'utf8'
            )
        ).name,
        'clean-street'
    );
});

test('un échec de build retire la sortie et conserve un candidat reprenable', async () => {
    const options = await fixture();
    const plan = await planApplicationShell(options);
    let call = 0;
    const run = () => {
        call += 1;
        if (call === 2) throw new Error('simulated build failure');
        return '';
    };
    await assert.rejects(
        () =>
            publishApplicationShell(
                { ...options, planId: plan.plan_id },
                { run }
            ),
        /rolled back/
    );
    await assert.rejects(
        () => readFile(join(plan.outputAbsolute, 'project.json')),
        /ENOENT/
    );
    assert.equal(
        JSON.parse(await readFile(join(plan.candidate, 'project.json'), 'utf8'))
            .name,
        'clean-street'
    );
});

test('ne déplace jamais une application étrangère préexistante', async () => {
    const options = await fixture();
    const plan = await planApplicationShell(options);
    await mkdir(plan.outputAbsolute);
    await writeFile(
        join(plan.outputAbsolute, 'foreign.txt'),
        'owned by user\n'
    );
    await assert.rejects(
        () =>
            publishApplicationShell(
                { ...options, planId: plan.plan_id },
                { run: () => '' }
            ),
        /inventory drifted/
    );
    assert.equal(
        await readFile(join(plan.outputAbsolute, 'foreign.txt'), 'utf8'),
        'owned by user\n'
    );
    await assert.rejects(
        () => readFile(join(plan.candidate, 'foreign.txt')),
        /ENOENT/
    );
});

test('une modification de conception invalide le plan revu', async () => {
    const options = await fixture();
    const plan = await planApplicationShell(options);
    options.data.design.design.description = 'Changed after review.';
    await writeFile(
        join(options.workspaceRoot, options.designPath),
        `${JSON.stringify(options.data.design, null, 2)}\n`
    );
    await assert.rejects(
        () =>
            publishApplicationShell(
                { ...options, planId: plan.plan_id },
                { run: () => '' }
            ),
        /reviewed plan id is stale/
    );
});

// Critère d'acceptation : une app fraîchement créée doit passer la gate
// applicative, pas seulement contenir un fichier. Avant ce correctif,
// `verifyApps` refusait toute app générée — « project.json régulier mais pas de
// .cmz/libraries.json ». Le test matérialise donc le rendu et exécute la VRAIE
// gate, recettes réelles du dépôt comprises.
test('une app fraîchement rendue passe la gate library-setup', async (t) => {
    const options = await fixture();
    const rendered = renderAngularPwaShell({
        design: options.data.design,
        experienceId: options.experienceId,
        appName: options.appName,
        designPath: options.designPath,
        designSha256: sha256(options.designContent),
    });

    const manifest = JSON.parse(rendered.files['.cmz/libraries.json']);
    assert.deepEqual(manifest, {
        schema_version: '1.0.0',
        kind: 'app-library-manifest',
        platform: 'angular',
        // ADR-0044 : Material et Tailwind sont opt-in, jamais recopiés ici.
        libraries: ['transloco'],
    });

    const root = await mkdtemp(join(tmpdir(), 'cmz-shell-gate-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    // verifyApps lit le schéma de manifeste sous la racine inspectée.
    await cp(join(REPO_ROOT, 'conventions'), join(root, 'conventions'), {
        recursive: true,
    });
    await Promise.all([
        cp(join(REPO_ROOT, 'package.json'), join(root, 'package.json')),
        cp(join(REPO_ROOT, 'bun.lock'), join(root, 'bun.lock')),
    ]);
    for (const [path, content] of Object.entries(rendered.files)) {
        const target = join(root, 'apps', options.appName, path);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, content);
    }

    // Recettes RÉELLES du dépôt, app générée : c'est le couple qui échouait.
    const recipes = validateRecipes(REPO_ROOT);
    assert.deepEqual(recipes.errors, []);
    const apps = verifyApps(root, recipes.recipes);
    assert.deepEqual(apps.errors, []);
    assert.equal(apps.ok, true);
});
