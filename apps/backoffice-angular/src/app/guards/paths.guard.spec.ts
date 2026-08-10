import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';
import { StorePathsService } from '@cmz/shared-application';
import { pathsGuard } from './paths.guard';

/**
 * `StorePathsService` réel dépend de `StoragePort` (Web Crypto asynchrone) —
 * hors périmètre de ce test, qui porte uniquement sur la décision du guard en
 * fonction de `storePaths.paths()`. Double minimal, même pattern que
 * `auth.guard.spec.ts` — `whenReady` déjà résolu.
 *
 * Ces tests verrouillent le comportement du remplacement de
 * `permissionGuard(module, 'VIEW')` documenté dans `paths.guard.ts` (I-7,
 * `audit-workspace-2026-08-02-revue-finale.md`, débloqué 2026-08-03) :
 * la décision se prend sur le **segment de route configuré**
 * (`route.routeConfig?.path`), pas sur `state.url` complet.
 */
function configure(paths: string[] | null): void {
    TestBed.configureTestingModule({
        providers: [
            provideRouter([]),
            {
                provide: StorePathsService,
                useValue: {
                    paths: () => paths,
                    whenReady: () => Promise.resolve(),
                },
            },
        ],
    });
}

/** Segments `app.routes.ts` sur lesquels `pathsGuard` est branché (WA). */
const WA_SEGMENTS = [
    'report-states',
    'processing',
    'requests',
    'finalization',
] as const;

describe('pathsGuard', () => {
    it('autorise le passage quand le segment de route est présent dans les pages autorisées', async () => {
        configure(['report-states', 'processing']);

        const result = await TestBed.runInInjectionContext(() =>
            pathsGuard(
                { routeConfig: { path: 'report-states' } } as never,
                {} as never
            )
        );

        expect(result).toBe(true);
    });

    it.each([...WA_SEGMENTS])(
        'autorise le segment WA « %s » quand listé dans paths',
        async (segment) => {
            configure([...WA_SEGMENTS]);

            const result = await TestBed.runInInjectionContext(() =>
                pathsGuard(
                    { routeConfig: { path: segment } } as never,
                    {} as never
                )
            );

            expect(result).toBe(true);
        }
    );

    it.each([...WA_SEGMENTS])(
        "refuse le segment WA « %s » hors paths → UrlTree /auth/login",
        async (segment) => {
            const alone = WA_SEGMENTS.find((s) => s !== segment);
            if (!alone) {
                throw new Error(
                    'WA_SEGMENTS doit contenir au moins 2 segments distincts pour ce test'
                );
            }
            configure([alone]);

            const result = (await TestBed.runInInjectionContext(() =>
                pathsGuard(
                    { routeConfig: { path: segment } } as never,
                    {} as never
                )
            )) as UrlTree;

            expect(result).toBeInstanceOf(UrlTree);
            expect(result.toString()).toBe('/auth/login');
        }
    );

    it("redirige vers /auth/login quand le segment n'est pas dans les pages autorisées", async () => {
        configure(['processing']);

        const result = (await TestBed.runInInjectionContext(() =>
            pathsGuard(
                { routeConfig: { path: 'report-states' } } as never,
                {} as never
            )
        )) as UrlTree;

        expect(result).toBeInstanceOf(UrlTree);
        expect(result.toString()).toBe('/auth/login');
    });

    it('redirige vers /auth/login quand les pages ne sont pas encore chargées (null) — refuse par sécurité', async () => {
        configure(null);

        const result = (await TestBed.runInInjectionContext(() =>
            pathsGuard(
                { routeConfig: { path: 'report-states' } } as never,
                {} as never
            )
        )) as UrlTree;

        expect(result).toBeInstanceOf(UrlTree);
        expect(result.toString()).toBe('/auth/login');
    });

    it("redirige vers /auth/login quand la route n'a pas de segment configuré (défense en profondeur)", async () => {
        configure(['report-states']);

        const result = (await TestBed.runInInjectionContext(() =>
            pathsGuard({ routeConfig: null } as never, {} as never)
        )) as UrlTree;

        expect(result).toBeInstanceOf(UrlTree);
        expect(result.toString()).toBe('/auth/login');
    });

    it('refuse un path semblable mais non exact (pas de préfixe)', async () => {
        configure(['report']);

        const result = (await TestBed.runInInjectionContext(() =>
            pathsGuard(
                { routeConfig: { path: 'report-states' } } as never,
                {} as never
            )
        )) as UrlTree;

        expect(result).toBeInstanceOf(UrlTree);
        expect(result.toString()).toBe('/auth/login');
    });
});
