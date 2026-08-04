/**
 * Configuration Vitest partagée pour les libs pures (domain, data, application).
 *
 * Usage Nx (`project.json`) :
 * ```
 * bunx vitest run --config tools/vitest-lib.config.ts
 * env: { CMZ_VITEST_LIB_ROOT: "libs/<module>/<layer>" }
 * ```
 *
 * Le builder `@angular/build:unit-test` cible les apps Angular complètes
 * (avec angular.json). Pour les libs isolées en mode package-based, on utilise
 * Vitest directement via `nx:run-commands`.
 *
 * ADR-0008 : Vitest — même moteur esbuild que le build applicatif.
 */
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '..');

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
            alias: buildAliases(),
        },
    });
}

/**
 * Alias `@cmz/*` → sources TypeScript, pour que les tests résolvent sans
 * build préalable des libs dépendantes.
 */
function buildAliases(): Record<string, string> {
    const root = workspaceRoot;
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

/** Config Vitest — exige `CMZ_VITEST_LIB_ROOT` (chemin relatif au workspace). */
export default () => {
    const libRootEnv = process.env.CMZ_VITEST_LIB_ROOT;
    if (!libRootEnv) {
        throw new Error(
            'CMZ_VITEST_LIB_ROOT manquant — définir le chemin de la lib ' +
                '(ex. libs/report-states/domain) via project.json options.env.'
        );
    }
    return defineLibTestConfig(resolve(workspaceRoot, libRootEnv));
};
