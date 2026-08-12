/**
 * Port de navigation hôte — contrat agnostique pur (ADR-0024 : `interface`,
 * pas `abstract class` — aucune logique, jamais de jeton d'injection ici).
 * Adaptateur : @cmz/shared-browser. Jeton d'injection Angular
 * (`NAVIGATION_PORT`) séparé, dans `@cmz/shared-application`
 * (`tokens/navigation-port.token.ts`) — colocalisé avec son seul
 * consommateur `inject()` (`SessionService`, `type:application`). Pas
 * `@cmz/core` : `type:application` n'a pas le droit de dépendre de
 * `type:core` (`eslint.config.mjs`).
 */
export interface NavigationPort {
    reload(): void;
}
