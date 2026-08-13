import { describe, expect, it, vi } from 'vitest';
import { DomainError } from '@cmz/shared-domain';
import { ErrorHandlerRegistry } from './error-handler-registry.service';

/**
 * T12-3 (P1/P2, 2026-08-13) — jamais testé en isolation (seulement via
 * `UiFeedbackService`, qui n'exerce que le chemin d'enregistrement par
 * type de classe — jamais le fallback par `code` string). Verrouille la
 * priorité de résolution exacte : type de classe d'abord, `code` ensuite,
 * handler par défaut en dernier recours.
 */
class FakeErrorA extends DomainError {
    readonly code = 'FAKE_A';
    readonly messageKey = 'ERRORS.FAKE_A';
    readonly statusCode = 400;
}

class FakeErrorB extends DomainError {
    readonly code = 'FAKE_B';
    readonly messageKey = 'ERRORS.FAKE_B';
    readonly statusCode = 400;
}

describe('ErrorHandlerRegistry', () => {
    it('handle() n’appelle rien si aucun handler (ni type, ni code, ni défaut) n’est enregistré', () => {
        const registry = new ErrorHandlerRegistry();
        expect(() => registry.handle(new FakeErrorA('x'))).not.toThrow();
    });

    it('handle() route vers le handler par défaut si aucun handler spécifique n’est enregistré', () => {
        const registry = new ErrorHandlerRegistry();
        const defaultHandler = vi.fn();
        registry.registerDefault(defaultHandler);

        const error = new FakeErrorA('x');
        registry.handle(error);

        expect(defaultHandler).toHaveBeenCalledWith(error);
    });

    it('handle() priorise le handler enregistré par type de classe sur le handler par défaut', () => {
        const registry = new ErrorHandlerRegistry();
        const defaultHandler = vi.fn();
        const typeHandler = vi.fn();
        registry.registerDefault(defaultHandler);
        registry.register(FakeErrorA, typeHandler);

        const error = new FakeErrorA('x');
        registry.handle(error);

        expect(typeHandler).toHaveBeenCalledWith(error);
        expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('handle() route vers le handler enregistré par code si aucun handler par type n’existe', () => {
        const registry = new ErrorHandlerRegistry();
        const codeHandler = vi.fn();
        registry.register('FAKE_A', codeHandler);

        const error = new FakeErrorA('x');
        registry.handle(error);

        expect(codeHandler).toHaveBeenCalledWith(error);
    });

    it('handle() priorise le handler par type de classe sur le handler par code (les deux enregistrés)', () => {
        const registry = new ErrorHandlerRegistry();
        const typeHandler = vi.fn();
        const codeHandler = vi.fn();
        registry.register(FakeErrorA, typeHandler);
        registry.register('FAKE_A', codeHandler);

        registry.handle(new FakeErrorA('x'));

        expect(typeHandler).toHaveBeenCalledOnce();
        expect(codeHandler).not.toHaveBeenCalled();
    });

    it('un handler enregistré pour FakeErrorA n’est jamais appelé pour FakeErrorB (isolation par type)', () => {
        const registry = new ErrorHandlerRegistry();
        const handlerA = vi.fn();
        const defaultHandler = vi.fn();
        registry.register(FakeErrorA, handlerA);
        registry.registerDefault(defaultHandler);

        const errorB = new FakeErrorB('y');
        registry.handle(errorB);

        expect(handlerA).not.toHaveBeenCalled();
        expect(defaultHandler).toHaveBeenCalledWith(errorB);
    });

    it('register() appelé deux fois pour le même type remplace le handler précédent (Map.set, pas d’accumulation)', () => {
        const registry = new ErrorHandlerRegistry();
        const firstHandler = vi.fn();
        const secondHandler = vi.fn();
        registry.register(FakeErrorA, firstHandler);
        registry.register(FakeErrorA, secondHandler);

        registry.handle(new FakeErrorA('x'));

        expect(firstHandler).not.toHaveBeenCalled();
        expect(secondHandler).toHaveBeenCalledOnce();
    });
});
