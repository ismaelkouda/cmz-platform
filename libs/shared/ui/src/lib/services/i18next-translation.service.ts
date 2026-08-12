import { Service } from '@angular/core';
import i18next, { type Resource } from 'i18next';
import { TranslationPort } from '@cmz/shared-application';

/**
 * Adaptateur Angular de `TranslationPort` sur **i18next** (moteur agnostique).
 * L'app initialise le moteur au bootstrap via `init(...)` (app-initializer) —
 * sans dépendre elle-même d'i18next. Cf. ADR-0012.
 */
@Service()
export class I18nextTranslationService implements TranslationPort {
    /** Initialise i18next avec les ressources fournies (bootstrap). */
    init(resources: Resource, lng = 'fr'): Promise<unknown> {
        return i18next.init({
            lng,
            fallbackLng: lng,
            resources,
            interpolation: { escapeValue: false },
        });
    }

    translate(key: string, params?: Record<string, unknown>): string {
        return i18next.t(key, params ?? {}) as string;
    }

    async setLanguage(lang: string): Promise<void> {
        await i18next.changeLanguage(lang);
    }

    get currentLanguage(): string {
        return i18next.language;
    }
}
