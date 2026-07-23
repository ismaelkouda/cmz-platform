import {
    EnvironmentProviders,
    inject,
    provideAppInitializer,
} from '@angular/core';
import { I18nextTranslationService } from '@cmz/shared-ui';
import { FR } from './fr.translation';

/**
 * Initialise i18next au bootstrap via l'adaptateur (l'app ne dépend pas
 * d'i18next). Bundle FR minimal (dev) ; à remplacer par un chargement
 * asynchrone (backend/JSON) en production.
 */
export function provideI18n(): EnvironmentProviders {
    return provideAppInitializer(() =>
        inject(I18nextTranslationService).init({
            fr: { translation: FR },
        })
    );
}
