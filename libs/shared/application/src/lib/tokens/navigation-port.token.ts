import { InjectionToken } from '@angular/core';
import { NavigationPort } from '@cmz/shared-domain';

/**
 * Jeton d'injection Angular pour `NavigationPort` (ADR-0024).
 *
 * Vit dans `@cmz/shared-application` (pas `@cmz/core`) : ce port est
 * consommé par `SessionService`, lui-même dans `shared-application`, et
 * `type:application` n'a pas le droit de dépendre de `type:core`
 * (`eslint.config.mjs`, contrainte déjà en place — pas assouplie pour ce
 * refactor). Le jeton est colocalisé avec sa première lib consommatrice,
 * plutôt que centralisé dans une lib `tokens` partagée qui répéterait la
 * tentation « couche DI universelle » déjà écartée
 * (`strategie-cross-stack-revue.md` §4).
 */
export const NAVIGATION_PORT = new InjectionToken<NavigationPort>(
    'NavigationPort'
);
