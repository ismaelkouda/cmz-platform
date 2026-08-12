import { InjectionToken } from '@angular/core';
import { LoggerPort } from '@cmz/shared-domain';

/**
 * Jeton d'injection Angular pour `LoggerPort` (ADR-0024).
 *
 * `LoggerPort` est une `interface` pure dans `@cmz/shared-domain` — elle
 * s'efface entièrement à la compilation et ne peut donc pas servir de jeton
 * `inject()`/`provide` (contrairement à l'ancienne `abstract class`, qui
 * émettait une classe JS réelle utilisable comme jeton, mais couplait le
 * contrat à un idiome d'injection propre à Angular).
 *
 * Ce jeton vit dans `@cmz/core` (pas `@cmz/shared-browser`) : `type:core` a
 * le droit de dépendre de `type:domain` (où vit le contrat) ; l'inverse
 * (`type:browser` → `type:core`) est interdit par `eslint.config.mjs`
 * (`type:browser` n'est consommable que depuis `type:app`, jamais un autre
 * type de lib — audit D-5/P2-18). L'adaptateur (`ConsoleLoggerAdapter`,
 * `@cmz/shared-browser`) n'a besoin de connaître ni ce jeton ni `@cmz/core` :
 * seule la composition root (`app.config.ts`, `type:app`) relie les deux via
 * `{ provide: LOGGER_PORT, useExisting: ConsoleLoggerAdapter }`.
 */
export const LOGGER_PORT = new InjectionToken<LoggerPort>('LoggerPort');
