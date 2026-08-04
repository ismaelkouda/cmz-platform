import { GenericRequiredError } from '@cmz/shared-domain';
import { MessagingDeleteContract } from '../contracts/messaging-delete.contract';
import { MessagingDeleteValidateContract } from '../contracts/messaging-delete.validate-contract';

export function validateMessagingDelete(
    contract: MessagingDeleteContract
): asserts contract is MessagingDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError('Uniq id is required');
    }
}
