export abstract class DomainError extends Error {
    public abstract readonly code: string;
    public abstract readonly messageKey: string;
    public abstract readonly statusCode?: number;

    /**
     * Paramètres d'interpolation i18n (Transloco : translate(messageKey, params)).
     * Optionnel : la plupart des erreurs ont une clé complète sans variable.
     */
    public readonly params?: Readonly<Record<string, unknown>>;

    protected constructor(message?: string, params?: Record<string, unknown>) {
        super(message);
        this.name = this.constructor.name;
        this.params = params;
    }
}
