export abstract class DomainError extends Error {
    public abstract readonly code: string;
    public abstract readonly messageKey: string;
    public abstract readonly statusCode?: number;

    protected constructor(message?: string) {
        super(message);
        this.name = this.constructor.name;
    }
}
