/**
 * Port de navigation hôte — abstraction agnostique (aucun `window` / `location`).
 * Adaptateur : @cmz/shared-browser.
 */
export abstract class NavigationPort {
    abstract reload(): void;
}
