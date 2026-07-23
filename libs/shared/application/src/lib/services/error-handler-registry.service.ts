import { Service, Type } from '@angular/core';
import { DomainError } from '@cmz/shared-domain';

type ErrorHandler = (error: DomainError) => void;

/**
 * Dispatch générique des erreurs métier vers un handler.
 *
 * Un `handler par défaut` (enregistré par la couche UI) traite tout `DomainError`
 * sans handler spécifique — supprime la répétition « un handler par erreur »
 * (cf. contrats/error.contract.md). On n'enregistre donc que les exceptions.
 */
@Service()
export class ErrorHandlerRegistry {
    private readonly handlers = new Map<
        Type<DomainError> | string,
        ErrorHandler
    >();
    private defaultHandler?: ErrorHandler;

    register(
        errorType: Type<DomainError> | string,
        handler: ErrorHandler
    ): void {
        this.handlers.set(errorType, handler);
    }

    registerDefault(handler: ErrorHandler): void {
        this.defaultHandler = handler;
    }

    handle(error: DomainError): void {
        const handler = this.getHandler(error) ?? this.defaultHandler;
        handler?.(error);
    }

    private getHandler(error: DomainError): ErrorHandler | undefined {
        const byType = this.handlers.get(
            error.constructor as Type<DomainError>
        );
        if (byType) {
            return byType;
        }
        return error.code ? this.handlers.get(error.code) : undefined;
    }
}
