import { Injector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { LoggerPort } from '@cmz/shared-domain';
import { LOGGER_PORT } from './logger-port.token';
import { GlobalErrorHandler } from './global-error-handler';

/**
 * Audit P-2 (`audit-workspace-2026-08-02-revue-finale.md`) — verrouille le
 * seul contrat de ce handler : toute erreur qui lui arrive est transmise à
 * `LoggerPort.error()`, jamais absorbée silencieusement (ce que faisait
 * implicitement l'absence de tout `ErrorHandler` custom avant ce correctif).
 */
describe('GlobalErrorHandler', () => {
    function makeHandler(): {
        handler: GlobalErrorHandler;
        logger: LoggerPort;
    } {
        const logger: LoggerPort = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };
        const injector = Injector.create({
            providers: [
                { provide: LOGGER_PORT, useValue: logger },
                GlobalErrorHandler,
            ],
        });
        return { handler: injector.get(GlobalErrorHandler), logger };
    }

    it('transmet une exception à LoggerPort.error() sans la relancer', () => {
        const { handler, logger } = makeHandler();
        const cause = new Error('template binding failed');

        expect(() => handler.handleError(cause)).not.toThrow();

        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
            'Erreur non capturée',
            cause,
            { source: 'GlobalErrorHandler' }
        );
    });

    it('transmet une valeur rejetée non-Error (ex. rejet de promesse avec une chaîne)', () => {
        const { handler, logger } = makeHandler();

        handler.handleError('rejected without an Error object');

        expect(logger.error).toHaveBeenCalledWith(
            'Erreur non capturée',
            'rejected without an Error object',
            { source: 'GlobalErrorHandler' }
        );
    });
});
