import assert from 'node:assert/strict';
import {
    cpSync,
    mkdtempSync,
    mkdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import {
    applyQualifiedAdapter,
    qualifiedAdapterDescriptor,
} from './qualified-adapters.mjs';

const ROOT = new URL('../..', import.meta.url).pathname;

function put(root, path, content) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
}

function copy(root, source, target) {
    const destination = join(root, target);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(join(ROOT, source), destination);
}

function fixture(t, { libraries = [] } = {}) {
    const root = mkdtempSync(join(tmpdir(), 'cmz-qualified-adapter-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    put(
        root,
        'apps/demo/project.json',
        `${JSON.stringify(
            {
                name: 'demo',
                projectType: 'application',
                sourceRoot: 'apps/demo/src',
                targets: {
                    build: {
                        executor: '@angular/build:application',
                        options: { styles: ['apps/demo/src/styles.scss'] },
                    },
                    lint: {},
                    test: {},
                },
            },
            null,
            2
        )}\n`
    );
    put(
        root,
        'apps/demo/.cmz/libraries.json',
        `${JSON.stringify(
            {
                schema_version: '1.0.0',
                kind: 'app-library-manifest',
                platform: 'angular',
                libraries,
            },
            null,
            2
        )}\n`
    );
    put(root, 'apps/demo/src/styles.scss', 'body { color: navy; }\n');
    put(
        root,
        'apps/demo/src/app/app.config.ts',
        `import { ApplicationConfig } from '@angular/core';\n\nexport const appConfig: ApplicationConfig = {\n    providers: [],\n};\n`
    );
    copy(
        root,
        'apps/backoffice-angular/.postcssrc.json',
        'apps/backoffice-angular/.postcssrc.json'
    );
    copy(
        root,
        'apps/backoffice-angular/src/tailwind.css',
        'apps/backoffice-angular/src/tailwind.css'
    );
    copy(
        root,
        'conventions/presentation/tailwind-theme.css',
        'conventions/presentation/tailwind-theme.css'
    );
    copy(
        root,
        'tools/library-setup/qualified-adapters.mjs',
        'tools/library-setup/qualified-adapters.mjs'
    );
    return root;
}

function reactFixture(t, { libraries = [] } = {}) {
    const root = mkdtempSync(join(tmpdir(), 'cmz-react-tailwind-adapter-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    put(
        root,
        'apps/demo/project.json',
        `${JSON.stringify(
            {
                name: 'demo',
                projectType: 'application',
                sourceRoot: 'apps/demo/src',
                targets: {},
            },
            null,
            2
        )}\n`
    );
    put(
        root,
        'apps/demo/.cmz/libraries.json',
        `${JSON.stringify(
            {
                schema_version: '1.0.0',
                kind: 'app-library-manifest',
                platform: 'react',
                libraries,
            },
            null,
            2
        )}\n`
    );
    put(
        root,
        'apps/demo/src/main.tsx',
        "import { App } from './app/app';\nimport './styles.scss';\n\nvoid App;\n"
    );
    put(root, 'apps/demo/src/styles.scss', ':root { color: navy; }\n');
    put(
        root,
        'apps/demo/vite.config.mts',
        "import react from '@vitejs/plugin-react';\nimport { defineConfig } from 'vite';\n\nexport default defineConfig({\n    plugins: [react()],\n});\n"
    );
    for (const path of [
        'conventions/libraries/react/tailwind.template.css',
        'conventions/presentation/tailwind-theme.css',
        'tools/library-setup/qualified-adapters.mjs',
        'tools/scaffold-tailwind-core.mjs',
    ]) {
        copy(root, path, path);
    }
    return root;
}

function manifest(root) {
    return JSON.parse(
        readFileSync(join(root, 'apps/demo/.cmz/libraries.json'), 'utf8')
    );
}

test('Material ajoute un thème plateforme sans perdre les styles humains', (t) => {
    const root = fixture(t);
    applyQualifiedAdapter({
        workspace: root,
        app: 'demo',
        platform: 'angular',
        library: 'angular-material',
        track: { packages: { '@angular/material': '22.0.5' } },
    });
    const styles = readFileSync(
        join(root, 'apps/demo/src/styles.scss'),
        'utf8'
    );
    assert.match(styles, /@use '@angular\/material' as mat/);
    assert.match(styles, /plain-family: system-ui/);
    assert.match(styles, /body \{ color: navy; \}/);
    assert.deepEqual(manifest(root).libraries, ['angular-material']);
});

test('Tailwind dérive les fichiers relus et câble exactement l’app cible', (t) => {
    const root = fixture(t);
    applyQualifiedAdapter({
        workspace: root,
        app: 'demo',
        platform: 'angular',
        library: 'tailwind',
        track: {
            packages: {
                tailwindcss: '4.3.3',
                '@tailwindcss/postcss': '4.3.3',
            },
        },
    });
    const css = readFileSync(join(root, 'apps/demo/src/tailwind.css'), 'utf8');
    assert.match(css, /Adaptateur qualifié CMZ, tailwindcss@4\.3\.3/);
    assert.match(css, /@import 'tailwindcss' source\(none\)/);
    assert.match(css, /@source '\.\.\/\.\.\/\.\.\/apps\/demo\/src'/);
    assert.doesNotMatch(css, /apps\/backoffice-angular\/src/);
    const project = JSON.parse(
        readFileSync(join(root, 'apps/demo/project.json'), 'utf8')
    );
    assert.equal(
        project.targets.build.options.styles[0],
        'apps/demo/src/tailwind.css'
    );
    assert.deepEqual(manifest(root).libraries, ['tailwind']);
});

test('Tailwind React emploie le plugin Vite officiel et garde SCSS séparé', (t) => {
    const root = reactFixture(t);
    applyQualifiedAdapter({
        workspace: root,
        app: 'demo',
        platform: 'react',
        library: 'tailwind',
        track: {
            packages: {
                tailwindcss: '4.3.3',
                '@tailwindcss/vite': '4.3.3',
            },
        },
    });

    const css = readFileSync(join(root, 'apps/demo/src/tailwind.css'), 'utf8');
    const main = readFileSync(join(root, 'apps/demo/src/main.tsx'), 'utf8');
    const vite = readFileSync(join(root, 'apps/demo/vite.config.mts'), 'utf8');
    assert.match(css, /tailwindcss@4\.3\.3/);
    assert.match(css, /@import 'tailwindcss' source\(none\)/);
    assert.match(css, /@source '\.\/'/);
    assert.match(main, /tailwind\.css';\nimport '\.\/styles\.scss'/);
    assert.match(vite, /from '@tailwindcss\/vite'/);
    assert.match(vite, /plugins: \[tailwindcss\(\), react\(\)\]/);
    assert.deepEqual(manifest(root).libraries, ['tailwind']);

    const descriptor = qualifiedAdapterDescriptor(root, 'react', 'tailwind');
    assert.equal(descriptor.id, 'react/tailwind@1');
});

test('les conflits et la dérive d’une entrée qualifiée échouent fermés', (t) => {
    const root = fixture(t, { libraries: ['tailwind'] });
    assert.throws(
        () =>
            applyQualifiedAdapter({
                workspace: root,
                app: 'demo',
                platform: 'angular',
                library: 'tailwind',
                track: { packages: { tailwindcss: '4.3.3' } },
            }),
        /existe déjà|déjà déclarée/
    );

    const before = qualifiedAdapterDescriptor(root, 'angular', 'tailwind');
    writeFileSync(
        join(root, 'apps/backoffice-angular/.postcssrc.json'),
        '{"plugins":{}}\n'
    );
    const after = qualifiedAdapterDescriptor(root, 'angular', 'tailwind');
    assert.notEqual(after.digest_sha256, before.digest_sha256);
});
