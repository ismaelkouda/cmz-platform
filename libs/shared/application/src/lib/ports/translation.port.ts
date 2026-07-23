/**
 * Port de traduction — **abstraction agnostique** (aucun framework, aucun i18next).
 * Sert de contrat ET de jeton d'injection (classe abstraite). Chaque framework
 * fournit son adaptateur (Angular : wrapper i18next ; React : react-i18next).
 * Cf. ADR-0012.
 */
export abstract class TranslationPort {
    /** Traduit une clé, avec paramètres d'interpolation optionnels. */
    abstract translate(key: string, params?: Record<string, unknown>): string;

    /** Change la langue active. */
    abstract setLanguage(lang: string): Promise<void>;

    /** Langue active courante. */
    abstract get currentLanguage(): string;
}
