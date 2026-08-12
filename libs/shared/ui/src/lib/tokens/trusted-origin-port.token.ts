import { InjectionToken } from '@angular/core';
import { TrustedOriginPort } from '@cmz/shared-domain';

/**
 * Jeton d'injection Angular pour `TrustedOriginPort` (ADR-0024).
 *
 * Colocalisé dans `@cmz/shared-ui` : son seul consommateur `inject()`
 * (`SafeUrlPipe`) vit ici, et `type:ui` n'a pas le droit de dépendre de
 * `type:core` (où vit l'adaptateur `TrustedOriginAdapter`) —
 * `@nx/enforce-module-boundaries`, `eslint.config.mjs`. La composition root
 * (`apps/backoffice-angular/src/app/app.config.ts`, `type:app`) dépend de
 * toutes les couches et peut donc câbler le jeton sans contrainte.
 */
export const TRUSTED_ORIGIN_PORT = new InjectionToken<TrustedOriginPort>(
    'TrustedOriginPort'
);
