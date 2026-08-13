/**
 * Configuration Vitest pour les specs `*.rxresource.spec.ts` — libs pures
 * (application) dont le code sous test utilise `rxResource`/`effect()`
 * (`@angular/core/rxjs-interop`, Angular 22 signal-first).
 *
 * Pourquoi un config séparé de `tools/vitest-lib.config.ts` :
 * `rxResource` construit un `effect()` interne qui `inject()` un
 * `ChangeDetectionScheduler` — absent d'un simple `createEnvironmentInjector`
 * ou `runInInjectionContext` isolé (`NG0201`). Le seul provider réel de ce
 * token est `ChangeDetectionSchedulerImpl`, qui dépend transitivement d'un
 * `ApplicationRef` — donc d'un environnement de test Angular complet.
 *
 * Solution retenue (validée empiriquement 2026-08-13, aucun autre chemin
 * public de l'API `rxResource` ne l'expose sans ceci) :
 * `TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting())`
 * — nécessite un DOM (`environment: 'jsdom'`), mais **pas** `zone.js` : ce
 * dépôt est zoneless (`provideZonelessChangeDetection` côté app réelle),
 * `TestBed` fonctionne nativement sans zone en Angular 22.
 *
 * Coût : démarrage jsdom (~2-3s) contre quasi instantané en `environment:
 * 'node'` — d'où l'isolement dans un projet Vitest séparé, pour ne pas
 * pénaliser les ~150 autres fichiers de specs des libs `type:application`/
 * `type:data`/`type:domain` qui n'en ont pas besoin.
 *
 * Convention de nommage : un fichier qui teste du code utilisant
 * `rxResource` (directement ou via une classe de base qui l'utilise) doit
 * s'appeler `*.rxresource.spec.ts`, jamais `*.spec.ts` — sinon il est
 * silencieusement exclu par `tools/vitest-lib.config.ts` ET absent d'ici
 * (double filtre par nom, pas par contenu).
 */
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '..');

export function defineLibRxResourceTestConfig(libRoot: string) {
    return defineConfig({
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: [
                resolve(workspaceRoot, 'tools/vitest-setup-rxresource.ts'),
            ],
            passWithNoTests: true,
            include: [resolve(libRoot, 'src/**/*.rxresource.spec.ts')],
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

/** Mêmes alias `@cmz/*` que `tools/vitest-lib.config.ts` (SSoT partielle). */
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
    };
}

/** Config Vitest — exige `CMZ_VITEST_LIB_ROOT` quand lancé par Vitest/Nx. */
export default () => {
    const libRootEnv = process.env.CMZ_VITEST_LIB_ROOT;
    if (!libRootEnv) {
        const underVitest =
            process.env.VITEST === 'true' ||
            process.argv.some((a) => /(^|[\\/])vitest(\.m?js)?$/.test(a));
        if (underVitest) {
            throw new Error(
                'CMZ_VITEST_LIB_ROOT manquant — définir le chemin de la lib ' +
                    '(ex. libs/shared/application) via project.json options.env.'
            );
        }
        return defineConfig({ test: { include: [] } });
    }
    return defineLibRxResourceTestConfig(resolve(workspaceRoot, libRootEnv));
};
