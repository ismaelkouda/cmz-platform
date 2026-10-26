import { canonicalizeGeneratedFiles } from '../core/canonicalize-generated.mjs';

// Disposition unique du produit extérieur, consommée aussi par ses preuves et gardes.
export const EXTERNAL_WORKSPACE_CMZ = Object.freeze({
    manifest: '.cmz/application-workspace.json',
    support: '.cmz/support',
    proof: '.cmz/proof',
});

export const SHELL_PACKAGES = Object.freeze({
    common: {
        dependencies: ['tslib'],
        devDependencies: [
            'nx',
            'typescript',
            'eslint',
            '@eslint/js',
            'typescript-eslint',
            '@nx/eslint',
            '@nx/web',
            'prettier',
            '@playwright/test',
            'vitest',
            'jsdom',
            'sass',
            '@types/node',
        ],
    },
    'angular-pwa': {
        dependencies: [
            '@angular/common',
            '@angular/compiler',
            '@angular/core',
            '@angular/localize',
            '@angular/platform-browser',
            '@angular/router',
            'rxjs',
        ],
        devDependencies: [
            '@angular/build',
            '@angular/compiler-cli',
            'angular-eslint',
            '@angular-devkit/core',
            '@angular-devkit/architect',
        ],
    },
    'react-spa': {
        dependencies: ['react', 'react-dom', 'react-router'],
        devDependencies: [
            '@nx/react',
            '@nx/vite',
            '@nx/vitest',
            '@vitejs/plugin-react',
            '@types/react',
            '@types/react-dom',
            'vite',
            'eslint-plugin-react-hooks',
        ],
    },
});

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function productCheck() {
    return `import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const packageName = (name) => name.startsWith('@') ? name.split('/').slice(0, 2).join('/') : name.split('/')[0];
const ignored = new Set(['.git', 'node_modules', '.nx', '.angular', 'dist', 'coverage', 'tmp']);

async function sources(directory, found) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        assert.equal(entry.isSymbolicLink(), false, 'Lien dans les sources');
        if (entry.isDirectory()) {
            if (!ignored.has(entry.name)) await sources(path, found);
        } else if (entry.isFile() && /\\.(?:[cm]?[jt]s|jsx|tsx|html|css|scss)$/.test(entry.name)) {
            const content = await readFile(path, 'utf8');
            const lines = content.split('\\n').length - (content.endsWith('\\n') ? 1 : 0);
            assert.ok(lines <= 800 && Buffer.byteLength(content) <= 1048576, 'Poids source');
            found.push([path, content]);
        }
    }
}

async function verifiedSnapshot(path, expectedHash) {
    assert.match(path, /^[a-zA-Z0-9._/-]+$/);
    assert.ok(!path.startsWith('/') && !path.split('/').some((part) => !part || part === '.' || part === '..'));
    let current = root;
    for (const part of path.split('/')) {
        current = resolve(current, part);
        assert.equal((await lstat(current)).isSymbolicLink(), false, 'Lien dans une entrée');
    }
    assert.equal(await realpath(current), current, 'Entrée hors produit');
    assert.ok((await lstat(current)).isFile());
    const bytes = await readFile(current);
    assert.equal(hash(bytes), expectedHash, 'Empreinte d’entrée');
    return bytes;
}

export async function checkWorkspace() {
    const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
    const manifest = JSON.parse(await readFile(resolve(root, '${EXTERNAL_WORKSPACE_CMZ.manifest}'), 'utf8'));
    const declared = { ...pkg.dependencies, ...pkg.devDependencies };
    assert.equal(manifest.kind, 'application-workspace-manifest');
    assert.deepEqual(Object.keys(declared).sort(), Object.keys(manifest.packages).sort(), 'Fermeture des packages');
    for (const file of manifest.files) {
        assert.equal(hash(await readFile(resolve(root, file.path))), file.sha256, 'Configuration modifiée');
    }
    for (const [name, version] of Object.entries(declared)) {
        assert.match(version, /^\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9.-]+)?$/);
        assert.equal(version, manifest.packages[name].version);
        const path = resolve(root, 'node_modules', name, 'package.json');
        const physical = await realpath(path);
        assert.ok(physical.startsWith(resolve(root, 'node_modules') + '/'), 'Dépendance hors produit');
        assert.equal(JSON.parse(await readFile(path, 'utf8')).version, version, 'Version installée');
    }
    const base = JSON.parse(await readFile(resolve(root, 'tsconfig.base.json'), 'utf8'));
    assert.equal(base.compilerOptions.strict, true);
    assert.deepEqual(base.compilerOptions.paths ?? {}, {});
    assert.equal(base.extends, undefined);
    const found = [];
    await sources(root, found);
    const consumers = new Set();
    for (const [path, content] of found) {
        if (!/\\.(?:[cm]?[jt]s|jsx|tsx)$/.test(path)) continue;
        const ast = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
        function inspect(node) {
            let name;
            if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) name = node.moduleSpecifier.text;
            if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) name = node.arguments[0].text;
            if (name) {
                if (name.startsWith('.')) {
                    assert.ok(resolve(dirname(path), name).startsWith(root + '/'), 'Import relatif hors produit');
                } else if (!name.startsWith('node:') && !builtinModules.includes(name)) {
                    assert.ok(!name.startsWith('/') && !name.includes(':'), 'Import extérieur');
                    const consumer = packageName(name);
                    assert.ok(Object.hasOwn(declared, consumer), 'Import non déclaré');
                    consumers.add(consumer);
                    if (path.includes('/src/')) {
                        const appRoot = path.slice(0, path.indexOf('/src/'));
                        const app = JSON.parse(ts.sys.readFile(resolve(appRoot, '.cmz/app-manifest.json')) ?? '{}');
                        if (app.profile === 'angular-pwa') assert.ok(!/^react(?:$|-|\\/)/.test(name), 'Import React dans Angular');
                        if (app.profile === 'react-spa') assert.ok(!name.startsWith('@angular/'), 'Import Angular dans React');
                    }
                }
            }
            ts.forEachChild(node, inspect);
        }
        inspect(ast);
    }
    const profiles = new Set();
    for (const entry of await readdir(resolve(root, 'apps'), { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const appRoot = resolve(root, 'apps', entry.name);
        const app = JSON.parse(await readFile(resolve(appRoot, '.cmz/app-manifest.json'), 'utf8'));
        profiles.add(app.profile);
        const design = JSON.parse((await verifiedSnapshot(app.design_ref.path, app.design_ref.sha256)).toString('utf8'));
        for (const source of design.sources ?? []) await verifiedSnapshot(source.snapshot_uri, source.sha256);
        for (const reference of design.backend_contracts ?? []) {
            const contract = JSON.parse((await verifiedSnapshot(reference.snapshot_uri, reference.sha256)).toString('utf8'));
            for (const source of contract.sources ?? []) {
                if (source.snapshot_uri) await verifiedSnapshot(source.snapshot_uri, source.sha256);
            }
        }
        for (const file of app.generated_files) await verifiedSnapshot('apps/' + entry.name + '/' + file.path, file.sha256);
        const project = JSON.parse(await readFile(resolve(appRoot, 'project.json'), 'utf8'));
        for (const target of Object.values(project.targets ?? {})) {
            if (!target.executor) continue;
            const name = target.executor.split(':')[0];
            assert.ok(Object.hasOwn(declared, name), 'Executor non déclaré');
            consumers.add(name);
        }
    }
    const native = new Set(['nx', 'typescript', 'eslint', 'prettier', 'jsdom', 'sass', 'vite', 'tslib', '@types/node', '@types/react', '@types/react-dom', '@nx/react', '@angular/compiler', '@angular/compiler-cli', '@angular/localize', '@angular-devkit/core', '@angular-devkit/architect', 'rxjs']);
    // The prepared workspace may contain the qualified build-tool union
    // before its second application exists. Enforce actual consumers once
    // each declared profile has an application; never permit an extra package.
    if (manifest.profiles.every((profile) => profiles.has(profile))) {
        for (const name of Object.keys(declared)) assert.ok(consumers.has(name) || native.has(name), 'Paquet direct sans consommateur');
    }
    assert.ok((await lstat(resolve(root, 'bun.lock'))).isFile(), 'Verrou requis');
    process.stdout.write('Workspace : configurations, imports, versions et poids vérifiés.\\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    checkWorkspace().catch(() => {
        process.stderr.write('Échec du contrat workspace.\\n');
        process.exitCode = 1;
    });
}
`;
}

function browserSmoke() {
    return `import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const [buildPath, browserPath, fixturePath] = process.argv.slice(2);
assert.ok(buildPath && browserPath && fixturePath, 'Arguments de preuve requis');
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
const root = resolve(buildPath);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = createServer(async (request, response) => {
    try {
        const path = resolve(root, '.' + new URL(request.url ?? '/', 'http://localhost').pathname);
        assert.ok(path === root || path.startsWith(root + '/'));
        let bytes;
        let extension = extname(path);
        try { bytes = await readFile(path); }
        catch { bytes = await readFile(resolve(root, 'index.html')); extension = '.html'; }
        response.writeHead(200, { 'content-type': types[extension] ?? 'application/octet-stream' });
        response.end(bytes);
    } catch { response.writeHead(400); response.end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const address = server.address();
assert.ok(address && typeof address === 'object');
const origin = 'http://127.0.0.1:' + address.port;
let browser;
try {
    browser = await chromium.launch({ executablePath: browserPath, headless: true });
    const context = await browser.newContext({ serviceWorkers: 'block' });
    // This oracle covers routing/guards, not offline behaviour. Simulate a
    // browser without service-worker support so it cannot mask a fresh build.
    await context.addInitScript(() => {
        Reflect.deleteProperty(globalThis.Navigator.prototype, 'serviceWorker');
    });
    const external = [];
    await context.route('**/*', (route) => {
        if (new URL(route.request().url()).origin !== origin) {
            external.push(true);
            return route.abort();
        }
        return route.continue();
    });
    const page = await context.newPage();
    await page.goto(origin + fixture.publicPath);
    await page.getByRole('heading', { name: fixture.publicTitle, exact: true }).waitFor();
    assert.equal(await page.title(), fixture.title);
    await page.goto(origin + fixture.protectedPath);
    // Here the fixture has no API or polling. Wait for lazy route chunks
    // and rendering before the negative assertion; a guard-removal mutant
    // must not pass merely because its component is still downloading.
    await page.waitForLoadState('networkidle');
    assert.equal(await page.getByRole('heading', { name: fixture.protectedTitle, exact: true }).count(), 0, 'La garde doit refuser');
    await page.goto(origin + fixture.publicPath);
    await page.getByRole('heading', { name: fixture.publicTitle, exact: true }).waitFor();
    assert.deepEqual(external, [], 'Requête extérieure interdite');
    process.stdout.write('Navigateur : titre, route publique et garde vérifiés.\\n');
} finally {
    if (browser) await browser.close();
    await new Promise((done, reject) => server.close((error) => error ? reject(error) : done()));
}
`;
}

export async function renderApplicationWorkspace(options) {
    const {
        profiles,
        packages,
        packageManager,
        engines,
        githubRepository,
        reviewOwner,
    } = options;
    const group = (key) =>
        Object.fromEntries(
            Object.entries(packages)
                .filter(([, value]) => value.group === key)
                .map(([name, value]) => [name, value.version])
                .sort(([a], [b]) => a.localeCompare(b))
        );
    const files = {
        'package.json': json({
            name: `@${githubRepository.toLowerCase()}`,
            version: '0.0.0',
            private: true,
            packageManager,
            engines,
            overrides: options.packageOverrides,
            workspaces: ['apps/*'],
            scripts: {
                'check:workspace': `node ${EXTERNAL_WORKSPACE_CMZ.support}/check-workspace.mjs`,
                build: 'node node_modules/nx/dist/bin/nx.js run-many -t build --configuration=production --skipNxCache',
                lint: 'node node_modules/nx/dist/bin/nx.js run-many -t lint --skipNxCache',
                test: 'node node_modules/nx/dist/bin/nx.js run-many -t test --skipNxCache',
                'format:check':
                    'node node_modules/prettier/bin/prettier.cjs --check .',
            },
            dependencies: group('dependencies'),
            devDependencies: group('devDependencies'),
        }),
        'nx.json': json({
            $schema: './node_modules/nx/schemas/nx-schema.json',
            analytics: false,
            defaultBase: 'main',
            workspaceLayout: { appsDir: 'apps', libsDir: 'libs' },
            namedInputs: {
                default: [
                    '{projectRoot}/**/*',
                    '{workspaceRoot}/tsconfig.base.json',
                    '{workspaceRoot}/eslint.config.mjs',
                ],
            },
            targetDefaults: {
                build: { cache: false },
                test: { cache: false },
                lint: { cache: false, options: { maxWarnings: 0 } },
            },
            plugins: [],
        }),
        'tsconfig.base.json': json({
            compilerOptions: {
                target: 'ES2022',
                module: 'ESNext',
                moduleResolution: 'bundler',
                lib: ['ES2022', 'DOM', 'DOM.Iterable'],
                strict: true,
                noImplicitOverride: true,
                noFallthroughCasesInSwitch: true,
                noPropertyAccessFromIndexSignature: true,
                forceConsistentCasingInFileNames: true,
                skipLibCheck: true,
                isolatedModules: true,
                experimentalDecorators: true,
                importHelpers: true,
                resolveJsonModule: true,
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
                paths: {},
            },
        }),
        'eslint.config.mjs': `import js from '@eslint/js';
import ts from 'typescript-eslint';

export default [
    { ignores: ['node_modules/**', 'dist/**', 'coverage/**', '.nx/**', '.angular/**', 'tmp/**', 'apps/.*-candidate-*/**'] },
    { ...js.configs.recommended, files: ['**/*.mjs', '**/*.js'], languageOptions: { globals: { process: 'readonly', Buffer: 'readonly', URL: 'readonly', self: 'readonly', caches: 'readonly', fetch: 'readonly' } } },
    ...ts.configs.recommended,
    { files: ['**/*.{js,mjs,ts,tsx,mts}'], rules: { 'no-console': 'error', 'no-debugger': 'error', '@typescript-eslint/no-explicit-any': 'error' } },
];
`,
        '.prettierrc.json': json({
            printWidth: 80,
            tabWidth: 4,
            singleQuote: true,
            trailingComma: 'es5',
        }),
        '.prettierignore':
            'node_modules/\ndist/\ncoverage/\n.nx/\n.angular/\nbun.lock\ntmp/\n',
        '.gitignore':
            'node_modules/\ndist/\ncoverage/\n.nx/\n.angular/\ntmp/\n.env\n.env.*\n*.har\napps/.*-candidate-*/\napps/.*.generation-lock*/\n',
        'README.md': `# Workspace applicatif\n\nProfils natifs : ${profiles.join(', ')}.\n\nDépôt : ${githubRepository}. Relecture : @${reviewOwner}.\n\nInstaller les dépendances avec bun install --frozen-lockfile --ignore-scripts depuis cette racine ; le verrou candidat attend sa qualification native.\nLes entrées approuvées vivent ici. Aucun lien vers les outils de création.\nLes contrôles production T19–T28 attendent leur qualification avant publication.\n`,
        'AGENTS.md':
            '# Règles du produit\n\nEntrées et contrats approuvés uniquement. Angular et React restent natifs et séparés.\nAucun secret, HAR, environnement réel, appel serveur implicite ni publication sans accord.\nCompiler, linter sans avertissement et tester chaque cible après modification.\n',
        [`${EXTERNAL_WORKSPACE_CMZ.support}/check-workspace.mjs`]:
            productCheck(),
        [`${EXTERNAL_WORKSPACE_CMZ.support}/browser-smoke.mjs`]: browserSmoke(),
    };
    if (profiles.includes('angular-pwa')) {
        files[
            `${EXTERNAL_WORKSPACE_CMZ.support}/angular-unit-test.config.mjs`
        ] = "export default { server: { host: '127.0.0.1' } };\n";
    }
    return canonicalizeGeneratedFiles(files);
}

export function adaptExternalShellFiles(files, { profile, appName }) {
    const root = `apps/${appName}`;
    const project = JSON.parse(files['project.json']);
    const angular = profile === 'angular-pwa';
    project.targets ??= {};
    project.targets.lint = {
        executor: '@nx/eslint:lint',
        options: {
            lintFilePatterns: [
                `${root}/**/*.${angular ? '{ts,mts,mjs,js,html}' : '{ts,tsx,mts,mjs,js}'}`,
            ],
            eslintConfig: `${root}/eslint.config.mjs`,
            maxWarnings: 0,
        },
    };
    if (angular) {
        project.targets.test.options.runnerConfig = `${EXTERNAL_WORKSPACE_CMZ.support}/angular-unit-test.config.mjs`;
        for (const [path, content] of Object.entries(files)) {
            if (!path.endsWith('.ts') || !content.includes('@Component({'))
                continue;
            files[path] = content
                .replace(
                    "import { Component } from '@angular/core';",
                    "import { ChangeDetectionStrategy, Component } from '@angular/core';"
                )
                .replace(
                    '@Component({',
                    '@Component({\n    changeDetection: ChangeDetectionStrategy.OnPush,'
                );
        }
        files['eslint.config.mjs'] = `import angular from 'angular-eslint';
import ts from 'typescript-eslint';
import base from '../../eslint.config.mjs';

export default ts.config(
    ...base,
    {
        files: ['**/*.ts'],
        extends: [angular.configs.tsRecommended],
        processor: angular.processInlineTemplates,
        rules: {
            '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
            '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
        },
    },
    {
        files: ['**/*.html'],
        extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    }
);
`;
        files['src/main.ts'] = files['src/main.ts'].replace(
            '.catch((error: unknown) => console.error(error));',
            `.catch(() => {
    const message = document.createElement('p');
    message.setAttribute('role', 'alert');
    message.textContent = 'L’application n’a pas pu démarrer.';
    document.body.replaceChildren(message);
});`
        );
    } else {
        project.targets.build = {
            executor: '@nx/vite:build',
            defaultConfiguration: 'production',
            outputs: ['{options.outputPath}'],
            options: {
                configFile: `${root}/vite.config.mts`,
                outputPath: `dist/${root}`,
                tsConfig: `${root}/tsconfig.app.json`,
                skipTypeCheck: false,
            },
            configurations: { production: { mode: 'production' } },
        };
        project.targets.test = {
            executor: '@nx/vitest:test',
            options: { configFile: `${root}/vite.config.mts`, watch: false },
        };
        project.targets['serve-static'] = {
            executor: '@nx/web:file-server',
            continuous: true,
            options: {
                buildTarget: `${appName}:build:production`,
                staticFilePath: `dist/${root}`,
                spa: true,
            },
        };
        files['vite.config.mts'] = files['vite.config.mts'].replace(
            "import { defineConfig } from 'vite';",
            "import { defineConfig } from 'vitest/config';"
        );
    }
    files['project.json'] = json(project);
    for (const name of ['tsconfig.app.json', 'tsconfig.spec.json']) {
        const config = JSON.parse(files[name]);
        config.compilerOptions.outDir = `../../dist/out-tsc/${appName}/${name.includes('spec') ? 'spec' : 'app'}`;
        files[name] = json(config);
    }
}
