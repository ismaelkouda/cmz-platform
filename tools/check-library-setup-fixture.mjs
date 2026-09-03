/**
 * Fixtures partagées des suites check-library-setup*.test.mjs.
 * Fichier `.mjs` (pas `.test.mjs`) : jamais exécuté seul par `node --test`.
 */
import {
    copyFile,
    mkdir,
    mkdtemp,
    rm,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const RECIPE_SCHEMA = 'conventions/libraries/library-setup.schema.json';
export const MANIFEST_SCHEMA =
    'conventions/libraries/app-library-manifest.schema.json';

export async function write(path, content) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(
        path,
        typeof content === 'string'
            ? content
            : `${JSON.stringify(content, null, 2)}\n`
    );
}

export function validRecipe(overrides = {}) {
    return {
        schema_version: '1.0.0',
        library: 'demo',
        platform: 'angular',
        packages: ['demo-pkg'],
        install: {
            method: 'llm-then-verified',
            prompt_contract: 'installe demo puis vérifie',
            notes: 'installé puis vérifié',
        },
        static_invariants: [
            {
                id: 'present',
                description: 'demo.config.ts mentionne demo',
                footprint: true,
                assert: {
                    file: 'demo.config.ts',
                    kind: 'file-contains',
                    value: 'demoFeature',
                },
            },
        ],
        runtime_acceptance: [
            {
                id: 'works',
                description: 'le composant demo compile',
                proof: 'compile-component',
                status: 'harness-pending',
            },
        ],
        guidance: 'https://example.com/demo',
        ...overrides,
    };
}

/** Racine jetable : vrais schémas + recettes + package.json/bun.lock + apps. */
export async function scaffold(
    t,
    { recipes = {}, rootPackage, bunLock, apps = {} } = {}
) {
    const root = await mkdtemp(join(tmpdir(), 'cmz-library-setup-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(join(root, 'conventions/libraries'), { recursive: true });
    await copyFile(join(REPO_ROOT, RECIPE_SCHEMA), join(root, RECIPE_SCHEMA));
    await copyFile(
        join(REPO_ROOT, MANIFEST_SCHEMA),
        join(root, MANIFEST_SCHEMA)
    );
    for (const [stem, recipe] of Object.entries(recipes)) {
        await write(
            join(root, `conventions/libraries/${stem}.setup.json`),
            recipe
        );
    }
    await write(
        join(root, 'package.json'),
        rootPackage ?? {
            dependencies: { 'demo-pkg': 'catalog:' },
            workspaces: { catalog: { 'demo-pkg': '1.0.0' } },
        }
    );
    await write(
        join(root, 'bun.lock'),
        typeof bunLock === 'string'
            ? bunLock
            : JSON.stringify(
                  bunLock ?? {
                      lockfileVersion: 1,
                      workspaces: {
                          '': { dependencies: { 'demo-pkg': 'catalog:' } },
                      },
                      packages: {
                          'demo-pkg': ['demo-pkg@1.0.0', '', {}, 'sha'],
                      },
                  },
                  null,
                  2
              )
    );
    for (const [appName, spec] of Object.entries(apps)) {
        const base = join(root, 'apps', appName);
        await write(
            join(base, 'project.json'),
            spec.project ?? {
                name: appName,
                targets: { build: { executor: '@angular/build:application' } },
            }
        );
        if (spec.manifest !== null) {
            await write(
                join(base, '.cmz/libraries.json'),
                spec.manifest ?? {
                    schema_version: '1.0.0',
                    kind: 'app-library-manifest',
                    platform: 'angular',
                    libraries: [],
                }
            );
        }
        for (const [rel, content] of Object.entries(spec.files ?? {})) {
            await write(join(base, rel), content);
        }
        for (const [rel, target] of Object.entries(spec.symlinks ?? {})) {
            await mkdir(dirname(join(base, rel)), { recursive: true });
            await symlink(target, join(base, rel));
        }
    }
    return root;
}
