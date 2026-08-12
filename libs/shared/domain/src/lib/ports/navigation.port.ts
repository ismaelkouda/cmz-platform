/**
 * Port de navigation hôte — contrat agnostique pur (ADR-0024 : `interface`,
 * pas `abstract class` — aucune logique, jamais de jeton d'injection ici).
 * Adaptateur : @cmz/shared-browser. Jeton d'injection Angular (`NAVIGATION_PORT`)
 * séparé, dans `@cmz/core`.
 */
export interface NavigationPort {
    reload(): void;
}
