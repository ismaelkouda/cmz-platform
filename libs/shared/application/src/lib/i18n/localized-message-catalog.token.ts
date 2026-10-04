import { InjectionToken } from '@angular/core';

export type LocalizedMessageCatalog = Readonly<Record<string, string>>;

/**
 * Catalogue compilé de l'application hôte.
 *
 * Le défaut vide rend les bibliothèques testables isolément ; une application
 * réelle DOIT le remplacer par son catalogue `$localize` généré.
 */
export const LOCALIZED_MESSAGE_CATALOG =
    new InjectionToken<LocalizedMessageCatalog>('LocalizedMessageCatalog', {
        factory: () => Object.freeze({}),
    });
