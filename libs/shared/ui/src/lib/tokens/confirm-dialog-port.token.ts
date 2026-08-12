import { InjectionToken } from '@angular/core';
import { ConfirmDialogPort } from '@cmz/shared-application';

/**
 * Jeton d'injection Angular pour `ConfirmDialogPort` (ADR-0024).
 *
 * Colocalisé dans `@cmz/shared-ui` : consommé par `inject()` depuis de
 * nombreux modules fonctionnels isolés par `scope:*`
 * (`eslint.config.mjs`), qui n'ont pas le droit de dépendre les uns des
 * autres. Seule une lib `scope:shared` peut héberger un jeton partagé.
 */
export const CONFIRM_DIALOG_PORT = new InjectionToken<ConfirmDialogPort>(
    'ConfirmDialogPort'
);
