import { ErrorHandler, Service, inject } from '@angular/core';
import { LoggerPort } from '@cmz/shared-domain';

/**
 * `ErrorHandler` global — remplace le handler par défaut d'Angular, qui ne
 * fait qu'un `console.error` sans aucun point d'extension (audit P-2,
 * `audit-workspace-2026-08-02-revue-finale.md`, P1-26).
 *
 * Couvre, via `provideBrowserGlobalErrorListeners()` (déjà présent dans
 * `app.config.ts`) **et** le mécanisme natif Angular :
 * - exceptions non capturées levées pendant un cycle de détection de
 *   changement, un binding de template, ou un callback planifié par Angular
 *   (`zone.js` toujours actif dans ce dépôt — confirmé, `catalog.zone.js`,
 *   pas de `provideZonelessChangeDetection()`) ;
 * - rejets de promesse et erreurs `window` non gérés (`unhandledrejection`/
 *   `error`), remontés par `provideBrowserGlobalErrorListeners()` jusqu'à ce
 *   même `ErrorHandler`.
 *
 * Délègue à `LoggerPort` plutôt que d'écrire sur `console` directement —
 * `LoggerPort` est le seul point à changer pour brancher un vrai collecteur
 * (Sentry/OTel, P-3, non décidé) sans toucher à ce fichier.
 *
 * **Ce que ce correctif ne fait pas (hors périmètre P-2 seul)** : il ne
 * corrèle pas l'erreur à une requête HTTP en cours (P-4, nécessite un
 * identifiant de requête posé par `authInterceptor`) et n'envoie rien à un
 * collecteur externe (P-3).
 */
@Service()
export class GlobalErrorHandler implements ErrorHandler {
    private readonly logger = inject(LoggerPort);

    handleError(error: unknown): void {
        this.logger.error('Erreur non capturée', error, {
            source: 'GlobalErrorHandler',
        });
    }
}
