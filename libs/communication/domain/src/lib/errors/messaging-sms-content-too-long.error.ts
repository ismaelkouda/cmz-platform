import { DomainError } from '@cmz/shared-domain';

/**
 * Règle métier réelle du source (`MessagingCreateEntity.ensureSmsContentLength`) :
 * un contenu diffusé sur le canal SMS ne peut pas dépasser 160 caractères
 * (limite technique d'un SMS simple). Erreur locale au module — pas un cas
 * générique de `GenericRequiredError` (ce n'est pas un champ manquant, mais
 * une contrainte de longueur conditionnée par le canal choisi).
 */
export class MessagingSmsContentTooLongError extends DomainError {
    readonly code = 'MESSAGING_SMS_CONTENT_TOO_LONG';
    readonly messageKey = 'COMMUNICATION.MESSAGING.ERROR.SMS_CONTENT_TOO_LONG';
    readonly statusCode = 422;

    constructor(message?: string) {
        super(message ?? 'SMS content cannot exceed 160 characters');
    }
}
