/**
 * Port de traduction — **abstraction agnostique** (aucun framework, aucun i18next).
 * Chaque framework fournit son adaptateur (Angular : wrapper i18next ; React :
 * react-i18next). Cf. ADR-0012.
 *
 * Interface pure depuis ADR-0024 (Chantier Q). Jeton `TRANSLATION_PORT`
 * colocalisé ici même, dans `@cmz/shared-application` (même raison que
 * `NOTIFICATION_PORT`) : consommateurs `inject()` à la fois en `type:ui`
 * (~14 modules) et en `type:application` (façades — `type:application` ne
 * peut pas dépendre de `type:ui`, `eslint.config.mjs`).
 */
export interface TranslationPort {
    /** Traduit une clé, avec paramètres d'interpolation optionnels. */
    translate(key: string, params?: Record<string, unknown>): string;

    /** Change la langue active. */
    setLanguage(lang: string): Promise<void>;

    /** Langue active courante. */
    get currentLanguage(): string;
}
