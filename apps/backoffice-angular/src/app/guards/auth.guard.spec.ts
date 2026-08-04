import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';
import { SessionService } from '@cmz/shared-application';
import { authGuard } from './auth.guard';

/**
 * `SessionService` réel a un constructeur qui injecte `StoragePort`/
 * `NavigationPort` (Web Crypto asynchrone) — hors périmètre de ce test, qui
 * porte uniquement sur la décision du guard en fonction de `session.token()`.
 * Double minimal exposant la même surface consommée, comme
 * `auth.interceptor.spec.ts`.
 */
function configure(token: { expiresAt: string } | null): void {
    TestBed.configureTestingModule({
        providers: [
            provideRouter([]),
            { provide: SessionService, useValue: { token: () => token } },
        ],
    });
}

describe('authGuard', () => {
    it('autorise le passage quand un jeton valide (non expiré) est présent', () => {
        configure({ expiresAt: new Date(Date.now() + 60_000).toISOString() });

        const result = TestBed.runInInjectionContext(() =>
            authGuard(
                {} as never,
                { url: '/administrative-boundary' } as never
            )
        );

        expect(result).toBe(true);
    });

    it('redirige vers /auth/login quand il n\'y a pas de jeton (session absente ou pas encore déchiffrée)', () => {
        configure(null);

        const result = TestBed.runInInjectionContext(() =>
            authGuard(
                {} as never,
                { url: '/administrative-boundary' } as never
            )
        ) as UrlTree;

        expect(result).toBeInstanceOf(UrlTree);
        expect(result.toString()).toBe('/auth/login');
    });

    it('redirige vers /auth/login quand le jeton est expiré — refuse par sécurité, pas par défaut permissif', () => {
        configure({ expiresAt: new Date(Date.now() - 1000).toISOString() });

        const result = TestBed.runInInjectionContext(() =>
            authGuard(
                {} as never,
                { url: '/administrative-boundary' } as never
            )
        ) as UrlTree;

        expect(result).toBeInstanceOf(UrlTree);
        expect(result.toString()).toBe('/auth/login');
    });
});
