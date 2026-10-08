import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
    publicApplicationShellResult,
    publishApplicationShell,
} from './core/application-shell-publication.mjs';
import { canonicalizeGeneratedFiles } from './core/canonicalize-generated.mjs';
import { renderAngularPwaShell } from './renderers/angular-pwa-shell-renderer.mjs';
import { renderReactSpaShell } from './renderers/react-spa-shell-renderer.mjs';

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

async function reactFixture() {
    const options = await fixture();
    options.profile = 'react-spa';
    options.data.design.experiences[0].offline_policy = 'none';
    options.designContent = Buffer.from(
        `${JSON.stringify(options.data.design, null, 2)}\n`
    );
    await writeFile(
        join(options.workspaceRoot, options.designPath),
        options.designContent
    );
    return options;
}

test('la CLI create-app applique directement, avec dry-run et plan attendu facultatifs', () => {
    const nominal = [
        '--design',
        'design.json',
        '--experience',
        'citizen-web',
        '--app',
        'clean-street',
    ];
    assert.deepEqual(parseArgs(nominal), {
        dryRun: false,
        profile: 'angular-pwa',
        designPath: 'design.json',
        experienceId: 'citizen-web',
        appName: 'clean-street',
    });
    assert.deepEqual(parseArgs([...nominal, '--dry-run']), {
        dryRun: true,
        profile: 'angular-pwa',
        designPath: 'design.json',
        experienceId: 'citizen-web',
        appName: 'clean-street',
    });
    assert.deepEqual(parseArgs([...nominal, '--profile', 'react-spa']), {
        dryRun: false,
        profile: 'react-spa',
        designPath: 'design.json',
        experienceId: 'citizen-web',
        appName: 'clean-street',
    });
    assert.deepEqual(parseArgs([...nominal, '--expect-plan', 'a'.repeat(64)]), {
        dryRun: false,
        profile: 'angular-pwa',
        designPath: 'design.json',
        experienceId: 'citizen-web',
        appName: 'clean-street',
        expectedPlanId: 'a'.repeat(64),
    });
    assert.throws(
        () => parseArgs([...nominal, '--apply', 'a'.repeat(64)]),
        /--apply a été retiré/
    );
    assert.throws(
        () => parseArgs([...nominal, '--expect-plan']),
        /exige un plan_id SHA-256/
    );
    assert.throws(
        () =>
            parseArgs([
                ...nominal,
                '--dry-run',
                '--expect-plan',
                'a'.repeat(64),
            ]),
        /exclusifs/
    );
});

test('le runner réserve stdout au JSON et redirige les diagnostics enfants vers stderr', () => {
    const moduleUrl = new URL(
        './core/application-shell-publication.mjs',
        import.meta.url
    ).href;
    const script = `
        import { runApplicationShellCommand } from ${JSON.stringify(moduleUrl)};
        runApplicationShellCommand(
            process.execPath,
            ['--eval', "process.stdout.write('diagnostic nx\\\\n')"],
            process.cwd()
        );
        process.stdout.write(JSON.stringify({ status: 'created' }));
    `;
    const result = spawnSync(
        process.execPath,
        ['--input-type=module', '--eval', script],
        { encoding: 'utf8' }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { status: 'created' });
    assert.match(result.stderr, /diagnostic nx/);
});

test('le renderer produit routing, i18n, PWA et un contrat borné par page', async () => {
    const options = await fixture();
    const rendered = await renderAngularPwaShell({
        design: options.data.design,
        experienceId: options.experienceId,
        appName: options.appName,
        designPath: options.designPath,
        designSha256: sha256(options.designContent),
    });
    for (const path of [
        '.cmz/libraries.json',
        'project.json',
        'src/app/access.guard.ts',
        'src/app/access.guard.spec.ts',
        'src/app/app.routes.ts',
        'public/manifest.webmanifest',
        'public/sw.js',
        '.cmz/libraries.json',
        '.cmz/app-manifest.json',
        '.cmz/pages/page_1111111111111111.json',
        '.cmz/pages/page_2222222222222222.json',
    ]) {
        assert.ok(rendered.files[path], `missing ${path}`);
    }
    assert.deepEqual(JSON.parse(rendered.files['.cmz/libraries.json']), {
        schema_version: '1.0.0',
        kind: 'app-library-manifest',
        platform: 'angular',
        libraries: [],
    });
    const project = JSON.parse(rendered.files['project.json']);
    assert.deepEqual(project.i18n, { sourceLocale: 'fr' });
    assert.deepEqual(project.targets.build.options.polyfills, [
        '@angular/localize/init',
    ]);
    assert.equal(
        project.targets.test.options.runnerConfig,
        'tools/generator-platform/page-realization-vitest.config.mjs'
    );
    const page =
        rendered.files['src/app/pages/page_1111111111111111/page.component.ts'];
    assert.match(page, /i18n="Titre de page@@page_1111111111111111\.title"/);
    assert.doesNotMatch(page, /transloco/i);
    assert.equal(rendered.files['public/i18n/fr.json'], undefined);
    assert.match(rendered.files['src/app/app.routes.ts'], /loadComponent/);
    assert.match(
        rendered.files['src/app/app.routes.ts'],
        /canActivate: \[appAccessGuard\]/
    );
    assert.equal(
        [...rendered.files['src/app/app.routes.ts'].matchAll(/canActivate:/g)]
            .length,
        1,
        'only the single protected fixture page must receive a guard'
    );
    assert.match(
        rendered.files['src/app/access.guard.ts'],
        /if \(!decision\?\.isAuthenticated\(\)\) return false/
    );
    assert.match(
        rendered.files['src/app/access.guard.ts'],
        /createBrowserAccessDecision\(window\.__cmzAppAccessContext\)/,
        'le shell doit fournir un point d’entrée host générique et fail-closed'
    );
    assert.doesNotMatch(
        rendered.files['.cmz/pages/page_1111111111111111.json'],
        /angular/i
    );
});

test('le renderer produit directement des octets canoniques et les atteste', async () => {
    const options = await fixture();
    const rendered = await renderAngularPwaShell({
        design: options.data.design,
        experienceId: options.experienceId,
        appName: options.appName,
        designPath: options.designPath,
        designSha256: sha256(options.designContent),
    });
    const prefixed = Object.fromEntries(
        Object.entries(rendered.files).map(([path, content]) => [
            `apps/${options.appName}/${path}`,
            content,
        ])
    );
    assert.deepEqual(await canonicalizeGeneratedFiles(prefixed), prefixed);

    const manifest = JSON.parse(rendered.files['.cmz/app-manifest.json']);
    assert.deepEqual(
        manifest.generated_files,
        Object.entries(rendered.files)
            .filter(([path]) => path !== '.cmz/app-manifest.json')
            .map(([path, content]) => ({
                path,
                bytes: Buffer.byteLength(content),
                sha256: sha256(content),
            }))
            .sort((left, right) => left.path.localeCompare(right.path))
    );
    assert.equal(
        manifest.tree_sha256,
        sha256(
            manifest.generated_files
                .map((entry) => `${entry.path}\0${entry.sha256}`)
                .join('\0')
        )
    );
});

test('le renderer React produit un shell SPA mono-stack borné par les mêmes contrats', async () => {
    const options = await reactFixture();
    const rendered = await renderReactSpaShell({
        design: options.data.design,
        experienceId: options.experienceId,
        appName: options.appName,
        designPath: options.designPath,
        designSha256: sha256(options.designContent),
    });
    for (const path of [
        '.cmz/libraries.json',
        '.cmz/app-manifest.json',
        'project.json',
        'vite.config.mts',
        'src/main.tsx',
        'src/app/app.routes.tsx',
        'src/app/access-policy.tsx',
        'src/app/access-policy.spec.ts',
        '.cmz/pages/page_1111111111111111.json',
        '.cmz/pages/page_2222222222222222.json',
    ]) {
        assert.ok(rendered.files[path], `missing ${path}`);
    }
    assert.deepEqual(JSON.parse(rendered.files['.cmz/libraries.json']), {
        schema_version: '1.0.0',
        kind: 'app-library-manifest',
        platform: 'react',
        libraries: [],
    });
    assert.equal(
        JSON.parse(rendered.files['.cmz/app-manifest.json']).profile,
        'react-spa'
    );
    assert.match(rendered.files['vite.config.mts'], /@vitejs\/plugin-react/);
    assert.doesNotMatch(rendered.files['vite.config.mts'], /localhost/);
    assert.match(rendered.files['vite.config.mts'], /127\.0\.0\.1/);
    assert.match(rendered.files['src/main.tsx'], /<BrowserRouter>/);
    assert.match(rendered.files['src/app/app.routes.tsx'], /<Routes>/);
    assert.match(rendered.files['src/app/app.routes.tsx'], /<AppAccessGate/);
    assert.equal(
        [
            ...rendered.files['src/app/app.routes.tsx'].matchAll(
                /<AppAccessGate/g
            ),
        ].length,
        1,
        'only the protected fixture page must receive an access gate'
    );
    assert.match(
        rendered.files['src/app/access-policy.tsx'],
        /createBrowserAccessDecision\(\s*window\.__cmzAppAccessContext\s*\)/
    );
    assert.doesNotMatch(
        rendered.files['.cmz/pages/page_1111111111111111.json'],
        /react/i
    );
    assert.equal(rendered.files['public/manifest.webmanifest'], undefined);
    assert.equal(rendered.files['public/sw.js'], undefined);
    assert.doesNotMatch(
        Object.keys(rendered.files).join('\n'),
        /angular|service-worker/i
    );

    const prefixed = Object.fromEntries(
        Object.entries(rendered.files).map(([path, content]) => [
            `apps/${options.appName}/${path}`,
            content,
        ])
    );
    assert.deepEqual(await canonicalizeGeneratedFiles(prefixed), prefixed);
    const manifest = JSON.parse(rendered.files['.cmz/app-manifest.json']);
    assert.deepEqual(
        manifest.generated_files,
        Object.entries(rendered.files)
            .filter(([path]) => path !== '.cmz/app-manifest.json')
            .map(([path, content]) => ({
                path,
                bytes: Buffer.byteLength(content),
                sha256: sha256(content),
            }))
            .sort((left, right) => left.path.localeCompare(right.path))
    );
    assert.equal(
        manifest.tree_sha256,
        sha256(
            manifest.generated_files
                .map((entry) => `${entry.path}\0${entry.sha256}`)
                .join('\0')
        )
    );
});

test('le renderer React refuse de revendiquer un mode hors ligne non implémenté', async () => {
    const options = await fixture();
    await assert.rejects(
        () =>
            renderReactSpaShell({
                design: options.data.design,
                experienceId: options.experienceId,
                appName: options.appName,
                designPath: options.designPath,
                designSha256: sha256(options.designContent),
            }),
        /does not claim an offline policy/
    );
});

test('échappe le titre métier dans chaque contexte HTML et SVG', async () => {
    const options = await fixture();
    options.data.design.design.title = '<script>"unsafe" & test</script>';
    const rendered = await renderAngularPwaShell({
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
    const rendered = await renderAngularPwaShell({
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

test('dry-run n’écrit rien puis la publication directe vérifie compilation, build et lint', async () => {
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
    const result = await publishApplicationShell(options, { run });
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
    assert.deepEqual(publicApplicationShellResult(result), {
        schema_version: '1.0.0',
        status: 'created',
        phase: 'finalized',
        plan_id: plan.plan_id,
        output: plan.output,
        files: Object.keys(plan.files)
            .sort()
            .map((path) => `${plan.output}/${path}`),
        validations: [
            'application-design',
            'candidate-tree-sha256',
            'angular-ngc',
            'nx-build-production',
            'nx-lint',
            'published-tree-sha256',
        ],
        recovery:
            'Aucune action : publication terminée. En cas d’échec avant succès, relancer la même commande.',
    });
});

test('la publication React utilise TypeScript puis les mêmes oracles Nx', async () => {
    const options = await reactFixture();
    const calls = [];
    const result = await publishApplicationShell(options, {
        run: (command, args) => {
            calls.push([command, args]);
            return '';
        },
    });

    assert.deepEqual(
        calls.map((entry) => entry[1][0]),
        ['tsc', 'nx', 'nx']
    );
    assert.deepEqual(publicApplicationShellResult(result).validations, [
        'application-design',
        'candidate-tree-sha256',
        'typescript-tsc',
        'nx-build-production',
        'nx-lint',
        'published-tree-sha256',
    ]);
});

test('un profil de shell inconnu est refusé avant tout rendu', async () => {
    const options = await fixture();
    for (const profile of ['universal-ui', '__proto__', 'constructor']) {
        await assert.rejects(
            () => planApplicationShell({ ...options, profile }),
            new RegExp(`unsupported profile ${profile}`)
        );
    }
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
        () => publishApplicationShell(options, { run }),
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
        () => publishApplicationShell(options, { run: () => '' }),
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
                { ...options, expectedPlanId: plan.plan_id },
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
    const rendered = await renderAngularPwaShell({
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
        // ADR-0044 : Material et Tailwind sont opt-in. L'i18n Angular native
        // appartient au shell et n'est pas une bibliothèque optionnelle.
        libraries: [],
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

test('une app React fraîchement rendue passe la gate library-setup', async (t) => {
    const options = await reactFixture();
    const rendered = await renderReactSpaShell({
        design: options.data.design,
        experienceId: options.experienceId,
        appName: options.appName,
        designPath: options.designPath,
        designSha256: sha256(options.designContent),
    });

    const root = await mkdtemp(join(tmpdir(), 'cmz-react-shell-gate-'));
    t.after(() => rm(root, { recursive: true, force: true }));
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

    const recipes = validateRecipes(REPO_ROOT);
    assert.deepEqual(recipes.errors, []);
    const apps = verifyApps(root, recipes.recipes);
    assert.deepEqual(apps.errors, []);
    assert.equal(apps.ok, true);
});
