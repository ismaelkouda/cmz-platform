import { GenericRequiredError } from '@cmz/shared-domain';
import { MessagingDeleteValidateContract } from '../contracts/messaging-delete.validate-contract';

export function validateMessagingDelete(
    contract: Partial<MessagingDeleteValidateContract>
): asserts contract is MessagingDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError('Uniq id is required');
    }
}
