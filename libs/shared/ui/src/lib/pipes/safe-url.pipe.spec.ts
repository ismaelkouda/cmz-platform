import { describe, expect, it, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TRUSTED_ORIGIN_PORT } from '../tokens/trusted-origin-port.token';
import { SafeUrlPipe } from './safe-url.pipe';

/**
 * `Injector.create` + `runInInjectionContext` plutôt que `TestBed` : ce pipe
 * n'est pas un composant, et `TestBed` exige `initTestEnvironment()`
 * (compilateur JIT de modules, `@angular/platform-browser-dynamic/testing`)
 * pour un bénéfice nul ici — on veut juste satisfaire les deux `inject()`
 * du pipe avec des doublures de test, pas monter un module Angular complet.
 * Même esprit que `http-cache.store.spec.ts`/`error.interceptor.spec.ts`
 * (audit-workspace-2026-08-03.md, chantier I) : le test le plus simple qui
 * exerce réellement le code, pas le plus « conforme » en apparence.
 */
function createPipe(
    bypassSecurityTrustResourceUrl: (url: string) => unknown,
    isTrustedFrameOrigin: (url: string) => boolean
): SafeUrlPipe {
    const injector = Injector.create({
        providers: [
            {
                provide: DomSanitizer,
                useValue: { bypassSecurityTrustResourceUrl },
            },
            {
                provide: TRUSTED_ORIGIN_PORT,
                useValue: { isTrustedFrameOrigin },
            },
        ],
    });
    return runInInjectionContext(injector, () => new SafeUrlPipe());
}

describe('SafeUrlPipe', () => {
    it('bypasse le sanitizer quand l’origine est explicitement fiable', () => {
        const bypass = vi.fn((url: string) => `trusted:${url}`);
        const pipe = createPipe(bypass, () => true);

        const result = pipe.transform('https://grafana.example.org/d/xyz');

        expect(bypass).toHaveBeenCalledWith(
            'https://grafana.example.org/d/xyz'
        );
        expect(result).toBe('trusted:https://grafana.example.org/d/xyz');
    });

    it(
        'régression P0-7/I-14-I-15 verrouillée : ne bypasse JAMAIS le ' +
            'sanitizer quand l’origine n’est pas explicitement fiable — avant ' +
            'ce correctif, une URL backend arbitraire (grafanaLink) était ' +
            'bypassée sans aucune vérification',
        () => {
            const bypass = vi.fn();
            const warnSpy = vi
                .spyOn(console, 'warn')
                .mockImplementation(() => undefined);
            const pipe = createPipe(bypass, () => false);

            const result = pipe.transform('https://attacker.example/phish');

            expect(bypass).not.toHaveBeenCalled();
            expect(result).toBeNull();
            expect(warnSpy).toHaveBeenCalledOnce();
            warnSpy.mockRestore();
        }
    );
});
