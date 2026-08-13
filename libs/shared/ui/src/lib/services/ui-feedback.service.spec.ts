import { createEnvironmentInjector } from '@angular/core';
import {
    DomainError,
    UnauthorizedError,
    ValidationError,
} from '@cmz/shared-domain';
import { ErrorHandlerRegistry, SessionService } from '@cmz/shared-application';
import { describe, expect, it, vi } from 'vitest';
import { CmzNotificationService } from './cmz-notification.service';
import { I18nextTranslationService } from './i18next-translation.service';
import { UiFeedbackService } from './ui-feedback.service';

/**
 * T12-3 (P1, 2026-08-13) — jamais testé. Point de convergence unique du
 * feedback d'erreur applicatif : enregistre 3 handlers dans
 * `ErrorHandlerRegistry` à la construction (`registerDefault` + 2
 * `register` typés). Doublures pour `CmzNotificationService`/
 * `I18nextTranslationService`/`SessionService` : ce test vérifie le
 * branchement (quel handler fait quoi), pas l'implémentation de ces
 * dépendances déjà couvertes ailleurs (ou hors périmètre — `i18next`
 * global n'est pas isolable proprement en test unitaire).
 */
class FakeError extends DomainError {
    readonly code = 'FAKE_ERROR';
    readonly messageKey = 'ERRORS.FAKE';
    readonly statusCode = 400;
}

function setup() {
    const notification = {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
        notify: vi.fn(),
    };
    const translation = {
        translate: vi.fn((key: string) => `translated:${key}`),
        setLanguage: vi.fn(),
        get currentLanguage() {
            return 'fr';
        },
    };
    const session = { clear: vi.fn() };

    const injector = createEnvironmentInjector(
        [
            ErrorHandlerRegistry,
            { provide: CmzNotificationService, useValue: notification },
            { provide: I18nextTranslationService, useValue: translation },
            { provide: SessionService, useValue: session },
            UiFeedbackService,
        ],
        null as never
    );
    const service = injector.get(UiFeedbackService);
    const registry = injector.get(ErrorHandlerRegistry);
    return { service, registry, notification, translation, session };
}

describe('UiFeedbackService', () => {
    it('registre par défaut : notifie une erreur traduite (severity error) pour tout DomainError sans handler propre', () => {
        const { registry, notification, translation } = setup();
        const error = new FakeError('boom');

        registry.handle(error);

        expect(translation.translate).toHaveBeenCalledWith(
            'ERRORS.FAKE',
            undefined
        );
        expect(notification.error).toHaveBeenCalledWith(
            'translated:ERRORS.FAKE'
        );
    });

    it('UnauthorizedError : notifie en warning (pas error) ET efface la session', () => {
        const { registry, notification, session } = setup();
        const error = new UnauthorizedError();

        registry.handle(error);

        expect(notification.warning).toHaveBeenCalledWith(
            'translated:COMMON.ERROR.UNAUTHORIZED'
        );
        expect(notification.error).not.toHaveBeenCalled();
        expect(session.clear).toHaveBeenCalledOnce();
    });

    it('ValidationError : notifie le message brut de l’erreur, PAS une clé traduite (contrairement au handler par défaut)', () => {
        const { registry, notification, translation } = setup();
        const error = new ValidationError('Le champ X est requis');

        registry.handle(error);

        expect(notification.error).toHaveBeenCalledWith(
            'Le champ X est requis'
        );
        // Le handler ValidationError ne passe jamais par translate() —
        // contrairement au handler par défaut et à UnauthorizedError.
        expect(translation.translate).not.toHaveBeenCalled();
    });

    it('notifyError() délègue à registry.handle() (pas de logique dupliquée)', () => {
        const { service, notification } = setup();
        const error = new FakeError('via notifyError');

        service.notifyError(error);

        expect(notification.error).toHaveBeenCalledWith(
            'translated:ERRORS.FAKE'
        );
    });

    it('success() traduit la clé et notifie en succès', () => {
        const { service, notification, translation } = setup();

        service.success('ACTIONS.SAVED');

        expect(translation.translate).toHaveBeenCalledWith('ACTIONS.SAVED');
        expect(notification.success).toHaveBeenCalledWith(
            'translated:ACTIONS.SAVED'
        );
    });

    it('error() traduit la clé et notifie en erreur', () => {
        const { service, notification, translation } = setup();

        service.error('ACTIONS.FAILED');

        expect(translation.translate).toHaveBeenCalledWith('ACTIONS.FAILED');
        expect(notification.error).toHaveBeenCalledWith(
            'translated:ACTIONS.FAILED'
        );
    });
});
