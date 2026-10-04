import { Service, inject } from '@angular/core';
import {
    LOCALIZED_MESSAGE_CATALOG,
    LocalizedMessageCatalog,
} from './localized-message-catalog.token';

export type TranslationParams = Readonly<Record<string, unknown>>;

/**
 * Pont borné entre les identifiants dynamiques historiques et `$localize`.
 *
 * Les messages eux-mêmes sont des tagged templates `$localize` statiques dans
 * le catalogue fourni par l'application : Angular peut donc les extraire et
 * les remplacer à la compilation. Ce service ne charge aucun dictionnaire au
 * runtime et ne masque aucune bibliothèque i18n tierce.
 */
@Service()
export class LocalizeTranslationService {
    private readonly catalog = inject(LOCALIZED_MESSAGE_CATALOG);

    translate(key: string, params?: TranslationParams): string {
        return interpolate(this.catalog[key] ?? key, params);
    }
}

export function interpolate(
    message: string,
    params: TranslationParams = {}
): string {
    return message.replace(
        /{{\s*([^{}\s]+)\s*}}/g,
        (placeholder, name: string) =>
            Object.hasOwn(params, name) ? String(params[name]) : placeholder
    );
}

export function hasLocalizedMessage(
    catalog: LocalizedMessageCatalog,
    key: string
): boolean {
    return Object.hasOwn(catalog, key);
}
