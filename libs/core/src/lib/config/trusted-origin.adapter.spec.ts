import { createEnvironmentInjector } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppConfig } from './config.type';
import { APP_CONFIG } from './config.token';
import { TrustedOriginAdapter } from './trusted-origin.adapter';

/**
 * T12-3 (P1, 2026-08-13) — jamais testé, ~4 appelants mais sécurité réelle
 * (I-14/I-15, `SafeUrlPipe`) : une régression ici est une faille (iframe non
 * fiable acceptée), pas juste un bug fonctionnel. Verrouille explicitement
 * le fail-closed sur les 3 chemins d'échec (allowlist vide, origine hors
 * liste, URL malformée) — aucun ne doit jamais retomber sur `true` par
 * accident.
 *
 * Environnement `node` (pas jsdom) : le code utilise `window.location.origin`
 * comme base pour résoudre une URL relative — stub minimal de `window`
 * (juste `location.origin`), pas besoin du coût jsdom pour cette classe.
 */
function makeConfig(trustedFrameOrigins?: string[]): AppConfig {
    return {
        authenticationUrl: 'https://auth.example',
        reportUrl: 'https://api.example',
        settingUrl: 'https://settings.example',
        fileUrl: 'https://files.example',
        environmentDeployment: 'PROD',
        enableDebug: false,
        trustedFrameOrigins,
    };
}

function createAdapter(config: AppConfig): TrustedOriginAdapter {
    const injector = createEnvironmentInjector(
        [{ provide: APP_CONFIG, useValue: config }, TrustedOriginAdapter],
        null as never
    );
    return injector.get(TrustedOriginAdapter);
}

describe('TrustedOriginAdapter', () => {
    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).window = {
            location: { origin: 'https://backoffice.example' },
        };
    });

    afterEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (globalThis as any).window;
    });

    it('rejette toute origine si trustedFrameOrigins est absent (fail-closed par défaut)', () => {
        const adapter = createAdapter(makeConfig(undefined));
        expect(
            adapter.isTrustedFrameOrigin('https://grafana.example.org/d/xyz')
        ).toBe(false);
    });

    it('rejette toute origine si trustedFrameOrigins est un tableau vide', () => {
        const adapter = createAdapter(makeConfig([]));
        expect(
            adapter.isTrustedFrameOrigin('https://grafana.example.org')
        ).toBe(false);
    });

    it('accepte une URL dont l’origine (schéma+hôte+port) est dans l’allowlist exacte', () => {
        const adapter = createAdapter(
            makeConfig(['https://grafana.example.org'])
        );
        expect(
            adapter.isTrustedFrameOrigin(
                'https://grafana.example.org/d/xyz?var=1'
            )
        ).toBe(true);
    });

    it('rejette une origine qui ne correspond pas exactement (sous-domaine, port ou schéma différent)', () => {
        const adapter = createAdapter(
            makeConfig(['https://grafana.example.org'])
        );
        expect(
            adapter.isTrustedFrameOrigin('https://evil.grafana.example.org')
        ).toBe(false);
        expect(
            adapter.isTrustedFrameOrigin('https://grafana.example.org:8443')
        ).toBe(false);
        expect(adapter.isTrustedFrameOrigin('http://grafana.example.org')).toBe(
            false
        );
    });

    it('résout une URL relative contre window.location.origin avant de comparer', () => {
        const adapter = createAdapter(
            makeConfig(['https://backoffice.example'])
        );
        expect(adapter.isTrustedFrameOrigin('/dashboard/embed')).toBe(true);
    });

    it('rejette une URL malformée sans lever (échec fermé, jamais de bénéfice du doute)', () => {
        const adapter = createAdapter(
            makeConfig(['https://grafana.example.org'])
        );
        expect(() =>
            adapter.isTrustedFrameOrigin('not a url at all://???')
        ).not.toThrow();
        expect(adapter.isTrustedFrameOrigin('not a url at all://???')).toBe(
            false
        );
    });

    it('n’accepte jamais de wildcard — une allowlist contenant "*" ne matche aucune URL réelle', () => {
        const adapter = createAdapter(makeConfig(['*']));
        expect(
            adapter.isTrustedFrameOrigin('https://n-importe-quoi.example')
        ).toBe(false);
    });
});
