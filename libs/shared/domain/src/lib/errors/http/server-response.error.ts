import { DomainError } from '../domain-error.abstract';

/**
 * Erreur métier signalée par le serveur dans l'enveloppe de réponse (`error:true`).
 * `messageKey` porte le **message serveur** : traduit s'il correspond à une clé
 * i18n, affiché tel quel sinon (passthrough i18next). Cf. analyse critique base
 * mappers (unwrapResponse).
 */
export class ServerResponseError extends DomainError {
    readonly code = 'SERVER_RESPONSE_ERROR';
    readonly statusCode = 422;
    readonly messageKey: string;

    constructor(serverMessage: string) {
        super(serverMessage || 'ERRORS.HTTP.SERVER_ERROR');
        this.messageKey = serverMessage || 'ERRORS.HTTP.SERVER_ERROR';
    }
}
