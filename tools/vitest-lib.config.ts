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
        // Backlog cartographie #4 (2026-08-04) — mêmes 3 couches ajoutées
        // pour les 8 modules crud-entity/action-request qui n'avaient
        // encore aucun test (donc jamais eu besoin de résoudre leurs
        // propres imports @cmz/* sous Vitest).
        '@cmz/authentication-domain': resolve(
            root,
            'libs/authentication/domain/src/index.ts'
        ),
        '@cmz/authentication-data': resolve(
            root,
            'libs/authentication/data/src/index.ts'
        ),
        '@cmz/authentication-application': resolve(
            root,
            'libs/authentication/application/src/index.ts'
        ),
        '@cmz/content-management-domain': resolve(
            root,
            'libs/content-management/domain/src/index.ts'
        ),
        '@cmz/content-management-data': resolve(
            root,
            'libs/content-management/data/src/index.ts'
        ),
        '@cmz/content-management-application': resolve(
            root,
            'libs/content-management/application/src/index.ts'
        ),
        '@cmz/coverage-areas-domain': resolve(
            root,
            'libs/coverage-areas/domain/src/index.ts'
        ),
        '@cmz/coverage-areas-data': resolve(
            root,
            'libs/coverage-areas/data/src/index.ts'
        ),
        '@cmz/coverage-areas-application': resolve(
            root,
            'libs/coverage-areas/application/src/index.ts'
        ),
        '@cmz/administrative-boundary-domain': resolve(
            root,
            'libs/administrative-boundary/domain/src/index.ts'
        ),
        '@cmz/administrative-boundary-data': resolve(
            root,
            'libs/administrative-boundary/data/src/index.ts'
        ),
        '@cmz/administrative-boundary-application': resolve(
            root,
            'libs/administrative-boundary/application/src/index.ts'
        ),
        '@cmz/settings-security-domain': resolve(
            root,
            'libs/settings-security/domain/src/index.ts'
        ),
        '@cmz/settings-security-data': resolve(
            root,
            'libs/settings-security/data/src/index.ts'
        ),
        '@cmz/settings-security-application': resolve(
            root,
            'libs/settings-security/application/src/index.ts'
        ),
        '@cmz/administrative-infrastructure-domain': resolve(
            root,
            'libs/administrative-infrastructure/domain/src/index.ts'
        ),
        '@cmz/administrative-infrastructure-data': resolve(
            root,
            'libs/administrative-infrastructure/data/src/index.ts'
        ),
        '@cmz/administrative-infrastructure-application': resolve(
            root,
            'libs/administrative-infrastructure/application/src/index.ts'
        ),
        '@cmz/team-organization-domain': resolve(
            root,
            'libs/team-organization/domain/src/index.ts'
        ),
        '@cmz/team-organization-data': resolve(
            root,
            'libs/team-organization/data/src/index.ts'
        ),
        '@cmz/team-organization-application': resolve(
            root,
            'libs/team-organization/application/src/index.ts'
        ),
        '@cmz/communication-domain': resolve(
            root,
            'libs/communication/domain/src/index.ts'
        ),
        '@cmz/communication-data': resolve(
            root,
            'libs/communication/data/src/index.ts'
        ),
        '@cmz/communication-application': resolve(
            root,
            'libs/communication/application/src/index.ts'
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
