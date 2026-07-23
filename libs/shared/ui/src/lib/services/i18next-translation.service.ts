import { Service } from '@angular/core';
import i18next from 'i18next';
import { TranslationPort } from '@cmz/shared-application';

/**
 * Adaptateur Angular de `TranslationPort` sur **i18next** (moteur agnostique).
 * L'app doit initialiser i18next au bootstrap (`i18next.init({...})`).
 * Cf. ADR-0012.
 */
@Service()
export class I18nextTranslationService extends TranslationPort {
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
