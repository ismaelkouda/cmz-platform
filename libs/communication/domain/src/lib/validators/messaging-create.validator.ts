import { GenericRequiredError } from '@cmz/shared-domain';
import { MessagingCreateContract } from '../contracts/messaging-create.contract';
import { MessagingCreateValidateContract } from '../contracts/messaging-create.validate-contract';
import { MessagingChannel } from '../enums/messaging-channel.enum';
import { MessagingTarget } from '../enums/messaging-target.enum';
import { MessagingSmsContentTooLongError } from '../errors/messaging-sms-content-too-long.error';
import { TypeRequiredError } from '../errors/type-required.error';

const SMS_MAX_LENGTH = 160;

/**
 * Consolide dans UN validateur les deux couches de règles que le source
 * séparait entre `validateMessagingCreate` (champs requis, conditionnés par
 * `targetType`) et `MessagingCreateEntity.ensureCanBeCreated()` (longueur
 * SMS, sujet requis si canal mail) — deux mécanismes de validation pour la
 * même opération, sans raison forte de les garder distincts. Pas de classe
 * `MessagingCreateEntity` séparée ici : ce projet n'a pas de précédent pour
 * un « entity de commande » enveloppant un ValidateContract, toutes les
 * autres entités du monorepo exposent uniquement des Contract/
 * ValidateContract validés directement, cf. `settings-security`/
 * `content-management`.
 */
export function validateMessagingCreate(
    contract: MessagingCreateContract
): asserts contract is MessagingCreateValidateContract {
    if (!contract.type) {
        throw new TypeRequiredError();
    }
    if (!contract.targetType) {
        throw new GenericRequiredError('Target type is required');
    }
    if (contract.targetType === MessagingTarget.REPORT && !contract.reportId) {
        throw new GenericRequiredError(
            'Report id is required when target is a report'
        );
    }
    if (contract.targetType === MessagingTarget.AREA && !contract.region) {
        throw new GenericRequiredError(
            'Region is required when target is an area'
        );
    }
    if (!contract.channels || contract.channels.length < 1) {
        throw new GenericRequiredError('At least one channel is required');
    }
    if (!contract.subject) {
        throw new GenericRequiredError('Subject is required');
    }
    if (!contract.content) {
        throw new GenericRequiredError('Content is required');
    }
    // `ensureMailSubject` du source (sujet requis si canal mail) est déjà
    // couvert : `subject` est inconditionnellement requis ci-dessus, quel
    // que soit le canal — la règle conditionnelle du source était en
    // réalité un sous-cas jamais atteignable de la règle générale.
    if (
        contract.channels.includes(MessagingChannel.SMS) &&
        contract.content.length > SMS_MAX_LENGTH
    ) {
        throw new MessagingSmsContentTooLongError();
    }
}
