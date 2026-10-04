import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it } from 'vitest';
import {
    LOCALIZED_MESSAGE_CATALOG,
    LocalizedMessageCatalog,
} from './localized-message-catalog.token';
import {
    LocalizeTranslationService,
    hasLocalizedMessage,
    interpolate,
} from './localize-translation.service';

const catalog: LocalizedMessageCatalog = Object.freeze({
    'COMMON.CREATE': 'Créer',
    'COMMON.PAGINATION.RANGE': 'Affichage {{from}}–{{to}} sur {{total}}',
});

describe('LocalizeTranslationService', () => {
    it('résout une clé depuis le catalogue compilé', () => {
        const injector = Injector.create({
            providers: [
                { provide: LOCALIZED_MESSAGE_CATALOG, useValue: catalog },
            ],
        });
        const service = runInInjectionContext(
            injector,
            () => new LocalizeTranslationService()
        );

        expect(service.translate('COMMON.CREATE')).toBe('Créer');
    });

    it('interpole les paramètres sans effacer un placeholder absent', () => {
        expect(
            interpolate(catalog['COMMON.PAGINATION.RANGE'], {
                from: 1,
                to: 20,
            })
        ).toBe('Affichage 1–20 sur {{total}}');
    });

    it('rend la clé inconnue observable au lieu de la masquer', () => {
        const injector = Injector.create({
            providers: [
                {
                    provide: LOCALIZED_MESSAGE_CATALOG,
                    useValue: Object.freeze({}),
                },
            ],
        });
        const service = runInInjectionContext(
            injector,
            () => new LocalizeTranslationService()
        );

        expect(service.translate('UNKNOWN.KEY')).toBe('UNKNOWN.KEY');
        expect(hasLocalizedMessage(catalog, 'UNKNOWN.KEY')).toBe(false);
    });
});
