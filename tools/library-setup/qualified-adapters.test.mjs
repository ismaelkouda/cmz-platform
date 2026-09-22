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
        'tools/library-setup/qualified-adapters.mjs',
        'tools/library-setup/qualified-adapters.mjs'
    );
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
                tailwindcss: '4.1.13',
                '@tailwindcss/postcss': '4.1.13',
            },
        },
    });
    const css = readFileSync(join(root, 'apps/demo/src/tailwind.css'), 'utf8');
    assert.match(css, /Adaptateur qualifié CMZ, tailwindcss@4\.1\.13/);
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

test('Transloco produit un câblage standalone explicite et déterministe', (t) => {
    const root = fixture(t);
    applyQualifiedAdapter({
        workspace: root,
        app: 'demo',
        platform: 'angular',
        library: 'transloco',
        track: { packages: { '@jsverse/transloco': '8.4.0' } },
    });
    const config = readFileSync(
        join(root, 'apps/demo/src/app/app.config.ts'),
        'utf8'
    );
    assert.match(config, /provideHttpClient\(\)/);
    assert.match(config, /provideTransloco\(/);
    assert.match(config, /loader: TranslocoHttpLoader/);
    assert.match(
        readFileSync(
            join(root, 'apps/demo/src/app/transloco-loader.ts'),
            'utf8'
        ),
        /implements TranslocoLoader/
    );
    assert.equal(
        readFileSync(join(root, 'apps/demo/public/i18n/en.json'), 'utf8'),
        '{}\n'
    );
    assert.deepEqual(manifest(root).libraries, ['transloco']);
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
                track: { packages: { tailwindcss: '4.1.13' } },
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
