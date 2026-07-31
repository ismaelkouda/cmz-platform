/**
 * Configuration Vitest partagée pour les libs pures (domain, data, application).
 * Importée par les vite.config.ts de chaque lib en mode package-based Nx.
 *
 * Le builder `@angular/build:unit-test` cible les apps Angular complètes
 * (avec angular.json). Pour les libs isolées en mode package-based, on utilise
 * Vitest directement via `nx:run-commands`.
 *
 * ADR-0008 : Vitest — même moteur esbuild que le build applicatif.
 */
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export function defineLibTestConfig(libRoot: string) {
    return defineConfig({
        test: {
            globals: true,
            environment: 'node',
            // Chemins absolus — Vitest est lancé depuis la racine du monorepo
            include: [
                resolve(libRoot, 'src/**/*.spec.ts'),
                resolve(libRoot, 'src/**/*.test.ts'),
            ],
            reporters: ['verbose'],
            coverage: {
                provider: 'v8',
                reporter: ['text', 'lcov'],
                include: [resolve(libRoot, 'src/**/*.ts')],
                exclude: [
                    resolve(libRoot, 'src/**/*.spec.ts'),
                    resolve(libRoot, 'src/**/*.test.ts'),
                    resolve(libRoot, 'src/index.ts'),
                ],
            },
        },
        resolve: {
            alias: buildAliases(libRoot),
        },
    });
}

/**
 * Construit les alias de résolution de modules depuis tsconfig.base.json
 * pour que `import from '@cmz/...'` fonctionne dans les tests sans build préalable.
 */
function buildAliases(libRoot: string): Record<string, string> {
    const root = resolve(libRoot, '../../..'); // remonte à la racine du monorepo
    // Noyau partagé — les libs de test en ont presque toutes besoin
    return {
        '@cmz/shared-domain': resolve(root, 'libs/shared/domain/src/index.ts'),
        '@cmz/shared-data': resolve(root, 'libs/shared/data/src/index.ts'),
        '@cmz/shared-application': resolve(
            root,
            'libs/shared/application/src/index.ts'
        ),
        '@cmz/shared-ui': resolve(root, 'libs/shared/ui/src/index.ts'),
        '@cmz/shared-constants': resolve(
            root,
            'libs/shared/constants/src/index.ts'
        ),
        '@cmz/core': resolve(root, 'libs/core/src/index.ts'),
        '@cmz/report-states-domain': resolve(
            root,
            'libs/report-states/domain/src/index.ts'
        ),
        '@cmz/report-states-data': resolve(
            root,
            'libs/report-states/data/src/index.ts'
        ),
        '@cmz/report-states-application': resolve(
            root,
            'libs/report-states/application/src/index.ts'
        ),
        '@cmz/processing-domain': resolve(
            root,
            'libs/processing/domain/src/index.ts'
        ),
        '@cmz/processing-data': resolve(
            root,
            'libs/processing/data/src/index.ts'
        ),
        '@cmz/processing-application': resolve(
            root,
            'libs/processing/application/src/index.ts'
        ),
        '@cmz/requests-domain': resolve(
            root,
            'libs/requests/domain/src/index.ts'
        ),
        '@cmz/requests-data': resolve(root, 'libs/requests/data/src/index.ts'),
        '@cmz/requests-application': resolve(
            root,
            'libs/requests/application/src/index.ts'
        ),
        '@cmz/finalization-domain': resolve(
            root,
            'libs/finalization/domain/src/index.ts'
        ),
        '@cmz/finalization-data': resolve(
            root,
            'libs/finalization/data/src/index.ts'
        ),
        '@cmz/finalization-application': resolve(
            root,
            'libs/finalization/application/src/index.ts'
        ),
    };
}
