/**
 * Port de journalisation — contrat agnostique pur (ADR-0024 : `interface`,
 * pas `abstract class` — aucune logique, jamais de jeton d'injection ici).
 * Sur le même modèle que `StoragePort`/`NavigationPort`
 * (ADR-0010 §Ports & Adapters).
 *
 * Origine du besoin : `audit-workspace-2026-08-02-revue-finale.md`, chantier
 * P (P-1, réf. P1-26) — **aucune observabilité applicative** n'existait
 * avant ce port : les erreurs non capturées (rejets de promesse, exceptions
 * de template, échecs `ErrorHandler` par défaut) ne laissaient de trace que
 * dans la console du navigateur de l'utilisateur, invisible à quiconque
 * d'autre. `GlobalErrorHandler` (`@cmz/core`) consomme ce port pour que ces
 * erreurs aient au moins **un point d'écriture unique**, remplaçable par un
 * vrai collecteur (Sentry/OTel) sans toucher au code appelant.
 *
 * Correction 2026-08-10 (MÉMO-3, `docs/architecture/memo-telemetrie.md`) :
 * cette docstring citait aussi `errorInterceptor` (`@cmz/shared-data`) comme
 * consommateur de ce port — vérifié faux (`grep -rn "inject(LoggerPort)"
 * libs/ apps/` → un seul résultat, `global-error-handler.ts`).
 * `error.interceptor.ts` normalise les erreurs de transport HTTP en
 * `DomainError` mais n'appelle jamais `LoggerPort` ; il n'y a donc
 * aujourd'hui qu'**un seul point d'écriture**, pas deux.
 *
 * **Port de domaine, pas encore un choix de diffusion (P-1 seul, pas P-3).**
 * L'adaptateur câblé aujourd'hui (`ConsoleLoggerAdapter`, `@cmz/shared-browser`)
 * n'envoie rien sur le réseau — c'est délibéré : choisir un collecteur
 * externe (P-3) est une décision de coût/vendor et une entrée CSP
 * (`connect-src`) à part entière, hors du mandat d'un correctif de code seul.
 * Ce port rend ce choix **futur** possible sans réécrire les appelants —
 * il ne le prend pas à leur place.
 *
 * Le jeton d'injection Angular (`LOGGER_PORT`, `InjectionToken<LoggerPort>`)
 * vit séparément dans `@cmz/shared-browser`
 * (`logger-port.token.ts`) — cette interface reste consommable par tout
 * runtime JS/TS sans dépendre d'Angular (ADR-0024).
 */
export interface LoggerPort {
    /** Diagnostic de développement — jamais destiné à un collecteur de production. */
    debug(message: string, context?: Record<string, unknown>): void;

    /** Événement notable, sans échec — ex. dégradation gracieuse d'une fonctionnalité optionnelle. */
    info(message: string, context?: Record<string, unknown>): void;

    /** Situation anormale mais non bloquante — ex. `check-i18n`/`continue-on-error` du même esprit côté runtime. */
    warn(message: string, context?: Record<string, unknown>): void;

    /**
     * Erreur réelle — échec applicatif, exception non capturée, ou rejet de
     * promesse. `error` est passé tel quel (pas converti en `string`) pour
     * que l'adaptateur choisisse comment le sérialiser (stack trace incluse
     * ou non selon l'environnement).
     */
    error(
        message: string,
        error?: unknown,
        context?: Record<string, unknown>
    ): void;
}
