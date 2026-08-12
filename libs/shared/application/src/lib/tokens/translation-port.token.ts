import { InjectionToken } from '@angular/core';
import { TranslationPort } from '../ports/translation.port';

/**
 * Jeton d'injection Angular pour `TranslationPort` (ADR-0024).
 *
 * Colocalisé dans `@cmz/shared-application` (même raison que
 * `NOTIFICATION_PORT`) : consommateurs à la fois en `type:ui` et en
 * `type:application`, qui ne peut pas dépendre de `type:ui`
 * (`eslint.config.mjs`).
 */
export const TRANSLATION_PORT = new InjectionToken<TranslationPort>(
    'TranslationPort'
);
