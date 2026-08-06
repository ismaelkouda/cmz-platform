import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';
import { StorePathsService } from '@cmz/shared-application';
import { pathsGuard } from './paths.guard';

/**
 * `StorePathsService` réel dépend de `StoragePort` (Web Crypto asynchrone) —
 * hors périmètre de ce test, qui porte uniquement sur la décision du guard en
 * fonction de `storePaths.paths()`. Double minimal, même pattern que
 * `auth.guard.spec.ts`.
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
            { provide: StorePathsService, useValue: { paths: () => paths } },
        ],
    });
}

describe('pathsGuard', () => {
    it('autorise le passage quand le segment de route est présent dans les pages autorisées', () => {
        configure(['report-states', 'processing']);

        const result = TestBed.runInInjectionContext(() =>
            pathsGuard(
                { routeConfig: { path: 'report-states' } } as never,
                {} as never
            )
        );

        expect(result).toBe(true);
    });

    it("redirige vers /auth/login quand le segment n'est pas dans les pages autorisées", () => {
        configure(['processing']);

        const result = TestBed.runInInjectionContext(() =>
            pathsGuard(
                { routeConfig: { path: 'report-states' } } as never,
                {} as never
            )
        ) as UrlTree;

        expect(result).toBeInstanceOf(UrlTree);
        expect(result.toString()).toBe('/auth/login');
    });

    it('redirige vers /auth/login quand les pages ne sont pas encore chargées (null) — refuse par sécurité', () => {
        configure(null);

        const result = TestBed.runInInjectionContext(() =>
            pathsGuard(
                { routeConfig: { path: 'report-states' } } as never,
                {} as never
            )
        ) as UrlTree;

        expect(result).toBeInstanceOf(UrlTree);
        expect(result.toString()).toBe('/auth/login');
    });

    it("redirige vers /auth/login quand la route n'a pas de segment configuré (défense en profondeur)", () => {
        configure(['report-states']);

        const result = TestBed.runInInjectionContext(() =>
            pathsGuard({ routeConfig: null } as never, {} as never)
        ) as UrlTree;

        expect(result).toBeInstanceOf(UrlTree);
        expect(result.toString()).toBe('/auth/login');
    });
});
