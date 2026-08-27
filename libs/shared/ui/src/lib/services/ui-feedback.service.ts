import { Service, inject } from '@angular/core';
import {
    DomainError,
    UnauthorizedError,
    ValidationError,
} from '@cmz/shared-domain';
import { ErrorHandlerRegistry, SessionService } from '@cmz/shared-application';
import { TranslocoService } from '@jsverse/transloco';
import { CmzNotificationService } from './cmz-notification.service';

/**
 * Point de convergence du feedback d'erreur. Branche le **handler par défaut**
 * du registre : tout `DomainError` sans handler propre → toast erreur avec
 * `messageKey` traduit (Transloco). Seules les **exceptions** ont un handler.
 * Supprime la répétition « un handler par erreur » du source (33 → 1 + 2).
 * Cf. contrats/error.contract.md, ADR-0012.
 */
@Service()
export class UiFeedbackService {
    private readonly registry = inject(ErrorHandlerRegistry);
    private readonly notification = inject(CmzNotificationService);
    private readonly translation = inject(TranslocoService);
    private readonly session = inject(SessionService);

    constructor() {
        this.registerHandlers();
    }

    private registerHandlers(): void {
        this.registry.registerDefault((error) =>
            this.notification.error(
                this.translation.translate(error.messageKey, error.params)
            )
        );

        this.registry.register(UnauthorizedError, (error) => {
            this.notification.warning(
                this.translation.translate(error.messageKey, error.params)
            );
            this.session.clear();
        });

        this.registry.register(ValidationError, (error) => {
            this.notification.error(error.message);
        });
    }

    notifyError(error: DomainError): void {
        this.registry.handle(error);
    }

    success(key: string): void {
        this.notification.success(this.translation.translate(key));
    }

    error(key: string): void {
        this.notification.error(this.translation.translate(key));
    }
}
