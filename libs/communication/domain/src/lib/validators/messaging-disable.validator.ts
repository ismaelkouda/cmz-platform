import { GenericRequiredError } from '@cmz/shared-domain';
import { MessagingDisableValidateContract } from '../contracts/messaging-disable.validate-contract';

export function validateMessagingDisable(
    contract: Partial<MessagingDisableValidateContract>
): asserts contract is MessagingDisableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError('Uniq id is required');
    }
}
