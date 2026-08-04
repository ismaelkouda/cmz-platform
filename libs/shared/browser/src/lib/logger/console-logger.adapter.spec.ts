import '@angular/compiler';
import { createEnvironmentInjector } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsoleLoggerAdapter } from './console-logger.adapter';

/**
 * Audit P-1 (`audit-workspace-2026-08-02-revue-finale.md`) — verrouille le
 * seul comportement que `LoggerPort` promet : chaque niveau écrit sur la
 * méthode `console.*` correspondante, avec le message et le contexte
 * transmis (pas absorbés silencieusement). N'affirme rien sur le format
 * exact du préfixe (horodatage) — pas le contrat, seulement un confort de
 * lecture.
 */
describe('ConsoleLoggerAdapter', () => {
    let logger: ConsoleLoggerAdapter;
    let spies: Record<'debug' | 'info' | 'warn' | 'error', ReturnType<typeof vi.spyOn>>;

    beforeEach(() => {
        const injector = createEnvironmentInjector(
            [ConsoleLoggerAdapter],
            null as never
        );
        logger = injector.get(ConsoleLoggerAdapter);
        spies = {
            debug: vi.spyOn(console, 'debug').mockImplementation(() => undefined),
            info: vi.spyOn(console, 'info').mockImplementation(() => undefined),
            warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
            error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('debug() écrit sur console.debug avec le message', () => {
        logger.debug('chargement du cache');
        expect(spies.debug).toHaveBeenCalledTimes(1);
        expect(spies.debug.mock.calls[0][0]).toContain('chargement du cache');
    });

    it('info() écrit sur console.info avec le contexte transmis', () => {
        logger.info('session restaurée', { userId: 42 });
        expect(spies.info).toHaveBeenCalledTimes(1);
        expect(spies.info.mock.calls[0][1]).toEqual({ userId: 42 });
    });

    it('warn() écrit sur console.warn', () => {
        logger.warn('quota proche de la limite');
        expect(spies.warn).toHaveBeenCalledTimes(1);
    });

    it("error() écrit sur console.error avec l'erreur et le contexte, sans la convertir en chaîne", () => {
        const cause = new Error('boom');
        logger.error('échec use-case', cause, { route: 'processing' });
        expect(spies.error).toHaveBeenCalledTimes(1);
        expect(spies.error.mock.calls[0][1]).toBe(cause);
        expect(spies.error.mock.calls[0][2]).toEqual({ route: 'processing' });
    });

    it('accepte error() sans erreur ni contexte fournis (les deux optionnels)', () => {
        expect(() => logger.error('échec sans détail')).not.toThrow();
        expect(spies.error).toHaveBeenCalledTimes(1);
    });
});
