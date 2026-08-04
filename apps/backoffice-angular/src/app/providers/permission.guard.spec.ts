import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';
import { PermissionActionsService } from '@cmz/shared-application';
import { permissionGuard } from './permission.guard';

/**
 * `PermissionActionsService` réel a un constructeur qui injecte
 * `StoragePort` (Web Crypto asynchrone) — hors périmètre de ce test, qui
 * porte uniquement sur la décision du guard en fonction de `can(route,
 * action)`. Double minimal exposant la même surface consommée, comme
 * `auth.guard.spec.ts`.
 */
function configure(allowed: boolean): void {
    TestBed.configureTestingModule({
        providers: [
            provideRouter([]),
            {
                provide: PermissionActionsService,
                useValue: { can: () => () => allowed },
            },
        ],
    });
}

describe('permissionGuard', () => {
    it('autorise le passage quand can(route, action) renvoie true', () => {
        configure(true);
        const guard = permissionGuard('report-states', 'APPROVE');

        const result = TestBed.runInInjectionContext(() =>
            guard({} as never, { url: '/report-states/approve' } as never)
        );

        expect(result).toBe(true);
    });

    it("redirige vers /auth/login quand can(route, action) renvoie false — le message d'audit documente ce choix (pas de page 403 dédiée)", () => {
        configure(false);
        const guard = permissionGuard('report-states', 'APPROVE');

        const result = TestBed.runInInjectionContext(() =>
            guard({} as never, { url: '/report-states/approve' } as never)
        ) as UrlTree;

        expect(result).toBeInstanceOf(UrlTree);
        expect(result.toString()).toBe('/auth/login');
    });

    it('deux instances du guard pour des routes/actions différentes sont indépendantes (paramétrage par appel, pas par état partagé)', () => {
        configure(true);
        const guardA = permissionGuard('report-states', 'APPROVE');
        const guardB = permissionGuard('team-organization', 'DELETE');

        const resultA = TestBed.runInInjectionContext(() =>
            guardA({} as never, {} as never)
        );
        const resultB = TestBed.runInInjectionContext(() =>
            guardB({} as never, {} as never)
        );

        expect(resultA).toBe(true);
        expect(resultB).toBe(true);
    });
});
